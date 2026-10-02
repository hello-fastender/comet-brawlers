-- Kaltstart, Muenze, Start, Figurenwahl wie coin_start.lua, aber mit
-- frei waehlbarer Stage. EINGRIFF: In der Figurenwahl wird der Stage-Index
-- FFA8CE (0..8 = Stage 1..9) gesetzt, bevor die Figur bestaetigt wird; das
-- Spiel laedt dann diese Stage (gegengeprueft: am Stage-Ende zaehlt das Spiel
-- denselben Index selbst weiter und startet die naechste Stage mit denselben
-- Werten). Danach keine Eingriffe mehr.
--   CC_STAGE  1..9 (Standard 1)
--   CC_FIGUR  0 Mack, 1 Captain (Standard), 2 Ginzu, 3 Baby Head
--   CC_SAVE   Frame fuer den Savestate "stage<N>" bzw. "stage<N>_<figur>"
--             (Standard 1400; steuerbar ist die Figur je nach Stage ab
--             Frame 1104 bis 1381)
--   CC_SAVE_NAME  anderer Name fuer den Savestate (z. B. "held0" mit
--             CC_SAVE=2400: entspricht "ingame", aber mit Figur CC_FIGUR)
--   CC_SNAPS  Frames fuer Snapshots "stage<N>", z. B. "1200,1400"
local n = tonumber(os.getenv("CC_STAGE") or "1")
local figur = tonumber(os.getenv("CC_FIGUR") or "1")
local save = tonumber(os.getenv("CC_SAVE") or "1400")
local inputs = {
	{ 600, 605, { "coin1" } },
	{ 700, 705, { "start1" } },
	{ 900, 905, { "p1_attack" } },
}
for k = 1, figur do inputs[#inputs + 1] = { 780 + 20 * k, 783 + 20 * k, { "p1_right" } } end
local name = os.getenv("CC_SAVE_NAME") or ("stage" .. n .. (figur == 1 and "" or ("_" .. figur)))
local snaps = {}
for f in (os.getenv("CC_SNAPS") or ""):gmatch("%d+") do snaps[tonumber(f)] = name end
return {
	frames = save,
	inputs = inputs,
	pokes = { { 851, 859, 0xFFA8CE, n - 1 } },
	snaps = snaps,
	save_states = { [save] = name },
}
