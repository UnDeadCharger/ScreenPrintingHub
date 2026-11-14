// Imported first in main.ts so process.env is populated before any module reads it.
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Dev only: the repo-root .env. In Docker the variables come from docker-compose.yml.
const envFile = join(__dirname, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });
