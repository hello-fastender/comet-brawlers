# Grok-Prompts für die Gegnerin Darja (Arbeitsname)

Stand 2026-10-17, Entwurf. Erste Gegnerin nach dem Weg der neuen Vela
(`docs/grok-prompts-vela-neu.md`): zuerst ein Referenzbild (frontal,
A-Pose), daraus die Referenz `@Darja` in Grok, dann die Videos. Der Clip
`stand` trägt die festen Bausteine (FIGUR, HINTERGRUND, BILD, VERBOTEN,
KAMPFHALTUNG), auf denen alle weiteren Videos aufbauen.

Vorlage für die Kleidung ist ein Foto des Nutzers: enger, dunkler
Einteiler mit Leggings, schwarze Stiefeletten. Das Foto zeigt eine
wirkliche Person. Es dient nur als Vorlage für die Kleidung und kommt
nicht als Bild oder Referenz in Grok; Gesicht und Person sind erfunden
(`docs/figuren.md`, Abschnitt 1, „Personen“). Koffer und Umgebung des
Fotos gehören nicht zur Figur.

Rolle und Name sind offen. Der Weg der Gegner (A oder B,
`docs/entwuerfe/gegner-soldaten.md`, S1) ist noch nicht entschieden.
Schlank und beweglich käme die Rolle Springerin in Frage (Schweifer,
`docs/figuren.md`, Abschnitt 5). Dort ist die Springerin aber eine
Gesungene von etwa 20 mit Kapuze, Knieschützern, Atemmaske und Reif;
Darja passt erst nach einer Entscheidung des Nutzers (S1 in
`docs/entwuerfe/gegner-soldaten.md` oder eine Änderung in
`docs/figuren.md`). Werte und Umriss kommen aus
`docs/design-gegner-stages.md`, nicht aus diesem Prompt.

## Grüner Hintergrund ab 2026-10-17

Entscheidung des Nutzers: Neue Figuren entstehen vor Chroma-Grün, nicht
mehr vor Weiß.

- **Warum:** Vor Weiß stellt der Umsetzer im Modus `ecke` alles frei, was
  hell ist. Bei der neuen Vela entstanden so Löcher in hellen
  Glanzlichtern, weiße Lücken zwischen Haarsträhnen, Nacken und Kragen und
  ein grauer Bodenschatten; dagegen helfen nur `--loch`, `--haarloch` und
  `--schatten` (`docs/godot.md`, „Video-Umsetzer“). Im Standardmodus
  `--schluessel gruen` ist Hintergrund, was grün dominiert, nicht was
  hell ist. Glanzlichter und helle Haut bleiben Figur. Lücken im Haar
  zeigen Grün; offene und breite Lücken fallen weg, schmale
  eingeschlossene Lücken füllt der Umsetzer aber als Figur (mittlerer
  Abstand zur Schlüsselfarbe über `--loch`, Standard 24), und zwar in
  entgrüntem Grün, also dunklem Petrol. Ein dunkelgrüner Schatten fällt
  aus der harten Maske, kommt aber unter den Sohlen im weichen Rand als
  fast schwarzer Saum zurück; ein grauer Schatten bleibt ganz Figur, und
  `--schatten` wirkt nur im Modus `ecke`. Darum verbieten die Prompts
  Schatten weiter und verlangen ein geschlossenes Haar.
- **Grün:** RGB 0, 177, 64, flach, in jedem Bild gleich, wie der Umsetzer
  es erwartet (`docs/godot.md`, „Video-Umsetzer“).
- **Neue Regeln für die Figur:** nichts an der Figur ist grün, oliv oder
  türkisgrün, auch nicht die Augen; Stoffe und Leder sind matt, damit sich
  das Grün nicht spiegelt; kein Gegenlicht und kein Randlicht, sonst
  entsteht ein grüner Lichtsaum. Dunkles Haar mischt sich am Rand mit dem
  Grün zu einem olivfarbenen Saum; der Umsetzer entmischt ihn, im
  Spielmaßstab ist er nicht sichtbar (`docs/godot.md`). Am
  empfindlichsten sind die dunkelsten Töne, weil der Schlüssel relativ
  misst: Schon ein Schwarz von 16, 30, 18 ist Grund. Schwarz der
  Stiefeletten, dunkles Haar und die Schatten im Anzug müssen neutral,
  warm oder bläulich bleiben, nie grünstichig. Bilder, in denen Haar
  oder Schuhe ganz ins Olivgrüne driften (alte Vela auf Grün), rettet der
  Umsetzer nicht; sie fallen mit `--ausser` weg.
- **Reinweiß** stellt der Umsetzer im Modus `gruen` nicht frei. Die Regel
  „nie Weiß“ in `docs/figuren.md` (Abschnitt 1) bleibt trotzdem stehen,
  bis sie dort geändert ist; Darja trägt kein Weiß.
- **Folge für andere Figuren:** Im Modus `gruen` begrenzt der Umsetzer in
  jedem Figurpixel Grün auf das Größere von Rot und Blau. Rins
  Tannengrün, der hellgrüne Kern der Orriniden und der grüne Schimmer in
  Linus' Brille fallen ganz oder teilweise weg; Oliv (Chorknabe A,
  Stapler A) und Moosgrün (Kord als zweiter Spieler) bleiben Figur,
  verlieren aber ihren Grünton. Für sie braucht es einen anderen Grund
  (etwa Magenta mit `--schluessel ecke`) oder andere Farben (F2 in
  `docs/figuren.md`). Darja ist davon nicht betroffen.

## 1. Referenzbild (Grok Imagine, Bild)

Neu gebaut nach dem Prompt, aus dem Velas Referenzbild entstanden ist
(vom Nutzer am 2026-10-17 mitgeteilt): gleiche Gliederung, gleicher
STIL-Absatz, gleiche Pose und gleiche Regeln für Hände und Finger.
Geändert sind: kein Foto (Gesicht erfunden), Kleidung nach der Vorlage
des Nutzers, kein Orange und kein Gold, grüner statt weißer Hintergrund
mit den Regeln gegen grüne Reflexe, Vorlage für Videos statt für ein
3D-Modell.

Bild, Format 1:1, höchste Auflösung, ohne Anhang. Mehrere Bilder
erzeugen und das wählen, bei dem Gesicht, Maske, Hände und Stiefeletten
sauber sind, rundum Grün zu sehen ist, das Haar hinter Ohren und
Schultern liegt und die Bandage nur am rechten Handgelenk sitzt (im
Bild links). Das Grün muss nicht genau RGB 0, 177,
64 treffen: Der Umsetzer nimmt die Farbe des Randes, sie muss aber
einfarbig und kräftig grün sein: Liegt Grün am Rand weniger als 60
Stufen über Rot und Blau, fällt der Umsetzer auf den Modus `ecke`
zurück. Weil Bild 1 jedes Videos die Referenz ist, verlangen die
Video-Prompts „dasselbe Grün wie im ersten Bild“. Kein heller oder
weißer Saum um die Figur: Weiß ist im Modus `gruen` Figur und stünde
über Bild 1 in jedem Video; Vorsicht also mit Velas Bild (weißer Grund)
als Anhang.

Wird der Stil trotzdem glatter als bei Vela (erster Versuch am
2026-10-17 mit dem alten Prompt: Mode-Illustration mit glatten
Verläufen, dünner gleichmäßiger Kontur und überschlanker Taille),
Velas Referenzbild als zweites Bild anhängen und den Satz unter dem
Prompt an das Ende von STIL setzen, oder ein passendes Bild über
Abschnitt 1b umzeichnen lassen.

```text
AUFGABE: Zeichne eine Soldatin als Gegnerin für die Figurenvideos eines 2D-Prügelspiels: Ganzkörper, genau von vorn gesehen, in einer neutralen A-Pose, auf einfarbig grünem Hintergrund. Sie erscheint im Spiel in vielen gleichen Exemplaren und trägt darum eine Maske, die ihr Gesicht zur Hälfte verbirgt.

PERSON: Darja, eine junge Frau Mitte zwanzig mit slawischen Gesichtszügen: schmales Gesicht mit hohen, ausgeprägten Wangenknochen und klarer Kieferlinie, helle graublaue Augen, gerade schmale Nase, schmale dunkle Augenbrauen, volle Lippen, helle Haut mit warmem Unterton, dezentes Make-up.

MASKE: Eine venezianische Halbmaske aus mattem, hellgrauem Pappmaché (kalkgrau mit leichtem Blaustich, nie weiß) bedeckt Stirn, Augenpartie, Nasenrücken und die oberen Wangen. Die Augenöffnungen sind mandelförmig und an den äußeren Enden leicht nach oben gezogen, durch sie sieht man die graublauen Augen; der Rand ist schlicht und leicht erhaben. Nasenspitze, Mund, Kinn und Kieferlinie bleiben frei. Ein schmales dunkelgraues Band hält die Maske hinter dem Kopf, unter dem Haar verborgen. Die Maske ist glatt und matt, ohne Glanz, ohne Gold, ohne Federn, ohne Glitzer und ohne Verzierung; sie sitzt fest und verrutscht nie.

GESICHT UND HAARE: Neutraler, kühler Gesichtsausdruck, Mund geschlossen, Blick geradeaus in die Kamera, Kopf gerade. Feine, natürliche Hauttextur mit weicher Schattierung, einzelne Wimpern, kein Porzellan- oder Puppenlook. Langes, glattes Haar in dunklem Schokoladenbraun mit Mittelscheitel, offen und hinter beide Ohren gestrichen; es besteht aus vielen gezeichneten Strähnen mit weichen Lichtreflexen, die dicht aneinander liegen (eine geschlossene Haarfläche ohne Lücken, durch die Grün scheint), liegt hinter den Schultern und fällt als glatte, geschlossene Fläche mit gerade geschnittenen Spitzen über den Rücken bis unter die Schulterblätter, ohne abstehende oder fliegende Strähnen. Das Haar verdeckt weder Hals noch Schultern noch Arme. Die Haarfarbe ist dunkel schokoladenbraun, nie schwarz, nie rötlich, nie blond, nie aschig oder grünlich. Keine Ohrringe.

KLEIDUNG UND MATERIALIEN, alles mit gut sichtbarer Oberflächenstruktur und leichter Abnutzung:

- Eng anliegende, einteilige Kleidung aus dickem, mattem, blickdichtem Stretch-Jersey in mitteldunklem, gedecktem Graublau, heller als die Stiefeletten, mit feiner Rippenstruktur, sichtbaren Nähten an den Seiten und Schultern und flachen Falten an Hüfte, Kniekehlen und Knöcheln; oben ärmellos mit breiten Trägern und kleinem V-Ausschnitt, unten eng anliegende Leggings bis zu den Knöcheln; Oberteil und Leggings gehen an der Taille ohne Naht ineinander über. Der Stoff ist an den Knien leicht ausgeblichen und glänzt nicht.

- Elegante, spitze schwarze Stiletto-Stiefeletten wie zu einem Abendkleid: schmaler, eng anliegender Schaft bis knapp über den Knöchel aus feinem, mattem Glattleder ohne Glanz mit feinen Gebrauchsfalten am Knöchel, lang und spitz zulaufende Kappe, hoher, dünner Stilettoabsatz; die Leggings stecken darin. Der Absatz ist dünn, aber klar gezeichnet und immer vollständig zu sehen.

- Nur um ihr rechtes Handgelenk (im Bild links) eine kurze, dunkelgraue Stoffbandage wie bei einer Kämpferin; ihr linkes Handgelenk ist frei.

Keine Jacke, keine Handschuhe, kein Gürtel, kein Schmuck, keine Tasche, keine Abzeichen, Logos oder Aufdrucke.

PROPORTIONEN: Athletische Proportionen einer schlanken Kämpferin wie in modernen Superhelden-Comics: etwa 7,5 Kopflängen hoch, lange Beine (etwas mehr als die Hälfte der Körperhöhe), sportliche Schultern und Arme, kräftige Oberschenkel, natürliche Taille, normale Hände und Füße. Keine übertriebene Sanduhrfigur, keine Modelproportionen, keine Chibi-, Spielzeug- oder Cartoon-Proportionen, kein großer Kopf.

STIL: Moderne, preisgekrönte amerikanische Superhelden-Comickunst auf Eisner-Award-Niveau, realistisch und hochdetailliert: kraftvolle Figur mit starker, klarer Silhouette, realistische, leicht übersteigerte Anatomie, innen feine Tuschelinien mit wechselnder Strichstärke und Schraffur für Falten, Nähte und Gesichtszüge (keine dicke Außenkontur), darüber malerisch koloriert mit satten, eher kühlen Farben und tiefen Schwarztönen. Alle Materialien sind klar unterscheidbar (Stoff, Leder, Haut, Haar) und haben feine Textur und Abnutzung. Kein Foto, kein Plastik- oder Puppenlook, keine glatte 3D-Render-Optik, keine glatte Airbrush-Malerei, keine Mode-Illustration, keine flache Zeichnung. Weiches, gleichmäßiges, neutrales Licht von vorn mit sanften Faltenschatten, keine harten Schlagschatten, keine starken Glanzlichter, keine dramatische Beleuchtung, kein Gegenlicht und kein Randlicht.

POSE: Symmetrische A-Pose. Beide Arme sind gestreckt und etwa 35 Grad vom Körper abgespreizt, zwischen Armen und Rumpf ist deutlich Platz. Die Hände sind offen und entspannt, jede Hand zeigt deutlich fünf getrennte Finger (vier Finger und einen Daumen), die Finger sind leicht gespreizt, der Daumen ist abgespreizt, und die Hand ist so gedreht, dass man alle fünf Finger einzeln sieht. Keine Fäuste, keine verdeckten Finger. Die Beine sind gerade und schulterbreit auseinander, die Füße stehen fest auf Ballen und Absatz und zeigen nach vorn, zwischen den Beinen ist ein deutlicher Spalt.

BILD: Quadratisches Bild. Die ganze Figur ist vollständig sichtbar, mittig, etwa 85 Prozent der Bildhöhe, mit Rand rundum. Hände und Finger sind gut sichtbar und nicht verdeckt. Feste Kamera, waagrechter Blick, keine Verzerrung, keine Perspektive von oben oder unten. Einfarbig grüner Hintergrund in Chroma-Key-Grün (RGB 0, 177, 64), überall gleich, ohne Boden, ohne Schatten, ohne Verlauf, ohne Vignette. Nichts vom Grün fällt auf die Figur: kein grüner Schimmer, kein grüner Lichtsaum und keine grünen Reflexe auf Haut, Haar, Stoff oder Leder.

VERBOTEN: Lächeln, Fäuste, verschmolzene, fehlende oder zusätzliche Finger (jede Hand hat genau fünf Finger), gekreuzte oder verdeckte Arme, angeschnittene Figur, zweite Personen, Waffen, Schrift, Logos, Wasserzeichen, Rahmen, dicke Außenkontur, Skizze, Grün, Olivgrün oder Türkis an der Figur (auch keine grünen Augen), Glanz, Orange, Gold, Federn, Glitzer, Schmuck, Tasche, Boden, Schatten.
```

Satz für STIL, nur mit Velas Referenzbild als zweitem Bild:

```text
Zeichenstil exakt wie im angehängten Bild der blonden Heldin, aber eine andere Person mit anderer Kleidung und grünem statt weißem Hintergrund; von dem Bild nur den Stil übernehmen.
```

Maske, weil Darja eine Soldatin ist, die in vielen gleichen Exemplaren
auftritt (Wunsch des Nutzers vom 2026-10-17): Gleiche Gesichter fallen
in einer Gruppe als Klone auf, gleiche Masken lesen sich als Trupp. Die
venezianische Halbmaske greift den Wunsch nach venezianischen Masken
auf. Sie ist hellgrau statt schwarz: Ein schwarzes Band über hellem
Gesicht ist das Merkmal des Vorbilds (Captain Commando mit dunklem
Visier, die SAMSON-Gegner mit schwarzen Augenmasken,
`docs/entwuerfe/gegner-masken.md`, 6.1), und kein Gegner trägt Schwarz
(`docs/figuren.md`, Abschnitt 2). Der Masken-Entwurf schließt
Halbmasken bisher ganz aus (6.4, Regel 5), weil sie auf Spielgröße
kaum tragen; das ist dort noch nicht entschieden (M8, M9), hier gilt
der Wunsch des Nutzers. Hellgrau vor dunklem Haar trägt auf Spielgröße
besser als Schwarz vor heller Haut. Andere Masken, jeweils als Ersatz
für den ganzen Absatz MASKE:

```text
MASKE: Eine glatte, ausdruckslose Vollmaske aus mattem, kalkgrauem Pappmaché mit leichtem Blaustich, nie fast weiß, bedeckt das ganze Gesicht von der Stirn bis unter das Kinn, mit schmalen Augenöffnungen, angedeuteter Nase und geschlossenen Lippen; ein schmales schwarzes Band hält sie hinter dem Kopf, unter dem Haar verborgen. Ohne Glanz, ohne Gold, ohne Verzierung.
```

```text
MASKE: Ein eng anliegendes, mattes, dunkelgraues Gesichtstuch aus Stoff bedeckt Nase, Mund und Kinn bis zu den Wangenknochen; Augen, Augenbrauen und Stirn bleiben frei.
```

```text
MASKE: Eine Atemmaske aus mattem Stahl bedeckt Nase und Mund, mit einer runden Filterdose an der rechten Wange und einem schwarzen Gummiband hinter dem Kopf; Augen, Augenbrauen und Stirn bleiben frei.
```

Die Vollmaske ist auf Spielgröße am deutlichsten und am unheimlichsten,
zeigt aber nichts mehr vom Gesicht. Das Gesichtstuch wirkt am
soldatischsten. Die Atemmaske ist das Zeichen der Gesungenen
(`docs/figuren.md`, Abschnitt 5) und passt zu Weg A.

Pumps statt Stiefeletten, als Ersatz für den Punkt zu den Schuhen:

```text
- Elegante, spitze schwarze Pumps wie zu einem Abendkleid aus feinem, mattem Glattleder ohne Glanz, mit lang und spitz zulaufender Kappe und hohem, dünnem Stilettoabsatz; die Leggings enden an den Knöcheln. Der Absatz ist dünn, aber klar gezeichnet und immer vollständig zu sehen.
```

## 1b. Stil an Vela angleichen (Grok Imagine, Bild bearbeiten)

Für ein vorhandenes Bild von Darja, dessen Person, Kleidung und Pose
stimmen, das aber zu glatt gezeichnet ist; der Prompt setzt zugleich
Maske und Stiletto-Stiefeletten ein (Wunsch des Nutzers vom 2026-10-17). Zwei Bilder anhängen: Bild 1
ist Darja, Bild 2 ist Velas Referenzbild.

```text
Zeichne die Frau aus Bild 1 neu, im Zeichenstil von Bild 2, mit vier Änderungen. Aus Bild 1 bleiben genau: dieselbe Person, dasselbe lange dunkelbraune Haar, dieselbe dunkelgraublaue, einteilige Kleidung mit Leggings; dieselbe frontale A-Pose, derselbe Bildausschnitt, dieselbe Größe im Bild und derselbe einfarbig grüne Hintergrund. Änderung 1, Maske: Sie trägt eine venezianische Halbmaske aus mattem, hellgrauem Pappmaché (kalkgrau mit leichtem Blaustich, nie weiß), die Stirn, Augenpartie, Nasenrücken und die oberen Wangen bedeckt, mit mandelförmigen, an den äußeren Enden leicht nach oben gezogenen Augenöffnungen und schlichtem, leicht erhabenem Rand; Nasenspitze, Mund, Kinn und Kieferlinie bleiben frei; ein schmales dunkelgraues Band hinter dem Kopf ist unter dem Haar verborgen; die Maske ist glatt und matt, ohne Glanz, Gold, Federn, Glitzer oder Verzierung. Änderung 2, Schuhe: Statt der Stiefeletten mit Blockabsatz trägt sie elegante, spitze schwarze Stiletto-Stiefeletten wie zu einem Abendkleid, mit schmalem, eng anliegendem Schaft bis knapp über den Knöchel aus feinem, mattem Glattleder ohne Glanz, lang und spitz zulaufender Kappe und hohem, dünnem Stilettoabsatz; die Leggings stecken darin. Änderung 3, Handgelenk: Nur um ihr rechtes Handgelenk (im Bild links) eine kurze, dunkelgraue Stoffbandage; ihr linkes Handgelenk bleibt frei. Änderung 4, Haar: Das Haar ist hinter beide Ohren gestrichen und liegt hinter den Schultern; es fällt als glatte, geschlossene Fläche über den Rücken, keine Strähne liegt vor Schultern, Brust oder Armen. Aus Bild 2 kommt nur der Zeichenstil, nicht die Person, nicht die Kleidung, nicht die Haarfarbe und nicht der weiße Hintergrund. Der Zeichenstil von Bild 2: moderne amerikanische Superhelden-Comickunst, realistisch und hochdetailliert; innen feine Tuschelinien mit wechselnder Strichstärke und Schraffur für Falten, Nähte und Gesichtszüge, keine dicke Außenkontur; darüber malerisch koloriert mit satten Farben und tiefen Schwarztönen; alle Materialien klar unterscheidbar mit feiner Textur und Abnutzung, der Stretchstoff mit feiner Rippenstruktur, Nähten und Falten an Hüfte, Kniekehlen und Knöcheln, das Haar aus vielen gezeichneten Strähnen mit weichen Lichtreflexen, dicht und geschlossen, ohne Lücken, durch die Grün scheint; die sichtbare Haut mit feiner, natürlicher Textur und weicher Schattierung. Die Proportionen werden realistischer und athletischer wie bei einer Kämpferin: etwas kräftigere Schultern, Arme und Oberschenkel, natürliche Taille. Weiches, gleichmäßiges Licht von vorn mit sanften Faltenschatten. Der Hintergrund bleibt einfarbig flaches Grün ohne Boden und ohne Schatten; nichts an der Figur wird grün, kein grüner Schimmer auf Haut, Haar, Stoff, Maske oder Schuhen. Kein Foto, kein Plastik- oder Puppenlook, keine glatte 3D-Render-Optik, keine glatte Airbrush-Malerei, keine Mode-Illustration, keine flache Zeichnung, keine Schrift.
```

## 2. Referenz in Grok

Name `Darja`, Kategorie Charakter, Bild: das gewählte Referenzbild.
Beschreibung:

```text
Darja, Gegnerin eines Prügelspiels. Realistischer Comic mit feiner Tuschelinie und Texturen. Soldatin, die in vielen gleichen Exemplaren auftritt. Junge Frau mit slawischen Gesichtszügen, hohen Wangenknochen und graublauen Augen, langes glattes Haar in dunklem Schokoladenbraun mit Mittelscheitel, offen, hinter die Ohren gestrichen, über den Rücken fallend. Venezianische Halbmaske aus mattem hellgrauem Pappmaché über Stirn, Augen, Nasenrücken und oberen Wangen; Mund und Kinn frei. Eng anliegende, einteilige, matte Kleidung in mitteldunklem, gedecktem Graublau, heller als die Stiefeletten, oben ärmellos mit kleinem V-Ausschnitt, unten Leggings. Spitze schwarze Stiletto-Stiefeletten aus mattem Leder. Dunkelgraue Bandage nur am rechten Handgelenk. Keine Waffe, kein Schmuck. Immer dieselben Gesichtszüge, Kleidung und Proportionen, den Zeichenstil nie ändern.
```

Einstellungen für jedes Video wie bei Vela: 6 s, Format 1:1, höchste
Auflösung (mindestens 720 Pixel), 24 Bilder je Sekunde, ohne Ton.

## 3. stand (Kampfhaltung, ruhig atmend, Schleife)

Aufbau und Zeitplan wie `stand` bei Vela: 0 bis 0,6 s Drehung aus der
A-Pose ins Profil nach rechts, 0,6 bis 1,6 s in die Kampfhaltung, 1,6
bis 2,0 s ruhig, 2,0 bis 6,0 s zwei Atemzüge zu je 2,0 s. Die
Kampfhaltung unterscheidet sich von Velas Boxerstand: aufrechter, offene
Hände statt Fäusten, damit Darja auf Spielgröße nicht wie eine zweite
Vela wirkt. Die Blickrichtung links erzeugt das Spiel durch Spiegeln.

```text
FIGUR: Darja ist die Figur der Referenz @Darja. Darja bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales Gesicht mit hohen Wangenknochen, hellen graublauen Augen und vollen natürlichen Lippen, junge Frau, mit derselben venezianischen Halbmaske aus mattem, hellgrauem Pappmaché (kalkgrau mit leichtem Blaustich, nie weiß) über Stirn, Augenpartie, Nasenrücken und oberen Wangen; Nasenspitze, Mund und Kinn bleiben frei. Die Maske sitzt fest, verrutscht nie, glänzt nicht und hat keine Verzierung; im Profil bleibt es dasselbe Gesicht mit derselben Maske, gleiche Nasenspitze, gleiches Kinn. Langes, glattes Haar in dunklem Schokoladenbraun, offen und hinter beide Ohren gestrichen; es fällt als glatte, geschlossene Fläche mit gerade geschnittenen Spitzen über den Rücken bis unter die Schulterblätter, ohne abstehende oder fliegende Strähnen, und liegt dicht an Nacken und Rücken an, ohne Lücken, durch die Grün scheint; im Profil liegt es hinter Ohr, Nacken und Schultern, das Gesicht bleibt frei. Die Haarfarbe bleibt in jedem Bild dunkel schokoladenbraun (nie schwarz, nie rötlich, nie blond, nie olivgrün). Eng anliegende, einteilige Kleidung aus mattem, dickem, blickdichtem Stretchstoff in mitteldunklem, gedecktem Graublau, heller als die Stiefeletten: oben ärmellos mit breiten Trägern und kleinem V-Ausschnitt, unten eng anliegende Leggings bis zu den Knöcheln, an der Taille ohne Naht. Elegante, spitze schwarze Stiletto-Stiefeletten aus mattem Glattleder ohne Glanz knapp über den Knöchel, mit lang zulaufender Kappe und hohem, dünnem Stilettoabsatz; die Leggings stecken darin; der Absatz bleibt in jedem Bild vollständig und gerade. Nur um das rechte Handgelenk eine kurze, dunkelgraue Stoffbandage, das linke Handgelenk ist frei. Die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen: kein Schmuck, kein Gürtel, keine Tasche, keine Jacke, keine Waffe. Stil: realistischer, malerisch kolorierter Comic mit feinen Tuschelinien und sichtbarer Textur in Stoff, Leder und Haar, exakt im Zeichenstil der Referenz. Kein Stilwechsel während des Videos: kein Foto, keine Hautporen, kein Fotolicht, kein 3D-Render, kein Cel-Shading, keine Pixelgrafik, keine glatte Airbrush-Malerei, keine Mode-Illustration. Die dunkle Kontur ist in jedem Bild gleich dünn und schließt die Figur rundum ein, auch Haarspitzen, Finger und Absätze. Stoff, Leder und Haar bleiben matt; Schwarz und Dunkelbraun bleiben neutral oder warm, nie grünstichig; nichts an der Figur ist grün, olivgrün oder türkis, und kein grüner Schimmer fällt auf Haut, Haar, Stoff oder Stiefel. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiges, flaches Chroma-Key-Grün, genau dasselbe Grün wie im ersten Bild (etwa RGB 0, 177, 64), in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein anderes Grün, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang. Weiches, gleichmäßiges Licht von vorn; kein Gegenlicht, kein Randlicht, kein Lichtsaum um die Figur.

BILD: Quadratisches Bild. Das erste Bild des Videos ist die Referenz @Darja (frontal, A-Pose, ganze Figur). Feste Kamera ohne jede Bewegung: kein Zoom, kein Heranfahren, kein Wegfahren, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren; die Kamera schaut waagrecht auf Darja und kreist nie um sie, nur Darja dreht sich, danach sieht die Kamera sie streng von der Seite. Der Bildausschnitt ist in jedem Bild derselbe wie im ersten Bild. Der Maßstab des ersten Bildes gilt für das ganze Video: Darja ist in jedem Bild so groß wie im ersten Bild (gleiche Kopfgröße, gleiche Körperproportionen), nie größer und nie kleiner, und sie rückt nicht näher an die Kamera. Ihr höchster Punkt liegt nie höher als im ersten Bild, über dem Kopf bleibt ein grüner Rand. Die Sohlen der Stiefeletten liegen in jedem Bild auf derselben Höhe im Bild wie die Sohlen im ersten Bild (auch während der Drehung, denn es gibt keinen Schritt); darunter und daneben bleibt alles grün. Die Mitte zwischen den beiden Füßen liegt in der Bildmitte, dort, wo Darjas Körpermitte im ersten Bild steht. Darja wandert nie durch das Bild, hüpft nicht und schwebt nicht. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefeletten, Hände und Haarspitzen; nichts wird am Bildrand abgeschnitten.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Spiegelungen, Glanz, Orange, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

KAMPFHALTUNG: Darja steht im strengen Profil nach rechts: Gesicht, Brust und Fußspitzen zeigen nach rechts im Bild, die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm mit der Bandage am Handgelenk, rechtes Bein), die linke Seite ist größtenteils verdeckt. Der Stand ist aufrecht und schmal, kein Ausfallschritt: die Füße stehen hintereinander, der Abstand zwischen den Fußmitten beträgt etwa ein Viertel ihrer Körperhöhe. Das kamerafernere LINKE Bein steht vorn (im Bild weiter rechts), das der Kamera nähere RECHTE Bein steht hinten (im Bild weiter links); die Beine kreuzen sich nie. Beide Stiefeletten stehen fest auf Ballen und Absatz und auf gleicher Höhe im Bild. Die Knie sind nur leicht gebeugt, das Gewicht liegt etwas mehr auf dem hinteren rechten Bein. Der Oberkörper ist aufrecht, die Schultern sind entspannt, das Kinn ist leicht erhoben, der Blick geht waagrecht nach rechts. Beide Arme sind angewinkelt, die Ellbogen zeigen nach unten. Beide Hände sind offen, keine Fäuste: die vier Finger liegen gestreckt aneinander, der Daumen liegt an, die Fingerspitzen zeigen schräg nach oben und nach vorn (im Bild nach rechts oben). Die LINKE Hand ist die vordere Hand: sie steht in Schulterhöhe eine Unterarmlänge vor der Brust und reicht im Bild weiter nach rechts als die rechte Hand; von der Kamera aus ist sie vor der Brust teilweise zu sehen. Die RECHTE Hand mit der Bandage ist die hintere Hand: sie steht eine Handbreit vor dem Kinn, unterhalb des Mundes; Gesicht und Maske bleiben frei. Das offene Haar liegt hinter dem rechten Ohr und hängt als geschlossene Fläche hinter Nacken und Schultern gerade über den Rücken (im Bild links vom Hals); keine Strähne liegt vor der Schulter, auf der Brust, auf den Armen oder vor dem Gesicht.

ABLAUF: Ein einziger Durchlauf in zwei Phasen ohne Pause und ohne Schnitt; Drehung und Haltungswechsel kommen nur einmal vor. Phase 1, Übergang, 0,0 bis 2,0 s: Das erste Bild ist die Referenz @Darja, frontal in der A-Pose; 0,0 bis 0,6 s Drehung ins strenge Profil nach rechts; 0,6 bis 1,6 s sie nimmt die KAMPFHALTUNG ein; 1,6 bis 2,0 s sie steht ruhig in der KAMPFHALTUNG, ausgeatmet, die Schultern unten. Phase 2, Atmen, 2,0 bis 6,0 s: genau zwei gleich lange Atemzüge von je 2,0 s (2,0 bis 3,0 s Einatmen, 3,0 bis 4,0 s Ausatmen, 4,0 bis 5,0 s Einatmen, 5,0 bis 6,0 s Ausatmen). Der zweite Atemzug ist genauso lang, genauso tief und genauso schnell wie der erste: kein Verlangsamen, kein Flacherwerden, kein Innehalten bis zum letzten Bild. Ab 1,6 s stehen beide Füße fest an ihrem Platz; in Phase 2 bewegen sich nur Schultern, Brustkorb, Kopf, Hände und Haar, und nur im Takt der Atmung.

HANDLUNG: Übergang: Darja steht zuerst wie in der Referenz frontal in der A-Pose, aufrecht, die Arme schräg nach unten gestreckt. Dann dreht sie sich auf der Stelle um etwa 90 Grad nach ihrer linken Seite, also im Bild nach rechts: ihr Gesicht zeigt danach im Bild nach rechts, ihre rechte Schulter kommt zur Kamera hin, ihre linke Schulter geht von der Kamera weg, und die Kamera sieht ihre RECHTE Körperseite (Bandage am rechten Handgelenk). Beim Drehen bleiben die Füße an ihrem Platz und ihr Rücken zeigt nie zur Kamera; sie dreht sich nicht weiter, nicht zurück und nie in die Gegenrichtung, sie nähert sich der Kamera nicht und blickt danach nie nach links; die Kamera dreht sich nicht mit. Dabei heben sich die Arme aus der A-Pose, die Ellbogen beugen sich, die Hände bleiben offen; das Haar schwingt beim Drehen nur wenig mit, fliegt nicht auf, bleibt hinter Ohren und Schultern und liegt danach wieder glatt auf dem Rücken. Im Profil nimmt sie die KAMPFHALTUNG ein, ohne Schritt: die Füße bleiben dort, wo sie in der A-Pose standen, nur die Fußspitzen drehen sich mit nach rechts; so steht nach der Drehung ihr linker Fuß vorn (im Bild rechts) und ihr rechter Fuß hinten (im Bild links), und die Mitte zwischen den Füßen bleibt an ihrem Platz. Die Knie beugen sich leicht, die linke Hand kommt nach vorn in Schulterhöhe, die rechte Hand vor das Kinn. Kein Schritt, kein Sprung, kein Hüpfen, kein Umsetzen der Füße: beide Sohlen bleiben auf der Höhe der Sohlen im ersten Bild, und die Füße bewegen sich nie wieder. Atmen: Ab der KAMPFHALTUNG atmet Darja ruhig und gleichmäßig. Beim Einatmen heben sich Schultern und Brustkorb deutlich, etwa 3 Prozent der Körperhöhe, klar sichtbar und nicht nur angedeutet; der Kopf geht nur ein kleines Stück mit, beide Hände federn ein kleines Stück nach oben mit und bleiben vor Schulter und Kinn, das Haar bewegt sich kaum. Beim Ausatmen sinken Schultern, Brustkorb, Kopf und Hände in genau die Höhe zurück, in der sie vor dem Einatmen waren. Die Bewegung ist weich und fließend, ohne Ruck, ohne Stopp oben oder unten, ohne Nachfedern. Die Füße bewegen sich nicht (kein Hüpfen, kein Nachsetzen, kein Gewichtswechsel, die Fersen heben nie ab), Hüfte, Knie und Beine bleiben unbewegt, der Körper wandert nicht und neigt sich nicht. Das Gesicht bleibt ruhig: Blick nach rechts, Mund geschlossen, keine Kopfdrehung.

ENDE: Das letzte Bild (6,0 s) gleicht dem Bild bei 4,0 s und dem Bild bei 2,0 s (nicht dem ersten Bild): dieselbe KAMPFHALTUNG am Ende eines Ausatmens, Schultern, Brustkorb, Kopf und Hände in derselben Höhe, das Haar in derselben Lage, beide Füße an derselben Stelle, gleiche Größe, gleiche Mitte, Hintergrund unverändert (Schleife). Darja atmet bis zum letzten Bild weiter wie zuvor: in der letzten Sekunde gibt es kein Einfrieren, kein Abbremsen, kein Nachfedern, keinen Schritt, keine Drehung und keinen Wechsel in eine andere Haltung; sie kehrt nie in die A-Pose zurück. Nochmals das Wichtigste: einfarbig grüner Hintergrund wie im ersten Bild in jedem Bild, nichts Grünes an der Figur, feste Kamera, Darja bleibt gleich groß und in der Mitte, die Sohlen liegen auf derselben Höhe wie im ersten Bild, strenges Profil nach rechts, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### Prüfen (stand)

- Bild 1 ist die A-Pose; danach dreht sie sich nach rechts und blickt
  nach rechts. Dreht sie sich falsch herum oder blickt nach links:
  verwerfen, nicht spiegeln.
- Kampfhaltung steht spätestens bei etwa 3 s: aufrecht, linkes Bein
  vorn, das kameranahe rechte Bein hinten, linke Hand vorn in
  Schulterhöhe, rechte Hand mit der Bandage vor dem Kinn, Gesicht und
  Maske frei, beide Sohlen auf gleicher Höhe. Steht das rechte Bein
  vorn oder sitzt die Bandage links: verwerfen, denn alle weiteren
  Clips bauen auf dieser Haltung auf.
- Danach bewegen sich die Füße nicht mehr; Darja wird nicht größer, rückt
  nicht näher, wandert nicht.
- Der Grund bleibt in jedem Bild dasselbe Grün, ohne Schatten und ohne
  Verlauf; an Haar, Stoff und Stiefeln kein grüner Schimmer. Unter den
  Sohlen kein dunkler oder grauer Fleck, kein heller Saum um die Figur,
  keine Lücken im Haar, durch die Grün scheint. Im umgesetzten Clip
  (`hd_vorschau.gd` auf Grau und Weiß): keine Petrolflecken im Haar,
  keine Kerben an Sohlen, Maskenrand und Haarrand, die Stilettoabsätze
  vollständig.
- Gesicht, Haarfarbe, Einteiler und Stiefeletten bleiben gleich, kein
  Glanz auf den Leggings.

### Schnitt und Umsetzen (stand)

- Umsetzer im Standardmodus `--schluessel gruen` mit `--hd`. Die Zeile
  „Sondenbild: … Schlüssel (…) gruen“ prüfen; meldet der Umsetzer „Rand …
  ist nicht grün, Modus ecke“, ist das Grün zu matt, dann das Video
  verwerfen. `--haarloch` und `--schatten` gelten nur im Modus `ecke`.
  `--loch` wirkt auch im Modus `gruen` (der Kopfkommentar des Umsetzers
  sagt anderes): zeigt der Clip Petrolflecken im Haar oder zwischen Haar
  und Nacken, `--loch` erhöhen (etwa 60) und erneut prüfen.
- `--faktor` = 142 / Zeilen der A-Pose in Bild 1 wie bei Vela, solange
  der Umriss der Rolle nicht feststeht; `--ankerx-video` = gemessene
  Mitte zwischen den Füßen in der Kampfhaltung.
- Probelauf über den Hauptteil mit der gemessenen Atemzuglänge als
  `--zyklus`, dann ein Zyklus, `--ereignis keine`. Der Zyklus beginnt am
  besten ausgeatmet. Schließt der Atemzug keine Schleife (bei Vela
  `stand_9`), eine halbe Atembewegung als Hin-und-her-Schleife nehmen
  (`--schleife pingpong`, Befehl in `godot/werkzeuge/vela_neu_clips.sh`).
- Ausgabeordner für Gegner mit `--aus` festlegen; die Darstellung zeigt
  bisher nur Vela aus Clips. `video_bogen.gd` liest nur Clips unter
  `godot/grafik/vela_video/`; für einen anderen Ordner das Ergebnis mit
  `hd_vorschau.gd --ordner <aus>/stand` auf Grau und Weiß ansehen.
  Einzelbilder, in denen Haar, Schuhe oder Anzug ins Olivgrüne driften,
  mit `--ausser` weglassen.

## 4. gehen (lockeres Gehen am Platz, Schleife über einen Doppelschritt)

Gebaut nach Velas zweiter Fassung von `gehen`
(`docs/grok-prompts-vela-neu-angriffe.md`, „gehen, zweite Fassung“),
deren Befunde gelten: lange Schritte statt Trippeln, keine Wischspuren
unter den Schuhen, gleichmäßiger Takt, Arme sinken schon während der
Drehung, der erste Schritt hat volle Länge. FIGUR, HINTERGRUND und
VERBOTEN sind zeichengleich wie bei `stand`. Geändert für Darja: Gang
auf hohen Absätzen (Aufsetzen mit dem Absatz, Abrollen über den
Ballen), etwas kürzere Schritte als Vela (vom hinteren bis zum vorderen
Absatz etwa zwei Fünftel der Körperhöhe statt der Hälfte), sicherer,
zügiger Gang ohne Laufsteg (nach der Prüfung: „elegant“ und erhobenes
Kinn bestellten einen Laufsteg mit Hüftschwung), offene Hände, Haar
am Rücken anliegend statt schwingend, freier Raum unter dem
Fußgewölbe ohne Schatten, Stilettoabsätze bleiben gerade. Wie
bei Vela macht das rechte Bein den ersten Schritt: Nach der Drehung
ohne Schritt steht das linke Bein vorn, das rechte schwingt zuerst.
Einstellungen wie bei `stand`.

```text
FIGUR: Darja ist die Figur der Referenz @Darja. Darja bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales Gesicht mit hohen Wangenknochen, hellen graublauen Augen und vollen natürlichen Lippen, junge Frau, mit derselben venezianischen Halbmaske aus mattem, hellgrauem Pappmaché (kalkgrau mit leichtem Blaustich, nie weiß) über Stirn, Augenpartie, Nasenrücken und oberen Wangen; Nasenspitze, Mund und Kinn bleiben frei. Die Maske sitzt fest, verrutscht nie, glänzt nicht und hat keine Verzierung; im Profil bleibt es dasselbe Gesicht mit derselben Maske, gleiche Nasenspitze, gleiches Kinn. Langes, glattes Haar in dunklem Schokoladenbraun, offen und hinter beide Ohren gestrichen; es fällt als glatte, geschlossene Fläche mit gerade geschnittenen Spitzen über den Rücken bis unter die Schulterblätter, ohne abstehende oder fliegende Strähnen, und liegt dicht an Nacken und Rücken an, ohne Lücken, durch die Grün scheint; im Profil liegt es hinter Ohr, Nacken und Schultern, das Gesicht bleibt frei. Die Haarfarbe bleibt in jedem Bild dunkel schokoladenbraun (nie schwarz, nie rötlich, nie blond, nie olivgrün). Eng anliegende, einteilige Kleidung aus mattem, dickem, blickdichtem Stretchstoff in mitteldunklem, gedecktem Graublau, heller als die Stiefeletten: oben ärmellos mit breiten Trägern und kleinem V-Ausschnitt, unten eng anliegende Leggings bis zu den Knöcheln, an der Taille ohne Naht. Elegante, spitze schwarze Stiletto-Stiefeletten aus mattem Glattleder ohne Glanz knapp über den Knöchel, mit lang zulaufender Kappe und hohem, dünnem Stilettoabsatz; die Leggings stecken darin; der Absatz bleibt in jedem Bild vollständig und gerade. Nur um das rechte Handgelenk eine kurze, dunkelgraue Stoffbandage, das linke Handgelenk ist frei. Die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen: kein Schmuck, kein Gürtel, keine Tasche, keine Jacke, keine Waffe. Stil: realistischer, malerisch kolorierter Comic mit feinen Tuschelinien und sichtbarer Textur in Stoff, Leder und Haar, exakt im Zeichenstil der Referenz. Kein Stilwechsel während des Videos: kein Foto, keine Hautporen, kein Fotolicht, kein 3D-Render, kein Cel-Shading, keine Pixelgrafik, keine glatte Airbrush-Malerei, keine Mode-Illustration. Die dunkle Kontur ist in jedem Bild gleich dünn und schließt die Figur rundum ein, auch Haarspitzen, Finger und Absätze. Stoff, Leder und Haar bleiben matt; Schwarz und Dunkelbraun bleiben neutral oder warm, nie grünstichig; nichts an der Figur ist grün, olivgrün oder türkis, und kein grüner Schimmer fällt auf Haut, Haar, Stoff oder Stiefel. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiges, flaches Chroma-Key-Grün, genau dasselbe Grün wie im ersten Bild (etwa RGB 0, 177, 64), in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein anderes Grün, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang. Weiches, gleichmäßiges Licht von vorn; kein Gegenlicht, kein Randlicht, kein Lichtsaum um die Figur.

BILD: Quadratisches Bild. Das erste Bild des Videos ist die Referenz @Darja (frontal, A-Pose, ganze Figur). Feste Kamera ohne jede Bewegung: kein Zoom, kein Heranfahren, kein Wegfahren, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren; die Kamera schaut waagrecht auf Darja und kreist nie um sie, nur Darja dreht sich, danach sieht die Kamera sie streng von der Seite. Der Bildausschnitt ist in jedem Bild derselbe wie im ersten Bild. Der Maßstab des ersten Bildes gilt für das ganze Video: Darja ist in jedem Bild so groß wie im ersten Bild (gleiche Kopfgröße, gleiche Körperproportionen), nie größer und nie kleiner, und sie rückt nicht näher an die Kamera. Ihr höchster Punkt liegt nie höher als im ersten Bild; beim Gehen bleibt er auf nahezu gleicher Höhe, über dem Kopf bleibt ein grüner Rand. Die Sohle mindestens eines Schuhs liegt in jedem Bild auf derselben Höhe im Bild wie die Sohlen im ersten Bild; darunter und daneben bleibt alles grün. Die Mitte von Hüfte und Rumpf liegt in der Bildmitte, dort, wo Darjas Körpermitte im ersten Bild steht. Darja wandert nie durch das Bild, hüpft nicht und schwebt nicht. Jedes Bild ist gestochen scharf und sauber getuscht, auch im schnellsten Moment eines Schritts, und die Bewegung bleibt flüssig: die Stiefeletten sind in jedem Bild klar gezeichnet, mit geschlossener dunkler Kontur um Schaft, Spitze, Stilettoabsatz und Sohle, genauso scharf wie das Gesicht. Rund um jede Stiefelette ist nur dasselbe Grün wie über Darjas Kopf, auch unter einem Fuß, der sich gerade hebt, vorschwingt oder aufsetzt, und auch in der schmalen Lücke unter einem angehobenen Absatz oder einer angehobenen Spitze und im freien Raum unter dem Fußgewölbe zwischen Stilettoabsatz und Ballen, auch bei einem Fuß, der fest aufsteht. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefeletten, Hände und Haarspitzen; nichts wird am Bildrand abgeschnitten.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Spiegelungen, Glanz, Orange, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

ABLAUF: Ein einziger Durchlauf in zwei Abschnitten ohne Pause und ohne Schnitt; die Drehung kommt nur einmal vor. 0,0 bis 0,6 s: Das erste Bild ist die Referenz @Darja, frontal in der A-Pose; gleich danach dreht sich Darja auf der Stelle ins strenge Profil nach rechts, und während derselben Drehung sinken die Arme (nicht erst die Arme und danach die Drehung). 0,6 bis 6,0 s: Gehen bis zum letzten Bild. Sobald die Drehung fertig ist, geht sie ohne Halt los, und schon ihr erster Schritt hat die volle Länge, den vollen Takt und den vollen Armschwung; es gibt kein Anlaufen mit kleinen Schritten und kein allmähliches Steigern. Den ersten Schritt macht das rechte Bein. Ein Doppelschritt reicht vom Aufsetzen des rechten Absatzes bis zum nächsten Aufsetzen des rechten Absatzes (ein rechter und ein linker Schritt) und dauert etwa 1,2 Sekunden, jeder einzelne Schritt etwa 0,6 Sekunden: Der rechte Absatz setzt etwa bei 1,2 s, 2,4 s, 3,6 s, 4,8 s und 6,0 s auf, der linke jeweils genau in der Mitte dazwischen. Ab 1,2 s wiederholt jeder Doppelschritt den vorigen genau: gleiche Schrittlänge, gleiche Dauer, gleicher Armschwung, gleiche Haltung, gleiche Größe. Bis zum letzten Bild gibt es kein Beschleunigen, kein Abbremsen, kein Kürzer- oder Längerwerden der Schritte, kein Anhalten und keine neue Bewegung: Darja geht bis zum letzten Bild im selben Takt weiter.

HANDLUNG: Übergang (0,0 bis 0,6 s): Darja steht zuerst wie in der Referenz frontal in der A-Pose, aufrecht, die Arme schräg nach unten gestreckt. Dann dreht sie sich auf der Stelle um etwa 90 Grad nach ihrer linken Seite, also im Bild nach rechts: ihr Gesicht zeigt danach im Bild nach rechts, ihre rechte Schulter kommt zur Kamera hin, ihre linke Schulter geht von der Kamera weg, und die Kamera sieht ihre RECHTE Körperseite (Bandage am rechten Handgelenk). Beim Drehen bleiben die Füße an ihrem Platz und ihr Rücken zeigt nie zur Kamera; sie dreht sich nicht weiter, nicht zurück und nie in die Gegenrichtung, sie nähert sich der Kamera nicht und blickt danach nie nach links; die Kamera dreht sich nicht mit. Während sie sich dreht, sinken die Arme zugleich locker neben den Körper; sie verharrt nicht in der A-Pose. Das Haar schwingt beim Drehen nur wenig mit, fliegt nicht auf und bleibt hinter Ohren und Schultern. Strenges Profil: Ab 0,6 s bis zum letzten Bild zeigen Darjas Gesicht und ihre Schuhspitzen nach rechts im Bild, Schultern und Becken bleiben im Profil, und die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm mit der Bandage am Handgelenk, rechtes Bein); die linke Seite ist größtenteils verdeckt. Darja dreht sich nicht mehr und geht nie rückwärts. Losgehen (ab 0,6 s): Ohne Pause im Stand geht Darja direkt aus der Drehung los; schon der erste Schritt, mit dem rechten Bein, ist ein voller, langer Schritt im Takt des ganzen Videos. Gang: Darja geht aufrecht, sicher und zügig auf ihren hohen Absätzen, mit langen, gleichmäßigen Schritten und festem Rhythmus; das Becken bleibt waagrecht und schwingt kaum mit. Ihre Beine und Arme bewegen sich wie bei einem echten Gehen vorwärts mit vollen Schritten, ihr Körper aber bleibt an seinem Platz in der Bildmitte und rückt nicht vor. Keine kurzen Trippelschritte, kein Stöckeln, kein Schlendern, kein Joggen, kein Marschieren mit hohen Knien, kein Wiegen der Schultern. Der Oberkörper ist aufrecht und senkrecht, der Rücken gerade, die Schultern locker, der Kopf aufrecht, der Blick geradeaus nach rechts. Kopf und Schultern bleiben auf nahezu gleicher Höhe, kein Hüpfen, kein Wippen. Beine: Vorn ist die Blickrichtung (im Bild rechts), hinten ist im Bild links. Schrittlänge: In dem Moment, in dem der vordere Absatz aufsetzt, stehen die Beine weit auseinander, eines vorn, eines hinten: das vordere Bein zeigt von der Hüfte aus gestreckt etwa 20 bis 25 Grad schräg nach vorn, das hintere Bein gestreckt etwa ebenso weit schräg nach hinten. Waagrecht gemessen ist es dann vom hinteren Absatz bis zum vorderen Absatz etwa zwei Fünftel von Darjas Körperhöhe. Jeder Schritt ist gleich lang, mit dem rechten wie mit dem linken Bein. Der vordere Fuß setzt vor dem Körper zuerst mit dem Stilettoabsatz auf, die Schuhspitze ist dabei nur leicht angehoben und senkt sich gleich danach, und das Gewicht geht über den Ballen; das Knie des Standbeins ist dabei fast gestreckt. Der hintere Fuß drückt sich hinter dem Körper über Ballen und Zehen ab, der Absatz hebt sich zuerst, die Schuhspitze löst sich zuletzt; dann schwingt das Bein mit leicht gebeugtem Knie nach vorn. Beim Vorbeischwingen am Standbein ist die Sohle klar abgehoben, etwa auf Knöchelhöhe des Standbeins, nicht höher. Es gibt keine Flugphase: in jedem Bild steht mindestens ein Fuß auf. Weil ihr Körper an seinem Platz bleibt, bewegt sich der aufgesetzte Fuß gleichmäßig von vorn unter ihr hindurch nach hinten, nie nach vorn. Das der Kamera zugewandte rechte Bein ist in jedem Bild das nähere und verdeckt das linke Bein, wo sich beide überlappen. Die Beine kreuzen sich nie wie eine Schere und tauschen nie die Seiten. Die Stilettoabsätze bleiben gerade und vollständig, sie knicken nie um und verbiegen sich nie. Arme: Die Arme schwingen deutlich und gleichmäßig im Gegentakt zu den Beinen, im Ellbogen nur leicht gebeugt (etwa 30 Grad): ist das der Kamera zugewandte rechte Bein vorn, ist der rechte Arm hinten und der linke vorn, beim nächsten Schritt umgekehrt; nie beide Arme gleichzeitig vorn. Wenn die Beine einander passieren, hängen beide Arme kurz nebeneinander am Körper. Die Hände sind offen und locker, die Finger leicht gekrümmt und locker aneinander, der Daumen liegt an, keine Fäuste, nie erhoben, zwischen Hüfthöhe und Oberschenkelmitte; die Bandage bleibt am rechten Handgelenk. Das Haar liegt hinter Ohren und Schultern als geschlossene Fläche dicht an Nacken und Rücken an und bewegt sich beim Gehen kaum; es hebt sich nie vom Rücken ab, teilt sich nicht in Strähnen, und zwischen Haar, Nacken und Rücken scheint nie Grün durch; keine Strähne fällt vor Gesicht, Schultern oder Arme. Die Maske sitzt fest. Es gibt nie mehr als zwei Arme und zwei Beine.

ENDE: Das Video endet noch mitten im Gehen (kein Anhalten, kein Abbremsen, kein Stehenbleiben, keine Schlusspose) in derselben Pose, in der jeder Doppelschritt beginnt (Schleife): strenges Profil nach rechts, das der Kamera nahe rechte Bein ist vorn, der Absatz gerade aufgesetzt, das Bein fast gestreckt, der linke Fuß steht hinten nur noch auf Ballen und Zehen, die Beine stehen im vollen langen Schritt, der rechte Arm schwingt hinten, der linke vorn, der Oberkörper ist aufrecht. Nochmals das Wichtigste: einfarbig grüner Hintergrund wie im ersten Bild in jedem Bild, nichts Grünes an der Figur, feste Kamera, Darja bleibt gleich groß wie im ersten Bild und in der Mitte, nach der Drehung strenges Profil nach rechts, aufrechtes, sicheres, zügiges Gehen mit langen, gleich langen Schritten im immer gleichen Takt und Armen im Gegentakt, beide Stiefeletten mit geraden Absätzen in jedem Bild scharf gezeichnet, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### Prüfen (gehen)

- Schrittlänge: Halte das Video an, wenn die Beine am weitesten
  auseinander sind. Vom hinteren bis zum vorderen Absatz sollten es
  etwa zwei Fünftel der Körperhöhe sein; kein Trippeln, kein Stöckeln.
- Schuhe sauber: Bei Bildern, in denen ein Fuß aufsetzt, sich abdrückt
  oder vorschwingt, kein dunkler oder grauer Fleck unter dem Schuh, der
  Stilettoabsatz ganz, gerade und so scharf wie das Gesicht.
- Gleichmäßiger Takt ab etwa 2 s, kein Beschleunigen, kein Anhalten;
  immer mindestens ein Fuß unten; Arme im Gegentakt (rechtes Bein
  vorn, rechter Arm hinten), Hände offen.
- Profil nach rechts, Bandage am rechten Handgelenk auf der Kameraseite,
  Maske sitzt, Haar hinter den Schultern, Darja bleibt gleich groß in der
  Bildmitte.
- Grün wie bei `stand`: in jedem Bild dasselbe Grün, an Haar,
  Stiefeletten und Leggings kein Oliv. Im umgesetzten Clip
  (`hd_vorschau.gd --ordner <aus>/gehen` auf Grau und Weiß) die Bilder
  des Abdrückens, Vorschwingens und Aufsetzens ansehen: Stilettoabsätze
  vollständig, ohne Kerben und nicht verkürzt, kein dunkler Saum und kein
  Grau unter Sohlen und Fußgewölbe, keine Petrolflecken zwischen den
  Beinen, zwischen Hand, Hüfte und Oberschenkel und zwischen Haar und
  Rücken.

### Schnitt und Umsetzen (gehen)

- Wie bei Velas `gehen` (Befehl in `godot/werkzeuge/vela_neu_clips.sh`):
  ein Doppelschritt als Zyklus (`--zyklus`, `--ab`, `--bis`), `--ereignis
  keine`, `--ankerx mittel`; `schritt_px` misst der Umsetzer aus dem
  Video. Velas `--tol 70` gegen Wischspuren gilt nur im Modus `ecke`;
  hier Modus `gruen`, Hinweise wie bei `stand`: `--hd`, `--faktor` = 142 /
  Zeilen der A-Pose in Bild 1, eigener Ordner mit `--aus` (sonst
  überschreibt der Clip Velas `gehen` unter `godot/grafik/vela_video/`).
  Nicht aus Velas Zeile übernehmen: `--loch 8` füllt im Modus `gruen` auch
  breitere eingeschlossene Grünflächen (zwischen den Beinen, zwischen
  Hand, Hüfte und Oberschenkel) mit dunklem Petrol, darum den Standard 24
  lassen und nur bei Petrolflecken im Haar erhöhen; von den gemeinsamen
  Optionen des Skripts schaltet `--schluessel ecke` den Modus um,
  `--haarloch 60` und `--schatten 8` wirken nur im Modus `ecke`.


---

## 5. Neue Version der Figur (2026-10-18) und angepasster Prompt gehen

Der Nutzer hat am 2026-10-18 ein neues Referenzbild für Darja
festgelegt (Grok Imagine, realistische digitale Malerei statt
Comic-Tusche, aus dem Bestellweg in `docs/grafik-bestellung.md`,
Abschnitt „Realistische Figuren“). Es ersetzt das Referenzbild aus
Abschnitt 1. Unterschiede zur Fassung vom 2026-10-17:

- Mundtuch statt venezianischer Halbmaske: kurzes, mattes, schwarzes
  Tuch nur über Nasenrücken, Nase, Mund und Kinn; Augen, Brauen und
  Stirn frei; der ganze Hals ist nackte Haut.
- Haar offen, dunkelbraun, Mittelscheitel, hinter den Schultern (wie
  bisher), Hals und Ausschnitt bleiben frei.
- Catsuit aus mattem Leder in sehr dunklem Anthrazit mit feiner Narbung
  statt Jersey in Graublau; weiterhin ärmellos, kleiner V-Ausschnitt,
  Hosenbeine bis zu den Knöcheln.
- Keine Bandage mehr; damit entfällt das Seitenmerkmal. Die Prüfung der
  Drehrichtung läuft nur noch über Blick und Fußspitzen nach rechts; wer
  ein Seitenmerkmal braucht, bestellt es im Referenzbild neu (etwa ein
  schmales Band am rechten Oberarm) und trägt es hier nach.
- Stil ist realistische Malerei; die Stilsätze der Prompts sind darauf
  umgestellt („realistische digitale Malerei“ statt „Comic mit
  Tuschelinien“). Die Grok-Referenz `@Darja` wird mit dem neuen Bild und
  der Beschreibung unten neu angelegt.

Grok-Referenz, Name `Darja`, Kategorie Charakter, Bild: das neue
Referenzbild. Beschreibung:

```text
Darja, Gegnerin eines Prügelspiels, tritt in vielen gleichen Exemplaren auf. Realistische digitale Malerei. Junge Frau mit slawischen Gesichtszügen, hohen Wangenknochen und graublauen Augen; kurzes, mattes, schwarzes Mundtuch nur über Nase, Mund und Kinn, Hals frei. Langes, glattes, offenes dunkelbraunes Haar mit Mittelscheitel hinter den Schultern. Hautenger Catsuit aus mattem Leder in sehr dunklem Anthrazit mit feiner Narbung, ärmellos, kleiner V-Ausschnitt, Hosenbeine bis zu den Knöcheln. Spitze schwarze Stiletto-Stiefeletten aus mattem Leder knapp über den Knöchel. Kein Schmuck, kein Gürtel, keine Waffe, keine Bandage. Hintergrund Chroma-Grün.
```

Einstellungen wie in Abschnitt 2: 6 s, 1:1, höchste Auflösung, 24 Bilder
je Sekunde, ohne Ton. Prüfen, Schnitt und Umsetzen wie in Abschnitt 4,
nur ohne die Bandage-Punkte. Die Prompts `stand` (Abschnitt 3) und alle
weiteren Clips (Schlag, Sprung, Treffer, Umfallen, Aufstehen) bekommen
denselben Absatz FIGUR wie unten; HINTERGRUND, BILD und VERBOTEN bleiben
zeichengleich.

### gehen, neue Version

```text
FIGUR: Darja ist die Figur der Referenz @Darja. Darja bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales Gesicht mit hohen Wangenknochen und hellen graublauen Augen, junge Frau, mit demselben kurzen, matten, schwarzen Mundtuch aus dünnem Stoff, das nur Nasenrücken, Nase, Mund und Kinn bedeckt: Der obere Rand liegt gerade über dem Nasenrücken knapp unter den Augen, der untere Rand endet direkt unter dem Kinn, es ist hinten am Hinterkopf geknotet. Der ganze Hals ist frei und zeigt nackte Haut: Kehle, Halsseiten, Schlüsselbeine und der Bereich bis zum Ausschnitt sind unbedeckt, dort ist kein Stoff. Augen, Brauen und Stirn bleiben frei. Das Mundtuch sitzt fest, verrutscht nie, glänzt nicht, hat keine Muster; im Profil bleibt es dasselbe Gesicht mit demselben Mundtuch, gleiche Nasenform unter dem Stoff, gleiches Kinn. Langes, glattes Haar in dunklem Schokoladenbraun mit Mittelscheitel, offen und hinter beide Ohren gestrichen; es fällt als glatte, geschlossene Fläche mit gerade geschnittenen Spitzen über den Rücken bis unter die Schulterblätter, ohne abstehende oder fliegende Strähnen, und liegt dicht an Nacken und Rücken an, ohne Lücken, durch die Grün scheint; im Profil liegt es hinter Ohr, Nacken und Schultern, Gesicht und Hals bleiben frei. Die Haarfarbe bleibt in jedem Bild dunkel schokoladenbraun (nie schwarz, nie rötlich, nie blond, nie olivgrün). Hauteng anliegender, einteiliger Catsuit aus mattem Leder in sehr dunklem Anthrazit, deutlich heller als die Stiefeletten, mit feiner Narbung und nur weichem Schimmer an den Rundungen, keine Spiegelungen: oben ärmellos mit schmalen Trägern und kleinem V-Ausschnitt, Schultern und Arme frei, unten hauteng bis zu den Knöcheln, an der Taille ohne Naht. Elegante, spitze schwarze Stiletto-Stiefeletten aus mattem Glattleder ohne Glanz knapp über den Knöchel, mit lang zulaufender Kappe und hohem, dünnem Stilettoabsatz; die Hosenbeine stecken darin; der Absatz bleibt in jedem Bild vollständig und gerade. Beide Handgelenke sind frei. Die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen: kein Schmuck, kein Gürtel, keine Tasche, keine Jacke, keine Waffe, keine Handschuhe, keine Bandage. Stil: realistische digitale Malerei mit fotonaher Haut, Leder mit feiner Narbung, Haar mit einzelnen Strähnen, exakt im Stil der Referenz. Kein Stilwechsel während des Videos: kein Foto, kein Fotolicht, kein Cel-Shading, keine Pixelgrafik, kein Comic mit Tuschekontur, keine Mode-Illustration. Die Kontur der Figur ist in jedem Bild sauber und schließt die Figur rundum ein, auch Haarspitzen, Finger und Absätze. Leder und Haar bleiben matt; Schwarz und Dunkelbraun bleiben neutral oder warm, nie grünstichig; nichts an der Figur ist grün, olivgrün oder türkis, und kein grüner Schimmer fällt auf Haut, Haar, Leder oder Stiefel. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiges, flaches Chroma-Key-Grün, genau dasselbe Grün wie im ersten Bild (etwa RGB 0, 177, 64), in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein anderes Grün, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang. Weiches, gleichmäßiges Licht von vorn; kein Gegenlicht, kein Randlicht, kein Lichtsaum um die Figur.

BILD: Quadratisches Bild. Das erste Bild des Videos ist die Referenz @Darja (frontal, A-Pose, ganze Figur). Feste Kamera ohne jede Bewegung: kein Zoom, kein Heranfahren, kein Wegfahren, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren; die Kamera schaut waagrecht auf Darja und kreist nie um sie, nur Darja dreht sich, danach sieht die Kamera sie streng von der Seite. Der Bildausschnitt ist in jedem Bild derselbe wie im ersten Bild. Der Maßstab des ersten Bildes gilt für das ganze Video: Darja ist in jedem Bild so groß wie im ersten Bild (gleiche Kopfgröße, gleiche Körperproportionen), nie größer und nie kleiner, und sie rückt nicht näher an die Kamera. Ihr höchster Punkt liegt nie höher als im ersten Bild; beim Gehen bleibt er auf nahezu gleicher Höhe, über dem Kopf bleibt ein grüner Rand. Die Sohle mindestens eines Schuhs liegt in jedem Bild auf derselben Höhe im Bild wie die Sohlen im ersten Bild; darunter und daneben bleibt alles grün. Die Mitte von Hüfte und Rumpf liegt in der Bildmitte, dort, wo Darjas Körpermitte im ersten Bild steht. Darja wandert nie durch das Bild, hüpft nicht und schwebt nicht. Jedes Bild ist gestochen scharf und sauber getuscht, auch im schnellsten Moment eines Schritts, und die Bewegung bleibt flüssig: die Stiefeletten sind in jedem Bild klar gezeichnet, mit geschlossener dunkler Kontur um Schaft, Spitze, Stilettoabsatz und Sohle, genauso scharf wie das Gesicht. Rund um jede Stiefelette ist nur dasselbe Grün wie über Darjas Kopf, auch unter einem Fuß, der sich gerade hebt, vorschwingt oder aufsetzt, und auch in der schmalen Lücke unter einem angehobenen Absatz oder einer angehobenen Spitze und im freien Raum unter dem Fußgewölbe zwischen Stilettoabsatz und Ballen, auch bei einem Fuß, der fest aufsteht. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefeletten, Hände und Haarspitzen; nichts wird am Bildrand abgeschnitten.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Spiegelungen, Glanz, Orange, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

ABLAUF: Ein einziger Durchlauf in zwei Abschnitten ohne Pause und ohne Schnitt; die Drehung kommt nur einmal vor. 0,0 bis 0,6 s: Das erste Bild ist die Referenz @Darja, frontal in der A-Pose; gleich danach dreht sich Darja auf der Stelle ins strenge Profil nach rechts, und während derselben Drehung sinken die Arme (nicht erst die Arme und danach die Drehung). 0,6 bis 6,0 s: Gehen bis zum letzten Bild. Sobald die Drehung fertig ist, geht sie ohne Halt los, und schon ihr erster Schritt hat die volle Länge, den vollen Takt und den vollen Armschwung; es gibt kein Anlaufen mit kleinen Schritten und kein allmähliches Steigern. Den ersten Schritt macht das rechte Bein. Ein Doppelschritt reicht vom Aufsetzen des rechten Absatzes bis zum nächsten Aufsetzen des rechten Absatzes (ein rechter und ein linker Schritt) und dauert etwa 1,2 Sekunden, jeder einzelne Schritt etwa 0,6 Sekunden: Der rechte Absatz setzt etwa bei 1,2 s, 2,4 s, 3,6 s, 4,8 s und 6,0 s auf, der linke jeweils genau in der Mitte dazwischen. Ab 1,2 s wiederholt jeder Doppelschritt den vorigen genau: gleiche Schrittlänge, gleiche Dauer, gleicher Armschwung, gleiche Haltung, gleiche Größe. Bis zum letzten Bild gibt es kein Beschleunigen, kein Abbremsen, kein Kürzer- oder Längerwerden der Schritte, kein Anhalten und keine neue Bewegung: Darja geht bis zum letzten Bild im selben Takt weiter.

HANDLUNG: Übergang (0,0 bis 0,6 s): Darja steht zuerst wie in der Referenz frontal in der A-Pose, aufrecht, die Arme schräg nach unten gestreckt. Dann dreht sie sich auf der Stelle um etwa 90 Grad nach ihrer linken Seite, also im Bild nach rechts: ihr Gesicht zeigt danach im Bild nach rechts, ihre rechte Schulter kommt zur Kamera hin, ihre linke Schulter geht von der Kamera weg, und die Kamera sieht ihre RECHTE Körperseite. Beim Drehen bleiben die Füße an ihrem Platz und ihr Rücken zeigt nie zur Kamera; sie dreht sich nicht weiter, nicht zurück und nie in die Gegenrichtung, sie nähert sich der Kamera nicht und blickt danach nie nach links; die Kamera dreht sich nicht mit. Während sie sich dreht, sinken die Arme zugleich locker neben den Körper; sie verharrt nicht in der A-Pose. Das Haar schwingt beim Drehen nur wenig mit, fliegt nicht auf und bleibt hinter Ohren und Schultern. Strenges Profil: Ab 0,6 s bis zum letzten Bild zeigen Darjas Gesicht und ihre Schuhspitzen nach rechts im Bild, Schultern und Becken bleiben im Profil, und die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm, rechtes Bein); die linke Seite ist größtenteils verdeckt. Darja dreht sich nicht mehr und geht nie rückwärts. Losgehen (ab 0,6 s): Ohne Pause im Stand geht Darja direkt aus der Drehung los; schon der erste Schritt, mit dem rechten Bein, ist ein voller, langer Schritt im Takt des ganzen Videos. Gang: Darja geht aufrecht, sicher und zügig auf ihren hohen Absätzen, mit langen, gleichmäßigen Schritten und festem Rhythmus; das Becken bleibt waagrecht und schwingt kaum mit. Ihre Beine und Arme bewegen sich wie bei einem echten Gehen vorwärts mit vollen Schritten, ihr Körper aber bleibt an seinem Platz in der Bildmitte und rückt nicht vor. Keine kurzen Trippelschritte, kein Stöckeln, kein Schlendern, kein Joggen, kein Marschieren mit hohen Knien, kein Wiegen der Schultern. Der Oberkörper ist aufrecht und senkrecht, der Rücken gerade, die Schultern locker, der Kopf aufrecht, der Blick geradeaus nach rechts. Kopf und Schultern bleiben auf nahezu gleicher Höhe, kein Hüpfen, kein Wippen. Beine: Vorn ist die Blickrichtung (im Bild rechts), hinten ist im Bild links. Schrittlänge: In dem Moment, in dem der vordere Absatz aufsetzt, stehen die Beine weit auseinander, eines vorn, eines hinten: das vordere Bein zeigt von der Hüfte aus gestreckt etwa 20 bis 25 Grad schräg nach vorn, das hintere Bein gestreckt etwa ebenso weit schräg nach hinten. Waagrecht gemessen ist es dann vom hinteren Absatz bis zum vorderen Absatz etwa zwei Fünftel von Darjas Körperhöhe. Jeder Schritt ist gleich lang, mit dem rechten wie mit dem linken Bein. Der vordere Fuß setzt vor dem Körper zuerst mit dem Stilettoabsatz auf, die Schuhspitze ist dabei nur leicht angehoben und senkt sich gleich danach, und das Gewicht geht über den Ballen; das Knie des Standbeins ist dabei fast gestreckt. Der hintere Fuß drückt sich hinter dem Körper über Ballen und Zehen ab, der Absatz hebt sich zuerst, die Schuhspitze löst sich zuletzt; dann schwingt das Bein mit leicht gebeugtem Knie nach vorn. Beim Vorbeischwingen am Standbein ist die Sohle klar abgehoben, etwa auf Knöchelhöhe des Standbeins, nicht höher. Es gibt keine Flugphase: in jedem Bild steht mindestens ein Fuß auf. Weil ihr Körper an seinem Platz bleibt, bewegt sich der aufgesetzte Fuß gleichmäßig von vorn unter ihr hindurch nach hinten, nie nach vorn. Das der Kamera zugewandte rechte Bein ist in jedem Bild das nähere und verdeckt das linke Bein, wo sich beide überlappen. Die Beine kreuzen sich nie wie eine Schere und tauschen nie die Seiten. Die Stilettoabsätze bleiben gerade und vollständig, sie knicken nie um und verbiegen sich nie. Arme: Die Arme schwingen deutlich und gleichmäßig im Gegentakt zu den Beinen, im Ellbogen nur leicht gebeugt (etwa 30 Grad): ist das der Kamera zugewandte rechte Bein vorn, ist der rechte Arm hinten und der linke vorn, beim nächsten Schritt umgekehrt; nie beide Arme gleichzeitig vorn. Wenn die Beine einander passieren, hängen beide Arme kurz nebeneinander am Körper. Die Hände sind offen und locker, die Finger leicht gekrümmt und locker aneinander, der Daumen liegt an, keine Fäuste, nie erhoben, zwischen Hüfthöhe und Oberschenkelmitte. Das Haar liegt hinter Ohren und Schultern als geschlossene Fläche dicht an Nacken und Rücken an und bewegt sich beim Gehen kaum; es hebt sich nie vom Rücken ab, teilt sich nicht in Strähnen, und zwischen Haar, Nacken und Rücken scheint nie Grün durch; keine Strähne fällt vor Gesicht, Schultern oder Arme. Das Mundtuch sitzt fest, der Hals bleibt frei. Es gibt nie mehr als zwei Arme und zwei Beine.

ENDE: Das Video endet noch mitten im Gehen (kein Anhalten, kein Abbremsen, kein Stehenbleiben, keine Schlusspose) in derselben Pose, in der jeder Doppelschritt beginnt (Schleife): strenges Profil nach rechts, das der Kamera nahe rechte Bein ist vorn, der Absatz gerade aufgesetzt, das Bein fast gestreckt, der linke Fuß steht hinten nur noch auf Ballen und Zehen, die Beine stehen im vollen langen Schritt, der rechte Arm schwingt hinten, der linke vorn, der Oberkörper ist aufrecht. Nochmals das Wichtigste: einfarbig grüner Hintergrund wie im ersten Bild in jedem Bild, nichts Grünes an der Figur, feste Kamera, Darja bleibt gleich groß wie im ersten Bild und in der Mitte, nach der Drehung strenges Profil nach rechts, aufrechtes, sicheres, zügiges Gehen mit langen, gleich langen Schritten im immer gleichen Takt und Armen im Gegentakt, beide Stiefeletten mit geraden Absätzen in jedem Bild scharf gezeichnet, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```

### schlag, neue Version (gerader Handballenstoß mit der offenen rechten Hand)

Abgeleitet aus Velas `kette1` (`docs/grok-prompts-vela-neu-angriffe.md`,
„Schlag 1“): gleicher Zeitplan (2,5 bis 3,9 s Aktion, davor 0,5 s
Stille als Puffer, danach Ruhe mit leisem Atmen), gleiche feste
Bausteine. Geändert für Darja: Stoß mit der offenen RECHTEN Hand
(Kamera-nah, in der KAMPFHALTUNG die hintere Hand vor dem Kinn), als
Handballenstoß, weil `stand` offene Hände festlegt; die vordere linke
Hand sinkt dabei vor die Brust; kein Schritt, Profil bleibt; Hals und
Mundtuch frei; Absätze gerade. Startbild wie bei Vela sinnvoll: Die
Referenz füllt rund 85 % der Bildhöhe, die gestreckte Hand käme nahe
an den rechten Rand. Ein Startbild mit der Figur bei 60 % der Höhe auf
dem Grün der Referenz (Farbe am Rand der Referenz abnehmen, nicht blind
#00B140) als erstes Bild anhängen, dazu `@Darja` als Referenz:

```sh
ffmpeg -i darja_referenz.png -vf "scale=-1:614:flags=lanczos,pad=1024:1024:(1024-iw)/2:225:color=0x00B140" -frames:v 1 darja_start_60.png
```

Prüfen wie bei `kette1`: Drehung nach rechts, genau ein Stoß mit der
Kamera-nahen Hand, Arm ganz gestreckt, Hand offen mit fünf Fingern,
Füße bleiben stehen, nichts angeschnitten, danach wieder dieselbe
Kampfhaltung. Schnitt und Umsetzen wie `kette1` (`--kuerzen nein`,
`ausholen` von Hand setzen, `kontakt` = Arm voll gestreckt), Modus
`gruen`, `--faktor` = 142 / Zeilen der A-Pose in Bild 1.

```text
FIGUR: Darja ist die Figur der Referenz @Darja. Darja bleibt in jedem Bild dieselbe Person wie in der Referenz: gleiches schmales Gesicht mit hohen Wangenknochen und hellen graublauen Augen, junge Frau, mit demselben kurzen, matten, schwarzen Mundtuch aus dünnem Stoff, das nur Nasenrücken, Nase, Mund und Kinn bedeckt: Der obere Rand liegt gerade über dem Nasenrücken knapp unter den Augen, der untere Rand endet direkt unter dem Kinn, es ist hinten am Hinterkopf geknotet. Der ganze Hals ist frei und zeigt nackte Haut: Kehle, Halsseiten, Schlüsselbeine und der Bereich bis zum Ausschnitt sind unbedeckt, dort ist kein Stoff. Augen, Brauen und Stirn bleiben frei. Das Mundtuch sitzt fest, verrutscht nie, glänzt nicht, hat keine Muster; im Profil bleibt es dasselbe Gesicht mit demselben Mundtuch, gleiche Nasenform unter dem Stoff, gleiches Kinn. Langes, glattes Haar in dunklem Schokoladenbraun mit Mittelscheitel, offen und hinter beide Ohren gestrichen; es fällt als glatte, geschlossene Fläche mit gerade geschnittenen Spitzen über den Rücken bis unter die Schulterblätter, ohne abstehende oder fliegende Strähnen, und liegt dicht an Nacken und Rücken an, ohne Lücken, durch die Grün scheint; im Profil liegt es hinter Ohr, Nacken und Schultern, Gesicht und Hals bleiben frei. Die Haarfarbe bleibt in jedem Bild dunkel schokoladenbraun (nie schwarz, nie rötlich, nie blond, nie olivgrün). Hauteng anliegender, einteiliger Catsuit aus mattem Leder in sehr dunklem Anthrazit, deutlich heller als die Stiefeletten, mit feiner Narbung und nur weichem Schimmer an den Rundungen, keine Spiegelungen: oben ärmellos mit schmalen Trägern und kleinem V-Ausschnitt, Schultern und Arme frei, unten hauteng bis zu den Knöcheln, an der Taille ohne Naht. Elegante, spitze schwarze Stiletto-Stiefeletten aus mattem Glattleder ohne Glanz knapp über den Knöchel, mit lang zulaufender Kappe und hohem, dünnem Stilettoabsatz; die Hosenbeine stecken darin; der Absatz bleibt in jedem Bild vollständig und gerade. Beide Handgelenke sind frei. Die Hände haben nie mehr als fünf Finger und bleiben normal groß. Nichts davon ändern, nichts hinzufügen: kein Schmuck, kein Gürtel, keine Tasche, keine Jacke, keine Waffe, keine Handschuhe, keine Bandage. Stil: realistische digitale Malerei mit fotonaher Haut, Leder mit feiner Narbung, Haar mit einzelnen Strähnen, exakt im Stil der Referenz. Kein Stilwechsel während des Videos: kein Foto, kein Fotolicht, kein Cel-Shading, keine Pixelgrafik, kein Comic mit Tuschekontur, keine Mode-Illustration. Die Kontur der Figur ist in jedem Bild sauber und schließt die Figur rundum ein, auch Haarspitzen, Finger und Absätze. Leder und Haar bleiben matt; Schwarz und Dunkelbraun bleiben neutral oder warm, nie grünstichig; nichts an der Figur ist grün, olivgrün oder türkis, und kein grüner Schimmer fällt auf Haut, Haar, Leder oder Stiefel. Die Texturen bleiben ruhig und flimmern nicht.

HINTERGRUND: Einfarbiges, flaches Chroma-Key-Grün, genau dasselbe Grün wie im ersten Bild (etwa RGB 0, 177, 64), in JEDEM einzelnen Bild vom ersten bis zum letzten Bild. Kein anderes Grün, kein Farbverlauf, keine Vignette, kein Rauschen, keine Textur, kein Einblenden, kein Überblenden, kein schwarzes Bild am Anfang. Weiches, gleichmäßiges Licht von vorn; kein Gegenlicht, kein Randlicht, kein Lichtsaum um die Figur.

BILD: Quadratisches Bild. Das erste Bild des Videos ist die Referenz @Darja (frontal, A-Pose, ganze Figur). Feste Kamera ohne jede Bewegung: kein Zoom, kein Heranfahren, kein Wegfahren, kein Schwenk, kein Wackeln, kein Neigen, kein Mitfahren; die Kamera schaut waagrecht auf Darja und kreist nie um sie, nur Darja dreht sich, danach sieht die Kamera sie streng von der Seite. Der Bildausschnitt ist in jedem Bild derselbe wie im ersten Bild. Der Maßstab des ersten Bildes gilt für das ganze Video: Darja ist in jedem Bild so groß wie im ersten Bild (gleiche Kopfgröße, gleiche Körperproportionen), nie größer und nie kleiner, und sie rückt nicht näher an die Kamera. Ihr höchster Punkt liegt nie höher als im ersten Bild; in der KAMPFHALTUNG und beim Stoß liegt er etwas tiefer, über dem Kopf bleibt ein grüner Rand. Beide Stiefeletten stehen in jedem Bild mit Ballen und Absatz auf derselben Höhe im Bild wie die Sohlen im ersten Bild; darunter und daneben bleibt alles grün, auch im freien Raum unter dem Fußgewölbe zwischen Stilettoabsatz und Ballen. Die Mitte zwischen den beiden Stiefeletten liegt in der Bildmitte, dort, wo Darjas Körpermitte im ersten Bild steht, auch während des Stoßes. Vor der voll gestreckten rechten Hand bleibt bis zum rechten Bildrand ein breiter grüner Rand. Darja wandert nie durch das Bild, rückt beim Stoß nicht vor, hüpft nicht und schwebt nicht. Jedes Bild ist gestochen scharf, auch im schnellsten Moment des Stoßes: Hand, Finger und Stiefeletten sind in jedem Bild klar gezeichnet, mit geschlossener Kontur, genauso scharf wie das Gesicht. Die ganze Figur ist in jedem Bild vollständig zu sehen, auch Stiefeletten, Hände und Haarspitzen; nichts wird am Bildrand abgeschnitten.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien, Windlinien, Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Bewegungsunschärfe, Tiefenunschärfe, Glühen, Lichthöfe, Spiegelungen, Glanz, Orange, Gegner, Waffen, zweite Personen, Schrift, Buchstaben, Zahlen, Wasserzeichen, Untertitel, Rahmen, Musik, Ton. Keine zusätzlichen Arme oder Beine, die Arme gehen nie durch den Rumpf.

KAMPFHALTUNG: Darja steht im strengen Profil nach rechts: Gesicht, Brust und Fußspitzen zeigen nach rechts im Bild, die Kamera sieht ihre RECHTE Körperseite (rechte Schulter, rechter Arm, rechtes Bein), die linke Seite ist größtenteils verdeckt. Der Stand ist aufrecht und schmal, kein Ausfallschritt: die Füße stehen hintereinander, der Abstand zwischen den Fußmitten beträgt etwa ein Viertel ihrer Körperhöhe. Das kamerafernere LINKE Bein steht vorn (im Bild weiter rechts), das der Kamera nähere RECHTE Bein steht hinten (im Bild weiter links); die Beine kreuzen sich nie. Beide Stiefeletten stehen fest auf Ballen und Absatz und auf gleicher Höhe im Bild. Die Knie sind nur leicht gebeugt, das Gewicht liegt etwas mehr auf dem hinteren rechten Bein. Der Oberkörper ist aufrecht, die Schultern sind entspannt, das Kinn ist leicht erhoben, der Blick geht waagrecht nach rechts. Beide Arme sind angewinkelt, die Ellbogen zeigen nach unten. Beide Hände sind offen, keine Fäuste: die vier Finger liegen gestreckt aneinander, der Daumen liegt an, die Fingerspitzen zeigen schräg nach oben und nach vorn (im Bild nach rechts oben). Die LINKE Hand ist die vordere Hand: sie steht in Schulterhöhe eine Unterarmlänge vor der Brust und reicht im Bild weiter nach rechts als die rechte Hand; von der Kamera aus ist sie vor der Brust teilweise zu sehen. Die RECHTE Hand ist die hintere Hand: sie steht eine Handbreit vor dem Kinn, unterhalb des Mundes; Gesicht, Mundtuch und Hals bleiben frei. Das offene Haar liegt hinter dem rechten Ohr und hängt als geschlossene Fläche hinter Nacken und Schultern gerade über den Rücken (im Bild links vom Hals); keine Strähne liegt vor der Schulter, auf der Brust, auf den Armen oder vor dem Gesicht.

ABLAUF: Ein einziger Durchlauf ohne Pause und ohne Schnitt; Drehung und Haltungswechsel aus der A-Pose kommen nur einmal vor. Phase 1, Übergang, 0,0 bis 2,0 s: Das erste Bild ist die Referenz @Darja, frontal in der A-Pose; 0,0 bis 0,6 s Drehung ins strenge Profil nach rechts; 0,6 bis 1,6 s sie nimmt die KAMPFHALTUNG ein; 1,6 bis 2,0 s sie steht ruhig in der KAMPFHALTUNG. Phase 2, Stoß, 2,0 bis 6,0 s: 2,0 bis 2,5 s Darja steht still in der KAMPFHALTUNG. 2,5 bis 2,7 s Zurücknehmen: die rechte Hand zieht sich nur eine Handbreit gerade zurück (im Bild nach links) und dreht dabei die Handfläche nach vorn. 2,7 bis 2,9 s Stoß: die rechte Hand schießt waagrecht geradeaus nach vorn (im Bild nach rechts), Handballen voran; bei 2,9 s ist der rechte Arm voll gestreckt. 2,9 bis 3,4 s Halten: der Arm bleibt voll gestreckt und still. 3,4 bis 3,9 s Rückzug: die rechte Hand kehrt auf demselben Weg zurück; bei 3,9 s steht wieder genau die KAMPFHALTUNG. 3,9 bis 6,0 s Ruhe: Darja steht in der KAMPFHALTUNG bis zum letzten Bild, nur leises Atmen. Ab 1,6 s stehen beide Stiefeletten fest an ihrem Platz. Im ganzen Video gibt es genau einen Stoß.

HANDLUNG: Übergang: Darja steht zuerst wie in der Referenz frontal in der A-Pose, aufrecht, die Arme schräg nach unten gestreckt. Dann dreht sie sich auf der Stelle um etwa 90 Grad nach ihrer linken Seite, also im Bild nach rechts: ihr Gesicht zeigt danach im Bild nach rechts, ihre rechte Schulter kommt zur Kamera hin, ihre linke Schulter geht von der Kamera weg, und die Kamera sieht ihre RECHTE Körperseite. Beim Drehen bleiben die Füße an ihrem Platz und ihr Rücken zeigt nie zur Kamera; sie dreht sich nicht weiter, nicht zurück und nie in die Gegenrichtung, sie nähert sich der Kamera nicht und blickt danach nie nach links; die Kamera dreht sich nicht mit. Dabei heben sich die Arme aus der A-Pose, die Ellbogen beugen sich, die Hände bleiben offen; das Haar schwingt beim Drehen nur wenig mit, fliegt nicht auf, bleibt hinter Ohren und Schultern und liegt danach wieder glatt auf dem Rücken. Im Profil nimmt sie die KAMPFHALTUNG ein, ohne Schritt: die Füße bleiben dort, wo sie in der A-Pose standen, nur die Fußspitzen drehen sich mit nach rechts; so steht nach der Drehung ihr linker Fuß vorn (im Bild rechts) und ihr rechter Fuß hinten (im Bild links), und die Mitte zwischen den Füßen bleibt an ihrem Platz. Die Knie beugen sich leicht, die linke Hand kommt nach vorn in Schulterhöhe, die rechte Hand vor das Kinn. Kein Schritt, kein Sprung, kein Hüpfen, kein Umsetzen der Füße: beide Sohlen bleiben auf der Höhe der Sohlen im ersten Bild, und die Füße bewegen sich nie wieder. Stoß: Aus der KAMPFHALTUNG führt Darja genau EINEN schnellen, geraden Handballenstoß mit ihrer RECHTEN Hand aus, der hinteren Hand am Kamera-nahen rechten Arm, die vor dem Kinn steht; die Hand bleibt dabei offen. Vor dem Stoß (2,0 bis 2,5 s): Darja steht ganz still in der KAMPFHALTUNG. Zurücknehmen (2,5 bis 2,7 s): die rechte Hand zieht sich auf gleicher Höhe nur eine Handbreit nach hinten (im Bild nach links), der rechte Ellbogen bleibt unten nah am Körper; dabei dreht sich die Hand so, dass die Handfläche nach vorn zeigt, die Finger zeigen nach oben und liegen gestreckt aneinander, der Daumen liegt an; kein weites Zurückziehen, kein Bogen, die Hand geht nie über den Kopf und nie hinter den Körper. Stoß (2,7 bis 2,9 s): die rechte Hand schießt auf geradem Weg waagrecht nach vorn in Blickrichtung (im Bild nach rechts), in Schulterhöhe, mit dem Handballen voran, die Finger nach oben, die Handfläche zeigt nach vorn. Der rechte Arm streckt sich vollständig: der Ellbogen ist durchgestreckt, Schulter, Arm und Hand bilden eine waagrechte Gerade. Dabei schiebt sich die rechte Schulter ein Stück nach vorn, der Oberkörper neigt sich ein kleines Stück nach vorn; so reicht die Hand weit vor den Körper, deutlich vor die Spitze der vorderen linken Stiefelette. Die LINKE Hand, die vordere Hand, weicht dem Stoß aus: sie sinkt beim Stoß vor die Brust und bleibt dort offen, sie stößt nie selbst. Schultern und Hüfte bleiben im Profil: Darja dreht sich weder zur Kamera hin noch von ihr weg; Gesicht und Blick bleiben waagrecht nach rechts, das Kinn leicht erhoben, der Kopf fast auf gleicher Höhe. Die Hand stößt in die leere Luft: kein Ziel, kein Aufprall, keine Effekte. Halten (2,9 bis 3,4 s): der rechte Arm bleibt voll gestreckt und ruhig in derselben Lage, kein Wackeln, kein Nachstoßen. Rückzug (3,4 bis 3,9 s): die rechte Hand kehrt auf demselben geraden Weg zurück, Schulter und Oberkörper gehen in die Lage der KAMPFHALTUNG zurück, die linke Hand kommt wieder nach vorn in Schulterhöhe, bis die rechte Hand wieder eine Handbreit vor dem Kinn steht. Ruhe (3,9 s bis zum letzten Bild): dieselbe KAMPFHALTUNG wie vor dem Stoß. Beide Hände bleiben immer offen, nie Fäuste, normal groß, mit fünf Fingern; Arm und Hand werden zur Kamera hin nicht größer. Beide Stiefeletten bleiben mit Ballen und Absatz an derselben Stelle: kein Schritt, kein Nachsetzen, kein Rutschen, keine Ferse hebt ab, die Stilettoabsätze bleiben gerade; die Knie bleiben leicht gebeugt, das linke Bein bleibt vorn. Das Haar schwingt beim Stoß leicht nach und kommt wieder zur Ruhe, bleibt aber hinter Schulter und Nacken als geschlossene Fläche, keine Strähne fällt vor Gesicht oder Hals. Das Mundtuch sitzt fest, der Hals bleibt frei. Genau ein Stoß im ganzen Video: kein zweiter Stoß, kein Doppelschlag, kein Scheinschlag, kein Zucken der Hände vorher oder nachher, kein Tritt.

ENDE: Von 3,9 s bis zum letzten Bild (6,0 s) steht Darja ruhig in der KAMPFHALTUNG wie bei 2,0 s vor dem Stoß: linke Hand vorn in Schulterhöhe, rechte Hand eine Handbreit vor dem Kinn, beide Hände offen, beide Stiefeletten an derselben Stelle. Nur leises Atmen, keine neue Bewegung: kein zweiter Stoß, kein Zucken, kein Schritt, keine Drehung, kein Wechsel der Haltung; sie kehrt nie in die A-Pose zurück. Nochmals das Wichtigste: einfarbig grüner Hintergrund wie im ersten Bild in jedem Bild, nichts Grünes an der Figur, feste Kamera, Darja bleibt so groß wie im ersten Bild und an ihrem Platz, beide Stiefeletten auf derselben Höhe wie die Sohlen im ersten Bild, strenges Profil nach rechts, genau ein gerader Handballenstoß mit der offenen rechten Hand, Zeichenstil exakt wie in der Referenz, nichts ändern, nichts hinzufügen.
```
