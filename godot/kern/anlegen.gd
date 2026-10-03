# Anlegen von Gegnern und Objekten aus Stage-Daten (Welt 2.1, 4.1, 9.1) und
# Prüfszene (Kampf 11.2; Welt 11.3). Gemeinsam für erzeugeWelt (welt.gd) und
# Eingriffe (eingriffe.gd). Logik der Gegner setzt danach gegnerAngelegt
# (wellen.gd, K3) bzw. bossAngelegt (gegner/boss.gd, K4).
# Port von spiel/src/kern/anlegen.ts.
#
# Typen: GegnerSatz und BehaelterSatz aus KernStage, GegnerStart und
# ObjektStart aus KernStart. Rolle, GegnerTyp und GegnerModus sind String.
class_name KernAnlegen
extends RefCounted


## Rolle nach Typ (Kampf 3, 11.2): Bolzer leicht, Rammbock schwer, Zünder fern, Ballast boss, Puppe leicht.
static func rolleVon(typ: String) -> String:
	match typ:
		"Rammbock":
			return "schwer"
		"Zünder":
			return "fern"
		"Ballast":
			return "boss"
		_:
			return "leicht"


## Startwerte nach Welt 4.5 (werte=start, vorplatziert): Bolzer bzw. Rolle
## leicht 16 LP / 5 Schaden, Rammbock bzw. Rolle schwer 30 LP / 6 Schaden,
## Ballast 100 LP (Welt 7.1). Zünder hat keine Startwerte: LP nach Rang.
## Rückgabe: Dictionary mit den Schlüsseln lp und schaden, oder null.
static func startwerte(g: KernEntitaeten.Gegner) -> Variant:
	if g.typ == "Ballast":
		return {"lp": KernWerte.BOSS_LP, "schaden": 0}
	if g.rolle == "leicht":
		return {"lp": KernWerte.BOLZER_START_LP, "schaden": KernWerte.BOLZER_START_SCHADEN}
	if g.rolle == "schwer":
		return {"lp": KernWerte.RAMMBOCK_START_LP, "schaden": KernWerte.RAMMBOCK_START_SCHADEN}
	return null


## Anfangsmodus eines neuen Gegners: sn_timer zeigt im ersten Frame 1 (beim
## Laden 0, weil welt.gd zu Beginn von Frame 1 hochzählt; beim Anlegen in
## einem laufenden Frame 1).
static func modusAnfang(welt: KernWelt, g: KernEntitaeten.Gegner, m: String) -> void:
	g.modus = m
	g.modus_uhr = 1 if welt.frame > 0 else 0


## Setzt LP und Schaden nach den Startwerten bzw. merkt lp_offen für LP nach Rang.
## lp und lpMax sind Zahlen oder null.
static func lpSetzen(g: KernEntitaeten.Gegner, lp: Variant, lpMax: Variant) -> void:
	var sw: Variant = startwerte(g) if g.werte == "start" else null
	if sw != null:
		g.schaden = (sw as Dictionary)["schaden"] as int
	if lp != null:
		g.lp = lp as int
	elif sw != null:
		g.lp = (sw as Dictionary)["lp"] as int
	else:
		g.lp = 0
		g.lp_offen = true
	g.lp_max = g.lp if lpMax == null else (lpMax as int)
	g.lp_vor = g.lp


## Legt einen vorplatzierten Gegner aus der Stage in Slot g an (Welt 2.1, 4.1, 4.2): WARTEN, Zustand 2.
static func gegnerAusStage(welt: KernWelt, g: KernEntitaeten.Gegner, satz: KernStage.GegnerSatz) -> void:
	KernEntitaeten.gegnerBelegen(g, satz.typ)
	g.x = KernFestkomma.ausGanz(satz.x)
	g.z = KernFestkomma.ausGanz(satz.z)
	g.blick = satz.blick
	g.rolle = rolleVon(satz.typ)
	g.auftritt = satz.auftritt
	g.welle = satz.welle
	g.werte = satz.werte
	g.vorplatziert = true
	g.logik = true
	g.erlaubnis = not welt.start.erlaubnis_aus.has(g.nr)
	g.rang_beim_erscheinen = welt.rang.rang
	modusAnfang(welt, g, "WARTEN")
	g.aktion = "WARTEN"
	g.zustand = KernEntitaeten.ZUSTAND_BODEN
	if g.typ == "Ballast":
		lpSetzen(g, KernWerte.BOSS_LP if welt.start.boss_lp == null else welt.start.boss_lp, null)
		g.angriffe_an = welt.start.boss_angriffe
		g.bewegung_an = welt.start.boss_bewegung
	else:
		lpSetzen(g, null, null)


## Legt einen Gegner der Prüfszene in seinem Slot an (Kampf 11.2): Logik aus
## → Puppe (PUPPE, Zustand 1, steht); Logik an → wach und kampffähig (FREI,
## Zustand 1; Welt 11.3). Ohne lp: Startwerte bei vorplatziert, sonst nach Rang.
static func gegnerAusSzene(welt: KernWelt, gs: KernStart.GegnerStart) -> KernEntitaeten.Gegner:
	if gs.slot < 0 or gs.slot >= welt.gegner.size():
		push_error("Gegnerslot s%d gibt es nicht" % gs.slot)
		return null
	var g: KernEntitaeten.Gegner = welt.gegner[gs.slot]
	KernEntitaeten.gegnerBelegen(g, gs.typ)
	g.x = KernFestkomma.ausGanz(gs.x)
	g.z = KernFestkomma.ausGanz(gs.z)
	g.blick = KernEntitaeten.blickZu(g, welt.figur) if gs.blick == null else (gs.blick as int)
	g.rolle = gs.rolle
	g.logik = gs.logik
	g.erlaubnis = gs.erlaubnis and not welt.start.erlaubnis_aus.has(gs.slot)
	g.vorplatziert = gs.vorplatziert
	g.werte = "start" if gs.vorplatziert else "rang"
	g.rang_beim_erscheinen = welt.rang.rang
	g.zustand = KernEntitaeten.ZUSTAND_NORMAL
	g.aktion = "STAND"
	modusAnfang(welt, g, "FREI" if gs.logik else "PUPPE")
	if g.typ == "Ballast":
		var boss_lp: Variant = KernWerte.BOSS_LP if welt.start.boss_lp == null else welt.start.boss_lp
		lpSetzen(g, boss_lp if gs.lp == null else gs.lp, gs.lp_max)
		g.angriffe_an = welt.start.boss_angriffe
		g.bewegung_an = welt.start.boss_bewegung
	else:
		lpSetzen(g, gs.lp, gs.lp_max)
	return g


## Gibt dem Gegner seinen Zufallsgenerator aus einer Ziehung des Hauptgenerators (Welt 11.1).
static func gegnerZufallGeben(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.zufall = KernZufall.gegnerZufall(welt.zufall)


## Übergibt einen frisch angelegten Gegner an seine Logik: Boss an K4, alle
## anderen an K3. Für Puppen (Logik aus) setzt gegnerAngelegt nur die LP nach
## Rang, wenn die Szene keine nennt (Lücke L18; Kernfehler aus Stufe 3).
static func gegnerUebergeben(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.typ == "Ballast":
		KernGegnerBoss.bossAngelegt(welt, g)
	else:
		KernWellen.gegnerAngelegt(welt, g)


## Legt einen Behälter in Objektslot o an (Welt 9.1, 9.2). satz hat die Felder
## id, art, x, z, inhalt (KernStage.BehaelterSatz, gleiche Felder wie der
## zusätzliche Behälter des Prüfstarts; deshalb als Object angenommen).
static func behaelterAnlegen(o: KernEntitaeten.Objekt, satz: Object, zerbrochen: bool) -> void:
	KernEntitaeten.objektBelegen(o, "Behälter")
	o.id = satz.id
	o.art = satz.art
	o.x = KernFestkomma.ausGanz(satz.x)
	o.z = KernFestkomma.ausGanz(satz.z)
	o.inhalt = satz.inhalt
	o.zerbrochen = zerbrochen


## Legt ein Objekt der Prüfszene in seinem Slot an (Kampf 11.2). Ein
## Gegenstand liegt von Beginn an (gelandet, aufnehmbar, liegezeit 0;
## Festlegung K0); ein Raketenwerfer ohne Angabe hat 3 Schuss.
static func objektAusSzene(welt: KernWelt, os: KernStart.ObjektStart) -> KernEntitaeten.Objekt:
	var i: int = os.slot - KernWerte.OBJEKT_SLOT_ERSTER
	if i < 0 or i >= welt.objekte.size():
		push_error("Objektslot o%d gibt es nicht" % os.slot)
		return null
	var o: KernEntitaeten.Objekt = welt.objekte[i]
	KernEntitaeten.objektBelegen(o, os.typ)
	o.id = os.id
	o.art = os.art
	o.x = KernFestkomma.ausGanz(os.x)
	o.z = KernFestkomma.ausGanz(os.z)
	o.inhalt = os.inhalt
	o.munition = os.munition if (os.munition > 0 or os.art != "Raketenwerfer") else KernWerte.RAKETENWERFER_MUNITION
	if os.typ == "Gegenstand":
		o.aufnehmbar = true
		o.landung_l = 0
		o.liegezeit = 0
	return o
