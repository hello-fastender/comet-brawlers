-- boss_frei.lua: Boss DOLG der Stage 1 (Typ 0x46DA4) messen (Auftrag M6,
-- Praefix "boss"). Laeuft ab einem Savestate der Bossarena, Standard
-- p0_s1_s1_cam02048 (Phase 0, Bot-Lauf mit EINGRIFF: LP der Figur aufgefuellt,
-- bei Stillstand LP der Gegner auf 1; DOLG in Slot 19, Rang 16, zwei WOOKY
-- erscheinen in Frame 3 in Slot 16/17). Fuer Teil A auch ab p0_s1_s1_cam01793
-- und p0_s1_s1_cam01536 (vor der Arena), fuer Rakete und Laser ab
-- item_missile/item_laser; die dritte Messung (Teil M) meist ab boss_q_m (Rang
-- 20, Boss in Tiefe 208). Protokoll nur ueber das Watch-CSV (Figur, Boss-Slot,
-- alle Gegnerslots kurz), kein RAM-Abzug. Auswertung: scripts/messen_boss.py,
-- alle Laeufe in scripts/belege_boss.sh.
--
-- Variablen (Eingaben, keine Eingriffe):
--   CC_FRAMES  Laufzeit (Standard 1500)
--   CC_IN      Eingaben "a-b:taste+taste;c:taste" (ohne -b: a und a+1).
--              Tasten: p1_left/right/up/down/attack/jump oder kurz l r u d a j
--   CC_BOT=angriff  einfacher Angreifer (siehe unten), CC_BOT_AB, CC_BOT_TAKT,
--              CC_BOT_KETTE
--   CC_BOSS    Slot des Bosses (Standard 19)
--   CC_SAVE    "frame:name[,frame:name]" legt dort Savestates an (nur boss_*)
--   CC_SNAPS   "von-bis:schritt" Bildschirmaufnahmen (Teil G)
--   CC_DUMP    "von-bis": RAM-Abzug 0xFFA900-0xFFEA00 (nur zur Erkundung)
--   CC_AB      Bezugsframe A fuer CC_FIG: "n:ANIM[|ANIM]" = n-ter Frame (ab
--              Frame CC_AB_MIN, Standard 1), in dem der Animationszeiger S+0x1C
--              des Bosses (hex, 6 Stellen) auf eine der Animationen wechselt;
--              oder eine feste Frame-Nummer. Bis A bleibt der Lauf natuerlich,
--              der Boss waehlt seinen Angriff selbst.
-- EINGRIFFE (alle optional, im Entwurf je Lauf genannt):
--   CC_LP=1    (Standard 1) LP der Figur P+0x40 vor jedem Frame auf 72: ein
--              Treffer ist ein Frame, der mit weniger als 72 endet (Schaden =
--              72 - LP). 0 = aus
--   CC_RANG    Rang FFF82A ab Frame 2 vor jedem Frame festhalten; mit CC_RANG2
--              ab Frame CC_RANG2_AB auf einen zweiten Wert
--   CC_WEG     Slots ("16,17"), die ab Frame 2 vor jedem Frame bei
--              x = Kamera-x - 250 (ausserhalb des Bildes, S+5 = 0) gehalten
--              werden (die Arena-WOOKY; sie leben weiter). "neu" haelt
--              zusaetzlich jeden spaeter erscheinenden Gegner (Slot 0-18, Typ
--              nicht DOLG) dort
--   CC_ENTF    Slots, die in Frame CC_ENTF_AB (Standard 2) per S+4 := 0 entfernt
--              werden (ohne Tod); CC_ENTF2/CC_ENTF2_AB ein zweiter Zeitpunkt,
--              dort auch "typ:HEX" (alle Slots dieses Typs, z. B. typ:60CA0)
--   CC_BLP     "f:w[,f:w]" LP des Bosses (S+0x40 und Vorframe S+0x42) vor
--              Frame f auf w
--   CC_GLP     "f:slot:w" LP eines anderen Slots vor Frame f auf w
--   CC_FIG     "von-bis:dx:dz[:h][;...]" Figur relativ zum Boss:
--              x(Figur) = x(Boss) - dx, z(Figur) = z(Boss) - dz (Nachkomma 0),
--              Hoehe h. "_" laesst eine Achse frei. Mit CC_AB zaehlen von/bis
--              ab A (A+von bis A+bis), sonst absolut
--   CC_BSET    "von-bis:dx:dz[;...]" Boss relativ zur Figur (absolute Frames):
--              x(Boss) = x(Figur) + dx, z(Boss) = z(Figur) + dz (Nachkomma 0)
--   CC_SSET    "slot:von-bis:dx:dz[;...]" anderer Slot relativ zur Figur
--   CC_BX      "von-bis:x" Boss auf feste Welt-x
-- Zeitbezug wie runner.lua: Eingriffe fuer Frame f werden im Callback von
-- Frame f-1 geschrieben und sehen den Zustand am Ende von Frame f-1.
-- Kalibriert (ab p0_s1_s1_cam02048, Figur passiv, CC_WEG=16,17,neu): der Boss
-- bricht in Frame 1-61 aus dem Tresor (Aktion 0x0A), geht ab 62; erster
-- Armschwung A = 157 (Treffer auf die Figur in 174, 212, 249). Mit
-- CC_BSET="62-63:50:0" (Boss 50 px vor der Figur) beginnt er in Frame 66 den
-- kurzen Schlag; ein Schlag mit Druck in 64 trifft ihn in 66. Bei 49 px und
-- weniger packt er die Figur in Frame 63.
local frames = tonumber(os.getenv("CC_FRAMES") or "1500")
local boss = tonumber(os.getenv("CC_BOSS") or "19")
local P = 0xFFA990
local function SL(n) return 0xFFBC90 + n * 0xC0 end
local B = SL(boss)
local KURZ = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }

local inputs = {}
for item in (os.getenv("CC_IN") or ""):gmatch("[^;]+") do
	local a, b, keys = item:match("^%s*(%d+)%-?(%d*):(.+)$")
	assert(a, "CC_IN: " .. item)
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = KURZ[k] or k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local function s16(v) if v >= 0x8000 then return v - 0x10000 end return v end

-- Bezugsframe A (Animationswechsel des Bosses)
local start = tonumber(os.getenv("CC_AB") or "")
local ab_n, ab_list = (os.getenv("CC_AB") or ""):match("^(%d+):([%x|]+)$")
local ab_set = {}
if ab_list then
	ab_n = tonumber(ab_n)
	for a in ab_list:gmatch("%x+") do ab_set[tonumber(a, 16)] = true end
end
local ab_min = tonumber(os.getenv("CC_AB_MIN") or "1")
local seen, last_anim, cb = 0, nil, 0
-- wird als erster Eingriff je Frame aufgerufen (Zustand am Ende von Frame cb)
local function tick(sp)
	cb = cb + 1
	if start or not ab_list then return end
	local a = sp:read_u32(B + 0x1C) & 0xFFFFFF
	if ab_set[a] and last_anim ~= a and cb >= ab_min then
		seen = seen + 1
		if seen == ab_n then start = cb end
	end
	last_anim = a
end

local pokes = {}
local lp_an = (os.getenv("CC_LP") or "1") ~= "0"
pokes[#pokes + 1] = { 2, frames, P + 0x40, function(sp)
	tick(sp)
	if lp_an then return 72 end
	return sp:read_u16(P + 0x40)
end, 2 }

local rang = tonumber(os.getenv("CC_RANG") or "")
local rang2 = tonumber(os.getenv("CC_RANG2") or "")
local rang2_ab = tonumber(os.getenv("CC_RANG2_AB") or tostring(frames + 1))
if rang then pokes[#pokes + 1] = { 2, math.min(frames, rang2_ab - 1), 0xFFF82A, rang } end
if rang2 then pokes[#pokes + 1] = { rang2_ab, frames, 0xFFF82A, rang2 } end

-- Gegner wegsetzen
local weg = os.getenv("CC_WEG") or ""
local weg_slots, weg_neu = {}, false
for t in weg:gmatch("[^,]+") do
	if t == "neu" then weg_neu = true else weg_slots[tonumber(t)] = true end
end
local DOLG = 0x46DA4
for n = 0, 19 do
	if n ~= boss and (weg_slots[n] or weg_neu) then
		local S = SL(n)
		local fest = weg_slots[n]
		pokes[#pokes + 1] = { 2, frames, S + 0x0E, function(sp)
			local x = sp:read_u16(S + 0x0E)
			if sp:read_u8(S + 4) == 0 then return x end
			if not fest and sp:read_u32(S + 0x38) == DOLG then return x end
			if not fest and sp:read_u32(S + 0x38) == 0 then return x end
			return (sp:read_u16(0xFFA82E) - 250) & 0xFFFF
		end, 2 }
	end
end

-- CC_ENTF "slot[,slot]": Slots in Frame CC_ENTF_AB (Standard 2) per S+4 := 0
-- entfernen (ohne Tod; wie verhalten.lua)
local entf_ab = tonumber(os.getenv("CC_ENTF_AB") or "2")
for t in (os.getenv("CC_ENTF") or ""):gmatch("%d+") do
	pokes[#pokes + 1] = { entf_ab, entf_ab, SL(tonumber(t)) + 4, 0 }
end
-- CC_ENTF2 wie CC_ENTF, zweiter Zeitpunkt CC_ENTF2_AB; "typ:HEX" entfernt
-- dort alle Slots 0-18 mit dieser Typkennung S+0x38 (z. B. typ:60CA0 = EDDY)
local entf2_ab = tonumber(os.getenv("CC_ENTF2_AB") or "100")
local entf2 = os.getenv("CC_ENTF2") or ""
local entf2_typ = entf2:match("^typ:(%x+)$")
if entf2_typ then
	local typ = tonumber(entf2_typ, 16)
	pokes[#pokes + 1] = { entf2_ab, entf2_ab, 0xFFFF00, function(sp)
		for n = 0, 18 do
			if n ~= boss and sp:read_u32(SL(n) + 0x38) == typ and sp:read_u8(SL(n) + 4) ~= 0 then
				sp:write_u8(SL(n) + 4, 0)
			end
		end
		return sp:read_u8(0xFFFF00)
	end }
else
	for t in entf2:gmatch("%d+") do
		pokes[#pokes + 1] = { entf2_ab, entf2_ab, SL(tonumber(t)) + 4, 0 }
	end
end
for item in (os.getenv("CC_BLP") or ""):gmatch("[^,]+") do
	local f, w = item:match("^(%d+):(%-?%d+)$")
	f, w = tonumber(f), tonumber(w)
	pokes[#pokes + 1] = { f, f, B + 0x40, w & 0xFFFF, 2 }
	pokes[#pokes + 1] = { f, f, B + 0x42, w & 0xFFFF, 2 }
end
for item in (os.getenv("CC_GLP") or ""):gmatch("[^,]+") do
	local f, n, w = item:match("^(%d+):(%d+):(%-?%d+)$")
	f, n, w = tonumber(f), tonumber(n), tonumber(w)
	pokes[#pokes + 1] = { f, f, SL(n) + 0x40, w & 0xFFFF, 2 }
	pokes[#pokes + 1] = { f, f, SL(n) + 0x42, w & 0xFFFF, 2 }
end

-- Figur relativ zum Boss
local function in_fenster(f, von, bis)
	if ab_list or tonumber(os.getenv("CC_AB") or "") then
		return start ~= nil and f >= start + von and f <= start + bis
	end
	return f >= von and f <= bis
end
for item in (os.getenv("CC_FIG") or ""):gmatch("[^;]+") do
	local von, bis, dx, dz, h = item:match("^(%-?%d+)%-(%d+):([%-_%d]+):([%-_%d]+):?([%-_%d]*)$")
	assert(von, "CC_FIG: " .. item)
	von, bis, dx, dz, h = tonumber(von), tonumber(bis), tonumber(dx), tonumber(dz), tonumber(h)
	local function setz(off, quelle)
		pokes[#pokes + 1] = { 2, frames, P + off, function(sp)
			if not in_fenster(cb + 1, von, bis) then return sp:read_u16(P + off) end
			return quelle(sp)
		end, 2 }
	end
	if dx then
		setz(0x0E, function(sp) return (sp:read_u16(B + 0x0E) - dx) & 0xFFFF end)
		setz(0x10, function(sp) return 0 end)
	end
	if dz then
		setz(0x16, function(sp) return (sp:read_u16(B + 0x16) - dz) & 0xFFFF end)
		setz(0x18, function(sp) return 0 end)
	end
	if h then
		setz(0x12, function(sp) return h & 0xFFFF end)
		setz(0x14, function(sp) return 0 end)
	end
end
-- Boss relativ zur Figur bzw. auf feste x
for item in (os.getenv("CC_BSET") or ""):gmatch("[^;]+") do
	local von, bis, dx, dz = item:match("^(%d+)%-(%d+):([%-_%d]+):([%-_%d]+)$")
	assert(von, "CC_BSET: " .. item)
	von, bis, dx, dz = tonumber(von), tonumber(bis), tonumber(dx), tonumber(dz)
	if dx then
		pokes[#pokes + 1] = { von, bis, B + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + dx) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, B + 0x10, 0, 2 }
	end
	if dz then
		pokes[#pokes + 1] = { von, bis, B + 0x16, function(sp) return (sp:read_u16(P + 0x16) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, B + 0x18, 0, 2 }
	end
end
-- anderer Slot relativ zur Figur (z. B. ein WOOKY fuer die Stufen 1-3)
for item in (os.getenv("CC_SSET") or ""):gmatch("[^;]+") do
	local n, von, bis, dx, dz = item:match("^(%d+):(%d+)%-(%d+):([%-_%d]+):([%-_%d]+)$")
	assert(n, "CC_SSET: " .. item)
	local S = SL(tonumber(n))
	von, bis, dx, dz = tonumber(von), tonumber(bis), tonumber(dx), tonumber(dz)
	if dx then
		pokes[#pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + dx) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	end
	if dz then
		pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P + 0x16) + dz) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
end
for item in (os.getenv("CC_BX") or ""):gmatch("[^;]+") do
	local von, bis, x = item:match("^(%d+)%-(%d+):(%d+)$")
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), B + 0x0E, tonumber(x), 2 }
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), B + 0x10, 0, 2 }
end

-- CC_BOT=angriff: einfacher Angreifer fuer Teil E (keine feste Eingabefolge).
-- Ab Frame CC_BOT_AB (Standard 62) entscheidet er in jedem Frame neu, nur wenn
-- die Figur frei ist (P+4 = 1, Aktion 0): Tiefe angleichen (|dz| <= 3), dann
-- in x auf einen Abstand von 55 bis 75 px zum Boss gehen (auf der Seite, auf
-- der die Figur steht), zum Boss drehen und einmal schlagen (2 Frames), danach
-- CC_BOT_TAKT Frames (Standard 20) Pause. Die Eingaben wirken zwei Frames nach
-- der Entscheidung (Runner setzt sie einen Callback vorher) und stehen im
-- _inputs.csv. Kein Eingriff, nur Eingaben.
local bot = os.getenv("CC_BOT") or ""
local inputs_out = inputs
if bot == "angriff" then
	local dyn = {}
	inputs_out[#inputs_out + 1] = { 1, frames, dyn }
	local bot_ab = tonumber(os.getenv("CC_BOT_AB") or "62")
	local takt = tonumber(os.getenv("CC_BOT_TAKT") or "20")
	local kette = tonumber(os.getenv("CC_BOT_KETTE") or "0")
	local folge = nil
	local naechster = 0
	local function setz(names)
		for i = #dyn, 1, -1 do dyn[i] = nil end
		for _, n in ipairs(names) do dyn[#dyn + 1] = n end
	end
	pokes[#pokes + 1] = { 2, frames, 0xFFFF00, function(sp)
		local f = cb
		local wert = sp:read_u8(0xFFFF00)
		if f < bot_ab then setz({}) return wert end
		-- Kettendruck: CC_BOT_KETTE Frames nach dem ersten Druck ein zweiter
		-- Druck, unabhaengig vom Zustand (Stufe 2, wenn der erste traf)
		if folge and f == folge then setz({ "P1 Button 1" }) folge = nil return wert end
		local pst, pakt = sp:read_u8(P + 4), sp:read_u16(P + 0x0A)
		if pst ~= 1 or pakt ~= 0 or f < naechster then setz({}) return wert end
		local dx = s16(sp:read_u16(B + 0x0E)) - s16(sp:read_u16(P + 0x0E))
		local dz = s16(sp:read_u16(B + 0x16)) - s16(sp:read_u16(P + 0x16))
		local rechts = sp:read_u8(P + 0x5E) == 0x20
		local zum_boss = dx >= 0 and "P1 Right" or "P1 Left"
		local weg = dx >= 0 and "P1 Left" or "P1 Right"
		if dz > 3 then setz({ "P1 Up" })
		elseif dz < -3 then setz({ "P1 Down" })
		elseif math.abs(dx) > 75 then setz({ zum_boss })
		elseif math.abs(dx) < 55 then setz({ weg })
		elseif (dx >= 0) ~= rechts then setz({ zum_boss })
		else
			setz({ "P1 Button 1" })
			naechster = f + takt
			if kette > 0 then folge = f + kette end
		end
		return wert
	end }
end

local save_states = {}
for item in (os.getenv("CC_SAVE") or ""):gmatch("[^,]+") do
	local f, n = item:match("^(%d+):(.+)$")
	assert(n:match("^boss"), "Savestates nur mit Praefix boss")
	save_states[tonumber(f)] = n
end

-- Watch-Spalten: Figur, Boss, alle Gegnerslots kurz
local watch = {
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "zaehler", addr = 0xFFF82C, size = 2 },
	{ name = "camx", addr = 0xFFA82E, size = 2 },
	{ name = "camy", addr = 0xFFA830, size = 2, signed = true },
	{ name = "stage", addr = 0xFFA8CE, size = 1 },
	{ name = "p_st", addr = P + 0x04, size = 2 },
	{ name = "p_09", addr = P + 0x09, size = 1 },
	{ name = "p_akt", addr = P + 0x0A, size = 2 },
	{ name = "p_ph", addr = P + 0x0C, size = 2 },
	{ name = "p_x", addr = P + 0x0E, size = 4 },
	{ name = "p_h", addr = P + 0x12, size = 4, signed = true },
	{ name = "p_z", addr = P + 0x16, size = 4 },
	{ name = "p_anim", addr = P + 0x1C, size = 4 },
	{ name = "p_attr", addr = P + 0x24, size = 2 },
	{ name = "p_lp", addr = P + 0x40, size = 2, signed = true },
	{ name = "p_lpv", addr = P + 0x42, size = 2, signed = true },
	{ name = "p_blick", addr = P + 0x5E, size = 1 },
	{ name = "p_halter", addr = P + 0x70, size = 2 },
	{ name = "p_angr", addr = P + 0x82, size = 2 },
	{ name = "p_kombo", addr = 0xFFAA2D, size = 1 },
	{ name = "p_waffe", addr = 0xFFAA09, size = 1 },
	{ name = "p_mun", addr = 0xFFAA41, size = 1 },
	{ name = "t_liegen", addr = 0xFFAA61, size = 1 },
	{ name = "t_schutz", addr = 0xFFAA69, size = 1 },
	{ name = "punkte", addr = 0xFFAA74, size = 4 },
}
local function bw(name, off, size, signed) watch[#watch + 1] = { name = "b_" .. name, addr = B + off, size = size, signed = signed } end
bw("st", 0x04, 2) bw("08", 0x08, 2) bw("akt", 0x0A, 2) bw("ph", 0x0C, 2)
bw("x", 0x0E, 4) bw("h", 0x12, 4, true) bw("z", 0x16, 4)
bw("anim", 0x1C, 4) bw("attr", 0x24, 2) bw("typ", 0x38, 4)
bw("lp", 0x40, 2, true) bw("lpv", 0x42, 2, true) bw("blick", 0x5E, 1)
bw("82", 0x82, 2) bw("8a", 0x8A, 2) bw("schaden", 0x8B, 1) bw("ziel", 0x96, 2, true) bw("max", 0x9A, 2)
bw("09", 0x09, 1) bw("72", 0x72, 1) bw("b7", 0xB7, 1)
-- S+0x28: Trefferflaeche (0 = nicht trefferbar), S+0xAE: Schutzzaehler; nach
-- dessen Ablauf setzt der naechste Zellenwechsel der Animation S+0x28 wieder
bw("flaeche", 0x28, 2) bw("schutz", 0xAE, 1)
for n = 0, 19 do
	if n ~= boss then
		local S = SL(n)
		watch[#watch + 1] = { name = "s" .. n .. "_st", addr = S + 0x04, size = 2 }
		watch[#watch + 1] = { name = "s" .. n .. "_typ", addr = S + 0x38, size = 4 }
		watch[#watch + 1] = { name = "s" .. n .. "_lp", addr = S + 0x40, size = 2, signed = true }
		watch[#watch + 1] = { name = "s" .. n .. "_x", addr = S + 0x0E, size = 2 }
		watch[#watch + 1] = { name = "s" .. n .. "_attr", addr = S + 0x24, size = 2 }
	end
end

-- CC_SNAPS "von-bis:schritt": Bildschirmaufnahmen (logs/raw/snap/<CC_NAME>_<frame>.png),
-- nur fuer Teil G (Erscheinen des Schriftzugs STAGE 1 CLEAR), werden geloescht
local snaps
local sv, sb, ss = (os.getenv("CC_SNAPS") or ""):match("^(%d+)%-(%d+):(%d+)$")
if sv then
	local name = (os.getenv("CC_OUT") or "boss"):match("([^/]+)$")
	snaps = {}
	for f = tonumber(sv), tonumber(sb), tonumber(ss) do snaps[f] = name end
end

local dump
local dv, db = (os.getenv("CC_DUMP") or ""):match("^(%d+)%-(%d+)$")
if dv then dump = { start = 0xFFA900, stop = 0xFFEA00, from = tonumber(dv), to = tonumber(db), every = 1 } end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = save_states,
	watch = watch,
	dump = dump,
	snaps = snaps,
}
