-- verhalten_v_frei.lua – Gegenprüfung (V2) zu „Verhalten von WOOKY und EDDY“.
-- Freies Szenario ab beliebigem Savestate (Stage 1). Alles über
-- Umgebungsvariablen; ohne Variablen 3000 Frames ohne Eingabe.
--
--   CC_FRAMES  Laufzeit in Frames (Standard 3000)
--   CC_IN      feste Eingaben "tasten:von-bis;...", Tasten l r u d a j mit "+"
--              verbunden, z. B. "r:61-180;r+u:200-230;a:300-301"
--   CC_REAKT   Reaktion auf einen nahen, stehenden Gegner: "k:eingaben".
--              Auslöser: ein Gegner (Slot 0..19, S+4 = 1, S+5 = 1) steht seit
--              k Frames still (x und Tiefe unverändert), |dx| <= CC_REAKT_DX
--              (Standard 70) und |dz| <= 12. Dann werden die Eingaben relativ
--              zum Auslöseframe t gedrückt, frühestens ab t+2 ("l:0-99" =
--              Frames t+2 bis t+101; t = Zustand am Ende von Frame t).
--              CC_REAKT_N (Standard 1) Anzahl Auslösungen, CC_REAKT_PAUSE
--              (Standard 300) Mindestabstand, CC_REAKT_AB frühester Frame,
--              CC_REAKT_TYP Typkennung S+0x38 hexadezimal (nur dieser Typ),
--              CC_REAKT_SEITE "r" bzw. "l": nur Gegner rechts bzw. links der Figur,
--              CC_REAKT_NACH "d1-d2": nur d1..d2 Frames nach dem letzten aktiven
--              Angriffsframe dieses Gegners (S+0x24 & 0x0C, nicht 0xFF00).
--              CC_REAKT_ANIM "5FA54,643F8": nur wenn der Animationszeiger S+0x1C
--              des Gegners einer dieser Werte ist (hexadezimal).
--              Immer: Figur steht (P+4 = 1, Aktion P+0x0A = 0).
--              Jede Auslösung steht als Zeile in <CC_NAME>_reakt.txt.
--   EINGRIFFE (nur wenn gesetzt, stehen im Kopf der Ergebnistabelle):
--   CC_RANG    hält den Rang FFF82A ab Frame 2 auf diesem Wert
--   CC_LP      1: LP der Figur vor jedem Frame auf 72, wenn 0 < LP < 72
--              (der Treffer bleibt im Abzug sichtbar: LP am Frame-Ende < 72)
--   CC_SETZ    "slot:dx:dz:von:bis,..." Gegner relativ zur Figur setzen
--              (x = Figur + dx, Tiefe = Figur + dz, Nachkomma 0; "-" = Achse
--              unverändert)
--   CC_KAM     "slot:xk:von:bis,..." Gegner-x := Kamera-x + xk
--   CC_ENTF    "slot:frame,..." S+4 := 0 (Gegner entfernt) in diesem Frame
--   Kalibriert (Figur passiv, LP aufgefüllt; messen_verhalten_v.py):
--     stage1 mit CC_IN="r:150-300": Weckreiz versteckter WOOKY F 257,
--       EDDY F 732, hockender WOOKY F 1035; Gully-WOOKY ab F 1921
--     stage1 Rang 7 bis F 208, danach +1 alle 600 F (ingame: Rang 9)
--     anlauf: WOOKY (Slot 18) steht ab F 39 bei dx 46, dz +10;
--     anlauf_c: EDDY (Slot 17) steht ab F 37 bei dx 47, dz 0
--     ingame: Kamera 256 steht, solange die Figur nicht über Bildschirm-x 200 geht
--   Abzug: 0xFFA900..0xFFEA00 (Spielerblock und Slots 0..59) jeden Frame,
--   ab CC_DUMP_AB (Standard 1); CC_DUMP=0 schaltet ihn ab. Kamera, Stage,
--   Rang und Rangzähler stehen im Watch-CSV.
local function num(n, d) return tonumber(os.getenv(n) or "") or d end
local frames = num("CC_FRAMES", 3000)

local NAMEN = { l = "P1 Left", r = "P1 Right", u = "P1 Up", d = "P1 Down",
	a = "P1 Button 1", j = "P1 Button 2" }
local LOG = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down",
	a = "p1_attack", j = "p1_jump" }

-- "r+u:200-230;a:300" -> Liste { {tasten}, von, bis }
local function parse_in(s, roh)
	local out = {}
	for teil in (s or ""):gmatch("[^;]+") do
		local t, a, b = teil:match("^([%a%+]+):(%-?%d+)%-?(%-?%d*)$")
		assert(t, "CC_IN/CC_REAKT: " .. teil)
		local keys = {}
		for k in t:gmatch("%a") do keys[#keys + 1] = roh and NAMEN[k] or LOG[k] end
		out[#out + 1] = { keys, tonumber(a), tonumber(b ~= "" and b or a) }
	end
	return out
end

local inputs = {}
for _, e in ipairs(parse_in(os.getenv("CC_IN"), false)) do
	inputs[#inputs + 1] = { e[2], e[3], e[1] }
end

local P = 0xFFA990
local CAMX = 0xFFA82E
local function S(n) return 0xFFBC90 + n * 0xC0 end
local function s16(v) if v >= 0x8000 then return v - 0x10000 end return v end

local pokes = {}
local rang = num("CC_RANG", nil)
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end
if num("CC_LP", 0) == 1 then
	pokes[#pokes + 1] = { 2, frames, P + 0x40, function(sp)
		local lp = s16(sp:read_u16(P + 0x40))
		if lp > 0 and lp < 72 then return 72 end
		return sp:read_u16(P + 0x40)
	end, 2 }
end
for teil in (os.getenv("CC_SETZ") or ""):gmatch("[^,]+") do
	local n, dx, dz, a, b = teil:match("^(%d+):([%-%d]+):([%-%d]+):(%d+):(%d+)$")
	assert(n, "CC_SETZ: " .. teil)
	local base = S(tonumber(n))
	a, b = tonumber(a), tonumber(b)
	if dx ~= "-" then
		dx = tonumber(dx)
		pokes[#pokes + 1] = { a, b, base + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + dx) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { a, b, base + 0x10, 0, 2 }
	end
	if dz ~= "-" then
		dz = tonumber(dz)
		pokes[#pokes + 1] = { a, b, base + 0x16, function(sp) return (sp:read_u16(P + 0x16) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { a, b, base + 0x18, 0, 2 }
	end
end
for teil in (os.getenv("CC_KAM") or ""):gmatch("[^,]+") do
	local n, xk, a, b = teil:match("^(%d+):([%-%d]+):(%d+):(%d+)$")
	assert(n, "CC_KAM: " .. teil)
	local base, xk2 = S(tonumber(n)), tonumber(xk)
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), base + 0x0E, function(sp) return (sp:read_u16(CAMX) + xk2) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), base + 0x10, 0, 2 }
end
for teil in (os.getenv("CC_ENTF") or ""):gmatch("[^,]+") do
	local n, f = teil:match("^(%d+):(%d+)$")
	assert(n, "CC_ENTF: " .. teil)
	pokes[#pokes + 1] = { tonumber(f), tonumber(f), S(tonumber(n)) + 4, 0 }
end

-- Reaktion: Die Funktion läuft als „Eingriff“, der nur den gelesenen Wert
-- zurückschreibt (keine Änderung), und hängt Eingaben an die Liste an, die
-- der Runner in jedem Frame liest.
local reakt = os.getenv("CC_REAKT")
if reakt then
	local k, spec = reakt:match("^(%d+):(.+)$")
	k = tonumber(k)
	local rel = parse_in(spec, true)
	local maxn = num("CC_REAKT_N", 1)
	local pause = num("CC_REAKT_PAUSE", 300)
	local ab = num("CC_REAKT_AB", 2)
	local maxdx = num("CC_REAKT_DX", 70)
	local seite = os.getenv("CC_REAKT_SEITE")
	local nach1, nach2 = (os.getenv("CC_REAKT_NACH") or ""):match("^(%d+)%-(%d+)$")
	nach1, nach2 = tonumber(nach1), tonumber(nach2)
	local last_akt = {}
	local anims = nil
	for h in (os.getenv("CC_REAKT_ANIM") or ""):gmatch("%x+") do
		anims = anims or {}
		anims[tonumber(h, 16)] = true
	end
	local typ = os.getenv("CC_REAKT_TYP")
	typ = typ and tonumber(typ, 16)
	local still, last = {}, {}
	local n_done, t_last, fr = 0, -100000, 1
	local logf = assert(io.open(os.getenv("CC_OUT") .. "_reakt.txt", "w"))
	pokes[#pokes + 1] = { 2, frames, 0xFFA900, function(sp)
		fr = fr + 1 -- Frame, für den gerade geschrieben wird (Callback fr-1)
		local px, pz = sp:read_u16(P + 0x0E), sp:read_u16(P + 0x16)
		local frei = sp:read_u8(P + 4) == 1 and sp:read_u16(P + 0x0A) == 0
		local hit = nil
		for n = 0, 19 do
			local b = S(n)
			local x, z = sp:read_u16(b + 0x0E), sp:read_u16(b + 0x16)
			local key = x * 65536 + z
			if sp:read_u8(b + 4) == 1 and sp:read_u8(b + 5) == 1 and last[n] == key then
				still[n] = (still[n] or 0) + 1
			else
				still[n] = 0
			end
			last[n] = key
			local att = sp:read_u16(b + 0x24)
			if att ~= 0 and att ~= 0xFF00 and (att & 0x0C) ~= 0 then last_akt[n] = fr - 1 end
			local nach_ok = true
			if nach1 then
				local d = (fr - 1) - (last_akt[n] or -100000)
				nach_ok = d >= nach1 and d <= nach2
			end
			local dx, dz = s16((x - px) & 0xFFFF), s16((z - pz) & 0xFFFF)
			if still[n] >= k and math.abs(dx) <= maxdx and math.abs(dz) <= 12
					and (not typ or sp:read_u32(b + 0x38) == typ)
					and (not seite or (seite == "r") == (dx > 0)) and nach_ok and frei
					and (not anims or anims[sp:read_u32(b + 0x1C)]) then
				hit = hit or { n, dx, dz }
			end
		end
		local t = fr - 1 -- zuletzt protokollierter Frame
		if hit and n_done < maxn and t >= ab and t - t_last >= pause then
			n_done, t_last = n_done + 1, t
			logf:write(string.format("%d %d %d %d\n", t, hit[1], hit[2], hit[3]))
			logf:flush()
			for _, e in ipairs(rel) do
				inputs[#inputs + 1] = { t + 2 + e[2], t + 2 + e[3], e[1] }
			end
		end
		return sp:read_u8(0xFFA900)
	end }
end

local watch = {
	{ name = "camx", addr = 0xFFA82E, size = 2 },
	{ name = "camy", addr = 0xFFA830, size = 2 },
	{ name = "stage", addr = 0xFFA8CE, size = 1 },
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "rangz", addr = 0xFFF82C, size = 2 },
}
local dump = nil
if num("CC_DUMP", 1) ~= 0 then
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = num("CC_DUMP_AB", 1), to = frames, every = 1 }
end
return { frames = frames, inputs = inputs, pokes = pokes, watch = watch, dump = dump }
