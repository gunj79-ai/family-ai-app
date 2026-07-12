# FamilyAI — Complete Project Specification
> Feed this entire document to your VS Code AI assistant (Copilot, Cline, Cursor, etc.) as project context.
> Build each phase in order. Do not skip ahead.

---

## 1. PROJECT OVERVIEW

Build a self-hosted, locally-running AI chat application for family use. It connects to a local Ollama instance (LLM runtime), provides a Claude-like interface with projects, instructions, attachments, and saved chat history, and includes full parental controls and admin visibility for a parent/admin user.

**Core principles:**
- All data stored locally (SQLite). No cloud dependency.
- Runs as a server on a Windows machine; family connects over Tailscale VPN.
- Role-based: `admin`, `adult`, `teen` — each with different permissions and controls.
- Every conversation is logged. Admin has full visibility.
- Streamed responses (like Claude/ChatGPT — text appears as it generates).

---

## 2. TECH STACK (exact versions)

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express | 5.x | HTTP server |
| TypeScript | 5.x | Language |
| better-sqlite3 | 9.x | SQLite database |
| bcrypt | 5.x | Password hashing |
| jsonwebtoken | 9.x | JWT auth tokens |
| multer | 1.x | File upload handling |
| pdf-parse | 1.x | Extract text from PDFs |
| sharp | 0.33.x | Image processing/resizing |
| uuid | 9.x | Generate UUIDs |
| cors | 2.x | CORS headers |
| helmet | 7.x | Security headers |
| tsx | 4.x | Run TypeScript directly |
| node-cron | 3.x | Scheduled jobs (usage resets) |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| TypeScript | 5.x | Language |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| Zustand | 4.x | State management |
| React Router | 6.x | Client-side routing |
| React Query | 5.x | Server state / data fetching |
| react-markdown | 9.x | Render markdown in messages |
| react-syntax-highlighter | 15.x | Code blocks in messages |
| lucide-react | 0.4x | Icons |
| date-fns | 3.x | Date formatting |
| axios | 1.x | HTTP client |

### Database
- **SQLite** via `better-sqlite3` — single file at `./data/familyai.db`

### Runtime
- **Ollama** — runs separately on the same Windows machine, port 11434

---

## 3. MONOREPO FOLDER STRUCTURE

```
family-ai/
├── package.json                    ← Root (workspaces: frontend, backend)
├── .env.example
├── .gitignore
├── SPEC.md                         ← This file
├── start.bat                       ← Windows startup script
├── data/                           ← SQLite DB and uploads live here
│   ├── familyai.db
│   └── uploads/
│       ├── attachments/            ← Message attachments
│       └── project-files/          ← Project knowledge files
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                ← Server entry point
│       ├── config.ts               ← Env vars, constants
│       ├── database/
│       │   ├── index.ts            ← DB connection singleton
│       │   ├── schema.sql          ← Full schema
│       │   └── seed.ts             ← Create default admin user
│       ├── middleware/
│       │   ├── auth.ts             ← JWT verify, attach user to req
│       │   ├── requireRole.ts      ← Role-based access control
│       │   ├── parentalGuard.ts    ← Content + time + limit checks
│       │   └── activityLogger.ts   ← Log all requests to activity_log
│       ├── routes/
│       │   ├── auth.ts             ← /api/auth/*
│       │   ├── users.ts            ← /api/users/* (admin)
│       │   ├── projects.ts         ← /api/projects/*
│       │   ├── chats.ts            ← /api/chats/*
│       │   ├── messages.ts         ← /api/chats/:id/messages/*
│       │   ├── attachments.ts      ← /api/attachments/*
│       │   ├── models.ts           ← /api/models/*
│       │   └── admin.ts            ← /api/admin/*
│       ├── services/
│       │   ├── ollama.ts           ← Ollama API client (chat, list, pull)
│       │   ├── contentFilter.ts    ← LlamaGuard + keyword filter
│       │   ├── fileProcessor.ts    ← PDF text extraction, image resize
│       │   └── contextManager.ts  ← Build message array, count tokens
│       └── types/
│           └── index.ts            ← All shared TypeScript types
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                 ← Router setup
        ├── api/
        │   ├── client.ts           ← Axios instance, interceptors
        │   ├── auth.ts
        │   ├── projects.ts
        │   ├── chats.ts
        │   ├── messages.ts
        │   ├── models.ts
        │   └── admin.ts
        ├── store/
        │   ├── authStore.ts        ← Current user, token
        │   ├── chatStore.ts        ← Active chat, messages
        │   └── uiStore.ts          ← Sidebar open, active project
        ├── hooks/
        │   ├── useChat.ts          ← Send message, stream handling
        │   ├── useProjects.ts
        │   └── useModels.ts
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── ChatPage.tsx        ← Main chat UI
        │   ├── AdminPage.tsx       ← Admin dashboard
        │   └── SettingsPage.tsx
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.tsx    ← Outer layout wrapper
        │   │   ├── Sidebar.tsx     ← Left sidebar
        │   │   └── TopBar.tsx      ← Top bar (model select, etc.)
        │   ├── chat/
        │   │   ├── ChatList.tsx    ← Chat history in sidebar
        │   │   ├── ChatWindow.tsx  ← Active chat area
        │   │   ├── MessageBubble.tsx
        │   │   ├── MessageInput.tsx ← Textarea + attach + send
        │   │   ├── AttachmentPreview.tsx
        │   │   ├── StreamingIndicator.tsx
        │   │   └── ContextBar.tsx  ← Token count progress bar
        │   ├── project/
        │   │   ├── ProjectList.tsx
        │   │   ├── ProjectCard.tsx
        │   │   ├── ProjectModal.tsx ← Create/edit project
        │   │   ├── ProjectFiles.tsx ← Knowledge base files
        │   │   └── InstructionsEditor.tsx
        │   ├── admin/
        │   │   ├── StatsPanel.tsx
        │   │   ├── ActivityLog.tsx
        │   │   ├── FlaggedContent.tsx
        │   │   ├── UserManager.tsx
        │   │   └── ParentalRules.tsx
        │   └── ui/                 ← shadcn/ui components (auto-generated)
        ├── types/
        │   └── index.ts            ← Frontend types (mirror backend types)
        └── utils/
            ├── tokenCounter.ts     ← Rough token estimation
            ├── markdown.ts         ← Markdown render config
            └── dates.ts
```

---

## 4. DATABASE SCHEMA

File: `backend/src/database/schema.sql`

```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('admin', 'adult', 'teen')),
  avatar_color  TEXT NOT NULL DEFAULT '#6366f1',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ============================================================
-- USER SETTINGS (1:1 with users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_model      TEXT NOT NULL DEFAULT 'llama3.1:8b',
  user_system_prompt TEXT NOT NULL DEFAULT '',
  theme              TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'system')),
  show_token_count   INTEGER NOT NULL DEFAULT 1,
  updated_at         TEXT NOT NULL
);

-- ============================================================
-- PARENTAL RULES (applied per user, set by admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS parental_rules (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_type    TEXT NOT NULL CHECK(rule_type IN (
                  'time_restriction',
                  'daily_message_limit',
                  'keyword_block',
                  'topic_block',
                  'model_restriction',
                  'ai_content_filter'
               )),
  -- JSON payload per rule_type:
  -- time_restriction:      {"start_hour": 7, "end_hour": 22}
  -- daily_message_limit:   {"limit": 100}
  -- keyword_block:         {"keywords": ["word1", "word2"]}
  -- topic_block:           {"topics": ["topic1", "topic2"]}
  -- model_restriction:     {"allowed_models": ["llama3.1:8b"]}
  -- ai_content_filter:     {"enabled": true}
  rule_value   TEXT NOT NULL,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  color                TEXT NOT NULL DEFAULT '#6366f1',
  icon                 TEXT NOT NULL DEFAULT '📁',
  system_instructions  TEXT NOT NULL DEFAULT '',
  -- system_instructions is injected as SYSTEM message in every chat in this project.
  -- Supports variable substitution: {{user_name}}, {{current_date}}, {{project_name}}
  is_pinned            INTEGER NOT NULL DEFAULT 0,
  is_archived          INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

-- ============================================================
-- PROJECT FILES (knowledge base files attached to a project)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_files (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,           -- stored filename on disk
  original_name   TEXT NOT NULL,           -- user-visible name
  mime_type       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,        -- bytes
  extracted_text  TEXT,                   -- extracted text (PDFs, txt)
  -- For image files, extracted_text is NULL (images passed as base64)
  created_at      TEXT NOT NULL
);

-- ============================================================
-- CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS chats (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id         TEXT REFERENCES projects(id) ON DELETE SET NULL,
  -- NULL project_id = unorganized / no project
  title              TEXT NOT NULL DEFAULT 'New Chat',
  model              TEXT NOT NULL,
  is_pinned          INTEGER NOT NULL DEFAULT 0,
  is_archived        INTEGER NOT NULL DEFAULT 0,
  total_tokens_used  INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  token_count INTEGER,
  is_flagged  INTEGER NOT NULL DEFAULT 0,
  flag_reason TEXT,
  -- metadata JSON: {"model": "llama3.1:8b", "generation_ms": 3200, "finish_reason": "stop"}
  metadata    TEXT,
  created_at  TEXT NOT NULL
);

-- ============================================================
-- MESSAGE ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id             TEXT PRIMARY KEY,
  message_id     TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,         -- stored filename on disk
  original_name  TEXT NOT NULL,         -- user-visible name
  mime_type      TEXT NOT NULL,
  file_size      INTEGER NOT NULL,
  extracted_text TEXT,                  -- for PDFs and text files
  width          INTEGER,               -- for images
  height         INTEGER,               -- for images
  created_at     TEXT NOT NULL
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  -- event types: login, logout, chat_created, message_sent,
  --              message_blocked, file_uploaded, settings_changed
  event_data  TEXT,   -- JSON, event-specific payload
  ip_address  TEXT,
  created_at  TEXT NOT NULL
);

-- ============================================================
-- FLAGGED CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS flagged_content (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  message_id       TEXT REFERENCES messages(id) ON DELETE SET NULL,
  chat_id          TEXT REFERENCES chats(id) ON DELETE SET NULL,
  flag_type        TEXT NOT NULL CHECK(flag_type IN ('keyword', 'ai_classifier', 'manual')),
  flag_reason      TEXT NOT NULL,
  original_content TEXT NOT NULL,
  is_reviewed      INTEGER NOT NULL DEFAULT 0,
  reviewed_by      TEXT REFERENCES users(id),
  reviewed_at      TEXT,
  created_at       TEXT NOT NULL
);

-- ============================================================
-- SERVER SETTINGS (key-value, admin-configurable)
-- ============================================================
CREATE TABLE IF NOT EXISTS server_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Default settings inserted by seed.ts:
-- ollama_url         = "http://localhost:11434"
-- default_model      = "llama3.1:8b"
-- content_filter_model = "llama-guard3:8b"
-- app_name           = "FamilyAI"
-- max_file_size_mb   = "10"
-- daily_usage_reset_hour = "0"   (midnight)

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_flagged_user_id ON flagged_content(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_reviewed ON flagged_content(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_parental_rules_user ON parental_rules(user_id);
```

---

## 5. ENVIRONMENT CONFIGURATION

File: `.env.example` (copy to `.env` and fill in):

```env
# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=replace-with-a-random-64-char-string-here
JWT_EXPIRY=7d

# Paths
DATA_DIR=./data
DB_PATH=./data/familyai.db
UPLOADS_DIR=./data/uploads

# Ollama
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b
CONTENT_FILTER_MODEL=llama-guard3:8b

# File limits
MAX_FILE_SIZE_MB=10

# Frontend (for Vite)
VITE_API_BASE_URL=http://localhost:3001
```

---

## 6. TYPESCRIPT TYPES

File: `backend/src/types/index.ts` — define ALL shared types here:

```typescript
export type UserRole = 'admin' | 'adult' | 'teen';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  defaultModel: string;
  userSystemPrompt: string;
  theme: Theme;
  showTokenCount: boolean;
  updatedAt: string;
}

export type ParentalRuleType =
  | 'time_restriction'
  | 'daily_message_limit'
  | 'keyword_block'
  | 'topic_block'
  | 'model_restriction'
  | 'ai_content_filter';

export interface ParentalRule {
  id: string;
  userId: string;
  ruleType: ParentalRuleType;
  ruleValue: Record<string, unknown>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  systemInstructions: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;   // joined
  chatCount?: number;   // joined
}

export interface ProjectFile {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  model: string;
  isPinned: boolean;
  isArchived: boolean;
  totalTokensUsed: number;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;  // joined
  lastMessage?: string;   // joined (snippet)
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  isFlagged: boolean;
  flagReason?: string;
  metadata?: {
    model?: string;
    generationMs?: number;
    finishReason?: string;
  };
  createdAt: string;
  attachments?: Attachment[];  // joined
}

export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;   // joined
  eventType: string;
  eventData?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface FlaggedContent {
  id: string;
  userId?: string;
  userName?: string;   // joined
  messageId?: string;
  chatId?: string;
  chatTitle?: string;  // joined
  flagType: 'keyword' | 'ai_classifier' | 'manual';
  flagReason: string;
  originalContent: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details?: {
    parameterSize?: string;
    quantizationLevel?: string;
    contextLength?: number;
    supportsVision?: boolean;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  flaggedToday: number;
  usageByUser: Array<{
    userId: string;
    displayName: string;
    role: UserRole;
    messagesTotal: number;
    messagesToday: number;
    chatsTotal: number;
  }>;
  messagesLast7Days: Array<{ date: string; count: number }>;
}

// ---- Request/Response shapes ----

export interface LoginRequest { username: string; password: string; }
export interface LoginResponse { token: string; user: User; settings: UserSettings; }

export interface SendMessageRequest {
  content: string;
  attachmentIds?: string[];  // pre-uploaded attachment IDs
}

export interface CreateChatRequest {
  projectId?: string;
  model?: string;
  title?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  systemInstructions?: string;
}

export interface ContentFilterResult {
  blocked: boolean;
  reason?: string;
  flagType?: 'keyword' | 'ai_classifier';
}
```

Copy the same types file to `frontend/src/types/index.ts` (identical).

---

## 7. BACKEND IMPLEMENTATION

### 7.1 Entry Point

File: `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { initDatabase } from './database/index.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { chatsRouter } from './routes/chats.js';
import { messagesRouter } from './routes/messages.js';
import { attachmentsRouter } from './routes/attachments.js';
import { modelsRouter } from './routes/models.js';
import { adminRouter } from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';
import { activityLogger } from './middleware/activityLogger.js';
import { config } from './config.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files statically (auth is checked in routes, not here)
app.use('/uploads', express.static(path.resolve(config.UPLOADS_DIR)));

// Public routes
app.use('/api/auth', authRouter);

// All routes below require a valid JWT
app.use('/api', authMiddleware);
app.use('/api', activityLogger);

app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/chats', chatsRouter);
// messages are mounted inside chatsRouter as /api/chats/:chatId/messages
app.use('/api/attachments', attachmentsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/admin', adminRouter);

// Serve frontend in production
if (config.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('../frontend/dist')));
  app.get('*', (_, res) => res.sendFile(path.resolve('../frontend/dist/index.html')));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

initDatabase().then(() => {
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`FamilyAI backend running on port ${config.PORT}`);
  });
});
```

### 7.2 Database Connection

File: `backend/src/database/index.ts`

```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function initDatabase(): Promise<void> {
  // Ensure data directory exists
  fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });
  fs.mkdirSync(path.join(config.UPLOADS_DIR, 'attachments'), { recursive: true });
  fs.mkdirSync(path.join(config.UPLOADS_DIR, 'project-files'), { recursive: true });

  db = new Database(config.DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(path.resolve('./src/database/schema.sql'), 'utf-8');
  db.exec(schema);

  // Seed default data if needed
  await seedDefaults();

  console.log('Database initialized at', config.DB_PATH);
}

async function seedDefaults(): Promise<void> {
  const db = getDb();
  
  // Default server settings
  const defaultSettings: Record<string, string> = {
    ollama_url: 'http://localhost:11434',
    default_model: 'llama3.1:8b',
    content_filter_model: 'llama-guard3:8b',
    app_name: 'FamilyAI',
    max_file_size_mb: '10',
    daily_usage_reset_hour: '0',
    content_filter_enabled: 'true',
  };

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO server_settings (key, value, updated_at) VALUES (?, ?, ?)`
  );
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value, new Date().toISOString());
  }

  // Create default admin if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const { v4: uuidv4 } = await import('uuid');
    const bcrypt = await import('bcrypt');
    const id = uuidv4();
    const now = new Date().toISOString();
    const hash = await bcrypt.hash('admin123', 12);
    
    db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, role, avatar_color, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, 'admin', hash, 'Administrator', 'admin', '#ef4444', now, now);

    db.prepare(`
      INSERT INTO user_settings (user_id, default_model, user_system_prompt, theme, show_token_count, updated_at)
      VALUES (?, ?, '', 'light', 1, ?)
    `).run(id, 'llama3.1:8b', now);

    console.log('Default admin created — username: admin, password: admin123 — CHANGE THIS IMMEDIATELY');
  }
}
```

### 7.3 Auth Middleware

File: `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/index.js';
import { config } from '../config.js';
import { User } from '../types/index.js';

// Extend Express Request to carry user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const db = getDb();
    const user = db.prepare(`
      SELECT id, username, display_name as displayName, role, avatar_color as avatarColor,
             is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM users WHERE id = ? AND is_active = 1
    `).get(payload.userId) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### 7.4 Parental Guard Middleware

File: `backend/src/middleware/parentalGuard.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/index.js';
import { filterContent } from '../services/contentFilter.js';
import { ParentalRule } from '../types/index.js';

export async function parentalGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user!;
  
  // Admin and adult are not subject to parental controls
  if (user.role === 'admin' || user.role === 'adult') {
    next();
    return;
  }

  const db = getDb();
  const rules = db.prepare(`
    SELECT * FROM parental_rules WHERE user_id = ? AND is_active = 1
  `).all(user.id) as ParentalRule[];

  const now = new Date();
  const content: string = req.body?.content || '';

  for (const rule of rules) {
    const value = JSON.parse(rule.ruleValue as unknown as string) as Record<string, unknown>;

    switch (rule.ruleType) {
      case 'time_restriction': {
        const hour = now.getHours();
        const start = value.start_hour as number;
        const end = value.end_hour as number;
        if (hour < start || hour >= end) {
          res.status(403).json({
            error: `AI access is not available right now. Allowed hours: ${start}:00–${end}:00.`
          });
          return;
        }
        break;
      }

      case 'daily_message_limit': {
        const limit = value.limit as number;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const countRow = db.prepare(`
          SELECT COUNT(*) as c FROM messages m
          JOIN chats c ON m.chat_id = c.id
          WHERE c.user_id = ? AND m.role = 'user' AND m.created_at >= ?
        `).get(user.id, todayStart.toISOString()) as { c: number };
        if (countRow.c >= limit) {
          res.status(429).json({
            error: `Daily message limit of ${limit} reached. Resets at midnight.`
          });
          return;
        }
        break;
      }

      case 'keyword_block': {
        const keywords = value.keywords as string[];
        const lower = content.toLowerCase();
        const hit = keywords.find(k => lower.includes(k.toLowerCase()));
        if (hit) {
          // Log flagged content
          logFlagged(user.id, req.body?.chatId, null, 'keyword', `Keyword match: "${hit}"`, content);
          res.status(400).json({ error: 'This topic is not available in your account.' });
          return;
        }
        break;
      }

      case 'ai_content_filter': {
        if (value.enabled && content.length > 10) {
          const result = await filterContent(content);
          if (result.blocked) {
            logFlagged(user.id, req.body?.chatId, null, 'ai_classifier', result.reason || 'AI classifier', content);
            res.status(400).json({ error: 'This message cannot be processed.' });
            return;
          }
        }
        break;
      }
    }
  }

  next();
}

function logFlagged(
  userId: string,
  chatId: string | null,
  messageId: string | null,
  flagType: 'keyword' | 'ai_classifier' | 'manual',
  flagReason: string,
  content: string
): void {
  const { v4: uuidv4 } = require('uuid');
  const db = getDb();
  db.prepare(`
    INSERT INTO flagged_content
      (id, user_id, message_id, chat_id, flag_type, flag_reason, original_content, is_reviewed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(uuidv4(), userId, messageId, chatId, flagType, flagReason, content, new Date().toISOString());
}
```

### 7.5 Ollama Service

File: `backend/src/services/ollama.ts`

```typescript
import { config } from '../config.js';

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | OllamaContent[];
}

interface OllamaContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };  // base64 data URL
}

export async function streamChat(
  messages: OllamaMessage[],
  model: string,
  onChunk: (text: string) => void,
  onDone: (fullText: string, tokensUsed: number) => void,
  onError: (err: Error) => void
): Promise<void> {
  const ollamaUrl = config.OLLAMA_URL;
  
  const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    onError(new Error(`Ollama error: ${response.status} ${await response.text()}`));
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let totalTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const data = JSON.parse(line.slice(6));
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
          if (data.usage) {
            totalTokens = data.usage.total_tokens || 0;
          }
        } catch { /* skip malformed chunks */ }
      }
    }
    onDone(fullText, totalTokens);
  } catch (err) {
    onError(err as Error);
  }
}

export async function listModels(): Promise<import('../types/index.js').OllamaModel[]> {
  const res = await fetch(`${config.OLLAMA_URL}/api/tags`);
  if (!res.ok) throw new Error('Cannot connect to Ollama');
  const data = await res.json() as { models: Array<{ name: string; size: number; digest: string; modified_at: string; details?: Record<string, unknown> }> };
  return data.models.map(m => ({
    name: m.name,
    size: m.size,
    digest: m.digest,
    modifiedAt: m.modified_at,
    details: {
      parameterSize: m.details?.parameter_size as string | undefined,
      quantizationLevel: m.details?.quantization_level as string | undefined,
    }
  }));
}

export async function pullModel(modelName: string, onProgress: (status: string) => void): Promise<void> {
  const response = await fetch(`${config.OLLAMA_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: true }),
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        onProgress(data.status || '');
      } catch { /* skip */ }
    }
  }
}
```

### 7.6 Content Filter Service

File: `backend/src/services/contentFilter.ts`

```typescript
import { config } from '../config.js';
import { ContentFilterResult } from '../types/index.js';

// Two-tier filtering: keyword check first (fast), then AI classifier (slower)

const DEFAULT_BLOCKED_KEYWORDS: string[] = [
  'porn', 'pornography', 'xxx', 'explicit sex',
  'how to make a bomb', 'how to make drugs', 'meth recipe', 'cocaine synthesis',
  'suicide method', 'how to kill myself',
];

export async function filterContent(
  text: string,
  additionalKeywords: string[] = []
): Promise<ContentFilterResult> {
  // Tier 1: keyword check (synchronous, instant)
  const allKeywords = [...DEFAULT_BLOCKED_KEYWORDS, ...additionalKeywords];
  const lower = text.toLowerCase();
  const keywordHit = allKeywords.find(k => lower.includes(k));
  if (keywordHit) {
    return { blocked: true, reason: `Keyword match: "${keywordHit}"`, flagType: 'keyword' };
  }

  // Tier 2: LlamaGuard (async, ~500ms)
  try {
    const ollamaUrl = config.OLLAMA_URL;
    const filterModel = config.CONTENT_FILTER_MODEL;
    
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: filterModel,
        prompt: `[INST] Task: Check if the following message is safe for a teen (under 18).
Message: "${text}"
Respond with ONLY "safe" or "unsafe". Do not explain.[/INST]`,
        stream: false,
      }),
    });

    if (!res.ok) return { blocked: false }; // If classifier unavailable, fail open

    const data = await res.json() as { response: string };
    const response = data.response.toLowerCase().trim();
    
    if (response.includes('unsafe')) {
      return { blocked: true, reason: 'AI content classifier flagged this message', flagType: 'ai_classifier' };
    }
    return { blocked: false };
  } catch {
    // If LlamaGuard is not available, skip AI check
    console.warn('Content filter model unavailable, skipping AI check');
    return { blocked: false };
  }
}
```

### 7.7 Context Manager Service

File: `backend/src/services/contextManager.ts`

```typescript
import { Message, ProjectFile } from '../types/index.js';

// Rough token estimation: ~4 chars per token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface BuiltContext {
  messages: Array<{ role: string; content: string | object[] }>;
  estimatedTokens: number;
}

export function buildContext(
  systemInstructions: string,
  projectFiles: ProjectFile[],
  chatMessages: Message[],
  userDisplayName: string,
  projectName: string,
  maxContextTokens: number = 4096
): BuiltContext {
  const now = new Date();
  
  // Substitute variables in system instructions
  let resolvedSystem = systemInstructions
    .replace(/\{\{user_name\}\}/g, userDisplayName)
    .replace(/\{\{current_date\}\}/g, now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    .replace(/\{\{current_time\}\}/g, now.toLocaleTimeString('en-US'))
    .replace(/\{\{project_name\}\}/g, projectName);

  // Append project knowledge files to system prompt
  if (projectFiles.length > 0) {
    resolvedSystem += '\n\n---\n## Knowledge Base Files\n';
    for (const file of projectFiles) {
      if (file.extractedText) {
        resolvedSystem += `\n### ${file.originalName}\n${file.extractedText.slice(0, 8000)}\n`;
      }
    }
  }

  const messages: Array<{ role: string; content: string | object[] }> = [];
  
  if (resolvedSystem.trim()) {
    messages.push({ role: 'system', content: resolvedSystem });
  }

  // Add chat messages, from oldest to newest
  // If we would exceed context, drop oldest user/assistant pairs first
  let tokenBudget = maxContextTokens - estimateTokens(resolvedSystem);
  
  // Calculate token cost of each message
  const messageTokens = chatMessages.map(m => ({
    message: m,
    tokens: estimateTokens(m.content)
  }));

  // Trim from oldest if needed
  while (messageTokens.reduce((sum, m) => sum + m.tokens, 0) > tokenBudget && messageTokens.length > 2) {
    messageTokens.shift(); // remove oldest
  }

  for (const { message } of messageTokens) {
    // If message has image attachments, build multi-part content
    if (message.attachments?.some(a => a.mimeType.startsWith('image/'))) {
      const contentParts: object[] = [];
      contentParts.push({ type: 'text', text: message.content });
      for (const att of message.attachments ?? []) {
        if (att.mimeType.startsWith('image/')) {
          // Backend sends base64 image to Ollama
          contentParts.push({
            type: 'image_url',
            image_url: { url: `/uploads/attachments/${att.filename}` }
          });
        } else if (att.extractedText) {
          contentParts[0] = {
            type: 'text',
            text: `${(contentParts[0] as { text: string }).text}\n\n[Attached file: ${att.originalName}]\n${att.extractedText}`
          };
        }
      }
      messages.push({ role: message.role, content: contentParts });
    } else {
      // Append any text-file extracted content
      let content = message.content;
      for (const att of message.attachments ?? []) {
        if (att.extractedText) {
          content += `\n\n[Attached file: ${att.originalName}]\n${att.extractedText}`;
        }
      }
      messages.push({ role: message.role, content });
    }
  }

  return {
    messages,
    estimatedTokens: estimateTokens(resolvedSystem) + messageTokens.reduce((s, m) => s + m.tokens, 0)
  };
}
```

---

## 8. API ENDPOINTS (complete reference)

### Auth — `/api/auth`

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` | `{ token, user, settings }` | None |
| POST | `/api/auth/logout` | — | `{ ok: true }` | JWT |
| GET | `/api/auth/me` | — | `{ user, settings }` | JWT |
| PUT | `/api/auth/password` | `{ currentPassword, newPassword }` | `{ ok: true }` | JWT |

### Users — `/api/users` (admin only)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/users` | — | `User[]` |
| POST | `/api/users` | `{ username, password, displayName, role, avatarColor }` | `User` |
| GET | `/api/users/:id` | — | `{ user, settings, rules }` |
| PUT | `/api/users/:id` | `Partial<User>` | `User` |
| DELETE | `/api/users/:id` | — | `{ ok: true }` |
| GET | `/api/users/:id/settings` | — | `UserSettings` |
| PUT | `/api/users/:id/settings` | `Partial<UserSettings>` | `UserSettings` |
| GET | `/api/users/:id/rules` | — | `ParentalRule[]` |
| POST | `/api/users/:id/rules` | `{ ruleType, ruleValue }` | `ParentalRule` |
| PUT | `/api/users/:id/rules/:ruleId` | `{ ruleValue?, isActive? }` | `ParentalRule` |
| DELETE | `/api/users/:id/rules/:ruleId` | — | `{ ok: true }` |

### Projects — `/api/projects`

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/projects` | `?archived=false` | `Project[]` |
| POST | `/api/projects` | `CreateProjectRequest` | `Project` |
| GET | `/api/projects/:id` | — | `Project` |
| PUT | `/api/projects/:id` | `Partial<Project>` | `Project` |
| DELETE | `/api/projects/:id` | — | `{ ok: true }` |
| GET | `/api/projects/:id/files` | — | `ProjectFile[]` |
| POST | `/api/projects/:id/files` | `multipart/form-data: file` | `ProjectFile` |
| DELETE | `/api/projects/:id/files/:fileId` | — | `{ ok: true }` |

### Chats — `/api/chats`

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/chats` | `?projectId=&pinned=&search=&limit=50&offset=0` | `Chat[]` |
| POST | `/api/chats` | `CreateChatRequest` | `Chat` |
| GET | `/api/chats/:id` | — | `Chat` |
| PUT | `/api/chats/:id` | `{ title?, isPinned?, projectId?, isArchived? }` | `Chat` |
| DELETE | `/api/chats/:id` | — | `{ ok: true }` |
| GET | `/api/chats/:id/export` | `?format=markdown` | text file download |

### Messages — `/api/chats/:chatId/messages`

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/chats/:chatId/messages` | `?limit=100&offset=0` | `Message[]` |
| POST | `/api/chats/:chatId/messages` | `SendMessageRequest` | SSE stream (see below) |
| DELETE | `/api/chats/:chatId/messages/:id` | — | `{ ok: true }` |
| POST | `/api/chats/:chatId/messages/:id/regenerate` | — | SSE stream |

**SSE Stream format for POST messages:**
```
data: {"type":"chunk","content":"Hello"}
data: {"type":"chunk","content":" world"}
data: {"type":"done","messageId":"abc","tokenCount":42}
data: {"type":"error","error":"Something went wrong"}
```

### Attachments — `/api/attachments`

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/attachments/upload` | `multipart/form-data: file` | `Attachment` (without messageId, pending) |
| GET | `/api/attachments/:id` | — | file download |
| DELETE | `/api/attachments/:id` | — | `{ ok: true }` |

> Upload attachments before sending a message. Store returned IDs, pass in `attachmentIds[]` when sending.

### Models — `/api/models`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/models` | — | `OllamaModel[]` |
| POST | `/api/models/pull` | `{ name: string }` | SSE stream of pull progress |

### Admin — `/api/admin`

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/admin/stats` | — | `AdminStats` |
| GET | `/api/admin/activity` | `?userId=&eventType=&limit=100&offset=0` | `ActivityLog[]` |
| GET | `/api/admin/flagged` | `?reviewed=false&limit=50&offset=0` | `FlaggedContent[]` |
| PUT | `/api/admin/flagged/:id/review` | — | `FlaggedContent` |
| GET | `/api/admin/settings` | — | `Record<string, string>` |
| PUT | `/api/admin/settings` | `Record<string, string>` | `Record<string, string>` |

---

## 9. MESSAGES ROUTE (detailed — most complex)

File: `backend/src/routes/messages.ts`

```typescript
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/index.js';
import { parentalGuard } from '../middleware/parentalGuard.js';
import { buildContext, estimateTokens } from '../services/contextManager.js';
import { streamChat } from '../services/ollama.js';
import { Message, Chat, Project, ProjectFile, Attachment } from '../types/index.js';

export const messagesRouter = express.Router({ mergeParams: true });

// GET /api/chats/:chatId/messages
messagesRouter.get('/', (req, res) => {
  const db = getDb();
  const { chatId } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  // Verify chat belongs to user (or admin)
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as Chat;
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (chat.userId !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const messages = db.prepare(`
    SELECT * FROM messages WHERE chat_id = ?
    ORDER BY created_at ASC LIMIT ? OFFSET ?
  `).all(chatId, limit, offset) as Message[];

  // Join attachments
  for (const msg of messages) {
    (msg as Message & { attachments: Attachment[] }).attachments = db.prepare(
      'SELECT * FROM attachments WHERE message_id = ?'
    ).all(msg.id) as Attachment[];
    if (msg.metadata) {
      try { msg.metadata = JSON.parse(msg.metadata as unknown as string); } catch { /* skip */ }
    }
  }

  res.json(messages);
});

// POST /api/chats/:chatId/messages  — streams response via SSE
messagesRouter.post('/', parentalGuard, async (req, res) => {
  const db = getDb();
  const { chatId } = req.params;
  const { content, attachmentIds = [] } = req.body;

  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as Chat | undefined;
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (chat.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const now = new Date().toISOString();

    // 1. Bind pending attachments to a real message
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, chat_id, role, content, token_count, is_flagged, created_at)
      VALUES (?, ?, 'user', ?, ?, 0, ?)
    `).run(userMsgId, chatId, content, estimateTokens(content), now);

    if (attachmentIds.length > 0) {
      const placeholders = attachmentIds.map(() => '?').join(',');
      db.prepare(`UPDATE attachments SET message_id = ? WHERE id IN (${placeholders})`)
        .run(userMsgId, ...attachmentIds);
    }

    // 2. Auto-generate title from first message
    const msgCount = (db.prepare('SELECT COUNT(*) as c FROM messages WHERE chat_id = ?').get(chatId) as { c: number }).c;
    if (msgCount <= 1) {
      const title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      db.prepare('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?')
        .run(title, now, chatId);
    }

    // 3. Fetch all messages + project context
    const allMessages = db.prepare(`
      SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
    `).all(chatId) as Message[];

    // Attach attachments to each message for context building
    for (const msg of allMessages) {
      (msg as Message & { attachments: Attachment[] }).attachments = db.prepare(
        'SELECT * FROM attachments WHERE message_id = ?'
      ).all(msg.id) as Attachment[];
    }

    let project: Project | undefined;
    let projectFiles: ProjectFile[] = [];
    if (chat.projectId) {
      project = db.prepare('SELECT * FROM projects WHERE id = ?').get(chat.projectId) as Project;
      projectFiles = db.prepare('SELECT * FROM project_files WHERE project_id = ?').all(chat.projectId) as ProjectFile[];
    }

    // Get user settings for system prompt
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user!.id) as { userSystemPrompt: string };
    const systemInstructions = project?.systemInstructions || settings.userSystemPrompt || '';

    const { messages: contextMessages } = buildContext(
      systemInstructions,
      projectFiles,
      allMessages,
      req.user!.displayName,
      project?.name || '',
      8192
    );

    // 4. Stream from Ollama
    const assistantMsgId = uuidv4();
    const assistantStart = Date.now();
    let fullResponse = '';

    await streamChat(
      contextMessages as Parameters<typeof streamChat>[0],
      chat.model,
      (chunk) => {
        fullResponse += chunk;
        send({ type: 'chunk', content: chunk });
      },
      (fullText, tokensUsed) => {
        const generationMs = Date.now() - assistantStart;
        const assistantNow = new Date().toISOString();
        const metadata = JSON.stringify({ model: chat.model, generationMs, finishReason: 'stop' });
        
        db.prepare(`
          INSERT INTO messages (id, chat_id, role, content, token_count, is_flagged, metadata, created_at)
          VALUES (?, ?, 'assistant', ?, ?, 0, ?, ?)
        `).run(assistantMsgId, chatId, fullText, tokensUsed || estimateTokens(fullText), metadata, assistantNow);

        db.prepare('UPDATE chats SET total_tokens_used = total_tokens_used + ?, updated_at = ? WHERE id = ?')
          .run(tokensUsed, assistantNow, chatId);

        send({ type: 'done', messageId: assistantMsgId, tokenCount: tokensUsed });
        res.end();
      },
      (err) => {
        send({ type: 'error', error: err.message });
        res.end();
      }
    );

  } catch (err) {
    send({ type: 'error', error: (err as Error).message });
    res.end();
  }
});
```

---

## 10. FRONTEND IMPLEMENTATION

### 10.1 App.tsx — Routing

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/chat/:chatId" element={user ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 10.2 Auth Store

File: `frontend/src/store/authStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserSettings } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  settings: UserSettings | null;
  setAuth: (user: User, token: string, settings: UserSettings) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      settings: null,
      setAuth: (user, token, settings) => set({ user, token, settings }),
      updateSettings: (settings) => set((s) => ({ settings: s.settings ? { ...s.settings, ...settings } : null })),
      logout: () => set({ user: null, token: null, settings: null }),
    }),
    { name: 'familyai-auth' }
  )
);
```

### 10.3 Chat Store

File: `frontend/src/store/chatStore.ts`

```typescript
import { create } from 'zustand';
import { Chat, Message } from '../types';

interface ChatState {
  activeChat: Chat | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  pendingAttachments: Array<{ id: string; name: string; size: number; type: string }>;
  setActiveChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStream: (message: Message) => void;
  addPendingAttachment: (att: { id: string; name: string; size: number; type: string }) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChat: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  pendingAttachments: [],
  setActiveChat: (chat) => set({ activeChat: chat, messages: [], streamingContent: '' }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setStreaming: (streaming) => set({ isStreaming: streaming, streamingContent: '' }),
  appendStreamChunk: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),
  finalizeStream: (message) => set((s) => ({
    messages: [...s.messages, message],
    isStreaming: false,
    streamingContent: '',
  })),
  addPendingAttachment: (att) => set((s) => ({ pendingAttachments: [...s.pendingAttachments, att] })),
  removePendingAttachment: (id) => set((s) => ({ pendingAttachments: s.pendingAttachments.filter(a => a.id !== id) })),
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
}));
```

### 10.4 useChat Hook — SSE Streaming

File: `frontend/src/hooks/useChat.ts`

```typescript
import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export function useChat() {
  const { appendMessage, setStreaming, appendStreamChunk, finalizeStream, pendingAttachments, clearPendingAttachments } = useChatStore();
  const { token } = useAuthStore();

  const sendMessage = useCallback(async (chatId: string, content: string) => {
    const attachmentIds = pendingAttachments.map(a => a.id);

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      chatId,
      role: 'user' as const,
      content,
      isFlagged: false,
      createdAt: new Date().toISOString(),
      attachments: pendingAttachments.map(a => ({
        id: a.id, originalName: a.name, mimeType: a.type,
        fileSize: a.size, filename: '', messageId: '', createdAt: ''
      })),
    };
    appendMessage(tempUserMsg);
    clearPendingAttachments();
    setStreaming(true);

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/chats/${chatId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, attachmentIds }),
      }
    );

    if (!response.ok) {
      setStreaming(false);
      const err = await response.json();
      throw new Error(err.error || 'Failed to send message');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'chunk') {
            appendStreamChunk(data.content);
          } else if (data.type === 'done') {
            // Fetch the finalized message from server
            const { data: finalMsg } = await apiClient.get(`/api/chats/${chatId}/messages`, {
              params: { limit: 1, offset: 0 }
            });
            // Actually re-fetch all messages
            finalizeStream({
              id: data.messageId,
              chatId,
              role: 'assistant',
              content: '',  // will be set on re-fetch
              isFlagged: false,
              createdAt: new Date().toISOString(),
              tokenCount: data.tokenCount,
            });
          } else if (data.type === 'error') {
            setStreaming(false);
            throw new Error(data.error);
          }
        } catch { /* skip parse errors */ }
      }
    }
  }, [token, pendingAttachments, appendMessage, clearPendingAttachments, setStreaming, appendStreamChunk, finalizeStream]);

  return { sendMessage };
}
```

### 10.5 App Shell Layout

File: `frontend/src/components/layout/AppShell.tsx`

```typescript
// AppShell renders: <Sidebar> + <main content area>
// Sidebar contains: app logo, project list, chat list, user avatar + settings
// Main area: TopBar + ChatWindow
// 
// Layout (Tailwind):
// <div className="flex h-screen overflow-hidden bg-background">
//   <Sidebar />  {/* w-72 min-w-72 border-r */}
//   <div className="flex-1 flex flex-col overflow-hidden">
//     <TopBar />  {/* h-14 border-b */}
//     <ChatWindow />  {/* flex-1 overflow-y-auto */}
//   </div>
// </div>
```

### 10.6 Sidebar Component

File: `frontend/src/components/layout/Sidebar.tsx`

The Sidebar renders these sections top to bottom:
1. **App logo** + name ("FamilyAI")
2. **New Chat** button (+ icon, full width)
3. **Projects section** — collapsible list of user's projects. Each project shows icon, name, chat count badge. Click to filter chats to that project.
4. **Chats section** — list of recent chats, grouped by date (Today, Yesterday, This Week, Older). Each entry shows title, timestamp. Active chat is highlighted.
5. **Bottom bar** — user avatar + display name + role badge + settings gear icon + (admin only) admin panel link.

Sidebar must support:
- Search input filtering chat list in real time
- Right-click context menu on chats: Rename, Pin, Move to Project, Delete
- Drag chat to a project (optional, post-MVP)

### 10.7 MessageBubble Component

File: `frontend/src/components/chat/MessageBubble.tsx`

Props:
```typescript
interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
}
```

Renders:
- **User message**: right-aligned, rounded bubble, user avatar, timestamp on hover
- **Assistant message**: left-aligned, no bubble background, avatar with model initial, rendered markdown
- **Markdown rendering**: use `react-markdown` with `react-syntax-highlighter` for code blocks
- **Copy button**: appears on hover of assistant messages
- **Attachments**: thumbnails for images, file chips for docs (show filename + size)
- **Streaming cursor**: blinking cursor appended to streaming content
- **Flag indicator**: red border + flag icon if `message.isFlagged`
- **Token count**: small gray text below assistant messages showing token count

### 10.8 MessageInput Component

File: `frontend/src/components/chat/MessageInput.tsx`

Features:
- Auto-resizing textarea (min 1 row, max 8 rows)
- Send on Enter (Shift+Enter for newline)
- Attach button: opens file picker, accepts `image/*,.pdf,.txt,.md`
- Attachment preview chips above input: thumbnail for images, icon+name for docs, × to remove
- Token estimate display: "~{n} tokens" updated as user types
- Model selector dropdown (shows current model, click to change)
- Disabled + spinner while streaming
- Paste image support (detect image paste, add as attachment)

### 10.9 ContextBar Component

File: `frontend/src/components/chat/ContextBar.tsx`

A thin bar above the message input showing:
- "Context: {used}k / {max}k tokens" 
- Progress bar (green → yellow → red as it fills)
- Warning at 80%: "Approaching context limit"
- "Summarize & continue" button appears at 90% — sends a meta-message asking the model to summarize the conversation, then starts a new chat with that summary as context

---

## 11. ADMIN DASHBOARD

File: `frontend/src/pages/AdminPage.tsx`

The admin page has a left tab navigation with these sections:

### 11.1 Overview Tab
- Total users, total chats, total messages (stat cards)
- Line chart: messages per day (last 7 days), one line per user
- Flagged content count with red badge if >0 unreviewed
- Online users (last seen < 5 minutes ago)

### 11.2 Activity Tab
- Searchable, paginated table of `activity_log`
- Columns: Timestamp, User, Event, Details
- Filter by: user, event type, date range
- Click row to expand full event data JSON

### 11.3 Flagged Content Tab
- Cards for each flagged item showing:
  - User name + role badge
  - Timestamp
  - Flag type badge (keyword / AI classifier)
  - Flag reason
  - Content (truncated, expandable)
  - Link to full chat
  - "Mark as Reviewed" button
- Filter: show reviewed / unreviewed

### 11.4 Users Tab
- List of all users with role badges, avatar, last active
- Add User button → modal with username, password, display name, role, avatar color picker
- Edit user → inline edit or modal
- Toggle user active/inactive
- Per-user action: "View full chat history" — opens activity log filtered to that user

### 11.5 Parental Controls Tab
- Select a user from dropdown (only shows teen/adult users)
- Shows current rules as cards, each with toggle and edit/delete
- Add Rule button → form:
  - Rule type dropdown
  - Dynamic form fields based on type:
    - **Time restriction**: start hour slider + end hour slider (shows "7:00 AM to 10:00 PM")
    - **Daily limit**: number input
    - **Keyword block**: tag input (type word + Enter to add)
    - **AI filter**: toggle switch
    - **Topic block**: tag input (e.g. "gambling", "adult content")

### 11.6 Settings Tab
- Form for server-level settings:
  - Ollama server URL (text input + Test Connection button)
  - Default model (dropdown of available models)
  - Content filter model (dropdown)
  - Max file size (number input)
  - App name (text input)
- Save Settings button

---

## 12. FILE PROCESSING SERVICE

File: `backend/src/services/fileProcessor.ts`

```typescript
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import fs from 'fs';

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text.trim().slice(0, 50000); // max 50k chars
}

export async function processImage(filePath: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(filePath).metadata();
  // Resize if too large (max 1024px on longest side for efficiency)
  if ((meta.width || 0) > 1024 || (meta.height || 0) > 1024) {
    await sharp(filePath)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .toFile(filePath + '.resized');
    fs.renameSync(filePath + '.resized', filePath);
  }
  return { width: meta.width || 0, height: meta.height || 0 };
}

export function isTextFile(mimeType: string): boolean {
  return ['text/plain', 'text/markdown', 'text/csv', 'application/json'].includes(mimeType);
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}
```

---

## 13. WINDOWS STARTUP SCRIPT

File: `start.bat` (at project root):

```batch
@echo off
title FamilyAI Server
echo Starting FamilyAI...

:: Start Ollama (if not already running)
tasklist /FI "IMAGENAME eq ollama.exe" | find /I "ollama.exe" > nul
if errorlevel 1 (
    echo Starting Ollama...
    start /min "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    timeout /t 5 /nobreak > nul
)

:: Start FamilyAI backend
cd /d "%~dp0"
echo Starting FamilyAI backend on port 3001...
start /min "" cmd /c "cd backend && npm run start >> ..\data\backend.log 2>&1"

:: Wait for backend to be ready
timeout /t 3 /nobreak > nul

echo FamilyAI is running!
echo Backend: http://localhost:3001
echo Open your browser to http://localhost:3001
echo.
echo Press any key to stop the server...
pause > nul

:: Kill all on exit
taskkill /F /IM "node.exe" > nul 2>&1
echo Server stopped.
```

File: `backend/package.json` scripts section:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:seed": "tsx src/database/seed.ts"
  }
}
```

---

## 14. BUILD ORDER — PHASES

Build strictly in this order. Do not start a later phase until the current one works.

### PHASE 1 — Project scaffold and database (Day 1)
1. Create monorepo root `package.json` with workspaces
2. Create `backend/` with TypeScript config, all dependencies installed
3. Write `schema.sql`
4. Write `database/index.ts` (initDatabase, getDb)
5. Write `config.ts`
6. Write `seed.ts` (creates admin user)
7. Write bare `index.ts` that calls `initDatabase()` and starts Express
8. Test: `npm run dev` in backend, check DB is created, admin user exists

### PHASE 2 — Auth system (Day 1)
9. Write `routes/auth.ts` (login, logout, me, password)
10. Write `middleware/auth.ts`
11. Test: POST `/api/auth/login` with admin/admin123, get token back

### PHASE 3 — Core backend routes (Day 2)
12. Write `services/ollama.ts` (listModels, streamChat, pullModel)
13. Write `routes/models.ts`
14. Write `routes/projects.ts` (full CRUD)
15. Write `routes/chats.ts` (full CRUD + export)
16. Write `services/fileProcessor.ts`
17. Write `routes/attachments.ts`
18. Write `services/contextManager.ts`
19. Write `routes/messages.ts` (GET + POST with streaming)
20. Test with Postman: create project, create chat, send message, see stream

### PHASE 4 — Parental controls (Day 2)
21. Write `services/contentFilter.ts`
22. Write `middleware/parentalGuard.ts`
23. Write `middleware/activityLogger.ts`
24. Write `routes/users.ts` (admin: CRUD users + parental rules)
25. Write `routes/admin.ts` (stats, activity, flagged, settings)
26. Test: create teen user, add time restriction rule, verify it blocks

### PHASE 5 — Frontend scaffold (Day 3)
27. Create `frontend/` with Vite + React + TypeScript
28. Install Tailwind CSS, configure
29. Install and configure shadcn/ui
30. Create `api/client.ts` (Axios instance with JWT interceptor)
31. Create all store files (authStore, chatStore, uiStore)
32. Create `App.tsx` with routing
33. Build `LoginPage.tsx` — working login with API call

### PHASE 6 — Core chat UI (Day 3–4)
34. Build `AppShell.tsx` layout skeleton
35. Build `Sidebar.tsx` with project list and chat list (static data first)
36. Connect Sidebar to real API (React Query hooks)
37. Build `ChatWindow.tsx` skeleton
38. Build `MessageBubble.tsx` with markdown rendering
39. Build `MessageInput.tsx` with send functionality
40. Wire up `useChat.ts` hook — SSE streaming working end-to-end
41. Test: open browser, log in, create chat, send message, see streaming response

### PHASE 7 — Projects and attachments UI (Day 4)
42. Build `ProjectModal.tsx` (create/edit)
43. Build `ProjectFiles.tsx` (upload/list/delete project files)
44. Build `InstructionsEditor.tsx` (textarea with variable hints)
45. Build `AttachmentPreview.tsx`
46. Wire up file upload in `MessageInput.tsx`
47. Build `ContextBar.tsx` with token count

### PHASE 8 — Admin UI (Day 5)
48. Build `AdminPage.tsx` with tab navigation
49. Build `StatsPanel.tsx` with charts (use recharts or chart.js)
50. Build `ActivityLog.tsx` table
51. Build `FlaggedContent.tsx` review cards
52. Build `UserManager.tsx` with add/edit modals
53. Build `ParentalRules.tsx` with rule form

### PHASE 9 — Settings + polish (Day 5)
54. Build `SettingsPage.tsx` (user settings, model defaults, theme)
55. Implement dark mode (Tailwind `dark:` classes, class strategy)
56. Add proper error states and empty states throughout
57. Add loading skeletons for chat list, messages
58. Add toast notifications (shadcn Toast) for success/error actions
59. Test the full Windows startup script

---

## 15. VISUAL DESIGN GUIDELINES

**Color palette:**
- Primary: Indigo `#6366f1` (buttons, links, active states)
- Background light: `#f9fafb` (sidebar), `#ffffff` (main)
- Background dark: `#111827` (sidebar), `#1f2937` (main)
- Success: `#22c55e`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Text primary: `#111827` / `#f9fafb` dark
- Text muted: `#6b7280`

**Typography:**
- Font: System font stack (no external fonts, works offline): `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Code: `'Cascadia Code', 'Fira Code', Consolas, monospace`
- Base size: 14px
- Chat messages: 15px, line-height 1.6

**Component style:**
- Sidebar: 280px wide, subtle border-right, no shadow
- User message bubble: max-width 70%, background indigo-50, border-radius 18px 18px 4px 18px
- Assistant message: no bubble, full width left-aligned, border-left 3px solid indigo-200 on hover
- Buttons: height 36px, border-radius 8px, no all-caps
- Inputs: border-radius 8px, focus ring indigo

---

## 16. SECURITY CHECKLIST

Before considering the project complete, verify:

- [ ] All routes (except `/api/auth/login`) require a valid JWT
- [ ] Users can only read/write their own chats and projects
- [ ] Admin role is required for all `/api/admin/*` and `/api/users/*` routes
- [ ] File uploads: validate MIME type server-side (not just extension), enforce size limit
- [ ] Uploaded files served from a path the user cannot guess easily (UUID filenames)
- [ ] Parental guard middleware is applied on `POST /api/chats/:id/messages` for teen users
- [ ] Password hashed with bcrypt (cost factor >= 12)
- [ ] JWT secret is a long random string from env (never hardcoded)
- [ ] Input length limits on all text fields (content max 20,000 chars)
- [ ] Admin password changed from default `admin123` on first run

---

## 17. SAMPLE `.gitignore`

```
node_modules/
dist/
.env
data/familyai.db
data/uploads/
*.log
.DS_Store
```

---

*End of specification. Build Phase 1 first.*
