/* Morse Coach – Oberfläche und Trainingsmodi */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  let S = Store.load();
  let activeTab = 'start';

  const THEMES = { dunkel: 'Dunkel', hell: 'Hell', funk: 'Funkgerät' };
  const THEME_ORDER = ['dunkel', 'hell', 'funk'];
  const THEME_COLORS = { dunkel: '#171a33', hell: '#ffffff', funk: '#2a1c10' };
  const SOUND_TABS = ['lernen', 'hoeren', 'senden', 'spiel', 'uebersetzer'];
  const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789.,?/=-'.split('');

  // Funksprüche für das Funkgerät auf der Startseite (hier lassen sich weitere ergänzen)
  const RADIO_MSGS = ['SOS', 'HI'];
  let radioIdx = 0;

  const WORDS = ['HALLO', 'FUNK', 'NACHT', 'HAUS', 'BAUM', 'WASSER', 'FEUER', 'BERG', 'STERN', 'MEER',
    'SCHIFF', 'WIND', 'LICHT', 'BRIEF', 'ZUG', 'KARTE', 'WALD', 'TISCH', 'SONNE', 'MOND', 'KATZE',
    'HUND', 'APFEL', 'BROT', 'FREUND', 'NORDEN', 'SUEDEN', 'NOTRUF', 'ANTENNE', 'SIGNAL', 'FREQUENZ',
    'MORSE', 'TASTE', 'KANAL', 'EMPFANG', 'GRUSS', 'WELLE', 'RAUSCHEN'];
  const SENTENCES = ['ICH HOERE DICH GUT', 'WIR FAHREN MORGEN FRUEH', 'DAS WETTER IST SCHOEN',
    'BITTE KOMM ZUM FUNK', 'DIE KATZE SCHLAEFT', 'ALLES IN ORDNUNG', 'VERSTANDEN ENDE',
    'HIER IST DER NORDEN', 'KANAL EINS BITTE KOMMEN', 'DAS SIGNAL IST STARK'];

  const HLEVELS = {
    leicht: { name: 'Leicht', desc: '3 Gruppen mit je 3 Zeichen aus deiner Auswahl.', groups: 3, size: 3 },
    mittel: { name: 'Mittel', desc: '5 Gruppen mit je 5 Zeichen aus deiner Auswahl.', groups: 5, size: 5 },
    schwer: { name: 'Schwer', desc: '8 Gruppen mit je 5 Zeichen aus deiner Auswahl.', groups: 8, size: 5 },
    woerter: { name: 'Wörter', desc: '5 deutsche Wörter (ohne Umlaute, ä = AE usw.). Unabhängig von der Zeichenauswahl.', words: 5 },
    saetze: { name: 'Sätze', desc: '2 kurze deutsche Sätze (ohne Umlaute, ä = AE usw.). Unabhängig von der Zeichenauswahl.', sentences: 2 }
  };

  const audioOpts = (over) => Object.assign(
    { freq: S.settings.freq, vol: S.settings.vol / 100 * 0.6, cwpm: S.settings.cwpm, wpm: S.settings.wpm },
    over || {}
  );
  const save = () => Store.save(S);
  const symbols = (code) => code.replace(/\./g, '•').replace(/-/g, '–').split('').join(' ');

  // Aktive Zeichen eines Bereichs ('lernen', 'hoeren', 'senden')
  function activeChars(area) {
    const sel = S.sel[area];
    return sel.method === 'custom' ? sel.custom.slice() : Morse.KOCH.slice(0, sel.level).split('');
  }

  function span(cls, text) {
    const el = document.createElement('span');
    if (cls) el.className = cls;
    el.textContent = text;
    return el;
  }

  function accuracy(ch) {
    const st = S.chars[ch];
    if (!st || !st.last.length) return null;
    return st.last.reduce((a, b) => a + b, 0) / st.last.length;
  }

  function enoughChars(area, fbEl) {
    if (activeChars(area).length >= 1) return true;
    fbEl.textContent = 'Wähle oben mindestens 1 Zeichen aus.';
    fbEl.className = 'feedback bad';
    return false;
  }

  // Zufälliges Zeichen aus der Auswahl; schwache (und bei Koch das neueste) öfter
  function pickChar(area, avoid) {
    const list = activeChars(area);
    const koch = S.sel[area].method === 'koch';
    const weights = list.map((ch, i) => {
      if (ch === avoid) return 0;
      const acc = accuracy(ch);
      let w = 1 + (1 - (acc === null ? 0.5 : acc)) * 3;
      if (koch && i === list.length - 1) w += 1.5;
      return w;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[0];
  }

  /* ---------- Kopfzeilenhöhe (für die mitlaufende Leiste) ---------- */
  function updateHeaderHeight() {
    document.documentElement.style.setProperty('--hh', $('#topbar').offsetHeight + 'px');
  }
  window.addEventListener('resize', updateHeaderHeight);

  /* ---------- Tabs ---------- */
  function showTab(name) {
    activeTab = name;
    Morse.stop();
    clearTimeout(L.timer);
    clearTimeout(T.timer);
    clearTimeout(T.auto);
    if (name !== 'spiel') Game.hide();
    $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    const sound = SOUND_TABS.indexOf(name) >= 0;
    $('#quickbar').classList.toggle('show', sound);
    $('#layout').classList.toggle('noside', !sound);
    const act = $('#tabs button.active');
    if (act) $('#tabs').scrollTo({ left: act.offsetLeft - $('#tabs').clientWidth / 2 + act.clientWidth / 2, behavior: 'smooth' });
    if (name === 'start') renderStart();
    if (name === 'lernen') { pickers.lernen.render(); renderLernMeter(); }
    if (name === 'hoeren') { pickers.hoeren.render(); renderHoer(); }
    if (name === 'senden') { pickers.senden.render(); sendNext(); }
    if (name === 'spiel') Game.show();
    if (name === 'statistik') renderStats();
    updateHeaderHeight();
    window.scrollTo(0, 0);
    // Meldung an andere Skripte, welcher Bereich gerade offen ist
    document.dispatchEvent(new CustomEvent('morse:tab', { detail: name }));
  }
  $$('#tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.goto)));
  $('#brand').addEventListener('click', () => showTab('start'));

  /* ---------- Design ---------- */
  function applyTheme() {
    if (!THEMES[S.settings.theme]) S.settings.theme = 'dunkel';
    document.documentElement.dataset.theme = S.settings.theme;
    $('#themeToggle').textContent = 'Design: ' + THEMES[S.settings.theme];
    $$('#themeSeg button').forEach(b => b.classList.toggle('active', b.dataset.themeSet === S.settings.theme));
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', THEME_COLORS[S.settings.theme]);
    updateHeaderHeight();
  }
  function setTheme(t) { S.settings.theme = t; save(); applyTheme(); }
  $('#themeToggle').addEventListener('click', () => {
    const i = THEME_ORDER.indexOf(S.settings.theme);
    setTheme(THEME_ORDER[(i + 1) % THEME_ORDER.length]);
  });
  $$('#themeSeg button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

  // Funkgerät auf der Startseite: Klick sendet abwechselnd verschiedene Funksprüche
  if ($('#radio')) $('#radio').addEventListener('click', () => {
    const msg = RADIO_MSGS[radioIdx % RADIO_MSGS.length];
    radioIdx++;
    if ($('#radioCaption')) $('#radioCaption').textContent = 'Funkspruch: ' + msg + '  (' + Morse.encode(msg) + ')';
    Morse.play(msg, audioOpts());
  });

  /* ---------- Empfangsanzeige (Lampe/Zeiger folgen dem Ton) ---------- */
  $$('.rx-slot').forEach(slot => slot.appendChild($('#rxTpl').content.cloneNode(true)));
  Morse.onSignal = on => {
    $$('.rx').forEach(el => el.classList.toggle('on', on));
    if ($('#radio')) $('#radio').classList.toggle('on', on);
  };

  /* ---------- Ton & Tempo: Leiste und Einstellungen sind verbunden ---------- */
  function showSetting(key) {
    const val = S.settings[key];
    $$('input[data-set="' + key + '"]').forEach(e => { e.value = val; });
    $$('[data-out="' + key + '"]').forEach(o => { o.textContent = key === 'confirmDelay' ? Number(val).toFixed(1) : val; });
  }
  $$('input[data-set]').forEach(el => {
    const key = el.dataset.set;
    el.addEventListener('input', () => { S.settings[key] = Number(el.value); showSetting(key); save(); });
    el.addEventListener('change', () => { if (key === 'freq' || key === 'vol') Morse.beep(1, audioOpts()); });
  });
  ['cwpm', 'wpm', 'freq', 'vol', 'confirmDelay'].forEach(showSetting);

  // Eingeklappte Leiste (kleine Bildschirme)
  $('#qToggle').addEventListener('click', () => {
    const closed = $('#quickbar').classList.toggle('closed');
    $('#qToggle').setAttribute('aria-expanded', closed ? 'false' : 'true');
    $('#qToggle').textContent = 'Ton & Tempo ' + (closed ? '▾' : '▴');
    updateHeaderHeight();
  });

  /* ---------- Zeichenauswahl (je Bereich eigene) ---------- */
  const pickers = {};

  function createPicker(slot) {
    const area = slot.dataset.area;
    const root = $('#pickerTpl').content.firstElementChild.cloneNode(true);
    slot.appendChild(root);
    const sel = () => S.sel[area];
    const onChange = () => {
      save();
      render();
      if (area === 'lernen') renderLernMeter();
      if (area === 'senden') sendNext();
    };

    function render() {
      const s = sel();
      const koch = s.method === 'koch';
      $$('.pk-method button', root).forEach(b => b.classList.toggle('active', b.dataset.method === s.method));
      $('.pk-koch', root).style.display = koch ? '' : 'none';
      $('.pk-custom', root).style.display = koch ? 'none' : '';
      const grid = $('.pk-grid', root);
      grid.textContent = '';
      (koch ? Morse.KOCH.split('') : POOL).forEach((ch, i) => {
        const selected = koch ? i < s.level : s.custom.indexOf(ch) >= 0;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (selected ? ' sel' : '') + (koch && i === s.level - 1 ? ' new' : '');
        b.textContent = ch;
        b.title = symbols(Morse.TABLE[ch]);
        b.setAttribute('aria-pressed', selected ? 'true' : 'false');
        b.addEventListener('click', () => {
          if (koch) {
            s.level = i + 1;
            if (area === 'lernen') S.levelRecent = [];
          } else {
            const k = s.custom.indexOf(ch);
            if (k >= 0) s.custom.splice(k, 1); else s.custom.push(ch);
          }
          onChange();
        });
        grid.appendChild(b);
      });
      if (koch) {
        $('.pk-info', root).textContent = area === 'lernen'
          ? 'Tippe ein Zeichen an: alle Zeichen bis dorthin sind freigeschaltet. Ab 90 % Genauigkeit in den letzten 20 Antworten rückst du automatisch eine Stufe vor.'
          : 'Tippe ein Zeichen an: alle Zeichen bis dorthin sind aktiv.';
        $('.pk-label', root).textContent = 'Stufe ' + s.level + ' von ' + Morse.KOCH.length;
      } else {
        $('.pk-info', root).textContent = 'Tippe die Zeichen an, die du üben möchtest (' + s.custom.length + ' gewählt, mindestens 1).';
      }
    }

    $$('.pk-method button', root).forEach(b => b.addEventListener('click', () => { sel().method = b.dataset.method; onChange(); }));
    $('.pk-plus', root).addEventListener('click', () => {
      const s = sel();
      if (s.level < Morse.KOCH.length) { s.level++; if (area === 'lernen') S.levelRecent = []; onChange(); }
    });
    $('.pk-minus', root).addEventListener('click', () => {
      const s = sel();
      if (s.level > 1) { s.level--; if (area === 'lernen') S.levelRecent = []; onChange(); }
    });
    $('.pk-letters', root).addEventListener('click', () => { sel().custom = POOL.filter(c => /[A-Z]/.test(c)); onChange(); });
    $('.pk-digits', root).addEventListener('click', () => { sel().custom = POOL.filter(c => /[0-9]/.test(c)); onChange(); });
    $('.pk-none', root).addEventListener('click', () => { sel().custom = []; onChange(); });

    pickers[area] = { render: render };
    render();
  }
  $$('.pick-slot').forEach(createPicker);

  /* ---------- Start ---------- */
  function statCard(label, value) {
    const d = document.createElement('div');
    d.className = 'stat';
    d.appendChild(span('', label));
    const b = document.createElement('b');
    b.textContent = value;
    d.appendChild(b);
    return d;
  }
  function totals() {
    let n = 0, ok = 0;
    Object.keys(S.chars).forEach(k => { n += S.chars[k].n; ok += S.chars[k].ok; });
    return { n: n, ok: ok };
  }
  function renderStart() {
    const t = totals();
    const box = $('#startStats');
    box.textContent = '';
    box.appendChild(statCard('Tage in Folge', Store.streak(S)));
    box.appendChild(statCard('Genauigkeit', t.n ? Math.round(t.ok / t.n * 100) + ' %' : '–'));
    box.appendChild(statCard('Antworten gesamt', t.n));
  }

  /* ---------- Lernen ---------- */
  const L = { cur: null, prev: null, busy: false, timer: null };

  function renderLernMeter() {
    const koch = S.sel.lernen.method === 'koch';
    $('#lernMeter').style.display = koch ? '' : 'none';
    const n = S.levelRecent.length;
    const acc = n ? S.levelRecent.reduce((a, b) => a + b, 0) / n : 0;
    $('#lernBar').style.width = koch ? Math.round(acc * 100) + '%' : '0%';
    $('#lernQuote').textContent = (koch && n) ? 'Genauigkeit auf dieser Stufe: ' + Math.round(acc * 100) + ' % (' + n + ' Antworten)' : '';
  }

  function lernNext() {
    const fb = $('#lernFeedback');
    L.busy = false;
    if (!enoughChars('lernen', fb)) { L.cur = null; return; }
    L.cur = pickChar('lernen', L.prev);
    L.prev = L.cur;
    $('#lernAnzeige').textContent = '?';
    $('#lernCode').textContent = S.settings.hint ? symbols(Morse.TABLE[L.cur]) : '';
    fb.textContent = '';
    fb.className = 'feedback';
    $('#lernInput').value = '';
    $('#lernInput').focus();
    Morse.play(L.cur, audioOpts());
  }

  function lernAnswer(v) {
    L.busy = true;
    clearTimeout(L.timer);
    const ok = v === L.cur;
    Store.record(S, L.cur, ok);
    const sel = S.sel.lernen;
    const koch = sel.method === 'koch';
    if (koch) {
      S.levelRecent.push(ok ? 1 : 0);
      if (S.levelRecent.length > 20) S.levelRecent.shift();
    }
    $('#lernAnzeige').textContent = L.cur;
    $('#lernCode').textContent = symbols(Morse.TABLE[L.cur]);
    const fb = $('#lernFeedback');
    let wait = 700;
    if (ok) {
      fb.textContent = 'Richtig';
      fb.className = 'feedback ok';
    } else {
      fb.textContent = 'Falsch, das war ' + L.cur + (v ? ' (du: ' + v + ')' : '');
      fb.className = 'feedback bad';
      Morse.play(L.cur, audioOpts());
      wait = 1800;
    }
    if (koch) {
      const acc = S.levelRecent.reduce((a, b) => a + b, 0) / S.levelRecent.length;
      if (S.levelRecent.length >= 20 && acc >= 0.9 && sel.level < Morse.KOCH.length) {
        sel.level++;
        S.levelRecent = [];
        fb.textContent += ' – neue Stufe: ' + Morse.KOCH[sel.level - 1] + ' freigeschaltet';
        wait = 2500;
      }
    }
    save();
    pickers.lernen.render();
    renderLernMeter();
    L.timer = setTimeout(lernNext, wait);
  }

  $('#lernInput').addEventListener('input', e => {
    const raw = e.target.value.trim().toUpperCase();
    e.target.value = '';
    if (!raw || !L.cur || L.busy) return;
    lernAnswer(raw.slice(-1));
  });
  $('#lernStart').addEventListener('click', () => { clearTimeout(L.timer); lernNext(); });
  $('#lernReplay').addEventListener('click', () => { if (L.cur) { Morse.play(L.cur, audioOpts()); $('#lernInput').focus(); } });

  /* ---------- Hören ---------- */
  const H = { text: '' };

  function renderHoer() {
    const seg = $('#hoerLevels');
    seg.textContent = '';
    Object.keys(HLEVELS).forEach(id => {
      const b = document.createElement('button');
      b.textContent = HLEVELS[id].name;
      b.className = id === S.hoerLevel ? 'active' : '';
      b.addEventListener('click', () => {
        S.hoerLevel = id;
        H.text = '';
        $('#hoerResult').textContent = '';
        save();
        renderHoer();
      });
      seg.appendChild(b);
    });
    const lv = HLEVELS[S.hoerLevel];
    $('#hoerDesc').textContent = lv.desc;
    // Zeichenauswahl nur bei Zeichengruppen sinnvoll
    $('#hoerPick').style.display = (lv.words || lv.sentences) ? 'none' : '';
    $('#hoerTempo').textContent = S.hoerenWpm;
  }

  function hoerOpts() {
    return audioOpts({ wpm: S.hoerenWpm, cwpm: Math.max(S.settings.cwpm, S.hoerenWpm) });
  }

  function randomOf(arr, n) {
    const pool = arr.slice();
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  function buildHoerText() {
    const lv = HLEVELS[S.hoerLevel];
    if (lv.words) return randomOf(WORDS, lv.words).join(' ');
    if (lv.sentences) return randomOf(SENTENCES, lv.sentences).join(' ');
    const groups = [];
    for (let g = 0; g < lv.groups; g++) {
      let s = '';
      for (let i = 0; i < lv.size; i++) s += pickChar('hoeren', null);
      groups.push(s);
    }
    return groups.join(' ');
  }

  // Zuordnung per Editierdistanz, damit ein verpasstes Zeichen nicht alle folgenden falsch macht
  function align(target, typed) {
    const n = target.length, m = typed.length;
    const d = [];
    for (let i = 0; i <= n; i++) { d.push(new Array(m + 1).fill(0)); d[i][0] = i; }
    for (let j = 0; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = target[i - 1] === typed[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }
    const tOk = new Array(n).fill(false), uOk = new Array(m).fill(false);
    let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1)) {
        if (target[i - 1] === typed[j - 1]) { tOk[i - 1] = true; uOk[j - 1] = true; }
        i--; j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        i--;
      } else {
        j--;
      }
    }
    return { tOk: tOk, uOk: uOk };
  }

  $('#hoerStart').addEventListener('click', () => {
    const lv = HLEVELS[S.hoerLevel];
    const res = $('#hoerResult');
    if (!lv.words && !lv.sentences && activeChars('hoeren').length < 1) {
      res.textContent = 'Wähle oben mindestens 1 Zeichen aus.';
      res.className = 'result bad';
      return;
    }
    res.className = 'result';
    res.textContent = '';
    H.text = buildHoerText();
    $('#hoerInput').value = '';
    $('#hoerTempo').textContent = S.hoerenWpm;
    Morse.play(H.text, hoerOpts());
    $('#hoerInput').focus();
  });
  $('#hoerReplay').addEventListener('click', () => { if (H.text) Morse.play(H.text, hoerOpts()); });
  $('#hoerMinus').addEventListener('click', () => { if (S.hoerenWpm > 5) { S.hoerenWpm--; save(); $('#hoerTempo').textContent = S.hoerenWpm; } });
  $('#hoerPlus').addEventListener('click', () => { if (S.hoerenWpm < 40) { S.hoerenWpm++; save(); $('#hoerTempo').textContent = S.hoerenWpm; } });

  $('#hoerCheck').addEventListener('click', () => {
    if (!H.text) return;
    Morse.stop();
    const lv = HLEVELS[S.hoerLevel];
    let typed = $('#hoerInput').value.toUpperCase();
    if (lv.words || lv.sentences) {
      typed = typed.replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS');
    }
    typed = typed.replace(/\s/g, '');
    const target = H.text.replace(/\s/g, '');
    const al = align(target, typed);
    let correct = 0;
    al.tOk.forEach((ok, i) => { if (ok) correct++; Store.record(S, target[i], ok); });

    const lineT = document.createElement('div');
    const lineU = document.createElement('div');
    lineT.className = lineU.className = 'line';
    lineT.appendChild(span('lbl', 'Gesendet:'));
    lineU.appendChild(span('lbl', 'Du:'));
    let idx = 0;
    for (let k = 0; k < H.text.length; k++) {
      const c = H.text[k];
      if (c === ' ') { lineT.appendChild(span('', ' ')); continue; }
      lineT.appendChild(span(al.tOk[idx] ? 'ok' : 'bad', c));
      idx++;
    }
    for (let j = 0; j < typed.length; j++) lineU.appendChild(span(al.uOk[j] ? 'ok' : 'bad', typed[j]));
    if (!typed.length) lineU.appendChild(span('bad', '–'));

    const acc = correct / target.length;
    let msg = correct + ' von ' + target.length + ' richtig (' + Math.round(acc * 100) + ' %). ';
    if (acc >= 0.9 && S.hoerenWpm < 40) { S.hoerenWpm++; msg += 'Tempo steigt auf ' + S.hoerenWpm + ' WPM.'; }
    else if (acc < 0.7 && S.hoerenWpm > 5) { S.hoerenWpm--; msg += 'Tempo sinkt auf ' + S.hoerenWpm + ' WPM.'; }
    else msg += 'Tempo bleibt bei ' + S.hoerenWpm + ' WPM.';

    const out = $('#hoerResult');
    out.className = 'result';
    out.textContent = '';
    out.appendChild(lineT);
    out.appendChild(lineU);
    const m = document.createElement('div');
    m.className = 'feedback';
    m.textContent = msg;
    out.appendChild(m);
    $('#hoerTempo').textContent = S.hoerenWpm;
    H.text = '';
    save();
  });

  /* ---------- Senden (Tasten E = kurz, T = lang) ---------- */
  const T = { target: null, prev: null, pat: '', locked: false, timer: null, auto: null };

  function renderSend() {
    $('#sendAnzeige').textContent = T.target || '?';
    $('#sendCode').textContent = (S.settings.hint && T.target) ? symbols(Morse.TABLE[T.target]) : '';
    $('#sendMuster').textContent = T.pat ? symbols(T.pat) : ' ';
  }

  function sendNext() {
    clearTimeout(T.timer);
    clearTimeout(T.auto);
    T.pat = '';
    T.locked = false;
    const fb = $('#sendFeedback');
    fb.textContent = '';
    fb.className = 'feedback';
    if (!enoughChars('senden', fb)) { T.target = null; renderSend(); return; }
    T.target = pickChar('senden', T.prev);
    T.prev = T.target;
    renderSend();
  }

  function armAuto() {
    clearTimeout(T.auto);
    if (S.settings.autoConfirm && T.pat && !T.locked) {
      T.auto = setTimeout(sendConfirm, S.settings.confirmDelay * 1000);
    }
  }

  function pressAnim(sym) {
    const k = $('#morseKey');
    k.classList.add('down');
    setTimeout(() => k.classList.remove('down'), sym === '.' ? 130 : 380);
  }

  function sendSym(sym) {
    if (!T.target || T.locked || T.pat.length >= 7) return;
    T.pat += sym;
    Morse.beep(sym === '.' ? 1 : 3, audioOpts());
    pressAnim(sym);
    renderSend();
    armAuto();
  }
  function sendBack() {
    if (T.locked) return;
    T.pat = T.pat.slice(0, -1);
    renderSend();
    armAuto();
  }
  function sendConfirm() {
    clearTimeout(T.auto);
    if (!T.target || T.locked || !T.pat) return;
    T.locked = true;
    const correct = Morse.TABLE[T.target];
    const ok = T.pat === correct;
    Store.record(S, T.target, ok);
    const fb = $('#sendFeedback');
    if (ok) {
      fb.textContent = 'Richtig';
      fb.className = 'feedback ok';
    } else {
      fb.textContent = 'Falsch, richtig wäre ' + symbols(correct);
      fb.className = 'feedback bad';
    }
    save();
    T.timer = setTimeout(sendNext, ok ? 600 : 1800);
  }

  // Knöpfe: sofort bei Berührung/Klick; Tastatur-Aktivierung (click ohne Zeigerereignis) bleibt erhalten
  function bindKeyButton(sel, sym) {
    const b = $(sel);
    b.addEventListener('pointerdown', e => { e.preventDefault(); sendSym(sym); });
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('click', e => { if (e.detail === 0) sendSym(sym); });
  }
  bindKeyButton('#sendKurz', '.');
  bindKeyButton('#sendLang', '-');
  $('#sendBack').addEventListener('click', sendBack);
  $('#sendOk').addEventListener('click', sendConfirm);

  document.addEventListener('keydown', e => {
    if (activeTab !== 'senden' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches('textarea, select, input[type="text"]')) return;
    const k = e.key.toLowerCase();
    if (['e', 't', ' ', 'enter', 'backspace'].indexOf(k) < 0) return;
    if (e.target.matches('button, input')) e.target.blur();
    e.preventDefault();
    if (k === 'e') sendSym('.');
    else if (k === 't') sendSym('-');
    else if (k === 'backspace') sendBack();
    else sendConfirm();
  });

  /* ---------- Übersetzer ---------- */
  const uText = $('#uText'), uMorse = $('#uMorse');
  uText.addEventListener('input', () => { uMorse.value = Morse.encode(uText.value); });
  uMorse.addEventListener('input', () => { uText.value = Morse.decode(uMorse.value); });
  $('#uPlay').addEventListener('click', () => {
    const text = uText.value.trim() || Morse.decode(uMorse.value);
    if (text) Morse.play(text, audioOpts());
  });
  $('#uStop').addEventListener('click', () => Morse.stop());

  const alpha = $('#alphabet');
  Object.keys(Morse.TABLE).forEach(ch => {
    const b = document.createElement('button');
    b.appendChild(span('', ch));
    const code = document.createElement('b');
    code.textContent = symbols(Morse.TABLE[ch]);
    b.appendChild(code);
    b.addEventListener('click', () => Morse.play(ch, audioOpts()));
    alpha.appendChild(b);
  });

  /* ---------- Statistik ---------- */
  let statPeriod = 'woche';
  const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const pad2 = n => String(n).padStart(2, '0');

  function svgEl(name, attrs, text) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // Liefert die Balken/Punkte eines Zeitraums: { label, show, n, ok, tip }
  function buildBuckets(period) {
    const now = new Date();
    const out = [];
    if (period === 'tag') {
      const day = Store.fmt(now);
      for (let h = 0; h < 24; h++) {
        const v = (S.hours || {})[day + 'T' + pad2(h)];
        out.push({ label: pad2(h), show: h % 3 === 0, n: v ? v.n : 0, ok: v ? v.ok : 0, tip: pad2(h) + ' Uhr' });
      }
    } else if (period === 'woche' || period === 'monat') {
      const count = period === 'woche' ? 7 : 30;
      for (let i = count - 1; i >= 0; i--) {
        const x = new Date(now);
        x.setDate(now.getDate() - i);
        const v = S.days[Store.fmt(x)];
        const dm = pad2(x.getDate()) + '.' + pad2(x.getMonth() + 1) + '.';
        out.push({
          label: period === 'woche' ? WEEKDAYS[x.getDay()] : pad2(x.getDate()) + '.' + pad2(x.getMonth() + 1),
          show: period === 'woche' ? true : i % 5 === 0,
          n: v ? v.n : 0, ok: v ? v.ok : 0, tip: dm
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const x = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const prefix = x.getFullYear() + '-' + pad2(x.getMonth() + 1);
        let n = 0, ok = 0;
        Object.keys(S.days).forEach(k => { if (k.slice(0, 7) === prefix) { n += S.days[k].n; ok += S.days[k].ok; } });
        out.push({ label: MONTHS[x.getMonth()], show: true, n: n, ok: ok, tip: MONTHS[x.getMonth()] + ' ' + x.getFullYear() });
      }
    }
    return out;
  }

  function niceMax(x) {
    if (x <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    return Math.ceil(x / p) * p;
  }

  function drawChart(container, kind, list) {
    container.textContent = '';
    if (!list.some(b => b.n > 0)) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Für diesen Zeitraum gibt es noch keine Daten.';
      container.appendChild(p);
      return;
    }
    const W = 600, Hh = 190, pl = 42, pr = 10, pt = 12, pb = 30;
    const iw = W - pl - pr, ih = Hh - pt - pb;
    const max = kind === 'count' ? niceMax(Math.max.apply(null, list.map(b => b.n))) : 100;
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + Hh, class: 'chart', role: 'img' });

    [0, 0.5, 1].forEach(f => {
      const y = pt + ih - ih * f;
      svg.appendChild(svgEl('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: 'ch-grid' }));
      svg.appendChild(svgEl('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end', class: 'ch-text' },
        Math.round(max * f) + (kind === 'acc' ? ' %' : '')));
    });

    const step = iw / list.length;
    list.forEach((b, i) => {
      if (b.show) svg.appendChild(svgEl('text', { x: pl + step * i + step / 2, y: Hh - 8, 'text-anchor': 'middle', class: 'ch-text' }, b.label));
    });

    if (kind === 'count') {
      list.forEach((b, i) => {
        if (!b.n) return;
        const h = ih * b.n / max;
        const r = svgEl('rect', { x: pl + step * i + step * 0.15, y: pt + ih - h, width: step * 0.7, height: h, rx: 2, class: 'ch-bar' });
        r.appendChild(svgEl('title', {}, b.tip + ': ' + b.n + ' Antworten'));
        svg.appendChild(r);
      });
    } else {
      let path = '';
      let pen = false;
      list.forEach((b, i) => {
        if (!b.n) { pen = false; return; }
        const x = pl + step * i + step / 2;
        const y = pt + ih - ih * (b.ok / b.n);
        path += (pen ? ' L' : ' M') + x + ' ' + y;
        pen = true;
      });
      svg.appendChild(svgEl('path', { d: path.trim(), class: 'ch-line' }));
      list.forEach((b, i) => {
        if (!b.n) return;
        const c = svgEl('circle', { cx: pl + step * i + step / 2, cy: pt + ih - ih * (b.ok / b.n), r: 4, class: 'ch-dot' });
        c.appendChild(svgEl('title', {}, b.tip + ': ' + Math.round(b.ok / b.n * 100) + ' % Genauigkeit'));
        svg.appendChild(c);
      });
    }
    container.appendChild(svg);
  }

  function renderStats() {
    const t = totals();
    const sum = $('#statSummary');
    sum.textContent = '';
    sum.appendChild(statCard('Antworten gesamt', t.n));
    sum.appendChild(statCard('Genauigkeit', t.n ? Math.round(t.ok / t.n * 100) + ' %' : '–'));
    sum.appendChild(statCard('Tage in Folge', Store.streak(S)));

    $$('#periodSeg button').forEach(b => b.classList.toggle('active', b.dataset.period === statPeriod));
    $('#periodNote').textContent = { tag: 'heute, pro Stunde', woche: 'letzte 7 Tage', monat: 'letzte 30 Tage', jahr: 'letzte 12 Monate' }[statPeriod];
    const list = buildBuckets(statPeriod);
    drawChart($('#chartCount'), 'count', list);
    drawChart($('#chartAcc'), 'acc', list);

    const box = $('#statChars');
    box.textContent = '';
    Morse.KOCH.split('').forEach(ch => {
      const acc = accuracy(ch);
      const row = document.createElement('div');
      row.className = 'crow' + (acc === null ? ' none' : '');
      row.appendChild(span('', ch));
      row.appendChild(span('muted', symbols(Morse.TABLE[ch])));
      const bar = document.createElement('div');
      bar.className = 'bar';
      const fill = document.createElement('i');
      fill.style.width = acc === null ? '0%' : Math.round(acc * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(span('', acc === null ? '–' : Math.round(acc * 100) + ' %'));
      box.appendChild(row);
    });
  }
  $$('#periodSeg button').forEach(b => b.addEventListener('click', () => { statPeriod = b.dataset.period; renderStats(); }));

  /* ---------- Einstellungen ---------- */
  $('#setHint').checked = S.settings.hint;
  $('#setHint').addEventListener('change', e => {
    S.settings.hint = e.target.checked;
    save();
    if (L.cur && !L.busy) $('#lernCode').textContent = S.settings.hint ? symbols(Morse.TABLE[L.cur]) : '';
    if (T.target) renderSend();
  });
  $('#setAuto').checked = S.settings.autoConfirm;
  $('#setAuto').addEventListener('change', e => { S.settings.autoConfirm = e.target.checked; save(); });
  $('#resetAll').addEventListener('click', () => {
    if (confirm('Wirklich den gesamten Fortschritt löschen?')) {
      S = Store.reset();
      location.reload();
    }
  });

  /* ---------- Spiel (js/game.js) ---------- */
  Game.init({ getState: () => S, save: save, audioOpts: audioOpts });

  // Schnittstelle für js/intro.js (Intro der Meer-Animation)
  window.MorseApp = { showTab: showTab, audioOpts: audioOpts };

  /* ---------- Start ---------- */
  applyTheme();
  showTab('start');
})();
