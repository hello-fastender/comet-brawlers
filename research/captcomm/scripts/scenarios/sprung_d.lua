-- Ab Savestate "ingame": Gegenlauf zu sprung_c.lua mit anderen Zeiten und
-- zusaetzlichen Fragen:
--   91   links nur VOR und beim Sprungdruck (89-91), danach losgelassen
--   171  rechts nur NACH dem Sprungdruck (172-176)
--   251  Rueckwaertssprung (links 251-256) mit gehaltenem "hoch" (251-300)
--   331  Sprung im Stand, "hoch" erst nach dem Scheitel (352-362)
--   411  aus dem Laufen nach unten (runter 405-460) springen
--   491  Sprungtaste nur 1 Frame
local snaps = {}
for f = 80, 560, 20 do snaps[f] = "sprung_d" end

return {
	frames = 560,
	inputs = {
		{ 21, 75, { "p1_right" } },
		{ 89, 91, { "p1_left" } }, { 91, 92, { "p1_jump" } },
		{ 171, 172, { "p1_jump" } }, { 172, 176, { "p1_right" } },
		{ 251, 256, { "p1_left" } }, { 251, 300, { "p1_up" } }, { 251, 252, { "p1_jump" } },
		{ 331, 332, { "p1_jump" } }, { 352, 362, { "p1_up" } },
		{ 405, 460, { "p1_down" } }, { 411, 412, { "p1_jump" } },
		{ 491, 491, { "p1_jump" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 560, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
