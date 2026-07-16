import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

// Load .env from project root (parent of backend/)
dotenvConfig({ path: path.resolve(projectRoot, '.env') });

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

const NODE_ENV = getEnv('NODE_ENV', 'development');

export const config = {
  // Server
  PORT: parseInt(getEnv('PORT', '3001')),
  NODE_ENV,
  CORS_ORIGINS: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : NODE_ENV === 'development' 
      ? '*'  // Allow all origins in dev
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:3001',
          'https://family-ai-app-2.onrender.com',
          'https://family-ai-backend-nfvj.onrender.com',
        ],

  // Security
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRY: getEnv('JWT_EXPIRY', '7d'),

  // Paths (resolved relative to project root, not cwd)
  DATA_DIR: path.resolve(projectRoot, getEnv('DATA_DIR', 'data')),
  DB_PATH: path.resolve(projectRoot, getEnv('DB_PATH', 'data/familyai.db')),
  UPLOADS_DIR: path.resolve(projectRoot, getEnv('UPLOADS_DIR', 'data/uploads')),

  // Claude API
  ANTHROPIC_API_KEY: getEnv('ANTHROPIC_API_KEY'),
  DEFAULT_MODEL: getEnv('DEFAULT_MODEL', 'claude-haiku-4-5-20251001'),
  ESCALATION_MODEL: getEnv('ESCALATION_MODEL', 'claude-sonnet-4-6'),

  // Privacy
  PII_STRIPPING_ENABLED: getEnv('PII_STRIPPING_ENABLED', 'true') === 'true',

  // File limits
  MAX_FILE_SIZE_MB: parseInt(getEnv('MAX_FILE_SIZE_MB', '10')),
};
