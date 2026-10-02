#!/usr/bin/env python3
"""Spezialangriff und Sprint (Praefixe spezial, sprint), nur Standardbibliothek.

Die Unterbefehle spezial und sprint sind in messen_a5.py angemeldet und hier
umgesetzt; die Zusammenfassungen fuer logs/spezial.csv und logs/sprint.csv
laufen ueber dieses Skript direkt. Adressen siehe notes.md ("Gefundene
Adressen"); Frames sind lokale Frames des Runners.

Unterbefehle:
  spezial PREFIX..   Ereignisse je Lauf: Eingaben, Aktion und Status der Figur,
                     Timer FFAA69, LP der Figur, Treffer, Umwerfen, Griff,
                     Angriffe der Gegner, Ruhelage umgeworfener Gegner;
                     --frames: je Frame Bildnummer der Animation und Lage jedes
                     Gegners bis zu seinem ersten Treffer
  sprint PREFIX..    dasselbe mit dem Sprint als Bezug; --tempo: Bewegung der
                     Figur je Abschnitt gleicher Aktion, Geschwindigkeit und
                     Eingabe
  zusammenfassung-spezial EREIGNISSE FRAMES  Befunde aus den CSV-Ausgaben von
                     spezial und spezial --frames (fuer belege_spezial.sh)
  zusammenfassung-sprint EREIGNISSE FRAMES TEMPO  Befunde aus sprint, sprint
                     --frames und sprint --tempo (fuer belege_sprint.sh)
  verdichtet FRAMES  --frames-Ausgabe je Lauf, Slot und Bild zusammengefasst

Bezugsframe P (Spalte bezug): beim Spezialangriff der erste Frame, in dem
Angriff und Sprung gedrueckt sind und mindestens eine der Tasten neu ist
(sonst der erste neue Druck von Angriff oder Sprung); beim Sprint der letzte
neue Angriffsdruck, sonst der letzte neue Sprungdruck, sonst der zweite Druck
der Richtung. dx, dz: Gegner minus Figur, ganzzahlig am Frame-Ende.
"""

import argparse
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P1 = 0xFFA990
X, Z, H = P1 + 0x0E, P1 + 0x16, P1 + 0x12
ACTION, STATE, HP = P1 + 0x0A, P1 + 0x04, P1 + 0x40
T_UP = 0xFFAA69                        # Schutz-Timer (nach dem Aufstehen, nach dem Spezialangriff)
FIGUR = 0xFFAA34
SLOT_BASE, SLOT_SIZE = 0xFFBC90, 0xC0
TASTEN = {"P1 Button 1": "A", "P1 Button 2": "J", "P1 Left": "L", "P1 Right": "R",
          "P1 Up": "H", "P1 Down": "U"}


def fix(d, f, addr):
    return d.value(f, addr, 4, signed=True) / 65536


def eingaben(prefix):
    """{frame: Menge der gedrueckten Tasten (A J L R H U)}"""
    return {int(r["frame"]): {TASTEN.get(k, k) for k in r["inputs"].split("|") if k}
            for r in csv.DictReader(open(prefix + "_inputs.csv"))}


def neu(ein, f, t):
    return t in ein.get(f, ()) and t not in ein.get(f - 1, ())


def bezug(ein, art):
    fr = sorted(ein)
    if art == "spezial":
        for f in fr:
            if {"A", "J"} <= ein[f] and (neu(ein, f, "A") or neu(ein, f, "J")):
                return f
        return next((f for f in fr if neu(ein, f, "A") or neu(ein, f, "J")), fr[0])
    for t in ("A", "J"):
        n = [f for f in fr if neu(ein, f, t)]
        if n:
            return n[-1]
    for t in ("R", "L", "H", "U"):
        n = [f for f in fr if neu(ein, f, t)]
        if len(n) >= 2:
            return n[1]
    return fr[0]


def lage(d, f, n):
    s = SLOT_BASE + n * SLOT_SIZE
    return (d.value(f, s + 0x0E, 2) - d.value(f, X, 2), d.value(f, s + 0x16, 2) - d.value(f, Z, 2),
            d.value(f, s + 0x12, 2, True))


def angriff_aktiv(at):
    """Trefferattribut S+0x24 eines Gegners aktiv (wie messen_a5.py angreifer)."""
    return bool(at & 0xC000) and at >> 8 != 0xFF


def ereignisse(prefix, art):
    """(frame, ereignis, slot, wert, dx, dz, hoehe) eines Laufs."""
    d = Dump(prefix)
    ein = eingaben(prefix)
    p = bezug(ein, art)
    ev = []
    fr = d.frames
    for f0, f in zip(fr, fr[1:]):
        if ein.get(f) != ein.get(f0):
            ev.append((f, "eingabe " + ("+".join(sorted(ein.get(f, ()))) or "-"), "", "", "", "", ""))
        a0, a1 = d.value(f0, ACTION, 2), d.value(f, ACTION, 2)
        if a0 != a1:
            ev.append((f, f"aktion {a0:#x}->{a1:#x}", "", "", "", "", d.value(f, H, 2, True)))
        s0, s1 = d.value(f0, STATE), d.value(f, STATE)
        if s0 != s1:
            ev.append((f, f"status {s0}->{s1}", "", "", "", "", ""))
        t0, t1 = d.value(f0, T_UP), d.value(f, T_UP)
        if (t0 == 0) != (t1 == 0):
            ev.append((f, "timer_start" if t1 else "timer_ende", "", t1 or t0, "", "", ""))
        l0, l1 = d.value(f0, HP, 2, True), d.value(f, HP, 2, True)
        if l1 != l0:
            ev.append((f, "lp_figur", "P1", l1 - l0, "", "", l1))
        for n in range(20):
            s = SLOT_BASE + n * SLOT_SIZE
            if not d.value(f0, s + 4):
                continue
            g0, g1 = d.value(f0, s + 0x40, 2, True), d.value(f, s + 0x40, 2, True)
            if g1 < g0:
                ev.append((f, "treffer", n, g0 - g1, *lage(d, f, n)))
                down = next((g for g in range(f, f + 3) if g in d.offsets and d.value(g, s + 4) == 2), None)
                if down:
                    ev.append((down, "umgeworfen", n, "", *lage(d, down, n)))
            elif (d.value(f0, s + 4) == 1 and d.value(f, s + 4) in (2, 3) and f + 1 in d.offsets
                  and d.value(f + 1, s + 0x0A, 2) == 2):
                ev.append((f, "griff", n, "", *lage(d, f, n)))
            if d.value(f, s + 5) and angriff_aktiv(d.value(f, s + 0x24, 2)) != angriff_aktiv(d.value(f0, s + 0x24, 2)):
                e = "gegner_angriff" if angriff_aktiv(d.value(f, s + 0x24, 2)) else "gegner_angriff_ende"
                ev.append((f, e, n, f"{d.value(f, s + 0x24, 2) or d.value(f0, s + 0x24, 2):#06x}", *lage(d, f, n)))
        # zerschlagbare Gegenstaende (Slots 20-59, kleine LP, z. B. Kisten mit 1 LP)
        for n in range(20, 60):
            s = SLOT_BASE + n * SLOT_SIZE
            if not d.value(f0, s + 4):
                continue
            g0, g1 = d.value(f0, s + 0x40, 2, True), d.value(f, s + 0x40, 2, True)
            if 0 < g0 <= 99 and g1 < g0:
                ev.append((f, "objekt_treffer", n, f"{d.value(f, s + 0x38, 4):#x}", *lage(d, f, n)))
    # Ruhelage umgeworfener Gegner: x 5 Frames konstant, Hoehe 0; wert = Weg ab dem Umwerfen
    for f, e, n, *_ in list(ev):
        if e != "umgeworfen":
            continue
        s = SLOT_BASE + n * SLOT_SIZE
        x0 = fix(d, f, s + 0x0E)
        for g in fr:
            if g > f + 3 and d.value(g, s + 0x12, 2, True) == 0 and all(
                    g + k in d.offsets and fix(d, g + k, s + 0x0E) == fix(d, g, s + 0x0E) for k in range(1, 6)):
                ev.append((g, "gegner_ruhe", n, f"{fix(d, g, s + 0x0E) - x0:+g}", *lage(d, g, n)))
                break
    # Bewegung der Figur waehrend der Aktion, die der Bezugsdruck ausloest: je Abschnitt
    # gleicher Geschwindigkeit ein Ereignis (wert = vx/vz in px/Frame, 16.16)
    a_ref = d.value(p + 1, ACTION, 2) if p + 1 in d.offsets else 0
    if a_ref and art == "spezial":
        seg = None
        for f in fr:
            if f <= p:
                continue
            if d.value(f, ACTION, 2) != a_ref:
                break
            v = (fix(d, f, X) - fix(d, f - 1, X), fix(d, f, Z) - fix(d, f - 1, Z))
            if v != seg:
                if v != (0, 0) or seg is not None:
                    ev.append((f, "bewegung_in_aktion", "", f"{v[0]:+g}/{v[1]:+g}", "", "", ""))
                seg = v
    # erste Bewegung der Figur nach dem Ende der Aktion, die der Bezugsdruck ausloest
    ende = next((f for f in fr if f > p + 1 and d.value(f, ACTION, 2) == 0 and d.value(f - 1, ACTION, 2)), None)
    if ende:
        mv = next((f for f in fr if f >= ende and (d.value(f, X, 4) != d.value(f - 1, X, 4)
                                                   or d.value(f, Z, 4) != d.value(f - 1, Z, 4))), None)
        if mv:
            ev.append((mv, "figur_bewegt", "", "", "", "", ""))
    ev.sort(key=lambda e: (e[0], e[1]))
    return d, p, ev


def ausgabe(args, art):
    print("lauf,figur,bezug,frame,rel,ereignis,slot,wert,dx,dz,hoehe")
    for prefix in args.prefix:
        d, p, ev = ereignisse(prefix, art)
        name = Path(prefix).name
        fig = d.value(d.frames[0], FIGUR) if d.start <= FIGUR < d.start + d.size else ""
        for f, e, n, w, dx, dz, h in ev:
            print(f"{name},{fig},{p},{f},{f - p:+d},{e},{n},{w},{dx},{dz},{h}")


def frames(args, art):
    """Je Frame ab P+1, solange die Aktion von P+1 laeuft (beim Sprint: bis
    zum Ende der Aktion des Bezugsdrucks plus --nach Frames): Bildnummer
    der Animation seit Aktionsbeginn, Hoehe der Figur, Lage jedes angezeigten
    Gegners (bis zu seinem ersten Treffer) und ob er in diesem Frame LP verliert."""
    print("lauf,bezug,frame,rel,p_aktion,bild,p_hoehe,slot,dx,dz,hoehe,treffer,schaden,g_aktion_vorher")
    for prefix in args.prefix:
        d = Dump(prefix)
        p = bezug(eingaben(prefix), art)
        name = Path(prefix).name
        a_ref = d.value(p + 1, ACTION, 2) if p + 1 in d.offsets else 0
        bild, last, getroffen, nach = 0, None, set(), None
        for f in range(p + 1, d.frames[-1] + 1):
            a = d.value(f, ACTION, 2)
            if nach is None and (a != a_ref or a == 0):
                nach = f + getattr(args, "nach", 0)
            if nach is not None and f >= nach:
                break
            an = d.value(f, P1 + 0x1C, 4)
            if an != last:
                bild += 1
                last = an
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if n in getroffen or not (d.value(f, s + 4) and d.value(f, s + 5)):
                    continue
                dx, dz, h = lage(d, f, n)
                if abs(dx) > 250:
                    continue
                dmg = d.value(f - 1, s + 0x40, 2, True) - d.value(f, s + 0x40, 2, True)
                if dmg > 0:
                    getroffen.add(n)
                print(f"{name},{p},{f},{f - p:+d},{a:#x},{bild},{d.value(f, H, 2, True)},{n},{dx},{dz},{h},"
                      f"{'ja' if dmg > 0 else 'nein'},{max(dmg, 0)},{d.value(f - 1, s + 0x0A, 2):#x}")


def tempo(args):
    print("lauf,von,bis,frames,p_aktion,vx,vz,vh,eingabe,x_ende,z_ende,h_ende")
    for prefix in args.prefix:
        d = Dump(prefix)
        ein = eingaben(prefix)
        name = Path(prefix).name
        segs = []
        for f in d.frames[1:]:
            k = (d.value(f, ACTION, 2), fix(d, f, X) - fix(d, f - 1, X), fix(d, f, Z) - fix(d, f - 1, Z),
                 fix(d, f, H) - fix(d, f - 1, H), "+".join(sorted(ein.get(f, ()))) or "-")
            if segs and segs[-1][2] == k:
                segs[-1][1] = f
            else:
                segs.append([f, f, k])
        for a, b, (act, vx, vz, vh, inp) in segs:
            print(f"{name},{a},{b},{b - a + 1},{act:#x},{vx:+.6g},{vz:+.6g},{vh:+.6g},{inp},"
                  f"{fix(d, b, X):g},{fix(d, b, Z):g},{fix(d, b, H):g}")


def cmd_spezial(args):
    if args.frames:
        frames(args, "spezial")
    else:
        ausgabe(args, "spezial")


def cmd_sprint(args):
    if args.frames:
        frames(args, "sprint")
    elif args.tempo:
        tempo(args)
    else:
        ausgabe(args, "sprint")


# ---------------------------------------------------------------- Zusammenfassungen

def lies(pfad):
    rows = defaultdict(list)
    for r in csv.DictReader(open(pfad)):
        rows[r["lauf"].split("_", 1)[1]].append(r)
    return rows


def ev_liste(rs, ereignis, **bed):
    return [r for r in rs if r["ereignis"].startswith(ereignis)
            and all(str(r[k]) == str(v) for k, v in bed.items())]


def rel(r):
    return int(r["rel"])


def fmt_rel(x):
    return f"P{x:+d}" if x else "P"


def zeile(gruppe, lauf, befund):
    print(f"{gruppe},{lauf},{befund}")


def fenster(rs, start, ende):
    """rel-Bereiche zwischen Ereignis start und ende (Praefixvergleich)"""
    out, a = [], None
    for r in rs:
        if r["ereignis"].startswith(start) and a is None:
            a = rel(r)
        elif r["ereignis"].startswith(ende) and a is not None:
            out.append((a, rel(r) - 1))
            a = None
    if a is not None:
        out.append((a, None))
    return out


def grenzen(paare):
    """[(abstand, treffer)] -> (groesster Abstand mit Treffer, kleinster ohne)"""
    t = [a for a, h in paare if h]
    n = [a for a, h in paare if not h]
    return (max(t) if t else None, min(n) if n else None)


def zus_spezial(args):
    ev = lies(args.ereignisse)
    fr = lies(args.frames)
    print("gruppe,lauf,befund")
    dritte_spezial(ev, fr)
    # Ausloesung
    for lauf in sorted(k for k in ev if k.startswith("aus_")):
        rs = ev[lauf]
        p = int(rs[0]["bezug"])
        aktionen = " ".join(f"{fmt_rel(rel(r))}:{r['ereignis'][7:]}" for r in ev_liste(rs, "aktion") if rel(r) >= -50)
        lp = " ".join(f"{fmt_rel(rel(r))}:{r['wert']}" for r in ev_liste(rs, "lp_figur"))
        zeile("ausloesung", lauf, f"P={p}; Aktionen {aktionen}; LP Figur {lp or '-'}")
    # Ablauf, Schutz, Kosten, Schaden: Zeitachse je Lauf
    for gr, pre in (("ablauf", "ab_"), ("schutz", "sch_"), ("schaden", "sd_"), ("kosten", "lp_")):
        for lauf in sorted(k for k in ev if k.startswith(pre)):
            rs = ev[lauf]
            sp = fenster(rs, "aktion 0x0->0x14", "aktion 0x14->")
            st3 = fenster(rs, "status 1->3", "status 3->")
            tim = fenster(rs, "timer_start", "timer_ende")
            treff = " ".join(f"s{r['slot']}-{r['wert']}@{fmt_rel(rel(r))}(dx{r['dx']})" for r in ev_liste(rs, "treffer"))
            um = " ".join(f"s{r['slot']}@{fmt_rel(rel(r))}" for r in ev_liste(rs, "umgeworfen"))
            ruhe = " ".join(f"s{r['slot']}:{r['wert']}" for r in ev_liste(rs, "gegner_ruhe"))
            lp = " ".join(f"{r['wert']}@{fmt_rel(rel(r))}(={r['hoehe']})" for r in ev_liste(rs, "lp_figur") if rel(r) > 0)
            ga = " ".join(f"s{r['slot']}@{fmt_rel(rel(r))}" for r in ev_liste(rs, "gegner_angriff") if r["ereignis"] == "gegner_angriff")
            bew = " ".join(fmt_rel(rel(r)) for r in ev_liste(rs, "figur_bewegt"))
            obj = " ".join(f"s{r['slot']}({r['wert']})@{fmt_rel(rel(r))}" for r in ev_liste(rs, "objekt_treffer"))
            fw = lambda w: " ".join(f"{fmt_rel(a)}..{fmt_rel(b) if b is not None else 'Ende'}" for a, b in w) or "-"
            akt = " ".join(f"{fmt_rel(rel(r))}:{r['ereignis'][7:]}" for r in ev_liste(rs, "aktion") if rel(r) > 0)
            zeile(gr, lauf, f"Aktion 0x14 {fw(sp)}; Status 3 {fw(st3)}; Timer {fw(tim)}; Aktionen {akt}; "
                  f"Treffer {treff or '-'}; Gegenstand {obj or '-'}; umgeworfen {um or '-'}; Flugweite {ruhe or '-'}; "
                  f"Gegnerangriff ab {ga or '-'}; LP Figur {lp or '-'}; bewegt ab {bew or '-'}")
    # Reichweite x der Captain-Laeufe: je Reihe, Seite und Bild
    for reihe in ("rx_a", "rx_b"):
        paare = defaultdict(list)
        for lauf, rs in fr.items():
            if not lauf.startswith(reihe + "_"):
                continue
            slot = rs[0]["slot"] if rs else None
            for r in rs:
                if r["slot"] != slot:
                    continue
                dx = int(r["dx"])
                paare[("vorn" if dx > 0 else "hinten", int(r["bild"]))].append((abs(dx), r["treffer"] == "ja", rel(r)))
        for (seite, bild) in sorted(paare):
            w = paare[(seite, bild)]
            t, n = grenzen([(a, h) for a, h, _ in w])
            rr = sorted({x for *_, x in w})
            zeile("reichweite_x", f"{reihe}_{seite}_bild{bild}", f"P+{rr[0]}..P+{rr[-1]}: Treffer bis |dx| {t}, "
                  f"kein Treffer ab |dx| {n}")
    # Tiefe und Hoehe: Treffer (jeder Frame) gegen Fehlschlag (Frames ab Bild 9 = P+32)
    for reihe, feld in (("rz_a", "dz"), ("rz_b", "dz"), ("rh_a_x20", "hoehe"), ("rh_a_x100", "hoehe"), ("rh_b", "hoehe")):
        paare = defaultdict(list)
        for lauf, rs in fr.items():
            if not lauf.startswith(reihe + "_"):
                continue
            for r in rs:
                v = int(r[feld])
                if r["treffer"] == "ja" or int(r["bild"]) >= 9:
                    seite = ("hinten" if v > 0 else "vorn") if feld == "dz" else "oben"
                    paare[seite].append((abs(v), r["treffer"] == "ja"))
        for seite in sorted(paare):
            t, n = grenzen(paare[seite])
            zeile("reichweite_" + feld, f"{reihe}_{seite}", f"Treffer bis |{feld}| {t}, kein Treffer ab |{feld}| {n}")
    # aktive Frames: Gegner nur im Frame T in Reichweite
    for reihe in ("fen_a", "fen_b"):
        res = []
        for lauf in sorted((k for k in ev if k.startswith(reihe + "_")), key=lambda k: int(k.rsplit("p", 1)[1])):
            r_ = int(lauf.rsplit("p", 1)[1])
            t = ev_liste(ev[lauf], "treffer")
            res.append(f"P+{r_}:{'Treffer' if any(rel(x) == r_ for x in t) else '-'}")
        zeile("aktive_frames", reihe, " ".join(res))
    # andere Figuren
    for k in "0123":
        for lauf in sorted(x for x in ev if x.startswith(f"h{k}_") and not re.match(rf"h{k}_(x|xb|z)_", x)):
            rs = ev[lauf]
            sp = fenster(rs, "aktion 0x0->0x14", "aktion 0x14->")
            st3 = fenster(rs, "status 1->3", "status 3->")
            tim = fenster(rs, "timer_start", "timer_ende")
            fw = lambda w: " ".join(f"{fmt_rel(a)}..{fmt_rel(b) if b is not None else 'Ende'}" for a, b in w) or "-"
            treff = " ".join(f"s{r['slot']}-{r['wert']}@{fmt_rel(rel(r))}(dx{r['dx']})" for r in ev_liste(rs, "treffer"))
            ruhe = " ".join(f"s{r['slot']}:{r['wert']}" for r in ev_liste(rs, "gegner_ruhe"))
            lp = " ".join(f"{r['wert']}@{fmt_rel(rel(r))}(={r['hoehe']})" for r in ev_liste(rs, "lp_figur") if rel(r) > 0)
            ga = " ".join(f"s{r['slot']}@{fmt_rel(rel(r))}" for r in ev_liste(rs, "gegner_angriff") if r["ereignis"] == "gegner_angriff")
            bew = " ".join(fmt_rel(rel(r)) for r in ev_liste(rs, "figur_bewegt"))
            zeile(f"figur{k}", lauf, f"Aktion 0x14 {fw(sp)}; Status 3 {fw(st3)}; Timer {fw(tim)}; Treffer {treff or '-'}; "
                  f"Flugweite {ruhe or '-'}; Gegnerangriff ab {ga or '-'}; LP Figur {lp or '-'}; bewegt ab {bew or '-'}")
        for reihe in (f"h{k}_x", f"h{k}_xb"):
            paare, zeiten = defaultdict(list), defaultdict(set)
            for lauf, rs in fr.items():
                if not lauf.startswith(reihe + "_"):
                    continue
                slot = "18"
                rs = [r for r in rs if r["slot"] == slot]
                if not rs:
                    continue
                hit = [r for r in rs if r["treffer"] == "ja"]
                r = hit[0] if hit else min(rs, key=lambda x: abs(int(x["dx"])))
                dx = int(r["dx"])
                paare["vorn" if dx > 0 else "hinten"].append((abs(dx), bool(hit)))
                if hit:
                    zeiten[rel(r)].add(dx)
            for seite in sorted(paare):
                t, n = grenzen(paare[seite])
                zeile(f"figur{k}", f"{reihe}_{seite}", f"Treffer bis |dx| {t}, kein Treffer ab |dx| {n}")
            if zeiten:
                zeile(f"figur{k}", f"{reihe}_trefferframes",
                      " ".join(f"P+{z}:dx{min(v)}..{max(v)}" for z, v in sorted(zeiten.items())))
        paare = defaultdict(list)
        for lauf, rs in fr.items():
            if not lauf.startswith(f"h{k}_z_"):
                continue
            rs = [r for r in rs if r["slot"] == "18"]
            hit = [r for r in rs if r["treffer"] == "ja"]
            if hit:
                v = int(hit[0]["dz"])
            elif rs:
                v = int(sorted(rs, key=lambda x: abs(int(x["dz"])))[0]["dz"])
            else:
                continue
            paare["hinten" if v > 0 else "vorn"].append((abs(v), bool(hit)))
        for seite in sorted(paare):
            t, n = grenzen(paare[seite])
            zeile(f"figur{k}", f"h{k}_z_{seite}", f"Treffer bis |dz| {t}, kein Treffer ab |dz| {n}")



def abschnitte(punkte):
    """[(dx, treffer)] -> "a..b:T c..d:-" (zusammenhaengende Bereiche gleichen Ausgangs)"""
    out = []
    for dx, t in sorted(set(punkte)):
        if out and out[-1][2] == t:
            out[-1][1] = dx
        else:
            out.append([dx, dx, t])
    return " ".join(f"{a}..{b}:{'T' if t else '-'}" if a != b else f"{a}:{'T' if t else '-'}" for a, b, t in out)


def dritte_spezial(ev, fr):
    """Dritte Messung (Laeufe d3_*): WOOKY Stufe 3, Mack in Bewegung, Zonen von Ginzu/Baby Head."""
    # WOOKY: je Reihe und Bild (5-10) die Lage am Frame-Ende vorn, mit Gegneraktion bei Treffern
    for reihe in ("d3_rx_s16", "d3_rx_k14"):
        je_bild = defaultdict(list)
        for lauf, rs in fr.items():
            if not lauf.startswith(reihe + "_"):
                continue
            slot = "16" if "_s16_" in lauf else "18"
            for r in rs:
                if r["slot"] == slot and 5 <= int(r["bild"]) <= 10 and int(r["dx"]) > 0:
                    je_bild[int(r["bild"])].append((int(r["dx"]), r["treffer"] == "ja", r["g_aktion_vorher"], rel(r)))
        for bild in sorted(je_bild):
            w = je_bild[bild]
            t, n = grenzen([(a, h) for a, h, *_ in w])
            akt = " ".join(sorted({f"dx{a}@P+{x}:{g}" for a, h, g, x in w if h}))
            zeile("dritte_reichweite_x", f"{reihe}_bild{bild}", f"vorn Treffer bis {t}, kein Treffer ab {n}; "
                  f"Treffer (dx@Frame:Gegneraktion) {akt}")
    # Bewegung waehrend der Aktion 0x14 (Mack; Ginzu, Baby Head zum Vergleich)
    for lauf in sorted(k for k in ev if k.startswith("d3_lauf_")):
        rs = ev[lauf]
        b = " ".join(f"{fmt_rel(rel(r))}:{r['wert']}" for r in ev_liste(rs, "bewegung_in_aktion"))
        sp = fenster(rs, "aktion 0x0->0x14", "aktion 0x14->")
        nach = " ".join(fmt_rel(rel(r)) for r in ev_liste(rs, "figur_bewegt"))
        ein = " ".join(f"{fmt_rel(rel(r))}:{r['ereignis'][8:]}" for r in ev_liste(rs, "eingabe"))
        zeile("dritte_bewegung", lauf, f"Aktion 0x14 {sp}; Eingaben {ein}; Bewegung in der Aktion {b or '-'}; "
              f"nach der Aktion ab {nach or '-'}")
    # Ginzu und Baby Head: je Frame, in dem eine Explosion trifft, die getroffenen und
    # verfehlten Abstaende (Frame-Ende) aller Laeufe einer Reihe
    for reihe in ("d3_zone_h2", "d3_zone_h3", "d3_zone_h2_z16", "d3_zone_h2_z29", "d3_zone_h2_zm16"):
        punkte = defaultdict(list)
        laeufe = [k for k in fr if re.match(rf"{reihe}_m?\d+$", k)]
        zonen = {rel(r) for k in laeufe for r in fr[k] if r["treffer"] == "ja"}
        for k in laeufe:
            for r in fr[k]:
                if r["slot"] == "18" and rel(r) in zonen and abs(int(r["dx"])) < 190:
                    punkte[rel(r)].append((int(r["dx"]), r["treffer"] == "ja"))
        for z in sorted(punkte):
            dz = sorted({int(r["dz"]) for k in laeufe for r in fr[k] if r["slot"] == "18" and rel(r) == z})
            zeile("dritte_zonen", f"{reihe}_P+{z}", f"dz {dz[0]}..{dz[-1]}: {abschnitte(punkte[z])}")

def verdichtet(args):
    """--frames-Ausgabe je Lauf, Slot und Bild: Frames, dx/dz/Hoehe-Bereich, Treffer
    (bei Captain Commando nur die Bilder 5-10, in denen der Angriff aktiv ist)."""
    print("lauf,slot,bild,rel_von,rel_bis,dx_min,dx_max,dz_min,dz_max,h_min,h_max,p_hoehe_min,p_hoehe_max,treffer")
    grp = defaultdict(list)
    for r in csv.DictReader(open(args.frames)):
        grp[(r["lauf"], r["slot"], int(r["bild"]))].append(r)

    def sortkey(k):
        return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", k[0])] + [int(k[1]), k[2]]
    for key in sorted(grp, key=sortkey):
        # Captain Commando: nur die aktiven Bilder 5-10 (P+8..P+43); andere Figuren vollstaendig
        if not re.search(r"_h[0-3]_", key[0]) and not 5 <= key[2] <= 10:
            continue
        rs = grp[key]
        v = lambda f: [int(r[f]) for r in rs]
        t = [r for r in rs if r["treffer"] == "ja"]
        print(f"{key[0]},{key[1]},{key[2]},{min(map(rel, rs))},{max(map(rel, rs))},{min(v('dx'))},{max(v('dx'))},"
              f"{min(v('dz'))},{max(v('dz'))},{min(v('hoehe'))},{max(v('hoehe'))},{min(v('p_hoehe'))},"
              f"{max(v('p_hoehe'))},{('P' + t[0]['rel'] + ' -' + t[0]['schaden']) if t else '-'}")


def zus_sprint(args):
    ev = lies(args.ereignisse)
    fr = lies(args.frames)
    tp = lies(args.tempo)
    print("gruppe,lauf,befund")
    dritte_sprint(ev, fr)
    for lauf in sorted(tp):
        # zusammenhaengende Bloecke gleicher Aktion; beim Sprint (0x2) mit Geschwindigkeitsprofil
        bloecke = []
        for r in tp[lauf]:
            if bloecke and bloecke[-1][0]["p_aktion"] == r["p_aktion"] and int(r["von"]) == int(bloecke[-1][-1]["bis"]) + 1:
                bloecke[-1].append(r)
            else:
                bloecke.append([r])
        teile = []
        for b in bloecke:
            act = b[0]["p_aktion"]
            a, e = int(b[0]["von"]), int(b[-1]["bis"])
            wx = sum(float(r["vx"]) * int(r["frames"]) for r in b)
            wz = sum(float(r["vz"]) * int(r["frames"]) for r in b)
            if act == "0x0" and not wx and not wz:
                continue
            t = f"{a}-{e}:{act}({e - a + 1} Frames, Weg x {wx:+g} Tiefe {wz:+g}"
            if act in ("0x4", "0xa", "0x8"):
                h0 = float(b[0]["h_ende"]) - float(b[0]["vh"]) * int(b[0]["frames"])
                hs = max(float(r["h_ende"]) for r in b)
                t += f"; Scheitel {hs:g} (Hoehe vor dem Sprung {h0:g}, Anstieg {hs - h0:g})"
            if act == "0x2":
                # Rand: ab dem Ende dieses Abschnitts bleibt die Figur bis zum Blockende
                # weniger als 1 px von ihrer Endlage entfernt (sie zittert nur noch)
                xf, zf = float(b[-1]["x_ende"]), float(b[-1]["z_ende"])
                i = len(b) - 1
                while i > 0 and abs(float(b[i - 1]["x_ende"]) - xf) < 1 and abs(float(b[i - 1]["z_ende"]) - zf) < 1:
                    i -= 1
                if int(b[i]["bis"]) < e - 1:
                    t += f"; Bewegung bis Frame {b[i]['bis']} ({int(b[i]['bis']) - a + 1} Frames), danach am Rand"
                t += "; je Frame " + " ".join(f"{r['frames']}x{r['vx']}/{r['vz']}" for r in b)
            else:
                vs = [float(r["vx"]) for r in b]
                t += f"; vx max {max(vs, key=abs):+g}"
            teile.append(t + ")")
        zeile("tempo", lauf, " | ".join(teile) or "keine Bewegung")
    for lauf in sorted(ev):
        rs = ev[lauf]
        akt = " ".join(f"{fmt_rel(rel(r))}:{r['ereignis'][7:]}" for r in ev_liste(rs, "aktion"))
        treff = " ".join(f"s{r['slot']}-{r['wert']}@{fmt_rel(rel(r))}(dx{r['dx']},dz{r['dz']})" for r in ev_liste(rs, "treffer"))
        um = " ".join(f"s{r['slot']}@{fmt_rel(rel(r))}" for r in ev_liste(rs, "umgeworfen"))
        ruhe = " ".join(f"s{r['slot']}:{r['wert']}" for r in ev_liste(rs, "gegner_ruhe"))
        gr = " ".join(f"s{r['slot']}@{fmt_rel(rel(r))}(dx{r['dx']},dz{r['dz']})" for r in ev_liste(rs, "griff"))
        bew = " ".join(fmt_rel(rel(r)) for r in ev_liste(rs, "figur_bewegt"))
        zeile("ablauf", lauf, f"P={rs[0]['bezug']}; Aktionen {akt}; Treffer {treff or '-'}; umgeworfen {um or '-'}; "
              f"Flugweite {ruhe or '-'}; Griff {gr or '-'}; bewegt ab {bew or '-'}")
    # Reichweite: gewertet wird nur der Frame P+rel (erster aktiver Frame bzw. Probe-Frame)
    for reihe, feld, r_ in (("sa_x_k", "dx", 5), ("sa_x_kb", "dx", 5), ("sja_x_k", "dx", 21), ("sja_x_kb", "dx", 21),
                            ("sa_z_k", "dz", 5), ("sa_z_kb", "dz", 5), ("sja_z_k", "dz", 21)):
        paare = defaultdict(list)
        for lauf, rs in fr.items():
            if not lauf.startswith(reihe + "_"):
                continue
            slot = rs[0]["slot"] if rs else None
            for r in rs:
                if r["slot"] == slot and rel(r) == r_:
                    v = int(r[feld])
                    seite = ("vorn" if v > 0 else "hinten") if feld == "dx" else ("hinten" if v > 0 else "vorn")
                    paare[seite].append((abs(v), r["treffer"] == "ja"))
        for seite in sorted(paare):
            t, n = grenzen(paare[seite])
            zeile("reichweite_" + feld, f"{reihe}_{seite}", f"Frame P+{r_}: Treffer bis |{feld}| {t}, "
                  f"kein Treffer ab |{feld}| {n}")
    for reihe in ("sa_fen_k", "sa_fen_kb", "sja_fen_a14", "sja_fen_a30", "sja_fen_a34", "sja_fen_kb"):
        res = []
        laeufe = [k for k in ev if k.startswith(reihe + "_t")]
        for lauf in sorted(laeufe, key=lambda k: int(k.rsplit("_t", 1)[1])):
            t = int(lauf.rsplit("_t", 1)[1])
            rs = ev[lauf]
            p = int(rs[0]["bezug"])
            hit = any(int(r["frame"]) == t for r in ev_liste(rs, "treffer"))
            h = [x for x in fr.get(lauf, []) if int(x["frame"]) == t]
            ph = f"(h{h[0]['p_hoehe']})" if h else ""
            res.append(f"A+{t - p}{ph}:{'Treffer' if hit else '-'}")
        if res:
            zeile("aktive_frames", reihe, " ".join(res))



def dritte_sprint(ev, fr):
    """Dritte Messung (Laeufe d3_*): Sprint-Sprungangriff in A+13 und Reichweite je Frame."""
    # A+13: Gegner nur im Frame T = A+13 bei dx (Name d3_sja13_<g>_v<dx>_a<A>_t<T>)
    for lauf in sorted(k for k in ev if k.startswith("d3_sja13_")):
        m = re.search(r"_a(\d+)_t(\d+)$", lauf)
        a, t = int(m.group(1)), int(m.group(2))
        hit = any(int(r["frame"]) == t for r in ev_liste(ev[lauf], "treffer"))
        h = [x for x in fr.get(lauf, []) if int(x["frame"]) == t]
        zeile("dritte_sja13", lauf, f"Frame A+{t - a}, Hoehe der Figur {h[0]['p_hoehe'] if h else '?'}, "
              f"dx {h[0]['dx'] if h else '?'}: {'Treffer' if hit else 'kein Treffer'}")
    # Reichweite am Boden je Probe-Frame A+k (Name d3_sjax_<g>_a<A>_k<k>_v<dx>, Sprung in Frame 9)
    paare = defaultdict(list)
    for lauf, rs in fr.items():
        m = re.match(r"d3_sjax_(\w)_a(\d+)_k(\d+)_v\d+$", lauf)
        if not m:
            continue
        g, a, k = m.group(1), int(m.group(2)), int(m.group(3))
        for r in rs:
            if rel(r) == k and abs(int(r["dx"])) < 195:
                paare[(g, a, k)].append((int(r["dx"]), r["treffer"] == "ja"))
    for (g, a, k) in sorted(paare):
        zeile("dritte_sja_reichweite", f"{'EDDY' if g == 'e' else 'WOOKY'}_A=J+{a - 9}_A+{k}", abschnitte(paare[(g, a, k)]))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("spezial", help="Spezialangriff: Ereignisse je Lauf bzw. (--frames) Lage der Gegner je Frame")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--frames", action="store_true")
    p.set_defaults(fn=cmd_spezial)
    p = sub.add_parser("sprint", help="Sprint: Ereignisse, (--tempo) Geschwindigkeit, (--frames) Lage der Gegner")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--frames", action="store_true")
    p.add_argument("--tempo", action="store_true")
    p.add_argument("--nach", type=int, default=0, help="mit --frames: so viele Frames ueber das Aktionsende hinaus")
    p.set_defaults(fn=cmd_sprint)
    p = sub.add_parser("zusammenfassung-spezial", help="Befunde aus den Ausgaben von spezial und spezial --frames")
    p.add_argument("ereignisse")
    p.add_argument("frames")
    p.set_defaults(fn=zus_spezial)
    p = sub.add_parser("zusammenfassung-sprint", help="Befunde aus sprint, sprint --frames und sprint --tempo")
    p.add_argument("ereignisse")
    p.add_argument("frames")
    p.add_argument("tempo")
    p.set_defaults(fn=zus_sprint)
    p = sub.add_parser("verdichtet", help="--frames-Ausgabe je Lauf, Slot und Bild zusammengefasst")
    p.add_argument("frames")
    p.set_defaults(fn=verdichtet)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
