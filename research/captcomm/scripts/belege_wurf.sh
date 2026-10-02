#!/usr/bin/env bash
# Wuerfe der Figur (Nachtrag): MAME-Laeufe mit griff.lua, Auswertung mit
# messen_a5.py wurf und wurfablauf nach logs/wurf.csv; loescht danach die
# eigenen Rohabzuege. Voraussetzung: Savestates kontakt, kontakt_b, anlauf,
# anlauf_c (scripts/laeufe_a5.sh, scenarios/anlauf_c.lua). Dauer: ~1 min.
# Wuerfe der Gegner gegen die Figur gibt es bei den normalen Gegnern nicht; ihr
# Umwerfen (Abschnitt 8) ist ein Treffer mit Umwerf-Eigenschaft ohne Halten.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/griff.lua
out=logs/wurf.csv
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }
g() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="wr_$name" scripts/run.sh $sc "$state"; }

# kontakt: Figur laeuft ab Frame 2 nach rechts (6 Frames), Griff in Frame 6
# 1) Richtung + Angriff in Frame 15 (Figur blickt nach rechts, Gegner rechts)
for k in p1_left p1_up p1_down p1_up+p1_left p1_down+p1_left p1_right p1_up+p1_right p1_down+p1_right; do
	g "a_dir_${k//p1_/}" kontakt CC_DAUER=6 CC_FRAMES=100 CC_IN="15:$k+p1_attack"
done
g a_knie kontakt CC_DAUER=6 CC_FRAMES=60 CC_IN="15:p1_attack"
# 2) Zeitpunkt der Wurfeingabe nach dem Griff (Haltedauer 60 Frames); Laufen
#    nur bis Frame 6, sonst waere in Frame 7 links+rechts gedrueckt (= Knie)
for t in 7 8 9 11 30 66 67; do
	g a_zeit$t kontakt CC_DAUER=5 CC_FRAMES=$((t + 85)) CC_IN="$t:p1_left+p1_attack"
done
g a_halten kontakt CC_DAUER=6 CC_FRAMES=90
# 3) Kniestoesse vor dem Wurf (naechste Eingabe ab Knie+18, +17 wird ignoriert)
g a_knie1_wurf kontakt CC_DAUER=6 CC_FRAMES=125 CC_IN="15:p1_attack;33:p1_left+p1_attack"
g a_knie1_frueh kontakt CC_DAUER=6 CC_FRAMES=125 CC_IN="15:p1_attack;32:p1_left+p1_attack"
g a_knie2_wurf kontakt CC_DAUER=6 CC_FRAMES=140 CC_IN="15:p1_attack;33:p1_attack;51:p1_left+p1_attack"
g a_knie3 kontakt CC_DAUER=6 CC_FRAMES=140 CC_IN="15:p1_attack;33:p1_attack;51:p1_attack"
# 4) Sprung und Sprung+Angriff im Griff
g a_sprung kontakt CC_DAUER=6 CC_FRAMES=80 CC_IN="15:p1_jump"
g a_sprung_rechts kontakt CC_DAUER=6 CC_FRAMES=80 CC_IN="15:p1_jump+p1_right"
g a_spezial kontakt CC_DAUER=6 CC_FRAMES=100 CC_IN="15:p1_jump+p1_attack"
# 5) Figur blickt nach links: EINGRIFF nur in Frame 2 (Gegner 46 px links der
#    Figur abgesetzt), danach Laufen nach links und Griff ohne Eingriff
for k in p1_left p1_right p1_up p1_down; do
	g "bl_${k#p1_}" kontakt_b CC_SLOT=17 CC_DIR=p1_left CC_DAUER=6 CC_POKE_BIS=2 CC_DX=-46 CC_DZ=2 \
		CC_FRAMES=95 CC_IN="10:$k+p1_attack"
done
# 6) weitere Ausgangslagen ohne Eingriff (Gegner laeuft heran bzw. 30-LP-Gegner)
for k in p1_left p1_right; do
	g "an_${k#p1_}" anlauf CC_DAUER=25 CC_FRAMES=110 CC_IN="30:$k+p1_attack"
	g "ac_${k#p1_}" anlauf_c CC_SLOT=17 CC_DAUER=25 CC_FRAMES=110 CC_IN="29:$k+p1_attack"
	g "b_${k#p1_}" kontakt_b CC_SLOT=17 CC_DAUER=10 CC_FRAMES=95 CC_IN="14:$k+p1_attack"
done
# 7) geworfener Gegner trifft einen zweiten (kontakt_b: WOOKY in Slot 16)
g b_geschoss21 kontakt_b CC_SLOT=17 CC_DAUER=19 CC_FRAMES=110 CC_IN="21-22:p1_right+p1_attack"
g b_geschoss40 kontakt_b CC_SLOT=17 CC_DAUER=19 CC_FRAMES=130 CC_IN="40-41:p1_right+p1_attack"

# 8) Figur wird umgeworfen (ohne Eingriff): passiv ab kontakt (WOOKY) und
#    kontakt_b (30-LP-Gegner), dazu Tastendruecke beim Liegen ab Frame 210
mash() { local step=$1 f; for f in $(seq 210 "$step" 300); do printf "%d-%d:%s;" "$f" "$f" "${2:-p1_attack}"; done; }
g u_passiv kontakt CC_DAUER=0 CC_FRAMES=300
g u_b_passiv kontakt_b CC_SLOT=17 CC_DAUER=0 CC_FRAMES=330
g u_mash2 kontakt CC_DAUER=0 CC_FRAMES=300 CC_IN="$(mash 2)"
g u_mash4 kontakt CC_DAUER=0 CC_FRAMES=300 CC_IN="$(mash 4)"
g u_mash8 kontakt CC_DAUER=0 CC_FRAMES=300 CC_IN="$(mash 8)"
g u_mash_wechsel kontakt CC_DAUER=0 CC_FRAMES=300 CC_IN="$(mash 2)$(for f in $(seq 211 2 299); do printf "%d-%d:p1_jump;" $f $f; done)"
uruns=$(ls logs/raw/wr_u_*_ram.bin | sed 's/_ram.bin$//' | sort)
python3 scripts/messen_a5.py umfallen $uruns > logs/wurf.tmp3

runs=$(ls logs/raw/wr_*_ram.bin | grep -v '/wr_u_' | sed 's/_ram.bin$//' | sort)
python3 scripts/messen_a5.py wurf $runs > logs/wurf.tmp1
python3 scripts/messen_a5.py wurfablauf $runs > logs/wurf.tmp2
{
	echo "# Wuerfe der Figur (Captain Commando) aus dem Griff, griff.lua. Laufnamen: wr_a_* ab kontakt"
	echo "# (WOOKY, 16 LP, Slot 18, Griff in Frame 6), wr_b_* ab kontakt_b (30 LP, Slot 17), wr_bl_* ab"
	echo "# kontakt_b mit Blick nach links (EINGRIFF nur in Frame 2: Gegner links abgesetzt), wr_an_*"
	echo "# ab anlauf, wr_ac_* ab anlauf_c. Positionen 16.16; rel = Frame minus Aktionseingabe."
	echo "# Zusammenfassung"
	python3 - logs/wurf.tmp1 logs/wurf.tmp2 <<'PY'
import csv, sys
from collections import defaultdict
w = {r["lauf"]: r for r in csv.DictReader(open(sys.argv[1])) if (r.get("schaden_frame") or "").isdigit()}
ev = defaultdict(list)
for r in csv.DictReader(open(sys.argv[2])):
    ev[r["lauf"]].append(r)
def first(lauf, art):
    return next((r for r in ev[lauf] if r["ereignis"].startswith(art)), None)
# Richtung -> Wurfrichtung (Figur blickt nach rechts bzw. links)
for pre, blick in (("wr_a_dir_", "rechts"), ("wr_bl_", "links")):
    teile = []
    for lauf, r in sorted(w.items()):
        if lauf.startswith(pre):
            e = float(r["ende_dx_zur_figur"])
            vor = (e > 0) == (blick == "rechts")
            teile.append(f"{r['richtung']} {'vorwaerts' if vor else 'rueckwaerts'} {e:+.3f}")
    print(f"Blick {blick}: " + "; ".join(teile))
# Zeitachse und Weite aller Wuerfe (rel zur Eingabe), ohne Hindernis
# kontakt_b vorwaerts: Gegner stoesst bei x 1019 an ein Hindernis der Stage
WAND = ("wr_b_right", "wr_b_geschoss21", "wr_b_geschoss40")
zeit = defaultdict(set)
weiten = []
for lauf, r in w.items():
    if lauf in WAND:
        continue
    f0 = int(r["wurf_eingabe"])
    for k, src in (("schaden", "schaden_frame"), ("loslassen", "loslassen"), ("boden", "landung"), ("ruhe", "ruhe_ab")):
        if r[src] not in ("", "-"):
            zeit[k].add(int(r[src]) - f0)
    zeit["schadenswert"].add(int(r["schaden"]))
    fr = next((e for e in ev[lauf] if e["ereignis"] == "figur_status 2->1" and int(e["frame"]) > f0), None)
    if fr:
        zeit["figur_frei"].add(int(fr["frame"]) - f0)
    if lauf not in WAND:
        weiten.append(abs(float(r["ende_dx_zur_figur"])))
print("Wurf (rel zur Eingabe), alle Laeufe ausser " + ", ".join(WAND) + ": "
      + "; ".join(f"{k} {sorted(v)}" for k, v in zeit.items()))
print(f"Ruhelage zur Figur ohne Hindernis: {min(weiten):.3f} bis {max(weiten):.3f} px ({len(weiten)} Wuerfe)")
# Knie, Sprung, Spezial, Halten
for lauf in ("wr_a_knie", "wr_a_knie1_wurf", "wr_a_knie1_frueh", "wr_a_knie2_wurf", "wr_a_knie3", "wr_a_halten",
             "wr_a_zeit67", "wr_a_sprung", "wr_a_sprung_rechts", "wr_a_spezial", "wr_b_geschoss21", "wr_b_geschoss40"):
    es = [f"{e['rel']} {e['ereignis']}{(' ' + e['slot']) if e['slot'] else ''}{(' ' + e['wert']) if e['wert'] else ''}"
          for e in ev[lauf] if e["ereignis"] != "griff"]
    print(f"{lauf}: " + "; ".join(es))
PY
	echo "# Figur umgeworfen (messen_a5.py umfallen): wr_u_*; mashN = Angriff in jedem N-ten Frame ab 210,"
	echo "# mash_wechsel = Angriff und Sprung abwechselnd in jedem Frame"
	cat logs/wurf.tmp3
	echo "# messen_a5.py wurf"
	cat logs/wurf.tmp1
	echo "# messen_a5.py wurfablauf"
	cat logs/wurf.tmp2
} > $out
rm -f logs/wurf.tmp1 logs/wurf.tmp2 logs/wurf.tmp3 logs/raw/wr_*_ram.bin
wc -l $out
