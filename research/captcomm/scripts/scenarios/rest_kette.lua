-- rest_kette.lua (Praefix rest): Kette bis Stufe CC_STUFE mit Folgeeingaben
-- relativ zum letzten Kettendruck D. Zweck: Nachlauf der Kettenstufen 2-4
-- (Teil A), Tod bei genau 0 LP (Teil C), Nachpruefungen Mindestabstand,
-- Blick links, Richtung beim Kettendruck (Teil F). Grundlage: kette.lua.
--
-- Ab Savestate "kontakt" (WOOKY 16 LP, Slot 18, steht 46 px vor der Figur)
-- bzw. "kontakt_b" (EDDY 30 LP, Slot 17; CC_SLOT=17). Kalibriert wie
-- kette.lua: Stufe 1 trifft in P+2, die Folgestufen in D+3/D+4/D+3; der
-- getroffene Gegner steht in der Kette still.
--
-- Variablen:
--   CC_STUFE        letzte Stufe der Kette (1-4, Standard 2)
--   CC_P1           Frame des ersten Drucks (Standard 3)
--   CC_ABSTAND      Druck n Frames nach dem Treffer der Vorstufe (Standard 14)
--   CC_ABSTAND_LETZT  dasselbe nur fuer den letzten Druck
--   CC_NACH         Folgeeingaben relativ zu D: "taste:von[-bis];..." mit taste
--                   l r u d a j (mehrere mit +, z. B. "a+j:20"); ohne bis ein Frame
--   CC_IN           Eingaben in absoluten Frames, gleiche Schreibweise
--   CC_DRUCKDIR     Richtung (l r u d) zusammen mit dem letzten Kettendruck,
--                   gedrueckt von D+CC_DIRVON bis D+CC_DIRBIS (Standard 0 bis 1)
--   CC_FRAMES       Laufzeit nach D (Standard 70)
-- EINGRIFFE (RAM-Schreibzugriffe, je Lauf im Namen gekennzeichnet):
--   CC_LEER=1       Gegner ab dem Frame nach dem Treffer der Vorstufe (Stufe 1:
--                   ab Frame 2) bis D+CC_LEER_BIS (Standard: Laufende) 200 px
--                   rechts der Figur: Leerschlag der letzten Stufe
--   CC_ZURUECK_DX   mit CC_LEER_BIS: danach Gegner bei diesem x-Abstand
--   CC_DX, CC_DZ, CC_FERN, CC_POKE_BIS  wie kette.lua: Gegner ab dem Frame
--                   nach dem Treffer der Vorstufe bis D+CC_POKE_BIS (Standard
--                   12) bei x-Abstand CC_DX (Nachkomma 0) bzw. Tiefe CC_DZ; mit
--                   CC_FERN=n bis D+n 200 px entfernt
--   CC_POKE_VON     Beginn dieser Eingriffe als absoluter Frame (statt Treffer+1)
--   CC_VOR_DX       Gegner von Frame 2 bis vor diesen Beginn bei diesem x-Abstand
--                   (fuer die Vorstufen, z. B. -46 bei Blick links)
--   CC_GBLICK       r oder l: Blickrichtung des Gegners (S+0x5E, Bit 0x20) in
--                   denselben Frames wie CC_DX gesetzt (dritte Messung F1)
--   CC_ELP          LP und Vorframe-LP des Gegners (S+0x40, S+0x42) in Frame
--                   CC_ELP_AB (Standard 2) auf diesen Wert
-- Ausgabe zusaetzlich <CC_NAME>_meta.txt: Druckframes, D, Stufe, Slot.
-- Kalibriert (belege_rest.sh, Teil A): mit CC_P1=3 und CC_ABSTAND=14 ist D = 3,
-- 19, 36, 54 fuer Stufe 1 bis 4 (Treffer 5, 22, 40, 57).
-- Abzug nur FFA900-FFEA00 (Figur, Gegner- und Objektslots).
local function num(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return tonumber(v) end
local stufe = num("CC_STUFE", 2)
local slot = num("CC_SLOT", 18)
local p1 = num("CC_P1", 3)
local abstand = num("CC_ABSTAND", 14)
local abstand_letzt = num("CC_ABSTAND_LETZT", abstand)
local laenge = num("CC_FRAMES", 70)

local startup = { 2, 3, 4, 3 }
local press, hit = {}, {}
press[1] = p1
hit[1] = p1 + startup[1]
for k = 2, stufe do
	press[k] = hit[k - 1] + ((k == stufe) and abstand_letzt or abstand)
	hit[k] = press[k] + startup[k]
end
local D = press[stufe]
local frames = D + laenge

local TASTE = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }
local inputs = {}
local function eingaben(text, basis)
	for teil in (text or ""):gmatch("[^;]+") do
		local t, a, b = teil:match("^%s*([%a%+]+):(%-?%d+)%-?(%-?%d*)%s*$")
		assert(t, "Eingabe nicht lesbar: " .. teil)
		a = tonumber(a) + basis
		b = (b ~= "" and tonumber(b) + basis) or a
		local namen = {}
		for k in t:gmatch("[^+]+") do namen[#namen + 1] = TASTE[k] or k end
		inputs[#inputs + 1] = { a, b, namen }
	end
end
for k = 1, stufe do inputs[#inputs + 1] = { press[k], press[k] + 1, { "p1_attack" } } end
local ddir = os.getenv("CC_DRUCKDIR") or ""
if ddir ~= "" then
	inputs[#inputs + 1] = { D + num("CC_DIRVON", 0), D + num("CC_DIRBIS", 1), { TASTE[ddir] or ddir } }
end
eingaben(os.getenv("CC_NACH"), D)
eingaben(os.getenv("CC_IN"), 0)

local S = 0xFFBC90 + slot * 0xC0
local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local function rel(d) return function(sp) return (sp:read_u16(P1X) + d) & 0xFFFF end end
local pokes = {}
local von = num("CC_POKE_VON", (stufe == 1) and 2 or (hit[stufe - 1] + 1))
if os.getenv("CC_LEER") == "1" then
	local lbis = num("CC_LEER_BIS", frames)
	pokes[#pokes + 1] = { von, D + lbis, S + 0x0E, rel(200), 2 }
	pokes[#pokes + 1] = { von, D + lbis, S + 0x10, 0, 2 }
	local zdx = num("CC_ZURUECK_DX", nil)
	if zdx and D + lbis < frames then
		pokes[#pokes + 1] = { D + lbis + 1, frames, S + 0x0E, rel(zdx), 2 }
		pokes[#pokes + 1] = { D + lbis + 1, frames, S + 0x10, 0, 2 }
	end
end
local dx, dz = num("CC_DX", nil), num("CC_DZ", nil)
local bis = D + num("CC_POKE_BIS", 12)
local fern = num("CC_FERN", 0)
if dx then
	if fern > 0 then
		pokes[#pokes + 1] = { von, D + fern, S + 0x0E, rel(200), 2 }
		pokes[#pokes + 1] = { D + fern + 1, bis, S + 0x0E, rel(dx), 2 }
	else
		pokes[#pokes + 1] = { von, bis, S + 0x0E, rel(dx), 2 }
	end
	pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
end
if dz then
	pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
end
local gblick = os.getenv("CC_GBLICK") or ""
if gblick == "r" or gblick == "l" then
	-- Blickrichtung des Gegners (S+0x5E, Bit 0x20 = rechts) in den Frames des Lage-Eingriffs
	pokes[#pokes + 1] = { von, bis, S + 0x5E, function(sp)
		local v = sp:read_u8(S + 0x5E)
		if gblick == "r" then return v | 0x20 end
		return v & 0xDF
	end }
end
local vdx = num("CC_VOR_DX", nil)
if vdx and von > 2 then
	pokes[#pokes + 1] = { 2, von - 1, S + 0x0E, rel(vdx), 2 }
	pokes[#pokes + 1] = { 2, von - 1, S + 0x10, 0, 2 }
	if dz then
		pokes[#pokes + 1] = { 2, von - 1, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { 2, von - 1, S + 0x18, 0, 2 }
	end
end
local elp = num("CC_ELP", nil)
if elp then
	local ab = num("CC_ELP_AB", 2)
	pokes[#pokes + 1] = { ab, ab, S + 0x40, elp & 0xFFFF, 2 }
	pokes[#pokes + 1] = { ab, ab, S + 0x42, elp & 0xFFFF, 2 }
end

local out = os.getenv("CC_OUT")
if out then
	local f = io.open(out .. "_meta.txt", "w")
	if f then
		local p = {}
		for k = 1, stufe do p[#p + 1] = tostring(press[k]) end
		f:write(string.format("stufe=%d\nslot=%d\nD=%d\ndruecke=%s\n", stufe, slot, D, table.concat(p, ",")))
		f:close()
	end
end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = 1, to = frames, every = 1 },
}
