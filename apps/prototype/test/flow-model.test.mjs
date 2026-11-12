// The 12 Nov 2026 fight-mode test page. Logic only; the live /app/ flow is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const load = () => {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../app/test/flow-model.js', import.meta.url), 'utf8'), ctx);
  return ctx.window.SimmerTestFlow;
};

const M = load();

function boot(who = 'A', via = 'widget') {
  const state = M.createState(1_000);
  M.setNames(state, 'Tyler', 'Iryna');
  const launched = M.launch(state, who, via, 1_000);
  assert.equal(launched.ok, true);
  return state;
}

function answerAllTogether(state) {
  M.advanceBeat(state, 2_000);
  for (let i = 0; i < 3; i++) {
    assert.equal(state.fight.questions.turn, state.fight.starter);
    assert.equal(M.answerTogether(state, 'My body is tight ' + i, 3_000 + i).ok, true);
    if (i < 2 || state.phase === 'questions') {
      assert.equal(M.answerTogether(state, 'I want some quiet ' + i, 3_100 + i).ok, true);
    }
  }
}

test('widget label is not Pause, and the two question sets differ', () => {
  assert.equal(M.WIDGET_LABEL, 'Start Simmer');
  assert.match(M.WIDGET_NOTE, /TBD/);
  assert.notEqual(M.WIDGET_LABEL.toLowerCase(), 'pause');
  assert.equal(M.TOGETHER_QUESTIONS.length, 3);
  assert.equal(M.SEPARATE_QUESTIONS.length, 5);
  assert.equal(M.SEPARATE_ENOUGH, 3);
  assert.equal(M.questionsDiffer(), true);
  for (const q of M.TOGETHER_QUESTIONS) assert.equal(q.draft, true);
  for (const q of M.SEPARATE_QUESTIONS) {
    assert.equal(q.draft, true);
    assert.doesNotMatch(q.prompt, /separately/i);
  }
  assert.doesNotMatch(M.SAFE_LINE + M.SAFE_HINT, /separately/i);
  assert.notEqual(M.STORAGE_KEY, 'simmer-couple');
});

test('launch stores a session and user id, partner still joins free', () => {
  const state = boot('B', 'siri');
  assert.equal(state.phase, 'fork');
  assert.equal(state.launchVia, 'siri');
  assert.equal(state.fight.starter, 'B');
  assert.equal(state.sessionId, state.fight.sessionId);
  assert.equal(state.fight.starterUserId, state.users.B);
  assert.match(state.sessionId, /^ses_/);
  assert.match(state.users.A, /^usr_/);
  assert.equal(state.subscriber, 'A');
  assert.equal(state.partnerJoinsFree, true);
  assert.match(M.planLine(state), /Iryna joins free/);
  assert.equal(M.viewFor(state, 'A').screen, 'waiting');
  assert.equal(M.viewFor(state, 'B').screen, 'fork');
});

test('chill is a dead end with a way back, and does not start wind-down', () => {
  const state = boot();
  M.chooseFork(state, 'chill');
  assert.equal(state.phase, 'chill');
  assert.equal(state.fight.path, null);
  M.backToFork(state);
  assert.equal(state.phase, 'fork');
});

test('together sit-still is five minutes, one calmer click, then three spoken turns', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  assert.equal(state.phase, 'wind');
  assert.equal(M.viewFor(state, 'A').screen, 'wind');
  M.chooseTogether(state);
  assert.equal(state.phase, 'choice');
  M.chooseBody(state, 'sit');
  assert.equal(state.phase, 'sit-ready');
  M.startTimer(state);
  assert.equal(state.fight.timer.total, M.SIT_SECONDS);
  assert.equal(state.fight.timer.total, 300);
  const first = M.consumeCue(state);
  assert.match(first, /Breathe in/);
  M.skipTimer(state, 5_000);
  assert.equal(state.phase, 'calmer');
  assert.equal(M.wereCalmer(state).ok, true);
  assert.equal(state.phase, 'beat');
  assert.match(M.beatLine(state), /calmer/i);
  assert.doesNotMatch(M.beatLine(state), /press start/i);
  answerAllTogether(state);
  assert.equal(state.phase, 'talk');
  assert.equal(state.fight.questions.answers.length, 6);
  assert.equal(state.fight.method.separated, false);
  assert.equal(state.fight.starter, 'A');
  assert.equal(M.viewFor(state, 'B').screen, 'waiting');
  assert.doesNotMatch(M.waitingLine(state), /whose phone/i);
});

test('walk suggestion shows around minute 3 to 4 and not before', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  M.chooseTogether(state);
  M.chooseBody(state, 'walk');
  M.startTimer(state);
  assert.equal(state.fight.timer.total, 600);
  M.tickTimer(state, 179, 0);
  assert.equal(M.suggestionVisible(state.fight.timer, 0), false);
  M.tickTimer(state, 1, 0);
  assert.equal(state.fight.timer.elapsed, 180);
  assert.equal(M.suggestionVisible(state.fight.timer, 0), true);
  assert.equal(M.takeSuggestion(state, 0), M.WALK_SUGGESTION);
  assert.equal(M.takeSuggestion(state, 0), null);
  state.fight.timer.elapsed = 239;
  assert.equal(M.suggestionVisible(state.fight.timer, 0), true);
  state.fight.timer.elapsed = 240;
  assert.equal(M.suggestionVisible(state.fight.timer, 0), false);
});

test('a 30-second reviewer tick still lands inside the suggestion window', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  M.chooseTogether(state);
  M.chooseBody(state, 'walk');
  M.startTimer(state);
  let saw = false;
  for (let i = 0; i < 40 && state.phase === 'walk'; i++) {
    M.tickTimer(state, 30, 0);
    if (state.fight && M.suggestionVisible(state.fight.timer, 0)) saw = true;
  }
  assert.equal(saw, true);
  assert.equal(state.phase, 'calmer');
});

test('skip on a walk stops at the suggestion first', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  M.chooseTogether(state);
  M.chooseBody(state, 'walk');
  M.startTimer(state);
  const first = M.skipTimer(state, 9_000);
  assert.equal(first.jumped, 'suggestion');
  assert.equal(state.phase, 'walk');
  assert.equal(M.suggestionVisible(state.fight.timer, 9_000), true);
  const second = M.skipTimer(state, 9_000);
  assert.equal(second.jumped, 'end');
  assert.equal(state.phase, 'calmer');
});

test('separately uses both phones, then stage 2 returns to the starter', () => {
  const state = boot('A', 'widget');
  const session = state.sessionId;
  M.chooseFork(state, 'fight');
  M.chooseSeparate(state);
  assert.equal(M.viewFor(state, 'A').screen, 'safe');
  assert.equal(M.viewFor(state, 'B').screen, 'push');
  assert.equal(M.safeTitle(state, 'A'), 'Tyler with Bun');
  assert.equal(M.safeTitle(state, 'B'), 'Iryna with Bun');
  M.acceptPush(state, 'B');
  assert.equal(M.viewFor(state, 'B').screen, 'safe');
  M.startSafe(state, 'A');
  M.startSafe(state, 'B');
  assert.equal(M.finishQuiz(state, 'A').ok, false);
  M.answerSeparate(state, 'A', 'A real break', 10);
  M.answerSeparate(state, 'A', 'I feel overwhelmed', 11);
  assert.equal(M.finishQuiz(state, 'A').ok, false);
  M.answerSeparate(state, 'A', 'Go slow', 12);
  assert.equal(M.finishQuiz(state, 'A').ok, true);
  M.finishQuiz(state, 'A');
  M.answerSeparate(state, 'B', 'A few minutes', 13);
  M.answerSeparate(state, 'B', 'I don\u2019t feel heard', 14);
  M.answerSeparate(state, 'B', 'secret zebra from Iryna', 15);
  M.finishQuiz(state, 'B');
  assert.equal(M.viewFor(state, 'A').screen, 'ready');
  assert.equal(M.markReady(state, 'A', 20).both, false);
  assert.equal(state.phase, 'apart');
  const ready = M.markReady(state, 'B', 21);
  assert.equal(ready.both, true);
  assert.equal(state.phase, 'beat');
  assert.equal(state.fight.method.separated, true);
  assert.equal(M.viewFor(state, 'A').screen, 'beat');
  assert.equal(M.viewFor(state, 'B').screen, 'handoff');
  assert.doesNotMatch(M.handoffLine(state), /whose phone|which phone/i);
  M.advanceBeat(state, 22);
  assert.equal(state.phase, 'talk');
  assert.equal(state.sessionId, session);
  assert.equal(state.fight.starter, 'A');
  assert.equal(state.fight.starterUserId, state.users.A);
  assert.equal(M.viewFor(state, 'B').screen, 'handoff');
  assert.match(M.memoryForCoach(state), /separately/);
  assert.match(M.memoryForCoach(state), /must not quote/);
  assert.equal(M.memoryForCoach(state).includes('secret zebra'), false);
});

test('talk it through can close unresolved and still writes a shared log', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  M.chooseTogether(state);
  M.chooseBody(state, 'walk');
  M.startTimer(state);
  M.skipTimer(state, 1);
  M.skipTimer(state, 1);
  M.wereCalmer(state);
  answerAllTogether(state);
  assert.equal(M.submitTalk(state, 'I feel cornered about the weekend.', 50).need, 'reflect');
  M.deliverBun(state, M.scriptedTalkLine(state, 'reflect'), 'reflect', 51);
  assert.equal(state.fight.talk.step, 'listen');
  M.submitTalk(state, 'What I heard is you feel cornered about the weekend.', 52);
  M.deliverBun(state, M.scriptedTalkLine(state, 'check'), 'check', 53);
  assert.equal(state.fight.talk.speaker, 'B');
  M.submitTalk(state, 'I feel unheard about the weekend.', 54);
  M.deliverBun(state, M.scriptedTalkLine(state, 'reflect'), 'reflect', 55);
  M.submitTalk(state, 'What I heard is you feel unheard.', 56);
  M.deliverBun(state, M.scriptedTalkLine(state, 'check'), 'check', 57);
  assert.equal(state.phase, 'close');
  const heatState = { fight: { talk: { speaker: 'A', round: 0 } }, names: state.names };
  assert.doesNotMatch(M.scriptedTalkLine(heatState, 'heat'), /you always|your fault|you\u2019re right/i);
  assert.doesNotMatch(M.scriptedTalkLine(heatState, 'reflect'), /you always|your fault|you\u2019re right/i);
  const closed = M.closeFight(state, { resolved: false, topic: 'weekend plans', agreement: 'We\u2019ll talk about plans before Saturday.', repair: 'A hug' }, 80);
  assert.equal(closed.ok, true);
  assert.equal(state.phase, 'done');
  assert.equal(state.history.length, 1);
  const entry = state.history[0];
  assert.match(entry.summary, /Simmer was used\. Here\u2019s the summary/);
  assert.equal(entry.resolved, false);
  assert.equal(entry.commitments[0], 'We\u2019ll talk about plans before Saturday.');
  assert.ok(entry.wording.length > 0);
  assert.equal(entry.sessionId, state.history[0].sessionId);
  assert.equal(M.viewFor(state, 'A').screen, 'done');
  assert.equal(M.viewFor(state, 'B').screen, 'done');
  assert.equal(M.searchHistory(state.history, 'weekend').length, 1);
  assert.equal(M.searchHistory(state.history, entry.dates.iso).length, 1);
  assert.equal(M.searchHistory(state.history, 'not a real topic xyz').length, 0);
  const shown = M.presentLog(entry, 'A');
  assert.equal(shown.myQuiz.length, 0);
  assert.equal(shown.partnerQuiz, undefined);
});

test('private separate answers stay off the other phone and out of search', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  M.chooseSeparate(state);
  M.startSafe(state, 'A');
  M.acceptPush(state, 'B');
  M.startSafe(state, 'B');
  M.answerSeparate(state, 'A', 'A real break', 1);
  M.answerSeparate(state, 'A', 'I feel overwhelmed', 2);
  M.answerSeparate(state, 'A', 'tyler secret lantern', 3);
  M.finishQuiz(state, 'A');
  M.answerSeparate(state, 'B', 'A few minutes', 4);
  M.answerSeparate(state, 'B', 'I feel blamed', 5);
  M.answerSeparate(state, 'B', 'iryna secret zebra', 6);
  M.finishQuiz(state, 'B');
  M.markReady(state, 'A', 7);
  M.markReady(state, 'B', 8);
  M.advanceBeat(state, 9);
  M.submitTalk(state, 'I feel raw.', 10);
  M.deliverBun(state, 'From your side, Tyler, that sounds raw.', 'reflect', 11);
  M.submitTalk(state, 'What I heard is you feel raw.', 12);
  M.deliverBun(state, 'Thank you. Iryna, your turn.', 'check', 13);
  M.submitTalk(state, 'I feel raw too.', 14);
  M.deliverBun(state, 'From your side, Iryna, that sounds raw.', 'reflect', 15);
  M.submitTalk(state, 'What I heard is you feel raw too.', 16);
  M.deliverBun(state, 'Thank you both.', 'check', 17);
  M.closeFight(state, { resolved: true, topic: 'the dishes', agreement: 'We\u2019ll pause before we answer.', repair: '' }, 18);
  const entry = state.history[0];
  assert.equal(entry.search.includes('iryna secret zebra'), false);
  assert.equal(entry.search.includes('tyler secret lantern'), false);
  assert.equal(M.searchHistory(state.history, 'dishes').length, 1);
  const forTyler = M.presentLog(entry, 'A');
  const forIryna = M.presentLog(entry, 'B');
  assert.match(JSON.stringify(forTyler.myQuiz), /tyler secret lantern/);
  assert.equal(JSON.stringify(forTyler.myQuiz).includes('zebra'), false);
  assert.match(JSON.stringify(forIryna.myQuiz), /iryna secret zebra/);
  assert.equal(JSON.stringify(forIryna.myQuiz).includes('lantern'), false);
  assert.match(JSON.stringify(forTyler.wording), /I feel raw/);
});

test('one-hour follow-up finishes only when both answer or decline feedback', () => {
  const state = boot();
  M.chooseFork(state, 'fight');
  M.chooseTogether(state);
  M.chooseBody(state, 'sit');
  M.startTimer(state);
  M.skipTimer(state, 1);
  M.wereCalmer(state);
  answerAllTogether(state);
  M.submitTalk(state, 'I feel tired.', 1);
  M.deliverBun(state, 'From your side, that sounds tiring.', 'reflect', 2);
  M.submitTalk(state, 'I heard that you feel tired.', 3);
  M.deliverBun(state, 'Thank you. Your turn.', 'check', 4);
  M.submitTalk(state, 'I feel tired too.', 5);
  M.deliverBun(state, 'From your side, that sounds tiring.', 'reflect', 6);
  M.submitTalk(state, 'I heard that.', 7);
  M.deliverBun(state, 'Thank you both.', 'check', 8);
  M.closeFight(state, { resolved: true, topic: 'bedtime', agreement: '', repair: 'A hug' }, 1_000);
  assert.equal(M.followupIsDue(state, 1_000), false);
  assert.equal(M.simulateHour(state, 1_000).ok, true);
  assert.equal(state.phase, 'followup');
  assert.equal(M.followupIsDue(state, 1_000), true);
  assert.equal(M.viewFor(state, 'A').screen, 'followup');
  assert.equal(M.viewFor(state, 'B').screen, 'followup');
  M.patchFollowDraft(state, 'A', { feel: 'calmer', resolved: 'no', why: 'I felt unheard', note: 'still sitting with it' });
  assert.equal(M.saveFollowup(state, 'A', 1_000).complete, false);
  assert.equal(M.followupPostpone(state, 'B', 1_000).complete, false);
  assert.equal(state.history[0].complete, false);
  M.clearFollowup(state, 'B');
  assert.equal(M.followupNoFeedback(state, 'B', 1_000).complete, true);
  assert.equal(state.history[0].complete, true);
  assert.equal(M.searchHistory(state.history, 'unheard').length, 1);
});
