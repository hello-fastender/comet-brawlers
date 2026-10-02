#!/usr/bin/env python3
"""Panorama einer Stage aus den Kamera-Schritt-Snapshots des Durchlauf-Bots.

    python3 scripts/grafik/panorama.py PREFIX STAGE AUSGABE.png [--spalte 120]

PREFIX ist der Lauf (logs/raw/<CC_NAME>), dessen Snapshots
logs/raw/snap/<CC_NAME>_s<STAGE>_cam<x>_<frame>.png heissen (GFA_CAM_STEP).
Aus jedem Snapshot wird ein senkrechter Streifen ab Bildschirmspalte --spalte
genommen, so breit wie der Kamerafortschritt bis zum naechsten Snapshot, und
an seiner Weltposition (Kamera x + Spalte, Hoehe nach Kamera y) eingesetzt.
Die Spalten 110-170 sind frei von der Anzeigeleiste. Faellt die Kamera
um mehr als 64 px zurueck oder in y um mehr als 200 px, beginnt ein neuer Abschnitt
(eigene Datei AUSGABE_<n>.png), ebenso bei einem Sprung nach vorn (> 200 px)
oder nach 8000 px Breite. Hintergrundebenen mit Parallaxe passen an den
Streifengrenzen nicht exakt; Figuren stehen dort, wo sie beim Snapshot waren.
Nur ImageMagick (convert), keine Python-Bildbibliothek.
"""
import argparse
import csv
import re
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prefix")
    ap.add_argument("stage", type=int)
    ap.add_argument("out")
    ap.add_argument("--spalte", type=int, default=120)
    a = ap.parse_args()
    prefix = Path(a.prefix)
    cam = {}
    for r in csv.DictReader(open(f"{prefix}_bot.csv")):
        cam[int(r["frame"])] = (int(r["camx"]), int(r["camy"]))
    snaps = []
    for p in (prefix.parent / "snap").glob(f"{prefix.name}_s{a.stage}_cam*_*.png"):
        m = re.search(r"_cam(\d+)_(\d+)\.png$", p.name)
        f = int(m.group(2))
        cx, cy = cam[f]
        cy = cy - 0x10000 if cy >= 0x8000 else cy
        snaps.append((f, cx, cy, p))
    snaps.sort()
    # in Abschnitte teilen: Kamera springt zurueck (> 64 px), springt vor
    # (> 200 px, z. B. Szenenwechsel) oder in y um mehr als 200 px; kleine
    # Rueckschritte werden uebersprungen; hoechstens 8000 px je Datei
    teile, cur = [], []
    for s in snaps:
        if cur:
            dx, dy = s[1] - cur[-1][1], abs(s[2] - cur[-1][2])
            if -64 <= dx <= 0 and dy <= 200:
                continue
            if dx < -64 or dx > 200 or dy > 200 or s[1] - cur[0][1] > 8000:
                teile.append(cur)
                cur = []
        cur.append(s)
    if cur:
        teile.append(cur)
    out = Path(a.out)
    for k, teil in enumerate(t for t in teile if len(t) >= 2):
        x0 = teil[0][1] + a.spalte
        cymax = max(s[2] for s in teil)
        cymin = min(s[2] for s in teil)
        breite = teil[-1][1] - teil[0][1] + 32
        hoehe = 224 + cymax - cymin
        cmd = ["convert", "-size", f"{breite}x{hoehe}", "xc:black"]
        for i, (f, cx, cy, p) in enumerate(teil):
            w = (teil[i + 1][1] - cx) if i + 1 < len(teil) else 32
            cmd += ["(", str(p), "-crop", f"{w}x224+{a.spalte}+0", "+repage", ")",
                    "-geometry", f"+{cx + a.spalte - x0}+{cymax - cy}", "-composite"]
        ziel = out if len([t for t in teile if len(t) >= 2]) == 1 else out.with_name(f"{out.stem}_{k + 1}{out.suffix}")
        subprocess.run(cmd + [str(ziel)], check=True)
        print(f"{ziel}: Welt-x {x0}..{x0 + breite}, Kamera y {cymin}..{cymax}, {len(teil)} Streifen")


if __name__ == "__main__":
    main()
