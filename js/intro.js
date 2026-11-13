/* Morse Coach – Startseite.
   Die Startseite ist die Meer-Animation mit Titel und Karten (startszene/index.html) in einem Vollbild-iframe.
   Beide Seiten sprechen per postMessage miteinander:
     von der Szene:  morse-open {tab}        → Bereich öffnen (Leiste erscheint)
                     morse-theme-set {theme} → Design wechseln und speichern
     an die Szene:   morse-theme {theme}     → Szene färbt Kartenbereich passend
                     morse-zu-karten         → direkt zu den Karten springen (beim Zurückkehren)
   Jeder Besuch beginnt oben im Meer. Mit #lernen, #hoeren … in der Adresse öffnet sich direkt der Bereich. */
(function () {
  'use strict';
  const frame = document.getElementById('introFrame');
  if (!frame || !window.MorseApp) return;
  const app = window.MorseApp;
  const TABS = ['lernen', 'hoeren', 'senden', 'spiel', 'uebersetzer', 'statistik', 'einstellungen'];
  let geladen = false, warSchonDa = false;

  const senden = msg => { if (geladen && frame.contentWindow) frame.contentWindow.postMessage(msg, '*'); };

  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'morse-open' && TABS.indexOf(e.data.tab) >= 0) app.showTab(e.data.tab);
    if (e.data.type === 'morse-theme-set') app.setTheme(e.data.theme);
  });

  frame.addEventListener('load', () => {
    geladen = true;
    senden({ type: 'morse-theme', theme: app.theme() });
    // Wer im System „Bewegung reduzieren“ eingestellt hat, landet direkt bei den Karten
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) senden({ type: 'morse-zu-karten' });
    if (document.body.classList.contains('start-an')) try { frame.contentWindow.focus(); } catch (err) { /* egal */ }
  });

  // Design in der App geändert → Szene mitfärben
  document.addEventListener('morse:theme', e => senden({ type: 'morse-theme', theme: e.detail }));

  // Zurück zur Startseite → bei den Karten landen (die Animation liegt darüber, per Hochscrollen erreichbar)
  document.addEventListener('morse:tab', e => {
    if (e.detail === 'start') {
      if (warSchonDa) senden({ type: 'morse-zu-karten' });
      try { frame.contentWindow.focus(); } catch (err) { /* egal */ }
    } else {
      warSchonDa = true;
      // Tastatur zurück an die App geben (sonst landen E/T usw. noch in der unsichtbaren Startszene)
      if (document.activeElement === frame) { frame.blur(); window.focus(); }
    }
  });

  // Direktaufruf eines Bereichs über die Adresse, z. B. index.html#statistik
  const ziel = location.hash.replace('#', '');
  if (TABS.indexOf(ziel) >= 0) app.showTab(ziel);
})();
