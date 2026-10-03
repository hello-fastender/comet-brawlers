# Boss Ballast (K4) nach docs/spezifikation-welt.md, Abschnitt 7 (Werte und
# Zustände 7.1, Rhythmus und Wahl 7.2, Angriffe AS, AN, KP und Stoß RZ 7.3,
# Super-Armor SA1 bis SA6 7.4, Verstärkung 7.5, Fall besiegt alle 7.6),
# Auftritt nach 4.2 und 4.6 und docs/mechanik.md „Boss“.
# Port von spiel/src/kern/gegner/boss.ts.
#
# welt.gd gibt den Boss (typ Ballast, Slot s0) immer an diese Funktionen,
# auch in seinen Reaktionen:
#   W4   bossEntscheidung  Ende des Auftritts, Rückkehr nach Reaktionen,
#                          Gehbefehl, Wahl und Beginn der Angriffe
#                          (boss_angriffe.gd)
#   KS3  bossBewegung      Gehen, Angriffsabläufe, Stoß, eigene Reaktionen
#                          (boss_bahn.gd); setzt instanz.aktiv und den
#                          Frontschutz des Armschwungs (vorn_geschuetzt)
#   KS5  bossAbbruch       nichts: die Angriffe des Bosses brechen nicht ab
#   KS7  bossGetroffen     Zielhandler: LP vorläufig (SA2) oder endgültig
#                          (SA1), Folge, Reaktion nach SA3, Umwerfen, Taumeln, Tod
#   KS7  bossHatGetroffen  Urheber: Armschwung weiter (E18), Ansturm endet,
#                          Trefferstopp der Presse
#   W5   bossW5            Super-Armor (SA5: Rücksprung in h+23, Stoß),
#                          Fall (7.6)
#
# Für andere Module:
#   bossLpDauerhaft(welt)  LP ohne die vorläufigen Abzüge (7.5, Auslöser boss_lp)
# Den Weckreiz (Welt 4.2, 4.6: AUFTRITT, kampffähig ab w+60, Bosskisten
# zerbrechen) führt allein wellen.gd in W3.
# Von anderen Modulen: reaktion.gd todEinleiten, vonFigurWeg (K2, Fall 7.6),
# in boss_bahn.gd bahnStarten, bahnSchritt, reaktionBeenden (Kampf 5.7, 7);
# nah.gd rechteGesperrt (E-10, Welt 5.7, in boss_angriffe.gd); kamera.gd
# schuettelnStarten (K3, Landung der Presse, KA10); gegenstaende.gd
# behaelterHindernisse (Welt 9.2, in boss_zustand.gd).
#
# Abweichungen vom Auftragstext (die Spezifikation gilt): kein Schutz nach
# dem Aufstehen (E4, Welt 7.1); kein kurzer Schlag in der Scheibe (Welt 7.3:
# AS, AN, KP, dazu RZ).
class_name KernGegnerBoss
extends RefCounted

## Treffer, die endgültig abziehen (TypeScript: Konstante ENDGUELTIG, SA1/SA2).
const ENDGUELTIG: Array[String] = ["KN", "WU", "RX", "LN", "ST"]


# ===========================================================================
# Anlegen, Auftritt (Welt 4.2, 4.6, 11.3)
# ===========================================================================

## Nach dem Anlegen (erzeugeWelt oder Eingriff): x, z, blick, lp, lp_max,
## angriffe_an, bewegung_an, werte, auftritt, welle sind gesetzt; modus WARTEN
## (aus der Stage) bzw. FREI (Prüfszene). Bei welt.wellen.nur_boss (Welt 11.3)
## wach und kampffähig.
static func bossAngelegt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.rolle = "boss"
	g.lp_folge = 0
	g.folge = 0
	g.folge_h = 0
	g.schwung = 0
	g.naechster_angriff = 0
	if g.modus == "WARTEN" and not welt.wellen.nur_boss:
		# Welt 4.2: wartend, nicht treffbar und nicht greifbar, unsichtbar
		g.zustand = KernEntitaeten.ZUSTAND_BODEN
		g.aktion = "WARTEN"
		return
	# wach und kampffähig (Prüfszene mit Logik an, welle.7=nur_boss): erster Angriff 60 Frames danach (7.2)
	var ab: int = maxi(welt.frame, KernWerte.ERSTER_FRAME)
	g.kampffaehig_ab = ab
	g.naechster_angriff = ab + KernWerte.BOSS_ERSTER_ANGRIFF
	# Anfangsmodus wie anlegen.gd (modusAnfang): sn_timer bleibt, wie anlegen.gd ihn gesetzt hat
	g.modus = "BEREIT"
	g.aktion = "STAND"
	g.zustand = KernEntitaeten.ZUSTAND_NORMAL


## Kampfbereit (Welt 4.2, 7.2): BEREIT, erster Angriff 60 Frames danach.
static func kampfbereit(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernGegnerBossBahn.bereitWerden(welt, g)
	g.naechster_angriff = welt.frame + KernWerte.BOSS_ERSTER_ANGRIFF


# ===========================================================================
# Griff durch die Figur (Kampf 7 GEHALTEN, 8; Welt 7.4 SA5)
# ===========================================================================

## Modi, in denen der Boss nicht gehalten sein kann bzw. ein Halten nicht übernommen wird (Wurf: K1 trägt ihn).
static func haltenUnberuehrt(g: KernEntitaeten.Gegner) -> bool:
	match g.modus:
		"UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT", "TAUMELN", "STOSS", "WARTEN", "AUFTRITT":
			return true
		_:
			return false


## Gleicht den Griff der Figur ab (K1 setzt gehalten_von): GEHALTEN, Zustand
## 2, eigener Angriff abgebrochen; die Frist der Super-Armor ruht (SA5).
## Reißt er sich ohne Umwerfen los, gilt SA5 im Frame danach. Rückgabe: true,
## solange er gehalten ist.
static func haltenAbgleich(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if haltenUnberuehrt(g):
		g.boss.gehalten = false
		return false
	if g.gehalten_von != null:
		if g.modus != "GEHALTEN":
			KernGegnerBossZustand.eigenenAngriffBeenden(g)
			g.boss.wahl = ""
			KernEntitaeten.modusSetzen(g, "GEHALTEN")
		g.aktion = "GEHALTEN"
		g.zustand = KernEntitaeten.ZUSTAND_BODEN
		g.boss.gehalten = true
		return true
	if g.boss.gehalten:
		g.boss.gehalten = false
		if g.folge == 1:
			g.boss.sa_faellig = welt.frame + 1
		if g.modus == "GEHALTEN":
			KernEntitaeten.modusSetzen(g, "FREI")
			g.aktion = "STAND"
			g.zustand = KernEntitaeten.ZUSTAND_NORMAL
	return false


# ===========================================================================
# W4
# ===========================================================================

## W4: Ende des Auftritts, Fälligkeit und Wahl des Angriffs (g.zufall), Rückkehr nach Reaktionen.
static func bossEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if not g.belegt or g.modus == "TOT":
		return
	if g.lp < 0:
		# LP < 0 ohne Treffer (Eingriff): Tod in diesem Frame, Flug von der Figur weg
		KernGegnerBossBahn.bossTotBeginnen(welt, g, KernGegnerReaktion.vonFigurWeg(welt, g))
		return
	# WARTEN: geweckt wird in W3 (wellen.gd, Welt 4.2)
	if g.modus == "WARTEN":
		return
	if g.modus == "AUFTRITT":
		# kampffähig ab w+60 (wellen.gd setzt kampffaehig_ab beim Weckreiz)
		if welt.frame < g.kampffaehig_ab:
			return
		kampfbereit(welt, g)
	else:
		if haltenAbgleich(welt, g):
			return
		match g.modus:
			"STOSS":
				if not KernGegnerBossBahn.stossVorbei(welt, g):
					return
				KernGegnerBossBahn.bereitWerden(welt, g)
			"NACHLAUF":
				if not KernGegnerBossAngriffe.nachlaufVorbei(welt, g):
					return
				KernGegnerBossBahn.bereitWerden(welt, g)
			"BEREIT":
				pass
			"GETROFFEN", "UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TAUMELN", "ANKUENDIGUNG", "ANGRIFF":
				return
			_:
				# FREI nach einer Reaktion (Vertrag 6) oder ein fremder Modus
				KernGegnerBossBahn.bereitWerden(welt, g)
	bereitEntscheidung(welt, g)


## W4 in BEREIT (Welt 7.1, 7.2): Zustand 1 ab 62 Frames nach dem Stoß, Blick
## zur Figur, Angriff (Entscheidungsframe), sonst Gehbefehl: in x bis 70 px
## Abstand (1,25 px/Frame), in der Tiefe zur Figur (0,625 px/Frame, nicht
## darüber hinaus); Achsen getrennt (Festlegung K4).
static func bereitEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.zustand == KernEntitaeten.ZUSTAND_BODEN and not KernGegnerBossBahn.nachStossUnverwundbar(welt, g):
		g.zustand = KernEntitaeten.ZUSTAND_NORMAL
	g.boss.geh_x = 0
	g.boss.geh_z = 0
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	if KernGegnerBossAngriffe.angriffEntscheiden(welt, g):
		return
	if not g.logik or not g.bewegung_an:
		return
	var dx: int = KernFestkomma.ganz(g.x) - KernFestkomma.ganz(welt.figur.x)
	if absi(dx) > KernWerte.BOSS_ABSTAND:
		g.boss.geh_x = -1 if dx > 0 else 1
	var zDiff: int = KernFestkomma.sub(welt.figur.z, g.z)
	if zDiff > 0:
		g.boss.geh_z = KernFestkomma.minF(KernWerte.BOSS_GEHEN_Z, zDiff)
	elif zDiff < 0:
		g.boss.geh_z = KernFestkomma.neg(KernFestkomma.minF(KernWerte.BOSS_GEHEN_Z, KernFestkomma.neg(zDiff)))


# ===========================================================================
# KS3, KS5
# ===========================================================================

## KS3: Bewegung, Angriffsabläufe, Stoß RZ, eigene Reaktionen (Umwerfen, Liegen, Taumeln); g.angriff.aktiv und g.vorn_geschuetzt setzen.
static func bossBewegung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if not g.belegt:
		return
	if KernGegnerBossZustand.eigeneInstanz(g) and g.angriff != null:
		g.angriff.aktiv = false
	# Frontschutz gilt nur im Frame, in dem der Armschwung ihn setzt (Welt 7.1)
	g.vorn_geschuetzt = false
	if haltenAbgleich(welt, g):
		return
	match g.modus:
		"TOT":
			KernGegnerBossBahn.bossTodSchritt(welt, g)
			return
		"UMGEWORFEN", "LIEGEN", "AUFSTEHEN":
			KernGegnerBossBahn.bossUmwerfenSchritt(welt, g)
			return
		"GETROFFEN":
			KernGegnerBossBahn.bossGetroffenSchritt(welt, g)
			return
		"TAUMELN":
			KernGegnerBossBahn.taumelnSchritt(welt, g)
			return
		"STOSS":
			KernGegnerBossBahn.stossSchritt(welt, g)
			return
		"ANKUENDIGUNG", "ANGRIFF", "NACHLAUF":
			KernGegnerBossAngriffe.angriffSchritt(welt, g)
			return
		"BEREIT":
			gehenSchritt(welt, g)
			return
		_:
			return


## KS3 in BEREIT: der Gehbefehl aus W4 (Band, Hindernisse, Arenarand).
static func gehenSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var gx: int = g.boss.geh_x
	var gz: int = g.boss.geh_z
	if gx == 0 and gz == 0:
		g.aktion = "STAND"
		return
	KernGegnerBossZustand.bossSchritt(welt, g, KernFestkomma.mulGanz(KernWerte.BOSS_GEHEN_X, gx), gz)
	g.aktion = "GEHEN"


## KS5: nichts zu tun. Die Angriffe des Bosses brechen nicht ab (Welt 7.3, kein
## Abbruchfenster); das Ende des Ansturms an Wand und Arenarand prüft
## bossBewegung beim Schritt.
static func bossAbbruch(_welt: KernWelt, _g: KernEntitaeten.Gegner) -> void:
	pass


# ===========================================================================
# KS7: Treffer auf den Boss (Kampf 6.2; Welt 7.4)
# ===========================================================================

## Art eines Treffers für die Super-Armor (Welt 7.4): 'vorlaeufig',
## 'endgueltig', 'umwerfend' oder 'spezial' (TypeScript: Typ TrefferArt).
##
## SA1: Spezialangriff, Kniestoß, Wurf, Explosion (und Landung beim
## Neueinstieg) ziehen endgültig ab, umwerfende Treffer ebenso und werfen um;
## SA2: der Sprungangriff runter zieht endgültig ab, ohne umzuwerfen; jeder
## andere Treffer ohne Umwerfen (Kettenstufen 1 bis 3) zieht vorläufig ab.
static func trefferArt(t: KernEntitaeten.Treffer) -> String:
	if t.code == "SP":
		return "spezial"
	if t.umwerfen:
		return "umwerfend"
	if ENDGUELTIG.has(t.code):
		return "endgueltig"
	return "vorlaeufig"


## Folge beenden, alle Abzüge bleiben (SA4, SA6, Spezialangriff nach SA2); lp_folge ist außerhalb einer Folge 0.
static func folgeBeenden(g: KernEntitaeten.Gegner) -> void:
	g.folge = 0
	g.lp_folge = 0
	g.boss.sa_faellig = 0


## Reaktion nach SA3 auf einen Treffer ohne Umwerfen: außerhalb eines eigenen
## Angriffs GETROFFEN (bzw. neu gestartet); im eigenen Angriff nur bei einem
## Treffer von hinten (bricht ab), einer von vorn unterbricht nichts; in der
## Luft (Körperpresse) unterbricht kein Treffer (Festlegung K4). Gehalten:
## keine Reaktion (Kampf 7, GEHALTEN).
static func reaktionNachSA3(welt: KernWelt, g: KernEntitaeten.Gegner, t: KernEntitaeten.Treffer) -> void:
	if g.modus == "GEHALTEN":
		return
	if KernGegnerBossZustand.eigenerAngriff(g) and (t.von_vorn or g.h > 0):
		return
	KernGegnerBossBahn.bossGetroffenBeginnen(welt, g)


## KS7, Zielhandler für den Boss (Kampf 6.2; Welt 7.4): t.lp_vorher, t.wirkung,
## als Erstes ereignisTreffer(welt, t), dann LP (vorläufig oder endgültig),
## Folge (lp_folge, folge, folge_h), Reaktion nach SA3, Umwerfen nach SA1.
static func bossGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.ziel)
	if g == null:
		push_error("bossGetroffen: %s ist kein Gegnerslot" % t.ziel)
		return
	t.lp_vorher = g.lp
	if g.modus == "TOT":
		# nimmt keine Treffer an (Kampf 7); treffer.gd legt keine an, nur zur Sicherheit
		t.wirkung = "X"
		KernEreignisse.ereignisTreffer(welt, t)
		return
	var art: String = trefferArt(t)
	var lpNeu: int = g.lp - t.schaden
	if lpNeu < 0:
		t.wirkung = "X"
	elif art == "umwerfend":
		t.wirkung = "U"
	else:
		t.wirkung = "R"
	KernEreignisse.ereignisTreffer(welt, t)
	g.lp = lpNeu
	g.letzter_angreifer = t.urheber
	if t.urheber == "f":
		g.getroffen_frame = welt.frame

	if lpNeu < 0:
		# SA6: stirbt sofort, die Folge zählt
		KernGegnerBossBahn.bossTotBeginnen(welt, g, t.richtung)
		return
	match art:
		"umwerfend":
			# SA1, SA4
			folgeBeenden(g)
			KernGegnerBossBahn.bossUmwerfenBeginnen(welt, g, t)
			return
		"spezial":
			# SA1, SA2 letzter Satz: alle Abzüge bleiben, kein Stoß, Taumeln (7.1)
			folgeBeenden(g)
			KernGegnerBossBahn.taumelnBeginnen(welt, g, t)
			return
		"vorlaeufig":
			# SA2: der erste vorläufige Treffer eröffnet die Folge
			if g.folge == 0:
				g.folge = 1
				g.lp_folge = t.lp_vorher
			g.folge_h = welt.frame
			g.boss.sa_faellig = 0
			reaktionNachSA3(welt, g, t)
			return
		"endgueltig":
			# SA2: während einer offenen Folge zählt er als Treffer der Folge und senkt auch lp_folge
			if g.folge == 1:
				g.lp_folge -= t.schaden
				g.folge_h = welt.frame
				g.boss.sa_faellig = 0
			reaktionNachSA3(welt, g, t)
			return


## KS7, Seite des Urhebers: wirksamer Treffer des Bosses (Armschwung weiter nach E18, Trefferstopp +7).
static func bossHatGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.urheber)
	if g == null or not g.belegt or g.angriff == null or g.angriff != t.instanz:
		return
	KernGegnerBossAngriffe.angriffGetroffen(g)


# ===========================================================================
# W5: Super-Armor, Fall, Bildschütteln
# ===========================================================================

## W5 (Welt 1, 7.4, 7.6): Super-Armor auswerten (SA5: Rücksprung in h+23,
## Ereignis SA:s0:lp, Stoß), Fall des Bosses (alle übrigen lebenden Gegner LP −1
## und TOT mit ohne_punkte = true, Geschosse der Gegner verschwinden, scharfe
## Wellen entfallen, Ereignis BF:s0).
static func bossW5(welt: KernWelt) -> void:
	var g: KernEntitaeten.Gegner = welt.gegner[KernWerte.BOSS_SLOT]
	if not g.belegt or g.typ != "Ballast":
		return
	haltenAbgleich(welt, g)
	if g.lp < 0 and g.modus != "TOT":
		KernGegnerBossBahn.bossTotBeginnen(welt, g, KernGegnerReaktion.vonFigurWeg(welt, g))
	superArmor(welt, g)
	# Fall genau einmal: in W5 von t, vor rahmenW5 (welt.rahmen.boss_t ist dann noch 0)
	if g.modus == "TOT" and welt.rahmen.boss_t == 0:
		fall(welt, g)
	stossNachAngriff(welt, g)


## SA5: Kommt bis einschließlich h+23 kein neuer Treffer der Folge, springen in
## W5 von h+23 die LP auf lp_folge zurück, die Folge endet, und der Stoß
## beginnt; läuft gerade ein Angriff, folgt er nach dessen Ende. Gehalten ruht
## die Frist; nach dem Losreißen gilt SA5 im Frame danach.
static func superArmor(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.folge != 1 or g.modus == "TOT":
		return
	if g.gehalten_von != null or g.modus == "GEHALTEN":
		return
	var faellig: int = g.boss.sa_faellig if g.boss.sa_faellig > 0 else g.folge_h + KernWerte.SA_FOLGEFRIST
	if welt.frame < faellig:
		return
	g.lp = g.lp_folge
	g.folge = 0
	g.lp_folge = 0
	g.boss.sa_faellig = 0
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["SUPER_ARMOR"], g.schluessel, g.lp])
	if KernGegnerBossZustand.eigenerAngriff(g):
		g.boss.stoss_offen = true
	elif g.modus != "STOSS":
		KernGegnerBossBahn.stossBeginnen(welt, g)


## Aufgeschobener Stoß (SA5): beginnt in W5 des ersten Frames nach den aktiven Frames des Angriffs bzw. nach einer Reaktion.
static func stossNachAngriff(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if not g.boss.stoss_offen:
		return
	if g.modus == "NACHLAUF" or g.modus == "BEREIT" or g.modus == "FREI":
		KernGegnerBossBahn.stossBeginnen(welt, g)


## Fall des Bosses (Welt 7.6), in W5 des Frames t: alle übrigen lebenden
## Gegner LP −1 und TOT (Flug von der Figur weg, ohne Punkte, ohne Waffe),
## Geschosse der Gegner verschwinden, scharfe und vorgemerkte Wellen
## entfallen, Ereignis BF:s0; welt.rahmen.boss_t = t (Welt 10.5).
static func fall(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	for o: KernEntitaeten.Gegner in welt.gegner:
		if o == g or not KernEntitaeten.istLebend(o):
			continue
		o.lp = -1
		o.ohne_punkte = true
		# Tod nach Kampf 7 über die Hilfe von K2 (Bahn F4, Rechte, Slot frei in t+79)
		KernGegnerReaktion.todEinleiten(welt, o, "F4", KernGegnerReaktion.vonFigurWeg(welt, o))
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt or (o.typ != "Rakete" and o.typ != "Effekt"):
			continue
		# o.besitzer ?? o.angriff?.urheber ?? null
		var besitzer: Variant = o.besitzer
		if besitzer == null and o.angriff != null:
			besitzer = o.angriff.urheber
		if besitzer != null and KernEntitaeten.istGegnerSlot(besitzer as String):
			KernEntitaeten.freigeben(o)
	for w: KernWelt.WelleZustand in welt.wellen.liste:
		if not w.ausgeloest:
			w.aus = true
	welt.wellen.vorgemerkt = []
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["BOSS_FALL"], g.schluessel])
	welt.rahmen.boss_t = welt.frame


# ===========================================================================
# Für andere Module
# ===========================================================================

## Dauerhaft abgezogene LP des Bosses (Welt 4.4 Auslöser boss_lp, 7.5): während
## einer Folge (folge = 1) lp_folge, sonst LP; null ohne Boss in s0.
## Außerhalb einer Folge ist lp_folge 0 (Spalte s0_lpfolge).
## Rückgabe: int oder null.
static func bossLpDauerhaft(welt: KernWelt) -> Variant:
	var g: KernEntitaeten.Gegner = welt.gegner[KernWerte.BOSS_SLOT]
	if not g.belegt or g.typ != "Ballast":
		return null
	return g.lp_folge if g.folge == 1 else g.lp
