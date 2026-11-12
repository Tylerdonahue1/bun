/* Pure state for the 12 Nov 2026 fight-mode test page. No DOM.
   Production /app/ keeps its own storage key (simmer-couple). This one is separate. */
(function () {
  'use strict';

  const STORAGE_KEY = 'simmer-test-flow-v1';
  const STATE_VERSION = 1;
  const SIT_SECONDS = 5 * 60;
  const WALK_SECONDS = 10 * 60;
  const SUGGEST_START = 3 * 60;
  const SUGGEST_END = 4 * 60;
  const SEPARATE_ENOUGH = 3;
  const HOUR_MS = 60 * 60 * 1000;

  const WIDGET_LABEL = 'Start Simmer';
  const WIDGET_NOTE = 'Wording TBD';
  const WIND_LINE = 'Hey, what\u2019s up? It\u2019s Bun. How do you wanna wind down \u2014 together or separately?';
  const SIT_READY = 'Press play when you\u2019re ready.';
  const WALK_READY = 'Press start when you\u2019re outside.';
  const SIT_BLURB = '5 minutes. A short guided meditation.';
  const WALK_BLURB = '10 minutes, walking together.';
  const WALK_SUGGESTION = 'Name three things you can see out loud.';
  const CALMER_LABEL = 'We\u2019re calmer';
  const SAFE_LINE = 'Find a safe space by yourself.';
  const SAFE_HINT = 'Click start when you\u2019re ready.';
  const BEAT_TOGETHER = 'Great. You\u2019re calmer. Let\u2019s start stage two. Talking it through.';
  const BEAT_SEPARATE = 'You\u2019re both back. Let\u2019s start stage two. Talking it through.';

  const SIT_CUES = [
    { at: 0, text: 'Sit together. Let your shoulders drop. Breathe in.' },
    { at: 45, text: 'And breathe out, long and slow.' },
    { at: 90, text: 'Breathe in again. You don\u2019t have to solve anything.' },
    { at: 135, text: 'Breathe out. Soften your jaw.' },
    { at: 180, text: 'Breathe in. You\u2019re on the same side for these five minutes.' },
    { at: 225, text: 'Breathe out. Let the fight wait.' },
    { at: 270, text: 'One more slow breath. Almost there.' },
  ];

  // Draft placeholders. Tyler and Iryna can replace these. Together's three are spoken and shared.
  const TOGETHER_QUESTIONS = [
    { id: 'body', draft: true, prompt: 'How does your body feel right now, in a few words?' },
    { id: 'understand', draft: true, prompt: 'What do you want understood, without asking for a fix yet?' },
    { id: 'safer', draft: true, prompt: 'What would help the next few minutes feel safer?' },
  ];

  // Different from the three above: choosing to separate is a more intense state.
  const SEPARATE_QUESTIONS = [
    { id: 'space', draft: true, prompt: 'How much space does your body need before you can listen?', choices: ['A few minutes', 'A real break', 'I\u2019m not sure yet'] },
    { id: 'hot', draft: true, prompt: 'What feels hottest for you right now?', choices: ['I don\u2019t feel heard', 'I feel blamed', 'I feel overwhelmed', 'Something else'] },
    { id: 'help', draft: true, prompt: 'What would help you come back without making it worse?', choices: ['Go slow', 'One person talks at a time', 'A short break first', 'I don\u2019t know'] },
    { id: 'want', draft: true, prompt: 'What is the one thing you need the other person to know before you can talk?' },
    { id: 'line', draft: true, prompt: 'Is there a line you do not want crossed when you talk again?', skippable: true },
  ];

  const REPAIRS = ['A hug', 'A glass of water', 'A short walk', 'One thing you appreciate', 'Skip the gesture'];
  const FEELS = [
    { id: 'calmer', label: 'Calmer' },
    { id: 'bit', label: 'A bit calmer' },
    { id: 'not', label: 'Not really' },
  ];
  const WHYS = [
    { id: 'unheard', label: 'I felt unheard' },
    { id: 'hurt', label: 'I still feel hurt' },
    { id: 'else', label: 'Something else' },
  ];

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function rid(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 10);
  }

  function other(who) {
    return who === 'A' ? 'B' : 'A';
  }

  function emptyDraft() {
    return { feel: '', resolved: '', why: '', note: '' };
  }

  function blankSeparate() {
    return { invited: false, accepted: false, started: false, index: 0, answers: [], finished: false, ready: false };
  }

  function createState(now) {
    return {
      v: STATE_VERSION,
      names: { A: 'Tyler', B: 'Iryna' },
      users: { A: rid('usr'), B: rid('usr') },
      subscriber: 'A',
      partnerJoinsFree: true,
      voice: true,
      speed: 1,
      phase: 'idle',
      clockOffset: 0,
      launchedBy: null,
      launchVia: null,
      sessionId: null,
      fight: null,
      history: [],
      historyQuery: '',
      overlay: { A: null, B: null },
      safety: { A: false, B: false },
      followDraft: { A: emptyDraft(), B: emptyDraft() },
      followupFightId: null,
      focusWho: 'A',
      viewing: 'A',
      said: {},
    };
  }

  function name(state, who) {
    const value = state.names && state.names[who];
    if (value && String(value).trim()) return String(value).trim();
    return who === 'A' ? 'Tyler' : 'Iryna';
  }

  function stamp(state, now) {
    return (now || 0) + (state.clockOffset || 0);
  }

  function setNames(state, a, b) {
    if (state.phase !== 'idle') return { ok: false };
    const clean = (value, fallback) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      return text || fallback;
    };
    state.names.A = clean(a, 'Tyler');
    state.names.B = clean(b, 'Iryna');
    return { ok: true };
  }

  function planLine(state) {
    const holder = name(state, state.subscriber);
    const guest = name(state, other(state.subscriber));
    return 'One subscription. ' + guest + ' joins free on ' + holder + '\u2019s plan.';
  }

  function newFight(state, who, now) {
    return {
      id: rid('fgt'),
      sessionId: state.sessionId,
      starter: who,
      starterUserId: state.users[who],
      startedAt: stamp(state, now),
      via: state.launchVia,
      path: null,
      wind: null,
      timer: null,
      questions: { index: 0, turn: who, answers: [] },
      separate: { A: blankSeparate(), B: blankSeparate() },
      method: null,
      talk: { messages: [], step: 'speak', speaker: who, round: 0, repair: '', agreementDraft: '', topicDraft: '' },
    };
  }

  function launch(state, who, via, now) {
    if (who !== 'A' && who !== 'B') return { ok: false };
    if (state.phase !== 'idle') return { ok: false, reason: 'busy' };
    state.launchedBy = who;
    state.launchVia = via === 'siri' ? 'siri' : 'widget';
    state.sessionId = rid('ses');
    state.fight = newFight(state, who, now);
    state.phase = 'fork';
    state.focusWho = who;
    return { ok: true, sessionId: state.sessionId, starterUserId: state.users[who] };
  }

  function chooseFork(state, choice) {
    if (!state.fight || state.phase !== 'fork') return { ok: false };
    if (choice === 'chill') {
      state.phase = 'chill';
      return { ok: true };
    }
    state.phase = 'wind';
    return { ok: true };
  }

  function backToFork(state) {
    if (state.phase === 'chill' || state.phase === 'wind') state.phase = 'fork';
  }

  function chooseTogether(state) {
    if (!state.fight || state.phase !== 'wind') return { ok: false };
    state.fight.path = 'together';
    state.phase = 'choice';
    return { ok: true };
  }

  function chooseSeparate(state) {
    if (!state.fight || state.phase !== 'wind') return { ok: false };
    const fight = state.fight;
    const partner = other(fight.starter);
    fight.path = 'separately';
    fight.separate[fight.starter].invited = true;
    fight.separate[fight.starter].accepted = true;
    fight.separate[partner].invited = true;
    fight.separate[partner].accepted = false;
    state.phase = 'apart';
    return { ok: true };
  }

  function backToWind(state) {
    if (!state.fight) return { ok: false };
    if (state.phase === 'choice' || state.phase === 'sit-ready' || state.phase === 'walk-ready') {
      state.fight.path = null;
      state.fight.wind = null;
      state.phase = 'wind';
      return { ok: true };
    }
    if (state.phase === 'apart') {
      const sep = state.fight.separate;
      const started = sep.A.started || sep.B.started || sep[other(state.fight.starter)].accepted;
      if (started) return { ok: false, reason: 'started' };
      state.fight.path = null;
      state.fight.separate = { A: blankSeparate(), B: blankSeparate() };
      state.phase = 'wind';
      return { ok: true };
    }
    return { ok: false };
  }

  function chooseBody(state, wind) {
    if (!state.fight || state.phase !== 'choice') return { ok: false };
    if (wind !== 'sit' && wind !== 'walk') return { ok: false };
    state.fight.wind = wind;
    state.phase = wind === 'sit' ? 'sit-ready' : 'walk-ready';
    return { ok: true };
  }

  function startTimer(state) {
    if (!state.fight) return { ok: false };
    const kind = state.fight.wind;
    if (kind !== 'sit' && kind !== 'walk') return { ok: false };
    const ready = kind === 'sit' ? 'sit-ready' : 'walk-ready';
    if (state.phase !== ready && state.phase !== kind) return { ok: false };
    const total = kind === 'sit' ? SIT_SECONDS : WALK_SECONDS;
    state.fight.timer = {
      kind: kind,
      total: total,
      left: total,
      elapsed: 0,
      running: true,
      suggested: false,
      dismissed: false,
      suggestAt: 0,
      suggestSpoken: false,
      cueSpoken: -1,
      cueText: kind === 'sit' ? 'Breathe with the circle' : 'Side by side',
    };
    state.phase = kind;
    return { ok: true, total: total };
  }

  function tickTimer(state, seconds, now) {
    const timer = state.fight && state.fight.timer;
    if (!timer || !timer.running) return { finished: false, suggest: false };
    const step = Math.max(0, Number(seconds) || 0);
    timer.elapsed += step;
    if (timer.elapsed > timer.total) timer.elapsed = timer.total;
    timer.left = Math.max(0, timer.total - timer.elapsed);
    let suggest = false;
    if (timer.kind === 'walk' && timer.elapsed >= SUGGEST_START && !timer.suggested) {
      timer.suggested = true;
      if (now) timer.suggestAt = now;
      suggest = true;
    }
    if (timer.left <= 0) {
      timer.running = false;
      timer.left = 0;
      timer.elapsed = timer.total;
      state.phase = 'calmer';
      return { finished: true, kind: timer.kind, suggest: suggest };
    }
    return { finished: false, suggest: suggest };
  }

  function suggestionVisible(timer, now) {
    if (!timer || timer.kind !== 'walk' || !timer.suggested || timer.dismissed) return false;
    const inWindow = timer.elapsed >= SUGGEST_START && timer.elapsed < SUGGEST_END;
    const holding = timer.suggestAt && now && (now - timer.suggestAt) < 8000;
    return inWindow || !!holding;
  }

  function dismissSuggestion(state) {
    if (state.fight && state.fight.timer) state.fight.timer.dismissed = true;
  }

  function skipTimer(state, now) {
    const timer = state.fight && state.fight.timer;
    if (!timer) return { jumped: false };
    if (state.phase !== 'sit' && state.phase !== 'walk') return { jumped: false };
    if (timer.kind === 'walk' && !timer.suggested) {
      timer.elapsed = SUGGEST_START + 20;
      timer.left = timer.total - timer.elapsed;
      timer.suggested = true;
      if (now) timer.suggestAt = now;
      return { jumped: 'suggestion', finished: false };
    }
    timer.elapsed = timer.total;
    timer.left = 0;
    timer.running = false;
    state.phase = 'calmer';
    return { jumped: 'end', finished: true, kind: timer.kind };
  }

  function dueCue(timer) {
    if (!timer || timer.kind !== 'sit') return null;
    let index = -1;
    for (let i = 0; i < SIT_CUES.length; i++) {
      if (timer.elapsed >= SIT_CUES[i].at) index = i;
    }
    if (index < 0 || index === timer.cueSpoken) return null;
    return { index: index, text: SIT_CUES[index].text };
  }

  function consumeCue(state) {
    const timer = state.fight && state.fight.timer;
    const due = dueCue(timer);
    if (!due) return null;
    timer.cueSpoken = due.index;
    timer.cueText = due.text;
    return due.text;
  }

  function takeSuggestion(state, now) {
    const timer = state.fight && state.fight.timer;
    if (!suggestionVisible(timer, now) || timer.suggestSpoken) return null;
    timer.suggestSpoken = true;
    return WALK_SUGGESTION;
  }

  function finishLine(kind) {
    if (kind === 'sit') return 'That\u2019s five minutes.';
    return 'That\u2019s ten minutes.';
  }

  function wereCalmer(state) {
    if (!state.fight || state.phase !== 'calmer') return { ok: false };
    if (state.fight.timer) state.fight.timer.running = false;
    state.phase = 'beat';
    return { ok: true };
  }

  function beatLine(state) {
    if (state.fight && state.fight.path === 'separately') return BEAT_SEPARATE;
    return BEAT_TOGETHER;
  }

  function currentTogetherQuestion(state) {
    if (!state.fight) return null;
    const bag = state.fight.questions;
    const item = TOGETHER_QUESTIONS[bag.index];
    if (!item) return null;
    return { id: item.id, draft: true, prompt: item.prompt, turn: bag.turn, index: bag.index, total: TOGETHER_QUESTIONS.length };
  }

  function answerTogether(state, text, now) {
    if (!state.fight || state.phase !== 'questions') return { ok: false, reason: 'step' };
    const bag = state.fight.questions;
    const item = TOGETHER_QUESTIONS[bag.index];
    if (!item) return { ok: false, reason: 'done' };
    const clean = String(text || '').trim().slice(0, 600);
    if (!clean) return { ok: false, reason: 'empty' };
    const who = bag.turn;
    bag.answers.push({ qid: item.id, draft: true, who: who, prompt: item.prompt, text: clean, at: stamp(state, now) });
    const starter = state.fight.starter;
    if (who === starter) {
      bag.turn = other(starter);
      return { ok: true, done: false };
    }
    if (bag.index < TOGETHER_QUESTIONS.length - 1) {
      bag.index += 1;
      bag.turn = starter;
      return { ok: true, done: false };
    }
    state.fight.method = methodFromTogether(state);
    openTalk(state, now);
    return { ok: true, done: true };
  }

  function methodFromTogether(state) {
    const fight = state.fight;
    const text = fight.questions.answers.map(a => a.text).join(' ').toLowerCase();
    let methodName = 'Speaker and listener';
    if (/space|break|overwhelm|flood|sharp|angry|hot|tight|shaky/.test(text)) methodName = 'Short turns, then a breath';
    else if (/safe|scared|nervous|worry/.test(text)) methodName = 'One feeling each, slowly';
    const starter = name(state, fight.starter);
    const partner = name(state, other(fight.starter));
    const line = starter + ', ' + partner + ', thank you. Based on what you just said, let\u2019s try ' + methodName + '. ' + starter + ', one sentence starting with I feel. ' + partner + ', you only listen. I won\u2019t pick a side.';
    return { name: methodName, line: line, source: 'together-questions', separated: false };
  }

  function methodFromSeparate(state) {
    const fight = state.fight;
    const text = ['A', 'B'].flatMap(w => fight.separate[w].answers.map(a => a.text)).join(' ').toLowerCase();
    let methodName = 'Slow return';
    if (/real break|overwhelmed|short break/.test(text)) methodName = 'One feeling each, then stop';
    const starter = name(state, fight.starter);
    const partner = name(state, other(fight.starter));
    const line = 'You each took space, so this one gets a slower exercise: ' + methodName + '. ' + starter + ', one sentence starting with I feel. ' + partner + ', just listen. I\u2019m not on either side.';
    return { name: methodName, line: line, source: 'separate-quiz', separated: true };
  }

  function openTalk(state, now) {
    const fight = state.fight;
    fight.talk.messages.push({ from: 'bun', text: fight.method.line, at: stamp(state, now) });
    fight.talk.step = 'speak';
    fight.talk.speaker = fight.starter;
    fight.talk.round = 0;
    state.phase = 'talk';
  }

  function advanceBeat(state, now) {
    if (state.phase !== 'beat' || !state.fight) return { ok: false };
    if (state.fight.path === 'separately') {
      if (!state.fight.method) state.fight.method = methodFromSeparate(state);
      openTalk(state, now);
      return { ok: true };
    }
    state.phase = 'questions';
    state.fight.questions.index = 0;
    state.fight.questions.turn = state.fight.starter;
    return { ok: true };
  }

  function acceptPush(state, who) {
    const mine = state.fight && state.fight.separate[who];
    if (!mine || !mine.invited) return { ok: false };
    mine.accepted = true;
    state.focusWho = who;
    return { ok: true };
  }

  function startSafe(state, who) {
    const mine = state.fight && state.fight.separate[who];
    if (!mine || !mine.accepted) return { ok: false };
    mine.started = true;
    state.focusWho = who;
    return { ok: true };
  }

  function separateQuestion(state, who) {
    const mine = state.fight && state.fight.separate[who];
    if (!mine) return null;
    const item = SEPARATE_QUESTIONS[mine.index];
    if (!item) return null;
    return {
      id: item.id,
      draft: true,
      prompt: item.prompt,
      choices: item.choices || null,
      skippable: !!item.skippable,
      index: mine.index,
      total: SEPARATE_QUESTIONS.length,
      answered: mine.answers.length,
      enough: mine.answers.length >= SEPARATE_ENOUGH,
    };
  }

  function answerSeparate(state, who, text, now) {
    const mine = state.fight && state.fight.separate[who];
    if (!mine || !mine.started || mine.finished) return { ok: false, reason: 'step' };
    const item = SEPARATE_QUESTIONS[mine.index];
    if (!item) return { ok: false, reason: 'done' };
    const clean = String(text || '').trim().slice(0, 600);
    if (!clean) return { ok: false, reason: 'empty' };
    mine.answers.push({ qid: item.id, draft: true, prompt: item.prompt, text: clean, at: stamp(state, now) });
    mine.index += 1;
    if (mine.index >= SEPARATE_QUESTIONS.length) mine.finished = true;
    return { ok: true, enough: mine.answers.length >= SEPARATE_ENOUGH, finished: mine.finished };
  }

  function finishQuiz(state, who) {
    const mine = state.fight && state.fight.separate[who];
    if (!mine) return { ok: false };
    if (mine.answers.length < SEPARATE_ENOUGH) return { ok: false, reason: 'need' };
    mine.finished = true;
    return { ok: true };
  }

  function markReady(state, who, now) {
    const mine = state.fight && state.fight.separate[who];
    if (!mine || !mine.finished) return { ok: false, reason: 'quiz' };
    mine.ready = true;
    const both = state.fight.separate.A.ready && state.fight.separate.B.ready;
    if (both) {
      state.fight.method = methodFromSeparate(state);
      state.phase = 'beat';
    }
    return { ok: true, both: both };
  }

  function scriptedTalkLine(state, step) {
    const talk = state.fight.talk;
    const speakerName = name(state, talk.speaker);
    const listenerName = name(state, other(talk.speaker));
    if (step === 'reflect') {
      return 'From your side, ' + speakerName + ', that sounds like a lot, and the feeling makes sense. ' + listenerName + ', say back what you heard, in your own words. I\u2019m not deciding who\u2019s right.';
    }
    if (step === 'check') {
      if (talk.round === 0) {
        return 'Thank you, ' + listenerName + '. Now ' + listenerName + ', your turn. One sentence, starting with I feel. ' + speakerName + ', just listen.';
      }
      return 'Thank you, both. You said it, and you said it back. Let\u2019s seal one small thing, in your own words.';
    }
    if (step === 'heat') {
      return 'This is getting sharp, so let\u2019s slow down. Three breaths. Nobody has to win this. We can pause if you need.';
    }
    return '';
  }

  function submitTalk(state, text, now) {
    if (!state.fight || state.phase !== 'talk') return { ok: false, reason: 'step' };
    const talk = state.fight.talk;
    const clean = String(text || '').trim().slice(0, 600);
    if (!clean) return { ok: false, reason: 'empty' };
    if (talk.step !== 'speak' && talk.step !== 'listen') return { ok: false, reason: 'step' };
    const who = talk.step === 'listen' ? other(talk.speaker) : talk.speaker;
    talk.messages.push({ from: who, text: clean, at: stamp(state, now) });
    const need = talk.step === 'speak' ? 'reflect' : 'check';
    talk.step = 'thinking';
    return { ok: true, need: need, who: who };
  }

  function deliverBun(state, text, purpose, now) {
    if (!state.fight) return { ok: false };
    const talk = state.fight.talk;
    const clean = String(text || '').trim();
    if (!clean) return { ok: false };
    talk.messages.push({ from: 'bun', text: clean, at: stamp(state, now) });
    if (purpose === 'reflect') {
      talk.step = 'listen';
      return { ok: true };
    }
    if (purpose === 'check') {
      if (talk.round === 0) {
        talk.round = 1;
        talk.speaker = other(talk.speaker);
        talk.step = 'speak';
        return { ok: true };
      }
      talk.step = 'close';
      state.phase = 'close';
      return { ok: true, closed: true };
    }
    if (purpose === 'heat') return { ok: true };
    return { ok: true };
  }

  function nudgeHeat(state, now) {
    if (!state.fight || state.phase !== 'talk') return null;
    const talk = state.fight.talk;
    if (talk.step === 'thinking' || talk.step === 'close') return null;
    const line = scriptedTalkLine(state, 'heat');
    talk.messages.push({ from: 'bun', text: line, at: stamp(state, now) });
    return line;
  }

  function setRepair(state, repair) {
    if (!state.fight || state.phase !== 'close') return { ok: false };
    state.fight.talk.repair = String(repair || '').slice(0, 60);
    return { ok: true };
  }

  function dateBits(ms) {
    const d = new Date(ms);
    const iso = d.toISOString().slice(0, 10);
    const pretty = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const month = MONTHS[d.getMonth()];
    const clock = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return { iso: iso, pretty: pretty, month: month, clock: clock };
  }

  function followupComplete(entry) {
    return ['A', 'B'].every(who => entry.followup[who] && entry.followup[who].kind !== 'postpone');
  }

  function rebuildSearch(entry) {
    const bits = [
      entry.topic, entry.summary, entry.path, entry.wind, entry.methodName,
      entry.dates.iso, entry.dates.pretty, entry.dates.month, entry.dates.clock,
      entry.names.A, entry.names.B,
    ];
    entry.commitments.forEach(text => bits.push(text));
    entry.wording.forEach(row => bits.push(row.text));
    ['A', 'B'].forEach(who => {
      const item = entry.followup[who];
      if (!item || item.kind === 'postpone') return;
      bits.push(item.feel, item.why, item.note, item.kind);
    });
    entry.search = bits.filter(Boolean).join(' ').toLowerCase();
  }

  function closeFight(state, input, now) {
    if (!state.fight || (state.phase !== 'close' && state.phase !== 'talk')) return { ok: false };
    const fight = state.fight;
    const when = stamp(state, now);
    const agreement = String((input && input.agreement) || '').trim().slice(0, 240);
    const topic = String((input && input.topic) || '').trim().slice(0, 80);
    const repair = String((input && input.repair) || fight.talk.repair || '').slice(0, 60);
    const resolved = !!(input && input.resolved);
    if (agreement) fight.talk.messages.push({ from: 'commitment', text: agreement, at: when });
    const wording = [];
    fight.questions.answers.forEach(answer => {
      wording.push({ from: answer.who, text: answer.text, prompt: answer.prompt, kind: 'together-question' });
    });
    fight.talk.messages.forEach(message => {
      if (!message.text) return;
      const kind = message.from === 'bun' ? 'bun' : message.from === 'commitment' ? 'commitment' : 'talk';
      wording.push({ from: message.from, text: message.text, kind: kind });
    });
    const entry = {
      id: rid('log'),
      fightId: fight.id,
      sessionId: fight.sessionId,
      starter: fight.starter,
      starterUserId: fight.starterUserId,
      subscriber: state.subscriber,
      partnerJoinsFree: true,
      names: { A: name(state, 'A'), B: name(state, 'B') },
      users: { A: state.users.A, B: state.users.B },
      startedAt: fight.startedAt,
      endedAt: when,
      path: fight.path,
      wind: fight.wind,
      via: fight.via,
      topic: topic,
      resolved: resolved,
      repair: repair,
      methodName: fight.method ? fight.method.name : '',
      methodSource: fight.method ? fight.method.source : '',
      separated: !!(fight.method && fight.method.separated),
      summary: '',
      commitments: agreement ? [agreement] : [],
      wording: wording,
      quiz: {
        A: fight.separate.A.answers.map(a => ({ prompt: a.prompt, text: a.text })),
        B: fight.separate.B.answers.map(a => ({ prompt: a.prompt, text: a.text })),
      },
      followup: { A: null, B: null },
      complete: false,
      dates: dateBits(fight.startedAt),
      search: '',
    };
    entry.summary = buildSummary(entry);
    rebuildSearch(entry);
    state.history.unshift(entry);
    state.followupFightId = entry.id;
    state.phase = 'done';
    state.fight = null;
    return { ok: true, entry: entry };
  }

  function buildSummary(entry) {
    const pair = entry.names.A + ' and ' + entry.names.B;
    const starter = entry.names[entry.starter];
    let how = pair + ' opened Simmer.';
    if (entry.path === 'separately') how = pair + ' took space on their own phones, then talked on ' + starter + '\u2019s phone.';
    else if (entry.wind === 'sit') how = pair + ' sat still together for five minutes, then talked.';
    else if (entry.wind === 'walk') how = pair + ' walked it off together, then talked.';
    const end = entry.resolved ? 'It felt resolved.' : 'It was not marked resolved. The log is kept anyway.';
    const commit = entry.commitments.length ? ' Commitment, in their words: \u201c' + entry.commitments[0] + '\u201d.' : '';
    return 'Simmer was used. Here\u2019s the summary. ' + how + ' ' + end + commit;
  }

  function searchHistory(history, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return history.slice();
    return history.filter(entry => entry.search.includes(q));
  }

  function currentFollowupEntry(state) {
    if (state.followupFightId) {
      const found = state.history.find(entry => entry.id === state.followupFightId);
      if (found) return found;
    }
    return state.history[0] || null;
  }

  function followupIsDue(state, now) {
    const entry = currentFollowupEntry(state);
    if (!entry) return false;
    return stamp(state, now) >= entry.startedAt + HOUR_MS;
  }

  function simulateHour(state, now) {
    if (!state.history.length) return { ok: false, reason: 'nolog' };
    state.clockOffset += HOUR_MS;
    if (!state.followupFightId) state.followupFightId = state.history[0].id;
    state.phase = 'followup';
    state.overlay = { A: null, B: null };
    return { ok: true, due: followupIsDue(state, now) };
  }

  function openFollowup(state, now) {
    if (!followupIsDue(state, now)) return { ok: false, reason: 'early' };
    state.phase = 'followup';
    state.overlay = { A: null, B: null };
    return { ok: true };
  }

  function saveFollowup(state, who, now) {
    const entry = currentFollowupEntry(state);
    const draft = state.followDraft[who];
    if (!entry || !draft) return { ok: false };
    if (!draft.feel && !draft.resolved) return { ok: false, reason: 'empty' };
    entry.followup[who] = {
      kind: 'answer',
      feel: draft.feel,
      resolved: draft.resolved,
      why: draft.resolved === 'no' ? draft.why : '',
      note: String(draft.note || '').trim().slice(0, 600),
      at: stamp(state, now),
    };
    entry.complete = followupComplete(entry);
    rebuildSearch(entry);
    state.followDraft[who] = emptyDraft();
    return { ok: true, complete: entry.complete };
  }

  function followupNoFeedback(state, who, now) {
    const entry = currentFollowupEntry(state);
    if (!entry) return { ok: false };
    entry.followup[who] = { kind: 'nofeedback', at: stamp(state, now) };
    entry.complete = followupComplete(entry);
    rebuildSearch(entry);
    state.followDraft[who] = emptyDraft();
    return { ok: true, complete: entry.complete };
  }

  function followupPostpone(state, who, now) {
    const entry = currentFollowupEntry(state);
    if (!entry) return { ok: false };
    entry.followup[who] = { kind: 'postpone', at: stamp(state, now) };
    entry.complete = followupComplete(entry);
    rebuildSearch(entry);
    return { ok: true, complete: entry.complete };
  }

  function clearFollowup(state, who) {
    const entry = currentFollowupEntry(state);
    if (!entry) return { ok: false };
    entry.followup[who] = null;
    entry.complete = followupComplete(entry);
    rebuildSearch(entry);
    return { ok: true };
  }

  function patchFollowDraft(state, who, patch) {
    const draft = state.followDraft[who];
    if (!draft || !patch) return;
    if (patch.feel != null) draft.feel = patch.feel;
    if (patch.resolved != null) draft.resolved = patch.resolved;
    if (patch.why != null) draft.why = patch.why;
    if (patch.note != null) draft.note = String(patch.note).slice(0, 600);
  }

  function presentLog(entry, who) {
    return {
      id: entry.id,
      sessionId: entry.sessionId,
      starter: entry.starter,
      starterUserId: entry.starterUserId,
      names: entry.names,
      users: entry.users,
      startedAt: entry.startedAt,
      dates: entry.dates,
      topic: entry.topic,
      path: entry.path,
      wind: entry.wind,
      resolved: entry.resolved,
      repair: entry.repair,
      summary: entry.summary,
      commitments: entry.commitments,
      wording: entry.wording,
      methodName: entry.methodName,
      followup: entry.followup,
      complete: entry.complete,
      partnerJoinsFree: entry.partnerJoinsFree,
      myQuiz: (entry.quiz && entry.quiz[who]) || [],
    };
  }

  function openHistory(state, who) {
    state.overlay[who] = 'history';
  }

  function openLogEntry(state, who, id) {
    state.overlay[who] = 'log:' + id;
  }

  function closeOverlay(state, who) {
    state.overlay[who] = null;
  }

  function showSafety(state, who) {
    if (who === 'A' || who === 'B') state.safety[who] = true;
  }

  function hideSafety(state, who) {
    if (who === 'A' || who === 'B') state.safety[who] = false;
  }

  function another(state) {
    state.phase = 'idle';
    state.fight = null;
    state.sessionId = null;
    state.launchedBy = null;
    state.launchVia = null;
    state.overlay = { A: null, B: null };
    state.safety = { A: false, B: false };
    state.clockOffset = 0;
    state.said = {};
  }

  function waitingLine(state) {
    return 'This session is on ' + name(state, state.fight.starter) + '\u2019s phone.';
  }

  function handoffLine(state) {
    const starter = name(state, state.fight.starter);
    if (state.phase === 'close') return 'Saving this on ' + starter + '\u2019s phone.';
    return 'Continuing on ' + starter + '\u2019s phone.';
  }

  function safeTitle(state, who) {
    return name(state, who) + ' with Bun';
  }

  function whisper(screen) {
    if (['wind', 'choice', 'sit-ready', 'sit', 'walk-ready', 'walk', 'calmer', 'safe', 'quiz', 'ready', 'push'].indexOf(screen) >= 0) return 'Wind down';
    if (['beat', 'questions', 'talk', 'close'].indexOf(screen) >= 0) return 'Talk it through';
    return '';
  }

  function fmtClock(seconds) {
    const left = Math.max(0, Number(seconds) || 0);
    const total = left <= 0 ? 0 : Math.ceil(left - 1e-9);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function skipLabel(state) {
    const timer = state.fight && state.fight.timer;
    if (timer && timer.kind === 'walk' && !timer.suggested) return 'Skip to the suggestion';
    return 'Skip to the end';
  }

  function viewFor(state, who) {
    if (state.safety && state.safety[who]) return { screen: 'safety', who: who };
    const overlay = state.overlay && state.overlay[who];
    if (overlay) {
      if (overlay.indexOf('log:') === 0) {
        const id = overlay.slice(4);
        const entry = state.history.find(item => item.id === id);
        if (!entry) return { screen: 'history', who: who };
        return { screen: 'log', who: who, logId: id };
      }
      return { screen: 'history', who: who };
    }
    if (state.phase === 'followup') return { screen: 'followup', who: who };
    if (state.phase === 'done') return { screen: 'done', who: who };
    if (state.phase === 'idle' || !state.fight) return { screen: 'launch', who: who };

    const fight = state.fight;
    const onStarter = who === fight.starter;
    if (fight.path === 'separately' && state.phase === 'apart') return apartView(state, who);
    if (fight.path === 'separately' && (state.phase === 'beat' || state.phase === 'talk' || state.phase === 'close')) {
      if (!onStarter) return { screen: 'handoff', who: who, sessionId: fight.sessionId, starter: fight.starter };
      return { screen: state.phase, who: who, sessionId: fight.sessionId, starter: fight.starter };
    }
    if (!onStarter) return { screen: 'waiting', who: who, sessionId: fight.sessionId, starter: fight.starter, phase: state.phase };
    return { screen: state.phase, who: who, sessionId: fight.sessionId, starter: fight.starter };
  }

  function apartView(state, who) {
    const mine = state.fight.separate[who];
    const sessionId = state.fight.sessionId;
    if (!mine.accepted) return { screen: 'push', who: who, starter: state.fight.starter, sessionId: sessionId };
    if (!mine.started) return { screen: 'safe', who: who, sessionId: sessionId };
    if (!mine.finished) return { screen: 'quiz', who: who, sessionId: sessionId };
    return { screen: 'ready', who: who, sessionId: sessionId, partnerReady: state.fight.separate[other(who)].ready };
  }

  function memoryForCoach(state) {
    const fight = state.fight;
    if (!fight || !fight.method) return '';
    if (fight.path === 'separately') {
      return 'They chose to wind down separately, which means this moment is more intense. Both did a private quiz that you must not quote or reveal. Method: ' + fight.method.name + '. Stay neutral. Do not take a side. Do not ask whose phone. Coaching, not therapy.';
    }
    const said = fight.questions.answers.map(a => name(state, a.who) + ': ' + a.text).join(' | ');
    return 'They wound down together (' + (fight.wind || 'together') + '). Spoken answers: ' + said + '. Method: ' + fight.method.name + '. Stay neutral. Do not take a side. Coaching, not therapy.';
  }

  function questionsDiffer() {
    const together = {};
    TOGETHER_QUESTIONS.forEach(q => { together[q.prompt] = true; together[q.id] = true; });
    return SEPARATE_QUESTIONS.every(q => !together[q.prompt] && !together[q.id]);
  }

  const api = {
    STORAGE_KEY, STATE_VERSION, SIT_SECONDS, WALK_SECONDS, SUGGEST_START, SUGGEST_END, SEPARATE_ENOUGH, HOUR_MS,
    WIDGET_LABEL, WIDGET_NOTE, WIND_LINE, SIT_READY, WALK_READY, SIT_BLURB, WALK_BLURB, WALK_SUGGESTION, CALMER_LABEL,
    SAFE_LINE, SAFE_HINT, BEAT_TOGETHER, BEAT_SEPARATE, SIT_CUES, TOGETHER_QUESTIONS, SEPARATE_QUESTIONS,
    REPAIRS, FEELS, WHYS,
    createState, name, other, stamp, setNames, planLine, launch, chooseFork, backToFork, chooseTogether, chooseSeparate,
    backToWind, chooseBody, startTimer, tickTimer, suggestionVisible, dismissSuggestion, skipTimer, consumeCue, takeSuggestion,
    finishLine, wereCalmer, beatLine, currentTogetherQuestion, answerTogether, advanceBeat, acceptPush, startSafe,
    separateQuestion, answerSeparate, finishQuiz, markReady, scriptedTalkLine, submitTalk, deliverBun, nudgeHeat, setRepair,
    closeFight, searchHistory, followupIsDue, simulateHour, openFollowup, saveFollowup, followupNoFeedback, followupPostpone,
    clearFollowup, patchFollowDraft, presentLog, currentFollowupEntry, openHistory, openLogEntry, closeOverlay, showSafety,
    hideSafety, another, waitingLine, handoffLine, safeTitle, whisper, fmtClock, skipLabel, viewFor, memoryForCoach,
    questionsDiffer, followupComplete,
  };

  if (typeof window !== 'undefined') window.SimmerTestFlow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
