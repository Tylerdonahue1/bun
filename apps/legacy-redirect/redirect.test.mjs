// The old host has no pages. trailingSlash true/false would 308 on this host
// before these rules run, so it stays unset and slash paths match /:path*/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));

function destinationFor(pathname) {
  for (const rule of config.redirects) {
    if (rule.source === '/') {
      if (pathname === '/') return rule.destination;
      continue;
    }
    if (rule.source === '/:path*/') {
      const match = pathname.match(/^\/(.+)\/$/);
      if (match) return rule.destination.replace(':path*', match[1]);
      continue;
    }
    if (rule.source === '/:path*') {
      const match = pathname.match(/^\/(.+)$/);
      if (match) return rule.destination.replace(':path*', match[1]);
    }
  }
  return null;
}

test('legacy redirects are 301s and do not use a trailingSlash 308', () => {
  assert.equal(config.trailingSlash, undefined);
  assert.equal(config.redirects.length, 3);
  for (const rule of config.redirects) {
    assert.equal(rule.statusCode, 301);
    assert.equal(rule.permanent, undefined);
    assert.equal(rule.destination.includes('?'), false);
  }
});

test('slash and non-slash paths redirect onto bun.coach and keep the slash', () => {
  assert.equal(destinationFor('/'), 'https://bun.coach/app/');
  assert.equal(destinationFor('/app/'), 'https://bun.coach/app/');
  assert.equal(destinationFor('/chat/'), 'https://bun.coach/chat/');
  assert.equal(destinationFor('/demo/'), 'https://bun.coach/demo/');
  assert.equal(destinationFor('/app'), 'https://bun.coach/app');
  assert.equal(destinationFor('/chat/duo.html'), 'https://bun.coach/chat/duo.html');
  assert.equal(destinationFor('/api/coach'), 'https://bun.coach/api/coach');
});
