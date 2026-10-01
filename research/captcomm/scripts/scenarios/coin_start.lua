-- Muenze, Start, Figurenwahl, dann Savestate "ingame" fuer alle weiteren
-- Szenarien. Kalibriert am ersten Lauf (MAME 0.264, siehe notes.md):
-- Figurenwahl ab ~Frame 720, Cursor startet auf Feld 1 (Mack the Knife).
-- Ein Druck nach rechts waehlt Captain Commando als Referenzfigur.
-- Ab ~Frame 1380 ist die Figur in Stage 1 steuerbar; bis 2400 ruht sie.
local snaps = {}
for f = 600, 2400, 60 do snaps[f] = "coin_start" end

return {
	frames = 2400,
	inputs = {
		{ 600, 605, { "coin1" } },
		{ 700, 705, { "start1" } },
		{ 800, 803, { "p1_right" } },                -- Feld 2: Captain Commando
		{ 900, 905, { "p1_attack" } },               -- Figur bestaetigen
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 500, to = 2400, every = 1 },
	snaps = snaps,
	save_states = { [2400] = "ingame" },
}
