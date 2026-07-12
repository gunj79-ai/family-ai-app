import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/index.js';
import { config } from '../config.js';

export const attachmentsRouter = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(config.UPLOADS_DIR, 'attachments')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (config.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /api/attachments/upload — upload before sending message
attachmentsRouter.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file or unsupported type' });
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  let extractedText: string | null = null;
  let width: number | null = null;
  let height: number | null = null;

  if (req.file.mimetype === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buf = fs.readFileSync(req.file.path);
      const result = await pdfParse(buf);
      extractedText = result.text.trim().slice(0, 50000);
    } catch { /* skip — store without text */ }
  } else if (req.file.mimetype.startsWith('text/')) {
    extractedText = fs.readFileSync(req.file.path, 'utf-8').slice(0, 50000);
  } else if (req.file.mimetype.startsWith('image/')) {
    try {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(req.file.path).metadata();
      width = meta.width || null;
      height = meta.height || null;
    } catch { /* skip */ }
  }

  db.prepare(`
    INSERT INTO attachments
      (id, message_id, filename, original_name, mime_type, file_size,
       extracted_text, width, height, created_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.file.filename, req.file.originalname,
    req.file.mimetype, req.file.size,
    extractedText, width, height, now
  );

  res.json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(id));
});

// GET /api/attachments/:id — serve file
attachmentsRouter.get('/:id', (req, res) => {
  const db = getDb();
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as { filename: string; original_name: string; mime_type: string } | undefined;
  if (!att) return res.status(404).json({ error: 'Not found' });

  // Verify filename contains no path separators
  if (
    att.filename.includes('..') ||
    att.filename.includes('/') ||
    att.filename.includes('\\')
  ) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  res.setHeader('Content-Disposition', `inline; filename="${att.original_name}"`);
  res.sendFile(path.join(config.UPLOADS_DIR, 'attachments', att.filename));
});

// DELETE /api/attachments/:id
attachmentsRouter.delete('/:id', (req, res) => {
  const db = getDb();
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as { filename: string } | undefined;
  if (!att) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(path.join(config.UPLOADS_DIR, 'attachments', att.filename)); } catch {}
  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
