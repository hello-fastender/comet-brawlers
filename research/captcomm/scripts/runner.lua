-- runner.lua – Szenario-Runner fuer MAME (Set captcomm)
--
-- Wird per -autoboot_script geladen (siehe run.sh). Liest ein Szenario
-- (Lua-Tabelle) aus CC_SCENARIO, spielt dessen Eingaben framegenau ein und
-- protokolliert pro Frame:
--   <prefix>_inputs.csv  – welche Eingaben in welchem Frame aktiv waren
--   <prefix>_watch.csv   – ausgewaehlte Adressen (Szenario-Feld "watch")
--   <prefix>_ram.bin     – Vollabzug des Arbeitsspeichers (Feld "dump")
--   <prefix>_fields.txt  – alle Eingabefelder des Treibers (zur Orientierung)
--
-- Format von _ram.bin: Folge von Datensaetzen
--   uint32 LE  lokaler Frame
--   uint32 LE  Frame-Nummer des Screens (MAME-intern)
--   N Bytes    Speicher von dump.start bis dump.stop (Adressreihenfolge)
-- Der Header (_ram.hdr) haelt start/stop fest, damit die Python-Werkzeuge
-- Adressen zurueckrechnen koennen.
--
-- Eingriffe (nur fuer gekennzeichnete Experimente): Das Szenario-Feld
-- "pokes" = { { von, bis, addr, wert [, breite] }, ... } schreibt den Wert
-- vor jedem Frame von..bis in den Arbeitsspeicher (breite 1 oder 2, Standard
-- 1). Protokolliert wird jeweils der Zustand am Frame-Ende.
--
-- Zeitbezug: "lokaler Frame" zaehlt die Frame-Callbacks seit Skriptstart
-- (Frame 1 = erster Callback). Eingaben, die im Callback von Frame f gesetzt
-- werden, wirken ab Frame f+1. Die Szenario-Angaben {von, bis} beziehen sich
-- auf die Frames, in denen die Eingabe gedrueckt *ist*; der Runner setzt sie
-- deshalb einen Callback vorher.

local scenario_path = assert(os.getenv("CC_SCENARIO"), "CC_SCENARIO fehlt")
local out_prefix = assert(os.getenv("CC_OUT"), "CC_OUT fehlt")
local sc = dofile(scenario_path)

local machine = manager.machine
local space = machine.devices[":maincpu"].spaces["program"]
local screen = machine.screens[":screen"]

-- Eingabefelder nach Namen indizieren und zur Orientierung auflisten
local fields = {}
do
	local f = assert(io.open(out_prefix .. "_fields.txt", "w"))
	for ptag, port in pairs(machine.ioport.ports) do
		for fname, field in pairs(port.fields) do
			fields[fname] = field
			f:write(string.format("%s\t%s\n", ptag, fname))
		end
	end
	f:close()
end

-- Logische Namen fuer Szenarien; MAME hat Feldnamen ueber Versionen
-- geaendert, daher mehrere Kandidaten. Direkte Feldnamen gehen ebenfalls.
local ALIASES = {
	coin1 = { "Coin 1" },
	start1 = { "P1 Start", "1 Player Start" },
	p1_up = { "P1 Up" },
	p1_down = { "P1 Down" },
	p1_left = { "P1 Left" },
	p1_right = { "P1 Right" },
	p1_attack = { "P1 Button 1" },
	p1_jump = { "P1 Button 2" },
}

local function resolve(name)
	if fields[name] then return name end
	for _, cand in ipairs(ALIASES[name] or {}) do
		if fields[cand] then return cand end
	end
	error("Unbekanntes Eingabefeld: " .. name)
end

for _, step in ipairs(sc.inputs or {}) do
	for i, name in ipairs(step[3]) do
		step[3][i] = resolve(name)
	end
end

-- Eingaben, die in Frame f gedrueckt sein sollen
local function wanted_inputs(f)
	local set = {}
	for _, step in ipairs(sc.inputs or {}) do
		if f >= step[1] and f <= step[2] then
			for _, name in ipairs(step[3]) do set[name] = true end
		end
	end
	return set
end

-- Ausgabedateien
local inputs_csv = assert(io.open(out_prefix .. "_inputs.csv", "w"))
inputs_csv:write("frame,screen_frame,inputs\n")

local watch = sc.watch or {}
local watch_csv
if #watch > 0 then
	watch_csv = assert(io.open(out_prefix .. "_watch.csv", "w"))
	local cols = { "frame", "screen_frame" }
	for _, w in ipairs(watch) do cols[#cols + 1] = w.name end
	watch_csv:write(table.concat(cols, ",") .. "\n")
end

local dump = sc.dump
local ram_bin
if dump then
	ram_bin = assert(io.open(out_prefix .. "_ram.bin", "wb"))
	local hdr = assert(io.open(out_prefix .. "_ram.hdr", "w"))
	hdr:write(string.format("start=0x%X\nstop=0x%X\n", dump.start, dump.stop))
	hdr:close()
end

local function read_watch(w)
	local v
	if w.size == 1 then
		v = space:read_u8(w.addr)
		if w.signed and v >= 0x80 then v = v - 0x100 end
	elseif w.size == 4 then
		v = space:read_u32(w.addr)
		if w.signed and v >= 0x80000000 then v = v - 0x100000000 end
	else
		v = space:read_u16(w.addr)
		if w.signed and v >= 0x8000 then v = v - 0x10000 end
	end
	return v
end

local frame = 0
local active = {}
local done = false -- machine:exit() greift erst verzoegert

local function close_all()
	inputs_csv:close()
	if watch_csv then watch_csv:close() end
	if ram_bin then ram_bin:close() end
end

local function on_frame()
	if done then return end
	frame = frame + 1
	local sf = screen:frame_number()

	-- Protokoll des gerade beendeten Frames
	local names = {}
	for name in pairs(active) do names[#names + 1] = name end
	table.sort(names)
	inputs_csv:write(string.format("%d,%d,%s\n", frame, sf, table.concat(names, "|")))

	if watch_csv then
		local row = { frame, sf }
		for _, w in ipairs(watch) do row[#row + 1] = read_watch(w) end
		watch_csv:write(table.concat(row, ",") .. "\n")
	end

	if ram_bin and frame >= (dump.from or 1) and frame <= (dump.to or math.huge)
			and (frame - (dump.from or 1)) % (dump.every or 1) == 0 then
		ram_bin:write(string.pack("<I4I4", frame, sf))
		ram_bin:write(space:read_range(dump.start, dump.stop, 8))
	end

	if sc.snaps and sc.snaps[frame] then
		screen:snapshot(string.format("%s_%06d.png", sc.snaps[frame], frame))
	end
	if sc.save_states and sc.save_states[frame] then
		-- Nur der Name: MAME (0.264) ergaenzt selbst "<state_directory>/captcomm/"
		-- und ".sta", genau wie beim Laden mit "-state <name>"
		machine:save(sc.save_states[frame])
	end

	if frame >= sc.frames then
		close_all()
		done = true
		machine:exit()
		return
	end

	-- Eingaben fuer den naechsten Frame setzen
	local want = wanted_inputs(frame + 1)
	for name in pairs(active) do
		if not want[name] then fields[name]:clear_value() end
	end
	for name in pairs(want) do
		if not active[name] then fields[name]:set_value(1) end
	end
	active = want

	-- Eingriffe fuer den naechsten Frame
	for _, pk in ipairs(sc.pokes or {}) do
		if frame + 1 >= pk[1] and frame + 1 <= pk[2] then
			if (pk[5] or 1) == 2 then space:write_u16(pk[3], pk[4])
			else space:write_u8(pk[3], pk[4]) end
		end
	end
end

-- Referenz halten, sonst wird die Anmeldung vom GC aufgehoben
if emu.add_machine_frame_notifier then
	cc_frame_sub = emu.add_machine_frame_notifier(on_frame)
else
	emu.register_frame_done(on_frame)
end
