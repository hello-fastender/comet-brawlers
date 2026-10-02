-- Huelle um ein anderes Szenario (CC_BASIS, z. B. hurt.lua, hurt_c.lua) fuer
-- die Gruppenlaeufe des Auftrags M2 (Praefix "verhalten"): gleiche Eingaben
-- wie das Basisszenario, aber
--   CC_FRAMES  laengere bzw. kuerzere Laufzeit (danach keine Eingabe)
--   CC_LP      1 (Standard): EINGRIFF, LP der Figur P+0x40 := 72, wenn
--              0 < LP < 72 (wie bot.lua), damit die Figur ueberlebt; 0 = aus
-- Abzug nur 0xFFA900-0xFFEA00 (Spielerblock, Timer, Objektslots), Kamera,
-- Stage und Rang im Watch-CSV (wie verhalten.lua). Snapshots entfallen.
local basis = assert(os.getenv("CC_BASIS"), "CC_BASIS fehlt")
local here = (os.getenv("CC_SCENARIO") or ""):match("(.*/)") or "./"
local sc = dofile(here .. basis)
local frames = tonumber(os.getenv("CC_FRAMES") or "") or sc.frames
sc.frames = frames
sc.snaps = nil
sc.save_states = nil
sc.dump = { start = 0xFFA900, stop = 0xFFEA00, from = 1, to = frames, every = 1 }
local P = 0xFFA990
sc.watch = {
	{ name = "camx", addr = 0xFFA82E, size = 2 },
	{ name = "camy", addr = 0xFFA830, size = 2 },
	{ name = "stage", addr = 0xFFA8CE, size = 1 },
	{ name = "rang", addr = 0xFFF82A, size = 1 },
	{ name = "zaehler", addr = 0xFFF82C, size = 2 },
	{ name = "p_lp", addr = P + 0x40, size = 2, signed = true },
}
sc.pokes = sc.pokes or {}
if (os.getenv("CC_LP") or "1") ~= "0" then
	sc.pokes[#sc.pokes + 1] = { 2, frames, P + 0x40, function(sp)
		local v = sp:read_u16(P + 0x40)
		if v >= 0x8000 then v = v - 0x10000 end
		if v > 0 and v < 72 then return 72 end
		return v & 0xFFFF
	end, 2 }
end
return sc
