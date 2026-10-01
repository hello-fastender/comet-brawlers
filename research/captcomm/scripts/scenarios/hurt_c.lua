-- Ab Savestate "ingame": dritter Lauf fuer Treffer gegen die Figur, mit
-- anderen Gegnern als hurt/hurt_b. Erst wie attack.lua den ersten Gegner
-- besiegen, dann 721-900 nach rechts; danach keine Eingabe. Der pinke
-- Gegner (30 LP) und weitere Gegner treffen die Figur (Schaden 5, 6 und 8),
-- werfen sie und lassen sie aufstehen.
local inputs = {
	{ 421, 540, { "p1_right" } },
	{ 541, 556, { "p1_up" } },
	{ 721, 900, { "p1_right" } },
}
for f = 561, 680, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

local snaps = {}
for f = 700, 1800, 30 do snaps[f] = "hurt_c" end

return {
	frames = 1800,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 1800, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
