// Mobile (390x844) end-to-end: hero -> quiz -> lead -> result; and the safety branch.
// BASE=https://bun.coach EMAIL=test+bun@example.com node test/e2e.mjs
import puppeteer from '/home/box/.local/lib/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const BASE = process.env.BASE || 'http://localhost:4400';
const OUT = new URL('../shots/', import.meta.url).pathname;
const PRE = process.env.PREFIX || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const logs = [];
async function page() {
  const p = await b.newPage();
  await p.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  p.on('pageerror', e => logs.push('pageerror: ' + e.message));
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('_vercel/insights')) logs.push('http ' + r.status() + ' ' + r.url()); });
  return p;
}
const shot = async (p, name, full = false) => { await sleep(450); await p.screenshot({ path: `${OUT}${PRE}${name}.png`, fullPage: full }); const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); console.log('shot', name, ov ? 'OVERFLOW!' : ''); };
const pickOpt = async (p, id) => { await p.waitForSelector(`#qbody .opt[data-o="${id}"]`, { visible: true }); await p.click(`#qbody .opt[data-o="${id}"]`); await sleep(500); };
try {
  const p = await page();
  await p.goto(BASE + '/', { waitUntil: 'networkidle2' }); await sleep(800);
  await shot(p, '01-hero'); await shot(p, '02-landing-full', true);
  await p.click('.hero [data-start]');
  const path = ['ghost', 'phones', 'night', 'mismatch', 'caves', 'hours', 'hits', 'no'];
  for (let i = 0; i < path.length; i++) { if (i === 0) await shot(p, '03-quiz-q1'); if (i === 3) await shot(p, '04-quiz-q4'); await pickOpt(p, path[i]); }
  await p.waitForSelector('#lead-form', { visible: true });
  await p.type('input[name=email]', process.env.EMAIL || 'test+bun@example.com');
  await p.type('input[name=firstName]', 'TEST');
  await p.click('input[name=partner][value=yes]'); await p.click('input[name=consent]');
  await shot(p, '05-lead-form');
  const [resp] = await Promise.all([p.waitForResponse(r => r.url().includes('/api/lead'), { timeout: 20000 }), p.click('#lead-submit')]);
  console.log('lead POST', resp.status(), await resp.text());
  await p.waitForSelector('#result .res', { visible: true, timeout: 10000 });
  console.log('result:', await p.$eval('#result .res h2', e => e.textContent));
  await shot(p, '06-result'); await shot(p, '07-result-full', true);
  // shared link view
  const p3 = await page(); await p3.goto(BASE + '/?r=sweetsour', { waitUntil: 'networkidle2' }); await sleep(600); await shot(p3, '08-shared-link');
  // safety branch
  const p2 = await page();
  await p2.goto(BASE + '/', { waitUntil: 'networkidle2' }); await p2.click('.hero [data-start]');
  for (const id of ['volcano', 'tone', 'car', 'now', 'makeup', 'minutes', 'new']) await pickOpt(p2, id);
  await shot(p2, '09-quiz-safety-q');
  await pickOpt(p2, 'yes'); await p2.waitForSelector('#safety', { visible: true });
  console.log('safety visible; result hidden:', await p2.$eval('#result', e => e.hidden), '| lead hidden:', await p2.$eval('#lead', e => e.hidden));
  await shot(p2, '10-safety'); await shot(p2, '11-safety-full', true);
} catch (e) { console.error('E2E FAIL', e); process.exitCode = 1; }
console.log('logs:', logs.length ? logs : 'clean');
await b.close();
