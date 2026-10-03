# Ereignisse eines Frames nach docs/spezifikation-kampf.md, 11.4 und
# docs/spezifikation-welt.md, 11.4.
# Port von spiel/src/kern/ereignisse.ts.
#
# Ein Eintrag besteht aus Feldern, getrennt durch „:“; die Einträge eines
# Frames stehen in der Reihenfolge ihres Eintretens im Logikschritt und
# werden im Protokoll durch „;“ getrennt (Spalte ereignis). Beteiligte: F
# (Figur), sn, on, gn. welt.gd leert welt.ereignisse zu Beginn jedes Schritts.
#
# Verwendung (TypeScript: ereignis(welt, 'KE', 'F', 2)):
#   KernEreignisse.ereignis(welt, ["KE", "F", 2])      → „KE:F:2“
#   KernEreignisse.ereignis(welt, ["WL", 7])           → „WL:7“
#   KernEreignisse.ereignisTreffer(welt, t)            → „T:F>s0:KT1:3:R“
# Die Felder stehen in einem Array (GDScript hat keine variable Argumentzahl).
# Felder dürfen kein „,“, „;“ oder „:“ enthalten.
class_name KernEreignisse
extends RefCounted

## Kennungen der Einträge (Kampf 11.4, Welt 11.4).
const EREIGNIS: Dictionary = {
	## T:Angreifer>Ziel:Angriff:Schaden:Wirkung, Treffer
	"TREFFER": "T",
	## K:F:Betrag, Kosten des Spezialangriffs
	"KOSTEN": "K",
	## G:F>sn, Griff
	"GRIFF": "G",
	## L:sn, Losreißen
	"LOSREISSEN": "L",
	## WU:F>sn:V oder R, Wurf
	"WURF": "WU",
	## AU:F>on:Art, Aufnehmen
	"AUFNEHMEN": "AU",
	## WA:F:Art:Munition, Waffe fallen gelassen
	"WAFFE_FALLEN": "WA",
	## AB:gn, Abschuss
	"ABSCHUSS": "AB",
	## EX:gn, Einschlag einer Rakete
	"EINSCHLAG": "EX",
	## SP:F:n, Sprintbeginn
	"SPRINT": "SP",
	## KE:F:k, Kettenstufe k beginnt
	"KETTE": "KE",
	## FR:sn, Slot frei
	"FREI": "FR",
	## EI:Beschreibung, Eingriff ausgeführt
	"EINGRIFF": "EI",
	## WL:n, Welle ausgelöst
	"WELLE": "WL",
	## WK:sn, Weckreiz, Auftritt beginnt
	"WECKREIZ": "WK",
	## RE:sn:L oder R, Recht erhalten
	"RECHT_ERHALTEN": "RE",
	## RA:sn, Recht abgegeben
	"RECHT_ABGEGEBEN": "RA",
	## ZR:sn, Zielrecht erhalten
	"ZIELRECHT": "ZR",
	## AS:sn:Code, Angriffsbeginn A
	"ANGRIFF": "AS",
	## AA:sn, Abbruch
	"ABBRUCH": "AA",
	## SR:id, Sperre gibt frei
	"SPERRE_FREI": "SR",
	## HR:id, Halt gibt frei
	"HALT_FREI": "HR",
	## BL:a, BL:v, BL:e, Blende ausgelöst, Versetzen, Ende
	"BLENDE": "BL",
	## SA:s0:lp, Super-Armor springt auf lp zurück
	"SUPER_ARMOR": "SA",
	## BF:s0, Fall des Bosses, alle besiegt
	"BOSS_FALL": "BF",
	## ER:on:Art, Gegenstand erscheint
	"ERSCHEINT": "ER",
	## LA:on, Gegenstand gelandet
	"GELANDET": "LA",
	## EN:on:L, S oder E, Gegenstand entfernt (Liegezeit, Scrollen, Stage-Ende)
	"ENTFERNT": "EN",
	## NE:F, Neueinstieg
	"NEUEINSTIEG": "NE",
	## GO, Game Over
	"GAME_OVER": "GO",
	## SC, STAGE CLEAR
	"STAGE_CLEAR": "SC",
	## OV:Art, kein Objektslot frei, Objekt entsteht nicht (Welt 9.1; Kennung festgelegt von K0)
	"OBJEKT_VOLL": "OV",
}


## Hängt einen Eintrag aus den Feldern (Strings oder ganze Zahlen) an die
## Ereignisliste des Frames. welt hat das Feld ereignisse (Array von String).
static func ereignis(welt: Object, felder: Array) -> void:
	var texte: PackedStringArray = PackedStringArray()
	for f: Variant in felder:
		var t: String = str(f)
		for zeichen in [",", ";", ":", "\n", "\r"]:
			if t.contains(zeichen):
				push_error("Ereignisfeld „%s“ enthält ein Trennzeichen" % t)
		texte.append(t)
	(welt.ereignisse as Array).append(":".join(texte))


## „A>Z“ für Griff, Wurf, Aufnehmen und Treffer.
static func pfeil(a: String, z: String) -> String:
	return "%s>%s" % [KernEntitaeten.beteiligter(a), KernEntitaeten.beteiligter(z)]


## Treffereintrag T:Angreifer>Ziel:Angriff:Schaden:Wirkung (Kampf 11.4); t.wirkung muss gesetzt sein.
static func ereignisTreffer(welt: Object, t: KernEntitaeten.Treffer) -> void:
	if t.wirkung == "":
		push_error("ereignisTreffer: wirkung ist nicht gesetzt")
	ereignis(welt, [EREIGNIS["TREFFER"], pfeil(t.angreifer, t.ziel), t.code, t.schaden, t.wirkung])


## Beschreibung eines Eingriffs für EI (ohne Trennzeichen): Zeichen , ; : und Leerraum werden zu _.
static func eingriffText(ziel: String, feld: String, wert: String) -> String:
	var s: String = "%s.%s=%s" % [ziel, feld, wert]
	var ergebnis: String = ""
	for zeichen in s:
		if zeichen in [",", ";", ":", " ", "\t", "\n", "\r"]:
			ergebnis += "_"
		else:
			ergebnis += zeichen
	return ergebnis
