-- Ab Savestate "ingame": Sprungdetails, ohne Gegner in der Naehe.
-- Erst 50 Frames nach rechts (Platz fuer Rueckwaertsspruenge), dann:
--   101  Rueckwaertssprung (links 101-104)
--   181  Sprung im Stand, in der Luft rechts gedrueckt (Luftsteuerung?)
--   261  Vorwaertssprung aus dem Laufen (rechts 255-263), in der Luft links
--   341  Rueckwaertssprung (links 338-343)
--   421  Sprung mit gehaltenem "hoch" (Tiefe in der Luft?)
--   501  Sprungtaste 40 Frames gehalten (Hoehe abhaengig von Tastendauer?)
--   581  Sprung mit rechts+runter beim Absprung
-- Kurze Rechtsstrecken halten die Figur unter der Scroll-Grenze, ab der
-- der erste Gegner erscheint (~123 Frames Rechtslauf ab ingame).
local snaps = {}
for f = 100, 660, 20 do snaps[f] = "sprung_c" end

return {
	frames = 660,
	inputs = {
		{ 31, 80, { "p1_right" } },
		{ 101, 104, { "p1_left" } }, { 101, 102, { "p1_jump" } },
		{ 181, 182, { "p1_jump" } }, { 195, 210, { "p1_right" } },
		{ 255, 263, { "p1_right" } }, { 261, 262, { "p1_jump" } }, { 275, 290, { "p1_left" } },
		{ 338, 343, { "p1_left" } }, { 341, 342, { "p1_jump" } },
		{ 421, 470, { "p1_up" } }, { 421, 422, { "p1_jump" } },
		{ 501, 540, { "p1_jump" } },
		{ 581, 590, { "p1_right", "p1_down" } }, { 581, 582, { "p1_jump" } },
	},
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 660, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
