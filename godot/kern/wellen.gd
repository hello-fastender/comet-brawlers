# Aktivierung und Wellen nach docs/spezifikation-welt.md, Abschnitt 4 (K3,
# Stufe 2): aktives Fenster 4.1 (entitaeten.gd imFenster), Warten und
# Aufwachen 4.2, Lebende 4.3, Auslöser 4.4, LP beim Erscheinen 4.5,
# Bossarena 4.6, Wellentabelle der Scheibe 4.7 (daten/stages/scheibe.txt).
# Port von spiel/src/kern/wellen.ts.
#
# Ablauf:
#   W3 wellenAnlegen   vorgemerkte Gegner anlegen (Rand: handeln sofort),
#                      dann Weckreiz (Hocke nach Kamera-x des Vorframes,
#                      Versteck, Luke und Boss nach der Auslösung im Vorframe)
#   W7 wellenPruefen   Auslöser (Stand dieses Frames), WL:n, Vormerken,
#                      welt.lebende, welt.wellen.besiegt
#
# Festlegungen K3 (Lücken, Bericht):
# - Der Auslöser figur_abstand misst zu den wartenden Gegnern seiner Welle;
#   hat die Welle keinen, löst er nicht aus.
# - Eine abgeschaltete Welle (welle.n=aus) löst in W7 nie aus und gilt als
#   besiegt. Der Eingriff welle.n jetzt löst sie trotzdem aus und legt ihre
#   neuen Gegner an (ausdrücklicher Wunsch des Prüfstarts).
# - Nach dem Fall des Bosses löst keine Welle mehr aus (Welt 7.6).
# - Einträge brauchen eine Lage in x; die Daten haben nur z. Zulässig sind
#   deshalb nur rand_links und rand_rechts (Welt 4.2); andere Auftritte in
#   `eintrag` sind ein Fehler.
# - Ist kein Gegnerslot frei, entsteht der Gegner nicht (wie Welt 9.1 für
#   Objekte, ohne Ereignis).
# - Vorplatzierte Gegner mit werte=rang bekommen ihre LP beim Weckreiz
#   (Erscheinen), mit dem Rang dieses Frames.
#
# Hinweise zum Port: GegnerTyp, Rolle und Auftritt sind Strings; der Typ
# '' | GegnerTyp ist ein String mit '' als leerem Wert. Sortiert wird mit
# einem stabilen Einfügesort (Array.prototype.sort ist stabil).
class_name KernWellen
extends RefCounted

## Die Welle des Bosses (in der Scheibe Welle 7, Welt 4.6, 4.7): welle.7=nur_boss
## (Welt 11.3) nimmt ihr die neuen Gegner. Aus den Stage-Daten statt als Zahl.
static func istBosswelleOhneEintraege(welt: KernWelt, nr: int) -> bool:
	if not welt.wellen.nur_boss:
		return false
	for g: KernStage.GegnerSatz in welt.stage.gegner:
		if g.typ == "Ballast" and g.welle == nr:
			return true
	return false


# ===========================================================================
# LP nach Rang (Welt 4.5, 8)
# ===========================================================================

## Untere und obere Grenze der LP je Typ bzw. Rolle, als [u, o].
static func lpSpanne(typ: String, rolle: String) -> Array:
	if typ == "Rammbock" or (typ == "Puppe" and rolle == "schwer"):
		return [KernWerte.LP_RAMMBOCK_U, KernWerte.LP_RAMMBOCK_O]
	if typ == "Zünder" or (typ == "Puppe" and rolle == "fern"):
		return [KernWerte.LP_ZUENDER_U, KernWerte.LP_ZUENDER_O]
	return [KernWerte.LP_BOLZER_U, KernWerte.LP_BOLZER_O]


## LP = ⌊(34·U + 2·(O − U)·(Rang − 7) + 17) / 34⌋ (Welt 8), Rang auf 7 bis 24 begrenzt.
static func lpNachRang(typ: String, rolle: String, rang: int) -> int:
	var spanne: Array = lpSpanne(typ, rolle)
	var u: int = spanne[0]
	var o: int = spanne[1]
	var r: int = mini(KernWerte.RANG_MAX, maxi(KernWerte.RANG_MIN, rang))
	return KernFestkomma.divGanz(KernWerte.RANG_LP_TEILER * u + KernWerte.RANG_LP_FAKTOR * (o - u) * (r - KernWerte.RANG_MIN) + KernWerte.RANG_LP_RUNDUNG, KernWerte.RANG_LP_TEILER)


## Setzt LP und Max-LP nach dem Rang dieses Frames plus Bonus der Welle (g.lp_bonus) und löscht lp_offen.
static func lpNachRangSetzen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.rang_beim_erscheinen = welt.rang.rang
	g.lp = lpNachRang(g.typ, g.rolle, welt.rang.rang) + g.lp_bonus
	g.lp_max = g.lp
	g.lp_vor = g.lp
	g.lp_offen = false


## Nach dem Anlegen eines Gegners mit Logik an außer dem Boss (erzeugeWelt,
## Eingriff „erscheint“, Wellen): Ist g.lp_offen, LP und lp_max nach dem Rang
## setzen (Welt 4.5, 8; Bonus der Welle in g.lp_bonus). Wartende (WARTEN)
## bekommen ihre LP erst beim Weckreiz. Der Modus bleibt: WARTEN (aus der
## Stage) bzw. FREI (Prüfszene, Rand; wach und kampffähig).
static func gegnerAngelegt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.lp_offen and g.modus != "WARTEN":
		lpNachRangSetzen(welt, g)


# ===========================================================================
# Weckreiz (Welt 4.2)
# ===========================================================================

## Dauer bis kampffähig je Auftritt (Welt 4.2).
static func auftrittDauer(auftritt: String, typ: String) -> int:
	match auftritt:
		"hocke":
			return KernWerte.AUFTRITT_HOCKE_RAMMBOCK if typ == "Rammbock" else KernWerte.AUFTRITT_HOCKE_BOLZER
		"versteck":
			return KernWerte.AUFTRITT_VERSTECK
		"luke":
			return KernWerte.AUFTRITT_LUKE
		"boss":
			return KernWerte.AUFTRITT_BOSS
		_:
			return KernWerte.AUFTRITT_RAND


## Weckreiz im Frame w (Welt 4.2): AUFTRITT ab w, kampffähig ab w + Dauer
## (g.kampffaehig_ab), bis dahin nicht treffbar und nicht greifbar (Zustand 2),
## aber lebend. Ereignis WK:sn. Beim Boss zerbrechen alle Bosskisten (4.6).
## Der einzige Weg zum Weckreiz, auch für den Boss (gegner/boss.gd wartet
## in WARTEN nur und beendet den Auftritt in kampffaehig_ab).
static func weckreiz(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var w: int = welt.frame
	KernEntitaeten.modusSetzen(g, "AUFTRITT")
	g.aktion = "AUFTRITT"
	g.zustand = KernEntitaeten.ZUSTAND_BODEN
	g.weckreiz_w = w
	g.kampffaehig_ab = w + auftrittDauer(g.auftritt, g.typ)
	g.weckreiz_ab = 0
	if g.lp_offen:
		lpNachRangSetzen(welt, g)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["WECKREIZ"], g.schluessel])
	if g.typ == "Ballast":
		KernGegenstaende.bosskistenZerbrechen(welt)


# ===========================================================================
# W3
# ===========================================================================

## Legt einen vorgemerkten Gegner am Bildrand an (Welt 4.2: rand_links bei K − 32, rand_rechts bei K + 416).
static func eintragAnlegen(welt: KernWelt, v: KernWelt.Vormerkung) -> void:
	var e: KernStage.EintragSatz = v.eintrag
	var g: KernEntitaeten.Gegner = KernEntitaeten.freierGegner(welt)
	if g == null:
		return
	KernEntitaeten.gegnerBelegen(g, e.typ)
	var k: int = welt.kamera.x
	g.x = KernFestkomma.ausGanz(k + (KernWerte.RAND_LINKS_X if e.auftritt == "rand_links" else KernWerte.RAND_RECHTS_X))
	g.z = KernFestkomma.ausGanz(e.z)
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	g.rolle = KernAnlegen.rolleVon(e.typ)
	g.auftritt = e.auftritt
	g.welle = e.welle
	g.werte = "rang"
	g.vorplatziert = false
	g.logik = true
	g.erlaubnis = not welt.start.erlaubnis_aus.has(g.nr)
	g.rang_beim_erscheinen = welt.rang.rang
	g.lp_offen = true
	g.modus = "FREI"
	g.modus_uhr = 1
	g.aktion = "STAND"
	g.lp_bonus = v.bonus
	KernAnlegen.gegnerZufallGeben(welt, g)
	KernAnlegen.gegnerUebergeben(welt, g)


## W3 (Welt 1, 4.2, 4.4): in W7 des Vorframes vorgemerkte Gegner anlegen
## (nach Wellennummer, dann Zeilenfolge), danach Weckreiz: Hockende mit
## ⌊x⌋ − K ≤ 383 (K des Vorframes), Versteck, Luke und Boss, deren Welle im
## Vorframe (oder früher in diesem Frame per Eingriff) ausgelöst wurde.
static func wellenAnlegen(welt: KernWelt) -> void:
	var f: int = welt.frame
	# fällig: Vormerkungen dieses Frames, stabil nach Wellennummer des Eintrags
	# sortiert (Zeilenfolge bei gleicher Nummer bleibt erhalten)
	var faellig: Array = []
	for v: KernWelt.Vormerkung in welt.wellen.vorgemerkt:
		if v.frame != f:
			continue
		var pos: int = faellig.size()
		while pos > 0 and (faellig[pos - 1] as KernWelt.Vormerkung).eintrag.welle > v.eintrag.welle:
			pos -= 1
		faellig.insert(pos, v)
	var rest: Array = []
	for v: KernWelt.Vormerkung in welt.wellen.vorgemerkt:
		if v.frame > f:
			rest.append(v)
	welt.wellen.vorgemerkt = rest
	for v: KernWelt.Vormerkung in faellig:
		eintragAnlegen(welt, v)

	var kVor: int = welt.vorframe.kamera_x
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt or g.modus != "WARTEN":
			continue
		if g.weckreiz_ab > 0 and f >= g.weckreiz_ab:
			weckreiz(welt, g)
		elif g.auftritt == "hocke" and KernFestkomma.ganz(g.x) - kVor <= KernWerte.WECKREIZ_HOCKE:
			weckreiz(welt, g)


# ===========================================================================
# Auslösen (Welt 4.4)
# ===========================================================================

## Löst Welle nr aus (W7 oder Eingriff ziel=welle.n feld=jetzt in W1,
## Welt 11.3): genau einmal; Ereignis WL:n; neue Gegner werden für W3 von
## f + 1 + verzoegerung vorgemerkt (bei welle.7=nur_boss ohne die Bolzer);
## vorplatzierte Gegner der Welle mit Auftritt Versteck, Luke oder Boss wachen
## in W3 von f + 1 auf.
static func welleAusloesen(welt: KernWelt, nr: int) -> void:
	var f: int = welt.frame
	var w: KernWelt.WelleZustand = null
	for x: KernWelt.WelleZustand in welt.wellen.liste:
		if x.satz.nr == nr:
			w = x
			break
	if w != null:
		if w.ausgeloest:
			return
		w.ausgeloest = true
		w.frame = f
	elif welt.wellen.ausgeloest.has(nr):
		return
	welt.wellen.ausgeloest.append(nr)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["WELLE"], nr])
	var bonus: int = 0 if w == null else w.satz.bonus
	if not istBosswelleOhneEintraege(welt, nr):
		for e: KernStage.EintragSatz in welt.stage.eintraege:
			if e.welle != nr:
				continue
			if e.auftritt != "rand_links" and e.auftritt != "rand_rechts":
				push_error("Welle %d: Eintrag mit Auftritt „%s“ hat keine Lage in x (nur rand_links, rand_rechts)" % [nr, e.auftritt])
				return
			if e.typ == "Ballast":
				push_error("Welle %d: der Boss kann kein Eintrag sein" % nr)
				return
			var vm: KernWelt.Vormerkung = KernWelt.Vormerkung.new()
			vm.frame = f + 1 + e.verzoegerung
			vm.eintrag = e
			vm.bonus = bonus
			welt.wellen.vorgemerkt.append(vm)
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt or g.welle != nr or g.modus != "WARTEN":
			continue
		if g.auftritt == "versteck" or g.auftritt == "luke" or g.auftritt == "boss":
			g.weckreiz_ab = f + 1


static func ausloeserErfuellt(welt: KernWelt, w: KernWelt.WelleZustand) -> bool:
	var s: KernStage.WelleSatz = w.satz
	match s.ausloeser:
		"kamera":
			return welt.kamera.x >= s.wert
		"figur_abstand":
			var fx: int = KernFestkomma.ganz(welt.figur.x)
			for g: KernEntitaeten.Gegner in welt.gegner:
				if not g.belegt or g.welle != s.nr or g.modus != "WARTEN":
					continue
				if absi(fx - KernFestkomma.ganz(g.x)) <= s.wert:
					return true
			return false
		"arena":
			return welt.kamera.modus == "ARENA" and not KernKamera.kameraBlende(welt)
		"boss_lp":
			# dauerhaft abgezogene LP (Welt 7.5), Regel der Super-Armor bei K4
			var lp: Variant = KernGegnerBoss.bossLpDauerhaft(welt)
			return lp != null and (lp as int) <= s.wert
	return false


# ===========================================================================
# W7
# ===========================================================================

## Hat Welle nr Einträge, die angelegt werden (Welt 2.1; welle.7=nur_boss ohne)?
static func hatEintraege(welt: KernWelt, nr: int) -> bool:
	if istBosswelleOhneEintraege(welt, nr):
		return false
	for e: KernStage.EintragSatz in welt.stage.eintraege:
		if e.welle == nr:
			return true
	return false


## Besiegt nach KA4: alle Gegner der Welle sind aufgewacht bzw. angelegt, und
## ihre LP liegen unter 0. Abgeschaltete Wellen gelten als besiegt.
static func welleBesiegt(welt: KernWelt, nr: int) -> bool:
	var w: KernWelt.WelleZustand = null
	for x: KernWelt.WelleZustand in welt.wellen.liste:
		if x.satz.nr == nr:
			w = x
			break
	if w != null and w.aus:
		return true
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt or g.welle != nr:
			continue
		if g.modus == "WARTEN" or g.lp >= 0:
			return false
	if hatEintraege(welt, nr):
		if w == null or not w.ausgeloest:
			return false
		for v: KernWelt.Vormerkung in welt.wellen.vorgemerkt:
			if v.eintrag.welle == nr:
				return false
	return true


## Zahl der lebenden Gegner nach Welt 4.3.
static func lebendeZaehlen(welt: KernWelt) -> int:
	var n: int = 0
	for g: KernEntitaeten.Gegner in welt.gegner:
		if KernEntitaeten.istLebend(g):
			n += 1
	return n


## W7 (Welt 1, 4.4): Auslöser prüfen (Stand dieses Frames, nach der Kamera),
## Ereignis WL:n, neue Gegner vormerken; danach welt.lebende (4.3) und
## welt.wellen.besiegt (KA4) für diesen Frame setzen.
static func wellenPruefen(welt: KernWelt) -> void:
	var lebende: int = lebendeZaehlen(welt)
	if welt.rahmen.boss_t == 0:
		# Kopie der Wellenliste, stabil nach Wellennummer sortiert
		var liste: Array = []
		for w: KernWelt.WelleZustand in welt.wellen.liste:
			var pos: int = liste.size()
			while pos > 0 and (liste[pos - 1] as KernWelt.WelleZustand).satz.nr > w.satz.nr:
				pos -= 1
			liste.insert(pos, w)
		for w: KernWelt.WelleZustand in liste:
			if w.aus or w.ausgeloest:
				continue
			if not ausloeserErfuellt(welt, w):
				continue
			if w.satz.lebende_max != null and lebende > (w.satz.lebende_max as int):
				continue
			welleAusloesen(welt, w.satz.nr)
	welt.lebende = lebende
	var nummern: Array = []
	for w: KernWelt.WelleZustand in welt.wellen.liste:
		nummern.append(w.satz.nr)
	for s: KernWelt.SperreZustand in welt.sperren:
		nummern.append(s.welle)
	for nr: int in nummern:
		if welt.wellen.besiegt.has(nr):
			continue
		if welleBesiegt(welt, nr):
			welt.wellen.besiegt.append(nr)
