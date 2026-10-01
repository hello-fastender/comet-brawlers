#!/usr/bin/env python3
"""Auswertung der RAM-Abzuege aus runner.lua (nur Standardbibliothek).

Unterbefehle:
  info    Ueberblick ueber einen Abzug (Frames, Adressbereich)
  search  Adresskandidaten per verketteten Filtern eingrenzen
  track   Zeitreihe einzelner Adressen als CSV
  changes Nur Wertaenderungen (Frame, Adresse, alt, neu) – fuer Belege

Frames sind immer die lokalen Frames des Runners (Spalte "frame").
Der 68000 ist Big Endian; Woerter (Breite 2) werden entsprechend gelesen.

Filter fuer search (beliebig kombinierbar, werden der Reihe nach angewandt):
  A:B:lt|gt|eq|ne     Wert in Frame A verglichen mit Wert in Frame B
  val:F:lt|gt|eq|ne:V Wert in Frame F verglichen mit Konstante V
  same:A:B            unveraendert in allen Frames A..B
  inc:A:B / dec:A:B   streng steigend/fallend von Frame zu Frame in A..B
  step:A:B:D          aendert sich in A..B pro Frame um genau D
  diff:A:B:D          Wert(B) - Wert(A) == D

Beispiel (Lebenspunkte: sinken bei Treffer in Frame 640, sonst stabil):
  ramtools.py search logs/raw/attack --width 1 same:1:630 640:630:lt \\
      --show 600,630,640,700
"""

import argparse
import mmap
import struct
import sys
from pathlib import Path


class Dump:
    def __init__(self, prefix):
        prefix = str(prefix)
        hdr = dict(
            line.split("=", 1)
            for line in Path(prefix + "_ram.hdr").read_text().split()
        )
        self.start = int(hdr["start"], 16)
        self.size = int(hdr["stop"], 16) - self.start + 1
        self.rec = 8 + self.size
        f = open(prefix + "_ram.bin", "rb")
        self.data = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        n = len(self.data) // self.rec
        self.offsets = {}
        self.screen_frame = {}
        for i in range(n):
            frame, sf = struct.unpack_from("<II", self.data, i * self.rec)
            self.offsets[frame] = i * self.rec + 8
            self.screen_frame[frame] = sf
        self.frames = sorted(self.offsets)

    def value(self, frame, addr, width=1, signed=False):
        off = self.offsets[frame] + addr - self.start
        if width == 1:
            v = self.data[off]
        elif width == 2:
            v = self.data[off] << 8 | self.data[off + 1]
        else:
            v = int.from_bytes(self.data[off:off + 4], "big")
        if signed and v >= 1 << (8 * width - 1):
            v -= 1 << (8 * width)
        return v


OPS = {
    "lt": lambda a, b: a < b,
    "gt": lambda a, b: a > b,
    "eq": lambda a, b: a == b,
    "ne": lambda a, b: a != b,
}


def frames_between(dump, a, b):
    return [f for f in dump.frames if a <= f <= b]


def apply_filter(dump, cands, spec, width, signed):
    v = lambda f, addr: dump.value(f, addr, width, signed)
    p = spec.split(":")
    if p[0] == "val":
        f, op, const = int(p[1]), OPS[p[2]], int(p[3], 0)
        return [a for a in cands if op(v(f, a), const)]
    if p[0] in ("same", "inc", "dec", "step"):
        fr = frames_between(dump, int(p[1]), int(p[2]))
        if p[0] == "same":
            ok = lambda x, y: x == y
        elif p[0] == "inc":
            ok = lambda x, y: y > x
        elif p[0] == "dec":
            ok = lambda x, y: y < x
        else:
            d = int(p[3], 0)
            ok = lambda x, y: y - x == d
        for f0, f1 in zip(fr, fr[1:]):
            cands = [a for a in cands if ok(v(f0, a), v(f1, a))]
            if not cands:
                break
        return cands
    if p[0] == "diff":
        fa, fb, d = int(p[1]), int(p[2]), int(p[3], 0)
        return [a for a in cands if v(fb, a) - v(fa, a) == d]
    fa, fb, op = int(p[0]), int(p[1]), OPS[p[2]]
    return [a for a in cands if op(v(fa, a), v(fb, a))]


def parse_addr(spec):
    """'FF1234' oder 'FF1234:2' oder 'FF1234:2:s' -> (addr, width, signed)."""
    p = spec.split(":")
    width = int(p[1]) if len(p) > 1 else 1
    return int(p[0], 16), width, len(p) > 2 and p[2] == "s"


def cmd_info(args):
    d = Dump(args.prefix)
    print(f"Bereich   0x{d.start:06X}-0x{d.start + d.size - 1:06X} ({d.size} Bytes)")
    print(f"Frames    {len(d.frames)} ({d.frames[0]}..{d.frames[-1]})")
    print(f"Screen    {d.screen_frame[d.frames[0]]}..{d.screen_frame[d.frames[-1]]}")


def cmd_search(args):
    d = Dump(args.prefix)
    step = args.width if args.width > 1 else 1
    cands = list(range(d.start, d.start + d.size - args.width + 1, step))
    for spec in args.filters:
        cands = apply_filter(d, cands, spec, args.width, args.signed)
        print(f"# {spec}: {len(cands)} Kandidaten", file=sys.stderr)
    show = [int(x) for x in args.show.split(",")] if args.show else []
    for a in cands[: args.limit]:
        vals = " ".join(str(d.value(f, a, args.width, args.signed)) for f in show)
        print(f"{a:06X} {vals}".rstrip())
    if len(cands) > args.limit:
        print(f"# ... {len(cands) - args.limit} weitere", file=sys.stderr)


def cmd_track(args):
    d = Dump(args.prefix)
    addrs = [parse_addr(s) for s in args.addr]
    print("frame,screen_frame," + ",".join(s.split(":")[0] for s in args.addr))
    for f in frames_between(d, args.start, args.end):
        vals = ",".join(str(d.value(f, a, w, s)) for a, w, s in addrs)
        print(f"{f},{d.screen_frame[f]},{vals}")


def cmd_changes(args):
    d = Dump(args.prefix)
    addrs = [parse_addr(s) for s in args.addr]
    fr = frames_between(d, args.start, args.end)
    print("frame,addr,old,new,delta")
    for f0, f1 in zip(fr, fr[1:]):
        for a, w, s in addrs:
            x, y = d.value(f0, a, w, s), d.value(f1, a, w, s)
            if x != y:
                print(f"{f1},{a:06X},{x},{y},{y - x}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("info")
    p.add_argument("prefix", help="z. B. logs/raw/attract (ohne _ram.bin)")
    p.set_defaults(fn=cmd_info)

    p = sub.add_parser("search")
    p.add_argument("prefix")
    p.add_argument("filters", nargs="*")
    p.add_argument("--width", type=int, choices=(1, 2, 4), default=1)
    p.add_argument("--signed", action="store_true")
    p.add_argument("--show", help="Frames, deren Werte ausgegeben werden")
    p.add_argument("--limit", type=int, default=50)
    p.set_defaults(fn=cmd_search)

    for name, fn in (("track", cmd_track), ("changes", cmd_changes)):
        p = sub.add_parser(name)
        p.add_argument("prefix")
        p.add_argument("--addr", action="append", required=True,
                       help="ADDR[:Breite[:s]] in Hex, mehrfach angebbar")
        p.add_argument("--from", dest="start", type=int, default=0)
        p.add_argument("--to", dest="end", type=int, default=1 << 31)
        p.set_defaults(fn=fn)

    # Filter duerfen auch nach Optionen stehen (search --width 2 inc:1:9)
    args, extra = ap.parse_known_args()
    if extra:
        if args.cmd != "search":
            ap.error("unbekannte Argumente: " + " ".join(extra))
        args.filters += extra
    args.fn(args)


if __name__ == "__main__":
    main()
