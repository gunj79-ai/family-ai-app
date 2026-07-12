import fs from 'fs';
import path from 'path';
import { getDb } from '../database/index.js';
import { config } from '../config.js';

const BACKUP_DIR = path.join(config.DATA_DIR, 'backups');
const MAX_BACKUPS = 7; // keep 7 days of backups

export function runBackup(): void {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const db = getDb();
    const data = db.export();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `familyai-${timestamp}.db`);

    fs.writeFileSync(backupPath, Buffer.from(data));
    console.log(
      `[Backup] Created: ${backupPath} (${(data.length / 1024).toFixed(1)} KB)`
    );

    // Prune old backups — keep MAX_BACKUPS most recent
    const existing = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime());

    for (const old of existing.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, old.name));
      console.log(`[Backup] Pruned: ${old.name}`);
    }
  } catch (err) {
    console.error('[Backup] Failed:', err);
    // Never throw — backup failure should not crash the server
  }
}
