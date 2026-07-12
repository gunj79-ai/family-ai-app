import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/index.js';
import { hashPassword } from '../utils/crypto.js';
import { User, UserSettings, ParentalRule } from '../types/index.js';

const router = Router();

/**
 * GET /api/users
 * List all active users (admin only)
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    // First check total users for debugging
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get() as any;
    const activeUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get() as any;
    
    const users = db.prepare(`
      SELECT id, username, display_name, role, age, avatar_color, is_active, created_at, updated_at
      FROM users
      WHERE is_active = 1
      ORDER BY created_at ASC
    `).all() as any[];

    console.log(`[GET USERS] Total in DB: ${totalUsers?.c}, Active: ${activeUsers?.c}, Returning: ${users.length}`);

    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      age: u.age,
      avatarColor: u.avatar_color,
      isActive: u.is_active === 1,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { username, password, displayName, role, age, avatarColor } = req.body;

    // Validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      res.status(400).json({ error: 'Username required' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    if (!role || !['admin', 'adult', 'teen'].includes(role)) {
      res.status(400).json({ error: 'Role must be admin, adult, or teen' });
      return;
    }

    const db = getDb();

    // Check username uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
      .get(username.trim()) as any;
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, role, age, avatar_color, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      username.trim(),
      passwordHash,
      displayName || username,
      role,
      age || null,
      avatarColor || '#3b82f6',
      now,
      now
    );

    // Create user_settings
    db.prepare(`
      INSERT INTO user_settings (user_id, default_model, user_system_prompt, theme, show_token_count, updated_at)
      VALUES (?, ?, '', 'light', 1, ?)
    `).run(id, 'claude-haiku-4-5-20251001', now);

    // Return created user (no password_hash)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    const result: User = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      age: user.age,
      avatarColor: user.avatar_color,
      isActive: user.is_active === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get user with settings and rules (admin only)
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const userId = req.params.id;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .get(userId) as any;

    const rules = db.prepare('SELECT * FROM parental_rules WHERE user_id = ? ORDER BY created_at ASC')
      .all(userId) as any[];

    const result = {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        avatarColor: user.avatar_color,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      settings: {
        userId: settings.user_id,
        defaultModel: settings.default_model,
        userSystemPrompt: settings.user_system_prompt,
        theme: settings.theme,
        showTokenCount: settings.show_token_count === 1,
        updatedAt: settings.updated_at,
      },
      rules: rules.map(r => ({
        id: r.id,
        userId: r.user_id,
        ruleType: r.rule_type,
        ruleValue: JSON.parse(r.rule_value),
        isActive: r.is_active === 1,
        createdBy: r.created_by,
        createdAt: r.created_at,
      })),
    };

    res.json(result);
  } catch (err: any) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const userId = req.params.id;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const allowedFields: Record<string, string> = {
      displayName: 'display_name',
      role: 'role',
      age: 'age',
      avatarColor: 'avatar_color',
      isActive: 'is_active',
    };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const [bodyKey, dbKey] of Object.entries(allowedFields)) {
      if (bodyKey in req.body) {
        const value = req.body[bodyKey];

        // Cannot change own role (prevent self-demotion)
        if (dbKey === 'role' && userId === req.user!.id) {
          res.status(400).json({ error: 'Cannot change your own role' });
          return;
        }

        if (dbKey === 'is_active') {
          updates[dbKey] = value ? 1 : 0;
        } else {
          updates[dbKey] = value;
        }
      }
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    values.push(userId);

    db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const result = {
      id: updated.id,
      username: updated.username,
      displayName: updated.display_name,
      role: updated.role,
      age: updated.age,
      avatarColor: updated.avatar_color,
      isActive: updated.is_active === 1,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Soft delete user (admin only)
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;

    // Cannot delete yourself
    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log(`[DELETE USER] Attempting to soft-delete user: ${user.display_name} (${userId})`);

    // Soft delete
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, userId);
    
    console.log(`[DELETE USER] Soft-delete complete - changes: ${result.changes}`);

    // Verify deletion by checking if user is now inactive
    const verifyUser = db.prepare('SELECT id, display_name, is_active FROM users WHERE id = ?').get(userId) as any;
    console.log(`[DELETE USER] Verification - user is_active: ${verifyUser?.is_active}`);

    res.json({ ok: true, deleted: { id: userId, displayName: user.display_name } });
  } catch (err: any) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id/settings
 * Get user settings (admin only)
 */
router.get('/:id/settings', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .get(req.params.id) as any;

    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    const result = {
      userId: settings.user_id,
      defaultModel: settings.default_model,
      userSystemPrompt: settings.user_system_prompt,
      theme: settings.theme,
      showTokenCount: settings.show_token_count === 1,
      updatedAt: settings.updated_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id/settings
 * Update user settings (admin only)
 */
router.put('/:id/settings', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const userId = req.params.id;

    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .get(userId) as any;
    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    const allowedFields: Record<string, string> = {
      defaultModel: 'default_model',
      userSystemPrompt: 'user_system_prompt',
      theme: 'theme',
      showTokenCount: 'show_token_count',
    };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const [bodyKey, dbKey] of Object.entries(allowedFields)) {
      if (bodyKey in req.body) {
        if (dbKey === 'show_token_count') {
          updates[dbKey] = req.body[bodyKey] ? 1 : 0;
        } else {
          updates[dbKey] = req.body[bodyKey];
        }
      }
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    values.push(userId);

    db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE user_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    const result = {
      userId: updated.user_id,
      defaultModel: updated.default_model,
      userSystemPrompt: updated.user_system_prompt,
      theme: updated.theme,
      showTokenCount: updated.show_token_count === 1,
      updatedAt: updated.updated_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id/rules
 * List parental rules for user (admin only)
 */
router.get('/:id/rules', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const rules = db.prepare('SELECT * FROM parental_rules WHERE user_id = ? ORDER BY created_at ASC')
      .all(req.params.id) as any[];

    const result = rules.map(r => ({
      id: r.id,
      userId: r.user_id,
      ruleType: r.rule_type,
      ruleValue: JSON.parse(r.rule_value),
      isActive: r.is_active === 1,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get rules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/:id/rules
 * Create parental rule (admin only)
 */
router.post('/:id/rules', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const userId = req.params.id;
    const { ruleType, ruleValue } = req.body;

    // Validate rule type
    const validRuleTypes = [
      'time_restriction',
      'daily_message_limit',
      'daily_token_budget',
      'keyword_block',
      'topic_block',
      'ai_content_filter',
    ];

    if (!ruleType || !validRuleTypes.includes(ruleType)) {
      res.status(400).json({ error: 'Invalid rule type' });
      return;
    }

    // Validate rule value is an object
    if (!ruleValue || typeof ruleValue !== 'object') {
      res.status(400).json({ error: 'Rule value must be an object' });
      return;
    }

    const ruleId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO parental_rules (
        id, user_id, rule_type, rule_value, is_active, created_by, created_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(
      ruleId,
      userId,
      ruleType,
      JSON.stringify(ruleValue),
      req.user!.id,
      now
    );

    const rule = db.prepare('SELECT * FROM parental_rules WHERE id = ?').get(ruleId) as any;
    const result = {
      id: rule.id,
      userId: rule.user_id,
      ruleType: rule.rule_type,
      ruleValue: JSON.parse(rule.rule_value),
      isActive: rule.is_active === 1,
      createdBy: rule.created_by,
      createdAt: rule.created_at,
    };

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id/rules/:ruleId
 * Update parental rule (admin only)
 */
router.put('/:id/rules/:ruleId', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const { id: userId, ruleId } = req.params;

    // Verify rule belongs to this user
    const rule = db.prepare('SELECT * FROM parental_rules WHERE id = ? AND user_id = ?')
      .get(ruleId, userId) as any;

    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    const updates: Record<string, any> = {};

    if ('ruleValue' in req.body) {
      updates.rule_value = JSON.stringify(req.body.ruleValue);
    }

    if ('isActive' in req.body) {
      updates.is_active = req.body.isActive ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) {
      res.json({
        id: rule.id,
        userId: rule.user_id,
        ruleType: rule.rule_type,
        ruleValue: JSON.parse(rule.rule_value),
        isActive: rule.is_active === 1,
        createdBy: rule.created_by,
        createdAt: rule.created_at,
      });
      return;
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    values.push(ruleId);

    db.prepare(`UPDATE parental_rules SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM parental_rules WHERE id = ?').get(ruleId) as any;
    const result = {
      id: updated.id,
      userId: updated.user_id,
      ruleType: updated.rule_type,
      ruleValue: JSON.parse(updated.rule_value),
      isActive: updated.is_active === 1,
      createdBy: updated.created_by,
      createdAt: updated.created_at,
    };

    res.json(result);
  } catch (err: any) {
    console.error('Update rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id/rules/:ruleId
 * Delete parental rule (admin only)
 */
router.delete('/:id/rules/:ruleId', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const { id: userId, ruleId } = req.params;

    // Verify rule belongs to this user
    const rule = db.prepare('SELECT * FROM parental_rules WHERE id = ? AND user_id = ?')
      .get(ruleId, userId) as any;

    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    db.prepare('DELETE FROM parental_rules WHERE id = ?').run(ruleId);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Admin only — reset another user's password without requiring current password
 */
router.post('/:id/reset-password', (req: Request, res: Response): void => {
  try {
    const { newPassword } = req.body;
    const targetUserId = req.params.id;
    const adminId = (req as any).user.id;

    // Validation
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Admin cannot reset their own password via this endpoint
    if (targetUserId === adminId) {
      res.status(400).json({ error: 'Use settings to change your own password' });
      return;
    }

    // Check target user exists
    const db = getDb();
    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Hash password and update
    const hashedPassword = hashPassword(newPassword);
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
    ).run(hashedPassword, now, targetUserId);

    // Log activity
    db.prepare(
      `INSERT INTO activity_log (id, user_id, event_type, event_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      adminId,
      'password_reset_by_admin',
      JSON.stringify({ resetBy: adminId, targetUser: targetUserId }),
      req.ip || '127.0.0.1',
      now
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
