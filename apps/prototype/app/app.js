/* Simmer, the working prototype. One front door: "Are we in a fight, or just here to chill?"
   Fight: 1 wind down -> 2 talk it through (Bun referees, live model) -> 3 seal it (repair + agreement, saved).
   Chill: plans (agreements + reminders), a small gesture with a real "yes" link, private chat with Bun, history.
   Everything is real use only: no seeded people, no fake history. Data stays in this browser (localStorage). */
(() => {
'use strict';
const C = window.SimmerCore, X = window.Simmer;
let S = C.load(localStorage);
const save = () => C.save(localStorage, S);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const N = w => esc(C.nm(S, w));
const BOTH = () => esc(C.both(S));
const Both = () => { const b = C.both(S); return esc(b[0].toUpperCase() + b.slice(1)); };
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
const toast = (t, ms = 3200) => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), ms); };

/* ---------------- voice: Bun speaks (SpeechSynthesis), you can talk back (Web Speech recognition) ---------------- */
const V = (() => {
  const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voice = null, tok = 0;
  const pick = () => { if (!ok) return; const vs = speechSynthesis.getVoices(); voice = vs.find(v => /Samantha|Ava|Allison|Google US English|Microsoft (Aria|Jenny)/i.test(v.name)) || vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; };
  if (ok) { pick(); try { speechSynthesis.addEventListener('voiceschanged', pick); } catch {} }
  const wave = on => $$('.bun-av').forEach(e => e.classList.toggle('talking', on));
  const api = {
    ok, canListen: !!Rec, unlocked: false, listening: false,
    // iPhone Safari only allows speech after a tap: speak a silent utterance inside the first tap.
    unlock() { if (!ok || api.unlocked) return; api.unlocked = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch {} },
    cancel() { tok++; if (ok && window.SimmerSpeech) SimmerSpeech.hush(speechSynthesis); wave(false); },
    speak(text, onend) {
      const t = String(text || '').replace(/[*_]/g, '').replace(/\s+/g, ' ').trim(); const my = ++tok;
      let done = false; const fin = () => { if (done) return; done = true; if (my === tok) wave(false); onend && onend(); };
      if (!ok || !S.voice || !t || api.listening) { fin(); return false; }
      try { speechSynthesis.cancel(); } catch {}
      const u = new SpeechSynthesisUtterance(t); if (voice) u.voice = voice; u.lang = voice?.lang || 'en-US'; u.rate = .96; u.pitch = 1.04;
      u.onstart = () => my === tok && wave(true); u.onend = fin; u.onerror = fin;
      setTimeout(() => { if (my !== tok) return; try { speechSynthesis.speak(u); } catch { fin(); } }, 60);
      setTimeout(fin, Math.min(25000, 2000 + t.split(' ').length * 480)); // some browsers never fire onend
      return true;
    },
    // Must be called from a tap (iPhone requirement). keep=true stays on across pauses
    // and writes interim words into onText. keep=false is one phrase (the fork).
    listen(onText, onEnd, keep = true) {
      const notes = window.SimmerSpeech && SimmerSpeech.NOTES;
      if (!Rec || !window.SimmerSpeech) { api.micNote = notes ? notes.unsupported : 'Voice typing isn’t available in this browser. Type instead.'; api.micWarn = true; micUI(); return false; }
      gen += 1; const my = gen;
      const previous = session; session = null;
      api.listening = false;
      if (previous) previous.stop();
      api.cancel();
      const mine = SimmerSpeech.createSession({
        Rec, synth: ok ? window.speechSynthesis : null, keep: keep !== false,
        onText,
        onState: state => {
          if (my !== gen) return;
          api.listening = state === 'listening';
          api.micNote = notes[state] || '';
          api.micWarn = state !== 'listening' && state !== 'idle' && !!api.micNote;
          micUI();
        },
        onEnd: (text, state) => {
          if (my !== gen) return;
          if (session === mine) session = null;
          api.listening = false; micUI();
          onEnd && onEnd(text, state);
        },
      });
      session = mine;
      return mine.start();
    },
    stop() {
      const current = session; session = null;
      api.listening = false; api.micNote = ''; api.micWarn = false;
      if (current) current.stop();
      micUI();
    },
  };
  let session = null, gen = 0;
  api.micNote = ''; api.micWarn = false;
  return api;
})();
const micGesture = e => e.target.closest && e.target.closest('[data-act="mic"], [data-act="fork-listen"]');
document.addEventListener('pointerdown', e => { if (!micGesture(e)) V.unlock(); }, true);
document.addEventListener('click', e => { if (!micGesture(e)) V.unlock(); }, true);
const micUI = () => {
  $$('[data-act="mic"], [data-act="fork-listen"]').forEach(b => {
    const on = V.listening;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    const label = b.querySelector('.ml'); if (!label) return;
    if (b.dataset.act === 'fork-listen') label.textContent = on ? 'Listening… tap to stop' : 'Or just say it';
    else label.textContent = on ? 'Listening… tap to stop' : 'Talk';
  });
  $$('[data-mic-status]').forEach(p => { p.textContent = V.micNote || ''; p.hidden = !V.micNote; p.classList.toggle('warn', !!V.micWarn); });
};

/* ---------------- bits ---------------- */
function bun(size = 96, mood = 'happy') {
  const eyes = { happy: '<path d="M40 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>', soft: '<circle cx="46" cy="57" r="4.5" fill="#2B1A12"/><circle cx="74" cy="57" r="4.5" fill="#2B1A12"/>', calm: '<path d="M40 57 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 57 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>' }[mood];
  const mouth = mood === 'soft' ? '<path d="M54 70 q6 4 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>' : '<path d="M52 68 q8 8 16 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>';
  return `<span class="bun-av" style="width:${size}px"><svg width="${size}" height="${Math.round(size * .88)}" viewBox="0 -6 120 106" aria-hidden="true"><path d="M10 66 C10 32 32 12 60 12 C88 12 110 32 110 66 C110 84 92 92 60 92 C28 92 10 84 10 66Z" fill="#F6C453" stroke="#2B1A12" stroke-width="4"/><path d="M50 14 q8 -12 18 -4" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><ellipse cx="36" cy="34" rx="10" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 36 34)"/><ellipse cx="32" cy="70" rx="8" ry="5" fill="#F08C70" opacity=".8"/><ellipse cx="88" cy="70" rx="8" ry="5" fill="#F08C70" opacity=".8"/>${eyes}${mouth}</svg></span>`;
}
const say = (text, mood = 'soft', big = false) => `<div class="say${big ? ' big' : ''}">${bun(big ? 76 : 54, mood)}<p class="bubble" id="bun-line">${esc(text)}</p></div>`;
// Show a line in the current Bun bubble and speak it.
const bunSay = (text, onend) => { const el = $('#bun-line'); if (el) el.textContent = text; V.speak(text, onend); };
const I = {
  pause: '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.6" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.6" fill="currentColor"/></svg>',
  mic: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  spk: on => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`,
  gear: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="6" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="18" r="1.5" fill="currentColor"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  hist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5M12 8v4.5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const voiceBtn = () => `<button type="button" class="pill" data-act="voice" aria-pressed="${!!S.voice}">${I.spk(S.voice)}<span>${!V.ok ? 'No voice here' : S.voice ? 'Voice on' : 'Voice off'}</span></button>`;
const fightTop = (back = 'fork', label = 'Exit') => `<div class="topbar"><button class="pill" type="button" data-go="${back}">‹ ${label}</button>${voiceBtn()}</div>`;
const stagebar = n => `<ol class="stages" aria-label="Fight mode, stage ${n} of 3">${['Wind down', 'Talk it through', 'Seal it'].map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}" ${i + 1 === n ? 'aria-current="step"' : ''}><b>${i + 1 < n ? '✓' : i + 1}</b>${t}</li>`).join('')}</ol>`;
const helpLink = () => `<p class="help-row">Scared, or not safe right now? <a class="help-link" href="#/help">Get help privately</a></p>`;
const micBtn = (target) => V.canListen ? `<button type="button" class="btn mic" data-act="mic" data-target="${target}" aria-pressed="false">${I.mic}<span class="ml">Talk</span></button>` : '';
const micNote = () => V.canListen ? '<p class="mic-note" data-mic-status hidden></p>' : '<p class="mic-note">Voice typing isn’t available in this browser. Type instead.</p>';
const inputBox = (id, ph, rows = 3) => `<div class="inbox"><label class="sr" for="${id}">${esc(ph)}</label><textarea id="${id}" rows="${rows}" placeholder="${esc(ph)}" maxlength="1200"></textarea><div class="inrow">${micBtn(id)}<button type="button" class="btn primary" data-act="submit" data-target="${id}">Done</button></div>${micNote()}</div>`;

/* ---------------- safety: a flag applies to that one message ---------------- */
const safetyHit = ret => { V.cancel(); V.stop(); S.safeRet = ret || 'fork'; save(); go('help'); };
const flagged = text => X.screen({ messages: [{ from: 'A', text }] });

/* ---------------- router ---------------- */
const R = {};
let CUR = '', ARG = '', PREVARG = '', tick = null, mountFn = null;
const go = r => { if (('#/' + r) === location.hash) render(); else location.hash = '#/' + r; };
function render() {
  clearInterval(tick); tick = null; V.stop();
  let [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  ARG = rest.join('/');
  if (!name) name = S.consent ? 'fork' : 'welcome';
  if (!R[name]) name = S.consent ? 'fork' : 'welcome';
  const open = ['welcome', 'setup', 'help', 'pause', 'f1', 'ftog', 'fwind', 'fsolo', 'fback', 'f2', 'f3', 'fdone'];
  if (!S.consent && !open.includes(name)) name = 'welcome';
  if (['f1', 'ftog', 'fwind', 'fsolo', 'fback', 'f2', 'f3'].includes(name) && !S.cur) C.startFight(S);
  if (name === 'help' && CUR && CUR !== 'help' && !S.safeRet) S.safeRet = CUR + (PREVARG ? '/' + PREVARG : '');
  CUR = name; PREVARG = ARG;
  const out = R[name](ARG) || {};
  const sc = $('#screen'); sc.innerHTML = out.html || ''; sc.className = 'screen ' + (out.cls || '');
  const tabs = $('#tabs'); tabs.hidden = !out.tabs; if (out.tabs) tabs.innerHTML = tabsHTML(name);
  sc.scrollTop = 0; window.scrollTo(0, 0);
  save();
  mountFn = out.mount || null; if (mountFn) mountFn();
  const h = sc.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
const tabsHTML = cur => [['home', 'Home', I.home], ['plans', 'Plans', I.list], ['bun', 'Bun', I.chat], ['history', 'History', I.hist]].map(([k, t, ic]) => `<a href="#/${k}" ${cur === k ? 'aria-current="page"' : ''}>${ic}<span>${t}</span></a>`).join('');
window.addEventListener('hashchange', render);

/* ---------------- first run ---------------- */
R.welcome = () => ({ cls: 'center', html: `
<div class="hero">${bun(132, 'happy')}
<h1 class="h1">Hi, I’m Bun.</h1>
<p class="lede">When a fight starts, open Simmer and tap <b>We’re in a fight</b>. I’ll step in, out loud, and walk you two through it: cool down, talk it through, make up.</p></div>
<div class="stack">
<button class="btn primary big" type="button" data-go="setup">Set us up · 1 minute</button>
<button class="btn fight big" type="button" data-act="fight-now">${I.pause}We’re in a fight right now</button>
</div>
<p class="fine center-t">Coaching, not therapy. Your names and notes stay on this phone. In danger? Call 911 · DV Hotline <span class="nowrap">1-800-799-7233</span> · 988.</p>` });

R.setup = () => ({ html: `
<div class="topbar"><button class="pill" type="button" data-go="${S.consent ? 'settings' : 'welcome'}">‹ Back</button></div>
${say('Two quick things so I can talk to you both by name.', 'happy')}
<h1 class="h2">Who’s who?</h1>
<form id="f-setup" class="form" autocomplete="off">
  <label>Your first name<input name="A" required maxlength="24" value="${esc(S.names.A)}" placeholder="e.g. Tyler" autocapitalize="words"></label>
  <label>Your partner’s first name<input name="B" required maxlength="24" value="${esc(S.names.B)}" placeholder="e.g. Max" autocapitalize="words"></label>
  <label class="check"><input type="checkbox" name="voice" ${S.voice ? 'checked' : ''}> Bun talks out loud (you can mute any time)</label>
  <label class="check"><input type="checkbox" name="consent" required ${S.consent ? 'checked' : ''}> We’re both adults, and we get that Bun is a coach, not a therapist or an emergency service.</label>
  <button class="btn primary big" type="submit">${S.consent ? 'Save' : 'Done, take us in'}</button>
  <p class="fine">Saved on this phone only. No account, no sign-up.</p>
</form>` });

/* ---------------- the fork (front door) ---------------- */
const forkLine = () => `Hey ${C.hasNames(S) ? `${S.names.A} and ${S.names.B}` : 'you two'}. What’s up? Are we in a fight, or just here to chill?`;
R.fork = () => {
  const cur = S.cur && !S.cur.sealedAt ? S.cur : null;
  return { cls: 'center', html: `
<div class="fork-head"><span class="brand">Simmer</span><button class="icon" type="button" data-go="settings" aria-label="Settings">${I.gear}</button></div>
${say(forkLine(), 'happy', true)}
<h1 class="sr">Are we in a fight, or just here to chill?</h1>
<div class="stack fork">
  <button class="btn fight huge" type="button" data-act="fight-now">${I.pause}<span><b>We’re in a fight</b><small>Bun steps in. Free, always.</small></span></button>
  <button class="btn chill huge" type="button" data-go="home"><span><b>Just here to chill</b><small>Plans, ideas, history, talk to Bun.</small></span></button>
</div>
${cur ? `<button class="btn ghost" type="button" data-act="resume">Pick up where you left off · stage ${cur.stage}</button>` : ''}
<div class="row center-r">${V.canListen ? `<button class="btn mic" type="button" data-act="fork-listen">${I.mic}<span class="ml">Or just say it</span></button>` : ''}${V.ok && S.voice ? '<button class="btn ghost sm" type="button" data-act="hear">Hear Bun</button>' : ''}</div>
${helpLink()}`,
    mount() { if (V.unlocked) V.speak(forkLine()); } };
};

/* ---------------- pause deep link (?pause=1): one tap so Bun is allowed to talk ---------------- */
R.pause = () => ({ cls: 'center dark', html: `
<h1 class="sr">Pause</h1>
<button class="pause-big" type="button" data-act="fight-now" aria-label="Pause. Bun steps in.">${I.pause}<span>Pause</span></button>
<p class="pause-sub">Tap and Bun steps in.</p>` });

/* ---------------- fight · stage 1: wind down ---------------- */
const pauseLine = () => `${Both()}: pause. Stop talking for one breath. Breathe out, long and slow. I’m Bun. Nobody’s in trouble, and nobody has to be right yet. First we calm your bodies. Together, or separately?`;
R.f1 = () => ({ html: `
${fightTop()}${stagebar(1)}
${say(pauseLine(), 'soft', true)}
<h1 class="h2">Calm down together, or separately?</h1>
<div class="stack">
  <button class="choice" type="button" data-go="ftog"><b>Together</b><span>Same room. Sit still and breathe, or walk it off side by side.</span></button>
  <button class="choice" type="button" data-act="solo-start"><b>Separately</b><span>Each of you answers 5 quick questions with Bun, then winds down your own way.</span></button>
</div>
<button class="link" type="button" data-act="skip-wind">We’re already calm. Go to talking it through</button>
${helpLink()}`, mount() { if (!S.cur.spoke1) { S.cur.spoke1 = 1; save(); V.speak(pauseLine()); } } });

R.ftog = () => ({ html: `
${fightTop('f1', 'Back')}${stagebar(1)}
${say('Pick what your bodies need. If either of you feels like pacing, walk. If you’re both a little calmer, sit.')}
<h1 class="h2">How do you want to calm down?</h1>
<div class="stack">
  <button class="choice" type="button" data-go="fwind/sit"><b>Sit still</b><span>Face each other. Soft eye contact and slow breathing, 3 to 5 minutes. For calmer moments.</span></button>
  <button class="choice" type="button" data-go="fwind/walk"><b>Walk it off</b><span>Out the door, side by side. Bun speaks up every couple of minutes. For when you’re buzzing.</span></button>
</div>${helpLink()}`, mount() { V.speak('Pick what your bodies need. If either of you feels like pacing, walk. If you’re both a little calmer, sit.'); } });

function windCfg(k) {
  if (k !== 'solo') return C.WIND[k];
  const so = S.cur.solo, plans = ['A', 'B'].filter(w => so[w]).map(w => ({ w, p: C.PLANS[so[w].plan], mins: so[w].mins }));
  const mins = Math.max(10, ...plans.map(x => x.mins));
  const cues = plans.length ? plans.flatMap(x => x.p.cues) : C.PLANS.breathe.cues;
  return { title: 'Your wind-downs', mins, opts: null, every: 60, breath: plans.some(x => x.p.key === 'breathe'), intro: plans.map(x => `${C.nm(S, x.w)}: ${x.p.title}.`).join(' ') + ' Go to separate spaces. I’ll call you both back when the time’s up.', cues, end: `That’s time. Come back to each other. Start small, like: I’m back. Can we try again?`, plans };
}
R.fwind = k => {
  k = ['sit', 'walk', 'solo'].includes(k) ? k : 'sit';
  const c = windCfg(k); const W = S.cur.wt && S.cur.wt.k === k ? S.cur.wt : (S.cur.wt = { k, mins: c.mins, left: c.mins * 60, running: false });
  return { html: `
${fightTop(k === 'solo' ? 'fsolo' : 'ftog', 'Back')}${stagebar(1)}
${say(c.intro)}
<h1 class="h2">${esc(c.title)}</h1>
${c.plans ? `<ul class="plan-list">${c.plans.map(x => `<li><b>${N(x.w)}</b> · ${esc(x.p.title)}<span>${esc(x.p.how)}</span></li>`).join('')}</ul>` : ''}
<div class="timer"><div class="orb ${c.breath ? 'breath' : ''}" id="orb"><span id="t-left">${fmt(W.left)}</span><small id="t-cue">${c.breath ? 'Breathe with the circle' : 'Bun will speak up'}</small></div></div>
${c.opts ? `<div class="chips" role="radiogroup" aria-label="Minutes">${c.opts.map(m => `<button type="button" class="chip" role="radio" aria-checked="${W.mins === m}" data-act="mins" data-m="${m}">${m} min</button>`).join('')}</div>` : ''}
<div class="row"><button class="btn primary" type="button" data-act="t-toggle" id="t-btn">${W.running ? 'Pause timer' : W.left < W.mins * 60 ? 'Resume' : 'Start'}</button><button class="btn ghost" type="button" data-act="t-more">+5 min</button></div>
<button class="btn calm big" type="button" data-act="calmer">We’re calmer · come back together</button>
${helpLink()}`, mount() { C.logStage(S, { wind: k }); S.cur.wind = k; save(); if (W.running) runTimer(c); } };
};
const fmt = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
function runTimer(c) {
  const W = S.cur.wt; clearInterval(tick); let since = 0, ci = 0;
  tick = setInterval(() => {
    if (!W.running) return; W.left--; since++;
    const el = $('#t-left'); if (el) el.textContent = fmt(W.left);
    if (c.breath) { const ph = Math.floor((W.mins * 60 - W.left) / 5) % 2; const cue = $('#t-cue'); if (cue) cue.textContent = ph ? 'Out, slowly…' : 'Breathe in…'; }
    if (since >= c.every && W.left > 10) { since = 0; bunSay(c.cues[ci++ % c.cues.length]); }
    if (W.left % 10 === 0) save();
    if (W.left <= 0) { clearInterval(tick); W.running = false; save(); bunSay(c.end + ' Ready to come back?', null); setTimeout(() => CUR === 'fwind' && go('fback'), 6000); }
  }, 1000);
}

/* separately: pass-the-phone, five private questions each, then one shared timer */
R.fsolo = () => {
  const so = S.cur.solo, P = S.cur.sp || (S.cur.sp = { who: null, i: 0, ans: {} });
  if (!P.who) {
    const allDone = so.A && so.B;
    return { html: `
${fightTop('f1', 'Back')}${stagebar(1)}
${say(allDone ? 'You’ve both answered. Go to separate spaces and start your wind-downs.' : 'One phone, one person at a time. Whoever goes first, take the phone. The other one, step out of view for a minute.')}
<h1 class="h2">${allDone ? 'Both done' : 'Who’s holding the phone?'}</h1>
<div class="stack">${['A', 'B'].map(w => `<button class="choice" type="button" data-act="solo-who" data-w="${w}" ${so[w] ? 'disabled' : ''}><b>${so[w] ? '✓ ' : 'I’m '}${N(w)}</b><span>${so[w] ? `Answers hidden. Wind-down: ${esc(C.PLANS[so[w].plan].title)}.` : 'Five quick questions, then a wind-down that fits you.'}</span></button>`).join('')}</div>
${so.A || so.B ? `<button class="btn primary big" type="button" data-go="fwind/solo">${allDone ? 'Start our wind-downs' : 'Only one of us is answering. Start the wind-down'}</button>` : ''}
<p class="fine">Bun doesn’t read these questions out loud. Your answers hide as soon as you finish and are never shown to your partner. Bun’s AI gets a short summary (how activated you are, what your body needs), not what you wrote.</p>
${helpLink()}` };
  }
  const w = P.who, o = C.other(w);
  if (P.i < C.QS.length) {
    const q = C.QS[P.i], a = P.ans[q.k];
    const body = q.type === 'text' ? inputBox('q-in', q.ph, 2)
      : q.type === 'scale' ? `<div class="scale" role="radiogroup" aria-label="1 to 10">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="chip" role="radio" aria-checked="${+a === n}" data-act="q-pick" data-v="${n}">${n}</button>`).join('')}</div>`
      : `<div class="chips">${q.opts.map(v => `<button type="button" class="chip" ${q.multi ? 'aria-pressed' : 'role="radio" aria-checked'}="${q.multi ? (a || []).includes(v) : a === v}" data-act="q-pick" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>${q.multi ? '<button class="btn primary" type="button" data-act="q-next">Next</button>' : ''}`;
    return { html: `
<div class="topbar"><button class="pill" type="button" data-act="solo-hand">‹ Not ${N(w)}? Pass back</button><span class="eyebrow">For ${N(w)} only · ${P.i + 1} of 5</span></div>
${stagebar(1)}
<h1 class="h2 q">${esc(q.q(q.k === 'mins' ? C.nm(S, o) : C.nm(S, w)))}</h1>
${body}${helpLink()}` };
  }
  // all five answered: plan + Bun's line (AI, from a neutral summary)
  const plan = C.pickPlan(P.ans), mins = C.soloMins(P.ans), p = C.PLANS[plan];
  return { html: `
<div class="topbar"><span class="eyebrow">For ${N(w)} only</span></div>${stagebar(1)}
${say('Thinking about what fits you…', 'calm')}
<h1 class="h2">${esc(p.title)} · ${mins} min</h1>
<p class="lede">${esc(p.how)}</p>
<button class="btn primary big" type="button" data-act="solo-lock">${S.cur.solo[o] ? 'Hide my answers and start' : `Hide my answers, pass the phone to ${N(o)}`}</button>
${helpLink()}`, async mount() {
      const summary = C.soloSummary(P.ans, plan, mins) + (X.AMBIG_RE.test(P.ans.what || '') ? ` (For the safety check only, they wrote: "${String(P.ans.what).slice(0, 300)}")` : '');
      const r = await X.coach({ mode: 'app', task: 'winddown', me: w, names: C.aiNames(S), messages: [{ from: w, text: summary }] });
      if (CUR !== 'fsolo') return;
      if (r.safety) return safetyHit('fsolo');
      const line = r.text && !r.error ? r.text : `Thanks, ${C.nm(S, w)}. Let’s try ${p.sayAs} for ${mins} minutes. I’m not picking sides. I’ll nudge you back to ${C.nm(S, o)} when the time’s up.`;
      const el = $('#bun-line'); if (el) el.textContent = line; // shown, not spoken (privacy)
    } };
};

R.fback = () => {
  const rd = S.cur.ready || (S.cur.ready = { A: false, B: false });
  const line = `Time to come back. ${C.nm(S, 'A')}, ${C.nm(S, 'B')}: ready to come back together? Each of you tap when you are.`;
  return { html: `
${fightTop()}${stagebar(1)}
${say(line, 'calm', true)}
<h1 class="h2">Ready to come back together?</h1>
<div class="stack">${['A', 'B'].map(w => `<button class="choice ready ${rd[w] ? 'on' : ''}" type="button" data-act="ready" data-w="${w}" aria-pressed="${rd[w]}"><b>${rd[w] ? '✓ ' : ''}${N(w)}: I’m ready</b><span>${rd[w] ? 'Ready.' : 'Tap when your body feels calmer.'}</span></button>`).join('')}</div>
<button class="btn ghost" type="button" data-act="more5">We need 5 more minutes</button>
${helpLink()}`, mount() { V.speak(line); } };
};

/* ---------------- fight · stage 2: talk it through (Bun referees, live model) ---------------- */
const T = () => S.cur.talk || (S.cur.talk = { phase: 'intro', speaker: 'A', round: 0, msgs: [], tries: 0, secs: 120 });
const introLine = () => `Here’s how this works. One of you talks, the other just listens. Then the listener says back what they heard. I keep it fair, and I keep time. Who goes first?`;
R.f2 = () => {
  const t = T(), s = t.speaker, l = C.other(s);
  const lastBunIdx = t.msgs.map(m => m.from).lastIndexOf('bun');
  const shown = ['speak', 'listen', 'clarify', 'needA', 'needB', 'check'].includes(t.phase) && lastBunIdx === t.msgs.length - 1 ? t.msgs.slice(0, -1) : t.msgs;
  const log = shown.length ? `<div class="thread" id="thread">${shown.map(m => m.from === 'bun' ? `<div class="m bun">${bun(30)}<p>${esc(m.text)}</p></div>` : `<div class="m p${m.from}"><b>${N(m.from)}</b><p>${esc(m.text)}</p></div>`).join('')}</div>` : '';
  let panel = '';
  const lastBun = [...t.msgs].reverse().find(m => m.from === 'bun');
  if (t.phase === 'intro') panel = `${say(introLine(), 'soft', true)}<h1 class="h2">Who goes first?</h1>
    <div class="row">${['A', 'B'].map(w => `<button class="btn primary" type="button" data-act="first" data-w="${w}">${N(w)}</button>`).join('')}</div>
    <p class="label">Time for each turn</p><div class="chips">${[60, 120, 180].map(x => `<button type="button" class="chip" role="radio" aria-checked="${t.secs === x}" data-act="secs" data-v="${x}">${x / 60} min</button>`).join('')}</div>`;
  else if (t.phase === 'thinking') panel = `<div class="say">${bun(54, 'calm')}<p class="bubble typing" id="bun-line"><i></i><i></i><i></i><span class="sr">Bun is thinking</span></p></div>`;
  else if (t.phase === 'check') panel = `${say(lastBun ? lastBun.text : '', 'soft')}<h1 class="h2">${N(s)}, did that land?</h1>
    <div class="stack"><button class="btn calm big" type="button" data-act="heard">Yes, I feel heard</button><button class="btn ghost big" type="button" data-act="notquite">Not quite</button></div>`;
  else {
    const who = t.phase === 'listen' ? l : t.phase === 'needA' ? 'A' : t.phase === 'needB' ? 'B' : s;
    const head = { speak: `${N(s)}’s turn · ${N(l)} just listens`, listen: `${N(l)}: say back what you heard`, clarify: `${N(s)}: what part didn’t land?`, needA: `${N('A')}: one thing you need next time`, needB: `${N('B')}: one thing you need next time` }[t.phase];
    const ph = { speak: 'Start with “I felt…”', listen: 'What I heard you say is…', clarify: 'The part I want you to get is…', needA: 'Next time, I need…', needB: 'Next time, I need…' }[t.phase];
    panel = `${say(lastBun ? lastBun.text : `${C.nm(S, s)}, tell ${C.nm(S, l)} what happened for you. Start with “I felt”. ${C.nm(S, l)}, just listen.`, 'soft')}
    <h1 class="h2 who-${who}">${head}</h1>
    ${t.phase === 'speak' ? `<div class="turn-timer" id="turn-timer" aria-live="off">${fmt(t.left ?? t.secs)}</div>` : ''}
    ${inputBox('talk-in', ph, 3)}`;
  }
  return { html: `${fightTop()}${stagebar(2)}${log}<section class="panel" id="panel">${panel}</section>
  ${t.phase !== 'intro' ? '<div class="row"><button class="btn ghost sm" type="button" data-act="heat">We’re heating up</button><button class="link" type="button" data-act="to-seal">Skip to sealing it</button></div>' : ''}
  ${helpLink()}`, mount() {
      C.logStage(S, { stage: 2 }); S.cur.stage = 2; save();
      const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight;
      if (t.phase === 'intro' && !t.introSpoken) { t.introSpoken = 1; save(); V.speak(introLine()); }
      if (t.phase === 'speak') { if (t.left == null) t.left = t.secs; tick = setInterval(() => { if (V.listening || document.activeElement?.id === 'talk-in' || t.left < t.secs) { t.left--; const el = $('#turn-timer'); if (el) { el.textContent = fmt(t.left); el.classList.toggle('over', t.left <= 0); } if (t.left === 0) { toast('Time. Finish your sentence, then tap Done.'); if (!V.listening) V.speak('Time. Finish your sentence.'); } } }, 1000); }
    } };
};
async function talkSubmit(text) {
  const t = T(); text = String(text || '').trim(); if (!text) { toast('Say or type something first.'); return; }
  const ph = t.phase, s = t.speaker;
  const who = ph === 'listen' ? C.other(s) : ph === 'needA' ? 'A' : ph === 'needB' ? 'B' : s;
  if (flagged(text)) { save(); return safetyHit('f2'); } // that message isn't kept; Back returns here
  t.msgs.push({ from: who, text: text.slice(0, 1200) });
  if (ph === 'needA') { S.cur.needs.A = text; t.phase = 'needB'; save(); render(); bunSay(`Thank you. And ${C.nm(S, 'B')}, what do you need next time?`); return; }
  if (ph === 'needB') { S.cur.needs.B = text; save(); go('f3'); return; }
  const step = ph === 'speak' ? 'reflect' : ph === 'listen' ? 'check' : 'clarify';
  const back = ph; t.phase = 'thinking'; t.left = null; save(); render();
  const line = await bunTalk(step);
  if (line == null) { t.msgs.pop(); t.phase = back; save(); return; }
  t.phase = step === 'check' ? 'check' : 'listen'; save(); render(); V.speak(line);
}
async function bunTalk(step) {
  const t = T();
  const r = await X.coach({ mode: 'talk', names: C.aiNames(S), extra: { step, speaker: t.speaker, memory: S.paid ? C.memoryText(S) : '' }, messages: t.msgs.slice(-16) });
  if (r.safety) { safetyHit('f2'); return null; }
  const text = r.text && !r.error && !r.scripted ? r.text.trim() : C.scriptedTalk(step, S, t.speaker);
  if (r.error) console.warn('Bun offline, scripted line used:', r.error);
  t.msgs.push({ from: 'bun', text }); return text;
}
async function heard() {
  const t = T();
  if (t.round === 0) {
    t.round = 1; t.speaker = C.other(t.speaker); t.tries = 0; t.phase = 'speak'; t.left = null;
    const line = `Thank you, both. ${C.nm(S, t.speaker)}, your turn. Tell ${C.nm(S, C.other(t.speaker))} what happened for you, starting with “I felt”. ${C.nm(S, C.other(t.speaker))}, just listen.`;
    t.msgs.push({ from: 'bun', text: line }); save(); render(); V.speak(line); return;
  }
  t.phase = 'thinking'; save(); render();
  const line = await bunTalk('needs'); if (line == null) { t.phase = 'check'; save(); return; }
  t.phase = 'needA'; save(); render(); V.speak(line);
}

/* ---------------- fight · stage 3: seal it ---------------- */
R.f3 = () => {
  const f = S.cur, z = f.seal || {};
  return { html: `
${fightTop('f2', 'Back')}${stagebar(3)}
${say(z.say || 'Give me a second…', z.say ? 'happy' : 'calm', true)}
<h1 class="h2">Seal it</h1>
<form id="f-seal" class="form seal" autocomplete="off">
<fieldset><legend>1 · Close it with something small</legend>
<div class="chips">${C.REPAIRS.map(r => `<button type="button" class="chip" role="radio" aria-checked="${z.repair === r}" data-act="repair" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
${z.repair === 'Something else' ? `<input name="repairOther" maxlength="50" placeholder="What will you do?" value="${esc(z.repairOther || '')}">` : ''}
${z.repair ? `<div class="doit ${z.repairDone ? 'on' : ''}"><p>${z.repairDone ? '✓ Done. That counts.' : 'Do it now. I’ll wait.'}</p>${z.repairDone ? '' : '<button type="button" class="btn calm sm" data-act="repair-done">We did it</button>'}</div>` : ''}
</fieldset>
<fieldset><legend>2 · One agreement for next time</legend>
<textarea id="seal-in" name="agreement" rows="2" maxlength="160" placeholder="We’ll…">${esc(z.agreement || '')}</textarea>
<div class="inrow">${micBtn('seal-in')}</div>${micNote()}
<label class="inline">Remind us<select name="remind"><option value="0">No reminder</option><option value="3" ${z.remind == 3 ? 'selected' : ''}>In 3 days</option><option value="7" ${z.remind == 7 || z.remind == null ? 'selected' : ''}>In a week</option></select></label>
</fieldset>
<fieldset><legend>3 · What helped tonight? <span>optional</span></legend>
<div class="chips">${C.HELPED.map(h => `<button type="button" class="chip" aria-pressed="${(z.helped || []).includes(h)}" data-act="helped" data-v="${esc(h)}">${esc(h)}</button>`).join('')}</div>
<label>What was this one about? <span class="opt">optional, a few words</span><input name="topic" maxlength="60" value="${esc(z.topic || '')}" placeholder="e.g. plans for the weekend"></label>
</fieldset>
<button class="btn primary big" type="submit">Seal it and save</button>
<p class="fine">Saved to your history on this phone: the topic, what helped, your repair, your agreement and what each of you said you need. Not the rest of the conversation.</p>
</form>${helpLink()}`, async mount() {
      C.logStage(S, { stage: 3 }); f.stage = 3; save();
      if (f.seal) return;
      f.seal = { remind: 7 };
      const msgs = [...(f.talk?.msgs || []).slice(-14)];
      if (f.needs.A) msgs.push({ from: 'A', text: `Next time I need: ${f.needs.A}` });
      if (f.needs.B) msgs.push({ from: 'B', text: `Next time I need: ${f.needs.B}` });
      let z2 = C.SEAL_FALLBACK(S);
      if (msgs.length) {
        const r = await X.coach({ mode: 'talk', task: 'seal', names: C.aiNames(S), extra: { step: 'seal', speaker: 'A', memory: S.paid ? C.memoryText(S) : '' }, messages: msgs });
        if (r.safety) { f.seal = null; save(); return safetyHit('f3'); }
        if (r.text && !r.error && !r.scripted) { const p = C.parseSeal(r.text); if (p.say) z2 = { say: p.say, agreement: p.agreement }; }
      }
      if (!S.cur) return;
      Object.assign(f.seal, z2); save();
      if (CUR === 'f3') { const ta = $('textarea[name=agreement]'); if (ta && !ta.value) ta.value = z2.agreement; bunSay(z2.say); }
    } };
};
const sealForm = () => { const fm = $('#f-seal'); if (!fm || !S.cur?.seal) return; const z = S.cur.seal; z.agreement = fm.agreement.value; z.topic = fm.topic.value; z.remind = +fm.remind.value; if (fm.repairOther) z.repairOther = fm.repairOther.value; save(); };

R.fdone = id => {
  const e = S.fights.find(x => x.id === id) || S.fights[0];
  if (!e) return R.fork();
  return { cls: 'center', html: `
${say('Sealed. It’s in your history. Go enjoy the rest of your night.', 'happy', true)}
<h1 class="h2">Fight sealed</h1>
${fightCard(e, true)}
<div class="stack"><button class="btn primary big" type="button" data-go="home">Home</button><button class="btn ghost" type="button" data-go="history">See history</button></div>` };
};
function fightCard(e, open) {
  const d = new Date(e.start);
  return `<article class="card fight-card">
  <p class="eyebrow">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · ${C.fmtDur((e.end || e.start) - e.start)}</p>
  <h3>${esc(e.topic || (e.sealed ? 'A fight, sealed' : 'Calmed down, not sealed'))}</h3>
  <ul class="facts">
   ${e.wind ? `<li><b>Wind-down</b>${esc(C.WIND_LABEL[e.wind] || e.wind)}</li>` : ''}
   <li><b>Got to</b>${e.sealed ? 'Sealed (all 3 stages)' : ['Wind down', 'Talk it through', 'Seal it'][(e.stage || 1) - 1]}</li>
   ${e.repair ? `<li><b>Repair</b>${esc(e.repair)}${e.repairDone ? ' ✓' : ''}</li>` : ''}
   ${e.agreement ? `<li><b>Agreement</b>${esc(e.agreement)}</li>` : ''}
   ${open && e.needs?.A ? `<li><b>${N('A')} needs</b>${esc(e.needs.A)}</li>` : ''}
   ${open && e.needs?.B ? `<li><b>${N('B')} needs</b>${esc(e.needs.B)}</li>` : ''}
   ${e.helped?.length ? `<li><b>What helped</b>${esc(e.helped.join(', '))}</li>` : ''}
  </ul></article>`;
}

/* ---------------- chill side ---------------- */
R.home = () => {
  const now = Date.now(), up = C.upcoming(S, now), ags = S.agreements.filter(a => !a.done).slice(0, 3), g = C.GIFTS[S.giftIdx % C.GIFTS.length];
  const cur = S.cur && !S.cur.sealedAt;
  return { tabs: true, html: `
<div class="home-head"><div><p class="eyebrow">${X.fmtDay(now, { weekday: 'long', month: 'short', day: 'numeric' })}</p><h1 class="h2">${X.greeting(now)}, ${C.hasNames(S) ? `${N('A')} & ${N('B')}` : 'you two'}</h1></div><button class="icon" type="button" data-go="settings" aria-label="Settings">${I.gear}</button></div>
${cur ? `<button class="card resume" type="button" data-act="resume"><b>You’re mid-fight</b><span>Pick up where you left off · stage ${S.cur.stage}</span></button>` : ''}
<button class="pause-tile" type="button" data-act="fight-now">${I.pause}<span><b>Fight starting?</b><small>Tap and Bun steps in</small></span></button>
${S.postFight && !S.paid ? `<section class="card pf"><p><b>Nice work getting through that one.</b> Want Bun to remember what helped and what you agreed, so next time is shorter?</p><div class="row"><button class="btn primary sm" type="button" data-go="together">See Simmer Together</button><button class="btn ghost sm" type="button" data-act="pf-dismiss">Not now</button></div></section>` : ''}
<section class="card"><div class="card-h"><h2>Coming up</h2><a href="#/plans">All plans</a></div>
${up.length ? `<ul class="rem">${up.map(remRow).join('')}</ul>` : '<p class="muted">Nothing coming up. Add a reminder in Plans, or save one when you seal a fight.</p>'}</section>
<section class="card"><div class="card-h"><h2>Your agreements</h2><a href="#/plans">Edit</a></div>
${ags.length ? `<ul class="ags">${ags.map(a => `<li>${esc(a.text)}<span>${X.fmtDay(a.at)}</span></li>`).join('')}</ul>` : '<p class="muted">None yet. You’ll make one at the end of a fight, or add one in Plans.</p>'}</section>
<section class="card gift"><p class="eyebrow">A small gesture</p><h2>${esc(g.title)}</h2><p class="muted">${esc(g.why)}</p>
<div class="stack">${g.url ? `<a class="btn primary" href="${g.url}" target="_blank" rel="noopener" data-act="gift-yes">${esc(g.cta)}</a>` : ''}
<div class="row"><button class="btn ghost sm" type="button" data-act="gift-remind">Remind me Friday</button><button class="btn ghost sm" type="button" data-act="gift-next">Another idea</button></div></div>
${g.url ? `<p class="fine">Opens ${esc(g.site)} in a new tab. Simmer doesn’t place orders or take payment.</p>` : ''}</section>
<section class="card nudge"><p class="eyebrow">Today’s 30-second nudge</p><p class="big-t">${esc(C.nudgeFor(S, now))}</p></section>
${helpLink()}<p class="fine center-t">Simmer is coaching, not therapy.</p>` };
};
const remRow = r => `<li class="${r.done ? 'done' : ''}"><label class="check"><input type="checkbox" data-act="rem-done" data-id="${r.id}" ${r.done ? 'checked' : ''}><span>${esc(r.text)}</span></label><span class="due ${C.dueLabel(r.due) === 'Overdue' ? 'late' : ''}">${C.dueLabel(r.due)}</span></li>`;

R.plans = () => {
  const tom = new Date(Date.now() + 864e5); const iso = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
  const rems = [...S.reminders].sort((a, b) => a.done - b.done || a.due - b.due);
  return { tabs: true, html: `
<h1 class="h2">Plans</h1>
<section class="card"><h2>Agreements</h2>
${S.agreements.length ? `<ul class="list">${S.agreements.map(a => `<li class="${a.done ? 'done' : ''}"><label class="check"><input type="checkbox" data-act="ag-done" data-id="${a.id}" ${a.done ? 'checked' : ''}><span>${esc(a.text)}</span></label><span class="meta">${a.fightId ? 'from a fight · ' : ''}${X.fmtDay(a.at)}</span><button class="x" type="button" data-act="ag-del" data-id="${a.id}" aria-label="Delete agreement">×</button></li>`).join('')}</ul>` : '<p class="muted">No agreements yet.</p>'}
<form id="f-ag" class="addrow"><label class="sr" for="ag-in">New agreement</label><input id="ag-in" maxlength="160" placeholder="We’ll…" required><button class="btn primary sm" type="submit">Add</button></form></section>
<section class="card"><h2>Reminders</h2>
${rems.length ? `<ul class="list">${rems.map(r => `<li class="${r.done ? 'done' : ''}"><label class="check"><input type="checkbox" data-act="rem-done" data-id="${r.id}" ${r.done ? 'checked' : ''}><span>${esc(r.text)}</span></label><span class="meta">${C.dueLabel(r.due)} · ${new Date(r.due).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span class="acts"><button class="link sm" type="button" data-act="rem-ics" data-id="${r.id}">Add to calendar</button><button class="x" type="button" data-act="rem-del" data-id="${r.id}" aria-label="Delete reminder">×</button></span></li>`).join('')}</ul>` : '<p class="muted">No reminders yet. Try: “Plan date night”, “Send flowers”, “Ask about the big meeting”.</p>'}
<form id="f-rem" class="form tight"><label>What<input name="text" maxlength="140" required placeholder="e.g. Send flowers"></label>
<div class="row"><label>Day<input type="date" name="day" value="${iso}" required></label><label>Time<input type="time" name="time" value="18:00" required></label></div>
<button class="btn primary" type="submit">Add reminder</button>
<p class="fine">Reminders show on Home when they’re due. Tap “Add to calendar” to get a real alert on your phone.</p></form></section>` };
};

R.bun = () => {
  const w = S.chatAs || 'A', msgs = S.chat[w] || [];
  return { tabs: true, cls: 'chat', html: `
<h1 class="h2">Talk to Bun</h1>
<div class="chips as" role="radiogroup" aria-label="Who’s talking">${['A', 'B'].map(x => `<button type="button" class="chip" role="radio" aria-checked="${w === x}" data-act="as" data-w="${x}">I’m ${N(x)}</button>`).join('')}</div>
<p class="fine">Private to ${N(w)}: ${N(C.other(w))} isn’t shown this. It’s saved on this phone, so anyone holding the phone could open it. ${S.paid ? 'Bun remembers your saved agreements.' : '<a href="#/together">Let Bun remember your agreements</a>'}</p>
<div class="thread chat-thread" id="thread">${msgs.length ? '' : `<div class="m bun">${bun(30)}<p>Hi ${N(w)}. What’s on your mind? Venting is fine. I won’t take sides, and I’m a coach, not a therapist.</p></div>`}${msgs.map(m => m.from === 'bun' ? `<div class="m bun">${bun(30)}<p>${esc(m.text)}</p>${m.safety ? X.resourcesHTML() : ''}</div>` : `<div class="m p${w} me"><p>${esc(m.text)}</p></div>`).join('')}</div>
<div class="inbox chat-in"><label class="sr" for="chat-in">Message Bun</label><textarea id="chat-in" rows="2" maxlength="1200" placeholder="Tell Bun what happened…"></textarea><div class="inrow">${micBtn('chat-in')}<button class="btn primary" type="button" data-act="chat-send">Send</button></div></div>
${msgs.length ? '<button class="link sm" type="button" data-act="chat-clear">Start a fresh chat</button>' : ''}`, mount() { const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight; } };
};
async function chatSend() {
  const w = S.chatAs || 'A', box = $('#chat-in'); const text = box.value.trim(); if (!text) return;
  const list = S.chat[w] || (S.chat[w] = []);
  list.push({ from: w, text: text.slice(0, 1200) }); box.value = ''; save(); render();
  const th = $('#thread'); th.insertAdjacentHTML('beforeend', `<div class="m bun" id="typing">${bun(30)}<p class="typing"><i></i><i></i><i></i></p></div>`); th.scrollTop = th.scrollHeight;
  const r = await X.coach({ mode: 'app', me: w, names: C.aiNames(S), extra: { memory: S.paid ? C.memoryText(S) : '' }, messages: list.slice(-20).map(m => ({ from: m.from === 'bun' ? 'bun' : w, text: m.text })) }, d => { const p = $('#typing p'); if (p) { p.classList.remove('typing'); p.textContent = d.replace(/^\s*\[\[(SAFETY|PASS)\]\]\s*/, ''); } });
  if (r.safety) list.push({ from: 'bun', text: X.SAFETY_TEXT, safety: true });
  else list.push({ from: 'bun', text: r.text && !r.error ? r.text : X.errorLine(r) });
  save(); if (CUR === 'bun') { render(); if (!r.safety) V.speak(list[list.length - 1].text); }
}

R.history = id => {
  if (id) { const e = S.fights.find(x => x.id === id); if (!e) return R.history(''); return { tabs: true, html: `<div class="topbar"><button class="pill" type="button" data-go="history">‹ History</button></div><h1 class="h2">Fight details</h1>${fightCard(e, true)}<button class="link" type="button" data-act="fight-del" data-id="${e.id}">Delete this entry</button>` }; }
  const sealed = S.fights.filter(f => f.sealed).length;
  return { tabs: true, html: `
<h1 class="h2">History</h1>
${S.fights.length ? `<p class="muted">${S.fights.length} fight${S.fights.length > 1 ? 's' : ''} · ${sealed} sealed · ${S.agreements.length} agreement${S.agreements.length === 1 ? '' : 's'}</p>
<ul class="hist">${S.fights.map(e => `<li><a href="#/history/${e.id}"><b>${esc(e.topic || (e.sealed ? 'A fight, sealed' : e.id === S.cur?.id ? 'In progress' : 'Calmed down, not sealed'))}</b><span>${X.fmtDay(e.start)} · ${e.sealed ? 'Sealed' : 'Stage ' + (e.stage || 1)}${e.agreement ? ' · ' + esc(e.agreement) : ''}</span></a></li>`).join('')}</ul>` : `${say('Nothing here yet. When you use fight mode, each fight shows up here: how you calmed down, what you agreed, what helped. Only real use, nothing made up.')}`}` };
};

R.settings = () => ({ tabs: true, html: `
<div class="topbar"><button class="pill" type="button" data-go="home">‹ Home</button></div>
<h1 class="h2">Settings</h1>
<section class="card"><h2>You two</h2><p>${C.hasNames(S) ? `${N('A')} & ${N('B')}` : 'Names not set'}</p><button class="btn ghost sm" type="button" data-go="setup">Edit names</button></section>
<section class="card"><h2>Bun’s voice</h2><p class="muted">${V.ok ? 'Bun reads lines out loud with your phone’s built-in voice.' : 'This browser can’t speak. Bun’s lines show as captions.'} ${V.canListen ? 'You can answer by voice: tap Talk.' : 'Voice answers aren’t supported in this browser, so type instead.'}</p>${voiceBtn()}</section>
<section class="card"><h2>Make Pause one tap away</h2><p class="muted">On iPhone: open this page in Safari, tap Share, then <b>Add to Home Screen</b>. Simmer then opens straight to “fight or chill?”. A lock-screen widget and “Hey Siri, start Simmer” need the native app.</p></section>
<section class="card"><h2>Simmer Together</h2><p class="muted">${S.paid ? 'On (free trial in this prototype, no payment taken). Bun remembers your agreements and what helped.' : 'Bun remembers your agreements and what helped last time. Fight mode stays free.'}</p>${S.paid ? '<button class="btn ghost sm" type="button" data-act="unpay">Turn off</button>' : '<button class="btn primary sm" type="button" data-go="together">See Simmer Together</button>'}</section>
<section class="card"><h2>Your data</h2><p class="muted">Everything is stored in this browser on this phone. Nothing is sent anywhere except the lines Bun needs to reply, which go to the AI model and aren’t stored by Simmer.</p><button class="btn ghost sm danger" type="button" data-act="wipe">Delete everything</button></section>
<section class="card"><h2>Important</h2><p class="muted">Simmer is coaching, not therapy, and not an emergency service. If you’re in danger, call 911. National Domestic Violence Hotline: <span class="nowrap">1-800-799-7233</span> (text START to 88788). 988 Suicide &amp; Crisis Lifeline: call or text 988.</p></section>
${DEV ? '<p class="fine">Dev: <a href="/demo/">old click-through demo</a> · <a href="/chat/">chat version</a></p>' : ''}` });

R.together = () => {
  const t = X.trialDates();
  return { html: `
<div class="topbar"><button class="pill" type="button" data-go="home">‹ Back</button></div>
<p class="eyebrow">Fight mode stays free, always</p>
<h1 class="h2">Simmer Together</h1>
<p class="lede">Bun is there at 11pm when the fight happens, free. Simmer Together adds Bun’s memory: it remembers your agreements and what helped last time, in fights and in chat, so the next one is shorter.</p>
<section class="card price"><p><b>$119.99 a year</b> (about $10 a month) or $14.99 a month. One subscription covers you both.</p><p class="muted">A whole year costs less than one couples counseling session ($141 to $175 without insurance*).</p></section>
<ol class="timeline"><li><b>Today</b>Everything unlocked for both of you. $0 today.</li><li><b>Day 5 · ${X.fmtDay(t.remind)}</b>We remind you the trial is ending.</li><li><b>Day 7 · ${X.fmtDay(t.charge)}</b>You’re charged $119.99 for the year unless you cancel before then. You cancel in your subscription settings (on iPhone: Settings › your name › Subscriptions).</li></ol>
<button class="btn primary big" type="button" data-act="trial">Start 7-day free trial</button>
<button class="btn ghost big" type="button" data-go="home">Not now, keep the free version</button>
<p class="fine">Free forever: all of fight mode (wind down, talk it through, seal it), plans, reminders, history and chatting with Bun.</p>
<p class="fine"><b>Prototype:</b> no account is created and no payment is taken. Simmer is relationship coaching, not therapy. *Average couples session without insurance: $141 (DatingNews survey, 2025), $152 (Synchrony cost study, 2025), about $175 (Real Cost Report, 2026).</p>` };
};

R.help = () => ({ cls: 'help', html: `
<div class="topbar"><button class="pill quick" type="button" data-act="quick-exit">Quick exit</button><button class="pill" type="button" data-act="safe-back">‹ Back to where I was</button></div>
<div class="hero">${bun(84, 'soft')}<h1 class="h2">This matters more than any fight.</h1>
<p class="lede">I’m pausing the coaching. You deserve to be safe. If you’re in danger right now, call 911. These lines are free, private, and open 24/7.</p></div>
${X.resourcesHTML()}
<div class="stack"><button class="btn ghost" type="button" data-act="safe-back">Back to where I was</button><button class="btn ghost" type="button" data-act="safe-bun">Talk to Bun privately</button></div>`, mount() { V.cancel(); } });

/* ---------------- actions ---------------- */
function fightNow() {
  // Pause always (re)starts at the wind-down: a new flare-up means calm bodies first. Resume keeps the stage.
  V.unlock(); C.startFight(S); Object.assign(S.cur, { spoke1: 0, stage: 1, ready: { A: false, B: false }, wt: null }); save(); go('f1');
}
const A = {
  'fight-now': fightNow,
  resume: () => { const st = S.cur?.stage || 1; go(st === 3 ? 'f3' : st === 2 ? 'f2' : 'f1'); },
  hear: () => V.speak(forkLine()),
  voice: () => { S.voice = !S.voice; if (!S.voice) V.cancel(); save(); $$('[data-act="voice"]').forEach(b => b.outerHTML = voiceBtn()); },
  'fork-listen': b => {
    if (V.listening) return V.stop();
    V.listen(t => { const l = b.querySelector('.ml'); if (l) l.textContent = `“${t}”`; }, (t, state) => {
      if (/fight|argu|mad|yell|angry|upset|heated/i.test(t)) fightNow();
      else if (/chill|explore|relax|hang|fine|nothing|calm/i.test(t)) go('home');
      else if (t) toast('Didn’t catch that. Tap a button instead.');
      else if (state && SimmerSpeech.NOTES[state]) toast(SimmerSpeech.NOTES[state]);
    }, false);
  },
  'skip-wind': () => { C.logStage(S, { wind: 'skip' }); S.cur.wind = 'skip'; go('f2'); },
  'solo-start': () => go('fsolo'),
  'solo-who': b => { S.cur.sp = { who: b.dataset.w, i: 0, ans: {} }; save(); render(); },
  'solo-hand': () => { S.cur.sp = { who: null, i: 0, ans: {} }; save(); render(); },
  'q-pick': b => {
    const P = S.cur.sp, q = C.QS[P.i]; const v = q.type === 'scale' ? +b.dataset.v : b.dataset.v;
    if (q.multi) { const arr = P.ans[q.k] || (P.ans[q.k] = []); const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); b.setAttribute('aria-pressed', String(i < 0)); save(); return; }
    P.ans[q.k] = v; P.i++; save(); render();
  },
  'q-next': () => { S.cur.sp.i++; save(); render(); },
  'solo-lock': () => {
    const P = S.cur.sp, w = P.who; S.cur.solo[w] = { plan: C.pickPlan(P.ans), mins: C.soloMins(P.ans) };
    S.cur.sp = { who: null, i: 0, ans: {} }; save(); // answers are dropped here; only the plan is kept
    go(S.cur.solo[C.other(w)] ? 'fwind/solo' : 'fsolo');
  },
  mins: b => { const W = S.cur.wt; if (W.running || W.left < W.mins * 60) return toast('Pause or finish this one first.'); W.mins = +b.dataset.m; W.left = W.mins * 60; save(); render(); },
  't-toggle': () => { const W = S.cur.wt, c = windCfg(W.k); W.running = !W.running; save(); $('#t-btn').textContent = W.running ? 'Pause timer' : 'Resume'; if (W.running) { if (W.left === W.mins * 60) bunSay(c.intro); runTimer(c); } else V.cancel(); },
  't-more': () => { const W = S.cur.wt; W.left += 300; save(); const el = $('#t-left'); if (el) el.textContent = fmt(W.left); toast('5 more minutes.'); },
  calmer: () => { S.cur.wt && (S.cur.wt.running = false); save(); go('fback'); },
  ready: b => { const rd = S.cur.ready; rd[b.dataset.w] = !rd[b.dataset.w]; save(); if (rd.A && rd.B) { V.speak('Nice. Both of you are back. Now let’s talk it through.'); setTimeout(() => go('f2'), 400); } else render(); },
  more5: () => { const k = S.cur.wind && S.cur.wind !== 'skip' ? S.cur.wind : 'sit'; if (S.cur.wt) { S.cur.wt.left = 300; S.cur.wt.running = true; } S.cur.ready = { A: false, B: false }; save(); go('fwind/' + k); },
  first: b => { const t = T(); t.speaker = b.dataset.w; t.phase = 'speak'; t.left = null; const s = C.nm(S, t.speaker), l = C.nm(S, C.other(t.speaker)); const line = `${s}, you go first. Tell ${l} what happened for you, starting with “I felt”. ${l}, just listen. No interrupting.`; t.msgs.push({ from: 'bun', text: line }); save(); render(); V.speak(line); },
  secs: b => { T().secs = +b.dataset.v; save(); render(); },
  submit: b => { const el = $('#' + b.dataset.target); V.stop(); const v = el.value; if (CUR === 'f2') talkSubmit(v); else if (CUR === 'fsolo') soloText(v); },
  mic: b => {
    const el = $('#' + b.dataset.target); if (!el) return;
    if (V.listening) return V.stop();
    el.blur(); // a focused field takes the mic on iPhone, so the recognizer hears nothing
    const base = el.value && el.value.trim() ? el.value.trim() + ' ' : '';
    V.listen(t => {
      if (!el.isConnected) return;
      el.value = base + t;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, () => {});
  },
  heard,
  notquite: () => { const t = T(); t.tries++; if (t.tries > 2) { const line = 'Close enough for tonight. You’re both trying, and that counts.'; t.msgs.push({ from: 'bun', text: line }); V.speak(line); return heard(); } t.phase = 'clarify'; const line = `Okay, ${C.nm(S, t.speaker)}. What part didn’t land? Say it in one line.`; t.msgs.push({ from: 'bun', text: line }); save(); render(); V.speak(line); },
  heat: () => { const t = T(); const line = C.scriptedTalk('heat', S, t.speaker); t.msgs.push({ from: 'bun', text: line }); save(); render(); V.speak(line); toast('Need longer? Tap Exit, then We’re in a fight to cool down again.', 4500); },
  'to-seal': () => go('f3'),
  repair: b => { sealForm(); const z = S.cur.seal || (S.cur.seal = {}); z.repair = b.dataset.v; z.repairDone = false; save(); render(); },
  'repair-done': () => { sealForm(); S.cur.seal.repairDone = true; save(); render(); },
  helped: b => { sealForm(); const z = S.cur.seal || (S.cur.seal = {}); const h = z.helped || (z.helped = []); const i = h.indexOf(b.dataset.v); i < 0 ? h.push(b.dataset.v) : h.splice(i, 1); b.setAttribute('aria-pressed', String(i < 0)); save(); },
  'pf-dismiss': () => { S.postFight = false; save(); render(); },
  'gift-yes': () => { toast('Opened in a new tab. No order is placed and nothing is charged by Simmer.'); },
  'gift-next': () => { S.giftIdx = (S.giftIdx + 1) % C.GIFTS.length; save(); render(); },
  'gift-remind': () => { const g = C.GIFTS[S.giftIdx % C.GIFTS.length]; const d = X.nextWeekday('Fri'); d.setHours(17, 0, 0, 0); if (d < Date.now()) d.setDate(d.getDate() + 7); C.addReminder(S, g.title, +d, 'gift'); save(); toast(`Reminder set for ${X.fmtDay(d)}, 5 PM.`); render(); },
  'rem-done': b => { const r = S.reminders.find(x => x.id === b.dataset.id); if (r) r.done = b.checked; save(); setTimeout(render, 250); },
  'rem-del': b => { S.reminders = S.reminders.filter(x => x.id !== b.dataset.id); save(); render(); },
  'rem-ics': b => { const r = S.reminders.find(x => x.id === b.dataset.id); if (!r) return; const url = URL.createObjectURL(new Blob([C.ics(r)], { type: 'text/calendar' })); const a = document.createElement('a'); a.href = url; a.download = 'simmer-reminder.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); },
  'ag-done': b => { const a = S.agreements.find(x => x.id === b.dataset.id); if (a) a.done = b.checked; save(); setTimeout(render, 250); },
  'ag-del': b => { S.agreements = S.agreements.filter(x => x.id !== b.dataset.id); save(); render(); },
  as: b => { S.chatAs = b.dataset.w; save(); render(); },
  'chat-send': chatSend,
  'chat-clear': () => { S.chat[S.chatAs || 'A'] = []; save(); render(); },
  'fight-del': b => { if (!confirm('Delete this entry?')) return; S.fights = S.fights.filter(x => x.id !== b.dataset.id); save(); go('history'); },
  trial: () => { S.paid = true; S.trialAt = Date.now(); S.postFight = false; save(); toast('Trial on. Prototype: no account, no payment taken.'); go('home'); },
  unpay: () => { S.paid = false; save(); render(); },
  wipe: () => { if (!confirm('Delete all of Simmer’s data on this phone? This can’t be undone.')) return; localStorage.removeItem(C.KEY); S = C.fresh(); save(); go('welcome'); },
  'quick-exit': () => { V.cancel(); location.replace('https://weather.com/'); },
  'safe-back': () => { const r = S.safeRet || 'fork'; S.safeRet = ''; save(); go(r); },
  'safe-bun': () => go('bun'),
};
function soloText(v) {
  v = String(v || '').trim(); if (!v) return toast('One line is enough.');
  if (flagged(v)) { return safetyHit('fsolo'); } // not kept
  const P = S.cur.sp; P.ans.what = v.slice(0, 300); P.i++; save(); render();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const fn = A[a.dataset.act]; if (!fn) return;
  if (a.tagName !== 'A' && a.type !== 'checkbox') e.preventDefault();
  fn(a, e);
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'f-setup') {
    const A1 = f.A.value.trim(), B1 = f.B.value.trim(); if (!A1 || !B1) return;
    S.names = { A: A1.slice(0, 24), B: B1.slice(0, 24) }; S.voice = f.voice.checked; S.consent = f.consent.checked; if (!S.created) S.created = Date.now(); save();
    go(S.cur && !S.cur.sealedAt ? 'f1' : 'fork'); return;
  }
  if (f.id === 'f-seal') {
    sealForm(); const z = S.cur.seal || {};
    const agreement = (z.agreement || '').trim(), topic = (z.topic || '').trim();
    if (flagged(agreement) || flagged(topic) || flagged(z.repairOther || '')) return safetyHit('f3');
    const e2 = C.sealFight(S, { agreement, topic, repair: z.repair === 'Something else' ? (z.repairOther || 'Something else') : (z.repair || ''), repairDone: z.repairDone, helped: z.helped || [], remindDays: agreement ? z.remind : 0 });
    save(); V.speak('Sealed. It’s in your history. Go enjoy the rest of your night.'); go('fdone/' + e2.id); return;
  }
  if (f.id === 'f-ag') { const v = $('#ag-in').value.trim(); if (!v) return; if (flagged(v)) return safetyHit('plans'); S.agreements.unshift({ id: C.uid(), text: v.slice(0, 160), at: Date.now(), fightId: null, done: false }); save(); render(); return; }
  if (f.id === 'f-rem') { const v = f.text.value.trim(); if (!v) return; if (flagged(v)) return safetyHit('plans'); const due = new Date(`${f.day.value}T${f.time.value || '18:00'}`); C.addReminder(S, v, +due || Date.now() + 864e5); save(); toast(`Reminder added for ${C.dueLabel(+due)}.`); render(); return; }
});
// Enter sends in the chat box; Shift+Enter for a new line.
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chat-in') { e.preventDefault(); chatSend(); } });
document.addEventListener('input', e => { if (e.target.closest('#f-seal')) sealForm(); });

/* ---------------- boot ---------------- */
if (params.get('pause') === '1') { history.replaceState(null, '', '/app/#/pause'); }
else if (params.get('reset') === '1' && DEV) { localStorage.removeItem(C.KEY); S = C.fresh(); history.replaceState(null, '', '/app/' + (DEV ? '?dev=1' : '')); }
// Every fresh open lands on the fork (the call: "whenever we open the app, it's literally one of the two").
if (!location.hash || location.hash === '#/' || params.get('pause') !== '1' && !sessionStorage.getItem('simmer-open')) { sessionStorage.setItem('simmer-open', '1'); if (params.get('pause') !== '1') history.replaceState(null, '', location.pathname + location.search + (S.consent ? '#/fork' : '#/welcome')); }
render();
window.__simmer = { get S() { return S; }, go };
})();
