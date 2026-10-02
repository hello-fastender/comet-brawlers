-- fern_frei.lua – freies Szenario fuer die Fernangriffe der Gegner (Praefix
-- fern): Pistole und Raketenwerfer des DICK, Messerwurf und Messerhagel des
-- SKIP. Alle Eingaben und Eingriffe kommen aus Umgebungsvariablen; die
-- konkreten Laeufe (Savestate, Eingaben, Kalibrierung) stehen in
-- scripts/belege_fern.sh. Abzug FFA900..FFEA00 (Spielerblock, Geschossbloecke
-- der Figur ab FFAD90, Objekt-Slots 0..59) in jedem Frame; Kamera, Rang,
-- Rang-Zaehler und Stage (ausserhalb des Abzugs) im Watch-CSV.
-- Auswertung: scripts/messen_fern.py.
--
-- Variablen:
--   CC_FRAMES  Laufzeit in Frames (Standard 3000)
--   CC_IN      Eingaben "von-bis:taste|taste;...", Tasten right, left, up,
--              down, attack, jump (oder p1_*). Gedrueckt in den Frames von..bis.
--   CC_DUMP    0 = kein Abzug (nur Watch-CSV); CC_DUMP_AB erster Frame des
--              Abzugs (Standard 1)
--   CC_SAVE    "frame:name[,frame:name]" legt dort Savestates an
--   CC_HIN     "N:periode:dauer[:mindest]" Eingabe-Bot (kein Eingriff): in
--              Frames mit (f mod periode) < dauer geht die Figur auf Slot N
--              zu, solange der x-Abstand groesser als mindest (40) ist
--   CC_SNAPS   Frames fuer Snapshots (Pruefung am Bild), Name CC_NAME
-- EINGRIFFE (RAM-Schreibzugriffe vor jedem Frame, alle optional; jeder Lauf,
-- der einen davon setzt, nennt ihn in logs/fern.csv):
--   CC_LP=1    LP der Figur (P+0x40) vor jedem Frame auf 72. Ein Treffer ist
--              dann jeder Frame, der mit weniger als 72 LP endet (Auswertung
--              P+0x40 < P+0x42). Die Figur stirbt so nie.
--   CC_RANG    Rang FFF82A ab Frame 2 vor jedem Frame auf diesem Wert
--   CC_POKES   "von-bis:ADR=wert[:breite];...". ADR ist eine Hex-Adresse,
--              "p+OFF" (Spielerblock FFA990 + OFF, hex) oder "sN+OFF"
--              (Objekt-Slot N, FFBC90 + N*0xC0 + OFF, hex). Breite 1
--              (Standard) oder 2. Der Wert wird vor jedem Frame geschrieben.
--   CC_REL     "von-bis:N:dx:dz;..." setzt Slot N relativ zur Figur:
--              x = x(Figur) + dx, Tiefe = Tiefe(Figur) + dz, Nachkomma 0;
--              "_" laesst eine Achse unveraendert
--   CC_ZU      "von-bis:N:dx:dz;..." setzt die Figur relativ zu Slot N:
--              x = x(N) + dx, Tiefe = Tiefe(N) + dz ("_" laesst eine Achse)
--   CC_FEST    "von-bis:x:z;..." setzt die Figur auf Welt-x und Tiefe
--              ("_" laesst eine Achse unveraendert), Nachkomma 0
--   CC_HOEHE   "von-bis:h;..." setzt die Hoehe der Figur (P+0x12, Nachkomma 0)
--   CC_ENTF    "von-bis:TYP,TYP;...": entfernt in von..bis jeden Gegner (Slot
--              0..19) mit dieser Typkennung S+0x38 (hex) per S+4 := 0 (Slot frei,
--              ohne Tod; wie CC_ENTF in verhalten.lua)
--   CC_ENTF_SLOT "von-bis:N,N;...": setzt S+4 dieser Slots auf 0
-- Ausgeloeste Eingriffe (Bezug auf ein Ereignis statt auf feste Frames):
--   CC_AB      "N:ANIM[:k]": A = k-ter Frame (Standard 1), in dem der
--              Animationszeiger S+0x1C von Slot N auf ANIM (hex) wechselt
--   CC_AB_ZU   "von:bis:dx:dz[:h]": in A+von..A+bis die Figur relativ zum
--              Gegner aus CC_AB setzen (x = x(N) + dx usw., "_" laesst aus)
--   CC_GESCH   "ART:von:bis:dx:dz[:h[:k]]": sobald in Slot 20..59 zum k-ten Mal
--              (Standard 1) ein Objekt neu erscheint, dessen Zeigerwort S+0x6C
--              auf den Schuetzen CC_GESCH_SLOT (Standard: Slot aus CC_AB) zeigt
--              und dessen Typ S+0x38 = ART ist (hex, "_" = jeder), heisst dieser
--              Frame G. In G+von..G+bis wird die Figur vor jedem Frame relativ
--              zum Geschoss gesetzt: x = x(Geschoss) + dx, Tiefe = Tiefe + dz
--              (Nachkomma 0), Hoehe = h (absolut). "_" laesst eine Achse aus.
--              Der Eingriff endet, sobald der Block frei oder anders belegt ist.
--              Da das Geschoss sich im Frame weiterbewegt, liegt die Lage am
--              Frame-Ende um dessen Geschwindigkeit daneben (Auswertung mit den
--              Positionen am Frame-Ende, messen_fern.py probe).
--   CC_GESCH_GEGNER "N:dx:dz": im selben Fenster Slot N (Gegner oder Objekt,
--              z. B. Oelfass 43, Glasscheibe 46) relativ zum Geschoss setzen
-- Kalibrierte Savestates (angelegt von belege_fern.sh, Teil 0; Frames relativ
-- zum Savestate, mit den dort genannten weiterlaufenden Eingriffen):
--   fern_sw9 / fern_sw20  SKIP wirft in A 36 / 46, Messer G 44 / 54 bei x 961,
--              fliegt -x; Figur bei x 900 (bis zum Speichern CC_FEST)
--   fern_sg9   Gruppe (2 WOOKY, 2 EDDY, SKIP), Messer G 45 bei x 1235 (-x)
--   fern_pw9 / fern_pw20  Pistolen-DICK Slot 18, Salve ab A 14 / 22, Kugeln
--              G 20, 37, 54, 71 / 28, 45, 62, 79 ab x 2162 (+x)
--   fern_rw9 / fern_rw20  Raketen-DICK Slot 13 / 10, Rakete G 19 / 17 ab
--              x 2172 (+x), landet G+21
--   fern_pz9   Pistolen-DICK 18 und Raketen-DICK 13, Kugeln G 30, 47, 64, 81
-- Dritte Messung (belege_fern.sh, Block "Dritte Messung M7"):
--   fern_t_sw / fern_t_sw2  SKIP links bzw. rechts, Messer +x bzw. -x (A 10,
--              G 18), Figur fest auf x 1000 bzw. 880, Rang 14 bzw. 17
--   fern_t_pw / fern_t_pw2  Pistolen-DICK rechts (Kugel -x, A 18, G 24, Figur
--              x 2110, Rang 22) bzw. links (+x, A 16, G 22, Rang 14)
--   fern_t_pw3 Salve mit Budget S+0xAB = 120 (A 13, 8 Schuesse +x, Rang 22)
--   fern_t_rw / fern_t_rw2  Raketen-DICK rechts (Rakete -x, A 13, G 19, Figur
--              x 2330, Rang 14) bzw. links (+x, A 14, G 20, Rang 24)
local function env(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return v end

local frames = tonumber(env("CC_FRAMES", "3000"))
local KEYS = { right = "p1_right", left = "p1_left", up = "p1_up", down = "p1_down", attack = "p1_attack", jump = "p1_jump" }

local inputs = {}
for spec in env("CC_IN", ""):gmatch("[^;]+") do
	local a, b, names = spec:match("^%s*(%d+)%-(%d+):(.+)$")
	assert(a, "CC_IN: " .. spec)
	local t = {}
	for nm in names:gmatch("[^|]+") do t[#t + 1] = KEYS[nm] or nm end
	inputs[#inputs + 1] = { tonumber(a), tonumber(b), t }
end

local P = 0xFFA990
local function slot(n) return 0xFFBC90 + n * 0xC0 end
local function addr(s)
	local n, off = s:match("^s(%d+)%+(%x+)$")
	if n then return slot(tonumber(n)) + tonumber(off, 16) end
	off = s:match("^p%+(%x+)$")
	if off then return P + tonumber(off, 16) end
	return tonumber(s, 16)
end
local function rd16(sp, a) return sp:read_u16(a) end

local pokes = {}
-- Frame-Zaehler und Ereignissuche: laeuft als erster Eingriff in jedem Frame
-- (schreibt den LP-Wert der Figur unveraendert zurueck, mit CC_LP=1 die 72)
local lp = env("CC_LP", "0") == "1"
local cb = 0            -- Frame, dessen Ende gerade vorliegt
local hooks = {}
pokes[#pokes + 1] = { 2, frames, P + 0x40, function(sp)
	cb = cb + 1
	for _, hk in ipairs(hooks) do hk(sp) end
	if lp then return 72 end
	return rd16(sp, P + 0x40)
end, 2 }

local rang = tonumber(env("CC_RANG", ""))
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

for spec in env("CC_POKES", ""):gmatch("[^;]+") do
	local a, b, ad, v, w = spec:match("^%s*(%d+)%-(%d+):([^=]+)=(%-?%d+):?(%d?)$")
	assert(a, "CC_POKES: " .. spec)
	local width = tonumber(w ~= "" and w or "1")
	local val = tonumber(v)
	if val < 0 then val = val + (width == 2 and 0x10000 or 0x100) end
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), addr(ad), val, width }
end

local function setze(a, b, ziel, quelle, d)
	-- ziel/quelle: Blockbasis; d: Versatz oder "_"
	if d == "_" then return end
	d = tonumber(d)
	pokes[#pokes + 1] = { a, b, ziel, function(sp) return (sp:read_u16(quelle) + d) & 0xFFFF end, 2 }
	pokes[#pokes + 1] = { a, b, ziel + 2, 0, 2 }
end

for spec in env("CC_REL", ""):gmatch("[^;]+") do
	local a, b, n, dx, dz = spec:match("^%s*(%d+)%-(%d+):(%d+):([^:]+):([^:]+)$")
	assert(a, "CC_REL: " .. spec)
	a, b = tonumber(a), tonumber(b)
	local S = slot(tonumber(n))
	setze(a, b, S + 0x0E, P + 0x0E, dx)
	setze(a, b, S + 0x16, P + 0x16, dz)
end
for spec in env("CC_ZU", ""):gmatch("[^;]+") do
	local a, b, n, dx, dz = spec:match("^%s*(%d+)%-(%d+):(%d+):([^:]+):([^:]+)$")
	assert(a, "CC_ZU: " .. spec)
	a, b = tonumber(a), tonumber(b)
	local S = slot(tonumber(n))
	setze(a, b, P + 0x0E, S + 0x0E, dx)
	setze(a, b, P + 0x16, S + 0x16, dz)
end
for spec in env("CC_FEST", ""):gmatch("[^;]+") do
	local a, b, x, z = spec:match("^%s*(%d+)%-(%d+):([^:]+):([^:]+)$")
	assert(a, "CC_FEST: " .. spec)
	a, b = tonumber(a), tonumber(b)
	if x ~= "_" then
		pokes[#pokes + 1] = { a, b, P + 0x0E, tonumber(x) & 0xFFFF, 2 }
		pokes[#pokes + 1] = { a, b, P + 0x10, 0, 2 }
	end
	if z ~= "_" then
		pokes[#pokes + 1] = { a, b, P + 0x16, tonumber(z) & 0xFFFF, 2 }
		pokes[#pokes + 1] = { a, b, P + 0x18, 0, 2 }
	end
end
for spec in env("CC_HOEHE", ""):gmatch("[^;]+") do
	local a, b, h = spec:match("^%s*(%d+)%-(%d+):(%-?%d+)$")
	assert(a, "CC_HOEHE: " .. spec)
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), P + 0x12, tonumber(h) & 0xFFFF, 2 }
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), P + 0x14, 0, 2 }
end

-- CC_ENTF "von-bis:TYP,TYP;...": entfernt in den Frames von..bis jeden
-- Gegner (Slot 0..19, Byte S+4 ungleich 0) mit dieser Typkennung S+0x38
-- (hex), indem S+4 auf 0 gesetzt wird (Slot frei, ohne Tod; wie CC_ENTF in
-- verhalten.lua). CC_ENTF_SLOT "von-bis:N,N;..." entfernt feste Slots.
for spec in env("CC_ENTF", ""):gmatch("[^;]+") do
	local a, b, typen = spec:match("^%s*(%d+)%-(%d+):(.+)$")
	assert(a, "CC_ENTF: " .. spec)
	local tt = {}
	for t in typen:gmatch("%x+") do tt[tonumber(t, 16)] = true end
	pokes[#pokes + 1] = { tonumber(a), tonumber(b), 0xFFF82B, function(sp)
		for n = 0, 19 do
			local S = slot(n)
			if sp:read_u8(S + 4) ~= 0 and tt[sp:read_u32(S + 0x38)] then sp:write_u8(S + 4, 0) end
		end
		return sp:read_u8(0xFFF82B)
	end }
end
for spec in env("CC_ENTF_SLOT", ""):gmatch("[^;]+") do
	local a, b, sl = spec:match("^%s*(%d+)%-(%d+):(.+)$")
	assert(a, "CC_ENTF_SLOT: " .. spec)
	for n in sl:gmatch("%d+") do pokes[#pokes + 1] = { tonumber(a), tonumber(b), slot(tonumber(n)) + 4, 0 } end
end

-- Ausgeloeste Eingriffe ----------------------------------------------------
local ab_slot, ab_anim, ab_k = env("CC_AB", ""):match("^(%d+):(%x+):?(%d*)$")
local start            -- A
if ab_slot then
	ab_slot, ab_anim, ab_k = tonumber(ab_slot), tonumber(ab_anim, 16), tonumber(ab_k ~= "" and ab_k or "1")
	local S = slot(ab_slot)
	local seen, last = 0, nil
	hooks[#hooks + 1] = function(sp)
		if start then return end
		local a = sp:read_u32(S + 0x1C)
		if a == ab_anim and last ~= a then
			seen = seen + 1
			if seen == ab_k then start = cb end
		end
		last = a
	end
end

-- Figur relativ zu einem Block setzen, solange fenster(f) gilt
local function figur_rel(basis, fenster, dx, dz, h)
	local function w(off, d, quelle)
		if d == "_" or d == nil then return end
		local dv = tonumber(d)
		pokes[#pokes + 1] = { 2, frames, P + off, function(sp)
			local b = basis()
			if not b or not fenster(cb + 1) then return rd16(sp, P + off) end
			if quelle then return (rd16(sp, b + off) + dv) & 0xFFFF end
			return dv & 0xFFFF
		end, 2 }
		pokes[#pokes + 1] = { 2, frames, P + off + 2, function(sp)
			local b = basis()
			if not b or not fenster(cb + 1) then return rd16(sp, P + off + 2) end
			return 0
		end, 2 }
	end
	w(0x0E, dx, true)
	w(0x16, dz, true)
	w(0x12, h, false)
end

do
	local von, bis, dx, dz, h = env("CC_AB_ZU", ""):match("^(%-?%d+):(%-?%d+):([^:]+):([^:]+):?([^:]*)$")
	if von then
		von, bis = tonumber(von), tonumber(bis)
		local S = slot(ab_slot)
		figur_rel(function() return start and S end,
			function(f) return start and f >= start + von and f <= start + bis end,
			dx, dz, h ~= "" and h or nil)
	end
end

do
	-- CC_GESCH "ART:von:bis:dx:dz[:h[:k]]": k-tes neues Geschoss (Standard 1)
	local teile = {}
	for t in (env("CC_GESCH", "") .. ":"):gmatch("([^:]*):") do teile[#teile + 1] = t end
	if #teile >= 5 then
		local art, von, bis, dx, dz = teile[1], tonumber(teile[2]), tonumber(teile[3]), teile[4], teile[5]
		local h = (teile[6] and teile[6] ~= "" and teile[6] ~= "_") and teile[6] or nil
		local k = tonumber(teile[7] or "") or 1
		local typ = art ~= "_" and tonumber(art, 16) or nil
		local schuetze = tonumber(env("CC_GESCH_SLOT", tostring(ab_slot or -1)))
		local zeiger = (slot(schuetze) + 4) & 0xFFFF
		local g_slot, g_frame, gezaehlt = nil, nil, 0
		local vorher, erst = {}, true
		hooks[#hooks + 1] = function(sp)
			if g_slot then
				-- Block frei oder anders belegt: Eingriff endet
				if sp:read_u8(slot(g_slot) + 4) == 0 or rd16(sp, slot(g_slot) + 0x6C) ~= zeiger then
					g_slot = nil; g_frame = -1e9
				end
				return
			end
			if g_frame then return end
			for n = 20, 59 do
				local S = slot(n)
				local belegt = sp:read_u8(S + 4) ~= 0 and rd16(sp, S + 0x6C) == zeiger
					and (not typ or sp:read_u32(S + 0x38) == typ)
				if belegt and not vorher[n] and not erst then
					gezaehlt = gezaehlt + 1
					if gezaehlt == k then g_slot, g_frame = n, cb end
				end
				vorher[n] = belegt
			end
			erst = false
		end
		figur_rel(function() return g_slot and slot(g_slot) end,
			function(f) return g_frame and f >= g_frame + von and f <= g_frame + bis end,
			dx, dz, h)
		-- CC_GESCH_GEGNER "N:dx:dz": Gegner in Slot N im selben Fenster relativ
		-- zum Geschoss setzen (statt oder neben der Figur)
		local gn, gdx, gdz = env("CC_GESCH_GEGNER", ""):match("^(%d+):([^:]+):([^:]+)$")
		if gn then
			local G = slot(tonumber(gn))
			for _, ax in ipairs({ { 0x0E, gdx }, { 0x16, gdz } }) do
				local off, d = ax[1], ax[2]
				if d ~= "_" then
					d = tonumber(d)
					pokes[#pokes + 1] = { 2, frames, G + off, function(sp)
						local f = cb + 1
						if not (g_slot and g_frame and f >= g_frame + von and f <= g_frame + bis) then return rd16(sp, G + off) end
						return (rd16(sp, slot(g_slot) + off) + d) & 0xFFFF
					end, 2 }
				end
			end
		end
	end
end

do
	-- CC_HIN "N:periode:dauer[:mindest]": Eingabe (kein Eingriff) - in jedem
	-- Frame f mit (f mod periode) < dauer geht die Figur auf Slot N zu (links
	-- bzw. rechts nach der x-Lage), solange der x-Abstand groesser als mindest
	-- (Standard 40) ist. Die Richtung wird am Ende von Frame f-2 gelesen.
	local n, per, dauer, mind = env("CC_HIN", ""):match("^(%d+):(%d+):(%d+):?(%d*)$")
	if n then
		local S, per, dauer = slot(tonumber(n)), tonumber(per), tonumber(dauer)
		mind = tonumber(mind ~= "" and mind or "40")
		local links = { 0, -1, { KEYS.left } }
		local rechts = { 0, -1, { KEYS.right } }
		inputs[#inputs + 1] = links
		inputs[#inputs + 1] = rechts
		hooks[#hooks + 1] = function(sp)
			local f = cb + 2
			links[1], links[2], rechts[1], rechts[2] = 0, -1, 0, -1
			if (f % per) >= dauer or sp:read_u8(S + 4) == 0 then return end
			local dx = rd16(sp, S + 0x0E) - rd16(sp, P + 0x0E)
			if dx > mind then rechts[1], rechts[2] = f, f
			elseif dx < -mind then links[1], links[2] = f, f end
		end
	end
end

local save_states = {}
for f, nm in env("CC_SAVE", ""):gmatch("(%d+):([^,]+)") do save_states[tonumber(f)] = nm end
local snaps = {}
for f in env("CC_SNAPS", ""):gmatch("%d+") do snaps[tonumber(f)] = env("CC_NAME", "fern_frei") end

return {
	frames = frames,
	inputs = inputs,
	pokes = pokes,
	save_states = save_states,
	snaps = snaps,
	dump = env("CC_DUMP", "1") ~= "0" and { start = 0xFFA900, stop = 0xFFEA00, from = tonumber(env("CC_DUMP_AB", "1")), to = frames, every = 1 } or nil,
	watch = {
		{ name = "camx", addr = 0xFFA82E, size = 2 },
		{ name = "camy", addr = 0xFFA830, size = 2 },
		{ name = "rang", addr = 0xFFF82A, size = 1 },
		{ name = "zaehler", addr = 0xFFF82C, size = 2 },
		{ name = "stage", addr = 0xFFA8CE, size = 1 },
	},
}
