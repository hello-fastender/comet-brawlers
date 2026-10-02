#!/usr/bin/env python3
"""Animationsstreifen aus einem anim.lua-Lauf (Snapshot je Frame + Watch-CSV).

    python3 scripts/grafik/streifen.py PREFIX OBJEKT VON BIS AUSGABE.png
        [--breite 144] [--hoehe 160] [--lag 1] [--alle] [--max 16]

OBJEKT ist "p" (Spieler 1) oder "s<n>" (Gegner-Slot n, muss in CC_SLOTS
stehen). Fuer jeden Frame VON..BIS, in dem sich der Animationszeiger des
Objekts (S+0x1C) aendert, wird ein Ausschnitt um den Fusspunkt des Objekts
genommen (Bild-x = x - Kamera x, Bild-y = 234 - (Tiefe - Kamera y)); die
Hoehe ueber dem Boden bleibt im Ausschnitt sichtbar (Spruenge). --lag: um
wie viele Frames das Bild dem RAM nachlaeuft (gemessen: 1). --alle: jeder
Frame statt nur der Wechsel. Unter jeder Kachel: Frame und Dauer der
Animationsstufe in Frames. Ausgabe auf stdout: Datei, Zahl der Kacheln,
Dauern der Animationsstufen (Frames), Summe. Nur ImageMagick.
"""
import argparse
import csv
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prefix")
    ap.add_argument("objekt")
    ap.add_argument("von", type=int)
    ap.add_argument("bis", type=int)
    ap.add_argument("out")
    ap.add_argument("--breite", type=int, default=144)
    ap.add_argument("--hoehe", type=int, default=160)
    ap.add_argument("--unten", type=int, default=16, help="Pixel unter dem Fusspunkt")
    ap.add_argument("--lag", type=int, default=1)
    ap.add_argument("--alle", action="store_true")
    ap.add_argument("--max", type=int, default=16)
    a = ap.parse_args()
    pre = Path(a.prefix)
    rows = {int(r["frame"]): r for r in csv.DictReader(open(f"{pre}_watch.csv"))}
    o = "p_" if a.objekt == "p" else a.objekt + "_"
    frames = [f for f in range(a.von, a.bis + 1) if f in rows]
    wechsel = [f for f in frames if a.alle or f == frames[0] or rows[f][o + "anim"] != rows[f - 1][o + "anim"]]
    wechsel = wechsel[: a.max]
    kacheln, dauern = [], []
    for i, f in enumerate(wechsel):
        r = rows[f]
        dauer = (wechsel[i + 1] if i + 1 < len(wechsel) else a.bis + 1) - f
        dauern.append(dauer)
        sx = int(r[o + "x"]) - int(r["camx"])
        sy = 234 - (int(r[o + "z"]) - int(r["camy"]))
        snap = pre.parent / "snap" / f"{pre.name}_{f + a.lag:06d}.png"
        if not snap.exists():
            continue
        x0, y0 = sx - a.breite // 2, sy + a.unten - a.hoehe
        tmp = pre.parent / f"{pre.name}_kachel_{i:03d}.png"
        # Ausschnitt mit schwarzem Rand, falls er ueber den Bildrand reicht
        subprocess.run(["convert", str(snap), "-background", "black", "-gravity", "northwest",
                        "-extent", f"{384 + 2 * a.breite}x{224 + 2 * a.hoehe}-{a.breite}-{a.hoehe}",
                        "-crop", f"{a.breite}x{a.hoehe}+{x0 + a.breite}+{y0 + a.hoehe}", "+repage",
                        "-gravity", "south", "-background", "#202020", "-splice", "0x14",
                        "-fill", "white", "-pointsize", "10", "-annotate", "+0+1",
                        f"f{f} {dauer}F" if not a.alle else f"f{f}", str(tmp)], check=True)
        kacheln.append(tmp)
    subprocess.run(["convert", *map(str, kacheln), "+append", a.out], check=True)
    for t in kacheln:
        t.unlink()
    # Zeile fuer ablaeufe.csv: Datei, Zahl der Animationsstufen, Dauern (Frames)
    print(f"{Path(a.out).name},{len(kacheln)},{'/'.join(map(str, dauern))},{sum(dauern)}")


if __name__ == "__main__":
    main()
