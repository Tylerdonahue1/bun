# Decisions

Append-only. Newest at the top. If a decision is reversed, add a new entry that supersedes the old one; don't edit the original.

## 12 Nov 2026 — Fight-mode flow: wind down, reunion, log, and launch

From a design meeting ([notes and transcript](meetings/2026-11-12-fight-mode-flow.md)). Not built yet. This supersedes earlier flow details where they conflict, including parts of `FIGHT-MODEL.md` and the 4 Nov "instant voice start" entry (widget wording is no longer "Pause"; both widget and Siri are launch options).

- Launch is **both** a one-button home-screen widget **and** "Hey Siri, Start Simmer." Widget copy is not "Pause"; Tyler will choose the word. Try to skip Siri's lock-screen "Open Simmer or Stop" prompt; keep that design until it's proven.
- After launch, the fight-or-chill screen stays. **Chill is future work, not the current focus.** Supporting copy can be tightened later.
- Screens in a fight should have **less text and fewer buttons**.
- Wind down starts with **Together or Separately** (simple two-option screen, short voice line from Bun).
- **Together** (one phone, whoever started): a following screen for **Sit Still** (press play, 5-minute recorded meditation) or **Walk it Off** (they walk together; press start when outside, 10-minute timer, a mid-timer suggestion may pop up). Comeback is one **"We're calmer"** click, then an automatic animated transition into Stage 2. No extra Start, no dual check-in. Bun then asks **three questions, taking turns**; those answers feed the method. No written quiz during Together wind-down.
- **Separately** (two phones): push the other partner to start Bun. New window: "Find a safe space by yourself. Click start when you're ready." Title like "Tyler with Bun." Then a quiz (voice or text, same questions; 3 of 5 is enough). The Separately quiz is **different** from Together's three questions, because choosing to separate is more intense. Clicking Separately is itself data that feeds the method. After both finish: both tap ready, then Stage 2 **resumes on the starter's phone** — do not ask whose phone (that can start a fight).
- **Talk it through must be in the design flow** through close (AI voice coach, chat window, voice animation).
- **Automatic shared fight history is a core product piece.** Generated after every use, resolved or not. In a menu, searchable by date and topic. Precise wording and commitments are stored. One-hour post-fight follow-up is the direction (or a lighter "want to reflect?" push). Mid-week direct-to-log is parked.
- One subscription, partner joins free (already decided 4 Nov; reaffirmed here for phone behavior).

## 12 Nov 2026 — Shared context lives in this repo

Tyler and Iryna each have their own Grok Bot chats (sharing one bot isn't available yet). Project context is kept in `context/` in [Tylerdonahue1/bun](https://github.com/Tylerdonahue1/bun), following the protocol in [`README.md`](README.md). This replaces handing Iryna a one-off onboarding markdown as the long-term source of truth. Meeting transcripts the humans share are filed in [`meetings/`](meetings/), per [`meetings/README.md`](meetings/README.md).

PR #3 (`7e03f40`, merge `caf356d`): added the `context/` folder to `main`.

## 9 Nov 2026 — One Vercel project on bun.coach

Tyler bought `bun.coach` and wants the landing page and the working prototype in one Vercel project (`bun-coach-landing`), with the prototype at `/app`. The old `simmer-prototype.vercel.app` host 301s to bun.coach.

PR #1 (`9788293`, merge `b934058`): allow same-origin microphone (`microphone=(self)`). The old `microphone=()` header blocked Talk.

PR #2 (`599c4f1`, merge `61c229f`): legacy slash-path redirects are 301s, not 308s, so old links don't 404.

## 9 Nov 2026 — Dedicated Resend, welcome email approved

Simmer/Bun uses a dedicated Resend account, not the Moonshots one. Domain `bun.coach` is verified. Sends as `Bun from Simmer <hello@bun.coach>`. Waitlist segment `47aa185f-cccb-4226-b99a-770bac7f26ca`. Welcome email (quiz-result subject, for example "You're a Slow Simmer (here's what that means)") was approved this day. A test email was delivered; contact upsert was not (see `STATE.md`).

## 4 Nov 2026 — Price, creators, commerce, thesis

- Price is **$14.99/month** or **$119.99/year** per couple, justified against couples counseling, without claiming to be therapy. The partner joins free.
- UGC starts commission-only (affiliate), not paying per video. Initially target creators with 5–10k followers, for content at scale and hooks that work.
- Commerce means incremental affiliate flower and gift purchases, not Simmer fulfilling orders.
- Thesis: win couples' trust in the fight moment, then keep them with services. General agents are infrastructure, not core competitors. Positioning is one trusted place for the relationship, separate from a general-assistant feed.

## 4 Nov 2026 — Instant voice start

Bun should launch instantly as a voice coach (third-party interrupt) via a home-screen widget or Siri shortcut when a fight starts. The app opens on a fight-or-chill fork. Not built yet (native work). **Superseded in part on 12 Nov 2026:** both widget and Siri are launch options; the widget word is not "Pause" (Tyler to choose); see the 12 Nov fight-mode flow entry.

## 3 Nov 2026 — Open-weight models for the live coach

The live coach runs on a capable open-weight model, not expensive frontier models. Current pick: `moonshotai/kimi-k2`, fallback `deepseek/deepseek-v3.1`.

## 2026 (standing) — Safety and neutrality

Coaching stays neutral, de-escalates, never takes sides, and is not therapy. Abuse, self-harm, or danger always routes to 988 and the National DV Hotline (1-800-799-7233). This is not optional.
