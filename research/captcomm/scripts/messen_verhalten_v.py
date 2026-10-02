#!/usr/bin/env python3
"""Gegenprüfung V2 zu „Verhalten von WOOKY und EDDY“ (nur Standardbibliothek).

Liest Läufe von scenarios/verhalten_v_frei.lua (eingeschränkter Abzug
0xFFA900..0xFFEA00 plus Watch-CSV mit Kamera und Rang).

Unterbefehle (je ein Satz):
  anims       Animationszeiger (S+0x1C) je Gegnertyp mit Häufigkeit, aktiven Frames und Vorgängern.
  sichtbar    Wechsel von S+5 mit x - Kamera-x im Wechselframe.
  wecken      Weckreiz wartender Gegner (S+0x0D wird ungleich 0) mit x - Kamera, Abstand zur Figur und Zeit bis S+4 = 1.
  gehen       Schrittweiten der Gegner beim Gehen (Animation Gehen) in x und Tiefe.
  ankunft     Stillstand nach einer Annäherung: |dx|, |dz|, Zeit bis zum ersten Angriff, erster Angriffstyp, Rang.
  angriffe    Alle Angriffsbeginne je Gegner mit Typ, Abstand zum vorigen und Rate je 1000 Frames.
  schutz      Angriffe und LP-Verluste in den Schutzfenstern der Figur (S+4 = 3).
  gruppe      Gleichzeitig angreifende bzw. aktive Gegner, Lage der übrigen, Seiten, zweiter Angreifer.
  wellen      Erscheinen der Gegner (Slot belegt, S+5, Weckreiz, kampffähig) mit Kamera-x.
  kamera      Kamerahalte (Stillstand > N Frames) mit Zahl lebender Gegner.
  reakt       Verhalten des auslösenden Gegners nach einer Reaktion (CC_REAKT): Gehen, Abstand, Rückkehr in die Kampfhaltung, Angriffe.
  sprung      Sprünge der Figur: Angriffe und Treffer während des Sprungs.
  tiefe       Reaktion des Gegners, wenn ein Tiefenschritt der Figur |dz| >= 12 macht.
  zusammenfassung  Kennzahlen für die Zeilen A1 bis A4 über alle angegebenen Läufe.

Alle Frames sind lokale Frames des Runners. Kennungen der Angriffe nach dem
Anfangszeiger der Animation (Tabelle KENNUNG unten, am Lauf geprüft mit
`anims`: auf jeden Anfangszeiger folgen aktive Frames S+0x24 & 0x000C).
"""

import argparse
import csv
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
WOOKY, EDDY, SKIP, DICK, DOLG = 0x5A97E, 0x60CA0, 0x25086, 0x64E7A, 0x46DA4
TYPNAME = {WOOKY: "WOOKY", EDDY: "EDDY", SKIP: "SKIP", DICK: "DICK", DOLG: "DOLG"}

# Anfangszeiger der Angriffsanimationen (am Lauf bestimmt, siehe `anims`)
KENNUNG = {
    0x5FA54: "W-A", 0x5FB50: "W-B", 0x5FC18: "W-C", 0x5FC8C: "W-D", 0x5FD24: "W-E",
    0x643F8: "E-A", 0x644F4: "E-B", 0x645BC: "E-C", 0x64688: "E-D",
}
UMWERF = {"W-B", "W-D", "E-B", "E-D"}
# Gehen (Animationsbereiche) und Haltung je Typ
GEHEN = {WOOKY: (0x5ED1C, 0x5EE60), EDDY: (0x63746, 0x6388C)}
HALTUNG = {WOOKY: {0x5EC70, 0x5ECAA, 0x5ECE2}, EDDY: {0x6369A, 0x636D4, 0x6370C}}
# Bereich aller Angriffsanimationen (Beginn bis Erholung) je Typ
ANGRIFF = {WOOKY: (0x5FA54, 0x5FDBC), EDDY: (0x643F8, 0x6472E)}
ERHOLUNG = {0x5FB18, 0x644BC}


def phase(s):
    """Grobe Phase eines Gegners: angriff_aktiv, angriff (Ausholen/Erholung), haltung, gehen, sonst."""
    g = ANGRIFF.get(s["typ"])
    if g and g[0] <= s["anim"] <= g[1]:
        return "aktiv" if aktiv(s) else "angriff"
    if haltung(s):
        return "haltung"
    if gehend(s):
        return "gehen"
    return f"modus{s['mod']}"


def s16(v):
    return v - 0x10000 if v >= 0x8000 else v


class Lauf:
    """Alle Frames eines Laufs mit Figur und Gegnerslots 0..19."""

    def __init__(self, prefix):
        self.name = Path(prefix).name
        d = Dump(prefix)
        self.watch = {int(r["frame"]): r for r in csv.DictReader(open(prefix + "_watch.csv"))}
        self.frames = []
        for f in d.frames:
            off = d.offsets[f] - d.start
            m = d.data

            def u8(a):
                return m[off + a]

            def u16(a):
                return m[off + a] << 8 | m[off + a + 1]

            def u32(a):
                return int.from_bytes(m[off + a:off + a + 4], "big")

            w = self.watch[f]
            fr = {
                "f": f, "cam": int(w["camx"]), "rang": int(w["rang"]),
                "px": u16(P + 0x0E), "pz": u16(P + 0x16), "ph": s16(u16(P + 0x12)),
                "pst": u8(P + 4), "pact": u16(P + 0x0A), "plp": s16(u16(P + 0x40)),
                "plp0": s16(u16(P + 0x42)), "blick": "r" if u8(P + 0x5E) & 0x20 else "l", "s": {},
            }
            for n in range(20):
                b = 0xFFBC90 + n * 0xC0
                st = u8(b + 4)
                if st == 0:
                    continue
                fr["s"][n] = {
                    "st": st, "s5": u8(b + 5), "typ": u32(b + 0x38), "x": u16(b + 0x0E),
                    "xf": u16(b + 0x10), "z": u16(b + 0x16), "zf": u16(b + 0x18),
                    "h": s16(u16(b + 0x12)), "anim": u32(b + 0x1C), "att": u16(b + 0x24),
                    "lp": s16(u16(b + 0x40)), "maxlp": u16(b + 0x9A), "mod": u16(b + 0x0A),
                    "dmg": u8(b + 0x8B), "reiz": u8(b + 0x0D),
                }
            self.frames.append(fr)
        self.by_f = {fr["f"]: fr for fr in self.frames}

    def slots(self):
        out = set()
        for fr in self.frames:
            out.update(fr["s"])
        return sorted(out)

    def reihe(self, n):
        """Frames, in denen Slot n belegt ist: Liste (frame, figur, slot)."""
        return [(fr, fr["s"][n]) for fr in self.frames if n in fr["s"]]


class LaufBot(Lauf):
    """Lauf aus dem Durchlauf-Bot (scenarios/verhalten_v_bot.lua): liest
    <präfix>_bot.csv mit den Slot-Spalten statt eines RAM-Abzugs."""

    def __init__(self, prefix):
        self.name = Path(prefix).name
        self.frames = []
        for r in csv.DictReader(open(prefix + "_bot.csv")):
            fr = {
                "f": int(r["frame"]), "cam": int(r["camx"]), "rang": int(r["rang"]), "px": int(r["px"]), "pz": int(r["pd"]),
                "ph": int(r["ph"]), "pst": int(r["pstat"]), "pact": int(r["pact"]), "plp": int(r["php"]),
                "plp0": int(r["plp0"]), "blick": "r" if int(r["blick"]) & 0x20 else "l", "s": {}, "ev": r["ev"],
            }
            for n in range(20):
                st = int(r[f"s{n}_st"])
                if st == 0:
                    continue
                g = lambda k: int(r[f"s{n}_{k}"])  # noqa: E731
                fr["s"][n] = {"st": st, "s5": g("s5"), "typ": g("typ"), "x": g("x"), "xf": 0, "z": g("z"), "zf": 0,
                              "h": g("h"), "anim": g("anim"), "att": g("att"), "lp": g("lp"), "maxlp": g("maxlp"),
                              "mod": g("mod"), "dmg": 0, "reiz": g("reiz") if f"s{n}_reiz" in r else 0}
            self.frames.append(fr)
        self.by_f = {fr["f"]: fr for fr in self.frames}
        self.eingriffe = []
        ev = Path(prefix + "_events.txt")
        if ev.exists():
            self.eingriffe = [ln for ln in ev.read_text().split("\n") if "EINGRIFF" in ln]


def aktiv(s):
    return s["att"] not in (0, 0xFF00) and (s["att"] & 0x000C) != 0


def angriffe(lauf):
    """Angriffsbeginne: Slot wechselt auf einen Anfangszeiger aus KENNUNG."""
    out = []
    prev = {}
    for fr in lauf.frames:
        for n, s in fr["s"].items():
            k = KENNUNG.get(s["anim"])
            if k and prev.get(n) != s["anim"]:
                out.append({"f": fr["f"], "n": n, "k": k, "typ": s["typ"],
                            "dx": s16((s["x"] - fr["px"]) & 0xFFFF), "dz": s16((s["z"] - fr["pz"]) & 0xFFFF),
                            "rang": fr["rang"], "ph": fr["ph"], "pst": fr["pst"]})
        prev = {n: s["anim"] for n, s in fr["s"].items()}
    return out


def gehend(s):
    g = GEHEN.get(s["typ"])
    return bool(g) and g[0] <= s["anim"] <= g[1]


def haltung(s):
    return s["anim"] in HALTUNG.get(s["typ"], ())


def kampffaehig(s):
    return s["st"] in (1, 3) and s["s5"] == 1


def lade_alle(prefixe):
    for p in prefixe:
        yield LaufBot(p[:-4]) if p.endswith("_bot") else Lauf(p)


# ---------------------------------------------------------------- anims
def cmd_anims(a):
    stat = {}
    for lauf in lade_alle(a.prefix):
        prev = {}
        for fr in lauf.frames:
            for n, s in fr["s"].items():
                k = (s["typ"], s["anim"])
                e = stat.setdefault(k, {"n": 0, "akt": 0, "vor": {}, "mod": {}})
                e["n"] += 1
                e["akt"] += aktiv(s)
                e["mod"][s["mod"]] = e["mod"].get(s["mod"], 0) + 1
                pv = prev.get(n)
                if pv is not None and pv != s["anim"]:
                    e["vor"][pv] = e["vor"].get(pv, 0) + 1
            prev = {n: s["anim"] for n, s in fr["s"].items()}
    w = csv.writer(sys.stdout)
    w.writerow(["typ", "anim", "frames", "aktiv", "modi", "kennung", "vorgaenger"])
    for (t, an), e in sorted(stat.items()):
        if t not in (WOOKY, EDDY) and not a.alle:
            continue
        vor = " ".join(f"{v:X}:{c}" for v, c in sorted(e["vor"].items(), key=lambda x: -x[1])[:4])
        modi = " ".join(f"{m}:{c}" for m, c in sorted(e["mod"].items()))
        w.writerow([TYPNAME.get(t, f"{t:X}"), f"{an:X}", e["n"], e["akt"], modi, KENNUNG.get(an, ""), vor])


# ---------------------------------------------------------------- sichtbar
def cmd_sichtbar(a):
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "frame", "slot", "typ", "s5_alt", "s5_neu", "x", "kamera", "x_minus_kamera", "x_minus_kamera_vorframe"])
    for lauf in lade_alle(a.prefix):
        prev = {}
        for fr in lauf.frames:
            for n, s in fr["s"].items():
                p = prev.get(n)
                if p and p[0]["s5"] != s["s5"]:
                    w.writerow([lauf.name, fr["f"], n, TYPNAME.get(s["typ"], f"{s['typ']:X}"), p[0]["s5"], s["s5"],
                                s["x"], fr["cam"], s["x"] - fr["cam"], p[0]["x"] - p[1]])
            prev = {n: (s, fr["cam"]) for n, s in fr["s"].items()}


# ---------------------------------------------------------------- wecken
WARTEN = (0x0A, 0x0E)


def cmd_wecken(a):
    """Weckreiz: Byte S+0x0D wechselt bei einem wartenden Gegner (S+0x0A = 0x0A
    hockend, 0x0E versteckt) von 0 auf einen anderen Wert; kampffähig: erster
    Frame danach mit S+4 = 1."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "lp", "modus", "reizframe", "x_minus_kamera", "x_minus_kamera_vorframe",
                "kamera", "dx_figur", "kampffaehig_frame", "frames_bis_kampffaehig", "kamera_kampffaehig"])
    for lauf in lade_alle(a.prefix):
        for n in lauf.slots():
            r = lauf.reihe(n)
            for i in range(1, len(r)):
                fr0, s0 = r[i - 1]
                fr, s = r[i]
                if s0["mod"] in WARTEN and s0["reiz"] == 0 and s["reiz"] != 0 and s["typ"] == s0["typ"]:
                    kf = None
                    for fr2, s2 in r[i:]:
                        if s2["st"] == 1:
                            kf = fr2
                            break
                    w.writerow([lauf.name, n, TYPNAME.get(s["typ"], f"{s['typ']:X}"), s["maxlp"], s0["mod"], fr["f"],
                                s["x"] - fr["cam"], s["x"] - fr0["cam"], fr["cam"], s16((s["x"] - fr["px"]) & 0xFFFF),
                                kf["f"] if kf else "", kf["f"] - fr["f"] if kf else "", kf["cam"] if kf else ""])


# ---------------------------------------------------------------- gehen
def cmd_gehen(a):
    """Je Frame mit Gehanimation (Vorframe auch): Schritt (vx, vz) mit Nachkomma.
    Einordnung über die Ellipse (vx/A)^2 + (vz/(A/2))^2 = 1 mit A = 1,75 bzw. 2,25."""
    for t in (WOOKY, EDDY):
        paare = []
        segs = []  # Gehabschnitte: Liste der Klassen je Frame
        for lauf in lade_alle(a.prefix):
            for n in lauf.slots():
                r = lauf.reihe(n)
                cur = []
                for i in range(1, len(r)):
                    (f0, s0), (f1, s1) = r[i - 1], r[i]
                    ok = (f1["f"] == f0["f"] + 1 and s1["typ"] == t and gehend(s0) and gehend(s1) and s1["st"] == 1
                          and s1["h"] == 0 and s0["h"] == 0)
                    if not ok:
                        if cur:
                            segs.append(cur)
                        cur = []
                        continue
                    vx = abs((s1["x"] + s1["xf"] / 65536) - (s0["x"] + s0["xf"] / 65536))
                    vz = abs((s1["z"] + s1["zf"] / 65536) - (s0["z"] + s0["zf"] / 65536))
                    k = "?"
                    for A, name in ((1.75, "normal"), (2.25, "schnell")):
                        if abs((vx / A) ** 2 + (vz / (A / 2)) ** 2 - 1) < 0.02:
                            k = name
                    if vx == 0 and vz == 0:
                        k = "steht"
                    paare.append((vx, vz, k))
                    cur.append(k)
                if cur:
                    segs.append(cur)
        if not paare:
            continue
        zahl = {}
        for vx, vz, k in paare:
            zahl[k] = zahl.get(k, 0) + 1
        print(f"{TYPNAME[t]}: {len(paare)} Gehframes: " + ", ".join(f"{k} {v} ({100 * v / len(paare):.0f} %)" for k, v in sorted(zahl.items())))
        for k in ("normal", "schnell"):
            vs = [(vx, vz) for vx, vz, kk in paare if kk == k]
            if vs:
                print(f"  {k}: max vx {max(v[0] for v in vs):.4f}, max vz {max(v[1] for v in vs):.4f}, "
                      f"vz bei vx = 0: {sorted(set(round(v[1], 4) for v in vs if v[0] == 0))[:3]}")
        lang = [sg for sg in segs if len(sg) >= 8]
        sch = sum(1 for sg in lang if sg.count("schnell") > len(sg) / 2)
        print(f"  Gehabschnitte (>= 8 Frames): {len(lang)}, davon überwiegend schnell {sch} ({100 * sch / max(1, len(lang)):.0f} %)")
        rest = [(round(vx, 3), round(vz, 3)) for vx, vz, k in paare if k == "?"]
        if rest:
            hz = {}
            for v in rest:
                hz[v] = hz.get(v, 0) + 1
            print("  nicht eingeordnet (häufigste):", ", ".join(f"{v}:{c}" for v, c in sorted(hz.items(), key=lambda x: -x[1])[:6]))


# ---------------------------------------------------------------- ankunft
def cmd_ankunft(a):
    """Gehen endet in der Nähe der Figur (|dx| <= 80): Lage im ersten Frame
    ohne Gehanimation, Frames bis zum nächsten Angriffsbeginn desselben Slots."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "frame_stopp", "dx", "dz", "rang", "naechster_angriff", "frames_bis_angriff",
                "kennung", "anim_nach_stopp", "modus", "figur_status", "figur_blick", "gegner_vorn"])
    for lauf in lade_alle(a.prefix):
        att = angriffe(lauf)
        for n in lauf.slots():
            r = lauf.reihe(n)
            for i in range(1, len(r)):
                (f0, s0), (f1, s1) = r[i - 1], r[i]
                if not (gehend(s0) and not gehend(s1)) or s1["st"] != 1:
                    continue
                dx = s16((s1["x"] - f1["px"]) & 0xFFFF)
                dz = s16((s1["z"] - f1["pz"]) & 0xFFFF)
                if abs(dx) > a.maxdx:
                    continue
                nxt = [x for x in att if x["n"] == n and x["f"] >= f1["f"]]
                # nächster Angriff nur, wenn dazwischen kein neues Gehen liegt
                na = ""
                if nxt:
                    zw = [fr for fr, s in r[i:] if fr["f"] < nxt[0]["f"] and gehend(s)]
                    if not zw:
                        na = nxt[0]
                w.writerow([lauf.name, n, TYPNAME.get(s1["typ"]), f1["f"], dx, dz, f1["rang"],
                            na["f"] if na else "", na["f"] - f1["f"] if na else "", na["k"] if na else "",
                            f"{s1['anim']:X}", s1["mod"], f1["pst"], f1["blick"], int((dx > 0) == (f1["blick"] == "r"))])


# ---------------------------------------------------------------- angriffe
def cmd_angriffe(a):
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "frame", "kennung", "dx", "dz", "rang", "abstand_vorher", "gehen_dazwischen",
                "figur_status", "figur_hoehe"])
    rate = []
    for lauf in lade_alle(a.prefix):
        att = angriffe(lauf)
        last = {}
        for x in att:
            n = x["n"]
            gz = ""
            if n in last:
                gz = any(gehend(fr["s"][n]) for fr in lauf.frames if last[n] < fr["f"] < x["f"] and n in fr["s"])
            w.writerow([lauf.name, n, TYPNAME.get(x["typ"]), x["f"], x["k"], x["dx"], x["dz"], x["rang"],
                        x["f"] - last[n] if n in last else "", int(gz) if gz != "" else "", x["pst"], x["ph"]])
            last[n] = x["f"]
        # Rate je Slot: Frames ab dem ersten Frame mit S+4 = 1 bis zum Laufende
        # (oder bis der Slot frei wird), ab Frame a.ab
        for n in lauf.slots():
            r = [fr["f"] for fr, s in lauf.reihe(n) if s["st"] in (1, 3) and s["s5"] == 1 and fr["f"] >= a.ab]
            if len(r) < 500:
                continue
            k = len([x for x in att if x["n"] == n and r[0] <= x["f"] <= r[-1]])
            typ = TYPNAME.get(lauf.reihe(n)[-1][1]["typ"])
            rate.append((lauf.name, n, typ, r[0], r[-1], k, 1000 * k / (r[-1] - r[0] + 1)))
            if a.fenster:
                for v in range(r[0], r[-1] - a.fenster + 2, a.fenster):
                    k2 = len([x for x in att if x["n"] == n and v <= x["f"] < v + a.fenster])
                    rate.append((lauf.name, n, typ + f"[{a.fenster}]", v, v + a.fenster - 1, k2, 1000 * k2 / a.fenster))
    # Serien: Angriffe desselben Slots ohne Gehen dazwischen
    print()
    print("Serien (Angriffe desselben Slots ohne Gehen dazwischen):")
    for lauf in lade_alle(a.prefix):
        att = angriffe(lauf)
        for n in lauf.slots():
            xs = [x for x in att if x["n"] == n]
            if not xs:
                continue
            serien, cur = [], [xs[0]]
            for x in xs[1:]:
                geh = any(gehend(fr["s"][n]) for fr in lauf.frames if cur[-1]["f"] < fr["f"] < x["f"] and n in fr["s"])
                if geh:
                    serien.append(cur)
                    cur = [x]
                else:
                    cur.append(x)
            serien.append(cur)
            for i, se in enumerate(serien):
                ab = [se[j]["f"] - se[j - 1]["f"] for j in range(1, len(se))]
                bis_umw = next((j for j, x in enumerate(se) if x["k"] in UMWERF), None)
                nach = serien[i + 1][0]["f"] - se[-1]["f"] if i + 1 < len(serien) else ""
                print(f"  {lauf.name} Slot {n} {TYPNAME.get(se[0]['typ'])}: {'/'.join(x['k'] for x in se)} "
                      f"Rang {se[0]['rang']}-{se[-1]['rang']}, Abstände {ab}, normale vor Umwerfen {bis_umw}, "
                      f"bis zur nächsten Serie {nach}")
    print()
    print("lauf,slot,typ,von,bis,angriffe,je_1000")
    for e in rate:
        print(",".join(str(x) for x in e[:6]) + f",{e[6]:.1f}")


# ---------------------------------------------------------------- schutz
def cmd_schutz(a):
    """Schutzfenster der Figur: nach einem Treffer ohne Umwerfen (LP-Verlust in h,
    danach S+4 = 3) und nach dem Aufstehen (S+4 2 -> 3 in s). Fensterlänge = Zahl
    der Frames mit S+4 = 3 ab h bzw. s bis zum nächsten Treffer. Gezählt werden
    Angriffsbeginne und aktive Frames von WOOKY/EDDY im Fenster, LP-Verluste im
    Fenster und im Frame direkt danach."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "art", "beginn", "dauer_s4_3", "angriffsbeginne", "aktive_frames", "lp_verlust_im_fenster",
                "treffer_im_frame_danach", "gegner_in_reichweite"])
    for lauf in lade_alle(a.prefix):
        att = angriffe(lauf)
        fl = lauf.frames
        for i in range(1, len(fl) - 1):
            fr, pv = fl[i], fl[i - 1]
            treffer = fr["plp"] < fr["plp0"] and fl[i + 1]["pst"] == 3 and fr["pst"] == 3
            auf = fr["pst"] == 3 and pv["pst"] == 2
            if not (treffer or auf):
                continue
            j = i
            while j + 1 < len(fl) and fl[j + 1]["pst"] == 3 and not fl[j + 1]["plp"] < fl[j + 1]["plp0"]:
                j += 1
            dauer = j - i + 1
            von, bis = fr["f"], fl[j]["f"]
            ab = [x for x in att if von < x["f"] <= bis and x["typ"] in (WOOKY, EDDY)]
            # aktive Frames nur von Angriffen, die im Fenster begonnen haben
            akt = 0
            for x in ab:
                for f2 in range(x["f"], bis + 1):
                    s = lauf.by_f[f2]["s"].get(x["n"])
                    if s and aktiv(s):
                        akt += 1
            verl = sum(1 for f2 in fl[i + 1:j + 1] if f2["plp"] < f2["plp0"])
            nach = int(j + 1 < len(fl) and fl[j + 1]["plp"] < fl[j + 1]["plp0"])
            nah = any(abs(s16((s["x"] - f2["px"]) & 0xFFFF)) <= 70 and abs(s16((s["z"] - f2["pz"]) & 0xFFFF)) <= 11
                      and s["st"] == 1 and s["s5"] == 1 and s["typ"] in (WOOKY, EDDY)
                      for f2 in fl[i:j + 1] for s in f2["s"].values())
            w.writerow([lauf.name, "aufstehen" if auf else "treffer", von, dauer, len(ab), akt, verl, nach, int(nah)])


# ---------------------------------------------------------------- gruppe
def cmd_gruppe(a):
    for lauf in lade_alle(a.prefix):
        att = angriffe(lauf)
        # Angriffsintervall: Animation im Angriffsbereich, ohne Erholung
        # (5FB18 bzw. 644BC); mit a.erholung einschließlich Erholung
        im = {}
        for fr in lauf.frames:
            for n, s in fr["s"].items():
                g = ANGRIFF.get(s["typ"])
                if not g or not g[0] <= s["anim"] <= g[1]:
                    if not (a.erholung and s["anim"] in ERHOLUNG):
                        continue
                if s["anim"] in ERHOLUNG and not a.erholung:
                    continue
                im.setdefault(fr["f"], set()).add(n)
        hist_a, hist_k = {}, {}
        lage = {"nah_haltung": [], "abwarten": [], "spott": [], "gehen": []}
        beide = 0
        n_fr = 0
        for fr in lauf.frames:
            if fr["f"] < a.ab:
                continue
            kf = [n for n, s in fr["s"].items() if kampffaehig(s) and s["typ"] in (WOOKY, EDDY) and s["lp"] >= 0]
            if len(kf) < 3:
                continue
            n_fr += 1
            k = len(im.get(fr["f"], set()) & set(kf))
            hist_a[k] = hist_a.get(k, 0) + 1
            k2 = sum(1 for n in kf if aktiv(fr["s"][n]))
            hist_k[k2] = hist_k.get(k2, 0) + 1
            links = rechts = False
            for n in kf:
                s = fr["s"][n]
                dx = s16((s["x"] - fr["px"]) & 0xFFFF)
                dz = s16((s["z"] - fr["pz"]) & 0xFFFF)
                if abs(dx) <= 70 and abs(dz) <= 11:
                    if dx > 0:
                        rechts = True
                    else:
                        links = True
                if n in im.get(fr["f"], ()):
                    continue
                if gehend(s):
                    lage["gehen"].append(abs(dx))
                elif s["mod"] == 2:
                    lage["spott"].append(abs(dx))
                elif s["mod"] == 4:
                    lage["abwarten"].append(abs(dx))
                elif s["mod"] == 6:
                    lage["nah_haltung"].append(abs(dx))
            beide += links and rechts
        if not n_fr:
            print(lauf.name, "keine Gruppenframes")
            continue
        print(f"{lauf.name}: {n_fr} Frames mit >= 3 kampffähigen Gegnern (ab {a.ab})")
        print("  im Angriff:", ", ".join(f"{k}: {100 * v / n_fr:.1f} %" for k, v in sorted(hist_a.items())))
        print("  aktiv     :", ", ".join(f"{k}: {100 * v / n_fr:.1f} %" for k, v in sorted(hist_k.items())))
        for k, v in lage.items():
            if v:
                print(f"  {k}: Median |dx| {statistics.median(v)} ({len(v)} Frames)")
        print(f"  beide Seiten in Reichweite: {100 * beide / n_fr:.1f} %")
        ag = [x for x in att if x["f"] >= a.ab and x["typ"] in (WOOKY, EDDY)]
        if ag:
            rechts = sum(1 for x in ag if x["dx"] > 0)
            print(f"  Angriffe: {len(ag)}, von rechts {100 * rechts / len(ag):.0f} %")
            abst = [ag[i]["f"] - ag[i - 1]["f"] for i in range(1, len(ag)) if ag[i]["n"] != ag[i - 1]["n"]]
            seite = sum(1 for i in range(1, len(ag)) if ag[i]["n"] != ag[i - 1]["n"] and (ag[i]["dx"] > 0) != (ag[i - 1]["dx"] > 0)
                        and ag[i]["f"] - ag[i - 1]["f"] <= 60)
            if abst:
                print(f"  zweiter Angreifer (anderer Slot): Median {statistics.median(abst)} F, Bereich {min(abst)}-{max(abst)}, "
                      f"unter 30 F: {sum(1 for v in abst if v < 30)} von {len(abst)}; andere Seite binnen 60 F: {seite}")


# ---------------------------------------------------------------- wellen
def dolg_lp(fl, i):
    """LP des DOLG in Frame-Index i, wenn er sichtbar ist (S+5 = 1), sonst leer."""
    if i < 0:
        return ""
    for s in fl[i]["s"].values():
        if s["typ"] == DOLG and s["s5"] == 1:
            return s["lp"]
    return ""


def cmd_wellen(a):
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "slot", "typ", "maxlp", "belegt_frame", "kamera_belegt", "x", "x_minus_kamera", "s5_frame", "kamera_s5",
                "weck_frame", "kamera_weck", "kampffaehig_frame", "kamera_kampffaehig", "lebende_beim_belegen", "rang",
                "dolg_lp_vorframe", "dolg_lp_zwei_frames_vorher"])
    for lauf in lade_alle(a.prefix):
        fl = lauf.frames
        for n in range(20):
            i = 0
            while i < len(fl):
                fr = fl[i]
                s = fr["s"].get(n)
                p = fl[i - 1]["s"].get(n) if i > 0 else None
                neu = s and (i == 0 or p is None or p["typ"] != s["typ"])
                if not neu:
                    i += 1
                    continue
                leb = sum(1 for m, t in fr["s"].items() if m != n and t["st"] in (1, 2, 3) and t["typ"] in (WOOKY, EDDY, SKIP, DICK) and t["lp"] >= 0 and t["s5"] == 1)
                s5f = wf = kf = None
                j = i
                while j < len(fl) and n in fl[j]["s"] and fl[j]["s"][n]["typ"] == s["typ"]:
                    t = fl[j]["s"][n]
                    if s5f is None and t["s5"] == 1:
                        s5f = fl[j]
                    if wf is None and j > i and fl[j - 1]["s"][n]["mod"] in WARTEN and fl[j - 1]["s"][n]["reiz"] == 0 and t["reiz"] != 0:
                        wf = fl[j]
                    if kf is None and t["st"] == 1 and t["s5"] == 1:
                        kf = fl[j]
                    j += 1
                w.writerow([lauf.name, n, TYPNAME.get(s["typ"], f"{s['typ']:X}"), s["maxlp"], fr["f"], fr["cam"], s["x"], s["x"] - fr["cam"],
                            s5f["f"] if s5f else "", s5f["cam"] if s5f else "", wf["f"] if wf else "", wf["cam"] if wf else "",
                            kf["f"] if kf else "", kf["cam"] if kf else "", leb, fr["rang"], dolg_lp(fl, i - 1), dolg_lp(fl, i - 2)])
                i = j


# ---------------------------------------------------------------- kamera
def cmd_kamera(a):
    for lauf in lade_alle(a.prefix):
        fl = lauf.frames
        i = 0
        while i < len(fl):
            j = i
            while j + 1 < len(fl) and fl[j + 1]["cam"] == fl[i]["cam"]:
                j += 1
            if j - i + 1 >= a.min:
                fr = fl[i]
                leb = [f"{n}:{TYPNAME.get(s['typ'], hex(s['typ']))}" for n, s in fr["s"].items()
                       if s["st"] in (1, 2, 3) and s["lp"] >= 0 and s["s5"] == 1 and s["typ"] in (WOOKY, EDDY, SKIP, DICK)]
                leb2 = [n for n, s in fl[j]["s"].items() if s["st"] in (1, 2, 3) and s["lp"] >= 0 and s["s5"] == 1 and s["typ"] in (WOOKY, EDDY, SKIP, DICK)]
                pxr = fl[j]["px"] - fl[j]["cam"]
                print(f"{lauf.name}: Kamera {fr['cam']} steht {fr['f']}-{fl[j]['f']} ({j - i + 1} F), lebend beim Halt {len(leb)} ({' '.join(leb)}), am Ende {len(leb2)}, Figur x-Kamera am Ende {pxr}")
            i = j + 1


# ---------------------------------------------------------------- reakt
def geh_bis_haltung(lauf, n, e0, e1, zur, ende):
    """Gehframes des Slots ab Eingabebeginn bis zur Rückkehr in die Kampfhaltung
    (bzw. Fensterende) und Bereich von dx in dieser Zeit."""
    bis = e1 + zur if zur != "" else ende
    geh, dxs = 0, []
    for f in range(e0, bis):
        fr = lauf.by_f.get(f)
        if not fr or n not in fr["s"]:
            break
        s = fr["s"][n]
        geh += gehend(s)
        dxs.append(s16((s["x"] - fr["px"]) & 0xFFFF))
    return [geh, min(dxs) if dxs else "", max(dxs) if dxs else ""]


def cmd_reakt(a):
    """Für jede Zeile in <lauf>_reakt.txt: Verhalten des auslösenden Slots
    in den nächsten a.fenster Frames."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "ausloeser", "slot", "typ", "dx0", "dz0", "anim0", "modus0", "eingabe_von", "eingabe_bis", "gehframes_in_eingabe",
                "vx_gehen", "dx_ende_eingabe", "dz_ende_eingabe", "letzter_gehframe", "erste_reaktion", "zurueck_haltung_nach_eingabe",
                "angriffe_im_fenster", "erster_angriff_nach_eingabe", "modi_nach_eingabe", "figur_getroffen_in_eingabe",
                "gehframes_bis_haltung", "dx_min", "dx_max"])
    for p in a.prefix:
        rf = Path(p + "_reakt.txt")
        if not rf.exists():
            continue
        lauf = Lauf(p)
        att = angriffe(lauf)
        ins = list(csv.DictReader(open(p + "_inputs.csv")))
        for line in rf.read_text().split("\n"):
            if not line.strip():
                continue
            t, n, dx0, dz0 = (int(x) for x in line.split())
            ein = [int(r["frame"]) for r in ins if int(r["frame"]) > t and r["inputs"]]
            e0 = ein[0] if ein else t + 2
            e1 = e0
            while e1 + 1 in set(ein):
                e1 += 1
            s0 = lauf.by_f[t]["s"][n]
            geh = []
            first = None
            for f in range(t + 1, t + a.fenster):
                fr = lauf.by_f.get(f)
                if not fr or n not in fr["s"]:
                    break
                s = fr["s"][n]
                if first is None and (s["anim"] != s0["anim"] and not haltung(s) or s["mod"] != s0["mod"]):
                    first = (f, f"{s['anim']:X}", s["mod"])
                if gehend(s) and e0 <= f <= e1 + 1:
                    geh.append(f)
            vx = ""
            if len(geh) >= 2:
                xa = lauf.by_f[geh[0]]["s"][n]["x"]
                xb = lauf.by_f[geh[-1]]["s"][n]["x"]
                vx = f"{abs(xb - xa) / max(1, geh[-1] - geh[0]):.2f}"
            fe = lauf.by_f.get(e1 + 1)
            dxe = dze = ""
            if fe and n in fe["s"]:
                dxe = s16((fe["s"][n]["x"] - fe["px"]) & 0xFFFF)
                dze = s16((fe["s"][n]["z"] - fe["pz"]) & 0xFFFF)
            # letzter Gehframe nach Eingabeende und Rückkehr in Kampfhaltung (Modus 6) mit |dx| <= 70
            lg = ""
            zur = ""
            modi = []
            for f in range(e1 + 1, t + a.fenster):
                fr = lauf.by_f.get(f)
                if not fr or n not in fr["s"]:
                    break
                s = fr["s"][n]
                if gehend(s):
                    lg = f
                if not modi or modi[-1] != s["mod"]:
                    modi.append(s["mod"])
                if zur == "" and s["mod"] == 6 and haltung(s):
                    zur = f - e1
            ag = [x for x in att if x["n"] == n and t < x["f"] < t + a.fenster]
            an = [x for x in ag if x["f"] > e1]
            w.writerow([lauf.name, t, n, TYPNAME.get(s0["typ"]), dx0, dz0, f"{s0['anim']:X}", s0["mod"], e0, e1, len(geh), vx, dxe, dze, lg,
                        f"{first[0] - e0}:{first[1]}:{first[2]}" if first else "", zur, len(ag),
                        an[0]["f"] - e1 if an else "", "/".join(str(m) for m in modi[:8]),
                        sum(1 for f in range(e0, e1 + 2) if f in lauf.by_f and lauf.by_f[f]["plp"] < lauf.by_f[f]["plp0"]),
                        *geh_bis_haltung(lauf, n, e0, e1, zur, t + a.fenster)])


# ---------------------------------------------------------------- tiefe
def cmd_tiefe(a):
    """Nach einer Reaktion (CC_REAKT) mit Tiefenschritt: erster Frame c mit
    |dz| >= 12 des auslösenden Gegners, dessen Phase in c, erster Frame r >= c,
    in dem er geht oder den Modus 6 verlässt, und was danach kommt."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "ausloeser", "slot", "typ", "dz0", "phase_ausloeser", "frame_dz12", "dz_vorher", "phase_bei_dz12",
                "reaktion_frame", "reaktion_minus_dz12", "dz_bei_reaktion", "phase_vorher", "reaktion_in_phase",
                "naechste_haltung_dx", "naechste_haltung_modus", "naechster_angriff_nach_schritt", "dz_beim_angriff",
                "figur_getroffen_bis_angriff"])
    for p in a.prefix:
        rf = Path(p + "_reakt.txt")
        if not rf.exists():
            continue
        lauf = Lauf(p)
        att = angriffe(lauf)
        for line in rf.read_text().split("\n"):
            if not line.strip():
                continue
            t, n, dx0, dz0 = (int(x) for x in line.split())
            s0 = lauf.by_f[t]["s"][n]
            c = None
            for f in range(t + 1, t + 120):
                fr = lauf.by_f.get(f)
                if not fr or n not in fr["s"]:
                    break
                dz = s16((fr["s"][n]["z"] - fr["pz"]) & 0xFFFF)
                if abs(dz) >= 12:
                    c = f
                    break
            if c is None:
                w.writerow([lauf.name, t, n, TYPNAME.get(s0["typ"]), dz0, phase(s0), "", "", "", "", "", "", "", "", "", "", "", "", ""])
                continue
            frc = lauf.by_f[c]
            dzv = s16((lauf.by_f[c - 1]["s"][n]["z"] - lauf.by_f[c - 1]["pz"]) & 0xFFFF)
            ph_c = phase(frc["s"][n])
            r = None
            for f in range(c, c + 200):
                fr = lauf.by_f.get(f)
                if not fr or n not in fr["s"]:
                    break
                s = fr["s"][n]
                if gehend(s) or s["mod"] != 6:
                    r = f
                    break
            if r is None:
                w.writerow([lauf.name, t, n, TYPNAME.get(s0["typ"]), dz0, phase(s0), c, dzv, ph_c, "", "", "", "", "", "", "", "", "", ""])
                continue
            sr = lauf.by_f[r]["s"][n]
            dzr = s16((sr["z"] - lauf.by_f[r]["pz"]) & 0xFFFF)
            ph_v = phase(lauf.by_f[r - 1]["s"][n])
            # nächste Ruhelage nach dem Gehen: erster Frame nach r ohne Gehen
            hx = hm = ""
            for f in range(r + 1, r + 600):
                fr = lauf.by_f.get(f)
                if not fr or n not in fr["s"]:
                    break
                s = fr["s"][n]
                if not gehend(s) and s["mod"] in (2, 4, 6) and lauf.by_f[f - 1]["s"][n] and gehend(lauf.by_f[f - 1]["s"][n]):
                    hx = s16((s["x"] - fr["px"]) & 0xFFFF)
                    hm = s["mod"]
                    break
            na = [x for x in att if x["n"] == n and x["f"] > c]
            nf = na[0]["f"] - c if na and na[0]["f"] - c <= a.max else ""
            ndz = na[0]["dz"] if nf != "" else ""
            bis = na[0]["f"] if nf != "" else c + a.max
            getr = sum(1 for f in range(c, bis) if f in lauf.by_f and lauf.by_f[f]["plp"] < lauf.by_f[f]["plp0"])
            w.writerow([lauf.name, t, n, TYPNAME.get(s0["typ"]), dz0, phase(s0), c, dzv, ph_c, r, r - c, dzr, ph_v,
                        "gehen" if gehend(sr) else f"modus{sr['mod']}", hx, hm, nf, ndz, getr])


# ---------------------------------------------------------------- zusammenfassung
def cmd_zusammenfassung(a):
    """Kennzahlen je Zeile der Prüftabelle (A1 bis A4) über alle angegebenen Läufe."""
    laeufe = list(lade_alle(a.prefix))
    # A1 Sichtbarkeitsfenster: nur Frames mit stehender Kamera und stehendem Gegner
    fen = {}
    for lauf in laeufe:
        prev = None
        for fr in lauf.frames:
            if prev and prev["cam"] == fr["cam"]:
                for n, s in fr["s"].items():
                    p0 = prev["s"].get(n)
                    if not p0 or p0["x"] != s["x"] or p0["typ"] != s["typ"]:
                        continue
                    g = "DOLG" if s["typ"] == DOLG else "andere"
                    xc = s["x"] - fr["cam"]
                    seite = "rechts" if xc > 192 else "links"
                    e = fen.setdefault((g, seite), {1: [], 0: []})
                    e[s["s5"]].append(xc)
            prev = fr
    print("A1 sichtbar (stehende Kamera, stehender Gegner):")
    for (g, seite), e in sorted(fen.items()):
        if seite == "rechts":
            print(f"  {g} rechts: S+5=1 bis x-Kamera {max(e[1]) if e[1] else '-'}, S+5=0 ab {min(e[0]) if e[0] else '-'}")
        else:
            print(f"  {g} links: S+5=1 ab x-Kamera {min(e[1]) if e[1] else '-'}, S+5=0 bis {max(e[0]) if e[0] else '-'}")
    # A1 Aufwachen (natürlich): x - Kamera des Vorframes im Reizframe
    wz, dauer = [], {}
    for lauf in laeufe:
        for n in lauf.slots():
            r = lauf.reihe(n)
            for i in range(1, len(r)):
                (f0, s0), (f1, s1) = r[i - 1], r[i]
                if s0["mod"] in WARTEN and s0["reiz"] == 0 and s1["reiz"] != 0 and s0["typ"] == s1["typ"]:
                    wz.append((s1["x"] - f0["cam"], s16((s1["x"] - f1["px"]) & 0xFFFF), s1["x"] - f1["cam"],
                               "stehend" if f0["cam"] == f1["cam"] else "fahrend"))
                    kf = next((fr2["f"] for fr2, s2 in r[i:] if s2["st"] == 1), None)
                    if kf:
                        k = (TYPNAME.get(s1["typ"]), "versteckt" if s0["mod"] == 0x0E else "hockend")
                        dauer.setdefault(k, set()).add(kf - f1["f"])
    for art in ("stehend", "fahrend"):
        ww = [w for w in wz if w[3] == art]
        if ww:
            print(f"A1 Weckreiz bei {art}er Kamera: {len(ww)} Fälle, x - Kamera(Vorframe) {min(w[0] for w in ww)}-{max(w[0] for w in ww)}, "
                  f"x - Kamera(Frame-Ende) {min(w[2] for w in ww)}-{max(w[2] for w in ww)}, Abstand zur Figur {min(w[1] for w in ww)}-{max(w[1] for w in ww)}")
    if wz:
        print("A1 Reiz bis S+4 = 1:", ", ".join(f"{k[0]} {k[1]} {sorted(v)}" for k, v in sorted(dauer.items())))
    # A2/A3 Ankunft
    stop, dzs, pause, erst = {}, [], {}, {}
    for lauf in laeufe:
        att = angriffe(lauf)
        for n in lauf.slots():
            r = lauf.reihe(n)
            for i in range(2, len(r)):
                (fa, sa), (f0, s0), (f1, s1) = r[i - 2], r[i - 1], r[i]
                if not (gehend(s0) and not gehend(s1)) or s1["st"] != 1 or s1["mod"] != 6 or f1["pst"] != 1:
                    continue
                if s1["typ"] not in (WOOKY, EDDY):
                    continue
                dx = s16((s1["x"] - f1["px"]) & 0xFFFF)
                if abs(dx) > 80:
                    continue
                dzs.append(abs(s16((s1["z"] - f1["pz"]) & 0xFFFF)))
                vx = abs((s0["x"] + s0["xf"] / 65536) - (sa["x"] + sa["xf"] / 65536))
                vz = abs((s0["z"] + s0["zf"] / 65536) - (sa["z"] + sa["zf"] / 65536))
                tempo = "schnell" if (vx / 2.25) ** 2 + (vz / 1.125) ** 2 > 0.9 and vx > 1.76 or vz > 0.88 else "normal"
                k = ("rechts" if dx > 0 else "links", tempo)
                stop.setdefault(k, []).append(abs(dx))
                nxt = [x for x in att if x["n"] == n and x["f"] >= f1["f"]]
                if nxt and not any(gehend(s) for fr, s in r[i:] if fr["f"] < nxt[0]["f"]):
                    pause.setdefault(f1["rang"], set()).add(nxt[0]["f"] - f1["f"])
                    t = TYPNAME[s1["typ"]]
                    erst.setdefault(t, {}).setdefault(nxt[0]["k"], 0)
                    erst[t][nxt[0]["k"]] += 1
    if dzs:
        print(f"A2 Tiefe beim Stillstand: {len(dzs)} Fälle, |dz| Median {statistics.median(dzs)}, Maximum {max(dzs)}")
    for k, v in sorted(stop.items()):
        hz = {}
        for x in v:
            hz[x] = hz.get(x, 0) + 1
        print(f"A2 Stillstand {k[0]} der Figur nach {k[1]}em Gehen: " + ", ".join(f"{x}:{c}" for x, c in sorted(hz.items())))
    print("A3 Pause bis zum ersten Angriff je Rang:", ", ".join(f"{g}: {sorted(v)}" for g, v in sorted(pause.items())))
    for t, e in sorted(erst.items()):
        print(f"A3 erster Angriff {t}: " + ", ".join(f"{k} {c}" for k, c in sorted(e.items())) + f" (von {sum(e.values())})")
    # A4 Serien
    inn, umw, luecke = {}, [], {}
    for lauf in laeufe:
        att = angriffe(lauf)
        for n in lauf.slots():
            xs = [x for x in att if x["n"] == n and x["typ"] in (WOOKY, EDDY)]
            if not xs:
                continue
            geh = {fr["f"] for fr, s in lauf.reihe(n) if gehend(s)}
            serien, cur = [], [xs[0]]
            for x in xs[1:]:
                if any(cur[-1]["f"] < f < x["f"] for f in geh):
                    serien.append(cur)
                    cur = [x]
                else:
                    cur.append(x)
            serien.append(cur)
            t = TYPNAME[xs[0]["typ"]]
            for i, se in enumerate(serien):
                for j in range(1, len(se)):
                    inn.setdefault(se[j]["rang"], []).append(se[j]["f"] - se[j - 1]["f"])
                k = next((j for j, x in enumerate(se) if x["k"] in UMWERF), None)
                if k is not None:
                    umw.append(k)
                if i + 1 < len(serien):
                    luecke.setdefault(t, []).append(serien[i + 1][0]["f"] - se[-1]["f"])
    for g in sorted(inn):
        print(f"A4 Abstand in einer Serie, Rang {g}: {min(inn[g])}-{max(inn[g])} ({len(inn[g])})")
    if umw:
        print(f"A4 normale Angriffe vor dem Umwerf-Angriff: Median {statistics.median(umw)}, {min(umw)}-{max(umw)} ({len(umw)} Serien)")
    for t, v in sorted(luecke.items()):
        print(f"A4 Abstand mit Unterbrechung {t}: {min(v)}-{max(v)}, Median {statistics.median(v)} ({len(v)})")


# ---------------------------------------------------------------- sprung
def cmd_sprung(a):
    """Sprünge der Figur (Höhe > 0, Aktion 0x0A). Ein Angriff zählt, wenn seine
    aktiven Frames (S+0x24) in die Luftzeit fallen; Treffer = LP-Verlust in der
    Luftzeit oder im Frame danach."""
    w = csv.writer(sys.stdout)
    w.writerow(["lauf", "sprung_von", "sprung_bis", "angriffe_aktiv_in_luft", "kennungen", "aus_haltung", "treffer",
                "umgeworfen", "lp_verlust", "hoehe_beim_treffer", "gegner_haltung_bei_absprung", "max_hoehe_aktiv_ohne_treffer"])
    tot = {"spruenge": 0, "mit_angriff": 0, "treffer": 0, "umgeworfen": 0, "haltung": 0, "haltung_mit_angriff": 0}
    for lauf in lade_alle(a.prefix):
        att = angriffe(lauf)
        fl = lauf.frames
        i = 1
        while i < len(fl):
            if fl[i]["ph"] > 0 and fl[i - 1]["ph"] <= 0 and fl[i]["pact"] == 0x0A:
                j = i
                while j + 1 < len(fl) and fl[j + 1]["ph"] > 0:
                    j += 1
                von, bis = fl[i]["f"], fl[j]["f"]
                ag = []
                for x in att:
                    if x["typ"] not in (WOOKY, EDDY) or x["f"] > bis or x["f"] < von - 40:
                        continue
                    akt = [f for f in range(x["f"], x["f"] + 40) if f in lauf.by_f and x["n"] in lauf.by_f[f]["s"]
                           and aktiv(lauf.by_f[f]["s"][x["n"]])]
                    if akt and akt[0] <= bis and akt[-1] >= von:
                        ag.append(x)
                ah = 0
                for x in ag:
                    pr = lauf.by_f.get(x["f"] - 1)
                    if pr and x["n"] in pr["s"] and haltung(pr["s"][x["n"]]):
                        ah += 1
                tr = [fr for fr in fl[i:j + 2] if fr["plp"] < fr["plp0"]]
                umg = any(fr["pst"] == 2 for fr in fl[i:j + 12])
                hb = sum(1 for s in fl[i - 1]["s"].values() if haltung(s) and s["mod"] == 6 and s["typ"] in (WOOKY, EDDY)
                         and abs(s16((s["x"] - fl[i - 1]["px"]) & 0xFFFF)) <= 70)
                hmax = ""
                if ag and not tr:
                    hs = [fr["ph"] for fr in fl[i:j + 1] for s in fr["s"].values() if aktiv(s) and s["typ"] in (WOOKY, EDDY)]
                    hmax = min(hs) if hs else ""
                w.writerow([lauf.name, von, bis, len(ag), "/".join(x["k"] for x in ag), ah, len(tr), int(umg),
                            sum(fr["plp0"] - fr["plp"] for fr in tr), tr[0]["ph"] if tr else "", hb, hmax])
                tot["spruenge"] += 1
                tot["mit_angriff"] += bool(ag)
                tot["treffer"] += bool(tr)
                tot["umgeworfen"] += bool(tr) and umg
                tot["haltung"] += hb > 0
                tot["haltung_mit_angriff"] += hb > 0 and bool(ag)
                i = j + 1
            else:
                i += 1
    print("Summe:", ", ".join(f"{k} {v}" for k, v in tot.items()))
    print("Phasen der kampffähigen WOOKY/EDDY ab Frame 201 (Anteil der Frames, Median |dx|):")
    for lauf in lade_alle(a.prefix):
        for n in lauf.slots():
            r = [(fr, s) for fr, s in lauf.reihe(n) if s["typ"] in (WOOKY, EDDY) and kampffaehig(s) and fr["f"] > 200]
            if len(r) < 300:
                continue
            c = {}
            for fr, s in r:
                k = phase(s)
                if k == "haltung":
                    k = {6: "kampfhaltung", 4: "abwarten", 2: "spott"}.get(s["mod"], "haltung")
                c.setdefault(k, []).append(abs(s16((s["x"] - fr["px"]) & 0xFFFF)))
            print(f"  {lauf.name} Slot {n} {TYPNAME[r[0][1]['typ']]}: " + ", ".join(
                f"{k} {100 * len(v) / len(r):.0f} % ({statistics.median(v)})" for k, v in sorted(c.items(), key=lambda x: -len(x[1]))))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn, hilfe in [
        ("anims", cmd_anims, "Animationszeiger je Gegnertyp mit Häufigkeit, aktiven Frames und Vorgängern."),
        ("sichtbar", cmd_sichtbar, "Wechsel von S+5 mit x - Kamera-x im Wechselframe."),
        ("wecken", cmd_wecken, "Weckreiz wartender Gegner (S+0x0D) mit x - Kamera und Zeit bis S+4 = 1."),
        ("gehen", cmd_gehen, "Schrittweiten der Gegner beim Gehen in x und Tiefe."),
        ("ankunft", cmd_ankunft, "Stillstand nach dem Gehen nahe der Figur und Zeit bis zum ersten Angriff."),
        ("angriffe", cmd_angriffe, "Angriffsbeginne mit Typ, Abständen und Rate je 1000 Frames."),
        ("schutz", cmd_schutz, "Angriffe und LP-Verluste in den Schutzfenstern der Figur."),
        ("gruppe", cmd_gruppe, "Gruppenstatistik bei mindestens drei kampffähigen Gegnern."),
        ("wellen", cmd_wellen, "Erscheinen der Gegner mit Kamera-x bei Belegen, Sichtbarkeit, Aufwachen, Kampffähigkeit."),
        ("kamera", cmd_kamera, "Kamerahalte mit Zahl lebender Gegner."),
        ("reakt", cmd_reakt, "Verhalten des auslösenden Gegners nach einer Reaktion der Figur (CC_REAKT)."),
        ("sprung", cmd_sprung, "Sprünge der Figur mit Angriffen und Treffern in der Luft."),
        ("tiefe", cmd_tiefe, "Reaktion des Gegners, wenn ein Tiefenschritt der Figur |dz| >= 12 macht."),
        ("zusammenfassung", cmd_zusammenfassung, "Kennzahlen für die Zeilen A1 bis A4 über alle angegebenen Läufe."),
    ]:
        p = sub.add_parser(name, help=hilfe, description=hilfe)
        p.add_argument("prefix", nargs="+", help="Präfixe unter logs/raw (ohne _ram.bin)")
        p.set_defaults(fn=fn)
        if name == "anims":
            p.add_argument("--alle", action="store_true", help="auch andere Typen")
        if name in ("angriffe", "gruppe"):
            p.add_argument("--ab", type=int, default=1, help="erst ab diesem Frame zählen")
        if name == "gruppe":
            p.add_argument("--erholung", action="store_true", help="Erholung (5FB18, 644BC) zum Angriff zählen")
        if name == "angriffe":
            p.add_argument("--fenster", type=int, default=0, help="zusätzlich Raten in Fenstern dieser Länge")
        if name == "ankunft":
            p.add_argument("--maxdx", type=int, default=80)
        if name == "kamera":
            p.add_argument("--min", type=int, default=300, help="Mindestdauer eines Halts in Frames")
        if name == "reakt":
            p.add_argument("--fenster", type=int, default=700)
        if name == "tiefe":
            p.add_argument("--max", type=int, default=600, help="Höchstabstand bis zum nächsten Angriff")
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
