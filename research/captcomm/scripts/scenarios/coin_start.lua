-- Muenze, Start, Figurenwahl, dann Savestate "ingame" fuer alle weiteren
-- Szenarien. Zeitpunkte sind vorlaeufig und werden anhand der Snapshots
-- und des RAM-Abzugs kalibriert (siehe notes.md).
local snaps = {}
for f = 600, 2400, 60 do snaps[f] = "coin_start" end

return {
	frames = 2400,
	inputs = {
		{ 600, 605, { "coin1" } },
		{ 700, 705, { "start1" } },
		{ 900, 905, { "p1_attack" } },               -- Figur bestaetigen
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 500, to = 2400, every = 1 },
	snaps = snaps,
	save_states = { [2400] = "ingame" },
}
