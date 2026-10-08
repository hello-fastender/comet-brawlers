# Sitzung der Darstellung: ein Lauf der Scheibe ab Spielstart (standardStart,
# Welt 11.3) oder ab einer Prüfszene (Kampf 11.2) mit Tastatur oder
# Eingabedatei (Kampf 11.1), dazu der Verlauf T(1) … T(f) für die
# Eingabeaufzeichnung, der Zustand außerhalb der Logik (Pause, Debug-Anzeige,
# Aufzeichnung F2) und optional ein Protokollschreiber. Port von
# spiel/src/darstellung/sitzung.ts (und der Steuerlogik aus main.ts, Klasse
# Spiel). Ohne Node und ohne Fenster: der Node spiel.gd ist nur eine dünne
# Hülle darüber, Tests treiben die Sitzung ohne Fenster.
#
# Die Sitzung ruft nur erzeugeWelt und logikSchritt des Kerns; sie liest die
# Welt, ändert sie aber nie selbst (Auftrag 3, 2.3: Protokoll vor
# Darstellung). T(f) aus einer Eingabedatei wird wie im Prüflauf bestimmt
# (pruef/pruefung.gd), deshalb ergeben Darstellung und Prüflauf dieselben
# Protokollzeilen.
#
# Zum Takt: Die TypeScript-Fassung hat einen Akkumulator (schleife.ts). In
# Godot übernimmt ihn die Physikschleife der Engine (60 Ticks je Sekunde,
# höchstens 4 je Bild, project.godot); spiel.gd ruft je Tick tick() auf.
class_name DarstellungSitzung
extends RefCounted

## Bühne der Darstellung (Welt 2.3).
const BUEHNE: String = "scheibe"
## Seed beim Start ohne Angabe (Welt 11.1: 0 ist verboten).
const SEED_STANDARD: int = 1
## Größter Seed (32-Bit-Zustand des Generators, Welt 11.1).
const SEED_MAX: int = 0xffffffff


## Geladene Prüfszene: Anfangszustand und Text ihrer Stage.
class Szene:
	var start: KernStart.Pruefstart = null
	var stageText: String = ""


## Seed + 1 für einen Neustart (F3, Game Over; Welt 10.3); 0 wird übersprungen.
static func naechsterSeed(seed_wert: int) -> int:
	var n: int = 1 if seed_wert >= SEED_MAX else seed_wert + 1
	return 1 if n == 0 else n


## Liest einen Seed aus einer Kommentarzeile „# seed=N“ der Eingabedatei (Festlegung K6), sonst 0.
static func seedAusEingabe(text: String) -> int:
	var re: RegEx = RegEx.new()
	re.compile("(?m)^#\\s*seed\\s*=\\s*(\\d+)\\s*$")
	var m: RegExMatch = re.search(text)
	if m == null:
		return 0
	var ziffern: String = m.get_string(1)
	if ziffern.length() > 10:
		return 0
	var seed_wert: int = ziffern.to_int()
	return seed_wert if seed_wert > 0 and seed_wert <= SEED_MAX else 0


## Stage-Datei der Bühne scheibe (Spielstart)
var stageText: String = ""
var seed_wert: int = SEED_STANDARD
var welt: KernWelt = null
## Anfangszustand des Laufs (standardStart oder Prüfstart)
var start: KernStart.Pruefstart = null
## T(f) je gelaufenem Frame, Index = Frame (Index 0 unbenutzt)
var verlauf: Array[int] = []
## geladene Eingabedatei oder null (Tastatur)
var folge: PruefEingabe.Eingabefolge = null
## Text der geladenen Eingabedatei (für die MD5 im Protokollkopf)
var eingabeText: String = ""
## geladene Prüfszene oder null (Spielstart)
var szene: Szene = null

## Tastatur der Sitzung (Spieltasten und Steuertasten)
var tastatur: DarstellungTastatur = null
## Pause (außerhalb der Logik, Welt 10.4)
var pause: bool = false
## Vollbild-Anfrage (F11); der Spielknoten wechselt den Fensterzustand und setzt sie zurück
var vollbild_anfrage: bool = false
## Debug-Anzeige (F1)
var debug: bool = false
## Frame, ab dem die laufende Aufzeichnung (F2) markiert ist; null = keine
var aufzeichnung_ab: Variant = null
## Nach so vielen Logikschritten pausiert tick() selbst; −1 = nie (Argument --schritte)
var schritte_max: int = -1
## Fertige Aufzeichnungen, vom Knoten abzuholen (nimmAufzeichnungen): Array von Dictionary {seed, text}
var fertige: Array = []

## Protokoll mitschreiben (Tests); aus lässt den Speicher klein
var protokollieren: bool = false
var schreiber: PruefPruefung.Protokollschreiber = null


func _init(stage_text: String = "", seed_neu: int = SEED_STANDARD) -> void:
	stageText = stage_text
	seed_wert = seed_neu
	tastatur = DarstellungTastatur.new(Callable(self, "steuer"))
	_weltNeu()


## Herkunft von T(f): "tastatur" oder "eingabe".
func quelle() -> String:
	return "tastatur" if folge == null else "eingabe"


## Legt Welt, Verlauf und (falls gewünscht) den Protokollschreiber neu an.
func _weltNeu() -> void:
	if szene == null:
		start = KernStart.standardStart(seed_wert, BUEHNE)
		welt = KernWelt.erzeugeWelt(KernStage.parseStage(stageText), start)
	else:
		start = szene.start
		welt = KernWelt.erzeugeWelt(KernStage.parseStage(szene.stageText), start)
	verlauf = [KernTasten.KEINE]
	schreiber = null
	if protokollieren:
		schreiber = PruefPruefung.protokollschreiberNeu(start, eingabeText.md5_text())


## Schaltet das Mitschreiben des Protokolls ein oder aus (beginnt neu, wenn die Welt im Frame 0 steht).
func protokollSetzen(an: bool) -> void:
	protokollieren = an
	if an and schreiber == null and welt.frame == 0:
		schreiber = PruefPruefung.protokollschreiberNeu(start, eingabeText.md5_text())
	elif not an:
		schreiber = null


## Neuer Lauf ab Spielstart (Frame 0) mit diesem Seed (0 = der bisherige); die Quelle bleibt.
func neustart(seed_neu: int = 0) -> void:
	if seed_neu != 0:
		seed_wert = seed_neu
	szene = null
	_weltNeu()


## Lädt eine Eingabedatei (Kampf 11.1) und beginnt ab Spielstart neu. Seed:
## das Argument, sonst „# seed=N“ aus der Datei, sonst der bisherige.
func ladeEingabe(text: String, seed_neu: int = 0) -> void:
	folge = PruefEingabe.parseEingabe(text)
	eingabeText = text
	var s: int = seed_neu
	if s == 0:
		s = seedAusEingabe(text)
	neustart(s)


## Lädt eine Prüfszene (Kampf 11.2, gelesen von pruef/szene.gd) mit dem Text
## ihrer Stage und einer Eingabedatei und beginnt bei Frame 0. Der Lauf endet
## wie der Prüflauf nach endframe.
func ladeSzene(start_daten: KernStart.Pruefstart, stage_text: String, eingabe: String) -> void:
	folge = PruefEingabe.parseEingabe(eingabe)
	eingabeText = eingabe
	var s: Szene = Szene.new()
	s.start = start_daten
	s.stageText = stage_text
	szene = s
	seed_wert = start_daten.seed
	_weltNeu()


## Zurück zur Tastatur; der Lauf geht vom aktuellen Frame aus weiter.
func tastaturNehmen() -> void:
	folge = null
	eingabeText = ""


## Ist der Lauf zu Ende (Welt 10.5, Game Over; bei einer Prüfszene nach endframe)?
func amEnde() -> bool:
	if welt.beendet:
		return true
	return szene != null and welt.frame >= szene.start.endframe


## Ein Logikschritt f = frame + 1 (Kampf 2.1). T(f) kommt aus der
## Eingabedatei, sonst aus dem übergebenen Tastenstand. Am Ende des Laufs
## läuft kein Schritt mehr; Rückgabe false.
func schritt(tasten: int) -> bool:
	if amEnde():
		return false
	var f: int = welt.frame + 1
	var t: int = tasten if folge == null else PruefEingabe.tastenIn(folge, f)
	KernWelt.logikSchritt(welt, t)
	verlauf.append(welt.eingabe.t)
	if schreiber != null:
		schreiber.frame(welt)
	return true


## T(f) des Verlaufs; nicht gelaufene Frames ohne Taste.
func tastenVon(f: int) -> int:
	if f < 0 or f >= verlauf.size():
		return KernTasten.KEINE
	return verlauf[f]


## Eingabedatei (Kampf 11.1) des laufenden Spiels, Frames 1 bis zum
## aktuellen Frame, damit sie sich ab Spielstart abspielen lässt. Der Kopf
## nennt Seed (Zeile „# seed=N“ liest ladeEingabe wieder) und Bühne und den
## markierten Bereich der Aufzeichnung (F2).
func aufzeichnungText(markiert_ab: Variant = null) -> String:
	var bis: int = welt.frame
	var kopf: PackedStringArray = PackedStringArray([
		"Comet Brawlers, Eingabeaufzeichnung der Godot-Fassung (Format docs/spezifikation-kampf.md, 11.1)",
		"seed=%d" % seed_wert,
		"buehne=%s ab Spielstart" % BUEHNE if szene == null else "szene=%s buehne=%s" % [szene.start.name, szene.start.buehne],
		"frames=1 bis %d" % bis,
	])
	if markiert_ab != null:
		kopf.append("aufzeichnung=%d bis %d (F2)" % [markiert_ab as int, bis])
	return PruefEingabe.eingabeText(Callable(self, "tastenVon"), bis, "\n".join(kopf))


# ===========================================================================
# Spielschleife und Steuertasten (main.ts, Klasse Spiel)
# ===========================================================================

## Ein Logikschritt mit der Tastatur; nach dem Ende der Scheibe Neustart mit Seed + 1 (Welt 10.3, 10.5).
func logikSchritt() -> void:
	schritt(tastatur.abfragen())
	if welt.beendet and szene == null:
		neuerLauf(naechsterSeed(seed_wert))


## Ein Tick der Physikschleife (60 je Sekunde): ein Logikschritt, außer in der
## Pause. Nach schritte_max Schritten schaltet sie die Pause ein.
func tick() -> void:
	if pause:
		return
	logikSchritt()
	if schritte_max >= 0 and welt.frame >= schritte_max:
		pause = true


## Neuer Lauf; eine laufende Aufzeichnung endet vorher und wird abgelegt.
func neuerLauf(seed_neu: int) -> void:
	if aufzeichnung_ab != null:
		aufzeichnungBeenden()
	neustart(seed_neu)


## Beendet die Aufzeichnung (F2): der Text liegt danach in fertige.
func aufzeichnungBeenden() -> void:
	fertige.append({"seed": seed_wert, "text": aufzeichnungText(aufzeichnung_ab)})
	aufzeichnung_ab = null


## Holt die fertigen Aufzeichnungen ab (Knoten: speichern).
func nimmAufzeichnungen() -> Array:
	var f: Array = fertige
	fertige = []
	return f


## Steuertaste (Rückruf der Tastatur): "pause", "debug", "aufzeichnung",
## "neustart", "einzelschritt" oder "vollbild" (nur die Anfrage; das Fenster schaltet der Knoten).
func steuer(taste: String) -> void:
	match taste:
		"vollbild":
			vollbild_anfrage = true
		"pause":
			pause = not pause
		"debug":
			debug = not debug
		"aufzeichnung":
			if aufzeichnung_ab == null:
				aufzeichnung_ab = welt.frame + 1
			else:
				aufzeichnungBeenden()
		"neustart":
			tastaturNehmen()
			neuerLauf(naechsterSeed(seed_wert))
		"einzelschritt":
			# Welt 10.6: in der Pause ein gewöhnlicher Logikschritt mit dem aktuellen Tastenstand
			# (Abweichung: auch bei geladener Eingabedatei, dann mit deren T(f))
			if pause:
				logikSchritt()


## Angaben für die Debug-Anzeige.
func debugInfo() -> DarstellungDebug.DebugInfo:
	var i: DarstellungDebug.DebugInfo = DarstellungDebug.DebugInfo.new()
	i.seed_wert = seed_wert
	i.tasten = tastatur.stand()
	i.quelle = quelle()
	i.pause = pause
	return i


## Ansicht außerhalb der Logik für die oberste Ebene.
func ansicht(hinweis: String = "") -> DarstellungZeichnen.Ansicht:
	var a: DarstellungZeichnen.Ansicht = DarstellungZeichnen.Ansicht.new()
	a.pause = pause
	a.aufzeichnung = aufzeichnung_ab != null
	a.hinweis = hinweis
	return a
