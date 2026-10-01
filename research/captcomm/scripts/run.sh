#!/usr/bin/env bash
# Startet MAME headless mit runner.lua und einem Szenario.
#
#   scripts/run.sh scenarios/attract.lua            # ab Kaltstart
#   scripts/run.sh scenarios/walk.lua ingame        # ab Savestate "ingame"
#
# Ausgaben landen in logs/raw/ (git-ignoriert). MAME-Konfiguration,
# Savestates und Snapshots ebenfalls dort, damit nichts davon ins Repo geraet.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
base="$(cd "$here/.." && pwd)"
repo="$(cd "$base/../.." && pwd)"
# Debian/Ubuntu installieren nach /usr/games, das oft nicht im PATH liegt
mame="${MAME:-$(command -v mame || echo /usr/games/mame)}"

scenario="$(realpath "$1")"
state="${2:-}"
name="$(basename "$scenario" .lua)"
raw="$base/logs/raw"
mkdir -p "$raw"

args=(
	captcomm
	-rompath "$repo/roms"
	-noreadconfig
	-video none -sound none -nothrottle
	-skip_gameinfo
	-cfg_directory "$raw/cfg"
	-nvram_directory "$raw/nvram"
	-state_directory "$raw/sta"
	-snapshot_directory "$raw/snap"
	-autoboot_delay 0
	-autoboot_script "$here/runner.lua"
)
# Geprueft mit MAME 0.264: Der Savestate ist vor dem ersten Frame-Callback
# geladen; die Screen-Frame-Spalte setzt die des speichernden Laufs lueckenlos
# fort (Savestate in Frame 2400/Screen 2399 -> Frame 1/Screen 2400).
[ -n "$state" ] && args+=(-state "$state")

CC_SCENARIO="$scenario" CC_OUT="$raw/$name" "$mame" "${args[@]}"
