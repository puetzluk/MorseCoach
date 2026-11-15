/* Games (Idle-Spiel): Oberfläche. Die Regeln (Zeitfenster, Wertung, Combo, Koch, Upgrades) stehen in
   js/idle-logic.js, die Zahlen dazu im Projekt-Doc "games-plan.md".

   Aufgaben (immer gemischt):
   - "sehen":  Morsecode wird angezeigt → Buchstaben auf der Tastatur tippen
   - "tasten": Buchstabe wird angezeigt → Code eingeben (Maus, Leertaste oder E/T, siehe js/keyer.js)
   Eingabeart und Bestätigung stehen in den Einstellungen unter "Games".
   Das Spieltempo (Gemütlich … Blitz) steht in der Ton-Leiste und bestimmt auch das Morse-Tempo (WPM). */
const Idle = (() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const L = IdleLogic(Morse.TABLE);
  const sym = code => code.replace(/\./g, '•').replace(/-/g, '–').split('').join(' ');
  const fmt = L.fmt;
  const fx = x => x.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  const whole = n => Math.floor(n).toLocaleString('de-DE');

  let host = null;                 // { getState, save, audioOpts, area } aus app.js
  let keyer = null;                // Tasten-Eingabe (js/keyer.js)
  let g = null;                    // Spielstand (S.idle)
  let shown = false;               // Games-Bereich ist offen
  let view = 'aufgaben';           // 'aufgaben' | 'upgrades'
  let raf = 0, nextTimer = 0, shakeTimer = 0, autoTimer = 0;
  // Serie, Fehlerschutz (startet bereit) und laufender DotRush ({ factor, left } oder null) dieser Sitzung
  const run = { streak: 0, charge: 1e9, rush: null };
  let lastFrame = 0;
  let cur = null, nxt = null;      // aktuelle und nächste Aufgabe
  let input = '';                  // Eingabe: Buchstabe ("sehen") oder Punkte/Striche ("tasten")
  let errors = 0, late = false, done = false, shielded = false;
  const clock = { running: false, last: 0, used: 0 };
  const upRows = {};               // Zeilen im Upgrades-Bereich

  const S = () => host.getState();
  const A = () => host.area();     // Einstellungen des Bereichs Games
  const mode = () => L.modeOf(g);
  const audio = () => host.audioOpts({ cwpm: mode().wpm, wpm: mode().wpm });
  const keyed = () => A().input !== 'et';   // Morsen mit Maus oder Leertaste: Tastzeit zählt zum Fenster
  const playing = () => shown && view === 'aufgaben';
  const quoteFn = ch => {
    const st = S().chars[ch];
    return st && st.last.length ? st.last.reduce((a, b) => a + b, 0) / st.last.length : null;
  };

  /* ---------- Ablauf ---------- */
  function nextTask() {
    clearTimeout(nextTimer);
    cur = L.arm(nxt || L.newTask(g, cur && cur.ch, quoteFn), g, keyed());
    nxt = L.newTask(g, cur.ch, quoteFn);
    input = '';
    errors = 0; late = false; done = false; shielded = false;
    clearTimeout(autoTimer);
    keyer.clear();
    clock.used = 0;
    if (playing()) startClock(); else clock.running = false;
    feedback('', '');
    renderTask();
    renderNext();
  }

  function mistake() {
    clearTimeout(autoTimer);
    // Erster Fehler dieser Aufgabe: Fehlerschutz kann die Combo retten; jeder weitere Fehler beendet sie
    if (errors === 0) shielded = L.onError(g, run);
    else { shielded = false; run.streak = 0; }
    errors++;
    input = '';
    feedback(shielded ? 'Falsch – der Fehlerschutz hat deine Combo gerettet. Nochmal' : 'Falsch – nochmal', 'bad');
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
    const weak = L.isWeak(quoteFn(cur.ch));
    const rush = run.rush ? run.rush.factor : 0;
    const r = L.solve(g, run, cur, { errors: errors, time: clock.used, weak: weak, shielded: shielded, rush: rush });
    Store.record(S(), cur.ch, errors === 0);
    host.save();

    let text, cls = 'ok';
    if (r.kind === 'ok') text = 'Richtig' + (rush ? ' · DotRush ×' + r.combo : r.combo > 1 ? ' · Combo ×' + r.combo : '');
    else if (r.kind === 'late') text = 'Richtig, Fenster verpasst · Zeit für „' + L.CFG.modes[r.reached].name + '“ (×' + fx(r.factor) + ')';
    else if (r.kind === 'slow') text = 'Richtig, aber langsamer als Gemütlich (×' + fx(r.factor) + ')';
    else { text = 'Mit Fehler gelöst (×' + fx(r.factor) + ')' + (shielded ? ' · Combo gerettet' : ''); cls = 'bad'; }
    if (weak && g.up.schwach > 0) text += ' · Schwachstellen-Bonus';
    if (r.unlocked) text += ' · Neues Zeichen: ' + r.unlocked + '  ' + sym(Morse.TABLE[r.unlocked]);
    feedback(text, cls);
    popDots(r.dots, r.kind === 'ok' && r.combo > 1 ? r.combo : 0);

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
    if (!playing() || !cur || e.ctrlKey || e.metaKey || e.altKey) return;
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
  function resumeClock() { if (playing() && cur && !done && !clock.running) startClock(); }

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
    rushTick(Math.min(0.25, Math.max(0, (now - (lastFrame || now)) / 1000)));
    lastFrame = now;
    renderClock();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- DotRush ----------
     Läuft nur in aktiver Spielzeit (Bereich Aufgaben offen, Fenster im Vordergrund). */
  function rushTick(dt) {
    if (!L.rushOn(g) || !playing() || document.hidden || !document.hasFocus()) return;
    if (run.rush) {
      run.rush.left -= dt;
      if (run.rush.left <= 0) endRush(); else renderRush();
      return;
    }
    if (g.rushWait === null) g.rushWait = L.rushNextWait(g);
    g.rushWait -= dt;
    if (g.rushWait <= 0) startRush();
  }
  function startRush() {
    run.rush = { factor: L.rushFactor(g, L.comboOf(run.streak)), left: L.rushDur(g) };
    g.rushWait = null;
    renderCombo();
  }
  function endRush() {
    run.rush = null;
    g.rushWait = L.rushNextWait(g);
    host.save();
    renderCombo();
  }
  function renderRush() {
    const el = $('#idRush');
    el.hidden = !run.rush;
    $('.id-head').classList.toggle('rush', !!run.rush);
    if (run.rush) el.textContent = 'DotRush ×' + Math.max(run.rush.factor, L.comboOf(run.streak))
      + ' · noch ' + Math.ceil(run.rush.left) + ' s';
  }

  /* ---------- Anzeige ---------- */
  function feedback(text, cls) {
    const el = $('#idFeedback');
    el.textContent = text;
    el.className = 'feedback' + (cls ? ' ' + cls : '');
  }

  // Schwebende "+Dots"-Anzeige über dem Zähler
  function popDots(dots, combo) {
    const el = document.createElement('span');
    el.className = 'id-pop';
    el.textContent = '+' + fmt(dots) + (combo ? '  ×' + combo : '');
    $('#idPops').appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function renderStats() {
    $('#idDots').textContent = fmt(g.dots);
    $('#idSolved').textContent = whole(g.solved);
    $('#idBest').textContent = whole(g.bestStreak);
    $('#idTotal').textContent = fmt(g.total);
    if (view === 'upgrades') renderUpgrades();
  }

  function renderCombo() {
    renderRush();
    const f = run.rush ? Math.max(run.rush.factor, L.comboOf(run.streak)) : L.comboOf(run.streak);
    const n = L.nextStep(run.streak);
    $('#idCombo').textContent = '×' + f;
    $('#idCombo').classList.toggle('hot', f > 1);
    $('#idCombo').classList.toggle('rush', !!run.rush);
    $('#idStreak').textContent = run.streak;
    $('#idComboNext').textContent = n ? '×' + n.factor + ' ab ' + n.at + ' in Folge' : 'Maximum erreicht';
    $('#idComboFill').style.width = (n ? (run.streak - n.from) / (n.at - n.from) * 100 : 100) + '%';
    const sh = $('#idShield');
    sh.hidden = g.up.schutz === 0;
    if (g.up.schutz > 0) {
      const ready = L.shieldReady(g, run);
      sh.textContent = ready ? 'Fehlerschutz bereit' : 'Fehlerschutz lädt: ' + run.charge + ' / ' + L.schutzNeed(g) + ' Aufgaben';
      sh.classList.toggle('ready', ready);
    }
  }

  function renderClock() {
    if (!cur) return;
    const left = Math.max(0, cur.window - clock.used);
    $('#idClockFill').style.width = (left / cur.window * 100) + '%';
    $('#idClock').classList.toggle('late', late);
    $('#idClockText').textContent = done ? '' : late
      ? 'Fenster verpasst – Combo weg, Dots je nach Zeit'
      : left.toFixed(1).replace('.', ',') + ' s für die Combo (' + mode().name + ')';
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
    $('#idInput').textContent = input ? (see ? input : sym(input)) : ' ';
    // Eingabefeld, Knöpfe und Druckdauer bleiben immer an derselben Stelle (kein Springen beim Wechsel der
    // Aufgabenart); bei "Morse erkennen" sind sie nur abgeblendet
    $('#idKeys').hidden = a.input !== 'et';
    $$('#idKeys button').forEach(b => { b.disabled = see; });
    $('#idFeld').hidden = a.input !== 'maus';
    $('#idFeld').classList.toggle('off', see);
    $('#idFeld span').textContent = see ? 'Jetzt den Buchstaben auf der Tastatur tippen' : 'Hier drücken';
    $('#idTiming').hidden = !a.timing || a.input === 'et';
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
    $$('#idSetTempo button').forEach(b => b.classList.toggle('active', Number(b.dataset.v) === g.settings.tempo));
    const m = mode();
    $('#idTempoInfo').textContent = 'Fenster ×' + fx(m.time) + (m.extra ? ' + ' + fx(m.extra) + ' s' : '')
      + ' · Dots ×' + fx(m.dots) + ' · ' + m.wpm + ' WPM. Gilt ab der nächsten Aufgabe.';
  }

  /* ---------- Upgrades ---------- */
  const pct = x => Math.round(x * 100) + ' %';
  // Wirkung jetzt und nach dem Kauf, als kurzer Text
  function upgradeText(id, lv) {
    const C = L.CFG;
    if (id === 'grund') return {
      what: 'Jeder Punkt und Strich bringt mehr Dots.',
      now: 'Grundwert ×' + fx(Math.pow(C.grundStep, lv)), next: '×' + fx(Math.pow(C.grundStep, lv + 1)) };
    if (id === 'fenster') return {
      what: 'Mehr Zeit für die Combo, in jedem Spieltempo.',
      now: 'Zeitfenster +' + pct(C.fensterStep * lv), next: '+' + pct(C.fensterStep * (lv + 1)) };
    if (id === 'schwach') return {
      what: 'Zeichen mit weniger als ' + pct(C.schwachQuote) + ' Trefferquote bringen mehr Dots.',
      now: lv ? '+' + pct(C.schwachBonus[lv - 1]) : 'noch nicht gekauft', next: lv < 3 ? '+' + pct(C.schwachBonus[lv]) : '' };
    if (id === 'rush') return {
      what: 'Ab und zu startet ein DotRush: ein paar Sekunden lang zählt ein hoher Faktor statt der Combo.',
      now: lv ? 'freigeschaltet' : 'noch nicht gekauft', next: 'alle ' + fx(C.rushEvery[0]) + ' min, ' + C.rushDur[0] + ' s, ×'
        + C.rushMin + ' bis ×' + C.rushMax[0] };
    if (id === 'rushOft') return {
      what: 'Der DotRush kommt öfter.',
      now: 'etwa alle ' + fx(C.rushEvery[lv]) + ' min', next: lv < 4 ? 'alle ' + fx(C.rushEvery[lv + 1]) + ' min' : '' };
    if (id === 'rushLang') return {
      what: 'Der DotRush dauert länger.',
      now: C.rushDur[lv] + ' s', next: lv < 3 ? C.rushDur[lv + 1] + ' s' : '' };
    if (id === 'rushStark') return {
      what: 'Der DotRush kann einen höheren Faktor ziehen (nie weniger als deine Combo).',
      now: '×' + C.rushMin + ' bis ×' + C.rushMax[lv], next: lv < 5 ? 'bis ×' + C.rushMax[lv + 1] : '' };
    return {
      what: 'Ein Fehler kostet die Combo nicht. Danach lädt der Schutz wieder auf.',
      now: lv ? 'lädt nach ' + C.schutzCharge[lv - 1] + ' Aufgaben' : 'noch nicht gekauft',
      next: lv < 3 ? 'nach ' + C.schutzCharge[lv] + ' Aufgaben' : '' };
  }

  function buildUpgrades() {
    const box = $('#idUps');
    L.CFG.upgrades.forEach(u => {
      const row = document.createElement('div');
      row.className = 'id-up';
      row.innerHTML = '<div class="id-up-text"><b class="id-up-name"></b> <small class="id-up-lv"></small>'
        + '<p class="muted small id-up-what"></p><p class="small id-up-eff"></p></div>'
        + '<button type="button" class="btn primary id-up-buy"></button>';
      row.querySelector('.id-up-name').textContent = u.name;
      row.querySelector('.id-up-buy').addEventListener('click', () => {
        if (!L.buy(g, u.id)) return;
        host.save();
        renderStats();
        renderUpgrades();
        renderCombo();
      });
      box.appendChild(row);
      upRows[u.id] = row;
    });
  }

  function renderUpgrades() {
    L.CFG.upgrades.forEach(u => {
      const row = upRows[u.id];
      const lv = g.up[u.id];
      const maxed = lv >= u.max;
      const t = upgradeText(u.id, lv);
      row.querySelector('.id-up-lv').textContent = 'Stufe ' + lv + (u.max === Infinity ? '' : ' / ' + u.max);
      row.querySelector('.id-up-what').textContent = t.what;
      row.querySelector('.id-up-eff').textContent = 'Jetzt: ' + t.now + (maxed ? '' : '  →  danach: ' + t.next);
      const b = row.querySelector('.id-up-buy');
      if (maxed) { b.textContent = 'Voll ausgebaut'; b.disabled = true; }
      else if (L.locked(g, u.id)) { b.textContent = 'Erst DotRush freischalten'; b.disabled = true; }
      else {
        const p = L.priceOf(u.id, lv);
        b.textContent = 'Kaufen · ' + fmt(p, true) + ' Dots';
        b.disabled = g.dots < p;
      }
      row.classList.toggle('can', L.canBuy(g, u.id));
    });
  }

  // Kurze Erklärung des Spiels für die Einstellungen (aus den aktuellen Regeln erzeugt, bleibt so immer aktuell)
  function explain() {
    const C = L.CFG;
    const steps = C.comboSteps.map(s => '×' + s[1] + ' ab ' + s[0]).join(', ');
    const rows = C.modes.map(m => '<tr><td>' + m.name + '</td><td>×' + fx(m.time) + ' + ' + fx(m.extra) + ' s</td><td>×'
      + fx(m.dots) + '</td><td>' + m.wpm + '</td><td>' + Math.round(2400 / m.wpm) + ' ms</td></tr>').join('');
    return '<h3>So funktioniert Games</h3><ul>'
      + '<li><b>Ziel:</b> Aufgaben lösen, Dots sammeln, im Reiter Upgrades ausgeben.</li>'
      + '<li><b>Aufgaben</b> kommen gemischt: Morse erkennen (Buchstaben tippen) oder Buchstaben morsen.</li>'
      + '<li><b>Zeichen</b> nach der Koch-Methode: Start mit K und M, ein neues ab ' + Math.round(C.quote * 100)
      + ' % ohne Fehler in den letzten ' + C.recentMax + ' Aufgaben.</li>'
      + '<li><b>Zeitfenster</b> = (' + fx(C.windowBase) + ' s + ' + fx(C.windowPerSymbol) + ' s je Punkt/Strich) × Spieltempo + Zuschlag; '
      + 'beim Morsen mit Maus oder Leertaste kommt die Tastzeit dazu. Lösen darfst du, so lange du willst.</li>'
      + '<li><b>Dots</b> = 1 je Punkt/Strich × Faktor. Im Fenster: Dots-Faktor des Spieltempos × Combo. Fenster verpasst: Faktor der '
      + 'erreichten Stufe × ' + fx(C.lateFactor) + '. Langsamer als Gemütlich: × ' + fx(C.slowFactor) + '. Mit Fehler: × '
      + fx(C.errorBase) + ' (+ ' + fx(C.errorBonus[0][1]) + ', wenn trotzdem schnell).</li>'
      + '<li><b>Combo</b> = Aufgaben in Folge ohne Fehler im Fenster: ' + steps + '.</li>'
      + '<li><b>DotRush</b> (Upgrade): etwa alle ' + fx(C.rushEvery[0]) + ' min aktiver Spielzeit ' + C.rushDur[0] + ' s lang ×'
      + C.rushMin + ' bis ×' + C.rushMax[0] + ' statt der Combo, nie weniger als die Combo.</li>'
      + '<li><b>Punkt oder Strich:</b> kürzer als 2 Einheiten = Punkt. Das WPM legt das Spieltempo fest.</li></ul>'
      + '<table class="id-explain"><tr><th>Spieltempo</th><th>Fenster</th><th>Dots</th><th>WPM</th><th>Grenze Punkt/Strich</th></tr>'
      + rows + '</table>';
  }

  function setView(v) {
    view = v;
    $$('.id-areas [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('#idViewAufgaben').hidden = v !== 'aufgaben';
    $('#idViewUpgrades').hidden = v !== 'upgrades';
    if (v === 'upgrades') { keyer.cancel(); clearTimeout(autoTimer); pauseClock(); renderUpgrades(); }
    else resumeClock();
  }

  function renderAll() { renderStats(); renderCombo(); renderKoch(); renderSettings(); renderTask(); renderNext(); renderClock(); }

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
    if (view === 'upgrades') renderUpgrades();
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
      active: () => playing() && !!cur && !done && cur.type === 'tasten',
      audioOpts: audio,
      onSymbol: s => typeSymbol(s),
      compact: true
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', pauseClock);
    window.addEventListener('focus', resumeClock);
    document.addEventListener('visibilitychange', () => (document.hidden ? pauseClock() : resumeClock()));
    bindKey('#idKurz', '.');
    bindKey('#idLang', '-');
    $('#idErase').addEventListener('click', erase);
    $('#idOk').addEventListener('click', submit);
    $$('#idSetTempo button').forEach(b => b.addEventListener('click', () => {
      g.settings.tempo = Number(b.dataset.v);
      host.save();
      renderSettings();
      keyer.refresh();
    }));
    $$('.id-areas [data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    buildUpgrades();
  }

  return { init, show, hide, refresh, explain };
})();
