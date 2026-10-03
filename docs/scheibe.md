# Comet Brawlers: vertikale Scheibe (Programm)

Stand 2026-10-03, im Aufbau (Auftrag 3). Das Programm setzt
`docs/spezifikation-kampf.md` und `docs/spezifikation-welt.md` um. Es liegt
in `spiel/`, ist in TypeScript geschrieben und hat keine Abhängigkeiten
(E22). Dieses Dokument beschreibt Bedienung, Bau, Tests, den Stand der
Abnahme und die Festlegungen, die beim Codieren nötig waren.

## Bedienung

Folgt mit der Darstellung (Stufe 3).

## Bau und Befehle

Alle Befehle im Ordner `spiel/`, mit Node 22 aus `/opt/node22/bin`:

| Befehl | Wirkung |
|---|---|
| `npm run pruefen` | Typprüfung: Kern, Prüfläufe und Tests (`tsconfig.json`), Kern allein ohne Node- und DOM-Typen (`tsconfig.kern.json`), Kern und Darstellung für den Browser (`tsconfig.browser.json`) |
| `npm test` | alle Tests unter `tests/` mit `node:test` |
| `npm run lauf -- --szene <datei> --eingabe <datei> --aus <ordner> [--stages <ordner>]` | Prüflauf ohne Fenster; schreibt `protokoll.csv` und `objekte.csv` und gibt beide MD5 aus; ohne `--eingabe` ohne Tasten |
| `npm run bauen` | Browserfassung nach `spiel/dist/` |
| `npm start` | lokaler Webserver auf Port 8080 |
| `npm run foto` | Bildschirmfotos der laufenden Scheibe nach `docs/bilder/` |

## Werkzeuge und Umgebung

Geprüft in Phase 0 (2026-10-03):

| Werkzeug | Stand | Hinweis |
|---|---|---|
| Node | 22.22.0 | TypeScript direkt mit `--experimental-strip-types` |
| tsc | 6.0.2 | Typprüfung und Bau |
| Node-Typen | `@types/node` 26.1.1 unter `/opt/node-tools/node_modules/@types` | in `tsconfig.json` über `typeRoots` eingebunden; fehlen sie, scheitert nur die Typprüfung von Prüfläufen und Tests, nicht der Kern |
| `node --test` | ok | Node 22 nimmt keinen Ordner als Argument; das Skript `test` übergibt das Muster `"tests/**/*.test.ts"` |
| Playwright | ok, Chromium unter `/opt/pw-browsers` | aus ES-Modulen nur über `createRequire` ladbar, weil `NODE_PATH` dort nicht greift |
| Webserver | `http-server` global | Ersatz: `python3 -m http.server 8080 --directory spiel` |

## Tests

Folgt mit den Abnahmetests (Stufe 3).

## Abnahme

Folgt mit den Abnahmetests (Stufe 3).

## Formate

Alle Textdateien sind UTF-8 mit Zeilenende LF. Leser: `src/kern/stage.ts`
(Stage-Daten), `src/pruef/szene.ts` (Prüfszene), `src/pruef/eingabe.ts`
(Eingabedatei); Schreiber: `src/pruef/protokoll.ts` (beide Protokolle).
Unbekannte Satzarten, Felder und Schlüssel sind Fehler mit Zeilennummer.

### Prüfszene

Prüfszene nach Kampf 11.2 mit dem Prüfstart nach Welt 11.3, im Satzformat
der Stage-Daten (Welt 2.1): je Zeile ein Satz, zuerst die Satzart, dann
Felder `name=wert`, getrennt durch Leerzeichen; `#` beginnt einen
Kommentar. Ein Feld ohne `=` hat den Wert `ja` (`rang.fest`). Ganze Zahlen
für Koordinaten (Pixel, Nachkommaanteil 0), Blick als `R`/`L` oder
`rechts`/`links`, Schalter als `ja`/`nein` oder `an`/`aus`. Beispiele:
`spiel/tests/szenen/beispiel_puppe.txt` (Prüfbühne mit Puppe) und
`spiel/tests/szenen/beispiel_scheibe.txt` (Bühne `scheibe` mit Prüfstart).

| Satz | Felder (Standard) | Bedeutung |
|---|---|---|
| `szene` | `name`, `endframe`, `seed` (1), `buehne` (`pruefbuehne`) | genau einmal; Kennung, letzter Frame, Startwert (nicht 0), Stage-Datei `daten/stages/<buehne>.txt` |
| `pruefstart` | Schlüssel aus Welt 11.3 in deren Schreibweise, siehe unten | beliebig viele Sätze; spätere Angaben gelten |
| `figur` | `x`, `z`, `blick`, `lp`, `waffe` (`RW` oder `leer`), `munition` | höchstens einmal; fehlende Felder vom Start der Stage, 72 LP, ohne Waffe; `waffe=RW` ohne `munition` hat 3 Schuss |
| `gegner` | `slot` (0 bis 19), `typ` (`Bolzer`, `Rammbock`, `Zünder` oder `Zuender`, `Ballast`, `Puppe`), `x`, `z`, `rolle` (nach Typ: leicht, schwer, fern, boss; Puppe leicht), `blick` (zur Figur, bei gleichem x rechts), `lp`, `lp_max` (= lp), `vorplatziert` (`nein`), `logik` (Puppe `aus`, sonst `an`), `erlaubnis` (`an`), `erscheint` (0) | ein Gegner in seinem Slot; ersetzt einen Gegner der Stage im selben Slot. `vorplatziert=ja` heißt Startwerte (Welt 4.5: leicht 16 LP / 5 Schaden, schwer 30 / 6); ohne `lp` und nicht vorplatziert setzt `gegnerAngelegt` die LP nach Rang. Logik aus = Puppe (Kampf 11.2); Logik an = wach und kampffähig (Welt 11.3). `erscheint=f` mit f > 1: erscheint in W1 von Frame f, vor den übrigen Eingriffen |
| `objekt` | `slot` (20 bis 59), `typ` (`Gegenstand`, `Behälter`, `Rakete`, `Waffe`, `Effekt`), `art`, `x`, `z`, `munition` (0; Raketenwerfer 3), `inhalt` (Behälter `leer`), `id` (`o<slot>`) | ein Objekt in seinem Slot; ein Gegenstand liegt von Beginn an (gelandet, aufnehmbar, Liegezeit 0) |
| `eingriff` | `frame`, `ziel`, `feld`, `wert` | setzt in W1 des Frames einen Wert (Nachkommaanteil 0) und schreibt `EI:<ziel>.<feld>=<wert>` |
| `pruefangriff` | `slot`, `von`, `bis`, `schaden`, `umwerfen` (`nein`) | Angriffsinstanz PA des Gegners in den Frames von bis (Kampf 11.2) |

Schlüssel des Satzes `pruefstart` (Welt 11.3):

| Schlüssel | Wirkung |
|---|---|
| `rang=n`, `rang.fest` | Startrang (Prüfszene: 9); `rang.fest` hält ihn (Rang-Uhr steht) |
| `kamera.x=n`, `kamera.modus=M` | Startkamera (Ky nach `kamera_y`); M aus FREI, SPERRE, HALT, BLENDE, ARENA, ENDE; ARENA: Totzone ab Frame 1 |
| `welle.n=aus`, `welle.n=an`, `welle.7=nur_boss` | Welle ohne vorplatzierte und neue Gegner (ihr Slot bleibt leer); wieder an; Welle 7 ohne die Bolzer, Boss wach und kampffähig, Bosskisten zerbrochen |
| `sperre.ID=aus`, `halt.ID=aus`, `behaelter.ID=aus` | Satz der Stage entfällt (`=an` nimmt das zurück) |
| `behaelter.ID=art,x,z,inhalt` | zusätzlicher Behälter, nach denen der Stage im nächsten Objektslot |
| `gegner.sN.erlaubnis=aus` | Gegner in Slot N fordert kein Recht an |
| `boss.angriffe=aus`, `boss.bewegung=aus`, `boss.lp=n` | Boss greift nicht an, bewegt sich nicht, Start-LP |
| `fest.NAME=WERT` | ersetzt das Ergebnis der Ziehung NAME (z. B. `fest.gehstufe=normal`, `fest.angriff=BA`, `fest.zielpunkt=128`); die Ziehung findet trotzdem statt; der Kern reicht die Werte als `welt.fest` an die Module |
| `figur.x=`, `figur.z=`, `figur.blick=`, `figur.lp=`, `figur.waffe=`, `figur.munition=` | wie der Satz `figur` (Schreibweise der Prüfstarts PS1 bis PS10) |

Ziele und Felder der Eingriffe:

| Ziel | Felder |
|---|---|
| `f` | `x`, `z`, `h` (px), `lp`, `lp_max`, `blick`, `schutz`, `waffe`, `munition` |
| `sN` | `x`, `z`, `h`, `lp`, `lp_max`, `blick` |
| `oN`, `gN` | `x`, `z`, `h`, `lp`, `munition`, `liegezeit` |
| `rang` | `wert`, `zaehler`, `fest` |
| `kamera` | `x`, `modus` |
| `welle.N` | `jetzt` (löst Welle N aus) |

Ein Eingriff setzt nur das Feld; Folgen wie der Tod bei LP unter 0 erkennt
das zuständige Modul im selben Frame (LP < 0 ≤ lp_vor).

### Stage-Daten (Ergänzung)

Format nach Welt 2.1. Für die Prüfbühne (Kampf 11.2) hat der Satz `stage`
zwei zusätzliche Felder: `kamera=fest` (Kamera bleibt bei Kamera-x und
Kamera-y des Starts; Standard `folgt`) und `raender=aus` (Welt 2.2 Punkt 4,
Bild- und Stage-Ränder der Figur, gilt nicht; Standard `ja`). Weitere
Standardwerte: `gegner blick=links`, `gegner werte=rang`, `behaelter
inhalt=leer`, `welle wert=0 bonus=0`, `eintrag verzoegerung=0`. Die
Zusatzbedingung schreibt sich `bedingung=lebende≤n` oder `bedingung=lebende<=n`.

### Eingabedatei

Nach Kampf 11.1: Zeilen mit `#` sind Kommentare, jede Datenzeile
`von,bis,tasten` mit Buchstaben aus `L R O U A S` in beliebiger
Reihenfolge, gedrückt in allen Frames von bis bis einschließlich;
überlappende Zeilen werden vereinigt, nicht genannte Frames haben keine
Taste. Die Aufzeichnung (`eingabeText`) schreibt je Lauf gleicher, nicht
leerer Tastenmengen eine Zeile in der Reihenfolge L R O U A S, aufsteigend
nach von. Beispiel: `spiel/tests/eingaben/beispiel.txt`.

### Protokoll

Datei `protokoll.csv` nach Kampf 11.3 und Welt 11.4. Kopf aus
Kommentarzeilen in dieser Reihenfolge:

```
# version=comet-brawlers-scheibe-0.1
# szene=<name>
# seed=<seed>
# eingabe_md5=<MD5 der Eingabedatei>
# EINGRIFF erscheint frame=<f> slot=<n> typ=<Typ> x=<x> z=<z>      je Gegner mit erscheint
# EINGRIFF frame=<f> ziel=<ziel> feld=<feld> wert=<wert>            je Eingriff in Szenenfolge
# EINGRIFF pruefangriff slot=<n> von=<f> bis=<f> schaden=<n> umwerfen=ja|nein
```

Dann die Kopfzeile mit den Spaltennamen, dann eine Zeile je Frame
(Frame 1 bis endframe; endet früher, wenn die Scheibe endet, Welt 10.5).
Trennzeichen Komma, Dezimalpunkt Punkt, 358 Spalten in fester Reihenfolge:

| Gruppe | Spalten |
|---|---|
| Figur, Rang, Kamera (Kampf 11.3) | `frame`, `tasten`, `f_x`, `f_z`, `f_h`, `f_lp`, `f_zst`, `f_akt`, `f_ph`, `f_uhr`, `f_stopp`, `f_schutz`, `f_blick`, `kombo`, `f_waffe`, `f_mun`, `f_sprint`, `rang`, `rang_zaehler`, `kamera_x`, `kamera_y`, `zufall_haupt` |
| je Gegnerslot s0 bis s19 (Kampf 11.3) | `sn_typ`, `sn_x`, `sn_z`, `sn_h`, `sn_lp`, `sn_zst`, `sn_akt`, `sn_modus`, `sn_ph`, `sn_blick` (erst alle Spalten von s0, dann s1 …) |
| Welt (Welt 11.4) | `kamera_modus`, `schuetteln`, `lebende`, `wellen`, `pfeil`, `recht_l`, `recht_r`, `zielrecht`, `leben`, `punkte`, `anzeige`, `phase`, `steuerung` |
| je Gegnerslot s0 bis s19 (Welt 11.4) | `sn_recht`, `sn_angriff`, `sn_ziel`, `sn_schaden`, `sn_timer`, `sn_zufall` |
| Super-Armor (Welt 11.4) | `s0_lpfolge`, `s0_folge` |
| Ereignisse (Kampf 11.4, Welt 11.4) | `ereignis` |

Formate: Positionen (`f_x`, `f_z`, `f_h`, `sn_x`, `sn_z`, `sn_h`) als
exakte Dezimalzahl des 16.16-Werts ohne überflüssige Nullen und ohne „-0“
(135.125, 51.25, 100); übrige Zahlen als ganze Zahl. `tasten` in der
Reihenfolge L R O U A S, leer ohne Taste. Blick `R` oder `L`. `f_waffe`
leer oder `RW`, `f_mun` die Munition (0 ohne Waffe). `recht_l`, `recht_r`,
`zielrecht`, `anzeige` als Slotnummer ohne „s“ oder leer. `schuetteln` als
`x/y`. `wellen` als ausgelöste Wellen in Reihenfolge der Auslösung, durch
`-` getrennt. `sn_akt` ist in Reaktionen der Reaktionsname, sonst die
Körperaktion (STAND, GEHEN, ANGRIFF …); `sn_modus` der Logikzustand nach
Welt 5.2, 6, 7.1, in Reaktionen deren Name, dazu FREI (Reaktion beendet,
die Logik wählt im nächsten Frame) und PUPPE (Logik aus). `sn_timer` zählt
die Frames im aktuellen Modus einschließlich des laufenden (1 im ersten).
Alle Spalten eines freien Gegnerslots sind leer, ebenso `s0_lpfolge` und
`s0_folge` bei freiem s0. `ereignis`: Einträge durch `;`, Felder durch `:`
getrennt, in der Reihenfolge ihres Eintretens; Kennungen nach Kampf 11.4
und Welt 11.4, dazu `OV:Art` (kein Objektslot frei, Welt 9.1) und der
Angriffscode `LN` für die Landung beim Neueinstieg (Kampf 6.5). Kein Feld
enthält ein Komma.

### Objektprotokoll

Datei `objekte.csv` nach Kampf 11.5. Kopf wie `protokoll.csv` ohne die
Zeilen `EINGRIFF` (version, szene, seed, eingabe_md5), dann die Kopfzeile
`frame,slot,typ,art,x,z,h,zst,lp,munition,liegezeit,inhalt,flugphase`,
dann je Frame eine Zeile je belegtem Slot, erst o20 bis o59, dann g0 bis
g4. `slot` als `o20` bzw. `g0`; Positionen wie im Protokoll; `typ` aus
Gegenstand, Behälter, Rakete, Waffe, Effekt; `art` die Gegenstands- oder
Behälterart; `inhalt` der Inhalt eines Behälters (`leer`, wenn ohne);
`flugphase` leer, `FLUG` oder `EXPLOSION`.

## Abweichungen und Lücken

Stellen, die die Spezifikation nicht oder widersprüchlich regelt, und ihre
Festlegung beim Codieren (Auftrag 3, Abschnitt 2.6). Je Eintrag: Stelle,
Festlegung, Grund, ob die Spezifikation anzupassen ist.

| Nr. | Stelle | Festlegung | Grund | Spezifikation anpassen |
|---|---|---|---|---|
| L1 | Kampf 11.2 | Prüfszene im Satzformat wie Welt 2.1 (Abschnitt „Formate“) | kein Dateiformat angegeben | ja |
| L2 | Kampf 11.2, Prüfbühne | Satz `stage` mit `kamera=fest` und `raender=aus` (Welt 2.2 Punkt 4 gilt dort nicht); Band x 0 bis 4000 | das Stage-Format kennt beides nicht | ja |
| L3 | Welt 2.3, 4.7, Welle 2 | zusätzlicher Satz `welle nr=2 ausloeser=kamera wert=250`; die Hockenden wachen weiter einzeln nach 4.2 | ohne Satz gäbe es kein `WL:2` und keinen Eintrag in der Spalte `wellen` | ja |
| L4 | Welt 2.3 | vorplatzierte Gegner `blick=links` | die Daten nennen keinen Blick | ja |
| L5 | Kampf 11.3, `sn_akt` | in Reaktionen der Reaktionsname, sonst die Körperaktion (STAND, GEHEN, ANGRIFF, NACHLAUF, WARTEN, AUFTRITT, SPOTT, ZIELEN, SCHUSS, SPRUNG, TAUMELN, STOSS, ANKUENDIGUNG) | außerhalb von Reaktionen nicht geregelt | ja |
| L6 | Welt 5.2, 11.4, `sn_modus` | zusätzliche Werte FREI (Reaktion vorbei, Entscheidung im nächsten W4) und PUPPE (Logik aus) | Übergang und Puppe nicht geregelt | ja |
| L7 | Kampf 6.5, 11.4 | Angriffscode `LN` für die Landung beim Neueinstieg | der Treffereintrag braucht einen Code | ja |
| L8 | Welt 9.1 („Protokoll vermerkt es“) | Ereignis `OV:Art`, wenn kein Objektslot frei ist | keine Kennung angegeben | ja |
| L9 | Kampf T9 Lauf c, Welt T9 („in f erscheint ein Gegner“) | Satz `gegner … erscheint=f`; angelegt in W1 vor den übrigen Eingriffen, mit Ziehung des Hauptgenerators; Kopf `# EINGRIFF erscheint …`; Ereignis `EI:sN.erscheint=Typ` | Form nicht angegeben | ja |
| L10 | Kampf 11.2, 11.3 | Prüfangriffe stehen im Kopf als `# EINGRIFF pruefangriff …` | 11.2 zählt sie zu den Eingriffen | nein, Klarstellung |
| L11 | Kampf 11.5 | `objekte.csv` bekommt den Kopf von `protokoll.csv` ohne EINGRIFF-Zeilen | Kopf nicht geregelt | ja |
| L12 | Kampf 11.3, Welt 11.4, Spaltenfolge | nach `s0_typ` bis `s19_blick` die Weltspalten, dann je Gegner `sn_recht` bis `sn_zufall`, dann `s0_lpfolge`, `s0_folge`, `ereignis` | Reihenfolge offen | ja |
| L13 | Kampf 11.3, Formate | Rechte und Anzeige als Slotnummer ohne „s“ (wie Welt-T4 `recht_r 1`); `f_mun` 0 ohne Waffe; `s0_lpfolge` und `s0_folge` auch ohne Boss in s0; `sn_timer` zählt einschließlich des laufenden Frames (1 im ersten) | nicht festgelegt | Klarstellung |
| L14 | Welt 2.2 Punkt 2 („endet an ihrer Kante“) | letzte ganzzahlige begehbare Lage des Weges, Nachkommaanteil 0; gibt es keine, steht die Achse; Ränder der Figur auf den genauen Festkommawert (passt zu Welt-T1: Wand bei 98) | mehrdeutig | ja |
| L15 | Welt 2.2 | der Rand eines Hindernisses zählt als innen | nicht geregelt | Klarstellung |
| L16 | Welt 2.1, `kamera_y` | vor dem ersten Satz gilt dessen y0 | nicht geregelt | Klarstellung |
| L17 | Welt 11.3, `welle.7=nur_boss` | die Bosskisten gelten als zerbrochen; ob ihr Inhalt liegt, entscheidet die Welt (K3) | offen | ja |
| L18 | Kampf 11.2, Gegner ohne `lp` | mit `vorplatziert=ja` Startwerte (leicht 16/5, schwer 30/6, Boss 100), sonst LP nach Rang; Standard `vorplatziert=nein`, Blick zur Figur | Standardwerte offen | Klarstellung |
| L19 | Kampf 11.2, Gegenstand aus der Szene | liegt von Beginn an: gelandet, aufnehmbar, Liegezeit 0 | nötig für T20 Lauf b | Klarstellung |
| L20 | Welt 11.3, KA7, `kamera.modus=ARENA` im Prüfstart | die Totzone gilt ab Frame 1 | KA7 sagt „ab dem nächsten Frame“ nach Erreichen von k0 | Klarstellung |
| L21 | Kampf 7, Zustand im Trefferframe | im Frame W bzw. t gilt noch Zustand 3, ab W+1 bzw. t+1 Zustand 2 (ein gehaltener Gegner bleibt 2) | Wortlaut „2 von W+1“ und T3 (Zustand 2 erst in 57) | ja |
| L22 | Kampf 5.7, 7: Gegner in der Luft getroffen | die Bahn beginnt in der aktuellen Höhe, Ruhe 9 Frames nach dem Bodenkontakt (wie P15) | nicht geregelt | ja |
| L23 | Kampf 7: Liegedauer des Zünders | wie der leichte Nahkämpfer: 32 Frames, nach einem Wurf 16 | nicht gemessen; einfachste Festlegung | ja |
| L24 | Kampf 5.4, 5.5: mehrere Instanzen, dasselbe Ziel, derselbe Frame | ein umgeworfener oder getöteter Gegner und ein zerbrochener Behälter sind für spätere Instanzen desselben Frames nicht mehr treffbar; für spätere Frames bleibt das Ziel offen | bildet die sofortige Anwendung im Vorbild nach | ja |
| L25 | Kampf 5.5, Welt 9.2: Behälter als Ziel | Gegnerinstanzen prüfen in Punkt 3 nach der Figur auch Behälter; Prüfangriff und Landung beim Neueinstieg zerbrechen keine | 11.2 und 6.5 nennen nur Figur bzw. Gegner | ja |
| L26 | Welt 4.1: aktives Fenster auf der Prüfbühne | gilt auch dort für die Treffbarkeit (alle Abnahmetests liegen darin) | nicht geregelt | Klarstellung |
| L27 | Kampf 11.2: Prüfangriff | beginnt nicht, wenn der Gegner im ersten Frame nicht in Zustand 1 ist, und beginnt danach nicht neu; ein eigener Angriff eines Gegners mit Logik geht vor | einfachste Festlegung | ja |
| L28 | Welt 5.9: „fordert in G das Recht an“ | die Reaktion endet in KS3 von G bzw. h+23; die Logik entscheidet ab W4 des nächsten Frames, das Recht kommt in G+1 (Bewegung ab G+1 und Kampfhaltung ab h+24 stimmen) | W4 liegt vor KS3 | ja |
| L29 | Kampf 3: letzter_angreifer | enthält den Urheber (beim geworfenen Gegner die Figur); Anzeige und Punkte zählen den Urheber | nicht geregelt | ja |
| L30 | Kampf 11.3: sn_ph | in UMGEWORFEN und TOT die Bahn (F1, F2, F3, F4, F4b), sonst leer | nicht geregelt | ja |
| L31 | Kampf 7: Treffer auf einen schon sterbenden Gegner | Wirkung W ohne Folgen (nur durch fremde Treffer im selben Frame möglich) | Schutzregel | nein |
| L32 | Welt 7.2, 7.3: Angriffsbeginn des Bosses | Ereignis AS, Schaden und nächster Abstand ab dem ersten Frame der Ankündigung; bei der Körperpresse ab dem Beginn der Hocke (A−15) | „15 Frames Hocke, dann A“ | ja |
| L33 | Welt 7.3: Armschwung im Protokoll | Ereignis AS:s0:ASk je Schwung, Instanzcode AS, sn_angriff AS1 bis AS3; der Schaden des ersten Schwungs gilt für alle | offen | ja |
| L34 | Welt 7.1: Gehen des Bosses | x und z getrennt: x mit 1,25 px/Frame bis 70 px Abstand, z mit 0,625 bis zur Tiefe der Figur; kein Zurückweichen | nur Tempo und Abstand genannt | ja |
| L35 | Welt 7.3: Auslauf des Ansturms | 4 px/Frame, je Frame 0,25 weniger: 30 px in 15 Frames | Spanne ohne Ziehung | ja |
| L36 | Welt 7.3: Lauf des Ansturms | 3,92 px/Frame nur in Frames mit Tiefenschritt; im Schutz der Figur läuft er weiter; der letzte Frame ist noch aktiv | offen | ja |
| L37 | Welt 7: Arenarand | alle Schritte des Bosses zwischen x 1792 und 2304 | nicht definiert | ja |
| L38 | Welt 7.3, Kampf 2.4: Flug der Körperpresse | z wie x mit ⌊dz·k/64⌋ (Kampf 2.4 nennt die Division nur für x); Höhe über Konstanten ohne Division | Verlauf offen | ja |
| L39 | Welt 7.3: Körperpresse | Nachlauf zählt ab dem letzten aktiven Frame, Modus NACHLAUF erst nach der Landung; in der Luft unterbricht kein Treffer ohne Umwerfen; ein umwerfender wirft aus der aktuellen Höhe um (wie P15) | nicht geregelt | ja |
| L40 | Welt 7.4, SA3/SA5: „eigener Angriff“ | nur ANKUENDIGUNG und ANGRIFF; im Nachlauf unterbricht ein Treffer; ein aufgeschobener Stoß beginnt nach den aktiven Frames | offen | ja |
| L41 | Welt 7.4, SA5: Stoß | Beginn S in W5; 3 px/Frame in S+1 bis S+16; BEREIT ab S+54; Zustand 2 bis S+61; kein Angriff bei Zustand ≠ 1; kein AS-Ereignis für RZ, sn_schaden 0; ein laufender Stoß startet nicht neu | offen | ja |
| L42 | Welt 11.3: boss.bewegung=aus | hält nur das Gehen an; Reaktionen, Stoß und Angriffsbewegungen laufen weiter | mehrdeutig | Klarstellung |
| L43 | Welt 7.1: Bahnen des Bosses | nach dem Bodenkontakt 2 px/Frame Auslauf (Ruhe bei 127,25 px), F2 mit demselben Auslauf, Explosion ohne Auslauf, Wurf F3 nach Kampf 5.7 | offen | ja |
| L44 | Welt 7.1: Taumeln | x-Verlauf wie F1, ab h+1 nicht treffbar, frei in h+78, Wirkung R | offen | ja |
| L45 | Welt 7.6: Slot des Bosses | bleibt nach dem Tod belegt (kein FR:s0) | wie im Vorbild | ja |
| L46 | Welt 11.4: s0_lpfolge | außerhalb einer Folge 0 | Gerüst | Klarstellung |
| L47 | Welt 7.6: Fall des Bosses | übrige LP werden auf −1 gesetzt (nicht um 1 gesenkt); auch vorgemerkte Wellen entfallen; Geschosse verschwinden ohne Ereignis | offen | ja |
| L48 | Welt 7.4: Griff und Super-Armor | Losreißen in W5 erkannt, SA5 im Frame danach; Kniestoß 1 und 2 im Griff ohne Reaktion | – | nein |
| L49 | Welt 11.3: fest-Schlüssel des Bosses | boss_angriff (AS, AN, KP), boss_abstand (170 bis 200), boss_liegen (42 bis 70), boss_frei_wurf (116 bis 144), boss_frei_explosion (132 bis 152) | Namen offen | ja |
| L50 | Welt 7.4, SA2: „anderer Treffer“ | jeder Treffer ohne Umwerfen außer SP, KN, WU, RX, LN, ST zählt vorläufig | Klarstellung | Klarstellung |
| L51 | Welt 7.2: Start des Bosses | ein schon wacher Boss ist ab Frame 1 bzw. ab seinem Erscheinen kampffähig; in PS7 erster Angriff in Frame 61 | nicht geregelt | Klarstellung |
| L52 | Welt 3, KA3/KA4/KA6 | Sperren und Halte links von K begrenzen nicht | sonst hielte H1 die Kamera in der Arena (PS7) | ja |
| L53 | Welt 3, KA4/KA5/KA6 | SR, HR und der Pfeil nur, wenn die Sperre bzw. der Halt die Kamera im Vorframe hielt (keine Meldung beim Durchfahren) | nicht geregelt | ja |
| L54 | Welt 3 KA4, 4.4, 11.3: abgeschaltete Welle | gilt als besiegt und löst in W7 nie aus; der Eingriff `welle.n jetzt` löst sie trotzdem samt neuen Gegnern aus | nicht geregelt | ja |
| L55 | Welt 3, KA13: Blende | BL:e in c+135; Phase und Modus BLENDE von c+1 bis c+134; nur ein Schnitt je Stage | nicht geregelt | ja |
| L56 | Welt 3, KA10: Bildschütteln | beginnt im Frame des Anlasses (Einschlag, Landung der Körperpresse) | nicht geregelt | ja |
| L57 | Welt 4.4: Auslöser | `figur_abstand` misst zu den wartenden Gegnern der Welle; nach dem Fall des Bosses löst keine Welle aus | nicht geregelt | ja |
| L58 | Welt 4.1, 4.5: Slots und LP | ist kein Slot frei, entsteht kein Gegner (ohne Ereignis); vorplatzierte mit werte=rang bekommen ihre LP beim Weckreiz | nicht geregelt | ja |
| L59 | Welt 5.5: Nachlauf und Sprungtritt | der feste Rückzug im Nachlauf bewegt nicht (Strecke fehlt); die aktive Pose verlängert sich nach einem Treffer auch beim Sprungtritt um 7 Frames (bis A+52) | Strecke nicht angegeben | ja |
| L60 | Welt 5.6, 5.8: Serie und Abwarten | die Abwartezeit zählt in jedem Zustand ab dem Serienende, das Recht wird erst danach angefordert; nach verbrauchtem Verfolgungsbudget keine neue Abwartezeit; die Wahl BUB oder BUA fällt am Ende des Nachlaufs von BA; Entscheidungen mit nur einer Möglichkeit ziehen nicht | nicht geregelt | ja |
| L61 | Welt 5.3, 5.8: Haltepunkt und Kanten | Haltepunkt erreicht, Tiefe außerhalb: nur in z weiter; „weniger als 1,75 px“ gilt je Achse; die nähere freie Kante ist der z-Rand des umschließenden Rechtecks, bei Gleichstand nach vorn | nicht geregelt | ja |
| L62 | Welt 5.2, 5.9: „Figur hinter ihm“, Recht nach dem Aufstehen | Blick des Vorframes; das Recht nach dem Aufstehen wird in G+1 angefordert (Gehen ab G+1 wie verlangt) | nicht geregelt | ja |
| L63 | Welt 5.7, E-10 | Halter gehen in ABWARTEN, laufende Angriffe enden ohne AA, ein Sprungtritt landet erst | nicht geregelt | ja |
| L64 | Welt 5.1: schnelles Gehen | kann wegen ⌊x⌋ schon bei 54 px anhalten (Vorbild 55 bis 56) | Rundung | nein, Hinweis |
| L65 | Welt 6: Zünder | „geht vom Zielpunkt weg“ heißt: zu seinem Zielpunkt, von der Figur weg (ZURUECK bei |dx| < 100); im Zielen bleibt der Blick vom Zielbeginn; Abbruch ohne AA; Zielrecht ohne Ereignis abgegeben; Kolbenhieb mit Nachlauf wie BA, Bildrand hinter ihm K bzw. K+383; der Bildrand hält die Rakete nicht auf, Einschlag als EX:on; Waffe beim Tod erscheint in t, landet in t+34, aufnehmbar und LA ab t+44; `fest.zielpunkt` = 128, 120h oder 120v | nicht geregelt | ja |
| L66 | Welt 8: rang.fest | hält den Rang auch beim Tod | nicht geregelt | ja |
| L67 | Welt 9.2, 9.3, 11.3: Behälter und Gegenstände | ein zerbrochener Behälter verschwindet in W8 von h+1, sein Inhalt kommt in den kleinsten freien Slot; bei `nur_boss` erscheint der Kisteninhalt in Frame 1 (zu L17); Treffer auf Bosskiste oder zerbrochenen Behälter: Wirkung W; Behälter melden beim Scrollen EN:on:S; Gegenstände aus der Prüfszene zählen ihre Liegezeit ab L = 1 | nicht geregelt | ja |
| L68 | Welt 10.2, 10.3: Steuerung, Game Over, Punkte | steuerung 0 von t+1 bis LN+5; GAME OVER beginnt in N des letzten Todes (GO statt NE:F), die Scheibe endet in N+239, den Neustart mit Seed + 1 macht die Darstellung; Punkte für besiegte Gegner bei LP < 0 ≤ lp_vor, auch durch einen Eingriff, eine Puppe nach ihrer Rolle | nicht geregelt | ja |
| L69 | Kampf 12, T16 Lauf a | Eingabe A 23, 39, 41, 59 statt A 23, 40, 41, 59: In einer Eingabedatei sind 40 und 41 ein gehaltener Druck, 41 wäre nach 2.1 kein neuer Druck | Widerspruch zu Kampf 2.1 | ja |
| L70 | Kampf 4.3: LEERSCHLAG | Wechsel in P+6 (erster Frame nach den aktiven Frames ohne Treffer); uhr läuft weiter, f_ph 1 und kombo 1 bis zum Ende | nicht geregelt | Klarstellung |
| L71 | Kampf P29: Ausfallschritt ohne Treffer | Nachlauf wie Leerschlag der Stufe ab D, Drücke frühestens nach dem letzten aktiven Frame; Stufe 4 behält das zweite Fenster D+17 bis D+20 | P29 regelt nur den Fall mit Treffer | ja |
| L72 | Kampf 5.6: Schritt weg | KE:F:k wird geschrieben, f_ph und kombo zeigen Stufe k, es gibt kein Kombofenster | offen | Klarstellung |
| L73 | Kampf 5.3: Treffer einer Instanz in verschiedenen Frames | je Frame mit Treffern 7 Stoppframes; Pose und Kombofenster zählen ab dem letzten Treffer | nur „im selben Frame“ geregelt | Klarstellung |
| L74 | Kampf 4.2 im Nachlauf (Kettenpose, Leerschlag, Kniestoß nach dem dritten) | kein Spezialangriff, kein Aufnehmen, kein Sprint; A und S geben den Schlag bzw. die nächste Stufe; im Griff geben A und S bei 0 LP Kniestoß bzw. Wurf | 9.1, 9.4, 10.1 regeln den Nachlauf nicht | Klarstellung |
| L75 | Kampf 5.3: Stoppframes | keine Eingabe; Schutz, Griffsperre und Kosten zählen weiter | offen | Klarstellung |
| L76 | Kampf P28: Fall nach dem Neueinstieg | 5 px je Frame (256, …, 1 in N+52, 0 in LN) | frei für die Darstellung | nein |
| L77 | Kampf 6.5: Tod durch Eingriff | Flug F4 entgegen dem Blick | kein Angreifer | Klarstellung |
| L78 | Kampf 11.4: K:F:Betrag | der tatsächlich abgezogene Betrag (unter 9 LP weniger als 9) | offen | Klarstellung |
| L79 | Kampf 11.4: SP:F:n | n = Sprintframe beim Beginn, also immer 1 | n nicht definiert | ja |
| L80 | Kampf 11.4, 8.3: L:sn und Griffsperre | L:sn auch beim Loslassen durch Sprung und beim Ende durch Treffer (P16); Griffsperre nur nach Losreißen und P16, nicht nach dem Sprung | offen | ja |
| L81 | Kampf 8.1: Griffsperre | zählt wie der Schutz: 30 im Frame des Losreißens r, neuer Griff ab r+30 | „30 Frames nach“ mehrdeutig | Klarstellung |
| L82 | Kampf P19: Haltelage | mit dem genauen Festkommawert x + 19·Blick, nicht ⌊x⌋ + 19 | offen | Klarstellung |
| L83 | Kampf 10.3: Rakete der Figur | steht im Abschussframe; schlägt an der letzten freien Lage ein, wenn der nächste Schritt das Band verlässt, in einen unzerbrochenen Behälter führt (unabhängig von der Flughöhe) oder, wo Bildränder gelten, außerhalb 0 ≤ x − K ≤ 383 läge; die Höhe sinkt höchstens bis 0 | „früher an Wänden …“ offen | ja |
| L84 | Kampf 10.3, 10.4: leere Waffe und Tausch | leere Waffe als Objekt `Waffe` mit Lebensdauer 61, Ereignis WA:F:Raketenwerfer:0; beim Tausch wird erst der aufgenommene Slot frei, dann fällt die alte Waffe; AU vor WA | offen | Klarstellung |
| L85 | Kampf 10.2: Heilwerte mit „oder“ | Eisnudelschale +55, Sternbeeren +16 (jeweils der erste Wert; beide nicht in der Scheibe) | „oder“ | ja |
| L86 | Kampf 11.3: f_ph | SCHLAG und LEERSCHLAG die Stufe; KNIESTOSS die Nummer 1 bis 3; UMGEWORFEN F im Flug, B ab dem Bodenkontakt; TOT F, B, ab der Ruhe R; sonst leer | Zeitpunkte nicht genannt | ja |
| L87 | Kampf 9.1: Doppeltipp | eine Richtung nur in der Tiefe unterbricht die Pause und macht den vorigen Tipp ungültig; ein direkter Wechsel der Richtungsmenge gilt als Pause 0 | offen | Klarstellung |
| L88 | Kampf 9.3: Rutschtempo | das tatsächliche x-Tempo des Sprintframes A (diagonal 0,75·v) | offen | Klarstellung |
| L89 | Kampf 9.2: Sprint nur in der Tiefe | gibt es nach P22 nicht; die Spalte „Tiefe gerade“ bleibt ungenutzt | Tabelle nennt sie | ja |
| L90 | Kampf 6.5: letztes Leben | LP 72 in N nur, wenn noch ein Leben bleibt; Erscheinen in N+1 nur dann und nicht bei GAMEOVER | offen | Klarstellung |
| L91 | Kampf 8.3: Kniestoß, der den Gehaltenen tötet | endet wie der dritte: STAND ab K+23, Drücke ab K+18 | notes.md „offen“ | ja |
| L92 | Kampf 4.3: Sprungangriff hoch nach A+29 | SPRUNG (Fallpose), uhr beginnt neu, kein weiterer Angriff bis zur Landung | offen | Klarstellung |
