import { Router, Request, Response } from 'express';
import { getDb } from '../database/index.js';

const router = Router();

interface AdminStats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  flaggedToday: number;
  usageByUser: Array<{
    userId: string;
    displayName: string;
    role: string;
    messagesTotal: number;
    messagesToday: number;
    chatsTotal: number;
  }>;
  messagesLast7Days: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * GET /api/admin/stats
 * Admin statistics dashboard (admin only)
 */
router.get('/stats', (req: Request, res: Response): void => {
  try {
    const db = getDb();

    // Total active users
    const usersResult = db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    ).get() as { count: number };

    // Total chats
    const chatsResult = db.prepare(
      'SELECT COUNT(*) as count FROM chats'
    ).get() as { count: number };

    // Total messages
    const messagesResult = db.prepare(
      'SELECT COUNT(*) as count FROM messages'
    ).get() as { count: number };

    // Flagged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const flaggedResult = db.prepare(
      'SELECT COUNT(*) as count FROM flagged_content WHERE is_reviewed = 0 AND created_at >= ?'
    ).get(todayISO) as { count: number };

    // Usage by user
    const users = db.prepare(
      'SELECT id, display_name, role FROM users WHERE is_active = 1 ORDER BY created_at ASC'
    ).all() as Array<{ id: string; display_name: string; role: string }>;

    const usageByUser = users.map(u => {
      const messagesTotal = (db.prepare(
        'SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = ?'
      ).get(u.id) as { count: number }).count;

      const messagesToday = (db.prepare(
        'SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = ? AND m.created_at >= ?'
      ).get(u.id, todayISO) as { count: number }).count;

      const chatsTotal = (db.prepare(
        'SELECT COUNT(*) as count FROM chats WHERE user_id = ?'
      ).get(u.id) as { count: number }).count;

      return {
        userId: u.id,
        displayName: u.display_name,
        role: u.role,
        messagesTotal,
        messagesToday,
        chatsTotal,
      };
    });

    // Messages last 7 days
    const messagesLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateISO = date.toISOString();

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateISO = nextDate.toISOString();

      const result = db.prepare(
        'SELECT COUNT(*) as count FROM messages WHERE created_at >= ? AND created_at < ?'
      ).get(dateISO, nextDateISO) as { count: number };

      const dateStr = date.toISOString().split('T')[0];
      messagesLast7Days.push({
        date: dateStr,
        count: result.count,
      });
    }

    const stats: AdminStats = {
      totalUsers: usersResult.count,
      totalChats: chatsResult.count,
      totalMessages: messagesResult.count,
      flaggedToday: flaggedResult.count,
      usageByUser,
      messagesLast7Days,
    };

    res.json(stats);
  } catch (err: any) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/activity
 * Activity log query with filters (admin only)
 */
router.get('/activity', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const userId = req.query.userId as string | undefined;
    const eventType = req.query.eventType as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = `
      SELECT al.*, u.display_name as user_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query += ` AND al.user_id = ?`;
      params.push(userId);
    }

    if (eventType) {
      query += ` AND al.event_type = ?`;
      params.push(eventType);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const activities = db.prepare(query).all(...params) as any[];

    const result = activities.map(a => ({
      id: a.id,
      userId: a.user_id,
      userName: a.user_name,
      eventType: a.event_type,
      eventData: JSON.parse(a.event_data || '{}'),
      ipAddress: a.ip_address,
      createdAt: a.created_at,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/flagged
 * Flagged content query with filters (admin only)
 */
router.get('/flagged', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const reviewed = req.query.reviewed === 'true' ? 1 : 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const flagged = db.prepare(`
      SELECT fc.*, u.display_name as user_name, c.title as chat_title
      FROM flagged_content fc
      LEFT JOIN users u ON fc.user_id = u.id
      LEFT JOIN chats c ON fc.chat_id = c.id
      WHERE fc.is_reviewed = ?
      ORDER BY fc.created_at DESC
      LIMIT ? OFFSET ?
    `).all(reviewed, limit, offset) as any[];

    const result = flagged.map(f => ({
      id: f.id,
      userId: f.user_id,
      userName: f.user_name,
      chatId: f.chat_id,
      chatTitle: f.chat_title,
      messageId: f.message_id,
      flagType: f.flag_type,
      flagReason: f.flag_reason,
      originalContent: f.original_content,
      isReviewed: f.is_reviewed === 1,
      reviewedBy: f.reviewed_by,
      reviewedAt: f.reviewed_at,
      createdAt: f.created_at,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get flagged error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/flagged/:id/review
 * Mark flagged content as reviewed (admin only)
 */
router.put('/flagged/:id/review', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE flagged_content SET is_reviewed = 1, reviewed_by = ?, reviewed_at = ? WHERE id = ?'
    ).run(req.user!.id, now, id);

    const updated = db.prepare('SELECT * FROM flagged_content WHERE id = ?').get(id) as any;

    if (!updated) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const result = {
      id: updated.id,
      userId: updated.user_id,
      chatId: updated.chat_id,
      messageId: updated.message_id,
      flagType: updated.flag_type,
      flagReason: updated.flag_reason,
      originalContent: updated.original_content,
      isReviewed: updated.is_reviewed === 1,
      reviewedBy: updated.reviewed_by,
      reviewedAt: updated.reviewed_at,
      createdAt: updated.created_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Review flagged error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/settings
 * Get server settings (admin only)
 */
router.get('/settings', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT key, value FROM server_settings ORDER BY key')
      .all() as Array<{ key: string; value: string }>;

    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/settings
 * Update server settings (admin only)
 */
router.put('/settings', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    const allowedKeys = [
      'anthropic_api_key',
      'default_model',
      'user_system_prompt',
      'content_filter_model',
      'app_name',
      'app_tagline',
      'primary_color',
      'setup_complete',
      'headroom_enabled',
      'max_file_size_mb',
      'daily_usage_reset_hour',
      'content_filter_enabled',
      'haiku_input_price_per_mtok',
      'haiku_output_price_per_mtok',
    ];

    for (const key of allowedKeys) {
      if (key in req.body) {
        const value = req.body[key];
        // Use INSERT OR REPLACE to create or update
        db.prepare(
          'INSERT OR REPLACE INTO server_settings (key, value, updated_at) VALUES (?, ?, ?)'
        ).run(key, String(value), now);
      }
    }

    // Return updated settings
    const settings = db.prepare('SELECT key, value FROM server_settings ORDER BY key')
      .all() as Array<{ key: string; value: string }>;

    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
