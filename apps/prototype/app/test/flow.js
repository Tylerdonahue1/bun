/* Walkable test of the 12 Nov 2026 fight-mode flow. Route: /app/test
   Does not boot the live /app/ router. Storage key is simmer-test-flow-v1. */
(() => {
  'use strict';
  const M = window.SimmerTestFlow;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const canListen = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  let state = load();
  let coachLabel = 'Coach idle';
  let listenSession = null;
  let beatToken = 0;
  let lastSaveAt = 0;
  let lastTick = performance.now();

  function load() {
    const fresh = M.createState(Date.now());
    try {
      const raw = JSON.parse(localStorage.getItem(M.STORAGE_KEY) || 'null');
      if (raw && raw.v === M.STATE_VERSION && raw.names && raw.users) {
        return {
          ...fresh,
          ...raw,
          names: { ...fresh.names, ...(raw.names || {}) },
          users: { ...fresh.users, ...(raw.users || {}) },
          overlay: { ...fresh.overlay, ...(raw.overlay || {}) },
          safety: { ...fresh.safety, ...(raw.safety || {}) },
          followDraft: { A: { ...fresh.followDraft.A, ...(raw.followDraft && raw.followDraft.A) }, B: { ...fresh.followDraft.B, ...(raw.followDraft && raw.followDraft.B) } },
          said: raw.said || {},
          history: Array.isArray(raw.history) ? raw.history : [],
        };
      }
    } catch (e) {}
    return fresh;
  }

  function save(force) {
    const now = Date.now();
    if (!force && now - lastSaveAt < 1500) return;
    lastSaveAt = now;
    try { localStorage.setItem(M.STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('on'), 3200);
  }

  function phoneEl(who) { return document.getElementById('phone-' + who); }
  function field(who, name) {
    const root = phoneEl(who);
    return root ? root.querySelector('[data-field="' + name + '"]') : null;
  }

  function bun(size, mood) {
    const eyes = {
      happy: '<path d="M40 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 58 q6 -7 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
      soft: '<circle cx="46" cy="57" r="4.5" fill="#2B1A12"/><circle cx="74" cy="57" r="4.5" fill="#2B1A12"/>',
      calm: '<path d="M40 57 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><path d="M68 57 q6 5 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>',
    }[mood] || '';
    const mouth = mood === 'soft'
      ? '<path d="M54 70 q6 4 12 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>'
      : '<path d="M52 68 q8 8 16 0" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/>';
    return `<span class="bun-av" style="width:${size}px"><svg width="${size}" height="${Math.round(size * .88)}" viewBox="0 -6 120 106" aria-hidden="true"><path d="M10 66 C10 32 32 12 60 12 C88 12 110 32 110 66 C110 84 92 92 60 92 C28 92 10 84 10 66Z" fill="#F6C453" stroke="#2B1A12" stroke-width="4"/><path d="M50 14 q8 -12 18 -4" fill="none" stroke="#2B1A12" stroke-width="4" stroke-linecap="round"/><ellipse cx="36" cy="34" rx="10" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 36 34)"/><ellipse cx="32" cy="70" rx="8" ry="5" fill="#F08C70" opacity=".8"/><ellipse cx="88" cy="70" rx="8" ry="5" fill="#F08C70" opacity=".8"/>${eyes}${mouth}</svg></span>`;
  }

  function say(text, mood, big) {
    return `<div class="say${big ? ' big' : ''}">${bun(big ? 72 : 54, mood || 'soft')}<p class="bubble">${esc(text)}</p></div>`;
  }

  function whisper(screen) {
    const label = M.whisper(screen);
    return label ? `<p class="eyebrow whisper">${esc(label)}</p>` : '';
  }

  function helpQuiet() {
    return '<p class="help-quiet"><button type="button" class="link sm" data-act="help">Not safe right now?</button></p>';
  }

  function backLink(act, label) {
    return `<button type="button" class="link" data-act="${act}">\u2039 ${esc(label)}</button>`;
  }

  function composer(name, placeholder, value) {
    const mic = canListen ? `<button type="button" class="btn mic" data-act="mic" data-field="${name}"><span class="ml">Say it</span></button>` : '';
    return `<div class="inbox"><label class="sr">Your words</label><textarea data-field="${name}" rows="2" maxlength="600" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea><div class="inrow">${mic}<button type="button" class="btn primary" data-act="send" data-field="${name}">Done</button></div>${canListen ? '' : '<p class="fine">Type instead. This browser has no voice typing.</p>'}</div>`;
  }

  const voice = (() => {
    const synthOk = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    let picked = null;
    let token = 0;
    function pick() {
      if (!synthOk) return;
      const voices = speechSynthesis.getVoices();
      picked = voices.find(item => /Samantha|Ava|Allison|Google US English|Microsoft (Aria|Jenny)/i.test(item.name))
        || voices.find(item => /^en[-_]US/i.test(item.lang))
        || voices.find(item => /^en/i.test(item.lang))
        || null;
    }
    if (synthOk) {
      pick();
      try { speechSynthesis.addEventListener('voiceschanged', pick); } catch (e) {}
    }
    function wave(on) {
      $$('.bun-av').forEach(el => el.classList.toggle('talking', on));
      $$('.voice-anim').forEach(el => { el.hidden = !on; });
    }
    return {
      ok: synthOk,
      unlock() {
        if (!synthOk || voice.unlocked) return;
        voice.unlocked = true;
        try {
          const utter = new SpeechSynthesisUtterance(' ');
          utter.volume = 0;
          speechSynthesis.speak(utter);
        } catch (e) {}
      },
      cancel() {
        token += 1;
        if (synthOk && window.SimmerSpeech) SimmerSpeech.hush(speechSynthesis);
        wave(false);
      },
      speak(text, onend) {
        const clean = String(text || '').replace(/[*_]/g, '').replace(/\s+/g, ' ').trim();
        const mine = ++token;
        if (!synthOk || !state.voice || !clean) { if (onend) onend(); return; }
        try { speechSynthesis.cancel(); } catch (e) {}
        const utter = new SpeechSynthesisUtterance(clean);
        if (picked) utter.voice = picked;
        utter.lang = (picked && picked.lang) || 'en-US';
        utter.rate = 0.96;
        utter.pitch = 1.02;
        utter.onstart = () => { if (mine === token) wave(true); };
        utter.onend = () => { if (mine !== token) return; wave(false); if (onend) onend(); };
        utter.onerror = () => { if (mine !== token) return; wave(false); if (onend) onend(); };
        setTimeout(() => {
          if (mine !== token) return;
          try { speechSynthesis.speak(utter); } catch (e) { if (onend) onend(); }
        }, 50);
      },
    };
  })();

  function plain(text) {
    return String(text || '').replace(/\*\*|[*_#]/g, '').replace(/\s+/g, ' ').trim();
  }

  function isDanger(text) {
    return !!(window.Simmer && Simmer.SAFETY_RE && Simmer.SAFETY_RE.test(String(text || '')));
  }

  function guard(who, text) {
    if (!isDanger(text)) return false;
    M.showSafety(state, who);
    voice.cancel();
    save(true);
    render();
    return true;
  }

  function screenClass(screen) {
    if (screen === 'fork') return 'screen red center';
    if (screen === 'launch') return 'screen launch';
    if (['beat', 'calmer', 'chill', 'sit-ready', 'walk-ready', 'push', 'handoff', 'waiting'].includes(screen)) return 'screen center';
    if (screen === 'talk') return 'screen talking';
    return 'screen';
  }

  function homeClock() {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function screenLaunch(who) {
    return `<div class="home-mock">
      <p class="home-time">${esc(homeClock())}</p>
      <p class="home-hello">Mock home screen</p>
      <button type="button" class="widget" data-act="launch-widget">
        <span class="widget-kicker">Simmer</span>
        <span class="widget-go">${esc(M.WIDGET_LABEL)}</span>
        <span class="draft-tag">${esc(M.WIDGET_NOTE)}</span>
      </button>
      <button type="button" class="siri" data-act="launch-siri">
        <span class="siri-k">Hey Siri</span>
        <span>Start Simmer</span>
      </button>
      <p class="fine siri-note">Opens straight into Simmer. The lock-screen Open or Stop step is left out here on purpose.</p>
      <div class="name-row">
        <label>Partner 1<input data-field="name-A" maxlength="24" value="${esc(state.names.A)}" autocomplete="off"></label>
        <label>Partner 2<input data-field="name-B" maxlength="24" value="${esc(state.names.B)}" autocomplete="off"></label>
      </div>
      <p class="fine">${esc(M.planLine(state))}</p>
      <p class="idline">${esc(M.name(state, who))} · ${esc(state.users[who])}</p>
      <button type="button" class="link" data-act="open-log">Fight log</button>
    </div>`;
  }

  function screenFork() {
    return `<div class="fork-wrap">
      ${bun(88, 'soft')}
      <h1 class="fight-q">Are we in a fight, or just here to chill?</h1>
      <p class="fight-sub">Cool down first if it\u2019s a fight.</p>
      <button type="button" class="btn fight huge" data-act="fight"><span><b>We\u2019re in a fight</b><small>Bun steps in.</small></span></button>
      <button type="button" class="btn chill huge" data-act="chill"><span><b>Just here to chill</b><small>Not this round.</small></span></button>
      ${helpQuiet()}
    </div>`;
  }

  function screenChill() {
    return `<div class="hero">${bun(100, 'happy')}
      <h1 class="h2">Chill is coming later.</h1>
      <p class="lede">This part isn\u2019t in this test. Fight mode is the path we\u2019re walking.</p>
      <button type="button" class="btn primary big" data-act="chill-back">Back to fight or chill</button>
    </div>`;
  }

  function screenWind() {
    return `${whisper('wind')}
      ${say(M.WIND_LINE, 'happy', true)}
      <h1 class="sr">Together or separately</h1>
      <div class="stack">
        <button type="button" class="choice" data-act="together"><b>Together</b></button>
        <button type="button" class="choice" data-act="separately"><b>Separately</b></button>
      </div>
      ${backLink('wind-back', 'Back')}
      ${helpQuiet()}`;
  }

  function screenChoice() {
    return `${whisper('choice')}
      ${say('Sit still, or walk it off?', 'soft', true)}
      <h1 class="sr">Sit still or walk it off</h1>
      <div class="stack">
        <button type="button" class="choice" data-act="body-sit"><b>Sit still</b><span>${esc(M.SIT_BLURB)}</span></button>
        <button type="button" class="choice" data-act="body-walk"><b>Walk it off</b><span>${esc(M.WALK_BLURB)}</span></button>
      </div>
      ${backLink('body-back', 'Back')}
      ${helpQuiet()}`;
  }

  function screenSitReady() {
    return `${whisper('sit-ready')}
      ${bun(96, 'calm')}
      <h1 class="h2">Sit still</h1>
      <p class="lede">${esc(M.SIT_READY)}</p>
      <p class="fine">Five minutes. A guided session on this phone.</p>
      <button type="button" class="btn primary big" data-act="play">Play</button>
      ${backLink('body-back', 'Back')}
      ${helpQuiet()}`;
  }

  function screenWalkReady() {
    return `${whisper('walk-ready')}
      ${bun(96, 'calm')}
      <h1 class="h2">Walk it off</h1>
      <p class="lede">${esc(M.WALK_READY)}</p>
      <p class="fine">Ten minutes, side by side.</p>
      <button type="button" class="btn primary big" data-act="play">Start</button>
      ${backLink('body-back', 'Back')}
      ${helpQuiet()}`;
  }

  function screenTimer(kind) {
    const timer = state.fight && state.fight.timer;
    if (!timer) return '';
    const show = kind === 'walk' && M.suggestionVisible(timer, Date.now());
    return `${whisper(kind)}
      <h1 class="sr">${kind === 'sit' ? 'Sit still' : 'Walk it off'}</h1>
      <div class="timer"><div class="orb ${kind === 'sit' ? 'breath' : ''}" role="timer">
        <span data-clock>${esc(M.fmtClock(timer.left))}</span>
        <small data-cue>${esc(timer.cueText || '')}</small>
      </div></div>
      <div class="suggest" data-suggest ${show ? '' : 'hidden'}>
        <p>${esc(M.WALK_SUGGESTION)}</p>
        <button type="button" class="link sm" data-act="dismiss-suggest">Got it</button>
      </div>
      <p class="reviewer-skip"><button type="button" class="link sm" data-act="skip">${esc(M.skipLabel(state))}</button></p>
      ${helpQuiet()}`;
  }

  function screenCalmer() {
    return `${whisper('calmer')}
      ${bun(110, 'calm')}
      <h1 class="h2">When you\u2019re ready</h1>
      <button type="button" class="btn calm big" data-act="calmer">${esc(M.CALMER_LABEL)}</button>
      ${helpQuiet()}`;
  }

  function screenBeat() {
    const line = M.beatLine(state);
    const parts = line.split('. ');
    const rest = parts.slice(1).join('. ');
    return `<div class="beat">${bun(120, 'happy')}
      <h1 class="beat-line">${esc(parts[0])}.</h1>
      <p class="beat-sub">${esc(rest)}</p>
    </div>`;
  }

  function screenQuestions() {
    const q = M.currentTogetherQuestion(state);
    if (!q) return '';
    const draft = (state.fight.questions && state.fight.questions.draft) || '';
    return `${whisper('questions')}
      <p class="draft-tag">Draft question · placeholder</p>
      <p class="eyebrow">Question ${q.index + 1} of ${q.total}</p>
      <h1 class="h2">${esc(M.name(state, q.turn))}, your turn</h1>
      ${say(q.prompt, 'soft', true)}
      ${composer('q', 'A few words is enough', draft)}
      ${helpQuiet()}`;
  }

  function screenTalk() {
    const talk = state.fight.talk;
    const messages = talk.messages || [];
    const tail = messages.map((message, index) => {
      const dim = index < messages.length - 3 ? ' dim' : '';
      if (message.from === 'bun') return `<div class="m bun${dim}">${bun(30, 'soft')}<p>${esc(message.text)}</p></div>`;
      const who = message.from === 'A' || message.from === 'B' ? message.from : null;
      const label = who ? M.name(state, who) : 'Note';
      return `<div class="m ${who ? 'p' + who : ''}${dim}"><b>${esc(label)}</b><p>${esc(message.text)}</p></div>`;
    }).join('');
    let panel = '';
    if (talk.step === 'thinking') {
      panel = `<div class="say">${bun(54, 'calm')}<p class="bubble typing"><i></i><i></i><i></i><span class="sr">Bun is thinking</span></p></div>`;
    } else if (talk.step === 'speak' || talk.step === 'listen') {
      const who = talk.step === 'listen' ? M.other(talk.speaker) : talk.speaker;
      const hint = talk.step === 'listen' ? 'Say back what you heard.' : 'One sentence, starting with \u201cI feel.\u201d';
      const placeholder = talk.step === 'listen' ? 'What I heard is\u2026' : 'I feel\u2026';
      panel = `<h1 class="h2 who-${who}">${esc(M.name(state, who))}</h1><p class="lede">${hint}</p>${composer('talk', placeholder, talk.draft || '')}<p class="fine"><button type="button" class="link sm" data-act="heat">It\u2019s getting sharp</button></p>`;
    }
    return `${whisper('talk')}
      <div class="voice-row">${bun(46, 'soft')}<span class="voice-anim" hidden aria-hidden="true"><i></i><i></i><i></i></span><span class="fine">${esc(coachLabel)}</span></div>
      <div class="thread tail" data-thread>${tail}</div>
      <section class="panel">${panel}</section>
      ${helpQuiet()}`;
  }

  function screenClose() {
    const talk = state.fight.talk;
    const chips = M.REPAIRS.map((label, index) => `<button type="button" class="chip" aria-pressed="${talk.repair === label}" data-act="repair" data-i="${index}">${esc(label)}</button>`).join('');
    return `${whisper('close')}
      ${say('I\u2019ll save your words as you say them.', 'calm', true)}
      <h1 class="h2">Seal it</h1>
      <div class="chips" role="group" aria-label="A small repair">${chips}</div>
      <label class="stack-label">One commitment, in your words<textarea data-field="agreement" rows="2" maxlength="240" placeholder="We\u2019ll\u2026">${esc(talk.agreementDraft || '')}</textarea></label>
      <label class="stack-label">Topic, for the log<input data-field="topic" maxlength="80" placeholder="weekend plans" value="${esc(talk.topicDraft || '')}"></label>
      <button type="button" class="btn primary big" data-act="close-yes">It feels resolved</button>
      <button type="button" class="btn ghost big" data-act="close-no">Not resolved · save the log anyway</button>
      ${helpQuiet()}`;
  }

  function screenDone() {
    const entry = state.history[0];
    if (!entry) return screenLaunch(state.viewing);
    const due = M.followupIsDue(state, Date.now());
    return `${say('It\u2019s in your shared log.', 'happy', true)}
      <h1 class="h2">${esc(entry.topic || 'A fight')}</h1>
      <p class="lede">${esc(entry.summary)}</p>
      ${entry.commitments[0] ? `<p class="commitment">\u201c${esc(entry.commitments[0])}\u201d</p>` : ''}
      <p class="fine">About an hour later, you both get a short follow-up.</p>
      ${due ? '<button type="button" class="btn primary big" data-act="open-follow">Answer the follow-up</button>' : '<button type="button" class="btn primary big" data-act="hour">Simulate one hour later</button>'}
      <button type="button" class="btn ghost big" data-act="open-log">Open the log</button>
      <button type="button" class="btn ghost" data-act="another">Start another</button>
      <p class="idline">Session ${esc(entry.sessionId)} · starter ${esc(entry.starterUserId)}</p>`;
  }

  function screenFollow(who) {
    const entry = M.currentFollowupEntry(state);
    if (!entry) return screenDone();
    const mine = entry.followup[who];
    const partner = M.other(who);
    const theirs = entry.followup[partner];
    const partnerLine = !theirs ? M.name(state, partner) + ' hasn\u2019t answered.'
      : theirs.kind === 'postpone' ? M.name(state, partner) + ' postponed.'
      : M.name(state, partner) + ' is done.';
    if (mine && mine.kind !== 'postpone') {
      const mineLine = mine.kind === 'nofeedback' ? 'No feedback. It was all set.' : 'Saved to the shared log.';
      return `${whisper('followup')}${bun(84, 'calm')}
        <h1 class="h2">${entry.complete ? 'This fight\u2019s history is complete.' : 'Waiting on ' + esc(M.name(state, partner)) + '.'}</h1>
        <p class="lede">${esc(mineLine)} ${esc(partnerLine)}</p>
        <button type="button" class="btn ghost big" data-act="open-log">Open the log</button>`;
    }
    const draft = state.followDraft[who];
    const feels = M.FEELS.map(item => `<button type="button" class="chip" aria-pressed="${draft.feel === item.id}" data-act="follow-feel" data-id="${item.id}">${esc(item.label)}</button>`).join('');
    const whys = draft.resolved === 'no' ? `<p class="label">If not, why?</p><div class="chips">${M.WHYS.map(item => `<button type="button" class="chip" aria-pressed="${draft.why === item.label}" data-act="follow-why" data-id="${esc(item.id)}">${esc(item.label)}</button>`).join('')}</div>` : '';
    const postponed = mine && mine.kind === 'postpone';
    return `<p class="eyebrow">About an hour later</p>
      <h1 class="h2">How do you feel?</h1>
      ${postponed ? '<p class="follow-status">You postponed. You can answer now.</p>' : ''}
      <p class="fine">${esc(partnerLine)} Saved to the shared fight log.</p>
      <div class="chips" role="group" aria-label="How you feel">${feels}</div>
      <p class="label">Was it resolved?</p>
      <div class="chips">
        <button type="button" class="chip" aria-pressed="${draft.resolved === 'yes'}" data-act="follow-resolved" data-id="yes">Yes</button>
        <button type="button" class="chip" aria-pressed="${draft.resolved === 'no'}" data-act="follow-resolved" data-id="no">No</button>
      </div>
      ${whys}
      <label class="stack-label">Write more, if you want<textarea data-field="follow-note" rows="2" maxlength="600" placeholder="Optional">${esc(draft.note || '')}</textarea></label>
      <button type="button" class="btn primary big" data-act="follow-save">Save my follow-up</button>
      <button type="button" class="btn ghost" data-act="follow-none">No feedback, it was all set</button>
      <button type="button" class="link" data-act="follow-later">Postpone</button>
      ${helpQuiet()}`;
  }

  function screenPush() {
    const starter = M.name(state, state.fight.starter);
    return `<div class="push-card grow">
      <p class="eyebrow">Bun</p>
      <h1 class="h2">${esc(starter)} asked you to start Bun.</h1>
      <button type="button" class="btn primary big" data-act="push-start">Start Bun</button>
    </div>
    <p class="idline">Session ${esc(state.sessionId)}</p>`;
  }

  function screenSafe(who) {
    const back = canLeaveApart() ? backLink('body-back', 'Back') : '';
    return `${whisper('safe')}
      <h1 class="h2">${esc(M.safeTitle(state, who))}</h1>
      <p class="lede">${esc(M.SAFE_LINE)}</p>
      <p>${esc(M.SAFE_HINT)}</p>
      <button type="button" class="btn primary big" data-act="safe-start">Start</button>
      ${back}
      ${helpQuiet()}`;
  }

  function canLeaveApart() {
    if (!state.fight || state.phase !== 'apart') return false;
    const sep = state.fight.separate;
    return !(sep.A.started || sep.B.started || sep[M.other(state.fight.starter)].accepted);
  }

  function screenQuiz(who) {
    const q = M.separateQuestion(state, who);
    if (!q) return screenReady(who);
    const draft = (state.fight.separate[who] && state.fight.separate[who].draft) || '';
    const choices = (q.choices || []).map((label, index) => `<button type="button" class="chip" data-act="quiz-choice" data-i="${index}">${esc(label)}</button>`).join('');
    const enough = q.enough ? '<button type="button" class="btn ghost big" data-act="quiz-enough">That\u2019s enough</button>' : '';
    const skip = q.skippable && q.enough ? '<button type="button" class="link" data-act="quiz-enough">Skip this one</button>' : '';
    return `${whisper('quiz')}
      <p class="draft-tag">Draft questionnaire · placeholder</p>
      <h1 class="h2">${esc(M.safeTitle(state, who))}</h1>
      <p class="lede">${esc(q.prompt)}</p>
      <p class="fine">${q.answered} answered · ${M.SEPARATE_ENOUGH} of ${q.total} is enough</p>
      ${choices ? `<div class="chips">${choices}</div>` : ''}
      ${composer('quiz', q.choices ? 'Or say it in your words' : 'A sentence is enough', draft)}
      ${enough}${skip}
      ${helpQuiet()}`;
  }

  function screenReady(who) {
    const mine = state.fight.separate[who];
    const partner = M.other(who);
    const them = state.fight.separate[partner];
    let status = M.name(state, partner) + ' is still winding down.';
    if (them.finished && !them.ready) status = M.name(state, partner) + ' hasn\u2019t tapped ready.';
    if (them.ready) status = M.name(state, partner) + ' is ready.';
    return `${whisper('ready')}
      <h1 class="h2">${mine.ready ? 'You\u2019re ready' : 'I\u2019m ready to come back'}</h1>
      <p class="lede">${esc(status)}</p>
      ${mine.ready ? '' : '<button type="button" class="btn primary big" data-act="ready">I\u2019m ready to come back</button>'}
      ${helpQuiet()}`;
  }

  function screenWaiting(who) {
    return `${bun(96, 'calm')}
      <h1 class="h2">${esc(M.waitingLine(state))}</h1>
      <p class="lede">Together uses one phone: whoever started.</p>
      <p class="idline">Session ${esc(state.sessionId)}</p>
      <p class="idline">${esc(M.name(state, who))} · ${esc(state.users[who])}</p>
      ${helpQuiet()}`;
  }

  function screenHandoff(who) {
    return `${bun(96, 'calm')}
      <h1 class="h2">${esc(M.handoffLine(state))}</h1>
      <p class="idline">Session ${esc(state.sessionId)}</p>
      <p class="idline">${esc(M.name(state, who))} · ${esc(state.users[who])}</p>
      <p class="fine">Starter ${esc(state.users[state.fight.starter])}</p>`;
  }

  function screenSafety() {
    const resources = window.Simmer && Simmer.resourcesHTML ? Simmer.resourcesHTML() : '<p>Call 911. National DV Hotline 1-800-799-7233. Call or text 988.</p>';
    return `<div class="topbar"><button type="button" class="pill" data-act="quick-exit">Quick exit</button><button type="button" class="pill" data-act="safety-back">\u2039 Back</button></div>
      <div class="hero">${bun(84, 'soft')}<h1 class="h2">This matters more than any fight.</h1>
      <p class="lede">You deserve to be safe. If you\u2019re in danger right now, call 911. These lines are free, private, and open 24/7.</p></div>
      ${resources}`;
  }

  function logItems(items) {
    if (!items.length) return '<li class="fine">No matches.</li>';
    return items.map(entry => `<li><button type="button" class="hist-btn" data-act="log-open" data-id="${esc(entry.id)}"><b>${esc(entry.topic || 'A fight')}</b><span>${esc(entry.dates.clock)} · ${esc(entry.path || 'fight')}${entry.complete ? ' · follow-up complete' : ' · follow-up open'}</span></button></li>`).join('');
  }

  function screenHistory() {
    const items = M.searchHistory(state.history, state.historyQuery);
    const empty = state.history.length ? '' : say('Nothing here yet. Finish a walk-through and the shared log shows up, resolved or not.', 'soft');
    return `<div class="topbar"><button type="button" class="pill" data-act="log-close">\u2039 Back</button><h1 class="h2">Fight log</h1></div>
      <label class="sr">Search by date or topic</label>
      <input data-field="search" placeholder="Search date or topic" value="${esc(state.historyQuery)}">
      ${empty}
      <ul class="hist" data-loglist>${state.history.length ? logItems(items) : ''}</ul>`;
  }

  function screenLog(who, id) {
    const entry = state.history.find(item => item.id === id);
    if (!entry) return screenHistory();
    const view = M.presentLog(entry, who);
    const words = view.wording.map(row => {
      const label = row.kind === 'commitment' ? 'Commitment' : row.from === 'bun' ? 'Bun' : (view.names[row.from] || 'Note');
      return `<li><b>${esc(label)}</b> ${esc(row.text)}</li>`;
    }).join('');
    const mine = view.myQuiz.map(row => `<li><b>${esc(row.prompt)}</b> ${esc(row.text)}</li>`).join('');
    const follow = ['A', 'B'].map(person => {
      const item = view.followup[person];
      const label = view.names[person];
      if (!item) return `<li><b>${esc(label)}</b> Not yet</li>`;
      if (item.kind === 'postpone') return `<li><b>${esc(label)}</b> Postponed</li>`;
      if (item.kind === 'nofeedback') return `<li><b>${esc(label)}</b> No feedback, it was all set</li>`;
      const resolved = item.resolved === 'yes' ? 'Resolved' : item.resolved === 'no' ? 'Not resolved' : '';
      return `<li><b>${esc(label)}</b> ${esc([item.feel, resolved, item.why, item.note].filter(Boolean).join(' · '))}</li>`;
    }).join('');
    return `<div class="topbar"><button type="button" class="pill" data-act="log-back">\u2039 Log</button></div>
      <p class="eyebrow">${esc(view.dates.clock)}</p>
      <h1 class="h2">${esc(view.topic || 'A fight')}</h1>
      <p class="lede">${esc(view.summary)}</p>
      <p class="fine">${view.complete ? 'History complete' : 'Follow-up still open'}${view.methodName ? ' · ' + esc(view.methodName) : ''}</p>
      <h2>Commitments</h2>
      ${view.commitments.length ? `<ul class="wording">${view.commitments.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : '<p class="fine">No commitment captured.</p>'}
      <h2>Wording</h2>
      <ul class="wording">${words}</ul>
      ${mine ? `<h2>Your private answers</h2><ul class="wording">${mine}</ul><p class="fine">Your partner\u2019s private answers stay on their phone.</p>` : ''}
      <h2>One-hour follow-up</h2>
      <ul class="wording">${follow}</ul>
      <p class="idline">Session ${esc(view.sessionId)} · starter ${esc(view.starterUserId)}</p>
      <p class="fine">${esc(M.planLine(state))}</p>`;
  }

  function htmlFor(view) {
    const who = view.who;
    switch (view.screen) {
      case 'launch': return screenLaunch(who);
      case 'fork': return screenFork();
      case 'chill': return screenChill();
      case 'wind': return screenWind();
      case 'choice': return screenChoice();
      case 'sit-ready': return screenSitReady();
      case 'walk-ready': return screenWalkReady();
      case 'sit': return screenTimer('sit');
      case 'walk': return screenTimer('walk');
      case 'calmer': return screenCalmer();
      case 'beat': return screenBeat();
      case 'questions': return screenQuestions();
      case 'talk': return screenTalk();
      case 'close': return screenClose();
      case 'done': return screenDone();
      case 'followup': return screenFollow(who);
      case 'push': return screenPush();
      case 'safe': return screenSafe(who);
      case 'quiz': return screenQuiz(who);
      case 'ready': return screenReady(who);
      case 'waiting': return screenWaiting(who);
      case 'handoff': return screenHandoff(who);
      case 'safety': return screenSafety();
      case 'history': return screenHistory();
      case 'log': return screenLog(who, view.logId);
      default: return screenLaunch(who);
    }
  }

  function sessionBit() {
    if (!state.sessionId && !state.history.length) return 'No session yet';
    const id = state.sessionId || (state.history[0] && state.history[0].sessionId) || '';
    const starter = (state.fight && state.fight.starter) || state.launchedBy;
    const user = starter ? state.users[starter] : '';
    return [id, user && ('starter ' + user), coachLabel].filter(Boolean).join(' · ');
  }

  function renderBar() {
    const wideNames = ['A', 'B'].map(who => {
      const pressed = state.viewing === who ? 'true' : 'false';
      return `<button type="button" data-act="device" data-who="${who}" aria-pressed="${pressed}">${esc(M.name(state, who))}</button>`;
    }).join('');
    const speeds = [1, 10, 60].map(speed => `<button type="button" data-act="speed" data-v="${speed}" aria-pressed="${Number(state.speed) === speed}">${speed}\u00d7</button>`).join('');
    $('#testbar').innerHTML = `
      <span class="test-badge">Test flow</span>
      <span class="test-note">Not the live app</span>
      <a href="/app/">Live app</a>
      <div class="devices" aria-label="Which phone"><span>Phone</span>${wideNames}</div>
      <button type="button" data-act="open-log">Log</button>
      <button type="button" data-act="voice" aria-pressed="${state.voice ? 'true' : 'false'}">${state.voice ? 'Voice on' : 'Voice off'}</button>
      <div class="reviewer"><span>Reviewer</span><div class="speeds" aria-label="Timer speed">${speeds}</div>
      <button type="button" data-act="hour">Simulate one hour later</button>
      <button type="button" data-act="reset">Reset</button></div>
      <p class="test-meta">${esc(sessionBit())}</p>`;
  }

  function applyPhones() {
    const wide = window.matchMedia('(min-width: 960px)').matches;
    ['A', 'B'].forEach(who => {
      const el = phoneEl(who);
      const on = wide || state.viewing === who;
      el.classList.toggle('is-on', on);
      if (on) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
      const cap = $('.phone-cap', el);
      if (cap) cap.textContent = M.name(state, who) + '\u2019s phone';
    });
  }

  function sayOnce(key, text) {
    if (!text || state.said[key]) return;
    state.said[key] = true;
    voice.speak(text);
  }

  function speechWho() {
    if (!state.fight) return state.focusWho || 'A';
    const phase = state.phase;
    const togetherScreens = ['fork', 'chill', 'wind', 'choice', 'sit-ready', 'sit', 'walk-ready', 'walk', 'calmer', 'beat', 'questions', 'talk', 'close'];
    if (state.fight.path !== 'separately' && togetherScreens.includes(phase)) return state.fight.starter;
    if (state.fight.path === 'separately' && ['beat', 'talk', 'close'].includes(phase)) return state.fight.starter;
    return state.focusWho || state.fight.starter;
  }

  function speakUnsaid() {
    const messages = state.fight && state.fight.talk && state.fight.talk.messages;
    if (!messages || !messages.length) return;
    const last = messages[messages.length - 1];
    if (!last || last.from !== 'bun' || last.spoken) return;
    last.spoken = true;
    voice.speak(last.text);
  }

  function armBeat() {
    if (!state.fight || state.phase !== 'beat') return;
    const key = 'beat:' + state.fight.id;
    if (state.said[key]) return;
    state.said[key] = true;
    const token = ++beatToken;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = () => {
      if (token !== beatToken || state.phase !== 'beat') return;
      beatToken += 1;
      M.advanceBeat(state, Date.now());
      save(true);
      render();
    };
    voice.speak(M.beatLine(state), () => setTimeout(go, reduced ? 120 : 450));
    setTimeout(go, reduced ? 1100 : 6500);
  }

  function flushSpeech() {
    const who = speechWho();
    if (state.overlay[who]) return;
    if (state.safety[who]) { voice.cancel(); return; }
    const view = M.viewFor(state, who);
    const screen = view.screen;
    const sid = state.sessionId || 'x';
    if (screen === 'fork') sayOnce('fork:' + sid, 'Are we in a fight, or just here to chill?');
    else if (screen === 'chill') sayOnce('chill:' + sid, 'Chill is coming later.');
    else if (screen === 'wind') sayOnce('wind:' + sid, M.WIND_LINE);
    else if (screen === 'choice') sayOnce('choice:' + sid, 'Sit still, or walk it off?');
    else if (screen === 'sit-ready') sayOnce('sit-ready:' + sid, M.SIT_READY);
    else if (screen === 'walk-ready') sayOnce('walk-ready:' + sid, M.WALK_READY);
    else if (screen === 'sit') {
      const cue = M.consumeCue(state);
      if (cue) voice.speak(cue);
    } else if (screen === 'walk') {
      const line = M.takeSuggestion(state, Date.now());
      if (line) voice.speak(line);
    } else if (screen === 'calmer') sayOnce('calmer:' + sid, M.finishLine(state.fight && state.fight.wind));
    else if (screen === 'beat') armBeat();
    else if (screen === 'questions') {
      const q = M.currentTogetherQuestion(state);
      if (q) sayOnce('q:' + sid + ':' + q.index + ':' + q.turn, M.name(state, q.turn) + '. ' + q.prompt);
    } else if (screen === 'safe') sayOnce('safe:' + who + ':' + sid, M.safeTitle(state, who) + '. ' + M.SAFE_LINE + ' ' + M.SAFE_HINT);
    else if (screen === 'quiz') {
      const q = M.separateQuestion(state, who);
      if (q) sayOnce('quiz:' + who + ':' + q.index, q.prompt);
    } else if (screen === 'talk') speakUnsaid();
    else if (screen === 'done') {
      const entry = state.history[0];
      if (entry) sayOnce('done:' + entry.id, 'It\u2019s in your shared log.');
    } else if (screen === 'followup') sayOnce('follow:' + who + ':' + (state.followupFightId || ''), 'How do you feel now?');
  }

  function render() {
    if (state.phase === 'done' && M.followupIsDue(state, Date.now())) state.duePainted = true;
    if (state.phase === 'talk' && coachLabel === 'Coach idle') coachLabel = 'Scripted opening';
    renderBar();
    ['A', 'B'].forEach(who => {
      const view = M.viewFor(state, who);
      const screen = $('.screen', phoneEl(who));
      screen.className = screenClass(view.screen);
      screen.dataset.screen = view.screen;
      screen.innerHTML = htmlFor(view);
    });
    applyPhones();
    $$('[data-thread]').forEach(el => { el.scrollTop = el.scrollHeight; });
    flushSpeech();
  }

  function paintClock() {
    if (!state.fight || !state.fight.timer) return;
    const text = M.fmtClock(state.fight.timer.left);
    const cue = state.fight.timer.cueText || '';
    $$('[data-clock]').forEach(el => { el.textContent = text; });
    $$('[data-cue]').forEach(el => { el.textContent = cue; });
  }

  function readNames(who) {
    const a = field(who, 'name-A');
    const b = field(who, 'name-B');
    if (a && b && state.phase === 'idle') M.setNames(state, a.value, b.value);
  }

  function afterQuiz(who, result) {
    if (!result.ok && result.reason === 'empty') { toast('A few words is enough.'); return; }
    if (state.fight && state.fight.separate[who]) state.fight.separate[who].draft = '';
    save(true);
    render();
  }

  async function askCoach(need) {
    const scripted = M.scriptedTalkLine(state, need);
    const speaker = state.fight.talk.speaker;
    let line = scripted;
    let label = 'scripted fallback';
    try {
      if (window.Simmer && Simmer.coach) {
        const payload = {
          mode: 'talk',
          names: { A: state.names.A, B: state.names.B },
          extra: { step: need, speaker: speaker, memory: M.memoryForCoach(state).slice(0, 800) },
          messages: state.fight.talk.messages.filter(item => item.from === 'A' || item.from === 'B' || item.from === 'bun').slice(-12).map(item => ({ from: item.from, text: item.text })),
        };
        const result = await Promise.race([
          Simmer.coach(payload),
          new Promise(resolve => setTimeout(() => resolve({ error: 'timeout' }), 8000)),
        ]);
        if (!state.fight || state.phase !== 'talk') return;
        if (result && result.safety) {
          const messages = state.fight.talk.messages;
          const last = messages[messages.length - 1];
          if (last && last.from !== 'bun') messages.pop();
          state.fight.talk.step = need === 'reflect' ? 'speak' : 'listen';
          M.showSafety(state, state.fight.starter);
          voice.cancel();
          coachLabel = 'safety stop';
          save(true);
          render();
          return;
        }
        if (result && result.text && !result.error) {
          line = plain(result.text);
          label = result.scripted ? 'scripted fallback' : ('live' + (result.model ? ' ' + result.model : ''));
        }
      }
    } catch (e) {
      line = scripted;
      label = 'scripted fallback';
    }
    if (!state.fight || state.phase !== 'talk') return;
    coachLabel = label;
    M.deliverBun(state, line || scripted, need, Date.now());
    save(true);
    render();
  }

  function toggleMic(who, fieldName, button) {
    const input = field(who, fieldName);
    if (!input || !canListen || !window.SimmerSpeech) {
      toast('Voice typing isn\u2019t available here. Type instead.');
      return;
    }
    if (listenSession && listenSession.listening) { listenSession.stop(); return; }
    voice.cancel();
    const base = input.value.trim() ? input.value.trim() + ' ' : '';
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    listenSession = SimmerSpeech.createSession({
      Rec: Rec,
      synth: window.speechSynthesis,
      keep: false,
      onText(text) {
        input.value = base + text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      onState(next) {
        button.classList.toggle('on', next === 'listening');
        const label = button.querySelector('.ml');
        if (label) label.textContent = next === 'listening' ? 'Listening\u2026' : 'Say it';
      },
      onEnd() { listenSession = null; },
    });
    listenSession.start();
  }

  function onSend(who, fieldName) {
    const input = field(who, fieldName);
    const text = input ? input.value : '';
    if (fieldName === 'q') {
      if (guard(who, text)) return;
      const result = M.answerTogether(state, text, Date.now());
      if (!result.ok) { toast('A few words is enough.'); return; }
      if (state.fight && state.fight.questions) state.fight.questions.draft = '';
      save(true);
      render();
      return;
    }
    if (fieldName === 'quiz') {
      if (guard(who, text)) return;
      afterQuiz(who, M.answerSeparate(state, who, text, Date.now()));
      return;
    }
    if (fieldName === 'talk') {
      if (!state.fight) return;
      if (guard(state.fight.starter, text)) return;
      const result = M.submitTalk(state, text, Date.now());
      if (!result.ok) { toast(result.reason === 'empty' ? 'A few words is enough.' : 'One moment.'); return; }
      state.fight.talk.draft = '';
      save(true);
      render();
      askCoach(result.need);
    }
  }

  function onAct(act, btn, who) {
    if (act === 'device') {
      state.viewing = btn.dataset.who;
      state.focusWho = btn.dataset.who;
      save(true);
      render();
      return;
    }
    if (act === 'speed') {
      state.speed = Number(btn.dataset.v) || 1;
      lastTick = performance.now();
      save(true);
      renderBar();
      return;
    }
    if (act === 'voice') {
      state.voice = !state.voice;
      if (!state.voice) voice.cancel();
      save(true);
      renderBar();
      return;
    }
    if (act === 'reset') {
      if (!confirm('Reset this test flow on this browser?')) return;
      voice.cancel();
      localStorage.removeItem(M.STORAGE_KEY);
      state = M.createState(Date.now());
      coachLabel = 'Coach idle';
      save(true);
      render();
      return;
    }
    if (act === 'open-log') { M.openHistory(state, who); save(true); render(); return; }
    if (act === 'log-close') { M.closeOverlay(state, who); save(true); render(); return; }
    if (act === 'log-back') { M.openHistory(state, who); render(); return; }
    if (act === 'log-open') { M.openLogEntry(state, who, btn.dataset.id); render(); return; }
    if (act === 'hour') {
      const result = M.simulateHour(state, Date.now());
      if (!result.ok) { toast('Close a fight first. The follow-up comes after the log.'); return; }
      save(true);
      render();
      return;
    }
    if (act === 'help') { M.showSafety(state, who); voice.cancel(); save(true); render(); return; }
    if (act === 'safety-back') { M.hideSafety(state, who); save(true); render(); return; }
    if (act === 'quick-exit') { voice.cancel(); location.replace('https://weather.com/'); return; }
    if (act === 'mic') { toggleMic(who, btn.dataset.field, btn); return; }
    if (act === 'send') { onSend(who, btn.dataset.field); return; }
    if (act === 'launch-widget' || act === 'launch-siri') {
      readNames(who);
      state.focusWho = who;
      const result = M.launch(state, who, act === 'launch-siri' ? 'siri' : 'widget', Date.now());
      if (!result.ok) { toast('Reset the test before starting another from here.'); return; }
      save(true);
      render();
      return;
    }
    if (act === 'fight') { M.chooseFork(state, 'fight'); save(true); render(); return; }
    if (act === 'chill') { M.chooseFork(state, 'chill'); save(true); render(); return; }
    if (act === 'chill-back' || act === 'wind-back') { M.backToFork(state); save(true); render(); return; }
    if (act === 'together') { M.chooseTogether(state); save(true); render(); return; }
    if (act === 'separately') { M.chooseSeparate(state); state.focusWho = state.fight.starter; save(true); render(); return; }
    if (act === 'body-sit') { M.chooseBody(state, 'sit'); save(true); render(); return; }
    if (act === 'body-walk') { M.chooseBody(state, 'walk'); save(true); render(); return; }
    if (act === 'body-back') {
      const result = M.backToWind(state);
      if (result && result.ok === false) { toast('You\u2019ve already started. Keep going, or reset the test.'); return; }
      save(true);
      render();
      return;
    }
    if (act === 'play') { M.startTimer(state); save(true); render(); return; }
    if (act === 'skip') { M.skipTimer(state, Date.now()); save(true); render(); return; }
    if (act === 'dismiss-suggest') { M.dismissSuggestion(state); save(true); render(); return; }
    if (act === 'calmer') { M.wereCalmer(state); save(true); render(); return; }
    if (act === 'push-start') { M.acceptPush(state, who); save(true); render(); return; }
    if (act === 'safe-start') { M.startSafe(state, who); save(true); render(); return; }
    if (act === 'quiz-choice') {
      const q = M.separateQuestion(state, who);
      const label = q && q.choices && q.choices[Number(btn.dataset.i)];
      if (!label) return;
      if (label === 'Something else') {
        const input = field(who, 'quiz');
        if (input) input.focus();
        return;
      }
      if (guard(who, label)) return;
      afterQuiz(who, M.answerSeparate(state, who, label, Date.now()));
      return;
    }
    if (act === 'quiz-enough') {
      const result = M.finishQuiz(state, who);
      if (!result.ok) { toast('Three answers is enough. A couple more words first.'); return; }
      save(true);
      render();
      return;
    }
    if (act === 'ready') {
      const result = M.markReady(state, who, Date.now());
      if (!result.ok) return;
      save(true);
      render();
      return;
    }
    if (act === 'heat') {
      const line = M.nudgeHeat(state, Date.now());
      if (!line) return;
      save(true);
      render();
      return;
    }
    if (act === 'repair') {
      const label = M.REPAIRS[Number(btn.dataset.i)];
      if (!label) return;
      M.setRepair(state, label);
      save(true);
      render();
      return;
    }
    if (act === 'close-yes' || act === 'close-no') {
      const agreement = (field(who, 'agreement') || {}).value || '';
      const topic = (field(who, 'topic') || {}).value || '';
      if (guard(who, agreement + '\n' + topic)) return;
      const repair = state.fight && state.fight.talk.repair;
      M.closeFight(state, { agreement: agreement, topic: topic, repair: repair, resolved: act === 'close-yes' }, Date.now());
      save(true);
      render();
      return;
    }
    if (act === 'open-follow') {
      if (!M.openFollowup(state, Date.now()).ok) { toast('The follow-up opens about an hour after the fight.'); return; }
      save(true);
      render();
      return;
    }
    if (act === 'another') { M.another(state); save(true); render(); return; }
    if (act === 'follow-feel') { M.patchFollowDraft(state, who, { feel: btn.dataset.id }); render(); return; }
    if (act === 'follow-resolved') { M.patchFollowDraft(state, who, { resolved: btn.dataset.id }); render(); return; }
    if (act === 'follow-why') {
      const item = M.WHYS.find(row => row.id === btn.dataset.id);
      M.patchFollowDraft(state, who, { why: item ? item.label : '' });
      render();
      return;
    }
    if (act === 'follow-save') {
      const note = field(who, 'follow-note');
      if (note) M.patchFollowDraft(state, who, { note: note.value });
      if (guard(who, note && note.value)) return;
      const result = M.saveFollowup(state, who, Date.now());
      if (!result.ok) { toast('Pick how you feel, or say it was all set.'); return; }
      save(true);
      render();
      return;
    }
    if (act === 'follow-none') { M.followupNoFeedback(state, who, Date.now()); save(true); render(); return; }
    if (act === 'follow-later') { M.followupPostpone(state, who, Date.now()); save(true); render(); toast('Postponed. It stays open until you answer.'); return; }
  }

  document.addEventListener('pointerdown', event => {
    if (event.target.closest && event.target.closest('[data-act="mic"]')) return;
    voice.unlock();
  }, true);

  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-act]');
    if (!btn) return;
    event.preventDefault();
    const phone = event.target.closest('.phone');
    const who = phone ? phone.dataset.who : (state.viewing || 'A');
    if (phone) {
      state.focusWho = who;
      state.viewing = who;
    }
    onAct(btn.dataset.act, btn, who);
  });

  document.addEventListener('input', event => {
    const el = event.target;
    const phone = el.closest && el.closest('.phone');
    const who = phone ? phone.dataset.who : state.viewing;
    if (el.dataset.field === 'search') {
      state.historyQuery = el.value;
      const list = phone && phone.querySelector('[data-loglist]');
      if (list) list.innerHTML = logItems(M.searchHistory(state.history, state.historyQuery));
      return;
    }
    if (el.dataset.field === 'agreement' && state.fight) state.fight.talk.agreementDraft = el.value;
    if (el.dataset.field === 'topic' && state.fight) state.fight.talk.topicDraft = el.value;
    if (el.dataset.field === 'talk' && state.fight) state.fight.talk.draft = el.value;
    if (el.dataset.field === 'q' && state.fight) state.fight.questions.draft = el.value;
    if (el.dataset.field === 'quiz' && state.fight) state.fight.separate[who].draft = el.value;
    if (el.dataset.field === 'follow-note') M.patchFollowDraft(state, who, { note: el.value });
    if (el.dataset.field === 'name-A' && state.phase === 'idle') state.names.A = el.value;
    if (el.dataset.field === 'name-B' && state.phase === 'idle') state.names.B = el.value;
  });

  document.addEventListener('change', event => {
    const el = event.target;
    if (el.dataset.field === 'name-A' || el.dataset.field === 'name-B') {
      if (state.phase === 'idle') {
        M.setNames(state, state.names.A, state.names.B);
        save(true);
        render();
      }
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const el = event.target;
    if (!el.dataset || !el.dataset.field) return;
    if (!['talk', 'q', 'quiz'].includes(el.dataset.field)) return;
    event.preventDefault();
    const phone = el.closest('.phone');
    const who = phone ? phone.dataset.who : state.viewing;
    onSend(who, el.dataset.field);
  });

  window.addEventListener('resize', applyPhones);

  setInterval(() => {
    const wall = performance.now();
    const wallDt = (wall - lastTick) / 1000;
    lastTick = wall;
    if (state.phase === 'done' && !state.duePainted && M.followupIsDue(state, Date.now())) {
      state.duePainted = true;
      render();
    }
    if (!state.fight || !state.fight.timer || !state.fight.timer.running) return;
    if (state.phase !== 'sit' && state.phase !== 'walk') return;
    const dt = Math.min(30, wallDt * (Number(state.speed) || 1));
    if (dt <= 0) return;
    const before = state.fight.timer.suggested;
    const showing = !!document.querySelector('[data-suggest]:not([hidden])');
    const result = M.tickTimer(state, dt, Date.now());
    const cue = state.phase === 'sit' ? M.consumeCue(state) : null;
    if (cue) voice.speak(cue);
    const nowVisible = state.fight && state.fight.timer && M.suggestionVisible(state.fight.timer, Date.now());
    if (result.finished || (!before && state.fight.timer && state.fight.timer.suggested) || (showing && !nowVisible)) {
      save(true);
      render();
      return;
    }
    paintClock();
    save(false);
  }, 250);

  function resumeInterrupted() {
    if (state.phase === 'beat' && state.fight) delete state.said['beat:' + state.fight.id];
    if (state.phase !== 'talk' || !state.fight || state.fight.talk.step !== 'thinking') return;
    const talk = state.fight.talk;
    const last = talk.messages[talk.messages.length - 1];
    if (last && last.from !== 'bun') talk.messages.pop();
    talk.step = last && last.from === talk.speaker ? 'speak' : 'listen';
  }

  resumeInterrupted();
  render();
})();
