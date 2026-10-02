-- fern_v_frei.lua – Gegenpruefung "Fernkampf und Messerwurf" (V7, Praefix fern_v).
--
-- Freier Lauf ab einem beliebigen Savestate (run.sh-Argument). Eingaben und
-- Eingriffe kommen aus Umgebungsvariablen; die Laeufe stehen in
-- scripts/belege_fern.sh (Block "Gegenpruefung V7"). Protokoll: Abzug
-- 0xFFA900-0xFFEA00 je Frame (Figur, Gegner- und Objektslots, Geschosse der
-- Figur), Rang, Rangzaehler, Kamera und Stage im Watch-CSV.
--
-- Variablen:
--   CC_IN      Eingaben "namen:von-bis,..." (namen mit + verbunden, Kurzformen
--              l r u d a j), z. B. "r:2-40,a:100-101"
--   CC_FRAMES  Laufzeit (Standard 2000)
--   CC_SAVE    Savestates "frame:name,..." (nur Namen mit Praefix fern_v)
--   CC_DUMP    "von-bis" Abzugsbereich in Frames (Standard ganzer Lauf),
--              CC_EVERY jeder n-te Frame (Standard 1)
--
-- EINGRIFFE (alle im Belegskript je Lauf genannt):
--   CC_LP      1 (Standard): LP der Figur vor jedem Frame auf 72 (ein Treffer
--              bleibt am Frame-Ende sichtbar: LP < 72). 0 = aus
--   CC_RANG    Rang FFF82A ab Frame 2 vor jedem Frame auf diesem Wert
--   CC_E       weitere Eingriffe, durch ";" getrennt, je "von-bis:art:..."
--     fig:SL:dx:dz:h   Figur relativ zu Slot SL setzen: x := x(SL) + dx,
--                      Tiefe := Tiefe(SL) + dz, Hoehe := h (Nachkomma 0).
--                      Leeres Feld = unveraendert. SL ist eine Slotnummer
--                      oder "g" (das juengste Geschoss: hoechste belegte
--                      Slotnummer 20..39, deren S+0x6C auf einen Gegnerslot
--                      0..19 zeigt, ohne die Waffe des DICK 0x9A988)
--     obj:SL:dx:dz:h   Slot SL relativ zur Figur setzen (x(SL) := x + dx usw.)
--     pos:x:z          Figur auf Welt-x und Tiefe setzen (leer = unveraendert)
--     spos:SL:x:z      Slot SL auf Welt-x und Tiefe setzen (leer = unveraendert)
--     entf:SL+SL..     Slots entfernen (S+4 := 0)
--     glp:SL:lp        LP (und Vorframe-LP) eines Slots setzen
--     hoch:h           Hoehe der Figur halten (P+0x12 := h)
--     frac0            Nachkommaworte von x und Tiefe der Figur := 0 (die
--                      Figur bleibt auf ihrem ganzzahligen Pixel)
-- Positionen ganzzahlig, Nachkomma 0. Ein Eingriff in Frame f wirkt vor dem
-- Spiel-Frame f (der Runner schreibt im Callback von f-1). Ein Geschoss
-- ausserhalb der begehbaren Tiefe prallt ab (deshalb in den Proben 40 px nach
-- vorn bzw. in der Arena nach hinten versetzt).
--
-- Kalibriert (2026-10-02, Frames je Savestate, angelegt von belege_fern.sh):
--   fern_v_m1a  SKIP (Slot 18, Rang 11) wirft in A 12, Messer G 20 bei x 853,
--               fliegt -x, Figur x 792 schaut zum SKIP, Treffer G+8 (vorn 29)
--   fern_v_m1   wie m1a, 18 Frames spaeter: Messer G 2
--   fern_v_m2   Messer G 2 bei x 1277 (-x, Rang 21), Figur x 1215 schaut weg
--   fern_v_m3a  SKIP links (Rang 12) wirft in A 12, Messer G 20 bei x 1104 (+x),
--               Figur x 1165 bis Frame 10 in Trefferreaktion; m3 = Messer G 2
--   fern_v_k1   Pistolen-DICK (Slot 18, Rang 12) Salve ab A 10, Kugeln G 16,
--               33, 50, 67 (-x, NNUN), Figur x 2110 schaut zum DICK
--   fern_v_k3   wie k1, Salve A 10 (NUNU), Figur schaut weg
--   fern_v_k2   DICK links (Rang 22), Salve A 10 (+x, NNUN), Figur x 2245
--   fern_v_r1a  Raketen-DICK (Slot 13, Rang 12) A 10, Rakete G 16 (-x),
--               Einschlag x 2353 in G+20; r1 = Rakete G 2; r2 = Rakete G 2 (+x,
--               Einschlag x 2269)
--   fern_v_skip8 (Bot) SKIP in Slot 18, zwei WOOKY in Slot 16/17
local function env(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return v end

local KURZ = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }
local inputs = {}
for item in env("CC_IN", ""):gmatch("[^,]+") do
	local names, von, bis = item:match("^([%a%+_%d]+):(%d+)%-(%d+)$")
	assert(names, "CC_IN: " .. item)
	local list = {}
	for n in names:gmatch("[^+]+") do list[#list + 1] = KURZ[n] or n end
	inputs[#inputs + 1] = { tonumber(von), tonumber(bis), list }
end

local frames = tonumber(env("CC_FRAMES", "2000"))
local saves = nil
for item in env("CC_SAVE", ""):gmatch("[^,]+") do
	local f, n = item:match("^(%d+):(.+)$")
	assert(n and n:match("^fern_v"), "CC_SAVE: nur eigener Praefix")
	saves = saves or {}
	saves[tonumber(f)] = n
end

local P = 0xFFA990
local function SA(n) return 0xFFBC90 + n * 0xC0 end
local pokes = {}
if env("CC_LP", "1") == "1" then
	pokes[#pokes + 1] = { 2, frames, P + 0x40, 72, 2 }
end
local rang = tonumber(env("CC_RANG", ""))
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

-- juengstes Geschoss: hoechste belegte Slotnummer 20..39, deren Zeigerwort
-- S+0x6C auf S+4 eines Gegnerslots 0..19 zeigt (ohne die gehaltene Waffe
-- des DICK, Typ 0x9A988)
local function geschoss(sp)
	for n = 39, 20, -1 do
		local S = SA(n)
		local w = sp:read_u16(S + 0x6C)
		if sp:read_u8(S + 4) ~= 0 and w >= 0xBC94 and w <= 0xBC94 + 19 * 0xC0 and (w - 0xBC94) % 0xC0 == 0
				and sp:read_u32(S + 0x38) ~= 0x9A988 then return S end
	end
	return nil
end
local function slotadr(sp, sl)
	if sl == "g" then return geschoss(sp) end
	return SA(tonumber(sl))
end
local function w16(sp, a, v) sp:write_u16(a, v & 0xFFFF) end

local eingriffe = {}
for item in env("CC_E", ""):gmatch("[^;]+") do
	local von, bis, rest = item:match("^(%d+)%-(%d+):(.+)$")
	assert(von, "CC_E: " .. item)
	local f = {}
	for x in (rest .. ":"):gmatch("([^:]*):") do f[#f + 1] = x end
	eingriffe[#eingriffe + 1] = { von = tonumber(von), bis = tonumber(bis), art = f[1], a = f }
end

local function anwenden(sp, e)
	local a = e.a
	if e.art == "fig" or e.art == "obj" then
		local S = slotadr(sp, a[2])
		if not S then return end
		local dx, dz, h = tonumber(a[3] or ""), tonumber(a[4] or ""), tonumber(a[5] or "")
		local von, nach = S, P
		if e.art == "obj" then von, nach = P, S end
		if dx then w16(sp, nach + 0x0E, sp:read_u16(von + 0x0E) + dx); w16(sp, nach + 0x10, 0) end
		if dz then w16(sp, nach + 0x16, sp:read_u16(von + 0x16) + dz); w16(sp, nach + 0x18, 0) end
		if h then w16(sp, nach + 0x12, h); w16(sp, nach + 0x14, 0) end
	elseif e.art == "pos" then
		local x, z = tonumber(a[2] or ""), tonumber(a[3] or "")
		if x then w16(sp, P + 0x0E, x); w16(sp, P + 0x10, 0) end
		if z then w16(sp, P + 0x16, z); w16(sp, P + 0x18, 0) end
	elseif e.art == "spos" then
		local S = SA(tonumber(a[2]))
		local x, z = tonumber(a[3] or ""), tonumber(a[4] or "")
		if x then w16(sp, S + 0x0E, x); w16(sp, S + 0x10, 0) end
		if z then w16(sp, S + 0x16, z); w16(sp, S + 0x18, 0) end
	elseif e.art == "entf" then
		for n in a[2]:gmatch("%d+") do sp:write_u8(SA(tonumber(n)) + 4, 0) end
	elseif e.art == "glp" then
		local S = SA(tonumber(a[2]))
		w16(sp, S + 0x40, tonumber(a[3])); w16(sp, S + 0x42, tonumber(a[3]))
	elseif e.art == "frac0" then
		w16(sp, P + 0x10, 0); w16(sp, P + 0x18, 0)
	elseif e.art == "hoch" then
		w16(sp, P + 0x12, tonumber(a[2])); w16(sp, P + 0x14, 0)
	else
		error("CC_E: unbekannte Art " .. tostring(e.art))
	end
end

if #eingriffe > 0 then
	-- Ein Poke-Eintrag fuehrt alle Eingriffe des Frames aus; er schreibt am
	-- Ende das Rangbyte mit seinem eigenen Wert zurueck (keine Aenderung).
	local naechster = 0
	pokes[#pokes + 1] = { 2, frames, 0xFFF82A, function(sp)
		naechster = naechster + 1
		local f = naechster + 1 -- Frame, vor dem geschrieben wird
		for _, e in ipairs(eingriffe) do
			if f >= e.von and f <= e.bis then anwenden(sp, e) end
		end
		return sp:read_u8(0xFFF82A)
	end }
end

local dv, db = env("CC_DUMP", ""):match("^(%d+)%-(%d+)$")
return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = saves,
	watch = {
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
		{ name = "kamx", addr = 0xFFA82E, size = 2 },
		{ name = "kamy", addr = 0xFFA830, size = 2 },
		{ name = "stage", addr = 0xFFA8CE, size = 1 },
	},
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = tonumber(dv or "1"), to = tonumber(db or tostring(frames)), every = tonumber(env("CC_EVERY", "1")) },
}
