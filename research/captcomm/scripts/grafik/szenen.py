#!/usr/bin/env python3
"""Szenenbilder einer Stage aus einem Bot-Lauf mit GFA_SNAP_EVERY.

    python3 scripts/grafik/szenen.py PREFIX STAGE AUSGABE_PRAEFIX [--anzahl 6]

Waehlt aus den Snapshots <CC_NAME>_<frame>.png der Stage (Index im Bot-CSV,
Spielfigur aktiv) --anzahl Bilder, gleichmaessig ueber die Kamerastrecke
verteilt; Bilder mit mehr als 20 % fast schwarzen Pixeln (Blenden,
Szenenwechsel) und der Abspann (Kamera springt um mehr als 1000 px zurueck)
werden uebersprungen. Kopiert sie
als AUSGABE_PRAEFIX_<k>.png (k = 1..n) und gibt Frame und Kamera aus.
"""
import argparse
import csv
import re
import shutil
import subprocess
from pathlib import Path


def schwarzanteil(p):
    out = subprocess.run(["convert", str(p), "-colorspace", "gray", "-threshold", "10%",
                          "-format", "%[fx:1-mean]", "info:"], capture_output=True, text=True, check=True).stdout
    return float(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prefix")
    ap.add_argument("stage", type=int)
    ap.add_argument("out")
    ap.add_argument("--anzahl", type=int, default=6)
    a = ap.parse_args()
    pre = Path(a.prefix)
    rows = {int(r["frame"]): r for r in csv.DictReader(open(f"{pre}_bot.csv"))}
    # Ende: erster Ruecksprung der Kamera um mehr als 1000 px (Abspann)
    ende, prev = None, None
    for f in sorted(rows):
        cx = int(rows[f]["camx"])
        if prev is not None and cx < prev - 1000:
            ende = f
            break
        prev = cx
    kand = []
    for p in sorted((pre.parent / "snap").glob(f"{pre.name}_[0-9]*.png")):
        f = int(re.search(r"_(\d+)\.png$", p.name).group(1))
        r = rows.get(f)
        if r is None or int(r["stage"]) != a.stage - 1 or int(r["pstat"]) == 0 or (ende and f >= ende):
            continue
        kand.append((f, int(r["camx"]), p))
    kand = [k for k in kand if schwarzanteil(k[2]) < 0.2]
    if not kand:
        return
    # Ziele gleichmaessig ueber die Kamerastrecke; je Ziel das naechste noch
    # nicht gewaehlte Bild (beim letzten Ziel das spaeteste: Stage-Ende)
    n = min(a.anzahl, len(kand))
    c0, c1 = min(k[1] for k in kand), max(k[1] for k in kand)
    gewaehlt = []
    for i in range(n):
        ziel = c0 + (c1 - c0) * i / max(1, n - 1)
        rest = [k for k in kand if k not in gewaehlt]
        if i == n - 1:
            k = max(rest, key=lambda k: (-abs(k[1] - ziel), k[0]))
        else:
            k = min(rest, key=lambda k: (abs(k[1] - ziel), k[0]))
        gewaehlt.append(k)
    gewaehlt.sort()
    for i, (f, cx, p) in enumerate(gewaehlt):
        shutil.copy(p, f"{a.out}_{i + 1}.png")
        print(f"{a.out}_{i + 1}.png: Frame {f}, Kamera x {cx}")


if __name__ == "__main__":
    main()
