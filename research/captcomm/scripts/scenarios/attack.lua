-- Ab Savestate "ingame": einzelne Schlaege ins Leere mit grossem Abstand
-- (Startup/Recovery ohne Treffer), danach Annaeherung an den ersten Gegner
-- und schnelle Schlagfolge fuer die Kombokette.
--
-- Kalibriert am 2026-10-01 (MAME 0.264, Captain Commando, Snapshots):
-- Nach ~120 Frames Rechtslauf (421-540) erscheint rechts der erste Gegner
-- ("WOOKY"). Er laeuft auf einer ~16 px hoeheren Tiefenlinie; ohne
-- Ausgleich gehen alle Schlaege vorbei. 16 Frames "hoch" (541-556) reichen
-- fuer Treffer. Erste Treffer ~590, Abschlusstritt ~640-660, danach ist
-- der Gegner besiegt (Symbol im HUD durchgestrichen). Die restlichen
-- Schlaege bis 900 gehen ins Leere.
local inputs = {
	{ 61, 62, { "p1_attack" } },
	{ 181, 182, { "p1_attack" } },
	{ 301, 302, { "p1_attack" } },
	{ 421, 540, { "p1_right" } },
	{ 541, 556, { "p1_up" } },                       -- Tiefe an Gegner angleichen
}
for f = 561, 900, 8 do inputs[#inputs + 1] = { f, f + 1, { "p1_attack" } } end

local snaps = {}
for f = 60, 960, 30 do snaps[f] = "attack" end

return {
	frames = 960,
	inputs = inputs,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 960, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
