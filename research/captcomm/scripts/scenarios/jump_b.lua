-- Gegenlauf zu jump.lua mit variierten Eingaben, ab Savestate "ingame":
-- erst ein Stueck nach rechts, dann Sprung im Stand, Sprung nach hinten
-- (links) und ein spaeter Sprungangriff.
local snaps = {}
for f = 30, 360, 10 do snaps[f] = "jump_b" end

return {
	frames = 360,
	inputs = {
		{ 31, 50, { "p1_right" } },
		{ 81, 82, { "p1_jump" } },
		{ 161, 175, { "p1_left" } },
		{ 161, 162, { "p1_jump" } },
		{ 251, 252, { "p1_jump" } },
		{ 270, 271, { "p1_attack" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 360, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
