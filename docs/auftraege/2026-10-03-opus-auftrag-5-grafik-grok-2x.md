# Auftrag 5: Grafik neu, Grok-Bilder in Dreiviertelansicht bei doppelter Darstellung

Stand 2026-10-03. Orchestrator ist die Fable-Sitzung des Nutzers. Dieser
Auftrag folgt auf Auftrag 4 und **ersetzt dessen Ergebnis für Figuren und
Hintergründe**. Abschnitt 1 von Auftrag 1 (Regeln) und Abschnitt 2 von
Auftrag 3 (Technische Vorgaben) gelten weiter. MAME und ROM werden nicht
gebraucht.

Anlass: Der Nutzer hat die Figuren der Gliederpuppe und die gezeichneten
Hintergründe an Haltepunkt 2 abgelehnt. Die Entscheidung E24 (b) beruhte
auf einem Vergleich, der den Grok-Weg benachteiligt hat: Die Blätter
waren in strenger Seitenansicht bestellt, die Figuren wurden auf
76 Pixel verkleinert und auf 16 feste Materialfarben gezwungen. Eine
Probe des Orchestrators (`docs/bilder/probe_grok_2x.png`) zeigt denselben
Rammbock bei doppelter Darstellungsauflösung mit 64 Farben: lesbar,
detailreich, deutlich näher an dem, was der Nutzer will.

**Entscheidung E25 (Nutzer, 2026-10-03)**: Figuren, Gegenstände und
Hintergründe entstehen aus Grok-Bildern. Die Darstellung zeichnet mit
doppelter Auflösung (768 × 448 Bildpixel), die Logik bleibt unverändert
bei 384 × 224 Einheiten. Je Figur sind bis zu 64 Farben erlaubt. Die
Gliederpuppe bleibt nur als Rückfall (`?platzhalter=1`) und für Effekte,
die kein Bild haben. E23 (Arcade-Pixel) bleibt als Stilrichtung, die
Festlegung „ein Bildpixel ist ein Spielpixel“ und „16 Farben je Figur“
entfallen.

---

## 0. Startprompt für die Opus-Sitzung

```text
Du bist die Arbeitssitzung für das Projekt Comet Brawlers. Der Orchestrator
hat den fünften Auftrag in docs/auftraege/2026-10-03-opus-auftrag-5-grafik-grok-2x.md
abgelegt. Lies zuerst CLAUDE.md, dann Abschnitt 1 (Regeln) von
docs/auftraege/2026-10-02-opus-messungen-und-design.md und Abschnitt 2
(Technische Vorgaben) von docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md,
dann den fünften Auftrag vollständig, dann docs/grafik.md (Abschnitte 2,
5, 9) und docs/scheibe.md. Arbeite die Phasen 0 bis 4 des fünften Auftrags
der Reihe nach ab. Nur auf main, keine Branches, keine Pull Requests,
Deutsch. Halte an den Haltepunkten an und zeige mir die Bilder; arbeite
erst nach meiner Freigabe weiter. Am Ende die Rückmeldung im Format aus
Abschnitt 7.
```

---

## 1. Was sich ändert

| Bereich | Auftrag 4 | Auftrag 5 |
|---|---|---|
| Quelle der Figuren | Gliederpuppe aus Code | Grok-Bildblätter, Umsetzer macht Sprites |
| Ansicht | Seitenansicht | Dreiviertelansicht wie in Automaten-Prügelspielen (Körper leicht zum Betrachter gedreht, Blick nach rechts) |
| Darstellung | 384 × 224 Bildpixel, 1 Bildpixel = 1 Spielpixel | 768 × 448 Bildpixel, 2 Bildpixel = 1 Spielpixel; Sprites doppelt so hoch wie der Umriss (Vela 152 px, Bolzer 144, Rammbock 152, Zünder 144, Ballast 200) |
| Farben | 16 je Figur aus festen Materialtreppen | bis 64 je Figur, aus dem Bild selbst gewonnen (Medianschnitt), Helligkeit und Sättigung erhalten; keine Abbildung auf `palette.ts` |
| Kontur | Konturviolett 1 px | dunkle Kontur aus dem Bild erhalten, fehlende Außenkontur 1 Bildpixel (= 0,5 Spielpixel) nachsetzen |
| Hintergründe | gezeichnet aus Code | Grok-Panoramen je Abschnitt, in Ebenen zerlegt (Himmel, Wand, Boden), bei 2× |
| Anzeigeleiste, Schrift | aus Code (G6) | bleibt, bei 2× ganzzahlig verdoppelt |
| Effekte | aus Code (G4) | bleiben, bei 2× verdoppelt; Explosion und Funke dürfen durch Grok-Blätter ersetzt werden, wenn der Nutzer sie liefert |
| Logik, Protokoll, Tests | unverändert | unverändert; der Browser-Test und die Referenzprotokolle müssen bitgleich bleiben |

Die Positionen, Reichweiten, Anker und die Sortierung nach Tiefe rechnen
weiter in Spielpixeln; nur das Zeichnen multipliziert mit 2. Schatten,
Blinken im Schutz, Höhe und Blende bleiben wie bisher.

---

## 2. Bestellung beim Nutzer (läuft parallel zu Phase 1)

Der Nutzer bestellt bei Grok nach `docs/grafik-bestellung.md` (Fassung
vom 2026-10-03 mit Dreiviertelansicht), in dieser Reihenfolge, und lädt
jede Figur gesammelt im Opus-Chat hoch:

1. **Vela** (Konzeptbild mit der Stilprobe `stil_1_arcade_nah.png` als
   Vorlage, dann Blätter A bis I).
2. **Bolzer** (Konzeptbild, Blätter A bis D plus Griffreihe).
3. **Rammbock** neu in Dreiviertelansicht (Blätter A, B, C, D, E; die
   alten Blätter bleiben als Rückfall).
4. **Zünder**, **Ballast**.
5. **Hintergründe** Landedeck, Händlergasse, Asservatenkammer, Himmel.
6. **Gegenstände** (objekte_a, objekte_b, objekte_c).

Opus beginnt mit dem, was da ist. Fehlt eine Figur, bleibt dort vorerst
die Gliederpuppe aus Auftrag 4.

### 2b. Videos für Bewegungszyklen

Der Nutzer darf für Zyklen (gehen, sprint, haltung/atmen, spott, wiegen,
zielen) statt eines Blatts ein kurzes Video liefern (5 bis 6 s, aus dem
Konzeptbild der Figur erzeugt, Kamera fest, Figur auf der Stelle,
einfarbiger Hintergrund), Dateiname `<figur>_v_<animation>.mp4`. Opus
verarbeitet es so:

1. Einzelbilder mit `ffmpeg` (vorhanden unter `/usr/bin/ffmpeg`) als PNG
   ziehen (`-vsync 0`, alle Bilder), nach `fremd/<figur>/video_<animation>/`.
2. Hintergrund wie bei Blättern freistellen (Farbe aus den Ecken, mit
   größerer Toleranz wegen Videokompression); Bilder mit sichtbarer
   Unschärfe (Kantenstärke unter einem Schwellwert) verwerfen.
3. Einen sauberen Zyklus finden: Bildpaare mit kleinster Pixeldifferenz
   zwischen Bild i und Bild i+n bestimmen die Zykluslänge n; daraus die
   benötigte Bildzahl der Logik gleichmäßig auswählen (gehen 12 bzw. 8,
   sprint 6, haltung 3, spott 6, wiegen 6, zielen 4).
4. Wie Zellen durch den Umsetzer v2 (Maßstab aus dem Stand-Bild der
   Figur, Palette, Kontur, Anker, Fußkontakt-Korrektur).
5. Kontaktbogen und Befund (Unschärfe, Größenschwankung, Zyklustreffer)
   in `docs/grafik.md`; taugt der Clip nicht, bleibt das Blatt B der
   Weg, und der Nutzer bekommt eine Nachbestellung.

Angriffe, Reaktionen, Griff, Wurf und Spezialangriff bleiben bei Blättern,
weil ihr Trefferbild im ersten aktiven Frame stehen muss. Die Quelle
(Video) liegt im Repo neben den Blättern; große Videos über 20 MB bleiben
außerhalb, dann nur die gezogenen Bilder.

---

### 2c. Teileblatt und Gliederpuppe mit echten Teilen (Weg D, bevorzugt)

Die Posenblätter von Grok schwanken in Größe und Details (Jacke offen
oder geschlossen). Einheitlich wird eine Figur nur, wenn sie genau einmal
gezeichnet und danach bewegt wird (Cutout-Animation). Deshalb ist Weg D
der bevorzugte Weg für Figuren, sobald der Nutzer ein Teileblatt liefert:

1. Der Nutzer liefert `<figur>_t_teile.png`: alle Körperteile einzeln auf
   einfarbigem Grund im selben Maßstab (Kopf, Zopf, Rumpf, Becken,
   Oberarm, Unterarm, Faust, offene Hand, Oberschenkel, Unterschenkel, Fuß
   seitlich, Fuß von vorn, dazu die ganze Figur im Stand als Maßstab),
   Dreiviertelansicht, Licht von links oben.
2. Opus schneidet die Teile aus (Zellen wie beim Umsetzer), kalibriert den
   Maßstab an der ganzen Figur auf die Zielhöhe bei 2× (Abschnitt 1) und
   legt sie als Bildteile unter `fremd/<figur>/teile/` ab, mit
   `teile.txt`: je Teil Name, Ankerpunkt (Gelenk am Elternteil) und
   Drehpunkt, von Opus nach dem Bild gesetzt.
3. `puppe.ts` bekommt neben Kapseln und Polygonen eine Teilart „Bild“:
   ein Bildteil mit Drehpunkt, der je Pose gedreht (in 15°-Schritten,
   mit Nearest-Neighbour, danach Konturreparatur) und verschoben wird;
   Zeichenreihenfolge je Pose wie bisher; Teiltausch je Pose (Faust oder
   offene Hand, Fuß seitlich oder von vorn, Jacke beim Tritt).
4. Die Posen der bestehenden Figurdateien (`figuren/vela.ts` usw.) bleiben
   die Grundlage; sie werden nach den Grok-Posenblättern nachgestellt, wo
   die Puppe steif wirkte (Getroffen, Umgeworfen, Aufstehen, Spott,
   Sprungtritt). Fehlende Zwischenwinkel bei Ellbogen und Knie werden
   durch Teiltausch gelöst (Unterarm gebeugt als eigenes Teil, wenn das
   Teileblatt es hergibt; sonst Nachbestellung „Unterarm angewinkelt“).
5. Kontaktbögen und Vergleichsbild wie in Phase 1; an Haltepunkt 1 stehen
   dann drei Fassungen nebeneinander, wenn vorhanden: Gliederpuppe mit
   Code-Teilen, Grok-Posenblätter umgesetzt, Puppe mit Grok-Teilen.

Weg D hat Vorrang vor den Posenblättern, weil er Größe, Farben und
Kleidung in jedem Bild gleich hält. Die Posenblätter bleiben Vorlage und
Rückfall für einzelne Posen, die die Puppe nicht lesbar hinbekommt.

## 3. Phasen

### Phase 0: Einrichtung (Opus selbst)

1. `main` aktualisieren (mindestens 1272f76). `npm run pruefen`, `npm test`
   grün als Ausgangslage.
2. `docs/grafik.md`: Abschnitt „E25“ oben einfügen (Tabelle aus
   Abschnitt 1 dieses Auftrags), Stilhandbuch 1.1 und 1.2 als „ersetzt
   durch E25“ kennzeichnen, nicht löschen.
3. `docs/erkenntnisse.md`: E25 in die Entscheidungstabelle.
4. Die Probe des Orchestrators liegt unter `docs/bilder/probe_grok_2x.png`
   (vom Orchestrator committet); sie ist der Maßstab für „lesbar“.

### Phase 1: Darstellung bei 2× und Umsetzer v2 (U1 und U2 parallel), Haltepunkt 1

**U1: Darstellung bei doppelter Auflösung**

```text
Aufgabe: Stelle die Darstellung der Scheibe auf doppelte Auflösung um,
ohne die Logik, das Protokoll oder die Tests zu ändern. Lies
docs/auftraege/2026-10-03-opus-auftrag-5-grafik-grok-2x.md Abschnitt 1,
spiel/src/darstellung/*.ts und docs/scheibe.md Abschnitt „Bild“.
Festlegungen: Das Canvas hat 768 × 448 Bildpixel und wird ganzzahlig auf
das Fenster skaliert (image-rendering pixelated). Ein Faktor DARSTELLUNG
= 2 in masse.ts; bildX und bildY liefern weiter Spielpixel, das Zeichnen
multipliziert mit dem Faktor an genau einer Stelle (eine Zeichenklasse
mit Methoden rechteck, bild, text, die Spielkoordinaten annehmen).
Atlanten dürfen Bilder in Bildpixeln (2×) oder Spielpixeln (1×) tragen;
das Atlas-JSON bekommt das Feld "massstab" (1 oder 2), die Zeichenklasse
skaliert 1×-Bilder mit drawImage ganzzahlig hoch. Anzeigeleiste,
Pixelschrift, Effekte und die Gliederpuppen-Blätter laufen so unverändert
bei 2×. Schatten bleibt eine Ellipse in Spielpixeln. Die Debug-Anzeige
zeichnet in Spielpixeln weiter. Der Himmel darf wie bisher mit halber
Kamerageschwindigkeit laufen. Rückfall ?platzhalter=1 bleibt.
Tests: darstellung_browser.test.ts muss unverändert bestehen (Protokoll
bitgleich); ein neuer Test prüft, dass ein 1×-Atlas und derselbe Atlas
als 2× dasselbe Bild ergeben (Playwright, Pixelvergleich eines Ausschnitts).
Leistung: 600 Bilder in Chromium, mittlere Zeit je Bild unter 8 ms.
Bericht: zehn Zeilen. Nicht committen.
```

**U2: Umsetzer v2 für Grok-Blätter in Dreiviertelansicht**

```text
Aufgabe: Baue den Umsetzer (spiel/grafik/quelle/umsetzer.ts) zur Fassung
v2 um, nach Abschnitt 1 des fünften Auftrags (wörtlich angehängt). Lies
docs/grafik.md Abschnitt 5 (Umsetzer v1, Grenzen, Befunde) und die
Blätter unter spiel/grafik/quelle/fremd/rammbock/. Änderungen:
1. Zielhöhe = 2 × (Umrisshöhe − 5) in Bildpixeln (Rammbock 142, Vela 142,
   Bolzer 134, Zünder 134, Ballast 190), Maßstab aus dem Stand-Bild,
   derselbe Faktor für alle Blätter einer Figur; Verkleinern mit
   Flächenmittel; Blätter mit abweichender Figurgröße werden am Stand-
   Bild des jeweiligen Blatts neu kalibriert (Befund im Protokoll).
2. Farben: keine Abbildung auf palette.ts. Je Figur eine eigene Palette
   aus allen Bildern per Medianschnitt, höchstens 64 Farben, ohne Raster
   (kein Dithering); Helligkeit und Sättigung bleiben (keine
   Abdunklung). Die Hintergrundfarbe wird vor dem Schnitt entfernt.
3. Kontur: dunkle Kontur des Bildes bleibt; wo die Außenkante keine
   dunkle Kontur hat, 1 Bildpixel im dunkelsten Ton der Figur nachsetzen.
   Streupixel entfernen wie bisher.
4. Anker: Fußpunkt wie bisher; Fußkontakt beim Gehen: der Umsetzer
   verschiebt jedes Gehbild so, dass der Standfuß (tiefster Pixel mit
   Bodenkontakt) je Bild um die Gehstrecke rückwärts wandert (7 Spiel-
   pixel bei 1,75 px/Frame; 6,4 bei 1,6), und protokolliert den Rest.
5. Atlas mit "massstab": 2.
6. Zuordnung wie v1 (zuordnung.txt), fehlende Bilder als Nachbestellung
   in docs/grafik.md.
Rammbock aus den vorhandenen Blättern (Seitenansicht) als erste Probe
umsetzen, damit Haltepunkt 1 ein Bild hat; die Blätter in
Dreiviertelansicht folgen vom Nutzer.
Tests: Medianschnitt (Farbzahl ≤ 64, keine Hintergrundfarbe), Maßstab,
Fußkontakt, Anker, Determinismus; die Tests von v1 anpassen, nicht
löschen. Bericht: zehn Zeilen. Nicht committen.
```

**Haltepunkt 1**: Opus committet „Grafik: Darstellung 2× und Umsetzer v2“
und zeigt dem Nutzer ein Szenenbild bei 2× mit dem Grok-Rammbock (alte
Blätter) neben der bisherigen Vela, dazu, falls der Nutzer die Vela-
Blätter schon geliefert hat, Vela aus Grok. Der Nutzer gibt frei oder
nennt Änderungen (Größe, Helligkeit, Kontur).

### Phase 2: Alle Figuren und Hintergründe (U3 bis U5 parallel, je nach Lieferung)

- **U3 Figuren**: je gelieferter Figur Umsetzung, Zuordnung, Kontaktbögen,
  Nachbestellungen. Reihenfolge Vela, Bolzer, Rammbock neu, Zünder,
  Ballast. Puppe = Bolzer in Grau (Palettentausch auf dem umgesetzten
  Blatt: Sättigung auf 0, Helligkeit erhalten).
- **U4 Hintergründe**: je Panorama Zerlegung in Ebenen: Himmel (obere
  Zeilen bis zur Wand, kachelbar gemacht durch Spiegelung am Rand), Wand
  mit Objekten (feste Welt-x nach `scheibe.txt`, auf die Abschnittsbreite
  skaliert oder gekachelt), Boden (das Tiefenband: die Bodenzeilen des
  Panoramas werden auf die Bandhöhe gestreckt, Fugen bleiben). Palette je
  Abschnitt höchstens 128 Farben. Die Tiefenlinien der Debug-Anzeige
  bleiben. Objekte, die der Logik gehören (Fass, Kisten), kommen nicht aus
  dem Panorama, sondern aus objekte_b.
- **U5 Objekte und Effekte**: Gegenstände aus objekte_a und objekte_b,
  Explosion und Staub aus objekte_c, wenn geliefert; sonst bleiben die
  Code-Effekte bei 2×.

Integration durch Opus nach jeder Lieferung (`npm run grafik`,
`npm run pruefen`, `npm test`), Commit je Figur.

### Phase 3: Haltepunkt 2 und Abnahme

Szenenbilder wie in Auftrag 4 (szene_0300 bis 1500, arena, nah, debug) bei
2×, dazu `kontakt_uebersicht.png` mit allen Figuren im Stand. Der Nutzer
gibt frei oder nennt Änderungen; Änderungen an Posen gehen als
Nachbestellung an Grok, Änderungen an Größe, Helligkeit, Kontur an U2.
Abnahme wie Auftrag 4, Phase 4 (Determinismus, Tests, Leistung,
Vollständigkeit der Zuordnung, Trefferbilder im aktiven Frame).

### Phase 4: Nacharbeit

`docs/scheibe.md` (Bild, Befehle), `docs/grafik.md` (Stand, Abweichungen,
Nachbestellungen), `docs/erkenntnisse.md` (Stand-Zeile), `CLAUDE.md`
(Grafik aus Grok-Blättern unter `spiel/grafik/quelle/fremd/`, Umsetzer
v2, Darstellung 2×). Commits auf main.

---

## 4. Qualitätsregeln

- Logik, Protokoll, Referenzprotokolle und alle 275 Tests bleiben
  unverändert; neue Tests kommen hinzu.
- Jede Quelle liegt im Repo (`fremd/<figur>/`, `fremd/hintergrund/`) mit
  `quelle.txt` (Datum, Werkzeug, Prompt); der Bau ist deterministisch.
- Keine Palettenabbildung, aber eine Prüfung: Kein Figurenpixel darf
  dunkler als der dunkelste Bodenton des Abschnitts sein, außer in der
  Kontur (sonst Befund und Aufhellung um eine Stufe).
- Das Trefferbild jeder Angriffsanimation liegt im ersten aktiven Frame;
  fehlt ein passendes Bild, Nachbestellung.

---

## 5. Umgang mit Lücken

Wie Auftrag 3, Abschnitt 2.6. Was die Blätter nicht hergeben, wird als
Nachbestellung („nur dieses eine Bild“) in `docs/grafik.md` gelistet und
vorerst durch das nächstliegende Bild ersetzt.

---

## 6. Haltepunkte

Zwei, wie oben. An beiden zeigt Opus Bilder in der Größe, in der der
Nutzer spielt (768 × 448), nicht vergrößerte Kontaktbögen allein.

---

## 7. Rückmeldung an den Orchestrator

```text
## Rückmeldung Opus, Auftrag 5, <Datum>

### Commits auf main
### Haltepunkte (Freigaben, Änderungen)
### Gelieferte Blätter je Figur und Hintergrund, Nachbestellungen offen
### Umsetzer v2: Farben je Figur, Maßstab, Fußkontakt-Rest je Gehzyklus
### Darstellung 2×: Leistung (ms je Bild), Browser-Test bitgleich: ja/nein
### Prüfung: npm run pruefen, npm test (Anzahl), Determinismus
### Bilder: docs/bilder/…
### Was nicht erledigt wurde und warum
### Fragen an den Nutzer
```
