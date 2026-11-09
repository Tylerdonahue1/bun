/* Simmer chat version: live AI coach Bun in a couple's group chat. Apart (shared room), Together (one phone), Solo (private 1:1).
   No accounts. Page views use Vercel Web Analytics. Messages in Apart rooms live in a temporary server room (24h); Solo threads stay in this browser. */
(() => {
'use strict';
const { coach, errorLine, SAFETY_RE, HARSH_RE, resourcesHTML, switcherHTML, uid, reduced, md, plain } = window.Simmer;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = s => md(s).replace(/(^|\s|<br>)(\/[a-z]+)/g, '$1<span class="cmd">$2</span>').replace(/@bun/gi, '<b>@Bun</b>');
const other = w => w === 'A' ? 'B' : 'A';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function bun(size = 40, mood = 'happy', fill) {
  const k = '#2B1A12';
  const eyes = {
    happy:`<path d="M40 58 q6 -7 12 0" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/><path d="M68 58 q6 -7 12 0" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/>`,
    talk:`<circle cx="46" cy="56" r="4.5" fill="${k}"/><circle cx="74" cy="56" r="4.5" fill="${k}"/>`,
    calm:`<path d="M40 57 q6 5 12 0" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/><path d="M68 57 q6 5 12 0" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/>`,
    soft:`<circle cx="46" cy="57" r="4" fill="${k}"/><circle cx="74" cy="57" r="4" fill="${k}"/>`,
  }[mood] || '';
  const mouth = mood === 'talk' ? `<ellipse cx="60" cy="70" rx="6" ry="4.5" fill="${k}"/>` : `<path d="M52 68 q8 8 16 0" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/>`;
  return `<svg class="bun" width="${size}" height="${size * .84}" viewBox="0 -6 120 106" aria-hidden="true"${fill ? ` style="--bun-fill:${fill}"` : ''}>
  <path class="body" d="M10 66 C10 32 32 12 60 12 C88 12 110 32 110 66 C110 84 92 92 60 92 C28 92 10 84 10 66Z"/>
  <path d="M50 14 q8 -12 18 -4" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/>
  <ellipse class="shine" cx="36" cy="34" rx="10" ry="5" transform="rotate(-25 36 34)"/>
  <ellipse class="cheek" cx="32" cy="70" rx="8" ry="5"/><ellipse class="cheek" cx="88" cy="70" rx="8" ry="5"/>${eyes}${mouth}</svg>`;
}

/* ---------- state ---------- */
const DUO = new URLSearchParams(location.search).get('duo') === '1';
const LS = 'simmer-live-chat' + (DUO ? '-duo-' + (new URLSearchParams(location.search).get('as') === 'B' ? 'B' : 'A') : '');
const saved = (() => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } })();
const S = Object.assign({ view:'landing', names:{A:'Sam', B:'Alex'}, me:'A', room:null, msgs:[], seq:0, typing:{}, joined:{}, solo:{A:[], B:[]}, flagged:{A:false, B:false}, bunMode:'auto', store:'' }, saved, { view:'landing', msgs:[], seq:0, typing:{} });
if (!saved.names) { try { const p = JSON.parse(localStorage.getItem('simmer-profile') || 'null'); if (p?.name) S.names = { A:String(p.name).slice(0, 30), B:String(p.partner || 'Alex').slice(0, 30) }; } catch {} }
const N = w => w === 'bun' ? 'Bun' : (S.names[w] || (w === 'A' ? 'Sam' : 'Alex'));
const persist = () => { try { localStorage.setItem(LS, JSON.stringify({ names:S.names, me:S.me, room:S.room, solo:S.solo, flagged:S.flagged, bunMode:S.bunMode })); } catch {} };
const L = { streaming:null, coachTimer:null, poll:null, rendered:new Set(), lastBreakSuggest:0, flagConfirm:false, ticking:null, soft:null };

const av = w => w === 'bun' ? `<span class="av bun" aria-hidden="true">${bun(26, 'happy')}</span>` : `<span class="av ${w}" aria-hidden="true">${esc(N(w)[0] || '?')}</span>`;
let toastT;
function toast(msg, undo) {
  const el = $('#toast'); clearTimeout(toastT);
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" id="undo">Undo</button>' : ''}`; el.classList.add('on');
  if (undo) $('#undo').onclick = () => { undo(); el.classList.remove('on'); };
  toastT = setTimeout(() => el.classList.remove('on'), undo ? 6000 : 3200);
}

/* ---------- room API ---------- */
async function roomGet() {
  if (!S.room) return;
  try {
    const r = await fetch(`/api/room?id=${S.room}&since=${S.seq}`, { cache:'no-store' }); const j = await r.json();
    if (!j.exists) { // server lost the room (cold start): re-seed from what this device knows
      if (S.msgs.length) await roomPost({ op:'seed', names:S.names, msgs:S.msgs.filter(m => !m.local && !m.pending).map(({seq, ...m}) => m), as:S.me });
      return;
    }
    absorb(j);
  } catch {}
}
async function roomPost(body) {
  try {
    const r = await fetch('/api/room', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ id:S.room, since:S.seq, ...body }) });
    const j = await r.json(); if (j.exists !== false && j.msgs) absorb(j); return j;
  } catch { toast('Couldn’t reach the room. Check your connection.'); }
}
function absorb(j) {
  let changed = false;
  if (j.names) { S.names = { ...S.names, ...j.names }; }
  S.joined = j.joined || S.joined; S.typing = j.typing || {}; S.store = j.store || S.store;
  for (const m of j.msgs || []) {
    const i = S.msgs.findIndex(x => x.cid === m.cid);
    if (i >= 0) S.msgs[i] = m; else S.msgs.push(m);
    S.seq = Math.max(S.seq, m.seq); changed = true;
  }
  S.msgs.sort((a, b) => a.seq - b.seq);
  if (S.view === 'apart') { if (changed) renderThread(); else renderTyping(); renderHead(); }
}
function startPoll() { stopPoll(); L.poll = setInterval(() => { if (document.visibilityState === 'visible' && S.room) roomGet(); }, 1500); }
function stopPoll() { clearInterval(L.poll); L.poll = null; }
const newRoomId = () => Math.random().toString(36).slice(2, 8);
const inviteUrl = () => `${location.origin}/chat/?room=${S.room}&as=${other(S.me)}`;

/* ---------- views ---------- */
function render() {
  if (DUO) document.body.classList.add('duo');
  $('#vswitch').innerHTML = switcherHTML('chat');
  $('#quick-exit').hidden = !S.flagged[S.me];
  panelInfo(); if (L.ai) $('#ai-status').textContent = window.Simmer.aiLine(L.ai);
  if (S.view === 'landing') { $('#app').innerHTML = landing(); return; }
  if (S.view === 'apart' || S.view === 'solo') {
    $('#app').innerHTML = shell();
    L.rendered = new Set();
    renderHead(); renderThread(true); renderComposerExtras();
  }
}
function panelInfo() {
  $('#panel-info').innerHTML = `<p class="panel-note" style="font-size:15px">Live prototype. Bun’s replies come from a real AI model, streamed in. Nothing here signs you up, charges you, or messages anyone.</p><p class="hint" id="ai-status"></p>
  <div class="ctl"><h3>Try it</h3><ol>
  <li><button data-act="go" data-v="apart"><span class="n">1</span>Apart: shared room, two phones</button></li>
  <li><button data-act="go" data-v="together"><span class="n">2</span>Together: one phone on the table</button></li>
  <li><button data-act="go" data-v="solo"><span class="n">3</span>Solo: just you and Bun</button></li></ol>
  ${''}${S.room ? `<p class="hint">Room <b>${esc(S.room)}</b>. Open <a href="${esc(inviteUrl())}" target="_blank" rel="noopener">${esc(N(other(S.me)))}’s link</a> in another tab or phone to chat as both.</p>` : ''}
  <p class="hint">Type <b>/heated</b> for a 20-minute break card, <b>@Bun</b> to ask Bun directly, or write “you always…” to see the draft check.</p></div>`;
}
window.Simmer.aiStatus.then(st => { L.ai = st; const el = $('#ai-status'); if (el) el.textContent = window.Simmer.aiLine(st); });
function landing() {
  return `<div class="landing enter"><div class="brand">${bun(34)} Simmer</div>
  <h1 class="h1" id="h" tabindex="-1">Bun, live in your chat.</h1>
  <p class="lede">A warm coach that helps you two stop having the same fight. It never picks a side.</p>
  <div class="card" style="max-width:none;box-shadow:none;margin-bottom:14px"><h4>Who’s here</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <label><span class="small">You</span><input class="input" id="nmA" value="${esc(S.names.A)}" maxlength="30"></label>
    <label><span class="small">Your partner</span><input class="input" id="nmB" value="${esc(S.names.B)}" maxlength="30"></label></div></div>
  <h2 class="h2">Pick a mode</h2>
  <div class="channels">
    <button class="channel" data-act="go" data-v="apart"><span><b>Apart</b><span class="small" style="display:block">Group chat with Bun. Each of you on your own phone, via a room link.</span></span><span class="concept">Live</span></button>
    <button class="channel" data-act="go" data-v="together"><span><b>Together</b><span class="small" style="display:block">One phone on the table. Bun runs turns and timers.</span></span><span class="concept">Live</span></button>
    <button class="channel" data-act="go" data-v="solo"><span><b>Solo</b><span class="small" style="display:block">Just you and Bun. Vent, or prep for a hard talk.</span></span><span class="concept">Live</span></button>
  </div>
  <div class="promise" style="margin-top:16px"><p>What you tell Bun privately is never posted to the group.</p><p>Bun never says who’s right.</p><p>Coaching, not therapy. If anything sounds unsafe, Bun stops and shares real help.</p></div>
  <p class="small" style="text-align:center;margin-top:10px">Prototype: no accounts. Apart rooms are temporary and expire after a day.</p></div>`;
}
function shell() {
  return `<header class="chat-head" id="chat-head"></header><div class="threads" id="threads" role="group" aria-label="Mode"></div><div id="banner"></div>
  <div class="thread" id="thread" role="log" aria-label="Messages" aria-live="polite"></div>
  <div id="flag"></div><div class="slash" id="slash"></div>
  <form class="composer" id="composer" autocomplete="off"><button type="button" class="icon-btn" data-act="bunmode" aria-label="Bun reply setting" title="When Bun replies"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
  <label class="sr" for="msg">Message</label><input class="input" id="msg" maxlength="1500" placeholder="${S.view === 'solo' ? 'Tell Bun what happened…' : 'Message, @Bun, or /heated'}">
  <button class="send" type="submit" aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2-6z" fill="currentColor"/></svg></button></form>`;
}
function renderHead() {
  const h = $('#chat-head'); if (!h) return;
  const solo = S.view === 'solo', o = other(S.me);
  const partnerHere = S.joined?.[o] && Date.now() - S.joined[o] < 864e5;
  h.innerHTML = `<button class="icon-btn" data-act="home" aria-label="Back to start"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="head-mid"><span class="avs">${solo ? av('bun') : av('A') + av('B') + av('bun')}</span><div class="head-t"><b>${solo ? 'Bun' : 'Us'}</b><span>${solo ? `Private · ${esc(N(o))} can’t see this` : `${esc(N('A'))}, ${esc(N('B'))} & Bun (AI)${S.bunMode === 'tag' ? ' · Bun: @ only' : ''}`}</span></div></div>
    <button class="as-pill p${S.me}" data-act="swap" aria-label="You are ${esc(N(S.me))}. Switch to ${esc(N(o))} on this device">As ${esc(N(S.me))} ⇄</button>`;
  $('#threads').innerHTML = `<button type="button" data-act="go" data-v="apart" aria-pressed="${!solo}"><b>Apart</b><small>group chat</small></button><button type="button" data-act="go" data-v="together" aria-pressed="false"><b>Together</b><small>one phone</small></button><button type="button" data-act="go" data-v="solo" aria-pressed="${solo}"><b>Solo</b><small>private 1:1</small></button>`;
  let banner = '';
  if (solo) banner = `<div class="private-banner"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>Only you and Bun. Never posted to the group.</div>`;
  else if (!partnerHere) banner = `<div class="invite-bar"><span>${esc(N(o))} isn’t in the room yet.</span><button type="button" data-act="copy-invite">Copy ${esc(N(o))}’s link</button>${DUO ? '' : `<a href="${esc(inviteUrl())}" target="_blank" rel="noopener">Open as ${esc(N(o))}</a><a href="/chat/duo.html?room=${encodeURIComponent(S.room)}">See both phones</a>`}</div>`;
  $('#banner').innerHTML = banner;
}
function list() { return S.view === 'solo' ? S.solo[S.me] : S.msgs; }
function msgHTML(m, prev) {
  if (m.from === 'sys') return `<p class="sys">${esc(m.text)}</p>`;
  const mine = m.from === S.me;
  const cls = mine ? 'me' : m.from === 'bun' ? 'them bun' : 'them';
  const cont = prev && prev.from === m.from && !m.kind?.startsWith('card') && prev.kind === 'text' ? ' cont' : '';
  const body = m.kind && m.kind !== 'text' ? cardHTML(m) : `<div class="b">${fmt(m.text)}${m.data?.why ? `<span class="why"><b>Why:</b> ${esc(m.data.why)}</span>` : ''}</div>`;
  const fresh = !L.rendered.has(m.cid); L.rendered.add(m.cid);
  return `<div class="m ${cls} p${m.from}${cont}${m.kind && m.kind !== 'text' ? ' wide' : ''}${fresh ? ' grow' : ''}" data-cid="${esc(m.cid)}">${av(m.from)}<div><p class="who ${m.from === 'bun' ? 'bunname' : ''}">${esc(N(m.from))}${m.from === 'bun' ? (m.data?.scripted ? ' · scripted' : ' · AI') : ''}</p>${body}${mine && S.view === 'apart' && m.kind === 'text' ? `<p class="meta">${m.pending ? 'Sending…' : 'Sent'}</p>` : ''}</div></div>`;
}
function cardHTML(m) {
  const d = m.data || {};
  if (m.kind === 'safety') return `<div class="card private" style="max-width:320px"><h4>Pausing the coaching</h4><p style="margin:0 0 6px">${esc(m.text)}</p>${resourcesHTML()}</div>`;
  if (m.kind === 'break') {
    const left = Math.max(0, Math.round((d.ends - Date.now()) / 1000));
    const ans = d.answers || {}; const mineAns = ans[S.me];
    return `<div class="card cool" data-ends="${d.ends}"><h4>20-minute break</h4><p class="timer tnum" data-timer="${d.ends}">${mmss(left)}</p>
      <p class="small" style="margin:0 0 8px">${left ? 'Step apart, not away. Bodies need about 20 minutes to settle.' : 'Break’s over. Ready to try again, softer?'}</p>
      ${['A','B'].map(w => ans[w] ? `<p class="record r${w}">${esc(N(w))} chose: ${esc(ans[w])}</p>` : '').join('')}
      ${!mineAns && S.view === 'apart' ? `<div class="stack"><button class="btn light sm" data-act="break-ans" data-cid="${esc(m.cid)}" data-v="stepping away">I’m stepping away</button><button class="btn light sm" data-act="break-ans" data-cid="${esc(m.cid)}" data-v="needs a minute first">I need a minute first</button></div>` : ''}
      ${!left ? `<button class="btn sm" data-act="go-soft">Help me start softer (private)</button>` : ''}
      <span class="why" style="color:#BFDCD6;border-color:rgba(255,255,255,.25)"><b style="color:#fff">Why:</b> when your heart rate is up, nobody can really hear anybody.</span></div>`;
  }
  if (m.kind === 'suggest') {
    const ans = d.answers || {};
    const done = ans.A || ans.B;
    return `<div class="card"><h4>Bun suggests</h4><p class="say">Take a 20-minute break?</p>
      ${['A','B'].map(w => ans[w] ? `<p class="record r${w}">${esc(N(w))} chose: ${esc(ans[w])}</p>` : '').join('')}
      ${!ans[S.me] ? `<div class="stack"><button class="btn cool sm" data-act="suggest-ans" data-cid="${esc(m.cid)}" data-v="take a break">Yes, take 20</button><button class="btn light sm" data-act="suggest-ans" data-cid="${esc(m.cid)}" data-v="keep talking">We’re okay, keep going</button></div>` : ''}
      <span class="why"><b>Why:</b> things got sharp${done ? '' : ', and a pause now saves the next hour'}.</span></div>`;
  }
  if (m.kind === 'soft') {
    return `<div class="card butter private"><h4>Softer version · only you see this</h4>${d.text ? `<p class="say ss">${esc(d.text)}</p>` : `<div class="skel" aria-label="Bun is rewriting"><i></i><i></i><i></i></div>`}
      ${d.chose ? `<p class="record r${S.me}">You chose: ${esc(d.chose)}</p>` : d.text ? `<div class="stack"><button class="btn ink sm" data-act="soft-use" data-cid="${esc(m.cid)}">Use this</button><button class="btn light sm" data-act="soft-mine" data-cid="${esc(m.cid)}">Keep mine</button></div>` : ''}
      ${d.why ? `<span class="why"><b>Why:</b> ${esc(d.why)}</span>` : ''}</div>`;
  }
  return `<div class="b">${fmt(m.text)}</div>`;
}
function renderThread(toBottom) {
  const th = $('#thread'); if (!th) return;
  const atBottom = th.scrollHeight - th.scrollTop - th.clientHeight < 120;
  const items = list();
  let html = items.length ? '' : `<p class="sys">${S.view === 'solo' ? `Just you and Bun. What’s on your mind, ${esc(N(S.me))}?` : `This is your shared chat. Say hi, or start with what’s been going on.`}</p>`;
  items.forEach((m, i) => { html += msgHTML(m, items[i - 1]); });
  if (L.streaming && L.streaming.th === S.view) html += streamingHTML();
  html += '<div id="typing"></div>';
  th.innerHTML = html;
  renderTyping();
  if (toBottom || atBottom) th.scrollTop = th.scrollHeight;
  tickTimers();
}
function streamingHTML() {
  const s = L.streaming;
  return `<div class="m them bun pbun grow" id="stream">${av('bun')}<div><p class="who bunname">Bun · AI</p>${s.text ? `<div class="b" id="stream-b">${fmt(s.text)}</div>` : `<p class="status-line" style="margin-left:0"><span class="pulse"></span>${esc(s.status)}</p>`}</div></div>`;
}
function paintStream() {
  const s = L.streaming; if (!s || s.th !== S.view) return;
  const el = $('#stream'); if (!el) { renderThread(true); return; }
  const th = $('#thread'); const atBottom = th.scrollHeight - th.scrollTop - th.clientHeight < 140;
  el.outerHTML = streamingHTML().replace(' grow', '');
  if (atBottom) th.scrollTop = th.scrollHeight;
}
function renderTyping() {
  const el = $('#typing'); if (!el || S.view !== 'apart') { if (el) el.innerHTML = ''; return; }
  const now = Date.now(); const t = S.typing || {};
  let h = '';
  if (t.bun && now - t.bun < 25000 && !L.streaming) h = `<p class="status-line"><span class="pulse"></span>Bun is reading both sides…</p>`;
  const o = other(S.me); if (t[o] && now - t[o] < 6000) h += `<div class="typing p${o}"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(N(o))} is typing…</span></div>`;
  el.innerHTML = h;
}
function renderComposerExtras() {
  const sl = $('#slash'); if (!sl) return;
  sl.innerHTML = S.view === 'apart'
    ? `<button type="button" class="tgchip" data-act="go" data-v="together">We’re together</button>` + ['/heated', '@Bun', '/repair'].map(c => `<button type="button" data-act="insert" data-v="${c}">${c}</button>`).join('')
    : ['I keep replaying it', 'Help me say it softer', 'Is this normal?'].map(c => `<button type="button" data-act="insert" data-v="${esc(c)}" style="font-family:var(--body)">${esc(c)}</button>`).join('');
  draftFlag();
}
function draftFlag() {
  const f = $('#flag'); const v = $('#msg')?.value || '';
  if (S.view === 'apart' && HARSH_RE.test(v)) {
    const word = (v.match(HARSH_RE) || [''])[0].toLowerCase();
    f.innerHTML = `<div class="draft-flag grow" role="status"><span>“${esc(word)}” tends to start the loop.${L.flagConfirm ? ' <b>Tap send again to send as is.</b>' : ''}</span><button type="button" data-act="soften">Soften it</button></div>`;
  } else { f.innerHTML = ''; L.flagConfirm = false; }
}

/* ---------- sending ---------- */
async function send(text) {
  text = text.trim(); if (!text) return;
  if (S.view === 'solo') return sendSolo(text);
  // Private safety screen: anything that sounds unsafe never goes to the group.
  if (SAFETY_RE.test(text)) {
    S.flagged[S.me] = true; persist();
    S.solo[S.me].push({ cid:uid(), from:S.me, text, kind:'text' });
    S.view = 'solo'; render();
    toast('Kept that private. Only you and Bun can see it.');
    return sendSolo(null);
  }
  const m = { cid:uid(), from:S.me, text, kind:'text' };
  S.msgs.push({ ...m, pending:true, seq:S.seq + 0.5 }); renderThread(true);
  await roomPost({ op:'post', msg:m });
  if (/^\/heated\b/i.test(text)) { await startBreak(); }
  const wantsBun = S.bunMode === 'auto' || /@bun|^\//i.test(text);
  if (wantsBun) { clearTimeout(L.coachTimer); L.coachTimer = setTimeout(() => coachGroup(text), 900); }
}
async function startBreak() {
  const card = { cid:uid(), from:'bun', text:'20-minute break', kind:'break', data:{ ends:Date.now() + 20 * 60e3, by:S.me, answers:{} } };
  S.msgs.push({ ...card, seq:S.seq + 0.5 }); renderThread(true); await roomPost({ op:'post', msg:card });
}
async function coachGroup(lastText) {
  if (L.streaming) return;
  const last = S.msgs[S.msgs.length - 1];
  if (last && last.from !== S.me && last.from !== 'bun') return; // the other device will ask Bun
  L.streaming = { th:'apart', status:'Bun is reading both sides…', text:'' }; renderThread(true);
  roomPost({ op:'typing', who:'bun', on:true });
  const history = S.msgs.filter(m => !m.local && (m.kind === 'text' || m.kind === 'break')).slice(-24).map(m => ({ from:m.from, text:m.kind === 'break' ? '(Bun started a 20-minute break card)' : m.text }));
  const r = await coach({ mode:'apart', names:S.names, me:S.me, messages:history }, t => { L.streaming.text = t; paintStream(); });
  L.streaming = null;
  if (r.error) { roomPost({ op:'typing', who:'bun', on:false }); renderThread(); toast(errorLine(r)); return; }
  if (r.pass || !r.text) { roomPost({ op:'typing', who:'bun', on:false }); renderThread(); return; }
  if (r.safety) { // never discuss a safety concern in the group: show help privately on this device only
    roomPost({ op:'typing', who:'bun', on:false });
    S.flagged[S.me] = true; S.solo[S.me].push({ cid:uid(), from:'bun', text:r.text, kind:'safety' }); persist();
    S.view = 'solo'; render(); toast('Bun moved this to your private space.'); return;
  }
  const m = { cid:uid(), from:'bun', text:r.text, kind:'text', data:r.scripted ? { scripted:true } : undefined };
  S.msgs.push({ ...m, seq:S.seq + 0.5 }); renderThread(true); await roomPost({ op:'post', msg:m });
  const heat = HARSH_RE.test(lastText) || (lastText.replace(/[^A-Z]/g, '').length > 12 && lastText === lastText.toUpperCase()) || /!{2,}/.test(lastText);
  const hasBreak = S.msgs.some(x => x.kind === 'break' && x.data?.ends > Date.now());
  if (heat && !hasBreak && Date.now() - L.lastBreakSuggest > 10 * 60e3 && !/^\/heated/i.test(lastText)) {
    L.lastBreakSuggest = Date.now();
    const c = { cid:uid(), from:'bun', text:'Take a 20-minute break?', kind:'suggest', data:{ answers:{} } };
    S.msgs.push({ ...c, seq:S.seq + 0.5 }); renderThread(true); await roomPost({ op:'post', msg:c });
  }
}
async function sendSolo(text) {
  const th = S.solo[S.me];
  if (text) {
    th.push({ cid:uid(), from:S.me, text, kind:'text' });
    if (SAFETY_RE.test(text)) { S.flagged[S.me] = true; }
    persist(); renderThread(true);
  }
  L.streaming = { th:'solo', status:S.msgs.length ? 'Bun is reading your note and the group chat…' : 'Bun is reading what you wrote…', text:'' }; renderThread(true);
  const groupContext = S.msgs.filter(m => m.kind === 'text' && !m.local).slice(-12).map(m => `[${N(m.from)}]: ${m.text}`).join('\n');
  const r = await coach({ mode:'solo', names:S.names, me:S.me, messages:th.filter(m => m.kind === 'text').slice(-24), extra:{ groupContext } }, t => { L.streaming.text = t; paintStream(); });
  L.streaming = null;
  if (r.error) { th.push({ cid:uid(), from:'sys', text:errorLine(r) }); }
  else if (r.safety) { S.flagged[S.me] = true; th.push({ cid:uid(), from:'bun', text:r.text, kind:'safety' }); }
  else th.push({ cid:uid(), from:'bun', text:r.text, kind:'text', data:r.scripted ? { scripted:true } : undefined });
  persist(); render();
}
async function soften() {
  const input = $('#msg'); const rough = input.value.trim(); if (!rough) return;
  const card = { cid:uid(), from:'bun', text:'', kind:'soft', data:{ rough }, local:true, seq:S.seq + 0.6 };
  L.soft = card; S.msgs.push(card); renderThread(true);
  let full = '';
  const r = await coach({ mode:'app', task:'soften', names:{ A:N(S.me), B:N(other(S.me)) }, me:'A', messages:[{ from:'A', text:rough }] }, t => { full = t; });
  if (r.error) { card.data.text = ''; S.msgs = S.msgs.filter(x => x !== card); renderThread(); toast(errorLine(r)); return; }
  if (r.safety) { S.msgs = S.msgs.filter(x => x !== card); input.value = ''; return send(rough); }
  const [line, ...rest] = r.text.split(/\n+Why:\s*/i);
  card.data.text = line.replace(/^["“]|["”]$/g, '').trim(); card.data.why = rest.join(' ').trim() || 'It names your feeling and a clear ask, so it’s easier to hear.';
  renderThread(true);
}

/* ---------- live timers on break cards ---------- */
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function tickTimers() { $$('[data-timer]').forEach(el => { const left = Math.max(0, Math.round((+el.dataset.timer - Date.now()) / 1000)); el.textContent = mmss(left); }); }
setInterval(() => { tickTimers(); renderTyping(); if (T.on) tickT(); }, 1000);

/* ---------- Together mode (one phone) ---------- */
const RING_C = 2 * Math.PI * 46;
const T = { on:false, screen:'home', speaker:'A', round:1, left:120, total:120, running:false, said:'', heard:'', cap:'', speaking:false, sound:false, log:[], tok:0 };
function enterTogether() { T.on = true; T.screen = 'home'; T.log = []; T.round = 1; T.speaker = S.me; $('#tm').hidden = false; renderT(); sayT(`Put one phone between you. I’ll keep time and keep it fair.`); }
function exitTogether() { T.on = false; T.running = false; T.tok++; if ('speechSynthesis' in window) speechSynthesis.cancel(); $('#tm').hidden = true; }
function sayT(text) { text = plain(text); T.cap = text; T.speaking = true; paintCap(); if (T.sound && 'speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = .95; u.onend = () => { T.speaking = false; paintCap(); }; speechSynthesis.speak(u); } else setTimeout(() => { T.speaking = false; paintCap(); }, Math.min(6000, 600 + text.split(' ').length * 260)); }
function paintCap() { $$('#tm .tm-cap').forEach(e => e.textContent = T.cap); $$('#tm .tm-wave').forEach(e => e.classList.toggle('on', T.speaking)); $$('#tm .tm-speaking').forEach(e => e.textContent = T.thinking ? 'Bun is listening back…' : T.speaking ? 'Bun is speaking' : 'Bun'); }
async function aiT(step, instruction, fallback) {
  const tok = ++T.tok; T.thinking = true; T.cap = ''; paintCap();
  const msgs = T.log.filter(l => !l.rec && l.from).map(l => ({ from:l.from, text:l.text }));
  if (!msgs.length) msgs.push({ from:'sys', text:'They just sat down together.' });
  const r = await coach({ mode:'together', names:S.names, me:T.speaker, messages:msgs, extra:{ step, instruction } }, t => { if (tok !== T.tok) return; T.thinking = false; T.cap = plain(t); T.speaking = true; paintCap(); });
  if (tok !== T.tok) return;
  T.thinking = false;
  if (r.safety) { T.screen = 'safety'; T.safetyText = r.text; renderT(); return; }
  sayT(r.error || !r.text ? fallback : r.text);
  T.log.push({ from:'bun', text:r.error || !r.text ? fallback : r.text });
}
function tickT() {
  if (T.screen === 'pause') { T.br = ((T.br || 0) + 1) % 10; $$('#tm .tm-cue').forEach(e => e.textContent = T.br < 4 ? 'Breathe in…' : T.br < 5 ? 'Hold…' : 'And out, slowly…'); }
  if (!T.running) return;
  T.left = Math.max(0, T.left - 1);
  $$('#tm .tm-ring .prog').forEach(c => c.style.strokeDashoffset = RING_C * (1 - T.left / T.total));
  $$('#tm .tm-time').forEach(e => e.textContent = mmss(T.left));
  if (!T.left) { T.running = false; if (T.screen === 'turn') { sayT(`Time. ${N(T.speaker)}, finish your sentence, then pass.`); renderT(); } else if (T.screen === 'pause') { T.screen = 'home'; renderT(); sayT('Welcome back. Ready when you are.'); } }
}
const ring = (inner, cls = '') => `<svg class="tm-ring ${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" class="trk"/><circle cx="50" cy="50" r="46" class="prog" style="stroke-dasharray:${RING_C};stroke-dashoffset:${RING_C * (1 - T.left / T.total)}"/></svg>${inner}`;
const BIGB = (tg, label, cls = '') => `<button type="button" class="tm-btn ${cls}" data-tg="${tg}">${label}</button>`;
function stage(size = 100, mood = 'talk', fill) {
  return `<div class="tm-stage"><div class="tm-bunrow">${bun(size, mood, fill)}<div class="tm-wave ${T.speaking ? 'on' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
  <p class="tm-speaking">${T.speaking ? 'Bun is speaking' : 'Bun'}</p><p class="tm-cap" aria-live="polite">${esc(T.cap)}</p></div>`;
}
const half = (w, inner) => `<section class="tm-half ${w === T.speaker ? 'near' : 'far'} p${w}" aria-label="${esc(N(w))}’s side">${inner}</section>`;
const midBar = () => `<div class="tm-mid"><div class="tm-wave sm ${T.speaking ? 'on' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p class="tm-cap" aria-live="polite">${esc(T.cap)}</p></div>`;
const split = (near, far) => half(other(T.speaker), far) + midBar() + half(T.speaker, near);
const mic = id => ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? `<button type="button" class="tm-icon" data-tg="mic" data-for="${id}" aria-label="Dictate">🎤</button>` : '';
const records = () => T.log.filter(l => l.rec).map(l => `<p class="record r${l.who}">${esc(l.text)}</p>`).join('');
function renderT() {
  const el = $('#tm'); if (!T.on) return;
  const sp = T.speaker, li = other(sp);
  const top = `<div class="tm-top"><div class="tm-modes" role="group" aria-label="Mode"><button type="button" data-tg="apart" aria-pressed="false">Apart</button><button type="button" aria-pressed="true">Together</button><button type="button" data-tg="solo" aria-pressed="false">Solo</button></div>
    <button type="button" class="tm-icon" data-tg="sound" aria-pressed="${T.sound}" aria-label="Bun’s voice ${T.sound ? 'on' : 'off'}">${T.sound ? '🔊' : '🔈'}</button><button type="button" class="tm-icon" data-tg="exit" aria-label="Leave Together mode">✕</button></div>`;
  let body = '', cls = '';
  if (T.screen === 'home') body = `${stage()}<div class="tm-actions">${BIGB('talk', 'Take turns talking<small>2 minutes each · Bun reflects</small>', 'pri')}${BIGB('hard', 'I need to say something hard<small>Write it privately first</small>')}${BIGB('pause', 'Take 20<small>A real break</small>', 'cool')}</div>${records() ? `<div class="tm-records">${records()}</div>` : ''}`;
  else if (T.screen === 'who') body = `${stage(80)}<div class="tm-actions">${BIGB('first-A', `${esc(N('A'))} talks first`, 'pri pA')}${BIGB('first-B', `${esc(N('B'))} talks first`, 'pri pB')}<button class="link sm" data-tg="home">Back</button></div>`;
  else if (T.screen === 'turn') { cls = 'split';
    const started = T.running || T.left < T.total;
    body = split(`<p class="tm-name">${esc(N(sp))} · talking</p>
      <button type="button" class="tm-token" data-tg="token" aria-label="${T.running ? 'Pause' : 'Start'} ${esc(N(sp))}’s 2 minutes">${ring(`<span class="tm-inner"><small>Your turn</small><b>${esc(N(sp))}</b><span class="tm-time tnum">${mmss(T.left)}</span><small>${T.running ? 'tap to pause' : started ? 'tap to resume' : 'tap to start'}</small></span>`)}</button>
      <div class="tm-jot"><label class="sr" for="said">What you said</label><textarea id="said" class="input" rows="2" placeholder="Say it out loud. Jot the gist so Bun can follow (optional)">${esc(T.said)}</textarea>${mic('said')}</div>
      ${BIGB('pass', `Done · pass to ${esc(N(li))}`, 'sm')}`,
      `<p class="tm-name">${esc(N(li))} · listening</p><p class="tm-big">Just listen.</p><p class="tm-hint">Then repeat back what you heard.</p>`); }
  else if (T.screen === 'reflect') { cls = 'split';
    body = half(sp, `<p class="tm-name">${esc(N(sp))}</p><p class="tm-big quiet">Just listen.</p>`) + midBar() + half(li, `<p class="tm-name">${esc(N(li))} · your turn to reflect</p><p class="tm-big">Repeat back what you heard.</p><p class="tm-hint">Start with “What I heard is…”</p>
      <div class="tm-jot"><textarea id="heard" class="input" rows="2" placeholder="Optional: type what you said back">${esc(T.heard)}</textarea>${mic('heard')}</div>${BIGB('reflected', 'Done', 'pri sm')}`); }
  else if (T.screen === 'land') { cls = 'split';
    body = half(li, `<p class="tm-name">${esc(N(li))}</p><p class="tm-big quiet">Waiting on ${esc(N(sp))}.</p>`) + midBar() + half(sp, `<p class="tm-name">${esc(N(sp))}</p><p class="tm-big">Did that land?</p><div class="tm-two">${BIGB('landed', '👍 It landed', 'pri sm')}${BIGB('again', 'Try again', 'sm')}</div>`); }
  else if (T.screen === 'pause') body = `<div class="tm-pause"><div class="tm-token calm tm-breathe" role="timer" aria-label="Break time left">${ring(`<span class="tm-inner"><span class="tm-time tnum">${mmss(T.left)}</span><small class="tm-cue" aria-live="off">Breathe in…</small></span>`, 'cool')}</div><p class="tm-hint" style="text-align:center;margin:4px 0 0">In for 4, hold 1, out for 5. Bodies need about 20 minutes to settle.</p>${stage(64, 'calm', '#9FD8CC')}
    <div class="tm-actions">${BIGB('pause-private', 'Continue privately on my phone')}<button class="link sm" data-tg="home">End the break early</button></div></div>`;
  else if (T.screen === 'hardwho') body = `${stage(80)}<div class="tm-actions">${BIGB('hard-A', `It’s me, ${esc(N('A'))}`, 'pri pA')}${BIGB('hard-B', `It’s me, ${esc(N('B'))}`, 'pri pB')}<button class="link sm" data-tg="home">Back</button></div>`;
  else if (T.screen === 'done') body = `${stage(110, 'happy')}${records() ? `<div class="tm-records">${records()}</div>` : ''}<div class="tm-actions">${S.room ? BIGB('recap', 'Post a recap to our chat', 'pri') : ''}${BIGB('talk', 'Another round')}${BIGB('home', 'Back to start', '')}</div>`;
  else if (T.screen === 'safety') body = `<div class="tm-safety">${bun(70, 'soft', '#F9D98A')}<p class="tm-line">${esc(T.safetyText || 'Let’s pause here.')}</p>${resourcesHTML()}${BIGB('exit', 'Leave Together mode')}</div>`;
  el.innerHTML = top + `<div class="tm-body ${cls} enter">${body}</div>`;
}
function startTurn() { T.screen = 'turn'; T.left = T.total = 120; T.running = false; T.said = ''; renderT(); sayT(`${N(T.speaker)}, you talk. ${N(other(T.speaker))}, you listen. Tap the token to start.`); }
const recog = id => {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return;
  const r = new R(); r.lang = 'en-US'; r.interimResults = true;
  r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(' '); const ta = $('#' + id); if (ta) { ta.value = t; if (id === 'said') T.said = t; else T.heard = t; } };
  r.start(); toast('Listening… speak, then pause.');
};
$('#tm').addEventListener('input', e => { if (e.target.id === 'said') T.said = e.target.value; if (e.target.id === 'heard') T.heard = e.target.value; });
$('#tm').addEventListener('click', e => {
  const b = e.target.closest('[data-tg]'); if (!b) return;
  const k = b.dataset.tg, sp = T.speaker, li = other(sp);
  const A = {
    exit: exitTogether, home: () => { T.screen = 'home'; T.running = false; renderT(); },
    apart: () => { exitTogether(); go('apart'); }, solo: () => { exitTogether(); go('solo'); },
    sound: () => { T.sound = !T.sound && 'speechSynthesis' in window; if (!T.sound) speechSynthesis?.cancel(); toast(T.sound ? 'Bun’s voice on. Captions stay on.' : 'Voice off. Captions only.'); renderT(); },
    talk: () => { T.round = 1; T.screen = 'who'; renderT(); sayT('Who wants to go first?'); },
    'first-A': () => { T.speaker = 'A'; startTurn(); }, 'first-B': () => { T.speaker = 'B'; startTurn(); },
    token: () => { T.running = !T.running; renderT(); },
    mic: () => recog(b.dataset.for),
    pass: () => {
      T.running = false; const said = T.said.trim();
      T.log.push({ from:sp, text:said || '(said it out loud, no notes)' });
      T.screen = 'reflect'; T.heard = ''; renderT();
      if (said) aiT('after-speak', `${N(sp)} just spoke (gist above). In under 25 words: name the feeling you hear underneath, neutrally, then ask ${N(li)} to repeat back what they heard, starting with "What I heard is".`, `${N(li)}, repeat back what you heard.`);
      else sayT(`${N(li)}, repeat back what you heard. Start with “What I heard is…”`);
    },
    reflected: () => {
      const h = T.heard.trim(); if (h) T.log.push({ from:li, text:`(reflecting back) ${h}` });
      T.screen = 'land'; renderT(); sayT(`${N(sp)}, did that land?`);
    },
    landed: () => {
      T.log.push({ rec:true, who:sp, text:`${N(sp)} chose: it landed` });
      if (T.round === 1) { T.round = 2; T.speaker = li; startTurn(); return; }
      T.screen = 'done'; renderT();
      aiT('close', `Both have had a turn. In under 30 words: thank them, name in neutral words what each seemed to need, and suggest one tiny thing to do tonight.`, 'You both got heard. That’s the whole trick. Nice work.');
    },
    again: () => { T.log.push({ rec:true, who:sp, text:`${N(sp)} chose: try again` }); T.screen = 'reflect'; T.heard = ''; renderT(); sayT(`One more try, ${N(li)}. Just the feeling underneath.`); },
    pause: () => { T.screen = 'pause'; T.left = T.total = 20 * 60; T.running = true; T.log.push({ rec:true, who:sp, text:'You chose: take 20' }); renderT(); sayT('Twenty minutes apart. Walk, water, one loud song. Then we try again, softer.'); },
    'pause-private': () => { exitTogether(); go('solo'); },
    hard: () => { T.screen = 'hardwho'; renderT(); sayT('Who has something hard to say?'); },
    'hard-A': () => hardPrivate('A'), 'hard-B': () => hardPrivate('B'),
    recap: async () => {
      const notes = T.log.filter(l => !l.rec).map(l => `${N(l.from)}: ${l.text}`).join('\n');
      exitTogether(); go('apart');
      const m = { cid:uid(), from:'bun', text:`Together-mode recap: ${T.log.filter(l => l.from === 'bun').slice(-1)[0]?.text || 'You both took a turn and got heard.'}`, kind:'text' };
      S.msgs.push({ ...m, seq:S.seq + 0.5 }); renderThread(true); await roomPost({ op:'post', msg:m }); toast('Recap posted to your chat.');
    },
  };
  A[k]?.();
});
function hardPrivate(w) {
  S.me = w; persist(); exitTogether(); S.view = 'solo';
  S.solo[w].push({ cid:uid(), from:'bun', text:`Just us, ${N(w)}. Write it rough, the way it feels. I’ll help you say it so ${N(other(w))} can hear it. Then you say it out loud at the table.`, kind:'text' });
  persist(); render(); toast(`Now ${N(w)}’s private space. ${N(other(w))} can’t see this.`);
}

/* ---------- navigation ---------- */
async function go(v) {
  saveNames();
  if (v === 'together') { if (S.view === 'landing') S.view = 'landing'; enterTogether(); return; }
  if (v === 'apart') {
    if (!S.room) { S.room = newRoomId(); persist(); await roomPost({ op:'create', names:S.names, as:S.me }); }
    else { roomPost({ op:'join', as:S.me }).then(j => { if (j && j.exists === false) roomPost({ op:'create', names:S.names, as:S.me }); }); }
    S.view = 'apart'; render(); startPoll(); roomGet();
    history.replaceState(null, '', `/chat/?room=${S.room}&as=${S.me}${DUO ? "&duo=1" : ""}`);
    return;
  }
  if (v === 'solo') { S.view = 'solo'; render(); return; }
  if (v === 'landing') { S.view = 'landing'; render(); }
}
function saveNames() { const a = $('#nmA'), b = $('#nmB'); if (a && b) { S.names = { A:a.value.trim() || 'Sam', B:b.value.trim() || 'Alex' }; persist(); } }

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.closest('#tm')) return;
  const a = t.dataset.act;
  const A = {
    go: () => go(t.dataset.v),
    home: () => { stopPoll(); S.view = 'landing'; render(); },
    swap: () => { S.me = other(S.me); persist(); if (S.room) { roomPost({ op:'join', as:S.me }); history.replaceState(null, '', `/chat/?room=${S.room}&as=${S.me}${DUO ? "&duo=1" : ""}`); } render(); toast(`Now chatting as ${N(S.me)} on this device`); },
    'copy-invite': () => { navigator.clipboard?.writeText(inviteUrl()).then(() => toast('Link copied. Nothing was sent.'), () => toast(inviteUrl())); },
    insert: () => { const m = $('#msg'); m.value = (t.dataset.v.startsWith('/') ? t.dataset.v + ' ' : (m.value ? m.value + ' ' : '') + t.dataset.v + ' '); m.focus(); draftFlag(); },
    bunmode: () => { S.bunMode = S.bunMode === 'auto' ? 'tag' : 'auto'; persist(); renderHead(); toast(S.bunMode === 'auto' ? 'Bun chimes in when it helps.' : 'Bun only replies to @Bun and /commands.'); },
    soften: () => soften(),
    'soft-use': () => { const c = S.msgs.find(x => x.cid === t.dataset.cid); if (!c) return; c.data.chose = 'use the softer version'; $('#msg').value = c.data.text; renderThread(); draftFlag(); $('#msg').focus(); },
    'soft-mine': () => { const c = S.msgs.find(x => x.cid === t.dataset.cid); if (!c) return; c.data.chose = 'keep my words'; renderThread(); },
    'break-ans': () => answer(t.dataset.cid, t.dataset.v),
    'suggest-ans': async () => { await answer(t.dataset.cid, t.dataset.v); if (t.dataset.v === 'take a break') startBreak(); },
    'go-soft': () => { go('solo'); setTimeout(() => { $('#msg').value = 'Help me start softer when we talk again.'; }, 50); },
  };
  if (A[a]) { e.preventDefault(); A[a](); }
});
async function answer(cid, v) {
  const c = S.msgs.find(x => x.cid === cid); if (!c) return;
  c.data = { ...(c.data || {}), answers:{ ...(c.data?.answers || {}), [S.me]:v } }; renderThread();
  await roomPost({ op:'update', cid, data:{ answers:c.data.answers } });
}
let typingAt = 0;
document.addEventListener('input', e => {
  if (e.target.id !== 'msg') return;
  L.flagConfirm = false; draftFlag();
  if (S.view === 'apart' && Date.now() - typingAt > 3000) { typingAt = Date.now(); roomPost({ op:'typing', who:S.me, on:true }); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'composer') return; e.preventDefault();
  const m = $('#msg'); const v = m.value;
  if (S.view === 'apart' && HARSH_RE.test(v) && !L.flagConfirm) { L.flagConfirm = true; draftFlag(); return; }
  L.flagConfirm = false; m.value = ''; draftFlag(); send(v);
});
const quickExit = () => { try { localStorage.removeItem(LS); } catch {} location.replace('https://weather.com/'); };
$('#quick-exit').addEventListener('click', quickExit);

/* boot: join from a room link */
const q = new URLSearchParams(location.search);
if (q.get('room') && /^[a-z0-9]{4,12}$/.test(q.get('room'))) {
  if (S.room !== q.get('room')) { S.room = q.get('room'); S.msgs = []; }
  if (q.get('as') === 'A' || q.get('as') === 'B') S.me = q.get('as');
  persist();
  fetch(`/api/room?id=${S.room}`).then(r => r.json()).then(j => { if (j.names) S.names = j.names; go('apart'); }).catch(() => go('apart'));
} else if (['solo','together','apart'].includes(q.get('start'))) { history.replaceState(null, '', '/chat/'); go(q.get('start')); }
else render();
})();
