# Product

Durable facts about Simmer / Bun. Last updated 12 November 2026. For what's live or broken right now, see [`STATE.md`](STATE.md).

## What it is

Simmer is an AI relationship-coaching app for couples. **Bun** is the coach: a warm, round, slightly blushing bun. Bun helps couples de-escalate a fight while it's happening, understand each other, and repair afterwards.

Simmer is **coaching, not therapy**, and it is for adults (18+).

**Core loop:** when a couple is mid-fight, get both partners calmer within minutes without taking sides, then help them talk. Fight mode has three stages:

1. **Wind down.** Get both people back to baseline.
2. **Talk it through.** Timed turns. Bun reflects each side as "From your side…" and the listener says it back.
3. **Seal it.** One small repair, one agreement, an optional reminder, and a log entry.

**Fight-or-chill fork.** Returning users open on "Are we in a fight, or just here to chill?" Fight goes to stage 1. Chill goes to home (reminders, agreements, a daily nudge, small gesture ideas, and a private 1:1 with Bun).

## Modes

| Mode | Meaning | Where it lives |
| --- | --- | --- |
| Apart | Separate phones, shared group chat with Bun | `/chat/` (older). Two-phone sync is not real yet in `/app/`. |
| Together | One phone on the table, in person | `/app/` stage 1 (sit still, walk it off) and stage 2 Talk. Also `/chat/`. |
| Separately | Pass the phone, private questions | `/app/` stage 1 |
| Solo | One partner preps or vents privately | `/app/` Bun tab, and `/chat/` Solo |

## Voice and instant start

The direction is a live voice coach that can step in as a third party, via a native iOS home-screen or lock-screen widget (one Pause button) and a "Hey Siri, start Simmer" shortcut. A web app can't start instantly mid-fight. On the web, the stand-in is a big Pause button and the `?pause=1` deep link. The prototype speaks through the browser (SpeechSynthesis) and listens through Web Speech.

Use a **capable open-weight model**, not an expensive frontier model. Current models: primary `moonshotai/kimi-k2`, fallback `deepseek/deepseek-v3.1`, via Vercel AI Gateway. A later upgrade to `kimi-k2.6` / `deepseek-v4-pro` is a plan, not done.

## Positioning, price, commerce

Win trust in the fight moment, then keep couples with broader relationship services. If stage 1 doesn't clearly work on real couples, nothing else will save it. The wider assistant vision (gifts, dates, cycle-aware nudges, family) is a pitch story, not the current product.

**Price:** $14.99/month or $119.99/year per couple. The partner joins free. Justified against one couples-counseling session, without claiming to be therapy. The prototype shows a paywall card but takes no payment.

The live landing currently says "Fight mode is always free." Whether to keep that line is still open — see [`OPEN.md`](OPEN.md).

**Commerce** means affiliate or partner links for *extra* flower, gift and date purchases. Simmer does not fulfil orders. Affiliate links are not wired up yet.

General AI agents (Instinct, Muse, and similar) are infrastructure, not core competitors. A related "Instinct for Couples" idea exists; keep it distinct from Simmer.

## Coach rules (non-negotiable)

The live prompt is `apps/prototype/api/_lib.js`. In short:

- Strictly neutral. Never say or imply who is right. Never take a side. If asked "who's right?", the loop is the problem, not either person.
- Never accept one partner's version of events as fact. Reflect as their experience ("From your side…"), never as something the other partner did.
- Coaching, not therapy. Never diagnose (no "narcissist", "gaslighting", "toxic", "attachment disorder", "abusive" as a label for a partner, no mental-health labels).
- De-escalate when things are heated. Offer a 20-minute break or a softer restart.
- Gottman-informed: soft start-ups, repair attempts, flooding breaks, speaker-listener turns.
- Short replies. 18+, with teen referral to loveisrespect.
- Never reveal what one partner said privately to the other.

If Bun leans toward one partner, treat it as a bug, fix it, and run the red-team (`apps/prototype/test/redteam.mjs`).

## Safety (non-negotiable)

Abuse, coercive control, fear of a partner, threats, violence, sexual coercion, self-harm, suicidal thoughts, or harm to kids or pets: stop coaching and route to real help.

- Immediate danger: 911
- National Domestic Violence Hotline: 1-800-799-7233 (or text START to 88788)
- 988 Suicide & Crisis Lifeline: call or text 988

The live wording is `SAFETY_TEXT` in `_lib.js`. Detection has three layers (`SAFETY_RE`, `AMBIG_RE`, and a model `[[SAFETY]]` token). `SAFETY_RE` must stay identical in `_lib.js` and `shared/simmer.js`. The safety screen is never read aloud. Help on a shared phone must stay discreet — how to show it is still open.

Don't weaken this, and don't call Simmer therapy, in the app, in copy, or in store listings.

## Brand

Warm, playful, never clinical or preachy. Fonts: Fraunces (display) and Figtree (body). Palette: paper `#FFF4E6`, ink `#2B1A12`, tomato `#B8361C`, butter `#F6C453`, cool teal `#1D5E5A`.

Landing voice (live): "It's 11:42pm. You're both right. Now what?" / "Bun breaks up your fights. Not your relationship." / "Never picks a side. Never says 'calm down.'"

## People

- **Tyler Donahue** co-builds Simmer, owns the GitHub repo (`Tylerdonahue1`) and the Vercel team, and has made the product decisions recorded in `DECISIONS.md`.
- **Max** co-builds Simmer with Tyler. Don't guess a last name or title.
- **Iryna** is joining to work on the app. No role is written down; don't assume one.

Don't email, message, or post to anyone unless your human asks for that specific message.
