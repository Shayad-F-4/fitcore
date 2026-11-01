import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('server/public');
const targetDirs = [path.resolve('public'), path.resolve('dist'), path.resolve('client/dist')];

for (const target of targetDirs) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(srcDir, target, { recursive: true, force: true });
  console.log(`[Build] Copied Vanilla HTML/CSS/JS frontend to ${target}`);
}

