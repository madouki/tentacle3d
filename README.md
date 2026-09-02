# Der Tag der Tentakel — 3D

Ein Point-&-Click-Adventure in drei Zeitaltern, gebaut mit [three.js](https://threejs.org).
Kein Build, kein Framework, keine Asset-Dateien — die komplette Welt, alle Texturen, die
Musik, die Soundeffekte und die Sprachausgabe entstehen zur Laufzeit im Browser.

**▶ [Hier spielen](https://madd1in.github.io/tentacle3d/)**

---

## Worum es geht

Das lila Tentakel hat Dr. Freds Giftschlamm getrunken, Arme bekommen und die Weltherrschaft
angekündigt. Dr. Fred schickt Bernard, Hoagie und Laverne in drei Chron-o-Johns zurück in
der Zeit — doch die Maschine lief mit einem falschen Diamanten und ist explodiert.

Hoagie landet 200 Jahre in der Vergangenheit, Laverne 200 Jahre in der Zukunft, Bernard hängt
in der Gegenwart fest. Es ist immer dasselbe Haus: **Was einer in seiner Epoche anstellt,
finden die anderen in ihrer wieder.** Eine Eichel von 1776 ist im Jahr 2200 ein Baum, über
den man aufs Dach klettert. Eine Flasche Wein wird zu Essig. Ein Klumpen Kohle wird zum
Diamanten.

## Steuerung

| Eingabe | Wirkung |
|---|---|
| **Linksklick** auf ein Objekt | Sinnvollste Handlung ausführen |
| **Linksklick** auf den Boden | Dorthin laufen |
| **Rechtsklick** auf ein Objekt | Ansehen |
| Gegenstand im Inventar, dann Ziel | „Benutze … mit …" |
| **Rechtsklick** auf einen Gegenstand | Beschreibung |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | Figur wechseln |
| <kbd>H</kbd> | Tipp — einmal andeutend, zweimal im Klartext |
| <kbd>M</kbd> <kbd>V</kbd> <kbd>U</kbd> | Musik / Stimmen / Untertitel |
| <kbd>L</kbd> | Gesprächsprotokoll |
| <kbd>F</kbd> | Vollbild |
| <kbd>Leertaste</kbd> / <kbd>Esc</kbd> | Text überspringen / Auswahl abbrechen |

Das Spiel startet direkt im Vollbild. Der **Chron-o-John** im Labor spült Gegenstände durch
die Jahrhunderte zu den anderen beiden — das ist der Kern jedes Rätsels.

## Was drinsteckt

- **15 Räume** — Hof, Küche, Labor, Dachboden und Keller, jeweils in 1776, in der Gegenwart
  und 2200
- **Fünf verzahnte Rätselketten** über alle drei Figuren hinweg, eine davon optional
- **Zwölf versteckte Anspielungen** auf andere Spiele und Filme. Wer eine findet, bekommt
  eine Meldung; am Ende wird gezählt.
- **Prozedurale Musik**: ein eigenes Stück je Epoche, aufgebaut aus A-, B- und C-Sektionen,
  die in wechselnder Reihenfolge laufen — Cembalo-Menuett für 1776, Lounge-Groove mit
  Schlagzeug für die Gegenwart, Sägezahn-Synth in c-Moll für 2200. Dazu ein eigenes
  Titelthema, weiche Übergänge beim Epochenwechsel und automatisches Absenken, sobald
  jemand spricht.
- **Sprachausgabe** über die Web Speech API — jede Figur mit eigener Stimme, Tonhöhe und
  Sprechtempo. Untertitel laufen synchron mit und lassen sich einzeln abschalten.
- **Prozedurale Texturen** (Ziegel, Dielen, Gras, Beton, Zukunftspaneele) aus
  Canvas-Zeichnungen, Cartoon-Konturen, Kontaktschatten, weiche Schatten, Staubpartikel,
  ziehende Wolken, kreisende Vögel, blinzelnde Figuren, Blenden beim Raumwechsel

## Lokal starten

Ein statischer Webserver genügt — direkt per `file://` zu öffnen funktioniert nicht,
weil der Browser dann die JS-Dateien daneben nicht lädt.

```bash
python -m http.server 8123
```

Dann `http://localhost:8123` aufrufen. three.js kommt vom CDN, also ist beim ersten Start
eine Internetverbindung nötig.

## Aufbau

```
index.html        Gerüst, Startbildschirm, Overlays
css/style.css     Minimal-Oberfläche
js/audio.js       Musik-Sequencer, Soundeffekte, Sprachausgabe
js/models.js      Texturen, Geometrie-Helfer, Figuren, Requisiten
js/world.js       Epochen, Gegenstände, alle Räume und ihre Hotspots
js/game.js        Zustand, Steuerung, Rätsellogik, Tippsystem, Renderschleife
```

Ein neuer Raum ist ein Eintrag in `World.BUILDERS`, ein neues Rätsel eine Handvoll
`HS(...)`-Aufrufe mit `look` / `take` / `use` / `talk`. Eine neue Anspielung ist ein
Eintrag in `World.EGGS` — Raum, Epoche, Position, Modell und Text; verteilt wird sie
automatisch.

### Das Tippsystem

Die Tipps kommen nicht aus einer festen Reihenfolge, sondern aus einer Liste von Zielen in
`STEPS`. Jedes Ziel weiß, welche Figur zuständig ist (`who`), wann es erledigt ist (`done`)
und wann es überhaupt sinnvoll ist (`needs`). Der Tipp sucht die offenen Ziele, bevorzugt
eines für die gerade gespielte Figur und schlägt sonst den Figurenwechsel vor. Ziele, die
durch einen anderen Weg gegenstandslos geworden sind — etwa die Verkleidung, wenn die Wache
längst nie existiert hat — fallen automatisch heraus.

### Debug-Konsole

Im Browser steht `DOTT` bereit:

```js
DOTT.help()              // alle Befehle
DOTT.state()             // Figur, Raum, Flags, Inventare, gefundene Anspielungen
DOTT.spots()             // Hotspots im aktuellen Raum
DOTT.go('cellar')        // Raum wechseln
DOTT.who('laverne')      // Figur wechseln
DOTT.give('diamond')     // Gegenstand ins Inventar
DOTT.act('Eckstein')     // Hotspot auslösen
DOTT.hint()              // Tipp zeigen, offene Ziele zurückgeben
DOTT.eggs()              // gefundene Anspielungen
```

## Bekannte Grenzen

Die Wegfindung ist bewusst einfach: Figuren laufen geradlinig zum Zielpunkt und werden nur
auf die Raumgrenzen begrenzt — sie laufen also durch Möbel hindurch. Für echte
Hindernisumgehung bräuchte es ein Walkbox-System.

Die Sprachausgabe hängt an den Stimmen des Betriebssystems. Sind keine deutschen Stimmen
installiert, nimmt das Spiel die erstbeste — dann klingt es eigenwillig. Untertitel gibt es
in jedem Fall.

## Rechtliches

Nicht-kommerzielles Fanprojekt, inspiriert von *Day of the Tentacle* (LucasArts, 1993).
Es enthält **keine Originalgrafiken, -texte, -musik oder -daten** aus dem Spiel — Code und
Inhalte sind vollständig neu geschrieben, Story und Rätsel sind eigenständig. Die
versteckten Anspielungen sind kurze, eigene Formulierungen und Nachbauten im Sinne einer
Hommage. Keine Verbindung zu und keine Billigung durch Lucasfilm, LucasArts, Disney oder
andere Rechteinhaber. Alle Marken gehören ihren jeweiligen Inhabern.

Der Code steht unter der MIT-Lizenz (siehe `LICENSE`).
