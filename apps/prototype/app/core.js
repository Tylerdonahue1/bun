/* Simmer core: state, fight log, stage content and pure helpers. No DOM. Loaded by app.js and by the unit tests. */
(function () {
'use strict';
const KEY = 'simmer-couple';
const uid = () => Math.random().toString(36).slice(2, 10);
const DAY = 864e5;

const fresh = () => ({
  v: 1, created: 0, names: { A: '', B: '' }, consent: false, voice: true,
  fights: [],        // real log only: one entry per fight started
  agreements: [],    // { id, text, at, fightId|null, done }
  reminders: [],     // { id, text, due, at, done, kind }
  chat: { A: [], B: [] },
  cur: null,         // the fight in progress (survives a reload)
  postFight: false, paid: false, trialAt: 0, giftIdx: 0,
});

function load(storage) {
  try { const s = JSON.parse(storage.getItem(KEY) || 'null'); if (s && s.v === 1) return { ...fresh(), ...s, names: { ...fresh().names, ...(s.names || {}) }, chat: { A: [], B: [], ...(s.chat || {}) } }; } catch {}
  return fresh();
}
const save = (storage, S) => { try { storage.setItem(KEY, JSON.stringify(S)); } catch {} };

const nm = (S, w) => (S.names && S.names[w]) || (w === 'A' ? 'Partner 1' : 'Partner 2');
const hasNames = S => !!(S.names && S.names.A && S.names.B);
const both = S => hasNames(S) ? `${S.names.A} and ${S.names.B}` : 'you two';
const other = w => (w === 'A' ? 'B' : 'A');
// What the model sees as names: real names, or Partner A/B (the prompt then says "you"/"your partner").
const aiNames = S => ({ A: S.names.A || 'Partner A', B: S.names.B || 'Partner B' });

/* ---- fight lifecycle ---- */
function startFight(S, now = Date.now()) {
  if (S.cur && !S.cur.sealedAt && now - S.cur.start < 6 * 3600e3) return S.cur; // resume a recent one
  const f = { id: uid(), start: now, stage: 1, wind: null, solo: { A: null, B: null }, talk: null, needs: { A: '', B: '' }, sealedAt: 0 };
  S.cur = f;
  S.fights.unshift({ id: f.id, start: now, end: 0, stage: 1, wind: null, sealed: false });
  return f;
}
function logStage(S, patch) {
  if (!S.cur) return;
  const e = S.fights.find(x => x.id === S.cur.id); if (!e) return;
  Object.assign(e, patch, { end: Date.now() });
}
// Stage 3: write the real log entry, the agreement, and an optional reminder.
function sealFight(S, d, now = Date.now()) {
  const f = S.cur || startFight(S, now);
  const e = S.fights.find(x => x.id === f.id);
  const agreement = String(d.agreement || '').trim().slice(0, 200);
  const entry = Object.assign(e, {
    end: now, stage: 3, sealed: true, wind: e.wind || f.wind || null,
    topic: String(d.topic || '').trim().slice(0, 80), repair: String(d.repair || '').trim().slice(0, 60),
    repairDone: !!d.repairDone, agreement, helped: (d.helped || []).slice(0, 6),
    needs: { A: String(f.needs?.A || '').slice(0, 200), B: String(f.needs?.B || '').slice(0, 200) },
  });
  if (agreement) S.agreements.unshift({ id: uid(), text: agreement, at: now, fightId: f.id, done: false });
  if (agreement && d.remindDays) S.reminders.push({ id: uid(), text: `Check in on: ${agreement}`, due: now + d.remindDays * DAY, at: now, done: false, kind: 'agreement' });
  f.sealedAt = now; S.cur = null; S.postFight = true;
  return entry;
}
function endFight(S, now = Date.now()) { // left early (calmed down, didn't finish)
  if (!S.cur) return; logStage(S, { end: now }); S.cur = null; S.postFight = true;
}

/* ---- stage 1 content ---- */
const QS = [
  { k: 'what', q: n => `${n}, in one line, what's going on for you right now? Only you see this. It hides when you finish.`, type: 'text', ph: 'e.g. I feel like I’m not being heard' },
  { k: 'level', q: () => 'How activated are you, from 1 to 10? Ten is about to explode.', type: 'scale' },
  { k: 'body', q: () => 'Where do you feel it in your body? Pick any.', type: 'chips', multi: true, opts: ['Tight chest', 'Hot face', 'Clenched jaw or fists', 'Racing heart', 'Knot in my stomach', 'Shaky', 'Numb or frozen'] },
  { k: 'move', q: () => 'Right now, do you want to move, or to be still?', type: 'chips', opts: ['Move', 'Be still', 'Not sure'] },
  { k: 'mins', q: o => `How long before you could really listen to ${o} again?`, type: 'chips', opts: ['10 min', '20 min', '30 min'] },
];
const PLANS = {
  move: { key: 'move', title: 'Move it out', sayAs: 'moving it out', how: 'A brisk walk, stairs, or shaking it out. Get the charge out of your body first.', cues: ['Keep moving. Long steps.', 'Shake out your hands and shoulders.', 'Breathe out longer than you breathe in.', 'Name five things you can see.', 'You’re doing the hard part. Not texting, not arguing. Just moving.', 'Slow down a little. Notice your breathing.'] },
  breathe: { key: 'breathe', title: 'Slow breathing', sayAs: 'slow breathing', how: 'Somewhere quiet. In for four, out for six. Let the long exhale do the work.', cues: ['In for four.', 'And out for six, slowly.', 'Drop your shoulders.', 'Unclench your jaw and your hands.', 'If the fight replays in your head, let it pass. Back to the breath.', 'One more long breath out.'] },
  ground: { key: 'ground', title: 'Cold water + 5-4-3-2-1', sayAs: 'cold water, then five four three two one', how: 'Cold water on your face, then name 5 things you see, 4 you hear, 3 you can touch.', cues: ['Cold water on your face, or hold something cold.', 'Name five things you can see.', 'Four things you can hear.', 'Three things you can touch.', 'Two slow breaths. You’re here.', 'Wiggle your toes. Feel your feet on the floor.'] },
};
function pickPlan(a) {
  const lvl = +a.level || 5, body = (a.body || []).join(' ').toLowerCase(), mv = a.move || '';
  if (/numb|frozen/.test(body) && mv !== 'Move') return 'ground';
  if (mv === 'Move' || (lvl >= 7 && mv !== 'Be still')) return 'move';
  return 'breathe';
}
const soloMins = a => parseInt(a && a.mins, 10) || 20;
// Neutral summary for the AI: never the free text (that stays on the phone).
const soloSummary = (a, plan, mins) => `Activation ${a.level || '?'} of 10. Body: ${(a.body || []).join(', ') || 'not sure'}. Wants to: ${a.move || 'not sure'}. Ready to listen again in about ${mins} minutes. The app picked: ${PLANS[plan].title}.`;
const WIND = {
  sit: { title: 'Sit still together', mins: 4, opts: [3, 4, 5], every: 30, breath: true,
    intro: 'Sit facing each other, close enough for your knees to touch. No talking about the fight for now. Just look and breathe.',
    cues: ['Soft eyes. Just look at each other. No words needed.', 'Breathe in through your nose for four.', 'And out for six, slow, like fogging a window.', 'Drop your shoulders. Unclench your jaw.', 'If you laugh, that’s fine. That’s your body letting go.', 'Notice your partner breathing. Try to match them.', 'Hand on your belly. Let it rise and fall.', 'Keep looking. You’re on the same team.'],
    end: 'That’s time. Look at each other one more second. Nice work, both of you.' },
  walk: { title: 'Walk it off, together', mins: 10, opts: [10, 15, 20], every: 120, breath: false,
    intro: 'Shoes on, phone in your pocket. Walk side by side, not face to face. I’ll speak up every couple of minutes.',
    cues: ['Side by side. Match your steps.', 'Name five things you can see, out loud. Take turns.', 'Loosen your hands. Shake them out.', 'No fight talk on the walk. Just walk.', 'Breathe out longer than you breathe in.', 'Turn around whenever you’re ready to head back.', 'Slow it down a little. You’re almost back.'],
    end: 'That’s time. Head back. You don’t have to fix anything yet. Just notice if your bodies feel calmer.' },
};

/* ---- stage 2/3 scripted lines (used only when the live model is unreachable) ---- */
function scriptedTalk(step, S, speaker) {
  const s = nm(S, speaker), l = nm(S, other(speaker));
  return ({
    reflect: `From your side, ${s}, that sounded really hard, and it makes sense you’d feel that way. ${l}, can you say back what you heard ${s} say, in your own words?`,
    check: `Thank you, ${l}. ${s}, did that land? Do you feel heard?`,
    clarify: `Got it, ${s}. ${l}, try saying it back once more, just what you heard.`,
    needs: `You both said the hard part, and you both listened. One last thing: each of you, what’s one thing you need next time this comes up?`,
    heat: `It’s heating up again, and that’s okay. Stop for a moment. Three slow breaths together, right now. We can pause and walk for a few minutes if you need it.`,
  })[step] || '';
}
const SEAL_FALLBACK = S => ({ say: `Thank you, ${both(S)}. That took real effort. Before you get back to your night, do one small thing to close it, like a hug.`, agreement: '' });
function parseSeal(text) {
  const t = String(text || '');
  const say = (t.match(/Say:\s*([^\n]+)/i) || [])[1] || '';
  const agreement = (t.match(/Agreement:\s*([^\n]+)/i) || [])[1] || '';
  return { say: say.trim().replace(/^["“]|["”]$/g, ''), agreement: agreement.trim().replace(/^["“]|["”]$/g, '').slice(0, 160) };
}
const REPAIRS = ['A hug', 'A handshake', 'A walk together', 'A glass of wine or tea', 'Say one thing you appreciate', 'Something else'];
const HELPED = ['Time apart', 'Sitting still', 'The walk', 'Saying it back', 'Bun’s timer', 'Naming what we need'];

/* ---- chill side ---- */
// Ideas a couple can say yes to. "Yes" opens a real site in a new tab; Simmer takes no payment and places no order.
const GIFTS = [
  { k: 'flowers', title: 'Send flowers, for no reason', why: 'Small, unprompted gestures count more than big apologies.', cta: 'Yes, find flower delivery', url: 'https://www.google.com/search?q=same+day+flower+delivery+near+me', site: 'Google (flower delivery near you)' },
  { k: 'dinner', title: 'Book a dinner, just you two', why: 'Time that’s on the calendar actually happens.', cta: 'Yes, find a table', url: 'https://www.opentable.com/', site: 'OpenTable' },
  { k: 'treat', title: 'Get their favorite treat delivered', why: 'It says “I was thinking about you” without a speech.', cta: 'Yes, find dessert delivery', url: 'https://www.google.com/search?q=dessert+delivery+near+me', site: 'Google (dessert delivery near you)' },
  { k: 'note', title: 'Leave a note where they’ll find it', why: 'Free, takes a minute, lands for days.', cta: '', url: '', site: '' },
];
const NUDGES = [
  w => `Tell ${w} one specific thing you noticed them do this week.`,
  w => `Ask ${w}: what was the best part of your day?`,
  w => `Six-second kiss when one of you gets home. Really count.`,
  w => `Say thank you to ${w} for something small and boring.`,
  w => `Put your phones in another room for 20 minutes tonight.`,
  w => `Ask ${w}: is there anything on your mind you haven’t said yet?`,
  w => `Plan one thing to look forward to together this week.`,
];
const nudgeFor = (S, now = Date.now()) => NUDGES[Math.floor(now / DAY) % NUDGES.length](hasNames(S) ? S.names.B : 'your partner');

function addReminder(S, text, due, kind = 'custom', now = Date.now()) {
  const r = { id: uid(), text: String(text).trim().slice(0, 140), due: +due || now + DAY, at: now, done: false, kind };
  S.reminders.push(r); return r;
}
const upcoming = (S, now = Date.now(), days = 7) => S.reminders.filter(r => !r.done && r.due <= now + days * DAY).sort((a, b) => a.due - b.due);
function dueLabel(due, now = Date.now()) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const d1 = new Date(due); d1.setHours(0, 0, 0, 0);
  const diff = Math.round((d1 - d0) / DAY);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow';
  return new Date(due).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
// A calendar file for one reminder (opens "Add to Calendar" on iPhone).
function ics(r, now = Date.now()) {
  const f = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = s => String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Simmer//EN', 'BEGIN:VEVENT', `UID:${r.id}@simmer`, `DTSTAMP:${f(now)}`, `DTSTART:${f(r.due)}`, `DTEND:${f(r.due + 15 * 60e3)}`, `SUMMARY:${esc(r.text)}`, 'DESCRIPTION:From Simmer', 'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(r.text)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
// What Bun may remember: only things this couple actually saved.
function memoryText(S) {
  const out = [];
  S.agreements.filter(a => !a.done).slice(0, 4).forEach(a => out.push(`Agreement: ${a.text}`));
  const last = S.fights.find(f => f.sealed);
  if (last) { if (last.helped?.length) out.push(`Last fight, what helped: ${last.helped.join(', ')}`); if (last.wind) out.push(`Last wind-down: ${last.wind}`); }
  return out.join('\n');
}
const fmtDur = ms => { const m = Math.max(1, Math.round(ms / 60e3)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
const WIND_LABEL = { sit: 'Sat still together', walk: 'Walked it off together', solo: 'Wound down separately', skip: 'Skipped the wind-down' };

const api = { KEY, uid, fresh, load, save, nm, hasNames, both, other, aiNames, startFight, logStage, sealFight, endFight, QS, PLANS, pickPlan, soloMins, soloSummary, WIND, scriptedTalk, SEAL_FALLBACK, parseSeal, REPAIRS, HELPED, GIFTS, NUDGES, nudgeFor, addReminder, upcoming, dueLabel, ics, memoryText, fmtDur, WIND_LABEL };
if (typeof window !== 'undefined') window.SimmerCore = api;
if (typeof module !== 'undefined') module.exports = api;
})();
