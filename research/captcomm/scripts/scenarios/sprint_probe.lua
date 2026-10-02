-- Sprint (Doppeltipp einer Richtung), Sprintangriff, Sprintsprung und
-- Sprint-Sprungangriff. Dasselbe Szenario wie spezial_probe.lua, nur unter
-- dem Praefix des Sprints; alle Variablen sind dort beschrieben:
--   CC_IN, CC_FRAMES, CC_KLEIN, CC_SAVE
--   EINGRIFF: CC_SLOTS, CC_DX, CC_DZ, CC_DH, CC_VON, CC_BIS, CC_FERN_BIS,
--             CC_NAH_BIS, CC_WEG, CC_LP
-- Beispiel Doppeltipp: CC_IN="2-3:p1_right;6-60:p1_right" (erster Druck 2
-- Frames, Pause 2 Frames, zweiter Druck gehalten). Kalibriert ab "ingame":
-- Sprint (Aktion P+0x0A = 0x02) ab dem Frame nach dem zweiten Druck.
local dir = (os.getenv("CC_SCENARIO") or ""):match("^(.*)/") or "."
return dofile(dir .. "/spezial_probe.lua")
