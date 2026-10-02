# Auftrag 2: Entscheidungen einarbeiten, Messpaket 2, Spezifikation der vertikalen Scheibe

Stand 2026-10-02. Orchestrator ist die Fable-Sitzung des Nutzers. Dieser
Auftrag folgt auf `2026-10-02-opus-messungen-und-design.md` (Auftrag 1).
**Abschnitt 1 von Auftrag 1 (Regeln für die ganze Sitzung) gilt unverändert**
und wird jedem Agentenprompt wörtlich angehängt. Die Kurzreferenz der
Adressen dort ist um die Nachträge vom 2026-10-02 in
`research/captcomm/notes.md` („Gefundene Adressen“) zu ergänzen, vor allem
Zielabstand S+0x96, Gegenstände, Behälter und Waffenfelder der Figur.

Ziel: (1) die Entscheidungen des Nutzers in die Designdokumente einarbeiten
und die Widersprüche bereinigen, (2) messen, was die vertikale Scheibe noch
braucht (Boss, Fernkampf, Rest der Spielfigur), (3) eine technische
Spezifikation der vertikalen Scheibe schreiben. **Weiterhin kein
Spielcode.** Es entstehen Messskripte, Belege, Notizen, Design- und
Spezifikationstexte.

---

## 0. Startprompt für die Opus-Sitzung

```text
Du bist die Arbeitssitzung für das Projekt Comet Brawlers. Der Orchestrator
hat den zweiten Auftrag in docs/auftraege/2026-10-02-opus-auftrag-2-boss-fernkampf-spezifikation.md
abgelegt. Lies zuerst CLAUDE.md, dann Abschnitt 1 (Regeln) von
docs/auftraege/2026-10-02-opus-messungen-und-design.md, dann den zweiten
Auftrag vollständig, dann docs/erkenntnisse.md, docs/mechanik.md,
docs/design.md und docs/design-gegner-stages.md. Arbeite die Phasen 0 bis 5
des zweiten Auftrags der Reihe nach ab; die Agenten der Phasen 1, 2 und 4
laufen parallel, jeweils mit dem vollständigen Prompt aus der Auftragsdatei
plus den angehängten Regeln. Nur auf main, keine Branches, keine Pull
Requests, Deutsch. Melde dich bei mir nur, wenn Phase 0 scheitert oder ein
Agent eine Designentscheidung braucht, die nicht in Abschnitt 1 des zweiten
Auftrags steht. Am Ende die Rückmeldung im Format aus Abschnitt 7.
```

---

## 1. Entscheidungen des Nutzers (2026-10-02, verbindlich)

Diese Entscheidungen gelten für alle Dokumente. Wo ein Dokument bisher
„Vorschlag“ oder „offen“ sagt, wird es auf die Entscheidung umgestellt.

| Nr. | Thema | Entscheidung |
|---|---|---|
| E1 | Welt | Kometenhafen „Perihel“ auf dem Kometen Orrin (Vorschlag A aus `docs/design.md`, Abschnitt 2). Vorschläge B und C bleiben als verworfene Alternativen in einem Satz erwähnt |
| E2 | Schutzfenster der Figur | wie im Vorbild: Gegner greifen in den Schutzfenstern an, ihre Treffer sind wirkungslos. Keine Angriffserlaubnis, die auf Schutzfenster Rücksicht nimmt; liegende Figuren werden angegriffen, die Treffer sind wirkungslos |
| E3 | Rückstoß der Kette | keiner. Die Trefferreaktion ist 23 Frames mit Zittern als Animation, der Gegner bleibt am Ort |
| E4 | Schutz der Gegner nach dem Aufstehen | keiner. Ab dem ersten handlungsfähigen Frame sofort verwundbar und greifbar |
| E5 | Gleichzeitige Angreifer | höchstens zwei, je Seite der Figur höchstens einer. Höchstens ein Fernkämpfer zielt gleichzeitig, ab Stage 6 zwei |
| E6 | Spielschritt | 60 Hz fester Schritt. Alle Frame-Zahlen bleiben, Sekundenangaben werden mit 60 Hz umgerechnet |
| E7 | Helden | Vela, Kord, Rin, Ollo mit den Werten aus `docs/design.md`, Abschnitt 5, als Arbeitsstand; Namen können später wechseln |
| E8 | Stages | acht, Sonderstage mit automatischem Scrollen an Position 5 |
| E9 | Übrige Vorschläge | alle weiteren Vorschläge in beiden Designdokumenten (Leben, Continues, Punkteschema, Zweispieler-Regeln, Fahrzeug, Essenswerte, Boss-LP 90 bis 120, Bossschaden bis 22, Flächenschaden bis 13, Wellenbonus, Gegner heben keine Waffen auf) sind angenommen |

---

## 2. Phase 0: Einrichtung (Opus selbst)

Wie Phase 0 von Auftrag 1 (ROM aus Drive, MAME 0.264, `laeufe_a5.sh`,
`laeufe_a7.sh`, Stage- und Helden-Savestates, Funktionsprüfung, Entwurfsordner).
Zusätzlich:

1. Savestates für Boss und Fernkampf mit dem Bot anlegen:
   `cd research/captcomm && CC_NAME=p0_s1 GFA_CFG=scripts/grafik/durchlauf.lua GFA_SAVE_CAM=256 GFA_STOP=1 scripts/grafik/bot.sh stage1`.
   Das legt Savestates `p0_s1_s1_cam<x>` für Kamera-x 512, 768, …, 2048
   an. Gebraucht werden `p0_s1_s1_cam768` (SKIP rennt bei etwa 768 herein),
   `p0_s1_s1_cam1280` (vor dem Mech) und `p0_s1_s1_cam2048` (Bossarena).
   Der Bot füllt die LP der Figur auf und setzt bei Stillstand die LP der
   Gegner auf 1; beides ist ein EINGRIFF, der in allen Messungen aus
   diesen Savestates genannt wird. Fehlen Savestates, weil die Kamera
   davor hängen blieb, `GFA_CLEAR=600` setzen und wiederholen.
2. Prüfen, dass in `p0_s1_s1_cam2048` der Boss (Typ `0x46DA4`) in einem
   Slot 0 bis 19 liegt und seine LP (S+0x40) 100 oder 110 betragen;
   beide Werte notieren (die Quellen nennen beide).
3. `git log --oneline -3` muss mit 5847251 oder neuer beginnen.

---

## 3. Phase 1: Designnachtrag (D3, parallel zu Phase 2)

### D3: Entscheidungen einarbeiten und Widersprüche bereinigen

```text
Aufgabe: Arbeite die Entscheidungen des Nutzers (Abschnitt 1 des zweiten
Auftrags, E1 bis E9, wörtlich angehängt) in docs/design.md und
docs/design-gegner-stages.md ein und bereinige die Widersprüche zwischen
beiden. Lies zuerst CLAUDE.md, beide Designdokumente vollständig,
docs/erkenntnisse.md und docs/mechanik.md. Kein Code, Deutsch, Markdown.
Ändere nur, was die Entscheidungen und die Liste unten verlangen; Stil,
Gliederung und Zahlen aus mechanik.md bleiben.

Im Einzelnen:
1. E1: Abschnitt 2 von design.md auf die Entscheidung umstellen (Welt
   „Perihel“ ist beschlossen, nicht mehr Arbeitsannahme). In
   design-gegner-stages.md alle Stellen „falls die Datei noch fehlt“ oder
   „Arbeitsannahme“ entfernen.
2. E2: In design-gegner-stages.md Abschnitt 2 die Angriffserlaubnis so
   umschreiben, dass Schutzfenster und liegende Figur keine Rolle spielen;
   die Zeile „Normale Gegner greifen eine liegende Figur nicht an“
   streichen. In design.md Abschnitt 4.7 und 9 die Entscheidung
   festhalten. Begründung in einem Satz: gemessen, einfacher, Gegner wirken
   nicht passiv.
3. E3: In design-gegner-stages.md Abschnitt 2 die Zeile „Rückstoß“ auf
   „keiner“ umstellen (Zittern als Animation). design.md Abschnitt 4.2
   bleibt.
4. E4: Zeile „Schutz nach dem Aufstehen“ auf „keiner“; offene
   Entscheidung 15 streichen.
5. E5: Angriffserlaubnis mit höchstens zwei, je Seite einer; offene
   Entscheidung 5 streichen.
6. E6: In design.md Abschnitt 3 60 Hz festlegen, Sekundenangaben in beiden
   Dokumenten prüfen (Frames ÷ 60).
7. E7, E8: Helden und acht Stages als beschlossen führen.
8. E9: Alle übrigen „Vorschlag“-Markierungen in „beschlossen (E9)“
   umwandeln, die Listen der offenen Entscheidungen auf das reduzieren,
   was wirklich offen bleibt (etwa Grafikstil und Sound, Namen der Helden
   endgültig).
9. Boss-LP: einheitlich. grafik/README.md nennt 100, die Messläufe 110
   (notes.md, „Nachtrag: Verhalten der Nahkämpfer“). Schreibe „100 bis
   110 im Vorbild (Rangabhängigkeit offen, M6 misst)“ und lass unsere
   Boss-LP bei 90 bis 120.
10. Erste Stage, Wellen 8 und 9: an die Reihenfolge des Vorbilds angleichen
    (letzte Welle bei halben Boss-LP, Fernkämpfer bei einem Viertel) oder
    die Abweichung in einem Satz begründen. Entscheide dich für das
    Angleichen, es sei denn, die Scheibe braucht die andere Reihenfolge.
11. Alle Stellen „offen (nicht beauftragt)“ in beiden Dokumenten
    durchnummerieren und als Liste „Offen bis Messpaket 2“ an das Ende von
    Abschnitt 8 (design.md) bzw. 10 (design-gegner-stages.md) stellen, mit
    Verweis M6 (Boss), M7 (Fernkampf, Messerwurf), M8 (Rest der Spielfigur:
    Nachlauf Kettenstufen 2 bis 4, Sprungangriff hoch und runter, Tod bei
    genau 0 LP, Schutz nach Neueinstieg, Rang beim Stage-Wechsel). Diese
    Stellen füllt der Nachtrag nach Phase 2.
12. Prüfe am Ende: keine Capcom-Namen außerhalb der Quellenabschnitte,
    beide Dokumente verweisen aufeinander, keine Widersprüche zwischen
    den Abschnitten 2 (design-gegner-stages.md) und 4.7 (design.md).

Ablieferung: beide Dateien geändert, dazu research/captcomm/entwuerfe/d3.md
mit einer Liste aller geänderten Stellen (Datei, Abschnitt, ein Satz).
Nicht committen, nicht in erkenntnisse.md, mechanik.md oder notes.md
schreiben.
```

---

## 4. Phase 2: Messpaket 2 (M6 bis M8, parallel; danach V6 bis V8)

Ablieferung und Status wie in Auftrag 1, Abschnitt 1. Gegenprüfer nach der
Schablone in Auftrag 1, Abschnitt 4, mit Präfix `<praefix>_v`.
Statusregel nach der Gegenprüfung ebenfalls wie dort (dritte Messung bei
Abweichung).

### M6: Boss DOLG (Präfix `boss`)

```text
Aufgabe: Miss den ersten Boss von Captain Commando (DOLG, Typ 0x46DA4,
Stage 1) so weit, dass unser eigener Boss mit Super-Armor danach entworfen
werden kann. Lies zuerst docs/erkenntnisse.md („Gegner als Vorbild“,
Zeile Boss), research/captcomm/grafik/README.md (Stage 1, Abschnitt
Boss), docs/mechanik.md („Schaden der Gegner“, „Trefferreaktion der
Gegner“, „Reichweite der Gegnerangriffe“, „Spezialangriff“) und in
research/captcomm/notes.md die Nachträge „Trefferreaktion der Gegner“,
„Reichweite der Gegnerangriffe“ und „Verhalten der Nahkämpfer“ sowie
„Gefundene Adressen“. Vorlagen: scripts/scenarios/reaktion.lua,
greichweite_angriff.lua, verhalten.lua, kette.lua; Auswertungen
messen_reaktion.py, messen_greichweite.py, messen_verhalten.py.

Ausgangslage: Savestate p0_s1_s1_cam2048 (Bossarena, aus einem Bot-Lauf
mit EINGRIFF: LP der Figur aufgefüllt, bei Stillstand LP der Gegner auf 1).
Die beiden WOOKY der Arena und die Wellen stören die Messung; setze sie
per Eingriff weit weg oder auf LP 1, und nenne das. Der Rang ist in
diesem Savestate hoch; für Vergleiche den Rang per rang.lua-Technik auf
9 und 20 festhalten (EINGRIFF).

Zu messen:
A. Lebenspunkte: Max-LP (S+0x9A) und Start-LP bei Rang 7, 9, 16, 24
   (Rang vor dem Aufwachen des Bosses festhalten). Erklärt das die Werte
   100 und 110 aus den Quellen?
B. Super-Armor, Regel: Welche Treffer senken die LP dauerhaft, welche
   werden zurückgenommen? Prüfe je einzeln: Kette Stufe 1, 1–2, 1–3,
   volle Kette mit Tritt, Tritt allein als Stufe 1 einer neuen Kette,
   Sprungangriff neutral, Sprungangriff hoch, Griff und Wurf (geht der
   Griff überhaupt?), Kniestoß, Spezialangriff frei, Sprintangriff,
   Raketenwerfer, Laser. Je Fall: LP-Verlauf Frame für Frame, Frame des
   Rücksprungs, auf welchen Wert (Wert vor der Kette oder vor dem ersten
   Treffer der Serie?), ob er bei einer unterbrochenen Kette (zwei Treffer,
   dann Pause über 27 Frames) ebenfalls zurückspringt, und ob der
   Abbruchstoß (54 Frames, etwa 48 px) Schaden macht und die Figur umwirft.
C. Trefferreaktion des Bosses: Zuckt er (S+4 = 3, Dauer), steht er still,
   bewegt er sich? Wird er von Stufe 4 oder vom Sprungangriff umgeworfen
   (Flug, Liegen, Aufstehen, Verwundbarkeit wie in „Trefferreaktion der
   Gegner“)? Nimmt er während eines eigenen Angriffs Treffer an?
D. Angriffe (Ansturm, dreifacher Armschwung, Sprung-Körperpresse, Griff
   mit Wurf, kurzer Schlag): je Angriff Auslöseabstand (x, Tiefe),
   Startup bis zum ersten aktiven Frame (S+0x24), aktive Frames,
   Reichweite x vorn und hinten, Tiefe, Höhe, Schaden bei Rang 9 und 20,
   Umwerfen, Nachlauf; beim Ansturm Geschwindigkeit und Strecke, bei der
   Körperpresse Flugbahn und Zielpunkt, beim Griff Griffweite, Haltedauer,
   Wurfweite und Wurfrichtung. Methode wie in greichweite_angriff.lua
   (Figur passiv, per Eingriff positioniert).
E. Rhythmus und Wahl: gegen eine passive Figur über mindestens 6000
   Frames die Abstände zwischen Angriffsbeginnen und die Reihenfolge der
   Angriffsarten; Abhängigkeit vom Abstand (nah, mittel, fern) und vom
   Rang. Verhält er sich anders, wenn die Figur angreift?
F. Verstärkung: Schwellen in LP für die letzte Welle (erkenntnisse.md
   nennt die Hälfte) und die zwei DICK (ein Viertel); ob die Schwelle
   die aktuellen oder die dauerhaft abgezogenen LP meint.
G. Fall: Frame des Falls (LP < 0 oder = 0?), ab wann die übrigen Gegner
   zusammenbrechen, Dauer bis „STAGE CLEAR“, ob der Boss in der
   Sterbeanimation noch trifft.

Ergebnis: Tabellen zu A bis G mit Status je Zeile. Ablieferung mit
Präfix boss: Szenarien boss_*.lua, messen_boss.py (Zeitachsen des
Boss-Slots: LP, Zustand, Animationszeiger, S+0x24, Position; Rücksprünge
der LP erkennen), belege_boss.sh, logs/boss.csv, Entwurf
research/captcomm/entwuerfe/boss.md. Nicht committen, nicht in notes.md,
mechanik.md, erkenntnisse.md schreiben.
```

### M7: Fernkampf und Messerwurf (Präfix `fern`)

```text
Aufgabe: Miss die Fernangriffe der Gegner aus Stage 1 von Captain
Commando: Pistole und Raketenwerfer des DICK, Messerwurf und Messerhagel
des SKIP. In Auftrag 1 kamen sie gegen eine passive Figur nicht vor. Lies
zuerst docs/mechanik.md („Schaden der Gegner“, „Reichweite der
Gegnerangriffe“, „Gegenstände und Waffen“), research/captcomm/notes.md
(„Nachtrag: Reichweite der Gegnerangriffe“, „Nachtrag: Schaden der
Gegner“ wegen der Geschosse, „Nachtrag: Gegenstände und Waffen“ wegen der
Geschossblöcke, „Gefundene Adressen“) und grafik/README.md (Stage 1,
Zeilen SKIP und DICK). Vorlagen: scripts/scenarios/greichweite_angriff.lua,
verhalten.lua, item_frei.lua; Auswertungen messen_greichweite.py,
messen_verhalten.py, messen_item.py (Slots 20 bis 59).

Ausgangslagen: SKIP rennt bei Kamera-x etwa 768 herein (Savestate
p0_s1_s1_cam768); DICK #1 erscheint in der Arena nach dem Tod eines
Arena-WOOKY, DICK #2 mit der letzten Welle (Savestate p0_s1_s1_cam2048,
Boss-LP per Eingriff senken, um die Wellen auszulösen). Alle Savestates
stammen aus einem Bot-Lauf mit EINGRIFF (LP-Auffüllung). Rang festhalten
(EINGRIFF) für Vergleiche bei 9 und 20.

Zu messen, je Angriffsart (Pistole einzeln und Salve, Rakete, Messerwurf,
Messerhagel):
1. Auslösung: Abstand x und Tiefe zur Figur, bei dem der Angriff beginnt;
   bei DICK zusätzlich der Abstand, den er hält (100 bis 140 px laut
   README), und wie er ihn herstellt (Geschwindigkeit, Rückzug, ob er die
   Tiefe angleicht).
2. Startup bis zum Abschuss (Animationszeiger bis zum Erscheinen des
   Geschossblocks), aktive Frames und Nachlauf des Schützen.
3. Geschoss: Slot, Geschwindigkeit, Flugbahn (geradeaus oder auf die
   Figur gezielt, Tiefe fest oder nachgeführt), Reichweite bis zum
   Verschwinden, Trefferfläche (x, Tiefe, Höhe: trifft es eine springende
   Figur?), Schaden bei Rang 9 und 20, Umwerfen, ob es mehrere Ziele
   trifft, ob es an Wänden oder Behältern endet.
4. Abwehr: Kann die Figur das Geschoss mit einem Schlag oder Sprung
   vermeiden, zerstört ein Schlag es, trifft es einen Gegner auf der Bahn?
5. Rhythmus: Abstände zwischen Schüssen und Salven über mindestens 3000
   Frames; Messerhagel laut README 25 Frames plus 12 Pause.
6. Waffe des DICK beim Tod: Munition der liegenden Waffe (5 laut
   mechanik.md), Zusammenhang mit seinen verschossenen Kugeln.

Ergebnis: Tabelle je Angriffsart mit Status. Ablieferung mit Präfix fern:
Szenarien fern_*.lua, messen_fern.py (Geschossblöcke in Slots 20 bis 59
verfolgen: Erscheinen, Position je Frame, Verschwinden, Trefferzuordnung
über P+0x82 und S+0x6C), belege_fern.sh, logs/fern.csv, Entwurf
research/captcomm/entwuerfe/fern.md. Nicht committen, nicht in notes.md,
mechanik.md, erkenntnisse.md schreiben.
```

### M8: Rest der Spielfigur (Präfix `rest`)

```text
Aufgabe: Schließe die Lücken in der Spielfigur von Captain Commando, die
die vertikale Scheibe braucht. Lies zuerst docs/mechanik.md vollständig
(besonders „Angriff“, „Sprungangriff“, „Schaden der Gegner“, „Nicht
übernommen“), docs/design.md Abschnitt 8 (Liste „Messwerte, die vor der
Scheibe gesichert sein müssen“, Punkt 6) und research/captcomm/notes.md
(„Szenarien“, „Nachtrag: Sprungangriff“, „Nachtrag: Reichweite der
Kettenstufen 2–4“, „Nachtrag: Schaden der Gegner“, „Gefundene Adressen“).
Vorlagen: scripts/scenarios/kette.lua, sprungangriff.lua, schlag.lua,
rang.lua, stage_start.lua; Auswertungen messen_a5.py (kette,
sprungangriff, schlag, angreifer, treffer).

Zu messen:
A. Nachlauf der Kettenstufen 2, 3 und 4: handlungsfähig ab (Laufen,
   nächster Schlag, Sprung) nach Treffer und nach Leerschlag; Dauer der
   Pose ohne Eingabe; beim Tritt der zweite aktive Abschnitt D+17 bis D+20
   und sein Nachlauf. Savestates kontakt, kontakt_b.
B. Sprungangriff hoch und runter: Reichweite x (vorn, hinten), Tiefe,
   aktive Frames, Höhenbegrenzung, Schaden und Umwerfen bestätigen
   (12 LP bzw. 4 LP), mit der Technik aus sprungangriff.lua und kette.lua
   (Gegner per Eingriff positioniert).
C. Tod des Gegners bei genau 0 LP: Gegner-LP per Eingriff so setzen, dass
   ein Treffer genau 0 ergibt (zum Beispiel 3 LP vor Stufe 1). Stirbt er,
   oder lebt er mit 0 LP weiter wie die Figur?
D. Neueinstieg nach dem Tod der Figur: Frames vom LP < 0 bis zur
   Steuerbarkeit, Position beim Wiedereinstieg, Dauer und Art des Schutzes
   danach (S+4, Timer FFAA69 oder anderer), Rang −3 bestätigen (im Repo
   nur aus einem Lauf), Verhalten der Gegner währenddessen. Szenario aus
   hurt_c.lua verlängert.
E. Rang beim Stage-Wechsel: Rang vor und nach dem Wechsel von Stage 1 zu
   2 (Bot-Lauf p0_s1 oder stage_start mit Stage-Ende per Eingriff auf die
   Boss-LP). Laut Workflow −3; bestätigen oder widerlegen.
F. Kleine Nachprüfungen aus „Nicht übernommen“, je zwei Läufe:
   Mindestabstand des Standardschlags; Reichweite bei Blick nach links
   (1 px kürzer?); Ausfallschritt bei gehaltener Richtung zum Gegner beim
   Kettendruck (etwa 20 px, späterer Treffer) und Abbruch der Kette bei
   Richtung weg; „Treffer in der Luft werfen immer um“; „gleichzeitiger
   Treffer: die Figur gewinnt“ (Gegnerangriff und eigener Schlag im selben
   Frame aktiv, per Eingriff auf die Positionen erzeugt).

Ergebnis: Tabellen zu A bis F mit Status je Zeile. Ablieferung mit
Präfix rest: Szenarien rest_*.lua, Unterbefehle in messen_a5.py oder
messen_rest.py, belege_rest.sh, logs/rest.csv, Entwurf
research/captcomm/entwuerfe/rest.md. Nicht committen, nicht in notes.md,
mechanik.md, erkenntnisse.md schreiben.
```

---

## 5. Phase 3: Spezifikation der vertikalen Scheibe (S1 und S2, parallel zu Phase 2, nach D3)

Zwei Agenten schreiben je eine Datei. Beide sind technisch, aber ohne
Code und ohne Festlegung auf eine Engine oder Sprache. Sie beschreiben,
was ein Programmierer bauen muss, so genau, dass der spätere Codierauftrag
keine Designfragen mehr stellt. Beide lesen zuerst CLAUDE.md,
docs/design.md, docs/design-gegner-stages.md (Fassung nach D3),
docs/mechanik.md und docs/erkenntnisse.md. Werte werden aus mechanik.md
zitiert, nicht neu erfunden; was Messpaket 2 noch liefert, heißt
„offen (M6)“ bis „offen (M8)“ und wird im Nachtrag gefüllt.

### S1: Spezifikation Kampfsystem (`docs/spezifikation-kampf.md`)

```text
Aufgabe: Schreibe die technische Spezifikation des Kampfsystems für die
vertikale Scheibe von Comet Brawlers (docs/design.md, Abschnitt 8), ohne
Code und ohne Engine-Festlegung. Deutsch, Markdown, Tabellen. Jede Regel
muss so formuliert sein, dass sie mit dem Frame-Protokoll prüfbar ist.

Gliederung (Überschriften genau so):
1. Zweck und Abgrenzung: was die Scheibe beweisen soll, was nicht drin ist.
2. Zeit und Raum: fester Schritt 60 Hz (E6), Frame-Zählung, Eingabe mit
   einem Frame Latenz (Eingabe in Frame f wirkt in f+1), logische
   Auflösung 384 × 224, Welt-x, Tiefe und Höhe als drei Achsen,
   Festkomma 16.16 wie das Vorbild oder Gleitkomma mit Rundungsregel
   (Empfehlung mit Begründung), Bildschirmposition aus Welt-x, Tiefe und
   Höhe, Sortierung nach Tiefe.
3. Entitäten: Figur, Gegner, Geschoss, Gegenstand, Behälter; gemeinsame
   Felder (Position, Vorframe-Position, LP, Max-LP, Zustand, Aktion,
   Unterphase, Animationszeiger, Blickrichtung, Timer), analog zur
   Objekttabelle des Vorbilds, aber ohne Adressen.
4. Zustandsautomat der Figur: Zustände (Stand, Laufen, Sprint, Sprung,
   Landung, Schlag Stufe 1 bis 4, Leerschlag, Sprungangriff in vier
   Varianten, Griff, Kniestoß, Wurf, Spezialangriff, Sprintangriff,
   Sprintsprung, Getroffen, Umgeworfen, Liegen, Aufstehen, Tot,
   Waffeneinsatz, Aufnehmen) mit je: Eintritt (Bedingung und Frame),
   Dauer, Ausgänge, abbrechbar ab, Bewegung währenddessen. Alle Zahlen
   aus mechanik.md mit Abschnittsangabe. Eingabepuffer: keiner (verworfene
   Drücke), außer wo das Vorbild eines zeigt.
5. Trefferprüfung: Reichweiten als Abstände zwischen Positionen (x vorn,
   x hinten, Tiefe, Höhe) je Angriff und Stufe; aktive Frames; ein Treffer
   je Ziel je Angriff; Reihenfolge der Prüfung innerhalb eines Frames (die
   Figur gewinnt den gleichzeitigen Treffer); Trefferstopp 7 Frames
   einmal je Frame mit Treffern; Kombostufe und 16-Frame-Fenster;
   Umwerfen; mehrere Ziele.
6. Schaden, LP, Schutz: 72 LP, Tod erst unter 0, Schutzfenster 27 und 35
   Frames und 70 nach dem Spezialangriff, Treffer im Schutz wirkungslos
   (E2), Kosten des Spezialangriffs (9 LP, nur bei Treffer, Untergrenze 0).
7. Trefferreaktion der Gegner als Gegenstück: 23 Frames, kein Rückstoß
   (E3), Neustart bei Treffer, Umwerfen mit Flugbahn, Liegen, Aufstehen 18
   Frames, kein Schutz (E4), Tod und Slot-Freigabe; Griff und Haltedauer.
8. Griff, Wurf, geworfener Gegner als Geschoss, Kniestoß: Bedingungen und
   Bahnen.
9. Sprint und Spezialangriff: Doppeltipp-Erkennung, Geschwindigkeitsverlauf,
   wachsende Fläche des Spezialangriffs.
10. Waffen und Gegenstände in der Scheibe: Aufnehmen, Essen, Raketenwerfer
    (3 Schuss, 8 LP, Explosion), Verlieren beim Treffer, Liegezeit.
11. Frame-Protokoll und Eingabeaufzeichnung: Spalten je Frame (Frame, x,
    Tiefe, Höhe, LP, Zustand, Aktion, Unterphase, Kombostufe, Rang, je
    Gegner Slot, x, Tiefe, Höhe, LP, Zustand), Format (CSV), Abspielen
    einer Eingabedatei (Frame, gedrückte Tasten), Determinismus-Forderung
    (gleiche Eingaben, gleiches Protokoll, MD5).
12. Abnahmetests: die zehn Kriterien aus design.md Abschnitt 8 je als
    Testfall mit Eingabefolge, erwarteten Protokollzeilen und Toleranz
    (keine). Dazu zehn weitere Testfälle aus den Abschnitten 4 bis 10.
13. Offen bis Messpaket 2: Liste mit M6 bis M8.

Umfang: 3000 bis 4500 Wörter plus Tabellen. Keine Capcom-Namen außer in
einem Quellenabschnitt. Ablieferung: docs/spezifikation-kampf.md und
research/captcomm/entwuerfe/s1.md (zehn Zeilen: offene Fragen an den
Nutzer, falls welche). Nicht committen.
```

### S2: Spezifikation Welt, Gegner, Kamera, Rahmen (`docs/spezifikation-welt.md`)

```text
Aufgabe: Schreibe die technische Spezifikation von Gegnerlogik, Stage,
Kamera, Wellen, Boss, Gegenständen, Anzeige und Rahmen für die vertikale
Scheibe von Comet Brawlers (docs/design.md, Abschnitt 8;
docs/design-gegner-stages.md, Abschnitte 1, 2, 4, 5, 7, 8), ohne Code und
ohne Engine-Festlegung. Deutsch, Markdown, Tabellen. Jede Regel muss mit
dem Frame-Protokoll aus docs/spezifikation-kampf.md prüfbar sein (die
Datei entsteht parallel; verweise auf ihren Abschnitt 11).

Gliederung (Überschriften genau so):
1. Zweck und Abgrenzung.
2. Stage-Daten: Abschnitte der ersten Stage mit Welt-x, Tiefenband je
   Abschnitt (Ober- und Untergrenze als Funktion von x), feste
   Hindernisse (Wände, schräge Wand des Tresens), Vordergrundobjekte,
   Behälter mit Inhalt, Kamera-y-Verlauf. Datenformat als Tabelle
   (Vorschlag: eine Textdatei je Stage, Felder benannt).
3. Kamera: Scrollen nur nach rechts, Folgepunkt bei Bildschirm-x 200,
   Totzone in der Arena 128 bis 256, linker Rand als Wand, Sperren
   (Kamera-x, Bedingung „Welle besiegt“), Halt bei zu vielen lebenden
   Gegnern (Vorbild: 5 bei Kamera-x 848, mehr als 3 vor dem Mech),
   Bossarena, Bildschütteln.
4. Aktivierung und Wellen: Gegner liegen vorplatziert bereit; aktiv nur
   von 64 px links bis 63 px rechts außerhalb des Bildes; Aufwachen bei
   1 px im Bild; Auslöser nach Kamera-x, Zahl der Lebenden, Boss-LP
   (Zahlen aus design-gegner-stages.md Abschnitt 7 und erkenntnisse.md,
   „Nachschub“); Spawn-Arten (Rand, Luke 47 Frames, Versteck);
   Wellentabelle der Scheibe (Welle 2 als Sperrwelle, Welle 7 und 8 in der
   Arena).
5. Gegnerlogik Nahkämpfer: Zustandsautomat (warten, aufwachen, annähern,
   Tiefe angleichen, Kampfhaltung mit Pause 29 − 4·⌊Rang/4⌋, Angriff mit
   Zielabstand und Abbruchfenster ±31/32 px und Tiefe −10/+11, Serie 38
   bis 90 Frames, Pause zwischen Serien, Abwarten auf 120 bis 128 px,
   Seitenwechsel, Verfolgung höchstens 92 Frames beim Weglaufen) mit
   Übergangsbedingungen in px und Frames; Angriffsarten mit Startup,
   aktiven Frames, Reichweiten, Nachlauf, Umwerfen aus mechanik.md
   („Reichweite der Gegnerangriffe“); Angriffserlaubnis nach E5 (höchstens
   zwei, je Seite einer), ohne Rücksicht auf Schutzfenster (E2);
   Zufallsentscheidungen benennen (welche Größe, welche Verteilung,
   seedbar für Determinismus).
6. Gegnerlogik Fernkämpfer: Abstand halten 100 bis 140 px, Zielen,
   Salven, Rakete; Werte offen (M7), Platzhaltertabelle.
7. Boss: Super-Armor (Regel offen (M6), Platzhalter nach
   design-gegner-stages.md Abschnitt 4), drei Angriffe der Scheibe
   (Ansturm, Armschwung, Körperpresse), Rhythmus 170 bis 200 Frames,
   LP-Schwellen für Verstärkung, Fall besiegt alle.
8. Rang: 7 bis 24, Start 9, +1 nach 409 Frames und dann alle 600, −3 je
   Tod, Wirkung auf Schaden, LP und Angriffspause; Übergang beim
   Stage-Wechsel offen (M8).
9. Gegenstände und Behälter: Slots, Erscheinen (48 Frames Flug aus dem
   Behälter), Liegezeit, Blinken, Verschwinden beim Scrollen (163 px
   links), Aufnahmebereich, Essen, Raketenwerfer, Punkte.
10. Anzeige und Rahmen: LP-Balken Figur und zuletzt getroffener Gegner
    (72 als Balkenskala), Leben, Punkte (Schema aus design.md Abschnitt 7),
    Tod und Neueinstieg (Schutz offen (M8)), Stage-Ende („STAGE CLEAR“,
    Bonus), Pause, Debug-Anzeige (Hitboxen, Frame-Zähler, Rang).
11. Zufall und Determinismus: alle Zufallsentscheidungen über einen
    seedbaren Generator, Seed im Frame-Protokoll, damit Eingabeaufzeichnungen
    abspielbar sind.
12. Abnahmetests: zehn Testfälle für Kamera, Wellen, Gegnerlogik, Boss,
    Rang und Gegenstände mit Eingabefolge und erwarteten Protokollzeilen.
13. Offen bis Messpaket 2: Liste mit M6 bis M8.

Umfang: 3000 bis 4500 Wörter plus Tabellen. Keine Capcom-Namen außer in
einem Quellenabschnitt. Ablieferung: docs/spezifikation-welt.md und
research/captcomm/entwuerfe/s2.md (zehn Zeilen: offene Fragen an den
Nutzer, falls welche). Nicht committen.
```

### Nachtrag nach Phase 2 (an D3, S1, S2 per SendMessage)

```text
Messpaket 2 ist abgeschlossen. Lies research/captcomm/entwuerfe/boss.md,
fern.md und rest.md (nur die Ergebnistabellen mit Status). Ersetze in
deinem Dokument jede Stelle „offen (M6)“ bis „offen (M8)“ durch den
gesicherten Wert mit Quelle „notes.md, Nachtrag <Thema>“; unsichere Werte
mit Zusatz „unsicher“ und beiden Werten; was offen bleibt, bleibt „offen“
mit einem Satz Begründung. Ändere sonst nichts. Bericht: Liste der
ersetzten Stellen.
```

---

## 6. Phase 5: Einarbeitung durch Opus

Vier Commits, in dieser Reihenfolge, Push nach jedem:

1. **„Design: Entscheidungen vom 2026-10-02 eingearbeitet“**: Ergebnis von
   D3 in `docs/design.md` und `docs/design-gegner-stages.md`. In
   `docs/erkenntnisse.md` einen Abschnitt „Entscheidungen“ nach „Haltung“
   mit der Tabelle E1 bis E9 (Datum, Entscheidung, ein Satz Begründung).
2. **„Messungen: Boss, Fernkampf, Rest der Spielfigur belegen“**: Entwürfe
   `boss.md`, `fern.md`, `rest.md` und die Gegenprüfungen in
   `research/captcomm/notes.md` (Nachträge, Stand-Tabelle Zeilen 19 bis
   21, Laufprotokoll, Adressen, Werkzeuge, Szenarien), `docs/mechanik.md`
   (neue Abschnitte „Boss“, „Fernangriffe der Gegner“, Ergänzungen in
   „Angriff“, „Sprungangriff“, „Schaden der Gegner“, „Nicht übernommen“;
   bestätigte Workflow-Werte verlieren die Kennzeichnung „Workflow“),
   `docs/erkenntnisse.md` (Stand-Tabelle, Boss-Zeile, Offene Punkte).
3. **„Design: Nachtrag aus Messpaket 2“**: beide Designdokumente nach dem
   Nachtrag.
4. **„Spezifikation der vertikalen Scheibe“**: `docs/spezifikation-kampf.md`
   und `docs/spezifikation-welt.md` nach dem Nachtrag, in
   `docs/erkenntnisse.md` unter „Wo was steht“ eingetragen. Vor dem Commit
   prüfen: keine Capcom-Namen außerhalb der Quellenabschnitte (grep wie in
   Auftrag 1), Stichprobe von dreißig Zahlen gegen `mechanik.md`, beide
   Spezifikationen und beide Designdokumente widerspruchsfrei bei
   Schutzfenster (E2), Rückstoß (E3), Aufstehschutz (E4), Angreiferzahl
   (E5), 60 Hz (E6).

Ordner `entwuerfe/` vor dem letzten Commit löschen. `git status` muss
sauber sein, nichts aus `roms/` oder `logs/raw/` im Index.

---

## 7. Rückmeldung an den Orchestrator

```text
## Rückmeldung Opus, Auftrag 2, <Datum>

### Commits auf main
<hash> <Nachricht> (je Zeile)

### Entscheidungen eingearbeitet
E1 bis E9: je ein Satz, was sich in welchem Dokument geändert hat; verbleibende offene Entscheidungen des Nutzers (nummeriert)

### Messungen (je Thema eine Zeile)
M6 Boss: <n> gesichert, <n> unsicher, <n> offen. Wichtigster Befund: <ein Satz, besonders die Super-Armor-Regel und die Boss-LP>.
M7 Fernkampf: ...
M8 Rest: ... (besonders Tod bei 0 LP, Neueinstieg, Rang beim Stage-Wechsel)

### Unsichere Werte mit beiden Messungen
<Größe>: Messagent <Wert>, Gegenprüfer <Wert>, dritte Messung <Wert oder entfällt>

### Spezifikation
docs/spezifikation-kampf.md: <Wortzahl>, Testfälle: <Anzahl>, offene Fragen: <Anzahl>
docs/spezifikation-welt.md: <Wortzahl>, Testfälle: <Anzahl>, offene Fragen: <Anzahl>
Empfehlung der Agenten zu Festkomma oder Gleitkomma: <ein Satz>

### Fragen an den Nutzer vor dem Codierauftrag (nummeriert, je ein Satz)

### Was nicht erledigt wurde und warum

### Speicher, Laufzeit, Probleme mit MAME oder dem Container
```
