// Admin-only: GET /api/leads (JSON) or /api/leads?format=csv ; DELETE /api/leads?path=leads/...json
// Auth: header "x-admin-key" (or ?key=) must equal the LEADS_ADMIN_KEY project env var.
import { timingSafeEqual } from 'node:crypto';
const ok = k => { const want = process.env.LEADS_ADMIN_KEY || ''; const a = Buffer.from(String(k || '')), b = Buffer.from(want); return want.length >= 24 && a.length === b.length && timingSafeEqual(a, b); };
const csvCell = v => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const u = new URL(req.url, 'http://x');
  if (!ok(req.headers['x-admin-key'] || u.searchParams.get('key'))) { res.statusCode = 401; return res.end('unauthorized'); }
  const { list, get, del } = await import('@vercel/blob');
  if (req.method === 'DELETE') {
    const p = u.searchParams.get('path') || '';
    if (!/^leads\/[0-9-]{10}\/[A-Za-z0-9-]+\.json$/.test(p)) { res.statusCode = 400; return res.end('bad path'); }
    await del(p); res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ deleted: p }));
  }
  const blobs = []; let cursor;
  do { const r = await list({ prefix: 'leads/', cursor, limit: 1000 }); blobs.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  const rows = [];
  for (const bl of blobs) {
    try { const g = await get(bl.pathname, { access: 'private', useCache: false }); rows.push({ path: bl.pathname, ...JSON.parse(await new Response(g.stream).text()) }); } catch { rows.push({ path: bl.pathname, error: 'unreadable' }); }
  }
  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (u.searchParams.get('format') === 'csv') {
    const cols = ['created_at', 'email', 'first_name', 'partner_joining', 'result_type', 'quiz_complete', 'answers', 'source', 'ref', 'utm', 'country', 'is_test', 'path'];
    res.setHeader('content-type', 'text/csv; charset=utf-8'); res.setHeader('content-disposition', 'attachment; filename="bun-coach-leads.csv"');
    return res.end([cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n'));
  }
  res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ count: rows.length, leads: rows }, null, 2));
}
