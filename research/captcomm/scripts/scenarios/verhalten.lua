-- Verhalten von WOOKY und EDDY (Auftrag M2, Praefix "verhalten").
-- Lange Laeufe ab einem Savestate (anlauf, anlauf_b, anlauf_c, kontakt,
-- kontakt_b, tiefe_b, ingame, stage1) mit eingeschraenktem RAM-Abzug
-- (0xFFA900-0xFFEA00: Spielerblock, Timer, alle 60 Objektslots) und den
-- Werten ausserhalb davon im Watch-CSV (Kamera FFA82E/FFA830, Stage FFA8CE,
-- Rang FFF82A, Zaehler FFF82C). Auswertung: scripts/messen_verhalten.py.
--
-- Variablen:
--   CC_FRAMES  Laufzeit (Standard 2000)
--   CC_IN      freie Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1),
--              z. B. "61-180:p1_right" (Gegner ausloesen ab ingame)
--   CC_MUSTER  vorgefertigte Eingabefolge ab Frame CC_AB (Standard 30):
--                passiv   keine Eingabe (Standard)
--                weg_l    links halten fuer CC_DAUER Frames (Standard 300)
--                weg_r    rechts halten fuer CC_DAUER Frames
--                tiefe    Tiefe in Schritten von 20 px: 20 Frames hoch,
--                         CC_PAUSE Frames (Standard 150) warten, 20 runter,
--                         warten, 20 runter, warten, 20 hoch, ... bis Laufende
--                sprung   alle CC_TAKT Frames (Standard 60) ein Sprung im Stand
--   CC_LP      1 (Standard): EINGRIFF, LP der Figur P+0x40 := 72, wenn
--              0 < LP < 72 (wie bot.lua), vor jedem Frame. 0 = aus
--   CC_GLP     1: EINGRIFF fuer die Wellen (D): LP jedes aktivierten Gegners
--              (Slots 0-19, S+5 = 1, S+4 = 1 oder 3, LP > 1) := 1
--   CC_GDX, CC_GDZ, CC_GSLOT, CC_GBIS: EINGRIFF, Gegner in Slot CC_GSLOT
--              (Standard 18) bis Frame CC_GBIS (Standard 2) vor jedem Frame
--              bei x = Figur + CC_GDX (Nachkomma 0) bzw. Tiefe = Figur + CC_GDZ
--   CC_RANG    EINGRIFF: Rang FFF82A ab Frame 2 festhalten (wie rang.lua)
--   CC_ENTF    EINGRIFF fuer die Wellen (D): Gegnerslots, z. B. "18,17", die in
--              Frame CC_ENTF_AB (Standard 150) per S+4 := 0 entfernt werden
--              (Slot frei, ohne Tod)
--   CC_ENTF2   wie CC_ENTF, zweiter Zeitpunkt CC_ENTF2_AB (Standard 1000)
--   CC_KSTUFEN EINGRIFF "slot:k0:k1:dauer:ab,...": Gegner-x := Kamera-x + k;
--              k laeuft in 1-px-Stufen von k0 nach k1, jede Stufe dauer Frames,
--              ab Frame ab (Schwellen fuer Sichtbarkeit und Weckreiz)
--   CC_DUMP_AB erster Frame des Abzugs (Standard 1)
-- Das Auffuellen der LP erkennt die Auswertung am LP-Wert am Frame-Ende
-- (Watch-Spalte p_lp zwischen 1 und 71 heisst: danach aufgefuellt).
-- Kalibriert (Figur passiv, gemessen mit messen_verhalten.py):
--   anlauf    WOOKY (Slot 18) steht ab Frame 40 bei dx 46, dz +10 in
--             Kampfhaltung, erster Angriff W-A in 61, Treffer in 70
--   anlauf_c  EDDY (Slot 17) steht ab Frame 38 bei dx 47, dz 0, Angriff E-A
--             in 59, Treffer in 68
--   kontakt   liegt auf demselben Weg wie anlauf, 42 Frames spaeter
--   ingame    mit CC_IN="61-180:p1_right": versteckter WOOKY wacht in 168 auf
--             (Kamera-x 307), kampffaehig ab 184
--   stage1    mit Rechtslauf ab Frame 2: Weckreiz 109, kampffaehig 125
local frames = tonumber(os.getenv("CC_FRAMES") or "2000")
local muster = os.getenv("CC_MUSTER") or "passiv"
local ab = tonumber(os.getenv("CC_AB") or "30")
local dauer = tonumber(os.getenv("CC_DAUER") or "300")
local pause = tonumber(os.getenv("CC_PAUSE") or "150")
local takt = tonumber(os.getenv("CC_TAKT") or "60")

local inputs = {}
for item in (os.getenv("CC_IN") or ""):gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

if muster == "weg_l" then
	inputs[#inputs + 1] = { ab, ab + dauer - 1, { "p1_left" } }
elseif muster == "weg_r" then
	inputs[#inputs + 1] = { ab, ab + dauer - 1, { "p1_right" } }
elseif muster == "tiefe" then
	-- hoch, runter, runter, hoch: pendelt zwischen +20 und -20 um den Start
	local folge = { "p1_up", "p1_down", "p1_down", "p1_up" }
	local f, i = ab, 0
	while f + 20 <= frames do
		inputs[#inputs + 1] = { f, f + 19, { folge[i % 4 + 1] } }
		f = f + 20 + pause
		i = i + 1
	end
elseif muster == "sprung" then
	for f = ab, frames - 2, takt do inputs[#inputs + 1] = { f, f + 1, { "p1_jump" } } end
elseif muster ~= "passiv" then
	error("unbekanntes CC_MUSTER: " .. muster)
end

local P = 0xFFA990
local pokes = {}
if (os.getenv("CC_LP") or "1") ~= "0" then
	pokes[#pokes + 1] = { 2, frames, P + 0x40, function(sp)
		local v = sp:read_u16(P + 0x40)
		if v >= 0x8000 then v = v - 0x10000 end
		if v > 0 and v < 72 then return 72 end
		return v & 0xFFFF
	end, 2 }
end
if os.getenv("CC_GLP") == "1" then
	for n = 0, 19 do
		local S = 0xFFBC90 + n * 0xC0
		pokes[#pokes + 1] = { 2, frames, S + 0x40, function(sp)
			local v = sp:read_u16(S + 0x40)
			local st = sp:read_u8(S + 4)
			if sp:read_u8(S + 5) == 1 and (st == 1 or st == 3) and v > 1 and v < 0x8000 then return 1 end
			return v
		end, 2 }
	end
end
local gdx, gdz = tonumber(os.getenv("CC_GDX") or ""), tonumber(os.getenv("CC_GDZ") or "")
if gdx or gdz then
	local S = 0xFFBC90 + tonumber(os.getenv("CC_GSLOT") or "18") * 0xC0
	local bis = tonumber(os.getenv("CC_GBIS") or "2")
	if gdx then
		pokes[#pokes + 1] = { 2, bis, S + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + gdx) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { 2, bis, S + 0x10, 0, 2 }
	end
	if gdz then
		pokes[#pokes + 1] = { 2, bis, S + 0x16, function(sp) return (sp:read_u16(P + 0x16) + gdz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { 2, bis, S + 0x18, 0, 2 }
	end
end
local entf = os.getenv("CC_ENTF") or ""
if entf ~= "" then
	local ab = tonumber(os.getenv("CC_ENTF_AB") or "150")
	for n in entf:gmatch("%d+") do
		pokes[#pokes + 1] = { ab, ab, 0xFFBC90 + tonumber(n) * 0xC0 + 4, 0 }
	end
end
local entf2 = os.getenv("CC_ENTF2") or ""
if entf2 ~= "" then
	local ab2 = tonumber(os.getenv("CC_ENTF2_AB") or "1000")
	for n in entf2:gmatch("%d+") do
		pokes[#pokes + 1] = { ab2, ab2, 0xFFBC90 + tonumber(n) * 0xC0 + 4, 0 }
	end
end
-- CC_KSTUFEN "slot:k0:k1:dauer:ab,...": Gegner-x := Kamera-x + k, k laeuft in
-- 1-px-Schritten von k0 nach k1, jede Stufe dauer Frames lang, ab Frame ab
for item in (os.getenv("CC_KSTUFEN") or ""):gmatch("[^,]+") do
	local sl, k0, k1, dauer_k, ab_k = item:match("^(%d+):(%-?%d+):(%-?%d+):(%d+):(%d+)$")
	assert(sl, "CC_KSTUFEN: " .. item)
	sl, k0, k1, dauer_k, ab_k = tonumber(sl), tonumber(k0), tonumber(k1), tonumber(dauer_k), tonumber(ab_k)
	local S = 0xFFBC90 + sl * 0xC0
	local schritt = (k1 >= k0) and 1 or -1
	local bis_k = ab_k + (math.abs(k1 - k0) + 1) * dauer_k - 1
	-- der Runner ruft die Funktion genau einmal je Frame ab..bis_k auf (vor dem Frame)
	local f_cur = ab_k - 1
	pokes[#pokes + 1] = { ab_k, bis_k, S + 0x0E, function(sp)
		f_cur = f_cur + 1
		local k = k0 + schritt * math.floor((f_cur - ab_k) / dauer_k)
		return (sp:read_u16(0xFFA82E) + k) & 0xFFFF
	end, 2 }
	pokes[#pokes + 1] = { ab_k, bis_k, S + 0x10, 0, 2 }
end
local rang = tonumber(os.getenv("CC_RANG") or "")
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	watch = {
		{ name = "camx", addr = 0xFFA82E, size = 2 },
		{ name = "camy", addr = 0xFFA830, size = 2 },
		{ name = "stage", addr = 0xFFA8CE, size = 1 },
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
		{ name = "p_lp", addr = P + 0x40, size = 2, signed = true },
	},
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = tonumber(os.getenv("CC_DUMP_AB") or "1"), to = frames, every = 1 },
}
