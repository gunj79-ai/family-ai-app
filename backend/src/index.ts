import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { initDatabase, getDb } from './database/index.js';
import { config } from './config.js';
import { authLimiter, apiLimiter, sensitiveActionLimiter } from './middleware/rateLimiter.js';
import { runBackup } from './services/backup.js';
import authRouter from './routes/auth.js';
import { configRouter } from './routes/config.js';
import { authMiddleware } from './middleware/auth.js';
import { activityLogger } from './middleware/activityLogger.js';
import { requireRole } from './middleware/requireRole.js';
import projectsRouter from './routes/projects.js';
import chatsRouter from './routes/chats.js';
import usersRouter from './routes/users.js';
import adminRouter from './routes/admin.js';
import { attachmentsRouter } from './routes/attachments.js';
import { evaRouter } from './routes/eva.js';
import { speechRouter } from './routes/speech.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ─── JWT Secret Enforcement ───
if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is too short or missing.');
  console.error('Set a random 64-character string in .env');
  process.exit(1);
}

if (config.JWT_SECRET === 'replace-with-a-random-64-char-string-here') {
  console.error(
    'FATAL: JWT_SECRET is still the placeholder value.'
  );
  console.error(
    'Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
  process.exit(1);
}

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Vite needs this
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for SharedArrayBuffer (Whisper)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(config.UPLOADS_DIR)));

// Health check endpoint (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PWA manifest endpoint (no auth required)
app.get('/api/manifest.webmanifest', (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT key, value FROM server_settings'
    ).all() as Array<{ key: string; value: string }>;
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]));

    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=300');

    res.json({
      name: s.app_name || 'FamilyAI',
      short_name: s.app_name || 'FamilyAI',
      description: s.app_tagline || 'Your private family AI assistant',
      theme_color: s.primary_color || '#6366f1',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      orientation: 'portrait-primary',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    });
  } catch (err: any) {
    console.error('Manifest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Rate Limiting ───
// Apply BEFORE auth routes (rate limit login attempts)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/password', sensitiveActionLimiter);

// Config endpoint (no auth required — must be before authMiddleware)
app.use('/api/config', configRouter);

// Auth routes (no auth middleware required)
app.use('/api/auth', authRouter);

// Apply auth middleware to all other /api/* routes
app.use('/api', authMiddleware);

// General API limiter after auth middleware
app.use('/api', apiLimiter);

// Activity logger middleware (logs write operations for audit trail)
app.use('/api', activityLogger);

// Project and chat routes (protected by authMiddleware)
app.use('/api/projects', projectsRouter);
app.use('/api/chats', chatsRouter);

// Attachment routes (protected by authMiddleware)
app.use('/api/attachments', attachmentsRouter);

// Eva character routes (protected by authMiddleware)
app.use('/api/eva', evaRouter);

// Speech routes (protected by authMiddleware)
app.use('/api/speech', speechRouter);

// User management routes (admin only, with sensitive action limit)
app.use('/api/users', sensitiveActionLimiter, requireRole('admin'), usersRouter);

// Admin routes (admin only)
app.use('/api/admin', requireRole('admin'), adminRouter);

// Placeholder message for routes not yet implemented
app.use('/api', (_req, res) => {
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'Phase 5+ routes coming soon.'
  });
});

// ─── Static file serving (production) ───
// In production, __dirname = backend/dist/ so go up one level to backend/
// In dev (tsx), __dirname = backend/src/ so go up two levels
const isDev = config.NODE_ENV !== 'production';
const publicDir = isDev
  ? path.resolve(__dirname, '..', '..', 'backend', 'public')
  : path.resolve(__dirname, '..', 'public');

app.use(express.static(publicDir));

// SPA fallback — serve index.html for all non-API routes
// MUST come after all app.use('/api/...') registrations
app.get(/^(?!\/api).*$/, (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(
      'Frontend not built. Run: cd frontend && npm run build'
    );
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize database and start server
initDatabase()
  .then(() => {
    // ─── Database Backups ───
    runBackup(); // immediate backup on startup

    // Every day at 2am and 2pm
    cron.schedule('0 2,14 * * *', () => {
      console.log('[Backup] Running scheduled backup...');
      runBackup();
    });

    app.listen(config.PORT, '0.0.0.0', () => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Eva Backend`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  ✓ Running on port ${config.PORT}`);
      console.log(`  ✓ Environment: ${config.NODE_ENV}`);
      console.log(`  ✓ Database: ${config.DB_PATH}`);
      console.log(`  ✓ Rate limiting: enabled`);
      console.log(`  ✓ Backups: scheduled (2am, 2pm)`);
      console.log(`\n  🔗 API endpoint: http://localhost:${config.PORT}`);
      console.log(`  📊 Health check: http://localhost:${config.PORT}/api/health`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
