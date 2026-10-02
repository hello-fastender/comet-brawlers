-- Gegenpruefung "Spezialangriff und Sprint" (Praefixe spezial_v, sprint_v).
-- Freie Eingaben ab einem beliebigen Savestate, Protokoll nur ueber das
-- Szenario-Feld "watch" (kein RAM-Abzug). Eigene Szenarien des
-- Gegenpruefers V4, unabhaengig von spezial_probe.lua geschrieben.
--
-- Variablen:
--   CC_IN      Eingaben "a-b:taste+taste;c:taste" (ohne -b: a bis a+1),
--              z. B. "9:p1_attack+p1_jump;30-80:p1_left"
--              Tasten: p1_attack, p1_jump, p1_left, p1_right, p1_up, p1_down
--   CC_FRAMES  Laenge des Laufs (Standard 150)
--   CC_SLOTS   protokollierte Objektslots, Liste mit Bereichen
--              (Standard "0-19"), z. B. "0-19,50-59"
--   CC_SAVE    "frame:name" legt in diesem Frame einen Savestate an
--              (nur Namen mit Praefix spezial_v bzw. sprint_v)
-- Optionale EINGRIFFE (RAM-Schreibzugriffe vor dem jeweiligen Frame; im
-- Lauf und in jeder Ergebnistabelle zu nennen):
--   CC_SETZE   "slot:dx:dz:von:bis" (mehrere mit ";" getrennt) setzt den
--              Gegner in den Frames von..bis relativ zur Figur (Nachkomma 0);
--              dx oder dz leer = diese Achse bleibt unveraendert
--   CC_P_LP    "von-bis:wert" setzt LP und Vorframe-LP der Figur in diesen
--              Frames (ohne -bis nur im Frame von)
--   CC_G_LP    "slot:wert" setzt in Frame 2 LP, Vorframe-LP und Max-LP des
--              Gegnerslots (S+0x40, +0x42, +0x9A)
--   CC_RANG    haelt den Rang FFF82A ab Frame 2 auf diesem Wert
--   CC_POKE    "von-bis:adresse:wert[:breite]" (mehrere mit ";"), schreibt
--              den Wert in diesen Frames (Adresse hexadezimal, z. B. FFAA69)
local spec = os.getenv("CC_IN") or ""
local frames = tonumber(os.getenv("CC_FRAMES") or "150")
local slotspec = os.getenv("CC_SLOTS") or "0-19"

local inputs = {}
for item in spec:gmatch("[^;]+") do
	local a, b, keys = item:match("^(%d+)%-?(%d*):(.+)$")
	a = tonumber(a)
	local ks = {}
	for k in keys:gmatch("[^+]+") do ks[#ks + 1] = k end
	inputs[#inputs + 1] = { a, tonumber(b) or (a + 1), ks }
end

local slots = {}
for part in slotspec:gmatch("[^,]+") do
	local a, b = part:match("^(%d+)%-(%d+)$")
	if a then
		for n = tonumber(a), tonumber(b) do slots[#slots + 1] = n end
	else
		slots[#slots + 1] = tonumber(part)
	end
end

local P = 0xFFA990
local watch = {
	{ name = "f_x", addr = P + 0x0E, size = 4 },
	{ name = "f_z", addr = P + 0x16, size = 4 },
	{ name = "f_h", addr = P + 0x12, size = 2, signed = true },
	{ name = "f_hf", addr = P + 0x14, size = 2 },
	{ name = "f_lp", addr = P + 0x40, size = 2, signed = true },
	{ name = "f_akt", addr = P + 0x0A, size = 2 },
	{ name = "f_ph", addr = P + 0x0C, size = 2 },
	{ name = "f_st", addr = P + 0x04, size = 1 },
	{ name = "f_blick", addr = P + 0x5E, size = 1 },
	{ name = "f_anim", addr = P + 0x1C, size = 4 },
	{ name = "t69", addr = 0xFFAA69, size = 1 },
	{ name = "t61", addr = 0xFFAA61, size = 1 },
	{ name = "figur", addr = 0xFFAA34, size = 1 },
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "kam_x", addr = 0xFFA82E, size = 2 },
}
for _, n in ipairs(slots) do
	local S = 0xFFBC90 + n * 0xC0
	local p = "s" .. n .. "_"
	watch[#watch + 1] = { name = p .. "st", addr = S + 0x04, size = 1 }
	watch[#watch + 1] = { name = p .. "s5", addr = S + 0x05, size = 1 }
	watch[#watch + 1] = { name = p .. "x", addr = S + 0x0E, size = 4 }
	watch[#watch + 1] = { name = p .. "z", addr = S + 0x16, size = 2, signed = true }
	watch[#watch + 1] = { name = p .. "h", addr = S + 0x12, size = 2, signed = true }
	watch[#watch + 1] = { name = p .. "lp", addr = S + 0x40, size = 2, signed = true }
	watch[#watch + 1] = { name = p .. "typ", addr = S + 0x38, size = 4 }
	watch[#watch + 1] = { name = p .. "att", addr = S + 0x24, size = 1 }
	watch[#watch + 1] = { name = p .. "blick", addr = S + 0x5E, size = 1 }
	watch[#watch + 1] = { name = p .. "anim", addr = S + 0x1C, size = 4 }
	watch[#watch + 1] = { name = p .. "akt", addr = S + 0x0A, size = 2 }
end

local pokes = {}
local P1X, P1Z = P + 0x0E, P + 0x16
for item in (os.getenv("CC_SETZE") or ""):gmatch("[^;]+") do
	local n, dx, dz, von, bis = item:match("^(%d+):(%-?%d*):(%-?%d*):(%d+):(%d+)$")
	assert(n, "CC_SETZE unlesbar: " .. item)
	local S = 0xFFBC90 + tonumber(n) * 0xC0
	von, bis = tonumber(von), tonumber(bis)
	if dx ~= "" then
		local d = tonumber(dx)
		pokes[#pokes + 1] = { von, bis, S + 0x0E, function(sp) return (sp:read_u16(P1X) + d) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x10, 0, 2 }
	end
	if dz ~= "" then
		local d = tonumber(dz)
		pokes[#pokes + 1] = { von, bis, S + 0x16, function(sp) return (sp:read_u16(P1Z) + d) & 0xFFFF end, 2 }
		pokes[#pokes + 1] = { von, bis, S + 0x18, 0, 2 }
	end
end
do
	local von, bis, wert = (os.getenv("CC_P_LP") or ""):match("^(%d+)%-?(%d*):(%d+)$")
	if von then
		von = tonumber(von)
		bis = tonumber(bis) or von
		pokes[#pokes + 1] = { von, bis, P + 0x40, tonumber(wert), 2 }
		pokes[#pokes + 1] = { von, bis, P + 0x42, tonumber(wert), 2 }
	end
end
for item in (os.getenv("CC_G_LP") or ""):gmatch("[^;]+") do
	local n, wert = item:match("^(%d+):(%d+)$")
	local S = 0xFFBC90 + tonumber(n) * 0xC0
	for _, off in ipairs({ 0x40, 0x42, 0x9A }) do
		pokes[#pokes + 1] = { 2, 2, S + off, tonumber(wert), 2 }
	end
end
for item in (os.getenv("CC_POKE") or ""):gmatch("[^;]+") do
	local von, bis, addr, wert, breite = item:match("^(%d+)%-(%d+):(%x+):(%d+):?(%d*)$")
	assert(von, "CC_POKE unlesbar: " .. item)
	pokes[#pokes + 1] = { tonumber(von), tonumber(bis), tonumber(addr, 16), tonumber(wert), tonumber(breite) or 1 }
end
local rang = tonumber(os.getenv("CC_RANG") or "")
if rang then pokes[#pokes + 1] = { 2, frames, 0xFFF82A, rang } end

local save_states
do
	local f, name = (os.getenv("CC_SAVE") or ""):match("^(%d+):(.+)$")
	if f then save_states = { [tonumber(f)] = name } end
end

return {
	frames = frames,
	inputs = inputs,
	watch = watch,
	pokes = pokes,
	save_states = save_states,
}
