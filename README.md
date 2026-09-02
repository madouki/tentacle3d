# Der Tag der Tentakel — 3D

Ein Point-&-Click-Adventure in drei Zeitaltern, gebaut mit [three.js](https://threejs.org).
Kein Build, kein Framework, keine Assets — die komplette Welt, alle Texturen, die Musik und
die Soundeffekte entstehen zur Laufzeit im Browser.

**▶ [Hier spielen](https://madd1in.github.io/tentacle3d/)**

---

## Worum es geht

Das lila Tentakel hat Dr. Freds Giftschlamm getrunken, Arme bekommen und die Weltherrschaft
angekündigt. Dr. Fred schickt Bernard, Hoagie und Laverne in drei Chron-o-Johns zurück in
der Zeit — doch die Maschine lief mit einem falschen Diamanten und ist explodiert.

Hoagie landet 200 Jahre in der Vergangenheit, Laverne 200 Jahre in der Zukunft, Bernard hängt
in der Gegenwart fest. Es ist immer dasselbe Haus: **Was einer in seiner Epoche anstellt,
finden die anderen in ihrer wieder.** Eine Eichel von 1776 ist im Jahr 2200 ein Baum. Eine
Flasche Wein wird zu Essig. Ein Klumpen Kohle wird zu einem Diamanten.

## Steuerung

| Eingabe | Wirkung |
|---|---|
| **Linksklick** auf ein Objekt | Sinnvollste Handlung ausführen |
| **Linksklick** auf den Boden | Dorthin laufen |
| **Rechtsklick** auf ein Objekt | Ansehen |
| Gegenstand im Inventar, dann Ziel | „Benutze … mit …" |
| **Rechtsklick** auf einen Gegenstand | Beschreibung |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | Figur wechseln |
| <kbd>H</kbd> | Tipp zum nächsten Schritt |
| <kbd>M</kbd> / <kbd>V</kbd> | Musik / Sprachausgabe an-aus |
| <kbd>Leertaste</kbd> / <kbd>Esc</kbd> | Text überspringen / Auswahl abbrechen |

Der **Chron-o-John** im Labor spült Gegenstände durch die Jahrhunderte zu den anderen beiden —
das ist der Kern jedes Rätsels.

## Was drinsteckt

- **12 Räume** — Hof, Küche, Labor und Dachboden, jeweils in 1776, in der Gegenwart und 2200
- **4 verzahnte Rätselketten** über alle drei Figuren hinweg
- **Prozedurale Musik**: Cembalo-Menuett für 1776, Lounge-Groove für die Gegenwart,
  Tentakel-Synth für 2200 — ein Web-Audio-Sequencer, keine Audiodateien
- **Sprachausgabe** über die Web Speech API, jede Figur mit eigener Stimmlage
- **Prozedurale Texturen** (Ziegel, Dielen, Gras, Beton, Zukunftspaneele) aus Canvas-Zeichnungen
- Cartoon-Konturen, weiche Schatten, Staubpartikel, Tonemapping

## Lokal starten

Ein statischer Webserver genügt — direkt per `file://` zu öffnen funktioniert nicht,
weil der Browser dann die JS-Module daneben nicht lädt.

```bash
python -m http.server 8123
```

Dann `http://localhost:8123` aufrufen. three.js kommt vom CDN, also ist beim ersten Start
eine Internetverbindung nötig.

## Aufbau

```
index.html        Gerüst und Startbildschirm
css/style.css     Minimal-Oberfläche
js/audio.js       Musik-Sequencer, Soundeffekte, Sprachausgabe
js/models.js      Texturen, Geometrie-Helfer, Figuren, Requisiten
js/world.js       Epochen, Gegenstände, alle Räume und ihre Hotspots
js/game.js        Zustand, Steuerung, Rätsellogik, Renderschleife
```

Ein neuer Raum ist ein Eintrag in `World.BUILDERS`, ein neues Rätsel eine Handvoll
`HS(...)`-Aufrufe mit `look` / `take` / `use` / `talk`.

### Debug-Konsole

Im Browser steht `DOTT` bereit:

```js
DOTT.help()              // alle Befehle
DOTT.state()             // Figur, Raum, Flags, Inventare
DOTT.spots()             // Hotspots im aktuellen Raum
DOTT.go('attic')         // Raum wechseln
DOTT.who('laverne')      // Figur wechseln
DOTT.give('diamond')     // Gegenstand ins Inventar
DOTT.act('Eckstein')     // Hotspot auslösen
```

## Bekannte Grenzen

Die Wegfindung ist bewusst einfach: Figuren laufen geradlinig zum Zielpunkt und werden nur
auf die Raumgrenzen begrenzt — sie laufen also durch Möbel hindurch. Für echte
Hindernisumgehung bräuchte es ein Walkbox-System.

## Rechtliches

Nicht-kommerzielles Fanprojekt, inspiriert von *Day of the Tentacle* (LucasArts, 1993).
Es enthält **keine Originalgrafiken, -texte, -musik oder -daten** aus dem Spiel — Code und
Inhalte sind vollständig neu geschrieben, Story und Rätsel sind eigenständig. Keine
Verbindung zu und keine Billigung durch Lucasfilm, LucasArts oder Disney. Alle Marken
gehören ihren jeweiligen Inhabern.

Der Code steht unter der MIT-Lizenz (siehe `LICENSE`).
