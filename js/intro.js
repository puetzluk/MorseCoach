/* Morse Coach – Intro mit der Meer-Animation (startszene/index.html).
   Die Animation läuft in einem Vollbild-iframe über der App. Ist der Titel „Morse Coach“ erreicht,
   meldet sie sich (postMessage 'morse-intro-ende'); dann blendet das Intro aus und die Lernseite erscheint.
   „Überspringen“ beendet das Intro sofort, „Intro noch einmal ansehen“ startet es neu. */
(function () {
  'use strict';
  const intro = document.getElementById('intro');
  const frame = document.getElementById('introFrame');
  const skip = document.getElementById('introSkip');
  const again = document.getElementById('introAgain');
  if (!intro || !frame) return;
  const SRC = 'startszene/index.html?eingebettet';
  let laeuft = true;

  function beenden(sofort) {
    if (!laeuft) return;
    laeuft = false;
    document.body.classList.remove('intro-an');
    document.body.classList.add('intro-ende');
    if (window.MorseApp) window.MorseApp.showTab('start');
    window.scrollTo(0, 0);
    intro.classList.add('aus');
    setTimeout(() => {
      intro.hidden = true;
      frame.src = 'about:blank';           // Animation anhalten, spart Akku
      document.body.classList.remove('intro-ende');
    }, sofort ? 0 : 950);
  }

  function starten() {
    laeuft = true;
    intro.hidden = false;
    intro.classList.remove('aus');
    document.body.classList.add('intro-an');
    frame.src = SRC;
  }

  window.addEventListener('message', e => {
    if (e.source === frame.contentWindow && e.data && e.data.type === 'morse-intro-ende') beenden(false);
  });
  skip.addEventListener('click', () => beenden(false));
  if (again) again.addEventListener('click', starten);
  // Tastatur: Pfeiltasten/Leertaste sollen gleich die Animation scrollen
  frame.addEventListener('load', () => { if (laeuft) try { frame.contentWindow.focus(); } catch (err) { /* egal */ } });

  // Wer im System „Bewegung reduzieren“ eingestellt hat, sieht direkt die Lernseite
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) beenden(true);
})();
