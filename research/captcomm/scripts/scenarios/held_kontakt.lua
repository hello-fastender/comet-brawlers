-- Wie kontakt.lua, aber ab Savestate "held<k>" (stage_start.lua mit
-- CC_FIGUR=k, CC_SAVE=2400, CC_SAVE_NAME=held<k>) und mit eigenem Namen:
-- legt "held<k>_kontakt" an (Gegner WOOKY 46 px vor der Figur, Tiefe +10).
-- Die Gegner verhalten sich wie in "kontakt" (gleicher Zeitverlauf ab
-- Spielstart; geprueft fuer Captain Commando, k = 1).
local k = os.getenv("CC_FIGUR") or "1"
return {
	frames = 612,
	inputs = {
		{ 421, 540, { "p1_right" } },
		{ 541, 556, { "p1_up" } },
	},
	save_states = { [612] = "held" .. k .. "_kontakt" },
}
