-- Gegenlauf zu attack.lua mit variierten Eingaben, ab Savestate "ingame":
-- Leerschlaege zu anderen Zeiten, Gegner frueher ausloesen, Tiefe nur
-- teilweise angleichen (14 statt 16 Frames), Schlaege alle 6 statt 8 Frames.
local inputs = {
	{ 41, 42, { "p1_attack" } },
	{ 121, 122, { "p1_attack" } },
	{ 241, 365, { "p1_right" } },
	{ 366, 379, { "p1_up" } },
}
for f = 386, 700, 6 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

local snaps = {}
for f = 30, 780, 30 do snaps[f] = "attack_b" end

return {
	frames = 780,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 780, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
