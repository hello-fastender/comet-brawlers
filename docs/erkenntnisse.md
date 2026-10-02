# Comet Brawlers: Erkenntnisse aus Captain Commando

Stand 2026-10-02. Dieses Dokument fasst zusammen, was die Analyse von
Captain Commando (Arcade, Fassung „World 911202“, MAME-Set `captcomm`) für
Comet Brawlers ergeben hat, und legt fest, wie wir die Ergebnisse nutzen.
Einzelheiten und Belege stehen in den verlinkten Dateien.

## Haltung: inspiriert, kein Nachbau

Entscheidung vom 2026-10-02: Comet Brawlers ist von Captain Commando
inspiriert, soll sich aber nicht 1:1 so spielen. Daraus folgt:

- **Kampfgefühl der Spielfigur**: übernehmen wir nach Zahlen. Das sind die
  gesicherten Werte in `docs/mechanik.md`. Weichen wir bewusst davon ab,
  steht die Abweichung dort.
- **Gegner, Stages, Gegenstände, Spielablauf**: entwerfen wir selbst. Das
  Original liefert Richtwerte und Vorbilder (siehe unten), keine Vorgaben.
- **Grafik, Figuren, Namen, Geschichte, Sound**: eigene. Die Aufnahmen
  unter `research/captcomm/grafik/` dienen als Referenz für Größen, Timing
  und Aufbau.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `docs/mechanik.md` | verbindliche Zahlenwerte für das Spiel, nur gesicherte Messungen |
| `docs/erkenntnisse.md` | dieses Dokument: Überblick, Erkenntnisse, Richtwerte, offene Punkte |
| `docs/design.md` | Designdokument Kern (Entwurf): Vision, Welt, technische Grundlage, Grundkit der Spielfigur, Helden, Lebenspunkte und Schwierigkeit, Rahmen, vertikale Scheibe, offene Entscheidungen |
| `docs/design-gegner-stages.md` | Designdokument Gegner, Bosse und Stages (Entwurf): Gegnerrollen, Verhaltensmodell, Wiederverwendung, Bosse, Stage-Schablone, acht Stages, erste Stage im Detail, Gegenstände, Animationsplan |
| `research/captcomm/notes.md` | Methode, alle Messungen mit Status und Belegen, Speicheradressen |
| `research/captcomm/grafik/README.md` | Stages, Spielfiguren und Gegner mit Bildern, Kennwerten und Animationsdauern |
| `research/captcomm/logs/` | Belege der Messungen (CSV) |
| `research/captcomm/scripts/` | MAME-Szenarien und Auswertungen; damit lassen sich alle Belege und Bilder neu erzeugen |

## Stand der Analyse

Kennzeichnung wie in `research/captcomm/notes.md`: **gesichert** heißt in
mehreren Läufen reproduziert und mit Skript im Repo belegt; **Workflow**
heißt von mehreren Agenten unabhängig gemessen und gegengeprüft, aber ohne
Skript im Repo (die Messungen vom 2026-10-02 sind außerdem von einem
unabhängigen Gegenprüfer bestätigt, bei Abweichungen durch eine dritte
Messung geklärt); **beschrieben** heißt aus Aufnahmen beschrieben und nur
stichprobenweise nachgemessen; **offen** heißt nicht untersucht.

| Bereich | Stand |
|---|---|
| Steuerung der Spielfigur (Captain Commando): Laufen, Sprung, Schlagkette, Sprungangriff, Griff, Wurf, Umgeworfen werden, Schutz nach Treffern | gesichert, in `mechanik.md` |
| Sprint, Sprintangriff, Sprintsprung | gesichert, in `mechanik.md` („Sprint“) |
| Spezialangriff | gesichert für alle vier Helden, in `mechanik.md` („Spezialangriff“) |
| Die anderen drei Helden | Animationen aufgenommen; Spezialangriff gesichert; Schaden der Kette und Würfe Workflow |
| Schaden und Lebenspunkte der Gegner, Schwierigkeit (Rang) | Rang und Schaden des WOOKY gesichert, übrige Gegner Workflow |
| Aussehen, Animationen und Angriffe aller Gegner und Bosse | beschrieben |
| Trefferreaktion der Gegner (Dauer, Rückstoß, Umwerfen, Aufstehen, Tod) | gesichert für WOOKY und EDDY, in `mechanik.md` („Trefferreaktion der Gegner“) |
| Verhalten der Gegner (Annähern, Angriffswahl, wie viele gleichzeitig angreifen) | WOOKY und EDDY gesichert als Richtwert (notes.md „Nachtrag: Verhalten der Nahkämpfer“); Angriffsraten, Wahl der Angriffsart und Einzelheiten der Angriffsabläufe unsicher; andere Gegner offen |
| Reichweite, Startup und Nachlauf der Gegnerangriffe | WOOKY, EDDY und SKIP gesichert, in `mechanik.md` („Reichweite der Gegnerangriffe“); DICK und Messerwurf des SKIP offen |
| Aufbau der 9 Stages: Länge, Kamera, Sperren, Tiefe, Objekte, Wellen | beschrieben; je Stage 6 bis 9 Angaben gegengeprüft |
| Gegenstände (Essen, Waffen) und Fahrzeuge | Gegenstände und Waffen gesichert, in `mechanik.md` („Gegenstände und Waffen“); Fahrzeuge nicht untersucht |
| Titel, Figurenwahl, Anzeigeleiste, Punkte, Leben, Continue | Punkte gemessen (`mechanik.md`, „Gegenstände und Waffen“); übrige offen |
| Mehrspieler | offen |
| Sound | nicht Teil der Analyse |

## Was das Kampfgefühl ausmacht

Die wichtigsten Erkenntnisse zur Spielfigur, alle gesichert. Die genauen
Werte und Zeitfenster stehen in `mechanik.md`.

- **Direkte Steuerung**: Das Spiel reagiert einen Frame nach der Eingabe.
  Die Figur läuft ohne Anlauf und Abbremsen und dreht ohne Verzögerung um
  (1,75 px/Frame seitlich, 1,0 px/Frame in der Tiefe).
- **Kurze, klare Schlagkette**: vier Schläge mit 3, 4, 5 und 10 LP. Der
  vierte wirft den Gegner immer um. Der nächste Schlag wird nur in einem
  Fenster von 16 Frames angenommen und nicht gepuffert. Die Kette verlangt
  also einen Rhythmus, Dauerdrücken reicht nicht.
- **Wucht durch Trefferstopp**: Bei jedem Treffer steht die Animation des
  Angreifers 7 Frames still.
- **Positionieren in der Tiefe**: Die Reichweite nach vorn wächst mit der
  Kette (85, 87, 91, 100 px), die Tiefe muss aber auf etwa 12 px stimmen.
  Wer in der Tiefe danebensteht, trifft nicht.
- **Werkzeuge gegen Gruppen**: Griff durch Hineinlaufen (bis 39 px vorn,
  10 px Tiefe), Wurf mit 14 LP. Der geworfene Gegner fliegt etwa 185 px
  weit und wirft andere Gegner auf seiner Bahn um. Die meisten
  Sprungangriffe (7 LP, senkrecht 12 LP) werfen ebenfalls um.
- **Notausgang mit Preis**: Der Spezialangriff (Angriff und Sprung im
  selben Frame) schützt die Figur 70 Frames lang (50 Frames Aktion, danach
  20 Frames Schutz, in denen sie schon handeln kann). Er trifft alle Gegner
  in einer Fläche, die bis 123 px vor und 122 px hinter die Figur wächst,
  mit 6 LP und wirft sie um. Er kostet 9 LP, aber nur, wenn er trifft, und
  senkt die LP dabei höchstens auf 0.
- **Fairness**: 27 Frames Schutz nach einem Treffer, 35 Frames nach dem
  Aufstehen. Umgeworfen liegt die Figur 121 Frames, schnelles Drücken
  verkürzt das auf etwa 90. Die Gegner nehmen auf den Schutz keine
  Rücksicht: Sie greifen auch in den Schutzfenstern an, ihre Treffer werden
  ignoriert, und mehrfach trifft ein Gegner genau im ersten Frame nach dem
  Schutz. Treffen sich Figur und Gegner im selben Frame, gewinnt die Figur
  (Workflow). Die Figur stirbt erst unter 0 LP.
- **Verhältnis von Schaden und Lebenspunkten**: Die Figur hat 72 LP,
  normale Gegner treffen mit 5 bis 10 LP. Sie hält also 8 bis 15 Treffer
  aus. Ein schwacher Gegner (16 LP) fällt mit einer vollen Kette (22 LP).
- **Schwierigkeit passt sich an**: Ein Rang von 7 bis 24 steigt mit der
  Spielzeit (Start bei 9, erstmals nach 409 Frames um 1, danach alle 600
  Frames) und sinkt bei jedem Tod der Figur um 3. Schaden und Lebenspunkte
  später erscheinender Gegner hängen davon ab, ebenso ihre Pause vor jedem
  Angriff (25 Frames bei Rang 7, 9 Frames bei Rang 20 bis 23).
- **Gegner halten die Kette zusammen**: Ein getroffener Gegner steht
  23 Frames in der Trefferreaktion, ohne Rückstoß; ein neuer Treffer startet
  sie neu. Beim spätesten erlaubten Kettendruck ist er 6 bis 7 Frames frei,
  holt aber frühestens 45 Frames nach dem Treffer aus. Die Kette hält also
  nicht wegen der Reaktion, sondern weil der Gegner so spät angreift.
  Umgeworfene Gegner sind bis zum Ende des Aufstehens unverwundbar, danach
  sofort wieder verwundbar, ohne Schutzfenster.

## Spielfiguren

Alle vier Helden bewegen sich gleich: gleiche Lauf- und
Sprintgeschwindigkeit, gleicher Sprung. Sie unterscheiden sich nur in
Aussehen, Animationen, Angriffen und Würfen. Kette und Würfe der drei
Helden außer Captain Commando stammen aus dem Workflow; der Spezialangriff
ist für alle vier gesichert (`mechanik.md`, „Spezialangriff“).

| Held | Umriss im Stand (mit Schatten) | Kette (LP je Stufe) | Wurf | Spezialangriff |
|---|---|---|---|---|
| Captain Commando | 57 × 76 px | 3 / 4 / 5 / 10 | 14 LP, etwa 185 px | 50 Frames, Schlag auf den Boden mit Blitzen nach beiden Seiten, Fläche wächst bis 123 px vorn und 122 px hinten |
| Mack the Knife | 73 × 83 px | 3 / 4 / 5 / 8 | 14 LP, etwa 183 px | 60 Frames, Drehung, trifft sofort bis 94 px, bewegt sich dabei mit 2 px/Frame |
| Ginzu the Ninja | 36 × 75 px | 3 / 4 / 5 / 9 | 12 LP, etwa 181 px; runter + Angriff: eigener Wurf mit 14 LP | 41 Frames, Sprung mit Sternblitz und Rauch, Explosionen von 74 px hinten bis 139 px vorn |
| Baby Head | 61 × 71 px | 6 / 6 / 6 / 6 | 12 LP, etwa 208 px; Sprung mit dem Gegner und Rammen in den Boden: 16 LP | 46 Frames, Rakete mit Feuerball, Explosionen wie Ginzu, 11 Frames später |

Für Comet Brawlers heißt das: Unterschiedliche Helden lassen sich über
Angriffe und Würfe gestalten, ohne die Bewegung anzufassen. Die Messwerte
in `mechanik.md` gelten dann für alle.

## Gegner als Vorbild

Gegnerverhalten und Wellen entwerfen wir selbst. Als Vorbild dienen die
Rollen, die das Original verwendet (beschrieben, Einzelheiten in
`research/captcomm/grafik/README.md`):

| Rolle | Beispiel im Original | Kennzeichen |
|---|---|---|
| Nahkämpfer | WOOKY (16 LP zu Beginn, später 22–34 nach Rang), EDDY (30 LP zu Beginn, später 32–42) | Schlagserien, einzelne Schläge werfen die Figur um; WOOKY geht so schnell wie die Figur (1,75 px/Frame) |
| Schneller Messerkämpfer | SKIP (34–46 LP) | rennt 2,5 px/Frame, Messerwurf (4 px/Frame), Ausfallstich |
| Fernkämpfer | DICK (16–28 LP) | hält 100 bis 140 px Abstand, Pistolensalven oder Raketen; seine Waffe bleibt als Gegenstand liegen |
| Gegner mit Flächenangriff | CAROL (Elektroschock bis etwa 90 px), MARBIN (Flammen) | zwingen die Figur auf Abstand |
| Schwerer Gegner | MARDIA (85 LP), Mech mit Fahrer (85 LP) | viel LP und große Reichweite (Schleimspucke bzw. Armschlag um 90 px); MARDIA geht langsam (1,2 px/Frame) |
| Boss | DOLG (110 LP in den Messläufen) | Super-Armor: Ketten, die ihn nicht umwerfen, bricht er mit einem Stoß ab, und seine LP springen zurück; nur Ketten mit Umwerfen zählen. Greift eine passive Figur alle 170 bis 200 Frames an (Ansturm, dreifacher Armschwung, Sprung-Körperpresse, Griff mit Wurf). Fällt er, brechen alle übrigen Gegner zusammen |

**Verhalten der Nahkämpfer** (WOOKY und EDDY in Stage 1, gesichert; Richtwerte
für unsere Gegnerlogik, Einzelheiten in `research/captcomm/notes.md`,
„Nachtrag: Verhalten der Nahkämpfer“):

- **Aufwachen**: Gegner sind nur aktiv, solange sie höchstens 64 px links
  bzw. 63 px rechts außerhalb des Bildes stehen. Wartende Gegner wachen auf,
  sobald sie 1 px im Bild stehen (die Kamera entscheidet, nicht der Abstand
  zur Figur), und brauchen dann 16 bis 69 Frames zum Aufstehen.
- **Annähern**: Sie gehen diagonal auf die Figur zu, so schnell wie sie
  (1,75 px/Frame seitlich, 0,875 in der Tiefe), rund ein Drittel der Zeit
  schneller (2,25 px/Frame). Sie halten 46 bis 48 px vor der Figur an, nach
  schnellem Gehen 55 bis 56 px, und höchstens 11 px versetzt in der Tiefe.
- **Pause vor jedem Angriff**: In Kampfhaltung warten sie 29 − 4·⌊Rang/4⌋
  Frames, also 25 Frames bei Rang 7 bis 9 Frames bei Rang 20 bis 23 (bei
  Rang 24 in einer Messung 5 Frames). Der Rang macht die Gegner damit nicht
  nur stärker, sondern auch schneller.
- **Serien**: mehrere Angriffe im Abstand von 38 bis 90 Frames; die Serie
  endet, wenn ein Angriff die Figur umwirft. Meist sind es 3 Angriffe, die
  Höchstlänge weicht zwischen den Messungen ab (bis 6, beim WOOKY auch bis
  10; unsicher). Zwischen den Serien gehen sie, spotten oder warten auf
  etwa 120 px Abstand. Die Pause bis zur nächsten Serie schwankt stark
  (EDDY 45 bis 2237 Frames) und wird mit der Spielzeit länger.
- **Ausweichen**: Verlässt die Figur den Tiefenbereich von −10 bis +11 px
  um den Gegner, bricht er jeden Angriff im selben Frame ab und plant neu.
  Läuft sie nach links weg (bis zum Bildrand, etwa 100 Frames), folgt er
  höchstens 92 Frames, der WOOKY mindestens einen Gehbefehl von 40 Frames,
  der EDDY manchmal gar nicht, und bleibt dann stehen; nach rechts folgte
  der WOOKY in den wenigen Läufen länger (unsicher).
  Springen schützt nicht: Er greift im eigenen Rhythmus an und trifft die
  Figur in der Luft.
- **Gruppen**: Kein striktes Nacheinander, aber meist greift nur einer an.
  Zwei gleichzeitige Angriffe gibt es in höchstens 9 % der Frames, mehr als
  zwei in höchstens 3 %. Die übrigen warten nah in Kampfhaltung (45 bis
  55 px) oder auf Abstand (etwa 120 bis 128 px), auch auf beiden Seiten der
  Figur.
- **Nachschub**: Neue Gegner erscheinen an festen Kamerapositionen. Es
  zählt, wie viele Gegner leben, nicht wie viele gestorben sind: SKIP kommt
  nur bei höchstens 2, der WOOKY im Mech nur bei höchstens 3 lebenden
  Gegnern. Beim Boss DOLG (110 LP) kommt die letzte Welle, sobald seine LP
  unter die Hälfte fallen, zwei DICK bei einem Viertel.
- **Kein Griff**: WOOKY und EDDY packen die Figur nie. Je zwei ihrer
  Angriffe werfen um; beim EDDY ist eines davon ein Sprungknie, das auch
  eine Serie eröffnen kann.

**Angriffe der Nahkämpfer und des Messerkämpfers** (WOOKY, EDDY, SKIP,
gesichert; Zahlen in `mechanik.md`, „Reichweite der Gegnerangriffe“):

- **Zielpunkt statt fester Reichweite**: WOOKY und EDDY merken sich für
  jeden Angriff einen Zielabstand zur Figur (höchstens 48 px). Weicht die
  Figur danach mehr als 31 bis 32 px davon ab oder steht sie in der Tiefe
  mehr als 10 bzw. 11 px versetzt, brechen sie ab und gehen nach. Sonst
  trifft der Schlag in seinem ersten aktiven Frame, auch direkt am Gegner
  und bis 3 bis 4 px hinter ihm. Mit 1,75 px/Frame kann die Figur in den 4
  bis 10 Frames Startup seitlich nicht entkommen. Richtwert für unsere
  Nahkämpfer: zielen auf den Punkt beim Ausholen und brechen ab statt
  danebenzuschlagen.
- **Startup und aktive Frames**: Die Schläge von WOOKY und EDDY werden nach
  8 bis 10 Frames aktiv (der schnelle Schlag des WOOKY nach 4) und bleiben 5
  bis 10 Frames aktiv, nach einem Treffer 7 Frames länger (wirft ein Treffer
  des WOOKY um, endet sein Angriff 7 Frames danach). SKIP braucht 13
  bis 14 Frames, sein Stich ist nur 3 bis 4 Frames aktiv, reicht aber
  mindestens 108 px vor und 8 bis 15 px hinter ihn. Der Sprungtritt des
  EDDY bleibt 37 Frames in der Luft aktiv und bricht nie ab.
- **Nachlauf**: Nach dem letzten aktiven Frame folgen 0 bis 8 Frames fester
  Rückzug und eine Wartepose, deren Länge das Spiel wählt. Bis zum nächsten
  Stehen oder Gehen vergehen bei den Schlägen 7 bis 41 Frames. Nach einem
  Treffer mit Umwerfen geht der WOOKY sofort hinterher. SKIP sticht alle 37
  bis 49 Frames.
- **Serien**: Vor einem Umwerfangriff schlägt der WOOKY 2 bis 13 Mal normal
  zu (meist 2 bis 5), der EDDY 0 bis 10, der SKIP 0 bis 8 Mal. Eine feste
  Reihenfolge gibt es nicht. Richtwert: nach 2 bis 5 normalen Angriffen ein
  Angriff, der umwirft.

Weitere Beobachtungen:

- **Wiederverwendung**: Die normalen Gegner aller 9 Stages verteilen sich
  auf gut ein Dutzend Typkennungen. Derselbe Typ kehrt in mehreren Stages
  wieder, oft in anderer Farbe, unter anderem Namen und mit anderen
  Lebenspunkten. Dazu kommt je Stage ein Boss.
- **Schaden der Gegner**: Die Gegner, die zu Beginn von Stage 1 stehen,
  machen festen Schaden (WOOKY 5, EDDY 6 LP). Später erscheinende machen
  je nach Rang 7 bis 13 LP, Raketen bis 15 LP, der Boss DOLG 9 bis 22 LP
  je Angriff.
- **Gleiches Tempo**: Der WOOKY läuft so schnell wie die Figur. Weglaufen
  schafft trotzdem Abstand: Einer nach links fliehenden Figur folgt er
  höchstens 92 Frames, dann spottet er oder wartet auf Abstand.

## Stages als Vorbild

Die 9 Stages folgen einem gemeinsamen Muster (beschrieben, Einzelheiten
je Stage in `research/captcomm/grafik/README.md`):

- **Kamera**: Sie scrollt nur nach rechts, der linke Bildrand wirkt als
  Wand. An Sperren hält sie an, bis die Welle besiegt ist. Stage 1 kommt nur
  ohne Sperre aus, solange die Figur die Gegner besiegt: Die Kamera hält bei
  Kamera-x 848, wenn dort 5 Gegner leben, und vor dem Mech bei 1376 bis
  1378, solange mehr als 3 leben; es zählt die Zahl der Lebenden, nicht der
  Toten. Spätere Stages haben bis zu sechs Sperren. Am Ende jeder Stage
  wartet eine Bossarena.
- **Länge**: Ohne Kämpfe dauert eine Stage etwa 17 bis 56 Sekunden reines
  Gehen. In Stage 1 legt die Kamera 1920 px zurück.
- **Abwechslung**: Abschnitte wechseln durch kurze Skriptszenen, zum
  Beispiel ein Sturz durch ein Bodenloch, eine Liftfahrt oder ein
  automatischer Lauf. Stage 5 ist eine Sonderstage: Die Figur fährt auf
  einem Hoverboard, das Bild scrollt automatisch (6 px/Frame), es gibt
  Hindernisse und einen Bosskampf mit 40 Sekunden Zeitlimit.
- **Tiefe**: Der begehbare Streifen ist in Stage 1 je nach Abschnitt 75
  bis 187 px tief. Hindernisse wie ein Polizeiwagen oder ein Tresen
  begrenzen ihn zusätzlich.
- **Ebenen**: Meist scrollt alles 1:1. Ferne Hintergründe laufen in
  einigen Stages mit halber bis achtel Geschwindigkeit.
  Einzelne Objekte (Säulen, Geländer) stehen vor den Figuren.
- **Gegenstände** (gesichert, Zahlen in `mechanik.md`, „Gegenstände und
  Waffen“): Fässer und Kisten zerbrechen beim ersten Treffer und geben Essen
  oder Waffen frei; aufgenommen wird mit der Angriffstaste. Essen heilt um
  feste Werte (Brathähnchen voll, andere +55, +40, +16, +12 LP) oder gibt
  bei vollen LP Punkte, und es läuft nicht ab. Waffen haben feste Munition
  (Raketenwerfer 3 Schuss zu 8 LP mit Explosion, Laser 4 zu 6 LP, Hammer 6
  Ladungen zu 8 LP, Pistole und Maschinengewehr 5), ersetzen die Schlagkette
  und fallen bei jedem Treffer gegen die Figur zu Boden. Sie liegen 700
  Frames ab der Landung und blinken dann 92 Frames, bis sie verschwinden.
  Waffen von Gegnern bleiben liegen und lassen sich aufheben. Wurfsterne
  nimmt Captain Commando nicht als Waffe, sie geben Punkte.
- **Fahrzeuge**: In Stage 1, 4 und 6 kommen Mechs mit Gegnern am Steuer.
  Nach dem Abwurf des Fahrers zeigt das Spiel „RIDE ON“; das Fahren selbst
  ist nicht untersucht.

## Hinweise für die eigene Grafik

- **Bildformat**: Das Original zeigt 384 × 224 Pixel bei 59,64 Hz. Alle
  Werte in `mechanik.md` gelten in diesen Pixeln und Frames.
- **Größe der Figuren**: Die Reichweiten sind Abstände zwischen den
  Positionen von Figur und Gegner, unabhängig vom Bild. Weichen unsere
  Figuren deutlich von der Größe des Originals ab (Helden 36 × 75 px bis
  73 × 83 px, die Gegner aus Stage 1 etwa 66 bis 71 px hoch, große Gegner
  und Bosse bis etwa 100 px), sehen die Reichweiten falsch aus. Dann
  skalieren wir die Reichweiten mit.
- **Timing der Animationen**: Die Dauern jeder Animationsstufe stehen in
  `research/captcomm/grafik/figuren/ablaeufe.csv` und
  `research/captcomm/grafik/gegner/ablaeufe.csv`. Meist sind es 4 bis 8
  Frames je Bild, zum Beispiel geht Captain Commando in 12 Bildern zu je
  4 Frames, WOOKY und EDDY in 8 Bildern zu je 4 Frames. Mit gleichen
  Dauern stimmt das Timing auch mit neuen Bildern.

## Übernehmen, Richtwert, selbst gestalten

| Thema | Umgang | Grundlage |
|---|---|---|
| Bewegung, Sprung, Schlagkette, Sprungangriff, Griff, Wurf, Umgeworfen werden, Schutzfenster | übernehmen | `mechanik.md` |
| Lebenspunkte der Figur, Schaden der Gegner, Rang | übernehmen als Ausgangswert, beim Testen anpassen | `mechanik.md` |
| Sprint, Sprintangriff, Spezialangriff | übernehmen | `mechanik.md` |
| Weitere Helden | selbst gestalten, Bewegung wie oben | Tabelle „Spielfiguren“ |
| Gegnertypen, Lebenspunkte, Angriffe | selbst gestalten nach den Rollen oben; Trefferreaktion, Reichweite, Startup und Nachlauf als Richtwert | `research/captcomm/grafik/README.md`, `mechanik.md` |
| Gegnerverhalten, Wellen, Kamerasperren | selbst gestalten, Verhaltensmodell als Richtwert | Abschnitte „Gegner als Vorbild“ und „Stages als Vorbild“, notes.md „Nachtrag: Verhalten der Nahkämpfer“ |
| Gegenstände, Waffen, Fahrzeuge | selbst gestalten, gemessene Werte als Richtwert | Abschnitt „Stages als Vorbild“, `mechanik.md` („Gegenstände und Waffen“) |
| Titel, Figurenwahl, Anzeigeleiste, Punkte, Leben, Mehrspieler | selbst gestalten | – |
| Grafik, Animationen | eigene Bilder mit den Dauern des Originals als Richtwert | `ablaeufe.csv` |

## Offene Punkte

Die vier offenen Punkte vom Vormittag (Trefferreaktion, Verhalten von WOOKY
und EDDY, Spezialangriff und Sprint, Gegenstände) sind gemessen und
gegengeprüft (Nachträge in `research/captcomm/notes.md`). Weiter messen
lohnt sich nur, wo es beim Gestalten hilft. In dieser Reihenfolge:

1. **Fernkämpfer und Messerwurf**: Reichweite, Startup und Nachlauf von
   Pistole und Rakete des DICK und des Messerwurfs des SKIP. Beide kamen in
   den Messläufen gegen eine passive Figur nicht vor; nötig ist ein Lauf,
   der sie gezielt auslöst.
2. **Boss**: Super-Armor im Einzelnen (wann die LP zurückspringen, welche
   Treffer zählen), Reichweiten der Bossangriffe, Wirkung des
   Spezialangriffs gegen den Boss.
3. **Unsichere Einzelwerte**, die das Design berühren: Wahl zwischen
   schnellem und langsamem Schlag des WOOKY, Angriffsraten und Länge der
   Serien, Liegedauer des EDDY im Einzelfall. Sie stehen in `mechanik.md`
   unter „Nicht übernommen“.
4. **Widerspruch zum Eingriff `schutz_eingriff`**: In den natürlichen
   Schutzfenstern greifen die Gegner an, bei einem künstlich auf 168 Frames
   verlängerten Schutz schlug der Gegner nicht zu. Für unser Spiel ohne
   verlängerten Schutz ohne Folgen.
5. **Andere Helden**: Kette und Würfe von Mack, Ginzu und Baby Head nur im
   Workflow belegt; Sprint der anderen Helden nicht gemessen.
6. **Rahmen**: Titel, Figurenwahl, Anzeigeleiste, Leben, Continue,
   Mehrspieler und Fahrzeuge sind nicht untersucht.

Weitere unsichere Einzelheiten stehen in `mechanik.md` unter „Nicht
übernommen“ und in `research/captcomm/grafik/README.md`, deren Werte zu
Sprint und Spezialangriff zum Teil überholt sind (maßgeblich ist
`mechanik.md`).
