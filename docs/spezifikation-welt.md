# Comet Brawlers: Spezifikation Welt, Gegner, Kamera, Rahmen

Stand 2026-10-03 (S2), Entscheidungen E10 bis E22 und die Festlegungen
beim Codieren (`docs/scheibe.md`, L1 bis L114) eingearbeitet. Diese
Spezifikation beschreibt, was für die
vertikale Scheibe (`docs/design.md`, Abschnitt 8) außerhalb des
Kampfsystems gebaut werden muss: Stage-Daten, Kamera, Wellen, die
Entscheidungen der Gegner und des Bosses, Rang, Gegenstände, Anzeige und
Rahmen. Sie enthält keinen Code; Sprache und Technik legt E22 fest
(Abschnitt 1, „Technik“). Das Kampfsystem steht in `docs/spezifikation-kampf.md` (kurz S1, mit
Abschnittsnummer); S1 nennt dieses Dokument „Welt“ mit Abschnittsnummer.

| Kennzeichen | Bedeutung |
|---|---|
| mechanik.md, „Abschnitt“ | verbindlicher Messwert aus `docs/mechanik.md` |
| beschlossen (E1) bis (E9) | Entscheidung des Nutzers vom 2026-10-02 (`docs/design.md`, Abschnitt 9) |
| beschlossen (E10) bis (E22) | Entscheidung des Nutzers vom 2026-10-03 (`docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md`, Abschnitt 1; `docs/erkenntnisse.md`, „Entscheidungen“); „beschlossen (E10)“ steht für eine bisherige Arbeitsregel der Designdokumente oder eine Festlegung, nach der Abschnitt 13 gefragt hat |
| festgelegt (S2), kurz S2 | hier festgelegt, weil die Designdokumente schweigen; beim Testen anpassbar; die Fragen dazu am Ende von Abschnitt 13 sind entschieden (E10 bis E19) |
| notes.md, „Nachtrag: Boss“ (kurz NB), „Nachtrag: Fernangriffe der Gegner“ (NF), „Nachtrag: Rest der Spielfigur“ | Messwert des Vorbilds aus Messpaket 2 (M6, M7, M8) in `research/captcomm/notes.md`; „unsicher“ steht mit den Werten aller Messungen |
| Platzhalter, offen | auch nach Messpaket 2 nicht bestimmt; der Grund steht dabei, bis dahin gilt der Platzhalter |
| Richtwert | Beobachtung aus `research/captcomm/grafik/README.md` oder `docs/erkenntnisse.md`, nicht gemessen |
| Festlegung beim Codieren, 2026-10-03, Ln | beim Codieren der Scheibe festgelegt, wo diese Spezifikation schwieg oder sich widersprach (Auftrag 3, Abschnitt 2.6); Nummer, Grund und Stand in `docs/scheibe.md`, „Abweichungen und Lücken“ |

## 1. Zweck und Abgrenzung

Die Scheibe soll zeigen, dass Welt und Gegner das gemessene Kampfgefühl
tragen: Gegner kommen an festen Stellen, greifen im gemessenen Rhythmus an,
die Angriffserlaubnis hält den Druck lesbar, und Kamera, Sperre, Blende und
Boss führen durch einen kurzen, vollständigen Ablauf vom Start bis
„STAGE CLEAR“. Jede Regel ist als Aussage über Zeilen des Frame-Protokolls
aus S1, Abschnitt 11, mit den Zusatzspalten aus Abschnitt 11.4 dieses
Dokuments formuliert.

**Inhalt der Scheibe** nach dem Zuschnitt in design-gegner-stages.md,
Abschnitt 7 (beschlossen, E10): Heldin Vela allein; Bolzer (Nahkämpfer
leicht), Rammbock (Nahkämpfer schwer), Zünder mit Raketenwerfer
(Fernkämpfer), Boss Ballast mit Ansturm, Armschwung und Körperpresse;
Kometenbraten und Raketenwerfer; Abschnitte A, B und F der ersten Stage
mit den Wellen 1, 2, 7 und 9 und einer Blende von B nach F. Nicht
enthalten: Titel, Figurenwahl, zweiter Spieler, Continue, Sonderstage,
Lastläufer, Splitter, Pistole, Griff des Bosses (E21; im Vollspiel greift
er nach mechanik.md, „Boss“).

**Aufteilung zu S1.** Die Gegnerlogik hier entscheidet, was ein Gegner tut:
wohin er geht, wann er welchen Angriff beginnt, wann er abbricht. S1 führt
aus, wie der Angriff trifft (Trefferprüfung mit den Flächen aus Abschnitt
5.5 dieses Dokuments) und wie der Gegner auf Treffer reagiert (S1,
Abschnitt 7). In den Reaktionen aus S1 ruht die Gegnerlogik; danach setzt
sie nach Abschnitt 5.9 wieder ein.

**Konventionen.** Achsen, Einheiten, Festkomma 16.16 (verbindlich, E12) und
Eingabelatenz wie in S1, Abschnitt 2: x wächst nach rechts, die Tiefe z
nach hinten (im Bild nach oben), 60 Hz fester Schritt (E6) in Echtzeit
(E13, S1, 2.1), Frame 1 ist der erste Logikschritt.
Regeln lesen ganzzahlige Positionen am Ende des Frames (⌊v⌋). In diesem
Dokument ist dx = ⌊x_Gegner⌋ − ⌊x_Figur⌋ und dz = ⌊z_Gegner⌋ − ⌊z_Figur⌋
(Gegner minus Figur, wie mechanik.md, „Reichweite der Gegnerangriffe“; S1
rechnet Ziel minus Angreifer, also mit umgekehrtem Vorzeichen). dz = +11
heißt: Figur 11 px weiter vorn. K ist Kamera-x, Ky Kamera-y. Die
Symmetrie der Blickrichtung (E14) gilt für Reichweiten, Griff, Aufnehmen
und Raketenexplosion der Figur (S1, 5.1); die gemessenen Flächen der
Gegnerangriffe und Geschosse in diesem Dokument bleiben, wie sie sind.

**Technik (E22, E13).** Wie in S1, Abschnitt 1: TypeScript ohne
npm-Abhängigkeiten; Welt und Gegner gehören zum reinen Logikkern ohne
Browser- und Node-Abhängigkeit; die Darstellung zeichnet über Canvas 2D in
einer HTML-Seite und liest den Kern nur; Prüfläufe und Abnahmetests
(Abschnitt 12) laufen in Node ohne Fenster, Bildschirmfotos über
Playwright. Die Spielschleife folgt E13 (S1, 2.1): Echtzeit mit 60
Logikschritten je Sekunde, ausgelassene Bilder statt langsamerer Logik,
höchstens 4 Logikschritte je Bild, darüber bleibt die Zeit stehen. Pause
und Einzelschritt regeln 10.4 und 10.6. Ablage,
Befehle und Stand der Abnahme: `docs/scheibe.md`.

**Ablauf eines Frames.** Ein Logikschritt besteht aus den Weltschritten W1
bis W8; zwischen W4 und W5 liegt der Kampfschritt aus S1, Abschnitt 2.2
(KS1 bis KS7). Die Reihenfolge ist Teil der Spezifikation, weil Schwellen
wie Weckreiz und Sperre davon abhängen.

| Schritt | Inhalt | Abschnitt |
|---|---|---|
| W1 | Eingriffe eines Prüfstarts für diesen Frame | 11.3 |
| W2 | Rang-Uhr und Rang | 8 |
| W3 | in W7 des Vorframes vorgemerkte Gegner anlegen; Weckreiz mit Kamera-x des Vorframes | 4 |
| W4 | Entscheidungen aller Gegner und des Bosses, Slots aufsteigend: Erlaubnis, Zustand, Gehrichtung, Angriffsbeginn | 5 bis 7 |
| KS1 bis KS7 | Kampfschritt nach S1: Figur mit Begrenzung durch Band, Hindernisse und Bildränder (Kamera-x des Vorframes), Bewegung der Gegner wie in W4 entschieden, Geschosse, Abbruchprüfung der Gegnerangriffe (5.4), Trefferprüfung, Folgen der Treffer | S1, 2.2 |
| W5 | Super-Armor, Fall des Bosses, Punkte, Gegneranzeige | 7, 10 |
| W6 | Kamera mit Blende; danach Verschwinden beim Scrollen | 3, 9 |
| W7 | Wellenauslöser prüfen, neue Gegner für W3 des nächsten Frames vormerken | 4 |
| W8 | Gegenstände (Erscheinen, Flug, Liegezeit), Anzeige, Protokollzeile | 9 bis 11 |

Sperren und Halte lesen in W6 die Zahl der Lebenden und den Stand der
Wellen vom Ende des Vorframes; die Kamera gibt eine Sperre deshalb im Frame
nach dem Tod des letzten Gegners frei, wie S1, Test T10, verlangt.
Wellenauslöser in W7 lesen den Stand dieses Frames.

## 2. Stage-Daten

### 2.1 Datenformat

Jede Stage ist eine Textdatei (UTF-8, Zeilenende LF). Jede Zeile ist ein
Datensatz: zuerst die Satzart, dann Felder als `name=wert`, getrennt durch
Leerzeichen; `#` leitet einen Kommentar ein. Koordinaten sind ganze
Pixel. Die Reihenfolge der `gegner`-Zeilen bestimmt die Slots
(Abschnitt 4.1), sonst ist die Reihenfolge bedeutungslos. Festgelegt (S2).

| Satzart | Felder | Bedeutung |
|---|---|---|
| `stage` | id, name, x_ende, kamera_x_max, start_x, start_z, start_blick; nur Prüfbühne (S1, 11.2): kamera, raender | Weltbreite; größte Kamera-x; Startpunkt der Figur; `kamera=fest` hält die Kamera bei Kamera-x und Kamera-y des Starts (Standard `folgt`), `raender=aus` schaltet 2.2, Punkt 4, ab (Standard `ja`) (Festlegung beim Codieren, 2026-10-03, L2) |
| `band` | x0, x1, unten0, unten1, oben0, oben1 | Tiefenband für x0 ≤ x < x1, Grenzen linear zwischen den Werten bei x0 und x1 |
| `kamera_y` | k0, k1, y0, y1 | Ky als Funktion von K, linear, abgerundet; zwischen zwei Sätzen gilt der Wert des vorigen; vor dem ersten Satz gilt dessen y0 (Festlegung beim Codieren, 2026-10-03, L16) |
| `hindernis` | id, punkte (x:z;…, im Uhrzeigersinn), hoehe | festes konvexes Vieleck in der Ebene x/z |
| `vordergrund`, `hintergrund` | id, x0, x1, zeilen bzw. bild | Bilder vor bzw. hinter allem, ohne Wirkung auf die Logik |
| `behaelter` | id, art, x, z, inhalt | Fass oder Bosskiste (Abschnitt 9) |
| `gegner` | typ, x, z, auftritt, welle, werte, blick | vorplatzierter Gegner; werte = start oder rang |
| `welle` | nr, ausloeser, wert, bedingung, bonus | Auslöser einer Welle (4.4) |
| `eintrag` | welle, typ, auftritt, z, verzoegerung | neu erscheinender Gegner |
| `sperre` | id, kamera_x, welle | Sperre bis „Welle besiegt“ |
| `halt` | id, kamera_x, max_lebende | Halt, solange mehr Gegner leben |
| `schnitt` | kamera_x, figur_x, ziel_kamera_x, ziel_x, ziel_z | Blende in einen anderen Teil der Stage (KA13) |
| `arena` | k0, k1, totzone_links, totzone_rechts | Bossarena |

Fehlende Felder: `gegner blick=links werte=rang`, `behaelter inhalt=leer`,
`welle wert=0 bonus=0`, `eintrag verzoegerung=0`; die Zusatzbedingung
schreibt sich auch `bedingung=lebende<=n`. Einzelheiten in
`docs/scheibe.md`, „Formate“, Stage-Daten (Ergänzung) (Festlegung beim
Codieren, 2026-10-03, L2, L4).

### 2.2 Begehbare Fläche, Wände, Hindernisse

1. Ein Fußpunkt am Boden ist begehbar, wenn unten(x) ≤ ⌊z⌋ ≤ oben(x) gilt
   und er in keinem Hindernis liegt, dessen Höhe größer ist als seine. Der
   Rand eines Hindernisses zählt als innen (Festlegung beim Codieren,
   2026-10-03, L15).
2. Bewegung wird je Achse geprüft, erst x, dann z. Würde ein Schritt die
   begehbare Fläche verlassen, endet er an ihrer Kante; die andere Achse
   bewegt sich weiter. Ein Sprung der Obergrenze zwischen zwei Sätzen
   `band` ist damit eine Wand. Festgelegt (S2). „An ihrer Kante“ heißt: an
   der letzten ganzzahligen begehbaren Lage auf dem Weg, Nachkommaanteil 0;
   gibt es keine, steht die Achse (Festlegung beim Codieren, 2026-10-03,
   L14).
3. In der Luft gelten Hindernisse nur unterhalb ihrer `hoehe`. Setzt jemand
   innerhalb eines Hindernisses auf, wird z im Landeframe zur näheren Kante
   geschoben, bei Gleichstand nach vorn. Festgelegt (S2).
4. Ränder der Figur: K + 24 ≤ x ≤ K + 360 und 24 ≤ x ≤ x_ende − 24, mit K
   des Vorframes (S1, 2.2). Der linke Bildrand ist so eine Wand (design-gegner-
   stages.md, Abschnitt 5, Punkt 1). Der Abstand 24 ist festgelegt (S2).
   An diesen Rändern steht die Figur auf dem genauen Festkommawert der
   Grenze (T1: Wand bei 98) (Festlegung beim Codieren, 2026-10-03, L14).
5. Gegner sind an Band und Hindernisse gebunden, nicht an die Bildränder.
   Blockiert ein Hindernis ihren Schritt in x, gehen sie in der Tiefe zur
   näheren freien Kante, dem z-Rand des umschließenden Rechtecks des
   Hindernisses, bei Gleichstand nach vorn (Festlegung beim Codieren,
   2026-10-03, L61). Geworfene Gegner stoppen an Wänden und bleiben
   höchstens 96 px außerhalb des Bildes (S1, 5.7).
6. Behälter sind bis zum Zerbrechen Hindernisse mit Grundfläche x ± 12,
   z ± 6 und Höhe 32. Festgelegt (S2).

Die Abbildung auf den Bildschirm steht in S1, Abschnitt 2.5
(Bildschirm-y = 234 − (⌊z⌋ − Ky) − ⌊h⌋). Die Untergrenze eines Bandes liegt
also auf dem unteren Bildrand, wenn sie Ky + 10 ist; alle Daten unten
halten das ein.

### 2.3 Daten der Scheibe

Zuschnitt nach design-gegner-stages.md, Abschnitt 7 (beschlossen, E10):
Abschnitte A und B, ein Schnitt mit Blende am rechten Ende von B, dann F mit
den Welt-x der vollen Stage ab Kamera-x 1792. Was der Zuschnitt offenlässt,
ist in der Spalte „Herkunft“ als S2 gekennzeichnet.

| Satz | Werte | Herkunft |
|---|---|---|
| `stage` | x_ende=2304, kamera_x_max=1920, start_x=64, start_z=170, start_blick=rechts | Start S2 |
| `band` A Landedeck | x 0–400, unten 138, oben 213 (75 px) | design-gegner-stages.md, 7 |
| `band` B Händlergasse | x 400–850, unten 138, oben 229 (91 px) | ebenda |
| `band` F Asservatenkammer | x 1700–2304, unten 10, oben 101 (91 px) | ebenda; Beginn bei 1700 statt 1850, damit Gegner von links einlaufen können (S2) |
| `kamera_y` | K 0–466: 128; K 1792–1920: 0 | ebenda (Ky 128 in A und B, 0 in F) |
| `hintergrund` | Frachtcontainer x 330–410; Funkladen x 450–650; Asservatenkammer mit dem Ende der Zollhalle ab x 1700 | ebenda |
| `vordergrund` | Kabelrollen x 96–176 und 280–344, je 24 Zeilen | ebenda |
| `behaelter` | F1 Fass (560, 158) Kometenbraten | ebenda (ein Fass in B); Lage S2 |
| `behaelter` | B1 Bosskiste (2040, 95) Raketenwerfer; B2 (2080, 95) Raketenwerfer; B3 (2120, 95) leer | ebenda (kein Laser) |
| `gegner` | Ballast (2080, 80) auftritt=boss welle=7 | Abschnitt 7 |
| `gegner` | Bolzer (368, 206) auftritt=versteck welle=1 werte=start | Welle 1 |
| `gegner` | Bolzer (633, 168) und Rammbock (663, 208) auftritt=hocke welle=2 werte=start | Welle 2 |
| `sperre` | S1 kamera_x=400 welle=2 | ebenda |
| `halt` | H1 kamera_x=440 max_lebende=0 | beschlossen (E10): kein Gegner aus A und B bleibt zurück |
| `schnitt` | kamera_x=466, figur_x=826, ziel_kamera_x=1792, ziel_x=1900, ziel_z=55 | Ort ebenda; Maße S2 |
| `arena` | k0=1792, k1=1920, totzone 128 bis 256 | ebenda |
| `welle`, `eintrag` | Abschnitt 4.7 | – |

Die vorplatzierten Gegner der Scheibe, auch der Boss, schauen beim Laden
nach links (`blick=links`) (Festlegung beim Codieren, 2026-10-03, L4).

### 2.4 Daten der vollen ersten Stage

Für den späteren Ausbau. Ky fällt nach design-gegner-stages.md, Abschnitt 7
zwischen K 600 und 1112 von 128 auf 0. Die Untergrenze folgt dem unteren
Bildrand für eine Figur am Folgepunkt (x = K + 200): unten(x) = 138 bis
x 800, dann 138 − (x − 800)/4 bis x 1312, danach 10.

| Abschnitt | Welt-x | unten | oben | Ky | Objekte, Hindernisse |
|---|---|---|---|---|---|
| A Landedeck | 0–400 | 138 | 213 | 128 | wie in der Scheibe |
| B Händlergasse | 400–850 | 138, ab x 800 fallend | 229 | 128, ab K 600 fallend | Schaufenster als Glasscheiben x 470–530 und 560–620 an der Obergrenze |
| C Rampe zum Kai | 850–1300 | fallend | 229 → 197 linear | fallend | Luken (1000, 180) und (1190, 170); Fässer (1180, 60) Kometenbraten, (1230, 70) Raketenwerfer; Hindernis Patrouillengleiter (1030:80; 1220:33; 1220:57; 1030:104), Höhe 40, zugleich Vordergrund |
| D Kaiplatz | 1300–1550 | 10 (ab 1312) | 197 | 0 | Glastor x 1440–1500 an der Obergrenze; Säulen 1490–1555 im Vordergrund |
| E Zollhalle | 1550–1850 | 10 | 101 | 0 | Hindernis Tresen (1600:101; 1640:58; 1780:50; 1820:101), Höhe 32: vorn frei, darüber nur im Sprung |
| F Asservatenkammer | 1850–2304 | 10 | 101 | 0 | wie in der Scheibe; dritte Kiste mit Laser |

Wellen 1 bis 9 nach design-gegner-stages.md, Abschnitt 7, mit Bedingungen
wie im Vorbild (notes.md, „Nachtrag: Verhalten der Nahkämpfer“, Teil D):
Welle 3 erst bei höchstens 2 Lebenden, Welle 6 bei höchstens 3, davor
Halt bei Kamera-x 1090, solange mehr als 3 leben. Festgelegt (S2). Welle 9
wie gemessen (E20): Zünder mit Pistole nach dem Tod des ersten
Arena-Bolzers, Zünder mit Raketenwerfer bei einem Viertel der Boss-LP, ein
zweiter nur ab Rang 16 und bei höchstens drei anderen lebenden Gegnern;
in der Scheibe gilt der Zuschnitt (4.7).

## 3. Kamera

Die Kamera ist ein ganzzahliges Paar (K, Ky) mit einem Modus aus FREI,
SPERRE, HALT, BLENDE, ARENA, ENDE. Sie wird in W6 aktualisiert.

| Nr. | Regel | Herkunft |
|---|---|---|
| KA1 | FREI: Ziel Kz = ⌊x_Figur⌋ − 200 (Folgepunkt Bildschirm-x 200); K_neu = max(K, min(Kz, Grenze)). Außerhalb der Arena fährt die Kamera nie nach links | design-gegner-stages.md, 5, Punkte 1 und 2 |
| KA2 | Höchstens 4 px je Frame; so holt sie nach einer Sperre gleitend auf, und der Sprint (höchstens 3,875 px/Frame) bleibt darunter | S2 |
| KA3 | Grenze = Minimum aus kamera_x_max, der Kamera-x jeder wirksamen Sperre und jedes wirksamen Halts, der Kamera-x eines noch nicht ausgeführten Schnitts und k0 vor der Arena; Sperren und Halte, deren Kamera-x links von K liegt, begrenzen nicht (Festlegung beim Codieren, 2026-10-03, L52) | S2 |
| KA4 | Sperre: wirksam, solange ihre Welle nicht besiegt ist; steht K an ihr, Modus SPERRE. Besiegt heißt: alle Gegner der Welle sind aufgewacht bzw. angelegt, und ihre LP liegen unter 0 (S1, Abschnitt 7, t); eine im Prüfstart abgeschaltete Welle gilt als besiegt (11.3) (Festlegung beim Codieren, 2026-10-03, L54) | design-gegner-stages.md, 5, Punkt 3 |
| KA5 | Pfeil „weiter“: ab dem Frame der Freigabe, bis K größer ist als Sperren-x + 64; 16 Frames an, 16 aus. Pfeil, SR und HR (11.4) gibt es nur, wenn die Sperre bzw. der Halt die Kamera im Vorframe hielt; beim Durchfahren keine Meldung (Festlegung beim Codieren, 2026-10-03, L53) | S2 |
| KA6 | Halt: wirksam, solange mehr als max_lebende Gegner leben (4.3); steht K an ihm, Modus HALT. Vorbild: Halt bei Kamera-x 848 mit 5 Lebenden und vor dem Fahrzeug bei mehr als 3; es zählt die Zahl der Lebenden, nicht der Toten. KA4 und KA6 lesen den Stand vom Ende des Vorframes (Abschnitt 1) | notes.md, „Nachtrag: Verhalten der Nahkämpfer“, Teil D |
| KA7 | Erreicht K den Wert k0, Modus ARENA; die Totzone gilt ab dem nächsten Frame | S2 |
| KA8 | ARENA: s = ⌊x_Figur⌋ − K. Ist s > 256, Ziel ⌊x_Figur⌋ − 256; ist s < 128, Ziel ⌊x_Figur⌋ − 128; sonst bleibt K. K bleibt zwischen k0 und k1 und darf hier nach links | design-gegner-stages.md, 5, Punkt 2; Totzone Richtwert grafik/README.md |
| KA9 | Ky aus dem Satz `kamera_y` für das neue K | Abschnitt 2 |
| KA10 | Bildschütteln verschiebt nur das Bild, nie K, Ky oder Logik. Landung der Körperpresse: 11 Frames waagrecht +7, −6, +5, −5, +4, −4, +3, −3, +2, −2, 0 px; Explosion einer Rakete: 4 Frames senkrecht +2, 0, +2, 0 px; es beginnt im Frame des Anlasses (Einschlag, Landung der Körperpresse) (Festlegung beim Codieren, 2026-10-03, L56) | Richtwert grafik/README.md (±2 bis ±7 px in elf Frames; Explosionen +2 px) |
| KA11 | ENDE ab dem Frame nach dem Fall des Bosses: K bleibt stehen | S2 |
| KA12 | Zwei Spieler: Regel in `docs/design.md`, Abschnitt 7; nicht in der Scheibe | – |
| KA13 | Schnitt: Gilt in W6 des Frames c K = kamera_x und ⌊x_Figur⌋ ≥ figur_x, beginnt in c+1 die Blende (Modus BLENDE): c+1 bis c+28 schließt sie, c+29 bis c+106 ist das Bild schwarz, c+107 bis c+134 öffnet sie. Ab c+1 wertet die Figur keine Eingaben aus, laufende Aktionen enden normal. In c+29 springen K auf ziel_kamera_x, Ky nach `kamera_y` und die Figur auf (ziel_x, ziel_z), Blick rechts; ab c+135 wertet sie wieder Eingaben aus. Rang-Uhr und Liegezeiten laufen weiter. Phase und Modus BLENDE von c+1 bis c+134, BL:e in c+135; nur ein Schnitt je Stage (Festlegung beim Codieren, 2026-10-03, L55). Die Blende deckt nur die Szene, nicht die Anzeigeleiste (Festlegung beim Codieren, 2026-10-03, L114) | Blende 28/78/28 design-gegner-stages.md, 5 und 7; Ablauf S2 |

In der Scheibe hält H1 die Kamera bei 440, solange ein Gegner lebt; die
Figur kommt dann höchstens bis x 800 und erreicht die Schnittkante 826
nicht. Ohne Lebende fährt die Kamera bis 466, und die Figur löst den
Schnitt an der rechten Wand von B aus.

## 4. Aktivierung und Wellen

### 4.1 Slots und aktives Fenster

Gegner liegen in s0 bis s19 (S1, Abschnitt 3); s0 ist dem Boss
vorbehalten. Die übrigen vorplatzierten Gegner bekommen beim Laden ab s1
aufsteigend in der Reihenfolge der `gegner`-Zeilen ihren Slot, auch wenn
ein Prüfstart ihre Welle abschaltet (der Slot bleibt dann leer); neu
erscheinende den kleinsten freien ab s1. Festgelegt (S2). Ist kein Slot
frei, entsteht kein Gegner, ohne Ereignis (Festlegung beim Codieren,
2026-10-03, L58).

Ein Gegner ist im **aktiven Fenster**, solange −64 ≤ ⌊x⌋ − K ≤ 447 gilt
(notes.md, „Nachtrag: Verhalten der Nahkämpfer“, A1). Nur dort wird er
gezeichnet, getroffen und darf angreifen; Raketen und Explosionen treffen
ihn außerhalb nicht (mechanik.md, „Gegenstände und Waffen“). Wartende
Gegner außerhalb tun nichts. Ein wacher Gegner außerhalb geht auf die
Figur zu, bis er wieder im Fenster ist; Haltepunkte und Wartepositionen
(Abschnitt 5) liegen nie außerhalb von K + 16 bis K + 368. Festgelegt
(S2), damit kein Gegner eine Sperre dauerhaft blockiert. Für die
Treffbarkeit gilt das aktive Fenster auch auf der Prüfbühne (S1, 11.2)
(Festlegung beim Codieren, 2026-10-03, L26).

### 4.2 Warten und Aufwachen

Vorplatzierte Gegner stehen ab Frame 1 in WARTEN: nicht treffbar, nicht
greifbar, greifen nicht an, zählen nicht als lebend. Hockende sind im
Fenster sichtbar, versteckte und der Boss nicht.

| Auftritt | Weckreiz | Dauer bis kampffähig | Herkunft |
|---|---|---|---|
| `hocke` | in W3: ⌊x⌋ − K ≤ 383 mit K des Vorframes (1 px im Bild) | Bolzer 49, Rammbock 69 Frames | gesichert, notes.md, „Nachtrag: Verhalten der Nahkämpfer“, A1 |
| `versteck` | Auslösen der Welle in W7 von Frame f, Weckreiz in W3 von f+1 | 16 Frames | Dauer gesichert ebenda; Auslöser design-gegner-stages.md, 7, Welle 1 |
| `luke` | wie versteck; erscheint in der Luke | 47 Frames | beschrieben, design-gegner-stages.md, 9 |
| `rand_links`, `rand_rechts` | Auslösen der Welle in f; angelegt in W3 von f+1 bei x = K − 32 bzw. K + 416, z aus dem Eintrag | 0, handelt ab dem Frame des Anlegens | links wie im Vorbild (notes.md, Teil D); rechts S2 |
| `boss` | Arena-Auslöser (Welle 7) in f, Weckreiz in W3 von f+1 | 60 Frames | S2 |

Weckreiz im Frame w heißt: AUFTRITT ab w, kampffähig ab w + Dauer; im
Frame w + Dauer handelt der Gegner schon (ANNAEHERN). Im Auftritt ist er
nicht treffbar und nicht greifbar, zählt aber als lebend. Festgelegt (S2);
dass wartende und auftretende Gegner nicht treffbar und nicht greifbar
sind, ist beschlossen (E10).

### 4.3 Lebende Gegner

Lebend ist ein Gegner vom Weckreiz bzw. vom Anlegen an, bis seine LP unter
0 fallen. Wartende und sterbende Gegner zählen nicht.

### 4.4 Auslöser

| Auslöser | Feld `ausloeser` | erfüllt, wenn | Herkunft |
|---|---|---|---|
| Kamera | `kamera` | K ≥ wert (K dieses Frames) | design-gegner-stages.md, 5, Punkt 12 |
| Figur am Versteck | `figur_abstand` | \|⌊x_Figur⌋ − ⌊x_Gegner⌋\| ≤ wert für einen wartenden Gegner der Welle (Festlegung beim Codieren, 2026-10-03, L57) | ebenda, 7, Welle 1 |
| Arena | `arena` | Modus ARENA und keine Blende | ebenda, 7, Welle 7 |
| Boss-LP | `boss_lp` | LP des Bosses ohne die vorläufigen Abzüge der Super-Armor (während einer Folge lp_folge, sonst LP; 7.5) ≤ wert | beschlossen (E10); im Vorbild zählt auch der vorübergehend gesenkte Wert (NB) |
| Zusatzbedingung | `bedingung=lebende≤n` | Zahl der Lebenden ≤ n | notes.md, Teil D |

Alle Auslöser werden in W7 geprüft, nach der Kamera und mit den LP dieses
Frames. Ist der Auslöser erfüllt und die Zusatzbedingung nicht, bleibt die
Welle scharf. Jede Welle löst genau einmal aus; nach dem Fall des Bosses
löst keine Welle mehr aus (Festlegung beim Codieren, 2026-10-03, L57).
Ausgelöst in f heißt:
Eintrag WL im Protokoll von f, neue Gegner werden in W3 von
f + 1 + verzoegerung angelegt, vorplatzierte Gegner der Welle wachen nach
4.2 auf. Mehrere Wellen eines Frames werden nach Nummer, Einträge nach
Zeilenfolge angelegt.

### 4.5 LP und Schaden beim Erscheinen

Gegner mit `werte=start` haben die festen Werte der Startgegner (Bolzer
16 LP und 5 Schaden, Rammbock 30 LP und 6 Schaden; mechanik.md, „Schaden
der Gegner“, „Lebenspunkte“). Alle anderen bekommen LP nach dem Rang beim
Erscheinen (Abschnitt 8) plus dem `bonus` ihrer Welle; Max-LP = diese LP.
Vorplatzierte Gegner mit `werte=rang` bekommen ihre LP beim Weckreiz
(Festlegung beim Codieren, 2026-10-03, L58).
In der vollen Stage ist der Bonus +2 je früherer Welle desselben Typs,
höchstens +4 (beschlossen, E9); in der Scheibe 0 (beschlossen, E10;
design-gegner-stages.md, 7).

### 4.6 Bossarena

Erwacht der Boss im Frame w, zerbrechen in w alle Bosskisten (Abschnitt 9),
und die Bolzer der Welle 7, im selben W3 angelegt, laufen von links ein
(design-gegner-stages.md, 7: „zugleich laufen zwei Bolzer von links ein“).

### 4.7 Wellentabelle der Scheibe

| Welle | Auslöser | Gegner (Slot) | Auftritt, Ort | LP | Schaden | Kamera |
|---|---|---|---|---|---|---|
| 1 | `figur_abstand` 150 | Bolzer (s1) | versteck (368, 206), hinter dem Container | 16 | 5 | – |
| 2 | Weckreiz je Gegner (K ≥ 250 bzw. 280); dazu der Satz `welle nr=2 ausloeser=kamera wert=250` für WL:2 und die Spalte `wellen`, die Hockenden wachen weiter einzeln nach 4.2 (Festlegung beim Codieren, 2026-10-03, L3) | Bolzer (s2), Rammbock (s3) | hocke (633, 168), (663, 208) vor dem Funkladen | 16, 30 | 5, 6 | Sperre S1 bei K 400 |
| – | – | – | – | – | – | Halt H1 bei K 440; Schnitt bei K 466 |
| 7 | `arena` | Ballast (s0); 2 Bolzer | boss (2080, 80); rand_links, z 30 und 80 | 100; Rang | 7.3; Rang | Arena 1792 bis 1920 |
| 9 | `boss_lp` 25 | Zünder mit Raketenwerfer | rand_links, z 55 | Rang | Rang | Arena |

Die Kamera-x 250 aus design-gegner-stages.md für Welle 2 ist der Weckreiz
am Ort des Bolzers (633 − 383). Bei Rang 11 haben die Bolzer der Welle 7
25 LP, der Zünder 19 LP (design-gegner-stages.md, 7).

## 5. Gegnerlogik Nahkämpfer

### 5.1 Typwerte

| Größe | Bolzer | Rammbock | Herkunft |
|---|---|---|---|
| Gehen normal (x × z) | 1,75 × 0,875 px/Frame | 1,6 × 0,8 | Bolzer gesichert (notes.md, „Nachtrag: Verhalten der Nahkämpfer“, A2); Rammbock 1,6 beschlossen (E9), z im selben Verhältnis (S2) |
| Gehen schnell | 2,25 × 1,125 | 2,0 × 1,0 | Bolzer gesichert; Rammbock beschlossen (E10) |
| Gehstufe | je Gehbefehl schnell mit Wahrscheinlichkeit 1/3 | wie Bolzer | beschlossen (E10; Vorbild 29 bis 41 % der Gehframes) |
| Haltabstand H | 48 nach normalem, 56 nach schnellem Gehen | wie Bolzer | gesichert: Anhalten bei 46 bis 48 bzw. 55 bis 56 px; Hinweis: wegen ⌊x⌋ kann ein Gegner nach schnellem Gehen schon bei 54 px anhalten (Festlegung beim Codieren, 2026-10-03, L64) |
| Pause in Kampfhaltung | 29 − 4·⌊Rang/4⌋ Frames | wie Bolzer | gesichert für Rang 7 bis 23, Rang 24 (5) unsicher |
| Warteabstand | min(120 + 16·k, 140) (k = Platz unter den Wartenden dieser Seite) | wie Bolzer | Vorbild 121 bis 128 px; Grenze 100 bis 140 px nach design-gegner-stages.md, 2; Reihe S2 |
| Abwarten nach einer Serie | 50, 80, 110 oder 140 Frames | 90, 120, 150 oder 180 | Bolzer nach den Dauern im Vorbild (unsicher, Raster 30); Rammbock länger nach design-gegner-stages.md, 1.2 (beschlossen, E10) |
| Spott | 42 Frames, danach Abwarten | wie Bolzer | beschrieben (10/8/8/8/7/1) |
| Verfolgung | 1 Gehbefehl (3/4) oder 2 (1/4) | 0, 1 oder 2 (je 1/3) | Vorbild höchstens 92 Frames, beim leichten mindestens ein Gehbefehl zu 40, beim schweren manchmal keiner (erkenntnisse.md, „Gegner als Vorbild“); Verteilung S2 |
| Liegedauer | 32 Frames (S1, 7) | 16, 20, …, 44 gleichverteilt (S1, P18) | gesichert bzw. beschlossen (E10) |

### 5.2 Zustandsautomat

Die Namen sind die Werte von sn_modus (11.4); in den Reaktionen aus S1,
Abschnitt 7 steht dort deren Name. Dazu kommen FREI (Reaktion beendet, die
Logik entscheidet im nächsten W4) und PUPPE (Logik aus, S1, 11.2)
(Festlegung beim Codieren, 2026-10-03, L6).

| Zustand | Verhalten | Übergänge |
|---|---|---|
| WARTEN | Abschnitt 4.2 | Weckreiz → AUFTRITT |
| AUFTRITT | Animation, nicht treffbar | nach der Dauer → ANNAEHERN |
| ANNAEHERN | mit Erlaubnis zum Haltepunkt (5.3), sonst → ABWARTEN | Haltepunkt erreicht und dz in −10 … +11 → KAMPFHALTUNG ab dem nächsten Frame; Verfolgungsbudget verbraucht → SPOTT oder ABWARTEN (je 1/2) |
| ABWARTEN | zur Warteposition (5.8), dort Stand, Blick zur Figur | Erlaubnis erhalten und Wartezeit abgelaufen → ANNAEHERN |
| KAMPFHALTUNG | Stand, Blick zur Figur, Pause zählt | Pause abgelaufen → ANGRIFF; dz verlässt −10 … +11, \|dx\| > 79 oder Figur hinter ihm (nach seinem Blick im Vorframe) → ANNAEHERN als Verfolgung (Festlegung beim Codieren, 2026-10-03, L62) |
| ANGRIFF | Ablauf nach 5.4 und 5.5 | letzter aktiver Frame → NACHLAUF; Abbruch → ANNAEHERN als Verfolgung |
| NACHLAUF | fester Rückzug, dann Wartepose | Ende → KAMPFHALTUNG (nächster Angriff der Serie) oder Serienende (5.6) |
| SEITENWECHSEL | Bogen auf die andere Seite (5.8) | angekommen → ANNAEHERN |
| SPOTT | 42 Frames | → ABWARTEN |
| Reaktionen | GETROFFEN, UMGEWORFEN, LIEGEN, AUFSTEHEN, GEHALTEN, TOT nach S1, Abschnitt 7 | Rückkehr nach 5.9 |

### 5.3 Bewegung

Der **Haltepunkt** liegt bei (x_Figur ± H, z_Figur) auf der Seite des
Gegners. Die Gehrichtung ist einer von 32 Sektoren zu 11,25°; der Sektor
folgt jeden Frame aus Δx und Δz zum Ziel über eine feste Tabelle der
Tangensgrenzen, nicht über eine Winkelfunktion. Der Schritt ist
(v_x · cos α, v_z · sin α) mit den Werten aus 5.1 (Ellipse, gesichert,
A2), in einer Tabelle auf 1/65536 px gerundet; in z geht er höchstens bis
zum Ziel. Ein Gehbefehl dauert 40 Frames (Vorbild, unsicher); an seinem
Beginn wird die Gehstufe gezogen. Der Haltepunkt ist erreicht, wenn nach
dem Schritt \|dx\| ≤ H gilt; ab dem nächsten Frame steht der Gegner in
KAMPFHALTUNG, sofern dz in −10 … +11 liegt, sonst geht er nur in z weiter
(Festlegung beim Codieren, 2026-10-03, L61). Die
Pause zählt ab dem ersten Frame der Kampfhaltung s; der Angriff beginnt in
A = s + Pause. So entsteht nach einer Trefferreaktion das gemessene
Ausholen in h+45 (Stand ab h+24, Pause 21 bei Rang 8 bis 11; mechanik.md,
„Trefferreaktion der Gegner“).

### 5.4 Angriff, Zielabstand und Abbruch

1. **Zielabstand.** Im Frame A merkt sich der Gegner Z = dx, begrenzt auf
   −48 … +48; Zielpunkt x_Z = ⌊x_Gegner⌋ − Z (mechanik.md, „Reichweite der
   Gegnerangriffe“; die Wahl „Abstand bei A, begrenzt“ ist dort unsicher).
2. **Schaden.** Wird in A nach dem Rang festgelegt (Abschnitt 8).
3. **Abbruch.** Von A+1 bis zum letzten aktiven Frame bricht der Gegner in
   der Abbruchprüfung (S1, 2.2, KS5) desselben Frames ab, in dem die Figur
   außerhalb von
   x_Z − 32 … x_Z + 31 steht oder dz −10 … +11 verlässt. Ein abgebrochener
   Angriff hat keine aktiven Frames mehr. Nicht beim Sprungtritt.
4. **Treffer.** Im ersten aktiven Frame, in dem die Figur im Fenster steht,
   vor dem Gegner oder höchstens 3 px hinter ihm (bei Blick nach rechts
   4 px) und höchstens 48 px hoch (Sprungtritt 50 px). Danach trifft der
   Angriff nicht noch einmal. Ein wirkungsloser Treffer im Schutz der Figur
   zählt dafür nicht: Der Angriff bleibt aktiv, prüft in seinen übrigen
   aktiven Frames weiter und trifft im ersten, in dem die Figur ungeschützt
   im Fenster steht (S1, 5.5, P11; im Vorbild trifft ein Gegner mehrfach
   genau im ersten Frame nach dem Schutz, mechanik.md, „Unverwundbarkeit“).
   Treffer in der Luft werfen um (S1, 6.2).
5. **Trefferstopp.** Nach einem wirksamen Treffer verlängern sich die
   aktiven Frames um 7. Ausnahme Bolzer: Wirft sein Treffer um, endet die
   aktive Pose 7 Frames nach dem Treffer, Nachlauf 0. Wirkungslose Treffer
   im Schutz verlängern nichts (S1, P11).
6. **Schutz.** Ob ein Treffer wirkt, entscheidet S1, Abschnitt 6. Die
   Gegnerlogik fragt den Schutz der Figur nie ab (E2).

### 5.5 Angriffsarten

Werte aus mechanik.md, „Reichweite der Gegnerangriffe“ (gesichert), außer
den Flugwerten des Sprungtritts. Nachlauf zählt die Frames zwischen dem
letzten aktiven Frame und dem ersten Frame mit Stand oder Gehen,
einschließlich des festen Rückzugs; seine Länge wird gleichverteilt aus der
Spanne gezogen. Der Code steht in sn_angriff und im Treffereintrag (S1, 11.4).

| Code | Gegner, Angriff | Startup | aktiv ohne Treffer | Umwerfen | Abbruch | Nachlauf ohne / mit Treffer | Rückzug | Rollen (nur Vorbild, nicht in der Scheibe, E16) |
|---|---|---|---|---|---|---|---|---|
| BA | Bolzer Schlag A | 9 | A+9 bis A+13 | nein | ja | 12–36 / 16–36 | 5 | nein |
| BB | Bolzer Schlag B (schnell) | 4 | A+4 bis A+13 | nein | ja | 7–18 / 11–18 | 0 | ja |
| BC | Bolzer Schlag C | 10 | A+10 bis A+17 | nein | ja | 16–40 / 21–40 | 8 | ja |
| BUA | Bolzer Umwerfschlag A | 9 | A+9 bis A+13 | ja | ja | 30–36 / 0 | 5 | ja |
| BUB | Bolzer Umwerfschlag B | 8 | A+8 bis A+17 | ja | ja | 14–31 / 0 | 0 | ja |
| RA | Rammbock Schlag A | 9 | A+9 bis A+13 | nein | ja | 17–36 / 17–36 | 5 | nein |
| RB | Rammbock Schlag B | 10 | A+10 bis A+17 | nein | ja | 20–41 / 20–39 | 8 | ja |
| RU | Rammbock Umwerfschlag | 9 | A+9 bis A+13 | ja | ja | 30–36 / 5–33 | 5 | ja |
| RS | Rammbock Sprungtritt | 9 | A+9 bis A+45 in der Luft | ja | nein | 1 / 1–33 | 0 | ja |

Die Spalte „Rollen“ zeigt nur, welche Angriffe im Vorbild das Rollmerkmal
tragen (Attribut-Bit 0x0400, notes.md, „Nachtrag: Reichweite der
Gegnerangriffe“; belegt ist das Rollen nur nach 0x440C, bei den
Umwerf-Angriffen 0x4C0C nicht gemessen; ohne Merkmal: Kolbenhieb,
Explosion, Ansturm, Körperpresse sowie der erste und zweite Schwung des
Armschwungs, 0x4002; der dritte Schwung trägt es, 0x4C02). In der Scheibe
hat das Merkmal keine Wirkung: Der Neueinstieg folgt bei jeder Todesart in
t+120 (beschlossen, E16; S1, 6.5); die Logik braucht das Merkmal nicht.

Sprungtritt: trifft in jedem aktiven Frame die Figur bei 0 bis 59 px vor
ihm (Blick rechts −1 bis 58), Tiefe ±12, bis 50 px Höhe. Ab A+5 fliegt er
mit 3 px/Frame auf die Figur zu; Höhe in A+5+n (n = 1 bis 41) gleich
5n − n(n−1)/8, Scheitel 52,5 px, Aufsetzen in A+46. Die Flugwerte sind S2
nach dem Vorbild (52 bis 53 px hoch, etwa 123 px weit).

Der feste Rückzug im Nachlauf bewegt den Gegner nicht, weil seine Strecke
nicht angegeben ist; nach einem wirksamen Treffer verlängert sich die
aktive Pose auch beim Sprungtritt um 7 Frames, bis A+52 (Festlegung beim
Codieren, 2026-10-03, L59).

### 5.6 Serie und Angriffswahl

Eine **Serie** beginnt mit dem ersten Angriff nach Erhalt der Erlaubnis
und besteht aus Gruppen: normale Angriffe, dann ein Umwerf-Angriff;
dazwischen Nachlauf und Pause, kein Gehen. Wirft der Umwerf-Angriff die
Figur wirksam um, endet die Serie; sonst beginnt eine neue Gruppe. So
entstehen Abstände von 38 bis 90 Frames zwischen zwei Angriffen, mit
steigendem Rang kürzer (gesichert, A4). Verteilungen S2 nach den
Häufigkeiten in notes.md, „Nachtrag: Verhalten der Nahkämpfer“, A3 und
A4, und mechanik.md, „Reichweite der Gegnerangriffe“, Folge.

| Entscheidung | Bolzer | Rammbock |
|---|---|---|
| normale Angriffe je Gruppe | 2, 3, 4 oder 5, gleichverteilt (Vorbild meist 2 bis 5) | erster Angriff der Gruppe Sprungtritt mit 30 % (dann ist er der Umwerf-Angriff), sonst 1, 2 oder 3 normale |
| normaler Angriff | BA 70 %, BB 25 %, BC 5 % | RA 50 %, RB 50 % |
| Umwerf-Angriff | nach BA: BUB mit 60 %, sonst BUA; BUB beginnt im Frame nach dem Nachlauf von BA, ohne Pause; die Wahl fällt am Ende des Nachlaufs von BA (Festlegung beim Codieren, 2026-10-03, L60) | RU 70 %, RS 30 % |
| nach dem Serienende | Abwarten 70 %, Seitenwechsel 20 %, Spott 10 % | Seitenwechsel 45 %, Abwarten 45 %, Spott 10 % |

Am Serienende gibt der Gegner die Erlaubnis zurück und zieht die
Abwartezeit (5.1); erst danach fordert er sie neu an. Die Abwartezeit
zählt in jedem Zustand ab dem Serienende; nach verbrauchtem
Verfolgungsbudget gibt es keine neue Abwartezeit. Entscheidungen mit nur
einer Möglichkeit ziehen nicht (Festlegung beim Codieren, 2026-10-03, L60).

### 5.7 Angriffserlaubnis

| Nr. | Regel | Herkunft |
|---|---|---|
| E-1 | Zwei Nahkampfrechte, links und rechts der Figur; die Seite eines Gegners ist das Vorzeichen von dx, bei dx = 0 bleibt die bisherige | beschlossen (E5) |
| E-2 | Nur der Halter des Rechts seiner Seite darf in KAMPFHALTUNG, ANGRIFF, NACHLAUF oder (Zünder) KOLBENHIEB; damit sind höchstens zwei Gegner im Nahangriff, je Seite einer | beschlossen (E5) |
| E-3 | Anfordern in W4, Slots aufsteigend; ein freies Recht der eigenen Seite wird sofort zugeteilt | S2 |
| E-4 | Der Halter behält das Recht in ANNAEHERN, KAMPFHALTUNG, ANGRIFF, NACHLAUF und GETROFFEN; er gibt es ab am Serienende, wenn das Verfolgungsbudget verbraucht ist, beim Umwerfen, Greifen, Werfen und beim Tod | S2 |
| E-5 | Wechselt die Seite des Halters (E-1), weil die Figur über ihn hinweg oder er an ihr vorbei geht, übernimmt er das Recht der neuen Seite, wenn es frei ist; sonst gibt er ab und geht in ABWARTEN. Im Sprungtritt (bricht nicht ab, 5.5) gilt das erst im Frame nach der Landung; bis dahin hat er keine aktiven Frames mehr, sobald er auf die Seite eines anderen Halters gewechselt ist | S2 |
| E-6 | Die Zuteilung hängt nicht von Schutz oder Liegen der Figur ab: Gegner greifen in allen Schutzfenstern und eine liegende Figur an, die Treffer bleiben wirkungslos, auch die von Geschossen (Abschnitt 6, Zeile Schutz). Ausnahme ist die Zeit vom Tod bis zum Erscheinen (E-10) | beschlossen (E2) |
| E-7 | Der Boss zählt nicht zu den zwei Nahangreifern und braucht kein Recht | beschlossen (E10) |
| E-8 | Zielende Fernkämpfer haben ihre eigene Grenze (Abschnitt 6) und zählen nicht als Nahangreifer | beschlossen (E10) |
| E-9 | Bei zwei Spielern gilt E-1 bis E-7 je Figur; das Zielrecht (E-8, Abschnitt 6) bleibt eines für beide Figuren zusammen, ab Stage 6 zwei | beschlossen (E10; je Figur gilt nur die Grenze der Angreifer); nicht in der Scheibe |
| E-10 | Vom Tod der Figur (t+1) bis zu ihrem Erscheinen (N+1, S1, 6.5) und während einer Blende sind alle Rechte frei und werden nicht zugeteilt, und auch der Boss, der kein Recht braucht (E-7), beginnt keinen Angriff (S1, 6.5); im Fall nach dem Erscheinen greifen die Gegner wieder an, ohne Wirkung (E2). Halter gehen dann in ABWARTEN, laufende Angriffe enden ohne AA, ein Sprungtritt landet erst (Festlegung beim Codieren, 2026-10-03, L63) | wie im Vorbild (notes.md, „Nachtrag: Rest der Spielfigur“); Blende S2 |

### 5.8 Abwarten, Seitenwechsel, Verfolgung

**Abwarten.** Die Warteposition liegt auf der eigenen Seite bei
\|dx\| = min(120 + 16·k, 140) und z = z_Figur, begrenzt auf das Band; k
zählt die wartenden Gegner dieser Seite nach Slot ab 0. Läge sie außerhalb
von K + 16 … K + 368, wartet er auf der anderen Seite (Weg wie beim
Seitenwechsel); so wartet kein Gegner ohne Recht näher als 100 px
(design-gegner-stages.md, Abschnitt 2). Ist der Gegner weniger als 1,75 px
von ihr entfernt, steht er; die Grenze gilt je Achse (Festlegung beim
Codieren, 2026-10-03, L61).

**Seitenwechsel.** Erst geht er in z auf z_Figur + 40 oder z_Figur − 40,
wo das Band mehr Platz lässt (bei Gleichstand nach hinten), dann in x bis
\|dx\| = 60 auf der anderen Seite, dann ANNAEHERN. Der Bogen mit
Tiefenversatz ist beschlossen (E9), die Maße sind S2.

**Verfolgung.** Verlässt die Figur den Bereich der Kampfhaltung oder bricht
der Gegner einen Angriff ab, zieht der Halter ein Verfolgungsbudget (5.1)
in Gehbefehlen zu 40 Frames und geht zum Haltepunkt. Ist es verbraucht,
bevor er wieder in Kampfhaltung steht, gibt er das Recht ab und geht in
SPOTT oder ABWARTEN. Er folgt also höchstens 80 Frames (Vorbild
höchstens 92).

### 5.9 Rückkehr nach Treffer und Aufstehen

Die Trefferreaktion ist für alle Gegner gleich, auch für den Boss (E3,
E19; S1, Abschnitt 7; beim Boss kommt die Super-Armor hinzu, 7.4): 23 Frames,
Stillstand h+1 bis h+8, Zittern ab h+9 nur als Darstellung, kein
Rückstoß. Ab h+23 ist der Gegner frei: Hält er das Recht
und steht die Figur im Bereich der Kampfhaltung (5.2), geht er in
KAMPFHALTUNG (s = h+24), sonst in ANNAEHERN; die Serie läuft weiter. Nach
dem Umwerfen hat er das Recht abgegeben; ab G ist er verwundbar und
greifbar, auch nach einem Wurf (im Vorbild dann erst ab G+1; S1, 7),
ohne Schutz (E4), fordert in W4 von G+1 das Recht an und geht ab G+1. Nach dem Losreißen aus dem
Griff gilt dasselbe ab dem ersten freien Frame. Die Reaktion endet in KS3
von h+23 bzw. G; die Logik entscheidet erst ab W4 des nächsten Frames
(dazwischen sn_modus FREI, 11.4), daher kommt das Recht in G+1; Bewegung
ab G+1 und Kampfhaltung ab h+24 bleiben (Festlegung beim Codieren,
2026-10-03, L28, L62).

## 6. Gegnerlogik Fernkämpfer

Der Zünder sucht einen Platz vor der Figur in ihrer Tiefe, zielt 60
Frames sichtbar und gleicht dabei die Tiefe an, schießt und weicht zurück,
wenn die Figur näher kommt (design-gegner-stages.md, 1.4; Zielen nach E17,
nicht wie im Vorbild sofort schießen). Vorbildwerte aus NF (Fernkämpfer
der ersten Stage gegen die passive Figur); Schuss, Rakete und Explosion
bleiben wie gemessen (E17).

| Größe | Wert | Herkunft |
|---|---|---|
| LP | 16 bis 28 nach Rang (Abschnitt 8) | beschrieben, Stufung beschlossen (E9) |
| Gehen | 1,75 × 0,875 px/Frame, schnell 2,25 × 1,125, Gehstufe wie beim Bolzer (5.1); rückwärts mit Blick zur Figur, wenn er sich von ihr entfernt | Werte gesichert (NF); wann das Vorbild schnell geht, ist offen, daher die Regel des Bolzers (S2) |
| Zielpunkt | auf seiner Seite 128 px vor der Figur in ihrer Tiefe oder 120 px vor ihr mit 24 px Tiefenversatz nach vorn oder hinten; Wahl gleichverteilt aus den drei Punkten, neu nach jedem Schuss; begrenzt auf K + 16 … K + 368 | Punkte gesichert (3. Messung, NF); Wahl beschlossen (E10) |
| Zielbeginn | Ist er nach einem Schritt höchstens 8 px in x und 6 px in der Tiefe vom Zielpunkt entfernt, steht er ab dem nächsten Frame (wie 5.3) und fordert dort in W4 das Zielrecht an. Erhält er es, beginnt ZIELEN in diesem Frame z, sonst steht er in BEREIT, bis er es erhält, und beginnt ZIELEN im Frame der Zuteilung. Bei stehender Figur beginnt er also bei 112 bis 136 px. Im Vorbild beginnt hier das kurze Angleichen; geht die Figur dabei auf ihn zu, schießt er auch näher (gemessen bis 105 px) | Fenster und Abstand gesichert (3. Messung, NF); Anfordern am Zielpunkt S2 |
| Zielrecht | höchstens ein Fernkämpfer in ZIELEN oder SCHUSS (ab Stage 6 zwei); Anfordern in W4, Slots aufsteigend; getrennt von den Nahkampfrechten; gehalten von z bis A+16, je Schuss also 77 Frames; abgegeben ohne Ereignis (Festlegung beim Codieren, 2026-10-03, L65) | beschlossen (E5, E17); Trennung beschlossen (E10) |
| Zielen | sichtbare Ankündigung von genau 60 Frames, z bis z+59, mit Zielrecht; Blick zur Figur, x bleibt. In jedem Frame des Zielens, in dem dz nach den Positionen am Ende des Vorframes außerhalb von −6 … +5 liegt, geht er einen Schritt in der Tiefe auf die Figur zu (z-Geschwindigkeit seiner Gehstufe); so folgt er ihr in der Tiefe. Bei stehender Figur ist er ohne Tiefenversatz des Zielpunkts nach höchstens 2 Schritten ausgerichtet (Schritte nur, wenn er bei dz = +6 beginnt), mit 24 px Versatz nach 10 bis 29 Frames (schnell 10 bis 23, normal 13 bis 29). In z+60 beginnt SCHUSS, auch wenn dz dann außerhalb von −6 … +5 liegt: Wer die Ankündigung nutzt und die Tiefe wechselt, weicht aus. Abbruch, wenn die Figur hinter ihm steht oder \|dx\| > 200. Ein Abbruch oder eine Reaktion nach S1, 7 beendet das Zielen; das Zielrecht wird frei, danach beginnt er mit ANNAEHERN von vorn. Im Zielen bleibt der Blick vom Zielbeginn; ein Abbruch hat kein AA (Festlegung beim Codieren, 2026-10-03, L65) | 60 Frames mit Zielrecht beschlossen (E17; design-gegner-stages.md, 1.4); Angleichen und Tiefenabstand beim Schuss (−6 … +5) im Vorbild gesichert (3. Messung, NF; mechanik.md, „Fernangriffe der Gegner“, Unterabschnitte Pistole und Raketenwerfer, Auslösung; dort nach 1 bzw. 12 bis 22 Frames sofort geschossen); Dauern daraus abgeleitet; x S2 (im Vorbild folgt er der Figur dabei langsam in x); Abbruch S2, weil das Vorbild keinen zeigte |
| Schuss (Code ZR) | 17 Frames (5/1/10/1); A = erster Frame = z+60; Schaden in A nach dem Rang (Abschnitt 8); Rakete in Q = A+6 im kleinsten freien Objektslot, 45 px vor ihm, 44 px hoch, in seiner Tiefe; ein Schuss je Angriff | gesichert (NF) |
| Rakete | 5,0 px/Frame geradeaus in seiner Blickrichtung, Höhe sinkt auf 1 px (nur Darstellung); schlägt in Q+20 ein, 100 px nach dem Erscheinen (145 px vor ihm), an einer Wand früher; trifft im Flug nicht und fliegt durch Figur, Gegner und Glas; der Bildrand hält sie nicht auf; Einschlag als Ereignis EX:on (S1, 11.4) (Festlegung beim Codieren, 2026-10-03, L65) | gesichert (3. Messung, NF); Bildrand nicht gemessen |
| Explosion | trifft in Q+21 bis Q+29 (9 Frames), jedes Ziel einmal, wenn (⌊x_Figur⌋ + 4·b) − ⌊x_Einschlag⌋ zwischen −52 und 51 liegt (b = Blick der Figur, +1 rechts, −1 links), also etwa 89 bis 201 px vor ihm (Rakete nach rechts: 89 bis 192, wenn die Figur wegschaut, 97 bis 200, wenn sie zu ihm schaut; nach links 90 bis 193 bzw. 98 bis 201); Tiefe \|dz\| ≤ 12; Figur bis 25 px hoch (bei 26 px unsicher: 2 von 3 Proben getroffen, ab 27 nie), ein früher Sprung weicht also aus; Schaden 12/13/14/15 nach Rangstufe, wirft um. Gegner trifft sie nicht, Glasscheiben zerbricht sie; Behälter offen, Platzhalter: zerbricht sie. Ein Schlag hält sie nicht auf | gesichert (NF, Fläche 3. Messung); Schaden gesichert, gleich der Stufung (E9); Behälter nicht gemessen |
| Schutz | wirkungslos in allen Schutzfenstern der Figur (S1, P17, E2); im Vorbild treffen Geschosse auch im Schutz nach einem Treffer (NF) | beschlossen (E2) |
| Nach dem Schuss | In A+17 gibt er das Zielrecht ab und wählt einen neuen Zielpunkt. Steht er schon dort (höchstens 8 px in x und 6 px in der Tiefe), fordert er das Zielrecht im selben Frame wieder an und zielt erneut 60 Frames (Zielbeginn), sonst geht er hin. Die Pose des Vorbilds nach dem Schuss (30 bis 120 Frames) entfällt. Begründung: Die ruhige, lesbare Phase ist nach E17 das Zielen vor dem Schuss (die „Zielen 60 bis 120“ der Aufnahmen sind diese Pose, NF); Pose und Zielen zusammen ließen ihn je Schuss zweimal lange stehen und machten den Takt langsamer als in der bisherigen Fassung. Der kürzeste Abstand zweier Schüsse steigt so von 48 Frames (17 + Pose 30 + 1 Frame Angleichen) auf 77 (17 + 60), und jeder Schuss ist angekündigt. Doppelschüsse des Vorbilds (zweite Rakete 19 Frames nach der ersten, ohne Ankündigung) gibt es nicht; ihr Anteil im Vorbild ist unsicher (Messagent 8 von 74, Gegenprüfer 2 von 76, dritte Messung 2 von 108) | Ablauf beschlossen (E17; keine Doppelschüsse E10); Pose und Dauern im Vorbild gesichert (NF), nicht übernommen |
| Rhythmus im Vorbild | unsicher: 1,27 und 1,42 Raketen je 1000 Frames (Messagent), 1,03 bis 2,05 (Gegenprüfer), 1,03 bis 2,39 (dritte Messung); Abstände 219 bis 2632, 207 bis 2204 bzw. 204 bis 1949 Frames | NF; nicht übernommen |
| Zurückweichen | Figur näher als 100 px: geht vom Zielpunkt weg; nicht in ZIELEN und SCHUSS, dort zielt und schießt er weiter wie im Vorbild beim Angleichen (Zielbeginn). Im Vorbild weicht er nicht gezielt aus (unsicher, NF). „Vom Zielpunkt weg“ heißt: zu seinem Zielpunkt, von der Figur weg; sn_modus ZURUECK bei \|dx\| < 100 (Festlegung beim Codieren, 2026-10-03, L65) | beschrieben (design-gegner-stages.md, 1.4); nicht im Zielen S2 |
| Kolbenhieb (Code ZK) | nur wenn hinter ihm weniger als 24 px bis zum Bildrand bleiben, \|dx\| ≤ 60 und er das Nahkampfrecht seiner Seite hält (5.7; Anfordern in W4 wie ein Nahkämpfer, Abgabe nach dem Kolbenhieb; ohne Recht schlägt er nicht): wie BA (Startup 9, aktiv A+9 bis A+13, Fenster nach 5.4), Schaden wie ein später Bolzer; Nachlauf wie BA; der Bildrand hinter ihm ist K bzw. K + 383 (Festlegung beim Codieren, 2026-10-03, L65) | beschlossen (E10); im Vorbild nicht gemessen; Recht nach E5, weil der Kolbenhieb kein Zielen ist |
| Tod | seine Waffe fliegt ab t im Bogen mit 2 px/Frame in x von der Figur weg, bis 61 px über seine Höhe in t (Verlauf ⌊n·(34 − n)·61/289⌋, S2), landet nach 34 Frames und ist ab L = t+44 ein Raketenwerfer mit 3 Schuss (9.3), unabhängig von seinen Schüssen; sie erscheint in t, landet in t+34, aufnehmbar und LA ab t+44 (Festlegung beim Codieren, 2026-10-03, L65) | gesichert (3. Messung, NF; Landung bei Zünder am Boden); Richtung und Bogenform S2 |

Zustände (sn_modus): ANNAEHERN, BEREIT (am Zielpunkt, ohne Zielrecht),
ZIELEN, SCHUSS, ZURUECK, KOLBENHIEB und die Reaktionen aus S1, 7; POSE
entfällt (E17, Zeile „Nach dem Schuss“).

| Pistole im Vorbild (Variante A, nicht in der Scheibe; für unser Spiel gilt design-gegner-stages.md, 1.4: Salven zu 2 bis 8 Schüssen im Takt von 17 Frames, abwechselnd normal und umwerfend (der erste nie umwerfend), 5/6/6/7 LP) | Wert | Herkunft |
|---|---|---|
| Salve | 2, 3, 4, 5, 6 oder 8 Schüsse im Takt von 17 Frames nach einem Budget von 20 bis 120 Frames; Kugel in A+6 34 px vor ihm, 58 px hoch, 8 px/Frame, abwechselnd normal und umwerfend (die erste normal) | gesichert (3. Messung, NF) |
| Treffer | (⌊x_Figur⌋ + 4·b) − ⌊x_Kugel⌋ zwischen −17 und 16, Tiefe ±12, bis 59 px Höhe; Schaden 4/5/6/7 nach Rangstufe; Rhythmus unsicher | gesichert (NF) |

## 7. Boss

### 7.1 Werte und Zustände

Ballast hat in der Scheibe 100 LP, fest (`docs/design.md`, Abschnitt 8;
Vorbild in der Tabelle). Er geht mit 1,25 × 0,625 px/Frame (Richtwert 1 bis 1,6), hält
70 px Abstand und braucht kein Nahkampfrecht (E-7). Er geht in x und z
getrennt: in x mit 1,25 px/Frame bis 70 px Abstand, in z mit 0,625 px/Frame
bis zur Tiefe der Figur; zurück weicht er nicht (Festlegung beim Codieren,
2026-10-03, L34). Alle Schritte des Bosses bleiben zwischen x 1792 und 2304
(Arenarand) (Festlegung beim Codieren, 2026-10-03, L37). Zustände: WARTEN,
AUFTRITT (60 Frames, nicht treffbar), BEREIT, ANKUENDIGUNG, ANGRIFF,
NACHLAUF, STOSS und die Reaktionen GETROFFEN, UMGEWORFEN, LIEGEN,
AUFSTEHEN, GEHALTEN, TOT mit den Namen aus S1, Abschnitt 7, sowie TAUMELN
(nur beim Boss, nach dem Spezialangriff, Tabelle unten; Code in sn_akt und
sn_modus). Die Werte stehen hier statt in S1, 7, weil der Boss der
Super-Armor folgt (S1, 13.1, K14); die Trefferreaktion ohne Umwerfen
dauert wie bei allen Gegnern 23 Frames (E3, bestätigt für den Boss mit
E19; S1, 7), die Folgefrist der Super-Armor ist h+23 (7.4). Werte nach NB
(gesichert, 3. Messung):

| Größe | Wert | Herkunft |
|---|---|---|
| LP im Vorbild | nach dem Rang beim Erscheinen 90 (Rang 7 bis 8), 100 (9 bis 15), 110 (16 bis 23), 120 (24) | NB, gesichert |
| Treffer ohne Umwerfen | nach E3 und E19 wie bei allen Gegnern 23 Frames am Ort (h bis h+22), gleich ob von vorn oder hinten und ob er steht, geht oder angreift (ein Treffer von vorn während eines eigenen Angriffs löst nach 7.4, SA3, keine Reaktion aus): Stillstand h+1 bis h+8, Zittern h+9 bis h+14 nur als Darstellung (S1, 7), Welt-x bleibt; was zählt und wann die LP zurückspringen, regelt die Folge aus 7.4. Im Vorbild 27 Frames am Ort (h bis h+26), Zittern +3/+2/+1 px in h+9/h+11/h+13, wenn er geht oder steht; 15 Frames, wenn er von hinten getroffen wird, während er wartet oder angreift, und nach Kettenstufe 2 (nicht übernommen) | beschlossen (E3, E19); Vorbild NB |
| Umwerfen (W wie in S1, 7) | Flug wie F1 bis zum Bodenkontakt (Scheitel 48,24 px in W+27, Boden W+46), Ruhe in W+55 127,25 px vom Trefferort; LIEGEN und AUFSTEHEN zusammen 42 bis 70 Frames in Viererschritten, also G = W+97 bis W+125, gleichverteilt gezogen (S2); liegend nicht treffbar; nach dem Bodenkontakt Auslauf mit 2 px/Frame bis zur Ruhe bei 127,25 px, nach dem dritten Kniestoß F2 mit demselben Auslauf (Festlegung beim Codieren, 2026-10-03, L43) | NB; Verteilung S2 |
| nach einem Wurf | frei 116 bis 144 Frames nach dem Wurftreffer, gleichverteilt in Viererschritten (S2); Bahn F3 nach S1, 5.7 (Festlegung beim Codieren, 2026-10-03, L43) | NB |
| nach der Explosion | Flug 109,25 px (an einer Wand kürzer), frei 132 bis 152 Frames danach, gleichverteilt in Viererschritten (S2); ohne Auslauf (Festlegung beim Codieren, 2026-10-03, L43) | NB |
| nach dem Spezialangriff | kein Liegen: 78 Frames TAUMELN über 135,125 px von der Figur weg, danach sofort treffbar; x-Verlauf wie F1, ab h+1 nicht treffbar, frei in h+78, Treffereintrag mit Wirkung R (Festlegung beim Codieren, 2026-10-03, L44) | NB |
| nach dem Aufstehen | ab G verwundbar und greifbar (E4); im Vorbild erst ab G+16 treffbar | beschlossen (E4); NB |
| Treffer im eigenen Angriff | von hinten jederzeit, von vorn bei Armschwung nur im ersten aktiven Frame (Gleichstand, S1, 5.4), bei Ansturm und Körperpresse jederzeit | NB |

### 7.2 Rhythmus und Auswahl

Der erste Angriff beginnt 60 Frames nach der Kampfbereitschaft, jeder
weitere frühestens d Frames nach dem Beginn des vorigen, d gleichverteilt
170 bis 200 (design-gegner-stages.md, 4, Prinzip 2). Ist ein Angriff
fällig, wählt er in W4; für den Armschwung geht er bis \|dx\| ≤ 78 und
\|dz\| ≤ 6 heran. Ein im Prüfstart schon wacher Boss ist ab Frame 1 bzw.
ab seinem Erscheinen kampffähig; bei einem Prüfstart wie PS7 mit
Angriffen beginnt der erste in Frame 61 (Festlegung beim Codieren,
2026-10-03, L51). Als Beginn eines Angriffs für das Ereignis AS, den
Schaden und den Abstand d zum nächsten zählt der erste Frame der
Ankündigung, bei der Körperpresse der Beginn der Hocke (A−15)
(Festlegung beim Codieren, 2026-10-03, L32).

| Lage | Wahl | Herkunft |
|---|---|---|
| \|dx\| < 100 | Armschwung 2/3, Körperpresse 1/3 | Anteile S2 |
| \|dx\| ≥ 100 | Ansturm, Armschwung, Körperpresse je 1/3 | Grenze und Wahl nach NB (Ansturm ab etwa 100 px, fern alle drei); Anteile S2, im Vorbild unsicher (fern Armschwung, Ansturm, Presse: Messagent 38, 63, 50; Gegenprüfer 61, 57, 50; dritte Messung 8, 16, 14 Fälle) |
| Rhythmus im Vorbild | gegen die passive Figur 29 bis 39 Angriffe in 8000 Frames, Median-Abstand 199 bis 288 Frames, unabhängig vom Rang | NB, gesichert; nicht übernommen (Prinzip 2) |

### 7.3 Angriffe der Scheibe

Jeder Angriff hat mindestens 15 Frames Ankündigung (design-gegner-
stages.md, 4, Prinzip 6). Abläufe und Flächen nach NB (gesichert, 3.
Messung, wo nicht anders vermerkt). Der Schaden je Rangstufe bleibt S2 in
den Spannen der Designdokumente (Vorbild AS 7 bis 12, AN 10 bis 17, KP 13 bis 22).

| Code | Angriff | Ablauf | aktiv | Fläche, Tiefe, Höhe der Figur | Schaden | Umwerfen | Nachlauf |
|---|---|---|---|---|---|---|---|
| AS | Armschwung | Schwung 1 beginnt in A_1 = A, jeder Schwung holt 17 Frames aus. Hat Schwung k (k = 1 oder 2) die Figur wirksam getroffen, beginnt Schwung k+1 in A_k+36 (Vorbild 35 bis 38); sonst endet die Serie mit Schwung k. Höchstens drei Schwünge; ohne Treffer bleibt es bei einem (beschlossen, E18, wie im Vorbild). Ein wirkungsloser Treffer im Schutz der Figur zählt nicht als Treffer (S1, P11) | Schwung k: A_k+17 bis A_k+19, mit Treffer 7 Frames länger | 16 px hinter bis 105 px vor ihm, ±12, bis 66 px | 9/10/11/12 | nur der dritte Schwung, beschlossen (E9) | 30 nach dem letzten aktiven Frame des letzten Schwungs der Serie (offen, nicht gemessen) |
| AN | Ansturm | Ausholen 20 Frames, dann Lauf mit 4 px/Frame (schräg 3,92) höchstens 45 Frames und 176 px; lenkt in der Tiefe 1 px/Frame zur Figur nach; endet bei Treffer, Wand oder Arenarand; Auslauf 30 px in 15 Frames, im n-ten Frame 4 − 0,25·n px/Frame (Festlegung beim Codieren, 2026-10-03, L35); 3,92 px/Frame nur in Frames mit Tiefenschritt, im Schutz der Figur läuft er weiter (Festlegung beim Codieren, 2026-10-03, L36) | jeder Lauf-Frame, auch der letzte (Festlegung beim Codieren, 2026-10-03, L36) | vorn 0 bis 40 px (offen, Platzhalter), ±12, bis 90 px | 12/14/15/17 | ja, ohne Griff (beschlossen, E10, E21) | 16 (Vorbild 14 bis 18) |
| KP | Körperpresse | 15 Frames Hocke, dann A; Sprung zum Ort der Figur in A (höchstens 200 px), x linear bis zur Landung in A+64 (mit Treffer A+71), Höhe steigend bis 107,5 px in A+31, dann fallend (Verlauf S2); z wie x mit ⌊dz·k/64⌋ (S1, 2.4), die Höhe über Konstanten ohne Division (Festlegung beim Codieren, 2026-10-03, L38) | A+51 bis A+62 | \|dx\| ≤ 25 um den Boss selbst, nicht um den Landepunkt (Breite unsicher: Messagent 25, Gegenprüfer 23, dritte Messung 27 px), ±12, Höhe ohne Grenze | 16/18/20/22 | ja | 40 (offen, nicht gemessen); Bildschütteln (KA10) |
| RZ | Stoß (7.4) | 54 Frames Rückzug, 48 px | – | – | 0 | nein | – |

Wegen der Hocke ist jede Körperpresse treffbar; die geschützte Presse
des Vorbilds ohne Vorphase entfällt.

Armschwung im Protokoll: Ereignis AS:s0:ASk je Schwung k, Code AS im
Treffereintrag, sn_angriff AS1 bis AS3; der beim ersten Schwung
festgelegte Schaden gilt für alle Schwünge (Festlegung beim Codieren,
2026-10-03, L33). Körperpresse: Der Nachlauf zählt ab dem letzten aktiven
Frame, sn_modus NACHLAUF erst nach der Landung; in der Luft unterbricht
kein Treffer ohne Umwerfen, ein umwerfender wirft ihn aus der aktuellen
Höhe um (wie S1, P15) (Festlegung beim Codieren, 2026-10-03, L39).

### 7.4 Super-Armor (beschlossen, E11)

Vorbild nach NB, eingearbeitet unten, wo es zum Design passt:

| Größe | Wert | Status |
|---|---|---|
| nie zurückgewiesen | Spezialangriff, Kniestoß, Wurf, Rakete, Laser | gesichert |
| manchmal zurückgewiesen | Kettenstufen 1 bis 3, Tritt, Sprungangriff neutral und hoch, Sprintangriff: LP sinken in h und steigen in h+1 auf den Wert vor diesem Treffer; danach Rückzug (54 Frames, 48 px, ohne Schaden, etwa 62 Frames nicht treffbar), bei umwerfenden Treffern stattdessen Abfangen mit halbem Schaden | gesichert (3. Messung) |
| wann er zurückweist | offen, keine Messung fand eine Regel; Anteil im Bot steigt mit dem Rang: Messagent 18, 15, 19, 24, 28, 39 % bei Rang 7, 9, 12, 16, 20, 24; Gegenprüfer 16 % bei Rang 7, 36 % bei 24 | unsicher |

In der Scheibe gilt die feste Regel SA1 bis SA6 (beschlossen, E11) nach
design-gegner-stages.md, Abschnitt 4, Prinzip 1, ausgewertet in W5. Eine
zufällige Zurückweisung wie im Vorbild gibt es nicht, ebenso kein Abfangen
mit halbem Schaden:

| Nr. | Regel |
|---|---|
| SA1 | Spezialangriff, Kniestoß, Wurf und Explosion (im Vorbild nie zurückgewiesen) sowie umwerfende Treffer (Kette Stufe 4, Sprungangriff neutral, Richtung und hoch, Sprintangriff, Sprint-Sprungangriff, geworfener Gegner, Landung beim Neueinstieg nach S1, 6.5) ziehen ihre LP endgültig ab; umwerfende werfen den Boss um (7.1) |
| SA2 | Ein anderer Treffer ohne Umwerfen (Kettenstufen 1 bis 3) zieht LP vorläufig ab; der Sprungangriff runter zieht seine LP wie jeder Sprungangriff endgültig ab, ohne Umwerfen (Prinzip 1). Der erste vorläufige Treffer eröffnet eine Folge und merkt lp_folge = LP vor dem Treffer (eigenes Feld, nicht lp_vor aus S1, Abschnitt 3). Ein endgültiger Treffer ohne Umwerfen während einer offenen Folge (Sprungangriff runter, Kniestoß 1 und 2) zählt als Treffer der Folge (neues h, wie seine Trefferreaktion nach 7.1) und senkt LP und lp_folge um seinen Schaden; sein Abzug bleibt also, auch wenn die LP nach SA5 zurückspringen. Ein Spezialangriff während einer offenen Folge beendet sie wie ein umwerfender Treffer nach SA4: alle Abzüge bleiben, kein Stoß, der Boss taumelt (7.1). Vorläufig zählt jeder Treffer ohne Umwerfen außer SP, KN, WU, RX, LN und ST (Festlegung beim Codieren, 2026-10-03, L50) |
| SA3 | Außerhalb eines eigenen Angriffs steht der Boss vom ersten Treffer der Folge bis zu ihrer Auflösung in GETROFFEN und handelt nicht. Während eines eigenen Angriffs bricht ein Treffer von hinten den Angriff ab (GETROFFEN), einer von vorn unterbricht nichts. Eigener Angriff heißt ANKUENDIGUNG und ANGRIFF; im NACHLAUF unterbricht ein Treffer (Festlegung beim Codieren, 2026-10-03, L40) |
| SA4 | Endet die Folge mit einem umwerfenden Treffer, bleiben alle Abzüge |
| SA5 | Kommt bis einschließlich h+23 kein neuer Treffer der Folge (h = ihr letzter Treffer; die 23 Frames Trefferreaktion nach E3 und E19, h bis h+22, sind vorbei), springen in W5 von h+23 die LP auf lp_folge zurück, die Folge endet, und der Boss beginnt den Stoß RZ: 54 Frames Rückzug, 48 px von der Figur weg (in den ersten 16 Frames 3 px/Frame, Verlauf S2), ohne aktive Frames, nicht treffbar bis 62 Frames nach seinem Beginn (Vorbild 60 bis 90, Median 62). Läuft gerade ein Angriff, folgt der Stoß nach dessen aktiven Frames (Festlegung beim Codieren, 2026-10-03, L40). Solange er gegriffen ist, ruht die Frist; reißt er sich ohne Umwerfen los, gilt SA5 im Frame danach. Ablauf des Stoßes mit Beginn S in W5: 3 px/Frame in S+1 bis S+16, BEREIT ab S+54, Zustand 2 bis S+61; bei Zustand ≠ 1 beginnt kein Angriff; kein AS-Ereignis für RZ, sn_schaden 0; ein laufender Stoß beginnt nicht neu (Festlegung beim Codieren, 2026-10-03, L41) |
| SA6 | Fallen die LP durch einen Treffer unter 0, stirbt der Boss sofort; die Folge zählt. Mit genau 0 LP kämpft er weiter (wie im Vorbild, NB) |

Die Anzeige zeigt die vorläufigen LP. Folgetreffer zählen bis h+23; die
Kette hält, wenn jeder Folgedruck bis h+20 (Stufe 2, Tritt) bzw. h+19
(Stufe 3) kommt.

### 7.5 Verstärkung an LP-Schwellen

Schwellen gelten für die dauerhaft abgezogenen LP: während einer Folge
lp_folge, sonst LP (beschlossen, E10; im Vorbild zählt auch der
vorübergehend gesenkte Wert, NB). Verstärkung kommt nie nach Zeit (Prinzip 7). In der
Scheibe: Welle 9 bei 25 LP, wie im Vorbild ein Viertel der Max-LP (NB).

### 7.6 Fall besiegt alle

Fallen die LP des Bosses im Frame t unter 0, gilt in W5 desselben
Frames: Alle übrigen lebenden Gegner bekommen LP −1 und gehen in TOT nach
S1, Abschnitt 7 (Flug von der Figur weg); sie geben keinen Bonus und
lassen nichts fallen (beschlossen, E10). Geschosse der Gegner verschwinden, scharfe Wellen
entfallen. Dabei werden die LP auf −1 gesetzt, nicht um 1 gesenkt, die
Geschosse verschwinden ohne Ereignis, und auch schon vorgemerkte Wellen
entfallen (Festlegung beim Codieren, 2026-10-03, L47). Der Slot des Bosses bleibt
nach seinem Tod belegt, es gibt kein FR:s0 (Festlegung beim Codieren,
2026-10-03, L45). Danach folgt das Stage-Ende (10.5).

## 8. Rang

| Regel | Wert | Herkunft |
|---|---|---|
| Spanne, Start | 7 bis 24, Start 9 | mechanik.md, „Schaden der Gegner“ |
| Rang-Uhr | r beginnt bei 0; in W2 jedes Spielframes r := r + 1; ist r = 409 + 600·k (k ≥ 0), steigt der Rang um 1, höchstens 24 | ebenda (erster Anstieg in Frame 409, Rang 24 in Frame 8809) |
| Tod der Figur | Rang −3, mindestens 7, im Frame N des Neueinstiegs (S1, 6.5); r läuft weiter; mit `rang.fest` (11.3) bleibt der Rang auch beim Tod (Festlegung beim Codieren, 2026-10-03, L66) | ebenda; notes.md, „Nachtrag: Schaden der Gegner“ und „Nachtrag: Rest der Spielfigur“ |
| Stillstand | r steht in der Pause und ab dem Frame nach dem Fall des Bosses | S2 |
| Stage-Wechsel | Rang und r laufen weiter | beschlossen (E9); im Vorbild −3 im Frame des Wechsels, nie unter 7, der 600er-Zähler läuft weiter (notes.md, „Nachtrag: Rest der Spielfigur“) |
| Rangstufe | I = 7, II = 8 bis 14, III = 15 bis 21, IV = 22 bis 24 | design-gegner-stages.md, Kopf |

Der Rang wirkt an drei Stellen: beim Erscheinen (LP), beim Angriffsbeginn A
(Schaden) und beim Eintritt in die Kampfhaltung (Pause, auch für
Startgegner). LP später erscheinender Gegner steigen gleichmäßig von U bei
Rang 7 bis O bei Rang 24 (beschlossen, E9):
LP = ⌊(34·U + 2·(O − U)·(Rang − 7) + 17) / 34⌋, also auf ganze LP
gerundet; das ergibt die Werte in design-gegner-stages.md, Abschnitt 1.

| Typ | LP U bis O | Schaden I/II/III/IV | Pause bei Rang 7 / 8–11 / 12–15 / 16–19 / 20–23 / 24 |
|---|---|---|---|
| Bolzer, später | 22 bis 34 | 7/8/9/10 (Startgegner 5) | 25 / 21 / 17 / 13 / 9 / 5 |
| Rammbock, später | 32 bis 42 | 8/9/10/11 (Startgegner 6) | wie Bolzer |
| Zünder | 16 bis 28 | Rakete 12/13/14/15; Kolbenhieb wie Bolzer | – |
| Ballast | 100 fest | 7.3 | – |

## 9. Gegenstände und Behälter

### 9.1 Slots

Behälter, Gegenstände, Geschosse der Gegner und Effekte liegen in den
Objektslots o20 bis o59, jeweils im kleinsten freien (S1, Abschnitt 3);
Raketen der Figur in g0 bis g4. Ist kein Slot frei, entsteht das Objekt
nicht, und das Protokoll vermerkt es mit dem Ereignis OV:Art (11.4)
(Festlegung beim Codieren, 2026-10-03, L8). Beim Laden belegen die Behälter die
Slots in der Reihenfolge ihrer Zeilen.

### 9.2 Behälter

| Art | Verhalten | Herkunft |
|---|---|---|
| Fass | Hindernis (2.2); zerbricht beim ersten Treffer jeder Art (Schlag, Sprungangriff, Explosion, geworfener Gegner, auch Gegnerangriffe) im Frame h; ab h+1 kein Hindernis; Inhalt erscheint in h+1. Prüfangriff und Landung beim Neueinstieg zerbrechen es nicht (S1, 5.5) (Festlegung beim Codieren, 2026-10-03, L25). Der zerbrochene Behälter verschwindet in W8 von h+1, sein Inhalt kommt in den kleinsten freien Objektslot; ein Treffer auf einen zerbrochenen Behälter hat Wirkung W (Festlegung beim Codieren, 2026-10-03, L67) | mechanik.md, „Gegenstände und Waffen“, Behälter |
| Bosskiste | wie Fass, zerbricht aber nur beim Weckreiz des Bosses, alle im selben Frame; ein Treffer auf eine Bosskiste hat Wirkung W (Festlegung beim Codieren, 2026-10-03, L67) | ebenda |
| tragend (S1, 6.5) | in der Scheibe kein Behälter: Fass und Bosskisten liegen nie unter dem Punkt des Erscheinens nach dem Neueinstieg (K + 64 erreicht x 548 bis 572 und 2028 bis 2132 nicht); setzt die Figur doch auf einem auf, gilt 2.2, Punkt 3 | S2; Vorbild: Ölfass mit Oberkante 48 px (notes.md, „Nachtrag: Rest der Spielfigur“) |
| Glasscheibe | nur volle Stage: zerbricht, wenn ein geworfener Gegner sie in x überstreicht und höchstens 17 px in der Tiefe entfernt ist; ohne Inhalt | design-gegner-stages.md, 7 und 8 |

Ein Treffer des Spezialangriffs auf einen Behälter kostet die Figur 9 LP
(S1, 6.4). Behälter verschwinden, sobald K − ⌊x⌋ ≥ 195 gilt
(mechanik.md, „Lebensdauer“: 195 bis 196 px), mit dem Ereignis EN:on:S
(Festlegung beim Codieren, 2026-10-03, L67).

### 9.3 Gegenstände

| Regel | Wert | Herkunft |
|---|---|---|
| Erscheinen | in W8 von h+1 am Ort des Behälters, Höhe 0; die Waffe des toten Zünders nach Abschnitt 6 | mechanik.md, „Lebensdauer“ |
| Flug | Höhe im n-ten Frame nach dem Erscheinen ⌊n·(48 − n)·35/576⌋, Scheitel 35 px bei n = 24, gelandet bei n = 48, also L = h+49 | gesichert für Waffen: 48 Frames Flug ab h+1 (mechanik.md, „Lebensdauer“), bis 35 px hoch (ebenda, „Behälter“); Essen landet im Vorbild einen Frame später (Brathähnchen in h+50, notes.md, „Nachtrag: Gegenstände und Waffen“, `item_v_fass44`; mechanik.md, „Behälter“: 49 bis 50 Frames nach dem Treffer), hier wie Waffen (S2); Formel S2 |
| aufnehmbar | ab L, nicht im Flug; Bereich und Ablauf nach S1, 10.1 | S2; S1 |
| Liegezeit Waffe | liegezeit = f − L; sichtbar bis 699; Blinken 700 bis 791 (2 Frames sichtbar, 2 unsichtbar, beginnend sichtbar); entfernt bei 792 | mechanik.md, „Lebensdauer“ |
| Liegezeit Essen | unbegrenzt | ebenda |
| Scrollen | entfernt in W6 nach der Kamera, sobald K − ⌊x⌋ ≥ 163 | ebenda |
| Stage-Ende | alle entfernt in t+480 | ebenda (etwa 480 Frames nach dem Sieg) |
| Waffe fallen gelassen | nach S1, 10.4, mit neuer Liegezeit | S1 |
| leere Waffe | weggeworfen, nicht aufnehmbar, nach 61 Frames entfernt | mechanik.md, „Lebensdauer“ |

| Gegenstand | Wirkung | Punkte | Herkunft |
|---|---|---|---|
| Kometenbraten | LP auf 72 (S1, 10.2) | 100 nur bei 72 LP, statt der Heilung | Heilwert beschlossen (E9); Punkte design.md, 7 und 8 |
| Raketenwerfer | 3 Schuss, Einsatz nach S1, 10.3 | 0 | design.md, 7 |

## 10. Anzeige und Rahmen

### 10.1 Anzeigeleiste

Raster 384 × 224. Die Lagen sind Richtwerte (S2); fest sind 1 px je LP und
die Inhalte (design.md, Abschnitt 7).

| Element | Lage | Regel |
|---|---|---|
| Name | x 8, Zeile 6 | „VELA“ |
| Punkte | x 48, Zeile 6 | 8 Ziffern mit führenden Nullen |
| Leben | x 8, Zeile 18 | Symbol und Zahl der Leben einschließlich des laufenden (3, 2, 1) |
| LP-Balken der Figur | x 48 bis 119, Zeilen 18 bis 23 | 72 px, 1 px je LP von links; bei LP ≤ 0 leer; im Frame der Änderung |
| Gegneranzeige | Name x 200, Zeile 6; Balken x 200 bis 271, Zeilen 18 bis 23 | der Gegner, dessen LP zuletzt durch eine Handlung der Figur sanken (auch Wurf, geworfener Gegner, Rakete, Spezialangriff); bei mehreren im selben Frame der kleinste Slot, also der Boss zuerst. Bleibt, bis ein anderer getroffen wird, nach dem Tod mit leerem Balken |
| Lagen | – | über 72 LP: Lage n = ⌈LP/72⌉ zeigt LP − 72·(n−1) px in Farbe n über einem vollen Balken in Farbe n−1; Farben grün, gelb, orange (Richtwert grafik/README.md) |
| Pfeil „weiter“ | x 340 bis 376, Zeilen 96 bis 112 | KA5 |

### 10.2 Punkte

| Ereignis | Punkte | Zeitpunkt |
|---|---|---|
| Treffer der Figur auf einen Gegner | 10 je LP Schaden des Treffers, voller Wert auch über die Rest-LP | W5 des Trefferframes |
| vorläufige Treffer auf den Boss | wie oben, beim Zurückspringen nicht abgezogen | wie oben |
| Gegner besiegt | Bolzer 100, Rammbock 200, Zünder 200, Ballast 5000; eine Puppe nach ihrer Rolle (Festlegung beim Codieren, 2026-10-03, L68) | Frame t, erkannt an LP < 0 ≤ lp_vor, auch nach einem Eingriff (Festlegung beim Codieren, 2026-10-03, L68) |
| Essen bei 72 LP | 100 | P+1 |
| Waffe, Behälter | 0 | – |

Werte aus design.md, Abschnitt 7 (beschlossen, E9); Zeitpunkte S2; die
Regel für vorläufige Treffer beschlossen (E10).

### 10.3 Tod und Neueinstieg

Ablauf der Figur nach S1, 6.5 (notes.md, „Nachtrag: Rest der
Spielfigur“): N = t+120 bei jeder Todesart (beschlossen, E16; Wand und
Rollen des Vorbilds nicht in der Scheibe), Erscheinen in N+1, Landung
LN = N+53, Steuerung ab LN+6, Schutz bis LN+199, die Landung trifft jeden
wachen Gegner im Bild (beschlossen, E10; beim Boss endgültig, 7.4). Die
Welt ergänzt:

| Frame | Ablauf |
|---|---|
| t | Rechte frei (E-10); phase TOD; steuerung 0 von t+1 bis LN+5 (Festlegung beim Codieren, 2026-10-03, L68) |
| N | Leben −1, Rang −3 (Abschnitt 8); phase NEUEINSTIEG bis LN+5; nach dem letzten Leben stattdessen phase GAMEOVER und Ereignis GO statt NE:F (Festlegung beim Codieren, 2026-10-03, L68) |
| N+1 bis LN | keine Gegnerrechte bis N+1, danach Zuteilung wie sonst (E-10) |
| LN+6 | steuerung 1, phase SPIEL |

Leben: 3 je Spiel (`docs/design.md`, 7; im Vorbild 2). Nach dem letzten
steht „GAME OVER“ 240 Frames, dann beginnt die Scheibe neu mit Seed + 1;
Continue gehört nicht zur Scheibe (beschlossen, E10). GAME OVER beginnt im
Frame N des letzten Todes, die Scheibe endet in N+239;
den Neustart mit Seed + 1 macht die Darstellung (Festlegung beim Codieren,
2026-10-03, L68).

### 10.4 Pause

P schaltet die Pause um. In der Pause läuft kein Logikschritt, der
Frame-Zähler steht, Protokoll und Aufzeichnung schreiben nichts. Der Druck
von P, der die Pause beginnt oder beendet, wird außerhalb der Logik
ausgewertet und nicht aufgezeichnet; für neue Drücke im ersten Frame
danach gilt der Tastenstand des letzten Spielframes als T(f−1). Angezeigt
wird „PAUSE“. S2; übereinstimmend mit S1, 2.1 und 11.1 (P gehört nicht
zu T und wird nicht aufgezeichnet).

### 10.5 Stage-Ende

| Frame | Ablauf |
|---|---|
| t | Fall des Bosses, alle besiegt (7.6), 5000 Punkte |
| t+1 | Figur wertet keine Eingaben mehr aus, laufende Aktionen enden normal; Kamera ENDE; Rang-Uhr steht |
| t+120 | „STAGE CLEAR“, darunter „BALLAST BESIEGT 5000“; die Heldin spielt die Spezialangriffs-Animation ohne Wirkung (Richtwert Vorbild) |
| t+480 | liegende Gegenstände entfernt; Blende schließt in 28 Frames |
| t+508 bis t+585 | schwarz (78 Frames); in t+585 endet die Scheibe und das Protokoll |

Einen Bonus über die Bosspunkte hinaus gibt es nicht (wie im Vorbild,
mechanik.md, „Punkte“; beschlossen, E10).

### 10.6 Debug-Anzeige

Eine eigene Taste schaltet sie um; sie wird nicht aufgezeichnet und ändert
weder Logik noch Protokoll (Prüfung: gleiches Protokoll mit und ohne).
Inhalt: Frame, Rang und Rang-Uhr, K, Ky und Kameramodus, Seed und Zahl der
Ziehungen, Halter der Rechte; je Gegner Slot, Zustand, Seite, Zielpunkt
und Abbruchfenster; Trefferflächen aller aktiven Angriffe als Kästen in
x/z mit Höhe; Aufnahmebereiche, Bandgrenzen, Hindernisse, aktives Fenster
und Folgepunkt. In der Pause schaltet eine weitere Taste einen
Einzelschritt: einen gewöhnlichen Logikschritt mit dem aktuellen
Tastenstand als T(f). Er zählt wie ein Spielframe (Frame-Zähler,
Rang-Uhr, Protokollzeile und Aufzeichnung); danach bleibt die Pause
bestehen. Er ist die einzige Ausnahme von 10.4.

Bedienung: Der Einzelschritt liegt auf der Taste N. Nach dem Ende der
Scheibe (10.5) beginnt sie wie nach Game Over neu mit Seed + 1; F3 beginnt
neu mit Seed + 1 und kehrt dabei aus einer geladenen Eingabedatei zur
Tastatur zurück (Festlegung beim Codieren, 2026-10-03, L113). Bei der
Tastenabfrage zählt ein Druck, der zwischen zwei Abfragen beginnt und
endet, in der nächsten Abfrage als gedrückt (S1, 2.1) (Festlegung beim
Codieren, 2026-10-03, L110).

## 11. Zufall und Determinismus

### 11.1 Generator

Alle Zufallsentscheidungen kommen aus seedbaren Generatoren, nie aus Uhr,
Bildrate oder Darstellung. Verfahren: 32-Bit-Xorshift (Verschiebungen 13
nach links, 17 nach rechts, 5 nach links) mit Zustand ungleich 0. Eine
Ziehung „gleichverteilt aus n Werten“ ist ⌊r · n / 2³²⌋ mit dem neuen
Zustand r; Anteile in Prozent werden als Ziehung aus 100 mit festen
Grenzen umgesetzt (70/25/5 heißt 0–69, 70–94, 95–99). Festgelegt (S2).

Der **Hauptgenerator** startet mit dem Seed (Prüfstart oder Spielstart;
0 ist verboten). Er liefert nur die Startwerte der Generatoren je Gegner:
Jeder Gegner bekommt beim Laden (Slots aufsteigend) bzw. beim Anlegen eine
Ziehung des Hauptgenerators als eigenen Startwert (0 wird zu 1). Alle
Ziehungen eines Gegners kommen aus seinem Generator; so bleiben die Abläufe
anderer Gegner gleich, wenn sich einer ändert. Gezogen wird nur in W3, W4
und im Kampfschritt (Liegedauer), in fester Reihenfolge der Slots, je
Entscheidung genau einmal; eine Entscheidung mit nur einer Möglichkeit
zieht nicht (Festlegung beim Codieren, 2026-10-03, L60). Die Spalte `zufall_haupt` (S1, 11.3) zählt die
Ziehungen des Hauptgenerators, `sn_zufall` die des Gegners in Slot n.

### 11.2 Zufallsentscheidungen

| Wer | Entscheidung | Zeitpunkt | Verteilung |
|---|---|---|---|
| Nahkämpfer | Gehstufe | Beginn jedes Gehbefehls | schnell mit 1/3 |
| Nahkämpfer | Gruppe, Angriffsart, Umwerf-Angriff | Beginn der Gruppe bzw. vor jedem Angriff | 5.6 |
| Nahkämpfer | Länge des Nachlaufs | nach dem letzten aktiven Frame | gleichverteilt in der Spanne aus 5.5 |
| Nahkämpfer | Reaktion nach dem Serienende, Abwartezeit | Serienende | 5.6, 5.1 |
| Nahkämpfer | Verfolgungsbudget; Spott oder Abwarten danach | Beginn der Verfolgung; Ende des Budgets | 5.1; je 1/2 |
| Rammbock | Liegedauer (S1, 7, P18) | Ruhe nach dem Umwerfen | 16 bis 44 in Viererschritten |
| Zünder | Gehstufe; Zielpunkt | Beginn jedes Gehbefehls; erste Entscheidung nach dem Anlegen und A+17 jedes Schusses | wie Nahkämpfer; je 1/3 (keine Pose nach E17) |
| Boss | Abstand zum nächsten Angriff; Angriffswahl | Angriffsbeginn; Fälligkeit | 170 bis 200 gleichverteilt; 7.2 |
| Boss | Liegen und Aufstehen; frei nach Wurf bzw. Explosion (7.1) | Ruhe nach dem Umwerfen; Wurftreffer; Einschlag | 42 bis 70; 116 bis 144; 132 bis 152, je in Viererschritten gleichverteilt |

### 11.3 Prüfstart und Aufzeichnung

Ein **Prüfstart** legt den Anfangszustand eines Prüflaufs fest und nennt
Eingriffe, die in W1 eines genannten Frames gelten, wie die
gekennzeichneten Eingriffe der Messungen. S1, 11.2 erweitert ihn zur
Prüfszene (Prüfbühne, Puppen, Prüfangriffe); für die Bühne `scheibe` gilt
er unverändert. Felder zusätzlich zu `figur`, `gegner` und `objekte` aus
S1, 11.2:

| Feld | Wirkung |
|---|---|
| `rang`, `rang.fest` | Startrang; `rang.fest` hält ihn (Rang-Uhr steht) |
| `kamera.x`, `kamera.modus` | Startkamera; Ky nach `kamera_y`; mit `kamera.modus=ARENA` gilt die Totzone ab Frame 1 (Festlegung beim Codieren, 2026-10-03, L20) |
| `welle.n=aus` | weder vorplatzierte noch neue Gegner der Welle n; die Welle gilt als besiegt und löst in W7 nie aus, der Eingriff `welle.n` `jetzt` löst sie trotzdem samt neuen Gegnern aus (Festlegung beim Codieren, 2026-10-03, L54) |
| `welle.7=nur_boss` | Welle 7 ohne die Bolzer; der Boss ist wach und kampffähig, die Bosskisten sind zerbrochen; ihr Inhalt erscheint in Frame 1 (Festlegung beim Codieren, 2026-10-03, L17, L67) |
| `sperre.id=aus`, `halt.id=aus`, `behaelter.id=aus` | Satz entfällt |
| `behaelter.id=art,x,z,inhalt` | zusätzlicher Behälter |
| `gegner.sn.erlaubnis=aus` | der Gegner fordert kein Recht an und bleibt in ABWARTEN |
| `boss.angriffe=aus`, `boss.bewegung=aus`, `boss.lp=n` | Boss greift nicht an, bewegt sich nicht, Start-LP; `boss.bewegung=aus` hält nur das Gehen an, Reaktionen, Stoß und Angriffsbewegungen laufen weiter (Festlegung beim Codieren, 2026-10-03, L42) |
| `fest.<entscheidung>=wert` | ersetzt das Ergebnis einer Ziehung (11.2); die Ziehung findet trotzdem statt. Namen unter anderem `gehstufe`, `angriff`, `zielpunkt` (128, 120h oder 120v) und beim Boss `boss_angriff` (AS, AN, KP), `boss_abstand` (170 bis 200), `boss_liegen` (42 bis 70), `boss_frei_wurf` (116 bis 144), `boss_frei_explosion` (132 bis 152) (Festlegung beim Codieren, 2026-10-03, L49, L65) |
| Eingriff `frame, ziel, feld, wert` | setzt den Wert in W1 des Frames; `ziel=welle.n, feld=jetzt` löst Welle n aus |

Gegner des Prüfstarts mit Logik an sind wach und kampffähig. Gleiche
Programmversion, Stage-Datei, Prüfstart, Eingabedatei und gleicher Seed
ergeben bitgleiche Protokolle (S1, 11.6). Debug-Tasten werden nicht
aufgezeichnet; zur Pause 10.4.

### 11.4 Zusätzliche Protokollspalten

Spalten für `protokoll.csv` (S1, 11.3) vor `ereignis`, je Gegnerslot mit
dem Präfix sn_, in der Reihenfolge nach S1, 11.3 (Festlegung beim
Codieren, 2026-10-03, L12); die Felder der Objektslots (liegezeit, inhalt) stehen im
Objektprotokoll (S1, 11.5). `rang`, `rang_zaehler` (Rang-Uhr r),
`kamera_x`, `kamera_y` und `zufall_haupt` definiert S1, 11.3 nach diesem
Dokument.

| Spalte | Inhalt |
|---|---|
| kamera_modus | FREI, SPERRE, HALT, BLENDE, ARENA, ENDE |
| schuetteln | Versatz der Darstellung x/y (KA10), z. B. `7/0` |
| lebende | Zahl nach 4.3 |
| wellen | ausgelöste Wellen, z. B. `1-2-7` |
| pfeil | 0 oder 1 |
| recht_l, recht_r, zielrecht | Slot des Halters als Nummer ohne „s“ (z. B. 1) oder leer (Festlegung beim Codieren, 2026-10-03, L13) |
| leben, punkte, anzeige | Abschnitt 10; anzeige = Slot der Gegneranzeige, als Nummer ohne „s“ oder leer (Festlegung beim Codieren, 2026-10-03, L13) |
| phase | SPIEL, TOD, NEUEINSTIEG, BLENDE, ENDE, GAMEOVER |
| steuerung | 1 wertet Eingaben aus, 0 nicht; Ausnahme: in der Landung nach dem Neueinstieg (LN bis LN+4) wirkt bei steuerung 0 ein Sprungdruck (S1, 4.3, NEUEINSTIEG) |
| sn_modus | Zustand aus 5.2, 6 und 7.1; in den Reaktionen aus S1, 7 deren Name; dazu FREI (Reaktion beendet, die Logik entscheidet im nächsten W4) und PUPPE (Logik aus) (Festlegung beim Codieren, 2026-10-03, L6) |
| sn_recht, sn_angriff, sn_ziel, sn_schaden, sn_timer, sn_zufall | Recht L oder R; Angriffscode aus 5.5 bzw. 7.3 (Armschwung mit Schwung, z. B. AS2); Zielabstand Z; beim Angriffsbeginn gesetzter Schaden; Frames im aktuellen Zustand, einschließlich des laufenden (1 im ersten); Ziehungen seines Generators (Festlegung beim Codieren, 2026-10-03, L13) |
| s0_lpfolge, s0_folge | Super-Armor (7.4); geschrieben, sobald s0 belegt ist, auch ohne Boss, leer bei freiem s0 (Festlegung beim Codieren, 2026-10-03, L13); s0_lpfolge außerhalb einer Folge 0 (Festlegung beim Codieren, 2026-10-03, L46) |

Ereignisse der Welt in der Spalte `ereignis`, im Format von S1, 11.4
(Einträge durch `;`, Felder durch `:` getrennt):

| Eintrag | Bedeutung |
|---|---|
| WL:n | Welle n ausgelöst |
| WK:sn | Weckreiz, Auftritt beginnt |
| RE:sn:L oder R, RA:sn, ZR:sn | Recht erhalten, Recht abgegeben, Zielrecht erhalten |
| AS:sn:Code, AA:sn | Angriffsbeginn A, Abbruch |
| SR:id, HR:id | Sperre bzw. Halt gibt frei |
| BL:a, BL:v, BL:e | Blende ausgelöst (im Frame c aus KA13), Versetzen, Ende |
| SA:s0:lp | Super-Armor springt auf lp zurück |
| BF:s0 | Fall des Bosses, alle besiegt |
| ER:on:Art, LA:on, EN:on:L, S oder E | Gegenstand erscheint, gelandet, entfernt (Liegezeit, Scrollen, Stage-Ende) |
| NE:F, GO, SC | Neueinstieg, Game Over, STAGE CLEAR |
| OV:Art | kein Objektslot frei, das Objekt der Art entsteht nicht (9.1) (Festlegung beim Codieren, 2026-10-03, L8) |

## 12. Abnahmetests

Jeder Test nennt den Prüfstart, die Eingaben im Format von S1, 11.1
(von–bis, Tasten) und erwartete Werte am Frame-Ende; Toleranz keine,
Seed 12345, Bühne `scheibe`. Rechenweg: Gehen 1,75 px/Frame ab dem Frame
nach dem Druck, Kette Stufe 1 trifft in P+2 (S1, 4 und 5). Diese Tests
sind die Eingabedateien nach Welt 12, auf die S1, Test T10 verweist (T2,
T7, T8): dort Lauf a wie T2, Lauf b wie T7 a, Lauf c wie T8 b (Festlegung
beim Codieren, 2026-10-03, L102).

| Prüfstart | Inhalt (sonst Scheibe wie in 2.3, Rang 9, Rang-Uhr läuft) |
|---|---|
| PS1 | welle.1 und welle.2 aus; sperre.S1 aus |
| PS2 | welle.1 aus; gegner.s2 und s3 erlaubnis aus; fest.gehstufe=normal |
| PS3 | figur (600, 180); kamera.x 400; welle.1, 2, 7 aus; sperre.S1 aus; s1 Bolzer (460, 180), vorplatziert, Logik an, erlaubnis aus; fest.gehstufe=normal |
| PS4 | figur.z 206; welle.2 aus; sperre.S1 aus; rang.fest; fest.gehstufe=normal; fest.angriff=BA |
| PS6 | figur (500, 178); kamera.x 300; welle.1, 2 aus; sperre.S1 aus; Bolzer vorplatziert, Logik an, in s1 (600, 178), s2 (620, 178), s3 (640, 178), s4 (390, 178); rang.fest; fest.gehstufe=normal; fest.angriff=BA |
| PS7 | figur (2000, 50) Blick rechts; kamera.x 1792, modus ARENA; welle.1, 2, 9 aus; welle.7=nur_boss, Boss in (2060, 50) Blick links; boss.angriffe und boss.bewegung aus; rang.fest |
| PS8a | wie PS7, figur.z 55 (Tiefe des Zünders aus Welle 9), boss.lp 30, welle.9 an; fest.gehstufe=normal; fest.zielpunkt=128 (Punkt 128 px vor der Figur in ihrer Tiefe) |
| PS8b | wie PS7, boss.lp 2; Puppen (Logik aus, Rolle leicht) s1 Bolzer (2150, 50), s2 Bolzer (1880, 50), s3 Bolzer (1860, 70) |
| PS9 | alle Wellen, Sperre und Halt aus; Puppe s1 Bolzer (30, 170) (links der Figur; ihr Todesflug geht nach rechts, N hängt nach E16 aber nicht vom Flug ab), vorplatziert mit den Startwerten, also 16 LP (Festlegung beim Codieren, 2026-10-03, L103) |
| PS10a | figur (520, 158), LP 40; kamera.x 320; alle Wellen, Sperre und Halt aus |
| PS10b | figur (210, 158); kamera.x 10; alle Wellen, Sperre und Halt aus; behaelter.F1 aus; behaelter.F9=fass,250,158,Raketenwerfer |

**T1 Kamera folgt, linker Rand (KA1, KA2, 2.2).** PS1. Eingabe R 1–120,
L 121–300. Erwartet: 79 f_x 200.5, kamera_x 0; 80 f_x 202.25, kamera_x 2;
121 f_x 274, kamera_x 74; 122 f_blick L; 221 f_x 99; 222 f_x 98 (Wand
K + 24); 301 f_x 98, kamera_x 74; kamera_modus immer FREI, kamera_y 128.

**T2 Weckreiz, Aufwachen, Sperre (4.2, KA4, KA5).** PS2. Eingabe R 1–340;
Eingriffe in 360: s2 lp := −1, s3 lp := −1. Erwartet: 222 kamera_x 250;
223 s2_modus AUFTRITT, WK:s2; 239 kamera_x 280; 240 s3_modus AUFTRITT; 272
s2_modus ABWARTEN; 307 kamera_x 399; 308 kamera_x 400, kamera_modus
SPERRE; 309 s3_modus ABWARTEN; 341 f_x 659; 360 s2_modus und s3_modus TOT,
kamera_x 400; 361 kamera_x 404, FREI, pfeil 1, SR:S1; 375 kamera_x 459.

**T3 Halt, Schnitt, Arena (KA6, KA7, KA8, KA13).** PS3. Eingabe R 1–150,
R 170–200, R 330–460, L 470–560; Eingriff in 160: s1 lp := −1. Erwartet:
23 kamera_x 438; 24 kamera_x 440, HALT; 115 f_x 799.5; 116 f_x 800; 160
s1_modus TOT, kamera_x 440; 161 kamera_x 444, HR:H1; 167 kamera_x 466; 184
f_x 824.5; 185 f_x 826, BL:a; 186 steuerung 0, BLENDE; 213 kamera_x 466;
214 kamera_x 1792, kamera_y 0, f_x 1900, f_z 55, BL:v; 319 steuerung 0;
320 steuerung 1, ARENA; 415 f_x 2048.75, kamera_x 1792; 416 kamera_x 1794;
461 f_x 2129.25, kamera_x 1873; 543 f_x 2001.5, kamera_x 1873; 544 f_x
1999.75, kamera_x 1871; 561 f_x 1970, kamera_x 1842.

**T4 Versteck, Annähern, Pause, Treffer (4.2, 5.3, 5.4).** PS4. Eingabe
R 1–88. Erwartet: 88 f_x 216.25; 89 f_x 218, kamera_x 18, WL:1; 90
s1_modus AUFTRITT; 106 s1_modus ANNAEHERN, recht_r 1, s1_x 366.25; 162 s1_x
268.25; 163 s1_x 266.5; 164 s1_modus KAMPFHALTUNG; 185 s1_modus ANGRIFF,
s1_angriff BA, s1_ziel 48, s1_schaden 5; 194 erster aktiver Frame, f_lp 67.

**T5 Zielpunkt und Abbruch (5.4).** PS4 wie T4, dazu (a) L 185–193:
erwartet 194 f_x 202.25, f_lp 67 (Treffer trotz 15,75 px Weg, Fenster 186
bis 249); (b) U 175–199: erwartet 185 s1_modus ANGRIFF bei dz 10, 186
dz 11, 187 dz 12, s1_modus ANNAEHERN, AA:s1; f_lp 72 bis 200.

**T6 Angriffserlaubnis und Schutz (5.7).** PS6, keine Eingabe. Erwartet:
1 recht_r 1, recht_l 4, s2_modus und s3_modus ABWARTEN; 2 s3_x 636.5; 30
s1_x 547.5; 31 s1_modus KAMPFHALTUNG; 36 s4_x 453; 37 s4_modus
KAMPFHALTUNG; 52 s1_modus ANGRIFF; 58 s4_modus ANGRIFF; 61 f_lp 67; 67
erster aktiver Frame von s4, Treffer mit Wirkung W, f_lp 67 (E2). In keinem
Frame mehr als zwei Gegner in KAMPFHALTUNG, ANGRIFF oder NACHLAUF, nie zwei
mit derselben Seite.

**T7 Super-Armor (7.4).** (a) PS7, Eingabe A 10, A 24, A 40. Erwartet: 12
s0_lp 97, s0_folge 1, s0_lpfolge 100; 27 s0_lp 93; 44 s0_lp 88; 66 s0_lp 88;
67 s0_lp 100, s0_modus STOSS, s0_folge 0, SA:s0:100. (b) PS7, Eingabe
A 10, A 24, A 40, A 57. Erwartet: 60 s0_lp 78, s0_modus UMGEWORFEN,
s0_folge 0; 67 s0_lp 78.

**T8 Schwelle, Zünder und Fall (6, 7.5, 7.6, 10.5).** (a) PS8a, Eingabe
A 10, A 24, A 40, A 57. Erwartet: 27 s0_lp 23, wellen ohne 9; 60 s0_lp 8,
WL:9; 61 s1_typ Zünder, s1_x 1761.75 (angelegt bei 1760, erster Schritt
im selben Frame, 4.2), s1_z 55, s1_lp 17; 119 s1_x 1863.25; 120 s1_x 1865,
s1_modus ANNAEHERN (jetzt höchstens 8 px vom Zielpunkt 1872); 121 s1_modus ZIELEN,
zielrecht 1, ZR:s1; 180 s1_modus ZIELEN, s1_x 1865, s1_z 55; 181 s1_modus
SCHUSS, AS:s1:ZR, s1_schaden 13 (E17: 60 Frames Zielen, 121 bis 180); 187
Rakete des Zünders im Objektprotokoll bei x 1910, z 55; 198 s1_modus
ZIELEN, ZR:s1 (A+17, schon am Zielpunkt, keine Pose); 207 Rakete bei
x 2010 (Einschlag); 208 f_lp 59, f_akt UMGEWORFEN (Explosion, 13 LP).
(b) PS8b, Eingabe A 10.
Erwartet: 12 s0_lp −1, s1_modus bis s3_modus TOT, punkte 5030, BF:s0,
phase ENDE; 13 steuerung 0, kamera_modus ENDE; 132 SC; 492 keine Objekte;
597 letzte Protokollzeile.

**T9 Rang (8, 10.3).** PS9, keine Eingabe; Eingriffe: in 1100 Prüfangriff
s1 1100–1100 Schaden 80 umwerfen; in 1700 erscheint ein Bolzer
(nicht vorplatziert, Logik an) in s2 bei (416, 170) (Satz `gegner …
erscheint=1700`, S1, 11.2) (Festlegung beim Codieren, 2026-10-03, L9). Erwartet: 408 rang 9;
409 rang 10; 1009 rang 11; 1100 f_akt TOT; 1219 rang 11, leben 3; 1220
(N) rang 8, leben 2, f_lp 72, NE:F; 1221 f_x 64, f_z 176, f_h 256; 1273
(LN) f_h 0, s1_lp 11, s1 UMGEWORFEN (Landung, S1, 6.5); 1278 steuerung 0;
1279 steuerung 1; 1473 erster Frame ohne Schutz; 1609 rang 9; 1700 s2_lp
23; beim ersten AS:s2 s2_schaden 8.

**T10 Gegenstände (9).** (a) PS10a, Eingabe A 10, R 62–68, A 72. Erwartet:
12 Treffer auf F1 mit Wirkung B; 13 ER, h 0; 37 h 35; 61 h 0, LA; 69 f_x
532.25; 73 f_lp 72, punkte 0, AU (S1). (b) PS10b, Eingabe A 10. Erwartet:
12 Treffer auf F9; 13 ER Raketenwerfer; 61 LA, liegezeit 0; 760 liegezeit
699, sichtbar; 761 liegezeit 700, blinkt; 852 liegezeit 791, blinkt; 853
EN:L, Slot frei. Sichtbar und Blinken werden über liegezeit im
Objektprotokoll nach 9.3 geprüft (Festlegung beim Codieren, 2026-10-03,
L108). (c) PS10b,
Eingabe A 10, R 70–310. Erwartet: 300 kamera_x 412, Raketenwerfer
vorhanden; 301 kamera_x 414, EN:S.

## 13. Offen bis Messpaket 2

Messpaket 2 ist eingearbeitet; „offen“ heißt: auch jetzt nicht bestimmt.
Die Fragen an den Nutzer am Ende dieses Abschnitts sind durch die
Entscheidungen E10 bis E22 vom 2026-10-03 entschieden; sie stehen mit
ihrer Antwort und der Nummer der Entscheidung da.

| Nr. | Stelle | Ergebnis | Status |
|---|---|---|---|
| O8 | 7.1 | LP im Vorbild nach Rang 90 / 100 / 110 / 120; die Scheibe bleibt bei 100 (design.md, 8) | gesichert |
| O12 | 7.1, 7.2, 7.3 | Reaktion, Umwerfen, Abläufe und Flächen von Armschwung, Ansturm und Körperpresse, Rhythmus. Offen: vordere Fläche des Ansturms und Nachlauf von Armschwung und Körperpresse, weil die Messung sie nicht erfasst; Anteile der Wahl und Breite der Pressenfläche unsicher | gesichert (3. Messung), Rest offen bzw. unsicher |
| O12 | 7.4 | Welche Treffer das Vorbild nie zurückweist, Rücksprung in h+1 auf den Wert vor diesem Treffer, Rückzug 54 Frames und 48 px, Spezialangriff zählt. Offen: wann es zurückweist (keine Regel gefunden, Anteile unsicher); für uns gilt die feste Regel SA1 bis SA6 nach Prinzip 1 (E11) | Arten gesichert, Regel im Vorbild offen |
| O17 | – | Griff mit Wurf (nicht in der Scheibe, im Vollspiel ja: E21): packt nur im Entscheidungsframe bis 49 px, Wurf nach 59 Frames; Wurfweite unsicher (NB) | gesichert, Weite unsicher |
| O18 | 4.4, 7.5 | Im Vorbild zählt auch der vorübergehend gesenkte Wert; für uns zählen die dauerhaft abgezogenen LP (E10) | gesichert |
| O11 | 6 | Auslösung, Zielpunkt, Ablauf, Rakete, Explosion, Waffe beim Tod; Pistole. Offen: Abbruch des Zielens und Bildrand der Rakete (im Vorbild nicht aufgetreten); Rhythmus und Doppelschüsse unsicher. Für uns: 60 Frames Zielen vor dem Schuss (E17), keine Doppelschüsse (E10) | gesichert (3. Messung), Rest offen bzw. unsicher |
| O11 | – | Messerwurf (nicht in der Scheibe), Werte in NF | gesichert |
| O7 | 8 | im Vorbild −3 beim Stage-Wechsel; unsere Regel bleibt (E9) | gesichert |
| O9 | 4.3, 7.6 | Gegner und Boss sterben erst unter 0 LP, wie hier angenommen (S1, 13.1, K6) | gesichert |
| O10 | 10.3 | Tod, Neueinstieg, Landung und Schutz nach S1, 6.5 (S1, 13.1, K7). Offen: ob die Landung Gegner außerhalb des Bildes trifft und der Schutz in anderen Stages, weil nur Stage 1 gemessen ist | gesichert (3. Messung), Rest offen |

Die Abnahmetests T7 und T9 sind nach dem Nachtrag neu gerechnet, T7
zusätzlich mit der Frist nach E3 (h+23). Nach E10 bis E22: T7 bleibt (E11,
E19 bestätigen Regel und Frist); T8 (a) prüft zusätzlich den Zünder nach
E17 (PS8a mit Figur in z 55 und festen Ziehungen; s1_x in 61 jetzt 1761.75,
weil er im Frame des Anlegens schon geht); T9 bleibt (N = t+120 nach E16),
nur die Begründung in PS9 ist angepasst.

**Fragen an den Nutzer** zu den Festlegungen S2, wie gestellt; dahinter die
Antwort vom 2026-10-03 mit der Nummer der Entscheidung:

1. Halt H1 bei Kamera-x 440: Die Scheibe lässt die Figur erst durch die
   Blende nach F, wenn kein Gegner aus A und B mehr lebt. Einverstanden?
   **Entschieden (E10):** ja (2.3, KA6).
2. Super-Armor bis zur Designentscheidung: Kettenstufen 1 bis 3 zählen nur,
   wenn die Kette umwirft; sonst springen die LP 23 Frames nach dem letzten
   Treffer zurück. Das Vorbild weist stattdessen einzelne Treffer zufällig
   zurück (Anteil steigt mit dem Rang, Regel unbekannt). Welche Regel?
   **Entschieden (E11):** die feste Regel SA1 bis SA6, keine zufällige
   Zurückweisung (7.4).
3. Punkte für Treffer, deren LP beim Boss zurückspringen, bleiben erhalten
   (10 je LP). Behalten oder abziehen? **Entschieden (E10):** behalten
   (10.2).
4. Gegner, die beim Fall des Bosses zusammenbrechen, geben keinen Bonus und
   lassen keine Waffe fallen. Einverstanden? **Entschieden (E10):** ja
   (7.6).
5. Stage-Ende ohne Bonus über die 5000 Bosspunkte hinaus (wie im Vorbild).
   Oder ein Bonus, z. B. für Rest-LP? **Entschieden (E10):** kein Bonus
   (10.5).
6. Zünder: Zielpunkt zufällig aus den drei Punkten des Vorbilds, nach jedem
   Schuss eine Pose von 30 bis 120 Frames, keine Doppelschüsse (Anteil im
   Vorbild unsicher). Einverstanden? **Entschieden (E10, dazu E17):**
   Zielpunkt zufällig aus den drei Punkten, keine Doppelschüsse; die Pose
   nach dem Schuss entfällt, weil nach E17 vor jedem Schuss 60 Frames
   gezielt wird (Abschnitt 6, Zeile „Nach dem Schuss“).
7. Wartende und auftretende Gegner (Hocke, Versteck, Luke, Boss-Auftritt)
   sind nicht treffbar und nicht greifbar. Einverstanden?
   **Entschieden (E10):** ja (4.2).
8. Rammbock: schnelle Gehstufe 2,0 px/Frame und längere Wartezeit nach
   einer Serie (90 bis 180 statt 50 bis 140 Frames). Einverstanden?
   **Entschieden (E10):** ja (5.1).
9. Game Over in der Scheibe ohne Continue, danach Neustart der Scheibe mit
   Seed + 1. Einverstanden? (Neueinstieg, Landungstreffer und Rollen:
   S1, 13.3, Fragen 11 und 12) **Entschieden (E10, dazu E16):** ja (10.3);
   Landungstreffer und Schutz 252 Frames übernommen (E10), Neueinstieg
   einheitlich t+120 ohne Rollen und Wand (E16).
10. Zünder: Soll er vor jedem Schuss 60 bis 120 Frames sichtbar zielen und
    dafür das Zielrecht halten (design-gegner-stages.md, 1.4 und 9), oder
    wie im Vorbild nur 1 bis 22 Frames die Tiefe angleichen, sofort
    schießen und die 60 bis 120 Frames danach als Pose ohne Zielrecht
    stehen (Abschnitt 6), die dann nicht wie Zielen aussehen darf?
    **Entschieden (E17):** sichtbares Zielen 60 Frames mit Zielrecht, dann
    Schuss; Schuss, Rakete und Explosion wie gemessen (Abschnitt 6; Test T8).
11. Ballast: Schwingt er den Arm immer dreimal (design-gegner-stages.md, 4)
    oder wie im Vorbild nur nach einem Treffer weiter, höchstens dreimal
    (7.3)? **Entschieden (E18):** wie im Vorbild, der nächste Schwung nur
    nach einem Treffer des vorigen, höchstens drei (7.3).
12. Ballast: Soll er wie im Vorbild 27 Frames zucken (Ausnahme von E3),
    damit auch späte Kettendrücke noch zur selben Folge der Super-Armor
    zählen? Die Spezifikation setzt nach E3 23 Frames (7.1, 7.4, SA5).
    **Entschieden (E19):** 23 Frames wie bei allen Gegnern, Folgefrist h+23
    (7.1, 7.4).
