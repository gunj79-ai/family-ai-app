import fs from 'fs';
import path from 'path';
import type { Message, ProjectFile } from '../types/index.js';
import type { ClaudeTextBlock, ClaudeImageBlock, ClaudeMessage } from './claude.js';
import { config } from '../config.js';
import { getDb } from '../database/index.js';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface BuiltContext {
  systemBlocks: ClaudeTextBlock[];
  messages: ClaudeMessage[];
  estimatedTokens: number;
  tokensSaved: number;
}

export async function buildContext(
  systemInstructions: string,
  projectFiles: ProjectFile[],
  chatMessages: (Message & { attachments?: import('../types/index.js').Attachment[] })[],
  userDisplayName: string,
  projectName: string,
  maxTokens = 8192
): Promise<BuiltContext> {
  const now = new Date();

  // Substitute variables
  let resolved = (systemInstructions || '')
    .replace(/\{\{user_name\}\}/g, userDisplayName)
    .replace(/\{\{current_date\}\}/g, now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }))
    .replace(/\{\{project_name\}\}/g, projectName || '');

  // Note: cacheAlign not available in current headroom-ai version
  // System prompt variable substitution and project files remain unaligned

  // Append text-based project files to system prompt
  const textFiles = projectFiles.filter(f => f.extractedText);
  if (textFiles.length > 0) {
    resolved += '\n\n---\n## Knowledge Base\n';
    for (const f of textFiles) {
      resolved += `\n### ${f.originalName}\n${f.extractedText!.slice(0, 8000)}\n`;
    }
  }

  // System block with cache_control (project context stays the same across turns)
  const systemBlocks: ClaudeTextBlock[] = resolved.trim()
    ? [{ type: 'text', text: resolved, cache_control: { type: 'ephemeral' } }]
    : [];

  // Build message array — trim oldest if over budget
  const budget = maxTokens - estimateTokens(resolved);
  const withTokens = chatMessages.map(m => ({
    msg: m,
    tokens: estimateTokens(m.content)
  }));

  while (
    withTokens.reduce((s, x) => s + x.tokens, 0) > budget &&
    withTokens.length > 2
  ) {
    withTokens.shift();
  }

  const messages: ClaudeMessage[] = withTokens.map(({ msg }, idx) => {
    const isSecondToLast = idx === withTokens.length - 2;
    const content = buildMessageContent(msg);

    // Cache the second-to-last message (incremental caching pattern)
    if (isSecondToLast && Array.isArray(content) && content.length > 0) {
      (content[content.length - 1] as ClaudeTextBlock).cache_control = { type: 'ephemeral' };
    }

    return { role: msg.role as 'user' | 'assistant', content };
  });

  // Headroom compression — gated on server_settings toggle
  let finalMessages = messages;
  let tokensSaved = 0;

  try {
    const db = getDb();
    const headroomEnabled = (
      db.prepare("SELECT value FROM server_settings WHERE key = 'headroom_enabled'")
        .get() as { value: string } | undefined
    )?.value === 'true';

    if (headroomEnabled && messages.length > 2) {
      const { compress } = await import('headroom-ai');
      const result = await compress(
        messages as Parameters<typeof compress>[0],
        { model: config.DEFAULT_MODEL }
      );
      finalMessages = (result.messages as typeof messages) || messages;
      tokensSaved = result.tokensSaved || 0;
      if (tokensSaved > 0) {
        console.log(
          `[Headroom] saved ${tokensSaved} tokens ` +
          `(${Math.round((result.compressionRatio || 0) * 100)}%)`
        );
      }
    }
  } catch (err) {
    // Fail open — Headroom unavailable never breaks chat
    console.warn('[Headroom] compression failed, using uncompressed:', err);
  }

  return {
    systemBlocks,
    messages: finalMessages,
    estimatedTokens: estimateTokens(resolved) + withTokens.reduce((s, x) => s + x.tokens, 0) - tokensSaved,
    tokensSaved,
  };
}

function buildMessageContent(
  msg: Message & { attachments?: import('../types/index.js').Attachment[] }
): string | (ClaudeTextBlock | ClaudeImageBlock)[] {
  const atts = msg.attachments || [];
  const images = atts.filter(a => a.mimeType.startsWith('image/'));
  const textFiles = atts.filter(a => !a.mimeType.startsWith('image/') && a.extractedText);

  if (images.length === 0 && textFiles.length === 0) {
    return msg.content;
  }

  const blocks: (ClaudeTextBlock | ClaudeImageBlock)[] = [];
  let text = msg.content;

  for (const f of textFiles) {
    text += `\n\n[Attached: ${f.originalName}]\n${f.extractedText}`;
  }
  blocks.push({ type: 'text', text });

  for (const img of images.slice(0, 3)) {
    try {
      const imgPath = path.join(config.UPLOADS_DIR, 'attachments', img.filename);
      const data = fs.readFileSync(imgPath).toString('base64');
      blocks.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data } });
    } catch { /* skip unreadable images */ }
  }

  return blocks;
}
