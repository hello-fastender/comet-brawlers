-- rest_v_frei.lua – Gegenpruefung "Rest der Spielfigur" (Agent V8, Praefix
-- rest_v). Eigenes Szenario, unabhaengig von den Szenarien des Messagenten
-- geschrieben. Freier Lauf ab einem beliebigen Savestate (run.sh-Argument),
-- Protokoll nur ueber das Feld "watch" (kein RAM-Abzug).
--
-- Zeitangaben (Frames) sind entweder Zahlen (lokale Frames des Runners) oder
-- relativ zu einem Ereignis "EREIGNIS#k+n" bzw. "EREIGNIS#k-n" (k-tes
-- Auftreten, Zustand am Frame-Ende). Ereignisse:
--   lpN    LP von Slot N (S+0x40) kleiner als im Vorframe (h)
--   plp    LP der Figur kleiner als im Vorframe
--   tot    LP der Figur fallen unter 0 (t)
--   land   Hoehe der Figur (Ganzzahl) wechselt von > 0 auf 0 (Landung)
--   hoch   Hoehe der Figur erstmals >= 200 (Erscheinen nach dem Neueinstieg)
--   stage  Stage-Index FFA8CE wechselt
-- Eine relative Eingabe muss mindestens 2 Frames nach dem Ereignis liegen
-- (sie wird im Callback des Ereignisframes eingetragen), ein relativer
-- Eingriff mindestens 1 Frame.
--
-- Variablen:
--   CC_IN      Eingaben "VON[..BIS]:tasten;..." (ohne ..BIS: VON und VON+1),
--              Tasten mit + verbunden, Kurzformen l r u d a j, z. B.
--              "20:j+u;21:a" oder "lp17#1+11:a" oder "lp17#1+2..lp17#1+40:l"
--   CC_FRAMES  Laufzeit (Standard 300)
--   CC_SLOTS   protokollierte Slots, z. B. "0-19" (Standard) oder "16-19,43"
--   CC_SAVE    "frame:name" Savestate (nur Namen mit Praefix rest_v)
--
-- EINGRIFFE (nur wenn gesetzt; im Lauf und in jeder Ergebnistabelle nennen):
--   CC_SETZE   "slot:dx:dz:VON..BIS" (mehrere mit ";"): setzt den Gegner vor
--              jedem dieser Frames relativ zur Figur (x := Figur-x + dx,
--              Tiefe := Figur-Tiefe + dz, Nachkomma 0); dx oder dz leer =
--              Achse unveraendert
--   CC_GLP     "slot:wert:FRAME" setzt LP und Vorframe-LP des Slots (nur unter
--              die Max-LP S+0x9A; ein Eingriff auf S+0x9A = 7 liess das Spiel
--              beim naechsten Treffer stehen)
--   CC_PLP     "wert:VON..BIS" setzt LP und Vorframe-LP der Figur
--   CC_RANG    "wert:VON..BIS" haelt den Rang FFF82A
--   CC_POKE    "adresse:wert:breite:VON..BIS" (Adresse hexadezimal)
local function env(n, d) local v = os.getenv(n); if v == nil or v == "" then return d end; return v end
local frames = tonumber(env("CC_FRAMES", "300"))
local HUGE = 1e9

local P = 0xFFA990
local function slotbase(n) return 0xFFBC90 + n * 0xC0 end

-- Zeitangaben: absolut oder relativ zu einem Ereignis
local relativ = {} -- { ev = "lp17#1", off = n, setze = function(f) }
local function zeit(term, setze)
	local n = tonumber(term)
	if n then setze(n); return end
	local ev, k, vz, off = term:match("^(%a+%d*)#(%d+)([%+%-])(%d+)$")
	assert(ev, "Zeitangabe unlesbar: " .. term)
	off = tonumber(off) * (vz == "-" and -1 or 1)
	setze(HUGE)
	relativ[#relativ + 1] = { ev = ev .. "#" .. k, off = off, setze = setze }
end
local function bereich(spec, eintrag, i_von, i_bis)
	local a, b = spec:match("^(.-)%.%.(.+)$")
	if not a then a = spec end
	zeit(a, function(f) eintrag[i_von] = f; if not b then eintrag[i_bis] = f + 1 end end)
	if b then zeit(b, function(f) eintrag[i_bis] = f end) end
end

local KURZ = { l = "p1_left", r = "p1_right", u = "p1_up", d = "p1_down", a = "p1_attack", j = "p1_jump" }
local inputs = {}
for item in env("CC_IN", ""):gmatch("[^;]+") do
	local spec, keys = item:match("^(.+):([%a_%+]+)$")
	assert(spec, "CC_IN unlesbar: " .. item)
	local list = {}
	for k in keys:gmatch("[^+]+") do list[#list + 1] = KURZ[k] or k end
	local e = { HUGE, HUGE, list }
	bereich(spec, e, 1, 2)
	inputs[#inputs + 1] = e
end

local watch = {
	{ name = "f_st", addr = P + 0x04, size = 1 },
	{ name = "f_akt", addr = P + 0x0A, size = 2 },
	{ name = "f_ph", addr = P + 0x0C, size = 2 },
	{ name = "f_x", addr = P + 0x0E, size = 2 },
	{ name = "f_xf", addr = P + 0x10, size = 2 },
	{ name = "f_h", addr = P + 0x12, size = 2, signed = true },
	{ name = "f_hf", addr = P + 0x14, size = 2 },
	{ name = "f_z", addr = P + 0x16, size = 2 },
	{ name = "f_anim", addr = P + 0x1C, size = 4 },
	{ name = "f_lp", addr = P + 0x40, size = 2, signed = true },
	{ name = "f_blick", addr = P + 0x5E, size = 1 },
	{ name = "f_angr", addr = P + 0x82, size = 2 },
	{ name = "leben", addr = 0xFFAA7C, size = 1 },
	{ name = "kombo", addr = 0xFFAA2D, size = 1 },
	{ name = "t61", addr = 0xFFAA61, size = 1 },
	{ name = "t69", addr = 0xFFAA69, size = 1 },
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "rz", addr = 0xFFF82C, size = 2 },
	{ name = "stage", addr = 0xFFA8CE, size = 1 },
	{ name = "kx", addr = 0xFFA82E, size = 2 },
	{ name = "ky", addr = 0xFFA830, size = 2 },
}
local slots = {}
for part in env("CC_SLOTS", "0-19"):gmatch("[^,]+") do
	local a, b = part:match("^(%d+)%-(%d+)$")
	if a then for n = tonumber(a), tonumber(b) do slots[#slots + 1] = n end
	else slots[#slots + 1] = tonumber(part) end
end
for _, n in ipairs(slots) do
	local S, p = slotbase(n), "s" .. n .. "_"
	watch[#watch + 1] = { name = p .. "st", addr = S + 0x04, size = 1 }
	watch[#watch + 1] = { name = p .. "s5", addr = S + 0x05, size = 1 }
	watch[#watch + 1] = { name = p .. "akt", addr = S + 0x0A, size = 2 }
	watch[#watch + 1] = { name = p .. "ph", addr = S + 0x0C, size = 2 }
	watch[#watch + 1] = { name = p .. "x", addr = S + 0x0E, size = 2 }
	watch[#watch + 1] = { name = p .. "h", addr = S + 0x12, size = 2, signed = true }
	watch[#watch + 1] = { name = p .. "z", addr = S + 0x16, size = 2 }
	watch[#watch + 1] = { name = p .. "anim", addr = S + 0x1C, size = 4 }
	watch[#watch + 1] = { name = p .. "att", addr = S + 0x24, size = 2 }
	watch[#watch + 1] = { name = p .. "typ", addr = S + 0x38, size = 4 }
	watch[#watch + 1] = { name = p .. "lp", addr = S + 0x40, size = 2, signed = true }
	watch[#watch + 1] = { name = p .. "blick", addr = S + 0x5E, size = 1 }
end

-- Ereigniserkennung: laeuft als erster Eintrag in "pokes" im Callback jedes
-- Frames und schreibt das gelesene Byte unveraendert zurueck (kein Eingriff).
local zaehler, vor = {}, {}
local glp_frame = {} -- slot -> Frame eines LP-Eingriffs (zaehlt nicht als Ereignis lpN)
local function s16(v) if v >= 0x8000 then return v - 0x10000 end return v end
local function melde(sp_ev, f)
	zaehler[sp_ev] = (zaehler[sp_ev] or 0) + 1
	local key = sp_ev .. "#" .. zaehler[sp_ev]
	for _, r in ipairs(relativ) do
		if r.ev == key then r.setze(f + r.off) end
	end
end
local lokal = 0
local function erkennen(sp)
	lokal = lokal + 1 -- Callback von Frame "lokal"; Zustand am Ende dieses Frames
	local f = lokal
	local jetzt = {
		plp = s16(sp:read_u16(P + 0x40)),
		h = s16(sp:read_u16(P + 0x12)),
		stage = sp:read_u8(0xFFA8CE),
	}
	for n = 0, 59 do jetzt["lp" .. n] = s16(sp:read_u16(slotbase(n) + 0x40)) end
	if vor.plp then
		for n = 0, 59 do
			if jetzt["lp" .. n] < vor["lp" .. n] and glp_frame[n] ~= f then melde("lp" .. n, f) end
		end
		if jetzt.plp < vor.plp then melde("plp", f) end
		if jetzt.plp < 0 and vor.plp >= 0 then melde("tot", f) end
		if jetzt.h == 0 and vor.h > 0 then melde("land", f) end
		if jetzt.h >= 200 and vor.h < 200 then melde("hoch", f) end
		if jetzt.stage ~= vor.stage then melde("stage", f) end
	end
	vor = jetzt
	return sp:read_u8(0xFFAA2D)
end
local pokes = { { 2, frames, 0xFFAA2D, erkennen, 1 } }

for item in env("CC_SETZE", ""):gmatch("[^;]+") do
	local n, dx, dz, spec = item:match("^(%d+):(%-?%d*):(%-?%d*):(.+)$")
	assert(n, "CC_SETZE unlesbar: " .. item)
	local S = slotbase(tonumber(n))
	if dx ~= "" then
		local d = tonumber(dx)
		local e1 = { HUGE, HUGE, S + 0x0E, function(sp) return (sp:read_u16(P + 0x0E) + d) & 0xFFFF end, 2 }
		local e2 = { HUGE, HUGE, S + 0x10, 0, 2 }
		bereich(spec, e1, 1, 2); bereich(spec, e2, 1, 2)
		pokes[#pokes + 1] = e1; pokes[#pokes + 1] = e2
	end
	if dz ~= "" then
		local d = tonumber(dz)
		local e1 = { HUGE, HUGE, S + 0x16, function(sp) return (sp:read_u16(P + 0x16) + d) & 0xFFFF end, 2 }
		local e2 = { HUGE, HUGE, S + 0x18, 0, 2 }
		bereich(spec, e1, 1, 2); bereich(spec, e2, 1, 2)
		pokes[#pokes + 1] = e1; pokes[#pokes + 1] = e2
	end
end
for item in env("CC_GLP", ""):gmatch("[^;]+") do
	local n, wert, spec = item:match("^(%d+):(%-?%d+):(.+)$")
	assert(n, "CC_GLP unlesbar: " .. item)
	local S = slotbase(tonumber(n))
	for _, off in ipairs({ 0x40, 0x42 }) do
		local e = { HUGE, HUGE, S + off, tonumber(wert) & 0xFFFF, 2 }
		zeit(spec, function(f) e[1] = f; e[2] = f; glp_frame[tonumber(n)] = f end)
		pokes[#pokes + 1] = e
	end
end
do
	local wert, spec = env("CC_PLP", ""):match("^(%-?%d+):(.+)$")
	if wert then
		for _, off in ipairs({ 0x40, 0x42 }) do
			local e = { HUGE, HUGE, P + off, tonumber(wert) & 0xFFFF, 2 }
			bereich(spec, e, 1, 2)
			pokes[#pokes + 1] = e
		end
	end
end
do
	local wert, spec = env("CC_RANG", ""):match("^(%d+):(.+)$")
	if wert then
		local e = { HUGE, HUGE, 0xFFF82A, tonumber(wert), 1 }
		bereich(spec, e, 1, 2)
		pokes[#pokes + 1] = e
	end
end
for item in env("CC_POKE", ""):gmatch("[^;]+") do
	local a, wert, breite, spec = item:match("^(%x+):(%-?%d+):(%d):(.+)$")
	assert(a, "CC_POKE unlesbar: " .. item)
	local e = { HUGE, HUGE, tonumber(a, 16), tonumber(wert) & 0xFFFF, tonumber(breite) }
	bereich(spec, e, 1, 2)
	pokes[#pokes + 1] = e
end

local save_states
do
	local f, name = env("CC_SAVE", ""):match("^(%d+):(.+)$")
	if f then
		assert(name:match("^rest_v"), "CC_SAVE: nur eigener Praefix rest_v")
		save_states = { [tonumber(f)] = name }
	end
end

return {
	frames = frames,
	inputs = inputs,
	watch = watch,
	pokes = pokes,
	save_states = save_states,
}
