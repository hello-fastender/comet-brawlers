#!/usr/bin/env python3
"""Auswertung der Boss-Laeufe (Auftrag M6, Praefix boss; nur Standardbibliothek).

Liest die Watch-CSVs von scenarios/boss_frei.lua (logs/raw/<lauf>_watch.csv)
und baut Zeitachsen des Boss-Slots (LP, Zustand S+4, Aktion S+0x0A/0x0C,
Animationszeiger S+0x1C, Trefferattribut S+0x24, Position) sowie der Figur.

Unterbefehle (je ein Satz):
  zeitachse  Zeitachse des Boss-Slots und der Figur Frame fuer Frame (nur Wechsel).
  lp         LP-Ereignisse des Bosses: Treffer, Ruecksprung (Frame, Wert), Reaktion, Rueckzug.
  angriffe   Angriffe des Bosses: Art, Beginn A, aktive Frames, Schaden, Treffer, Nachlauf, Abstand.
  rhythmus   Abstaende zwischen Angriffsbeginnen, Reihenfolge und Wahl nach Abstand und Rang.
  wellen     Neu erscheinende Gegner (Slot, Typ, Frame) und die LP des Bosses dazu.
  fall       Fall des Bosses: LP <= 0, Zustandswechsel, Zusammenbruch der uebrigen Gegner, Stagewechsel.
  start      Start-LP, Max-LP (S+0x9A) und Byte S+0xB7 des Bosses beim Erscheinen mit dem Rang.
  probe      Probe zur Reichweite: Treffer auf die Figur relativ zum Bezugsframe A.
  belege     Alle Laeufe aus belege_boss.sh auswerten und logs/boss.csv schreiben.

Konventionen: Frames sind lokale Runner-Frames. dx = x(Boss) - x(Figur),
dz = z(Boss) - z(Figur), ganzzahlig am Frame-Ende. Der Boss schaut nach
links, wenn S+0x5E = 0, nach rechts bei 0x20. "vorn" heisst in Blickrichtung
des Bosses (d = dx bei Blick links, -dx bei Blick rechts).
"""

import argparse
import csv
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "logs" / "raw"

DOLG = 0x46DA4
TYPEN = {0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK",
         0x46DA4: "DOLG"}

# Animationszeiger (letzte 6 Hex-Stellen) des Bosses, nach dem Verhalten benannt
ANIM_K = 0x04A97E          # kurzer Schlag, erstes Bild
ANIM_S = 0x04A67C          # Armschwung, erstes Bild (jeder der drei Schwuenge)
ANIM_R_AUSHOLEN = 0x04A6CA  # Ansturm: Ausholen (Aktion 6, Phase 2)
ANIM_R_LAUF = 0x04A26A     # Ansturm: erstes Laufbild
ANIM_P = 0x04B842          # Sprung-Koerperpresse, erstes Bild
ANIM_G = 0x04ABDE          # Griff, erstes Bild (S+4 = 2)
ANIM_WURF = 0x04AF4C       # Wurf aus dem Griff
ANIM_RUECKZUG = 0x04A3F6   # Rueckzug (Aktion 8) bzw. Ende des Ansturms
ANIM_ZUCKEN = 0x04AFF0     # Trefferreaktion, erstes Bild
GEHEN = {0x049EFA, 0x049F48, 0x049F92, 0x049FD6, 0x04A022, 0x04A06A}
STEHEN = 0x049EA4

ART_NAME = {"K": "kurzer Schlag", "S": "Armschwung", "R": "Ansturm",
            "P": "Koerperpresse", "G": "Griff"}


def s16(v):
    return v - 0x10000 if v >= 0x8000 else v


def lade(name):
    """Watch-CSV eines Laufs als Liste von dicts mit abgeleiteten Feldern."""
    pfad = RAW / f"{name}_watch.csv"
    if not pfad.exists():
        raise SystemExit(f"fehlt: {pfad}")
    zeilen = []
    with open(pfad) as f:
        for r in csv.DictReader(f):
            z = {k: int(v) for k, v in r.items()}
            z["f"] = z["frame"]
            z["bx"] = z["b_x"] / 65536.0
            z["bz"] = z["b_z"] / 65536.0
            z["bh"] = z["b_h"] / 65536.0
            z["px"] = z["p_x"] / 65536.0
            z["pz"] = z["p_z"] / 65536.0
            z["ph"] = z["p_h"] / 65536.0
            z["bxi"] = z["b_x"] >> 16
            z["pxi"] = z["p_x"] >> 16
            z["bzi"] = z["b_z"] >> 16
            z["pzi"] = z["p_z"] >> 16
            z["dx"] = s16(z["bxi"]) - s16(z["pxi"])
            z["dz"] = s16(z["bzi"]) - s16(z["pzi"])
            z["bst"] = z["b_st"] >> 8
            z["bs5"] = z["b_st"] & 0xFF
            z["pst"] = z["p_st"] >> 8
            z["anim"] = z["b_anim"] & 0xFFFFFF
            z["aktiv"] = (z["b_attr"] & 0xFF) != 0
            z["blick"] = "r" if z["b_blick"] == 0x20 else "l"
            # Trefferflaeche S+0x28 (0 = nicht trefferbar) und Schutzzaehler S+0xAE
            z["flaeche"] = z.get("b_flaeche", -1)
            z["schutz"] = z.get("b_schutz", -1)
            zeilen.append(z)
    return zeilen


def vorn(z):
    """Abstand der Figur vor dem Boss in seiner Blickrichtung."""
    return z["dx"] if z["blick"] == "l" else -z["dx"]


# --------------------------------------------------------------- Zeitachse

def cmd_zeitachse(args):
    rows = lade(args.lauf)
    vor = None
    for z in rows:
        if z["f"] < args.von or z["f"] > args.bis:
            continue
        k = (z["bst"], z["b_akt"], z["b_ph"], z["anim"], z["b_attr"], z["b_lp"],
             z["p_lp"], z["pst"], z["p_akt"])
        if args.alle or k != vor:
            print(f"{z['f']:5d} rang {z['rang']:2d} B st {z['bst']} akt {z['b_akt']:02x}/{z['b_ph']:02x} "
                  f"anim {z['anim']:06x} attr {z['b_attr']:04x} lp {z['b_lp']:4d} x {z['bx']:8.2f} "
                  f"z {z['bz']:7.2f} h {z['bh']:6.2f} blick {z['blick']} | P st {z['pst']} "
                  f"akt {z['p_akt']:02x} lp {z['p_lp']:3d} x {z['px']:8.2f} z {z['pz']:7.2f} "
                  f"h {z['ph']:6.2f} | dx {z['dx']:5d} dz {z['dz']:4d}")
        vor = k


# --------------------------------------------------------------- LP-Ereignisse

def figur_aktion(z):
    a = z["p_akt"]
    if z["p_09"] == 4:
        return "Griff"
    return {0x00: "Stand", 0x06: "Sprintangriff", 0x0A: "Sprung", 0x0E: "Sprungangriff",
            0x10: "Schlag", 0x14: "Spezial", 0x16: "Waffe", 0x08: "Sprint-Sprungangriff"}.get(a, f"akt{a:02x}")


def eingriff_frames(variablen):
    """Frames, in denen CC_BLP die LP des Bosses setzt (kein Treffer)."""
    fr = set()
    for t in variablen.split():
        if t.startswith("CC_BLP="):
            for item in t.split("=", 1)[1].split(","):
                fr.add(int(item.split(":")[0]))
    return fr


def lp_ereignisse(rows, ohne=()):
    """Treffer auf den Boss (LP sinken) mit Ruecksprung und Reaktion.
    ohne: Frames mit gesetzten LP (EINGRIFF CC_BLP), die kein Treffer sind."""
    ev = []
    letzter_treffer = None
    letzter_dauerhaft = None
    for i in range(1, len(rows)):
        z, v = rows[i], rows[i - 1]
        if z["b_lp"] >= v["b_lp"] or v["bs5"] == 0 or z["f"] in ohne:
            continue
        h = z["f"]
        e = {"h": h, "lp_vor": v["b_lp"], "lp_nach": z["b_lp"], "schaden": v["b_lp"] - z["b_lp"],
             "rang": z["rang"], "dx": z["dx"], "dz": z["dz"],
             "figur": figur_aktion(v if v["p_akt"] else z), "kombo": z["p_kombo"] // 4 + 1,
             "boss_vorher": f"{v['bst']}/{v['b_akt']:02x}/{v['b_ph']:02x}/{v['anim']:06x}",
             "seit_treffer": (h - letzter_treffer) if letzter_treffer else "",
             "seit_dauerhaft": (h - letzter_dauerhaft) if letzter_dauerhaft else ""}
        # Ruecksprung: LP steigen in den naechsten Frames wieder
        rueck = None
        for j in range(i + 1, min(i + 4, len(rows))):
            if rows[j]["b_lp"] > rows[j - 1]["b_lp"]:
                rueck = rows[j]
                break
            if rows[j]["b_lp"] < rows[j - 1]["b_lp"]:
                break
        if rueck:
            e["ruecksprung"] = rueck["f"] - h
            e["lp_zurueck"] = rueck["b_lp"]
            e["zurueck_auf"] = "Wert vor dem Treffer" if rueck["b_lp"] == v["b_lp"] else "anderer Wert"
        else:
            e["ruecksprung"] = ""
            e["lp_zurueck"] = ""
            e["zurueck_auf"] = ""
        # Reaktion des Bosses ab h
        e.update(reaktion(rows, i))
        ev.append(e)
        letzter_treffer = h
        if not rueck:
            letzter_dauerhaft = h
    return ev


def reaktion(rows, i):
    """Art und Dauer der Reaktion des Bosses ab Zeile i (Trefferframe h)."""
    h = rows[i]["f"]
    res = {"reaktion": "", "frei_ab": "", "rueckzug_von": "", "rueckzug_bis": "",
           "rueckzug_x": "", "rueckzug_attr": "", "figur_lp_im_rueckzug": "", "flug_x": ""}
    # erste Aktion nach dem Treffer bestimmen
    art = None
    if rows[i]["b_lp"] < 0:
        art = "Tod"
    # zurueckgewiesener Treffer: Aktion 8 (Rueckzug) bzw. 0x1E (abgefangen) geht
    # vor, auch wenn in h noch die Aktion des Treffers (z. B. 0x0C) eingetragen ist
    folge = [rows[j]["b_akt"] for j in range(i, min(i + 3, len(rows)))]
    if art is None and 8 in folge:
        art = "Rueckzug"
    if art is None and 0x1E in folge:
        art = "abgefangen (Aktion 1E)"
    for j in range(i, min(i + 3, len(rows)) if art is None else i):
        z = rows[j]
        if z["b_akt"] == 8:
            art = "Rueckzug"
            break
        if z["b_akt"] in (0x0C, 0x12, 0x14):
            art = {0x0C: "umgeworfen (Aktion 0C)", 0x12: "umgeworfen (Aktion 12)",
                   0x14: "umgeworfen (Aktion 14)"}[z["b_akt"]]
            break
        if z["bst"] == 3 and z["anim"] == ANIM_ZUCKEN:
            art = "Zucken"
            break
        if z["bst"] == 3 and z["b_akt"] == 4 and z["p_09"] != 4 and j > i:
            art = "Zucken (Aktion 4)"
            break
        if z["bst"] == 3 and z["b_akt"] == 2 and j > i:
            art = "im Griff"
            break
        if z["bst"] == 2 and z["b_akt"] == 2:
            art = "im Griff"
            break
    if art is None:
        z = rows[min(i + 1, len(rows) - 1)]
        art = f"st{z['bst']} akt{z['b_akt']:02x}"
    res["reaktion"] = art
    # frei ab: erster Frame mit S+4 = 1 nach h (bei Rueckzug nach dessen Ende)
    for j in range(i + 1, len(rows)):
        if rows[j]["bst"] == 1:
            res["frei_ab"] = rows[j]["f"] - h
            break
    if art == "Rueckzug":
        von = bis = None
        for j in range(i, len(rows)):
            if rows[j]["b_akt"] == 8:
                if von is None:
                    von = j
                bis = j
            elif von is not None:
                break
        res["rueckzug_von"] = rows[von]["f"] - h
        res["rueckzug_bis"] = rows[bis]["f"] - h
        res["rueckzug_x"] = round(rows[bis]["bx"] - rows[von]["bx"], 2)
        res["rueckzug_attr"] = f"{max(rows[k]['b_attr'] & 0xFF for k in range(von, bis + 1)):02x}"
        res["figur_lp_im_rueckzug"] = min(rows[k]["p_lp"] for k in range(von, bis + 1))
    if art.startswith("umgeworfen") or art.startswith("abgefangen"):
        # Weg bis zur Ruhe (erster Frame mit Aktion 0x0C Phase >= 8 bzw. frei)
        for j in range(i + 1, len(rows)):
            if rows[j]["bst"] == 1:
                res["flug_x"] = round(rows[j - 1]["bx"] - rows[i]["bx"], 2)
                break
    return res


def cmd_lp(args):
    rows = lade(args.lauf)
    ev = lp_ereignisse(rows)
    schreibe(ev, sys.stdout)


# --------------------------------------------------------------- Angriffe

def angriffsbeginne(rows):
    """Liste (i, art) der Angriffsbeginne. Armschwung: nur der erste der Serie."""
    out = []
    for i in range(1, len(rows)):
        z, v = rows[i], rows[i - 1]
        a = z["anim"]
        if a == v["anim"]:
            continue
        if a == ANIM_K:
            out.append((i, "K"))
        elif a == ANIM_S:
            # Teil einer laufenden Serie? (vorheriges Bild aus dem Schwung)
            serie = v["b_akt"] == 6 and v["b_ph"] in (4, 6, 8) and v["anim"] in (
                0x04A926, 0x04A8D2, 0x04A882, 0x04A822)
            out.append((i, "S+" if serie else "S"))
        elif a == ANIM_R_AUSHOLEN and z["b_akt"] == 6 and z["b_ph"] == 2:
            out.append((i, "R"))
        elif a == ANIM_P:
            out.append((i, "P"))
        elif a == ANIM_G and z["bst"] == 2:
            out.append((i, "G"))
    return out


def angriff_details(rows, i, art, ende_i):
    """Kennwerte eines Angriffs ab Zeile i bis (ausschliesslich) ende_i."""
    z0 = rows[i]
    A = z0["f"]
    d = {"art": art, "name": ART_NAME.get(art.rstrip("+"), art), "A": A, "rang": z0["rang"],
         "dx_A": z0["dx"], "dz_A": z0["dz"], "vorn_A": vorn(z0), "blick": z0["blick"],
         "schaden_8b": z0["b_schaden"]}
    # Entscheidung: letzter Wechsel der Aktion auf 6 vor A (Annaeherung) bzw. A
    j = i
    while j > 0 and rows[j - 1]["b_akt"] == 6 and rows[j - 1]["bst"] == 1:
        j -= 1
    d["entscheidung"] = rows[j]["f"]
    d["dx_entscheidung"] = rows[j]["dx"]
    d["dz_entscheidung"] = rows[j]["dz"]
    aktiv = [k for k in range(i, ende_i) if rows[k]["aktiv"]]
    if aktiv:
        d["erster_aktiv"] = rows[aktiv[0]]["f"] - A
        d["letzter_aktiv"] = rows[aktiv[-1]]["f"] - A
        d["aktive_frames"] = len(aktiv)
        d["attr"] = "/".join(sorted({f"{rows[k]['b_attr']:04x}" for k in aktiv}))
    else:
        d["erster_aktiv"] = d["letzter_aktiv"] = d["aktive_frames"] = ""
        d["attr"] = ""
    # Treffer auf die Figur
    tr = [k for k in range(i, ende_i) if rows[k]["p_lp"] < 72]
    d["treffer"] = ";".join(f"{rows[k]['f'] - A}:{72 - rows[k]['p_lp']}" for k in tr)
    um = ""
    if tr:
        k = tr[0]
        for m in range(k, min(k + 3, len(rows))):
            if rows[m]["p_akt"] == 0x0C or rows[m]["pst"] == 2:
                um = "ja"
                break
        else:
            um = "nein"
    d["figur_umgeworfen"] = um
    # Nachlauf: vom letzten aktiven Frame bis zum ersten Frame mit Gehen/Stehen
    d["nachlauf"] = ""
    if aktiv:
        for k in range(aktiv[-1] + 1, len(rows)):
            if rows[k]["b_akt"] in (0, 4) and rows[k]["bst"] == 1:
                d["nachlauf"] = rows[k]["f"] - rows[aktiv[-1]]["f"] - 1
                break
    # Ende des Angriffs (erste Zeile mit Aktion 0/4 und S+4 = 1)
    d["ende"] = ""
    for k in range(i + 1, len(rows)):
        if rows[k]["b_akt"] in (0, 4) and rows[k]["bst"] == 1:
            d["ende"] = rows[k]["f"] - A
            break
    a = art.rstrip("+")
    if a == "R":
        lauf = [k for k in range(i, ende_i) if rows[k]["anim"] in (0x04A26A, 0x04A2BE, 0x04A302, 0x04A354)]
        if lauf:
            d["lauf_von"] = rows[lauf[0]]["f"] - A
            d["lauf_bis"] = rows[lauf[-1]]["f"] - A
            d["lauf_x"] = round(rows[lauf[-1]]["bx"] - rows[lauf[0] - 1]["bx"], 2)
            schritte = sorted({round(rows[k]["bx"] - rows[k - 1]["bx"], 3) for k in lauf[1:]})
            d["lauf_tempo"] = "/".join(str(s) for s in schritte[:6])
            stop = [k for k in range(lauf[-1] + 1, ende_i) if rows[k]["anim"] == ANIM_RUECKZUG]
            if stop:
                d["auslauf_x"] = round(rows[stop[-1]]["bx"] - rows[lauf[-1]]["bx"], 2)
                d["auslauf_frames"] = len(stop)
    if a == "P":
        luft = [k for k in range(i, ende_i) if rows[k]["bh"] > 0.5]
        if luft:
            hmax = max(luft, key=lambda k: rows[k]["bh"])
            d["absprung"] = rows[luft[0]]["f"] - A
            d["landung"] = rows[luft[-1]]["f"] - A + 1
            d["scheitel"] = round(rows[hmax]["bh"], 2)
            d["scheitel_frame"] = rows[hmax]["f"] - A
            d["flug_x"] = round(rows[luft[-1] + 1]["bx"] - z0["bx"], 2) if luft[-1] + 1 < len(rows) else ""
            d["vx"] = round(rows[luft[0] + 1]["bx"] - rows[luft[0]]["bx"], 4)
            land = rows[min(luft[-1] + 1, len(rows) - 1)]
            d["landung_minus_figur_A"] = round(land["bx"] - z0["px"], 2)
            d["landung_minus_figur_absprung"] = round(land["bx"] - rows[luft[0]]["px"], 2)
    if a == "G":
        d["griff_dx"] = rows[i - 1]["dx"]
        d["griff_dz"] = rows[i - 1]["dz"]
        wurf = [k for k in range(i, ende_i) if rows[k]["anim"] == ANIM_WURF]
        if wurf:
            d["wurf"] = rows[wurf[0]]["f"] - A
            # Flug der Figur bis zur Ruhe (Aktion 0x0C, Phase >= 8)
            for k in range(wurf[0], len(rows)):
                if rows[k]["p_akt"] == 0x0C and rows[k]["p_ph"] >= 8:
                    d["wurf_figur_x"] = round(rows[k]["px"] - rows[wurf[0]]["px"], 2)
                    d["wurf_richtung"] = ("hinter den Boss" if (rows[k]["px"] - z0["bx"]) * (1 if z0["blick"] == "r" else -1) < 0
                                         else "vor den Boss")
                    d["wurf_ruhe"] = rows[k]["f"] - A
                    break
    return d


def angriffe(rows):
    beg = angriffsbeginne(rows)
    out = []
    for n, (i, art) in enumerate(beg):
        ende = beg[n + 1][0] if n + 1 < len(beg) else len(rows)
        if art == "S":
            # Serie: bis zum ersten Beginn, der kein S+ ist
            m = n + 1
            while m < len(beg) and beg[m][1] == "S+":
                m += 1
            ende_serie = beg[m][0] if m < len(beg) else len(rows)
            d = angriff_details(rows, i, art, ende)
            d["schwuenge"] = m - n
            ds = angriff_details(rows, i, art, ende_serie)
            d["treffer_serie"] = ds["treffer"]
            d["nachlauf_serie"] = ds["nachlauf"]
            d["ende_serie"] = ds["ende"]
            out.append(d)
        elif art == "S+":
            d = angriff_details(rows, i, art, ende)
            out.append(d)
        else:
            out.append(angriff_details(rows, i, art, ende))
    return out


def cmd_angriffe(args):
    rows = lade(args.lauf)
    schreibe(angriffe(rows), sys.stdout)


# --------------------------------------------------------------- Rhythmus

def klasse(d):
    a = abs(d)
    return "nah" if a < 80 else ("mittel" if a <= 160 else "fern")


def rhythmus(rows, ab=62):
    an = [d for d in angriffe(rows) if d["art"] != "S+" and d["A"] >= ab]
    res = {"angriffe": len(an), "folge": "".join(d["art"] for d in an)}
    abst = [an[k + 1]["A"] - an[k]["A"] for k in range(len(an) - 1)]
    res["abstaende"] = abst
    kl = {}
    for d in an:
        k = klasse(d["dx_entscheidung"])
        kl.setdefault(k, {}).setdefault(d["art"], 0)
        kl[k][d["art"]] += 1
    res["wahl_nach_abstand"] = kl
    return res, an


def median(xs):
    xs = sorted(xs)
    if not xs:
        return ""
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def cmd_rhythmus(args):
    for name in args.lauf:
        rows = lade(name)
        res, an = rhythmus(rows)
        ab = res["abstaende"]
        print(f"{name}: {res['angriffe']} Angriffe, Folge {res['folge']}")
        if ab:
            print(f"  Abstand A->A: min {min(ab)} median {median(ab)} max {max(ab)}")
        print(f"  Wahl nach Abstand bei der Entscheidung: {res['wahl_nach_abstand']}")


# --------------------------------------------------------------- Wellen

def wellen(rows, boss_slot=19):
    out = []
    slots = [n for n in range(20) if n != boss_slot and f"s{n}_st" in rows[0]]
    for i in range(1, len(rows)):
        z, v = rows[i], rows[i - 1]
        for n in slots:
            neu = (z[f"s{n}_st"] != 0 and v[f"s{n}_st"] == 0) or (
                z[f"s{n}_typ"] != v[f"s{n}_typ"] and z[f"s{n}_st"] != 0)
            if neu:
                lp_min = min(rows[k]["b_lp"] for k in range(max(0, i - 3), i + 1))
                out.append({"frame": z["f"], "slot": n, "typ": TYPEN.get(z[f"s{n}_typ"], hex(z[f"s{n}_typ"])),
                            "lp_typ": z[f"s{n}_lp"], "boss_lp_vorframe": v["b_lp"], "boss_lp": z["b_lp"],
                            "boss_lp_min_4f": lp_min, "x": z[f"s{n}_x"], "kamera": z["camx"], "rang": z["rang"]})
    return out


def cmd_wellen(args):
    schreibe(wellen(lade(args.lauf)), sys.stdout)


# --------------------------------------------------------------- Fall

def fall(rows, boss_slot=19):
    res = {}
    t = None
    for i in range(1, len(rows)):
        if rows[i]["b_lp"] <= 0 < rows[i - 1]["b_lp"]:
            t = i
            break
    if t is None:
        return {"fall": "kein"}
    z = rows[t]
    res["t"] = z["f"]
    res["lp_t"] = z["b_lp"]
    # LP-Verlauf nach t
    res["lp_t+1"] = rows[t + 1]["b_lp"] if t + 1 < len(rows) else ""
    # Zustandswechsel des Bosses
    wechsel = []
    vor = None
    for k in range(t, len(rows)):
        s = (rows[k]["bst"], rows[k]["b_akt"], rows[k]["b_ph"])
        if s != vor:
            wechsel.append(f"{rows[k]['f'] - z['f']}:{s[0]}/{s[1]:02x}/{s[2]:02x}")
        vor = s
    res["boss_wechsel"] = " ".join(wechsel[:20])
    # uebrige Gegner
    slots = [n for n in range(20) if n != boss_slot and f"s{n}_st" in rows[0]]
    andere = []
    for n in slots:
        st0 = rows[t - 1][f"s{n}_st"]
        if st0 == 0:
            continue
        for k in range(t, len(rows)):
            if rows[k][f"s{n}_st"] != rows[k - 1][f"s{n}_st"] or rows[k][f"s{n}_lp"] != rows[k - 1][f"s{n}_lp"]:
                andere.append(f"slot{n}:{TYPEN.get(rows[t][f's{n}_typ'], '?')}:{rows[k]['f'] - z['f']}:"
                              f"st{rows[k][f's{n}_st']:04x}/lp{rows[k][f's{n}_lp']}")
                break
    res["andere"] = " ".join(andere)
    # aktive Angriffsattribute des Bosses nach t, Treffer auf die Figur
    res["attr_nach_t"] = " ".join(f"{rows[k]['f'] - z['f']}:{rows[k]['b_attr']:04x}"
                                  for k in range(t, min(t + 60, len(rows))) if rows[k]["aktiv"])
    res["figur_treffer_nach_t"] = " ".join(f"{rows[k]['f'] - z['f']}:{72 - rows[k]['p_lp']}"
                                           for k in range(t, len(rows)) if rows[k]["p_lp"] < 72)
    # Stagewechsel und Boss-Slot frei
    for k in range(t, len(rows)):
        if rows[k]["stage"] != z["stage"]:
            res["stagewechsel"] = rows[k]["f"] - z["f"]
            break
    for k in range(t, len(rows)):
        if rows[k]["bst"] == 0:
            res["slot_frei"] = rows[k]["f"] - z["f"]
            break
    return res


def cmd_fall(args):
    for k, v in fall(lade(args.lauf)).items():
        print(f"{k}: {v}")


# --------------------------------------------------------------- Start-LP

def start(rows):
    for z in rows:
        if z["b_lp"] != 0 and z["bs5"] == 1:
            return {"frame": z["f"], "kamera": z["camx"], "rang": z["rang"], "lp": z["b_lp"],
                    "max_9a": z["b_max"], "b7": z["b_b7"]}
    return {"frame": "", "kamera": "", "rang": "", "lp": "", "max_9a": "", "b7": ""}


def cmd_start(args):
    for name in args.lauf:
        print(name, start(lade(name)))


# --------------------------------------------------------------- Probe

def probe(rows, anim, n=1, fenster=60, ab=1):
    """Bezugsframe A = n-ter Wechsel auf anim ab Frame ab; Treffer der Figur danach."""
    seen = 0
    A = None
    for i in range(1, len(rows)):
        if rows[i]["f"] >= ab and rows[i]["anim"] == anim and rows[i - 1]["anim"] != anim:
            seen += 1
            if seen == n:
                A = i
                break
    if A is None:
        return {"A": "", "treffer": "", "erster_aktiv": ""}
    z0 = rows[A]
    akt = [k for k in range(A, min(A + fenster, len(rows))) if rows[k]["aktiv"]]
    tr = [k for k in range(A, min(A + fenster, len(rows))) if rows[k]["p_lp"] < 72]
    res = {"A": z0["f"], "erster_aktiv": (rows[akt[0]]["f"] - z0["f"]) if akt else "",
           "letzter_aktiv": (rows[akt[-1]]["f"] - z0["f"]) if akt else "",
           "treffer": (rows[tr[0]]["f"] - z0["f"]) if tr else "",
           "schaden": (72 - rows[tr[0]]["p_lp"]) if tr else ""}
    k = tr[0] if tr else (akt[0] if akt else A)
    res["dx"] = rows[k]["dx"]
    res["dz"] = rows[k]["dz"]
    res["vorn"] = vorn(rows[k])
    res["ph"] = round(rows[k]["ph"], 2)
    res["bh"] = round(rows[k]["bh"], 2)
    res["blick"] = rows[k]["blick"]
    return res


def cmd_probe(args):
    print(probe(lade(args.lauf), int(args.anim, 16), args.n, ab=args.ab))


# --------------------------------------------------------------- Ausgabe

def schreibe(dicts, ziel, abschnitt=None, praefix=None):
    if not dicts:
        if abschnitt:
            ziel.write(f"# {abschnitt}: keine Zeilen\n")
        return
    keys = []
    for d in dicts:
        for k in d:
            if k not in keys:
                keys.append(k)
    w = csv.writer(ziel, lineterminator="\n")
    if abschnitt:
        ziel.write(f"# {abschnitt}\n")
    w.writerow(([praefix] if praefix else []) + keys)
    for d in dicts:
        w.writerow(([d.get(praefix, "")] if False else []) + [d.get(k, "") for k in keys])


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("zeitachse", help="Zeitachse des Boss-Slots und der Figur (nur Wechsel).")
    s.add_argument("lauf")
    s.add_argument("--von", type=int, default=1)
    s.add_argument("--bis", type=int, default=10**9)
    s.add_argument("--alle", action="store_true")
    s.set_defaults(fn=cmd_zeitachse)
    s = sub.add_parser("lp", help="LP-Ereignisse des Bosses mit Ruecksprung und Reaktion.")
    s.add_argument("lauf")
    s.set_defaults(fn=cmd_lp)
    s = sub.add_parser("angriffe", help="Angriffe des Bosses mit Kennwerten.")
    s.add_argument("lauf")
    s.set_defaults(fn=cmd_angriffe)
    s = sub.add_parser("rhythmus", help="Abstaende und Wahl der Angriffe.")
    s.add_argument("lauf", nargs="+")
    s.set_defaults(fn=cmd_rhythmus)
    s = sub.add_parser("wellen", help="Neu erscheinende Gegner und Boss-LP.")
    s.add_argument("lauf")
    s.set_defaults(fn=cmd_wellen)
    s = sub.add_parser("fall", help="Fall des Bosses.")
    s.add_argument("lauf")
    s.set_defaults(fn=cmd_fall)
    s = sub.add_parser("start", help="Start-LP und Max-LP beim Erscheinen.")
    s.add_argument("lauf", nargs="+")
    s.set_defaults(fn=cmd_start)
    s = sub.add_parser("probe", help="Reichweitenprobe relativ zum Bezugsframe.")
    s.add_argument("lauf")
    s.add_argument("anim")
    s.add_argument("--n", type=int, default=1)
    s.add_argument("--ab", type=int, default=1, help="A erst ab diesem Frame suchen")
    s.set_defaults(fn=cmd_probe)
    s = sub.add_parser("belege", help="Alle Laeufe auswerten und logs/boss.csv schreiben.")
    s.add_argument("--manifest", default=str(RAW / "boss_manifest.tsv"))
    s.add_argument("--aus", default=str(BASE / "logs" / "boss.csv"))
    s.set_defaults(fn=cmd_belege)
    s = sub.add_parser("dritte", help="Nur die Abschnitte '# M' der dritten Messung (Teil M) schreiben.")
    s.add_argument("--manifest", default=str(RAW / "boss_manifest.tsv"))
    s.add_argument("--aus", required=True)
    s.set_defaults(fn=cmd_dritte)
    args = p.parse_args()
    args.fn(args)


# --------------------------------------------------------------- PNG (Teil G)

def png_lesen(pfad):
    """Minimaler PNG-Dekoder (8 bit RGB, nicht verschachtelt) mit zlib."""
    import struct
    import zlib
    d = Path(pfad).read_bytes()
    i, w, h, idat = 8, None, None, b""
    while i < len(d):
        n, = struct.unpack(">I", d[i:i + 4])
        t = d[i + 4:i + 8]
        c = d[i + 8:i + 8 + n]
        if t == b"IHDR":
            w, h = struct.unpack(">II", c[:8])
        elif t == b"IDAT":
            idat += c
        i += 12 + n
    raw = zlib.decompress(idat)
    bpp, stride = 3, w * 3
    zeilen, prev, k = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[k]
        k += 1
        z = bytearray(raw[k:k + stride])
        k += stride
        for x in range(stride):
            a = z[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                z[x] = (z[x] + a) & 255
            elif f == 2:
                z[x] = (z[x] + b) & 255
            elif f == 3:
                z[x] = (z[x] + (a + b) // 2) & 255
            elif f == 4:
                p_ = a + b - c
                pa, pb, pc = abs(p_ - a), abs(p_ - b), abs(p_ - c)
                z[x] = (z[x] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
        zeilen.append(z)
        prev = z
    return w, h, zeilen


def goldpixel(pfad):
    """Goldene Pixel (Schriftzug STAGE 1 CLEAR) in den Bildzeilen 140-161."""
    w, h, img = png_lesen(pfad)
    n = 0
    for y in range(140, 162):
        z = img[y]
        for x in range(w):
            r, g, b = z[3 * x], z[3 * x + 1], z[3 * x + 2]
            if r > 200 and 120 < g < 200 and b < 90:
                n += 1
    return n


def schriftzug(name, schwelle=100):
    """Erster Frame mit Schriftzug (mehr als schwelle Goldpixel) in den Aufnahmen."""
    bilder = sorted((RAW / "snap").glob(f"{name}_*.png"))
    for b in bilder:
        f = int(b.stem.rsplit("_", 1)[1])
        if goldpixel(b) >= schwelle:
            return f
    return ""


# --------------------------------------------------------------- Belege

def manifest(pfad):
    laeufe = []
    with open(pfad) as f:
        for zeile in f:
            teile = zeile.rstrip("\n").split("\t")
            if len(teile) < 5:
                continue
            laeufe.append({"teil": teile[0], "lauf": teile[1], "savestate": teile[2],
                           "frames": teile[3], "info": teile[4],
                           "variablen": teile[5] if len(teile) > 5 else ""})
    return laeufe


def info_wert(info, schluessel):
    for t in info.replace(",", " ").split():
        if t.startswith(schluessel + "="):
            return t.split("=", 1)[1]
    return ""


def zustandsklasse(boss_vorher):
    st, akt, ph, anim = boss_vorher.split("/")
    if st == "3":
        return "Reaktion"
    if akt == "06":
        return "eigener Angriff"
    if akt in ("00", "04"):
        return "Gehen/Stehen"
    return f"Aktion {akt}"


def angriffsart_bei(anim_hex, akt):
    a = int(anim_hex, 16)
    if akt != "06":
        return ""
    if 0x04A97E <= a <= 0x04AB86:
        return "K"
    if 0x04A67C <= a <= 0x04A926:
        return "S"
    if a in (0x04A26A, 0x04A2BE, 0x04A302, 0x04A354, 0x04A3F6):
        return "R"
    if 0x04B842 <= a <= 0x04BAA6:
        return "P"
    if a in GEHEN:
        return "Annaeherung"
    return "?"


def bins(x):
    if x == "":
        return "erster"
    x = int(x)
    if x < 40:
        return "<40"
    if x < 80:
        return "40-79"
    if x < 160:
        return "80-159"
    return ">=160"


def zusammenfassen(werte):
    w = [v for v in werte if v != ""]
    if not w:
        return ""
    w = sorted(w)
    if all(isinstance(v, (int, float)) for v in w):
        return f"{w[0]}..{w[-1]} (n={len(w)}, Median {median(w)})" if len(set(w)) > 1 else f"{w[0]} (n={len(w)})"
    return "/".join(sorted({str(v) for v in w}))


def cmd_belege(args):
    laeufe = manifest(args.manifest)
    cache = {}

    def rows_von(lauf):
        if lauf not in cache:
            cache[lauf] = lade(lauf)
        return cache[lauf]

    out = open(args.aus, "w")
    out.write("# Boss DOLG (Stage 1), Auftrag M6. Erzeugt von scripts/belege_boss.sh und "
              "scripts/messen_boss.py belege. Frames lokal je Lauf; dx = x(Boss) - x(Figur), "
              "dz = z(Boss) - z(Figur); 'vorn' in Blickrichtung des Bosses.\n")
    teil = {}
    for l in laeufe:
        teil.setdefault(l["teil"], []).append(l)

    # ---- Laufliste
    schreibe([{"teil": l["teil"], "lauf": l["lauf"], "savestate": l["savestate"],
               "frames": l["frames"], "info": l["info"], "variablen": l["variablen"]} for l in laeufe],
             out, "Laufliste (EINGRIFFE in den Variablen: CC_WEG, CC_RANG, CC_BSET, CC_FIG, CC_SSET, CC_BLP, CC_ENTF*, CC_LP immer an)")

    # ---- A: Start-LP
    zeilen = []
    for l in teil.get("A", []):
        d = start(rows_von(l["lauf"]))
        zeilen.append({"lauf": l["lauf"], "savestate": l["savestate"], "info": l["info"], **d})
    schreibe(zeilen, out, "A start: LP, Max-LP S+0x9A und S+0xB7 im ersten Frame mit LP (Rang in diesem Frame)")
    tab = {}
    for z in zeilen:
        if z["rang"] != "":
            tab.setdefault(z["rang"], set()).add((z["lp"], z["max_9a"], z["b7"]))
    schreibe([{"rang": r, "lp/max_9a/b7": " ".join(f"{a}/{b}/{c}" for a, b, c in sorted(v)),
               "laeufe": sum(1 for z in zeilen if z["rang"] == r)} for r, v in sorted(tab.items())],
             out, "A rang: Start-LP je Rang beim Erwachen")

    # ---- B: Treffer auf den Boss (Einzelfaelle, Ketten, Zweittreffer)
    bot = [l for l in teil.get("B", []) if l["lauf"].startswith("boss_b_bot")]
    fscan = [l for l in teil.get("B", []) if l["lauf"].startswith("boss_b_f")]
    rest = [l for l in teil.get("B", []) + teil.get("C", []) if l not in bot and l not in fscan]
    zeilen = []
    for l in rest:
        for e in lp_ereignisse(rows_von(l["lauf"]), eingriff_frames(l["variablen"])):
            zeilen.append({"lauf": l["lauf"], "info": l["info"], **e})
    schreibe(zeilen, out, "B treffer: jeder LP-Verlust des Bosses (ruecksprung = Frames bis die LP wieder steigen; "
             "reaktion Zucken/Rueckzug/umgeworfen/im Griff; frei_ab = Frames bis S+4 = 1)")

    # Zweittreffer-Scans
    zeilen = []
    for l in teil.get("B", []):
        n = l["lauf"]
        if not any(n.startswith(f"boss_b_{p}") and n[len(f"boss_b_{p}"):].isdigit() for p in ("z", "w", "v", "u", "d", "e")):
            continue
        ev = lp_ereignisse(rows_von(n), eingriff_frames(l["variablen"]))
        if len(ev) < 2:
            zeilen.append({"lauf": n, "info": l["info"], "h1": ev[0]["h"] if ev else "", "h2": "",
                           "abstand": "", "ergebnis2": "kein zweiter Treffer"})
            continue
        e1, e2 = ev[0], ev[1]
        zeilen.append({"lauf": n, "info": l["info"], "h1": e1["h"],
                       "ergebnis1": "zurueck" if e1["ruecksprung"] != "" else "dauerhaft",
                       "h2": e2["h"], "abstand": e2["h"] - e1["h"],
                       "ergebnis2": "zurueck" if e2["ruecksprung"] != "" else "dauerhaft",
                       "boss_vorher2": e2["boss_vorher"], "reaktion2": e2["reaktion"]})
    schreibe(zeilen, out, "B zweittreffer: zweiter Treffer nach Stufe 1 (h1), Abstand und Ergebnis")

    # Einzeltreffer-Zeitscan
    zeilen = []
    for l in fscan:
        ev = lp_ereignisse(rows_von(l["lauf"]), eingriff_frames(l["variablen"]))
        F = info_wert(l["info"], "einzel")
        if not ev:
            zeilen.append({"lauf": l["lauf"], "F": F, "h": "", "ergebnis": "kein Treffer (Boss griff zuerst an)"})
            continue
        e = ev[0]
        zeilen.append({"lauf": l["lauf"], "F": F, "h": e["h"],
                       "ergebnis": "zurueck" if e["ruecksprung"] != "" else "dauerhaft",
                       "boss_vorher": e["boss_vorher"], "zustand": zustandsklasse(e["boss_vorher"]),
                       "reaktion": e["reaktion"]})
    schreibe(zeilen, out, "B einzelzeit: ein einzelner Schlag (Stufe 1) zu verschiedenen Zeitpunkten F")
    n_d = sum(1 for z in zeilen if z.get("ergebnis") == "dauerhaft")
    n_z = sum(1 for z in zeilen if z.get("ergebnis") == "zurueck")
    out.write(f"# B einzelzeit Summe: dauerhaft {n_d}, zurueck {n_z}, ohne Treffer {len(zeilen) - n_d - n_z}\n")

    # Bot-Statistik
    zeilen, alle = [], []
    for l in bot:
        rows = rows_von(l["lauf"])
        ev = lp_ereignisse(rows)
        for e in ev:
            e2 = {"lauf": l["lauf"], "savestate": l["savestate"], "rang_info": info_wert(l["info"], "rang"), **e}
            alle.append(e2)
        schl = [e for e in ev if e["figur"] == "Schlag"]
        rz = [e for e in schl if e["ruecksprung"] != ""]
        zeilen.append({"lauf": l["lauf"], "savestate": l["savestate"], "info": l["info"],
                       "treffer_alle": len(ev), "schlagtreffer": len(schl), "zurueck": len(rz),
                       "anteil_zurueck": f"{100 * len(rz) / max(1, len(schl)):.0f}%",
                       "lp_ende": rows[-1]["b_lp"], "frames": len(rows)})
    schreibe(zeilen, out, "B bot: einfacher Angreifer (CC_BOT=angriff), Anteil zurueckgenommener Schlagtreffer")
    gruppen = {}
    for e in alle:
        if e["figur"] != "Schlag":
            continue
        for k, v in (("rang", e["rang_info"]), ("zustand", zustandsklasse(e["boss_vorher"])),
                     ("seit_dauerhaft", bins(e["seit_dauerhaft"])), ("stufe", e["kombo"]),
                     ("lp_vor", "ueber 55" if e["lp_vor"] > 55 else ("28-55" if e["lp_vor"] > 27 else "bis 27"))):
            g = gruppen.setdefault((k, str(v)), [0, 0])
            g[0] += 1
            if e["ruecksprung"] != "":
                g[1] += 1
    schreibe([{"merkmal": k, "wert": v, "schlagtreffer": a, "zurueck": b, "anteil": f"{100 * b / max(1, a):.0f}%"}
              for (k, v), (a, b) in sorted(gruppen.items(), key=lambda x: (x[0][0], x[0][1]))],
             out, "B bot gruppen: Anteil zurueckgenommener Schlagtreffer nach Merkmal (alle Bot-Laeufe)")
    schreibe(alle, out, "B bot treffer: alle LP-Verluste des Bosses in den Bot-Laeufen")

    # Treffart-Stichprobe (b_t_<art>_<i>, Rang 24)
    arten = {}
    for l in teil.get("B", []):
        if not l["lauf"].startswith("boss_b_t_"):
            continue
        art = info_wert(l["info"], "art")
        ev = [e for e in lp_ereignisse(rows_von(l["lauf"]), eingriff_frames(l["variablen"])) if e["reaktion"] != "Tod"]
        a = arten.setdefault(art, {"laeufe": 0, "ohne": 0, "treffer": {}})
        a["laeufe"] += 1
        if not ev:
            a["ohne"] += 1
        for k, e in enumerate(ev[:4], 1):
            t = a["treffer"].setdefault(k, [0, 0, set(), [], 0])
            t[0] += 1
            if e["ruecksprung"] != "":
                t[1] += 1
                if e["zurueck_auf"] != "Wert vor dem Treffer":
                    t[4] += 1
            t[2].add(e["figur"] + (f" Stufe {e['kombo']}" if e["figur"] == "Schlag" else ""))
            t[3].append(e["schaden"])
    zeilen = []
    for art, a in arten.items():
        for k, (n, zr, fig, sch, teilw) in sorted(a["treffer"].items()):
            zeilen.append({"art": art, "laeufe": a["laeufe"], "ohne_treffer": a["ohne"], "treffer_nr": k,
                           "figur": "/".join(sorted(fig)), "faelle": n, "zurueck": zr,
                           "davon_teilweise": teilw, "dauerhaft": n - zr, "schaden": zusammenfassen(sch)})
    schreibe(zeilen, out, "B arten: Stichprobe je Treffart bei Rang 24 (EINGRIFF), 16 Laeufe mit um je 6 Frames "
             "verschobenem Beginn; treffer_nr = n-ter LP-Verlust im Lauf; davon_teilweise = LP steigen nur um einen Teil "
             "(Reaktion abgefangen, Aktion 0x1E)")

    # ---- C: Reaktion
    alle_ev = [z for z in zeilen_treffer(teil, rows_von)]
    gruppen = {}
    for e in alle_ev:
        g = gruppen.setdefault((e["reaktion"], e["figur"]), {"n": 0, "frei_ab": [], "rz_dauer": [], "rz_x": [],
                                                              "rz_attr": set(), "figur_lp": [], "flug_x": []})
        g["n"] += 1
        g["frei_ab"].append(e["frei_ab"])
        if e["rueckzug_von"] != "":
            g["rz_dauer"].append(e["rueckzug_bis"] - e["rueckzug_von"] + 1)
            g["rz_x"].append(abs(e["rueckzug_x"]))
            g["rz_attr"].add(e["rueckzug_attr"])
            g["figur_lp"].append(e["figur_lp_im_rueckzug"])
        if e["flug_x"] != "":
            g["flug_x"].append(abs(e["flug_x"]))
    schreibe([{"reaktion": r, "figur": f, "faelle": g["n"], "frei_ab": zusammenfassen(g["frei_ab"]),
               "rueckzug_frames": zusammenfassen(g["rz_dauer"]), "rueckzug_x": zusammenfassen(g["rz_x"]),
               "rueckzug_attr": "/".join(sorted(g["rz_attr"])), "figur_lp_min_im_rueckzug": zusammenfassen(g["figur_lp"]),
               "weg_bis_frei_x": zusammenfassen(g["flug_x"])}
              for (r, f), g in sorted(gruppen.items())],
             out, "C reaktion: Reaktionsart je Treffart (alle Laeufe der Teile B, C, E)")
    # Zittern beim Zucken (b_k1)
    rows = rows_von("boss_b_k1") if any(l["lauf"] == "boss_b_k1" for l in laeufe) else None
    if rows:
        ev = lp_ereignisse(rows)
        if ev:
            h = ev[0]["h"]
            i = next(k for k, z in enumerate(rows) if z["f"] == h)
            x0 = rows[i]["bx"]
            out.write("# C zittern (boss_b_k1): x relativ zu x(h) in h+1..h+27: " +
                      " ".join(f"{rows[i + k]['bx'] - x0:+.0f}" for k in range(1, 28)) + "\n")
            out.write("# C zucken Animation (boss_b_k1): " +
                      " ".join(f"h+{rows[k]['f'] - h}:{rows[k]['anim']:06x}" for k in range(i, i + 28)
                               if k == i or rows[k]["anim"] != rows[k - 1]["anim"]) + "\n")
    # Verwundbarkeit beim Liegen und nach dem Aufstehen (c_aufs*, c_aufj*, c_sp*)
    zeilen = []
    for l in teil.get("C", []):
        n = l["lauf"]
        if not (n.startswith("boss_c_auf") or n.startswith("boss_c_sp")):
            continue
        rows = rows_von(n)
        X = int(info_wert(l["info"], "probe"))
        ev = lp_ereignisse(rows)
        K = ev[0]["h"] if ev else ""
        G = next((z["f"] for z in rows if K != "" and z["f"] > K and z["bst"] == 1), "")
        probe_ev = [e for e in ev[1:] if e["h"] >= X - 1]
        h = probe_ev[0]["h"] if probe_ev else ""
        fl = next((z["f"] for z in rows if G != "" and z["f"] >= G and z["flaeche"] > 0), "")
        zx = next((z for z in rows if z["f"] == X), None)
        ende = h if h != "" else rows[-1]["f"]
        griff = next((z["f"] for z in rows if X <= z["f"] <= ende and z["bst"] == 2 and z["anim"] == ANIM_G), "")
        angriff = next((z["f"] for z in rows if G != "" and G <= z["f"] <= ende and z["b_akt"] == 6), "")
        # Flug des Bosses von K bis G: Scheitel, erster Bodenkontakt, Weg bis G
        flug = {}
        if K != "" and G != "":
            seg = [z for z in rows if K <= z["f"] <= G]
            top = max(seg, key=lambda z: z["bh"])
            boden = next((z for z in seg if z["f"] > top["f"] and z["bh"] < 2), None)
            flug = {"scheitel_h": round(top["bh"], 2), "scheitel_K_plus": top["f"] - K,
                    "boden_K_plus": (boden["f"] - K) if boden else "",
                    "weg_K_bis_G": round(abs(seg[-1]["bx"] - seg[0]["bx"]), 2), "G_minus_K": G - K}
        zeilen.append({"lauf": n, "info": l["info"], "K": K, "G": G, "X": X, **flug,
                       "X_minus_G": (X - G) if G != "" else "",
                       "boss_in_X": f"st{zx['bst']} akt{zx['b_akt']:02x}/{zx['b_ph']:02x}" if zx else "",
                       "flaeche_in_X": f"{zx['flaeche']:04x}" if zx else "",
                       "schutz_in_G": next((z["schutz"] for z in rows if z["f"] == G), ""),
                       "flaeche_ab_G_plus": (fl - G) if fl != "" else "",
                       "eigener_angriff_ab_G_plus": (angriff - G) if angriff != "" else "",
                       "griff_ab": griff, "treffer_h": h,
                       "h_minus_G": (h - G) if h != "" and G != "" else "",
                       "ergebnis": ("zurueck" if probe_ev[0]["ruecksprung"] != "" else "dauerhaft") if probe_ev else "kein Treffer"})
    schreibe(zeilen, out, "C aufstehen: Probe (Schlag bzw. Spezial) auf den liegenden und aufgestandenen Boss; K = Treffer, "
             "der umwirft; G = erster Frame mit S+4 = 1; X = erster aktiver Frame der Probe; flaeche_ab_G_plus = erster "
             "Frame ab G mit Trefferflaeche S+0x28 > 0; schutz_in_G = Schutzzaehler S+0xAE in G")

    # Schutzphasen: Trefferflaeche S+0x28 = 0 (alle Laeufe der Teile B, C, E)
    phasen = {}
    treffer_flaeche = {}
    for t in ("B", "C", "E"):
        for l in teil.get(t, []):
            rows = rows_von(l["lauf"])
            if rows[0]["flaeche"] < 0:
                continue
            ohne = eingriff_frames(l["variablen"])
            for i in range(1, len(rows)):
                z, v = rows[i], rows[i - 1]
                if z["b_lp"] < v["b_lp"] and v["bs5"] and z["f"] not in ohne:
                    k = (v["flaeche"] > 0, z["flaeche"] > 0)
                    treffer_flaeche[k] = treffer_flaeche.get(k, 0) + 1
            # nicht trefferbar: Trefferflaeche leer oder S+4 = 2 (Flug, Liegen, Griff)
            def gesperrt(z):
                return z["bs5"] and z["b_lp"] >= 0 and (z["flaeche"] == 0 or z["bst"] == 2)
            i = 1
            while i < len(rows):
                if not (gesperrt(rows[i]) and not gesperrt(rows[i - 1])):
                    i += 1
                    continue
                s = i
                while i < len(rows) and gesperrt(rows[i]):
                    i += 1
                if i >= len(rows) or not rows[i]["bs5"] or rows[i]["b_lp"] < 0:
                    continue
                a = rows[s]
                vorher3 = any(rows[k]["bst"] == 3 for k in range(max(0, s - 3), s))
                if a["b_akt"] == 8:
                    grund = "Rueckzug (Aktion 8)"
                elif a["b_akt"] in (0x0C, 0x12, 0x14, 0x1E):
                    grund = f"umgeworfen bzw. abgefangen (Aktion {a['b_akt']:02X})"
                elif a["b_akt"] == 6 and a["anim"] in range(ANIM_P, ANIM_P + 0x200):
                    grund = "Koerperpresse aus der Trefferreaktion" if vorher3 else "Koerperpresse"
                elif a["bst"] == 2 and a["anim"] == ANIM_G:
                    grund = "packt die Figur"
                elif a["bst"] in (2, 3) and a["b_akt"] == 2:
                    grund = "von der Figur gepackt"
                else:
                    grund = f"st{a['bst']} akt{a['b_akt']:02x}"
                frei = next((k for k in range(s, i) if rows[k]["bst"] == 1
                             and all(rows[m]["bst"] == 1 for m in range(k, i))), None)
                p = phasen.setdefault(grund, {"n": 0, "dauer": [], "frei": [], "schutz": [], "zelle": {}})
                p["n"] += 1
                p["dauer"].append(i - s)
                if frei is not None:
                    p["frei"].append(i - frei)
                    p["schutz"].append(rows[frei]["schutz"])
                zelle = f"{rows[i]['anim']:06x}"
                p["zelle"][zelle] = p["zelle"].get(zelle, 0) + 1
    schreibe([{"grund": g, "faelle": p["n"], "frames_ohne_flaeche": zusammenfassen(p["dauer"]),
               "davon_frei_s4_1": zusammenfassen(p["frei"]), "schutzzaehler_bei_frei": zusammenfassen(p["schutz"]),
               "zelle_bei_rueckkehr": " ".join(f"{k}:{v}" for k, v in sorted(p["zelle"].items(), key=lambda x: -x[1])[:4])}
              for g, p in sorted(phasen.items())],
             out, "C schutz: Phasen, in denen der Boss nicht trefferbar ist (Trefferflaeche S+0x28 = 0 oder S+4 = 2), nach "
             "Grund; frames_ohne_flaeche = Laenge der Phase; davon_frei_s4_1 = Frames am Ende der Phase mit S+4 = 1 (frei, "
             "aber ohne Flaeche); schutzzaehler_bei_frei = S+0xAE im ersten dieser Frames; zelle_bei_rueckkehr = Animation "
             "im ersten trefferbaren Frame")
    out.write("# C schutz Treffer: LP-Verluste nach S+0x28 (Vorframe h-1 / Trefferframe h; 0 = leer, 1 = gesetzt): " +
              ", ".join(f"{int(a)}/{int(b)}: {n}" for (a, b), n in sorted(treffer_flaeche.items())) + "\n")

    # Ausbruch: Koerperpresse direkt aus der Trefferreaktion (Bot-Laeufe)
    zeilen, zucken, zuck_seit = [], 0, []
    for l in bot:
        rows = rows_von(l["lauf"])
        zucken += sum(1 for e in lp_ereignisse(rows) if e["reaktion"] == "Zucken")
        letzter = angriff = None
        for i in range(1, len(rows)):
            z, v = rows[i], rows[i - 1]
            if z["b_lp"] < v["b_lp"]:
                letzter = z["f"]
            if z["bst"] == 3 and v["bst"] != 3 and z["b_akt"] == 0 and angriff:
                zuck_seit.append(z["f"] - angriff)
            if v["bst"] == 3 and z["bst"] == 1 and z["b_akt"] == 6:
                zeilen.append({"lauf": l["lauf"], "frame": z["f"], "rang": z["rang"], "anim": f"{z['anim']:06x}",
                               "seit_treffer": (z["f"] - letzter) if letzter else "",
                               "seit_angriffsbeginn": (z["f"] - angriff) if angriff else "", "dx": z["dx"],
                               "schutz": z["schutz"],
                               "flaeche_ab": next((rows[k]["f"] - z["f"] for k in range(i + 1, len(rows))
                                                   if rows[k]["flaeche"] > 0 and rows[k - 1]["flaeche"] == 0), "")})
            if z["b_akt"] == 6 and v["b_akt"] != 6:
                angriff = z["f"]
    schreibe(zeilen, out, "C ausbruch: Angriff direkt aus der Trefferreaktion (S+4 3 -> 1, Aktion 6) in den Bot-Laeufen; "
             "schutz = S+0xAE in diesem Frame; flaeche_ab = Frames bis S+0x28 > 0")
    out.write(f"# C ausbruch Summe: {len(zeilen)} Ausbrueche bei {zucken} Treffern mit Zuck-Reaktion in den Bot-Laeufen; "
              f"Frames seit dem letzten Angriffsbeginn: Ausbrueche {zusammenfassen([z['seit_angriffsbeginn'] for z in zeilen])}, "
              f"alle Beginne einer Zuck-Reaktion {zusammenfassen(zuck_seit)}\n")
    # Treffer waehrend eigener Angriffe
    zeilen = []
    for e in alle_ev:
        st, akt, ph, anim = e["boss_vorher"].split("/")
        if akt == "06" and st == "1":
            zeilen.append({"lauf": e["lauf"], "h": e["h"], "angriff": angriffsart_bei(anim, akt), "phase": ph,
                           "anim": anim, "figur": e["figur"],
                           "ergebnis": "zurueck" if e["ruecksprung"] != "" else "dauerhaft", "reaktion": e["reaktion"]})
    schreibe(zeilen, out, "C im angriff: Treffer, waehrend der Boss selbst angreift (Aktion 6)")

    # ---- D: Proben
    zeilen = []
    anims = {"K": ANIM_K, "S": ANIM_S, "R": ANIM_R_LAUF, "P": ANIM_P}
    for l in teil.get("D", []):
        art = info_wert(l["info"], "art")
        if art == "G":
            continue
        ab = 62 if art == "S" else 1
        p = probe(rows_von(l["lauf"]), anims[art], ab=ab, fenster=80)
        zeilen.append({"lauf": l["lauf"], "art": art, "d": info_wert(l["info"], "d"),
                       "dz_soll": info_wert(l["info"], "dz"), "h_soll": info_wert(l["info"], "h"), **p})
    schreibe(zeilen, out, "D proben: Figur ab A+1 relativ zum Boss gesetzt; treffer = Frame relativ zu A "
             "(leer: kein Treffer im Fenster); dx/dz/vorn/ph/bh im Trefferframe bzw. ersten aktiven Frame")
    zeilen = []
    for l in teil.get("D", []):
        if info_wert(l["info"], "art") != "G":
            continue
        rows = rows_von(l["lauf"])
        g = [z for z in rows if z["anim"] == ANIM_G and z["bst"] == 2]
        k = [z for z in rows if z["anim"] == ANIM_K]
        z63 = next(z for z in rows if z["f"] == 63)
        zeilen.append({"lauf": l["lauf"], "d": info_wert(l["info"], "d"), "dz_soll": info_wert(l["info"], "dz"),
                       "dx_63": z63["dx"], "dz_63": z63["dz"], "griff_ab": g[0]["f"] if g else "",
                       "kurzer_schlag_ab": k[0]["f"] if k else ""})
    schreibe(zeilen, out, "D griff: Boss in Frame 62-63 bei d/dz vor der Figur gesetzt; griff_ab = erster Frame mit Griff")
    # natuerliche Angriffe aus E und den Bot-Laeufen
    zeilen = []
    for l in teil.get("E", []) + bot:
        rows = rows_von(l["lauf"])
        for d in angriffe(rows):
            zeilen.append({"lauf": l["lauf"], "info": l["info"], **d})
    schreibe(zeilen, out, "D angriffe: alle Angriffe der langen Laeufe (E und Bot)")
    gruppen = {}
    for d in zeilen:
        a = d["art"].rstrip("+")
        if d["art"] == "S+":
            a = "S (2./3. Schwung)"
        g = gruppen.setdefault((a, d["rang"]), {k: [] for k in (
            "erster_aktiv", "aktiv_ohne_treffer", "aktiv_mit_treffer", "schaden_8b", "schaden_treffer",
            "nachlauf", "vorn_A", "dz_A", "umgeworfen", "lauf_x", "lauf_frames", "auslauf_x", "scheitel",
            "scheitel_frame", "landung", "landung_minus_figur_A", "wurf", "wurf_figur_x", "griff_dx", "griff_dz",
            "schwuenge", "dx_entscheidung")})
        g["erster_aktiv"].append(d["erster_aktiv"])
        (g["aktiv_mit_treffer"] if d["treffer"] else g["aktiv_ohne_treffer"]).append(d["aktive_frames"])
        g["schaden_8b"].append(d["schaden_8b"])
        if d["treffer"]:
            g["schaden_treffer"].append(int(d["treffer"].split(";")[0].split(":")[1]))
            g["umgeworfen"].append(d["figur_umgeworfen"])
        g["nachlauf"].append(d["nachlauf"])
        g["vorn_A"].append(d["vorn_A"])
        g["dz_A"].append(d["dz_A"])
        g["dx_entscheidung"].append(abs(d["dx_entscheidung"]))
        for k in ("lauf_x", "auslauf_x", "scheitel", "scheitel_frame", "landung", "landung_minus_figur_A",
                  "wurf", "wurf_figur_x", "griff_dx", "griff_dz", "schwuenge"):
            if k in d and d[k] != "":
                g[k].append(abs(d[k]) if k in ("lauf_x", "auslauf_x", "wurf_figur_x") else d[k])
        if d.get("lauf_von", "") != "":
            g["lauf_frames"].append(d["lauf_bis"] - d["lauf_von"] + 1)
    schreibe([{"art": a, "rang": r, "anzahl": len(g["erster_aktiv"]),
               **{k: zusammenfassen(v) for k, v in g.items()}}
              for (a, r), g in sorted(gruppen.items(), key=lambda x: (x[0][0], x[0][1]))],
             out, "D zusammenfassung: Kennwerte je Angriffsart und Rang (natuerlich gewaehlte Angriffe)")

    # ---- E: Rhythmus
    zeilen = []
    for l in teil.get("E", []) + bot:
        rows = rows_von(l["lauf"])
        res, an = rhythmus(rows)
        ab = res["abstaende"]
        # Pause: Ende eines Angriffs bis zur naechsten Entscheidung
        pausen = []
        for k in range(len(an) - 1):
            if an[k]["ende"] != "":
                pausen.append(an[k + 1]["entscheidung"] - (an[k]["A"] + an[k]["ende"]))
        anteile = {}
        for d in an:
            anteile[d["art"]] = anteile.get(d["art"], 0) + 1
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "frames": len(rows), "angriffe": res["angriffe"],
                       "je_1000": round(1000 * res["angriffe"] / max(1, len(rows) - 62), 2),
                       "folge": res["folge"], "anteile": " ".join(f"{k}:{v}" for k, v in sorted(anteile.items())),
                       "abstand_min": min(ab) if ab else "", "abstand_median": median(ab) if ab else "",
                       "abstand_max": max(ab) if ab else "",
                       "pause_min": min(pausen) if pausen else "", "pause_median": median(pausen) if pausen else "",
                       "pause_max": max(pausen) if pausen else "",
                       "wahl_nach_abstand": " | ".join(f"{k}: " + ",".join(f"{a}{n}" for a, n in sorted(v.items()))
                                                     for k, v in sorted(res["wahl_nach_abstand"].items()))})
    schreibe(zeilen, out, "E rhythmus: Angriffe je Lauf (A = Angriffsbeginn; Armschwung zaehlt einmal), "
             "Abstand A bis naechstes A, Pause Ende bis naechste Entscheidung, Wahl nach |dx| bei der "
             "Entscheidung (nah < 80, mittel 80-160, fern > 160)")

    # ---- F: Wellen
    zeilen = []
    for l in teil.get("F", []) + bot:
        for w in wellen(rows_von(l["lauf"])):
            if w["frame"] <= 3:
                continue
            zeilen.append({"lauf": l["lauf"], "info": l["info"], **w})
    schreibe(zeilen, out, "F wellen: neu belegte Gegnerslots (ohne die Arena-WOOKY in Frame 3) mit den LP des Bosses")

    # ---- G: Fall
    zeilen = []
    for l in teil.get("G", []) + bot:
        rows = rows_von(l["lauf"])
        r = fall(rows)
        if r.get("fall") == "kein":
            if l["teil"] == "G":
                zeilen.append({"lauf": l["lauf"], "info": l["info"], "t": "", "lp_t": "",
                               "boss_wechsel": f"kein Fall, LP am Ende {rows[-1]['b_lp']}"})
            continue
        t = r["t"]
        sieg = next((z["f"] - t for z in rows if z["f"] > t and z["p_akt"] == 0x18), "")
        text = schriftzug(l["lauf"]) if "CC_SNAPS" in l["variablen"] else ""
        zeilen.append({"lauf": l["lauf"], "info": l["info"], **r, "siegerpose": sieg,
                       "schriftzug": (text - t) if text != "" else "",
                       "schriftzug_nach_siegerpose": (text - t - sieg) if text != "" and sieg != "" else ""})
    schreibe(zeilen, out, "G fall: t = erster Frame mit LP <= 0 (LP = 0 ueberlebt der Boss); Angaben relativ zu t (siegerpose: Aktion 0x18 der "
             "Figur; schriftzug: erster Frame mit STAGE 1 CLEAR in den Aufnahmen, Schritt 2 Frames)")
    # ---- M: dritte Messung
    if teil.get("M"):
        dritte(out, teil["M"], rows_von)
    out.close()


def zeilen_treffer(teil, rows_von):
    """Alle LP-Ereignisse der Teile B, C, E mit Laufnamen (ohne Zeitscan)."""
    for t in ("B", "C", "E"):
        for l in teil.get(t, []):
            if l["lauf"].startswith("boss_b_f"):
                continue
            for e in lp_ereignisse(rows_von(l["lauf"]), eingriff_frames(l["variablen"])):
                yield {"lauf": l["lauf"], **e}


# --------------------------------------------------------------- Dritte Messung (Teil M)

def richtung(v, z):
    """Treffer von vorn oder hinten: Lage der Figur im Trefferframe zur Blickrichtung des Bosses im Vorframe."""
    vorn_h = z["dx"] if v["blick"] == "l" else -z["dx"]
    return "vorn" if vorn_h >= 0 else "hinten"


def ereignisse_m(rows):
    """LP-Ereignisse mit Zusatzspalten der dritten Messung."""
    out = []
    ev = lp_ereignisse(rows)
    idx = {z["f"]: k for k, z in enumerate(rows)}
    for n, e in enumerate(ev):
        i = idx[e["h"]]
        v, z = rows[i - 1], rows[i]
        z1 = rows[min(i + 1, len(rows) - 1)]
        erg = "dauerhaft" if e["ruecksprung"] == "" else (
            "zurueck" if e["zurueck_auf"] == "Wert vor dem Treffer" else "teilweise")
        naechster = ev[n + 1]["h"] if n + 1 < len(ev) else None
        frei = e["frei_ab"]
        dauer = frei if frei != "" and (naechster is None or naechster - e["h"] > frei) else ""
        weg_g = weg_g1 = ""
        if frei != "" and i + frei < len(rows):
            weg_g = round(abs(rows[i + frei]["bx"] - z["bx"]), 2)
            weg_g1 = round(abs(rows[i + frei - 1]["bx"] - z["bx"]), 2)
        out.append({"h": e["h"], "figur": e["figur"], "stufe": e["kombo"], "schaden": e["schaden"],
                    "ergebnis": erg, "lp_zurueck": e["lp_zurueck"], "rang": z["rang"],
                    "richtung": richtung(v, z), "boss_vorher": f"{v['bst']}/{v['b_akt']:02x}/{v['b_ph']:02x}/{v['anim']:06x}",
                    "reaktion_h1": f"{z1['bst']}/{z1['b_akt']:02x}", "reaktion": e["reaktion"],
                    "frei_ab": frei, "reaktion_dauer": dauer, "weg_bis_G": weg_g, "weg_bis_G-1": weg_g1})
    return out


def dritte(out, laeufe, rows_von):
    """Abschnitte '# M ...' der dritten Messung (Laeufe des Teils M)."""
    def gruppe(praefix):
        return [l for l in laeufe if l["lauf"].startswith("boss_m_" + praefix)]

    # ---- Ketten, Sprung- und Sprintangriffe: Zurueckweisung, Abfangen, Umwerfen
    zeilen = []
    for l in gruppe("k") + gruppe("sprn") + gruppe("sprint"):
        for e in ereignisse_m(rows_von(l["lauf"])):
            zeilen.append({"lauf": l["lauf"], "info": l["info"], **e})
    schreibe(zeilen, out, "M treffer: Ketten (Rang 20 und 16), Sprung- und Sprintangriffe (Rang 20) ab boss_q_m; "
             "ergebnis zurueck = LP in h+1 auf den Wert vor dem Treffer, teilweise = nur ein Teil (Aktion 0x1E); "
             "weg_bis_G bzw. G-1 = Flugweite vom Trefferort bis zum Frame G bzw. G-1")
    summ = {}
    for z in zeilen:
        art = z["figur"] + (f" Stufe {z['stufe']}" if z["figur"] == "Schlag" else "")
        k = (art, z["rang"])
        s = summ.setdefault(k, {"n": 0, "zurueck": 0, "teilweise": 0, "abgefangen_weg": set(), "G": []})
        s["n"] += 1
        if z["ergebnis"] == "zurueck":
            s["zurueck"] += 1
        if z["ergebnis"] == "teilweise":
            s["teilweise"] += 1
            s["abgefangen_weg"].add(f"{z['weg_bis_G']}/{z['weg_bis_G-1']}")
        if z["reaktion"].startswith("umgeworfen") and z["frei_ab"] != "":
            s["G"].append(z["frei_ab"])
    schreibe([{"art": a, "rang": r, "treffer": s["n"], "zurueck": s["zurueck"], "teilweise": s["teilweise"],
               "dauerhaft": s["n"] - s["zurueck"] - s["teilweise"],
               "weg_abgefangen_G/G-1": " ".join(sorted(s["abgefangen_weg"])), "G_minus_K": zusammenfassen(s["G"])}
              for (a, r), s in sorted(summ.items())], out, "M treffer summe: je Treffart und Rang")

    # ---- Umwerfen: Phasen und Liegezeit
    zeilen = []
    for l in gruppe("k") + gruppe("sprn") + gruppe("sprint") + gruppe("mis") + gruppe("uw_"):
        rows = rows_von(l["lauf"])
        idx = {z["f"]: k for k, z in enumerate(rows)}
        for e in lp_ereignisse(rows):
            if not (e["reaktion"].startswith("umgeworfen") or e["reaktion"] == "im Griff") or e["frei_ab"] == "":
                continue
            i = idx[e["h"]]
            G = e["h"] + e["frei_ab"]
            ph, vor = [], None
            for z in rows[i:i + e["frei_ab"] + 1]:
                k = (z["bst"], z["b_akt"], z["b_ph"])
                if k != vor:
                    ph.append(f"{z['f'] - e['h']}:{k[0]}/{k[1]:x}/{k[2]:x}")
                vor = k
            ruhe = next((z["f"] - e["h"] for z in rows[i:i + e["frei_ab"]] if z["b_ph"] == 0x0A and z["bst"] == 2), "")
            zeilen.append({"lauf": l["lauf"], "figur": e["figur"], "K": e["h"], "G_minus_K": e["frei_ab"],
                           "ruhe_ab_K_plus": ruhe, "liegen": (e["frei_ab"] - ruhe) if ruhe != "" else "",
                           "weg_bis_G": round(abs(rows[idx[G]]["bx"] - rows[i]["bx"]), 2) if G in idx else "",
                           "x_rel_kamera_G": round(rows[idx[G]]["bx"] - rows[idx[G]]["camx"], 1) if G in idx else "",
                           "phasen": " ".join(ph)})
    schreibe(zeilen, out, "M umwerfen: Phasen nach dem Umwerfen (K = Treffer, G = frei); ruhe_ab_K_plus = erster "
             "Frame mit Aktion 0x0C Phase 0x0A; liegen = G - Ruhe")

    # ---- Zucken: Dauer nach Richtung und Zustand
    zeilen = []
    for l in gruppe("z_"):
        for e in ereignisse_m(rows_von(l["lauf"]))[:1]:
            zeilen.append({"lauf": l["lauf"], "info": l["info"], **e})
    schreibe(zeilen, out, "M zucken: erster Treffer je Lauf (Stufe 1); richtung = Figur vor oder hinter dem Boss "
             "(Blickrichtung im Vorframe); reaktion_h1 = S+4/Aktion in h+1; reaktion_dauer = Frames bis S+4 = 1 "
             "(leer, wenn ein weiterer Treffer davor kommt)")
    summ = {}
    for z in zeilen:
        if z["ergebnis"] != "dauerhaft":
            continue
        st, akt, phs, anim = z["boss_vorher"].split("/")
        k = (z["richtung"], f"Aktion {akt}", z["reaktion_h1"])
        summ.setdefault(k, []).append(z["reaktion_dauer"])
    schreibe([{"richtung": k[0], "boss_vorher": k[1], "reaktion_h1": k[2], "dauer": zusammenfassen(v)}
              for k, v in sorted(summ.items())], out, "M zucken summe: Dauer der Reaktion nach Richtung und Aktion im Vorframe "
             "(nur dauerhafte Treffer)")

    # ---- Stufe 2: was folgt nach den 15 Frames
    zeilen = []
    for l in gruppe("k"):
        rows = rows_von(l["lauf"])
        idx = {z["f"]: k for k, z in enumerate(rows)}
        for e in lp_ereignisse(rows):
            if e["kombo"] != 2 or e["ruecksprung"] != "":
                continue
            h = e["h"]
            if h + 16 not in idx:
                continue
            z15, z16 = rows[idx[h + 15]], rows[idx[h + 16]]
            zeilen.append({"lauf": l["lauf"], "h": h, "reaktion_h1": f"{rows[idx[h] + 1]['bst']}/{rows[idx[h] + 1]['b_akt']:02x}",
                           "frei_ab": e["frei_ab"], "dx_h+15": z15["dx"], "dz_h+15": z15["dz"],
                           "aktion_h+16": f"{z16['bst']}/{z16['b_akt']:02x}/{z16['b_ph']:02x}/{z16['anim']:06x}"})
    schreibe(zeilen, out, "M stufe2: Reaktion auf Stufe 2 und Aktion danach (Abstand in h+15)")

    # ---- Griff: wer packt wen, wenn die Figur dem Boss nahe kommt
    zeilen = []
    for l in gruppe("gf_") + gruppe("bg_"):
        rows = rows_von(l["lauf"])
        X = int(info_wert(l["info"], "X"))
        zx = next(z for z in rows if z["f"] == X - 1)
        erst = next((f"{z['f'] - X}:Figur packt" for z in rows
                     if X <= z["f"] <= X + 5 and z["p_09"] == 4 and z["bst"] in (2, 3) and z["anim"] != ANIM_G), "")
        for z in rows:
            if erst or z["f"] < X:
                continue
            if z["bst"] == 2 and z["anim"] == ANIM_G:
                erst = f"{z['f'] - X}:Boss packt"
                break
            if z["b_akt"] == 6:
                erst = f"{z['f'] - X}:Angriff " + angriffsart_bei(format(z['anim'], '06x'), '06') + f" ({z['anim']:06x})"
                break
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "X": X,
                       "boss_in_X-1": f"{zx['bst']}/{zx['b_akt']:02x}/{zx['b_ph']:02x}/{zx['anim']:06x}",
                       "erste_reaktion": erst})
    schreibe(zeilen, out, "M griff: Figur in X nahe vor den Boss gesetzt (gf: Figur geht auf ihn zu; bg: Figur passiv); "
             "erste_reaktion = Frame relativ zu X und Art")

    # ---- Reichweiten
    zeilen = []
    for l in gruppe("dk_") + gruppe("ds_") + gruppe("dr_"):
        rows = rows_von(l["lauf"])
        art = info_wert(l["info"], "art")
        anim, ab = {"K": (ANIM_K, 30), "S": (ANIM_S, 100), "R": (ANIM_R_LAUF, 600)}[art]
        p = probe(rows, anim, ab=ab, fenster=90)
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "A": p.get("A", ""), "treffer": p.get("treffer", ""),
                       "dx": p.get("dx", ""), "dz": p.get("dz", ""), "ph": p.get("ph", ""), "blick": p.get("blick", "")})
    schreibe(zeilen, out, "M proben: Figur ab A+1 relativ zum Boss (K, S) bzw. in Tiefe/Hoehe mitgefuehrt (R); "
             "treffer = Frame relativ zu A (leer: keiner im Fenster)")
    zeilen = []
    for l in gruppe("dkz_"):
        rows = rows_von(l["lauf"])
        erst = next((z for z in rows if z["f"] >= 40 and (z["b_akt"] == 6 or z["bst"] == 2)), None)
        zeilen.append({"lauf": l["lauf"], "info": l["info"],
                       "angriff_ab": erst["f"] if erst else "", "art": f"{erst['anim']:06x}" if erst else "",
                       "dz_dabei": erst["dz"] if erst else ""})
    schreibe(zeilen, out, "M ausloeser: Boss in Frame 40 bei 45 px vor die Figur gesetzt, Tiefe dz = Boss - Figur")
    zeilen = []
    for l in gruppe("dp_"):
        rows = rows_von(l["lauf"])
        A = next(z["f"] for k, z in enumerate(rows) if k and z["f"] >= 1200 and z["anim"] == ANIM_P
                 and rows[k - 1]["anim"] != ANIM_P)
        F = int(info_wert(l["info"], "F"))
        zf = next(z for z in rows if z["f"] == A + F)
        hit = next((z["f"] - A for z in rows if A + F <= z["f"] <= A + F + 1 and z["p_lp"] < 72), "")
        land = next((z["f"] - A for z in rows if z["f"] > A + 10 and z["bh"] < 0.5), "")
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "A": A, "F": F, "treffer": hit, "bh_F": round(zf["bh"], 2),
                       "dx_F": zf["dx"], "x_boss_F": round(zf["bx"], 2), "x_figur_F": round(zf["px"], 2),
                       "blick": zf["blick"], "landung": land})
    schreibe(zeilen, out, "M presse: Figur nur im Frame A+F bei d vor dem Boss bzw. am Landepunkt (x unveraendert), "
             "sonst 40 px in der Tiefe entfernt; treffer = A+F oder A+F+1")

    # ---- lange Laeufe: Rhythmus, Wahl, Bot
    zeilen = []
    for l in gruppe("e_") + gruppe("bot_"):
        rows = rows_von(l["lauf"])
        res, an = rhythmus(rows, ab=2)
        ab_ = res["abstaende"]
        anteile = {}
        for d in an:
            anteile[d["art"]] = anteile.get(d["art"], 0) + 1
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "frames": len(rows), "angriffe": res["angriffe"],
                       "anteile": " ".join(f"{k}:{v}" for k, v in sorted(anteile.items())),
                       "abstand_min": min(ab_) if ab_ else "", "abstand_median": median(ab_) if ab_ else "",
                       "abstand_max": max(ab_) if ab_ else "",
                       "wahl_nach_abstand": " | ".join(f"{k}: " + ",".join(f"{a}{n}" for a, n in sorted(v.items()))
                                                     for k, v in sorted(res["wahl_nach_abstand"].items()))})
    schreibe(zeilen, out, "M rhythmus: lange Laeufe ab boss_q_m (passiv Rang 9, 16, 24; Bot Rang 20 und 16)")

    # ---- Ausbruch und geschuetzte Presse
    zeilen, zucken = [], 0
    for l in gruppe("e_") + gruppe("bot_") + gruppe("t") + gruppe("au_"):
        rows = rows_von(l["lauf"])
        zucken += sum(1 for e in lp_ereignisse(rows) if e["reaktion"] == "Zucken") if "bot" in l["lauf"] else 0
        for k in range(1, len(rows)):
            z, v = rows[k], rows[k - 1]
            if z["anim"] == ANIM_P and v["anim"] != ANIM_P:
                vor = next((rows[j] for j in range(k - 1, 0, -1) if rows[j]["b_akt"] != 6 or rows[j]["bst"] != 1), None)
                zeilen.append({"lauf": l["lauf"], "A": z["f"], "rang": z["rang"], "schutz_A": z["schutz"],
                               "schutz_A+1": rows[k + 1]["schutz"] if k + 1 < len(rows) else "",
                               "vorher": f"{vor['bst']}/{vor['b_akt']:02x}/{vor['anim']:06x}@{z['f'] - vor['f']}" if vor else "",
                               "direkt_aus_st3": "ja" if v["bst"] == 3 else "nein"})
    schreibe(zeilen, out, "M presse schutz: jeder Beginn der Koerperpresse; schutz = S+0xAE; vorher = letzter Zustand vor "
             "der Aktion 6 (S+4/Aktion/Animation@Frames davor)")
    klassen = {}
    for z in zeilen:
        k = ("aus der Trefferreaktion" if z["direkt_aus_st3"] == "ja" else
             ("ohne Vorphase (1 Frame nach Gehen)" if z["vorher"].endswith("@1") else "mit Vorphase (Aktion 6 Phase 0/2)"))
        c = klassen.setdefault(k, [0, 0])
        c[0] += 1
        if isinstance(z["schutz_A"], int) and z["schutz_A"] > 0:
            c[1] += 1
    out.write("# M presse schutz Summe: " + "; ".join(f"{k}: {v[0]} Pressen, davon {v[1]} mit Schutzzaehler > 0"
                                                     for k, v in sorted(klassen.items())) + "\n")
    n_aus = sum(1 for z in zeilen if z["direkt_aus_st3"] == "ja" and "bot" in z["lauf"])
    out.write(f"# M ausbruch Summe: {n_aus} Pressen direkt aus der Trefferreaktion bei {zucken} Zuck-Reaktionen in den "
              f"Bot-Laeufen der dritten Messung\n")

    # ---- Wellen
    zeilen = []
    for l in gruppe("f_"):
        rows = rows_von(l["lauf"])
        idx = {z["f"]: k for k, z in enumerate(rows)}
        for w in wellen(rows):
            if w["frame"] <= 3:
                continue
            z = rows[idx[w["frame"]] - 1]
            lebend = sum(1 for n in range(19) if f"s{n}_st" in z and z[f"s{n}_st"] != 0 and z[f"s{n}_lp"] >= 0)
            zeilen.append({"lauf": l["lauf"], "info": l["info"], **w, "gegner_lebend_vorher": lebend})
    schreibe(zeilen, out, "M wellen: neu belegte Gegnerslots (gegner_lebend_vorher = belegte Slots 0-18 mit LP >= 0 "
             "im Frame davor)")

    # ---- Fall
    zeilen = []
    for l in gruppe("t"):
        rows = rows_von(l["lauf"])
        r = fall(rows)
        if r.get("fall") == "kein":
            continue
        t = r["t"]
        sieg = next((z["f"] - t for z in rows if z["f"] > t and z["p_akt"] == 0x18), "")
        bilder = sorted((RAW / "snap").glob(f"{l['lauf']}_*.png"), key=lambda b: int(b.stem.rsplit("_", 1)[1]))
        erst_gold = erst_100 = erst_rand = ""
        for b in bilder:
            f = int(b.stem.rsplit("_", 1)[1])
            w, h, img = png_lesen(b)
            n = rand = 0
            for y in range(140, 162):
                zz = img[y]
                for x in range(w):
                    rr, g, bb = zz[3 * x], zz[3 * x + 1], zz[3 * x + 2]
                    if rr > 200 and 120 < g < 200 and bb < 90:
                        n += 1
                        if x >= w - 40:
                            rand += 1
            if n and erst_gold == "":
                erst_gold = f - t
            if n >= 100 and erst_100 == "":
                erst_100 = f - t
            if rand and erst_rand == "":
                erst_rand = f - t
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "t": t, "siegerpose": sieg,
                       "gold_erstes_pixel": erst_gold, "gold_100_pixel": erst_100, "gold_rechter_rand": erst_rand,
                       "stagewechsel": r.get("stagewechsel", ""), "slot_frei": r.get("slot_frei", ""),
                       "andere": r.get("andere", "")})
    schreibe(zeilen, out, "M fall: Tod (t = LP < 0); Schriftzug in den Aufnahmen (jedes Frame): erstes Goldpixel, "
             "erster Frame mit 100 Goldpixeln (Kriterium des Messagenten), erstes Goldpixel in den rechten 40 Bildspalten")

    # ---- Wurf des Bosses: Weite nach zwei Massen
    zeilen = []
    for l in gruppe("wurf") + gruppe("e_") + gruppe("bot_"):
        rows = rows_von(l["lauf"])
        idx = {z["f"]: k for k, z in enumerate(rows)}
        for a in angriffe(rows):
            if a["art"] != "G" or a.get("wurf", "") == "":
                continue
            i, j = idx[a["A"]], idx[a["A"] + a["wurf"]]
            sgn = -1 if a["blick"] == "l" else 1
            hoch, boden = False, None
            for k in range(j, min(j + 150, len(rows))):
                if rows[k]["ph"] > 2:
                    hoch = True
                if hoch and rows[k]["ph"] < 1:
                    boden = k
                    break
            zeilen.append({"lauf": l["lauf"], "A": a["A"], "blick": a["blick"], "wurf_A+": a["wurf"],
                           "x_boss_rel_kamera": round(rows[i]["bx"] - rows[i]["camx"], 1),
                           "boden_A+": (rows[boden]["f"] - a["A"]) if boden else "",
                           "boden_minus_griffort": round((rows[boden]["px"] - rows[i]["px"]) * sgn, 2) if boden else "",
                           "ruhe_minus_wurfort": a.get("wurf_figur_x", ""), "richtung": a.get("wurf_richtung", "")})
    schreibe(zeilen, out, "M wurf: Wurf des Bosses; boden_minus_griffort = x der Figur beim ersten Bodenkontakt minus x "
             "beim Griff (positiv = in Blickrichtung des Bosses); ruhe_minus_wurfort = Weg der Figur vom Wurf bis zur "
             "Ruhe (Mass des Messagenten)")

    # ---- Nach dem Aufstehen
    zeilen = []
    for l in gruppe("au_"):
        rows = rows_von(l["lauf"])
        ev = lp_ereignisse(rows)
        if not ev or ev[0]["frei_ab"] == "":
            continue
        G = ev[0]["h"] + ev[0]["frei_ab"]
        erst = ""
        for z in rows:
            if z["f"] < G:
                continue
            if z["bst"] == 2 and z["anim"] == ANIM_G:
                erst = f"G+{z['f'] - G}:Griff"
                break
            if z["b_akt"] == 6:
                erst = f"G+{z['f'] - G}:" + angriffsart_bei(format(z['anim'], '06x'), '06') + f" ({z['anim']:06x})"
                break
        zg = next(z for z in rows if z["f"] == G)
        zeilen.append({"lauf": l["lauf"], "info": l["info"], "K": ev[0]["h"], "G": G, "dx_G": zg["dx"],
                       "erste_aktion": erst})
    schreibe(zeilen, out, "M aufstehen: erste Aktion nach dem Aufstehen (Sprintangriff wirft um)")


def cmd_dritte(args):
    laeufe = [l for l in manifest(args.manifest) if l["teil"] == "M"]
    cache = {}

    def rows_von(lauf):
        if lauf not in cache:
            cache[lauf] = lade(lauf)
        return cache[lauf]
    with open(args.aus, "w") as out:
        dritte(out, laeufe, rows_von)


if __name__ == "__main__":
    main()
