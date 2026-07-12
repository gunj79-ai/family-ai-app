import express from 'express';
import { getDb } from '../database/index.js';
import { EVA_DEFAULT_CHARACTER, validateEvaInstructions, buildEvaPrompt } from '../services/eva.js';

export const evaRouter = express.Router();

/**
 * GET /api/eva/settings
 * Get Eva's character instructions for the current user
 */
evaRouter.get('/settings', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user!.id;

    const settings = db.prepare(
      'SELECT user_system_prompt FROM user_settings WHERE user_id = ?'
    ).get(userId) as any;

    // If they have custom instructions, return those; otherwise return default
    const evaInstructions = settings?.user_system_prompt || EVA_DEFAULT_CHARACTER;

    res.json({
      evaInstructions,
      isCustomized: !!settings?.user_system_prompt,
    });
  } catch (err: any) {
    console.error('Get Eva settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/eva/settings
 * Update Eva's character instructions for the current user
 * Body: { evaInstructions: string }
 */
evaRouter.put('/settings', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    const { evaInstructions } = req.body as { evaInstructions: string };

    if (!evaInstructions) {
      return res.status(400).json({ error: 'evaInstructions is required' });
    }

    // Validate instructions
    const validation = validateEvaInstructions(evaInstructions);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Update user settings
    db.prepare(
      'UPDATE user_settings SET user_system_prompt = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).run(evaInstructions, userId);

    res.json({
      success: true,
      evaInstructions,
      message: 'Eva\'s character has been updated',
    });
  } catch (err: any) {
    console.error('Update Eva settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/eva/preview
 * Preview Eva's prompt with variable substitution
 * Body: { evaInstructions?: string, userName?: string }
 */
evaRouter.post('/preview', (req, res) => {
  try {
    const { evaInstructions, userName } = req.body as { evaInstructions?: string; userName?: string };

    const template = evaInstructions || EVA_DEFAULT_CHARACTER;
    const preview = buildEvaPrompt(template, {
      user_name: userName || 'User',
    });

    res.json({ preview });
  } catch (err: any) {
    console.error('Preview Eva error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/eva/default
 * Get Eva's default character instructions
 */
evaRouter.get('/default', (req, res) => {
  res.json({
    defaultCharacter: EVA_DEFAULT_CHARACTER,
  });
});
