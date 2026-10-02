-- rest_sprung.lua (Praefix rest): Sprungangriff mit Einzelframe-Proben, Teil B
-- (Varianten hoch und runter) und Teil F (Blick links). Grundlage:
-- sprungangriff.lua, dazu kleiner Abzug, Laufzeit und Vorlauf.
--
-- Ab Savestate "kontakt" (WOOKY 16 LP, Slot 18) oder "kontakt_b" (EDDY 30 LP,
-- Slot 17; CC_SLOT=17).
--   CC_J     Frame des Sprungdrucks (Standard 4)
--   CC_A     Frame des Angriffsdrucks (Standard 10)
--   CC_DIR   Richtung nur im Frame des Sprungdrucks (l r u d bzw. p1_*):
--            u = Variante hoch, l/r = Richtung
--   CC_ADIR  Richtung zusammen mit dem Angriffsdruck (A und A+1): d = Variante
--            runter
--   CC_IN    weitere Eingaben in absoluten Frames: "taste:von[-bis];..."
--            (Tasten l r u d a j), z. B. "l:2" dreht die Figur nach links
--   CC_FRAMES  Laufzeit (Standard 80)
-- EINGRIFF (RAM-Schreibzugriffe wie sprungangriff.lua): von Frame CC_VON
-- (Standard 2) bis CC_BIS (Standard Laufende) wird der Gegner vor jedem Frame
-- relativ zur Figur gesetzt (x Nachkomma 0):
--   CC_DX  x-Abstand (Gegner - Figur), CC_DZ Tiefenabstand
--   CC_FERN_BIS  bis zu diesem Frame steht der Gegner 200 px entfernt
--   CC_NAH_BIS   ab dem Frame danach wieder 200 px entfernt (mit
--                CC_FERN_BIS = T-1 und CC_NAH_BIS = T: nur in Frame T in Reichweite)
--   CC_WEG   weitere Slots (Komma), die ab Frame 2 300 px rechts der Figur stehen
--   CC_ELP   LP und Vorframe-LP des Gegners in Frame 2 (S+0x40, S+0x42)
-- Ausgewertet werden die ganzzahligen Positionen am Frame-Ende.
-- Kalibriert (belege_rest.sh, Teil B): Sprungangriff hoch aktiv A+7 bis A+10,
-- runter A+9 bis A+32 (Hoehe hoechstens 48 bzw. 41 px); ab kontakt schlaegt der
-- WOOKY ohne Eingriff in Frame 28 zu (bei J = 4 ist die Figur dann in der Luft),
-- ab kontakt_b wird der WOOKY aus Slot 16 in Frame 13 aktiv (daher CC_WEG=16).
-- Im Probeframe geht der Gegner weiter: vorn liegt er am Frame-Ende etwa 2 px
-- naeher als gesetzt.
local function num(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return tonumber(v) end
local TASTE = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }
local j = num("CC_J", 4)
local a = num("CC_A", 10)
local frames = num("CC_FRAMES", 80)
local dir = os.getenv("CC_DIR") or ""
local adir = os.getenv("CC_ADIR") or ""
local dx, dz = num("CC_DX", nil), num("CC_DZ", nil)
local fern_bis = num("CC_FERN_BIS", 0)
local nah_bis = num("CC_NAH_BIS", nil)
local slot = num("CC_SLOT", 18)
local von = num("CC_VON", 2)
local bis = num("CC_BIS", frames)

local inputs = { { j, j + 1, { "p1_jump" } }, { a, a + 1, { "p1_attack" } } }
if dir ~= "" then inputs[#inputs + 1] = { j, j, { TASTE[dir] or dir } } end
if adir ~= "" then inputs[#inputs + 1] = { a, a + 1, { TASTE[adir] or adir } } end
for teil in (os.getenv("CC_IN") or ""):gmatch("[^;]+") do
	local t, x, y = teil:match("^%s*([%a%+]+):(%d+)%-?(%d*)%s*$")
	assert(t, "Eingabe nicht lesbar: " .. teil)
	local namen = {}
	for k in t:gmatch("[^+]+") do namen[#namen + 1] = TASTE[k] or k end
	inputs[#inputs + 1] = { tonumber(x), (y ~= "" and tonumber(y)) or tonumber(x), namen }
end

local S = 0xFFBC90 + slot * 0xC0
local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local function rel(d) return function(sp) return (sp:read_u16(P1X) + d) & 0xFFFF end end
local pokes = {}
if dx then
	if fern_bis > 0 then
		local ende = nah_bis or bis
		pokes[#pokes + 1] = { von, fern_bis, S + 0x0E, rel(200), 2 }
		pokes[#pokes + 1] = { fern_bis + 1, ende, S + 0x0E, rel(dx), 2 }
		if ende < bis then pokes[#pokes + 1] = { ende + 1, bis, S + 0x0E, rel(200), 2 } end
	else
		pokes[#pokes + 1] = { von, bis, S + 0x0E, rel(dx), 2 }
	end
	pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
end
if dz then
	pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
end
for w in (os.getenv("CC_WEG") or ""):gmatch("%d+") do
	local W = 0xFFBC90 + tonumber(w) * 0xC0
	pokes[#pokes + 1] = { 2, frames, W + 0x0E, rel(300), 2 }
end
local elp = num("CC_ELP", nil)
if elp then
	pokes[#pokes + 1] = { 2, 2, S + 0x40, elp & 0xFFFF, 2 }
	pokes[#pokes + 1] = { 2, 2, S + 0x42, elp & 0xFFFF, 2 }
end

local out = os.getenv("CC_OUT")
if out then
	local f = io.open(out .. "_meta.txt", "w")
	if f then
		f:write(string.format("J=%d\nA=%d\nslot=%d\ndir=%s\nadir=%s\nfern_bis=%d\nnah_bis=%s\ndx=%s\ndz=%s\n",
			j, a, slot, dir ~= "" and dir or "-", adir ~= "" and adir or "-", fern_bis,
			tostring(nah_bis or "-"), tostring(dx or "-"), tostring(dz or "-")))
		f:close()
	end
end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = 1, to = frames, every = 1 },
}
