# Spielfigur (K1) nach docs/spezifikation-kampf.md, Abschnitte 4
# (Zustandsautomat), 5.2, 5.3, 5.6 (Angriffe, Trefferstopp, Kette), 8 (Griff,
# Kniestoß, Wurf, geworfener Gegner), 9 (Sprint, Spezialangriff), 10 (Waffen,
# Aufnehmen); Schaden, Schutz, Tod und Neueinstieg in schaden.gd (Kampf 6).
# Port von spiel/src/kern/figur/figur.ts.
#
# welt.gd ruft genau die hier exportierten Funktionen (Vertrag Stufe 2):
#   figurInitialisieren  nach erzeugeWelt
#   figurEingabe         KS1  Doppeltipp-Erkennung (9.1)
#   figurSchritt         KS2  Timer, Zustandsübergänge, Bewegung, Instanz aktiv
#   figurGeschosseSchritt KS4 Raketen g0–g4, Instanzen WG, Haltelage
#   figurHatGetroffen    KS7  Urheberseite (Trefferstopp, Kette, Kosten)
#   griffPruefen         Ende KS7 (Griff am Ende eines LAUF-Frames)
# Der Zustand der Figur steht vollständig in welt.figur (entitaeten.gd Figur).
# Dateien: intern.gd (Eingabe), basis.gd (Aktionswechsel, Bewegung),
# angriffe.gd (Instanzen, aktive Frames), zustaende.gd (Automat), griff.gd,
# waffen.gd.
class_name KernFigur
extends RefCounted


## Nach erzeugeWelt: Figur steht am Start (x, z, blick, lp, waffe, munition
## sind gesetzt, aktion STAND, zustand 1, uhr 1, übrige Felder aus figurNeu).
## Drücke ab Frame 0, zustand nach Kampf 4.1.
static func figurInitialisieren(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurIntern.schwellenSetzen(f, 0, 0, 0)
	KernSchaden.figurZustandSetzen(welt)


## KS1 (Kampf 2.2): welt.eingabe.t1 = T(f−1) und welt.eingabe.neu sind
## gesetzt. Sprint-Erkennung fortschreiben (Kampf 9.1, Feld figur.tipp). Bei
## welt.rahmen.steuerung = 0 wertet die Figur keine Eingaben aus.
static func figurEingabe(welt: KernWelt) -> void:
	KernFigurZustaende.figurKs1(welt)


## KS2 (Kampf 2.2): Timer, Zustandsübergänge nach Kampf 4 (Vorrang 4.2),
## Bewegung mit Begrenzung (Welt 2.2), Angriffsinstanz figur.angriff anlegen
## bzw. fortschreiben und aktiv setzen; Ereignisse SP, KE, WU, AU, WA, AB, K, L.
## Beim Tod in t: figur.tod_t, figur.neueinstieg_n = t+120; in N LP 72, in N+1
## Erscheinen (Kampf 6.5).
static func figurSchritt(welt: KernWelt) -> void:
	KernFigurZustaende.figurKs2(welt)


## KS4 (Kampf 2.2, 8.5, 10.3): Raketen der Figur in g0 bis g4 (Flug,
## Einschlag EX:gn, Explosion RX, Freigabe), Instanzen WG der geworfenen
## Gegner (E+1 bis E+58), Haltelage eines gehaltenen Gegners.
static func figurGeschosseSchritt(welt: KernWelt) -> void:
	KernFigurWaffen.raketenSchritt(welt)
	KernFigurGriff.wurfGeschosseSchritt(welt)


## KS7, Seite des Urhebers (Kampf 5.3, 6.4, 5.6): für jeden wirksamen Treffer
## (t.wirkung ≠ 'W') mit t.urheber = 'f', in Trefferreihenfolge.
static func figurHatGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	KernFigurZustaende.figurUrheberTreffer(welt, t)


## KS7, Ende (Kampf 8.1): Griff am Ende eines LAUF-Frames; Haltelage (P19);
## Ereignis G:F>sn.
static func griffPruefen(welt: KernWelt) -> void:
	KernFigurGriff.griffPruefenIntern(welt)
