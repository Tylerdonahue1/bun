# Open questions and parked work

Update in place. When something is decided, append the resolution to [`DECISIONS.md`](DECISIONS.md) and remove it from here.

## Open

- **Resend contacts key.** Signup creates a lead and can send the welcome email, but the contact is not upserted into the waitlist segment. Waiting on the repo owner to paste the full Bun Resend key into `RESEND_CONTACTS_API_KEY` (Production and Preview) and redeploy. Don't rotate keys unless asked.
- **Forwarding inbox** for `hello@bun.coach` was suggested and has not been set up.
- **Keep or cut "Fight mode is always free."** The line is live on the landing page and hasn't been decided.
- **How to show danger help on a shared phone** in Together mode. Don't make help louder on a shared screen without discussing it first.
- **Bun leaning toward one partner.** Watch for it. Neutrality is required. Treat lean as a bug.
- **A real iPhone check** of Talk and the mic on `bun.coach/app/`: speech after the first tap; `webkitSpeechRecognition` (needs Siri and Dictation on); mic prompts; the `.ics` download; Add to Home Screen.

## Not built yet

- Two-phone sync in `/app/`
- Widget, Siri, and lock-screen start
- Push notifications
- Good voice quality (browser TTS today)
- Hands-free turn-taking
- Accounts and cross-device data
- Payment (the paywall card takes none)
- Affiliate links on gesture / gift cards

## Explored, not shipped

- WhatsApp or iMessage: letting people add Bun to their chats. Explored, not shipped.
- TestFlight: eventually, after more checks.

## Parked (from `FIGHT-MODEL.md`)

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
