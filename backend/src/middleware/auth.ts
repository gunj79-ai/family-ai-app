import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../database/index.js';
import { User } from '../types/index.js';

/**
 * Extend Express Request to include authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * JWT Payload structure
 */
interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware
 * - Extracts Bearer token from Authorization header
 * - Verifies JWT signature
 * - Queries user from database
 * - Checks is_active status
 * - Attaches user to req.user
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    // Verify token signature and expiry
    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    const userId = payload.userId;

    // Query user from database
    const db = getDb();
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!userRow) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if user is active
    if (!userRow.is_active) {
      res.status(401).json({ error: 'User account is inactive' });
      return;
    }

    // Attach user to request (convert database row format to User interface)
    req.user = {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name,
      role: userRow.role,
      age: userRow.age,
      avatarColor: userRow.avatar_color,
      isActive: userRow.is_active === 1,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token has expired' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}
