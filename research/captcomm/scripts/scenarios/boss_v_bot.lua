-- boss_v_bot.lua – Gegenprüfer V6 (Präfix boss_v) zu „Boss DOLG“:
-- Konfiguration für scripts/grafik/bot.lua (Start über grafik/bot.sh, nicht
-- über runner.lua). Der Durchlauf-Bot spielt Stage 1 mit Captain Commando
-- bis in die Bossarena bzw. kämpft dort gegen den Boss.
--
--   cd research/captcomm
--   CC_NAME=boss_v_b1 GFA_CFG=scripts/scenarios/boss_v_bot.lua \
--       BV_SAVE_CAM=64 scripts/grafik/bot.sh ingame
--
-- Umgebungsvariablen:
--   BV_FRAMES    Obergrenze Frames (Standard 9000)
--   BV_SAVE_CAM  Savestate je N px Kamerafortschritt, Name
--                <CC_NAME>_s<Stage>_cam<x> (Standard aus)
--   BV_SAVE_AT   feste Savestates "frame:name,frame:name" (Namen mit boss_v_)
--   BV_CLEAR     Stillstand in Frames, nach dem die LP der Gegner im Bild auf
--                1 gesetzt werden (EINGRIFF des Bots, Standard 0 = nie)
-- EINGRIFFE (alle im Kopf der Ergebnistabellen genannt):
--   immer        LP der Figur werden auf 72 aufgefüllt (bot.lua, hp_refill)
--   BV_RANG      Rang FFF82A ab Frame 2 vor jedem Frame auf diesem Wert
--   BV_BLP_MIN   LP des Bosses (Slot 19, Typ 0x46DA4): fallen sie unter
--                diesen Wert, werden sie (und der Vorframe-Wert) auf BV_BLP
--                zurückgesetzt (Standard aus); so bleibt der Kampf lang
--   BV_WEG       Gegner außer dem Boss (Slots 0–18, S+4 ≠ 0) werden in jedem
--                Frame entfernt (S+4 := 0), Standard aus
-- Watch-Spalten nach "ev" in <CC_NAME>_bot.csv: Rang, Zähler, Figur
-- (LP-Vorframe, Griff, Angreiferzeiger, Kombostufe, Blick), Boss in Slot 19
-- (Zustand, Aktion, Phase, x, Höhe, Tiefe, LP, Animation, Attribut, Fläche
-- S+0x28, Schutzzähler S+0xAE, Max-LP S+0xB7, S+0x9A, Typ) und je Slot 0–18
-- Zustand, Typ (unteres Wort) und LP.
local function env(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return v end
local B = 0xFFBC90 + 19 * 0xC0
local watch = {
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "zaehl", addr = 0xFFF82C, size = 2 },
	{ name = "plp0", addr = 0xFFA9D2, size = 2, signed = true },
	{ name = "griff", addr = 0xFFA999, size = 1 },
	{ name = "pang", addr = 0xFFAA12, size = 2 },
	{ name = "kombo", addr = 0xFFAA2D, size = 1 },
	{ name = "pphase", addr = 0xFFA99C, size = 2 },
	{ name = "b_st", addr = B + 0x04, size = 2 },
	{ name = "b_akt", addr = B + 0x0A, size = 2 },
	{ name = "b_ph", addr = B + 0x0C, size = 2 },
	{ name = "b_x", addr = B + 0x0E, size = 2 },
	{ name = "b_xf", addr = B + 0x10, size = 2 },
	{ name = "b_h", addr = B + 0x12, size = 2, signed = true },
	{ name = "b_hf", addr = B + 0x14, size = 2 },
	{ name = "b_z", addr = B + 0x16, size = 2 },
	{ name = "b_anim", addr = B + 0x1C, size = 4 },
	{ name = "b_att", addr = B + 0x24, size = 2 },
	{ name = "b_fl", addr = B + 0x28, size = 2 },
	{ name = "b_typ", addr = B + 0x38, size = 4 },
	{ name = "b_lp", addr = B + 0x40, size = 2, signed = true },
	{ name = "b_blick", addr = B + 0x5E, size = 1 },
	{ name = "b_dmg", addr = B + 0x8B, size = 1 },
	{ name = "b_9a", addr = B + 0x9A, size = 2 },
	{ name = "b_ae", addr = B + 0xAE, size = 1 },
	{ name = "b_b7", addr = B + 0xB7, size = 1 },
}
for n = 0, 18 do
	local S = 0xFFBC90 + n * 0xC0
	watch[#watch + 1] = { name = string.format("s%d_st", n), addr = S + 0x04, size = 2 }
	watch[#watch + 1] = { name = string.format("s%d_typ", n), addr = S + 0x3A, size = 2 }
	watch[#watch + 1] = { name = string.format("s%d_lp", n), addr = S + 0x40, size = 2, signed = true }
end

local save_states = {}
for item in env("BV_SAVE_AT", ""):gmatch("[^,]+") do
	local f, nm = item:match("^(%d+):(.+)$")
	if f then save_states[tonumber(f)] = nm end
end

-- Eingriffe, die bot.lua nicht kennt: eigener Frame-Notifier (läuft vor dem
-- des Bots, schreibt für den nächsten Frame)
local rang = tonumber(env("BV_RANG", ""))
local blp_min = tonumber(env("BV_BLP_MIN", ""))
local blp = tonumber(env("BV_BLP", "110"))
local weg = env("BV_WEG", "0") == "1"
if rang or blp_min or weg then
	local space = manager.machine.devices[":maincpu"].spaces["program"]
	local function eingriff()
		if rang then space:write_u8(0xFFF82A, rang) end
		if blp_min and space:read_u32(B + 0x38) == 0x46DA4 and space:read_u8(B + 4) ~= 0 then
			local lp = space:read_u16(B + 0x40)
			if lp >= 0x8000 then lp = lp - 0x10000 end
			if lp < blp_min then
				space:write_u16(B + 0x40, blp)
				space:write_u16(B + 0x42, blp)
			end
		end
		if weg then
			for n = 0, 18 do
				local S = 0xFFBC90 + n * 0xC0
				if space:read_u8(S + 4) ~= 0 then space:write_u8(S + 4, 0) end
			end
		end
	end
	if emu.add_machine_frame_notifier then
		boss_v_eingriff_sub = emu.add_machine_frame_notifier(eingriff)
	else
		emu.register_frame_done(eingriff)
	end
end

local save_cam = tonumber(env("BV_SAVE_CAM", "0"))
local clear = tonumber(env("BV_CLEAR", "0"))
return {
	frames = tonumber(env("BV_FRAMES", "9000")),
	bot = true,
	hp_refill = true,
	clear_after = clear > 0 and clear or 0,
	kill_after = 0,
	stop_on_stage_change = true,
	stop_delay = 60,
	save_cam_every = save_cam > 0 and save_cam or nil,
	save_states = save_states,
	snap_every = 0,
	watch = watch,
}
