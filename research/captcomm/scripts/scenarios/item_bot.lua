-- item_bot.lua – Konfiguration fuer grafik/bot.lua (nicht fuer runner.lua):
-- Durchlauf-Bot wie grafik/durchlauf.lua, dazu je Frame die Objekt-Slots
-- 20..59 (Gegenstaende, Behaelter, Effekte) und die Waffenfelder der Figur
-- im Bot-CSV. Start ueber bot.sh:
--   CC_NAME=item_bot1 GFA_CFG=scripts/scenarios/item_bot.lua scripts/grafik/bot.sh stage1
-- Umgebungsvariablen: GFA_FRAMES (Standard 4500), GFA_SAVE_CAM (Savestate je
-- N px Kamerafortschritt, Name <CC_NAME>_s<Stage>_cam<x>, Standard 64),
-- GFA_CLEAR (Standard 900), GFA_STOP (0 = ueber das Stage-Ende weiter),
-- GFA_SAVE_AT (Savestates in festen Frames, "frame:name,...").
-- EINGRIFFE (aus bot.lua): LP der Figur jeden Frame auf 72 aufgefuellt; nach
-- GFA_CLEAR Frames ohne Kamerafortschritt LP der Gegner im Bild auf 1. Beides
-- steht in <CC_NAME>_events.txt. Die Savestates dienen nur als Ausgangslage
-- fuer die item_*-Szenarien; gemessen wird erst dort.
-- Spalten je Slot n (20..59): s<n>_st (S+4), s<n>_typ (S+0x3A, unteres Wort
-- der Typkennung S+0x38), s<n>_art (S+0x3D, Art des Gegenstands: 0x08
-- Raketenwerfer, 0x10 Laser, 0x12 Hammer, 0x20 Brathaehnchen, ...), s<n>_mun
-- (S+0xB1, Munition), s<n>_x, s<n>_h, s<n>_z, s<n>_t (S+0x60, Liegezeit).
-- Gegner-Slots n (0..19): g<n>_st, g<n>_typ, g<n>_lp (S+0x40), g<n>_max (S+0x9A).
-- Figur: waffe (P+0x79 = FFAA09), munition (P+0xB1 = FFAA41), griffnah
-- (P+0x78 = FFAA08), punkte (FFAA76, BCD).
local watch = {
	{ name = "waffe", addr = 0xFFAA09, size = 1 },
	{ name = "munition", addr = 0xFFAA41, size = 1 },
	{ name = "griffnah", addr = 0xFFAA08, size = 1 },
	{ name = "punkte", addr = 0xFFAA76, size = 2 },
	{ name = "lp", addr = 0xFFA9D0, size = 2, signed = true },
}
for n = 0, 19 do
	local S = 0xFFBC90 + n * 0xC0
	watch[#watch + 1] = { name = "g" .. n .. "_st", addr = S + 4, size = 1 }
	watch[#watch + 1] = { name = "g" .. n .. "_typ", addr = S + 0x3A, size = 2 }
	watch[#watch + 1] = { name = "g" .. n .. "_lp", addr = S + 0x40, size = 2, signed = true }
	watch[#watch + 1] = { name = "g" .. n .. "_max", addr = S + 0x9A, size = 2 }
end
for n = 20, 59 do
	local S = 0xFFBC90 + n * 0xC0
	watch[#watch + 1] = { name = "s" .. n .. "_st", addr = S + 4, size = 1 }
	watch[#watch + 1] = { name = "s" .. n .. "_typ", addr = S + 0x3A, size = 2 }
	watch[#watch + 1] = { name = "s" .. n .. "_art", addr = S + 0x3D, size = 1 }
	watch[#watch + 1] = { name = "s" .. n .. "_mun", addr = S + 0xB1, size = 1 }
	watch[#watch + 1] = { name = "s" .. n .. "_x", addr = S + 0x0E, size = 2 }
	watch[#watch + 1] = { name = "s" .. n .. "_h", addr = S + 0x12, size = 2, signed = true }
	watch[#watch + 1] = { name = "s" .. n .. "_z", addr = S + 0x16, size = 2 }
	watch[#watch + 1] = { name = "s" .. n .. "_t", addr = S + 0x60, size = 2, signed = true }
end
local save_cam = tonumber(os.getenv("GFA_SAVE_CAM") or "64")
-- GFA_SAVE_AT="frame:name,frame:name": Savestates in festen Frames (z. B.
-- wenn ein Gegenstand liegt; der Bot ist deterministisch)
local save_states = {}
for f, nm in (os.getenv("GFA_SAVE_AT") or ""):gmatch("(%d+):([%w_]+)") do save_states[tonumber(f)] = nm end
return {
	frames = tonumber(os.getenv("GFA_FRAMES") or "4500"),
	bot = true,
	hp_refill = true,
	clear_after = tonumber(os.getenv("GFA_CLEAR") or "900"),
	kill_after = 0,
	stop_on_stage_change = os.getenv("GFA_STOP") ~= "0",
	stop_delay = 60,
	save_cam_every = save_cam > 0 and save_cam or nil,
	snap_every = 0,
	save_states = save_states,
	snap_name = os.getenv("CC_NAME") or "item_bot",
	watch = watch,
}
