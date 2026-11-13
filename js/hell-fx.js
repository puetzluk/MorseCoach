/* Morse Coach – Hintergrund-Effekte im hellen Design (Lernbereiche):
   dezentes Glitzern und vereinzelt aufsteigende Blasen, wie im Kartenbereich der Startseite.
   Liegt als Canvas hinter allen Inhalten (z-index -1) und läuft nur, wenn
   – das helle Design aktiv ist,
   – ein Lernbereich offen ist (nicht die Startseite mit der Meer-Animation),
   – das Fenster sichtbar ist und „Bewegung reduzieren“ nicht eingestellt ist. */
(function () {
  'use strict';
  const cv = document.createElement('canvas');
  cv.id = 'hellFx';
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, sterne = [], blasen = [], naechste = 2, last = null;

  function groesse() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(60, Math.max(20, Math.round(W * H * 5e-5)));
    sterne = Array.from({ length: n }, () => {
      const a = Math.random() * 6.283, v = 3 * (.25 + .75 * Math.random());
      return { x: Math.random() * W, y: Math.random() * H, r: .7 + 1.2 * Math.random(),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, o: .35 + .45 * Math.random(),
        bs: .6 + 1.6 * Math.random(), bo: Math.random() * 6.3 };
    });
  }
  addEventListener('resize', groesse);
  groesse();

  const aktiv = () => !reduce && !document.hidden &&
    document.documentElement.dataset.theme === 'hell' && !document.body.classList.contains('start-an');

  function schritt(now) {
    const dt = last === null ? 0 : Math.min(.1, (now - last) / 1000); last = now;
    const an = aktiv();
    cv.style.display = an ? 'block' : 'none';
    if (an) {
      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      // Glitzern: kleine hellblaue Lichtpunkte, langsam treibend, sanft blinkend
      for (const s of sterne) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < -3) s.x = W + 3; if (s.x > W + 3) s.x = -3;
        if (s.y < -3) s.y = H + 3; if (s.y > H + 3) s.y = -3;
        const o = s.o * (.55 + .45 * Math.sin(t * s.bs + s.bo));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.shadowBlur = 6; ctx.shadowColor = `rgba(56,160,220,${o})`;
        ctx.fillStyle = `rgba(90,175,225,${o})`; ctx.fill();
      }
      ctx.shadowBlur = 0;
      // Blasen: höchstens 5 gleichzeitig, steigen langsam und wackelnd auf
      naechste -= dt;
      if (naechste <= 0 && blasen.length < 5) {
        const r = 3 + 5.5 * Math.random();
        blasen.push({ x: W * (.04 + .92 * Math.random()), y: H + 10, r, v: 18 + 22 * Math.random(),
          w: 2 + 4 * Math.random(), f: 1 + Math.random(), p: Math.random() * 6 });
        naechste = 1.5 + 2.5 * Math.random();
      }
      blasen = blasen.filter(b => b.y > -15);
      for (const b of blasen) {
        b.y -= b.v * dt;
        const x = b.x + Math.sin(t * b.f + b.p) * b.w, a = .6 * Math.min(1, b.y / (H * .2));
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.2832);
        ctx.fillStyle = `rgba(120,190,235,${a * .2})`; ctx.fill();
        ctx.lineWidth = 1.3; ctx.strokeStyle = `rgba(70,160,220,${a})`; ctx.stroke();
        ctx.beginPath(); ctx.arc(x - b.r * .35, b.y - b.r * .35, Math.max(.6, b.r * .22), 0, 6.2832);
        ctx.fillStyle = `rgba(255,255,255,${a * 1.4})`; ctx.fill();
      }
    }
    requestAnimationFrame(schritt);
  }
  requestAnimationFrame(schritt);
})();
