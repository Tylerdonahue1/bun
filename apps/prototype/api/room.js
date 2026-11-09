// /api/room : tiny shared room store for Apart mode (two devices, one chat).
// Hot path: in-memory on the warm function instance. Durable copy: Vercel Blob (private store, free Hobby tier)
// when BLOB_READ_WRITE_TOKEN is set; written only on real changes (not typing), read only on a memory miss.
// Paths stay under rooms/. The landing waitlist uses leads/ in the same store.
// Falls back to memory-only if Blob is missing, over quota, or erroring. Upstash/KV REST is used instead if configured.
import { readJson, rateLimited } from './_lib.js';

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const BLOB = !KV_URL && !!process.env.BLOB_READ_WRITE_TOKEN;
const TTL = 60 * 60 * 24; // rooms live 24h
const mem = globalThis.__simmerRooms || (globalThis.__simmerRooms = new Map());
const STORE = KV_URL ? 'kv' : BLOB ? 'blob' : 'memory';
let blobMod = null;
const blob = async () => blobMod || (blobMod = await import('@vercel/blob'));

async function kv(cmd) {
  const r = await fetch(KV_URL, { method: 'POST', headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json(); return j.result;
}
const fresh = r => r && Date.now() - r.touched < TTL * 1000 ? r : null;
async function load(id) {
  if (KV_URL) { const v = await kv(['GET', 'simmer:room:' + id]); return v ? JSON.parse(v) : null; }
  const m = fresh(mem.get(id)); if (m) return m; mem.delete(id);
  if (BLOB) {
    try {
      const { get } = await blob();
      const g = await get(`rooms/${id}.json`, { access: 'private', useCache: false });
      if (g && g.stream) { const room = fresh(JSON.parse(await new Response(g.stream).text())); if (room) { mem.set(id, room); return room; } }
    } catch (e) { console.error('blob read failed', String(e.message).slice(0, 120)); }
  }
  return null;
}
async function store(room, durable = true) {
  room.touched = Date.now();
  if (KV_URL) { await kv(['SET', 'simmer:room:' + room.id, JSON.stringify(room), 'EX', TTL]); return; }
  mem.set(room.id, room);
  if (mem.size > 500) { const old = [...mem.values()].sort((a, b) => a.touched - b.touched)[0]; mem.delete(old.id); }
  if (BLOB && durable) {
    try {
      const { put } = await blob();
      const { typing, ...keep } = room;
      await put(`rooms/${room.id}.json`, JSON.stringify({ ...keep, typing: {} }), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
    } catch (e) { console.error('blob write failed', String(e.message).slice(0, 120)); }
  }
}
const clean = (s, n = 2000) => String(s ?? '').slice(0, n);
const okId = id => /^[a-z0-9]{4,12}$/.test(id || '');
const view = (room, since = 0) => ({ exists: true, id: room.id, names: room.names, joined: room.joined, typing: room.typing, seq: room.seq, msgs: room.msgs.filter(m => m.seq > since), store: STORE });

export default async function handler(req, res) {
  res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  try {
    if (req.method === 'GET') {
      const u = new URL(req.url, 'http://x'); const id = u.searchParams.get('id');
      if (!okId(id)) return send(400, { error: 'bad id' });
      const room = await load(id); if (!room) return send(200, { exists: false, store: STORE });
      return send(200, view(room, +u.searchParams.get('since') || 0));
    }
    if (req.method !== 'POST') return send(405, { error: 'method' });
    if (rateLimited(req, 240)) return send(429, { error: 'slow down' });
    const b = await readJson(req);
    const id = b.id; if (!okId(id)) return send(400, { error: 'bad id' });
    let room = await load(id);
    if (b.op === 'create' || b.op === 'seed') {
      if (!room) room = { id, created: Date.now(), names: { A: clean(b.names?.A, 30) || 'Sam', B: clean(b.names?.B, 30) || 'Alex' }, joined: {}, typing: {}, msgs: [], seq: 0 };
      if (b.op === 'seed' && Array.isArray(b.msgs) && !room.msgs.length) {
        for (const m of b.msgs.slice(-200)) room.msgs.push({ ...m, text: clean(m.text), seq: ++room.seq });
      }
      if (b.as) room.joined[b.as] = Date.now();
      await store(room); return send(200, view(room, b.since || 0));
    }
    if (b.op === 'delete') { // "Delete my data": anyone holding the room id may delete it
      mem.delete(id);
      if (KV_URL) await kv(['DEL', 'simmer:room:' + id]);
      else if (BLOB) { try { const { del } = await blob(); await del(`rooms/${id}.json`); } catch (e) { console.error('blob delete failed', String(e.message).slice(0, 120)); } }
      return send(200, { deleted: true });
    }
    if (!room) return send(404, { exists: false });
    if (b.op === 'join') { const w = b.as === 'B' ? 'B' : 'A'; room.joined[w] = Date.now(); if (b.name) room.names[w] = clean(b.name, 30); }
    else if (b.op === 'typing') { room.typing[b.who] = b.on ? Date.now() : 0; }
    else if (b.op === 'post') {
      const m = b.msg || {}; if (room.msgs.some(x => x.cid && x.cid === m.cid)) return send(200, view(room, b.since || 0));
      room.msgs.push({ cid: clean(m.cid, 40), from: ['A', 'B', 'bun', 'sys'].includes(m.from) ? m.from : 'sys', text: clean(m.text), kind: clean(m.kind, 20) || 'text', data: m.data && typeof m.data === 'object' ? JSON.parse(clean(JSON.stringify(m.data), 4000)) : undefined, ts: Date.now(), seq: ++room.seq });
      if (m.from === 'bun') room.typing.bun = 0; else room.typing[m.from] = 0;
      if (room.msgs.length > 400) room.msgs = room.msgs.slice(-400);
    } else if (b.op === 'update') {
      const m = room.msgs.find(x => x.cid === b.cid); if (m && b.data && typeof b.data === 'object') { m.data = { ...(m.data || {}), ...b.data }; m.seq = ++room.seq; }
    } else return send(400, { error: 'op' });
    await store(room, b.op !== 'typing' && b.op !== 'join'); return send(200, view(room, b.since || 0));
  } catch (e) { console.error(e); return send(500, { error: 'server' }); }
}
