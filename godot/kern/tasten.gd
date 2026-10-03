# Tasten und Tastenmengen T(f) nach docs/spezifikation-kampf.md, 2.1 und 11.1.
# Port von spiel/src/kern/tasten.ts.
#
# T(f) ist eine Bitmenge der Tasten L R O U A S. P (Pause) gehört nicht zu T.
# Der Logikschritt f wertet T(f−1) aus; ein neuer Druck in f heißt: in T(f),
# nicht in T(f−1). Die Reihenfolge L R O U A S gilt für das Protokoll und die
# Eingabedatei. Der Typ Tasten ist ein int.
class_name KernTasten
extends RefCounted

## Links (x kleiner).
const TASTE_L: int = 1
## Rechts (x größer).
const TASTE_R: int = 2
## Hoch: in der Tiefe nach hinten (z größer).
const TASTE_O: int = 4
## Runter: in der Tiefe nach vorn (z kleiner).
const TASTE_U: int = 8
## Angriff.
const TASTE_A: int = 16
## Sprung.
const TASTE_S: int = 32

## Keine Taste.
const KEINE: int = 0
## Alle Richtungstasten.
const RICHTUNGEN: int = TASTE_L | TASTE_R | TASTE_O | TASTE_U
## Alle Tasten.
const ALLE: int = RICHTUNGEN | TASTE_A | TASTE_S

## Buchstaben in Protokollreihenfolge L R O U A S, als Paare [Buchstabe, Taste].
const TASTEN_REIHENFOLGE: Array = [
	["L", TASTE_L],
	["R", TASTE_R],
	["O", TASTE_O],
	["U", TASTE_U],
	["A", TASTE_A],
	["S", TASTE_S],
]


## Ist die Taste (oder eine der Tasten) in der Menge?
static func hat(t: int, taste: int) -> bool:
	return (t & taste) != 0


## Sind alle genannten Tasten in der Menge?
static func hatAlle(t: int, tasten: int) -> bool:
	return (t & tasten) == tasten


## Neue Drücke: in jetzt, nicht in vorher (Kampf 2.1).
static func neuGedrueckt(jetzt: int, vorher: int) -> int:
	return jetzt & ~vorher & ALLE


## Nur die Richtungstasten.
static func richtungsteil(t: int) -> int:
	return t & RICHTUNGEN


## x-Richtung: +1 für R, −1 für L, 0 ohne oder bei L und R zugleich (Kampf 2.1, P1).
static func richtungX(t: int) -> int:
	var l: bool = hat(t, TASTE_L)
	var r: bool = hat(t, TASTE_R)
	if l == r:
		return 0
	return 1 if r else -1


## Tiefenrichtung: +1 für O (nach hinten, z wächst), −1 für U (nach vorn),
## 0 ohne oder bei O und U zugleich (Kampf 2.1, 2.3, P1).
static func richtungZ(t: int) -> int:
	var o: bool = hat(t, TASTE_O)
	var u: bool = hat(t, TASTE_U)
	if o == u:
		return 0
	return 1 if o else -1


## Text in Protokollreihenfolge, z. B. „RA“; leer ohne Taste (Kampf 11.3).
static func tastenZuText(t: int) -> String:
	var s: String = ""
	for eintrag: Array in TASTEN_REIHENFOLGE:
		if hat(t, eintrag[1] as int):
			s += eintrag[0] as String
	return s


## Text (Buchstaben aus L R O U A S, Reihenfolge beliebig) in eine Tastenmenge (Kampf 11.1).
## Bei einem unbekannten Buchstaben: Fehlermeldung und Rückgabe -1.
static func tastenAusText(text: String) -> int:
	var t: int = KEINE
	for zeichen in text.strip_edges().to_upper():
		var gefunden: bool = false
		for eintrag: Array in TASTEN_REIHENFOLGE:
			if eintrag[0] == zeichen:
				t |= eintrag[1] as int
				gefunden = true
				break
		if not gefunden:
			push_error("Unbekannte Taste „%s“ (erlaubt: L R O U A S)" % zeichen)
			return -1
	return t
