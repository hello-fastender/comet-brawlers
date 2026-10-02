#!/usr/bin/env python3
"""Gegenpruefung "Boss DOLG" (Agent V6, Praefix boss_v).

Liest nur die Watch-Protokolle von scenarios/boss_v_frei.lua
(logs/raw/<lauf>_watch.csv) und die Bot-Protokolle von
scenarios/boss_v_bot.lua (logs/raw/<lauf>_bot.csv). Nur Standardbibliothek.
Boss = Slot 19 (Typ 0x46DA4). h = Frame, in dem die LP des Bosses sinken.
"""
import argparse
import csv
import os
import sys

RAW = os.environ.get("BOSS_V_RAW") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs", "raw")
DOLG = 0x46DA4
BOSS_SLOT = 19
# Spalten der Bot-CSV auf die Namen des Watch-CSV abbilden
BOTNAMEN = {"px": "p_x", "pd": "p_z", "ph": "p_h", "pact": "p_akt", "php": "p_lp", "face": "p_blick",
            "pang": "p_ang", "griff": "p_griff", "pphase": "p_ph"}
# Angriffe des Bosses: erste Animation (S+0x1C) beim Beginn A
ANGRIFF_ANIM = {0x4A67C: "S", 0x4B842: "P"}


def lade(lauf):
    """Watch- oder Bot-CSV eines Laufs als Liste von Dicts (Ganzzahlen)."""
    if lauf.endswith(".csv"):
        pfad = lauf
    elif os.path.exists(os.path.join(RAW, lauf + "_watch.csv")):
        pfad = os.path.join(RAW, lauf + "_watch.csv")
    else:
        pfad = os.path.join(RAW, lauf + "_bot.csv")
    zeilen = []
    with open(pfad, newline="") as f:
        r = csv.reader(f)
        kopf = [BOTNAMEN.get(k, k) for k in next(r)]
        for z in r:
            d = {}
            for k, v in zip(kopf, z):
                try:
                    d[k] = int(v)
                except ValueError:
                    d[k] = v
            if "pstat" in d and "p_st" not in d:
                d["p_st"] = d["pstat"] << 8
            zeilen.append(d)
    return zeilen


def name(lauf):
    return os.path.basename(lauf).replace("_watch.csv", "").replace("_bot.csv", "")


def slot_von(wort):
    """Zeigerwort (S+4 des Angreifers) -> Slot; -1 = kein Gegnerslot."""
    a = 0xFF0000 + wort - 4
    if 0xFFBC90 <= a < 0xFFBC90 + 60 * 0xC0 and (a - 0xFFBC90) % 0xC0 == 0:
        return (a - 0xFFBC90) // 0xC0
    return -1


def st(z):
    return z["b_st"] >> 8


def boss_da(z):
    return z.get("b_typ") == DOLG and st(z) != 0


def art_figur(z):
    """Angriffsart der Figur im Trefferframe aus Aktion, Unterphase, Griff, Kombo, Waffe."""
    akt, ph, kombo = z.get("p_akt", -1), z.get("p_ph", -1), z.get("kombo", -1)
    if z.get("p_griff") == 4 or (akt == 0 and ph in (4, 6) and z.get("p_griff") == 4):
        return "knie" if ph == 4 else ("wurf" if ph == 6 else "griff%d" % ph)
    if akt == 0x10:
        return "stufe%d" % (kombo // 4 + 1) if kombo >= 0 else "schlag"
    return {0x0E: "sprungangriff", 0x06: "sprintangriff", 0x08: "sprintsprungangriff", 0x14: "spezial",
            0x16: "waffe", 0x00: "stand"}.get(akt, "akt%x" % akt)


def treffer(zeilen, ab=1):
    """Treffer auf den Boss: LP sinken von f-1 nach f."""
    erg = []
    for i in range(1, len(zeilen)):
        a, z = zeilen[i - 1], zeilen[i]
        if z["frame"] < ab or not boss_da(z) or not boss_da(a):
            continue
        if z["b_lp"] < a["b_lp"]:
            erg.append(i)
    return erg


def reaktion(zeilen, i):
    """Beschreibt den Treffer in Zeile i und die Reaktion des Bosses."""
    z, v = zeilen[i], zeilen[i - 1]
    h = z["frame"]
    n = zeilen[i + 1] if i + 1 < len(zeilen) else None
    d = {"h": h, "lp_vor": v["b_lp"], "lp": z["b_lp"], "schaden": v["b_lp"] - z["b_lp"],
         "art": art_figur(z), "p_akt": z.get("p_akt"), "kombo": z.get("kombo"),
         "rang": z.get("rang"), "b_akt_vor": v["b_akt"], "b_st_vor": st(v), "b_fl": z.get("b_fl"),
         "b_fl_vor": v.get("b_fl"), "zurueck": 0, "folge": ""}
    if n is not None and n["b_lp"] > z["b_lp"] and boss_da(n):
        d["zurueck"] = n["b_lp"] - z["b_lp"]
    # Art genauer: Rakete (Reaktion Aktion 0x14), Laser (Waffeneinsatz), Sprungangriff neutral/hoch nach Schaden
    if n is not None and n["b_akt"] == 0x14:
        d["art"] = "rakete"
    elif d["art"] == "waffe":
        d["art"] = "laser" if d["schaden"] == 6 else "waffe"
    elif d["art"] == "sprungangriff":
        d["art"] = {7: "sprungangriff_neutral", 12: "sprungangriff_hoch"}.get(d["schaden"], "sprungangriff")
    # Folge: Wechsel von (Zustand, Aktion) ab h
    seq, alt = [], None
    x0 = z["b_x"]
    for k in range(i, min(len(zeilen), i + 260)):
        y = zeilen[k]
        if k > i and y["b_lp"] < zeilen[k - 1]["b_lp"]:
            seq.append("T@%d" % (y["frame"] - h))
            break
        key = (st(y), y["b_akt"])
        if key != alt:
            seq.append("%d/%x@%d" % (key[0], key[1], y["frame"] - h))
            alt = key
    d["folge"] = " ".join(seq)
    # Rueckzug (Aktion 8) bzw. Zucken (Zustand 3) ab h
    def dauer(bed, start):
        k = start
        while k < len(zeilen) and bed(zeilen[k]):
            k += 1
        return k - start, (zeilen[k]["frame"] if k < len(zeilen) else None)
    d["st3_dauer"], _ = dauer(lambda y: st(y) == 3 and y["b_lp"] >= z["b_lp"] - 0, i)
    if n is not None and n["b_akt"] == 8:
        lang, ende = dauer(lambda y: y["b_akt"] == 8, i + 1)
        d["rueckzug"] = lang
        k = i + lang
        d["rueckzug_dx"] = zeilen[k]["b_x"] - x0 if k < len(zeilen) else None
    return d


def frei_ab(zeilen, i, bed):
    """Erster Frame ab Zeile i, fuer den bed(zeile) gilt."""
    for k in range(i, len(zeilen)):
        if bed(zeilen[k]):
            return zeilen[k]["frame"], k
    return None, None


def figur_treffer(zeilen):
    """LP-Verluste der Figur (LP vor jedem Frame auf 72 aufgefuellt) mit Angreifer."""
    erg = []
    for i, z in enumerate(zeilen):
        if z.get("p_lp", 72) < 72 and (i == 0 or True):
            vor = 72
            erg.append({"frame": z["frame"], "schaden": vor - z["p_lp"], "slot": slot_von(z.get("p_ang", 0)),
                        "b_anim": z.get("b_anim"), "b_akt": z.get("b_akt"), "b_att": z.get("b_att"),
                        "dx": z.get("p_x", 0) - z.get("b_x", 0), "dz": z.get("p_z", 0) - z.get("b_z", 0),
                        "p_h": z.get("p_h"), "rang": z.get("rang"), "b_dmg": z.get("b_dmg")})
    return erg


BOSS_PTR = (0xFFBC90 + BOSS_SLOT * 0xC0 + 4) & 0xFFFF
ANIM_K, ANIM_S, ANIM_R, ANIM_RLAUF, ANIM_P, ANIM_G = 0x4A97E, 0x4A67C, 0x4A6CA, 0x4A26A, 0x4B842, 0x4ABDE


def angriffe(zeilen):
    """Angriffe des Bosses mit Beginn A (erster Frame der ersten Angriffsanimation):
    K kurzer Schlag (4A97E), S Armschwung (4A67C, Serie bis zu drei Schwüngen),
    R Ansturm (Ausholen 4A6CA vor dem Lauf 4A26A, A = Beginn des Ausholens),
    P Körperpresse (4B842), G Griff (4ABDE, Boss packt die Figur)."""
    erg = []
    i = 1
    n = len(zeilen)
    while i < n:
        z, v = zeilen[i], zeilen[i - 1]
        if not boss_da(z) or z["b_akt"] == 0x0A:
            i += 1
            continue
        an, av = z["b_anim"], v["b_anim"]
        typ = None
        if an != av:
            if an == ANIM_K:
                typ = "K"
            elif an == ANIM_S and z["b_akt"] == 6:
                typ = "S"
            elif an == ANIM_P:
                typ = "P"
            elif an == ANIM_G:
                typ = "G"
            elif an == ANIM_R and z["b_akt"] == 6 and z["b_ph"] == 2:
                # Ansturm nur, wenn danach der Lauf 4A26A folgt
                for k in range(i, min(n, i + 30)):
                    if zeilen[k]["b_anim"] == ANIM_RLAUF:
                        typ = "R"
                        break
                    if zeilen[k]["b_akt"] != 6:
                        break
        if typ is None:
            i += 1
            continue
        d = beschreibe(zeilen, i, typ)
        erg.append(d)
        i = d["_ende"] + 1
    return erg


def beschreibe(zeilen, i, typ):
    """Ablauf eines Angriffs ab Zeile i (A)."""
    n = len(zeilen)
    z = zeilen[i]
    A = z["frame"]
    # Entscheidung: Beginn der Aktion 6 (bzw. 0 beim Griff) vor A
    k = i
    while k > 0 and zeilen[k - 1]["b_akt"] == z["b_akt"] and zeilen[k - 1]["b_akt"] == 6 and A - zeilen[k - 1]["frame"] < 200:
        k -= 1
    ent = zeilen[k]
    blick = blickrichtung(z)
    # Ende: Aktion verlaesst 6 (bzw. beim Griff: Boss wieder Zustand 1)
    e = i
    if typ == "G":
        while e + 1 < n and st(zeilen[e + 1]) == 2 and boss_da(zeilen[e + 1]):
            e += 1
    else:
        while e + 1 < n and zeilen[e + 1]["b_akt"] == 6 and boss_da(zeilen[e + 1]):
            e += 1
    seg = zeilen[i:e + 1]
    aktiv = [y["frame"] - A for y in seg if aktiv_attr(y["b_att"])]
    # zusammenhaengende aktive Abschnitte
    abschn = []
    for f in aktiv:
        if abschn and f == abschn[-1][1] + 1:
            abschn[-1][1] = f
        else:
            abschn.append([f, f])
    hits = []
    for y in zeilen[i:min(n, e + 4)]:
        if y.get("p_lp", 72) < 72 and y.get("p_ang") == BOSS_PTR:
            hits.append((y["frame"] - A, 72 - y["p_lp"]))
    umgeworfen = any(y.get("p_akt") == 0x0C for y in zeilen[i:min(n, e + 10)]) if hits else False
    schwuenge = sum(1 for a, b in zip(seg, seg[1:]) if b["b_anim"] == ANIM_S and a["b_anim"] != ANIM_S) + (1 if typ == "S" else 0)
    hmax = max(y["b_h"] for y in seg)
    scheitel = next(y["frame"] - A for y in seg if y["b_h"] == hmax)
    landung = None
    if typ == "P":
        for y in seg:
            if y["frame"] - A > scheitel and y["b_h"] <= 0:
                landung = y["frame"] - A
                break
    nach = zeilen[e + 1] if e + 1 < n else zeilen[e]
    d = {"_ende": e, "typ": typ if typ != "S" else ("S%d" % schwuenge if schwuenge > 1 else "S"), "A": A,
         "entscheidung": ent["frame"] - A,
         "d_ent": (ent.get("p_x", 0) - ent["b_x"]) * blickrichtung(ent), "dz_ent": ent.get("p_z", 0) - ent["b_z"],
         "d_A": (z.get("p_x", 0) - z["b_x"]) * blick, "dz_A": z.get("p_z", 0) - z["b_z"],
         "aktiv": ";".join("%d-%d" % (a, b) for a, b in abschn), "treffer": ";".join("%d:%d" % h for h in hits),
         "umgeworfen": int(umgeworfen), "ende": e - i, "rang": z.get("rang"), "dmg": zeilen[min(e, i + 2)].get("b_dmg"),
         "hoehe": hmax, "scheitel": scheitel, "landung": landung,
         "x_A": z["b_x"], "x_ende": zeilen[e]["b_x"], "p_x_A": z.get("p_x"), "p_lage_treffer": ""}
    if hits:
        y = next(y for y in zeilen[i:min(n, e + 4)] if y.get("p_lp", 72) < 72 and y.get("p_ang") == BOSS_PTR)
        d["p_lage_treffer"] = "%d/%d/%d" % ((y.get("p_x", 0) - y["b_x"]) * blickrichtung(y), y.get("p_z", 0) - y["b_z"], y.get("p_h", 0))
    if typ == "G":
        # Figur losgelassen/geworfen: Ende von p_griff 6; Wurfweite bis zur Ruhe der Figur
        los = next((y for y in zeilen[i:min(n, i + 300)] if y.get("p_griff") != 6 and y["frame"] > A + 2), None)
        d["halten_bis"] = (los["frame"] - A) if los else None
        if hits:
            hf = A + hits[0][0]
            ruhe = None
            for y in zeilen:
                if y["frame"] > hf + 5 and y.get("p_h", 0) == 0 and y.get("p_akt") == 0x0C:
                    ruhe = y
                    break
            if ruhe:
                d["wurfweite"] = (ruhe["p_x"] - z.get("p_x", 0)) * blick
    return d


def blickrichtung(z):
    # S+0x5E: Bit 0x20 = Blick rechts (wie bei der Figur, bot.lua)
    return 1 if z.get("b_blick", 0) & 0x20 else -1


def aktiv_attr(att):
    """Trefferattribut S+0x24 eines aktiven Angriffsframes (0x4002, 0x4C02, 0x4C0C ...),
    nicht 0x8000 (Frame davor), 0xFF00 (Ende) oder 0x7D00 (Griff)."""
    return (att & 0xC000) == 0x4000 and (att & 0xFF) != 0


def umwerfen(zeilen, i):
    """Umwerfender Treffer in Zeile i (K = h): Flug, Bodenkontakt, Ruhe, Aufstehen, G."""
    z = zeilen[i]
    K = z["frame"]
    x0, xf0 = z["b_x"], z.get("b_xf", 0)
    d = {"K": K, "x_K": x0}
    flug = [y for y in zeilen[i:i + 400]]
    # Phasen der Aktion 0x0C bzw. 0x12/0x14/0x1E
    ph, alt = [], None
    for y in flug:
        key = (st(y), y["b_akt"], y["b_ph"])
        if key != alt:
            ph.append("%d/%x/%x@%d" % (key[0], key[1], key[2], y["frame"] - K))
            alt = key
        if st(y) == 1 and y["frame"] > K and y["b_akt"] not in (0x0C,):
            break
    d["phasen"] = " ".join(ph)
    hmax, fmax = 0, None
    boden = None
    for y in flug:
        h = y["b_h"] + y.get("b_hf", 0) / 65536.0
        if fmax is not None and y["frame"] > fmax and y["b_h"] <= 0:
            boden = y
            break
        if h > hmax:
            hmax, fmax = h, y["frame"]
    d["scheitel"] = round(hmax, 3)
    d["scheitel_bei"] = (fmax - K) if fmax else None
    d["boden_bei"] = (boden["frame"] - K) if boden else None
    d["dx_boden"] = round(abs((boden["b_x"] + boden.get("b_xf", 0) / 65536.0) - (x0 + xf0 / 65536.0)), 3) if boden else None
    G, k = frei_ab(zeilen, i + 1, lambda y: st(y) == 1)
    d["G"] = (G - K) if G else None
    if k is not None:
        y = zeilen[k]
        d["dx_G"] = round(abs((y["b_x"] + y.get("b_xf", 0) / 65536.0) - (x0 + xf0 / 65536.0)), 3)
        d["x_G"] = y["b_x"]
        # erster Frame mit Trefferflaeche S+0x28 != 0 ab G
        fl, _ = frei_ab(zeilen, k, lambda y: y.get("b_fl", 1) != 0)
        d["flaeche_ab"] = (fl - G) if fl else None
        d["ae_G"] = y.get("b_ae")
    leer, _ = frei_ab(zeilen, i, lambda y: y.get("b_fl", 1) == 0)
    d["flaeche_leer_ab"] = (leer - K) if leer else None
    return d


def zittern(zeilen, i, n=27):
    """x-Abweichung des Bosses in h..h+n relativ zu x in h (nur Frames mit Abweichung)."""
    x0 = zeilen[i]["b_x"]
    erg = []
    for k in range(i, min(len(zeilen), i + n)):
        dx = zeilen[k]["b_x"] - x0
        if dx:
            erg.append("%+d@%d" % (dx, zeilen[k]["frame"] - zeilen[i]["frame"]))
    return " ".join(erg)


# ---------------------------------------------------------------- Ausgaben

def schreibe(kopf, zeilen, aus=sys.stdout):
    w = csv.writer(aus, lineterminator="\n")
    w.writerow(kopf)
    for z in zeilen:
        w.writerow([z.get(k, "") if not isinstance(z.get(k), list) else ";".join(map(str, z.get(k))) for k in kopf])


def cmd_zeit(a):
    zeilen = lade(a.lauf)
    spalten = a.spalten.split(",")
    print("frame," + ",".join(spalten))
    for z in zeilen:
        if a.von <= z["frame"] <= a.bis:
            out = []
            for s in spalten:
                n, _, h = s.partition(":")
                v = z.get(n, "")
                out.append("%x" % (v & 0xFFFFFFFF) if h == "x" and isinstance(v, int) else str(v))
            print("%d,%s" % (z["frame"], ",".join(out)))


def cmd_treffer(a):
    kopf = ["lauf", "h", "art", "schaden", "lp_vor", "lp", "zurueck", "rang", "kombo", "p_akt", "b_st_vor",
            "b_akt_vor", "st3_dauer", "rueckzug", "rueckzug_dx", "folge"]
    alle = []
    for lauf in a.lauf:
        zeilen = lade(lauf)
        for i in treffer(zeilen, a.ab):
            d = reaktion(zeilen, i)
            d["lauf"] = name(lauf)
            alle.append(d)
    schreibe(kopf, alle)


def cmd_umwerfen(a):
    kopf = ["lauf", "K", "art", "schaden", "zurueck", "x_K", "scheitel", "scheitel_bei", "boden_bei", "dx_boden",
            "G", "dx_G", "x_G", "flaeche_leer_ab", "flaeche_ab", "ae_G", "phasen"]
    alle = []
    for lauf in a.lauf:
        zeilen = lade(lauf)
        for i in treffer(zeilen, a.ab):
            n = zeilen[i + 1] if i + 1 < len(zeilen) else zeilen[i]
            if n["b_akt"] in (0x0C, 0x12, 0x14, 0x1E) or zeilen[i]["b_akt"] == 0x0C:
                d = umwerfen(zeilen, i)
                r = reaktion(zeilen, i)
                d.update({"lauf": name(lauf), "art": r["art"], "schaden": r["schaden"], "zurueck": r["zurueck"]})
                alle.append(d)
    schreibe(kopf, alle)


def cmd_zittern(a):
    kopf = ["lauf", "h", "art", "zurueck", "st3_dauer", "zittern", "folge"]
    alle = []
    for lauf in a.lauf:
        zeilen = lade(lauf)
        for i in treffer(zeilen, a.ab):
            r = reaktion(zeilen, i)
            r["lauf"] = name(lauf)
            r["zittern"] = zittern(zeilen, i)
            alle.append(r)
    schreibe(kopf, alle)


def cmd_figur(a):
    kopf = ["lauf", "frame", "schaden", "slot", "b_akt", "b_anim", "b_att", "b_dmg", "dx", "dz", "p_h", "rang"]
    alle = []
    for lauf in a.lauf:
        for d in figur_treffer(lade(lauf)):
            d["lauf"] = name(lauf)
            d["b_anim"] = "%x" % d["b_anim"] if isinstance(d["b_anim"], int) else ""
            d["b_att"] = "%x" % d["b_att"] if isinstance(d["b_att"], int) else ""
            alle.append(d)
    schreibe(kopf, alle)


def cmd_angriffe(a):
    kopf = ["lauf", "typ", "A", "entscheidung", "d_ent", "dz_ent", "d_A", "dz_A", "aktiv", "treffer", "umgeworfen",
            "p_lage_treffer", "ende", "rang", "dmg", "hoehe", "scheitel", "landung", "x_A", "x_ende", "p_x_A",
            "halten_bis", "wurfweite"]
    alle = []
    for lauf in a.lauf:
        for d in angriffe(lade(lauf)):
            d["lauf"] = name(lauf)
            alle.append(d)
    schreibe(kopf, alle)


# ---------------------------------------------------------------- Belege (logs/boss_v.csv)

def png_pixel(pfad):
    """PNG (RGB, 8 Bit) aus MAME-Bildschirmfotos dekodieren: Liste von Zeilen (bytearray)."""
    import struct
    import zlib
    d = open(pfad, "rb").read()
    i, idat, w, h = 8, b"", 0, 0
    while i < len(d):
        l = struct.unpack(">I", d[i:i + 4])[0]
        t, c = d[i + 4:i + 8], d[i + 8:i + 8 + l]
        if t == b"IHDR":
            w, h = struct.unpack(">II", c[:8])
        elif t == b"IDAT":
            idat += c
        i += 12 + l
    raw = zlib.decompress(idat)
    bpp, stride = 3, w * 3
    out, prev = [], bytearray(stride)
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
        out.append(line)
        prev = line
    return w, h, out


def orange_rechts(pfad):
    """Orange Pixel (Schriftzug STAGE 1 CLEAR) am rechten Bildrand, x >= 330, y 135-164."""
    w, h, img = png_pixel(pfad)
    n = 0
    for y in range(135, 165):
        row = img[y]
        for x in range(330, w):
            r, g, b = row[x * 3], row[x * 3 + 1], row[x * 3 + 2]
            if r > 200 and 100 < g < 210 and b < 90:
                n += 1
    return n


def stand_typ(r):
    return "zurueck" if r["zurueck"] == r["schaden"] else ("halb" if r["zurueck"] else "dauerhaft")


def kopf(aus, titel, spalten):
    aus.write("\n# %s\n" % titel)
    aus.write(",".join(spalten) + "\n")


def zeile(aus, werte):
    aus.write(",".join("" if v is None else str(v).replace(",", ";") for v in werte) + "\n")


def lies_manifest(pfad):
    erg = []
    with open(pfad) as f:
        for z in f:
            t = z.rstrip("\n").split("\t")
            if len(t) >= 4:
                erg.append({"teil": t[0], "lauf": t[1], "st": t[2], "info": t[3]})
    return erg


def cmd_belege(a):
    import statistics
    from collections import Counter, defaultdict
    man = lies_manifest(a.manifest)
    daten = {}

    def z_von(lauf):
        if lauf not in daten:
            daten[lauf] = lade(lauf)
        return daten[lauf]

    def teil(*t):
        return [m for m in man if m["teil"] in t and (os.path.exists(os.path.join(RAW, m["lauf"] + "_watch.csv"))
                                                         or os.path.exists(os.path.join(RAW, m["lauf"] + "_bot.csv")))]

    aus = open(a.aus, "w")
    aus.write("# boss_v.csv: Gegenpruefung V6 zum Boss DOLG (Praefix boss_v), erzeugt von scripts/belege_boss.sh (Teil V)\n")
    aus.write("# mit scripts/messen_boss_v.py belege. Boss = Slot 19. h = Frame, in dem die LP des Bosses sinken; A = erster\n")
    aus.write("# Frame der ersten Angriffsanimation (K 4A97E, S 4A67C, R Laufbeginn 4A26A bzw. Ausholen, P 4B842, G 4ABDE).\n")
    aus.write("# EINGRIFFE: LP der Figur vor jedem Frame 72; Rang festgehalten (Spalte rang bzw. Lauf-Info); Lagen per\n")
    aus.write("# CC_SETZ/CC_FIG/CC_FIGV/CC_FIGA/CC_BOSS (Info-Spalte bzw. belege_boss.sh); LP des Bosses CC_BLP (Teil W, T);\n")
    aus.write("# Gegner entfernt CC_ENTF (Teil A2, Q, W); Bot: LP des Bosses unter 30 auf 97 (BV_BLP_MIN).\n")

    # ---- A: LP nach Rang
    kopf(aus, "V a rang", ["lauf", "savestate", "info", "kamera_2048_ab", "lp_ab", "rang_im_frame", "rang_vorher", "lp", "S+0xB7", "S+0x9A", "lp_ende", "rang_ende"])
    for m in teil("A"):
        z = z_von(m["lauf"])
        cam = next((r["frame"] for r in z if r["camx"] >= 2048), None)
        i = next((i for i, r in enumerate(z) if r["b_b7"] > 0), None)
        if i is None:
            zeile(aus, [m["lauf"], m["st"], m["info"], cam] + [None] * 8)
            continue
        r = z[i]
        zeile(aus, [m["lauf"], m["st"], m["info"], cam, r["frame"], r["rang"], z[i - 1]["rang"], r["b_lp"], r["b_b7"], r["b_9a"], z[-1]["b_lp"], z[-1]["rang"]])

    # ---- B/C: alle Treffer auf den Boss
    hits = []
    for m in teil("B", "T", "W", "U", "LI", "AU", "BOT", "P"):
        z = z_von(m["lauf"])
        for i in treffer(z, 3):
            r = reaktion(z, i)
            if m["teil"] == "BOT" and z[i]["b_lp"] < z[i - 1]["b_lp"] and z[i - 1]["b_lp"] - z[i]["b_lp"] > 40:
                continue
            r.update({"lauf": m["lauf"], "teil": m["teil"], "i": i, "fl_h": int(z[i]["b_fl"] != 0), "fl_v": int(z[i - 1]["b_fl"] != 0),
                      "b_anim_vor": "%x" % z[i - 1]["b_anim"], "att_vor": "%x" % z[i - 1]["b_att"], "att_h": "%x" % z[i]["b_att"]})
            hits.append(r)
    kopf(aus, "V b treffer", ["lauf", "teil", "h", "art", "schaden", "zurueck", "stand", "rang", "b_st_vor", "b_akt_vor", "b_anim_vor",
                               "att_vor", "att_h", "flaeche_h-1", "flaeche_h", "st3_dauer", "rueckzug", "rueckzug_dx", "folge"])
    for r in hits:
        zeile(aus, [r["lauf"], r["teil"], r["h"], r["art"], r["schaden"], r["zurueck"], stand_typ(r), r["rang"], r["b_st_vor"], r["b_akt_vor"],
                    r["b_anim_vor"], r["att_vor"], r["att_h"], r["fl_v"], r["fl_h"], r["st3_dauer"], r.get("rueckzug"), r.get("rueckzug_dx"), r["folge"]])
    kopf(aus, "V b arten", ["art", "rang", "n", "dauerhaft", "zurueck", "halb", "schaden"])
    c = defaultdict(Counter)
    dm = defaultdict(Counter)
    for r in hits:
        rg = r["rang"] if r["teil"] != "BOT" else r["rang"]
        c[(r["art"], rg)][stand_typ(r)] += 1
        dm[(r["art"], rg)][r["schaden"]] += 1
    for k in sorted(c, key=lambda k: (k[0], k[1] or 0)):
        v = c[k]
        zeile(aus, [k[0], k[1], sum(v.values()), v["dauerhaft"], v["zurueck"], v["halb"], " ".join("%d:%d" % x for x in sorted(dm[k].items()))])
    kopf(aus, "V b arten gesamt", ["art", "n", "dauerhaft", "zurueck", "halb"])
    cg = defaultdict(Counter)
    for r in hits:
        cg[r["art"]][stand_typ(r)] += 1
    for k in sorted(cg):
        v = cg[k]
        zeile(aus, [k, sum(v.values()), v["dauerhaft"], v["zurueck"], v["halb"]])
    # Rueckzug nach Zurueckweisung
    kopf(aus, "V b rueckzug", ["groesse", "werte (Wert:Anzahl)"])
    rz, dx, att, flp, frei, ae, leer = Counter(), Counter(), Counter(), Counter(), Counter(), Counter(), []
    for r in hits:
        if stand_typ(r) != "zurueck" or not r.get("rueckzug"):
            continue
        z = z_von(r["lauf"])
        i = r["i"]
        rz[r["rueckzug"]] += 1
        dx[abs(r.get("rueckzug_dx") or 0)] += 1
        seg = z[i + 1:i + 1 + r["rueckzug"]]
        att[int(any(aktiv_attr(y["b_att"]) for y in seg))] += 1
        flp[int(any(y.get("p_lp", 72) < 72 for y in seg))] += 1
        G, k = frei_ab(z, i + 1, lambda y: y["b_akt"] != 8)
        if k is not None:
            frei[G - r["h"]] += 1
            ae[z[k].get("b_ae")] += 1
        n = 0
        for y in z[i + 1:]:
            if y["b_fl"] != 0:
                break
            n += 1
        if i + 1 + n < len(z):
            leer.append(n)
    for name_, cc in (("Dauer Aktion 8 (Frames)", rz), ("|dx| im Rueckzug (px)", dx), ("aktive Frames im Rueckzug (1 = ja)", att),
                      ("Figur verliert LP im Rueckzug (1 = ja)", flp), ("frei ab h+", frei), ("Schutzzaehler S+0xAE dort", ae)):
        zeile(aus, [name_, " ".join("%s:%d" % x for x in sorted(cc.items(), key=lambda t: (t[0] is None, t[0])))])
    if leer:
        zeile(aus, ["Frames ohne Trefferflaeche ab h+1 (min/median/max)", "%d/%s/%d (n=%d)" % (min(leer), statistics.median(leer), max(leer), len(leer))])
    # Trefferflaeche im Trefferframe
    kopf(aus, "V c flaeche", ["S+0x28 in h-1 / h", "anzahl"])
    fc = Counter((r["fl_v"], r["fl_h"]) for r in hits if r["teil"] != "BOT" or True)
    for k, v in sorted(fc.items()):
        zeile(aus, ["%d/%d" % k, v])
    # Treffer im eigenen Angriff
    kopf(aus, "V c im angriff", ["lauf", "h", "art", "b_anim_vor", "att_vor", "att_h", "d_figur", "stand"])
    for r in hits:
        z = z_von(r["lauf"])
        v, hz = z[r["i"] - 1], z[r["i"]]
        if v["b_akt"] == 6 and (aktiv_attr(v["b_att"]) or aktiv_attr(hz["b_att"])):
            zeile(aus, [r["lauf"], r["h"], r["art"], r["b_anim_vor"], r["att_vor"], r["att_h"],
                        (v.get("p_x", 0) - v["b_x"]) * blickrichtung(v), stand_typ(r)])
    # Zittern
    kopf(aus, "V c zittern", ["lauf", "h", "art", "b_akt_vor", "st3_dauer", "zittern (dx@h+n)"])
    for r in hits:
        if r["art"] == "stufe1" and stand_typ(r) == "dauerhaft" and r["teil"] == "B":
            zeile(aus, [r["lauf"], r["h"], r["art"], r["b_akt_vor"], r["st3_dauer"], zittern(z_von(r["lauf"]), r["i"])])
    # Umwerfen
    kopf(aus, "V c umwerfen", ["lauf", "K", "art", "schaden", "zurueck", "x_K", "scheitel", "scheitel_bei", "boden_bei", "dx_boden",
                                "G", "dx_G", "x_G", "flaeche_ab_G+", "ae_G", "phasen"])
    for r in hits:
        z = z_von(r["lauf"])
        i = r["i"]
        n = z[i + 1] if i + 1 < len(z) else z[i]
        if (n["b_akt"] in (0x0C, 0x12, 0x14, 0x1E) or z[i]["b_akt"] == 0x0C) and stand_typ(r) != "zurueck":
            d = umwerfen(z, i)
            zeile(aus, [r["lauf"], d["K"], r["art"], r["schaden"], r["zurueck"], d["x_K"], d["scheitel"], d["scheitel_bei"], d["boden_bei"],
                        d["dx_boden"], d.get("G"), d.get("dx_G"), d.get("x_G"), d.get("flaeche_ab"), d.get("ae_G"), d["phasen"]])
    # Wurf der Figur: frei nach dem Wurftreffer
    kopf(aus, "V c wurf", ["lauf", "h", "frei_ab_h+", "x_h", "x_G"])
    for r in hits:
        if r["art"] != "wurf":
            continue
        z = z_von(r["lauf"])
        G, k = frei_ab(z, r["i"] + 1, lambda y: st(y) == 1)
        zeile(aus, [r["lauf"], r["h"], (G - r["h"]) if G else None, z[r["i"]]["b_x"], z[k]["b_x"] if k else None])

    # Griff durch die Figur: Lage im Frame vor dem Griff (d > 0: Figur vor dem Boss)
    kopf(aus, "V b griff", ["lauf", "teil", "griff_frame", "d_vorher", "dz_vorher", "boss_blick_vorher", "b_akt_vorher", "b_anim_vorher", "von"])
    for m in teil("B"):
        z = z_von(m["lauf"])
        for i in range(1, len(z)):
            if z[i].get("p_griff") == 4 and z[i - 1].get("p_griff") != 4:
                v = z[i - 1]
                d = (v["p_x"] - v["b_x"]) * blickrichtung(v)
                zeile(aus, [m["lauf"], m["teil"], z[i]["frame"], d, v["p_z"] - v["b_z"], v["b_blick"], v["b_akt"], "%x" % v["b_anim"],
                            "vorn" if d > 0 else "hinten"])
                break
    kopf(aus, "V b boss packt", ["lauf", "teil", "griff_frame", "d_vorher", "dz_vorher", "b_akt_vorher"])
    for m in teil("B"):
        z = z_von(m["lauf"])
        for i in range(1, len(z)):
            if z[i]["b_anim"] == ANIM_G and z[i - 1]["b_anim"] != ANIM_G:
                v = z[i - 1]
                zeile(aus, [m["lauf"], m["teil"], z[i]["frame"], (v["p_x"] - v["b_x"]) * blickrichtung(v), v["p_z"] - v["b_z"], v["b_akt"]])
                break

    # ---- D/E: Angriffe des Bosses
    alle = []
    for m in teil("P", "BOT", "B", "T", "W", "U", "LI", "AU"):
        for d in angriffe(z_von(m["lauf"])):
            d["lauf"], d["teil"] = m["lauf"], m["teil"]
            alle.append(d)
    kopf(aus, "V d angriffe", ["lauf", "teil", "typ", "A", "entscheidung", "d_ent", "dz_ent", "d_A", "dz_A", "aktiv", "treffer", "umgeworfen",
                                "p_lage_treffer", "ende", "rang", "dmg", "hoehe", "scheitel", "landung", "x_A", "x_ende", "p_x_A", "halten_bis", "wurfweite"])
    for d in alle:
        if d["teil"] in ("P", "BOT"):
            zeile(aus, [d["lauf"], d["teil"]] + [d.get(k) for k in ["typ", "A", "entscheidung", "d_ent", "dz_ent", "d_A", "dz_A", "aktiv", "treffer", "umgeworfen",
                                                                     "p_lage_treffer", "ende", "rang", "dmg", "hoehe", "scheitel", "landung", "x_A", "x_ende", "p_x_A",
                                                                     "halten_bis", "wurfweite"]])
    kopf(aus, "V d schaden", ["typ", "rang", "schaden:anzahl", "umgeworfen:anzahl"])
    sd, su = defaultdict(Counter), defaultdict(Counter)
    for d in alle:
        if d["treffer"]:
            for t in d["treffer"].split(";"):
                sd[(d["typ"][0], d["rang"])][int(t.split(":")[1])] += 1
            su[(d["typ"][0], d["rang"])][d["umgeworfen"]] += 1
    for k in sorted(sd, key=lambda k: (k[0], k[1] or 0)):
        zeile(aus, [k[0], k[1], " ".join("%d:%d" % x for x in sorted(sd[k].items())), " ".join("%d:%d" % x for x in sorted(su[k].items()))])
    # Einzelheiten je Art aus den passiven Laeufen
    kopf(aus, "V d einzelheiten", ["typ", "groesse", "werte (Wert:Anzahl)"])
    det = defaultdict(Counter)
    for d in alle:
        if d["teil"] != "P":
            continue
        z = z_von(d["lauf"])
        idx = {r["frame"]: i for i, r in enumerate(z)}
        i = idx[d["A"]]
        seg = z[i:d["_ende"] + 1]
        t = d["typ"][0]
        det[(t, "aktive Abschnitte (A+von-bis)")][d["aktiv"]] += 1
        if t == "P":
            hs = [(y["b_h"] + y["b_hf"] / 65536.0, y["frame"] - d["A"]) for y in seg]
            hm = max(h for h, f in hs)
            det[(t, "Scheitel px @ erster Frame A+")]["%.3f@%d" % (hm, min(f for h, f in hs if h == hm))] += 1
            land = next((y for y in seg if y["frame"] - d["A"] > 20 and y["b_h"] <= 0), None)
            if land:
                det[(t, "Landung A+")][land["frame"] - d["A"]] += 1
                det[(t, "Landung minus x(Figur in A)")][(land["b_x"] - z[i]["p_x"]) * blickrichtung(z[i])] += 1
        if t == "R":
            lauf = [y for y in seg if y["b_anim"] in (0x4A26A, 0x4A2BE, 0x4A302, 0x4A354)]
            if lauf:
                xs = [y["b_x"] + y["b_xf"] / 65536.0 for y in lauf]
                v = Counter(round(abs(b - a_), 3) for a_, b in zip(xs, xs[1:])).most_common(1)[0][0]
                det[(t, "Tempo px/Frame (haeufigster Wert)")][v] += 1
                det[(t, "Lauf Frames")][len(lauf)] += 1
                det[(t, "Laufweg px")][round(abs(xs[-1] - xs[0]), 2)] += 1
                ausl = [y for y in seg if y["b_anim"] == 0x4A3F6]
                if ausl:
                    det[(t, "Auslauf px")][abs(ausl[-1]["b_x"] - ausl[0]["b_x"])] += 1
            akt = [x for x in d["aktiv"].split(";") if x]
            if akt:
                det[(t, "Nachlauf (Frames nach letztem aktiven bis Aktionsende)")][d["ende"] - int(akt[-1].split("-")[1])] += 1
        if t == "G":
            det[(t, "Zustand 2 (Halten bis Ende) Frames")][d["ende"] + 1] += 1
            det[(t, "Flaeche S+0x28 gesetzt in allen Halteframes")][int(all(y["b_fl"] != 0 for y in seg))] += 1
            det[(t, "Wurftreffer A+")][d["treffer"].split(":")[0] if d["treffer"] else None] += 1
            det[(t, "Figur erster Bodenkontakt: dx zum Ort beim Griff (Blickrichtung des Bosses)")][d.get("wurfweite")] += 1
    for k in sorted(det, key=lambda k: (k[0], k[1])):
        zeile(aus, [k[0], k[1], " ".join("%s:%d" % x for x in sorted(det[k].items(), key=lambda t: str(t[0])))])
    # Proben
    kopf(aus, "V d proben", ["lauf", "info", "A", "erster_treffer_A+", "schaden", "d_treffer", "dz_treffer", "h_treffer",
                              "d_erster_aktiver", "dz_erster_aktiver", "h_erster_aktiver", "aktiv_von", "aktiv_bis"])
    for m in teil("D"):
        z = z_von(m["lauf"])
        pa = os.path.join(RAW, m["lauf"] + "_a.txt")
        if not os.path.exists(pa):
            zeile(aus, [m["lauf"], m["info"]] + [None] * 11)
            continue
        A = int(open(pa).read())
        hit = next((r for r in z if r["frame"] > A and r["p_lp"] < 72 and r["p_ang"] == BOSS_PTR), None)
        fa = next((r for r in z if r["frame"] > A and aktiv_attr(r["b_att"])), None)
        att = [r["frame"] - A for r in z if A < r["frame"] < A + 80 and aktiv_attr(r["b_att"])]
        def lage(r):
            return [(r["p_x"] - r["b_x"]) * blickrichtung(r), r["p_z"] - r["b_z"], round(r["p_h"] + r["p_hf"] / 65536.0, 3)] if r else [None] * 3
        zeile(aus, [m["lauf"], m["info"], A, (hit["frame"] - A) if hit else None, (72 - hit["p_lp"]) if hit else None] + lage(hit) + lage(fa)
              + [att[0] if att else None, att[-1] if att else None])
    # Griffweite
    kopf(aus, "V d griffweite", ["lauf", "info", "d_Q", "dz_Q", "b_akt_Q", "erste_reaktion (Frame-Q:Art)"])
    namen = {ANIM_G: "G", ANIM_K: "K", ANIM_S: "S", ANIM_P: "P", ANIM_R: "R-Ausholen"}
    for m in teil("DG"):
        z = z_von(m["lauf"])
        Q = int(m["lauf"].split("_")[3])
        q = next(r for r in z if r["frame"] == Q)
        first = next(((r["frame"] - Q, namen[r["b_anim"]]) for r in z if r["frame"] >= Q and r["b_anim"] in namen), None)
        zeile(aus, [m["lauf"], m["info"], (q["p_x"] - q["b_x"]) * blickrichtung(q), q["p_z"] - q["b_z"], q["b_akt"], "%s:%s" % first if first else None])
    # Rhythmus
    kopf(aus, "V e rhythmus", ["lauf", "teil", "frames", "angriffe", "K", "S", "R", "P", "G", "abstand_median", "abstand_min", "abstand_max"])
    by = defaultdict(list)
    for d in alle:
        if d["teil"] in ("P", "BOT"):
            by[(d["lauf"], d["teil"])].append(d)
    for (l, t), ds in sorted(by.items()):
        A_ = [d["A"] for d in ds]
        g = [b - a_ for a_, b in zip(A_, A_[1:])]
        cnt = Counter(d["typ"][0] for d in ds)
        zeile(aus, [l, t, len(z_von(l)), len(ds), cnt["K"], cnt["S"], cnt["R"], cnt["P"], cnt["G"],
                    statistics.median(g) if g else None, min(g) if g else None, max(g) if g else None])
    kopf(aus, "V e wahl nach abstand", ["bereich (d bei Beginn der Aktion 6 bzw. A)", "typ", "anzahl"])
    wc = Counter()
    for d in alle:
        if d["teil"] != "P":
            continue
        dd = abs(d["d_ent"])
        b = "nah <80" if dd < 80 else ("mittel 80-160" if dd <= 160 else "fern >160")
        wc[(b, d["typ"][0])] += 1
    for k in sorted(wc):
        zeile(aus, [k[0], k[1], wc[k]])
    # Geschuetzte Presse (Schutzzaehler >= 30 beim Beginn) und Vorzustand
    kopf(aus, "V c ausbruch", ["lauf", "A", "S+0xAE", "vorher (Zustand/Aktion/Animation in A-2, A-1)", "treffer_auf_boss_in_A-30..A"])
    for m in teil("P", "BOT", "B"):
        z = z_von(m["lauf"])
        for i in range(2, len(z)):
            if z[i]["b_anim"] == ANIM_P and z[i - 1]["b_anim"] != ANIM_P and z[i].get("b_ae", 0) >= 30:
                vor = " ".join("%d/%x/%x" % (st(z[k]), z[k]["b_akt"], z[k]["b_anim"]) for k in (i - 2, i - 1))
                t_ = any(z[k]["b_lp"] < z[k - 1]["b_lp"] for k in range(max(1, i - 30), i + 1))
                zeile(aus, [m["lauf"], z[i]["frame"], z[i]["b_ae"], vor, int(t_)])
    # Zucken -> Presse
    kopf(aus, "V c zucken danach", ["teil", "zucken (angenommene Treffer ohne Umwerfen)", "davon Presse innerhalb 27 Frames"])
    zc, pc = Counter(), Counter()
    for r in hits:
        z = z_von(r["lauf"])
        i = r["i"]
        if stand_typ(r) == "dauerhaft" and i + 1 < len(z) and z[i + 1]["b_akt"] in (0, 4, 6) and st(z[i]) == 3:
            zc[r["teil"]] += 1
            if any(z[k]["b_anim"] == ANIM_P for k in range(i, min(len(z), i + 28))):
                pc[r["teil"]] += 1
    for k in sorted(zc):
        zeile(aus, [k, zc[k], pc[k]])
    # Wellen
    typn = {0x0CA0: "EDDY", 0x4E7A: "DICK", 0xA97E: "WOOKY"}
    kopf(aus, "V f wellen", ["lauf", "info", "max_lp", "lp_wechsel (frame:lp)", "neue Gegner (Typ@Frame Slot)"])
    for m in teil("W"):
        z = z_von(m["lauf"])
        ev, prev = [], {s_: 0 for s_ in range(19)}
        for r in z:
            for s_ in range(19):
                v = r["s%d_st" % s_] >> 8
                if v and not prev[s_]:
                    ev.append("%s@%d(s%d)" % (typn.get(r["s%d_typ" % s_], "%x" % r["s%d_typ" % s_]), r["frame"], s_))
                if prev[s_] and not v:
                    ev.append("weg:s%d@%d" % (s_, r["frame"]))
                prev[s_] = v
        lp = [(r["frame"], r["b_lp"]) for k, r in enumerate(z) if k > 0 and r["b_lp"] != z[k - 1]["b_lp"]]
        zeile(aus, [m["lauf"], m["info"], z[-1]["b_b7"], " ".join("%d:%d" % x for x in lp[:5]), " ".join(ev[:12])])
    # Fall
    kopf(aus, "V g fall", ["lauf", "info", "t", "art", "boss_zustand2_ab_t+", "andere_gegner (slot:t+Zustand2 / t+frei)", "pose_t+",
                            "stagewechsel_t+", "slot_frei_t+", "angriffe_mit_lp0", "treffer_auf_figur_mit_lp0"])
    for m in teil("T"):
        z = z_von(m["lauf"])
        t = next((r["frame"] for r in z if r["b_lp"] < 0 and boss_da(r)), None)
        lp0 = [r for r in z if r["b_lp"] == 0 and boss_da(r)]
        n_att = len([d for d in angriffe(z) if any(r["frame"] == d["A"] for r in lp0)])
        n_hit = len([r for r in lp0 if r["p_lp"] < 72 and r["p_ang"] == BOSS_PTR])
        if t is None:
            zeile(aus, [m["lauf"], m["info"], None, None, None, None, None, None, None, n_att, n_hit])
            continue
        r = next(r for r in z if r["frame"] == t)
        f2 = next((x["frame"] - t for x in z if x["frame"] > t and st(x) == 2), None)
        pose = next((x["frame"] - t for x in z if x["frame"] > t and x["p_akt"] == 0x18), None)
        stg = next((x["frame"] - t for x in z if x["frame"] > t and x["stage"] != r["stage"]), None)
        frei = next((x["frame"] - t for x in z if x["frame"] > t and st(x) == 0), None)
        oth = []
        for s_ in range(19):
            col = [(x["frame"] - t, x["s%d_st" % s_] >> 8) for x in z if x["frame"] >= t - 1]
            if any(v for f_, v in col):
                z2 = next((f_ for f_, v in col if f_ > 0 and v == 2), None)
                z0 = next((f_ for f_, v in col if f_ > 0 and v == 0), None)
                oth.append("s%d:%s/%s" % (s_, z2, z0))
        n_att = len([d for d in angriffe(z) if d["A"] < t and any(x["frame"] == d["A"] for x in lp0)])
        zeile(aus, [m["lauf"], m["info"], t, art_figur(r), f2, " ".join(oth), pose, stg, frei, n_att, n_hit])
    kopf(aus, "V g sterben im angriff", ["lauf", "info", "t", "att t..t+3", "figur_lp t..t+3"])
    for m in teil("TS"):
        z = z_von(m["lauf"])
        t = next((r["frame"] for r in z if r["b_lp"] < 0 and boss_da(r)), None)
        if t is None:
            zeile(aus, [m["lauf"], m["info"], None, None, None])
            continue
        seg = [r for r in z if t <= r["frame"] <= t + 3]
        zeile(aus, [m["lauf"], m["info"], t, " ".join("%x" % r["b_att"] for r in seg), " ".join(str(r["p_lp"]) for r in seg)])
    kopf(aus, "V g schriftzug", ["lauf", "info", "t", "erster Frame mit Schriftzug am rechten Rand", "= t+"])
    import glob
    for m in teil("TB"):
        z = z_von(m["lauf"])
        t = next((r["frame"] for r in z if r["b_lp"] < 0 and boss_da(r)), None)
        snaps = sorted(glob.glob(os.path.join(RAW, "snap", m["lauf"] + "_*.png")))
        erst = None
        for f_ in snaps:
            if orange_rechts(f_) >= 60:
                erst = int(f_.rsplit("_", 1)[1][:-4])
                break
        zeile(aus, [m["lauf"], m["info"], t, erst, (erst - t) if (erst and t) else None])
    # Bot
    kopf(aus, "V bot", ["lauf", "info", "schlagtreffer", "zurueckgewiesen", "anteil_%", "je Stufe (stufe:dauerhaft/zurueck/halb)"])
    for m in teil("BOT"):
        hs = [r for r in hits if r["lauf"] == m["lauf"] and r["art"].startswith("stufe")]
        n = len(hs)
        rz_ = sum(1 for r in hs if stand_typ(r) == "zurueck")
        js = defaultdict(Counter)
        for r in hs:
            js[r["art"]][stand_typ(r)] += 1
        zeile(aus, [m["lauf"], m["info"], n, rz_, round(100.0 * rz_ / n) if n else None,
                    " ".join("%s:%d/%d/%d" % (k, v["dauerhaft"], v["zurueck"], v["halb"]) for k, v in sorted(js.items()))])
    # Nach dem Aufstehen
    kopf(aus, "V c nach dem aufstehen", ["lauf", "info", "K", "G-K", "d_bei_G", "folge (G+n:Zustand/Aktion Art)", "boss_packt_ab"])
    for m in teil("AU"):
        z = z_von(m["lauf"])
        hs_ = treffer(z, 3)
        if not hs_:
            continue
        K = z[hs_[0]]["frame"]
        G, k = frei_ab(z, hs_[0] + 1, lambda y: st(y) == 1)
        ev, alt = [], None
        for r in z:
            if r["frame"] < G - 1:
                continue
            key = (st(r), r["b_akt"], namen.get(r["b_anim"], ""))
            if key != alt:
                ev.append("G%+d:%d/%x%s" % (r["frame"] - G, key[0], key[1], key[2]))
                alt = key
        gG = next((r for r in z if r["frame"] >= G - 1 and r.get("p_griff") == 6), None)
        zeile(aus, [m["lauf"], m["info"], K, G - K, (z[k - 1]["p_x"] - z[k - 1]["b_x"]) * blickrichtung(z[k - 1]), " ".join(ev[:8]),
                    ("G%+d" % (gG["frame"] - G)) if gG else None])
    aus.close()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("zeit", help="Werte je Frame ausgeben (Spalten mit :x hexadezimal)")
    s.add_argument("lauf"); s.add_argument("von", type=int); s.add_argument("bis", type=int); s.add_argument("spalten")
    s.set_defaults(f=cmd_zeit)
    s = sub.add_parser("treffer", help="Treffer auf den Boss mit Schaden, Zurueckweisung und Reaktion")
    s.add_argument("lauf", nargs="+"); s.add_argument("--ab", type=int, default=3)
    s.set_defaults(f=cmd_treffer)
    s = sub.add_parser("umwerfen", help="umwerfende Treffer: Flug, Scheitel, Bodenkontakt, Weite, G, Trefferflaeche")
    s.add_argument("lauf", nargs="+"); s.add_argument("--ab", type=int, default=3)
    s.set_defaults(f=cmd_umwerfen)
    s = sub.add_parser("zittern", help="x-Abweichung des Bosses nach jedem Treffer (Zittern, Rueckstoss)")
    s.add_argument("lauf", nargs="+"); s.add_argument("--ab", type=int, default=3)
    s.set_defaults(f=cmd_zittern)
    s = sub.add_parser("figur", help="LP-Verluste der Figur mit Angreifer-Slot und Lage zum Boss")
    s.add_argument("lauf", nargs="+")
    s.set_defaults(f=cmd_figur)
    s = sub.add_parser("belege", help="alle Laeufe der Gegenpruefung (Manifest aus belege_boss.sh) nach logs/boss_v.csv")
    s.add_argument("--manifest", required=True); s.add_argument("--aus", required=True)
    s.set_defaults(f=cmd_belege)
    s = sub.add_parser("angriffe", help="Angriffe des Bosses (Aktion 6): Beginn, A, Art, aktive Frames, Treffer")
    s.add_argument("lauf", nargs="+")
    s.set_defaults(f=cmd_angriffe)
    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
