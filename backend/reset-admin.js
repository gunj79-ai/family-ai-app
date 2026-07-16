import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/familyai.db');

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${hash}`;
}

async function resetAdmin() {
  const SQL = await initSqlJs();
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found at:', dbPath);
    process.exit(1);
  }
  
  const filebuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(filebuffer);
  
  // Check if admin exists
  const stmt = db.prepare('SELECT id, username FROM users WHERE username = ?');
  stmt.bind(['admin']);
  const adminExists = stmt.step();
  stmt.free();
  
  const newPassword = 'admin123';
  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();
  
  if (adminExists) {
    // Update existing admin
    const updateStmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?');
    updateStmt.bind([passwordHash, now, 'admin']);
    updateStmt.step();
    updateStmt.free();
    console.log('✓ Admin password reset to: admin123');
  } else {
    // Create new admin
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    
    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, role, age, avatar_color, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    insertStmt.bind([id, 'admin', passwordHash, 'Administrator', 'admin', null, '#ef4444', now, now]);
    insertStmt.step();
    insertStmt.free();
    
    const settingsStmt = db.prepare(`
      INSERT INTO user_settings (user_id, default_model, user_system_prompt, theme, show_token_count, updated_at)
      VALUES (?, ?, '', 'light', 1, ?)
    `);
    settingsStmt.bind([id, 'claude-haiku-4-5-20251001', now]);
    settingsStmt.step();
    settingsStmt.free();
    
    console.log('✓ Admin user created');
  }
  
  // List all users
  console.log('\nCurrent users:');
  const usersStmt = db.prepare('SELECT username, display_name, role, is_active FROM users');
  while (usersStmt.step()) {
    const row = usersStmt.getAsObject();
    console.log(`  - ${row.username} (${row.display_name}) - Role: ${row.role}, Active: ${row.is_active}`);
  }
  usersStmt.free();
  
  // Save changes
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();
  
  console.log('\n✓ Database updated successfully');
  console.log('  Username: admin');
  console.log('  Password: admin123');
}

resetAdmin().catch(console.error);
