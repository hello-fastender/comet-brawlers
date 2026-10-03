# Anzeige-Daten, Punkte, Leben, Phasen, Stage-Ende und Game Over nach
# docs/spezifikation-welt.md, Abschnitt 10 (K3, Stufe 2).
# Port von spiel/src/kern/rahmen.ts.
#
# Ablauf im Frame (welt.gd logikSchritt ruft die drei Schritte direkt auf):
#   W4 (Anfang) rahmenVorlauf  steuerung für diesen Frame (die Figur liest sie in KS1)
#   W5          rahmenW5       Fall des Bosses (boss_t), Punkte, Gegneranzeige
#   W8          rahmenSchritt  Leben −1 und NE:F im Frame N, GO, Phase, SC, Ende
#
# Festlegungen K3 (Lücken, Bericht):
# - steuerung ist 0 von t+1 bis LN+5 (Tod), von c+1 bis c+134 (Blende), ab
#   dem Frame nach dem Fall des Bosses und im Game Over; in t selbst 1.
# - GAME OVER beginnt im Frame N des letzten Todes (Leben 0, Ereignis GO statt
#   NE:F); nach 240 Frames (Frame N+239) ist die Scheibe beendet, die
#   Darstellung beginnt neu mit Seed + 1.
# - Punkte für besiegte Gegner im Frame t, in dem die LP unter 0 fallen (auch
#   durch einen Eingriff), außer ohne_punkte (Fall des Bosses, Welt 7.6).
#   Eine Puppe zählt nach ihrer Rolle (leicht wie Bolzer, schwer wie Rammbock).
#
# Hinweise zum Port: Phase ist ein String. Der TypeScript-Standardwert
# `f = welt.frame` (steuerungBerechnen, phaseBerechnen) ist ein Variant-
# Parameter (null = welt.frame). Die lokale Variable `anzeige` in rahmenW5
# heißt hier anzeige_nr (die Funktion anzeige gibt es in derselben Klasse).
class_name KernRahmen
extends RefCounted

## Letzter Frame der Kamera-Blende ab c (KA13: c+1 bis c+134).
const BLENDE_LETZTER: int = KernWerte.BLENDE_ZU + KernWerte.BLENDE_SCHWARZ + KernWerte.BLENDE_AUF

# ===========================================================================
# Tod, Neueinstieg, Blende: gemeinsame Abfragen (auch für nah.gd, kamera.gd)
# ===========================================================================

## Neueinstieg N zum letzten Tod: figur.neueinstieg_n, wenn K1 ihn für diesen
## Tod gesetzt hat (nach t), sonst t + 120 (Kampf 6.5, E16); 0 ohne Tod.
static func neueinstiegN(f: KernEntitaeten.Figur) -> int:
	if f.tod_t <= 0:
		return f.neueinstieg_n
	return f.neueinstieg_n if f.neueinstieg_n > f.tod_t else f.tod_t + KernWerte.NEUEINSTIEG_NACH_TOD


## Landung LN des laufenden Neueinstiegs: figur.landung_ln, wenn K1 sie für
## diesen Tod gesetzt hat (größer als N), sonst N + 53 (Kampf 6.5).
static func landungLN(f: KernEntitaeten.Figur) -> int:
	var n: int = neueinstiegN(f)
	if n <= 0:
		return 0
	return f.landung_ln if f.landung_ln > n else n + KernWerte.NEUEINSTIEG_LANDUNG


## Letzter Frame der Landung nach dem Neueinstieg: LN+5 (Kampf 4.3, Welt 10.3).
static func landungEnde(f: KernEntitaeten.Figur) -> int:
	var ln: int = landungLN(f)
	return ln + KernWerte.NEUEINSTIEG_LANDUNG_DAUER - 1 if ln > 0 else 0


## Läuft im Frame f die Kamera-Blende (c+1 bis c+134, KA13)? f = null heißt welt.frame.
static func blendeLaeuft(welt: KernWelt, f: Variant = null) -> bool:
	return KernKamera.kameraBlende(welt, f)


## Ist die Figur im Frame f zwischen Tod t und Ende der Landung LN+5 (einschließlich t)?
static func imTodeszyklus(f: KernEntitaeten.Figur, frame: int) -> bool:
	return f.tod_t > 0 and frame >= f.tod_t and frame <= landungEnde(f)


# ===========================================================================
# Steuerung und Phase
# ===========================================================================

## steuerung für den Frame f (Welt 10.3, 10.5, 11.4, KA13): 1 wertet Eingaben aus, 0 nicht.
## f = null heißt welt.frame.
static func steuerungBerechnen(welt: KernWelt, f: Variant = null) -> int:
	var frame: int = welt.frame if f == null else (f as int)
	var r: KernWelt.RahmenZustand = welt.rahmen
	if r.gameover_frame > 0:
		return 0
	if r.boss_t > 0 and frame > r.boss_t:
		return 0
	var fig: KernEntitaeten.Figur = welt.figur
	if imTodeszyklus(fig, frame) and frame > fig.tod_t:
		return 0
	if blendeLaeuft(welt, frame):
		return 0
	return 1


## Phase für den Frame f (Welt 10.3 bis 10.5, 11.4). f = null heißt welt.frame.
static func phaseBerechnen(welt: KernWelt, f: Variant = null) -> String:
	var frame: int = welt.frame if f == null else (f as int)
	var r: KernWelt.RahmenZustand = welt.rahmen
	if r.gameover_frame > 0 and frame >= r.gameover_frame:
		return "GAMEOVER"
	if r.boss_t > 0 and frame >= r.boss_t:
		return "ENDE"
	var fig: KernEntitaeten.Figur = welt.figur
	if imTodeszyklus(fig, frame):
		return "TOD" if frame < neueinstiegN(fig) else "NEUEINSTIEG"
	if blendeLaeuft(welt, frame):
		return "BLENDE"
	return "SPIEL"


## Anfang von W4 (vor KS1): steuerung und Phase für diesen Frame setzen. Die
## Figur liest welt.rahmen.steuerung in KS1 (Kampf 2.2).
static func rahmenVorlauf(welt: KernWelt) -> void:
	welt.rahmen.steuerung = steuerungBerechnen(welt)
	welt.rahmen.phase = phaseBerechnen(welt)


# ===========================================================================
# Punkte und Gegneranzeige (W5)
# ===========================================================================

## Punkte eines besiegten Gegners (Welt 10.2); Puppe nach ihrer Rolle.
static func punkteFuerGegner(g: KernEntitaeten.Gegner) -> int:
	match g.typ:
		"Bolzer":
			return KernWerte.PUNKTE_BOLZER
		"Rammbock":
			return KernWerte.PUNKTE_RAMMBOCK
		"Zünder":
			return KernWerte.PUNKTE_ZUENDER
		"Ballast":
			return KernWerte.PUNKTE_BALLAST
		_:
			if g.rolle == "schwer":
				return KernWerte.PUNKTE_RAMMBOCK
			if g.rolle == "fern":
				return KernWerte.PUNKTE_ZUENDER
			if g.rolle == "boss":
				return KernWerte.PUNKTE_BALLAST
			return KernWerte.PUNKTE_BOLZER


## Punkte gutschreiben (z. B. K1: Essen bei 72 LP in P+1, Welt 10.2).
static func punkteAddieren(welt: KernWelt, punkte: int) -> void:
	welt.rahmen.punkte += punkte


## W5 (Welt 1, 10.1, 10.2): Fall des Bosses merken (welt.rahmen.boss_t,
## Phase ENDE ab t), Punkte für Treffer der Figur (10 je LP Schaden, auch über
## die Rest-LP und bei vorläufigen Treffern auf den Boss), Punkte für besiegte
## Gegner im Frame t (nicht bei ohne_punkte), Gegneranzeige (kleinster Slot
## der in diesem Frame von einer Handlung der Figur getroffenen Gegner; Name
## und LP gemerkt, die LP folgen dem Gegner bis zu seinem Tod bzw. bis sein
## Slot frei wird, Welt 10.1).
static func rahmenW5(welt: KernWelt) -> void:
	var r: KernWelt.RahmenZustand = welt.rahmen
	var boss: KernEntitaeten.Gegner = welt.gegner[KernWerte.BOSS_SLOT]
	if r.boss_t == 0 and boss.belegt and boss.typ == "Ballast" and boss.lp < 0:
		r.boss_t = welt.frame
		r.phase = "ENDE"
	var anzeige_nr: Variant = null
	for t: KernEntitaeten.Treffer in welt.treffer:
		if t.urheber != "f" or not KernEntitaeten.istGegnerSlot(t.ziel):
			continue
		if t.wirkung != "R" and t.wirkung != "U" and t.wirkung != "X":
			continue
		r.punkte += KernWerte.PUNKTE_JE_LP * t.schaden
		var nr: int = t.ziel.substr(1).to_int()
		if t.schaden > 0 and (anzeige_nr == null or nr < (anzeige_nr as int)):
			anzeige_nr = nr
	if anzeige_nr != null:
		var ga: KernEntitaeten.Gegner = welt.gegner[anzeige_nr as int]
		r.anzeige = anzeige_nr
		r.anzeige_typ = ga.typ
		r.anzeige_lp = ga.lp
		r.anzeige_lebt = ga.lp >= 0
	elif r.anzeige != null and r.anzeige_lebt:
		var gb: KernEntitaeten.Gegner = welt.gegner[r.anzeige as int]
		if gb.belegt:
			r.anzeige_lp = gb.lp
			r.anzeige_lebt = gb.lp >= 0
		else:
			r.anzeige_lp = 0
			r.anzeige_lebt = false
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt or g.ohne_punkte:
			continue
		if g.lp < 0 and g.lp_vor >= 0:
			r.punkte += punkteFuerGegner(g)


# ===========================================================================
# Leben, Phasen, Ende (W8)
# ===========================================================================

## W8 (Welt 10.3 bis 10.5): Leben −1 und NE:F im Frame N (beim letzten Leben
## GO und GAME OVER), Phase, STAGE CLEAR (SC) in t+120, Ende der Scheibe in
## t+585 bzw. nach 240 Frames GAME OVER: welt.beendet = true.
static func rahmenSchritt(welt: KernWelt) -> void:
	var r: KernWelt.RahmenZustand = welt.rahmen
	var f: int = welt.frame
	var n: int = neueinstiegN(welt.figur)
	if n > 0 and f == n and r.gameover_frame == 0:
		r.leben = maxi(0, r.leben - 1)
		if r.leben > 0:
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["NEUEINSTIEG"], "F"])
		else:
			r.gameover_frame = f
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["GAME_OVER"]])
	r.phase = phaseBerechnen(welt)
	if r.boss_t > 0:
		if f == r.boss_t + KernWerte.STAGE_CLEAR_NACH:
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["STAGE_CLEAR"]])
		if f >= r.boss_t + KernWerte.STAGE_ENDE_NACH:
			welt.beendet = true
	if r.gameover_frame > 0 and f >= r.gameover_frame + KernWerte.GAMEOVER_DAUER - 1:
		welt.beendet = true


# ===========================================================================
# Anzeige-Daten für die Darstellung (Welt 10.1), nur lesend
# ===========================================================================

## Ein LP-Balken in Lagen (Welt 10.1): Lage n zeigt breite px in Farbe n über einem vollen Balken in Farbe unterlage (0 = keiner).
class Balken:
	var lage: int = 0
	var breite: int = 0
	var unterlage: int = 0


## Inhalt der Anzeigeleiste und der Texte (Welt 10.1, 10.3, 10.5); ganze Zahlen, keine Logik.
class AnzeigeDaten:
	var name: String = ""
	## 8 Ziffern mit führenden Nullen
	var punkte: String = ""
	var leben: int = 0
	var figur: Balken = null
	## Gegneranzeige: Slot, Name und Balken des zuletzt von der Figur getroffenen Gegners
	## (Welt 10.1); null = keine, sonst Dictionary mit den Schlüsseln slot (int),
	## name (String) und balken (Balken)
	var gegner: Variant = null
	var pfeil: bool = false
	## große Texte in der Bildmitte (STAGE CLEAR, BALLAST BESIEGT 5000, GAME OVER), Array von String
	var texte: Array = []
	## Deckung der Blende 0 (offen) bis BLENDE_ZU (schwarz), Kamera-Blende oder Stage-Ende
	var blende: int = 0


## Name der Heldin in der Anzeige (Welt 10.1).
const NAME_HELDIN: String = "VELA"


## Balken in Lagen für LP (Welt 10.1): bei LP ≤ 0 leer; n = ⌈LP/72⌉.
static func balken(lp: int) -> Balken:
	var b: Balken = Balken.new()
	if lp <= 0:
		b.lage = 0
		b.breite = 0
		b.unterlage = 0
		return b
	var lage: int = 1
	while lp > lage * KernWerte.LP_BALKEN_BREITE:
		lage += 1
	b.lage = lage
	b.breite = lp - KernWerte.LP_BALKEN_BREITE * (lage - 1)
	b.unterlage = lage - 1
	return b


static func blendeDeckung(welt: KernWelt) -> int:
	var f: int = welt.frame
	var c: int = welt.kamera.blende_c
	if blendeLaeuft(welt):
		var d: int = f - c
		if d <= KernWerte.BLENDE_ZU:
			return d
		if d <= KernWerte.BLENDE_ZU + KernWerte.BLENDE_SCHWARZ:
			return KernWerte.BLENDE_ZU
		return BLENDE_LETZTER - d + 1
	var t: int = welt.rahmen.boss_t
	if t > 0 and f >= t + KernWerte.STAGE_ENDE_ENTFERNEN:
		var d2: int = f - (t + KernWerte.STAGE_ENDE_ENTFERNEN) + 1
		return KernWerte.STAGE_ENDE_BLENDE if d2 >= KernWerte.STAGE_ENDE_BLENDE else d2
	return 0


## Anzeige-Daten des zuletzt gelaufenen Frames (Welt 10.1).
static func anzeige(welt: KernWelt) -> AnzeigeDaten:
	var r: KernWelt.RahmenZustand = welt.rahmen
	var texte: Array = []
	if r.boss_t > 0 and welt.frame >= r.boss_t + KernWerte.STAGE_CLEAR_NACH and welt.frame < r.boss_t + KernWerte.STAGE_ENDE_ENTFERNEN + KernWerte.STAGE_ENDE_BLENDE:
		texte.append("STAGE CLEAR")
		texte.append("BALLAST BESIEGT %d" % KernWerte.PUNKTE_BALLAST)
	if r.phase == "GAMEOVER":
		texte.append("GAME OVER")
	var gegner: Variant = null
	if r.anzeige != null:
		gegner = {"slot": r.anzeige, "name": r.anzeige_typ.to_upper(), "balken": balken(r.anzeige_lp)}
	var a: AnzeigeDaten = AnzeigeDaten.new()
	a.name = NAME_HELDIN
	a.punkte = str(r.punkte).lpad((KernWerte.ANZEIGE["punkte"] as Dictionary)["ziffern"] as int, "0")
	a.leben = r.leben
	a.figur = balken(welt.figur.lp)
	a.gegner = gegner
	a.pfeil = welt.kamera.pfeil == 1
	a.texte = texte
	a.blende = blendeDeckung(welt)
	return a
