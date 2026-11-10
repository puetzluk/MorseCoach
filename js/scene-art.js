/* Morse Coach – Zeichnungen der Startseiten-Szene.
   Alles ist Inline-SVG als Text, damit die Seite ohne Bilddateien und offline funktioniert.
   Farben kommen nicht aus den Zeichnungen, sondern aus CSS-Klassen (css/scene.css).
   So färbt ein Designwechsel die ganze Szene sofort um. */
const SceneArt = (() => {
  'use strict';

  const f1 = n => Math.round(n * 10) / 10;
  const NOA = 'aria-hidden="true" focusable="false"';

  // Kleiner Zufallsgenerator mit festem Startwert: die Stadt sieht bei jedem Laden gleich aus
  function rng(seed) {
    let s = seed;
    return () => (s = s * 16807 % 2147483647) / 2147483647;
  }

  /* ---------- Gemeinsame Muster (Halbtonraster, Ziegel, Lautsprechergitter, Dunst) ---------- */
  const defs = '<svg class="sc-defs" width="0" height="0" ' + NOA + '><defs>' +
    '<pattern id="sc-ht" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" class="sc-htdot"/></pattern>' +
    '<pattern id="sc-ht2" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="2.3" class="sc-htdot"/></pattern>' +
    '<pattern id="sc-brick" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" class="f-brick"/>' +
    '<path d="M0 .5H16M0 4.5H16M4 .5V4.5M12 4.5V8" class="sc-mortar"/></pattern>' +
    '<pattern id="sc-grille" width="9" height="10" patternUnits="userSpaceOnUse"><rect width="9" height="10" class="f-grille"/>' +
    '<line x1="4.5" y1="0" x2="4.5" y2="10" class="sc-grille-l"/></pattern>' +
    '<linearGradient id="sc-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc-fogs0"/>' +
    '<stop offset=".45" class="sc-fogs1"/><stop offset="1" class="sc-fogs2"/></linearGradient>' +
    '</defs></svg>';

  // Alle Außen-Ebenen nutzen denselben Ausschnitt (1600 × 900), damit die Tür auf jeder Ebene
  // an derselben Bildschirmstelle liegt. "slice" füllt die Bühne, "xMidYMax" hält den Boden unten.
  const ext = body => '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" ' + NOA + '>' + body + '</svg>';

  /* ---------- Himmel ---------- */
  function cloud(x, y, k) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + k + ')" d="M0 40C-6 22 14 10 30 18C36 0 66-2 76 16C92 6 116 16 112 34C130 36 132 58 112 60H6C-12 60-14 42 0 40Z" class="o f-cloud"/>';
  }
  function sky() {
    const r = rng(7);
    let stars = '';
    for (let i = 0; i < 48; i++) {
      const x = f1(r() * 1600), y = f1(r() * 540), s = f1(1.2 + r() * 2.4);
      stars += i % 6 === 0
        ? '<path d="M' + x + ' ' + f1(y - s * 2.6) + 'L' + f1(x + s * .6) + ' ' + f1(y - s * .6) + 'L' + f1(x + s * 2.6) + ' ' + y + 'L' + f1(x + s * .6) + ' ' + f1(y + s * .6) + 'L' + x + ' ' + f1(y + s * 2.6) + 'L' + f1(x - s * .6) + ' ' + f1(y + s * .6) + 'L' + f1(x - s * 2.6) + ' ' + y + 'L' + f1(x - s * .6) + ' ' + f1(y - s * .6) + 'Z" class="f-star sc-twinkle"/>'
        : '<circle cx="' + x + '" cy="' + y + '" r="' + f1(s * .6) + '" class="f-star"/>';
    }
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      rays += 'M' + f1(1265 + Math.cos(a) * 74) + ' ' + f1(165 + Math.sin(a) * 74) + 'L' + f1(1265 + Math.cos(a) * 98) + ' ' + f1(165 + Math.sin(a) * 98);
    }
    return ext(
      '<rect width="1600" height="900" class="f-sky1"/>' +
      '<rect y="330" width="1600" height="570" class="f-sky2"/>' +
      '<rect y="520" width="1600" height="380" class="f-sky3"/>' +
      '<rect y="470" width="1600" height="170" class="sc-ht2"/>' +
      '<g class="t-night">' + stars +
      '<circle cx="1265" cy="165" r="54" class="o f-moon"/><circle cx="1248" cy="150" r="11" class="f-moon-d"/>' +
      '<circle cx="1284" cy="186" r="7" class="f-moon-d"/><circle cx="1290" cy="148" r="5" class="f-moon-d"/></g>' +
      '<g class="t-sun"><path d="' + rays + '" class="sc-ray t-day"/><circle cx="1265" cy="165" r="58" class="o f-sun"/></g>' +
      '<g class="t-cloud">' + cloud(150, 110, 1.4) + cloud(560, 210, 1) + cloud(950, 80, 1.2) + cloud(1390, 300, .9) + '</g>'
    );
  }

  /* ---------- Zeppelin (klein, weit hinten) ---------- */
  const zeppelin = '<svg viewBox="0 0 220 84" ' + NOA + '>' +
    '<path d="M30 30L4 8L14 38ZM30 46L4 70L14 40Z" class="o f-zep-d"/>' +
    '<path d="M18 38C18 18 70 8 120 8C175 8 205 24 210 38C205 52 175 66 120 66C70 66 18 58 18 38Z" class="o f-zep"/>' +
    '<path d="M24 46C70 62 170 66 206 44C200 56 170 66 120 66C70 66 30 58 24 46Z" class="sc-ht"/>' +
    '<path d="M70 12C64 30 64 46 70 63M120 8C114 30 114 46 120 66M165 12C160 30 160 46 165 62" class="sc-zline"/>' +
    '<path d="M100 66H150L146 78H106Z" class="o f-zep-d"/>' +
    '<g class="t-night"><circle cx="112" cy="72" r="2.4" class="f-zlight"/><circle cx="124" cy="72" r="2.4" class="f-zlight"/>' +
    '<circle cx="136" cy="72" r="2.4" class="f-zlight"/><circle cx="210" cy="38" r="4" class="f-red sc-blink"/>' +
    '<circle cx="8" cy="10" r="3" class="f-zlight sc-blink sc-blink2"/></g></svg>';

  /* ---------- Stadt in drei Ebenen ---------- */
  function city(seed, base, minH, maxH, minW, maxW, cls, winP) {
    const r = rng(seed);
    let x = -30, d = 'M-30 ' + (base + 220), wins = '';
    while (x < 1630) {
      const w = minW + r() * (maxW - minW), h = minH + r() * (maxH - minH), top = base - h, t = r();
      d += 'L' + f1(x) + ' ' + f1(top);
      if (t < .12) {
        const c = x + w / 2;
        d += 'L' + f1(c - 5) + ' ' + f1(top) + 'L' + f1(c) + ' ' + f1(top - 36) + 'L' + f1(c + 5) + ' ' + f1(top);
      } else if (t < .26) {
        const a = x + w * .65;
        d += 'L' + f1(a) + ' ' + f1(top) + 'L' + f1(a) + ' ' + f1(top - 24) + 'L' + f1(a + 3) + ' ' + f1(top - 24) + 'L' + f1(a + 3) + ' ' + f1(top);
      } else if (t < .4) {
        d += 'L' + f1(x + w * .18) + ' ' + f1(top) + 'L' + f1(x + w * .18) + ' ' + f1(top - 12) + 'L' + f1(x + w * .82) + ' ' + f1(top - 12) + 'L' + f1(x + w * .82) + ' ' + f1(top);
      }
      d += 'L' + f1(x + w) + ' ' + f1(top);
      if (winP) {
        const cols = Math.floor((w - 10) / 10), rows = Math.floor((h - 14) / 14);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            if (r() < winP) wins += '<rect x="' + f1(x + 7 + j * 10) + '" y="' + f1(top + 9 + i * 14) + '" width="4" height="6" class="f-citywin"/>';
          }
        }
      }
      x += w;
    }
    d += 'L1630 ' + (base + 220) + 'Z';
    return ext('<path d="' + d + '" class="' + cls + '"/>' + wins);
  }
  const fogBand = (y, h) => ext('<rect y="' + y + '" width="1600" height="' + h + '" fill="url(#sc-fog)"/>');

  /* ---------- Hügel im Hintergrund ---------- */
  function hills() {
    let trees = '';
    [[150, 762], [214, 768], [470, 770], [1060, 774], [1330, 760], [1400, 764]].forEach(t => {
      trees += '<path d="M' + t[0] + ' ' + t[1] + 'V' + (t[1] - 14) + '" class="o"/><circle cx="' + t[0] + '" cy="' + (t[1] - 22) + '" r="10" class="o f-hill"/>';
    });
    return ext(
      '<path d="M-40 900V790Q120 748 280 772T600 766T920 780T1240 762T1640 784V900Z" class="o f-hill2"/>' +
      '<path d="M-40 900V790Q120 748 280 772T600 766T920 780T1240 762T1640 784V900Z" class="sc-ht"/>' + trees
    );
  }

  /* ---------- Funkhaus auf dem Hügel ---------- */
  // Haupthügel mit Weg (auch Teil der Nahansicht)
  const mainHill =
    '<path d="M-60 900V845C200 830 470 702 800 700C1130 702 1400 830 1660 845V900Z" class="o f-hill"/>' +
    '<path d="M800 700C1130 702 1400 830 1660 845V900H1100C1000 820 900 730 800 700Z" class="sc-ht"/>' +
    '<path d="M792 712C770 780 860 820 820 900H904C930 820 850 770 810 712Z" class="o f-path"/>' +
    '<path d="M620 760l6-10 4 10M650 742l5-9 3 9M1010 748l5-10 4 10M1060 770l6-11 4 11M560 790l5-9 4 9" class="sc-grass"/>';

  // closeup = true: Türflügel bewegbar, Öffnung bleibt frei (dahinter liegt der Funkraum)
  function house(closeup) {
    let s = '';
    s += '<path d="M910 552L940 566V706L910 700Z" class="o f-brick-d"/><path d="M910 552L940 566V706L910 700Z" class="sc-ht"/>';
    s += '<rect x="862" y="506" width="22" height="34" class="o f-brick-d"/><rect x="858" y="500" width="30" height="8" class="o f-trim"/>';
    s += '<path d="M916 536L946 550V562L916 550Z" class="o f-trim-d"/>';
    s += '<rect x="684" y="536" width="232" height="14" class="o f-trim"/>';
    s += '<path d="M690 550H910V700H690ZM783 644V700H817V644Z" fill="url(#sc-brick)" fill-rule="evenodd" class="o"/>';
    s += '<rect x="688" y="550" width="224" height="10" class="o f-brick-d"/>';
    s += '<rect x="690" y="560" width="12" height="140" class="o f-brick-d"/><rect x="898" y="560" width="12" height="140" class="o f-brick-d"/>';
    s += '<rect x="702" y="690" width="81" height="10" class="o f-plinth"/><rect x="817" y="690" width="81" height="10" class="o f-plinth"/>';
    [712, 848].forEach(x => {
      s += '<rect x="' + (x - 5) + '" y="585" width="50" height="104" class="sc-winhalo t-night"/>';
      s += '<rect x="' + x + '" y="590" width="40" height="94" class="o f-trim"/>';
      s += '<rect x="' + (x + 4) + '" y="594" width="32" height="86" class="f-win"/>';
      s += '<path d="M' + (x + 7) + ' 598H' + (x + 17) + 'L' + (x + 7) + ' 614Z" class="f-glare"/>';
      s += '<path d="M' + (x + 20) + ' 594V680M' + (x + 4) + ' 622H' + (x + 36) + 'M' + (x + 4) + ' 651H' + (x + 36) + '" class="sc-mull"/>';
      s += '<rect x="' + (x - 4) + '" y="684" width="48" height="6" class="o f-trim"/>';
    });
    s += '<rect x="756" y="597" width="88" height="21" rx="3" class="o f-sign"/><text x="800" y="612" text-anchor="middle" class="sc-signtxt">FUNKHAUS</text>';
    s += '<path d="M777 628H823V700H817V644H783V700H777Z" class="o f-trim"/>';
    s += '<rect x="783" y="632" width="34" height="10" class="o f-win"/><path d="M794 632V642M806 632V642" class="sc-mull"/>';
    if (!closeup) s += '<rect x="783" y="644" width="34" height="56" class="f-doorway"/>';
    const wing = (x, knobX, cls) => '<g class="' + cls + '"><rect x="' + x + '" y="644" width="17" height="56" class="o f-door"/>' +
      '<rect x="' + (x + 3) + '" y="648" width="11" height="20" class="o2 f-door-d"/><rect x="' + (x + 3) + '" y="673" width="11" height="22" class="o2 f-door-d"/>' +
      '<circle cx="' + knobX + '" cy="671" r="1.8" class="f-knob"/></g>';
    s += wing(783, 797.5, closeup ? 'sc-wing sc-wing-l' : '');
    s += wing(800, 802.5, closeup ? 'sc-wing sc-wing-r' : '');
    [768, 832].forEach(x => {
      s += '<circle cx="' + x + '" cy="641" r="9" class="sc-lanternglow t-night"/>';
      s += '<path d="M' + x + ' 629V634" class="sc-mull"/><path d="M' + (x - 3) + ' 634H' + (x + 3) + 'L' + (x + 4) + ' 647H' + (x - 4) + 'Z" class="o f-lantern"/>';
    });
    s += '<rect x="772" y="700" width="56" height="6" class="o f-step"/><rect x="764" y="706" width="72" height="6" class="o f-step"/>';
    return s;
  }

  // Sendemast mit Gitterstreben und Funkwellen
  function mast() {
    let d = '', y = 538;
    for (let i = 0; i < 8; i++) {
      const y2 = y - 23, t1 = (538 - y) / 186, t2 = (538 - y2) / 186;
      const xl1 = 722 + 14 * t1, xr1 = 758 - 14 * t1, xl2 = 722 + 14 * t2, xr2 = 758 - 14 * t2;
      d += 'M' + f1(xl1) + ' ' + y + 'L' + f1(xr2) + ' ' + y2 + 'M' + f1(xr1) + ' ' + y + 'L' + f1(xl2) + ' ' + y2 + 'M' + f1(xl2) + ' ' + y2 + 'H' + f1(xr2);
      y = y2;
    }
    return '<path d="M740 384L686 538M740 384L914 538" class="sc-guy"/>' +
      '<path d="M722 538L736 352M758 538L744 352M740 352V318" class="sc-mast-o"/>' +
      '<path d="' + d + '" class="sc-brace"/>' +
      '<path d="M722 538L736 352M758 538L744 352M740 352V318" class="sc-mast-i"/>' +
      '<circle cx="740" cy="316" r="6" class="o f-mast"/><circle cx="740" cy="330" r="4" class="f-red sc-blink t-night"/>' +
      '<g class="sc-waves"><circle cx="740" cy="316" r="16" class="sc-wave"/><circle cx="740" cy="316" r="16" class="sc-wave sc-wave2"/>' +
      '<circle cx="740" cy="316" r="16" class="sc-wave sc-wave3"/></g>';
  }

  const houseLayer = () => ext(mainHill + house(false) + mast());
  // Nahansicht: nur der Bereich um die Tür (Ausschnitt 200 × 120 Einheiten), scharf gezeichnet
  const closeup = () => '<svg viewBox="700 612 200 120" preserveAspectRatio="none" ' + NOA + '>' + mainHill + house(true) + '</svg>';

  /* ======================= Funkraum ======================= */
  const art = (vb, body, cls) => '<svg class="sc-art' + (cls ? ' ' + cls : '') + '" viewBox="' + vb + '" ' + NOA + '>' + body + '</svg>';

  // Fenster mit Blick auf die Hügel (und den Mast)
  const windowArt = () => art('0 0 200 232',
    '<rect x="8" y="6" width="184" height="212" rx="4" class="o f-frame"/>' +
    '<rect x="22" y="20" width="156" height="184" class="f-wsky"/>' +
    '<g class="t-night"><circle cx="60" cy="56" r="14" class="o f-moon"/><circle cx="120" cy="40" r="2" class="f-star"/>' +
    '<circle cx="160" cy="70" r="1.6" class="f-star"/><circle cx="40" cy="96" r="1.5" class="f-star"/><circle cx="142" cy="30" r="1.5" class="f-star"/></g>' +
    '<g class="t-sun"><circle cx="60" cy="56" r="15" class="o f-sun"/></g>' +
    '<g class="t-cloud"><path d="M110 70c0-10 14-14 20-6 6-10 22-6 22 4 10 0 10 12 0 12h-38c-8 0-10-10-4-10z" class="o f-cloud"/></g>' +
    '<path d="M22 150Q70 120 110 140T178 132V204H22Z" class="f-hill2"/>' +
    '<path d="M140 141V98M134 141L140 98L146 141" class="sc-minimast"/><circle cx="140" cy="96" r="2.5" class="f-red t-night sc-blink"/>' +
    '<path d="M22 176Q90 156 178 172V204H22Z" class="f-hill"/>' +
    '<path d="M30 28H56L30 64Z" class="f-glare"/>' +
    '<rect x="22" y="20" width="156" height="184" class="o" fill="none"/>' +
    '<rect x="96" y="20" width="8" height="184" class="o f-frame"/><rect x="22" y="108" width="156" height="8" class="o f-frame"/>' +
    '<path d="M8 6C26 60 10 140 32 218H8Z" class="o f-curtain"/><path d="M8 6C26 60 10 140 32 218H8Z" class="sc-ht"/>' +
    '<path d="M192 6C174 60 190 140 168 218H192Z" class="o f-curtain"/>' +
    '<rect x="0" y="214" width="200" height="14" rx="2" class="o f-tab-t"/>');

  // Wandtafel mit Diagramm (Statistik)
  const boardArt = () => art('0 0 220 190',
    '<path d="M110 8L40 34M110 8L180 34" class="sc-cord"/><circle cx="110" cy="8" r="4" class="o f-met-t"/>' +
    '<rect x="10" y="30" width="200" height="150" rx="6" class="o f-tab-f"/>' +
    '<rect x="22" y="42" width="176" height="118" class="o f-board"/><rect x="140" y="42" width="58" height="118" class="sc-ht"/>' +
    '<path d="M40 148H184M40 148V56M36 62L40 54L44 62" class="sc-chalk"/>' +
    '<rect x="52" y="122" width="18" height="26" class="sc-chalkbar"/><rect x="82" y="106" width="18" height="42" class="sc-chalkbar"/>' +
    '<rect x="112" y="92" width="18" height="56" class="sc-chalkbar"/><rect x="142" y="74" width="18" height="74" class="sc-chalkbar"/>' +
    '<path d="M61 112L91 96L121 82L151 64L176 58M168 54L177 58L170 65" class="sc-chalk"/>' +
    '<rect x="30" y="176" width="160" height="8" class="o f-tab-t"/><rect x="62" y="170" width="18" height="6" rx="2" class="f-chalk"/>');

  // Regal mit Röhren und Büchern (das Codebuch ist ein eigener Knopf darauf)
  const shelfArt = () => art('0 0 300 170',
    '<rect x="88" y="52" width="14" height="68" class="o f-book2"/><rect x="102" y="64" width="12" height="56" class="o f-book3"/>' +
    '<path d="M116 120L134 60L146 64L128 122Z" class="o f-book"/>' +
    '<rect x="150" y="100" width="56" height="20" rx="3" class="o f-dark-f"/>' +
    '<path d="M160 100V58C160 40 196 40 196 58V100Z" class="o f-glass"/>' +
    '<ellipse cx="178" cy="82" rx="11" ry="16" class="sc-tubeglow"/>' +
    '<path d="M168 98V64H188V98M172 72H184M172 82H184" class="sc-tubeinner"/><path d="M166 52C168 46 174 44 178 44" class="sc-glassglare"/>' +
    '<rect x="222" y="104" width="44" height="16" rx="3" class="o f-dark-f"/>' +
    '<path d="M230 104V72C230 58 258 58 258 72V104Z" class="o f-glass"/>' +
    '<ellipse cx="244" cy="90" rx="8" ry="11" class="sc-tubeglow sc-tubeglow2"/>' +
    '<path d="M238 102V78H250V102" class="sc-tubeinner"/>' +
    '<rect x="0" y="120" width="300" height="12" class="o f-tab-t"/><rect x="0" y="132" width="300" height="6" class="o f-tab-f"/>' +
    '<path d="M30 138V166L58 138ZM270 138V166L242 138Z" class="o f-tab-s"/>');

  const codebookArt = () => art('0 0 70 104',
    '<rect x="4" y="2" width="62" height="100" rx="4" class="o f-book"/>' +
    '<rect x="46" y="2" width="20" height="100" class="sc-ht"/>' +
    '<rect x="4" y="2" width="12" height="100" rx="3" class="o f-book-d"/>' +
    '<path d="M4 16H16M4 88H16" class="sc-bookband"/>' +
    '<rect x="22" y="16" width="38" height="36" rx="2" class="o f-paper"/>' +
    '<text x="41" y="31" text-anchor="middle" class="sc-booktxt">CODE</text>' +
    '<path d="M27 42h3M33 42h8M44 42h3M50 42h3" class="sc-booklines"/>' +
    '<path d="M24 66H58M24 74H52" class="sc-bookband"/>');

  // Funkgerät (Gehäuse = Funkspruch; der rechte Drehknopf ist ein eigener Knopf)
  function radioArt() {
    let ticks = '';
    for (let x = 182; x <= 320; x += 8) ticks += 'M' + x + ' 70V' + ((x - 182) % 16 === 0 ? 84 : 78);
    return art('0 -10 360 270',
      '<path d="M300 40L334-2" class="sc-ant"/><circle cx="334" cy="-3" r="5" class="o f-met-t"/>' +
      '<path d="M60 40V16H200V40" class="sc-handle"/><circle cx="60" cy="16" r="5" class="o f-met-t"/><circle cx="200" cy="16" r="5" class="o f-met-t"/>' +
      '<rect x="40" y="232" width="34" height="14" rx="3" class="o f-dark-f"/><rect x="286" y="232" width="34" height="14" rx="3" class="o f-dark-f"/>' +
      '<rect x="12" y="38" width="336" height="200" rx="24" class="o f-radio"/>' +
      '<path d="M300 40H324Q348 40 348 64V214Q348 238 324 238H300Z" class="sc-ht"/>' +
      '<rect x="22" y="48" width="316" height="180" rx="16" class="sc-trimline"/>' +
      '<rect x="34" y="64" width="124" height="148" rx="10" fill="url(#sc-grille)" class="o"/>' +
      '<rect x="176" y="64" width="150" height="66" rx="8" class="o f-dial"/>' +
      '<path d="' + ticks + '" class="sc-tick"/>' +
      '<g class="sc-dialtxt"><text x="196" y="104">50</text><text x="226" y="104">70</text><text x="256" y="104">90</text><text x="286" y="104">110</text></g>' +
      '<text x="251" y="123" text-anchor="middle" class="sc-dialtxt2">KURZWELLE</text>' +
      '<g class="sc-needle"><path d="M188 68V126" class="sc-needle-l"/></g>' +
      '<circle cx="212" cy="180" r="22" class="o f-knobc"/><path d="M212 180V162" class="sc-knobptr"/>' +
      '<circle cx="296" cy="180" r="27" class="o f-dark-s"/>' +
      '<circle cx="254" cy="150" r="7" class="o sc-radio-lamp"/>' +
      '<text x="180" y="224" text-anchor="middle" class="sc-radiotxt">FUNK · MORSE</text>');
  }
  const knobArt = () => {
    let ribs = '';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      ribs += 'M' + f1(30 + Math.cos(a) * 17) + ' ' + f1(30 + Math.sin(a) * 17) + 'L' + f1(30 + Math.cos(a) * 21) + ' ' + f1(30 + Math.sin(a) * 21);
    }
    return art('0 0 60 60', '<circle cx="30" cy="30" r="27" class="o f-met-f"/><circle cx="30" cy="30" r="22" class="o f-dark-f"/>' +
      '<path d="' + ribs + '" class="sc-ribs"/><circle cx="30" cy="30" r="13" class="f-dark-t"/><path d="M30 30V11" class="sc-knobptr"/>', 'sc-knobart');
  };

  // Hängelampe
  const lampArt = () => art('0 0 140 204',
    '<path d="M70 0V120" class="sc-cord"/><rect x="62" y="116" width="16" height="14" class="o f-met-f"/>' +
    '<ellipse cx="70" cy="190" rx="20" ry="9" class="f-bulb sc-bulb"/>' +
    '<path d="M20 188C28 140 50 128 70 128C90 128 112 140 120 188Z" class="o f-shade"/>' +
    '<path d="M70 128C90 128 112 140 120 188H84C84 160 80 140 70 128Z" class="sc-ht"/>' +
    '<path d="M20 188C50 198 90 198 120 188" class="o f-shade-d" fill="none"/>');

  // Tisch: zwei Varianten (Querformat flach, Hochformat tiefer), Seitenverhältnis wird gestreckt
  function tableArt(deep) {
    const t = deep ? 186 : 120;
    return '<svg class="sc-tableart ' + (deep ? 'sc-deep' : 'sc-flat') + '" viewBox="0 0 1000 300" preserveAspectRatio="none" ' + NOA + '>' +
      '<rect x="26" y="' + (t + 34) + '" width="46" height="120" class="o f-tab-s"/><rect x="928" y="' + (t + 34) + '" width="46" height="120" class="o f-tab-s"/>' +
      '<polygon points="40,0 960,0 1000,' + t + ' 0,' + t + '" class="o f-tab-t"/>' +
      '<path d="M120 ' + f1(t * .2) + 'C400 ' + f1(t * .28) + ' 600 ' + f1(t * .12) + ' 880 ' + f1(t * .24) + 'M80 ' + f1(t * .52) + 'C300 ' + f1(t * .6) + ' 700 ' + f1(t * .44) + ' 930 ' + f1(t * .56) + 'M40 ' + f1(t * .82) + 'C400 ' + f1(t * .9) + ' 640 ' + f1(t * .76) + ' 970 ' + f1(t * .86) + '" class="sc-grain"/>' +
      '<rect x="0" y="' + t + '" width="1000" height="34" class="o f-tab-f"/></svg>';
  }

  // Heft und Stift (Lernen)
  function notebookArt() {
    let rings = '';
    for (let i = 0; i < 7; i++) {
      const t = .06 + i * .14;
      rings += '<ellipse cx="' + f1(18 + 12 * t) + '" cy="' + f1(34 + 76 * t) + '" rx="5" ry="2.6" class="sc-ring"/>';
    }
    return art('0 0 170 124',
      '<path d="M30 110L156 90L157 97L31 117Z" class="o f-book"/>' +
      '<path d="M18 34L132 16L156 90L30 110Z" class="o f-paper"/>' +
      '<path d="M40 46L136 31M44 60L140 45M47 74L145 59M51 88L149 73" class="sc-ruled"/>' +
      '<path d="M58 54h4M68 52.4h12M86 49.6h4M98 48h4" class="sc-inkline"/>' + rings +
      '<g transform="rotate(-30 100 80)"><rect x="50" y="74" width="96" height="11" class="o f-pencil"/>' +
      '<path d="M50 77.7H146" class="sc-pencilline"/><rect x="40" y="74" width="11" height="11" class="o f-met-t"/>' +
      '<rect x="30" y="74" width="11" height="11" rx="2" class="o f-eraser"/>' +
      '<path d="M146 74L162 79.5L146 85Z" class="o f-wood-t"/><path d="M157 77.8L162 79.5L157 81.2Z" class="f-ink"/></g>');
  }

  // Kopfhörer (Hören)
  const phonesArt = () => art('0 0 160 134',
    '<path d="M136 120C142 134 110 130 116 119C122 110 100 112 104 126" class="sc-cable-o"/>' +
    '<path d="M136 120C142 134 110 130 116 119C122 110 100 112 104 126" class="sc-cable-i"/>' +
    '<path d="M22 84C22 12 138 12 138 84H126C126 28 34 28 34 84Z" class="o f-dark-f"/>' +
    '<path d="M50 30C70 18 90 18 110 30L106 38C88 28 72 28 54 38Z" class="o f-pad"/>' +
    '<rect x="10" y="70" width="32" height="52" rx="14" class="o f-dark-t"/><rect x="16" y="78" width="20" height="36" rx="9" class="o f-accent"/>' +
    '<rect x="118" y="70" width="32" height="52" rx="14" class="o f-dark-t"/><rect x="124" y="78" width="20" height="36" rx="9" class="o f-accent"/>' +
    '<rect x="134" y="70" width="16" height="52" class="sc-ht"/>');

  // Papierflugzeug (Spiel)
  const planeArt = () => art('0 0 170 110',
    '<path d="M4 72H30M12 86H42M0 58H20" class="sc-motion"/>' +
    '<polygon points="84,70 166,12 98,100" class="o f-paper-d"/><polygon points="84,70 166,12 98,100" class="sc-ht"/>' +
    '<polygon points="84,70 98,100 90,76" class="o f-paper-dd"/>' +
    '<polygon points="34,62 166,12 84,70" class="o f-paper"/>');

  /* ---------- Morsetaste: aus einem kleinen 3D-Modell in drei Ansichten berechnet ---------- */
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    p.forEach(q => { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  // Baut eine Ansicht. yaw = Drehung um die senkrechte Achse (negativ = von links, positiv = von rechts)
  function buildKey(yaw) {
    const P = 0.42, cp = Math.cos(P), sp = Math.sin(P), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const pr = (x, y, z) => { const xr = x * cy - z * sy, zr = x * sy + z * cy; return [xr, -y * cp + zr * sp, zr * cp + y * sp]; };
    const rot = n => [n[0] * cy - n[2] * sy, n[1], n[0] * sy + n[2] * cy];
    const visible = n => { const r = rot(n); return r[1] * sp + r[2] * cp > 0.02; };
    const roleOf = n => { const r = rot(n); if (r[1] > 0.6) return 't'; return Math.abs(r[2]) >= Math.abs(r[0]) * 0.9 ? 'f' : 's'; };

    const out = { back: [], lever: [], front: [] };
    let G = out.back;
    const poly = (pts, cls) => G.push({ k: 'poly', pts: pts.map(q => [q[0], q[1]]), cls: cls });

    function face(pts3, n, mat) {
      if (!visible(n)) return;
      const ro = roleOf(n), pts = pts3.map(q => pr(q[0], q[1], q[2]));
      poly(pts, 'o m-' + mat + '-' + ro);
      if (ro === 's') poly(pts, 'sc-ht');
    }
    function box(a, b, c, d, e, f, mat) {
      const X = [a, b], Y = [c, d], Z = [e, f], C = (i, j, k) => [X[i], Y[j], Z[k]];
      face([C(0, 0, 0), C(0, 0, 1), C(0, 1, 1), C(0, 1, 0)], [-1, 0, 0], mat);
      face([C(1, 0, 0), C(1, 1, 0), C(1, 1, 1), C(1, 0, 1)], [1, 0, 0], mat);
      face([C(0, 0, 0), C(0, 1, 0), C(1, 1, 0), C(1, 0, 0)], [0, 0, -1], mat);
      face([C(0, 0, 1), C(1, 0, 1), C(1, 1, 1), C(0, 1, 1)], [0, 0, 1], mat);
      face([C(0, 1, 0), C(0, 1, 1), C(1, 1, 1), C(1, 1, 0)], [0, 1, 0], mat);
    }
    function prism(pf, z0, z1, mat) {
      for (let i = 0; i < pf.length; i++) {
        const a = pf[i], b = pf[(i + 1) % pf.length], nx = b[1] - a[1], ny = -(b[0] - a[0]), L = Math.hypot(nx, ny);
        face([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], [nx / L, ny / L, 0], mat);
      }
      face(pf.map(q => [q[0], q[1], z1]), [0, 0, 1], mat);
      face(pf.map(q => [q[0], q[1], z0]), [0, 0, -1], mat);
    }
    function cyl(axis, c, r, len, mat, opt) {
      opt = opt || {};
      const N = 24, at = (t, h) => {
        const u = r * Math.cos(t), v = r * Math.sin(t);
        if (axis === 'y') return [c[0] + u, c[1] + h, c[2] + v];
        if (axis === 'z') return [c[0] + u, c[1] + v, c[2] + h];
        return [c[0] + h, c[1] + u, c[2] + v];
      };
      const PA = [], PB = [];
      for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2; PA.push(pr.apply(null, at(t, 0))); PB.push(pr.apply(null, at(t, len))); }
      poly(hull(PA.concat(PB)), 'o m-' + mat + '-f');
      if (axis === 'y') {
        // rechte Hälfte im Halbtonraster: wirkt wie Schatten
        const cc = pr(c[0], c[1], c[2])[0], on = PA.map(q => q[0] > cc + r * .2);
        let st = on.findIndex((v, i) => v && !on[(i + N - 1) % N]);
        if (st >= 0) {
          const arc = [];
          for (let i = 0; i < N && on[(st + i) % N]; i++) arc.push((st + i) % N);
          if (arc.length > 1) poly(arc.map(i => PA[i]).concat(arc.slice().reverse().map(i => PB[i])), 'sc-ht');
        }
        if (opt.knurl) {
          const segs = [];
          for (let i = 0; i < 16; i++) {
            const t = i / 16 * Math.PI * 2, u = Math.cos(t), v = Math.sin(t);
            if (u * sy + v * cy > .3) segs.push([pr.apply(null, at(t, 1)), pr.apply(null, at(t, len - 1))]);
          }
          G.push({ k: 'segs', segs: segs, cls: 'sc-knurl' });
        }
        if (opt.shine) {
          const wx = -0.55 * cy + 0.83 * sy, wz = 0.55 * sy + 0.83 * cy;
          G.push({ k: 'segs', segs: [[pr(c[0] + r * wx, c[1] + len * .15, c[2] + r * wz), pr(c[0] + r * wx, c[1] + len * .85, c[2] + r * wz)]], cls: 'sc-shine' });
        }
      }
      const ax = axis === 'y' ? [0, 1, 0] : axis === 'z' ? [0, 0, 1] : [1, 0, 0];
      if (visible(ax)) poly(PB, 'o m-' + mat + '-t');
      else if (visible(ax.map(v => -v))) poly(PA, 'o m-' + mat + '-t');
      if (opt.slot && axis === 'y') G.push({ k: 'segs', segs: [[pr.apply(null, at(.6, len)), pr.apply(null, at(.6 + Math.PI, len))]], cls: 'sc-slot' });
    }
    function spring(x, z, y0, y1, r, turns) {
      const pts = [], N = turns * 16;
      for (let i = 0; i <= N; i++) {
        const t = i / N, a = t * turns * Math.PI * 2;
        pts.push(pr(x + r * Math.cos(a), y0 + (y1 - y0) * t, z + r * Math.sin(a)));
      }
      G.push({ k: 'line', pts: pts, cls: 'sc-spring-o' });
      G.push({ k: 'line', pts: pts, cls: 'sc-spring-i' });
    }
    // Teile nach Tiefe sortieren (weiter hinten zuerst zeichnen)
    let parts = [];
    function part(center, fn) { const save = G; G = []; fn(); parts.push({ d: pr(center[0], center[1], center[2])[2], items: G }); G = save; }
    function flush() { parts.sort((a, b) => a.d - b.d).forEach(p => p.items.forEach(it => G.push(it))); parts = []; }

    // Schatten (versetzt, im Halbtonraster)
    const foot = hull([[-150, 0, -62], [150, 0, -62], [150, 0, 62], [-150, 0, 62]].map(q => pr(q[0], q[1], q[2]))).map(q => [q[0] + 16, q[1] + 11]);
    poly(foot, 'sc-kshadow');
    poly(foot, 'sc-ht');
    // Holzsockel mit abgesetzter Kante
    box(-150, 150, 0, 24, -62, 62, 'wood');
    box(-144, 144, 24, 30, -56, 56, 'wood');
    // Messing-Grundplatte und ihre Schrauben
    box(-60, 125, 30, 35, -36, 36, 'met');
    [[-52, -28], [-52, 28], [117, -28], [117, 28]].forEach(q => cyl('y', [q[0], 35, q[1]], 4, 1.5, 'met', { slot: true }));
    // Kabel: zwei Adern von den Klemmen, dann ein Kabel zur Steckdose an der Wand
    const t1 = pr(138, 46, -34), t2 = pr(138, 46, 34), J = pr(172, 26, -74), S = [182, -112];
    const wire = (a, c1, c2, b, cls) => G.push({ k: 'cubic', pts: [a, c1, c2, b], cls: cls });
    [['sc-wire-o'], ['sc-wire-i']].forEach(c => {
      wire(t1, [t1[0] + 14, t1[1] - 8], [J[0] - 12, J[1] - 2], J, c[0]);
      wire(t2, [t2[0] + 20, t2[1] - 2], [J[0] + 2, J[1] + 10], J, c[0]);
    });
    wire(J, [J[0] + 44, J[1] - 6], [S[0] + 8, S[1] + 90], [S[0], S[1] + 12], 'sc-cable-o');
    wire(J, [J[0] + 44, J[1] - 6], [S[0] + 8, S[1] + 90], [S[0], S[1] + 12], 'sc-cable-i');
    poly([[S[0] - 14, S[1] - 18], [S[0] + 14, S[1] - 18], [S[0] + 14, S[1] + 18], [S[0] - 14, S[1] + 18]], 'o f-socket');
    G.push({ k: 'circ', c: [S[0], S[1] - 6], r: 3, cls: 'f-ink' });
    G.push({ k: 'circ', c: [S[0], S[1] + 6], r: 3, cls: 'f-ink' });

    // feste Teile hinter dem Hebel
    part([32, 50, -27], () => box(24, 40, 35, 70, -32, -22, 'met'));                       // hintere Lagerböckchen
    part([-30, 40, 0], () => cyl('y', [-30, 35, 0], 5, 11, 'sil'));                          // unterer Kontakt
    part([70, 45, 0], () => spring(70, 0, 35, 56, 5, 6));                                    // Rückholfeder
    part([109, 60, -16], () => box(102, 116, 35, 92, -22, -10, 'met'));                      // Säule der hinteren Stellschraube
    [-34, 34].forEach(z => part([138, 40, z], () => {                                        // Anschlussklemmen
      cyl('y', [138, 30, z], 6, 10, 'met');
      cyl('y', [138, 40, z], 9, 7, 'dark', { knurl: true });
      cyl('y', [138, 47, z], 3, 4, 'met');
    }));
    part([32, 63, -10], () => cyl('z', [32, 63, -34], 6, 68, 'met'));                       // Drehachse
    flush();

    // Hebel mit Knopf, Kontakt und vorderer Stellschraube (dreht sich als Ganzes)
    G = out.lever;
    cyl('y', [-30, 49, 0], 4, 7, 'sil');
    prism([[-112, 59], [20, 55], [45, 55], [114, 59], [114, 66], [45, 72], [20, 72], [-112, 66]], -6, 6, 'met');
    box(18, 46, 53, 73, -11, 11, 'met');
    cyl('y', [-30, 66, 0], 3, 26, 'sil', { shine: true });
    cyl('y', [-30, 70, 0], 7.5, 5, 'met', { knurl: true });
    cyl('y', [-30, 88, 0], 9, 7, 'met', { knurl: true, shine: true });
    cyl('y', [-112, 64, 0], 18, 5, 'met');
    cyl('y', [-112, 69, 0], 15, 21, 'dark', { shine: true });
    cyl('y', [-112, 90, 0], 12.5, 3, 'dark');

    // feste Teile vor dem Hebel
    G = out.front;
    part([32, 52, 27], () => box(24, 40, 35, 70, 22, 32, 'met'));                           // vordere Lagerböckchen
    part([32, 63, 33], () => cyl('z', [32, 63, 32], 7, 3, 'met'));                          // Achsschraube
    part([110, 95, -6], () => box(100, 120, 92, 99, -22, 8, 'met'));                         // Brücke
    part([112, 100, 0], () => {                                                              // hintere Stellschraube
      cyl('y', [112, 66, 0], 3, 40, 'sil', { shine: true });
      cyl('y', [112, 99, 0], 7, 5, 'met', { knurl: true });
      cyl('y', [112, 106, 0], 9, 7, 'met', { knurl: true, shine: true });
    });
    flush();

    return { groups: out, pivot: pr(32, 63, 0) };
  }

  function serialize(items, ox, oy) {
    const P = q => f1(q[0] - ox) + ',' + f1(q[1] - oy);
    return items.map(it => {
      if (it.k === 'poly') return '<polygon points="' + it.pts.map(P).join(' ') + '" class="' + it.cls + '"/>';
      if (it.k === 'line') return '<polyline points="' + it.pts.map(P).join(' ') + '" class="' + it.cls + '"/>';
      if (it.k === 'segs') return it.segs.length ? '<path d="' + it.segs.map(s => 'M' + P(s[0]) + 'L' + P(s[1])).join('') + '" class="' + it.cls + '"/>' : '';
      if (it.k === 'cubic') return '<path d="M' + P(it.pts[0]) + 'C' + P(it.pts[1]) + ' ' + P(it.pts[2]) + ' ' + P(it.pts[3]) + '" class="' + it.cls + '"/>';
      if (it.k === 'circ') return '<circle cx="' + f1(it.c[0] - ox) + '" cy="' + f1(it.c[1] - oy) + '" r="' + it.r + '" class="' + it.cls + '"/>';
      return '';
    }).join('');
  }

  // Drei Ansichten mit gemeinsamem Ausschnitt, damit sie sich deckungsgleich überblenden lassen
  function keyViews() {
    const views = [-0.62, 0, 0.62].map(buildKey);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); };
    views.forEach(v => ['back', 'lever', 'front'].forEach(g => v.groups[g].forEach(it => {
      if (it.pts) it.pts.forEach(grow);
      if (it.segs) it.segs.forEach(s => { grow(s[0]); grow(s[1]); });
      if (it.c) grow(it.c);
    })));
    x0 -= 8; y0 -= 8; x1 += 8; y1 += 8;
    const w = f1(x1 - x0), h = f1(y1 - y0);
    const names = ['l', 'f', 'r'];
    const svgs = views.map((v, i) => {
      const px = f1(v.pivot[0] - x0), py = f1(v.pivot[1] - y0);
      return '<svg class="sc-v sc-v-' + names[i] + '" viewBox="0 0 ' + w + ' ' + h + '" ' + NOA + '>' +
        serialize(v.groups.back, x0, y0) +
        '<g class="sc-lever" style="transform-origin:' + px + 'px ' + py + 'px">' + serialize(v.groups.lever, x0, y0) + '</g>' +
        serialize(v.groups.front, x0, y0) + '</svg>';
    });
    return { w: w, h: h, svgs: svgs };
  }

  /* ---------- Kleine Symbole für die Bedienknöpfe ---------- */
  const icons = {
    soundOn: '<svg viewBox="0 0 24 24" ' + NOA + '><path d="M4 9h4l5-4v14l-5-4H4z" class="sc-ic-f"/><path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.5 6c3 3.2 3 8.8 0 12" class="sc-ic-s"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" ' + NOA + '><path d="M4 9h4l5-4v14l-5-4H4z" class="sc-ic-f"/><path d="M16 9l5 6M21 9l-5 6" class="sc-ic-s"/></svg>',
    close: '<svg viewBox="0 0 24 24" ' + NOA + '><path d="M6 6l12 12M18 6L6 18" class="sc-ic-s"/></svg>'
  };

  return {
    defs: defs, sky: sky, zeppelin: zeppelin, hills: hills, houseLayer: houseLayer, closeup: closeup,
    city3: () => city(11, 735, 70, 200, 26, 60, 'f-city3', 0),
    city2: () => city(23, 752, 50, 150, 30, 70, 'o2 f-city2', .12),
    city1: () => city(37, 768, 34, 112, 36, 80, 'o f-city1', .28),
    fog3: () => fogBand(590, 180), fog2: () => fogBand(630, 170), fog1: () => fogBand(672, 160),
    windowArt: windowArt, boardArt: boardArt, shelfArt: shelfArt, codebookArt: codebookArt, radioArt: radioArt,
    knobArt: knobArt, lampArt: lampArt, tableArt: tableArt, notebookArt: notebookArt, phonesArt: phonesArt,
    planeArt: planeArt, keyViews: keyViews, icons: icons
  };
})();
