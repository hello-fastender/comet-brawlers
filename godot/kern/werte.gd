# Alle Zahlen der Scheibe als benannte Konstanten (Port von spiel/src/kern/werte.ts).
# Festkommawerte (ausDezimal, ausBruch) sind hier einmal ausgerechnet und als
# Rohwert 16.16 eingetragen; der Aufruf steht als Kommentar dahinter.
# Erzeugt aus werte.ts; Quellkommentare unverändert übernommen.
class_name KernWerte
extends RefCounted

# Alle Zahlen der Scheibe als benannte Konstanten (Auftrag 3, 2.3: keine
# nackten Zahlen). Je Konstante der Rohwert (Festkomma als Fest, sonst ganze
# Zahl) und ein Kommentar mit der Quelle.
#
# Quellenkürzel:
#   mechanik „…“  = docs/mechanik.md, Abschnitt „…“
#   Kampf n       = docs/spezifikation-kampf.md, Abschnitt n
#   Welt n        = docs/spezifikation-welt.md, Abschnitt n
#   Pn, Kn, En    = Platzhalter, Messung bzw. Entscheidung (siehe Kampf 13)
#
# Frame-Angaben sind Abstände zum Bezugsframe der Spezifikation (P, D, J, A,
# h, H, W, E, K, g, t, N, LN …), wie im Konstantennamen oder Kommentar
# genannt. „uhr n“ heißt Aktionsuhr n (Kampf 4.1, 5.3).
#
# Stufe 2 (K1 bis K4) ergänzt diese Datei nur durch Anhängen am Ende, je
# Konstante mit Quellkommentar.

# ===========================================================================
# Zeit, Raum, Darstellung (Kampf 2)
# ===========================================================================

## Logikschritte je Sekunde (Kampf 2.1, E6, E13).
const LOGIKSCHRITTE_JE_SEKUNDE = 60
## Höchstens so viele Logikschritte je dargestelltem Bild (Kampf 2.1, E13).
const MAX_SCHRITTE_JE_BILD = 4
## Breite des logischen Bildes in px (Kampf 2.3; mechanik „Konventionen“).
const BILD_BREITE = 384
## Höhe des logischen Bildes in px (Kampf 2.3; mechanik „Konventionen“).
const BILD_HOEHE = 224
## Bildschirm-y = 234 − (⌊z⌋ − Kamera-y) − ⌊h⌋ (Kampf 2.5).
const BILDSCHIRM_Y_BASIS = 234
## Größter Betrag einer Koordinate in px (Kampf 2.4: ±32767 px).
const KOORDINATE_MAX = 32767
## Erster Logikschritt nach dem Laden (Kampf 2.1).
const ERSTER_FRAME = 1

# ===========================================================================
# Slots (Kampf 3; Welt 4.1, 9.1)
# ===========================================================================

## Gegnerslots s0 bis s19 (Kampf 3).
const GEGNER_SLOTS = 20
## s0 ist dem Boss vorbehalten (Welt 4.1).
const BOSS_SLOT = 0
## Kleinster Slot für übrige Gegner (Welt 4.1).
const ERSTER_GEGNERSLOT = 1
## Erster Objektslot o20 (Kampf 3).
const OBJEKT_SLOT_ERSTER = 20
## Letzter Objektslot o59 (Kampf 3).
const OBJEKT_SLOT_LETZTER = 59
## Anzahl der Objektslots o20 bis o59 (Kampf 3).
const OBJEKT_SLOTS = OBJEKT_SLOT_LETZTER - OBJEKT_SLOT_ERSTER + 1
## Geschosse der Figur g0 bis g4 (Kampf 3).
const GESCHOSS_SLOTS = 5

# ===========================================================================
# Zufall (Welt 11.1)
# ===========================================================================

## Xorshift32: Verschiebung 13 nach links (Welt 11.1).
const XORSHIFT_LINKS_1 = 13
## Xorshift32: Verschiebung 17 nach rechts (Welt 11.1).
const XORSHIFT_RECHTS = 17
## Xorshift32: Verschiebung 5 nach links (Welt 11.1).
const XORSHIFT_LINKS_2 = 5
## Ersatz, wenn eine Ziehung als Startwert 0 ergäbe (Welt 11.1: 0 wird zu 1).
const ZUFALL_ERSATZ_NULL = 1
## Anteile in Prozent werden als Ziehung aus 100 umgesetzt (Welt 11.1).
const ZUFALL_PROZENT = 100
## Seed der Abnahmetests Kampf 12 (Kampf 12, Standard).
const SEED_KAMPF_TESTS = 1
## Seed der Abnahmetests Welt 12 (Welt 12).
const SEED_WELT_TESTS = 12345

# ===========================================================================
# Figur: Lebenspunkte (Kampf 6.1; mechanik „Lebenspunkte“)
# ===========================================================================

## LP der Figur (Kampf 6.1).
const FIGUR_LP = 72

# ===========================================================================
# Figur: Bewegung (mechanik „Bewegung“; Kampf 4.3 LAUF)
# ===========================================================================

## Laufen in x, px/Frame (mechanik „Bewegung“). Rohwert 114688.
const LAUF_X: int = 114688  # ausDezimal(1.75)
## Laufen in der Tiefe, px/Frame (mechanik „Bewegung“).
const LAUF_Z: int = 65536  # ausDezimal(1.0)
## Laufen diagonal, x-Anteil (mechanik „Bewegung“).
const LAUF_DIAGONAL_X: int = 81920  # ausDezimal(1.25)
## Laufen diagonal, Tiefenanteil (mechanik „Bewegung“).
const LAUF_DIAGONAL_Z: int = 49152  # ausDezimal(0.75)

# ===========================================================================
# Figur: Sprung (mechanik „Sprung“; Kampf 4.3 SPRUNG, LANDUNG; 4.4)
# ===========================================================================

## Steiggeschwindigkeit beim Absprung, px/Frame (Kampf 4.4). Rohwert 323584.
const SPRUNG_VH_START: int = 323584  # ausDezimal(4.9375)
## Schwerkraft im Sprung, px/Frame² (Kampf 4.4).
const SPRUNG_SCHWERKRAFT: int = 16384  # ausDezimal(0.25)
## x je Luftframe bei Sprung mit Richtung, px/Frame (Kampf 4.4).
const SPRUNG_X: int = 147456  # ausDezimal(2.25)
## Tiefe je Luftframe mit O oder U, px/Frame (Kampf 4.4).
const SPRUNG_Z: int = 32768  # ausDezimal(0.5)
## Aktion SPRUNG ab J+1 (Kampf 4.3).
const SPRUNG_AKTION_AB = 1
## Absprung in J+2, erster Luftframe (Kampf 4.3, 4.4).
const SPRUNG_ABSPRUNG = 2
## Scheitel in J+21 (Kampf 4.4).
const SPRUNG_SCHEITEL_FRAME = 21
## Scheitelhöhe, px (Kampf 4.4).
const SPRUNG_SCHEITEL_HOEHE: int = 3358720  # ausDezimal(51.25)
## Letzter Luftframe J+41, Höhe 2,5 (Kampf 4.4).
const SPRUNG_LETZTER_LUFTFRAME = 41
## Aufsetzen in J+42 (Kampf 4.3, 4.4).
const SPRUNG_AUFSETZEN = 42
## Weite eines Sprungs mit Richtung, px (Kampf 4.4).
const SPRUNG_WEITE: int = 6045696  # ausDezimal(92.25)
## Landung dauert 6 Frames (J+42 bis J+47, Kampf 4.3).
const LANDUNG_DAUER = 6
## STAND und Drücke ab J+48 (Kampf 4.3).
const SPRUNG_FREI_AB = 48
## A und S neu in Landeframe 1 bis 5 geben einen neuen Sprung (Kampf 4.3, P2).
const LANDUNG_NEUSPRUNG_BIS = 5
## Sprungangriff: A neu in J+1 bis J+41 (Kampf 4.3).
const SPRUNGANGRIFF_DRUCK_VON = 1
const SPRUNGANGRIFF_DRUCK_BIS = 41
## Angriff ab A = J+38 bleibt ohne aktiven Frame (Kampf 5.2).
const SPRUNGANGRIFF_OHNE_WIRKUNG_AB = 38
## Sprungangriff: Höhe steht in A+1 einen Frame still (Kampf 4.3, 4.4).
const SPRUNGANGRIFF_HOEHENPAUSE = 1

# ===========================================================================
# Figur: Kette (mechanik „Angriff (Standardschlag, Kette)“; Kampf 4.3, 5.2, 5.6)
# Tabellen je Stufe: Index 0 = Stufe 1 … Index 3 = Stufe 4.
# ===========================================================================

## Höchste Kombostufe (Kampf 4.1).
const KOMBO_MAX = 4
## Schaden je Stufe (Kampf 5.2).
const KETTE_SCHADEN: Array[int] = [3, 4, 5, 10]
## Reichweite vorn je Stufe, px (Kampf 5.2).
const KETTE_VORN: Array[int] = [85, 87, 91, 100]
## Reichweite hinten je Stufe, Ziel schaut zur Figur, px (Kampf 5.2, K8).
const KETTE_HINTEN: Array[int] = [28, 26, 26, 25]
## Reichweite hinten je Stufe, Ziel schaut weg, px (Kampf 5.2, K8).
const KETTE_HINTEN_WEG: Array[int] = [4, 2, 2, 1]
## Tiefe aller Stufen, |dz| ≤ 12 trifft (Kampf 5.2, E9).
const KETTE_TIEFE = 12
## Erster aktiver Frame je Stufe als Aktionsuhr (P+2, D+3, D+4, D+3; Kampf 4.3, 5.2).
const KETTE_AKTIV_VON: Array[int] = [2, 3, 4, 3]
## Letzter aktiver Frame je Stufe als Aktionsuhr (P+5, D+6, D+7, D+6; Kampf 4.3, 5.2).
const KETTE_AKTIV_BIS: Array[int] = [5, 6, 7, 6]
## Stufe 4 ohne Treffer: erneut aktiv uhr 17 bis 20 (D+17 bis D+20; Kampf 4.3, 5.2).
const KETTE4_ZWEITES_FENSTER_VON = 17
const KETTE4_ZWEITES_FENSTER_BIS = 20
## Stufe 4: Aktion uhr 1 bis 25, nicht abbrechbar (Kampf 4.3, K3).
const KETTE4_DAUER = 25
## Kombofenster je Folgestufe ab h der Vorstufe: Stufe 2 h+12 bis h+27, Stufe 3 und 4 h+11 bis h+26 (Kampf 5.6). Index = Folgestufe − 1.
const KOMBO_FENSTER_VON: Array[int] = [0, 12, 11, 11]
const KOMBO_FENSTER_BIS: Array[int] = [0, 27, 26, 26]
## Länge des Kombofensters (Kampf 5.6).
const KOMBO_FENSTER_LAENGE = 16
## Stufe 1 mit Treffer: Pose bis h+27, STAND ab h+28 (Kampf 4.3).
const KETTE1_STAND_AB = 28
## Stufe 1 mit Treffer: A und S ab h+12 (Kampf 4.3).
const KETTE1_DRUECKE_AB = 12
## Stufe 1 mit Treffer: Richtung L/R ab h+13, Bewegung ab h+14 (Kampf 4.3).
const KETTE1_RICHTUNG_AB = 13
## Stufe 1 mit Treffer: Bewegung nur in der Tiefe ab h+29 (Kampf 4.3, P31).
const KETTE1_TIEFE_BEWEGUNG_AB = 29
## Stufe 2, 3 mit Treffer: STAND ab h+27 (Kampf 4.3, K1, K2).
const KETTE23_STAND_AB = 27
## Stufe 2, 3 mit Treffer: A und S ab h+11 (Kampf 4.3).
const KETTE23_DRUECKE_AB = 11
## Stufe 2, 3 mit Treffer: Richtung L/R ab h+12, Bewegung ab h+13 (Kampf 4.3).
const KETTE23_RICHTUNG_AB = 12
## Stufe 2, 3 mit Treffer: Bewegung nur in der Tiefe ab h+28 (Kampf 4.3).
const KETTE23_TIEFE_BEWEGUNG_AB = 28
## LEERSCHLAG: Aktion P+1 bis P+16, STAND ab P+17 (Kampf 4.3).
const LEERSCHLAG_DAUER = 16
## LEERSCHLAG: A und S ab P+7 (Kampf 4.3).
const LEERSCHLAG_DRUECKE_AB = 7
## LEERSCHLAG: Richtung ab P+8 (Kampf 4.3).
const LEERSCHLAG_RICHTUNG_AB = 8
## Stufe 2 ohne Treffer: Aktion D+1 bis D+16 (Kampf 4.3, K1).
const KETTE2_LEER_DAUER = 16
## Stufe 2 ohne Treffer: A und S ab D+7, Richtung ab D+8 (Kampf 4.3, K1).
const KETTE2_LEER_DRUECKE_AB = 7
const KETTE2_LEER_RICHTUNG_AB = 8
## Stufe 3 ohne Treffer: Aktion D+1 bis D+17 (Kampf 4.3, K2).
const KETTE3_LEER_DAUER = 17
## Stufe 3 ohne Treffer: A und S ab D+8, Richtung ab D+9 (Kampf 4.3, K2).
const KETTE3_LEER_DRUECKE_AB = 8
const KETTE3_LEER_RICHTUNG_AB = 9
## Ausfallschritt beim Kettendruck mit Blickrichtung: px in D+1 bis D+4 (Kampf 5.6, K10).
const AUSFALLSCHRITT: Array[int] = [8, 6, 4, 2]
## Ausfallschritt: aktiv D+9 bis D+12 (Stufe 2 und 4), D+8 bis D+11 (Stufe 3); Index = Stufe − 1 (Kampf 5.6).
const AUSFALL_AKTIV_VON: Array[int] = [0, 9, 8, 9]
const AUSFALL_AKTIV_BIS: Array[int] = [0, 12, 11, 12]

# ===========================================================================
# Trefferstopp (Kampf 5.3; mechanik „Angriff“)
# ===========================================================================

## Stoppframes nach einem wirksamen Treffer (Kampf 5.3).
const TREFFERSTOPP = 7

# ===========================================================================
# Figur: Sprungangriff (mechanik „Sprungangriff“; Kampf 5.2)
# ===========================================================================

## Werte je Variante des Sprungangriffs (Kampf 5.2). aktiv als Abstand zu A.
## neutral (SN)
## Richtung (SR)
## hoch (SH, K4)
## runter (ST, K5)
const SPRUNGANGRIFF = {
  "N": { "code": "SN", "aktiv_von": 5, "aktiv_bis": 28, "vorn": 76, "hinten": 27, "tiefe": 12, "hoehe_max": 45, "schaden": 7, "umwerfen": true },
  "R": { "code": "SR", "aktiv_von": 5, "aktiv_bis": 28, "vorn": 99, "hinten": 24, "tiefe": 12, "hoehe_max": 41, "schaden": 7, "umwerfen": true },
  "H": { "code": "SH", "aktiv_von": 7, "aktiv_bis": 10, "vorn": 85, "hinten": 32, "tiefe": 12, "hoehe_max": 48, "schaden": 12, "umwerfen": true },
  "T": { "code": "ST", "aktiv_von": 9, "aktiv_bis": 32, "vorn": 42, "hinten": 41, "tiefe": 12, "hoehe_max": 41, "schaden": 4, "umwerfen": false },
}
## Sprungangriff hoch: Aktion bis A+29, mit Treffer A+36, danach Fallpose (Kampf 4.3).
const SPRUNGANGRIFF_HOCH_AKTION_BIS = 29

# ===========================================================================
# Figur: Sprint (mechanik „Sprint“; Kampf 9.1 bis 9.3)
# ===========================================================================

## Doppeltipp: erster Tipp 1 bis 10 Frames (Kampf 9.1).
const SPRINT_TIPP_MAX = 10
## Doppeltipp: Pause 1 bis 10 Frames ohne Richtung (Kampf 9.1).
const SPRINT_PAUSE_MAX = 10
## Höchstens 90 Sprintframes (Kampf 9.2).
const SPRINT_MAX_FRAMES = 90
## Sprintframe 1: x wie Gehen (Kampf 9.2).
const SPRINT_X_FRAME1: int = 114688  # ausDezimal(1.75)
## Sprintframe 1: Tiefe (Kampf 9.2).
const SPRINT_Z_FRAME1: int = 65536  # ausDezimal(1.0)
## Sprintframe 1 diagonal: x (Kampf 9.2).
const SPRINT_DIAGONAL_X_FRAME1: int = 81920  # ausDezimal(1.25)
## Sprintframe 1 diagonal: Tiefe (Kampf 9.2).
const SPRINT_DIAGONAL_Z_FRAME1: int = 49152  # ausDezimal(0.75)
## v(n) = 3,875 − 0,125 · ⌊(n − 1)/6⌋ ab Sprintframe 2 (Kampf 9.2).
const SPRINT_V_START: int = 253952  # ausDezimal(3.875)
const SPRINT_V_STUFE: int = 8192  # ausDezimal(0.125)
## Teiler der Tempostufe ⌊(n − 1)/6⌋ (Kampf 9.2).
const SPRINT_STUFE_FRAMES = 6
## Tiefe gerade: 0,625 · v(n) (Kampf 9.2).
const SPRINT_FAKTOR_Z: int = 40960  # ausDezimal(0.625)
## Diagonal x: 0,75 · v(n) (Kampf 9.2, P23).
const SPRINT_FAKTOR_DIAGONAL_X: int = 49152  # ausDezimal(0.75)
## Diagonal Tiefe: 29/64 · v(n) (Kampf 9.2).
const SPRINT_FAKTOR_DIAGONAL_Z: int = 29696  # ausBruch(29, 64)
## Weg in 90 Sprintframes, px (Kampf 9.2).
const SPRINT_WEG_90: int = 17555456  # ausDezimal(267.875)
## Sprintangriff (SA): Werte (Kampf 5.2, 9.3). aktiv als Abstand zu A.
const SPRINTANGRIFF = { "code": "SA", "aktiv_von": 5, "aktiv_bis": 14, "vorn": 105, "hinten": 26, "tiefe": 12, "schaden": 9, "umwerfen": true }
## Sprintangriff: Aktion A+1 bis A+35 (Kampf 4.3).
const SPRINTANGRIFF_DAUER = 35
## Sprintangriff: Rutschen ab A+2 (Kampf 9.3).
const SPRINTANGRIFF_RUTSCHEN_AB = 2
## Sprintangriff: Rutschtempo nimmt je Frame um 0,15625 ab (Kampf 9.3, P24). Rohwert 10240.
const SPRINTANGRIFF_RUTSCH_ABNAHME: int = 10240  # ausDezimal(0.15625)
## Sprint-Sprungangriff (SS): Werte (Kampf 5.2, 9.3, P7, E15). hinten −38 heißt: erst ab 38 px vor der Figur.
const SPRINT_SPRUNGANGRIFF = { "code": "SS", "vorn": 147, "hinten": -38, "tiefe": 12, "schaden": 13, "umwerfen": true }
## SS: aktiv in A+13 bei Figurhöhe ≤ 16 (Kampf 9.3).
const SS_ERSTER_AKTIV = 13
const SS_ERSTER_HOEHE_MAX = 16
## SS: aktiv A+20 bis A+39 bei Figurhöhe ≤ 20, echte Frames ab A (Kampf 9.3).
const SS_ZWEITER_AKTIV_VON = 20
const SS_ZWEITER_AKTIV_BIS = 39
const SS_ZWEITER_HOEHE_MAX = 20

# ===========================================================================
# Figur: Spezialangriff (mechanik „Spezialangriff“; Kampf 6.4, 9.4)
# ===========================================================================

## Aktion P+1 bis P+50 ohne Treffer (Kampf 9.4).
const SPEZIAL_DAUER = 50
## Erste Aktionsuhr der Flächenstufen 1 bis 6 (Kampf 9.4).
const SPEZIAL_STUFE_VON: Array[int] = [8, 14, 20, 26, 32, 38]
## Dauer einer Flächenstufe in Frames (Kampf 9.4).
const SPEZIAL_STUFE_DAUER = 6
## Letzte aktive Aktionsuhr (P+43, Kampf 5.2, 9.4).
const SPEZIAL_AKTIV_BIS = 43
## vorn bis je Stufe, px (Kampf 9.4).
const SPEZIAL_VORN: Array[int] = [43, 59, 75, 91, 107, 123]
## hinten bis je Stufe, px (Kampf 9.4).
const SPEZIAL_HINTEN: Array[int] = [42, 58, 74, 90, 106, 122]
## Tiefe aller Stufen (Kampf 9.4).
const SPEZIAL_TIEFE = 28
## Schaden je Ziel (Kampf 5.2, 9.4).
const SPEZIAL_SCHADEN = 6
## Kosten bei mindestens einem Treffer (Kampf 6.4).
const SPEZIAL_KOSTEN = 9
## Kosten werden in h+8 abgezogen, echte Frames (Kampf 6.4).
const SPEZIAL_KOSTEN_NACH = 8
## Schutz-Timer nach dem Spezialangriff (Kampf 6.3).
const SPEZIAL_SCHUTZ_DANACH = 20
## Auslösung in GETROFFEN ab Druckframe H+8 (Kampf 9.4).
const SPEZIAL_AUS_GETROFFEN_AB = 8
## Aus dem Griff: Kosten in E+16, Drücke ab E+58 (Kampf 9.4).
const SPEZIAL_GRIFF_KOSTEN_FRAME = 16
const SPEZIAL_GRIFF_DRUECKE_AB = 58

# ===========================================================================
# Figur: Griff, Kniestoß, Wurf, geworfener Gegner (mechanik „Griff und Wurf“; Kampf 8)
# ===========================================================================

## Griff: |dz| ≤ 10 (Kampf 8.1).
const GRIFF_TIEFE = 10
## Griff: Gegner vor der Figur, schaut sie an: d_vorn 0 bis 39 (Kampf 8.1, E14).
const GRIFF_VORN_ANSCHAUEN = 39
## Griff: Gegner vor der Figur, schaut weg: d_vorn 0 bis 14 (Kampf 8.1).
const GRIFF_VORN_WEG = 14
## Griff: Gegner hinter der Figur, schaut sie an: d_vorn −24 bis −1 (Kampf 8.1, E14).
const GRIFF_HINTEN = 24
## Kein neuer Griff 30 Frames nach einem Losreißen (Kampf 8.1).
const GRIFFSPERRE = 30
## Haltefrist: Losreißen in g+61 bzw. K+61 (Kampf 8.3, P21).
const HALTEFRIST = 60
## Haltelage 19 px vor der Figur in ihrer Tiefe (Kampf 8.1, P19).
const HALTELAGE = 19
## Kniestoß: Schaden (Kampf 5.2, 8.3).
const KNIESTOSS_SCHADEN = 4
## Kniestoß: Treffer in K+5 (Kampf 8.3).
const KNIESTOSS_TREFFER = 5
## Kniestoß: nächster Druck ab K+18 (Kampf 8.2, 8.3).
const KNIESTOSS_DRUECKE_AB = 18
## Kniestoß: gehalten ab K+23 (Kampf 4.3, 8.3).
const KNIESTOSS_GEHALTEN_AB = 23
## Der dritte Kniestoß wirft um (Kampf 8.3).
const KNIESTOSS_UMWERFEN_NR = 3
## Wurf: Schaden in E+1 (Kampf 8.4).
const WURF_SCHADEN = 14
## Wurf: Figur gebunden E+1 bis E+37 (Kampf 8.4).
const WURF_GEBUNDEN_BIS = 37
## Wurf: STAND ab E+38 (Kampf 4.3).
const WURF_FREI_AB = 38
## Wurf: Gegner in der Haltelage E+1 bis E+21 (Kampf 8.4).
const WURF_TRAGEN_BIS = 21
## Wurf: losgelassen in E+22 (Kampf 8.4).
const WURF_LOSLASSEN = 22
## Wurf: Loslasshöhe 59 px (Kampf 8.4, P19).
const WURF_LOSLASS_HOEHE = 59
## Wurf: losgelassen 13 px vor bzw. hinter der Figur (Kampf 8.4, P19).
const WURF_LOSLASS_X = 13
## Geworfener Gegner (WG): Instanz E+1 bis E+58 (Kampf 8.5).
const WG_BIS = 58
## WG: |dx| ≤ 52 um den Geworfenen (Kampf 8.5, P8).
const WG_HALBBREITE = 52
## WG: |dz| ≤ 17 (Kampf 8.5).
const WG_TIEFE = 17
## WG: Schaden (Kampf 8.5).
const WG_SCHADEN = 3

# ===========================================================================
# Flugbahnen (Kampf 5.7; mechanik „Trefferreaktion der Gegner“, „Umgeworfen werden“, „Griff und Wurf“)
# ===========================================================================

## F1 Umwerfen: Stillstand W+1 bis W+8 (Kampf 5.7).
const F1_STILLSTAND = 8
## F1: vx (Kampf 5.7). Rohwert 188416.
const F1_VX: int = 188416  # ausDezimal(2.875)
## F1: ax (Kampf 5.7).
const F1_AX: int = 0
## F1: vh beim ersten Bahnframe (Kampf 5.7).
const F1_VH: int = 327680  # ausDezimal(5.0)
## F1: Schwerkraft 70/256 (Kampf 5.7). Rohwert 17920.
const F1_GH: int = 17920  # ausBruch(70, 256)
## F1: Bodenkontakt W+46, Ruhe W+55 (Kampf 5.7).
const F1_BODEN = 46
const F1_RUHE = 55
## F1: Weg bis zum Bodenkontakt bzw. zur Ruhe, px (Kampf 5.7).
const F1_WEG_BODEN: int = 7159808  # ausDezimal(109.25)
const F1_WEG_RUHE: int = 8855552  # ausDezimal(135.125)
## F2 dritter Kniestoß: Stillstand und Start in 16 px Höhe (Kampf 5.7).
const F2_START_HOEHE: int = 1048576  # ausDezimal(16)
## F2: Bodenkontakt W+49, Ruhe W+58 (Kampf 5.7).
const F2_BODEN = 49
const F2_RUHE = 58
## F3 Wurf: vx, ax (Kampf 5.7).
const F3_VX: int = 327680  # ausDezimal(5.0)
const F3_AX: int = 4096  # ausBruch(1, 16)
## F3: vh, gh (Kampf 5.7). Rohwert gh 13312.
const F3_VH: int = 131072  # ausDezimal(2.0)
const F3_GH: int = 13312  # ausBruch(13, 64)
## F3: erster Bahnframe E+23, Bodenkontakt E+59, Ruhe E+71 (Kampf 5.7).
const F3_ERSTER = 23
const F3_BODEN = 59
const F3_RUHE = 71
## F4 Tod: Stillstand t+1, t+2, erster Bahnframe t+3 (Kampf 5.7).
const F4_STILLSTAND = 2
## F4: Bodenkontakt t+40, Ruhe t+49 (Kampf 5.7).
const F4_BODEN = 40
const F4_RUHE = 49
## F4b Tod durch Stufe 2: ab t+41 Rollen 2,0 je Frame bis t+72 (Kampf 5.7).
const F4B_ROLLEN: int = 131072  # ausDezimal(2.0)
const F4B_ROLLEN_BIS = 72
## Geworfene Gegner bleiben höchstens 96 px außerhalb des Bildes (Kampf 5.7).
const WURF_AUSSERHALB_MAX = 96

# ===========================================================================
# Trefferreaktion der Gegner (Kampf 7; mechanik „Trefferreaktion der Gegner“)
# ===========================================================================

## Reaktion ohne Umwerfen: Zustand 3 von h bis h+22, frei ab h+23 (Kampf 7, E3).
const REAKTION_DAUER = 23
## Stillstand h+1 bis h+8 (Kampf 7).
const REAKTION_STILLSTAND = 8
## Zittern h+9 bis h+14 nur als Darstellung, px (Kampf 7).
const REAKTION_ZITTERN_AB = 9
const REAKTION_ZITTERN: Array[int] = [3, -3, 2, -2, 1, -1]
## Animationswechsel h+1, h+10, h+22 (Kampf 7).
const REAKTION_ANIMATION: Array[int] = [1, 10, 22]
## Liegen leichter Nahkämpfer ab der Ruhe (Kampf 7).
const LIEGEN_LEICHT = 32
## Liegen leichter Nahkämpfer nach einem Wurf (Kampf 7).
const LIEGEN_LEICHT_WURF = 16
## Liegen schwerer Nahkämpfer: 16 bis 44 in Vielfachen von 4, gleichverteilt (Kampf 7, P18).
const LIEGEN_SCHWER_VON = 16
const LIEGEN_SCHWER_BIS = 44
const LIEGEN_SCHWER_SCHRITT = 4
## Aufstehen 18 Frames (Kampf 7).
const AUFSTEHEN_GEGNER = 18
## Leichter Nahkämpfer: G = W+105 nach Tritt und Sprungangriff, W+108 nach dem Kniestoß, W+104 nach dem Wurf (Kampf 7).
const G_LEICHT_TRITT = 105
const G_LEICHT_KNIE = 108
const G_LEICHT_WURF = 104
## Slot frei t+79, nach Stufe 2 t+111, nach Wurf t+101 (Kampf 7).
const SLOT_FREI_TOD = 79
const SLOT_FREI_STUFE2 = 111
const SLOT_FREI_WURF = 101

# ===========================================================================
# Figur: Schaden, Schutz, Umgeworfen, Tod, Neueinstieg (Kampf 4.3, 6; mechanik „Unverwundbarkeit“, „Umgeworfen werden“, „Tod und Neueinstieg der Figur“)
# ===========================================================================

## GETROFFEN: 27 Frames H bis H+26, schutz = 27 in H (Kampf 4.3, 6.3).
const SCHUTZ_TREFFER = 27
const GETROFFEN_DAUER = 27
## Schutz nach dem Aufstehen: schutz = 35 in U (Kampf 6.3).
const SCHUTZ_AUFSTEHEN = 35
## Schutz nach dem Neueinstieg: schutz = 200 ab N+1, zählt ab LN+1 (Kampf 6.3, 6.5).
const SCHUTZ_NEUEINSTIEG = 200
## UMGEWORFEN: Bodenkontakt H+46, LIEGEN ab H+54, Ruhe H+55 (Kampf 4.3).
const FIGUR_UMGEWORFEN_BODEN = 46
const FIGUR_LIEGEN_AB = 54
const FIGUR_UMGEWORFEN_RUHE = 55
## LIEGEN endet spätestens in L_end = H+94 (Kampf 4.3).
const FIGUR_LIEGEN_ENDE = 94
## Sechs Drücke beenden das Liegen in q+2 (Kampf 4.3).
const LIEGE_DRUECKE = 6
const LIEGE_ENDE_NACH_DRUCK = 2
## AUFSTEHEN 26 Frames, STAND in U = L_end+27 (Kampf 4.3).
const FIGUR_AUFSTEHEN_DAUER = 26
## Ohne Drücke U = H+121 (Kampf 4.3).
const FIGUR_U_OHNE_DRUECKE = 121
## Tod: Bodenkontakt t+40, Neueinstieg N = t+120 (Kampf 6.5, E16).
const TOD_BODEN = 40
const NEUEINSTIEG_NACH_TOD = 120
## Erscheinen in N+1 bei Kamera-x + 64, Tiefe Kamera-y + 48, Höhe 256 (Kampf 6.5).
const NEUEINSTIEG_X = 64
const NEUEINSTIEG_Z = 48
const NEUEINSTIEG_H: int = 16777216  # ausDezimal(256)
## Landung LN = N+53 auf dem Boden, N+50 auf einem tragenden Behälter (Kampf 6.5).
const NEUEINSTIEG_LANDUNG = 53
const NEUEINSTIEG_LANDUNG_BEHAELTER = 50
## Landung LN bis LN+5, STAND ab LN+6, S neu in LN bis LN+4 gibt einen Sprung (Kampf 4.3).
const NEUEINSTIEG_LANDUNG_DAUER = 6
const NEUEINSTIEG_STEUERUNG_AB = 6
const NEUEINSTIEG_NEUSPRUNG_BIS = 4
## Landung trifft jeden wachen Gegner im Bild mit 5 LP, den Boss mit 10 LP (Kampf 6.5, E10, E11).
const NEUEINSTIEG_LANDUNG_SCHADEN = 5
const NEUEINSTIEG_LANDUNG_SCHADEN_BOSS = 10
## „im Bild“: 0 ≤ x − Kamera-x ≤ 383 (Kampf 6.5, P30).
const IM_BILD_MAX = 383

# ===========================================================================
# Figur: Gegenstände und Waffen (Kampf 10; mechanik „Gegenstände und Waffen“)
# ===========================================================================

## Aufnehmen: |dz| ≤ 12 (Kampf 10.1).
const AUFNEHMEN_TIEFE = 12
## Aufnahmebereiche vorn/hinten, px (Kampf 10.1, P26, E14).
const AUFNEHMEN_BEREICH = {
  "Raketenwerfer": { "vorn": 35, "hinten": 28 },
  "Kometenbraten": { "vorn": 29, "hinten": 29 },
  "Eisnudelschale": { "vorn": 29, "hinten": 29 },
  "Sternbeeren": { "vorn": 22, "hinten": 22 },
}
## Aufnehmen: Wirkung in P+1, Aktion P+1 bis P+7, Drücke ab P+8 (Kampf 4.3, 10.1).
const AUFNEHMEN_DAUER = 7
const AUFNEHMEN_DRUECKE_AB = 8
## Heilwerte (Kampf 10.2, E9): Eisnudelschale +55 oder +40, Sternbeeren +16 oder +12; Kometenbraten voll.
const HEILUNG_EISNUDELSCHALE: Array[int] = [55, 40]
const HEILUNG_STERNBEEREN: Array[int] = [16, 12]
## Raketenwerfer: 3 Schuss (Kampf 10.3).
const RAKETENWERFER_MUNITION = 3
## Raketenwerfer: Aktion P+1 bis P+17, Drücke ab P+18 (Kampf 4.3, 10.3, P5).
const WAFFE_DAUER = 17
const WAFFE_DRUECKE_AB = 18
## Abschuss in P+7: Rakete 58 px vor der Figur, 50 px hoch (Kampf 10.3).
const RAKETE_ABSCHUSS = 7
const RAKETE_START_X = 58
const RAKETE_START_H: int = 3276800  # ausDezimal(50)
## Rakete fliegt 5,0 px/Frame (Kampf 10.3).
const RAKETE_V: int = 327680  # ausDezimal(5.0)
## Rakete sinkt 2,375 px/Frame (Kampf 5.7, 10.3, P9).
const RAKETE_SINKEN: int = 155648  # ausDezimal(2.375)
## Einschlag frei fliegend in P+28 bei 163 px vor der Figur (Kampf 10.3).
const RAKETE_EINSCHLAG = 28
const RAKETE_EINSCHLAG_ABSTAND = 163
## Explosion RX: aktiv P+28 bis P+42, 15 Frames (Kampf 5.2, 10.3).
const RX_DAUER = 15
## RX: Einschlag −66 bis +90 in Flugrichtung, Tiefe 28, 8 LP (Kampf 5.2, 10.3, E14).
const RX_HINTEN = 66
const RX_VORN = 90
const RX_TIEFE = 28
const RX_SCHADEN = 8
## RX trifft keine Gegner ab Kamera-x + 448 (Kampf 10.3; mechanik „Waffen allgemein“).
const RX_GEGNER_GRENZE = 448
## Leere Waffe in P+18 weggeworfen, nach 61 Frames verschwunden (Kampf 10.3; Welt 9.3).
const WAFFE_WEGWURF = 18
const LEERE_WAFFE_LEBENSDAUER = 61
## Liegezeit Waffen: sichtbar bis 699, Blinken 700 bis 791, entfernt bei 792 (Kampf 10.4; Welt 9.3).
const LIEGEZEIT_WAFFE = 700
const LIEGEZEIT_ENTFERNT = 792
## Blinken: 2 Frames sichtbar, 2 unsichtbar, beginnend sichtbar (Welt 9.3).
const BLINKEN_TAKT = 2
## Waffe fällt in H+1 (Kampf 10.4, P27).
const WAFFE_FALLEN_NACH = 1

# ===========================================================================
# Bildränder und Stage (Welt 2.2)
# ===========================================================================

## Ränder der Figur: K + 24 ≤ x ≤ K + 360 und 24 ≤ x ≤ x_ende − 24 (Welt 2.2, Punkt 4).
const FIGUR_RAND = 24
const FIGUR_RAND_RECHTS = 360
## Behälter als Hindernis: x ± 12, z ± 6, Höhe 32 (Welt 2.2, Punkt 6).
const BEHAELTER_HALB_X = 12
const BEHAELTER_HALB_Z = 6
const BEHAELTER_HOEHE = 32

# ===========================================================================
# Kamera (Welt 3)
# ===========================================================================

## Folgepunkt Bildschirm-x 200 (Welt 3, KA1).
const KAMERA_FOLGEPUNKT = 200
## Höchstens 4 px je Frame (Welt 3, KA2).
const KAMERA_MAX_SCHRITT = 4
## Pfeil „weiter“ bis K > Sperren-x + 64, 16 Frames an, 16 aus (Welt 3, KA5).
const PFEIL_BIS = 64
const PFEIL_TAKT = 16
## Blende: c+1 bis c+28 schließt, c+29 bis c+106 schwarz, c+107 bis c+134 öffnet, Eingaben ab c+135 (Welt 3, KA13).
const BLENDE_ZU = 28
const BLENDE_SCHWARZ = 78
const BLENDE_AUF = 28
## Bildschütteln Körperpresse: 11 Frames waagrecht (Welt 3, KA10).
const SCHUETTELN_PRESSE: Array[int] = [7, -6, 5, -5, 4, -4, 3, -3, 2, -2, 0]
## Bildschütteln Explosion: 4 Frames senkrecht (Welt 3, KA10).
const SCHUETTELN_EXPLOSION: Array[int] = [2, 0, 2, 0]

# ===========================================================================
# Aktivierung und Wellen (Welt 4)
# ===========================================================================

## Aktives Fenster: −64 ≤ ⌊x⌋ − K ≤ 447 (Welt 4.1).
const FENSTER_LINKS = -64
const FENSTER_RECHTS = 447
## Haltepunkte und Wartepositionen nie außerhalb von K + 16 bis K + 368 (Welt 4.1).
const HALTEPUNKT_MIN = 16
const HALTEPUNKT_MAX = 368
## Weckreiz der Hockenden: ⌊x⌋ − K ≤ 383 (Welt 4.2).
const WECKREIZ_HOCKE = 383
## Dauer bis kampffähig je Auftritt (Welt 4.2).
const AUFTRITT_HOCKE_BOLZER = 49
const AUFTRITT_HOCKE_RAMMBOCK = 69
const AUFTRITT_VERSTECK = 16
const AUFTRITT_LUKE = 47
const AUFTRITT_RAND = 0
const AUFTRITT_BOSS = 60
## Anlegen am Rand: x = K − 32 bzw. K + 416 (Welt 4.2).
const RAND_LINKS_X = -32
const RAND_RECHTS_X = 416
## Startgegner (werte=start): Bolzer 16 LP / 5 Schaden, Rammbock 30 LP / 6 Schaden (Welt 4.5).
const BOLZER_START_LP = 16
const BOLZER_START_SCHADEN = 5
const RAMMBOCK_START_LP = 30
const RAMMBOCK_START_SCHADEN = 6
## Wellenbonus in der Scheibe (Welt 4.5, E10).
const WELLENBONUS_SCHEIBE = 0

# ===========================================================================
# Nahkämpfer (Welt 5; mechanik „Reichweite der Gegnerangriffe“)
# ===========================================================================

## Gehen Bolzer normal / schnell, px/Frame (Welt 5.1).
const BOLZER_GEHEN_X: int = 114688  # ausDezimal(1.75)
const BOLZER_GEHEN_Z: int = 57344  # ausDezimal(0.875)
const BOLZER_SCHNELL_X: int = 147456  # ausDezimal(2.25)
const BOLZER_SCHNELL_Z: int = 73728  # ausDezimal(1.125)
## Gehen Rammbock normal / schnell, px/Frame (Welt 5.1, E9, E10), einmal auf 1/65536 gerundet (Kampf 2.4).
const RAMMBOCK_GEHEN_X: int = 104858  # ausDezimal(1.6)
const RAMMBOCK_GEHEN_Z: int = 52429  # ausDezimal(0.8)
const RAMMBOCK_SCHNELL_X: int = 131072  # ausDezimal(2.0)
const RAMMBOCK_SCHNELL_Z: int = 65536  # ausDezimal(1.0)
## Gehstufe schnell mit Wahrscheinlichkeit 1/3: Ziehung aus 3, Wert 0 = schnell (Welt 5.1, E10).
const GEHSTUFE_AUS = 3
## Haltabstand H: 48 nach normalem, 56 nach schnellem Gehen (Welt 5.1).
const HALTABSTAND_NORMAL = 48
const HALTABSTAND_SCHNELL = 56
## Pause in Kampfhaltung: 29 − 4·⌊Rang/4⌋ (Welt 5.1, 8).
const PAUSE_BASIS = 29
const PAUSE_FAKTOR = 4
const PAUSE_TEILER = 4
## Warteabstand min(120 + 16·k, 140) (Welt 5.1, 5.8).
const WARTEABSTAND_BASIS = 120
const WARTEABSTAND_SCHRITT = 16
const WARTEABSTAND_MAX = 140
## Steht, wenn weniger als 1,75 px von der Warteposition (Welt 5.8).
const WARTEPOSITION_TOLERANZ: int = 114688  # ausDezimal(1.75)
## Abwarten nach einer Serie, Frames (Welt 5.1).
const ABWARTEN_BOLZER: Array[int] = [50, 80, 110, 140]
const ABWARTEN_RAMMBOCK: Array[int] = [90, 120, 150, 180]
## Spott 42 Frames (Welt 5.1).
const SPOTT_DAUER = 42
## Verfolgung Bolzer: 1 Gehbefehl (3/4) oder 2 (1/4): Ziehung aus 4, Werte 0 bis 2 → 1 (Welt 5.1).
const VERFOLGUNG_BOLZER: Array[int] = [1, 1, 1, 2]
## Verfolgung Rammbock: 0, 1 oder 2 (je 1/3) (Welt 5.1).
const VERFOLGUNG_RAMMBOCK: Array[int] = [0, 1, 2]
## Gehbefehl dauert 40 Frames (Welt 5.3, 5.8).
const GEHBEFEHL_DAUER = 40
## Gehrichtung: 32 Sektoren zu 11,25° (Welt 5.3).
const GEHSEKTOREN = 32
## Kampfhaltung bei dz (Gegner minus Figur) in −10 … +11 (Welt 5.2, 5.3).
const KAMPF_DZ_MIN = -10
const KAMPF_DZ_MAX = 11
## Kampfhaltung endet bei |dx| > 79 (Welt 5.2).
const KAMPF_DX_MAX = 79
## Zielabstand Z begrenzt auf −48 … +48 (Welt 5.4).
const ZIELABSTAND_MAX = 48
## Abbruchfenster x_Z − 32 … x_Z + 31 (Welt 5.4).
const ABBRUCH_LINKS = 32
const ABBRUCH_RECHTS = 31
## Treffer: Figur vor dem Gegner oder höchstens 3 px hinter ihm, bei Blick rechts 4 px (Welt 5.4).
const GEGNER_HINTEN = 3
const GEGNER_HINTEN_BLICK_RECHTS = 4
## Treffer: Figur höchstens 48 px hoch, Sprungtritt 50 px (Welt 5.4).
const GEGNER_HOEHE_MAX = 48
const SPRUNGTRITT_HOEHE_MAX = 50
## Trefferstopp der Gegner: aktive Frames +7 (Welt 5.4).
const GEGNER_TREFFERSTOPP = 7
## 
## Angriffsarten der Nahkämpfer (Welt 5.5): Startup, aktiv als Abstand zu A
## (ohne Treffer), Umwerfen, Abbruch, Nachlauf [min, max] ohne bzw. mit
## Treffer, fester Rückzug.
const NAH_ANGRIFFE = {
  "BA": { "startup": 9, "aktiv_von": 9, "aktiv_bis": 13, "umwerfen": false, "abbruch": true, "nachlauf_ohne": [12, 36], "nachlauf_mit": [16, 36], "rueckzug": 5 },
  "BB": { "startup": 4, "aktiv_von": 4, "aktiv_bis": 13, "umwerfen": false, "abbruch": true, "nachlauf_ohne": [7, 18], "nachlauf_mit": [11, 18], "rueckzug": 0 },
  "BC": { "startup": 10, "aktiv_von": 10, "aktiv_bis": 17, "umwerfen": false, "abbruch": true, "nachlauf_ohne": [16, 40], "nachlauf_mit": [21, 40], "rueckzug": 8 },
  "BUA": { "startup": 9, "aktiv_von": 9, "aktiv_bis": 13, "umwerfen": true, "abbruch": true, "nachlauf_ohne": [30, 36], "nachlauf_mit": [0, 0], "rueckzug": 5 },
  "BUB": { "startup": 8, "aktiv_von": 8, "aktiv_bis": 17, "umwerfen": true, "abbruch": true, "nachlauf_ohne": [14, 31], "nachlauf_mit": [0, 0], "rueckzug": 0 },
  "RA": { "startup": 9, "aktiv_von": 9, "aktiv_bis": 13, "umwerfen": false, "abbruch": true, "nachlauf_ohne": [17, 36], "nachlauf_mit": [17, 36], "rueckzug": 5 },
  "RB": { "startup": 10, "aktiv_von": 10, "aktiv_bis": 17, "umwerfen": false, "abbruch": true, "nachlauf_ohne": [20, 41], "nachlauf_mit": [20, 39], "rueckzug": 8 },
  "RU": { "startup": 9, "aktiv_von": 9, "aktiv_bis": 13, "umwerfen": true, "abbruch": true, "nachlauf_ohne": [30, 36], "nachlauf_mit": [5, 33], "rueckzug": 5 },
  "RS": { "startup": 9, "aktiv_von": 9, "aktiv_bis": 45, "umwerfen": true, "abbruch": false, "nachlauf_ohne": [1, 1], "nachlauf_mit": [1, 33], "rueckzug": 0 },
}
## Sprungtritt: trifft 0 bis 59 px vor ihm (Blick rechts −1 bis 58), Tiefe ±12, bis 50 px Höhe (Welt 5.5).
const SPRUNGTRITT_VORN = 59
const SPRUNGTRITT_VORN_BLICK_RECHTS = 58
const SPRUNGTRITT_HINTEN_BLICK_RECHTS = 1
const SPRUNGTRITT_TIEFE = 12
## Sprungtritt: ab A+5 3 px/Frame, Höhe in A+5+n gleich 5n − n(n−1)/8, n = 1 bis 41, Aufsetzen A+46 (Welt 5.5).
const SPRUNGTRITT_FLUG_AB = 5
const SPRUNGTRITT_X: int = 196608  # ausDezimal(3)
const SPRUNGTRITT_HOEHE_LINEAR = 5
const SPRUNGTRITT_HOEHE_TEILER = 8
const SPRUNGTRITT_FLUGFRAMES = 41
const SPRUNGTRITT_AUFSETZEN = 46
## Serie Bolzer: 2 bis 5 normale Angriffe je Gruppe (Welt 5.6).
const BOLZER_GRUPPE: Array[int] = [2, 3, 4, 5]
## Normaler Angriff Bolzer: BA 70 %, BB 25 %, BC 5 % (Welt 5.6).
const BOLZER_ANGRIFF_ANTEILE: Array[int] = [70, 25, 5]
const BOLZER_ANGRIFF_CODES: Array[String] = ["BA", "BB", "BC"]
## Umwerf-Angriff Bolzer: nach BA BUB mit 60 %, sonst BUA (Welt 5.6).
const BOLZER_BUB_ANTEIL = 60
## Nach dem Serienende Bolzer: Abwarten 70, Seitenwechsel 20, Spott 10 % (Welt 5.6).
const BOLZER_SERIENENDE_ANTEILE: Array[int] = [70, 20, 10]
## Rammbock: erster Angriff der Gruppe Sprungtritt mit 30 % (Welt 5.6).
const RAMMBOCK_SPRUNGTRITT_ANTEIL = 30
## Rammbock: sonst 1, 2 oder 3 normale Angriffe (Welt 5.6).
const RAMMBOCK_GRUPPE: Array[int] = [1, 2, 3]
## Normaler Angriff Rammbock: RA 50 %, RB 50 % (Welt 5.6).
const RAMMBOCK_ANGRIFF_ANTEILE: Array[int] = [50, 50]
const RAMMBOCK_ANGRIFF_CODES: Array[String] = ["RA", "RB"]
## Umwerf-Angriff Rammbock: RU 70 %, RS 30 % (Welt 5.6).
const RAMMBOCK_UMWERF_ANTEILE: Array[int] = [70, 30]
## Nach dem Serienende Rammbock: Seitenwechsel 45, Abwarten 45, Spott 10 % (Welt 5.6).
const RAMMBOCK_SERIENENDE_ANTEILE: Array[int] = [45, 45, 10]
## Spott oder Abwarten nach verbrauchtem Verfolgungsbudget: je 1/2 (Welt 5.2, 11.2).
const SPOTT_ODER_ABWARTEN_AUS = 2
## Seitenwechsel: erst auf z_Figur ± 40, dann bis |dx| = 60 (Welt 5.8).
const SEITENWECHSEL_Z = 40
const SEITENWECHSEL_DX = 60

# ===========================================================================
# Fernkämpfer Zünder (Welt 6; mechanik „Fernangriffe der Gegner“)
# ===========================================================================

## Gehen wie der Bolzer (Welt 6).
const ZUENDER_GEHEN_X: int = 114688  # ausDezimal(1.75)
const ZUENDER_GEHEN_Z: int = 57344  # ausDezimal(0.875)
const ZUENDER_SCHNELL_X: int = 147456  # ausDezimal(2.25)
const ZUENDER_SCHNELL_Z: int = 73728  # ausDezimal(1.125)
## Zielpunkte: 128 px vor der Figur in ihrer Tiefe oder 120 px mit 24 px Tiefenversatz (Welt 6).
const ZIELPUNKT_GERADE = 128
const ZIELPUNKT_VERSATZ_X = 120
const ZIELPUNKT_VERSATZ_Z = 24
## Wahl des Zielpunkts gleichverteilt aus drei Punkten (Welt 6, 11.2).
const ZIELPUNKT_AUS = 3
## Zielbeginn: höchstens 8 px in x und 6 px in der Tiefe vom Zielpunkt (Welt 6).
const ZIELBEGINN_X = 8
const ZIELBEGINN_Z = 6
## Zielen genau 60 Frames, z bis z+59 (Welt 6, E17).
const ZIELEN_DAUER = 60
## Zielen: Tiefenschritt, wenn dz außerhalb von −6 … +5 (Welt 6).
const ZIELEN_DZ_MIN = -6
const ZIELEN_DZ_MAX = 5
## Zielen: Abbruch bei |dx| > 200 (Welt 6).
const ZIELEN_ABBRUCH_DX = 200
## Schuss ZR: 17 Frames (Welt 6).
const SCHUSS_DAUER = 17
## Zielrecht gehalten von z bis A+16, je Schuss 77 Frames (Welt 6).
const ZIELRECHT_BIS = 16
## Rakete des Zünders in Q = A+6, 45 px vor ihm, 44 px hoch (Welt 6).
const ZR_RAKETE_AB = 6
const ZR_RAKETE_X = 45
const ZR_RAKETE_H: int = 2883584  # ausDezimal(44)
## Rakete 5,0 px/Frame, Einschlag in Q+20 nach 100 px (Welt 6).
const ZR_RAKETE_V: int = 327680  # ausDezimal(5.0)
const ZR_EINSCHLAG = 20
const ZR_EINSCHLAG_WEG = 100
## Höhe der Rakete sinkt auf 1 px (nur Darstellung, Welt 6).
const ZR_RAKETE_H_MIN: int = 65536  # ausDezimal(1)
## Explosion Q+21 bis Q+29 (9 Frames) (Welt 6).
const ZR_EXPLOSION_VON = 21
const ZR_EXPLOSION_BIS = 29
## Explosion: (⌊x_Figur⌋ + 4·b) − ⌊x_Einschlag⌋ in −52 … 51, |dz| ≤ 12, Figur bis 25 px (Welt 6).
const ZR_EXPLOSION_H = 52
const ZR_BLICK_VERSATZ = 4
const ZR_EXPLOSION_TIEFE = 12
const ZR_EXPLOSION_HOEHE_MAX = 25
## Zurückweichen, wenn die Figur näher als 100 px ist (Welt 6).
const ZURUECKWEICHEN_ABSTAND = 100
## Kolbenhieb ZK: nur bei weniger als 24 px bis zum Bildrand hinter ihm und |dx| ≤ 60 (Welt 6).
const KOLBENHIEB_RAND = 24
const KOLBENHIEB_DX = 60
## Tod: Waffe fliegt 2 px/Frame von der Figur weg, bis 61 px, 34 Frames; Höhe ⌊n·(34 − n)·61/289⌋; Gegenstand ab L = t+44 (Welt 6).
const ZUENDER_WAFFE_X: int = 131072  # ausDezimal(2)
const ZUENDER_WAFFE_HOEHE = 61
const ZUENDER_WAFFE_FLUG = 34
const ZUENDER_WAFFE_TEILER = 289
const ZUENDER_WAFFE_LIEGT_AB = 44

# ===========================================================================
# Boss Ballast (Welt 7; mechanik „Boss“)
# ===========================================================================

## LP in der Scheibe, fest (Welt 7.1).
const BOSS_LP = 100
## Gehen 1,25 × 0,625 px/Frame (Welt 7.1).
const BOSS_GEHEN_X: int = 81920  # ausDezimal(1.25)
const BOSS_GEHEN_Z: int = 40960  # ausDezimal(0.625)
## Hält 70 px Abstand (Welt 7.1).
const BOSS_ABSTAND = 70
## Umwerfen: Ruhe in W+55, 127,25 px vom Trefferort (Welt 7.1).
const BOSS_UMWERFEN_RUHE_WEG: int = 8339456  # ausDezimal(127.25)
## Liegen und Aufstehen zusammen 42 bis 70 Frames in Viererschritten (Welt 7.1).
const BOSS_LIEGEN_VON = 42
const BOSS_LIEGEN_BIS = 70
## Frei nach einem Wurf 116 bis 144 Frames (Welt 7.1).
const BOSS_FREI_WURF_VON = 116
const BOSS_FREI_WURF_BIS = 144
## Nach der Explosion: Flug 109,25 px, frei 132 bis 152 Frames (Welt 7.1).
const BOSS_EXPLOSION_WEG: int = 7159808  # ausDezimal(109.25)
const BOSS_FREI_EXPLOSION_VON = 132
const BOSS_FREI_EXPLOSION_BIS = 152
## Schrittweite der Viererschritte (Welt 7.1, 11.2).
const BOSS_ZUFALL_SCHRITT = 4
## Nach dem Spezialangriff: 78 Frames TAUMELN über 135,125 px (Welt 7.1).
const BOSS_TAUMELN_DAUER = 78
const BOSS_TAUMELN_WEG: int = 8855552  # ausDezimal(135.125)
## Erster Angriff 60 Frames nach der Kampfbereitschaft, jeder weitere frühestens d = 170 bis 200 Frames nach dem vorigen (Welt 7.2).
const BOSS_ERSTER_ANGRIFF = 60
const BOSS_ABSTAND_VON = 170
const BOSS_ABSTAND_BIS = 200
## Armschwung: heran bis |dx| ≤ 78 und |dz| ≤ 6 (Welt 7.2).
const BOSS_ARMSCHWUNG_DX = 78
const BOSS_ARMSCHWUNG_DZ = 6
## Wahl nach Abstand: |dx| < 100 Armschwung 2/3, Presse 1/3; sonst je 1/3 (Welt 7.2).
const BOSS_WAHL_GRENZE = 100
## Armschwung AS: holt 17 Frames aus, aktiv A_k+17 bis A_k+19, nächster Schwung in A_k+36, höchstens drei (Welt 7.3, E18).
const AS_AUSHOLEN = 17
const AS_AKTIV_VON = 17
const AS_AKTIV_BIS = 19
const AS_NAECHSTER = 36
const AS_SCHWUENGE_MAX = 3
## AS: 16 px hinter bis 105 px vor ihm, ±12, Figur bis 66 px (Welt 7.3).
const AS_HINTEN = 16
const AS_VORN = 105
const AS_TIEFE = 12
const AS_HOEHE_MAX = 66
## AS: Schaden je Rangstufe I bis IV (Welt 7.3).
const AS_SCHADEN: Array[int] = [9, 10, 11, 12]
## AS: Nachlauf 30 Frames (Welt 7.3, offen).
const AS_NACHLAUF = 30
## Ansturm AN: Ausholen 20, Lauf 4 px/Frame (schräg 3,92), höchstens 45 Frames und 176 px (Welt 7.3).
const AN_AUSHOLEN = 20
const AN_V: int = 262144  # ausDezimal(4)
const AN_V_SCHRAEG: int = 256901  # ausDezimal(3.92)
const AN_MAX_FRAMES = 45
const AN_MAX_WEG = 176
## AN: lenkt in der Tiefe 1 px/Frame nach (Welt 7.3).
const AN_NACHLENKEN: int = 65536  # ausDezimal(1)
## AN: Auslauf 30 px in 15 Frames, im n-ten Frame 4 − 0,25·n px/Frame (Welt 7.3 mit L35; vorher 24 bis 30 px).
const AN_AUSLAUF_VON = 24
const AN_AUSLAUF_BIS = 30
## AN: vorn 0 bis 40 px, ±12, Figur bis 90 px (Welt 7.3, Platzhalter).
const AN_VORN = 40
const AN_TIEFE = 12
const AN_HOEHE_MAX = 90
## AN: Schaden je Rangstufe (Welt 7.3).
const AN_SCHADEN: Array[int] = [12, 14, 15, 17]
## AN: Nachlauf 16 Frames (Welt 7.3).
const AN_NACHLAUF = 16
## Körperpresse KP: 15 Frames Hocke, Landung A+64 (mit Treffer A+71), Scheitel 107,5 px in A+31 (Welt 7.3).
const KP_HOCKE = 15
const KP_LANDUNG = 64
const KP_SCHEITEL_FRAME = 31
const KP_SCHEITEL_HOEHE: int = 7045120  # ausDezimal(107.5)
## KP: höchstens 200 px; x nach k Bahnframes x(A) + ⌊d·k/64⌋ (Kampf 2.4; Welt 7.3).
const KP_MAX_WEG = 200
const KP_X_TEILER = 64
## KP: aktiv A+51 bis A+62, |dx| ≤ 25 um den Boss, ±12, Höhe ohne Grenze (Welt 7.3).
const KP_AKTIV_VON = 51
const KP_AKTIV_BIS = 62
const KP_HALBBREITE = 25
const KP_TIEFE = 12
## KP: Schaden je Rangstufe (Welt 7.3).
const KP_SCHADEN: Array[int] = [16, 18, 20, 22]
## KP: Nachlauf 40 Frames (Welt 7.3, offen).
const KP_NACHLAUF = 40
## Stoß RZ: 54 Frames Rückzug, 48 px, in den ersten 16 Frames 3 px/Frame, nicht treffbar bis 62 Frames nach Beginn (Welt 7.3, 7.4 SA5).
const RZ_DAUER = 54
const RZ_WEG = 48
const RZ_SCHNELL_FRAMES = 16
const RZ_SCHNELL_V: int = 196608  # ausDezimal(3)
const RZ_NICHT_TREFFBAR = 62
## Super-Armor: Folgetreffer bis einschließlich h+23 (Welt 7.4, SA5, E19).
const SA_FOLGEFRIST = 23
## Verstärkung: Welle 9 bei 25 LP (Welt 7.5).
const BOSS_SCHWELLE_WELLE9 = 25

# ===========================================================================
# Rang (Welt 8; mechanik „Schaden der Gegner“)
# ===========================================================================

## Spanne und Start (Welt 8).
const RANG_MIN = 7
const RANG_MAX = 24
const RANG_START = 9
## Rang-Uhr: Anstieg bei r = 409 + 600·k (Welt 8).
const RANG_ERSTER_ANSTIEG = 409
const RANG_TAKT = 600
## Tod der Figur: Rang −3, mindestens 7 (Welt 8).
const RANG_TOD = 3
## Rangstufen: I = 7, II = 8 bis 14, III = 15 bis 21, IV = 22 bis 24 (Welt 8). Untergrenze je Stufe.
const RANGSTUFE_AB: Array[int] = [7, 8, 15, 22]
## LP = ⌊(34·U + 2·(O − U)·(Rang − 7) + 17) / 34⌋ (Welt 8).
const RANG_LP_TEILER = 34
const RANG_LP_FAKTOR = 2
const RANG_LP_RUNDUNG = 17
## LP U bis O der später erscheinenden Gegner (Welt 8).
const LP_BOLZER_U = 22
const LP_BOLZER_O = 34
const LP_RAMMBOCK_U = 32
const LP_RAMMBOCK_O = 42
const LP_ZUENDER_U = 16
const LP_ZUENDER_O = 28
## Schaden je Rangstufe I bis IV (Welt 8).
const SCHADEN_BOLZER: Array[int] = [7, 8, 9, 10]
const SCHADEN_RAMMBOCK: Array[int] = [8, 9, 10, 11]
const SCHADEN_ZUENDER_RAKETE: Array[int] = [12, 13, 14, 15]

# ===========================================================================
# Gegenstände und Behälter (Welt 9)
# ===========================================================================

## Flug aus dem Behälter: Höhe im n-ten Frame ⌊n·(48 − n)·35/576⌋, gelandet bei n = 48, L = h+49 (Welt 9.3).
const GEGENSTAND_FLUG = 48
const GEGENSTAND_SCHEITEL = 35
const GEGENSTAND_FLUG_TEILER = 576
## Scrollen: Gegenstände entfernt bei K − ⌊x⌋ ≥ 163, Behälter ab 195 (Welt 9.2, 9.3).
const SCROLL_GEGENSTAND = 163
const SCROLL_BEHAELTER = 195
## Stage-Ende: liegende Gegenstände entfernt in t+480 (Welt 9.3, 10.5).
const STAGE_ENDE_ENTFERNEN = 480
## Bei 72 LP gibt Kometenbraten 100 Punkte statt der Heilung (Welt 9.3, 10.2).
const PUNKTE_ESSEN_VOLL = 100

# ===========================================================================
# Anzeige, Punkte, Rahmen (Welt 10)
# ===========================================================================

## Punkte je LP Schaden eines Treffers der Figur (Welt 10.2).
const PUNKTE_JE_LP = 10
## Punkte für besiegte Gegner (Welt 10.2).
const PUNKTE_BOLZER = 100
const PUNKTE_RAMMBOCK = 200
const PUNKTE_ZUENDER = 200
const PUNKTE_BALLAST = 5000
## Leben je Spiel (Welt 10.3).
const LEBEN_START = 3
## GAME OVER 240 Frames, dann Neustart mit Seed + 1 (Welt 10.3).
const GAMEOVER_DAUER = 240
## Stage-Ende: STAGE CLEAR in t+120, Gegenstände entfernt t+480, Blende 28, schwarz 78, Ende in t+585 (Welt 10.5).
const STAGE_CLEAR_NACH = 120
const STAGE_ENDE_BLENDE = 28
const STAGE_ENDE_SCHWARZ = 78
const STAGE_ENDE_NACH = 585
## Anzeigeleiste (Welt 10.1, Richtwerte): Lagen in px.
const ANZEIGE = {
  "name": { "x": 8, "zeile": 6 },
  "punkte": { "x": 48, "zeile": 6, "ziffern": 8 },
  "leben": { "x": 8, "zeile": 18 },
  "lp_balken": { "x0": 48, "x1": 119, "zeile0": 18, "zeile1": 23 },
  "gegner_name": { "x": 200, "zeile": 6 },
  "gegner_balken": { "x0": 200, "x1": 271, "zeile0": 18, "zeile1": 23 },
  "pfeil": { "x0": 340, "x1": 376, "zeile0": 96, "zeile1": 112 },
}
## LP-Balken: 72 px, 1 px je LP; Lagen n = ⌈LP/72⌉ (Welt 10.1).
const LP_BALKEN_BREITE = 72

# ===========================================================================
# Prüfmittel (Kampf 11.2, 12)
# ===========================================================================

## Prüfangriff PA: Figur −4 bis 60 px vor dem Gegner, |dz| ≤ 10, Figurhöhe ≤ 48, ohne Trefferstopp (Kampf 11.2).
const PA_VORN = 60
const PA_HINTEN = 4
const PA_TIEFE = 10
const PA_HOEHE_MAX = 48
## Startrang einer Prüfszene, wenn nicht angegeben (Kampf 11.2: Standard 9).
const PRUEF_RANG_STANDARD = 9

# ===========================================================================
# Ergänzungen aus Stufe 2 (nur anhängen, je Konstante mit Quellkommentar)
# ===========================================================================

# --- Ergänzung K2: Trefferprüfung und Trefferreaktion ---
## Wurftreffer in E+1: umwerfender Treffer W = E+1 (Kampf 8.4; mechanik „Trefferreaktion der Gegner“: K beim Wurf E+1).
const WURF_TREFFER = 1

# --- Ergänzung K3: Gehrichtung der Gegner ---
## 
## Gehrichtung der Gegner: cos(k · 11,25°) für k = 0 … 8 als Rohwert 16.16,
## einmal auf 1/65536 gerundet; sin(k · 11,25°) ist Eintrag 8 − k (Welt 5.3:
## Schritt (v_x · cos α, v_z · sin α) aus einer Tabelle, auf 1/65536 gerundet).
const GEH_COS: Array[int] = [65536, 64277, 60547, 54491, 46341, 36410, 25080, 12785, 0]
## 
## Sektorgrenzen der Gehrichtung: tan((k + 0,5) · 11,25°) für k = 0 … 7 als
## Rohwert 16.16 (Welt 5.3: Sektor über eine feste Tabelle der Tangensgrenzen,
## nicht über eine Winkelfunktion).
const GEH_TAN_GRENZEN: Array[int] = [6455, 19880, 35030, 53784, 79856, 122609, 216043, 665398]

# --- Ergänzung K4: Boss Ballast ---
## 
## Boss nach dem Umwerfen: vom Bodenkontakt (W+46, 109,25 px) bis zur Ruhe
## (W+55, 127,25 px) 18 px in 9 Frames, also 2 px/Frame (Welt 7.1:
## BOSS_UMWERFEN_RUHE_WEG; Verlauf Festlegung K4).
const BOSS_AUSROLLEN_V: int = 131072  # ausDezimal(2)
## 
## Wahl nach Abstand (Welt 7.2): bei |dx| < 100 Armschwung 2/3, Körperpresse
## 1/3; sonst Ansturm, Armschwung, Körperpresse je 1/3. Eine Ziehung
## gleichverteilt aus der Liste (zufall.ts wahl).
const BOSS_WAHL_NAH: Array[String] = ["AS", "AS", "KP"]
const BOSS_WAHL_FERN: Array[String] = ["AN", "AS", "KP"]
## 
## Ansturm: Auslauf nach dem Lauf mit 4 px/Frame, je Frame 0,25 px/Frame
## weniger: 15 Frames, 30 px (Welt 7.3 mit L35: Auslauf 30 px in 15 Frames,
## im n-ten Frame 4 − 0,25·n px/Frame).
const AN_AUSLAUF_ABNAHME: int = 16384  # ausDezimal(0.25)
## 
## Körperpresse, Höhe nach k Bahnframes (Welt 7.3, Verlauf S2; Festlegung K4):
## bis zum Scheitel 107,5 − c·(31 − k)², danach 107,5 − c'·(k − 31)², mit
## c = 107,5/31² und c' = 107,5/33² (Landung in A+64), einmal auf 1/65536
## nach −∞ gerundet; in der Landung Höhe 0.
const KP_STEIG_FAKTOR: int = 7331  # ausBruch(215, 1922)
const KP_FALL_FAKTOR: int = 6469  # ausBruch(215, 2178)

# --- Ergänzung K1: Figur ---
## 
## Fall nach dem Neueinstieg: Höhe sinkt ab N+1 (256 px) um 5 px je Frame, in
## N+52 also 1 px, Landung LN = N+53 auf Höhe 0 (Kampf 6.5, P28: Höhenverlauf
## frei für die Darstellung, Landung fest in N+53; Verlauf Festlegung K1).
const NEUEINSTIEG_FALL_V: int = 327680  # ausDezimal(5)

# --- Ergänzung Q1: Qualitätsbefunde (Figur, Gegner, Prüfmittel) ---
## 
## „Nie“ als Frame-Schwelle (Kampf 4.3: bis zum Ende der Aktion nimmt die
## Figur keine Drücke an; kein Losreißen, keine Pose bis STAND): größer als
## jeder Frame eines Laufs. Ganze Zahl statt Infinity, damit der Zustand der
## Figur ganzzahlig und kopierbar bleibt (Welt 11.6, Kampf 3).
const FRAME_NIE = 2147483647
## 
## Welle des Bosses in der Scheibe: Welle 7 (Welt 4.6, 4.7); nur für den
## Schlüssel welle.7=nur_boss des Prüfstarts (Welt 11.3).
const BOSS_WELLE_SCHEIBE = 7
## 
## Gehschritt der Gegner je Gehtempo (Welt 5.3 mit den Tempi aus 5.1 und 6):
## Sektor k = 0 … 8 im Viertel (Richtung k · 11,25°), x[k] = v_x · cos(k · 11,25°),
## z[k] = v_z · sin(k · 11,25°), je Tempo einmal auf 1/65536 gerundet (nächster
## Rohwert, mit Python aus den Dezimalwerten berechnet; Kampf 2.4 Punkt 1).
## x[0] und z[8] sind das volle Tempo (wie BOLZER_GEHEN_X usw.). Ersetzt die
## Rechnung mit GEH_COS, die zweimal rundete.
const GEH_SCHRITT_BOLZER: Dictionary = {
  "x": [114688, 112484, 105958, 95360, 81097, 63717, 43889, 22375, 0],
  "z": [0, 11187, 21945, 31859, 40548, 47680, 52979, 56242, 57344],
}
const GEH_SCHRITT_BOLZER_SCHNELL: Dictionary = {
  "x": [147456, 144623, 136232, 122605, 104267, 81922, 56429, 28767, 0],
  "z": [0, 14384, 28214, 40961, 52134, 61303, 68116, 72311, 73728],
}
const GEH_SCHRITT_RAMMBOCK: Dictionary = {
  "x": [104858, 102843, 96876, 87186, 74146, 58256, 40127, 20457, 0],
  "z": [0, 10228, 20064, 29128, 37073, 43593, 48438, 51421, 52429],
}
const GEH_SCHRITT_RAMMBOCK_SCHNELL: Dictionary = {
  "x": [131072, 128553, 121095, 108982, 92682, 72820, 50159, 25571, 0],
  "z": [0, 12785, 25080, 36410, 46341, 54491, 60547, 64277, 65536],
}
const GEH_SCHRITT_ZUENDER: Dictionary = {
  "x": [114688, 112484, 105958, 95360, 81097, 63717, 43889, 22375, 0],
  "z": [0, 11187, 21945, 31859, 40548, 47680, 52979, 56242, 57344],
}
const GEH_SCHRITT_ZUENDER_SCHNELL: Dictionary = {
  "x": [147456, 144623, 136232, 122605, 104267, 81922, 56429, 28767, 0],
  "z": [0, 14384, 28214, 40961, 52134, 61303, 68116, 72311, 73728],
}
## 
## Rakete des Zünders: Höhe sinkt je Flugframe um 43/20 px, von 44 px in Q
## auf 1 px in Q+20 (Welt 6: „Höhe sinkt auf 1 px (nur Darstellung)“; linearer
## Verlauf Festlegung K3), einmal auf 1/65536 nach −∞ gerundet, ohne Division
## im Lauf (Kampf 2.4).
const ZR_RAKETE_SINKEN: int = 140902  # ausBruch(43, 20)

# --- Ergänzung Q2: Qualitätsbefunde (Boss, Wellen) ---
## 
## Körperpresse, z nach k Bahnframes (Welt 7.3: Sprung zum Ort der Figur in A;
## z linear wie x, Festlegung K4): z(A) + dz · k/64 als Festkommaprodukt mit
## dem Anteil k · 1/64, also ohne Division (Kampf 2.4 nennt nur x) und mit
## exaktem Zwischenwert (kein Überlauf bei großem dz). Gleich ⌊dz·k/64⌋.
const KP_Z_ANTEIL: int = 1024  # ausBruch(1, KP_X_TEILER)
# --- Ende Ergänzung Q2 ---

