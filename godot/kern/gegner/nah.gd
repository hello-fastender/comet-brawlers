# Nahkämpfer Bolzer und Rammbock nach docs/spezifikation-welt.md, Abschnitt
# 5 (K3, Stufe 2): Zustandsautomat 5.2, Bewegung 5.3 (nah_gehen.gd),
# Angriff mit Zielabstand und Abbruch 5.4, Angriffsarten 5.5, Serie und
# Angriffswahl 5.6, Angriffserlaubnis 5.7 (auch für den Zünder, fern.gd;
# Abgabe der Rechte gemeinsam mit reaktion.gd in rechte.gd),
# Abwarten, Seitenwechsel, Verfolgung 5.8, Rückkehr nach Reaktionen 5.9.
#
# Port von spiel/src/kern/gegner/nah.ts.
#
# Ablauf im Frame:
#   W4  rechteSchritt   Halter prüfen, E-10, E-5 (nach rahmenVorlauf, welt.gd)
#       nahEntscheidung Zustand, Recht anfordern (E-3), Gehstufe ziehen,
#                       Angriffsbeginn A (Zielabstand Z, Schaden, AS:sn:Code)
#   KS3 nahBewegung     Schritt zum Ziel, Sprungtritt, aktive Frames setzen
#   KS5 nahAbbruch      Abbruchfenster x_Z − 32 … x_Z + 31, dz −10 … +11
#   KS7 nahHatGetroffen wirksamer Treffer: Trefferstopp, Serienende
#
# Zufall nur aus g.zufall, je Entscheidung eine Ziehung (Entscheidungen mit
# nur einer Möglichkeit ziehen nicht); welt.fest[name] ersetzt das Ergebnis
# nach der Ziehung (Welt 11.3). Namen der festen Ziehungen: FEST unten.
#
# Festlegungen K3 (Lücken, Bericht):
# - Der feste Rückzug im Nachlauf (5.5) bewegt den Gegner nicht; Strecke und
#   Tempo sind nicht angegeben.
# - Die Abwartezeit zählt in jedem Zustand herunter; ein Recht fordert der
#   Gegner erst an, wenn sie abgelaufen ist (auch nach Seitenwechsel und
#   Spott). Nach verbrauchtem Verfolgungsbudget wird keine neue Abwartezeit
#   gezogen (11.2 nennt dort nur Spott oder Abwarten).
# - Haltepunkt erreicht, aber dz außerhalb von −10 … +11: der Gegner geht nur
#   in der Tiefe weiter (5.3 „sonst geht er in z weiter“).
# - BUB direkt nach dem Nachlauf von BA (5.6): die Wahl BUB/BUA fällt am Ende
#   dieses Nachlaufs; nach einer Unterbrechung (Reaktion) fällt sie bei A.
# - „Figur hinter ihm“ (5.2) wird mit dem Blick des Vorframes geprüft; in
#   Kampfhaltung schaut er danach wieder zur Figur.
# - Nach einer Reaktion (modus FREI, gesetzt von K2 im ersten freien Frame)
#   wählt W4 des nächsten Frames: so gilt s = h+24 (5.9) und Bewegung ab G+1;
#   das Recht nach dem Aufstehen fordert der Gegner damit in G+1 an.
# - Vom Tod der Figur bis N+1 und in der Blende (E-10) verlassen Halter
#   Kampfhaltung, Angriff und Nachlauf (ABWARTEN); ein Sprungtritt landet erst.
class_name KernGegnerNah
extends RefCounted

# ===========================================================================
# Namen, Typen, kleine Hilfen
# ===========================================================================

## Namen der Ziehungen für fest.<name>=<wert> (Welt 11.3) und ihre Werte.
const FEST: Dictionary = {
	## normal | schnell
	"gehstufe": "gehstufe",
	## Zahl der normalen Angriffe einer Gruppe
	"gruppe": "gruppe",
	## Rammbock: Gruppe beginnt mit Sprungtritt: ja | nein
	"sprungtritt": "sprungtritt",
	## normaler Angriff: BA BB BC RA RB
	"angriff": "angriff",
	## Umwerf-Angriff: BUA BUB RU RS
	"umwerf": "umwerf",
	## Länge des Nachlaufs in Frames
	"nachlauf": "nachlauf",
	## nach dem Serienende: abwarten | seitenwechsel | spott
	"serienende": "serienende",
	## Abwartezeit in Frames
	"abwarten": "abwarten",
	## Verfolgungsbudget in Gehbefehlen
	"verfolgung": "verfolgung",
	## nach verbrauchtem Budget: spott | abwarten
	"spott_oder_abwarten": "spott_oder_abwarten",
}

## Code eines Nahangriffs (Welt 5.5): ein Schlüssel von KernWerte.NAH_ANGRIFFE
## (TypeScript: NahCode), hier ein String.


static func istNahCode(c: String) -> bool:
	return KernWerte.NAH_ANGRIFFE.has(c)


## Eintrag i einer Liste (Index geprüft: eine Ziehung außerhalb der Liste ist ein Fehler).
static func eintrag(liste: Array, i: int) -> Variant:
	if i < 0 or i >= liste.size():
		push_error("Index %d außerhalb der Liste (Länge %d)" % [i, liste.size()])
		return null
	return liste[i]


## Codes der normalen Angriffe aus werte.gd als NahCode, geprüft
## (Welt 5.5, 5.6): jeder Code muss in NAH_ANGRIFFE stehen und je Code ein
## Anteil. TypeScript prüft beim Laden des Moduls; hier prüft jeder Aufruf
## (normalerAngriff) und meldet einen Fehler über push_error.
static func nahCodes(codes: Array, anteile: Array) -> Array:
	if codes.size() != anteile.size():
		push_error("Angriffscodes %s: %d Anteile" % [" ".join(PackedStringArray(codes)), anteile.size()])
	var ergebnis: Array = []
	for c: String in codes:
		if not istNahCode(c):
			push_error("Angriffscode „%s“ fehlt in NAH_ANGRIFFE (werte.gd)" % c)
		ergebnis.append(c)
	return ergebnis


## Modulinterner Zähler aus g.timer (fehlend = 0).
static func tm(g: KernEntitaeten.Gegner, name: String) -> int:
	return g.timer.get(name, 0) as int


## Ist t eine ganze Zahl im Sinn von /^-?\d+$/?
static func _istGanzeZahl(t: String) -> bool:
	var ziffern: String = t.substr(1) if t.begins_with("-") else t
	if ziffern.is_empty():
		return false
	for i in range(ziffern.length()):
		var c: int = ziffern.unicode_at(i)
		if c < 48 or c > 57:
			return false
	return true


## Ganze Zahl aus welt.fest[name], sonst wert (Welt 11.3: ersetzt das Ergebnis nach der Ziehung).
static func festZahl(welt: KernWelt, name: String, wert: int) -> int:
	if not welt.fest.has(name):
		return wert
	var t: String = welt.fest[name]
	if not _istGanzeZahl(t):
		push_error("fest.%s=%s: ganze Zahl erwartet" % [name, t])
		return wert
	return t.to_int()


## Text aus welt.fest[name], wenn er zu den erlaubten gehört, sonst wert.
static func festWahl(welt: KernWelt, name: String, erlaubt: Array, wert: String) -> String:
	if not welt.fest.has(name):
		return wert
	var t: String = welt.fest[name]
	for e: String in erlaubt:
		if e == t:
			return e
	push_error("fest.%s=%s: erlaubt sind %s" % [name, t, " ".join(PackedStringArray(erlaubt))])
	return wert


## Aktueller Modus (ohne Typverengung aus einem vorigen switch).
static func modusVon(g: KernEntitaeten.Gegner) -> String:
	return g.modus


## Ist g ein Nahkämpfer mit Logik (Bolzer, Rammbock)?
static func istNahkaempfer(g: KernEntitaeten.Gegner) -> bool:
	return g.typ == "Bolzer" or g.typ == "Rammbock"


## dz (Gegner minus Figur, Welt 1) im Bereich −10 … +11 (Welt 5.2)?
static func dzImKampfbereich(dz: int) -> bool:
	return dz >= KernWerte.KAMPF_DZ_MIN and dz <= KernWerte.KAMPF_DZ_MAX


## Abstände nach Welt 1: dx, dz = Gegner minus Figur (ganzzahlig).
## Rückgabe: Dictionary mit dx und dz.
static func weltAbstand(welt: KernWelt, g: KernEntitaeten.Gegner) -> Dictionary:
	return {"dx": KernFestkomma.ganz(g.x) - KernFestkomma.ganz(welt.figur.x), "dz": KernFestkomma.ganz(g.z) - KernFestkomma.ganz(welt.figur.z)}


## Seite aus dx (E-1): Vorzeichen, bei dx = 0 die bisherige.
static func seiteAus(dx: int, bisher: int) -> int:
	return 1 if dx > 0 else (-1 if dx < 0 else bisher)


## Gehstufe für einen neuen Gehbefehl ziehen (schnell mit 1/3, Welt 5.1, 5.3), Haltabstand H danach.
static func gehstufeZiehen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var z: int = KernZufall.ziehenAus(g.zufall, KernWerte.GEHSTUFE_AUS)
	var stufe: String = festWahl(welt, FEST["gehstufe"], ["normal", "schnell"], "schnell" if z == 0 else "normal")
	g.gehstufe = stufe
	g.haltabstand = KernWerte.HALTABSTAND_SCHNELL if stufe == "schnell" else KernWerte.HALTABSTAND_NORMAL
	g.gehbefehl_rest = KernWerte.GEHBEFEHL_DAUER


# ===========================================================================
# Angriffserlaubnis (Welt 5.7), auch für den Zünder
# ===========================================================================

## E-10: vom Tod der Figur (t+1) bis zu ihrem Erscheinen (N+1), in der Blende,
## im Game Over und nach dem Fall des Bosses werden keine Rechte zugeteilt und
## beginnt kein Angriff, auch nicht der des Bosses (K4).
static func rechteGesperrt(welt: KernWelt) -> bool:
	var f: int = welt.frame
	var fig: KernEntitaeten.Figur = welt.figur
	if fig.tod_t > 0 and f > fig.tod_t and f <= KernRahmen.neueinstiegN(fig) + 1:
		return true
	if KernKamera.kameraBlende(welt, welt.frame):
		return true
	if welt.rahmen.gameover_frame > 0:
		return true
	var bossT: int = welt.rahmen.boss_t
	return bossT > 0 and f > bossT


## Halter des Nahkampfrechts der Seite (Slotnummer oder null).
static func rechtSlot(welt: KernWelt, seite: int) -> Variant:
	return welt.rechte.r if seite == 1 else welt.rechte.l


static func rechtSetzen(welt: KernWelt, seite: int, nr: Variant) -> void:
	if seite == 1:
		welt.rechte.r = nr
	else:
		welt.rechte.l = nr


## Fordert das Nahkampfrecht der eigenen Seite an (E-3): ein freies Recht wird
## sofort zugeteilt (RE:sn:L oder R). Nicht mit gegner.sN.erlaubnis=aus und
## nicht in E-10. Gibt zurück, ob g das Recht jetzt hält.
static func rechtAnfordern(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if g.recht != "":
		return true
	if not g.erlaubnis or rechteGesperrt(welt):
		return false
	if rechtSlot(welt, g.seite) != null:
		return false
	rechtSetzen(welt, g.seite, g.nr)
	g.recht = "R" if g.seite == 1 else "L"
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["RECHT_ERHALTEN"], g.schluessel, g.recht])
	return true


## Fordert das Zielrecht an (Welt 6: höchstens ein Fernkämpfer in ZIELEN oder SCHUSS); ZR:sn.
static func zielrechtAnfordern(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if g.zielrecht:
		return true
	if not g.erlaubnis or rechteGesperrt(welt) or welt.rechte.ziel != null:
		return false
	welt.rechte.ziel = g.nr
	g.zielrecht = true
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ZIELRECHT"], g.schluessel])
	return true


## Darf g in diesem Zustand das Nahkampfrecht halten (E-2, E-4)?
static func haeltRechtGueltig(g: KernEntitaeten.Gegner) -> bool:
	if KernEntitaeten.istReaktion(g.modus):
		return g.modus == "GETROFFEN"
	if g.modus == "FREI":
		return true
	if g.typ == "Zünder":
		return g.modus == "KOLBENHIEB"
	return g.modus == "ANNAEHERN" or g.modus == "KAMPFHALTUNG" or g.modus == "ANGRIFF" or g.modus == "NACHLAUF"


## Hält g das Zielrecht noch (Welt 6: von z bis A+16)?
static func zielrechtGueltig(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if g.modus == "ZIELEN":
		return true
	return g.modus == "SCHUSS" and welt.frame <= g.angriff_a + KernWerte.ZIELRECHT_BIS


## Ist der Gegner in der Luft eines Sprungtritts (bis zur Landung in A+46, Welt 5.5)?
static func sprungtrittInDerLuft(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	return g.modus == "ANGRIFF" and g.angriff_code == "RS" and welt.frame <= g.angriff_a + KernWerte.SPRUNGTRITT_AUFSETZEN


## W4, nach rahmenVorlauf und vor den Entscheidungen der einzelnen Gegner
## (Welt 5.7): Halter prüfen (E-2, E-4), E-10 (alle Rechte frei, keine
## Zuteilung), E-5 (Seitenwechsel der Halter).
## Die Anforderung je Gegner geschieht in nahEntscheidung bzw.
## fernEntscheidung (Slots aufsteigend).
static func rechteSchritt(welt: KernWelt) -> void:
	# Halter prüfen
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt:
			continue
		if g.recht != "":
			var seite: int = 1 if g.recht == "R" else -1
			if rechtSlot(welt, seite) != g.nr:
				g.recht = ""
			elif not haeltRechtGueltig(g):
				KernGegnerRechte.rechtAbgeben(welt, g)
		if g.zielrecht and (welt.rechte.ziel != g.nr or not zielrechtGueltig(welt, g)):
			KernGegnerRechte.zielrechtAbgeben(welt, g)
	for seite: int in [-1, 1]:
		var nr: Variant = rechtSlot(welt, seite)
		if nr == null:
			continue
		var g: KernEntitaeten.Gegner = welt.gegner[nr] if (nr as int) >= 0 and (nr as int) < welt.gegner.size() else null
		if g == null or not g.belegt or g.recht != ("R" if seite == 1 else "L"):
			rechtSetzen(welt, seite, null)
	var z: Variant = welt.rechte.ziel
	if z != null:
		var g: KernEntitaeten.Gegner = welt.gegner[z] if (z as int) >= 0 and (z as int) < welt.gegner.size() else null
		if g == null or not g.belegt or not g.zielrecht:
			welt.rechte.ziel = null
	# E-10
	if rechteGesperrt(welt):
		for g: KernEntitaeten.Gegner in welt.gegner:
			if not g.belegt:
				continue
			if g.recht != "":
				KernGegnerRechte.rechtAbgeben(welt, g)
			if g.zielrecht:
				KernGegnerRechte.zielrechtAbgeben(welt, g)
		return
	# E-5: Seitenwechsel der Halter, Slots aufsteigend
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt or g.recht == "":
			continue
		var alt: int = 1 if g.recht == "R" else -1
		var neu: int = seiteAus(weltAbstand(welt, g)["dx"] as int, alt)
		if neu == alt:
			g.seite = alt
			continue
		if sprungtrittInDerLuft(welt, g):
			if rechtSlot(welt, neu) != null:
				g.timer["rs_inaktiv"] = 1
			continue
		g.seite = neu
		if rechtSlot(welt, neu) == null:
			rechtSetzen(welt, alt, null)
			rechtSetzen(welt, neu, g.nr)
			g.recht = "R" if neu == 1 else "L"
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["RECHT_ERHALTEN"], g.schluessel, g.recht])
		else:
			KernGegnerRechte.rechtAbgeben(welt, g)


# ===========================================================================
# Zustandswechsel (Welt 5.2)
# ===========================================================================

## Laufenden Angriff ohne Ereignis beenden (Instanz weg, Code leer).
static func angriffBeenden(g: KernEntitaeten.Gegner) -> void:
	g.angriff = null
	g.angriff_code = ""


static func beginneAnnaehern(g: KernEntitaeten.Gegner, verfolgung: bool) -> void:
	KernEntitaeten.modusSetzen(g, "ANNAEHERN")
	g.gehbefehl_rest = 0
	g.timer["angekommen"] = 0
	g.timer["verfolgung"] = 1 if verfolgung else 0
	g.verfolgung_rest = -1 if verfolgung else 0


static func beginneAbwarten(g: KernEntitaeten.Gegner) -> void:
	angriffBeenden(g)
	KernEntitaeten.modusSetzen(g, "ABWARTEN")
	g.gehbefehl_rest = 0
	g.timer["verfolgung"] = 0


static func beginneSpott(g: KernEntitaeten.Gegner) -> void:
	angriffBeenden(g)
	KernEntitaeten.modusSetzen(g, "SPOTT")
	g.aktion = "SPOTT"


## Richtung des Bogens (5.8): +1 nach hinten oder −1 nach vorn, wo das Band um die Figur mehr Platz lässt; Gleichstand nach hinten.
static func bogenRichtung(welt: KernWelt) -> int:
	var fx: int = KernFestkomma.ganz(welt.figur.x)
	var fz: int = KernFestkomma.ganz(welt.figur.z)
	var b: Variant = KernStage.bandGrenzen(welt.stage, fx)
	if b == null:
		return 1
	var d: Dictionary = b
	return 1 if (d["oben"] as int) - fz >= fz - (d["unten"] as int) else -1


static func beginneSeitenwechsel(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	angriffBeenden(g)
	KernEntitaeten.modusSetzen(g, "SEITENWECHSEL")
	g.gehbefehl_rest = 0
	g.timer["angekommen"] = 0
	g.timer["wechsel_seite"] = -g.seite
	g.timer["wechsel_z"] = bogenRichtung(welt)


## Pause in Kampfhaltung 29 − 4·⌊Rang/4⌋ (Welt 5.1, 8).
static func pauseNachRang(rang: int) -> int:
	return KernWerte.PAUSE_BASIS - KernWerte.PAUSE_FAKTOR * KernFestkomma.divGanz(rang, KernWerte.PAUSE_TEILER)


static func beginneKampfhaltung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	angriffBeenden(g)
	KernEntitaeten.modusSetzen(g, "KAMPFHALTUNG")
	g.kampfhaltung_s = welt.frame
	g.pause = pauseNachRang(welt.rang.rang)
	g.timer["verfolgung"] = 0
	g.timer["angekommen"] = 0
	g.verfolgung_rest = 0
	g.aktion = "STAND"
	g.blick = KernEntitaeten.blickZu(g, welt.figur)


## Figur im Bereich der Kampfhaltung (5.2): dz in −10 … +11, |dx| ≤ 79, nicht hinter ihm.
static func inKampfbereich(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var a: Dictionary = weltAbstand(welt, g)
	var dx: int = a["dx"]
	var dz: int = a["dz"]
	if not dzImKampfbereich(dz) or absi(dx) > KernWerte.KAMPF_DX_MAX:
		return false
	return -dx * g.blick >= 0


## Abwartezeit abgelaufen: darf ein Recht anfordern (5.6).
static func darfAnfordern(g: KernEntitaeten.Gegner) -> bool:
	return g.abwarten_rest <= 0


## Nach Auftritt, Reaktion (FREI) oder als frischer Gegner (5.9).
static func nachFreiwerden(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.recht != "":
		if inKampfbereich(welt, g):
			beginneKampfhaltung(welt, g)
		else:
			beginneAnnaehern(g, false)
		return
	KernGegnerRechte.serieZuruecksetzen(g)
	if darfAnfordern(g) and rechtAnfordern(welt, g):
		beginneAnnaehern(g, false)
	else:
		beginneAbwarten(g)


# ===========================================================================
# Angriff (Welt 5.4 bis 5.6)
# ===========================================================================

## Trefferfläche eines Nahangriffs: Fenster um den Zielpunkt (5.4) bzw. Sprungtritt (5.5).
static func nahFlaeche(code: String, g: KernEntitaeten.Gegner) -> KernEntitaeten.Flaeche:
	if code == "RS":
		return KernEntitaeten.flaeche({
			"art": "abstand",
			"vorn": KernWerte.SPRUNGTRITT_VORN_BLICK_RECHTS if g.blick == 1 else KernWerte.SPRUNGTRITT_VORN,
			"hinten": KernWerte.SPRUNGTRITT_HINTEN_BLICK_RECHTS if g.blick == 1 else 0,
			"hinten_weg": null,
			"tiefe": KernWerte.SPRUNGTRITT_TIEFE,
			"hoehe_angreifer_max": null,
			"hoehe_ziel_max": KernWerte.SPRUNGTRITT_HOEHE_MAX,
		})
	return nahFenster(g)


## Fenster nach 5.4 um x_Z (g.ziel_x): Kampf-dz −11 … +10 (= Welt −10 … +11), Figur vor ihm oder 3 px (Blick rechts 4 px) hinter ihm, bis 48 px hoch.
static func nahFenster(g: KernEntitaeten.Gegner) -> KernEntitaeten.Flaeche:
	return KernEntitaeten.flaeche({
		"art": "fenster",
		"x_z": g.ziel_x,
		"links": KernWerte.ABBRUCH_LINKS,
		"rechts": KernWerte.ABBRUCH_RECHTS,
		"dz_min": -KernWerte.KAMPF_DZ_MAX,
		"dz_max": -KernWerte.KAMPF_DZ_MIN,
		"hinten": KernWerte.GEGNER_HINTEN_BLICK_RECHTS if g.blick == 1 else KernWerte.GEGNER_HINTEN,
		"hoehe_ziel_max": KernWerte.GEGNER_HOEHE_MAX,
	})


## Zielabstand Z = dx begrenzt auf −48 … +48 und Zielpunkt x_Z = ⌊x_Gegner⌋ − Z (5.4); setzt g.ziel_abstand, g.ziel_x.
static func zielabstandSetzen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var dx: int = weltAbstand(welt, g)["dx"]
	var z: int = maxi(-KernWerte.ZIELABSTAND_MAX, mini(KernWerte.ZIELABSTAND_MAX, dx))
	g.ziel_abstand = z
	g.ziel_x = KernFestkomma.ganz(g.x) - z


## Schaden beim Angriffsbeginn (5.4, 8): Startgegner fest, sonst nach der Rangstufe dieses Frames.
static func nahSchaden(welt: KernWelt, g: KernEntitaeten.Gegner) -> int:
	if g.werte == "start":
		return g.schaden
	var tabelle: Array = KernWerte.SCHADEN_RAMMBOCK if g.typ == "Rammbock" else KernWerte.SCHADEN_BOLZER
	return tabelle[KernRang.rangstufe(welt.rang.rang)] as int


## Neue Gruppe (5.6): Bolzer 2 bis 5 normale; Rammbock Sprungtritt mit 30 %, sonst 1 bis 3 normale.
static func neueGruppe(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.timer["gruppe_aktiv"] = 1
	g.gruppe_umwerf = ""
	if g.typ == "Rammbock":
		var rs: bool = KernZufall.prozent(g.zufall, KernWerte.RAMMBOCK_SPRUNGTRITT_ANTEIL)
		if festWahl(welt, FEST["sprungtritt"], ["ja", "nein"], "ja" if rs else "nein") == "ja":
			g.gruppe_rest = 0
			g.gruppe_umwerf = "RS"
			return
		g.gruppe_rest = festZahl(welt, FEST["gruppe"], KernZufall.wahl(g.zufall, KernWerte.RAMMBOCK_GRUPPE) as int)
		return
	g.gruppe_rest = festZahl(welt, FEST["gruppe"], KernZufall.wahl(g.zufall, KernWerte.BOLZER_GRUPPE) as int)


## Normaler Angriff (5.6): Bolzer BA 70 %, BB 25 %, BC 5 %; Rammbock RA, RB je 50 %.
static func normalerAngriff(welt: KernWelt, g: KernEntitaeten.Gegner) -> String:
	var rammbock: bool = g.typ == "Rammbock"
	var codes: Array
	if rammbock:
		codes = nahCodes(KernWerte.RAMMBOCK_ANGRIFF_CODES, KernWerte.RAMMBOCK_ANGRIFF_ANTEILE)
	else:
		codes = nahCodes(KernWerte.BOLZER_ANGRIFF_CODES, KernWerte.BOLZER_ANGRIFF_ANTEILE)
	var i: int = KernZufall.anteil(g.zufall, KernWerte.RAMMBOCK_ANGRIFF_ANTEILE if rammbock else KernWerte.BOLZER_ANGRIFF_ANTEILE)
	return festWahl(welt, FEST["angriff"], codes, eintrag(codes, i) as String)


## Umwerf-Angriff (5.6): Bolzer nach BA BUB mit 60 %, sonst BUA (ohne Ziehung); Rammbock RU 70 %, RS 30 %.
static func umwerfAngriff(welt: KernWelt, g: KernEntitaeten.Gegner) -> String:
	if g.typ == "Rammbock":
		var codes: Array = ["RU", "RS"]
		return festWahl(welt, FEST["umwerf"], codes, eintrag(codes, KernZufall.anteil(g.zufall, KernWerte.RAMMBOCK_UMWERF_ANTEILE)) as String)
	if tm(g, "letzter_ba") != 1:
		return festWahl(welt, FEST["umwerf"], ["BUA", "BUB"], "BUA")
	var bub: bool = KernZufall.prozent(g.zufall, KernWerte.BOLZER_BUB_ANTEIL)
	return festWahl(welt, FEST["umwerf"], ["BUA", "BUB"], "BUB" if bub else "BUA")


## Angriffsbeginn A im laufenden Frame (5.4 bis 5.6): Code wählen (Gruppe,
## normaler oder Umwerf-Angriff; vorgegeben bei BUB direkt nach BA),
## Zielabstand, Schaden, Instanz anlegen (aktiv ab A + Startup), AS:sn:Code.
## vorgegeben: Code (String) oder null.
static func beginneAngriff(welt: KernWelt, g: KernEntitaeten.Gegner, vorgegeben: Variant) -> void:
	var code: String
	var umwerf: bool = false
	if vorgegeben != null:
		code = vorgegeben
		umwerf = true
		g.serie = true
		g.gruppe_umwerf = ""
		g.timer["gruppe_aktiv"] = 0
	else:
		if not g.serie:
			g.serie = true
			g.timer["gruppe_aktiv"] = 0
		if tm(g, "gruppe_aktiv") != 1:
			neueGruppe(welt, g)
		if g.gruppe_umwerf != "" and istNahCode(g.gruppe_umwerf):
			code = g.gruppe_umwerf
			umwerf = true
			g.gruppe_umwerf = ""
			g.timer["gruppe_aktiv"] = 0
		elif g.gruppe_rest > 0:
			code = normalerAngriff(welt, g)
			g.gruppe_rest -= 1
			g.timer["letzter_ba"] = 1 if code == "BA" else 0
		else:
			code = umwerfAngriff(welt, g)
			umwerf = true
			g.timer["gruppe_aktiv"] = 0
	var w: Dictionary = KernWerte.NAH_ANGRIFFE[code]
	var f: int = welt.frame
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	zielabstandSetzen(welt, g)
	g.schaden = nahSchaden(welt, g)
	g.angriff_code = code
	g.angriff_a = f
	g.angriff_abgebrochen = false
	g.timer["ist_umwerf"] = 1 if umwerf else 0
	g.angriff_treffer = 0
	g.angriff_aktiv_ende = f + (w["aktiv_bis"] as int)
	g.timer["nachlauf_null"] = 0
	g.timer["rs_inaktiv"] = 0
	g.timer["rs_a"] = f if code == "RS" else 0
	g.angriff = KernEntitaeten.angriffsinstanz({
		"code": code,
		"angreifer": g.schluessel,
		"flaeche": nahFlaeche(code, g),
		"schaden": g.schaden,
		"umwerfen": w["umwerfen"],
		"richtung": "weg",
		"trefferstopp": true,
		"einmal": true,
		"gegen": "figur",
		"beginn": f,
	})
	KernEntitaeten.modusSetzen(g, "ANGRIFF")
	g.aktion = "SPRUNG" if code == "RS" else "ANGRIFF"
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ANGRIFF"], g.schluessel, code])


## Darf der Gegner jetzt einen Angriff beginnen (im aktiven Fenster, keine Sperre nach E-10)?
static func darfAngreifen(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	return KernEntitaeten.imFenster(g, welt.kamera.x) and not rechteGesperrt(welt)


## Nachlauf nach dem letzten aktiven Frame (5.5): Länge gleichverteilt aus der Spanne ohne bzw. mit Treffer.
static func nachlaufBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var code: String = g.angriff_code
	g.angriff = null
	var n: int = 0
	if istNahCode(code) and tm(g, "nachlauf_null") != 1:
		var w: Dictionary = KernWerte.NAH_ANGRIFFE[code]
		var ab: Array = w["nachlauf_mit"] if g.angriff_treffer > 0 else w["nachlauf_ohne"]
		var a: int = ab[0]
		var b: int = ab[1]
		n = a if a == b else festZahl(welt, FEST["nachlauf"], KernZufall.bereich(g.zufall, a, b))
	g.nachlauf_ende = welt.frame + n - 1
	if n <= 0:
		nachlaufEnde(welt, g)
		return
	KernEntitaeten.modusSetzen(g, "NACHLAUF")
	g.aktion = "NACHLAUF"


## Serienende (5.6): Recht zurück, Reaktion und Abwartezeit ziehen.
static func serienende(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernGegnerRechte.rechtAbgeben(welt, g)
	var rammbock: bool = g.typ == "Rammbock"
	var folgen: Array = ["seitenwechsel", "abwarten", "spott"] if rammbock else ["abwarten", "seitenwechsel", "spott"]
	var i: int = KernZufall.anteil(g.zufall, KernWerte.RAMMBOCK_SERIENENDE_ANTEILE if rammbock else KernWerte.BOLZER_SERIENENDE_ANTEILE)
	var folge: String = festWahl(welt, FEST["serienende"], ["abwarten", "seitenwechsel", "spott"], folgen[i] as String)
	g.abwarten_rest = festZahl(welt, FEST["abwarten"], KernZufall.wahl(g.zufall, KernWerte.ABWARTEN_RAMMBOCK if rammbock else KernWerte.ABWARTEN_BOLZER) as int)
	if folge == "seitenwechsel":
		beginneSeitenwechsel(welt, g)
	elif folge == "spott":
		beginneSpott(g)
	else:
		beginneAbwarten(g)


## Ende des Nachlaufs (5.2): Serienende, BUB direkt nach BA oder Kampfhaltung für den nächsten Angriff.
static func nachlaufEnde(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.angriff = null
	g.angriff_code = ""
	if tm(g, "serie_ende") == 1:
		g.timer["serie_ende"] = 0
		serienende(welt, g)
		return
	if g.typ == "Bolzer" and tm(g, "gruppe_aktiv") == 1 and g.gruppe_rest == 0 and g.gruppe_umwerf == "" and tm(g, "letzter_ba") == 1:
		var code: String = umwerfAngriff(welt, g)
		if code == "BUB" and darfAngreifen(welt, g):
			beginneAngriff(welt, g, "BUB")
			return
		g.gruppe_umwerf = code
	beginneKampfhaltung(welt, g)


# ===========================================================================
# Abwarten, Seitenwechsel (Welt 5.8)
# ===========================================================================

## Platz k unter den wartenden Gegnern dieser Seite, nach Slot ab 0 (5.8).
static func warteplatz(welt: KernWelt, g: KernEntitaeten.Gegner) -> int:
	var k: int = 0
	for h: KernEntitaeten.Gegner in welt.gegner:
		if h.nr >= g.nr:
			break
		if h.belegt and istNahkaempfer(h) and h.modus == "ABWARTEN" and h.seite == g.seite:
			k += 1
	return k


## Warteposition (5.8): |dx| = min(120 + 16·k, 140) auf der eigenen Seite, sonst auf der anderen; z = z_Figur im Band.
## Rückgabe: Dictionary mit x und z.
static func warteposition(welt: KernWelt, g: KernEntitaeten.Gegner) -> Dictionary:
	var d: int = mini(KernWerte.WARTEABSTAND_BASIS + KernWerte.WARTEABSTAND_SCHRITT * warteplatz(welt, g), KernWerte.WARTEABSTAND_MAX)
	var fx: int = KernFestkomma.ganz(welt.figur.x)
	var k: int = welt.kamera.x
	var x: int = fx + g.seite * d
	if x < k + KernWerte.HALTEPUNKT_MIN or x > k + KernWerte.HALTEPUNKT_MAX:
		x = KernGegnerNahGehen.fensterX(welt, fx - g.seite * d)
	return {"x": x, "z": KernGegnerNahGehen.bandZ(welt, x, KernFestkomma.ganz(welt.figur.z))}


## Zwischenziel über den Bogen (5.8), wenn das Ziel auf der anderen Seite der Figur liegt: erst z_Figur ± 40, dann x.
## Rückgabe: Dictionary mit x und z.
static func bogenZiel(welt: KernWelt, g: KernEntitaeten.Gegner, x: int, z: int, richtung: int) -> Dictionary:
	var fx: int = KernFestkomma.ganz(welt.figur.x)
	var gx: int = KernFestkomma.ganz(g.x)
	if (x - fx) * (gx - fx) >= 0:
		return {"x": x, "z": z}
	var zb: int = KernGegnerNahGehen.bandZ(welt, gx, KernFestkomma.ganz(welt.figur.z) + richtung * KernWerte.SEITENWECHSEL_Z)
	if KernFestkomma.abs(KernFestkomma.sub(g.z, KernFestkomma.ausGanz(zb))) >= KernWerte.WARTEPOSITION_TOLERANZ:
		return {"x": gx, "z": zb}
	return {"x": x, "z": zb}


# ===========================================================================
# W4
# ===========================================================================

static func annaehernEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.recht == "" and not (darfAnfordern(g) and rechtAnfordern(welt, g)):
		beginneAbwarten(g)
		abwartenEntscheidung(welt, g)
		return
	if tm(g, "verfolgung") == 1 and g.verfolgung_rest < 0:
		var liste: Array = KernWerte.VERFOLGUNG_RAMMBOCK if g.typ == "Rammbock" else KernWerte.VERFOLGUNG_BOLZER
		var budget: int = festZahl(welt, FEST["verfolgung"], KernZufall.wahl(g.zufall, liste) as int)
		g.verfolgung_rest = budget * KernWerte.GEHBEFEHL_DAUER
		g.gehbefehl_rest = 0
	if tm(g, "angekommen") == 1:
		g.timer["angekommen"] = 0
		if dzImKampfbereich(weltAbstand(welt, g)["dz"] as int):
			beginneKampfhaltung(welt, g)
			return
	if tm(g, "verfolgung") == 1 and g.verfolgung_rest == 0:
		KernGegnerRechte.rechtAbgeben(welt, g)
		var z: int = KernZufall.ziehenAus(g.zufall, KernWerte.SPOTT_ODER_ABWARTEN_AUS)
		var folge: String = festWahl(welt, FEST["spott_oder_abwarten"], ["spott", "abwarten"], "spott" if z == 0 else "abwarten")
		if folge == "spott":
			beginneSpott(g)
		else:
			beginneAbwarten(g)
		return
	if g.gehbefehl_rest <= 0:
		gehstufeZiehen(welt, g)


static func abwartenEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if darfAnfordern(g) and rechtAnfordern(welt, g):
		beginneAnnaehern(g, false)
		annaehernEntscheidung(welt, g)
		return
	var w: Dictionary = warteposition(welt, g)
	if not KernGegnerNahGehen.nahAn(g, w["x"] as int, w["z"] as int, KernWerte.WARTEPOSITION_TOLERANZ) and g.gehbefehl_rest <= 0:
		gehstufeZiehen(welt, g)


static func kampfhaltungEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.recht == "":
		beginneAbwarten(g)
		abwartenEntscheidung(welt, g)
		return
	if not inKampfbereich(welt, g):
		beginneAnnaehern(g, true)
		annaehernEntscheidung(welt, g)
		return
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	if welt.frame >= g.kampfhaltung_s + g.pause and darfAngreifen(welt, g):
		beginneAngriff(welt, g, null)


static func angriffEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.recht == "" and not sprungtrittInDerLuft(welt, g):
		beginneAbwarten(g)
		abwartenEntscheidung(welt, g)
		return
	if welt.frame > g.angriff_aktiv_ende and not sprungtrittInDerLuft(welt, g):
		nachlaufBeginnen(welt, g)


static func nachlaufEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.recht == "":
		beginneAbwarten(g)
		abwartenEntscheidung(welt, g)
		return
	if welt.frame > g.nachlauf_ende:
		nachlaufEnde(welt, g)


## W4 für einen Bolzer oder Rammbock (nicht in einer Reaktion, Logik an):
## Auftritt, Recht anfordern (E-3), Zustand nach 5.2 (FREI nach einer
## Reaktion: 5.9), Gehstufe, Angriffsbeginn A. Modus nur über modusSetzen.
static func nahEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.lp < 0:
		return
	if g.recht == "":
		g.seite = seiteAus(weltAbstand(welt, g)["dx"] as int, g.seite)
	if g.abwarten_rest > 0:
		g.abwarten_rest -= 1
	# match ohne Durchfall: ein Zweig, der in TypeScript mit break endet, läuft
	# hier bis zum Folgezustand unten weiter; return verlässt die Funktion.
	match g.modus:
		"WARTEN":
			g.aktion = "WARTEN"
			return
		"AUFTRITT":
			if welt.frame >= g.kampffaehig_ab:
				g.zustand = KernEntitaeten.ZUSTAND_NORMAL
				nachFreiwerden(welt, g)
			else:
				return
		"FREI":
			nachFreiwerden(welt, g)
		"SPOTT":
			if g.modus_uhr > KernWerte.SPOTT_DAUER:
				beginneAbwarten(g)
			else:
				return
		"SEITENWECHSEL":
			if tm(g, "angekommen") == 1:
				g.timer["angekommen"] = 0
				beginneAnnaehern(g, false)
			else:
				if g.gehbefehl_rest <= 0:
					gehstufeZiehen(welt, g)
				return
		"ANNAEHERN":
			annaehernEntscheidung(welt, g)
			return
		"ABWARTEN":
			abwartenEntscheidung(welt, g)
			return
		"KAMPFHALTUNG":
			kampfhaltungEntscheidung(welt, g)
			return
		"ANGRIFF":
			angriffEntscheidung(welt, g)
			return
		"NACHLAUF":
			nachlaufEntscheidung(welt, g)
			return
		_:
			return
	# Folgezustand dieses Frames weiterführen (Gehstufe, Recht)
	var folge: String = modusVon(g)
	if folge == "ANNAEHERN":
		annaehernEntscheidung(welt, g)
	elif folge == "ABWARTEN":
		abwartenEntscheidung(welt, g)


# ===========================================================================
# KS3
# ===========================================================================

## Gehbefehl um einen Frame weiterzählen.
static func gehbefehlZaehlen(g: KernEntitaeten.Gegner) -> void:
	if g.gehbefehl_rest > 0:
		g.gehbefehl_rest -= 1


static func annaehernGehen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var fig: KernEntitaeten.Figur = welt.figur
	var h: int = g.haltabstand if g.haltabstand > 0 else KernWerte.HALTABSTAND_NORMAL
	var vorher: Dictionary = weltAbstand(welt, g)
	g.blick = KernEntitaeten.blickZu(g, fig)
	if absi(vorher["dx"] as int) <= h and dzImKampfbereich(vorher["dz"] as int):
		g.timer["angekommen"] = 1
		g.aktion = "STAND"
		return
	if absi(vorher["dx"] as int) <= h:
		KernGegnerNahGehen.gehen(welt, g, KernFestkomma.ganz(g.x), KernFestkomma.ganz(fig.z), KernGegnerNahGehen.gehTempo(g), true)
	else:
		var hx: int = KernGegnerNahGehen.fensterX(welt, KernFestkomma.ganz(fig.x) + g.seite * h)
		KernGegnerNahGehen.gehen(welt, g, hx, KernGegnerNahGehen.bandZ(welt, hx, KernFestkomma.ganz(fig.z)), KernGegnerNahGehen.gehTempo(g))
	g.aktion = "GEHEN"
	gehbefehlZaehlen(g)
	if tm(g, "verfolgung") == 1 and g.verfolgung_rest > 0:
		g.verfolgung_rest -= 1
	var nachher: Dictionary = weltAbstand(welt, g)
	if absi(nachher["dx"] as int) <= h and dzImKampfbereich(nachher["dz"] as int):
		g.timer["angekommen"] = 1


static func abwartenGehen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var w: Dictionary = warteposition(welt, g)
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	if KernGegnerNahGehen.nahAn(g, w["x"] as int, w["z"] as int, KernWerte.WARTEPOSITION_TOLERANZ):
		g.aktion = "STAND"
		return
	var ziel: Dictionary = bogenZiel(welt, g, w["x"] as int, w["z"] as int, bogenRichtung(welt))
	KernGegnerNahGehen.gehen(welt, g, ziel["x"] as int, ziel["z"] as int, KernGegnerNahGehen.gehTempo(g))
	g.aktion = "GEHEN"
	gehbefehlZaehlen(g)


static func seitenwechselGehen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var fig: KernEntitaeten.Figur = welt.figur
	var fx: int = KernFestkomma.ganz(fig.x)
	var ws: int = 1 if tm(g, "wechsel_seite") >= 0 else -1
	var richtung: int = 1 if tm(g, "wechsel_z") >= 0 else -1
	var zielX: int = KernGegnerNahGehen.fensterX(welt, fx + ws * KernWerte.SEITENWECHSEL_DX)
	var ziel: Dictionary = bogenZiel(welt, g, zielX, KernGegnerNahGehen.bandZ(welt, zielX, KernFestkomma.ganz(fig.z) + richtung * KernWerte.SEITENWECHSEL_Z), richtung)
	g.blick = KernEntitaeten.blickZu(g, fig)
	KernGegnerNahGehen.gehen(welt, g, ziel["x"] as int, ziel["z"] as int, KernGegnerNahGehen.gehTempo(g))
	g.aktion = "GEHEN"
	gehbefehlZaehlen(g)
	var gekreuzt: bool = (KernFestkomma.ganz(g.x) - fx) * ws > 0
	if gekreuzt and KernFestkomma.abs(KernFestkomma.sub(g.x, KernFestkomma.ausGanz(zielX))) < KernWerte.WARTEPOSITION_TOLERANZ:
		g.timer["angekommen"] = 1


## Höhe des Sprungtritts in A+5+n (n = 1 … 41): 5n − n(n−1)/8 (Welt 5.5), in 1/65536.
static func sprungtrittHoehe(n: int) -> int:
	return KernFestkomma.sub(KernFestkomma.ausGanz(KernWerte.SPRUNGTRITT_HOEHE_LINEAR * n), KernFestkomma.divGanz(KernFestkomma.ausGanz(n * (n - 1)), KernWerte.SPRUNGTRITT_HOEHE_TEILER))


## Flug des Sprungtritts (5.5): ab A+5 mit 3 px/Frame in Blickrichtung, Höhe nach sprungtrittHoehe, Aufsetzen in A+46.
static func sprungtrittFlug(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var a: int = tm(g, "rs_a")
	if a <= 0 or (g.modus != "ANGRIFF" and g.modus != "NACHLAUF"):
		return
	var n: int = welt.frame - a - KernWerte.SPRUNGTRITT_FLUG_AB
	if n < 1 or n > KernWerte.SPRUNGTRITT_AUFSETZEN - KernWerte.SPRUNGTRITT_FLUG_AB:
		return
	var h: int = sprungtrittHoehe(n)
	var r: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(KernGegnerNahGehen.gegnerBegrenzung(welt), g.x, g.z, h, KernFestkomma.mulGanz(KernWerte.SPRUNGTRITT_X, g.blick), 0)
	g.x = r.x
	g.h = h if h > 0 else 0
	if n == KernWerte.SPRUNGTRITT_AUFSETZEN - KernWerte.SPRUNGTRITT_FLUG_AB:
		g.h = 0
		g.timer["rs_a"] = 0


## Aktive Frames des laufenden Angriffs setzen (5.4, 5.5): A + Startup bis A + Ende, vor einem wirksamen Treffer.
static func angriffFrame(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var code: String = g.angriff_code
	g.aktion = "SPRUNG" if code == "RS" else "ANGRIFF"
	var inst: KernEntitaeten.Angriffsinstanz = g.angriff
	if inst == null or not istNahCode(code):
		return
	var w: Dictionary = KernWerte.NAH_ANGRIFFE[code]
	var rel: int = welt.frame - g.angriff_a
	var aktiv: bool = rel >= (w["aktiv_von"] as int) and rel <= (w["aktiv_bis"] as int) and g.angriff_treffer == 0 and not g.angriff_abgebrochen
	if code == "RS":
		aktiv = aktiv and g.h > 0 and tm(g, "rs_inaktiv") != 1
	inst.aktiv = aktiv


## KS3 für einen Bolzer oder Rammbock (nicht in einer Reaktion): die in W4
## entschiedene Bewegung (Schritt mit stage.gd schrittBegrenzt, ohne
## Bildränder), Angriffsablauf fortschreiben, g.angriff.aktiv für diesen Frame
## setzen (Welt 5.4, 5.5).
static func nahBewegung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.lp < 0:
		return
	sprungtrittFlug(welt, g)
	match g.modus:
		"WARTEN":
			g.aktion = "WARTEN"
		"AUFTRITT":
			g.aktion = "AUFTRITT"
		"FREI":
			g.aktion = "STAND"
		"ANNAEHERN":
			annaehernGehen(welt, g)
		"ABWARTEN":
			abwartenGehen(welt, g)
		"SEITENWECHSEL":
			seitenwechselGehen(welt, g)
		"KAMPFHALTUNG":
			g.aktion = "STAND"
			g.blick = KernEntitaeten.blickZu(g, welt.figur)
		"ANGRIFF":
			angriffFrame(welt, g)
		"NACHLAUF":
			g.aktion = "NACHLAUF"
		"SPOTT":
			g.aktion = "SPOTT"
			g.blick = KernEntitaeten.blickZu(g, welt.figur)
		_:
			pass


# ===========================================================================
# KS5, KS7
# ===========================================================================

## Liegt die Figur außerhalb des Abbruchfensters (5.4 Punkt 3): ⌊x_Figur⌋
## außerhalb von x_Z − 32 … x_Z + 31 oder dz außerhalb von −10 … +11?
static func ausserhalbAbbruchfenster(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var fx: int = KernFestkomma.ganz(welt.figur.x)
	if fx < g.ziel_x - KernWerte.ABBRUCH_LINKS or fx > g.ziel_x + KernWerte.ABBRUCH_RECHTS:
		return true
	return not dzImKampfbereich(weltAbstand(welt, g)["dz"] as int)


## KS5 (Kampf 2.2; Welt 5.4 Punkt 3): Abbruchprüfung von A+1 bis zum letzten
## aktiven Frame ohne Treffer; bei Abbruch Instanz beenden, Ereignis AA:sn,
## Verfolgung (ANNAEHERN). Nicht beim Sprungtritt.
static func nahAbbruch(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.modus != "ANGRIFF" or g.angriff == null:
		return
	var code: String = g.angriff_code
	if not istNahCode(code):
		return
	var w: Dictionary = KernWerte.NAH_ANGRIFFE[code]
	if not (w["abbruch"] as bool) or g.angriff_treffer > 0:
		return
	var rel: int = welt.frame - g.angriff_a
	if rel < 1 or rel > (w["aktiv_bis"] as int):
		return
	if not ausserhalbAbbruchfenster(welt, g):
		return
	g.angriff = null
	g.angriff_abgebrochen = true
	g.angriff_code = ""
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ABBRUCH"], g.schluessel])
	beginneAnnaehern(g, true)
	g.aktion = "STAND"


## KS7, Seite des Urhebers (Welt 5.4 Punkt 5, 5.6): wirksamer Treffer eines
## Bolzers oder Rammbocks gegen die Figur: aktive Pose 7 Frames länger, beim
## Bolzer mit Umwerfen Ende 7 Frames nach dem Treffer und Nachlauf 0; danach
## trifft der Angriff nicht mehr. Wirft der Umwerf-Angriff wirksam um, endet
## die Serie nach dem Nachlauf.
static func nahHatGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.urheber)
	if g == null or g.modus != "ANGRIFF" or t.code != g.angriff_code:
		return
	var code: String = g.angriff_code
	if not istNahCode(code):
		return
	var f: int = welt.frame
	var umgeworfen: bool = t.wirkung == "U" or t.wirkung == "X"
	g.angriff_treffer = f
	if g.typ == "Bolzer" and umgeworfen:
		g.angriff_aktiv_ende = f + KernWerte.GEGNER_TREFFERSTOPP
		g.timer["nachlauf_null"] = 1
	else:
		g.angriff_aktiv_ende = g.angriff_a + (KernWerte.NAH_ANGRIFFE[code]["aktiv_bis"] as int) + KernWerte.GEGNER_TREFFERSTOPP
	if tm(g, "ist_umwerf") == 1 and umgeworfen:
		g.timer["serie_ende"] = 1
	if g.angriff != null:
		g.angriff.aktiv = false
