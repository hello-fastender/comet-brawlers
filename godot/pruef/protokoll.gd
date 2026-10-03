# Frame-Protokoll und Objektprotokoll nach docs/spezifikation-kampf.md,
# 11.3 bis 11.5, mit den Zusatzspalten aus docs/spezifikation-welt.md, 11.4.
# Spaltenreihenfolge und Formate: docs/scheibe.md, Abschnitt „Formate“.
# Port von spiel/src/pruef/protokoll.ts. Ohne Dateizugriff (die Darstellung
# erzeugt dieselben Zeilen).
#
# Zahlen: Positionen als exakte Dezimalzahl des 16.16-Werts ohne
# überflüssige Nullen (KernFestkomma.zuDezimalText), ganze Zahlen dezimal;
# leere Felder bei freien Slots. Trennzeichen Komma, Zeilenende LF.
class_name PruefProtokoll
extends RefCounted

## Programmversion im Protokollkopf (Kampf 11.3, 11.6).
const PROTOKOLL_VERSION: String = "comet-brawlers-scheibe-0.1"

## Spalten der Figur und des Rahmens am Anfang (Kampf 11.3).
const SPALTEN_ANFANG: Array[String] = [
	"frame",
	"tasten",
	"f_x",
	"f_z",
	"f_h",
	"f_lp",
	"f_zst",
	"f_akt",
	"f_ph",
	"f_uhr",
	"f_stopp",
	"f_schutz",
	"f_blick",
	"kombo",
	"f_waffe",
	"f_mun",
	"f_sprint",
	"rang",
	"rang_zaehler",
	"kamera_x",
	"kamera_y",
	"zufall_haupt",
]

## Spalten je Gegnerslot nach Kampf 11.3 (Präfix sn_).
const SPALTEN_GEGNER: Array[String] = ["typ", "x", "z", "h", "lp", "zst", "akt", "modus", "ph", "blick"]

## Zusatzspalten der Welt (Welt 11.4), global.
const SPALTEN_WELT: Array[String] = [
	"kamera_modus",
	"schuetteln",
	"lebende",
	"wellen",
	"pfeil",
	"recht_l",
	"recht_r",
	"zielrecht",
	"leben",
	"punkte",
	"anzeige",
	"phase",
	"steuerung",
]

## Zusatzspalten der Welt je Gegnerslot (Welt 11.4, Präfix sn_).
const SPALTEN_GEGNER_WELT: Array[String] = ["recht", "angriff", "ziel", "schaden", "timer", "zufall"]

## Super-Armor des Bosses in s0 (Welt 11.4).
const SPALTEN_BOSS: Array[String] = ["s0_lpfolge", "s0_folge"]


## Alle Spalten von protokoll.csv in fester Reihenfolge.
static func protokollSpalten() -> Array[String]:
	var spalten: Array[String] = []
	spalten.append_array(SPALTEN_ANFANG)
	for n in range(KernWerte.GEGNER_SLOTS):
		for s: String in SPALTEN_GEGNER:
			spalten.append("s%d_%s" % [n, s])
	spalten.append_array(SPALTEN_WELT)
	for n in range(KernWerte.GEGNER_SLOTS):
		for s: String in SPALTEN_GEGNER_WELT:
			spalten.append("s%d_%s" % [n, s])
	spalten.append_array(SPALTEN_BOSS)
	spalten.append("ereignis")
	return spalten


## Spalten von objekte.csv (Kampf 11.5).
const OBJEKT_SPALTEN: Array[String] = [
	"frame",
	"slot",
	"typ",
	"art",
	"x",
	"z",
	"h",
	"zst",
	"lp",
	"munition",
	"liegezeit",
	"inhalt",
	"flugphase",
]


## Kommentarzeilen am Kopf von protokoll.csv (Kampf 11.3): version, szene, seed, eingabe_md5, EINGRIFF.
static func protokollKopf(start: KernStart.Pruefstart, eingabeMd5: String) -> Array[String]:
	var zeilen: Array[String] = [
		"# version=%s" % PROTOKOLL_VERSION,
		"# szene=%s" % start.name,
		"# seed=%d" % start.seed,
		"# eingabe_md5=%s" % eingabeMd5,
	]
	for g: KernStart.GegnerStart in start.gegner:
		if not KernStart.vonBeginn(g):
			zeilen.append("# EINGRIFF erscheint frame=%d slot=%d typ=%s x=%d z=%d" % [g.erscheint, g.slot, g.typ, g.x, g.z])
	for e: KernStart.EingriffDaten in start.eingriffe:
		zeilen.append("# EINGRIFF frame=%d ziel=%s feld=%s wert=%s" % [e.frame, e.ziel, e.feld, e.wert])
	for p: KernStart.PruefangriffDaten in start.pruefangriffe:
		zeilen.append(
			"# EINGRIFF pruefangriff slot=%d von=%d bis=%d schaden=%d umwerfen=%s"
			% [p.slot, p.von, p.bis, p.schaden, "ja" if p.umwerfen else "nein"]
		)
	return zeilen


## Kommentarzeilen am Kopf von objekte.csv (Festlegung K0: wie protokoll.csv ohne EINGRIFF).
static func objektKopf(start: KernStart.Pruefstart, eingabeMd5: String) -> Array[String]:
	return [
		"# version=%s" % PROTOKOLL_VERSION,
		"# szene=%s" % start.name,
		"# seed=%d" % start.seed,
		"# eingabe_md5=%s" % eingabeMd5,
	]


## Zeilen mit dem Trennzeichen Komma und LF zusammenfügen (TypeScript: Array.join).
static func zusammen(felder: Array[String], trenner: String) -> String:
	return trenner.join(PackedStringArray(felder))


static func zahlOderLeer(n: Variant) -> String:
	return "" if n == null else str(n)


static func gegnerFelder(g: KernEntitaeten.Gegner) -> Array[String]:
	if not g.belegt:
		var leer: Array[String] = []
		for _s in SPALTEN_GEGNER:
			leer.append("")
		return leer
	return [
		g.typ,
		KernFestkomma.zuDezimalText(g.x),
		KernFestkomma.zuDezimalText(g.z),
		KernFestkomma.zuDezimalText(g.h),
		str(g.lp),
		str(g.zustand),
		g.aktion,
		g.modus,
		g.phase,
		KernEntitaeten.blickText(g.blick),
	]


static func gegnerWeltFelder(g: KernEntitaeten.Gegner) -> Array[String]:
	if not g.belegt:
		var leer: Array[String] = []
		for _s in SPALTEN_GEGNER_WELT:
			leer.append("")
		return leer
	return [g.recht, g.angriff_code, str(g.ziel_abstand), str(g.schaden), str(g.modus_uhr), str(g.zufall.ziehungen)]


## Eine Zeile von protokoll.csv für den zuletzt gelaufenen Frame.
static func protokollZeile(welt: KernWelt) -> String:
	var f: KernEntitaeten.Figur = welt.figur
	var felder: Array[String] = [
		str(welt.frame),
		KernTasten.tastenZuText(welt.eingabe.t),
		KernFestkomma.zuDezimalText(f.x),
		KernFestkomma.zuDezimalText(f.z),
		KernFestkomma.zuDezimalText(f.h),
		str(f.lp),
		str(f.zustand),
		f.aktion,
		f.phase,
		str(f.uhr),
		str(f.stopp),
		str(f.schutz),
		KernEntitaeten.blickText(f.blick),
		str(f.kombo),
		f.waffe,
		str(f.munition),
		str(f.sprint_n),
		str(welt.rang.rang),
		str(welt.rang.zaehler),
		str(welt.kamera.x),
		str(welt.kamera.y),
		str(welt.zufall.ziehungen),
	]
	for g: KernEntitaeten.Gegner in welt.gegner:
		felder.append_array(gegnerFelder(g))
	# welt.wellen.ausgeloest.join('-'): Liste der ausgelösten Wellen, getrennt durch „-“
	var wellen_text: Array[String] = []
	for w: Variant in welt.wellen.ausgeloest:
		wellen_text.append(str(w))
	# welt.ereignisse.join(';'): Einträge sind schon Zeichenketten
	var ereignis_text: Array[String] = []
	for ev: Variant in welt.ereignisse:
		ereignis_text.append(str(ev))
	felder.append_array([
		welt.kamera.modus,
		"%d/%d" % [welt.kamera.schuetteln_x, welt.kamera.schuetteln_y],
		str(welt.lebende),
		zusammen(wellen_text, "-"),
		str(welt.kamera.pfeil),
		zahlOderLeer(welt.rechte.l),
		zahlOderLeer(welt.rechte.r),
		zahlOderLeer(welt.rechte.ziel),
		str(welt.rahmen.leben),
		str(welt.rahmen.punkte),
		zahlOderLeer(welt.rahmen.anzeige),
		welt.rahmen.phase,
		str(welt.rahmen.steuerung),
	])
	for g: KernEntitaeten.Gegner in welt.gegner:
		felder.append_array(gegnerWeltFelder(g))
	var boss: KernEntitaeten.Gegner = welt.gegner[KernWerte.BOSS_SLOT]
	if boss.belegt:
		felder.append(str(boss.lp_folge))
		felder.append(str(boss.folge))
	else:
		felder.append("")
		felder.append("")
	felder.append(zusammen(ereignis_text, ";"))
	for feld in felder:
		if feld.contains(",") or feld.contains("\n"):
			push_error("Protokollfeld „%s“ enthält ein Trennzeichen" % feld)
	return zusammen(felder, ",")


static func objektZeile(frame: int, o: KernEntitaeten.Objekt) -> String:
	return zusammen([
		str(frame),
		o.schluessel,
		o.typ,
		o.art,
		KernFestkomma.zuDezimalText(o.x),
		KernFestkomma.zuDezimalText(o.z),
		KernFestkomma.zuDezimalText(o.h),
		str(o.zustand),
		str(o.lp),
		str(o.munition),
		str(o.liegezeit),
		o.inhalt,
		o.flugphase,
	], ",")


## Zeilen von objekte.csv für den zuletzt gelaufenen Frame: belegte Slots o20 bis o59, dann g0 bis g4 (Kampf 11.5).
static func objektZeilen(welt: KernWelt) -> Array[String]:
	var zeilen: Array[String] = []
	for o: KernEntitaeten.Objekt in welt.objekte:
		if o.belegt:
			zeilen.append(objektZeile(welt.frame, o))
	for o: KernEntitaeten.Objekt in welt.geschosse:
		if o.belegt:
			zeilen.append(objektZeile(welt.frame, o))
	return zeilen
