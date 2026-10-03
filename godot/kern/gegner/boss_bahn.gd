# Reaktionen und eigene Bewegungen des Bosses Ballast (K4) nach
# docs/spezifikation-welt.md, 7.1 und 7.4: GETROFFEN (23 Frames, E3, E19),
# UMGEWORFEN mit Flug, LIEGEN und AUFSTEHEN (G = W+97 bis W+125, ohne Schutz
# danach, E4), Wurf, Explosion, TAUMELN nach dem Spezialangriff, Stoß RZ
# (SA5), TOT; dazu die Rückkehr in BEREIT.
# Port von spiel/src/kern/gegner/boss_bahn.ts.
#
# Die Flugbahnen rechnet bahn.gd (bahnStarten, bahnSchritt nach Kampf 5.7)
# mit den Bahndaten des Bosses (BOSS_BAHNEN); das Ende einer Reaktion ist
# gegner/reaktion.gd reaktionBeenden. Die Namen der Bossfunktionen
# tragen das Präfix boss, damit sie nicht mit den gleichartigen Funktionen
# der übrigen Gegner (reaktion.gd) verwechselt werden.
#
# Zustand wie bei K2 (gegner/reaktion.gd, Kopf): Der Trefferframe zeigt die
# Reaktion schon; Zustand 2 gilt beim Umwerfen und beim Tod ab W+1 bzw. t+1,
# im Trefferframe steht 3 (Kampf 7: „2 von W+1 bis G−1“, „2 ab t+1“).
class_name KernGegnerBossBahn
extends RefCounted

# ===========================================================================
# Rückkehr
# ===========================================================================

## Ist der Boss nach einem Stoß noch nicht treffbar (Welt 7.4, SA5: bis 62 Frames nach dessen Beginn)?
static func nachStossUnverwundbar(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var s: int = g.boss.stoss_beginn
	return s > 0 and welt.frame < s + KernWerte.RZ_NICHT_TREFFBAR


## BEREIT (Welt 7.1): steht oder geht, wartet auf den nächsten Angriff; Zustand 1, außer nach einem Stoß (SA5).
static func bereitWerden(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernEntitaeten.modusSetzen(g, "BEREIT")
	g.aktion = "STAND"
	g.phase = ""
	g.angriff_code = ""
	g.bahn = ""
	g.zustand = KernEntitaeten.ZUSTAND_BODEN if nachStossUnverwundbar(welt, g) else KernEntitaeten.ZUSTAND_NORMAL
	g.boss.bahn = ""
	g.boss.art = ""
	g.boss.geh_x = 0
	g.boss.geh_z = 0


# ===========================================================================
# GETROFFEN (Welt 7.1; Kampf 7, E3, E19; SA3)
# ===========================================================================

## GETROFFEN beginnen bzw. neu starten: Zustand 3 von h bis h+22, Stillstand, kein Rückstoß; eigener Angriff abgebrochen.
static func bossGetroffenBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernGegnerBossZustand.eigenenAngriffBeenden(g)
	g.reaktion_h = welt.frame
	KernEntitaeten.modusSetzen(g, "GETROFFEN")
	g.aktion = "GETROFFEN"
	g.zustand = KernEntitaeten.ZUSTAND_REAKTION
	g.phase = ""
	g.angriff_code = ""
	g.boss.wahl = ""


## KS3 in GETROFFEN: frei ab h+23 (Zustand 1). Ist eine Folge der
## Super-Armor offen, bleibt der Boss bis zu ihrer Auflösung in W5 in
## GETROFFEN (SA3) und handelt nicht; sonst Modus FREI, BEREIT ab h+24.
static func bossGetroffenSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if welt.frame - g.reaktion_h < KernWerte.REAKTION_DAUER:
		return
	g.zustand = KernEntitaeten.ZUSTAND_NORMAL
	if g.folge == 0:
		KernGegnerReaktion.reaktionBeenden(g)


# ===========================================================================
# Flugbahnen (Kampf 5.7; Welt 7.1)
# ===========================================================================

## Bahndaten des Bosses (TypeScript: Konstante BOSS_BAHNEN, hier je Aufruf neu
## gebaut, weil GDScript keine Konstante mit Objekten kennt).
static func _bahnDaten(start_h: Variant, nach_boden: int, boden_vx: Variant) -> KernBahn.BahnDaten:
	var d: KernBahn.BahnDaten = KernBahn.BahnDaten.new()
	d.stillstand = KernWerte.F1_STILLSTAND
	d.vx = KernWerte.F1_VX
	d.ax = KernWerte.F1_AX
	d.vh = KernWerte.F1_VH
	d.gh = KernWerte.F1_GH
	d.start_h = start_h
	d.nach_boden = nach_boden
	d.boden_vx = boden_vx
	return d


## Bahnen des Bosses (Welt 7.1). Frames relativ zum Treffer W (Wurf: W =
## E+1). Umwerfen und dritter Kniestoß laufen nach dem Bodenkontakt mit
## 2 px/Frame bis zur Ruhe aus (Umwerfen: Ruhe in W+55 bei 127,25 px;
## Kniestoß: Festlegung K4); die Explosion endet mit dem Bodenkontakt (Flug
## 109,25 px); Wurf und Tod laufen wie F3 und F4.
## Satz = Dictionary mit "bahn" (Bahn nach Kampf 5.7) und "daten" (eigene
## Bahndaten des Bosses, KernBahn.BahnDaten, oder null: die Daten der Bahn
## aus Kampf 5.7 unverändert).
static func _bossBahnen(art: String) -> Dictionary:
	match art:
		"umwerfen":
			return {
				"bahn": "F1",
				"daten": _bahnDaten(null, KernWerte.F1_RUHE - KernWerte.F1_BODEN, KernWerte.BOSS_AUSROLLEN_V),
			}
		"knie":
			return {
				"bahn": "F2",
				"daten": _bahnDaten(KernWerte.F2_START_HOEHE, KernWerte.F2_RUHE - KernWerte.F2_BODEN, KernWerte.BOSS_AUSROLLEN_V),
			}
		"wurf":
			return { "bahn": "F3", "daten": null }
		"explosion":
			return {
				"bahn": "F1",
				"daten": _bahnDaten(null, 0, 0),
			}
		"tod":
			return { "bahn": "F4", "daten": null }
	push_error("Boss: unbekannte Bahnart „%s“" % art)
	return { "bahn": "F1", "daten": null }


## Satz der laufenden Bahn (wirft ohne Bahn).
static func bahnSatz(g: KernEntitaeten.Gegner) -> Dictionary:
	var art: String = g.boss.bahn
	if art == "":
		push_error("Boss %s: Bahnschritt ohne Bahn" % g.schluessel)
		return { "bahn": "F1", "daten": null }
	return _bossBahnen(art)


## Bahn beginnen (Kampf 5.7) am Trefferort; W = g.reaktion_h.
static func bossBahnStarten(g: KernEntitaeten.Gegner, art: String, richtung: int) -> void:
	g.boss.bahn = art
	KernBahn.bahnStarten(g, _bossBahnen(art)["bahn"] as String, richtung)


## Ein Frame der Bahn (Kampf 5.7, bahn.gd bahnSchritt); x stoppt an Wänden,
## Hindernissen und am Arenarand (bossBegrenzung). Beim Wurf in W+21
## losgelassen 13 px vor bzw. hinter der Figur in 59 px Höhe (Kampf 8.4, P19);
## die Tiefe bleibt die der Haltelage (bahn.gd wurfLoslassen, wie bei den
## übrigen Gegnern).
## Rückgabe: true im Frame, in dem die Ruhe erreicht ist, und danach.
static func bossBahnSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var satz: Dictionary = bahnSatz(g)
	var k: int = welt.frame - g.reaktion_h
	KernBahn.wurfLoslassen(welt, g, k)
	return KernBahn.bahnSchritt(g, k, KernGegnerBossZustand.bossBegrenzung(welt), satz["daten"]) == "ruhe"


# ===========================================================================
# UMGEWORFEN, LIEGEN, AUFSTEHEN (Welt 7.1)
# ===========================================================================

## Umwerfen beginnen (Welt 7.1, SA1): Bahn nach dem Treffer (Kettenstufe 4,
## Sprung-, Sprint- und Sprint-Sprungangriff, geworfener Gegner, Landung:
## F1 mit Ruhe bei 127,25 px; dritter Kniestoß F2; Wurf F3; Explosion F1 bis
## zum Bodenkontakt). Frei nach dem Wurf 116 bis 144, nach der Explosion 132
## bis 152 Frames ab dem Treffer, hier gezogen (Welt 11.2); nach den übrigen
## zieht die Ruhe 42 bis 70 Frames für Liegen und Aufstehen.
static func bossUmwerfenBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner, t: KernEntitaeten.Treffer) -> void:
	KernGegnerBossZustand.eigenenAngriffBeenden(g)
	g.boss.wahl = ""
	g.boss.stoss_offen = false
	g.reaktion_h = welt.frame
	KernEntitaeten.modusSetzen(g, "UMGEWORFEN")
	g.aktion = "UMGEWORFEN"
	g.zustand = KernEntitaeten.ZUSTAND_REAKTION
	g.angriff_code = ""
	g.liegedauer = 0
	g.gehalten_von = null
	var art: String = "umwerfen"
	if t.code == "RX":
		art = "explosion"
	elif t.code == "WU" or t.bahn == "F3":
		art = "wurf"
	elif t.bahn == "F2":
		art = "knie"
	bossBahnStarten(g, art, t.richtung)
	g.phase = g.bahn
	g.boss.frei_ab = 0
	if art == "wurf":
		var frei: int = KernZufall.bereich(g.zufall, KernWerte.BOSS_FREI_WURF_VON, KernWerte.BOSS_FREI_WURF_BIS, KernWerte.BOSS_ZUFALL_SCHRITT)
		var fest_wurf: Variant = KernGegnerBossZustand.festZahl(welt, "boss_frei_wurf", KernWerte.BOSS_FREI_WURF_VON, KernWerte.BOSS_FREI_WURF_BIS)
		if fest_wurf != null:
			frei = fest_wurf
		g.boss.frei_ab = welt.frame + frei
	elif art == "explosion":
		var frei: int = KernZufall.bereich(g.zufall, KernWerte.BOSS_FREI_EXPLOSION_VON, KernWerte.BOSS_FREI_EXPLOSION_BIS, KernWerte.BOSS_ZUFALL_SCHRITT)
		var fest_explosion: Variant = KernGegnerBossZustand.festZahl(welt, "boss_frei_explosion", KernWerte.BOSS_FREI_EXPLOSION_VON, KernWerte.BOSS_FREI_EXPLOSION_BIS)
		if fest_explosion != null:
			frei = fest_explosion
		g.boss.frei_ab = welt.frame + frei


## KS3 in UMGEWORFEN, LIEGEN, AUFSTEHEN: Bahn bis zur Ruhe, Liegen, Aufstehen 18 Frames, frei in G (Zustand 1, E4).
static func bossUmwerfenSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.modus == "UMGEWORFEN":
		g.zustand = KernEntitaeten.ZUSTAND_BODEN
		if not bossBahnSchritt(welt, g):
			return
		# Ruhe erreicht
		if g.boss.frei_ab == 0:
			var dauer: int = KernZufall.bereich(g.zufall, KernWerte.BOSS_LIEGEN_VON, KernWerte.BOSS_LIEGEN_BIS, KernWerte.BOSS_ZUFALL_SCHRITT)
			var fest_liegen: Variant = KernGegnerBossZustand.festZahl(welt, "boss_liegen", KernWerte.BOSS_LIEGEN_VON, KernWerte.BOSS_LIEGEN_BIS)
			if fest_liegen != null:
				dauer = fest_liegen
			g.boss.frei_ab = welt.frame + dauer
		g.liegedauer = g.boss.frei_ab - welt.frame - KernWerte.AUFSTEHEN_GEGNER
		KernEntitaeten.modusSetzen(g, "LIEGEN")
		g.aktion = "LIEGEN"
		g.phase = "RX" if g.boss.bahn == "explosion" else g.bahn
	var frei: int = g.boss.frei_ab
	if welt.frame >= frei:
		KernGegnerReaktion.reaktionBeenden(g)
		return
	if g.modus == "LIEGEN" and welt.frame >= frei - KernWerte.AUFSTEHEN_GEGNER:
		KernEntitaeten.modusSetzen(g, "AUFSTEHEN")
		g.aktion = "AUFSTEHEN"


# ===========================================================================
# TOT (Welt 7.4 SA6, 7.6; Kampf 7)
# ===========================================================================

## Tod des Bosses in diesem Frame t (SA6): Bahn F4 in richtung; die Folge zählt (alle Abzüge bleiben).
static func bossTotBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner, richtung: int) -> void:
	KernGegnerBossZustand.eigenenAngriffBeenden(g)
	g.boss.wahl = ""
	g.boss.stoss_offen = false
	g.folge = 0
	g.lp_folge = 0
	g.boss.sa_faellig = 0
	g.tod_t = welt.frame
	g.reaktion_h = welt.frame
	KernEntitaeten.modusSetzen(g, "TOT")
	g.aktion = "TOT"
	g.zustand = KernEntitaeten.ZUSTAND_REAKTION
	g.angriff_code = ""
	g.gehalten_von = null
	bossBahnStarten(g, "tod", richtung)
	g.phase = g.bahn


## KS3 in TOT: Bahn F4 bis zur Ruhe (t+49). Der Slot des Bosses bleibt bis zum
## Ende der Scheibe belegt (Festlegung K4, wie im Vorbild: frei erst nach dem
## Stagewechsel, mechanik „Boss“).
static func bossTodSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if welt.frame > g.tod_t:
		g.zustand = KernEntitaeten.ZUSTAND_BODEN
	bossBahnSchritt(welt, g)


# ===========================================================================
# TAUMELN nach dem Spezialangriff (Welt 7.1)
# ===========================================================================

## TAUMELN beginnen: 78 Frames (h bis h+77) über 135,125 px von der Figur weg,
## kein Liegen, danach (G = h+78) sofort treffbar. Im Taumeln nicht treffbar
## (Zustand 2 ab h+1, Festlegung K4). Verlauf wie der x-Verlauf von F1
## (Stillstand h+1 bis h+8, dann 2,875 px/Frame bis 135,125 px; Festlegung K4).
static func taumelnBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner, t: KernEntitaeten.Treffer) -> void:
	KernGegnerBossZustand.eigenenAngriffBeenden(g)
	g.boss.wahl = ""
	g.boss.stoss_offen = false
	g.reaktion_h = welt.frame
	KernEntitaeten.modusSetzen(g, "TAUMELN")
	g.aktion = "TAUMELN"
	g.zustand = KernEntitaeten.ZUSTAND_REAKTION
	g.angriff_code = ""
	g.phase = ""
	g.bahn_richtung = t.richtung
	g.boss.taumeln_weg = 0


## KS3 in TAUMELN.
static func taumelnSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var n: int = welt.frame - g.reaktion_h
	if n >= KernWerte.BOSS_TAUMELN_DAUER:
		KernGegnerReaktion.reaktionBeenden(g)
		return
	g.zustand = KernEntitaeten.ZUSTAND_BODEN
	if n <= KernWerte.F1_STILLSTAND:
		return
	var weg: int = g.boss.taumeln_weg
	if weg >= KernWerte.BOSS_TAUMELN_WEG:
		return
	var v: int = KernFestkomma.minF(KernWerte.F1_VX, KernFestkomma.sub(KernWerte.BOSS_TAUMELN_WEG, weg))
	g.boss.taumeln_weg = KernFestkomma.add(weg, v)
	KernGegnerBossZustand.bossSchritt(welt, g, KernFestkomma.mulGanz(v, g.bahn_richtung), 0)


# ===========================================================================
# Stoß RZ (Welt 7.3, 7.4 SA5)
# ===========================================================================

## Stoß RZ beginnen (in W5): 54 Frames (S bis S+53), 48 px von der Figur weg,
## in den ersten 16 Frames nach S je 3 px (S+1 bis S+16; Verlauf S2), ohne
## aktive Frames und ohne Schaden, nicht treffbar bis S+61 (62 Frames).
static func stossBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernGegnerBossZustand.eigenenAngriffBeenden(g)
	g.boss.stoss_offen = false
	g.boss.stoss_beginn = welt.frame
	g.boss.stoss_richtung = KernGegnerReaktion.vonFigurWeg(welt, g)
	g.boss.stoss_weg = 0
	KernEntitaeten.modusSetzen(g, "STOSS")
	g.aktion = "STOSS"
	g.zustand = KernEntitaeten.ZUSTAND_BODEN
	g.angriff_code = "RZ"
	g.schaden = 0
	g.phase = ""


## KS3 im Stoß: Rückzug.
static func stossSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var weg: int = g.boss.stoss_weg
	if weg >= KernFestkomma.ausGanz(KernWerte.RZ_WEG):
		return
	var v: int = KernFestkomma.minF(KernWerte.RZ_SCHNELL_V, KernFestkomma.sub(KernFestkomma.ausGanz(KernWerte.RZ_WEG), weg))
	g.boss.stoss_weg = KernFestkomma.add(weg, v)
	KernGegnerBossZustand.bossSchritt(welt, g, KernFestkomma.mulGanz(v, g.boss.stoss_richtung), 0)


## Endet der Stoß in diesem Frame (S+54: BEREIT)?
static func stossVorbei(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	return welt.frame >= g.boss.stoss_beginn + KernWerte.RZ_DAUER
