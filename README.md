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
| <kbd>C</kbd> | Chron-o-John von überall öffnen |
| <kbd>T</kbd> | Texttempo umschalten (bis "nur weiterklicken") |
| <kbd>F</kbd> | Vollbild |
| <kbd>Leertaste</kbd> / <kbd>Esc</kbd> | Text überspringen / Auswahl abbrechen |

Das Spiel startet direkt im Vollbild. Der **Chron-o-John** im Labor spült Gegenstände durch
die Jahrhunderte zu den anderen beiden — das ist der Kern jedes Rätsels. Der Knopf unten
rechts (oder <kbd>C</kbd>) öffnet ihn von jedem Raum aus; steht die Figur woanders, geht sie
zuerst ins Labor. Im Panel wählt man Gegenstand und Empfänger und spült in einem Zug.

Mit einigen Figuren lässt sich **richtig reden**: Der Gründervater, das Wach-Tentakel und das
lila Tentakel haben Antwortbäume, die sich je nach Spielstand ändern. Antworten wählt man per
Klick oder Zifferntaste.

## Was drinsteckt

- **15 Räume** — Hof, Küche, Labor, Dachboden und Keller, jeweils in 1776, in der Gegenwart
  und 2200
- **Fünf verzahnte Rätselketten** über alle drei Figuren hinweg, eine davon optional
- **Zwölf versteckte Anspielungen** auf andere Spiele und Filme. Wer eine findet, bekommt
  eine Meldung; am Ende wird gezählt.
- **Prozedurale Musik**: ein eigenes Stück je Epoche aus bis zu vier Sektionen, die in
  wechselnder Reihenfolge laufen — Cembalo-Menuett mit Kanon-Teil für 1776, Lounge-Groove
  mit Schlagzeug und Zwischenspiel für die Gegenwart, Sägezahn-Synth in c-Moll für 2200.
  Dazu ein eigenes Titelthema, ein Abspannstück in Dur, weiche Übergänge beim
  Epochenwechsel und automatisches Absenken, sobald jemand spricht.
- **Raumklang**: Ein Filter passt die Musik dem Schauplatz an — im Keller dumpf, auf dem
  Dachboden gedämpft, im Hof offen.
- **Sprachausgabe** über die Web Speech API — jede Figur mit eigener Stimme, Tonhöhe und
  Sprechtempo. Untertitel laufen synchron mit und lassen sich einzeln abschalten.
- **Vier Textgeschwindigkeiten** (<kbd>T</kbd>): gemütlich, normal, zügig — oder
  "nur weiterklicken", dann wartet jede Zeile auf dich. Nach dem Ende der Sprachausgabe
  hängt immer eine Nachlesezeit dran, weil Stimmen schneller sind als Augen.
- **Hintergrundkulisse je Schauplatz**: Vogelrufe im Hof, Knistern an der Feuerstelle von
  1776, Tropfen im Keller, Maschinensummen im Labor, elektrisches Zirpen in der Zukunft.
- **Prozedurale Texturen** (Ziegel, Dielen, Gras, Beton, Zukunftspaneele) aus
  Canvas-Zeichnungen, Cartoon-Konturen, Kontaktschatten, weiche Schatten, sichtbare
  Lichtbahnen mit tanzendem Staub, Glühwürmchen und Ascheflocken, ziehende Wolken,
  kreisende Vögel, blinzelnde Figuren, Blenden beim Raumwechsel
- **Hervorhebung beim Überfahren**: Anklickbares leuchtet leicht auf, statt nur oben
  benannt zu werden

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
in jedem Fall, und mit <kbd>T</kbd> lässt sich ihr Tempo bis zum manuellen Weiterklicken
verlangsamen.

## Rechtliches

Nicht-kommerzielles Fanprojekt, inspiriert von *Day of the Tentacle* (LucasArts, 1993).
Es enthält **keine Originalgrafiken, -texte, -musik oder -daten** aus dem Spiel — Code und
Inhalte sind vollständig neu geschrieben, Story und Rätsel sind eigenständig. Die
versteckten Anspielungen sind kurze, eigene Formulierungen und Nachbauten im Sinne einer
Hommage. Keine Verbindung zu und keine Billigung durch Lucasfilm, LucasArts, Disney oder
andere Rechteinhaber. Alle Marken gehören ihren jeweiligen Inhabern.

Der Code steht unter der MIT-Lizenz (siehe `LICENSE`).
