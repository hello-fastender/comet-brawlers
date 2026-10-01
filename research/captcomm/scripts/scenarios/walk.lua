-- Ab Savestate "ingame": Laufen in alle Richtungen mit Pausen dazwischen.
-- Erwartung: x aendert sich nur bei links/rechts, Tiefe (y/z) nur bei
-- hoch/runter. Daraus Laufgeschwindigkeit in Pixel/Frame.
--
-- Reihenfolge nach dem ersten Lauf (2026-10-01) umgestellt: Langes Laufen
-- nach rechts scrollt die Kamera, ab ~Frame 180 erscheint ein Gegner, der
-- ab ~540 angreift. Deshalb zuerst Tiefe, dann kurze Wege links/rechts
-- ohne Scroll (Figur startet am linken Rand), Diagonalen zuletzt.
local snaps = {}
for f = 60, 660, 60 do snaps[f] = "walk" end

return {
	frames = 660,
	inputs = {
		{ 61, 100, { "p1_up" } },
		{ 161, 200, { "p1_down" } },
		{ 261, 300, { "p1_right" } },
		{ 361, 400, { "p1_left" } },
		{ 461, 480, { "p1_right", "p1_up" } },      -- diagonal
		{ 541, 560, { "p1_left", "p1_down" } },     -- diagonal zurueck
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 660, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
