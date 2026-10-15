# Vela in 3D (Versuch)

Stand 2026-10-15. Neben dem gemalten Weg (fünfzehn Video-Clips, `docs/godot.md`, „Gemalte Vela“) gibt es einen zweiten Weg: Vela als
3D-Modell mit Textur und Skelett, das im 2D-Spiel von der Seite gezeichnet wird. Das Modell ist ein realistisches Comic-Modell nach einem
Foto (Tripo), die Bewegungen sind Tripo-Animationen (Presets und KI-Animation nach Text). Der Weg ist ein Versuch: Er ist spielbar,
ersetzt die gemalte Vela aber noch nicht.

## Stand

- Start mit `godot --path godot -- --dreid` (oder `foto.gd`/`vela_belege.sh` mit `--dreid`). Ohne `--dreid` ändert sich nichts.
- Abgedeckt (3D-Clip vorhanden): Stand, Gehen, Sprint, Kette 1 bis 4, Sprung und Landung, Treffer, Umwerfen (Flug), Liegen, Aufstehen.
- Nicht abgedeckt: Griff, Wurf, Sprungtritt, Kniestoß, Spezialangriff, Sprintangriff, Waffe, Aufnehmen, Neueinstieg, Treffer von hinten.
  Dort greift der übliche Rückfall: gemalte Clips, Puppe, Platzhalter (`spiel.gd`, `_puppeAktualisieren`).
- Die Logik bleibt unverändert Taktgeber (`f.aktion`, `f.uhr`); die Darstellung liest nur.

## Vom Foto zum Spiel

1. **Bild**: Tripo „GPT Image 2.5“ aus einem Foto (Gesicht und Haar nur vom Foto, Kleidung nur im Text). Realistisches Comic, volle
   Figur, weißer Grund.
2. **Modell**: Image → 3D mit Smart-Mesh (P1.0), Quad, etwa 12 000 Polygone, Textur 2k (8k nicht nötig und 16-mal so teuer im Speicher).
3. **Skelett**: Tripo-Rigging mit der Voreinstellung Mixamo (65 Knochen, `mixamorig_*`).
4. **Animationen**: Presets von Tripo (Boxen 1 bis 3, Frontkick, Laufen, Gehen) und KI-Animation nach Text (Sprung, Treffer, Hinfallen,
   Aufstehen, Kampfhaltung; Prompts unten).
5. **Export**: je Animation eine FBX-Datei mit Mixamo-Voreinstellung, Skelett an, Animation „an Ort und Stelle“ an. Eine GLB-Datei enthält
   keine Animation; wählt man mehrere Animationen für eine Datei, entsteht ein einziger Clip, in dem die letzte gewinnt.
6. **Bauen**: `werkzeuge/dreid_bauen.gd` macht daraus die Dateien unter `godot/grafik/vela_3d/` (siehe unten).
7. **Spiel**: `DarstellungVela3D` (Node) zeigt die Pose; `DarstellungVela3DTabelle` ordnet Aktion und Uhr einem Clip und einer Zeit zu.

Die Quelldateien (rund 10 MB je FBX, 8k-Texturen eingebettet) liegen nicht im Repo; das Manifest `werkzeuge/dreid_clips.json` nennt für
jeden Clip die Quelle (Rollenname = Dateiname ohne `.fbx` im Ordner `--quelle`) und die Ereigniszeiten in Sekunden der Quelle.

## Dateien im Spiel (`godot/grafik/vela_3d/`)

| Datei | Inhalt |
|---|---|
| `vela.glb` | Modell mit 2048-Textur, geriggt, ohne Animation (3,5 MB), zur Laufzeit geladen (`GLTFDocument`), nicht vom Editor importiert (`.gdignore`) |
| `animationen.res` | `AnimationLibrary` mit zwölf Clips, 60 Schlüsselbilder je Sekunde, Hüfte waagrecht auf der Ruheposition (0,7 MB) |
| `clips/<name>.txt` | Clipdaten im Format der `clip.txt` der gemalten Clips (`DarstellungVelaFramesTabelle.clip_lesen`), Zeiteinheit 1/240 s statt Bildnummern (`fps=240`) |

Die Tabelle der gemalten Clips (`DarstellungVelaFramesTabelle`: welche Aktion welchen Clip zeigt, welches Bild zu welcher Uhr gehört, Blick)
gilt unverändert; weil die Clipdaten dasselbe Format haben, rechnet sie mit den 3D-Clips genauso, nur ist der „Bildindex“ eine Zeit in 1/240 s
(`DarstellungVela3DTabelle.zeit`). Alle Schlag-, Treffer-, Flug-, Sprung- und Aufstehregeln der Tabelle bleiben damit eine Quelle.

## Zuordnung der Clips

| Clip im Spiel | Quelle (Tripo) | Ereignisse (Sekunden der Quelle) |
|---|---|---|
| `stand` | Pose aus Boxen 3 bei 0 s, dazu die kleinen Bewegungen der KI-Kampfhaltung (x1,5), Schleife hin und her | |
| `gehen`, `sprint` | Laufen (`run_001`), ein Doppelschritt 0 bis 0,625 s | Schrittlänge 89 Spielpixel, Zyklus 51 Ticks bei Gehtempo (gemessen) |
| `kette1` | Boxen 1 (Jab) | ausholen 0,29, kontakt 0,604, rueckzug 0,625, ruhe 1,667 |
| `kette2` | Boxen 2, 1,5 bis 2,04 s (gerader Schlag mit der rechten) | 1,667, 1,79, 1,833, 2,0 |
| `kette3` | Boxen 3 (Jab mit Schritt) | 0,417, 0,667, 0,708, 2,0 |
| `kette4` | Frontkick 2 (Drehtritt) | kontakt1 0,833 (Bein hoch), kontakt 0,938 (Tritt nach vorn), rueckzug 0,958, ruhe 1,333 |
| `sprung` | KI-Sprung | hocke 0,52, absprung 0,69, scheitel 0,94, aufsetzen 1,2, ruhe 1,375 |
| `getroffen_vorn` | KI-Treffer | start 0,04, kontakt 0,396, rueckzug 0,458, ruhe 1,417 |
| `umgeworfen` | KI-Hinfallen, 0 bis 2 s | start 0, abheben 0,375, aufprall 1,0, liegt 1,708 |
| `liegen` | Pose aus Hinfallen bei 2 s | |
| `aufstehen` | KI-Aufstehen, 0,417 bis 1,958 s | ruhe = Ende |

Gehen und Sprint teilen sich den Lauf-Clip: Das Gehtempo der Logik (1,75 Spielpixel je Tick) ist für das Preset „Gehen“ von Tripo (Schritt
0,29 Figurhöhen, 0,5 Höhen je Sekunde Standfußtempo) zu schnell; dessen Füße müssten mit dem Dreifachen der natürlichen Frequenz
trippeln. Der Lauf mit seinem Standfußtempo von 2,05 Höhen je Sekunde passt zu den Tempi des Sprints und läuft beim Gehen langsamer
(Füße rutschen nicht, weil die Zeit nach der zurückgelegten Strecke läuft).

## Prompts der KI-Animationen (Tripo, „Eigene Animation erstellen“)

Englisch, mit Dauer-Regler; Ergebnis je Prompt prüfen (Figur bleibt auf der Stelle, Bewegung vor und zurück, nicht zur Seite).

- **Sprung** (2 s): A person crouches down quickly, then jumps straight up as high as possible, both arms swinging upward. In the air the
  knees are pulled up toward the chest, then the legs extend downward again on the way back down. The person lands on both feet in a deep
  crouch to absorb the impact, then rises back up into a boxing stance. Stays on the spot and keeps facing the same direction.
- **Treffer** (2 s): A person standing in a boxing stance gets hit in the face by a hard punch and reacts to the hit. The head snaps sharply
  backward, the upper body recoils and bends back at the waist, the arms fly slightly outward, and the back foot slides a half step back.
  The person stays on their feet, wobbles briefly, then straightens up and returns to the boxing stance with fists raised. Stays in place,
  keeps facing the same direction, does not fall.
- **Hinfallen** (3 s): A person is knocked down by a powerful blow to the chest. Both feet leave the ground and the body is thrown backward
  through the air, arms flung wide and legs swinging up, until the body is horizontal. The person crashes down hard flat on their back,
  bounces slightly, then lies motionless on the ground, face up, legs straight and slightly apart, arms spread out to the sides. Stays in
  place and keeps facing the same direction. (Ergebnis: sanfter, die Figur kippt wie ein Brett nach hinten; im Spiel fliegt sie ohnehin im
  Bogen.)
- **Aufstehen** (2 s, Variante B mit Überschlag; Ergebnis: sie setzt sich auf, geht in die Hocke und steht auf): A person lies flat on their
  back on the ground. They swing both legs up and back over the head and snap upward in a kip-up, landing on both feet in a low boxing
  stance with fists raised in front of the chin. Very fast, stays in place, keeps facing the same direction.
- **Kampfhaltung** (5 s; nur die kleinen Bewegungen sind im Spiel, die Pose kommt aus Boxen 3, weil die KI die Füße eng zusammenstellte und
  die Faust das Gesicht verdeckte): A person stands in an orthodox boxing stance in place, feet a full step apart front to back, left foot
  forward and right foot back, knees slightly bent, weight on the balls of the feet. Both fists are raised in front of the chin, left fist a
  little ahead of the right, elbows tucked in, chin down. The body bounces gently up and down with small knee bends and calm breathing.
  Keeps facing forward and ends in the same pose it started in.

Im Spiel dauern Treffer und Aufstehen nur etwa eine halbe Sekunde (27 und 26 Ticks, `KernWerte`); deshalb sind die Zeiten kurz und die
Clips werden in der Tabelle auf die Zeiten der Logik gestaucht (Aufstehen um das 3,6-fache).

## Festlegungen der Darstellung

- **Ansicht**: orthografische Kamera von der Seite (Blick von −X, die Figur schaut nach +Z und erscheint nach rechts schauend), Figurhöhe
  284 Bildpixel wie die gemalte Vela (142 Basispixel mal `ASSET_ZU_BILD`), Füße bei 88 % der Höhe des quadratischen Bildes (512 Pixel),
  mittig über der Hüfte; Bild eines `SubViewport` (eigene Welt, durchsichtiger Grund, MSAA 4x), als `Sprite2D` am Fußpunkt
  (`figurFuss` plus ein halbes Spielpixel nach rechts), Blick links durch `scale.x = −1`. Z-Ebene wie die anderen Quellen
  (zwischen „Hinten“ und „Vorn“), der Schatten kommt aus dem Zeichnen der Szene.
- **Aussehen**: flache Farbstufen (drei Stufen 1,0, 0,8, 0,6 nach dem Winkel zum Licht), Sättigung 1,15, dunkle Umrisslinie von 1,0
  Bildpixeln (zweiter Durchgang mit verschobenen Eckpunkten; ab 2 Pixeln verschmiert sie das Gesicht), Textur 2048 mit Mip-Stufen.
- **Pose**: Zeit aus der Tabelle, dann `Skeleton3D.reset_bone_poses()`, die Spuren des Clips abgetastet (Drehungen, Hüftposition), dann
  die Finger (die Tripo-Animationen bewegen die Finger nicht, sie wären offen). Es gibt keinen `AnimationPlayer`: Er wendet Posen außerhalb
  des Baums nicht an und liefert unbrauchbare Zwischenspeicher; die eigene Abtastung hängt nur von Clip und Zeit ab.
- **Fäuste**: jedes Fingerglied (Zeigefinger bis kleiner Finger, 1 bis 3; Daumen halb so stark) wird von der Ruhedrehung aus um 70 Grad um
  die lokale z-Achse eingerollt, für beide Hände mit demselben Vorzeichen. Wichtig: von der Ruhe aus, nicht von der aktuellen Pose, sonst
  summiert sich das Einrollen mit jedem Bild auf und die Fäuste flackern (so war es zuerst in `dreid_vorschau.gd`).
- **Boden**: In Luftclips (Art `sprung`, `tritt`, `landung`) liefert die Logik die Höhe; der Clip wird um die Höhe der tieferen Zehe über
  dem Stand nach unten verschoben, sonst stiege die Figur doppelt.
- **Hüfte**: Die Hüftspur liegt waagrecht auf der Ruheposition (das Bauwerkzeug setzt x und z fest); die Clips sind an Ort und Stelle.
- **Überblendung**: Beim Wechsel zu Stand, Gehen, Sprint und Aufstehen mischt die Pose in 5, 4, 4 und 3 Logikschritten (Drehungen mit
  Kugelinterpolation und Glättung, dazu die Hüfthöhe) von der letzten zur neuen Pose. Zu Schlägen, Treffern, Sprüngen und Flug wird nicht
  überblendet (wie die gemalten Bilder: der Treffer muss im ersten Frame zu sehen sein). Eine Lücke im Aufruf (mehr als zwei Schritte, Foto,
  Neustart) setzt die Überblendung zurück.
- **Blick** der Flug- und Liegeclips: wie bei den gemalten Clips entgegen der Flugbahn (`flugblick` in `DarstellungVelaFramesTabelle.wahl`);
  der 3D-Treffer und das Hinfallen sind nach hinten.

## Befunde beim Bauen

- **Ausreißer-Schlüssel**: In fünf der zehn benutzten Quelldateien sitzen einzelne Schlüsselbilder in den Drehspuren, die exakt 144 Grad vom Wert
  zwischen ihren Nachbarn abweichen (zum Beispiel `RightUpLeg` in `kick02` bei 0,933 s: das Bein stand für ein Bild senkrecht). Bei 24
  Bildern je Sekunde sieht man sie nicht, im Spiel mit 60 Abtastungen je Sekunde zucken sie ein bis zwei Ticks lang. `dreid_bauen.gd`
  entfernt solche Schlüssel (Abweichung über 30 Grad bei nah beieinander liegenden Nachbarn) und meldet sie.
- **Kubische Zwischenrechnung**: Die Importe setzen kubische Zwischenrechnung; sie überschwingt bei schnellen Drehungen. Das Bauwerkzeug
  tastet linear (Kugelinterpolation) ab.
- **Skelett im Modell und in den FBX-Dateien**: gleiche Ruhepose (größte Abweichung 0,04 Grad); die FBX-Spuren gelten deshalb unverändert für
  das kleinere GLB-Modell. Spurpfad im Spiel: `Armature/Skeleton3D:mixamorig_<Knochen>`.
- **Speicher**: Textur 2048 × 2048 RGBA = 16,8 MB (22,4 MB mit Mip-Stufen); dazu das Raumbild (512 × 512, MSAA) und das Netz; zusammen
  rund 35 MB gegen rund 209 MB der fünfzehn gemalten Clips. Modell und Animationen im Repo: 4,2 MB. Mit 8192-Texturen wären es 268 MB.
- **Finger**: Tripo-Animationen enthalten keine Fingerspuren (offene Hände); Fäuste kommen aus der Darstellung.

## Befehle

```
# Bauen (Repo-Wurzel; Quelle: Ordner mit modell.glb und den FBX-Dateien nach den Rollennamen des Manifests)
godot --headless --path godot --script res://werkzeuge/dreid_bauen.gd -- --quelle <ordner> --bauen [--nur <clip>]
# Merkmale je Bild einer Quelle (Hüfte, Auslage von Hand und Fuß, Zehenhöhe, Bewegung) zum Ablesen der Ereigniszeiten
godot --headless --path godot --script res://werkzeuge/dreid_bauen.gd -- --quelle <ordner> --analyse <quelle|alle>
# Spielen
godot --path godot -- --dreid
# Belege (Streifen und GIFs im Spiel)
BELEGE_FOTO=--dreid BELEGE_VORSATZ=godot_3d_spiel BELEGE_AUS=<ordner> BELEGE_TMP=<ordner> godot/werkzeuge/vela_belege.sh gehen kette_folge getroffen_vorn umgeworfen_aufstehen
```

Tests: `Vela3DTest` in `godot/tests/vela3d_test.gd` (Clipdaten, Ereignisreihenfolge, Abdeckung, Zeiten je Aktion, Laden, Spuren treffen
Knochen, Pose, Fäuste, Boden, Überblendung, Lücke); läuft headless in `alle.gd` mit.

## Offen

- Fehlende Clips: Griff, Wurf, Sprungtritt, Kniestoß, Spezialangriff (Tripo-Animationen dazu erzeugen oder aus dem Skelett ableiten).
- Gehen: Der Lauf-Clip bei Gehtempo wirkt wie ein langsamer Dauerlauf; ein flotter Gehschritt (längere Schritte als das Preset „Gehen“)
  wäre besser (KI-Animation: „walks briskly with long strides“).
- Kette 4 ist ein Drehtritt mit zwei Fenstern (erstes Fenster: Bein hoch vorn, zweites: Tritt nach vorn); der Clip endet 55 Grad aus der
  Blickrichtung gedreht, die Überblendung zum Stand fängt das in 5 Ticks auf.
- Pferdeschwanz ohne Knochen (starr), goldene Schulterzeichen („3“, „E“) auf der Jacke, kein Fußabdruck-IK beim Gehen.
- Rechte: Ausgaben der Tripo-Gratisstufe sind meist öffentlich; das Bild nach einem Foto braucht Einwilligung der Person, bevor das Spiel
  veröffentlicht wird.
- Messung von Zeit je Bild auf echter Grafikhardware (hier nur Software-Rendering: etwa 0,2 s je Bild unter Xvfb).
