/* Simmer shared client: live coach streaming, safety screen, version switch. Page views use Vercel Web Analytics. Fight content is not sent there. */
(() => {
'use strict';
// Strict pre-check: only unmistakable danger. Anything merely ambiguous ("I could kill him lol", "cut me some slack")
// goes to the model, which judges it in context (see AMBIG_RE + the safety-review note on the server).
const SAFETY_RE = new RegExp([
  String.raw`\b(kill|hurt|harm|cut)\s+my ?self\b`, String.raw`\bkms\b`, String.raw`\bsuicid`, String.raw`\bend (it all|my life)\b`, String.raw`\bwant(ed)? to die\b`, String.raw`\bdon'?t want to (live|be alive)\b`, String.raw`\bself[- ]?harm`, String.raw`\boverdos(e|ed|ing)\b`,
  String.raw`\bbetter off without me\b`, String.raw`\b(no|any) (point|reason) (in |to )?(living|live|going on)\b`, String.raw`\bwish i (was|were) (dead|never born)\b`, String.raw`\bsleep and (not|never) wake up\b`, String.raw`\bnever wake up again\b`,
  String.raw`(?<!\b(it|that|this|reality|which) )\b(hit|hits|hitting|punched|punches|punching|slapped|slaps|slapping|choked|chokes|choking|strangled|strangles|kicked|kicks)\s+(me|her|him)\b(?!\s+(up|back|out|off)\b)`,
  String.raw`\b(pushed|pushes|shoved|shoves|threw|throws)\s+(me|her|him)\s+(down|against|onto|into (a |the )?(wall|door|floor|ground|table|counter)|to the (ground|floor)|down the stairs)\b`,
  String.raw`\brap(e|ed|es|ing)\b`, String.raw`\bsexually assault`, String.raw`\bforced (himself|herself) on me\b`, String.raw`\bforc(ed|es|ing) me to have sex\b`,
  String.raw`\b(afraid|scared|terrified) (of|for) (him|her|them)\b(?=\s*([.,!?;]|$|\b(and|but|so|when|because|right|now|tonight|lately|sometimes|honestly)\b))`, String.raw`\b(afraid|scared|terrified) (of|for) my (partner|husband|wife|boyfriend|girlfriend|bf|gf)\b`, String.raw`\b(scared|afraid|fear) for my (life|safety)\b`,
  String.raw`\bthreaten(ed|s|ing)? (to )?(kill|hurt|take (the|my|our) kids)\b`, String.raw`\b(gun|knife|weapon)\b.*\b(at me|threat|pointed)\b`, String.raw`\b(said|says|told me) (he|she)('?d| would|'?ll| will) kill (me|himself|herself)\b`,
  String.raw`\b(hurt|hurts|hurting|kill|kills|kicked|kicks|hit|hits|harm|harms|drown|poison)\s+(the|my|our|his|her)\s+(dog|cat|pet|puppy|kitten)s?\b`,
  String.raw`\b(won'?t|wouldn'?t|doesn'?t|didn'?t) let me (leave|see (my )?(friends|family|sister|brother|mom|dad|parents)|have (any |my own )?money|use my phone)\b`,
].join('|'), 'i');
// Ambiguous signals: never auto-flagged, but the server tells the model to judge them carefully in context.
const AMBIG_RE = new RegExp([
  String.raw`\bkill(s|ed|ing)?\s+(you|him|her|me|them)\b`, String.raw`\b(cut|hurt|harm)s?\s+me\b`, String.raw`\b(pushed|pushes|shoved|forced|forces|forcing|made)\s+me\b`,
  String.raw`\b(hit|hits|beat|beats|kicked|grabbed|grabs|threw|throws|slammed|choke|strangle)\b`, String.raw`\b(die|dead|dying)\b`, String.raw`\bcan'?t go on\b`, String.raw`\b(not|don'?t want to) be here\b`, String.raw`\bwake up\b`, String.raw`\bdisappear\b`,
  String.raw`\b(scared|afraid|terrified|fear|unsafe)\b`, String.raw`\bthreat`, String.raw`\b(gun|knife|weapon)\b`, String.raw`\b(won'?t|wouldn'?t) let me\b`,
  String.raw`\b(checks?|tracks?|monitors?|reads?) my (phone|location|texts|messages|email)\b`, String.raw`\btakes? my (paycheck|money|phone|keys|car)\b`, String.raw`\bcan'?t see my (friends|family|sister|brother|mom|dad|parents)\b`,
  String.raw`\bif i (leave|go)\b`, String.raw`\b(never see|take) (the|my|our) (kids|children|son|daughter)\b`, String.raw`\b(punch|punched|punches) (the|a) wall\b`, String.raw`\b(shaking|trembling)\b`,
].join('|'), 'i');
const HARSH_RE = /\byou (always|never)\b|\bwhat'?s wrong with you\b|\bwhatever\b\.?$|\bshut up\b/i;
/* Pressure / coercion language for the 18+ connection module: pauses the module and shows private resources. */
const PRESSURE_RE = /\b(you owe me|owes me|make (her|him) (do|have)|won'?t take no|doesn'?t take no|guilt(s|ed)? me into|pressur(e|es|ed|ing) me|keeps? pushing me|wears? me down until|say yes or)\b/i;

/* Minimal, safe markdown for Bun's replies: escape first, then **bold**, *italic* / _italic_, line breaks, "- " bullets. */
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md = s => escH(s)
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/^\s*[-*•]\s+/gm, '• ')
  .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
  .replace(/(^|[\s(“"'])\*([^*\n]+)\*(?=[\s.,!?;:)”"']|$)/g, '$1<i>$2</i>')
  .replace(/(^|[\s(“"'])_([^_\n]+)_(?=[\s.,!?;:)”"']|$)/g, '$1<i>$2</i>')
  .replace(/\*\*|(^|\s)\*(?=\s|$)/g, '$1')
  .replace(/\n/g, '<br>');
/* Plain text for captions / speech: strip markdown marks. */
const plain = s => String(s ?? '').replace(/\*\*|__/g, '').replace(/(^|\s)[*_]([^*_\n]+)[*_](?=[\s.,!?;:]|$)/g, '$1$2').replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*]\s+/gm, '• ');

const SAFETY_TEXT = 'I’m going to pause the coaching here, because what you wrote matters more than any fight. You deserve to be safe. If you’re in danger right now, call 911. You can reach the National Domestic Violence Hotline 24/7 at 1-800-799-7233 (or text START to 88788), and the 988 Suicide & Crisis Lifeline by calling or texting 988. I’m a coaching tool, not therapy or emergency help. I’m still here if you want to just talk, privately.';
// Safety is per message: only the newest human message is screened. Older flagged ones are redacted before sending.
const humanText = p => { const h = (Array.isArray(p.messages) ? p.messages : []).filter(m => m && m.from !== 'bun' && m.from !== 'sys'); return h.length ? String(h[h.length - 1].text || '') : ''; };
const redactOld = p => { if (!p || !Array.isArray(p.messages)) return p; const ms = p.messages; let last = -1; ms.forEach((m, i) => { if (m && m.from !== 'bun' && m.from !== 'sys') last = i; });
  return { ...p, messages: ms.map((m, i) => m && m.from !== 'bun' && m.from !== 'sys' && i !== last && SAFETY_RE.test(String(m.text || '')) ? { ...m, text: '(earlier message withheld by the safety screen)' } : m) }; };
/* Dates, always computed from "now" (never hard-coded). */
const DAY = 864e5;
const addDays = (now, n) => new Date(+new Date(now) + n * DAY);
const fmtDay = (d, o = { weekday:'short', month:'short', day:'numeric' }) => new Date(d).toLocaleDateString('en-US', o);
// 7-day trial: reminder on day 5, charge when the trial ends on day 7.
const trialDates = (now = Date.now()) => ({ start: new Date(now), remind: addDays(now, 5), charge: addDays(now, 7) });
// Next date (today counts) that falls on a weekday like 'Tue'.
const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const nextWeekday = (dow, now = Date.now()) => { const d = new Date(now); const want = DOWS.indexOf(dow); const diff = ((want - d.getDay()) + 7) % 7; return addDays(d, want < 0 ? 0 : diff); };
const greeting = (now = Date.now()) => { const h = new Date(now).getHours(); return h < 5 ? 'Hi' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };
/* Client-side safety screen. Runs BEFORE any network call: a flagged message never leaves the device for the model. */
const screen = p => SAFETY_RE.test(humanText(p));

/* ---------- scripted Bun: fallback when the live model is unavailable (no key, offline, rate-limited, error) ---------- */
const pick = (arr, seed) => arr[Math.abs([...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % arr.length];
function scripted(p) {
  const n = p.names || {}; const A = n.A || 'Sam', B = n.B || 'Alex';
  const msgs = Array.isArray(p.messages) ? p.messages : [];
  const lastH = [...msgs].reverse().find(m => m.from !== 'bun' && m.from !== 'sys') || { text: '' };
  const t = String(lastH.text || ''); const who = lastH.from === 'B' ? B : A; const them = lastH.from === 'B' ? A : B;
  const sideRe = /\b(tell me i'?m right|who('?s| is) right|am i (wrong|right)|take my side|on my side|agree with me|(s)?he'?s (wrong|crazy|the problem)|back me up)\b/i;
  if (p.mode === 'talk' || p.task === 'seal') return null; // the app has its own scripted stage 2/3 lines
  if (p.task === 'winddown') return null; // the app has its own scripted wind-down line
  if (p.task === 'aha') return null; // the app has its own scripted starter guess
  if (p.task === 'soften') {
    const topic = (t.match(/\b(dishes|chores|money|phone|texts?|late|kids|sex|family|work|plans|laundry|cleaning)\b/i) || ['this'])[0].toLowerCase();
    return `I feel worn out and a bit alone about ${topic === 'this' ? 'how this keeps going' : 'the ' + topic}. I need us to pick one small thing we can change this week, together.\nWhy: it names your feeling and one clear ask, with no blame to defend against.`;
  }
  if (p.task === 'recap') return `You both showed up and said the hard part out loud. Your one thing for this week: the small step you agreed on together.`;
  if (p.mode === 'together') return pick([`Thank you both. Notice what the other one needed, then take one easy breath.`, `${them}, what did you hear underneath that? Start with “What I heard is…”`], t);
  if (/^\/heated\b/i.test(t)) return `This got heated, and that’s okay, it happens to every couple. I’ve started a 20-minute break for both of you. Step apart, not away. After, I’ll help each of you start softer.`;
  if (/^\/repair\b/i.test(t)) return `A repair line either of you could send: “I don’t want to fight with you. Can we start over? I want to hear you.”`;
  if (sideRe.test(t)) return p.mode === 'apart'
    ? `I’m not going to pick a side, ${who}. I don’t think either of you is the problem. The loop you two get stuck in is. ${them}, what did you hear ${who} asking for just now?`
    : `I hear how much you want someone to say you’re right, ${who}. I won’t pick a side, but your feelings make sense. What do you think ${them} was feeling in that moment?`;
  if (p.mode === 'apart') {
    const heated = /\byou (always|never)\b|!{2,}|\bwhatever\b|\bshut up\b/i.test(t) || (t.replace(/[^A-Z]/g, '').length > 12 && t === t.toUpperCase());
    if (heated) return `This is getting sharp. Neither of you is wrong to be upset. ${who}, could you try that again as “I feel… about… I need…”? Or take 20 and come back.`;
    if (/@bun|\?$/i.test(t)) return `Good question. One small step: each of you say, in one line, what you need most from the other tonight. ${them} first, then ${who}.`;
    return '[[PASS]]';
  }
  return pick([
    `That sounds really frustrating, ${who}. It makes sense you’re tired of the same fight. When you talk again, try: “I feel ___ about ___. I need ___.” Want help filling it in?`,
    `I hear you, ${who}. It sounds like you felt unseen. ${them} might be feeling something too, maybe pressure. What’s one soft line you could open with next time?`,
  ], t);
}

/* Stream a coach reply. onDelta(fullTextSoFar) is called as text arrives.
   Order: 1) local safety screen (no network)  2) live model via /api/coach  3) scripted fallback. */
async function coach(payload, onDelta, signal) {
  if (payload && payload.profile === undefined) { try { const p = JSON.parse(localStorage.getItem('simmer-profile') || 'null'); if (p) payload = { ...payload, profile:p }; } catch {} }
  if (screen(payload)) return payload.task === 'aha' ? { text: '{"safety":true}', safety: true, local: true } : { text: SAFETY_TEXT, safety: true, local: true };
  let r, fail = null;
  payload = redactOld(payload);
  try { r = await fetch('/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal }); }
  catch (e) { fail = { error: 'offline', text: '' }; }
  if (!fail && (!r.ok || !r.body)) { const t = await r.text().catch(() => ''); fail = { error: r.status === 503 ? 'no-key' : r.status === 429 ? 'rate' : 'ai', detail: t, text: '' }; }
  if (fail) return fallback(payload, onDelta, fail);
  const model = r.headers.get('x-simmer-model') || '';
  const reader = r.body.getReader(); const dec = new TextDecoder(); let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      text += dec.decode(value, { stream: true });
      const t = text.trimStart();
      if ('[[PASS]]'.startsWith(t) || '[[SAFETY]]'.startsWith(t) || t === '[[PASS]]') continue;
      onDelta?.(text.replace(/^\s*\[\[(SAFETY|PASS)\]\]\s*/, ''));
    }
  } catch (e) { if (!text) return fallback(payload, onDelta, { error: 'ai', text: '' }); }
  if (!text.trim()) return fallback(payload, onDelta, { error: 'ai', text: '' });
  const safety = /^\s*\[\[SAFETY\]\]/.test(text) || r.headers.get('x-simmer-safety') === '1';
  const pass = /^\s*\[\[PASS\]\]\s*$/.test(text);
  return { text: safety ? SAFETY_TEXT : text.replace(/^\s*\[\[(SAFETY|PASS)\]\]\s*/, '').trim(), safety, pass, model };
}
async function fallback(payload, onDelta, fail) {
  const s = scripted(payload);
  if (s == null) return fail; // caller has its own scripted path
  if (s === '[[PASS]]') return { text: '', pass: true, scripted: true, why: fail.error };
  // Type it out so it feels like the live version, but quickly.
  const words = s.split(/(\s+)/); let out = '';
  for (let i = 0; i < words.length; i++) { out += words[i]; if (i % 6 === 5) { onDelta?.(out); await new Promise(r => setTimeout(r, reduced() ? 0 : 35)); } }
  onDelta?.(out);
  return { text: s, scripted: true, why: fail.error, model: 'scripted' };
}
const errorLine = r => r.error === 'no-key' ? 'Bun’s brain isn’t plugged in on this deployment yet (no AI key).'
  : r.error === 'rate' ? 'Bun needs a breather. Try again in a minute.'
  : r.error === 'offline' ? 'You look offline. Bun will be here when you’re back.'
  : 'Bun lost its train of thought. Try again?';

const resourcesHTML = () => `
  <section class="res" aria-label="National Domestic Violence Hotline"><b>National Domestic Violence Hotline</b><span class="small">Free, confidential, 24/7.</span>
    <div class="act act1"><a href="tel:18007997233"><span class="nowrap">Call 1-800-799-7233</span></a><a class="alt" href="sms:88788?&body=START"><span class="nowrap">Text START to 88788</span></a></div></section>
  <section class="res" aria-label="988 Suicide and Crisis Lifeline"><b>988 Suicide &amp; Crisis Lifeline</b><span class="small">If you’re thinking about harming yourself.</span>
    <div class="act"><a href="tel:988">Call 988</a><a class="alt" href="sms:988">Text 988</a></div></section>
  <section class="res" aria-label="Emergency"><b>In immediate danger?</b><div class="act" style="grid-template-columns:1fr"><a href="tel:911">Call 911</a></div></section>
  <p class="small" style="margin:6px 0 0">Simmer is a coaching tool, not therapy or emergency help.</p>`;

const switcherHTML = cur => `<nav class="vswitch" aria-label="Prototype version"><a href="/chat/" ${cur === 'chat' ? 'aria-current="page"' : ''}>Chat</a><a href="/app/" ${cur === 'app' ? 'aria-current="page"' : ''}>App</a></nav>`;

const uid = () => Math.random().toString(36).slice(2, 10);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const aiStatus = fetch('/api/coach', { cache: 'no-store' }).then(r => r.json()).then(j => ({ live: !!j.hasToken, model: j.model })).catch(() => ({ live: false }));
const aiLine = st => st.live ? `Live AI on (${st.model}). If it’s unreachable, Bun falls back to scripted replies.` : 'Live AI is off on this deployment, so Bun is using scripted replies.';
window.Simmer = { aiStatus, aiLine, coach, scripted, screen, SAFETY_TEXT, errorLine, SAFETY_RE, AMBIG_RE, HARSH_RE, PRESSURE_RE, md, trialDates, addDays, fmtDay, nextWeekday, greeting, redactOld, plain, resourcesHTML, switcherHTML, uid, reduced };
})();
