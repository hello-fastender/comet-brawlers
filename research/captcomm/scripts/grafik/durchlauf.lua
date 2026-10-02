-- durchlauf.lua – Konfiguration fuer bot.lua: eine Stage ab Savestate durchlaufen.
--
--   (Savestates stage1..stage9 aus scenarios/stage_start.lua)
--   cd research/captcomm
--   CC_NAME=pan_s3 GFA_CFG=scripts/grafik/durchlauf.lua GFA_CAM_STEP=64 scripts/grafik/bot.sh stage3
--
-- Umgebungsvariablen (alle optional):
--   GFA_FRAMES     Obergrenze Frames (Standard 20000; Stages brauchen 5000-16000)
--   GFA_CLEAR      Stillstand (Frames ohne Kamerafortschritt bei Gegnern im Bild),
--                  nach dem die LP der Gegner auf 1 gesetzt werden (EINGRIFF). 0 = nie. Standard 900
--   GFA_STOP       0 = nach Stagewechsel weiterspielen (sonst Ende 60 Frames nach
--                  Steuerbarkeit in der naechsten Stage)
--   GFA_SNAP_EVERY Snapshot alle N Frames (Standard 300, 0 = aus)
--   GFA_CAM_STEP   Snapshot je N px Kamerafortschritt (Panorama), Standard aus
--   GFA_SAVE_CAM   Savestate je N px Kamerafortschritt (Name <CC_NAME>_s<Stage>_cam<x>)
--   GFA_SAVE_NEXT  Savestate-Name fuer den Start der naechsten Stage (%d = Stage-Nr.)
--   GFA_WATCH      zusaetzliche Spalten "name:hexaddr:size[:s],..." z. B.
--                  "anim:FFA9AC:4,php2:FFA9D2:2:s"
-- Eingriffe stets in <CC_NAME>_events.txt (Zeilen "EINGRIFF"); LP-Auffuellung
-- (P+0x40 := 72, wenn 0 < LP < 72) ist immer an.
local name = os.getenv("CC_NAME") or "durchlauf"
local watch = {}
for item in (os.getenv("GFA_WATCH") or ""):gmatch("[^,]+") do
	local n, a, sz, sg = item:match("^([^:]+):(%x+):(%d)(:?s?)$")
	if n then watch[#watch + 1] = { name = n, addr = tonumber(a, 16), size = tonumber(sz), signed = sg == ":s" } end
end
local save_cam = tonumber(os.getenv("GFA_SAVE_CAM") or "0")
return {
	frames = tonumber(os.getenv("GFA_FRAMES") or "20000"),
	bot = true,
	hp_refill = true,
	clear_after = tonumber(os.getenv("GFA_CLEAR") or "900"),
	kill_after = 0,
	stop_on_stage_change = os.getenv("GFA_STOP") ~= "0",
	stop_delay = 60,
	save_next = os.getenv("GFA_SAVE_NEXT"),
	save_cam_every = save_cam > 0 and save_cam or nil,
	snap_every = tonumber(os.getenv("GFA_SNAP_EVERY") or "300"),
	snap_cam_step = tonumber(os.getenv("GFA_CAM_STEP") or "0") > 0 and tonumber(os.getenv("GFA_CAM_STEP")) or nil,
	snap_name = name,
	watch = watch,
}
