-- Ab Savestate "ingame": zweite Annaeherung fuer die Schlagreichweite, auf
-- dem Weg von attack_b.lua (Rechtslauf 241-365, hoch 366-379), aber ohne
-- Schlaege. Savestate "anlauf_b" bei Frame 385: Gegner (16 LP) laeuft heran,
-- mit anderer Subpixel-Lage als in "anlauf" (kontakt.lua).
return {
	frames = 385,
	inputs = {
		{ 241, 365, { "p1_right" } },
		{ 366, 379, { "p1_up" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 360, to = 385, every = 1 },
	save_states = { [385] = "anlauf_b" },
}
