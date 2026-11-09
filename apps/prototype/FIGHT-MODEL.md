# Simmer: Fight mode model

Written Nov 3, 2026 (PT), after the Nov 3 Simmer call. This covers what's built in the web prototype and what's parked for later.

## 1. The 3 stages

| Stage | What it's for | Status in the prototype |
|---|---|---|
| **1. Wind down** | Get both nervous systems back to baseline before anyone tries to talk it out. | **Built** (`#/fight`, `#/pause`, `#/together`, `#/wind/sit`, `#/wind/walk`, `#/solo`, `#/wind/solo`, `#/rejoin`) |
| **2. Talk it through** | Structured turn-taking: each person says what happened for them and the other says it back. Bun is the referee, never the judge. | **Built** (Nov 9): `#/f2`, live Bun referee (`mode:"talk"`) |
| **3. Seal it** | Close the loop: one small repair, one thing to try next time, and a log entry. | **Built** (Nov 9): `#/f3`, repair + agreement + reminder, saved to history |

Rules for every stage: Bun stays neutral and never hints at who's right. It's coaching, not therapy. A safety check runs before every reply, and anything that sounds like danger goes straight to the help screen (988, and the National DV Hotline at 1-800-799-7233). The safety screen is never read aloud.

## 2. The fork (first thing on open)

- **First run:** onboarding as before. It ends with a "We're in a fight right now" escape hatch.
- **Returning users:** the app opens on the fork, "Are we in a fight, or just here to chill?"
  - **Chill** goes to home (check-ins, loop, patterns).
  - **Fight** goes to stage 1. That's 1 tap from the fork, or 1 tap from the home-screen Pause tile and the "We're in a fight" button. Either way it's 3 taps or fewer to a running wind-down.
- **Pause** (`#/pause`, or `?pause=1`): a big button that makes Bun start talking right away. It's the web stand-in for the widget and Siri (see 4).

## 3. Stage 1 options

### Together (same room)
- **Sit still:** eye contact plus paced breathing on a 3–5 minute timer (4 min by default). Bun speaks the breathing cues. You can add 5 more minutes or tap "We're calmer."
- **Walk it off:** a timer (10 min) and voice cues every so often ("Name three things you can see…"). The phone can stay in a pocket.

### Separately (each on their own)
- Bun asks about **5 short questions** by voice or typing: how hot it is (0–10), what you need, where you feel it in your body, and so on. Your answers stay private to you.
- Bun picks a wind-down (move, breathe, or ground) and a length, and says one neutral line about it. That line comes from the AI (`task: winddown`) with a scripted fallback.
- When the timer ends, Bun **nudges each partner back**: "Time to come back?" You can say you're ready or ask for 5 more minutes.

### End of stage 1
- Both partners confirm **"Ready to come back together?"**, then hand off to the stage 2 placeholder.
- In the prototype, both confirmations are tapped on one phone. A real build would sync this across two phones, just as the duo chat room already does.

### Voice
- Bun's lines are spoken with the browser's built-in speech (SpeechSynthesis). Answers can be dictated where the browser supports Web Speech recognition (Chrome, Safari). Everything falls back to on-screen text, and there's a voice on/off toggle on every fight screen.

## 4. The instant-start problem

Mid-fight, nobody is going to unlock their phone, find an app, and dig through menus. Fight mode only works if it starts in about one second.

- **Real answer (native app only):** an iOS home-screen / lock-screen **widget** with one Pause button (Shazam-style), a **"Hey Siri, start Simmer"** shortcut through App Intents, and maybe the Action button or a Live Activity so Bun keeps talking with the phone locked. A web app can't do any of this.
- **Web prototype answer:** a big **Pause** button that's always one tap away: on the fork, on home (a Pause tile), on the splash screen, and through the `?pause=1` deep link. Tapping it starts Bun speaking right away.
- Paper mockups of both native moments are in the "Fight mode" page of *Simmer app designs*, saved as `paper-shots/fight-01-widget-pause.png` and `paper-shots/fight-02-siri-lockscreen.png`.

## 5. Parked ideas (not built)

- **Indirect onboarding quiz:** learn how each person behaves when upset (needs space vs. needs to talk now, goes quiet vs. gets loud, walks away vs. follows) through scenario questions instead of labels. Bun would use this to pick together or separately and the right wind-down without asking mid-fight.
- **Seal-it log:** each stage 3 writes a short private entry: the topic, what helped, and the repair. Bun then has context next time ("Last time a walk helped more than sitting still").
- **Long-term assistant vision:** a relationship assistant that does more than fights. Gift and date ideas, cycle-aware nudges (opt-in, handled carefully), positive check-ins ("tell them one thing you liked today"), family relationships beyond couples. $14.99/mo or $119.99/yr per couple (partner joins free; priced against a $141–$175 couples counseling session, without claiming to be therapy), with partner commissions on gifts and dates.

## 6. Blunt caveat

The broad assistant vision is a **pitch story, not the product**. The product is: when a couple is mid-fight, Simmer gets them both calmer in minutes, without taking sides, and then helps them talk. If stage 1 doesn't clearly work on real couples, gifts, dates, and cycle nudges won't save it, and they would turn Simmer into a generic reminder app. Build and test the fight loop (stages 1→3) first. Treat everything else as upside to mention, not roadmap to staff.
