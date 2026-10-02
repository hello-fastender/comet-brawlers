-- Ab Savestate "kontakt" (Gegner steht in Reichweite): ein einzelner
-- Schlag, Eingabe ab Frame CC_PRESS (2 Frames gedrueckt). Optional wird ab
-- Frame CC_WALK "links" (vom Gegner weg) bis zum Ende gehalten; der erste
-- Frame, in dem sich x aendert, markiert das Ende der Schlag-Recovery.
-- CC_PRESS2: optionaler zweiter Druck (Kombo-Fenster).
-- CC_VERT=m: vor dem Schlag m Frames hoch (m > 0) bzw. runter (m < 0)
-- laufen, ab Frame 2 (Tiefentoleranz).
-- Ohne CC_PRESS: kein Schlag (Referenzlauf). Eingaben in Frame 1 wirken
-- nicht (der Runner setzt Eingaben im Callback des Vorframes).
local press = tonumber(os.getenv("CC_PRESS") or "")
local press2 = tonumber(os.getenv("CC_PRESS2") or "")
local walk = tonumber(os.getenv("CC_WALK") or "")
local vert = tonumber(os.getenv("CC_VERT") or "")
local inputs = {}
if vert and vert > 0 then inputs[#inputs + 1] = { 2, 1 + vert, { "p1_up" } } end
if vert and vert < 0 then inputs[#inputs + 1] = { 2, 1 - vert, { "p1_down" } } end
if press then inputs[#inputs + 1] = { press, press + 1, { "p1_attack" } } end
if press2 then inputs[#inputs + 1] = { press2, press2 + 1, { "p1_attack" } } end
if walk then inputs[#inputs + 1] = { walk, 80, { "p1_left" } } end

return {
	frames = 80,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 80, every = 1 },
}
