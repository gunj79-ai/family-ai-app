import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../database/index.js';

/**
 * Activity logger middleware
 * Logs POST/PUT/DELETE requests (not GET to reduce noise)
 * Does NOT block requests
 */
export function activityLogger(req: Request, res: Response, next: NextFunction): void {
  // Only log write operations
  const method = req.method;
  if (!['POST', 'PUT', 'DELETE'].includes(method)) {
    next();
    return;
  }

  try {
    const db = getDb();
    const userId = req.user?.id;

    if (!userId) {
      next();
      return;
    }

    db.prepare(`
      INSERT INTO activity_log (
        id, user_id, event_type, event_data, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId,
      'api_request',
      JSON.stringify({ method, path: req.path, status: 'initiated' }),
      req.ip || '127.0.0.1',
      new Date().toISOString()
    );
  } catch (err: any) {
    console.error('Activity logger error:', err);
    // Don't block the request on logging failure
  }

  next();
}
