/* Tasten-Eingabe für Senden und Games: aus einem Druck wird ein Punkt oder ein Strich.

   Drei Eingabearten (Einstellungen je Bereich):
   - 'maus':      im Tastenfeld drücken (linke Maustaste, wahlweise auch die rechte; am Handy der Finger).
                  Kurz drücken = Punkt, länger halten = Strich.
   - 'leertaste': Leertaste kurz = Punkt, länger = Strich.
   - 'et':        Taste E = Punkt, Taste T = Strich (ohne Timing), dazu die Knöpfe Kurz/Lang.

   Grenze zwischen Punkt und Strich: Ein Punkt dauert 1 Einheit, ein Strich 3 Einheiten.
   Eine Einheit = 1200 ms / Tempo (WPM). Die Grenze liegt bei 2 Einheiten, bei 20 WPM also 120 ms.

   Aufruf: const k = Keyer.create({ field, timingBox, settings, active, audioOpts, onSymbol });
   - field:     Element, in dem mit der Maus/dem Finger gedrückt wird
   - timingBox: Element für die Anzeige der Druckdauer (oder null)
   - settings(): Einstellungen des Bereichs ({ input, right, timing })
   - active():  true, wenn der Bereich gerade Eingaben annimmt
   - audioOpts(): Tonhöhe, Lautstärke, Tempo (cwpm)
   - onSymbol(sym, ms): sym = '.' oder '-', ms = Druckdauer (bei E/T null) */
const Keyer = (() => {
  'use strict';

  const unitMs = cwpm => 1200 / cwpm;
  const classify = (ms, cwpm) => (ms < 2 * unitMs(cwpm) ? '.' : '-');

  function create(o) {
    let down = null;            // { t, via: 'maus' | 'leertaste', id }
    const presses = [];         // für die Anzeige: { sym, ms }

    const mode = () => o.settings().input;
    const cwpm = () => o.audioOpts().cwpm;

    function start(via, id) {
      if (down || !o.active()) return false;
      down = { t: performance.now(), via: via, id: id };
      Morse.key(true, o.audioOpts());
      o.field.classList.add('down');
      return true;
    }

    function end(cancel) {
      if (!down) return;
      const ms = Math.round(performance.now() - down.t);
      down = null;
      Morse.key(false);
      o.field.classList.remove('down');
      if (cancel || !o.active()) return;
      const sym = classify(ms, cwpm());
      presses.push({ sym: sym, ms: ms });
      if (presses.length > 8) presses.shift();
      renderTiming();
      o.onSymbol(sym, ms);
    }

    // E/T und die Knöpfe Kurz/Lang: fester Ton ohne Timing
    function tap(sym) {
      if (!o.active()) return;
      Morse.beep(sym === '.' ? 1 : 3, o.audioOpts());
      o.onSymbol(sym, null);
    }

    /* ---------- Maus und Finger im Tastenfeld ---------- */
    o.field.addEventListener('pointerdown', e => {
      if (mode() !== 'maus') return;
      const mouse = e.pointerType === 'mouse';
      if (mouse && !(e.button === 0 || (e.button === 2 && o.settings().right))) {
        if (e.button === 2) hint('Linke Maustaste drücken (die rechte Taste kannst du in den Einstellungen zulassen).');
        return;
      }
      e.preventDefault();
      if (start('maus', e.pointerId)) {
        try { o.field.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      }
    });
    const release = e => { if (down && down.via === 'maus' && down.id === e.pointerId) end(e.type === 'pointercancel'); };
    o.field.addEventListener('pointerup', release);
    o.field.addEventListener('pointercancel', release);
    o.field.addEventListener('lostpointercapture', release);
    o.field.addEventListener('contextmenu', e => e.preventDefault());

    /* ---------- Tastatur ---------- */
    const typing = e => e.target.matches && e.target.matches('input, textarea, select');
    document.addEventListener('keydown', e => {
      if (!o.active() || e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
      const m = mode();
      if (m === 'leertaste' && e.code === 'Space') {
        e.preventDefault();
        if (e.target.blur && e.target !== document.body) e.target.blur();
        if (!e.repeat) start('leertaste');
      } else if (m === 'et' && !e.repeat && (e.key === 'e' || e.key === 'E' || e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        if (e.target.matches && e.target.matches('button')) e.target.blur();
        tap(e.key.toLowerCase() === 'e' ? '.' : '-');
      }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'Space' && down && down.via === 'leertaste') { e.preventDefault(); end(false); }
    });
    // Fenster verlässt den Fokus, während gedrückt wird: Druck verwerfen
    window.addEventListener('blur', () => end(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) end(true); });

    /* ---------- Anzeige der Druckdauer ---------- */
    let hintTimer = 0;
    function hint(text) {
      if (!o.timingBox) return;
      const h = o.timingBox.querySelector('.ky-hint') || o.timingBox.appendChild(document.createElement('p'));
      h.className = 'ky-hint';
      h.textContent = text;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => h.remove(), 2500);
    }

    function renderTiming() {
      const box = o.timingBox;
      if (!box) return;
      const show = o.settings().timing && mode() !== 'et';
      box.hidden = !show;
      if (!show) return;
      const unit = unitMs(cwpm());
      const max = 5 * unit;                  // Balken reichen bis 5 Einheiten
      const pct = ms => Math.min(100, ms / max * 100);
      box.textContent = '';
      const head = document.createElement('p');
      head.className = 'ky-head muted';
      head.textContent = 'Druckdauer · Grenze Punkt/Strich ' + Math.round(2 * unit) + ' ms (' + cwpm() + ' WPM)';
      box.appendChild(head);
      if (!presses.length) {
        const p = document.createElement('p');
        p.className = 'ky-empty muted';
        p.textContent = 'Punkt ca. ' + Math.round(unit) + ' ms, Strich ca. ' + Math.round(3 * unit) + ' ms';
        box.appendChild(p);
      }
      presses.forEach(pr => {
        const row = document.createElement('div');
        row.className = 'ky-row';
        const lbl = document.createElement('span');
        lbl.className = 'ky-sym';
        lbl.textContent = pr.sym === '.' ? '•' : '–';
        const bar = document.createElement('div');
        bar.className = 'ky-bar';
        const fill = document.createElement('i');
        fill.className = pr.sym === '.' ? 'dot' : 'dash';
        fill.style.width = pct(pr.ms) + '%';
        const mark = document.createElement('b');
        mark.style.left = pct(2 * unit) + '%';
        bar.appendChild(fill);
        bar.appendChild(mark);
        const ms = document.createElement('span');
        ms.className = 'ky-ms';
        ms.textContent = pr.ms + ' ms';
        row.appendChild(lbl);
        row.appendChild(bar);
        row.appendChild(ms);
        box.appendChild(row);
      });
    }

    // Neue Aufgabe: Anzeige leeren
    function clear() {
      presses.length = 0;
      renderTiming();
    }

    // Feld und Hinweise passend zur Eingabeart zeigen
    function refresh() {
      const m = mode();
      o.field.hidden = m !== 'maus';
      renderTiming();
    }

    return { tap, clear, refresh, cancel: () => end(true), mode };
  }

  const touchOnly = () => window.matchMedia && matchMedia('(hover: none)').matches;
  const num = n => Number(n).toLocaleString('de-DE');

  // Kurzer Text: wie wird eingegeben und wann geprüft (a = Einstellungen des Bereichs)
  function describe(a) {
    const t = touchOnly();
    let inp;
    if (a.input === 'maus') inp = t ? 'Feld antippen: kurz = Punkt, länger halten = Strich.'
      : 'Im Feld drücken (' + (a.right ? 'linke oder rechte' : 'linke') + ' Maustaste): kurz = Punkt, länger halten = Strich.';
    else if (a.input === 'leertaste') inp = 'Leertaste: kurz = Punkt, länger halten = Strich.';
    else inp = 'Taste E = kurz, T = lang' + (t ? ' oder die Knöpfe.' : '.');
    const conf = a.confirm === 'sofort' ? 'Geprüft wird sofort.'
      : a.confirm === 'pause' ? 'Geprüft wird nach ' + num(a.delay) + ' s Pause.' : 'Mit Enter bestätigen.';
    return inp + ' ' + conf;
  }

  // Ganz kurz für die Zeile "Eingabe: …"
  function label(a, withInput) {
    const conf = a.confirm === 'sofort' ? 'sofort prüfen' : a.confirm === 'pause' ? 'nach ' + num(a.delay) + ' s Pause' : 'mit Enter';
    if (!withInput) return conf;
    const inp = a.input === 'maus' ? 'Maus' : a.input === 'leertaste' ? 'Leertaste' : 'E und T';
    return inp + ' · ' + conf;
  }

  return { create, classify, unitMs, describe, label };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Keyer;
