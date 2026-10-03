# Seedbarer Zufall nach docs/spezifikation-welt.md, 11.1.
# Port von spiel/src/kern/zufall.ts.
#
# Verfahren: 32-Bit-Xorshift mit den Verschiebungen 13 nach links, 17 nach
# rechts, 5 nach links; Zustand nie 0. Eine Ziehung „gleichverteilt aus n
# Werten“ ist ⌊r · n / 2^32⌋ mit dem neuen Zustand r. Anteile in Prozent
# werden als Ziehung aus 100 mit festen Grenzen umgesetzt (70/25/5 heißt
# 0–69, 70–94, 95–99).
#
# Hauptgenerator: startet mit dem Seed (0 verboten) und liefert nur die
# Startwerte der Generatoren je Gegner (eine Ziehung je Gegner, 0 wird zu 1).
# Jede Entscheidung zieht genau einmal; `ziehungen` zählt mit (Protokoll-
# spalten zufall_haupt und sn_zufall).
class_name KernZufall
extends RefCounted

## Zustand eines Generators.
class Zufall:
	## aktueller Zustand, 1 … 2^32 − 1 (vorzeichenlos)
	var zustand: int = 1
	## Zahl der bisherigen Ziehungen
	var ziehungen: int = 0

## 2^32 (Mathematik: Umfang des Zustandsraums).
const ZWEI_HOCH_32: int = 4294967296
## Maske für 32 Bit.
const MASKE_32: int = 0xffffffff
## Größtes n, für das r · n unter 2^53 bleibt (wie in der TypeScript-Fassung).
const N_MAX: int = 2097152


## Neuer Generator mit Startwert seed (nicht 0; wird als uint32 gelesen).
static func zufallNeu(seed_wert: int) -> Zufall:
	var z: int = seed_wert & MASKE_32
	if z == 0:
		push_error("Seed 0 ist verboten (Welt 11.1)")
	var neu: Zufall = Zufall.new()
	neu.zustand = z
	neu.ziehungen = 0
	return neu


## Ein Xorshift-Schritt ohne Zählung (für Tests und Dokumentation).
static func xorshift32(x: int) -> int:
	var r: int = x & MASKE_32
	r = (r ^ (r << KernWerte.XORSHIFT_LINKS_1)) & MASKE_32
	r = (r ^ (r >> KernWerte.XORSHIFT_RECHTS)) & MASKE_32
	r = (r ^ (r << KernWerte.XORSHIFT_LINKS_2)) & MASKE_32
	return r


## Eine Ziehung: neuer Zustand r (1 … 2^32 − 1), zählt mit.
static func ziehen(z: Zufall) -> int:
	z.zustand = xorshift32(z.zustand)
	z.ziehungen += 1
	return z.zustand


## Gleichverteilt aus n Werten 0 … n−1: ⌊r · n / 2^32⌋ (Welt 11.1). Eine Ziehung.
static func ziehenAus(z: Zufall, n: int) -> int:
	if n < 1 or n > N_MAX:
		push_error("ziehenAus: n muss eine ganze Zahl von 1 bis %d sein, nicht %d" % [N_MAX, n])
		return 0
	var r: int = ziehen(z)
	return (r * n) >> 32


## Gleichverteilt ein Element der Liste (Reihenfolge der Liste zählt). Eine Ziehung.
static func wahl(z: Zufall, liste: Array) -> Variant:
	if liste.is_empty():
		push_error("wahl: leere Liste")
		return null
	var i: int = ziehenAus(z, liste.size())
	return liste[i]


## Gleichverteilt aus von, von + schritt, …, bis (einschließlich). Eine Ziehung.
static func bereich(z: Zufall, von: int, bis: int, schritt: int = 1) -> int:
	if schritt < 1 or bis < von or (bis - von) % schritt != 0:
		push_error("bereich: ungültig von=%d bis=%d schritt=%d" % [von, bis, schritt])
		return von
	var anzahl: int = (bis - von) / schritt + 1
	return von + ziehenAus(z, anzahl) * schritt


## Wahl nach Anteilen in Prozent (Summe 100): Ziehung aus 100, Grenzen in der
## Reihenfolge der Liste (Welt 11.1). Ergebnis ist der Index des Anteils.
static func anteil(z: Zufall, anteile: Array) -> int:
	var summe: int = 0
	for a: int in anteile:
		summe += a
	if summe != KernWerte.ZUFALL_PROZENT:
		push_error("anteil: Summe muss %d sein, nicht %d" % [KernWerte.ZUFALL_PROZENT, summe])
		return 0
	var w: int = ziehenAus(z, KernWerte.ZUFALL_PROZENT)
	var grenze: int = 0
	for i in range(anteile.size()):
		grenze += anteile[i] as int
		if w < grenze:
			return i
	return anteile.size() - 1


## Wahrscheinlichkeit in Prozent: true, wenn die Ziehung aus 100 kleiner als prozentsatz ist.
static func prozent(z: Zufall, prozentsatz: int) -> bool:
	return ziehenAus(z, KernWerte.ZUFALL_PROZENT) < prozentsatz


## Startwert für den Generator eines Gegners: eine Ziehung des Hauptgenerators,
## 0 wird zu 1 (Welt 11.1). Gibt den neuen Generator zurück.
static func gegnerZufall(haupt: Zufall) -> Zufall:
	var r: int = ziehen(haupt)
	var neu: Zufall = Zufall.new()
	neu.zustand = KernWerte.ZUFALL_ERSATZ_NULL if r == 0 else r
	neu.ziehungen = 0
	return neu


## Kopie eines Generators (für Vorschau oder Tests).
static func zufallKopie(z: Zufall) -> Zufall:
	var neu: Zufall = Zufall.new()
	neu.zustand = z.zustand
	neu.ziehungen = z.ziehungen
	return neu
