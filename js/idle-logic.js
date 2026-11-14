/* Games (Idle-Spiel): die Spielregeln als reine Logik, ohne Oberfläche.
   So lassen sich die Regeln getrennt testen und alle Zahlen an einer Stelle (CFG) einstellen.
   Aufruf: const L = IdleLogic(Morse.TABLE); */
const IdleLogic = (table) => {
  'use strict';

  const CFG = {
    // Lernpfad Phase 1: Buchstaben nach der Koch-Methode
    koch: 'KMURESNAPTLWIJZFOYVGQHBCDX',
    startLevel: 2,          // Start mit K und M
    recentMax: 20,          // so viele letzte Aufgaben zählen für die Trefferquote
    quote: 0.9,             // ab dieser Trefferquote kommt das nächste Zeichen dazu

    // Dots: Wert eines Buchstabens = dotsPerSymbol × Anzahl Punkte und Striche
    // (später: Zahlen ca. 1,5 × der wertvollste Buchstabe, dann Sonderzeichen, dann Doppelbuchstaben)
    dotsPerSymbol: 10,
    errorFactor: 0.5,       // Aufgabe mit Fehler gibt nur die Hälfte

    // Combo: ab dieser Serie gilt der Faktor (Serie = gelöste Aufgaben ohne Fehler, jede im Zeitfenster)
    comboSteps: [[20, 2], [40, 3], [60, 4], [100, 5], [150, 10]],

    // Zeitfenster für die Combo in Sekunden = (Grundzeit + Zeit je Punkt/Strich × Anzahl) × Tempo-Faktor
    windowBase: 3,
    windowPerSymbol: { sehen: 0.8, tasten: 1.2 },

    // Tempo-Regler: kürzeres Zeitfenster, dafür mehr Dots
    tempos: [
      { name: 'Gemütlich', time: 1.5, dots: 0.8 },
      { name: 'Normal', time: 1, dots: 1 },
      { name: 'Zügig', time: 0.8, dots: 1.25 },
      { name: 'Schnell', time: 0.65, dots: 1.5 },
      { name: 'Blitz', time: 0.5, dots: 2 }
    ],

    maxPattern: 7           // längste Eingabe beim Tasten
  };

  const sum = a => a.reduce((x, y) => x + y, 0);

  /* ---------- Spielstand ---------- */
  const defaults = () => ({
    dots: 0,                // ausgebbare Dots
    total: 0,               // alle jemals verdienten Dots
    solved: 0,              // gelöste Aufgaben
    bestStreak: 0,
    koch: { level: CFG.startLevel, recent: [] },
    settings: { tempo: 1 }   // Eingabe und Bestätigung: Einstellungen, Bereich Games
  });

  // Speicherstand auffüllen und auf gültige Werte begrenzen
  function normalize(saved) {
    const s = saved && typeof saved === 'object' ? saved : {};
    const d = defaults();
    const g = Object.assign(d, s);
    g.koch = Object.assign(defaults().koch, s.koch);
    g.settings = Object.assign(defaults().settings, s.settings);
    const lv = Math.round(Number(g.koch.level)) || CFG.startLevel;
    g.koch.level = Math.max(CFG.startLevel, Math.min(CFG.koch.length, lv));
    g.koch.recent = Array.isArray(g.koch.recent) ? g.koch.recent.slice(-CFG.recentMax) : [];
    const tp = Math.round(Number(g.settings.tempo));
    g.settings.tempo = Number.isFinite(tp) ? Math.max(0, Math.min(CFG.tempos.length - 1, tp)) : 1;
    delete g.settings.task;  // Aufgabenart ist nicht mehr wählbar: immer gemischt
    delete g.settings.confirm;
    ['dots', 'total', 'solved', 'bestStreak'].forEach(k => { g[k] = Number(g[k]) || 0; });
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

  /* ---------- Aufgaben ---------- */
  const symbolsOf = ch => table[ch].length;
  const valueOf = ch => CFG.dotsPerSymbol * symbolsOf(ch);
  const windowOf = (ch, type, tempo) =>
    Math.round((CFG.windowBase + CFG.windowPerSymbol[type] * symbolsOf(ch)) * CFG.tempos[tempo].time * 10) / 10;

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
  function pickType(g, rand) {
    return (rand || Math.random)() < 0.5 ? 'sehen' : 'tasten';
  }

  function newTask(g, avoid, quoteFn, rand) {
    const ch = pickChar(g, avoid, quoteFn, rand);
    return { ch: ch, code: table[ch], type: pickType(g, rand) };
  }

  // Aufgabe wird zur aktuellen: Tempo und Zeitfenster gelten ab jetzt fest
  function arm(task, g) {
    task.tempo = g.settings.tempo;
    task.window = windowOf(task.ch, task.type, task.tempo);
    return task;
  }

  // Prüft eine Teil-Eingabe beim Tasten: 'ok' (passt bisher), 'done' (vollständig), 'wrong'
  function checkPattern(task, pat) {
    if (pat === task.code) return 'done';
    return task.code.indexOf(pat) === 0 ? 'ok' : 'wrong';
  }

  /* ---------- Belohnung ---------- */
  // streak = Serie vor dieser Aufgabe; outcome = { errors, late }
  function reward(task, outcome, streak) {
    const clean = outcome.errors === 0 && !outcome.late;
    const combo = clean ? comboOf(streak + 1) : 1;
    const err = outcome.errors > 0 ? CFG.errorFactor : 1;
    return { dots: Math.round(valueOf(task.ch) * CFG.tempos[task.tempo].dots * combo * err), combo: combo };
  }

  // Aufgabe gelöst: Dots gutschreiben, Serie und Koch-Fortschritt fortschreiben.
  // run = { streak } gilt nur für die laufende Sitzung.
  function solve(g, run, task, outcome) {
    const r = reward(task, outcome, run.streak);
    const clean = outcome.errors === 0;
    g.dots += r.dots;
    g.total += r.dots;
    g.solved++;
    run.streak = (clean && !outcome.late) ? run.streak + 1 : 0;
    g.bestStreak = Math.max(g.bestStreak, run.streak);

    // Trefferquote: zählt nur, ob ohne Fehler gelöst wurde (Tempo spielt keine Rolle)
    g.koch.recent.push(clean ? 1 : 0);
    if (g.koch.recent.length > CFG.recentMax) g.koch.recent.shift();
    let unlocked = null;
    if (g.koch.level < CFG.koch.length && g.koch.recent.length >= CFG.recentMax
      && quoteOf(g.koch.recent) >= CFG.quote) {
      g.koch.level++;
      g.koch.recent = [];
      unlocked = CFG.koch[g.koch.level - 1];
    }
    return { dots: r.dots, combo: r.combo, streak: run.streak, unlocked: unlocked };
  }

  return { CFG, defaults, normalize, activeChars, quoteOf, kochComplete, comboOf, nextStep,
    valueOf, windowOf, pickChar, pickType, newTask, arm, checkPattern, reward, solve };
};

if (typeof module !== 'undefined' && module.exports) module.exports = IdleLogic;
