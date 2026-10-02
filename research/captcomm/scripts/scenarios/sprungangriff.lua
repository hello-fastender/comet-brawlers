-- Sprungangriff ab Savestate "kontakt" (Gegner 16 LP, Slot 18) oder
-- "kontakt_b" (Gegner 30 LP, Slot 17; CC_SLOT=17) bzw. "anlauf*".
--   CC_J    Frame des Sprungdrucks (Standard 2)
--   CC_A    Frame des Angriffsdrucks (Standard 10)
--   CC_DIR  Richtung im Frame des Sprungdrucks: p1_right / p1_left (optional)
--   CC_ADIR Richtung zusammen mit dem Angriffsdruck, z. B. p1_down (optional)
-- Optional EINGRIFF (RAM-Schreibzugriffe, wie kette.lua): von Frame
-- CC_VON (Standard 2) bis CC_BIS (Standard 70) wird der Gegner vor jedem
-- Frame relativ zur Figur gesetzt:
--   CC_DX  x-Abstand (Gegner - Figur), CC_DZ Tiefenabstand
--   CC_FERN_BIS  bis zu diesem Frame steht der Gegner 200 px entfernt,
--                danach bei CC_DX (aktive Frames)
--   CC_NAH_BIS   ab dem Frame danach wieder 200 px entfernt (mit CC_FERN_BIS
--                = T-1 und CC_NAH_BIS = T: Gegner nur in Frame T in Reichweite)
-- Der Gegner ist dabei nicht in einer Trefferreaktion und bewegt sich im
-- Frame selbst weiter; ausgewertet werden die Positionen am Frame-Ende.
local j = tonumber(os.getenv("CC_J") or "2")
local a = tonumber(os.getenv("CC_A") or "10")
local dir = os.getenv("CC_DIR") or ""
local dx = tonumber(os.getenv("CC_DX") or "")
local dz = tonumber(os.getenv("CC_DZ") or "")
local fern_bis = tonumber(os.getenv("CC_FERN_BIS") or "0")
local nah_bis = tonumber(os.getenv("CC_NAH_BIS") or "")
local adir = os.getenv("CC_ADIR") or ""
local slot = tonumber(os.getenv("CC_SLOT") or "18")
local von = tonumber(os.getenv("CC_VON") or "2")
local bis = tonumber(os.getenv("CC_BIS") or "70")

local inputs = { { j, j + 1, { "p1_jump" } }, { a, a + 1, { "p1_attack" } } }
if dir ~= "" then inputs[#inputs + 1] = { j, j, { dir } } end
if adir ~= "" then inputs[#inputs + 1] = { a, a + 1, { adir } } end

local S = 0xFFBC90 + slot * 0xC0
local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local pokes = {}
if dx then
	local function weg(sp) return (sp:read_u16(P1X) + 200) & 0xFFFF end
	if fern_bis > 0 then
		local ende = nah_bis or bis
		pokes[#pokes + 1] = { von, fern_bis, S + 0x0E, weg, 2 }
		pokes[#pokes + 1] = { fern_bis + 1, ende, S + 0x0E, function(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end, 2 }
		if ende < bis then pokes[#pokes + 1] = { ende + 1, bis, S + 0x0E, weg, 2 } end
	else
		pokes[#pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end, 2 }
	end
	pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
end
if dz then
	pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
end

return {
	frames = 80,
	inputs = inputs,
	pokes = pokes,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 80, every = 1 },
}
