-- Konfiguration fuer scripts/grafik/bot.lua (Auftrag M2, Praefix "verhalten"):
-- Stage 1 ab Savestate stage1 mit dem Durchlauf-Bot, fuer Gruppen (C) und
-- Wellen (D). Start:
--   CC_NAME=verhalten_bot_kampf GFA_CFG=scripts/scenarios/verhalten_bot.lua \
--     scripts/grafik/bot.sh stage1
-- Variablen:
--   CC_FRAMES   Laufzeit (Standard 7000)
--   CC_ANGRIFF  1 (Standard): Bot greift den naechsten Gegner an; 0: Bot
--               ignoriert die Gegner und laeuft nur nach rechts (bot.lua
--               Option angriff = false), es stirbt kein Gegner
--   CC_CLEAR    EINGRIFF des Bots: nach so vielen Frames ohne
--               Kamerafortschritt LP der Gegner im Bild := 1 (Standard 900
--               wie durchlauf.lua; 1 = sofort, sobald die Kamera steht, d. h.
--               der erste Treffer besiegt; 0 = nie)
--   CC_KILL     EINGRIFF des Bots: nach so vielen Frames ohne
--               Kamerafortschritt Gegner im Bild per S+4 := 0 entfernen (ohne
--               Tod; hoechstens alle 120 Frames); Standard 0 = nie
-- Immer: EINGRIFF LP der Figur P+0x40 := 72, wenn 0 < LP < 72 (bot.lua
-- hp_refill). Alle Eingriffe des Bots stehen in <CC_NAME>_events.txt.
-- Watch-Spalten je Gegnerslot n = 0..19 (S = FFBC90 + n*0xC0):
--   s<n>_st S+4, s<n>_s5 S+5, s<n>_a S+0A, s<n>_c S+0C, s<n>_x S+0E, s<n>_h S+12,
--   s<n>_z S+16, s<n>_an S+1C, s<n>_at S+24, s<n>_typ S+38, s<n>_lp S+40,
--   s<n>_mx S+9A, s<n>_fa S+5E, s<n>_dm S+8B
-- dazu Spieler: p_09 P+9, p_ptr P+82, p_t69 FFAA69, p_t61 FFAA61,
-- Rang FFF82A. messen_verhalten.py liest diese Spalten wie einen RAM-Abzug.
local watch = {
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "p_ptr", addr = 0xFFAA12, size = 2 },
	{ name = "p_t69", addr = 0xFFAA69, size = 1 },
	{ name = "p_t61", addr = 0xFFAA61, size = 1 },
	{ name = "p_09", addr = 0xFFA999, size = 1 },
}
local felder = {
	{ "st", 0x04, 1 }, { "s5", 0x05, 1 }, { "a", 0x0A, 2 }, { "c", 0x0C, 2 }, { "x", 0x0E, 2 },
	{ "h", 0x12, 2, true }, { "z", 0x16, 2 }, { "an", 0x1C, 4 }, { "at", 0x24, 2 },
	{ "typ", 0x38, 4 }, { "lp", 0x40, 2, true }, { "mx", 0x9A, 2 }, { "fa", 0x5E, 1 },
	{ "dm", 0x8B, 1 },
}
for n = 0, 19 do
	local S = 0xFFBC90 + n * 0xC0
	for _, fd in ipairs(felder) do
		watch[#watch + 1] = { name = string.format("s%d_%s", n, fd[1]), addr = S + fd[2], size = fd[3], signed = fd[4] }
	end
end
return {
	frames = tonumber(os.getenv("CC_FRAMES") or "7000"),
	bot = true,
	angriff = os.getenv("CC_ANGRIFF") ~= "0",
	hp_refill = true,
	clear_after = tonumber(os.getenv("CC_CLEAR") or "900"),
	kill_after = tonumber(os.getenv("CC_KILL") or "0"),
	stop_on_stage_change = true,
	stop_delay = 60,
	snap_every = 0,
	watch = watch,
}
