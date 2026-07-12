import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../database/index.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { authMiddleware } from '../middleware/auth.js';
import { User, UserSettings } from '../types/index.js';

const router = Router();

/**
 * Login endpoint
 * POST /api/auth/login
 * Body: { username: string, password: string }
 */
router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  try {
    const db = getDb();

    // Query user by username
    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      // Same error message for both wrong username and wrong password
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Check if user is active
    if (!userRow.is_active) {
      res.status(401).json({ error: 'User account is inactive' });
      return;
    }

    // Get user settings
    const settingsRow = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userRow.id) as any;

    // Create JWT token
    const token = jwt.sign({ userId: userRow.id }, config.JWT_SECRET || 'secret', {
      expiresIn: config.JWT_EXPIRY || '7d',
    } as any);

    // Log login event
    db.prepare(
      `INSERT INTO activity_log (id, user_id, event_type, event_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      userRow.id,
      'login',
      JSON.stringify({ ip: req.ip || 'unknown' }),
      req.ip || '127.0.0.1',
      new Date().toISOString()
    );

    // Convert database row to User interface
    const user: User = {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name,
      role: userRow.role,
      avatarColor: userRow.avatar_color,
      isActive: userRow.is_active === 1,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };

    // Convert settings row to UserSettings interface
    const settings: UserSettings = {
      userId: settingsRow?.user_id || userRow.id,
      defaultModel: settingsRow?.default_model || config.DEFAULT_MODEL,
      userSystemPrompt: settingsRow?.user_system_prompt || '',
      theme: settingsRow?.theme || 'light',
      showTokenCount: (settingsRow?.show_token_count || 1) === 1,
      updatedAt: settingsRow?.updated_at || new Date().toISOString(),
    };

    res.json({
      token,
      user,
      settings,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Logout endpoint
 * POST /api/auth/logout
 * Requires: Auth middleware
 */
router.post('/logout', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const user = req.user!;

    // Log logout event
    db.prepare(
      `INSERT INTO activity_log (id, user_id, event_type, event_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      user.id,
      'logout',
      JSON.stringify({ ip: req.ip || 'unknown' }),
      req.ip || '127.0.0.1',
      new Date().toISOString()
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current user and settings
 * GET /api/auth/me
 * Requires: Auth middleware
 */
router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const user = req.user!;

    // Query user settings
    const settingsRow = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id) as any;

    // Convert settings row to UserSettings interface
    const settings: UserSettings = {
      userId: settingsRow?.user_id || user.id,
      defaultModel: settingsRow?.default_model || config.DEFAULT_MODEL,
      userSystemPrompt: settingsRow?.user_system_prompt || '',
      theme: settingsRow?.theme || 'light',
      showTokenCount: (settingsRow?.show_token_count || 1) === 1,
      updatedAt: settingsRow?.updated_at || new Date().toISOString(),
    };

    res.json({
      user,
      settings,
    });
  } catch (err: any) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Change password
 * PUT /api/auth/password
 * Requires: Auth middleware
 * Body: { currentPassword: string, newPassword: string }
 */
router.put('/password', authMiddleware, (req: Request, res: Response): void => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  try {
    const db = getDb();
    const user = req.user!;

    // Query user to verify current password
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;

    if (!userRow) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    if (!verifyPassword(currentPassword, userRow.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const newHash = hashPassword(newPassword);

    // Update password in database
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      new Date().toISOString(),
      user.id
    );

    // Log password change event
    db.prepare(
      `INSERT INTO activity_log (id, user_id, event_type, event_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      user.id,
      'password_changed',
      JSON.stringify({ ip: req.ip || 'unknown' }),
      req.ip || '127.0.0.1',
      new Date().toISOString()
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
