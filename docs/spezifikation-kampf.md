# Comet Brawlers: Spezifikation Kampfsystem (vertikale Scheibe)

Stand 2026-10-03, Entscheidungen E10 bis E22 eingearbeitet. Technische
Spezifikation ohne Code; Sprache und Technik legt E22 fest (Abschnitt 1,
„Technik“). Sie beschreibt, was für das Kampfsystem der
vertikalen Scheibe (`docs/design.md`, Abschnitt 8) gebaut werden muss.
Grundlagen: `docs/design.md` (Abschnitte 3, 4, 8), `docs/design-gegner-stages.md`
(Abschnitte 2, 7, 8), `docs/mechanik.md`, die Entscheidungen E1 bis E9
(`docs/design.md`, Abschnitt 9) und E10 bis E22 (`docs/erkenntnisse.md`,
„Entscheidungen“). Gegnerlogik, Stage, Kamera, Wellen, Boss,
Rang, Erscheinen und Verschwinden der Gegenstände, Anzeige und Zufall
stehen in `docs/spezifikation-welt.md`.

| Kennzeichnung | Bedeutung |
|---|---|
| „Abschnitt“ ohne Dateiname | Abschnitt in `docs/mechanik.md`; der Wert ist dort gesichert, außer mit (Workflow) |
| notes.md, „…“ | Abschnitt in `research/captcomm/notes.md` |
| Welt n | Abschnitt n in `docs/spezifikation-welt.md` |
| E1 bis E9 | Entscheidung des Nutzers vom 2026-10-02 |
| E10 bis E22 | Entscheidung des Nutzers vom 2026-10-03 (`docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md`, Abschnitt 1) |
| beschlossen (E10) | bisher Arbeitsregel: Klarstellung der Projektleitung vom 2026-10-02, vom Nutzer bestätigt (E10; Fragen und Antworten in Abschnitt 13.3) |
| Kn | Stelle, die Messpaket 2 (M6 bis M8) gemessen hat; Ergebnis und verbleibende offene Teile in Abschnitt 13.1 |
| Platzhalter (Pn) | Wert ohne Messgrundlage und ohne Messauftrag, von dieser Spezifikation gesetzt, damit gebaut und geprüft werden kann; vom Nutzer bestätigt (E10); Liste in Abschnitt 13.2 |

Bezugsframes (wie in `mechanik.md`, ergänzt):

| Zeichen | Bedeutung |
|---|---|
| T(f) | Menge der Tasten, die in Frame f gedrückt sind (Abschnitt 2.1) |
| P | Druckframe: erster Frame, in dem eine Taste gedrückt ist (Schlag, Sprung, Spezialangriff, Waffe, Aufnehmen) |
| D | Druckframe eines Kettenschlags der Stufe 2 bis 4 |
| J, A | Druckframe eines Sprungs bzw. eines Angriffs im Sprung, im Sprint oder im Sprintsprung |
| D2 | zweiter Richtungsdruck beim Doppeltipp des Sprints |
| h | Frame, in dem ein Treffer der Figur die LP eines Gegners senkt |
| H | Frame, in dem ein Gegnertreffer die Figur trifft (LP sinken bzw. Treffer wirkungslos) |
| U | Frame, in dem die Figur nach dem Liegen wieder steht |
| g, K, E | Griff-Frame, Druckframe eines Kniestoßes, Druckframe der Wurfeingabe |
| W | Frame eines umwerfenden Treffers gegen einen Gegner (in `mechanik.md`, „Trefferreaktion der Gegner“ heißt er K) |
| G | erster handlungsfähiger Frame eines Gegners nach dem Aufstehen |
| t | Frame, in dem die LP eines Gegners unter 0 fallen |
| L | Frame, in dem ein Gegenstand landet |
| N, LN | Neueinstieg der Figur nach dem Tod und ihre Landung danach (6.5) |

## 1. Zweck und Abgrenzung

Die Scheibe soll beweisen, dass sich der Kampf Frame für Frame so verhält
wie gemessen: Laufen, Sprung, Kette, Griff, Wurf, Trefferstopp,
Schutzfenster, Sprint und Spezialangriff mit den Zahlen aus `mechanik.md`.
Deshalb ist jede Regel dieses Dokuments eine Aussage über Zeilen des
Frame-Protokolls (Abschnitt 11). Ein Programmierer soll daraus bauen
können, ohne Designfragen zu stellen; wo die Messung fehlt, steht ein
gekennzeichneter Platzhalter.

Inhalt der Scheibe (`design.md`, Abschnitt 8): die Heldin Vela mit dem
Grundkit aus `design.md`, Abschnitt 4, einschließlich Sprint,
Sprintangriff und Sprint-Sprungangriff (E15); der leichte und der schwere Nahkämpfer (Bolzer, Rammbock);
ein Fernkämpfer (Zünder mit Raketenwerfer); der Boss Ballast; Essen und
der Raketenwerfer als Gegenstände; Anzeige, Rang, Tod und Neueinstieg.

Dieses Dokument regelt Figur, Trefferprüfung, Schaden und Schutz, die
Trefferreaktion der Gegner, Griff und Wurf, Sprint und Spezialangriff, die
Waffen- und Essensseite der Gegenstände, Protokoll und Abnahmetests. Wann
und wie Gegner angreifen, Stage, Kamera, Wellen, Rang, Erscheinen der
Gegenstände, Anzeige, Neueinstieg und Zufall regelt Welt 2 bis 11.

Nicht enthalten: Titel, Figurenwahl, zweiter Spieler, die Helden Kord, Rin
und Ollo, Sonderstage, Sound außer Platzhaltern, Waffen außer dem
Raketenwerfer, der Messerkämpfer und sein Messerwurf, das Fahrzeug, Griffe
von Gegnern gegen die Figur (der Boss greift in der Scheibe nicht, im
Vollspiel nach `mechanik.md`, „Boss“: E21; `design-gegner-stages.md`,
Abschnitt 7).

**Technik (E22, E13).** Das Programm ist in TypeScript geschrieben, ohne
npm-Abhängigkeiten. Die Logik dieses Dokuments und der Welt liegt in einem
reinen Logikkern ohne Browser- und ohne Node-Abhängigkeit; die Darstellung
zeichnet über Canvas 2D in einer HTML-Seite und liest den Kern nur (2.5).
Prüfläufe (11.2) und Abnahmetests (Abschnitt 12) laufen in Node, ohne
Fenster; Bildschirmfotos entstehen über Playwright. Die Spielschleife folgt
E13 (2.1): Echtzeit mit 60 Logikschritten je Sekunde, ausgelassene Bilder
statt langsamerer Logik, höchstens 4 Logikschritte je Bild. Ablage,
Befehle, Stand der Abnahme und Festlegungen beim Codieren stehen in
`docs/scheibe.md`.

## 2. Zeit und Raum

### 2.1 Zeit und Eingabe

Die Logik läuft in einem festen Schritt von 60 Hz (E6): genau ein
Logikschritt je Frame, nie ausgelassen und immer mit derselben
Schrittweite. Gespielt wird in Echtzeit mit 60 Logikschritten je Sekunde
(E13): Ist die Darstellung zu langsam, lässt sie Bilder aus; die Logik
läuft nicht langsamer. Je dargestelltem Bild laufen höchstens 4
Logikschritte; wären es mehr, laufen 4, und die übrige Zeit verfällt, das
Spiel bleibt für diesen Rest stehen (kein Aufholen über mehr als 4
Schritte). T(f) wird je Logikschritt bestimmt und aufgezeichnet, auch wenn
mehrere Schritte zu einem Bild laufen. Der Prüflauf läuft ohne Fenster so
schnell wie möglich (11.2). Alle Dauern sind Frames, die Frame-Zahlen aus
`mechanik.md` gelten unverändert („Konventionen“). Frame 1 ist der erste
Logikschritt nach dem Laden einer Stage oder Prüfszene.

Tasten: L (links), R (rechts), O (hoch, in der Tiefe nach hinten), U
(runter, nach vorn), A (Angriff), S (Sprung); dazu P (Pause, außerhalb der
Logik nach Welt 10.4, nicht Teil von T). T(f) wird
zu Beginn von Frame f einmal abgefragt und aufgezeichnet. Der Logikschritt
f wertet T(f−1) aus; eine Taste, die in Frame f gedrückt ist, wirkt also in
f+1 („Konventionen“, Eingabelatenz). Weitere Verzögerung darf es zwischen
Abfrage und Logik nicht geben (`design.md`, Abschnitt 3). Ein **neuer
Druck** einer Taste in f heißt: in T(f), nicht in T(f−1). Angriffe,
Sprünge und Kettenschläge brauchen einen neuen Druck; eine gehaltene Taste
löst nichts erneut aus. L und R zugleich gelten als keine
x-Richtung, O und U zugleich als keine Tiefenrichtung (Platzhalter P1).

**Kein Eingabepuffer.** Ein Druck, den der aktuelle Zustand nicht
annimmt, verfällt und wird nicht nachgeholt; auch das Vorbild verwirft
frühe Drücke in Kette, Kniestoß, Landung und Trefferreaktion („Angriff“,
„Griff und Wurf“, „Spezialangriff“). Wann ein Zustand Drücke annimmt, steht
in 4.3.

### 2.2 Reihenfolge im Logikschritt

Ein Logikschritt besteht aus den Weltschritten W1 bis W8 (Welt 1, „Ablauf
eines Frames“: Eingriffe, Rang, Spawns, Entscheidungen der Gegner,
Kampfschritt, Super-Armor, Kamera, Wellen, Gegenstände, Protokollzeile).
Dieses Dokument regelt den Kampfschritt zwischen W4 und W5:

| Schritt | Inhalt |
|---|---|
| KS1 | T(f−1) übernehmen, neue Drücke bestimmen, Sprint-Erkennung fortschreiben (9.1) |
| KS2 | Figur: Timer zählen (Schutz, Trefferstopp, Griffsperre), Zustandsübergänge nach Abschnitt 4, Bewegung, Begrenzung durch Tiefenband und Wände (Welt 2, 3) |
| KS3 | Gegner in aufsteigender Slotnummer: Reaktionen nach Abschnitt 7, sonst die in W4 entschiedene Bewegung |
| KS4 | Geschosse in aufsteigender Slotnummer: Bewegung, Einschlag |
| KS5 | Abbruchprüfung der Gegnerangriffe (Welt 5) |
| KS6 | Trefferprüfung in der Reihenfolge von 5.4, an den Positionen nach KS2 bis KS4 |
| KS7 | Folgen der Treffer: LP, Reaktionen, Trefferstopp, Kosten des Spezialangriffs, Griff (8.1), Waffe fallen lassen (10.4) |

Im Kampfschritt gilt Kamera-x des Vorframes (W6 folgt danach).

### 2.3 Raum

Drei Achsen, alle in Pixeln des logischen Bildes von 384 × 224
(„Konventionen“; `design.md`, Abschnitt 3):

| Achse | Bedeutung | Richtung |
|---|---|---|
| x | Welt-x des Fußpunkts | wächst nach rechts |
| Tiefe (z) | Lage im begehbaren Streifen | wächst nach hinten (im Bild nach oben) |
| Höhe (h) | Abstand über dem Boden, 0 = Boden | wächst nach oben |

Jede Entität hat eine Blickrichtung b = +1 (rechts) oder −1 (links).
Alle Abstände für Regeln werden an den **ganzzahligen Positionen am Ende
des Frames** gebildet; ⌊v⌋ rundet in Richtung −∞. Für Angreifer a und
Ziel z: dx = ⌊x_z⌋ − ⌊x_a⌋, dz = ⌊z_z⌋ − ⌊z_a⌋, d_vorn = dx · b_a
(Abstand vor dem Angreifer, negativ: hinter ihm). Nur diese Regel gibt im
Vorbild gemeinsame Grenzen für alle Annäherungen (notes.md, „Nachtrag:
Sprung und Schlagreichweite“).

### 2.4 Zahlendarstellung: Festkomma 16.16 (E12)

Verbindlich ist **Festkomma 16.16** (E12) für alle Positionen,
Geschwindigkeiten und Beschleunigungen: eine vorzeichenbehaftete 32-Bit-Ganzzahl, deren
untere 16 Bit den Nachkommaanteil tragen (Wert = Rohwert ÷ 65536). Gründe:

1. Die Grundwerte in `mechanik.md` (Geschwindigkeiten, Beschleunigungen,
   Startwerte der Bahnen) sind exakte Vielfache von 1/65536. Gerundet
   angegebene Messwerte wie der schräge Ansturm des Bosses (3,92 px/Frame,
   Welt 7.3) und eigene Werte wie das Gehen des Rammbocks (1,6 × 0,8
   px/Frame, Welt 5.1) sind es nicht; sie werden einmal als Konstante auf
   1/65536 gerundet, wie die Gehtabelle in Welt 5.3. Exakt sind etwa
   1,75 (Rohwert 114688), 4,9375 (323584), 70/256 (17920), 13/64 (13312),
   0,15625 (10240), 1,755859375 (115072).
2. Grenzen wie 85/86 px hängen am ganzzahligen Anteil; ein
   Rundungsfehler kann einen Treffer um einen Frame verlegen.
3. Ganzzahlarithmetik ist auf jeder Plattform gleich, das Protokoll
   bitgleich (11.6).
4. Das Vorbild rechnet ebenso; die Protokolle sind direkt vergleichbar
   (notes.md, „Gefundene Adressen“).

Rechenregeln: Multiplikation mit 64-Bit-Zwischenwert und arithmetischer
Verschiebung um 16 (rundet in Richtung −∞). Division nur, wo diese
Spezifikation oder Welt sie vorschreibt (hier: Tempostufe des Sprints
⌊(n − 1)/6⌋ in 9.2; in Welt: lineare Verläufe von Bandgrenzen und Ky in
2.1 und 2.4, Pause nach Rang 29 − 4·⌊Rang/4⌋ in 5.1 und 8, Sprungtritt
5.5, Bogen der Waffe 6, x der Körperpresse 7.3 nach k Bahnframes
x(A) + ⌊d·k/64⌋ mit d = Ort der Figur in A minus x(A) in 1/65536,
höchstens 200 px weit, LP nach Rang 8, Flug der Gegenstände 9.3, Zufall
11.1): ganzzahlig durch eine positive ganze Zahl, das Ergebnis rundet in
Richtung −∞ (⌊a/b⌋) auf ganze Einheiten des Zielwerts (Pixel, LP, Frames,
Stufe, Index der Ziehung; beim Sprungtritt und bei der Körperpresse
1/65536); sonst keine Division in der Logik. ±32767 px reichen auch für die Sonderstage (10.800 px). Gleitkomma ist
für diese Größen nicht zulässig (E12): Es ginge nur mit 64-Bit-Zahlen und
Rundung auf 1/65536 nach jeder Operation und ist fehleranfällig.

Die Figur steht auf Höhe 0. Im Vorbild steht sie auf 0,25, weil das
Nachkommawort bei der Landung nicht genullt wird (notes.md, „Gefundene
Adressen“, Höhe); alle Höhenwerte in `mechanik.md` sind Anstiege und
gelten hier ab 0.

### 2.5 Bildschirmposition und Zeichenreihenfolge

| Größe | Regel |
|---|---|
| Bildschirm-x | ⌊x⌋ − Kamera-x |
| Bildschirm-y des Schattens | 234 − (⌊z⌋ − Kamera-y) |
| Bildschirm-y des Fußpunkts | 234 − (⌊z⌋ − Kamera-y) − ⌊h⌋ |
| Zeichenreihenfolge | Hintergrund; alle Schatten; dann Objekte nach ⌊z⌋ absteigend (hinten zuerst); bei gleicher Tiefe Behälter, Gegenstände, Gegner, Figur, Geschosse und Effekte, dann aufsteigende Slotnummer; danach Vordergrundebene (Welt 2), zuletzt Anzeige |

Die Konstante 234 stammt aus der Bildauswertung des Vorbilds
(`scripts/grafik/streifen.py`): Tiefe Kamera-y + 10 liegt am unteren
Bildrand. Kamera und Tiefenbänder legt Welt 2 und 3 fest. Die Darstellung
liest die Logik nur und wirkt nie auf sie zurück.

## 3. Entitäten

Alle Entitäten liegen in einer Objekttabelle mit festen Slots, wie im
Vorbild (notes.md, „Objekt-Slots“), aber ohne Speicheradressen. Ein neuer
Eintrag belegt den kleinsten freien Slot seines Bereichs.

| Bereich | Slots | Inhalt |
|---|---|---|
| Figur | f | Spielfigur (in der Scheibe eine) |
| Gegner | s0 bis s19 | Nahkämpfer, Fernkämpfer, Boss |
| Objekte | o20 bis o59 | Gegenstände, Behälter, geworfene leere Waffen, Geschosse der Gegner, Effekte |
| Geschosse der Figur | g0 bis g4 | Raketen |

Gemeinsame Felder:

| Feld | Inhalt |
|---|---|
| belegt, typ | Slot belegt; Typkennung (Figur, Bolzer, Rammbock, Zünder, Ballast, Puppe, Gegenstand, Behälter, Rakete, …) |
| x, z, h | Position, 16.16 |
| vx, vz, vh, ax, gh | Geschwindigkeiten und Beschleunigungen laufender Bahnen (Sprung, Flug, Rutschen), 16.16 |
| x_vor, z_vor, h_vor | ganzzahlige Position am Ende des Vorframes; für Regeln, die eine Bewegung im Frame brauchen (Wand, Bildrand, Aufwachen; Welt 2 bis 4) |
| lp, lp_vor, lp_max | Lebenspunkte, Vorframe-LP, Höchstwert (vorzeichenbehaftet) |
| zustand | 0 frei, 1 normal (verwundbar), 2 am Boden oder unverwundbar (umgeworfen, liegend, aufstehend, tot, gehalten, wartend, im Auftritt nach Welt 4.2; wartend und im Auftritt nicht treffbar und nicht greifbar, beschlossen E10), 3 Trefferreaktion bzw. geschützt |
| aktion, phase | Aktion (Codes in 4.3 und 7) und Unterphase (Stufe, Variante, Abschnitt) |
| uhr | Aktionsuhr: Frames seit Aktionsbeginn ohne Stoppframes (Beginn = 1) |
| stopp | verbleibende Stoppframes des Trefferstopps (5.3) |
| anim | Animationszeiger: Animation, Bild, Restdauer; läuft mit der Aktionsuhr |
| blick | +1 oder −1 |
| angriff | laufende Angriffsinstanz: Kennung, Trefferfläche, Schaden (beim Angriffsbeginn festgelegt), Umwerfen, Menge der schon getroffenen Ziele |
| letzter_angreifer | Slot des Angreifers beim letzten Treffer (für Flugrichtung, Anzeige, Punkte) |
| timer | je Entität benannte Zähler (siehe unten) |

Zusätzliche Felder je Entität:

| Entität | Felder |
|---|---|
| Figur | schutz (Schutz-Timer), kombo (0 bis 4), kombo_h (Frame des letzten Kettentreffers), griff_ziel, griffsperre, haltefrist, waffe, munition, sprint_n (Sprintframe), sprint_tempo, tipp (Zustand der Sprint-Erkennung), liege_druecke |
| Gegner | rolle, vorplatziert, rang_beim_erscheinen, gehalten_von, liegedauer, reaktion_h (Frame des letzten Treffers); Logikfelder nach Welt 5 bis 7 |
| Geschoss | besitzer, flugphase (Flug, Explosion), lebensdauer, einschlag_x |
| Gegenstand | art (Kometenbraten, Eisnudelschale, Sternbeeren, Raketenwerfer), munition, liegezeit, aufnehmbar |
| Behälter | inhalt, zerbrochen |

## 4. Zustandsautomat der Figur

### 4.1 Grundregeln

- **Aktionsuhr.** Jede Aktion beginnt mit uhr = 1 im ersten Frame der
  Aktion. In Stoppframes (5.3) bleibt sie stehen, ebenso Bewegung,
  Animation und Trefferfläche der Aktion.
- **Blickrichtung.** Laufen mit L oder R setzt den Blick im ersten
  Bewegungsframe ohne Verzögerung; Laufen nur in der Tiefe lässt ihn.
  In allen anderen Zuständen bleibt er stehen, auch beim Rückwärtssprung
  („Bewegung“; notes.md, „Nachtrag: Sprungangriff“).
- **Zustand.** zustand = 3, solange schutz > 0 ist oder der Spezialangriff
  läuft; 2 in UMGEWORFEN, LIEGEN, AUFSTEHEN, TOT; sonst 1. Verwundbar ist
  die Figur nur mit zustand = 1 (Abschnitt 6.3).
- **Kombostufe.** kombo ist die Stufe des laufenden Kettenschlags, sonst 0.

### 4.2 Vorrang der Drücke in STAND, LAUF und SPRINT

Geprüft in dieser Reihenfolge auf T(f−1); der erste passende Eintrag gilt.

| Rang | Bedingung | Ergebnis | Quelle |
|---|---|---|---|
| 1 | A und S beide neu, LP > 0 | SPEZIAL | „Spezialangriff“, Auslösung |
| 2 | A neu, Figur im SPRINT | SPRINTANGRIFF | „Sprint“ |
| 3 | A neu, Gegenstand in Aufnahmereichweite (10.1) | AUFNEHMEN | „Gegenstände und Waffen“, Aufnehmen |
| 4 | A neu, Figur hält eine Waffe | WAFFE | „Gegenstände und Waffen“, Waffen allgemein |
| 5 | A neu (auch A und S neu bei LP = 0) | SCHLAG (Stufe nach 5.6) | „Angriff (Standardschlag, Kette)“, „Spezialangriff“ |
| 6 | S neu | im SPRINT: SPRINTSPRUNG, sonst SPRUNG | „Sprung“, „Sprint“ |
| 7 | Doppeltipp erkannt (9.1) | SPRINT | „Sprint“ |
| 8 | Richtung in T(f−1) | LAUF bzw. Sprint fortsetzen (9.2) | „Bewegung“ |
| 9 | sonst | STAND | „Bewegung“ |

Der Griff entsteht am Ende eines LAUF-Frames (8.1). Kommt die zweite
Taste einen Frame später, gilt die erste: erst A gibt den Schlag, erst S
einen Sprung mit Sprungangriff („Spezialangriff“, Auslösung).

### 4.3 Zustände

„Drücke ab X“ heißt: Tasten aus T(f) mit f ≥ X wirken, also frühestens in
X+1. Tasten aus früheren Frames verfallen, auch gehaltene Richtungen; eine
über X hinaus gehaltene Richtung wirkt ab X+1 (Beispiel Landung: Richtung
seit dem Absprung gehalten, Bewegung erst ab J+49, „Sprung“). Die
Protokollspalte f_akt zeigt den Folgezustand schon ab X.

| Aktion | Eintritt | Dauer | Ausgänge | Drücke ab | Bewegung | Quelle |
|---|---|---|---|---|---|---|
| STAND | Ende einer Aktion; aus LAUF im zweiten Frame nach dem letzten gedrückten Richtungsframe | unbegrenzt | 4.2 | jederzeit | keine | „Bewegung“ |
| LAUF | Richtung in T(f−1), Rang 8 in 4.2 | solange gedrückt; gedrückt in P bis q, Bewegung in P+1 bis q+1 | 4.2; GRIFF (8.1) | jederzeit | x 1,75, Tiefe 1,0, diagonal 1,25 und 0,75 px/Frame; ohne Anlauf, Bremsweg und Wendeverzögerung | „Bewegung“ |
| SPRINT | Doppeltipp (9.1), Sprintframe 1 = D2+1 | solange die Richtung gehalten ist, höchstens 90 Sprintframes | 9.2; SPRINTANGRIFF, SPRINTSPRUNG, SPEZIAL; kein Griff | jederzeit | Tabelle 9.2 | „Sprint“ |
| SPRUNG | S neu in J | Aktion ab J+1, Absprung J+2, Luft J+2 bis J+41, Aufsetzen J+42 | SPRUNGANGRIFF (A neu in J+1 bis J+41), LANDUNG, UMGEWORFEN | A ab J+1; O, U jederzeit | 4.4 | „Sprung“ |
| LANDUNG | Aufsetzen (J+42; mit Sprungangriff 1 Frame später, je Frame mit Treffer 7 Frames später; im Sprintsprung mit Sprint-Sprungangriff ohne den Frame Pause und 7 Frames später nur nach einem Treffer in A+13, Treffer ab A+20 verschieben nichts, 9.3) | 6 Frames (J+42 bis J+47) | STAND ab J+48; A und S neu in Landeframe 1 bis 5: neuer SPRUNG ab Druck+1, A verfällt; Druck in Landeframe 6 verfällt; S allein ebenso (P2); alle anderen Drücke verfallen | J+48 | x im Aufsetzframe noch 2,25 (Teil der 41 Frames), sonst keine | „Sprung“, „Spezialangriff“ (Einschränkungen) |
| SCHLAG Stufe 1 | A neu in P (4.2 Rang 5), keine laufende Kette (5.6) | Aktion ab P+1; aktiv P+2 bis P+5 (uhr 2 bis 5) | mit Treffer h: Stufe 2 bei A neu in h+12 bis h+27; Pose ohne Druck bis h+27, STAND ab h+28. Ohne Treffer: LEERSCHLAG | mit Treffer: A und S ab h+12, Richtung mit L oder R ab h+13 (Bewegung ab h+14); Richtung nur in der Tiefe bricht die Pose nicht ab (Bewegung ab h+29, P31) | keine | „Angriff (Standardschlag, Kette)“; Tiefe: notes.md, „Nachtrag: Rest der Spielfigur“ (nur Messagent, unsicher; `mechanik.md`, „Nicht übernommen“) |
| LEERSCHLAG | Stufe 1 ohne Treffer in uhr 2 bis 5 | Aktion P+1 bis P+16 | STAND ab P+17; Drücke nach 4.2 (A beginnt eine neue Kette) | A und S ab P+7 (wirken P+8), Richtung ab P+8 (Bewegung ab P+9) | keine | „Angriff“, Recovery Leerschlag; notes.md, „Nachtrag: Rest der Spielfigur“ |
| SCHLAG Stufe 2 | A neu in D = h₁+12 bis h₁+27 | Aktion ab D+1; aktiv D+3 bis D+6 | mit Treffer h₂: Stufe 3 bei A neu in h₂+11 bis h₂+26; Pose ohne Druck bis h₂+26, STAND ab h₂+27. Ohne Treffer: Aktion D+1 bis D+16, STAND ab D+17 (K1) | mit Treffer: A und S ab h₂+11, Richtung mit L oder R ab h₂+12 (Bewegung ab h₂+13), nur Tiefe Bewegung ab h₂+28; ohne Treffer: A und S ab D+7 (A beginnt eine neue Kette), Richtung ab D+8 | keine | „Angriff“, Kettenstufen; notes.md, „Nachtrag: Rest der Spielfigur“ |
| SCHLAG Stufe 3 | A neu in D = h₂+11 bis h₂+26 | Aktion ab D+1; aktiv D+4 bis D+7 | mit Treffer h₃: Stufe 4 bei A neu in h₃+11 bis h₃+26; Pose bis h₃+26, STAND ab h₃+27. Ohne Treffer: Aktion D+1 bis D+17, STAND ab D+18 (K2) | mit Treffer wie Stufe 2; ohne Treffer: A und S ab D+8, Richtung ab D+9 (Bewegung ab D+10) | keine | wie oben |
| SCHLAG Stufe 4 | A neu in D = h₃+11 bis h₃+26 | Aktion ab D+1; aktiv D+3 bis D+6, ohne Treffer dort erneut D+17 bis D+20 | nicht abbrechbar: Aktion uhr 1 bis 25 (je Frame mit Treffer 7 Stoppframes: mit einem Treffer D+1 bis D+32), dann STAND (K3) | ab dem Frame nach der Aktion (mit einem Treffer D+33, ohne D+26) | keine | wie oben |
| SPRUNGANGRIFF (N, R, H, T) | A neu in A = J+1 bis J+41 im SPRUNG; Variante nach 5.2 | Aktion ab A+1 bis zur Landung, Variante H nur bis A+29 (mit Treffer A+36), danach SPRUNG (Fallpose); Höhe steht in A+1 einen Frame still (notes.md, „Nachtrag: Rest der Spielfigur“) | LANDUNG, UMGEWORFEN | keine bis zur Landung | Sprungbahn läuft weiter, steht in A+1 und in Stoppframes | „Sprungangriff“ |
| GRIFF | Bedingung 8.1 am Ende eines LAUF-Frames g | Halten bis zum Losreißen in g+61 (nach Kniestoß 8.3) | KNIESTOSS, WURF, SPRUNG (lässt los), SPEZIAL, GETROFFEN, STAND nach Losreißen | g+1 bis g+60; Druck in g verfällt | keine | „Griff und Wurf“ |
| KNIESTOSS | A neu ohne Richtung (oder mit L und R) im GRIFF, Druck K | Treffer K+5; gehalten ab K+23 | GRIFF; nach dem dritten STAND | K+18; K+2 bis K+17 verfallen | keine | „Griff und Wurf“ |
| WURF | A neu mit Richtung im GRIFF, Druck E | Figur gebunden E+1 bis E+37 | STAND ab E+38 | E+38 | keine | „Griff und Wurf“ |
| SPEZIAL | 9.4 | P+1 bis P+50, je Bild mit Treffer 7 Frames mehr | STAND | Frame nach dem Ende (ohne Treffer P+51; Druck in P+50 verfällt) | keine; eine Laufbewegung stoppt in P+1 | „Spezialangriff“ |
| SPRINTANGRIFF | A neu in A, Figur in A im SPRINT | A+1 bis A+35, mit Treffer 7 Frames je Frame mit Treffer mehr | STAND | A+36 (Bewegung ab A+37), mit Treffer A+43 | Rutschen (9.3) | „Sprint“ |
| SPRINTSPRUNG | S neu in J im SPRINT | wie SPRUNG nach vorn in Sprintrichtung | Angriff: Sprint-Sprungangriff (A neu in J+1 bis J+41, 9.3, E15); LANDUNG | wie SPRUNG | wie Vorwärtssprung, Sprinttempo verfällt | „Sprint“ |
| GETROFFEN | wirksamer Gegnertreffer in H ohne Umwerfen, Figur am Boden, LP danach ≥ 0 | 27 Frames, H bis H+26 (schutz = 27 in H) | SPEZIAL bei A und S neu in H+8 bis H+26 (ab Druck+1); STAND in H+27 (P3) | H+27 (P3); Drücke in H bis H+7 verfallen, in H+8 bis H+26 außer dem Spezialangriff ebenso (P3) | keine (P3) | „Unverwundbarkeit“, „Spezialangriff“ |
| UMGEWORFEN | wirksamer Treffer mit Umwerfen, jeder wirksame Treffer bei h > 0, LP < 0 (dann TOT) | Flug F1 (5.7) vom Angreifer weg: H+1 bis H+8 Stillstand, Bodenkontakt H+46, Ruhe H+55 | LIEGEN ab H+54 | keine; Drücke im Flug zählen nicht | Bahn F1 | „Umgeworfen werden“, „Schaden der Gegner“ |
| LIEGEN | H+54 | bis L_end = H+94 oder 2 Frames nach dem sechsten Druck (siehe unten) | AUFSTEHEN | nur Zählen der Drücke | keine | „Umgeworfen werden“ |
| AUFSTEHEN | L_end+1 | 26 Frames | STAND in U = L_end+27 mit schutz = 35 | U (P4) | keine | „Umgeworfen werden“, „Unverwundbarkeit“ |
| TOT | wirksamer Treffer in t, nach dem die LP unter 0 liegen | Bahn F4 (Bodenkontakt t+40), Neueinstieg in t+120 bei jeder Todesart (E16, 6.5) | NEUEINSTIEG (6.5) | keine | Bahn F4 | „Schaden der Gegner“ (Tod); notes.md, „Nachtrag: Rest der Spielfigur“ |
| WAFFE | A neu mit Waffe (4.2 Rang 4) | Raketenwerfer: P+1 bis P+17 | STAND | P+18 (P5) | keine (P5) | „Gegenstände und Waffen“ |
| AUFNEHMEN | A neu, Gegenstand in Reichweite (10.1), Figur am Boden | Wirkung in P+1, Aktion P+1 bis P+7 | STAND | P+8 | keine | „Gegenstände und Waffen“, Aufnehmen |
| NEUEINSTIEG | N = t+120 (6.5) | Erscheinen in N+1, Fall bis LN = N+53, Landung LN bis LN+5 | STAND ab LN+6; S neu in LN bis LN+4: neuer SPRUNG ab Druck+1 | A ab LN+6, Richtung ab LN+6 (Bewegung ab LN+7); S siehe Ausgänge, Druck in LN+5 verfällt | Fall (P28) | notes.md, „Nachtrag: Rest der Spielfigur“ |

**Liegen und Aufstehen im Einzelnen.** Ohne Drücke steht die Figur in
U = H+121 („Umgeworfen werden“). Jeder Frame ab H+54, in dem A oder S neu
gedrückt ist, zählt einen Druck (A und S zugleich zählen einmal);
Richtungen zählen nicht. Mit dem sechsten Druck in Frame q endet das
Liegen in L_end = q+2, falls das vor H+94 liegt; dann folgen 26 Frames
Aufstehen. Das ergibt die gemessenen Zeiten: Druck in jedem Frame U =
H+88, jeden 2. Frame H+93, jeden 4. Frame H+103, jeden 8. Frame H+121
(„Umgeworfen werden“). H+54 und die 26 Frames stammen aus notes.md,
„Nebenbefunde aus Aufgabe 4“ (unsicher), reproduzieren aber alle
gesicherten Zeiten. Die seltene Variante mit 138 px und 122 Frames entfällt.

### 4.4 Bewegung im Sprung

Je Luftframe: h += vh, danach vh −= 0,25. Start in J+2 mit vh = 4,9375.
Scheitel 51,25 in J+21; h(J+41) = 2,5; in J+42 wird h ≤ 0 und auf 0
gesetzt (Aufsetzen). x ändert sich in J+2 bis J+42 um ±2,25 je Frame, wenn
T(J) L oder R enthält (Weite 92,25), sonst nicht; in der Luft ist x nicht
steuerbar. Die Tiefe ändert sich in jedem Luftframe um ±0,5, wenn
T(f−1) O oder U enthält. Die Tastendauer hat keinen Einfluss („Sprung“).
Im Sprungangriff entfällt der Schritt in A+1 und in jedem Stoppframe
(Höhe, x und Tiefe stehen).

## 5. Trefferprüfung

### 5.1 Abstände und Flächen

Eine Trefferfläche ist ein Bereich von Abständen (2.3), keine
Bildüberlappung (`design.md`, Abschnitt 3): d_vorn von −hinten bis +vorn,
|dz| ≤ Tiefe, dazu eine Grenze für die Höhe des Angreifers; die Zielhöhe
zählt nicht (P6). Alle Reichweiten, Griffweiten, Aufnahmebereiche und
Explosionsgrenzen der Figur gelten für beide Blickrichtungen gleich, mit
den Werten für Blick rechts aus `mechanik.md` (E14; 5.2, 8.1, 10.1, 10.3).
Die Abweichungen des Vorbilds bei Blick links (Kette und Sprungangriff
neutral und Richtung 1 px kürzer, K9; Raketenexplosion ab 96 statt 97 px;
Griff vorn 38, von hinten 25 px; Aufnahmebereiche) sind nicht übernommen.
E14 betrifft die Figur; die gemessenen Flächen der Gegnerangriffe und
Geschosse (Welt 5 bis 7) bleiben, wie sie sind.

### 5.2 Angriffe der Figur

| Angriff (Code) | aktiv | vorn | hinten | Tiefe | Höhe der Figur | Schaden | Umwerfen | Trefferstopp | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Kette Stufe 1 (KT1) | P+2 bis P+5 | 85 | 28; Ziel schaut weg: 4 (K8) | 12 (E9: Grenzfall 12 trifft) | Boden | 3 | nein | ja | „Angriff (Standardschlag, Kette)“; hinten: notes.md, „Nachtrag: Rest der Spielfigur“; beide Blickrichtungen: E14 |
| Kette Stufe 2 (KT2) | D+3 bis D+6 | 87 | 26; weg: 2 | 12 | Boden | 4 | nein | ja | wie oben |
| Kette Stufe 3 (KT3) | D+4 bis D+7 | 91 | 26; weg: 2 | 12 | Boden | 5 | nein | ja | wie oben |
| Kette Stufe 4 (KT4) | D+3 bis D+6, ohne Treffer dort D+17 bis D+20 | 100 | 25; weg: 1 | 12 | Boden | 10 | ja, F1 in Blickrichtung | ja | wie oben |
| Sprungangriff neutral (SN) | A+5 bis A+28, solange in der Luft | 76 | 27 | 12 | ≤ 45 | 7 | ja, F1 in Blickrichtung | ja | „Sprungangriff“ |
| Sprungangriff Richtung (SR) | wie SN | 99 | 24 | 12 | ≤ 41 | 7 | ja, F1 in Blickrichtung | ja | wie oben |
| Sprungangriff hoch (SH) | A+7 bis A+10, solange in der Luft (K4) | 85 | 32 | 12 | ≤ 48 | 12 | ja, F1 in Blickrichtung | ja | notes.md, „Nachtrag: Rest der Spielfigur“ |
| Sprungangriff runter (ST) | A+9 bis A+32, solange in der Luft (K5) | 42 | 41 | 12 | ≤ 41 | 4 | nein | ja | notes.md, „Nachtrag: Rest der Spielfigur“ |
| Sprintangriff (SA) | A+5 bis A+14 | 105 | 26 | 12 | Boden | 9 | ja, F1 in Blickrichtung | ja | „Sprint“ |
| Sprint-Sprungangriff (SS) | A+13 (Figur ≤ 16 hoch) und A+20 bis A+39 (≤ 20), auch nach der Landung | 147 | −38 (erst ab 38 vor der Figur) | 12 | siehe aktiv | 13 | ja, F1 in Blickrichtung (Festlegung wie bei den übrigen umwerfenden Angriffen der Figur; im Vorbild fällt der Gegner unsicher auf der Stelle, mechanik.md, „Nicht übernommen“) | nur in A+13 (9.3) | „Sprint“; Reichweite außer A+20: P7, E15; Trefferstopp: notes.md, „Nachtrag: Sprint“ |
| Kniestoß (KN) | K+5, nur der gehaltene Gegner | – | – | – | Boden | 4 | beim dritten, Bahn F2 | nein | „Griff und Wurf“ |
| Wurf (WU) | E+1, nur der gehaltene Gegner | – | – | – | Boden | 14 | ja, Bahn F3 | nein | „Griff und Wurf“ |
| Geworfener Gegner (WG) | E+1 bis E+58 | \|dx\| ≤ 52 um den Geworfenen (P8) | – | 17 | – | 3 | ja, F1 in seiner Flugrichtung | nein | „Griff und Wurf“ |
| Spezialangriff (SP) | P+8 bis P+43 (uhr 8 bis 43), Fläche nach 9.4 | 43 bis 123 | 42 bis 122 | 28 | Boden | 6 | ja, F1 von der Figur weg | je Bild (9.4) | „Spezialangriff“ |
| Raketenexplosion (RX) | P+28 bis P+42 (frei fliegend) | Einschlag −66 bis +90 in Flugrichtung (beide Blickrichtungen, E14) | – | 28 | – | 8 | ja, F1 in Flugrichtung (P9) | nein | „Gegenstände und Waffen“ |

Variante des Sprungangriffs (Unterphase T, R, H, N): runter (T), wenn
T(A) U enthält, auch nach einem Sprung mit Richtung (notes.md, „Nachtrag: Rest der Spielfigur“); sonst Richtung
(R), wenn T(J) L oder R enthielt; sonst hoch (H), wenn T(J) O enthielt
(Vorrang vor H: P10); sonst neutral (N). Ein Angriff ab A = J+38 bleibt
ohne aktiven Frame, weil die Figur vorher landet („Sprungangriff“,
Zeitfenster). Die Kette hat keinen Mindestabstand (trifft bei d_vorn 0);
nach hinten reicht sie je nach Blickrichtung des Ziels: schaut es zur
Figur, gilt der erste Wert, schaut es weg, der zweite (K8). Ein Gegner in
seiner Trefferreaktion dreht sich nicht um.

### 5.3 Aktive Frames und Trefferstopp

Aktive Frames zählen nach der Aktionsuhr („P+2 bis P+5“ = uhr 2 bis 5).
Trifft eine Angriffsinstanz der Figur in Frame f mindestens ein Ziel
wirksam, setzt KS7 stopp = 7; f+1 bis f+7 sind **Stoppframes**:
Aktionsuhr, Bewegung, Animation und Trefferfläche der Figur stehen, die
Instanz prüft nicht, stopp zählt 6 bis 0. Danach verschieben sich die
restlichen aktiven Frames um 7. Das ergibt die Messwerte: Schlagbild 4 + 7
= 11 Frames, handlungsfähig ab h+13 statt P+8 (notes.md, „Messungen im
Einzelnen“). Mehrere Treffer im selben Frame geben einen Stopp; der
Spezialangriff stoppt höchstens einmal je Flächenstufe (9.4), der
Sprint-Sprungangriff nur bei einem Treffer in A+13 (9.3); Kniestoß,
Wurf, geworfener Gegner und Explosion stoppen nicht (feste gemessene
Abläufe). Der Getroffene hat keine Stoppframes, die seine Reaktion
verlängern; sein Stillstand h+1 bis h+8 liegt innerhalb der 23 Frames
(Abschnitt 7, E3).

### 5.4 Reihenfolge der Prüfung im Frame

1. Angriffe der Figur und ihrer Geschosse gegen Gegner und Behälter,
   Gegner in aufsteigender Slotnummer.
2. Geworfener Gegner gegen andere Gegner und Behälter.
3. Angriffe der Gegner und ihrer Geschosse gegen die Figur, in
   aufsteigender Slotnummer. Ein Gegner, der in Punkt 1 oder 2 desselben
   Frames wirksam getroffen wurde oder stirbt, prüft nicht mehr: Sein
   Angriff ist abgebrochen. Ausnahme Boss (Welt 7.4, SA3): Ein Treffer von
   vorn bricht seinen Angriff nicht ab; er prüft nur in diesem Frame nicht
   und ab dem nächsten wieder.

Folge: Wird ein Angriff der Figur im selben Frame aktiv wie der eines
Gegners, gewinnt die Figur; ist der Gegner einen Frame früher aktiv, trifft
er zuerst, die Figur geht in GETROFFEN, und ihr Angriff endet („Schaden der
Gegner“, Gleichzeitiger Treffer; mit Skript bestätigt, K12, notes.md, „Nachtrag: Rest der Spielfigur“). Ein
sterbender Gegner trifft die Figur nie, auch nicht im ersten aktiven Frame
seines Angriffs („Trefferreaktion der Gegner“, Tod).

### 5.5 Ein Treffer je Ziel, mehrere Ziele

Jede Angriffsinstanz (ein Kettenschlag je Stufe, ein Sprung-, Sprint-
oder Sprint-Sprungangriff, ein Spezialangriff, ein Wurfgeschoss, eine
Explosion) führt die Menge ihrer getroffenen Ziele und trifft jedes
höchstens einmal, aber alle passenden Ziele im selben Frame, jedes mit
vollem Schaden („Trefferreaktion der Gegner“, Mehrere Gegner). Nicht treffbar sind Gegner in Zustand 0 und
2 (umgeworfen, liegend, aufstehend, tot, wartend, im Auftritt; gehaltene nur für
Kniestoß, Wurf und Spezialangriff der haltenden Figur). Gegner in Zustand 3
(Trefferreaktion) sind treffbar. Ein nicht treffbares Ziel bleibt für
spätere aktive Frames derselben Instanz offen. Behälter zerbrechen beim
ersten Treffer jeder Angriffsinstanz, auch eines Gegners (Welt 9); für den
Spezialangriff zählt das als Treffer (6.4). Treffer im Schutz der Figur
zählen für den Angreifer nicht (P11).

### 5.6 Kette und Kombofenster

Die Kette läuft nur im Zustand SCHLAG. Ein neuer A-Druck in D wird so
behandelt:

| Lage | D | Ergebnis |
|---|---|---|
| Stufe 1 hat in h₁ getroffen | h₁+1 bis h₁+11 | verfällt |
| | h₁+12 bis h₁+27 | Stufe 2 ab D+1 |
| | ab h₁+28 (Figur in STAND) | neue Kette, Stufe 1 |
| Stufe 2 oder 3 hat in h getroffen | h+1 bis h+10 | verfällt |
| | h+11 bis h+26 | nächste Stufe ab D+1 |
| | ab h+27 (P12) | neue Kette, Stufe 1 |
| Stufe hat nichts getroffen | – | keine Folgestufe; LEERSCHLAG bzw. Nachlauf der Stufe (4.3) |

Das Fenster ist 16 Frames lang („Angriff“, Kombo-Fenster); die
Kombostufe zählt je Schlag, nicht je Ziel. Verlässt die Figur SCHLAG,
endet die Kette (P12).

**Richtung beim Kettendruck** (Stufe 2 bis 4, K10; notes.md, „Nachtrag:
Rest der Spielfigur“): Enthält T(D) die Blickrichtung, macht die Figur einen Ausfallschritt: x rückt in
D+1 bis D+4 um 8, 6, 4 und 2 px in Blickrichtung vor (20 px), die aktiven
Frames sind D+9 bis D+12 (Stufe 3: D+8 bis D+11), Schaden und Kette
bleiben. Enthält T(D) die Gegenrichtung, dreht sich die Figur in D+1 um und
macht denselben Schritt 20 px in die neue Blickrichtung, ohne aktive
Frames; die Kette ist abgebrochen, ein Folgedruck beginnt mit Stufe 1. O
und U ändern nichts. Reichweite und Nachlauf nach P29.

### 5.7 Umwerfen und Flugbahnen

Ein umwerfender Treffer schickt das Ziel auf eine der folgenden Bahnen.
Je Bahnframe: x += vx · Richtung, danach vx −= ax; h += vh, danach
vh −= gh; wird h ≤ 0, ist h = 0 (Bodenkontakt). Nach dem Bodenkontakt
läuft x bis zur Ruhe weiter; die Höhe des flachen Rückpralls ist reine
Darstellung (P13). Die Tiefe bleibt.

| Bahn | Stillstand | erster Bahnframe | vx, ax | vh, gh | Bodenkontakt | Ruhe | Quelle |
|---|---|---|---|---|---|---|---|
| F1 Umwerfen | W+1 bis W+8 | W+9 | 2,875; 0 | 5,0; 70/256 | W+46 bei 109,25 | W+55 bei 135,125 vom Trefferort | „Trefferreaktion der Gegner“, „Umgeworfen werden“ |
| F2 dritter Kniestoß | W+1 bis W+8 in 16 px Höhe | W+9 | 2,875; 0 | aus 16: 5,0; 70/256 | W+49 bei 117,875 | W+58 bei 143,75 | „Trefferreaktion der Gegner“ |
| F3 Wurf | getragen E+1 bis E+21, losgelassen E+22 in 59 px Höhe | E+23 | 5,0; 1/16 | 2,0; 13/64 | E+59 bei 143,375 | E+71 bei 171,5 ab dem Loslassen | „Griff und Wurf“ |
| F4 Tod | t+1, t+2 | t+3 | wie F1 | wie F1 | t+40 | t+49 | „Trefferreaktion der Gegner“, Tod |
| F4b Tod durch Stufe 2 | wie F4 | t+3 | wie F1, ab t+41 Rollen 2,0 je Frame | wie F1 | t+40 | Rollen bis t+72 | wie oben |

Richtung: wie in Tabelle 5.2 („in Blickrichtung“ der Figur, „von der Figur
weg“ beim Spezialangriff, sonst nach P9). Die Figur selbst fliegt auf F1
vom Angreifer weg (Vorzeichen von x_Figur − x_Angreifer, bei Gleichheit in
dessen Blickrichtung, P14). Wird die Figur in der Luft getroffen, beginnt
F1 in der aktuellen Höhe, und die 8 Stillstandsframes gelten dort (P15).
Geworfene Gegner bleiben höchstens 96 px außerhalb des Bildes; Wände
stoppen sie („Griff und Wurf“, Grenzen; Wände nach Welt 2).

### 5.8 Gegnerangriffe gegen die Figur

Welche Gegnerangriffe wann aktiv sind, mit welcher Trefferfläche, welchem
Schaden und welchem Abbruchfenster, regelt Welt 5 bis 7 nach „Reichweite
der Gegnerangriffe“. Ein Gegnerangriff ist eine Angriffsinstanz wie in 5.5
und trifft die Figur in seinem ersten aktiven Frame, in dem sie in der
Fläche steht. Ist die Figur dort geschützt, ist der Treffer wirkungslos
(6.3). Nach einem wirksamen Treffer gilt der Trefferstopp des Gegners nach
Welt 5. Für die Scheibe gilt (beschlossen, E10; ohne Griff, E21): Der
Ansturm des Bosses wirft die Figur bei Kontakt um (12 bis 17 LP nach
Rang). Geschosse
der Gegner regelt Welt 6 nach notes.md, „Nachtrag: Fernangriffe der
Gegner“ (K15): Die Rakete trifft im Flug nicht, ihre Explosion trifft die
Figur nur bis 25 px Höhe, ein Schlag zerstört kein Geschoss, Geschosse
treffen keine Gegner. Im Schutz bleibt es bei E2: Auch Geschosse sind dort
wirkungslos (P17, E10).

## 6. Schaden, LP, Schutz

### 6.1 Lebenspunkte

Die Figur hat 72 LP („Lebenspunkte“), die Gegner nach Welt 5 bis 8. LP
sind vorzeichenbehaftete Ganzzahlen.

### 6.2 Schaden anwenden

Ein wirksamer Treffer senkt die LP des Ziels im Frame der Prüfung um den
Schaden der Instanz. Danach gilt für Gegner Abschnitt 7, für die Figur:
LP < 0 → TOT; sonst UMGEWORFEN, wenn der Angriff umwirft oder die Figur in
der Luft ist (K11, mit Skript bestätigt: notes.md, „Nachtrag: Rest der Spielfigur“); sonst GETROFFEN. Der Zustand der Figur
ändert den Schaden nicht („Schaden der Gegner“). Ein wirksamer Treffer
beendet einen Griff (P16) und lässt eine Waffe fallen (10.4).

Gegner mit Super-Armor (der Boss): Welche Treffer zählen und wann die LP
zurückspringen, regelt Welt 7. Im Vorbild (notes.md, „Nachtrag: Boss“)
werden Spezialangriff, Kniestoß, Wurf, Rakete und Laser nie
zurückgewiesen, Kette, Sprungangriff neutral und hoch sowie Sprintangriff
manchmal (Regel unsicher, K13); dann steigen die LP in h+1 auf den Wert
vor diesem Treffer. Die Scheibe weist nicht zufällig zurück, sondern folgt
der festen Regel SA1 bis SA6 aus Welt 7.4 (E11).

### 6.3 Schutz der Figur

Gegnertreffer sind wirkungslos, solange die Figur geschützt ist (zustand
2 oder 3). Die Gegner greifen trotzdem an und prüfen ihre Flächen wie
sonst (E2): kein LP-Verlust, keine Reaktion, kein Waffenverlust, kein
Ende eines Griffs, kein Trefferstopp des Angreifers (P11). Das gilt auch für Geschosse (P17, E10).

| Fenster | geschützt | verwundbar ab | Quelle |
|---|---|---|---|
| nach einem Treffer | H bis H+26 (27 Frames; schutz = 27 in H, 0 in H+27) | H+27 | „Unverwundbarkeit“ |
| umgeworfen, liegend, aufstehend | H bis U−1 (zustand 2) | – | „Unverwundbarkeit“, Liegen |
| nach dem Aufstehen | U bis U+34 (35 Frames; schutz = 35 in U) | U+35 | „Unverwundbarkeit“ |
| Spezialangriff | ab P+1 während der Aktion, danach 20 Frames schutz; ohne Treffer P+1 bis P+70, mit einem Bild mit Treffer bis P+77 | P+71 bzw. P+78 | „Spezialangriff“, Schutz |
| nach dem Neueinstieg | N+1 bis LN+199 (schutz = 200 ab N+1, zählt ab LN+1; bei Landung auf dem Boden 252 Frames) | LN+200 | notes.md, „Nachtrag: Rest der Spielfigur“; beschlossen (E10) |

Ein Treffer in H+27 bzw. U+35 ist wirksam (notes.md, „Messgrößen“:
mehrfach genau beim Ablauf). schutz zählt in KS2 vor der
Trefferprüfung herunter.

### 6.4 Kosten des Spezialangriffs

Trifft ein Spezialangriff mindestens ein Ziel (Gegner oder Behälter),
kostet er die Figur einmal 9 LP, abgezogen in h+8 (h = Frame des ersten
Treffers, in echten Frames gezählt). Die LP fallen dabei höchstens auf 0;
die Figur stirbt dadurch nicht. Ohne Treffer ist er kostenlos. Mit 0 LP
gibt es keinen Spezialangriff, A und S geben den Schlag („Spezialangriff“,
Kosten und LP-Untergrenze).

### 6.5 Tod der Figur

Die Figur stirbt erst, wenn ein Gegnertreffer ihre LP unter 0 bringt; mit
genau 0 LP spielt sie weiter („Schaden der Gegner“, Tod). Leben, Rang −3
und Anzeige regelt Welt 8 und 10. Ablauf für die Figur (K7; notes.md,
„Nachtrag: Rest der Spielfigur“):

| Größe | Wert |
|---|---|
| Tod (t) | Bahn F4 vom Angreifer weg, Bodenkontakt t+40; Neueinstieg N = t+120 bei jeder Todesart (E16) |
| Sonderfall Wand | nicht in der Scheibe (E16): Eine Begrenzung hält den Flug nur in x auf (Welt 2.2), Bodenkontakt t+40 und N = t+120 bleiben. Vorbild: endet der Flug vor t+40 an einer Begrenzung der Stage oder einer Sperre (Bildränder zählen nicht), senkrechter Fall, N = t+108 |
| Sonderfall Rollen | nicht in der Scheibe (E16): kein Rollen nach dem Bodenkontakt, N = t+120. Vorbild: nach einem tödlichen Treffer von vorn mit Rollmerkmal (Attribut-Bit 0x0400) 32 Frames Rollen mit 2,0 px/Frame, N = t+151 |
| Neueinstieg N | LP 72 |
| Erscheinen in N+1 | x = Kamera-x + 64, Tiefe = Kamera-y + 48, Höhe 256, Blick rechts; schutz = 200, zustand 3 |
| Fall | keine Eingabe wirkt; Landung LN = N+53 (= t+173) auf dem Boden, N+50 auf einem tragenden Behälter (Vorbild: Ölfass, Oberkante 48 px; welche tragen, legt Welt 9 fest); Höhenverlauf P28 |
| Landung LN | trifft jeden wachen Gegner im Bild (0 ≤ x − Kamera-x ≤ 383) mit 5 LP, den Boss mit 10 LP (endgültig, Welt 7.4, E11), und wirft ihn um (F1 von der Figur weg, P30); wartende und auftretende Gegner nicht (Welt 4.2); beschlossen (E10) |
| Steuerung | nach Zeile NEUEINSTIEG in 4.3 |
| Schutz | N+1 bis LN+199, verwundbar ab LN+200 (6.3) |
| Gegner | beginnen von t+1 bis N+1 keinen Angriff, danach greifen sie an, ohne Wirkung (Welt 5) |

Nicht nachgebildet (E16, einheitlich N = t+120): Wand t+108, Rollen
t+151, t+121 und t+152 (längerer Rückprall), Klingentod t+107 (keine
Klingen in der Scheibe).

## 7. Trefferreaktion der Gegner als Gegenstück

Gilt für alle Gegner (E3, E4), auch für den schweren Gegner (Koloss)
außerhalb der Scheibe und für Bosse: Die Trefferreaktion ohne Umwerfen
dauert bei allen 23 Frames (E3; für den Boss bestätigt, E19). Bei Bossen
kommt die Super-Armor hinzu (Welt 7.4, E11; Folgefrist h+23): Sie regelt, welche Treffer zählen und wann die LP zurückspringen;
ein Treffer von vorn bricht einen Angriff des Bosses nicht ab (5.4, Welt
7.4, SA3), und nach einer Folge ohne Umwerfen beginnt sein Stoß (SA5).
Umwerfen, Liegen und Aufstehen des Bosses stehen in Welt 7.1 (Vorbild in
notes.md, „Nachtrag: Boss“, K13 und K14). Während einer Reaktion ruht
die Gegnerlogik aus Welt 5 bis 7; laufende Angriffe des Gegners sind
abgebrochen.

| Reaktion (Aktion) | Ablauf | Zustand | Quelle |
|---|---|---|---|
| GETROFFEN (Treffer ohne Umwerfen, LP ≥ 0) | h+1 bis h+8 Stillstand, h+9 bis h+14 Zittern nur als Darstellung (+3, −3, +2, −2, +1, −1 px, erster Ausschlag in Blickrichtung der Figur), Welt-x bleibt (E3); Animationswechsel h+1, h+10, h+22; frei ab h+23 | 3 von h bis h+22, 1 ab h+23 | „Trefferreaktion der Gegner“; Klarstellung der Projektleitung zum Stillstand |
| Neustart | ein wirksamer Treffer in der Reaktion startet sie neu: Zustand 3 bis h₂+22, Stillstand und Zittern von vorn; kein Schutz in der Reaktion | 3 | wie oben |
| nach der Reaktion | ab h+23 übernimmt Welt 5 (im Vorbild Ausholen frühestens h+45), beim Boss Welt 7.4 (SA5) | 1 | wie oben |
| UMGEWORFEN (W) | Bahn F1, F2 oder F3 nach Angriff; unverwundbar und nicht greifbar | 2 von W+1 bis G−1 (das Vorbild führt den Geworfenen in Zustand 3; hier 2, damit er nicht treffbar ist) | wie oben |
| LIEGEN | ab der Ruhe: leichter Nahkämpfer 32 Frames (nach einem Wurf 16), schwerer 16 bis 44 Frames in Vielfachen von 4, gezogen beim Erreichen der Ruhe (P18); Zufall nach Welt 11 | 2 | wie oben, Liegen |
| AUFSTEHEN | 18 Frames; G = Ruhe + Liegen + 18; leichter Nahkämpfer G = W+105 nach Tritt und Sprungangriff, W+108 nach dem Kniestoß, W+104 nach dem Wurf | 2 | wie oben, Aufstehen |
| frei nach dem Aufstehen | ab G verwundbar und greifbar, auch nach einem Wurf (E4; im Vorbild nach einem Wurf greifbar erst ab G+1); Bewegung nach Welt 5 ab G+1 | 1 | „Trefferreaktion der Gegner“, Verwundbarkeit |
| TOT (t: LP < 0) | jeder Treffer mit LP < 0 wirft um, auch Stufe 1 und 3; Bahn F4 (nach Stufe 2 F4b, nach Wurf F3); nimmt keine Treffer an, trifft nicht | 2 ab t+1 | wie oben, Tod |
| Slot frei | t+79; nach Stufe 2 t+111; nach Wurf t+101 | 0 | wie oben |
| genau 0 LP | stirbt nicht: normale Reaktion, lebt mit 0 LP weiter und greift an; der nächste Treffer tötet (K6) | – | notes.md, „Nachtrag: Rest der Spielfigur“ |
| GEHALTEN | von g bis Losreißen, Wurf oder drittem Kniestoß; nimmt nur Treffer der haltenden Figur an (Kniestoß, Wurf, Spezialangriff); Haltelage nach P19 | 2 | „Griff und Wurf“ |
| Losreißen | nach 8.3; frei, Zustand 1, Logik nach Welt 5 | 1 | wie oben |

Gegner in Zustand 3 (Reaktion) und in aktiven Angriffsframes sind nicht
greifbar; ein liegender Gegner wird genau in G gegriffen, auch nach einem
Wurf (E4; im Vorbild nach dem Wurf erst in G+1, „Griff und Wurf“; notes.md,
„Nachtrag: Trefferreaktion der Gegner“).

## 8. Griff, Wurf, geworfener Gegner als Geschoss, Kniestoß

### 8.1 Griff

Am Ende jedes Frames, in dem die Figur in LAUF ist (eine Richtung in
T(f−1), auch nur in der Tiefe), prüft KS7 die Gegner. Ein Gegner wird
gegriffen, wenn er greifbar ist (Zustand 1, nicht in aktiven
Angriffsframes, am Boden), |dz| ≤ 10 und

| Lage des Gegners | Grenze in d_vorn | Quelle |
|---|---|---|
| vor der Figur, schaut sie an | 0 bis 39 in beiden Blickrichtungen (E14; im Vorbild bei Blick links 0 bis 38) | „Griff und Wurf“ |
| vor der Figur, schaut weg | 0 bis 14 | notes.md, „Nachtrag: Griff und Würfe“ (Workflow) |
| hinter der Figur, schaut sie an | −24 bis −1 in beiden Blickrichtungen (E14; im Vorbild bei Blick links −25) | wie oben (Workflow) |
| hinter der Figur, schaut weg | kein Griff | wie oben |

Kein Griff: ohne Richtung, in SPRUNG und LANDUNG, im SPRINT, in GETROFFEN
und 30 Frames nach einem Losreißen (griffsperre). Mehrere Kandidaten:
kleinstes |dx|, dann kleinste Slotnummer (P20). Ein A-Druck in g−1 gibt
den Schlag (4.2 geht vor), ein A-Druck in g verfällt. Im Griff-Frame wird
der Gegner auf die Haltelage gesetzt (P19).

### 8.2 Eingaben im Griff

| Druck (neu in T) | Bedingung | Ergebnis | Quelle |
|---|---|---|---|
| A ohne Richtung, oder A mit L und R | ab g+1 bzw. K+18 | Kniestoß | „Griff und Wurf“ |
| A mit Richtung, die die Blickrichtung enthält (auch diagonal) | ab g+1, bis g+60 | Wurf vorwärts | wie oben |
| A mit anderer Richtung (weg, O, U, diagonal weg) | wie oben | Wurf rückwärts über die Figur | wie oben |
| S allein | jederzeit im Griff | Gegner frei ohne Schaden, normaler Sprung nach 4.3 | wie oben |
| A und S zugleich | jederzeit im Griff | Spezialangriff nach 9.4 | wie oben, „Spezialangriff“ |

Eine Richtung zählt nur, wenn sie in T(E) liegt; eine später gedrückte
zählt nicht.

### 8.3 Haltedauer und Kniestoß

Ohne Eingabe reißt sich der Gegner in g+61 los; Würfe gehen in g+1 bis
g+60. Jeder Kniestoß startet die Haltefrist neu (Losreißen in K+61, P21):
Treffer K+5 mit 4 LP, gehalten ab K+23, nächster Druck ab K+18. Der dritte
wirft um (F2 in Blickrichtung, Ruhe 143,75 px vom Ort des Gegners, etwa
165 px von der Figur) und beendet den Griff („Griff und Wurf“).

### 8.4 Wurf

Schaden 14 LP in E+1, unabhängig von Zeitpunkt und vorherigen
Kniestößen. Die Figur ist E+1 bis E+37 gebunden und bewegt sich nicht.
Der Gegner bleibt E+1 bis E+21 in der Haltelage und wird in E+22 in
59 px Höhe 13 px vor (vorwärts) bzw. hinter (rückwärts) der Figur
losgelassen (P19; notes.md, „Wurf der Figur“), dann Bahn F3:
Bodenkontakt E+59, Ruhe E+71, 184,5 px von der Figur (gemessen 184 bis
185, „Griff und Wurf“). Liegen und Aufstehen nach Abschnitt 7.

### 8.5 Geworfener Gegner als Geschoss

Von E+1 bis E+58 (bis vor dem ersten Bodenkontakt, nicht im Rückprall)
ist der Geworfene eine Angriffsinstanz WG: Er trifft jeden anderen
Gegner einmal, wenn |dz| ≤ 17 und |dx| ≤ 52 (P8), mit 3 LP und Umwerfen
(F1 in seiner Flugrichtung), auch mehrere. Seine eigene Bahn ändert sich
nicht. Er zerbricht Behälter auf seiner Bahn, auch die Schaufenster in
Abschnitt B der ersten Stage (`design-gegner-stages.md`, Abschnitt 7).
Stirbt der Geworfene durch den Wurf, bleibt er Geschoss bis E+58
(„Griff und Wurf“, Geworfener Gegner).

## 9. Sprint und Spezialangriff

### 9.1 Doppeltipp-Erkennung

Ein **Tipp** ist eine ununterbrochene Folge von Frames mit derselben
Richtungsmenge, die L oder R enthält (P22). Ein Sprint beginnt in D2+1,
wenn

1. in D2 ein Tipp beginnt, dessen Richtungsmenge gleich der des
   vorigen Tipps ist (rechts, dann rechts plus hoch gibt keinen Sprint),
2. der vorige Tipp 1 bis 10 Frames dauerte,
3. zwischen beiden 1 bis 10 Frames ohne jede Richtung lagen,
4. die Figur in D2+1 in STAND oder LAUF ist.

11 Frames Druck oder Pause geben Gehen („Sprint“, Auslösen). Ein neuer
Sprint braucht einen neuen Doppeltipp, auch direkt nach dem Ende; eine
über das Ende gehaltene Richtung gibt nur Gehen.

### 9.2 Ablauf und Tempo

Der Sprint läuft, solange die Richtung in T(f−1) liegt: Ist sie zuletzt in
f gedrückt, ist f+1 der letzte Sprintframe, ohne Auslaufen. Nach 90
Sprintframes folgt 1 Frame STAND, dann LAUF, wenn die Richtung gehalten
ist. O oder U dazu macht den Sprint diagonal, Loslassen wieder gerade, der
Tempoplan läuft weiter. Nur noch O oder U, oder die Gegenrichtung: Der
Sprint endet, 1 Frame STAND, dann LAUF. Am Rand des Tiefenbands stoppt nur
die Bewegung, der Sprint läuft weiter. Blick = Sprintrichtung.

| Sprintframe n | x gerade | Tiefe gerade | diagonal x | diagonal Tiefe |
|---|---|---|---|---|
| 1 | 1,75 | 1,0 | 1,25 | 0,75 |
| ab 2 | v(n) = 3,875 − 0,125 · ⌊(n − 1)/6⌋ (3,875 in 2 bis 6, 2,125 in 85 bis 90) | 0,625 · v(n) | 0,75 · v(n) | 29/64 · v(n) (1,755859375 in 2 bis 6) |

Weg in 90 Sprintframes: 267,875 px („Sprint“, Tempo x). Der Fehler des
Vorbilds (diagonal nach rechts in Sprintframe 7 bis 12 x 4,8125 statt
2,8125) wird nicht übernommen (P23, E10; `design.md`, Abschnitt 4.5:
diagonal das 0,75-fache).

### 9.3 Sprintangriff, Sprintsprung, Sprint-Sprungangriff

**Sprintangriff.** A neu in A, während die Figur in A im SPRINT ist
(Richtung zuletzt in A−1 oder später; zuletzt in A−2 gibt den Schlag):
Aktion ab A+1, in A+1 steht die Figur. Lag die Richtung auch in T(A),
rutscht sie ab A+2 mit dem Tempo des Sprintframes A, jeden Frame 0,15625
weniger, solange es über 0 liegt (50 px ab 3,875, 43,875 ab 3,625), nur in
x und nicht in Stoppframes (P24). Er trifft alle Gegner auf dem Weg, jeden
einmal, und schiebt keinen mit („Sprint“).

**Sprintsprung.** S neu im SPRINT: wie der Vorwärtssprung in
Sprintrichtung (2,25 px/Frame, 92,25 px, Scheitel 51,25 in J+21, Drücke
ab J+48); das Sprinttempo verfällt.

**Sprint-Sprungangriff.** Er gehört zur Scheibe (E15). A neu im
Sprintsprung (J+1 bis J+41): 13 LP, wirft um, Tiefe 12, nichts hinter
der Figur; Reichweite 38 bis 147 px vor der Figur in
allen aktiven Frames (P7, E15). Die Figur bleibt in SPRINTSPRUNG (f_ph SS
ab A+1); ihre Bahn läuft ohne Höhenpause in A+1 weiter (P7). Aktiv sind
A+13 (Figur höchstens 16 px hoch) und A+20 bis A+39 (höchstens 20 px
hoch). Die Angriffsinstanz läuft mit der Figur bis A+39 weiter, auch nach
der Landung und wenn die Figur danach schon steht oder geht; A+20 bis
A+39 zählen in echten Frames ab A. Weitere A-Drücke im Sprintsprung nach
A verfallen bis zur Landung. Beginnt die Figur vor dem Ende der Instanz
eine andere Aktion als LANDUNG, STAND oder LAUF (Schlag, Sprung, Sprint,
Spezialangriff, Waffe, Aufnehmen, Griff) oder wird sie wirksam getroffen,
endet die Instanz SS in diesem Frame; die Figur führt also nie zwei
Angriffsinstanzen zugleich (Feld angriff, Abschnitt 3). Festlegung ohne
Messung (im Vorbild ist nach der Landung nur das Gehen gemessen,
notes.md, „Nachtrag: Sprint“). Ein Treffer in A+13 gibt den
Trefferstopp nach 5.3 (Bahn, Aktionsuhr und Instanz stehen 7 Frames, alle
späteren Frames einschließlich Aufsetzen und A+20 bis A+39 verschieben
sich um 7); Treffer ab A+20 geben keinen Trefferstopp und verschieben nichts
(notes.md, „Nachtrag: Sprint“, aktive Frames). Werte in 5.2.

### 9.4 Spezialangriff

**Auslösung.** A und S beide neu in T(P), LP > 0, Figur in STAND, LAUF,
SPRINT oder GRIFF, oder in GETROFFEN ab Druckframe H+8: SPEZIAL ab P+1,
eine Laufbewegung stoppt sofort, der Sprint endet. In SPRUNG gibt A den
Sprungangriff; in LANDUNG geben A und S in Landeframe 1 bis 5 einen neuen
Sprung und in Landeframe 6 nichts; in GETROFFEN verfallen Drücke in H bis
H+7; bei 0 LP geben A und S den Schlag („Spezialangriff“, Einschränkungen).
Ob ein Leerschlag ab P+7 in den Spezialangriff wechseln kann, ist unsicher
(„Nicht übernommen“); in der Scheibe nicht (4.3).

**Ablauf.** Aktion P+1 bis P+50 (uhr 1 bis 50), keine Bewegung, zustand 3.
Die Trefferfläche wächst in sechs Stufen zu je 6 Frames:

| Stufe k | uhr | vorn bis | hinten bis | Tiefe |
|---|---|---|---|---|
| 1 | 8 bis 13 | 43 | 42 | 28 |
| 2 | 14 bis 19 | 59 | 58 | 28 |
| 3 | 20 bis 25 | 75 | 74 | 28 |
| 4 | 26 bis 31 | 91 | 90 | 28 |
| 5 | 32 bis 37 | 107 | 106 | 28 |
| 6 | 38 bis 43 | 123 | 122 | 28 |

Die Fläche ist voll (nahe Ziele in jeder Stufe), jedes Ziel einmal,
beliebig viele. Eine Stufe mit Treffern gibt einmal 7 Stoppframes (Ende
ohne Treffer P+50, mit einer Stufe P+57, zwei P+64, drei P+71, vier P+78).
6 LP je Ziel, Umwerfen auf F1 von der Figur weg (d_vorn ≥ 0 nach vorn,
sonst nach hinten); Kosten 6.4, Schutz 6.3 („Spezialangriff“).

**Aus dem Griff.** A und S im Griff (E): derselbe Spezialangriff mit
denselben aktiven Frames wie der freie (beschlossen, E10); der gehaltene
Gegner steht in der Haltelage und wird in Stufe 1 getroffen (E+8, 6 LP,
umgeworfen, etwa 158 px von der Figur), die Figur verliert 9 LP in E+16
und nimmt Drücke ab E+58 an („Griff und Wurf“).

## 10. Waffen und Gegenstände in der Scheibe

Erscheinen aus Behältern, Fallenlassen durch besiegte Fernkämpfer,
Liegezeit, Blinken, Verschwinden beim Scrollen und Punkte regelt Welt 9.
Hier steht die Seite der Figur.

### 10.1 Aufnehmen

A neu, Figur am Boden in STAND oder LAUF, ein aufnehmbarer Gegenstand mit
|dz| ≤ 12 und d_vorn in seinem Bereich: Wirkung in P+1 (Gegenstand weg,
LP bzw. Waffe), Aktion P+1 bis P+7, Drücke ab P+8. Darüberlaufen nimmt
nichts auf; im Sprung gibt A den Sprungangriff. Aufnehmen geht dem Schlag
und dem Waffeneinsatz vor (4.2). Mehrere Gegenstände: P20. Die Figur
bleibt dabei verwundbar (P25). Die Bereiche gelten für beide
Blickrichtungen mit den Werten für Blick rechts (E14; im Vorbild beim
Raketenwerfer bei Blick links vorn 36, hinten 29).

| Gegenstand | vorn | hinten | Quelle |
|---|---|---|---|
| Raketenwerfer | 35 (unsicher 35 oder 37; es gilt 35, P26) | 28 | „Gegenstände und Waffen“, Aufnehmen |
| Kometenbraten, Eisnudelschale | 29 | 29 (P26) | wie oben (Brathähnchen) |
| Sternbeeren | 22 | 22 (P26) | wie oben (Kirschen) |

### 10.2 Essen

Essen heilt sofort in P+1, nie über 72 LP: Kometenbraten voll, Eisnudelschale
+55 oder +40, Sternbeeren +16 oder +12 (E9; `design-gegner-stages.md`,
Abschnitt 8; „Gegenstände und Waffen“, Heilwerte). Bei 72 LP gibt Essen
Punkte statt LP (Welt 10). Mit Waffe in der Hand wird Essen gegessen, die
Waffe bleibt. Essen läuft nicht ab.

### 10.3 Raketenwerfer

| Größe | Wert | Quelle |
|---|---|---|
| Munition | 3 Schuss beim Aufnehmen (übernommen aus dem Gegenstand) | „Gegenstände und Waffen“, Raketenwerfer |
| Einsatz | jeder A-Druck mit Waffe ist ein Einsatz, keine Kette, Kombostufe unverändert; Aktion P+1 bis P+17 | wie oben, Waffen allgemein |
| Abschuss | in P+7: Munition −1, Rakete im ersten freien Slot g0 bis g4, 58 px vor der Figur, 50 px hoch, in ihrer Tiefe, Blickrichtung der Figur | wie oben |
| Flug | 5,0 px/Frame in x; Höhe sinkt (Verlauf P9); im Flug kein Treffer | wie oben |
| Einschlag | frei fliegend in P+28 bei 163 px vor der Figur; früher an Wänden, Behältern und am Bildrand (Welt 2, 3) | wie oben |
| Explosion | Angriffsinstanz RX nach 5.2, aktiv P+28 bis P+42 (15 Frames), Bereich Einschlag −66 bis +90 in Flugrichtung, also 97 bis 253 px vor der Figur, in beiden Blickrichtungen (E14; im Vorbild bei Blick links −67, also ab 96 px); trifft keine Gegner ab Kamera-x + 448; zerbricht Behälter | wie oben, Explosion; Waffen allgemein |
| Munition leer | nach dem dritten Schuss in P+18 weggeworfen, nicht aufnehmbar, nach 61 Frames verschwunden; weitere A-Drücke geben Schläge | wie oben, Lebensdauer |
| Sprung, Griff, Wurf mit Waffe | wie ohne Waffe; Sprungangriff ohne Munition; Waffe bleibt | wie oben, Waffen allgemein |

### 10.4 Verlieren, Tausch, Liegezeit

Ein wirksamer Gegnertreffer gegen die Figur mit Waffe lässt sie im Frame
H+1 fallen: Gegenstand im kleinsten freien Objektslot, am Ort der Figur auf
Höhe 0 (P27), mit Restmunition, Liegezeit 700 ab L = H+1, wieder
aufnehmbar. Eine zweite Waffe ersetzt die erste: Die alte fällt in P+1 mit
Restmunition und Liegezeit 700. Liegezeit von Waffen: 700 Frames ab L, dann
Blinken, verschwunden in L+792 (Welt 9; „Gegenstände und Waffen“,
Lebensdauer).

## 11. Frame-Protokoll und Eingabeaufzeichnung

### 11.1 Eingabedatei

Textdatei, UTF-8, Zeilenende LF. Zeilen mit `#` sind Kommentare. Jede
Datenzeile: `von,bis,tasten`, die Tasten als Buchstabenfolge aus L R O U A
S (Reihenfolge beliebig), gedrückt in allen Frames von bis bis
einschließlich. P wird nicht aufgezeichnet; Pausenframes zählen nicht als
Frames und erscheinen weder in der Eingabedatei noch im Protokoll (Welt
10.4). Eine Starttaste braucht die Scheibe nicht. Überlappende Zeilen werden vereinigt; nicht genannte
Frames haben keine Taste. Die Aufzeichnung beim Spielen schreibt dieselbe
Form: je Lauf gleicher Tastenmengen eine Zeile, aufsteigend nach von.
Abspielen ersetzt die Abfrage der Geräte vollständig; die Datei bestimmt
T(f).

### 11.2 Prüfszene und Prüfbühne

Ein Prüflauf lädt eine Prüfszene, spielt eine Eingabedatei ab, läuft ohne
Fenster so schnell wie möglich bis zu einem Endframe und schreibt
Protokoll und Objektprotokoll. Die Prüfszene erweitert den Prüfstart aus
Welt 11.3 um Prüfbühne, Puppen und Prüfangriffe; Puppen und Prüfangriffe
gibt es auch auf der Bühne `scheibe` (Welt 12: PS8b, T9), sonst gilt dort
der Prüfstart unverändert.

| Feld | Inhalt |
|---|---|
| name, endframe, seed | Kennung, letzter Frame, Startwert des Zufallsgenerators (Welt 11) |
| buehne | `pruefbuehne` oder `scheibe` (Stage nach Welt 2) |
| rang, rang.fest | Startrang (Standard 9); rang.fest hält ihn fest (Welt 11.3) |
| figur | x, z, blick, lp, waffe, munition |
| gegner | je Slot: typ, x, z, blick, lp, lp_max, vorplatziert, logik an oder aus |
| objekte | je Slot: typ, art, x, z, munition |
| eingriffe | Liste `frame, ziel, feld, wert` sowie `pruefangriff` (unten) |

| Prüfmittel | Festlegung |
|---|---|
| Prüfbühne | Welt-x 0 bis 4000, Tiefenband 10 bis 197 ohne Stufen, keine Wände, Kamera fest bei Kamera-x 0 und Kamera-y 0, Bildränder begrenzen nichts, keine Wellen |
| Puppe | Gegner mit Logik aus (Welt 5 ruht), Rolle leicht oder schwer (Liegedauer, vorplatzierter Schaden); steht, schaut in jedem Frame mit Zustand 1 zur Figur, reagiert nach Abschnitt 7, ist greifbar |
| Prüfangriff | `pruefangriff, slot, von, bis, schaden, umwerfen`: Angriffsinstanz PA des Gegners in den Frames von bis; Figur −4 bis 60 px vor ihm, \|dz\| ≤ 10, Figurhöhe ≤ 48; ohne Trefferstopp; endet, wenn der Gegner getroffen wird oder Zustand 1 verlässt |
| Eingriff | setzt Werte in W1 des Frames (Welt 11.3), Nachkommaanteil 0; steht im Protokollkopf als `# EINGRIFF …` (wie in der Messmethode des Vorbilds) |

### 11.3 Protokoll

Datei `protokoll.csv`: Kopf aus Kommentarzeilen (`# version=`, `# szene=`,
`# seed=`, `# eingabe_md5=`, `# EINGRIFF …`), dann eine Kopfzeile, dann eine
Zeile je Frame. Trennzeichen Komma, Dezimalpunkt Punkt. Positionen als
exakte Dezimalzahl des 16.16-Werts ohne überflüssige Nullen (135.125,
51.25, 100); „-0“ gibt es nicht. Leere Felder bei freien Slots.

| Spalte | Inhalt |
|---|---|
| frame | f |
| tasten | T(f), Buchstaben in der Reihenfolge L R O U A S |
| f_x, f_z, f_h | Position der Figur am Frame-Ende |
| f_lp, f_zst | LP, Zustand 0 bis 3 |
| f_akt, f_ph | Aktion (Code aus 4.3), Unterphase (Stufe 1 bis 4, Variante N/R/H/T, Sprint-Sprungangriff SS, Wurf V/R, Bahn F/B/R) |
| f_uhr, f_stopp, f_schutz | Aktionsuhr, verbleibende Stoppframes, Schutz-Timer |
| f_blick | R oder L |
| kombo | 0 bis 4 |
| f_waffe, f_mun | Waffe (leer oder RW), Munition |
| f_sprint | Sprintframe n, sonst 0 |
| rang, rang_zaehler | nach Welt 8 |
| kamera_x, kamera_y | nach Welt 3 |
| zufall_haupt | Zahl der Ziehungen des Hauptgenerators (Welt 11) |
| s0_typ bis s19_blick | je Gegnerslot n: sn_typ, sn_x, sn_z, sn_h, sn_lp, sn_zst, sn_akt, sn_modus (Zustände aus spezifikation-welt.md 5.2, 6 und 7.1), sn_ph, sn_blick |
| ereignis | Liste nach 11.4 |

Dazu kommen die übrigen Zusatzspalten aus Welt 11.4 (Kamera-Modus, lebende
Gegner, Wellen, Rechte, Leben, Punkte, Phase, Steuerung, je Gegner
Recht, Angriff, Zielabstand, Schaden, Timer), vor `ereignis`, je Gegner mit
dem Präfix sn_. Die dort vorgeschlagenen Spalten der Objektslots stehen
stattdessen im Objektprotokoll (11.5).

### 11.4 Ereignisse

Einträge getrennt durch `;`, Felder durch `:`, in der Reihenfolge ihres
Eintretens im Logikschritt; die Einträge der Welt (Welt 11.4, etwa
`WL:2`, `SR:S1`, `BL:a`) stehen in derselben Spalte. Beteiligte: F (Figur), sn, on, gn.

| Eintrag | Bedeutung |
|---|---|
| T:Angreifer>Ziel:Angriff:Schaden:Wirkung | Treffer; Angriff nach 5.2 bzw. Welt 5 bis 7, PA; Wirkung R (Reaktion), U (umgeworfen), X (Tod), B (Behälter zerbrochen), W (wirkungslos im Schutz) |
| K:F:Betrag | Kosten des Spezialangriffs |
| G:F>sn, L:sn, WU:F>sn:V oder R | Griff, Losreißen, Wurf |
| AU:F>on:Art, WA:F:Art:Munition, AB:gn | Aufnehmen, Waffe fallen gelassen, Abschuss |
| EX:gn | Einschlag einer Rakete |
| SP:F:n, KE:F:k | Sprintbeginn bzw. Kettenstufe k beginnt |
| FR:sn | Slot frei |
| EI:Beschreibung | Eingriff ausgeführt |

### 11.5 Objektprotokoll

Datei `objekte.csv`, eine Zeile je Frame und belegtem Slot o20 bis o59
und g0 bis g4: `frame, slot, typ, art, x, z, h, zst, lp, munition,
liegezeit, inhalt, flugphase` (Felder der Gegenstände und Behälter nach
Welt 9).

### 11.6 Determinismus

Gleiche Programmversion, gleiche Prüfszene, gleiche Eingabedatei und
gleicher Seed ergeben bitgleiche Protokolle (gleiche MD5 von
`protokoll.csv` und `objekte.csv`), auf jedem Rechner. Dafür gilt: keine
Uhrzeit, keine Bildrate und kein ungesteuerter Zufall in der Logik; jeder
Zufall über den seedbaren Generator aus Welt 11; feste Reihenfolge nach
2.2 und aufsteigenden Slots, nie über ungeordnete Mengen; Festkomma nach
2.4; Darstellung, Ton und Ladezeiten wirken nicht auf die Logik; die
Spielschleife nach E13 (2.1) bestimmt nur, wann ein Logikschritt läuft,
nie, was er tut; feste Zahlenformatierung nach 11.3. Der Prüflauf gibt die
MD5 beider Dateien aus.

## 12. Abnahmetests

Standard für alle Tests außer T9 und T10: Prüfbühne, Seed 1, Rang 9 fest, Figur bei x 100, z 100, Blick rechts, 72 LP, ohne Waffe;
Puppen stehen in z 100. Die Tabellen nennen Frame und erwartete
Spaltenwerte; nicht genannte Frames gehören nicht zum Test. Toleranz:
keine. Werte, die von einem Platzhalter abhängen, nennen ihn.

| Test | prüft | Szene (Abweichung vom Standard) | Eingabe | Eingriffe, Prüfangriffe |
|---|---|---|---|---|
| T1 | Kriterium 1, Bewegung | – | R 10–29, O 40–49, R und O 60–69, L 80 | – |
| T2 | Kriterium 2, Sprung | – | S 10, R 30–70, R und S 100 | – |
| T3 | Kriterium 3, volle Kette | Puppe leicht s0 x 146, 16 LP, vorplatziert | A 10, 24, 38, 53 | – |
| T4 | Kriterium 4, Kombofenster | Puppe schwer s0 x 146, 30 LP | A 10 und je Lauf ein zweiter Druck | – |
| T5 | Kriterium 5, Reichweite | Puppe schwer s0, 30 LP, Lage je Lauf; Lauf g, h: Figur Blick links (E14) | A 10 (Lauf e, f: A 10, 24, 38, 53) | Lauf e: in 43 s0_x := 200; Lauf f: s0_x := 201 |
| T6 | Kriterium 6, Griff und Wurf | Puppe leicht s0 x 160, Puppe leicht s1 x 240, je 16 LP; Lauf b: Figur x 300, Blick links (E14), Puppe leicht s0 x 240, Puppe leicht s1 x 160, je 16 LP | R 10–21, A und R 27 (Lauf b: L 10–21, A und L 27) | – |
| T7 | Kriterium 7, Schutzfenster | Figur x 300; Puppe leicht s0 x 346, s1 x 118 (dort liegt die Figur später) | Lauf b: A 154, 156, 158, 160, 162, 164 | s0: 5 in 19; s0: 5 in 20–46; s0: 5 mit Umwerfen in 100; s1: 5 in 101–260 |
| T8 | Kriterium 8, 0 LP und gleichzeitiger Treffer | Puppe leicht s0 x 146, 16 LP | je Lauf | je Lauf |
| T9 | Kriterium 9, Rang | Rang nicht fest; Lauf b: Puppe leicht s0 x 146 | keine | Lauf b: in 500 Prüfangriff 80; Lauf c: in 100 erscheint ein leichter Nahkämpfer (nicht vorplatziert, Logik an) bei x 300 |
| T10 | Kriterium 10, Sperre und Boss | Bühne `scheibe` (Welt 2) | Eingabedatei nach Welt 12 | – |
| T11 | Sprint (9.1, 9.2) | – | R 10–12, R 16–140 (Lauf b: R 10–20, R 24–40; Lauf c: R 10–12, R 24–40) | – |
| T12 | Sprintangriff (9.3) | Lauf b: Puppe leicht s0 x 230 | R 10–12, R 16–40, A 30 | – |
| T13 | Spezialangriff ohne Treffer (6.3, 9.4) | Puppe leicht s0 x 600 (Lauf b, c ohne Puppe) | A und S 10 (Lauf b: dazu A 60; Lauf c: dazu A 61) | in 54: s0_x := 146; s0: 5 in 54–81 |
| T14 | Spezialangriff mit Treffern (6.4, 9.4) | Figur x 300; Puppe leicht s0 x 346; Puppe leicht s1 x 200, z 120 | A und S 10 | – |
| T15 | Sprungangriff (4.4, 5.2, 5.3) | Puppe schwer s0 x 160, 30 LP | Lauf a: S 10, A 14; Lauf b: S 10, A 30 | – |
| T16 | Kniestoß, Haltedauer (8.2, 8.3) | Puppe leicht s0 x 160, 30 LP | Lauf a: R 10–21, A 23, 40, 41, 59; Lauf b: R 10–21, R 90–95, R 120 | – |
| T17 | Neustart der Reaktion, E3 (7) | Puppe schwer s0 x 146, 30 LP | A 10, 24 | – |
| T18 | Umwerfen, Aufstehen, E4 (7) | Puppe leicht s0 x 146, 30 LP | A 10, 24, 38, 53, 158 | in 150: f_x := 231 |
| T19 | Raketenwerfer (10.3) | Figur mit RW, 3 Schuss; Puppe leicht s0, 30 LP, x je Lauf | A 10 | – |
| T20 | Verlieren, Aufnehmen, Essen (10) | Lauf a: Figur mit RW, 2 Schuss, Puppe leicht s0 x 146; Lauf b: Figur 40 LP, Kometenbraten o20 x 120 | Lauf a: A 50; Lauf b: A 10 | Lauf a: s0: 5 in 20 |

**T1**

| Frame | erwartet |
|---|---|
| 10 | f_x 100, f_akt STAND |
| 11 | f_x 101.75, f_akt LAUF |
| 30 | f_x 135 |
| 31 | f_x 135, f_akt STAND |
| 41, 50, 51 | f_z 101, 110, 110 |
| 61 | f_x 136.25, f_z 110.75 |
| 70, 71 | f_x 147.5, f_z 117.5 in beiden |
| 81 | f_x 145.75, f_blick L |
| 82 | f_x 145.75, f_akt STAND |

**T2**

| Frame | erwartet |
|---|---|
| 11 | f_akt SPRUNG, f_h 0 |
| 12 | f_h 4.9375 |
| 31 | f_h 51.25 (Höchstwert) |
| 51 | f_h 2.5 |
| 52 | f_h 0, f_akt LANDUNG |
| 11 bis 58 | f_x 100 (in der Luft und in der Landung keine Bewegung trotz R) |
| 58, 59 | f_akt STAND in 58; f_x 101.75 in 59 |
| 72 | f_x 122.75 |
| 101 | f_akt SPRUNG, f_x 122.75 |
| 102 | f_x 125 |
| 142 | f_x 215 (92,25 px), f_h 0, f_akt LANDUNG |

**T3**

| Frame | erwartet |
|---|---|
| 11 | f_akt SCHLAG, f_ph 1, kombo 1, f_uhr 1 |
| 12 | s0_lp 13, s0_zst 3, f_stopp 7, Ereignis T:F>s0:KT1:3:R |
| 13 bis 19 | f_uhr 2, f_stopp 6 bis 0 (Trefferstopp) |
| 25, 27 | kombo 2; s0_lp 9 in 27, f_stopp 7 |
| 39, 42 | kombo 3; s0_lp 4 in 42, f_stopp 7 |
| 54, 56 | kombo 4; s0_lp −6 in 56, Ereignis T:F>s0:KT4:10:X |
| 57 | s0_zst 2, s0_akt TOT, s0_x 146 |
| 59 | s0_x 148.875 |
| 96 | s0_x 255.25, s0_h 0 (Bodenkontakt) |
| 105 | s0_x 281.125 |
| 135 | s0_zst 0 (Slot frei), Ereignis FR:s0 |

**T4** (jeweils Treffer in 12, s0_lp 27)

| Lauf | zweiter Druck | erwartet |
|---|---|---|
| a | 23 (h+11) | verfällt: f_akt SCHLAG, kombo 1 bis 39; f_akt STAND, kombo 0 ab 40; s0_lp 27 bis 60 |
| b | 24 (h+12) | kombo 2 ab 25; s0_lp 23 in 27 |
| c | 39 (h+27) | kombo 2 ab 40; s0_lp 23 in 42 |
| d | 40 (h+28) | neue Kette: kombo 1 ab 41; s0_lp 24 in 42 |

**T5**

| Lauf | Lage der Puppe | erwartet |
|---|---|---|
| a | x 185, z 111 | s0_lp 27 in 12 |
| b | x 186, z 100 | s0_lp 30 in 11 bis 30 |
| c | x 185, z 113 | s0_lp 30 in 11 bis 30 |
| d | x 185, z 112 | s0_lp 27 in 12 (E9) |
| e | x 146 | s0_lp 18 in 42, 8 in 56, s0_akt UMGEWORFEN; s0_x 200 bis 64, 202.875 in 65 |
| f | x 146 | s0_lp 18 von 42 bis 90 (kein Treffer in 56–59 und 70–73) |
| g | x 15, z 100 (Figur Blick links, d_vorn 85) | s0_lp 27 in 12 (E14; im Vorbild bei Blick links kein Treffer) |
| h | x 14, z 100 (Figur Blick links, d_vorn 86) | s0_lp 30 in 11 bis 30 |

**T6**

| Frame | erwartet |
|---|---|
| 21 | f_akt LAUF, f_x 119.25 (d_vorn 41, kein Griff) |
| 22 | f_x 121, f_akt GRIFF, Ereignis G:F>s0; s0_x 140 (Haltelage, P19) |
| 28 | s0_lp 2, f_akt WURF, Ereignis T:F>s0:WU:14:U |
| 49 | s0_x 134, s0_h 59 (losgelassen, P19) |
| 61 | s1_lp 13, Ereignis T:s0>s1:WG:3:U (P8, P19) |
| 65 | f_akt STAND |
| 86 | s0_x 277.375, s0_h 0 |
| 98 | s0_x 305.5 (184,5 px von der Figur) |

| Frame (Lauf b) | erwartet |
|---|---|
| 21 | f_akt LAUF, f_x 280.75 (d_vorn 40, kein Griff) |
| 22 | f_x 279, f_akt GRIFF, Ereignis G:F>s0; s0_x 260 (Haltelage, P19) |
| 28 | s0_lp 2, f_akt WURF, Ereignis T:F>s0:WU:14:U |
| 49 | s0_x 266, s0_h 59 (losgelassen, P19) |
| 61 | s1_lp 13, Ereignis T:s0>s1:WG:3:U (P8, P19) |
| 65 | f_akt STAND |
| 86 | s0_x 122.625, s0_h 0 |
| 98 | s0_x 94.5 (184,5 px von der Figur) |

**T7**

| Frame | erwartet |
|---|---|
| 19 | f_lp 67, f_akt GETROFFEN, f_zst 3, f_schutz 27 |
| 20 bis 45 | f_lp 67, Ereignisse T:s0>F:PA:5:W |
| 46 | f_lp 62, f_schutz 27 (H+27 wirksam) |
| 100 | f_lp 57, f_akt UMGEWORFEN, f_zst 2 |
| 109 | f_x 297.125 (Flug vom Angreifer weg) |
| 155 | f_x 164.875 |
| 220 | f_akt AUFSTEHEN |
| 221 | f_akt STAND, f_zst 3, f_schutz 35 (U = H+121 ohne Eingabe) |
| 101 bis 255 | f_lp 57; wo der Prüfangriff aus s1 die Figur erreicht, Ereignis T:s1>F:PA:5:W |
| 256 | f_lp 52 |
| Lauf b | f_akt STAND in 193 (U = H+93), f_lp 57 bis 227, 52 in 228 |

**T8**

| Lauf | Eingriffe und Eingabe | erwartet |
|---|---|---|
| a | in 1: f_lp := 5; Prüfangriffe 5 in 20 und 5 in 50 | f_lp 0 in 20, f_akt GETROFFEN (nicht TOT); f_lp −5 in 50, f_akt TOT |
| b | in 1: f_lp := 5; Prüfangriff 5 in 20; A und S 48 | f_akt SCHLAG ab 49 (kein Spezialangriff bei 0 LP), f_lp 0 |
| c | Prüfangriff 5 in 19–23; A 17 | in 19: s0_lp 13, f_lp 72; f_lp 72 bis 40 |
| d | Prüfangriff 5 in 19–23; A 18 | in 19: f_lp 67, f_akt GETROFFEN; s0_lp 16 bis 40 |

**T9.** Rang mit der Frame-Zählung nach Welt 8: 9 in 408, 10 in 409, 10 in
1008, 11 in 1009, 24 in 8809 und 9409. Lauf b: f_akt TOT in 500, rang 10
in 619 und 7 in 620 (N = t+120, 6.5; bei jeder Todesart, E16). Lauf c: Der erste wirksame
Treffer des erscheinenden Nahkämpfers hat Schaden 8 (Rang 9 oder 10,
„Schaden der Gegner“).

**T10.** kamera_x bleibt am Sperrwert nach Welt 3, solange ein Gegner der
Sperrwelle lebt, und läuft im Frame nach dem Tod des letzten weiter. Eine
Kette der Stufen 1 bis 3 gegen den Boss ohne Umwerfen endet mit seinem
Abbruchstoß, seine LP stehen danach auf dem Wert nach Welt 7.4 (E11; Welt-Test T7). Im Frame, in dem die LP des Bosses unter
0 fallen, haben alle übrigen Gegner s_akt TOT.

**T11**

| Frame | erwartet |
|---|---|
| 13 bis 16 | f_x 105.25; f_akt STAND in 14 bis 16 |
| 17 | f_akt SPRINT, f_sprint 1, f_x 107 |
| 18 | f_x 110.875 |
| 22 | f_x 126.375 |
| 106 | f_sprint 90, f_x 373.125 |
| 107 | f_akt STAND, f_x 373.125 |
| 108 | f_akt LAUF, f_x 374.875 |
| Lauf b | kein Sprint: f_akt LAUF, f_x 121 in 25 |
| Lauf c | kein Sprint (11 Frames Pause) |

**T12**

| Frame | erwartet Lauf a | erwartet Lauf b |
|---|---|---|
| 30 | f_sprint 14, f_x 156.125 | wie a |
| 31 | f_akt SPRINTANGRIFF, f_x 156.125 | wie a |
| 32 | f_x 159.75 | wie a |
| 35 | f_x 169.6875 | wie a; s0_lp 7, Ereignis T:F>s0:SA:9:U |
| 36 bis 42 | – | f_x 169.6875 (Stopp, P24) |
| 55 | f_x 200 (43,875 px gerutscht) | – |
| 62 | – | f_x 200 |
| 66 | f_akt STAND | f_akt SPRINTANGRIFF |
| 73 | – | f_akt STAND |

**T13**

| Frame | erwartet |
|---|---|
| 11 bis 60 | f_akt SPEZIAL, f_zst 3, f_x 100, f_lp 72 |
| 54 bis 80 | Ereignisse T:s0>F:PA:5:W |
| 61 | f_akt STAND, f_schutz 20, f_zst 3 |
| 80 | f_schutz 1, f_lp 72 |
| 81 | f_schutz 0, f_zst 1, f_lp 67 |
| Lauf b | f_akt STAND in 61 und 62 (Druck in P+50 verfällt) |
| Lauf c | f_akt SCHLAG in 62 |

**T14**

| Frame | erwartet |
|---|---|
| 24 | s0_lp 10, Ereignis T:F>s0:SP:6:U (Stufe 2, uhr 14) |
| 25 bis 31 | f_uhr 14, f_stopp 6 bis 0 |
| 32 | f_lp 63, Ereignis K:F:9 |
| 49 | s1_lp 10 (Stufe 5, uhr 32), Ereignis T:F>s1:SP:6:U |
| 74, 75 | f_akt SPEZIAL in 74; STAND in 75 mit f_schutz 20 |
| 79 | s0_x 481.125 |
| 94, 95 | f_zst 3 in 94; f_zst 1 in 95 |
| 104 | s1_x 64.875 (nach hinten geflogen) |

**T15**

| Lauf | Frame | erwartet |
|---|---|---|
| a | 15 | f_akt SPRUNGANGRIFF, f_ph N, f_h 14.0625 (steht still) |
| a | 19 | f_h 29.3125, s0_lp 23, Ereignis T:F>s0:SN:7:U |
| a | 20 bis 26 | f_h 29.3125 (Stopp) |
| a | 27 | f_h 32.5 |
| a | 60 | f_akt LANDUNG, f_h 0 |
| b | 35 bis 38 | f_h 50.3125, 49.5, 48.4375, 47.125; s0_lp 30 |
| b | 39 | f_h 45.5625, s0_lp 23 |
| b | 60 | f_akt LANDUNG |

**T16**

| Lauf | Frame | erwartet |
|---|---|---|
| a | 28 | s0_lp 26 (Kniestoß 1) |
| a | 40 bis 45 | s0_lp 26 (Druck in 40 verfällt) |
| a | 46 | s0_lp 22 |
| a | 64 | s0_lp 18, s0_akt UMGEWORFEN (dritter Kniestoß) |
| a | 122 | s0_x 283.75 (Bahn F2 ab x 140, P19) |
| b | 83 | Ereignis L:s0, f_akt STAND, s0_zst 1 |
| b | 91 bis 96 | f_akt LAUF, kein Griff (Griffsperre) |
| b | 121 | f_akt GRIFF |

**T17**

| Frame | erwartet |
|---|---|
| 12, 27 | s0_lp 27 in 12, 23 in 27 |
| 12 bis 49 | s0_zst 3 ohne Unterbrechung |
| 50 | s0_zst 1 |
| 10 bis 60 | s0_x 146 in jedem Frame (Stillstand, Zittern nur in der Darstellung) |

**T18**

| Frame | erwartet |
|---|---|
| 56 | s0_lp 8, s0_akt UMGEWORFEN (W) |
| 65 | s0_x 148.875 |
| 102 | s0_x 255.25, s0_h 0 |
| 111 | s0_x 281.125, s0_akt LIEGEN |
| 143 | s0_akt AUFSTEHEN |
| 160 | s0_zst 2, s0_lp 8 (Schlag aktiv, kein Treffer) |
| 161 | s0_zst 1, s0_lp 5 (G = W+105, sofort verwundbar) |

**T19**

| Lauf | Puppe bei x | erwartet |
|---|---|---|
| a | 250 | f_akt WAFFE 11 bis 27; in 17 f_mun 2 und g0 bei x 158, h 50; Ereignis EX:g0 in 38 (x 263); s0_lp 22 in 38 |
| b | 196 | s0_lp 30 bis 60 |
| c | 197 | s0_lp 22 in 38 |
| d | 170 | s0_lp 30 bis 60 (Rakete trifft im Flug nicht) |

**T20**

| Lauf | Frame | erwartet |
|---|---|---|
| a | 20 | f_lp 67, f_akt GETROFFEN |
| a | 21 | f_waffe leer; o20 Raketenwerfer, munition 2, liegezeit 0 (L = H+1), x 100 (P27) |
| a | 22 | o20 liegezeit 1 |
| a | 51 | f_akt AUFNEHMEN, f_waffe RW, f_mun 2, o20 frei |
| a | 58 | f_akt STAND |
| b | 11 | f_lp 72, o20 frei, f_akt AUFNEHMEN |

**D1 Determinismus (11.6).** T1 bis T20 zweimal und auf einem zweiten
Rechner: MD5 von `protokoll.csv` und `objekte.csv` je Test gleich. Mit
anderem Seed dürfen Tests mit Zufall abweichen (T9 Lauf c, T10), mit
demselben nicht.

## 13. Offen bis Messpaket 2

Messpaket 2 ist eingearbeitet (13.1). Die Platzhalter (13.2) und die
Fragen an den Nutzer (13.3) sind durch die Entscheidungen E10 bis E22 vom
2026-10-03 entschieden; die Fragen stehen mit ihrer Antwort und der Nummer
der Entscheidung da.

### 13.1 Ergebnisse von Messpaket 2

Die Nummern Kn gelten in diesem Dokument; die Spalte On verweist auf die
Liste „Offen bis Messpaket 2“ in `design.md`, Abschnitt 8, und
`design-gegner-stages.md`, Abschnitt 10. Quellen: K1 bis K12 notes.md, „Nachtrag: Rest der Spielfigur“;
K13 und K14 notes.md, „Nachtrag: Boss“; K15 notes.md, „Nachtrag: Fernangriffe der Gegner“.

| Nr. | Stelle | Ergebnis | Status | On |
|---|---|---|---|---|
| K1 | 4.3 Stufe 2 | nach Treffer A und S ab h+11, seitlich ab h+12, Tiefe erst nach der Pose (bis h+26, STAND ab h+27); Leerschlag D+1 bis D+16, A und S ab D+7, Richtung ab D+8 | gesichert | O1 |
| K2 | 4.3 Stufe 3 | nach Treffer wie Stufe 2; Leerschlag D+1 bis D+17, A und S ab D+8, Richtung ab D+9 | gesichert | O2 |
| K3 | 4.3 Stufe 4 | nicht abbrechbar, 25 Frames plus 7 je Treffer, auch bei Treffer im zweiten Fenster; Drücke ab D+33 bzw. ohne Treffer D+26 | gesichert | O3 |
| K4 | 5.2 Sprungangriff hoch | aktiv A+7 bis A+10, bis 48 px Höhe, 85 vorn, 32 hinten, Tiefe 12, 12 LP, wirft um; Aktion bis A+29 | gesichert | O4 |
| K5 | 5.2 Sprungangriff runter | aktiv A+9 bis A+32, bis 41 px Höhe, 42 vorn, 41 hinten, Tiefe 12, 4 LP, wirft nicht um; auch nach einem Sprung mit Richtung | gesichert | O5 |
| K6 | 7 | Gegner mit genau 0 LP lebt weiter und greift an; Tod erst unter 0 | gesichert | O9 |
| K7 | 6.3, 6.5, 4.3 | Tod und Neueinstieg nach 6.5: N = t+120 (im Vorbild Wand t+108, Rollen t+151; nicht übernommen, E16), Erscheinen bei Kamera-x + 64, Fall 52 Frames, Landung trifft alle Gegner im Bild, Steuerung ab LN+6, Schutz bis LN+199. Offen: ob die Landung Gegner außerhalb des Bildes trifft; Schutzdauer in anderen Stages (nur Stage 1 gemessen) | gesichert (3. Messung); Rest offen, weil nicht gemessen | O10 |
| K8 | 5.2 Kette | kein Mindestabstand; hinten 28 / 26 / 26 / 25 px, wenn das Ziel zur Figur schaut, sonst 4 / 2 / 2 / 1 px | gesichert (3. Messung) | – |
| K9 | 5.1, 5.2 | Blick links 1 px kürzer: Kette 84 / 86 / 90 / 99, Sprungangriff Richtung 98, neutral 75. Für hoch, runter und Sprintangriff nicht gemessen | gesichert; nicht übernommen (E14): alle Werte gelten für beide Blickrichtungen wie bei Blick rechts | – |
| K10 | 5.6 | Ausfallschritt bzw. Schritt weg nach 5.6. Reichweite im Ausfallschritt und Nachlauf danach nicht gemessen (P29) | gesichert | – |
| K11 | 6.2 | Treffer in der Luft werfen immer um, bei jeder Höhe | gesichert | – |
| K12 | 5.4 | gleichzeitiger Treffer: nur der Gegner verliert LP; einen Frame später nur die Figur | gesichert | – |
| K13 | 6.2, 12 (T10) | Super-Armor im Vorbild nach 6.2; Regel der Zurückweisung unsicher (Anteile im Bot: Messagent 15 bis 39 %, Gegenprüfer 16 bis 36 %, steigend mit dem Rang); unsere feste Regel steht in Welt 7.4 (E11) | Arten gesichert, Regel unsicher | O12 |
| K14 | 7 | Reaktion des Bosses im Vorbild: 27 Frames am Ort (von hinten im Warten oder Angriff 15), nach Stufe 2 15 Frames; Umwerfen mit Flug bis W+55 und variabler Liegezeit (42 bis 70 Frames); trefferbar im eigenen Angriff. Umsetzung: Reaktion 23 Frames wie bei allen Gegnern (7, E3, E19), sonst Welt 7 | gesichert (3. Messung) | O12 |
| K15 | 5.8, 6.3 | Rakete des Fernkämpfers: Explosion 9 Frames, trifft bis 25 px Höhe, 12 bis 15 LP nach Rang, wirft um; Schlag zerstört sie nicht; Geschosse treffen im Vorbild auch im Schutz (für uns E2, P17, E10). Werte in Welt 6 | gesichert (Höhe 26 px unsicher) | O11 |

### 13.2 Platzhalter ohne Messauftrag, beschlossen (E10)

Alle Festlegungen P1 bis P31 hat der Nutzer bestätigt (beschlossen, E10).
P7 bestätigt zusätzlich E15; P9 und P26 gelten nach E14 für beide
Blickrichtungen.

| Nr. | Stelle | Festlegung |
|---|---|---|
| P1 | 2.1 | L und R zugleich: keine x-Richtung; O und U zugleich: keine Tiefenrichtung |
| P2 | 4.3 LANDUNG | S allein in Landeframe 1 bis 5 gibt wie A und S einen neuen Sprung (gemessen nur A und S; bei der Landung nach dem Neueinstieg auch S allein, notes.md, „Nachtrag: Rest der Spielfigur“) |
| P3 | 4.3 GETROFFEN | STAND und Drücke ab H+27; außer dem Spezialangriff verfallen alle Drücke; keine Verschiebung der Figur |
| P4 | 4.3 AUFSTEHEN | Drücke ab U |
| P5 | 4.3 WAFFE | Drücke verfallen bis P+17, ab P+18 angenommen; keine Bewegung |
| P6 | 5.1 | Zielhöhe begrenzt Angriffe der Figur nicht (Vorbild: Spezialangriff unsicher bis 53 px) |
| P7 | 9.3 | Sprint-Sprungangriff: 38 bis 147 px in allen aktiven Frames (gemessen nur A+20, danach unsicher), keine Höhenpause in A+1 (E15) |
| P8 | 8.5 | geworfener Gegner trifft bei \|dx\| ≤ 52 (unsicher, „etwa 52 px“), ohne Höhengrenze |
| P9 | 5.7, 10.3 | Rakete sinkt 2,375 px/Frame; Explosion auch nach frühem Einschlag −66 bis +90 in beiden Blickrichtungen (E14); Getroffene fliegen in Flugrichtung der Rakete; die Explosion trifft die Figur nicht |
| P10 | 5.2 | Variante des Sprungangriffs: Richtung vor hoch (runter vor Richtung ist gemessen) |
| P11 | 5.5, 6.3 | wirkungslose Treffer im Schutz zählen für den Angreifer nicht: kein Trefferstopp, Angriff bleibt aktiv |
| P12 | 5.6 | Kette endet beim Verlassen von SCHLAG; Behältertreffer setzt die Kette fort |
| P13 | 5.7 | Rückprall nur in x, Höhe 0 in der Logik; die Darstellung zeigt ihn |
| P14 | 5.7 | Flugrichtung bei gleichem x: Blickrichtung des Angreifers |
| P15 | 5.7 | Umwerfen in der Luft: F1 ab der aktuellen Höhe, 8 Frames Stillstand dort |
| P16 | 6.2 | wirksamer Treffer beendet den Griff: Gegner frei, Griffsperre 30 Frames; ein wirkungsloser Treffer im Schutz nicht (E2) |
| P17 | 6.3 | Schutz wirkt gegen alle Gegnertreffer, auch Geschosse (`design.md`, Abschnitt 4.7, E2); im Vorbild treffen Geschosse im Schutz nach einem Treffer (notes.md, „Nachtrag: Fernangriffe der Gegner“) |
| P18 | 7 | Liegedauer des schweren Nahkämpfers gleichverteilt aus 16, 20, …, 44, gezogen bei der Ruhe |
| P19 | 8.1, 8.4 | Haltelage 19 px vor der Figur in ihrer Tiefe (Vorbild 17 bis 21 px); beim Tragen E+1 bis E+21 bleibt sie; in E+22 ±13 px, 59 px hoch |
| P20 | 8.1, 10.1 | mehrere Kandidaten: kleinstes \|dx\|, dann kleinste Slotnummer |
| P21 | 8.3 | Haltefrist nach Kniestoß ab K (Losreißen K+61); nach dem dritten Kniestoß Drücke ab K+18 |
| P22 | 9.1 | Tipps nur mit L oder R; Pause heißt keine Richtung |
| P23 | 9.2 | diagonaler Sprint ohne den Fehler des Vorbilds |
| P24 | 9.3 | Rutschen nur in x, steht in Stoppframes |
| P25 | 10.1 | Aufnehmen lässt die Figur verwundbar (Vorbild setzt einen Grundzustand, dessen Wirkung nicht gemessen ist) |
| P26 | 10.1 | Aufnahmebereich von Essen: hinten wie vorn; Raketenwerfer vorn 35 (gemessen bei Blick rechts unsicher 35 oder 37); alle Bereiche in beiden Blickrichtungen (E14) |
| P27 | 10.4 | fallen gelassene Waffe liegt in H+1 am Ort der Figur, L = H+1 |
| P28 | 6.5 | Höhenverlauf im Fall nach dem Neueinstieg: frei für die Darstellung, die Landung liegt fest in N+53 bzw. N+50 |
| P29 | 5.6 | Ausfallschritt: Reichweite wie in 5.2, Nachlauf ab h wie ohne Schritt; Schritt weg wie Leerschlag der Stufe; diagonale Richtung zählt wie gerade |
| P30 | 6.5 | Landung beim Neueinstieg: „im Bild“ heißt 0 ≤ x − Kamera-x ≤ 383; Getroffene fliegen von der Figur weg |
| P31 | 4.3 SCHLAG Stufe 1 | Nach einem Treffer der Stufe 1 bricht eine Richtung nur in der Tiefe die Pose nicht ab; Bewegung ab h+29, ein Frame nach STAND (h+28), wie bei Stufe 2 und 3. Vorbild nur vom Messagenten gemessen (unsicher); `mechanik.md` nennt „handlungsfähig ab h+13 (Laufen oder nächster Schlag)“, gemessen nur für Laufen zur Seite |

Die Fragen an den Nutzer zu diesen Festlegungen und zu den bisherigen
Arbeitsregeln stehen mit ihren Antworten in 13.3.

### 13.3 Fragen an den Nutzer und Entscheidungen

Die Fragen stehen wie gestellt; dahinter die Antwort des Nutzers vom
2026-10-03 mit der Nummer der Entscheidung.

1. Schutz gegen Geschosse: Im Vorbild treffen Geschosse auch im Schutz nach einem Treffer (jetzt gesichert, notes.md, „Nachtrag: Fernangriffe der Gegner“). Die Spezifikation macht nach E2 alle Gegnertreffer im Schutz wirkungslos (P17). Bleibt es dabei? **Entschieden (E10, P17):** ja, der Schutz wirkt auch gegen Geschosse (5.8, 6.3).
2. Arbeitsregel: Der Spezialangriff aus dem Griff hat dieselben aktiven Frames wie der freie (9.4). Bestätigen? **Entschieden (E10):** bestätigt (9.4).
3. Arbeitsregel: Der Ansturm des Bosses wirft die Figur in der Scheibe bei Kontakt um (12 bis 17 LP), ohne Griff (5.8). Bestätigen? **Entschieden (E10, dazu E21):** bestätigt; in der Scheibe greift der Boss nicht, im Vollspiel greift er mit Wurf (5.8).
4. Der Sprint-Sprungangriff (13 LP) steht nicht in `design.md` 4.5. Gehört er in die Scheibe? Dann gilt seine Reichweite aus A+20 bis zur Messung in allen aktiven Frames (P7). **Entschieden (E15):** ja, 13 LP, 38 bis 147 px in allen aktiven Frames (5.2, 9.3).
5. Der Fehler des Vorbilds beim diagonalen Sprint nach rechts (12 px mehr Weg) wird nicht übernommen (P23). Einverstanden? **Entschieden (E10, P23):** ja, kein Fehler im Diagonalsprint (9.2).
6. Blickrichtung: Griff links 38 statt 39 px, Kette und Sprungangriff bei Blick links 1 px kürzer (jetzt gesichert), die Raketenexplosion bei Blick links ab 96 statt 97 px und die Aufnahmebereiche je Blickrichtung folgen dem Vorbild (5.2, 8.1, 10.1); der Griff von hinten bleibt bei 24 px (Vorbild links 25). Übernehmen oder symmetrisch machen (auch `design.md` 9, Offen 5)? **Entschieden (E14):** symmetrisch; für Blick links gelten die Werte für Blick rechts, Griff von hinten 24 px in beiden Richtungen (5.1, 5.2, 8.1, 10.1, 10.3; K9 nicht übernommen; Test T5, Lauf g und h).
7. Die Kette endet, wenn die Figur den Schlag verlässt (P12); eine Richtung beim Kettendruck gibt wie im Vorbild einen Ausfallschritt von 20 px bzw. bricht die Kette ab (5.6, gemessen). Einverstanden? **Entschieden (E10, P12):** ja (5.6).
8. Treffer, die im Schutz der Figur wirkungslos bleiben, zählen für den Gegner nicht: kein Trefferstopp, sein Angriff bleibt aktiv und kann im ersten Frame nach dem Schutz treffen (P11). Einverstanden? **Entschieden (E10, P11):** ja (5.5, 6.3).
9. Gegriffene Gegner werden auf 19 px vor die Figur gesetzt und beim Wurf in E+22 13 px vor bzw. hinter ihr losgelassen; das ergibt die gemessenen 184,5 px (P19). Passt das zur geplanten Wurfanimation? **Entschieden (E10, P19):** ja, Haltelage 19 px (8.1, 8.4).
10. Festkomma 16.16 für Positionen und Geschwindigkeiten als verbindliche Vorgabe für den Codierauftrag (2.4), oder nur als Empfehlung? **Entschieden (E12):** verbindlich für Positionen, Geschwindigkeiten und Beschleunigungen (2.4).
11. Neueinstieg: Im Vorbild trifft die Landung nach dem Neueinstieg jeden Gegner im Bild (5 LP, Boss 10 LP, wirft um), und der Schutz dauert 252 Frames (6.5). Beides übernehmen? Leben (Vorbild 2, Design 3) regelt spezifikation-welt.md. **Entschieden (E10):** beides übernommen (6.3, 6.5); die Landung zählt beim Boss endgültig (E11, Welt 7.4).
12. Tod der Figur: Die Sonderfälle des Vorbilds Wand (Neueinstieg t+108 statt t+120) und Rollen (t+151) sind übernommen; welche Gegnerangriffe Rollen auslösen, muss spezifikation-welt.md festlegen. Übernehmen oder einheitlich t+120? **Entschieden (E16):** einheitlich N = t+120 für jede Todesart; Wand und Rollen kommen nicht in die Scheibe (4.3, 6.5; Welt 5.5, 10.3).
13. Spielschritt bei zu langsamer Darstellung (2.1): E6 legt 60 Hz fest, sagt aber nichts dazu, wenn die Darstellung keine 60 Bilder je Sekunde schafft. Soll das Spiel dann wie ein Automat langsamer laufen (so steht es jetzt in 2.1), oder soll die Logik in Echtzeit bei 60 Schritten je Sekunde bleiben und dafür Bilder auslassen? **Entschieden (E13):** Echtzeit mit 60 Logikschritten je Sekunde, Bilder auslassen, höchstens 4 Logikschritte je Bild, darüber bleibt die Zeit stehen (2.1).

## Quellen

| Datei | verwendet für |
|---|---|
| `docs/mechanik.md` | Konventionen; Bewegung; Angriff (Standardschlag, Kette); Sprung; Sprungangriff; Griff und Wurf; Spezialangriff; Sprint; Trefferreaktion der Gegner; Umgeworfen werden; Schaden der Gegner; Reichweite der Gegnerangriffe; Unverwundbarkeit; Lebenspunkte; Gegenstände und Waffen; Nicht übernommen |
| `research/captcomm/notes.md` | Messgrößen; Messungen im Einzelnen; Nachträge Sprung und Schlagreichweite, Kettenstufen 2–4, Sprungangriff, Griff und Würfe, Schaden der Gegner, Trefferreaktion der Gegner, Spezialangriff, Sprint, Gegenstände und Waffen, Boss, Fernangriffe der Gegner, Rest der Spielfigur; Objekt-Slots; Gefundene Adressen; Nebenbefunde aus Aufgabe 4 |
| `docs/design.md` | Abschnitte 3, 4, 5, 6, 7, 8, 9 (E1 bis E9) |
| `docs/design-gegner-stages.md` | Abschnitte 2, 7, 8 |
| `docs/erkenntnisse.md` | Was das Kampfgefühl ausmacht; Hinweise für die eigene Grafik |
| `research/captcomm/scripts/grafik/streifen.py` | Bildschirm-y aus Tiefe und Kamera-y (Konstante 234) |
| `docs/auftraege/2026-10-02-opus-auftrag-2-boss-fernkampf-spezifikation.md` | Auftrag S1, Messpaket 2 (M6 bis M8) |
| `docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md` | Entscheidungen E10 bis E22 (Abschnitt 1), technische Vorgaben (Abschnitt 2) |
| `docs/scheibe.md` | Programm der Scheibe: Ablage, Befehle, Abnahme, Festlegungen beim Codieren |

Vorbild ist Captain Commando (Capcom 1991, Arcade, MAME-Set `captcomm`).
Zuordnung: Referenzfigur und Vela = Captain Commando; Nahkämpfer leicht
(Bolzer) = WOOKY; Nahkämpfer schwer (Rammbock) = EDDY; Fernkämpfer (Zünder)
= DICK; Boss Ballast = DOLG; Kometenbraten = Brathähnchen; Sternbeeren =
CHERRY; Raketenwerfer = MISSILE.
