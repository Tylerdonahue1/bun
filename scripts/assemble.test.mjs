import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assemble } from './assemble.mjs';

const repo = path.join(import.meta.dirname, '..');

test('combined site: landing at /, prototype routes beside it, one analytics tag, no collisions', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'bun-site-'));
  assemble(destination);
  const landing = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(destination, 'app/index.html'), 'utf8');
  assert.match(landing, /Try the prototype/);
  assert.match(landing, /href="\/app\/"/);
  assert.equal(landing.includes("location.replace('/app/'"), false);
  assert.equal(fs.existsSync(path.join(destination, 'chat/index.html')), true);
  assert.equal(fs.existsSync(path.join(destination, 'demo/index.html')), true);
  assert.equal(fs.existsSync(path.join(destination, 'shared/simmer.js')), true);
  assert.equal(fs.existsSync(path.join(destination, 'lib/quiz.js')), true);
  assert.equal(fs.existsSync(path.join(destination, 'lib/resend-sync.js')), false);
  assert.equal(fs.existsSync(path.join(destination, 'api')), false);
  for (const relative of walkHtml(destination)) {
    const html = fs.readFileSync(relative, 'utf8');
    const tags = html.match(/src="\/analytics\.js"/g) || [];
    assert.equal(tags.length, 1, relative);
  }
  assert.match(app, /src="\/analytics\.js"/);
});

test('api entrypoints do not share names, and blob prefixes stay apart', () => {
  const names = fs.readdirSync(path.join(repo, 'api')).filter(name => name.endsWith('.js')).sort();
  assert.deepEqual(names, ['coach.js', 'lead.js', 'leads.js', 'room.js']);
  const room = fs.readFileSync(path.join(repo, 'apps/prototype/api/room.js'), 'utf8');
  const lead = fs.readFileSync(path.join(repo, 'apps/landing/api/lead.js'), 'utf8');
  const leads = fs.readFileSync(path.join(repo, 'apps/landing/api/leads.js'), 'utf8');
  assert.match(room, /`rooms\//);
  assert.equal(/`leads\//.test(room), false);
  assert.match(lead, /`leads\//);
  assert.equal(/`rooms\//.test(lead), false);
  assert.match(leads, /prefix: 'leads\/'/);
});

function walkHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkHtml(full));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}
