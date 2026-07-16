import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: SqlJsDatabase;
let SQL: Awaited<ReturnType<typeof initSqlJs>>;
const dbPath = config.DB_PATH; // Already resolved in config.ts

/**
 * Wrapper around sql.js Database to provide a similar API to better-sqlite3
 * with automatic file persistence
 */
class PersistentDatabase {
  constructor(private sqlDb: SqlJsDatabase) {}

  prepare(sql: string) {
    const dbRef = this.sqlDb;
    return {
      run: (...params: unknown[]) => {
        const stmt = dbRef.prepare(sql);
        stmt.bind(params as any[]);
        stmt.step();
        const changes = dbRef.getRowsModified();
        stmt.free();
        this.saveToFile();
        return { changes };
      },
      get: (...params: unknown[]) => {
        const stmt = dbRef.prepare(sql);
        stmt.bind(params as any[]);
        const result = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return result;
      },
      all: (...params: unknown[]) => {
        const stmt = dbRef.prepare(sql);
        stmt.bind(params as any[]);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  }

  exec(sql: string) {
    try {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        const prepared = this.sqlDb.prepare(stmt);
        while (prepared.step()) {
          // Execute
        }
        prepared.free();
      }
      this.saveToFile();
    } catch (err) {
      console.error('Error executing SQL:', err);
      throw err;
    }
  }

  pragma(pragma: string) {
    const stmt = this.sqlDb.prepare(`PRAGMA ${pragma}`);
    while (stmt.step()) {
      // Execute
    }
    stmt.free();
  }

  export(): Uint8Array {
    return this.sqlDb.export();
  }

  private saveToFile() {
    try {
      const data = this.sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }
}

export function getDb(): PersistentDatabase {
  if (!db) throw new Error('Database not initialized');
  return db as any; // Type assertion for convenience
}

export async function initDatabase(): Promise<void> {
  console.log('[DB] Initializing database...');
  console.log('[DB] DATA_DIR:', config.DATA_DIR);
  console.log('[DB] DB_PATH:', config.DB_PATH);
  console.log('[DB] UPLOADS_DIR:', config.UPLOADS_DIR);

  // Initialize sql.js
  SQL = await initSqlJs();

  // Ensure data directory exists (paths already resolved in config)
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(config.UPLOADS_DIR, 'attachments'), { recursive: true });
  fs.mkdirSync(path.join(config.UPLOADS_DIR, 'project-files'), { recursive: true });

  // Load or create database
  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(filebuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new PersistentDatabase(sqlDb) as any;

  // Run schema
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  // Fallback for development
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/database/schema.sql');
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Run migrations for existing databases
  runMigrations();

  // Seed default data if needed
  await seedDefaults();

  console.log(`✓ Database initialized at ${dbPath}`);
}

export function verifyPassword(password: string, hash: string): boolean {
  const [saltHex, hashHex] = hash.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expectedHash = Buffer.from(hashHex, 'hex');
  const computed = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return computed.equals(expectedHash);
}

/**
 * Run database migrations for schema updates
 */
function runMigrations(): void {
  const dbInstance = getDb();
  
  try {
    // Add age column to users table if it doesn't exist
    const tableInfo = dbInstance.prepare('PRAGMA table_info(users)').all() as any[];
    const hasAgeColumn = tableInfo.some(col => col.name === 'age');
    
    if (!hasAgeColumn) {
      dbInstance.prepare('ALTER TABLE users ADD COLUMN age INTEGER').run();
      console.log('✓ Migration: Added age column to users table');
    }
  } catch (err) {
    console.error('Migration error:', err);
    // Continue even if migration fails - column might already exist
  }
}

async function seedDefaults(): Promise<void> {
  const dbInstance = getDb();

  // Check if any users exist already
  const userCountResult = dbInstance.prepare('SELECT COUNT(*) as c FROM users').get();
  const userCount = (userCountResult as { c: number })?.c || 0;

  // Default server settings
  const defaultSettings: Record<string, string> = {
    anthropic_api_key: config.ANTHROPIC_API_KEY,
    default_model: config.DEFAULT_MODEL,
    escalation_model: config.ESCALATION_MODEL,
    app_name: 'FamilyAI',
    app_tagline: 'Your private family AI assistant',
    primary_color: '#6366f1',
    setup_complete: userCount > 0 ? 'true' : 'false',
    headroom_enabled: 'true',
    max_file_size_mb: config.MAX_FILE_SIZE_MB.toString(),
    daily_usage_reset_hour: '0',
    pii_stripping_enabled: config.PII_STRIPPING_ENABLED.toString(),
    haiku_input_price_per_mtok: '1.00',
    haiku_output_price_per_mtok: '5.00',
    sonnet_input_price_per_mtok: '3.00',
    sonnet_output_price_per_mtok: '15.00',
  };

  const insertSetting = dbInstance.prepare(
    `INSERT OR IGNORE INTO server_settings (key, value, updated_at) VALUES (?, ?, ?)`
  );

  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value, new Date().toISOString());
  }

  // Create default admin if no users exist
  if (userCount === 0) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const hash = hashPassword('admin123');

    dbInstance.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, role, age, avatar_color, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, 'admin', hash, 'Administrator', 'admin', null, '#ef4444', now, now);

    dbInstance.prepare(`
      INSERT INTO user_settings (user_id, default_model, user_system_prompt, theme, show_token_count, updated_at)
      VALUES (?, ?, '', 'light', 1, ?)
    `).run(id, config.DEFAULT_MODEL, now);

    console.log('✓ Default admin created');
    console.log('  ⚠️  Username: admin');
    console.log('  ⚠️  Password: admin123');
    console.log('  ⚠️  CHANGE THIS IMMEDIATELY after first login!');
  }
}
