# Morse Coach

Öffnen: `index.html` per Doppelklick im Browser.

- Intro: Meer-Animation (Ordner `startszene/`) als Vollbild über der App. Beim Scrollen zoomt man in die Inselszene, das Bullauge ploppt auf, man fliegt hindurch in die Unterwasser-Landschaft, alles sinkt weg und der Titel „Morse Coach“ erscheint – dann blendet das Intro in die Lernseite über. „Überspringen“ beendet es sofort, auf der Startseite gibt es „Intro noch einmal ansehen“.
- Start: Titel, Kacheln für alle Modi, Kurzstatistik; im Funkgerät-Design zusätzlich ein Funkgerät (Klick spielt einen Funkspruch)
- Lernen: Koch-Methode oder eigene Zeichenauswahl
- Hören: fünf Stufen (Zeichengruppen, Wörter, Sätze), eigene Zeichenauswahl
- Senden: Taste E = kurz, T = lang, oder Knöpfe; eigene Zeichenauswahl
- Spiel (Morse-Flug): Hindernisse mit Buchstaben, Code mit E/T eingeben, Stufen, Rekord
- Übersetzer: Text <-> Morse
- Statistik: Verlauf nach Tag, Woche, Monat, Jahr
- Fortschritt wird im Browser gespeichert (localStorage)
- Drei Designs: Dunkel, Hell, Funkgerät (das Intro ist für alle Designs gleich)

## Intro: `startszene/`

Einzeln aufrufbar: `startszene/index.html` (online: https://puetzluk.github.io/MorseCoach/startszene/)

- Inselszene mit Krakenschiff, Papierschiff, Wal, Papagei, ziehenden Wolken
- Scrollen: erst hineinzoomen, dann ploppt das Bullauge auf, Flug durch das Glas in eine Unterwasser-Landschaft (Collage aus ausgeschnittenen Böden und Pflanzen, Fische auf einer Linie, Glitzern und Blasen)
- Landschaft und Fische sinken weg, Titel „Morse Coach“ erscheint
- Laptop und Handy (Hoch- und Querformat)
- Alles steckt in `startszene/index.html` (CSS und JavaScript inline), Bilder in `startszene/img/`
- In der App läuft sie in einem Vollbild-iframe (`index.html` → `#intro`, Logik in `js/intro.js`, Aussehen in `css/intro.css`). Mit `?eingebettet` blendet die Szene ihre Vorschau-Steuerleiste aus und meldet am Ende per `postMessage` „morse-intro-ende“.

## Dateien

- `index.html` – Seitengerüst und alle Bereiche
- `css/style.css` – Aussehen der App und die drei Designs
- `css/intro.css` – Intro (Vollbild über der App, Überspringen-Knopf, Übergang zur Lernseite)
- `js/morse.js` – Morsetabelle und Ton (Web Audio)
- `js/storage.js` – Speicherung (Fortschritt)
- `js/game.js` – Morse-Flug
- `js/intro.js` – startet und beendet das Intro (Meer-Animation)
- `js/app.js` – Bedienung und Trainingsmodi
- `sw.js` – Offline-Cache (PWA)
