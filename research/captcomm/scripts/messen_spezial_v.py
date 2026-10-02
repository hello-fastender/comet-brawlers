#!/usr/bin/env python3
"""Gegenpruefung Spezialangriff und Sprint (Praefixe spezial_v, sprint_v).

Liest die Watch-Protokolle von scenarios/spezial_v_frei.lua (kein RAM-Abzug)
und gibt Ereignisse aus. Nur Standardbibliothek. Frames sind lokale Frames
des Runners; "rel" ist der Abstand zum Bezugsframe B des Laufs (Standard:
erster Frame, in dem Angriff und Sprung zugleich gedrueckt sind, sonst der
erste Angriffsdruck; mit --bezug fest vorgeben).

Unterbefehle:
  ereignisse PREFIX..  je Lauf: Wechsel von Aktion, Unterphase, Status und
                       Schutz-Timer FFAA69 der Figur, ihre LP-Wechsel, erste
                       x-Bewegung nach jedem Aktionsende, jeder LP-Verlust
                       eines Objekts (Slot, Typ, Schaden, dx/dz am Ende des
                       Vorframes und des Trefferframes) und seine Ruhelage
  zeitachse PREFIX A B je Frame A..B: Eingaben, Figur (x, Tiefe, Hoehe, LP,
                       Aktion, Status, Timer) und die naechsten Objekte
  probe PREFIX..       je Lauf und Objekt mit LP-Verlust oder --slot: erster
                       Trefferframe relativ zu B, dx/dz am Ende des Treffer-
                       frames, dx/dz in den Frames B+1..B+50 ohne Treffer
                       (Spanne), LP-Verlust der Figur und die Frames, in denen
                       das Objekt naeher als 190 px stand (rel:dx/dz/Hoehe der
                       Figur; fuer Einzelframe-Proben)
  tempo PREFIX..       je Frame mit Bewegung: x- und Tiefengeschwindigkeit
                       der Figur (16.16 exakt) mit Aktion, zusammengefasst zu
                       Abschnitten gleicher Geschwindigkeit
"""

import argparse
import csv
import os
import sys

KEYS = {
    "P1 Button 1": "A", "P1 Button 2": "J", "P1 Left": "L", "P1 Right": "R",
    "P1 Up": "U", "P1 Down": "D",
}


class Lauf:
    def __init__(self, prefix):
        self.prefix = prefix
        self.name = os.path.basename(prefix)
        with open(prefix + "_watch.csv") as f:
            rows = list(csv.DictReader(f))
        self.cols = list(rows[0].keys())
        self.r = {int(r["frame"]): {k: int(v) for k, v in r.items()} for r in rows}
        self.f = sorted(self.r)
        self.inp = {}
        with open(prefix + "_inputs.csv") as f:
            for r in csv.DictReader(f):
                ks = {KEYS.get(k, k) for k in r["inputs"].split("|") if k}
                self.inp[int(r["frame"])] = ks
        self.slots = sorted({int(c[1:].split("_")[0]) for c in self.cols
                             if c.startswith("s") and c.endswith("_st")})

    def v(self, f, k):
        return self.r[f][k]

    def x(self, f):
        return self.r[f]["f_x"] / 65536.0

    def xi(self, f):
        return self.r[f]["f_x"] >> 16

    def zi(self, f):
        z = self.r[f]["f_z"] >> 16
        return z - 0x10000 if z >= 0x8000 else z

    def sx(self, f, n):
        return self.r[f][f"s{n}_x"] / 65536.0

    def sxi(self, f, n):
        return self.r[f][f"s{n}_x"] >> 16

    def bezug(self, fest=None):
        if fest is not None:
            return fest
        for f in self.f:
            ks = self.inp.get(f, set())
            if "A" in ks and "J" in ks:
                return f
        for f in self.f:
            if "A" in self.inp.get(f, set()):
                return f
        return self.f[0]

    def drucke(self):
        """(frame, taste) fuer jeden neuen Tastendruck."""
        out = []
        prev = set()
        for f in self.f:
            ks = self.inp.get(f, set())
            for k in sorted(ks - prev):
                out.append((f, k))
            prev = ks
        return out


def laeufe(prefixe):
    """Praefixe normalisieren (Dateinamen wie X_watch.csv, X.log erlaubt), Reihenfolge halten."""
    out = []
    for p in prefixe:
        for suf in ("_watch.csv", "_inputs.csv", ".log"):
            if p.endswith(suf):
                p = p[: -len(suf)]
        if p not in out and os.path.exists(p + "_watch.csv"):
            out.append(p)
    return out


def rel(f, b):
    return f"{f - b:+d}"


def ereignisse(L, b):
    """Liste von (frame, art, text)."""
    ev = []
    F = L.f
    for f, k in L.drucke():
        ev.append((f, "druck", k))
    for i in range(1, len(F)):
        f, g = F[i], F[i - 1]
        a0, a1 = L.v(g, "f_akt"), L.v(f, "f_akt")
        p0, p1 = L.v(g, "f_ph"), L.v(f, "f_ph")
        if a0 != a1 or p0 != p1:
            ev.append((f, "aktion", f"{a0:#04x}/{p0} -> {a1:#04x}/{p1}"))
        s0, s1 = L.v(g, "f_st"), L.v(f, "f_st")
        if s0 != s1:
            ev.append((f, "status", f"{s0} -> {s1}"))
        t0, t1 = L.v(g, "t69"), L.v(f, "t69")
        if t0 == 0 and t1 != 0:
            ev.append((f, "timer69", f"Start {t1}"))
        if t0 != 0 and t1 == 0:
            ev.append((f, "timer69", "Ende (0)"))
        l0, l1 = L.v(g, "f_lp"), L.v(f, "f_lp")
        if l0 != l1:
            ev.append((f, "lp_figur", f"{l0} -> {l1} ({l1 - l0:+d})"))
        h0, h1 = L.v(g, "f_h"), L.v(f, "f_h")
        if (h0 == 0) != (h1 == 0):
            ev.append((f, "hoehe", f"{h0} -> {h1}"))
        if L.v(g, "f_blick") & 0x20 != L.v(f, "f_blick") & 0x20:
            ev.append((f, "blick", "rechts" if L.v(f, "f_blick") & 0x20 else "links"))
        # x-Bewegung: Beginn und Ende von Bewegungsphasen
        dx1 = L.v(f, "f_x") - L.v(g, "f_x")
        dx0 = L.v(g, "f_x") - L.v(F[i - 2], "f_x") if i >= 2 else 0
        dz1 = L.v(f, "f_z") - L.v(g, "f_z")
        dz0 = L.v(g, "f_z") - L.v(F[i - 2], "f_z") if i >= 2 else 0
        if (dx1 != 0 or dz1 != 0) and dx0 == 0 and dz0 == 0:
            ev.append((f, "bewegung", f"ab hier dx {dx1 / 65536:+.5f} dz {dz1 / 65536:+.5f}"))
        if dx1 == 0 and dz1 == 0 and (dx0 != 0 or dz0 != 0):
            ev.append((f, "bewegung", "steht ab hier"))
    for n in L.slots:
        k = f"s{n}_"
        for i in range(1, len(F)):
            f, g = F[i], F[i - 1]
            if L.v(g, k + "st") == 0:
                continue
            l0, l1 = L.v(g, k + "lp"), L.v(f, k + "lp")
            if l1 < l0:
                typ = L.v(f, k + "typ")
                dxg, dzg = L.sxi(g, n) - L.xi(g), L.v(g, k + "z") - L.zi(g)
                dxf, dzf = L.sxi(f, n) - L.xi(f), L.v(f, k + "z") - L.zi(f)
                ruhe = ruhelage(L, n, f)
                ev.append((f, "treffer", f"slot {n} typ {typ:#x} {l0} -> {l1} ({l1 - l0:+d}) "
                           f"dx/dz Vorframe {dxg}/{dzg} Frame {dxf}/{dzf} "
                           f"st {L.v(g, k + 'st')}->{L.v(f, k + 'st')} {ruhe}"))
            if k + "att" in L.r[f]:
                a0, a1 = L.v(g, k + "att"), L.v(f, k + "att")
                if a0 == 0 and a1 != 0:
                    ev.append((f, "angriff", f"slot {n} Attribut {a1:#x} aktiv, dx/dz {L.sxi(f, n) - L.xi(f)}/"
                               f"{L.v(f, k + 'z') - L.zi(f)}"))
                if a0 != 0 and a1 == 0:
                    ev.append((f, "angriff", f"slot {n} Attribut aus"))
            s0, s1 = L.v(g, k + "st"), L.v(f, k + "st")
            if s0 != s1 and l1 >= l0:
                ev.append((f, "objekt", f"slot {n} status {s0} -> {s1}"))
    ev.sort(key=lambda e: (e[0], e[1]))
    return ev


def ruhelage(L, n, h):
    """Ruhelage nach einem Treffer: erster Frame nach dem Flug (Hoehe > 0),
    ab dem x 10 Frames lang gleich bleibt und die Hoehe 0 ist."""
    k = f"s{n}_"
    F = [f for f in L.f if f >= h]
    flog = False
    for i, f in enumerate(F):
        if L.v(f, k + "h") > 0:
            flog = True
        if not flog:
            continue
        nxt = F[i:i + 10]
        if len(nxt) < 10:
            break
        if all(L.v(g, k + "h") == 0 and L.v(g, k + "x") == L.v(f, k + "x") for g in nxt):
            weg = L.sx(f, n) - L.sx(h, n)
            weg0 = L.sx(f, n) - L.sx(h - 1, n)
            return f"ruhe ab {f} x {L.sx(f, n):.4f} weg ab Trefferframe {weg:+.4f} ab Vorframe {weg0:+.4f}"
    return "ruhe -" if flog else "kein Flug"


def cmd_ereignisse(args):
    w = csv.writer(sys.stdout, lineterminator="\n")
    w.writerow(["lauf", "frame", "rel", "art", "wert"])
    for p in laeufe(args.prefix):
        L = Lauf(p)
        b = L.bezug(args.bezug)
        name = L.name
        for f, art, text in ereignisse(L, b):
            if args.ohne_bewegung and art == "bewegung":
                continue
            w.writerow([name, f, rel(f, b), art, text])
        w.writerow([name, b, "+0", "bezug", f"B = {b}; Figur {L.v(b, 'figur')}, LP {L.v(b, 'f_lp')}, "
                    f"x {L.x(b):.4f}, Tiefe {L.zi(b)}"])


def cmd_zeitachse(args):
    L = Lauf(args.prefix)
    b = L.bezug(args.bezug)
    slots = [int(s) for s in args.slots.split(",")] if args.slots else None
    for f in L.f:
        if not args.a <= f <= args.b:
            continue
        ks = "".join(sorted(L.inp.get(f, set())))
        line = (f"{f:4d} {rel(f, b):>4} {ks:4} x {L.x(f):9.4f} z {L.zi(f):4d} h {L.v(f, 'f_h'):3d} "
                f"lp {L.v(f, 'f_lp'):3d} akt {L.v(f, 'f_akt'):#04x}/{L.v(f, 'f_ph'):2d} st {L.v(f, 'f_st')} "
                f"t69 {L.v(f, 't69'):2d}")
        objs = []
        for n in (slots or L.slots):
            k = f"s{n}_"
            if L.v(f, k + "st") == 0 and slots is None:
                continue
            objs.append(f"[{n}:{L.v(f, k + 'st')}{L.v(f, k + 's5')} dx {L.sxi(f, n) - L.xi(f):4d} "
                        f"dz {L.v(f, k + 'z') - L.zi(f):4d} h {L.v(f, k + 'h'):3d} lp {L.v(f, k + 'lp'):3d}"
                        f"{' att %#x' % L.v(f, k + 'att') if L.r[f].get(k + 'att') else ''}]")
        print(line, " ".join(objs))


def cmd_probe(args):
    w = csv.writer(sys.stdout, lineterminator="\n")
    w.writerow(["lauf", "B", "slot", "typ", "treffer_rel", "schaden", "dx_treffer", "dz_treffer",
                "dx_vorframe", "dz_vorframe", "treffer_gesamt", "dx_ohne_treffer", "dz_ohne_treffer",
                "lp_figur_rel", "aktion_bis_rel", "nah"])
    for p in laeufe(args.prefix):
        L = Lauf(p)
        b = L.bezug(args.bezug)
        bis = b + args.bis
        akt_end = next((f for f in L.f if f > b and L.v(f, "f_akt") != 0x14), None)
        lpf = [f"{f - b:+d}:{L.v(f, 'f_lp') - L.v(f - 1, 'f_lp'):+d}" for f in L.f
               if f > b and f - 1 in L.r and L.v(f, "f_lp") != L.v(f - 1, "f_lp")]
        slots = [args.slot] if args.slot is not None else L.slots
        for n in slots:
            k = f"s{n}_"
            hits = [f for f in L.f if b < f <= bis and f - 1 in L.r and L.v(f - 1, k + "st") != 0
                    and L.v(f, k + "lp") < L.v(f - 1, k + "lp")]
            if not hits and args.slot is None:
                continue
            f0 = hits[0] if hits else None
            ohne = [f for f in L.f if b < f <= (f0 - 1 if f0 else bis)]
            dxs = [L.sxi(f, n) - L.xi(f) for f in ohne]
            dzs = [L.v(f, k + "z") - L.zi(f) for f in ohne]
            sp = lambda v: f"{min(v)}..{max(v)}" if v else ""
            if f0:
                row = [L.name, b, n, f"{L.v(f0, k + 'typ'):#x}", f0 - b, L.v(f0, k + "lp") - L.v(f0 - 1, k + "lp"),
                       L.sxi(f0, n) - L.xi(f0), L.v(f0, k + "z") - L.zi(f0),
                       L.sxi(f0 - 1, n) - L.xi(f0 - 1), L.v(f0 - 1, k + "z") - L.zi(f0 - 1)]
            else:
                row = [L.name, b, n, f"{L.v(b, k + 'typ'):#x}", "kein", "", "", "", "", ""]
            nah = [f"{f - b:+d}:{L.sxi(f, n) - L.xi(f)}/{L.v(f, k + 'z') - L.zi(f)}/h{L.v(f, 'f_h')}"
                   for f in L.f if b < f <= bis and abs(L.sxi(f, n) - L.xi(f)) < 190]
            if len(nah) > 4:
                nah = nah[:2] + ["..."] + nah[-1:]
            row += [len(hits), sp(dxs), sp(dzs), " ".join(lpf), akt_end - b if akt_end else "", " ".join(nah)]
            w.writerow(row)


def cmd_tempo(args):
    w = csv.writer(sys.stdout, lineterminator="\n")
    w.writerow(["lauf", "von", "bis", "rel_von", "rel_bis", "frames", "vx", "vz", "aktion", "eingaben"])
    for p in laeufe(args.prefix):
        L = Lauf(p)
        b = L.bezug(args.bezug)
        seg = None
        for i in range(1, len(L.f)):
            f, g = L.f[i], L.f[i - 1]
            vx = (L.v(f, "f_x") - L.v(g, "f_x")) / 65536
            vz = (L.v(f, "f_z") - L.v(g, "f_z")) / 65536
            akt = f"{L.v(f, 'f_akt'):#04x}"
            ks = "".join(sorted(L.inp.get(g, set())))
            key = (vx, vz, akt, ks)
            if seg and seg[2] == key:
                seg[1] = f
            else:
                if seg and (seg[2][0] or seg[2][1]):
                    w.writerow([L.name, seg[0], seg[1], rel(seg[0], b), rel(seg[1], b), seg[1] - seg[0] + 1,
                                seg[2][0], seg[2][1], seg[2][2], seg[2][3]])
                seg = [f, f, key]
        if seg and (seg[2][0] or seg[2][1]):
            w.writerow([L.name, seg[0], seg[1], rel(seg[0], b), rel(seg[1], b), seg[1] - seg[0] + 1,
                        seg[2][0], seg[2][1], seg[2][2], seg[2][3]])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("ereignisse", help="Ereignisse je Lauf (Figur, Treffer, Ruhelage)")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--bezug", type=int)
    p.add_argument("--ohne-bewegung", action="store_true")
    p.set_defaults(fn=cmd_ereignisse)
    p = sub.add_parser("zeitachse", help="je Frame Figur und Objekte")
    p.add_argument("prefix")
    p.add_argument("a", type=int)
    p.add_argument("b", type=int)
    p.add_argument("--bezug", type=int)
    p.add_argument("--slots")
    p.set_defaults(fn=cmd_zeitachse)
    p = sub.add_parser("probe", help="erster Treffer je Objekt mit Lage")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--bezug", type=int)
    p.add_argument("--slot", type=int)
    p.add_argument("--bis", type=int, default=50)
    p.set_defaults(fn=cmd_probe)
    p = sub.add_parser("tempo", help="Geschwindigkeit der Figur je Abschnitt")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--bezug", type=int)
    p.set_defaults(fn=cmd_tempo)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
