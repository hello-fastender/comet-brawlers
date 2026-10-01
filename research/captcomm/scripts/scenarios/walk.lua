-- Ab Savestate "ingame": Laufen in alle Richtungen mit Pausen dazwischen.
-- Erwartung: x aendert sich nur bei links/rechts, Tiefe (y/z) nur bei
-- hoch/runter. Daraus Laufgeschwindigkeit in Pixel/Frame.
return {
	frames = 720,
	inputs = {
		{ 61, 180, { "p1_right" } },
		{ 241, 360, { "p1_left" } },
		{ 421, 480, { "p1_up" } },
		{ 541, 600, { "p1_down" } },
		{ 661, 680, { "p1_right", "p1_up" } },      -- diagonal
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 720, every = 1 },
}
