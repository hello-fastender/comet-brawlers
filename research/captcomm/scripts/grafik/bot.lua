-- bot.lua – Durchlauf-Bot fuer captcomm (MAME 0.264), Start ueber bot.sh.
-- Entstanden in der Grafik-Analyse (Workflow); spielt eine Stage mit Captain
-- Commando durch, damit Kamera-Schritte fuer Panoramen aufgenommen werden.
--
-- Liest eine Konfiguration (Lua-Tabelle) aus GFA_CFG. Felder (alle optional):
--   frames        maximale Frames (Standard 20000)
--   stage         Stage-Index 0..8: wird in Frame 2..10 nach FFA8CE geschrieben
--                 (EINGRIFF) und in Frame 50..55 die Figur bestaetigt. Nur ab
--                 Savestate "gfx_select" (Figurenwahl, Cursor auf Captain).
--   save_on_control  Name eines Savestates, der beim ersten steuerbaren Frame
--                 nach dem Stage-Intro (Aktion 2/4 -> 0) gespeichert wird
--   stop_on_control  nach diesem Savestate beenden (+ stop_delay Frames)
--   bot           true: Bot spielt (Gegner angreifen, sonst nach rechts)
--   hp_refill     true: Spieler-LP (P+0x40) jeden Frame auf 72 (EINGRIFF)
--   clear_after   Frames ohne Kamerafortschritt bei lebenden Gegnern, nach
--                 denen deren LP auf 1 gesetzt werden (EINGRIFF), Standard 900;
--                 nil/0 = nie
--   kill_after    Frames ohne Kamerafortschritt, nach denen sichtbare Gegner
--                 (Slots 0..19) per Status 0 entfernt werden (EINGRIFF), Standard nil.
--                 NICHT empfohlen: blockierte in Stage 4 die Kamerasperre dauerhaft
--   stop_on_stage_change  beenden, sobald FFA8CE wechselt und die neue Stage
--                 steuerbar ist (Savestate save_next, falls gesetzt)
--   save_next     Savestate-Name (darf %d fuer neuen Stage-Index+1 enthalten)
--   snap_name     Praefix fuer Snapshots (Standard CC_NAME)
--   snap_every    Snapshot alle N Frames (0 = aus)
--   snap_cam_step Snapshot, wenn Kamera-x eine neue Stufe von N px erreicht
--   save_cam_every Savestate <snap_name>_s<Stage>_cam<camx>, wenn Kamera-x eine
--                 neue Stufe von N px erreicht (nur mit eigenem Praefix benutzen!)
--   snaps         { [frame] = "name" } feste Snapshots
--   save_states   { [frame] = "name" } feste Savestates
--   inputs        { {von, bis, {namen}} } feste Eingaben (vor dem Bot, ueberschreibt nichts)
--   watch         zusaetzliche Spalten { {name=, addr=, size=, signed=} }
-- Ausgaben: <CC_OUT>_bot.csv (pro Frame), <CC_OUT>_events.txt (Ereignisse,
-- Eingriffe), Snapshots in logs/raw/snap, Savestates in logs/raw/sta/captcomm.
-- CSV-Spalten: frame, sf (Screen-Frame), stage (FFA8CE), camx/camy (FFA82E/FFA830),
-- px/pd/ph (Spieler x/Tiefe/Hoehe), pact (P+0A), pstat (P+4), php (LP vor Auffuellung),
-- face (P+5E), nen (Gegner im Bild), target/tx/td/thp (Zielslot, x, Tiefe, LP),
-- inputs (fuer den naechsten Frame gesetzt), ev (Ereignisse), danach cfg.watch.
-- Bildschirmposition: x_screen = x - camx, y_screen(Fusspunkt) = 234 - (Tiefe - camy) - Hoehe.
--
-- Bot-Strategie: naechsten Gegner (Slots 0..19, Status 1/3, S+5 = 1, Aktion != FFFF,
-- im Bild; dazu von Gegnern gerittene Roboter, Typ-Id 0x09ADEA in Slots 20..59)
-- in Tiefe ansteuern, in x auf 36 px heranlaufen, zum Gegner drehen, Schlag im
-- 4-Frame-Takt (2 gedrueckt / 2 los). Ohne Ziel: nach rechts; nach 240 Frames ohne
-- Kamerafortschritt Tiefe wechseln und alle 180 Frames springen. Ziel ohne LP-Verlust
-- seit 400 Frames -> 600 Frames ignorieren. Spieler 120 Frames unbewegt und Kamera
-- 300 Frames still -> 180 Frames in eine von 6 Richtungen laufen ("wander").
-- Deterministisch: gleicher Savestate + gleiche Konfiguration = gleicher Lauf.
--
-- RAM (bekannt): Spieler P = FFA990 (S+4 Status, +0A Aktion, +0E x, +12 Hoehe,
-- +16 Tiefe, +40 LP, +5E Blickrichtung 0x20 = rechts). Gegner-Slots
-- FFBC90 + n*0xC0, n 0..19. Stage-Index FFA8CE (0..8). Kamera x FFA82E,
-- Kamera y FFA830.

local cfg = dofile(assert(os.getenv("GFA_CFG"), "GFA_CFG fehlt"))
local out = assert(os.getenv("CC_OUT"), "CC_OUT fehlt")
local machine = manager.machine
local space = machine.devices[":maincpu"].spaces["program"]
local screen = machine.screens[":screen"]

local P = 0xFFA990
local A_STAGE, A_CAMX, A_CAMY = 0xFFA8CE, 0xFFA82E, 0xFFA830
local function r8(a) return space:read_u8(a) end
local function r16(a) return space:read_u16(a) end
local function r16s(a) local v = space:read_u16(a); if v >= 0x8000 then v = v - 0x10000 end; return v end

-- Eingabefelder
local fields = {}
for _, port in pairs(machine.ioport.ports) do
	for fname, field in pairs(port.fields) do fields[fname] = field end
end
local NAMES = {
	coin1 = "Coin 1", start1 = "1 Player Start", p1_up = "P1 Up", p1_down = "P1 Down",
	p1_left = "P1 Left", p1_right = "P1 Right", p1_attack = "P1 Button 1", p1_jump = "P1 Button 2",
}
if not fields[NAMES.start1] then NAMES.start1 = "P1 Start" end
local active = {}
local function apply(want)
	for k in pairs(active) do if not want[k] then fields[NAMES[k]]:clear_value() end end
	for k in pairs(want) do if not active[k] then fields[NAMES[k]]:set_value(1) end end
	active = want
end

local FRAMES = cfg.frames or 20000
local snap_name = cfg.snap_name or out:match("([^/]+)$")
local clear_after = cfg.clear_after == nil and 900 or cfg.clear_after

local csv = assert(io.open(out .. "_bot.csv", "w"))
local cols = { "frame", "sf", "stage", "camx", "camy", "px", "pd", "ph", "pact", "pstat", "php", "face", "nen", "target", "tx", "td", "thp", "inputs", "ev" }
for _, w in ipairs(cfg.watch or {}) do cols[#cols + 1] = w.name end
csv:write(table.concat(cols, ",") .. "\n")
local evf = assert(io.open(out .. "_events.txt", "w"))
local function event(f, s)
	evf:write(string.format("%d %s\n", f, s)); evf:flush()
end

local function read_watch(w)
	local v
	if w.size == 1 then v = r8(w.addr); if w.signed and v >= 0x80 then v = v - 0x100 end
	elseif w.size == 4 then v = space:read_u32(w.addr); if w.signed and v >= 0x80000000 then v = v - 0x100000000 end
	else v = r16(w.addr); if w.signed and v >= 0x8000 then v = v - 0x10000 end end
	return v
end

-- Gegnerliste: Slots 0..19, Status 1 oder 3, im Bild (mit Rand)
local function enemies(camx)
	local list = {}
	for n = 0, 19 do
		local S = 0xFFBC90 + n * 0xC0
		local st = r8(S + 4)
		if (st == 1 or st == 3) and r16(S + 0x0A) ~= 0xFFFF then
			local x = r16(S + 0x0E)
			local hp = r16s(S + 0x40)
			-- LP 0 heisst nicht tot (Tod erst beim naechsten Treffer); S+5 = 1 sichtbar
			if r8(S + 5) == 1 and x >= camx - 24 and x <= camx + 408 then
				list[#list + 1] = { n = n, S = S, x = x, d = r16(S + 0x16), h = r16s(S + 0x12), hp = hp, st = st }
			end
		end
	end
	-- Reitroboter (Typ-Id 0x09ADEA in Slots 20..59), wenn ein Gegner darin sitzt:
	-- Treffer gehen dann auf den Roboter, der Reiter hat Status 2
	for n = 20, 59 do
		local S = 0xFFBC90 + n * 0xC0
		if r8(S + 4) ~= 0 and r8(S + 5) == 1 and space:read_u32(S + 0x38) == 0x09ADEA then
			local x, d = r16(S + 0x0E), r16(S + 0x16)
			local px, pd = r16(P + 0x0E), r16(P + 0x16)
			local ridden_by_player = math.abs(x - px) < 4 and math.abs(d - pd) < 4
			if not ridden_by_player and x >= camx - 24 and x <= camx + 408 then
				list[#list + 1] = { n = n, S = S, x = x, d = d, h = r16s(S + 0x12), hp = r16s(S + 0x40), st = r8(S + 4) }
			end
		end
	end
	return list
end

local frame = 0
local done = false
local stage0 = nil
local intro_seen, controlled = false, false
local stop_at = nil
local last_cam, last_cam_frame = -1, 0
local cam_step_done = {}
local last_stage = nil
local stage_changed = false
local target = nil
local face_right = true
local cleared_at = -100000
local depth_block, ignore_depth_until = 0, 0
local last_px, last_pd, last_move_frame = -1, -1, 0
local wander_until, wander_dir = -1, 0
local ignore_slot, tgt_n, tgt_hp, tgt_since = {}, -1, 0, 0

local function fixed_inputs(f)
	local want = {}
	for _, step in ipairs(cfg.inputs or {}) do
		if f >= step[1] and f <= step[2] then for _, k in ipairs(step[3]) do want[k] = true end end
	end
	return want
end

local function finish()
	csv:close(); evf:close(); done = true; machine:exit()
end

local function on_frame()
	if done then return end
	frame = frame + 1
	local f = frame
	local sf = screen:frame_number()
	local ev = {}

	local stage = r8(A_STAGE)
	local camx, camy = r16(A_CAMX), r16(A_CAMY)
	local px, pd, ph = r16(P + 0x0E), r16(P + 0x16), r16s(P + 0x12)
	local pact, pstat, php = r16(P + 0x0A), r8(P + 4), r16s(P + 0x40)
	local face = r8(P + 0x5E)
	if last_stage == nil then last_stage = stage end

	-- Stagewechsel
	if stage ~= last_stage then
		event(f, string.format("stage %d -> %d (camx %d)", last_stage, stage, camx))
		ev[#ev + 1] = "stage"
		if stage < last_stage and not (cfg.stage and f <= 12) and cfg.stop_on_stage_drop ~= false then
			-- Stage-Index faellt: Spielende/Demo -> abbrechen (keine Savestates aus der Demo)
			event(f, "stage drop (Spielende?) -> end")
			finish()
			return
		end
		last_stage = stage
		if not (cfg.stage and f <= 12) then
			stage_changed = true
			intro_seen, controlled = false, false
		end
		last_cam, last_cam_frame = camx, f
	end

	-- Ab Savestate im Spiel: sofort steuerbar
	if f == 1 and not cfg.stage and pact == 0 and pstat == 1 then
		controlled = true
		last_cam, last_cam_frame = camx, f
		event(f, string.format("control (Savestate) stage %d px %d pd %d camx %d camy %d", stage, px, pd, camx, camy))
	end
	-- Steuerbarkeit nach Intro (Aktion 2 bzw. 4 -> 0)
	if (pact == 2 or pact == 4) and not controlled then intro_seen = true end
	if intro_seen and not controlled and pact == 0 and pstat == 1 then
		controlled = true
		last_cam, last_cam_frame = camx, f
		event(f, string.format("control stage %d px %d pd %d camx %d camy %d", stage, px, pd, camx, camy))
		ev[#ev + 1] = "control"
		if cfg.save_on_control and not stage_changed then
			machine:save(cfg.save_on_control)
			event(f, "save " .. cfg.save_on_control)
			screen:snapshot(string.format("%s_%06d.png", cfg.save_on_control, f))
			if cfg.stop_on_control then stop_at = f + (cfg.stop_delay or 0) end
		end
		if stage_changed and cfg.save_next then
			local nm = string.format(cfg.save_next, stage + 1)
			machine:save(nm)
			event(f, "save " .. nm)
			screen:snapshot(string.format("%s_%06d.png", nm, f))
		end
		if stage_changed and cfg.stop_on_stage_change then stop_at = f + (cfg.stop_delay or 0) end
	end

	-- Kamerafortschritt
	if camx ~= last_cam then
		if camx > last_cam then last_cam_frame = f end
		last_cam = camx
	end

	-- Gegner
	local list = enemies(camx)
	-- Ziel waehlen: naechster Gegner (Abstand x + 2*Tiefe)
	target = nil
	local best = 1e9
	for _, e in ipairs(list) do
		local dist = math.abs(e.x - px) + 2 * math.abs(e.d - pd)
		if dist < best and (ignore_slot[e.n] or 0) < f then best = dist; target = e end
	end
	-- Ziel ohne LP-Verlust trotz Angriffen -> 600 Frames ignorieren
	if target then
		if target.n ~= tgt_n or target.hp < tgt_hp then tgt_n, tgt_hp, tgt_since = target.n, target.hp, f end
		if f - tgt_since > 400 then
			ignore_slot[target.n] = f + 600
			event(f, string.format("ignoriere Slot %d (x %d d %d, LP %d unveraendert seit 400 Frames)", target.n, target.x, target.d, target.hp))
			tgt_n = -1
			target = nil
		end
	else
		tgt_n = -1
	end

	-- Eingriffe
	if cfg.hp_refill and php < 72 and php > 0 then
		space:write_u16(P + 0x40, 72)
	end
	if controlled and clear_after and clear_after > 0 and #list > 0 and f - last_cam_frame > clear_after and f - cleared_at > clear_after then
		for _, e in ipairs(list) do space:write_u16(e.S + 0x40, 1) end
		cleared_at = f
		event(f, string.format("EINGRIFF clear: %d Gegner LP -> 1 (camx %d seit %d Frames)", #list, camx, f - last_cam_frame))
		ev[#ev + 1] = "clear"
	end
	if controlled and (cfg.kill_after or 0) > 0 and f - last_cam_frame > cfg.kill_after and #list > 0 and f - cleared_at > 120 then
		for _, e in ipairs(list) do space:write_u8(e.S + 4, 0) end
		cleared_at = f
		event(f, string.format("EINGRIFF kill: %d Gegner Status -> 0", #list))
		ev[#ev + 1] = "kill"
	end

	-- Protokoll
	local inames = {}
	for k in pairs(active) do inames[#inames + 1] = k:gsub("p1_", "") end
	table.sort(inames)
	local row = { f, sf, stage, camx, camy, px, pd, ph, pact, pstat, php, face, #list,
		target and target.n or -1, target and target.x or "", target and target.d or "", target and target.hp or "",
		table.concat(inames, "|"), table.concat(ev, "|") }
	for _, w in ipairs(cfg.watch or {}) do row[#row + 1] = read_watch(w) end
	csv:write(table.concat(row, ",") .. "\n")

	-- Snapshots / Savestates
	if cfg.snaps and cfg.snaps[f] then screen:snapshot(string.format("%s_%06d.png", cfg.snaps[f], f)) end
	if cfg.snap_every and cfg.snap_every > 0 and f % cfg.snap_every == 0 then
		screen:snapshot(string.format("%s_%06d.png", snap_name, f))
	end
	if cfg.snap_cam_step and controlled then
		local k = stage .. ":" .. math.floor(camx / cfg.snap_cam_step)
		if not cam_step_done[k] then
			cam_step_done[k] = true
			screen:snapshot(string.format("%s_s%d_cam%05d_%06d.png", snap_name, stage + 1, camx, f))
		end
	end
	if cfg.save_states and cfg.save_states[f] then machine:save(cfg.save_states[f]) end
	if cfg.save_cam_every and controlled then
		local k = "S" .. stage .. ":" .. math.floor(camx / cfg.save_cam_every)
		if not cam_step_done[k] then
			cam_step_done[k] = true
			local nm = string.format("%s_s%d_cam%05d", snap_name, stage + 1, camx)
			machine:save(nm)
			event(f, "save " .. nm)
		end
	end
	if cfg.dump_frames and cfg.dump_frames[f] then
		-- Objekttabelle (Spieler FFA990 bis Slot 59) fuer einen Frame, Big Endian roh
		local df = assert(io.open(string.format("%s_slots_%06d.bin", out, f), "wb"))
		df:write(space:read_range(0xFFA990, 0xFFE98F, 8)); df:close()
	end

	if f >= FRAMES or (stop_at and f >= stop_at) then
		event(f, "end")
		finish()
		return
	end

	-- Eingaben fuer den naechsten Frame
	local want = fixed_inputs(f + 1)
	if cfg.stage and f + 1 >= 50 and f + 1 <= 55 then want.p1_attack = true end
	if cfg.bot and controlled then
		-- Bewegungskontrolle: Tiefe blockiert? Spieler steckt fest?
		if (active.p1_up or active.p1_down) and pd == last_pd and pact == 0 then
			depth_block = depth_block + 1
		else
			depth_block = 0
		end
		if depth_block >= 20 then ignore_depth_until = f + 120; depth_block = 0 end
		if px ~= last_px or pd ~= last_pd then last_move_frame = f end
		if wander_until < f and f - last_cam_frame > 300 and f - last_move_frame > 120 then
			wander_until = f + 180
			wander_dir = wander_dir % 6 + 1
			event(f, "wander " .. wander_dir)
		end
		if f <= wander_until then
			local D = { {"p1_right"}, {"p1_right", "p1_up"}, {"p1_left", "p1_up"}, {"p1_left"}, {"p1_left", "p1_down"}, {"p1_right", "p1_down"} }
			for _, k in ipairs(D[wander_dir]) do want[k] = true end
		elseif target then
			local dx = target.x - px
			local dd = target.d - pd
			if f < ignore_depth_until then dd = 0 end
			local side = (dx >= 0) and -1 or 1 -- Spieler links (-1) oder rechts (+1) vom Gegner
			local tx = target.x + side * 36
			if math.abs(dd) > 3 then
				if dd > 0 then want.p1_up = true else want.p1_down = true end
			end
			local adx = math.abs(dx)
			local facing_ok = (dx >= 0) == (face & 0x20 ~= 0)
			if adx <= 56 and math.abs(dd) <= 6 then
				if not facing_ok then
					if dx >= 0 then want.p1_right = true else want.p1_left = true end
				elseif f % 4 < 2 then
					want.p1_attack = true
				end
			elseif math.abs(px - tx) > 4 then
				if tx > px then want.p1_right = true else want.p1_left = true end
			end
		else
			want.p1_right = true
			-- Kein Fortschritt: Tiefe wechseln, ab und zu nach rechts springen
			if f - last_cam_frame > 240 then
				local ph2 = math.floor((f - last_cam_frame) / 120) % 4
				if ph2 == 1 then want.p1_up = true elseif ph2 == 3 then want.p1_down = true end
				if (f - last_cam_frame) % 180 < 3 then want.p1_jump = true end
			end
		end
	end
	last_px, last_pd = px, pd
	apply(want)

	-- Stage-Eingriff aus gfx_select
	if cfg.stage and f + 1 >= 2 and f + 1 <= 10 then
		space:write_u8(A_STAGE, cfg.stage)
		if f + 1 == 2 then event(f + 1, "EINGRIFF FFA8CE := " .. cfg.stage) end
	end
end

if emu.add_machine_frame_notifier then
	bot_frame_sub = emu.add_machine_frame_notifier(on_frame)
else
	emu.register_frame_done(on_frame)
end
