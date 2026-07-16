import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const isDevelopment = config.NODE_ENV === 'development';

// Auth endpoint limiter — tight
// Prevents brute force on login
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 20, // More attempts in dev for testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failed attempts
});

// API general limiter — loose
// Prevents accidental infinite loops or runaway clients
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 300, // Much higher in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Slow down.' },
  skip: (req) => {
    // Skip rate limiting for SSE streaming endpoints
    // — they are long-lived connections, not repeated requests
    return req.path.endsWith('/messages') && req.method === 'POST';
  },
});

// Strict limiter for password change + user creation
export const sensitiveActionLimiter = rateLimit({
  windowMs: isDevelopment ? 5 * 60 * 1000 : 60 * 60 * 1000, // 5 min in dev, 1 hour in prod
  max: isDevelopment ? 100 : 10, // 100 in dev for testing, 10 in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sensitive actions. Try again later.' },
});
