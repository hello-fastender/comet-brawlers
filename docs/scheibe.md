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
