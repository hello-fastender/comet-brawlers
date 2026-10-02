-- verhalten_v_bot.lua – Gegenprüfung (V2) zu „Verhalten von WOOKY und EDDY“:
-- Konfiguration für scripts/grafik/bot.lua (Start über grafik/bot.sh). Stage 1
-- mit dem Durchlauf-Bot, der die Gegner angreift, bis zum Stagewechsel.
--
--   cd research/captcomm
--   CC_NAME=verhalten_v_d_bot GFA_CFG=scripts/scenarios/verhalten_v_bot.lua \
--       scripts/grafik/bot.sh held0
--
-- Umgebungsvariablen:
--   VV_FRAMES  Obergrenze Frames (Standard 16000)
--   VV_CLEAR   Stillstand in Frames, nach dem die LP der Gegner im Bild auf 1
--              gesetzt werden (EINGRIFF des Bots). Standard 0 = nie
--   VV_ANGRIFF 0 = Bot greift nicht an (läuft nur nach rechts)
-- EINGRIFF immer: LP der Figur werden auf 72 aufgefüllt (bot.lua, hp_refill).
-- Das Watch-CSV (Spalten nach "ev" in <CC_NAME>_bot.csv) enthält je Slot
-- 0..19 Status, S+5, Typ, x, Tiefe, Höhe, LP, Max-LP, Modus S+0x0A,
-- Animationszeiger S+0x1C, Trefferattribut S+0x24 und Weckreiz S+0x0D, dazu Rang und die
-- LP der Figur im Vorframe. Ausgewertet mit messen_verhalten_v.py (Präfix
-- mit Endung _bot).
local watch = {
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "plp0", addr = 0xFFA9D2, size = 2, signed = true },
	{ name = "blick", addr = 0xFFA9EE, size = 1 },
}
for n = 0, 19 do
	local S = 0xFFBC90 + n * 0xC0
	local function w(f, off, size, signed)
		watch[#watch + 1] = { name = string.format("s%d_%s", n, f), addr = S + off, size = size, signed = signed }
	end
	w("st", 0x04, 1); w("s5", 0x05, 1); w("typ", 0x38, 4); w("x", 0x0E, 2); w("z", 0x16, 2)
	w("h", 0x12, 2, true); w("lp", 0x40, 2, true); w("maxlp", 0x9A, 2); w("mod", 0x0A, 2)
	w("anim", 0x1C, 4); w("att", 0x24, 2); w("reiz", 0x0D, 1)
end
local clear = tonumber(os.getenv("VV_CLEAR") or "0")
return {
	frames = tonumber(os.getenv("VV_FRAMES") or "16000"),
	bot = true,
	angriff = os.getenv("VV_ANGRIFF") ~= "0",
	hp_refill = true,
	clear_after = clear > 0 and clear or 0,
	kill_after = 0,
	stop_on_stage_change = true,
	stop_delay = 60,
	snap_every = 0,
	watch = watch,
}
