-- fern_v_bot.lua – Konfiguration fuer grafik/bot.lua (Gegenpruefung V7,
-- Praefix fern_v). Start ueber grafik/bot.sh, nicht ueber runner.lua:
--
--   CC_NAME=fern_v_bot1 GFA_CFG=scripts/scenarios/fern_v_bot.lua FV_FRAMES=720 \
--     FV_SAVES=700:fern_v_skip8 scripts/grafik/bot.sh stage1
--
-- Kalibriert: Der SKIP erscheint in Frame 637 in Slot 18 (Kamera 770);
-- fern_v_skip8 (Frame 700, Rang 8): Figur x 1027, SKIP x 1074 (getroffen),
-- zwei WOOKY (24 LP) in Slot 16/17 liegen bei x 1152.
--
-- Der Durchlauf-Bot spielt Stage 1 (Ziel: naechster Gegner, Schlag im
-- 4-Frame-Takt, sonst nach rechts). Variablen:
--   FV_FRAMES  Obergrenze (Standard 7000)
--   FV_SAVES   Savestates "frame:name,..." (nur Praefix fern_v)
--   FV_CAM     Savestate je N px Kamerafortschritt (Standard 0 = keine; Name
--              <CC_NAME>_s<Stage>_cam<x>)
-- Watch-Spalten: Rang, je Slot 10..19 unteres Wort der Typkennung (S+0x3A),
-- Zustand S+4, LP S+0x40.
-- EINGRIFFE (wie grafik/durchlauf.lua): LP der Figur immer aufgefuellt, nach
-- 900 Frames ohne Kamerafortschritt LP der Gegner im Bild := 1 (stehen in
-- <CC_NAME>_events.txt).
local saves = {}
for item in (os.getenv("FV_SAVES") or ""):gmatch("[^,]+") do
	local f, n = item:match("^(%d+):(.+)$")
	assert(n and n:match("^fern_v"), "FV_SAVES: nur eigener Praefix")
	saves[tonumber(f)] = n
end
local watch = { { name = "rang", addr = 0xFFF82A, size = 1 } }
for n = 10, 19 do
	local S = 0xFFBC90 + n * 0xC0
	watch[#watch + 1] = { name = "t" .. n, addr = S + 0x3A, size = 2 }
	watch[#watch + 1] = { name = "s" .. n, addr = S + 4, size = 1 }
	watch[#watch + 1] = { name = "lp" .. n, addr = S + 0x40, size = 2, signed = true }
end
return {
	frames = tonumber(os.getenv("FV_FRAMES") or "7000"),
	bot = true,
	hp_refill = true,
	clear_after = 900,
	stop_on_stage_change = true,
	stop_delay = 60,
	save_cam_every = (tonumber(os.getenv("FV_CAM") or "0") or 0) > 0 and tonumber(os.getenv("FV_CAM")) or nil,
	snap_every = 0,
	save_states = saves,
	watch = watch,
}
