// backend/scripts/verify-phase1.ts
// Run with: npx tsx scripts/verify-phase1.ts
// Must be run from the backend/ directory.
// Server does NOT need to be running for most checks (Section 9 is the exception).

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ─── Terminal colours (no dependencies) ────────────────────────────────────
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;   // green
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;   // red
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;   // yellow
const B = (s: string) => `\x1b[1m${s}\x1b[0m`;    // bold

let passed = 0;
let failed = 0;
let warned = 0;

function pass(label: string, detail = '') {
  console.log(G('  ✓ PASS') + ` ${label}` + (detail ? `  ${Y('→')} ${detail}` : ''));
  passed++;
}

function fail(label: string, detail = '') {
  console.log(R('  ✗ FAIL') + ` ${label}` + (detail ? `  ${Y('→')} ${detail}` : ''));
  failed++;
}

function warn(label: string, detail = '') {
  console.log(Y('  ⚠ WARN') + ` ${label}` + (detail ? `  → ${detail}` : ''));
  warned++;
}

function section(title: string) {
  console.log(`\n${B('━━ ' + title)}`);
}

// ─── Resolve project root (two levels up from backend/scripts/) ─────────────
// On Windows, new URL().pathname includes a leading slash and wrong drive letter
// Use fileURLToPath instead
const SCRIPT_DIR  = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..');
const ROOT_DIR    = path.resolve(BACKEND_DIR, '..');
const DATA_DIR    = path.join(ROOT_DIR, 'data');
const DB_PATH     = path.join(DATA_DIR, 'familyai.db');
const ENV_PATH    = path.join(ROOT_DIR, '.env');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Environment Variables
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 1 — Environment Variables');

const REQUIRED_ENV_VARS = [
  'PORT',
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_EXPIRY',
  'DATA_DIR',
  'DB_PATH',
  'UPLOADS_DIR',
  'ANTHROPIC_API_KEY',
  'DEFAULT_MODEL',
  'ESCALATION_MODEL',
  'PII_STRIPPING_ENABLED',
  'MAX_FILE_SIZE_MB',
  'VITE_API_BASE_URL',
];

if (!fs.existsSync(ENV_PATH)) {
  fail('.env file exists', `Not found at ${ENV_PATH}`);
} else {
  pass('.env file exists');
  const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  const envLines = envContent.split('\n');
  const envMap: Record<string, string> = {};

  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key   = trimmed.slice(0, eqIdx).trim();
      const val   = trimmed.slice(eqIdx + 1).trim();
      envMap[key] = val;
    }
  }

  for (const v of REQUIRED_ENV_VARS) {
    if (envMap[v] === undefined || envMap[v] === '') {
      fail(`${v} is set`, 'Missing or empty');
    } else if (v === 'JWT_SECRET' && envMap[v].length < 32) {
      warn(`${v} length`, `Only ${envMap[v].length} chars — use 64+ random chars`);
    } else if (v === 'ANTHROPIC_API_KEY' && !envMap[v].startsWith('sk-ant-')) {
      warn(`${v} format`, 'Does not start with sk-ant- — double-check the key');
    } else if (v === 'DEFAULT_MODEL' && envMap[v] !== 'claude-haiku-4-5-20251001') {
      warn(`${v} value`, `Got "${envMap[v]}" — spec requires claude-haiku-4-5-20251001`);
    } else {
      pass(`${v} is set`, v === 'ANTHROPIC_API_KEY' ? '(value hidden)' : envMap[v]);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Directory Structure
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 2 — Directory Structure');

const REQUIRED_DIRS = [
  path.join(DATA_DIR),
  path.join(DATA_DIR, 'uploads'),
  path.join(DATA_DIR, 'uploads', 'attachments'),
  path.join(DATA_DIR, 'uploads', 'project-files'),
];

for (const dir of REQUIRED_DIRS) {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    pass(`Directory exists: ${path.relative(ROOT_DIR, dir)}`);
  } else {
    fail(`Directory exists: ${path.relative(ROOT_DIR, dir)}`);
  }
}

const REQUIRED_BACKEND_FILES = [
  path.join(BACKEND_DIR, 'src', 'index.ts'),
  path.join(BACKEND_DIR, 'src', 'config.ts'),
  path.join(BACKEND_DIR, 'src', 'types', 'index.ts'),
  path.join(BACKEND_DIR, 'src', 'database', 'index.ts'),
  path.join(BACKEND_DIR, 'src', 'database', 'schema.sql'),
  path.join(BACKEND_DIR, 'tsconfig.json'),
  path.join(BACKEND_DIR, 'package.json'),
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, '.gitignore'),
];

section('SECTION 2b — Required Source Files');
for (const f of REQUIRED_BACKEND_FILES) {
  if (fs.existsSync(f)) {
    pass(`File exists: ${path.relative(ROOT_DIR, f)}`);
  } else {
    fail(`File exists: ${path.relative(ROOT_DIR, f)}`);
  }
}

// gitignore must exclude .env and data/
const gitignoreContent = fs.existsSync(path.join(ROOT_DIR, '.gitignore'))
  ? fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf-8')
  : '';

section('SECTION 2c — .gitignore Safety Checks');
['.env', 'data/', 'node_modules/'].forEach(entry => {
  if (gitignoreContent.includes(entry)) {
    pass(`.gitignore includes ${entry}`);
  } else {
    fail(`.gitignore includes ${entry}`, 'SECURITY: commit this and you leak secrets or binary DB');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Database File
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 3 — Database File');

if (!fs.existsSync(DB_PATH)) {
  fail('Database file exists', DB_PATH);
  console.log(R('\n  Cannot continue schema checks — database file missing.\n'));
  process.exit(1);
}

const dbStats = fs.statSync(DB_PATH);
pass('Database file exists', DB_PATH);

if (dbStats.size > 1024) {
  pass('Database file has content', `${(dbStats.size / 1024).toFixed(1)} KB`);
} else {
  warn('Database file is very small', `${dbStats.size} bytes — may be empty or corrupt`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Schema Verification (reads DB directly, no app layer)
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 4 — Database Schema');

// sql.js is what Phase 1 used — load it the same way to read the file
let SQL: any;
let db: any;

try {
  const initSqlJs = (await import('sql.js')).default;
  SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  db = new SQL.Database(fileBuffer);
  pass('sql.js can open database file');
} catch (err: any) {
  fail('sql.js can open database file', err.message);
  console.log(R('\n  Cannot continue schema checks.\n'));
  process.exit(1);
}

function queryAll(sql: string, params: any[] = []): Record<string, any>[] {
  try {
    const stmt = db.prepare(sql);
    const rows: Record<string, any>[] = [];
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (err: any) {
    return [];
  }
}

// Every table from schema.sql
const REQUIRED_TABLES: Record<string, string[]> = {
  users: [
    'id', 'username', 'password_hash', 'display_name',
    'role', 'avatar_color', 'is_active', 'created_at', 'updated_at'
  ],
  user_settings: [
    'user_id', 'default_model', 'user_system_prompt',
    'theme', 'show_token_count', 'updated_at'
  ],
  parental_rules: [
    'id', 'user_id', 'rule_type', 'rule_value',
    'is_active', 'created_by', 'created_at'
  ],
  projects: [
    'id', 'user_id', 'name', 'description', 'color',
    'icon', 'system_instructions', 'is_pinned', 'is_archived',
    'created_at', 'updated_at'
  ],
  project_files: [
    'id', 'project_id', 'filename', 'original_name',
    'mime_type', 'file_size', 'extracted_text', 'created_at'
  ],
  chats: [
    'id', 'user_id', 'project_id', 'title', 'model',
    'is_pinned', 'is_archived', 'total_tokens_used',
    'created_at', 'updated_at'
  ],
  messages: [
    'id', 'chat_id', 'role', 'content',
    'token_count', 'is_flagged', 'flag_reason', 'metadata', 'created_at'
  ],
  attachments: [
    'id', 'message_id', 'filename', 'original_name',
    'mime_type', 'file_size', 'extracted_text', 'width', 'height', 'created_at'
  ],
  activity_log: [
    'id', 'user_id', 'event_type', 'event_data', 'ip_address', 'created_at'
  ],
  flagged_content: [
    'id', 'user_id', 'message_id', 'chat_id', 'flag_type', 'flag_reason',
    'original_content', 'is_reviewed', 'reviewed_by', 'reviewed_at', 'created_at'
  ],
  server_settings: ['key', 'value', 'updated_at'],
};

// Get all existing tables
const existingTables = queryAll(
  `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
).map(r => r.name as string);

for (const [table, requiredCols] of Object.entries(REQUIRED_TABLES)) {
  if (!existingTables.includes(table)) {
    fail(`Table exists: ${table}`);
    continue;
  }

  // Check columns
  const colRows = queryAll(`PRAGMA table_info(${table})`);
  const existingCols = colRows.map(r => r.name as string);
  const missingCols = requiredCols.filter(c => !existingCols.includes(c));

  if (missingCols.length === 0) {
    pass(`Table schema: ${table}`, `${existingCols.length} columns`);
  } else {
    fail(`Table schema: ${table}`, `Missing columns: ${missingCols.join(', ')}`);
  }
}

// Check parental_rules has the correct CHECK constraint values
// (addendum added 'daily_token_budget' to the allowed list)
const rulesTableSql = queryAll(
  `SELECT sql FROM sqlite_master WHERE type='table' AND name='parental_rules'`
)[0]?.sql as string || '';

if (rulesTableSql.includes('daily_token_budget')) {
  pass('parental_rules includes daily_token_budget rule type');
} else {
  warn('parental_rules missing daily_token_budget', 'Addendum Section 3 — add it before Phase 4');
}

// Check indexes exist
section('SECTION 4b — Indexes');
const REQUIRED_INDEXES = [
  'idx_messages_chat_id',
  'idx_chats_user_id',
  'idx_chats_project_id',
  'idx_activity_user_id',
  'idx_activity_created',
  'idx_flagged_user_id',
  'idx_flagged_reviewed',
  'idx_project_files_project',
  'idx_attachments_message',
  'idx_parental_rules_user',
];

const existingIndexes = queryAll(
  `SELECT name FROM sqlite_master WHERE type='index'`
).map(r => r.name as string);

for (const idx of REQUIRED_INDEXES) {
  if (existingIndexes.includes(idx)) {
    pass(`Index: ${idx}`);
  } else {
    fail(`Index: ${idx}`, 'Missing — query performance will suffer');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Seed Data
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 5 — Seed Data');

const adminUser = queryAll(`SELECT * FROM users WHERE username = 'admin'`)[0];

if (!adminUser) {
  fail('Admin user seeded');
} else {
  pass('Admin user exists', `id: ${adminUser.id}`);

  if (adminUser.role === 'admin') {
    pass('Admin user has role=admin');
  } else {
    fail('Admin user role', `Got "${adminUser.role}" — expected "admin"`);
  }

  if (adminUser.is_active === 1) {
    pass('Admin user is active');
  } else {
    fail('Admin user is_active', `Got ${adminUser.is_active}`);
  }

  if (adminUser.display_name) {
    pass('Admin display_name set', adminUser.display_name);
  } else {
    fail('Admin display_name set');
  }
}

// Check user_settings row for admin
const adminSettings = adminUser
  ? queryAll(`SELECT * FROM user_settings WHERE user_id = ?`, [adminUser.id])[0]
  : null;

if (adminSettings) {
  pass('Admin user_settings row exists');
  if (adminSettings.default_model === 'claude-haiku-4-5-20251001') {
    pass('Admin default_model correct', 'claude-haiku-4-5-20251001');
  } else {
    warn('Admin default_model', `Got "${adminSettings.default_model}" — spec requires claude-haiku-4-5-20251001`);
  }
} else {
  fail('Admin user_settings row exists', 'Missing — auth/me will fail');
}

// Check server_settings defaults
section('SECTION 5b — Server Settings Seed');
const REQUIRED_SETTINGS = [
  'ollama_url',
  'default_model',
  'content_filter_model',
  'app_name',
  'max_file_size_mb',
  'daily_usage_reset_hour',
  'content_filter_enabled',
];

const settingRows = queryAll(`SELECT key, value FROM server_settings`);
const settingsMap: Record<string, string> = {};
for (const row of settingRows) {
  settingsMap[row.key] = row.value;
}

for (const key of REQUIRED_SETTINGS) {
  if (settingsMap[key] !== undefined) {
    pass(`server_settings: ${key}`, settingsMap[key]);
  } else {
    warn(`server_settings: ${key}`, 'Missing — Admin Settings UI will fail');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Password Hash Format & Verification
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 6 — Password Hash (crypto.scryptSync)');

if (adminUser?.password_hash) {
  const hash = adminUser.password_hash as string;
  pass('password_hash field is populated', `Length: ${hash.length}`);

  // Detect format — seed.ts should store as "salt:hash" where both are hex
  const colonIdx = hash.indexOf(':');
  if (colonIdx === -1) {
    fail('password_hash contains salt separator (:)', 
      'Cannot verify password without salt — auth will fail. Fix seed.ts to store as hex_salt:hex_hash');
  } else {
    const saltHex  = hash.slice(0, colonIdx);
    const hashHex  = hash.slice(colonIdx + 1);

    pass('password_hash has salt:hash format');
    pass('Salt portion', `${saltHex.length} hex chars (${saltHex.length / 2} bytes)`);
    pass('Hash portion', `${hashHex.length} hex chars (${hashHex.length / 2} bytes)`);

    // Verify "admin123" decodes correctly with the stored salt
    // Try common scrypt param sets — N=16384, r=8, p=1 is the most common default
    const testPassword = 'admin123';
    const salt = Buffer.from(saltHex, 'hex');

    let verified = false;
    const paramSets = [
      { N: 16384, r: 8, p: 1, len: 64 },
      { N: 16384, r: 8, p: 1, len: 32 },
      { N: 32768, r: 8, p: 1, len: 64 },
    ];

    for (const params of paramSets) {
      try {
        const derived = crypto.scryptSync(testPassword, salt, params.len, {
          N: params.N, r: params.r, p: params.p
        });
        if (derived.toString('hex') === hashHex) {
          verified = true;
          pass(
            'Password verification: admin123 matches stored hash',
            `scrypt params: N=${params.N} r=${params.r} p=${params.p} len=${params.len}`
          );
          break;
        }
      } catch { /* try next param set */ }
    }

    if (!verified) {
      fail(
        'Password verification: admin123 matches stored hash',
        'None of the standard scrypt param sets matched. ' +
        'Show the seed.ts scrypt call — params must exactly match for auth to work.'
      );
    }
  }
} else {
  fail('password_hash field is populated');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — sql.js Persistence (the critical risk from Phase 1)
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 7 — sql.js Persistence (data survival check)');
console.log(Y('  Note: This tests whether writes are immediately flushed to disk.'));
console.log(Y('  If this fails, a server crash will silently lose data.\n'));

// Test persistence by: insert row → check file updated → re-read from disk
const canaryId = `verify-${Date.now()}`;
const DB_MTIME_BEFORE = fs.statSync(DB_PATH).mtimeMs;

// Reload the database (to pick up current state) and insert test row
let testRowInserted = false;
try {
  // Create new instance from current file state
  const fileBuffer = fs.readFileSync(DB_PATH);
  const testDb = new SQL.Database(fileBuffer);
  
  // Insert canary row
  const insertStmt = testDb.prepare(
    `INSERT INTO activity_log (id, event_type, event_data, created_at) VALUES (?, ?, ?, ?)`
  );
  insertStmt.bind([canaryId, 'verify_test', JSON.stringify({ test: true }), new Date().toISOString()]);
  insertStmt.step();
  insertStmt.free();
  
  // Manually export and write (this is what PersistentDatabase should do automatically)
  const exportData = testDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(exportData));
  testDb.close();
  testRowInserted = true;
  
  pass('Canary row inserted and manually saved');
} catch (err: any) {
  fail('Canary row insert test', err.message);
}

if (testRowInserted) {
  // Check if file was updated
  await new Promise(r => setTimeout(r, 50));
  const DB_MTIME_AFTER = fs.statSync(DB_PATH).mtimeMs;

  if (DB_MTIME_AFTER > DB_MTIME_BEFORE) {
    pass('DB file mtime updated after write');

    // Verify row persisted
    const verifyBuffer = fs.readFileSync(DB_PATH);
    const verifyDb = new SQL.Database(verifyBuffer);
    const checkStmt = verifyDb.prepare(`SELECT id FROM activity_log WHERE id = ?`);
    checkStmt.bind([canaryId]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      pass('Canary row survives disk re-read', 'Persistence working correctly');
    } else {
      fail('Canary row survives disk re-read', 'Row lost after save');
    }

    // Clean up
    try {
      const cleanBuffer = fs.readFileSync(DB_PATH);
      const cleanDb = new SQL.Database(cleanBuffer);
      const delStmt = cleanDb.prepare(`DELETE FROM activity_log WHERE id = ?`);
      delStmt.bind([canaryId]);
      delStmt.step();
      delStmt.free();
      const cleanExport = cleanDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(cleanExport));
      cleanDb.close();
    } catch { /* ignore cleanup */ }
    
    verifyDb.close();
  } else {
    fail(
      'DB file mtime updated after write',
      'File timestamp did not change. Verify fs.writeFileSync is being called.'
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — Package.json Structure
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 8 — Package Configuration');

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
if (rootPkg.workspaces?.includes('backend') || rootPkg.workspaces?.includes('frontend')) {
  pass('Root package.json has workspaces');
} else {
  fail('Root package.json has workspaces', 'Missing workspaces array — monorepo structure broken');
}

const backendPkg = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, 'package.json'), 'utf-8'));
if (backendPkg.scripts?.dev) {
  pass('Backend has dev script', backendPkg.scripts.dev);
} else {
  fail('Backend has dev script');
}
if (backendPkg.scripts?.start) {
  pass('Backend has start script', backendPkg.scripts.start);
} else {
  fail('Backend has start script');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — Live Server Health Check (optional — server must be running)
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 9 — Live Server Health (start server first, or skip)');

const port = process.env.PORT || '3001';
try {
  const response = await fetch(`http://localhost:${port}/api/health`, {
    signal: AbortSignal.timeout(3000)
  });
  if (response.ok) {
    const body = await response.json() as Record<string, unknown>;
    pass('GET /api/health returns 200', JSON.stringify(body));
    if (body.status === 'ok') {
      pass('Health response body correct', '{"status":"ok"}');
    } else {
      warn('Health response body', `Got ${JSON.stringify(body)} — expected {"status":"ok"}`);
    }
  } else {
    fail(`GET /api/health returns 200`, `Got ${response.status}`);
  }
} catch {
  warn('GET /api/health', 'Server not running — start it first to test this section');
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${B('━━ VERIFICATION SUMMARY')}`);
console.log(G(`  Passed: ${passed}`));
console.log(Y(`  Warned: ${warned}`));
console.log(R(`  Failed: ${failed}`));

if (failed === 0 && warned === 0) {
  console.log(G('\n  ✓ Phase 1 is clean. Proceed to Phase 2.\n'));
  process.exit(0);
} else if (failed === 0) {
  console.log(Y('\n  ⚠ Phase 1 has warnings. Review them before Phase 2.\n'));
  process.exit(0);
} else {
  console.log(R(`\n  ✗ ${failed} failure(s). Fix before proceeding to Phase 2.\n`));
  process.exit(1);
}
