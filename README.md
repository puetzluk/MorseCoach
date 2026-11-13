# Morse Coach

Öffnen: `index.html` per Doppelklick im Browser.

- Startseite (Ordner `startszene/`, Vollbild über der App): Meer-Animation → Titel „Morse Coach“ → weiterscrollen → Karten der Lernbereiche (Lernen, Hören, Senden, Games groß; Übersetzer, Statistik kleiner; Einstellungen). Ein Klick auf eine Karte öffnet den Bereich mit der Leiste oben; Das Logo „Morse Coach“ führt zurück zu den Karten, von dort geht es per Hochscrollen ins Meer. „Überspringen“ springt zu den Karten, der runde Knopf oben rechts wechselt das Design. Mit `index.html#lernen` (usw.) öffnet sich ein Bereich direkt.
- Lernen: Koch-Methode oder eigene Zeichenauswahl
- Hören: fünf Stufen (Zeichengruppen, Wörter, Sätze), eigene Zeichenauswahl
- Senden: Taste E = kurz, T = lang, oder Knöpfe; eigene Zeichenauswahl
- Games (Morse-Flug): Hindernisse mit Buchstaben, Code mit E/T eingeben, Stufen, Rekord
- Übersetzer: Text <-> Morse
- Statistik: Verlauf nach Tag, Woche, Monat, Jahr
- Fortschritt wird im Browser gespeichert (localStorage)
- Drei Designs: Dunkel, Hell, Funkgerät (die Meer-Animation ist für alle gleich, der Kartenbereich darunter passt sich an: Tiefsee mit Glas-Karten, Auftauchen ins Hellblaue mit Karten im Sandlook, Holz mit Messingschildern)

## Intro: `startszene/`

Einzeln aufrufbar: `startszene/index.html` (online: https://puetzluk.github.io/MorseCoach/startszene/)

- Inselszene mit Krakenschiff, Papierschiff, Wal, Papagei, ziehenden Wolken
- Scrollen: erst hineinzoomen, dann ploppt das Bullauge auf, Flug durch das Glas in eine Unterwasser-Landschaft (Collage aus ausgeschnittenen Böden und Pflanzen, Fische auf einer Linie, Glitzern und Blasen)
- Landschaft und Fische sinken weg, Titel „Morse Coach“ erscheint
- Laptop und Handy (Hoch- und Querformat)
- Alles steckt in `startszene/index.html` (CSS und JavaScript inline), Bilder in `startszene/img/`
- In der App läuft sie in einem Vollbild-iframe (`index.html` → `#intro`, Logik in `js/intro.js`, Aussehen in `css/intro.css`). Mit `?eingebettet` blendet die Szene ihre Vorschau-Steuerleiste aus. Nachrichten per `postMessage`: von der Szene `morse-open {tab}` und `morse-theme-set {theme}`, an die Szene `morse-theme {theme}` und `morse-zu-karten`.

## Dateien

- `index.html` – Seitengerüst und alle Bereiche
- `css/style.css` – Aussehen der App und die drei Designs
- `css/intro.css` – Startseite als Vollbild über der App, Leiste nur in den Bereichen
- `js/morse.js` – Morsetabelle und Ton (Web Audio)
- `js/storage.js` – Speicherung (Fortschritt)
- `js/game.js` – Morse-Flug
- `js/intro.js` – verbindet Startseite (Meer + Karten) und App: Bereiche öffnen, Design abgleichen, zurück zu den Karten
- `js/app.js` – Bedienung und Trainingsmodi
- `sw.js` – Offline-Cache (PWA)
