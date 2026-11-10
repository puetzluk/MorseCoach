/* Morse Coach – Startseite als scrollbare Comic-Szene.
   Ablauf: Funkhaus von außen (A) → Heranzoomen auf die Tür (B) → Tür öffnet sich (C) → Funkraum (D).
   Aus der Scrollposition wird ein Fortschritt p (0–1) berechnet und als CSS-Variablen gesetzt.
   CSS baut daraus die Bewegungen (nur transform und opacity). */
(function () {
  'use strict';

  const host = document.getElementById('scene');
  if (!host || typeof SceneArt === 'undefined') return;
  const A = SceneArt;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);       // Teilfortschritt zwischen a und b
  const smooth = t => t * t * (3 - 2 * t);                         // weiches Ein- und Ausblenden
  const flag = (name, val) => (typeof Store !== 'undefined' && Store.flag) ? Store.flag(name, val) : undefined;

  const ROOM_P = 0.816; // Scroll-Fortschritt, bei dem man frontal vor dem Apparat steht

  /* ---------- Inhalte ---------- */
  const MODES = {
    lernen: { name: 'Lernen', what: 'Stift und Heft', desc: 'Die Koch-Methode oder deine eigene Zeichenauswahl.' },
    hoeren: { name: 'Hören', what: 'Kopfhörer', desc: 'Zeichengruppen, Wörter und Sätze in fünf Schwierigkeitsstufen.' },
    senden: { name: 'Senden', what: 'Morsetaste', desc: 'Gib Zeichen mit den Tasten E (kurz) und T (lang) oder per Knopf ein.' },
    spiel: { name: 'Spiel', what: 'Papierflugzeug', desc: 'Morse-Flug: Jedes Hindernis trägt einen Buchstaben. Gib seinen Code schnell genug ein, um weiterzufliegen.' },
    uebersetzer: { name: 'Übersetzer', what: 'Codebuch', desc: 'Text in Morsecode umwandeln und umgekehrt, mit Wiedergabe.' },
    statistik: { name: 'Statistik', what: 'Wandtafel mit Diagramm', desc: 'Dein Fortschritt im Verlauf, nach Tag, Woche, Monat und Jahr.' },
    einstellungen: { name: 'Einstellungen', what: 'Drehknopf am Funkgerät', desc: 'Design, Ton, Tempo und Training einstellen.' }
  };
  const LABELS = [
    { short: 'Willkommen', title: 'Willkommen',
      text: 'Willkommen beim Morse Coach. Erlerne das Morsealphabet Schritt für Schritt, schule dein Gehör und steigere deine Geschwindigkeit beim Empfangen und Senden.' },
    { short: 'Koch-Methode', title: 'Die Koch-Methode',
      text: 'Du hörst die Zeichen von Beginn an im Zieltempo, neue Zeichen kommen erst hinzu, wenn du die bisherigen sicher erkennst. Alternativ wählst du deine Zeichen selbst.' },
    { short: 'Fünf Hörstufen', title: 'Fünf Hörstufen',
      text: 'Zeichengruppen, Wörter und Sätze in fünf Schwierigkeitsstufen, mit automatischer Tempoanpassung.' },
    { short: 'E = kurz · T = lang', title: 'E = kurz · T = lang',
      text: 'Gib Zeichen mit den Tasten E (kurz) und T (lang) oder per Knopf ein.' },
    { short: 'Fortschritt wird gespeichert', title: 'Fortschritt wird gespeichert',
      text: 'Dein Fortschritt wird im Browser gespeichert. In der Statistik siehst du ihn im Verlauf, nach Tag, Woche, Monat und Jahr.' },
    { short: 'Drei Designs', title: 'Drei Designs',
      text: 'Dunkel, Hell und Funkgerät. Du wechselst das Design oben über den Knopf „Design“ oder in den Einstellungen.' }
  ];

  /* ---------- Aufbau der Szene ---------- */
  const key = A.keyViews();
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const btnAttrs = mode => 'type="button" class="sc-obj" data-mode="' + mode + '" aria-label="' + esc(MODES[mode].name + ' öffnen (' + MODES[mode].what + ')') + '" title="' + esc(MODES[mode].desc) + '"';
  const tag = mode => '<span class="sc-tag" aria-hidden="true">' + MODES[mode].name + '</span>';
  const obj = (mode, pos, art) => '<div class="sc-pos ' + pos + '"><button ' + btnAttrs(mode) + '>' + art + tag(mode) + '</button></div>';
  const layer = (cls, svg) => '<div class="sc-layer ' + cls + '">' + svg + '</div>';

  host.classList.add('sc');
  host.innerHTML = A.defs +
    '<div class="sc-stage" data-phase="a">' +
      '<div class="sc-room" inert>' +
        '<div class="sc-cam">' +
          '<div class="sc-wallbg" aria-hidden="true"><div class="sc-wains"></div><div class="sc-floor"></div></div>' +
          '<div class="sc-cone" aria-hidden="true"></div>' +
          '<div class="sc-pos sc-p-window sc-wallpar" aria-hidden="true">' + A.windowArt() + '</div>' +
          '<div class="sc-pos sc-p-lamp sc-wallpar" aria-hidden="true">' + A.lampArt() + '</div>' +
          '<div class="sc-table" aria-hidden="true">' + A.tableArt(false) + A.tableArt(true) + '</div>' +
          // Modus-Objekte auf dem Tisch
          obj('lernen', 'sc-p-heft sc-tablepar', A.notebookArt()) +
          obj('hoeren', 'sc-p-phones sc-tablepar', A.phonesArt()) +
          '<div class="sc-pos sc-p-key sc-tablepar"><button ' + btnAttrs('senden').replace('class="sc-obj"', 'class="sc-obj sc-key"') + '>' +
            '<span class="sc-views" style="--kar:' + key.w + ' / ' + key.h + '">' + key.svgs[1] + key.svgs[0] + key.svgs[2] + '</span>' +
            '<span class="sc-tap" aria-hidden="true">TAP!</span>' + tag('senden') + '</button></div>' +
          obj('spiel', 'sc-p-plane sc-tablepar', A.planeArt()) +
          // Modus-Objekte an der Wand
          '<div class="sc-pos sc-p-shelf sc-wallpar">' + A.shelfArt() +
            '<button ' + btnAttrs('uebersetzer').replace('class="sc-obj"', 'class="sc-obj sc-book"') + '>' + A.codebookArt() + tag('uebersetzer') + '</button></div>' +
          obj('statistik', 'sc-p-board sc-wallpar', A.boardArt()) +
          '<div class="sc-pos sc-p-radio sc-wallpar">' +
            '<button ' + btnAttrs('einstellungen').replace('class="sc-obj"', 'class="sc-obj sc-knob"') + '>' + A.knobArt() + tag('einstellungen') + '</button>' +
            '<button type="button" id="radio" class="sc-obj sc-radio" aria-label="Funkgerät: einen Funkspruch abspielen">' + A.radioArt() +
              '<span class="sc-tag" aria-hidden="true">Funkspruch</span></button>' +
            '<p id="radioCaption" class="sc-caption" aria-live="polite"></p>' +
          '</div>' +
          // schwebende Etiketten
          '<div class="sc-orbit">' + LABELS.map((l, i) =>
            '<button type="button" class="sc-label" data-i="' + i + '" aria-haspopup="dialog" aria-expanded="false">' + esc(l.short) + '</button>').join('') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sc-ext" aria-hidden="true">' +
        layer('sc-l-sky', A.sky()) +
        '<div class="sc-layer sc-l-zep"><div class="sc-zep"><div class="sc-zep-in">' + A.zeppelin + '</div></div></div>' +
        layer('sc-l-c3', A.city3()) + layer('sc-l-f3 sc-fog', A.fog3()) +
        layer('sc-l-c2', A.city2()) + layer('sc-l-f2 sc-fog', A.fog2()) +
        layer('sc-l-c1', A.city1()) + layer('sc-l-f1 sc-fog', A.fog1()) +
        layer('sc-l-hills', A.hills()) + layer('sc-l-house', A.houseLayer()) +
      '</div>' +
      '<div class="sc-close" aria-hidden="true">' + A.closeup() + '</div>' +
      '<div class="sc-haze" aria-hidden="true"></div>' +
      '<div class="sc-ui">' +
        '<div class="sc-title"><p class="sc-logo">Morse<span>Coach</span></p>' +
          '<button type="button" class="sc-btn sc-hint">Scrollen <span aria-hidden="true">↓</span></button></div>' +
        '<button type="button" class="sc-btn sc-skip">Überspringen</button>' +
        '<button type="button" class="sc-btn sc-sound" aria-pressed="false" aria-label="Ton der Szene" title="Ton an/aus"></button>' +
      '</div>' +
      '<div class="sc-bubble" role="dialog" aria-modal="false" aria-labelledby="scBubbleT" hidden>' +
        '<button type="button" class="sc-bx" aria-label="Sprechblase schließen">' + A.icons.close + '</button>' +
        '<h3 id="scBubbleT"></h3><p></p></div>' +
      '<div class="sc-grain" aria-hidden="true"></div>' +
    '</div>';

  const $ = s => host.querySelector(s);
  const stage = $('.sc-stage'), room = $('.sc-room'), cam = $('.sc-cam');
  const keyBtn = $('.sc-key'), bubble = $('.sc-bubble'), soundBtn = $('.sc-sound');
  const labels = Array.from(host.querySelectorAll('.sc-label'));

  /* ---------- Zustand ---------- */
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const st = {
    active: false, booted: false, reduced: reduceMQ.matches, hidden: document.hidden, inView: true,
    W: 1, H: 1, start: 0, range: 1, kEnd: 10, p: -1, phase: '', rx: 200, ry: 60, portrait: false,
    orbiting: false, hold: false, ang: -Math.PI / 2, lastT: 0, bubbleI: -1, going: false, intro: false, gesture: false
  };
  let raf = 0;

  // CSS-Variablen nur schreiben, wenn sich der Wert ändert, und nur an dem Teil der Szene,
  // der sie braucht (dann muss der Browser weniger Elemente neu berechnen)
  const extEl = $('.sc-ext'), closeEl = $('.sc-close'), uiEl = $('.sc-ui');
  const TARGET = {
    '--k': [extEl, closeEl], '--fog': [extEl], '--ext': [extEl], '--cu': [closeEl], '--cuz': [closeEl], '--wing': [closeEl],
    '--title': [uiEl], '--rs': [room], '--vl': [room], '--vr': [room], '--vf': [room], '--vt': [room], '--vabs': [room]
  };
  const vars = {};
  function setVar(name, v) {
    const s = typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : v;
    if (vars[name] === s) return;
    vars[name] = s;
    (TARGET[name] || [stage]).forEach(el => el.style.setProperty(name, s));
  }

  /* ---------- Messen (nur bei Größenänderung, nie pro Bild) ---------- */
  function measure() {
    if (!st.active) return;
    host.style.setProperty('--sc-vw', document.documentElement.clientWidth + 'px');
    const hh = document.getElementById('topbar').offsetHeight;
    const r = host.getBoundingClientRect();
    st.W = stage.clientWidth || 1;
    st.H = stage.clientHeight || 1;
    st.start = r.top + window.scrollY - hh;
    st.range = Math.max(1, host.offsetHeight - st.H);
    // Wo liegt die Tür (Punkt 800/672 der Zeichnung) auf dem Bildschirm?
    const s = Math.max(st.W / 1600, st.H / 900);
    const ox = (st.W - 1600 * s) / 2 + 800 * s, oy = st.H - 900 * s + 672 * s;
    st.kEnd = Math.max(3, 0.75 * st.H / (56 * s));   // am Ende von B ist die Tür 3/4 so hoch wie die Bühne
    const u = s * st.kEnd;                           // Pixel pro Einheit in der Nahansicht
    setVar('--ox', ox.toFixed(1) + 'px');
    setVar('--oy', oy.toFixed(1) + 'px');
    setVar('--kend', st.kEnd);
    setVar('--cu-l', (ox - 100 * u).toFixed(1) + 'px');
    setVar('--cu-t', (oy - 60 * u).toFixed(1) + 'px');
    setVar('--cu-w', (200 * u).toFixed(1) + 'px');
    setVar('--cu-h', (120 * u).toFixed(1) + 'px');
    setVar('--cu-ox', (100 * u).toFixed(1) + 'px');
    setVar('--cu-oy', (60 * u).toFixed(1) + 'px');
    st.portrait = st.W / st.H < 0.9;
    st.rx = st.portrait ? 0.43 * st.W : Math.min(0.36 * st.W, 0.75 * st.H);
    st.ry = (st.portrait ? 0.075 : 0.12) * st.H;
    st.lw = labels.map(el => el.offsetWidth);   // Breiten einmal messen, damit kein Etikett aus dem Bild ragt
    st.p = -1;
    if (st.reduced) renderStatic(); else placeLabels();
    if (st.bubbleI >= 0) positionBubble(labels[st.bubbleI]);
  }

  /* ---------- Darstellen ---------- */
  function render(p) {
    const pb = seg(p, .15, .55), pc = seg(p, .55, .65), pd = seg(p, .65, 1);
    // Zoom gleichmäßig im "Logarithmus": jeder Scrollschritt vergrößert um denselben Faktor
    const e = 0.5 - 0.5 * Math.cos(Math.PI * pb);
    setVar('--k', Math.pow(st.kEnd, e));
    setVar('--title', 1 - smooth(seg(p, .02, .12)));
    setVar('--fog', 0.9 * (1 - smooth(seg(pb, 0, .6))));
    setVar('--ext', 1 - smooth(seg(pb, .86, 1)));
    const cu = smooth(seg(pb, .7, .86)) * (1 - smooth(seg(pc, .5, 1)));
    setVar('--cu', cu);
    setVar('--wing', smooth(seg(pc, 0, .5)));
    setVar('--cuz', 1 + 1.8 * smooth(seg(pc, .3, 1)));
    setVar('--rs', 1.45 - 0.45 * smooth(seg(pc, .2, 1)));
    // Herumgehen: v = 0 (links ¾) … 1 (vorn) … 2 (rechts ¾)
    const v = 2 * seg(pd, .05, .9);
    const vl = 1 - smooth(seg(v, .35, .65)), vr = smooth(seg(v, 1.35, 1.65));
    setVar('--vl', vl);
    setVar('--vr', vr);
    setVar('--vf', 1 - Math.max(seg(vl, .6, 1), seg(vr, .6, 1)));
    setVar('--vt', v - 1);
    setVar('--vabs', Math.abs(v - 1));
    setPhase(p < .15 ? 'a' : p < .55 ? 'b' : p < .65 ? 'c' : 'd', cu > 0.001);
  }

  // Ohne Bewegung: direkt der Funkraum, frontal
  function renderStatic() {
    setVar('--k', 1); setVar('--ext', 0); setVar('--cu', 0); setVar('--rs', 1); setVar('--title', 0);
    setVar('--vl', 0); setVar('--vr', 0); setVar('--vf', 1); setVar('--vt', 0); setVar('--vabs', 0);
    setPhase('d', false);
    placeLabels(true);
  }

  function setPhase(ph, cuOn) {
    stage.classList.toggle('cu-on', cuOn);
    if (ph === st.phase) return;
    st.phase = ph;
    stage.dataset.phase = ph;
    const inRoom = ph === 'd';
    room.inert = !inRoom;
    room.toggleAttribute('inert', !inRoom);
    if (!inRoom) closeBubble(false);
    if (inRoom) endIntro();
    updateOrbit();
  }

  function frame(t) {
    raf = 0;
    if (!st.active) return;
    if (!st.reduced) {
      const p = clamp((window.scrollY - st.start) / st.range, 0, 1);   // nur lesen …
      if (p !== st.p) { st.p = p; render(p); }                         // … dann schreiben
    }
    if (st.orbiting) {
      orbit(t || performance.now());
      raf = requestAnimationFrame(frame);
    }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  /* ---------- Etiketten auf der Ellipse ---------- */
  const STATIC_ANG = [195, 345, 150, 30, 115, 65].map(d => d * Math.PI / 180);
  function placeLabels(fixed) {
    const n = labels.length;
    labels.forEach((el, i) => {
      const a = fixed || st.reduced ? STATIC_ANG[i] : st.ang + i * Math.PI * 2 / n;
      const sn = Math.sin(a), depth = (sn + 1) / 2;
      const ry = fixed || st.reduced ? st.ry * 1.6 : st.ry;
      const lim = Math.max(0, st.W / 2 - (st.lw ? st.lw[i] : 0) / 2 - 8);
      const x = clamp(Math.cos(a) * st.rx, -lim, lim), y = sn * ry;
      const sc = fixed || st.reduced ? 1 : 0.74 + depth * 0.36;
      el.style.transform = 'translateX(calc(var(--vt, 0) * 1.2vw)) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
      const z = fixed || st.reduced || sn > 0 ? 6 : 2;
      if (el._z !== z) { el._z = z; el.style.zIndex = z; }
      el.style.opacity = fixed || st.reduced ? '1' : (0.72 + depth * 0.28).toFixed(2);
    });
  }
  function orbit(t) {
    const dt = Math.min(0.05, (t - st.lastT) / 1000);
    st.lastT = t;
    if (st.hold || st.bubbleI >= 0) return;
    st.ang += dt * 0.22;
    placeLabels();
  }
  function updateOrbit() {
    const want = st.active && st.phase === 'd' && !st.reduced && !st.hidden && st.inView;
    if (want && !st.orbiting) { st.orbiting = true; st.lastT = performance.now(); kick(); }
    if (!want) st.orbiting = false;
    stage.classList.toggle('paused', !st.active || st.hidden || !st.inView);
  }

  const orbitBox = $('.sc-orbit');
  orbitBox.addEventListener('pointerover', e => { if (e.target.closest('.sc-label')) st.hold = true; });
  orbitBox.addEventListener('pointerout', e => { if (e.target.closest('.sc-label')) st.hold = false; });
  orbitBox.addEventListener('focusin', () => { st.hold = true; });
  orbitBox.addEventListener('focusout', () => { st.hold = false; });

  /* ---------- Sprechblase ---------- */
  function openBubble(i) {
    const L = LABELS[i];
    if (st.bubbleI >= 0) labels[st.bubbleI].setAttribute('aria-expanded', 'false');
    st.bubbleI = i;
    bubble.querySelector('h3').textContent = L.title;
    bubble.querySelector('p').textContent = L.text;
    bubble.hidden = false;
    labels[i].setAttribute('aria-expanded', 'true');
    positionBubble(labels[i]);
    bubble.querySelector('.sc-bx').focus({ preventScroll: true });
  }
  function closeBubble(returnFocus) {
    if (st.bubbleI < 0) return;
    const lab = labels[st.bubbleI];
    lab.setAttribute('aria-expanded', 'false');
    bubble.hidden = true;
    st.bubbleI = -1;
    if (returnFocus) lab.focus({ preventScroll: true });
  }
  // Erst alles messen, dann Position schreiben
  function positionBubble(lab) {
    const sr = stage.getBoundingClientRect(), lr = lab.getBoundingClientRect();
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const cx = lr.left + lr.width / 2 - sr.left, top = lr.top - sr.top, bottom = lr.bottom - sr.top;
    let x, y, down;
    if (st.W < 640) {
      // Handy: Sprechblase oben oder unten am Rand, der Apparat in der Mitte bleibt sichtbar
      x = (st.W - bw) / 2;
      down = (top + bottom) / 2 > st.H * 0.45;
      y = down ? 10 : st.H - bh - 10;
    } else {
      x = clamp(cx - bw / 2, 12, st.W - bw - 12);
      down = (top + bottom) / 2 > st.H * 0.42;
      y = down ? top - bh - 22 : bottom + 22;
      y = clamp(y, 12, st.H - bh - 12);
    }
    bubble.classList.toggle('down', down);
    bubble.classList.toggle('up', !down);
    bubble.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    bubble.style.setProperty('--tail', Math.round(clamp(cx - x, 26, bw - 26)) + 'px');
  }
  labels.forEach((el, i) => el.addEventListener('click', () => {
    if (st.bubbleI === i) closeBubble(true); else openBubble(i);
  }));
  bubble.querySelector('.sc-bx').addEventListener('click', () => closeBubble(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && st.bubbleI >= 0) closeBubble(true); });
  document.addEventListener('pointerdown', e => {
    if (st.bubbleI >= 0 && !bubble.contains(e.target) && !e.target.closest('.sc-label')) closeBubble(false);
  });

  /* ---------- Objekte: Kamera zoomt 400 ms auf das Objekt, dann öffnet der Modus ---------- */
  function go(mode, btn) {
    if (st.going || !window.MorseApp) return;
    st.going = true;
    closeBubble(false);
    const done = () => {
      st.going = false;
      window.MorseApp.showTab(mode);
      cam.classList.remove('zoom');
    };
    if (st.reduced) { done(); return; }
    const sr = stage.getBoundingClientRect(), br = btn.getBoundingClientRect();
    cam.style.transformOrigin = (br.left + br.width / 2 - sr.left).toFixed(0) + 'px ' + (br.top + br.height / 2 - sr.top).toFixed(0) + 'px';
    cam.classList.add('zoom');
    setTimeout(done, 400);
  }
  host.querySelectorAll('.sc-obj[data-mode]').forEach(b => b.addEventListener('click', () => {
    if (b === keyBtn) tap();
    go(b.dataset.mode, b);
  }));

  function tap() {
    keyBtn.classList.remove('klack');
    void keyBtn.offsetWidth;            // Animation neu starten
    keyBtn.classList.add('klack');
    clearTimeout(st.tapT);
    st.tapT = setTimeout(() => keyBtn.classList.remove('klack'), 700);
    if (snd.on) { klack(); if (window.MorseApp) Morse.beep(1, window.MorseApp.audioOpts()); }
  }

  /* ---------- Ton: leises Funkrauschen und Klick-Geräusch (vorhandene Audio-Logik aus morse.js) ---------- */
  const snd = { on: !!flag('sound'), src: null, gain: null, buf: null };
  const audio = () => (typeof Morse !== 'undefined' && Morse.ctx) ? Morse.ctx() : null;
  function noiseBuffer(c) {
    if (snd.buf) return snd.buf;
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.7 + 0.3 * Math.sin(i / len * Math.PI * 8));
    return (snd.buf = b);
  }
  function startNoise() {
    const c = audio();
    if (!c) return;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.6;
    const vol = window.MorseApp ? window.MorseApp.audioOpts().vol : 0.3;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.006 + vol * 0.04, c.currentTime + 0.8);
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start();
    snd.src = src; snd.gain = g;
  }
  function stopNoise() {
    if (!snd.src) return;
    const c = audio(), src = snd.src, g = snd.gain;
    snd.src = snd.gain = null;
    try {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
      src.stop(c.currentTime + 0.35);
    } catch (e) { /* schon beendet */ }
  }
  function updateNoise() {
    const want = snd.on && st.active && !st.hidden && st.gesture;
    if (want && !snd.src) startNoise();
    else if (!want && snd.src) stopNoise();
  }
  function klack() {
    const c = audio();
    if (!c) return;
    const src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    src.buffer = noiseBuffer(c);
    hp.type = 'highpass'; hp.frequency.value = 2500;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(hp); hp.connect(g); g.connect(c.destination);
    src.start(t, Math.random()); src.stop(t + 0.05);
  }
  function showSound() {
    soundBtn.innerHTML = snd.on ? A.icons.soundOn : A.icons.soundOff;
    soundBtn.setAttribute('aria-pressed', snd.on ? 'true' : 'false');
  }
  soundBtn.addEventListener('click', () => {
    snd.on = !snd.on;
    flag('sound', snd.on);
    st.gesture = true;
    showSound();
    updateNoise();
  });
  // Browser erlauben Ton erst nach einer Nutzeraktion
  const firstGesture = () => {
    if (st.gesture) return;
    st.gesture = true;
    updateNoise();
  };
  document.addEventListener('pointerdown', firstGesture, { once: true });
  document.addEventListener('keydown', firstGesture, { once: true });
  showSound();

  /* ---------- Intro ---------- */
  function startIntro() {
    if (st.reduced) return;
    const seen = !!flag('introSeen');
    stage.classList.add(seen ? 'intro-short' : 'intro-long');
    st.intro = true;
    st.introT = setTimeout(endIntro, seen ? 800 : 3000);
  }
  function endIntro() {
    clearTimeout(st.introT);
    if (!st.intro) return;
    st.intro = false;
    stage.classList.remove('intro-long', 'intro-short');
    flag('introSeen', true);
  }

  /* ---------- Navigation innerhalb der Szene ---------- */
  function jumpToRoom() {
    if (st.reduced) { window.scrollTo(0, 0); return; }
    window.scrollTo(0, Math.round(st.start + st.range * ROOM_P));
    st.p = -1;
    frame(performance.now());
  }
  $('.sc-skip').addEventListener('click', () => {
    endIntro();
    jumpToRoom();
    host.querySelector('.sc-obj[data-mode]').focus({ preventScroll: true });
  });
  $('.sc-hint').addEventListener('click', () => {
    endIntro();
    window.scrollTo({ top: Math.round(st.start + st.range * ROOM_P), behavior: 'smooth' });
  });

  /* ---------- Ereignisse ---------- */
  // app.js meldet jeden Tabwechsel
  document.addEventListener('morse:tab', e => {
    const on = e.detail === 'start';
    st.active = on;
    document.body.classList.toggle('on-start', on);
    if (!on) {
      closeBubble(false);
      updateOrbit();
      updateNoise();
      return;
    }
    measure();
    if (!st.booted) { st.booted = true; startIntro(); }
    else jumpToRoom();   // zurück zur Startseite: man steht gleich im Funkraum
    kick();
    updateOrbit();
    updateNoise();
  });

  window.addEventListener('scroll', kick, { passive: true });
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; measure(); kick(); });
  });
  document.addEventListener('visibilitychange', () => {
    st.hidden = document.hidden;
    updateOrbit();
    updateNoise();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(en => {
      st.inView = en[0].isIntersecting;
      updateOrbit();
    }).observe(stage);
  }
  function applyReduced() {
    st.reduced = reduceMQ.matches;
    host.classList.toggle('sc-reduced', st.reduced);
    if (st.reduced) endIntro();
    st.phase = '';
    measure();
    if (!st.reduced) { st.p = -1; kick(); }
    updateOrbit();
  }
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', applyReduced);
  host.classList.toggle('sc-reduced', st.reduced);
  if (st.reduced) renderStatic(); else render(0);
})();
