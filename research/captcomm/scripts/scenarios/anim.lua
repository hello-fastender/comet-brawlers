-- Aufnahme von Animationen fuer Bildstreifen (scripts/grafik/streifen.py):
-- freie Eingaben, ein Snapshot je Frame in einem Fenster, dazu je Frame
-- Kamera, Figur und Gegner-Slots im Watch-CSV.
--   CC_IN     Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1)
--   CC_FRAMES Laufzeit (Standard 120)
--   CC_SNAP   Fenster "von-bis" fuer Snapshots in jedem Frame (Standard 2-CC_FRAMES)
--   CC_SLOTS  Gegner-Slots fuer das Watch-CSV, z. B. "16,17,18" (Standard 14-19)
--   CC_SAVE   "frame:name" legt dort einen Savestate an
-- Snapshots heissen <CC_NAME>_<frame>.png.
local frames = tonumber(os.getenv("CC_FRAMES") or "120")
local inputs = {}
for item in (os.getenv("CC_IN") or ""):gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for key in keys:gmatch("[^+]+") do ks[#ks + 1] = key end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end
local von, bis = (os.getenv("CC_SNAP") or ("2-" .. frames)):match("^(%d+)%-(%d+)$")
von, bis = tonumber(von), tonumber(bis)
local name = os.getenv("CC_NAME") or "anim"
local snaps = {}
for f = von, bis do snaps[f] = name end
local P = 0xFFA990
local watch = {
	{ name = "camx", addr = 0xFFA82E, size = 2 }, { name = "camy", addr = 0xFFA830, size = 2, signed = true },
	{ name = "p_x", addr = P + 0x0E, size = 2 }, { name = "p_z", addr = P + 0x16, size = 2 },
	{ name = "p_h", addr = P + 0x12, size = 2, signed = true }, { name = "p_anim", addr = P + 0x1C, size = 4 },
	{ name = "p_st", addr = P + 0x04, size = 1 }, { name = "p_act", addr = P + 0x0A, size = 2 },
}
local slots = os.getenv("CC_SLOTS") or "14,15,16,17,18,19"
for n in slots:gmatch("%d+") do
	local S = 0xFFBC90 + tonumber(n) * 0xC0
	local s = "s" .. n .. "_"
	watch[#watch + 1] = { name = s .. "x", addr = S + 0x0E, size = 2 }
	watch[#watch + 1] = { name = s .. "z", addr = S + 0x16, size = 2 }
	watch[#watch + 1] = { name = s .. "h", addr = S + 0x12, size = 2, signed = true }
	watch[#watch + 1] = { name = s .. "anim", addr = S + 0x1C, size = 4 }
	watch[#watch + 1] = { name = s .. "st", addr = S + 0x04, size = 1 }
	watch[#watch + 1] = { name = s .. "typ", addr = S + 0x38, size = 4 }
end
local save_states = {}
local sf, sn = (os.getenv("CC_SAVE") or ""):match("^(%d+):(.+)$")
if sf then save_states[tonumber(sf)] = sn end
return { frames = frames, inputs = inputs, snaps = snaps, watch = watch, save_states = save_states }
