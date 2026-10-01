-- Ab Savestate "ingame": zweite, unabhaengige Ausgangslage fuer schlag.lua.
-- Wie combo_c.lua bis Frame 900 (erster Gegner besiegt, pinker Gegner mit
-- 30 LP laeuft von rechts heran), dann Savestate "kontakt_b". In combo_c
-- trifft ein Schlag mit Eingabe ab 901 den pinken Gegner bei 903.
-- Zusaetzlich Savestate "tiefe_b" bei Frame 886: Der pinke Gegner steht
-- ~61 px entfernt, 16 px weiter hinten (Tiefe), vor dem Hochlaufen.
local inputs = {
	{ 421, 540, { "p1_right" } },
	{ 541, 556, { "p1_up" } },
	{ 721, 885, { "p1_right" } },
	{ 886, 900, { "p1_up" } },
}
for f = 561, 680, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

return {
	frames = 900,
	inputs = inputs,
	save_states = { [886] = "tiefe_b", [900] = "kontakt_b" },
}
