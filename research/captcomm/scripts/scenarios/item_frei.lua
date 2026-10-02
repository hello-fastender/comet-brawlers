-- item_frei.lua – freies Szenario fuer die Gegenstands-Messungen (Praefix item).
-- Alle Eingaben und Eingriffe kommen aus Umgebungsvariablen; die konkreten
-- Laeufe (mit Savestate, Eingaben und Kalibrierung) stehen in
-- scripts/belege_item.sh. Abzug FFA900..FFEA00 (Spielerblock, Geschosse der
-- Figur ab FFAD90, Objekt-Slots 0..59) in jedem Frame; Kamera, Rang und
-- Rang-Zaehler (ausserhalb des Abzugs) im Watch-CSV.
--
-- Variablen:
--   CC_FRAMES  Laufzeit in Frames (Standard 300)
--   CC_IN      Eingaben "von-bis:taste|taste;...", Tasten right, left, up, down,
--              attack, jump (oder p1_*). Gedrueckt in den Frames von..bis.
--   CC_POKES   EINGRIFF: "von-bis:ADR=wert[:breite];...". ADR ist eine
--              Hex-Adresse, "p+OFF" (Spielerblock FFA990 + OFF, hex) oder
--              "sN+OFF" (Objekt-Slot N, FFBC90 + N*0xC0 + OFF, hex). Breite 1
--              (Standard) oder 2. Der Wert wird vor jedem Frame von..bis
--              geschrieben.
--   CC_REL     EINGRIFF: "von-bis:N:dx:dz;..." setzt Slot N vor jedem Frame
--              von..bis relativ zur Figur: x = x(Figur) + dx, Tiefe =
--              Tiefe(Figur) + dz, Nachkomma 0 (wie scenarios/kette.lua).
--              "_" laesst eine Achse unveraendert.
--   CC_ZU      EINGRIFF: "von-bis:N[:dx:dz]" setzt die Figur vor jedem Frame
--              von..bis auf die Position von Slot N (plus dx, dz), Nachkomma 0
--              (Figur zum Gegenstand bringen, z. B. fuer Heilwerte)
--   CC_SAVE    "frame:name" legt in diesem Frame einen Savestate an
--   CC_SNAPS   Frames fuer Snapshots (Pruefung am Bild), Name CC_NAME
--   CC_DUMP    0 = kein Abzug (nur Watch-CSV)
--
-- Kalibrierte Ausgangslagen (Savestates aus item_bot.lua, siehe belege_item.sh):
--   item_bot1_s1_cam01281  Stage 1, Figur x 1481, Tiefe 300 neben dem
--     Polizeiwagen; Oelfaesser (Typ 0x9DA2A, LP 777) in Slot 43 (x 1520,
--     Tiefe 172) und Slot 44 (x 1480, Tiefe 184). Rechts 2-60, runter 61-185,
--     links 186 (Blick nach links) bringt die Figur auf x 1583, Tiefe 175;
--     ein Schlag ab 190 trifft Fass 43 in 192, der Raketenwerfer erscheint
--     in 193 in Slot 50 und landet in 241 bei x 1520, Tiefe 172. Der Mech
--     (Slot 59) erscheint in Frame 39 bei x 1780 und greift ab etwa 470 an.
--   item_bot1_s1_cam02048  Stage 1, Bossarena: DOLG (Slot 19) zerschlaegt in
--     Frame 18 die Geldkassetten; Raketenwerfer in Slot 44 (x 2352, Tiefe
--     232), Laser in Slot 53 (x 2320, Tiefe 208), Hammer in Slot 58 (x 2384,
--     Tiefe 200) laut logs/item.csv (item_a_liegen, nahsweep),
--     alle gelandet in 66. Zwei WOOKY (28 LP) in Slot 16 und 17 von links.
local function env(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return v end

local frames = tonumber(env("CC_FRAMES", "300"))
local KEYS = { right = "p1_right", left = "p1_left", up = "p1_up", down = "p1_down", attack = "p1_attack", jump = "p1_jump" }

local inputs = {}
for spec in env("CC_IN", ""):gmatch("[^;]+") do
	local a, b, names = spec:match("^%s*(%d+)%-(%d+):(.+)$")
	assert(a, "CC_IN: " .. spec)
	local t = {}
	for nm in names:gmatch("[^|]+") do t[#t + 1] = KEYS[nm] or nm end
	inputs[#inputs + 1] = { tonumber(a), tonumber(b), t }
end

local P = 0xFFA990
local function slot(n) return 0xFFBC90 + n * 0xC0 end
local function addr(s)
	local n, off = s:match("^s(%d+)%+(%x+)$")
	if n then return slot(tonumber(n)) + tonumber(off, 16) end
	off = s:match("^p%+(%x+)$")
	if off then return P + tonumber(off, 16) end
	return tonumber(s, 16)
end

local pokes = {}
for spec in env("CC_POKES", ""):gmatch("[^;]+") do
	local a, b, ad, v, w = spec:match("^%s*(%d+)%-(%d+):([^=]+)=(%-?%d+):?(%d?)$")
	assert(a, "CC_POKES: " .. spec)
	local width = tonumber(w ~= "" and w or "1")
	local val = tonumber(v)
	if val < 0 then val = val + (width == 2 and 0x10000 or 0x100) end
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), addr(ad), val, width }
end
for spec in env("CC_REL", ""):gmatch("[^;]+") do
	local a, b, n, dx, dz = spec:match("^%s*(%d+)%-(%d+):(%d+):([^:]+):([^:]+)$")
	assert(a, "CC_REL: " .. spec)
	a, b = tonumber(a), tonumber(b)
	local S = slot(tonumber(n))
	if dx ~= "_" then
		local d = tonumber(dx)
		pokes[#pokes + 1] = { a, b, S + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + d) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { a, b, S + 0x10, 0, 2 }
	end
	if dz ~= "_" then
		local d = tonumber(dz)
		pokes[#pokes + 1] = { a, b, S + 0x16, function(sp) return (sp:read_u16(P + 0x16) + d) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { a, b, S + 0x18, 0, 2 }
	end
end

for spec in env("CC_ZU", ""):gmatch("[^;]+") do
	local a, b, n, rest = spec:match("^%s*(%d+)%-(%d+):(%d+)(.*)$")
	assert(a, "CC_ZU: " .. spec)
	local dx, dz = rest:match("^:(%-?%d+):(%-?%d+)$")
	dx, dz = tonumber(dx or "0"), tonumber(dz or "0")
	a, b = tonumber(a), tonumber(b)
	local S = slot(tonumber(n))
	pokes[#pokes + 1] = { a, b, P + 0x0E, function(sp) return (sp:read_u16(S + 0x0E) + dx) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { a, b, P + 0x10, 0, 2 }
	pokes[#pokes + 1] = { a, b, P + 0x16, function(sp) return (sp:read_u16(S + 0x16) + dz) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { a, b, P + 0x18, 0, 2 }
end

local save_states = {}
do
	local f, nm = env("CC_SAVE", ""):match("^(%d+):(.+)$")
	if f then save_states[tonumber(f)] = nm end
end
local snaps = {}
for f in env("CC_SNAPS", ""):gmatch("%d+") do snaps[tonumber(f)] = env("CC_NAME", "item_frei") end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = save_states,
	snaps = snaps,
	dump = env("CC_DUMP", "1") ~= "0" and { start = 0xFFA900, stop = 0xFFEA00, from = 1, to = frames, every = 1 } or nil,
	watch = {
		{ name = "camx", addr = 0xFFA82E, size = 2 },
		{ name = "camy", addr = 0xFFA830, size = 2 },
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
	},
}
