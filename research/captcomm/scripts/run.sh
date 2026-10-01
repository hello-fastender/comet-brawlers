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
mame="${MAME:-mame}"

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
# Unsicher: ob der Savestate schon vor dem ersten Frame-Callback geladen ist,
# muss sich am ersten Lauf zeigen (Screen-Frame-Spalte im Log pruefen).
[ -n "$state" ] && args+=(-state "$state")

CC_SCENARIO="$scenario" CC_OUT="$raw/$name" "$mame" "${args[@]}"
