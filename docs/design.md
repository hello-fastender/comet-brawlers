# Comet Brawlers: Designdokument (Kern)

Stand 2026-10-02, Entwurf. Dieses Dokument beschreibt Spielidee, Welt,
technische Grundlage, Spielfigur, Helden, Schwierigkeit, Rahmen und den
ersten spielbaren Stand. Gegner, Bosse, Stages und Gegenstände stehen in
`docs/design-gegner-stages.md`. Verbindliche Zahlen stehen in
`docs/mechanik.md`; dieses Dokument zitiert sie mit dem Abschnittsnamen
(etwa „Sprung“) und erfindet keine neuen.

| Kennzeichnung | Bedeutung |
|---|---|
| „Abschnitt“ ohne Dateiname | Abschnitt in `docs/mechanik.md` |
| (Workflow) | in `mechanik.md` so markiert: von mehreren Agenten gemessen, aber ohne Skript im Repo |
| Richtwert | Wert aus `docs/erkenntnisse.md` oder `research/captcomm/grafik/README.md`, nicht in `mechanik.md`; zur Orientierung, nicht verbindlich |
| notes.md, „Nachtrag: …“ | Wert aus den Messungen M1 bis M5 vom 2026-10-02 (Trefferreaktion der Gegner, Verhalten der Nahkämpfer, Reichweite der Gegnerangriffe, Spezialangriff, Sprint, Gegenstände und Waffen), Abschnitt in `research/captcomm/notes.md`; „unsicher“ steht mit den abweichenden Werten |
| offen (nicht beauftragt) | Wert fehlt, keine Messung beauftragt |
| Vorschlag | Designvorschlag ohne Messgrundlage, Entscheidung des Nutzers |

## 1. Vision in zehn Sätzen

Comet Brawlers ist ein Beat-'em-up für einen oder zwei Spieler im Stil der
Spielhallenautomaten um 1991: seitlich scrollende Stages, Kämpfe in einem
begehbaren Tiefenstreifen, Gegnerwellen und ein Boss am Ende jeder Stage.
Es richtet sich an Spieler, die diese Automaten kennen und ihr direktes
Kampfgefühl vermissen, und an Freunde, die gemeinsam an einem Bildschirm
spielen wollen. Eine Partie soll an einem Abend durchspielbar sein und beim
zweiten Versuch besser gelingen, weil der Spieler Abstände und Rhythmus
gelernt hat. Vom Vorbild übernehmen wir das Kampfgefühl nach Zahlen:
Laufen, Sprung, Schlagkette, Griff, Wurf, Trefferstopp und Schutzfenster
mit den gemessenen Werten aus `mechanik.md`. Diese Werte gelten Frame für
Frame, und jede bewusste Abweichung steht in `mechanik.md`. Eigen sind die
vier Helden, die sich alle gleich bewegen und nur in Kette, Wurf und
Spezialangriff unterscheiden. Eigen sind auch Welt und Geschichte, als
Arbeitsannahme ein Frachthafen im Eis eines Kometen. Gegner, Bosse und
Stages entwerfen wir selbst; das Vorbild liefert dafür nur Rollen und
Richtwerte für Lebenspunkte, Schaden und Stage-Längen. Grafik und Sound
entstehen neu, mit Figuren in der Größe des Vorbilds und Musik ohne
Anleihen. Ziel ist ein Spiel, das sich in der Hand wie ein Automat von
1991 anfühlt und auf den ersten Blick als eigenes Werk erkennbar ist.

## 2. Welt und Ton

### Vorschlag A: Kometenhafen „Perihel“

Im Eiskern des Kometen Orrin liegt der Frachthafen Perihel, der bei jedem
Vorbeiflug am inneren System Waren umschlägt. Das Schweif-Syndikat hat
Docks, Lager und Kontrollturm besetzt und will den Kometen mit seinen
Bahntriebwerken auf Kollisionskurs mit der Hauptstadt des Systems bringen.
Die Helden sind Hafenleute, die sich mit Werkzeug und Fäusten vom
Andockring bis zum Triebwerksraum durcharbeiten. Der Ton ist kernig und
comichaft: Neonlicht auf blauem Eis, dampfende Maschinen, Gegner in
Overalls mit Atemmasken. Die Stages führen über Frachtdecks, Eisstollen und
Treibstofflager bis zu einer Fahrt durch den Kometenschweif als
Sonderstage.

### Vorschlag B: Küstenstadt nach dem Einschlag

Ein Bruchstück eines Kometen ist vor einer Küstenstadt ins Meer gestürzt,
die Flutwelle hat die Uferviertel verwüstet. Aus dem Krater wachsen
leuchtende Kristalle, die Maschinen zum Leben erwecken und Menschen
stärker, aber reizbarer machen. Banden plündern die geräumten Viertel,
während ein Konzern die Kristalle heimlich abbaut. Der Ton ist sommerlich
und laut wie ein Katastrophenfilm aus der Videothek: Palmen, Neon,
umgekippte Busse, Möwen. Die Stages führen von der Strandpromenade über
Hafen und Kanalisation zur Bohrinsel des Konzerns und hinab in den Krater.

### Vorschlag C: Zirkusschiff zwischen den Planeten

Ein Wanderzirkus reist mit einem alten Frachter von Planet zu Planet und
spielt in jeder Station. Ein neuer Direktor hat das Schiff übernommen, die
Artisten gegen Roboter getauscht und nutzt die Tournee für Raubzüge. Die
Helden sind die entlassenen Artisten, die ihr Schiff zurückerobern. Der Ton
ist bunt, schrill und voller Slapstick: Manege, Raubtierkäfige,
Menschenkanonen und Clowns als Gegner. Die Stages wechseln zwischen den
Decks des Schiffs und den Planeten, auf denen es landet.

### Arbeitsannahme

**Vorschlag A, Kometenhafen „Perihel“ (Vorschlag, Entscheidung des
Nutzers offen).** Der Spielname trägt den Kometen schon, der Hafen bietet
Schauplätze von Eis bis Schwerindustrie, und der Kometenschweif ergibt eine
natürliche Sonderstage mit automatischem Scrollen. Die Helden in
Abschnitt 5 sind für diese Welt entworfen; fällt die Wahl auf B oder C,
behalten sie ihre Werte und bekommen neue Kostüme.

## 3. Technische Grundlage

| Festlegung | Wert | Quelle |
|---|---|---|
| Logische Auflösung | 384 × 224 Pixel; Spiellogik, Kollision und Kamera rechnen in diesem Raster | „Konventionen“; erkenntnisse.md „Hinweise für die eigene Grafik“ |
| Spielschritt | fest 60 Hz, ein Logikschritt je Frame, alle Dauern in Frames. Das Original läuft mit 59,637405 Hz; dieselben Frame-Zahlen ergeben bei 60 Hz 0,6 % kürzere Zeiten | „Konventionen“ |
| Einheiten | 1 Positionseinheit = 1 Pixel, horizontal wie in der Tiefe. Drei Achsen: x (Welt), Tiefe, Höhe. Positionen und Geschwindigkeiten mit Nachkommastellen, fein genug für Werte wie 70/256 px/Frame² | „Konventionen“, „Umgeworfen werden“ |
| Tiefe | eigene Achse: Sie bestimmt Bildzeile und Zeichenreihenfolge, die Höhe hebt die Figur über ihren Schatten | „Konventionen“, „Sprung“ |
| Trefferprüfung | über Abstände der Positionen von Angreifer und Ziel in x, Tiefe und Höhe, nicht über Bildüberlappung | „Angriff (Standardschlag, Kette)“, „Sprungangriff“; erkenntnisse.md „Hinweise für die eigene Grafik“ |
| Eingabelatenz | Reaktion einen Frame nach der Eingabe (P+1), bei Laufen, Schlag und Sprung gleich. Die Werte in `mechanik.md` schließen diese Latenz ein; die Spiellogik darf keine weitere hinzufügen | „Konventionen“ |
| Trefferstopp | 7 Frames je Treffer: Die Animation des Angreifers steht still. Beim Sprungangriff verlängert jeder Treffer die aktiven Frames um 7 | „Angriff (Standardschlag, Kette)“, „Sprungangriff“ |
| Trefferstopp des Getroffenen | Der getroffene Gegner zeigt ab h+1 die Trefferpose, zittert in h+9 bis h+14 um ±3, ±2, ±1 px ohne Rückstoß und ist ab h+23 frei. Ein eigener Stillstand des Getroffenen ist offen, weil die Messung Pose und Position ausgewertet hat, keinen getrennten Trefferstopp | notes.md, „Nachtrag: Trefferreaktion der Gegner“ |
| Rendering | skaliert nur die Ausgabe, bevorzugt ganzzahlig mit Rand; Logik und Kollision bleiben im Raster von 384 × 224 | Vorschlag |

Warum nur so: Alle Werte in `mechanik.md` sind in Pixeln und Frames des
Originalbilds gemessen, und nur in denselben Einheiten lassen sie sich ohne
Umrechnung eintragen. Ein variabler Zeitschritt oder eine andere logische
Auflösung würde Grenzen wie das Kombofenster von 16 Frames oder den
Unterschied zwischen 85 und 86 px Reichweite in gerundete Bruchteile
zerlegen, die sich nicht mehr Frame für Frame mit den Belegen vergleichen
lassen. Weil das Rendering nur die Ausgabe skaliert, bleiben Reichweiten,
Tiefenstreifen und Figurengrößen im Verhältnis des Vorbilds, und Bild und
Spielgefühl passen zusammen.

## 4. Spielfigur, Grundkit

Die Zeiten und Reichweiten gelten für alle Helden, außer der Wurfweite. Die Schadenswerte sind
die der Allrounderin Vela (Abschnitt 5), deren Werte genau der gemessenen
Referenzfigur entsprechen; die anderen Helden weichen nur in Kette, Wurf und
Spezialangriff ab.

Bezugsframes wie in `mechanik.md`: **P** erster gedrückter Frame, **h**
Frame, in dem ein Treffer die LP senkt, **D** Frame des Kettendrucks, **J**
Sprungdruck, **A** Angriffsdruck im Sprung, **E** Wurfeingabe im Griff,
**K** Kniestoß-Druck. Die Spalte „Quelle“ nennt den Abschnitt in
`mechanik.md`.

### 4.1 Bewegung

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Laufen | Bewegung ab P+1 mit voller Geschwindigkeit | – | keiner: Bewegung endet einen Frame nach dem Loslassen | – | – | – | – | 1,75 px/Frame seitlich, 1,0 px/Frame in der Tiefe, diagonal 1,25 und 0,75 px/Frame; Umdrehen ohne Verzögerung | „Bewegung“ |
| Sprung | Aktion P+1, Absprung P+2 | 40 Frames in der Luft, Aufsetzen P+42 | 6 Frames Landung, nicht abbrechbar; handlungsfähig ab P+48 | 2,25 px/Frame vor- oder rückwärts, Weite 92,25 px; Richtung im Frame des Drucks, in der Luft nicht steuerbar | 0,5 px/Frame, solange hoch oder runter gehalten wird | – | – | Steighöhe 51,25 px, Scheitel P+21; Start 4,9375 px/Frame nach oben, Schwerkraft 0,25 px/Frame²; Tastendauer ohne Einfluss | „Sprung“ |

### 4.2 Schlagkette

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Kette Stufe 1 | Treffer in P+2 | P+2 bis P+5 | nach Treffer handlungsfähig ab h+13, Pose ohne Eingabe bis h+27; Leerschlag handlungsfähig ab P+8, Ruhe ab P+17 | ≤ 85 px, ab 86 px kein Treffer | ≤ 11 px, nie ab 13 px; 12 px Grenzfall (Vorschlag: trifft, wie Stufe 2 bis 4) | 3 | nein | Trefferreaktion des Gegners 23 Frames (h bis h+22), kein Rückstoß; ein Treffer darin startet sie neu; danach holt er frühestens in h+45 aus (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | „Angriff (Standardschlag, Kette)“ |
| Kette Stufe 2 | Druck D in h+12 bis h+27 nach Stufe 1; Treffer in D+3 | D+3 bis D+6 | offen (nicht beauftragt); Folgedruck ab h+11 | ≤ 87 px | ≤ 12 px | 4 | nein | jeweils 1 px weiter kein Treffer | wie oben |
| Kette Stufe 3 | Druck in h+11 bis h+26 nach Stufe 2; Treffer in D+4 | D+4 bis D+7 | offen (nicht beauftragt); Folgedruck ab h+11 | ≤ 91 px | ≤ 12 px | 5 | nein | – | wie oben |
| Kette Stufe 4 (Abschluss) | Druck in h+11 bis h+26 nach Stufe 3; Treffer in D+3 | D+3 bis D+6; trifft er nichts, erneut D+17 bis D+20 | offen (nicht beauftragt) | ≤ 100 px | ≤ 12 px | 10 | ja, immer, auch wenn der Gegner noch LP hat | Gegner fliegt nach 8 Frames Stillstand mit 2,875 px/Frame und liegt 55 Frames nach dem Treffer 135 px entfernt (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | wie oben |

### 4.3 Sprungangriff

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Neutral (Sprung ohne Richtung) | Angriff ab J+1 (in J selbst: Spezialangriff); Treffer ab A+5 | A+5 bis A+28, solange in der Luft; +7 je Treffer | Sprung einen Frame länger; Landung wie „Sprung“ | 27 px hinter bis 76 px vor der Figur | ≤ 12 px | 7 | ja, Gegner fliegt 135 px (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | trifft nur, solange die Figur höchstens 45 px hoch ist (am Scheitel nicht); mehrere Gegner je Sprung, jeder einmal; ab A = J+38 ohne Wirkung (Workflow) | „Sprungangriff“ |
| Richtung (Sprung mit links oder rechts) | wie neutral | wie neutral | wie neutral | 24 px hinter bis 99 px vor der Figur | ≤ 12 px | 7 | ja | Figur höchstens 41 px hoch | „Sprungangriff“ |
| Hoch (hoch im Frame des Sprungdrucks) | Treffer ab A+7 | ab A+7 | wie neutral | offen (nicht beauftragt) | offen (nicht beauftragt) | 12 | ja | – | „Sprungangriff“, „Nicht übernommen“ |
| Runter (runter mit dem Angriff) | offen (nicht beauftragt) | offen (nicht beauftragt) | wie neutral | offen (nicht beauftragt) | offen (nicht beauftragt) | 4 | nein | – | „Sprungangriff“, „Nicht übernommen“ |

### 4.4 Griff und Wurf

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Griff | beim Hineinlaufen mit gehaltener Richtung | Halten 60 Frames ab dem Griff, dann reißt sich der Gegner los | nach dem Losreißen 30 Frames kein neuer Griff (Workflow) | ≤ 39 px vor der Figur (Blick links 38 px); von hinten ≤ 24 px, nur wenn der Gegner die Figur anschaut (Workflow) | ≤ 10 px | – | – | kein Griff ohne Eingabe, im Sprung und in der eigenen Trefferreaktion; Angriff einen Frame vorher gibt einen Schlag, im Griff-Frame geht er verloren; Treffer anderer Gegner beenden den Griff (Workflow); Sprung lässt ohne Schaden los | „Griff und Wurf“ |
| Wurf (Angriff plus Richtung) | Schaden in E+1; frühestens im Frame nach dem Griff, spätestens im letzten Halteframe | geworfener Gegner trifft andere beim Tragen und im Flug bis zum ersten Bodenkontakt in E+59 | Figur gebunden E+1 bis E+37, handlungsfähig ab E+38 | Gegner liegt 184–185 px entfernt, vorwärts wie rückwärts (andere Gegnertypen 181–197 px) | andere Gegner bei ≤ 17 px | 14; jeder getroffene andere Gegner 3 | ja, auch die getroffenen | Richtung mit Blickrichtung (auch diagonal) wirft nach vorn, sonst rückwärts über die Figur; losgelassen in E+22 bei 59 px Höhe, still ab E+71; Bildrand begrenzt nicht (höchstens 96 px außerhalb), Wände stoppen | „Griff und Wurf“ |
| Kniestoß (Angriff ohne Richtung im Griff) | Treffer in K+5 | – | nächste Eingabe ab K+18, frühere verworfen | im Griff | im Griff | 4 | beim dritten Kniestoß, etwa 165 px | jeder Kniestoß startet die 60 Halteframes neu | „Griff und Wurf“ |

### 4.5 Spezialangriff und Sprint

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Spezialangriff (Angriff und Sprung im selben Frame) | Aktion ab P+1, Fläche aktiv ab P+8 | P+8 bis P+43 (36 Frames, ohne Trefferstopp); die Fläche wächst alle 6 Frames um 16 px | Aktion P+1 bis P+50, je Bild mit Treffer 7 Frames mehr; handlungsfähig ab P+51; geschützt bis P+70 (mit einem Treffer bis P+77) | vorn bis 43, 59, 75, 91, 107, 123 px, hinten bis 42, 58, 74, 90, 106, 122 px; volle Fläche | ≤ 28 px, nie ab 29 px | 6 je Gegner, jeder einmal, beliebig viele | ja, 135 px von der Figur weg | kostet 9 LP einmal, nur wenn er etwas trifft (auch Gegenstände), 8 Frames nach dem ersten Treffer; die LP fallen dabei höchstens auf 0, mit 0 LP gibt es keinen Spezialangriff; auslösbar aus Stand, Lauf, Sprint und Griff, in der eigenen Trefferreaktion ab 8 Frames nach dem Treffer, nicht in den 6 Landeframes (J+42 bis J+46 gibt es stattdessen einen neuen Sprung, J+47 nichts), erst ab J+48; Dauer und Form je Held in Abschnitt 5 | notes.md, „Nachtrag: Spezialangriff“ |
| Spezialangriff aus dem Griff (Sprung und Angriff) | Eingabe in E | offen, weil notes.md, „Nachtrag: Spezialangriff“ nur den freien Spezialangriff Frame für Frame vermisst | handlungsfähig ab E+58 | Gegner fliegt etwa 158 px | – | 6 | ja | kostet die Figur 9 LP | „Griff und Wurf“ |
| Sprint | Doppeltipp derselben Richtung (erster Druck und Pause je 1 bis 10 Frames), zweiten Druck halten; Sprint ab dem Frame nach dem zweiten Druck | – | endet im Frame nach dem Loslassen ohne Auslaufen, sonst nach 90 Frames: 1 Frame Stand, dann Gehen | 1 Frame 1,75, 5 Frames 3,875, dann alle 6 Frames 0,125 px/Frame weniger bis 2,125; 267,875 px in 90 Frames; diagonal das 0,75-fache | das 0,625-fache (1 Frame 1,0, dann 2,421875 px/Frame); am Rand der Tiefe stoppt nur die Bewegung | – | – | hoch oder runter dazu lenkt diagonal, Gegenrichtung beendet ihn; kein Griff im Sprint (die Figur läuft durch Gegner); Sprintsprung wie der normale Vorwärtssprung, das Sprinttempo geht verloren; neuer Sprint nur mit neuem Doppeltipp | notes.md, „Nachtrag: Sprint“ |
| Sprintangriff | A = Angriffsdruck im Sprint: Aktion ab A+1, Treffer ab A+5 | A+5 bis A+14 (10 Frames) | ohne Treffer Aktion bis A+35, Gehen ab A+37; mit Treffer 7 Frames später | 26 px hinter bis 105 px vor der Figur | ≤ 12 px, nie ab 13 px | 9 | ja, 135 px | rutscht ab A+2 mit dem letzten Sprinttempo, jeden Frame 0,15625 px/Frame langsamer (32,8125 bis 50 px je nach Sprinttempo), nur wenn die Richtung in A noch gedrückt ist; trifft alle Gegner auf dem Weg, jeden einmal | notes.md, „Nachtrag: Sprint“ |

### 4.6 Umgeworfen werden und Aufstehen

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Umgeworfen werden | 8 Frames Stillstand nach dem Treffer | Flug 37 Frames bis zum ersten Bodenkontakt bei 109 px | Liegen, siehe Aufstehen | liegt 135 px (selten 138 px) vom Ausgangspunkt entfernt | – | Schaden des auslösenden Treffers | – | 2,875 px/Frame vom Angreifer weg, 5,0 px/Frame nach oben, Schwerkraft 70/256 px/Frame² (Scheitel etwa 48 px); Auslöser: bestimmte Gegnerschläge; jeder Treffer in der Luft (Workflow) | „Umgeworfen werden“, „Schaden der Gegner“ |
| Aufstehen | 121 Frames nach dem Umwerfen (121–122); Angriff oder Sprung beim Liegen verkürzen, sechs Drücke beenden das Liegen, schnelles Drücken 88–93 Frames | – | 35 Frames Schutz ab dem Aufstehen | – | – | – | – | – | „Umgeworfen werden“, „Unverwundbarkeit“ |

### 4.7 Regeln

- **Kombofenster ohne Puffer**: Der nächste Kettenschlag wird nur in einem
  Fenster von 16 Frames nach dem Treffer der Vorstufe angenommen (Zeilen
  oben). Frühere Drücke werden verworfen, nicht gemerkt; spätere beginnen
  eine neue Kette mit Stufe 1. Beim Kniestoß gilt dasselbe ab K+18. Die
  Kette verlangt also einen Rhythmus, Dauerdrücken reicht nicht. Quelle:
  „Angriff (Standardschlag, Kette)“, „Griff und Wurf“.
- **Schutzfenster**: 27 Frames nach einem erlittenen Treffer, solange die
  Trefferreaktion läuft, unabhängig vom Schaden; 35 Frames nach dem
  Aufstehen. In beiden Fenstern verliert die Figur keine LP. Im Vorbild
  greifen die Gegner dort an, die Treffer bleiben
  wirkungslos (notes.md, „Nachtrag: Verhalten der Nahkämpfer“);
  Vorschlag: Treffer gehen ins Leere, die Gegner verhalten sich normal.
  Quelle: „Unverwundbarkeit“.
- **Gleichzeitiger Treffer**: Wird der Schlag der Figur im selben Frame
  aktiv wie der Treffer eines Gegners, gewinnt die Figur (Workflow).
  Quelle: „Schaden der Gegner“.
- **Tod erst unter 0 LP**: Mit genau 0 LP spielt die Figur weiter
  (Workflow). Quelle: „Schaden der Gegner“.
- **Zustand ändert den Schaden nicht**: Stehen, Laufen, Angreifen,
  Springen, Halten, LP, Blickrichtung und Tiefe ändern den erlittenen
  Schaden nicht; Treffer in der Luft werfen immer um (Workflow). Quelle:
  „Schaden der Gegner“.

## 5. Helden

Alle vier Helden bewegen sich gleich: Laufen, Sprung, Sprint, alle Zeiten
und Reichweiten aus Abschnitt 4. Sie unterscheiden sich nur im Schaden der
Kette, im Wurf und im Spezialangriff. Die Werte halten sich an die Spannen
der vier Helden des Vorbilds (erkenntnisse.md „Spielfiguren“): Kette je
Stufe 3–6 / 4–6 / 5–6 / 6–10 LP, Summe 20–24 LP; Wurf 12–14 LP, 181–208 px;
Sonderwürfe 14 oder 16 LP; Spezialangriff 41–60 Frames; Umriss 36–73 ×
71–83 px. Weil die Umrisse in dieser Spanne bleiben, passen die Reichweiten
aus Abschnitt 4 ohne Skalierung zum Bild.

- **Vela**, Lotsin des Hafens: ruhig und genau, kämpft mit
  Magnethandschuhen und ist die Allrounderin, deren Werte der gemessenen
  Referenzfigur entsprechen.
- **Kord**, Bergungstaucher aus den Eisstollen: wortkarg und massig,
  schwingt einen Anker an einer Kette und setzt auf Würfe.
- **Rin**, Frachtkurierin: schnell im Kopf und vorlaut, kämpft mit einem
  Teleskopstab und wirft mit Hebeltechnik.
- **Ollo**, ein lebender Brocken Kometeneis, den die Bohrungen des
  Syndikats geweckt haben: neugierig, stumm, mit gleichmäßig harten
  Schlägen.

| Held | Umriss im Stand (mit Schatten) | Kette (LP je Stufe) | Wurf | Sonderwurf | Spezialangriff |
|---|---|---|---|---|---|
| Vela | 57 × 76 px (wie die Referenzfigur) | 3 / 4 / 5 / 10 (22) | 14 LP, etwa 185 px | keiner | 50 Frames: kniet, schlägt die Handschuhe auf den Boden, eine Welle aus Eissplittern läuft nach beiden Seiten |
| Kord | 72 × 82 px | 4 / 4 / 5 / 8 (21) | 14 LP, etwa 192 px | Sprung im Griff: springt mit dem Gegner und rammt ihn in den Boden, 16 LP; ersetzt bei ihm das Loslassen per Sprung; Flugbahn offen (nicht beauftragt) | 58 Frames: dreht sich auf der Stelle, der Anker kreist an der Kette um ihn |
| Rin | 38 × 75 px | 3 / 4 / 6 / 8 (21) | 12 LP, etwa 182 px | runter + Angriff im Griff: Hebelwurf über sich hinweg, 14 LP, etwa 175 px; rückwärts wirft sie nur mit weg oder hoch | 43 Frames: Sprung auf normaler Bahn mit gestrecktem Stab, Funkenschauer nach beiden Seiten |
| Ollo | 63 × 72 px | 5 / 6 / 6 / 6 (23) | 12 LP, etwa 204 px | keiner | 47 Frames: bläst einen Kegel aus Kometengas nach vorn, Gegner im Strahl vereisen kurz |

Für alle gleich: Sprungangriffe 7 / 7 / 12 / 4 LP, Kniestoß 4 LP, der
Abschlusstritt wirft immer um, Spezialangriff aus dem Griff 6 LP am Gegner
und 9 LP Kosten. Der freie Spezialangriff macht bei allen Helden des
Vorbilds 6 LP je Gegner und kostet 9 LP nur bei einem Treffer (notes.md,
„Nachtrag: Spezialangriff“); Velas Werte stehen in Abschnitt 4.5.
Richtwerte für die anderen Formen: Drehung sofort im Umkreis von 94 px,
Explosionen von 74 px hinter bis 139 px vor der Figur ohne Trefferstopp
(Tiefe unsicher). Die Kettenreichweiten
von 85 bis 100 px müssen die Bilder tragen: Rin mit dem Stab, Kord mit dem
Anker, Ollo mit langen Eisarmen, Vela mit einem sichtbaren Magnetstoß.
Vela ist die Heldin der vertikalen Scheibe, weil für sie jeder Wert
gemessen ist.

## 6. Lebenspunkte, Schaden, Schwierigkeit

Die Figur hat 72 LP („Lebenspunkte“). Normale Gegner treffen mit 5 bis
13 LP, Raketen bis 15, der Boss mit 9 bis 22 LP je Angriff („Schaden der
Gegner“). Gegner, die zu Beginn einer Stage schon stehen (vorplatziert),
haben feste Werte; später erscheinende hängen vom Rang ab.

| Rang | Wert | Quelle |
|---|---|---|
| Spanne, Start | 7 bis 24, Start bei 9 | „Schaden der Gegner“ |
| Anstieg | +1 nach 409 Frames, danach alle 600 Frames (≈ 10 s); 24 nach 409 + 14 × 600 = 8809 Frames (≈ 2,5 min) | wie oben |
| Tod der Figur | −3 | wie oben |
| Wirkung | legt beim Beginn eines Angriffs dessen Schaden fest und beim Erscheinen die LP eines später erscheinenden Gegners | wie oben |
| Rang beim Stage-Wechsel | offen (nicht beauftragt); Vorschlag: läuft weiter | – |

| Rolle | Schaden vorplatziert | Schaden nach Rang | LP | Quelle |
|---|---|---|---|---|
| Nahkämpfer leicht | 5 | 7 / 8 / 9 / 10 bei Rang 7 / 8–14 / 15–21 / 22–24 | vorplatziert 16, später 22–34 | „Schaden der Gegner“, „Lebenspunkte“ (teils Workflow) |
| Nahkämpfer schwer | 6 | jeweils 1 mehr: 8 / 9 / 10 / 11 | vorplatziert 30, später 32–42 | wie oben |
| Schneller Messerkämpfer | – | Messer 7–10, Wurfmesser und Ausfallstich 10–13 | 34–46 | wie oben |
| Fernkämpfer | – | Pistole 5–7 je Schuss, Raketen 12–15 (Workflow) | Richtwert 16–28 (erkenntnisse.md) | „Schaden der Gegner“ |
| Boss | – | Schläge 9–12, Ansturm 12–17, Körperpresse 16–22, Griff und Wurf 16–22 (Workflow) | Richtwert 100 (erkenntnisse.md); im Vorbild 110 gemessen (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | „Schaden der Gegner“ |

Wie die LP innerhalb der Spanne vom Rang abhängen, steht nicht in
`mechanik.md`. Vorschlag: gleichmäßig von der Untergrenze bei Rang 7 bis
zur Obergrenze bei Rang 24. Flächenangreifer und schwerer Gegner bekommen
ihre Werte in `docs/design-gegner-stages.md`.

**Rechnung 1: Wie viele Treffer hält die Figur aus?** Weil sie erst unter
0 LP stirbt, übersteht sie bei Schaden d genau 72 geteilt durch d Treffer,
abgerundet. Für den Stage-Beginn gilt Rang 9; für das Stage-Ende Rang 24,
den der Spieler ohne Tod nach etwa 2,5 Minuten erreicht. Eine Stage mit
Kämpfen dauert länger als das reine Gehen von 17 bis 56 Sekunden
(erkenntnisse.md „Stages als Vorbild“), also liegt ihr Ende meist bei
Rang 24.

| Lage | Rang | Schaden je Treffer | Treffer ausgehalten | LP danach | tödlich ist der |
|---|---|---|---|---|---|
| Beginn, vorplatzierter Nahkämpfer leicht | fest | 5 | 14 | 2 | 15. Treffer |
| Beginn, vorplatzierter Nahkämpfer schwer | fest | 6 | 12 | 0 | 13. Treffer |
| Beginn, später erscheinender leichter | 9 | 8 | 9 | 0 | 10. Treffer |
| Beginn, später erscheinender schwerer | 9 | 9 | 8 | 0 | 9. Treffer |
| Ende, Nahkämpfer leicht | 24 | 10 | 7 | 2 | 8. Treffer |
| Ende, Nahkämpfer schwer | 24 | 11 | 6 | 6 | 7. Treffer |
| Ende, Ausfallstich (Höchstwert) | 24 | 13 | 5 | 7 | 6. Treffer |
| Boss, Körperpresse (Höchstwert) | 24 | 22 | 3 | 6 | 4. Treffer |

Zu Beginn hält die Figur also 8 bis 14 Treffer aus, am Ende 5 bis 7, gegen
die schwersten Bossangriffe 3. Die Regel „Tod erst unter 0 LP“ bringt bei
6, 8 und 9 LP Schaden genau einen Treffer mehr, weil die LP dort genau auf
0 fallen.

**Rechnung 2: Wie viele Ketten braucht ein Gegner?** Eine volle Kette von
Vela macht 22 LP und wirft immer um. Angefangene Ketten zählen mit.

| Rolle | LP | Ketten (22 LP) | Anmerkung |
|---|---|---|---|
| Nahkämpfer leicht, vorplatziert | 16 | 1 | fällt im Abschlusstritt |
| Nahkämpfer leicht, später | 22–34 | 1–2 | mit 22 LP steht er nach einer Kette auf genau 0; ob er fällt, ist offen, weil M1 den Tod nur bei LP unter 0 ausgelöst hat (notes.md, „Nachtrag: Trefferreaktion der Gegner“) |
| Nahkämpfer schwer, vorplatziert | 30 | 2 | nach der ersten Kette 8 LP Rest |
| Nahkämpfer schwer, später | 32–42 | 2 | – |
| Schneller Messerkämpfer | 34–46 | 2–3 | ab 45 LP reichen zwei Ketten (44 LP) nicht |
| Fernkämpfer | Richtwert 16–28 | 1–2 | – |
| Flächenangreifer | Richtwert 30–60 (grafik/README.md, Gegnertabelle) | 2–3 | – |
| Schwerer Gegner | Richtwert 85 | 4 | 88 LP |
| Boss | Richtwert 100 (Vorbild 110) | 5 | Super-Armor: nur Ketten mit Umwerfen zählen; 4 Ketten und ein Wurf ergeben 102 LP; mit 110 LP stehen nach 5 Ketten genau 0 LP |

Mit Kord und Rin (21 LP je Kette) braucht ein leichter Nahkämpfer mit
22 LP einen Schlag mehr, mit Ollo (23 LP) fällt er sicher in einer Kette.
Nach dem Abschlusstritt ist ein Gegner unverwundbar, bis er 105 Frames
später wieder frei ist (schwerer Nahkämpfer 89 bis 117 Frames); einen
Schutz danach hat er nicht (notes.md, „Nachtrag: Trefferreaktion der
Gegner“).

## 7. Rahmen

Alles in diesem Abschnitt ist Vorschlag; das Vorbild ist hier nicht
untersucht (erkenntnisse.md „Stand der Analyse“).

| Element | Vorschlag | Begründung |
|---|---|---|
| Titel | Logo vor dem Kometen, „Start drücken“; ohne Eingabe Wechsel zwischen Demo mit Spielszenen, Bestenliste und Steuerungstafel | Automatengefühl; die Demo zeigt Kette, Griff und Wurf, bevor jemand spielt |
| Figurenwahl | vier Helden nebeneinander mit Porträt, Name und drei Kurzangaben (Kette, Wurf, Spezialangriff); Wahl mit Richtung und Angriff; Countdown wie am Automaten; zwei Spieler dürfen denselben Helden in anderer Farbe nehmen | Die Helden unterscheiden sich nur in diesen drei Punkten, also zeigt die Wahl genau diese |
| Anzeigeleiste | oben je Spieler: Name, Punkte, Leben, LP-Balken mit 1 px je LP (72 px); daneben Name und Balken des Gegners, den die Figur zuletzt getroffen hat, bis sie einen anderen trifft; Boss-Balken in Lagen | Der Gegnerbalken zeigt, ob sich noch eine Kette lohnt; 1 px je LP macht Schaden ablesbar |
| Zeit | keine Zeitanzeige in normalen Stages, Zeitlimit nur in der Sonderstage | Der Rang steigt schon mit der Spielzeit (Abschnitt 6), ein Zeitlimit würde Zögern doppelt bestrafen |
| Leben | drei Leben je Spiel; Neueinstieg an derselben Stelle mit 72 LP, Rang −3; Schutzdauer nach dem Neueinstieg offen (nicht beauftragt) | Rang −3 aus „Schaden der Gegner“ fängt eine Pechsträhne ab |
| Continue | nach dem letzten Leben Countdown „Weiter?“; Punkte bleiben, ein Continue-Zähler ist sichtbar; Anzahl offen | ohne Münzen hält der Zähler den Reiz, ohne Continue durchzukommen |
| Punkte je Treffer | 10 Punkte je LP Schaden (volle Kette 220, Wurf 140) | Ketten, Würfe und Treffer mit geworfenen Gegnern zählen nach ihrer Wirkung; Richtwert Vorbild: Kette 10/20/30/40 je Stufe (notes.md, „Nachtrag: Gegenstände und Waffen“) |
| Punkte je Gegner | Bonus nach Rolle: leicht 100, schwer und Fernkämpfer 200, Messerkämpfer und Flächenangreifer 300, schwerer Gegner 1000, Boss 5000 | belohnt das Beenden und schwierige Ziele; Richtwert Vorbild: 80 bzw. 100 je Abschuss eines leichten bzw. schweren Nahkämpfers (ebenda) |
| Punkte je Gegenstand | Essen 100, Wertsachen aus Kisten 500 bis 5000, Waffe aufheben 0 | gibt Kisten einen Grund, auch bei vollen LP; Richtwert Vorbild: Essen bei vollen LP gibt 100 bis 1000 Punkte statt LP, Waffe aufheben 0 (ebenda) |

Zwei Spieler gleichzeitig:

| Regel | Vorschlag | Begründung |
|---|---|---|
| Beitritt | jederzeit mit Start | Automatengefühl, kein Neustart nötig |
| Freundbeschuss | aus: Schläge, Sprungangriffe, Spezialangriffe und geworfene Gegner treffen den Mitspieler nicht | In Gruppen träfen Ketten und Würfe sonst ständig den Partner; das Kampfgefühl soll wie allein bleiben |
| Griff auf Mitspieler | nicht möglich; Spielfiguren laufen durcheinander hindurch | Der Griff entsteht durch Hineinlaufen (Abschnitt 4.4), mit Mitspieler wäre er ständig ein Versehen |
| Gegriffener Gegner | der Mitspieler darf ihn schlagen, der Griff bleibt bestehen | Zusammenspiel lohnt sich; Treffer von Gegnern beenden den Griff weiterhin |
| Kamera | scrollt, wenn der vordere Spieler die Haltelinie überschreitet (`design-gegner-stages.md`, Abschnitt 5), aber nur, solange der hintere nicht am linken Rand steht; sonst ist der rechte Rand für den vorderen eine Wand; Sperren gelten für beide | Beide bleiben im Bild, keiner wird hinausgeschoben, der linke Rand bleibt Wand (erkenntnisse.md „Stages als Vorbild“) |
| Rang | ein gemeinsamer Rang, −3 bei jedem Tod | einfach; wer öfter stirbt, senkt den Druck für beide |
| Gegner | mehr Gegner je Welle statt mehr LP; im Vorbild greift meist einer an, zwei gleichzeitig in 0,6 bis 9 % der Gruppenframes, mehr als zwei in höchstens 3 % (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | Mehr LP würden die Rechnung aus Abschnitt 6 verschieben |

## 8. Vertikale Scheibe

Ziel des ersten spielbaren Stands: nachweisen, dass sich das Kampfgefühl
Frame für Frame wie gemessen anfühlt, bevor Inhalte in die Breite gehen.

| Teil | Umfang | Grundlage |
|---|---|---|
| Held | Vela, ein Spieler, Grundkit aus Abschnitt 4 einschließlich Sprint und Sprintangriff (Werte in Abschnitt 4.5) | Abschnitte 4 und 5 |
| Zwei Nahkämpfer | Nahkämpfer leicht und schwer: Gehen, Angriffsserie, Treffer, Umgeworfen, Liegen, Aufstehen, Gegriffen, Geworfen, Tod | `design-gegner-stages.md`, Abschnitte 1 und 9 |
| Ein Fernkämpfer | hält Abstand und schießt; seine Waffe bleibt liegen | wie oben |
| Stage-Abschnitt | Anfang der ersten Stage bis zu einer Kamerasperre mit einer Welle, danach die Bossarena; Tiefenstreifen, Hintergrund, eine Vordergrundebene | `design-gegner-stages.md`, Abschnitte 5 und 7 |
| Boss | ein Boss mit Super-Armor, Richtwert 100 LP, drei Angriffe | `design-gegner-stages.md`, Abschnitt 4 |
| Zwei Gegenstände | Essen (Heilwerte im Vorbild je Art: voll, +55, +40, +16 oder +12 LP; bei vollen LP Punkte statt LP; Essen läuft nicht ab) und die Waffe des Fernkämpfers (Richtwert Raketenwerfer: 3 Schuss, 8 LP, wirft um, nur die Explosion trifft); Waffen liegen 700 Frames ab der Landung L, blinken dann und verschwinden in L+792 (92 Frames ab Liegezeit 0; notes.md, „Nachtrag: Gegenstände und Waffen“) | `design-gegner-stages.md`, Abschnitt 8 |
| Rahmen | Anzeigeleiste mit LP-Balken von Figur und Gegner, Leben, Punkte; Rang intern; Tod und Neueinstieg | Abschnitt 7 |
| Prüfhilfe | Frame-Protokoll (x, Tiefe, Höhe, LP, Aktion, Rang je Frame) und abspielbare Eingabeaufzeichnung | Abnahme |
| Nicht enthalten | Titel, Figurenwahl, zweiter Spieler, weitere Helden, Sonderstage, Sound außer Platzhaltern | – |

Animationen der Heldin, Richtwert aus den Zeilen der Referenzfigur in
`research/captcomm/grafik/figuren/ablaeufe.csv`, aufgeteilt nach den
Animationstabellen in `research/captcomm/grafik/README.md`. Die Dauer „11“
in Schlagbildern ist 4 Frames Bild plus 7 Frames Trefferstopp; gezeichnet
wird ein Bild.

| Animation | Bilder | Dauer je Bild (Frames) | Summe | Hinweis |
|---|---|---|---|---|
| Stehen | 1 | statisch | – | – |
| Gehen (alle Richtungen) | 12 | je 4 | 48, Schleife | 84 px je Zyklus |
| Sprint | 6 | je 4 | 24, Schleife | Sprint höchstens 90 Frames (notes.md, „Nachtrag: Sprint“) |
| Sprung | 3 Bilder in 5 Stufen, 2 Landebilder | 6/6/6/6/17, Landung 5/1 | 47 | Fallbilder gleich den Steigbildern |
| Sprungangriff neutral | 5 | 2/2/24/2/1, dann Fallpose bis zur Landung | 31 | Rückzug mit Bild 2 und 1 |
| Sprungangriff Richtung | 6, eigene Bilder | 2/2/24/2/1/1, Landung 5/1 | 38 | nach grafik/README.md; die CSV-Zeile zeigt die Dauern des neutralen Sprungangriffs |
| Sprungangriff hoch | 11 | 3/3/4/3/3/3/3/3/3/3/1 | 32 | Grenze zum Sprungbeginn aus der Aufnahme geschätzt |
| Sprungangriff runter | 3 | 4/4/24, dann Halten bis zur Landung | 32 | kein Rückzug |
| Kette Stufe 1 | 6 | leer 1/4/1/1/1/8; bei Treffer hält das Schlagbild 11 | 16 | – |
| Kette Stufe 2 | 4 | 1/1/11/1 | 14 | – |
| Kette Stufe 3 | 5 | 1/1/1/11/2 | 16 | – |
| Kette Stufe 4 | 12 | 1/1/11/2/2/2/2/2/4/2/2/1 | 32 | Drehung und zweiter Tritt im Nachlauf |
| Griff | 3, dann Haltebild | 1/2/2 | 5 plus Halten | – |
| Kniestoß | 6 | 2/2/9/2/1/1 | 17 | – |
| Wurf | 6 | 9/7/5/10/5/1 | 37 | dieselben Bilder vorwärts und rückwärts |
| Spezialangriff | 14 Stufen | 2/2/2/1/6/6/6/6/6/6/2/2/2/1 | 50 | zweite Hälfte mit den Bildern der ersten rückwärts |
| Sprintangriff | 6 | 1/1/2/10/20/1 | 35 | passt zur Aktion A+1 bis A+35, aktiv A+5 bis A+14 (notes.md, „Nachtrag: Sprint“) |
| Getroffen (vorn und hinten) | je 5 | 1/13/6/6/1 | 27 | zwei Bildsätze |
| Umgeworfen | 5 | 1/8/6/31/9 | 55 | – |
| Liegen | 1 | 1 plus 40 | 41 | – |
| Aufstehen | 6 | 5/5/5/5/5/1 | 26 | – |

Gegner-, Boss- und Effektanimationen stehen in
`docs/design-gegner-stages.md`, Abschnitt 9.

Messwerte, die vor der Scheibe gesichert sein müssen:

1. Trefferreaktion der Gegner: gesichert (notes.md, „Nachtrag:
   Trefferreaktion der Gegner“): 23 Frames je Stufe ohne Rückstoß, Liegen
   32 Frames (leicht) bzw. 16 bis 44 Frames (schwer, Auswahl offen),
   Aufstehen 18 Frames ohne Schutz danach. Die Kette hält, weil der Gegner
   frühestens in h+45 ausholt. Offen bleibt der Tod bei genau 0 LP, weil
   M1 ihn nur unter 0 LP ausgelöst hat.
2. Gegnerverhalten: gesichert (notes.md, „Nachtrag: Verhalten der
   Nahkämpfer“): Anhalten 46 bis 48 px vor der Figur (nach schnellem Gehen
   55 bis 56 px), Pause vor jedem Angriff 29 − 4 · ⌊Rang/4⌋ Frames, selten
   mehr als zwei Angreifer gleichzeitig, Angriffe auch in den
   Schutzfenstern. Unsicher: Median der Pausen zwischen zwei Serien (149
   bis 404 Frames) und Angriffe je 1000 Frames (1,0 bis 9,7).
3. Gegnerangriffe: gesichert (notes.md, „Nachtrag: Reichweite der
   Gegnerangriffe“): Startup 4 bis 10 Frames (Messerkämpfer 13 bis 14);
   Abbruch, wenn die Figur mehr als 32 px links oder 31 px rechts vom
   Zielpunkt steht (Zielabstand höchstens 48 px) oder die Tiefe −10
   bis +11 px verlässt; Treffer bis 48 px Höhe. Offen bleiben Pistole,
   Rakete und Wurfmesser, weil sie in keinem Messlauf vorkamen.
4. Spezialangriff und Sprint: gesichert (notes.md, „Nachtrag:
   Spezialangriff“ und „Nachtrag: Sprint“), Werte in Abschnitt 4.5.
   Unsicher: Tiefengrenzen der Explosionsform und Reichweite des
   Sprint-Sprungangriffs nach dem 20. Frame (162 oder 172 px bzw. 162 oder
   140 px).
5. Gegenstände: gesichert (notes.md, „Nachtrag: Gegenstände und
   Waffen“), Werte in der Tabelle oben. Unsicher: größte Laserreichweite
   (310, 350 oder unter 275 px) und Aufnahmebereich rechts beim
   Raketenwerfer (35 oder 37 px).
6. Ohne Messauftrag, vor der Scheibe festzulegen oder nachzumessen:
   Nachlauf der Kettenstufen 2 bis 4, Reichweite der Sprungangriffe hoch
   und runter, Super-Armor des Bosses (nach wie vielen Treffern er
   abbricht, wie viele LP zurückkommen), Schutzdauer nach dem
   Neueinstieg, Rang beim Stage-Wechsel.

Abnahmekriterien, jeweils mit Frame-Protokoll und Eingabeaufzeichnung
prüfbar:

1. Die Figur bewegt sich ab P+1 mit 1,75 px/Frame seitlich, 1,0 px/Frame in
   der Tiefe und diagonal mit 1,25 und 0,75 px/Frame und steht einen Frame
   nach dem Loslassen ohne Bremsweg still.
2. Ein Sprung aus dem Stand erreicht in P+21 die Höhe 51,25 px, setzt in
   P+42 auf, die Figur ist ab P+48 handlungsfähig, und ein Sprung nach
   vorn ist 92,25 px weit.
3. Die volle Kette gegen einen vorplatzierten leichten Nahkämpfer trifft
   mit 3, 4, 5 und 10 LP in P+2, D+3, D+4 und D+3, hält die Animation der
   Figur bei jedem Treffer 7 Frames an und besiegt ihn mit dem
   Abschlusstritt.
4. Ein Druck in h+11 nach Stufe 1 wird verworfen, ein Druck in h+12 bis
   h+27 setzt die Kette fort, und ein Druck in h+28 beginnt eine neue Kette
   mit Stufe 1.
5. Stufe 1 trifft bei 85 px x-Abstand und 11 px Tiefenabstand und verfehlt
   bei 86 px oder 13 px, und der Abschlusstritt trifft bis 100 px.
6. Läuft die Figur in einen Gegner, greift sie ihn bei höchstens 39 px vorn
   und 10 px Tiefe, und ein Wurf macht in E+1 14 LP, legt ihn 184 bis
   185 px entfernt ab und wirft einen zweiten Gegner auf der Bahn mit 3 LP
   um.
7. Nach einem erlittenen Treffer verliert die Figur 27 Frames lang und nach
   dem Aufstehen 35 Frames lang keine LP, auch wenn ein Gegner in
   Schlagdistanz bleibt, und umgeworfen liegt sie ohne Eingabe 121 Frames.
8. Mit genau 0 LP spielt die Figur weiter, und treffen Figur und Gegner im
   selben Frame, verliert nur der Gegner LP.
9. Der Rang startet bei 9, steigt nach 409 Frames und danach alle 600 Frames
   um 1 bis 24, sinkt bei jedem Tod um 3, und ein später erscheinender
   leichter Nahkämpfer trifft bei Rang 9 mit genau 8 LP.
10. Die Kamera hält an der Sperre, bis die Welle besiegt ist, der Boss
    bricht eine Kette ohne Umwerfen mit einem Stoß ab und erhält die LP
    zurück, und sein Fall besiegt alle übrigen Gegner.

## 9. Offene Entscheidungen des Nutzers

1. Welt: Kometenhafen (Arbeitsannahme), Küstenstadt oder Zirkusschiff.
2. Helden: Namen, Konzepte und Werte von Vela, Kord, Rin und Ollo
   bestätigen oder ändern.
3. Spielschritt 60 Hz statt 59,64 Hz annehmen (alle Zeiten 0,6 % kürzer).
4. Grenzfälle: Griff mit Blick nach links 38 px wie im Vorbild oder
   symmetrisch 39 px; Kettenstufe 1 bei 12 px Tiefe treffen lassen.
5. Schutzfenster: Gegner greifen an, Treffer werden ignoriert (Vorschlag,
   so im Vorbild laut M2), oder sie warten (Vorschlag in
   `design-gegner-stages.md`, Abschnitt 10, Punkt 6).
6. Freier Spezialangriff: 9 LP Kosten nur bei Treffer (Richtwert) oder
   immer.
7. Zeitlimit in normalen Stages: keines (Vorschlag) oder eines.
8. Leben je Spiel, Zahl der Continues, Punkte beim Continue behalten.
9. Punkteschema und Extraleben.
10. Zwei Spieler: Freundbeschuss aus und kein Griff auf den Mitspieler
    (Vorschlag); mehr Gegner je Welle statt mehr LP.
11. Rang: läuft über den Stage-Wechsel weiter (Vorschlag); LP der Gegner
    gleichmäßig über den Rang verteilt (Vorschlag).
12. Grafikstil und Sound: Palette, Pixelstil, Musikrichtung.

## 10. Quellen

| Datei | verwendete Abschnitte |
|---|---|
| `docs/mechanik.md` | Konventionen; Bewegung; Angriff (Standardschlag, Kette); Sprung; Sprungangriff; Griff und Wurf; Spezialangriff; Sprint; Trefferreaktion der Gegner; Umgeworfen werden; Schaden der Gegner; Reichweite der Gegnerangriffe; Unverwundbarkeit; Lebenspunkte; Gegenstände und Waffen; Nicht übernommen |
| `research/captcomm/notes.md` | Nachtrag: Trefferreaktion der Gegner; Nachtrag: Verhalten der Nahkämpfer; Nachtrag: Reichweite der Gegnerangriffe; Nachtrag: Spezialangriff; Nachtrag: Sprint; Nachtrag: Gegenstände und Waffen |
| `docs/erkenntnisse.md` | Haltung: inspiriert, kein Nachbau; Stand der Analyse; Was das Kampfgefühl ausmacht; Spielfiguren; Gegner als Vorbild; Stages als Vorbild; Hinweise für die eigene Grafik; Übernehmen, Richtwert, selbst gestalten |
| `research/captcomm/grafik/README.md` | Spielfiguren mit „Animationen im Einzelnen“ (Captain Commando, Mack the Knife, Ginzu the Ninja, Baby Head); Gemeinsame Bewegungen; Gegner (Gegnertabelle, nur Max-LP von CAROL / BRENDA und MARBIN) |
| `research/captcomm/grafik/figuren/ablaeufe.csv` | Zeilen `captain_*` für die Animationsliste in Abschnitt 8 |
| `docs/auftraege/2026-10-02-opus-messungen-und-design.md` | Auftrag D1, Bedeutung von M1 bis M5 |

Zuordnung zum Vorbild Captain Commando (nur hier genannt):

| Begriff in diesem Dokument | Vorbild |
|---|---|
| Referenzfigur, Vela | Captain Commando (alle Werte in `mechanik.md`) |
| Kord | Mack the Knife (Drehung als Spezialangriff), Baby Head (Sprung mit dem Gegner als Sonderwurf) |
| Rin | Ginzu the Ninja (Opferwurf mit runter + Angriff, Sprung als Spezialangriff) |
| Ollo | Baby Head (gleichmäßige Kette, weitester Wurf, Spezialangriff nach vorn) |
| Nahkämpfer leicht, Nahkämpfer schwer | WOOKY, EDDY |
| Schneller Messerkämpfer | SKIP |
| Fernkämpfer | DICK |
| Flächenangreifer, schwerer Gegner | CAROL und MARBIN; MARDIA und Mech mit Fahrer |
| Boss mit Super-Armor | DOLG |
