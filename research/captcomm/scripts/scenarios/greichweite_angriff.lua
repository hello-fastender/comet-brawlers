-- greichweite_angriff.lua: Angriffe eines Gegners gegen die passive Figur
-- (Startup, aktive Frames, Reichweite, Tiefe, Hoehe, Nachlauf). Laeuft ab
-- einem Savestate ("kontakt": WOOKY Slot 18, "kontakt_b": EDDY Slot 17,
-- "ingame" mit Eingaben wie hurt.lua/hurt_c.lua, oder die Savestates
-- greichweite_* aus belege_greichweite.sh). Auswertung:
-- messen_a5.py gegnerangriff.
--   CC_FRAMES  Laufzeit (Standard 400)
--   CC_SLOT    Slot des gemessenen Gegners (Standard 18)
--   CC_IN      freie Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1;
--              statt ";" geht auch "/")
--   CC_SAVE    "frame:name" legt dort einen Savestate an
--   CC_DUMP_AB Abzug erst ab diesem Frame (Standard 1)
-- EINGRIFFE (RAM-Schreibzugriffe vor jedem Frame, alle optional):
--   CC_LP=1    LP der Figur (P+0x40) vor jedem Frame auf 72. Ein Treffer
--              ist dann jeder Frame, der mit weniger als 72 LP endet; die
--              Vorframe-LP P+0x42 bleiben 72 (Auswertung: P+0x40 < P+0x42).
--              Ohne Auffuellen stirbt die Figur in langen Laeufen.
--   CC_AB      Angriffsbeginn A: "n:ANIM" = der n-te Frame, in dem der
--              Animationszeiger S+0x1C des Gegners (Langwort, hex) auf ANIM
--              wechselt, oder eine feste Frame-Nummer. Bis A bleibt der Lauf
--              natuerlich, der Gegner waehlt seinen Angriff also selbst.
--   CC_VON, CC_BIS  die Positionseingriffe gelten in den Frames A+CC_VON bis
--              A+CC_BIS (Standard 1 und 40). Der Gegner bricht einen Angriff
--              in der Ausholphase ab, wenn die Figur nicht mehr vor ihm steht
--              (gemessen: WOOKY wechselt in A+1 ins Gehen). Fuer Reichweiten
--              deshalb CC_VON = Startup: bis dahin bleibt die Figur, wo sie
--              natuerlich steht.
--   CC_DX      x(Figur) = x(Gegner) - CC_DX, ganzzahlig, Nachkomma 0
--              (dx = x(Gegner) - x(Figur) wie in kette.lua; > 0: Figur links
--              vom Gegner)
--   CC_DZ      ebenso Tiefe: z(Figur) = z(Gegner) - CC_DZ
--   CC_H       Hoehe der Figur P+0x12 (Nachkomma 0), Figur steht dabei
--   CC_FERN=n  in A+CC_VON bis A+n steht die Figur 200 px vom Gegner weg (auf
--              der Seite von CC_DX), ab A+n+1 bei CC_DX: zeigt, in welchen
--              Frames der Angriff noch trifft. Mit CC_FERN_DX/CC_FERN_DZ steht
--              sie in dieser Zeit stattdessen dort (z. B. ausser Tiefenreichweite),
--              mit CC_FERN_H in dieser Hoehe (danach CC_H bzw. 0)
--   CC_VOR     "von-bis" (Frames): Eingriff vor dem Angriff, setzt die Figur
--              auf CC_VOR_DX/CC_VOR_DZ relativ zum Gegner in Slot CC_VOR_SLOT
--              (Standard CC_SLOT), z. B. auf seine andere Seite, damit er sich
--              umdreht; danach natuerlich
-- Kalibriert (2026-10-02, Rang 12, CC_LP=1, ohne weiteren Eingriff): ab
-- "kontakt" beginnt WOOKY (Slot 18) Schlag A (5fa54) in Frame 19 und 77,
-- Umwerfschlag A (5fb50) in 137; ab "kontakt_b" EDDY (Slot 17) Schlag A
-- (643f8) in 31, Umwerfschlag (644f4) in 289. Alle Quellen mit k und A im
-- Kopf von scripts/belege_greichweite.sh.
-- Rang: ueber scenarios/rang.lua (CC_BASIS=greichweite_angriff.lua, CC_RANG).
-- Abzug nur 0xFFA900-0xFFEA00 (Spieler, Gegner- und Geschossslots), Rang
-- FFF82A, Zaehler FFF82C und Kamera FFA82E/FFA830 im Watch-CSV. Die Figur
-- bleibt im Bild: Ein Eingriff, der sie ausserhalb setzt, wird vom Spiel im
-- selben Frame zurueckgeschoben (Auswertung mit den Positionen am Frame-Ende).
local frames = tonumber(os.getenv("CC_FRAMES") or "400")
local slot = tonumber(os.getenv("CC_SLOT") or "18")
local spec = os.getenv("CC_IN") or ""
local lp = os.getenv("CC_LP") == "1"
local dx = tonumber(os.getenv("CC_DX") or "")
local dz = tonumber(os.getenv("CC_DZ") or "")
local h = tonumber(os.getenv("CC_H") or "")
local ab = os.getenv("CC_AB") or ""
local von = tonumber(os.getenv("CC_VON") or "1")
local bis = tonumber(os.getenv("CC_BIS") or "40")
local fern = tonumber(os.getenv("CC_FERN") or "0")
local vor_von, vor_bis = (os.getenv("CC_VOR") or ""):match("^(%d+)%-(%d+)$")
local vor_dx = tonumber(os.getenv("CC_VOR_DX") or "")
local vor_dz = tonumber(os.getenv("CC_VOR_DZ") or "")
local vor_slot = tonumber(os.getenv("CC_VOR_SLOT") or tostring(slot))
local dump_ab = tonumber(os.getenv("CC_DUMP_AB") or "1")
local fern_dx = tonumber(os.getenv("CC_FERN_DX") or "")
local fern_dz = tonumber(os.getenv("CC_FERN_DZ") or "")
local fern_h = tonumber(os.getenv("CC_FERN_H") or "")

local inputs = {}
for item in spec:gmatch("[^;/]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local P = 0xFFA990
local S = 0xFFBC90 + slot * 0xC0
local function rd16(sp, a) return sp:read_u16(a) end

-- Angriffsbeginn. Der Runner ruft die Eingriffe im Callback von Frame f fuer
-- Frame f+1 auf und sieht dabei den Zustand am Ende von Frame f.
local start = tonumber(ab)
local ab_n, ab_anim = ab:match("^(%d+):(%x+)$")
ab_n = tonumber(ab_n)
ab_anim = ab_anim and tonumber(ab_anim, 16)
local seen, last_anim, cb = 0, nil, 0
local function check(sp)
	cb = cb + 1                  -- = Frame, dessen Ende gerade vorliegt
	if start or not ab_anim then return end
	local a = sp:read_u32(S + 0x1C)
	if a == ab_anim and last_anim ~= a then
		seen = seen + 1
		if seen == ab_n then start = cb end
	end
	last_anim = a
end

-- Frame f (fuer den gerade gesetzt wird) im Eingriffsfenster?
local function im_fenster(f)
	return start and f >= start + von and f <= start + bis
end

local pokes = {}
-- Rahmen: Frame-Zaehler und Suche nach dem Angriffsbeginn laufen in jedem
-- Frame ueber den LP-Eingriff (ohne CC_LP schreibt er den alten Wert zurueck)
pokes[#pokes + 1] = { 2, frames, P + 0x40, function(sp)
	check(sp)
	if lp then return 72 end
	return rd16(sp, P + 0x40)
end, 2 }

if dx then
	pokes[#pokes + 1] = { 2, frames, P + 0x0E, function(sp)
		local f = cb + 1
		if not im_fenster(f) then return rd16(sp, P + 0x0E) end
		local v = dx
		if f <= start + fern then v = fern_dx or (dx >= 0 and 200 or -200) end
		return (rd16(sp, S + 0x0E) - v) & 0xFFFF
	end, 2 }
	pokes[#pokes + 1] = { 2, frames, P + 0x10, function(sp)
		if not im_fenster(cb + 1) then return rd16(sp, P + 0x10) end
		return 0
	end, 2 }
end
if dz then
	pokes[#pokes + 1] = { 2, frames, P + 0x16, function(sp)
		local f = cb + 1
		if not im_fenster(f) then return rd16(sp, P + 0x16) end
		local v = (f <= start + fern and fern_dz) or dz
		return (rd16(sp, S + 0x16) - v) & 0xFFFF
	end, 2 }
	pokes[#pokes + 1] = { 2, frames, P + 0x18, function(sp)
		if not im_fenster(cb + 1) then return rd16(sp, P + 0x18) end
		return 0
	end, 2 }
end
if h or fern_h then
	pokes[#pokes + 1] = { 2, frames, P + 0x12, function(sp)
		local f = cb + 1
		if not im_fenster(f) then return rd16(sp, P + 0x12) end
		local v = (f <= start + fern and fern_h) or h or 0
		return v & 0xFFFF
	end, 2 }
	pokes[#pokes + 1] = { 2, frames, P + 0x14, function(sp)
		if not im_fenster(cb + 1) then return rd16(sp, P + 0x14) end
		return 0
	end, 2 }
end
if vor_von then
	vor_von, vor_bis = tonumber(vor_von), tonumber(vor_bis)
	local S = 0xFFBC90 + vor_slot * 0xC0
	if vor_dx then
		pokes[#pokes + 1] = { vor_von, vor_bis, P + 0x0E, function(sp) return (rd16(sp, S + 0x0E) - vor_dx) & 0xFFFF end, 2 }
	end
	if vor_dz then
		pokes[#pokes + 1] = { vor_von, vor_bis, P + 0x16, function(sp) return (rd16(sp, S + 0x16) - vor_dz) & 0xFFFF end, 2 }
	end
end

local save_states = {}
local sf, sn = (os.getenv("CC_SAVE") or ""):match("^(%d+):(.+)$")
if sf then save_states[tonumber(sf)] = sn end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = save_states,
	watch = {
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
		{ name = "kamera_x", addr = 0xFFA82E, size = 2 },
		{ name = "kamera_y", addr = 0xFFA830, size = 2, signed = true },
	},
	dump = { start = 0xFFA900, stop = 0xFFEA00, from = dump_ab, to = frames, every = 1 },
}
