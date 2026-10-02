-- Ab Savestate "ingame" (kein Gegner in der Naehe): ein Schlag ins Leere,
-- Eingabe ab CC_PRESS (Standard 61, 2 Frames). Optional ab CC_WALK "rechts"
-- bis zum Ende gehalten (frueheste wirksame Laufeingabe), optional
-- CC_PRESS2 als zweiter Schlag (ab wann laesst sich neu schlagen?).
local press = tonumber(os.getenv("CC_PRESS") or "61")
local press2 = tonumber(os.getenv("CC_PRESS2") or "")
local walk = tonumber(os.getenv("CC_WALK") or "")
local inputs = { { press, press + 1, { "p1_attack" } } }
if press2 then inputs[#inputs + 1] = { press2, press2 + 1, { "p1_attack" } } end
if walk then inputs[#inputs + 1] = { walk, 140, { "p1_right" } } end

return {
	frames = 140,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 140, every = 1 },
}
