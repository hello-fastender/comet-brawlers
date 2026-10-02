#!/usr/bin/env python3
"""Gegenpruefung "Reichweite der Gegnerangriffe" (V3, Praefix greichweite_v).

Auswertung der Abzuege aus scenarios/greichweite_v_frei.lua (Bereich
0xFFA900-0xFFEA00, nur Standardbibliothek). Unterbefehle:
  zeitreihe  Zeitreihe eines Gegnerslots und der Figur (Animation, Attribut,
             Schaden, Abstand) fuer die Planung der Proben
  angriffe   alle Gegnerangriffe eines Laufs: Beginn A, aktive Frames,
             Attribut, Schaden, Treffer, Abstand, Nachlauf (CSV)
  uebersicht Zusammenfassung der angriffe-CSV je Gegner und Angriff
  nachlauf   Rueckzug, Wartepose und Frames bis Stand/Gehen je Angriff
             (nur vollstaendige Angriffe, getrennt nach Folge)
  serien     Angriffsfolgen je Gegner: was vor dem Umwerfschlag B kommt und
             wie viele normale Angriffe vor einem Umwerfangriff liegen
  probe      Ergebnis einer Reichweitenprobe: Treffer, leer (aktiv ohne
             Treffer) oder Abbruch, mit Gueltigkeitspruefung (CSV-Zeile)
  fenster    Abbruchfenster je Quelle: Proben relativ zum Zielabstand S+0x96

Begriffe: A = erster Frame, in dem der Animationszeiger (S+0x1C) des Gegners
auf der ersten Animation des Angriffs steht. Aktiv = Attribut S+0x24 != 0.
dx = x(Gegner) - x(Figur), dz = Tiefe(Gegner) - Tiefe(Figur).
"""

import argparse
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
SLOT0 = 0xFFBC90
SLOTLEN = 0xC0
TYPEN = {0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK", 0x46DA4: "DOLG"}


def slot_base(n):
    return SLOT0 + n * SLOTLEN


class Lauf:
    def __init__(self, prefix):
        self.d = Dump(prefix)
        self.frames = self.d.frames
        self.watch = {}
        wp = Path(str(prefix) + "_watch.csv")
        if wp.exists():
            with open(wp) as f:
                for r in csv.DictReader(f):
                    self.watch[int(r["frame"])] = r

    def v(self, f, addr, w=1, s=False):
        return self.d.value(f, addr, w, s)

    def figur(self, f):
        v = self.v
        return {
            "x": v(f, P + 0x0E, 2, True), "h": v(f, P + 0x12, 2, True), "z": v(f, P + 0x16, 2, True),
            "lp": v(f, P + 0x40, 2, True), "lpv": v(f, P + 0x42, 2, True), "st": v(f, P + 0x04),
            "akt": v(f, P + 0x0A, 2), "ang": v(f, P + 0x82, 2), "face": v(f, P + 0x5E),
            "anim": v(f, P + 0x1C, 4),
        }

    def gegner(self, f, n):
        S = slot_base(n)
        v = self.v
        return {
            "st": v(f, S + 0x04), "st5": v(f, S + 0x05), "akt": v(f, S + 0x0A, 2),
            "x": v(f, S + 0x0E, 2, True), "h": v(f, S + 0x12, 2, True), "z": v(f, S + 0x16, 2, True),
            "anim": v(f, S + 0x1C, 4), "attr": v(f, S + 0x24, 2), "typ": v(f, S + 0x38, 4),
            "lp": v(f, S + 0x40, 2, True), "dmg": v(f, S + 0x8B), "face": v(f, S + 0x5E),
            "maxlp": v(f, S + 0x9A, 2),
            # Zielabstand des Gegners (Wort, = x(Gegner) - x(Figur), auf +-48 begrenzt);
            # in dieser Pruefung gefunden: der Angriff bricht ab, sobald dx das
            # Fenster [ziel - 31, ziel + 32] verlaesst
            "ziel": v(f, S + 0x96, 2, True),
        }


def angreifer_slot(fig):
    """Slot, auf den P+0x82 zeigt (S = 0xFF0000 + Wort - 4)."""
    a = 0xFF0000 + fig["ang"] - 4
    if a < SLOT0 or (a - SLOT0) % SLOTLEN:
        return None
    return (a - SLOT0) // SLOTLEN


def cmd_zeitreihe(a):
    L = Lauf(a.prefix)
    von, bis = a.von or L.frames[0], a.bis or L.frames[-1]
    w = csv.writer(sys.stdout)
    w.writerow(["frame", "st", "akt", "anim", "attr", "dmg", "face", "gx", "gz", "gh", "glp",
                "px", "pz", "ph", "plp", "pst", "pakt", "pang", "dx", "dz", "rang"])
    last = None
    for f in L.frames:
        if not von <= f <= bis:
            continue
        g, p = L.gegner(f, a.slot), L.figur(f)
        row = [g["st"], g["akt"], "%x" % g["anim"], "%x" % g["attr"], g["dmg"], "%x" % g["face"],
               g["x"], g["z"], g["h"], g["lp"], p["x"], p["z"], p["h"], p["lp"], p["st"],
               "%x" % p["akt"], "%x" % p["ang"], g["x"] - p["x"], g["z"] - p["z"],
               L.watch.get(f, {}).get("rang", "")]
        key = row[:6] + row[13:16] if a.aenderungen else None
        if a.aenderungen and key == last:
            continue
        last = key
        w.writerow([f] + row)


# Aus den eigenen Laeufen bestimmt (Uebergangsgraph der Animationszeiger S+0x1C,
# greichweite_v_n1/_n4): Ruheanimationen (Stand, Gehen, Wartepose, Umsehen) je
# Gegnertyp und die Animationen, mit denen ein Angriff aus der Ruhe beginnt.
RUHE = {
    "WOOKY": {0x5EC70, 0x5ECAA, 0x5ECE2, 0x5ED1C, 0x5ED4E, 0x5ED7E, 0x5EDAA, 0x5EDD4, 0x5EE04,
              0x5EE34, 0x5EE60, 0x5FB18, 0x5FDF0, 0x5FE2A, 0x5FE5C, 0x5FE8A, 0x5FEB6, 0x5FEE0},
    "EDDY": {0x6369A, 0x636D4, 0x6370C, 0x63746, 0x63778, 0x637A8, 0x637D6, 0x63800, 0x63830,
             0x63860, 0x6388C, 0x644BC, 0x64764, 0x6479E, 0x647D0, 0x647FE, 0x6482A, 0x64854},
    "SKIP": {0x282F4, 0x2832A, 0x2835C, 0x28390, 0x283C8, 0x283FE, 0x28436, 0x28466, 0x2849E,
             0x284D8, 0x28510, 0x28548, 0x2857E, 0x297D4, 0x2980A, 0x2983C, 0x29870, 0x298A8,
             0x298DE, 0x29916, 0x29946},
}
WARTE = {"WOOKY": 0x5FB18, "EDDY": 0x644BC, "SKIP": 0x2849E}
# Stand (ohne Gehen und Wartepose), fuer die Standzeit vor einem Angriff
STAND = {"WOOKY": {0x5EC70, 0x5ECAA, 0x5ECE2}, "EDDY": {0x6369A, 0x636D4, 0x6370C}, "SKIP": set()}


def ist_angriff(attr):
    """Angriffsattribut: Bit 0x4000 oder 0x8000 gesetzt (0xFF00 und 0x0100/0x0200
    stehen auch ausserhalb von Angriffen in S+0x24)."""
    return attr != 0xFF00 and (attr & 0xC000) != 0


def angriffe(L, slots):
    """Angriffe = Wechsel aus einer Ruheanimation in eine andere Animation
    (Frame A). Die Angriffsfolge laeuft, bis wieder eine Ruheanimation kommt."""
    res = []
    fr = L.frames
    for n in slots:
        seq = [L.gegner(f, n) for f in fr]
        for i in range(1, len(seq)):
            g, g0 = seq[i], seq[i - 1]
            typ = TYPEN.get(g["typ"])
            if typ not in RUHE or not g["st"] or g0["typ"] != g["typ"]:
                continue
            if g["anim"] == g0["anim"] or g["anim"] in RUHE[typ] or g0["anim"] not in RUHE[typ]:
                continue
            j = i
            while j + 1 < len(seq) and seq[j + 1]["anim"] not in RUHE[typ] and seq[j + 1]["st"]:
                j += 1
            res.append({"slot": n, "typ": typ, "i": i, "e": j, "seq": seq})
    return res


def auswerten(L, a):
    """Kennzahlen eines Angriffs (siehe angriffe)."""
    fr, seq, n, i, e = L.frames, a["seq"], a["slot"], a["i"], a["e"]
    A = fr[i]
    akt = [k for k in range(i, e + 1) if ist_angriff(seq[k]["attr"])]
    anims = []
    for k in range(i, e + 1):
        if not anims or anims[-1][0] != seq[k]["anim"]:
            anims.append((seq[k]["anim"], fr[k] - A))
    hit = None
    for k in range(i, min(e + 2, len(fr))):
        p = L.figur(fr[k])
        if p["lp"] < p["lpv"] and angreifer_slot(p) == n:
            hit = (fr[k], p["lpv"] - p["lp"], p["h"], seq[k]["x"] - p["x"], seq[k]["z"] - p["z"])
            break
    umg = ""
    if hit and hit[0] + 1 in L.d.offsets:
        umg = "ja" if L.figur(hit[0] + 1)["st"] == 2 else "nein"
    pA, gA = L.figur(A), seq[i]
    k = i - 1
    stand = 0
    while k >= 0 and seq[k]["anim"] in STAND[a["typ"]]:
        stand += 1
        k -= 1
    r = {
        "slot": n, "typ": a["typ"], "maxlp": gA["maxlp"], "A": A, "anim_A": "%x" % gA["anim"],
        "face": "rechts" if gA["face"] & 0x20 else "links",
        "dx_A": gA["x"] - pA["x"], "dz_A": gA["z"] - pA["z"], "ziel": gA["ziel"],
        "ende": fr[e] - A, "abbruch": "", "aktiv_von": "", "aktiv_bis": "", "aktiv_n": 0,
        "attr": "", "dmg": gA["dmg"], "treffer": "nein", "treffer_rel": "", "schaden": "",
        "ph_treffer": "", "umgeworfen": "", "dx_treffer": "", "dz_treffer": "", "dx_aktiv": "", "dz_aktiv": "", "ph_aktiv": "",
        "pst_A": pA["st"], "rueckzug": "", "warte": "", "nach_ruhe": "", "folge": "",
        "stand_vor": stand, "vor_anim": "%x" % seq[i - 1]["anim"],
        "rang": L.watch.get(A, {}).get("rang", ""),
        "anims": " ".join("%x@%d" % x for x in anims[:14]),
    }
    if akt:
        f0, f1 = fr[akt[0]], fr[akt[-1]]
        attrs = []
        for k in akt:
            if seq[k]["attr"] not in attrs:
                attrs.append(seq[k]["attr"])
        fig = [L.figur(fr[k]) for k in akt]
        dxs = [seq[k]["x"] - p["x"] for k, p in zip(akt, fig)]
        dzs = [seq[k]["z"] - p["z"] for k, p in zip(akt, fig)]
        phs = [p["h"] for p in fig]
        r.update({"aktiv_von": f0 - A, "aktiv_bis": f1 - A, "aktiv_n": len(akt),
                  "attr": "/".join("%x" % x for x in attrs), "dmg": seq[akt[0]]["dmg"],
                  "dx_aktiv": "%d..%d" % (min(dxs), max(dxs)), "dz_aktiv": "%d..%d" % (min(dzs), max(dzs)),
                  "ph_aktiv": "%d..%d" % (min(phs), max(phs))})
        # Rueckzug: Frames der Angriffsfolge nach dem letzten aktiven Frame
        r["rueckzug"] = fr[e] - f1
        # danach Wartepose (Laenge) und erster Frame in Stand/Gehen/naechstem Angriff
        k = e + 1
        w = 0
        while k < len(seq) and seq[k]["anim"] == WARTE[a["typ"]]:
            w += 1
            k += 1
        if k < len(seq):
            r["warte"] = w
            r["nach_ruhe"] = fr[k] - f1 - 1
            r["folge"] = "%x" % seq[k]["anim"]
    else:
        r["abbruch"] = "ja"
    if hit:
        r.update({"treffer": "ja", "treffer_rel": hit[0] - A, "schaden": hit[1], "ph_treffer": hit[2],
                  "umgeworfen": umg, "dx_treffer": hit[3], "dz_treffer": hit[4]})
    return r


SPALTEN = ["lauf", "slot", "typ", "maxlp", "rang", "A", "anim_A", "face", "dx_A", "dz_A", "ziel", "pst_A",
           "ende", "abbruch", "aktiv_von", "aktiv_bis", "aktiv_n", "attr", "dmg", "treffer",
           "treffer_rel", "schaden", "ph_treffer", "umgeworfen", "dx_treffer", "dz_treffer", "dx_aktiv", "dz_aktiv", "ph_aktiv",
           "rueckzug", "warte", "nach_ruhe", "folge", "stand_vor", "vor_anim", "anims"]


def cmd_angriffe(a):
    w = csv.writer(sys.stdout)
    if not a.ohne_kopf:
        w.writerow(SPALTEN)
    for prefix in a.prefix:
        L = Lauf(prefix)
        name = Path(prefix).name
        for at in angriffe(L, range(20)):
            r = auswerten(L, at)
            r["lauf"] = name
            w.writerow([r[c] for c in SPALTEN])


def spanne(werte):
    werte = sorted(set(werte))
    if not werte:
        return ""
    return str(werte[0]) if len(werte) == 1 else "%s bis %s" % (werte[0], werte[-1])


def haeufig(werte):
    c = {}
    for v in werte:
        c[v] = c.get(v, 0) + 1
    return " ".join("%dx%d" % kv for kv in sorted(c.items()))


def cmd_uebersicht(a):
    """Fasst die CSV von 'angriffe' je Gegnertyp und Startanimation zusammen."""
    rows = list(csv.DictReader(open(a.csv)))
    gruppen = {}
    for r in rows:
        gruppen.setdefault((r["typ"], r["anim_A"]), []).append(r)
    w = csv.writer(sys.stdout)
    w.writerow(["typ", "anim_A", "n", "abbruch", "startup", "aktiv_n_ohne", "aktiv_bis_ohne",
                "aktiv_n_mit", "treffer_rel", "attr", "schaden", "umgeworfen", "rueckzug_ohne",
                "nach_ruhe_ohne", "nach_ruhe_mit", "stand_vor (wert x anzahl, >0)", "faces", "laeufe"])
    for (typ, an), rs in sorted(gruppen.items()):
        ok = [r for r in rs if not r["abbruch"]]
        ohne = [r for r in ok if r["treffer"] == "nein"]
        mit = [r for r in ok if r["treffer"] == "ja"]
        w.writerow([typ, an, len(rs), sum(1 for r in rs if r["abbruch"]),
                    spanne(int(r["aktiv_von"]) for r in ok),
                    spanne(int(r["aktiv_n"]) for r in ohne), spanne(int(r["aktiv_bis"]) for r in ohne),
                    spanne(int(r["aktiv_n"]) for r in mit), spanne(int(r["treffer_rel"]) for r in mit),
                    "/".join(sorted({r["attr"] for r in ok})),
                    "/".join(sorted({"%s(R%s)" % (r["schaden"], r["rang"]) for r in mit})),
                    "/".join(sorted({r["umgeworfen"] for r in mit})),
                    spanne(int(r["rueckzug"]) for r in ohne if r["rueckzug"] != ""),
                    spanne(int(r["nach_ruhe"]) for r in ohne if r["nach_ruhe"] != ""),
                    spanne(int(r["nach_ruhe"]) for r in mit if r["nach_ruhe"] != ""),
                    haeufig(int(r["stand_vor"]) for r in rs if r.get("stand_vor") not in ("", "0", None)),
                    "/".join(sorted({r["face"] for r in rs})),
                    " ".join(sorted({r["lauf"].replace("greichweite_v_", "") for r in rs}))])


def soll_aus_name(name):
    """Sollwerte aus dem Laufnamen greichweite_v_p_<quelle>_x<dx>_z<dz>[_h<h>][_<zusatz>]
    (dx 'nat' = ohne Eingriff)."""
    m = re.match(r"greichweite_v_p_(.+?)_x(nat|-?\d+)_z(-?\d+)(?:_h(\d+))?(?:_(.+))?$", name)
    if not m:
        return {"quelle": name, "soll_dx": "", "soll_dz": "", "soll_h": "", "zusatz": ""}
    return {"quelle": m.group(1), "soll_dx": "" if m.group(2) == "nat" else int(m.group(2)),
            "soll_dz": "" if m.group(2) == "nat" else int(m.group(3)),
            "soll_h": int(m.group(4)) if m.group(4) else "", "zusatz": m.group(5) or ""}


def ergebnis(r):
    """T = Treffer durch den Angreifer, L = aktiv ohne Treffer (leer), X = Abbruch
    (keine aktiven Frames)."""
    if r["abbruch"] == "ja":
        return "X"
    return "T" if r["treffer"] == "ja" else "L"


def cmd_probe(a):
    """Probe ab A: Ergebnis des Angriffs, der in Frame A im Slot beginnt."""
    w = csv.writer(sys.stdout)
    if a.kopf:
        w.writerow(PROBE)
    for prefix in a.prefix:
        L = Lauf(prefix)
        name = Path(prefix).name
        r = soll_aus_name(name)
        r["lauf"] = name
        at = [x for x in angriffe(L, [a.slot]) if L.frames[x["i"]] == a.a]
        if not at:
            r["ergebnis"] = "kein Angriff"
            w.writerow([r.get(c, "") for c in PROBE])
            continue
        r.update(auswerten(L, at[0]))
        r["ergebnis"] = ergebnis(r)
        p = L.figur(a.a)
        r["pface"] = "rechts" if p["face"] & 0x20 else "links"
        # fremder Treffer (anderer Slot) in der Angriffsfolge
        fremd = None
        for f in range(a.a, a.a + r["ende"] + 1):
            q = L.figur(f)
            if q["lp"] < q["lpv"] and angreifer_slot(q) != a.slot:
                fremd = f - a.a
                r["fremd"] = "%d(Slot %s)" % (fremd, angreifer_slot(q))
                break
        # Abstand nach dem ersten Eingriffsframe (A+1, sonst --ab): zeigt, ob der Eingriff
        # gegriffen hat (am Bild- bzw. Spielfeldrand schiebt das Spiel die Figur zurueck)
        if a.a + a.ab in L.d.offsets:
            g1, p1 = L.gegner(a.a + a.ab, a.slot), L.figur(a.a + a.ab)
            r["dx_A1"], r["dz_A1"] = g1["x"] - p1["x"], g1["z"] - p1["z"]
        # gueltig: Eingriff hat gegriffen (dx/dz in A+1 und beim Treffer bzw. in
        # allen aktiven Frames wie gesetzt) und kein fremder Treffer vor oder im
        # ersten aktiven Frame
        grund = []
        if r["soll_dx"] != "" and not a.bewegt:
            if r.get("dx_A1") != r["soll_dx"]:
                grund.append("dx")
            if r["treffer"] == "ja" and r["dx_treffer"] != r["soll_dx"]:
                grund.append("dx_T")
        if r["soll_dz"] != "":
            if r.get("dz_A1") != r["soll_dz"]:
                grund.append("dz")
            if r["treffer"] == "ja" and r["dz_treffer"] != r["soll_dz"]:
                grund.append("dz_T")
            if r["treffer"] == "nein" and r["dz_aktiv"] and r["dz_aktiv"] != "%d..%d" % (r["soll_dz"], r["soll_dz"]):
                grund.append("dz_aktiv")
        if fremd is not None and r["aktiv_von"] != "" and fremd <= r["aktiv_von"]:
            grund.append("fremd")
        r["gueltig"] = "ja" if not grund else "nein (" + "/".join(grund) + ")"
        w.writerow([r.get(c, "") for c in PROBE])


PROBE = ["lauf", "quelle", "soll_dx", "soll_dz", "soll_h", "zusatz", "ergebnis", "gueltig",
         "slot", "A", "anim_A", "face", "pface", "dx_A", "dz_A", "ziel", "dx_A1", "dz_A1", "pst_A",
         "ende", "abbruch", "aktiv_von", "aktiv_bis", "aktiv_n", "attr", "treffer", "treffer_rel",
         "schaden", "umgeworfen", "dx_treffer", "dz_treffer", "ph_treffer", "dx_aktiv", "dz_aktiv",
         "ph_aktiv", "fremd", "rang", "anims"]


def cmd_fenster(a):
    """Abbruchfenster: je Quelle die Proben mit dx relativ zum Zielabstand S+0x96."""
    rows = [r for r in csv.DictReader(open(a.csv)) if r.get("soll_dx") not in ("", None)
            and r["zusatz"] in ("", "fenster") and r["soll_dz"] == "0" and r["soll_h"] == ""]
    gruppen = {}
    for r in rows:
        gruppen.setdefault(r["quelle"], []).append(r)
    w = csv.writer(sys.stdout)
    w.writerow(["quelle", "anim_A", "blick", "blick_figur", "dx_A", "ziel", "proben (dx-ziel:ergebnis)",
                "nicht_abgebrochen_dx", "passt_zu_ziel-31_bis_ziel+32"])
    for q, rs in sorted(gruppen.items()):
        rs = [r for r in rs if r["ergebnis"] in ("T", "L", "X") and not r["gueltig"].startswith("nein")]
        if not rs:
            continue
        z = int(rs[0]["ziel"])
        rs.sort(key=lambda r: int(r["soll_dx"]))
        ok = [int(r["soll_dx"]) for r in rs if r["ergebnis"] != "X"]
        passt = all((z - 31 <= int(r["soll_dx"]) <= z + 32) == (r["ergebnis"] != "X") for r in rs)
        w.writerow([q, rs[0]["anim_A"], rs[0]["face"], rs[0]["pface"], rs[0]["dx_A"], z,
                    " ".join("%+d:%s" % (int(r["soll_dx"]) - z, r["ergebnis"]) for r in rs),
                    "%d bis %d" % (min(ok), max(ok)) if ok else "", "ja" if passt else "NEIN"])


def cmd_nachlauf(a):
    """Rueckzug (Frames der Angriffsfolge nach dem letzten aktiven Frame), Wartepose
    und Frames vom letzten aktiven Frame bis zum ersten Stand-/Gehframe (bzw. bis zum
    naechsten Angriff), je Angriff mit und ohne Treffer. Nur Angriffe mit voller
    aktiver Phase (ohne Treffer) bzw. mit Treffer; Haeufigkeiten als wert x anzahl."""
    rows = list(csv.DictReader(open(a.csv)))
    starts = {r["anim_A"] for r in rows}
    voll = {}
    for r in rows:
        if not r["abbruch"] and r["treffer"] == "nein" and r["aktiv_von"]:
            k = (r["typ"], r["anim_A"], "8c00" in r["attr"])
            voll.setdefault(k, {})
            sp = (int(r["aktiv_von"]), int(r["aktiv_bis"]))
            voll[k][sp] = voll[k].get(sp, 0) + 1
    norm = {k: max(v, key=v.get) for k, v in voll.items()}
    g = {}
    for r in rows:
        if r["abbruch"] or r["nach_ruhe"] == "":
            continue
        k = (r["typ"], r["anim_A"], "8c00" in r["attr"])
        hit = r["treffer"] == "ja"
        if not hit and (int(r["aktiv_von"]), int(r["aktiv_bis"])) != norm.get(k):
            continue
        t = "mit" if hit else "ohne"
        fol = "Angriff" if r["folge"] in starts else "Stand/Gehen"
        d = g.setdefault(k, {})
        for feld, wert in (("%s Rueckzug" % t, r["rueckzug"]), ("%s Wartepose" % t, r["warte"]),
                           ("%s bis %s" % (t, fol), r["nach_ruhe"])):
            d.setdefault(feld, {})
            d[feld][int(wert)] = d[feld].get(int(wert), 0) + 1
    w = csv.writer(sys.stdout)
    w.writerow(["typ", "anim_A", "wirbel", "groesse", "werte (wert x anzahl)", "spanne", "n"])
    for k in sorted(g):
        for feld in sorted(g[k]):
            c = g[k][feld]
            w.writerow([k[0], k[1], "ja" if k[2] else "", feld,
                        " ".join("%dx%d" % (v, n) for v, n in sorted(c.items())),
                        spanne(c.keys()), sum(c.values())])


NAMEN = {"5fa54": "A", "5fc18": "B", "5fd24": "C", "5fb50": "UA", "5fc8c": "UB", "643f8": "A",
         "645bc": "B", "644f4": "U", "64688": "SP", "287e0": "M", "28642": "AF"}
UMWERF = {"UA", "UB", "U", "SP", "AF"}


def cmd_serien(a):
    """Angriffsfolgen je Gegnerslot und Lauf (A/B/C Schlaege, UA/UB/U Umwerfschlaege,
    SP Sprungtritt, M Messerstich, AF Ausfallstich; w Wirbel, + Treffer, x Abbruch)."""
    rows = [r for r in csv.DictReader(open(a.csv)) if r["anim_A"] in NAMEN]
    folgen = {}
    for r in rows:
        folgen.setdefault((r["lauf"], r["slot"], r["typ"]), []).append(r)
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "folge"])
    vor_ub = {}
    zwischen = {}
    for (lauf, slot, typ), rs in sorted(folgen.items()):
        rs.sort(key=lambda r: int(r["A"]))
        teile, akt, n = [], [], 0
        for i, r in enumerate(rs):
            lab = NAMEN[r["anim_A"]]
            if lab == "UB" and i:
                vor = NAMEN[rs[i - 1]["anim_A"]] + "/" + rs[i - 1]["folge"]
                vor_ub[vor] = vor_ub.get(vor, 0) + 1
            akt.append(lab + ("w" if "8c00" in r["attr"] else "") +
                       ("x" if r["abbruch"] else "+" if r["treffer"] == "ja" else ""))
            if lab in UMWERF:
                teile.append(" ".join(akt))
                akt = []
                zwischen.setdefault(typ, {})
                zwischen[typ][n] = zwischen[typ].get(n, 0) + 1
                n = 0
            else:
                n += 1
        if akt:
            teile.append(" ".join(akt) + " ...")
        w.writerow([lauf, slot, typ, " | ".join(teile)])
    w.writerow([])
    w.writerow(["vor UB (Angriff/Folgeanimation)", " ".join("%s x%d" % kv for kv in sorted(vor_ub.items()))])
    for typ, c in sorted(zwischen.items()):
        w.writerow(["normale Angriffe vor einem Umwerfangriff", typ,
                    " ".join("%dx%d" % kv for kv in sorted(c.items()))])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("zeitreihe", help="Zeitreihe eines Gegnerslots und der Figur")
    p.add_argument("prefix")
    p.add_argument("--slot", type=int, default=18)
    p.add_argument("--von", type=int)
    p.add_argument("--bis", type=int)
    p.add_argument("--aenderungen", action="store_true", help="nur Zeilen mit Aenderung")
    p.set_defaults(fn=cmd_zeitreihe)
    p = sub.add_parser("angriffe", help="alle Gegnerangriffe der Laeufe als CSV")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--ohne-kopf", action="store_true")
    p.set_defaults(fn=cmd_angriffe)
    p = sub.add_parser("uebersicht", help="Zusammenfassung der angriffe-CSV je Angriff")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_uebersicht)
    p = sub.add_parser("nachlauf", help="Rueckzug, Wartepose und Frames bis Stand/Gehen je Angriff")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_nachlauf)
    p = sub.add_parser("serien", help="Angriffsfolgen je Gegner und Statistik der Umwerfangriffe")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_serien)
    p = sub.add_parser("probe", help="Ergebnis einer Reichweitenprobe als CSV-Zeile mit Gueltigkeit")
    p.add_argument("prefix", nargs="*", help="Laeufe (ohne Laeufe mit --kopf: nur die Kopfzeile)")
    p.add_argument("--slot", type=int, required=True)
    p.add_argument("--a", type=int, required=True, help="Frame A (Angriffsbeginn)")
    p.add_argument("--kopf", action="store_true")
    p.add_argument("--ab", type=int, default=1,
                   help="erster Frame des Eingriffs relativ zu A (Pruefung dx_A1/dz_A1)")
    p.add_argument("--bewegt", action="store_true",
                   help="Gegner bewegt sich im Frame (Sprungtritt): dx nicht pruefen")
    p.set_defaults(fn=cmd_probe)
    p = sub.add_parser("fenster", help="Abbruchfenster je Quelle relativ zum Zielabstand S+0x96")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_fenster)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
