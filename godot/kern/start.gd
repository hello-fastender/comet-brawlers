# Prüfstart und Spielstart als Daten (docs/spezifikation-welt.md, 11.3;
# docs/spezifikation-kampf.md, 11.2).
# Port von spiel/src/kern/start.ts.
#
# Der Kern definiert den Anfangszustand als Datentyp; pruef/szene.gd
# liest ihn aus einer Prüfszene, die Darstellung nimmt standardStart(seed).
# Ein Spielstart ist ein Prüfstart ohne Abweichungen auf der Bühne scheibe.
#
# Typabbildung: optionale Felder (x?: number, T | null) sind Variant mit
# Standard null; Blick ist int (1 oder −1); Zeichenketten-Aufzählungen
# (GegnerTyp, Rolle, ObjektTyp, GegenstandArt, BehaelterArt, KameraModus)
# sind String.
class_name KernStart
extends RefCounted


## Abweichungen der Figur vom Start der Stage (Kampf 11.2: x, z, blick, lp, waffe, munition).
## Jedes Feld ist null (nicht angegeben) oder der Wert; waffe: '' oder 'RW'.
class FigurStart:
	var x: Variant = null
	var z: Variant = null
	var blick: Variant = null
	var lp: Variant = null
	var waffe: Variant = null
	var munition: Variant = null


## Gegner einer Prüfszene (Kampf 11.2: typ, x, z, blick, lp, lp_max, vorplatziert, logik).
class GegnerStart:
	## Gegnerslot 0 bis 19
	var slot: int = 0
	## GegnerTyp
	var typ: String = ""
	## Rolle: 'leicht', 'schwer', 'fern' oder 'boss'
	var rolle: String = ""
	var x: int = 0
	var z: int = 0
	## null: zur Figur (bei gleichem x rechts); sonst Blick (1 oder −1)
	var blick: Variant = null
	## null: nach Rolle und vorplatziert (Welt 4.5, 8)
	var lp: Variant = null
	var lp_max: Variant = null
	var vorplatziert: bool = false
	var logik: bool = false
	var erlaubnis: bool = false
	## Frame, in dessen W1 der Gegner erscheint (Eingriff); ERSTER_FRAME oder kleiner = von Beginn an
	var erscheint: int = 0


## Objekt einer Prüfszene (Kampf 11.2: typ, art, x, z, munition).
class ObjektStart:
	## Objektslot 20 bis 59
	var slot: int = 0
	## ObjektTyp: 'Gegenstand', 'Behälter', 'Rakete', 'Waffe' oder 'Effekt'
	var typ: String = ""
	## GegenstandArt, BehaelterArt oder ''
	var art: String = ""
	var x: int = 0
	var z: int = 0
	var munition: int = 0
	## GegenstandArt, 'leer' oder ''
	var inhalt: String = ""
	## Behälterkennung (für Behälter)
	var id: String = ""


## Eingriff `frame, ziel, feld, wert` (Kampf 11.2; Welt 11.3), wirkt in W1 von frame.
class EingriffDaten:
	var frame: int = 0
	## f, sn, on, gn, rang, kamera oder welle.n
	var ziel: String = ""
	var feld: String = ""
	var wert: String = ""


## Prüfangriff `pruefangriff, slot, von, bis, schaden, umwerfen` (Kampf 11.2); Ausführung in treffer.gd.
class PruefangriffDaten:
	var slot: int = 0
	var von: int = 0
	var bis: int = 0
	var schaden: int = 0
	var umwerfen: bool = false


## Zusätzlicher Behälter `behaelter.id=art,x,z,inhalt` (Welt 11.3).
class BehaelterZusatz:
	var id: String = ""
	## BehaelterArt
	var art: String = ""
	var x: int = 0
	var z: int = 0
	## GegenstandArt oder 'leer'
	var inhalt: String = ""


## Anfangszustand eines Laufs (Welt 11.3, Kampf 11.2).
class Pruefstart:
	var name: String = ""
	## letzter Frame des Prüflaufs; 0 = offen (Spiel)
	var endframe: int = 0
	var seed: int = 0
	## Stage-Kennung: pruefbuehne oder scheibe
	var buehne: String = ""
	## Startrang, null = Standard (9)
	var rang: Variant = null
	## Rang-Uhr steht (Welt 11.3)
	var rang_fest: bool = false
	var kamera_x: Variant = null
	## KameraModus oder null
	var kamera_modus: Variant = null
	## Wellen ohne vorplatzierte und neue Gegner (welle.n=aus): Array von int
	var wellen_aus: Array = []
	## welle.7=nur_boss: Welle 7 ohne die Bolzer, Boss wach und kampffähig, Bosskisten zerbrochen
	var welle7_nur_boss: bool = false
	## Array von String
	var sperren_aus: Array = []
	## Array von String
	var halte_aus: Array = []
	## Array von String
	var behaelter_aus: Array = []
	## Array von BehaelterZusatz
	var behaelter_zusatz: Array = []
	## Gegnerslots, die kein Recht anfordern (gegner.sn.erlaubnis=aus): Array von int
	var erlaubnis_aus: Array = []
	var boss_angriffe: bool = false
	var boss_bewegung: bool = false
	var boss_lp: Variant = null
	## fest.<entscheidung>=wert: ersetzt das Ergebnis einer Ziehung; die Ziehung findet trotzdem statt
	## (Dictionary String → String)
	var fest: Dictionary = {}
	var figur: FigurStart = FigurStart.new()
	## Array von GegnerStart
	var gegner: Array = []
	## Array von ObjektStart
	var objekte: Array = []
	## Array von EingriffDaten
	var eingriffe: Array = []
	## Array von PruefangriffDaten
	var pruefangriffe: Array = []


## Spielstart ohne Abweichungen (Bühne scheibe, Rang 9, Rang-Uhr läuft).
static func standardStart(seed_wert: int, buehne: String = "scheibe") -> Pruefstart:
	var s: Pruefstart = Pruefstart.new()
	s.name = "spiel"
	s.endframe = 0
	s.seed = seed_wert
	s.buehne = buehne
	s.rang = null
	s.rang_fest = false
	s.kamera_x = null
	s.kamera_modus = null
	s.wellen_aus = []
	s.welle7_nur_boss = false
	s.sperren_aus = []
	s.halte_aus = []
	s.behaelter_aus = []
	s.behaelter_zusatz = []
	s.erlaubnis_aus = []
	s.boss_angriffe = true
	s.boss_bewegung = true
	s.boss_lp = null
	s.fest = {}
	s.figur = FigurStart.new()
	s.gegner = []
	s.objekte = []
	s.eingriffe = []
	s.pruefangriffe = []
	return s


## Erscheint der Gegner von Beginn an (nicht erst über einen Eingriff)?
static func vonBeginn(g: GegnerStart) -> bool:
	return g.erscheint <= KernWerte.ERSTER_FRAME
