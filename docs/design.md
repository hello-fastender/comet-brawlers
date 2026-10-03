# Comet Brawlers: Designdokument (Kern)

Stand 2026-10-03, Entwurf mit den Entscheidungen des Nutzers vom
2026-10-02 und 2026-10-03 (Abschnitt 9). Dieses Dokument beschreibt
Spielidee, Welt, technische Grundlage, Spielfigur, Helden, Schwierigkeit,
Rahmen und den ersten spielbaren Stand. Gegner, Bosse, Stages und Gegenstände stehen in
`docs/design-gegner-stages.md`. Verbindliche Zahlen stehen in
`docs/mechanik.md`; dieses Dokument zitiert sie mit dem Abschnittsnamen
(etwa „Sprung“) und erfindet keine neuen.

| Kennzeichnung | Bedeutung |
|---|---|
| „Abschnitt“ ohne Dateiname | Abschnitt in `docs/mechanik.md` |
| (Workflow) | in `mechanik.md` so markiert: von mehreren Agenten gemessen, aber ohne Skript im Repo |
| Richtwert | Wert aus `docs/erkenntnisse.md` oder `research/captcomm/grafik/README.md`, nicht in `mechanik.md`; zur Orientierung, nicht verbindlich |
| notes.md, „Nachtrag: …“ | Wert aus den Messungen M1 bis M5 vom 2026-10-02 (Trefferreaktion der Gegner, Verhalten der Nahkämpfer, Reichweite der Gegnerangriffe, Spezialangriff, Sprint, Gegenstände und Waffen), Abschnitt in `research/captcomm/notes.md`; „unsicher“ steht mit den abweichenden Werten |
| offen (M6, On) bis offen (M8, On) | Wert fehlt, Messpaket 2 misst ihn: M6 Boss, M7 Fernkampf und Messerwurf, M8 Rest der Spielfigur; On ist die Nummer in der Liste „Offen bis Messpaket 2“ am Ende von Abschnitt 8 |
| offen | Wert fehlt, auch Messpaket 2 misst ihn nicht (ohne Messauftrag, ohne Nummer); der Grund steht dabei. Gleiche Bedeutung wie in `docs/design-gegner-stages.md` |
| beschlossen (E1) bis (E22) | Entscheidung des Nutzers vom 2026-10-02 (E1 bis E9) bzw. 2026-10-03 (E10 bis E22), Tabellen in Abschnitt 9; E9 umfasst alle eigenen Werte ohne Messgrundlage, die bisher „Vorschlag“ hießen; beim Testen anpassbar |
| beschlossen (E10) | eigene Festlegung für eine Lücke, die E1 bis E9 nicht deckten (bis 2026-10-02 „Arbeitsregel“ mit offener Bestätigung); mit E10 vom Nutzer bestätigt, soweit E11 bis E21 nichts anderes sagen |

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
Frame; bewusste Abweichungen (60 Hz nach E6, der 12-px-Grenzfall der
Kettenstufe 1 nach E9, gleiche Werte für beide Blickrichtungen nach E14,
ein einheitlicher Neueinstieg nach E16) stehen in Abschnitt 9 und werden
später in `mechanik.md` nachgetragen. Eigen sind die
vier Helden, die sich alle gleich bewegen und nur in Kette, Wurf und
Spezialangriff unterscheiden. Eigen sind auch Welt und Geschichte: der
Frachthafen Perihel im Eis des Kometen Orrin. Gegner, Bosse und
Stages entwerfen wir selbst; das Vorbild liefert dafür nur Rollen und
Richtwerte für Lebenspunkte, Schaden und Stage-Längen. Grafik und Sound
entstehen neu, mit Figuren in der Größe des Vorbilds und Musik ohne
Anleihen. Ziel ist ein Spiel, das sich in der Hand wie ein Automat von
1991 anfühlt und auf den ersten Blick als eigenes Werk erkennbar ist.

## 2. Welt und Ton

### Kometenhafen „Perihel“, beschlossen (E1)

Im Eiskern des Kometen Orrin liegt der Frachthafen Perihel, der bei jedem
Vorbeiflug am inneren System Waren umschlägt. Das Schweif-Syndikat hat
Docks, Lager und Kontrollturm besetzt und will den Kometen mit seinen
Bahntriebwerken auf Kollisionskurs mit der Hauptstadt des Systems bringen.
Die Helden, drei Hafenleute und ein lebender Eisbrocken, arbeiten sich mit
Werkzeug und Fäusten vom Landedeck bis zum Flaggschiff des Syndikats
durch. Der Ton ist kernig und comichaft: Neonlicht auf blauem Eis,
dampfende Maschinen, Gegner in Overalls mit Atemmasken. Die acht Stages
führen über Frachtkai, Eisbergwerk, Kuppelgärten und Klonlabor zur Fahrt
durch den Kometenschweif als Sonderstage an Position 5 und weiter über
Schmelzwerk und Antriebsschacht bis zum Flaggschiff des Syndikats.

### Begründung

Der Spielname trägt den Kometen schon, der Hafen bietet Schauplätze von
Eis bis Schwerindustrie, und der Kometenschweif ergibt eine natürliche
Sonderstage mit automatischem Scrollen. Die Helden in Abschnitt 5 sind für
diese Welt entworfen. Acht Stages und die Sonderstage an Position 5 sind
beschlossen (E8); Einzelheiten in `docs/design-gegner-stages.md`,
Abschnitt 6. Verworfen sind die beiden
anderen Vorschläge, eine Küstenstadt nach dem Einschlag eines
Kometenbruchstücks und ein Zirkusschiff zwischen den Planeten.

## 3. Technische Grundlage

| Festlegung | Wert | Quelle |
|---|---|---|
| Logische Auflösung | 384 × 224 Pixel; Spiellogik, Kollision und Kamera rechnen in diesem Raster | „Konventionen“; erkenntnisse.md „Hinweise für die eigene Grafik“ |
| Spielschritt | fest 60 Hz, beschlossen (E6): ein Logikschritt je Frame, alle Dauern in Frames; die Frame-Zahlen aus `mechanik.md` gelten unverändert. Das Original läuft mit 59,637405 Hz; dieselben Frame-Zahlen ergeben bei 60 Hz 0,6 % kürzere Zeiten. Sekundenangaben in beiden Designdokumenten sind Frames ÷ 60 | „Konventionen“; Abschnitt 9 |
| Zu langsame Darstellung | beschlossen (E13): Die Logik läuft in Echtzeit mit 60 Schritten je Sekunde weiter und lässt Bilder aus, statt langsamer zu werden; höchstens 4 Logikschritte je dargestelltem Bild, darüber bleibt die Zeit stehen (kein Aufholen über mehr als 4 Schritte) | Abschnitt 9; `docs/spezifikation-kampf.md`, 2.1 |
| Einheiten | 1 Positionseinheit = 1 Pixel, horizontal wie in der Tiefe. Drei Achsen: x (Welt), Tiefe, Höhe. Positionen und Geschwindigkeiten mit Nachkommastellen, fein genug für Werte wie 70/256 px/Frame² (Zeile „Zahlendarstellung“) | „Konventionen“, „Umgeworfen werden“ |
| Zahlendarstellung | beschlossen (E12): Festkomma 16.16 für Positionen, Geschwindigkeiten und Beschleunigungen, also eine vorzeichenbehaftete 32-Bit-Ganzzahl, deren untere 16 Bit den Nachkommaanteil tragen; die Grundwerte aus `mechanik.md` sind darin exakt | `docs/spezifikation-kampf.md`, 2.4; Abschnitt 9 |
| Tiefe | eigene Achse: Sie bestimmt Bildzeile und Zeichenreihenfolge, die Höhe hebt die Figur über ihren Schatten | „Konventionen“, „Sprung“ |
| Trefferprüfung | über Abstände der Positionen von Angreifer und Ziel in x, Tiefe und Höhe, nicht über Bildüberlappung | „Angriff (Standardschlag, Kette)“, „Sprungangriff“; erkenntnisse.md „Hinweise für die eigene Grafik“ |
| Eingabelatenz | Reaktion einen Frame nach der Eingabe (P+1), bei Laufen, Schlag und Sprung gleich. Die Werte in `mechanik.md` schließen diese Latenz ein; die Spiellogik darf keine weitere hinzufügen | „Konventionen“ |
| Trefferstopp | 7 Frames je Treffer: Die Animation des Angreifers steht still. Beim Sprungangriff verlängert jeder Treffer die aktiven Frames um 7 | „Angriff (Standardschlag, Kette)“, „Sprungangriff“ |
| Trefferstopp des Getroffenen | Beschlossen (E3): Der getroffene Gegner steht von h+1 bis h+8 in der Trefferpose still, zittert in h+9 bis h+14 um ±3, ±2, ±1 px und ist ab h+23 frei. Der Stillstand liegt innerhalb der 23 Frames, die Reaktion wird dadurch nicht länger. Das Zittern ist nur Animation: Die Position für Trefferprüfung und Reichweite bleibt, kein Rückstoß. Ob das Vorbild intern einen eigenen Stillstand hat, ist offen, weil die Messung Pose und Position ausgewertet hat, keinen getrennten Trefferstopp | notes.md, „Nachtrag: Trefferreaktion der Gegner“; Abschnitt 9 |
| Rendering | skaliert nur die Ausgabe, bevorzugt ganzzahlig mit Rand; Logik und Kollision bleiben im Raster von 384 × 224 | beschlossen (E9) |

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
| Kette Stufe 1 | Treffer in P+2 | P+2 bis P+5 | nach Treffer handlungsfähig ab h+13, Pose ohne Eingabe bis h+27; Leerschlag handlungsfähig ab P+8, Ruhe ab P+17 | ≤ 85 px, ab 86 px kein Treffer | ≤ 11 px, nie ab 13 px; 12 px Grenzfall: trifft wie Stufe 2 bis 4, beschlossen (E9) | 3 | nein | Trefferreaktion des Gegners 23 Frames (h bis h+22), kein Rückstoß; ein Treffer darin startet sie neu; danach holt er frühestens in h+45 aus (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | „Angriff (Standardschlag, Kette)“ |
| Kette Stufe 2 | Druck D in h+12 bis h+27 nach Stufe 1; Treffer in D+3 | D+3 bis D+6 | nach Treffer handlungsfähig ab h+12 (Druck ab h+11: Folgestufe oder Sprung), seitliches Gehen ab h+13, Gehen in die Tiefe erst ab h+28, Pose ohne Eingabe bis h+26; Leerschlag handlungsfähig ab D+8, Gehen ab D+9, Ruhe ab D+17 (notes.md, „Nachtrag: Rest der Spielfigur“) | ≤ 87 px | ≤ 12 px | 4 | nein | jeweils 1 px weiter kein Treffer | wie oben |
| Kette Stufe 3 | Druck in h+11 bis h+26 nach Stufe 2; Treffer in D+4 | D+4 bis D+7 | nach Treffer wie Stufe 2 (handlungsfähig ab h+12, Druck ab h+11; seitliches Gehen ab h+13, Tiefe ab h+28; Pose bis h+26); Leerschlag handlungsfähig ab D+9, Gehen ab D+10, Ruhe ab D+18 (notes.md, „Nachtrag: Rest der Spielfigur“) | ≤ 91 px | ≤ 12 px | 5 | nein | – | wie oben |
| Kette Stufe 4 (Abschluss) | Druck in h+11 bis h+26 nach Stufe 3; Treffer in D+3 | D+3 bis D+6; trifft er nichts, erneut D+17 bis D+20 | nicht abbrechbar: Aktion 25 Frames (D+1 bis D+25), je Treffer 7 mehr (mit einem Treffer bis D+32, auch im zweiten Fenster), danach handlungsfähig ab D+34 (Druck ab D+33), Gehen ab D+34; Leerschlag handlungsfähig ab D+27 (notes.md, „Nachtrag: Rest der Spielfigur“) | ≤ 100 px | ≤ 12 px | 10 | ja, immer, auch wenn der Gegner noch LP hat | Gegner fliegt nach 8 Frames Stillstand mit 2,875 px/Frame und liegt 55 Frames nach dem Treffer 135 px entfernt (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | wie oben |

### 4.3 Sprungangriff

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Neutral (Sprung ohne Richtung) | Angriff ab J+1 (in J selbst: Spezialangriff); Treffer ab A+5 | A+5 bis A+28, solange in der Luft; +7 je Treffer | Sprung einen Frame länger; Landung wie „Sprung“ | 27 px hinter bis 76 px vor der Figur | ≤ 12 px | 7 | ja, Gegner fliegt 135 px (notes.md, „Nachtrag: Trefferreaktion der Gegner“) | trifft nur, solange die Figur höchstens 45 px hoch ist (am Scheitel nicht); mehrere Gegner je Sprung, jeder einmal; ab A = J+38 ohne Wirkung (Workflow) | „Sprungangriff“ |
| Richtung (Sprung mit links oder rechts) | wie neutral | wie neutral | wie neutral | 24 px hinter bis 99 px vor der Figur | ≤ 12 px | 7 | ja | Figur höchstens 41 px hoch | „Sprungangriff“ |
| Hoch (hoch im Frame des Sprungdrucks) | Treffer ab A+7 | A+7 bis A+10 (4 Frames), solange die Figur höchstens 48 px hoch ist (notes.md, „Nachtrag: Rest der Spielfigur“) | wie neutral | 32 px hinter bis 85 px vor der Figur, nur bis 48 px Höhe der Figur (notes.md, „Nachtrag: Rest der Spielfigur“) | ≤ 12 px, nie ab 13 px | 12 | ja | – | „Sprungangriff“, „Nicht übernommen“ |
| Runter (runter mit dem Angriff) | Treffer ab A+9 | A+9 bis A+32, solange die Figur höchstens 41 px hoch ist (steigend wie fallend) | wie neutral | 41 px hinter bis 42 px vor der Figur (notes.md, „Nachtrag: Rest der Spielfigur“) | ≤ 12 px, nie ab 13 px | 4 | nein | – | „Sprungangriff“, „Nicht übernommen“ |

### 4.4 Griff und Wurf

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Griff | beim Hineinlaufen mit gehaltener Richtung | Halten 60 Frames ab dem Griff, dann reißt sich der Gegner los | nach dem Losreißen 30 Frames kein neuer Griff (Workflow) | ≤ 39 px vor der Figur, bei Blick links ebenso, beschlossen (E14; im Vorbild bei Blick links 38 px); von hinten ≤ 24 px in beide Richtungen (E14), nur wenn der Gegner die Figur anschaut (Workflow) | ≤ 10 px | – | – | kein Griff ohne Eingabe, im Sprung und in der eigenen Trefferreaktion; Angriff einen Frame vorher gibt einen Schlag, im Griff-Frame geht er verloren; wirksame Treffer anderer Gegner beenden den Griff (Workflow), wirkungslose im Schutz der Figur nicht (E2); Sprung lässt ohne Schaden los | „Griff und Wurf“ |
| Wurf (Angriff plus Richtung) | Schaden in E+1; frühestens im Frame nach dem Griff, spätestens im letzten Halteframe | geworfener Gegner trifft andere beim Tragen und im Flug bis zum ersten Bodenkontakt in E+59 | Figur gebunden E+1 bis E+37, handlungsfähig ab E+38 | Gegner liegt 184–185 px entfernt, vorwärts wie rückwärts (andere Gegnertypen 181–197 px) | andere Gegner bei ≤ 17 px | 14; jeder getroffene andere Gegner 3 | ja, auch die getroffenen | Richtung mit Blickrichtung (auch diagonal) wirft nach vorn, sonst rückwärts über die Figur; losgelassen in E+22 bei 59 px Höhe, still ab E+71; Bildrand begrenzt nicht (höchstens 96 px außerhalb), Wände stoppen | „Griff und Wurf“ |
| Kniestoß (Angriff ohne Richtung im Griff) | Treffer in K+5 | – | nächste Eingabe ab K+18, frühere verworfen | im Griff | im Griff | 4 | beim dritten Kniestoß, etwa 165 px | jeder Kniestoß startet die 60 Halteframes neu | „Griff und Wurf“ |

### 4.5 Spezialangriff und Sprint

| Aktion | Startup | Aktive Frames | Nachlauf | Reichweite x | Tiefe | Schaden | Umwerfen | Besonderheit | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| Spezialangriff (Angriff und Sprung im selben Frame) | Aktion ab P+1, Fläche aktiv ab P+8 | P+8 bis P+43 (36 Frames, ohne Trefferstopp); die Fläche wächst alle 6 Frames um 16 px | Aktion P+1 bis P+50, je Bild mit Treffer 7 Frames mehr; handlungsfähig ab P+51; geschützt bis P+70 (mit einem Treffer bis P+77) | vorn bis 43, 59, 75, 91, 107, 123 px, hinten bis 42, 58, 74, 90, 106, 122 px; volle Fläche | ≤ 28 px, nie ab 29 px | 6 je Gegner, jeder einmal, beliebig viele | ja, 135 px von der Figur weg | kostet 9 LP einmal, nur wenn er etwas trifft (auch Gegenstände), 8 Frames nach dem ersten Treffer; die LP fallen dabei höchstens auf 0, mit 0 LP gibt es keinen Spezialangriff; auslösbar aus Stand, Lauf, Sprint und Griff, in der eigenen Trefferreaktion ab 8 Frames nach dem Treffer, nicht in den 6 Landeframes (J+42 bis J+46 gibt es stattdessen einen neuen Sprung, J+47 nichts), erst ab J+48; Dauer und Form je Held in Abschnitt 5 | notes.md, „Nachtrag: Spezialangriff“ |
| Spezialangriff aus dem Griff (Sprung und Angriff) | Eingabe in E | beschlossen (E10): wie beim freien Spezialangriff (Zeile oben), ab E gezählt. Im Vorbild offen, weil notes.md, „Nachtrag: Spezialangriff“ nur den freien Spezialangriff Frame für Frame vermisst | handlungsfähig ab E+58 | Gegner fliegt etwa 158 px | – | 6 | ja | kostet die Figur 9 LP | „Griff und Wurf“ |
| Sprint | Doppeltipp derselben Richtung (erster Druck und Pause je 1 bis 10 Frames), zweiten Druck halten; Sprint ab dem Frame nach dem zweiten Druck | – | endet im Frame nach dem Loslassen ohne Auslaufen, sonst nach 90 Frames: 1 Frame Stand, dann Gehen | 1 Frame 1,75, 5 Frames 3,875, dann alle 6 Frames 0,125 px/Frame weniger bis 2,125; 267,875 px in 90 Frames; diagonal das 0,75-fache | das 0,625-fache (1 Frame 1,0, dann 2,421875 px/Frame); am Rand der Tiefe stoppt nur die Bewegung | – | – | hoch oder runter dazu lenkt diagonal, Gegenrichtung beendet ihn; kein Griff im Sprint (die Figur läuft durch Gegner); Sprintsprung wie der normale Vorwärtssprung, das Sprinttempo geht verloren; neuer Sprint nur mit neuem Doppeltipp | notes.md, „Nachtrag: Sprint“ |
| Sprintangriff | A = Angriffsdruck im Sprint: Aktion ab A+1, Treffer ab A+5 | A+5 bis A+14 (10 Frames) | ohne Treffer Aktion bis A+35, Gehen ab A+37; mit Treffer 7 Frames später | 26 px hinter bis 105 px vor der Figur | ≤ 12 px, nie ab 13 px | 9 | ja, 135 px | rutscht ab A+2 mit dem letzten Sprinttempo, jeden Frame 0,15625 px/Frame langsamer (32,8125 bis 50 px je nach Sprinttempo), nur wenn die Richtung in A noch gedrückt ist; trifft alle Gegner auf dem Weg, jeden einmal | notes.md, „Nachtrag: Sprint“ |
| Sprint-Sprungangriff | A = Angriffsdruck im Sprintsprung; Treffer ab A+13 | A+13 (nur bis 16 px Höhe der Figur) und A+20 bis A+39 (bis 20 px Höhe), auch nach der Landung | Sprung und Landung wie beim Sprintsprung (handlungsfähig ab J+48); ein Treffer in A+13 hält Figur und Angriff 7 Frames an und verschiebt alle späteren Frames um 7, auch Landung, Handlungsfähigkeit und A+20 bis A+39; Treffer ab A+20 halten nichts an (`docs/spezifikation-kampf.md`, 9.3); die Angriffsfläche läuft bis A+39 mit der Figur weiter, auch wenn sie schon wieder geht | 38 bis 147 px vor der Figur, nicht hinter ihr; gemessen in A+20, beschlossen (E15) für alle aktiven Frames | ≤ 12 px | 13 | ja | gehört zur Scheibe, beschlossen (E15); im Vorbild ändert sich die Reichweite nach A+20 (unsicher, Abschnitt 8, Messwerte Punkt 4) | „Sprint“; `docs/spezifikation-kampf.md`, 9.3 (P7) |

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
  Trefferreaktion läuft, unabhängig vom Schaden; vom Umwerfen über Flug,
  Liegen und Aufstehen bis zum Stand; 35 Frames nach dem Aufstehen;
  während des Spezialangriffs und 20 Frames danach (bei Vela ohne Treffer
  bis P+70, mit einem Bild mit Treffer bis P+77, je weiteres Bild mit
  Treffer 7 Frames später, Abschnitt 4.5); nach dem Neueinstieg vom
  Erscheinen bis 199 Frames nach der Landung (252 Frames bei Landung auf
  dem Boden, Abschnitt 7, Leben). In diesen Fenstern verliert die Figur
  keine LP, auch nicht durch Geschosse, beschlossen (E10; im Vorbild treffen
  Geschosse im Schutz nach einem Treffer; notes.md, „Nachtrag: Fernangriffe
  der Gegner“). Beschlossen (E2): Die Gegner greifen
  dort wie im Vorbild an, auch eine liegende Figur, und ihre Treffer
  bleiben wirkungslos; die Angriffserlaubnis nimmt auf Schutzfenster keine
  Rücksicht
  (`docs/design-gegner-stages.md`, Abschnitt 2). So ist es gemessen, so ist
  es einfacher, und die Gegner wirken nicht passiv. Quelle:
  „Unverwundbarkeit“; notes.md, „Nachtrag: Verhalten der Nahkämpfer“.
- **Gleichzeitiger Treffer**: Wird der Schlag der Figur im selben Frame
  aktiv wie der Treffer eines Gegners, gewinnt die Figur (Workflow).
  Quelle: „Schaden der Gegner“.
- **Tod erst unter 0 LP**: Mit genau 0 LP spielt die Figur weiter
  (Workflow). Quelle: „Schaden der Gegner“.
- **Zustand ändert den Schaden nicht**: Stehen, Laufen, Angreifen,
  Springen, Halten, LP, Blickrichtung und Tiefe ändern den erlittenen
  Schaden nicht; Treffer in der Luft werfen immer um (Workflow). Quelle:
  „Schaden der Gegner“.
- **Beide Blickrichtungen gleich**, beschlossen (E14): Für Blick links
  gelten dieselben Reichweiten, Griffweiten, Aufnahmebereiche und
  Explosionsgrenzen wie für Blick rechts; alle Werte in diesem Dokument
  sind die für Blick rechts aus `mechanik.md`. Im Vorbild sind einige bei
  Blick links 1 px kürzer oder länger (Kette, Sprungangriff, Griff,
  Raketenexplosion, Aufnahmebereiche). Quelle: „Griff und Wurf“,
  „Gegenstände und Waffen“; notes.md, „Nachtrag: Rest der Spielfigur“
  (Kette, Sprungangriff).

## 5. Helden

Alle vier Helden bewegen sich gleich: Laufen, Sprung, Sprint, alle Zeiten
und Reichweiten aus Abschnitt 4. Sie unterscheiden sich nur im Schaden der
Kette, im Wurf und im Spezialangriff. Die Werte halten sich an die Spannen
der vier Helden des Vorbilds (erkenntnisse.md „Spielfiguren“): Kette je
Stufe 3–6 / 4–6 / 5–6 / 6–10 LP, Summe 20–24 LP; Wurf 12–14 LP, 181–208 px;
Sonderwürfe 14 oder 16 LP; Spezialangriff 41–60 Frames; Umriss 36–73 ×
71–83 px. Weil die Umrisse in dieser Spanne bleiben, passen die Reichweiten
aus Abschnitt 4 ohne Skalierung zum Bild. Beschlossen (E7): Vela, Kord,
Rin und Ollo mit den Werten dieses Abschnitts als Arbeitsstand; die Namen
können später wechseln.

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
| Kord | 72 × 82 px | 4 / 4 / 5 / 8 (21) | 14 LP, etwa 192 px | Sprung im Griff: springt mit dem Gegner und rammt ihn in den Boden, 16 LP; ersetzt bei ihm das Loslassen per Sprung; Flugbahn offen: ohne Messauftrag, festlegen, wenn Kord gebaut wird | 58 Frames: dreht sich auf der Stelle, der Anker kreist an der Kette um ihn |
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
Gegner“). Genannte Ausnahmen, beschlossen (E10): der Griff des
Fahrzeuggegners mit 15 LP und rollende Fässer mit
16 LP bei Kontakt (`docs/design-gegner-stages.md`, Abschnitte 6 bis 8).
Gegner, die zu Beginn einer Stage schon stehen (vorplatziert, in
`docs/design-gegner-stages.md` „Startgegner“), haben feste Werte; später
erscheinende hängen vom Rang ab.

| Rang | Wert | Quelle |
|---|---|---|
| Spanne, Start | 7 bis 24, Start bei 9 | „Schaden der Gegner“ |
| Anstieg | +1 nach 409 Frames, danach alle 600 Frames (≈ 10 s); 24 nach 409 + 14 × 600 = 8809 Frames (≈ 2,4 min) | wie oben |
| Tod der Figur | −3 | wie oben |
| Wirkung | legt beim Beginn eines Angriffs dessen Schaden fest und beim Erscheinen die LP eines später erscheinenden Gegners | wie oben |
| Rang beim Stage-Wechsel | läuft weiter, beschlossen (E9); im Vorbild −3 im Frame des Wechsels, nie unter 7, der 600er-Zähler läuft weiter (notes.md, „Nachtrag: Rest der Spielfigur“) | Abschnitt 9 |

| Rolle | Schaden vorplatziert | Schaden nach Rang | LP | Quelle |
|---|---|---|---|---|
| Nahkämpfer leicht | 5 | 7 / 8 / 9 / 10 bei Rang 7 / 8–14 / 15–21 / 22–24 | vorplatziert 16, später 22–34 | „Schaden der Gegner“, „Lebenspunkte“ (teils Workflow) |
| Nahkämpfer schwer | 6 | jeweils 1 mehr: 8 / 9 / 10 / 11 | vorplatziert 30, später 32–42 | wie oben |
| Schneller Messerkämpfer | – | Messer 7–10, Wurfmesser und Ausfallstich 10–13 | 34–46 | wie oben |
| Fernkämpfer | – | Pistole 5–7 je Schuss, Raketen 12–15 (Workflow) | Richtwert 16–28 (erkenntnisse.md) | „Schaden der Gegner“ |
| Boss | – | Schläge 9–12, Ansturm 12–17, Körperpresse 16–22, Griff und Wurf 16–22 (Workflow) | 90–120, beschlossen (E9); im Vorbild beim Erscheinen nach Rang festgelegt: 90 (Rang 7–8), 100 (9–15), 110 (16–23), 120 (24) (notes.md, „Nachtrag: Boss“); daher nennt grafik/README.md 100 und die Messläufe 110 (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | „Schaden der Gegner“ |

Wie die LP innerhalb der Spanne vom Rang abhängen, steht nicht in
`mechanik.md`. Beschlossen (E9): gleichmäßig von der Untergrenze bei
Rang 7 bis zur Obergrenze bei Rang 24. Flächenangreifer und schwerer
Gegner bekommen ihre Werte in `docs/design-gegner-stages.md`.

**Rechnung 1: Wie viele Treffer hält die Figur aus?** Weil sie erst unter
0 LP stirbt, übersteht sie bei Schaden d genau 72 geteilt durch d Treffer,
abgerundet. Stage 1 beginnt bei Rang 9. Weil der Rang über den
Stage-Wechsel weiterläuft (E9), beginnt jede weitere Stage mit dem Rang
am Ende der vorigen, nach jedem Tod 3 tiefer. Das Ende von Stage 1
schätzen wir aus dem Vorbild: Ein Bot besiegte dort den ersten Boss nach
6047 Frames, davon hing er 1266 Frames an einem Tresen fest
(grafik/README.md, Stage 1). Nach 4781 bis 6047 Frames steht der Rang bei
17 bis 19; Stage 1 beginnt also in Rangstufe II und endet in Rangstufe
III. Rang 22 folgt nach 7609 Frames, Rang 24 nach 8809 Frames (≈ 2,4 min),
ohne Tod also im Lauf von Stage 2; ab dort gelten die Zeilen „Rang
22–24“. Zum Vergleich: Ein Durchlauf ohne Kämpfe dauert im Vorbild 17 bis
56 Sekunden einschließlich Skriptszenen (erkenntnisse.md „Stages als
Vorbild“), bei uns das reine Gehen 14 bis 24 s
(`docs/design-gegner-stages.md`, Abschnitt 5).

| Lage | Rang | Schaden je Treffer | Treffer ausgehalten | LP danach | tödlich ist der |
|---|---|---|---|---|---|
| Beginn Stage 1, vorplatzierter Nahkämpfer leicht | fest | 5 | 14 | 2 | 15. Treffer |
| Beginn Stage 1, vorplatzierter Nahkämpfer schwer | fest | 6 | 12 | 0 | 13. Treffer |
| Beginn Stage 1, später erscheinender leichter | 9 | 8 | 9 | 0 | 10. Treffer |
| Beginn Stage 1, später erscheinender schwerer | 9 | 9 | 8 | 0 | 9. Treffer |
| Rang 22–24, Nahkämpfer leicht | 22–24 | 10 | 7 | 2 | 8. Treffer |
| Rang 22–24, Nahkämpfer schwer | 22–24 | 11 | 6 | 6 | 7. Treffer |
| Rang 22–24, Ausfallstich (Höchstwert) | 22–24 | 13 | 5 | 7 | 6. Treffer |
| Boss, Körperpresse (Höchstwert) | 24 | 22 | 3 | 6 | 4. Treffer |

Zu Beginn von Stage 1 hält die Figur also 8 bis 14 Treffer aus, ab Rang 22
(ohne Tod ab Stage 2) 5 bis 7, gegen die schwersten Bossangriffe 3. Die
Regel „Tod erst unter 0 LP“ bringt bei 6, 8 und 9 LP Schaden genau einen
Treffer mehr, weil die LP dort genau auf 0 fallen.

**Rechnung 2: Wie viele Ketten braucht ein Gegner?** Eine volle Kette von
Vela macht 22 LP und wirft immer um. Angefangene Ketten zählen mit.

| Rolle | LP | Ketten (22 LP) | Anmerkung |
|---|---|---|---|
| Nahkämpfer leicht, vorplatziert | 16 | 1 | fällt im Abschlusstritt |
| Nahkämpfer leicht, später | 22–34 | 1–2 | mit 22 LP steht er nach einer Kette auf genau 0; er fällt nicht: Mit genau 0 LP reagiert er normal und kämpft weiter, erst der nächste Treffer tötet ihn (notes.md, „Nachtrag: Rest der Spielfigur“) |
| Nahkämpfer schwer, vorplatziert | 30 | 2 | nach der ersten Kette 8 LP Rest |
| Nahkämpfer schwer, später | 32–42 | 2 | – |
| Schneller Messerkämpfer | 34–46 | 2–3 | ab 45 LP reichen zwei Ketten (44 LP) nicht |
| Fernkämpfer | Richtwert 16–28 | 1–2 | – |
| Flächenangreifer | 30–60 (Glimmer und Fackel, `docs/design-gegner-stages.md`, Abschnitte 1.5 und 3) | 2–3 | – |
| Schwerer Gegner (Koloss) | 85–99 (`docs/design-gegner-stages.md`, Abschnitt 1.6) | 4–5 | ab 89 LP reichen vier Ketten (88 LP) nicht |
| Boss | 90–120 (Ballast 100); Vorbild 90 bis 120 je nach Rang beim Erscheinen (notes.md, „Nachtrag: Boss“) | 5–6 | Super-Armor, beschlossen (E11): Kettenstufen 1 bis 3 zählen nur, wenn ihre Folge mit einem umwerfenden Treffer endet (jeder nächste Treffer bis h+23, E19) oder ein Treffer die LP unter 0 bringt (dann fällt der Boss sofort, `docs/spezifikation-welt.md`, 7.4, SA6); umwerfende Treffer, Sprungangriffe, Würfe, Kniestoß, Spezialangriff und Explosion zählen immer (`docs/design-gegner-stages.md`, Abschnitt 4); mit 100 LP ergeben 4 Ketten und ein Wurf 102 LP; mit 110 LP stehen nach 5 Ketten genau 0 LP, und der Boss kämpft weiter, bis ein Treffer ihn unter 0 bringt (notes.md, „Nachtrag: Boss“); mit 120 LP braucht es 6 Ketten |

Mit Kord und Rin (21 LP je Kette) braucht ein leichter Nahkämpfer mit
22 LP einen Schlag mehr, mit Ollo (23 LP) fällt er sicher in einer Kette.
Nach dem Abschlusstritt ist ein Gegner unverwundbar, bis er 105 Frames
später wieder frei ist (schwerer Nahkämpfer 89 bis 117 Frames); einen
Schutz danach hat er nicht (notes.md, „Nachtrag: Trefferreaktion der
Gegner“). Beschlossen (E4): Unsere Gegner haben ebenfalls keinen Schutz
nach dem Aufstehen; ab dem ersten handlungsfähigen Frame G sind sie
verwundbar und greifbar, auch nach einem Wurf; im Vorbild ist ein
geworfener Gegner erst ab G+1 greifbar (`docs/design-gegner-stages.md`,
Abschnitt 2).

## 7. Rahmen

Alles in diesem Abschnitt ist beschlossen (E9), die Zeile
„Angriffserlaubnis“ und die Ergänzungen zu Leben und Punkten mit E10; das
Vorbild ist hier nicht untersucht (erkenntnisse.md „Stand der Analyse“).

| Element | Festlegung | Begründung |
|---|---|---|
| Titel | Logo vor dem Kometen, „Start drücken“; ohne Eingabe Wechsel zwischen Demo mit Spielszenen, Bestenliste und Steuerungstafel | Automatengefühl; die Demo zeigt Kette, Griff und Wurf, bevor jemand spielt |
| Figurenwahl | vier Helden nebeneinander mit Porträt, Name und drei Kurzangaben (Kette, Wurf, Spezialangriff); Wahl mit Richtung und Angriff; Countdown wie am Automaten; zwei Spieler dürfen denselben Helden in anderer Farbe nehmen | Die Helden unterscheiden sich nur in diesen drei Punkten, also zeigt die Wahl genau diese |
| Anzeigeleiste | oben je Spieler: Name, Punkte, Leben, LP-Balken mit 1 px je LP (72 px); daneben Name und Balken des Gegners, den die Figur zuletzt getroffen hat, bis sie einen anderen trifft; Boss-Balken in Lagen | Der Gegnerbalken zeigt, ob sich noch eine Kette lohnt; 1 px je LP macht Schaden ablesbar |
| Zeit | keine Zeitanzeige in normalen Stages, Zeitlimit nur in der Sonderstage | Der Rang steigt schon mit der Spielzeit (Abschnitt 6), ein Zeitlimit würde Zögern doppelt bestrafen |
| Leben | drei Leben je Spiel; Neueinstieg an derselben Stelle mit 72 LP, Rang −3; Schutzdauer nach dem Neueinstieg wie im Vorbild 252 Frames ab dem Erscheinen, davon 200 nach der Landung, und die Landung trifft alle Gegner im Bild, beschlossen (E10); Gegnerangriffe bleiben darin ohne Wirkung (notes.md, „Nachtrag: Rest der Spielfigur“); in der Scheibe Neueinstieg nach jeder Todesart in t+120 (E16, Abschnitt 8) | Rang −3 aus „Schaden der Gegner“ fängt eine Pechsträhne ab |
| Continue | nach dem letzten Leben Countdown „Weiter?“; Punkte bleiben, ein Continue-Zähler ist sichtbar; Anzahl offen (Abschnitt 9) | ohne Münzen hält der Zähler den Reiz, ohne Continue durchzukommen |
| Punkte je Treffer | 10 Punkte je LP Schaden (volle Kette 220, Wurf 140); sie bleiben auch, wenn die Super-Armor des Bosses die LP zurücknimmt, beschlossen (E10) | Ketten, Würfe und Treffer mit geworfenen Gegnern zählen nach ihrer Wirkung; Richtwert Vorbild: Kette 10/20/30/40 je Stufe (notes.md, „Nachtrag: Gegenstände und Waffen“) |
| Punkte je Gegner | Bonus nach Rolle: leicht 100, schwer und Fernkämpfer 200, Messerkämpfer und Flächenangreifer 300, schwerer Gegner 1000, Boss 5000; Gegner, die mit dem Boss fallen, geben keinen Bonus, und am Stage-Ende gibt es keinen Bonus über die Bosspunkte hinaus, beschlossen (E10) | belohnt das Beenden und schwierige Ziele; Richtwert Vorbild: 80 bzw. 100 je Abschuss eines leichten bzw. schweren Nahkämpfers (ebenda) |
| Punkte je Gegenstand | Essen 100, Wertsachen aus Kisten 500 bis 5000, Waffe aufheben 0 | gibt Kisten einen Grund, auch bei vollen LP; Richtwert Vorbild: Essen bei vollen LP gibt 100 bis 1000 Punkte statt LP, Waffe aufheben 0 (ebenda) |

Zwei Spieler gleichzeitig:

| Regel | Festlegung | Begründung |
|---|---|---|
| Beitritt | jederzeit mit Start | Automatengefühl, kein Neustart nötig |
| Freundbeschuss | aus: Schläge, Sprungangriffe, Spezialangriffe und geworfene Gegner treffen den Mitspieler nicht | In Gruppen träfen Ketten und Würfe sonst ständig den Partner; das Kampfgefühl soll wie allein bleiben |
| Griff auf Mitspieler | nicht möglich; Spielfiguren laufen durcheinander hindurch | Der Griff entsteht durch Hineinlaufen (Abschnitt 4.4), mit Mitspieler wäre er ständig ein Versehen |
| Gegriffener Gegner | der Mitspieler darf ihn schlagen, der Griff bleibt bestehen | Zusammenspiel lohnt sich; wirksame Treffer von Gegnern beenden den Griff weiterhin |
| Kamera | scrollt, wenn der vordere Spieler die Haltelinie überschreitet (`design-gegner-stages.md`, Abschnitt 5), aber nur, solange der hintere nicht am linken Rand steht; sonst ist der rechte Rand für den vorderen eine Wand; Sperren gelten für beide | Beide bleiben im Bild, keiner wird hinausgeschoben, der linke Rand bleibt Wand (erkenntnisse.md „Stages als Vorbild“) |
| Rang | ein gemeinsamer Rang, −3 bei jedem Tod | einfach; wer öfter stirbt, senkt den Druck für beide |
| Gegner | mehr Gegner je Welle statt mehr LP; im Vorbild greift meist einer an, zwei gleichzeitig in 0,6 bis 9 % der Gruppenframes, mehr als zwei in höchstens 3 % (notes.md, „Nachtrag: Verhalten der Nahkämpfer“) | Mehr LP würden die Rechnung aus Abschnitt 6 verschieben |
| Angriffserlaubnis | beschlossen (E10): Die Grenze aus E5 gilt je Figur, also je Figur höchstens zwei Angreifer, je Seite einer (`design-gegner-stages.md`, Abschnitt 2) | E5 ist für eine Figur formuliert; so bleibt der Druck auf jede Figur wie allein |

## 8. Vertikale Scheibe

Ziel des ersten spielbaren Stands: nachweisen, dass sich das Kampfgefühl
Frame für Frame wie gemessen anfühlt, bevor Inhalte in die Breite gehen.

| Teil | Umfang | Grundlage |
|---|---|---|
| Held | Vela, ein Spieler, Grundkit aus Abschnitt 4 einschließlich Sprint, Sprintangriff und Sprint-Sprungangriff (E15; Werte in Abschnitt 4.5) | Abschnitte 4 und 5 |
| Zwei Nahkämpfer | Nahkämpfer leicht und schwer: Gehen, Angriffsserie, Treffer, Umgeworfen, Liegen, Aufstehen, Gegriffen, Geworfen, Tod | `design-gegner-stages.md`, Abschnitte 1 und 9 |
| Ein Fernkämpfer | Zünder mit Raketenwerfer: hält Abstand, zielt 60 Frames sichtbar und schießt dann (E17); seine Waffe bleibt liegen | wie oben |
| Stage-Abschnitt | Abschnitte A, B und F der ersten Stage mit den Wellen 1, 2 (Sperrwelle), 7 und 9 (nur der Zünder mit Raketenwerfer), Übergang von B nach F mit Blende; Tiefenstreifen, Hintergrund, eine Vordergrundebene. Zuschnitt beschlossen (E10), Tabelle „Zuschnitt der Scheibe“ | `design-gegner-stages.md`, Abschnitte 5 und 7 |
| Boss | Ballast mit Super-Armor, 100 LP (Spanne 90 bis 120, Abschnitt 6), drei Angriffe: Ansturm, Armschwung, Körperpresse. Der Ansturm wirft bei Kontakt um (12 bis 17 LP), ohne Übergang in den Griff, beschlossen (E10); einen Griff mit Wurf hat der Ballast nur im Vollspiel, nicht in der Scheibe (E21; Vorbild gemessen, notes.md, „Nachtrag: Boss“, O17). Armschwung wie im Vorbild: Der nächste Schwung folgt nur, wenn der vorige getroffen hat, höchstens drei (E18). Trefferreaktion 23 Frames wie bei allen Gegnern (E19). Super-Armor, beschlossen (E11), Regel in `docs/spezifikation-welt.md`, 7.4: Kettenstufen 1 bis 3 ziehen LP vorläufig ab; kommt bis h+23 kein weiterer Treffer, springen die LP auf den Wert vor der Folge zurück, und der Boss zieht sich 54 Frames zurück; umwerfende Treffer, Spezialangriff, Kniestoß, Wurf, Explosion, Sprintangriff, geworfener Gegner und die Landung beim Neueinstieg zählen endgültig; keine zufällige Zurückweisung. Super-Armor im Vorbild: Spezialangriff, Kniestoß, Wurf und Waffen wirken immer; Kettenschläge, Sprung- und Sprintangriff weist er manchmal zurück (die LP kehren in h+1 auf den Wert vor diesem Treffer zurück), danach weicht er 54 Frames und 48 px zurück, ohne Schaden und ohne Umwerfen (notes.md, „Nachtrag: Boss“). Wann er zurückweist, ist unsicher: Der Anteil steigt mit dem Rang (Bot: Messagent 15 bis 39 %, Gegenprüfer 16 bis 36 %), eine Regel fand keine Messung | `design-gegner-stages.md`, Abschnitte 4 und 7 |
| Zwei Gegenstände | Essen: ein Kometenbraten aus einem Fass in Abschnitt B (heilt voll; Heilwerte je Art beschlossen (E9) wie im Vorbild: voll, +55, +40, +16 oder +12 LP; bei vollen LP Punkte statt LP; Essen läuft nicht ab). Der Raketenwerfer (`mechanik.md`, „Gegenstände und Waffen“: 3 Schuss, 8 LP, wirft um, nur die Explosion trifft) aus zwei Asservatenkisten und vom Zünder, kein Laser; Fass und Kisteninhalt beschlossen (E10). Waffen liegen 700 Frames ab der Landung L, blinken dann und verschwinden in L+792 (92 Frames ab Liegezeit 0; notes.md, „Nachtrag: Gegenstände und Waffen“) | `design-gegner-stages.md`, Abschnitte 7 und 8 |
| Rahmen | Anzeigeleiste mit LP-Balken von Figur und Gegner, Leben, Punkte; Rang intern; Tod und Neueinstieg einheitlich: Neueinstieg N = t+120 für jede Todesart, ohne die Sonderfälle Wand und Rollen des Vorbilds, beschlossen (E16); Game Over ohne Continue, danach Neustart der Scheibe mit Seed + 1, beschlossen (E10) | Abschnitt 7; `docs/spezifikation-kampf.md`, 6.5 |
| Prüfhilfe | Frame-Protokoll (x, Tiefe, Höhe, LP, Aktion, Rang je Frame) und abspielbare Eingabeaufzeichnung | Abnahme |
| Technik | beschlossen (E22): TypeScript; reiner Logikkern ohne Browser-Abhängigkeit, Darstellung über Canvas 2D in einer HTML-Seite, Prüfläufe und Abnahmetests in Node, Bildschirmfotos über Playwright; keine npm-Abhängigkeiten. Das Programm liegt in `spiel/`; Bedienung, Bau, Tests und Stand der Abnahme stehen in `docs/scheibe.md` | Abschnitt 3; `docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md`, Abschnitt 2 |
| Nicht enthalten | Titel, Figurenwahl, zweiter Spieler, weitere Helden, Sonderstage, Griff des Bosses (E21), Sonderfälle beim Tod (E16), Sound außer Platzhaltern | – |

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
   32 Frames (leicht) bzw. 16 bis 44 Frames (schwer; Auswahl im Vorbild
   offen, bei uns gleichverteilt in Schritten von 4, beschlossen (E10),
   `design-gegner-stages.md`, Abschnitt 2), Aufstehen 18 Frames ohne Schutz
   danach. Die Kette hält, weil der Gegner
   frühestens in h+45 ausholt. Mit genau 0 LP stirbt ein Gegner nicht, er
   kämpft weiter; erst der nächste Treffer tötet ihn (notes.md, „Nachtrag:
   Rest der Spielfigur“).
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
   bis +11 px verlässt; Treffer bis 48 px Höhe. Pistole, Rakete und
   Wurfmesser: Werte in `design-gegner-stages.md`, Abschnitte 1.3 und 1.4
   (notes.md, „Nachtrag: Fernangriffe der Gegner“); unsicher bleibt der
   Rhythmus.
4. Spezialangriff und Sprint: gesichert (notes.md, „Nachtrag:
   Spezialangriff“ und „Nachtrag: Sprint“), Werte in Abschnitt 4.5.
   Unsicher: Tiefengrenzen der Explosionsform und Reichweite des
   Sprint-Sprungangriffs nach dem 20. Frame (162 oder 172 px bzw. 162 oder
   140 px); bis zu einer Messung gilt die Reichweite aus A+20 in allen
   aktiven Frames (E15).
5. Gegenstände: gesichert (notes.md, „Nachtrag: Gegenstände und
   Waffen“), Werte in der Tabelle oben. Unsicher: größte Laserreichweite
   (310, 350 oder unter 275 px) und Aufnahmebereich rechts beim
   Raketenwerfer (35 oder 37 px).
6. Mit Messpaket 2 gemessen (Liste „Offen bis Messpaket 2“ am Ende
   dieses Abschnitts, Spalte „Stand nach Messpaket 2“): Nachlauf der Kettenstufen 2 bis 4, Reichweite der
   Sprungangriffe hoch und runter, Tod bei genau 0 LP, Schutzdauer nach
   dem Neueinstieg, Rang beim Stage-Wechsel (M8); Super-Armor des Bosses
   (welche Treffer zählen, wann und auf welchen Wert die LP zurückspringen,
   Schaden und Umwerfen des Abbruchstoßes) und seine LP im Vorbild (M6, O8
   und O12); Pistole, Rakete und Wurfmesser (M7, O11).

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
   bei 86 px oder 13 px, und der Abschlusstritt trifft bis 100 px, in
   beiden Blickrichtungen (E14).
6. Läuft die Figur in einen Gegner, greift sie ihn bei höchstens 39 px vorn
   (in beiden Blickrichtungen, E14) und 10 px Tiefe, und ein Wurf macht in
   E+1 14 LP, legt ihn 184 bis 185 px entfernt ab und wirft einen zweiten
   Gegner auf der Bahn mit 3 LP um.
7. Nach einem erlittenen Treffer verliert die Figur 27 Frames lang und nach
   dem Aufstehen 35 Frames lang keine LP, auch wenn ein Gegner dort
   angreift (E2), und umgeworfen liegt sie ohne Eingabe 121 Frames.
8. Mit genau 0 LP spielt die Figur weiter, und treffen Figur und Gegner im
   selben Frame, verliert nur der Gegner LP.
9. Der Rang startet bei 9, steigt nach 409 Frames und danach alle 600 Frames
   um 1 bis 24, sinkt bei jedem Tod um 3, und ein später erscheinender
   leichter Nahkämpfer trifft bei Rang 8 bis 14 mit genau 8 LP.
10. Die Kamera hält an der Sperre, bis die Welle besiegt ist; endet eine
    Kette am Boss ohne Umwerfen, springen seine LP in h+23 auf den Wert vor
    der Kette zurück, und er zieht sich mit einem Stoß zurück (E11, E19);
    sein Fall besiegt alle übrigen Gegner.

### Offen bis Messpaket 2

Messpaket 2 misst, was in diesem Dokument noch fehlt: **M6** den Boss,
**M7** Fernkampf und Messerwurf, **M8** den Rest der Spielfigur (Nachlauf
der Kettenstufen 2 bis 4, Sprungangriff hoch und runter, Tod bei genau
0 LP, Schutz nach dem Neueinstieg, Rang beim Stage-Wechsel). Der Nachtrag
nach Phase 2 füllt diese Stellen. Nummeriert sind nur Stellen mit
Messauftrag; offene Werte ohne Messauftrag heißen in beiden Dokumenten
einfach „offen“ mit Grund. Dieselbe Lücke trägt in beiden Dokumenten
dieselbe Nummer; nur Neues setzt sich in `docs/design-gegner-stages.md`,
Abschnitt 10, ab O17 fort. O6 und O13 bis O16 sind nach der Prüfung
entfallen (O6 ohne Messauftrag, O13 bis O16 in O8, O11 und O12
zusammengelegt).

| Nr. | Stelle | Was fehlt | Messpaket | Stand nach Messpaket 2 |
|---|---|---|---|---|
| O1 | 4.2, Kette Stufe 2, Nachlauf | handlungsfähig ab (Laufen, Schlag, Sprung) nach Treffer und Leerschlag, Pose ohne Eingabe | M8 | gefüllt, gesichert |
| O2 | 4.2, Kette Stufe 3, Nachlauf | wie O1 | M8 | gefüllt, gesichert |
| O3 | 4.2, Kette Stufe 4, Nachlauf | wie O1, dazu der Nachlauf nach dem zweiten aktiven Abschnitt D+17 bis D+20 | M8 | gefüllt, gesichert |
| O4 | 4.3, Sprungangriff hoch | Reichweite x und Tiefe | M8 | gefüllt, gesichert |
| O5 | 4.3, Sprungangriff runter | Startup, aktive Frames, Reichweite x und Tiefe | M8 | gefüllt, gesichert |
| O7 | 6, Rang beim Stage-Wechsel | Verhalten im Vorbild; unsere Regel steht (läuft weiter, E9) | M8 | gefüllt, gesichert |
| O8 | 6, Boss (Rollentabelle); `design-gegner-stages.md`, 4, Prinzip 4 | LP des Vorbild-Bosses: 100 oder 110, Abhängigkeit vom Rang | M6 | gefüllt, gesichert |
| O9 | 6, Rechnung 2 (leichter Nahkämpfer und Boss); 8, Messwerte Punkt 1 | stirbt ein Gegner bei genau 0 LP? Fällt der Boss bei genau 0 LP? | M8; beim Boss M6 | gefüllt, gesichert (Gegner und Boss) |
| O10 | 7, Leben | Dauer und Art des Schutzes nach dem Neueinstieg | M8 | gefüllt, gesichert |
| O11 | 8, Messwerte Punkt 3; `design-gegner-stages.md`, 1.3 und 1.4 | Pistole, Rakete und Messerwurf: Auslösung, gehaltener Abstand, Startup, Geschoss, Reichweite, Schaden, Rhythmus | M7 | gefüllt, gesichert; Rhythmus unsicher |
| O12 | 8, Tabelle (Boss) und Messwerte Punkt 6; `design-gegner-stages.md`, 4, Prinzip 1 | Super-Armor im Einzelnen: welche Treffer zählen (auch der Spezialangriff), wann und auf welchen Wert die LP zurückspringen, Schaden und Umwerfen des Abbruchstoßes; dazu Trefferreaktion, Angriffe und Rhythmus des Bosses | M6 | Super-Armor gefüllt, gesichert; Regel und Anteil der Zurückweisung unsicher. Trefferreaktion, Angriffe und Rhythmus des Bosses stehen in notes.md, „Nachtrag: Boss“; hier nicht eingetragen, weil das Dokument dafür keine offene Stelle hatte |

## 9. Entscheidungen des Nutzers

### Entschieden am 2026-10-02

| Nr. | Thema | Entscheidung | Wo eingearbeitet |
|---|---|---|---|
| E1 | Welt | Kometenhafen „Perihel“ auf dem Kometen Orrin; Küstenstadt und Zirkusschiff sind verworfen | Abschnitte 1 und 2 |
| E2 | Schutzfenster der Figur | wie im Vorbild: Gegner greifen in den Schutzfenstern und eine liegende Figur an, ihre Treffer sind wirkungslos; die Angriffserlaubnis nimmt darauf keine Rücksicht. Begründung: so gemessen, einfacher, und die Gegner wirken nicht passiv | Abschnitt 4.7; `design-gegner-stages.md`, Abschnitt 2 |
| E3 | Rückstoß der Kette | keiner; die Trefferreaktion dauert 23 Frames mit Zittern als Animation, der Gegner bleibt am Ort | Abschnitt 3 (Stillstand h+1 bis h+8 innerhalb der 23 Frames); `design-gegner-stages.md`, Abschnitte 1.6, 2 und 9 (gilt für alle Gegner einschließlich Koloss und Bosse, bei Bossen zusätzlich die Super-Armor; geht E9 vor) |
| E4 | Schutz der Gegner nach dem Aufstehen | keiner; ab dem ersten handlungsfähigen Frame sofort verwundbar und greifbar | Abschnitt 6; `design-gegner-stages.md`, Abschnitt 2 |
| E5 | Gleichzeitige Angreifer | höchstens zwei, je Seite der Figur höchstens einer; höchstens ein Fernkämpfer zielt gleichzeitig, ab Stage 6 zwei | `design-gegner-stages.md`, Abschnitt 2; Abschnitt 7 (zwei Spieler, E10) |
| E6 | Spielschritt | 60 Hz fester Schritt; alle Frame-Zahlen bleiben, Sekundenangaben sind Frames ÷ 60 | Abschnitt 3; `design-gegner-stages.md`, Einheiten und Abschnitte 5 und 6 |
| E7 | Helden | Vela, Kord, Rin und Ollo mit den Werten aus Abschnitt 5 als Arbeitsstand; die Namen können später wechseln | Abschnitt 5 |
| E8 | Stages | acht, die Sonderstage mit automatischem Scrollen an Position 5 | Abschnitt 2; `design-gegner-stages.md`, Abschnitt 6 |
| E9 | Übrige Vorschläge | alle weiteren Vorschläge beider Designdokumente sind angenommen, darunter Leben, Continues (Punkte bleiben), Punkteschema, Zweispieler-Regeln, kein Zeitlimit in normalen Stages, Rang läuft über den Stage-Wechsel weiter, LP der Gegner gleichmäßig nach Rang, Fahrzeug nur als Gegner, Essenswerte, Boss-LP 90 bis 120, Bossschaden bis 22, Flächenschaden bis 13, Wellenbonus, Gegner heben keine Waffen auf. Im Text steht dafür „beschlossen (E9)“ | beide Dokumente |

### Entschieden am 2026-10-03

Der Nutzer hat alle Empfehlungen des Orchestrators angenommen
(`docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md`,
Abschnitt 1). Die Begründungen stehen in `docs/erkenntnisse.md`,
„Entscheidungen“.

| Nr. | Thema | Entscheidung | Wo eingearbeitet |
|---|---|---|---|
| E10 | Arbeitsregeln | Alle Festlegungen, die in beiden Designdokumenten und in beiden Spezifikationen als „Arbeitsregel“, „Platzhalter“ oder mit „Einverstanden?“ geführt sind, gelten als bestätigt, soweit E11 bis E21 nichts anderes sagen; darunter Schutz auch gegen Geschosse, Zuschnitt der Scheibe, Angreifergrenze je Figur, Ausnahmen über 13 LP, Spezialangriff aus dem Griff, Landung und Schutz nach dem Neueinstieg, Game Over der Scheibe ohne Continue. Im Text steht dafür „beschlossen (E10)“ | Abschnitte 4.5, 4.7, 6, 7, 8; `design-gegner-stages.md`, Abschnitte 1, 2, 4, 7, 8; beide Spezifikationen |
| E11 | Super-Armor | feste Regel nach `docs/spezifikation-welt.md`, 7.4 (SA1 bis SA6): Kettenstufen 1 bis 3 ziehen LP vorläufig ab, 23 Frames nach dem letzten Treffer ohne Umwerfen springen sie zurück, und der Boss zieht sich 54 Frames zurück; umwerfende Treffer, Spezialangriff, Kniestoß, Wurf, Explosion, Sprintangriff, geworfener Gegner und die Landung beim Neueinstieg zählen endgültig; keine zufällige Zurückweisung wie im Vorbild | Abschnitte 6 und 8; `design-gegner-stages.md`, Abschnitt 4 |
| E12 | Zahlendarstellung | Festkomma 16.16 nach `docs/spezifikation-kampf.md`, 2.4, verbindlich für Positionen, Geschwindigkeiten und Beschleunigungen | Abschnitt 3 |
| E13 | Zu langsame Darstellung | Logik in Echtzeit mit 60 Schritten je Sekunde, Bilder fallen aus; höchstens 4 Logikschritte je Bild, darüber bleibt die Zeit stehen | Abschnitt 3 |
| E14 | Blickrichtung | symmetrisch: Für Blick links gelten die Werte für Blick rechts aus `mechanik.md` (Reichweiten, Griffweiten, Aufnahmebereiche, Explosionsgrenzen); Griff von hinten 24 px in beide Richtungen | Abschnitte 1, 4.4, 4.7, 8 (Abnahme); `design-gegner-stages.md`, Abschnitt 8 |
| E15 | Sprint-Sprungangriff | gehört in die Scheibe: 13 LP, Reichweite 38 bis 147 px in allen aktiven Frames | Abschnitte 4.5 und 8 |
| E16 | Todesarten | einheitlich Neueinstieg N = t+120 in der Scheibe; die Sonderfälle Wand und Rollen des Vorbilds kommen nicht in die Scheibe | Abschnitte 1, 7 und 8 |
| E17 | Zünder | 60 Frames sichtbares Zielen mit Zielrecht, danach Schuss; Schuss, Geschosse und Explosion wie gemessen | Abschnitt 8; `design-gegner-stages.md`, Abschnitte 1.4 und 9 |
| E18 | Boss-Armschwung | wie im Vorbild: der nächste Schwung nur, wenn der vorige getroffen hat, höchstens drei | Abschnitt 8; `design-gegner-stages.md`, Abschnitt 4 |
| E19 | Boss-Trefferreaktion | 23 Frames wie bei allen Gegnern (E3); Folgefrist der Super-Armor h+23 | Abschnitte 6 und 8; `design-gegner-stages.md`, Abschnitte 2 und 4 |
| E20 | Welle 9 der vollen ersten Stage | wie gemessen: Pistolen-Zünder nach dem Tod des ersten Arena-Bolzers, Raketen-Zünder bei einem Viertel der Boss-LP, ein zweiter nur ab Rang 16 und bei höchstens drei anderen lebenden Gegnern; in der Scheibe gilt der Zuschnitt (E10) | `design-gegner-stages.md`, Abschnitt 7 |
| E21 | Griff des Bosses | im Vollspiel ja (Griff mit Wurf nach `mechanik.md`, „Boss“), in der Scheibe nein | Abschnitt 8; `design-gegner-stages.md`, Abschnitte 4 und 7 |
| E22 | Technik | TypeScript, reiner Logikkern ohne Browser, Canvas 2D in einer HTML-Seite, Prüfläufe und Abnahmetests in Node, Bildschirmfotos über Playwright, keine npm-Abhängigkeiten | Abschnitt 8; `docs/scheibe.md` |

### Offen

1. Namen der Helden endgültig (E7 lässt sie wechseln).
2. Grafikstil und Sound: Palette, Pixelstil, Musikrichtung.
3. Zahl der Continues: E9 nimmt den Continue-Ablauf an; eine Zahl war
   nicht vorgeschlagen.
4. Extraleben: E9 nimmt das Punkteschema an; Extraleben waren nicht
   vorgeschlagen.

### Bis 2026-10-02 offen, jetzt entschieden

5. Grenzfälle gegenüber dem Vorbild: symmetrisch, beschlossen (E14). Der
   Griff reicht bei Blick links wie bei Blick rechts 39 px, von hinten
   24 px in beide Richtungen; ebenso gelten Reichweiten, Aufnahmebereiche
   und Explosionsgrenzen für beide Blickrichtungen gleich (Abschnitte 4.4
   und 4.7). Der freie Spezialangriff kostet wie im Vorbild 9 LP nur bei
   einem Treffer; das ist die Festlegung in Abschnitt 4.5 und
   `docs/spezifikation-kampf.md`, 6.4, bestätigt mit E10.
6. Zwei Spieler: Die Grenze der Angreifer aus E5 gilt je Figur,
   beschlossen (E10) (Abschnitt 7; `design-gegner-stages.md`, Abschnitt 2).
7. Schaden über der Spanne 5 bis 13: Griff des Fahrzeuggegners 15 LP und
   rollende Fässer 16 LP sind genannte Ausnahmen, beschlossen (E10)
   (Abschnitt 6).
8. Spezialangriff aus dem Griff: aktive Frames wie beim freien
   Spezialangriff, ab E gezählt, beschlossen (E10) (Abschnitt 4.5).

Die Entscheidungen zu Gegnern, Bossen, Stages und zur Scheibe und die
beiden dort noch offenen Fragen (Sonderstage, Trefferreaktion des
schweren Gegners) stehen in `docs/design-gegner-stages.md`, Abschnitt 10.

## 10. Quellen

| Datei | verwendete Abschnitte |
|---|---|
| `docs/mechanik.md` | Konventionen; Bewegung; Angriff (Standardschlag, Kette); Sprung; Sprungangriff; Griff und Wurf; Spezialangriff; Sprint; Trefferreaktion der Gegner; Umgeworfen werden; Schaden der Gegner; Reichweite der Gegnerangriffe; Unverwundbarkeit; Lebenspunkte; Gegenstände und Waffen; Nicht übernommen |
| `research/captcomm/notes.md` | Nachtrag: Trefferreaktion der Gegner; Nachtrag: Verhalten der Nahkämpfer; Nachtrag: Reichweite der Gegnerangriffe; Nachtrag: Spezialangriff; Nachtrag: Sprint; Nachtrag: Gegenstände und Waffen; aus Messpaket 2: Nachtrag: Boss; Nachtrag: Fernangriffe der Gegner; Nachtrag: Rest der Spielfigur |
| `docs/erkenntnisse.md` | Haltung: inspiriert, kein Nachbau; Stand der Analyse; Was das Kampfgefühl ausmacht; Spielfiguren; Gegner als Vorbild; Stages als Vorbild; Hinweise für die eigene Grafik; Übernehmen, Richtwert, selbst gestalten |
| `research/captcomm/grafik/README.md` | Spielfiguren mit „Animationen im Einzelnen“ (Captain Commando, Mack the Knife, Ginzu the Ninja, Baby Head); Gemeinsame Bewegungen; Stage 1 (Dauer des Bot-Laufs, LP des Bosses) |
| `research/captcomm/grafik/figuren/ablaeufe.csv` | Zeilen `captain_*` für die Animationsliste in Abschnitt 8 |
| `docs/auftraege/2026-10-02-opus-messungen-und-design.md` | Auftrag D1, Bedeutung von M1 bis M5 |
| `docs/auftraege/2026-10-02-opus-auftrag-2-boss-fernkampf-spezifikation.md` | Abschnitt 1 (Entscheidungen E1 bis E9), Auftrag D3, Messpaket 2 (M6 bis M8) |
| `docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md` | Abschnitt 1 (Entscheidungen E10 bis E22), Abschnitt 2 (Technik), Auftrag D4 |
| `docs/spezifikation-kampf.md` | 2.1 (Spielschritt), 2.4 (Festkomma 16.16), 6.4 (Kosten des Spezialangriffs), 6.5 (Tod der Figur), 9.3 (Sprint-Sprungangriff, P7) |
| `docs/spezifikation-welt.md` | 7.4 (Super-Armor, SA1 bis SA6) |
| `docs/scheibe.md` | Programm der Scheibe: Bau, Tests, Abnahme |
| `docs/design-gegner-stages.md` | Abschnitt 1 (Gegnerrollen), 2 (Angriffserlaubnis, Trefferreaktion), 3 (Typen), 4 (Bosse), 5 (Kamera, Stage-Länge), 6 (Stages), 7 (erste Stage, Zuschnitt der Scheibe), 8 (Gegenstände), 9 (Animationen der Gegner), 10 (Entscheidungen und offene Fragen, Fortsetzung der Liste „Offen bis Messpaket 2“) |

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
