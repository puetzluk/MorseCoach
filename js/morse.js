/* Morse-Daten und Tonerzeugung (Web Audio API) */
const Morse = (() => {
  const TABLE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
    J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    'Ä': '.-.-', 'Ö': '---.', 'Ü': '..--', 'ß': '...--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '=': '-...-', '-': '-....-'
  };

  const REV = {};
  Object.keys(TABLE).forEach(k => { REV[TABLE[k]] = k; });

  // Reihenfolge der Koch-Methode (Buchstaben, dann Umlaute, dann Ziffern)
  const KOCH = 'KMURESNAPTLWIJZFOYVGQHBCDXÄÖÜ5923847160';

  let ctx = null;
  let current = null;

  // Meldet Ton an/aus (für Empfangsanzeige). Wird von der Oberfläche gesetzt.
  function signal(on) { if (api.onSignal) api.onSignal(on); }

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Zeiten in Sekunden. cwpm = Zeichentempo, wpm = Gesamttempo (Farnsworth)
  function timing(cwpm, wpm) {
    const dit = 1.2 / cwpm;
    const ta = wpm >= cwpm ? dit : (60 * cwpm - 37.2 * wpm) / (19 * cwpm * wpm);
    return { dit, charGap: 3 * ta, wordGap: 7 * ta };
  }

  function stop() {
    if (!current) return;
    const c = current;
    current = null;
    c.timers.forEach(clearTimeout);
    signal(false);
    try { c.osc.stop(); c.osc.disconnect(); c.g.disconnect(); } catch (e) { /* schon beendet */ }
    c.resolve();
  }

  // Spielt Text als Morse ab. opts: { freq, vol, cwpm, wpm }
  function play(text, opts) {
    stop();
    const c = getCtx();
    const tm = timing(opts.cwpm, opts.wpm);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = opts.freq;
    g.gain.value = 0;
    osc.connect(g);
    g.connect(c.destination);

    const ramp = 0.005;
    const t0 = c.currentTime;
    let t = t0 + 0.1;
    const ev = [];
    const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
    words.forEach(word => {
      [...word].forEach(ch => {
        const code = TABLE[ch];
        if (!code) return;
        [...code].forEach((sym, k) => {
          const dur = sym === '.' ? tm.dit : 3 * tm.dit;
          ev.push({ ms: (t - t0) * 1000, on: true }, { ms: (t + dur - t0) * 1000, on: false });
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(opts.vol, t + ramp);
          g.gain.setValueAtTime(opts.vol, t + dur - ramp);
          g.gain.linearRampToValueAtTime(0, t + dur);
          t += dur;
          if (k < code.length - 1) t += tm.dit;
        });
        t += tm.charGap;
      });
      t += tm.wordGap - tm.charGap;
    });

    return new Promise(resolve => {
      const timers = ev.map(e => setTimeout(() => signal(e.on), e.ms));
      current = { osc, g, resolve, timers };
      osc.onended = () => {
        timers.forEach(clearTimeout);
        signal(false);
        if (current && current.osc === osc) current = null;
        resolve();
      };
      osc.start();
      osc.stop(t + 0.05);
    });
  }

  // Kurzer Mithörton beim Tasten. units: 1 = kurz, 3 = lang
  function beep(units, opts) {
    const c = getCtx();
    const dur = units * 1.2 / opts.cwpm;
    const osc = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime;
    osc.frequency.value = opts.freq;
    osc.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.vol, t + 0.005);
    g.gain.setValueAtTime(opts.vol, t + dur - 0.005);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    signal(true);
    setTimeout(() => signal(false), dur * 1000);
  }

  // Dauerton beim Tasten mit Timing: Ton an, solange gedrückt wird. on = true/false
  let held = null;
  function key(on, opts) {
    if (on) {
      if (held) return;
      const c = getCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      const t = c.currentTime;
      osc.frequency.value = opts.freq;
      osc.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(opts.vol, t + 0.005);
      osc.start(t);
      held = { osc, g, c };
      signal(true);
    } else if (held) {
      const h = held;
      held = null;
      const t = h.c.currentTime;
      h.g.gain.cancelScheduledValues(t);
      h.g.gain.setValueAtTime(h.g.gain.value, t);
      h.g.gain.linearRampToValueAtTime(0, t + 0.005);
      h.osc.stop(t + 0.02);
      signal(false);
    }
  }

  function encode(text) {
    return text.toUpperCase().split(/\s+/).filter(Boolean)
      .map(w => [...w].map(ch => TABLE[ch] || '?').join(' '))
      .join(' / ');
  }

  function decode(morse) {
    const clean = morse.replace(/[·•]/g, '.').replace(/[–—_]/g, '-');
    return clean.trim().split(/\s*\/\s*|\s{3,}/)
      .map(w => w.trim().split(/\s+/).filter(Boolean).map(c => REV[c] || '?').join(''))
      .join(' ');
  }

  const api = { TABLE, REV, KOCH, timing, play, stop, beep, key, encode, decode, ctx: getCtx, onSignal: null };
  return api;
})();
