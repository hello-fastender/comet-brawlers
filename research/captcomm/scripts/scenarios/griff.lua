-- Griff: ab Savestate "kontakt" (Gegner 16 LP, Slot 18), "kontakt_b"
-- (Gegner 30 LP, Slot 17; CC_SLOT=17) oder anderen Ausgangslagen.
--   CC_VERT=m   ab Frame 2 m Frames hoch (m > 0) bzw. runter (m < 0)
--   CC_DIR      Laufrichtung zum Gegner (Standard p1_right), ab CC_START
--               (Standard 2 + |m|) fuer CC_DAUER Frames (Standard 40)
--   CC_DIAG     zusaetzlich p1_up oder p1_down waehrend des Laufens
--               (diagonal: x 1,25 statt 1,75 px/Frame)
--   CC_ANGRIFFE Liste von Frames mit Angriffsdruck, z. B. "30,45,60"
--   CC_WURF     Frame, ab dem eine Richtung (CC_WURF_DIR, Standard
--               p1_left) zusammen mit dem Angriff gedrueckt wird
-- Optional EINGRIFF (RAM-Schreibzugriffe): bis Frame CC_POKE_BIS (Standard
-- 0 = aus) wird der Gegner vor jedem Frame bei CC_DX/CC_DZ relativ zur
-- Figur gesetzt; danach bewegt er sich frei. Ausgewertet werden die
-- ganzzahligen Positionen am Frame-Ende (messen_a5.py griff).
local m = tonumber(os.getenv("CC_VERT") or "0")
local dir = os.getenv("CC_DIR") or "p1_right"
local start = tonumber(os.getenv("CC_START") or tostring(2 + math.abs(m)))
local dauer = tonumber(os.getenv("CC_DAUER") or "40")
local diag = os.getenv("CC_DIAG") or ""
local angriffe = os.getenv("CC_ANGRIFFE") or ""
local wurf = tonumber(os.getenv("CC_WURF") or "")
local wurf_dir = os.getenv("CC_WURF_DIR") or "p1_left"
local dx = tonumber(os.getenv("CC_DX") or "")
local dz = tonumber(os.getenv("CC_DZ") or "")
local poke_bis = tonumber(os.getenv("CC_POKE_BIS") or "0")
local slot = tonumber(os.getenv("CC_SLOT") or "18")

local inputs = {}
if m > 0 then inputs[#inputs + 1] = { 2, 1 + m, { "p1_up" } } end
if m < 0 then inputs[#inputs + 1] = { 2, 1 - m, { "p1_down" } } end
if dauer > 0 then
	local held = { dir }
	if diag ~= "" then held[#held + 1] = diag end
	inputs[#inputs + 1] = { start, start + dauer - 1, held }
end
for f in angriffe:gmatch("%d+") do
	local n = tonumber(f)
	inputs[#inputs + 1] = { n, n + 1, { "p1_attack" } }
end
if wurf then inputs[#inputs + 1] = { wurf, wurf + 1, { wurf_dir, "p1_attack" } } end

local S = 0xFFBC90 + slot * 0xC0
local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local pokes = {}
if poke_bis > 0 and dx then
	pokes[#pokes + 1] = { 2, poke_bis, S + 0x0E, function(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { 2, poke_bis, S + 0x10, 0, 2 }
end
if poke_bis > 0 and dz then
	pokes[#pokes + 1] = { 2, poke_bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { 2, poke_bis, S + 0x18, 0, 2 }
end

return {
	frames = 120,
	inputs = inputs,
	pokes = pokes,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 120, every = 1 },
}
