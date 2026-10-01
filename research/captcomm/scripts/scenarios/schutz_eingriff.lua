-- EINGRIFF (nicht nur Beobachtung): Wie hurt.lua, aber der Timer nach dem
-- Aufstehen (FFAA69) wird manipuliert, um zu pruefen, ob er den Schutz
-- verursacht. In hurt.lua steht die Figur bei 696 auf (Timer 35) und wird
-- bei 731 getroffen, genau beim Ablauf.
--   CC_MODE=null   Timer ab 697 auf 0 halten (Schutz sofort aus)
--   CC_MODE=halten Timer 697-830 auf 35 halten (Schutz verlaengert)
local mode = os.getenv("CC_MODE") or "null"
local pokes = {}
if mode == "null" then
	pokes = { { 697, 730, 0xFFAA69, 0 } }
elseif mode == "halten" then
	pokes = { { 697, 830, 0xFFAA69, 35 } }
end

return {
	frames = 900,
	inputs = { { 61, 180, { "p1_right" } } },
	pokes = pokes,
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 900, every = 1 },
}
