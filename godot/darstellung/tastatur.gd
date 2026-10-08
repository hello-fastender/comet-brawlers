# Tastatur der Darstellung (Auftrag 3, 2.5; Kampf 2.1).
# Port von spiel/src/darstellung/tastatur.ts.
#
# Spieltasten: Pfeile = L R O U, Y oder Z = Angriff A, X = Sprung S.
# Steuertasten (außerhalb der Logik, nie aufgezeichnet; Welt 10.4, 10.6,
# 11.3): P Pause, F1 Debug-Anzeige, F2 Eingabeaufzeichnung, F3 Neustart mit
# Seed + 1, N Einzelschritt in der Pause, F11 Vollbild (E28).
#
# T(f) ist der Tastenstand zu Beginn des Logikschritts (abfragen()). Ein
# Druck, der zwischen zwei Abfragen beginnt und endet, zählt in der nächsten
# Abfrage noch als gedrückt, damit kein kurzer Tipp verloren geht
# (Festlegung K6). Die Tasten werden nach ihrer Lage erkannt
# (InputEventKey.physical_keycode, die Lage in der US-Belegung): Y und Z
# wirken auf QWERTZ und QWERTY gleich.
#
# Die Klasse ist kein Node: Der Knoten reicht seine InputEvents an eingabe()
# weiter (oder die Tests rufen runter() und hoch() mit Tastencodes auf).
class_name DarstellungTastatur
extends RefCounted

## Spieltasten nach physical_keycode (Key).
const SPIELTASTEN: Dictionary = {
	KEY_LEFT: KernTasten.TASTE_L,
	KEY_RIGHT: KernTasten.TASTE_R,
	KEY_UP: KernTasten.TASTE_O,
	KEY_DOWN: KernTasten.TASTE_U,
	KEY_Y: KernTasten.TASTE_A,
	KEY_Z: KernTasten.TASTE_A,
	KEY_X: KernTasten.TASTE_S,
}

## Steuertasten außerhalb der Logik: "pause", "debug", "aufzeichnung", "neustart", "einzelschritt", "vollbild".
const STEUERTASTEN: Dictionary = {
	KEY_P: "pause",
	KEY_F1: "debug",
	KEY_F2: "aufzeichnung",
	KEY_F3: "neustart",
	KEY_N: "einzelschritt",
	KEY_F11: "vollbild",
}

## je gehaltener Taste (Code) ihre Spieltaste
var gehalten: Dictionary = {}
## seit der letzten Abfrage neu gedrückt
var neu: int = KernTasten.KEINE
## Rückruf für Steuertasten: Callable (taste: String) -> void; darf leer sein
var steuer: Callable = Callable()


func _init(steuer_rueckruf: Callable = Callable()) -> void:
	steuer = steuer_rueckruf


## Nimmt ein InputEvent entgegen (Knoten: _input). Gibt true zurück, wenn die
## Taste eine Spiel- oder Steuertaste war (der Knoten verbraucht das Ereignis).
func eingabe(e: InputEvent) -> bool:
	if e is InputEventKey:
		var k: InputEventKey = e
		var code: int = k.physical_keycode
		if code == KEY_NONE:
			code = k.keycode
		if k.pressed:
			return runter(code, k.echo, k.ctrl_pressed or k.meta_pressed or k.alt_pressed)
		return hoch(code)
	return false


## Taste gedrückt (code: Key-Wert der Lage). echo: Wiederholung durch das
## Betriebssystem; verändert: Strg, Meta oder Alt gehalten (die Taste wirkt dann nicht).
func runter(code: int, echo: bool = false, veraendert: bool = false) -> bool:
	if veraendert:
		return false
	if SPIELTASTEN.has(code):
		var spiel: int = SPIELTASTEN[code]
		if not gehalten.has(code):
			neu |= spiel
		gehalten[code] = spiel
		return true
	if STEUERTASTEN.has(code):
		if not echo and steuer.is_valid():
			steuer.call(STEUERTASTEN[code] as String)
		return true
	return false


## Taste losgelassen.
func hoch(code: int) -> bool:
	gehalten.erase(code)
	return SPIELTASTEN.has(code)


## Alle Tasten los (Fenster verliert den Fokus).
func loslassen() -> void:
	gehalten.clear()
	neu = KernTasten.KEINE


## Gehaltene Spieltasten ohne Abfrage (für die Debug-Anzeige).
func stand() -> int:
	var t: int = KernTasten.KEINE
	for wert: int in gehalten.values():
		t |= wert
	return t


## T(f): Tastenstand zu Beginn des Logikschritts, dazu Drücke seit der letzten Abfrage.
func abfragen() -> int:
	var t: int = stand() | neu
	neu = KernTasten.KEINE
	return t
