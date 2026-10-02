#!/usr/bin/env python3
"""Gegenpruefung "Fernkampf und Messerwurf" (V7, Praefix fern_v).

Liest die Abzuege von scenarios/fern_v_frei.lua (0xFFA900-0xFFEA00 je Frame,
Rang und Kamera im Watch-CSV). Nur Standardbibliothek.

Begriffe: Werfer = Gegner in Slot 0..19 (SKIP Typ 0x25086, DICK 0x64E7A).
Geschoss = Objekt in Slot 20..59, dessen Zeigerwort S+0x6C auf S+4 eines
Gegnerslots zeigt. Treffer = Frame, in dem die LP der Figur fallen
(P+0x40 < P+0x42); der Angreifer steht in P+0x82.
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
SKIP, DICK, WOOKY, EDDY, DOLG = 0x25086, 0x64E7A, 0x5A97E, 0x60CA0, 0x46DA4
TYPNAME = {SKIP: "SKIP", DICK: "DICK", WOOKY: "WOOKY", EDDY: "EDDY", DOLG: "DOLG"}


def SA(n):
    return 0xFFBC90 + n * 0xC0


def s16(v):
    return v - 0x10000 if v >= 0x8000 else v


def slot_von_zeiger(w):
    """Zeigerwort auf S+4 -> Slotnummer (oder 'P' fuer die Figur)."""
    a = 0xFF0000 + w - 4
    if a == P:
        return "P"
    n, r = divmod(a - 0xFFBC90, 0xC0)
    if r == 0 and 0 <= n < 60:
        return n
    return None


class Lauf:
    def __init__(self, prefix):
        self.prefix = str(prefix)
        self.name = Path(self.prefix).name
        self.d = Dump(self.prefix)
        self.frames = self.d.frames
        self.watch = {}
        wp = Path(self.prefix + "_watch.csv")
        if wp.exists():
            with open(wp) as fh:
                for row in csv.DictReader(fh):
                    self.watch[int(row["frame"])] = row

    def v(self, f, a, w=2, s=False):
        return self.d.value(f, a, w, s)

    def rang(self, f):
        r = self.watch.get(f)
        return int(r["rang"]) if r else None

    def kam(self, f):
        r = self.watch.get(f)
        return int(r["kamx"]) if r else None

    def fig(self, f):
        v = self.v
        return {
            "x": v(f, P + 0x0E), "z": v(f, P + 0x16), "h": v(f, P + 0x12, 2, True),
            "lp": v(f, P + 0x40, 2, True), "lp0": v(f, P + 0x42, 2, True),
            "st": v(f, P + 4, 1), "akt": v(f, P + 0x0A), "ph": v(f, P + 0x0C),
            "blick": "r" if v(f, P + 0x5E, 1) & 0x20 else "l",
            "zeiger": v(f, P + 0x82), "anim": v(f, P + 0x1C, 4),
        }

    def slot(self, f, n):
        S = SA(n)
        v = self.v
        return {
            "n": n, "st": v(f, S + 4, 1), "s5": v(f, S + 5, 1), "typ": v(f, S + 0x38, 4),
            "x": v(f, S + 0x0E), "xf": v(f, S + 0x10), "z": v(f, S + 0x16),
            "h": v(f, S + 0x12, 2, True),
            "lp": v(f, S + 0x40, 2, True), "max": v(f, S + 0x9A), "akt": v(f, S + 0x0A),
            "ph": v(f, S + 0x0C), "anim": v(f, S + 0x1C, 4), "attr": v(f, S + 0x24),
            "dmg": v(f, S + 0x8B, 1), "blick": "r" if v(f, S + 0x5E, 1) & 0x20 else "l",
            "zeiger": v(f, S + 0x6C), "art": v(f, S + 0x3D, 1),
            "zx": v(f, S + 0x96, 2, True), "zz": v(f, S + 0x98, 2, True),
            "muni": v(f, S + 0xB1, 1), "liege": v(f, S + 0x60),
        }


GESCHOSS_TYPEN = (0x85B42, 0x86022, 0x9A988)  # Messer, Kugel/Rakete, gehaltene Waffe des DICK


def geschosse(L):
    """Alle Geschosse eines Laufs: je Slotbelegung mit Zeiger auf einen Gegner und
    Typ Messer (0x85B42) bzw. Kugel/Rakete (0x86022); dazu die gehaltene Waffe des
    DICK (0x9A988), die die Auswertungen selbst ausfiltern."""
    offen, fertig = {}, []
    for f in L.frames:
        for n in range(20, 60):
            S = SA(n)
            st = L.v(f, S + 4, 1)
            w = L.v(f, S + 0x6C)
            werfer = slot_von_zeiger(w) if st else None
            ist = isinstance(werfer, int) and werfer < 20 and L.v(f, S + 0x38, 4) in GESCHOSS_TYPEN
            g = offen.get(n)
            if g and (not st or not ist or L.v(f, S + 0x6C) != g["w"]):
                fertig.append(g)
                del offen[n]
                g = None
            if ist and not g:
                ws = L.slot(f, werfer)
                g = {"lauf": L.name, "slot": n, "w": w, "werfer": werfer, "wtyp": TYPNAME.get(ws["typ"], hex(ws["typ"])),
                     "G": f, "bahn": []}
                offen[n] = g
            if g:
                s = L.slot(f, n)
                g["bahn"].append((f, s))
    fertig.extend(offen.values())
    fertig.sort(key=lambda g: (g["G"], g["slot"]))
    return fertig


def treffer(L):
    """Frames, in denen die Figur LP verliert."""
    out = []
    for f in L.frames[1:]:
        p = L.fig(f)
        if p["lp"] < p["lp0"]:
            z = slot_von_zeiger(p["zeiger"])
            out.append((f, p, z))
    return out


WURF_ANIMS = [0x289F2, 0x28A2E, 0x28A64, 0x28A9E, 0x28AD8, 0x28B12]
STICH_A, WARTE_SKIP, AUSFALL_A = 0x287E0, 0x2849E, 0x28642
FUNKE = 0x95B5C


def finde_slots(L, typ):
    out = set()
    for f in L.frames[:: max(1, len(L.frames) // 200)] + [L.frames[-1]]:
        for n in range(20):
            if L.v(f, SA(n) + 4, 1) and L.v(f, SA(n) + 0x38, 4) == typ:
                out.add(n)
    return sorted(out)


def anim_folge(L, n, von, bis):
    """[(frame, anim20)] je Wechsel des Animationszeigers in von..bis."""
    out, last = [], None
    for f in L.frames:
        if f < von or f > bis:
            continue
        a = L.v(f, SA(n) + 0x1C, 4) & 0xFFFFF
        if a != last:
            out.append((f, a))
            last = a
    return out


def richtung(s):
    return 1 if s["blick"] == "r" else -1


def geschoss_info(L, g, treff):
    """Kennwerte eines Geschosses: Start, Bahn, Ende, Treffer auf die Figur."""
    b = g["bahn"]
    G, s0 = b[0]
    ws = L.slot(G, g["werfer"])
    rx = richtung(ws)
    dxs = []
    for (f1, a1), (f2, a2) in zip(b, b[1:]):
        if a1["anim"] == a2["anim"] or True:
            dxs.append(((a2["x"] + a2["xf"] / 65536) - (a1["x"] + a1["xf"] / 65536)))
    flug = [(f, s) for f, s in b if (s["anim"] & 0xFFFFF) != FUNKE and s["st"] != 3]
    hit = None
    for f, _ in b:
        if f in treff and treff[f][1] == g["werfer"]:
            hit = f
            break
    if hit is None:
        # Treffer im Frame nach dem letzten Frame des Blocks
        for f in range(b[-1][0], b[-1][0] + 2):
            if f in treff and treff[f][1] == g["werfer"]:
                hit = f
    info = {
        "G": G, "ende": b[-1][0], "slot": g["slot"], "typ": s0["typ"], "werfer": g["werfer"],
        "wx": ws["x"], "wz": ws["z"], "wblick": ws["blick"],
        "vor_werfer": (s0["x"] - ws["x"]) * rx, "z": s0["z"], "h0": s0["h"],
        "z_alle": sorted({s["z"] for _, s in flug}), "h_alle": [s["h"] for _, s in flug],
        "attr_flug": sorted({s["attr"] for _, s in flug}), "dmg": s0["dmg"],
        "dx": dxs, "flug_frames": len(flug), "letzt_x": flug[-1][1]["x"] if flug else None,
        "letzt_f": flug[-1][0] if flug else None, "funke": any((s["anim"] & 0xFFFFF) == FUNKE for _, s in b),
        "zustand3": any(s["st"] == 3 for _, s in b), "hit": hit, "rx": rx,
        "anims": sorted({s["anim"] & 0xFFFFF for _, s in b}),
    }
    if hit:
        p = L.fig(hit)
        gs = dict(b)[hit] if hit in dict(b) else None
        info["vorn"] = (p["x"] - gs["x"]) * rx if gs else None
        info["fig_blick_zum_werfer"] = (p["blick"] == "r") == (ws["x"] > p["x"])
        info["hit_dz"] = (gs["z"] - p["z"]) if gs else None
        info["hit_h"] = p["h"]
        info["dlp"] = p["lp0"] - p["lp"]
        info["um"] = L.fig(min(hit + 1, L.frames[-1]))["st"] == 2
    return info


def treffer_map(L):
    return {f: (p, z) for f, p, z in treffer(L)}


def skip_angriffe(L, n):
    """Wuerfe und Stiche eines SKIP in Slot n."""
    folge = anim_folge(L, n, L.frames[0], L.frames[-1])
    treff = treffer_map(L)
    ges = [g for g in geschosse(L) if g["werfer"] == n]
    out = []
    for i, (A, a) in enumerate(folge):
        if a == WURF_ANIMS[0]:
            s = L.slot(A, n)
            p = L.fig(A)
            V = A
            while V - 1 in L.d.offsets and L.v(V - 1, SA(n) + 0x0A) == 6 and L.v(V - 1, SA(n) + 0x0C) == 0x0A:
                V -= 1
            dauer, j = [], i
            while j < len(folge) and folge[j][1] in WURF_ANIMS:
                nxt = folge[j + 1][0] if j + 1 < len(folge) else L.frames[-1] + 1
                dauer.append((folge[j][1], nxt - folge[j][0]))
                j += 1
            ende = folge[j][0] if j < len(folge) else None
            g = next((g for g in ges if A < g["G"] <= A + 20), None)
            gi = geschoss_info(L, g, treff) if g else None
            sv = L.slot(A - 1, n)
            out.append({"art": "wurf", "A": A, "V": V, "rang": L.rang(A), "d": (p["x"] - s["x"]) * richtung(s),
                        "dz": s["z"] - p["z"], "fx": p["x"], "fz": p["z"], "sx": s["x"], "sz": s["z"], "blick": s["blick"],
                        "ziel": (s["zx"], s["zz"]), "rest": (sv["zx"] - sv["x"], sv["zz"] - sv["z"]),
                        "dauer": dauer, "gehen": ende, "g": gi, "kam": L.kam(A)})
        elif a == STICH_A or a == AUSFALL_A:
            s = L.slot(A, n)
            p = L.fig(A)
            hit = next((f for f in range(A, A + 20) if f in treff and treff[f][1] == n), None)
            out.append({"art": "stich" if a == STICH_A else "ausfall", "A": A, "rang": L.rang(A),
                        "d": (p["x"] - s["x"]) * richtung(s), "dz": s["z"] - p["z"], "hit": hit,
                        "dlp": (treff[hit][0]["lp0"] - treff[hit][0]["lp"]) if hit else None,
                        "um": (L.fig(min(hit + 1, L.frames[-1]))["st"] == 2) if hit else None,
                        "dmg": L.slot(A, n)["dmg"], "fig_akt": p["akt"],
                        "danach": next((b for (f2, b) in folge if f2 > A and b != a and not (0x287E0 <= b <= 0x289B2) and not (0x28642 <= b <= 0x287DF)), None)})
    return out


def cmd_skip(a):
    for pre in a.prefix:
        L = Lauf(pre)
        for n in finde_slots(L, SKIP):
            for e in skip_angriffe(L, n):
                if e["art"] == "wurf":
                    g = e["g"] or {}
                    print(f"{L.name} slot{n} WURF A{e['A']} V{e['V']} vorb{e['A'] - e['V']} rang{e['rang']} d{e['d']} dz{e['dz']} fig{e['fx']}/{e['fz']} skip{e['sx']}/{e['sz']} {e['blick']} "
                          f"ziel{e['ziel']} rest{e['rest']} dauer{[(hex(x), y) for x, y in e['dauer']]} gehen{e['gehen'] - e['A'] if e['gehen'] else None} kam{e['kam']} "
                          f"| G-A{(g.get('G') - e['A']) if g else None} slot{g.get('slot')} vor{g.get('vor_werfer')} h{g.get('h0')} z{g.get('z_alle')} attr{[hex(x) for x in g.get('attr_flug', [])]} "
                          f"dmg{g.get('dmg')} dx{sorted(set(round(x, 3) for x in g.get('dx', [])))} flug{g.get('flug_frames')} ende{g.get('ende')} letzt{g.get('letzt_x')} "
                          f"hit{g.get('hit')} vorn{g.get('vorn')} zum{g.get('fig_blick_zum_werfer')} hdz{g.get('hit_dz')} hh{g.get('hit_h')} dlp{g.get('dlp')} um{g.get('um')} funke{g.get('funke')}")
                else:
                    print(f"{L.name} slot{n} {e['art'].upper()} A{e['A']} rang{e['rang']} d{e['d']} dz{e['dz']} hit{(e['hit'] - e['A']) if e['hit'] else None} dlp{e['dlp']} um{e['um']} dmg{e['dmg']} figakt{e['fig_akt']:X} danach{hex(e['danach']) if e['danach'] else None}")


def cmd_probe(a):
    """Einzelframe-Probe: Lage von Geschoss und Figur im Frame K, Treffer in K."""
    for pre in a.prefix:
        L = Lauf(pre)
        K = a.frame
        treff = treffer_map(L)
        ges = geschosse(L)
        if a.typ:
            ges = [g for g in ges if g["bahn"][0][1]["typ"] == int(a.typ, 16)]
        g = next((g for g in ges if any(f == K for f, _ in g["bahn"])), None)
        p = L.fig(K)
        erster = min((f for f in treff if f >= a.ab), default=None)
        if not g:
            print(f"{L.name} K{K} kein Geschoss; erster Treffer {erster}")
            continue
        s = dict(g["bahn"])[K]
        ws = L.slot(K, g["werfer"])
        rx = richtung(L.slot(g["G"], g["werfer"]))
        vorn = (p["x"] - s["x"]) * rx
        zum = (p["blick"] == "r") == (ws["x"] > p["x"])
        hitK = K in treff and treff[K][1] == g["werfer"]
        print(f"{L.name} K{K} vorn {vorn} dz {s['z'] - p['z']} h {p['h']} gh {s['h']} blick {'zum' if zum else 'weg'} treffer_K {'ja' if hitK else 'nein'} "
              f"attr {s['attr']:04X} st {s['st']} figanim {p['anim'] & 0xFFFFF:05X} erster_treffer {erster} dlp {(treff[erster][0]['lp0'] - treff[erster][0]['lp']) if erster else ''}")


def cmd_bahn(a):
    """Je Frame des Geschossflugs: vorn, dz, Hoehe der Figur, Treffer."""
    for pre in a.prefix:
        L = Lauf(pre)
        treff = treffer_map(L)
        for g in geschosse(L):
            if a.typ and g["bahn"][0][1]["typ"] != int(a.typ, 16):
                continue
            rx = richtung(L.slot(g["G"], g["werfer"]))
            zeilen = []
            for f, s in g["bahn"]:
                p = L.fig(f)
                vorn = (p["x"] - s["x"]) * rx
                if a.fenster and not (a.fenster[0] <= vorn <= a.fenster[1]):
                    continue
                t = "T" if (f in treff and treff[f][1] == g["werfer"]) else "-"
                zeilen.append(f"{f}:v{vorn}/dz{s['z'] - p['z']}/h{p['h']}/gh{s['h']}/a{s['attr']:X}/{t}")
            print(f"{L.name} G{g['G']} slot{g['slot']} " + " ".join(zeilen))


PISTOLE_A, RAKETE_A = 0x68528, 0x685F8
DICK_SCHUSS = {0x68528, 0x6855C, 0x68590, 0x685C4, 0x685F8, 0x6862A, 0x6865C, 0x68690}
DICK_POSE = {0x686C4, 0x686FE, 0x68730, 0x68760, 0x6878E, 0x687B8}
KUGEL, RAKETE = 0x86022, None


def dick_waffe(L, n, f):
    """Art der gehaltenen Waffe (S+0x3D des Objekts 0x9A988 mit Zeiger auf Slot n)."""
    for k in range(20, 60):
        S = SA(k)
        if L.v(f, S + 4, 1) and L.v(f, S + 0x38, 4) == 0x9A988 and slot_von_zeiger(L.v(f, S + 0x6C)) == n:
            return L.v(f, S + 0x3D, 1)
    return None


def xf(s):
    return s["x"] + s["xf"] / 65536


def dick_angriffe(L, n):
    folge = anim_folge(L, n, L.frames[0], L.frames[-1])
    treff = treffer_map(L)
    ges = [g for g in geschosse(L) if g["werfer"] == n and g["bahn"][0][1]["typ"] != 0x9A988]
    schuesse = [(f, a) for f, a in folge if a in (PISTOLE_A, RAKETE_A)]
    salven, cur = [], []
    for f, a in schuesse:
        if cur and f - cur[-1][0] <= 19 and all(b in DICK_SCHUSS for _, b in anim_folge(L, n, cur[-1][0], f - 1)):
            cur.append((f, a))
        else:
            if cur:
                salven.append(cur)
            cur = [(f, a)]
    if cur:
        salven.append(cur)
    out = []
    for sv in salven:
        A0, art = sv[0]
        s = L.slot(A0, n)
        p = L.fig(A0)
        # Tiefenangleich: Aktion 6 Phase 2 direkt vor A0
        V = A0
        while V - 1 in L.d.offsets and L.v(V - 1, SA(n) + 0x0A) == 6 and L.v(V - 1, SA(n) + 0x0C) == 2:
            V -= 1
        zs = [L.v(f, SA(n) + 0x16) + L.v(f, SA(n) + 0x18) / 65536 for f in range(max(V - 1, L.frames[0]), A0)] if V < A0 else []
        dzs = sorted({round(b - a, 4) for a, b in zip(zs, zs[1:])})
        fv = max(V - 1, L.frames[0])
        sv_v = L.slot(fv, n)
        p_v = L.fig(fv)
        letzt = sv[-1][0]
        nach = next(((f, b) for f, b in folge if f > letzt and b not in DICK_SCHUSS), None)
        kugeln = []
        for A, _ in sv:
            g = next((g for g in ges if A < g["G"] <= A + 8), None)
            kugeln.append((A, geschoss_info(L, g, treff) if g else None))
        out.append({"A": A0, "art": "pistole" if art == PISTOLE_A else "rakete", "n": len(sv), "abst": [b[0] - a[0] for a, b in zip(sv, sv[1:])],
                    "rang": L.rang(A0), "d": (p["x"] - s["x"]) * richtung(s), "dz": s["z"] - p["z"], "dick": (s["x"], s["z"], s["blick"]),
                    "fig": (p["x"], p["z"], p["akt"], p["st"]), "angleich": A0 - V, "angleich_dz": dzs,
                    "ziel_vorher": (sv_v["zx"], sv_v["zz"]), "lage_vorher": (sv_v["x"] - p_v["x"], sv_v["z"] - p_v["z"]),
                    "nach": (nach[0] - letzt, hex(nach[1]), L.slot(nach[0], n)["akt"]) if nach else None,
                    "anims": [(hex(a), b - f) for (f, a), (b, _) in zip(anim_folge(L, n, A0, A0 + 17), anim_folge(L, n, A0, A0 + 17)[1:])],
                    "kugeln": kugeln, "waffe": dick_waffe(L, n, A0), "lp": s["lp"], "max": s["max"]})
    return out


def cmd_dick(a):
    for pre in a.prefix:
        L = Lauf(pre)
        for n in finde_slots(L, DICK):
            for e in dick_angriffe(L, n):
                print(f"{L.name} slot{n} {e['art'].upper()} A{e['A']} n{e['n']} abst{e['abst']} rang{e['rang']} d{e['d']} dz{e['dz']} dick{e['dick']} fig{e['fig']} "
                      f"angleich{e['angleich']} {e['angleich_dz']} ziel_vorher{e['ziel_vorher']} lage_vorher{e['lage_vorher']} nach{e['nach']} waffe{e['waffe']} lp{e['lp']}/{e['max']}")
                if a.anims:
                    print(f"    anims {e['anims']}")
                for A, g in e["kugeln"]:
                    if not g:
                        print(f"    A{A} kein Geschoss")
                        continue
                    print(f"    A{A} G-A{g['G'] - A} slot{g['slot']} typ{g['typ']:05X} vor{g['vor_werfer']} h{g['h0']} z{g['z_alle']} attr{[hex(x) for x in g['attr_flug']]} dmg{g['dmg']} "
                          f"dx{sorted(set(round(x, 3) for x in g['dx']))} flug{g['flug_frames']} letzt{g['letzt_x']}@{g['letzt_f']} kam{L.kam(g['letzt_f']) if g['letzt_f'] else None} "
                          f"anims{[hex(x) for x in g['anims']]} hit{(g['hit'] - g['G']) if g['hit'] else None} vorn{g.get('vorn')} zum{g.get('fig_blick_zum_werfer')} hh{g.get('hit_h')} dlp{g.get('dlp')} um{g.get('um')}")


def raketen(L):
    """Je Rakete: Flug, Einschlag (erstes Attribut 0x1402), Explosion, Treffer."""
    treff = treffer_map(L)
    out = []
    for g in geschosse(L):
        b = g["bahn"]
        G, s0 = b[0]
        ws = L.slot(G, g["werfer"])
        if ws["typ"] != DICK or s0["typ"] == 0x9A988 or dick_waffe(L, g["werfer"], G) != 4:
            continue
        rx = richtung(ws)
        E = next((f for f, s in b if s["attr"] == 0x1402), None)
        flug = [(f, s) for f, s in b if E is None or f < E]
        sE = dict(b).get(E)
        aktiv = [f for f, s in b if s["attr"] == 0x1402]
        hits = []
        for f in range(G, b[-1][0] + 2):
            if f in treff and treff[f][1] == g["werfer"]:
                p = L.fig(f)
                hits.append({"f": f, "rel": f - G, "vorn_e": ((p["x"] - sE["x"]) * rx) if sE else None,
                             "dz": (sE["z"] - p["z"]) if sE else None, "h": p["h"], "dlp": p["lp0"] - p["lp"],
                             "um": L.fig(min(f + 1, L.frames[-1]))["st"] == 2, "blick": p["blick"]})
        out.append({"lauf": L.name, "G": G, "slot": g["slot"], "werfer": g["werfer"], "rx": rx, "wx": ws["x"], "typ": s0["typ"],
                    "vor": (s0["x"] - ws["x"]) * rx, "h0": s0["h"], "dmg": s0["dmg"], "E": E, "flug": len(flug),
                    "weite": ((sE["x"] - s0["x"]) * rx) if sE else None, "vor_E": ((sE["x"] - ws["x"]) * rx) if sE else None,
                    "eh": sE["h"] if sE else None, "hoehen": [s["h"] for _, s in flug], "dx": sorted({round(xf(b2) - xf(a2), 4) for (_, a2), (_, b2) in zip(flug, flug[1:])}),
                    "attr_flug": sorted({s["attr"] for _, s in flug}), "aktiv": (min(aktiv) - G, max(aktiv) - G) if aktiv else None,
                    "frei": b[-1][0] + 1 - G, "hits": hits, "kam": L.kam(G), "ex": sE["x"] if sE else None, "ez": sE["z"] if sE else None})
    return out


def cmd_raketen(a):
    for pre in a.prefix:
        L = Lauf(pre)
        for r in raketen(L):
            print(f"{r['lauf']} G{r['G']} slot{r['slot']} werfer{r['werfer']} typ{r['typ']:05X} rx{r['rx']} vor{r['vor']} h{r['h0']} dmg{r['dmg']} E-G{(r['E'] - r['G']) if r['E'] else None} "
                  f"weite{r['weite']} vorE{r['vor_E']} eh{r['eh']} ex{r['ex']} h{r['hoehen'][:1]}..{r['hoehen'][-1:]} dx{r['dx']} attrflug{[hex(x) for x in r['attr_flug']]} aktiv{r['aktiv']} frei{r['frei']} "
                  f"hits{[(h['rel'], h['vorn_e'], h['dz'], h['h'], h['dlp'], h['um']) for h in r['hits']]}")


FENSTER = {"messer": (-21, 31), "kugel": (-14, 22), "explosion": (-57, 57)}


def gegner_auf_bahn(L):
    """Gegner (Slot 0..19, nicht der Werfer) im Trefferbereich eines Geschosses:
    |dz| <= 12 und x im Fenster (grosszuegig, beide Blickrichtungen). Zaehlt Frames
    und LP-Verluste dieser Gegner im selben oder naechsten Frame."""
    out = []
    for g in geschosse(L):
        b = g["bahn"]
        G, s0 = b[0]
        if s0["typ"] == 0x9A988:
            continue
        ws = L.slot(G, g["werfer"])
        rx = richtung(ws)
        art = "messer" if ws["typ"] == SKIP else ("kugel" if s0["h"] == 58 else "rakete")
        for f, s in b:
            if (s["anim"] & 0xFFFFF) in (FUNKE,) or s["st"] == 3:
                continue
            if art == "rakete":
                if s["attr"] != 0x1402:
                    fen, k = (-14, 22), "rakete_flug"
                else:
                    fen, k = FENSTER["explosion"], "explosion"
            else:
                if s["attr"] == 0:
                    continue
                fen, k = FENSTER[art], art
            for n in range(20):
                if n == g["werfer"]:
                    continue
                e = L.slot(f, n)
                if e["st"] not in (1, 3) or e["typ"] not in TYPNAME or e["typ"] == DOLG:
                    continue
                vorn = (e["x"] - s["x"]) * rx
                if abs(e["z"] - s["z"]) <= 12 and fen[0] <= vorn <= fen[1]:
                    f2 = min(f + 1, L.frames[-1])
                    lpv = L.slot(f, n)["lp"] < L.v(f, SA(n) + 0x42, 2, True) or L.slot(f2, n)["lp"] < L.v(f2, SA(n) + 0x42, 2, True)
                    out.append((L.name, G, k, TYPNAME[e["typ"]], n, f, vorn, e["z"] - s["z"], lpv, L.slot(f, n)["h"]))
    return out


def cmd_bahn_gegner(a):
    from collections import Counter
    c = Counter()
    for pre in a.prefix:
        L = Lauf(pre)
        rows = gegner_auf_bahn(L)
        for r in rows:
            c[(r[2], r[3], r[8])] += 1
            if a.alle:
                print(*r)
        # Geschosse mit mindestens einem Gegnerframe
        geschosse_mit = {(r[1], r[2]) for r in rows}
        print(f"{L.name} Geschosse mit Gegner im Bereich: {len(geschosse_mit)}")
    for k, v in sorted(c.items()):
        print(f"  {k[0]} durch {k[1]}: {v} Frames, LP-Verlust {k[2]}")


def dick_tod(L):
    """Je DICK: Tod (erster Frame mit LP < 0), Schuesse davor, Flug der Waffe bis zum Gegenstand."""
    out = []
    for n in finde_slots(L, DICK):
        t = next((f for f in L.frames if L.slot(f, n)["typ"] == DICK and L.slot(f, n)["st"] and L.slot(f, n)["lp"] < 0), None)
        if t is None:
            continue
        ev = dick_angriffe(L, n)
        schuesse = sum(1 for e in ev for i in range(e["n"]) if e["A"] + 6 + 17 * i < t)
        k = next((k for k in range(20, 60) if L.v(t - 1, SA(k) + 4, 1) and L.v(t - 1, SA(k) + 0x38, 4) == 0x9A988
                  and slot_von_zeiger(L.v(t - 1, SA(k) + 0x6C)) == n), None)
        if k is None:
            out.append({"n": n, "t": t, "schuesse": schuesse})
            continue
        art0 = L.v(t - 1, SA(k) + 0x3D, 1)
        bahn, item = [], None
        for f in L.frames:
            if f < t:
                continue
            s2 = L.slot(f, k)
            if s2["typ"] == 0x95F9C:
                item = (f, s2)
                break
            bahn.append((f, s2))
        dxs = sorted({round(xf(b2) - xf(a2), 4) for (_, a2), (_, b2) in zip(bahn, bahn[1:]) if a2["typ"] == b2["typ"] == 0x9A988})
        flug_ab = next((f for f, s2 in bahn if abs(xf(s2) - xf(bahn[0][1])) > 0.01 or s2["h"] != bahn[0][1]["h"]), None)
        out.append({"n": n, "t": t, "schuesse": schuesse, "slot": k, "art_vorher": art0,
                    "hmax": max(s2["h"] for _, s2 in bahn) if bahn else None, "dx": dxs, "flug_ab": flug_ab,
                    "item": item[0] if item else None, "item_t": (item[0] - t) if item else None,
                    "item_flug": (item[0] - flug_ab) if item and flug_ab else None,
                    "art": item[1]["art"] if item else None, "muni": L.slot(item[0] + 1, k)["muni"] if item and item[0] + 1 in L.d.offsets else None,
                    "liege": item[1]["liege"] if item else None, "liege_next": L.slot(item[0] + 1, k)["liege"] if item and item[0] + 1 in L.d.offsets else None,
                    "x": (item[1]["x"], item[1]["z"]) if item else None})
    return out


def cmd_tod(a):
    for pre in a.prefix:
        L = Lauf(pre)
        for e in dick_tod(L):
            print(L.name, e)


# ---------------------------------------------------------------------------
# Belegdatei logs/fern_v.csv
# Probe-Frame K und Geschosstyp je Gruppe der Einzelframe-Proben (siehe belege_fern.sh)
PROBEN = {"bmx1_": (5, 0x85B42), "bmx2_": (6, 0x85B42), "bmx3_": (8, 0x85B42), "bmx3w_": (8, 0x85B42),
          "bkx1_": (18, KUGEL), "bkx3_": (18, KUGEL), "bkx2_": (18, KUGEL), "bkx2w_": (18, KUGEL),
          "bkux3_": (35, KUGEL), "bkux2_": (52, KUGEL),
          "brx1_": (24, KUGEL), "brx1t_": (24, KUGEL), "brx2_": (24, KUGEL), "brx2t_": (24, KUGEL)}


def _w(out, *felder):
    out.append(",".join(str(x).replace(",", ";") for x in felder))


def _ges_info_alle(L):
    treff = treffer_map(L)
    return [(g, geschoss_info(L, g, treff)) for g in geschosse(L) if g["bahn"][0][1]["typ"] != 0x9A988]


def belege_lauf(L, nm, out):
    """Schreibt die Zeilen eines Laufs in out (Liste von CSV-Zeilen mit Abschnitt vorn)."""
    from collections import Counter
    kurz = nm[len("fern_v_"):]
    treff = treffer_map(L)
    # Einzelframe-Proben
    for pre, (K, typ) in PROBEN.items():
        if kurz.startswith(pre):
            ges = [g for g in geschosse(L) if g["bahn"][0][1]["typ"] == typ and any(f == K for f, _ in g["bahn"])]
            if not ges:
                _w(out, "probe", nm, K, "kein Geschoss")
                return
            g = ges[-1]
            s = dict(g["bahn"])[K]
            ws = L.slot(K, g["werfer"])
            rx = richtung(L.slot(g["G"], g["werfer"]))
            p = L.fig(K)
            zum = (p["blick"] == "r") == (ws["x"] > p["x"])
            hitK = K in treff and treff[K][1] == g["werfer"]
            _w(out, "probe", nm, K, "rechts" if rx > 0 else "links", "zum" if zum else "weg", (p["x"] - s["x"]) * rx,
               s["z"] - p["z"], p["h"], f"{s['attr']:04X}", f"{p['anim'] & 0xFFFFF:05X}", "ja" if hitK else "nein")
            return
    if kurz.startswith("s_"):
        for n in finde_slots(L, SKIP):
            ev = skip_angriffe(L, n)
            wuerfe = [e for e in ev if e["art"] == "wurf"]
            for e in wuerfe:
                g = e["g"] or {}
                kam = L.kam(g["letzt_f"]) if g.get("letzt_f") else None
                _w(out, "wurf", nm, e["A"], e["rang"], e["d"], e["dz"], e["A"] - e["V"], e["rest"][0], e["rest"][1],
                   f"{e['ziel'][0]}/{e['ziel'][1]}", "/".join(f"{a:X}:{b}" for a, b in e["dauer"]), (e["gehen"] - e["A"]) if e["gehen"] else "",
                   (g.get("G", 0) - e["A"]) if g else "", g.get("slot", ""), g.get("vor_werfer", ""), g.get("h0", ""),
                   "/".join(str(z) for z in g.get("z_alle", [])), "/".join(f"{x:X}" for x in g.get("attr_flug", [])), g.get("dmg", ""),
                   "/".join(str(round(x, 3)) for x in sorted(set(g.get("dx", [])))), (g["hit"] - g["G"]) if g.get("hit") else "",
                   g.get("vorn", ""), ("zum" if g.get("fig_blick_zum_werfer") else "weg") if g.get("hit") else "", g.get("dlp", ""),
                   g.get("um", ""), "" if g.get("hit") else ((g["letzt_x"] - kam) if kam is not None else ""), "" if g.get("hit") else g.get("flug_frames", ""))
            st = [e for e in ev if e["art"] == "stich"]
            for e in st:
                _w(out, "stich", nm, e["A"], e["rang"], e["d"], e["dz"], (e["hit"] - e["A"]) if e["hit"] else "", e["dlp"] or "", e["um"],
                   f"{e['danach']:X}" if e["danach"] else "")
            # Serien: Stich, direkt Wartepose, direkt naechster Stich
            folge = anim_folge(L, n, L.frames[0], L.frames[-1])
            serien, cur = [], []
            for i, (f, a) in enumerate(folge):
                if a == STICH_A:
                    if cur and i >= 2 and folge[i - 1][1] == WARTE_SKIP and folge[i - 2][1] in range(0x287E0, 0x289B3):
                        cur.append(f)
                    else:
                        if cur:
                            serien.append(cur)
                        cur = [f]
            if cur:
                serien.append(cur)
            from collections import Counter
            lg = Counter(len(x) for x in serien)
            ab = Counter(b - a for x in serien for a, b in zip(x, x[1:]))
            _w(out, "serien", nm, " ".join(f"{k}:{v}" for k, v in sorted(lg.items())), " ".join(f"{k}:{v}" for k, v in sorted(ab.items())))
            A = [e["A"] for e in wuerfe]
            _w(out, "rhythmus_skip", nm, len(A), L.frames[-1], round(1000 * len(A) / L.frames[-1], 2), "/".join(str(b - a) for a, b in zip(A, A[1:])),
               "/".join(str(e["rang"]) for e in wuerfe))
    if kurz[:2] in ("p_", "z_", "r_", "g_"):
        for n in finde_slots(L, DICK):
            ev = dick_angriffe(L, n)
            for e in ev:
                pat = "".join(("U" if 0xC02 in g["attr_flug"] else "N") if g else "?" for _, g in e["kugeln"])
                hits = "/".join(f"{g['hit'] - A}:{g['vorn']}:{'zum' if g.get('fig_blick_zum_werfer') else 'weg'}:{g['dlp']}:{'U' if g['um'] else 'N'}"
                                for A, g in e["kugeln"] if g and g["hit"])
                kug = sorted({(g["G"] - A, g["vor_werfer"], g["h0"], g["dmg"], g["slot"]) for A, g in e["kugeln"] if g})
                _w(out, "angriff_dick", nm, n, e["art"], e["A"], e["n"], "/".join(map(str, e["abst"])), e["rang"], e["d"], e["dz"],
                   e["angleich"], "/".join(str(x) for x in e["angleich_dz"]), f"{e['ziel_vorher'][0]}/{e['ziel_vorher'][1]}",
                   f"{e['lage_vorher'][0]}/{e['lage_vorher'][1]}", pat, "/".join(f"{a}:{b}" for a, b in e["anims"]),
                   f"{e['nach'][0]}:{e['nach'][1]}:akt{e['nach'][2]}" if e["nach"] else "", " ".join("/".join(map(str, k)) for k in kug), hits,
                   e["max"])
            erst = next((f for f in L.frames if L.slot(f, n)["st"] and L.slot(f, n)["typ"] == DICK), None)
            A = [e["A"] for e in ev]
            nsch = sum(e["n"] for e in ev)
            if erst is not None:
                _w(out, "rhythmus_dick", nm, n, dick_waffe(L, n, erst + 5), len(ev), nsch, L.frames[-1] - erst,
                   round(1000 * len(ev) / max(1, L.frames[-1] - erst), 2), "/".join(str(b - a) for a, b in zip(A, A[1:])))
        for r in raketen(L):
            _w(out, "rakete", nm, r["werfer"], r["G"], r["slot"], "rechts" if r["rx"] > 0 else "links", r["vor"], r["h0"], r["dmg"],
               (r["E"] - r["G"]) if r["E"] else "", r["weite"], r["vor_E"], r["ex"], f"{r['hoehen'][0]}..{r['hoehen'][-1]}",
               "/".join(str(x) for x in r["dx"]), "/".join(f"{x:X}" for x in r["attr_flug"]),
               f"{r['aktiv'][0]}..{r['aktiv'][1]}" if r["aktiv"] else "", r["frei"],
               "/".join(f"{h['rel']}:{h['vorn_e']}:{h['dz']}:{h['h']}:{h['dlp']}:{'U' if h['um'] else 'N'}" for h in r["hits"]))
        # Kugeln ohne Treffer: Ende
        for g, gi in _ges_info_alle(L):
            if gi["typ"] == KUGEL and gi["h0"] == 58 and not gi["hit"]:
                kam = L.kam(gi["letzt_f"])
                wand = any(a in (0x95EAA, 0x95EC4, 0x95EDE, 0x95EF8) for a in gi["anims"])
                fl = [s2 for _, s2 in g["bahn"] if (s2["anim"] & 0xFFFFF) in (0x863D8, 0x863F0)]
                _w(out, "kugel_ende", nm, gi["G"], "rechts" if gi["rx"] > 0 else "links", "wand" if wand else "bild",
                   fl[-1]["x"] if fl else "", (fl[-1]["x"] - kam) if fl and kam is not None else "")
        dick_verhalten(L, nm, out)
        # Schutzfenster: Treffer durch DICK-Geschosse, waehrend die Figur im Vorframe im Zustand 3 war
        zs = Counter()
        for f, (p, z) in treff.items():
            if isinstance(z, int) and L.slot(f, z)["typ"] == DICK:
                zs[L.fig(f - 1)["st"]] += 1
        _w(out, "schutz", nm, " ".join(f"zustand{k}:{v}" for k, v in sorted(zs.items())))
        # mehrere DICK: ueberlappende Angriffe verschiedener DICK
        iv = []
        for n in finde_slots(L, DICK):
            for e in dick_angriffe(L, n):
                iv.append((e["A"], e["A"] + 17 * e["n"] - 1, n))
        iv.sort()
        ov = [(a, b) for i, a in enumerate(iv) for b in iv[i + 1:] if b[0] <= a[1] and a[2] != b[2]]
        _w(out, "mehrere_dick", nm, len({x[2] for x in iv}), len(iv), len(ov), " ".join(f"{a[0]}/{a[2]}+{b[0]}/{b[2]}" for a, b in ov))
    if kurz[:2] in ("p_", "z_", "r_", "g_", "s_") or kurz.startswith(("fe_", "zweit_")):
        cur, sp = {}, []
        for f in L.frames:
            for n in range(19):
                s2 = L.slot(f, n)
                k = (TYPNAME.get(s2["typ"], hex(s2["typ"])), s2["max"]) if s2["st"] else None
                if cur.get(n) != k:
                    if f > 1 and k:
                        sp.append(f"{f}:{n}:{k[0]}" + (f":w{dick_waffe(L, n, min(f + 5, L.frames[-1]))}:lp{k[1]}" if k[0] == "DICK" else ""))
                    cur[n] = k
        tod17 = next((f for f in L.frames if L.slot(f, 17)["st"] and L.slot(f, 17)["typ"] == WOOKY and L.slot(f, 17)["lp"] < 0), "")
        if not kurz.startswith("s_"):
            _w(out, "erscheinen", nm, L.rang(L.frames[-1]), tod17, " ".join(sp))
    if kurz.startswith("e_"):
        for e in dick_tod(L):
            _w(out, "tod", nm, e["n"], e["t"], e.get("art_vorher", ""), e["schuesse"], e.get("hmax", ""), "/".join(str(x) for x in e.get("dx", [])),
               e.get("item_t", ""), e.get("art", ""), e.get("muni", ""), e.get("liege", ""), e.get("liege_next", ""))
    # Tiefe, Hoehe, Sprung, Schlag, Rang, Zeit, Glas, Rand: Bahn des ersten passenden Geschosses
    gruppen = ("bmz", "bkz", "brz", "bmh", "bkh", "brh", "cmj", "ckj", "crj", "cms", "cks", "crs", "dm_", "dk_", "dr_", "brt",
               "cmglas", "cmfass", "ckglas", "crglas", "bmrand")
    if kurz.startswith(gruppen):
        for g, gi in _ges_info_alle(L):
            rx = gi["rx"]
            zeilen = []
            for f, s2 in g["bahn"]:
                p = L.fig(f)
                t = "T" if (f in treff and treff[f][1] == g["werfer"]) else "-"
                if s2["attr"] or t == "T":
                    zeilen.append(f"{f - gi['G']}:{(p['x'] - s2['x']) * rx}:{s2['z'] - p['z']}:{p['h']}:{s2['attr']:X}:{t}")
            ende = g["bahn"][-1][0]
            kam = L.kam(gi["letzt_f"]) if gi["letzt_f"] else None
            _w(out, "bahn", nm, gi["G"], gi["slot"], f"{gi['typ']:05X}", "rechts" if rx > 0 else "links", L.rang(gi["G"]), gi["dmg"],
               (gi["hit"] - gi["G"]) if gi["hit"] else "", gi.get("hit_h", ""), gi.get("hit_dz", ""), gi.get("dlp", ""), gi.get("um", ""),
               "zustand3" if gi["zustand3"] else "", ende + 1 - gi["G"], (gi["letzt_x"] - kam) if kam is not None and gi["letzt_x"] else "",
               " ".join(zeilen))
        if kurz.startswith(("cmglas", "cmfass", "ckglas", "crglas")):
            for k in (44, 47):
                a = anim_folge(L, k, 1, L.frames[-1])
                lps = [(f, L.slot(f, k)["lp"], L.slot(f, k)["st"]) for f in L.frames]
                tr = next((f for f, lp, st in lps if st == 3), "")
                _w(out, "objekt", nm, k, f"{L.slot(1, k)['typ']:05X}", L.slot(1, k)["lp"], tr, L.slot(min(tr + 1, L.frames[-1]), k)["lp"] if tr else "",
                   next((f for f, lp, st in lps if st == 0 and f > (tr or 0)), "") if tr else "")
    if kurz[:2] in ("g_", "z_", "r_", "s_"):
        from collections import Counter
        c = Counter((r[2], r[3], r[8]) for r in gegner_auf_bahn(L))
        for (art, gt, lpv), v in sorted(c.items()):
            _w(out, "gegner_auf_bahn", nm, art, gt, v, "ja" if lpv else "nein")


def dick_verhalten(L, nm, out):
    from collections import Counter
    for n in finde_slots(L, DICK):
        vec, weg, dist, reakt, posen = Counter(), Counter(), Counter(), Counter(), []
        prev, seg = None, None
        for f in L.frames:
            s2 = L.slot(f, n)
            p = L.fig(f)
            if s2["st"] == 0 or s2["typ"] != DICK:
                prev = None
                continue
            if s2["st"] == 1 and p["st"] == 1 and p["akt"] == 0:
                ad = abs(s2["x"] - p["x"])
                dist["<20" if ad < 20 else "20-99" if ad < 100 else "100-139" if ad < 140 else ">=140"] += 1
            if prev:
                ps, pp = prev
                dx = xf(s2) - xf(ps)
                dz = (s2["z"] + L.v(f, SA(n) + 0x18) / 65536) - (ps["z"] + L.v(f - 1, SA(n) + 0x18) / 65536)
                if s2["akt"] == 0 and ps["akt"] == 0 and (abs(dx) > 0.01 or abs(dz) > 0.01):
                    e1 = (dx / 1.75) ** 2 + (dz / 0.875) ** 2
                    e2 = (dx / 2.25) ** 2 + (dz / 1.125) ** 2
                    vec["1.75/0.875" if abs(e1 - 1) < 0.02 else "2.25/1.125" if abs(e2 - 1) < 0.02 else "sonst"] += 1
                    if abs(s2["x"] - p["x"]) > abs(ps["x"] - pp["x"]) and abs(dx) > 0.01:
                        weg["blick_zur_figur" if (s2["blick"] == "r") == (p["x"] > s2["x"]) else "blick_weg"] += 1
                fdx = (p["x"] + L.v(f, P + 0x10) / 65536) - (pp["x"] + L.v(f - 1, P + 0x10) / 65536)
                rel = s2["x"] - p["x"]
                if p["akt"] == 0 and abs(fdx) > 1 and (fdx > 0) == (rel > 0) and abs(rel) < 200 and s2["st"] == 1:
                    reakt["steht" if abs(dx) < 0.01 else ("zurueck" if (dx > 0) == (rel > 0) else "naeher")] += 1
            if s2["akt"] == 2:
                if seg is None:
                    seg = [f, s2["ph"], []]
                a = s2["anim"] & 0xFFFFF
                if not seg[2] or seg[2][-1] != a:
                    seg[2].append(a)
            elif seg:
                p0 = L.fig(seg[0])
                posen.append((f - seg[0], seg[1], seg[2], abs(L.slot(seg[0], n)["x"] - p0["x"]), s2["akt"]))
                seg = None
            prev = (s2, p)
        tot = sum(dist.values()) or 1
        _w(out, "dick_gehen", nm, n, " ".join(f"{k}:{v}" for k, v in sorted(vec.items())), " ".join(f"{k}:{v}" for k, v in sorted(weg.items())))
        _w(out, "dick_abstand", nm, n, tot, " ".join(f"{k}:{100 * v / tot:.0f}%" for k, v in sorted(dist.items())))
        _w(out, "dick_annaeherung", nm, n, " ".join(f"{k}:{v}" for k, v in sorted(reakt.items())))
        dauern = Counter((d, ph) for d, ph, *_ in posen)
        seqs = Counter("-".join(f"{a:X}" for a in sq) for _, _, sq, _, _ in posen)
        _w(out, "dick_pose", nm, n, len(posen), " ".join(f"{d}/ph{ph}:{v}" for (d, ph), v in sorted(dauern.items())),
           min((x[3] for x in posen), default=""), max((x[3] for x in posen), default=""), " ".join(f"akt{k}:{v}" for k, v in Counter(x[4] for x in posen).items()))
        for sq, v in seqs.most_common(6):
            _w(out, "dick_pose_folge", nm, n, sq, v)


def cmd_belege(a):
    raw = Path(a.raw)
    namen = sorted(p.name[:-len("_ram.hdr")] for p in raw.glob("fern_v_*_ram.hdr"))
    out = []
    for nm in namen:
        L = Lauf(raw / nm)
        try:
            belege_lauf(L, nm, out)
        except Exception as e:  # ein Fehler soll die Belegdatei nicht verhindern
            _w(out, "fehler", nm, repr(e))
        if a.loeschen:
            for f in raw.glob(nm + "_*"):
                f.unlink()
    kopf = [
        "# Gegenpruefung V7 \"Fernkampf und Messerwurf\" (Praefix fern_v), erzeugt von scripts/belege_fern.sh",
        "# (Block V7, Szenario scenarios/fern_v_frei.lua, Bot scenarios/fern_v_bot.lua), Auswertung",
        "# scripts/messen_fern_v.py belege. Frames lokal je Lauf; A = Angriffsbeginn, G = erster Frame des",
        "# Geschosses; vorn = (x Figur - x Geschoss) * Flugrichtung am Frame-Ende; dz = z(Geschoss bzw. Werfer) - z(Figur).",
        "# Abschnitte (erste Spalte): wurf, stich, serien, rhythmus_skip (SKIP natuerlich, Laeufe s_*);",
        "# angriff_dick, rhythmus_dick, rakete, kugel_ende, dick_* (DICK natuerlich, p_*, z_*, r_*, g_*);",
        "# probe (Einzelframe-Probe: Lauf, K, Flugrichtung, Blick der Figur zum Werfer, vorn, dz, Hoehe, Attribut,",
        "#   Animation der Figur, Treffer in K); bahn (je Geschoss: Lauf, G, Slot, Typ, Richtung, Rang, Schaden,",
        "#   Treffer rel. G, Hoehe und dz beim Treffer, LP-Verlust, umgeworfen, Zustand 3, frei rel. G, letzte Lage",
        "#   x - Kamera, dann je Frame mit Attribut rel:vorn:dz:h:attr:T); objekt (Glas/Fass: Slot, Typ, LP vorher,",
        "#   Trefferframe, LP danach, frei); erscheinen (Rang, Tod WOOKY 17, Belegungen frame:slot:typ[:Waffe:MaxLP]);",
        "#   tod (Slot, Tod t, Art vorher, Schuesse, Hoehe max, dx, Gegenstand nach, Art, Munition, Liegezeit);",
        "#   gegner_auf_bahn (Geschossart, Gegnertyp, Frames im Trefferbereich, LP-Verlust); schutz (Treffer durch",
        "#   DICK-Geschosse nach Zustand der Figur im Vorframe); mehrere_dick (DICK, Angriffe, ueberlappende Angriffe).",
        "# EINGRIFFE je Lauf in belege_fern.sh (LP 72 immer; CC_RANG; DOLG gehalten; entf/glp/pos/obj/fig/hoch/frac0).",
    ]
    Path(a.aus).write_text("\n".join(kopf + out) + "\n")
    print(f"{a.aus}: {len(out)} Zeilen aus {len(namen)} Laeufen")


def cmd_slots(a):
    L = Lauf(a.prefix)
    fr = [int(x) for x in a.frames.split(",")] if a.frames else [L.frames[0]]
    for f in fr:
        p = L.fig(f)
        print(f"F{f} rang {L.rang(f)} kam {L.kam(f)} Figur x{p['x']} z{p['z']} h{p['h']} lp{p['lp']} st{p['st']} akt{p['akt']:X} blick {p['blick']}")
        for n in range(a.von, a.bis + 1):
            s = L.slot(f, n)
            if s["st"] == 0:
                continue
            print(f"  {n:2d} st{s['st']}{s['s5']} {TYPNAME.get(s['typ'], format(s['typ'], '05X'))} x{s['x']} z{s['z']} h{s['h']} "
                  f"lp{s['lp']}/{s['max']} akt{s['akt']:X}/{s['ph']:X} anim{s['anim']:06X} attr{s['attr']:04X} dmg{s['dmg']} "
                  f"blick {s['blick']} 6C {s['zeiger']:04X} 3D {s['art']:X} ziel {s['zx']}/{s['zz']}")


def cmd_zeit(a):
    L = Lauf(a.prefix)
    slots = [int(x) for x in a.slot.split(",")] if a.slot else []
    for f in L.frames:
        if f < a.von or f > a.bis:
            continue
        p = L.fig(f)
        t = [f"{f}", f"P x{p['x']} z{p['z']} h{p['h']} lp{p['lp']}/{p['lp0']} st{p['st']} akt{p['akt']:X}/{p['ph']:X} {p['blick']}"]
        for n in slots:
            s = L.slot(f, n)
            t.append(f"[{n} st{s['st']}{s['s5']} x{s['x']}.{s['xf'] >> 12:X} z{s['z']} h{s['h']} lp{s['lp']} akt{s['akt']:X}/{s['ph']:X} "
                     f"a{s['anim'] & 0xFFFFF:05X} t{s['attr']:04X} d{s['dmg']} {s['blick']} ziel{s['zx']}/{s['zz']}]")
        print(" ".join(t))


def cmd_geschosse(a):
    for pre in a.prefix:
        L = Lauf(pre)
        hits = {f: (p, z) for f, p, z in treffer(L)}
        for g in geschosse(L):
            b = g["bahn"]
            f0, s0 = b[0]
            f1, s1 = b[-1]
            vx = (s1["x"] - s0["x"]) / max(1, f1 - f0)
            attrs = sorted({s["attr"] for _, s in b})
            dm = sorted({s["dmg"] for _, s in b})
            ws = L.slot(f0, g["werfer"])
            th = [f for f in range(f0, f1 + 2) if f in hits]
            print(f"{L.name} G{f0}-{f1} slot{g['slot']} {g['wtyp']}({g['werfer']}) rang{L.rang(f0)} typ{s0['typ']:05X} "
                  f"x{s0['x']}->{s1['x']} z{s0['z']}->{s1['z']} h{s0['h']}->{s1['h']} vx{vx:.3f} attr{[hex(x) for x in attrs]} dmg{dm} "
                  f"werfer x{ws['x']} z{ws['z']} {ws['blick']} figtreffer{th}")


def cmd_treffer(a):
    for pre in a.prefix:
        L = Lauf(pre)
        for f, p, z in treffer(L):
            att = L.slot(f, z) if isinstance(z, int) else None
            nm = TYPNAME.get(att["typ"], hex(att["typ"])) if att else str(z)
            print(f"{L.name} F{f} rang{L.rang(f)} dLP {p['lp0'] - p['lp']} von {nm}({z}) Figur x{p['x']} z{p['z']} h{p['h']} st{p['st']} akt{p['akt']:X} {p['blick']}"
                  + (f" Angreifer x{att['x']} z{att['z']} anim{att['anim'] & 0xFFFFF:05X} attr{att['attr']:04X} dmg{att['dmg']}" if att else ""))


def cmd_anims(a):
    L = Lauf(a.prefix)
    last = None
    for f in L.frames:
        s = L.slot(f, a.slot)
        key = (s["st"], s["anim"], s["akt"])
        if key != last:
            print(f"{f} st{s['st']}{s['s5']} akt{s['akt']:X}/{s['ph']:X} anim{s['anim']:06X} attr{s['attr']:04X} x{s['x']} z{s['z']} {s['blick']} ziel{s['zx']}/{s['zz']}")
            last = key


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("slots", help="belegte Slots in einzelnen Frames")
    s.add_argument("prefix"); s.add_argument("--frames"); s.add_argument("--von", type=int, default=0); s.add_argument("--bis", type=int, default=59)
    s.set_defaults(fn=cmd_slots)
    s = sub.add_parser("zeit", help="je Frame Figur und gewaehlte Slots")
    s.add_argument("prefix"); s.add_argument("--slot", default=""); s.add_argument("--von", type=int, default=0); s.add_argument("--bis", type=int, default=10 ** 9)
    s.set_defaults(fn=cmd_zeit)
    s = sub.add_parser("geschosse", help="je Geschoss Werfer, Bahn, Attribut, Schaden und Treffer")
    s.add_argument("prefix", nargs="+"); s.set_defaults(fn=cmd_geschosse)
    s = sub.add_parser("treffer", help="je LP-Verlust der Figur Angreifer und Lage")
    s.add_argument("prefix", nargs="+"); s.set_defaults(fn=cmd_treffer)
    s = sub.add_parser("anims", help="Wechsel von Zustand, Aktion und Animation eines Slots")
    s.add_argument("prefix"); s.add_argument("--slot", type=int, required=True); s.set_defaults(fn=cmd_anims)
    s = sub.add_parser("skip", help="Wuerfe und Stiche des SKIP mit Abstand, Ablauf, Messer und Treffer")
    s.add_argument("prefix", nargs="+"); s.set_defaults(fn=cmd_skip)
    s = sub.add_parser("probe", help="Einzelframe-Probe: Abstand Geschoss-Figur und Treffer im Frame K")
    s.add_argument("prefix", nargs="+"); s.add_argument("--frame", type=int, required=True); s.add_argument("--ab", type=int, default=1)
    s.add_argument("--typ", default=""); s.set_defaults(fn=cmd_probe)
    s = sub.add_parser("bahn", help="je Flugframe eines Geschosses Abstand, Tiefe, Hoehe der Figur und Treffer")
    s.add_argument("prefix", nargs="+"); s.add_argument("--typ", default="")
    s.add_argument("--fenster", type=lambda t: tuple(int(x) for x in t.split(":")), default=None, help="nur vorn in A:B")
    s.set_defaults(fn=cmd_bahn)
    s = sub.add_parser("dick", help="Salven und Raketen des DICK mit Abstand, Tiefenangleich, Ablauf, Geschossen und Treffern")
    s.add_argument("prefix", nargs="+"); s.add_argument("--anims", action="store_true"); s.set_defaults(fn=cmd_dick)
    s = sub.add_parser("raketen", help="je Rakete Flug, Einschlag, aktive Frames der Explosion und Treffer")
    s.add_argument("prefix", nargs="+"); s.set_defaults(fn=cmd_raketen)
    s = sub.add_parser("bahngegner", help="Gegner im Trefferbereich von Geschossen und ob sie LP verlieren")
    s.add_argument("prefix", nargs="+"); s.add_argument("--alle", action="store_true"); s.set_defaults(fn=cmd_bahn_gegner)
    s = sub.add_parser("tod", help="Tod des DICK: Schuesse davor, Flug der Waffe, Gegenstand (Art, Munition, Liegezeit)")
    s.add_argument("prefix", nargs="+"); s.set_defaults(fn=cmd_tod)
    s = sub.add_parser("belege", help="alle Laeufe fern_v_* in logs/raw auswerten und logs/fern_v.csv schreiben")
    s.add_argument("--raw", default="logs/raw"); s.add_argument("--aus", default="logs/fern_v.csv")
    s.add_argument("--loeschen", action="store_true", help="Rohdaten jedes Laufs nach der Auswertung loeschen")
    s.set_defaults(fn=cmd_belege)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
