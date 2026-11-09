// Build the single bun.coach site into site/.
// Landing owns /. The prototype keeps /app, /chat, /demo, /shared, and /api/coach + /api/room.
// The prototype's own / redirect is not copied. API handlers stay in each app; root api/*.js re-exports them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const landingFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'analytics.js',
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'lib/quiz.js',
  'email/bun.png',
  'vendor/vercel-analytics.js',
];

const prototypeDirs = ['app', 'chat', 'demo', 'shared'];

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) {
    const same = fs.readFileSync(from).equals(fs.readFileSync(to));
    if (!same) throw new Error(`Static path collision: ${path.relative(repoRoot, to)}`);
    return;
  }
  fs.copyFileSync(from, to);
}

function copyDir(fromDir, toDir) {
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) copyFile(from, to);
  }
}

export function assemble(destination = path.join(repoRoot, 'site')) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  const landing = path.join(repoRoot, 'apps/landing');
  const prototype = path.join(repoRoot, 'apps/prototype');
  for (const relative of landingFiles) copyFile(path.join(landing, relative), path.join(destination, relative));
  for (const dir of prototypeDirs) copyDir(path.join(prototype, dir), path.join(destination, dir));
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = assemble();
  console.log('Assembled', path.relative(repoRoot, destination));
}
