-- boss_v_frei.lua – Gegenprüfer V6 (Präfix boss_v) zu „Boss DOLG“ der Stage 1.
-- Unabhängig von boss_frei.lua geschrieben: freie Eingaben und Eingriffe aus
-- Umgebungsvariablen, Protokoll nur über das Watch-CSV (kein RAM-Abzug, außer
-- mit CC_DUMP=1). Ausgewertet mit scripts/messen_boss_v.py.
--
--   cd research/captcomm
--   CC_NAME=boss_v_x CC_IN="2-40:r;50-51:a" CC_FRAMES=300 \
--       scripts/run.sh scripts/scenarios/boss_v_frei.lua boss_v_b1_s1_cam01984
--
-- Ausgangslagen: eigene Bot-Savestates boss_v_b1_s1_cam* und boss_v_allein
-- (scripts/grafik/bot.sh mit scenarios/boss_v_bot.lua ab "ingame", siehe
-- belege_boss.sh, Teil V) und daraus abgeleitete Savestates boss_v_* (CC_SAVE).
-- Kalibriert: ab boss_v_b1_s1_cam01984 mit Rechtslauf ab Frame 2 erreicht die
-- Kamera 2048 in Frame 39, LP und Max-LP des Bosses (Slot 19) stehen ab Frame
-- 40 (ab boss_v_b1_s1_cam01920 mit hoch 2-20, rechts ab 21: 95 bzw. 96). Ab
-- boss_v_allein (Boss 97 LP, beide Arena-WOOKY tot, Kamera 2112) beginnt mit
-- der Figur bei x 2250 (Frame 2, Rang 12) der erste Ansturm in 57 (Lauf ab 77),
-- der erste Armschwung in 381, die erste Körperpresse in 1474.
--
-- Variablen ohne Eingriff:
--   CC_FRAMES   Laufzeit (Standard 600)
--   CC_IN       Eingaben "von-bis:taste+taste;..." (Tasten l r u d a j oder
--               Namen wie p1_attack); "f:taste" gilt für einen Frame
--   CC_SAVE     Savestates "frame:name,..." (nur Namen mit boss_v_)
--   CC_DUMP=1   zusätzlich RAM-Abzug FFA900–FFEA00 je Frame
--   CC_SNAP     Bildschirmfotos "frame:name,..." (logs/raw/snap/)
--   CC_A        Bezugsframe A: "off:breite:wert[:k]" – k-ter Frame (Standard 1),
--               in dem das Feld S+off des Bosses (off hex, Breite 1, 2 oder 4)
--               auf den Wert (hex mit 0x) wechselt. A steht nach dem Lauf in
--               <CC_NAME>_a.txt. Eingriffe mit "A+von-A+bis".
-- EINGRIFFE (nur wenn gesetzt, außer CC_LP; in jeder Ergebnistabelle genannt):
--   CC_LP       LP der Figur vor jedem Frame auf 72 (Standard 1; 0 = aus)
--   CC_RANG     Rang FFF82A: "r" ab Frame 2 oder "r:von-bis;r:von-bis"
--   CC_BLP      LP des Bosses (S+0x40 und Vorframe S+0x42): "wert:von-bis"
--   CC_FIG      Figur relativ zum Boss: "dx:dz:von-bis;..." setzt x(Figur) =
--               x(Boss) + dx und Tiefe(Figur) = Tiefe(Boss) + dz (Nachkomma 0).
--               dz "-" lässt die Tiefe unverändert. von/bis als Frame oder
--               "A+n"
--   CC_FIGV     wie CC_FIG, aber dx in Blickrichtung des Bosses (S+0x5E Bit
--               0x20 = Blick rechts): d > 0 = vor ihm, d < 0 = hinter ihm
--   CC_FIGA     Figur relativ zu ihrer eigenen Lage im Frame A: "dx:dz:von-bis"
--               (dx in Blickrichtung des Bosses in A)
--   CC_FIGH     Höhe der Figur "h:von-bis" (S+0x12 := h, Nachkomma 0)
--   CC_BOSS     Boss relativ zur Figur: "dx:dz:von-bis;..." (x(Boss) =
--               x(Figur) + dx, Tiefe entsprechend)
--   CC_SETZ     absolute Lage "b:x:z:von-bis;p:x:z:von-bis" (b = Boss, p =
--               Figur; z "-" lässt die Tiefe unverändert; Nachkomma 0)
--   CC_ENTF     Gegner entfernen: "slot,slot:von-bis" (S+4 := 0)
--   CC_POKE     beliebige Adresse "addr:wert:breite:von-bis;..." (hex)
local function env(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return v end

local P = 0xFFA990
local B = 0xFFBC90 + 19 * 0xC0
local frames = tonumber(env("CC_FRAMES", "600"))

-- Eingaben
local KURZ = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }
local inputs = {}
for item in env("CC_IN", ""):gmatch("[^;]+") do
	local von, bis, keys = item:match("^(%d+)%-(%d+):(.+)$")
	if not von then von, keys = item:match("^(%d+):(.+)$"); bis = von end
	local list = {}
	for k in keys:gmatch("[^+]+") do list[#list + 1] = KURZ[k] or k end
	inputs[#inputs + 1] = { tonumber(von), tonumber(bis), list }
end

local save_states = {}
for item in env("CC_SAVE", ""):gmatch("[^,]+") do
	local f, nm = item:match("^(%d+):(.+)$")
	assert(nm:match("^boss_v_"), "Savestate-Namen nur mit boss_v_")
	save_states[tonumber(f)] = nm
end

-- Bezugsframe A
local A = 0
local a_off, a_br, a_wert, a_k
do
	local s = env("CC_A", "")
	if s ~= "" then
		local o, b, w, k = s:match("^(%w+):(%d):(%w+):?(%d*)$")
		a_off, a_br, a_wert, a_k = tonumber(o, 16), tonumber(b), tonumber(w), tonumber(k ~= "" and k or "1")
	end
end
local a_alt, a_zahl = nil, 0

-- Zeitfenster "von-bis" mit Frames oder A+n
local function fenster(s)
	local v, b = s:match("^(.-)%-(A?%+?%d+)$")
	local function wert(t)
		local n = t:match("^A%+(%d+)$")
		if n then return { rel = true, n = tonumber(n) } end
		return { rel = false, n = tonumber(t) }
	end
	return wert(v), wert(b)
end
local function im_fenster(v, b, f)
	local function abs(w) if w.rel then return (A > 0) and (A + w.n) or nil end; return w.n end
	local av, ab = abs(v), abs(b)
	return av ~= nil and ab ~= nil and f >= av and f <= ab
end

local function liste(name)
	local out = {}
	for item in env(name, ""):gmatch("[^;]+") do out[#out + 1] = item end
	return out
end

local rang = {}
for _, item in ipairs(liste("CC_RANG")) do
	local r, fe = item:match("^(%d+):(.+)$")
	if r then local v, b = fenster(fe); rang[#rang + 1] = { tonumber(r), v, b }
	else rang[#rang + 1] = { tonumber(item), { rel = false, n = 2 }, { rel = false, n = frames } } end
end
local blp = {}
for _, item in ipairs(liste("CC_BLP")) do
	local w, fe = item:match("^(%-?%d+):(.+)$"); local v, b = fenster(fe)
	blp[#blp + 1] = { tonumber(w), v, b }
end
local fig = {}
for _, item in ipairs(liste("CC_FIG")) do
	local dx, dz, fe = item:match("^(%-?%d+):([%-%d]+):(.+)$"); local v, b = fenster(fe)
	fig[#fig + 1] = { tonumber(dx), tonumber(dz), v, b }
end
local figv = {}
for _, item in ipairs(liste("CC_FIGV")) do
	local dx, dz, fe = item:match("^(%-?%d+):([%-%d]+):(.+)$"); local v, b = fenster(fe)
	figv[#figv + 1] = { tonumber(dx), tonumber(dz), v, b }
end
local figa = {}
for _, item in ipairs(liste("CC_FIGA")) do
	local dx, dz, fe = item:match("^(%-?%d+):([%-%d]+):(.+)$"); local v, b = fenster(fe)
	figa[#figa + 1] = { tonumber(dx), tonumber(dz), v, b }
end
local a_lage = nil -- x, Tiefe der Figur und Blick des Bosses in A
local figh = {}
for _, item in ipairs(liste("CC_FIGH")) do
	local h, fe = item:match("^(%d+):(.+)$"); local v, b = fenster(fe)
	figh[#figh + 1] = { tonumber(h), v, b }
end
local boss = {}
for _, item in ipairs(liste("CC_BOSS")) do
	local dx, dz, fe = item:match("^(%-?%d+):([%-%d]+):(.+)$"); local v, b = fenster(fe)
	boss[#boss + 1] = { tonumber(dx), tonumber(dz), v, b }
end
local setz = {}
for _, item in ipairs(liste("CC_SETZ")) do
	local wer, x, z, fe = item:match("^([bp]):(%d+):([%-%d]+):(.+)$"); local v, b = fenster(fe)
	setz[#setz + 1] = { wer == "b" and B or P, tonumber(x), tonumber(z), v, b }
end
local entf = {}
for _, item in ipairs(liste("CC_ENTF")) do
	local sl, fe = item:match("^([%d,]+):(.+)$"); local v, b = fenster(fe)
	local slots = {}
	for s in sl:gmatch("%d+") do slots[#slots + 1] = tonumber(s) end
	entf[#entf + 1] = { slots, v, b }
end
local poke = {}
for _, item in ipairs(liste("CC_POKE")) do
	local a, w, br, fe = item:match("^(%x+):(%-?%x+):(%d):(.+)$"); local v, b = fenster(fe)
	poke[#poke + 1] = { tonumber(a, 16), tonumber(w), tonumber(br), v, b }
end
local lp_an = env("CC_LP", "1") ~= "0"

local function lies(sp, adr, br)
	if br == 1 then return sp:read_u8(adr) elseif br == 4 then return sp:read_u32(adr) end
	return sp:read_u16(adr)
end
local function schreib(sp, adr, w, br)
	if br == 1 then sp:write_u8(adr, w & 0xFF) else sp:write_u16(adr, w & 0xFFFF) end
end

-- Alle Eingriffe in einer Funktion: der Runner ruft sie in jedem Callback
-- (Frame f) für Frame f+1 auf, nachdem er Frame f protokolliert hat.
local cb = 0
local function eingriffe(sp)
	cb = cb + 1
	local f = cb -- gerade protokollierter Frame
	if a_off and A == 0 then
		local w = lies(sp, B + a_off, a_br)
		if w == a_wert and a_alt ~= nil and a_alt ~= a_wert then
			a_zahl = a_zahl + 1
			if a_zahl == a_k then
				A = f
				a_lage = { sp:read_u16(P + 0x0E), sp:read_u16(P + 0x16), (sp:read_u8(B + 0x5E) & 0x20) ~= 0 and 1 or -1 }
			end
		end
		a_alt = w
	end
	local t = f + 1 -- Zielframe der Eingriffe
	if lp_an then sp:write_u16(P + 0x40, 72) end
	for _, e in ipairs(rang) do if im_fenster(e[2], e[3], t) then sp:write_u8(0xFFF82A, e[1]) end end
	for _, e in ipairs(blp) do
		if im_fenster(e[2], e[3], t) then schreib(sp, B + 0x40, e[1], 2); schreib(sp, B + 0x42, e[1], 2) end
	end
	for _, e in ipairs(entf) do
		if im_fenster(e[2], e[3], t) then
			for _, s in ipairs(e[1]) do sp:write_u8(0xFFBC90 + s * 0xC0 + 4, 0) end
		end
	end
	-- absolute Lagen zuerst, damit relative Eingriffe im selben Frame darauf aufbauen
	for _, e in ipairs(setz) do
		if im_fenster(e[4], e[5], t) then
			sp:write_u16(e[1] + 0x0E, e[2]); sp:write_u16(e[1] + 0x10, 0)
			if e[3] then sp:write_u16(e[1] + 0x16, e[3]); sp:write_u16(e[1] + 0x18, 0) end
		end
	end
	for _, e in ipairs(fig) do
		if im_fenster(e[3], e[4], t) then
			sp:write_u16(P + 0x0E, (sp:read_u16(B + 0x0E) + e[1]) & 0xFFFF); sp:write_u16(P + 0x10, 0)
			if e[2] then sp:write_u16(P + 0x16, (sp:read_u16(B + 0x16) + e[2]) & 0xFFFF); sp:write_u16(P + 0x18, 0) end
		end
	end
	for _, e in ipairs(figv) do
		if im_fenster(e[3], e[4], t) then
			local r = (sp:read_u8(B + 0x5E) & 0x20) ~= 0 and 1 or -1
			sp:write_u16(P + 0x0E, (sp:read_u16(B + 0x0E) + r * e[1]) & 0xFFFF); sp:write_u16(P + 0x10, 0)
			if e[2] then sp:write_u16(P + 0x16, (sp:read_u16(B + 0x16) + e[2]) & 0xFFFF); sp:write_u16(P + 0x18, 0) end
		end
	end
	for _, e in ipairs(figa) do
		if a_lage and im_fenster(e[3], e[4], t) then
			sp:write_u16(P + 0x0E, (a_lage[1] + a_lage[3] * e[1]) & 0xFFFF); sp:write_u16(P + 0x10, 0)
			if e[2] then sp:write_u16(P + 0x16, (a_lage[2] + e[2]) & 0xFFFF); sp:write_u16(P + 0x18, 0) end
		end
	end
	for _, e in ipairs(figh) do
		if im_fenster(e[2], e[3], t) then sp:write_u16(P + 0x12, e[1]); sp:write_u16(P + 0x14, 0) end
	end
	for _, e in ipairs(boss) do
		if im_fenster(e[3], e[4], t) then
			sp:write_u16(B + 0x0E, (sp:read_u16(P + 0x0E) + e[1]) & 0xFFFF); sp:write_u16(B + 0x10, 0)
			if e[2] then sp:write_u16(B + 0x16, (sp:read_u16(P + 0x16) + e[2]) & 0xFFFF); sp:write_u16(B + 0x18, 0) end
		end
	end
	for _, e in ipairs(poke) do if im_fenster(e[4], e[5], t) then schreib(sp, e[1], e[2], e[3]) end end
	return sp:read_u8(0xFFF82A) -- unverändert zurückschreiben
end

-- Watch: Figur, Rang, Kamera, Boss (Slot 19), Slots 0–18 knapp
local watch = {
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "zaehl", addr = 0xFFF82C, size = 2 },
	{ name = "camx", addr = 0xFFA82E, size = 2 },
	{ name = "stage", addr = 0xFFA8CE, size = 1 },
	{ name = "p_st", addr = P + 0x04, size = 2 },
	{ name = "p_akt", addr = P + 0x0A, size = 2 },
	{ name = "p_ph", addr = P + 0x0C, size = 2 },
	{ name = "p_x", addr = P + 0x0E, size = 2 },
	{ name = "p_xf", addr = P + 0x10, size = 2 },
	{ name = "p_h", addr = P + 0x12, size = 2, signed = true },
	{ name = "p_hf", addr = P + 0x14, size = 2 },
	{ name = "p_z", addr = P + 0x16, size = 2 },
	{ name = "p_anim", addr = P + 0x1C, size = 4 },
	{ name = "p_lp", addr = P + 0x40, size = 2, signed = true },
	{ name = "p_blick", addr = P + 0x5E, size = 1 },
	{ name = "p_griff", addr = 0xFFA999, size = 1 },
	{ name = "p_ang", addr = 0xFFAA12, size = 2 },
	{ name = "p_halter", addr = P + 0x70, size = 2 },
	{ name = "kombo", addr = 0xFFAA2D, size = 1 },
	{ name = "t61", addr = 0xFFAA61, size = 1 },
	{ name = "t69", addr = 0xFFAA69, size = 1 },
	{ name = "waffe", addr = 0xFFAA09, size = 1 },
	{ name = "b_st", addr = B + 0x04, size = 2 },
	{ name = "b_akt", addr = B + 0x0A, size = 2 },
	{ name = "b_ph", addr = B + 0x0C, size = 2 },
	{ name = "b_x", addr = B + 0x0E, size = 2 },
	{ name = "b_xf", addr = B + 0x10, size = 2 },
	{ name = "b_h", addr = B + 0x12, size = 2, signed = true },
	{ name = "b_hf", addr = B + 0x14, size = 2 },
	{ name = "b_z", addr = B + 0x16, size = 2 },
	{ name = "b_anim", addr = B + 0x1C, size = 4 },
	{ name = "b_att", addr = B + 0x24, size = 2 },
	{ name = "b_fl", addr = B + 0x28, size = 2 },
	{ name = "b_typ", addr = B + 0x38, size = 4 },
	{ name = "b_lp", addr = B + 0x40, size = 2, signed = true },
	{ name = "b_lp0", addr = B + 0x42, size = 2, signed = true },
	{ name = "b_blick", addr = B + 0x5E, size = 1 },
	{ name = "b_dmg", addr = B + 0x8B, size = 1 },
	{ name = "b_96", addr = B + 0x96, size = 2, signed = true },
	{ name = "b_9a", addr = B + 0x9A, size = 2 },
	{ name = "b_ae", addr = B + 0xAE, size = 1 },
	{ name = "b_b7", addr = B + 0xB7, size = 1 },
}
for n = 0, 18 do
	local S = 0xFFBC90 + n * 0xC0
	watch[#watch + 1] = { name = string.format("s%d_st", n), addr = S + 0x04, size = 2 }
	watch[#watch + 1] = { name = string.format("s%d_typ", n), addr = S + 0x3A, size = 2 }
	watch[#watch + 1] = { name = string.format("s%d_lp", n), addr = S + 0x40, size = 2, signed = true }
	watch[#watch + 1] = { name = string.format("s%d_x", n), addr = S + 0x0E, size = 2 }
end
-- Spalte A (Bezugsframe) über ein Pseudo-Watch: Adresse wird nicht gelesen,
-- daher als eigene Datei <CC_NAME>_a.txt am Ende geschrieben (siehe unten)

local snaps = {}
for item in env("CC_SNAP", ""):gmatch("[^,]+") do
	local f, nm = item:match("^(%d+):(.+)$")
	snaps[tonumber(f)] = nm
end
local sc = {
	frames = frames,
	snaps = snaps,
	inputs = inputs,
	watch = watch,
	save_states = save_states,
	pokes = { { 2, frames, 0xFFF82A, eingriffe, 1 } },
}
if env("CC_DUMP", "0") == "1" then
	sc.dump = { start = 0xFFA900, stop = 0xFFEA00 }
end
-- A am Ende festhalten: über einen zweiten Notifier wäre die Reihenfolge
-- unklar; stattdessen schreibt die Eingriffsfunktion A in eine Datei, sobald
-- es feststeht.
if a_off then
	local out = assert(os.getenv("CC_OUT"))
	local orig = eingriffe
	local geschrieben = false
	sc.pokes[1][4] = function(sp)
		local v = orig(sp)
		if A > 0 and not geschrieben then
			local fh = assert(io.open(out .. "_a.txt", "w")); fh:write(string.format("%d\n", A)); fh:close()
			geschrieben = true
		end
		return v
	end
end
return sc
