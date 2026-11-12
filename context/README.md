# Shared context

This folder is the shared memory between Tyler and Iryna, and their Grok bots, who work in separate chats. It is how we keep project context in sync without sharing a single bot.

**The code on `main` is the source of truth for how the app works.** If these files disagree with the code, the code wins. Note the disagreement in your journal and fix the file.

These files are documentation only. They must not be copied into the Vercel site build.

## Files

| File | Purpose | How to edit |
| --- | --- | --- |
| [`PRODUCT.md`](PRODUCT.md) | Durable product facts: thesis, modes, price, safety, brand, coach rules | Update in place. Note the date of the change. |
| [`STATE.md`](STATE.md) | What's live, broken, in flight, and next | Update in place after every meaningful session. Keep it short. |
| [`DECISIONS.md`](DECISIONS.md) | Dated product and technical decisions | Append only. Never rewrite history; add a superseding entry instead. |
| [`OPEN.md`](OPEN.md) | Open questions and parked work | Update in place. When something is decided, move it to `DECISIONS.md` with the resolution and remove it from here. |
| [`journal/YYYY-MM-DD-<name>.md`](journal/) | Session notes | One file per person per day. Append to yours. Never edit someone else's. |

Use `tyler` or `iryna` (lowercase) in journal filenames, for example `journal/2026-11-12-tyler.md`.

## Protocol

### At the start of a session

1. `git pull` on `main` (rebase your branch if you have one).
2. Read `STATE.md`, `OPEN.md`, and today's plus yesterday's journal entries. Skim recent `DECISIONS.md` entries if STATE points to them.
3. Then do the work your human asked for.

### When to write

Don't write after every message. Write after:

- a product or technical decision,
- a shipped change (merge, deploy, or a live-site fix),
- a new open question or a resolved one,
- the end of a work session that produced anything the other person should know.

### At the end, or after a meaningful change

1. `git pull --rebase` again so you don't overwrite newer notes.
2. Update `STATE.md` if facts changed. Add or close items in `OPEN.md`. Append any new decisions to `DECISIONS.md`. Update `PRODUCT.md` only when a durable fact changes.
3. Write or append `journal/YYYY-MM-DD-<yourname>.md`. Keep it short: what you did, decisions, leftover questions, and links to PRs or commits. Sign with your name and a timestamp that includes a zone label (for example `12 Nov 2026, 6:00 AM PT`).
4. Commit **only** files under `context/`. Use the message `context(<name>): <one line>`, for example `context(iryna): note Talk works on iPhone`.
5. Push to `main` if the commit is context-only and touches no app code. If you are also changing the app, keep context notes in that same PR only when they describe that change; otherwise commit context separately.
6. Tell your human what you committed, with the commit or PR link.

### Conflicts

- Journal files should not conflict (one author per file).
- For `DECISIONS.md`, keep both appended entries.
- For `STATE.md`, `OPEN.md`, and `PRODUCT.md`, keep both updates if they don't contradict. If they do, keep both, mark the conflict clearly, and ask your human.

## Never put in this folder

- Secrets, API keys, tokens, env **values**, admin keys, or passwords. Env **names** are fine.
- Raw chat transcripts. Summarize instead.
- Anything about the Moonshots Resend account, or any account that isn't Simmer/Bun.
- Instructions to email, message, or post to anyone. The humans decide that.
- Equity, cap-table, or legal-entity discussion.

## Related files in the repo (don't duplicate them)

- `apps/prototype/FIGHT-MODEL.md` — fight-mode framework. The live code wins if they diverge.
- `apps/prototype/STATUS.md` — older build log. Deploy IDs in it may be stale; prefer `STATE.md`.
- `apps/prototype/api/_lib.js` — the live coach prompt and safety text.
