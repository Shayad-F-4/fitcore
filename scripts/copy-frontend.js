import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srcDir = path.resolve(rootDir, 'server/public');
const targetDirs = [
  path.resolve(rootDir, 'public'),
];

for (const target of targetDirs) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(srcDir, target, { recursive: true, force: true });
  console.log(`[Build] Copied Vanilla HTML/CSS/JS frontend to ${target}`);
}

