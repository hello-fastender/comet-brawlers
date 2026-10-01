-- Ab Savestate "ingame": Gegner ausloesen und ohne Gegenwehr stehen
-- bleiben, damit der Gegner die Figur trifft (Spieler-LP, Unverwundbarkeit).
local snaps = {}
for f = 120, 1500, 30 do snaps[f] = "hurt" end

return {
	frames = 1500,
	inputs = {
		{ 61, 180, { "p1_right" } },                 -- Scroll loest den Gegner aus
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 1500, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
