-- Gegenpruefung "Gegenstaende und Waffen" (Praefix item_v): Konfiguration
-- fuer den Durchlauf-Bot scripts/grafik/bot.lua (Start ueber grafik/bot.sh).
-- Zweck: eigener Katalog der Gegenstaende je Stage und eigene Savestates als
-- Ausgangslage der Gegenlaeufe (andere Startpunkte als beim Messagenten:
-- Stage 1 ab "ingame" statt "stage1", andere Kamera-Schritte, andere
-- Eingriffsgrenzen).
--
--   CC_NAME=item_v_b1 GFA_CFG=scripts/scenarios/item_v_bot.lua \
--     IV_FRAMES=9000 IV_SAVE_CAM=96 scripts/grafik/bot.sh ingame
--
-- Variablen:
--   IV_FRAMES   Obergrenze Frames (Standard 9000)
--   IV_SAVE_CAM Savestate je N px Kamerafortschritt (Name <CC_NAME>_s<Stage>_cam<x>),
--               0 = aus (Standard 0)
--   IV_SAVES    feste Savestates "frame:name,frame:name" (nur Praefix item_v)
--   IV_CLEAR    EINGRIFF des Bots: LP der Gegner im Bild auf 1 nach N Frames
--               ohne Kamerafortschritt (Standard 600, 0 = nie)
--   IV_STOP     1 = Ende 60 Frames nach Steuerbarkeit in der naechsten Stage
--               (Standard 1)
-- EINGRIFFE: LP-Auffuellung der Figur (P+0x40 := 72, wenn 0 < LP < 72) ist
-- immer an, dazu IV_CLEAR; beide stehen in <CC_NAME>_events.txt.
-- Protokoll (zusaetzliche Spalten in <CC_NAME>_bot.csv):
--   p78, p79, p7a, pb1   Spielerbytes P+0x78, P+0x79, P+0x7A (Wort), P+0xB1
--   plp, pkt             LP (nach Auffuellung des Vorframes), Punkte FFAA74 (BCD, 4 Byte)
--   g<n>_typ/art/st/x/z/h/lz/mun  je Slot 20..59: S+0x38 (4), S+0x3D, S+0x04 (2),
--                        x, Tiefe, Hoehe, S+0x60 (2), S+0xB1
--   e<n>_typ/lp          je Slot 0..19: S+0x38 (4), S+0x40
local P = 0xFFA990
local watch = {
	{ name = "p78", addr = P + 0x78, size = 1 },
	{ name = "p79", addr = P + 0x79, size = 1 },
	{ name = "p7a", addr = P + 0x7A, size = 2 },
	{ name = "pb1", addr = P + 0xB1, size = 1 },
	{ name = "plp", addr = P + 0x40, size = 2, signed = true },
	{ name = "pkt", addr = 0xFFAA74, size = 4 },
}
for n = 20, 59 do
	local S = 0xFFBC90 + n * 0xC0
	local g = "g" .. n .. "_"
	watch[#watch + 1] = { name = g .. "typ", addr = S + 0x38, size = 4 }
	watch[#watch + 1] = { name = g .. "art", addr = S + 0x3D, size = 1 }
	watch[#watch + 1] = { name = g .. "st", addr = S + 0x04, size = 2 }
	watch[#watch + 1] = { name = g .. "x", addr = S + 0x0E, size = 2 }
	watch[#watch + 1] = { name = g .. "z", addr = S + 0x16, size = 2 }
	watch[#watch + 1] = { name = g .. "h", addr = S + 0x12, size = 2, signed = true }
	watch[#watch + 1] = { name = g .. "lz", addr = S + 0x60, size = 2 }
	watch[#watch + 1] = { name = g .. "mun", addr = S + 0xB1, size = 1 }
end
for n = 0, 19 do
	local S = 0xFFBC90 + n * 0xC0
	watch[#watch + 1] = { name = "e" .. n .. "_typ", addr = S + 0x38, size = 4 }
	watch[#watch + 1] = { name = "e" .. n .. "_lp", addr = S + 0x40, size = 2, signed = true }
end

local saves = {}
for f, nm in (os.getenv("IV_SAVES") or ""):gmatch("(%d+):([%w_]+)") do saves[tonumber(f)] = nm end
local save_cam = tonumber(os.getenv("IV_SAVE_CAM") or "0")
return {
	frames = tonumber(os.getenv("IV_FRAMES") or "9000"),
	bot = true,
	hp_refill = true,
	clear_after = tonumber(os.getenv("IV_CLEAR") or "600"),
	kill_after = 0,
	stop_on_stage_change = os.getenv("IV_STOP") ~= "0",
	stop_delay = 60,
	save_cam_every = save_cam > 0 and save_cam or nil,
	save_states = saves,
	snap_every = 0,
	snap_name = os.getenv("CC_NAME"),
	watch = watch,
}
