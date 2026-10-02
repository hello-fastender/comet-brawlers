-- Gegenpruefung Sprint (Praefix sprint_v): dasselbe Szenario wie
-- spezial_v_frei.lua (freie Eingaben, Protokoll ueber "watch", optionale
-- EINGRIFFE CC_SETZE, CC_P_LP, CC_G_LP, CC_POKE, CC_RANG). Beschreibung der
-- Variablen dort; kalibrierte Frames stehen bei den Laeufen in
-- belege_sprint.sh.
local here = (os.getenv("CC_SCENARIO") or ""):match("(.*/)") or "./"
return dofile(here .. "spezial_v_frei.lua")
