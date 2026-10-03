# Comet Brawlers: Erkenntnisse aus Captain Commando

Stand 2026-10-03. Dieses Dokument fasst zusammen, was die Analyse von
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

## Entscheidungen

Entscheidungen des Nutzers vom 2026-10-02 (E1 bis E9, Auftrag 2) und vom
2026-10-03 (E10 bis E22, Auftrag 3; E23 nach den Stilproben; E24 an Haltepunkt 1 von Auftrag 4; E25 nach Haltepunkt 2 von Auftrag 4), verbindlich; eingearbeitet in
`docs/design.md` und `docs/design-gegner-stages.md`, E10 bis E22 auch in
den beiden Spezifikationen:

| Nr. | Datum | Entscheidung | Begründung |
|---|---|---|---|
| E1 | 2026-10-02 | Welt: Kometenhafen „Perihel“ auf dem Kometen Orrin; die Küstenstadt und das Zirkusschiff sind verworfen | Der Spielname trägt den Kometen schon, und der Hafen bietet Schauplätze von Eis bis Schwerindustrie samt Schweif als Sonderstage |
| E2 | 2026-10-02 | Schutzfenster der Figur wie im Vorbild: Gegner greifen auch in den Schutzfenstern und eine liegende Figur an, ihre Treffer sind wirkungslos | So gemessen, einfacher zu bauen, und die Gegner wirken nicht passiv |
| E3 | 2026-10-02 | Kein Rückstoß in der Kette: 23 Frames Trefferreaktion mit Zittern als Animation, der Gegner bleibt am Ort | So gemessen; die Kette hält, weil der Gegner frühestens 45 Frames nach dem Treffer ausholt |
| E4 | 2026-10-02 | Kein Schutz der Gegner nach dem Aufstehen: ab dem ersten handlungsfähigen Frame verwundbar und greifbar | So gemessen; ein Schutz würde den Druck auf aufstehende Gegner ohne Not nehmen |
| E5 | 2026-10-02 | Höchstens zwei gleichzeitige Angreifer, je Seite der Figur einer; höchstens ein zielender Fernkämpfer, ab Stage 6 zwei | Im Vorbild greift meist einer an, selten mehr; die Regel hält Gruppen lesbar |
| E6 | 2026-10-02 | Fester Spielschritt 60 Hz; alle Frame-Zahlen bleiben, Sekunden = Frames ÷ 60 | 60 Hz ist heute Standard, die Zeiten werden nur 0,6 % kürzer als im Vorbild |
| E7 | 2026-10-02 | Helden Vela, Kord, Rin und Ollo mit den Werten aus `docs/design.md`, Abschnitt 5, als Arbeitsstand | Damit ist die vertikale Scheibe festgelegt; die Namen können später wechseln |
| E8 | 2026-10-02 | Acht Stages, Sonderstage mit automatischem Scrollen an Position 5 | Wie im Designdokument geplant |
| E9 | 2026-10-02 | Alle übrigen Vorschläge beider Designdokumente sind angenommen (Leben, Continues, Punkteschema, Zweispieler-Regeln, Fahrzeug, Essenswerte, Boss-LP 90 bis 120, Bossschaden bis 22, Flächenschaden bis 13, Wellenbonus, Gegner heben keine Waffen auf) | Keine Einwände; Einzelheiten stehen in den Designdokumenten |
| E10 | 2026-10-03 | Alle Festlegungen, die in den Design- und Spezifikationsdokumenten als „Arbeitsregel“, „Platzhalter“ oder mit „Einverstanden?“ geführt sind, gelten als bestätigt, soweit E11 bis E21 nichts anderes sagen (unter anderem Schutz auch gegen Geschosse, Zuschnitt der Scheibe, Angreifergrenze je Figur, Ausnahmen über 13 LP) | Die Festlegungen schließen Lücken ohne Messgrundlage; bestätigt tragen sie die Scheibe ohne weiteren Vorbehalt |
| E11 | 2026-10-03 | Super-Armor nach der festen Regel der Spezifikation (`spezifikation-welt.md`, 7.4, SA1 bis SA6): Kettenstufen 1 bis 3 ziehen LP vorläufig ab und springen 23 Frames nach dem letzten Treffer ohne Umwerfen zurück, danach Rückzug 54 Frames; umwerfende Treffer, Spezialangriff, Kniestoß, Wurf, Explosion, Sprintangriff, geworfener Gegner und Landung beim Neueinstieg zählen endgültig; keine zufällige Zurückweisung | Die Regel des Vorbilds ist unbekannt; eine feste Regel ist vorhersehbar, prüfbar und deterministisch |
| E12 | 2026-10-03 | Festkomma 16.16 (`spezifikation-kampf.md`, 2.4) ist verbindlich für Positionen, Geschwindigkeiten und Beschleunigungen | Die Grundwerte aus `mechanik.md` sind exakte Vielfache von 1/65536, Ganzzahlen rechnen überall gleich, und Grenzen wie 85/86 px bleiben scharf |
| E13 | 2026-10-03 | Bei zu langsamer Darstellung läuft die Logik in Echtzeit mit 60 Schritten je Sekunde weiter und lässt Bilder aus; höchstens 4 Logikschritte je Bild, darüber bleibt die Zeit stehen | Die Zeiten bleiben echt, und nach einer Stockung holt das Spiel nicht im Zeitraffer auf |
| E14 | 2026-10-03 | Symmetrische Blickrichtung: Für Blick links gelten die Werte für Blick rechts aus `mechanik.md` (Reichweiten, Griffweiten, Aufnahmebereiche, Explosionsgrenzen); Griff von hinten 24 px in beide Richtungen | Die Unterschiede von 1 px sind Eigenheiten des Vorbilds; gleiche Werte sind einfacher zu bauen und zu prüfen |
| E15 | 2026-10-03 | Der Sprint-Sprungangriff gehört in die Scheibe: 13 LP, Reichweite 38 bis 147 px in allen aktiven Frames | Er gehört zum Sprint, der in der Scheibe ist; die in A+20 gemessene Reichweite gilt, bis eine Messung mehr zeigt |
| E16 | 2026-10-03 | Einheitlicher Tod: Neueinstieg N = t+120 für jede Todesart in der Scheibe, ohne die Sonderfälle Wand und Rollen des Vorbilds | Ein Ablauf für alle Todesarten ist einfacher zu bauen und zu prüfen |
| E17 | 2026-10-03 | Der Zünder zielt 60 Frames sichtbar mit Zielrecht und schießt danach, nicht sofort wie im Vorbild; Schuss, Geschosse und Explosion wie gemessen | Die Ankündigung macht den Fernkämpfer lesbar und gibt der Figur Zeit zu reagieren |
| E18 | 2026-10-03 | Armschwung des Bosses wie im Vorbild: der nächste Schwung nur, wenn der vorige getroffen hat, höchstens drei | So gemessen; wer dem ersten Schwung ausweicht, entgeht der ganzen Folge |
| E19 | 2026-10-03 | Trefferreaktion des Bosses 23 Frames wie bei allen Gegnern (E3); die Folgefrist der Super-Armor ist h+23 | E3 gilt ohne Ausnahme, und die Kette hält auch so, wenn jeder Folgedruck rechtzeitig kommt |
| E20 | 2026-10-03 | Welle 9 der vollen ersten Stage wie gemessen: Pistolen-Zünder nach dem Tod des ersten Arena-Bolzers, Raketen-Zünder bei einem Viertel der Boss-LP, ein zweiter nur ab Rang 16 und bei höchstens drei anderen lebenden Gegnern; in der Scheibe gilt der Zuschnitt | Die bisherige Fassung stützte sich auf eine überholte Beschreibung, die Messung ist gesichert |
| E21 | 2026-10-03 | Griff mit Wurf des Bosses im Vollspiel ja (nach `mechanik.md`, „Boss“), in der Scheibe nein | Der Griff ist gemessen und gehört zum Boss; die Scheibe kommt mit drei Angriffen aus |
| E22 | 2026-10-03 | Technik: TypeScript, reiner Logikkern ohne Browser, Darstellung über Canvas 2D in einer HTML-Seite, Prüfläufe und Abnahmetests in Node, Bildschirmfotos über Playwright, keine npm-Abhängigkeiten | Der Kern lässt sich ohne Browser in Node prüfen, und ohne Abhängigkeiten baut das Projekt auch ohne Zugang zur npm-Registry |
| E23 | 2026-10-03 | Grafikstil Arcade-Pixel: Pixelgrafik im Spielraster 384 × 224 wie auf Spielautomaten um 1991. Je Material eine Farbtreppe aus fünf Tönen mit Farbverschiebung (Schatten Richtung Blau, Lichter Richtung Gelb), Übergänge mit geordnetem Raster (Bayer 4 × 4), Licht von links oben vorn, dunkle farbige Konturen (Teilgrenzen im dunkelsten Ton des Materials, Außenkontur dunkles Violett), Glanzlichter nur auf glänzendem Material; Hintergründe mit Rasterverläufen und Neonschein. Figurengrößen nach E9, Animationstakt nach den Abläufen des Vorbilds (meist 4 bis 8 Frames je Bild). Referenz: `docs/bilder/stil_1_arcade_szene.png` und `stil_1_arcade_nah.png` | Vom Nutzer aus drei Stilproben derselben Szene gewählt (Arcade-Pixel, Comic-Pixel, gezeichnet); am nächsten am Vorbild. Gegen das Risiko, dass das Bild mit vielen Figuren unruhig wird: Figuren kontrastreicher als der Hintergrund, Hintergründe gedämpfter |
| E24 | 2026-10-03 | Gliederpuppe als Standardweg für Figuren und Objekte (Grafik als Code, Auftrag 4). Grok-Blätter bleiben Vorlage: Die Posen für Getroffen, Umgeworfen, Liegen, Aufstehen, Spott und Sprungtritt werden nach den Grok-Blättern des Rammbocks gebaut, damit die Puppen weniger steif wirken; beim Rammbock die Arme schlanker und die Figur mehr in Dreiviertelansicht wie ein Automatenspiel. Hintergründe nach Grok-Konzeptbildern als Vorlage, wenn der Nutzer welche liefert, sonst nach Auftrag 4, Abschnitt 4. Velas Stiefel bleiben graublau (Farbbudget) | Am Haltepunkt 1 verglichen (docs/bilder/vergleich_rammbock.png): Die Gliederpuppe ist in Spielgröße klarer lesbar, hält Palette und Fußkontakt genau und braucht keine Bestellungen; die Grok-Figur hat ausdrucksstärkere Posen, wirkt in Spielgröße aber schmal und dunkel und ist auf jedem Blatt anders groß |
| E25 | 2026-10-03 | Figuren, Gegenstände und Hintergründe entstehen aus Grok-Bildern; die Darstellung zeichnet mit doppelter Auflösung (768 × 448 Bildpixel), die Logik bleibt bei 384 × 224 Einheiten; je Figur bis zu 64 Farben; die Gliederpuppe bleibt nur als Rückfall (`?platzhalter=1`) und für Effekte ohne Bild; E23 bleibt als Stilrichtung, „ein Bildpixel ist ein Spielpixel“ und „16 Farben je Figur“ entfallen. Ersetzt E24 für Figuren und Hintergründe | Der Nutzer hat an Haltepunkt 2 von Auftrag 4 die Figuren der Gliederpuppe und die gezeichneten Hintergründe abgelehnt; der Vergleich zu E24 hatte den Grok-Weg benachteiligt (strenge Seitenansicht, 76 px, 16 feste Farben). Die Probe `docs/bilder/probe_grok_2x.png` zeigt denselben Rammbock bei doppelter Auflösung mit 64 Farben lesbar und detailreich |
| E26 | 2026-10-03 | Engine Godot 4 mit GDScript; Arbeitssitzung Grok Code, Orchestrator bleibt die Fable-Sitzung; die TypeScript-Fassung unter `spiel/` bleibt Referenzimplementierung und Prüfstein (Referenzprotokolle aller 74 Testszenen unter `spiel/tests/referenz/alle/`), wird aber nicht weiterentwickelt | Entscheidung des Nutzers: Editor, Skeleton2D für die Cutout-Puppe, Export für mehrere Plattformen; Regeln für Agenten in `AGENTS.md`, Auftrag 6 |

## Wo was steht

| Datei | Inhalt |
|---|---|
| `docs/mechanik.md` | verbindliche Zahlenwerte für das Spiel, nur gesicherte Messungen |
| `docs/erkenntnisse.md` | dieses Dokument: Überblick, Erkenntnisse, Richtwerte, offene Punkte |
| `docs/design.md` | Designdokument Kern (Entwurf): Vision, Welt, technische Grundlage, Grundkit der Spielfigur, Helden, Lebenspunkte und Schwierigkeit, Rahmen, vertikale Scheibe, Entscheidungen des Nutzers (E1 bis E22) und offene Punkte |
| `docs/design-gegner-stages.md` | Designdokument Gegner, Bosse und Stages (Entwurf): Gegnerrollen, Verhaltensmodell, Wiederverwendung, Bosse, Stage-Schablone, acht Stages, erste Stage im Detail, Gegenstände, Animationsplan |
| `docs/spezifikation-kampf.md` | Spezifikation der vertikalen Scheibe, Kampfsystem: Zeit und Raum (60 Hz, Festkomma 16.16), Zustandsautomat der Figur, Trefferprüfung, Schaden, LP und Schutz, Trefferreaktion der Gegner, Griff und Wurf, Sprint und Spezialangriff, Waffen, Frame-Protokoll, Abnahmetests, Platzhalter und Fragen (beantwortet mit E10 bis E22) |
| `docs/spezifikation-welt.md` | Spezifikation der vertikalen Scheibe, Welt: Stage-Daten, Kamera, Aktivierung und Wellen, Gegnerlogik der Nah- und Fernkämpfer, Boss, Rang, Gegenstände und Behälter, Anzeige und Rahmen, Zufall und Determinismus, Abnahmetests, Fragen (beantwortet mit E10 bis E22) |
| `docs/scheibe.md` | Programm der vertikalen Scheibe (Auftrag 3; Code in `spiel/`): Bedienung, Bau und Befehle, Werkzeuge, Tests, Stand der Abnahme, Abweichungen und Lücken, die beim Codieren festgelegt wurden |
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
| Steuerung der Spielfigur (Captain Commando): Laufen, Sprung, Schlagkette mit Nachlauf und Reichweite hinter der Figur, Sprungangriff (alle vier Varianten mit Reichweite), Griff, Wurf, Umgeworfen werden, Schutz nach Treffern, Tod und Neueinstieg | gesichert, in `mechanik.md` (Tod und Neueinstieg: „Tod und Neueinstieg der Figur“) |
| Sprint, Sprintangriff, Sprintsprung | gesichert, in `mechanik.md` („Sprint“) |
| Spezialangriff | gesichert für alle vier Helden, in `mechanik.md` („Spezialangriff“) |
| Die anderen drei Helden | Animationen aufgenommen; Spezialangriff gesichert; Schaden der Kette und Würfe Workflow |
| Schaden und Lebenspunkte der Gegner, Schwierigkeit (Rang) | Rang (auch −3 bei Tod und Stage-Wechsel), Schaden des WOOKY, Treffer in der Luft und gleichzeitiger Treffer gesichert, ebenso Schaden der Fernangriffe von SKIP und DICK, die LP des DICK sowie Schaden und Lebenspunkte des Bosses der ersten Stage (`mechanik.md`, „Boss“); übrige Gegner Workflow |
| Aussehen, Animationen und Angriffe aller Gegner und Bosse | beschrieben; Angriffe des Bosses der ersten Stage gemessen (siehe eigene Zeile) |
| Trefferreaktion der Gegner (Dauer, Rückstoß, Umwerfen, Aufstehen, Tod) | gesichert für WOOKY und EDDY, in `mechanik.md` („Trefferreaktion der Gegner“) |
| Verhalten der Gegner (Annähern, Angriffswahl, wie viele gleichzeitig angreifen) | WOOKY und EDDY gesichert als Richtwert (notes.md „Nachtrag: Verhalten der Nahkämpfer“); Angriffsraten, Wahl der Angriffsart und Einzelheiten der Angriffsabläufe unsicher. SKIP und DICK: Zielpunkt und Weg dorthin gesichert, beim DICK auch Gehtempo, Pose und Erscheinen (notes.md „Nachtrag: Fernangriffe der Gegner“), Raten und Abstand des DICK außerhalb der Schüsse unsicher; Boss der ersten Stage siehe eigene Zeile; andere Gegner offen |
| Reichweite, Startup und Nachlauf der Gegnerangriffe | WOOKY, EDDY und SKIP gesichert, in `mechanik.md` („Reichweite der Gegnerangriffe“); Fernangriffe (Messerwurf und Stichserie des SKIP, Pistole und Raketenwerfer des DICK) gesichert, in `mechanik.md` („Fernangriffe der Gegner“); wie oft sie kommen, unsicher |
| Boss der ersten Stage: Lebenspunkte, Super-Armor, Trefferreaktion, Angriffe, Rhythmus, Verstärkung, Fall | gesichert, in `mechanik.md` („Boss“); unsicher bleiben, wann und wie oft er Treffer zurückweist, die Wurfweite, seine erste Aktion nach dem Aufstehen und die Zeiten bis zum Stagewechsel; Bosse späterer Stages offen |
| Aufbau der 9 Stages: Länge, Kamera, Sperren, Tiefe, Objekte, Wellen | beschrieben; je Stage 6 bis 9 Angaben gegengeprüft |
| Gegenstände (Essen, Waffen) und Fahrzeuge | Gegenstände und Waffen gesichert, in `mechanik.md` („Gegenstände und Waffen“); Fahrzeuge nicht untersucht |
| Titel, Figurenwahl, Anzeigeleiste, Punkte, Leben, Continue | Punkte gemessen (`mechanik.md`, „Gegenstände und Waffen“); Leben und Neueinstieg gemessen (`mechanik.md`, „Tod und Neueinstieg der Figur“); übrige offen |
| Mehrspieler | offen |
| Sound | nicht Teil der Analyse |
| Vertikale Scheibe | Programm in `spiel/` (Auftrag 3, Stand 2026-10-03): Logikkern, Prüfläufe und Browserfassung fertig; alle 31 Abnahmetests der Spezifikationen (Kampf T1 bis T20 und D1, Welt W-T1 bis W-T10) grün, 214 Tests insgesamt; die Vorführung (Seed 1, 1500 Frames) ergibt bitgleiche Protokolle; Stichprobe gegen `mechanik.md` (Laufen, Sprunghöhe, Kettenreichweite, Trefferstopp, Haltepunkt) stimmt; Festlegungen beim Codieren L1 bis L122 in `docs/scheibe.md` und in den Spezifikationen |

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
  Schutz. Geschosse sind ausgenommen: Sie treffen auch in den 27 Frames
  nach einem Treffer, so trifft die zweite Kugel einer Salve des DICK in der
  Reaktion auf die erste (nach dem Aufstehen nicht gemessen; `mechanik.md`,
  „Unverwundbarkeit“, Zeile „gegen Geschosse“). In unserem Spiel bleiben
  nach E2 und E10 auch Geschosse im Schutz wirkungslos
  (`design-gegner-stages.md`, Abschnitt 2). Treffen sich Figur und Gegner
  im selben Frame, gewinnt die Figur, auch gegen den Boss. Die Figur stirbt erst unter 0 LP. Nach einem
  Tod fällt sie von oben ins Bild, wirft beim Aufsetzen jeden aktiven Gegner
  im Bild um und ist ab dem Erscheinen etwa 4,2 s geschützt (252 Frames,
  davon 200 nach der Landung). Nahangriffe der Gegner bleiben in dieser Zeit
  ohne Wirkung; ob Geschosse dort treffen, ist nicht gemessen.
- **Verhältnis von Schaden und Lebenspunkten**: Die Figur hat 72 LP. Die
  Nahkämpfer WOOKY und EDDY treffen mit 5 bis 11 LP, gegen sie hält die
  Figur also 7 bis 15 Treffer aus. Fernkämpfer treffen mit 4 bis 15 LP
  (Kugel 4 bis 7, Messer 10 bis 13, Rakete 12 bis 15). Ein schwacher Gegner
  (16 LP) fällt mit einer vollen Kette (22 LP).
- **Schwierigkeit passt sich an**: Ein Rang von 7 bis 24 steigt mit der
  Spielzeit (Start bei 9, erstmals nach 409 Frames um 1, danach alle 600
  Frames) und sinkt bei jedem Tod der Figur und bei jedem Stage-Wechsel
  um 3. Schaden und Lebenspunkte später erscheinender Gegner hängen davon
  ab, ebenso ihre Pause vor jedem Angriff (25 Frames bei Rang 7, 9 Frames
  bei Rang 20 bis 23).
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
`research/captcomm/grafik/README.md`; die Angaben zu WOOKY, EDDY, SKIP,
DICK und dem Boss DOLG sind überwiegend gemessen, maßgeblich ist
`mechanik.md`):

| Rolle | Beispiel im Original | Kennzeichen |
|---|---|---|
| Nahkämpfer | WOOKY (16 LP zu Beginn, später 22–34 nach Rang), EDDY (30 LP zu Beginn, später 32–42) | Schlagserien, einzelne Schläge werfen die Figur um; WOOKY geht so schnell wie die Figur (1,75 px/Frame) |
| Schneller Messerkämpfer | SKIP (34–46 LP) | rennt 2,5 px/Frame, Ausfallstich; wirft aus etwa 150 px ein Messer (4 px/Frame, wirft um; ein Schlag zerschlägt es, Springen hilft nicht) und sticht aus der Nähe in Serien von 1 bis 4 Stichen |
| Fernkämpfer | DICK (16–28 LP, in Stage 1 19–28 je nach Rang) | hält keinen festen Abstand, geht nur zum Schießen auf 112 bis 136 px vor die Figur; Pistolensalven von 2 bis 8 Kugeln, abwechselnd normal und umwerfend, oder je eine Rakete, deren Explosion etwa 90 bis 200 px vor ihm umwirft; seine Waffe bleibt als Gegenstand liegen (Pistole 5 Schuss, Raketenwerfer 3) |
| Gegner mit Flächenangriff | CAROL (Elektroschock bis etwa 90 px), MARBIN (Flammen) | zwingen die Figur auf Abstand |
| Schwerer Gegner | MARDIA (85 LP), Mech mit Fahrer (85 LP) | viel LP und große Reichweite (Schleimspucke bzw. Armschlag um 90 px); MARDIA geht langsam (1,2 px/Frame) |
| Boss | DOLG (LP nach Rang beim Betreten der Arena: 90 bei Rang 7–8, 100 bei 9–15, 110 bei 16–23, 120 bei 24) | Super-Armor: Treffer von Kette, Tritt, Sprung- und Sprintangriff weist er manchmal zurück. Seine LP springen dann im nächsten Frame auf den Wert vor diesem Treffer, und er weicht 54 Frames harmlos zurück; bei umwerfenden Treffern fängt er sich stattdessen auch ab: Etwa die Hälfte des Schadens bleibt, er landet aber auf den Füßen. Spezialangriff, Kniestoß, Wurf, Rakete und Laser zählen immer. Wann er zurückweist, ist nicht geklärt (im Bot-Lauf mit steigendem Rang häufiger, unsicher). Nach dem Aufstehen ist er noch 11 bis 17 Frames geschützt. Greift eine passive Figur 29 bis 39 Mal in 8000 Frames an (Median-Abstand 199 bis 288 Frames), der Rang ändert das nicht deutlich: kurzer Schlag, dreifacher Armschwung, Ansturm, Sprung-Körperpresse, Griff mit Wurf. Fällt er, brechen alle übrigen Gegner zusammen |

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
  Gegnern. Beim Boss DOLG kommen zwei EDDY, sobald seine LP auf die Hälfte
  oder darunter fallen, auch wenn er den Treffer zurückweist; bei einem
  Viertel kommt ein DICK mit Raketenwerfer. Einen zweiten gibt es nur ab
  Rang 16: Er kommt 39 bis 40 Frames, nachdem neben dem Boss höchstens
  drei Gegner leben. Neben dem Boss leben nie mehr als vier Gegner. Ein DICK
  mit Pistole kommt schon nach dem ersten besiegten WOOKY der Arena, aber
  nicht bei Rang 16 bis 19.
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
  Treffer mit Umwerfen geht der WOOKY sofort hinterher. SKIP sticht in einer
  Serie alle 37 Frames (`mechanik.md`, „Fernangriffe der Gegner“). Zwischen
  zwei Serien kamen auch 46 bis 53 Frames vor, an einer Begrenzung 30 bis
  43; die Spanne „37 bis 49 Frames“ unter „Reichweite der
  Gegnerangriffe“ ist damit vermutlich zu eng (unsicher, `mechanik.md`,
  „Nicht übernommen“).
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
  je nach Rang 7 bis 13 LP, eine Kugel des DICK 4 bis 7, eine Rakete 12 bis
  15 LP, der Boss DOLG 7 bis 22 LP je Angriff.
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
und EDDY, Spezialangriff und Sprint, Gegenstände) und die Fernangriffe von
SKIP und DICK sind gemessen und gegengeprüft (Nachträge in
`research/captcomm/notes.md`). Weiter messen lohnt sich nur, wo es beim
Gestalten hilft. In dieser Reihenfolge:

1. **Boss**: Der Boss der ersten Stage ist gemessen und gegengeprüft
   (`mechanik.md`, „Boss“): Welche Treffer zählen, Reichweiten,
   Spezialangriff und Verstärkung sind gesichert. Offen bleibt, nach welcher
   Regel er einen Treffer zurückweist und wann er sich stattdessen abfängt;
   für unser Spiel gilt die feste Regel aus E11 (`spezifikation-welt.md`,
   7.4). Unsicher sind die Wurfweite (die
   Messungen weichen ab), seine erste Aktion nach dem Aufstehen und die
   Zeiten bis zum Stagewechsel. Nicht einzeln gemessen sind seine LP bei
   Rang 10, 13, 14, 17, 18, 21 und 22; ob ein zweiter Spieler oder ein
   geworfener Gegner ihn trifft, während er die Figur hält, ist nicht
   gemessen und betrifft den Mehrspieler-Modus. Die Bosse der späteren
   Stages sind nicht gemessen.
2. **Unsichere Einzelwerte**, die das Design berühren: Wahl zwischen
   schnellem und langsamem Schlag des WOOKY, Angriffsraten und Länge der
   Serien, Liegedauer des EDDY im Einzelfall, wie oft SKIP und DICK werfen
   und schießen und welchen Abstand der DICK zwischen den Schüssen hält. Sie
   stehen in `mechanik.md` unter „Nicht übernommen“.
3. **Fernkämpfer**: Wovon die Länge einer Salve des DICK abhängt (Zufall
   oder Rang), ist nicht gemessen. Dass der DICK mit Pistole in der
   Bossarena bei Rang 16 bis 19 ausbleibt, ist gemessen, aber nicht
   erklärt. Die Fernkämpfer anderer Stages (Pistole, M-GUN und Raketen der
   DICK in Stage 4 bis 8, Messerwurf der SKIP in Stage 2, 3 und 9) sind
   nicht gemessen.
4. **Widerspruch zum Eingriff `schutz_eingriff`**: In den natürlichen
   Schutzfenstern greifen die Gegner an, auch im 200 Frames langen Schutz
   nach dem Neueinstieg; bei einem künstlich auf 168 Frames verlängerten
   Schutz schlug der Gegner nicht zu. Für unser Spiel ohne verlängerten
   Schutz ohne Folgen.
5. **Andere Helden**: Kette und Würfe von Mack, Ginzu und Baby Head nur im
   Workflow belegt; Sprint der anderen Helden nicht gemessen.
6. **Rahmen**: Titel, Figurenwahl, Anzeigeleiste, Continue, Mehrspieler und
   Fahrzeuge sind nicht untersucht; Leben und Neueinstieg sind gemessen
   (`mechanik.md`, „Tod und Neueinstieg der Figur“).
7. **Tod und Neueinstieg**: Wie der Tod abläuft, wenn sich zwei Sonderfälle
   überlagern (Klinge oder Rollen an einer Wand), und ob außer dem Ölfass
   weitere Untergründe die fallende Figur tragen, ist nicht gemessen. Offen
   ist auch, ob die Landung nach dem Neueinstieg schwache Gegner (5 LP oder
   weniger) tötet und Gegner außerhalb des Bildes trifft. Der Schutz nach
   dem Neueinstieg ist nur für Captain Commando und nur in Stage 1
   ausgewertet. Für die Scheibe ist das ohne Folgen: Jeder Tod führt zum
   Neueinstieg in t+120 (E16), die Landung trifft alle Gegner im Bild, und
   der Schutz dauert 252 Frames (E10).

Weitere unsichere Einzelheiten stehen in `mechanik.md` unter „Nicht
übernommen“ und in `research/captcomm/grafik/README.md`, deren Werte zu
Sprint, Spezialangriff, DICK und dem Boss der ersten Stage zum Teil
überholt sind (maßgeblich ist `mechanik.md`).
