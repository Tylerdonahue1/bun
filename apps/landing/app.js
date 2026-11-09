import { QUESTIONS, TYPES, score } from '/lib/quiz.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const track = (name, data) => { try { window.va && window.va('event', { name, data }); } catch {} };

function bun(size = 96, mood = 'happy') {
  const eyes = { happy: '<path d="M40 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>', soft: '<circle cx="46" cy="57" r="4.5" fill="#2B1A12"/><circle cx="74" cy="57" r="4.5" fill="#2B1A12"/>' }[mood] || '';
  const mouth = mood === 'soft' ? '<path d="M54 70 q6 4 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>' : '<path d="M52 68 q8 8 16 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>';
  return `<svg width="${size}" height="${Math.round(size * .88)}" viewBox="0 -6 120 106" aria-hidden="true"><path d="M10 66 C10 32 32 12 60 12 C88 12 110 32 110 66 C110 84 92 92 60 92 C28 92 10 84 10 66Z" fill="#F6C453" stroke="#2B1A12" stroke-width="4"/><path d="M50 14 q8 -12 18 -4" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><ellipse cx="36" cy="34" rx="10" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 36 34)"/><ellipse cx="32" cy="70" rx="8" ry="5" fill="#F08C70" opacity=".8"/><ellipse cx="88" cy="70" rx="8" ry="5" fill="#F08C70" opacity=".8"/>${eyes}${mouth}</svg>`;
}
const paintBuns = (root = document) => root.querySelectorAll('[data-bun]').forEach(el => { el.innerHTML = bun(+el.dataset.bun, el.dataset.mood || 'happy'); });

const params = new URLSearchParams(location.search);
const utm = Object.fromEntries([...params].filter(([k]) => k.startsWith('utm_')));
const ref = TYPES[params.get('r')] ? params.get('r') : null;
const t0 = Date.now();
const state = { i: 0, answers: {}, joined: false };
const views = ['landing', 'quiz', 'lead', 'result', 'safety'];
function show(id, push = true) {
  views.forEach(v => { $('#' + v).hidden = v !== id; });
  $('.nav [data-start]').hidden = id !== 'landing';
  if (push && history.state?.v !== id) history.pushState({ v: id, i: state.i }, '', id === 'landing' ? location.pathname + location.search : '#' + id);
  window.scrollTo(0, 0);
}
addEventListener('popstate', e => {
  const v = e.state?.v || 'landing';
  if (v === 'quiz') { state.i = e.state.i || 0; renderQ(); }
  show(v, false);
});

function start() { state.i = 0; state.answers = {}; renderQ(); show('quiz'); track('quiz_start', { ref: ref || 'none' }); }
document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', start));

function renderQ() {
  const q = QUESTIONS[state.i]; const n = QUESTIONS.length;
  $('#bar').style.width = `${(state.i / n) * 100}%`; $('.bar').setAttribute('aria-valuenow', state.i);
  $('#count').textContent = `${state.i + 1}/${n}`;
  $('#qbody').innerHTML = `<div class="enter"><h2 class="q">${esc(q.q)}</h2><p class="qsub">${esc(q.sub || '')}</p><div class="opts" role="list">${q.opts.map(o => `<button class="opt${state.answers[q.id] === o.id ? ' sel' : ''}" data-o="${o.id}" role="listitem"><span class="e" aria-hidden="true">${o.e}</span><span><b>${esc(o.t)}</b>${o.d ? `<small>${esc(o.d)}</small>` : ''}</span></button>`).join('')}</div></div>`;
  $('#qbody').focus({ preventScroll: true });
}
$('#qbody').addEventListener('click', e => {
  const b = e.target.closest('.opt'); if (!b || state.busy) return;
  const q = QUESTIONS[state.i]; const o = q.opts.find(x => x.id === b.dataset.o);
  state.answers[q.id] = o.id; b.classList.add('sel'); state.busy = true;
  setTimeout(() => {
    state.busy = false;
    if (o.unsafe) { delete state.answers[q.id]; track('quiz_safety'); show('safety'); return; }
    if (state.i < QUESTIONS.length - 1) { state.i++; renderQ(); history.pushState({ v: 'quiz', i: state.i }, '', '#quiz'); window.scrollTo(0, 0); }
    else { $('#bar').style.width = '100%'; track('quiz_done'); show('lead'); }
  }, 230);
});
$('#back').addEventListener('click', () => history.back());

// lead form
$('#lead-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target; const err = $('#lead-err'); err.hidden = true;
  const email = f.email.value.trim();
  const fail = m => { err.textContent = m; err.hidden = false; };
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) { f.email.focus(); return fail('That email doesn’t look quite right.'); }
  if (!f.consent.checked) return fail('Tick the box so we’re allowed to email you. Or skip and just see your result.');
  const btn = $('#lead-submit'); btn.disabled = true; btn.textContent = 'Simmering…';
  try {
    const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      email, firstName: f.firstName.value.trim(), partner: f.partner.value || '', consent: true, website: f.website.value,
      answers: state.answers, elapsedMs: Date.now() - t0, utm, ref, source: 'quiz' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again?');
    state.joined = true; state.name = f.firstName.value.trim(); track('lead_submit', { partner: f.partner.value || 'none' });
    renderResult(); show('result');
  } catch (ex) { fail(ex.message); }
  finally { btn.disabled = false; btn.textContent = 'Join & show our type'; }
});
$('#skip-lead').addEventListener('click', () => { track('lead_skip'); renderResult(); show('result'); });

function renderResult() {
  const s = score(state.answers); const T = TYPES[s.type];
  const hi = state.name ? `${esc(state.name)}, you two are…` : 'You two are…';
  $('#result').innerHTML = `
  <section class="card res"><p class="eyebrow">${hi}</p><div class="em" aria-hidden="true">${T.emoji}</div><h2>${esc(T.name)}</h2><p class="tag">${esc(T.tag)}</p></section>
  <section class="card res-sec"><h3>What Bun noticed</h3><p>${esc(T.insight)}</p></section>
  <section class="card res-sec"><h3>How Bun would help</h3><p>${esc(T.bun)}</p></section>
  <section class="card res-sec tonight"><h3>Try this tonight</h3><p>${esc(T.tonight)}</p></section>
  ${state.joined ? `<div class="say"><span data-bun="54"></span><p class="bubble">You’re on the early-access list. I’ll come find you when I’m ready. 🫶</p></div>` : `<button class="btn big fight" id="res-join">Get early access to Bun</button>`}
  <div class="row"><button class="btn" id="share">Share our type</button><button class="btn ghost" id="retake">Retake</button></div>
  <p class="fine center-t">Sharing sends only your type, never your answers. This quiz is just for fun: it isn’t a diagnosis, and no type is better than another.</p>
  <a class="link center-self" href="/app/">Peek at the prototype →</a>`;
  paintBuns($('#result'));
  $('#share').onclick = () => shareType(s.type);
  $('#retake').onclick = start;
  const j = $('#res-join'); if (j) j.onclick = () => show('lead');
}

async function shareType(type) {
  const url = `${location.origin}/?r=${type}`; const T = TYPES[type];
  const text = `We’re ${T.name} ${T.emoji} What kind of fighters are you two?`;
  track('share', { type });
  if (navigator.share) { try { await navigator.share({ title: 'Bun', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Link copied'); } catch { prompt('Copy this link:', url); }
}
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }

$('#safety-home').addEventListener('click', () => { history.replaceState({ v: 'landing' }, '', location.pathname); show('landing', false); });

// boot
paintBuns();
if (ref) { const T = TYPES[ref]; const el = $('#shared-banner'); el.innerHTML = `Someone shared their result: they’re <b>${esc(T.name)}</b> ${T.emoji}<br>Your turn. What kind of fighters are you two?`; el.hidden = false; }
history.replaceState({ v: 'landing' }, '', location.pathname + location.search);
show('landing', false);
