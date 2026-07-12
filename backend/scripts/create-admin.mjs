import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Password hashing (same as backend)
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password, Buffer.from(salt, 'hex'), KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return `${salt}:${hash}`;
}

// Get database path - use the root level data directory that the backend uses
const dbPath = path.resolve(__dirname, '../../data/familyai.db');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}`);
  console.error('Run the backend server first: npm start');
  process.exit(1);
}

// Initialize SQL.js and load database
const SQL = await initSqlJs();
const fileBuffer = fs.readFileSync(dbPath);
const db = new SQL.Database(fileBuffer);

// Delete any existing admin users first, then create admin user
try {
  db.run('DELETE FROM users WHERE role = "admin"');

  // Create admin user
  const userId = crypto.randomUUID();
  const username = 'admin';
  const password = 'Eva@Admin123'; // Default password
  const displayName = 'Administrator';
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);

  db.run(
    `INSERT INTO users (id, username, password_hash, display_name, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, username, passwordHash, displayName, 'admin', now, now]
  );

  db.run(
    `INSERT INTO user_settings (user_id, updated_at)
     VALUES (?, ?)`,
    [userId, now]
  );

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('\n✅ Admin account created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Admin Login Credentials');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  IMPORTANT: Change this password after your first login!\n');

  process.exit(0);
} catch (err) {
  console.error('❌ Error creating admin account:', err.message);
  process.exit(1);
}
