import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { getDb } from '../database/index.js';
import { Chat } from '../types/index.js';
import { messagesRouter } from './messages.js';

const router = Router();

/**
 * Data isolation helper:
 * Admin can query other users' chats via ?userId=X
 * Regular users only see their own chats
 */
function getTargetUserId(req: Request): string {
  const admin = req.user?.role === 'admin';
  const queryUserId = req.query.userId as string | undefined;
  return (admin && queryUserId) ? queryUserId : req.user!.id;
}

/**
 * Ownership check for single-resource routes
 */
function checkOwnership(chat: any, req: Request): boolean {
  return chat.user_id === req.user!.id || req.user!.role === 'admin';
}

/**
 * GET /api/chats
 * List chats for user
 * Query params: ?projectId=X, ?pinned=true, ?archived=false (default),
 *   ?search=term, ?limit=50, ?offset=0
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const targetUserId = getTargetUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const archived = req.query.archived === 'true' ? 1 : 0;

    let query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count,
        (SELECT content FROM messages m WHERE m.chat_id = c.id 
          AND m.role = 'assistant' ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chats c
      WHERE c.user_id = ? AND c.is_archived = ?
    `;
    const params: any[] = [targetUserId, archived];

    if (req.query.projectId) {
      query += ` AND c.project_id = ?`;
      params.push(req.query.projectId);
    }

    if (req.query.pinned === 'true') {
      query += ` AND c.is_pinned = 1`;
    }

    if (req.query.search) {
      query += ` AND c.title LIKE ?`;
      params.push(`%${req.query.search}%`);
    }

    query += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const chats = db.prepare(query).all(...params) as any[];

    const result = chats.map(c => ({
      id: c.id,
      userId: c.user_id,
      projectId: c.project_id,
      title: c.title,
      model: c.model,
      isPinned: c.is_pinned === 1,
      isArchived: c.is_archived === 1,
      totalTokensUsed: c.total_tokens_used,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      messageCount: c.message_count,
      lastMessage: c.last_message ? c.last_message.substring(0, 100) : undefined,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get chats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chats
 * Create a new chat
 * Body: { projectId?, model?, title? }
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const { projectId, model, title } = req.body;

    // If projectId provided, verify it belongs to user
    if (projectId) {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      if (project.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    // Get default model from user settings if not provided
    let chatModel = model;
    if (!chatModel) {
      const settings = db.prepare('SELECT default_model FROM user_settings WHERE user_id = ?').get(req.user!.id) as any;
      chatModel = settings?.default_model || config.DEFAULT_MODEL;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const chatTitle = title || 'New Chat';

    db.prepare(`
      INSERT INTO chats (
        id, user_id, project_id, title, model, is_pinned, is_archived,
        total_tokens_used, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).run(
      id,
      req.user!.id,
      projectId || null,
      chatTitle,
      chatModel,
      now,
      now
    );

    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as any;
    const result: Chat = {
      id: chat.id,
      userId: chat.user_id,
      projectId: chat.project_id,
      title: chat.title,
      model: chat.model,
      isPinned: chat.is_pinned === 1,
      isArchived: chat.is_archived === 1,
      totalTokensUsed: chat.total_tokens_used,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      messageCount: 0,
    };

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Create chat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/chats/:id
 * Get single chat
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as any;
    if (!chat) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(chat, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result: Chat = {
      id: chat.id,
      userId: chat.user_id,
      projectId: chat.project_id,
      title: chat.title,
      model: chat.model,
      isPinned: chat.is_pinned === 1,
      isArchived: chat.is_archived === 1,
      totalTokensUsed: chat.total_tokens_used,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/chats/:id
 * Update chat
 * Allowed fields: title, is_pinned, is_archived, project_id, model
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as any;
    if (!chat) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(chat, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // If changing project_id, verify it belongs to user
    if ('projectId' in req.body && req.body.projectId && req.body.projectId !== chat.project_id) {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.body.projectId) as any;
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      if (project.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    const allowedFields: Record<string, string> = {
      title: 'title',
      isPinned: 'is_pinned',
      isArchived: 'is_archived',
      projectId: 'project_id',
      model: 'model',
    };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const [bodyKey, dbKey] of Object.entries(allowedFields)) {
      if (bodyKey in req.body) {
        const value = req.body[bodyKey];
        if (dbKey === 'is_pinned' || dbKey === 'is_archived') {
          updates[dbKey] = value ? 1 : 0;
        } else {
          updates[dbKey] = value;
        }
      }
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    values.push(id);

    db.prepare(`UPDATE chats SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as any;
    const result: Chat = {
      id: updated.id,
      userId: updated.user_id,
      projectId: updated.project_id,
      title: updated.title,
      model: updated.model,
      isPinned: updated.is_pinned === 1,
      isArchived: updated.is_archived === 1,
      totalTokensUsed: updated.total_tokens_used,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Update chat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/chats/:id
 * Delete chat (cascades to messages and attachments via FK)
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as any;
    if (!chat) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(chat, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    db.prepare('DELETE FROM chats WHERE id = ?').run(id);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete chat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/chats/:id/export
 * Export chat as markdown
 */
router.get('/:id/export', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as any;
    if (!chat) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(chat, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const messages = db.prepare(`
      SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
    `).all(id) as any[];

    let project = null;
    if (chat.project_id) {
      project = db.prepare('SELECT * FROM projects WHERE id = ?').get(chat.project_id) as any;
    }

    // Build markdown
    let markdown = `# ${chat.title}\n\n`;
    markdown += `**Model:** ${chat.model}\n`;
    markdown += `**Date:** ${chat.created_at}\n`;
    markdown += `**Project:** ${project?.name || 'None'}\n\n`;
    markdown += `---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      markdown += `### ${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `---\n\n`;
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${chat.title}.md"`);
    res.send(markdown);
  } catch (err: any) {
    console.error('Export chat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mount messages subrouter
router.use('/:chatId/messages', messagesRouter);

export default router;
