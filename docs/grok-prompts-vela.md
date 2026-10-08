# Fertige Grok-Prompts für Vela (Fassung 2)
Jeder Abschnitt ist ein vollständiger Prompt zum Einfügen (Vorspann + Handlung). Einziges Bild: das Startbild `spiel/grafik/quelle/fremd/vela/vela_k_kampfhaltung_gruen_quadrat.png`, Format 1:1, 24 B/s. Quelle und Begründung: `docs/grafik-bestellung.md`, Abschnitt „Vela als Video“.

## stand (vela_v_stand.mp4, Länge 3,0 s, Schleife)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela bleibt in der Kampfhaltung des Startbilds und atmet ruhig. Ihre
Füße bewegen sich nicht und bleiben fest an derselben Stelle. Die Schultern
heben und senken sich deutlich (etwa 3 Prozent der Körperhöhe), der Brustkorb
hebt und senkt sich im Rhythmus des Atems, die Fäuste federn dabei leicht mit,
der Pferdeschwanz wippt leicht. Ein Atemzug (Heben und Senken) dauert genau 3
Sekunden. 0,0 bis 1,5 s heben, 1,5 bis 3,0 s senken.
ENDE: Das letzte Bild gleicht dem ersten Bild: dieselbe Pose, dieselbe
Position, dieselbe Größe (Schleife).
```

## gehen (vela_v_gehen.mp4, 4,0 s, Schleife)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela lässt die Fäuste sinken, dreht sich in eine strenge Seitenansicht
von rechts (Profil, sie blickt nach rechts) und geht auf der Stelle in einem
gleichmäßigen, lockeren Schritt (die Kamera und Vela bleiben am Platz; die Füße
treten auf der Stelle). 0,0 bis 0,6 s: Fäuste sinken, Drehung ins Profil. 0,6 bis
4,0 s: genau drei Doppelschritte (linker Schritt, rechter Schritt = ein
Doppelschritt), jeder Doppelschritt dauert genau 1,1 Sekunden. Die Arme schwingen
deutlich und abwechselnd im Gegentakt zu den Beinen: ist das linke Bein vorn,
schwingt der rechte Arm nach vorn und der linke nach hinten, beim nächsten
Schritt umgekehrt. Die Fäuste sind locker geschlossen und bleiben auf Hüfthöhe,
nie auf Brusthöhe, nie erhoben. Beide Fäuste sind nie gleichzeitig vorn. Jeder
Fuß setzt deutlich vor dem Körper auf und hebt hinter ihm ab. Die Beine kreuzen
sich nie und tauschen nie die Seiten: das vordere Bein bleibt zu jedem
Zeitpunkt eindeutig das vordere. Der Pferdeschwanz schwingt mit.
ENDE: Das Video endet am Ende des dritten Doppelschritts in derselben Pose, in der
der erste Doppelschritt begann (Schleife); Vela bleibt im Profil.
```

## sprint (vela_v_sprint.mp4, 3,0 s, Schleife)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela dreht sich aus der Kampfhaltung in die strenge Seitenansicht von
rechts (Profil, Blick nach rechts) und läuft auf der Stelle schnell, wie bei
einem Sprint: Oberkörper 15 Grad nach vorn geneigt, lange Schritte, die Knie
heben sich hoch, die Arme sind angewinkelt und schwingen kräftig im Gegentakt
zu den Beinen (ein Arm vor, der andere zurück, nie beide gleichzeitig vorn),
der Pferdeschwanz fliegt waagrecht nach hinten. 0,0 bis 0,4 s: Drehung ins
Profil und Anlauf. 0,4 bis 3,0 s: genau vier Doppelschritte (je 0,65 s). Die
Beine kreuzen sich nie und tauschen nie die Seiten.
ENDE: Das Video endet am Ende des vierten Doppelschritts in derselben Pose, in
der der erste begann (Schleife), im Profil.
```

## kette1 (vela_v_kette1.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Genau EIN Schlag mit der vorderen (linken, dem Betrachter näheren)
Faust, ein gerader Jab nach vorn (nach rechts). 0,0 bis 0,6 s: Vela bleibt
völlig still in der Kampfhaltung. 0,6 bis 0,9 s: sie holt kurz aus, die Schulter
dreht minimal ein. 0,9 bis 1,1 s: die Faust schießt gerade nach vorn und der Arm
ist voll gestreckt. 1,1 bis 1,8 s: sie hält den voll gestreckten Arm. 1,8 bis 2,5
s: sie zieht die Faust zurück. 2,5 bis 4,0 s: sie steht still in der
Kampfhaltung. Nur dieser eine Schlag, kein zweiter Schlag, kein Scheinschlag,
kein Zucken. Die Füße bleiben am Boden und an derselben Stelle.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung, dieselbe Pose,
Position und Größe).
```

## kette2 (vela_v_kette2.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Genau EIN Schlag mit der hinteren (rechten) Faust, ein kräftiger
gerader Schlag nach vorn (nach rechts) mit Hüftdrehung. 0,0 bis 0,6 s: völlig
still in der Kampfhaltung. 0,6 bis 1,0 s: sie holt aus, der Oberkörper dreht
nach hinten, die rechte Faust geht zurück. 1,0 bis 1,2 s: die hintere Faust
schießt gerade nach vorn, Hüfte und Schulter drehen mit ein, der Arm ist voll
gestreckt. 1,2 bis 1,9 s: sie hält den voll gestreckten Arm. 1,9 bis 2,6 s: sie
zieht die Faust zurück und dreht Hüfte und Schulter zurück. 2,6 bis 4,0 s:
still in der Kampfhaltung. Nur dieser eine Schlag, kein Vorschlag, kein
Scheinschlag. Keine Funken, keine Blitze an der Faust.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung).
```

## kette3 (vela_v_kette3.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Genau EIN Haken von unten: ein Aufwärtshaken mit der vorderen
(linken) Faust, der von unten schräg nach vorn-oben (rechts oben) geht. 0,0 bis
0,6 s: still in der Kampfhaltung. 0,6 bis 1,0 s: sie geht in den Knien etwas
tiefer, die vordere Faust sinkt nach unten. 1,0 bis 1,3 s: der Körper streckt
sich, die Faust fährt von unten schräg nach oben, der Arm ist am Ende gestreckt
und zeigt schräg nach oben-vorn. 1,3 bis 2,0 s: sie hält diese Pose. 2,0 bis 2,7
s: sie senkt den Arm und geht zurück. 2,7 bis 4,0 s: still in der Kampfhaltung.
Keine Funken, keine Blitze, keine Strahlen an der Faust. Der Kopf bleibt immer
mit 15 Prozent Abstand zum oberen Bildrand.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung).
```

## kette4 (vela_v_kette4.mp4, 5,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Genau EIN Dreh-Tritt: ein hoher Tritt mit Drehung. 0,0 bis 0,6 s:
still in der Kampfhaltung. 0,6 bis 1,0 s: sie holt aus. 1,0 bis 1,2 s: kurzer
gerader Armstoß nach vorn (rechts) mit der vorderen Faust. 1,2 bis 1,8 s: sie
dreht sich um die eigene Achse nach hinten (Rückenansicht ist zu sehen, ganze
Drehung etwa 270 Grad) und hebt dabei das hintere Bein. 1,8 bis 2,0 s: das
hintere Bein tritt waagrecht nach vorn (rechts), das Bein ist gestreckt und
waagrecht in Hüfthöhe, der Oberkörper lehnt zurück. 2,0 bis 2,8 s: sie hält die
Trittpose. 2,8 bis 3,4 s: sie setzt den Fuß ab und dreht zurück in die
Kampfhaltung. 3,4 bis 5,0 s: still in der Kampfhaltung. Das Standbein bleibt am
Boden und rutscht nicht. Der Kopf und der Zopf bleiben mit 15 Prozent Abstand
zum oberen Bildrand.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung).
```

## sprung (vela_v_sprung.mp4, 3,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Genau EIN Sprung auf der Stelle, senkrecht nach oben. Wichtig: Vela
springt NUR ETWA EINE HALBE KÖRPERHÖHE hoch (der Kopf steigt höchstens um 25
Prozent der Bildhöhe), damit nichts am oberen Bildrand abgeschnitten wird. 0,0
bis 0,5 s: still in der Kampfhaltung. 0,5 bis 0,8 s: sie geht tief in die Hocke,
die Arme gehen nach hinten-unten. 0,8 bis 1,0 s: Absprung, die Arme schwingen
nach oben, die Beine strecken sich. 1,0 bis 1,3 s: sie steigt, am Scheitel
(1,3 s) zieht sie die Knie an, die Fäuste bleiben vor der Brust. 1,3 bis 1,7 s:
sie fällt. 1,7 bis 1,9 s: Landung in der tiefen Hocke. 1,9 bis 2,5 s: sie richtet
sich auf und kehrt in die Kampfhaltung zurück. 2,5 bis 3,0 s: still. Der Kopf
und der Zopf bleiben im ganzen Video vollständig im Bild.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung).
```

## getroffen_vorn (vela_v_getroffen_vorn.mp4, 2,5 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela wird von vorn (aus Richtung rechts) getroffen (der Treffer selbst
ist nicht zu sehen). 0,0 bis 0,5 s: still in der Kampfhaltung. 0,5 bis 0,6 s: der
Treffer: Kopf und Oberkörper schnellen nach hinten (nach links), der Mund
verzieht sich vor Schmerz, die Augen kneifen zu, die Fäuste öffnen sich leicht
und die Arme gehen leicht nach außen. Die Füße bleiben am Boden. 0,6 bis 1,0 s:
sie hält die Auslenkung. 1,0 bis 1,8 s: sie fängt sich und kommt zurück. 1,8 bis
2,5 s: still in der Kampfhaltung. Kein Fallen, kein Taumeln über mehr als 5
Prozent der Bildbreite.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung).
```

## getroffen_hinten (vela_v_getroffen_hinten.mp4, 2,5 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela wird von hinten (aus Richtung links) getroffen. 0,0 bis 0,5 s:
still in der Kampfhaltung. 0,5 bis 0,6 s: der Treffer: der Oberkörper schnellt
nach vorn (nach rechts), der Kopf geht nach vorn-unten, das Gesicht verzieht sich
vor Schmerz, die Arme gehen nach hinten-außen. Die Füße bleiben am Boden. 0,6
bis 1,0 s: sie hält die Auslenkung. 1,0 bis 1,8 s: sie fängt sich und kommt
zurück. 1,8 bis 2,5 s: still in der Kampfhaltung.
ENDE: Das letzte Bild gleicht dem ersten Bild (Kampfhaltung).
```

## umgeworfen (vela_v_umgeworfen.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela wird hart von vorn (aus Richtung rechts) getroffen, hebt ab, fliegt
rückwärts (nach links) durch die Luft und schlägt auf dem Rücken auf. Es gibt
keinen Boden, keinen Staub, keinen Schatten. 0,0 bis 0,4 s: still in der
Kampfhaltung. 0,4 bis 0,6 s: harter Treffer, Oberkörper und Kopf schnellen nach
hinten. 0,6 bis 1,0 s: sie hebt ab, der Körper kippt nach hinten, die Arme
fliegen auseinander. 1,0 bis 1,4 s: sie fliegt in flachem Bogen etwa 20 Prozent
der Bildbreite nach links und ist waagrecht in der Luft. 1,4 bis 1,5 s: sie
schlägt mit dem Rücken auf (der Körper liegt dann waagrecht auf der Höhe der
Fußlinie des Startbilds). 1,5 bis 4,0 s: sie liegt still auf dem Rücken, die
Arme zur Seite, das Gesicht nach oben, Zopf neben dem Kopf, keine Bewegung außer
sehr leichtem Atmen.
ENDE: Vela liegt auf dem Rücken, regungslos, vor demselben grünen Hintergrund.
Kein Staub, kein Schatten.
```

## aufstehen (vela_v_aufstehen.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

STARTBILD FÜR DIESEN CLIP: das letzte Bild des Clips umgeworfen (Vela liegt auf
dem Rücken auf dem grünen Hintergrund); als zweites Bild das Startbild der
Kampfhaltung (Zielpose). Bei diesem Clip gilt abweichend: die Kamera, die Figur
und der Hintergrund bleiben wie im Startbild, die Figur liegt zu Beginn.
HANDLUNG: 0,0 bis 0,4 s: Vela liegt still. 0,4 bis 1,0 s: sie stützt sich auf
einen Arm und richtet den Oberkörper auf (Sitzen). 1,0 bis 1,6 s: sie zieht ein
Bein an und kommt auf ein Knie (Kniestand, die Faust am Boden). 1,6 bis 2,4 s:
sie steht auf. 2,4 bis 3,0 s: sie nimmt die Fäuste hoch und geht in die
Kampfhaltung. 3,0 bis 4,0 s: still in der Kampfhaltung. Die Endpose ist GENAU
die Kampfhaltung des zweiten Bildes: Dreiviertelansicht, Vela blickt nach rechts,
gleiche Größe, Fäuste vor der Brust (nicht frontal zur Kamera).
ENDE: Das letzte Bild gleicht der Kampfhaltung des zweiten Bildes.
```

## griff (vela_v_griff.mp4, 3,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela greift mit beiden Händen einen unsichtbaren Gegner, der direkt
vor ihr (rechts, 15 Prozent der Bildbreite entfernt) steht; der Gegner ist NICHT
im Bild (auch keine Silhouette): die Hände greifen und halten ins Leere auf
Brusthöhe, als würde sie den Kragen eines Gegners packen. 0,0 bis 0,5 s: still in
der Kampfhaltung. 0,5 bis 1,0 s: beide Arme strecken sich nach vorn und die Hände
packen zu (Fäuste um den Kragen). 1,0 bis 3,0 s: sie hält fest, zieht leicht
nach unten und hält den Oberkörper leicht nach vorn gelehnt, die Füße fest.
ENDE: Vela hält den Griff, regungslos (diese Pose hält die letzten 1,5 Sekunden).
```

## kniestoss (vela_v_kniestoss.mp4, 3,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela hält mit beiden Händen einen unsichtbaren Gegner am Kragen (wie am
Ende von griff, Hände auf Brusthöhe vor ihr, kein Gegner im Bild) und stößt das
hintere Knie hoch nach vorn-oben. 0,0 bis 0,6 s: sie hält den Griff. 0,6 bis 1,0
s: das hintere Knie fährt hoch bis Hüfthöhe, der Oberkörper beugt leicht nach
vorn und zieht nach unten. 1,0 bis 1,6 s: sie hält das Knie oben. 1,6 bis 2,2 s:
sie setzt den Fuß ab. 2,2 bis 3,0 s: sie hält wieder den Griff.
ENDE: Vela hält den Griff wie am Anfang.
```

## wurf (vela_v_wurf.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela wirft einen unsichtbaren Gegner (nicht im Bild) über die Schulter.
0,0 bis 0,5 s: sie hält ihn am Kragen (beide Hände vor der Brust). 0,5 bis 1,2
s: sie beugt sich vor und hebt ihn mit beiden Armen an (die Arme gehen nach oben
über den Kopf). 1,2 bis 1,8 s: sie dreht den Oberkörper und schwingt die Arme
über die rechte Schulter nach vorn-unten, wie bei einem Schulterwurf. 1,8 bis 2,2
s: sie lässt los, die Hände öffnen sich, die Arme zeigen nach vorn-unten. 2,2 bis
3,0 s: der Schwung klingt aus. 3,0 bis 4,0 s: sie richtet sich auf und steht in
der Kampfhaltung.
ENDE: Das letzte Bild gleicht dem Startbild (Kampfhaltung).
```

## spezial (vela_v_spezial.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela kniet nieder und schlägt beide Handschuhe auf den Boden. 0,0 bis 0,5 s:
still in der Kampfhaltung. 0,5 bis 1,0 s: sie geht tief in die Knie, die Arme
gehen nach oben. 1,0 bis 1,3 s: beide Fäuste schlagen zu Boden (Fäuste berühren
den Boden unter den Schultern). 1,3 bis 2,3 s: sie hält die Pose, die Handschuhe
am Boden. 2,3 bis 3,2 s: sie richtet sich auf. 3,2 bis 4,0 s: still in der
Kampfhaltung. KEINE Blitze, KEINE Wellen, KEIN Leuchten, KEINE Risse im Boden
(die Welle zeichnet das Spiel).
ENDE: Das letzte Bild gleicht dem Startbild (Kampfhaltung).
```

## waffe (vela_v_waffe.mp4, 4,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela hebt einen Raketenwerfer (ein Rohr aus grauem Stahl, etwa
Schulterlänge, auf der rechten Schulter aufliegend) an, zielt und schießt. 0,0
bis 0,5 s: sie steht in der Kampfhaltung. 0,5 bis 1,2 s: sie legt sich das Rohr auf die
rechte Schulter und hält es mit beiden Händen, die Mündung zeigt nach vorn
(rechts). 1,2 bis 2,0 s: sie zielt ruhig. 2,0 bis 2,1 s: Abschuss, das Rohr
rückt leicht nach hinten (Rückstoß). 2,1 bis 3,0 s: sie senkt das Rohr. 3,0 bis
4,0 s: sie steht in der Kampfhaltung (das Rohr ist verschwunden).
KEIN Mündungsfeuer, KEINE Rakete, KEIN Rauch.
ENDE: Das letzte Bild gleicht dem Startbild (Kampfhaltung, ohne Waffe).
```

## aufnehmen (vela_v_aufnehmen.mp4, 3,0 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Vela bückt sich und hebt etwas vom Boden auf (das aufgehobene Ding ist
NICHT sichtbar, die Hand schließt sich um etwas Kleines). 0,0 bis 0,5 s: still in
der Kampfhaltung. 0,5 bis 1,1 s: sie beugt sich vor, die vordere Hand geht zum
Boden vor den Füßen. 1,1 bis 1,5 s: die Hand schließt sich. 1,5 bis 2,2 s: sie
richtet sich wieder auf. 2,2 bis 3,0 s: still in der Kampfhaltung.
ENDE: Das letzte Bild gleicht dem Startbild (Kampfhaltung).
```

## sprungtritt (vela_v_sprungtritt.mp4, 3,5 s)

```text
STARTBILD: Das beigefügte erste Bild zeigt die Heldin Vela vor einem einfarbigen
grünen Hintergrund (reines Chroma-Key-Grün, RGB 0, 177, 64, Hexwert #00B140).
Das Video beginnt exakt mit diesem Bild (gleiche Pose, gleiche Größe, gleicher
Ort im Bild, gleicher grüner Hintergrund) und der Hintergrund bleibt in
JEDEM einzelnen Bild bis zum letzten Bild genau dieses Grün. Kein schwarzes
Bild am Anfang, kein Einblenden, kein Überblenden, kein Farbverlauf, keine
Vignette, kein Rauschen, keine Textur im Hintergrund.

FIGUR: Vela bleibt in jedem Bild dieselbe Figur wie im Startbild: gleiche
Gesichtszüge, gleiches rotbraunes Haar mit hohem Pferdeschwanz, gleiche blaue
Jacke mit orangem Querstreifen und goldenen Nähten, dunkles Top, dunkelblaue
Hose, schwarze Schnürstiefel, graublaue Stahlhandschuhe. Nichts davon ändern,
nichts hinzufügen. Stil: Pixelgrafik eines Arcade-Prügelspiels, harte Pixelkanten, wie
im Startbild.

BILD: Quadratisches Bild. Feste Kamera ohne jede Bewegung (kein Zoom, kein
Schwenk, kein Wackeln, kein Neigen). Die Kamera schaut waagrecht auf Vela. Vela
steht auf der Stelle und bleibt an ihrem Platz in der Bildmitte (mit Ausnahme
der Bewegungen, die unten verlangt werden). Die ganze Figur ist in jedem Bild
vollständig zu sehen, auch Stiefel, Fäuste und Zopfspitze. Vela nimmt im Startbild 60 Prozent der Bildhöhe ein und wird nie größer als 65 Prozent; zwischen Kopf (bei Sprüngen und Tritten:
höchster Punkt) und oberem Bildrand bleiben mindestens 15 Prozent Platz, seitlich
mindestens 20 Prozent.

VERBOTEN (nirgends im Video): Boden, Bodenlinie, Schatten (auch kein weicher
Schatten unter den Füßen), Staub, Rauch, Funken, Blitze, Strahlen, Wischlinien,
Geschwindigkeitslinien, Schweißtropfen, Sterne, Kreise, Treffereffekte,
Gegner, Waffen (außer wo verlangt), zweite Personen, Schrift, Zahlen, Logos,
Wasserzeichen, Untertitel, Rahmen, Musik, Ton.

ABLAUF: Genau EINE Handlung, genau EIN Durchlauf, keine Wiederholung. Das
Video endet mit der Pose, die im Prompt unter ENDE genannt ist, und Vela
bewegt sich in der letzten Sekunde nicht mehr.

HANDLUNG: Sprung mit seitlichem Tritt. Wichtig: Vela springt NUR ETWA EINE HALBE
KÖRPERHÖHE hoch, der Kopf bleibt mit 15 Prozent Abstand zum oberen Bildrand.
0,0 bis 0,5 s: still in der Kampfhaltung. 0,5 bis 0,8 s: tiefe Hocke. 0,8 bis
1,0 s: Absprung. 1,0 bis 1,3 s: in der Luft zieht sie das hintere Bein an. 1,3
bis 1,6 s: sie tritt mit dem hinteren Bein gestreckt waagrecht nach vorn
(rechts), das Standbein ist angezogen. 1,6 bis 1,9 s: sie hält den Tritt am
höchsten Punkt. 1,9 bis 2,2 s: sie fällt, das Bein geht zurück. 2,2 bis 2,5 s:
Landung in der Hocke. 2,5 bis 3,5 s: sie richtet sich auf und steht in der
Kampfhaltung.
ENDE: Das letzte Bild gleicht dem Startbild (Kampfhaltung).
```
