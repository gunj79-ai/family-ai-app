import rateLimit from 'express-rate-limit';

// Auth endpoint limiter — tight
// Prevents brute force on login
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failed attempts
});

// API general limiter — loose
// Prevents accidental infinite loops or runaway clients
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute per IP (generous for family use)
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sensitive actions. Try again later.' },
});
