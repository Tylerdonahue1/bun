# bun.coach landing page (Simmer / Bun)

Mobile-first landing page + playful 8-question "what kind of fighters are you two?" quiz with waitlist lead capture.

- **Live:** https://bun.coach (www.bun.coach 308-redirects to it). Vercel project `bun-coach-landing` (`prj_IgBW86EmOBPs2GrHmfjNfzrINKlE`), team tyler-donahues-projects. The `*.vercel.app` URL is behind Vercel Authentication (default); the custom domain is public.
- **Domain:** bun.coach is registered through Vercel and uses Vercel DNS (ns1/ns2.vercel-dns.com), so no registrar DNS changes are needed.
- **Stack:** static HTML/CSS/JS (no build) + two Vercel Node functions. Fonts/colors/Bun illustration reused from `simmer-prototype`.

## Files
- `index.html`, `styles.css`, `app.js`: page, quiz UI, lead form, result, safety screen, share.
- `analytics.js`: calls `inject()` from `@vercel/analytics`. `scripts/sync-analytics.mjs` copies the package's browser build to `vendor/vercel-analytics.js` (Vercel does not serve `node_modules`).
- `lib/quiz.js`: questions, answer scoring, 5 result types. Shared by browser and server (server recomputes the result type from whitelisted answers).
- `api/lead.js`: `POST /api/lead`. Validates email + consent, honeypot (`website` field) and a too-fast-submit check silently drop bots, per-IP rate limit (8 per 10 min per instance), drops unknown answers, never stores the safety question. Writes one JSON file per lead to the private Vercel Blob store `bun-coach-leads` (`store_vtHSyJhKiE8lxJe9`) at `leads/YYYY-MM-DD/<timestamp>-<rand>.json`. Emails matching `test+…@example.com` get `is_test: true`.
- `api/leads.js`: admin only. `GET /api/leads` (JSON) or `?format=csv`; `DELETE /api/leads?path=leads/...json`. Requires header `x-admin-key` (or `?key=`) equal to the `LEADS_ADMIN_KEY` project env var (sensitive). Local copy of the key: `.admin-key` (chmod 600, not deployed).
- `test/quiz.test.mjs` (`npm test`): scoring, all 5 types reachable, unsafe branch, junk answers dropped.
- `test/e2e.mjs`: puppeteer, 390x844 iPhone viewport. `BASE=https://bun.coach EMAIL=test+bun@example.com node test/e2e.mjs` → `shots/`.
- `dev-server.mjs`: local static + api server (`node dev-server.mjs 4400`); lead POST returns 503 locally unless `BLOB_READ_WRITE_TOKEN` is set.

## Viewing leads
1. Vercel dashboard → bun-coach-landing → Storage → `bun-coach-leads` → Browser (each lead is a JSON file under `leads/`).
2. Or CSV: `curl -H "x-admin-key: $KEY" "https://bun.coach/api/leads?format=csv" -o leads.csv` (key is in project Settings → Environment Variables → LEADS_ADMIN_KEY, sensitive, so if you can't reveal it, rotate it to a new value and redeploy).

Lead record: `created_at, email, first_name, partner_joining (yes|maybe|solo|null), consent_updates, result_type, quiz_complete, answers{style,trigger,when,cool,end,recover,repeat}, source, utm{}, ref (shared type that brought them), is_test, country`.

## Deploy (no CLI token on the box)
Vercel MCP `upload_file` for each changed file (sha1 + size, base64 body via `$file:`), then `create_deployment` with the full manifest for project `prj_IgBW86EmOBPs2GrHmfjNfzrINKlE`, `target: production`, `projectSettings.framework: null`, `nodeVersion: 22.x`. Don't ship `shots/`, `test/`, `.admin-key`, `README.md`, `dev-server.mjs`.

## Analytics
`index.html` keeps the `window.va` queue and loads `/analytics.js`. That module calls `inject()` from `@vercel/analytics`, which inserts `/_vercel/insights/script.js`. Vercel serves that script once Web Analytics is enabled and the project is redeployed. `va('event', …)` calls (quiz_start, quiz_done, quiz_safety, lead_submit, lead_skip, share) still queue before the script loads. Custom events need a Pro plan.
