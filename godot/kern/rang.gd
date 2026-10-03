# Rang nach docs/spezifikation-welt.md, Abschnitt 8 (K3, Stufe 2): Start 9,
# +1 bei Rang-Uhr r = 409 + 600·k, höchstens 24; −3 im Frame N des
# Neueinstiegs (Kampf 6.5), mindestens 7; Stillstand bei rang.fest (Welt
# 11.3), in der Pause (dort läuft kein Logikschritt) und ab dem Frame nach
# dem Fall des Bosses.
# Port von spiel/src/kern/rang.ts.
#
# Festlegung K3: rang.fest hält den Rang ganz fest, auch beim Tod der Figur
# (Welt 11.3: „rang.fest hält ihn“).
# Festlegung Q1: der Anstieg nutzt eine Division (rangAnstieg), die Kampf 2.4
# noch nicht aufzählt (Lücke, Bericht).
class_name KernRang
extends RefCounted


## Ist r ein Anstiegszeitpunkt r = 409 + 600·k mit k ≥ 0 (Welt 8)? Die
## Division ⌊(r − 409)/600⌋ ist eine Lücke in der Liste von Kampf 2.4
## (Festlegung Q1): Der Eingriff rang.zaehler (Welt 11.3) setzt r beliebig,
## ein mitgeführter Zähler für den nächsten Anstieg wäre doppelter Zustand,
## der bei jedem Setzen von r wieder eine Division oder Schleife bräuchte.
static func rangAnstieg(r: int) -> bool:
	if r < KernWerte.RANG_ERSTER_ANSTIEG:
		return false
	var k: int = KernFestkomma.divGanz(r - KernWerte.RANG_ERSTER_ANSTIEG, KernWerte.RANG_TAKT)
	return r == KernWerte.RANG_ERSTER_ANSTIEG + k * KernWerte.RANG_TAKT


## Rang nach dem Tod: −3, mindestens 7 (Welt 8).
static func rangNachTod(rang: int) -> int:
	return maxi(KernWerte.RANG_MIN, rang - KernWerte.RANG_TOD)


## Steht die Rang-Uhr in diesem Frame (rang.fest oder nach dem Fall des Bosses, Welt 8)?
static func rangUhrSteht(welt: KernWelt) -> bool:
	if welt.rang.fest:
		return true
	var t: int = welt.rahmen.boss_t
	return t > 0 and welt.frame > t


## W2: Rang-Uhr welt.rang.zaehler und Rang welt.rang.rang; Rang −3 im Frame N
## (welt.figur.neueinstieg_n, gesetzt von K1 beim Tod; sonst t+120), auch beim letzten Tod
## (mechanik „Schaden der Gegner“: zur selben Zeit, obwohl kein Neueinstieg folgt).
static func rangSchritt(welt: KernWelt) -> void:
	if rangUhrSteht(welt):
		return
	var r: KernWelt.RangZustand = welt.rang
	r.zaehler += 1
	if rangAnstieg(r.zaehler):
		r.rang = mini(KernWerte.RANG_MAX, r.rang + 1)
	var n: int = KernRahmen.neueinstiegN(welt.figur)
	if n > 0 and welt.frame == n:
		r.rang = rangNachTod(r.rang)


## Rangstufe I bis IV als Index 0 bis 3 (Welt 8: I = 7, II = 8 bis 14,
## III = 15 bis 21, IV = 22 bis 24), für Schadenstabellen in werte.gd.
## Gemeinsame Hilfsfunktion (K0), auch für K4.
static func rangstufe(rang: int) -> int:
	var stufe: int = 0
	for i in range(KernWerte.RANGSTUFE_AB.size()):
		if rang >= KernWerte.RANGSTUFE_AB[i]:
			stufe = i
	return stufe
