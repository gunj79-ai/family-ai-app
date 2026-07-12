import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/index.js';
import { keywordFilter, aiContentFilter } from '../services/contentFilter.js';
import { v4 as uuidv4 } from 'uuid';

interface ParentalRule {
  id: string;
  user_id: string;
  rule_type: string;
  rule_value: string;
  is_active: number;
  created_by: string;
  created_at: string;
}

/**
 * Log flagged content to the flagged_content table
 */
function logFlaggedContent(
  userId: string,
  chatId: string,
  flagType: 'keyword' | 'ai_classifier',
  flagReason: string,
  content: string
): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO flagged_content (
        id, user_id, chat_id, message_id, flag_type, flag_reason,
        original_content, is_reviewed, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 0, ?)
    `).run(
      uuidv4(),
      userId,
      chatId,
      flagType,
      flagReason,
      content,
      new Date().toISOString()
    );
  } catch (err: any) {
    console.error('Error logging flagged content:', err.message);
  }
}

/**
 * Parental guard middleware
 * Applied to POST /api/chats/:chatId/messages
 * Enforces parental rules for teen users
 */
export async function parentalGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Admin and adult roles bypass all checks
    if (user.role === 'admin' || user.role === 'adult') {
      next();
      return;
    }

    // Only teen users have parental restrictions
    if (user.role !== 'teen') {
      next();
      return;
    }

    // Get chat ID from route params
    const chatId = req.params.chatId;
    if (!chatId) {
      res.status(400).json({ error: 'Missing chat ID' });
      return;
    }

    // Get all active parental rules for this teen
    const db = getDb();
    const rules = db.prepare(`
      SELECT * FROM parental_rules
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at ASC
    `).all(user.id) as unknown as ParentalRule[];

    // Check each rule in order (first violation returns error)
    for (const rule of rules) {
      const ruleValue = JSON.parse(rule.rule_value);

      // Time restriction rule
      if (rule.rule_type === 'time_restriction') {
        const hour = new Date().getHours();
        const startHour = ruleValue.start_hour;
        const endHour = ruleValue.end_hour;

        if (hour < startHour || hour >= endHour) {
          res.status(403).json({
            error: `Access not allowed right now. Available ${startHour}:00–${endHour}:00.`,
          });
          return;
        }
      }

      // Daily message limit rule
      if (rule.rule_type === 'daily_message_limit') {
        const limit = ruleValue.limit;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const result = db.prepare(`
          SELECT COUNT(*) as count FROM messages m
          JOIN chats c ON m.chat_id = c.id
          WHERE c.user_id = ? AND m.role = 'user' AND m.created_at >= ?
        `).get(user.id, todayISO) as { count: number };

        if (result.count >= limit) {
          res.status(429).json({
            error: `Daily message limit of ${limit} reached. Resets at midnight.`,
          });
          return;
        }
      }

      // Daily token budget rule
      if (rule.rule_type === 'daily_token_budget') {
        const limit = ruleValue.limit;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const result = db.prepare(`
          SELECT SUM(token_count) as total FROM messages m
          JOIN chats c ON m.chat_id = c.id
          WHERE c.user_id = ? AND m.created_at >= ?
        `).get(user.id, todayISO) as { total: number | null };

        const totalTokens = result.total || 0;
        if (totalTokens >= limit) {
          res.status(429).json({
            error: `Daily token budget reached. Resets at midnight.`,
          });
          return;
        }
      }

      // Keyword block rule
      if (rule.rule_type === 'keyword_block') {
        const keywords = ruleValue.keywords || [];
        const messageContent = req.body.content || '';
        const filterResult = keywordFilter(messageContent, keywords);

        if (filterResult.blocked) {
          logFlaggedContent(
            user.id,
            chatId,
            'keyword',
            filterResult.reason || 'Keyword match',
            messageContent
          );
          res.status(400).json({
            error: 'This topic is not available in your account.',
          });
          return;
        }
      }

      // Topic block rule (same as keyword block but different field name)
      if (rule.rule_type === 'topic_block') {
        const topics = ruleValue.topics || [];
        const messageContent = req.body.content || '';
        const filterResult = keywordFilter(messageContent, topics);

        if (filterResult.blocked) {
          logFlaggedContent(
            user.id,
            chatId,
            'keyword',
            filterResult.reason || 'Topic match',
            messageContent
          );
          res.status(400).json({
            error: 'This topic is not available in your account.',
          });
          return;
        }
      }

      // AI content filter rule
      if (rule.rule_type === 'ai_content_filter') {
        const enabled = ruleValue.enabled || false;
        const messageContent = req.body.content || '';

        if (enabled && messageContent.length > 10) {
          const filterResult = await aiContentFilter(messageContent);

          if (filterResult.blocked) {
            logFlaggedContent(
              user.id,
              chatId,
              'ai_classifier',
              filterResult.reason || 'AI classifier',
              messageContent
            );
            res.status(400).json({
              error: 'This message cannot be processed.',
            });
            return;
          }
        }
      }
    }

    // All rules passed, proceed to next handler
    next();
  } catch (err: any) {
    console.error('Parental guard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
