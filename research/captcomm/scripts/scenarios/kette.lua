-- EINGRIFF fuer die Reichweite der Kettenstufen: Ab Savestate "kontakt"
-- (Gegner 16 LP in Slot 18) bzw. "kontakt_b" (Gegner 30 LP, Slot 17) laeuft
-- eine Kette bis zur Stufe CC_STUFE (1-4). Die Drucke kommen jeweils
-- CC_ABSTAND Frames (Standard 14, erlaubt 12-27) nach dem Treffer der
-- Vorstufe. Bei 14 liegen die aktiven Frames der Stufe nach dem Zittern des
-- getroffenen Gegners (h+9 bis h+14) und noch in seiner Trefferreaktion
-- (h bis h+22), er steht also still.
-- Ab dem Frame nach dem Treffer der Vorstufe (bei Stufe 1 ab Frame 2) wird
-- der Gegner vor jedem Frame relativ zur Figur gesetzt:
--   CC_DX  x-Abstand (Gegner - Figur, ganzzahlig, Nachkomma 0)
--   CC_DZ  Tiefenabstand (Gegner - Figur)
--   CC_FERN=n  die ersten n Frames nach dem Druck der Stufe steht der Gegner
--          200 px entfernt, danach bei CC_DX (aktive Frames je Stufe)
-- Ohne CC_DX/CC_DZ bleibt die jeweilige Achse unveraendert.
-- Weitere Variablen: CC_SLOT (Standard 18), CC_P1 (erster Druck, Standard 3).
local stufe = tonumber(os.getenv("CC_STUFE") or "2")
local dx = tonumber(os.getenv("CC_DX") or "")
local dz = tonumber(os.getenv("CC_DZ") or "")
local fern = tonumber(os.getenv("CC_FERN") or "0")
local slot = tonumber(os.getenv("CC_SLOT") or "18")
local p1 = tonumber(os.getenv("CC_P1") or "3")
local abstand = tonumber(os.getenv("CC_ABSTAND") or "14")

-- Startup je Stufe (gemessen): Treffer 2/3/4/3 Frames nach dem Druck
local startup = { 2, 3, 4, 3 }
local press, hit = {}, {}
press[1] = p1
hit[1] = p1 + startup[1]
for k = 2, stufe do
	press[k] = hit[k - 1] + abstand
	hit[k] = press[k] + startup[k]
end

local inputs = {}
for k = 1, stufe do inputs[#inputs + 1] = { press[k], press[k] + 1, { "p1_attack" } } end

local S = 0xFFBC90 + slot * 0xC0
local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local von = (stufe == 1) and 2 or (hit[stufe - 1] + 1)
local bis = press[stufe] + 12
local pokes = {}
if dx then
	local function x(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end
	if fern > 0 then
		local f_end = press[stufe] + fern
		pokes[#pokes + 1] = { von, f_end, S + 0x0E, function(sp) return (sp:read_u16(P1X) + 200) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { f_end + 1, bis, S + 0x0E, x, 2 }
	else
		pokes[#pokes + 1] = { von, bis, S + 0x0E, x, 2 }
	end
	pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
end
if dz then
	pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
end

return {
	frames = press[stufe] + 30,
	inputs = inputs,
	pokes = pokes,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = press[stufe] + 30, every = 1 },
}
