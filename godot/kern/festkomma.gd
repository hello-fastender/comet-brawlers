# Festkomma 16.16 nach docs/spezifikation-kampf.md, 2.4 (verbindlich nach E12).
# Port von spiel/src/kern/festkomma.ts.
#
# Ein Wert ist eine vorzeichenbehaftete 32-Bit-Ganzzahl; die unteren 16 Bit
# tragen den Nachkommaanteil (Wert = Rohwert ÷ 65536). Alle Positionen,
# Geschwindigkeiten und Beschleunigungen der Logik sind Fest und liegen in
# GDScript als int (64 Bit). Wo TypeScript mit `| 0` auf 32 Bit begrenzt,
# bildet zu32() das nach.
#
# Rechenregeln (Kampf 2.4):
# - add, sub: 32-Bit-Ganzzahlarithmetik.
# - mul: exakter 64-Bit-Zwischenwert, arithmetische Verschiebung um 16
#   (rundet nach −∞).
# - divGanz: nur durch eine positive ganze Zahl, Ergebnis ⌊a/b⌋. Die
#   GDScript-Division `/` auf int rundet zur 0 und ist hier verboten.
# - ausDezimal entfällt: Konstanten stehen in werte.gd als Rohwert.
class_name KernFestkomma
extends RefCounted

## Anzahl der Einheiten je Pixel (2^16, Kampf 2.4).
const EINS: int = 65536
## Halbe Einheit (2^15).
const HALB: int = 32768
## Maske des Nachkommaanteils (2^16 − 1).
const NACHKOMMA_MASKE: int = 0xffff
## 2^32 und 2^31 für das Nachbilden von `| 0`.
const ZWEI_HOCH_32: int = 4294967296
const ZWEI_HOCH_31: int = 2147483648
## 10^16 / 2^16 = 5^16: Faktor für die exakte Dezimaldarstellung.
const FUENF_HOCH_16: int = 152587890625
## Stellen des Nachkommaanteils in der exakten Dezimaldarstellung.
const NACHKOMMA_STELLEN: int = 16


## Begrenzt auf eine vorzeichenbehaftete 32-Bit-Ganzzahl (JavaScript `x | 0`).
static func zu32(x: int) -> int:
	return ((x + ZWEI_HOCH_31) & 0xffffffff) - ZWEI_HOCH_31


## Ganze Pixelzahl als Fest (Nachkommaanteil 0).
static func ausGanz(n: int) -> int:
	return zu32(zu32(n) * EINS)


## Bruch zaehler/nenner als Fest, exakt auf 1/65536 nach −∞ gerundet.
static func ausBruch(zaehler: int, nenner: int) -> int:
	return divGanz(ausGanz(zaehler), nenner)


static func add(a: int, b: int) -> int:
	return zu32(a + b)


static func sub(a: int, b: int) -> int:
	return zu32(a - b)


static func neg(a: int) -> int:
	return zu32(-a)


static func abs(a: int) -> int:
	return zu32(-a if a < 0 else a)


## Produkt zweier Festkommawerte: (a · b) >> 16 mit exaktem Zwischenwert,
## Rundung nach −∞ (Kampf 2.4); das Ergebnis wird auf 32 Bit begrenzt.
static func mul(a: int, b: int) -> int:
	return zu32((a * b) >> 16)


## Produkt mit einer ganzen Zahl (kein Verschieben), 32 Bit.
static func mulGanz(a: int, n: int) -> int:
	return zu32(a * zu32(n))


## Vergleich a·b > c·d für ganze Zahlen (Kampf 2.4: 64-Bit-Zwischenwert).
## Die Faktoren der Aufrufer liegen unter 2^31, die Produkte also unter 2^62.
static func produktGroesser(a: int, b: int, c: int, d: int) -> bool:
	return a * b > c * d


## Ganzzahlige Division ⌊a / b⌋ durch eine positive ganze Zahl b (Kampf 2.4):
## Rundung nach −∞. Gilt für Fest wie für ganze Zahlen (Pixel, LP, Frames).
static func divGanz(a: int, b: int) -> int:
	if b <= 0:
		push_error("divGanz: Divisor muss eine positive ganze Zahl sein, nicht %d" % b)
		return 0
	var q: int = a / b
	if a % b != 0 and a < 0:
		q -= 1
	return q


## Ganzzahliger Anteil ⌊v⌋ (Rundung nach −∞, Kampf 2.3).
static func ganz(a: int) -> int:
	return a >> 16


## Nachkommaanteil als Rohwert 0 … 65535.
static func nachkomma(a: int) -> int:
	return a & NACHKOMMA_MASKE


## Auf den ganzzahligen Anteil abgeschnitten (Nachkommaanteil 0), als Fest.
static func abgerundet(a: int) -> int:
	return a & ~NACHKOMMA_MASKE


## Auf ganze Pixel gerundet (halbe nach +∞); nur für die Darstellung.
static func gerundet(a: int) -> int:
	return (a + HALB) >> 16


## Vergleich: −1, 0 oder +1.
static func vergleich(a: int, b: int) -> int:
	return -1 if a < b else (1 if a > b else 0)


static func gleich(a: int, b: int) -> bool:
	return a == b


static func kleiner(a: int, b: int) -> bool:
	return a < b


static func kleinerGleich(a: int, b: int) -> bool:
	return a <= b


static func groesser(a: int, b: int) -> bool:
	return a > b


static func groesserGleich(a: int, b: int) -> bool:
	return a >= b


static func minF(a: int, b: int) -> int:
	return a if a < b else b


static func maxF(a: int, b: int) -> int:
	return a if a > b else b


## Vorzeichen −1, 0 oder +1.
static func vorzeichen(a: int) -> int:
	return -1 if a < 0 else (1 if a > 0 else 0)


## Exakte Dezimaldarstellung ohne überflüssige Nullen und ohne „-0“
## (Kampf 11.3), z. B. 135.125, 51.25, 100, -0.5.
static func zuDezimalText(f: int) -> String:
	var roh: int = zu32(f)
	var negativ: bool = roh < 0
	var betrag: int = -roh if negativ else roh
	var ganz_teil: int = betrag >> 16
	var bruch: int = betrag & 0xffff
	var text: String = str(ganz_teil)
	if bruch != 0:
		var ziffern: String = str(bruch * FUENF_HOCH_16).lpad(NACHKOMMA_STELLEN, "0")
		while ziffern.ends_with("0"):
			ziffern = ziffern.substr(0, ziffern.length() - 1)
		text += "." + ziffern
	if negativ and betrag != 0:
		return "-" + text
	return text
