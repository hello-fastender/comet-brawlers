#!/usr/bin/env python3
"""Messungen fuer Aufgabe 5 auf den RAM-Abzuegen (nur Standardbibliothek).

Adressen siehe notes.md ("Gefundene Adressen"). Alle Frames sind lokale
Frames des Runners; "Eingabe f" heisst: die Eingabe ist ab Frame f gedrueckt.

Unterbefehle:
  laufen PREFIX   Geschwindigkeit je Eingabesegment (x, Tiefe; 16.16)
  treffer PREFIX  alle LP-Abnahmen in Gegnerslots mit Kombostufe und Status
  schutz PREFIX   Treffer gegen Spieler 1 mit Abstand zu Trefferreaktion/Aufstehen
  fenster PREFIX  Schutzfenster von Spieler 1 (Status 3) mit Gegnern in Reichweite
  schlag PREFIX.. Zeitachse eines Einzelschlags je Lauf (schlag.lua, leerschlag.lua)
  anim PREFIX A B Frames A..B, in denen der Animationszeiger von P1 (S+0x1C) wechselt
  reaktion PREFIX Dauer von Trefferreaktion, Aufsteh-Schutz und Liegen (Status S+4)
  sprung PREFIX   je Sprung: Eingabe, Absprung, Scheitel, Landung, Weite, Geschwindigkeiten
  aktiv PREFIX..  je aktivem Frame des Einzelschlags (P+2..P+5): Abstand zum
                  naechsten Gegner (ganzzahlig, Frame-Ende) und ob er trifft
  kette PREFIX..  fuer kette.lua: je Frame nach dem letzten Druck (D+1..D+10)
                  Stufe, Abstand und Tiefe zum Gegner, Treffer
"""

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P1 = 0xFFA990
X, Z, H = P1 + 0x0E, P1 + 0x16, P1 + 0x12
ACTION, PHASE, STATE, HP = P1 + 0x0A, P1 + 0x0C, P1 + 0x04, P1 + 0x40
COMBO = P1 + 0x9D                      # Kombostufe x 4
T_UP = 0xFFAA69                        # Timer nach dem Aufstehen (35 -> 0)
SLOT_BASE, SLOT_SIZE = 0xFFBC90, 0xC0  # Gegner in Slots 0-19
MAXHP = 0x9A                           # vermutlich maximale LP (unsicher)


def fix(d, f, addr):
    """16.16-Festkommawert (Ganzzahl-Wort + Nachkomma-Wort) als float."""
    return d.value(f, addr, 4, signed=True) / 65536


def segments(prefix):
    """Zusammenhaengende Bloecke gleicher Eingabe aus <prefix>_inputs.csv."""
    rows = list(csv.DictReader(open(prefix + "_inputs.csv")))
    segs, cur = [], None
    for r in rows:
        f, inp = int(r["frame"]), r["inputs"]
        if cur and cur[2] == inp and f == cur[1] + 1:
            cur[1] = f
        else:
            cur = [f, f, inp]
            segs.append(cur)
    return segs


def fmt(c):
    return " ".join(f"{k:+g}x{n}" for k, n in sorted(c.items()))


def cmd_laufen(args):
    d = Dump(args.prefix)
    print("eingabe,von,bis,frames,bewegt_von,bewegt_bis,dx_je_frame,dz_je_frame,dx_summe,dz_summe")
    for a, b, inp in segments(args.prefix):
        if not inp:
            continue
        # Wirkung ab a+1 (Eingabelatenz); Bewegung im Frame f = Wert(f) - Wert(f-1)
        moved = [f for f in range(a, min(b + 3, d.frames[-1]) + 1)
                 if fix(d, f, X) != fix(d, f - 1, X) or fix(d, f, Z) != fix(d, f - 1, Z)]
        if not moved:
            print(f"{inp},{a},{b},{b - a + 1},-,-,-,-,0,0")
            continue
        m0, m1 = moved[0], moved[-1]
        cx = Counter(fix(d, f, X) - fix(d, f - 1, X) for f in range(m0, m1 + 1))
        cz = Counter(fix(d, f, Z) - fix(d, f - 1, Z) for f in range(m0, m1 + 1))
        print(f"{inp},{a},{b},{b - a + 1},{m0},{m1},{fmt(cx)},{fmt(cz)},"
              f"{fix(d, m1, X) - fix(d, m0 - 1, X):+g},{fix(d, m1, Z) - fix(d, m0 - 1, Z):+g}")


def cmd_treffer(args):
    d = Dump(args.prefix)
    print("frame,slot,max_lp,lp_vorher,lp_nachher,schaden,stufe,p1_aktion,"
          "status_vorher,status_nachher,umgefallen")
    for f0, f in zip(d.frames, d.frames[1:]):
        for n in range(20):
            s = SLOT_BASE + n * SLOT_SIZE
            if not d.value(f0, s + 4) or not d.value(f, s + 4):
                continue
            a, b = d.value(f0, s + 0x40, 2, True), d.value(f, s + 0x40, 2, True)
            if b >= a:
                continue
            # Status kann einen Frame nach der LP-Aenderung wechseln
            st1 = d.value(f, s + 4)
            nxt = d.value(f + 1, s + 4) if f + 1 in d.offsets else st1
            down = "ja" if 2 in (st1, nxt) else "nein"
            print(f"{f},{n},{d.value(f, s + MAXHP, 2)},{a},{b},{a - b},"
                  f"{d.value(f, COMBO) // 4 + 1},{d.value(f, ACTION, 2):#x},"
                  f"{d.value(f0, s + 4)},{st1}/{nxt},{down}")


def cmd_schutz(args):
    """Fuer jeden LP-Verlust von P1: Frames seit Ende des letzten Schutzfensters.

    Fenster A: Trefferreaktion (S+4 = 3 nach einem Treffer, endet mit 3 -> 1
    oder mit dem naechsten Treffer). Fenster B: nach dem Aufstehen (Timer
    FFAA69 > 0). "abstand" = Frames seit dem vorigen Treffer bzw. seit Beginn
    des Aufsteh-Fensters; "gegner_nah" = Gegner in |dx| <= 60, |dz| <= 8.
    """
    d = Dump(args.prefix)
    print("frame,schaden,status_vorher,seit_letztem_treffer,seit_aufstehen,timer_aufstehen")
    last_hit = getup = None
    for f0, f in zip(d.frames, d.frames[1:]):
        if d.value(f0, STATE) == 2 and d.value(f, STATE) == 3:
            getup = f
        a, b = d.value(f0, HP, 2, True), d.value(f, HP, 2, True)
        if b < a and d.value(f0, STATE):
            print(f"{f},{a - b},{d.value(f0, STATE)},"
                  f"{f - last_hit if last_hit else '-'},{f - getup if getup else '-'},"
                  f"{d.value(f0, T_UP)}")
            last_hit = f


def cmd_fenster(args):
    """Frames, in denen P1 geschuetzt ist (Trefferreaktion bzw. Timer), mit
    der Zahl der Gegner, die dabei in Schlagdistanz stehen."""
    d = Dump(args.prefix)
    print("von,bis,art,frames,frames_mit_gegner_nah")
    cur = None
    for f in d.frames:
        st, t = d.value(f, STATE), d.value(f, T_UP)
        art = "aufstehen" if t else ("reaktion" if st == 3 else None)
        near = 0
        if art:
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if d.value(f, s + 4) in (1, 3) and d.value(f, s + 5) == 1:
                    dx = d.value(f, s + 0x0E, 2) - d.value(f, X, 2)
                    dz = d.value(f, s + 0x16, 2) - d.value(f, Z, 2)
                    if abs(dx) <= 60 and abs(dz) <= 8:
                        near = 1
        if cur and cur[2] == art:
            cur[1] = f; cur[3] += near
        else:
            if cur and cur[2]:
                print(f"{cur[0]},{cur[1]},{cur[2]},{cur[1] - cur[0] + 1},{cur[3]}")
            cur = [f, f, art, near]
    if cur and cur[2]:
        print(f"{cur[0]},{cur[1]},{cur[2]},{cur[1] - cur[0] + 1},{cur[3]}")


def first_input(prefix, name, after=0):
    for r in csv.DictReader(open(prefix + "_inputs.csv")):
        if int(r["frame"]) > after and name in r["inputs"].split("|"):
            return int(r["frame"])
    return None


def cmd_schlag(args):
    """Je Lauf eine Zeile: Eingabe P, Aktionsbeginn, erster Treffer, Ende der
    Aktion, erste x-Aenderung, zweiter Druck und dessen Treffer/Stufe."""
    print("lauf,eingabe,aktion_ab,treffer,aktion_ende,laufen_gedrueckt_ab,"
          "x_aendert_ab,zweiter_druck,zweiter_treffer,stufe_zweiter_treffer,"
          "dx_treffer/dx_vorher,dz_treffer")
    for prefix in args.prefix:
        d = Dump(prefix)
        p = first_input(prefix, "P1 Button 1")
        p2 = None
        if p:
            # zweiter Druck: naechste Eingabe nach einer Luecke
            gap = p
            while first_input(prefix, "P1 Button 1", gap) == gap + 1:
                gap += 1
            p2 = first_input(prefix, "P1 Button 1", gap)
        walk = first_input(prefix, "P1 Left") or first_input(prefix, "P1 Right")
        fr = d.frames
        act = next((f for f in fr if f > 1 and d.value(f, ACTION, 2) and not d.value(f - 1, ACTION, 2)), None)
        end = next((f for f in fr if act and f > act and not d.value(f, ACTION, 2)), None)
        xch = next((f for f in fr if f > 1 and d.value(f, X, 2) != d.value(f - 1, X, 2)), None)
        hits = []
        for f0, f in zip(fr, fr[1:]):
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if d.value(f0, s + 4) and d.value(f, s + 0x40, 2, True) < d.value(f0, s + 0x40, 2, True):
                    # Abstand Gegner - Figur (ganzzahlige Positionen) im
                    # Trefferframe und im Frame davor
                    dxi = lambda g: d.value(g, s + 0x0E, 2) - d.value(g, X, 2)
                    hits.append((f, d.value(f, COMBO) // 4 + 1,
                                 f"{dxi(f)}/{dxi(f0)}",
                                 d.value(f, s + 0x16, 2) - d.value(f, Z, 2)))
        h1 = hits[0] if hits else ("-", "-", "-", "-")
        h2 = hits[1] if len(hits) > 1 else ("-", "-")
        name = Path(prefix).name
        dx = h1[2] if hits else "-"
        dz = h1[3] if hits else "-"
        print(f"{name},{p or '-'},{act or '-'},{h1[0]},{end or '-'},{walk or '-'},{xch or '-'},"
              f"{p2 or '-'},{h2[0]},{h2[1]},{dx},{dz}")


def cmd_anim(args):
    d = Dump(args.prefix)
    ch = [f for f in range(args.a + 1, args.b + 1)
          if d.value(f, P1 + 0x1C, 4) != d.value(f - 1, P1 + 0x1C, 4)]
    print("wechsel_in_frame," + ",".join(str(f) for f in ch))


def cmd_reaktion(args):
    d = Dump(args.prefix)
    rows = []
    start = kind = down = None
    for f0, f in zip(d.frames, d.frames[1:]):
        a, b = d.value(f0, STATE), d.value(f, STATE)
        dmg = d.value(f0, HP, 2, True) - d.value(f, HP, 2, True)
        if dmg > 0 and b == 3:
            if start is not None and kind:
                rows.append((kind, start, f, "durch Treffer beendet"))
            start, kind = f, f"Trefferreaktion ({dmg} Schaden)"
        if a == 3 and b == 2:
            down, start, kind = f, None, None
        if a == 2 and b == 3:
            if down:
                rows.append(("liegt (Wurf bis Aufstehen)", down, f, ""))
            start, kind = f, "Aufsteh-Schutz"
        if a == 3 and b == 1 and start is not None:
            rows.append((kind, start, f, ""))
            start = kind = None
    print("art,von,bis,frames,bemerkung")
    for kind, a, b, note in rows:
        print(f"{kind},{a},{b},{b - a},{note}")


def cmd_sprung(args):
    """Ein Sprung beginnt, wenn die Aktion auf 0x0A (Sprung) oder 0x0E
    (Sprungangriff) wechselt und vorher 0 war. Hoehe/x/Tiefe als 16.16."""
    d = Dump(args.prefix)
    inputs = {int(r["frame"]): r["inputs"] for r in csv.DictReader(open(args.prefix + "_inputs.csv"))}
    fr = d.frames
    print("aktion_ab,taste_ab,absprung,scheitel_frame,steighoehe,landung,aktion_ende,"
          "frames_in_luft,vy0,schwerkraft,dx_je_frame,dz_je_frame,weite_x,eingaben_in_luft")
    for f in fr[1:]:
        if not (d.value(f - 1, ACTION, 2) == 0 and d.value(f, ACTION, 2) == 0x0A):
            continue
        p = f - 1
        while p - 1 in inputs and "P1 Button 2" in inputs[p - 1].split("|"):
            p -= 1
        h0 = fix(d, f, H)
        air = []
        g = f + 1
        while g in d.offsets and fix(d, g, H) >= 1 + int(h0) or (g in d.offsets and int(fix(d, g, H)) > int(h0)):
            air.append(g)
            g += 1
        if not air:
            continue
        land = air[-1] + 1
        end = next(x for x in fr if x > f and d.value(x, ACTION, 2) == 0)
        hs = [fix(d, x, H) for x in [air[0] - 1] + air]
        v = [hs[i + 1] - hs[i] for i in range(len(hs) - 1)]
        grav = Counter(round(v[i + 1] - v[i], 4) for i in range(len(v) - 1) if v[i + 1] and v[i])
        peak = max(air, key=lambda x: fix(d, x, H))
        cx = Counter(fix(d, x, X) - fix(d, x - 1, X) for x in air + [land])
        cz = Counter(fix(d, x, Z) - fix(d, x - 1, Z) for x in air + [land])
        inl = sorted({i for x in air for i in inputs.get(x, "").split("|") if i})
        print(f"{f},{p},{air[0]},{peak},{fix(d, peak, H) - h0:g},{land},{end},{len(air)},"
              f"{v[0]:g},{fmt(grav)},{fmt(cx)},{fmt(cz)},"
              f"{fix(d, land, X) - fix(d, f, X):+g},{' '.join(inl)}")


def cmd_aktiv(args):
    print("lauf,eingabe,frame,frame_rel,dx,dz,gegner_slot,treffer")
    for prefix in args.prefix:
        d = Dump(prefix)
        p = first_input(prefix, "P1 Button 1")
        name = Path(prefix).name
        for f in range(p + 2, p + 6):
            cands = []
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if d.value(f, s + 4) and d.value(f, s + 5):
                    dx = d.value(f, s + 0x0E, 2) - d.value(f, X, 2)
                    dz = d.value(f, s + 0x16, 2) - d.value(f, Z, 2)
                    hit = d.value(f, s + 0x40, 2, True) < d.value(f - 1, s + 0x40, 2, True)
                    cands.append((abs(dx) + abs(dz), n, dx, dz, hit))
            if not cands:
                continue
            _, n, dx, dz, hit = min(cands)
            print(f"{name},{p},{f},P+{f - p},{dx},{dz},{n},{'ja' if hit else 'nein'}")
            if hit:
                break


def presses(prefix):
    """Frames, in denen P1 Button 1 neu gedrueckt ist."""
    out, prev = [], False
    for r in csv.DictReader(open(prefix + "_inputs.csv")):
        on = "P1 Button 1" in r["inputs"].split("|")
        if on and not prev:
            out.append(int(r["frame"]))
        prev = on
    return out


def cmd_kette(args):
    print("lauf,stufe_gedrueckt,druck,frame,rel,stufe_ram,p1_aktion,dx,dz,gegner_status,treffer,schaden")
    for prefix in args.prefix:
        d = Dump(prefix)
        pr = presses(prefix)
        if not pr:
            continue
        k, p = len(pr), pr[-1]
        name = Path(prefix).name
        # Gegner: der Slot, dessen LP im Lauf zuerst sinken, sonst der naechste
        slot = None
        for f in d.frames[1:]:
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if d.value(f - 1, s + 4) and d.value(f, s + 0x40, 2, True) < d.value(f - 1, s + 0x40, 2, True):
                    slot = n
                    break
            if slot is not None:
                break
        if slot is None:
            # kein Treffer im Lauf: naechster angezeigter Gegner beim Druck
            near = [(abs(d.value(p, SLOT_BASE + n * SLOT_SIZE + 0x0E, 2) - d.value(p, X, 2)), n)
                    for n in range(20)
                    if d.value(p, SLOT_BASE + n * SLOT_SIZE + 4) and d.value(p, SLOT_BASE + n * SLOT_SIZE + 5)]
            if not near:
                continue
            slot = min(near)[1]
        s = SLOT_BASE + slot * SLOT_SIZE
        for f in range(p + 1, min(p + 11, d.frames[-1] + 1)):
            dx = d.value(f, s + 0x0E, 2) - d.value(f, X, 2)
            dz = d.value(f, s + 0x16, 2) - d.value(f, Z, 2)
            dmg = d.value(f - 1, s + 0x40, 2, True) - d.value(f, s + 0x40, 2, True)
            print(f"{name},{k},{p},{f},D+{f - p},{d.value(f, COMBO) // 4 + 1},"
                  f"{d.value(f, ACTION, 2):#x},{dx},{dz},{d.value(f, s + 4)},"
                  f"{'ja' if dmg > 0 else 'nein'},{dmg if dmg > 0 else 0}")
            if dmg > 0:
                break


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("laufen")
    p.add_argument("prefix")
    p.set_defaults(fn=cmd_laufen)
    p = sub.add_parser("treffer")
    p.add_argument("prefix")
    p.set_defaults(fn=cmd_treffer)
    for name, fn in (("schutz", cmd_schutz), ("fenster", cmd_fenster)):
        p = sub.add_parser(name)
        p.add_argument("prefix")
        p.set_defaults(fn=fn)
    p = sub.add_parser("schlag")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_schlag)
    p = sub.add_parser("anim")
    p.add_argument("prefix")
    p.add_argument("a", type=int)
    p.add_argument("b", type=int)
    p.set_defaults(fn=cmd_anim)
    p = sub.add_parser("reaktion")
    p.add_argument("prefix")
    p.set_defaults(fn=cmd_reaktion)
    p = sub.add_parser("sprung")
    p.add_argument("prefix")
    p.set_defaults(fn=cmd_sprung)
    p = sub.add_parser("aktiv")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_aktiv)
    p = sub.add_parser("kette")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_kette)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
