# Current state

As of 12 November 2026. Update this in place when facts change. Keep it short.

## Live

- **Site:** [bun.coach](https://bun.coach) (landing + quiz) and [bun.coach/app/](https://bun.coach/app/) (prototype). Also `/chat/` and `/demo/` (older; don't edit those to change "the app").
- **Repo:** [github.com/Tylerdonahue1/bun](https://github.com/Tylerdonahue1/bun), public, default branch `main`. Head includes merged PR #3 (`caf356d`, shared `context/` folder). Production deploys below may still be on earlier commits; `context/` is docs-only and is not part of the site build.
- **Vercel:** one project, `bun-coach-landing`, team `tyler-donahues-projects`. Landing owns `/`; the prototype is assembled in at `/app/`, `/chat/`, `/demo/`.
- **Production:** bun.coach is `dpl_3GKt8AJA7y8EvgDW1CpC5Q57Ez7R`, built from `b934058` (PR #1). simmer-prototype.vercel.app is `dpl_2ZvLLJczEn18LE3EmhYa4QWX7xzy`, built from `61c229f` (PR #2), and 301s to bun.coach (root → `/app/`, other paths keep path and query).
- PR #2 only touched `apps/legacy-redirect/`, so bun.coach being one commit behind does not change what it serves.
- Every bun.coach route sends `Permissions-Policy: camera=(), microphone=(self), geolocation=()`. `microphone=(self)` is required; the assemble test fails if it regresses to `microphone=()`.
- `GET /api/coach` reports `moonshotai/kimi-k2` with a gateway credential present. The live coach is wired up.
- Domain `bun.coach` is verified on a **dedicated** Simmer/Bun Resend account (not Moonshots). Mail sends as `Bun from Simmer <hello@bun.coach>`.
- Welcome email is approved and can send. A test to Tyler was delivered.

## Broken or incomplete

- **Waitlist contacts aren't created in Resend.** The contact upsert failed with an invalid API key. Waiting on the repo owner to paste the correct `RESEND_CONTACTS_API_KEY` for Production and Preview, then redeploy and re-test. Env values were not re-checked on 12 Nov. Iryna should not need to rotate keys.
- Talk (microphone) has not been checked on a real iPhone yet.
- Two-phone sync is not real in `/app/`. Widget, Siri, lock-screen start, push, accounts, payment, and affiliate links are not built.
- The live `/app/` fight flow does **not** yet match the 12 Nov 2026 agreed flow (together/separate windows, sit still vs walk it off, quizzes, auto Stage 2, shared log, one-hour follow-up). See [`meetings/2026-11-12-fight-mode-flow.md`](meetings/2026-11-12-fight-mode-flow.md). `FIGHT-MODEL.md` is also behind that meeting.
- **Merging to `main` has not reliably produced a production deploy.** After a merge, check Vercel. It may need a manual production deploy by someone with access.

## In flight / next

1. Design and product work from the 12 Nov fight-mode flow meeting: new windows (Sit Still vs Walk it Off; Separately safe-space + quiz; Together "We're calmer"; Talk it through in the flow), the Separately questionnaire, auto-resume on the starter's phone, shared history, and a one-hour follow-up. Full to-dos are in the [meeting notes](meetings/2026-11-12-fight-mode-flow.md) and [`OPEN.md`](OPEN.md). Tyler is choosing the widget button wording (not "Pause").
2. Fix the contacts key, redeploy, confirm a signup lands in the waitlist segment (`47aa185f-cccb-4226-b99a-770bac7f26ca`).
3. Check Talk, speech, Add to Home Screen, and `.ics` on a real iPhone.
4. Settle the other open product questions in [`OPEN.md`](OPEN.md).
5. Cheap directory listings, then work toward a native iOS app with a real $14.99 in-app purchase.

## First files to edit (the app)

| Change | Open |
| --- | --- |
| What Bun says, tone, neutrality, crisis wording | `apps/prototype/api/_lib.js` |
| Danger detection | `_lib.js` **and** `apps/prototype/shared/simmer.js` (`SAFETY_RE` must match) |
| Prototype screens and flow | `apps/prototype/app/app.js` (UI), `apps/prototype/app/core.js` (state) |
| Prototype look | `apps/prototype/app/styles.css`, `apps/prototype/shared/simmer.css` |
| Talk / microphone | `apps/prototype/shared/speech.js` |
| Landing copy, quiz | `apps/landing/index.html`, `styles.css`, `app.js`, `lib/quiz.js` |
| Waitlist / welcome email | `apps/landing/api/lead.js`, `lib/welcome-email.js`, `lib/resend-sync.js` |

The app is `apps/prototype/app/`. Ignore `/demo/` and `/chat/` unless the task is specifically those older surfaces. Older standalone demos (`simmer-group-chat.vercel.app`, `simmer-fight-coach.vercel.app`) and snapshots outside this repo are stale.
