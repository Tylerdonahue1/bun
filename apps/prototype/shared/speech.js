/* One Talk tap has to survive two browser bugs:
   Chrome aborts recognition that starts in the same turn as speechSynthesis.cancel()
   (Bun was just speaking). iOS Safari returns no words when continuous is true, and
   ends the session at every pause. Restarts stay inside the original tap. */
(function () {
  const FATAL = { 'not-allowed': 'denied', 'service-not-allowed': 'denied', 'audio-capture': 'no-mic' };
  const NOTES = {
    listening: 'Listening… speak now. Tap Talk to stop.',
    denied: 'Microphone is blocked. Allow the microphone in your browser settings, or type instead.',
    'no-mic': 'No microphone found. Type instead.',
    unsupported: 'Voice typing isn’t available in this browser. Type instead.',
    network: 'Voice typing needs a connection in this browser. Type instead.',
    failed: 'Couldn’t start the microphone. Type instead.',
    idle: '',
  };

  function ttsBusy(synth) {
    if (!synth) return false;
    try { return !!(synth.speaking || synth.pending); } catch (e) { return false; }
  }

  function hush(synth) {
    if (!ttsBusy(synth)) return false;
    try { synth.cancel(); return true; } catch (e) { return false; }
  }

  function readResults(event, finalText) {
    let interim = '';
    const list = event.results;
    for (let i = event.resultIndex || 0; i < list.length; i++) {
      const row = list[i];
      const said = (row[0] && row[0].transcript) || '';
      if (row.isFinal) finalText = (finalText + ' ' + said).trim();
      else interim += said;
    }
    return { finalText: finalText, interim: interim };
  }

  function createSession(options) {
    const Rec = options.Rec;
    const synth = options.synth || null;
    const keep = !!options.keep;
    const onText = options.onText;
    const onEnd = options.onEnd;
    const onState = options.onState;
    const schedule = options.schedule || function (fn, ms) { return setTimeout(fn, ms); };
    let rec = null, finalText = '', want = false, ended = false, retries = 0, lastError = '', heardThisAttempt = false;

    function finish(state) {
      if (ended) return;
      ended = true;
      want = false;
      rec = null;
      if (onState) onState(state);
      if (onEnd) onEnd(finalText.trim(), state);
    }

    function later(ms) { schedule(function () { begin(); }, ms); }

    function begin() {
      if (!want || ended) return false;
      heardThisAttempt = false;
      hush(synth);
      let instance;
      try { instance = new Rec(); } catch (e) { finish('failed'); return false; }
      rec = instance;
      instance.lang = 'en-US';
      instance.interimResults = true;
      instance.continuous = false;
      instance.maxAlternatives = 1;
      instance.onresult = function (event) {
        if (ended || rec !== instance) return;
        heardThisAttempt = true;
        const next = readResults(event, finalText);
        finalText = next.finalText;
        if (onText) onText((finalText + ' ' + next.interim).trim());
      };
      instance.onerror = function (event) {
        if (ended || rec !== instance) return;
        lastError = (event && event.error) || '';
      };
      instance.onend = function () {
        if (rec !== instance) return;
        rec = null;
        const error = lastError;
        const heard = heardThisAttempt;
        lastError = '';
        if (!want || ended) { finish('idle'); return; }
        if (FATAL[error]) { finish(FATAL[error]); return; }
        if (error === 'network') {
          if (retries < 1) { retries += 1; later(300); return; }
          finish('network'); return;
        }
        if (!heard && error === 'aborted') {
          if (retries < 2) { retries += 1; later(250); return; }
          finish('failed'); return;
        }
        if (keep) { if (heard) retries = 0; later(heard ? 40 : 120); return; }
        finish('idle');
      };
      try { instance.start(); } catch (e) { rec = null; finish('failed'); return false; }
      if (onState) onState('listening');
      return true;
    }

    return {
      start: function () {
        if (ended) return false;
        if (!Rec) { finish('unsupported'); return false; }
        want = true;
        finalText = '';
        retries = 0;
        lastError = '';
        return begin();
      },
      stop: function () {
        if (ended) return;
        want = false;
        const current = rec;
        if (!current) { finish('idle'); return; }
        try { current.stop(); } catch (e) { finish('idle'); }
      },
      get listening() { return want && !ended; },
      get text() { return finalText; },
    };
  }

  window.SimmerSpeech = { createSession: createSession, hush: hush, ttsBusy: ttsBusy, NOTES: NOTES };
})();
