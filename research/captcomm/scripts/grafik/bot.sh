#!/usr/bin/env bash
# Startet MAME headless mit dem Durchlauf-Bot bot.lua (statt runner.lua).
#
#   CC_NAME=pan_s3 GFA_CFG=scripts/grafik/durchlauf.lua scripts/grafik/bot.sh stage3
#
# Ausgaben: logs/raw/<CC_NAME>_bot.csv (pro Frame), logs/raw/<CC_NAME>_events.txt
# (Ereignisse und Eingriffe), Snapshots in logs/raw/snap/, Savestates in
# logs/raw/sta/captcomm/. Gleiche MAME-Argumente wie scripts/run.sh.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
base="$(cd "$here/../.." && pwd)"
repo="$(cd "$base/../.." && pwd)"
mame="${MAME:-$(command -v mame || echo /usr/games/mame)}"
state="${1:-}"
: "${CC_NAME:?CC_NAME fehlt}"
: "${GFA_CFG:?GFA_CFG fehlt}"
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
	-autoboot_script "$here/bot.lua"
)
[ -n "$state" ] && args+=(-state "$state")
GFA_CFG="$(realpath "$GFA_CFG")" CC_OUT="$raw/$CC_NAME" "$mame" "${args[@]}" 2>/dev/null
