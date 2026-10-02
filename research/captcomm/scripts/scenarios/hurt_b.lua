-- Gegenlauf zu hurt.lua mit variierten Eingaben, ab Savestate "ingame":
-- laengerer Rechtslauf, dann etwas nach unten, danach ohne Gegenwehr.
local snaps = {}
for f = 60, 1300, 30 do snaps[f] = "hurt_b" end

return {
	frames = 1300,
	inputs = {
		{ 31, 160, { "p1_right" } },
		{ 161, 170, { "p1_down" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 1300, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
