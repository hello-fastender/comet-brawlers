#!/usr/bin/env bash
# Reichweite der Kettenstufen 2-4 (Nachtrag): erzeugt die MAME-Laeufe mit
# kette.lua (gekennzeichneter EINGRIFF, plus natuerliche Laeufe ohne
# Eingriff), schreibt logs/kette_reichweite.csv und loescht danach die
# eigenen Rohabzuege (Platz). Voraussetzung: Savestates kontakt, kontakt_b
# (scripts/laeufe_a5.sh). Dauer: ~2 min.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/kette.lua
out=logs/kette_reichweite.csv
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }
k() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="kr_$name" scripts/run.sh $sc "$state"; }

# Validierung an Stufe 1 (Gegner laeuft im Frame ~2 px weiter: Ende = CC_DX - 2)
for d in 86 87 88 89; do k s1_a_dx$d kontakt CC_STUFE=1 CC_DX=$d; done
# x-Reichweite je Stufe, beide Gegnertypen
for d in 85 86 87 88 89; do k s2_a_dx$d kontakt CC_STUFE=2 CC_DX=$d; k s2_b_dx$d kontakt_b CC_STUFE=2 CC_DX=$d CC_SLOT=17; done
for d in 89 90 91 92 93; do k s3_a_dx$d kontakt CC_STUFE=3 CC_DX=$d; k s3_b_dx$d kontakt_b CC_STUFE=3 CC_DX=$d CC_SLOT=17; done
for d in 98 99 100 101 102; do k s4_a_dx$d kontakt CC_STUFE=4 CC_DX=$d; k s4_b_dx$d kontakt_b CC_STUFE=4 CC_DX=$d CC_SLOT=17; done
# Tiefentoleranz je Stufe (dx 60)
for s in 2 3 4; do
	for z in -14 -13 -12 -11 11 12 13 14; do n=${z/-/m}; k s${s}_a_dz$n kontakt CC_STUFE=$s CC_DX=60 CC_DZ=$z; done
	for z in -13 -12 12 13; do n=${z/-/m}; k s${s}_b_dz$n kontakt_b CC_STUFE=$s CC_DX=60 CC_DZ=$z CC_SLOT=17; done
done
# Aktive Frames: Gegner bis Druck+n 200 px entfernt, danach bei dx 60
for s in 2 3 4; do for n in 0 1 2 3 4 5 6 7 8; do k s${s}_a_fern$n kontakt CC_STUFE=$s CC_DX=60 CC_FERN=$n; done; done
# zweites aktives Fenster des Tritts (Stufe 4)
for n in 12 13 14 15 16 17 18 19 20; do k s4_b_fern$n kontakt_b CC_STUFE=4 CC_DX=60 CC_FERN=$n CC_SLOT=17 CC_POKE_BIS=24; done
# Kombo-Fenster je Stufe: Druck der Stufe n Frames nach dem Treffer der Vorstufe
# (ohne Eingriff; die Vorstufen im Standardabstand 14)
for s in 2 3 4; do for a in 9 10 11 12 25 26 27 28; do
	k fen_a_s${s}_l$a kontakt CC_STUFE=$s CC_ABSTAND_LETZT=$a
	k fen_b_s${s}_l$a kontakt_b CC_STUFE=$s CC_ABSTAND_LETZT=$a CC_SLOT=17
done; done
# ohne Eingriff: Tiefe vor Stufe 1 einstellen (Gegner steht in der Kette still)
k nat_a kontakt CC_STUFE=4
k nat_b kontakt_b CC_STUFE=4 CC_SLOT=17
k nat_a_vm2 kontakt CC_STUFE=4 CC_VERT=-2
k nat_a_vm3 kontakt CC_STUFE=4 CC_VERT=-3
k nat_b_v13 kontakt_b CC_STUFE=4 CC_VERT=13 CC_SLOT=17

{
	echo "# Kettenstufen 2-4: je Frame nach dem Druck der gepruefenten Stufe (D = Druckframe) Abstand dx und"
	echo "# Tiefe dz des Gegners (ganzzahlige Positionen am Frame-Ende) und Treffer. kr_*_a: Savestate kontakt"
	echo "# (16 LP), kr_*_b: kontakt_b (30 LP). dxNN/dzNN/fernN = gesetzter Abstand bzw. Gegner bis D+n entfernt"
	echo "# (EINGRIFF, kette.lua). kr_nat_*: ohne Eingriff, nur die Tiefe vor Stufe 1 eingestellt."
	echo "# kr_fen_*_s<n>_l<a>: ohne Eingriff, Druck der Stufe n a Frames nach dem Treffer h der Vorstufe."
	runs=$(ls logs/raw/kr_*_ram.bin | sed 's/_ram.bin$//' | sort -V)
	python3 scripts/messen_a5.py kette --bis 24 $runs > logs/kette.tmp
	echo "# Zusammenfassung (Reichweite: Laeufe mit Eingriff; Kombo-Fenster: kr_fen_*, ohne Eingriff)"
	python3 - logs/kette.tmp <<'PY'
import csv, re, sys
from collections import defaultdict
# Je Lauf: Lage des Gegners im ersten aktiven Frame der Stufe (bis Druck+12 per
# Eingriff festgehalten) und ob die gedrueckte Stufe trifft.
START = {"1": 2, "2": 3, "3": 4, "4": 3}
rows = list(csv.DictReader(open(sys.argv[1])))
by = defaultdict(list)
for r in rows:
    by[r["lauf"]].append(r)
res = defaultdict(lambda: defaultdict(list))
for lauf, rs in by.items():
    s = rs[0]["stufe_gedrueckt"]
    art = re.search(r"_(dx|dz|fern)", lauf)
    if not art:
        continue
    rel = {int(r["rel"][2:]): r for r in rs}
    r0 = rel[START[s]]
    # dx/dz: nur solange der Eingriff den Gegner haelt (bis D+12); danach laeuft
    # er selbst weiter und kann ins zweite Fenster des Tritts (D+17..) geraten
    bis = 24 if art.group(1) == "fern" else 12
    hits = sorted(n for n, r in rel.items() if r["treffer"] == "ja" and r["stufe_ram"] == s and n <= bis)
    res[s][art.group(1)].append((int(r0["dx"]), abs(int(r0["dz"])), hits, lauf))
for s in sorted(res):
    t = res[s]
    out = [f"Stufe {s}:"]
    if t["dx"]:
        hx = max(d for d, _, h, _ in t["dx"] if h)
        mx = min((d for d, _, h, _ in t["dx"] if not h), default=None)
        out.append(f"x-Abstand mit Treffer bis {hx}, ohne Treffer ab {mx};")
    if t["dz"]:
        hz = max(z for _, z, h, _ in t["dz"] if h)
        mz = min((z for _, z, h, _ in t["dz"] if not h), default=None)
        out.append(f"|dz| mit Treffer bis {hz}, ohne Treffer ab {mz};")
    if t["fern"]:
        act = sorted({h[0] for _, _, h, _ in t["fern"] if h})
        out.append(f"erster Treffer bei spaetem Herankommen in D+{act}")
    print(" ".join(out))
# Kombo-Fenster: Lauf kr_fen_<a|b>_s<n>_l<abstand>
fen = defaultdict(lambda: defaultdict(set))
for lauf, rs in by.items():
    m = re.search(r"_fen_[ab]_s(\d)_l(\d+)$", lauf)
    if not m:
        continue
    s, a = m.group(1), int(m.group(2))
    st = {r["stufe_ram"] for r in rs if r["treffer"] == "ja"}
    fen[s][a].add("angenommen" if s in st else "neue Kette" if "1" in st else "verworfen")
for s in sorted(fen):
    print(f"Kombo-Fenster Stufe {s}: " + ", ".join(f"h+{a} {'/'.join(sorted(v))}" for a, v in sorted(fen[s].items())))
PY
	echo "# Einzelwerte"
	cat logs/kette.tmp
	rm -f logs/kette.tmp
} > $out

rm -f logs/raw/kr_*_ram.bin
wc -l $out
