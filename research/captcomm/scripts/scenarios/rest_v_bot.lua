-- rest_v_bot.lua – Konfiguration fuer grafik/bot.lua (Start ueber grafik/bot.sh,
-- nicht ueber runner.lua), Gegenpruefung "Rest der Spielfigur" (V8, Praefix
-- rest_v): Der Durchlauf-Bot spielt eine Stage bis zum Stage-Wechsel und
-- endet 60 Frames nach der Steuerbarkeit in der naechsten Stage.
--   cd research/captcomm
--   CC_NAME=rest_v_e_s3 GFA_CFG=scripts/scenarios/rest_v_bot.lua scripts/grafik/bot.sh stage3
-- Variablen:
--   RV_FRAMES  Obergrenze Frames (Standard 20000)
--   RV_SAVE    "frame:name,..." Savestates (nur Praefix rest_v)
-- EINGRIFFE (von bot.lua, stehen in <CC_NAME>_events.txt): LP der Figur werden
-- jeden Frame auf 72 gesetzt (hp_refill), nach 900 Frames ohne Kamerafortschritt
-- werden die LP der Gegner im Bild auf 1 gesetzt (clear_after).
-- Zusaetzliche Spalten im Bot-Protokoll: Rang FFF82A, Rangzaehler FFF82C,
-- Leben FFAA7C.
local saves
for item in (os.getenv("RV_SAVE") or ""):gmatch("[^,]+") do
	local f, n = item:match("^(%d+):(.+)$")
	assert(n and n:match("^rest_v"), "RV_SAVE: nur eigener Praefix rest_v")
	saves = saves or {}
	saves[tonumber(f)] = n
end
return {
	frames = tonumber(os.getenv("RV_FRAMES") or "20000"),
	bot = true,
	hp_refill = true,
	clear_after = 900,
	stop_on_stage_change = true,
	stop_delay = 60,
	snap_every = 0,
	save_states = saves,
	watch = {
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "rz", addr = 0xFFF82C, size = 2 },
		{ name = "leben", addr = 0xFFAA7C, size = 1 },
	},
}
