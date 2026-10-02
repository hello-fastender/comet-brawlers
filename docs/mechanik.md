# Mechanik-Vorgaben für Comet Brawlers

Dieses Dokument legt Zahlenwerte für unser Spiel fest. Übernommen werden
nur Werte, die in der Captain-Commando-Analyse als **gesichert** gelten
(Belege in `research/captcomm/notes.md`). Zeitangaben gelten in Frames bei
der Bildrate des Originals: 59,637405 Hz laut `mame -listxml captcomm`
(MAME 0.264, 8 MHz Pixeltakt ÷ (512 × 262)). Referenzfigur für alle
Messungen ist Captain Commando.

Stand 2026-10-02: Werte aus Aufgabe 4 und 5 sowie aus den Nachträgen
(Sprung, Schlagreichweite, Reichweite der Kettenstufen 2–4, Sprungangriff,
Griff und Würfe, Schaden der Gegner) übernommen. Neu am 2026-10-02
(Nachträge Trefferreaktion der Gegner, Verhalten der Nahkämpfer, Reichweite
der Gegnerangriffe, Spezialangriff, Sprint, Gegenstände und Waffen):
Abschnitte „Spezialangriff“, „Sprint“, „Trefferreaktion der Gegner“,
„Reichweite der Gegnerangriffe“, „Gegenstände und Waffen“ und der
Mechanismus unter „Unverwundbarkeit“. Diese Werte sind von einem Messagenten
und einem unabhängigen Gegenprüfer gemessen und per Skript im Repo belegt;
wo beide abwichen, hat eine dritte Messung eine gemeinsame Regel ergeben.
Werte mit „Workflow“ in der Belegspalte sind von mehreren Agenten unabhängig
gemessen und gegengeprüft, aber nicht mit einem Skript im Repo
nachvollziehbar (Kennzeichnung in notes.md).

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
| Richtungswechsel | ohne Verzögerung, auch beim Umdrehen (beim Gehen; aus dem Sprint gibt es 1 Frame Stand, siehe „Sprint“) | wie oben |

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
| Ablauf | Aktion ab P+1, Absprung P+2, 40 Frames in der Luft, Aufsetzen P+42, 6 Frames Landung (nicht abbrechbar durch Laufen oder Angriff; Angriff und Sprung zusammen in Landeframe 1 bis 5 starten einen neuen Sprung, siehe „Spezialangriff“), handlungsfähig ab P+48 (≈ 0,8 s ab Druck) | notes.md „Nachtrag“, `logs/a7_sprung.csv` |
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
| Umwerfen | Der Gegner fliegt 135 px (135,125 px vom Trefferort) in Blickrichtung der Figur; Ablauf wie unter „Trefferreaktion der Gegner“ | notes.md „Nachtrag: Trefferreaktion der Gegner“, `logs/reaktion.csv` (`b_sprung_*`), `logs/reaktion_v.csv` (`b_sprung_*`) |
| Aktive Frames | A+5 bis A+28, solange die Figur in der Luft ist; jeder Treffer verlängert um 7 Frames Trefferstopp. Mehrere Gegner pro Sprung möglich, jeder nur einmal | wie oben |
| Reichweite neutral | x von 27 px hinter bis 76 px vor der Figur, Tiefe ≤ 12 px, Figur höchstens 45 px hoch (am Scheitel des Sprungs trifft der Tritt nicht) | wie oben |
| Reichweite Richtung | x von 24 px hinter bis 99 px vor der Figur, Tiefe ≤ 12 px, Figur höchstens 41 px hoch | wie oben |
| Zeitfenster | Angriff ab J+1 (im selben Frame wie der Sprung: Spezialangriff). Ab A = J+38 kommt der Tritt nicht mehr zur Wirkung, bei der Landung gedrückt geht er verloren. Angriff und Sprung zusammen: in J+41 noch Sprungangriff, in der Landung siehe „Spezialangriff“ | wie oben (Workflow); Landung: notes.md „Nachtrag: Spezialangriff“ |
| Dauer | Der Sprung dauert mit Angriff einen Frame länger (die Höhe steht in A+1 einmal still) | notes.md „Nachtrag: Sprung und Schlagreichweite“ |

## Griff und Wurf

E ist der Frame der Wurfeingabe. Werte gelten für die normalen Gegner der
ersten Stage (WOOKY, 30-LP-Gegner); andere Typen fliegen etwas anders weit
(siehe unten).

| Größe | Wert | Beleg |
|---|---|---|
| Griff auslösen | Die Figur läuft (Richtung gehalten) in den Gegner: Griff, wenn er höchstens 39 px vor ihr steht (Blick links: 38 px) und der Tiefenabstand höchstens 10 px beträgt. Ohne Eingabe, im Sprung, im Sprint und in der eigenen Trefferreaktion kein Griff | notes.md „Nachtrag: Griff und Würfe“, `logs/griff.csv`; Sprint: notes.md „Nachtrag: Sprint“, `logs/sprint.csv` (`sg_*`) |
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
| Sprung + Angriff im Griff | Spezialangriff: Gegner 6 LP und umgeworfen (etwa 158 px), kostet die Figur 9 LP, handlungsfähig ab E+58. Ablauf, Schutz und LP-Untergrenze wie unter „Spezialangriff“ | wie oben |
| Geworfener Gegner | trifft andere Gegner auf seiner Bahn (3 LP, umgeworfen, auch mehrere), beim Tragen und im Flug bis zum ersten Bodenkontakt, bei Tiefenabstand ≤ 17 px. Seine eigene Bahn ändert sich nicht | wie oben |
| Grenzen | Der Bildschirmrand begrenzt die Wurfweite nicht, geworfene Gegner bleiben aber höchstens 96 px außerhalb des Bildes. Wände der Stage stoppen sie | wie oben |

## Spezialangriff

P ist hier der Frame, in dem Angriff und Sprung gedrückt sind, h der Frame
des ersten Treffers (LP des Gegners sinken), H ein Frame, in dem die Figur
selbst getroffen wird (sie verliert LP), J der Frame eines Sprungdrucks.
Stufe k (1 bis 6) ist ein Bild der wachsenden Trefferfläche. Werte für
Captain Commando; die anderen Figuren in der zweiten Tabelle.

| Größe | Wert | Beleg |
|---|---|---|
| Auslösung | Angriff und Sprung im selben Frame (ein Frame genügt), aus Stand, Lauf, Sprint oder Griff: Spezialangriff ab P+1, eine Laufbewegung stoppt sofort. Kommt die zweite Taste einen Frame später, gilt die erste: Angriff zuerst ergibt den Schlag, Sprung zuerst einen Sprung (mit dem Angriff dann ein Sprungangriff). Eine schon gehaltene Taste zählt nicht (es gilt die neu gedrückte); beide gehalten ergeben genau einen Spezialangriff | notes.md „Nachtrag: Spezialangriff“, `logs/spezial.csv` (`aus_*`), `logs/spezial_v.csv` (`spezial_v_aus_*`, `spezial_v_aj_*`, `spezial_v_ja_*`, `spezial_v_hA_s2`, `spezial_v_hJ_s2`, `spezial_v_hAJ_s2`, `spezial_v_lauf_*`); Sprint: `logs/sprint.csv` (`sp_spezial`); Griff: notes.md „Nachtrag: Griff und Würfe“ (`wr_a_spezial`) |
| Einschränkungen | Mit 0 LP gibt es nur den normalen Schlag. Wird die Figur im Frame des Drucks getroffen, kommt kein Spezialangriff. In der eigenen Trefferreaktion gehen Drücke in H+1 bis H+7 verloren (nicht gepuffert), ab H+8 startet er noch während der 27 Frames Reaktion. Nach einem Sprung: Druck in J+41 gibt noch den Sprungangriff, in J+42 bis J+46 (Landung) einen neuen normalen Sprung, in J+47 nichts, ab J+48 den Spezialangriff | wie oben (`lp_nat`, `lp_a0`, `sch_anf_a28`, `aus_reakt_*`, `aus_land_*`; `spezial_v_lp_nat`, `spezial_v_lp0_s2`, `spezial_v_htreff_*`, `spezial_v_reakt_*`, `spezial_v_land_*`) |
| Ablauf | 50 Frames (≈ 0,84 s, P+1 bis P+50), die Figur bewegt sich dabei nicht. Jedes Bild der Animation mit Treffer verlängert um 7 Frames Trefferstopp, gleichzeitige Treffer zählen einmal: ein Bild bis P+57, zwei bis P+64, drei bis P+71, vier bis P+78. Handlungsfähig im Frame nach dem Ende (ohne Treffer: ein Druck in P+51 wirkt ab P+52, einer in P+50 geht verloren); Laufen bewegt ab dem zweiten Frame danach (P+52, mit einem Treffer P+59) | wie oben (`ab_*`, `sd_*`; `spezial_v_ab_*`, `spezial_v_viele_*`, `spezial_v_mehr_t`) |
| Schutz | Während der ganzen Aktion geschützt wie in der Trefferreaktion, ab P+1 (Gegnerangriffe in P+1 bis P+3 bleiben ohne Wirkung). Danach 20 Frames Schutz-Timer (`FFAA69` startet mit 20, wie nach dem Aufstehen mit 35), obwohl die Figur schon handeln kann. Verwundbar ab P+71 (mit einem Treffer ab P+78): zusammen 70 Frames (≈ 1,17 s) | wie oben (`sch_anf_*`, `sch_ende_*`; `spezial_v_anf_*`, `spezial_v_sch_*`; Ende per EINGRIFF auf Höhe bzw. Lage des Gegners und auf den Timer) |
| Aktive Frames und Fläche | P+8 bis P+43 (36 Frames, ohne Trefferstopp gezählt; jeder Trefferstopp verschiebt die folgenden Frames um 7). Die Fläche wächst in sechs Stufen zu je 6 Frames (Stufe k ab P+2+6k) um je 16 px: vor der Figur bis 43 + 16·(k−1) px (43, 59, 75, 91, 107, 123), hinter ihr bis 42 + 16·(k−1) px (42 bis 122); 1 px weiter kein Treffer in dieser Stufe. Die Fläche ist voll: Nahe Gegner werden in jeder Stufe getroffen. Tiefe ≤ 28 px, nie ab 29 px, vorn wie hinten. Gilt für gehende oder stehende Gegner | wie oben (`rx_*`, `fen_*`, `rz_*`, `sd_*`, `d3_rx_*`; `spezial_v_rx_*`, `spezial_v_fen_*`, `spezial_v_voll_*`, `spezial_v_rz_*`), EINGRIFF auf die Gegnerlage, natürlich gegengeprüft |
| Schaden und Umwerfen | 6 LP je Gegner (WOOKY und EDDY gleich), jeder Treffer wirft um. Der Gegner fliegt 135,125 px vom Trefferort, immer von der Figur weg: vor ihr nach vorn, hinter ihr nach hinten. Beliebig viele Gegner (bis fünf beobachtet), jeder nur einmal | wie oben (`aus_gleich_*`, `sd_*`; `spezial_v_viele_*`, `spezial_v_flug_*`) |
| Kosten | 9 LP einmal je Spezialangriff, nur wenn er etwas trifft (Gegner oder Gegenstand), abgezogen in h+8. Ohne Treffer kostenlos | wie oben (`aus_gleich_k`, `sd_drei_stufen`, `sd_kiste_*`, `ab_leer_*`; `spezial_v_aus_c_1f`, `spezial_v_viele_p5`, `spezial_v_beh_*`) |
| LP-Untergrenze | Die Kosten senken die LP höchstens auf 0 (auch bei 1 bis 9 LP). Die Figur stirbt dadurch nicht und spielt mit 0 LP weiter; erst ein Gegnertreffer bringt sie unter 0 (siehe „Schaden der Gegner“, Tod). Mit 0 LP gibt es keinen Spezialangriff mehr | wie oben (`lp_nat`, `lp_a*`, `lp_b*`; `spezial_v_lp_nat`, `spezial_v_lp9_c`, `spezial_v_lp5_c`, `spezial_v_lp12_c`, `spezial_v_lp2_t`) |

### Unterschiede der vier Helden

Bei allen vier beginnt der Spezialangriff in P+1; sie sind während der
Aktion geschützt, machen 6 LP Schaden, werfen um, treffen mehrere Gegner
bei einmal 9 LP Kosten und senken die eigenen LP höchstens auf 0. Die
Bedingungen der Auslösung (Landung, Trefferreaktion, gehaltene Tasten)
sind nur beim Captain gemessen.

| Größe | Captain | Mack | Ginzu | Baby Head | Beleg |
|---|---|---|---|---|---|
| Dauer ohne Treffer | 50 Frames | 60 | 41 | 46 | notes.md „Nachtrag: Spezialangriff“, `logs/spezial.csv` (`h<k>_*`), `logs/spezial_v.csv` (`spezial_v_f<k>_*`) |
| Treffer verlängern | um 7 Frames je Bild | um 7 Frames je Bild | nein | nein | wie oben |
| Laufen bewegt danach ab | P+52 | P+62 | P+43 | P+48 | wie oben, dazu `d3_lauf_*` |
| Bewegung währenddessen | keine | mit gehaltener Richtung (links, rechts) ab dem Frame nach dem Richtungsdruck, frühestens P+2, bis P+60: 2,0 px/Frame | keine | keine | wie oben (`h0_leer`, `d3_lauf_0_l`, `d3_lauf_0_vor`; `spezial_v_f0_lauf*`, `spezial_v_f0_kontakt_lauf`) |
| Trefferart | wachsende Fläche, P+8 bis P+43 (siehe oben) | trifft einen Gegner in Reichweite sofort in P+1 (wie lange die Fläche danach aktiv bleibt, ist nicht übernommen) | Explosionen an festen Stellen, ohne Trefferstopp. Ein Gegner (Tiefe 0) wird von der ersten getroffen, die ihn erreicht: P+4 bei 62 bis 139 px vor der Figur, P+8 bei 22 bis 61 px (dazu 1 bis 2 px hinter ihr), P+16 von 21 px vor bis 48 px hinter ihr, P+28 bei 51 bis 66 px und P+32 bei 68 bis 74 px hinter ihr | wie Ginzu, 11 Frames später (P+15, P+19, P+27, P+39, P+43) | wie oben (`h<k>_x_*`, `d3_zone_*`; `spezial_v_g<k>_*`) |
| x-Reichweite vorn / hinten | 123 / 122 px | 94 / 93 px | 139 / 74 px | 139 / 74 px | wie oben |
| Tiefe | ≤ 28 px | ≤ 28 px | je Explosion verschieden (nicht übernommen) | wie Ginzu | wie oben |
| Kosten | 9 LP in h+8 | 9 LP in h+8 | 9 LP in h+1 | 9 LP in h+1 | wie oben |
| Schutz-Timer danach | 20 Frames | 20 Frames | 20 Frames | 20 Frames | wie oben (Wirkung des Timers nur beim Captain gemessen) |

## Sprint

D2 ist der Frame des zweiten Richtungsdrucks, Sprintframe n der n-te Frame
des Sprints (Sprintframe 1 = D2+1). A ist der Frame des Angriffsdrucks im
Sprint bzw. im Sprintsprung, J der des Sprungdrucks im Sprint.
Geschwindigkeiten in px/Frame.

| Größe | Wert | Beleg |
|---|---|---|
| Auslösen | Doppeltipp derselben Richtung (auch diagonal): erster Druck 1 bis 10 Frames, Pause 1 bis 10 Frames, den zweiten Druck halten. 11 Frames Druck oder 11 Frames Pause ergeben normales Gehen. Kommt beim zweiten Druck eine weitere Richtung dazu (rechts, dann rechts+hoch), gibt es keinen Sprint | notes.md „Nachtrag: Sprint“, `logs/sprint.csv` (`ew_*`), `logs/sprint_v.csv` (`sprint_v_ew_*`) |
| Dauer | Sprintframe 1 = D2+1; der Sprint läuft, solange die Richtung gehalten wird, höchstens 90 Frames. Loslassen beendet ihn im Frame danach, ohne Auslaufen. Nach 90 Frames 1 Frame Stand, dann Gehen, wenn die Richtung weiter gehalten ist | wie oben (`ew_h*`, `ri_r`, `ri_r_b`, `rw_neu_gehalten`; `sprint_v_ew_h*`, `sprint_v_ri_r_s2`) |
| Neuer Sprint | nur mit neuem Doppeltipp, direkt nach dem Ende möglich; die über das Ende gehaltene Richtung gibt nur Gehen | wie oben (`rw_neu*`; `sprint_v_rw_neu`) |
| Tempo x | Sprintframe 1: 1,75 (Gehtempo), Sprintframes 2–6: 3,875, danach alle 6 Frames 0,125 weniger bis 2,125 in den Sprintframes 85–90 (ab Sprintframe 2: 3,875 − 0,125 · ⌊(n−1)/6⌋). Weg in 90 Frames 267,875 px. Links gleich (gemessen bis zum Bildrand, etwa 51 Sprintframes) | wie oben (`ri_r`, `ri_r_b`, `ri_l`; `sprint_v_ri_r_s2`, `sprint_v_ri_l_c`) |
| Tempo Tiefe | Sprintframe 1: 1,0, danach das 0,625-fache des x-Tempos (2,421875, alle 6 Frames 0,078125 weniger). Gemessen bis Sprintframe 41 (1,953125); weiter reichte die freie Tiefe in keinem Lauf | wie oben (`ri_h`, `ri_u`; `sprint_v_ri_u_s2`, `sprint_v_ri_d_s2`) |
| Tempo diagonal | Sprintframe 1: x 1,25 und Tiefe 0,75, danach x 2,90625 (0,75 × 3,875) und Tiefe 1,75586, alle 6 Frames x 0,09375 und Tiefe 0,05664 weniger. Im Original ein Fehler: nach rechts in den Sprintframes 7–12 x 4,8125 statt 2,8125 (12 px mehr Weg), nach links nicht | wie oben (`ri_rh`, `ri_ru`, `ri_lh`, `ri_lu`; `sprint_v_di_*`) |
| Rand der Tiefe | Dort stoppt nur die Bewegung; der Sprint selbst läuft weiter, bis die Richtung losgelassen wird bzw. bis D2+90 | wie oben (`ri_h`, `ri_u`, `d3_tief_a`, `d3_tief_b`; `sprint_v_ri_band`) |
| Lenken und Abbrechen | Hoch oder runter dazunehmen macht den Sprint diagonal, der Tempoplan läuft weiter; loslassen macht ihn wieder gerade. Nur noch hoch oder Gegenrichtung: Sprint endet, 1 Frame Stand, dann Gehen in die neue Richtung | wie oben (`rw_links`, `rw_hoch`, `rw_nur_hoch`; `sprint_v_rw_links`, `sprint_v_rw_dazu`, `sprint_v_rw_nur_hoch`) |
| Kein Griff | Im Sprint läuft die Figur durch Gegner hindurch, ohne zu greifen. Nach dem Ende des Sprints greift sie beim Gehen wieder | wie oben (`sg_*`; `sprint_v_sg_*`) |
| Spezialangriff aus dem Sprint | Angriff und Sprung: Spezialangriff ab P+1, der Sprint endet sofort (siehe „Spezialangriff“) | wie oben (`sp_spezial`; `sprint_v_sp_spezial`, `sprint_v_sp_spezial_c`) |
| Sprintangriff: Ablauf | Angriff im Sprint: Aktion ab A+1, ohne Treffer bis A+35 (Gehen bewegt ab A+37), mit Treffer 7 Frames länger (Gehen ab A+44) | wie oben (`sa_leer*`, `sa_nat_*`; `sprint_v_sa_leer*`, `sprint_v_sa_nat_*`) |
| Sprintangriff: Treffer | aktiv A+5 bis A+14 (10 Frames). 9 LP, wirft um (Flug 135,125 px). Reichweite (im ersten aktiven Frame A+5 gemessen) 26 px hinter bis 105 px vor der Figur, Tiefe ≤ 12 px. Trifft alle Gegner auf dem Weg, jeden einmal, und schiebt keinen mit | wie oben (`sa_fen_*`, `sa_x_*`, `sa_z_*`, `sa_zwei_*`, `sa_nat_*`; `sprint_v_sa_fen_*`, `sprint_v_sa_x_*`, `sprint_v_sa_z_*`, `sprint_v_sa_viele*`), EINGRIFF auf die Gegnerlage, natürlich gegengeprüft |
| Sprintangriff: Rutschen | Ist die Richtung im Frame A noch gedrückt, steht die Figur in A+1 und rutscht ab A+2 mit dem letzten Sprinttempo weiter, jeden Frame 0,15625 px/Frame langsamer bis 0, z. B. 50 px ab 3,875, 43,875 px ab 3,625, 32,8125 px ab 3,125. Danach darf die Richtung losgelassen werden. Zuletzt in A−1 gedrückt: Sprintangriff ohne Rutschen; zuletzt in A−2: normaler Schlag | wie oben (`sa_leer*`, `d3_rut_*`; `sprint_v_sa_los_*`, `sprint_v_sa_leer2_los`) |
| Sprintsprung | Sprung im Sprint: gleiche Flugbahn wie der normale Sprung nach vorn (2,25 px/Frame, 92,25 px in 41 Frames, Steighöhe 51,25 px, handlungsfähig ab J+48); das Sprinttempo geht verloren | wie oben (`sj_*`, `d3_sj_*`; `sprint_v_sj_*`) |
| Sprint-Sprungangriff | Angriff im Sprintsprung: 13 LP, wirft um. Trifft Gegner am Boden in A+13 (ein Frame, nur bei höchstens 16 px Figurhöhe, bei 20 px nicht) und von A+20 bis A+39 (Figur höchstens 20 px hoch), auch nach der Landung, bei spätem Angriff sogar, wenn die Figur schon wieder geht. In A+20 reicht er 38 bis 147 px vor die Figur, nicht nach hinten, Tiefe ≤ 12 px; danach ändert sich die Reichweite (siehe „Nicht übernommen“) | wie oben (`sja_*`, `d3_sja13_*`, `d3_sjax_*`; `sprint_v_sja_*`), EINGRIFF auf die Gegnerlage, Schaden natürlich gegengeprüft |

## Trefferreaktion der Gegner

Gemessen an den beiden Gegnertypen der ersten Stage (WOOKY, EDDY). h ist der
Frame, in dem der Treffer die LP des Gegners senkt, D der Frame des
Kettendrucks, E der der Wurfeingabe. Neu in diesem Abschnitt: **K** ist der
Frame des umwerfenden Treffers (beim Wurf E+1; nicht der Kniestoß aus „Griff
und Wurf“), **G** der erste Frame, in dem der Gegner nach dem Aufstehen wieder
handeln kann, **t** der Frame, in dem seine LP unter 0 fallen.

| Größe | Wert | Beleg |
|---|---|---|
| Dauer der Trefferreaktion (Stufen 1–3) | 23 Frames (h bis h+22, ≈ 0,39 s), gleich für jede Stufe und beide Gegnertypen, auch wenn der Treffer ein Ausholen unterbricht. Ab h+23 ist der Gegner frei: In Schlagdistanz steht er ab h+24 still, sonst geht er ab h+24 weiter | notes.md „Nachtrag: Trefferreaktion der Gegner“, `logs/reaktion.csv` (`a_s1_*`, `a_s2_*`, `a_s3_*`), `logs/reaktion_v.csv` (`a_w_*`, `a_e_*`) |
| Rückstoß | keiner: Der Gegner zittert in h+9 bis h+14 um +3, −3, +2, −2, +1, −1 px (erster Ausschlag in Blickrichtung der Figur) und steht danach wieder am selben Ort; die Tiefe bleibt | wie oben (`a_links_*`; `a_w_links`, `a_e_links`) |
| Erneuter Treffer | Ein Treffer in der laufenden Reaktion startet sie neu: wieder 23 Frames ab dem neuen Treffer. Der Gegner ist in der Reaktion nicht geschützt. Ein Treffer nach ihrem Ende startet eine neue Reaktion | wie oben (`a3_*`, `a4_frueh_*`; `a_w_neu`, `a_e_neu`, `a_w_spaet`) |
| Angriff nach der Reaktion | Ausholen 21 Frames nach Erreichen der Standpose, also frühestens in h+45 (≈ 0,75 s); muss der Gegner erst herangehen, entsprechend später. Schlag aktiv beim WOOKY 4 Frames (schneller Schlag) oder 9 Frames (langsamer Schlag) nach dem Ausholen, also frühestens h+49 bzw. h+54; beim EDDY 9 oder 10 Frames danach (frühestens h+54) | wie oben (`a_s1_*`, `dr_a4_*`; `a_w_stand`, `a_w_kette`, `a_e_stand`) |
| Kette und Trefferreaktion | Bis zum Kettendruck in h+20 (Stufe 2 und Tritt) bzw. h+19 (Stufe 3) trifft die Folgestufe den Gegner, ohne dass er dazwischen frei ist (spätestens in h+23, dem Frame, in dem er frei würde). Beim spätesten Druck (Stufe 2: h+27, Stufe 3 und Tritt: h+26) ist er vor dem nächsten aktiven Frame 7 Frames frei (h+23 bis h+29, vor dem Tritt 6 Frames). Die Kette hält trotzdem: In dieser Zeit steht er oder geht heran, ausholen kann er erst in h+45 | wie oben (`a4_spaet_*`, `a4_grenze19_*`, `a4_grenze20_*`; `a_w_spaet`, `a_e_spaet`, `k_w_19`, `k_w_20`, `k_e_20`, `k_e_s3_19`) |
| Umwerfen: Flug nach Tritt und Sprungangriff | K+1 bis K+8 Stillstand, ab K+9 x 2,875 px/Frame in Blickrichtung der Figur, Höhe +5,0 px/Frame, Schwerkraft 70/256 px/Frame² (Scheitel K+27 bei 48,24 px). Erster Bodenkontakt K+46 nach 109,25 px, flacher Rückprall, Ruhe ab K+55 bei 135,125 px vom Ort des Treffers. Die Tiefe bleibt. Dieselbe Bahn wie bei der Figur („Umgeworfen werden“) | wie oben (`b_tritt_*`, `b_sprung_*`; `b_tritt_w`, `b_sprung_*`, `a_e_kette`) |
| Umwerfen: Flug nach dem dritten Kniestoß | wie nach dem Tritt, aber aus 16 px Höhe: Scheitel K+27 bei 64,24 px, Bodenkontakt K+49 nach 117,875 px, Ruhe ab K+58 bei 143,75 px vom Ort des Treffers (nicht von der Figur aus gemessen wie die etwa 165 px in „Griff und Wurf“). Nach einem Wurf gilt die Bahn aus „Griff und Wurf“ (Ruhe ab E+71) | wie oben (`b_knie_*`, `b_wurf_*`) |
| Liegen | ab der Ruhe: WOOKY 32 Frames (nach einem Wurf 16), EDDY wechselnd 16 bis 44 Frames (Vielfache von 4) | wie oben (`b_*`, `dr_b_*`) |
| Aufstehen | 18 Frames. Frei ab G = Ruhe + Liegen + 18: WOOKY K+105 nach Tritt oder Sprungangriff (≈ 1,8 s), K+108 nach dem Kniestoß, K+104 nach dem Wurf; EDDY K+89 bis K+117 nach Tritt oder Sprungangriff. Danach geht der Gegner sofort wieder (Bewegung ab G+1) | wie oben |
| Verwundbarkeit beim Umwerfen | von K bis G−1 (Flug, Liegen, Aufstehen) kein Schaden. Ab G sofort verwundbar, ohne Schutzfenster nach dem Aufstehen (die Figur hat 35 Frames). Greifen ab G, nach einem Wurf ab G+1 | wie oben (`bp_*`, `bn_*`, `bg_*`) |
| Mehrere Gegner | Ein Schlag trifft mehrere Gegner (gemessen: zwei) im selben Frame, jeden mit dem vollen Schaden der Stufe. Der Trefferstopp der Figur kommt nur einmal (7 Frames), die Kombostufe zählt je Schlag, das Kombo-Fenster bleibt gleich, die Gegner reagieren synchron | wie oben (`c_*`) |
| Tod | Fallen die LP unter 0 (t), wirft jeder Treffer um, auch Stufe 1 und 3. Flug ab t+3 mit der Bahn des Umwerfens, Bodenkontakt t+40, Ruhe t+49, Slot frei (Gegner entfernt) nach 79 Frames (≈ 1,3 s). Nach einem tödlichen Treffer der Stufe 2 rollt der Gegner nach dem Bodenkontakt 32 Frames mit 2 px/Frame weiter und ist (ohne Wand im Weg) nach 111 Frames entfernt (≈ 1,9 s), nach einem tödlichen Wurf nach 101 Frames (≈ 1,7 s). Der sterbende Gegner nimmt keine Treffer an und trifft die Figur nicht, auch wenn er im ersten aktiven Frame seines Schlags stirbt | wie oben (`d_*`, `dr_d_*`) |

## Umgeworfen werden

| Größe | Wert | Beleg |
|---|---|---|
| Auslöser | Normale Gegner packen und werfen die Figur nicht. Bestimmte Schläge (Umwerfschläge, siehe „Reichweite der Gegnerangriffe“; beim WOOKY nach 2 bis 13 normalen Angriffen, meist 2 bis 5) werfen sie um, mit normalem Schaden | notes.md „Nachtrag: Griff und Würfe“, `logs/wurf.csv` (`wr_u_*`) |
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
| Tod | erst bei LP unter 0; mit genau 0 LP spielt die Figur weiter. Die Kosten des Spezialangriffs senken die LP höchstens auf 0 | wie oben (Workflow); mit Skript bestätigt: notes.md „Nachtrag: Spezialangriff“, `logs/spezial.csv` (`lp_nat`, `lp_a*`), `logs/spezial_v.csv` (`spezial_v_lp_nat`) |
| Gleichzeitiger Treffer | Wird der Schlag der Figur im selben Frame aktiv wie der Treffer des Gegners, gewinnt die Figur | wie oben (Workflow) |
| Reichweite der Gegnerschläge | siehe „Reichweite der Gegnerangriffe“: WOOKY und EDDY bei Tiefenabstand −10 bis +11 px (Figur 10 px weiter hinten bzw. 11 px weiter vorn), gegen eine springende Figur bis zu deren Höhe von 48 px | notes.md „Nachtrag: Reichweite der Gegnerangriffe“, `logs/greichweite.csv`, `logs/greichweite_v.csv` |

## Reichweite der Gegnerangriffe

Werte gelten für die normalen Gegner der ersten Stage (WOOKY, EDDY, SKIP)
gegen die passive Figur. Neue Symbole in diesem Abschnitt:

- **A** ist der erste Frame der Angriffsanimation des Gegners. Startup s
  heißt: erster aktiver Frame A+s. Ein Treffer fällt in den ersten aktiven
  Frame, in dem die Figur in Reichweite steht.
- **d** ist der Abstand der Figur vor dem Gegner in x (negativ: hinter
  ihm), **dz** der Tiefenabstand (positiv: Figur weiter vorn). Positionen
  ganzzahlig am Ende des Frames.
- **Z** ist der Zielabstand, den sich WOOKY und EDDY für einen Angriff
  merken (Abstand der Figur vor dem Gegner, höchstens 48 px). Zielpunkt =
  Stelle im Abstand Z vor dem Gegner.
- **Nachlauf** zählt die Frames zwischen dem letzten aktiven Frame und dem
  ersten Frame mit Stand oder Gehen (beide nicht mitgezählt). Er enthält
  einen festen Rückzug und eine Wartepose, deren Länge das Spiel wählt.

| Größe | Wert | Beleg |
|---|---|---|
| Angriffsbereich (WOOKY, EDDY) | Ab A+1 bis zum Ende der aktiven Frames bricht der Gegner ab, ohne zu treffen, und geht nach, sobald die Figur mehr als 31 bis 32 px vom Zielpunkt abweicht (genau: höchstens 32 px links und 31 px rechts davon) oder in der Tiefe mehr als 10 px hinter bzw. 11 px vor ihm steht (dz −10 bis +11). Sonst trifft der Angriff in seinem ersten aktiven Frame, wenn die Figur vor ihm oder höchstens 3 bis 4 px hinter ihm steht (Figur schaut von ihm weg). Nach vorn reicht die Trefferfläche mindestens bis an den Rand dieses Fensters | notes.md „Nachtrag: Reichweite der Gegnerangriffe“, `logs/greichweite.csv` (Teil 2 `ziel`; `W3*`, `E3*`), `logs/greichweite_v.csv` (Teil 5 `fenster`) |
| Höhe (WOOKY, EDDY) | Die Schläge treffen eine Figur bis 48 px Höhe. Liegt sie in der ganzen aktiven Phase bei 49 bis 51 px, treffen sie nicht. Jeder Treffer in der Luft wirft um | wie oben (`WS1L_j*`, `ES1L_j*`, `*_h48`, `*_h49`) |
| Trefferstopp | Trifft WOOKY oder EDDY, bleibt die aktive Pose 7 Frames länger. Ausnahme: Wirft ein Treffer des WOOKY die Figur um (Umwerfschläge, jeder Treffer in der Luft), endet die aktive Pose 7 Frames nach dem Treffer; nach den Umwerfschlägen geht er sofort nach. SKIP hat keinen Trefferstopp | wie oben |
| Schaden | wie unter „Schaden der Gegner“ (WOOKY 5, EDDY 6 bei den Gegnern vom Stage-Beginn); SKIP bei Rang 12: Messerstich 8, Ausfallstich 11 | wie oben (`SMSL`, `SASR`) |
| WOOKY Schlag A | Startup 9, aktiv A+9 bis A+13, wirft nicht um. Nachlauf 12 bis 36 Frames ohne Treffer, 16 bis 36 mit Treffer (darin 5 Frames Rückzug) | wie oben (`WS1*`, `W3S1*`, `lang_*`, `lang3_*`) |
| WOOKY Schlag B (schnell) | Startup 4, aktiv A+4 bis A+13, wirft nicht um. Nachlauf 7 bis 18 Frames ohne, 11 bis 18 mit Treffer (kein Rückzug) | wie oben (`WS2*`, `W3S2*`) |
| WOOKY Schlag C | Startup 10, aktiv A+10 bis A+17, wirft nicht um. Nachlauf 16 bis 40 Frames ohne, 21 bis 40 mit Treffer (darin 8 Frames Rückzug) | wie oben (`WS3*`, `W3S3R`) |
| WOOKY Umwerfschlag A | Startup 9, aktiv A+9 bis A+13, wirft um. Nach einem Treffer geht er sofort nach (Nachlauf 0), ohne Treffer 30 bis 36 Frames (darin 5 Frames Rückzug) | wie oben (`WK1*`, `W3K1R`) |
| WOOKY Umwerfschlag B | Startup 8, aktiv A+8 bis A+17, wirft um. Kommt nur direkt aus der Wartepose nach Schlag A. Nach einem Treffer sofort Gehen, ohne Treffer Nachlauf 14 bis 31 Frames | wie oben (`WK2*`, `W3K2*`) |
| EDDY Schlag A | Startup 9, aktiv A+9 bis A+13, wirft nicht um. Nachlauf 17 bis 36 Frames mit und ohne Treffer (darin 5 Frames Rückzug) | wie oben (`ES1*`, `E3S1*`) |
| EDDY Schlag B | Startup 10, aktiv A+10 bis A+17, wirft nicht um. Nachlauf 20 bis 41 Frames ohne, 20 bis 39 mit Treffer (darin 8 Frames Rückzug) | wie oben (`ES2*`, `E3S2*`) |
| EDDY Umwerfschlag | Startup 9, aktiv A+9 bis A+13, wirft um. Nachlauf ohne Treffer 30 bis 36 Frames, mit Treffer 5 bis 33 (meist 5 bis 8, dann Gehen) | wie oben (`EK2*`, `E3K2L`) |
| EDDY Sprungtritt | Startup 9. Der EDDY steigt bis 52 bis 53 px und fliegt ab A+5 mit 3 px/Frame auf die Figur zu, aktiv A+9 bis A+45 in der Luft, bricht nie ab, wirft um. Trifft in A+9 von d 0 bis 59 (Blick rechts: −1 bis 58), Tiefe ±12 px, ab 13 nie. Nachlauf ohne Treffer meist 1 Frame (selten 28), mit Treffer 1 bis 33 | wie oben (`EK1*`, `p_ek1_*`) |
| SKIP Messerstich | Startup 13, aktiv A+13 bis A+16, wirft nicht um, bricht nie ab. Trifft von 15 px hinter bis 108 px vor ihm (Blick links, Figur schaut bei Angriffsbeginn von ihm weg) bzw. bis 8 px hinter ihm (Blick rechts, Figur schaut zu ihm); andere Blickrichtungen der Figur siehe „Nicht übernommen“. Tiefe ±12 px (ab 13 nie), Figur bis 71 px hoch. Danach 8 Frames Rückzug, dann Gehen oder 11 bis 12 Frames Pause und der nächste Stich; aufeinanderfolgende Stiche alle 37 bis 49 Frames | wie oben (`SMSL`, `SMSR`, `p_sm_l2_*`, `p_sm_r_*`) |
| SKIP Ausfallstich | Startup 14, aktiv A+14 bis A+16, wirft um, bricht nie ab. Trifft bei d 0 und nach vorn mindestens 56 px weit; schaut die Figur bei Angriffsbeginn zu ihm, trifft er sie 10 px hinter ihm nicht (andere Blickrichtung der Figur siehe „Nicht übernommen“). Tiefe 12 px, wenn die Figur weiter vorn steht (13 nie) | wie oben (`SASR`, `p_sa_r_*`) |
| SKIP mit Wirbel | Beide Stiche gibt es auch mit Wirbel davor. Getroffen wird nur im Stich (A+13 bzw. A+14), Schaden und Umwerfen wie ohne Wirbel | wie oben (`SMWL_*`, `p_smw_l_*`, `p_sw_r_*`) |
| Folge | Vor einem Umwerfangriff stehen beim WOOKY 2 bis 13 normale Angriffe (meist 2 bis 5), beim EDDY 0 bis 10, beim SKIP 0 bis 8. Eine feste Reihenfolge gibt es nicht | wie oben (Teil 1b, 1c; `greichweite_v.csv` Teil 3) |

## Unverwundbarkeit

| Größe | Wert | Beleg |
|---|---|---|
| nach erlittenem Treffer | 27 Frames (≈ 0,45 s), solange die Trefferreaktion läuft, unabhängig vom Schaden | notes.md „Messgrößen“, `logs/a5_schutz.csv` (`hurt`, `hurt_b`, `hurt_c`) |
| nach dem Aufstehen | 35 Frames (≈ 0,59 s), ab dem Aufstehen | wie oben, dazu der gekennzeichnete Eingriff `schutz_eingriff` |
| nach dem Spezialangriff | während der ganzen Aktion und danach 20 Frames Schutz-Timer `FFAA69`: verwundbar ab P+71, zusammen 70 Frames (≈ 1,17 s), siehe „Spezialangriff“ | notes.md „Nachtrag: Spezialangriff“, `logs/spezial.csv`, `logs/spezial_v.csv` |
| Mechanismus | Die Gegner greifen auch während der Schutzfenster nach Treffer und Aufstehen an, ihre Treffer werden ignoriert (kein LP-Verlust). Nach dem Aufstehen beginnt in den meisten Fenstern, in denen ein Gegner in Reichweite steht, ein Angriff im Fenster (43 von 47 bzw. 24 von 31 in zwei Messungen), mit aktiven Frames im Fenster in 42 bzw. 23. Nach einem Treffer seltener: 46 von 333 bzw. 63 von 193 Fenstern mit Gegner in Reichweite mit Angriffsbeginn, 29 bzw. 50 mit aktiven Frames | notes.md „Nachtrag: Verhalten der Nahkämpfer“, `logs/verhalten.csv` (Zusammenfassung „schutz“ der Läufe mit passiver Figur `a_*`, `akt_*`, `r_*`, `c_*`; Einzelfenster unter `schutz`), `logs/verhalten_v.csv` (`schutz`: `v_p_*`, `v_e_*`) |
| Liegen nach dem Umwerfen | 121–122 Frames (≈ 2,0 s) vom Umwerfen bis zum Aufstehen, durch Tastendrücke verkürzbar (siehe „Umgeworfen werden“) | notes.md „Messungen im Einzelnen“, „Nachtrag: Griff und Würfe“ |

Im Original nehmen die Gegner auf den Schutz keine Rücksicht: Sie greifen in
den Schutzfenstern nach Treffer und Aufstehen an, und ihre aktiven
Angriffsframes liegen oft im Fenster. Die Treffer werden ignoriert, LP
verliert die Figur dort nie. Mehrfach trifft ein Gegner genau im ersten
Frame nach dem Fenster (in zwei Messungen 12 bzw. 4 Mal nach dem Aufstehen,
14 bzw. 17 Mal nach einem Treffer). Stehen mehrere Gegner dicht um die
geschützte Figur, sind selten drei oder vier Angriffe zugleich aktiv
(höchstens 0,3 % der Frames mit mindestens drei Gegnern), auch sie ohne
Wirkung. Für unser Spiel heißt das: Der Schutz macht Treffer wirkungslos,
die Gegner warten nicht darauf, dass er endet. Auch während des
Spezialangriffs sind Gegnerangriffe nachweislich aktiv und bleiben ohne
Wirkung („Nachtrag: Spezialangriff“).

## Lebenspunkte (Referenz für das Verhältnis zum Schaden)

| Größe | Wert | Beleg |
|---|---|---|
| Spielfigur | 72 LP | notes.md „Gefundene Adressen“ (`FFA9D0`) |
| erster Gegnertyp in Stage 1 („WOOKY“) | 16 LP (die zu Beginn stehenden; später erscheinende je nach Rang 22–34): eine volle Kette (3 + 4 + 5 + 10 = 22) besiegt ihn | notes.md, `logs/a5_schaden.csv` |
| zweiter Gegnertyp in Stage 1 (pink, „EDDY“) | 30 LP (später erscheinende 32–42): nach einer vollen Kette liegt er mit 8 LP | wie oben (`combo_c`) |

## Gegenstände und Waffen

L ist der Frame, in dem ein Gegenstand landet. K ist der Frame des
Kniestoß-Drucks, E der der Wurfeingabe (wie in „Griff und Wurf“).
Abstände „vor“ und „hinter“ der Figur zählen in ihrer Blickrichtung, als
x-Abstand der Positionen. Wo die Blickrichtung etwas ändert, steht sie
dabei. Munition zählt Schüsse, beim Hammer Ladungen. Reichweiten und
Schaden gelten gegen den ersten Gegnertyp von Stage 1 (WOOKY), soweit
nicht anders genannt. Andere Gegnertypen können andere Reichweiten haben
(siehe Hammer).

### Aufnehmen

| Größe | Wert | Beleg |
|---|---|---|
| Aufnehmen | Die Angriffstaste nimmt auf, wenn die Figur am Boden in Reichweite eines Gegenstands steht. Darüberlaufen nimmt nichts auf. Im Sprung gibt die Taste den Sprungangriff, erst nach der Landung nimmt sie auf. Wirkung in P+1, die Aufnahme dauert 7 Frames (P+1 bis P+7), handlungsfähig ab P+8 | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv` (`item_f_*`, Abschnitt `aufnahme`), `logs/item_v.csv` (`item_v_mn_*`, `item_v_sprung`) |
| Aufnahmebereich | Tiefenabstand ≤ 12 px. In x je nach Gegenstand und Blickrichtung. Hinter der Figur: bis 20 px (Laser), 28 px (Raketenwerfer), 34 px (Hammer), bei Blick links je 1 px mehr. Vor der Figur bei Blick rechts: bis 22 px (Kirschen), 29 px (Laser, Brathähnchen), 35 px (Hammer). Vor der Figur bei Blick links: bis 28 px (Laser), 36 px (Raketenwerfer), 42 px (Hammer) | wie oben (`item_nah_*`, `item_d_nah_*`, `item_v_mn_*`, `item_v_sw_*`, `item_v_huhn_dx*`, `item_v_e_s7c_r*`) |
| Mit Waffe in der Hand | Essen wird gegessen, die Waffe bleibt. Eine zweite Waffe ersetzt die erste: Die alte fällt mit ihrer Restmunition zu Boden und liegt wieder 700 Frames | wie oben (`item_a_tausch`, `item_v_s7h_auf`) |

### Essen und Heilwerte

| Größe | Wert | Beleg |
|---|---|---|
| Heilwerte | Brathähnchen heilt voll (auf 72 LP), TENDON +55 LP, Essen 0x24 +40 LP, Kirschen (CHERRY) +16 LP, Essen 0x2A +12 LP; nie über 72 LP. Die Namen von 0x24 und 0x2A sind im Original nicht ermittelt | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv` (`item_f_essen*`, `item_k_*_lp*`), `logs/item_v.csv` (`item_v_huhn_lp*`, `item_v_e_*`) |
| Essen bei vollen LP | Bei 72 LP gibt Essen Punkte statt LP: Brathähnchen 1000, TENDON 800, 0x24 500, Kirschen 100, 0x2A 100. Unter 72 LP gibt es nie Punkte | wie oben |
| SHURIKEN | Captain Commando kann ihn nicht als Waffe nutzen, das Aufnehmen gibt 300 Punkte | wie oben (`item_k_*_0e_w`, `item_v_e_s3s_*`) |

### Lebensdauer

| Größe | Wert | Beleg |
|---|---|---|
| Liegezeit Waffen | 700 Frames ab der Landung L, dann Blinken, verschwunden in L+792. Aus einem Behälter erscheinen sie im Frame nach dem Treffer und landen 48 Frames später, sind also 840 Frames im Bild | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv` (`item_a_liegen`), `logs/item_v.csv` (`item_v_liegen`) |
| Liegezeit Essen | läuft nicht ab | wie oben |
| Scrollen | Gegenstände verschwinden, sobald sie 163 px oder mehr links vom linken Bildrand liegen, Behälter erst ab 195 bis 196 px | wie oben (`item_f_scroll`, `item_v_scroll`) |
| Stage-Ende | Liegende Gegenstände verschwinden etwa 480 Frames nach dem Sieg über den Boss | wie oben (`item_bot1`, Bot `item_v_b1`) |
| Waffe verlieren | Ein Treffer gegen die Figur lässt die Waffe fallen. Sie liegt mit ihrer Restmunition und neuer Liegezeit (700 Frames) und kann wieder aufgenommen werden | wie oben (`item_f_verlust`, `item_v_mis_auf`) |
| Munition leer | Die Waffe wird 11 Frames nach dem letzten Abschuss (P+18) bzw. im Frame nach dem Aktionsende weggeworfen und ist nach 61 Frames verschwunden. Sie kann nicht wieder aufgenommen werden | wie oben (`item_f_waffe`, `item_v_mis_leer`) |

### Waffen allgemein

| Größe | Wert | Beleg |
|---|---|---|
| Angriff mit Waffe | Jeder Angriffsdruck ist ein Waffeneinsatz, es gibt keine Schlagkette. Die Kombostufe bleibt unverändert | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv`, `logs/item_v.csv` |
| Sprung, Griff und Wurf mit Waffe | wie ohne Waffe: Sprungangriff (ohne Munition), Griff durch Hineinlaufen, Kniestoß 4 LP in K+5, Wurf 14 LP in E+1. Waffe und Munition bleiben | wie oben (`item_w_sprung*`, `item_d_griff*`, `item_v_griff_*`) |
| Gegner außerhalb des Bildes | Rakete und Laser treffen keine Gegner, die 448 px oder mehr rechts vom linken Bildrand stehen (64 px rechts außerhalb des Bildes). Dort sind Gegner deaktiviert | wie oben (`item_las_a16_x192`, `item_v_mz_r215`) |

### Waffen je Art

| Größe | Wert | Beleg |
|---|---|---|
| Raketenwerfer | 3 Schuss, Aktion 17 Frames (P+1 bis P+17). Die Rakete erscheint in P+7 58 px vor der Figur in 50 px Höhe, fliegt mit 5,0 px/Frame und sinkt. Frei fliegend schlägt sie in P+28 163 px vor der Figur ein, an Wänden, Behältern und am Bildrand früher. Im Flug trifft sie nicht | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv` (`item_f_waffe`, `item_d_misfrei`), `logs/item_v.csv` (`item_v_mis_*`) |
| Raketenwerfer, Explosion | 8 LP, wirft um, trifft mehrere Gegner, Tiefenabstand ≤ 28 px. Frei fliegend 15 Frames aktiv (P+28 bis P+42) und in x von 66 bis 67 px vor dem Einschlagpunkt bis etwa 90 px dahinter, also ab 97 px vor der Figur (Blick links 96 px). Bei früherem Einschlag an einer Wand weicht der Bereich davon ab (siehe „Nicht übernommen“) | wie oben (`item_mis_*`, `item_d_mis_*`, `item_v_mz_*`) |
| Laser | 4 Schuss, jeder Schuss kostet einen, auch ohne Treffer. Aktion 25 Frames. Der Strahl beginnt in P+7 62 px vor der Figur in 52 px Höhe und wächst mit 16 px/Frame: Ein Gegner im Abstand d ab etwa 100 px wird etwa in P+7 + (d − 62)/16 getroffen (±1 Frame). Er reicht mindestens 245 px weit. 6 LP, wirft um, Tiefenabstand ≤ 12 px. Überlebt der erste getroffene Gegner, endet der Strahl an ihm | wie oben (`item_a_laser`, `item_las_*`, `item_d_las_*`, `item_v_lz_*`) |
| Hammer | 6 Ladungen, nur Treffer verbrauchen eine. Aktion 19 Frames, mit Treffer 26 (7 Frames Trefferstopp). Trifft in P+13 mit 8 LP, ohne Umwerfen (normale Trefferreaktion), auch mehrere Gegner, Tiefenabstand ≤ 12 px. Reichweite je Gegnertyp: WOOKY 27 bis 124 px vor der Figur (Blick links 26 bis 147 px), MUSASHI 20 bis 143 px bei beiden Blickrichtungen | wie oben (`item_a_hammer`, `item_ham_*`, `item_d_ham_*`, `item_v_hz_*`) |
| GUN | 5 Schuss, Aktion 17 Frames. Kugel in P+7 48 px vor der Figur, 54 px hoch, 8 px/Frame. 6 LP, wirft um | wie oben (`item_k_s7_00_w`, `item_v_gun_*`, `item_v_gz_*`) |
| M-GUN | 5 Salven zu je 4 Kugeln (P+7, P+12, P+17, P+22), 74 px vor der Figur, 54 px hoch, 10 px/Frame. Aktion 37 Frames. 8 LP je Kugel (gemessen gegen EDDY, SASUKE und Typ `0x6C660`), wirft um | wie oben (`item_k_s7_04_w`, `item_d_mgun_*`, `item_v_mg_*`) |

### Behälter

| Größe | Wert | Beleg |
|---|---|---|
| Ölfass | zerbricht beim ersten Treffer (Schlag, Sprungtritt, Rakete, auch Angriffe von Gegnern). Der Inhalt erscheint im Frame danach am Ort des Fasses, springt bis 35 px hoch und landet 49 bis 50 Frames nach dem Treffer. In Stage 1 enthält ein Fass einen Raketenwerfer, das andere ein Brathähnchen | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv` (`item_f_*`), `logs/item_v.csv` (`item_v_fass*`, `item_v_mech`) |
| Geldkassetten | In der Bossarena von Stage 1 zerschlägt der Boss beim Erwachen alle drei im selben Frame, ausgelöst durch die Ankunft der Figur. Die drei Waffen darin landen 48 bis 49 Frames später; welche es sind, hängt vom bisherigen Spielverlauf ab | wie oben (`item_a_liegen`, `item_v_kiste_*`) |

### Punkte

| Größe | Wert | Beleg |
|---|---|---|
| Kette | 10, 20, 30, 40 Punkte für Stufe 1 bis 4, im Frame nach dem Treffer. Kniestoß (mit Waffe gemessen) 20 | notes.md „Nachtrag: Gegenstände und Waffen“, `logs/item.csv` (`item_bot1`, `item_d_griffknie`), `logs/item_v.csv` (`item_v_kette`) |
| Besiegte Gegner | insgesamt WOOKY 80, EDDY 100 (unabhängig von der Kettenstufe), CAROL und BRENDA 700, Mech 800. MARDIA 900 plus die Punkte des tödlichen Kettenschlags (910 bis 940) | wie oben (`item_bot*`, `item_d_kill_*`, Bot `item_v_b*`) |
| Bosse | DOLG 2000, Boss von Stage 6 5000, von Stage 8 8000, jeweils fest. Stage 3 4000 und Stage 4 5000, jeweils plus die Punkte des tödlichen Treffers. Am Stage-Ende gibt es keinen Bonus | wie oben (`item_d_kill_dolg*`, Bot `item_v_b*`) |
| Sonstige | Treffer auf ein Ölfass 10 (Zerbrechen 0), Glasscheibe 500, Waffe aufnehmen 0. Jede Kugel der M-GUN gibt je nach Gegnertyp 10 oder 40 (EDDY 40) | wie oben (`item_f_*`, `item_d_mgun_*`, `item_v_fass*`, `item_v_mg_r*`) |

## Nicht übernommen (unsicher oder nicht gemessen)

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
- Werte der anderen Figuren in Kette und Würfen (Mack: Abschlusstritt 8 statt
  10; Würfe der anderen Figuren weichen ab).

Aus den Nachträgen vom 2026-10-02 (unsicher oder nur einmal gemessen; Werte
aller Messungen im jeweiligen Nachtrag in notes.md):

**Spezialangriff**

- Spezialangriff, Höhe des Gegners: Gegner in der Luft wurden bis 53 px Höhe
  getroffen, ab 54 nicht, bei dx 100 einmal auch bei 54 (nur Messagent,
  Gegner per Eingriff hochgehalten; Gegenprüfer nicht gemessen).
- Spezialangriff, Pose des Gegners: Die Trefferfläche hängt von seiner
  Animation ab (gesichert nur der WOOKY in Ausholpose in Stufe 3 vorn bis 76
  statt 75 px); Messagent traf den WOOKY in seinem Schlag in Stufe 3 bis 78
  px, Gegenprüfer einen ausholenden WOOKY hinter der Figur erst in P+14
  statt P+8 und einen WOOKY in Aktion 0x02 in Stufe 5 gar nicht.
- Spezialangriff gegen einen Gegner, der schon in der Luft ist: Er fliegt
  weiter (Gegenprüfer: EDDY in 9 px Höhe 146,625 statt 135,125 px; Messagent
  nicht gemessen).
- Schaden des Spezialangriffs an Behältern: 6 LP (Gegenprüfer: 777 → 771;
  Messagent nicht gemessen); die Kosten von 9 LP bei Treffern auf
  Gegenstände sind gesichert.
- Spezialangriff aus einem Leerschlag: Ein Druck 7 oder 8 Frames nach dem
  Schlagdruck startet ihn im nächsten Frame (nur Messagent; Gegenprüfer
  nicht gemessen). Der Lauf mit Druck 2 Frames danach (kein Spezialangriff)
  zählt nicht: Dort war die Angriffstaste seit dem Schlag ununterbrochen
  gedrückt. Die Grenze vor 7 Frames ist offen.
- Zweiter Spezialangriff direkt im Anschluss (Druck in P+51): Der
  Schutzstatus endet schon in P+70, danach läuft die Aktion bis P+101 ohne
  Timer (Messagent; der Gegenprüfer-Lauf `spezial_v_ab_aj71` zeigt dasselbe,
  ausgewertet hat Gegenprüfer es nicht), ob die Figur dort verwundbar ist,
  ist offen.
- Mack im Spezialangriff in der Tiefe (1,25 px/Frame) und diagonal (1,5 und
  0,90625 px/Frame): nur in der dritten Messung mit je einem Lauf (Messagent
  und Gegenprüfer nicht gemessen); nach oben und ob seine Trefferfläche
  mitwandert, ist nicht gemessen.
- Aktive Frames von Macks Spezialangriff: Treffer meist in P+1, bei
  Messagent einmal in P+6 (dx −93), bei Gegenprüfer ein zweiter Gegner in
  P+32; einzelne Frames sind nicht geprüft.
- Tiefe der Explosionen von Ginzu und Baby Head: je Explosion verschieden
  (Messagent: vorn bis mindestens 28, hinten bis mindestens 43 px bei dx
  100; Gegenprüfer: bei dx 0 Tiefe +29 in P+20 und −29 nie, bei dx 100 +29
  in P+12 und −29 in P+8; dritte Messung: in Tiefe 16 eine weitere Explosion
  in P+12 bei dx 38 bis 40, in Tiefe 29 eine in P+20 bei dx −4 bis 4).
- Explosionen von Ginzu und Baby Head nach zerschlagenen Kisten: Die Kisten
  belegen danach Objekt-Slots, einige Explosionen fehlten (Messagent,
  Erkundung; im Belegskript trafen `h2_drei` und `h3_drei` einen Gegner bei
  40 px hinter der Figur erst in P+24 bzw. P+35 statt in P+16 bzw. P+27;
  Gegenprüfer nicht gemessen).
- Grenzen zwischen den Explosionsbereichen von Ginzu und Baby Head bei 49/50
  und 67 px hinter der Figur (nicht geprobt).
- Abweichende Flugweiten in einzelnen natürlichen Läufen (Messagent
  `lp_nat`: +96,125, +133,125 und −138 px; Gegenprüfer `flug_e_ueber`: ein
  WOOKY +69,125 px), Ursache nicht ausgewertet.
- Wirkung der 20 Frames Schutz-Timer nach dem Spezialangriff bei Mack, Ginzu
  und Baby Head (nur der Timer ist gemessen, seine Wirkung nur beim
  Captain).
- Spezialangriff gegen Bosse, schwerere und liegende Gegner (nicht gemessen).

**Sprint**

- Reichweite des Sprint-Sprungangriffs nach A+20: Sie wächst bis etwa A+30
  und nimmt dann ab, die Werte widersprechen sich aber (Gegenprüfer: A+30
  EDDY bis 175, WOOKY bis 162 und 164 nie, A+39 EDDY bis 162; dritte Messung
  mit beiden Gegnern gleich: A+30 bis 172–174, A+39 bis 140 und 150 nie; die
  erste Messung hatte nur A+21). Auch die nahe Grenze in A+30 weicht ab
  (Gegenprüfer 37 nie, dritte Messung 34 ja).
- Sprintangriff gegen einen Gegner genau über der Figur: Bei dx −4 traf er
  erst in A+9 statt A+5 (nur Messagent; Gegenprüfer nicht gemessen).
- Flug eines vom Sprint-Sprungangriff getroffenen Gegners: Er fällt auf der
  Stelle, statt wegzufliegen (nur Gegenprüfer, ohne Eingriff; Messagent
  nicht ausgewertet).
- Tempo des Sprints in der Tiefe nach Sprintframe 41 (jeder Lauf erreichte
  vorher den Rand), Reichweite des Sprint-Sprungangriffs in A+13 (Treffer
  bei dx 38 bis 96 beobachtet), genaue Höhengrenze des Sprint-Sprungangriffs
  (zwischen 16 und 20 px in A+13, zwischen 20 und 24 px ab A+20), Wirkung
  gegen Gegner in der Luft sowie Sprint und Sprintangriffe der anderen
  Figuren (nicht gemessen).

**Trefferreaktion der Gegner**

- Wahl zwischen schnellem und langsamem Schlag des WOOKY nach einer
  Trefferreaktion (aktiv h+49 bzw. h+54): Die erste Messung sah nur den
  schnellen. Die Gegenprüfung sah sechsmal den schnellen und zweimal den
  langsamen (nach drei Treffern mit Pausen, aber auch einmal nach einem
  einzelnen Treffer), die dritte Messung sechsmal den schnellen und dreimal
  den langsamen (nach drei Treffern mit Pausen). Die Regel ist unbekannt.
- Liegedauer des EDDY im Einzelfall: Messagent 20, 36 und 40, Gegenprüfer
  16, 40 und 44, dritte Messung 20, 36 und 40 Frames, auch bei gleicher
  Umwerfart verschieden (vermutlich zufällig).
- Gelegentliche Pause des EDDY nach dem Aufstehen (85 Frames Aktion 0x1C
  ohne Bewegung): beim Messagenten in 1 von 6 Fällen, beim Gegenprüfer und
  in der dritten Messung in 0 von je 8.
- Tod durch Stufe 2 an einer Wand: Das Rollen endet früher und der Gegner
  ist nach 93 statt 111 Frames entfernt (ein Lauf der dritten Messung;
  Gegenprüfer ohne Wand 111 Frames).
- Reichweite gegen einen Gegner, der nach einem Rückwärtswurf in G noch
  abgewandt ist: Messagent trifft bei dx −50 in G, Gegenprüfer bei −47 in G,
  bei −61 und −74 erst in G+1; die Grenze ist nicht gemessen.
- Trefferreaktion bei Treffern von hinten und bei anderen Gegnertypen (SKIP,
  DICK) sowie der Tod durch den Kniestoß sind nicht gemessen.

**Verhalten der Nahkämpfer**

- Angriffe je 1000 Frames der Nahkämpfer: kein fester Wert, die Rate fällt
  mit der Laufzeit und der Zahl der Gegner (EDDY allein: Messagent 8,0–8,5,
  Gegenprüfer 7,3 in den ersten 3000 Frames und 3,5–5,0 danach, dritte
  Messung 5,6–7,3; bei wiederholtem Springen 3,0–5,0, 0,8–3,2 bzw. 2,0–4,7).
- Pause des EDDY zwischen zwei Angriffsserien: die Spanne 45–2237 Frames ist
  gesichert, der Median nicht (Messagent 149, Gegenprüfer 404 bzw. 293,
  dritte Messung 221 Frames).
- Länge einer Angriffsserie bis zum Umwerfen: meist 3 Angriffe, die
  Obergrenze weicht je Messung ab (erste Messung bis 6 Angriffe, Gegenprüfer
  bis 5 normale Angriffe vor dem Umwerf-Angriff, dritte Messung beim WOOKY
  bis 10).
- Zeit, bis ein Gegner nach einem Tiefenschritt der Figur wieder angreift:
  9–314 Frames bis zur Kampfhaltung (Median 93), 29–506 Frames bis zum
  nächsten Angriff (Median 144) bzw. 29–127 Frames in drei Messungen; in 7
  von 20 Läufen der dritten Messung kein Angriff binnen 500 Frames.
- Weglaufen nach rechts, wenn der Gegner links steht: Der WOOKY folgt
  180–337 Gehframes mit 1,88 px/Frame (Messagent) bzw. 80–86 von 100 Frames
  mit 1,72–1,76 px/Frame (Gegenprüfer), der EDDY bleibt in beiden zurück
  (wenige Fälle).
- Pause vor dem Angriff bei Rang 24 (5 Frames): nur eine Messung; die Formel
  29 − 4·⌊Rang/4⌋ ist für Rang 7–23 gesichert.
- Ablauf der einzelnen Gegnerangriffe beim WOOKY und EDDY (erster aktiver
  Frame 4–10 Frames nach dem Beginn, aktive Frames ohne Treffer 5–10,
  Sprungknie 37, mit Treffer meist 7 Frames länger; Erholung 12–31 Frames),
  Dauer von Spott und Abwarten (Raster 30 Frames) und Gehbefehle zu 40
  Frames: nur vom Messagenten gemessen; Startup und aktive Frames ohne
  Treffer decken sich mit „Reichweite der Gegnerangriffe“.
- Wahl der Angriffsart, der Gehstufe und zwischen Spott und Abwarten: nur
  Häufigkeiten belegt, die Anteile weichen ab (erster Angriff des EDDY ein
  Sprungknie in 35 % beim Messagenten, 20 % beim Gegenprüfer).

**Reichweite der Gegnerangriffe**

- Treffer des EDDY-Sprungtritts in seinem letzten aktiven Frame A+45: Der
  Messagent traf die Figur bei 30 px noch in A+45 (ab A+46 nicht), der
  Gegenprüfer konnte Treffer nur bis A+42 nachweisen (danach Bildrand).
- Sprungtritt gegen eine Figur knapp außerhalb seiner Reichweite in A+9 (60
  px vor dem EDDY, bei Blick rechts 59 px): Der Messagent misst den Treffer
  in A+41, der Gegenprüfer in A+10; beide liegen im ersten Frame nach dem
  Ende des jeweiligen Eingriffs, der Unterschied kommt also vermutlich von
  der Methode.
- Reichweite des SKIP bei anderen Blickrichtungen der Figur (nur
  Gegenprüfer; der Messagent hat je Angriff und Blickrichtung des SKIP nur
  eine Blickrichtung der Figur gemessen). Messerstich, Blick links, Figur
  schaut bei Angriffsbeginn zum SKIP: hinten 7 statt 15 px, vorn mindestens
  116 statt 108 px. Blick rechts: vorn bis 115 px (116 nicht; Figur schaut
  zum SKIP) bzw. 110 px (112 nicht; schaut weg). Ausfallstich, Figur schaut
  weg: hinten bis 16 px (18 nicht), vorn mindestens 100 px (110 nicht).
  Tiefe des Ausfallstichs nach hinten 12 px (13 nie).
- Reichweite nach hinten, wenn die Figur zum Gegner schaut: In der dritten
  Messung traf der EDDY-Umwerfschlag die Figur 6 px hinter dem EDDY (ein
  Fall); Messagent und Gegenprüfer haben nur Figuren gemessen, die
  wegschauen (3 bis 4 px).
- Wie WOOKY und EDDY den Zielabstand Z wählen: meist der Abstand bei
  Angriffsbeginn, auf 48 px begrenzt (Messagent und Gegenprüfer), aber
  einmal 32 bei 44 px (Gegenprüfer) und einmal 3 bei per Eingriff gehaltenen
  25 px (dritte Messung); wann das Spiel ihn setzt, ist nicht gemessen.
- Reichweite von SKIP-Messerwurf und DICK (Pistole, Rakete): nicht gemessen
  (Messerwurf kam nicht vor, DICK schoss auf die passive Figur nicht).

**Gegenstände und Waffen**

- Aufnahmebereich des Raketenwerfers vor der Figur bei Blick rechts: 37 px
  beim Gegenprüfer, 35 px in der dritten Messung (die 18 px der ersten
  Messung waren ein Artefakt).
- Größte Reichweite des Lasers: Der Messagent maß Treffer bis 310 px (Blick
  links) und 287 px (Blick rechts), der Gegenprüfer bis 350 px (Stage 5),
  die dritte Messung traf bei 245 px, aber nicht mehr bei 275 px. Übernommen
  ist nur „mindestens 245 px“.
- Laser, wenn der erste Gegner im Strahl stirbt: Beim Gegenprüfer traf der
  Strahl auch den zweiten (Stage 5), in der dritten Messung nur den ersten.
- Untere Grenze und Nahbereich des Lasers: Treffer ab 52 px vor der Figur
  (Blick links 51 px), bis 90 px schon in P+7, also früher als nach der
  Formel; nur vom Messagenten gemessen, beim Gegenprüfer nicht prüfbar.
- Raketenwerfer bei Einschlag an der Arenawand der Bossarena von Stage 1:
  Einschlag nach 19 Frames und 92 px (150 px vor der Figur, P+26) statt 21
  Frames und 105 px; die Explosion trifft dort schon ab 60 px vor der Figur.
  Gemessen vom Messagenten, vom Gegenprüfer nur in Erklärungsläufen gesehen
  (dort mit 25 statt 15 aktiven Frames).
- Ende der aktiven Frames des Hammers (P+18): nur vom Messagenten gemessen,
  der Gegenprüfer hat es nicht geprüft.
- Lebensdauer der GUN-Kugel: 32 Frames (rund 300 px) beim Messagenten, beim
  Gegenprüfer wegen der Wände nicht erreichbar (längster Flug 25 Frames).
- Aktive Frames je M-GUN-Kugel: 14 beim Messagenten (auch in der dritten
  Messung), beim Gegenprüfer nur 10 bis zur Wand.
- Art 0x0C, eine Waffe mit 5 Schuss: nur beim Gegenprüfer gefunden, Name
  offen.
- Punkte für Waffentreffer außer M-GUN: Hammer 10, Laser und Raketenwerfer
  20 oder 40, GUN 40 oder 20 bei beiden Agenten, aber ohne erkennbare Regel
  und mit per Eingriff gesetzten Ziel-LP.
- Punkte für SKIP: Grundwert 250 oder 300, jeweils plus Punkte des tödlichen
  Treffers; wann welcher gilt, ist offen. Beide Grundwerte kommen beim
  Messagenten (260–290 und 310, 320), beim Gegenprüfer (260–290 und 320,
  330) und in der dritten Messung (260–290 und 340) vor, auch nach
  Kettenschlägen.
- Punkte der Bosse von Stage 2 (3000), Stage 5 (6000), Stage 7 (7000 plus
  10) und des Endbosses (15000): jeweils nur eine Messung (Stage 5 zwar bei
  beiden Agenten, aber im selben Bot-Lauf).
- Liegezeit in der Zeitlupe nach dem Bosstod halb so schnell und
  Verschwinden der Gegenstände beim Kamerasprung in Stage 8: nur vom
  Gegenprüfer beobachtet.
