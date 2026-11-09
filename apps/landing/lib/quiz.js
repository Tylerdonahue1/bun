// Shared quiz definition + scoring. Used by the browser (index) and the server (/api/lead) so the
// stored result type is always recomputed server-side from whitelisted answers.
// Types: flash (Flash Fry), pressure (Pressure Cooker), simmer (Slow Simmer), sweetsour (Sweet & Sour), souffle (Overthinker's Soufflé)

export const QUESTIONS = [
  { id: 'style', q: 'In a fight, you are mostly…', sub: 'Be honest. Bun has seen it all.', opts: [
    { id: 'volcano', e: '🌋', t: 'The Volcano', d: 'I erupt. Then I’m weirdly fine.', s: { flash: 3, pressure: 1 } },
    { id: 'ghost', e: '👻', t: 'The Ghost', d: 'I go quiet and vanish to another room.', s: { pressure: 2, sweetsour: 2 } },
    { id: 'lawyer', e: '⚖️', t: 'The Lawyer', d: 'Exhibit A: the dishes. Exhibit B: also the dishes.', s: { souffle: 3, simmer: 1 } },
    { id: 'therapist', e: '🛋️', t: 'The Therapist-in-Training', d: '“What I’m hearing is…”', s: { souffle: 3, sweetsour: 1 } },
  ] },
  { id: 'trigger', q: 'What usually starts it?', sub: 'Pick the classic.', opts: [
    { id: 'dishes', e: '🍽️', t: 'The dishes', d: 'And who “always” does them.', s: { simmer: 2 } },
    { id: 'phones', e: '📱', t: 'Phones', d: 'You’re scrolling. I’m talking.', s: { sweetsour: 1, flash: 1 } },
    { id: 'inlaws', e: '👵', t: 'In-laws & family', d: 'The holiday schedule. Enough said.', s: { pressure: 2 } },
    { id: 'money', e: '💸', t: 'Money', d: 'That purchase. You know the one.', s: { souffle: 2, pressure: 1 } },
    { id: 'tone', e: '🎻', t: '“The tone”', d: 'It’s not what you said. It’s how.', s: { flash: 2 } },
    { id: 'time', e: '🗓️', t: 'Plans & time', d: 'Who’s late, who forgot, who said yes.', s: { simmer: 1, sweetsour: 1 } },
  ] },
  { id: 'when', q: 'When do fights usually happen?', sub: '', opts: [
    { id: 'night', e: '🌙', t: 'The 11pm special', d: 'Tired, in bed, suddenly very awake.', s: { flash: 1, simmer: 1 } },
    { id: 'car', e: '🚗', t: 'In the car', d: 'Trapped together, GPS judging.', s: { flash: 2 } },
    { id: 'hangry', e: '🥪', t: 'Hangry hour', d: 'Right before dinner. Every time.', s: { flash: 2 } },
    { id: 'text', e: '💬', t: 'Over text', d: '“k.”', s: { pressure: 1, souffle: 2 } },
    { id: 'random', e: '🎲', t: 'Out of nowhere', d: 'A normal Tuesday, then boom.', s: { pressure: 2 } },
  ] },
  { id: 'cool', q: 'When it gets heated, you need…', sub: '', opts: [
    { id: 'space', e: '🚪', t: 'Space first', d: 'Let me cool off, then we talk.', s: { pressure: 1, simmer: 1 } },
    { id: 'now', e: '🗣️', t: 'To talk it out now', d: 'I can’t sleep on an unfinished fight.', s: { flash: 1, souffle: 1 } },
    { id: 'mismatch', e: '🧲', t: 'One of us needs space, one needs to talk', d: 'That’s… kind of the whole problem.', s: { sweetsour: 4 } },
    { id: 'neither', e: '🌀', t: 'Honestly? We don’t really cool off', d: 'It just fades. Eventually.', s: { simmer: 3 } },
  ] },
  { id: 'end', q: 'How do fights usually end?', sub: '', opts: [
    { id: 'makeup', e: '💋', t: 'Make-up hug', d: 'Fast and sweet.', s: { flash: 3 } },
    { id: 'silent', e: '🤐', t: 'Silent treatment', d: 'Until someone cracks.', s: { pressure: 3 } },
    { id: 'caves', e: '🏳️', t: 'Someone caves', d: 'Usually the same someone.', s: { sweetsour: 2, simmer: 1 } },
    { id: 'drop', e: '🫥', t: 'We just… stop talking about it', d: 'Filed under “later.” Never opened.', s: { simmer: 3 } },
    { id: 'resolve', e: '🦄', t: 'An actual resolution', d: 'The rare unicorn.', s: { souffle: 2 } },
  ] },
  { id: 'recover', q: 'How long until things feel normal?', sub: '', opts: [
    { id: 'minutes', e: '⚡', t: 'Minutes', d: 'Blink and we’re fine.', s: { flash: 3 } },
    { id: 'hours', e: '⏳', t: 'A few hours', d: 'Dinner is a little quiet.', s: { souffle: 1, sweetsour: 1 } },
    { id: 'sleep', e: '😴', t: 'Sleep on it', d: 'Morning-us is nicer.', s: { simmer: 2 } },
    { id: 'days', e: '📆', t: 'Days', d: 'It lingers like garlic.', s: { pressure: 3 } },
  ] },
  { id: 'repeat', q: 'Is it the same fight on repeat?', sub: '', opts: [
    { id: 'same', e: '🔁', t: 'Same plot, every time', d: 'We could do it from memory.', s: { simmer: 3 } },
    { id: 'hits', e: '💿', t: 'A few greatest hits', d: 'Three songs, on rotation.', s: { sweetsour: 1, souffle: 1 } },
    { id: 'new', e: '✨', t: 'Always new material', d: 'We’re very creative.', s: { flash: 2 } },
  ] },
  { id: 'safe', q: 'Last one, real talk: do fights ever leave you feeling scared or unsafe?', sub: 'Your answer here is never saved.', safety: true, opts: [
    { id: 'no', e: '🙂', t: 'No, just frustrated', d: '', s: {} },
    { id: 'loud', e: '🔊', t: 'No, it just gets loud sometimes', d: '', s: {} },
    { id: 'yes', e: '💛', t: 'Sometimes, yes', d: '', s: {}, unsafe: true },
    { id: 'skip', e: '🤫', t: 'I’d rather not say', d: '', s: {} },
  ] },
];

export const TYPES = {
  flash: { name: 'The Flash Fry', emoji: '🍳', tag: 'Hot, fast, and over before the toast pops.',
    insight: 'You two heat up quickly, but you also come back quickly. That bounce-back is a real strength. The risk is the 30 seconds in the middle, when something gets said that sticks longer than the fight did.',
    bun: 'Bun’s Pause button is built for you: one tap, and Bun talks you both down for a few minutes before the thing you can’t take back comes out. Then a 5-minute “talk it through” so it doesn’t come back next week.',
    tonight: 'Pick a pause word together tonight, while you’re calm. Either of you can say it, no questions asked.' },
  pressure: { name: 'The Pressure Cooker', emoji: '🫕', tag: 'Lid on tight, steam building, then whoosh.',
    insight: 'You two are good at keeping the peace, sometimes for too long. Small things get stored instead of said, so when it finally comes out it’s about ten things at once. Nobody’s wrong for that. It’s just a lot of steam.',
    bun: 'Bun helps you let a little steam out early: a private “wind down separately” check-in for each of you, then turns where each person gets to finish a thought. Small, regular, low-heat.',
    tonight: 'Try a 5-minute “one small thing” chat: each of you names one tiny thing from this week. No fixing, just hearing.' },
  simmer: { name: 'The Slow Simmer', emoji: '🍲', tag: 'Never boiling over. Never quite off the stove.',
    insight: 'Your fights don’t explode, they linger. And it’s often the same one, reheated. That usually means there’s a need underneath that hasn’t been named out loud yet. Not a character flaw, just an unfinished recipe.',
    bun: 'Bun walks you through the full loop: wind down, talk it through, then “seal it” with one small agreement you both wrote, saved so next time you start from there instead of from scratch.',
    tonight: 'Ask each other: “What do you think our usual fight is really about?” Just listen to the answer.' },
  sweetsour: { name: 'The Sweet & Sour', emoji: '🥢', tag: 'One of you needs space. One needs to talk. Both are valid.',
    insight: 'This is one of the most common patterns there is: one partner leans in, the other steps back, and each move makes the other one do more of it. Neither of you is doing it wrong. You just have different cooling-off settings.',
    bun: 'Bun gives the one who needs space a real pause (with a time on it), and gives the one who needs to talk a promise that it’s coming. Then it runs the talk so both of you feel heard.',
    tonight: 'Agree on a break length, like 20 minutes. The one stepping away says when they’ll be back. Then they come back.' },
  souffle: { name: 'The Overthinker’s Soufflé', emoji: '🧁', tag: 'Rises beautifully. Collapses if anyone pokes it.',
    insight: 'You two can really talk. Sometimes too much: the fight becomes a debate about the fight, and winning the argument quietly replaces feeling understood. Big brains, big hearts, occasionally a courtroom.',
    bun: 'Bun swaps the debate for turns: each of you speaks, the other says back what they heard, and Bun reflects both sides without ever picking one. Less proving, more getting it.',
    tonight: 'Next disagreement, try this before you reply: “So what you’re saying is…” and check you got it right.' },
};
export const TYPE_ORDER = ['simmer', 'sweetsour', 'pressure', 'flash', 'souffle']; // tie-break order

// answers: { [questionId]: optionId }. Returns { valid, clean, type, unsafe }.
export function score(answers) {
  const clean = {}; const tot = Object.fromEntries(TYPE_ORDER.map(k => [k, 0])); let unsafe = false;
  for (const q of QUESTIONS) {
    const a = answers && answers[q.id];
    const o = q.opts.find(x => x.id === a);
    if (!o) continue;
    if (o.unsafe) unsafe = true;
    if (!q.safety) clean[q.id] = o.id; // safety answer is never stored
    for (const [k, v] of Object.entries(o.s)) tot[k] += v;
  }
  const answered = Object.keys(clean).length;
  const type = TYPE_ORDER.reduce((best, k) => (tot[k] > tot[best] ? k : best), TYPE_ORDER[0]);
  return { valid: answered === QUESTIONS.filter(q => !q.safety).length, clean, type: unsafe ? null : type, unsafe, totals: tot };
}
