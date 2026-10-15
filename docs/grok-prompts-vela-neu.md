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
- Goldene Aufnäher an den Oberarmen sind im Referenzbild zu sehen. Am 2026-10-15 hat der Nutzer den Satz dazu aus den Prompts gestrichen; kein Prompt nennt
  sie mehr (Seitenmerkmal ist der Riss am rechten Knie). Früher waren sie ohne Schrift beschrieben, weil Videomodelle kleine Zeichen
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
FIGUR: Vela ist die Figur der Referenz @Vela. Vela bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales ovales Gesicht mit blaugrauen Augen, gerader schmaler Nase und vollen natürlichen Lippen, kein Make-up, junge Frau; im Profil bleibt es dasselbe Gesicht, gleiche Nase, gleiches Kinn. Mittelblondes (weizenblondes) Haar als ein einziger hoher, leicht welliger Pferdeschwanz mit kleinem königsblauem Haargummi; die Haarfarbe bleibt in jedem Bild mittelblond (nie rötlich, nie weißblond, nie dunkel), der Pferdeschwanz bleibt ein einziger hoher Zopf. Kurze kobaltblaue Lederjacke mit Stehkragen, offenem Reißverschluss mit goldenen Zähnen, genau einem breiten orangen Querstreifen über der Brust und goldbeigen Nähten; darunter ein enges dunkelmarineblaues Top. Indigoblaue Jeans mit zwei kleinen Rissen (einer am Knie des rechten Beins, einer am Oberschenkel des linken Beins), schwarze abgewetzte Schnürstiefel mit dicker Profilsohle. An beiden Unterarmen silbergraue Stahl-Armschienen, darunter fingerlose dunkelblaue Lederhandschuhe mit freien Fingern; die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen. Stil: Comic-Tuschezeichnung mit feiner dunkler Kontur um die ganze Figur und handkolorierten Flächen mit sichtbarer Textur in Leder, Jeans und Metall, exakt im Zeichenstil der Referenz. Kein Stilwechsel während des Videos: kein Foto, keine Hautporen, kein Fotolicht, kein 3D-Render, kein Cel-Shading, keine Pixelgrafik. Die dunkle Kontur ist in jedem Bild gleich dünn und schließt die Figur rundum ein, auch jede helle Stelle. Kein Teil der Figur ist reinweiß oder fast weiß: Glanzlichter auf Armschienen, Stiefelkappen, Haut, Haar und Nähten bleiben getönt, nie heller als sehr helles Grau. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiger reinweißer Hintergrund (RGB 255, 255, 255) in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein Grau, kein Creme, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren). Die Kamera schaut waagrecht auf Vela, streng von der Seite. Vela läuft auf der Stelle und bleibt an ihrem Platz in der Bildmitte; sie läuft nicht durch das Bild. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefel, Hände und Zopfspitze. Vela nimmt 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent, auch nicht im Lauf; zwischen dem höchsten Punkt der Figur und dem oberen Bildrand bleiben mindestens 15 Prozent Platz, seitlich mindestens 20 Prozent. Vela wird nicht größer und nicht kleiner. Die Füße bleiben immer auf derselben Höhe im Bild; Vela hüpft nicht und schwebt nicht.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher grauer Schatten, kein hellgrauer Fleck unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf. Das Video beginnt bereits mitten im Lauf (kein Anlauf, kein Stehen, keine Drehung) und läuft bis zum letzten Bild gleichmäßig weiter, ohne abzubremsen.

HANDLUNG: Vela ist von der ersten Sekunde an im strengen Profil nach rechts: ihr Gesicht zeigt nach rechts im Bild, die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm mit Armschiene, rechtes Bein mit dem Riss am Knie), die linke Seite ist größtenteils verdeckt. Sie blickt nie nach links, dreht sich nie zur Kamera, läuft nie rückwärts. Sie läuft auf der Stelle schnell wie bei einem Sprint: Oberkörper 15 Grad nach vorn geneigt, lange Schritte, die Knie heben sich hoch, die Füße treten vor dem Körper auf und heben hinter dem Körper ab, der Körper bleibt an seinem Platz. Die Arme sind im Ellbogen etwa 90 Grad angewinkelt, die Hände locker zu Fäusten geschlossen (die Handschuhe bleiben fingerlos, die Armschienen silbergrau), die Arme schwingen kräftig im Gegentakt zu den Beinen: ist das der Kamera zugewandte rechte Bein vorn, ist der rechte Arm hinten, beim nächsten Schritt umgekehrt; nie beide Arme gleichzeitig vorn. Die Beine kreuzen sich nie und tauschen nie die Seiten: das vordere Bein bleibt zu jedem Zeitpunkt eindeutig das vordere; es gibt nie mehr als zwei Arme und zwei Beine. Der Pferdeschwanz schwingt im Takt nach hinten und bleibt ein einziger hoher Zopf mit blauem Haargummi, keine zusätzlichen Haarbüschel. Es ist ein schneller Lauf, kein Gehen und kein lockeres Joggen. Tempo und Schrittlänge bleiben bis zum letzten Bild gleich: etwa acht bis neun gleich lange Doppelschritte (rechter Schritt, linker Schritt) in den 6 Sekunden, jeder Doppelschritt etwa 0,65 Sekunden.
ENDE: Das Video endet noch mitten im Lauf, in derselben Pose wie am Anfang eines Doppelschritts (Schleife), im strengen Profil nach rechts, gleiche Größe, gleicher Ort, weißer Hintergrund unverändert. Nochmals das Wichtigste: reinweißer Hintergrund in jedem Bild, feste Kamera, Vela bleibt gleich groß und in der Mitte, strenges Profil nach rechts, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### Video auswählen

Mehrere Versuche (zwei bis drei) und das beste nehmen. Prüfen:

- Blick nach **rechts**, rechte Körperseite sichtbar (Riss am rechten Knie). Blickt Vela nach links: verwerfen, nicht spiegeln (dann wäre die falsche Körperseite zu sehen).
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

### Ergebnis der ersten Lieferung „laufen“ (2026-10-15, zwei Videos à 6 s, 944 × 944, 24 B/s)

Gemessen mit einem Skript, das je Bild die Figur gegen Weiß vermisst (Ober-, Unterkante, Breite); die Werte unten sind daraus.

- Beide Videos: Gesicht, Zopf, Jacke, Aufnäher, Armschienen und Riss am Knie bleiben gleich, Profil nach rechts, rechte Körperseite zur Kamera, Hintergrund
  durchgehend reinweiß ohne Schatten. Der Umsetzer im Modus `ecke` stellt sie ohne Nacharbeit frei (Standardwerte, kein weißer Saum).
- **Bild 1 ist in beiden Videos die frontale A-Pose der Referenz** (Grok nimmt die Referenz als erstes Bild, obwohl der Prompt den Start im Profil verlangt);
  die Drehung ins Profil dauert bis etwa Bild 15, danach läuft sie an. Brauchbar ist erst der eingeschwungene Teil.
- **Tempo:** Video 1 läuft ein lockeres Joggen (Schrittabstand 12 bis 13 Bilder, ein Doppelschritt etwa 1 s). **Video 2 läuft ab Bild 61 gleichmäßig im
  Sprinttempo** (Schrittabstand 7 bis 8 Bilder, Doppelschritt 15,6 Bilder = 0,65 s, 85 Bilder = gut 5 Doppelschritte). Gewählt: Video 2.
- **Größe:** Die Figur füllt 87 bis 98 % der Bildhöhe (A-Pose: 926 von 944 Zeilen), nicht die verlangten 60 %. In 23 der 85 gewählten Bilder berühren
  Haare oder Kopf die oberste Zeile (bis zu 50 Pixel breit), die Haarkuppe ist dort möglicherweise um wenige Zeilen angeschnitten; im umgesetzten Clip fällt das nicht auf. Die Größenangabe im Prompt wirkt also nicht; der Maßstab muss gemessen werden.
- **Maßstab (`--faktor`) für alle Clips der neuen Vela: 0,1533** = 142 Spielpixel / 926 Zeilen der aufrechten A-Pose (Bild 1). Laufbild damit etwa 135 bis 140 Pixel
  hoch, wie der alte Sprint-Clip (rund 133 bis 136).
- **Umsetzung:** `--ab 61 --bis 145 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --faktor 0.1533 --schluessel ecke --hd --hoehe 360`; die
  Zyklussuche ohne `--zyklus` wählt 8 Bilder (halber Doppelschritt, weil die Aufnäherseite sich unterscheidet), darum 16 fest vorgeben. Ergebnis: Zyklus ab
  Bild 9 der behaltenen 85, Schlussfehler 15 % eines Bildschritts, `schritt_px` 84, `zyklus_ticks` 24 (alter Sprint: 93 und 27). Befehl in
  `godot/werkzeuge/vela_neu_clips.sh`.
- Für die nächsten Prompts: Startpose-Satz so lassen (Grok kann es nicht), aber im Umsetzen immer die ersten 1,5 bis 2,5 s überspringen; Tempo-Angabe „0,65
  Sekunden je Doppelschritt“ hat in einem von zwei Videos gewirkt, mehrere Versuche einplanen.


## Gemeinsame Bausteine ab `stand` und `gehen` (2026-10-15)

Entstanden aus je drei Entwürfen (Zeitplan, kompakt, Konstanz), zwei Prüfern (Videomodell-Sicht, Umsetzer-Sicht), einer Zusammenführung je Clip und
einem Abgleich beider Prompts mit `laufen`. Der kompakte Entwurf (rund 3000 Zeichen, FIGUR und VERBOTEN gekürzt) ist verworfen, weil gerade diese Absätze
in der ersten Lieferung funktioniert haben. Grundlage sind die Befunde der ersten Lieferung (oben):

- **Anfang in der A-Pose wird beschrieben statt verboten.** Grok nimmt die Referenz als erstes Bild; jeder Prompt plant deshalb einen Übergang (Drehung ins
  Profil in etwa 0,6 s, Einschwingen bis etwa 2,0 s) und erst danach den nutzbaren Hauptteil. Der Übergangsblock (A-Pose, Drehung um etwa 90 Grad nach
  ihrer linken Seite, also im Bild nach rechts, rechte Schulter zur Kamera, Rücken nie zur Kamera) steht in beiden Prompts wortgleich und soll in alle
  weiteren Prompts übernommen werden.
- **BILD verlangt Konstanz zum ersten Bild statt einer Prozentgröße:** feste Kamera, derselbe Bildausschnitt, Vela so groß wie im ersten Bild, höchster
  Punkt nie höher als dort, Sohlen auf der Höhe der Sohlen im ersten Bild, Mitte wie im ersten Bild. Daran hängen der feste Maßstab `--faktor 0.1533` und
  die gemeinsame Bodenlinie aller Clips. Die Wörter Fußlinie, Linie, Laufband stehen bewusst nicht im Prompt (Vermutung: sie könnten mitgemalt werden).
- **KAMPFHALTUNG ist ein eigener Absatz** (im Prompt `stand`), ohne Zeitangaben und ohne Verweise, damit `kette1` bis `kette4`, `treffer`, `griff`, `wurf`
  und `aufstehen` ihn wörtlich übernehmen. Festlegung: strenges Profil nach rechts, rechte Körperseite zur Kamera, das Kamera-nahe rechte Bein steht vorn,
  die rechte Faust ist die Führhand (Schlagarm der Angriffsclips), die linke Faust am Kinn, Stiefelabstand etwa zwei Fünftel der Körperhöhe.
- Der Prompt `laufen` oben trägt noch das alte BILD (60 Prozent) und den Start im Profil. Bei einem neuen Laufen-Versuch auf den BILD-Kern und den
  Übergangsblock umstellen.
- Länge: `stand` 9.927, `gehen` 9.228 Zeichen (`laufen` rund 5.600, hat funktioniert). Eine Obergrenze von Grok Imagine ist nicht dokumentiert. Schneidet
  Grok ab oder wird ein Teil sichtbar übergangen: zuerst HANDLUNG-Einzelheiten, dann Wiederholungen in BILD kürzen, nie FIGUR, HINTERGRUND, VERBOTEN,
  KAMPFHALTUNG und ENDE.

## stand (Clip `stand`: Kampfhaltung, ruhig atmend, Schleife in Echtzeit)

Plan: 0 bis 0,6 s Drehung, 0,6 bis 1,6 s in die Kampfhaltung, 1,6 bis 2,0 s ruhig, 2,0 bis 6,0 s zwei Atemzüge zu je 2,0 s. Gebraucht wird ein sauberer
Atemzug (im alten Spiel 47 Bilder).

```text
FIGUR: Vela ist die Figur der Referenz @Vela. Vela bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales ovales Gesicht mit blaugrauen Augen, gerader schmaler Nase und vollen natürlichen Lippen, kein Make-up, junge Frau; im Profil bleibt es dasselbe Gesicht, gleiche Nase, gleiches Kinn. Mittelblondes (weizenblondes) Haar als ein einziger hoher, leicht welliger Pferdeschwanz mit kleinem königsblauem Haargummi; die Haarfarbe bleibt in jedem Bild mittelblond (nie rötlich, nie weißblond, nie dunkel), der Pferdeschwanz bleibt ein einziger hoher Zopf. Kurze kobaltblaue Lederjacke mit Stehkragen, offenem Reißverschluss mit goldenen Zähnen, genau einem breiten orangen Querstreifen über der Brust und goldbeigen Nähten; darunter ein enges dunkelmarineblaues Top. Indigoblaue Jeans mit zwei kleinen Rissen (einer am Knie des rechten Beins, einer am Oberschenkel des linken Beins), schwarze abgewetzte Schnürstiefel mit dicker Profilsohle. An beiden Unterarmen silbergraue Stahl-Armschienen, darunter fingerlose dunkelblaue Lederhandschuhe mit freien Fingern; die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen. Stil: Comic-Tuschezeichnung mit feiner dunkler Kontur um die ganze Figur und handkolorierten Flächen mit sichtbarer Textur in Leder, Jeans und Metall, exakt im Zeichenstil der Referenz. Kein Stilwechsel während des Videos: kein Foto, keine Hautporen, kein Fotolicht, kein 3D-Render, kein Cel-Shading, keine Pixelgrafik. Die dunkle Kontur ist in jedem Bild gleich dünn und schließt die Figur rundum ein, auch jede helle Stelle. Kein Teil der Figur ist reinweiß oder fast weiß: Glanzlichter auf Armschienen, Stiefelkappen, Haut, Haar und Nähten bleiben getönt, nie heller als sehr helles Grau. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiger reinweißer Hintergrund (RGB 255, 255, 255) in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein Grau, kein Creme, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang.

BILD: Quadratisches Bild. Das erste Bild des Videos ist die Referenz @Vela (frontal, A-Pose, ganze Figur). Feste Kamera ohne jede Bewegung: kein Zoom, kein Heranfahren, kein Wegfahren, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren; die Kamera schaut waagrecht auf Vela und kreist nie um sie, nur Vela dreht sich, danach sieht die Kamera sie streng von der Seite. Der Bildausschnitt ist in jedem Bild derselbe wie im ersten Bild. Der Maßstab des ersten Bildes gilt für das ganze Video: Vela ist in jedem Bild so groß wie im ersten Bild (gleiche Kopfgröße, gleiche Körperproportionen), nie größer und nie kleiner, und sie rückt nicht näher an die Kamera. Ihr höchster Punkt liegt nie höher als im ersten Bild; weil sie in der Kampfhaltung die Knie beugt und sich vorneigt, liegt er dort etwas tiefer, und über dem Kopf bleibt ein weißer Rand. Die Stiefelsohlen liegen in jedem Bild auf derselben Höhe im Bild wie die Sohlen im ersten Bild (nur beim Schritt im Übergang hebt ein Stiefel kurz ab); darunter und daneben bleibt alles reinweiß. Die Mitte zwischen den beiden Stiefeln liegt in der Bildmitte, dort, wo Velas Körpermitte im ersten Bild steht. Vela wandert nie durch das Bild, hüpft nicht und schwebt nicht. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefel, Hände und Zopfspitze; nichts wird am Bildrand abgeschnitten.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher grauer Schatten, kein hellgrauer Fleck unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

KAMPFHALTUNG: Vela steht im strengen Profil nach rechts: Gesicht, Brust und Fußspitzen zeigen nach rechts im Bild, die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm mit silbergrauer Armschiene, rechtes Bein mit dem Riss am Knie), die linke Seite ist größtenteils verdeckt. Der Stand ist breit, aber fest, kein Ausfallschritt: die Stiefel stehen deutlich weiter als schulterbreit auseinander, der Abstand zwischen den Stiefelmitten beträgt etwa zwei Fünftel von Velas Körperhöhe in dieser Haltung (Scheitel bis Sohle), weniger als eine Beinlänge. Das der Kamera nähere rechte Bein, das Bein mit dem Riss am Knie, steht vorn (im Bild weiter rechts), das linke Bein steht hinten (im Bild weiter links); die Beine kreuzen sich nie. Beide Stiefel stehen mit der ganzen Sohle flach und auf gleicher Höhe im Bild, die Fersen sind unten. Beide Knie sind leicht gebeugt, weder durchgestreckt noch in der Hocke; das vordere Knie steht über dem vorderen Stiefel, das Gewicht liegt gleichmäßig auf beiden Beinen. Der Oberkörper ist leicht nach vorn geneigt, die Schultern sind entspannt, das Kinn ist eingezogen, der Blick geht waagrecht nach rechts. Beide Arme sind im Ellbogen stark angewinkelt, beide Hände sind zu Fäusten geschlossen (die Handschuhe bleiben fingerlos, die Armschienen silbergrau). Die RECHTE Faust ist die vordere Führhand: sie steht vor der rechten Schulter in Höhe des Kinns, ein Stück vor dem Körper, der Unterarm mit der Armschiene zeigt schräg nach oben, der rechte Ellbogen hängt nach unten vor den Rippen. Die LINKE Faust ist die hintere Hand: sie steht dicht am Kinn vor Kiefer und Hals, der linke Ellbogen ist nah am Körper; von der Kamera aus ist sie teilweise durch Kopf und rechten Arm verdeckt.

ABLAUF: Ein einziger Durchlauf in zwei Phasen ohne Pause und ohne Schnitt; Drehung und Haltungswechsel kommen nur einmal vor. Phase 1, Übergang, 0,0 bis 2,0 s: Das erste Bild ist die Referenz @Vela, frontal in der A-Pose; 0,0 bis 0,6 s Drehung ins strenge Profil nach rechts; 0,6 bis 1,6 s sie nimmt die KAMPFHALTUNG ein; 1,6 bis 2,0 s sie steht ruhig in der KAMPFHALTUNG, ausgeatmet, die Schultern unten. Phase 2, Atmen, 2,0 bis 6,0 s: genau zwei gleich lange Atemzüge von je 2,0 s (2,0 bis 3,0 s Einatmen, 3,0 bis 4,0 s Ausatmen, 4,0 bis 5,0 s Einatmen, 5,0 bis 6,0 s Ausatmen). Der zweite Atemzug ist genauso lang, genauso tief und genauso schnell wie der erste: kein Verlangsamen, kein Flacherwerden, kein Innehalten bis zum letzten Bild. Ab 1,6 s stehen beide Stiefel fest an ihrem Platz; in Phase 2 bewegen sich nur Schultern, Brustkorb, Kopf, Fäuste und Pferdeschwanz, und nur im Takt der Atmung.

HANDLUNG: Übergang: Vela steht zuerst wie in der Referenz frontal in der A-Pose, aufrecht, die Arme schräg nach unten gestreckt. Dann dreht sie sich auf der Stelle um etwa 90 Grad nach ihrer linken Seite, also im Bild nach rechts: ihr Gesicht zeigt danach im Bild nach rechts, ihre rechte Schulter kommt zur Kamera hin, ihre linke Schulter geht von der Kamera weg, und die Kamera sieht ihre RECHTE Körperseite (Riss am rechten Knie). Beim Drehen bleiben die Füße an ihrem Platz und ihr Rücken zeigt nie zur Kamera; sie dreht sich nicht weiter, nicht zurück und nie in die Gegenrichtung, sie nähert sich der Kamera nicht und blickt danach nie nach links; die Kamera dreht sich nicht mit. Dabei sinken die Arme aus der A-Pose, die Ellbogen beugen sich, die Hände schließen sich zu Fäusten. Im Profil nimmt sie die KAMPFHALTUNG ein: ihr rechtes Bein setzt nach vorn (im Bild nach rechts), ihr linkes Bein nach hinten (im Bild nach links), bis der Stand die Breite der KAMPFHALTUNG hat und die Mitte zwischen den Stiefeln an ihrem Platz bleibt; die Knie beugen sich leicht, der Oberkörper neigt sich leicht nach vorn, die Fäuste kommen hoch vor Kinn und Schulter. Kein Sprung, kein Hüpfen: ein Stiefel darf dafür kurz abheben und setzt auf der Höhe der Sohlen im ersten Bild wieder auf; danach bewegen sich die Füße nie wieder. Atmen: Ab der KAMPFHALTUNG atmet Vela ruhig und gleichmäßig. Beim Einatmen heben sich Schultern und Brustkorb deutlich, etwa 3 Prozent der Körperhöhe, klar sichtbar und nicht nur angedeutet; der Kopf geht nur ein kleines Stück mit, beide Fäuste federn ein kleines Stück nach oben mit und bleiben vor Kinn und rechter Schulter, der Pferdeschwanz hebt sich leicht und wippt sanft nach. Beim Ausatmen sinken Schultern, Brustkorb, Kopf und Fäuste in genau die Höhe zurück, in der sie vor dem Einatmen waren, und der Pferdeschwanz fällt in dieselbe Lage zurück. Die Bewegung ist weich und fließend, ohne Ruck, ohne Stopp oben oder unten, ohne Nachfedern. Die Füße bewegen sich nicht (kein Hüpfen, kein Nachsetzen, kein Gewichtswechsel, die Fersen heben nie ab), Hüfte, Knie und Beine bleiben unbewegt, der Körper wandert nicht und neigt sich nicht. Das Gesicht bleibt ruhig: Blick nach rechts, Mund geschlossen, keine Kopfdrehung.

ENDE: Das letzte Bild (6,0 s) gleicht dem Bild bei 4,0 s und dem Bild bei 2,0 s (nicht dem ersten Bild): dieselbe KAMPFHALTUNG am Ende eines Ausatmens, Schultern, Brustkorb, Kopf und Fäuste in derselben Höhe, Pferdeschwanz in derselben Lage, beide Stiefel an derselben Stelle, gleiche Größe, gleiche Mitte, Hintergrund unverändert (Schleife). Vela atmet bis zum letzten Bild weiter wie zuvor: in der letzten Sekunde gibt es kein Einfrieren, kein Abbremsen, kein Nachfedern, keinen Schritt, keine Drehung und keinen Wechsel in eine andere Haltung; sie kehrt nie in die A-Pose zurück. Nochmals das Wichtigste: reinweißer Hintergrund in jedem Bild, feste Kamera, Vela bleibt gleich groß und in der Mitte, die Sohlen liegen auf derselben Höhe wie im ersten Bild, strenges Profil nach rechts, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### Prüfen (stand)

- Bild 1 ist die A-Pose; danach dreht sie sich nach rechts (Gesicht rechts, Riss am Knie des nahen rechten Beins). Dreht sie sich falsch herum oder blickt nach
  links: verwerfen, nicht spiegeln.
- Kampfhaltung steht spätestens bei etwa 3 s: rechtes Bein mit dem Riss vorn, rechte Faust vorn auf Kinnhöhe, linke Faust am Kinn, Stiefel deutlich weiter
  als schulterbreit, beide Sohlen flach, Knie leicht gebeugt.
- Danach bewegen sich die Füße nicht mehr (kein Hüpfen, kein Nachsetzen, kein Gleiten); Vela wird nicht größer, rückt nicht näher, wandert nicht.
- Die Atmung ist klar sichtbar (Schultern heben und senken sich), die zwei Atemzüge sind gleich lang, kein Einfrieren und kein Posenwechsel in der letzten
  Sekunde.
- Gesicht, blonder Zopf, Jacke, Armschienen, Stil und weißer Grund wie bei `laufen`.

### Schnitt und Umsetzen (stand)

- Rohvideo zerlegen und vermessen wie bei `laufen` (Oberkante, Unterkante, Schwerpunkt je Bild). Bild 1 muss die A-Pose mit 926 Zeilen sein, sonst
  `--faktor` = 142 / Zeilen der A-Pose. Ab der Kampfhaltung Unterkante 926 ± 2, Figur niedriger als in Bild 1, kein Wandern.
- `--ankerx-video` = gemessene Mitte zwischen den Stiefeln (die Voreinstellung kippt bei breitem Stand auf einen Stiefel, siehe
  `vela_hd_clips.sh`); nicht `--ankerx mittel`.
- Probelauf über den Hauptteil (Soll: `--ab 49 --bis 145`) mit der gemessenen Atemzuglänge als `--zyklus`, dann Endlauf mit genau einem Zyklus
  (`--ab` = Zyklusbeginn, `--bis` = Beginn + Länge − 1), `--ereignis keine --faktor 0.1533`. Der Zyklus beginnt am besten ausgeatmet.
- Ein Atemzug unter etwa 38 Bildern (1,6 s) wirkt im Spiel hektisch (Schätzung); dann ein anderes Video nehmen.

## gehen (Clip `gehen`: lockeres Gehen auf der Stelle, Schleife über einen Doppelschritt)

Plan: 0 bis 0,6 s Drehung, 0,6 bis 2,0 s Einschwingen, 2,0 bis 6,0 s gleichmäßiges Gehen, Doppelschritt etwa 1,0 bis 1,1 s (vier Doppelschritte).
Das Tempo im Video ist nicht kritisch: das Spiel streckt den Zyklus über die gemessene Schrittlänge, damit der Standfuß nicht rutscht.

```text
FIGUR: Vela ist die Figur der Referenz @Vela. Vela bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales ovales Gesicht mit blaugrauen Augen, gerader schmaler Nase und vollen natürlichen Lippen, kein Make-up, junge Frau; im Profil bleibt es dasselbe Gesicht, gleiche Nase, gleiches Kinn. Mittelblondes (weizenblondes) Haar als ein einziger hoher, leicht welliger Pferdeschwanz mit kleinem königsblauem Haargummi; die Haarfarbe bleibt in jedem Bild mittelblond (nie rötlich, nie weißblond, nie dunkel), der Pferdeschwanz bleibt ein einziger hoher Zopf. Kurze kobaltblaue Lederjacke mit Stehkragen, offenem Reißverschluss mit goldenen Zähnen, genau einem breiten orangen Querstreifen über der Brust und goldbeigen Nähten; darunter ein enges dunkelmarineblaues Top. Indigoblaue Jeans mit zwei kleinen Rissen (einer am Knie des rechten Beins, einer am Oberschenkel des linken Beins), schwarze abgewetzte Schnürstiefel mit dicker Profilsohle. An beiden Unterarmen silbergraue Stahl-Armschienen, darunter fingerlose dunkelblaue Lederhandschuhe mit freien Fingern; die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen. Stil: Comic-Tuschezeichnung mit feiner dunkler Kontur um die ganze Figur und handkolorierten Flächen mit sichtbarer Textur in Leder, Jeans und Metall, exakt im Zeichenstil der Referenz. Kein Stilwechsel während des Videos: kein Foto, keine Hautporen, kein Fotolicht, kein 3D-Render, kein Cel-Shading, keine Pixelgrafik. Die dunkle Kontur ist in jedem Bild gleich dünn und schließt die Figur rundum ein, auch jede helle Stelle. Kein Teil der Figur ist reinweiß oder fast weiß: Glanzlichter auf Armschienen, Stiefelkappen, Haut, Haar und Nähten bleiben getönt, nie heller als sehr helles Grau. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiger reinweißer Hintergrund (RGB 255, 255, 255) in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein Grau, kein Creme, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang.

BILD: Quadratisches Bild. Das erste Bild des Videos ist die Referenz @Vela (frontal, A-Pose, ganze Figur). Feste Kamera ohne jede Bewegung: kein Zoom, kein Heranfahren, kein Wegfahren, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren; die Kamera schaut waagrecht auf Vela und kreist nie um sie, nur Vela dreht sich, danach sieht die Kamera sie streng von der Seite. Der Bildausschnitt ist in jedem Bild derselbe wie im ersten Bild. Der Maßstab des ersten Bildes gilt für das ganze Video: Vela ist in jedem Bild so groß wie im ersten Bild (gleiche Kopfgröße, gleiche Körperproportionen), nie größer und nie kleiner, und sie rückt nicht näher an die Kamera. Ihr höchster Punkt liegt nie höher als im ersten Bild; beim Gehen bleibt er auf nahezu gleicher Höhe. Die Sohle mindestens eines Stiefels liegt in jedem Bild auf derselben Höhe im Bild wie die Sohlen im ersten Bild; darunter und daneben bleibt alles reinweiß. Die Mitte von Hüfte und Rumpf liegt in der Bildmitte, dort, wo Velas Körpermitte im ersten Bild steht. Vela wandert nie durch das Bild, hüpft nicht und schwebt nicht. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefel, Hände und Zopfspitze; nichts wird am Bildrand abgeschnitten.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher grauer Schatten, kein hellgrauer Fleck unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

ABLAUF: Ein einziger Durchlauf in drei Abschnitten ohne Pause und ohne Schnitt; Drehung und Einschwingen kommen nur einmal vor. 0,0 bis 0,6 s: Das erste Bild ist die Referenz @Vela, frontal in der A-Pose; die Arme sinken, und Vela dreht sich auf der Stelle ins strenge Profil nach rechts. 0,6 bis 2,0 s: Einschwingen, die ersten Schritte. 2,0 bis 6,0 s: Hauptteil, gleichmäßiges Gehen im immer gleichen Takt bis zum letzten Bild. Ein Doppelschritt reicht vom Aufsetzen der rechten Ferse bis zum nächsten Aufsetzen der rechten Ferse (ein rechter und ein linker Schritt) und dauert etwa 1,0 bis 1,1 Sekunden, also etwa zwei Schritte je Sekunde. Jeder Doppelschritt wiederholt den vorigen genau: gleiche Schrittlänge, gleicher Armschwung, gleiche Haltung, gleiche Größe. Ab 2,0 s gibt es kein Beschleunigen, kein Abbremsen, kein Anhalten und keine neue Bewegung, auch in den letzten Sekunden nicht: Vela geht bis zum letzten Bild im selben Takt weiter.

HANDLUNG: Übergang (0,0 bis 0,6 s): Vela steht zuerst wie in der Referenz frontal in der A-Pose, aufrecht, die Arme schräg nach unten gestreckt. Dann dreht sie sich auf der Stelle um etwa 90 Grad nach ihrer linken Seite, also im Bild nach rechts: ihr Gesicht zeigt danach im Bild nach rechts, ihre rechte Schulter kommt zur Kamera hin, ihre linke Schulter geht von der Kamera weg, und die Kamera sieht ihre RECHTE Körperseite (Riss am rechten Knie). Beim Drehen bleiben die Füße an ihrem Platz und ihr Rücken zeigt nie zur Kamera; sie dreht sich nicht weiter, nicht zurück und nie in die Gegenrichtung, sie nähert sich der Kamera nicht und blickt danach nie nach links; die Kamera dreht sich nicht mit. Dabei sinken die Arme in etwa 0,3 Sekunden locker neben den Körper. Strenges Profil: Ab 0,6 s bis zum letzten Bild zeigen Velas Gesicht und ihre Stiefelspitzen nach rechts im Bild, Schultern und Becken bleiben im Profil, und die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm mit silbergrauer Armschiene, rechtes Bein mit dem Riss am Knie); die linke Seite ist größtenteils verdeckt. Vela dreht sich nicht mehr und geht nie rückwärts. Einschwingen (0,6 bis 2,0 s): Aus dem Stand im Profil mit locker hängenden Armen beginnt Vela zu gehen; die ersten Schritte sind etwas kleiner und schwingen sich im Takt des Hauptteils auf das volle Maß ein. Gang (ab 2,0 s): Vela geht auf der Stelle ruhig und entspannt im Alltagstempo, ihr Körper bleibt an seinem Platz im Bild. Der Oberkörper ist aufrecht und senkrecht (nicht nach vorn geneigt), der Rücken gerade, die Schultern locker, der Kopf aufrecht, der Blick geradeaus nach rechts. Kopf und Schultern bleiben auf nahezu gleicher Höhe, kein Hüpfen, kein Wippen. Beine: Vorn ist die Blickrichtung (im Bild rechts), hinten ist im Bild links. Die Schritte sind natürlich und raumgreifend, nicht kurz und nicht überdehnt: Setzt die Ferse des vorderen Fußes auf, ist sie etwas mehr als eine Unterschenkellänge (Knie bis Stiefelsohle) von der Spitze des hinteren Stiefels entfernt, der noch mit den Zehen aufgesetzt ist. Die Knie heben sich nur mäßig, die Sohle des Schwungfußes hebt sich nur wenig ab (höchstens etwa eine Handbreit). Jeder Fuß setzt zuerst mit der Ferse vor dem Körper auf, rollt über die ganze Sohle ab und löst sich hinter dem Körper mit der Fußspitze zuletzt. Es gibt keine Flugphase: in jedem Bild ist mindestens ein Fuß aufgesetzt. Der aufgesetzte Fuß (Standfuß) gleitet unter Vela gleichmäßig nach hinten (wie bei einem Gang auf der Stelle), nie nach vorn; Vela selbst rückt im Bild nicht vor. Das der Kamera zugewandte rechte Bein ist in jedem Bild das nähere und verdeckt das linke Bein, wo sich beide überlappen. Die Beine kreuzen sich nie wie eine Schere und tauschen nie die Seiten. Arme: Die Arme schwingen mäßig und gleichmäßig im Gegentakt zu den Beinen, im Ellbogen nur leicht gebeugt (etwa 30 Grad): ist das der Kamera zugewandte rechte Bein vorn, ist der rechte Arm hinten und der linke vorn, beim nächsten Schritt umgekehrt; nie beide Arme gleichzeitig vorn. Wenn die Beine einander passieren, hängen beide Arme kurz nebeneinander am Körper. Die Hände sind locker, die Finger leicht gekrümmt, keine Fäuste, nie erhoben, zwischen Hüfthöhe und Oberschenkelmitte (die Handschuhe bleiben fingerlos, die Armschienen silbergrau). Der Pferdeschwanz wippt sanft im Takt und bleibt ein einziger hoher Zopf mit blauem Haargummi, keine zusätzlichen Haarbüschel. Es gibt nie mehr als zwei Arme und zwei Beine.

ENDE: Das Video endet noch mitten im Gehen (kein Anhalten, kein Abbremsen, kein Stehenbleiben, keine Schlusspose) in derselben Pose, in der jeder Doppelschritt beginnt (Schleife): strenges Profil nach rechts, das der Kamera nahe rechte Bein ist vorn, die Ferse gerade aufgesetzt, das Bein fast gestreckt, der linke Stiefel steht hinten nur noch auf den Zehen, der rechte Arm schwingt hinten, der linke vorn, der Oberkörper ist aufrecht. Nochmals das Wichtigste: reinweißer Hintergrund in jedem Bild, feste Kamera, Vela bleibt gleich groß wie im ersten Bild und in der Mitte, nach der Drehung strenges Profil nach rechts, aufrechtes lockeres Gehen mit Armen im Gegentakt, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### Prüfen (gehen)

- Bild 1 A-Pose, Drehung nach rechts wie bei `stand`.
- Sie geht und joggt nicht: Oberkörper senkrecht, Ferse zuerst, Knie nur mäßig gehoben, immer mindestens ein Fuß unten, Hände locker auf Hüfthöhe, keine
  Fäuste.
- Arme im Gegentakt (rechtes Bein vorn, rechter Arm hinten), nie beide Arme vorn, Beine kreuzen sich nie und tauschen nie die Seiten.
- Vela bleibt an ihrem Platz und gleich groß, der Standfuß gleitet nach hinten.
- Ab etwa 2 bis 2,5 s mindestens drei gleich lange Doppelschritte, kein Abbremsen, kein Stehenbleiben am Ende.

### Schnitt und Umsetzen (gehen)

- Rohvideo vermessen wie bei `stand`; ab dem Schnittbeginn Unterkante 926 ± 3 (springt sie nach oben, gibt es eine Flugphase: anderer Abschnitt oder
  anderes Video).
- Abschnitt mit gerade aufgesetzter rechter Ferse beginnen, Zykluslänge am Kontaktblatt auszählen (24 bis 26 Bilder erwartet) und fest vorgeben: die
  Suche wählt wegen der Aufnäherseite wahrscheinlich den halben Doppelschritt (bei `laufen` 8 statt 16).
- Befehl (Soll): `umsetzen gehen <video> --ab 49 --bis 144 --zyklus 24 --ereignis keine --ankerx mittel --faktor $M`, ohne `--schritt lauf`.
- In clip.txt prüfen: `zyklus_schluss_in_schritten` höchstens 60 (`SCHLUSS_GUT`), `schritt_px` und `zyklus_ticks` (= `schritt_px` / 1,75, 12 bis 60; alter
  Clip 68 und 39). Ein `schritt_px` deutlich unter etwa 56 (Schätzung) lässt das Gehen im Spiel fast im Sprinttakt laufen.

## Weitere Prompts

Kette 1 bis 4, Sprung, Sprungtritt, Treffer von vorn, Umfallen mit Liegen und Aufstehen, Griff und Wurf (mit Startbildern für Platz im Bild):
`docs/grok-prompts-vela-neu-angriffe.md`.
