/* Games (Idle-Spiel): Oberfläche. Die Regeln (Dots, Combo, Koch) stehen in js/idle-logic.js.
   Schritt 1: Aufgaben lösen und Dots sammeln. Upgrades, Prestige und Welten folgen später.

   Aufgabenarten:
   - "sehen":  Morsecode wird angezeigt → Buchstaben auf der Tastatur tippen
   - "tasten": Buchstabe wird angezeigt → Code eingeben (Maus, Leertaste oder E/T, siehe js/keyer.js)
   Eingabeart und Bestätigung (sofort, nach Pause, mit Enter) stehen in den Einstellungen unter "Games". */
const Idle = (() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const L = IdleLogic(Morse.TABLE);
  const sym = code => code.replace(/\./g, '•').replace(/-/g, '–').split('').join(' ');
  const num = n => Math.floor(n).toLocaleString('de-DE');

  let host = null;                 // { getState, save, audioOpts, area } aus app.js
  let keyer = null;                // Tasten-Eingabe (js/keyer.js)
  let autoTimer = 0;               // Bestätigung nach Pause
  let g = null;                    // Spielstand (S.idle)
  let shown = false;               // Games-Bereich ist offen
  let raf = 0, nextTimer = 0, shakeTimer = 0;
  const run = { streak: 0 };       // Combo-Serie der laufenden Sitzung
  let cur = null, nxt = null;      // aktuelle und nächste Aufgabe
  let input = '';                  // Eingabe: Buchstabe ("sehen") oder Punkte/Striche ("tasten")
  let errors = 0, late = false, done = false;
  const clock = { running: false, last: 0, used: 0 };

  const S = () => host.getState();
  const A = () => host.area();     // Einstellungen des Bereichs Games
  const quoteFn = ch => {
    const st = S().chars[ch];
    return st && st.last.length ? st.last.reduce((a, b) => a + b, 0) / st.last.length : null;
  };

  /* ---------- Ablauf ---------- */
  function nextTask() {
    clearTimeout(nextTimer);
    cur = L.arm(nxt || L.newTask(g, cur && cur.ch, quoteFn), g);
    nxt = L.newTask(g, cur.ch, quoteFn);
    input = '';
    errors = 0; late = false; done = false;
    clearTimeout(autoTimer);
    keyer.clear();
    clock.used = 0;
    startClock();
    feedback('', '');
    renderTask();
    renderNext();
  }

  function mistake() {
    clearTimeout(autoTimer);
    errors++;
    input = '';
    run.streak = 0;
    feedback('Falsch – nochmal', 'bad');
    clearTimeout(shakeTimer);
    $('#idInput').classList.add('shake');
    shakeTimer = setTimeout(() => $('#idInput').classList.remove('shake'), 350);
    renderTask();
    renderCombo();
  }

  function finish() {
    clearTimeout(autoTimer);
    done = true;
    stopClock();
    const r = L.solve(g, run, cur, { errors: errors, late: late });
    Store.record(S(), cur.ch, errors === 0);
    host.save();

    let text = 'Richtig';
    if (errors) text = 'Gelöst, mit Fehler: halbe Dots';
    else if (late) text = 'Richtig, aber zu langsam: Combo weg';
    if (r.unlocked) text += ' · Neues Zeichen: ' + r.unlocked + '  ' + sym(Morse.TABLE[r.unlocked]);
    feedback(text, errors ? 'bad' : 'ok');
    popDots(r.dots, r.combo);

    renderTask();
    renderStats();
    renderCombo();
    renderKoch();
    if (r.unlocked) renderNext();
    nextTimer = setTimeout(nextTask, r.unlocked ? 2400 : errors ? 1200 : 450);
  }

  /* ---------- Eingabe ---------- */
  // Bestätigung nach einer Pause: Zeitgeber nach jeder Eingabe neu starten
  function armPause() {
    clearTimeout(autoTimer);
    if (A().confirm === 'pause' && input) autoTimer = setTimeout(submit, A().delay * 1000);
  }

  function typeLetter(ch) {
    if (done || cur.type !== 'sehen') return;
    input = ch;
    if (A().confirm === 'sofort') submit(); else { renderTask(); armPause(); }
  }

  // Punkt oder Strich aus js/keyer.js (der Ton kommt von dort)
  function typeSymbol(s) {
    if (done || cur.type !== 'tasten' || input.length >= L.CFG.maxPattern) return;
    input += s;
    if (A().confirm === 'sofort') {
      const c = L.checkPattern(cur, input);
      if (c === 'wrong') return mistake();
      renderTask();
      if (c === 'done') finish();
      return;
    }
    renderTask();
    armPause();
  }

  function erase() {
    if (done) return;
    input = cur.type === 'tasten' ? input.slice(0, -1) : '';
    renderTask();
    armPause();
  }

  function submit() {
    if (done || !input) return;
    const ok = cur.type === 'sehen' ? input === cur.ch : input === cur.code;
    if (ok) finish(); else mistake();
  }

  function onKey(e) {
    if (!shown || !cur || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches('input, textarea, select')) return;
    const k = e.key;
    const letter = /^[a-zA-Z]$/.test(k);
    if (!letter && k !== 'Enter' && k !== 'Backspace') return;
    e.preventDefault();
    if (e.target.matches('button')) e.target.blur();
    if (e.repeat) return;
    if (k === 'Enter') submit();
    else if (k === 'Backspace') erase();
    else if (cur.type === 'sehen') typeLetter(k.toUpperCase());
    // Bei "tasten" kommen Punkte und Striche aus js/keyer.js
  }

  /* ---------- Zeitfenster für die Combo ---------- */
  function startClock() { clock.running = true; clock.last = performance.now(); }
  function stopClock() { clock.running = false; }
  function pauseClock() { if (clock.running) { tick(performance.now()); clock.running = false; } }
  function resumeClock() { if (shown && cur && !done && !clock.running) startClock(); }

  function tick(now) {
    if (clock.running) {
      clock.used += Math.min(0.25, (now - clock.last) / 1000);
      clock.last = now;
      if (!late && clock.used >= cur.window) {
        late = true;
        run.streak = 0;
        renderCombo();
      }
    }
  }

  function frame(now) {
    if (!shown) return;
    tick(now);
    renderClock();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Anzeige ---------- */
  function feedback(text, cls) {
    const el = $('#idFeedback');
    el.textContent = text;
    el.className = 'feedback' + (cls ? ' ' + cls : '');
  }

  // Schwebende "+Dots"-Anzeige über dem Zähler
  function popDots(dots, combo) {
    const box = $('#idPops');
    const el = document.createElement('span');
    el.className = 'id-pop';
    el.textContent = '+' + num(dots) + (combo > 1 ? '  x' + combo : '');
    box.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function renderStats() {
    $('#idDots').textContent = num(g.dots);
    $('#idSolved').textContent = num(g.solved);
    $('#idBest').textContent = num(g.bestStreak);
  }

  function renderCombo() {
    const f = L.comboOf(run.streak);
    const n = L.nextStep(run.streak);
    $('#idCombo').textContent = 'x' + f;
    $('#idCombo').classList.toggle('hot', f > 1);
    $('#idStreak').textContent = run.streak;
    $('#idComboNext').textContent = n ? 'x' + n.factor + ' ab ' + n.at + ' in Folge' : 'Maximum erreicht';
    $('#idComboFill').style.width = (n ? (run.streak - n.from) / (n.at - n.from) * 100 : 100) + '%';
  }

  function renderClock() {
    if (!cur) return;
    const left = Math.max(0, cur.window - clock.used);
    $('#idClockFill').style.width = (left / cur.window * 100) + '%';
    $('#idClock').classList.toggle('late', late);
    $('#idClockText').textContent = done ? '' : late ? 'Zeit vorbei – Combo weg, lösen geht trotzdem' : left.toFixed(1) + ' s für die Combo';
  }

  function renderTask() {
    const see = cur.type === 'sehen';
    const a = A();
    const enter = a.confirm === 'enter';
    $('#idKind').textContent = see ? 'Morse erkennen' : 'Mit Morse eingeben';
    $('#idPrompt').textContent = see ? 'Tippe den Buchstaben.' + (enter ? ' Bestätigen mit Enter.' : '')
      : Keyer.describe(a);
    const disp = $('#idDisplay');
    disp.textContent = see && !done ? sym(cur.code) : cur.ch;
    disp.classList.toggle('morse', see && !done);
    let help = '';
    if (done) help = sym(cur.code);
    else if (errors >= 2) help = 'Lösung: ' + (see ? cur.ch : sym(cur.code));
    $('#idHelp').textContent = help;
    $('#idInput').textContent = input ? (see ? input : sym(input)) : ' ';
    $('#idKeys').hidden = see || a.input !== 'et';
    $('#idFeld').hidden = see || a.input !== 'maus';
    $('#idTiming').hidden = see || !a.timing || a.input === 'et';
    $('#idCtl').hidden = a.confirm === 'sofort';
    $('#idModus').textContent = Keyer.label(a, true);
  }

  function renderNext() {
    if (!nxt) return;
    $('#idNext').textContent = nxt.type === 'sehen' ? sym(nxt.code) : nxt.ch;
    $('#idNextKind').textContent = nxt.type === 'sehen' ? 'Morse erkennen' : 'mit Morse eingeben';
  }

  function renderKoch() {
    const list = L.activeChars(g);
    const box = $('#idChars');
    box.textContent = '';
    L.CFG.koch.split('').forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'chip' + (i >= list.length ? ' locked' : i === list.length - 1 && list.length > L.CFG.startLevel ? ' new' : '');
      c.textContent = i < list.length ? ch : '?';
      if (i < list.length) c.title = sym(Morse.TABLE[ch]);
      box.appendChild(c);
    });
    const r = g.koch.recent, q = L.quoteOf(r);
    $('#idKochFill').style.width = Math.round(q * 100) + '%';
    $('#idLevel').textContent = list.length + ' / ' + L.CFG.koch.length;
    let t;
    if (L.kochComplete(g)) t = 'Alle Buchstaben sicher. Hier wird später Prestige 1 freigeschaltet.';
    else t = (list.length < L.CFG.koch.length ? 'Nächstes Zeichen' : 'Alle Buchstaben sicher')
      + ' ab ' + Math.round(L.CFG.quote * 100) + ' % in den letzten ' + L.CFG.recentMax + ' Aufgaben. Jetzt: '
      + Math.round(q * 100) + ' % (' + r.length + ' von ' + L.CFG.recentMax + ')';
    $('#idKochInfo').textContent = t;
  }

  function renderSettings() {
    $$('#idSetTask button').forEach(b => b.classList.toggle('active', b.dataset.v === g.settings.task));
    $$('#idSetTempo button').forEach(b => b.classList.toggle('active', Number(b.dataset.v) === g.settings.tempo));
    const t = L.CFG.tempos[g.settings.tempo];
    $('#idTempoInfo').textContent = 'Zeitfenster x' + t.time.toLocaleString('de-DE') + ', Dots x'
      + t.dots.toLocaleString('de-DE') + '. Gilt ab der nächsten Aufgabe.';
  }

  function renderAll() { renderStats(); renderCombo(); renderKoch(); renderSettings(); renderTask(); renderNext(); renderClock(); }

  /* ---------- Einstellungen ---------- */
  function bindSetting(sel, key, numeric) {
    $$(sel + ' button').forEach(b => b.addEventListener('click', () => {
      g.settings[key] = numeric ? Number(b.dataset.v) : b.dataset.v;
      host.save();
      renderSettings();
      if (key === 'task') { nxt = L.newTask(g, cur && cur.ch, quoteFn); renderNext(); }
    }));
  }

  // Knöpfe Kurz/Lang (Eingabe E/T)
  function bindKey(sel, s) {
    const b = $(sel);
    b.addEventListener('pointerdown', e => { e.preventDefault(); keyer.tap(s); });
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('click', e => { if (e.detail === 0) keyer.tap(s); });
  }

  /* ---------- Anbindung an app.js ---------- */
  function show() {
    shown = true;
    if (!cur || done) nextTask(); else resumeClock();
    renderAll();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function hide() {
    if (!shown) return;
    keyer.cancel();
    clearTimeout(autoTimer);
    pauseClock();
    shown = false;
    cancelAnimationFrame(raf);
    if (done) { clearTimeout(nextTimer); }
  }

  // Einstellungen wurden geändert: Anzeige anpassen, laufende Eingabe verwerfen
  function refresh() {
    if (!cur || !g) return;
    if (!done) { input = ''; clearTimeout(autoTimer); }
    keyer.refresh();
    renderTask();
  }

  // opts: { getState, save, audioOpts, area }
  function init(opts) {
    host = opts;
    S().idle = L.normalize(S().idle);
    g = S().idle;
    keyer = Keyer.create({
      field: $('#idFeld'),
      timingBox: $('#idTiming'),
      settings: A,
      active: () => shown && !!cur && !done && cur.type === 'tasten',
      audioOpts: () => host.audioOpts(),
      onSymbol: sym => typeSymbol(sym)
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', pauseClock);
    window.addEventListener('focus', resumeClock);
    document.addEventListener('visibilitychange', () => (document.hidden ? pauseClock() : resumeClock()));
    bindKey('#idKurz', '.');
    bindKey('#idLang', '-');
    $('#idErase').addEventListener('click', erase);
    $('#idOk').addEventListener('click', submit);
    bindSetting('#idSetTask', 'task', false);
    bindSetting('#idSetConfirm', 'confirm', false);
    bindSetting('#idSetTempo', 'tempo', true);
  }

  return { init, show, hide, refresh };
})();
