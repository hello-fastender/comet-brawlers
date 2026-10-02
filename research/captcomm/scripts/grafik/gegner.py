#!/usr/bin/env python3
"""Pose-Galerie je Gegnertyp aus einem Durchlauf des Bots (bot.lua).

    python3 scripts/grafik/gegner.py PREFIX AUSGABE_PRAEFIX [--lag 1] [--max 40]

Der Lauf braucht Snapshots in jedem Frame (GFA_SNAP_EVERY=1) und im Bot-CSV
die Gegner-Slots 0..19 (GFA_WATCH mit s<n>_x, s<n>_z, s<n>_h, s<n>_anim,
s<n>_st, s<n>_typ, s<n>_maxlp; siehe gegner.sh). Fuer jeden Gegnertyp
(S+0x38) wird je Animationszeiger (S+0x1C) ein Bild ausgeschnitten: bevorzugt
ein Frame, in dem keine andere Figur naeher als 70 px steht und der Gegner
ganz im Bild ist. Die Kacheln sind nach Animationszeiger sortiert (die
Animationen eines Ablaufs liegen dadurch nebeneinander), 10 je Zeile.
Ausgabe: AUSGABE_PRAEFIX_<typ>.png und eine Zeile je Typ auf stdout.
"""
import argparse
import csv
import subprocess
from collections import defaultdict
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prefix")
    ap.add_argument("out")
    ap.add_argument("--lag", type=int, default=1)
    ap.add_argument("--max", type=int, default=40)
    a = ap.parse_args()
    pre = Path(a.prefix)
    rows = list(csv.DictReader(open(f"{pre}_bot.csv")))
    best = {}  # (typ, anim) -> (score, frame, slot)
    info = defaultdict(lambda: {"maxlp": set(), "frames": 0})
    for r in rows:
        f = int(r["frame"])
        cx, cy = int(r["camx"]), int(r["camy"])
        cy = cy - 0x10000 if cy >= 0x8000 else cy
        objs = [(int(r["px"]), int(r["pd"]))]
        live = []
        for n in range(20):
            st = int(r[f"s{n}_st"])
            if st not in (1, 2, 3):
                continue
            x, z = int(r[f"s{n}_x"]), int(r[f"s{n}_z"])
            objs.append((x, z))
            live.append((n, x, z))
        for n, x, z in live:
            typ = int(r[f"s{n}_typ"])
            anim = int(r[f"s{n}_anim"])
            sx = x - cx
            if not 48 <= sx <= 336:
                continue
            frei = min((abs(ox - x) + abs(oz - z) for ox, oz in objs if (ox, oz) != (x, z)), default=999)
            score = min(frei, 70)
            k = (typ, anim)
            info[typ]["maxlp"].add(int(r[f"s{n}_maxlp"]))
            info[typ]["frames"] += 1
            if k not in best or score > best[k][0]:
                best[k] = (score, f, n, sx, 234 - (z - cy), int(r[f"s{n}_h"]))
    for typ in sorted(info):
        keys = sorted(k for k in best if k[0] == typ)[: a.max]
        maxlp = max(info[typ]["maxlp"])
        bw, bh = (256, 224) if maxlp >= 72 else (144, 160)
        kacheln = []
        for i, k in enumerate(keys):
            score, f, n, sx, sy, h = best[k]
            snap = pre.parent / "snap" / f"{pre.name}_{f + a.lag:06d}.png"
            if not snap.exists():
                continue
            tmp = pre.parent / f"{pre.name}_g_{i:03d}.png"
            x0, y0 = sx - bw // 2, sy + 16 - bh
            subprocess.run(["convert", str(snap), "-background", "black", "-gravity", "northwest",
                            "-extent", f"{384 + 2 * bw}x{224 + 2 * bh}-{bw}-{bh}",
                            "-crop", f"{bw}x{bh}+{x0 + bw}+{y0 + bh}", "+repage",
                            "-gravity", "south", "-background", "#202020", "-splice", "0x14",
                            "-fill", "white", "-pointsize", "10", "-annotate", "+0+1",
                            f"{k[1] & 0xFFFFF:05x} f{f}", str(tmp)], check=True)
            kacheln.append(tmp)
        if not kacheln:
            continue
        ziel = f"{a.out}_{typ:06x}.png"
        reihen = [kacheln[i:i + 10] for i in range(0, len(kacheln), 10)]
        rtmp = []
        for j, rr in enumerate(reihen):
            t = pre.parent / f"{pre.name}_r_{j:02d}.png"
            subprocess.run(["convert", *map(str, rr), "+append", str(t)], check=True)
            rtmp.append(t)
        subprocess.run(["convert", *map(str, rtmp), "-background", "#404040", "-gravity", "west", "-append", ziel], check=True)
        for t in kacheln + rtmp:
            t.unlink()
        print(f"{ziel}: Typ {typ:#x}, Max-LP {sorted(info[typ]['maxlp'])}, {len(keys)} Posen"
              f"{' (gekuerzt)' if len([k for k in best if k[0] == typ]) > a.max else ''}")


if __name__ == "__main__":
    main()
