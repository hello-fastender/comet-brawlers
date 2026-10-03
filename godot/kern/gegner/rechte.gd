# Abgabe der Rechte nach docs/spezifikation-welt.md, 5.7 (Nahkampfrechte,
# E-4) und 6 (Zielrecht): gemeinsam für die Gegnerlogik (nah.gd, fern.gd)
# und die Trefferreaktion (reaktion.gd), ohne Importzyklus zwischen ihnen.
# Anfordern, Prüfen der Halter und E-10 stehen in nah.gd (rechteSchritt,
# rechtAnfordern, zielrechtAnfordern, rechteGesperrt).
# Port von spiel/src/kern/gegner/rechte.ts.
class_name KernGegnerRechte
extends RefCounted


## Serie und Gruppe zurücksetzen (Welt 5.6): beim Verlust des Nahkampfrechts.
## Die Zähler gruppe_aktiv, letzter_ba und serie_ende in g.timer führt nah.gd.
static func serieZuruecksetzen(g: KernEntitaeten.Gegner) -> void:
	g.serie = false
	g.gruppe_rest = 0
	g.gruppe_umwerf = ""
	g.timer["gruppe_aktiv"] = 0
	g.timer["letzter_ba"] = 0
	g.timer["serie_ende"] = 0


## Gibt das Nahkampfrecht ab (E-4) und beendet die Serie (5.6). Ein Slot in
## welt.rechte, der noch auf g zeigt, wird immer frei; das Ereignis RA:sn steht
## nur, wenn g das Recht gehalten hat (g.recht nicht leer).
static func rechtAbgeben(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if welt.rechte.r == g.nr:
		welt.rechte.r = null
	if welt.rechte.l == g.nr:
		welt.rechte.l = null
	if g.recht == "":
		return
	g.recht = ""
	serieZuruecksetzen(g)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["RECHT_ABGEGEBEN"], g.schluessel])


## Gibt das Zielrecht ab (Welt 6; ohne Ereignis, RA gilt dem Nahkampfrecht).
static func zielrechtAbgeben(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if welt.rechte.ziel == g.nr:
		welt.rechte.ziel = null
	g.zielrecht = false


## Rechte beim Beginn einer Reaktion (Kampf 7; Welt 5.7 E-4, 6): GETROFFEN
## behält das Nahkampfrecht, Umwerfen, Greifen (auch Werfen, der Geworfene ist
## gehalten) und Tod geben es ab; das Zielrecht endet mit jeder Reaktion.
## reaktion ist eine der Reaktionen aus Kampf 7 (String).
static func rechteBeiReaktion(welt: KernWelt, g: KernEntitaeten.Gegner, reaktion: String) -> void:
	zielrechtAbgeben(welt, g)
	if reaktion != "GETROFFEN":
		rechtAbgeben(welt, g)
