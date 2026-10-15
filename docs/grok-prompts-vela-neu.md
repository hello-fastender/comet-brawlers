# Grok-Prompts für die neue Vela (realistischer Comic, blond)

Stand 2026-10-15. Die neue Vela (Referenzbild: frontale A-Pose, realistischer Comic mit feiner Tuschelinie, blondes Haar mit hohem Pferdeschwanz, kobaltblaue
Lederjacke mit orangem Querstreifen, Stahl-Armschienen, fingerlose Handschuhe, Jeans mit Rissen, Schnürstiefel) soll wie die alte Vela aus kurzen Grok-Videos
in Bildfolgen umgesetzt werden (`godot/werkzeuge/video_umsetzer.gd`, `docs/godot.md`, „Video-Umsetzer“). Die 3D-Fassung (`docs/dreid-vela.md`) wirkte im
Spiel dünner und weniger wuchtig als die gemalten Clips; deshalb zurück zum Video-Weg, diesmal direkt aus dem neuen Referenzbild (nicht neu im alten
gemalten Stil).

Unterschiede zu `docs/grok-prompts-vela-gemalt.md` (alte Vela, rotbraunes Haar, Chroma-Grün, Cel-Shading):

- Hintergrund ist **reines Weiß** (RGB 255, 255, 255), nicht Grün. Der Umsetzer muss dafür im Modus `ecke` laufen (Hintergrund = Randfarbe, Figur = was mehr
  als `--tol` Stufen abweicht). Helle Stellen der Figur (Silberschienen, Stiefelkappen, Haut- und Haarlichter) dürfen nie fast weiß werden, sonst entstehen
  Löcher (`--loch`, `--tol` anpassen). Ein hellgrauer Schatten wäre Figur.
- Stil ist der des Referenzbilds (Comic-Tuschezeichnung mit Textur), nicht „gemalt, Cel-Shading“. Das Wort „realistischer Comic“ allein kippt Videomodelle
  leicht in Fotooptik; deshalb „Tuschezeichnung“ und die Verbote Foto, 3D-Render, Cel-Shading, Pixelgrafik.
- Goldene Aufnäher an den Oberarmen gehören zur Figur (die alte Vela hatte keine); sie sind ohne Schrift beschrieben, weil Videomodelle kleine Zeichen
  flackern lassen.
- Die Figur im Referenzbild füllt 97 % der Bildhöhe. Ein Video braucht Rand (Figur höchstens 65 % der Höhe). Wer das Referenzbild als erstes Bild benutzt,
  braucht eine auf 60 % verkleinerte Fassung auf Weiß (1024 × 1024, 22 % Platz darüber, 18 % darunter, aus dem Original erzeugt). Wer nur die Referenz
  (`@Vela`) benutzt, legt Größe und Hintergrund im Prompt fest.

## Referenz in Grok

Name `Vela`, Kategorie Charakter, Bild: das Originalbild. Beschreibung:

```text
Vela, Heldin eines Prügelspiels. Realistischer Comic mit feiner Tuschelinie und Texturen. Blondes Haar zu hohem Pferdeschwanz mit blauem Haargummi, blaue Augen. Blaue Lederjacke mit orangem Querstreifen über der Brust, goldener Reißverschluss, goldene Aufnäher an den Oberärmeln, dunkles Top, Jeans mit Rissen an Knie und Oberschenkel, schwarze Schnürstiefel mit dicker Sohle, Stahlmanschetten an beiden Unterarmen, fingerlose blaue Handschuhe mit Nieten. Immer dieselben Gesichtszüge, Kleidung und Proportionen, den Zeichenstil nie ändern.
```

Einstellungen für jedes Video: 6 s, Format 1:1, höchste Auflösung (mindestens 720 Pixel), 24 Bilder je Sekunde, ohne Ton.

## laufen (Clip `sprint`, nur Referenz `@Vela`, Start direkt im Profil)

Entstanden aus drei Entwürfen und zwei Prüfern (Videomodell-Sicht, Umsetzer-Sicht); weil die Referenz ohne erstes Bild benutzt wird, beginnt das Video
bereits im Profil und mitten im Lauf (keine Drehung aus der A-Pose, das hätte das Gesicht im Profil erfunden und die Seiten vertauscht).

```text
FIGUR: Vela ist die Figur der Referenz @Vela. Vela bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales ovales Gesicht mit blaugrauen Augen, gerader schmaler Nase und vollen natürlichen Lippen, kein Make-up, junge Frau; im Profil bleibt es dasselbe Gesicht, gleiche Nase, gleiches Kinn. Mittelblondes (weizenblondes) Haar als ein einziger hoher, leicht welliger Pferdeschwanz mit kleinem königsblauem Haargummi; die Haarfarbe bleibt in jedem Bild mittelblond (nie rötlich, nie weißblond, nie dunkel), der Pferdeschwanz bleibt ein einziger hoher Zopf. Kurze kobaltblaue Lederjacke mit Stehkragen, offenem Reißverschluss mit goldenen Zähnen, genau einem breiten orangen Querstreifen über der Brust und goldbeigen Nähten; darunter ein enges dunkelmarineblaues Top; auf jedem Oberarm außen ein kleiner goldener Aufnäher (schmales Schild, dunkelblaues Feld, goldene Balken), immer derselbe, ohne Schrift, ohne Buchstaben, ohne Zahlen. Indigoblaue Jeans mit zwei kleinen Rissen (einer am Knie des rechten Beins, einer am Oberschenkel des linken Beins), schwarze abgewetzte Schnürstiefel mit dicker Profilsohle. An beiden Unterarmen silbergraue Stahl-Armschienen, darunter fingerlose dunkelblaue Lederhandschuhe mit freien Fingern; die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen. Stil: Comic-Tuschezeichnung mit feiner dunkler Kontur um die ganze Figur und handkolorierten Flächen mit sichtbarer Textur in Leder, Jeans und Metall, exakt im Zeichenstil der Referenz. Kein Stilwechsel während des Videos: kein Foto, keine Hautporen, kein Fotolicht, kein 3D-Render, kein Cel-Shading, keine Pixelgrafik. Die dunkle Kontur ist in jedem Bild gleich dünn und schließt die Figur rundum ein, auch jede helle Stelle. Kein Teil der Figur ist reinweiß oder fast weiß: Glanzlichter auf Armschienen, Stiefelkappen, Haut, Haar und Nähten bleiben getönt, nie heller als sehr helles Grau. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiger reinweißer Hintergrund (RGB 255, 255, 255) in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein Grau, kein Creme, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren). Die Kamera schaut waagrecht auf Vela, streng von der Seite. Vela läuft auf der Stelle und bleibt an ihrem Platz in der Bildmitte; sie läuft nicht durch das Bild. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefel, Hände und Zopfspitze. Vela nimmt 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent, auch nicht im Lauf; zwischen dem höchsten Punkt der Figur und dem oberen Bildrand bleiben mindestens 15 Prozent Platz, seitlich mindestens 20 Prozent. Vela wird nicht größer und nicht kleiner. Die Füße bleiben immer auf derselben Höhe im Bild; Vela hüpft nicht und schwebt nicht.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher grauer Schatten, kein hellgrauer Fleck unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf. Das Video beginnt bereits mitten im Lauf (kein Anlauf, kein Stehen, keine Drehung) und läuft bis zum letzten Bild gleichmäßig weiter, ohne abzubremsen.

HANDLUNG: Vela ist von der ersten Sekunde an im strengen Profil nach rechts: ihr Gesicht zeigt nach rechts im Bild, die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm mit Aufnäher und Armschiene, rechtes Bein mit dem Riss am Knie), die linke Seite ist größtenteils verdeckt. Sie blickt nie nach links, dreht sich nie zur Kamera, läuft nie rückwärts. Sie läuft auf der Stelle schnell wie bei einem Sprint: Oberkörper 15 Grad nach vorn geneigt, lange Schritte, die Knie heben sich hoch, die Füße treten vor dem Körper auf und heben hinter dem Körper ab, der Körper bleibt an seinem Platz. Die Arme sind im Ellbogen etwa 90 Grad angewinkelt, die Hände locker zu Fäusten geschlossen (die Handschuhe bleiben fingerlos, die Armschienen silbergrau), die Arme schwingen kräftig im Gegentakt zu den Beinen: ist das der Kamera zugewandte rechte Bein vorn, ist der rechte Arm hinten, beim nächsten Schritt umgekehrt; nie beide Arme gleichzeitig vorn. Die Beine kreuzen sich nie und tauschen nie die Seiten: das vordere Bein bleibt zu jedem Zeitpunkt eindeutig das vordere; es gibt nie mehr als zwei Arme und zwei Beine. Der Pferdeschwanz schwingt im Takt nach hinten und bleibt ein einziger hoher Zopf mit blauem Haargummi, keine zusätzlichen Haarbüschel. Es ist ein schneller Lauf, kein Gehen und kein lockeres Joggen. Tempo und Schrittlänge bleiben bis zum letzten Bild gleich: etwa acht bis neun gleich lange Doppelschritte (rechter Schritt, linker Schritt) in den 6 Sekunden, jeder Doppelschritt etwa 0,65 Sekunden.
ENDE: Das Video endet noch mitten im Lauf, in derselben Pose wie am Anfang eines Doppelschritts (Schleife), im strengen Profil nach rechts, gleiche Größe, gleicher Ort, weißer Hintergrund unverändert. Nochmals das Wichtigste: reinweißer Hintergrund in jedem Bild, feste Kamera, Vela bleibt gleich groß und in der Mitte, strenges Profil nach rechts, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### Video auswählen

Mehrere Versuche (zwei bis drei) und das beste nehmen. Prüfen:

- Blick nach **rechts**, rechte Körperseite sichtbar (Aufnäher und Riss am rechten Knie). Blickt Vela nach links: verwerfen, nicht spiegeln (dann wäre die falsche Körperseite zu sehen).
- Ein blonder Pferdeschwanz mit blauem Gummi, dasselbe Gesicht, Jacke offen mit einem orangen Streifen, Armschienen silbergrau.
- Figur nie größer als 65 % der Höhe, nie am Bildrand, bleibt an ihrem Platz, Füße auf gleicher Höhe.
- Gleichmäßige Schritte, Beine kreuzen sich nie, Hintergrund überall reines Weiß, kein Schatten, keine Linien.
- Flackernde Aufnäher, Nieten oder Risse sind kein Grund, ein Video zu verwerfen (bei 142 Pixel Figurhöhe sind sie wenige Pixel groß); Gesichts-, Haarfarb- oder Stilwechsel dagegen schon.

### Schnitt und Umsetzen (Hinweise für den Umsetzer, nicht in den Prompt)

- Brauchbar ist meist etwa 1,4 bis 4 s (zwei bis vier saubere Doppelschritte gleicher Phase); danach driftet der Lauf. Mit dem Prüfbogen (`video_bogen.gd`)
  den Abschnitt suchen und mit `--ab` und `--bis` schneiden. Ein Doppelschritt von 0,65 s sind 15,6 Bilder bei 24 B/s, also keine ganze Zahl: die
  Zykluslänge suchen lassen oder auf die gemessene ganze Zahl setzen.
- Der Maßstab (`--faktor`) kommt nicht aus dem Laufbild (Oberkörper geneigt, andere Höhe), sondern aus einer Stehpose derselben Figur: 142 Spielpixel geteilt
  durch die Figurhöhe im Video in Pixeln (bei 1024 Pixeln und 60 % etwa 614), für alle Clips der neuen Vela gleich.
- Die Bodenlinie liegt auf der untersten Figurzeile des ersten behaltenen Bildes: der Abschnitt soll mit einer Pose beginnen, in der der Standfuß am Boden ist.
- Weißer Grund: Modus `ecke`; bei Löchern in hellen Stellen `--loch 8` oder `--tol 30`, bei grauem Hauch `--tol 55` oder das Video neu erzeugen; Ergebnis mit
  `hd_vorschau.gd` auf Grau und Weiß ansehen.
