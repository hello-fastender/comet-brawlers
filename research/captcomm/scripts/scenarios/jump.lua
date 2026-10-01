-- Ab Savestate "ingame": Spruenge ohne Gegner in der Naehe.
-- Erwartung: Eine Hoehen-Adresse verlaesst den Bodenwert nur waehrend der
-- Spruenge und kehrt danach zurueck; x/Tiefe bleiben beim Sprung im Stand.
local snaps = {}
for f = 60, 420, 6 do snaps[f] = "jump" end

return {
	frames = 420,
	inputs = {
		{ 61, 62, { "p1_jump" } },                   -- Sprung im Stand
		{ 181, 210, { "p1_right" } },                -- Sprung nach vorn
		{ 181, 182, { "p1_jump" } },
		{ 301, 302, { "p1_jump" } },                 -- Sprungangriff
		{ 315, 316, { "p1_attack" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 420, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
