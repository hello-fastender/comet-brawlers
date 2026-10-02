-- Gegenpruefung "Trefferreaktion der Gegner" (Praefix reaktion_v).
-- Zweck: Gegenlaeufe zu reaktion.lua aus anderen Ausgangslagen. Freie
-- Eingaben ab einem Savestate, Protokoll nur ueber das Szenario-Feld "watch"
-- (Figur, Kombostufe, Rang, Kamera und je Gegnerslot Zustand, Aktion,
-- Phase, x/Hoehe/Tiefe 16.16, Animation, Attribut, Typ, LP, Blick, Schaden;
-- kein RAM-Abzug). Auswertung: scripts/messen_reaktion_v.py.
--
-- Kalibriert (Laeufe ohne Eingabe bzw. Erkundung, lokale Frames):
--   anlauf    WOOKY 16 LP, Slot 18, laeuft aus 111 px heran, steht ab 40 bei
--             dx 46/dz 10, holt in 61 aus, trifft in 70. Rechts 44-48: Griff 48
--   anlauf_b  WOOKY 16 LP, Slot 18, wie anlauf (Weg von attack_b). Rechts
--             47-51: Griff 51. Sprung rechts in 2: landet hinter dem WOOKY (dx -12)
--   anlauf_c  EDDY 30 LP, Slot 17, laeuft aus 105 px heran, steht ab 38 bei
--             dx 47/dz 0, holt in 59 aus, trifft in 68. Rechts 41-46: Griff 46.
--             WOOKY Slot 16 wartet bei x 960; mit rechts 2-15 steht er ab etwa
--             135 bei dx 55/dz 1 hinter dem EDDY (zwei Gegner in Reichweite)
--   Standardschlag trifft in P+2, Kettenstufen 2/3/4 in D+3/D+4/D+3.
--
-- Variablen:
--   CC_IN      Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1),
--              z. B. "2-15:p1_right;187:p1_attack"
--   CC_FRAMES  Laenge des Laufs (Standard 200)
--   CC_SLOTS   protokollierte Gegnerslots (Standard "13,14,15,16,17,18,19")
--   CC_SAVE    "frame:name" legt in diesem Frame einen Savestate an
--              (nur Namen mit Praefix reaktion_v verwenden; in den
--              Beleglaeufen nicht benutzt)
-- Optionale EINGRIFFE (RAM-Schreibzugriffe vor dem jeweiligen Frame):
--   CC_LP      "slot:wert" setzt in Frame 2 LP, Vorframe-LP und Max-LP des
--              Slots (S+0x40, S+0x42, S+0x9A) auf wert, z. B. "18:35". Ohne
--              die Max-LP haelt das Spiel nach dem naechsten Treffer an
--              (beobachtet bei LP 35 > Max 16). Benutzt nur in b_tritt_w
--   CC_SETZE   "slot:dx:dz:von:bis" setzt den Gegner von Frame von bis bis
--              relativ zur Figur (x-Nachkomma 0); dz leer = Tiefe bleibt
--              (in den Beleglaeufen nicht benutzt)
--   CC_RANG    haelt den Rang FFF82A ab Frame 2 auf diesem Wert (nicht benutzt)
local spec = os.getenv("CC_IN") or ""
local frames = tonumber(os.getenv("CC_FRAMES") or "200")
local slots = os.getenv("CC_SLOTS") or "13,14,15,16,17,18,19"

local inputs = {}
for item in spec:gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local P = 0xFFA990
local watch = {
	{ name = "p_st", addr = P + 0x04, size = 1 },
	{ name = "p_act", addr = P + 0x0A, size = 2 },
	{ name = "p_ph", addr = P + 0x0C, size = 2 },
	{ name = "p_x", addr = P + 0x0E, size = 2 },
	{ name = "p_xf", addr = P + 0x10, size = 2 },
	{ name = "p_h", addr = P + 0x12, size = 2, signed = true },
	{ name = "p_z", addr = P + 0x16, size = 2 },
	{ name = "p_anim", addr = P + 0x1C, size = 4 },
	{ name = "p_lp", addr = P + 0x40, size = 2, signed = true },
	{ name = "p_face", addr = P + 0x5E, size = 1 },
	{ name = "p_halt", addr = P + 0x70, size = 2 },
	{ name = "p_angr", addr = P + 0x82, size = 2 },
	{ name = "kombo", addr = 0xFFAA2D, size = 1 },
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "cam", addr = 0xFFA82E, size = 2 },
}
local felder = {
	{ "st", 0x04, 1 }, { "s5", 0x05, 1 }, { "act", 0x0A, 2 }, { "ph", 0x0C, 2 },
	{ "x", 0x0E, 2 }, { "xf", 0x10, 2 }, { "h", 0x12, 2, true }, { "hf", 0x14, 2 },
	{ "z", 0x16, 2 }, { "zf", 0x18, 2 }, { "anim", 0x1C, 4 }, { "attr", 0x24, 2 },
	{ "typ", 0x38, 4 }, { "lp", 0x40, 2, true }, { "face", 0x5E, 1 }, { "dmg", 0x8B, 1 },
}
for n in slots:gmatch("%d+") do
	local S = 0xFFBC90 + tonumber(n) * 0xC0
	for _, f in ipairs(felder) do
		watch[#watch + 1] = { name = "s" .. n .. "_" .. f[1], addr = S + f[2], size = f[3], signed = f[4] }
	end
end

local pokes = {}
local P1X, P1Z = P + 0x0E, P + 0x16
local lp = os.getenv("CC_LP") or ""
if lp ~= "" then
	local s, w = lp:match("^(%d+):(%-?%d+)$")
	local S = 0xFFBC90 + tonumber(s) * 0xC0
	local v = tonumber(w) & 0xFFFF
	pokes[#pokes + 1] = { 2, 2, S + 0x40, v, 2 }
	pokes[#pokes + 1] = { 2, 2, S + 0x42, v, 2 }
	pokes[#pokes + 1] = { 2, 2, S + 0x9A, v, 2 }
end
local setze = os.getenv("CC_SETZE") or ""
if setze ~= "" then
	local s, dx, dz, von, bis = setze:match("^(%d+):(%-?%d+):(%-?%d*):(%d+):(%d+)$")
	local S = 0xFFBC90 + tonumber(s) * 0xC0
	dx, von, bis = tonumber(dx), tonumber(von), tonumber(bis)
	pokes[#pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	if dz ~= "" then
		dz = tonumber(dz)
		pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
end
local rang = tonumber(os.getenv("CC_RANG") or "")
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

local save_states
local sv = os.getenv("CC_SAVE") or ""
if sv ~= "" then
	local f, name = sv:match("^(%d+):(.+)$")
	save_states = { [tonumber(f)] = name }
end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	watch = watch,
	save_states = save_states,
}
