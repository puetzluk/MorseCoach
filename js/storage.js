/* Speicherung im Browser (localStorage).
   Alle Zugriffe laufen über dieses Objekt, damit später eine
   Cloud-Speicherung (Login) leicht dazukommen kann. */
const Store = (() => {
  const KEY = 'morse.v1';

  const baseSel = () => ({ method: 'koch', level: 2, custom: ['E', 'T', 'A', 'N'] });

  const defaults = () => ({
    version: 3,
    settings: {
      theme: 'dunkel',      // 'hell' | 'dunkel' | 'funk'
      cwpm: 20, wpm: 12, freq: 600, vol: 50,
      hint: false,          // Code (Punkte/Striche) beim Üben anzeigen
      autoConfirm: true,    // Senden: automatisch bestätigen
      confirmDelay: 1.0     // Sekunden Pause bis zur Bestätigung
    },
    // Eigene Zeichenauswahl je Bereich
    sel: { lernen: baseSel(), hoeren: baseSel(), senden: baseSel() },
    levelRecent: [],        // letzte Antworten auf der aktuellen Koch-Stufe (Lernen)
    hoerLevel: 'mittel',
    hoerenWpm: 10,
    game: { best: 0 },      // Morse-Flug: Rekord (Anzahl Hindernisse)
    chars: {},   // { K: { n, ok, last: [1,0,...] } }
    days: {},    // { '2026-11-07': { n, ok } }
    hours: {}    // { '2026-11-07T19': { n, ok } }  (nur die letzten ~31 Tage)
  });

  const pad = n => String(n).padStart(2, '0');

  function fmt(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const d = JSON.parse(raw);
      const def = defaults();
      const out = Object.assign(def, d, { settings: Object.assign(def.settings, d.settings) });
      // Ältere Version: eine gemeinsame Auswahl -> für jeden Bereich übernehmen
      if (!d.sel) {
        const base = { method: d.method || 'koch', level: d.level || 2, custom: (d.custom || ['E', 'T', 'A', 'N']).slice() };
        out.sel = {
          lernen: Object.assign({}, base, { custom: base.custom.slice() }),
          hoeren: Object.assign({}, base, { custom: base.custom.slice() }),
          senden: Object.assign({}, base, { custom: base.custom.slice() })
        };
      }
      ['lernen', 'hoeren', 'senden'].forEach(a => { out.sel[a] = Object.assign(baseSel(), out.sel[a]); });
      out.hours = out.hours || {};
      return out;
    } catch (e) {
      return defaults();
    }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* Speicher nicht verfügbar */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* egal */ }
    return defaults();
  }

  // Kleine Merker für die Startseite (Intro gesehen, Ton an/aus), getrennt vom Lernfortschritt
  const FLAG_KEY = 'morse.scene';
  function flag(name, value) {
    let f = {};
    try { f = JSON.parse(localStorage.getItem(FLAG_KEY)) || {}; } catch (e) { f = {}; }
    if (value === undefined) return f[name];
    f[name] = value;
    try { localStorage.setItem(FLAG_KEY, JSON.stringify(f)); } catch (e) { /* Speicher nicht verfügbar */ }
    return value;
  }

  function record(s, ch, ok) {
    const st = s.chars[ch] || (s.chars[ch] = { n: 0, ok: 0, last: [] });
    st.n++;
    if (ok) st.ok++;
    st.last.push(ok ? 1 : 0);
    if (st.last.length > 20) st.last.shift();

    const now = new Date();
    const key = fmt(now);
    const day = s.days[key] || (s.days[key] = { n: 0, ok: 0 });
    day.n++;
    if (ok) day.ok++;

    s.hours = s.hours || {};
    const hk = key + 'T' + pad(now.getHours());
    const h = s.hours[hk] || (s.hours[hk] = { n: 0, ok: 0 });
    h.n++;
    if (ok) h.ok++;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 31);
    const cut = fmt(cutoff);
    Object.keys(s.hours).forEach(k => { if (k.slice(0, 10) < cut) delete s.hours[k]; });
  }

  function streak(s) {
    let n = 0;
    const d = new Date();
    if (!s.days[fmt(d)]) d.setDate(d.getDate() - 1);
    while (s.days[fmt(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  return { load, save, reset, record, streak, fmt, flag };
})();
