# Eingabedatei nach docs/spezifikation-kampf.md, 11.1.
# Port von spiel/src/pruef/eingabe.ts.
#
# Textdatei, UTF-8, Zeilenende LF. Zeilen mit # sind Kommentare. Jede
# Datenzeile: von,bis,tasten mit Buchstaben aus L R O U A S (Reihenfolge
# beliebig), gedrückt in allen Frames von bis bis einschließlich.
# Überlappende Zeilen werden vereinigt; nicht genannte Frames haben keine
# Taste. Die Aufzeichnung schreibt je Lauf gleicher Tastenmengen eine Zeile,
# aufsteigend nach von. Ohne Dateizugriff (auch für die Darstellung).
#
# Abweichung des Ports: throw wird zu push_error; die fehlerhafte Zeile wird
# übersprungen.
class_name PruefEingabe
extends RefCounted


## Gelesene Eingabedatei: T(f) für jeden Frame.
class Eingabefolge:
	## Tastenmenge je Frame (int); Index = Frame, Index 0 unbenutzt
	var tasten: Array = []
	## größter genannter Frame (0 ohne Datenzeile)
	var letzter: int = 0


## Liest eine Eingabedatei (Kampf 11.1). Meldet fehlerhafte Zeilen (push_error)
## und überspringt sie.
static func parseEingabe(text: String) -> Eingabefolge:
	# Läufe: Array von Dictionary { von, bis, t }
	var laeufe: Array = []
	var ohne_bom: String = text.substr(1) if text.begins_with("﻿") else text
	var zeilen: PackedStringArray = ohne_bom.split("\n")
	for i in range(zeilen.size()):
		var roh: String = zeilen[i]
		if roh.ends_with("\r"):
			roh = roh.substr(0, roh.length() - 1)
		var zeile: String = KernStage.trimmen(roh)
		if zeile == "" or zeile.begins_with("#"):
			continue
		var m: RegExMatch = KernStage.regexTreffer("^(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*([A-Za-z]*)$", zeile)
		if m == null:
			push_error("Eingabe Zeile %d: erwartet „von,bis,tasten“, gelesen „%s“" % [i + 1, zeile])
			continue
		var von: int = m.get_string(1).to_int()
		var bis: int = m.get_string(2).to_int()
		if von < 1 or bis < von:
			push_error("Eingabe Zeile %d: von muss ≥ 1 und bis ≥ von sein" % [i + 1])
			continue
		var t: int = KernTasten.tastenAusText(m.get_string(3))
		if t < 0:
			push_error("Eingabe Zeile %d: Unbekannte Taste in „%s“" % [i + 1, m.get_string(3)])
			continue
		laeufe.append({"von": von, "bis": bis, "t": t})
	var letzter: int = 0
	for l: Dictionary in laeufe:
		if (l["bis"] as int) > letzter:
			letzter = l["bis"]
	var tasten: Array = []
	tasten.resize(letzter + 1)
	tasten.fill(KernTasten.KEINE)
	for l: Dictionary in laeufe:
		for f in range(l["von"] as int, (l["bis"] as int) + 1):
			tasten[f] = (tasten[f] as int) | (l["t"] as int)
	var folge: Eingabefolge = Eingabefolge.new()
	folge.tasten = tasten
	folge.letzter = letzter
	return folge


## T(f) aus der Eingabefolge; nicht genannte Frames haben keine Taste.
static func tastenIn(folge: Eingabefolge, f: int) -> int:
	if f < 0 or f >= folge.tasten.size():
		return KernTasten.KEINE
	return folge.tasten[f]


## Schreibt eine Eingabedatei (Kampf 11.1) aus T(1) bis T(bis): je Lauf
## gleicher, nicht leerer Tastenmengen eine Zeile, aufsteigend nach von.
## tastenVon: Callable (Frame: int) -> int.
static func eingabeText(tastenVon: Callable, bis: int, kommentar: String = "") -> String:
	var zeilen: PackedStringArray = PackedStringArray()
	if kommentar != "":
		for k: String in kommentar.split("\n"):
			zeilen.append("# %s" % k)
	var f: int = 1
	while f <= bis:
		var t: int = tastenVon.call(f)
		var ende: int = f
		while ende + 1 <= bis and (tastenVon.call(ende + 1) as int) == t:
			ende += 1
		if t != KernTasten.KEINE:
			zeilen.append("%d,%d,%s" % [f, ende, KernTasten.tastenZuText(t)])
		f = ende + 1
	return "" if zeilen.size() == 0 else "\n".join(zeilen) + "\n"
