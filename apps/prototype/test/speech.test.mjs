// Voice session: no real microphone. A fake SpeechRecognition records start/stop
// and we feed it results, errors, and end events.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../shared/speech.js', import.meta.url), 'utf8'), context);
const { createSession, NOTES } = context.SimmerSpeech;

function result(transcript, isFinal) {
  const row = [{ transcript }];
  row.isFinal = isFinal;
  return { resultIndex: 0, results: [row] };
}

function harness(options = {}) {
  const calls = [];
  const scheduled = [];
  const texts = [];
  const states = [];
  const ends = [];
  class FakeRec {
    constructor() { this.continuous = true; calls.push(['new']); }
    start() { calls.push(['start', this]); }
    stop() { calls.push(['stop']); this.onend && this.onend(); }
  }
  const synth = {
    speaking: !!options.speaking,
    pending: false,
    cancel() { calls.push(['cancel']); this.speaking = false; },
  };
  const session = createSession({
    Rec: options.Rec === undefined ? FakeRec : options.Rec,
    synth,
    keep: !!options.keep,
    schedule(fn) { scheduled.push(fn); },
    onText(text) { texts.push(text); },
    onState(state) { states.push(state); },
    onEnd(text, state) { ends.push([text, state]); },
  });
  return { session, calls, scheduled, texts, states, ends, FakeRec };
}

function started(calls) { return calls.filter(c => c[0] === 'start').map(c => c[1]); }

test('interim text then a final line, and continuous stays off for iOS', () => {
  const h = harness({ keep: true });
  assert.equal(h.session.start(), true);
  const rec = started(h.calls).at(-1);
  assert.equal(rec.continuous, false);
  assert.equal(rec.interimResults, true);
  rec.onresult(result('I felt', false));
  rec.onresult(result('I felt left out', true));
  assert.deepEqual(h.texts, ['I felt', 'I felt left out']);
  assert.equal(h.session.listening, true);
  assert.deepEqual(h.ends, []);
});

test('a pause restarts while the Talk button is still down, and the next phrase is appended', () => {
  const h = harness({ keep: true });
  h.session.start();
  let rec = started(h.calls).at(-1);
  rec.onresult(result('I felt left out', true));
  rec.onend();
  assert.equal(h.scheduled.length, 1);
  assert.deepEqual(h.ends, []);
  h.scheduled.shift()();
  rec = started(h.calls).at(-1);
  rec.onresult(result('when you walked away', true));
  assert.equal(h.texts.at(-1), 'I felt left out when you walked away');
});

test('Chrome abort right after speechSynthesis.cancel retries, then takes the words', () => {
  const h = harness({ keep: true, speaking: true });
  h.session.start();
  assert.deepEqual(h.calls.map(c => c[0]).slice(0, 2), ['cancel', 'new']);
  assert.ok(h.calls.map(c => c[0]).includes('start'));
  let rec = started(h.calls).at(-1);
  rec.onerror({ error: 'aborted' });
  rec.onend();
  assert.equal(h.ends.length, 0);
  assert.equal(h.scheduled.length, 1);
  h.scheduled.shift()();
  rec = started(h.calls).at(-1);
  rec.onresult(result('I felt unheard', true));
  assert.equal(h.texts.at(-1), 'I felt unheard');
  assert.equal(h.session.listening, true);
});

test('repeated aborts with no words stop and explain', () => {
  const h = harness({ keep: true });
  h.session.start();
  for (let i = 0; i < 3; i++) {
    const rec = started(h.calls).at(-1);
    rec.onerror({ error: 'aborted' });
    rec.onend();
    if (h.scheduled.length) h.scheduled.shift()();
  }
  assert.deepEqual(h.ends, [['', 'failed']]);
  assert.equal(h.session.listening, false);
  assert.match(NOTES.failed, /Type instead/);
});

test('mic permission denied does not restart', () => {
  const h = harness({ keep: true });
  h.session.start();
  const rec = started(h.calls).at(-1);
  rec.onerror({ error: 'not-allowed' });
  rec.onend();
  assert.deepEqual(h.scheduled, []);
  assert.deepEqual(h.ends, [['', 'denied']]);
  assert.match(NOTES.denied, /blocked/);
});

test('stopping does not restart and returns what was said', () => {
  const h = harness({ keep: true });
  h.session.start();
  const rec = started(h.calls).at(-1);
  rec.onresult(result('hello', true));
  h.session.stop();
  assert.deepEqual(h.scheduled, []);
  assert.deepEqual(h.ends, [['hello', 'idle']]);
  assert.equal(h.session.listening, false);
});

test('one-shot mode ends after the phrase instead of restarting', () => {
  const h = harness({ keep: false });
  h.session.start();
  const rec = started(h.calls).at(-1);
  rec.onresult(result('we are in a fight', true));
  rec.onend();
  assert.deepEqual(h.scheduled, []);
  assert.deepEqual(h.ends, [['we are in a fight', 'idle']]);
});

test('no recognizer reports unsupported and does not throw', () => {
  const h = harness({ Rec: null });
  assert.equal(h.session.start(), false);
  assert.deepEqual(h.ends, [['', 'unsupported']]);
  assert.match(NOTES.unsupported, /isn’t available/);
});

test('hush leaves speech synthesis alone when Bun is not talking', () => {
  const h = harness({ speaking: false });
  h.session.start();
  assert.equal(h.calls.some(c => c[0] === 'cancel'), false);
});

test('the live app loads the session and does not start the mic under a focused field', () => {
  const app = fs.readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(html, /\/shared\/speech\.js/);
  assert.match(app, /SimmerSpeech\.createSession/);
  assert.match(app, /el\.blur\(\)/);
  assert.match(app, /api\.listening/);
  const chat = fs.readFileSync(new URL('../chat/app.js', import.meta.url), 'utf8');
  const chatHtml = fs.readFileSync(new URL('../chat/index.html', import.meta.url), 'utf8');
  assert.match(chatHtml, /\/shared\/speech\.js/);
  assert.match(chat, /SimmerSpeech\.createSession/);
});
