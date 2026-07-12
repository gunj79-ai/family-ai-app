import express, { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../utils/crypto.js';

export const configRouter = express.Router();

/**
 * GET /api/config
 * Public endpoint — returns app config that frontend needs before login
 * NO auth middleware required
 */
configRouter.get('/', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const settings = db.prepare(
      'SELECT key, value FROM server_settings'
    ).all() as Array<{ key: string; value: string }>;

    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

    res.json({
      appName: map.app_name || 'FamilyAI',
      appTagline: map.app_tagline || 'Your private family AI assistant',
      primaryColor: map.primary_color || '#6366f1',
      setupComplete: map.setup_complete !== 'false',
    });
  } catch (err: any) {
    console.error('Get config error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/config/setup
 * One-time setup endpoint for first-run configuration
 * Only works when setup_complete = false
 * Creates the first admin user and stores app settings
 */
configRouter.post('/setup', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const setupComplete = (
      db.prepare(
        "SELECT value FROM server_settings WHERE key='setup_complete'"
      ).get() as { value: string } | undefined
    )?.value;

    if (setupComplete === 'true') {
      res.status(403).json({ error: 'Setup already complete' });
      return;
    }

    const {
      appName,
      appTagline,
      primaryColor,
      adminUsername,
      adminPassword,
      adminDisplayName,
    } = req.body as {
      appName: string;
      appTagline: string;
      primaryColor: string;
      adminUsername: string;
      adminPassword: string;
      adminDisplayName: string;
    };

    if (!adminUsername || !adminPassword || adminPassword.length < 8) {
      res.status(400).json({ error: 'Invalid admin credentials' });
      return;
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    // Create admin user
    db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, role, age, avatar_color, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      adminUsername,
      hashPassword(adminPassword),
      adminDisplayName || adminUsername,
      'admin',
      null,
      '#ef4444',
      now,
      now
    );

    // Create user settings
    db.prepare(`
      INSERT INTO user_settings (user_id, default_model, user_system_prompt, theme, show_token_count, updated_at)
      VALUES (?, ?, '', 'light', 1, ?)
    `).run(id, 'claude-haiku-4-5-20251001', now);

    // Update server settings
    const upsert = db.prepare(
      `INSERT OR REPLACE INTO server_settings (key, value, updated_at) VALUES (?, ?, ?)`
    );
    upsert.run('app_name', appName || 'FamilyAI', now);
    upsert.run('app_tagline', appTagline || 'Your private family AI assistant', now);
    upsert.run('primary_color', primaryColor || '#6366f1', now);
    upsert.run('setup_complete', 'true', now);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Setup failed' });
  }
});

export default configRouter;
