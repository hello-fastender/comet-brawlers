# Comet Brawlers: Erkenntnisse aus Captain Commando

Stand 2026-10-02. Dieses Dokument fasst zusammen, was die Analyse von
Captain Commando (Arcade, Fassung „World 911202“, MAME-Set `captcomm`) für
Comet Brawlers ergeben hat, und legt fest, wie wir die Ergebnisse nutzen.
Einzelheiten und Belege stehen in den verlinkten Dateien.

## Haltung: inspiriert, kein Nachbau

Entscheidung vom 2026-10-02: Comet Brawlers ist von Captain Commando
inspiriert, soll sich aber nicht 1:1 so spielen. Daraus folgt:

- **Kampfgefühl der Spielfigur**: übernehmen wir nach Zahlen. Das sind die
  gesicherten Werte in `docs/mechanik.md`. Weichen wir bewusst davon ab,
  steht die Abweichung dort.
- **Gegner, Stages, Gegenstände, Spielablauf**: entwerfen wir selbst. Das
  Original liefert Richtwerte und Vorbilder (siehe unten), keine Vorgaben.
- **Grafik, Figuren, Namen, Geschichte, Sound**: eigene. Die Aufnahmen
  unter `research/captcomm/grafik/` dienen als Referenz für Größen, Timing
  und Aufbau.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `docs/mechanik.md` | verbindliche Zahlenwerte für das Spiel, nur gesicherte Messungen |
| `docs/erkenntnisse.md` | dieses Dokument: Überblick, Erkenntnisse, Richtwerte, offene Punkte |
| `research/captcomm/notes.md` | Methode, alle Messungen mit Status und Belegen, Speicheradressen |
| `research/captcomm/grafik/README.md` | Stages, Spielfiguren und Gegner mit Bildern, Kennwerten und Animationsdauern |
| `research/captcomm/logs/` | Belege der Messungen (CSV) |
| `research/captcomm/scripts/` | MAME-Szenarien und Auswertungen; damit lassen sich alle Belege und Bilder neu erzeugen |

## Stand der Analyse

Kennzeichnung wie in `research/captcomm/notes.md`: **gesichert** heißt in
mehreren Läufen reproduziert und mit Skript im Repo belegt; **Workflow**
heißt von mehreren Agenten unabhängig gemessen und gegengeprüft, aber ohne
Skript im Repo; **beschrieben** heißt aus Aufnahmen beschrieben und nur
stichprobenweise nachgemessen; **offen** heißt nicht untersucht.

| Bereich | Stand |
|---|---|
| Steuerung der Spielfigur (Captain Commando): Laufen, Sprung, Schlagkette, Sprungangriff, Griff, Wurf, Umgeworfen werden, Schutz nach Treffern | gesichert, in `mechanik.md` |
| Sprint und Sprintangriff | Workflow, Gegenprüfung ausstehend |
| Spezialangriff | Kosten und Schutz Workflow; Schaden und Reichweite offen |
| Die anderen drei Helden | Animationen aufgenommen; Schaden der Kette, Würfe und Spezialangriff Workflow |
| Schaden und Lebenspunkte der Gegner, Schwierigkeit (Rang) | Rang und Schaden des WOOKY gesichert, übrige Gegner Workflow |
| Aussehen, Animationen und Angriffe aller Gegner und Bosse | beschrieben |
| Trefferreaktion der Gegner (Dauer, Rückstoß je Schlag) | offen; Umwerfen und Aufstehen nur beschrieben |
| Verhalten der Gegner (Annähern, Angriffswahl, wie viele gleichzeitig angreifen) | offen |
| Aufbau der 9 Stages: Länge, Kamera, Sperren, Tiefe, Objekte, Wellen | beschrieben; je Stage 6 bis 9 Angaben gegengeprüft |
| Gegenstände (Essen, Waffen) und Fahrzeuge | beschrieben, Wirkung kaum gemessen |
| Titel, Figurenwahl, Anzeigeleiste, Punkte, Leben, Continue | offen |
| Mehrspieler | offen |
| Sound | nicht Teil der Analyse |

## Was das Kampfgefühl ausmacht

Die wichtigsten Erkenntnisse zur Spielfigur, alle gesichert. Die genauen
Werte und Zeitfenster stehen in `mechanik.md`.

- **Direkte Steuerung**: Das Spiel reagiert einen Frame nach der Eingabe.
  Die Figur läuft ohne Anlauf und Abbremsen und dreht ohne Verzögerung um
  (1,75 px/Frame seitlich, 1,0 px/Frame in der Tiefe).
- **Kurze, klare Schlagkette**: vier Schläge mit 3, 4, 5 und 10 LP. Der
  vierte wirft den Gegner immer um. Der nächste Schlag wird nur in einem
  Fenster von 16 Frames angenommen und nicht gepuffert. Die Kette verlangt
  also einen Rhythmus, Dauerdrücken reicht nicht.
- **Wucht durch Trefferstopp**: Bei jedem Treffer steht die Animation des
  Angreifers 7 Frames still.
- **Positionieren in der Tiefe**: Die Reichweite nach vorn wächst mit der
  Kette (85, 87, 91, 100 px), die Tiefe muss aber auf etwa 12 px stimmen.
  Wer in der Tiefe danebensteht, trifft nicht.
- **Werkzeuge gegen Gruppen**: Griff durch Hineinlaufen (bis 39 px vorn,
  10 px Tiefe), Wurf mit 14 LP. Der geworfene Gegner fliegt etwa 185 px
  weit und wirft andere Gegner auf seiner Bahn um. Die meisten
  Sprungangriffe (7 LP, senkrecht 12 LP) werfen ebenfalls um.
- **Notausgang mit Preis**: Der Spezialangriff (Angriff und Sprung
  gleichzeitig) schützt die Figur und kostet 9 LP, aber nur, wenn er
  trifft (Workflow).
- **Fairness**: 27 Frames Schutz nach einem Treffer, 35 Frames nach dem
  Aufstehen. Umgeworfen liegt die Figur 121 Frames, schnelles Drücken
  verkürzt das auf etwa 90. Treffen sich Figur und Gegner im selben Frame,
  gewinnt die Figur. Die Figur stirbt erst unter 0 LP (beides Workflow).
- **Verhältnis von Schaden und Lebenspunkten**: Die Figur hat 72 LP,
  normale Gegner treffen mit 5 bis 10 LP. Sie hält also 8 bis 15 Treffer
  aus. Ein schwacher Gegner (16 LP) fällt mit einer vollen Kette (22 LP).
- **Schwierigkeit passt sich an**: Ein Rang von 7 bis 24 steigt mit der
  Spielzeit (alle 600 Frames um 1, Start bei 9) und sinkt bei jedem Tod der
  Figur um 3. Schaden und Lebenspunkte später erscheinender Gegner hängen
  davon ab.

## Spielfiguren

Alle vier Helden bewegen sich gleich: gleiche Lauf- und
Sprintgeschwindigkeit, gleicher Sprung. Sie unterscheiden sich nur in
Aussehen, Animationen, Angriffen und Würfen. Werte der drei Helden außer
Captain Commando stammen aus dem Workflow.

| Held | Umriss im Stand (mit Schatten) | Kette (LP je Stufe) | Wurf | Spezialangriff |
|---|---|---|---|---|
| Captain Commando | 57 × 76 px | 3 / 4 / 5 / 10 | 14 LP, etwa 185 px | 50 Frames, Schlag auf den Boden mit Blitzen nach beiden Seiten |
| Mack the Knife | 73 × 83 px | 3 / 4 / 5 / 8 | 14 LP, etwa 183 px | 60 Frames, Drehung auf der Stelle |
| Ginzu the Ninja | 36 × 75 px | 3 / 4 / 5 / 9 | 12 LP, etwa 181 px; runter + Angriff: eigener Wurf mit 14 LP | 41 Frames, Sprung mit Sternblitz und Rauch |
| Baby Head | 61 × 71 px | 6 / 6 / 6 / 6 | 12 LP, etwa 208 px; Sprung mit dem Gegner und Rammen in den Boden: 16 LP | 46 Frames, Rakete mit Feuerball |

Für Comet Brawlers heißt das: Unterschiedliche Helden lassen sich über
Angriffe und Würfe gestalten, ohne die Bewegung anzufassen. Die Messwerte
in `mechanik.md` gelten dann für alle.

## Gegner als Vorbild

Gegnerverhalten und Wellen entwerfen wir selbst. Als Vorbild dienen die
Rollen, die das Original verwendet (beschrieben, Einzelheiten in
`research/captcomm/grafik/README.md`):

| Rolle | Beispiel im Original | Kennzeichen |
|---|---|---|
| Nahkämpfer | WOOKY (16–36 LP), EDDY (30–42 LP) | Schlagserien, einzelne Schläge werfen die Figur um; WOOKY geht so schnell wie die Figur (1,75 px/Frame) |
| Schneller Messerkämpfer | SKIP (34–46 LP) | rennt 2,5 px/Frame, Messerwurf (4 px/Frame), Ausfallstich |
| Fernkämpfer | DICK (16–28 LP) | hält 100 bis 140 px Abstand, Pistolensalven oder Raketen; seine Waffe bleibt als Gegenstand liegen |
| Gegner mit Flächenangriff | CAROL (Elektroschock bis etwa 90 px), MARBIN (Flammen) | zwingen die Figur auf Abstand |
| Schwerer Gegner | MARDIA (85 LP), Mech mit Fahrer (85 LP) | viel LP und große Reichweite (Schleimspucke bzw. Armschlag um 90 px); MARDIA geht langsam (1,2 px/Frame) |
| Boss | DOLG (100 LP) | Super-Armor: Ketten, die ihn nicht umwerfen, bricht er mit einem Stoß ab, und seine LP springen zurück; nur Ketten mit Umwerfen zählen. Greift eine passive Figur alle 170 bis 200 Frames an (Ansturm, dreifacher Armschwung, Sprung-Körperpresse, Griff mit Wurf). Fällt er, brechen alle übrigen Gegner zusammen |

Weitere Beobachtungen:

- **Wiederverwendung**: Die normalen Gegner aller 9 Stages verteilen sich
  auf gut ein Dutzend Typkennungen. Derselbe Typ kehrt in mehreren Stages
  wieder, oft in anderer Farbe, unter anderem Namen und mit anderen
  Lebenspunkten. Dazu kommt je Stage ein Boss.
- **Schaden der Gegner**: Die Gegner, die zu Beginn von Stage 1 stehen,
  machen festen Schaden (WOOKY 5, EDDY 6 LP). Später erscheinende machen
  je nach Rang 7 bis 13 LP, Raketen bis 15 LP, der Boss DOLG 9 bis 22 LP
  je Angriff.
- **Gleiches Tempo**: Der WOOKY läuft so schnell wie die Figur. Weglaufen
  hilft also nicht, die Figur muss sich stellen oder springen.

## Stages als Vorbild

Die 9 Stages folgen einem gemeinsamen Muster (beschrieben, Einzelheiten
je Stage in `research/captcomm/grafik/README.md`):

- **Kamera**: Sie scrollt nur nach rechts, der linke Bildrand wirkt als
  Wand. An Sperren hält sie an, bis die Welle besiegt ist. Stage 1 kommt
  ohne Sperre aus, spätere Stages haben bis zu sechs. Am Ende jeder Stage
  wartet eine Bossarena.
- **Länge**: Ohne Kämpfe dauert eine Stage etwa 17 bis 56 Sekunden reines
  Gehen. In Stage 1 legt die Kamera 1920 px zurück.
- **Abwechslung**: Abschnitte wechseln durch kurze Skriptszenen, zum
  Beispiel ein Sturz durch ein Bodenloch, eine Liftfahrt oder ein
  automatischer Lauf. Stage 5 ist eine Sonderstage: Die Figur fährt auf
  einem Hoverboard, das Bild scrollt automatisch (6 px/Frame), es gibt
  Hindernisse und einen Bosskampf mit 40 Sekunden Zeitlimit.
- **Tiefe**: Der begehbare Streifen ist in Stage 1 je nach Abschnitt 75
  bis 187 px tief. Hindernisse wie ein Polizeiwagen oder ein Tresen
  begrenzen ihn zusätzlich.
- **Ebenen**: Meist scrollt alles 1:1. Ferne Hintergründe laufen in
  einigen Stages mit halber bis achtel Geschwindigkeit.
  Einzelne Objekte (Säulen, Geländer) stehen vor den Figuren.
- **Gegenstände**: Fässer und Kisten geben Essen oder Waffen frei. Essen
  heilt, das Brathähnchen in Stage 1 vollständig. Waffen sind unter
  anderem Raketenwerfer, Laser, Maschinengewehr und Wurfsterne. Waffen von
  Gegnern bleiben liegen und lassen sich aufheben. In Stage 1 liegen
  Gegenstände etwa 700 Frames und blinken dann etwa 90 Frames, bevor sie
  verschwinden.
- **Fahrzeuge**: In Stage 1, 4 und 6 kommen Mechs mit Gegnern am Steuer.
  Nach dem Abwurf des Fahrers zeigt das Spiel „RIDE ON“; das Fahren selbst
  ist nicht untersucht.

## Hinweise für die eigene Grafik

- **Bildformat**: Das Original zeigt 384 × 224 Pixel bei 59,64 Hz. Alle
  Werte in `mechanik.md` gelten in diesen Pixeln und Frames.
- **Größe der Figuren**: Die Reichweiten sind Abstände zwischen den
  Positionen von Figur und Gegner, unabhängig vom Bild. Weichen unsere
  Figuren deutlich von der Größe des Originals ab (Helden 36 × 75 px bis
  73 × 83 px, die Gegner aus Stage 1 etwa 66 bis 71 px hoch, große Gegner
  und Bosse bis etwa 100 px), sehen die Reichweiten falsch aus. Dann
  skalieren wir die Reichweiten mit.
- **Timing der Animationen**: Die Dauern jeder Animationsstufe stehen in
  `research/captcomm/grafik/figuren/ablaeufe.csv` und
  `research/captcomm/grafik/gegner/ablaeufe.csv`. Meist sind es 4 bis 8
  Frames je Bild, zum Beispiel geht Captain Commando in 12 Bildern zu je
  4 Frames, WOOKY und EDDY in 8 Bildern zu je 4 Frames. Mit gleichen
  Dauern stimmt das Timing auch mit neuen Bildern.

## Übernehmen, Richtwert, selbst gestalten

| Thema | Umgang | Grundlage |
|---|---|---|
| Bewegung, Sprung, Schlagkette, Sprungangriff, Griff, Wurf, Umgeworfen werden, Schutzfenster | übernehmen | `mechanik.md` |
| Lebenspunkte der Figur, Schaden der Gegner, Rang | übernehmen als Ausgangswert, beim Testen anpassen | `mechanik.md` |
| Sprint, Sprintangriff, Spezialangriff | Richtwert | `research/captcomm/grafik/README.md` (Workflow) |
| Weitere Helden | selbst gestalten, Bewegung wie oben | Tabelle „Spielfiguren“ |
| Gegnertypen, Lebenspunkte, Angriffe | selbst gestalten nach den Rollen oben | `research/captcomm/grafik/README.md` |
| Gegnerverhalten, Wellen, Kamerasperren | selbst gestalten | Abschnitte „Gegner“ und „Stages als Vorbild“ |
| Gegenstände, Waffen, Fahrzeuge | selbst gestalten | Abschnitt „Stages als Vorbild“ |
| Titel, Figurenwahl, Anzeigeleiste, Punkte, Leben, Mehrspieler | selbst gestalten | – |
| Grafik, Animationen | eigene Bilder mit den Dauern des Originals als Richtwert | `ablaeufe.csv` |

## Offene Punkte

Da wir Gegner und Stages selbst entwerfen, ist weiteres Messen nur noch
dort nötig, wo es beim Gestalten hilft. In dieser Reihenfolge lohnt es
sich:

1. **Trefferreaktion der Gegner**: Dauer und Rückstoß je Kettenschlag,
   Aufstehen und Schutz danach. Ohne passende Werte hält die Kette nicht
   zusammen.
2. **Grobes Verhalten von WOOKY und EDDY**: Abstand beim Warten, Pausen
   zwischen Angriffen, wie viele Gegner gleichzeitig angreifen. Als
   Richtwert für unsere eigene Gegnerlogik.
3. **Spezialangriff und Sprint**: Schaden und Reichweite des
   Spezialangriffs messen, Sprint gegenprüfen.
4. **Gegenstände**: Heilwerte des Essens, Schaden und Munition der Waffen.

Weitere unsichere Einzelheiten stehen in `mechanik.md` unter „Nicht
übernommen“ und in `research/captcomm/grafik/README.md`.
