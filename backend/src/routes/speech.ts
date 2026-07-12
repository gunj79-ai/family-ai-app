import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export const speechRouter = express.Router();

const upload = multer({
  dest: path.join(config.UPLOADS_DIR, 'tmp-audio'),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max audio
});

/**
 * POST /api/speech/transcribe
 * Receives audio blob, returns { text: string }
 *
 * Tier 1: uses Web Speech API on the client — this endpoint is the
 * Tier 2 (Whisper) stub. For now returns the text sent by client
 * to keep the contract consistent. Whisper replaces this in a
 * future upgrade without any frontend changes.
 */
speechRouter.post('/transcribe', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file' });
      return;
    }

    // Clean up temp file immediately
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // File cleanup failure is not critical
    }

    // Tier 1 stub — client does Web Speech API transcription locally
    // and sends the text. The audio file is accepted but not processed.
    // To upgrade to Whisper: npm install nodejs-whisper, replace this
    // with: const text = await nodewhisper(req.file.path, { modelName:'base.en' })
    const text = (req.body?.transcript as string) || '';
    res.json({ text });
  } catch (err: any) {
    console.error('Speech transcribe error:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

export default speechRouter;
