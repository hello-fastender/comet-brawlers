-- greichweite_bot.lua: Konfiguration fuer scripts/grafik/bot.lua (nicht fuer
-- runner.lua). Der Durchlauf-Bot spielt Stage 1 ab Savestate "stage1" bis in
-- die Bossarena und legt dort Savestates an, sobald der erste DICK (Typ
-- 0x64E7A) erschienen ist. Start:
--   CC_NAME=greichweite_bot GFA_CFG=scripts/scenarios/greichweite_bot.lua \
--     scripts/grafik/bot.sh stage1
-- EINGRIFFE (wie scripts/grafik/durchlauf.lua): LP der Figur jeden Frame auf
-- 72; nach 900 Frames ohne Kamerafortschritt LP der Gegner im Bild auf 1
-- (in diesem Lauf einmal, Frame 6001: ein WOOKY der Bossarena; danach
-- erscheint DICK in Slot 18 in Frame 6002, kalibriert 2026-10-02).
-- Savestates: greichweite_dick (Frame 6010) und greichweite_dick2 (6200).
return {
	frames = tonumber(os.getenv("GFA_FRAMES") or "6200"),
	bot = true,
	hp_refill = true,
	clear_after = 900,
	kill_after = 0,
	snap_every = 0,
	save_states = { [6010] = "greichweite_dick", [6200] = "greichweite_dick2" },
}
