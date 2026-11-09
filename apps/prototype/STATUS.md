# Pass 6: working prototype (2026-11-09)

Tyler's feedback: the build "looks like a demo". He wants something a couple can actually use tonight, based on the Nov 3 call.

**Live:** https://simmer-prototype.vercel.app. `/` redirects to `/app/`. Production deploy `dpl_9oAWeTNYZRzemX1558D87oBeKcVJ` is READY. The previous one was `dpl_DcxQpCEhJ2PogZjhkKGGsx3u86AC`, which had the same app and an older stage 2 "needs" prompt. Pre-change backup: `/workspace/simmer-prototype-backup-2026-11-09b/`.

**What changed**
- **New `/app/`.**
  - Files:
    - `app/core.js`: state, the fight log and stage content, with no DOM.
    - `app/app.js`: the UI.
    - `app/styles.css`
    - `app/manifest.webmanifest`: Add to Home Screen, plus a "Pause" shortcut on Android.
  - No Screens tab, jump menu, Chat/App switcher, fake data or "coming next" cards.
  - The old click-through demo moved to `/demo/`. It's only linked from Settings with `?dev=1`. `/chat/` is untouched and unlinked.
- **Front door.**
  - First run: a welcome screen, then names for both partners, plus an adult and not-therapy consent. Saved in localStorage key `simmer-couple`.
  - Every later open: the fork, "Are we in a fight, or just here to chill?". It has a Talk button that understands "fight" or "chill", and "Hear Bun".
  - `?pause=1` opens a big Pause button. One tap is needed so iPhone allows speech.
- **Stage 1, wind down** (rebuilt on the earlier logic).
  - Together: sit still (3/4/5 min, breathing orb, spoken cues), or walk it off (10/15/20 min, cues every 2 min).
  - Separately: pass the phone. Each partner gets 5 private questions that aren't read aloud. Answers are dropped on lock; only the plan is kept. Bun's line comes from a neutral summary.
  - Then one shared timer. Both partners confirm "ready", with an option for +5 min.
- **Stage 2, talk it through** (new, live model in `mode:'talk'`).
  - Pick who goes first and a turn length of 1/2/3 min with a countdown.
  - The speaker talks (Web Speech) or types. Bun reflects it as "From your side, X…" and asks the listener to say it back. Bun credits what they caught, and the speaker taps "I feel heard" or "Not quite" (clarify, up to 2 tries). Then they swap.
  - After both turns, Bun gives a neutral two-sided summary and asks each for one need.
  - "We're heating up" gives a scripted line about three breaths. You can also skip to stage 3.
  - Steps are built on the server (`TALK_STEPS`), so a client can't rewrite them. Caps are 36/46 words.
- **Stage 3, seal it** (new). The model (`task:'seal'`) writes a spoken thank-you line and drafts one agreement. Then:
  1. Choose a repair (hug, handshake, walk, wine or tea, appreciation, something else), with "Do it now, I'll wait".
  2. Edit the agreement, with a reminder in 3 or 7 days.
  3. Pick what helped (optional) and give the fight a topic (optional).
  4. Seal. The log entry stores the topic, wind-down, repair, agreement, each partner's need and what helped. The raw conversation is not stored.
- **Chill side**
  - **Home:**
    - Pause tile.
    - Resume a fight in progress.
    - Post-fight Simmer Together card.
    - Reminders coming up.
    - Agreements.
    - A small gesture, where Yes opens a real site: flowers (Google "same day flower delivery near me"), OpenTable, or dessert delivery. There's also "Remind me Friday" and "Another idea".
    - The daily nudge.
  - **Plans:** agreements and reminders (add, done, delete), with "Add to calendar" (an `.ics` file).
  - **Bun:** private 1:1 chat per partner, with voice.
  - **History:** real fights only, with a detail view.
  - **Settings:** names, voice, Add to Home Screen steps, Simmer Together, delete everything, hotlines.
- **Paywall** appears only after a fight (home card) or from Settings.
  - Simmer Together = Bun's memory of saved agreements and what helped. That memory is sent to the model only when the user is on it.
  - No payment is taken.
- **Prompt:** new rule that Bun never accepts one partner's version as fact and reflects it as "from your side…".
- **Safety:** unchanged and still one message at a time.
  - Every typed or spoken line (stage 1 Q1, each stage 2 turn, agreement, topic, reminders, chat) goes through the local check, then the server check and the model review.
  - A flag opens the help screen. "Back to where I was" returns there, and the flagged message isn't kept.

**Verified**
- 28 of 28 unit tests pass. New tests cover:
  - core: fight log, seal parsing, reminders, `.ics`, gift links, plan picking, the summary never carrying free text
  - the talk prompt (neutral framing, steps, caps, memory screening)
  - no scaffolding or fake data
- **Live end-to-end** (`proto-2026-11-09/e2e.mjs`, `live-run.log`) as a fresh couple, Tyler and Max, at 390×844 iPhone:
  - Main fight: welcome → setup → fork → fight → sit still → ready → stage 2 with live Bun (1.5–3 s per reply) → needs → stage 3 (AI agreement draft) → seal → done.
  - Chill path: home → plans → Bun chat → history detail.
  - Separately path: answers stay hidden after lock.
  - "he hit me" in stage 2 opens help, and Back returns to stage 2 with the text cleared.
  - Pause link → Pause screen → tap → stage 1.
  - No console errors and no horizontal overflow.
- **Live stage 2 safety** (`live-safety-talk.log`):
  - 3 of 3 danger cases showed help.
  - 2 of 2 false positives were coached.
  - A "tell him I'm right" request was reflected as "from your side…" with no verdict.

**Still not real**
- Two-phone sync.
- The widget, Siri and lock-screen start (native only).
- Push notifications. Reminders show in-app, or through the calendar file.
- Real voice quality (browser TTS).
- Hands-free turn-taking: each turn needs a tap.
- Accounts and cross-device data.
- Payment.

**Needs a real iPhone check**
- Speech after the first tap.
- `webkitSpeechRecognition` (needs Siri and Dictation on).
- Mic permission prompts.
- The `.ics` download.
- Add to Home Screen.
# Pass 5: audit fixes (2026-11-09)

Live at https://simmer-prototype.vercel.app/app/. Production deploy `dpl_FZxH5U2KtzaTHZGtCHGbzLkwNEXJ` is READY. Earlier deploys today, in order: `dpl_GCe7bJXtktEXHsVim1isj4e2Mb7C` (main fixes) and `dpl_9vmKgVeytD9E1ZB6ZWsVdj88aSvP` (hotline label and cancel copy). Before today the live deploy was `dpl_DxeKDDcW9eutWv1qHbBVVVwvwSRu`. The pre-change tree is backed up at `/workspace/simmer-prototype-backup-2026-11-09/`. The audit is in `audit-2026-11-09/AUDIT.md`, and the before/after shots and re-test logs are in `audit-2026-11-09/fixes/`.

**1. Safety false positives**
- Strict `SAFETY_RE` (identical in `api/_lib.js` and `shared/simmer.js`) now catches only unmistakable phrases. Ambiguous phrases (`AMBIG_RE`) go to the model, which gets a `SAFETY_REVIEW` note and its context.
- A flag applies to that one message. The app shows help (the fsafe screen or the card in chat) and never sets `S.flagged`. Back returns to where you were, and Together stays available. "Turn on private mode" is an opt-in on fsafe. Only onboarding intake "Yes" and that opt-in set `S.flagged`.
- Earlier flagged messages are redacted on the client before sending and again on the server. Bun's earlier safety reply is summarised, and `SAFETY_FOLLOWUP` tells the model to coach normally unless the danger continues.

**2. Separately**
- New pass-the-phone handoff ("Who's holding the phone?").
- Nothing is spoken.
- Q1 says "Only you see this, and it hides when you finish".
- "Hide my answers, pass the phone" locks the answers.
- Unfinished answers are wiped on handoff.
- The AI gets only a neutral summary, with free text sent only when it matches `AMBIG_RE`, for the safety check.
- "This is just between us" is removed.
- Two-phone sync: `/api/room` (used by `/chat/duo.html`) could carry ready/handoff state, which is moderately easy. Not built.

**3. Paywall**
- Removed from rejoin and from "Continue to stage 2". Fight mode is free end to end.
- It shows as a post-fight home card ("See Simmer Together") or before a paid feature (check-in tab, pattern cards).
- Copy:
  - "$141 to $175 without insurance".
  - "Cancel in your subscription settings (on iPhone: Settings › your name › Subscriptions)".
  - Trial dates come from today.

**4. Demo data**
- New users start empty: no names, streak, memory, agreements or fake map bars.
- Sam & Alex load via `?demo=1` or the jump-menu button. `?demo=0` resets.
- Old saves are migrated.
- Pause uses "You two" when there are no names.
- Dates use `addDays`/`fmtDay`/`trialDates`/`nextWeekday`/`greeting`.

**Cheap wins**
- "Get help privately" tap target is 44px tall.
- The chat box is no longer sticky over the hotline card.
- The hotline button reads "Call 1-800-799-7233" on one line.
- Bun word caps: together 24/30, apart 38/46, solo and app 46/55 (soft/hard). The prompts say 45 words at most, with smaller limits per mode.
- The partner fallback is capitalised at the start of a sentence.

**Verified**
- 23 of 23 unit tests pass (up from 15). New tests cover the strict and ambiguous lists, the per-message flag, redaction, the caps, the dates and no hard-coded data.
- Live re-test (`fixes/retest-run.log`):
  - 13 of 13 danger cases showed help: 3 by regex (S3, S4, S8) and 10 by the model.
  - S11, a benign message after a flag, was coached.
  - All 4 false positives were coached: "kill him lol", "cut me some slack", "pushed me to try", "forced me to laugh".
  - All 9 coaching cases (Q1–Q7, plus Q2b) were coached.

**Caveats**
- Stages 2–3 are still placeholders.
- The single-phone handoff relies on the partner looking away.
- Free-tier gateway latency is unchanged; one case took 22 s to first byte.
- The regexes are English-only.
- Some app-mode replies still run 48–52 words because the soft cap ends on the next sentence.
# Pass 4: $14.99 paywall after the first wind-down (2026-11-04, about 1:45 AM PT)

Live at https://simmer-prototype.vercel.app/app/. Production deploy `dpl_DxeKDDcW9eutWv1qHbBVVVwvwSRu` is READY, and the live `app/app.js` sha1 matches local (e46b8aef…). The previous deploy was `dpl_A8gYig5T2MyH4SZ9Xbwpkne4VjbC`.

**What changed:**
- Prices are now $14.99/mo and $119.99/yr ("About $10 a month", "Save 33%" against 12 × $14.99 = $179.88). The 7-day trial timeline and the plan toggle both read from one `PRICE` constant.
- Counseling comparison card: "A year of Simmer costs less than one couples counseling session. US sessions average $141 to $175 out of pocket." Sources are in the footnote (DatingNews 2025 $141, Synchrony 2025 $152, Real Cost Report 2026 ~$175). The lede leads with "Bun there at 11pm when the fight happens".
- Not-therapy line, plus 911, the DV Hotline (1-800-799-7233) and 988, in the paywall fine print.
- Partner joins free: "One subscription covers you both. Alex joins free with your invite."
- **Trigger:** the first time both partners tap Ready on `#/rejoin` (wind-down done), and the couple isn't paid or safety-flagged, "Continue to stage 2" and "We're good for now" open the paywall (`FA['wall-then']`, `S.windWallSeen`, `S.wallFrom`, `S.wallNext`). It shows the eyebrow "You just finished your first wind-down", and Back returns to rejoin. Trial or decline continues to where they were headed (stage 2 or home). After that the buttons behave as before. The onboarding paywall (from the map) is unchanged apart from the new prices.
- Demo only: no account is created and no payment is taken. Fight mode stays free.
- FIGHT-MODEL.md pricing line updated to $14.99/$119.99.

**Verified:** 15 of 15 unit tests pass. Headless Chrome at 390×844 @2x: no page errors, no horizontal overflow, the monthly toggle updates the charge line, and both trial paths land on `#/home` and `#/stage2`. The wall doesn't reappear after it has been seen.

**Shots:** `shots/p4-01-stage1-done.png`, `shots/p4-02-paywall-top.png`, `shots/p4-03-paywall-bottom.png`.

# Pass 3: Fight mode (2026-11-03, about 11:30 PM PT)

Live at https://simmer-prototype.vercel.app/app/. Production deploy `dpl_A8gYig5T2MyH4SZ9Xbwpkne4VjbC` is READY, and the live `app/app.js` sha1 matches local (7f522c40…). The previous fight-mode deploy was `dpl_8nWsgChGBDkLWCyP8LKMFrmRe7eg`. The model, write-up, and parked ideas are in `FIGHT-MODEL.md`.

**Routes:** `#/fork` (returning users land here), `#/fight` (stage 1 hub), `#/pause` (and `?pause=1`), `#/together`, `#/wind/sit`, `#/wind/walk`, `#/solo`, `#/wind/solo`, `#/rejoin`, `#/stage2` (placeholder), `#/fsafe`.

**Real:**
- the fork, with Fight reaching stage 1 in 3 taps or fewer
- the Pause button: Bun speaks right away
- sit-still and walk timers with spoken cues and +5 min
- solo flow: 5 questions by voice or typing, a plan pick, and an AI wind-down line (`task: winddown`, kimi-k2, scripted fallback)
- the come-back nudge
- "ready to come back together?" for both partners
- the safety regex before every answer, routing to the 988 / DV Hotline screen (never spoken)
- the voice on/off toggle

**Faked or placeholder:**
- stages 2 (Talk it through) and 3 (Seal it) are "coming next" cards
- widget and Siri: native only, so the web uses the Pause button
- both partners' readiness is tapped on one device, with no cross-device sync yet
- mic dictation works only where the browser has webkitSpeechRecognition

**Tests:** `node --test test/unit.test.mjs` passes 15 of 15 (new winddown test). Live API on Nov 3 at 11:26 PM PT: `task: winddown` returned a neutral 3-sentence spoken line, header `x-simmer-model: moonshotai/kimi-k2`.

**Shots:** `shots/p3-*.png` (app, 390x844 @2x; p3-20/21 are live). Paper mockups are in `paper-shots/fight-01…09-*.png`, from the "Fight mode" page in *Simmer app designs*.

**Deploy method** (no CLI token on the box): Vercel MCP `upload_file` (sha1 digest, with the base64 body passed as `$file:`) for changed files, then `create_deployment` with the full file manifest (sha + size) for project `prj_VNMXoC5KAPR6Blz0ybq6Ty9et4iO`, target production. Never include STATUS.md, shots/, paper-shots/, or test/.

---

# simmer-prototype status (pass 2, 2026-11-03)

Live: https://simmer-prototype.vercel.app  (`/` landing, `/app/` full app, `/chat/` Apart/Together/Solo chat, `/chat/duo.html` two simulated phones)
Bun: `/api/coach` -> Vercel AI Gateway over OIDC (no key in repo). Open-weight only: `moonshotai/kimi-k2`, fallback `deepseek/deepseek-v3.1`.
Rooms: `/api/room` -> memory + Vercel Blob write-through (free Hobby store `simmer-prototype-rooms`, private). `store:"blob"` in responses.
Deployment: dpl_E7PWRp8c7XHS4aJ6eWmVpGdABLPg (production, READY).
Tests: `npm test` (14 unit, pass). `BASE=https://simmer-prototype.vercel.app GAP_MS=13000 SAVE=test/redteam-results.json node test/redteam.mjs` (21 live cases, 21/21 pass on the final run, results in test/redteam-results.json).

## Coverage vs the research Page ("Couples app: fight coach vs intimacy coach", Product flows)

| Flow | Status | Where / notes |
|---|---|---|
| Fight 1. Discovery (landing promise) | done | `/` "Stop having the same fight" |
| Fight 2. Solo onboarding + topic chips | done | `/app/` splash -> about -> names/pronouns -> relationship -> topics -> style -> when/want/opener (14 steps, animated, progress bar) |
| Not-therapy disclaimer | done | Step 2 requires an "I got it: coaching, not therapy" tick; repeated in consent, Bun header, settings |
| Private safety intake | done | Step 10; any yes -> safe mode (resources, joint features off). Answers never sent to the model or stored in the profile |
| Privacy promises + consent | done | Step 11, three required ticks (18+, AI coach, store on device) |
| Skippable + resumable onboarding | done | Skip on every step (confirm sheet); splash shows "Pick up where you left off, step X of 13" |
| Personalised Bun | done | name, pronouns, partner, together/living, topics, gentle/direct style go into the system prompt (`profileLine`) for app chat, aha, soften and /chat/ |
| Fight 3. Aha + soft start-up + share card | done | live AI aha (falls back to scripted if the gateway is down) |
| Fight 4. Invite partner + Our map | done (simulated) | invite code 7KQ2-DEMO, copy link; map waits for Partner B |
| Partner B join flow | done (simulated) | `#/pjoin` -> own consent -> name/pronouns -> private intake -> own safety check -> done; flagged B gets safe mode, A is never told |
| Default mode choice + previews | done | Step 13 Apart/Together/Solo with mini previews; primer from Bun opens that mode |
| Fight 5. Paywall | partial | screen exists, no real billing (by design: nothing purchased) |
| Fight 6. Heated -> 20-min cool-down -> repair -> debrief | done | cool-down timer, soft start-up rewrite, repair line, debrief |
| Inline "you always/never" flag | done | repair textarea, Bun chat box, /chat/ composer; "Soften it" calls the soften task |
| Together mode (turns, timers, 20:00 breath break, live Bun) | done | `/chat/?start=together`: 2-min turns, reflect-back, "Take 20" breathing ring (in/hold/out cue), live Bun lines + speech |
| Apart on two devices | done | `/chat/duo.html` two iframes on one room (tabs on mobile, side by side on desktop); messages sync via `/api/room` |
| Solo | done | `/chat/` Solo tab and app Bun tab |
| Fight 7. Weekly check-in | done | appreciations, area, action with owner/day, demo calendar card, adds an agreement |
| Agreements + follow-up with history | done | `#/agreements`: happened/sort of/not this time chips, each logged to the agreement and History, undo, archive/swipe |
| Fight 8. Memory, daily nudge, monthly pattern card | done | memory list with forget, nudge on home, `#/pattern` |
| Privacy / settings | done | `#/settings`: what's stored (with counts), AI disclosure, notifications off + previews hidden by default, delete my data (6s undo, then server room deleted) |
| Swipe-to-dismiss with undo | done | History, memory, agreements (>100px swipe) |
| Markdown in Bun replies, <70 words | done | `md()` renderer; persona asks for 60 words and the server hard-caps the stream (`makeCapper`: stop at the first sentence end after 58 words, never past 70; safety replies exempt) |
| Favicon | done | favicon.svg/.ico + apple-touch-icon |
| Closer 18+ (gate, intake, brakes/accelerators, yes/no/maybe, mutual reveal, tonight signal, plan, check-in, pause) | done (single-device demo) | partner side simulated with a demo button; non-explicit content only; pressure language pauses the module |
| Fight 9 / Closer 8. Expansion (chores splitter, money, dates, calendar sync) | missing | only the "a full sink" brake -> fight coach link exists |
| Real accounts, real pairing across devices, push notifications | missing | everything is per-browser localStorage + room id |

## Known gaps (honest)
- Free AI Gateway tier: ~5 requests/min per model per region. Busy moments return empty and the app falls back to scripted Bun. Needs paid credits before any real users.
- Blob is a write-through backup; each function instance trusts its memory copy first, so two instances can briefly disagree. Fine for a demo, not for production (would need KV/Redis with versioning).
- Blob free limits: 10K simple / 2K advanced ops a month; over the limit it stops (no bill) and rooms fall back to memory.
- Onboarding answers are saved locally before the consent step (they never leave the device until consent).
- Partner B, pairing, calendar and notifications are simulated on one device.
- Safety regexes are English-only and keyword-based; the model's [[SAFETY]] token is the second layer.
- No auth, so anyone with a room id can read or delete that room (ids are random). Rooms are treated as expired after 24h, but expired Blob files are not purged yet (needs a cron).
- Red-team checks are regex/heuristic graders on single replies, not human review; a pass means no obvious failure, not proven safety. The first unpaced run had 9 empty replies from gateway 429s.
- Shots: shots/p2-*.png (26 live 390x844 screens from this pass); older pass-1 shots are kept alongside.
