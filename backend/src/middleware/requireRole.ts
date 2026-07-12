import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

/**
 * Role-based access control middleware
 * Returns 401 if not authenticated, 403 if role not allowed
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
