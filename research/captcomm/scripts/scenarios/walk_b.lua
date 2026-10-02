-- Gegenlauf zu walk.lua mit variierten Eingaben (andere Reihenfolge,
-- Dauer und Startframes), ab Savestate "ingame". Dient der Bestaetigung
-- der Adressen fuer x und Tiefe in einem unabhaengigen Lauf.
local snaps = {}
for f = 30, 330, 30 do snaps[f] = "walk_b" end

return {
	frames = 330,
	inputs = {
		{ 41, 70, { "p1_down" } },
		{ 101, 125, { "p1_right" } },
		{ 151, 170, { "p1_up" } },
		{ 201, 215, { "p1_left" } },
		{ 241, 260, { "p1_right", "p1_down" } },    -- diagonal
		{ 291, 300, { "p1_left", "p1_up" } },       -- diagonal
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 330, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
