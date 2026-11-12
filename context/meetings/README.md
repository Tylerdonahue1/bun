# Meeting notes

When a human shares a meeting transcript, file it here and update the rest of `context/` in the same commit. Do this every time, without being asked to repeat the steps.

These are meetings the humans chose to share. Do not dump raw Grok Bot chat transcripts into this folder.

## How to file a meeting

1. Pull `main` and read `context/README.md`, `STATE.md`, `OPEN.md`, and recent journal entries first.
2. Create `context/meetings/YYYY-MM-DD-short-slug.md` from the template below. Use the meeting date the human gave, in their timezone (America/Los_Angeles, PT), not the day you filed it if those differ. If they only gave a month and day, use the current year.
3. Fill every section. Pull out decisions, flow changes, and to-dos — don't only paste the transcript. Quote the human when a wording choice matters. Note speech-to-text errors in the summary by using the clear intended meaning, and leave the Transcript section verbatim.
4. If the transcript looks cut off, say so at the top of the file and do not invent an ending.
5. Participants: use the list they provided. If the dialogue clearly includes someone they didn't list, note that as an observation, and don't invent a role or last name.
6. Update the living files in the same commit:
   - Append new decisions to `DECISIONS.md` (don't rewrite old ones). Link the meeting file.
   - Move resolved open questions out of `OPEN.md` and into `DECISIONS.md`. Add new open questions and to-dos to `OPEN.md`.
   - Update `STATE.md` if what's next or what's agreed has changed. Keep it short, and point at the meeting file.
   - Update `PRODUCT.md` only when a durable fact changed (price, modes, safety, a confirmed flow rule). Date the change.
   - Append `journal/YYYY-MM-DD-<yourname>.md` with a short note and a link to the meeting file.
7. Commit **only** `context/` with `context(<name>): log YYYY-MM-DD <meeting short title>`. Push context-only to `main`.
8. Tell your human what you filed, with the commit or PR link, and list the main decisions and to-dos. Don't start implementing the work unless they asked.

## File template

Copy this into a new `YYYY-MM-DD-short-slug.md`:

```markdown
# [Meeting title]

- **Date:** [weekday] [D] [Month] [YYYY] ([timezone])
- **Participants:** [as given; note any additional speakers observed]
- **Source:** pasted transcript / file / link
- **Filed:** [date and zone], by [who]
- **Complete?** yes / no — [if no, where it cuts off]

## Context

What this meeting was for, what they were looking at (designs, a prototype, a doc), and any prior decision it continues.

## Decisions

Agreed calls only. One bullet each, specific enough that a bot who wasn't in the room can follow them. Link competing options that were rejected, and say why.

## Agreed flow or changes

The resulting product or design, in order. A short diagram is fine when a flow is the point. Call out what is not built yet.

## To-dos

- [ ] [task] — [owner if they took it, otherwise unassigned]
Parked or later items go in a separate short list, not mixed with this meeting's work.

## Open questions

Unresolved questions from the meeting. These should also land in `OPEN.md`.

## Transcript

Verbatim, as shared. Do not clean up speech-to-text. If it was cut off, end with a one-line note.
```
