# Prüflauf ohne Dateien nach docs/spezifikation-kampf.md, 11.2 und 11.6:
# Szene und Eingabedatei als Text hinein, protokoll.csv und objekte.csv als
# Text heraus. Port von spiel/src/pruef/pruefung.ts. MD5 und Stage-Texte gibt
# der Aufrufer hinein (lauf.gd mit Dateien, Tests im Speicher).
class_name PruefPruefung
extends RefCounted


## Eingang eines Prüflaufs.
class PruefEingang:
	var szeneText: String = ""
	var eingabeText: String = ""
	## liefert den Text der Stage-Datei zu einer Bühne (pruefbuehne, scheibe):
	## Callable (buehne: String) -> String
	var stageText: Callable = Callable()
	## MD5 eines Textes (UTF-8) als Hex, für eingabe_md5 im Kopf:
	## Callable (text: String) -> String
	var md5: Callable = Callable()


## Ergebnis eines Prüflaufs.
class PruefErgebnis:
	var start: KernStart.Pruefstart = null
	## Inhalt von protokoll.csv
	var protokoll: String = ""
	## Inhalt von objekte.csv
	var objekte: String = ""
	## Zahl der gelaufenen Frames
	var frames: int = 0
	## Welt nach dem letzten Frame
	var welt: KernWelt = null


## Schreibt laufend die Zeilen beider Protokolle (auch für die Darstellung).
## Anlegen: Protokollschreiber.new() und danach einrichten(start, eingabeMd5)
## (GDScript kennt keine Konstruktorargumente für innere Klassen).
class Protokollschreiber:
	var protokollZeilen: Array[String] = []
	var objektZeilen: Array[String] = []

	func einrichten(start: KernStart.Pruefstart, eingabeMd5: String) -> void:
		protokollZeilen = []
		protokollZeilen.append_array(PruefProtokoll.protokollKopf(start, eingabeMd5))
		protokollZeilen.append(",".join(PackedStringArray(PruefProtokoll.protokollSpalten())))
		objektZeilen = []
		objektZeilen.append_array(PruefProtokoll.objektKopf(start, eingabeMd5))
		objektZeilen.append(",".join(PackedStringArray(PruefProtokoll.OBJEKT_SPALTEN)))

	## Hängt die Zeilen des zuletzt gelaufenen Frames an.
	func frame(welt: KernWelt) -> void:
		protokollZeilen.append(PruefProtokoll.protokollZeile(welt))
		objektZeilen.append_array(PruefProtokoll.objektZeilen(welt))

	func protokoll() -> String:
		return "\n".join(PackedStringArray(protokollZeilen)) + "\n"

	func objekte() -> String:
		return "\n".join(PackedStringArray(objektZeilen)) + "\n"


## Neuer, eingerichteter Protokollschreiber (Ersatz für den Konstruktor).
static func protokollschreiberNeu(start: KernStart.Pruefstart, eingabeMd5: String) -> Protokollschreiber:
	var s: Protokollschreiber = Protokollschreiber.new()
	s.einrichten(start, eingabeMd5)
	return s


## MD5 eines Textes (UTF-8) als Hex: der md5-Parameter für PruefEingang.
static func md5Text(text: String) -> String:
	return text.md5_text()


## Prüflauf (Kampf 11.2): lädt Szene und Stage, spielt die Eingabedatei ab und
## läuft bis endframe oder bis welt.beendet (Ende der Scheibe, Welt 10.5).
static func pruefLauf(e: PruefEingang) -> PruefErgebnis:
	var start: KernStart.Pruefstart = PruefSzene.parseSzene(e.szeneText)
	var stage: KernStage.Stage = KernStage.parseStage(e.stageText.call(start.buehne) as String)
	var eingabe: PruefEingabe.Eingabefolge = PruefEingabe.parseEingabe(e.eingabeText)
	var welt: KernWelt = KernWelt.erzeugeWelt(stage, start)
	var schreiber: Protokollschreiber = protokollschreiberNeu(start, e.md5.call(e.eingabeText) as String)
	while welt.frame < start.endframe and not welt.beendet:
		KernWelt.logikSchritt(welt, PruefEingabe.tastenIn(eingabe, welt.frame + 1))
		schreiber.frame(welt)
	var ergebnis: PruefErgebnis = PruefErgebnis.new()
	ergebnis.start = start
	ergebnis.protokoll = schreiber.protokoll()
	ergebnis.objekte = schreiber.objekte()
	ergebnis.frames = welt.frame
	ergebnis.welt = welt
	return ergebnis
