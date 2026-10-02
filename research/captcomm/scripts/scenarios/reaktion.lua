-- Trefferreaktion der Gegner (Praefix reaktion): ab Savestate "kontakt"
-- (WOOKY, 16 LP, Slot 18, steht 46 px vor der Figur) oder "kontakt_b"
-- (EDDY, 30 LP, Slot 17, laeuft heran; CC_SLOT=17).
--
-- Eingaben (ohne Eingriff):
--   CC_DRUECKE  Liste der Frames mit Angriffsdruck (je 2 Frames gedrueckt),
--               z. B. "3,19,36" fuer eine Kette (Stufe 1 trifft in P+2,
--               Stufe 2 in D+3, Stufe 3 in D+4, Stufe 4 in D+3)
--   CC_IN       freie Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis
--               a+1), z. B. "2-7:p1_right;15:p1_right+p1_attack" (Griff und
--               Wurf) oder "2:p1_jump;10:p1_attack" (Sprungangriff neutral)
--   CC_FRAMES   Laenge des Laufs (Standard 120)
--
-- EINGRIFFE (RAM-Schreibzugriffe vor dem jeweiligen Frame, in jeder
-- Ergebnistabelle genannt):
--   CC_LP=v     setzt die LP des Gegners (S+0x40 und Vorframe S+0x42) einmal
--               vor Frame CC_LP_AB (Standard 2) auf v, damit ein 16-LP-Gegner
--               die Kette bzw. das Umwerfen ueberlebt (bzw. mit kleinem v fuer
--               den Tod). Liegt v ueber den Max-LP S+0x9A, werden diese
--               mitgesetzt (sonst haelt das Spiel an)
--   CC_DX, CC_DZ  setzt den Gegner von Frame CC_POKE_VON (Standard 2) bis
--               CC_POKE_BIS relativ zur Figur (x bzw. Tiefe, Nachkomma 0).
--               Mit CC_FERN_BIS=t steht er bis Frame t 200 px entfernt und
--               erst danach bei CC_DX; mit CC_NAH_BIS=u ab u+1 wieder 200 px
--               entfernt (Einzelframe-Probe: CC_FERN_BIS=T-1, CC_NAH_BIS=T)
--   CC_SLOT2, CC_DX2, CC_DZ2, CC_POKE2_VON, CC_POKE2_BIS  dasselbe fuer einen
--               zweiten Gegner (mehrere Gegner in einem Schlag)
--   CC_LP2=v    LP des zweiten Gegners vor Frame CC_LP_AB
--
-- CC_DUMP_VON, CC_DUMP_BIS: Abzug nur in diesen Frames (Einzelframe-Proben).
-- Abzug nur 0xFFA900-0xFFEA00 (Spielerblock und Objekttabelle); Rang FFF82A
-- und Zaehler FFF82C stehen in der Watch-CSV. Der Rang wird nie veraendert.
-- Kalibriert (reaktion_*): Stufe 1 mit Druck in Frame P trifft in P+2 (h),
-- Folgestufen D+3/D+4/D+3. kontakt: WOOKY steht 46 px vor der Figur in der
-- Standpose, holt ohne Eingabe in Frame 19 aus und trifft in 28. kontakt_b:
-- EDDY geht bis Frame 13 heran, steht ab 14 (45 px), holt in 35 aus und trifft
-- in 44; der WOOKY in Slot 16 wird in Frame 13 aktiv (vorher S+4 = 2).
local slot = tonumber(os.getenv("CC_SLOT") or "18")
local frames = tonumber(os.getenv("CC_FRAMES") or "120")
local druecke = os.getenv("CC_DRUECKE") or ""
local spec = os.getenv("CC_IN") or ""

local inputs = {}
for f in druecke:gmatch("%d+") do
	local n = tonumber(f)
	inputs[#inputs + 1] = { n, n + 1, { "p1_attack" } }
end
for item in spec:gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local P1X, P1Z = 0xFFA99E, 0xFFA9A6
local pokes = {}

-- Position eines Gegners relativ zur Figur (EINGRIFF)
local function pos(sl, dx, dz, von, bis, fern_bis, nah_bis)
	local S = 0xFFBC90 + sl * 0xC0
	local function weg(sp) return (sp:read_u16(P1X) + 200) & 0xFFFF end
	if dx then
		local function nah(sp) return (sp:read_u16(P1X) + dx) & 0xFFFF end
		if fern_bis and fern_bis >= von then
			local ende = nah_bis or bis
			pokes[#pokes + 1] = { von, fern_bis, S + 0x0E, weg, 2 }
			pokes[#pokes + 1] = { fern_bis + 1, ende, S + 0x0E, nah, 2 }
			if ende < bis then pokes[#pokes + 1] = { ende + 1, bis, S + 0x0E, weg, 2 } end
		else
			pokes[#pokes + 1] = { von, bis, S + 0x0E, nah, 2 }
		end
		pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	end
	if dz then
		pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
end

local function env(n) return tonumber(os.getenv(n) or "") end

local poke_bis = env("CC_POKE_BIS") or frames
pos(slot, env("CC_DX"), env("CC_DZ"), env("CC_POKE_VON") or 2, poke_bis,
	env("CC_FERN_BIS"), env("CC_NAH_BIS"))
local slot2 = env("CC_SLOT2")
if slot2 then
	pos(slot2, env("CC_DX2"), env("CC_DZ2"), env("CC_POKE2_VON") or 2,
		env("CC_POKE2_BIS") or frames, nil, nil)
end

local lp_ab = env("CC_LP_AB") or 2
local function lp(sl, v)
	if not v then return end
	local S = 0xFFBC90 + sl * 0xC0
	pokes[#pokes + 1] = { lp_ab, lp_ab, S + 0x40, v & 0xFFFF, 2 }
	pokes[#pokes + 1] = { lp_ab, lp_ab, S + 0x42, v & 0xFFFF, 2 }
	-- Max-LP mitsetzen: LP ueber dem Maximum (S+0x9A) bringen das Spiel zum
	-- Stillstand (vermutlich die Anzeige des Lebensbalkens)
	pokes[#pokes + 1] = { lp_ab, lp_ab, S + 0x9A, function(sp)
		return math.max(sp:read_u16(S + 0x9A), v) & 0xFFFF
	end, 2 }
end
lp(slot, env("CC_LP"))
if slot2 then lp(slot2, env("CC_LP2")) end

-- CC_SAVE=f, CC_SAVE_NAME=n: Savestate n in Frame f anlegen (Ausgangslage der
-- dritten Messung, belege_reaktion.sh)
local save = env("CC_SAVE")

return {
	frames = frames,
	save_states = save and { [save] = os.getenv("CC_SAVE_NAME") or "reaktion_w3" } or nil,
	inputs = inputs,
	pokes = pokes,
	watch = {
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
	},
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = env("CC_DUMP_VON") or 1,
		to = env("CC_DUMP_BIS") or frames, every = 1 },
}
