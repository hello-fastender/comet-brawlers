# Kamera nach docs/spezifikation-welt.md, Abschnitt 3 (K3, Stufe 2): KA1 bis
# KA13 (Folgen nur nach rechts mit Folgepunkt Bildschirm-x 200, höchstens
# 4 px je Frame, Grenze aus Sperren, Halten, Schnitt und Arena, Pfeil
# „weiter“, Arena mit Totzone, Bildschütteln, Ende, Schnitt mit Blende).
# Port von spiel/src/kern/kamera.ts.
#
# kameraSchritt läuft in W6, nach dem Kampfschritt: ⌊x_Figur⌋ ist die Lage am
# Ende dieses Frames. Sperren und Halte lesen den Stand vom Ende des
# Vorframes (welt.vorframe.besiegt, welt.vorframe.lebende; Welt 1, KA4, KA6).
#
# Festlegungen K3 (Lücken, Bericht):
# - Sperren und Halte, deren Kamera-x links von K liegt, sind vorbei und
#   begrenzen nichts (sonst hielte Halt H1 bei 440 die Kamera eines
#   Prüfstarts in der Arena fest, Welt 12 PS7).
# - SR:id und HR:id stehen nur, wenn die Sperre bzw. der Halt die Kamera im
#   Vorframe hielt (Modus SPERRE bzw. HALT an deren Kamera-x); nur dann
#   beginnt der Pfeil.
# - Eine abgeschaltete Welle (welle.n=aus) gilt als besiegt.
# - BL:e steht in c+135, dem ersten Frame nach der Blende; dort wertet die
#   Figur wieder Eingaben aus und der Modus wird ARENA (K = k0).
# - Es gibt höchstens einen Schnitt (der erste Satz `schnitt`), weil
#   welt.kamera.schnitt_ausgefuehrt nur einen kennt.
# - Bildschütteln (KA10) beginnt mit schuettelnStarten im Frame des Anlasses
#   (Einschlag der Rakete, Landung der Körperpresse); der erste Wert gilt in
#   diesem Frame. Anlass und Beginn stehen in welt.kamera (schuetteln_art,
#   schuetteln_ab).
#
# Hinweis zum Port: SchuettelnArt ('presse' | 'explosion') ist ein String.
# Der TypeScript-Standardwert `f = welt.frame` von kameraBlende ist hier ein
# Variant-Parameter (null = welt.frame).
class_name KernKamera
extends RefCounted

## Frame c+29 der Blende: Versetzen (KA13).
const BLENDE_VERSETZEN: int = KernWerte.BLENDE_ZU + 1
## Letzter Frame der Blende c+134 (KA13).
const BLENDE_LETZTER: int = KernWerte.BLENDE_ZU + KernWerte.BLENDE_SCHWARZ + KernWerte.BLENDE_AUF

# ===========================================================================
# Bildschütteln (KA10), nur Darstellung
# ===========================================================================

## Beginnt das Bildschütteln im laufenden Frame (KA10): Körperpresse 11 Frames
## waagrecht, Explosion einer Rakete 4 Frames senkrecht. Wirkt nie auf K, Ky
## oder Logik. Für K4 (Landung der Körperpresse) und die Raketen.
## art: 'presse' oder 'explosion' (SchuettelnArt).
static func schuettelnStarten(welt: KernWelt, art: String) -> void:
	welt.kamera.schuetteln_art = art
	welt.kamera.schuetteln_ab = welt.frame


static func schuettelnSchritt(welt: KernWelt) -> void:
	var k: KernWelt.KameraZustand = welt.kamera
	k.schuetteln_x = 0
	k.schuetteln_y = 0
	var art: String = k.schuetteln_art
	if art == "":
		return
	var werte: Array[int] = KernWerte.SCHUETTELN_PRESSE if art == "presse" else KernWerte.SCHUETTELN_EXPLOSION
	var i: int = welt.frame - k.schuetteln_ab
	if i < 0:
		return
	if i >= werte.size():
		k.schuetteln_art = ""
		k.schuetteln_ab = 0
		return
	if art == "presse":
		k.schuetteln_x = werte[i]
	else:
		k.schuetteln_y = werte[i]


# ===========================================================================
# Hilfen
# ===========================================================================

## Ist Welle nr besiegt nach dem Stand vom Ende des Vorframes (KA4)? Abgeschaltete Wellen gelten als besiegt.
static func welleBesiegtVor(welt: KernWelt, nr: int) -> bool:
	if welt.vorframe.besiegt.has(nr):
		return true
	var w: KernWelt.WelleZustand = null
	for x: KernWelt.WelleZustand in welt.wellen.liste:
		if x.satz.nr == nr:
			w = x
			break
	return w != null and w.aus


## Der noch nicht ausgeführte Schnitt (KA3, KA13) oder null.
static func offenerSchnitt(welt: KernWelt) -> KernStage.SchnittSatz:
	if welt.kamera.schnitt_ausgefuehrt:
		return null
	if welt.stage.schnitte.size() > 0:
		return welt.stage.schnitte[0]
	return null


static func begrenzt(wert: int, min_wert: int, max_wert: int) -> int:
	if wert < min_wert:
		return min_wert
	if wert > max_wert:
		return max_wert
	return wert


## Läuft im Frame f die Blende (c+1 bis c+134)? f = null heißt welt.frame.
static func kameraBlende(welt: KernWelt, f: Variant = null) -> bool:
	var frame: int = welt.frame if f == null else (f as int)
	var c: int = welt.kamera.blende_c
	return c > 0 and frame > c and frame <= c + BLENDE_LETZTER


# ===========================================================================
# W6
# ===========================================================================

## Versetzen in c+29 (KA13): K, Ky, Figur auf (ziel_x, ziel_z), Blick rechts.
static func versetzen(welt: KernWelt, s: KernStage.SchnittSatz) -> void:
	var k: KernWelt.KameraZustand = welt.kamera
	k.x = s.ziel_kamera_x
	k.y = KernStage.kameraY(welt.stage, k.x)
	k.schnitt_ausgefuehrt = true
	var fig: KernEntitaeten.Figur = welt.figur
	fig.x = KernFestkomma.ausGanz(s.ziel_x)
	fig.z = KernFestkomma.ausGanz(s.ziel_z)
	fig.blick = 1
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["BLENDE"], "v"])


## Arena (KA8): Totzone ab arena_ab, K zwischen k0 und k1, auch nach links, höchstens 4 px je Frame.
static func arenaSchritt(welt: KernWelt) -> void:
	var k: KernWelt.KameraZustand = welt.kamera
	var a: KernStage.ArenaSatz = welt.stage.arena
	k.modus = "ARENA"
	if a == null:
		return
	if k.arena_ab == 0:
		k.arena_ab = welt.frame + 1
	if welt.frame >= k.arena_ab:
		var fx: int = KernFestkomma.ganz(welt.figur.x)
		var s: int = fx - k.x
		var ziel: int = k.x
		if s > a.totzone_rechts:
			ziel = fx - a.totzone_rechts
		elif s < a.totzone_links:
			ziel = fx - a.totzone_links
		ziel = begrenzt(ziel, a.k0, a.k1)
		k.x = begrenzt(ziel, k.x - KernWerte.KAMERA_MAX_SCHRITT, k.x + KernWerte.KAMERA_MAX_SCHRITT)
	k.y = KernStage.kameraY(welt.stage, k.x)


## Pfeil „weiter“ (KA5): ab dem Frame der Freigabe, bis K > Sperren-x + 64;
## 16 Frames an, 16 aus. PFEIL_TAKT ist eine Zweierpotenz: das Bit PFEIL_TAKT
## der Frames seit der Freigabe (nie negativ) ist die Hälfte des Takts, ohne
## Division (Kampf 2.4).
static func pfeilSchritt(welt: KernWelt) -> void:
	var k: KernWelt.KameraZustand = welt.kamera
	if k.freigabe_frame > 0 and k.x <= k.freigabe_x + KernWerte.PFEIL_BIS:
		k.pfeil = 1 if ((welt.frame - k.freigabe_frame) & KernWerte.PFEIL_TAKT) == 0 else 0
	else:
		k.pfeil = 0
		k.freigabe_frame = 0


## W6: neue Kamera-x und Kamera-y, Modus, Pfeil, Schütteln, Blende
## (welt.kamera.blende_c, Versetzen der Figur in c+29), Ereignisse SR, HR,
## BL. Bei welt.kamera.fest (Prüfbühne) bleibt alles.
static func kameraSchritt(welt: KernWelt) -> void:
	var k: KernWelt.KameraZustand = welt.kamera
	if k.fest:
		return
	var f: int = welt.frame
	var stage: KernStage.Stage = welt.stage
	schuettelnSchritt(welt)

	# KA11: ENDE ab dem Frame nach dem Fall des Bosses
	var bossT: int = welt.rahmen.boss_t
	if bossT > 0 and f > bossT:
		k.modus = "ENDE"
		k.pfeil = 0
		return

	# KA13: Blende c+1 bis c+134, Versetzen in c+29, Ende in c+135
	if k.blende_c > 0 and f > k.blende_c and f <= k.blende_c + BLENDE_LETZTER + 1:
		var d: int = f - k.blende_c
		var sch: KernStage.SchnittSatz = null
		if stage.schnitte.size() > 0:
			sch = stage.schnitte[0]
		if d == BLENDE_VERSETZEN and sch != null:
			versetzen(welt, sch)
		if d <= BLENDE_LETZTER:
			k.modus = "BLENDE"
			k.pfeil = 0
			return
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["BLENDE"], "e"])

	# KA7, KA8: Arena
	if k.modus == "ARENA" and stage.arena != null:
		arenaSchritt(welt)
		pfeilSchritt(welt)
		return

	var kAlt: int = k.x
	var fx: int = KernFestkomma.ganz(welt.figur.x)
	var lebendeVor: int = welt.vorframe.lebende

	# KA4, KA5: Sperren geben frei, sobald ihre Welle besiegt ist (Stand Vorframe)
	for s: KernWelt.SperreZustand in welt.sperren:
		if s.freigegeben or s.kamera_x < kAlt:
			continue
		if not welleBesiegtVor(welt, s.welle):
			continue
		s.freigegeben = true
		if kAlt == s.kamera_x and welt.vorframe.kamera_modus == "SPERRE":
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["SPERRE_FREI"], s.id])
			k.freigabe_frame = f
			k.freigabe_x = s.kamera_x
	# KA6: Halte geben frei, wenn höchstens max_lebende leben (Stand Vorframe)
	for h: KernWelt.HaltZustand in welt.halte:
		if h.freigegeben or h.kamera_x < kAlt:
			continue
		if lebendeVor > h.max_lebende:
			continue
		if kAlt == h.kamera_x and welt.vorframe.kamera_modus == "HALT":
			h.freigegeben = true
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["HALT_FREI"], h.id])

	# KA3: Grenze
	var grenze: int = stage.kamera_x_max
	for s: KernWelt.SperreZustand in welt.sperren:
		if not s.freigegeben and s.kamera_x >= kAlt:
			grenze = mini(grenze, s.kamera_x)
	for h: KernWelt.HaltZustand in welt.halte:
		if not h.freigegeben and h.kamera_x >= kAlt and lebendeVor > h.max_lebende:
			grenze = mini(grenze, h.kamera_x)
	var schnitt: KernStage.SchnittSatz = offenerSchnitt(welt)
	if schnitt != null and schnitt.kamera_x >= kAlt:
		grenze = mini(grenze, schnitt.kamera_x)
	var arena: KernStage.ArenaSatz = stage.arena
	if arena != null and kAlt <= arena.k0:
		grenze = mini(grenze, arena.k0)

	# KA1, KA2: nur nach rechts, Folgepunkt Bildschirm-x 200, höchstens 4 px
	var kz: int = fx - KernWerte.KAMERA_FOLGEPUNKT
	var kNeu: int = maxi(kAlt, mini(kz, grenze))
	kNeu = mini(kNeu, kAlt + KernWerte.KAMERA_MAX_SCHRITT)
	k.x = kNeu
	k.y = KernStage.kameraY(stage, kNeu)

	# Modus
	k.modus = "FREI"
	for s: KernWelt.SperreZustand in welt.sperren:
		if not s.freigegeben and s.kamera_x == kNeu:
			k.modus = "SPERRE"
	for h: KernWelt.HaltZustand in welt.halte:
		if not h.freigegeben and h.kamera_x == kNeu and lebendeVor > h.max_lebende:
			k.modus = "HALT"
	if arena != null and kNeu == arena.k0:
		k.modus = "ARENA"
		k.arena_ab = f + 1
	pfeilSchritt(welt)

	# KA13: Schnitt auslösen
	if schnitt != null and kNeu == schnitt.kamera_x and fx >= schnitt.figur_x:
		k.blende_c = f
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["BLENDE"], "a"])
