/* Simmer app version, live prototype: Bun's coaching comes from a real AI model via /api/coach. No sign-ups or payments. Page views use Vercel Web Analytics. History stays in this browser (localStorage). */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const { coach, errorLine, SAFETY_RE, AMBIG_RE, HARSH_RE, PRESSURE_RE, md, resourcesHTML, switcherHTML, uid, trialDates, fmtDay, nextWeekday, greeting } = window.Simmer;
let CUR = 'splash';

/* ---------------- fake data ---------------- */
const TOPICS = {
  chores:  {label:'Chores', thing:'the dishwasher', feel:'feeling unseen', opener:'“You never do anything unless I ask.”', ss:{feel:'worn out', about:'the dishes still in the sink after dinner', need:'us to split evening cleanup so I don’t have to ask'}},
  money:   {label:'Money', thing:'the card bill', feel:'feeling unsafe about the future', opener:'“Why did you buy that without asking?”', ss:{feel:'anxious', about:'the card bill this month', need:'a 20-minute money talk this weekend so we plan it together'}},
  tone:    {label:'Tone', thing:'“it’s how you said it”', feel:'feeling dismissed', opener:'“Don’t talk to me like that.”', ss:{feel:'hurt', about:'how that came out just now', need:'us to try that again, a little slower'}},
  phone:   {label:'Phone', thing:'the phone at dinner', feel:'feeling less interesting than a screen', opener:'“Can you put that thing down for once?”', ss:{feel:'lonely', about:'dinners where we’re both on our phones', need:'one phone-free dinner a week with you'}},
  inlaws:  {label:'In-laws', thing:'the holiday plans', feel:'feeling like the outsider', opener:'“Your mom always comes first.”', ss:{feel:'left out', about:'how the holiday plans got made', need:'us to decide together before we tell family'}},
  trust:   {label:'Jealousy / trust', thing:'the late-night texts', feel:'feeling insecure', opener:'“Who are you texting?”', ss:{feel:'uneasy', about:'the late-night texting', need:'some reassurance, and to agree what feels okay for both of us'}},
  intimacy:{label:'Sex / intimacy', thing:'who reaches for who', feel:'feeling unseen, for a while now', opener:'“You never want me anymore.”', ss:{feel:'far from you', about:'how little we’ve touched lately', need:'some unhurried time just for us this week, no pressure'}},
};
const WANTS = ['to feel seen','help without asking','a little appreciation','to be heard','a minute to breathe','to feel close'];
const WHENS = ['Today','This week','Last week','A while ago'];
const REPAIRS = ['Can we start over?','I’m sorry I snapped. I want to hear you.','Can I try that again, softer?','I’m on your side. Let’s figure this out.'];
const MAP = [
  {key:'chores', label:'Chores', who:'You both picked this', youU:'feeling unseen', themU:'feeling nagged', pct:82, status:'Getting better · 2 repairs in October'},
  {key:'tone', label:'Tone', who:'Alex added this', youU:'—', themU:'feeling talked down to', pct:58, status:'Steady'},
  {key:'phone', label:'Phone at dinner', who:'You added this', youU:'feeling less important', themU:'—', pct:44, status:'Still loops · usually Thursdays'},
];

const fresh = () => ({
  v:2, demo:false, postFight:false, name:'', partner:'', topics:[], when:'This week', wants:['to feel seen'], wantText:'', opener:null,
  safety:{afraid:null, control:null, threats:null}, flagged:false, invited:false, partnerJoined:false, offline:false,
  plan:'yearly', paid:false, streak:0, nudgeDone:false, ssEdit:null, repair:REPAIRS[0],
  ci:{a:['','',''], b:['','',''], area:'chores', action:'', owner:'Both', day:'Tue', time:'18:30', added:false, love:''},
  memory:[],
  memOn:true, followup:null, aha:null, ahaErr:null, chat:[], history:[], soft:null,
  pronouns:'', partnerPronouns:'', rel:{together:'', living:''}, style:'gentle', mode:'solo',
  onb:{at:null, done:false, skipped:false, ackTherapy:false, ret:null}, consent:null, consentDraft:{adult:false, ai:false, store:false},
  pB:{code:'', consent:null, draft:{adult:false, ai:false, store:false}, pronouns:'', safety:{afraid:null, control:null, threats:null}, flagged:false},
  agreements:[],
  notif:{on:false, previews:false}, voice:true,
  closer:{adult:false, conn:null, init:'', brakes:[], accels:[], desire:'', note:'', mine:{}, open:false, pOpen:false, paused:false, pausedWhy:'', checks:[]},
});
// Demo data (Sam & Alex, a 4-week streak, seeded memory and agreements) only with ?demo=1 or the "Load demo data" toggle.
const demoSeed = () => {
  const ago = n => fmtDay(Date.now() - n * 864e5);
  return { demo:true, name:'Sam', partner:'Alex', streak:4,
    memory:[{id:1, t:`Tuesdays are your cooking night (agreed ${ago(5)})`}, {id:2, t:'Chores fights usually start after 9 pm'}, {id:3, t:'“Can we start over?” works best for you two'}, {id:4, t:'Sam needs to feel seen; Alex wants less nagging'}],
    agreements:[{id:'a1', text:'Alex cooks Tuesdays; Sam does cleanup', owner:'Both', day:'Tuesday', made:`${ago(5)} check-in`, checks:[]}],
    ci:{ ...fresh().ci, action:'Alex cooks Tuesday; Sam does cleanup' } };
};
let S;
try { const d = fresh(), j = JSON.parse(localStorage.getItem('simmer-live-app') || '{}'); S = Object.assign(d, j); for (const k of ['onb','pB','closer','notif','rel','consentDraft']) S[k] = Object.assign(fresh()[k], j[k] || {});
  if (!j.v) { // saves from before Nov 9 carried seeded demo data into every new user's state: strip it
    if (!j.demo && Object.keys(j).length) {
      S.memory = (S.memory || []).filter(m => !(m.id >= 1 && m.id <= 4)); S.agreements = (S.agreements || []).filter(a => a.id !== 'a1');
      if (S.streak === 4 && !(S.history || []).some(h => h.type === 'checkin')) S.streak = 0;
      if (S.ci.action === 'Alex cooks Tuesday; Sam does cleanup') S.ci.action = '';
      if (S.name === 'Sam' && S.partner === 'Alex') { S.name = ''; S.partner = ''; }
    }
    S.v = 2;
  }
} catch { S = fresh(); }
if (/[?&]demo=1/.test(location.search) && !S.demo) { S = Object.assign(fresh(), demoSeed()); }
if (/[?&]demo=0/.test(location.search)) { S = fresh(); }
const hiN = () => S.name ? ' ' + esc(S.name) : '';
const profile = () => ({ name:S.name, partner:S.partner, pronouns:S.pronouns === 'other' ? '' : S.pronouns, partnerPronouns:S.partnerPronouns === 'other' ? '' : S.partnerPronouns, together:S.rel.together, living:S.rel.living, topics:S.topics.map(k => TOPICS[k]?.label).filter(Boolean), style:S.style, mode:S.mode });
// Seed/demo copy uses Sam (you) and Alex (partner); swap in the real names from onboarding.
const demoNames = t => String(t || '').replace(/\b(Sam|Alex)\b/g, w => w === 'Sam' ? (S.name || 'Sam') : (S.partner || 'Alex'));
const save = () => { try { localStorage.setItem('simmer-live-app', JSON.stringify(S)); if (S.consent) localStorage.setItem('simmer-profile', JSON.stringify(profile())); } catch {} };
const logH = (type, title, detail) => { S.history.unshift({ id:uid(), type, title, detail, at:Date.now() }); S.history = S.history.slice(0, 60); save(); };
const P = () => esc(S.partner || 'your partner');
const PC = () => esc(S.partner || 'Your partner');
const N = () => esc(S.name || 'you');
const topic = () => TOPICS[S.topics[0] || 'chores'];

/* ---------------- Bun the character ---------------- */
function bun(size = 120, mood = 'happy', fill) {
  const eyes = {
    happy:'<path d="M40 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    talk:'<circle cx="46" cy="56" r="4.5" fill="#2B1A12"/><circle cx="74" cy="56" r="4.5" fill="#2B1A12"/><circle cx="47.5" cy="54.5" r="1.4" fill="#fff"/><circle cx="75.5" cy="54.5" r="1.4" fill="#fff"/>',
    think:'<circle cx="48" cy="52" r="4.5" fill="#2B1A12"/><circle cx="76" cy="52" r="4.5" fill="#2B1A12"/>',
    hot:'<path d="M39 54 l12 4" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M81 54 l-12 4" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><circle cx="46" cy="61" r="3.5" fill="#2B1A12"/><circle cx="74" cy="61" r="3.5" fill="#2B1A12"/>',
    calm:'<path d="M40 57 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 57 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    soft:'<circle cx="46" cy="57" r="4" fill="#2B1A12"/><circle cx="74" cy="57" r="4" fill="#2B1A12"/>',
  }[mood] || '';
  const mouth = {
    happy:'<path d="M52 68 q8 8 16 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    talk:'<ellipse cx="60" cy="70" rx="6" ry="4.5" fill="#2B1A12"/>',
    think:'<path d="M54 71 h12" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    hot:'<path d="M52 73 q8 -6 16 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    calm:'<path d="M54 69 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    soft:'<path d="M54 70 q6 4 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
  }[mood] || '';
  const steam = mood === 'hot' ? '<path d="M30 14 q-6 -8 0 -14 M60 8 q-6 -8 0 -14 M90 14 q-6 -8 0 -14" fill="none" stroke="#B8361C" stroke-width="4" stroke-linecap="round"/>' : '';
  const think = mood === 'think' ? '<circle cx="104" cy="16" r="5" fill="#2B1A12"/><circle cx="114" cy="4" r="3" fill="#2B1A12"/>' : '';
  const style = fill ? ` style="--bun-fill:${fill}"` : '';
  return `<span class="bun-wrap" style="display:block"><svg class="bun" width="${size}" height="${size*0.84}" viewBox="0 -6 120 106" aria-hidden="true"${style}>
    ${steam}${think}
    <path class="body" d="M10 66 C10 32 32 12 60 12 C88 12 110 32 110 66 C110 84 92 92 60 92 C28 92 10 84 10 66Z"/>
    <path d="M50 14 q8 -12 18 -4" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>
    <ellipse class="shine" cx="36" cy="34" rx="10" ry="5" transform="rotate(-25 36 34)"/>
    <ellipse class="cheek" cx="32" cy="70" rx="8" ry="5"/><ellipse class="cheek" cx="88" cy="70" rx="8" ry="5"/>
    ${eyes}${mouth}
  </svg></span>`;
}
const say = (text, mood = 'talk', size = 64) => `<div class="bun-row"><div style="flex:none">${bun(size, mood)}</div><div class="bubble"><span class="who">Bun</span>${text}</div></div>`;

/* ---------------- shared bits ---------------- */
const ONB = ['about','meet','rel','topic','style','when','want','opener','safety','consent','invite','mode','primer'];
function backbar(parent, step) {
  const prog = step ? `<div class="progress" role="img" aria-label="Step ${step} of ${ONB.length}">${ONB.map((_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>` : '<span></span>';
  return `<div class="backbar"><button class="back" type="button" data-go="${parent}" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button>${prog}<span style="width:44px"></span></div>`;
}
const chip = (label, on, attrs = '') => `<button type="button" class="chip" aria-pressed="${on}" ${attrs}>${esc(label)}</button>`;

/* ---------------- screens ---------------- */
const R = {};
const META = {};
function screen(name, group, label, fn, opts = {}) { R[name] = fn; META[name] = {group, label, ...opts}; }

/* ================= onboarding (full) ================= */
const PRON = ['she/her','he/him','they/them'];
const TOGETHER = ['Less than a year','1–3 years','3–7 years','7+ years'];
const LIVING = ['Living together','Not yet','Sometimes / long distance'];
const MODES = {
  apart:{ t:'Apart', s:'Each on your own phone, one shared chat. Bun nudges each of you privately when it heats up.', best:'Best for: fights over text, busy days' },
  together:{ t:'Together', s:'One phone on the table. Bun keeps turns, timers, and calls a 20-minute break if you flood.', best:'Best for: the big talk, Sunday check-ins' },
  solo:{ t:'Solo', s:'Just you and Bun. Vent, untangle what you feel, and practice the softer way to say it.', best:'Best for: before a hard talk, after a bad one' },
};
const onbStep = r => ONB.indexOf(r) + 1;
function onbBar(parent) {
  const step = onbStep(CUR);
  return `<div class="backbar">${parent ? `<button class="back" type="button" data-go="${parent}" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button>` : '<span style="width:44px"></span>'}
  ${step ? `<div class="progress" role="progressbar" aria-label="Setup progress" aria-valuemin="1" aria-valuemax="${ONB.length}" aria-valuenow="${step}">${ONB.map((_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>` : '<span></span>'}
  <button class="btn-ghost sm skip-onb" type="button" data-act="onb-skip">Skip</button></div>`;
}
const pronChips = (key, val) => `<div class="chips" role="radiogroup" aria-label="Pronouns">${PRON.map(p => `<button type="button" class="chip" role="radio" aria-checked="${val === p}" aria-pressed="${val === p}" data-pron="${key}" data-v="${p}">${p}</button>`).join('')}<button type="button" class="chip" aria-pressed="${!!val && !PRON.includes(val)}" data-pron="${key}" data-v="other">Self-describe</button></div>
  ${val && !PRON.includes(val) ? `<input class="input" style="margin-top:8px" data-pron-text="${key}" aria-label="Your pronouns" value="${esc(val === 'other' ? '' : val)}" placeholder="e.g. xe/xem">` : ''}`;

screen('splash', 'Onboarding', '1 · Welcome', () => {
  const resume = S.onb.at && !S.onb.done && S.onb.at !== 'about';
  return `
<div class="splash">
  <div class="brand">${bun(34,'happy')} Simmer</div>
  <h1 class="xl" id="h">Stop having the same fight.</h1>
  <p style="font-size:18px;color:#FFE7DE;margin:0">Bun is a warm little coach for two. Find the fight under the fight, and fix that one.</p>
  <ul class="value-list stagger" aria-label="What you get">
    <li><b>Find the loop</b><span>One line that names what your fight is really about.</span></li>
    <li><b>Cool down, then repair</b><span>A 20-minute break and a softer way back in.</span></li>
    <li><b>Never a verdict</b><span>Bun never says who’s right. Your answers stay yours.</span></li>
  </ul>
  <div style="margin-top:auto" class="stack">
    ${resume ? `<button class="btn" data-go="${S.onb.at}">Pick up where you left off · step ${onbStep(S.onb.at)} of ${ONB.length}</button><button class="btn-ghost" data-act="onb-restart" style="color:#fff">Start over</button>` : `<button class="btn" data-go="about">Start, it takes about 3 minutes</button>`}
    <button class="btn-ghost" data-go="pjoin" style="color:#fff">I was invited by my partner</button>
    <button class="btn light fx-splash-fight" data-fa="pause">${PAUSE_I.replace('34','22').replace('34','22')} We’re in a fight right now</button>
    <p class="fine">Coaching, not therapy. Bun never says who’s right.</p>
  </div>
</div>`;
}, {noTop:true});

screen('about', 'Onboarding', '2 · What Simmer is (and isn’t)', () => `
${onbBar('splash')}
<div class="stagger">
<div style="text-align:center">${bun(110,'happy')}</div>
<h1 id="h" class="h2" style="font-size:28px;text-align:center">Before we start, the honest version</h1>
<div class="isnt">
  <section class="card butter"><h3>Simmer is</h3><ul class="ticks"><li>A coach for everyday couple fights</li><li>Tools to pause, cool down, and repair</li><li>Private first: you choose what’s shared</li></ul></section>
  <section class="card flat"><h3>Simmer isn’t</h3><ul class="crosses"><li><b>Therapy.</b> Bun is an AI coach, not a licensed therapist</li><li><b>Emergency help.</b> In danger, call 911</li><li>A judge of who’s right</li><li>For relationships with fear or abuse. If that’s you, I’ll point you to real help, privately</li></ul></section>
</div>
<label class="radio-card" style="margin-top:12px"><input type="checkbox" id="ack-therapy" ${S.onb.ackTherapy ? 'checked' : ''}><span><b>Got it: coaching, not therapy.</b><span class="small" style="display:block">You can read this again in Settings.</span></span></label>
<p class="small" id="ack-err" aria-live="polite"></p>
</div>
<div class="btn-row"><button class="btn" data-act="about-next">Sounds good</button></div>`);

screen('meet', 'Onboarding', '3 · Names + pronouns', () => `
${onbBar('about')}
<div class="stagger">
${say('Hi, I’m Bun. What should I call you two?', 'happy', 64)}
<form id="f-meet" class="stack" novalidate style="margin-top:12px">
  <div class="field"><label for="nm">Your first name</label><input class="input" id="nm" name="nm" autocomplete="given-name" value="${N()}" required></div>
  <div class="field"><span class="lbl" id="pr-l">Your pronouns <span class="small">(optional)</span></span>${pronChips('me', S.pronouns)}</div>
  <div class="field"><label for="pn">Your partner’s first name</label><input class="input" id="pn" name="pn" value="${P()}"><span class="small">Only used on your screens. We won’t contact them unless you invite them.</span></div>
  <div class="field"><span class="lbl">Their pronouns <span class="small">(optional)</span></span>${pronChips('them', S.partnerPronouns)}</div>
  <p class="small" id="meet-err" aria-live="polite"></p>
  <button class="btn" type="submit">Nice to meet you</button>
</form></div>`);

screen('rel', 'Onboarding', '4 · Relationship basics', () => `
${onbBar('meet')}
<div class="stagger">
${say(`Tell me a little about you and ${P()}. It helps me pitch things right.`)}
<h1 id="h" class="h2" style="font-size:26px">How long have you been together?</h1>
<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="sr">How long together</legend>
${TOGETHER.map(v => `<label class="radio-card"><input type="radio" name="together" value="${v}" ${S.rel.together === v ? 'checked' : ''}><span><b>${v}</b></span></label>`).join('')}</fieldset>
<h2 style="font-size:20px;margin-top:16px">Do you live together?</h2>
<fieldset style="border:0;padding:0;margin:0"><legend class="sr">Living situation</legend><div class="seg">${LIVING.map(v => `<label><input type="radio" name="living" value="${v}" ${S.rel.living === v ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>
</div>
<div class="btn-row"><button class="btn" data-go="topic">Next</button></div>`);

screen('style', 'Onboarding', '6 · Coaching style', () => {
  const g = S.style !== 'direct';
  return `
${onbBar('topic')}
<div class="stagger">
<h1 id="h" class="h2" style="font-size:28px">How should Bun talk to you?</h1>
<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="sr">Coaching style</legend>
  <label class="radio-card"><input type="radio" name="style" value="gentle" ${g ? 'checked' : ''}><span><b>Gentle</b><span class="small" style="display:block">Validation first, slow, asks before suggesting.</span></span></label>
  <label class="radio-card"><input type="radio" name="style" value="direct" ${!g ? 'checked' : ''}><span><b>Direct</b><span class="small" style="display:block">Plain, brief, names the pattern straight away. Still kind.</span></span></label>
</fieldset>
<p class="eyebrow" style="margin-top:16px">Preview</p>
<div id="style-prev" class="grow">${stylePreview()}</div>
<p class="small">Change it anytime in Settings. Either way, Bun never takes sides.</p>
</div>
<div class="btn-row"><button class="btn" data-go="when">Next</button></div>`;
});
function stylePreview() {
  const t = topic();
  return S.style === 'direct'
    ? say(`Straight up: this isn’t really about ${esc(t.thing)}. It’s about ${esc(t.feel)}. Try saying the feeling first.`, 'talk', 56)
    : say(`That sounds really draining. I wonder if, under ${esc(t.thing)}, there’s a bit of ${esc(t.feel)}? Want to try saying it a softer way?`, 'soft', 56);
}

screen('consent', 'Onboarding', '11 · Privacy + consent', () => `
${onbBar(S.flagged ? 'safe' : 'safety')}
<div class="stagger">
<span class="lock"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>Our promises</span>
<h1 id="h" class="h2" style="font-size:28px">Your privacy, in plain words</h1>
<ul class="promises">
  <li><b>Your answers are yours.</b> ${PC()} only sees what you choose to put on Our map, and agreements you make together.</li>
  <li><b>Your safety check is never shown</b> to ${P()}, and they’re never told if it changes anything.</li>
  <li><b>Stored on this device.</b> Apart chat rooms live on our server for up to 24 hours. Delete everything anytime in Settings.</li>
  <li><b>Bun is an AI.</b> What you type is sent to an AI model to write Bun’s reply. It isn’t used to advertise to you.</li>
  <li><b>No surprise notifications.</b> They’re off, and previews are hidden, unless you turn them on.</li>
</ul>
<fieldset class="stack" style="border:0;padding:0;margin:12px 0 0"><legend class="sr">Consent</legend>
  <label class="radio-card"><input type="checkbox" data-consent="adult" ${S.consentDraft.adult ? 'checked' : ''}><span><b>I’m 18 or older.</b></span></label>
  <label class="radio-card"><input type="checkbox" data-consent="ai" ${S.consentDraft.ai ? 'checked' : ''}><span><b>I understand Bun is an AI coach</b>, not therapy and not emergency help.</span></label>
  <label class="radio-card"><input type="checkbox" data-consent="store" ${S.consentDraft.store ? 'checked' : ''}><span><b>Save my answers on this device</b> and use them to personalize Bun.</span></label>
</fieldset>
<p class="small" id="consent-err" aria-live="polite" style="color:var(--tomato-hi)"></p>
</div>
<div class="btn-row"><button class="btn" data-act="consent-go">I agree</button></div>`);

screen('mode', 'Onboarding', '13 · Choose a default mode', () => `
${onbBar('invite')}
<div class="stagger">
<h1 id="h" class="h2" style="font-size:28px">How do you want to use Simmer most?</h1>
<p class="small" style="margin-top:-4px">You can use all three. This just picks what opens first.</p>
<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="sr">Default mode</legend>
${Object.entries(MODES).map(([k, m]) => `<label class="radio-card mode-card"><input type="radio" name="mode" value="${k}" ${S.mode === k ? 'checked' : ''}><span style="flex:1"><b>${m.t}</b><span class="small" style="display:block">${m.s}</span><span class="small" style="display:block;font-weight:700;margin-top:2px">${m.best}</span></span>${modePreview(k)}</label>`).join('')}
</fieldset></div>
<div class="btn-row"><button class="btn" data-go="primer">Next</button></div>`);
function modePreview(k) {
  if (k === 'apart') return `<span class="mini" aria-hidden="true"><span class="mph"><i class="b a"></i><i class="b bun"></i></span><span class="mph"><i class="b c"></i><i class="b bun"></i></span></span>`;
  if (k === 'together') return `<span class="mini" aria-hidden="true"><span class="mph wide"><span class="ring"></span><i class="b bun"></i></span></span>`;
  return `<span class="mini" aria-hidden="true"><span class="mph"><i class="b a"></i><i class="b bun"></i><i class="b a"></i></span></span>`;
}

screen('primer', 'Onboarding', '14 · First-session primer', () => {
  const m = MODES[S.mode || 'solo'], t = topic();
  const direct = S.style === 'direct';
  const lines = [
    `${direct ? 'Here’s the plan' : 'Okay, here’s how your first session goes'}, ${N()}.`,
    `<b>1.</b> Pick one ${esc(t.label.toLowerCase())} moment, just one. Not the whole history.`,
    `<b>2.</b> Say the feeling before the facts: <i>“I feel… about… I need…”</i>`,
    S.mode === 'together' ? `<b>3.</b> One of you talks for 2 minutes, the other says back what they heard. I keep time.` : S.mode === 'apart' ? `<b>3.</b> Write to ${P()} in the shared chat. If it gets hot, I’ll suggest a break, privately.` : `<b>3.</b> Tell me the rough version first. I’ll help you find the softer one to say out loud.`,
    `If either of you floods, we stop for 20 minutes. That’s a pause, not a quit.`,
  ];
  return `
${onbBar('mode')}
<div style="text-align:center">${bun(120,'happy')}</div>
<h1 id="h" class="h2" style="font-size:26px;text-align:center">Your first session: ${m.t}</h1>
<div class="primer stagger">${lines.map(l => `<div class="msg bun-m">${l}</div>`).join('')}</div>
<div class="btn-row">
  <button class="btn" data-act="onb-finish" data-start="${S.mode || 'solo'}">Start my first ${m.t} session</button>
  <button class="btn-ghost" data-act="onb-finish">Go to Home instead</button>
</div>`;
});

/* ---------- Partner B's own join flow (their phone) ---------- */
const pBanner = () => `<div class="card ink pbanner" role="note"><p style="margin:0;font-weight:600">Demo: this is ${P()}’s phone.</p><p class="small" style="margin:0">Separate consent, separate safety check. ${N()} sees none of it.</p></div>`;
screen('pjoin', 'Partner B', 'Join with a code', () => `
${pBanner()}
<div class="stagger">
<div style="text-align:center">${bun(110,'happy')}</div>
<h1 id="h" class="h2" style="font-size:28px;text-align:center">${N()} invited you to Simmer</h1>
<p class="lede" style="text-align:center;font-size:16px">A warm coach for two. ${N()} won’t see your answers, and Bun never picks a winner.</p>
<div class="field"><label for="jcode">Invite code</label><input class="input tnum" id="jcode" value="${esc(S.pB.code || '7KQ2-DEMO')}" autocapitalize="characters"></div>
<p class="small" id="jcode-err" aria-live="polite"></p>
</div>
<div class="btn-row"><button class="btn" data-act="pjoin-go">Join</button><button class="btn-ghost" data-go="splash">Not now</button></div>`, {exit:false});

screen('pconsent', 'Partner B', 'Their consent', () => `
${pBanner()}
<h1 id="h" class="h2" style="font-size:26px">Before you start, ${P()}</h1>
<ul class="promises">
  <li><b>Coaching, not therapy.</b> Bun is an AI coach, not a therapist or emergency help.</li>
  <li><b>Your answers are yours.</b> Only the topics you tick go on Our map.</li>
  <li><b>Your safety check stays private</b>, even from ${N()}.</li>
  <li>Delete your data anytime in Settings.</li>
</ul>
<fieldset class="stack" style="border:0;padding:0;margin:12px 0 0"><legend class="sr">${P()}’s consent</legend>
  <label class="radio-card"><input type="checkbox" data-pconsent="adult" ${S.pB.draft.adult ? 'checked' : ''}><span><b>I’m 18 or older.</b></span></label>
  <label class="radio-card"><input type="checkbox" data-pconsent="ai" ${S.pB.draft.ai ? 'checked' : ''}><span><b>I understand Bun is an AI coach</b>, not therapy.</span></label>
  <label class="radio-card"><input type="checkbox" data-pconsent="store" ${S.pB.draft.store ? 'checked' : ''}><span><b>Save my answers on my device.</b></span></label>
</fieldset>
<p class="small" id="pconsent-err" aria-live="polite" style="color:var(--tomato-hi)"></p>
<div class="btn-row"><button class="btn" data-act="pconsent-go">I agree</button><button class="btn-ghost" data-go="pjoin">Back</button></div>`);

screen('pyou', 'Partner B', 'Their name + pronouns', () => `
${pBanner()}
${say(`Hi! What should I call you?`, 'happy', 56)}
<div class="stack" style="margin-top:12px">
  <div class="field"><label for="pbn">Your first name</label><input class="input" id="pbn" value="${P()}"></div>
  <div class="field"><span class="lbl">Your pronouns <span class="small">(optional)</span></span>${pronChips('pb', S.pB.pronouns)}</div>
</div>
<div class="btn-row"><button class="btn" data-act="pyou-go">Next</button></div>`);

screen('psafety', 'Partner B', 'Their private safety check', () => {
  const q = (k, text) => `<fieldset class="card flat" style="margin:0"><legend class="sr">${text}</legend><p style="font-weight:600;margin-bottom:10px" aria-hidden="true">${text}</p>
    <div class="seg">${['Yes','No','Rather not say'].map(v => `<label><input type="radio" name="pb-${k}" value="${v}" ${S.pB.safety[k] === v ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>`;
  return `${pBanner()}
<span class="lock">Only you see this. ${N()} never will.</span>
<h1 id="h" class="h2" style="font-size:26px">A quick private check</h1>
<div class="stack">${q('afraid', `Do you ever feel afraid of ${N()}?`)}${q('control', `Does ${N()} control your phone, money, or who you see?`)}${q('threats', `Has ${N()} ever threatened or hurt you?`)}</div>
<p class="small" style="margin-top:12px"><b>Demo tip:</b> answer “Yes” to see what happens. ${N()}’s phone just keeps saying “waiting”.</p>
<div class="btn-row"><button class="btn" data-act="psafety-go">Continue</button></div>`;
}, {exit:true});

screen('psafe', 'Partner B', 'Their safe mode', () => `
<div class="safe">${pBanner()}
<h1 id="h" class="h2" style="font-size:26px;text-align:center">Thank you for telling me, ${P()}.</h1>
<p class="lede" style="text-align:center;font-size:16px">Couples coaching isn’t the right tool when someone is afraid. I’ve kept the shared parts off for you. ${N()} gets no notice; their screen will just keep saying you haven’t joined yet.</p>
${resourcesHTML()}
<p class="small" style="margin-top:12px">Quick exit is top left, or press Esc twice.</p>
<div class="btn-row"><button class="btn ink" data-act="pb-back">Demo: back to ${N()}’s phone</button></div></div>`, {exit:true, noTop:true});

screen('pdone', 'Partner B', 'Their intake done', () => `
${pBanner()}
<div style="text-align:center">${bun(130,'happy')}</div>
<h1 id="h" class="h2" style="font-size:26px;text-align:center">You’re in, ${P()}.</h1>
<p class="lede" style="text-align:center;font-size:16px">Our map now has both sides, only what each of you chose to share.</p>
<div class="btn-row"><button class="btn" data-act="pb-back">Demo: back to ${N()}’s phone</button></div>`);

screen('topic', 'Onboarding', '5 · What brings you here', () => `
${onbBar('rel')}
${say(`Okay ${N()}, which fight keeps coming back? Pick the one that stings most. You can add another.`)}
<h1 id="h" class="h2" style="font-size:28px">The fight on repeat</h1>
<div class="chips" role="group" aria-label="Fight topics">
  ${Object.entries(TOPICS).map(([k, t]) => chip(t.label, S.topics.includes(k), `data-topic="${k}"`)).join('')}
</div>
<p class="small" id="topic-err" style="margin-top:10px">${S.topics.length ? `Starting with <b>${esc(topic().label)}</b>. ${S.topics.length > 1 ? `I’ll keep the other ${S.topics.length - 1} for Our map.` : ''}` : 'Pick at least one so I know where to start.'}</p>
<div class="btn-row"><button class="btn" data-next="style">Next</button></div>`);

screen('when', 'Onboarding', '7 · When it last happened', () => `
${onbBar('style')}
${say(`When did the ${esc(topic().thing.replace(/[“”]/g,''))} fight last happen?`)}
<h1 id="h" class="h2" style="font-size:28px">Last time it flared up</h1>
<fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="sr">When did it last happen</legend>
  ${WHENS.map(w => `<label class="radio-card"><input type="radio" name="when" value="${w}" ${S.when === w ? 'checked' : ''}><span><b>${w}</b></span></label>`).join('')}
</fieldset>
<div class="btn-row"><button class="btn" data-go="want">Next</button></div>`);

screen('want', 'Onboarding', '8 · What you wanted', () => `
${onbBar('when')}
${say('In that moment, under the words, what did you really want?')}
<h1 id="h" class="h2" style="font-size:28px">What I actually wanted was…</h1>
<div class="chips" role="group" aria-label="What you wanted">${WANTS.map(w => chip(w, S.wants.includes(w), `data-want="${esc(w)}"`)).join('')}</div>
<div class="field" style="margin-top:16px"><label for="wt">In your words (optional)</label><textarea class="input" id="wt" placeholder="e.g. for him to notice without me asking">${esc(S.wantText)}</textarea></div>
<div class="btn-row"><button class="btn" data-go="opener">Next</button></div>`);

screen('opener', 'Onboarding', '9 · Your usual opener', () => {
  const o = S.opener ?? topic().opener;
  return `
${onbBar('want')}
${say('Last one about the fight. How does it usually start? Be honest, I’ve heard worse.')}
<h1 id="h" class="h2" style="font-size:28px">What I usually say first</h1>
<div class="field"><label for="op">Your opener</label><textarea class="input" id="op">${esc(o)}</textarea><span class="small">Pre-filled with a common one for ${esc(topic().label.toLowerCase())}. Change it to your real words.</span></div>
<div class="btn-row"><button class="btn" data-go="safety">Next</button></div>`;
});

screen('safety', 'Onboarding', '10 · Private safety check', () => {
  const q = (k, text) => `<fieldset class="card flat" style="margin:0"><legend class="sr">${text}</legend><p style="font-weight:600;margin-bottom:10px" aria-hidden="true">${text}</p>
    <div class="seg">${['Yes','No','Rather not say'].map(v => `<label><input type="radio" name="${k}" value="${v}" ${S.safety[k] === v ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>`;
  return `
${onbBar('opener')}
<span class="lock"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>Only you see this. ${P()} never will.</span>
<h1 id="h" class="h2" style="font-size:28px">A quick private check</h1>
<p class="lede" style="font-size:16px">Some fights aren’t really fights. I ask everyone these three questions, just to make sure couples coaching is the right fit.</p>
<div class="stack">
  ${q('afraid', `Do you ever feel afraid of ${P()}?`)}
  ${q('control', `Does ${P()} control your phone, money, or who you see?`)}
  ${q('threats', `Has ${P()} ever threatened or hurt you?`)}
</div>
<p class="small" style="margin-top:12px"><b>Demo tip:</b> answer “Yes” to any question to see the safety path.</p>
<div class="btn-row"><button class="btn" data-act="safety-next">Continue</button><button class="btn-ghost" data-act="safety-skip">Skip these questions</button></div>`;
}, {exit:true});

screen('thinking', 'Onboarding', 'Bun is thinking', () => `
<div style="text-align:center;margin-top:30px">${bun(130,'think')}</div>
<h1 id="h" class="h2" style="text-align:center;font-size:28px;margin-top:10px">Finding the fight under the fight</h1>
<ul class="checklist" id="cl" aria-live="polite">
  <li data-s="doing"><span class="st" aria-hidden="true"></span><span>Reading your 4 answers about ${esc(topic().thing)}</span></li>
  <li data-s="todo"><span class="st" aria-hidden="true"></span><span>Naming the feeling underneath</span></li>
  <li data-s="todo"><span class="st" aria-hidden="true"></span><span>Rewriting your opener as a soft start-up</span></li>
</ul>
<div class="card flat" id="aha-skel" style="margin-top:10px" aria-hidden="true"><div class="skel"><i></i><i></i><i></i></div></div>
<p class="small" style="text-align:center" id="think-note">Bun is reading your answers. Nothing is shared with ${P()}.</p>
<div class="btn-row"><button class="btn" id="think-go" data-go="aha" hidden>See what I found</button></div>`);

function ssText() {
  if (S.ssEdit) return esc(S.ssEdit);
  if (S.aha?.soft) return esc(S.aha.soft).replace(/^I feel/, '<b>I feel</b>').replace(/ about /, ' <b>about</b> ').replace(/\. ?I need/, '. <b>I need</b>');
  const s = topic().ss;
  return `<b>I feel</b> ${esc(s.feel)} <b>about</b> ${esc(s.about)}. <b>I need</b> ${esc(s.need)}.`;
}
function ssPlain() {
  if (S.ssEdit) return S.ssEdit;
  if (S.aha?.soft) return S.aha.soft;
  const s = topic().ss; return `I feel ${s.feel} about ${s.about}. I need ${s.need}.`;
}
screen('aha', 'Onboarding', 'Aha + share card', () => {
  const t0 = topic(); const t = S.aha ? { ...t0, thing:S.aha.thing || t0.thing, feel:S.aha.feel || t0.feel } : t0;
  const ly = esc(S.aha?.loopYou || 'push for it'), lt = esc(S.aha?.loopThem || 'pulls back');
  return `
${backbar('opener')}
<p class="eyebrow">Your fight, in one line</p>
<h1 id="h">It looks like it’s about ${esc(t.thing)}. It’s really about ${esc(t.feel)}.</h1>
<p class="small" style="margin-top:-4px">${S.aha ? 'Bun’s read of your answers, live.' : 'Bun’s starter guess (the live read didn’t load).'} If it’s off, edit it or tell me in the Bun tab.</p>
<div class="stack" style="margin-top:14px">
  <section class="card" aria-labelledby="loop-h">
    <h3 id="loop-h">The loop you two fall into</h3>
    <div class="loop" role="img" aria-label="You ${ly}, ${P()} ${lt}, and around it goes.">
      <div class="node">You ${ly}</div><div class="arrow" aria-hidden="true">⇄</div><div class="node">${P()} ${lt}</div>
    </div>
    <p style="margin:8px 0 0">The harder one of you reaches, the more the other retreats. <b>Neither of you is the villain. The loop is.</b></p>
  </section>
  <section class="card butter" aria-labelledby="ss-h">
    <h3 id="ss-h">Try this instead</h3>
    <p class="small" style="margin-bottom:6px">Instead of <span class="quote-old">${esc(S.opener ?? t.opener)}</span></p>
    <p class="say ss" id="ss-out">${ssText()}</p>
    <div id="ss-edit" hidden style="margin-top:10px"><label class="sr" for="ss-ta">Edit your soft start-up</label><textarea class="input" id="ss-ta">${esc(ssPlain())}</textarea><button class="btn ink" style="margin-top:8px;min-height:46px" data-act="ss-save">Save my version</button></div>
    <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap"><button class="btn-ghost sm" data-act="ss-edit">Edit</button><button class="btn-ghost sm" data-act="copy-ss">Copy</button></div>
    <p class="small" style="margin:6px 0 0">${S.aha?.why ? `<b>Why this works:</b> ${esc(S.aha.why)}` : 'A soft start-up: name your feeling, the specific thing, and what you need. No “you always.”'}</p>
  </section>
  <button class="tile" data-act="share" style="display:flex;gap:14px;align-items:center">
    <span style="width:52px;height:52px;border-radius:14px;background:var(--tomato);flex:none;display:grid;place-items:center;color:#fff;font-family:var(--display);font-weight:800;font-size:22px" aria-hidden="true">#1</span>
    <span><span class="k">Make a share card</span><span class="v" style="display:block">“Our greatest hit: ${esc(t.thing)}”</span></span>
  </button>
</div>
<div class="btn-row"><button class="btn" data-go="invite">Want ${P()}’s side?</button></div>`;
});

screen('invite', 'Onboarding', '12 · Invite your partner', () => `
${onbBar('aha')}
<div style="text-align:center">${bun(110,'happy')}</div>
<h1 id="h" style="text-align:center">Every fight has two sides. Want ${P()}’s?</h1>
<p class="lede" style="text-align:center">${P()} does their own private 2-minute intake. You only see what they choose to put on Our map, and they only see what you choose.</p>
<div class="card flat stack" style="gap:8px">
  <p style="margin:0"><b>What ${P()} gets:</b> a link, a hello from me, and the same private questions you answered.</p>
  <p style="margin:0"><b>What ${P()} doesn’t get:</b> your answers, your safety check, or anything you wrote here.</p>
</div>
${S.invited && !S.partnerJoined ? `
<div class="card" style="margin-top:14px" role="status"><h3>Invite status</h3><p style="margin:0"><b>Link shared.</b> ${P()} hasn’t started yet. I’ll let you know when Our map is ready.</p></div>
<div class="btn-row"><button class="btn" data-go="mode">Next: how you’ll use Simmer</button><button class="btn-ghost" data-go="pjoin">Demo: play ${P()}’s join on their phone</button></div>` : `
<div class="invite-code" aria-label="Invite code 7KQ2-DEMO"><span class="small">Or tell ${P()} this code</span><b class="tnum">7KQ2-DEMO</b></div>
<div class="field" style="margin-top:10px"><label for="lnk">Your invite link (demo, goes nowhere)</label><input class="input tnum" id="lnk" readonly value="simmer.app/join/7KQ2-DEMO"></div>
<div class="btn-row"><button class="btn" data-act="invite">Copy invite link</button><button class="btn-ghost" data-go="mode">Do it later</button></div>`}`);

screen('partner', 'Partner B', 'Their private intake', () => `
${pBanner()}
${say(`Hi ${S.partner ? P() : 'there'}! ${N()} invited you. This takes 2 minutes and it’s just for you. I won’t tell ${N()} what you say here.`)}
<h1 id="h" class="h2" style="font-size:26px">Which fights keep coming back for you?</h1>
<fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="sr">Topics ${P()} picked, and whether to share each on Our map</legend>
  ${[['Chores','feeling nagged'],['Tone','feeling talked down to'],['Money','—']].map(([t, u], i) => `
  <label class="radio-card"><input type="checkbox" ${i < 2 ? 'checked' : ''}><span><b>${t}</b><span class="small" style="display:block">${u !== '—' ? `Underneath: ${u}. ` : ''}Put this on Our map</span></span></label>`).join('')}
</fieldset>
<div class="btn-row"><button class="btn" data-go="psafety">Next: a private check</button></div>`);

function mapRows(full) {
  if (!S.demo && !S.partnerJoined) {
    if (!S.topics.length) return `<p class="small" style="margin:0">Nothing mapped yet. Pick the fights that keep coming back during setup and they’ll show up here.</p>`;
    return S.topics.map((k, i) => `
  <div class="map-row"><span class="map-rank" aria-hidden="true">${i + 1}</span><div>
    <h3 style="font-size:19px;margin:0">${esc(TOPICS[k]?.label || k)}</h3>
    <p class="small" style="margin:0">You added this · For you: ${esc(TOPICS[k]?.feel || '—')}</p>
    ${full ? `<p class="small" style="margin:4px 0 0"><b>New · no history yet</b></p>` : ''}
  </div></div>`).join('');
  }
  const rows = S.partnerJoined ? MAP : [{...MAP[0], who:'You added this', themU:'—', pct:60}];
  return rows.map((m, i) => `
  <div class="map-row"><span class="map-rank" aria-hidden="true">${i + 1}</span><div>
    <h3 style="font-size:19px;margin:0">${esc(m.label)} <span class="sr">rank ${i + 1}</span></h3>
    <div class="bar" role="img" aria-label="How often it comes up: ${m.pct} out of 100"><span style="width:${m.pct}%"></span></div>
    <p class="small" style="margin:0">${esc(m.who.replace('Alex', S.partner))}${m.themU !== '—' && S.partnerJoined ? ` · Underneath for ${P()}: ${esc(m.themU)}` : ''}${m.youU !== '—' ? ` · For you: ${esc(m.youU)}` : ''}</p>
    ${full ? `<p class="small" style="margin:4px 0 0"><b>${esc(m.status)}</b></p>` : ''}
  </div></div>`).join('');
}
screen('map', 'Onboarding', 'Our map preview', () => `
${backbar('invite')}
<p class="eyebrow">Our map</p>
<h1 id="h">Where you two get stuck</h1>
${S.partnerJoined ? `<p class="lede">Built from what you each chose to share. It shows patterns, not who’s right.</p>` :
`<div class="card cool" role="status" style="margin-bottom:12px"><p style="margin:0"><b>1 of 2 intakes done.</b> This is only your side. It fills in when ${P()} finishes theirs.</p><button class="btn-ghost sm" data-go="pjoin">Demo: play ${P()}’s join</button></div>`}
<section class="card" aria-label="Top conflict areas">${mapRows(false)}</section>
<section class="card locked" style="margin-top:12px" aria-label="Your first weekly plan, locked">
  <div class="blur" aria-hidden="true"><h3>Your first weekly plan</h3><p>Sunday 7 pm · 15 min check-in · Pick chores · One small action for Tuesday · Two 30-second nudges</p></div>
  <div class="over"><div><p style="font-weight:700;margin:0 0 8px">Your first weekly plan is ready</p><button class="btn" style="min-height:46px" data-go="paywall">See the plan options</button></div></div>
</section>`);

const PRICE = { monthly: '$14.99', yearly: '$119.99', yearlyPerMo: 'About $10 a month', save: 'Save 33%' };
screen('paywall', 'Onboarding', 'Paywall', () => `
${backbar(S.wallFrom === 'feature' || S.wallFrom === 'afterfight' ? 'home' : 'map')}
${S.wallFrom === 'feature' ? `<p class="eyebrow" style="margin:0 0 4px">${esc(S.wallFeat || 'This')} are part of Simmer Together</p>` : S.wallFrom === 'afterfight' ? `<p class="eyebrow" style="margin:0 0 4px">Fight mode stays free, always</p>` : ''}
<h1 id="h">One plan for both of you</h1>
<p class="lede">Bun is there at 11pm when the fight happens, free. Simmer Together adds weekly check-ins, Our map, Bun’s memory and monthly pattern cards, so there are fewer 11pm fights.</p>
<section class="card cool pw-compare" aria-label="How Simmer compares on price"><p style="margin:0"><b>A year of Simmer costs less than one couples counseling session.</b> US sessions average $141 to $175 without insurance.<sup>*</sup></p></section>
<fieldset style="border:0;padding:0;margin:14px 0 0" class="stack"><legend class="sr">Choose a plan</legend>
  <label class="radio-card plan" style="position:relative"><input type="radio" name="plan" value="yearly" ${S.plan === 'yearly' ? 'checked' : ''}><span><b>Yearly</b><span class="small" style="display:block">${PRICE.yearlyPerMo}, billed once a year</span></span><span class="price tnum">${PRICE.yearly}<small>per year</small></span><span class="save">${PRICE.save}</span></label>
  <label class="radio-card plan"><input type="radio" name="plan" value="monthly" ${S.plan === 'monthly' ? 'checked' : ''}><span><b>Monthly</b><span class="small" style="display:block">Cancel any month</span></span><span class="price tnum">${PRICE.monthly}<small>per month</small></span></label>
</fieldset>
<p class="small" style="margin:8px 2px 0">One subscription covers you both. ${P()} joins free with your invite.</p>
<section class="card flat" style="margin-top:14px" aria-labelledby="tl-h"><h3 id="tl-h">How the 7-day free trial works</h3>
  <ol class="timeline">
    <li><span><b>Today</b>Everything unlocked, for both of you. $0 today.</span></li>
    <li><span><b>Day 5 · ${fmtDay(trialDates().remind)}</b>I’ll remind you the trial is ending.</span></li>
    <li><span><b>Day 7 · ${fmtDay(trialDates().charge)}</b><span class="tnum">${chargeLine()}</span> unless you cancel before then. You cancel in your subscription settings (on iPhone: Settings › your name › Subscriptions).</span></li>
  </ol>
</section>
<div class="btn-row">
  <button class="btn" data-act="trial">Start 7-day free trial</button>
  <button class="btn light" data-act="decline">Not now, keep the free version</button>
</div>
<p class="small" style="text-align:center;margin-top:10px">Free forever: all of fight mode (the Pause button, the wind-down and every step after it) and your daily nudge.</p>
<p class="small pw-fine" style="margin-top:10px">Simmer is relationship coaching, not therapy or counseling, and it doesn’t replace a licensed therapist. If you’re in danger, call 911 or the National DV Hotline at <span style="white-space:nowrap">1-800-799-7233</span>. For a mental health crisis, call or text 988.<br><sup>*</sup>Average couples session without insurance: $141 (DatingNews survey, 2025), $152 (Synchrony cost study, 2025), about $175 (Real Cost Report, 2026).<br><b>Prototype:</b> no account is created and no payment is taken.</p>`);
const chargeLine = () => `You’re charged ${S.plan === 'yearly' ? PRICE.yearly + ' for the year' : PRICE.monthly + ' for the month'}`;

/* ---------- core ---------- */
function weeksDots(n) {
  const total = 6, on = Math.min(n, total - 1);
  return `<div class="weeks" aria-hidden="true">${Array.from({length: total}, (_, i) => `<i class="${i < on ? 'on' : i === on ? 'now' : ''}">${i < on ? '✓' : ''}</i>`).join('')}</div>`;
}
screen('home', 'Core', 'Home', () => {
  if (S.flagged) return homeSafe();
  return `
<div class="home-top"><p class="small" style="margin:0">${esc(fmtDay(Date.now(), {weekday:'long', month:'short', day:'numeric'}))}</p><span style="display:flex;gap:6px;align-items:center"><span class="pill">${S.paid ? 'Simmer Together · trial' : 'Free version'}</span><a class="gear" href="#/settings" aria-label="Settings and privacy"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a></span></div>
${!S.onb.done ? `<section class="card cool" style="margin:6px 0 10px"><p style="margin:0;font-weight:700">Finish setting up${S.onb.at ? ` · step ${onbStep(S.onb.at)} of ${ONB.length}` : ''}</p><p class="small" style="margin:2px 0 8px">${S.consent ? 'A few steps left so Bun can fit you two.' : 'Bun works best once you’ve done the private check and privacy consent.'}</p><button class="btn ink" style="min-height:44px;width:auto" data-go="${S.onb.at || 'about'}">Resume setup</button></section>` : ''}
<h1 id="h" class="sr">Home</h1>
${!S.paid && S.postFight ? `<section class="card cool pf-card" style="margin:6px 0 10px"><p style="margin:0;font-weight:700">Nice work getting through that one.</p><p class="small" style="margin:4px 0 0">Fight mode is free, always. If you want help between fights, Simmer Together adds weekly check-ins, Bun’s memory and monthly pattern cards.</p><div class="btn-row"><button class="btn ink" style="min-height:44px" data-act="pf-see">See Simmer Together</button><button class="btn-ghost sm" data-act="pf-dismiss">Not now</button></div></section>` : ''}
${S.memOn && S.agreements[0] ? `<button class="tile" data-go="agreements" style="background:transparent;box-shadow:none;padding:0;margin-top:6px" aria-label="Bun asks how your agreement is going. Open to answer.">${say(`${greeting()}${S.name ? ', ' + esc(S.name) : ''}! You two agreed: “${esc(demoNames(S.agreements[0].text))}”. <b>How’s it going?</b>`, 'happy', 72)}</button>` : say(`${greeting()}${S.name ? ', ' + esc(S.name) : ''}! I’m here when you need me, mid-fight or just to check in.`, 'happy', 72)}
<div class="stack" style="margin-top:14px">
  ${S.streak ? `<div class="card streak"><div><p class="h2 tnum" style="margin:0">${S.streak} week${S.streak === 1 ? '' : 's'}</p><p class="small" style="margin:0">check-in streak · next one Sunday</p></div><div style="margin-left:auto">${weeksDots(S.streak)}</div></div>` : `<div class="card streak"><div><p class="h2" style="margin:0">No check-ins yet</p><p class="small" style="margin:0">Your first weekly check-in takes about 15 minutes</p></div></div>`}
  <div class="home-fight"><button class="heated-btn" data-go="fight"><span style="flex:none">${bun(56,'hot')}</span><span><span class="t">We’re in a fight</span><span class="s">Calm down first. Bun walks you through it. Always free.</span></span></button><button class="pause-mini" type="button" data-fa="pause" aria-label="Pause: Bun starts talking right away">${PAUSE_I}<span>Pause</span></button></div>
  <section class="card butter" aria-labelledby="nudge-h">
    <h3 id="nudge-h">Today’s 30-second nudge</h3>
    ${S.nudgeDone ? `<p class="say" style="font-size:19px">Done for today ✓</p><p class="small" style="margin:0">Small and often beats big and rare. New nudge tomorrow.</p>` :
    `<p class="say" style="font-size:19px" id="nudge-t">Tell ${P()} one specific thing you noticed them do this week.</p>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center"><button class="btn ink" style="min-height:46px;width:auto" data-act="nudge">I did it</button><button class="btn-ghost sm" data-act="nudge-swap">Give me another</button></div>`}
  </section>
  <div class="grid2">
    <a class="tile" href="#/ourmap"><span class="k">Our map</span><span class="v" style="display:block">${S.partnerJoined ? 'Chores · Tone · Phone' : `Waiting on ${P()}`}</span><span class="small">${S.partnerJoined ? (S.demo ? 'Chores getting better' : 'Both sides in') : '1 of 2 intakes done'}</span></a>
    <a class="tile" href="#/checkin/1"><span class="k">Sunday 7 pm</span><span class="v" style="display:block">Weekly check-in</span><span class="small">15 min · together</span></a>
    ${S.demo ? `<a class="tile" href="#/pattern"><span class="k">${esc(fmtDay(Date.now() - 30 * 864e5, {month:'long'}))}</span><span class="v" style="display:block">Your pattern card</span><span class="small">Ready to read</span></a>` : `<a class="tile" href="#/pattern"><span class="k">Pattern card</span><span class="v" style="display:block">Monthly</span><span class="small">After a month of check-ins</span></a>`}
    <a class="tile" href="#/agreements"><span class="k">Agreements</span><span class="v" style="display:block">${S.agreements.length} active</span><span class="small">Bun follows up, no blame</span></a>
    <a class="tile" href="#/closer"><span class="k">Closer · 18+</span><span class="v" style="display:block">Feeling close again</span><span class="small">${S.closer.paused ? 'Paused' : 'Private, non-explicit'}</span></a>
    <a class="tile" href="/chat/?start=${S.mode}"><span class="k">${MODES[S.mode]?.t || 'Solo'} session</span><span class="v" style="display:block">Open chat</span><span class="small">Apart · Together · Solo</span></a>
    <button class="tile fx-wtile" type="button" data-fa="pause" aria-label="Home screen widget preview. Tap to pause: Bun starts talking right away.">
      <span class="widget fx-widget"><span class="wl">SIMMER</span><span class="fx-wpause" aria-hidden="true">${PAUSE_I}</span><span class="wl2">Tap to pause</span></span><span class="small" style="display:block;margin-top:6px;text-align:center">Widget preview</span>
    </button>
  </div>
</div>`;
}, {tabs:true});

function homeSafe() {
  return `
<h1 id="h" class="sr">Home, private mode</h1>
${say(`Hi${hiN()}. This is your private space. Whatever you need today, I’m here.`, 'soft', 72)}
<div class="stack" style="margin-top:14px">
  <button class="heated-btn" data-go="fight" style="background:var(--cool-soft)"><span style="flex:none">${bun(56,'calm')}</span><span><span class="t">I need a break</span><span class="s">A 20-minute cool-down, just for you.</span></span></button>
  <a class="tile" href="#/safe"><span class="k">Private</span><span class="v" style="display:block">Support you can reach 24/7</span><span class="small">Hotlines, chat, and safety planning</span></a>
  <a class="tile" href="#/bun"><span class="k">Just you and Bun</span><span class="v" style="display:block">Talk something through</span><span class="small">Never shared</span></a>
</div>`;
}

screen('heated', 'Core', 'We’re heated', () => `
${backbar('home')}
<div style="text-align:center">${bun(130, S.flagged ? 'calm' : 'hot')}</div>
<h1 id="h" style="text-align:center">Okay. Pause, not quit.</h1>
<p class="lede" style="text-align:center">When your heart is racing, nobody can really hear anybody. Twenty minutes apart lets both bodies settle. Then we try again, softer.</p>
${S.flagged ? '' : `<section class="card flat" aria-labelledby="pause-h"><h3 id="pause-h">Tell ${P()} you’re coming back</h3>
<p class="say" style="font-size:19px" id="pause-line">“I’m getting flooded. I want to finish this, so give me 20 minutes and I’ll come back.”</p>
<button class="btn-ghost sm" data-act="copy-pause">Copy to send it yourself</button><p class="small" style="margin:0">I never send anything for you.</p></section>`}
<div class="btn-row"><button class="btn cool" data-go="cooldown">Start my 20-minute cool-down</button><button class="btn-ghost" data-go="home">Not now</button></div>`, {exitIfFlag:true});

screen('cooldown', 'Core', '20-min cool-down', () => `
<div class="cool-screen">
  ${backbar('heated')}
  <p class="eyebrow cool" style="color:var(--mint);text-align:center">Cool-down</p>
  <h1 id="h" class="sr">20-minute cool-down</h1>
  <div class="breath" id="breath"><div id="cool-bun">${bun(130,'calm','#E85A3A')}</div></div>
  <p class="breath-cue" id="cue" aria-live="off">Breathe in…</p>
  <p class="timer tnum" id="timer" role="timer" aria-label="Time left">20:00</p>
  <div class="meter" aria-hidden="true"><span id="meter" style="width:0%"></span></div>
  <p class="small" id="cool-status" style="text-align:center">Your body needs about 20 minutes to settle. Try not to replay the argument.</p>
  <div class="ideas" aria-label="Ideas while you wait"><span>Walk around the block</span><span>Glass of water</span><span>One song, loud</span><span>Shower</span></div>
  <div class="btn-row" id="cool-actions">
    <button class="btn light" data-act="cool-pause" id="cool-pause">Pause timer</button>
    <button class="btn-ghost" data-act="cool-skip">Demo: skip to the end</button>
  </div>
</div>`, {noTop:true});

screen('repair', 'Core', 'Soft start-up + repair', () => `
${backbar('cooldown')}
${say(`You’re back. Nice. Here’s a softer way in, and one line to reach across.`, 'calm', 64)}
<h1 id="h" class="h2" style="font-size:28px;margin-top:14px">Start again, softer</h1>
<section class="card butter"><h3>Soft start-up</h3><p class="say ss" id="ss-live">${ssText()}</p>${S.soft?.why ? `<p class="small" style="margin:6px 0 0"><b>Why:</b> ${esc(S.soft.why)}</p>` : ''}</section>
<section class="card flat" style="margin-top:12px" aria-labelledby="rough-h"><h3 id="rough-h">Or say it your way first</h3>
  <label class="sr" for="rough">What you want to say, rough</label><textarea class="input" id="rough" placeholder="e.g. you never notice anything I do around here">${esc(S.soft?.rough || '')}</textarea>
  <div class="iflag" id="rough-flag" hidden role="status"></div>
  <button class="btn ink" style="margin-top:8px;min-height:46px" data-act="soften" id="soften-btn">Bun, make it softer</button>
  <p class="small" id="soft-status" aria-live="polite" style="margin:6px 0 0"></p></section>
<fieldset style="border:0;padding:0;margin:16px 0 0" class="stack"><legend class="h2" style="font-size:20px;margin-bottom:8px">Pick one repair line</legend>
  ${REPAIRS.map(r => `<label class="radio-card"><input type="radio" name="repair" value="${esc(r)}" ${S.repair === r ? 'checked' : ''}><span class="say" style="font-size:18px">${esc(r)}</span></label>`).join('')}
</fieldset>
<div class="btn-row">
  ${S.flagged ? `<button class="btn" data-go="debrief">Keep it for myself</button>` : `<button class="btn" data-act="copy-repair">Copy both to send to ${P()}</button><p class="small" style="text-align:center;margin:0">Nothing sends automatically. You send it, in your words.</p>`}
  <button class="btn-ghost" data-go="debrief">Skip to debrief</button>
</div>`, {exitIfFlag:true});

screen('debrief', 'Core', 'Debrief', () => `
${backbar('repair')}
<p class="eyebrow">2-minute debrief</p>
<h1 id="h">How did it land?</h1>
<fieldset style="border:0;padding:0;margin:0"><legend class="sr">How did it land</legend><div class="seg" id="land">${['Better','About the same','Worse'].map(v => `<label><input type="radio" name="land" value="${v}">${v}</label>`).join('')}</div></fieldset>
<p class="small" id="land-note" style="margin-top:10px" aria-live="polite"></p>
<h2 style="margin-top:14px">What helped?</h2>
<div class="chips" role="group" aria-label="What helped">${['The break','The soft start-up','The repair line','A hug','Nothing yet'].map(w => chip(w, false, 'data-toggle')).join('')}</div>
<div class="btn-row"><button class="btn" data-act="debrief-save">Save to Our map</button></div>`, {exitIfFlag:true});

const CI_STEPS = ['Appreciations','Pick one area','Take turns','One action','Close'];
function ciHead(n) {
  return `${backbar(n === 1 ? 'home' : `checkin/${n - 1}`)}
  <p class="eyebrow">Weekly check-in · step ${n} of 5 · ~15 min</p>
  <div class="progress" style="max-width:none;margin:0 0 12px" aria-hidden="true">${CI_STEPS.map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
}
function featureOff() {
  return `${backbar('home')}<div style="text-align:center">${bun(110,'soft')}</div><h1 id="h" class="h2" style="text-align:center;font-size:26px">This part is resting for now</h1>
  <p class="lede" style="text-align:center">Shared features are switched off on your account. Nothing about this was shared with anyone.</p>
  <div class="btn-row"><a class="btn cool" href="#/safe">See private support</a><a class="btn-ghost" href="#/home" style="text-align:center">Back home</a></div>`;
}
screen('checkin', 'Core', 'Weekly check-in', (step = 1) => {
  if (S.flagged) return featureOff();
  const n = Math.min(5, Math.max(1, +step || 1));
  const c = S.ci;
  if (n === 1) return `${ciHead(1)}
<h1 id="h">Three things you appreciated</h1>
<p class="lede" style="font-size:16px">Start warm. Each of you names three specific things from this week. Pass the phone when it’s ${P()}’s turn.</p>
<div class="card flat"><h3>${N()}</h3>${c.a.map((v, i) => `<div class="field" style="margin-bottom:8px"><label class="sr" for="a${i}">${N()} appreciation ${i + 1}</label><input class="input" id="a${i}" data-ci="a" data-i="${i}" value="${esc(v)}" placeholder="${['Thanks for…','I loved when you…','I noticed you…'][i]}"></div>`).join('')}</div>
<div class="card flat" style="margin-top:10px"><h3>${P()}</h3>${c.b.map((v, i) => `<div class="field" style="margin-bottom:8px"><label class="sr" for="b${i}">${P()} appreciation ${i + 1}</label><input class="input" id="b${i}" data-ci="b" data-i="${i}" value="${esc(v)}" placeholder="${['Thanks for…','I loved when you…','I noticed you…'][i]}"></div>`).join('')}</div>
<div class="btn-row"><button class="btn" data-go="checkin/2">Next</button><button class="btn-ghost" data-act="ci-fill">Demo: fill sample answers</button></div>`;
  if (n === 2) return `${ciHead(2)}
<h1 id="h">Pick one thing to work on</h1>
<p class="lede" style="font-size:16px">${S.demo ? 'Just one. Last week you talked about phones, so maybe something new?' : 'Just one. Whatever feels most alive this week.'}</p>
<fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="sr">Choose one area from Our map</legend>
${ciAreas().map(m => `<label class="radio-card"><input type="radio" name="area" value="${m.key}" ${c.area === m.key ? 'checked' : ''}><span><b>${esc(m.label)}</b>${m.status ? `<span class="small" style="display:block">${esc(m.status)}</span>` : ''}</span></label>`).join('')}
</fieldset>
<div class="btn-row"><button class="btn" data-go="checkin/3">Next</button></div>`;
  if (n === 3) return `${ciHead(3)}
<h1 id="h">Take turns: one talks, one listens</h1>
<div class="turn">
  <div class="role"><div class="speak" id="sp"><span class="small" style="color:#FFE7DE">Speaking</span><b id="sp-n">${N()}</b></div><div id="li"><span class="small">Listening</span><b id="li-n">${P()}</b></div></div>
  <p class="timer tnum" id="turn-t" role="timer" aria-label="Turn time left" style="font-size:56px;margin:8px 0">3:00</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn ink" data-act="turn-start" id="turn-start" style="min-height:48px">Start turn</button><button class="btn light" data-act="turn-switch" style="min-height:48px">Switch</button></div>
</div>
<section class="card cool" style="margin-top:12px"><h3>For the listener</h3><p style="margin:0">No rebuttals yet. When time’s up, say back what you heard: <b>“What I heard is… Did I get it?”</b></p></section>
<p class="small" style="margin-top:10px">Bun stays quiet here. It won’t decide who’s right.</p>
<div class="btn-row"><button class="btn" data-go="checkin/4">We both had a turn</button></div>`;
  if (n === 4) return `${ciHead(4)}
<h1 id="h">Agree on one small action</h1>
<div class="field"><label for="ci-act">What will happen</label><input class="input" id="ci-act" data-cif="action" value="${esc(demoNames(c.action))}" placeholder="e.g. Phones away at dinner on Thursday"></div>
<fieldset style="border:0;padding:0;margin:0 0 14px"><legend style="font-weight:600;margin-bottom:6px">Who owns it</legend><div class="seg">${[S.name || 'Me', S.partner || 'My partner', 'Both'].map(v => `<label><input type="radio" name="owner" value="${esc(v)}" ${c.owner === v ? 'checked' : ''}>${esc(v)}</label>`).join('')}</div></fieldset>
<div class="grid2"><div class="field"><label for="ci-day">Day</label><select class="input" id="ci-day" data-cif="day">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<option ${c.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
<div class="field"><label for="ci-time">Time</label><input class="input tnum" type="time" id="ci-time" data-cif="time" value="${esc(c.time)}"></div></div>
${c.added ? `<div class="card cal" role="status"><div class="d"><span>${esc(c.day.toUpperCase())}</span><b class="tnum">${dayNum(c.day)}</b></div><div><b>On both calendars (demo)</b><p class="small" style="margin:0">${esc(c.action)} · ${fmtTime(c.time)}</p><button class="btn-ghost sm" data-act="cal-undo">Undo</button></div></div>` : ''}
<div class="btn-row">${c.added ? `<button class="btn" data-go="checkin/5">Next</button>` : `<button class="btn" data-act="cal-plan">Put it on our calendar</button><button class="btn-ghost" data-go="checkin/5">Skip the calendar</button>`}</div>`;
  return `${ciHead(5)}
<div style="text-align:center">${bun(120,'happy')}</div>
<h1 id="h" style="text-align:center">One last question</h1>
<div class="field"><label for="love">What would make you feel loved this week?</label><textarea class="input" id="love" data-cif="love" placeholder="e.g. a real goodbye kiss in the morning">${esc(c.love)}</textarea></div>
<div class="btn-row"><button class="btn" data-act="ci-finish">Finish check-in</button></div>`;
}, {tabs:true, param:true});
const dayNum = d => nextWeekday(d).getDate();
const ciAreas = () => S.demo ? MAP : (S.topics.length ? S.topics : ['chores','money','phone','tone']).filter(k => TOPICS[k]).map(k => ({ key:k, label:TOPICS[k].label, status:'' }));
const fmtTime = t => { const [h, m] = (t || '18:30').split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; };

screen('streak', 'Core', 'Streak moment', () => `
<div style="text-align:center;margin-top:40px">${bun(160,'happy')}</div>
<p class="eyebrow" style="text-align:center">Check-in done</p>
<h1 id="h" class="xl tnum" style="text-align:center">${S.streak} weeks in a row</h1>
<div style="display:flex;justify-content:center;margin:8px 0 16px">${weeksDots(S.streak)}</div>
<p class="lede" style="text-align:center">That’s the whole trick: small, every week. I’ll check in on how it goes.</p>
<section class="card butter" style="margin-top:6px"><h3>Bun’s recap</h3><p id="recap" style="margin:0"><span class="skel" style="display:grid"><i></i><i></i><i></i></span></p></section>
<div class="btn-row"><a class="btn" href="#/home">Back home</a></div>`);

screen('ourmap', 'Core', 'Our map (full)', () => S.flagged ? featureOff() : `
<h1 id="h" style="margin-top:8px">Our map</h1>
<p class="lede" style="font-size:16px">Where you two get stuck, and what’s moving. Built only from what each of you chose to share.</p>
<section class="card" aria-label="Conflict areas">${mapRows(true)}</section>
${S.partnerJoined ? '' : `<div class="btn-row"><button class="btn" data-go="invite">Invite ${P()} again</button></div>`}
<p class="small" style="margin-top:12px">Patterns, not verdicts. Our map never says who’s right.</p>`, {tabs:true});

const FOLLOW = {
  yes:`Love that. I’ll mark it on Our map. Want to tell ${'{p}'} one thing you liked about it? That counts as today’s nudge.`,
  sort:'Half a Tuesday still counts. What got in the way: timing, energy, or something else? We can adjust it on Sunday.',
  no:'Thanks for being straight with me. Plans slip, no blame. Want me to bring it up gently at Sunday’s check-in?',
};
function chatHTML() {
  const ag = S.memOn && S.agreements[0];
  const first = S.flagged ? `I’m here whenever you want to talk. Just you and me. Nothing here is shared.` : ag ? `Hi${hiN()}. How’s “${esc(demoNames(ag.text))}” going? Or tell me what’s on your mind.<br><span class="memo-tag">From your ${esc(ag.made)}</span>` : `Hi${hiN()}. What’s on your mind?`;
  return `<div class="msg bun-m">${first}</div>` + S.chat.map(m => m.kind === 'safety'
    ? `<div class="msg bun-m">${esc(m.text)}${resourcesHTML()}</div>`
    : m.from === 'me' ? `<div class="msg me">${esc(m.text)}</div>` : m.from === 'sys' ? `<p class="small" style="text-align:center">${esc(m.text)}</p>` : `<div class="msg bun-m">${md(m.text)}</div>`).join('')
    + (CH.streaming ? `<div class="msg bun-m" id="ch-stream">${CH.text ? md(CH.text) : `<span class="status-line" style="margin:0"><span class="pulse"></span>Bun is reading what you wrote…</span>`}</div>` : '');
}
const CH = { streaming:false, text:'' };
screen('bun', 'Core', 'Bun (live chat + memory)', () => !S.consent ? consentGate() : `
<h1 id="h" class="h2" style="font-size:28px;margin-top:8px">Bun</h1>
<p class="small" style="margin:-4px 0 8px">Live AI coach · private to you · coaching, not therapy</p>
<div class="chat" id="chat" aria-live="polite">${chatHTML()}</div>
<form class="chat-form" id="f-chat" autocomplete="off"><label class="sr" for="chat-in">Message Bun</label><textarea class="input" id="chat-in" rows="2" maxlength="1500" placeholder="Tell Bun what happened…"></textarea><button class="btn" type="submit" style="width:auto;min-width:88px">Send</button></form>
<div class="iflag" id="chat-in-flag" hidden role="status"></div>
${S.chat.length ? `<div style="display:flex;justify-content:flex-end"><button class="btn-ghost sm" data-act="chat-clear">Start a fresh chat</button></div>` : `<div class="chips" role="group" aria-label="Quick starts" style="margin-top:8px">${['It happened!', 'Sort of', 'We had the same fight again', 'Help me say something hard'].map(c => `<button class="chip" data-quick="${esc(c)}">${esc(c)}</button>`).join('')}</div>`}
<section class="card" style="margin-top:18px" aria-labelledby="mem-h">
  <div style="display:flex;justify-content:space-between;align-items:center"><h3 id="mem-h" style="margin:0">What Bun remembers</h3>
  <label style="display:flex;gap:8px;align-items:center;font-weight:600;font-size:15px"><input type="checkbox" id="mem-on" ${S.memOn ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--tomato)"> Memory on</label></div>
  ${S.memory.length ? `<ul class="mem-list">${S.memory.map(m => `<li class="swipe" data-swipe="mem" data-id="${m.id}"><span>${esc(m.t.replace('Alex', S.partner).replace('Sam', S.name))}</span><button class="btn-ghost sm" data-forget="${m.id}" aria-label="Forget: ${esc(m.t)}">Forget</button></li>`).join('')}</ul>` : `<p class="small" style="margin:8px 0 0">Nothing saved. I’ll start fresh, and only remember what you tell me from now on.</p>`}
  <p class="small" style="margin:8px 0 0">${PC()} sees only Our map and agreements you made together. Your private answers stay private.</p>
</section>`, {tabs:true});

screen('pattern', 'Core', 'Monthly pattern card', () => S.flagged ? featureOff() : !S.demo ? `
${backbar('home')}
<p class="eyebrow">Pattern card</p>
<h1 id="h">Not enough history yet</h1>
<p class="lede">Your first pattern card shows up after about a month of check-ins and fights worked through here. It describes the loop, never who’s to blame.</p>
<div class="btn-row"><a class="btn" href="#/checkin/1">Start a check-in</a><a class="btn-ghost" href="#/home" style="text-align:center">Back home</a></div>` : `
${backbar('home')}
<p class="eyebrow">Your ${esc(fmtDay(Date.now() - 30 * 864e5, {month:'long'}))} pattern</p>
<h1 id="h">The loop is loosening</h1>
<div class="stack">
  <section class="card ink"><h3>What got better</h3><p class="say" style="font-size:21px">You repaired <span class="tnum">3 of 4</span> heated moments.</p><p class="small" style="margin:6px 0 0">From cool-down to repair took <span class="tnum">26 min</span> on average, down from <span class="tnum">55 min</span> in September.</p></section>
  <section class="card"><h3>Still loops</h3><p class="say" style="font-size:21px">Phone at dinner, 3 times</p><p class="small" style="margin:6px 0 0">Usually Thursday nights after 9 pm. Worth a look on Sunday?</p></section>
  <div class="grid2">
    <section class="card butter"><h3>Go-to repair</h3><p style="font-weight:700;margin:0">“Can we start over?”</p></section>
    <section class="card"><h3>Check-ins</h3><p class="say tnum" style="font-size:24px">4 of 4</p><p class="small" style="margin:0">Sundays</p></section>
  </div>
</div>
<p class="small" style="margin-top:12px">Made from your logs, not a verdict. This describes the loop, never who’s to blame.</p>
<div class="btn-row"><button class="btn light" data-act="share">Make a share card</button></div>`);

const HICON = { cooldown:'🫖', debrief:'📝', checkin:'📅', chat:'💬', repair:'🤝', aha:'💡' };
screen('history', 'Core', 'History', () => `
<h1 id="h" class="h2" style="font-size:28px;margin-top:8px">History</h1>
<p class="lede" style="font-size:16px">Saved on this device only. ${P()} can’t see it. Swipe an entry to delete it.</p>
${S.history.length ? `<ul class="hist">${S.history.map(h => `<li class="hist-i grow swipe" data-swipe="hist" data-id="${h.id}" data-hid="${h.id}"><span class="hist-ic" aria-hidden="true">${HICON[h.type] || '•'}</span><div><b>${esc(h.title)}</b>${h.detail ? `<p class="small" style="margin:2px 0 0">${esc(h.detail)}</p>` : ''}<p class="small" style="margin:2px 0 0;opacity:.75">${new Date(h.at).toLocaleString([], {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}</p></div><button class="btn-ghost sm" data-hdel="${h.id}" aria-label="Delete this entry">Delete</button></li>`).join('')}</ul>
<div class="btn-row"><button class="btn-ghost" data-act="hist-clear">Clear history</button></div>` : `<div class="card flat"><p style="margin:0">Nothing yet. Finish a cool-down, a repair, a check-in, or a chat with Bun and it shows up here.</p></div>`}`, {tabs:true});

screen('safe', 'Safety', 'Safe mode + resources', () => `
<div class="safe">
  ${backbar(S.flagged ? 'home' : 'safety')}
  <div style="text-align:center">${bun(96,'soft','#F9D98A')}</div>
  <h1 id="h" class="h2" style="font-size:28px;text-align:center">Thank you for telling me.</h1>
  <p class="lede" style="text-align:center;font-size:16.5px">You deserve to feel safe. Couples coaching isn’t the right tool when someone is afraid, so I’ve quietly switched off the shared parts of Simmer for you: no invite, no shared map, no check-ins. ${P()} won’t get any notice.</p>
  <div class="stack">
    <section class="res" aria-labelledby="r1"><h2 id="r1" style="font-size:19px;margin:0">National Domestic Violence Hotline</h2><p class="small" style="margin:0">Free, confidential, 24/7. Safety planning and local help.</p>
      <div class="act"><a href="tel:18007997233">Call 1-800-799-7233</a><a class="alt" href="sms:88788?&body=START">Text START to 88788</a></div>
      <a href="https://www.thehotline.org/" rel="noopener noreferrer" target="_blank" class="small">Chat online at thehotline.org</a></section>
    <section class="res" aria-labelledby="r2"><h2 id="r2" style="font-size:19px;margin:0">988 Suicide &amp; Crisis Lifeline</h2><p class="small" style="margin:0">If you’re in crisis or thinking about harming yourself.</p>
      <div class="act"><a href="tel:988">Call 988</a><a class="alt" href="sms:988">Text 988</a></div></section>
    <section class="res" aria-labelledby="r3"><h2 id="r3" style="font-size:19px;margin:0">In immediate danger?</h2><div class="act" style="grid-template-columns:1fr"><a href="tel:911">Call 911</a></div></section>
  </div>
  <p class="small" style="margin-top:14px"><b>Your privacy:</b> phones and browsers can be monitored. The <b>Quick exit</b> button (top left, or press Esc twice) jumps to a weather page. Consider clearing your history afterwards.</p>
  <div class="btn-row">${S.flagged ? `<a class="btn ink" href="#/home">Go to my private space</a>` : `<button class="btn ink" data-act="flag-on">Go to my private space</button>`}<button class="btn-ghost" data-act="safety-change">I answered by mistake</button></div>
</div>`, {exit:true, noTop:true});

/* ================= agreements + follow-up ================= */
const FOLLOW_L = { yes:'It happened', sort:'Sort of', no:'Not this time' };
screen('agreements', 'Core', 'Agreements + follow-up', () => S.flagged ? featureOff() : `
${backbar('home')}
<h1 id="h" class="h2" style="font-size:28px">Our agreements</h1>
<p class="lede" style="font-size:16px">Small promises from your check-ins. Bun checks in afterwards, no blame. Swipe one away to archive it.</p>
${S.agreements.length ? `<ul class="agr">${S.agreements.map(a => {
  const last = a.checks[0];
  return `<li class="card swipe" data-swipe="agr" data-id="${a.id}">
  <p class="eyebrow" style="margin:0">${esc(a.made)} · owner: ${esc(a.owner)}</p>
  <p class="say" style="font-size:19px;margin:4px 0 8px">${esc(demoNames(a.text))}</p>
  ${last ? `<div class="msg bun-m" style="margin:0 0 8px">${esc(FOLLOW[last.r].replace('{p}', S.partner))}</div>` : `<p style="margin:0 0 6px;font-weight:600">How’d ${esc(a.day)} go?</p>`}
  <div class="chips" role="group" aria-label="How did it go">${Object.entries(FOLLOW_L).map(([k, l]) => `<button type="button" class="chip" data-follow="${k}" data-aid="${a.id}" aria-pressed="${last?.r === k}">${l}</button>`).join('')}</div>
  ${a.checks.length ? `<details style="margin-top:8px"><summary class="small">Follow-up history (${a.checks.length})</summary><ul class="small" style="margin:6px 0 0;padding-left:18px">${a.checks.map(c => `<li>${new Date(c.at).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'})}: ${FOLLOW_L[c.r]}</li>`).join('')}</ul></details>` : ''}
  <button class="btn-ghost sm" data-agr-del="${a.id}" aria-label="Archive this agreement">Archive</button>
</li>`; }).join('')}</ul>` : `<div class="card flat"><p style="margin:0">No agreements yet. Finish a weekly check-in and your one small action shows up here.</p></div>`}
<div class="btn-row"><a class="btn light" href="#/checkin/1">Start a check-in</a></div>`, {tabs:true});

/* ================= settings + privacy ================= */
const tgl = (id, on, label, sub) => `<label class="toggle-row"><span><b>${label}</b>${sub ? `<span class="small" style="display:block">${sub}</span>` : ''}</span><input type="checkbox" role="switch" id="${id}" ${on ? 'checked' : ''}></label>`;
function storedCounts() {
  let room = null; try { room = JSON.parse(localStorage.getItem('simmer-live-chat') || '{}').room || null; } catch {}
  return { chat:S.chat.length, hist:S.history.length, mem:S.memory.length, agr:S.agreements.length, room };
}
screen('settings', 'Core', 'Settings + privacy', () => { const c = storedCounts(); return `
${backbar('home')}
<h1 id="h" class="h2" style="font-size:28px">Settings &amp; privacy</h1>
<section class="card cool"><p style="margin:0;font-weight:700">Coaching, not therapy.</p><p class="small" style="margin:4px 0 0">Bun is an AI coach. It isn’t a therapist and can’t help in an emergency. In danger, call 911. In crisis, call or text 988.</p></section>
<section class="card" style="margin-top:12px" aria-labelledby="st-h"><h3 id="st-h">What’s stored</h3>
  <ul class="kv">
    <li><span>Profile + onboarding answers</span><b>This device</b></li>
    <li><span>Private safety check</span><b>This device · never shared</b></li>
    <li><span>Chats with Bun</span><b class="tnum">${c.chat} messages · this device</b></li>
    <li><span>History</span><b class="tnum">${c.hist} entries · this device</b></li>
    <li><span>What Bun remembers</span><b class="tnum">${c.mem} notes · <a href="#/bun">edit</a></b></li>
    <li><span>Agreements</span><b class="tnum">${c.agr}</b></li>
    <li><span>Apart chat room</span><b>${c.room ? 'Our server · auto-deletes after 24 h' : 'None'}</b></li>
  </ul>
  <p class="small" style="margin:8px 0 0">To write Bun’s replies, what you type is sent to an AI model through Vercel’s AI Gateway. Your safety answers are never sent.</p>
</section>
<section class="card" style="margin-top:12px"><h3>Notifications</h3>
  ${tgl('n-on', S.notif.on, 'Allow notifications', 'Off by default. Prototype: nothing is ever actually sent.')}
  ${tgl('n-prev', S.notif.previews, 'Show message previews', 'Hidden by default, so a lock screen never shows what you wrote.')}
</section>
<section class="card" style="margin-top:12px"><h3>Coaching</h3>
  <div class="seg" style="grid-template-columns:1fr 1fr" role="radiogroup" aria-label="Coaching style">${['gentle','direct'].map(v => `<label><input type="radio" name="style" value="${v}" ${S.style === v ? 'checked' : ''}>${v === 'gentle' ? 'Gentle' : 'Direct'}</label>`).join('')}</div>
  ${tgl('mem-on2', S.memOn, 'Bun’s memory', 'Lets Bun follow up on agreements.')}
  <div class="btn-row" style="margin-top:8px"><button class="btn-ghost" data-act="retake-safety">Retake my private safety check</button><button class="btn-ghost" data-go="about">Read “what Simmer isn’t” again</button></div>
</section>
<section class="card flat" style="margin-top:12px"><h3>Your data</h3>
  <p class="small" style="margin:0 0 8px">Deletes everything on this device${c.room ? ' and the Apart room on our server' : ''}. You get a few seconds to undo.</p>
  <button class="btn danger" data-act="delete-all">Delete my data</button>
</section>
<p class="small" style="margin-top:12px">Prototype · model: open-weight (Kimi K2, DeepSeek fallback) · no account, no payment.</p>`; });

/* ================= Closer: 18+ connection module (non-explicit) ================= */
const BRAKES = ['Tired','Stress','Kids','Resentment','Body image','A full sink','Feeling pressured'];
const ACCELS = ['Feeling appreciated','Time alone together','Laughing together','Feeling rested','Touch with no agenda','A calm, clean house'];
const CLOSE_ITEMS = ['Longer hello and goodbye kisses','A massage with no expectations','Showering together','A date night at home','A night away somewhere new','Talking about what we each like','Morning closeness','Holding hands in public','Scheduling time for each other','Saying out loud what feels good','Cuddling before sleep','Trying something new together'];
const PARTNER_LIST = [2,2,1,2,2,0,1,2,2,1,2,0]; // 2 yes, 1 maybe, 0 no (demo: Alex's private answers)
const cl = () => S.closer;
function closerGuard() {
  if (S.flagged) return featureOff();
  if (cl().paused) return closerPaused();
  if (!cl().adult) return null;
  return null;
}
function closerPaused() {
  return `${backbar('home')}<div style="text-align:center">${bun(100,'soft')}</div>
  <h1 id="h" class="h2" style="font-size:26px;text-align:center">Closer is paused</h1>
  <p class="lede" style="text-align:center;font-size:16px">${cl().pausedWhy === 'pressure' ? 'Something you wrote sounded like pressure. Closeness only works when it’s a free yes, so I’ve paused this part. ' : 'You paused Closer. '}Nothing was shared with ${P()}, and they aren’t told why.</p>
  ${cl().pausedWhy === 'pressure' ? resourcesHTML() : ''}
  <div class="btn-row"><button class="btn" data-act="closer-resume">Resume Closer</button><a class="btn-ghost" href="#/home" style="text-align:center">Back home</a></div>`;
}
const closerTop = back => `${backbar(back)}<div style="display:flex;justify-content:space-between;align-items:center"><span class="pill">Closer · 18+</span><button class="btn-ghost sm" data-act="closer-pause">Pause Closer</button></div>`;

screen('closer', 'Closer 18+', 'Gate + privacy promise', () => closerGuard() || `
${backbar('home')}
<span class="pill">Closer · 18+</span>
<div style="text-align:center;margin-top:8px">${bun(110,'soft')}</div>
<h1 id="h" class="h2" style="font-size:28px;text-align:center">Feeling closer again</h1>
<p class="lede" style="text-align:center;font-size:16px">Sometimes the distance isn’t about sex. It’s about feeling unseen for a while. This is a gentle, non-explicit space to figure out what helps.</p>
<ul class="promises">
  <li><b>Private.</b> Your answers are never shown to ${P()}. Only things you <i>both</i> said yes or maybe to are revealed.</li>
  <li><b>A “no” is never shown.</b> Change or pause anytime, in one tap.</li>
  <li><b>No scorekeeping.</b> Streaks count check-ins, never intimacy.</li>
</ul>
<label class="radio-card" style="margin-top:12px"><input type="checkbox" id="closer-18" ${cl().adult ? 'checked' : ''}><span><b>I’m 18 or older</b> and I want to open this together.</span></label>
<p class="small" id="closer-err" aria-live="polite" style="color:var(--tomato-hi)"></p>
<div class="btn-row"><button class="btn" data-act="closer-start">Start, 3 minutes</button></div>`);

screen('closer-intake', 'Closer 18+', 'Private intake', () => closerGuard() || `
${closerTop('closer')}
<h1 id="h" class="h2" style="font-size:26px;margin-top:8px">Just for you</h1>
<p style="font-weight:600;margin:10px 0 6px">How connected do you feel lately?</p>
<div class="seg" style="grid-template-columns:repeat(5,1fr)">${[1,2,3,4,5].map(v => `<label><input type="radio" name="conn" value="${v}" ${cl().conn == v ? 'checked' : ''}>${v}</label>`).join('')}</div>
<p style="font-weight:600;margin:14px 0 6px">Who usually reaches out first?</p>
<div class="seg">${['Me', P(), 'About even'].map(v => `<label><input type="radio" name="init" value="${esc(v)}" ${cl().init === v ? 'checked' : ''}>${v}</label>`).join('')}</div>
<p style="font-weight:600;margin:14px 0 6px">What puts the brakes on for you?</p>
<div class="chips">${BRAKES.map(b => chip(b, cl().brakes.includes(b), `data-brake="${esc(b)}"`)).join('')}</div>
<p style="font-weight:600;margin:14px 0 6px">What helps you want closeness?</p>
<div class="chips">${ACCELS.map(b => chip(b, cl().accels.includes(b), `data-accel="${esc(b)}"`)).join('')}</div>
<p style="font-weight:600;margin:14px 0 6px">Desire for you usually…</p>
<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="sr">Desire style</legend>
${[['spontaneous','Shows up out of the blue'],['responsive','Shows up once things get going'],['unsure','Not sure']].map(([k, l]) => `<label class="radio-card"><input type="radio" name="desire" value="${k}" ${cl().desire === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
<div class="field" style="margin-top:12px"><label for="closer-note">Anything else Bun should know? (optional)</label><textarea class="input" id="closer-note">${esc(cl().note || '')}</textarea></div>
<div class="btn-row"><button class="btn" data-act="closer-intake-go">See my card</button></div>`);

screen('closer-card', 'Closer 18+', 'Brakes + accelerators card', () => closerGuard() || `
${closerTop('closer-intake')}
<h1 id="h" class="h2" style="font-size:26px;margin-top:8px">Your brakes and accelerators</h1>
<div class="grid2"><section class="card"><h3>Brakes</h3><ol class="small" style="margin:0;padding-left:18px">${(cl().brakes.slice(0, 3).length ? cl().brakes.slice(0, 3) : ['Tired']).map(b => `<li>${esc(b)}</li>`).join('')}</ol></section>
<section class="card butter"><h3>Accelerators</h3><ol class="small" style="margin:0;padding-left:18px">${(cl().accels.slice(0, 3).length ? cl().accels.slice(0, 3) : ['Time alone together']).map(b => `<li>${esc(b)}</li>`).join('')}</ol></section></div>
<section class="card ink" style="margin-top:12px"><p class="say" style="font-size:19px;margin:0">${cl().desire === 'responsive' ? 'Responsive desire is normal, not broken. It often shows up after things start, so “not in the mood yet” isn’t a no to closeness.' : 'Desire usually isn’t missing, it’s braked. Easing off a brake tends to work better than pressing the gas.'}</p></section>
${cl().brakes.some(b => b === 'Resentment' || b === 'A full sink') ? `<section class="card flat" style="margin-top:12px"><p style="margin:0"><b>“${esc(cl().brakes.find(b => b === 'A full sink') || 'Resentment')}” is a fight in disguise.</b> Want to work on that first?</p><a class="btn-ghost sm" href="#/repair">Open the fight coach</a></section>` : ''}
<div class="btn-row"><button class="btn" data-go="closer-list">Next: your private list</button></div>`);

screen('closer-list', 'Closer 18+', 'Private yes / no / maybe', () => closerGuard() || `
${closerTop('closer-card')}
<h1 id="h" class="h2" style="font-size:26px;margin-top:8px">Yes, no, or maybe?</h1>
<p class="small">Private. Only shared if ${P()} also says yes or maybe. A no is never shown.</p>
<ul class="ynm">${CLOSE_ITEMS.map((it, i) => `<li><span>${esc(it)}</span><div class="seg" role="radiogroup" aria-label="${esc(it)}">${[['2','Yes'],['1','Maybe'],['0','No']].map(([v, l]) => `<label><input type="radio" name="yn${i}" value="${v}" ${cl().mine[i] == v ? 'checked' : ''}>${l}</label>`).join('')}</div></li>`).join('')}</ul>
<div class="btn-row"><button class="btn" data-act="closer-list-go">Done</button><button class="btn-ghost" data-act="closer-fill">Demo: fill my answers</button></div>`);

screen('closer-match', 'Closer 18+', 'Mutual matches', () => {
  const g = closerGuard(); if (g) return g;
  const ids = CLOSE_ITEMS.map((_, i) => i).filter(i => (+cl().mine[i] > 0) && PARTNER_LIST[i] > 0);
  return `${closerTop('closer-list')}
<p class="eyebrow" style="margin-top:8px">${S.partnerJoined ? `${P()} finished their list too (demo)` : `Demo: ${P()}’s private list is pre-filled`}</p>
<h1 id="h" class="xl tnum" style="font-size:44px">You have ${ids.length} in common</h1>
<section class="card ${S.paid ? '' : 'locked'}" aria-label="Things you both said yes or maybe to">
  <div class="${S.paid ? '' : 'blur'}" ${S.paid ? '' : 'aria-hidden="true"'}><ul class="ticks">${ids.map(i => `<li>${esc(CLOSE_ITEMS[i])}${+cl().mine[i] === 2 && PARTNER_LIST[i] === 2 ? ' · <b>both yes</b>' : ''}</li>`).join('')}</ul></div>
  ${S.paid ? '' : `<div class="over"><div><p style="font-weight:700;margin:0 0 8px">See your ${ids.length} matches</p><button class="btn" style="min-height:46px" data-go="paywall">See the plan options</button></div></div>`}
</section>
<p class="small" style="margin-top:8px">Anything either of you said no to stays hidden. Edit your list anytime.</p>
<div class="btn-row"><button class="btn" data-go="closer-plan">Make a gentle plan</button></div>`;
});

screen('closer-plan', 'Closer 18+', 'Weekly plan + tonight signal', () => closerGuard() || `
${closerTop('closer-match')}
<h1 id="h" class="h2" style="font-size:26px;margin-top:8px">This week, no pressure</h1>
<section class="card butter"><h3>The plan</h3><ul class="ticks"><li>Two 15-minute touch sessions, no goal beyond enjoying it (Tue, Sat)</li><li>One talk prompt: <i>“When did you feel closest to me this month?”</i></li></ul></section>
<section class="card" style="margin-top:12px"><h3>Open to it tonight?</h3>
  ${cl().open && cl().pOpen ? `<p class="say" style="font-size:19px;margin:0">You’re both open tonight. No pressure, either of you can change your mind.</p>` : cl().open ? `<p style="margin:0 0 8px">Signal sent, privately. It only shows if ${P()} taps it too. If not, nobody sees anything.</p><button class="btn-ghost sm" data-act="closer-popen">Demo: ${P()} taps too</button> <button class="btn-ghost sm" data-act="closer-open">Take it back</button>` :
  `<p class="small" style="margin:0 0 8px">Tap if you’d like closeness tonight. ${P()} only finds out if they tapped too.</p><button class="btn ink" style="min-height:46px" data-act="closer-open">I’m open to it tonight</button>`}
</section>
<section class="card flat" style="margin-top:12px"><h3>“Not tonight, but…”</h3><p class="say" style="font-size:18px;margin:0" id="nt-line">“Not tonight, I’m wiped. But I’d love to fall asleep holding you.”</p><button class="btn-ghost sm" data-act="copy-nt">Copy</button></section>
<div class="btn-row"><button class="btn" data-go="closer-checkin">Weekly 10-minute check-in</button></div>`);

screen('closer-checkin', 'Closer 18+', '10-min connection check-in', () => closerGuard() || `
${closerTop('closer-plan')}
<h1 id="h" class="h2" style="font-size:26px;margin-top:8px">Closer check-in</h1>
<p style="font-weight:600;margin:10px 0 6px">How connected did this week feel?</p>
<div class="seg" style="grid-template-columns:repeat(5,1fr)">${[1,2,3,4,5].map(v => `<label><input type="radio" name="cconn" value="${v}">${v}</label>`).join('')}</div>
<div class="field" style="margin-top:12px"><label for="c-helped">What helped?</label><textarea class="input" id="c-helped" placeholder="e.g. the Saturday cuddle, phones in the kitchen"></textarea></div>
<p style="font-weight:600;margin:10px 0 6px">Next week</p>
<div class="seg">${['Same plan','Lighter','Something new'].map(v => `<label><input type="radio" name="cnext" value="${v}">${v}</label>`).join('')}</div>
<p class="small" id="cc-err" aria-live="polite"></p>
<p class="small">Streak: <b class="tnum">${cl().checks.length}</b> check-ins. It counts conversations, never intimacy.</p>
<div class="btn-row"><button class="btn" data-act="closer-cc-go">Save check-in</button></div>`);

function consentGate() {
  return `<h1 id="h" class="h2" style="font-size:28px;margin-top:8px">Bun</h1>${say('Before we chat: I’m an AI coach, not a therapist, and I can’t help in an emergency. Quick consent first?', 'soft', 64)}
  <div class="btn-row"><button class="btn" data-act="consent-from-bun">Read the privacy promise</button></div>`;
}

/* ================= Fight mode (Nov 3 call): fork -> stage 1 "wind down" for real; stages 2-3 shown as "coming next" ================= */
/* Voice: browser SpeechSynthesis for Bun's lines (captions always on screen), Web Speech recognition for answers with typing fallback. */
const V = (() => {
  const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const RecCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voice = null, unlocked = false, rec = null, tok = 0, session = null, listenGen = 0;
  const pickVoice = () => { if (!ok) return; const vs = speechSynthesis.getVoices(); voice = vs.find(v => /Samantha|Ava|Allison|Google US English|Microsoft (Aria|Jenny)/i.test(v.name)) || vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; };
  if (ok) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch {} }
  const wave = on => { api.busy = on; $$('.fx-wave').forEach(e => e.classList.toggle('on', on)); };
  const api = {
    ok, canListen: !!RecCtor, busy: false, started: false,
    // iOS/Safari only allow speech after a user gesture: speak a silent utterance on the first tap.
    unlock() { if (!ok || unlocked) return; unlocked = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch {} },
    cancel() { tok++; if (ok && window.SimmerSpeech) SimmerSpeech.hush(speechSynthesis); wave(false); api.stopListen(); },
    speak(text, onend) {
      const t = String(text || '').replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); const my = ++tok;
      let ended = false; const fin = () => { if (ended) return; ended = true; if (my === tok) wave(false); onend && onend(); };
      const words = t.split(' ').length;
      if (session && session.listening) { fin(); return false; }
      if (!ok || !S.voice || !t) { if (t) { wave(true); setTimeout(fin, Math.min(7000, 700 + words * 260)); } else fin(); api.started = false; return false; }
      try { speechSynthesis.cancel(); } catch {}
      const u = new SpeechSynthesisUtterance(t); if (voice) u.voice = voice; u.lang = voice?.lang || 'en-US'; u.rate = .94; u.pitch = 1.04;
      u.onstart = () => { api.started = true; if (my === tok) wave(true); }; u.onend = fin; u.onerror = fin;
      api.started = false; wave(true);
      setTimeout(() => { if (my !== tok) return; try { speechSynthesis.speak(u); } catch { fin(); } }, 70);
      setTimeout(fin, Math.min(20000, 1800 + words * 480)); // some browsers never fire onend
      return true;
    },
    listen(onText, onEnd) {
      if (!RecCtor || !window.SimmerSpeech) return false;
      api.stopListen(true);
      const my = ++listenGen;
      if (ok) SimmerSpeech.hush(speechSynthesis);
      wave(false);
      session = SimmerSpeech.createSession({
        Rec: RecCtor, synth: ok ? speechSynthesis : null, keep: true, onText,
        onEnd: text => { if (my !== listenGen) return; session = null; onEnd && onEnd(text); },
      });
      return session.start();
    },
    stopListen(silent = false) { if (silent) listenGen += 1; const current = session; session = null; rec = null; if (current) current.stop(); },
  };
  return api;
})();
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-fa="mic"]')) return; V.unlock(); }, true);
const toSpeech = html => { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<(br|\/p|\/li)\b[^>]*>/gi, ' $&'); return d.textContent.replace(/\s+/g, ' ').trim(); };

const F = { mode:'', who:'A', i:0, ans:{A:{}, B:{}}, plan:{A:null, B:null}, line:{A:'', B:''}, done:{A:false, B:false}, ready:{A:false, B:false}, lock:{A:false, B:false}, mins:{sit:4, walk:10}, logged:false, extra:0 };
const fRaw = w => w === 'B' ? (S.partner || 'Partner 2') : (S.name || 'Partner 1');
const fName = w => esc(fRaw(w));
const fOther = w => w === 'A' ? 'B' : 'A';
const fReset = mode => { const m = F.mins; Object.assign(F, { mode, who:(mode === 'solo' && !S.flagged) ? null : 'A', i:0, ans:{A:{}, B:{}}, plan:{A:null, B:null}, line:{A:'', B:''}, done:{A:false, B:false}, ready:{A:false, B:false}, lock:{A:false, B:false}, mins:m, logged:false, extra:0 }); };
// Pass-the-phone: leaving an unfinished set of answers wipes them, so the next person can't read them.
const fHandoff = () => { const w = F.who; if (w && !F.lock[w]) { F.ans[w] = {}; F.plan[w] = null; F.line[w] = ''; } F.who = null; F.i = 0; };
/* A safety flag applies to that one message: show help, then let them go back. Never switches the app into private mode. */
let safeSet = false;
const safetyHit = ret => { V.cancel(); S.safeRet = ret || 'fork'; safeSet = true; save(); go('fsafe'); };

const CHEV = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LOCK = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';
const PAUSE_I = '<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.6" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.6" fill="currentColor"/></svg>';
const SPK = on => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`;
const MIC = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const GEAR = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const IC = {
  two:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="17" cy="15" r="6" fill="currentColor"/><circle cx="31" cy="15" r="6" fill="currentColor" opacity=".55"/><path d="M6 40c0-7 5-12 11-12s11 5 11 12zM22 40c0-7 4-12 9-12s11 5 11 12z" fill="currentColor"/></svg>',
  split:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="15" r="6" fill="currentColor"/><circle cx="36" cy="15" r="6" fill="currentColor" opacity=".55"/><path d="M2 40c0-7 4-12 10-12s10 5 10 12zM26 40c0-7 4-12 10-12s10 5 10 12z" fill="currentColor"/><path d="M24 6v36" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 4"/></svg>',
  sit:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="9" fill="currentColor" opacity=".5"/><circle cx="24" cy="24" r="3.5" fill="currentColor"/></svg>',
  walk:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="27" cy="8" r="4.5" fill="currentColor"/><path d="M26 15l-6 9 6 5-3 14M26 15l7 8 6 1M20 24l-7 3M26 29l9 13" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const voiceBtn = () => `<button type="button" class="fx-voice" data-fa="voice" aria-pressed="${!!S.voice}" aria-label="Bun’s voice ${S.voice ? 'on' : 'off'}">${SPK(S.voice)}<span>${!V.ok ? 'Captions' : S.voice ? 'Voice on' : 'Voice off'}</span></button>`;
const fTop = backAttr => `<div class="backbar fx-bar"><button class="back" type="button" ${backAttr} aria-label="Back">${CHEV}Back</button>${voiceBtn()}<span class="fx-vs-gap"></span></div>`;
function stages(done1) {
  const st = [['Wind down', done1 ? 'Done' : 'Now'], ['Talk it through', 'Coming next'], ['Seal it', 'Coming next']];
  return `<ol class="fstages" aria-label="Three stages. Stage 1, wind down, ${done1 ? 'done' : 'in progress'}. Stages 2 and 3 are coming next.">${st.map(([t, s], i) => `<li class="${i === 0 ? (done1 ? 'done' : 'on') : 'lock'}"><span class="n" aria-hidden="true">${i === 0 ? (done1 ? '✓' : '1') : LOCK}</span><span class="tx"><b>${t}</b><small>${s}</small></span></li>`).join('')}</ol>`;
}
const fBun = (html, mood = 'talk', size = 64) => `<div class="fx-say"><div class="fx-bun">${bun(size, mood)}<div class="fx-wave ${V.busy ? 'on' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div><div class="bubble fx-cap" aria-live="polite"><span class="who">Bun</span><span class="fx-text">${html}</span></div></div>`;

/* ---- fork ---- */
screen('fork', 'Fight mode', 'Fork · fight or chill?', () => `
<div class="fork">
  <div class="fork-top"><span class="brand">${bun(30,'happy')} Simmer</span><span style="display:flex;gap:2px;align-items:center;margin-right:auto;margin-left:6px">${!S.onb.done && !S.flagged ? `<button class="btn-ghost sm" type="button" data-go="${S.onb.at || 'splash'}">Finish setup</button>` : ''}<a class="gear" href="#/settings" aria-label="Settings and privacy">${GEAR}</a></span></div>
  <h1 id="h">Are we in a fight, or just here to chill?</h1>
  <button class="fork-btn fight" type="button" data-go="fight"><span class="fb-bun">${bun(78,'hot')}</span><span><span class="t">We’re in a fight</span><span class="s">Calm down first. Bun walks you through it.</span></span></button>
  <button class="fork-btn chill" type="button" data-go="home"><span class="fb-bun">${bun(78,'happy')}</span><span><span class="t">Just here to chill</span><span class="s">Check-ins, Our map, and Bun.</span></span></button>
  <button class="pause-cta" type="button" data-fa="pause"><span class="pause-dot" aria-hidden="true">${PAUSE_I}</span><span><b>Pause</b><span>Mid-fight and can’t think? One tap. Bun starts talking.</span></span></button>
  <p class="fine">Coaching, not therapy. Bun never says who’s right.</p>
</div>`, {noTop:true});

/* ---- stage 1 hub (also the Pause target: same screen, Bun speaks first) ---- */
const hubLine = pause => S.flagged
  ? (pause ? `Pause. Breathe out, long and slow. I’m right here with you. Let’s calm your body first.` : `Okay. Let’s calm your body first. Just you and me.`)
  : pause ? `${S.name && S.partner ? `${esc(S.name)}, ${esc(S.partner)}` : 'You two'}: pause. Stop talking for one breath. Breathe out, long and slow. I’m Bun. Nobody’s in trouble, and nobody has to be right yet. First we calm your bodies. Together, or separately?`
  : `Okay. Pause, not quit. First we calm your bodies, then you can actually hear each other. Together, or separately?`;
function fightHub(pause) {
  return `${fTop('data-go="fork"')}
${stages(false)}
<div class="${pause ? 'fx-pausing' : ''}">${fBun(hubLine(pause), pause ? 'talk' : 'soft', pause ? 88 : 64)}</div>
${pause ? `<button type="button" class="btn-ghost sm fx-hear" data-fa="hear" hidden>Tap to hear Bun</button>` : ''}
<h1 id="h" class="h2 fx-h">${S.flagged ? 'Let’s calm your body first' : 'Wind down: together, or separately?'}</h1>
<div class="stack">
  ${S.flagged ? '' : `<button class="fchoice" type="button" data-go="together"><span class="fc-ic">${IC.two}</span><span><b>Together</b><span>Stay in the same room. Sit still, or walk it off side by side.</span></span></button>`}
  <button class="fchoice" type="button" data-fa="solo-start"><span class="fc-ic">${IC.split}</span><span><b>${S.flagged ? 'Just me and Bun' : 'Separately'}</b><span>${S.flagged ? 'Five quick questions, then the wind-down that fits you.' : 'Each of you answers 5 quick questions with Bun, winds down your own way, then comes back.'}</span></span></button>
</div>
<p class="small fx-help">Scared, or not safe right now? <a href="#/fsafe">Get help privately</a></p>`;
}
screen('fight', 'Fight mode', 'Stage 1 · together or separately?', () => fightHub(false));
screen('pause', 'Fight mode', 'Pause (widget / Siri stand-in)', () => fightHub(true));

/* ---- together ---- */
screen('together', 'Fight mode', 'Together · sit still or walk?', () => S.flagged ? featureOff() : `${fTop('data-go="fight"')}
${stages(false)}
${fBun('Pick what your bodies need. If either of you feels like pacing, walk. If you’re both a little calmer, sit.', 'soft', 60)}
<h1 id="h" class="h2 fx-h">How do you want to calm down?</h1>
<div class="stack">
  <button class="fchoice sit" type="button" data-go="wind/sit"><span class="fc-ic">${IC.sit}</span><span><b>Sit still</b><span>Face each other. Soft eye contact, slow breathing, 3 to 5 minutes. For calmer moments.</span></span></button>
  <button class="fchoice walk" type="button" data-go="wind/walk"><span class="fc-ic">${IC.walk}</span><span><b>Walk it off</b><span>Out the door, side by side. Bun speaks up every couple of minutes. For when you’re buzzing.</span></span></button>
</div>`);

/* ---- separately: Bun's 5 questions ---- */
const QS = [
  { k:'what', q:w => `${fName(w)}, in one line, what’s happening right now? Only you see this, and it hides when you finish.`, type:'text', ph:'e.g. we’re yelling about the dishes again' },
  { k:'level', q:() => `How activated are you, from 1 to 10? Ten is about to explode.`, type:'scale' },
  { k:'body', q:() => `Where do you feel it in your body? Pick any.`, type:'chips', multi:true, opts:['Tight chest','Hot face','Clenched jaw or fists','Racing heart','Knot in my stomach','Shaky','Numb or frozen'] },
  { k:'move', q:() => `Right now, do you want to move, or to be still?`, type:'chips', opts:['Move','Be still','Not sure'] },
  { k:'mins', q:w => `How long before you could really listen to ${fName(fOther(w))} again?`, type:'chips', opts:['10 min','20 min','30 min'] },
];
const PLANS = {
  move:{ key:'move', title:'Move it out', sayAs:'moving it out', how:'A brisk walk, stairs, or shaking it out. Get the charge out of your body first.', cues:['Keep moving. Long steps.','Shake out your hands and shoulders.','Breathe out longer than you breathe in.','Name five things you can see.','You’re doing the hard part: not texting, not arguing. Just moving.','Slow down a little. Notice your breathing.'] },
  breathe:{ key:'breathe', title:'Slow breathing', sayAs:'slow breathing', how:'Somewhere quiet. In for four, out for six. Let the long exhale do the work.', cues:['In for four.','And out for six, slowly.','Drop your shoulders.','Unclench your jaw and your hands.','If the fight replays in your head, let it pass. Back to the breath.','One more long breath out.'] },
  ground:{ key:'ground', title:'Cold water + 5-4-3-2-1', sayAs:'cold water, then five-four-three-two-one', how:'Cold water on your face, then name 5 things you see, 4 you hear, 3 you can touch.', cues:['Cold water on your face, or hold something cold.','Name five things you can see.','Four things you can hear.','Three things you can touch.','Two slow breaths. You’re here.','Wiggle your toes. Feel your feet on the floor.'] },
};
function pickPlan(a) {
  const lvl = +a.level || 5, body = (a.body || []).join(' ').toLowerCase(), mv = a.move || '';
  if (/numb|frozen/.test(body) && mv !== 'Move') return 'ground';
  if (mv === 'Move' || (lvl >= 7 && mv !== 'Be still')) return 'move';
  return 'breathe';
}
const soloMins = w => parseInt(F.ans[w].mins, 10) || 20;
const scriptedLine = w => { const a = F.ans[w], p = PLANS[F.plan[w]]; return `Thanks, ${fRaw(w)}. You said about ${a.level || 5} out of 10 right now, and that makes sense mid-fight. Let’s try ${p.sayAs} for ${soloMins(w)} minutes. I’m not picking sides. I’ll nudge you back to ${fRaw(fOther(w))} when the time’s up.`; };

function soloHand() {
  return `${fTop('data-go="fight"')}
${stages(false)}
${fBun('One phone, one person at a time. Whoever goes first, take the phone. The other one, step out of view for a minute.', 'soft', 60)}
<h1 id="h" class="h2 fx-h">Who’s holding the phone?</h1>
<div class="fx-hand">${['A','B'].map(x => `<button class="fchoice" type="button" data-fa="hand" data-w="${x}"><span class="fc-ic">${IC.split}</span><span><b>I’m ${fName(x)}</b><span>${F.lock[x] ? 'Your answers are hidden. Tap to get back to your wind-down.' : 'Five quick questions, then a wind-down that fits you.'}</span></span></button>`).join('')}</div>
<p class="small" style="margin-top:12px">Bun won’t read these questions out loud. Your answers are hidden as soon as you finish, and they’re never shown or read to your partner. Bun’s AI gets a short summary (how activated you are, what your body needs) to pick your wind-down.</p>
<p class="small fx-help">Scared, or not safe right now? <a href="#/fsafe">Get help privately</a></p>`;
}
screen('solo', 'Fight mode', 'Separately · Bun’s 5 questions', () => {
  if (!F.mode) fReset('solo');
  if (!S.flagged && !F.who) return soloHand();
  const w = S.flagged ? 'A' : F.who;
  if (F.i >= QS.length) return soloSuggest(w);
  const q = QS[F.i], a = F.ans[w];
  const whoRow = '';
  let input = '';
  if (q.type === 'text') input = `<form id="f-fq" class="fx-form" autocomplete="off" novalidate><label class="sr" for="fq-in">Your answer</label><textarea class="input" id="fq-in" rows="2" maxlength="400" placeholder="${esc(q.ph)}">${esc(a[q.k] || '')}</textarea>
    <div class="fx-row">${V.canListen ? `<button type="button" class="btn light fx-mic" data-fa="mic" aria-pressed="false">${MIC}<span>Talk</span></button>` : ''}<button class="btn" type="submit">Next</button></div></form>
    ${V.canListen ? '' : '<p class="small">Voice answers aren’t supported in this browser, so type it.</p>'}`;
  if (q.type === 'scale') input = `<div class="fx-scale" role="group" aria-label="How activated, 1 to 10">${Array.from({length:10}, (_, i) => `<button type="button" class="chip lv${i + 1}" data-fans="${i + 1}" aria-pressed="${+a.level === i + 1}">${i + 1}</button>`).join('')}</div><div class="fx-scale-l small"><span>Pretty calm</span><span>About to explode</span></div>`;
  if (q.type === 'chips') input = `<div class="chips" role="group" aria-label="Choices">${q.opts.map(o => `<button type="button" class="chip" data-fans="${esc(o)}" aria-pressed="${q.multi ? (a[q.k] || []).includes(o) : a[q.k] === o}">${esc(o)}</button>`).join('')}</div>${q.multi ? `<div class="btn-row"><button class="btn" type="button" data-fa="fq-next">Next</button></div>` : ''}`;
  return `${fTop(F.i ? 'data-fa="fq-prev"' : S.flagged ? 'data-go="fight"' : 'data-fa="to-hand"')}
${stages(false)}
${whoRow}
<div class="fx-qhead"><p class="eyebrow" style="margin:0">Question ${F.i + 1} of ${QS.length} · for ${fName(w)} only</p><div class="fx-dots" aria-hidden="true">${QS.map((_, i) => `<i class="${i <= F.i ? 'on' : ''}"></i>`).join('')}</div></div>
${fBun(q.q(w), 'talk', 60)}
<h1 id="h" class="sr">${esc(toSpeech(q.q(w)))}</h1>
${input}
<p class="small fx-help">Bun stays neutral and never says who’s right. Coaching, not therapy. <a href="#/fsafe">Need real help?</a></p>`;
}, {exit:false});

function soloSuggest(w) {
  const pk = F.plan[w] || (F.plan[w] = pickPlan(F.ans[w])); const p = PLANS[pk]; const mins = soloMins(w);
  const locked = F.lock[w] && !S.flagged, o = fOther(w);
  return `${fTop(locked ? 'data-fa="to-hand"' : 'data-fa="fq-prev"')}
${stages(false)}
<p class="eyebrow">Bun’s pick for ${fName(w)}</p>
${locked ? `<p class="small" style="margin:0 0 8px">Your answers are hidden.</p>` : `<div id="fx-sugg">${fBun(F.line[w] ? md(F.line[w]) : `<span class="status-line" style="margin:0"><span class="pulse"></span>Bun is thinking about what fits you…</span>`, 'calm', 60)}</div>`}
<h1 id="h" class="sr">Your wind-down</h1>
<section class="card butter fx-plan"><h3>Your wind-down</h3><p class="say">${p.title}</p><p style="margin:6px 0 0">${p.how}</p><p class="small" style="margin:8px 0 0"><b class="tnum">${mins} minutes.</b> Then Bun nudges you back to ${fName(fOther(w))}.</p></section>
<p class="small" style="margin:12px 0 6px">Not right? Pick another:</p>
<div class="chips" role="group" aria-label="Pick a different wind-down">${Object.values(PLANS).map(x => `<button type="button" class="chip" data-fplan="${x.key}" aria-pressed="${x.key === pk}">${x.title}</button>`).join('')}</div>
<div class="btn-row"><button class="btn cool" type="button" data-fa="solo-go">Start my ${mins}-minute wind-down</button>${!S.flagged && !F.lock[o] ? `<button class="btn light" type="button" data-fa="solo-pass">Hide my answers, pass the phone to ${fName(o)}</button>` : ''}</div>`;
}
async function fetchLine(w) {
  const a = F.ans[w], p = PLANS[F.plan[w]], mins = soloMins(w);
  // Neutral summary only: what they wrote about the fight is left out, unless it needs a safety read in context.
  const ft = a.what && AMBIG_RE.test(a.what) ? `\n(For the safety check only, never repeat or refer to it: "${a.what}")` : '';
  const summary = `How activated: ${a.level || '?'} out of 10\nBody: ${(a.body || []).join(', ') || '(skipped)'}\nRight now wants to: ${a.move || 'not sure'}\nNeeds about ${mins} minutes before they can listen\nWind-down the app picked: ${p.title} (${p.how})${ft}`;
  const names = w === 'A' ? { A:S.name, B:S.partner } : { A:S.partner, B:S.name };
  const paint = t => { const el = $('#fx-sugg .fx-text'); if (el && t) el.innerHTML = md(t); };
  const r = await coach({ mode:'app', task:'winddown', names, me:'A', profile: w === 'A' ? profile() : null, messages:[{ from:'A', text:summary }] }, paint);
  if (r.safety) { F.line[w] = scriptedLine(w); safetyHit('solo'); return; }
  F.line[w] = (!r.error && !r.pass && r.text) ? r.text : scriptedLine(w);
  F.lineSrc = r.model || (r.error ? 'scripted' : '');
  if (location.hash === '#/solo' && F.who === w) paint(F.line[w]); // shown, never spoken: it reflects private answers
}

/* ---- timers: sit still / walk / solo wind-down ---- */
const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function windCfg(k) {
  if (k === 'solo') {
    const w = S.flagged ? 'A' : F.who; if (!F.plan[w]) F.plan[w] = pickPlan(F.ans[w]); const p = PLANS[F.plan[w]];
    return { k, title:p.title, eyebrow:'Separately · your wind-down', mins: soloMins(w), opts:null, every:60, breath: p.key === 'breathe', cues:p.cues, back:'solo',
      intro:`${p.how} Tap start and put the phone down. I’ll talk you through it.`,
      end: S.flagged ? `That’s your time, ${fRaw(w)}. Notice how your body feels now. You did that.` : `That’s ${soloMins(w)} minutes, ${fRaw(w)}. Your body’s had time to settle. When you’re ready, head back to ${fRaw(fOther(w))}. Start small, like: I’m back. Can we try again?` };
  }
  if (k === 'walk') return { k, title:'Walk it off, together', eyebrow:'Together · walk', mins:F.mins.walk, opts:[10,15,20], every:120, breath:false, back:'together',
    intro:`Shoes on, phone in your pocket. Walk side by side, not face to face. I’ll speak up every couple of minutes.`,
    cues:['Side by side. Match your steps.','Name five things you can see, out loud. Take turns.','Loosen your hands. Shake them out.','No fight talk on the walk. Just walk.','Breathe out longer than you breathe in.','Turn around whenever you’re ready to head back.','Slow it down a little. You’re almost back.'],
    end:'That’s time. Head inside. You don’t have to fix anything yet. Just notice if your bodies feel calmer.' };
  return { k:'sit', title:'Sit still together', eyebrow:'Together · sit still', mins:F.mins.sit, opts:[3,4,5], every:30, breath:true, back:'together',
    intro:'Sit facing each other, close enough for your knees to touch. No talking about the fight for now. Just look and breathe.',
    cues:['Soft eyes. Just look at each other. No words needed.','Breathe in through your nose for four.','And out for six, slow, like fogging a window.','Drop your shoulders. Unclench your jaw.','If you laugh, that’s fine. That’s your body letting go.','Notice your partner breathing. Try to match them.','Hand on your belly. Let it rise and fall.','Keep looking. You’re on the same team.'],
    end:'That’s time. Look at each other one more second. Nice work, both of you.' };
}
screen('wind', 'Fight mode', 'Wind-down timer (sit · walk · solo)', (kind) => {
  const k = ['sit','walk','solo'].includes(kind) ? kind : 'sit';
  if (k !== 'solo' && S.flagged) return featureOff();
  if (k === 'solo' && !F.mode) fReset('solo');
  const c = windCfg(k);
  return `<div class="cool-screen fx-wind">
  <div class="backbar fx-bar"><button class="back" type="button" data-go="${c.back}" aria-label="Back">${CHEV}Back</button>${voiceBtn()}<span class="fx-vs-gap"></span></div>
  <p class="eyebrow" style="text-align:center;color:var(--mint);margin:0 0 6px">${c.eyebrow}</p>
  ${stages(false)}
  <h1 id="h" class="h2">${c.title}</h1>
  <div class="breath ${c.breath ? '' : 'still'}"><div id="fx-wbun">${bun(118, k === 'walk' ? 'happy' : 'calm', '#E85A3A')}</div></div>
  ${c.breath ? '<p class="breath-cue" id="fx-breathe" aria-hidden="true">Breathe in…</p>' : ''}
  <p class="timer tnum" id="fx-timer" role="timer" aria-label="Time left">${fmtT(c.mins * 60)}</p>
  <div class="meter" aria-hidden="true"><span id="fx-meter" style="width:0%"></span></div>
  <div class="fx-wcap"><div class="fx-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p id="fx-cue" aria-live="polite">${esc(c.intro)}</p></div>
  ${c.opts ? `<div class="seg fx-mins" id="fx-mins" role="radiogroup" aria-label="How long">${c.opts.map(m => `<label><input type="radio" name="fxmins" value="${m}" ${c.mins === m ? 'checked' : ''}>${m} min</label>`).join('')}</div>` : ''}
  <div class="btn-row" id="fx-actions"><button class="btn" type="button" data-fa="wind-start" id="fx-start">Start</button><button class="btn-ghost" type="button" data-fa="wind-skip">Demo: skip to the end</button></div>
</div>`;
}, {noTop:true, param:true, jp:'sit'});

function windMount(k) {
  if (k !== 'solo') { F.lastKind = k; if (!F.mode) F.mode = 'together'; }
  const c = windCfg(k); let total = c.mins * 60, left = total, running = false, t = 0, ci = 0, since = 0, ended = false;
  const tEl = $('#fx-timer'), meter = $('#fx-meter'), cue = $('#fx-cue'), br = $('#fx-breathe'), b = $('#fx-wbun .bun');
  const hot = [232, 90, 58], cool = [159, 216, 204];
  const paint = () => { tEl.textContent = fmtT(Math.max(0, left)); const p = 1 - left / total; meter.style.width = (p * 100) + '%'; const col = hot.map((h, i) => Math.round(h + (cool[i] - h) * Math.min(1, p * 1.5))); b?.style.setProperty('--bun-fill', `rgb(${col.join(',')})`); };
  const say = s => { cue.textContent = s; V.speak(s); };
  const actions = html => { $('#fx-actions').innerHTML = html; };
  const done = () => {
    running = false; ended = true; left = 0; paint(); say(c.end);
    if (k === 'solo') {
      const w = S.flagged ? 'A' : F.who; F.done[w] = true;
      actions(S.flagged ? `<a class="btn" href="#/home">I feel a bit calmer</a><button class="btn light" type="button" data-fa="wind-more">5 more minutes</button><a class="btn-ghost" href="#/bun" style="text-align:center">Talk to Bun privately</a>`
        : `<div class="card fx-nudge"><p class="eyebrow" style="margin:0">Bun’s nudge</p><p class="say" style="font-size:21px;margin:4px 0 0">Ready to head back to ${fName(fOther(w))}?</p></div><button class="btn" type="button" data-fa="solo-back">I’m heading back</button><button class="btn light" type="button" data-fa="wind-more">5 more minutes</button>`);
      logH('cooldown', `Wind-down: ${c.title}`, `${fRaw(w)} · ${c.mins} min`);
    } else {
      actions(`<button class="btn" type="button" data-go="rejoin">Ready to come back together?</button><button class="btn light" type="button" data-fa="wind-more">5 more minutes</button>`);
      logH('cooldown', `Wind-down together: ${c.title}`, `${Math.round(total / 60)} min`);
    }
    $('#fx-actions .btn')?.focus();
  };
  paint();
  later(() => V.speak(c.intro), 250);
  every(() => {
    t = (t + 1) % 10;
    if (br) br.textContent = t < 4 ? 'Breathe in…' : 'And out, slowly…';
    if (!running) return;
    left--; since++;
    if (since >= c.every && left > 10) { since = 0; say(c.cues[ci++ % c.cues.length]); }
    paint(); if (left <= 0) done();
  }, 1000);
  windMount.start = () => {
    if (ended) return;
    if (!running && left === total) { const m = +($('input[name=fxmins]:checked')?.value || c.mins); if (k === 'sit' || k === 'walk') F.mins[k] = m; total = left = m * 60; paint(); $('#fx-mins')?.remove(); say(c.cues[0]); ci = 1; since = 0; }
    running = !running; const s = $('#fx-start'); if (s) { s.textContent = running ? 'Pause timer' : 'Resume'; s.className = running ? 'btn light' : 'btn'; }
  };
  windMount.skip = () => { if (ended) return; $('#fx-mins')?.remove(); left = Math.min(left, 3); running = true; const s = $('#fx-start'); if (s) { s.textContent = 'Pause timer'; s.className = 'btn light'; } toast('Demo: jumped to the last 3 seconds'); };
  windMount.more = () => { ended = false; total = left = 300; running = true; since = 0; paint(); say('Okay, five more minutes. No rush.'); actions(`<button class="btn light" type="button" data-fa="wind-start" id="fx-start">Pause timer</button><button class="btn-ghost" type="button" data-fa="wind-skip">Demo: skip to the end</button>`); };
}

/* ---- end of stage 1: both say ready, then the stage 2 placeholder ---- */
screen('rejoin', 'Fight mode', 'Ready to come back together?', () => {
  if (S.flagged) return featureOff();
  const both = F.ready.A && F.ready.B;
  const card = w => `<div class="fx-ready ${F.ready[w] ? 'on' : ''}"><p class="nm">${fName(w)}</p>${F.ready[w]
    ? `<p class="ok">✓ Ready</p><button class="btn-ghost sm" type="button" data-fready="${w}">Undo</button>`
    : `<button class="btn" type="button" data-fready="${w}">I’m ready</button>${F.mode === 'solo' && !F.done[w] ? `<button class="btn-ghost sm" type="button" data-fa="solo-for" data-w="${w}">Do my 5 questions first</button>` : `<button class="btn-ghost sm" type="button" data-fa="more5" data-w="${w}">Not yet, 5 more min</button>`}`}</div>`;
  return `${fTop(`data-go="${F.mode === 'solo' ? 'solo' : 'together'}"`)}
${stages(both)}
${fBun(both ? `You’re both ready. That’s stage one done: bodies first, words second. Next comes talking it through, gently.` : `Ready to come back together? Each of you, tap only when your body feels calmer, not when you’re ready to win the point.`, both ? 'happy' : 'soft', 60)}
<h1 id="h" class="h2 fx-h">${both ? 'Stage 1 done' : 'Ready to come back together?'}</h1>
<div class="grid2">${card('A')}${card('B')}</div>
${both ? `<section class="card fx-next"><p class="eyebrow" style="margin:0">Up next · coming soon</p><h2 style="margin:4px 0 6px">Stage 2 · Talk it through</h2><p class="small" style="margin:0 0 10px">Go back to what set it off, slowly, without sliding into the old pattern.</p><button class="btn" type="button" data-go="stage2">Continue to stage 2</button><button class="btn-ghost" type="button" data-fa="fight-home" style="width:100%">We’re good for now</button></section>` : ''}`;
});
screen('stage2', 'Fight mode', 'Stage 2 · coming next (placeholder)', () => `${fTop('data-go="rejoin"')}
${stages(true)}
<div style="text-align:center">${bun(104,'think')}</div>
<p class="eyebrow" style="text-align:center">Coming next</p>
<h1 id="h" class="h2" style="text-align:center;font-size:28px">Stage 2 · Talk it through</h1>
<p class="lede" style="text-align:center;font-size:16px">The tender part: going back to what started it, now that you can hear each other. Not built yet. This is where it goes.</p>
<section class="card flat"><h3>What it will do</h3><ul class="ticks"><li>One of you names what set it off, the other says back what they heard</li><li>Bun spots the old pattern and slows it down before it winds back up</li><li>Never a verdict on who’s right</li></ul></section>
<section class="card flat fx-locked" style="margin-top:10px"><h3>${LOCK} Stage 3 · Seal it · coming next</h3><p style="margin:0">A small closing ritual (a hug, a walk, a glass of wine), plus a note of what you settled so Bun remembers next time.</p></section>
<div class="btn-row"><button class="btn" type="button" data-fa="fight-home">Back home</button><button class="btn light" type="button" data-go="repair">Meanwhile: try a soft start-up</button></div>`);

/* ---- safety inside fight mode: never spoken aloud (a partner could be listening) ---- */
screen('fsafe', 'Fight mode', 'Safety: real help (never spoken)', () => `<div class="safe">
${backbar(S.safeRet || 'fork')}
<div style="text-align:center">${bun(92,'soft','#F9D98A')}</div>
<h1 id="h" class="h2" style="font-size:27px;text-align:center">This matters more than any fight.</h1>
<p class="lede" style="text-align:center;font-size:16.5px">I’m pausing the coaching. You deserve to be safe. If you’re in danger right now, call 911. These lines are free, private, and open 24/7.</p>
${resourcesHTML()}
<p class="small" style="margin-top:12px">Phones can be monitored. <b>Quick exit</b> is top left, or press Esc twice.</p>
<div class="btn-row"><button class="btn ink" type="button" data-act="safe-back">Back to where I was</button><a class="btn-ghost" href="#/bun" style="text-align:center">Talk to Bun privately (typing only)</a></div>
<p class="small" style="margin-top:10px">Want shared features hidden on this phone? <button class="btn-ghost sm fx-help-link" type="button" data-act="flag-on">Turn on private mode</button></p></div>`, {exit:true, noTop:true});

function fightMount(route, param) {
  if (route === 'fight') later(() => V.speak(toSpeech(hubLine(false))), 200);
  if (route === 'pause') {
    later(() => V.speak(toSpeech(hubLine(true))), 120);
    // Opened cold from the widget / Siri link: browsers block speech until a tap, so offer one.
    later(() => { if (V.ok && S.voice && !V.started) { const h = $('.fx-hear'); if (h) h.hidden = false; } }, 1600);
  }
  if (route === 'together' && F.mode !== 'together') fReset('together');
  if (route === 'together') later(() => V.speak(toSpeech($('.fx-text')?.innerHTML)), 150);
  if (route === 'solo') { // Separately is silent on purpose: the other partner may be in earshot
    const w = S.flagged ? 'A' : F.who;
    if (w && F.i >= QS.length && !F.line[w] && !(F.lock[w] && !S.flagged)) fetchLine(w);
  }
  if (route === 'wind') windMount(['sit','walk','solo'].includes(param) ? param : 'sit');
  if (route === 'rejoin') later(() => V.speak(toSpeech($('.fx-text')?.innerHTML)), 150);
  if (route === 'stage2') later(() => V.speak('Stage two, talking it through, is coming next. For now, you did the hardest part: you calmed down.'), 150);
}

function fAnswer(v) {
  const w = S.flagged ? 'A' : F.who, q = QS[F.i], a = F.ans[w];
  if (q.multi) { const arr = a[q.k] || (a[q.k] = []); const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); $$(`[data-fans]`).forEach(b => b.setAttribute('aria-pressed', arr.includes(b.dataset.fans))); return; }
  a[q.k] = q.type === 'scale' ? +v : v; F.i++; render();
}
function fText() {
  const v = ($('#fq-in')?.value || '').trim(); const w = S.flagged ? 'A' : F.who;
  if (v && SAFETY_RE.test(v)) { safetyHit('solo'); return; } // the flagged answer isn't kept
  F.ans[w].what = v; F.i++; render();
}
const FA = {
  pause: () => { fReset(''); go('pause'); },
  hear: () => { V.speak(toSpeech(hubLine(true))); $('.fx-hear').hidden = true; },
  voice: () => { S.voice = !S.voice; save(); if (!S.voice) V.cancel(); $$('.fx-voice').forEach(b => b.outerHTML = voiceBtn()); toast(!V.ok ? 'This browser can’t speak, so Bun uses captions.' : S.voice ? 'Bun’s voice on. Captions stay on.' : 'Voice off. Captions only.'); },
  'solo-start': () => { fReset('solo'); go('solo'); },
  hand: el => { const w = el.dataset.w; F.who = w; F.i = F.lock[w] ? QS.length : 0; if (!F.lock[w]) F.ans[w] = {}; render(); },
  'to-hand': () => { fHandoff(); render(); },
  'solo-go': () => { const w = S.flagged ? 'A' : F.who; F.lock[w] = true; go('wind/solo'); },
  'solo-pass': () => { const w = F.who; F.lock[w] = true; F.who = null; F.i = 0; render(); toast('Answers hidden. Pass the phone.'); },
  'fq-next': () => { F.i++; render(); },
  'fq-prev': () => { const w = S.flagged ? 'A' : F.who; if (F.lock[w] && !S.flagged) { fHandoff(); render(); return; } if (F.i >= QS.length) { F.line[w] = ''; F.plan[w] = null; } F.i = Math.max(0, F.i - 1); render(); },
  mic: () => {
    const b = $('.fx-mic'), ta = $('#fq-in');
    if (b.getAttribute('aria-pressed') === 'true') { V.stopListen(); return; }
    const started = V.listen(t => { ta.value = t; }, fin => { b.setAttribute('aria-pressed', 'false'); b.querySelector('span').textContent = 'Talk'; if (fin && SAFETY_RE.test(fin)) { ta.value = ''; safetyHit('solo'); } });
    if (started) { b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'Listening… tap to stop'; } else toast('Couldn’t start the mic here. Type it instead.');
  },
  'wind-start': () => windMount.start?.(),
  'wind-skip': () => windMount.skip?.(),
  'wind-more': () => windMount.more?.(),
  'solo-back': () => { const w = F.who; F.ready[w] = true; F.done[w] = true; go('rejoin'); },
  'solo-for': () => { F.who = null; F.i = 0; go('solo'); },
  more5: () => { go('wind/' + (F.mode === 'solo' ? 'solo' : (F.lastKind || 'sit'))); later(() => windMount.more?.(), 80); },
  'wall-then': (el) => { V.cancel(); S.windWallSeen = true; S.wallFrom = 'fight'; S.wallNext = el?.dataset?.wnext || 'home'; save(); go('paywall'); },
  'fight-home': () => { V.cancel(); if (!S.paid) S.postFight = true; save(); go('home'); toast('Stage 1 logged in History.'); },
};

/* ---------------- router ---------------- */
let timers = [];
const clearTimers = () => { timers.forEach(t => { clearInterval(t); clearTimeout(t); }); timers = []; };
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
const go = r => { if (location.hash === '#/' + r) render(); else location.hash = '/' + r; };

const TABS = () => S.flagged
  ? [['home','Home','M4 11l8-7 8 7v9h-5v-6H9v6H4z'],['safe','Support','M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11z'],['bun','Bun','M4 16c0-6 4-10 8-10s8 4 8 10c0 2-3 3-8 3s-8-1-8-3z'],['history','History','M12 7v5l3 2M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4']]
  : [['home','Home','M4 11l8-7 8 7v9h-5v-6H9v6H4z'],['ourmap','Map','M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z'],['checkin/1','Check-in','M5 5h14v15H5zM8 3v4M16 3v4M5 10h14'],['bun','Bun','M4 16c0-6 4-10 8-10s8 4 8 10c0 2-3 3-8 3s-8-1-8-3z'],['history','History','M12 7v5l3 2M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4']];

const startRoute = () => (S.onb.done || S.onb.skipped || S.consent || S.history.length) ? 'fork' : 'splash';
function render() {
  clearTimers(); closeSheet(true); V.cancel();
  const [name, param] = (location.hash.replace(/^#\/?/, '') || startRoute()).split('/');
  const route = R[name] ? name : startRoute();
  // Paywall only in front of clearly paid features, never inside fight mode.
  const PAID = { checkin:'Weekly check-ins', pattern:'Monthly pattern cards' };
  if (PAID[route] && !S.paid && !S.flagged) { S.wallFrom = 'feature'; S.wallFeat = PAID[route]; S.wallNext = name + (param ? '/' + param : ''); save(); history.replaceState(null, '', '#/paywall'); return render(); }
  const m = META[route];
  if (CUR && CUR !== route && Date.now() - toastAt > 400) { clearTimeout(toastT); $('#toast')?.classList.remove('on'); }
  if (route === 'fsafe' && CUR !== 'fsafe' && !safeSet) S.safeRet = (CUR === 'wind' ? 'fork' : CUR) || 'fork';
  if (route === 'fsafe') safeSet = false;
  CUR = route;
  if (ONB.includes(route) && !S.onb.done && S.onb.at !== route) { S.onb.at = route; save(); }
  const scr = $('#screen');
  scr.innerHTML = `<div class="enter${m.noTop ? ' full' : ''}">${R[route](param)}</div>`;
  scr.scrollTop = 0;
  scr.classList.toggle('has-tabs', !!m.tabs);
  const tb = $('#tabbar');
  tb.hidden = !m.tabs;
  if (m.tabs) tb.innerHTML = TABS().map(([r, l, d]) => `<a href="#/${r}" ${r.split('/')[0] === route ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>${l}</a>`).join('');
  const showExit = m.exit || S.flagged;
  $('#quick-exit').hidden = !showExit;
  scr.classList.toggle('has-exit', showExit);
  $('#offline-bar').hidden = !S.offline;
  document.title = `${m.label} · Simmer prototype`;
  renderJump(route);
  const h = $('#h', scr); if (h) { h.setAttribute('tabindex', '-1'); if (navigated) h.focus({preventScroll:true}); }
  navigated = true;
  mount(route, param);
}
let navigated = false;

function renderJump(route) {
  const groups = {};
  Object.entries(META).forEach(([k, v]) => (groups[v.group] ||= []).push([k, v.label]));
  const html = Object.entries(groups).map(([g, items]) => `<h3>${g}</h3><ul>${items.map(([k, l]) => `<li><a href="#/${k}${k === 'checkin' ? '/1' : k === 'wind' ? '/sit' : ''}" ${k === route ? 'aria-current="page"' : ''}>${esc(l)}</a></li>`).join('')}</ul>`).join('');
  $('#jump-desktop').innerHTML = html; $('#jump-mobile').innerHTML = html;
  const tg = `<legend>Demo states</legend>
    <label><input type="checkbox" data-tog="partnerJoined" ${S.partnerJoined ? 'checked' : ''}> Partner has joined</label>
    <label><input type="checkbox" data-tog="flagged" ${S.flagged ? 'checked' : ''}> Safety flag on (private mode)</label>
    <label><input type="checkbox" data-tog="offline" ${S.offline ? 'checked' : ''}> Offline</label>
    <label><input type="checkbox" data-tog="memOn" ${S.memOn ? 'checked' : ''}> Bun memory on</label>
    <button type="button" class="btn-ghost sm" data-act="demo-on">Load demo data (Sam &amp; Alex)</button>
    <button type="button" class="btn-ghost sm" data-act="reset">Reset to a new user</button>`;
  $('#toggles-desktop').innerHTML = tg; $('#toggles-mobile').innerHTML = tg;
}

/* ---------------- per-screen behavior ---------------- */
function mount(route, param) {
  if (route === 'thinking') {
    const lis = $$('#cl li'); const btn = $('#think-go');
    const step = i => { lis.forEach((li, j) => li.dataset.s = j < i ? 'done' : j === i ? 'doing' : 'todo'); if (i >= lis.length) { btn.hidden = false; } };
    step(0); runAha(step);
  }
  if (route === 'cooldown') cooldown();
  fightMount(route, param);
  if (route === 'checkin' && +param === 3) turns();
}

async function runAha(step) {
  const t = topic();
  const intake = `Fight topic(s): ${S.topics.map(k => TOPICS[k].label).join(', ') || 'Chores'}. Last happened: ${S.when}. What I really wanted: ${S.wants.join(', ')}${S.wantText ? `; in my words: ${S.wantText}` : ''}. How I usually start it: ${S.opener ?? t.opener}`;
  const started = Date.now(); let n = 0;
  const r = await coach({ mode:'app', task:'aha', names:{ A:S.name, B:S.partner }, me:'A', profile:profile(), messages:[{ from:'A', text:intake }] }, txt => { n = txt.length; if (n > 40) step(1); if (n > 140) step(2); });
  if (location.hash !== '#/thinking') return;
  let j = null; try { j = JSON.parse((r.text || '').replace(/^```(json)?|```$/g, '').trim().match(/\{[\s\S]*\}/)?.[0] || 'null'); } catch {}
  if (j?.safety || r.safety) { S.aha = null; save(); safetyHit('aha'); return; }
  if (j && j.thing) { S.aha = j; S.ahaErr = null; S.ssEdit = null; logH('aha', `Your fight in one line: ${j.thing} → ${j.feel}`, j.soft); }
  else { S.aha = null; S.ahaErr = r.error ? errorLine(r) : 'Bun’s read didn’t parse.'; toast(S.ahaErr + ' Showing a starter guess.'); }
  save(); step(3);
  later(() => go('aha'), Math.max(300, 1200 - (Date.now() - started)));
}

async function softenNow() {
  const rough = $('#rough').value.trim(); const st = $('#soft-status'), out = $('#ss-live'), btn = $('#soften-btn');
  if (!rough) { st.textContent = 'Write what you want to say first, even if it’s messy.'; $('#rough').focus(); return; }
  btn.disabled = true; st.innerHTML = '<span class="status-line" style="margin:0"><span class="pulse"></span>Bun is finding the feeling under it…</span>';
  out.innerHTML = '<span class="skel" style="display:grid"><i></i><i></i><i></i></span>';
  const r = await coach({ mode:'app', task:'soften', names:{ A:S.name, B:S.partner }, me:'A', profile:profile(), messages:[{ from:'A', text:rough }] }, t => { out.textContent = t.split(/\n+Why:/i)[0]; });
  btn.disabled = false;
  if (r.safety) { out.innerHTML = ssText(); safetyHit('repair'); return; }
  if (r.error) { st.textContent = errorLine(r); out.innerHTML = ssText(); return; }
  const [line, ...why] = r.text.split(/\n+Why:\s*/i);
  S.ssEdit = line.replace(/^["“]|["”]$/g, '').trim(); S.soft = { rough, why:why.join(' ').trim() }; save();
  logH('repair', 'Softer start-up', S.ssEdit); render();
  toast('Bun rewrote it. Edit freely, it’s your words.');
}

async function chatSend(text) {
  text = text.trim(); if (!text || CH.streaming) return;
  S.chat.push({ from:'me', text }); save();
  CH.streaming = true; CH.text = ''; paintChat();
  const hist = S.chat.filter(m => m.from !== 'sys').slice(-24).map(m => ({ from:m.from === 'me' ? 'A' : 'bun', text:m.text }));
  const ctx = S.aha ? `(context from onboarding: fight looks like ${S.aha.thing}, underneath ${S.aha.feel}. Memory: ${S.memOn ? S.memory.map(m => m.t).join('; ') : 'off'})` : `(memory: ${S.memOn ? S.memory.map(m => m.t).join('; ') : 'off'})`;
  const r = await coach({ mode:'app', names:{ A:S.name, B:S.partner }, me:'A', profile:profile(), messages:[{ from:'sys', text:ctx }, ...hist] }, t => { CH.text = t; paintChat(true); });
  CH.streaming = false;
  if (r.error) S.chat.push({ from:'sys', text:errorLine(r) });
  else if (r.safety) S.chat.push({ from:'bun', text:r.text, kind:'safety' }); // help card for this message only; the next message is coached normally
  else S.chat.push({ from:'bun', text:r.text });
  if (S.chat.filter(m => m.from === 'me').length === 1) logH('chat', 'Talked with Bun', text.slice(0, 90));
  save();
  if (location.hash.startsWith('#/bun')) render(); 
}
function paintChat(streamOnly) {
  const c = $('#chat'); if (!c) return;
  if (streamOnly && $('#ch-stream')) $('#ch-stream').innerHTML = md(CH.text); else c.innerHTML = chatHTML();
  const scr = $('#screen'); scr.scrollTop = scr.scrollHeight;
}

function cooldown() {
  const TOTAL = 20 * 60; let left = TOTAL, paused = false;
  const tEl = $('#timer'), meter = $('#meter'), cue = $('#cue'), b = $('#cool-bun .bun');
  const hot = [232, 90, 58], cool = [159, 216, 204];
  const paint = () => {
    const mm = Math.floor(left / 60), ss = left % 60; tEl.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    const p = 1 - left / TOTAL; meter.style.width = (p * 100) + '%';
    const c = hot.map((h, i) => Math.round(h + (cool[i] - h) * Math.min(1, p * 1.4)));
    b.style.setProperty('--bun-fill', `rgb(${c.join(',')})`);
  };
  const done = () => {
    left = 0; paint();
    $('#cool-status').textContent = 'You made it through. Your body has had time to settle.';
    logH('cooldown', 'Finished a 20-minute cool-down', `Topic: ${S.aha?.thing || topic().label}`);
    $('#cool-actions').innerHTML = '<button class="btn" data-go="repair">I’m ready to reconnect</button><button class="btn-ghost" data-act="cool-more">I need 10 more minutes</button>';
    cue.textContent = 'Nice and slow.';
    $('#cool-actions .btn').focus();
  };
  paint();
  let t = 0;
  every(() => {
    t = (t + 1) % 10; cue.textContent = t < 4 ? 'Breathe in…' : t < 5 ? 'Hold…' : 'And out, slowly…';
    if (paused || left <= 0) return; left--; paint(); if (left <= 0) done();
  }, 1000);
  cooldown.toggle = () => { paused = !paused; $('#cool-pause').textContent = paused ? 'Resume timer' : 'Pause timer'; $('#cool-status').textContent = paused ? 'Paused. Take your time.' : 'Your body needs about 20 minutes to settle. Try not to replay the argument.'; };
  cooldown.skip = () => { left = 3; paint(); toast('Demo: jumped to the last 3 seconds'); };
  cooldown.more = () => { left = 600; paint(); $('#cool-actions').innerHTML = '<button class="btn light" data-act="cool-pause" id="cool-pause">Pause timer</button><button class="btn-ghost" data-act="cool-skip">Demo: skip to the end</button>'; paused = false; };
}

function turns() {
  let left = 180, running = false, who = 0; const t = $('#turn-t');
  const paint = () => t.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  every(() => { if (!running) return; left = Math.max(0, left - 1); paint(); if (!left) { running = false; $('#turn-start').textContent = 'Time’s up'; toast('Listener: “What I heard is… Did I get it?”'); } }, 1000);
  turns.start = () => { running = !running; $('#turn-start').textContent = running ? 'Pause' : 'Resume'; };
  turns.switch = () => {
    who = 1 - who; left = 180; running = false; paint(); $('#turn-start').textContent = 'Start turn';
    $('#sp-n').textContent = who ? S.partner : S.name; $('#li-n').textContent = who ? S.name : S.partner;
    toast(`Switched. ${who ? S.partner : S.name} speaks now.`);
  };
}

/* ---------------- toast / sheet ---------------- */
let toastT, toastAt = 0;
function toast(msg, undo) {
  toastAt = Date.now();
  const el = $('#toast'); clearTimeout(toastT);
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" id="undo">Undo</button>' : ''}`;
  el.classList.add('on');
  if (undo) $('#undo').onclick = () => { undo(); el.classList.remove('on'); };
  toastT = setTimeout(() => el.classList.remove('on'), undo ? 6000 : 3200);
}
let lastFocus;
function openSheet(html) {
  lastFocus = document.activeElement;
  const sh = $('#sheet'); sh.innerHTML = html; sh.hidden = false; $('#scrim').hidden = false;
  (sh.querySelector('button,a,input') || sh).focus();
}
function closeSheet(silent) {
  const sh = $('#sheet'); if (sh.hidden) return;
  sh.hidden = true; $('#scrim').hidden = true; sh.innerHTML = '';
  if (!silent && lastFocus) lastFocus.focus();
}
function copy(text, msg) { (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => toast(msg), () => toast(msg)); }

/* ---------------- events ---------------- */
document.addEventListener('click', e => {
  const q = e.target.closest('[data-quick]'); if (q) { chatSend(q.dataset.quick); return; }
  const hd = e.target.closest('[data-hdel]'); if (hd) { const i = S.history.findIndex(h => h.id === hd.dataset.hdel); const it = S.history.splice(i, 1)[0]; save(); render(); toast('Deleted', () => { S.history.splice(i, 0, it); save(); render(); }); return; }
  const ad = e.target.closest('[data-agr-del]'); if (ad) { swipeAct('agr', ad.dataset.agrDel); return; }
  const pr = e.target.closest('[data-pron]'); if (pr) { const k = pr.dataset.pron, v = pr.dataset.v; if (k === 'me') S.pronouns = v; else if (k === 'them') S.partnerPronouns = v; else S.pB.pronouns = v; keepForm(); save(); render(); $(`[data-pron="${k}"][data-v="${v}"]`)?.focus(); return; }
  const br = e.target.closest('[data-brake],[data-accel]'); if (br) {
    const list = br.dataset.brake ? S.closer.brakes : S.closer.accels, v = br.dataset.brake || br.dataset.accel, i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1); else list.push(v);
    if (v === 'Feeling pressured' && i < 0) { S.closer.paused = true; S.closer.pausedWhy = 'pressure'; save(); render(); return; }
    save(); br.setAttribute('aria-pressed', i < 0); return;
  }
  const t = e.target.closest('[data-go],[data-act],[data-topic],[data-want],[data-toggle],[data-follow],[data-forget]');
  if (!t) return;
  if (t.dataset.go) { e.preventDefault(); go(t.dataset.go); return; }
  if (t.dataset.topic) {
    const k = t.dataset.topic; S.topics = S.topics.includes(k) ? S.topics.filter(x => x !== k) : [...S.topics, k];
    S.opener = null; S.ssEdit = null; save(); render(); $(`[data-topic="${k}"]`)?.focus(); return;
  }
  if (t.dataset.want) { const k = t.dataset.want; S.wants = S.wants.includes(k) ? S.wants.filter(x => x !== k) : [...S.wants, k]; save(); t.setAttribute('aria-pressed', S.wants.includes(k)); return; }
  if (t.hasAttribute('data-toggle')) { t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') !== 'true'); return; }
  if (t.dataset.follow) {
    const ag = S.agreements.find(x => x.id === t.dataset.aid) || S.agreements[0]; if (!ag) return;
    ag.checks.unshift({ r:t.dataset.follow, at:Date.now() }); logH('agreement', `Follow-up: ${ag.text}`, FOLLOW_L[t.dataset.follow]);
    save(); render(); toast('Logged. Bun will bring it to Sunday’s check-in.', () => { ag.checks.shift(); S.history.shift(); save(); render(); }); return;
  }
  if (t.dataset.forget) {
    const id = +t.dataset.forget, idx = S.memory.findIndex(m => m.id === id), item = S.memory[idx];
    S.memory.splice(idx, 1); save(); render();
    toast('Bun forgot that.', () => { S.memory.splice(idx, 0, item); save(); render(); }); return;
  }
  const a = t.dataset.act;
  const A = {
    'safety-next': () => {
      const ans = Object.values(S.safety);
      if (ans.includes('Yes')) { S.flagged = true; S.invited = false; S.onb.ret = null; save(); go('safe'); return; }
      if (S.onb.ret) { const r = S.onb.ret; S.onb.ret = null; save(); go(r); toast(`Thanks. Nothing about this is shared with ${S.partner}.`); return; }
      go(S.consent ? 'thinking' : 'consent');
    },
    'safety-skip': () => { S.safety = {afraid:null, control:null, threats:null}; save(); go(S.consent ? 'thinking' : 'consent'); },
    'flag-on': () => { S.flagged = true; save(); go(S.consent ? 'home' : 'consent'); },
    'safety-change': () => { S.flagged = false; S.safety = {afraid:null, control:null, threats:null}; save(); go('safety'); },
    'ss-edit': () => { $('#ss-edit').hidden = false; $('#ss-ta').focus(); },
    'ss-save': () => { const v = $('#ss-ta').value.trim(); S.ssEdit = v || null; save(); render(); toast('Saved your version. I’ll remember it.'); },
    'copy-ss': () => copy(ssPlain(), 'Copied your soft start-up'),
    'share': () => openSheet(`
      <h2 id="sheet-title">Your share card</h2>
      <div class="sharecard" role="img" aria-label="Share card: Our greatest hit: ${esc(S.aha?.thing || topic().thing)}. Underneath: ${esc(S.aha?.feel || topic().feel)}.">
        <div class="dots" aria-hidden="true"></div>
        <p class="eyebrow" style="color:#FFE2D8;position:relative">Our greatest hit</p>
        <p class="big" style="position:relative">${esc((S.aha?.thing || topic().thing).replace(/^the /, 'The '))}</p>
        <p class="under">Underneath: ${esc(S.aha?.feel || topic().feel)}.</p>
        <div class="foot"><span>Simmer</span><span style="width:46px">${bun(46,'happy')}</span></div>
      </div>
      <p class="small" style="margin-top:12px">No names or private answers are on this card. Sharing is always your call.</p>
      <div class="btn-row"><button class="btn" data-act="share-save">Save image</button><button class="btn-ghost" data-act="close-sheet">Not now</button></div>`),
    'share-save': () => { closeSheet(); toast('Demo: image saved (nothing was uploaded)'); },
    'close-sheet': () => closeSheet(),
    'invite': () => { copy('simmer.app/join/7KQ2-DEMO', 'Copied. Demo link, it doesn’t go anywhere.'); S.invited = true; save(); render(); },
    'partner-done': () => { S.partnerJoined = true; S.invited = true; save(); go('map'); toast(`${S.partner} finished. Our map is ready.`); },
    'trial': () => { S.paid = true; S.postFight = false; const n = S.wallNext || 'home'; S.wallFrom = null; S.wallNext = null; save(); go(n); toast('Demo: trial started. No payment taken.'); },
    'decline': () => { const feat = S.wallFrom === 'feature' ? S.wallFeat : null; S.paid = false; S.postFight = false; const n = feat ? 'home' : (S.wallNext || 'home'); S.wallFrom = null; S.wallNext = null; save(); go(n); toast(feat ? `${feat} are part of Simmer Together. Fight mode stays free.` : 'You’re on the free version. Fight mode stays free.'); },
    'pf-see': () => { S.postFight = false; S.wallFrom = 'afterfight'; S.wallNext = 'home'; save(); go('paywall'); },
    'pf-dismiss': () => { S.postFight = false; save(); render(); },
    'safe-back': () => { const r = S.safeRet || 'fork'; S.safeRet = null; save(); go(r); },
    'demo-on': () => { S = Object.assign(fresh(), demoSeed()); save(); closeJump(); go('home'); toast('Demo data loaded (Sam & Alex)'); },
    'nudge': () => { S.nudgeDone = true; save(); render(); toast('Lovely. That’s the kind of thing that adds up.', () => { S.nudgeDone = false; save(); render(); }); },
    'nudge-swap': () => { const pn = S.partner || 'your partner'; const n = [`Send ${pn} a 6-second hug, no reason.`, `Ask ${pn}: “What was the best part of your day?”`, `Thank ${pn} for one boring thing they do.`]; $('#nudge-t').textContent = n[Math.floor(Math.random() * n.length)]; },
    'copy-pause': () => copy($('#pause-line').textContent.replace(/[“”]/g, ''), 'Copied. Send it in your own way.'),
    'cool-pause': () => cooldown.toggle?.(),
    'cool-skip': () => cooldown.skip?.(),
    'cool-more': () => cooldown.more?.(),
    'copy-repair': () => copy(`${ssPlain()} ${$('input[name=repair]:checked')?.value || S.repair}`, 'Copied. Nothing was sent.'),
    'debrief-save': () => {
      const land = $('input[name=land]:checked')?.value;
      if (!land) { $('#land-note').textContent = 'Pick how it landed first, even “about the same” helps.'; $('#land input').focus(); return; }
      const helped = $$('[data-toggle][aria-pressed="true"]').map(b => b.textContent.trim());
      logH('debrief', `Debrief: ${land}`, helped.length ? `What helped: ${helped.join(', ')}` : '');
      go('home'); toast(`Logged to History · ${land.toLowerCase()}`, () => { S.history.shift(); save(); toast('Removed'); });
    },
    'ci-fill': () => {
      S.ci.a = ['Thanks for walking the dog in the rain', 'I loved the playlist in the car', 'I noticed you called my mom back'];
      S.ci.b = ['Thanks for booking the dentist', 'I loved Friday’s tacos', 'I noticed you let me sleep in']; save(); render();
    },
    'turn-start': () => turns.start?.(),
    'turn-switch': () => turns.switch?.(),
    'cal-plan': () => {
      const c = S.ci;
      openSheet(`<h2 id="sheet-title">Here’s what I’ll do</h2>
        <div class="card flat cal"><div class="d"><span>${esc(c.day.toUpperCase())}</span><b class="tnum">${dayNum(c.day)}</b></div><div><b>${esc(demoNames(c.action) || 'Your one small action')}</b><p class="small" style="margin:0">${esc(fmtDay(nextWeekday(c.day)))} · ${fmtTime(c.time)} · owner: ${esc(c.owner)}</p></div></div>
        <ul class="small" style="padding-left:18px;margin:12px 0"><li>Add this event to both of your calendars</li><li>Remind you both 1 hour before</li><li>Ask how it went the next morning</li></ul>
        <p class="small"><b>Demo:</b> no real calendar is touched.</p>
        <div class="btn-row"><button class="btn" data-act="cal-go">Add it</button><button class="btn light" data-act="close-sheet">Edit plan</button><button class="btn-ghost" data-act="cal-self">I’ll add it myself</button></div>`);
    },
    'cal-go': () => { S.ci.added = true; save(); closeSheet(); render(); toast('Added to both calendars (demo)', () => { S.ci.added = false; save(); render(); }); },
    'cal-self': () => { closeSheet(); go('checkin/5'); toast('Got it. I’ll still remember the plan.'); },
    'cal-undo': () => { S.ci.added = false; save(); render(); toast('Removed from both calendars'); },
    'ci-finish': () => {
      const c = S.ci; const area = ciAreas().find(m => m.key === c.area)?.label || TOPICS[c.area]?.label || c.area;
      const notes = `Appreciations from ${S.name}: ${c.a.filter(Boolean).join('; ') || '(none)'}. From ${S.partner}: ${c.b.filter(Boolean).join('; ') || '(none)'}. Area: ${area}. Action: ${c.action} (owner ${c.owner}, ${c.day} ${c.time}). What would make ${S.name} feel loved: ${c.love || '(skipped)'}.`;
      const entry = { id:uid(), type:'checkin', title:`Weekly check-in · ${area}`, detail:`Action: ${c.action}`, at:Date.now() };
      S.history.unshift(entry); S.streak += 1; S.ci.added = false;
      S.agreements.unshift({ id:uid(), text:demoNames(c.action), owner:c.owner, day:({Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'})[c.day] || c.day, made:`Check-in, ${new Date().toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'})}`, checks:[] });
      save(); go('streak');
      coach({ mode:'app', task:'recap', names:{ A:S.name, B:S.partner }, me:'A', messages:[{ from:'A', text:notes }] }).then(r => { if (r.text && !r.error) { entry.detail = r.text; save(); const el = $('#recap'); if (el) { el.textContent = r.text; el.classList.add('grow'); } } });
    },
    'soften': () => softenNow(),
    'chat-soften': () => chatSoften(),
    'chat-clear': () => { S.chat = []; save(); render(); },
    'hist-clear': () => { const old = S.history; S.history = []; save(); render(); toast('History cleared', () => { S.history = old; save(); render(); }); },
    'reset': () => { S = fresh(); save(); try { localStorage.removeItem('simmer-profile'); } catch {} closeJump(); go('splash'); toast('Demo reset'); },
    'onb-skip': () => openSheet(`<h2 id="sheet-title">Skip setup for now?</h2><p>Everything you’ve answered is saved on this device. Finish anytime from Home, right where you left off.</p>${S.safety.afraid === null && !S.flagged ? '<p class="small"><b>One ask:</b> the private safety check takes 20 seconds and keeps coaching safe.</p>' : ''}<div class="btn-row"><button class="btn" data-act="close-sheet">Keep going</button><button class="btn light" data-act="onb-skip-yes">Skip to Home</button></div>`),
    'onb-skip-yes': () => { keepForm(); S.onb.skipped = true; save(); closeSheet(true); go('home'); toast('Setup saved. Resume it from Home.'); },
    'onb-restart': () => { S.onb.at = null; save(); go('about'); },
    'about-next': () => { if (!$('#ack-therapy').checked) { $('#ack-err').textContent = 'Please tick the box so we’re on the same page.'; $('#ack-therapy').focus(); return; } S.onb.ackTherapy = true; save(); go('meet'); },
    'consent-go': () => {
      const d = S.consentDraft; const miss = ['adult','ai','store'].filter(k => !d[k]);
      if (miss.length) { $('#consent-err').textContent = miss.includes('adult') ? 'Simmer is for adults 18 and over.' : 'All three are needed to continue. You can delete everything later.'; $(`[data-consent="${miss[0]}"]`).focus(); return; }
      S.consent = { at:Date.now(), v:1 }; save();
      if (S.onb.ret) { const r = S.onb.ret; S.onb.ret = null; save(); go(r); return; }
      if (S.flagged) { S.onb.done = true; save(); go('home'); return; }
      go(S.onb.done ? 'home' : 'thinking');
    },
    'consent-from-bun': () => { S.onb.ret = 'bun'; save(); go('consent'); },
    'onb-finish': () => { S.onb.done = true; save(); const st = t.dataset.start; if (!st) { go('home'); return; } location.href = `/chat/?start=${st}`; },
    'pjoin-go': () => { const v = ($('#jcode').value || '').trim().toUpperCase(); if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(v)) { $('#jcode-err').textContent = 'That code doesn’t look right. It’s 8 letters or numbers, like 7KQ2-DEMO.'; return; } S.pB.code = v; save(); go('pconsent'); },
    'pconsent-go': () => { const d = S.pB.draft; const miss = ['adult','ai','store'].filter(k => !d[k]); if (miss.length) { $('#pconsent-err').textContent = miss.includes('adult') ? 'Simmer is for adults 18 and over.' : 'All three are needed to continue.'; return; } S.pB.consent = { at:Date.now() }; save(); go('pyou'); },
    'pyou-go': () => { const v = $('#pbn').value.trim(); if (v) S.partner = v; const pt = $('[data-pron-text="pb"]'); if (pt) S.pB.pronouns = pt.value.trim() || 'other'; save(); go('partner'); },
    'psafety-go': () => { if (Object.values(S.pB.safety).includes('Yes')) { S.pB.flagged = true; S.partnerJoined = false; save(); go('psafe'); } else { S.pB.flagged = false; S.partnerJoined = true; S.invited = true; save(); go('pdone'); } },
    'pb-back': () => { go(!S.consent ? 'splash' : S.onb.done ? 'map' : 'mode'); if (S.partnerJoined) toast(`${S.partner} finished. Our map has both sides.`); },
    'retake-safety': () => { S.safety = {afraid:null, control:null, threats:null}; S.onb.ret = 'settings'; save(); go('safety'); },
    'delete-all': () => {
      const snap = {}; for (const k of ['simmer-live-app','simmer-live-chat','simmer-profile']) snap[k] = localStorage.getItem(k);
      let room = null; try { room = JSON.parse(snap['simmer-live-chat'] || '{}').room || null; } catch {}
      for (const k in snap) localStorage.removeItem(k);
      S = fresh(); let undone = false;
      const kill = setTimeout(() => { if (!undone && room) fetch('/api/room', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ op:'delete', id:room }) }).catch(() => {}); }, 6500);
      go('splash');
      toast('Deleted everything on this device', () => { undone = true; clearTimeout(kill); for (const k in snap) if (snap[k] != null) localStorage.setItem(k, snap[k]); try { S = Object.assign(fresh(), JSON.parse(snap['simmer-live-app'] || '{}')); } catch {} go('settings'); toast('Restored'); });
    },
    'closer-start': () => { if (!$('#closer-18').checked) { $('#closer-err').textContent = 'Closer is for adults 18+, and both of you opt in.'; return; } S.closer.adult = true; save(); go('closer-intake'); },
    'closer-intake-go': () => { const note = $('#closer-note').value; S.closer.note = note; if (PRESSURE_RE.test(note) || SAFETY_RE.test(note)) { S.closer.paused = true; S.closer.pausedWhy = 'pressure'; save(); render(); return; } save(); go('closer-card'); },
    'closer-fill': () => { CLOSE_ITEMS.forEach((_, i) => { S.closer.mine[i] = String([2,1,2,0,2,1,2,2,1,2,2,0][i]); }); save(); render(); },
    'closer-list-go': () => go('closer-match'),
    'closer-open': () => { S.closer.open = !S.closer.open; if (!S.closer.open) S.closer.pOpen = false; save(); render(); },
    'closer-popen': () => { S.closer.pOpen = true; save(); render(); },
    'copy-nt': () => copy($('#nt-line').textContent.replace(/[“”]/g, ''), 'Copied'),
    'closer-cc-go': () => {
      const r = $('input[name=cconn]:checked')?.value, h = $('#c-helped').value;
      if (!r) { $('#cc-err').textContent = 'Pick a number first, any number is fine.'; return; }
      if (PRESSURE_RE.test(h) || SAFETY_RE.test(h)) { S.closer.paused = true; S.closer.pausedWhy = 'pressure'; save(); render(); return; }
      S.closer.checks.unshift({ at:Date.now(), r:+r, next:$('input[name=cnext]:checked')?.value || 'Same plan' }); logH('closer', 'Closer check-in', `Connection ${r}/5`); save(); go('home'); toast('Saved. Streak counts check-ins only.');
    },
    'closer-pause': () => { S.closer.paused = true; S.closer.pausedWhy = 'manual'; save(); render(); toast('Closer paused. Nothing was shared.'); },
    'closer-resume': () => { S.closer.paused = false; S.closer.pausedWhy = ''; save(); go('closer'); },
  };
  if (A[a]) { e.preventDefault(); A[a](); }
});

document.addEventListener('click', e => {
  const t = e.target.closest('[data-fa],[data-fans],[data-fplan],[data-fready]'); if (!t) return;
  e.preventDefault();
  if (t.dataset.fa) { FA[t.dataset.fa]?.(t); return; }
  if (t.dataset.fans) { fAnswer(t.dataset.fans); return; }
  if (t.dataset.fplan) { const w = S.flagged ? 'A' : F.who; F.plan[w] = t.dataset.fplan; F.line[w] = scriptedLine(w); render(); return; }
  if (t.dataset.fready) { const w = t.dataset.fready; F.ready[w] = !F.ready[w];
    if (F.ready.A && F.ready.B && !F.logged) { F.logged = true; logH('cooldown', 'Fight mode · stage 1 done', `Both ready to come back together (${F.mode === 'solo' ? 'separately' : 'together'})`); }
    render(); return; }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'f-fq') { e.preventDefault(); fText(); return; }
  if (e.target.id === 'f-chat') { e.preventDefault(); const v = $('#chat-in').value; $('#chat-in').value = ''; chatSend(v); return; }
  if (e.target.id === 'f-meet') { e.preventDefault(); keepForm(); save(); go('rel'); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'when') { S.when = t.value; save(); }
  if (t.name === 'fwho') { F.who = t.value; F.i = F.ans[F.who].mins ? QS.length : 0; render(); return; }
  if (['afraid','control','threats'].includes(t.name)) { S.safety[t.name] = t.value; save(); }
  if (t.name === 'plan') { S.plan = t.value; save(); const y = S.plan === 'yearly'; const el = $('.timeline li:last-child .tnum'); if (el) el.textContent = chargeLine(); }
  if (t.name === 'repair') { S.repair = t.value; save(); }
  if (t.name === 'area') { S.ci.area = t.value; save(); }
  if (t.name === 'owner') { S.ci.owner = t.value; save(); }
  if (t.name === 'land') { $('#land-note').textContent = t.value === 'Worse' ? 'That’s okay. Some fights need two tries. I’ll suggest it for Sunday’s check-in.' : t.value === 'Better' ? 'That’s a real repair. Nice work, both of you.' : 'Steady is fine. You paused instead of piling on.'; }
  if (t.dataset.tog) { S[t.dataset.tog] = t.checked; save(); render(); }
  if (t.name === 'together') { S.rel.together = t.value; save(); }
  if (t.name === 'living') { S.rel.living = t.value; save(); }
  if (t.name === 'style') { S.style = t.value; save(); const p = $('#style-prev'); if (p) p.innerHTML = stylePreview(); else toast(`Bun will be ${t.value} from now on`); }
  if (t.name === 'mode') { S.mode = t.value; save(); }
  if (t.dataset.consent) { S.consentDraft[t.dataset.consent] = t.checked; save(); }
  if (t.dataset.pconsent) { S.pB.draft[t.dataset.pconsent] = t.checked; save(); }
  if (/^pb-/.test(t.name)) { S.pB.safety[t.name.slice(3)] = t.value; save(); }
  if (t.name === 'conn') { S.closer.conn = +t.value; save(); }
  if (t.name === 'init') { S.closer.init = t.value; save(); }
  if (t.name === 'desire') { S.closer.desire = t.value; save(); }
  if (/^yn\d+$/.test(t.name)) { S.closer.mine[t.name.slice(2)] = t.value; save(); }
  if (t.id === 'n-on') { S.notif.on = t.checked; if (!t.checked) S.notif.previews = false; save(); render(); toast(t.checked ? 'Notifications on (prototype: none are sent). Previews stay hidden.' : 'Notifications off'); }
  if (t.id === 'n-prev') { S.notif.previews = t.checked; save(); toast(t.checked ? 'Previews will show on your lock screen' : 'Previews hidden'); }
  if (t.id === 'mem-on2') { S.memOn = t.checked; save(); toast(t.checked ? 'Memory on' : 'Memory off'); }
  if (t.id === 'mem-on') { S.memOn = t.checked; save(); toast(t.checked ? 'Memory on' : 'Memory off. I won’t bring up past chats.'); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'wt') { S.wantText = t.value; save(); }
  if (t.id === 'op') { S.opener = t.value; save(); }
  if (t.dataset.ci) { S.ci[t.dataset.ci][+t.dataset.i] = t.value; save(); }
  if (t.dataset.cif) { S.ci[t.dataset.cif] = t.value; save(); }
  if (t.dataset.pronText) { const v = t.value.trim() || 'other'; if (t.dataset.pronText === 'me') S.pronouns = v; else if (t.dataset.pronText === 'them') S.partnerPronouns = v; else S.pB.pronouns = v; save(); }
  if (t.id === 'chat-in' || t.id === 'rough') inlineFlag(t);
});

/* inline "you always / you never" flag */
function inlineFlag(t) {
  const box = $('#' + t.id + '-flag'); if (!box) return;
  const m = t.value.match(HARSH_RE);
  if (!m) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `<span><b>“${esc(m[0])}”</b> can land like a verdict, and the other person defends instead of hearing you. Try one specific time and how it felt.</span><button type="button" class="btn-ghost sm" data-act="${t.id === 'rough' ? 'soften' : 'chat-soften'}">Soften it</button>`;
}
async function chatSoften() {
  const ta = $('#chat-in'); const rough = ta.value.trim(); if (!rough) return;
  const box = $('#chat-in-flag'); box.innerHTML = '<span class="status-line" style="margin:0"><span class="pulse"></span>Bun is softening it…</span>';
  const r = await coach({ mode:'app', task:'soften', names:{ A:S.name, B:S.partner }, me:'A', profile:profile(), messages:[{ from:'A', text:rough }] });
  if (r.safety) { box.hidden = true; safetyHit('bun'); return; }
  if (r.error) { box.textContent = errorLine(r); return; }
  ta.value = r.text.split(/\n+Why:/i)[0].replace(/^["“]|["”]$/g, '').trim(); inlineFlag(ta); toast('Softer version in the box. Edit it, then send.');
}

/* keep the names form when re-rendering for pronoun chips */
function keepForm() {
  const nm = $('#nm'), pn = $('#pn'), pt = $('[data-pron-text="me"]'), pt2 = $('[data-pron-text="them"]');
  const pbn = $('#pbn'); if (pbn && pbn.value.trim()) S.partner = pbn.value.trim();
  if (nm) S.name = nm.value.trim(); if (pn) S.partner = pn.value.trim();
  if (pt && pt.value.trim()) S.pronouns = pt.value.trim(); if (pt2 && pt2.value.trim()) S.partnerPronouns = pt2.value.trim();
}

/* swipe-to-dismiss with undo (history, memory, agreements); buttons stay for keyboard users */
function swipeAct(kind, id) {
  const lists = { hist:['history', x => x.id === id, 'Deleted'], mem:['memory', x => String(x.id) === String(id), 'Bun forgot that.'], agr:['agreements', x => x.id === id, 'Agreement archived'] };
  const [key, pred, msg] = lists[kind]; const arr = S[key]; const i = arr.findIndex(pred); if (i < 0) return;
  const it = arr.splice(i, 1)[0]; save(); render(); toast(msg, () => { S[key].splice(i, 0, it); save(); render(); });
}
let sw = null;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.swipe'); if (!el || e.target.closest('button,a,input,textarea,select,summary')) return;
  sw = { el, x:e.clientX, y:e.clientY, dx:0, on:false };
});
document.addEventListener('pointermove', e => {
  if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (!sw.on && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { sw = null; return; }
  if (Math.abs(dx) > 8) { sw.on = true; sw.dx = dx; sw.el.style.transition = 'none'; sw.el.style.transform = `translateX(${dx}px)`; sw.el.style.opacity = String(Math.max(.2, 1 - Math.abs(dx) / 260)); sw.el.classList.add('swiping'); }
});
const swEnd = () => {
  if (!sw) return; const { el, dx, on } = sw; sw = null; if (!on) return;
  el.style.transition = 'transform .18s ease, opacity .18s ease';
  if (Math.abs(dx) > 100) { el.style.transform = `translateX(${dx > 0 ? 420 : -420}px)`; el.style.opacity = '0'; setTimeout(() => swipeAct(el.dataset.swipe, el.dataset.id), 170); }
  else { el.style.transform = ''; el.style.opacity = ''; el.classList.remove('swiping'); }
};
document.addEventListener('pointerup', swEnd); document.addEventListener('pointercancel', swEnd);

/* next with validation (topic) */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-next]'); if (!t) return;
  if (!S.topics.length) { const er = $('#topic-err'); er.textContent = 'Pick at least one topic so I know where to start.'; er.style.color = 'var(--tomato-hi)'; $('[data-topic]').focus(); return; }
  go(t.dataset.next);
});

/* quick exit: replace history so Back doesn't return here */
const quickExit = () => { try { localStorage.removeItem('simmer-live-app'); sessionStorage.clear(); } catch {} location.replace('https://weather.com/'); };
$('#quick-exit').addEventListener('click', quickExit);
let escAt = 0;
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#sheet').hidden) { closeSheet(); return; }
  if (!$('#quick-exit').hidden) { const now = Date.now(); if (now - escAt < 800) quickExit(); escAt = now; }
});
$('#scrim').addEventListener('click', () => closeSheet());

/* jump dialog (mobile) */
const dlg = $('#jump-dialog');
const closeJump = () => dlg.open && dlg.close();
$('#jump-fab').addEventListener('click', () => dlg.showModal());
$('#jump-close').addEventListener('click', closeJump);
$('#jump-mobile').addEventListener('click', e => { if (e.target.closest('a')) closeJump(); });
dlg.addEventListener('click', e => { if (e.target === dlg) closeJump(); });

window.addEventListener('hashchange', render);
if (/[?&]demo=[01]/.test(location.search)) { save(); history.replaceState(null, '', location.pathname + (location.hash || '')); }
if (/[?&]pause=1/.test(location.search)) { history.replaceState(null, '', location.pathname + '#/pause'); }
document.getElementById('vswitch').innerHTML = switcherHTML('app');
render();
})();
