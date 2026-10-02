-- Spezialangriff und Sprint: freie Eingaben, optional EINGRIFF auf Gegner-
-- positionen und eigene LP. Ab beliebigem Savestate (kontakt, kontakt_b,
-- ingame, spezial_h<k>, spezial_drei, ...). sprint_probe.lua ist dasselbe
-- Szenario unter dem Praefix des Sprints.
--   CC_IN      Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1),
--              z. B. "3:p1_jump+p1_attack" oder "2-3:p1_right;6-60:p1_right"
--   CC_FRAMES  Laenge des Laufs (Standard 120)
--   CC_KLEIN=1 Abzug nur 0xFFA900-0xFFEA00 (Spieler und Objekttabelle);
--              Rang FFF82A und Zaehler FFF82C stehen dann im Watch-CSV
--   CC_SAVE    "frame:name" legt dort einen Savestate an
-- EINGRIFF (RAM-Schreibzugriffe vor jedem Frame CC_VON..CC_BIS, Standard
-- 2..CC_FRAMES; ausgewertet werden die Positionen am Frame-Ende):
--   CC_SLOTS   Gegner-Slots, z. B. "18" oder "16,17,18"
--   CC_DX      x-Abstand je Slot (Gegner - Figur, ganzzahlig, Nachkomma 0),
--              z. B. "40" oder "40,-40,70"; eine Zahl gilt fuer alle Slots
--   CC_DZ      Tiefenabstand je Slot (wie CC_DX)
--   CC_DH      Hoehe je Slot (S+0x12, Nachkomma 0), z. B. Gegner in der Luft;
--              im Frame CC_BIS+1 wird die Hoehe wieder auf 0 gesetzt (ein
--              stehender Gegner faellt nicht von selbst)
--   CC_FERN_BIS bis zu diesem Frame stehen die Gegner 200 px rechts der
--              Figur, danach bei CC_DX
--   CC_NAH_BIS ab dem Frame danach wieder 200 px entfernt (mit
--              CC_FERN_BIS = T-1, CC_NAH_BIS = T: nur in Frame T in Reichweite)
--   CC_WEG     Slots, die 300 px rechts der Figur festgehalten werden (damit
--              sie nicht mitgetroffen werden), z. B. "16"
--   CC_LP      LP der Figur (P+0x40 und Vorframe P+0x42) in den Frames
--              CC_LP_VON..CC_LP_BIS (Standard 2..2) auf diesen Wert setzen
-- Ohne CC_SLOTS/CC_WEG/CC_LP kein Eingriff.
-- Kalibriert (2026-10-02, Captain Commando): Angriff und Sprung im selben
-- Frame P ergeben ab P+1 die Aktion 0x14. Savestate kontakt: der WOOKY
-- (Slot 18, 46 px vor der Figur, Tiefe +10) schlaegt ohne Eingabe in Frame
-- 28, 90 und 154 zu; kontakt_b: EDDY (Slot 17) in Frame 44, 121 und 194.
-- Mit CC_SAVE legt belege_spezial.sh die Savestates spezial_h<k> (Figur k,
-- WOOKY 46 px vor ihr wie in kontakt) und spezial_drei[_h<k>] (Slots 16, 17,
-- 18 aktiv) an.
local frames = tonumber(os.getenv("CC_FRAMES") or "120")
local inputs = {}
for item in (os.getenv("CC_IN") or ""):gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for key in keys:gmatch("[^+]+") do ks[#ks + 1] = key end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local function liste(name)
	local t = {}
	for v in (os.getenv(name) or ""):gmatch("[^,]+") do t[#t + 1] = tonumber(v) end
	return t
end
local slots, dxs, dzs, dhs = liste("CC_SLOTS"), liste("CC_DX"), liste("CC_DZ"), liste("CC_DH")
local von = tonumber(os.getenv("CC_VON") or "2")
local bis = tonumber(os.getenv("CC_BIS") or tostring(frames))
local fern_bis = tonumber(os.getenv("CC_FERN_BIS") or "0")
local nah_bis = tonumber(os.getenv("CC_NAH_BIS") or tostring(bis))

local P = 0xFFA990
local P1X, P1Z = P + 0x0E, P + 0x16
local pokes = {}
local function je(t, i) return t[i] or t[1] end
for i, n in ipairs(slots) do
	local S = 0xFFBC90 + n * 0xC0
	local dx, dz, dh = je(dxs, i), je(dzs, i), je(dhs, i)
	if dx then
		local function weg(sp) return (sp:read_u16(P1X) + 200) & 0xFFFF end
		local function nah(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end
		if fern_bis >= von then pokes[#pokes + 1] = { von, fern_bis, S + 0x0E, weg, 2 } end
		pokes[#pokes + 1] = { math.max(von, fern_bis + 1), nah_bis, S + 0x0E, nah, 2 }
		if nah_bis < bis then pokes[#pokes + 1] = { nah_bis + 1, bis, S + 0x0E, weg, 2 } end
		pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	end
	if dz then
		pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
	if dh then
		pokes[#pokes + 1] = { von, bis, S + 0x12, dh & 0xFFFF, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x14, 0, 2 }
		if bis < frames then pokes[#pokes + 1] = { bis + 1, bis + 1, S + 0x12, 0, 2 } end
	end
end
for n in (os.getenv("CC_WEG") or ""):gmatch("%d+") do
	local S = 0xFFBC90 + tonumber(n) * 0xC0
	pokes[#pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P1X) + 300) & 0xFFFF end, 2 }
end
local lp = tonumber(os.getenv("CC_LP") or "")
if lp then
	local a = tonumber(os.getenv("CC_LP_VON") or "2")
	local b = tonumber(os.getenv("CC_LP_BIS") or tostring(a))
	pokes[#pokes + 1] = { a, b, P + 0x40, lp & 0xFFFF, 2 }
	pokes[#pokes + 1] = { a, b, P + 0x42, lp & 0xFFFF, 2 }
end

local dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = frames, every = 1 }
local watch = {}
if os.getenv("CC_KLEIN") == "1" then
	dump.start, dump.stop = 0xFFA900, 0xFFEA00
	watch = { { name = "rang", addr = 0xFFF82A, size = 1 }, { name = "zaehler", addr = 0xFFF82C, size = 2 } }
end
local save_states = {}
local sf, sn = (os.getenv("CC_SAVE") or ""):match("^(%d+):(.+)$")
if sf then save_states[tonumber(sf)] = sn end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	dump = dump,
	watch = watch,
	save_states = save_states,
}
