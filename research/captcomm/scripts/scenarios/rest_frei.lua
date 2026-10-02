-- rest_frei.lua (Praefix rest): freie Eingaben oder Huelle um ein anderes
-- Szenario, kleiner Abzug, Watch-Spalten fuer Rang, Stage und Kamera.
-- Zweck: Tod bei genau 0 LP ohne Eingriff (Teil C), Neueinstieg nach dem Tod
-- der Figur (Teil D), Treffer in der Luft und gleichzeitiger Treffer (Teil F).
--
--   CC_BASIS   optional: Basisszenario im selben Ordner (z. B. hurt_c.lua); seine
--              Eingaben und Eingriffe bleiben, Laufzeit CC_FRAMES, Snapshots und
--              Vollabzug entfallen
--   CC_IN      Eingaben "taste:von[-bis];..." (Tasten l r u d a j, mehrere mit +),
--              ohne bis ein Frame; zusaetzlich zu denen der Basis
--   CC_FRAMES  Laufzeit (Standard 300 bzw. die der Basis)
--   CC_SAVE    "frame:name" legt einen Savestate an (Name mit Praefix rest_)
-- EINGRIFFE (nur wenn gesetzt, im Laufnamen gekennzeichnet):
--   CC_SETZE   "slot:dx:dz:von-bis,..." Gegner relativ zur Figur (x Nachkomma 0;
--              dz leer = Tiefe unveraendert)
--   CC_ELP     "slot:lp:frame,..." LP und Vorframe-LP eines Gegners in einem Frame
--   CC_PLP     "lp:von-bis" LP und Vorframe-LP der Figur
--   CC_RANG    "wert:von-bis" Rang FFF82A
--   CC_POKE    "hexadresse:wert:breite:von-bis,..." beliebige Adresse
-- Abzug FFA900-FFEA00 je Frame (CC_DUMP_AB: erst ab diesem Frame); Watch-CSV
-- mit Rang FFF82A, Zaehler FFF82C, Stage FFA8CE, Kamera FFA82E/FFA830.
-- Kalibriert (belege_rest.sh): ab ingame mit CC_BASIS=hurt.lua stirbt die Figur
-- ohne Eingriff in Frame 1508 (Landung nach dem Neueinstieg L = 1681) und 2608,
-- mit hurt_b.lua in 1855 und 3623, mit hurt_c.lua in 1741 (L = 1946) und 3063.
-- Ab kontakt ist der WOOKY-Schlag in Frame 28 und 90 aktiv, ab kontakt_b der
-- EDDY-Schlag in 44 und 121 (Figur passiv). Teil M3: ab tiefe_b mit der Figur
-- per EINGRIFF bei x 930 bzw. 960 und Tiefe 340 endet der Todesflug an der
-- Stage-1-Wand bei x um 1016 (in Tiefe 320 nicht); ab ingame mit hurt_b.lua
-- erscheint die Figur nach dem ersten Tod in Frame 1976 bei x 914, Tiefe 304.
local function num(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return tonumber(v) end
local TASTE = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }

local sc = { inputs = {}, pokes = {} }
local basis = os.getenv("CC_BASIS") or ""
if basis ~= "" then
	local here = (os.getenv("CC_SCENARIO") or ""):match("(.*/)") or "./"
	sc = dofile(here .. basis)
	sc.inputs = sc.inputs or {}
	sc.pokes = sc.pokes or {}
	sc.snaps = nil
end
local frames = num("CC_FRAMES", sc.frames or 300)
sc.frames = frames

for teil in (os.getenv("CC_IN") or ""):gmatch("[^;]+") do
	local t, a, b = teil:match("^%s*([%a%+]+):(%d+)%-?(%d*)%s*$")
	assert(t, "Eingabe nicht lesbar: " .. teil)
	local namen = {}
	for k in t:gmatch("[^+]+") do namen[#namen + 1] = TASTE[k] or k end
	sc.inputs[#sc.inputs + 1] = { tonumber(a), (b ~= "" and tonumber(b)) or tonumber(a), namen }
end

local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local function slotadr(n) return 0xFFBC90 + n * 0xC0 end
local function bereich(s)
	local a, b = s:match("^(%d+)%-?(%d*)$")
	return tonumber(a), (b ~= "" and tonumber(b)) or tonumber(a)
end
for teil in (os.getenv("CC_SETZE") or ""):gmatch("[^,]+") do
	local n, dx, dz, r = teil:match("^(%d+):(%-?%d+):(%-?%d*):([%d%-]+)$")
	assert(n, "CC_SETZE nicht lesbar: " .. teil)
	local S, von, bis = slotadr(tonumber(n)), bereich(r)
	dx = tonumber(dx)
	sc.pokes[#sc.pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end, 2 }
	sc.pokes[#sc.pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	if dz ~= "" then
		dz = tonumber(dz)
		sc.pokes[#sc.pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
		sc.pokes[#sc.pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
end
for teil in (os.getenv("CC_ELP") or ""):gmatch("[^,]+") do
	local n, lp, f = teil:match("^(%d+):(%-?%d+):(%d+)$")
	assert(n, "CC_ELP nicht lesbar: " .. teil)
	local S = slotadr(tonumber(n))
	sc.pokes[#sc.pokes + 1] = { tonumber(f), tonumber(f), S + 0x40, tonumber(lp) & 0xFFFF, 2 }
	sc.pokes[#sc.pokes + 1] = { tonumber(f), tonumber(f), S + 0x42, tonumber(lp) & 0xFFFF, 2 }
end
local plp = os.getenv("CC_PLP") or ""
if plp ~= "" then
	local lp, r = plp:match("^(%-?%d+):([%d%-]+)$")
	local von, bis = bereich(r)
	sc.pokes[#sc.pokes + 1] = { von, bis, 0xFFA9D0, tonumber(lp) & 0xFFFF, 2 }
	sc.pokes[#sc.pokes + 1] = { von, bis, 0xFFA9D2, tonumber(lp) & 0xFFFF, 2 }
end
local rang = os.getenv("CC_RANG") or ""
if rang ~= "" then
	local w, r = rang:match("^(%d+):([%d%-]+)$")
	local von, bis = bereich(r)
	sc.pokes[#sc.pokes + 1] = { von, bis, 0xFFF82A, tonumber(w) }
end
for teil in (os.getenv("CC_POKE") or ""):gmatch("[^,]+") do
	local adr, w, br, r = teil:match("^(%x+):(%-?%d+):(%d):([%d%-]+)$")
	assert(adr, "CC_POKE nicht lesbar: " .. teil)
	local von, bis = bereich(r)
	sc.pokes[#sc.pokes + 1] = { von, bis, tonumber(adr, 16), tonumber(w) & 0xFFFF, tonumber(br) }
end

local save = os.getenv("CC_SAVE") or ""
if save ~= "" then
	local f, n = save:match("^(%d+):(rest_[%w_]+)$")
	assert(f, "CC_SAVE: frame:rest_name")
	sc.save_states = { [tonumber(f)] = n }
end

sc.dump = { start = 0xFFA900, stop = 0xFFEA00, from = num("CC_DUMP_AB", 1), to = frames, every = 1 }
sc.watch = {
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "rangzaehler", addr = 0xFFF82C, size = 2 },
	{ name = "stage", addr = 0xFFA8CE, size = 1 },
	{ name = "kamera_x", addr = 0xFFA82E, size = 2 },
	{ name = "kamera_y", addr = 0xFFA830, size = 2 },
}
return sc
