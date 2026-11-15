/* Games (Idle-Spiel): die Spielregeln als reine Logik, ohne Oberfläche.
   So lassen sich die Regeln getrennt testen und alle Zahlen an einer Stelle (CFG) einstellen.
   Grundlage: Projekt-Doc "games-plan.md". Aufruf: const L = IdleLogic(Morse.TABLE); */
const IdleLogic = (table) => {
  'use strict';

  const CFG = {
    // Lernpfad Phase 1: Buchstaben nach der Koch-Methode
    koch: 'KMURESNAPTLWIJZFOYVGQHBCDX',
    startLevel: 2,          // Start mit K und M
    recentMax: 20,          // so viele letzte Aufgaben zählen für die Trefferquote
    quote: 0.9,             // ab dieser Trefferquote kommt das nächste Zeichen dazu

    // Grundwert: 1 Dot je Punkt/Strich (Buchstaben). Später: Zahlen ×1,2, Sonderzeichen ×1,5, Doppelbuchstaben ×2
    dotsPerSymbol: 1,

    // Spieltempo-Modi: time = Faktor fürs Zeitfenster, extra = Zuschlag in s, dots = Dots-Faktor,
    // wpm = Morse-Tempo in diesem Modus (Grenze Punkt/Strich und Tonlänge)
    modes: [
      { name: 'Gemütlich', time: 1, extra: 0.4, dots: 0.8, wpm: 12 },
      { name: 'Normal', time: 0.85, extra: 0.4, dots: 1, wpm: 15 },
      { name: 'Zügig', time: 0.75, extra: 0.4, dots: 1.25, wpm: 18 },
      { name: 'Schnell', time: 0.65, extra: 0.4, dots: 1.5, wpm: 21 },
      { name: 'Blitz', time: 0.55, extra: 0.2, dots: 2, wpm: 25 }
    ],
    // Zeitfenster = (Grundzeit + Zeit je Punkt/Strich × Anzahl) × time + extra (+ Tastzeit beim Morsen)
    windowBase: 0.9,
    windowPerSymbol: 0.15,

    // Wertung, wenn das Fenster verpasst wurde oder ein Fehler passiert ist
    lateFactor: 0.8,        // Dots-Faktor der tatsächlich erreichten Stufe × 0,8
    slowFactor: 0.6,        // langsamer als Gemütlich
    errorBase: 0.4,         // Aufgabe mit Fehler, in allen Modi gleich …
    errorBonus: [[1, 0.2], [2, 0.1]],  // … + 0,2 innerhalb des Gemütlich-Fensters, + 0,1 innerhalb des doppelten

    // Combo: ab dieser Serie gilt der Faktor (Serie = Aufgaben ohne Fehler, jede im Fenster gelöst)
    comboSteps: [[20, 2], [40, 3], [60, 4], [100, 5], [150, 10]],

    // Upgrades: Preis der ersten Stufe, Preisfaktor je Stufe (gerundet nach roundPrice), höchste Stufe
    upgrades: [
      { id: 'grund', name: 'Grund-Dots', base: 60, grow: 1.15, max: Infinity },
      { id: 'fenster', name: 'Combo-Fenster', base: 150, grow: 1.6, max: 5 },
      { id: 'schwach', name: 'Schwachstellen-Bonus', base: 260, grow: 3, max: 3 },
      { id: 'schutz', name: 'Fehlerschutz', base: 400, grow: 3, max: 3 },
      { id: 'rush', name: 'DotRush freischalten', base: 300, grow: 1, max: 1 },
      { id: 'rushOft', name: 'DotRush häufiger', base: 800, grow: 2, max: 4, needs: 'rush' },
      { id: 'rushLang', name: 'DotRush länger', base: 800, grow: 2, max: 3, needs: 'rush' },
      { id: 'rushStark', name: 'DotRush stärker', base: 1000, grow: 2, max: 5, needs: 'rush' }
    ],
    grundStep: 1.1,                 // Grund-Dots: Grundwert × 1,1 je Stufe
    fensterStep: 0.1,               // Combo-Fenster: + 10 % je Stufe
    schwachQuote: 0.8,              // Schwachstelle = Trefferquote unter 80 %
    schwachBonus: [0.5, 1, 2],      // + 50 % / + 100 % / + 200 %
    schutzCharge: [50, 35, 20],     // Fehlerschutz lädt nach so vielen Aufgaben wieder auf

    // DotRush: kommt automatisch nach aktiver Spielzeit; ersetzt den Combo-Faktor, ist nie kleiner als die Combo
    rushEvery: [6, 5, 4, 3.5, 3],   // Abstand in Minuten (Stufe "häufiger" 0–4) …
    rushJitter: 1,                  // … ± so viele Minuten zufällig
    rushDur: [20, 25, 30, 35],      // Dauer in Sekunden (Stufe "länger" 0–3)
    rushMin: 5,                     // kleinster Faktor
    rushMax: [10, 15, 20, 25, 30, 35],  // größter Faktor (Stufe "stärker" 0–5)

    maxPattern: 7                   // längste Eingabe beim Tasten
  };

  const sum = a => a.reduce((x, y) => x + y, 0);
  const UP = {};
  CFG.upgrades.forEach(u => { UP[u.id] = u; });

  /* ---------- Spielstand ---------- */
  const defaults = () => ({
    v: 2,                   // Version: ab 2 gilt 1 Dot je Punkt/Strich
    dots: 0,                // ausgebbare Dots
    total: 0,               // alle jemals verdienten Dots
    solved: 0,              // gelöste Aufgaben
    bestStreak: 0,
    koch: { level: CFG.startLevel, recent: [] },
    up: { grund: 0, fenster: 0, schwach: 0, schutz: 0, rush: 0, rushOft: 0, rushLang: 0, rushStark: 0 },
    rushWait: null,         // Sekunden aktiver Spielzeit bis zum nächsten DotRush (null = noch nicht ausgelost)
    settings: { tempo: 1 }  // Spieltempo-Modus (0 = Gemütlich … 4 = Blitz); Eingabe: Einstellungen, Bereich Games
  });

  // Speicherstand auffüllen und auf gültige Werte begrenzen
  function normalize(saved) {
    const s = saved && typeof saved === 'object' ? saved : {};
    const g = Object.assign(defaults(), s);
    g.koch = Object.assign(defaults().koch, s.koch);
    g.settings = Object.assign(defaults().settings, s.settings);
    g.up = Object.assign(defaults().up, s.up);
    const lv = Math.round(Number(g.koch.level)) || CFG.startLevel;
    g.koch.level = Math.max(CFG.startLevel, Math.min(CFG.koch.length, lv));
    g.koch.recent = Array.isArray(g.koch.recent) ? g.koch.recent.slice(-CFG.recentMax) : [];
    const tp = Math.round(Number(g.settings.tempo));
    g.settings.tempo = Number.isFinite(tp) ? Math.max(0, Math.min(CFG.modes.length - 1, tp)) : 1;
    delete g.settings.task;
    delete g.settings.confirm;
    ['dots', 'total', 'solved', 'bestStreak'].forEach(k => { g[k] = Math.max(0, Number(g[k]) || 0); });
    if (!(Number(g.rushWait) > 0)) g.rushWait = null;
    CFG.upgrades.forEach(u => { g.up[u.id] = Math.max(0, Math.min(u.max, Math.floor(Number(g.up[u.id]) || 0))); });
    // Umstieg auf den neuen Maßstab: früher 10 Dots je Punkt/Strich, jetzt 1
    if (!(s.v >= 2) && (s.dots || s.total)) { g.dots /= 10; g.total /= 10; }
    g.v = 2;
    return g;
  }

  /* ---------- Lernpfad ---------- */
  const activeChars = g => CFG.koch.slice(0, g.koch.level).split('');
  const quoteOf = recent => (recent.length ? sum(recent) / recent.length : 0);
  const kochComplete = g => g.koch.level >= CFG.koch.length
    && g.koch.recent.length >= CFG.recentMax && quoteOf(g.koch.recent) >= CFG.quote;

  /* ---------- Combo ---------- */
  function comboOf(streak) {
    let f = 1;
    CFG.comboSteps.forEach(s => { if (streak >= s[0]) f = s[1]; });
    return f;
  }
  // Nächste Stufe: { at, factor, from } (from = Beginn der aktuellen Stufe) oder null beim Maximum
  function nextStep(streak) {
    let from = 0;
    for (let i = 0; i < CFG.comboSteps.length; i++) {
      const s = CFG.comboSteps[i];
      if (streak < s[0]) return { at: s[0], factor: s[1], from: from };
      from = s[0];
    }
    return null;
  }

  /* ---------- Zeiten ---------- */
  const modeOf = g => CFG.modes[g.settings.tempo];
  // Reine Tastzeit eines Codes in s: Punkt 1 Einheit, Strich 3, Pause dazwischen 1; Einheit = 1,2 s / WPM
  const tapTime = (code, wpm) => (sum(code.split('').map(c => (c === '.' ? 1 : 3))) + code.length - 1) * 1.2 / wpm;
  // Zeitfenster für jeden Modus. keyed = mit Maus oder Leertaste gemorst (dann zählt die Tastzeit dazu)
  function windowsFor(code, g, keyed) {
    const n = code.length;
    const tap = keyed ? tapTime(code, modeOf(g).wpm) : 0;
    const more = 1 + CFG.fensterStep * g.up.fenster;
    return CFG.modes.map(m => ((CFG.windowBase + CFG.windowPerSymbol * n) * m.time + m.extra + tap) * more);
  }

  /* ---------- Aufgaben ---------- */
  // Gewichtete Auswahl: unsichere Zeichen und das neueste Zeichen kommen öfter, nie zweimal hintereinander.
  // quoteFn(ch) liefert die Trefferquote 0..1 oder null (noch nie geübt).
  function pickChar(g, avoid, quoteFn, rand) {
    const list = activeChars(g);
    const weights = list.map((ch, i) => {
      if (ch === avoid && list.length > 1) return 0;
      const q = quoteFn ? quoteFn(ch) : null;
      let w = 1 + 3 * (1 - (q === null || q === undefined ? 0.5 : q));
      if (i === list.length - 1 && list.length > CFG.startLevel) w += 1.5;
      return w;
    });
    let r = (rand || Math.random)() * sum(weights);
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  }

  // Immer gemischt: 'sehen' = Morsecode sehen, Buchstaben tippen; 'tasten' = Buchstaben sehen, Code eingeben
  const pickType = rand => ((rand || Math.random)() < 0.5 ? 'sehen' : 'tasten');

  function newTask(g, avoid, quoteFn, rand) {
    const ch = pickChar(g, avoid, quoteFn, rand);
    return { ch: ch, code: table[ch], type: pickType(rand) };
  }

  // Aufgabe wird zur aktuellen: Modus und Zeitfenster gelten ab jetzt fest
  function arm(task, g, keyed) {
    task.tempo = g.settings.tempo;
    task.windows = windowsFor(task.code, g, !!keyed && task.type === 'tasten');
    task.window = task.windows[task.tempo];
    return task;
  }

  // Prüft eine Teil-Eingabe beim Tasten: 'ok' (passt bisher), 'done' (vollständig), 'wrong'
  function checkPattern(task, pat) {
    if (pat === task.code) return 'done';
    return task.code.indexOf(pat) === 0 ? 'ok' : 'wrong';
  }

  /* ---------- Wertung ---------- */
  // Grundwert eines Zeichens mit Upgrades. weak = Zeichen ist gerade eine Schwachstelle
  function valueOf(g, ch, weak) {
    let v = CFG.dotsPerSymbol * table[ch].length * Math.pow(CFG.grundStep, g.up.grund);
    if (weak && g.up.schwach > 0) v *= 1 + CFG.schwachBonus[g.up.schwach - 1];
    return v;
  }
  const isWeak = q => q !== null && q !== undefined && q < CFG.schwachQuote;

  // Faktor aus Zeit und Fehlern. combo = Combo-Faktor, falls im Fenster gelöst.
  // kind: 'ok' (im Fenster), 'late' (langsamere Stufe erreicht), 'slow' (langsamer als Gemütlich), 'error'
  function rate(task, outcome, combo) {
    const t = outcome.time;
    if (outcome.errors > 0) {
      let f = CFG.errorBase;
      for (let i = 0; i < CFG.errorBonus.length; i++) {
        if (t <= task.windows[0] * CFG.errorBonus[i][0]) { f += CFG.errorBonus[i][1]; break; }
      }
      return { kind: 'error', factor: f, reached: null };
    }
    if (t <= task.window) return { kind: 'ok', factor: CFG.modes[task.tempo].dots * combo, reached: task.tempo };
    for (let i = task.tempo - 1; i >= 0; i--) {
      if (t <= task.windows[i]) return { kind: 'late', factor: CFG.modes[i].dots * CFG.lateFactor, reached: i };
    }
    return { kind: 'slow', factor: CFG.slowFactor, reached: null };
  }

  /* ---------- Fehlerschutz ----------
     run = { streak, charge } gilt nur für die laufende Sitzung. charge = Aufgaben seit dem letzten Einsatz. */
  const schutzNeed = g => (g.up.schutz > 0 ? CFG.schutzCharge[g.up.schutz - 1] : Infinity);
  const shieldReady = (g, run) => g.up.schutz > 0 && run.charge >= schutzNeed(g);
  // Bei einem Fehler: rettet die Combo, wenn der Schutz bereit ist (true), sonst Serie auf 0
  function onError(g, run) {
    if (run.streak > 0 && shieldReady(g, run)) { run.charge = 0; return true; }
    run.streak = 0;
    return false;
  }

  // Aufgabe gelöst: Dots gutschreiben, Serie und Koch-Fortschritt fortschreiben.
  // outcome = { errors, time (s), weak, shielded, rush (Faktor des laufenden DotRush oder 0) }
  function solve(g, run, task, outcome) {
    const onTime = outcome.errors === 0 && outcome.time <= task.window;
    let combo = onTime ? comboOf(run.streak + 1) : 1;
    if (onTime && outcome.rush) combo = Math.max(outcome.rush, combo);   // DotRush ersetzt die Combo, nie weniger
    const r = rate(task, outcome, combo);
    const dots = valueOf(g, task.ch, outcome.weak) * r.factor;
    g.dots += dots;
    g.total += dots;
    g.solved++;
    if (onTime) run.streak++;
    else if (!(outcome.errors > 0 && outcome.shielded)) run.streak = 0;
    g.bestStreak = Math.max(g.bestStreak, run.streak);
    if (run.charge < 1e9) run.charge++;

    // Trefferquote: zählt nur, ob ohne Fehler gelöst wurde (die Zeit spielt dafür keine Rolle)
    g.koch.recent.push(outcome.errors === 0 ? 1 : 0);
    if (g.koch.recent.length > CFG.recentMax) g.koch.recent.shift();
    let unlocked = null;
    if (g.koch.level < CFG.koch.length && g.koch.recent.length >= CFG.recentMax
      && quoteOf(g.koch.recent) >= CFG.quote) {
      g.koch.level++;
      g.koch.recent = [];
      unlocked = CFG.koch[g.koch.level - 1];
    }
    return { dots: dots, kind: r.kind, factor: r.factor, combo: combo, reached: r.reached,
      streak: run.streak, unlocked: unlocked };
  }

  /* ---------- Preise und Upgrades ---------- */
  // Rundung: beginnt der Preis mit 1, auf 2 Ziffern aufrunden (1.050 → 1.100);
  // sonst auf die nächste gerade zweite Ziffer (2.070 → 2.200, 3.850 → 4.000, 9.850 → 10.000)
  function roundPrice(x) {
    const k = Math.pow(10, Math.floor(Math.log10(x)));
    const step = Math.max(1, x < 2 * k ? k / 10 : k / 5);
    return Math.round(Math.ceil(x / step - 1e-9) * step);
  }
  const priceCache = {};
  // Preis der Stufe level+1 (level = aktuelle Stufe). Jeder Preis wird aus dem gerundeten vorherigen berechnet.
  function priceOf(id, level) {
    const u = UP[id];
    const list = priceCache[id] || (priceCache[id] = [roundPrice(u.base)]);
    while (list.length <= level) list.push(roundPrice(list[list.length - 1] * u.grow));
    return list[level];
  }
  const locked = (g, id) => !!UP[id].needs && !g.up[UP[id].needs];   // z. B. "häufiger" erst nach "freischalten"
  const canBuy = (g, id) => !locked(g, id) && g.up[id] < UP[id].max && g.dots >= priceOf(id, g.up[id]);
  function buy(g, id) {
    if (!canBuy(g, id)) return false;
    g.dots -= priceOf(id, g.up[id]);
    g.up[id]++;
    return true;
  }

  /* ---------- DotRush ---------- */
  const rushOn = g => g.up.rush > 0;
  const rushDur = g => CFG.rushDur[g.up.rushLang];
  const rushMax = g => CFG.rushMax[g.up.rushStark];
  // Wartezeit bis zum nächsten DotRush in Sekunden aktiver Spielzeit
  function rushNextWait(g, rand) {
    const m = CFG.rushEvery[g.up.rushOft] + ((rand || Math.random)() * 2 - 1) * CFG.rushJitter;
    return Math.max(30, m * 60);
  }
  // Faktor eines neuen DotRush: ganze Zahl zwischen max(5, Combo) und max(Höchstfaktor, Combo)
  function rushFactor(g, combo, rand) {
    const lo = Math.max(CFG.rushMin, combo), hi = Math.max(rushMax(g), combo);
    return lo + Math.floor((rand || Math.random)() * (hi - lo + 1));
  }

  /* ---------- Zahlen-Anzeige ---------- */
  const NAMES = [[1e24, 'Qio.'], [1e21, 'Trd.'], [1e18, 'Trio.'], [1e15, 'Brd.'], [1e12, 'Bio.'],
    [1e9, 'Mrd.'], [1e6, 'Mio.'], [1e3, 'Tsd.']];
  // whole = ganze Zahl auch unter 100 (z. B. für Preise)
  function fmt(n, whole) {
    n = Math.max(0, n || 0);
    const de = (x, d) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
    const cut = (x, d) => Math.floor(x * d + 1e-6) / d;   // abschneiden statt runden (Anzeige springt nie vor)
    if (n < 100 && !whole) return de(cut(n, 10), 1);
    if (n < 1e4) return Math.floor(n).toLocaleString('de-DE');
    for (let i = 0; i < NAMES.length; i++) {
      if (n >= NAMES[i][0]) return de(cut(n / NAMES[i][0], 100), 2) + ' ' + NAMES[i][1];
    }
    return String(n);
  }

  return { CFG, defaults, normalize, activeChars, quoteOf, kochComplete, comboOf, nextStep,
    modeOf, tapTime, windowsFor, pickChar, pickType, newTask, arm, checkPattern,
    valueOf, isWeak, rate, onError, shieldReady, schutzNeed, solve,
    roundPrice, priceOf, locked, canBuy, buy, rushOn, rushDur, rushMax, rushNextWait, rushFactor, fmt };
};

if (typeof module !== 'undefined' && module.exports) module.exports = IdleLogic;
