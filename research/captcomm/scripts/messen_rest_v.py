#!/usr/bin/env python3
"""Gegenpruefung "Rest der Spielfigur" (Agent V8, Praefix rest_v).

Liest nur die Watch-Protokolle von scenarios/rest_v_frei.lua
(logs/raw/<lauf>_watch.csv, <lauf>_inputs.csv) und die Bot-Protokolle von
scenarios/rest_v_bot.lua (logs/raw/<lauf>_bot.csv), kein RAM-Abzug. Nur
Standardbibliothek. Bezugsframes: D Kettendruck, h LP-Verlust des Gegners,
J Sprungdruck, A Angriffsdruck im Sprung, t LP der Figur unter 0,
E Erscheinen nach dem Neueinstieg (Hoehe >= 200), L Landung (erster Frame
der Landephase: Aktion 0x0A, Unterphase 2).
"""
import argparse
import csv
import glob
import os
import re
import sys

RAW = os.environ.get("REST_V_RAW") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs", "raw")
TASTE = {"P1 Button 1": "a", "P1 Button 2": "j", "P1 Left": "l", "P1 Right": "r", "P1 Up": "u", "P1 Down": "d"}
TYPEN = {0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK", 0x46DA4: "DOLG"}
# Startanimation der Kettenstufen (Animationszeiger der Figur P+0x1C)
START_ANIM = {0x0B2EC4: 1, 0x0B32B2: 2, 0x0B35DE: 3, 0x0B3EE8: 4}
# Gegnerslot je Gruppe im Laufnamen: e EDDY (anlauf_c, tiefe_b), t EDDY (tiefe_b), w WOOKY (anlauf, anlauf_b)
SLOT = {"e": 17, "t": 17, "w": 18}


# ---------------------------------------------------------------------------
# Grundfunktionen
def lade(lauf):
    """Watch-CSV eines Laufs als Liste von Dicts (Ganzzahlen)."""
    pfad = lauf if lauf.endswith(".csv") else os.path.join(RAW, lauf + "_watch.csv")
    with open(pfad, newline="") as f:
        r = csv.reader(f)
        kopf = next(r)
        return [{k: int(v) for k, v in zip(kopf, z) if v != ""} for z in r]


def eingaben(lauf):
    """frame -> Menge der gedrueckten Tasten (aus <lauf>_inputs.csv)."""
    erg = {}
    with open(os.path.join(RAW, lauf + "_inputs.csv"), newline="") as f:
        for z in csv.DictReader(f):
            erg[int(z["frame"])] = set(TASTE.get(t, t) for t in z["inputs"].split("|") if t)
    return erg


def laeufe(muster):
    """Laufnamen zu einem Glob-Muster ueber die Watch-CSVs, natuerlich sortiert."""
    namen = [os.path.basename(p)[:-len("_watch.csv")] for p in glob.glob(os.path.join(RAW, muster + "_watch.csv"))]
    return sorted(namen, key=lambda n: [(0, int(x), "") if x.isdigit() else (1, 0, x) for x in re.split(r"(\d+)", n)])


def slots_von(zeilen):
    return sorted({int(k[1:].split("_")[0]) for k in zeilen[0] if k.startswith("s") and k.endswith("_st")})


def lp_verluste(zeilen, slot=None):
    """Frames, in denen die LP (Figur bzw. Slot) sinken: [(frame, vorher, nachher)]."""
    key = "f_lp" if slot is None else "s%d_lp" % slot
    return [(b["frame"], a[key], b[key]) for a, b in zip(zeilen, zeilen[1:]) if b[key] < a[key]]


def treffer_alle(zeilen):
    """Alle LP-Verluste aller protokollierten Slots: [(frame, slot, vorher, nachher)]."""
    return sorted((f, n, a, b) for n in slots_von(zeilen) for f, a, b in lp_verluste(zeilen, n))


def druecke(ein, taste):
    """Frames, in denen die Taste neu gedrueckt ist (Flanke)."""
    return [f for f in sorted(ein) if taste in ein[f] and taste not in ein.get(f - 1, ())]


def halten(ein, taste):
    """(erster, letzter) Frame, in dem die Taste gedrueckt ist, oder None."""
    fs = [f for f in sorted(ein) if taste in ein[f]]
    return (fs[0], fs[-1]) if fs else None


def angreifer_slot(wort):
    """Slot aus dem Zeigerwort P+0x82 (zeigt auf S+4 des Angreifers)."""
    adr = 0xFF0000 + wort - 4
    if 0xFFBC90 <= adr < 0xFFBC90 + 60 * 0xC0 and (adr - 0xFFBC90) % 0xC0 == 0:
        return (adr - 0xFFBC90) // 0xC0
    return None


def ist_angriff(att):
    """Trefferattribut eines Gegnerangriffs (0x400C, 0x440C, 0x4C0C, SKIP 0x84xx/0x8Axx/0x8C00);
    0x0100 (Gehen) und 0xFF00 (nach dem Aufstehen) zaehlen nicht."""
    return att != 0xFF00 and (att & 0xC000) != 0


def angriffsbeginne(z, slots, von, bis):
    """Beginn aktiver Angriffsphasen: [(frame, slot, attribut, dx, dz)]."""
    zf = {r["frame"]: r for r in z}
    erg = []
    for n in slots:
        p = "s%d_" % n
        for f in range(max(von, min(zf) + 1), min(bis, max(zf)) + 1):
            if ist_angriff(zf[f][p + "att"]) and not ist_angriff(zf[f - 1][p + "att"]) and zf[f][p + "st"] in (1, 3):
                erg.append((f, n, zf[f][p + "att"], zf[f][p + "x"] - zf[f]["f_x"], zf[f][p + "z"] - zf[f]["f_z"]))
    return sorted(erg)


def rel(x, b):
    return "" if x is None or b is None else "%+d" % (x - b)


def schreibe(out, kopf, zeilen):
    w = csv.writer(out, lineterminator="\n")
    w.writerow(kopf)
    for z in zeilen:
        w.writerow(["" if v is None else v for v in z])


# ---------------------------------------------------------------------------
# Teil A: Nachlauf der Kettenstufen 2-4
KOPF_A = ["lauf", "stufe", "bezug", "probe", "Q", "wirkung", "neue_stufe", "akt10_bis", "ruhe_ab", "akt0_ab",
          "h_rel_D", "treffer_rel_D_je_stufe", "schaden_nach_D"]


def analyse_a(lauf):
    """Kette bis Stufe k (die ersten k Angriffsdruecke), danach eine Probe: weiterer
    Angriffsdruck, Sprungdruck oder gehaltene Richtung. Bezug h (Stufe 2, 3 mit
    Treffer) bzw. D (Stufe 4 und Leerschlag)."""
    k = int(lauf.split("_s")[1][0])
    slot = SLOT[lauf.split("_")[3]]
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    letzte = max(zf)
    ein = eingaben(lauf)
    ad, jd = druecke(ein, "a"), druecke(ein, "j")
    kette = ad[:k]
    D = kette[-1]
    lpv = lp_verluste(z, slot)
    hits = []
    for i, d in enumerate(kette):
        grenze = kette[i + 1] if i + 1 < len(kette) else 10 ** 9
        hs = [f for f, a, b in lpv if d < f < grenze]
        hits.append(hs[0] if hs else None)
    h = hits[-1]
    bezug, bn = (h, "h") if (h and k < 4) else (D, "D")
    f = D + 1
    while f in zf and zf[f]["f_akt"] == 0x10:
        f += 1
    akt10_bis = f - 1
    ruhe = next((g for g in range(D + 1, letzte + 1) if zf[g]["f_akt"] == 0), None)
    probe, Q = "o", None
    if len(ad) > k:
        probe, Q = "a", ad[k]
    elif jd:
        probe, Q = "j", jd[0]
    else:
        for t in "lrud":
            hh = halten(ein, t)
            if hh:
                probe, Q = "h" + t, hh[0]
    wirkung = neue = akt0 = None
    if probe == "a":
        wirkung = next((g for g in range(Q, letzte + 1)
                        if zf[g]["f_anim"] in START_ANIM and zf[g - 1]["f_anim"] != zf[g]["f_anim"]), None)
        neue = START_ANIM[zf[wirkung]["f_anim"]] if wirkung else None
    elif probe == "j":
        wirkung = next((g for g in range(Q, letzte + 1) if zf[g]["f_akt"] == 0x0A), None)
    elif probe != "o":
        achse = "f_z" if probe in ("hu", "hd") else "f_x"
        wirkung = next((g for g in range(Q + 1, letzte + 1) if zf[g][achse] != zf[g - 1][achse]), None)
        akt0 = next((g for g in range(Q, letzte + 1) if zf[g]["f_akt"] == 0), None)
    return [lauf, k, bn, probe, rel(Q, bezug), rel(wirkung, bezug), neue, rel(akt10_bis, bezug), rel(ruhe, bezug),
            rel(akt0, bezug), (h - D) if h else None,
            "/".join("" if x is None else str(x - kette[i]) for i, x in enumerate(hits)),
            "/".join([str(a - b) for f, a, b in lpv if f > D][:2])]


# ---------------------------------------------------------------------------
# Teil B: Sprungangriff hoch und runter
KOPF_B = ["lauf", "A_rel_J", "m", "fig_h_F", "dx_F", "dz_F", "blick_fig_gegner_F", "treffer_rel_A", "schaden",
          "umgeworfen", "fig_h_treffer", "dx_treffer", "dz_treffer", "akt0E_bis_rel_A", "akt0A_ab_rel_A", "ende_rel_J"]


def analyse_b(lauf):
    """Probe: rest_v_b_<g>_<v><A-J>_<m>_<dx>_<dz>_<seite> (F = A+m) bzw. natuerlich rest_v_b_nat_<g>_<art>."""
    teile = lauf.split("_")
    g = teile[4] if teile[3] == "nat" else teile[3]
    slot = SLOT[g]
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    letzte = max(zf)
    ein = eingaben(lauf)
    J, A = druecke(ein, "j")[0], druecke(ein, "a")[0]
    m = int(teile[5]) if teile[3] != "nat" else None
    F = A + m if m is not None else None
    p = "s%d_" % slot
    zeile = [lauf, A - J, m]
    if F:
        r = zf[F]
        zeile += [r["f_h"], r[p + "x"] - r["f_x"], r[p + "z"] - r["f_z"], "%x/%x" % (r["f_blick"], r[p + "blick"])]
    else:
        zeile += [None] * 4
    lpv = [x for x in lp_verluste(z, slot) if x[0] > A]
    if lpv:
        f, v, b = lpv[0]
        r = zf[f]
        kd = any(zf[g2][p + "akt"] == 0x0C for g2 in range(f, min(f + 4, letzte + 1)))
        zeile += [f - A, v - b, "ja" if kd else "nein", r["f_h"], r[p + "x"] - r["f_x"], r[p + "z"] - r["f_z"]]
    else:
        zeile += [None] * 6
    e_bis, g2 = None, A + 1
    while g2 <= letzte and zf[g2]["f_akt"] == 0x0E:
        e_bis, g2 = g2, g2 + 1
    fall = g2 if g2 <= letzte and zf[g2]["f_akt"] == 0x0A else None
    ende = next((g3 - 1 for g3 in range(J + 1, letzte + 1) if zf[g3]["f_akt"] == 0), None)
    zeile += [rel(e_bis, A), rel(fall, A), rel(ende, J)]
    return zeile


# ---------------------------------------------------------------------------
# Teil C: Gegner mit genau 0 LP
KOPF_C = ["lauf", "lp_verluste_gegner", "z0", "frei_ab_rel_z0", "status3_bis_rel_z0", "umgeworfen",
          "lp_bis_t", "figur_lp_verluste_durch_ihn_rel_z0", "angriffsbeginne_rel_z0", "t", "slot_frei_rel_t", "aktion_t+2"]


def analyse_c(lauf):
    slot = SLOT[lauf.split("_")[3]]
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    letzte = max(zf)
    p = "s%d_" % slot
    lpv = lp_verluste(z, slot)
    z0 = next((f for f, a, b in lpv if b == 0 and a > 0), None)
    t = next((f for f, a, b in lpv if b < 0), None)
    zeile = [lauf, " ".join("%d:%d>%d" % x for x in lpv), z0]
    if z0:
        g = z0
        while g + 1 in zf and zf[g + 1][p + "st"] != 1:
            g += 1
        st3 = max((h for h in range(z0, g + 1) if zf[h][p + "st"] == 3), default=z0 - 1)
        kd = any(zf[h][p + "akt"] == 0x0C for h in range(z0, g + 1))
        ende = t if t else letzte
        verl = ["%d:-%d" % (f - z0, a - b) for f, a, b in lp_verluste(z)
                if z0 < f <= ende and angreifer_slot(zf[f]["f_angr"]) == slot]
        angr = ["%d" % (f - z0) for f, n, *_ in angriffsbeginne(z, [slot], z0 + 1, ende)]
        zeile += [g + 1 - z0, st3 - z0, "ja" if kd else "nein",
                  "/".join(str(v) for v in sorted({zf[h][p + "lp"] for h in range(z0, ende)})),
                  " ".join(verl), " ".join(angr)]
    else:
        zeile += [None] * 6
    if t:
        frei = next((h for h in range(t, letzte + 1) if zf[h][p + "st"] == 0), None)
        zeile += [t, (frei - t) if frei else None, "%x" % zf[t + 2][p + "akt"] if t + 2 in zf else None]
    else:
        zeile += [None] * 3
    return zeile


# ---------------------------------------------------------------------------
# Teil D: Tod und Neueinstieg der Figur
def analyse_d(lauf):
    """Liste von (feld, wert) je Lauf."""
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    letzte = max(zf)
    ein = eingaben(lauf)
    slots = slots_von(z)
    e = []
    tode = [b["frame"] for a, b in zip(z, z[1:]) if b["f_lp"] < 0 <= a["f_lp"]]
    e.append(("tode", " ".join(map(str, tode))))
    if not tode:
        return e
    t = tode[0]
    e.append(("toetender_angreifer", "s%s" % angreifer_slot(zf[t]["f_angr"])))
    folge, last = [], None
    for f in range(t, min(t + 130, letzte) + 1):
        if zf[f]["f_akt"] != last:
            last = zf[f]["f_akt"]
            folge.append("%d:%x" % (f - t, last))
    e.append(("aktionen_rel_t", " ".join(folge)))
    e.append(("bodenkontakt_rel_t", next((f - t for f in range(t + 3, letzte + 1) if zf[f]["f_h"] <= 0 < zf[f - 1]["f_h"]), None)))
    N = next((f for f in range(t + 1, letzte + 1) if zf[f]["f_lp"] == 72 and zf[f - 1]["f_lp"] != 72), None)
    e.append(("neueinstieg_rel_t", (N - t) if N else None))
    if N:
        e.append(("lp_leben_rang_in_N", "LP %d>%d, Leben %d>%d, Rang %d>%d" % (
            zf[N - 1]["f_lp"], zf[N]["f_lp"], zf[N - 1]["leben"], zf[N]["leben"], zf[N - 1]["rang"], zf[N]["rang"])))
    e.append(("leben_start", z[0]["leben"]))
    e.append(("rangwechsel_rel_t", " ".join("%d:%d>%d" % (f - t, zf[f - 1]["rang"], zf[f]["rang"])
                                             for f in range(t, min(t + 200, letzte) + 1) if zf[f]["rang"] != zf[f - 1]["rang"])))
    E = next((f for f in range(t + 1, letzte + 1) if zf[f]["f_h"] >= 200), None)
    e.append(("erscheinen_rel_t", (E - t) if E else None))
    if E is None:
        return e
    r = zf[E]
    e.append(("lage_E", "x-kx %d, z-ky %d, h %d, blick %x (kx %d, ky %d)" % (
        r["f_x"] - r["kx"], r["f_z"] - r["ky"], r["f_h"], r["f_blick"], r["kx"], r["ky"])))
    e.append(("gegneraktionen_t+1_bis_E", "/".join(sorted({"%x" % zf[f]["s%d_akt" % n] for n in slots for f in range(t + 1, E + 1)
                                                         if zf[f]["s%d_st" % n] in (1, 3) and zf[f]["s%d_s5" % n] == 1}))))
    e.append(("gegnerangriffe_t+1_bis_E", " ".join("%d:s%d" % (f - t, n) for f, n, *_ in angriffsbeginne(z, slots, t + 1, E))))
    L = next((f for f in range(E + 1, letzte + 1) if zf[f]["f_akt"] == 0x0A and zf[f]["f_ph"] == 2), None)
    e.append(("L_rel_E", (L - E) if L else None))
    e.append(("L_rel_t", (L - t) if L else None))
    if L is None:
        return e
    e.append(("hoehe_in_L", zf[L]["f_h"]))
    e.append(("stand_ab_rel_L", next((f - L for f in range(L, letzte + 1) if zf[f]["f_akt"] == 0), None)))
    bis = E
    while bis + 1 <= letzte and zf[bis + 1]["f_st"] == 3:
        bis += 1
    e.append(("status3_von_bis_rel_L", "%d..%d%s" % (E - L, bis - L, " (Laufende)" if bis == letzte else "")))
    t200 = next((f for f in range(t, letzte + 1) if zf[f]["t69"] == 200), None)
    e.append(("t69_200_ab_rel_L", rel(t200, L)))
    e.append(("t69_erste_abnahme_rel_L", next((f - L for f in range(L, letzte + 1) if zf[f]["t69"] < zf[f - 1]["t69"]), None)))
    e.append(("t69_null_rel_L", next((f - L for f in range(L, letzte + 1) if zf[f]["t69"] == 0), None)))
    gl = []
    for n in slots:
        p = "s%d_" % n
        if zf[L - 1][p + "st"] == 0:
            continue
        kd = any(zf[f][p + "akt"] == 0x0C for f in range(L, min(L + 3, letzte) + 1))
        gl.append("s%d %s st%d s5=%d lp %d>%d %s dx %d dz %d" % (
            n, TYPEN.get(zf[L][p + "typ"], hex(zf[L][p + "typ"])), zf[L - 1][p + "st"], zf[L - 1][p + "s5"],
            zf[L - 1][p + "lp"], zf[L][p + "lp"], "umgeworfen" if kd else "-", zf[L][p + "x"] - zf[L]["f_x"],
            zf[L][p + "z"] - zf[L]["f_z"]))
    e.append(("gegner_in_L", "; ".join(gl)))
    e.append(("gegnerangriffe_E_bis_L+200_rel_L", " ".join("%d:s%d:dx%d/dz%d" % (f - L, n, dx, dz)
                                                           for f, n, a, dx, dz in angriffsbeginne(z, slots, E, L + 200))))
    e.append(("lp_verluste_figur_nach_E_rel_L", " ".join(str(f - L) for f, a, b in lp_verluste(z) if f > E)))
    ad = [f for f in druecke(ein, "a") if f > E]
    jd = [f for f in druecke(ein, "j") if f > E]
    if ad:
        e.append(("angriffsdruck_rel_L", " ".join(str(f - L) for f in ad)))
        e.append(("schlag_ab_rel_L", next((f - L for f in range(E, letzte + 1) if zf[f]["f_akt"] == 0x10), None)))
    if jd:
        e.append(("sprungdruck_rel_L", " ".join(str(f - L) for f in jd)))
        e.append(("absprung_ab_rel_L", next((f - L for f in range(L + 1, letzte + 1) if zf[f]["f_h"] > 0), None)))
    for tt, ach in (("r", "f_x"), ("l", "f_x"), ("u", "f_z"), ("d", "f_z")):
        hh = halten(ein, tt)
        if hh and hh[1] > E:
            e.append(("halten_%s_rel_L" % tt, "%d..%d" % (hh[0] - L, hh[1] - L)))
            e.append(("bewegung_%s_ab_rel_L" % tt, next((f - L for f in range(max(hh[0], E) + 1, letzte + 1)
                                                         if zf[f][ach] != zf[f - 1][ach]), None)))
    if len(tode) > 1:
        t2 = tode[1]
        e.append(("t2_neueinstieg", "ja" if any(zf[f]["f_h"] >= 200 for f in range(t2 + 1, letzte + 1)) else "nein"))
        e.append(("t2_rangwechsel_rel_t2", " ".join("%d:%d>%d" % (f - t2, zf[f - 1]["rang"], zf[f]["rang"])
                                                    for f in range(t2, letzte + 1) if zf[f]["rang"] != zf[f - 1]["rang"])))
        e.append(("t2_leben", "%d>%d" % (zf[t2]["leben"], z[-1]["leben"])))
    return e


# ---------------------------------------------------------------------------
# Teil E: Rang beim Stage-Wechsel
KOPF_E = ["lauf", "frame", "stage", "rang", "rangzaehler", "kamera_x_vorher"]


def analyse_e(lauf):
    """Wechsel von Stage-Index und Rang (Bot-Protokoll <lauf>_bot.csv oder Watch-CSV)."""
    bot = os.path.join(RAW, lauf + "_bot.csv")
    if os.path.exists(bot):
        with open(bot, newline="") as f:
            z = [{"frame": int(r["frame"]), "stage": int(r["stage"]), "rang": int(r["rang"]), "rz": int(r["rz"]),
                  "kx": int(r["camx"])} for r in csv.DictReader(f)]
    else:
        z = lade(lauf)
    zeilen = [[lauf, z[0]["frame"], z[0]["stage"], z[0]["rang"], z[0]["rz"], z[0]["kx"]]]
    for a, b in zip(z, z[1:]):
        if a["stage"] != b["stage"] or a["rang"] != b["rang"]:
            zeilen.append([lauf, b["frame"], "%d>%d" % (a["stage"], b["stage"]), "%d>%d" % (a["rang"], b["rang"]),
                           "%d>%d" % (a["rz"], b["rz"]), a["kx"]])
    return zeilen


# ---------------------------------------------------------------------------
# Teil F: Nachpruefungen
KOPF_F_PROBE = ["lauf", "treffer(frame:schaden:dx:dz:fig_h:blick_fig/gegner:kombo)", "dx_bei_naehe(min..max)"]


def analyse_probe(lauf):
    """Proben mit gesetztem Gegner (f1, f1b, f2, f2j): LP-Verluste des Slots mit Lage am Frame-Ende."""
    slot = SLOT[lauf.split("_")[3]]
    z = lade(lauf)
    p = "s%d_" % slot
    zf = {r["frame"]: r for r in z}
    tr = []
    for f, v, b in lp_verluste(z, slot):
        r = zf[f]
        tr.append("%d:%d:%d:%d:%d:%x/%x:%d" % (f, v - b, r[p + "x"] - r["f_x"], r[p + "z"] - r["f_z"], r["f_h"],
                                              r["f_blick"], r[p + "blick"], r["kombo"]))
    nah = [r[p + "x"] - r["f_x"] for r in z if r["frame"] > 2 and abs(r[p + "x"] - r["f_x"]) < 150]
    return [lauf, " ".join(tr), ("%d..%d" % (min(nah), max(nah))) if nah else ""]


KOPF_F3 = ["lauf", "stufe", "richtung", "x_schritte_D+1..D+6", "blick_D/D+1", "treffer(rel_D:schaden:kombo:dx)",
           "folgedruck_rel_D", "folge_wirkung_rel_D", "folge_stufe_oder_treffer"]


def analyse_f3(lauf):
    teile = lauf.split("_")
    slot = SLOT[teile[3]]
    k = int(teile[4][1])
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    letzte = max(zf)
    ein = eingaben(lauf)
    ad = druecke(ein, "a")
    D = ad[k - 1]
    richtung = "".join(t for t in "lrud" if t in ein.get(D, ()))
    p = "s%d_" % slot
    schritte = " ".join("%+d" % (zf[D + i]["f_x"] - zf[D + i - 1]["f_x"]) for i in range(1, 7))
    tr = ["%d:%d:%d:%d" % (f - D, a - b, zf[f]["kombo"], zf[f][p + "x"] - zf[f]["f_x"]) for f, a, b in lp_verluste(z, slot) if f > D]
    Q = w = folge = None
    if len(ad) > k:
        Q = ad[k]
        w = next((g for g in range(Q, letzte + 1) if zf[g]["f_anim"] in START_ANIM and zf[g - 1]["f_anim"] != zf[g]["f_anim"]), None)
        if w:
            folge = "Stufe %d" % START_ANIM[zf[w]["f_anim"]]
        else:
            nach = [x for x in tr if int(x.split(":")[0]) > Q - D]
            folge = "Treffer " + nach[0] if nach else "nichts"
    return [lauf, k, richtung, schritte, "%x/%x" % (zf[D]["f_blick"], zf[D + 1]["f_blick"]), " ".join(tr),
            rel(Q, D), rel(w, D), folge]


KOPF_F3A = ["lauf", "stufe", "probeframe_rel_D", "treffer_rel_D", "schaden", "dx"]


def analyse_f3a(lauf):
    k, m = int(lauf.split("_")[4][1]), int(lauf.split("_")[5])
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    D = druecke(eingaben(lauf), "a")[k - 1]
    tr = [(f, a - b) for f, a, b in lp_verluste(z, 17) if f > D]
    if tr:
        f, s = tr[0]
        return [lauf, k, m, f - D, s, zf[f]["s17_x"] - zf[f]["f_x"]]
    return [lauf, k, m, None, None, None]


KOPF_F5 = ["lauf", "sprung_J", "treffer_frame", "schaden", "fig_h", "steigend", "status_figur_f..f+3", "aktion_figur_f+1"]


def analyse_f5(lauf):
    z = lade(lauf)
    zf = {r["frame"]: r for r in z}
    jd = druecke(eingaben(lauf), "j")
    lv = lp_verluste(z)
    if not lv:
        return [lauf, jd[0] if jd else None] + [None] * 6
    f, a, b = lv[0]
    return [lauf, jd[0] if jd else None, f, a - b, zf[f]["f_h"], "ja" if zf[f]["f_h"] > zf[f - 1]["f_h"] else "nein",
            "/".join(str(zf[g]["f_st"]) for g in range(f, f + 4)), "%x" % zf[f + 1]["f_akt"]]


KOPF_F6 = ["lauf", "P", "treffer_P+2", "erster_aktiver_frame_gegner", "lp_verluste_gegner", "lp_verluste_figur"]


def analyse_f6(lauf):
    slot = SLOT[lauf.split("_")[3]]
    z = lade(lauf)
    P = druecke(eingaben(lauf), "a")[0]
    ang = angriffsbeginne(z, [slot], 2, max(r["frame"] for r in z))
    return [lauf, P, P + 2, ang[0][0] if ang else None,
            " ".join("%d:-%d" % (f, a - b) for f, a, b in lp_verluste(z, slot)),
            " ".join("%d:-%d" % (f, a - b) for f, a, b in lp_verluste(z) if f < P + 30)]


# ---------------------------------------------------------------------------
# Kommandos
def cmd_zeit(a):
    z = lade(a.lauf)
    ein = eingaben(a.lauf)
    slots = [int(s) for s in a.slot.split(",")] if a.slot else []
    kopf = "frame in     st akt ph     x    xf    h    z     anim   lp bl kb t69 rang"
    for s in slots:
        kopf += " | s%d st akt ph x h z att lp" % s
    print(kopf)
    for r in z:
        if not a.von <= r["frame"] <= a.bis:
            continue
        s = "%5d %-5s %2d %3x %2x %5d %5d %4d %4d %08x %3d %2x %2d %3d %3d" % (
            r["frame"], "".join(sorted(ein.get(r["frame"], ()))), r["f_st"], r["f_akt"], r["f_ph"], r["f_x"], r["f_xf"],
            r["f_h"], r["f_z"], r["f_anim"], r["f_lp"], r["f_blick"], r["kombo"], r["t69"], r["rang"])
        for n in slots:
            p = "s%d_" % n
            s += " | %d %3x %2x %5d %4d %4d %4x %3d" % (r[p + "st"], r[p + "akt"], r[p + "ph"], r[p + "x"], r[p + "h"],
                                                      r[p + "z"], r[p + "att"], r[p + "lp"])
        print(s)


def cmd_treffer(a):
    z = lade(a.lauf)
    zf = {r["frame"]: r for r in z}
    for f, n, v, b in treffer_alle(z):
        r, p = zf[f], "s%d_" % n
        print("frame %d slot %d lp %d -> %d dx %d dz %d fig_h %d kombo %d" % (
            f, n, v, b, r[p + "x"] - r["f_x"], r[p + "z"] - r["f_z"], r["f_h"], r["kombo"]))
    for f, v, b in lp_verluste(z):
        print("frame %d FIGUR lp %d -> %d (Angreifer s%s)" % (f, v, b, angreifer_slot(zf[f]["f_angr"])))


def ausgabe_teil(teil, namen, out):
    if teil == "a":
        schreibe(out, KOPF_A, [analyse_a(n) for n in namen])
    elif teil == "b":
        schreibe(out, KOPF_B, [analyse_b(n) for n in namen])
    elif teil == "c":
        schreibe(out, KOPF_C, [analyse_c(n) for n in namen])
    elif teil == "d":
        schreibe(out, ["lauf", "feld", "wert"], [[n, k, v] for n in namen for k, v in analyse_d(n)])
    elif teil == "e":
        schreibe(out, KOPF_E, [z for n in namen for z in analyse_e(n)])
    elif teil == "probe":
        schreibe(out, KOPF_F_PROBE, [analyse_probe(n) for n in namen])
    elif teil == "f3":
        schreibe(out, KOPF_F3, [analyse_f3(n) for n in namen])
    elif teil == "f3a":
        schreibe(out, KOPF_F3A, [analyse_f3a(n) for n in namen])
    elif teil == "f5":
        schreibe(out, KOPF_F5, [analyse_f5(n) for n in namen])
    elif teil == "f6":
        schreibe(out, KOPF_F6, [analyse_f6(n) for n in namen])


def cmd_teil(a):
    ausgabe_teil(a.teil, [os.path.basename(n) for n in a.laeufe], sys.stdout)


ABSCHNITTE = [
    ("a", ["rest_v_a_e_*", "rest_v_a_w_*"],
     "Teil A: Nachlauf der Kettenstufen 2-4 (ab anlauf_c: EDDY Slot 17, Stufe 1 in Frame 40, Folgedruecke h+16, h+13, h+20; "
     "ab anlauf: WOOKY Slot 18, Stufe 1 in 42, Folgedruecke h+20, h+12, h+15). Werte relativ zu h (Stufe 2, 3 mit Treffer) bzw. D "
     "(Stufe 4, Leerschlag). Proben: Angriff (a) bzw. Sprung (j) in genau einem Frame, Richtung (hl, hr, hu, hd) gehalten. "
     "EINGRIFF nur in *_l_* (Gegner ab h der Vorstufe +1 um 40 px in die Tiefe versetzt: Leerschlag) und *_s4_z_* "
     "(Gegner D+1 bis D+10 um 40 px versetzt, D+11 bis D+24 zurueck: Tritt trifft im zweiten Fenster)"),
    ("b", ["rest_v_b_w_*", "rest_v_b_e_*"],
     "Teil B: Sprungangriff hoch (Sprung + hoch in J, Angriff in A) und runter (Sprung in J, Angriff + runter in A); "
     "Laufname rest_v_b_<g>_<h|r><A-J>_<m>_<dx>_<dz>_<seite>. EINGRIFF: Gegner (WOOKY ab anlauf_b mit J=10, EDDY ab tiefe_b mit J=12) "
     "bis F-1 und ab F+1 200 px vor (Seite v) bzw. hinter (Seite h) der Figur, im Probeframe F = A+m bei dx/dz. "
     "dx_F, dz_F: Lage am Ende von F (der Gegner geht in F oft 2 px heran)"),
    ("b", ["rest_v_b_nat_*"],
     "Teil B ohne Eingriff (ab anlauf_c: EDDY steht ab Frame 38 bei dx 47; ab anlauf_b: WOOKY ab 40 bei dx 46/dz 10): "
     "h hoch in J, hlang hoch 37-43 gehalten, uA hoch nur mit dem Angriff, hdiag Sprung mit hoch+rechts, n neutral, "
     "r runter mit dem Angriff, rri dazu Sprung mit Richtung, dJ runter nur mit dem Sprung, rlang runter 43-47 gehalten"),
    ("c", ["rest_v_c_*"],
     "Teil C: Gegner mit genau 0 LP. w_nat 3+3+3+3+4 (Stufe 2), e_nat 3+4+5+3+3+12 (Sprungangriff hoch, umwerfend), "
     "e_tod 3+4+5+3+3+3+4+5 (Stufe 3) und naechster Treffer h+30; Vergleich *_vgl mit denselben Treffern bis auf einen "
     "(Gegner behaelt LP). EINGRIFF in w_glp (LP 7 in Frame 2, dann Stufe 1+2) und e_glp (LP 22, dann volle Kette, Tritt)"),
    ("d", ["rest_v_d_*"],
     "Teil D: Tod und Neueinstieg. Grundlaeufe e (anlauf_c), tb (tiefe_b), boss (item_v_b1_s1_cam02016, rechts 2-40), "
     "1281/1281b (p0_s1_s1_cam01281, rechts bis 200 bzw. 150; Tod durch den Mech) mit EINGRIFF LP der Figur auf 4 in einem Frame; "
     "ohne Eingriff 768 (p0_s1_s1_cam00768, zwei Tode) und 1281n (zwei Tode durch den Mech). e2: EINGRIFF LP 2 in E+300 (zweiter Tod). "
     "e_r8, e_r22: EINGRIFF Rang in Frame 60 einmal auf 8 bzw. 22. e_schutz: EINGRIFF EDDY von E+92 bis E+312 bei dx 45. "
     "Steuerung: Proben e_*, tb_* mit Angriff (a) bzw. Sprung (j) in E+k (ein Frame) bzw. Richtung gehalten E+5 bis E+90 (h*)"),
    ("e", ["rest_v_e_boss", "rest_v_e_s3", "rest_v_e_h0", "rest_v_e_vor_*"],
     "Teil E: Rang beim Stage-Wechsel. Bot (grafik/bot.lua mit scenarios/rest_v_bot.lua; EINGRIFFE des Bots: LP der Figur "
     "aufgefuellt, LP der Gegner nach 900 Frames Stillstand auf 1) ab item_v_b1_s1_cam02016 (Stage 1 -> 2, legt in Frame 1950 "
     "den Savestate rest_v_e_vor an), stage3 (Stage 3 -> 4), held0 (Mack, Stage 1 -> 2). rest_v_e_vor_*: ab rest_v_e_vor ohne "
     "Eingabe, EINGRIFF Rang in Frame 2 einmal auf 7, 8, 10, 22 (nat: ohne Eingriff)"),
    ("probe", ["rest_v_f1_*", "rest_v_f1b_*"],
     "Teil F1: Mindestabstand. f1_*_s1_<dx>: EINGRIFF Gegner nur in P+2 (erster aktiver Frame von Stufe 1) bei dx, sonst 200 px vor der Figur. "
     "f1_*_s<k>_<dx> (k 2-4): Kette natuerlich, EINGRIFF Gegner fuer Stufe k von D+1 bis D+21 bei dx (Gegner noch in seiner "
     "Trefferreaktion, schaut von der Figur weg). f1b_*: Kettendruck spaet (h+25 bzw. h+24), Gegner frei und zur Figur gedreht, "
     "EINGRIFF von D+1 bis D+9 (Tritt D+22) bei dx"),
    ("probe", ["rest_v_f2_*", "rest_v_f2j_*"],
     "Teil F2: Blick nach links (Figur dreht sich mit links in Frame 10). EINGRIFF: Gegner links der Figur; f2_*_s1: nur in P+2 bei dx; "
     "f2_*_s<k>: bis D bei dx -40, im ersten aktiven Frame der Stufe bei dx; f2j_<g>_<ri|ne>_<m>: Sprungangriff mit Richtung "
     "(Sprung + links) bzw. neutral, A = J+3, Gegner nur in A+m bei dx"),
    ("f3", ["rest_v_f3_*"],
     "Teil F3/F4: Richtung beim Kettendruck (ohne Eingriff): Stufe k mit Angriff + Richtung in D (ein Frame); *_f mit Folgedruck "
     "(nach Treffer h+14, ohne Treffer D+16)"),
    ("f3a", ["rest_v_f3a_*"],
     "Teil F3: aktive Frames des Ausfallschritts gegen den EDDY (EINGRIFF: Gegner ab D+1 200 px vor der Figur, nur im Probeframe bei dx 30)"),
    ("f5", ["rest_v_f5_*"],
     "Teil F5: Treffer in der Luft (ohne Eingriff): senkrechter Sprung in J (j0: ohne Sprung); EDDY trifft in 68, WOOKY in 70"),
    ("f6", ["rest_v_f6_*"],
     "Teil F6: Gleichzeitiger Treffer (ohne Eingriff): Schlag in P, Treffer in P+2; anlauf_c (e), anlauf_b (w), tiefe_b (t)"),
]


def cmd_belege(a):
    with open(a.ausgabe, "w") as out:
        out.write("# Gegenpruefung V8 \"Rest der Spielfigur\" (Praefix rest_v), erzeugt von scripts/belege_rest.sh mit "
                  "scripts/messen_rest_v.py belege; Szenarien scripts/scenarios/rest_v_frei.lua und rest_v_bot.lua.\n")
        for teil, muster, text in ABSCHNITTE:
            namen = []
            for mu in muster:
                if teil == "e" and "*" not in mu:
                    namen.append(mu)
                else:
                    namen += [n for n in laeufe(mu) if n not in namen]
            if teil == "b" and muster[0] != "rest_v_b_nat_*":
                namen = [n for n in namen if not n.startswith("rest_v_b_nat_")]
            if teil == "probe" and muster[0] == "rest_v_f2_*":
                namen = [n for n in namen if not n.startswith("rest_v_f2j_")] + [n for n in namen if n.startswith("rest_v_f2j_")]
            out.write("\n# " + text + "\n")
            ausgabe_teil(teil, namen, out)
            if teil == "e":
                out.write("# Ereignisse und EINGRIFFE der Bot-Laeufe (<lauf>_events.txt)\n")
                for n in namen:
                    ev = os.path.join(RAW, n + "_events.txt")
                    if os.path.exists(ev):
                        for zeile in open(ev):
                            if any(w in zeile for w in ("EINGRIFF", "stage", "control", "save")):
                                out.write("# %s: %s\n" % (n, zeile.strip()))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("zeit", help="Zeitachse eines Laufs: Figur und gewaehlte Slots je Frame")
    p.add_argument("lauf")
    p.add_argument("--slot", default="")
    p.add_argument("--von", type=int, default=1)
    p.add_argument("--bis", type=int, default=10 ** 9)
    p.set_defaults(fn=cmd_zeit)
    p = sub.add_parser("treffer", help="alle LP-Verluste eines Laufs (Slots und Figur) mit Abstand und Angreifer")
    p.add_argument("lauf")
    p.set_defaults(fn=cmd_treffer)
    p = sub.add_parser("teil", help="Auswertung einzelner Laeufe als CSV: TEIL a, b, c, d, e, probe, f3, f3a, f5 oder f6")
    p.add_argument("teil", choices=["a", "b", "c", "d", "e", "probe", "f3", "f3a", "f5", "f6"])
    p.add_argument("laeufe", nargs="+")
    p.set_defaults(fn=cmd_teil)
    p = sub.add_parser("belege", help="wertet alle Laeufe rest_v_* in logs/raw aus und schreibt die Belegdatei (logs/rest_v.csv)")
    p.add_argument("ausgabe")
    p.set_defaults(fn=cmd_belege)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
