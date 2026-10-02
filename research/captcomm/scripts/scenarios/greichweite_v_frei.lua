-- greichweite_v_frei.lua – Gegenpruefung "Reichweite der Gegnerangriffe" (V3).
--
-- Freier Lauf ab einem beliebigen Savestate (run.sh-Argument) mit Eingaben aus
-- Umgebungsvariablen. Dient fuer natuerliche Laeufe (Gegner greifen die Figur
-- an) und fuer die Reichweitenproben mit Eingriff.
--
-- Variablen:
--   CC_IN      Eingaben "namen:von-bis,..." (namen mit + verbunden, Kurzformen
--              l r u d a j), z. B. "r:401-520,u+r:521-530,a:600-601"
--   CC_FRAMES  Laufzeit (Standard 2000)
--   CC_SAVE    Savestates "frame:name,..." (nur Namen mit Praefix greichweite_v)
--   CC_DUMP    "von-bis" Abzugsbereich in Frames (Standard ganzer Lauf);
--              Abzug immer nur 0xFFA900-0xFFEA00, Rang und Zaehler per watch
--   CC_LP      1 (Standard): EINGRIFF LP-Auffuellung, die LP der Figur werden vor
--              jedem Frame auf 72 gesetzt (der Treffer bleibt am Frame-Ende
--              sichtbar: LP < 72). 0 = aus
--   CC_RANG    EINGRIFF: Rang FFF82A ab Frame 2 auf diesem Wert halten
--
-- EINGRIFF fuer die Reichweite (nur wenn CC_POKE gesetzt ist):
--   CC_POKE    "von-bis": in diesen Frames wird vor jedem Frame die FIGUR relativ
--              zum Gegner in Slot CC_SLOT gesetzt (anders als kette.lua, das den
--              Gegner verschiebt):
--   CC_DX      x-Abstand Gegner - Figur (Figur.x := Gegner.x - CC_DX, Nachkomma 0)
--   CC_DZ      Tiefenabstand Gegner - Figur (Figur.z := Gegner.z - CC_DZ)
--   CC_PH      Hoehe der Figur (P+0x12 := CC_PH, Nachkomma 0), ohne Sprungaktion
--   CC_WER     "gegner": stattdessen den GEGNER relativ zur Figur setzen
--              (Gegner.x := Figur.x + CC_DX usw.), zur Kontrolle der Methode
-- Ohne CC_DX/CC_DZ/CC_PH bleibt die jeweilige Groesse unveraendert.
--   CC_POKE2, CC_DX2, CC_DZ2, CC_PH2: zweites Eingriffsfenster gleicher Art
--              (z. B. Figur erst ausser Reichweite, dann in Reichweite)
--
-- Kalibrierung (belege_greichweite.sh, Teil V): Die natuerlichen Laeufe n1, n4
-- bis n8 ab ingame legen die Savestates je 3 Frames vor einem Angriff an
-- (A = Frame 3 ab Savestate, bei *_20 Frame 20); die Proben setzen die Figur
-- ab Frame 4 (A+1) bis 40 (A+37). Die Figur bleibt im Bild: Ein Eingriff ueber
-- den Bild- oder Spielfeldrand wird vom Spiel im selben Frame zurueckgenommen
-- (Pruefung in messen_greichweite_v.py probe, Spalte gueltig).
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
	assert(n and n:match("^greichweite_v"), "CC_SAVE: nur eigener Praefix")
	saves = saves or {}
	saves[tonumber(f)] = n
end

local P = 0xFFA990
local pokes = {}
if env("CC_LP", "1") == "1" then
	pokes[#pokes + 1] = { 2, frames, P + 0x40, 72, 2 }
end
local rang = tonumber(env("CC_RANG", ""))
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

local function eingriff(sfx)
	local pv, pb = env("CC_POKE" .. sfx, ""):match("^(%d+)%-(%d+)$")
	if not pv then return end
	pv, pb = tonumber(pv), tonumber(pb)
	local S = 0xFFBC90 + tonumber(env("CC_SLOT", "18")) * 0xC0
	local dx, dz, ph = tonumber(env("CC_DX" .. sfx, "")), tonumber(env("CC_DZ" .. sfx, "")), tonumber(env("CC_PH" .. sfx, ""))
	local wer = env("CC_WER", "figur")
	local function rel(src, d, sign)
		return function(sp) return (sp:read_u16(src) + sign * d) & 0xFFFF end
	end
	if wer == "gegner" then
		if dx then
			pokes[#pokes + 1] = { pv, pb, S + 0x0E, rel(P + 0x0E, dx, 1), 2 }
			pokes[#pokes + 1] = { pv, pb, S + 0x10, 0, 2 }
		end
		if dz then
			pokes[#pokes + 1] = { pv, pb, S + 0x16, rel(P + 0x16, dz, 1), 2 }
			pokes[#pokes + 1] = { pv, pb, S + 0x18, 0, 2 }
		end
	else
		if dx then
			pokes[#pokes + 1] = { pv, pb, P + 0x0E, rel(S + 0x0E, dx, -1), 2 }
			pokes[#pokes + 1] = { pv, pb, P + 0x10, 0, 2 }
		end
		if dz then
			pokes[#pokes + 1] = { pv, pb, P + 0x16, rel(S + 0x16, dz, -1), 2 }
			pokes[#pokes + 1] = { pv, pb, P + 0x18, 0, 2 }
		end
	end
	if ph then
		pokes[#pokes + 1] = { pv, pb, P + 0x12, ph & 0xFFFF, 2 }
		pokes[#pokes + 1] = { pv, pb, P + 0x14, 0, 2 }
	end
end
eingriff("")
eingriff("2")

local dv, db = env("CC_DUMP", ""):match("^(%d+)%-(%d+)$")
return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = saves,
	watch = {
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
	},
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = tonumber(dv or "1"), to = tonumber(db or tostring(frames)), every = 1 },
}
