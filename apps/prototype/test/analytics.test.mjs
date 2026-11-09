import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { analyticsBrowserSource, vendorPath } from '../scripts/sync-analytics.mjs';

const root = path.join(import.meta.dirname, '..');
const scriptTag = '<script type="module" src="/analytics.js"></script>';

function htmlFiles(dir) {
  const pages = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'vendor' || name === 'test') continue;
    const filePath = path.join(dir, name);
    if (fs.statSync(filePath).isDirectory()) pages.push(...htmlFiles(filePath));
    else if (name.endsWith('.html')) pages.push(filePath);
  }
  return pages;
}

test('vendored file is the installed @vercel/analytics browser build', () => {
  const source = analyticsBrowserSource();
  assert.equal(fs.readFileSync(vendorPath(), 'utf8'), source);
  assert.match(source, /var name = "@vercel\/analytics"/);
  assert.match(source, /return "\/_vercel\/insights\/script\.js"/);
});

test('analytics.js calls inject() from that build', () => {
  const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');
  assert.match(source, /import \{ inject \} from '\.\/vendor\/vercel-analytics\.js'/);
  assert.match(source, /\binject\(\)/);
});

test('every html page loads /analytics.js', () => {
  const pages = htmlFiles(root);
  assert.ok(pages.length >= 1);
  for (const page of pages) {
    assert.match(fs.readFileSync(page, 'utf8'), new RegExp(scriptTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), page);
  }
});

test('inject() in a browser realm requests /_vercel/insights/script.js', async () => {
  const scripts = [];
  const sandbox = {
    console,
    document: {
      head: {
        querySelector() { return null; },
        appendChild(element) { scripts.push(element); },
      },
      createElement() { return { dataset: {}, defer: false, src: '' }; },
    },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const mod = new vm.SourceTextModule(fs.readFileSync(vendorPath(), 'utf8'), {
    context,
    identifier: vendorPath(),
  });
  await mod.link((specifier) => { throw new Error('unexpected import ' + specifier); });
  await mod.evaluate();
  mod.namespace.inject();
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, '/_vercel/insights/script.js');
  assert.equal(scripts[0].defer, true);
  assert.equal(scripts[0].dataset.sdkn, '@vercel/analytics');
  assert.match(scripts[0].dataset.sdkv, /^\d+\.\d+\.\d+$/);
  sandbox.va('event', { name: 'page' });
  assert.equal(JSON.stringify(sandbox.vaq), JSON.stringify([['event', { name: 'page' }]]));
});
