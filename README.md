# Simmer / Bun

Simmer is an AI couples-coaching web app. Bun is the coach. This repository holds the working prototype and the bun.coach landing page. Each one deploys as its own Vercel project.

The repository started as a one-line README. Both apps now live under `apps/`, with the same files and `api/` routes they had when they were deployed on their own.

## Layout

- `apps/prototype/` is the working prototype: static HTML and JS, plus Vercel functions in `api/` (`api/coach.js` calls Vercel AI Gateway, `api/room.js` stores Apart-mode rooms). Live at https://simmer-prototype.vercel.app. `/` redirects to `/app/`. Notes on the product are in `apps/prototype/STATUS.md` and `apps/prototype/FIGHT-MODEL.md`.
- `apps/landing/` is the bun.coach landing page: quiz, waitlist, and lead export. Live at https://bun.coach. Details are in `apps/landing/README.md`.

Each app is self-contained. Serverless functions stay in that app's `api/` directory, which is what Vercel detects when the app folder is the project root.

## Run locally

Install and start each app from its own directory. Node.js 22.

Prototype (http://localhost:4321):

```bash
cd apps/prototype
npm install
npm run dev
```

Landing (http://localhost:4400):

```bash
cd apps/landing
npm install
npm run dev
```

Lead capture on the landing page returns 503 until `BLOB_READ_WRITE_TOKEN` is set in the environment. The prototype coach returns 503 until an AI Gateway credential is available.

## Tests

```bash
cd apps/prototype && npm test
cd apps/landing && npm test
```

Optional checks, not part of `npm test`:

- Landing browser pass: from `apps/landing`, `BASE=https://bun.coach node test/e2e.mjs` (needs Puppeteer). Screenshots go to `shots/`.
- Prototype live red-team: from `apps/prototype`, `npm run redteam`. This calls AI Gateway.

## Environment variables

Set these in the Vercel project. The repo has no `.env` files. Names only:

**Prototype** (`simmer-prototype`)

- `AI_GATEWAY_API_KEY`, when the project calls AI Gateway with an API key
- `VERCEL_OIDC_TOKEN`, when the project calls AI Gateway with OIDC. On Vercel the coach route also accepts the `x-vercel-oidc-token` request header
- `BLOB_READ_WRITE_TOKEN`, optional, for durable Apart-mode rooms. Without it, rooms stay in function memory
- `SIMMER_MODEL` and `SIMMER_FALLBACK_MODEL`, optional model overrides
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`), optional room store used instead of Blob when set

**Landing** (`bun-coach-landing`)

- `BLOB_READ_WRITE_TOKEN`, private Blob store for leads
- `LEADS_ADMIN_KEY`, required header for `GET` and `DELETE /api/leads` (24 characters or more)

`RESEND_API_KEY` is reserved for the email integration that is coming. Neither app reads it yet.

## Vercel

Connect the GitHub repo `Tylerdonahue1/bun` to the two existing projects. Set the root directory before the first production deploy from Git, so Vercel builds the app folder.

| Project | Root Directory | Production |
| --- | --- | --- |
| `simmer-prototype` | `apps/prototype` | https://simmer-prototype.vercel.app |
| `bun-coach-landing` | `apps/landing` | https://bun.coach |

For both projects:

- Framework Preset: **Other**. Each app's `vercel.json` sets `"framework": null`, which is that preset.
- Build Command: empty. There is no build step. `postinstall` copies the analytics browser build into `vendor/`.
- Output Directory: empty (the app directory itself).
- Install Command: `npm install` (the default).
- Node.js Version: **22.x**.
- Leave "Include source files outside of the Root Directory" off.

Environment variables already stored on each Vercel project stay there. Web Analytics has to be enabled on each project (Analytics tab). After this repo is deployed, `/analytics.js` calls `inject()` from `@vercel/analytics`, which requests `/_vercel/insights/script.js` on that same deployment. Vercel serves that script when Web Analytics is enabled.

## Analytics

These are static HTML apps, so the browser cannot import `node_modules`. `scripts/sync-analytics.mjs` copies `@vercel/analytics/dist/index.mjs` to `vendor/vercel-analytics.js`. `analytics.js` imports `inject()` from that file. Every HTML page loads `/analytics.js`. On the landing page, the existing `window.va` queue is still in `index.html`, so quiz and lead events queue before the insights script arrives.
