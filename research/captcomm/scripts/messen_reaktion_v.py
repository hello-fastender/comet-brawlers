#!/usr/bin/env python3
"""Auswertung der Gegenpruefung "Trefferreaktion der Gegner" (Praefix
reaktion_v). Liest nur die Watch-CSV aus scenarios/reaktion_v_frei.lua
(<prefix>_watch.csv, ohne RAM-Abzug), Standardbibliothek.

Unterbefehle:
  treffer    listet alle LP-Verluste der Gegner und der Figur (Frame, Slot, Schaden, Kombostufe)
  zeitachse  zeigt die Aenderungen ausgewaehlter Felder eines Slots, wahlweise relativ zu einem Bezugsframe
  reaktion   wertet jede Trefferreaktion eines Slots aus (Dauer, frei, Animation, Zittern, Ausholen, Angriff)
  umwerfen   wertet Flug, Liegen und Aufstehen nach einem umwerfenden Treffer aus (K bis G)
  wurf       wertet Flug, Liegen und Aufstehen nach einem Wurf aus (E = Wurfeingabe)
  tod        wertet den Ablauf vom ersten Frame mit LP unter 0 bis zum freien Slot aus
  probe      prueft, ob ein Gegner in einem Frame-Bereich LP verliert oder die Figur trifft
  schlaege   zeigt fuer jeden Schlag der Figur nach Frame K die aktiven Frames relativ zu G mit dx, dz und Treffer
  griff      zeigt den Griff-Frame relativ zu G (Aufstehen) nach einem Umwerfen
  stopp      zeigt die Animationswechsel der Figur nach jedem Treffer (Trefferstopp)
  belege     wertet alle Laeufe aus belege_reaktion.sh (Teil reaktion_v) aus und schreibt die CSV

Frames sind lokale Frames des Runners. h = Frame, in dem die LP des Gegners
sinken; K = Frame des umwerfenden Treffers; E = Frame der Wurfeingabe;
G = erster Frame nach dem Aufstehen, in dem der Gegner nicht mehr liegt
(S+4 = 1, ohne Probe); t = erster Frame mit LP unter 0. Positionen
ganzzahlig am Frame-Ende (dx = Gegner - Figur), Hoehe und x im Flug 16.16.
"""

import argparse
import csv
import os
import sys


def load(prefix):
    with open(prefix + "_watch.csv") as f:
        rows = [{k: int(v) for k, v in r.items()} for r in csv.DictReader(f)]
    return {r["frame"]: r for r in rows}


def name_of(prefix):
    return os.path.basename(prefix)


def fx(r, s, feld):
    """16.16-Wert (x, h, z) eines Slots s."""
    v = r[f"s{s}_{feld}"]
    if feld == "x" and v >= 0x8000:
        v -= 0x10000
    return v + r[f"s{s}_{feld}f"] / 65536


def hits(R, slot):
    """Frames, in denen die LP des Slots sinken: (Frame, Schaden, Kombostufe 1..4)."""
    out = []
    fr = sorted(R)
    for a, b in zip(fr, fr[1:]):
        la, lb = R[a][f"s{slot}_lp"], R[b][f"s{slot}_lp"]
        if R[b][f"s{slot}_st"] != 0 and lb < la:
            out.append((b, la - lb, R[b]["kombo"] // 4 + 1))
    return out


# aktive Frames des Schlags relativ zum Druck je Kettenstufe (notes.md, mechanik.md)
AKTIV = {1: (2, 5), 2: (3, 6), 3: (4, 7), 4: (3, 6)}


def active_frames(R, P):
    """Aktive Frames eines Schlags mit Druck in P (Stufe aus der Kombostufe FFAA2D)."""
    k = max(R[f]["kombo"] for f in range(P, P + 4) if f in R) // 4 + 1
    a, b = AKTIV[k]
    return k, [f for f in range(P + a, P + b + 1) if f in R]


def presses(prefix):
    """Frames, ab denen der Angriff gedrueckt ist (aus der Eingabe-CSV)."""
    out, prev = [], False
    with open(prefix + "_inputs.csv") as f:
        for r in csv.DictReader(f):
            on = "Button 1" in r["inputs"]
            if on and not prev:
                out.append(int(r["frame"]))
            prev = on
    return out


def emit(rows, out=sys.stdout):
    w = csv.writer(out, lineterminator="\n")
    for r in rows:
        w.writerow(r)


def slots_of(R):
    return sorted({int(k[1:].split("_")[0]) for k in R[min(R)] if k.startswith("s") and k.endswith("_lp")})


# --- treffer -------------------------------------------------------------------
def rows_treffer(prefixes):
    rows = [["lauf", "frame", "ziel", "schaden", "stufe_oder_angreifer", "lp_danach"]]
    for prefix in prefixes:
        R = load(prefix)
        ev = []
        for s in slots_of(R):
            for h, d, k in hits(R, s):
                ev.append((h, f"slot {s}", d, f"Stufe {k}", R[h][f"s{s}_lp"]))
        fr = sorted(R)
        for a, b in zip(fr, fr[1:]):
            if R[b]["p_lp"] < R[a]["p_lp"]:
                ang = ((0xFF0000 + R[b]["p_angr"] - 4) - 0xFFBC90) // 0xC0
                ev.append((b, "Figur", R[a]["p_lp"] - R[b]["p_lp"], f"Angreifer Slot {ang}", R[b]["p_lp"]))
        for e in sorted(ev):
            rows.append([name_of(prefix), *e])
    return rows


def cmd_treffer(a):
    emit(rows_treffer(a.prefix))


# --- zeitachse -----------------------------------------------------------------
def cmd_zeitachse(args):
    R = load(args.prefix)
    s = args.slot
    felder = args.felder.split(",")
    prev = None
    for f in sorted(R):
        if f < args.von or f > args.bis:
            continue
        r = R[f]
        vals = []
        for c in felder:
            key = c if c.startswith("p_") or c in ("kombo", "rang", "cam") else f"s{s}_{c}"
            v = r[key]
            if c.endswith(("anim", "typ", "attr")):
                vals.append(f"{c}={v:X}")
            elif c in ("x", "h", "z"):
                vals.append(f"{c}={fx(r, s, c):.4f}")
            else:
                vals.append(f"{c}={v}")
        if args.alle or vals != prev:
            rel = f"{f - args.ref:+d}" if args.ref else ""
            print(f, rel, " ".join(vals))
        prev = vals


# --- reaktion ------------------------------------------------------------------
def rows_reaktion(prefixes, s):
    rows = [["lauf", "slot", "typ", "h", "schaden", "stufe", "blick_figur", "s4_3_bis", "s4_1_ab",
             "naechster_treffer", "anim_wechsel", "zittern_dx", "tiefe_aenderung", "aktion_frei",
             "erste_x_aenderung", "standpose_ab", "ausholen_ab", "ausholanimation", "aktiv_ab", "figur_lp_verlust"]]
    for prefix in prefixes:
        R = load(prefix)
        H = hits(R, s)
        last = max(R)
        for i, (h, d, k) in enumerate(H):
            if (R[h][f"s{s}_lp"] < 0 or d == 14 or R[h][f"s{s}_act"] == 0x0C
                    or (h + 1 in R and R[h + 1][f"s{s}_st"] == 2)):
                continue  # Tod, Wurf oder Umwerfen: eigene Auswertung
            nxt = H[i + 1][0] if i + 1 < len(H) else None
            grenze = (nxt - 1) if nxt else last
            st3_bis = frei = None
            for f in range(h, grenze + 1):
                st = R[f][f"s{s}_st"]
                if st == 3:
                    st3_bis = f
                else:
                    frei = f if st == 1 else None
                    break
            aw = []
            prev = R[h - 1][f"s{s}_anim"]
            for f in range(h, min(grenze, h + 30) + 1):
                an = R[f][f"s{s}_anim"]
                if an != prev:
                    aw.append(f"{f - h:+d}:{an:X}")
                prev = an
            zx = []
            for f in range(h + 1, min(grenze, h + 16) + 1):
                d_ = R[f][f"s{s}_x"] - R[f - 1][f"s{s}_x"]
                if d_:
                    zx.append(f"{f - h:+d}:{d_:+d}")
            dz = R[min(grenze, h + 22)][f"s{s}_z"] - R[h][f"s{s}_z"]
            akt = xa = stand = aus = ausanim = aktiv = ""
            if frei:
                akt = f"{R[frei][f's{s}_act']:X}"
                for f in range(frei, grenze + 1):
                    if xa == "" and fx(R[f], s, "x") != fx(R[f - 1], s, "x"):
                        xa = f
                    # Standpose: Aktion 6 mit Unterphase 6 (Aktion 6 mit Phase 2 ist Gehen)
                    if stand == "" and R[f][f"s{s}_act"] == 6 and R[f][f"s{s}_ph"] == 6:
                        stand = f
                    if stand != "" and aus == "" and f > stand and R[f][f"s{s}_anim"] != R[f - 1][f"s{s}_anim"]:
                        aus, ausanim = f, f"{R[f][f's{s}_anim']:X}"
                    if aktiv == "" and R[f][f"s{s}_act"] != 0 and R[f][f"s{s}_attr"] not in (0, 0xFF00):
                        aktiv = f
                        break
            lpv = next((f"{f - h:+d}" for f in range(h + 1, grenze + 1) if R[f]["p_lp"] < R[f - 1]["p_lp"]), "")
            blick = "rechts" if R[h]["p_face"] & 0x20 else "links"
            rel = lambda v: f"h{v - h:+d}" if isinstance(v, int) else ""
            rows.append([name_of(prefix), s, f"{R[h][f's{s}_typ']:X}", h, d, k, blick, rel(st3_bis), rel(frei),
                         rel(nxt) if nxt else "", " ".join(aw), " ".join(zx), dz, akt, rel(xa),
                         rel(stand), rel(aus), ausanim, rel(aktiv), lpv])
    return rows


def cmd_reaktion(a):
    emit(rows_reaktion(a.prefix, a.slot))


# --- Umwerfen, Wurf, G ---------------------------------------------------------
def knock_k(R, s):
    """Erster Treffer, nach dem der Gegner umfaellt (S+4 = 2 im Folgeframe)."""
    for h, d, k in hits(R, s):
        if R[h][f"s{s}_lp"] >= 0 and h + 1 in R and R[h + 1][f"s{s}_st"] == 2:
            return h
    return None


def find_g(R, s, ab):
    """G: erster Frame nach Beginn des Aufstehens (Phase 0x0A), in dem der Gegner
    nicht mehr in Aktion 0x0C liegt bzw. S+4 wechselt (auch wenn er in G getroffen
    oder gegriffen wird)."""
    fr = [f for f in sorted(R) if f > ab]
    pa = next((f for f in fr if R[f][f"s{s}_ph"] == 0x0A and R[f][f"s{s}_act"] == 0x0C), None)
    if pa is None:
        return None, None
    st0 = R[pa][f"s{s}_st"]
    g = next((f for f in fr if f > pa and (R[f][f"s{s}_act"] != 0x0C or R[f][f"s{s}_st"] != st0)), None)
    return pa, g


def erste_x(R, s, G):
    """Erste x-Aenderung des Gegners ab G (relativ zu G)."""
    if not G:
        return ""
    f = next((f for f in sorted(R) if f > G and fx(R[f], s, "x") != fx(R[f - 1], s, "x")), None)
    return f"G+{f - G}" if f else "keine"


def aktionen_ab(R, s, G):
    if not G:
        return ""
    seq = []
    for f in range(G, max(R) + 1):
        v = R[f][f"s{s}_act"]
        if not seq or seq[-1][1] != v:
            seq.append((f, v))
    return " ".join(f"G+{f - G}:{v:X}" for f, v in seq) + f" (Laufende G+{max(R) - G})"


def rows_umwerfen(prefixes, s):
    rows = [["lauf", "slot", "K", "schaden", "flug_ab", "dx_je_frame", "h_start", "h_v0", "schwerkraft_256",
             "scheitel", "scheitel_hoehe", "boden", "boden_weg", "ruhe", "ruhe_weg", "dz", "s4_K+1_bis_G-1",
             "phasen", "liegen", "aufstehen", "G", "K_bis_G", "anim_aufstehen", "attr_aufstehen", "aktionen_ab_G",
             "erste_x_aenderung_ab_G"]]
    for prefix in prefixes:
        R = load(prefix)
        K = knock_k(R, s)
        if K is None:
            rows.append([name_of(prefix), s, "kein Umwerfen"])
            continue
        d = R[K - 1][f"s{s}_lp"] - R[K][f"s{s}_lp"]
        x0, z0 = fx(R[K], s, "x"), R[K][f"s{s}_z"]
        fr = [f for f in sorted(R) if f >= K]
        flug = next((f for f in fr[1:] if fx(R[f], s, "x") != fx(R[f - 1], s, "x")), None)
        dxs = sorted({round(fx(R[f], s, "x") - fx(R[f - 1], s, "x"), 5) for f in range(flug, flug + 10)})
        hs = [(f, fx(R[f], s, "h")) for f in fr]
        sch = max(hs, key=lambda q: q[1])
        boden = next((f for f in fr if f > sch[0] and R[f][f"s{s}_ph"] == 4), None)
        ruhe = next((f for f in fr if f > sch[0] and R[f][f"s{s}_ph"] == 8), None)
        g = set()
        for f in range(flug + 2, boden):
            d2 = (fx(R[f], s, "h") - fx(R[f - 1], s, "h")) - (fx(R[f - 1], s, "h") - fx(R[f - 2], s, "h"))
            g.add(round(-d2 * 256, 3))
        v0 = round(fx(R[flug], s, "h") - fx(R[flug - 1], s, "h"), 5)
        pa, G = find_g(R, s, K)
        sts = sorted({R[f][f"s{s}_st"] for f in range(K + 1, G)}) if G else []
        ph = []
        for f in fr:
            if G and f > G:
                break
            v = (R[f][f"s{s}_act"], R[f][f"s{s}_ph"])
            if not ph or ph[-1][1] != v:
                ph.append((f, v))
        p8 = next((f for f, v in ph if v[1] == 8), None)
        aw, at = [], []
        if pa and G:
            prev = R[pa - 1][f"s{s}_anim"]
            for f in range(pa, G + 1):
                an = R[f][f"s{s}_anim"]
                if an != prev:
                    aw.append(f"+{f - pa}:{an:X}")
                prev = an
                if R[f][f"s{s}_attr"]:
                    at.append(f"+{f - pa}:{R[f][f's{s}_attr']:X}")
        rel = lambda v: f"K+{v - K}" if isinstance(v, int) else ""
        rows.append([name_of(prefix), s, K, d, rel(flug), "/".join(f"{v:.5f}" for v in dxs),
                     f"{fx(R[K], s, 'h'):.4f}", v0, "/".join(str(v) for v in sorted(g)), rel(sch[0]), f"{sch[1]:.4f}",
                     rel(boden), f"{abs(fx(R[boden], s, 'x') - x0):.4f}" if boden else "", rel(ruhe),
                     f"{abs(fx(R[ruhe], s, 'x') - x0):.4f}" if ruhe else "", R[ruhe or K][f"s{s}_z"] - z0,
                     "/".join(map(str, sts)), " ".join(f"K+{f - K}:{v[0]:X}/{v[1]:X}" for f, v in ph),
                     (pa - p8) if pa and p8 else "", (G - pa) if G and pa else "", rel(G), (G - K) if G else "",
                     " ".join(aw), " ".join(at), aktionen_ab(R, s, G), erste_x(R, s, G)])
    return rows


def cmd_umwerfen(a):
    emit(rows_umwerfen(a.prefix, a.slot))


def throw_e(prefix, R, s):
    """Wurfeingabe E: der letzte Angriffsdruck vor dem 14-LP-Treffer (Schaden in E+1)."""
    h = next((h for h, d, k in hits(R, s) if d == 14), None)
    return h - 1 if h else None


def rows_wurf(prefixes, s):
    rows = [["lauf", "slot", "E", "schaden_in", "los", "flug_ab", "dx_erster", "dx_abnahme_je_frame", "h_v0",
             "schwerkraft_256", "scheitel", "scheitel_hoehe", "boden", "ruhe", "weg_ab_los", "s4_bis_G",
             "liegen", "aufstehen", "G", "E_bis_G", "aktionen", "aktionen_ab_G", "erste_x_aenderung_ab_G"]]
    for prefix in prefixes:
        R = load(prefix)
        E = throw_e(prefix, R, s)
        fr = [f for f in sorted(R) if f >= E]
        dmg = next((f for f in fr if R[f][f"s{s}_lp"] < R[f - 1][f"s{s}_lp"]), None)
        los = next((f for f in fr if R[f][f"s{s}_act"] == 4), None)
        flug = los + 1
        dxs = [fx(R[f], s, "x") - fx(R[f - 1], s, "x") for f in range(flug, flug + 6)]
        abn = sorted({round(abs(dxs[i]) - abs(dxs[i + 1]), 5) for i in range(len(dxs) - 1)})
        hs = [(f, fx(R[f], s, "h")) for f in fr if f >= flug]
        sch = max(hs, key=lambda q: q[1])
        g = set()
        for f in range(flug + 2, sch[0] + 10):
            d2 = (fx(R[f], s, "h") - fx(R[f - 1], s, "h")) - (fx(R[f - 1], s, "h") - fx(R[f - 2], s, "h"))
            g.add(round(-d2 * 256, 3))
        boden = next((f for f, hh in hs if f > sch[0] and fx(R[f + 1], s, "h") > hh), None)
        ruhe = next((f for f in fr if R[f][f"s{s}_ph"] == 8), None)
        pa, G = find_g(R, s, E)
        sts = sorted({R[f][f"s{s}_st"] for f in range(E + 1, G)}) if G else []
        akt = []
        for f in fr:
            if G and f > G:
                break
            v = R[f][f"s{s}_act"]
            if not akt or akt[-1][1] != v:
                akt.append((f, v))
        rel = lambda v: f"E+{v - E}" if isinstance(v, int) else ""
        rows.append([name_of(prefix), s, E, rel(dmg), rel(los), rel(flug), f"{dxs[0]:+.4f}",
                     "/".join(f"{v:.5f}" for v in abn), f"{fx(R[flug], s, 'h') - fx(R[los], s, 'h'):.4f}",
                     "/".join(str(v) for v in sorted(g)), rel(sch[0]), f"{sch[1]:.4f}", rel(boden), rel(ruhe),
                     f"{fx(R[ruhe], s, 'x') - fx(R[los], s, 'x'):+.4f}" if ruhe else "", "/".join(map(str, sts)),
                     (pa - ruhe) if pa and ruhe else "", (G - pa) if G and pa else "", rel(G),
                     (G - E) if G else "", " ".join(f"E+{f - E}:{v:X}" for f, v in akt),
                     aktionen_ab(R, s, G), erste_x(R, s, G)])
    return rows


def cmd_wurf(a):
    emit(rows_wurf(a.prefix, a.slot))


def ref_point(R, s):
    """Bezugsframe fuer G: K (Umwerfen) oder E+1 (Wurf)."""
    K = knock_k(R, s)
    E = next((h - 1 for h, d, k in hits(R, s) if d == 14), None)
    cands = [v for v in (K, E + 1 if E else None) if v]
    return min(cands) if cands else None


def rows_schlaege(prefixes, s):
    rows = [["lauf", "slot", "bezug", "G", "druck", "stufe", "aktiv_rel_G", "treffer_rel_G", "kein_treffer_rel_G", "dx", "dz", "blick_gegner"]]
    for prefix in prefixes:
        R = load(prefix)
        K = ref_point(R, s)
        pa, G = find_g(R, s, K)
        lpv = {f for f in sorted(R)[1:] if R[f][f"s{s}_lp"] < R[f - 1][f"s{s}_lp"]}
        for P in presses(prefix):
            if P <= K + 5:
                continue
            k, fs = active_frames(R, P)
            tr = [f for f in fs if f in lpv]
            # nach einem Treffer endet das Fenster (Trefferstopp)
            no = [f for f in fs if not tr or f < tr[0]]
            no = [f for f in no if f not in lpv]
            rel = lambda f: f"G{f - G:+d}"
            rows.append([name_of(prefix), s, K, G, P, k, f"{rel(fs[0])}..{rel(fs[-1])}",
                         " ".join(rel(f) for f in tr) or "-", " ".join(rel(f) for f in no) or "-",
                         "/".join(str(R[f][f"s{s}_x"] - R[f]["p_x"]) for f in fs),
                         "/".join(str(R[f][f"s{s}_z"] - R[f]["p_z"]) for f in fs),
                         "/".join("zur Figur" if ((R[f][f"s{s}_face"] & 0x20) != 0) == (R[f][f"s{s}_x"] < R[f]["p_x"]) else "weg"
                                  for f in fs)])
    return rows


def cmd_schlaege(a):
    emit(rows_schlaege(a.prefix, a.slot))


def rows_griff(prefixes, s):
    rows = [["lauf", "slot", "bezug", "G", "griff", "griff_rel_G", "dx_bei_griff", "dz_bei_griff", "laufen_ab_rel_G"]]
    for prefix in prefixes:
        R = load(prefix)
        K = ref_point(R, s)
        pa, G = find_g(R, s, K)
        fr = sorted(R)
        gr = next((f for f in fr if f > K and R[f]["p_halt"] != 0 and R[f - 1]["p_halt"] == 0), None)
        lauf = next((f for f in fr if f > K + 20 and R[f]["p_x"] != R[f - 1]["p_x"] and R[f]["p_halt"] == 0), None)
        rows.append([name_of(prefix), s, K, G, gr or "kein Griff", f"G{gr - G:+d}" if gr and G else "",
                     (R[gr][f"s{s}_x"] - R[gr]["p_x"]) if gr else "", (R[gr][f"s{s}_z"] - R[gr]["p_z"]) if gr else "",
                     f"G{lauf - G:+d}" if lauf and G else ""])
    return rows


def cmd_griff(a):
    emit(rows_griff(a.prefix, a.slot))


# --- Trefferstopp der Figur ----------------------------------------------------
def rows_stopp(prefixes):
    rows = [["lauf", "h", "getroffen", "schaden", "figur_anim_wechsel", "figur_phase4_ab", "figur_ruhe_ab"]]
    for prefix in prefixes:
        R = load(prefix)
        by = {}
        for s in slots_of(R):
            for h, d, k in hits(R, s):
                by.setdefault(h, []).append((s, d))
        for h in sorted(by):
            aw, prev = [], R[h - 1]["p_anim"]
            for f in range(h, min(max(R), h + 30) + 1):
                if R[f]["p_anim"] != prev:
                    aw.append(f"h{f - h:+d}")
                prev = R[f]["p_anim"]
            p4 = next((f"h{f - h:+d}" for f in range(h, min(max(R), h + 30) + 1) if R[f]["p_ph"] == 4), "")
            ru = next((f"h{f - h:+d}" for f in range(h + 1, min(max(R), h + 40) + 1) if R[f]["p_act"] == 0), "")
            rows.append([name_of(prefix), h, " ".join(f"slot {s}" for s, d in by[h]),
                         "/".join(str(d) for s, d in by[h]), " ".join(aw), p4, ru])
    return rows


def cmd_stopp(a):
    emit(rows_stopp(a.prefix))


# --- Tod -----------------------------------------------------------------------
def rows_tod(prefixes, s):
    rows = [["lauf", "slot", "t", "schaden", "art", "lp", "s4_2_ab", "flug_ab", "dx_je_frame", "h_v0", "aktion_4_ab",
             "aktion_6_ab", "aktion_0A_ab", "slot_frei", "t_bis_frei", "ablauf", "gegner_lp_verlust_nach_t",
             "figur_lp_verlust_nach_t", "attr_aktiv_nach_t"]]
    for prefix in prefixes:
        R = load(prefix)
        t = next((f for f in sorted(R) if R[f][f"s{s}_lp"] < 0 and R[f][f"s{s}_st"] != 0), None)
        if t is None:
            rows.append([name_of(prefix), s, "kein Tod"])
            continue
        fr = [f for f in sorted(R) if f >= t]
        d = R[t - 1][f"s{s}_lp"] - R[t][f"s{s}_lp"]
        art = {3: "Stufe 1", 4: "Stufe 2", 5: "Stufe 3", 10: "Tritt", 7: "Sprungangriff", 14: "Wurf"}.get(d, str(d))
        if d == 4 and R[t - 1][f"s{s}_act"] == 2:
            art = "Kniestoss"
        st2 = next((f for f in fr if R[f][f"s{s}_st"] == 2), None)
        if art == "Wurf":  # getragen bis zum Loslassen (Aktion 4), Flug ab dem Frame danach
            flug = next((f + 1 for f in fr if R[f][f"s{s}_act"] == 4), None)
        else:
            flug = next((f for f in fr[1:] if fx(R[f], s, "x") != fx(R[f - 1], s, "x")), None)
        dxs = sorted({round(fx(R[f], s, "x") - fx(R[f - 1], s, "x"), 5) for f in range(flug, flug + 6)}) if flug else []
        v0 = round(fx(R[flug], s, "h") - fx(R[flug - 1], s, "h"), 5) if flug else ""
        a4 = next((f for f in fr if f > (flug or t) + 5 and R[f][f"s{s}_act"] == 4), None)
        a6 = next((f for f in fr if f > t and R[f][f"s{s}_act"] == 6), None)
        a0a = next((f for f in fr if f > t and R[f][f"s{s}_act"] == 0x0A), None)
        frei = next((f for f in fr if R[f][f"s{s}_st"] == 0), None)
        ab = []
        for f in fr:
            v = (R[f][f"s{s}_st"], R[f][f"s{s}_act"])
            if not ab or ab[-1][1] != v:
                ab.append((f, v))
            if v[0] == 0:
                break
        bis = frei or max(R)
        glp = [f for f in range(t + 1, bis + 1) if R[f][f"s{s}_lp"] < R[f - 1][f"s{s}_lp"]]
        plp = [f for f in range(t + 1, bis + 1) if R[f]["p_lp"] < R[f - 1]["p_lp"]]
        at = [f for f in range(t + 1, bis + 1) if R[f][f"s{s}_attr"] not in (0, 0xFF00)]
        rel = lambda v: f"t+{v - t}" if isinstance(v, int) else ""
        rng = lambda L: (f"t+{L[0] - t}..t+{L[-1] - t} ({R[L[0]][f's{s}_attr']:X})" if L else "keins")
        rows.append([name_of(prefix), s, t, d, art, R[t][f"s{s}_lp"], rel(st2), rel(flug), "/".join(f"{v:.5f}" for v in dxs), v0,
                     rel(a4), rel(a6), rel(a0a), rel(frei), (frei - t) if frei else f"> {max(R) - t}",
                     " ".join(f"t+{f - t}:{v[0]}/{v[1]:X}" for f, v in ab),
                     " ".join(rel(f) for f in glp) or "keiner", " ".join(rel(f) for f in plp) or "keiner", rng(at)])
    return rows


def cmd_tod(a):
    emit(rows_tod(a.prefix, a.slot))


def rows_todprobe(prefixes, s):
    """Schlaege der Figur nach dem Tod: aktive Frames relativ zu t mit dx, dz."""
    rows = [["lauf", "slot", "t", "druck", "stufe", "aktiv_rel_t", "dx", "dz", "hoehe_gegner", "s4_gegner", "gegner_lp_verlust"]]
    for prefix in prefixes:
        R = load(prefix)
        t = next((f for f in sorted(R) if R[f][f"s{s}_lp"] < 0 and R[f][f"s{s}_st"] != 0), None)
        for P in presses(prefix):
            if P <= t:
                continue
            k, fs = active_frames(R, P)
            lpv = [f for f in fs if R[f][f"s{s}_lp"] < R[f - 1][f"s{s}_lp"]]
            rows.append([name_of(prefix), s, t, P, k, f"t+{fs[0] - t}..t+{fs[-1] - t}",
                         "/".join(str(R[f][f"s{s}_x"] - R[f]["p_x"]) for f in fs),
                         "/".join(str(R[f][f"s{s}_z"] - R[f]["p_z"]) for f in fs),
                         "/".join(str(R[f][f"s{s}_h"]) for f in fs),
                         "/".join(str(R[f][f"s{s}_st"]) for f in fs), " ".join(map(str, lpv)) or "keiner"])
    return rows


def cmd_probe(args):
    for prefix in args.prefix:
        R = load(prefix)
        s = args.slot
        rng = [f for f in range(args.von, args.bis + 1) if f in R and f - 1 in R]
        lpv = [f for f in rng if R[f][f"s{s}_lp"] < R[f - 1][f"s{s}_lp"]]
        pv = [f for f in rng if R[f]["p_lp"] < R[f - 1]["p_lp"]]
        at = [f for f in rng if R[f][f"s{s}_attr"] not in (0, 0xFF00)]
        print(f"{name_of(prefix)},slot {s},{args.von}-{args.bis},gegner_lp_verlust {' '.join(map(str, lpv)) or 'keiner'},"
              f"figur_lp_verlust {' '.join(map(str, pv)) or 'keiner'},attr_aktiv {' '.join(map(str, at)) or 'keins'}")


# --- belege --------------------------------------------------------------------
# Laeufe aus belege_reaktion.sh (Teil reaktion_v): Name ohne Vorsatz -> Slot.
# _w = WOOKY (anlauf, anlauf_b; Slot 18), _e = EDDY (anlauf_c; Slot 17).
A_W = ["a_w_geh", "a_w_stand", "a_w_aus", "a_w_kette", "a_w_neu", "a_w_frueh", "a_w_spaet", "a_w_links",
       "k_w_19", "k_w_20"]
A_E = ["a_e_geh", "a_e_stand", "a_e_aus", "a_e_kette", "a_e_neu", "a_e_frueh", "a_e_spaet", "a_e_links",
       "k_e_20", "k_e_s3_19"]
C = ["c_zwei_a", "c_zwei_b", "c_kette_a", "c_kette_b", "c_fenster27", "c_fenster28"]
B_W = ["b_tritt_w", "b_sprung_w", "b_sprungr_w", "b_knie_w", "b_knie_wb"]
B_E = ["a_e_kette", "a_e_spaet", "a_e_frueh", "b_sprung_e", "b_sprungr_e", "b_knie_e"]
WURF = [("b_wurf_w", 18), ("b_wurf_wr", 18), ("b_wurf_e", 17), ("b_wurf_er", 17)]
BP = [("bp_w1", 18), ("bp_w2", 18), ("bp_tritt_e1", 17), ("bp_tritt_e2", 17), ("bp_wurf_e3", 17),
      ("bp_wurf_e4", 17), ("bp_wurf_e6", 17), ("bp_wurf_e1", 17), ("bp_wurf_w1", 18)]
BG = [("bg_w1", 18), ("bg_w2", 18), ("bg_wknie", 18), ("bg_ewurf1", 17), ("bg_ewurf2", 17)]
D = [("d_s1_w", 18), ("d_gleich_w", 18), ("d_s2_w", 18), ("d_s2_wb", 18), ("d_sprung_w", 18), ("a_w_frueh", 18),
     ("a_w_spaet", 18), ("d_probe_w1", 18), ("d_wurf_w", 18), ("d_s1_e", 17), ("d_s2_e", 17), ("d_s3_e", 17),
     ("d_tritt_e", 17)]
DP = [("d_s1_w_pa", 18), ("d_probe_w1", 18), ("d_probe_w2", 18)]


def cmd_belege(args):
    raw = args.raw
    p = lambda n: os.path.join(raw, "reaktion_v_" + n)
    alle = sorted({n for n in A_W + A_E + C + B_W + B_E + [n for n, _ in WURF + BP + BG + D + DP] + ["d_gleich_ref"]})
    out = sys.stdout
    print("# Gegenpruefung Trefferreaktion der Gegner (Praefix reaktion_v), erzeugt von scripts/belege_reaktion.sh")
    print("# (Teil reaktion_v) mit scenarios/reaktion_v_frei.lua und scripts/messen_reaktion_v.py belege.")
    print("# Laeufe reaktion_v_*: _w = WOOKY (Savestates anlauf, anlauf_b; 16 LP, Slot 18), _e = EDDY (anlauf_c;")
    print("# 30 LP, Slot 17), c_* zusaetzlich WOOKY Slot 16 (anlauf_c, ohne Eingriff). Einziger EINGRIFF: b_tritt_w")
    print("# (CC_LP=18:35, LP/Vorframe-LP/Max-LP des WOOKY auf 35, damit er den Tritt ueberlebt). Rang nie veraendert.")
    print("# h = LP-Verlust, K = umwerfender Treffer, E = Wurfeingabe, G = erster Frame nach dem Aufstehen, t = LP < 0.")
    print("# A: Trefferreaktion ohne Umwerfen (WOOKY Slot 18)")
    emit(rows_reaktion([p(n) for n in A_W], 18), out)
    print("# A: Trefferreaktion ohne Umwerfen (EDDY Slot 17)")
    emit(rows_reaktion([p(n) for n in A_E], 17), out)
    print("# C: Trefferreaktion bei zwei Gegnern in einem Schlag (Slot 16 WOOKY, Slot 17 EDDY)")
    emit(rows_reaktion([p(n) for n in C], 16), out)
    emit(rows_reaktion([p(n) for n in C], 17)[1:], out)
    print("# C: Trefferstopp der Figur (zwei Gegner) und Vergleich mit einem Gegner (a_e_stand, a_e_kette, a_w_kette)")
    emit(rows_stopp([p(n) for n in C + ["a_e_stand", "a_e_kette", "a_w_kette"]]), out)
    print("# B: Umwerfen durch Tritt, Sprungangriff (neutral, Richtung) und dritten Kniestoss")
    emit(rows_umwerfen([p(n) for n in B_W], 18), out)
    emit(rows_umwerfen([p(n) for n in B_E], 17)[1:], out)
    print("# B: Wurf (vorwaerts und rueckwaerts)")
    rw = rows_wurf([p(n) for n, s in WURF if s == 18], 18)
    emit(rw + rows_wurf([p(n) for n, s in WURF if s == 17], 17)[1:], out)
    print("# B: Schlaege der Figur um G (Verwundbarkeit; Fenster = aktive Frames P+2..P+5, nach einem Treffer endet es)")
    rows = [rows_schlaege([p(n)], s) for n, s in BP]
    emit([rows[0][0]] + [r for rr in rows for r in rr[1:]], out)
    print("# B: Griff am liegenden Gegner (Figur laeuft vorher los)")
    rows = [rows_griff([p(n)], s) for n, s in BG]
    emit([rows[0][0]] + [r for rr in rows for r in rr[1:]], out)
    print("# D: Tod (t = erster Frame mit LP < 0)")
    rows = [rows_tod([p(n)], s) for n, s in D]
    emit([rows[0][0]] + [r for rr in rows for r in rr[1:]], out)
    print("# D: Schlaege der Figur auf den sterbenden Gegner")
    rows = [rows_todprobe([p(n)], s) for n, s in DP]
    emit([rows[0][0]] + [r for rr in rows for r in rr[1:]], out)
    print("# D: Gleichzeitig-Fall: d_gleich_ref ohne letzten Druck (erster aktiver Frame des WOOKY), d_gleich_w mit Druck 169")
    for n in ("d_gleich_ref", "d_gleich_w"):
        R = load(p(n))
        for f in range(168, 175):
            r = R[f]
            print(f"{n},{f},attr {r['s18_attr']:X},anim {r['s18_anim']:X},lp_wooky {r['s18_lp']},lp_figur {r['p_lp']},s4_wooky {r['s18_st']}")
    print("# Alle LP-Verluste (Gegner und Figur) je Lauf")
    emit(rows_treffer([p(n) for n in alle]), out)
    print("# Rang (FFF82A) je Lauf")
    for n in alle:
        R = load(p(n))
        print(f"{n},{'/'.join(str(v) for v in sorted({r['rang'] for r in R.values()}))}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name, fn, hilfe, slot=False, multi=True):
        q = sub.add_parser(name, help=hilfe)
        q.add_argument("prefix", nargs="+" if multi else None)
        if slot:
            q.add_argument("--slot", type=int, required=True)
        q.set_defaults(fn=fn)
        return q

    add("treffer", cmd_treffer, "alle LP-Verluste der Gegner und der Figur")
    q = add("zeitachse", cmd_zeitachse, "Aenderungen ausgewaehlter Felder eines Slots", slot=True, multi=False)
    q.add_argument("--felder", default="st,act,ph,anim,x,attr,lp")
    q.add_argument("--von", type=int, default=1)
    q.add_argument("--bis", type=int, default=10**9)
    q.add_argument("--ref", type=int, default=0, help="Bezugsframe fuer relative Angaben")
    q.add_argument("--alle", action="store_true", help="jeden Frame ausgeben")
    add("reaktion", cmd_reaktion, "Auswertung jeder Trefferreaktion eines Slots", slot=True)
    add("umwerfen", cmd_umwerfen, "Flug, Liegen, Aufstehen nach einem umwerfenden Treffer", slot=True)
    add("wurf", cmd_wurf, "Flug, Liegen, Aufstehen nach einem Wurf", slot=True)
    add("tod", cmd_tod, "Ablauf ab LP unter 0 bis zum freien Slot", slot=True)
    q = add("probe", cmd_probe, "LP-Verluste und aktive Attribute in einem Bereich", slot=True)
    q.add_argument("--von", type=int, required=True)
    q.add_argument("--bis", type=int, required=True)
    add("schlaege", cmd_schlaege, "aktive Frames der Schlaege der Figur relativ zu G", slot=True)
    add("griff", cmd_griff, "Griff-Frame relativ zu G", slot=True)
    add("stopp", cmd_stopp, "Animationswechsel der Figur nach jedem Treffer")
    q = sub.add_parser("belege", help="alle Laeufe des Teils reaktion_v auswerten (CSV auf stdout)")
    q.add_argument("--raw", default="logs/raw")
    q.set_defaults(fn=cmd_belege)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
