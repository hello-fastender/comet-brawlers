-- Ab Savestate "ingame": Annaeherung des pinken Gegners (30 LP) fuer die
-- Schlagreichweite gegen den zweiten Gegnertyp. Wie combo_c.lua, aber
-- Rechtslauf nur bis 860 und 16 Frames hoch: Der Gegner steht dann ~105 px
-- entfernt auf gleicher Tiefe und laeuft ab ~904 mit 1,75 px/Frame heran.
-- Savestate "anlauf_c" bei Frame 900.
local inputs = {
	{ 421, 540, { "p1_right" } },
	{ 541, 556, { "p1_up" } },
	{ 721, 860, { "p1_right" } },
	{ 861, 876, { "p1_up" } },
}
for f = 561, 680, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

return {
	frames = 900,
	inputs = inputs,
	save_states = { [900] = "anlauf_c" },
}
