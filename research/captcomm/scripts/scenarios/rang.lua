-- Huelle um ein anderes Szenario (CC_BASIS, Standard hurt_c.lua) fuer den
-- Schwierigkeitswert ("Rang", Byte FFF82A):
--   CC_FRAMES  Laufzeit (und Abzug) verlaengern bzw. kuerzen; danach keine
--              weiteren Eingaben
--   CC_RANG    EINGRIFF: haelt FFF82A ab Frame 2 vor jedem Frame auf diesem
--              Wert (das Spiel begrenzt ihn selbst auf 7..24)
-- Snapshots des Basisszenarios entfallen.
local basis = os.getenv("CC_BASIS") or "hurt_c.lua"
local here = (os.getenv("CC_SCENARIO") or ""):match("(.*/)") or "./"
local sc = dofile(here .. basis)
local frames = tonumber(os.getenv("CC_FRAMES") or "")
if frames then
	sc.frames = frames
	sc.dump.to = frames
end
sc.snaps = nil
local rang = tonumber(os.getenv("CC_RANG") or "")
if rang then
	sc.pokes = sc.pokes or {}
	sc.pokes[#sc.pokes + 1] = { 2, sc.frames, 0xFFF82A, rang }
end
return sc
