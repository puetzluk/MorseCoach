/* Morse-Flug: Flappy-Bird-Variante.
   Der Vogel fliegt geradeaus (kein Springen). Jedes Hindernis trägt einen Buchstaben.
   Gibst du seinen Morsecode mit E (kurz) und T (lang) rechtzeitig ein, öffnet sich das
   Hindernis. Sonst fliegt der Vogel dagegen und die Runde ist vorbei. */
const Game = (() => {
  'use strict';

  // Spielfeld (logische Einheiten, das Canvas wird auf die Bildschirmgröße skaliert)
  const W = 640, H = 360, GROUND = 24;
  const MID = (H - GROUND) / 2;      // Flughöhe des Vogels
  const BX = 110, BR = 15;           // Position und Radius des Vogels
  const WALL_W = 84, GAP = 120;      // Breite des Hindernisses, Öffnung nach dem Freischalten
  const PER_LEVEL = 6;               // Hindernisse pro Stufe

  const $ = s => document.querySelector(s);
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const DIGITS = '0123456789'.split('');
  const symbols = code => code.replace(/\./g, '•').replace(/-/g, '–').split('').join(' ');

  // Schwierigkeit: Tempo und Länge der Zeichen steigen mit der Stufe gemeinsam
  const levelOf = score => Math.floor(score / PER_LEVEL);
  const speedOf = l => Math.min(320, 140 + 18 * l);               // Pixel pro Sekunde
  const intervalOf = l => Math.max(1.6, 2.4 - 0.05 * l);          // Sekunden zwischen zwei Hindernissen
  const maxLenOf = l => Math.min(4, l + 1);                       // längste Zeichen (Anzahl Punkte/Striche)
  function poolOf(l) {
    const pool = LETTERS.filter(c => Morse.TABLE[c].length <= maxLenOf(l));
    return l >= 5 ? pool.concat(DIGITS) : pool;                   // Ziffern ab Stufe 6
  }

  let host = null;                  // { getState, save, audioOpts } von app.js
  let canvas, ctx, scale = 1;
  let C = {};                       // Farben aus dem aktuellen Design
  let active = false, raf = 0, lastTs = 0, clock = 0;
  let st = 'idle';                  // idle | running | paused | over
  let walls = [], score = 0, level = 0, pat = '', dist = 0, lastCh = '';
  let bird = { y: MID, vy: 0, rot: 0 };
  let banner = { t: 0, text: '' };
  let patTimer = null, overTimer = null, codeShown = '';

  const S = () => host.getState();

  /* ---------- Farben aus dem Design (dunkel, hell, funk) ---------- */
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    C = {
      sky: g('--display-bg'), wall: g('--accent'), plate: g('--display-bg'), plateText: g('--display-text'),
      bird: g('--accent2'), ground: g('--chip-bg'), text: g('--text'), font: g('--font') || 'sans-serif'
    };
  }

  function resize() {
    const w = canvas.getBoundingClientRect().width;
    if (!w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr * H / W);
    scale = canvas.width / W;
    if (active) draw();            // Größenänderung leert das Canvas, daher sofort neu zeichnen
  }

  /* ---------- Spielablauf ---------- */
  const target = () => walls.find(w => !w.cleared);

  function pickLetter() {
    const l = level;
    const pool = poolOf(l);
    const top = Math.max.apply(null, pool.map(c => Morse.TABLE[c].length));
    const weights = pool.map(c => c === lastCh ? 0 : (Morse.TABLE[c].length === top ? 2.5 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }

  function spawn() {
    const ch = pickLetter();
    lastCh = ch;
    walls.push({ x: W + 20, ch: ch, code: Morse.TABLE[ch], open: 0, cleared: false, mistake: false });
  }

  function reset() {
    walls = [];
    score = 0;
    level = 0;
    pat = '';
    dist = 0;
    lastCh = '';
    bird = { y: MID, vy: 0, rot: 0 };
    banner = { t: 0, text: '' };
    spawn();
  }

  function start() {
    clearTimeout(overTimer);
    reset();
    st = 'running';
    hideOverlay();
    showPattern('');
    renderHud();
  }

  function pause() {
    if (st !== 'running') return;
    st = 'paused';
    showOverlay('Pausiert', 'Weiter mit Leertaste oder Knopf.', 'Weiter');
  }

  function resume() {
    if (st !== 'paused') return;
    st = 'running';
    lastTs = 0;
    hideOverlay();
  }

  function crash(t) {
    st = 'over';
    bird.vy = -240;
    Store.record(S(), t.ch, false);
    const game = S().game;
    const newBest = score > game.best;
    if (newBest) game.best = score;
    host.save();
    renderHud();
    showPattern('');
    const text = 'Geschafft: ' + score + ' Hindernisse. Gescheitert an ' + t.ch + '  (' + symbols(t.code) + ')'
      + (newBest && score > 0 ? '. Neuer Rekord!' : '.');
    overTimer = setTimeout(() => { if (st === 'over') showOverlay('Vorbei', text, 'Nochmal'); }, 700);
  }

  function update(dt) {
    clock += dt;
    if (banner.t > 0) banner.t -= dt;
    if (st === 'running') {
      const v = speedOf(level);
      dist += v * dt;
      walls.forEach(w => {
        w.x -= v * dt;
        if (w.cleared && w.open < 1) w.open = Math.min(1, w.open + dt / 0.18);
      });
      const last = walls[walls.length - 1];
      if (!last || last.x <= W - v * intervalOf(level)) spawn();
      walls = walls.filter(w => w.x + WALL_W > -20);
      const t = target();
      if (t && t.x - (BX + BR) <= 0) crash(t);
    } else if (st === 'over') {
      bird.vy += 1100 * dt;
      bird.y += bird.vy * dt;
      bird.rot += 5 * dt;
    } else if (st === 'idle') {
      dist += 50 * dt;
    }
  }

  /* ---------- Eingabe ---------- */
  function press(sym) {
    if (st !== 'running') return;
    const t = target();
    if (!t) return;
    Morse.beep(sym === '.' ? 1 : 3, host.audioOpts());
    const next = pat + sym;
    if (t.code.indexOf(next) === 0) {
      if (next === t.code) {
        // Zeichen vollständig: Hindernis öffnet sich
        t.cleared = true;
        pat = '';
        Store.record(S(), t.ch, !t.mistake);
        score++;
        const nl = levelOf(score);
        if (nl !== level) { level = nl; banner = { t: 1.6, text: 'Stufe ' + (level + 1) }; }
        host.save();
        renderHud();
        showPattern(next, 'flash-ok');
      } else {
        pat = next;
        showPattern(pat);
      }
    } else {
      // Falsche Eingabe: wird gelöscht, das Zeichen beginnt von vorn
      t.mistake = true;
      pat = '';
      showPattern(next, 'flash-bad');
    }
  }

  function onKey(e) {
    if (!active || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches('textarea, select, input[type="text"]')) return;
    const k = e.key.toLowerCase();
    if (['e', 't', ' ', 'enter', 'escape'].indexOf(k) < 0) return;
    if (e.target.matches('button, input')) e.target.blur();
    e.preventDefault();
    if (k === 'e') press('.');
    else if (k === 't') press('-');
    else if (k === 'escape') pause();
    else if (st === 'idle' || st === 'over') start();
    else if (st === 'paused') resume();
  }

  /* ---------- Anzeige außerhalb des Canvas ---------- */
  function showPattern(text, cls) {
    const el = $('#gamePattern');
    clearTimeout(patTimer);
    el.classList.remove('flash-ok', 'flash-bad');
    el.textContent = text ? symbols(text) : ' ';
    if (cls) {
      el.classList.add(cls);
      patTimer = setTimeout(() => {
        el.classList.remove(cls);
        el.textContent = pat ? symbols(pat) : ' ';
      }, 350);
    }
  }

  function renderHud() {
    $('#gScore').textContent = score;
    $('#gLevel').textContent = level + 1;
    $('#gBest').textContent = S().game.best;
  }

  function showOverlay(title, text, label) {
    $('#gameOverTitle').textContent = title;
    $('#gameOverText').textContent = text;
    $('#gameStart').textContent = label;
    $('#gameOverlay').classList.add('show');
  }
  function hideOverlay() { $('#gameOverlay').classList.remove('show'); }

  function showIdle() {
    showOverlay('Morse-Flug',
      'Jedes Hindernis trägt einen Buchstaben. Gib seinen Morsecode ein, bevor du dagegen fliegst: E = kurz, T = lang (Tasten oder Knöpfe). Eine falsche Eingabe wird gelöscht. Start mit Leertaste.',
      'Start');
  }

  function renderCode() {
    const t = target();
    const txt = (S().settings.hint && st === 'running' && t) ? symbols(t.code) : '';
    if (txt !== codeShown) { codeShown = txt; $('#gameCode').textContent = txt; }
  }

  /* ---------- Zeichnen ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawClouds() {
    const defs = [[80, 60, 40], [300, 100, 30], [520, 55, 46], [760, 90, 34]];
    ctx.fillStyle = 'rgba(127,127,127,.14)';
    defs.forEach(d => {
      const x = (((d[0] - dist * 0.2) % 840) + 840) % 840 - 100;
      ctx.beginPath();
      ctx.ellipse(x, d[1], d[2] * 1.6, d[2] * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + d[2] * 0.5, d[1] - d[2] * 0.3, d[2] * 0.8, d[2] * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawWall(w, isTarget) {
    const ease = 1 - Math.pow(1 - w.open, 3);
    const g = GAP / 2 * ease;
    const topH = MID - g, botY = MID + g, botH = H - GROUND - botY;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.fillStyle = C.wall;
    [[0, topH], [botY, botH]].forEach(p => {
      ctx.fillRect(w.x, p[0], WALL_W, p[1]);
      ctx.strokeRect(w.x, p[0], WALL_W, p[1]);
    });
    // Lippen an den Kanten der Öffnung
    ctx.fillRect(w.x - 5, topH - 16, WALL_W + 10, 16);
    ctx.strokeRect(w.x - 5, topH - 16, WALL_W + 10, 16);
    ctx.fillRect(w.x - 5, botY, WALL_W + 10, 16);
    ctx.strokeRect(w.x - 5, botY, WALL_W + 10, 16);
    // Schild mit Buchstabe, verschwindet beim Öffnen
    if (w.open < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - w.open;
      const cx = w.x + WALL_W / 2;
      roundRect(cx - 32, MID - 32, 64, 64, 10);
      ctx.fillStyle = C.plate;
      ctx.fill();
      ctx.lineWidth = isTarget ? 5 : 2;
      ctx.strokeStyle = isTarget ? C.bird : 'rgba(0,0,0,.4)';
      ctx.stroke();
      ctx.fillStyle = C.plateText;
      ctx.font = 'bold 44px ' + C.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.ch, cx, MID + 3);
      ctx.restore();
    }
  }

  function drawGround() {
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, H - GROUND, W, GROUND);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = -(dist % 32); x < W + 32; x += 32) {
      ctx.moveTo(x, H - GROUND);
      ctx.lineTo(x - 12, H);
    }
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - GROUND);
    ctx.lineTo(W, H - GROUND);
    ctx.stroke();
  }

  function drawBird() {
    const over = st === 'over';
    const bob = over ? 0 : Math.sin(clock * 4) * 3;
    ctx.save();
    ctx.translate(BX, bird.y + bob);
    ctx.rotate(bird.rot + (over ? 0 : Math.sin(clock * 4) * 0.06));
    ctx.fillStyle = C.bird;
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, BR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Flügel
    ctx.save();
    ctx.translate(-4, 3);
    ctx.rotate(Math.sin(clock * (st === 'running' ? 16 : 6)) * 0.6);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Auge
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(7.5, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Schnabel
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.moveTo(BR - 2, -2);
    ctx.lineTo(BR + 10, 3);
    ctx.lineTo(BR - 2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, W, H);
    drawClouds();
    const t = target();
    walls.forEach(w => drawWall(w, w === t && st === 'running'));
    drawGround();
    drawBird();
    if (banner.t > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, banner.t);
      ctx.fillStyle = C.text;
      ctx.font = 'bold 28px ' + C.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(banner.text, W / 2, 36);
      ctx.restore();
    }
  }

  function frame(ts) {
    if (!active) return;
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    update(dt);
    renderCode();
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Anbindung an die Seite ---------- */
  function show() {
    active = true;
    readColors();
    resize();
    renderHud();
    codeShown = null;
    if (st === 'idle') showIdle();
    lastTs = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function hide() {
    if (!active) return;
    pause();
    active = false;
    cancelAnimationFrame(raf);
  }

  function bindKey(sel, sym) {
    const b = $(sel);
    b.addEventListener('pointerdown', e => { e.preventDefault(); press(sym); });
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('click', e => { if (e.detail === 0) press(sym); });
  }

  // opts: { getState, save, audioOpts }
  function init(opts) {
    host = opts;
    if (!S().game) S().game = { best: 0 };
    canvas = $('#gameCanvas');
    ctx = canvas.getContext('2d');
    readColors();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('blur', pause);
    bindKey('#gameKurz', '.');
    bindKey('#gameLang', '-');
    $('#gameStart').addEventListener('click', () => {
      if (st === 'paused') resume(); else start();
    });
  }

  return { init, show, hide };
})();
