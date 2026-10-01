# Mechanik-Vorgaben für Comet Brawlers

Dieses Dokument legt Zahlenwerte für unser Spiel fest. Übernommen werden
nur Werte, die in der Captain-Commando-Analyse als **gesichert** gelten
(Belege in `research/captcomm/notes.md`). Zeitangaben gelten in Frames bei
der Bildrate des Originals: 59,637405 Hz laut `mame -listxml captcomm`
(MAME 0.264, 8 MHz Pixeltakt ÷ (512 × 262)). Referenzfigur für alle
Messungen ist Captain Commando.

Stand 2026-10-01: Werte aus Aufgabe 4 und 5 sowie aus dem Nachtrag
(Sprung, Schlagreichweite) übernommen.

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
| Kombo-Fenster | Der nächste Kettenschlag wird nur bei einem Druck in h+12 bis h+27 angenommen (16 Frames, ≈ 0,27 s). Drücke in h+1 bis h+11 werden verworfen, nicht gepuffert. Ein Druck ab h+28 beginnt eine neue Kette mit Stufe 1 | notes.md „Messungen im Einzelnen“, `logs/a5_schlag.csv` |

## Sprung

| Größe | Wert | Beleg |
|---|---|---|
| Ablauf | Aktion ab P+1, Absprung P+2, 40 Frames in der Luft, Aufsetzen P+42, 6 Frames Landung (nicht abbrechbar), handlungsfähig ab P+48 (≈ 0,8 s ab Druck) | notes.md „Nachtrag“, `logs/a7_sprung.csv` |
| Steighöhe | 51,25 px, Scheitel bei P+21 | wie oben |
| Anfangsgeschwindigkeit, Schwerkraft | 4,9375 px/Frame nach oben, 0,25 px/Frame² | wie oben |
| Horizontal | 2,25 px/Frame vor- oder rückwärts, festgelegt durch die Richtung im Frame des Sprungdrucks; Weite 92,25 px. In der Luft nicht steuerbar | wie oben |
| Tiefe in der Luft | 0,5 px/Frame, solange hoch oder runter gehalten wird (jederzeit in der Luft) | wie oben |
| Tastendauer | ohne Einfluss auf den Sprung | wie oben |
| Sprungangriff | hält die Höhe einen Frame lang an, der Sprung dauert dadurch einen Frame länger | wie oben |

## Unverwundbarkeit

| Größe | Wert | Beleg |
|---|---|---|
| nach erlittenem Treffer | 27 Frames (≈ 0,45 s), solange die Trefferreaktion läuft, unabhängig vom Schaden | notes.md „Messgrößen“, `logs/a5_schutz.csv` (`hurt`, `hurt_b`, `hurt_c`) |
| nach dem Aufstehen | 35 Frames (≈ 0,59 s), ab dem Aufstehen | wie oben, dazu der gekennzeichnete Eingriff `schutz_eingriff` |
| Liegen nach einem Wurf | 121–122 Frames (≈ 2,0 s) vom Wurf bis zum Aufstehen | notes.md „Messungen im Einzelnen“ |

Im Original sind in beiden Schutzfenstern keine LP-Verluste messbar, auch
wenn ein Gegner die ganze Zeit in Schlagdistanz steht. Ob dessen Angriffe
ins Leere gehen oder ob er gar nicht zuschlägt, ließ sich nicht trennen.
Für unser Spiel ist das eine Designentscheidung, die Wirkung (kein Schaden)
ist dieselbe.

## Lebenspunkte (Referenz für das Verhältnis zum Schaden)

| Größe | Wert | Beleg |
|---|---|---|
| Spielfigur | 72 LP | notes.md „Gefundene Adressen“ (`FFA9D0`) |
| erster Gegnertyp in Stage 1 („WOOKY“) | 16 LP: eine volle Kette (3 + 4 + 5 + 10 = 22) besiegt ihn | notes.md, `logs/a5_schaden.csv` |
| zweiter Gegnertyp in Stage 1 (pink) | 30 LP: nach einer vollen Kette liegt er mit 8 LP | wie oben (`combo_c`) |

## Nicht übernommen (unsicher oder nicht gemessen)

- Mechanismus der Unverwundbarkeit (Treffer ignoriert oder Gegner wartet).
- Reichweite der Kettenstufen 2–4 und des Sprungangriffs, Mindestabstand
  des Standardschlags (Treffer bis hinunter zu 41 px beobachtet).
- Schaden des Sprungangriffs.
- Schaden der Gegner gegen die Figur (5, 6, 8 beobachtet) ist noch keinem
  Gegnertyp sicher zugeordnet.
- Griffe und Würfe durch Gegner, Griff-Angriffe der Figur.
- Spezialattacke (in der Demo vermutlich 9 LP Kosten) und Werte der
  anderen Figuren (Mack: Abschlusstritt 8 statt 10).
