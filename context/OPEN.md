# Open questions and parked work

Update in place. When something is decided, append the resolution to [`DECISIONS.md`](DECISIONS.md) and remove it from here.

## From the 12 Nov 2026 fight-mode flow meeting

Agreed decisions are in [`DECISIONS.md`](DECISIONS.md) and the [meeting notes](meetings/2026-11-12-fight-mode-flow.md). These are still open, and the flow is not built yet.

- **Widget button wording.** Not "Pause." Tyler will choose.
- **Can Siri skip the lock-screen "Open Simmer or Stop" prompt** and go straight into the app? Keep the current lock-screen design until that's proven.
- **Separately questionnaire.** Needs to be written. Voice or text, same questions; 3 of 5 is enough. Must differ from Together's three spoken Stage 2 questions, because choosing to separate is more intense.
- **Together's three Stage 2 questions.** Bun asks them one by one, taking turns, and they feed the method. Exact questions were not written in the meeting.
- **Copy** for the new windows: safe space, "We're calmer," Sit Still vs Walk it Off (including the short time descriptions).
- **One-hour follow-up vs. a lighter "want to reflect?" push** into Chill: both were liked; which ships first is not locked. Also whether completing it is required for a fight's history to be "complete," versus postpone / "no feedback."
- **Log UI** beyond "it's in the menu, search by date and topic."
- **Two-phone push and session-ID handoff** — agreed in principle (Stage 2 resumes on the starter's phone), not built.

### Design to-dos from that meeting (unassigned unless noted)

- Add the Together Sit Still vs Walk it Off window.
- Add the Separately "find a safe space / click start" window, then the quiz. Title like "Tyler with Bun."
- Revise Walk it Off: press start when outside, 10 minutes, suggestion around minute 3–4.
- Unify Together come-back into one "We're calmer" screen, then auto-advance to Stage 2.
- Put Talk it through in the design flow through close.
- After Separately, auto-resume Stage 2 on the starter's phone — no "whose phone?" prompt.
- Shared history in the menu, with automatic summaries and stored wording / commitments.
- One-hour post-fight reflection (or the lighter push).

The meeting transcript cuts off at "How do we then work on this? Well, first thing, just" — there may be more.

## Open

- **Resend contacts key.** Signup creates a lead and can send the welcome email, but the contact is not upserted into the waitlist segment. Waiting on the repo owner to paste the full Bun Resend key into `RESEND_CONTACTS_API_KEY` (Production and Preview) and redeploy. Don't rotate keys unless asked.
- **Forwarding inbox** for `hello@bun.coach` was suggested and has not been set up.
- **Keep or cut "Fight mode is always free."** The line is live on the landing page and hasn't been decided.
- **How to show danger help on a shared phone** in Together mode. Don't make help louder on a shared screen without discussing it first.
- **Bun leaning toward one partner.** Watch for it. Neutrality is required. Treat lean as a bug.
- **A real iPhone check** of Talk and the mic on `bun.coach/app/`: speech after the first tap; `webkitSpeechRecognition` (needs Siri and Dictation on); mic prompts; the `.ics` download; Add to Home Screen.

## Not built yet

- The 12 Nov 2026 agreed fight-mode flow (see above)
- Two-phone sync in `/app/`
- Widget, Siri, and lock-screen start
- Push notifications
- Shared fight history / log
- One-hour post-fight follow-up
- Good voice quality (browser TTS today)
- Hands-free turn-taking
- Accounts and cross-device data
- Payment (the paywall card takes none)
- Affiliate links on gesture / gift cards

## Explored, not shipped

- WhatsApp or iMessage: letting people add Bun to their chats. Explored, not shipped.
- TestFlight: eventually, after more checks.

## Parked (from `FIGHT-MODEL.md` and the 12 Nov meeting)

- Chill mode (explicitly future, 12 Nov 2026).
- Mid-week "direct to log" of feelings when not in a fight, for weekly check-ins (useful, not now).
- Step / progression indicator UI (liked, not the focus right now).
- Intensity ratings in the log (possible later, via voice tone).
- An indirect onboarding quiz about how each partner behaves when upset.
- The wider relationship-assistant vision (a pitch story, not the product).

## Launch and marketplace (plan, not started)

Summarised from the customer-acquisition playbook (12 Nov 2026). The listing price and Custom GPT date came from playbook notes, not a re-check of the live Page.

- **Main bet:** Apple App Store. Native or Capacitor iOS app with a real $14.99 in-app purchase, plus Siri, App Intents, and the widget.
- **Cheap AI directories first:** Product Hunt, There's An AI For That (about $49 basic listing), Futurepedia.
- **One remote MCP server around `/api/coach`**, for ChatGPT and Claude, **awareness only**. OpenAI doesn't allow selling digital subscriptions inside ChatGPT apps. Privacy and discreet crisis routing are harder inside host apps.
- **Don't build a Custom GPT** — they retire on 11 December 2026.
- **High risk:** anything that reads as mental-health advice in a listing.
- **Parked:** WhatsApp/Meta, Gemini, Copilot, Character.ai, and the Grok Bot Marketplace (wrong audience).

## Growth (intent, not started)

UGC: start with creators who have 5–10k followers. Pay affiliate commission first, not per video.
