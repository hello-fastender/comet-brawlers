-- Ab Savestate "ingame": Kombokette gegen einen zweiten Gegnertyp.
-- Erst wie attack.lua den ersten Gegner ("WOOKY", 16 LP) besiegen, dann
-- weiter nach rechts, bis der naechste Gegner (pink, 30 LP, Slot 17)
-- erscheint. Rechtslauf bis 885 und 15 Frames hoch (Tiefe ~335) lassen ihn
-- von rechts in die Schlagfolge laufen. Laeuft die Figur weiter (bis 900),
-- geht er an ihr vorbei und wird bei Kontakt gepackt statt geschlagen.
local inputs = {
	{ 421, 540, { "p1_right" } },
	{ 541, 556, { "p1_up" } },
	{ 721, 885, { "p1_right" } },
	{ 886, 900, { "p1_up" } },
}
for f = 561, 680, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end
for f = 901, 1100, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

local snaps = {}
for f = 900, 1200, 15 do snaps[f] = "combo_c" end

return {
	frames = 1200,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 1200, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
