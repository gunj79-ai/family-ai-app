import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { getDb } from '../database/index.js';
import { Project, ProjectFile } from '../types/index.js';

const router = Router();

/**
 * Data isolation helper:
 * Admin can query other users' projects via ?userId=X
 * Regular users only see their own projects
 */
function getTargetUserId(req: Request): string {
  const admin = req.user?.role === 'admin';
  const queryUserId = req.query.userId as string | undefined;
  return (admin && queryUserId) ? queryUserId : req.user!.id;
}

/**
 * Ownership check for single-resource routes
 * Returns true if user owns the resource or is admin
 */
function checkOwnership(project: any, req: Request): boolean {
  return project.user_id === req.user!.id || req.user!.role === 'admin';
}

/**
 * Helper to get project with file/chat counts
 */
function projectWithCounts(db: any, projectId: string): Project | null {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
  if (!project) return null;

  const fileCount = (db.prepare('SELECT COUNT(*) as c FROM project_files WHERE project_id = ?').get(projectId) as any)?.c || 0;
  const chatCount = (db.prepare('SELECT COUNT(*) as c FROM chats WHERE project_id = ?').get(projectId) as any)?.c || 0;

  return {
    id: project.id,
    userId: project.user_id,
    name: project.name,
    description: project.description,
    color: project.color,
    icon: project.icon,
    systemInstructions: project.system_instructions,
    isPinned: project.is_pinned === 1,
    isArchived: project.is_archived === 1,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    fileCount,
    chatCount,
  };
}

/**
 * GET /api/projects
 * List projects for user (or other user if admin with ?userId=X)
 * Query params: ?archived=false (default), ?limit=50, ?offset=0
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const targetUserId = getTargetUserId(req);
    const archived = req.query.archived === 'true' ? 1 : 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const projects = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM project_files f WHERE f.project_id = p.id) as file_count,
        (SELECT COUNT(*) FROM chats c WHERE c.project_id = p.id) as chat_count
      FROM projects p
      WHERE p.user_id = ? AND p.is_archived = ?
      ORDER BY p.is_pinned DESC, p.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(targetUserId, archived, limit, offset) as any[];

    const result = projects.map(p => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      description: p.description,
      color: p.color,
      icon: p.icon,
      systemInstructions: p.system_instructions,
      isPinned: p.is_pinned === 1,
      isArchived: p.is_archived === 1,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      fileCount: p.file_count,
      chatCount: p.chat_count,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 * Body: { name, description?, color?, icon?, systemInstructions? }
 */
router.post('/', (req: Request, res: Response): void => {
  const { name, description, color, icon, systemInstructions } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  if (name.length > 100) {
    res.status(400).json({ error: 'Project name max 100 chars' });
    return;
  }

  try {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (
        id, user_id, name, description, color, icon, system_instructions,
        is_pinned, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      id,
      req.user!.id,
      name,
      description || '',
      color || '#3b82f6',
      icon || '📁',
      systemInstructions || '',
      now,
      now
    );

    const project = projectWithCounts(db, id);
    res.status(201).json(project);
  } catch (err: any) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/projects/:id
 * Get single project with counts
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(project, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = projectWithCounts(db, id);
    res.json(result);
  } catch (err: any) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 * Allowed fields: name, description, color, icon, system_instructions, is_pinned, is_archived
 */
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(project, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const allowedFields: Record<string, string> = {
      name: 'name',
      description: 'description',
      color: 'color',
      icon: 'icon',
      systemInstructions: 'system_instructions',
      isPinned: 'is_pinned',
      isArchived: 'is_archived',
    };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    const updateParams: any[] = [];

    for (const [bodyKey, dbKey] of Object.entries(allowedFields)) {
      if (bodyKey in req.body) {
        const value = req.body[bodyKey];
        if (dbKey.startsWith('is_')) {
          updates[dbKey] = value ? 1 : 0;
        } else {
          updates[dbKey] = value;
        }
      }
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    values.push(id);

    db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const result = projectWithCounts(db, id);
    res.json(result);
  } catch (err: any) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project (cascades to project_files via FK)
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(project, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Delete associated files from disk
    const files = db.prepare('SELECT filename FROM project_files WHERE project_id = ?').all(id) as any[];
    for (const file of files) {
      const filePath = path.join(config.UPLOADS_DIR, 'project-files', file.filename);
      try {
        fs.unlinkSync(filePath);
      } catch { /* ignore if file doesn't exist */ }
    }

    // Set project_id = NULL for chats (ON DELETE SET NULL)
    db.prepare('UPDATE chats SET project_id = NULL WHERE project_id = ?').run(id);

    // Delete project
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/projects/:id/files
 * List project files
 */
router.get('/:id/files', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const id = req.params.id;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(project, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const files = db.prepare(`
      SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC
    `).all(id) as any[];

    const result = files.map(f => ({
      id: f.id,
      projectId: f.project_id,
      filename: f.filename,
      originalName: f.original_name,
      mimeType: f.mime_type,
      fileSize: f.file_size,
      extractedText: f.extracted_text,
      width: f.width,
      height: f.height,
      createdAt: f.created_at,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Get project files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Multer configuration for file uploads
 */
const uploadDir = path.join(config.UPLOADS_DIR, 'project-files');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

/**
 * POST /api/projects/:id/files
 * Upload file to project
 */
router.post('/:id/files', (req: Request, res: Response, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(400).json({ error: err.message || 'File upload failed' });
      return;
    }
    next();
  });
}, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const projectId = req.params.id;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(project, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileId = uuidv4();
    const ext = path.extname(req.file.originalname);
    const newFilename = `${fileId}${ext}`;
    const oldPath = req.file.path;
    const newPath = path.join(uploadDir, newFilename);

    // Rename file
    fs.renameSync(oldPath, newPath);

    let extractedText: string | null = null;

    // Extract text from PDF
    if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfBuffer = fs.readFileSync(newPath);
        const pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text.slice(0, 50000);
      } catch { /* PDF parsing failed, skip */ }
    }
    // Extract text from text/markdown
    else if (req.file.mimetype === 'text/plain' || req.file.mimetype === 'text/markdown') {
      try {
        extractedText = fs.readFileSync(newPath, 'utf-8').slice(0, 50000);
      } catch { /* Read failed */ }
    }

    // Insert into database
    db.prepare(`
      INSERT INTO project_files (
        id, project_id, filename, original_name, mime_type, file_size,
        extracted_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fileId,
      projectId,
      newFilename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      extractedText,
      new Date().toISOString()
    );

    const file = db.prepare('SELECT * FROM project_files WHERE id = ?').get(fileId) as any;
    const result: ProjectFile = {
      id: file.id,
      projectId: file.project_id,
      filename: file.filename,
      originalName: file.original_name,
      mimeType: file.mime_type,
      fileSize: file.file_size,
      extractedText: file.extracted_text,
      width: file.width,
      height: file.height,
      createdAt: file.created_at,
    };

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Upload file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:id/files/:fileId
 * Delete file from project
 */
router.delete('/:id/files/:fileId', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const projectId = req.params.id;
    const fileId = req.params.fileId;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    if (!project) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (!checkOwnership(project, req)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const file = db.prepare('SELECT * FROM project_files WHERE id = ? AND project_id = ?').get(fileId, projectId) as any;
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Delete from disk
    const filePath = path.join(config.UPLOADS_DIR, 'project-files', file.filename);
    try {
      fs.unlinkSync(filePath);
    } catch { /* ignore if doesn't exist */ }

    // Delete from database
    db.prepare('DELETE FROM project_files WHERE id = ?').run(fileId);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
