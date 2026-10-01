-- Demo-Modus ohne Eingaben: Grundrauschen des RAMs und Demo-Kaempfe
-- (Gegner bewegen sich, KI-Spieler schlagen) als erste Orientierung.
-- CPS1-Arbeitsspeicher: 0xFF0000-0xFFFFFF.
local snaps = {}
for f = 300, 5400, 300 do snaps[f] = "attract" end

return {
	frames = 5400,                                   -- 90 s bei ~59,6 Hz
	dump = { start = 0xFF0000, stop = 0xFFFFFF, from = 1, to = 5400, every = 1 },
	snaps = snaps,                                   -- nur lokal, git-ignoriert
}
