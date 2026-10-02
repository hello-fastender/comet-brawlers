#!/usr/bin/env python3
"""Gegenpruefung "Gegenstaende und Waffen" (Praefix item_v), nur Standardbibliothek.

Liest die RAM-Abzuege (0xFFA900-0xFFEA00) aus scenarios/item_v_frei.lua und
die Bot-Protokolle aus scenarios/item_v_bot.lua. Frames sind lokale Frames
des Runners. Spielerblock P = FFA990, Objekt-Slot S = FFBC90 + n*0xC0,
Geschossbloecke G = FFAD90 + k*0xC0 (k = 0..4).
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
ITEM, BEH = 0x95F9C, 0x9DA2A
ART = {0x00: "GUN", 0x04: "M-GUN", 0x08: "MISSILE", 0x0C: "0x0C", 0x0E: "SHURIKEN",
       0x10: "LASER", 0x12: "HAMMER", 0x20: "Brathaehnchen", 0x22: "TENDON",
       0x24: "0x24", 0x2A: "0x2A", 0x2C: "CHERRY"}


def S(n):
    return 0xFFBC90 + n * 0xC0


def G(k):
    return 0xFFAD90 + k * 0xC0


def watch_of(prefix):
    res = {}
    p = Path(str(prefix) + "_watch.csv")
    if p.exists():
        for r in csv.DictReader(open(p)):
            res[int(r["frame"])] = {k: int(v) for k, v in r.items()}
    return res


def inputs_of(prefix):
    res = {}
    p = Path(str(prefix) + "_inputs.csv")
    if p.exists():
        for r in csv.DictReader(open(p)):
            res[int(r["frame"])] = r["inputs"].replace("P1 ", "").replace("Button 1", "A").replace("Button 2", "J")
    return res


class Lauf:
    def __init__(self, prefix):
        self.prefix = str(prefix)
        self.name = Path(self.prefix).name
        self.d = Dump(prefix)
        self.inp = inputs_of(prefix)
        self.w = watch_of(prefix)
        self.frames = self.d.frames

    def v(self, f, a, w=1, s=False):
        return self.d.value(f, a, w, s)

    def p(self, f):
        v = self.v
        return dict(st=v(f, P + 4), act=v(f, P + 0x0A, 2), ph=v(f, P + 0x0C, 2), x=v(f, P + 0x0E, 2),
                    h=v(f, P + 0x12, 2, True), z=v(f, P + 0x16, 2), lp=v(f, P + 0x40, 2, True),
                    face=v(f, P + 0x5E), p78=v(f, P + 0x78), p79=v(f, P + 0x79), p7a=v(f, P + 0x7A, 2),
                    mun=v(f, P + 0xB1), kombo=v(f, 0xFFAA2D), pkt=bcd(v(f, 0xFFAA74, 4)),
                    cam=self.w.get(f, {}).get("camx", -1))

    def slot(self, f, n, base=None):
        b = S(n) if base is None else base
        v = self.v
        return dict(st=v(f, b + 4, 2), typ=v(f, b + 0x38, 4), art=v(f, b + 0x3D), x=v(f, b + 0x0E, 2),
                    h=v(f, b + 0x12, 2, True), z=v(f, b + 0x16, 2), lp=v(f, b + 0x40, 2, True),
                    lz=v(f, b + 0x60, 2), mun=v(f, b + 0xB1), attr=v(f, b + 0x24, 2), act=v(f, b + 0x0A, 2))

    def items(self, f):
        """Slots 20..59 mit Gegenstand (Typ 0x95F9C) oder Behaelter, belegt."""
        res = {}
        for n in range(20, 60):
            s = self.slot(f, n)
            if s["st"] and s["typ"] in (ITEM, BEH):
                res[n] = s
        return res

    def press_frames(self, key="A"):
        """Frames, in denen die Taste neu gedrueckt ist."""
        out, prev = [], False
        for f in self.frames:
            now = key in self.inp.get(f, "").split("|")
            if now and not prev:
                out.append(f)
            prev = now
        return out


def bcd(v):
    s = "%x" % v
    return int(s) if s.isdigit() else -1


def cmd_zeit(a):
    """Zeitreihe: Figur und gewaehlte Slots (Gegner/Gegenstaende/Geschosse)."""
    L = Lauf(a.prefix)
    slots = [int(x) for x in a.slots.split(",")] if a.slots else []
    geschosse = [int(x) for x in a.geschosse.split(",")] if a.geschosse else []
    von, bis = (int(x) for x in a.frames.split(":")) if a.frames else (L.frames[0], L.frames[-1])
    for f in L.frames:
        if f < von or f > bis:
            continue
        p = L.p(f)
        line = ("%4d %-12s st%d a%02x/%x x%d z%d h%d lp%d f%02x 78:%d 79:%d mun%d k%d pkt%d c%d" %
                (f, L.inp.get(f, ""), p["st"], p["act"], p["ph"], p["x"], p["z"], p["h"], p["lp"], p["face"],
                 p["p78"], p["p79"], p["mun"], p["kombo"], p["pkt"], p["cam"]))
        for n in slots:
            s = L.slot(f, n)
            line += " | s%d %04x %x/%02x x%d(%+d) z%d(%+d) h%d lp%d lz%d m%d at%04x a%x" % (
                n, s["st"], s["typ"], s["art"], s["x"], s["x"] - p["x"], s["z"], s["z"] - p["z"], s["h"],
                s["lp"], s["lz"], s["mun"], s["attr"], s["act"])
        for k in geschosse:
            g = L.slot(f, 0, G(k))
            line += " | g%d %04x %x x%d(%+d) h%d z%d at%04x" % (k, g["st"], g["typ"], g["x"], g["x"] - p["x"],
                                                            g["h"], g["z"], g["attr"])
        print(line)


def cmd_objekte(a):
    """Belegte Slots 0..59 und Geschossbloecke in einem Frame (Orientierung)."""
    L = Lauf(a.prefix)
    f = a.frame
    p = L.p(f)
    print("Figur", p)
    for n in range(60):
        s = L.slot(f, n)
        if s["st"]:
            print("slot %2d st%04x typ %6x art %02x x%d(%+d) z%d(%+d) h%d lp%d lz%d mun%d" % (
                n, s["st"], s["typ"], s["art"], s["x"], s["x"] - p["x"], s["z"], s["z"] - p["z"], s["h"],
                s["lp"], s["lz"], s["mun"]))
    for k in range(5):
        g = L.slot(f, 0, G(k))
        if g["st"]:
            print("G%d st%04x typ %x x%d(%+d) h%d z%d attr %04x" % (k, g["st"], g["typ"], g["x"], g["x"] - p["x"],
                                                                   g["h"], g["z"], g["attr"]))


def aufnahmen(L):
    """Je Angriffsdruck P am Boden: naechster liegender Gegenstand, Ergebnis."""
    res = []
    for P0 in L.press_frames("A"):
        if P0 + 1 > L.frames[-1] or P0 - 1 < L.frames[0]:
            continue
        p = L.p(P0)
        its = {n: s for n, s in L.items(P0).items() if s["typ"] == ITEM}
        if not its:
            continue
        n, s = min(its.items(), key=lambda kv: abs(kv[1]["x"] - p["x"]) + abs(kv[1]["z"] - p["z"]))
        q = L.p(P0 + 1)
        weg = L.slot(P0 + 1, n)["st"] == 0
        dauer = 0
        f = P0 + 1
        while f <= L.frames[-1] and L.p(f)["act"] == 0x12:
            dauer += 1
            f += 1
        res.append(dict(P=P0, slot=n, art=ART.get(s["art"], hex(s["art"])), dx=s["x"] - p["x"], dz=s["z"] - p["z"],
                        blick="rechts" if p["face"] & 0x20 else "links", flag78=p["p78"], hoehe=p["h"],
                        aufgenommen=int(weg), lp_vor=p["lp"], lp_nach=q["lp"], pkt_diff=q["pkt"] - p["pkt"],
                        waffe_nach=q["p79"], mun_vor=s["mun"], mun_nach=q["mun"], akt_nach=hex(q["act"]),
                        dauer_12=dauer, frei_ab=(P0 + 1 + dauer) if dauer else "",
                        st_p4=L.p(P0 + 4)["st"]))
    return res


def cmd_aufnahme(a):
    """Aufnahmeversuche je Angriffsdruck (Abstand, Blick, Flag P+0x78, LP, Punkte, Munition)."""
    w = None
    for pre in a.prefix:
        for r in aufnahmen(Lauf(pre)):
            r = dict(lauf=Path(pre).name, **r)
            if w is None:
                w = csv.DictWriter(sys.stdout, fieldnames=list(r))
                w.writeheader()
            w.writerow(r)


def schuesse(L, nach=130):
    """Je Angriffsdruck P mit Waffe in der Hand: Aktion, Munition, Geschosse, Treffer."""
    res = []
    for P0 in L.press_frames("A"):
        if P0 - 1 < L.frames[0] or not L.p(P0)["p79"]:
            continue
        p = L.p(P0)
        ende = min(L.frames[-1], P0 + nach)
        akt = [f for f in range(P0, ende + 1) if L.p(f)["act"] == 0x16]
        mun = [f for f in range(P0 + 1, ende + 1) if L.p(f)["mun"] != L.p(f - 1)["mun"]]
        weg = [f for f in range(P0 + 1, ende + 1) if L.p(f)["p79"] != L.p(f - 1)["p79"]]
        r = dict(P=P0, blick="rechts" if p["face"] & 0x20 else "links", x=p["x"], z=p["z"], mun_vor=p["mun"],
                 akt=("%d-%d" % (akt[0] - P0, akt[-1] - P0)) if akt else "", akt_dauer=len(akt),
                 mun_wechsel=";".join("P+%d:%d" % (f - P0, L.p(f)["mun"]) for f in mun),
                 waffe_weg=";".join("P+%d" % (f - P0) for f in weg))
        gs = []
        for k in range(5):
            b = G(k)
            fr = [f for f in range(P0, ende + 1) if L.v(f, b + 4, 2)]
            if not fr or L.v(P0, b + 4, 2):
                continue
            a0 = fr[0]
            g0 = L.slot(a0, 0, b)
            xs = [L.v(f, b + 0x0E, 2) for f in fr]
            stop = next((fr[i] for i in range(1, len(fr)) if xs[i] == xs[i - 1]), None)
            att = []
            for f in fr:
                if L.v(f, b + 0x24, 2):
                    att.append(f)
                elif att:
                    break
            frei = next((f for f in range(a0, ende + 1) if not L.v(f, b + 4, 2)), None)
            v = (xs[min(4, len(xs) - 1)] - xs[0]) / max(1, min(4, len(xs) - 1))
            gs.append("G%d an P+%d dx%+d h%d dz%+d v%+.2f halt P+%s bei dx%s attr P+%s..P+%s frei P+%s" % (
                k, a0 - P0, g0["x"] - L.p(a0)["x"], g0["h"], g0["z"] - L.p(a0)["z"], v,
                (stop - P0) if stop else "-", (L.v(stop, b + 0x0E, 2) - L.p(P0)["x"]) if stop else "-",
                (att[0] - P0) if att else "-", (att[-1] - P0) if att else "-", (frei - P0) if frei else ">"))
        r["geschosse"] = " / ".join(gs)
        tr = []
        for f in range(P0 + 1, ende + 1):
            for n in list(range(20)) + list(range(20, 60)):
                b = S(n)
                if n >= 20 and L.v(f, b + 0x38, 4) != 0x09ADEA:
                    continue
                l0, l1 = L.v(f - 1, b + 0x40, 2, True), L.v(f, b + 0x40, 2, True)
                if L.v(f, b + 4) and l1 < l0:
                    pk = L.p(f + 1)["pkt"] - L.p(f)["pkt"] if f + 1 <= L.frames[-1] else ""
                    st = [L.v(g, b + 4) for g in range(f, min(ende, f + 12) + 1)]
                    tr.append("P+%d s%d %s -%d (%d) dx%+d dz%+d st%s pkt+%s" % (
                        f - P0, n, TYPNAME.get(L.v(f, b + 0x38, 4), hex(L.v(f, b + 0x38, 4))), l0 - l1, l1,
                        L.v(f - 1, b + 0x0E, 2) - L.p(P0)["x"], L.v(f - 1, b + 0x16, 2) - L.p(P0)["z"],
                        "".join(str(x) for x in st), pk))
        r["treffer"] = " / ".join(tr)
        res.append(r)
    return res


def cmd_schuss(a):
    """Waffeneinsatz je Angriffsdruck mit Waffe: Aktionsdauer, Munition, Geschossbloecke, Treffer."""
    w = None
    for pre in a.prefix:
        for r in schuesse(Lauf(pre), a.nach):
            r = dict(lauf=Path(pre).name, **r)
            if w is None:
                w = csv.DictWriter(sys.stdout, fieldnames=list(r))
                w.writeheader()
            w.writerow(r)


TYPNAME = {0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK", 0x46DA4: "DOLG",
            0x09ADEA: "Mech"}


def cmd_botpunkte(a):
    """Bot-Protokoll: jede Punkteaenderung mit den Gegnern, deren LP im selben oder vorigen Frame fielen."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "frame", "stage", "pkt_vor", "pkt_nach", "diff", "gegner"])
    for fn in a.csv:
        rows = list(csv.DictReader(open(fn)))
        for i in range(2, len(rows)):
            r, q, o = rows[i], rows[i - 1], rows[i - 2]
            pv, pn = bcd(int(q["pkt"])), bcd(int(r["pkt"]))
            if pv == pn:
                continue
            geg = []
            for n in range(20):
                typ = int(r["e%d_typ" % n])
                for (x, y) in ((o, q), (q, r)):
                    l0, l1 = int(x["e%d_lp" % n]), int(y["e%d_lp" % n])
                    if l1 < l0:
                        geg.append("s%d %s %d->%d%s" % (n, TYPNAME.get(typ, hex(typ)), l0, l1, " tot" if l1 < 0 or (l1 <= 0 and l0 > 0) else ""))
            w.writerow([Path(fn).name.replace("_bot.csv", ""), r["frame"], r["stage"], pv, pn, pn - pv, "; ".join(geg)])


def csv_out(rows):
    w = None
    for r in rows:
        if w is None:
            w = csv.DictWriter(sys.stdout, fieldnames=list(r))
            w.writeheader()
        w.writerow(r)


def cmd_ziel(a):
    """Reichweitenprobe: erster LP-Verlust der Zielslots nach dem ersten Waffendruck (Position am Trefferframe)."""
    slots = [int(x) for x in a.slots.split(",")]

    def rows():
        for pre in a.prefix:
            L = Lauf(pre)
            pr = [f for f in L.press_frames("A") if L.p(f)["p79"]]
            if not pr:
                yield dict(lauf=L.name, P="", blick="", mun="", slot="", treffer="kein Waffeneinsatz", dx="", dz="",
                           schaden="", st_danach="", pkt="")
                continue
            P0 = pr[0]
            p = L.p(P0)
            for n in slots:
                b = S(n)
                hit = [f for f in range(P0 + 1, L.frames[-1] + 1)
                       if L.v(f, b + 4) and L.v(f, b + 0x40, 2, True) < L.v(f - 1, b + 0x40, 2, True)]
                f = hit[0] if hit else min(L.frames[-1], P0 + a.probe)
                q = L.p(f)
                yield dict(lauf=L.name, P=P0, blick="rechts" if p["face"] & 0x20 else "links", mun="%d->%d" % (
                    p["mun"], L.p(L.frames[-1])["mun"]), slot=n, treffer=("P+%d" % (hit[0] - P0)) if hit else "-",
                    dx=L.v(f, b + 0x0E, 2) - q["x"], dz=L.v(f, b + 0x16, 2) - q["z"],
                    schaden=(L.v(f - 1, b + 0x40, 2, True) - L.v(f, b + 0x40, 2, True)) if hit else "",
                    st_danach="".join(str(L.v(g, b + 4)) for g in range(f, min(L.frames[-1], f + 8) + 1)) if hit else "",
                    pkt=(L.p(f + 1)["pkt"] - q["pkt"]) if hit and f + 1 <= L.frames[-1] else "")
    csv_out(rows())


def cmd_liegen(a):
    """Gegenstaende eines Laufs: Erscheinen, Landung (Liegezeit 700), Liegezeit 0, Status, Freigabe, Kamera-x minus x."""
    def rows():
        for pre in a.prefix:
            L = Lauf(pre)
            for n in range(20, 60):
                b = S(n)
                ep = []
                for f in L.frames:
                    on = L.v(f, b + 4, 2) != 0 and L.v(f, b + 0x38, 4) == ITEM
                    if on and (not ep or ep[-1][1] is not None):
                        ep.append([f, None])
                    if not on and ep and ep[-1][1] is None:
                        ep[-1][1] = f
                for von, frei in ep:
                    bis = (frei - 1) if frei else L.frames[-1]
                    land = next((f for f in range(von, bis + 1) if L.v(f, b + 0x60, 2) == 700
                                 and L.v(f, b + 0x12, 2, True) == 0), None)
                    lz0 = next((f for f in range(land, bis + 1) if L.v(f, b + 0x60, 2) == 0), None) if land else None
                    st = []
                    for f in range(von, bis + 1):
                        v = "%04x" % L.v(f, b + 4, 2)
                        if not st or st[-1][0] != v:
                            st.append((v, f))
                    yield dict(lauf=L.name, slot=n, art=ART.get(L.v(von, b + 0x3D), hex(L.v(von, b + 0x3D))),
                               mun=L.v(bis, b + 0xB1), erscheint=von, hmax=max(L.v(f, b + 0x12, 2, True) for f in range(von, bis + 1)),
                               landung=land or "", liegezeit_0=lz0 or "", status=" ".join("%s@%d" % x for x in st),
                               frei=frei or "", frei_minus_landung=(frei - land) if frei and land else "",
                               liegezeit_ende=L.v(bis, b + 0x60, 2),
                               cam_minus_x_davor=L.p(bis)["cam"] - L.v(bis, b + 0x0E, 2),
                               cam_minus_x_frei=(L.p(frei)["cam"] - L.v(bis, b + 0x0E, 2)) if frei else "")
    csv_out(rows())


def cmd_behaelter(a):
    """Behaelter (Typ 0x9DA2A): Treffer (Schaden, Angreifer-Slot), Zerbrechen, Punkte und der Inhalt danach."""
    def rows():
        for pre in a.prefix:
            L = Lauf(pre)
            for n in range(20, 60):
                b = S(n)
                for f in L.frames[1:]:
                    if L.v(f, b + 0x38, 4) != BEH or not L.v(f, b + 4):
                        continue
                    l0, l1 = L.v(f - 1, b + 0x40, 2, True), L.v(f, b + 0x40, 2, True)
                    if l1 >= l0:
                        continue
                    ang = L.v(f, b + 0x82, 2)
                    ang_slot = ("Figur" if ang == (P + 4) & 0xFFFF else (0xFF0000 + ang - 4 - 0xFFBC90) // 0xC0) if ang else ""
                    neu = ""
                    if f + 1 <= L.frames[-1]:
                        for m in range(20, 60):
                            c = S(m)
                            if L.v(f + 1, c + 0x38, 4) == ITEM and L.v(f + 1, c + 4) and not (
                                    L.v(f, c + 0x38, 4) == ITEM and L.v(f, c + 4)):
                                land = next((g for g in range(f + 1, L.frames[-1] + 1) if L.v(g, c + 0x60, 2) == 700
                                             and L.v(g, c + 0x12, 2, True) == 0), None)
                                hm = max(L.v(g, c + 0x12, 2, True) for g in range(f + 1, (land or L.frames[-1]) + 1))
                                neu += "Slot %d %s mun %d dx %+d dz %+d hmax %d Landung T+%s; " % (
                                    m, ART.get(L.v(f + 1, c + 0x3D), "?"), L.v(min(L.frames[-1], f + 3), c + 0xB1),
                                    L.v(f + 1, c + 0x0E, 2) - L.v(f, b + 0x0E, 2), L.v(f + 1, c + 0x16, 2) - L.v(f, b + 0x16, 2),
                                    hm, (land - f) if land else "-")
                    yield dict(lauf=L.name, slot=n, treffer=f, lp="%d->%d" % (l0, l1), angreifer_slot=ang_slot,
                               figur_aktion="%x" % L.p(f)["act"],
                               status_danach="%04x" % L.v(min(L.frames[-1], f + 1), b + 4, 2),
                               pkt=(L.p(f + 1)["pkt"] - L.p(f)["pkt"]) if f + 1 <= L.frames[-1] else "",
                               inhalt=neu.strip())
    csv_out(rows())


def cmd_katalog(a):
    """Bot-Protokoll: jede Belegung eines Gegenstand-Slots (Art, Munition, Landung, Ende, Ursache)."""
    def rows():
        for fn in a.csv:
            rs = list(csv.DictReader(open(fn)))
            ep = {}
            for i, r in enumerate(rs):
                f = int(r["frame"])
                for n in range(20, 60):
                    g = "g%d_" % n
                    on = int(r[g + "typ"]) == ITEM and int(r[g + "st"]) != 0
                    if on and n not in ep:
                        ep[n] = dict(start=f, art=int(r[g + "art"]), land=None, x=r[g + "x"], z=r[g + "z"])
                    if on:
                        e = ep[n]
                        if e["land"] is None and int(r[g + "lz"]) == 700 and int(r[g + "h"]) == 0:
                            e["land"], e["x"], e["z"] = f, r[g + "x"], r[g + "z"]
                        e["mun"], e["st"], e["lz"] = r[g + "mun"], int(r[g + "st"]), int(r[g + "lz"])
                    if not on and n in ep:
                        e = ep.pop(n)
                        q = rs[i - 1]
                        yield dict(lauf=Path(fn).name.replace("_bot.csv", ""), stage=int(r["stage"]) + 1, slot=n,
                                   art=ART.get(e["art"], hex(e["art"])), mun=e["mun"], erscheint=e["start"],
                                   landung=e["land"] or "", ende=f, st_vorher="%04x" % e["st"], liegezeit_vorher=e["lz"],
                                   ende_minus_landung=(f - e["land"]) if e["land"] else "", x=e["x"], tiefe=e["z"],
                                   kamera_x=r["camx"], waffe="%s->%s" % (q["p79"], r["p79"]), munition_figur=r["pb1"],
                                   lp="%s->%s" % (q["plp"], r["plp"]), pkt=bcd(int(r["pkt"])) - bcd(int(q["pkt"])),
                                   aktion_figur=r["pact"])
            for n, e in ep.items():
                yield dict(lauf=Path(fn).name.replace("_bot.csv", ""), stage="", slot=n, art=ART.get(e["art"], hex(e["art"])),
                           mun=e.get("mun", ""), erscheint=e["start"], landung=e["land"] or "", ende="(Laufende)",
                           st_vorher="", liegezeit_vorher="", ende_minus_landung="", x=e["x"], tiefe=e["z"], kamera_x="",
                           waffe="", munition_figur="", lp="", pkt="", aktion_figur="")
    csv_out(rows())


def cmd_punkte(a):
    """Szenario-Lauf: jede Punkteaenderung mit Kombostufe und den Gegner-LP-Verlusten im selben oder vorigen Frame."""
    def rows():
        for pre in a.prefix:
            L = Lauf(pre)
            for f in L.frames[2:]:
                d = L.p(f)["pkt"] - L.p(f - 1)["pkt"]
                if not d:
                    continue
                geg = []
                for n in range(20):
                    b = S(n)
                    for g in (f - 1, f):
                        l0, l1 = L.v(g - 1, b + 0x40, 2, True), L.v(g, b + 0x40, 2, True)
                        if L.v(g, b + 4) and l1 < l0:
                            geg.append("s%d %s %d->%d" % (n, TYPNAME.get(L.v(g, b + 0x38, 4), hex(L.v(g, b + 0x38, 4))), l0, l1))
                yield dict(lauf=L.name, frame=f, diff=d, kombo=L.p(f - 1)["kombo"], gegner="; ".join(geg))
    csv_out(rows())


def cmd_griff(a):
    """Griff (P+0x09 = 4) und Angriffe im Griff: LP des Gehaltenen, Phase P+0x0C, Aktion P+0x0A, Waffe."""
    def rows():
        for pre in a.prefix:
            L = Lauf(pre)
            g0 = next((f for f in L.frames if L.v(f, P + 0x09) == 4), None)
            for P0 in L.press_frames("A"):
                if g0 is None or P0 < g0 or not L.v(P0, P + 0x09) == 4:
                    continue
                h = L.v(P0, P + 0x70, 2)
                n = (0xFF0000 + h - 4 - 0xFFBC90) // 0xC0 if h else None
                b = S(n) if n is not None else None
                hit = [f for f in range(P0 + 1, min(L.frames[-1], P0 + 15) + 1)
                       if b and L.v(f, b + 0x40, 2, True) < L.v(f - 1, b + 0x40, 2, True)]
                yield dict(lauf=L.name, griff_ab=g0, P=P0, gehalten_slot=n if n is not None else "",
                           waffe=L.p(P0)["p79"], mun=L.p(P0)["mun"],
                           aktion=sorted(set("%x" % L.p(f)["act"] for f in range(P0, min(L.frames[-1], P0 + 10) + 1))),
                           phase=sorted(set("%x" % L.p(f)["ph"] for f in range(P0, min(L.frames[-1], P0 + 10) + 1))),
                           treffer=("P+%d" % (hit[0] - P0)) if hit else "-",
                           schaden=(L.v(hit[0] - 1, b + 0x40, 2, True) - L.v(hit[0], b + 0x40, 2, True)) if hit else "",
                           pkt=(L.p(hit[0] + 1)["pkt"] - L.p(hit[0])["pkt"]) if hit else "")
    csv_out(rows())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("zeit", help=cmd_zeit.__doc__)
    s.add_argument("prefix")
    s.add_argument("--slots", default="")
    s.add_argument("--geschosse", default="")
    s.add_argument("--frames", default="")
    s.set_defaults(fn=cmd_zeit)
    s = sub.add_parser("aufnahme", help=cmd_aufnahme.__doc__)
    s.add_argument("prefix", nargs="+")
    s.set_defaults(fn=cmd_aufnahme)
    s = sub.add_parser("botpunkte", help=cmd_botpunkte.__doc__)
    s.add_argument("csv", nargs="+")
    s.set_defaults(fn=cmd_botpunkte)
    s = sub.add_parser("schuss", help=cmd_schuss.__doc__)
    s.add_argument("prefix", nargs="+")
    s.add_argument("--nach", type=int, default=130)
    s.set_defaults(fn=cmd_schuss)
    s = sub.add_parser("ziel", help=cmd_ziel.__doc__)
    s.add_argument("prefix", nargs="+")
    s.add_argument("--slots", required=True)
    s.add_argument("--probe", type=int, default=13, help="Frame nach P fuer die Position ohne Treffer")
    s.set_defaults(fn=cmd_ziel)
    s = sub.add_parser("liegen", help=cmd_liegen.__doc__)
    s.add_argument("prefix", nargs="+")
    s.set_defaults(fn=cmd_liegen)
    s = sub.add_parser("behaelter", help=cmd_behaelter.__doc__)
    s.add_argument("prefix", nargs="+")
    s.set_defaults(fn=cmd_behaelter)
    s = sub.add_parser("katalog", help=cmd_katalog.__doc__)
    s.add_argument("csv", nargs="+")
    s.set_defaults(fn=cmd_katalog)
    s = sub.add_parser("punkte", help=cmd_punkte.__doc__)
    s.add_argument("prefix", nargs="+")
    s.set_defaults(fn=cmd_punkte)
    s = sub.add_parser("griff", help=cmd_griff.__doc__)
    s.add_argument("prefix", nargs="+")
    s.set_defaults(fn=cmd_griff)
    s = sub.add_parser("objekte", help=cmd_objekte.__doc__)
    s.add_argument("prefix")
    s.add_argument("frame", type=int)
    s.set_defaults(fn=cmd_objekte)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
