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
  age           INTEGER,
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
  default_model      TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
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
                  'daily_token_budget',
                  'keyword_block',
                  'topic_block',
                  'model_restriction',
                  'ai_content_filter'
               )),
  -- JSON payload per rule_type:
  -- time_restriction:      {"start_hour": 7, "end_hour": 22}
  -- daily_message_limit:   {"limit": 100}
  -- daily_token_budget:    {"limit": 50000}
  -- keyword_block:         {"keywords": ["word1", "word2"]}
  -- topic_block:           {"topics": ["topic1", "topic2"]}
  -- model_restriction:     {"allowed_models": ["model1"]}
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
  extracted_text  TEXT,                   -- extracted text (PDFs, txt, images)
  width           INTEGER,                 -- for images
  height          INTEGER,                 -- for images
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
  -- metadata JSON: {"model": "claude-haiku-4-5-20251001", "generation_ms": 3200, "finish_reason": "stop"}
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

-- Default settings inserted by seed:
-- anthropic_api_key         = "[loaded from env]"
-- default_model             = "claude-haiku-4-5-20251001"
-- escalation_model          = "claude-sonnet-4-6"
-- app_name                  = "FamilyAI"
-- max_file_size_mb          = "10"
-- daily_usage_reset_hour    = "0"   (midnight)
-- pii_stripping_enabled     = "true"
-- haiku_input_price_per_mtok = "1.00"
-- haiku_output_price_per_mtok = "5.00"
-- sonnet_input_price_per_mtok = "3.00"
-- sonnet_output_price_per_mtok = "15.00"

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
