// POST /api/coach : streams Bun's reply as plain text chunks.
import { MODEL, FALLBACK_MODEL, SAFETY_RE, SAFETY_TEXT, buildMessages, gatewayToken, openGatewayStream, sseDeltas, rateLimited, readJson, makeCapper, CAPS } from './_lib.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method === 'GET') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true, model: MODEL, hasToken: !!gatewayToken(req) })); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return; }
  if (rateLimited(req)) { res.statusCode = 429; res.end('Bun needs a breather. Try again in a minute.'); return; }
  const body = await readJson(req);
  const { messages, humanText, mode } = buildMessages(body);
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-simmer-model', MODEL);
  // Deterministic safety screen before any coaching.
  if (SAFETY_RE.test(humanText || '')) {
    res.setHeader('x-simmer-safety', '1');
    if (body.task === 'aha') { res.end('{"safety":true}'); return; }
    res.end(SAFETY_TEXT); return;
  }
  const token = gatewayToken(req);
  if (!token) { res.statusCode = 503; res.end('NO_AI_ACCESS: set AI_GATEWAY_API_KEY or deploy on Vercel with OIDC.'); return; }
  res.setHeader('x-simmer-model', MODEL);
  if (res.flushHeaders) res.flushHeaders();
  // Try primary, then fallback. A model that errors or streams no visible text falls through to the next one.
  for (const model of [MODEL, FALLBACK_MODEL]) {
    let stream;
    try { stream = await openGatewayStream({ token, messages, model, maxTokens: body.task === 'aha' ? 900 : 500 }); }
    catch (e) { console.error('model failed', model, String(e.message).slice(0, 300)); continue; }
    let wrote = 0;
    const cap = body.task === 'aha' ? null : (body.task ? makeCapper() : makeCapper(...(CAPS[mode] || CAPS.app)));
    try {
      for await (const d of sseDeltas(stream)) {
        if (!cap) { res.write(d); wrote += d.length; continue; }
        const { out, stop } = cap.push(d);
        if (out) { res.write(out); wrote += out.length; }
        if (stop) break;
      }
      if (cap) { const rest = cap.flush(); if (rest) { res.write(rest); wrote += rest.length; } }
    } catch (e) { console.error('stream error', model); }
    if (wrote) { res.end(); return; }
  }
  // Nothing worked: the client switches to scripted Bun on an empty 502.
  if (!res.headersSent) res.statusCode = 502;
  res.end();
}
