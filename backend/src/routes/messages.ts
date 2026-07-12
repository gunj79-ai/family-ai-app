import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/index.js';
import { parentalGuard } from '../middleware/parentalGuard.js';
import { buildContext, estimateTokens } from '../services/contextManager.js';
import { streamChat } from '../services/claude.js';
import { stripPii, createChunkRestorer } from '../services/piiStripper.js';
import { getEvaSystemPrompt } from '../services/eva.js';
import type { Chat, Message, Project, ProjectFile, Attachment } from '../types/index.js';

export const messagesRouter = express.Router({ mergeParams: true });

// GET /api/chats/:chatId/messages
messagesRouter.get('/', (req, res) => {
  const db = getDb();
  const { chatId } = req.params as { chatId: string };
  const limit  = parseInt(req.query.limit  as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (chat.user_id !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const messages = db.prepare(`
    SELECT * FROM messages WHERE chat_id = ?
    ORDER BY created_at ASC LIMIT ? OFFSET ?
  `).all(chatId, limit, offset) as any[];

  for (const m of messages) {
    (m as any).attachments =
      db.prepare('SELECT * FROM attachments WHERE message_id = ?').all(m.id) as any[];
    if (typeof m.metadata === 'string') {
      try { (m as any).metadata = JSON.parse(m.metadata); } catch {}
    }
  }

  res.json(messages);
});

// POST /api/chats/:chatId/messages  — SSE streaming
messagesRouter.post('/', parentalGuard, async (req, res) => {
  const db = getDb();
  const { chatId } = req.params as { chatId: string };
  const { content, attachmentIds = [] } = req.body as {
    content: string;
    attachmentIds?: string[];
  };

  // Input validation
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Content must be a string' });
  }
  if (content.trim().length === 0) {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }
  if (content.length > 20000) {
    return res.status(400).json({
      error: `Message too long (${content.length} chars). Maximum is 20,000.`,
    });
  }
  if (!Array.isArray(attachmentIds) || attachmentIds.length > 10) {
    return res
      .status(400)
      .json({ error: 'Invalid attachmentIds or too many attachments' });
  }

  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (chat.user_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const now = new Date().toISOString();
    const userMsgId = uuidv4();

    // 1. Save user message
    db.prepare(`
      INSERT INTO messages (id, chat_id, role, content, token_count, is_flagged, created_at)
      VALUES (?, ?, 'user', ?, ?, 0, ?)
    `).run(userMsgId, chatId, content, estimateTokens(content), now);

    // 2. Bind uploaded attachments to this message
    if (attachmentIds.length > 0) {
      const ph = attachmentIds.map(() => '?').join(',');
      db.prepare(`UPDATE attachments SET message_id = ? WHERE id IN (${ph})`)
        .run(userMsgId, ...attachmentIds);
    }

    // 3. Auto-title from first message
    const msgCount = (db.prepare(
      'SELECT COUNT(*) as c FROM messages WHERE chat_id = ?'
    ).get(chatId) as any).c;

    if (msgCount <= 1) {
      const title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
      db.prepare('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?')
        .run(title, now, chatId);
    }

    // 4. Build context
    const allMessages = db.prepare(`
      SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
    `).all(chatId) as any[];

    for (const m of allMessages) {
      (m as any).attachments =
        db.prepare('SELECT * FROM attachments WHERE message_id = ?').all(m.id) as unknown as any[];
    }

    let project: any | undefined;
    let projectFiles: any[] = [];
    if (chat.project_id) {
      project = db.prepare('SELECT * FROM projects WHERE id = ?').get(chat.project_id) as any;
      projectFiles = db.prepare(
        'SELECT * FROM project_files WHERE project_id = ?'
      ).all(chat.project_id) as any[];
    }

    const userSettings = db.prepare(
      'SELECT * FROM user_settings WHERE user_id = ?'
    ).get(req.user!.id) as any;

    // Get Eva's system prompt with project/user overrides
    const evaInstructions = project?.system_instructions
      || userSettings?.user_system_prompt
      || null;
    
    const systemInstructions = getEvaSystemPrompt(evaInstructions, {
      user_name: req.user!.displayName,
      user_age: req.user!.age ? String(req.user!.age) : 'unknown',
    });

    // 5. PII stripping — applies to ALL roles
    const familyNames = (db.prepare(
      'SELECT display_name FROM users WHERE is_active = 1'
    ).all() as any[]).map((r: any) => r.display_name);

    const { systemBlocks, messages: rawMessages } = await buildContext(
      systemInstructions,
      projectFiles,
      allMessages as any[],
      req.user!.displayName,
      project?.name || '',
      8192
    );

    // Strip PII from every user message in context
    const mergedMap: Record<string, string> = {};
    const piiMessages = rawMessages.map(m => {
      if (typeof m.content === 'string') {
        const { redacted, map } = stripPii(m.content, familyNames);
        Object.assign(mergedMap, map);
        return { ...m, content: redacted };
      }
      return m;
    });

    // Strip PII from system blocks too
    const piiSystem = systemBlocks.map(b => {
      const { redacted, map } = stripPii(b.text, familyNames);
      Object.assign(mergedMap, map);
      return { ...b, text: redacted };
    });

    // 6. Stream from Claude, restore PII on each chunk
    const assistantMsgId = uuidv4();
    const restoreChunk = createChunkRestorer(mergedMap);
    const startTime = Date.now();
    let fullResponse = '';

    await streamChat(
      piiSystem,
      piiMessages as Parameters<typeof streamChat>[1],
      chat.model || 'claude-haiku-4-5-20251001',
      2048,
      (rawChunk) => {
        const restoredChunk = restoreChunk(rawChunk);
        fullResponse += restoredChunk;
        send({ type: 'chunk', content: restoredChunk });
      },
      (_fullRaw, inputTokens, outputTokens, cacheHits) => {
        const genMs = Date.now() - startTime;
        const assistantNow = new Date().toISOString();
        const totalTokens = inputTokens + outputTokens;
        const metadata = JSON.stringify({
          model: chat.model,
          generationMs: genMs,
          inputTokens,
          outputTokens,
          cacheHits,
          finishReason: 'stop',
        });

        // Save restored response to DB
        db.prepare(`
          INSERT INTO messages
            (id, chat_id, role, content, token_count, is_flagged, metadata, created_at)
          VALUES (?, ?, 'assistant', ?, ?, 0, ?, ?)
        `).run(assistantMsgId, chatId, fullResponse, totalTokens, metadata, assistantNow);

        db.prepare(`
          UPDATE chats
          SET total_tokens_used = total_tokens_used + ?, updated_at = ?
          WHERE id = ?
        `).run(totalTokens, assistantNow, chatId);

        send({ type: 'done', messageId: assistantMsgId, tokenCount: totalTokens });
        res.end();
      },
      (err) => {
        send({ type: 'error', error: err.message });
        res.end();
      }
    );
  } catch (err) {
    send({ type: 'error', error: (err as Error).message });
    res.end();
  }
});

// DELETE /api/chats/:chatId/messages/:id
messagesRouter.delete('/:id', (req, res) => {
  const db = getDb();
  const { chatId, id } = req.params as { chatId: string; id: string };
  const msg = db.prepare('SELECT m.*, c.user_id FROM messages m JOIN chats c ON m.chat_id = c.id WHERE m.id = ? AND m.chat_id = ?').get(id, chatId) as any;
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (msg.user_id !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  res.json({ ok: true });
});
