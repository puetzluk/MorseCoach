# Morse Coach

Öffnen: `index.html` per Doppelklick im Browser.

- Start: scrollbare Comic-Szene. Vom Funkhaus auf dem Hügel geht es durch die Tür in den Funkraum. Dort führen die Gegenstände in die Modi: Heft = Lernen, Kopfhörer = Hören, Morsetaste = Senden, Papierflugzeug = Spiel, Codebuch = Übersetzer, Wandtafel = Statistik, Drehknopf am Funkgerät = Einstellungen. Ein Klick aufs Funkgerät spielt einen Funkspruch. Darunter steht die Kurzstatistik.
- Lernen: Koch-Methode oder eigene Zeichenauswahl
- Hören: fünf Stufen (Zeichengruppen, Wörter, Sätze), eigene Zeichenauswahl
- Senden: Taste E = kurz, T = lang, oder Knöpfe; eigene Zeichenauswahl
- Spiel (Morse-Flug): Hindernisse mit Buchstaben, Code mit E/T eingeben, Stufen, Rekord
- Übersetzer: Text <-> Morse
- Statistik: Verlauf nach Tag, Woche, Monat, Jahr
- Fortschritt wird im Browser gespeichert (localStorage)
- Drei Designs: Dunkel, Hell, Funkgerät (die Szene färbt sich live mit um)

## Dateien

- `index.html` – Seitengerüst und alle Bereiche
- `css/style.css` – Aussehen der App und die drei Designs
- `css/scene.css` – Startseiten-Szene: Farben je Design, Ebenen, Bewegungen, Handy-Layout
- `js/morse.js` – Morsetabelle und Ton (Web Audio)
- `js/storage.js` – Speicherung (Fortschritt sowie Merker für Intro und Ton der Szene)
- `js/game.js` – Morse-Flug
- `js/scene-art.js` – alle Zeichnungen der Szene als SVG-Text (keine Bilddateien)
- `js/scene.js` – Logik der Szene: Scrollfortschritt, Intro, Objekte, Etiketten, Sprechblasen, Ton
- `js/app.js` – Bedienung und Trainingsmodi
- `sw.js` – Offline-Cache (PWA)

## Startseiten-Szene kurz erklärt

- Der Container `#scene` ist 500 % der Bildschirmhöhe hoch. Darin bleibt eine Bühne stehen (`position: sticky`), während man scrollt.
- `scene.js` rechnet aus der Scrollposition einen Fortschritt p (0–1) und schreibt daraus CSS-Variablen (z. B. `--k` für den Zoom). Die Bewegungen selbst baut `scene.css`, nur mit `transform` und `opacity`.
- Phasen: A (0–0,15) Außenansicht, B (bis 0,55) Zoom auf die Tür, C (bis 0,65) Tür öffnet sich, D (bis 1) Funkraum mit Herumgehen um die Morsetaste.
- Bei „Bewegung reduzieren“ im System erscheint direkt der Funkraum als feste Szene.
