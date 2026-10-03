# Angriffe des Bosses Ballast (K4) nach docs/spezifikation-welt.md, 7.2 und
# 7.3: Rhythmus und Wahl im Entscheidungsframe, Armschwung AS (E18),
# Ansturm AN (wirft um, ohne Griff, E10, E21), Körperpresse KP; Instanzen
# nach dem Vertrag (entitaeten.gd angriffsinstanz), geprüft von treffer.gd.
# Port von spiel/src/kern/gegner/boss_angriffe.ts.
#
# Ablauf:
#   W4   angriffEntscheiden: fällig (frame ≥ naechster_angriff), Wahl mit einer
#        Ziehung (Entscheidungsframe), Annäherung für den Armschwung, Beginn
#   KS3  angriffSchritt: Ausholen bzw. Hocke (ANKUENDIGUNG), aktive Frames
#        (ANGRIFF, instanz.aktiv), Nachlauf (NACHLAUF)
#   KS7  angriffGetroffen: wirksamer Treffer der eigenen Instanz
#        (Armschwung weiter, Ansturm endet, Trefferstopp der Presse)
#
# Beginn eines Angriffs („Angriffsbeginn“, Ereignis AS:s0:Code, Schaden und
# Abstand zum nächsten Angriff festgelegt) ist der erste Frame der
# Ankündigung: beim Armschwung A = A_1, beim Ansturm A (Ausholen A bis A+19),
# bei der Körperpresse der erste Frame der Hocke (A − 15; Festlegung K4).
#
# Der Angriff der Scheibe (TypeScript: Typ Angriff) ist hier eine Zeichenkette
# 'AS', 'AN' oder 'KP' (Welt 7.3), ohne die leere Kennung.
class_name KernGegnerBossAngriffe
extends RefCounted

# ===========================================================================
# Flächen (Welt 7.3; Kampf 5.1). dz in Kampf-Konvention, hier symmetrisch.
# TypeScript: Konstanten FLAECHE_AS, FLAECHE_AN, FLAECHE_KP; hier Funktionen,
# die je Aufruf eine neue Fläche mit denselben Werten liefern.
# ===========================================================================

## Armschwung: 16 px hinter bis 105 px vor ihm, ±12, Figur bis 66 px hoch.
static func FLAECHE_AS() -> KernEntitaeten.Flaeche:
	return KernEntitaeten.flaeche({
		"art": "abstand",
		"vorn": KernWerte.AS_VORN,
		"hinten": KernWerte.AS_HINTEN,
		"hinten_weg": null,
		"tiefe": KernWerte.AS_TIEFE,
		"hoehe_angreifer_max": null,
		"hoehe_ziel_max": KernWerte.AS_HOEHE_MAX,
	})


## Ansturm: vorn 0 bis 40 px (Platzhalter), ±12, Figur bis 90 px hoch.
static func FLAECHE_AN() -> KernEntitaeten.Flaeche:
	return KernEntitaeten.flaeche({
		"art": "abstand",
		"vorn": KernWerte.AN_VORN,
		"hinten": 0,
		"hinten_weg": null,
		"tiefe": KernWerte.AN_TIEFE,
		"hoehe_angreifer_max": null,
		"hoehe_ziel_max": KernWerte.AN_HOEHE_MAX,
	})


## Körperpresse: |dx| ≤ 25 um den Boss selbst, ±12, Höhe ohne Grenze.
static func FLAECHE_KP() -> KernEntitaeten.Flaeche:
	return KernEntitaeten.flaeche({
		"art": "umkreis",
		"halbbreite": KernWerte.KP_HALBBREITE,
		"tiefe": KernWerte.KP_TIEFE,
		"hoehe_ziel_max": null,
	})


# ===========================================================================
# W4: Fälligkeit, Wahl, Beginn (Welt 7.2)
# ===========================================================================

## Abstand nach Welt 1 (Gegner minus Figur, ganzzahlig). Dictionary mit dx und dz.
static func abstandWelt(welt: KernWelt, g: KernEntitaeten.Gegner) -> Dictionary:
	return {
		"dx": KernFestkomma.ganz(g.x) - KernFestkomma.ganz(welt.figur.x),
		"dz": KernFestkomma.ganz(g.z) - KernFestkomma.ganz(welt.figur.z),
	}


## Ist code ein Angriff der Scheibe (Welt 7.3)?
static func istAngriff(code: String) -> bool:
	return code == "AS" or code == "AN" or code == "KP"


## Wahl nach Abstand (Welt 7.2), eine Ziehung aus g.zufall; fest.boss_angriff ersetzt das Ergebnis.
static func angriffWaehlen(welt: KernWelt, g: KernEntitaeten.Gegner) -> String:
	var dx: int = abstandWelt(welt, g)["dx"]
	var liste: Array[String] = KernWerte.BOSS_WAHL_NAH if absi(dx) < KernWerte.BOSS_WAHL_GRENZE else KernWerte.BOSS_WAHL_FERN
	var code: String = KernZufall.wahl(g.zufall, liste)
	if welt.fest.has("boss_angriff"):
		var fest: String = str(welt.fest["boss_angriff"])
		if not istAngriff(fest):
			push_error("fest.boss_angriff muss AS, AN oder KP sein, nicht „%s“" % fest)
			return "AS"
		return fest
	if not istAngriff(code):
		push_error("Wahltabelle des Bosses enthält „%s“ (nur AS, AN, KP)" % code)
		return "AS"
	return code


## W4 im Zustand BEREIT (Welt 7.2): Ist ein Angriff fällig, wählt der Boss
## ihn in diesem Frame (Entscheidungsframe; eine Ziehung) und beginnt ihn;
## für den Armschwung erst, wenn |dx| ≤ 78 und |dz| ≤ 6 (bis dahin geht er
## heran, die Wahl bleibt). Kein Angriff mit Zustand ≠ 1 (nach dem Stoß, SA5)
## und nicht in E-10. Gibt true zurück, wenn ein Angriff beginnt.
static func angriffEntscheiden(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if not g.logik or not g.angriffe_an:
		return false
	if g.zustand != KernEntitaeten.ZUSTAND_NORMAL:
		return false
	if welt.frame < g.naechster_angriff:
		return false
	# E-10 (Welt 5.7): dieselbe Sperre wie für die Rechte der Nahkämpfer
	if KernGegnerNah.rechteGesperrt(welt):
		return false
	var art: String = g.boss.wahl
	if art == "":
		art = angriffWaehlen(welt, g)
		g.boss.wahl = art
	if art == "AS":
		var d: Dictionary = abstandWelt(welt, g)
		var dx: int = d["dx"]
		var dz: int = d["dz"]
		if absi(dx) > KernWerte.BOSS_ARMSCHWUNG_DX or absi(dz) > KernWerte.BOSS_ARMSCHWUNG_DZ:
			return false
	angriffBeginnen(welt, g, art)
	return true


## Angriffsbeginn (Welt 7.2, 7.3, 8): Blick zur Figur, Schaden nach der
## Rangstufe, Abstand d zum nächsten Angriff (170 bis 200, eine Ziehung;
## fest.boss_abstand), Instanz, Ereignis AS:s0:Code.
static func angriffBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner, art: String) -> void:
	var f: int = welt.frame
	g.boss.wahl = ""
	g.boss.art = art
	g.boss.treffer = false
	g.boss.geh_x = 0
	g.boss.geh_z = 0
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	var stufe: int = KernRang.rangstufe(welt.rang.rang)
	var tabelle: Array[int] = KernWerte.AS_SCHADEN if art == "AS" else (KernWerte.AN_SCHADEN if art == "AN" else KernWerte.KP_SCHADEN)
	g.schaden = tabelle[stufe]
	var d: int = KernZufall.bereich(g.zufall, KernWerte.BOSS_ABSTAND_VON, KernWerte.BOSS_ABSTAND_BIS)
	var fest_abstand: Variant = KernGegnerBossZustand.festZahl(welt, "boss_abstand", KernWerte.BOSS_ABSTAND_VON, KernWerte.BOSS_ABSTAND_BIS)
	if fest_abstand != null:
		d = fest_abstand
	g.naechster_angriff = f + d
	g.angriff_a = f
	g.ziel_abstand = 0
	g.ziel_x = 0
	KernEntitaeten.modusSetzen(g, "ANKUENDIGUNG")
	g.aktion = "ANKUENDIGUNG"
	if art == "AS":
		schwungBeginnen(welt, g, 1)
		return
	g.schwung = 0
	g.phase = ""
	g.angriff_code = art
	if art == "AN":
		g.boss.lauf_n = 0
		g.boss.lauf_weg = 0
		g.boss.lauf_ende = false
		g.boss.auslauf_n = 0
		g.angriff = KernEntitaeten.angriffsinstanz({
			"code": "AN",
			"angreifer": g.schluessel,
			"flaeche": FLAECHE_AN(),
			"schaden": g.schaden,
			"umwerfen": true,
			"richtung": "weg",
			"trefferstopp": false,
			"einmal": true,
			"gegen": "figur",
			"beginn": f,
		})
	else:
		g.boss.kp_k = 0
		g.boss.kp_stopp = 0
		g.boss.kp_letzt = 0
		g.boss.kp_landung = 0
		g.angriff = KernEntitaeten.angriffsinstanz({
			"code": "KP",
			"angreifer": g.schluessel,
			"flaeche": FLAECHE_KP(),
			"schaden": g.schaden,
			"umwerfen": true,
			"richtung": "weg",
			"trefferstopp": true,
			"einmal": true,
			"gegen": "figur",
			"beginn": f,
		})
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ANGRIFF"], g.schluessel, g.angriff_code])


## Schwung k des Armschwungs beginnt in A_k = dieser Frame (Welt 7.3): neue Instanz, sn_angriff ASk, Ereignis AS:s0:ASk.
static func schwungBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner, k: int) -> void:
	g.schwung = k
	g.phase = str(k)
	g.angriff_code = "AS" + str(k)
	g.boss.schwung_a = welt.frame
	g.boss.treffer = false
	g.aktion = "ANKUENDIGUNG"
	g.angriff = KernEntitaeten.angriffsinstanz({
		"code": "AS",
		"angreifer": g.schluessel,
		"flaeche": FLAECHE_AS(),
		"schaden": g.schaden,
		# nur der dritte (letzte) Schwung wirft um (beschlossen, E9)
		"umwerfen": k == KernWerte.AS_SCHWUENGE_MAX,
		"richtung": "weg",
		"trefferstopp": true,
		"einmal": true,
		"gegen": "figur",
		"beginn": welt.frame,
	})
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ANGRIFF"], g.schluessel, g.angriff_code])


## Nachlauf beginnen: eigene Instanz beendet, BEREIT ab bereitAb (W4).
static func nachlaufBeginnen(g: KernEntitaeten.Gegner, bereitAb: int) -> void:
	if KernGegnerBossZustand.eigeneInstanz(g):
		g.angriff = null
	KernEntitaeten.modusSetzen(g, "NACHLAUF")
	g.aktion = "NACHLAUF"
	g.boss.bereit_ab = bereitAb


## Ist der Nachlauf vorbei (W4)?
static func nachlaufVorbei(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	return welt.frame >= g.boss.bereit_ab


# ===========================================================================
# KS3: Abläufe
# ===========================================================================

## KS3 in ANKUENDIGUNG, ANGRIFF, NACHLAUF: Ablauf des laufenden Angriffs; setzt instanz.aktiv für diesen Frame.
static func angriffSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if KernGegnerBossZustand.eigeneInstanz(g) and g.angriff != null:
		g.angriff.aktiv = false
	var art: String = g.boss.art
	if art == "AS":
		armschwungSchritt(welt, g)
	elif art == "AN":
		ansturmSchritt(welt, g)
	elif art == "KP":
		presseSchritt(welt, g)


## Armschwung (Welt 7.3, E18): Schwung k holt in A_k bis A_k+16 aus, aktiv
## A_k+17 bis A_k+19, nach einem wirksamen Treffer 7 Frames länger (Welt 5.4
## Punkt 5). Von vorn ist der Boss nur im ersten aktiven Frame treffbar, in
## den übrigen aktiven Frames nicht (Welt 7.1, vorn_geschuetzt). Hat
## Schwung k (k = 1, 2) wirksam getroffen, beginnt Schwung k+1 in A_k+36;
## sonst endet die Serie. Nachlauf 30 Frames nach dem letzten aktiven Frame
## des letzten Schwungs.
static func armschwungSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.modus == "NACHLAUF":
		return
	var a: int = g.boss.schwung_a
	var n: int = welt.frame - a
	var getroffen: bool = g.boss.treffer
	var bis: int = KernWerte.AS_AKTIV_BIS + (KernWerte.GEGNER_TREFFERSTOPP if getroffen else 0)
	if n < KernWerte.AS_AKTIV_VON:
		g.aktion = "ANKUENDIGUNG"
		return
	if n <= bis:
		KernEntitaeten.modusSetzen(g, "ANGRIFF")
		g.aktion = "ANGRIFF"
		if KernGegnerBossZustand.eigeneInstanz(g) and g.angriff != null:
			g.angriff.aktiv = true
		# von vorn nur im ersten aktiven Frame treffbar (Gleichstand, Kampf 5.4), danach geschützt (Welt 7.1)
		g.vorn_geschuetzt = n > KernWerte.AS_AKTIV_VON
		return
	if getroffen and g.schwung < KernWerte.AS_SCHWUENGE_MAX:
		if n >= KernWerte.AS_NAECHSTER:
			schwungBeginnen(welt, g, g.schwung + 1)
		else:
			g.aktion = "ANGRIFF"
		return
	nachlaufBeginnen(g, a + bis + KernWerte.AS_NACHLAUF + 1)


## Ansturm (Welt 7.3): Ausholen A bis A+19, dann Lauf in Blickrichtung mit
## 4 px/Frame (in Frames mit Tiefenschritt 3,92), höchstens 45 Frames und
## 176 px; lenkt in der Tiefe 1 px/Frame zur Figur nach; aktiv in jedem
## Lauf-Frame. Endet nach einem wirksamen Treffer, an einer Wand, am
## Arenarand oder an den Grenzen; im Frame danach beginnt der Nachlauf
## (16 Frames) mit dem Auslauf.
static func ansturmSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.modus == "NACHLAUF":
		auslaufSchritt(welt, g)
		return
	var n: int = welt.frame - g.angriff_a
	if n < KernWerte.AN_AUSHOLEN:
		g.aktion = "ANKUENDIGUNG"
		return
	if g.boss.lauf_ende:
		nachlaufBeginnen(g, welt.frame + KernWerte.AN_NACHLAUF)
		auslaufSchritt(welt, g)
		return
	KernEntitaeten.modusSetzen(g, "ANGRIFF")
	g.aktion = "ANGRIFF"
	# Tiefe: höchstens 1 px je Frame zur Figur, nicht darüber hinaus
	var zDiff: int = KernFestkomma.sub(welt.figur.z, g.z)
	var dz: int = 0
	if zDiff > 0:
		dz = KernFestkomma.minF(KernWerte.AN_NACHLENKEN, zDiff)
	elif zDiff < 0:
		dz = KernFestkomma.neg(KernFestkomma.minF(KernWerte.AN_NACHLENKEN, KernFestkomma.neg(zDiff)))
	var v: int = KernWerte.AN_V if dz == 0 else KernWerte.AN_V_SCHRAEG
	var weg: int = g.boss.lauf_weg
	var schritt: int = KernFestkomma.minF(v, KernFestkomma.sub(KernFestkomma.ausGanz(KernWerte.AN_MAX_WEG), weg))
	var xAlt: int = g.x
	var r: KernStage.SchrittErgebnis = KernGegnerBossZustand.bossSchritt(welt, g, KernFestkomma.mulGanz(schritt, g.blick), dz)
	var wegNeu: int = KernFestkomma.add(weg, KernFestkomma.abs(KernFestkomma.sub(g.x, xAlt)))
	var laufN: int = g.boss.lauf_n + 1
	g.boss.lauf_n = laufN
	g.boss.lauf_weg = wegNeu
	if r.blockiert_x or laufN >= KernWerte.AN_MAX_FRAMES or wegNeu >= KernFestkomma.ausGanz(KernWerte.AN_MAX_WEG):
		g.boss.lauf_ende = true
	if KernGegnerBossZustand.eigeneInstanz(g) and g.angriff != null:
		g.angriff.aktiv = true


## Auslauf nach dem Ansturm: 4 px/Frame, je Frame 0,25 weniger (15 Frames, 30 px), in Blickrichtung.
static func auslaufSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.aktion = "NACHLAUF"
	var n: int = g.boss.auslauf_n + 1
	g.boss.auslauf_n = n
	var v: int = KernFestkomma.sub(KernWerte.AN_V, KernFestkomma.mulGanz(KernWerte.AN_AUSLAUF_ABNAHME, n))
	if v > 0:
		KernGegnerBossZustand.bossSchritt(welt, g, KernFestkomma.mulGanz(v, g.blick), 0)


## Höhe der Körperpresse nach k Bahnframes (Verlauf S2, werte.gd KP_STEIG_FAKTOR, KP_FALL_FAKTOR).
static func presseHoehe(k: int) -> int:
	if k >= KernWerte.KP_LANDUNG:
		return 0
	var d: int = KernWerte.KP_SCHEITEL_FRAME - k if k <= KernWerte.KP_SCHEITEL_FRAME else k - KernWerte.KP_SCHEITEL_FRAME
	var faktor: int = KernWerte.KP_STEIG_FAKTOR if k <= KernWerte.KP_SCHEITEL_FRAME else KernWerte.KP_FALL_FAKTOR
	return KernFestkomma.sub(KernWerte.KP_SCHEITEL_HOEHE, KernFestkomma.mulGanz(faktor, d * d))


## Körperpresse (Welt 7.3): Hocke B bis B+14 (15 Frames), Absprung in
## A = B+15 zum Ort der Figur in A (in x höchstens 200 px); nach k
## Bahnframes x(A) + ⌊d·k/64⌋ (Kampf 2.4), z(A) + dz · k/64 als
## Festkommaprodukt ohne Division und ohne Grenze (Festlegung K4, werte.gd
## KP_Z_ANTEIL; Kampf 2.4 nennt nur x), Landung in A+64,
## nach einem wirksamen Treffer 7 Stoppframes (Landung A+71). Aktiv
## Bahnframe 51 bis 62. Nachlauf 40 Frames nach dem letzten aktiven Frame;
## NACHLAUF ab dem Frame nach der Landung. Bei der Landung beginnt das
## Bildschütteln (KA10).
static func presseSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var b: int = g.angriff_a
	var n: int = welt.frame - b
	if g.modus == "ANKUENDIGUNG":
		if n < KernWerte.KP_HOCKE:
			g.aktion = "ANKUENDIGUNG"
			return
		# A: Absprung, Ziel ist der Ort der Figur in A
		KernEntitaeten.modusSetzen(g, "ANGRIFF")
		g.aktion = "ANGRIFF"
		var grenze: int = KernFestkomma.ausGanz(KernWerte.KP_MAX_WEG)
		var dx: int = KernFestkomma.sub(welt.figur.x, g.x)
		if dx > grenze:
			dx = grenze
		if dx < KernFestkomma.neg(grenze):
			dx = KernFestkomma.neg(grenze)
		g.boss.kp_x0 = g.x
		g.boss.kp_z0 = g.z
		g.boss.kp_dx = dx
		g.boss.kp_dz = KernFestkomma.sub(welt.figur.z, g.z)
		g.boss.kp_k = 0
		g.ziel_x = KernFestkomma.ganz(KernFestkomma.add(g.x, dx))
		g.ziel_abstand = KernFestkomma.ganz(dx) * g.blick
		return
	if g.modus == "ANGRIFF" and g.boss.kp_k >= KernWerte.KP_LANDUNG:
		nachlaufBeginnen(g, g.boss.kp_letzt + KernWerte.KP_NACHLAUF + 1)
	presseBahn(welt, g)
	g.aktion = "NACHLAUF" if g.boss.kp_k >= KernWerte.KP_LANDUNG and g.modus == "NACHLAUF" else "ANGRIFF"


## Ein Frame der Pressenbahn (auch im Nachlauf, bis zur Landung).
static func presseBahn(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var p: KernEntitaeten.BossFelder = g.boss
	if p.kp_k >= KernWerte.KP_LANDUNG:
		return
	if p.kp_stopp > 0:
		p.kp_stopp -= 1
		return
	var k: int = p.kp_k + 1
	p.kp_k = k
	# Math.imul(p.kp_dx, k)
	g.x = KernFestkomma.add(p.kp_x0, KernFestkomma.divGanz(KernFestkomma.zu32(p.kp_dx * KernFestkomma.zu32(k)), KernWerte.KP_X_TEILER))
	g.z = KernFestkomma.add(p.kp_z0, KernFestkomma.mul(p.kp_dz, KernFestkomma.mulGanz(KernWerte.KP_Z_ANTEIL, k)))
	g.h = presseHoehe(k)
	if k == KernWerte.KP_LANDUNG:
		p.kp_landung = welt.frame
		# Bildschütteln ab der Landung (Welt 3, KA10) über die Hilfe von K3
		KernKamera.schuettelnStarten(welt, "presse")
	if k >= KernWerte.KP_AKTIV_VON and k <= KernWerte.KP_AKTIV_BIS and KernGegnerBossZustand.eigeneInstanz(g) and g.angriff != null:
		g.angriff.aktiv = true
	if k == KernWerte.KP_AKTIV_BIS:
		p.kp_letzt = welt.frame


# ===========================================================================
# KS7: wirksamer Treffer der eigenen Instanz (Welt 5.4 Punkt 5, 7.3)
# ===========================================================================

## Seite des Urhebers: Armschwung weiter (E18), Ansturm endet, Presse stoppt 7 Frames.
static func angriffGetroffen(g: KernEntitaeten.Gegner) -> void:
	g.boss.treffer = true
	if g.boss.art == "AN":
		g.boss.lauf_ende = true
	elif g.boss.art == "KP":
		g.boss.kp_stopp = KernWerte.GEGNER_TREFFERSTOPP
