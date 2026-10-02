-- Gegenpruefung "Gegenstaende und Waffen" (Praefix item_v): freie Eingaben
-- ab einem eigenen Savestate (aus scenarios/item_v_bot.lua bzw. aus Laeufen
-- dieses Szenarios mit CC_SAVE). RAM-Abzug nur 0xFFA900-0xFFEA00 (Spieler,
-- Geschossbloecke, Objekt-Slots 0-59); Rang, Zaehler, Kamera und Stage
-- ueber "watch".
-- Auswertung: scripts/messen_item_v.py.
--
-- Variablen:
--   CC_IN      Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1),
--              Tasten p1_left/right/up/down/attack/jump
--   CC_FRAMES  Laenge des Laufs (Standard 300)
--   CC_DUMP    0 = kein RAM-Abzug (Standard 1)
--   CC_SAVE    "frame:name" legt in diesem Frame einen Savestate an (nur
--              Namen mit Praefix item_v)
-- Optionale EINGRIFFE (RAM-Schreibzugriffe vor dem jeweiligen Frame):
--   CC_LP      "wert" oder "wert:von:bis": LP der Figur (P+0x40, P+0x42) in
--              Frame 2 (bzw. von..bis) auf wert
--   CC_ELP     "slot:wert": LP, Vorframe-LP und Max-LP eines Gegners (S+0x40,
--              S+0x42, S+0x9A) in Frame 2 auf wert (mehrere mit ",")
--   CC_SETZE   "slot:dx:dz:von:bis[:h]": Gegner (oder Objekt) relativ zur Figur
--              setzen, x-Nachkomma 0, Tiefe = Figur + dz; dz leer = Tiefe
--              bleibt; mehrere mit ","
--   CC_XY      "slot:x:z:von:bis": Objekt auf feste Weltkoordinaten setzen
--   CC_HALT    "slot:von:bis": haelt S+0x04 eines Gegners auf 0x02 (wartet,
--              greift nicht an); mehrere mit ","
--   CC_RANG    haelt den Rang FFF82A ab Frame 2 auf diesem Wert
local spec = os.getenv("CC_IN") or ""
local frames = tonumber(os.getenv("CC_FRAMES") or "300")

local inputs = {}
for item in spec:gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local P = 0xFFA990
local function slotbase(n) return 0xFFBC90 + n * 0xC0 end
local pokes = {}

local lp = os.getenv("CC_LP")
if lp then
	local w, von, bis = lp:match("^(%-?%d+):?(%d*):?(%d*)$")
	von, bis = tonumber(von) or 2, tonumber(bis) or 2
	pokes[#pokes + 1] = { von, bis, P + 0x40, tonumber(w) & 0xFFFF, 2 }
	pokes[#pokes + 1] = { von, bis, P + 0x42, tonumber(w) & 0xFFFF, 2 }
end
for s, w in (os.getenv("CC_ELP") or ""):gmatch("(%d+):(%d+)") do
	local S = slotbase(tonumber(s))
	for _, off in ipairs({ 0x40, 0x42, 0x9A }) do pokes[#pokes + 1] = { 2, 2, S + off, tonumber(w), 2 } end
end
for item in (os.getenv("CC_SETZE") or ""):gmatch("[^,]+") do
	local s, dx, dz, von, bis = item:match("^(%d+):(%-?%d+):(%-?%d*):(%d+):(%d+)")
	local S = slotbase(tonumber(s))
	dx, dz, von, bis = tonumber(dx), tonumber(dz), tonumber(von), tonumber(bis)
	pokes[#pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + dx) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	if dz then
		pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P + 0x16) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
end
for s, x, z, von, bis in (os.getenv("CC_XY") or ""):gmatch("(%d+):(%d+):(%d+):(%d+):(%d+)") do
	local S = slotbase(tonumber(s))
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), S + 0x0E, tonumber(x), 2 }
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), S + 0x10, 0, 2 }
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), S + 0x16, tonumber(z), 2 }
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), S + 0x18, 0, 2 }
end
for s, von, bis in (os.getenv("CC_HALT") or ""):gmatch("(%d+):(%d+):(%d+)") do
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), slotbase(tonumber(s)) + 0x04, 0x02 }
end
local rang = tonumber(os.getenv("CC_RANG") or "")
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

local save_states = {}
local sv = os.getenv("CC_SAVE")
if sv then
	local f, nm = sv:match("^(%d+):([%w_]+)$")
	save_states[tonumber(f)] = nm
end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = save_states,
	watch = {
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
		{ name = "camx", addr = 0xFFA82E, size = 2 },
		{ name = "camy", addr = 0xFFA830, size = 2 },
		{ name = "stage", addr = 0xFFA8CE, size = 1 },
	},
	dump = (os.getenv("CC_DUMP") ~= "0") and { start = 0xFFA900, stop = 0xFFEA00, from = 1, to = frames, every = 1 } or nil,
}
