-- Ab Savestate "ingame": Annaeherung wie attack.lua, aber ohne Schlaege.
-- Legt die Savestates "anlauf" (Frame 570, Gegner ~110 px entfernt und
-- im Anlauf) und "kontakt" fuer schlag.lua an. Gemessen (Lauf ohne
-- Schlaege): Der Gegner laeuft bis Frame ~610 heran, steht ab 612 in 46 px
-- Abstand (Tiefe +10), holt aus und trifft die Figur bei ~638-640.
return {
	frames = 612,
	inputs = {
		{ 421, 540, { "p1_right" } },
		{ 541, 556, { "p1_up" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 540, to = 612, every = 1 },
	save_states = { [570] = "anlauf", [612] = "kontakt" },
}
