# Simmer / Bun

Simmer is an AI couples-coaching web app. Bun is the coach. One Vercel project serves both the bun.coach landing page and the working prototype.

Source stays split so each app can still be run and tested on its own:

- `apps/landing/` is the landing page, quiz, and waitlist. On the combined site it is `https://bun.coach/`.
- `apps/prototype/` is the working prototype. On the combined site it is `https://bun.coach/app/`, plus `/chat/`, `/demo/`, and `/shared/`. Its own `index.html` (a redirect to `/app/`) is only for the standalone dev server. The bun.coach deploy does not ship that file, so `/` stays the landing page.
- `api/` at the repo root re-exports the handlers: `lead` and `leads` from the landing app, `coach` and `room` from the prototype. The names do not overlap.
- `npm run build` copies static files into `site/`. Favicons, `analytics.js`, and `vendor/vercel-analytics.js` are the same bytes in both apps, so the site keeps one of each. Server-only landing files (`lib/resend-sync.js`, `lib/welcome-email.js`) are not copied into `site/`.

`https://bun.coach/app/` is already linked from the landing page (“Try the prototype”, “Peek at the prototype”).

## Shared context

Project context for Tyler and Iryna and their Grok bots lives in `context/`. See `context/README.md` for the protocol. These files are documentation only and are not part of the site build.

## Run locally

Node.js 22. Install each app before its tests or dev server. The repo root install is what Vercel uses for the functions.

```bash
npm install
npm install --prefix apps/landing
npm install --prefix apps/prototype
```

Landing (http://localhost:4400):

```bash
npm run dev --prefix apps/landing
```

Prototype (http://localhost:4321). In this server only, `/` redirects to `/app/`.

```bash
npm run dev --prefix apps/prototype
```

Combined static site, after `npm run build`, is the `site/` directory. Lead capture returns 503 until `BLOB_READ_WRITE_TOKEN` is set. The coach returns 503 until an AI Gateway credential is available.

## Tests

```bash
npm test
```

That builds a throwaway copy of the combined site and runs both apps’ tests. You can still run `npm test` inside `apps/landing` or `apps/prototype`.

## Environment variables

Set these on the **bun-coach-landing** project. One Blob token is enough: leads are stored under `leads/` and Apart-mode rooms under `rooms/`. Those prefixes do not overlap. If the prototype was using a different Blob store, its old rooms stay there; new rooms are written to whichever store this token points at.

Copy from **simmer-prototype** if they are set there:

- `AI_GATEWAY_API_KEY` (skip this if that project calls AI Gateway with OIDC; on bun-coach-landing, OIDC is available as the `x-vercel-oidc-token` request header once AI Gateway is enabled for the project)
- `BLOB_READ_WRITE_TOKEN` only if you want prototype rooms in a store other than the landing leads store. If you use the landing token for both, do not also set a second token; there is one variable
- `SIMMER_MODEL` and `SIMMER_FALLBACK_MODEL`
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`). When these are set, rooms use KV instead of Blob

Already on **bun-coach-landing**, keep them:

- `BLOB_READ_WRITE_TOKEN` (leads, and rooms when KV is not set)
- `LEADS_ADMIN_KEY`
- `RESEND_API_KEY` (sending-only; From `Bun from Simmer <hello@bun.coach>`)
- `RESEND_CONTACTS_API_KEY` (full-access; the sending-only key cannot create contacts)
- `RESEND_AUDIENCE_ID` (segment id of the bun.coach waitlist)
- `RESEND_CONTACTS_ENABLED=true` and `WELCOME_EMAIL_ENABLED=true` when those features should turn on. Both stay off until set. `WELCOME_EMAIL_ALLOW_TEST=true` includes `test+…@example.com`

## Vercel: bun-coach-landing

This is the only project that serves bun.coach. Connect the GitHub repo `Tylerdonahue1/bun`.

| Setting | Value |
| --- | --- |
| Root Directory | repository root (empty, or `.`) |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `site` |
| Install Command | `npm install` |
| Node.js Version | 22.x |
| Include source files outside the Root Directory | off |

`vercel.json` at the repo root sets the same build command, output directory, and framework. Web Analytics stays enabled on this project. Each page loads `/analytics.js` once.

Production routes:

| URL | Source |
| --- | --- |
| `https://bun.coach/` | `apps/landing` |
| `https://bun.coach/app/` | `apps/prototype/app` |
| `https://bun.coach/chat/`, `/demo/`, `/shared/` | prototype |
| `https://bun.coach/api/lead`, `/api/leads` | landing |
| `https://bun.coach/api/coach`, `/api/room` | prototype |

## Vercel: simmer-prototype

Keep this project only as a redirect. Point it at `apps/legacy-redirect`.

| Setting | Value |
| --- | --- |
| Root Directory | `apps/legacy-redirect` |
| Framework Preset | Other |
| Build Command | empty |
| Output Directory | empty |
| Production domain | the existing `simmer-prototype.vercel.app` only. bun.coach stays on bun-coach-landing |

`apps/legacy-redirect/vercel.json` sends `301`s. `trailingSlash` is left unset so Vercel does not answer slash URLs with its own `308` on this host. `/` goes to `https://bun.coach/app/`. A path that ends in `/` keeps that slash (`/app/` and `/demo/` stay slash URLs on bun.coach). A path without a slash keeps that shape (`/chat/duo.html` stays without a trailing slash). The query string is left off the destination, so Vercel forwards it (`/chat/?x=1` becomes `https://bun.coach/chat/?x=1`). Do this after bun.coach is serving the combined site.
