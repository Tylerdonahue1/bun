// POST /api/lead : store one waitlist lead (email + optional name/partner + quiz answers + result type)
// in the private Vercel Blob store (BLOB_READ_WRITE_TOKEN). Paths stay under leads/.
// The prototype's Apart rooms use rooms/ and can share this token.
// Guards: honeypot field, minimum time-on-page, strict email check, whitelisted answers, per-IP rate limit.
import { score } from '../lib/quiz.js';
import { deliverLead } from '../lib/resend-sync.js';
import { randomBytes } from 'node:crypto';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
const PARTNER = new Set(['yes', 'maybe', 'solo', '']);
const hits = globalThis.__bunHits || (globalThis.__bunHits = new Map());
const limited = ip => { const now = Date.now(); const arr = (hits.get(ip) || []).filter(t => now - t < 10 * 60e3); arr.push(now); hits.set(ip, arr); return arr.length > 8; };
const str = (v, n) => String(v ?? '').trim().slice(0, n);
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 20000) throw new Error('too big'); }
  return raw ? JSON.parse(raw) : {};
}

export async function handleLead(req, res, deps = {}) {
  res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'method' });
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return send(429, { error: 'Too many tries. Give it a few minutes.' });
    const b = await body(req);
    // Honeypot / too-fast submit: pretend success, store nothing.
    if (str(b.website, 200) || (Number(b.elapsedMs) > 0 && Number(b.elapsedMs) < 4000)) return send(200, { ok: true });
    const email = str(b.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return send(400, { error: 'That email doesn’t look quite right.' });
    if (b.consent !== true) return send(400, { error: 'Please tick the box so we can email you.' });
    const partner = PARTNER.has(str(b.partner, 10)) ? str(b.partner, 10) : '';
    const firstName = str(b.firstName, 60).replace(/[<>]/g, '');
    const s = score(b.answers || {});
    // Safety answer (Q8 "Sometimes, yes") is never stored and never emailed.
    if (s.unsafe) return send(200, { ok: true });
    const lead = {
      created_at: new Date().toISOString(),
      email, first_name: firstName || null, partner_joining: partner || null, consent_updates: true,
      result_type: s.valid ? s.type : null,
      quiz_complete: s.valid, answers: s.clean, // the safety question is never stored
      source: str(b.source, 40) || 'quiz', utm: Object.fromEntries(Object.entries(b.utm || {}).filter(([k]) => /^utm_(source|medium|campaign|content|term)$/.test(k)).map(([k, v]) => [k, str(v, 100)])),
      ref: str(b.ref, 40) || null,
      is_test: /^test(\+[^@]*)?@example\.com$/.test(email),
      country: str(req.headers['x-vercel-ip-country'], 4) || null,
    };
    const id = `${lead.created_at.replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}`;
    const path = `leads/${lead.created_at.slice(0, 10)}/${id}.json`;
    if (deps.store) await deps.store(lead, path);
    else {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return send(503, { error: 'Storage is not configured.' });
      const { put } = await import('@vercel/blob');
      await put(path, JSON.stringify(lead), { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
    }
    try { await (deps.deliver || deliverLead)(lead); }
    catch (error) { console.error('resend failed', lead.email, String(error && error.message || error).slice(0, 300)); }
    return send(200, { ok: true, type: lead.result_type });
  } catch (e) {
    console.error('lead failed', String(e && e.message).slice(0, 200));
    return send(500, { error: 'Something went wrong on our side. Try again in a moment?' });
  }
}

export default function handler(req, res) {
  return handleLead(req, res);
}
