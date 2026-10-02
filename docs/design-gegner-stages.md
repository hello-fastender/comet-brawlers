# Comet Brawlers: Gegner und Stages

Stand 2026-10-02, Entwurf. Dieses Dokument ergänzt `docs/design.md`
(Spielfigur, Helden, Rahmen) um Gegner, Bosse, Stages und Gegenstände.
Comet Brawlers ist von einem Arcade-Beat-'em-up von 1991 inspiriert, kein
Nachbau: Rollen und Zahlen des Vorbilds dienen als Richtwert, Figuren,
Namen und Schauplätze sind eigene. Welche Vorbilder hinter den
Arbeitsnamen stehen, steht nur in Abschnitt 10.

**Welt** wie in `docs/design.md`, Abschnitt 2 (Arbeitsannahme,
Entscheidung des Nutzers offen): Im Eis des Kometen Orrin liegt der
Frachthafen Perihel. Das Schweif-Syndikat hat ihn besetzt und will den
Kometen mit seinen Bahntriebwerken auf Kollisionskurs bringen. Fällt die
Wahl anders aus, ändern sich Schauplätze und Namen in den Abschnitten 4,
6 und 7, nicht die Zahlen.

**Einheiten** wie in `docs/mechanik.md`: Pixel des Bildes 384 × 224,
Frames bei 59,64 Hz, Abstände zwischen den Fußpunkten. LP heißt
Lebenspunkte; die Figur hat 72 LP.

| Kennzeichen | Bedeutung |
|---|---|
| gesichert | aus `docs/mechanik.md` oder einem Nachtrag in `research/captcomm/notes.md`, mit Skript im Repo belegt |
| unsicher | gemessen, aber nicht in allen Messungen gleich; beide Werte stehen dabei |
| Workflow | in `mechanik.md` oder `research/captcomm/notes.md` so gekennzeichnet: unabhängig gemessen und gegengeprüft, ohne Skript im Repo |
| beschrieben | aus Aufnahmen: `research/captcomm/grafik/README.md` (kurz G, mit der Stage des Vorbilds) oder `research/captcomm/grafik/gegner/ablaeufe.csv` (kurz A1 bis A9, Zuordnung in Abschnitt 10) |
| Vorschlag | eigener Wert, beim Testen anpassen |
| offen | auch nach den Messungen vom 2026-10-02 (Trefferreaktion, Verhalten, Reichweite der Gegnerangriffe, Spezialangriff und Sprint, Gegenstände) nicht bestimmt; der Grund steht dabei |

**Rangstufen.** Der Rang (7 bis 24, Start 9, +1 nach 409 Frames und dann
alle 600 Frames, −3 je Tod der Figur) bestimmt Schaden und LP später
erscheinender Gegner (mechanik.md, „Schaden der Gegner“). Die Tabellen
nutzen die gemessenen Schadensstufen: **I** Rang 7, **II** 8 bis 14,
**III** 15 bis 21, **IV** 22 bis 24. Die LP wachsen gleichmäßig von der
Untergrenze bei Rang 7 bis zur Obergrenze bei Rang 24 (Vorschlag,
design.md, Abschnitt 6); genannt ist der gerundete Wert bei Rang 7, 11, 18
und 23. „Startgegner“ stehen schon beim Start einer Stage und haben feste
Werte. Kehrt ein Typ in einer späteren Welle derselben Stage wieder,
bekommt er +2 LP, höchstens +4 (Vorschlag; im Vorbild +2 je Welle,
G Stage 3).

## 1. Gegnerrollen

Sechs Rollen mit je einem Grundtyp; weitere Typen je Rolle in Abschnitt
3. Umrisse: Breite × Höhe mit Schatten. Die Helden messen 36 bis 73 × 71
bis 83 px; weichen Figuren stark vom Vorbild ab, skalieren wir die
Reichweiten mit (erkenntnisse.md, „Hinweise für die eigene Grafik“).

### 1.1 Nahkämpfer leicht: Bolzer

Hafenschläger im Overall mit Magnetstiefeln, das Fußvolk des Syndikats.

| Merkmal | Wert | Herkunft |
|---|---|---|
| Aufgabe im Kampf | Grundgegner jeder Welle, Ziel der vollen Kette, Wurfgeschoss gegen andere | Vorschlag |
| LP | Startgegner 16: eine volle Kette (3 + 4 + 5 + 10 = 22) besiegt ihn. Später I / II / III / IV: 22 / 25 / 30 / 33 | 16 gesichert, Spanne 22–34 Workflow, Stufung Vorschlag |
| Schaden | Startgegner 5 je Treffer. Später I / II / III / IV: 7 / 8 / 9 / 10 | gesichert (Rang 7 und 9–12), sonst Workflow |
| Geschwindigkeit | 1,75 px/Frame, so schnell wie die Figur; Tiefe 0,875 px/Frame; rund ein Drittel der Gehframes (29 bis 41 %) schnell mit 2,25 × 1,125 px/Frame | gesichert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“); wonach er die Gehstufe wählt, ist offen |
| Angriffe | drei normale Schläge (Startup 9, 4 und 10 Frames ab Beginn der Angriffsanimation) und zwei Umwerfschläge (Startup 9 und 8; der zweite nur direkt nach dem ersten normalen Schlag), gesichert (notes.md, „Nachtrag: Reichweite der Gegnerangriffe“); davor je nach Rang 25 bis 5 Frames Kampfhaltung (notes.md, „Nachtrag: Verhalten der Nahkämpfer“). Trifft aus 46 px; Grenze in x: Er merkt sich beim Heranlaufen einen Zielabstand (höchstens 48 px) und trifft im ersten aktiven Frame, solange die Figur höchstens 32 px links und 31 px rechts vom Zielpunkt steht (je nach Blickrichtung 31 bzw. 32 px näher oder weiter) und nicht mehr als 3 bis 4 px hinter ihm, sonst bricht er ab (gesichert, notes.md, „Nachtrag: Reichweite der Gegnerangriffe“); Tiefe −10 bis +11 px; springende Figur bis 48 px Höhe | Workflow, sonst wie angegeben; 46 px: notes.md, „Szenarien“ |
| Umriss | 57 × 72 px (Vorbild etwa 67 px hoch, Box 57 × 73) | Vorschlag |

Verhalten: Der Bolzer läuft ohne Umweg auf die Figur zu und gleicht dabei
die Tiefe an. Er schlägt in Serien: vor einem Umwerf-Angriff 2 bis 13
normale Angriffe, meist 2 bis 5 (notes.md, „Nachtrag: Reichweite der Gegnerangriffe“). Nach einer Serie tritt er
zurück oder spottet und gibt der Figur so das Fenster für eine Kette.

### 1.2 Nahkämpfer schwer: Rammbock

Breitschultriger Schlepperfahrer mit Polsterweste.

| Merkmal | Wert | Herkunft |
|---|---|---|
| Aufgabe im Kampf | übersteht eine volle Kette (liegt danach mit 8 LP) und verlangt Wurf, Sprungangriff oder zweite Kette | gesichert (30 LP), Vorschlag |
| LP | Startgegner 30. Später I / II / III / IV: 32 / 34 / 38 / 41 | 30 gesichert, Spanne 32–42 Workflow |
| Schaden | Startgegner 6. Später I / II / III / IV: 8 / 9 / 10 / 11 | Workflow |
| Geschwindigkeit | 1,6 px/Frame (Vorbild 1,45 bis 1,9 je Stage) | Vorschlag |
| Angriffe | zwei normale Schläge (Startup 9 und 10 Frames) und zwei Umwerf-Angriffe: Umwerfschlag (Startup 9) und Sprungtritt (Startup 9, aktiv bis A+45 in der Luft, in den Aufnahmen als Sprungknie aus etwa 30 px), gesichert (notes.md, „Nachtrag: Reichweite der Gegnerangriffe“). Davor je nach Rang 25 bis 5 Frames Kampfhaltung (in den Aufnahmen eine Hocke von 14 bis 21 Frames); zwischen zwei Angriffen einer Serie 38 bis 90 Frames, bei Rang 10 bis 11 52 bis 84 (notes.md, „Nachtrag: Verhalten der Nahkämpfer“). Der Sprungtritt trifft eine springende Figur bis 50 px Höhe. Reichweite: Schläge wie beim Bolzer (Zielabstand höchstens 48 px, Abbruch außerhalb von 32 px links und 31 px rechts vom Zielpunkt), Tiefe −10 bis +11 px; Sprungtritt trifft im ersten aktiven Frame 0 bis 59 px vor ihm, Tiefe ±12 px, bricht nie ab (gesichert, notes.md, „Nachtrag: Reichweite der Gegnerangriffe“) | Workflow; beschrieben (A6, G Stage 1 und 8) |
| Umriss | 60 × 76 px (Vorbild 66 px hoch; größer als der Bolzer, damit die Rolle lesbar ist) | Vorschlag |

Verhalten: Der Rammbock kommt etwas langsamer als die Figur und kündigt
jeden Angriff mit einer deutlichen Hocke an. Er mischt kurze Schläge mit
einem Sprungtritt aus mittlerer Distanz, der eine fliehende Figur
einholt. Nach einem Umwerf-Angriff pausiert er länger als der Bolzer,
damit zwei Rammböcke nicht im Wechsel pausenlos drücken.

### 1.3 Schneller Messerkämpfer: Splitter

Flinker Eisschmuggler mit zwei Eismessern.

| Merkmal | Wert | Herkunft |
|---|---|---|
| Aufgabe im Kampf | bestraft Stehenbleiben und Abstand: rennt herein, wirft aus der Distanz | Vorschlag |
| LP | I / II / III / IV: 34 / 37 / 42 / 45 | Spanne 34–46 Workflow, Stufung Vorschlag |
| Schaden | Stich 7 / 8 / 9 / 10 (gemessen Rang 7: 7, 11: 8, 16: 9, 24: 10). Wurfmesser und Ausfallstich 10 / 11 / 12 / 13, beide werfen um | Stich gesichert und Workflow, Rest Workflow |
| Geschwindigkeit | Rennen 2,5 px/Frame, Gehen etwa 1,5 px/Frame | beschrieben |
| Angriffe | Messerhieb alle 37 Frames (25 Frames Hieb, 12 Pause); Ausfallstich 33 bis 34 Frames; Messerwurf 43 Frames, Messer 4 px/Frame in Höhe 56. Reichweiten: Stich (Startup 13 Frames) von 15 px hinter bis 108 px vor ihm, Tiefe ±12 px, bis 71 px Höhe; Ausfallstich (Startup 14) trifft bei 0 px und vorn mindestens 56 px, Tiefe bis +12 px (gesichert, notes.md, „Nachtrag: Reichweite der Gegnerangriffe“). Unsicher (nur Gegenprüfer): Stich je nach Blickrichtung der Figur 5 bis 8 px weiter, Ausfallstich trifft bei 100 px, nicht bei 110 px; Messerwurf offen, weil er in keinem Messlauf vorkam | beschrieben (G Stage 1, 2, 9) |
| Umriss | 62 × 77 px (Vorbild 71 px hoch) | Vorschlag |

Verhalten: Der Splitter rennt mit 2,5 px/Frame von der Seite herein,
schneller als die Figur, und bremst erst kurz vor ihr. Steht die Figur
weit weg, wirft er ein Messer, steht sie nah, sticht er in Serie. Nach
einem Angriff wechselt er die Seite, statt stehenzubleiben.

### 1.4 Fernkämpfer: Zünder

Hafenwächter in gestohlener Uniform, mit Bolzenpistole oder
Raketenwerfer.

| Merkmal | Wert | Herkunft |
|---|---|---|
| Aufgabe im Kampf | hält Abstand und zwingt die Figur, sich aus der Gruppe zu lösen; seine Waffe bleibt als Gegenstand liegen | beschrieben |
| LP | I / II / III / IV: 16 / 19 / 24 / 27 (Vorbild 16 bis 28) | beschrieben, Stufung Vorschlag |
| Schaden | Pistole 5 / 6 / 6 / 7 je Schuss, zwei Schüsse im Abstand von 17 Frames, der zweite wirft um. Rakete 12 / 13 / 14 / 15 | Workflow (5–7 und 12–15), Stufung Vorschlag |
| Geschwindigkeit | 1,75 px/Frame (Vorbild 1,6 bis 2,0) | beschrieben |
| Angriffe | Zielen 60 bis 120 Frames als Ankündigung, Schuss 17 Frames, Kugel 8 px/Frame; Rakete 4,5 bis 5 px/Frame, Explosion etwa 90 bis 95 Frames, verbrennt auch Gegner; Kolbenhieb 42 Frames, Schaden und Reichweite offen: Der Fernkämpfer erscheint im Vorbild erst in der Bossarena und schoss in den Messläufen nicht | beschrieben (G Stage 1, 6, 8) |
| Umriss | 64 × 72 px (Vorbild 68 px hoch) | Vorschlag |

Verhalten: Der Zünder sucht einen Platz 100 bis 140 px vor der Figur in
ihrer Tiefe und zielt sichtbar. Kommt sie näher, weicht er zurück, statt
zu schlagen; nur in einer Ecke setzt er den Kolben ein. Er zielt nur, wenn
er die Erlaubnis dazu hat (Abschnitt 2).

### 1.5 Flächenangreifer: Glimmer

Technikerin aus der Energieversorgung des Hafens, mit Ladungsstab.

| Merkmal | Wert | Herkunft |
|---|---|---|
| Aufgabe im Kampf | sperrt Raum: Entladungen zwingen die Figur auf Abstand oder in den Sprung, treffen auch andere Gegner | beschrieben |
| LP | I / II / III / IV: 30 / 34 / 40 / 44 (Vorbild 30, 35, 45); starke Farbvariante 55 bis 60; in Formationen 16 | beschrieben |
| Schaden | Vorbild 13 für Stoß und Entladung, Rang nicht gemessen. Vorschlag: Stoß 9 / 10 / 11 / 12, Entladung 10 / 11 / 12 / 13 | Vorschlag |
| Geschwindigkeit | 2,0 px/Frame (Vorbild 1,1 bis 3,0 je Stage) | Vorschlag |
| Angriffe | Stabstoß etwa 30 Frames; Entladung aus der Hocke bis etwa 90 px um sie herum; Sprungtritt 6 + 34 Frames, Höhe 75, etwa 117 px weit. Startup offen: gemessen sind nur die Gegner der ersten Stage des Vorbilds | beschrieben (G Stage 2, 6) |
| Umriss | 56 × 80 px (Vorbild 74 bis 97 px hoch) | Vorschlag |

Verhalten: Glimmer hält mittlere Distanz und kommt mit dem Sprungtritt
heran. Stehen weitere Gegner um die Figur, entlädt sie sich und nimmt
eigene Leute in Kauf. Nach der Entladung steht sie still; das ist das
Fenster für Wurf oder Kette.

### 1.6 Schwerer Gegner: Koloss

Riesiger Kranführer mit Bleischürze.

| Merkmal | Wert | Herkunft |
|---|---|---|
| Aufgabe im Kampf | Ankerpunkt einer Welle: langsam, viel LP, große Reichweite; verlangt Würfe und Sprungangriffe | Vorschlag |
| LP | I / II / III / IV: 85 / 89 / 95 / 99 (Vorbild 85, später 95 und 100) | beschrieben |
| Schaden | Vorbild 9 bis 13. Vorschlag: Körperstoß 9 / 10 / 12 / 13, Spucke 10 / 11 / 12 / 13 | Vorschlag |
| Geschwindigkeit | 1,2 px/Frame (Vorbild 1,0 bis 1,2) | beschrieben |
| Angriffe | Körperstoß 49 Frames mit 15 Frames Ankündigung; Schlackespucke im Bogen etwa 90 px, die Lache bleibt etwa 40 Frames; großer Sprung 41 Frames (Höhe 64, etwa 115 px); Griff mit Wurf. Reichweiten offen: gemessen sind nur die Gegner der ersten Stage des Vorbilds | beschrieben (G Stage 3, 6, 7) |
| Umriss | 70 × 96 px (Vorbild 90 bis 96 px hoch) | Vorschlag |

Verhalten: Der Koloss geht stur auf die Figur zu und reagiert kürzer auf
Kettenschläge als leichte Gegner (Vorschlag; gemessen sind nur die
Nahkämpfer, 23 Frames, notes.md, „Nachtrag: Trefferreaktion der Gegner“).
Auf mittlere Distanz spuckt er und legt damit eine Lache in den Weg. Kommt
die Figur nah heran, packt er sie oder springt über sie hinweg auf die
andere Seite.

## 2. Gegnerverhalten, Grundmodell

Alle Gegner nutzen dasselbe Zustandsmodell; die Rollen unterscheiden sich
nur in den Werten. Aktivierung, Abstand und Rhythmus im Vorbild misst M2.

| Zustand | Was der Gegner tut | Übergang | Richtwert | Herkunft |
|---|---|---|---|---|
| warten | steht platziert, aber ruht: versteckt, hockend, unter einer Luke, außerhalb des Bildes | Auslöser der Welle (Kamera-x, Tod eines Gegners, LP des Bosses) | Im Vorbild liegen Gegner schon ab Stage-Beginn weit voraus und unsichtbar bereit | beschrieben; Regel gesichert: aktiv nur von 64 px links bis 63 px rechts außerhalb des Bildes, wartende wachen auf, sobald ihr Fußpunkt 1 px im Bild liegt (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) |
| aktivieren | Auftritt: Einlauf vom Rand, Ausstieg aus einer Luke (47 Frames), Fall von oben (29 bis 35 Frames aus Höhe 240), Ausbruch aus einer Kiste | Ende des Auftritts | Auslöser ist die Kamera, nicht der Abstand zur Figur (x − Kamera ≤ 383); kampffähig nach 16 Frames (versteckt), 49 (leichter Nahkämpfer hockend), 69 (schwerer hockend), gesichert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | beschrieben (G Stage 1, 6, 7, 9) |
| annähern | geht mit Typgeschwindigkeit zu einem Haltepunkt seitlich der Figur | Haltepunkt erreicht | Anhalten 46 bis 48 px vor der Figur nach normalem, 55 bis 56 px nach schnellem Gehen; Abwarten auf etwa 121 bis 128 px (Median je Lauf), gesichert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“); Gehbefehle zu 40 Frames unsicher (nur Messagent); Fernkämpfer 100 bis 140 px | beschrieben |
| Tiefe angleichen | verschiebt sich in der Tiefe, bis der Abstand −10 bis +11 px beträgt | Tiefe stimmt und Erlaubnis liegt vor | Treffer nur bei Tiefenabstand −10 bis +11 px; Tiefe 0,875 px/Frame (schnell 1,125), diagonal; Stopp bei Tiefenabstand −10 bis +11 px, gesichert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | Workflow |
| angreifen | Ankündigung, aktive Frames, Nachlauf; wählt zwischen normalem Angriff und Umwerf-Angriff | Ende des Angriffs | Startup 4 bis 10 Frames ab Beginn der Angriffsanimation (notes.md, „Nachtrag: Reichweite der Gegnerangriffe“); 0 bis 3 normale Treffer zwischen zwei Umwerf-Angriffen (Workflow) | gesichert, Workflow |
| Pause | hält Abstand, spottet (42 Frames) oder steht; gibt die Erlaubnis zurück | Pausenzeit abgelaufen | Vorbild: Angriffe etwa alle 37 (Messer) bis 64 Frames (leichter Nahkämpfer), Pausen 20 bis 78 Frames. Gemessen: vor jedem Angriff 29 − 4 · ⌊Rang/4⌋ Frames (25 bei Rang 7 bis 9 bei Rang 20 bis 23), zwischen zwei Angriffen einer Serie 38 bis 90 Frames, gesichert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“); unsicher: 5 Frames bei Rang 24 und Spott oder Abwarten 30 bis 140 Frames im Raster 30 (nur Messagent); Pause zwischen zwei Serien 45 bis 3562 Frames, Median unsicher (je Laufgruppe 149 bis 404) | beschrieben (G Stage 1, 4, 9) |
| Seitenwechsel | läuft im Bogen mit Tiefenversatz hinter die Figur | andere Seite erreicht | Nach dem Umwerfen wechselt der leichte Nahkämpfer in 14 von 75, der schwere in 24 von 55 Fällen die Seite; zwischen zwei Angriffen selten und fast nur, während die Figur liegt; unsicher (nur Messagent, dritte Messung 18 von 64 bzw. 4 von 17; notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | Vorschlag |

Die Reaktionszustände (getroffen, liegen, aufstehen, gegriffen, Tod)
stehen unten.

**Wie viele Gegner gleichzeitig angreifen** (Vorschlag). Im Vorbild greift
meist einer an; zwei gleichzeitig in 0,6 bis 9 % der Frames, mehr als zwei
in höchstens 3 %, Angriffe kommen von beiden Seiten (gesichert, notes.md,
„Nachtrag: Verhalten der Nahkämpfer“). Eine Angriffserlaubnis regelt den
Druck:

- Höchstens zwei Gegner sind gleichzeitig im Zustand „angreifen“; in Stage
  1 und 2 höchstens einer je Seite der Figur.
- Höchstens ein Fernkämpfer zielt gleichzeitig, ab Stage 6 zwei (im
  Vorbild feuern in späten Stages Paare gleichzeitig, G Stage 8).
- In den Schutzfenstern der Figur (27 Frames nach einem Treffer, 35 nach
  dem Aufstehen, mechanik.md, „Unverwundbarkeit“) gibt es keine
  Erlaubnis; Gegner warten. Im Vorbild greifen sie im Schutzfenster an,
  ihre Treffer werden ignoriert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“).
- Normale Gegner greifen eine liegende Figur nicht an.
- Gegner ohne Erlaubnis halten 100 bis 140 px Abstand oder wechseln die
  Seite.

Begründung: Die Figur hält 8 bis 15 Treffer aus (erkenntnisse.md); mit
zwei Angreifern bleibt eine Welle aus fünf Gegnern lösbar.

**Trefferreaktion der Gegner** (Platzhalter bis M1). Bekannt sind die
Abläufe des Umwerfens und die Flugweiten; die Dauern, die die Kette
zusammenhalten, fehlen noch.

| Größe | Vorbild | Comet Brawlers | Status |
|---|---|---|---|
| Trefferstopp des Getroffenen | Angreifer steht 7 Frames still (gesichert) | Getroffener steht ebenso still | offen: Die Messung weist die Reaktion als Ganzes aus (23 Frames, Zittern ab h+9), keinen eigenen Stillstand des Getroffenen |
| Hitstun je Kettenstufe 1 bis 3 | Trefferbild wechselt etwa alle 9 Frames (A5, A9) | so lang, dass der nächste Druck im 16-Frame-Fenster sicher trifft | gesichert: 23 Frames (h bis h+22), gleich für Stufe 1 bis 3 und beide Nahkämpfer; ein Treffer in der Reaktion startet sie neu. Danach steht der Gegner bis zum Ausholen frühestens in h+45; deshalb hält die Kette (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| Rückstoß je Kettenstufe 1 bis 3 | keiner (siehe Status) | höchstens 2 / 4 / 9 px, so viel wie die Reichweite der nächsten Stufe wächst (85 → 87 → 91 → 100 px) | Vorschlag; im Vorbild gesichert kein Rückstoß, nur ein Zittern um ±3, ±2, ±1 px in h+9 bis h+14 (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| Treffer von hinten | eigene Trefferanimation | Rückstoß in Schlagrichtung | offen: Treffer von hinten wurden nicht gemessen |
| Umwerfen | Stufe 4, Sprungangriffe, Wurf, dritter Kniestoß; Gegner fliegt nach Sprungangriff 135 px (notes.md, „Nachtrag: Trefferreaktion der Gegner“), Wurf 184–185 px, Kniestoß etwa 165 px, Spezialangriff im Griff etwa 158 px | übernehmen | gesichert, wo nicht anders vermerkt |
| Ablauf Umwerfen | 2 Frames Treffer, 8 Stillstand, 37 Flug, 9 Aufprall (A3, A7) | übernehmen | beschrieben |
| Liegen | 33 Frames (leichter), 41 Frames (schwerer Nahkämpfer) nach dem Sprungtritt (A3, A7); andere Typen 27 bis 44 | Platzhalter 33 bzw. 41 | gesichert: leichter Nahkämpfer 32 Frames (nach einem Wurf 16), schwerer 16 bis 44 Frames (Auswahl offen, vermutlich zufällig); Ruhe vorher K+55, nach Kniestoß K+58, nach Wurf K+70 (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| Aufstehen | 8 / 8 / 1 Frames (A3, A7); vom Treffer bis zur Haltung bei beiden 126 Frames | Platzhalter 17 Frames | gesichert: 18 Frames; wieder handlungsfähig (G) beim leichten Nahkämpfer K+105 nach Tritt oder Sprungangriff, beim schweren K+89 bis K+117 (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| Schutz nach dem Aufstehen | keiner (siehe Status) | Vorschlag, bewusste Abweichung vom Vorbild: kurz unverwundbar, damit ein aufstehender Gegner nicht sofort wieder in eine Kette gerät (offene Entscheidung 15) | im Vorbild gesichert: kein Schutz; vom Umwerfen bis G−1 kein Schaden, ab G sofort verwundbar und greifbar (nach einem Wurf ab G+1) (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| am Boden treffbar | nein (siehe Status) | nein | gesichert: nein, weder im Flug noch liegend noch beim Aufstehen (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| gegriffen | 60 Frames bis zum Losreißen, jeder Kniestoß setzt neu (gesichert) | übernehmen | gesichert |
| benommen | Schleife 4 × 5 bzw. 4 × 6 Frames (G Stage 3, 7) | nach Wurf gegen eine Wand | offen: gemessen sind nur Trefferreaktion, Umwerfen und Tod |
| Tod | Bild: 84 Frames bis zum Ende des Blinkens (A5), Stage-Tabelle 86 bis 90. Gemessen: Slot frei nach 79 Frames, nach Stufe 2 nach 111, nach einem Wurf nach 101 (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | übernehmen | Bild beschrieben, Slot gesichert |

## 3. Wiederverwendung

Zwölf Typen reichen für acht Stages, wenn ältere Typen in neuer Farbe und
mit höheren LP zurückkehren. Das Vorbild macht es ebenso: Seine normalen
Gegner verteilen sich auf gut ein Dutzend Typen, oft in anderer Farbe und
mit anderen LP (erkenntnisse.md). Eine Farbvariante ist ein Palettentausch
ohne neue Bilder; sie darf LP, Schaden und Angriffswahl ändern, nicht die
Bewegungen. Neue Typen kommen in Stage 1 (fünf), 2 und 3 (je drei) und 6
(einer); Stage 4, 7 und 8 leben von Varianten, Stage 5 setzt einen Typ
auf Gleiter.

| Nr. | Typ | Rolle | Farbvarianten | LP |
|---|---|---|---|---|
| 1 | Bolzer | Nahkämpfer leicht | A Grau-Orange (Hafen), B Rost (Labor, Schacht), C Weiß (Schiffscrew) | Startgegner 16, sonst 22–34 nach Rang |
| 2 | Rammbock | Nahkämpfer schwer | A Magenta, B Petrol | Startgegner 30, sonst 32–42 |
| 3 | Ringer | Nahkämpfer schwer, Griffe | A Grau, B Rot (stärker) | A 28–34, B 48–54 |
| 4 | Splitter | schneller Messerkämpfer | A Gelb, B Rot | 34–46 |
| 5 | Schweifer | schneller Akrobat mit Salto und Wurfstern | A Rot (Salto), B Blau (Wurfstern), C Grün (beides) | 26–42; auf Gleitern 8 |
| 6 | Zünder | Fernkämpfer | A Pistole, B Raketenwerfer | 16–28 |
| 7 | Glimmer | Flächenangreifer, Strom | A Lila, B Petrol (stärker) | A 30–45, B 55–60, Formation 16 |
| 8 | Fackel | Flächenangreifer, Flamme, auch als Trupp | A Braun, B Grau (Truppführerin) | 44–56, Trupp 16 |
| 9 | Koloss | schwerer Gegner | A Orange | 85–100 |
| 10 | Klingenwache | schwerer Gegner, lange Klinge | A Bronze | 55–60 |
| 11 | Greifer | schwerer Gegner, Teleskopklaue | A Silber | 70, Formation 16 |
| 12 | Lastläufer | schwerer Gegner, Fahrzeug mit Bolzer am Steuer | A Oliv, B Blau (Gefrierstrahl) | 85 |

Die Spannen der Typen 3, 5, 8, 10 bis 12 sind beschrieben (G), die
Stufung nach Rang ist Vorschlag.

Typ × Stage: Variante und Anzahl, „–“ heißt nicht vorhanden.

| Typ | 1 Frachtkai | 2 Eisbergwerk | 3 Kuppelgärten | 4 Klonlabor | 5 Schweifjagd | 6 Schmelzwerk | 7 Antriebsschacht | 8 Flaggschiff |
|---|---|---|---|---|---|---|---|---|
| Bolzer | A 7 | – | – | B 13 | – | A 7 | B 9 | C 8 |
| Rammbock | A 5 | – | – | – | – | B 5 | A 10 | A 3, B 3 |
| Ringer | – | A 6, B 2 | – | – | – | – | – | A 3, B 1 |
| Splitter | A 1 | A 2, B 3 | A 2, B 4 | – | – | – | – | A 4 |
| Schweifer | – | – | A 6, B 3, C 3 | – | A 30, B 5, C 24 | – | A 7, C 2 | – |
| Zünder | A 1, B 1 | – | – | B 6 | – | B 5 | A 8, B 6 | B 6 |
| Glimmer | – | A 2, B 1 | A 2 | – | – | A 4 | – | A 16 (12 in Formation) |
| Fackel | – | A 2 + Trupps | A 1 | – | – | A 1 + Trupps | – | A 4, B 4 (Formation) |
| Koloss | – | – | A 1 | – | – | A 1 | A 4 | – |
| Klingenwache | – | – | A 2 | – | – | – | A 2 | – |
| Greifer | – | – | – | – | – | A 3 | – | A 10 (6 in Formation) |
| Lastläufer | A 1 | – | – | A 1, B 1 | – | B 1 | – | – |

## 4. Bosse

Prinzipien, angelehnt an den ersten Boss des Vorbilds (erkenntnisse.md,
„Gegner als Vorbild“; G Stage 1):

1. **Super-Armor**: Eine Kette, die den Boss nicht umwirft, bricht er mit
   einem Stoß ab (Vorbild 54 Frames, etwa 48 px), und seine LP springen
   auf den Wert vor der Kette zurück. Es zählen nur Ketten mit Umwerfen,
   Würfe und Sprungangriffe; ob der Spezialangriff zählt, ist offen: Er
   wirft jeden normalen Gegner um (6 LP, notes.md, „Nachtrag:
   Spezialangriff“), gegen Bosse ist er nicht gemessen.
2. **Rhythmus**: Gegen eine passive Figur greift er alle 170 bis 200
   Frames an (andere Bosse des Vorbilds 155 bis 466 Frames).
3. **Fall**: Fällt der Boss, sind im selben Frame alle übrigen Gegner
   besiegt.
4. **LP um 100** (Vorbild 70 bis 215): Mit Super-Armor sind 100 LP etwa
   fünf volle Ketten oder sieben Würfe. Wir bleiben bei 90 bis 120.
5. **Schaden 9 bis 22** je Angriff, nach Rangstufe steigend wie beim
   ersten Boss des Vorbilds (mechanik.md, „Schaden der Gegner“, Workflow).
6. **Ankündigung**: mindestens 15 Frames sichtbare Vorbereitung je Angriff
   (Vorschlag).
7. **Verstärkung** kommt an LP-Schwellen, nicht nach Zeit (G Stage 2, 3).

### Boss-Skizzen

**Ballast** (Stage 1, Frachtkai, 100 LP). Der Vorarbeiter des Syndikats
trägt einen hydraulischen Ladearm. Er bricht aus der Asservatenkammer,
sobald die Kamera die Arena erreicht. Er stürmt durch den Raum, schwingt
den Arm dreimal und springt mit ganzem Gewicht auf die Figur. Kommt er nah
heran, packt und wirft er sie. In Stage 8 kehrt er mit 110 LP zurück.

**Bohrmeisterin Halde** (Stage 2, Eisbergwerk, 100 LP). Sie führt die
Sprengtrupps. Ihre Bohrkanone verschießt Eissplitter. Sie hält Abstand,
kniet und feuert Salven in der Tiefe der Figur. Kommt die Figur zu nah,
schießt sie als Bohrkugel quer durch die Grotte. Bei der Hälfte und einem
Drittel ihrer LP ruft sie einen Fackel-Trupp.

**Der Schnitter** (Stage 3, Kuppelgärten, 110 LP). Der Obergärtner
schwingt eine Erntesense mit langem Schaft. Er schlägt erst zu, wenn die
Figur in der richtigen Distanz und fast in seiner Tiefe steht. Gegen
Flucht springt er hoch und schlägt von oben. Eine Klingenwache kämpft mit.
Schweifer fallen bei der Hälfte und einem Fünftel seiner LP herein.

**Der Brutling** (Stage 4, Klonlabor, 110 LP). Der größte Klon von Doktor
Apsis erwacht in einer Brutkapsel, deren Glas zerspringt. Er hämmert auf
den Boden, springt mit dem ganzen Körper auf die Figur und rollt als Kugel
über die halbe Arena. Nach jedem Angriff brüllt er kurz; das ist das
Fenster für eine Kette. Doktor Apsis jubelt bei jedem Treffer. Nach dem
Fall flieht er.

**Doktor Apsis** (Stage 5, Schweifjagd, 90 LP). Der Klonforscher flieht in
einem schnellen Gleiter durch den Schmelzkanal. Er wirft Bomben im hohen
Bogen voraus, einzeln mit Feuerring oder als Kette. Steht die Figur dicht
vor dem Gleiter, rammt er sie. Er hält sich rechts im Bild (Bildschirm-x
230 bis 310). Fällt er nicht in 40 Sekunden, entkommt er.

**Gischt und Glut** (Stage 6, Schmelzwerk, je 100 LP). Die Zwillinge
bewachen den Wärmekern mit langen Kühlmittelgewehren. Sie springen durch
die Arena und schießen einzeln oder sieben Kugeln im Fächer über das ganze
Tiefenband. Glut rollt als brennende Kugel heran. Gischt hält die Figur
fest, damit der andere trifft. Wer einen Zwilling besiegt, besiegt beide.

**Sturmbein** (Stage 7, Antriebsschacht, 110 LP). Die Leibwächterin des
Syndikats kämpft nur mit den Beinen. Ihr hoher Tritt ist kurz und hart,
ihr fliegender Seittritt überquert fast den ganzen Bildschirm. Mit einem
Saltosprung wechselt sie über die Figur hinweg die Seite. Das Startdeck
schwankt. Die Kamera hebt und senkt sich dabei um bis zu 27 px.

**Direktorin Aphel** (Stage 8, Flaggschiff, 120 LP). Die Herrin des
Schweif-Syndikats schwebt über dem Boden ihrer Kommandokuppel. Sie
schleudert Kometenblitze aus Feuer oder Eis, dehnt den Arm zu einem weiten
Schlag und packt die Figur aus der Distanz. Zwischen Angriffen gleitet sie
unverwundbar an eine neue Stelle. Zum Angreifen sinkt sie auf
Schlaghöhe; nur dann treffen Kette und Griff. Im letzten Drittel ihrer LP
regnen Salven von Blitzen auf das Deck.

### Angriffe der Bosse

Schaden von Rangstufe I nach IV; Reichweiten, wo nicht anders vermerkt,
aus dem Vorbild (G), sonst Vorschlag.

| Boss | Angriff | Ablauf | Reichweite | Schaden | Umwerfen |
|---|---|---|---|---|---|
| Ballast | Ansturm | Lauf, bei Kontakt Übergang in den Griff | 140 bis 205 px Laufweg | 12–17 | ja |
| Ballast | dreifacher Armschwung | je etwa 38 Frames | etwa 78 px | 9–12 | dritter Schwung (Vorschlag) |
| Ballast | Sprung-Körperpresse | Scheitel etwa 107 px, zielt auf die Figur | bis etwa 200 px | 16–22 | ja |
| Ballast | Griff mit Wurf | Griff aus dem Stand oder dem Ansturm | Griff offen: Bossangriffe wurden nicht gemessen | 16–22 | ja |
| Halde | Splittersalve | kniet, 5 bis 7 Splitter im 10-Frame-Takt, 8 px/Frame | ganze Bildbreite, nur ihre Tiefe | 12–15 je Splitter | ja |
| Halde | Bohrkugel | Hocke, Aufstieg, Rolle in Höhe 52, dann waagrecht 4,4 px/Frame | quer durch die Arena | 16–20 | ja |
| Halde | Bohrerstoß | 24 Frames (Vorschlag) | etwa 90 px (Vorschlag) | 9–12 | nein |
| Schnitter | Sensenhieb | 34 Frames, ausgelöst bei 63 bis 121 px Abstand (Median 88) und höchstens 5 px Tiefe | bis 121 px | 18–22 | ja |
| Schnitter | Sprungschlag | Aufstieg auf Höhe 120, etwa 68 Frames | 60 bis 114 px auf die Figur zu | 14–18 | ja |
| Schnitter | Sensenwirbel | dreht sich, trifft beide Seiten (Vorschlag) | etwa 60 px (Vorschlag) | 9–12 | nein |
| Brutling | Hammerschlag | 22 Frames | 94 bis 107 px | 18–22 | ja |
| Brutling | Körperpresse | etwa 63 Frames, Bildschirmwackeln bei der Landung | etwa 140 px nach vorn | 16–22 | ja |
| Brutling | Rollkugel | etwa 70 Frames | etwa 210 px | 14–20 | ja |
| Apsis | Einzelbombe | alle 227 bis 300 Frames, Bogen 43 Frames bis Höhe 92, Feuerring | landet etwa 213 px voraus | 10–12 und Brennen | ja |
| Apsis | Bombenkette | 4 bzw. 6 Bomben, Bogen 56 Frames | 120 bis 216 px voraus | 9–11 | ja |
| Apsis | Rammen | wenn die Figur dicht vor dem Gleiter steht | etwa 70 px | 9–11 | ja |
| Zwillinge | Fächerschuss | 7 Kugeln über das ganze Tiefenband, 8 px/Frame, prallen an Wänden ab | ganze Arena | 13–17 | ja |
| Zwillinge | Einzelschuss | gerade, 8 px/Frame (Vorschlag) | ganze Bildbreite | 9–12 | nein |
| Zwillinge | Glutrolle | rollt etwa 7 px/Frame heran, prallt an Wand oder Tür ab | bis 163 px | 18–22 | ja |
| Zwillinge | Klammergriff | hält fest, ohne Schaden; Arenasprung bis 232 px zum Neuaufstellen | Griff offen: Bossangriffe wurden nicht gemessen | 0 | nein |
| Sturmbein | hoher Tritt | 29 Frames | offen, weil Bossangriffe nicht gemessen wurden; Vorschlag 90 px | 18–22 | ja |
| Sturmbein | fliegender Seittritt | 60 bis 61 Frames in Höhe etwa 53; Kurzform ±65 px | 264 bis 279 px | 16–20 | ja |
| Sturmbein | Saltosprung | 96 Frames, Scheitel 99 px, landet hinter der Figur | etwa 130 px | 9–12 (Landung, Vorschlag) | nein |
| Aphel | Kometenblitz | Geschoss startet in Höhe 81 bis 96, 5 px/Frame leicht abwärts; Feuer lässt brennen, Eis friert ein | ganze Bildbreite | 12–16 | Feuer ja, Eis nein |
| Aphel | Dehnschlag | Arm fährt aus der Luft waagrecht aus | etwa 100 px | 14–18 | ja |
| Aphel | Griff mit Wurf | packt mit dem ausgestreckten Arm | etwa 100 px | 18–22 | ja |
| Aphel | Blitzregen | 3 bis 5 Blitze im 13-Frame-Takt, landen nach 45 bis 57 Frames | 225 bis 255 px entfernt | 12–16 je Blitz | ja |

Die Vorbild-Bosse treffen mit bis zu 29 LP; wir deckeln bei 22. Aphel
behält das Phasengleiten (45 bis 50 Frames unverwundbar), aber nicht das
unverwundbare Zucken nach jedem Treffer: Damit schaffte ein Bot im Vorbild
in 9000 Frames nur 21 Schaden (G Stage 9).

## 5. Stage-Schablone

Jede Stage wird gegen diese Liste geprüft.

| Nr. | Prüfpunkt | Vorgabe | Vorbild (G) |
|---|---|---|---|
| 1 | Kamera | scrollt nur nach rechts; der linke Bildrand ist eine Wand | alle Stages |
| 2 | Folgepunkt | Figur wird bei Bildschirm-x 200 gehalten; in Bossarenen Totzone 128 bis 256 | Stage 1, 2, 9 |
| 3 | Sperren | 1 bis 5 je Stage (außer der Sonderstage), jede mit einer Welle; Freigabe, wenn die Welle besiegt ist, dann Pfeil „weiter“. Sonderformen: zeitgesteuerter Halt (etwa 270 bis 290 Frames) und Sperre, die nur hält, solange die Welle lebt | 0 bis 6 Sperren; Halt 268 bzw. 288 Frames (Stage 8); Stage 7 |
| 4 | Bossarena | am Ende, 128 bis 400 px Kameraweg; der Boss erwacht beim Erreichen | Stage 1: Kamera-x 2048 bis 2176 |
| 5 | Tiefenband | 75 bis 187 px je Abschnitt, Untergrenze ist der untere Bildrand; Hindernisse und Stufen deutlich zeichnen | Stage 1: 75, 91, 187, 91 px; ein Bot hing an einem Tresen 1266 Frames und an einer Stufe 1500 Frames fest |
| 6 | Länge | 1500 bis 2500 px Scroll; reines Gehen bei 1,75 px/Frame 14 bis 24 s, mit Skriptszenen 17 bis 56 s | 1333 bis 3073 px; 17 bis 56 s |
| 7 | Skriptszenen | mindestens eine je Stage: Sturz, Lift, automatischer Lauf, Durchbruch, Blende (schließt 28 Frames, 78 schwarz, öffnet 28) | Lift 643 bzw. 978 Frames, Lochsequenz 202 bis 278 Frames |
| 8 | Vertikales Scrollen | höchstens ein Abschnitt je Stage, etwa 1 px je 4 px Kamera-x oder eine Rampe mit 0,5 px je px | Stage 1 und 7 |
| 9 | Vordergrund | 1 bis 3 Objekte vor den Figuren; keines verdeckt eine Figur ganz | Säulen, Fahrzeug, Geländer; Vorhänge, die den Helden fast ganz verdecken (Stage 9), vermeiden |
| 10 | Parallaxe | höchstens eine ferne Ebene mit Faktor 1/2, 1/4 oder 1/8, sonst alles 1:1 | meist 1:1; 0,5, 1/4, 1/8, 1/16 |
| 11 | Gegenstände | 2 bis 4 Behälter, ein großes Essen vor dem Boss | Stage 1: 2 Fässer, 3 Kassetten |
| 12 | Auslöser | Kamera-x, Tod eines Gegners oder LP des Bosses; reine Zeit nur beim zeitgesteuerten Halt | Erste Stage gesichert: Nachschub an festen Kamerapositionen; es zählt nicht, ob Gegner sterben, sondern wie viele leben (ein Gegner erscheint erst bei höchstens 3 Lebenden, bis dahin hält die Kamera); die letzte Welle kommt, sobald die LP des Bosses unter die Hälfte fallen, zwei Fernkämpfer bei einem Viertel (notes.md, „Nachtrag: Verhalten der Nahkämpfer“). Weitere Kamerahalte unsicher (Schwelle nur an einer Stelle gesehen) |
| 13 | Abschluss | Fall des Bosses besiegt alle; Abschlussanzeige mit Punkten | alle Stages |

Zu Punkt 6: 1500 px Scroll sind 857 Frames reines Gehen (14,4 s), 2500 px
sind 1429 Frames (24,0 s); mehr als 24 s ergeben erst Skriptszenen.

## 6. Acht Stages

| Nr. | Name | Scroll | reines Gehen | Sperren (ohne Arena) | Boss |
|---|---|---|---|---|---|
| 1 | Frachtkai | 1920 px | 18,4 s | 1 | Ballast |
| 2 | Eisbergwerk | 1600 px in 2 Teilen | 15,3 s + Sturz | 2 | Bohrmeisterin Halde |
| 3 | Kuppelgärten | 2400 px in 3 Teilen | 23,0 s + Skripte | 3 | Der Schnitter |
| 4 | Klonlabor | 1500 px in 4 Teilen | 14,4 s + Übergänge | 3 | Der Brutling |
| 5 | Schweifjagd (Sonderstage) | Autoscroll 6 px/Frame, etwa 10.700 px | 30 s Fahrt + bis 40 s Boss | 0 | Doktor Apsis |
| 6 | Schmelzwerk | 1800 px in 2 Teilen | 17,2 s + Skript | 3 | Gischt und Glut |
| 7 | Antriebsschacht | 2500 px mit Rampe und Schacht | 24,0 s + Lift und Sturz | 5 | Sturmbein |
| 8 | Flaggschiff | 2500 px in 2 Teilen | 24,0 s + 10,8 s Lift | 5 | Ballast (Zwischenboss), Direktorin Aphel |

**Stage 1: Frachtkai.** Nacht am Frachtkai des Hafens Perihel, Reif auf
dem Pflaster, Neonschilder der Händler. Der Weg führt vom Landedeck durch
die Händlergasse eine Rampe hinab zum Kai und durch das Zollamt in dessen
Asservatenkammer (1920 px, eine Sperre). Als Skriptszene bricht ein
Lastläufer durch das Tor des Zollamts. Gegner sind Bolzer, Rammböcke, ein
Splitter, zwei Zünder und der Lastläufer, Boss ist Ballast. Besonderheit:
Startgegner mit festem Schaden, vertikales Scrollen auf der Rampe.
Einzelheiten in Abschnitt 7.

**Stage 2: Eisbergwerk.** Abbaustollen im blauen Kometeneis: Teil A ist
die Förderhalle (900 px), Teil B eine Grotte mit Schmelzwasser und dem
Lagerfeuer der Bergleute (700 px), je eine Sperre. Als Skriptszene bricht
nach der letzten Welle in A der Boden, die Figur stürzt durch eine
Eisspalte (200 bis 280 Frames mit Blende). Gegner sind Splitter, Ringer,
Glimmer und Fackeln; zwei Glimmer springen von einer Förderbrücke herab.
Boss ist Bohrmeisterin Halde.

**Stage 3: Kuppelgärten.** Gewächshauskuppeln im fahlen Licht der fernen
Sonne: Arkadenstraße (1300 px), Glashaus mit Türen in den Pflanzwänden
(900 px), Erntehalle als Arena (200 px); drei Sperren. Skriptszenen sind
ein automatischer Lauf die Stufen hinauf und ein Ring von Gärtnerwachen,
der die Figur ohne Kampf umzingelt (etwa 300 Frames, dann Blende). Gegner
sind Splitter, Glimmer, Fackel, der erste Koloss, Klingenwachen und
Schweifer, die aus den Türen springen. Boss ist der Schnitter.
Besonderheit: Himmel mit Kometenschweif als ferne Ebene (Faktor 1/2).

**Stage 4: Klonlabor.** Die Zuchtanlage von Doktor Apsis in vier kurzen
Teilen: Ladehof mit Kisten, Brutsaal mit Glasröhren, Prüfring mit einer
Tribüne voll regloser Klone, Kapselraum (1500 px, mit Übergängen etwa
31 s, drei Sperren). Skriptszene ist der Sprung in einen
Versorgungsschacht. Gegner sind Bolzer der Variante B, von denen einige
fliehen, Zünder mit Raketenwerfern und im Prüfring zwei Lastläufer. Boss
ist der Brutling. Besonderheit: Doktor Apsis sieht als Nichtkämpfer zu
und flieht nach dem Bossfall in die Sonderstage.

**Stage 5: Schweifjagd (Sonderstage).** Die Figur jagt Doktor Apsis auf
einem Eisgleiter über Geysirfelder, durch Ausläufer des Gasschweifs und in
einen Schmelzkanal. Das Bild scrollt automatisch mit 6 px/Frame wie die
Brettfahrt des Vorbilds, etwa 30 s lang (rund 10.700 px), ohne Sperren.
Skriptszene ist ein Wettrennen zum Kanaleingang mit Bonus für die
Führung. Gegner sind Schweifer auf Gleitern mit 8 LP, die jeder Treffer
abwirft; Eisnadeln stehen im Weg (8 LP, umwerfen, 122 Frames bis zur
Kontrolle). Der Bosskampf hat 40 s Zeitlimit. Auf dem Gleiter bewegt sich
die Figur 2 px/Frame in der Tiefe, das Band ist 107 bis 139 px tief.

**Stage 6: Schmelzwerk.** Der Wärmetauscher unter dem Eis: Glasröhre
durch das Schmelzwasserbecken, Pumpenlabor, Beobachtungsdeck am glühenden
Wärmekern (1800 px, drei Sperren). Skriptszene ist der Ausgang durch den
Schlund einer Turbine. Gegner steigen aus Wartungsluken, Glimmer fallen
von der Decke; dazu Rammböcke, Zünder, ein Koloss, ein Lastläufer und
erstmals der Greifer. Bosse sind die Zwillinge Gischt und Glut.
Besonderheit: Ringe der Röhre im Vordergrund.

**Stage 7: Antriebsschacht.** Die Bahntriebwerke, mit denen das Syndikat
den Kometen auf Kollisionskurs bringen will: rot pulsierender
Maschinenkorridor, Rampe hinab, Liftplattform, Steuerzentrale, Sturz durch
einen Schacht, Startdeck eines Schleppers (2500 px). Fünf Sperren, zwei
halten nur, solange ihre Welle lebt. Gegner sind Schweifer, die von oben
fallen, Bolzer, Rammböcke, viele Zünder, Kolosse und Klingenwachen;
Kühlmittelfässer rollen heran (16 LP bei Kontakt). Boss ist Sturmbein.
Besonderheit: Rampe mit vertikalem Scrollen (0,5 px je px) und
schwankendes Bossdeck.

**Stage 8: Flaggschiff.** Das Schiff des Syndikats liegt am Kontrollturm
an: goldener Korridor mit Blick auf den Schweif, Frachthalle, Liftfahrt
(643 Frames) in den Salon, Kommandokuppel. Fünf Sperren, eine davon ein
zeitgesteuerter Halt, während Formationen aus Glimmer, Greifern und
Fackeln durchziehen; ihre Statisten (16 LP) lassen besiegt Essen fallen.
Im Salon kehrt Ballast als Zwischenboss zurück, am Ende wartet Direktorin
Aphel.

## 7. Erste Stage im Detail

Orientierung an Stage 1 des Vorbilds: 1920 px Scroll, sieben leichte und
fünf schwere Nahkämpfer, ein Messerkämpfer, zwei Fernkämpfer, ein
Fahrzeuggegner, ein Boss (G Stage 1). Abweichend vom Vorbild hat die
Stage eine Sperre, damit der erste spielbare Stand eine enthält.
Kamera-x läuft von 0 bis 1920, sichtbar ist Welt-x 0 bis 2304.

| Abschnitt | Welt-x | Tiefenband | Kamera-y | Objekte | Vordergrund |
|---|---|---|---|---|---|
| A Landedeck | 0–400 | 75 px | 128 | Frachtcontainer, Reif am Boden | Kabelrollen am unteren Rand |
| B Händlergasse | 400–850 | 91 px | 128 | Funkladen mit zwei Schaufenstern (zerbrechen bei einem Wurf, Vorschlag) | – |
| C Rampe zum Kai | 850–1300 | wächst von 91 auf 187 px | fällt von 128 auf 0, 1 px je 4 px Kamera-x (Kamera-x 600 bis 1112) | zwei Wartungsluken (Welt-x 1000 und 1190), zwei Treibstofffässer (Welt-x 1180 und 1230) | Patrouillengleiter der Hafenwache (Welt-x 1030–1220, fest) |
| D Kaiplatz | 1300–1550 | 187 px | 0 | Glastor des Zollamts (zerbricht beim Durchbruch) | Säulen des Zollamts (Welt-x 1490–1555) |
| E Zollhalle | 1550–1850 | 91 px | 0 | Schaltertresen als schräge Wand; vorn frei, hinten nur per Sprung | – |
| F Asservatenkammer (Arena) | 1850–2304 | 91 px | 0 | drei Asservatenkisten, der Boss zerschlägt sie (zweimal Raketenwerfer, einmal Laser) | – |

Die Fässer geben eine Großportion Essen und einen Raketenwerfer frei
(Abschnitt 8). Die Tiefenbänder folgen dem Vorbild (75, 91, 187, 91 px).

**Wellen.** Auslöser sind Vorschläge; welche Regel das Vorbild nutzt,
misst M2. LP bei Rang 11 und Schaden in Rangstufe II, in der die Stage
meist läuft (Start bei Rang 9).

| Welle | Auslöser | Gegner | Anzahl | Herkunft | LP | Schaden | Sperre |
|---|---|---|---|---|---|---|---|
| 1 | Figur bis 150 px am Versteck | Bolzer hinter einem Container | 1 | rechter Bildrand | 16 (Startgegner) | 5 | nein |
| 2 | Kamera-x 250 | Bolzer und Rammbock, hockend vor dem Funkladen | 1 + 1 | Gasse | 16 und 30 (Startgegner) | 5 und 6 | nein |
| 3 | Kamera-x 512 | Splitter, rennt herein | 1 | rechts | 37 | Stich 8, Wurf 11 | nein |
| 4 | Kamera-x 700 | Bolzer aus der Wartungsluke bei Welt-x 1000 | 2 | Luke | 25 | 8 | nein |
| 5 | Kamera-x 900 | Rammböcke aus der Luke bei Welt-x 1190 | 2 | Luke | 34 | 9 | nein |
| 6 | Kamera-x 1090 | Lastläufer bricht durch das Glastor, Bolzer am Steuer | 1 + 1 | Zollamt | 85 und 27 | Armschlag 12, Griff 15 | ja, Kamera-x 1100 bis beide besiegt sind |
| 7 | Kamera-x 1792 | Boss erwacht; Bolzer laufen ein | 1 + 2 | Arena, von links | Boss 100, Bolzer 29 | siehe Abschnitt 4; Bolzer 8 | Arena |
| 8 | Tod des ersten Arena-Bolzers (Richtwert Vorbild: Fernkämpfer bei einem Viertel der Boss-LP) | Zünder mit Pistole | 1 | links | 19 | 6 je Schuss | Arena |
| 9 | Boss bei höchstens 50 LP | Rammböcke und Zünder mit Raketenwerfer | 2 + 1 | links | 36 und 21 | 9 und 13 | Arena |

Gesamt: 7 Bolzer (einer am Steuer), 5 Rammböcke, 1 Splitter, 2 Zünder,
1 Lastläufer, 1 Boss. Wellenbonus: Welle 6 und 9 +2 LP, Welle 7 +4 LP.
Den natürlichen Auslöser der letzten Welle kennt man im Vorbild nicht
(vermutlich LP des Bosses, G Stage 1). Die vertikale Scheibe (design.md,
Abschnitt 8) nutzt die Abschnitte A, B und F: Welle 2 wird zur
Sperrwelle, in der Arena kommen Welle 7 und 8 dazu, und Ballast greift
nur mit Ansturm, Armschwung und Körperpresse an.

**Boss.** Ballast erwacht bei Kamera-x 1792, zerschlägt die
Asservatenkisten und bricht heraus; zugleich laufen zwei Bolzer von links
ein. In der Arena folgt die Kamera mit Totzone 128 bis 256 bis Kamera-x
1920. Super-Armor, Rhythmus und Fall wie in Abschnitt 4, danach die
Abschlussanzeige.

## 8. Gegenstände und Waffen

Gegenstände steigen aus Behältern auf etwa 35 px Höhe und bleiben dann
liegen (G Stage 1). Jeder Gegenstand liegt 700 Frames, blinkt dann 92
Frames und verschwindet. Im Vorbild gesichert: 48 Frames Flug aus dem
Behälter (Brathähnchen 49), 700 Liegezeit, dann Blinken bis L+792 (92
Frames), zusammen 840; Essen läuft nicht ab (notes.md, „Nachtrag:
Gegenstände und Waffen“). Die 91 Frames Blinken in G Stage 1 sind
beschrieben. Waffen besiegter Zünder fallen als Gegenstand.

| Gegenstand | Rolle | Vorbild | Werte |
|---|---|---|---|
| Kometenbraten (groß) | heilt viel; höchstens einer je Stage, vor dem Boss | Brathähnchen heilt voll (20 auf 72 LP) | Vorbild gesichert: heilt voll; bei vollen LP 1000 Punkte statt Heilung (notes.md, „Nachtrag: Gegenstände und Waffen“) |
| Eisnudelschale (mittel) | mittlere Heilung | Reisschale, Braten auf Teller | Vorbild gesichert: Reisschale +55 LP (bei vollen LP 800 Punkte), ein weiteres Essen +40 LP (notes.md, „Nachtrag: Gegenstände und Waffen“); Braten auf Teller offen, nicht gemessen |
| Sternbeeren (klein) | kleine Heilung, von Formations-Statisten | Kirschen | Vorbild gesichert: Kirschen +16 LP, das kleinste Essen +12 LP, bei vollen LP je 100 Punkte (notes.md, „Nachtrag: Gegenstände und Waffen“) |
| Bolzenpistole | Einzelschüsse auf Abstand; fällt von Zündern der Variante A | Pistole der Fernkämpfer bleibt liegen (G Stage 7) | Vorbild gesichert: 5 Schuss, Aktion 17 Frames, Kugel ab P+7 mit 8 px/Frame in 54 px Höhe, 6 LP, wirft um (notes.md, „Nachtrag: Gegenstände und Waffen“); Lebensdauer der Kugel (32 Frames, rund 300 px) unsicher, weil Wände die Messung begrenzten |
| Raketenwerfer | Flächenschaden auf Abstand, wenige Schuss | Explosion etwa 90 bis 95 Frames, verbrennt alle in der Nähe | Vorbild gesichert: 3 Schuss, Aktion 17 Frames; Einschlag nach 21 Frames 163 px vor der Figur (früher an Wänden); nur die Explosion trifft, 15 Frames lang, 8 LP, wirft um, mehrere Gegner, von 67 px vor bis mindestens 90 px hinter dem Einschlag, Tiefe ±28 px (notes.md, „Nachtrag: Gegenstände und Waffen“) |
| Laser | durchschlagender Strahl in einer Tiefe | aus einer Kassette in Stage 1 | Vorbild gesichert: 4 Schuss, Aktion 25 Frames; Strahl ab P+7, wächst 16 px/Frame, 6 LP, wirft um, Tiefe ±12 px, endet am ersten Gegner, der überlebt (notes.md, „Nachtrag: Gegenstände und Waffen“). Unsicher: untere Grenze 52 px (nur Messagent), größte Reichweite (245 bis 350 px je nach Messung) und ob der Strahl weiterläuft, wenn der erste Gegner stirbt (Gegenprüfung ja, dritte Messung nein) |
| Maschinengewehr | Dauerfeuer, kleiner Schaden je Treffer | aus Fässern und von Fernkämpfern | Vorbild gesichert: 5 Salven zu 4 Kugeln (P+7, +12, +17, +22), 10 px/Frame, 8 LP je Kugel, wirft um, Aktion 37 Frames (notes.md, „Nachtrag: Gegenstände und Waffen“); Flugdauer der Kugeln (14 Frames) unsicher, weil Wände die Messung begrenzten |
| Wurfsterne | gerader Wurf; ein Fehlwurf bleibt liegen und lässt sich wieder aufheben | Wurfstern 5 px/Frame in Höhe 80, liegt 451 bis 783 Frames | Vorbild gesichert: Die gemessene Figur nimmt Wurfsterne nicht als Waffe, sie geben 300 Punkte (notes.md, „Nachtrag: Gegenstände und Waffen“); als Waffe offen, weil im Vorbild nur eine andere Figur sie nutzt und das nicht gemessen ist |

| Behälter | Verhalten | Vorbild |
|---|---|---|
| Fass | fest, ein Treffer zerbricht es, gibt einen Gegenstand frei | Fässer und Metallkisten mit Wert 777, die trotzdem ein Schlag öffnet (G Stage 1, 8) |
| Kiste | wie Fass, tiefensortiert; übrige Kisten zerplatzen beim Verlassen des Abschnitts | Stage 4, Inhalt dort je Lauf verschieden |
| Rollfass | fällt von oben (288 px in 45 Frames), rollt etwa 2,5 px/Frame, 16 LP bei Kontakt, zerbricht bei Treffer, kann eine Waffe enthalten | Stage 7 |
| Glasscheibe | zerbricht beim ersten Treffer oder Wurf, ohne Inhalt | Stage 1, 2 |
| Bosskiste | nur der Boss zerschlägt sie | Stage 1 |

Gegner heben in der ersten Fassung keine Waffen auf (im Vorbild tut es
der leichte Nahkämpfer in Stage 6), das hält das Verhalten einfach.

**Fahrzeug (optional).** Der Lastläufer bleibt zunächst nur Gegner. Im
Vorbild kann man nach dem Abwurf des Fahrers aufsitzen; das Fahren ist
nicht untersucht, ein Versuch scheiterte (erkenntnisse.md, „Stages als
Vorbild“; G Stage 4). Ein fahrbarer Lastläufer bräuchte eigene Werte,
Animationen für jeden Helden und eine Abstimmung gegen die Gegner. Später
passt er als Belohnung in die Arenen von Stage 4 und 6. Der Gleiter der
Sonderstage ist davon unabhängig, weil er nur dort per Skript vorkommt.

## 9. Animationsplan Gegner

Angaben als Bildzahl × Frames je Bild oder als Folge der Einzeldauern,
aus den Aufnahmen als Richtwert: Mit gleichen Dauern stimmt das Timing
auch mit eigenen Bildern (erkenntnisse.md). Farbvarianten brauchen keine
eigenen Bilder.

**Nahkämpfer leicht (Bolzer)**, etwa 55 Bilder:

| Animation | Bilder und Dauern | Summe | Quelle |
|---|---|---|---|
| Haltung | 3 × 5, Schleife | 15 | G Stage 1 |
| Gehen | 8 × 4, Schleife | 32 | A1, G Stage 1 |
| Spott | 10 / 8 / 8 / 8 / 7 / 1 | 42 | G Stage 1 |
| Ausstieg aus Luke | 9 / 9 / 9 / 9 / 5 / 5 / 1 | 47 | G Stage 1 |
| Schlag 1 | Kampfhaltung 17, dann 4 / 5 / 12 / 5 | 43 | A2 |
| Schlag 2 | nach 15 Frames Pause: Kampfhaltung 21, dann 4 / 5 / 10 | 40 | A2 |
| Getroffen | etwa 9 je Trefferbild | 23 (Bilder ab h+1, h+10, h+22), gesichert (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | A5 |
| Umgeworfen, liegen, aufstehen | 2 / 8 / 37 / 9 / 33 / 8 / 8 / 1, dann 5 × 4 bis zur Haltung | 126 | A3 |
| Gegriffen und geworfen | 2 / 10 / 9 / 7 / 42 / 12 / 13 | 95 | A4 |
| Tod | 8 / 1 / 37 / 9 / 8 / 1, dann 20 Blinken | 84 (Stage-Tabelle 86 bis 90) | A5, G Stage 1 |

**Nahkämpfer schwer (Rammbock, Ringer)**:

| Animation | Bilder und Dauern | Summe | Quelle |
|---|---|---|---|
| Rammbock: Haltung, Gehen | 3 × 5; 8 × 4 | 15; 32 | G Stage 1 |
| Rammbock: Wiegen | 10 / 8 / 8 / 8 / 7 / 1 | 42 | G Stage 9 |
| Rammbock: Angriff | 1 / 1 / 4 / 4 / 2, Hocke 21, Schlag 4 / 5 / 12 / 5, dann 29 Pause | 59 + 29 | A6 |
| Rammbock: Sprungtritt | ein Sprung, Höhe 52, etwa 123 px weit | 74 | G Stage 8 |
| Rammbock: getroffen | etwa 9 je Trefferbild (1 / 1 / 2 / 9 / 9 / 9 / 9 / 9 / 7) | 23 (Bilder ab h+1, h+10, h+22), gesichert (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | A9 |
| Rammbock: umgeworfen | 2 / 8 / 37 / 9 / 41 / 8 / 8 / 1, dann 4 / 4 / 4 | 126 | A7 |
| Rammbock: gegriffen | 3 / 4 / 9 / 7 / 42 / 12 / 23 | 100 | A8 |
| Rammbock: Tod | 4 × 6 bzw. 78 | 24 bzw. 78 | G Stage 1, 6 |
| Ringer: Gehen, Stehen | 6 × 4; 4 × 6 | 24; 24 | G Stage 2, 9 |
| Ringer: Ausfallschlag | 2 / 6 / 8–15 / 6 / 1 | 23 bis 30 | G Stage 9 |
| Ringer: Griff mit Sprung und Aufschlag | 2 / 6 / 12 / 1, 25 auf, 25 ab, 18, Erholung 30 / 8 / 1 | 128 (Stage-Tabelle etwa 140) | G Stage 9 |
| Ringer: umgeworfen | 13 / 1, Flug 34, Aufprall 9, Liegen 28–40, Aufstehen 8 / 8 / 8 / 1 | 110 bis 122 | G Stage 9 |
| Ringer: Tod | 6 / 1 / 34 / 9, Staub 8 / 1, Blinken 20 / 1 | 80 | G Stage 9 |

**Schneller Messerkämpfer (Splitter, Schweifer)**:

| Animation | Bilder und Dauern | Summe | Quelle |
|---|---|---|---|
| Splitter: Rennen, Gehen | 8 × 4; 8 × 6 | 32; 48 | G Stage 1 |
| Splitter: Messerhaltung | 4 × 4, Schleife, 50 bis 80 gehalten | 16 | G Stage 9 |
| Splitter: Hieb | 25 + 12 Pause | 37 | G Stage 1, 2 |
| Splitter: Ausfallstich | 5 / 4 / 3 / 2 / 3 / 16 / 1 | 34 | G Stage 3 |
| Splitter: Messerwurf | 1 / 4 / 3 / 1 / 1 / 32 / 1 | 43 | G Stage 9 |
| Splitter: getroffen, benommen | 10 / 3 / 1; 4 × 5 | 14; 20 | G Stage 3, 9 |
| Splitter: umgeworfen | 8, Flug 40, Aufprall 17, 2 / 6 / 1, Liegen 27–31, Aufstehen 1 / 12 / 7 / 6 / 1 | etwa 130 | G Stage 9 |
| Splitter: Tod | 8 / 41, Aufprall 17, dann 20 Blinken | etwa 86 | G Stage 2, 9 |
| Schweifer: Rennen, Haltung | 6 × 4; 4 × 6 | 24; 24 | G Stage 3, 7 |
| Schweifer: Fall von oben | 29, Landung 4 / 4 / 4 / 1 | 42 | G Stage 7 |
| Schweifer: Saltoangriff, Rückwärtssalto | 6 × 8; 41 | 48; 41 | G Stage 3, 7 |
| Schweifer: Wurf in der Luft | 2 / 2 / 1 / 1 / 2 / 2 | 10 | G Stage 3 |
| Schweifer auf dem Gleiter | Fahrt 4 × 6, Abwurf 8 / 1 / 6 / 34 | 24; 49 | G Stage 5 |

**Fernkämpfer (Zünder)**:

| Animation | Bilder und Dauern | Summe | Quelle |
|---|---|---|---|
| Gehen | 8 × 4 | 32 | G Stage 1 |
| Zielen | gehalten | 60 bis 120 | G Stage 1, 8 |
| Schuss | 5 / 1 / 10 / 1 | 17 | G Stage 1, 4 |
| Nachladen | 10 / 8 / 8 / 4–8 | 30 bis 34 | G Stage 6 |
| Kolbenhieb | ein Ablauf | 42 | G Stage 8 |
| Sprung | ein Ablauf, Höhe 64 | 31 bis 40 | G Stage 7 |
| Tod | ein Ablauf | 77 bis 90 | G Stage 1, 4 |

**Flächenangreifer (Glimmer, Fackel)**:

| Animation | Bilder und Dauern | Summe | Quelle |
|---|---|---|---|
| Glimmer: Gehen, Rennen | 8 × 6; 6 × 6 | 48; 36 | G Stage 2, 9 |
| Glimmer: Fall von der Decke | ein Ablauf aus Höhe 240 | 34 bis 35 | G Stage 6 |
| Glimmer: Stabstoß | 6 / 6 im Wechsel | etwa 30 | G Stage 6, 9 |
| Glimmer: Sprungtritt | 6 + 34, Landung 6 / 1 | 47 | G Stage 6, 9 |
| Glimmer: getroffen | 13 / 3 | 16 | G Stage 9 |
| Glimmer: umgeworfen | 8 + 37, Aufprall 9, Liegen 42, Aufstehen 6 / 1 | 103 | G Stage 9 |
| Glimmer: Formationspose | 6, dann 6 / 6 Schleife | etwa 90 | G Stage 8 |
| Glimmer: Tod | 6 / 1, dann 19 Blinken | 26 (Stage 6: 81) | G Stage 6, 8 |
| Fackel: Rennen, Gehen | 6 × 4 | 24 | G Stage 2, 3 |
| Fackel: Zielen, Feuer | 8 / 8 / 10, Feuer 110 gehalten | 136 | G Stage 6, 8 |
| Fackel: Hechtkopfstoß | 3 + 22 | 25 | G Stage 3 |
| Fackel: Aufstehen, benommen | 19; etwa 105 | – | G Stage 3, 8 |

**Schwerer Gegner (Koloss, Lastläufer, Klingenwache, Greifer)**:

| Animation | Bilder und Dauern | Summe | Quelle |
|---|---|---|---|
| Koloss: Gehen | 8 × 8 | 64 | G Stage 6 |
| Koloss: Spucke | 15 / 4 / 6 / 3 / 20 | 48 | G Stage 6 |
| Koloss: Körperstoß | 15 + 4 / 6 / 3 + 20 + 1 | 49 | G Stage 3 |
| Koloss: großer Sprung | ein Ablauf, Höhe 64 | 41 | G Stage 7 |
| Koloss: Aufstehen, benommen | 25; 4 × 5 | 25; 20 | G Stage 3 |
| Koloss: Tod | ein Ablauf | 127 | G Stage 6 |
| Lastläufer: Durchbruch | 7 + 6 × 4 | 31 | G Stage 1 |
| Lastläufer: Gehen, Ansturm | 6 × 7; 6 × 4 | 42; 24 | G Stage 1, 4 |
| Lastläufer: Armschlag | ein Ablauf, Reichweite 87 bis 88 px | etwa 24 | G Stage 1 |
| Lastläufer: Zusammensacken, Explosion | 10 / 10 / 10; 40 + 30 | 30; 70 | G Stage 1 |
| Klingenwache: Gehen, Wache | 8 × 6; gehalten | 48; 50 bis 100 | G Stage 3, 7 |
| Klingenwache: Hiebserie, Stoß | etwa 38; 22 + 16 + 16 | 38; 54 | G Stage 3 |
| Klingenwache: Aufstehen | ein Ablauf | 43 | G Stage 3 |
| Greifer: Gehen, Hocke | 8 × 6; 3 × 6 | 48; 18 | G Stage 6, 8 |
| Greifer: Klauenstoß kurz, Vorstoß lang | etwa 30; Arm fährt in 7 × 2 aus | 30; 100 bis 113 | G Stage 6 |
| Greifer: Aufstehen, Tod | ein Ablauf | 31 bis 61; 96 | G Stage 6, 8 |

## 10. Offene Entscheidungen des Nutzers und Quellen

### Offene Entscheidungen

1. **Welt**: Kometenhafen „Perihel“ wie in `docs/design.md`, Abschnitt 2.
2. **Zahl der Stages**: acht statt neun wie im Vorbild.
3. **Zwölf Typen**, davon vier schwere, oder weniger Typen.
4. **Sperre in Stage 1**: im Vorbild keine, hier eine.
5. **Gleichzeitige Angreifer**: höchstens zwei (Vorschlag; im Vorbild
   meist einer, Werte in Abschnitt 2).
6. **Gegner im Schutzfenster der Figur**: warten (Vorschlag) oder wie im
   Vorbild angreifen, ohne zu treffen (Vorschlag in `docs/design.md`,
   Abschnitt 9, Punkt 5).
7. **LP nach Rang**: gleichmäßig wie in design.md, dazu Wellenbonus +2
   bis +4 LP.
8. **Schaden der Flächenangreifer**: bis 13 (Vorschlag) statt der
   beschriebenen 13 bis 16 des Vorbilds.
9. **Boss-LP** 90 bis 120 statt 70 bis 215 des Vorbilds; Bossschaden bei
   22 gedeckelt.
10. **Endboss**: Super-Armor und Phasengleiten statt unverwundbarem Zucken
    nach jedem Treffer.
11. **Sonderstage**: Position 5, Zeitlimit 40 s; endet die Stage bei
    Zeitablauf trotzdem (wie im Vorbild)?
12. **Fahrzeug**: Lastläufer fahrbar oder nur Gegner.
13. **Gegner heben Waffen auf**: nein (Vorschlag).
14. **Essen**: Großportion heilt voll wie im Vorbild oder um einen festen
    Wert; das übrige Essen dort heilt 55, 40, 16 und 12 LP.
15. **Schutz der Gegner nach dem Aufstehen**: kurz (Vorschlag) oder keiner
    wie im Vorbild.

### Quellen

| Datei | Abschnitte | verwendet für |
|---|---|---|
| `docs/design.md` | Abschnitt 2, 6 und 8 | Welt, LP-Regel nach Rang, Umfang der vertikalen Scheibe |
| `docs/mechanik.md` | „Schaden der Gegner“, „Lebenspunkte“, „Unverwundbarkeit“, „Angriff“, „Griff und Wurf“, „Sprungangriff“; seit 2026-10-02 auch „Trefferreaktion der Gegner“, „Reichweite der Gegnerangriffe“, „Spezialangriff“, „Gegenstände und Waffen“ | Rang, Schaden und LP der Nahkämpfer und des Messerkämpfers, Schutzfenster, Reichweiten der Kette, Flugweiten, Trefferreaktion, Gegnerangriffe, Waffen |
| `docs/erkenntnisse.md` | „Gegner als Vorbild“, „Stages als Vorbild“, „Hinweise für die eigene Grafik“ | Rollen, Bossprinzipien, Stage-Muster, Größen |
| `research/captcomm/notes.md` | „Nachtrag: Schaden der Gegner“, „Szenarien“; Nachträge vom 2026-10-02: „Trefferreaktion der Gegner“, „Verhalten der Nahkämpfer“, „Reichweite der Gegnerangriffe“, „Spezialangriff“, „Gegenstände und Waffen“ | Angriffe der beiden Nahkämpfer, Treffer aus 46 px; alle Werte mit Quelle „Nachtrag“ in den Abschnitten 1, 2, 4, 8 und 9 |
| `research/captcomm/grafik/README.md` | alle neun Stages, Gegnertabelle, „Abläufe von WOOKY und EDDY“ | Kennwerte der Stages, Gegner, Bosse, Animationsdauern |
| `research/captcomm/grafik/gegner/ablaeufe.csv` | alle Zeilen | A1 bis A9 |

Vorbild ist Captain Commando (Capcom 1991, Arcade, MAME-Set `captcomm`).

| Kürzel | Datei in `grafik/gegner/` |
|---|---|
| A1 | `wooky_gehen.png` |
| A2 | `wooky_angriff.png` |
| A3 | `wooky_umgeworfen.png` |
| A4 | `wooky_gegriffen_geworfen.png` |
| A5 | `wooky_kette_tod.png` |
| A6 | `eddy_angriff.png` |
| A7 | `eddy_umgeworfen.png` |
| A8 | `eddy_gegriffen_geworfen.png` |
| A9 | `eddy_kette.png` |

| Arbeitsname | Vorbild |
|---|---|
| Bolzer | WOOKY |
| Rammbock | EDDY |
| Ringer | SAMSON (A), ORGANO (B) |
| Splitter | SKIP (A), SONIE (B) |
| Schweifer | KOJIRO (A), HANZO (B), SASUKE (C) |
| Zünder | DICK |
| Glimmer | CAROL (A), BRENDA (B) |
| Fackel | MARBIN |
| Koloss | MARDIA |
| Klingenwache | MUSASHI |
| Greifer | Z |
| Lastläufer | Mech (Ride Armor) mit WOOKY |
| Ballast | DOLG (Stage 1, Rückkehr in Stage 9) |
| Bohrmeisterin Halde | SHTROM.Jr (Stage 2) |
| Der Schnitter | YAMATO (Stage 3) |
| Der Brutling | MONSTER (Stage 4) |
| Doktor Apsis | Dr. T.W. (Wissenschaftler Stage 4, Boss Stage 5) |
| Gischt und Glut | SHTROM & DRUK (Stage 6) |
| Sturmbein | BLOOD (Stage 7) |
| Direktorin Aphel | SCUMOCIDE (Stage 9) |

| Stage | Vorbild |
|---|---|
| 1 Frachtkai | Stage 1 CITY |
| 2 Eisbergwerk | Stage 2 MUSEUM |
| 3 Kuppelgärten | Stage 3 NINJA HOUSE |
| 4 Klonlabor | Stage 4 CIRCUS CAMP |
| 5 Schweifjagd | Stage 5 SEA PORT (Hoverboard) |
| 6 Schmelzwerk | Stage 6 AQUARIUM |
| 7 Antriebsschacht | Stage 7 UNDERGROUND BASE |
| 8 Flaggschiff | Stage 8 ENEMY'S SPACESHIP und Stage 9 CALLISTO |
