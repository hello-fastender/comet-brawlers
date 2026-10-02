# Mechanik-Vorgaben für Comet Brawlers

Dieses Dokument legt Zahlenwerte für unser Spiel fest. Übernommen werden
nur Werte, die in der Captain-Commando-Analyse als **gesichert** gelten
(Belege in `research/captcomm/notes.md`). Zeitangaben gelten in Frames bei
der Bildrate des Originals: 59,637405 Hz laut `mame -listxml captcomm`
(MAME 0.264, 8 MHz Pixeltakt ÷ (512 × 262)). Referenzfigur für alle
Messungen ist Captain Commando.

Stand 2026-10-02: Werte aus Aufgabe 4 und 5 sowie aus den Nachträgen
(Sprung, Schlagreichweite, Reichweite der Kettenstufen 2–4, Sprungangriff,
Griff und Würfe, Schaden der Gegner) übernommen. Werte mit „Workflow“ in der Belegspalte
sind von mehreren Agenten unabhängig gemessen und gegengeprüft, aber nicht
mit einem Skript im Repo nachvollziehbar (Kennzeichnung in notes.md).

Überblick über alle Erkenntnisse, die Haltung „inspiriert, kein Nachbau“
und was wir selbst gestalten: `docs/erkenntnisse.md`.

## Konventionen

- **Einheiten**: Positionen und Geschwindigkeiten in Pixeln des
  Originalbilds (384 × 224). Eine Positionseinheit des Spiels entspricht
  einem Bildschirmpixel, horizontal wie in der Tiefe (am Bild geprüft).
- **Zeit**: Frames bei 59,637405 Hz. Sekundenangaben in Klammern sind
  daraus umgerechnet. Bei 60 Hz ergeben dieselben Frame-Zahlen 0,6 %
  kürzere Zeiten.
- **P** ist der erste Frame, in dem eine Taste gedrückt ist. **h** ist der
  Frame, in dem der Treffer die LP des Gegners senkt.
- **Eingabelatenz**: Das Original reagiert einen Frame nach der Eingabe
  (P+1), bei Laufen, Schlag und Sprung gleich. Die Werte unten schließen
  diese Latenz ein, wo sie ab P gezählt sind.

## Bewegung

| Größe | Wert | Beleg |
|---|---|---|
| Laufgeschwindigkeit horizontal | 1,75 px/Frame (≈ 104 px/s) | notes.md „Messgrößen“, `logs/a5_laufen.csv` (`walk`, `walk_b`) |
| Laufgeschwindigkeit Tiefe | 1,0 px/Frame (≈ 60 px/s) | wie oben |
| Laufgeschwindigkeit diagonal | 1,25 px/Frame horizontal und 0,75 px/Frame in der Tiefe | wie oben |
| Anlauf und Abbremsen | keine: volle Geschwindigkeit ab dem ersten Bewegungsframe. Die Figur bewegt sich in genau so vielen Frames, wie die Richtung gedrückt ist, um einen Frame versetzt (gedrückt P bis E, Bewegung P+1 bis E+1) | wie oben |
| Richtungswechsel | ohne Verzögerung, auch beim Umdrehen | wie oben |

## Angriff (Standardschlag, Kette)

| Größe | Wert | Beleg |
|---|---|---|
| Schaden je Kombostufe | Stufe 1: 3, Stufe 2: 4, Stufe 3: 5, Stufe 4 (Abschlusstritt): 10 LP, unabhängig vom Gegnertyp | notes.md „Messgrößen“, `logs/a5_schaden.csv` (`attack`, `attack_b`, `combo_c`, Demo) |
| Treffer bis zum Umfallen | 4: Der Abschlusstritt (Stufe 4) wirft den Gegner um, auch wenn er danach noch LP hat | wie oben (`combo_c`: Gegner mit 30 LP liegt mit 8 LP) |
| Startup-Frames Standardschlag | Treffer in P+2, also 1 Frame Eingabelatenz plus 1 Frame. Folgeschläge der Kette: Stufe 2 in P+3, Stufe 3 in P+4, Stufe 4 in P+3 | notes.md „Messgrößen“, `logs/a5_schlag.csv` (`kontakt`, `kontakt_b`) |
| Trefferstopp | 7 Frames (≈ 0,12 s): Die Animation des Angreifers steht still | wie oben |
| Recovery-Frames Standardschlag (Treffer) | handlungsfähig ab h+13 (Laufen oder nächster Schlag). Ohne Eingabe bleibt die Schlagpose bis h+27, Ruhe ab h+28 | wie oben |
| Recovery-Frames Standardschlag (Leerschlag) | handlungsfähig ab P+8. Ohne Eingabe Aktion von P+1 bis P+16 (16 Frames), Ruhe ab P+17 | wie oben (`leerschlag`) |
| Reichweite Standardschlag (x) | Treffer bei x-Abstand ≤ 85 px zwischen den Positionen von Figur und Gegner, kein Treffer ab 86 px | notes.md „Nachtrag“, `logs/a7_reichweite.csv` |
| Reichweite Standardschlag (Tiefe) | Treffer bei Tiefenabstand ≤ 11 px, nie ab 13 px. 12 px ist ein Grenzfall (trifft fast immer) | wie oben |
| Aktive Frames Standardschlag | P+2 bis P+5 (4 Frames): Ein Gegner, der in dieser Zeit in Reichweite kommt, wird getroffen | wie oben |
| Reichweite Kettenstufen 2–4 (x) | Stufe 2: ≤ 87 px, Stufe 3: ≤ 91 px, Stufe 4: ≤ 100 px; jeweils 1 px weiter kein Treffer | notes.md „Nachtrag: Reichweite der Kettenstufen 2–4“, `logs/kette_reichweite.csv` |
| Reichweite Kettenstufen 2–4 (Tiefe) | Treffer bei Tiefenabstand ≤ 12 px, nie ab 13 px (ohne Grenzfall) | wie oben |
| Aktive Frames Kettenstufen 2–4 | D = Frame des Kettendrucks. Stufe 2: D+3 bis D+6, Stufe 3: D+4 bis D+7, Stufe 4: D+3 bis D+6. Trifft der Abschlusstritt dort nichts, ist er von D+17 bis D+20 noch einmal aktiv | wie oben |
| Kombo-Fenster | Der nächste Kettenschlag wird nur in einem Fenster von 16 Frames (≈ 0,27 s) nach dem Treffer h der Vorstufe angenommen: für Stufe 2 bei einem Druck in h+12 bis h+27, für Stufe 3 und 4 in h+11 bis h+26. Frühere Drücke werden verworfen, nicht gepuffert. Spätere Drücke beginnen eine neue Kette mit Stufe 1 | notes.md „Messungen im Einzelnen“ und „Nachtrag: Reichweite der Kettenstufen 2–4“, `logs/a5_schlag.csv`, `logs/kette_reichweite.csv` |

## Sprung

| Größe | Wert | Beleg |
|---|---|---|
| Ablauf | Aktion ab P+1, Absprung P+2, 40 Frames in der Luft, Aufsetzen P+42, 6 Frames Landung (nicht abbrechbar), handlungsfähig ab P+48 (≈ 0,8 s ab Druck) | notes.md „Nachtrag“, `logs/a7_sprung.csv` |
| Steighöhe | 51,25 px, Scheitel bei P+21 | wie oben |
| Anfangsgeschwindigkeit, Schwerkraft | 4,9375 px/Frame nach oben, 0,25 px/Frame² | wie oben |
| Horizontal | 2,25 px/Frame vor- oder rückwärts, festgelegt durch die Richtung im Frame des Sprungdrucks; Weite 92,25 px. In der Luft nicht steuerbar | wie oben |
| Tiefe in der Luft | 0,5 px/Frame, solange hoch oder runter gehalten wird (jederzeit in der Luft) | wie oben |
| Tastendauer | ohne Einfluss auf den Sprung | wie oben |

## Sprungangriff

A ist der Frame des Angriffsdrucks im Sprung, J der des Sprungdrucks.

| Größe | Wert | Beleg |
|---|---|---|
| Varianten | Neutral (Sprung ohne Richtung) und Richtung (Sprung mit links/rechts): je 7 LP und Umwerfen. Hoch im Frame des Sprungdrucks: 12 LP, Umwerfen, Treffer ab A+7. Runter mit dem Angriff: 4 LP ohne Umwerfen | notes.md „Nachtrag: Sprungangriff“, `logs/sprungangriff.csv` |
| Umwerfen | Der Gegner fliegt 135 px in Blickrichtung der Figur | wie oben (Workflow) |
| Aktive Frames | A+5 bis A+28, solange die Figur in der Luft ist; jeder Treffer verlängert um 7 Frames Trefferstopp. Mehrere Gegner pro Sprung möglich, jeder nur einmal | wie oben |
| Reichweite neutral | x von 27 px hinter bis 76 px vor der Figur, Tiefe ≤ 12 px, Figur höchstens 45 px hoch (am Scheitel des Sprungs trifft der Tritt nicht) | wie oben |
| Reichweite Richtung | x von 24 px hinter bis 99 px vor der Figur, Tiefe ≤ 12 px, Figur höchstens 41 px hoch | wie oben |
| Zeitfenster | Angriff ab J+1 (im selben Frame wie der Sprung: Spezialangriff). Ab A = J+38 kommt der Tritt nicht mehr zur Wirkung, bei der Landung gedrückt geht er verloren | wie oben (Workflow) |
| Dauer | Der Sprung dauert mit Angriff einen Frame länger (die Höhe steht in A+1 einmal still) | notes.md „Nachtrag: Sprung und Schlagreichweite“ |

## Griff und Wurf

E ist der Frame der Wurfeingabe. Werte gelten für die normalen Gegner der
ersten Stage (WOOKY, 30-LP-Gegner); andere Typen fliegen etwas anders weit
(siehe unten).

| Größe | Wert | Beleg |
|---|---|---|
| Griff auslösen | Die Figur läuft (Richtung gehalten) in den Gegner: Griff, wenn er höchstens 39 px vor ihr steht (Blick links: 38 px) und der Tiefenabstand höchstens 10 px beträgt. Ohne Eingabe, im Sprung und in der eigenen Trefferreaktion kein Griff | notes.md „Nachtrag: Griff und Würfe“, `logs/griff.csv` |
| Griff von hinten | Gegner hinter der Figur, der sie anschaut: bis 24 px. Schaut er weg: kein Griff | wie oben (Workflow) |
| Angriff am Griffbeginn | Ein Angriffsdruck einen Frame vor dem Griff gibt einen normalen Schlag (kein Griff), im Griff-Frame selbst geht er verloren | wie oben |
| Nach dem Losreißen | 30 Frames lang kein neuer Griff. Andere Gegner können die haltende Figur treffen, das beendet den Griff | wie oben (Workflow) |
| Eingabe | Im Griff Angriff plus Richtung. Enthält die Richtung die Blickrichtung (auch diagonal), wird der Gegner nach vorn geworfen, sonst (weg, hoch, runter) rückwärts über die Figur. Angriff ohne Richtung ist ein Kniestoß | notes.md „Nachtrag: Griff und Würfe“, `logs/wurf.csv` |
| Schaden Wurf | 14 LP in E+1, unabhängig von Zeitpunkt und vorherigen Kniestößen | wie oben |
| Ablauf Wurf | Figur gebunden E+1 bis E+37, handlungsfähig ab E+38, bewegt sich dabei nicht. Gegner losgelassen in E+22 (Höhe 59 px), erster Bodenkontakt E+59, liegt ab E+71 still | wie oben |
| Flugbahn | ab dem Loslassen x 5,0 px/Frame, jeden Frame um 1/16 px/Frame langsamer; Höhe +2,0 px/Frame, jeden Frame 13/64 px/Frame weniger (Scheitel 69,9 px). Nach dem ersten Bodenkontakt ein flacher Rückprall (bis 3,7 px hoch) | wie oben |
| Wurfweite | Der Gegner liegt 184–185 px von der Figur entfernt, vorwärts wie rückwärts. Andere Gegnertypen 181–197 px | wie oben |
| Haltedauer | 60 Frames ab dem Griff, dann reißt sich der Gegner los. Wurf frühestens im Frame nach dem Griff, spätestens im letzten Halteframe. Jeder Kniestoß startet die 60 Frames neu | wie oben |
| Kniestoß | 4 LP, Treffer K+5. Die nächste Eingabe wird ab K+18 angenommen, frühere verworfen (nicht gepuffert). Der dritte Kniestoß wirft den Gegner um (etwa 165 px) | wie oben |
| Sprung im Griff | lässt den Gegner ohne Schaden los, danach normaler Sprung | wie oben |
| Sprung + Angriff im Griff | Spezialangriff: Gegner 6 LP und umgeworfen (etwa 158 px), kostet die Figur 9 LP, handlungsfähig ab E+58 | wie oben |
| Geworfener Gegner | trifft andere Gegner auf seiner Bahn (3 LP, umgeworfen, auch mehrere), beim Tragen und im Flug bis zum ersten Bodenkontakt, bei Tiefenabstand ≤ 17 px. Seine eigene Bahn ändert sich nicht | wie oben |
| Grenzen | Der Bildschirmrand begrenzt die Wurfweite nicht, geworfene Gegner bleiben aber höchstens 96 px außerhalb des Bildes. Wände der Stage stoppen sie | wie oben |

## Umgeworfen werden

| Größe | Wert | Beleg |
|---|---|---|
| Auslöser | Normale Gegner packen und werfen die Figur nicht. Bestimmte Schläge (beim WOOKY meist der dritte einer Serie) werfen sie um, mit normalem Schaden | notes.md „Nachtrag: Griff und Würfe“, `logs/wurf.csv` (`wr_u_*`) |
| Flug | 8 Frames Stillstand nach dem Treffer, dann 2,875 px/Frame vom Angreifer weg, Startgeschwindigkeit nach oben 5,0 px/Frame, Schwerkraft 70/256 px/Frame² (Scheitel etwa 48 px). Erster Bodenkontakt nach 37 Frames Flug bei 109 px, liegt 135 px (selten 138 px) vom Ausgangspunkt entfernt | wie oben |
| Liegen | 121 Frames vom Umwerfen bis zum Aufstehen (≈ 2,0 s), danach 35 Frames Schutz | wie oben |
| Aufstehen beschleunigen | Tastendrücke (Angriff oder Sprung) beim Liegen verkürzen die Liegephase, sechs Drücke beenden sie. Schnelles Drücken: 88–93 statt 121 Frames | wie oben |

## Schaden der Gegner

| Größe | Wert | Beleg |
|---|---|---|
| Schwierigkeit (Rang) | Ein Rang von 7 bis 24 steuert Schaden und LP der Gegner. Start bei 9, +1 nach 409 Frames und danach alle 600 Frames (≈ 10 s), bis 24 (nach ≈ 2,5 min). Jeder Tod der Figur senkt ihn um 3 | notes.md „Nachtrag: Schaden der Gegner“, `logs/gegnerschaden.csv` |
| Fester Schaden | Die Gegner, die zu Beginn der Stage schon stehen, machen immer gleich viel: WOOKY 5, EDDY 6 LP je Treffer | wie oben |
| Schaden mit Rang | Später erscheinende Gegner: WOOKY 7 / 8 / 9 / 10 LP bei Rang 7 / 8–14 / 15–21 / 22–24; EDDY jeweils 1 mehr; SKIP mit Messer 7 bis 10, sein geworfenes Messer und sein Ausfallstich 10 bis 13. Der Wert wird beim Beginn des Angriffs festgelegt | wie oben (WOOKY Rang 7–12 und SKIP-Stich im Repo, Rest Workflow) |
| LP der Gegner mit Rang | Später erscheinende Gegner bekommen beim Erscheinen mehr LP: WOOKY 22 bis 34, EDDY 32 bis 42, SKIP 34 bis 46 | wie oben (Workflow) |
| Fernkampf und Boss | DICK: Pistole 5–7 je Schuss, Raketenwerfer 12–15. Boss DOLG: Schläge 9–12, Ansturm 12–17, Körperpresse 16–22, Griff und Wurf 16–22 (je nach Rang) | notes.md (Workflow) |
| Zustand der Figur | ändert den Schaden nicht (Stehen, Laufen, Angreifen, Springen, Halten, LP, Blickrichtung, Tiefe). Treffer in der Luft werfen immer um | wie oben (Workflow) |
| Tod | erst bei LP unter 0; mit genau 0 LP spielt die Figur weiter | wie oben (Workflow) |
| Gleichzeitiger Treffer | Wird der Schlag der Figur im selben Frame aktiv wie der Treffer des Gegners, gewinnt die Figur | wie oben (Workflow) |
| Reichweite der Gegnerschläge | WOOKY: Tiefenabstand bis 11 px. Gegen eine springende Figur treffen die Schläge bis zu deren Höhe von 48 px | wie oben (Workflow) |

## Unverwundbarkeit

| Größe | Wert | Beleg |
|---|---|---|
| nach erlittenem Treffer | 27 Frames (≈ 0,45 s), solange die Trefferreaktion läuft, unabhängig vom Schaden | notes.md „Messgrößen“, `logs/a5_schutz.csv` (`hurt`, `hurt_b`, `hurt_c`) |
| nach dem Aufstehen | 35 Frames (≈ 0,59 s), ab dem Aufstehen | wie oben, dazu der gekennzeichnete Eingriff `schutz_eingriff` |
| Liegen nach dem Umwerfen | 121–122 Frames (≈ 2,0 s) vom Umwerfen bis zum Aufstehen, durch Tastendrücke verkürzbar (siehe „Umgeworfen werden“) | notes.md „Messungen im Einzelnen“, „Nachtrag: Griff und Würfe“ |

Im Original sind in beiden Schutzfenstern keine LP-Verluste messbar, auch
wenn ein Gegner die ganze Zeit in Schlagdistanz steht. Ob dessen Angriffe
ins Leere gehen oder ob er gar nicht zuschlägt, ließ sich nicht trennen.
Für unser Spiel ist das eine Designentscheidung, die Wirkung (kein Schaden)
ist dieselbe.

## Lebenspunkte (Referenz für das Verhältnis zum Schaden)

| Größe | Wert | Beleg |
|---|---|---|
| Spielfigur | 72 LP | notes.md „Gefundene Adressen“ (`FFA9D0`) |
| erster Gegnertyp in Stage 1 („WOOKY“) | 16 LP (die zu Beginn stehenden; später erscheinende je nach Rang 22–34): eine volle Kette (3 + 4 + 5 + 10 = 22) besiegt ihn | notes.md, `logs/a5_schaden.csv` |
| zweiter Gegnertyp in Stage 1 (pink, „EDDY“) | 30 LP (später erscheinende 32–42): nach einer vollen Kette liegt er mit 8 LP | wie oben (`combo_c`) |

## Nicht übernommen (unsicher oder nicht gemessen)

- Mechanismus der Unverwundbarkeit (Treffer ignoriert oder Gegner wartet).
- Mindestabstand des Standardschlags (Treffer bis hinunter zu 41 px
  beobachtet).
- Reichweite der Sprungangriff-Varianten „hoch“ und „unten“.
- Blickrichtung links: Reichweite von Schlag und Sprungangriff vermutlich
  1 px kürzer (je eine Gegenprüfung; beim Griff gesichert: 38 statt 39 px).
- Richtung beim Kettendruck: Zum Gegner hin gehalten gibt es einen
  Ausfallschritt von etwa 20 px mit späterem Treffer, vom Gegner weg bricht
  die Kette ab (einzelne Läufe).
- Schaden des Roboters (schwankt auch bei gleichem Rang).
- Wurfweite der Boss-Würfe (DOLG in Stage 1 packt und wirft; der Schaden
  steht oben, die Weite nur aus einem Lauf).
- Reichweite des geworfenen Gegners als Geschoss (hängt vom Zieltyp ab).
- Spezialangriff ohne Griff (Angriff und Sprung gleichzeitig): kostet 9 LP,
  die Figur ist dabei etwa 50 Frames geschützt (Workflow); Schaden und
  Reichweite nicht gemessen. Werte der anderen Figuren (Mack: Abschlusstritt 8 statt 10; Würfe der anderen
  Figuren weichen ab).
