-- Ab Savestate "ingame": einzelne Schlaege ins Leere mit grossem Abstand
-- (Startup/Recovery ohne Treffer), danach Annaeherung an den ersten Gegner
-- und schnelle Schlagfolge fuer die Kombokette. Abstand zum Gegner ist
-- vorlaeufig und wird nach dem ersten Lauf angepasst.
local inputs = {
	{ 61, 62, { "p1_attack" } },
	{ 181, 182, { "p1_attack" } },
	{ 301, 302, { "p1_attack" } },
	{ 421, 600, { "p1_right" } },
}
for f = 601, 900, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

return {
	frames = 1200,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 1200, every = 1 },
}
