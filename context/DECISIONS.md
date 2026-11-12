# Decisions

Append-only. Newest at the top. If a decision is reversed, add a new entry that supersedes the old one; don't edit the original.

## 12 Nov 2026 — Shared context lives in this repo

Tyler and Iryna each have their own Grok Bot chats (sharing one bot isn't available yet). Project context is kept in `context/` in [Tylerdonahue1/bun](https://github.com/Tylerdonahue1/bun), following the protocol in [`README.md`](README.md). This replaces handing Iryna a one-off onboarding markdown as the long-term source of truth.

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

Bun should launch instantly as a voice coach (third-party interrupt) via a home-screen widget or Siri shortcut when a fight starts. The app opens on a fight-or-chill fork. Not built yet (native work).

## 3 Nov 2026 — Open-weight models for the live coach

The live coach runs on a capable open-weight model, not expensive frontier models. Current pick: `moonshotai/kimi-k2`, fallback `deepseek/deepseek-v3.1`.

## 2026 (standing) — Safety and neutrality

Coaching stays neutral, de-escalates, never takes sides, and is not therapy. Abuse, self-harm, or danger always routes to 988 and the National DV Hotline (1-800-799-7233). This is not optional.
