#!/usr/bin/env python3
"""Fernangriffe der Gegner (Praefix fern; nur Standardbibliothek).

Wertet die Abzuege von scenarios/fern_frei.lua aus (Bereich 0xFFA900 bis
0xFFEA00, Kamera und Rang im Watch-CSV). Adressen siehe notes.md
("Gefundene Adressen"). Big Endian.

Figur P = FFA990: P+4 Zustand, P+0x0A Aktion, P+0x0E/0x12/0x16 x/Hoehe/Tiefe,
P+0x40 LP, P+0x42 LP des Vorframes, P+0x82 Zeigerwort auf den Angreifer
(Slot = (0xFF0000 + Wort - 4 - 0xFFBC90) / 0xC0). Gegner in Slot 0..19, Geschosse
und Gegenstaende in Slot 20..59, S = 0xFFBC90 + n*0xC0: S+4 Zustand (Byte),
S+0x0A Aktion, S+0x1C Animationszeiger, S+0x24 Trefferattribut, S+0x38
Typkennung, S+0x40 LP, S+0x5E Blickrichtung (0x20 = rechts), S+0x6C
Zeigerwort auf den Werfer (bei Geschossen), S+0x8B Schaden (bei Geschossen
der Schaden des Geschosses), S+0x3D Art und S+0xB1 Munition (Gegenstaende).

Geschoss = Objekt in Slot 20..59, dessen Zeigerwort S+0x6C auf einen SKIP oder
DICK (Slot 0..19) zeigt und dessen Typ nicht die gehaltene Waffe des DICK
(0x9A988) ist: Messer 0x85B42, Kugel und Rakete 0x86022.
Treffer an der Figur = Frame mit P+0x40 < P+0x42; zugeordnet wird er dem
Geschoss, dessen Werfer P+0x82 nennt, das in diesem Frame ein Trefferattribut
traegt und der Figur am naechsten ist.

Unterbefehle:
  geschosse PREFIX..  je Geschoss: Werfer, Erscheinen G (relativ zum Beginn
                      des Schusses), Startlage relativ zu Werfer und Figur,
                      Geschwindigkeit, Flugende, Explosion, Ende und Grund,
                      Weite, Attribut, Schaden, Treffer an der Figur und an
                      Gegnern
  angriffe PREFIX..   je Angriff eines Schuetzen (SKIP, DICK): Beginn A, Art,
                      Abstand x und Tiefe zur Figur in A, Schuesse (Frames
                      relativ zu A), Ende, Nachlauf bis Gehen oder Stand
  zeitachse PREFIX --slot N [--von --bis]  je Frame Animation, Aktion,
                      Position und Abstand eines Slots zur Figur
  abstand PREFIX..    Abstand der DICK zur Figur: Verteilung je Aktion,
                      Abstand bei jedem Schuss, Geschwindigkeit beim Gehen
  erscheinen PREFIX.. Erscheinen von DICK und SKIP (Frame, Slot, Max-LP, Waffe)
                      mit Rang und Tod der Arena-WOOKY
  waffe PREFIX..      DICK beim Tod: Schuesse vorher, gehaltene Waffe, liegender
                      Gegenstand (Art S+0x3D, Munition S+0xB1)
  probe PREFIX..      Lauf mit ausgeloestem Eingriff (CC_GESCH, CC_AB_ZU):
                      erstes Geschoss, Lage der Figur dazu je Frame, Treffer
  zusammenfassung CSV..  fasst Ausgaben von geschosse und angriffe je
                      Angriffsart zusammen
Dritte Messung (Laeufe fern_t_*):
  ausloesung, salve, nachschuss, slots, bahnende, welle, bogen, fenster
                      (Beschreibung je Unterbefehl mit --help)
"""

import argparse
import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
SLOT0, SLOTSZ = 0xFFBC90, 0xC0

TYP = {0x25086: "SKIP", 0x64E7A: "DICK", 0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x46DA4: "DOLG"}
T_MESSER, T_DICKGESCHOSS, T_DICKWAFFE = 0x85B42, 0x86022, 0x9A988
T_ITEM = 0x95F9C
SCHUETZEN = (0x25086, 0x64E7A)
OBJNAME = {0x9DA2A: "Behaelter", 0x98D64: "Glasscheibe"}

# Animationszeiger (S+0x1C), beobachtet in den Laeufen fern_*
SKIP_START = {0x289F2: "Messerwurf", 0x287E0: "Messerstich", 0x28642: "Ausfallstich"}
DICK_SCHUSS = {0x68528: "Pistole", 0x685F8: "Rakete"}
DICK_ZYKLUS = {0x68528, 0x6855C, 0x68590, 0x685C4, 0x685F8, 0x6862A, 0x6865C, 0x68690}
DICK_HALTUNG = {0x686C4, 0x686FE, 0x68730, 0x68760, 0x6878E, 0x687B8}   # Aktion 2
DICK_GEHEN = {0x67806, 0x6783A, 0x6786C, 0x6789A, 0x678C6, 0x678F8, 0x67928, 0x67954}
DICK_STEHEN = {0x677CE, 0x67760}
SKIP_GEHEN = {0x282F4, 0x2832A, 0x2835C, 0x28390, 0x283C8, 0x283FE, 0x28436, 0x28466}
SKIP_STEHEN = {0x284D8, 0x28510, 0x28548, 0x2857E}
SKIP_RENNEN = {0x297D4, 0x2980A, 0x2983C, 0x29870, 0x298A8, 0x298DE, 0x29916, 0x29946}
SKIP_WARTEN = {0x2849E}
GESCHOSS_ANIM = {0x85CE6: "Messer", 0x863D8: "Kugel", 0x863F0: "Kugel-Umwerf",
                 0x2013E: "Rakete", 0x20156: "Rakete"}


def slot(n):
    return SLOT0 + n * SLOTSZ


def zeiger_slot(w):
    """Zeigerwort (S+4 des Ziels, untere 16 Bit) -> Slot 0..59 oder 'P' oder None."""
    if w == (P + 4) & 0xFFFF:
        return "P"
    a = 0xFF0000 + w - 4
    if SLOT0 <= a < SLOT0 + 60 * SLOTSZ and (a - SLOT0) % SLOTSZ == 0:
        return (a - SLOT0) // SLOTSZ
    return None


def ptr_von(n):
    return (slot(n) + 4) & 0xFFFF


class Lauf:
    def __init__(self, prefix):
        self.prefix = prefix
        self.d = Dump(prefix)
        self.name = Path(prefix).name
        self.f = self.d.frames
        self.watch = {}
        wp = Path(prefix + "_watch.csv")
        if wp.exists():
            for r in csv.DictReader(open(wp)):
                self.watch[int(r["frame"])] = r
        self._cache = {}

    def v(self, f, a, w=1, signed=False):
        return self.d.value(f, a, w, signed)

    def rang(self, f):
        r = self.watch.get(f)
        return int(r["rang"]) if r else None

    def rang_mehrheit(self, von, bis):
        c = Counter(int(self.watch[f]["rang"]) for f in self.f if von <= f <= bis and f in self.watch)
        return c.most_common(1)[0][0] if c else None

    def camx(self, f):
        r = self.watch.get(f)
        return int(r["camx"]) if r else None

    # Figur
    def p(self, f):
        v = self.v
        return {
            "x": v(f, P + 0x0E, 2), "z": v(f, P + 0x16, 2), "h": v(f, P + 0x12, 2, True),
            "lp": v(f, P + 0x40, 2, True), "lp0": v(f, P + 0x42, 2, True),
            "st": v(f, P + 4), "akt": v(f, P + 0x0A, 2), "ptr": v(f, P + 0x82, 2),
            "blick": "r" if v(f, P + 0x5E) & 0x20 else "l",
        }

    # Slot
    def s(self, f, n):
        b = slot(n)
        v = self.v
        return {
            "st": v(f, b + 4), "s5": v(f, b + 5), "akt": v(f, b + 0x0A, 2), "ph": v(f, b + 0x0C, 2),
            "x": v(f, b + 0x0E, 2), "xf": v(f, b + 0x10, 2), "h": v(f, b + 0x12, 2, True),
            "z": v(f, b + 0x16, 2), "anim": v(f, b + 0x1C, 4), "attr": v(f, b + 0x24, 2),
            "typ": v(f, b + 0x38, 4), "lp": v(f, b + 0x40, 2, True), "lp0": v(f, b + 0x42, 2, True),
            "blick": "r" if v(f, b + 0x5E) & 0x20 else "l", "zeiger": v(f, b + 0x6C, 2),
            "s82": v(f, b + 0x82, 2), "schaden": v(f, b + 0x8B), "art": v(f, b + 0x3D),
            "mun": v(f, b + 0xB1), "max": v(f, b + 0x9A, 2),
        }

    def treffer_figur(self):
        """Frames mit LP-Verlust der Figur: (f, Schaden, Angreifer-Slot)."""
        out = []
        for f in self.f:
            lp, lp0 = self.v(f, P + 0x40, 2, True), self.v(f, P + 0x42, 2, True)
            if lp < lp0:
                out.append((f, lp0 - lp, zeiger_slot(self.v(f, P + 0x82, 2))))
        return out

    def schuetzen(self):
        """Slots 0..19, in denen irgendwann SKIP oder DICK steht: {n: [(von, bis, typ)]}."""
        res = defaultdict(list)
        for n in range(20):
            b = slot(n)
            cur = None
            for f in self.f:
                st = self.v(f, b + 4)
                typ = self.v(f, b + 0x38, 4) if st else None
                if typ != (cur[2] if cur else None):
                    if cur and cur[2] in SCHUETZEN:
                        res[n].append((cur[0], f - 1, cur[2]))
                    cur = (f, None, typ) if typ else None
            if cur and cur[2] in SCHUETZEN:
                res[n].append((cur[0], self.f[-1], cur[2]))
        return res


def blickvorzeichen(blick):
    return 1 if blick == "r" else -1


# --------------------------------------------------------------------------
# Geschosse

def geschosse(L):
    """Liste der Geschosse eines Laufs mit Zeitreihe."""
    gs = []
    offen = {}
    for f in L.f:
        for n in range(20, 60):
            b = slot(n)
            st = L.v(f, b + 4)
            typ = L.v(f, b + 0x38, 4) if st else None
            zg = L.v(f, b + 0x6C, 2) if st else None
            werfer = zeiger_slot(zg) if zg else None
            ist = (st and isinstance(werfer, int) and werfer < 20 and typ != T_DICKWAFFE and typ != T_ITEM
                   and L.v(f, slot(werfer) + 0x38, 4) in SCHUETZEN)
            g = offen.get(n)
            if g and (not ist or typ != g["typ"] or werfer != g["werfer"]):
                g["ende"] = f
                gs.append(g)
                del offen[n]
                g = None
            if ist and not g:
                offen[n] = {"slot": n, "typ": typ, "werfer": werfer, "start": f, "reihe": []}
                g = offen[n]
            if g:
                g["reihe"].append((f, L.s(f, n)))
    for g in offen.values():
        g["ende"] = None
        gs.append(g)
    gs.sort(key=lambda g: (g["start"], g["slot"]))
    return gs


def aktiv(attr):
    """Trefferattribut eines Geschosses wirksam: nicht 0 und nicht 0xFFxx."""
    return attr != 0 and attr >> 8 != 0xFF


def schuss_beginn(L, werfer, g_frame):
    """Beginn A des Schusses (Wechsel des Animationszeigers auf eine Startanimation) vor G."""
    for f in range(g_frame, max(L.f[0], g_frame - 80) - 1, -1):
        if f not in L.d.offsets or f - 1 not in L.d.offsets:
            continue
        a = L.v(f, slot(werfer) + 0x1C, 4)
        a0 = L.v(f - 1, slot(werfer) + 0x1C, 4)
        if a != a0 and (a in SKIP_START or a in DICK_SCHUSS):
            return f, SKIP_START.get(a) or DICK_SCHUSS.get(a)
    return None, None


def treffer_zuordnen(L, gs, treffer):
    """Je LP-Verlust der Figur das Geschoss des genannten Werfers, das in diesem
    Frame wirkt und der Figur in x am naechsten ist: {(slot, start): [frames]}."""
    zu = defaultdict(list)
    for (f, sch, ang) in treffer:
        best = None
        for g in gs:
            if g["werfer"] != ang:
                continue
            sf = next((s for ff, s in g["reihe"] if ff == f), None)
            if sf is None or not aktiv(sf["attr"]) or sf["st"] == 3:
                continue
            d = abs(sf["x"] - L.v(f, P + 0x0E, 2))
            if best is None or d < best[0]:
                best = (d, g)
        if best:
            zu[(best[1]["slot"], best[1]["start"])].append(f)
    return zu


def analysiere_geschoss(L, g, treffer, zuordnung=None):
    r = g["reihe"]
    f0, s0 = r[0]
    w = L.s(f0, g["werfer"])
    p0 = L.p(f0)
    A, art_schuss = schuss_beginn(L, g["werfer"], f0)
    art = GESCHOSS_ANIM.get(s0["anim"], f"anim {s0['anim']:#x}")
    if g["typ"] == T_MESSER:
        art = "Messer"
    vz = blickvorzeichen(w["blick"])
    # Flug: Fluganimation, Zustand 1 und x aendert sich
    flug = [r[0]]
    for i in range(1, len(r)):
        si, sv = r[i][1], r[i - 1][1]
        if si["anim"] not in GESCHOSS_ANIM or si["st"] == 3 or (si["x"] == sv["x"] and si["xf"] == sv["xf"]):
            break
        flug.append(r[i])
    abgewehrt = next((f for f, sx in r if sx["st"] == 3), None)
    fl_ende = flug[-1][0]
    xs = [s["x"] + s["xf"] / 65536 for _, s in flug]
    vx = (xs[-1] - xs[0]) / (len(xs) - 1) if len(xs) > 1 else 0.0
    hs = [s["h"] for _, s in flug]
    zs = sorted(set(s["z"] for _, s in flug))
    attrs = Counter(s["attr"] for _, s in r)
    akt_frames = [f for f, s in r if aktiv(s["attr"]) and s["st"] != 3]
    expl = [f for f, s in r if s["attr"] >> 8 == 0x14]
    # Treffer an der Figur
    th = []
    meine = None if zuordnung is None else set(zuordnung.get((g["slot"], g["start"]), []))
    for (f, sch, ang) in treffer:
        if ang != g["werfer"] or not (r[0][0] <= f <= r[-1][0]):
            continue
        if meine is not None and f not in meine:
            continue
        sf = dict(r)[f]
        if not aktiv(sf["attr"]) or sf["st"] == 3:
            continue
        p = L.p(f)
        th.append({"f": f, "schaden": sch, "s8b": sf["schaden"], "attr": sf["attr"],
                   "dx": sf["x"] - p["x"], "dz": sf["z"] - p["z"], "ph": p["h"], "gh": sf["h"]})
    # naechster Frame nach dem Treffer: Umwerfen (Zustand 2 oder Aktion 0x0C)
    for t in th:
        f = t["f"]
        um = any(L.v(k, P + 4) == 2 or L.v(k, P + 0x0A, 2) == 0x0C for k in (f, f + 1, f + 2) if k in L.d.offsets)
        t["um"] = "ja" if um else "nein"
    # Treffer an Gegnern (LP-Verlust eines anderen Gegners, solange das Geschoss wirkt)
    tg = []
    for f, sf in r:
        if not aktiv(sf["attr"]) or f - 1 not in L.d.offsets:
            continue
        for n in range(60):
            if n == g["werfer"] or n == g["slot"]:
                continue
            b = slot(n)
            if not L.v(f, b + 4):
                continue
            if n >= 20 and L.v(f, b + 0x38, 4) not in (0x9DA2A, 0x98D64):
                continue
            lp, lp0 = L.v(f, b + 0x40, 2, True), L.v(f - 1, b + 0x40, 2, True)
            if lp < lp0 and abs(L.v(f, b + 0x0E, 2) - sf["x"]) <= 150:
                tg.append(f"f{f} slot{n} {OBJNAME.get(L.v(f, b + 0x38, 4)) or TYP.get(L.v(f, b + 0x38, 4), hex(L.v(f, b + 0x38, 4)))} -{lp0 - lp} "
                          f"dx{L.v(f, b + 0x0E, 2) - sf['x']} dz{L.v(f, b + 0x16, 2) - sf['z']} s82 {L.v(f, b + 0x82, 2):04x}")
    # Ende
    ende = g["ende"]
    letzte = r[-1][1]
    if th:
        grund = "Treffer Figur"
    elif abgewehrt:
        grund = "abgewehrt"
    elif tg:
        grund = "Treffer Gegner"
    elif expl:
        grund = "Explosion"
    elif ende is None:
        grund = "Laufende"
    else:
        grund = "Ablauf"
    nach = Counter()
    for f, s in r[len(flug):]:
        nach[s["anim"] >> 8] += 1
    camx = L.camx(fl_ende)
    return {
        "lauf": L.name, "slot": g["slot"], "typ": f"{g['typ']:#x}", "art": art,
        "werfer": g["werfer"], "werfer_typ": TYP.get(w["typ"], hex(w["typ"])), "rang": L.rang(f0),
        "schuss": art_schuss or "", "A": A if A else "", "G": f0, "G-A": f0 - A if A else "",
        "x0": s0["x"], "z0": s0["z"], "h0": s0["h"], "blick": w["blick"],
        "vorn0": (s0["x"] - w["x"]) * vz, "dz_werfer": s0["z"] - w["z"],
        "fig_dx0": (p0["x"] - w["x"]) * vz, "fig_dz0": p0["z"] - w["z"], "fig_h0": p0["h"],
        "vx": round(vx, 4), "h_verlauf": f"{hs[0]}..{hs[-1]}" if hs else "",
        "z_flug": "/".join(map(str, zs)),
        "flug_bis": fl_ende, "flugframes": fl_ende - f0 + 1, "x_flugende": flug[-1][1]["x"],
        "weite": abs(flug[-1][1]["x"] - s0["x"]), "camx_flugende": camx if camx is not None else "",
        "ende": ende if ende else "", "dauer": (ende - f0) if ende else "",
        "attr": " ".join(f"{a:04x}:{n}" for a, n in sorted(attrs.items())),
        "aktiv": f"{akt_frames[0]}-{akt_frames[-1]}" if akt_frames else "",
        "aktiv_n": len(akt_frames),
        "explosion": f"{expl[0]}-{expl[-1]}" if expl else "",
        "schaden8b": s0["schaden"], "grund": grund,
        "treffer": " ".join(f"f{t['f']}(-{t['schaden']},8B {t['s8b']},attr {t['attr']:04x},um {t['um']},dx {t['dx']},dz {t['dz']},h {t['ph']})" for t in th),
        "treffer_gegner": " | ".join(tg),
        "nachphasen": " ".join(f"{k:04x}xx:{n}" for k, n in sorted(nach.items())),
        "s82_ende": f"{letzte['s82']:04x}",
        "abgewehrt": abgewehrt if abgewehrt else "",
        "abgewehrt_figur": (f"akt {L.v(abgewehrt, P + 0x0A, 2):#x} dx {L.v(abgewehrt, P + 0x0E, 2) - dict(r)[abgewehrt]['x']}"
                            if abgewehrt else ""),
    }


def cmd_geschosse(a):
    w = None
    for pr in a.prefix:
        L = Lauf(pr)
        tr = L.treffer_figur()
        gs = geschosse(L)
        zu = treffer_zuordnen(L, gs, tr)
        for g in gs:
            row = analysiere_geschoss(L, g, tr, zu)
            if w is None:
                w = csv.DictWriter(sys.stdout, fieldnames=list(row.keys()))
                w.writeheader()
            w.writerow(row)


# --------------------------------------------------------------------------
# Angriffe der Schuetzen

def angriffe(L, n, von, bis, typ):
    """Angriffe eines Schuetzen in Slot n zwischen von und bis."""
    out = []
    b = slot(n)
    fr = [f for f in L.f if von <= f <= bis]
    i = 0
    while i < len(fr):
        f = fr[i]
        an = L.v(f, b + 0x1C, 4)
        an0 = L.v(f - 1, b + 0x1C, 4) if f - 1 in L.d.offsets else None
        art = None
        if typ == 0x25086 and an in SKIP_START and an != an0:
            art = SKIP_START[an]
        if typ == 0x64E7A and an in DICK_SCHUSS and an0 not in DICK_ZYKLUS:
            art = DICK_SCHUSS[an]
        if typ == 0x64E7A and an in DICK_HALTUNG and an0 not in DICK_HALTUNG:
            art = "Haltung"
        if not art:
            i += 1
            continue
        A = f
        schuesse = []
        j = i
        neutral = (SKIP_GEHEN | SKIP_STEHEN | SKIP_RENNEN) if typ == 0x25086 else (DICK_GEHEN | DICK_STEHEN)
        ende, grund = None, "laufende"
        while j < len(fr):
            g = fr[j]
            ag = L.v(g, b + 0x1C, 4)
            ag0 = L.v(g - 1, b + 0x1C, 4) if g - 1 in L.d.offsets else None
            if L.v(g, b + 4) not in (1,):
                ende, grund = g, f"zustand {L.v(g, b + 4)}"
                break
            if typ == 0x64E7A and ag in DICK_SCHUSS and ag != ag0:
                schuesse.append(g - A)
            if g > A and typ == 0x25086 and ag in SKIP_START and ag != ag0:
                ende, grund = g, f"neuer angriff {SKIP_START[ag]}"
                break
            if g > A and art == "Haltung" and ag not in DICK_HALTUNG:
                ende, grund = g, f"{ag:#x}"
                break
            if g > A and ag in neutral:
                ende, grund = g, f"{ag:#x}"
                break
            j += 1
        s = L.s(A, n)
        p = L.p(A)
        vz = blickvorzeichen(s["blick"])
        e = ende if ende else fr[-1]
        # Treffer an der Figur waehrend des Angriffs (Zeiger P+0x82 auf diesen Slot);
        # bei Fernangriffen bis 60 Frames nach dem Ende (Geschoss im Flug)
        tr = []
        for f2 in range(A, e + (60 if art in ("Pistole", "Rakete", "Messerwurf") else 1)):
            if f2 not in L.d.offsets:
                continue
            lp, lp0 = L.v(f2, P + 0x40, 2, True), L.v(f2, P + 0x42, 2, True)
            if lp < lp0 and zeiger_slot(L.v(f2, P + 0x82, 2)) == n:
                um = any(L.v(k, P + 4) == 2 or L.v(k, P + 0x0A, 2) == 0x0C
                         for k in (f2, f2 + 1, f2 + 2) if k in L.d.offsets)
                tr.append(f"A+{f2 - A}:-{lp0 - lp}{'U' if um else ''}")
        out.append({
            "lauf": L.name, "slot": n, "typ": TYP.get(typ), "rang": L.rang(A), "art": art, "A": A,
            "blick": s["blick"], "d": (p["x"] - s["x"]) * vz, "dx": s["x"] - p["x"], "dz": s["z"] - p["z"],
            "fig_h": p["h"], "fig_st": p["st"], "schuesse": " ".join(map(str, schuesse)),
            "n_schuesse": len(schuesse), "ende": ende if ende else "", "dauer": e - A, "grund": grund,
            "akt": L.v(A, slot(n) + 0x0A, 2), "ph": L.v(A, slot(n) + 0x0C, 2),
            "treffer": " ".join(tr),
        })
        i = j if j > i else i + 1
    return out


def cmd_angriffe(a):
    w = None
    for pr in a.prefix:
        L = Lauf(pr)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                for row in angriffe(L, n, von, bis, typ):
                    if w is None:
                        w = csv.DictWriter(sys.stdout, fieldnames=list(row.keys()))
                        w.writeheader()
                    w.writerow(row)


# --------------------------------------------------------------------------

def cmd_zeitachse(a):
    L = Lauf(a.prefix[0])
    n = a.slot
    prev = None
    tr = {f: (s, z) for f, s, z in L.treffer_figur()}
    print("frame,st,akt,ph,anim,attr,x,z,h,blick,fig_x,fig_z,fig_h,dx,dz,d,fig_st,fig_akt,treffer")
    for f in L.f:
        if f < a.von or f > a.bis:
            continue
        s = L.s(f, n)
        p = L.p(f)
        key = (s["st"], s["akt"], s["ph"], s["anim"], s["attr"])
        if a.alle or key != prev or f in tr or s["x"] != (prev and prev_x):
            vz = blickvorzeichen(s["blick"])
            t = f"-{tr[f][0]} von {tr[f][1]}" if f in tr else ""
            print(f"{f},{s['st']},{s['akt']:#x},{s['ph']:#x},{s['anim']:#x},{s['attr']:#06x},{s['x']},{s['z']},{s['h']},"
                  f"{s['blick']},{p['x']},{p['z']},{p['h']},{s['x'] - p['x']},{s['z'] - p['z']},{(p['x'] - s['x']) * vz},"
                  f"{p['st']},{p['akt']:#x},{t}")
        prev = key
        prev_x = s["x"]


def cmd_probe(a):
    """Je Lauf das k-te Geschoss eines Schuetzen: Lage der Figur relativ zum
    Geschoss (Frame-Ende), Treffer, Ende des Geschosses."""
    rows = []
    for pr in a.prefix:
        L = Lauf(pr)
        tr = L.treffer_figur()
        gs = [g for g in geschosse(L) if TYP.get(L.v(g["start"], slot(g["werfer"]) + 0x38, 4)) in ("SKIP", "DICK")]
        if a.werfer is not None:
            gs = [g for g in gs if g["werfer"] == a.werfer]
        if len(gs) < a.k:
            row = {"lauf": L.name, "G": "", "art": "kein Geschoss"}
        else:
            g = gs[a.k - 1]
            info = analysiere_geschoss(L, g, tr, treffer_zuordnen(L, gs, tr))
            r = g["reihe"]
            # Lage der Figur relativ zum Geschoss je Frame (Frame-Ende), nur wirksame Frames
            rel = []
            for f, s in r:
                p = L.p(f)
                rel.append((f, p["x"] - s["x"], p["z"] - s["z"], p["h"], s["h"], aktiv(s["attr"]), p["blick"]))
            akt_rel = [x for x in rel if x[5]]
            th = [t for t in tr if t[2] == g["werfer"] and r[0][0] <= t[0] <= r[-1][0]]
            hit = th[0][0] if th else None
            at = next((x for x in rel if x[0] == hit), None) if hit else None
            # gehaltene Lage: haeufigste relative Lage in den wirksamen Frames vor dem Treffer
            vor = [x for x in akt_rel if hit is None or x[0] < hit] or akt_rel
            c = Counter((x[1], x[2], x[3]) for x in vor)
            gehalten = c.most_common(1)[0][0] if c else ("", "", "")
            fl = [x for x in rel]
            bei = {x[0]: x for x in rel}
            vz = 1 if info["vx"] >= 0 else -1
            row = {
                "lauf": L.name, "G": info["G"], "art": info["art"], "werfer": info["werfer"],
                "rang": info["rang"], "flugrichtung": "+x" if vz > 0 else "-x",
                "rel_dx": gehalten[0], "rel_dz": gehalten[1], "fig_h": gehalten[2],
                "vorn": gehalten[0] * vz if gehalten[0] != "" else "",
                "frames_gehalten": c.most_common(1)[0][1] if c else 0,
                "blick_figur": fl[0][6] if fl else "",
                "treffer": "ja" if hit else "nein", "treffer_frame": hit if hit else "",
                "treffer_rel": f"G+{hit - info['G']}" if hit else "",
                "dx_treffer": at[1] if at else "", "dz_treffer": at[2] if at else "",
                "h_treffer": at[3] if at else "", "gh_treffer": at[4] if at else "",
                "schaden": th[0][1] if th else "",
                "umgeworfen": info["treffer"].split("um ")[1].split(",")[0] if hit and "um " in info["treffer"] else "",
                "ende": info["ende"], "dauer": info["dauer"], "flugframes": info["flugframes"],
                "x_flugende": info["x_flugende"], "grund": info["grund"],
                "nachphasen": info["nachphasen"], "treffer_gegner": info["treffer_gegner"],
                "abgewehrt": info["abgewehrt"], "abgewehrt_figur": info["abgewehrt_figur"],
                "camx_flugende": info["camx_flugende"],
                "h_G1": bei[info["G"] + 1][3] if info["G"] + 1 in bei else "",
                "h_G21": bei[info["G"] + 21][3] if info["G"] + 21 in bei else "",
                "vx": info["vx"], "x0": info["x0"], "z0": info["z0"], "h0": info["h0"],
            }
        rows.append(row)
    felder = max((list(r.keys()) for r in rows), key=len) if rows else ["lauf"]
    w = csv.DictWriter(sys.stdout, fieldnames=felder, extrasaction="ignore")
    w.writeheader()
    for row in rows:
        w.writerow(row)


# --------------------------------------------------------------------------
# Abstand, Rhythmus, Waffe

def geschwindigkeit(L, n, f):
    """x- und Tiefengeschwindigkeit (16.16) von Slot n zwischen f-1 und f."""
    b = slot(n)
    if f - 1 not in L.d.offsets:
        return None
    x1 = L.v(f, b + 0x0E, 2) + L.v(f, b + 0x10, 2) / 65536
    x0 = L.v(f - 1, b + 0x0E, 2) + L.v(f - 1, b + 0x10, 2) / 65536
    z1 = L.v(f, b + 0x16, 2) + L.v(f, b + 0x18, 2) / 65536
    z0 = L.v(f - 1, b + 0x16, 2) + L.v(f - 1, b + 0x18, 2) / 65536
    return x1 - x0, z1 - z0


def cmd_abstand(a):
    """Je Schuetze: Zielpunkt (S+0x96/S+0x98), Abstand und Tiefe bei Angriffsbeginn,
    Vorbereitung (Aktion 6, Phase 2 bzw. 0x0A), Gehgeschwindigkeit, Rueckzug."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "rang", "groesse", "wert", "anzahl", "beispiele"])
    for pr in a.prefix:
        L = Lauf(pr)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                b = slot(n)
                name = TYP[typ]
                ang = angriffe(L, n, von, bis, typ)
                rang = L.rang_mehrheit(von, bis)
                schuss = [x for x in ang if x["art"] in ("Pistole", "Rakete", "Messerwurf")]
                # Zielpunkt und Vorbereitung vor jedem Schuss
                ziele, vorb, vorb_dz, start_d = Counter(), [], [], []
                for x in schuss:
                    A = x["A"]
                    ph = 0x0A if typ == 0x25086 else 0x02
                    f = A
                    while f - 1 in L.d.offsets and L.v(f - 1, b + 0x0A, 2) == 6 and L.v(f - 1, b + 0x0C, 2) == ph:
                        f -= 1
                    fz = f - 1 if typ == 0x64E7A else A - 1
                    zx, zz = L.v(fz, b + 0x96, 2, True), L.v(fz, b + 0x98, 2, True)
                    if typ == 0x25086:
                        px = L.v(A - 1, P + 0x0E, 2)
                        ziele[(zx - px, zz - L.v(A - 1, P + 0x16, 2))] += 1
                    else:
                        ziele[(zx, zz)] += 1
                    vorb.append(A - f)
                    s0, p0 = L.s(f, n), L.p(f)
                    vorb_dz.append(f"{s0['z'] - p0['z']}>{x['dz']}")
                    start_d.append(abs(s0["x"] - p0["x"]))
                d_s = Counter((x["art"], x["d"]) for x in schuss)
                dz_s = Counter((x["art"], x["dz"]) for x in schuss)
                # Gehen: Geschwindigkeit, Richtung relativ zur Figur und Blick
                vx_c, vz_c, rueck, hin = Counter(), Counter(), 0, 0
                rueck_blick = Counter()
                for f in L.f:
                    if f <= von or f > bis or L.v(f, b + 4) != 1:
                        continue
                    akt = L.v(f, b + 0x0A, 2)
                    v = geschwindigkeit(L, n, f)
                    if not v or (v[0] == 0 and v[1] == 0):
                        continue
                    if akt in (0, 6) and L.v(f - 1, b + 0x0A, 2) == akt:
                        vx_c[(round(abs(v[0]), 4), round(abs(v[1]), 4))] += 1
                        vz_c[round((v[0] ** 2 + v[1] ** 2) ** 0.5, 2)] += 1
                        sx, px = L.v(f, b + 0x0E, 2), L.v(f, P + 0x0E, 2)
                        weg = (sx - px) * v[0] > 0
                        if weg:
                            rueck += 1
                            blick = "r" if L.v(f, b + 0x5E) & 0x20 else "l"
                            zur_figur = (px > sx) == (blick == "r")
                            rueck_blick["blickt zur Figur" if zur_figur else "blickt weg"] += 1
                        else:
                            hin += 1
                # Verteilung |dx| zur Figur (alle Frames, in denen beide stehen bzw. gehen)
                hist = Counter()
                hist_steht = Counter()
                reakt = Counter()
                for f in L.f:
                    if f <= von or f > bis or L.v(f, b + 4) != 1 or f - 1 not in L.d.offsets:
                        continue
                    sx, px = L.v(f, b + 0x0E, 2), L.v(f, P + 0x0E, 2)
                    hist[min(abs(sx - px) // 20 * 20, 300)] += 1
                    if L.v(f, P + 4) == 1 and L.v(f, P + 0x0A, 2) == 0:
                        hist_steht[min(abs(sx - px) // 20 * 20, 300)] += 1
                    # Figur geht auf ihn zu (eigene Bewegung, Zustand 1, Aktion 0)?
                    pv = L.v(f, P + 0x0E, 2) - L.v(f - 1, P + 0x0E, 2)
                    if L.v(f, P + 4) == 1 and L.v(f, P + 0x0A, 2) == 0 and pv != 0 and (sx - px) * pv > 0:
                        v = geschwindigkeit(L, n, f)
                        akt = L.v(f, b + 0x0A, 2)
                        if v and v[0] != 0 and (sx - px) * v[0] > 0:
                            reakt[f"weicht zurueck (akt {akt})"] += 1
                        elif v and v[0] != 0:
                            reakt[f"kommt naeher (akt {akt})"] += 1
                        else:
                            reakt[f"bleibt in x (akt {akt})"] += 1
                def fmt(c, k=8):
                    return " ".join(f"{kk}:{vv}" for kk, vv in c.most_common(k))
                rows = [
                    ("zielpunkt (dx,dz)" if typ == 0x64E7A else "zielpunkt relativ zur figur (dx,dz)", fmt(ziele), sum(ziele.values()), ""),
                    ("vorbereitung frames", " ".join(map(str, vorb)), len(vorb), ""),
                    ("vorbereitung dz start>ende", " ".join(vorb_dz), len(vorb_dz), ""),
                    ("abstand x bei start der vorbereitung", " ".join(map(str, start_d)), len(start_d), ""),
                    ("d bei angriffsbeginn", fmt(d_s, 20), sum(d_s.values()), ""),
                    ("dz bei angriffsbeginn", fmt(dz_s, 20), sum(dz_s.values()), ""),
                    ("geschwindigkeit (|vx|,|vz|) px/frame, haeufigste", fmt(vx_c, 8), sum(vx_c.values()), ""),
                    ("betrag der geschwindigkeit px/frame", fmt(vz_c, 8), sum(vz_c.values()), ""),
                    ("frames weg von der figur / zur figur", f"{rueck} / {hin}", rueck + hin, fmt(rueck_blick)),
                    ("verteilung |dx| zur figur (20er-klassen: frames)", " ".join(f"{k}:{v}" for k, v in sorted(hist.items())),
                     sum(hist.values()), ""),
                    ("verteilung |dx|, figur steht frei (zustand 1, aktion 0)", " ".join(f"{k}:{v}" for k, v in sorted(hist_steht.items())),
                     sum(hist_steht.values()), ""),
                    ("reaktion, waehrend die figur auf ihn zugeht (frames)", fmt(reakt), sum(reakt.values()), ""),
                ]
                for g, wert, anz, bsp in rows:
                    w.writerow([L.name, n, name, rang, g, wert, anz, bsp])


def cmd_rhythmus(a):
    """Abstaende zwischen Angriffsbeginnen je Schuetze; Salven (DICK) und
    Stichserien (SKIP, Messerstich im Abstand <= 40 Frames)."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "rang", "frames", "art", "anzahl", "abstaende_gleiche_art", "abstaende_alle_schuesse", "salven_bzw_serien"])
    for pr in a.prefix:
        L = Lauf(pr)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                ang = [x for x in angriffe(L, n, von, bis, typ) if x["art"] != "Haltung"]
                fern = [x for x in ang if x["art"] in ("Pistole", "Rakete", "Messerwurf")]
                alle_fern = [b["A"] - a_["A"] for a_, b in zip(fern, fern[1:])]
                for art in sorted(set(x["art"] for x in ang)):
                    xs = [x for x in ang if x["art"] == art]
                    abst = [b["A"] - a_["A"] for a_, b in zip(xs, xs[1:])]
                    if art in ("Pistole", "Rakete"):
                        ser = " ".join(str(x["n_schuesse"]) for x in xs)
                    elif art == "Messerstich":
                        serien, cur = [], 1
                        for d in abst:
                            if d <= 40:
                                cur += 1
                            else:
                                serien.append(cur)
                                cur = 1
                        if xs:
                            serien.append(cur)
                        ser = " ".join(map(str, serien))
                    else:
                        ser = ""
                    w.writerow([L.name, n, TYP[typ], L.rang_mehrheit(von, bis), f"{von}-{bis}", art, len(xs),
                                " ".join(map(str, abst)), " ".join(map(str, alle_fern)) if art in ("Pistole", "Rakete", "Messerwurf") else "", ser])


def cmd_waffe(a):
    """DICK beim Tod: Frame des toedlichen Treffers, Schuesse davor, gehaltene
    Waffe (Typ 0x9A988), liegender Gegenstand (Art, Munition, Liegezeit)."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "rang", "lp_max", "tod_frame", "schuesse_vorher", "geschosse", "waffe_slot",
                "waffe_landung", "gegenstand_ab", "art", "munition", "liegezeit", "x", "z"])
    for pr in a.prefix:
        L = Lauf(pr)
        gs = geschosse(L)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                if typ != 0x64E7A:
                    continue
                b = slot(n)
                tod = next((f for f in L.f if von <= f <= bis and L.v(f, b + 0x40, 2, True) < 0), None)
                if tod is None:
                    continue
                schuesse = [g for g in gs if g["werfer"] == n and g["start"] < tod]
                arten = Counter(GESCHOSS_ANIM.get(g["reihe"][0][1]["anim"], "?") for g in schuesse)
                ptr = ptr_von(n)
                ws = next((m for m in range(20, 60) if L.v(von + 1 if von + 1 in L.d.offsets else von, slot(m) + 0x38, 4) == T_DICKWAFFE
                           and L.v(von + 1 if von + 1 in L.d.offsets else von, slot(m) + 0x6C, 2) == ptr), None)
                if ws is None:
                    w.writerow([L.name, n, L.rang(tod), L.v(tod, b + 0x9A, 2), tod, len(schuesse), fmt_c(arten), "", "", "", "", "", "", "", ""])
                    continue
                wb = slot(ws)
                ab = next((f for f in L.f if f > tod and L.v(f, wb + 0x38, 4) == T_ITEM), None)
                land = ab - 1 if ab else ""
                if ab:
                    f2 = min(ab + 2, L.f[-1])
                    w.writerow([L.name, n, L.rang(tod), L.v(tod, b + 0x9A, 2), tod, len(schuesse), fmt_c(arten), ws, land, ab,
                                f"{L.v(f2, wb + 0x3D):#04x}", L.v(f2, wb + 0xB1), L.v(f2, wb + 0x60, 2),
                                L.v(f2, wb + 0x0E, 2), L.v(f2, wb + 0x16, 2)])
                else:
                    w.writerow([L.name, n, L.rang(tod), L.v(tod, b + 0x9A, 2), tod, len(schuesse), fmt_c(arten), ws, "", "", "", "", "", "", ""])


def fmt_c(c):
    return " ".join(f"{k}:{v}" for k, v in sorted(c.items()))



# --------------------------------------------------------------------------
# Zusammenfassung

def lies(pfad):
    p = Path(pfad)
    return list(csv.DictReader(open(p))) if p.exists() and p.stat().st_size else []


def spanne(werte):
    werte = [w for w in werte if w != ""]
    if not werte:
        return ""
    werte = sorted(werte)
    return f"{werte[0]}" if werte[0] == werte[-1] else f"{werte[0]} bis {werte[-1]}"


def zaehle(werte, k=12):
    c = Counter(werte)
    return " ".join(f"{w}:{n}" for w, n in sorted(c.items(), key=lambda x: (-x[1], str(x[0])))[:k])


def probe_proben(rows, achse, erster):
    """(wert, treffer) je Probe. Treffer nur, wenn im erwarteten ersten Frame (G+erster);
    ein spaeterer Treffer oder keiner zaehlt als 'kein Treffer' an der gehaltenen Lage."""
    out = []
    for r in rows:
        if not r.get("G"):
            continue
        sg = 1 if r.get("flugrichtung") == "+x" else -1
        if r["treffer"] == "ja" and r["treffer_rel"] == f"G+{erster}":
            if achse == "x":
                w = int(r["dx_treffer"]) * sg
            elif achse == "z":
                w = int(r["dz_treffer"])
            else:
                w = int(r["h_treffer"])
            out.append((w, True, r["lauf"]))
        else:
            if achse == "x":
                if r["rel_dx"] == "" or int(r["frames_gehalten"] or 0) < 3:
                    continue
                w = int(r["rel_dx"]) * sg
            elif achse == "z":
                if r["rel_dz"] == "" or int(r["frames_gehalten"] or 0) < 3:
                    continue
                w = int(r["rel_dz"])
            else:
                hk = r.get(f"h_G{erster}", "")
                if hk == "":
                    continue
                w = int(hk)
            out.append((w, False, r["lauf"]))
    return out


def grenzen(proben):
    """Bereich der Treffer und die naechsten Proben ohne Treffer ausserhalb."""
    t = sorted(w for w, h, _ in proben if h)
    if not t:
        return "kein Treffer", ""
    lo, hi = t[0], t[-1]
    unter = [w for w, h, _ in proben if not h and w < lo]
    ueber = [w for w, h, _ in proben if not h and w > hi]
    innen = sorted(set(w for w, h, _ in proben if not h and lo < w < hi))
    txt = f"Treffer {lo} bis {hi}"
    rand = []
    rand.append(f"kein Treffer bei {max(unter)}" if unter else "untere Grenze nicht erreicht")
    rand.append(f"bei {min(ueber)}" if ueber else "obere Grenze nicht erreicht")
    if innen:
        rand.append("Luecken ohne Treffer: " + " ".join(map(str, innen)))
    return txt, "; ".join(rand)


def cmd_zusammenfassung(a):
    d = Path(a.verzeichnis)
    G = lies(d / "geschosse.csv")
    AN = lies(d / "angriffe.csv")
    RH = lies(d / "rhythmus.csv")
    AB = lies(d / "abstand.csv")
    BM = lies(d / "b_messer.csv")
    BK = lies(d / "b_kugel.csv")
    BK2 = lies(d / "b_kugel2.csv")
    BR = lies(d / "b_rakete.csv")
    C = lies(d / "c_abwehr.csv")
    C2 = lies(d / "c_abwehr_k2.csv")
    D = lies(d / "d_rang.csv")
    E = lies(d / "e_waffe.csv")
    w = csv.writer(sys.stdout)
    w.writerow(["angriff", "groesse", "wert", "anzahl", "beleg"])

    def zeile(angr, gr, wert, n, beleg):
        w.writerow([angr, gr, wert, n, beleg])

    def laeufe(rows):
        return " ".join(sorted(set(r["lauf"].replace("fern_", "") for r in rows)))

    gruppen = {"Messerwurf": [g for g in G if g["art"] == "Messer"],
               "Pistole": [g for g in G if g["art"].startswith("Kugel")],
               "Rakete": [g for g in G if g["art"] == "Rakete"]}
    for angr, gs in gruppen.items():
        if not gs:
            continue
        zeile(angr, "Geschosse (natuerliche Laeufe)", len(gs), len(gs), laeufe(gs))
        zeile(angr, "Slot des Geschosses", zaehle(g["slot"] for g in gs), len(gs), "")
        zeile(angr, "Startup G-A (Frames)", zaehle(g["G-A"] for g in gs), len(gs), "")
        zeile(angr, "Erscheinen: px vor dem Werfer / Tiefe rel. Werfer / Hoehe", 
              f"{zaehle(g['vorn0'] for g in gs)} / {zaehle(g['dz_werfer'] for g in gs)} / {zaehle(g['h0'] for g in gs)}", len(gs), "")
        zeile(angr, "Geschwindigkeit x im Flug (px/Frame, Betrag)", zaehle(abs(float(g["vx"])) for g in gs), len(gs), "")
        zeile(angr, "Hoehe im Flug (Start..Ende)", zaehle(g["h_verlauf"] for g in gs), len(gs), "")
        zeile(angr, "Tiefe im Flug konstant", "ja" if all("/" not in g["z_flug"] for g in gs) else
              "nein: " + zaehle(g["z_flug"] for g in gs if "/" in g["z_flug"]), len(gs), "")
        frei = [g for g in gs if g["grund"] in ("Ablauf", "Explosion")]
        if frei:
            zeile(angr, "ohne Treffer: Flugframes", zaehle(g["flugframes"] for g in frei), len(frei), laeufe(frei))
            zeile(angr, "ohne Treffer: Weite (px)", zaehle(g["weite"] for g in frei), len(frei), "")
            zeile(angr, "ohne Treffer: Ende x - Kamera-x", zaehle(int(g["x_flugende"]) - int(g["camx_flugende"])
                                                             for g in frei if g["camx_flugende"]), len(frei), "")
            zeile(angr, "ohne Treffer: Animation nach dem Flug", zaehle(g["nachphasen"] or "(keine)" for g in frei), len(frei), "")
        tr = [g for g in gs if g["grund"] == "Treffer Figur"]
        zeile(angr, "Treffer an der Figur / Geschosse", f"{len(tr)} / {len(gs)}", len(gs), "")
        zeile(angr, "Schaden S+0x8B je Rang (rang:schaden)", zaehle(f"{g['rang']}:{g['schaden8b']}" for g in gs), len(gs), "")
        um = Counter()
        for g in tr:
            for t in g["treffer"].split(") f"):
                if "um " in t:
                    um[(g["art"], t.split("um ")[1].split(",")[0])] += 1
        zeile(angr, "Umwerfen (art, ja/nein)", " ".join(f"{k[0]} {k[1]}:{v}" for k, v in sorted(um.items())), sum(um.values()), "")
        zeile(angr, "Attribut S+0x24 (Wert:Frames)", zaehle(g["attr"] for g in gs), len(gs), "")
        zeile(angr, "wirksame Frames je Geschoss (ohne Treffer)", zaehle(g["aktiv_n"] for g in frei), len(frei), "")
        if angr == "Rakete":
            zeile(angr, "Explosion (Frames mit Attribut 0x14xx)", zaehle(
                int(g["explosion"].split("-")[1]) - int(g["explosion"].split("-")[0]) + 1 for g in gs if g["explosion"]), len(gs), "")
        tg = [g for g in gs if g["treffer_gegner"]]
        zeile(angr, "Treffer an anderen Gegnern (natuerlich)", len(tg), len(gs), " | ".join(g["treffer_gegner"] for g in tg)[:300])

    # Angriffe
    for art in ("Messerwurf", "Messerstich", "Ausfallstich", "Pistole", "Rakete", "Haltung"):
        xs = [x for x in AN if x["art"] == art]
        if not xs:
            continue
        name = {"Messerstich": "Messerhagel (Messerstich)", "Haltung": "Pose (Aktion 2)"}.get(art, art)
        zeile(name, "Angriffe (natuerlich)", len(xs), len(xs), laeufe(xs))
        zeile(name, "d bei A (Abstand vor dem Werfer)", spanne([int(x["d"]) for x in xs]) + " | " + zaehle([x["d"] for x in xs], 8), len(xs), "")
        zeile(name, "dz bei A", spanne([int(x["dz"]) for x in xs]) + " | " + zaehle([x["dz"] for x in xs], 8), len(xs), "")
        zeile(name, "Dauer A bis Gehen/Stand (Frames)", zaehle(x["dauer"] for x in xs), len(xs), "")
        if art in ("Messerstich", "Ausfallstich"):
            sch = [f"{x['rang']}:{t.split(':')[1]}" for x in xs for t in x.get("treffer", "").split()]
            zeile(name, "Treffer an der Figur: rang:-LP (U = umgeworfen)", zaehle(sch, 12), len(sch), "")
            fr_ = [t.split(":")[0] for x in xs for t in x.get("treffer", "").split()]
            zeile(name, "Trefferframe relativ zu A", zaehle(fr_, 6), len(fr_), "")
        if art in ("Pistole", "Rakete"):
            zeile(name, "Schuesse je Salve (rang:n)", zaehle(f"{x['rang']}:{x['n_schuesse']}" for x in xs), len(xs), "")
            zeile(name, "Schussframes relativ zu A", zaehle([x["schuesse"] for x in xs], 6), len(xs), "")
    for r in AB:
        if r["groesse"].startswith(("zielpunkt", "vorbereitung frames", "betrag", "frames weg", "verteilung", "reaktion")):
            if r["anzahl"] != "0":
                zeile(f"{r['typ']} (Slot {r['slot']}, Rang {r['rang']})", r["groesse"], r["wert"], r["anzahl"],
                      r["lauf"].replace("fern_", "") + (" " + r["beispiele"] if r["beispiele"] else ""))
    # Rhythmus
    for art in ("Messerwurf", "Messerstich", "Pistole", "Rakete"):
        xs = [x for x in RH if x["art"] == art]
        if not xs:
            continue
        abst = [int(v) for x in xs for v in x["abstaende_gleiche_art"].split()]
        zeile(art, "Abstand zwischen Angriffsbeginnen gleicher Art (Frames)", spanne(abst) + " | " + zaehle(abst, 10), len(abst), laeufe(xs))
        if art == "Messerstich":
            ser = [int(v) for x in xs for v in x["salven_bzw_serien"].split()]
            zeile("Messerhagel (Messerstich)", "Stiche je Serie (Abstand <= 40)", zaehle(ser), len(ser), "")
            kurz = [v for v in abst if v <= 40]
            zeile("Messerhagel (Messerstich)", "Abstand innerhalb der Serie", zaehle(kurz), len(kurz), "")
        if art in ("Pistole", "Rakete"):
            ser = [int(v) for x in xs for v in x["salven_bzw_serien"].split()]
            zeile(art, "Schuesse je Salve", zaehle(ser), len(ser), "")

    # Proben B
    def probe_block(angr, rows, praefixe, achse, erster, text):
        rs = [r for r in rows if any(r["lauf"].startswith(p) for p in praefixe)]
        if not rs:
            return
        for blick in sorted(set(r["blick_figur"] for r in rs if r.get("blick_figur"))):
            sub = [r for r in rs if r.get("blick_figur") == blick]
            pr = probe_proben(sub, achse, erster)
            g, rand = grenzen(pr)
            zeile(angr, f"{text} (Figur blickt {blick})", g, len(pr), rand + " | " + laeufe(sub)[:120])

    probe_block("Messerwurf", BM, ["fern_b_mx_"], "x", 1, "Trefferflaeche x: Figur vor dem Messer in Flugrichtung (px, Frame-Ende)")
    probe_block("Messerwurf", BM, ["fern_b_mx20_"], "x", 1, "Trefferflaeche x, Rang 20 (fern_sw20)")
    probe_block("Messerwurf", BM, ["fern_b_mz_"], "z", 1, "Trefferflaeche Tiefe (z Figur - z Messer)")
    probe_block("Messerwurf", BM, ["fern_b_mz20_"], "z", 1, "Trefferflaeche Tiefe, Rang 20")
    probe_block("Messerwurf", BM, ["fern_b_mh_"], "h", 1, "Hoehe der Figur (Frame-Ende) beim Treffer")
    probe_block("Messerwurf", BM, ["fern_b_mh20_"], "h", 1, "Hoehe der Figur beim Treffer, Rang 20")
    probe_block("Pistole", BK, ["fern_b_kx_"], "x", 1, "Trefferflaeche x: Figur vor der Kugel in Flugrichtung")
    probe_block("Pistole", BK, ["fern_b_kx9_"], "x", 1, "Trefferflaeche x, Rang 9 (fern_pw9)")
    probe_block("Pistole", BK2, ["fern_b_kux_"], "x", 1, "Trefferflaeche x, zweite (umwerfende) Kugel")
    probe_block("Pistole", BK, ["fern_b_kz_"], "z", 1, "Trefferflaeche Tiefe")
    probe_block("Pistole", BK, ["fern_b_kz9_"], "z", 1, "Trefferflaeche Tiefe, Rang 9")
    probe_block("Pistole", BK, ["fern_b_kh_"], "h", 1, "Hoehe der Figur beim Treffer")
    probe_block("Pistole", BK, ["fern_b_kh9_"], "h", 1, "Hoehe der Figur beim Treffer, Rang 9")
    probe_block("Rakete", BR, ["fern_b_rx_"], "x", 21, "Explosion x: Figur vor dem Einschlagpunkt in Flugrichtung")
    probe_block("Rakete", BR, ["fern_b_rx9_"], "x", 21, "Explosion x, Rang 9")
    probe_block("Rakete", BR, ["fern_b_rz_"], "z", 21, "Explosion Tiefe")
    probe_block("Rakete", BR, ["fern_b_rz9_"], "z", 21, "Explosion Tiefe, Rang 9")
    probe_block("Rakete", BR, ["fern_b_rh_"], "h", 21, "Explosion Hoehe der Figur")
    probe_block("Rakete", BR, ["fern_b_rh9_"], "h", 21, "Explosion Hoehe der Figur, Rang 9")
    for pre in ("fern_b_ra_", "fern_b_ra9_"):
        ra = sorted((int(r["lauf"].rsplit("_", 1)[1]), r) for r in BR if r["lauf"].startswith(pre))
        if ra:
            zeile("Rakete", f"aktive Frames: Figur ab G+k in der Explosion -> Treffer in (G = {ra[0][1]['G']})", " ".join(
                f"k{k}:{r['treffer_rel'] or 'nein'}" for k, r in ra), len(ra), pre.replace("fern_", "") + "*")
    for r in BR:
        if r["lauf"].startswith("fern_b_rflug"):
            zeile("Rakete", f"Flug: Figur an der Rakete ({r['lauf'].replace('fern_', '')})",
                  f"Treffer {r['treffer']} {r['treffer_rel']}, Flugframes {r['flugframes']}, Grund {r['grund']}", 1, "")
    for ang, rows_, art in (("Messerwurf", BM, "Messer"), ("Pistole", BK, "Kugel")):
        ab = [r for r in rows_ if r.get("grund") == "Ablauf" and r.get("camx_flugende") and r.get("art", "").startswith(art)]
        if ab:
            zeile(ang, "Proben ohne Treffer: letzte Fluglage x - Kamera-x",
                  zaehle([int(r["x_flugende"]) - int(r["camx_flugende"]) for r in ab], 10), len(ab), "b_*")
    # Abwehr C
    def abwehr(angr, rows, praefix, text):
        rs = sorted(((int(r["lauf"].rsplit("_", 1)[1]), r) for r in rows if r["lauf"].startswith(praefix)), key=lambda x: x[0])
        if not rs:
            return
        res = []
        for p_, r in rs:
            if r["grund"] == "abgewehrt":
                res.append(f"P{p_}:abgewehrt(G+{int(r['abgewehrt']) - int(r['G'])})")
            elif r["treffer"] == "ja":
                res.append(f"P{p_}:Treffer({r['treffer_rel']},h{r['h_treffer']})")
            else:
                res.append(f"P{p_}:{r['grund']}")
        G0 = rs[0][1]["G"]
        zeile(angr, f"{text} (G = {G0})", " ".join(res), len(rs), praefix.replace("fern_", ""))
    abwehr("Messerwurf", C, "fern_c_ms_", "Schlag in Frame P")
    abwehr("Messerwurf", C, "fern_c_mj_", "Sprung in Frame P")
    abwehr("Pistole", C, "fern_c_ks_", "Schlag in Frame P, erste Kugel")
    abwehr("Pistole", C2, "fern_c_ks_", "Schlag in Frame P, zweite Kugel")
    abwehr("Pistole", C, "fern_c_kj_", "Sprung in Frame P, erste Kugel")
    abwehr("Pistole", C2, "fern_c_kj_", "Sprung in Frame P, zweite Kugel")
    abwehr("Rakete", C, "fern_c_rs_", "Schlag in Frame P")
    abwehr("Rakete", C, "fern_c_rj_", "Sprung in Frame P")
    abwehr("Messerwurf", C, "fern_c_ms20_", "Schlag in Frame P, Rang 20")
    abwehr("Messerwurf", C, "fern_c_mj20_", "Sprung in Frame P, Rang 20")
    abwehr("Pistole", C, "fern_c_ks9_", "Schlag in Frame P, erste Kugel, Rang 9")
    abwehr("Pistole", C2, "fern_c_ks9_", "Schlag in Frame P, zweite Kugel, Rang 9")
    abwehr("Pistole", C, "fern_c_kj9_", "Sprung in Frame P, erste Kugel, Rang 9")
    abwehr("Rakete", C, "fern_c_rs9_", "Schlag in Frame P, Rang 9")
    abwehr("Rakete", C, "fern_c_rj9_", "Sprung in Frame P, Rang 9")
    for r in C:
        if any(r["lauf"].startswith(p_) for p_ in ("fern_c_mg_", "fern_c_kg_", "fern_c_rg_", "fern_c_mo_", "fern_c_kglas_",
                                                    "fern_c_rglas_", "fern_c_mglas_", "fern_c_ke_", "fern_c_re_")):
            ang = {"Messer": "Messerwurf", "Kugel": "Pistole", "Kugel-Umwerf": "Pistole", "Rakete": "Rakete"}.get(r["art"], r["art"])
            zeile(ang, f"Objekt auf der Bahn ({r['lauf'].replace('fern_', '')})",
                  f"Grund {r['grund']}, Treffer Figur {r['treffer']}, Gegner: {r['treffer_gegner'] or 'keiner'}, "
                  f"Flugframes {r['flugframes']}, Ende x {r['x_flugende']}", 1, "")
    # Rang D
    for ang, art in (("Messerwurf", "Messer"), ("Pistole", "Kugel"), ("Rakete", "Rakete")):
        rs = [r for r in D if r.get("art", "").startswith(art)]
        if rs:
            zeile(ang, "Schaden je Rang (rang:LP), erstes Geschoss",
                  " ".join(f"{r['rang']}:{r['schaden'] or '-'}" for r in sorted(rs, key=lambda r: int(r["rang"] or 0))),
                  len(rs), "d_*")
        fehl = [r["lauf"] for r in D if r["lauf"].startswith(f"fern_d_{art[0].lower()}_") and not r.get("art", "").startswith(art)]
        if fehl:
            zeile(ang, "Rang ohne Geschoss im Lauf", " ".join(fehl), len(fehl), "")
    # Waffe E
    for r in E:
        zeile("Waffe beim Tod", f"{r['lauf'].replace('fern_', '')} Slot {r['slot']} Rang {r['rang']}",
              f"Schuesse vorher {r['schuesse_vorher']} ({r['geschosse']}); Gegenstand ab {r['gegenstand_ab']}: "
              f"Art {r['art']}, Munition {r['munition']}, Liegezeit {r['liegezeit']}", 1, "")


def cmd_erscheinen(a):
    """Je Lauf: Rang, Tod der Arena-WOOKY (erster Frame mit LP < 0), Erscheinen
    jedes DICK und SKIP (Frame, Slot, Max-LP, Waffe aus S+0x3D des gehaltenen
    Objekts 0x9A988: 0 Pistole, 4 Raketenwerfer)."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "rang", "wooky_tod", "gegner", "erscheint", "slot", "lp_max", "waffe"])
    for pr in a.prefix:
        L = Lauf(pr)
        tode = []
        for n in range(20):
            b = slot(n)
            for f in L.f:
                if L.v(f, b + 4) and L.v(f, b + 0x38, 4) == 0x5A97E and L.v(f, b + 0x40, 2, True) < 0 \
                        and (f - 1 not in L.d.offsets or L.v(f - 1, b + 0x40, 2, True) >= 0):
                    tode.append(f"{f}(slot{n})")
        zeilen = 0
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                ptr = ptr_von(n)
                f1 = min(von + 1, bis)
                ws = next((m for m in range(20, 60) if L.v(f1, slot(m) + 0x38, 4) == T_DICKWAFFE
                           and L.v(f1, slot(m) + 0x6C, 2) == ptr), None)
                waffe = ""
                if ws is not None:
                    waffe = {0: "Pistole", 4: "Raketenwerfer"}.get(L.v(f1, slot(ws) + 0x3D), hex(L.v(f1, slot(ws) + 0x3D)))
                w.writerow([L.name, L.rang_mehrheit(von, bis), " ".join(tode), TYP[typ], von, n,
                            L.v(f1, slot(n) + 0x9A, 2), waffe])
                zeilen += 1
        if not zeilen:
            w.writerow([L.name, L.rang_mehrheit(L.f[0], L.f[-1]), " ".join(tode), "kein DICK/SKIP", "", "", "", ""])


# --------------------------------------------------------------------------
# Dritte Messung (Laeufe fern_t_*): Ausloesung, Salvenbudget, Folge nach dem
# Schuss, Slotwahl, Bahnende, zweiter Raketen-DICK, Waffenbogen, Trefferfenster

def phase_beginn(L, n, f):
    """Erster Frame der Aktion/Phase, die Slot n in Frame f hat."""
    b = slot(n)
    k = (L.v(f, b + 0x0A, 2), L.v(f, b + 0x0C, 2))
    g = f
    while g - 1 in L.d.offsets and (L.v(g - 1, b + 0x0A, 2), L.v(g - 1, b + 0x0C, 2)) == k:
        g -= 1
    return g


def cmd_ausloesung(a):
    """Je Angriff: Zielpunkt S+0x96/0x98 im Frame vor A (SKIP-Messerwurf: Welt-x
    und Tiefe; sonst relativ zur Figur), Abweichung der Lage davon, Seite,
    Vorbereitung (Frames der laufenden Phase bis A), Weg der Figur in dieser
    Zeit, x des Werfers in den 4 Frames vor A unveraendert (Sperre). DICK
    zusaetzlich: Abweichung beim Wechsel in Aktion 6 Phase 2 (Angriffsbeginn)
    und d dort."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "rang", "art", "A", "seite", "d", "dz", "ziel_x", "ziel_z", "abw_x", "abw_z",
                "vorbereitung", "figur_weg_x", "x_steht", "fig_st", "start_d", "start_abw_x", "start_abw_z"])
    for pr in a.prefix:
        L = Lauf(pr)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                b = slot(n)
                for r in angriffe(L, n, von, bis, typ):
                    if r["art"] == "Haltung":
                        continue
                    A = r["A"]
                    f0 = A - 1
                    if f0 not in L.d.offsets:
                        continue
                    g = phase_beginn(L, n, f0)
                    s, p = L.s(f0, n), L.p(f0)
                    zx, zz = L.v(f0, b + 0x96, 2, True), L.v(f0, b + 0x98, 2, True)
                    if typ == 0x25086 and r["art"] == "Messerwurf":
                        ax, az = s["x"] - zx, s["z"] - zz
                    else:
                        ax, az = (s["x"] - p["x"]) - zx, (s["z"] - p["z"]) - zz
                    xs = {L.v(k, b + 0x0E, 2) for k in range(A - 4, A) if k in L.d.offsets}
                    sd = sax = saz = ""
                    if typ == 0x64E7A and g - 1 in L.d.offsets:
                        s1, p1 = L.s(g - 1, n), L.p(g - 1)
                        tx, tz = L.v(g - 1, b + 0x96, 2, True), L.v(g - 1, b + 0x98, 2, True)
                        sd = abs(s1["x"] - p1["x"])
                        sax, saz = (s1["x"] - p1["x"]) - tx, (s1["z"] - p1["z"]) - tz
                    w.writerow([L.name, n, TYP[typ], r["rang"], r["art"], A, "links" if s["x"] < p["x"] else "rechts",
                                r["d"], r["dz"], zx, zz, ax, az, A - g, p["x"] - L.v(g, P + 0x0E, 2),
                                int(len(xs) == 1), r["fig_st"], sd, sax, saz])


def salven_budget(B):
    """Schusszahl aus dem Budget B (S+0xAB in A): nach jedem 17-Frame-Zyklus
    (Ende A+17k+16) weiter, solange B - (17k+16) > 0."""
    return 1 + sum(1 for k in range(20) if 17 * k + 16 < B)


def cmd_salve(a):
    """Je Pistolensalve: Budget B = S+0xAB in A, Schuesse, Schuesse nach dem
    Budget, Lage der Figur am Ende des letzten Zyklus (Abbruchgrund)."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "rang", "A", "budget", "schuesse", "schuesse_budget", "abbruch",
                "ende_d", "ende_dz", "ende_fig_h", "ende_fig_st"])
    for pr in a.prefix:
        L = Lauf(pr)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                if typ != 0x64E7A:
                    continue
                for r in angriffe(L, n, von, bis, typ):
                    if r["art"] != "Pistole":
                        continue
                    A, ns = r["A"], r["n_schuesse"]
                    B = L.v(A, slot(n) + 0xAB)
                    f = A + 17 * (ns - 1) + 16
                    if f not in L.d.offsets:
                        continue
                    s, p = L.s(f, n), L.p(f)
                    vz = blickvorzeichen(s["blick"])
                    nb = salven_budget(B)
                    w.writerow([L.name, n, r["rang"], A, B, ns, nb, "ja" if ns < nb else ("" if ns == nb else "mehr"),
                                (p["x"] - s["x"]) * vz, s["z"] - p["z"], p["h"], p["st"]])


def cmd_nachschuss(a):
    """Je Angriff eines DICK (Pistole, Rakete): erster Frame nach dem letzten
    Zyklus (Aktion/Phase, Animation), neuer Zielpunkt dort, Abweichung der Lage
    davon, ob er erfuellt ist (|x| <= 8, |Tiefe| <= 6), Aktion im Folgeframe
    und ob 2 Frames spaeter der naechste Angriff beginnt (Doppelschuss)."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "rang", "art", "A", "ende", "akt_ph_ende", "anim_ende", "ziel_x", "ziel_z",
                "abw_x", "abw_z", "erfuellt", "aktion_folgeframe", "naechster_angriff", "doppelschuss"])
    for pr in a.prefix:
        L = Lauf(pr)
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                if typ != 0x64E7A:
                    continue
                b = slot(n)
                ang = [r for r in angriffe(L, n, von, bis, typ) if r["art"] in ("Pistole", "Rakete")]
                for i, r in enumerate(ang):
                    e = r["ende"]
                    if not e or e + 1 not in L.d.offsets or L.v(e, b + 4) != 1:
                        continue
                    s, p = L.s(e, n), L.p(e)
                    zx, zz = L.v(e, b + 0x96, 2, True), L.v(e, b + 0x98, 2, True)
                    ax, az = (s["x"] - p["x"]) - zx, (s["z"] - p["z"]) - zz
                    nx = ang[i + 1]["A"] if i + 1 < len(ang) else None
                    w.writerow([L.name, n, r["rang"], r["art"], r["A"], e,
                                f"{L.v(e, b + 0x0A, 2)}/{L.v(e, b + 0x0C, 2)}", f"{s['anim']:#x}", zx, zz, ax, az,
                                int(abs(ax) <= 8 and abs(az) <= 6), L.v(e + 1, b + 0x0A, 2),
                                nx if nx else "", int(bool(nx) and nx - e <= 3)])


def cmd_slots(a):
    """Je Geschoss: Slot und Belegung der Slots 27, 28, 29 im Frame vor G."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "G", "art", "werfer", "slot", "belegt_27_28_29_vor_G"])
    for pr in a.prefix:
        L = Lauf(pr)
        for g in sorted(geschosse(L), key=lambda x: x["start"]):
            G, n = g["start"], g["slot"]
            if G - 1 not in L.d.offsets:
                continue
            art = {T_MESSER: "Messer"}.get(L.v(G, slot(n) + 0x38, 4), "Kugel/Rakete")
            if art != "Messer":
                an = L.v(G, slot(n) + 0x1C, 4)
                art = "Rakete" if an in (0x2013E, 0x20156) else "Kugel"
            bel = "".join(str(int(bool(L.v(G - 1, slot(k) + 4)))) for k in (27, 28, 29))
            w.writerow([L.name, G, art, g["werfer"], n, bel])


def cmd_bahnende(a):
    """Je Geschoss ohne Treffer an der Figur: letzte Fluglage (x, Tiefe),
    x - Kamera-x, Flugframes und Ende (Wand = Einschlag 0x95Exx, Bildrand,
    Landung/Explosion)."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "G", "art", "slot", "flugrichtung", "x_letzte", "z", "x_minus_kamera", "flugframes", "ende"])
    for pr in a.prefix:
        L = Lauf(pr)
        tr = L.treffer_figur()
        gs = geschosse(L)
        zu = treffer_zuordnen(L, gs, tr)
        for g in gs:
            info = analysiere_geschoss(L, g, tr, zu)
            if info["treffer"] or info["art"] not in ("Kugel", "Kugel-Umwerf", "Rakete", "Messer") or info["x_flugende"] == "":
                continue
            if info["ende"] == "" and info["grund"] == "Laufende":
                continue
            if "095e" in info["nachphasen"]:
                ende = "Wand"
            elif info["art"] == "Rakete":
                ende = "Wand" if info["flugframes"] < 20 else "Landung"
            else:
                ende = "Bildrand"
            w.writerow([L.name, info["G"], info["art"], g["slot"], "+x" if info["vx"] > 0 else "-x", info["x_flugende"],
                        info["z0"], info["x_flugende"] - info["camx_flugende"] if info["camx_flugende"] != "" else "",
                        info["flugframes"], ende])


def cmd_welle(a):
    """Je Lauf mit letzter Welle: erster Raketen-DICK (Frame W), belegte
    Gegnerslots 0..19 in W+39, erster Frame ab W mit hoechstens 4 belegten
    Gegnerslots, Rang dort, zweiter Raketen-DICK (Frame, Slot) oder keiner."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "welle_W", "rang_W39", "gegner_W39", "belegung_W39", "frei_ab", "rang_frei_ab",
                "zweiter_raketen_dick", "abstand_zu_frei_ab"])
    for pr in a.prefix:
        L = Lauf(pr)
        rak = []
        for n, abschn in sorted(L.schuetzen().items()):
            for (von, bis, typ) in abschn:
                if typ != 0x64E7A:
                    continue
                f1 = min(von + 1, bis)
                ptr = ptr_von(n)
                ws = next((m for m in range(20, 60) if L.v(f1, slot(m) + 0x38, 4) == T_DICKWAFFE
                           and L.v(f1, slot(m) + 0x6C, 2) == ptr), None)
                if ws is not None and L.v(f1, slot(ws) + 0x3D) == 4:
                    rak.append((von, n))
        rak.sort()
        if not rak:
            continue
        W = rak[0][0]

        def belegt(f):
            return [n for n in range(20) if L.v(f, slot(n) + 4)]
        f39 = W + 39 if W + 39 in L.d.offsets else L.f[-1]
        bel = belegt(f39)
        frei = next((f for f in L.f if f >= W and len(belegt(f)) <= 4), None)
        zweit = rak[1] if len(rak) > 1 else None
        w.writerow([L.name, W, L.rang(f39), len(bel),
                    " ".join(f"{n}:{TYP.get(L.v(f39, slot(n) + 0x38, 4), 'x')}" for n in bel),
                    frei if frei is not None else "", L.rang(frei) if frei is not None else "",
                    f"{zweit[0]}:s{zweit[1]}" if zweit else "keiner",
                    zweit[0] - frei if zweit and frei is not None else ""])


def cmd_bogen(a):
    """Je DICK-Tod (erster Frame mit LP < 0): Hoehe des DICK, Hoehe der
    gehaltenen Waffe davor, hoechster Punkt des Bogens, Landung (Hoehe 0 nach
    dem Scheitel) und Wechsel zum Gegenstand, je relativ zum Tod t."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "rang", "tod", "h_dick", "h_waffe_vorher", "h_max", "h_max_minus_h_dick",
                "scheitel", "landung", "gegenstand", "dx_bogen"])
    for pr in a.prefix:
        L = Lauf(pr)
        for n in range(20):
            b = slot(n)
            t = next((f for f in L.f if f - 1 in L.d.offsets and L.v(f, b + 4) and L.v(f, b + 0x38, 4) == 0x64E7A
                      and L.v(f, b + 0x40, 2, True) < 0 <= L.v(f - 1, b + 0x40, 2, True)), None)
            if t is None:
                continue
            ptr = ptr_von(n)
            ws = next((k for k in range(20, 60) if L.v(t - 1, slot(k) + 0x38, 4) == T_DICKWAFFE
                       and L.v(t - 1, slot(k) + 0x6C, 2) == ptr), None)
            if ws is None:
                continue
            wb = slot(ws)
            hs, xs, f = [], [], t
            while f in L.d.offsets and L.v(f, wb + 4) and L.v(f, wb + 0x38, 4) == T_DICKWAFFE:
                hs.append(L.v(f, wb + 0x12, 2, True))
                xs.append(L.v(f, wb + 0x0E, 2))
                f += 1
            if not hs or f not in L.d.offsets:
                continue
            top = hs.index(max(hs))
            land = next((i for i in range(top, len(hs)) if hs[i] <= 0), "")
            hd = L.v(t, b + 0x12, 2, True)
            w.writerow([L.name, n, L.rang(t), t, hd, L.v(t - 1, wb + 0x12, 2, True), max(hs), max(hs) - hd,
                        f"t+{top}", f"t+{land}", f"t+{f - t}", xs[-1] - xs[0]])


# Trefferflaeche: Treffer, wenn (x(Figur) + 4*b) - (x(Geschoss) + s*o) in [-H, H-1]
# (b Blick der Figur +1 rechts, s Flugrichtung, Lagen ganzzahlig am Frame-Ende)
FENSTER_H = {"Messer": 25, "Kugel": 17, "Kugel-Umwerf": 17, "Rakete": 52}
FENSTER_O = {"Messer": 1, "Kugel": 0, "Kugel-Umwerf": 0, "Rakete": 0}


def cmd_fenster(a):
    """Proben der Trefferflaeche (Laufname GRUPPE_<l|r><e>): je Gruppe, Blick
    und Flugrichtung die getroffenen Lagen e = x(Figur) - x(Geschoss) am
    Frame-Ende (Treffer: im Trefferframe, sonst gehaltene Lage), daraus vorn,
    die Vorhersage der Regel und die Proben, die ihr widersprechen."""
    grp = defaultdict(list)
    for pr in a.prefix:
        L = Lauf(pr)
        tr = L.treffer_figur()
        gs = [g for g in geschosse(L) if TYP.get(L.v(g["start"], slot(g["werfer"]) + 0x38, 4)) in ("SKIP", "DICK")]
        if not gs:
            continue
        g = gs[0]
        info = analysiere_geschoss(L, g, tr, treffer_zuordnen(L, gs, tr))
        r = g["reihe"]
        th = [t for t in tr if t[2] == g["werfer"] and r[0][0] <= t[0] <= r[-1][0]]
        hit = th[0][0] if th else None
        rel = {f: (L.p(f)["x"] - s["x"], L.p(f)["z"] - s["z"], L.p(f)["blick"]) for f, s in r}
        if hit:
            e, dz, bl = rel[hit]
        else:
            c = Counter((x[0], x[1]) for f, x in rel.items() if f > info["G"] and aktiv(dict(r)[f]["attr"]))
            if not c:
                continue
            (e, dz), _ = c.most_common(1)[0]
            bl = rel[r[-1][0]][2]
        gruppe, rest = L.name.rsplit("_", 1)
        s = 1 if info["vx"] > 0 else -1
        grp[(gruppe, info["art"].replace("-Umwerf", ""), s, bl)].append((e, dz, bool(hit), L.name))
    w = csv.writer(sys.stdout)
    w.writerow(["gruppe", "art", "flugrichtung", "blick_figur", "proben", "treffer_e", "treffer_vorn",
                "regel_e", "widersprueche", "dz"])
    for (gruppe, art, s, bl), xs in sorted(grp.items()):
        b = 1 if bl == "r" else -1
        h, o = FENSTER_H[art], FENSTER_O[art]
        lo, hi = -h - 4 * b + s * o, h - 1 - 4 * b + s * o
        hits = sorted(e for e, dz, t, nm in xs if t)
        bad = [f"{nm}({e},{'T' if t else 'kein T'})" for e, dz, t, nm in xs if (lo <= e <= hi) != t]
        vorn = sorted((hits[0] * s, hits[-1] * s)) if hits else None
        w.writerow([gruppe, art, "+x" if s > 0 else "-x", bl, len(xs),
                    f"{hits[0]}..{hits[-1]}" if hits else "", f"{vorn[0]}..{vorn[1]}" if vorn else "",
                    f"{lo}..{hi}", " ".join(bad), " ".join(map(str, sorted({dz for e, dz, t, nm in xs})))])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for nm, fn, hilfe in (
        ("geschosse", cmd_geschosse, "je Geschoss Werfer, Start, Flug, Ende, Treffer"),
        ("angriffe", cmd_angriffe, "je Angriff eines Schuetzen (SKIP, DICK) Beginn, Abstand, Schuesse, Ende"),
    ):
        p = sub.add_parser(nm, help=hilfe)
        p.add_argument("prefix", nargs="+")
        p.set_defaults(fn=fn)
    p = sub.add_parser("zeitachse", help="je Frame Animation, Lage und Abstand eines Slots zur Figur")
    p.add_argument("prefix", nargs=1)
    p.add_argument("--slot", type=int, required=True)
    p.add_argument("--von", type=int, default=0)
    p.add_argument("--bis", type=int, default=10 ** 9)
    p.add_argument("--alle", action="store_true", help="jeden Frame ausgeben")
    p.set_defaults(fn=cmd_zeitachse)
    for nm, fn, hilfe in (
        ("abstand", cmd_abstand, "je Schuetze Zielpunkt, Abstand bei Angriffsbeginn, Vorbereitung, Gehtempo, Rueckzug"),
        ("rhythmus", cmd_rhythmus, "je Schuetze Abstaende zwischen Angriffen, Salven und Stichserien"),
        ("waffe", cmd_waffe, "DICK beim Tod: Schuesse vorher, liegende Waffe mit Art und Munition"),
        ("erscheinen", cmd_erscheinen, "Erscheinen von DICK und SKIP mit Rang, Waffe und Tod der Arena-WOOKY"),
    ):
        p = sub.add_parser(nm, help=hilfe)
        p.add_argument("prefix", nargs="+")
        p.set_defaults(fn=fn)
    p = sub.add_parser("zusammenfassung", help="fasst die Ausgaben der anderen Unterbefehle je Angriffsart zusammen")
    p.add_argument("verzeichnis", help="Ordner mit geschosse.csv, angriffe.csv, abstand.csv, rhythmus.csv, b_*.csv, c_*.csv, d_rang.csv, e_waffe.csv")
    p.set_defaults(fn=cmd_zusammenfassung, prefix=[])
    for nm, fn, hilfe in (
        ("ausloesung", cmd_ausloesung, "dritte Messung: je Angriff Zielpunkt, Abweichung, Seite, Vorbereitung, Sperre"),
        ("salve", cmd_salve, "dritte Messung: je Pistolensalve Budget S+0xAB, Schuesse, Abbruch"),
        ("nachschuss", cmd_nachschuss, "dritte Messung: je DICK-Angriff neuer Zielpunkt und Folgeaktion, Doppelschuss"),
        ("slots", cmd_slots, "dritte Messung: je Geschoss Slot und Belegung 27..29 vor G"),
        ("bahnende", cmd_bahnende, "dritte Messung: je Geschoss ohne Treffer letzte Lage, Kamera, Ende"),
        ("welle", cmd_welle, "dritte Messung: letzte Welle, belegte Gegnerslots, zweiter Raketen-DICK"),
        ("bogen", cmd_bogen, "dritte Messung: Bogen der Waffe beim Tod des DICK relativ zu seiner Hoehe"),
        ("fenster", cmd_fenster, "dritte Messung: Trefferfenster je Gruppe, Blick und Flugrichtung mit Regelpruefung"),
    ):
        p = sub.add_parser(nm, help=hilfe)
        p.add_argument("prefix", nargs="+")
        p.set_defaults(fn=fn)
    p = sub.add_parser("probe", help="je Lauf das k-te Geschoss: Lage der Figur dazu, Treffer, Ende")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--k", type=int, default=1, help="k-tes Geschoss eines Schuetzen im Lauf (Standard 1)")
    p.add_argument("--werfer", type=int, default=None, help="nur Geschosse dieses Gegner-Slots")
    p.set_defaults(fn=cmd_probe)
    a = ap.parse_args()
    seen = []
    for pr in a.prefix:
        for suf in ("_ram.bin", "_ram.hdr", "_inputs.csv", "_watch.csv", "_fields.txt"):
            if pr.endswith(suf):
                pr = pr[: -len(suf)]
        if pr not in seen and Path(pr + "_ram.hdr").exists():
            seen.append(pr)
    a.prefix = seen
    a.fn(a)


if __name__ == "__main__":
    main()
