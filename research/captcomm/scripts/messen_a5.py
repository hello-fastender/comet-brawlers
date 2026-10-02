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
  kette PREFIX..  fuer kette.lua: je Frame nach dem letzten Druck (D+1..D+n, --bis n)
                  Stufe, Abstand und Tiefe zum Gegner, Treffer
  sprungangriff PREFIX..  je Frame ab dem Angriffsdruck bis zur Landung (oder
                  zum ersten Treffer): Hoehe von P1, Abstand, Tiefe, Treffer
  gegnerschaden PREFIX..  jeder LP-Verlust von P1 mit den naechsten Gegnern
                  (Max-LP S+0x9A, Typkennung S+0x38, Aktion/Phase in den
                  Frames davor) und dem Zustand der Figur
  wurf PREFIX..   Wurf aus dem Griff: Eingabe, Schaden, Loslassen, Scheitel,
                  Landung (ganzzahlige Hoehe 0), Ruheposition; Weiten relativ
                  zur Startposition des Gegners und zur Figur
  angreifer PREFIX..  jeder LP-Verlust von P1 mit Verursacher (Zeiger P+0x82,
                  Trefferattribut S+0x24, Schadenswert S+0x8B; Geschosse und
                  Griffe gesondert) und dem Rang FFF82A
  rang PREFIX..   Verlauf des Rangs FFF82A (jeder Wechsel) und Tode der Figur
  umfallen PREFIX..  jedes Umwerfen der Figur: Flugbeginn, Scheitel, Bodenkontakt,
                  Ruhelage (dx zum Ort des Umwerfens), Aufstehen, Liegedauer
  wurfablauf PREFIX..  Ereignisse ab dem Griff: LP-Verluste (Gegner, Figur),
                  Statuswechsel der Figur, Aktionswechsel und Ruhelage des
                  gehaltenen Gegners; rel = Frame minus erste Aktionseingabe
  griff PREFIX..  Griffbeginn (Gegner verlaesst Status 1 ohne LP-Verlust und
                  wird gehalten, Aktion 0x02): die Frames davor mit Abstand,
                  Tiefe, Eingaben; danach Treffer im Griff, Wechsel der
                  Gegneraktion und das Ende von Gegnerstatus 2/3
  gegnerangriff PREFIX..  je Angriff eines Gegners gegen die Figur: Beginn der
                  Angriffsanimation, aktive Frames (S+0x24) je Schlag, Treffer,
                  Abstand, Umwerfen, Nachlauf bis zur Steh-/Gehanimation;
                  --zeitachse: dazu je Frame Animation, S+0x24, Abstand, Treffer
                  (Umsetzung in messen_greichweite.py)
  gegnerzusammenfassung CSV..  fasst gegnerangriff-Ausgaben zusammen (je
                  Angriffsart und je Probe; messen_greichweite.py)
  gegnerreaktion PREFIX..  je Frame Slot-Zustand (S+4/S+5, Aktion/Phase), x 16.16,
                  Hoehe, Tiefe, LP, Animationszeiger und Attribut eines Gegners
                  (Umsetzung und weitere Auswertungen in messen_reaktion.py)
  spezial PREFIX..  Spezialangriff (Angriff + Sprung im selben Frame): Ereignisse je
                  Lauf (Aktion, Status, Timer FFAA69, Treffer, Umwerfen, Ruhelage,
                  LP der Figur); --frames: je Frame Bildnummer und Lage der Gegner
                  (Umsetzung in messen_spezial.py)
  sprint PREFIX..  Sprint (Doppeltipp), Sprintangriff, Sprintsprung: Ereignisse wie
                  spezial; --tempo: Geschwindigkeit je Abschnitt; --frames: je
                  Frame Lage der Gegner (Umsetzung in messen_spezial.py)
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
        for f in range(p + 1, min(p + args.bis + 1, d.frames[-1] + 1)):
            dx = d.value(f, s + 0x0E, 2) - d.value(f, X, 2)
            dz = d.value(f, s + 0x16, 2) - d.value(f, Z, 2)
            dmg = d.value(f - 1, s + 0x40, 2, True) - d.value(f, s + 0x40, 2, True)
            print(f"{name},{k},{p},{f},D+{f - p},{d.value(f, COMBO) // 4 + 1},"
                  f"{d.value(f, ACTION, 2):#x},{dx},{dz},{d.value(f, s + 4)},"
                  f"{'ja' if dmg > 0 else 'nein'},{dmg if dmg > 0 else 0}")
            if dmg > 0:
                break


def cmd_sprungangriff(args):
    print("lauf,angriff,frame,rel,p1_aktion,p1_hoehe,dx,dz,gegner_slot,gegner_status,p1_lp_verlust,treffer,schaden")
    for prefix in args.prefix:
        d = Dump(prefix)
        pr = presses(prefix)
        if not pr:
            continue
        a = pr[-1]
        name = Path(prefix).name
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
            near = [(abs(d.value(a, SLOT_BASE + n * SLOT_SIZE + 0x0E, 2) - d.value(a, X, 2)), n)
                    for n in range(20)
                    if d.value(a, SLOT_BASE + n * SLOT_SIZE + 4) and d.value(a, SLOT_BASE + n * SLOT_SIZE + 5)]
            if not near:
                continue
            slot = min(near)[1]
        s = SLOT_BASE + slot * SLOT_SIZE
        for f in range(a + 1, d.frames[-1] + 1):
            act = d.value(f, ACTION, 2)
            if act not in (0x0A, 0x0E):
                break
            dmg = d.value(f - 1, s + 0x40, 2, True) - d.value(f, s + 0x40, 2, True)
            lost = d.value(f - 1, HP, 2, True) - d.value(f, HP, 2, True)
            print(f"{name},{a},{f},A+{f - a},{act:#x},{d.value(f, H, 2, True)},"
                  f"{d.value(f, s + 0x0E, 2) - d.value(f, X, 2)},{d.value(f, s + 0x16, 2) - d.value(f, Z, 2)},"
                  f"{slot},{d.value(f, s + 4)},{lost if lost > 0 else 0},{'ja' if dmg > 0 else 'nein'},{dmg if dmg > 0 else 0}")
            if dmg > 0:
                break


def cmd_griff(args):
    print("lauf,frame,ereignis,dx,dz,p1_aktion,p1_phase,gegner_slot,gegner_status,gegner_aktion,schaden,eingaben")
    for prefix in args.prefix:
        d = Dump(prefix)
        inputs = {int(r["frame"]): r["inputs"] for r in csv.DictReader(open(prefix + "_inputs.csv"))}
        name = Path(prefix).name
        grab = None
        for f in d.frames[1:-1]:
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if (d.value(f - 1, s + 4) == 1 and d.value(f, s + 4) in (2, 3)
                        and d.value(f, s + 0x40, 2, True) == d.value(f - 1, s + 0x40, 2, True)
                        and d.value(f + 1, s + 0x0A, 2) == 2):
                    grab = (f, n)
                    break
            if grab:
                break
        def row(f, n, ev, dmg=0):
            s = SLOT_BASE + n * SLOT_SIZE
            print(f"{name},{f},{ev},{d.value(f, s + 0x0E, 2) - d.value(f, X, 2)},"
                  f"{d.value(f, s + 0x16, 2) - d.value(f, Z, 2)},{d.value(f, ACTION, 2):#x},"
                  f"{d.value(f, PHASE, 2)},{n},{d.value(f, s + 4)},{d.value(f, s + 0x0A, 2):#x},{dmg},"
                  f"{inputs.get(f, '')}")
        if not grab:
            # kein Griff: Abstand zum naechsten Gegner in den letzten Frames
            print(f"{name},-,kein Griff,,,,,,,,,")
            continue
        g, n = grab
        s = SLOT_BASE + n * SLOT_SIZE
        for f in range(max(2, g - 4), g):
            row(f, n, "vorher")
        row(g, n, "GRIFF")
        f = g + 1
        while f in d.offsets and d.value(f, s + 4) in (2, 3) and f < d.frames[-1]:
            dmg = d.value(f - 1, s + 0x40, 2, True) - d.value(f, s + 0x40, 2, True)
            if dmg > 0:
                row(f, n, "treffer im griff", dmg)
            if d.value(f, s + 0x0A, 2) != d.value(f - 1, s + 0x0A, 2):
                row(f, n, "gegner_aktion wechselt")
            f += 1
        if f in d.offsets and d.value(f, s + 4) not in (2, 3):
            row(f, n, "gegner verlaesst status 2/3")
        else:
            row(f, n, "laufende (gegner noch in status 2/3)")


def cmd_gegnerschaden(args):
    """Kandidaten = angezeigte Gegner (S+4 != 0, S+5 == 1), nach Abstand
    sortiert. Die Zuordnung zum Angreifer ist eine Vermutung (naechster
    Gegner, dessen Aktion in den Frames davor wechselt)."""
    print("lauf,frame,schaden,p1_lp_nachher,p1_status_vorher,p1_aktion_vorher,p1_hoehe,"
          "kandidat,slot,max_lp,typ,dx,dz,aktion_f-8..f,status")
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        for f0, f in zip(d.frames, d.frames[1:]):
            dmg = d.value(f0, HP, 2, True) - d.value(f, HP, 2, True)
            if dmg <= 0 or not d.value(f0, STATE):
                continue
            cands = []
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if d.value(f, s + 4) and d.value(f, s + 5):
                    dx = d.value(f, s + 0x0E, 2) - d.value(f, X, 2)
                    dz = d.value(f, s + 0x16, 2) - d.value(f, Z, 2)
                    cands.append((abs(dx) + abs(dz), n, dx, dz))
            cands.sort()
            for i, (_, n, dx, dz) in enumerate(cands[:2]):
                s = SLOT_BASE + n * SLOT_SIZE
                acts = "/".join(f"{d.value(g, s + 0x0A, 2):x}.{d.value(g, s + 0x0C, 2):x}"
                                for g in range(f - 8, f + 1) if g in d.offsets)
                print(f"{name},{f},{dmg},{d.value(f, HP, 2, True)},{d.value(f0, STATE)},"
                      f"{d.value(f0, ACTION, 2):#x},{d.value(f, H, 2, True)},{i + 1},{n},"
                      f"{d.value(f, s + 0x9A, 2)},{d.value(f, s + 0x38, 4):#x},{dx},{dz},{acts},"
                      f"{d.value(f, s + 4)}")


def cmd_wurf(args):
    print("lauf,wurf_eingabe,richtung,schaden_frame,schaden,loslassen,scheitel_frame_nach_loslassen,scheitel_hoehe,"
          "landung,ruhe_ab,gegner_start_dx,weite_ab_gegnerstart,ende_dx_zur_figur,ende_dz,"
          "flug_x_bis_landung,rutschen_nach_landung,figur_dx_waehrend")
    for prefix in args.prefix:
        d = Dump(prefix)
        rows = list(csv.DictReader(open(prefix + "_inputs.csv")))
        name = Path(prefix).name
        w = None
        for r in rows:
            ins = r["inputs"].split("|")
            if "P1 Button 1" in ins and any(k in ins for k in ("P1 Left", "P1 Right", "P1 Up", "P1 Down")):
                w = (int(r["frame"]), "+".join(k[3:] for k in ins if k != "P1 Button 1"))
                break
        if not w:
            print(f"{name},-,keine Wurfeingabe")
            continue
        f0, richtung = w
        # gehaltener Gegner: Slot mit Aktion 0x02 (gehalten) oder 0x04 (nach
        # einem Kniestoss, noch nicht wieder gehalten) im Frame der Eingabe
        held = [n for n in range(20) if d.value(f0, SLOT_BASE + n * SLOT_SIZE + 0x0A, 2) in (2, 4)
                and d.value(f0, SLOT_BASE + n * SLOT_SIZE + 4) in (2, 3)]
        if not held:
            print(f"{name},{f0},{richtung},kein gehaltener Gegner")
            continue
        s = SLOT_BASE + held[0] * SLOT_SIZE
        x0 = fix(d, f0, s + 0x0E)
        px0 = fix(d, f0, X)
        fr = [f for f in d.frames if f >= f0]
        dmgf = next((f for f in fr[1:] if d.value(f, s + 0x40, 2, True) < d.value(f - 1, s + 0x40, 2, True)), None)
        dmg = d.value(dmgf - 1, s + 0x40, 2, True) - d.value(dmgf, s + 0x40, 2, True) if dmgf else 0
        # Loslassen: Aktion wechselt von 0x02 weg (nach einem Knie wird der
        # Gegner erst in Eingabe+1 wieder gehalten)
        rel = next((f for f in fr[2:] if d.value(f, s + 0x0A, 2) != 2 and d.value(f - 1, s + 0x0A, 2) == 2), None)
        hi = lambda f: d.value(f, s + 0x12, 2, True)
        peak = max((f for f in fr if rel and f >= rel), key=hi, default=f0)
        land = next((f for f in fr if rel and f > rel and hi(f) <= 0 < hi(f - 1)), None)
        rest = None
        if land:
            for f in fr:
                if f > land and all(f + k in d.offsets and fix(d, f + k, s + 0x0E) == fix(d, f, s + 0x0E) for k in range(1, 6)):
                    rest = f
                    break
        end = rest or fr[-1]
        xend = fix(d, end, s + 0x0E)
        print(f"{name},{f0},{richtung},{dmgf or '-'},{dmg},{rel or '-'},{peak},{hi(peak)},{land or '-'},"
              f"{rest or '-'},{x0 - px0:+g},{xend - x0:+g},{xend - fix(d, end, X):+g},"
              f"{fix(d, end, s + 0x16) - fix(d, end, Z):+g},"
              f"{(fix(d, land, s + 0x0E) - x0) if land else 0:+g},"
              f"{(xend - fix(d, land, s + 0x0E)) if land else 0:+g},{fix(d, end, X) - px0:+g}")


def cmd_wurfablauf(args):
    """Ereignisse ab dem Griff: LP-Verluste aller Gegner und der Figur,
    Statuswechsel der Figur, Aktionswechsel des gehaltenen Gegners und seine
    Ruhelage. rel = Frame minus erster Aktionseingabe (Angriff oder Sprung)
    nach dem Griff."""
    print("lauf,frame,rel,ereignis,slot,wert,dx,dz,hoehe")
    for prefix in args.prefix:
        d = Dump(prefix)
        inputs = {int(r["frame"]): r["inputs"].split("|") for r in csv.DictReader(open(prefix + "_inputs.csv"))}
        name = Path(prefix).name
        grab = None
        for f in d.frames[1:-1]:
            for n in range(20):
                s = SLOT_BASE + n * SLOT_SIZE
                if (d.value(f - 1, s + 4) == 1 and d.value(f, s + 4) in (2, 3)
                        and d.value(f, s + 0x40, 2, True) == d.value(f - 1, s + 0x40, 2, True)
                        and d.value(f + 1, s + 0x0A, 2) == 2):
                    grab = (f, n)
                    break
            if grab:
                break
        if not grab:
            print(f"{name},-,-,kein Griff,,,,,")
            continue
        g, n = grab
        s = SLOT_BASE + n * SLOT_SIZE
        act = next((f for f in d.frames if f >= g and any(k in inputs.get(f, []) for k in ("P1 Button 1", "P1 Button 2"))), g)

        def row(f, ev, slot="", wert="", base=s):
            print(f"{name},{f},{f - act:+d},{ev},{slot},{wert},"
                  f"{fix(d, f, base + 0x0E) - fix(d, f, X):+g},"
                  f"{d.value(f, base + 0x16, 2) - d.value(f, Z, 2)},{d.value(f, base + 0x12, 2, True)}")
        row(g, "griff", n)
        last_x, still, rested = None, 0, False
        for f0, f in zip(d.frames, d.frames[1:]):
            if f <= g:
                continue
            for k in range(20):
                b = SLOT_BASE + k * SLOT_SIZE
                if not d.value(f0, b + 4) or not d.value(f, b + 4):
                    continue
                dmg = d.value(f0, b + 0x40, 2, True) - d.value(f, b + 0x40, 2, True)
                if dmg > 0:
                    st = d.value(f + 1, b + 4) if f + 1 in d.offsets else d.value(f, b + 4)
                    row(f, "lp_gegner" + (" (umgeworfen)" if st == 2 else ""), k, dmg, b)
            dmg = d.value(f0, HP, 2, True) - d.value(f, HP, 2, True)
            if dmg > 0:
                row(f, "lp_figur", "P1", dmg)
            if d.value(f0, STATE) != d.value(f, STATE):
                row(f, f"figur_status {d.value(f0, STATE)}->{d.value(f, STATE)}")
            a0, a1 = d.value(f0, s + 0x0A, 2), d.value(f, s + 0x0A, 2)
            if a0 != a1:
                row(f, f"gegner_aktion {a0:#x}->{a1:#x}", n)
            x = fix(d, f, s + 0x0E)
            still = still + 1 if x == last_x else 0
            last_x = x
            if not rested and still == 5 and d.value(f, s + 0x12, 2, True) == 0 and f - 5 > act:
                rested = True
                row(f - 5, "gegner_ruhe", n)


def cmd_umfallen(args):
    """Jedes Umwerfen der Figur (Status 1/3 -> 2): Flugbeginn (erste
    x-Aenderung), hoechster Punkt (16.16), erster Bodenkontakt (ganzzahlige
    Hoehe 0), Ruhe (x 5 Frames konstant), Aufstehen (Status 2 -> 3); dx relativ
    zur x-Position beim Umwerfen."""
    print("lauf,umgeworfen,flug_ab,scheitel_frame,scheitel_hoehe,boden,boden_dx,ruhe,ruhe_dx,aufstehen,"
          "liegt_frames,vx")
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        fr = d.frames
        for f0, f in zip(fr, fr[1:]):
            if not (d.value(f0, STATE) in (1, 3) and d.value(f, STATE) == 2):
                continue
            x0 = fix(d, f, X)
            nxt = [g for g in fr if g > f]
            up = next((g for g in nxt if d.value(g, STATE) != 2), None)
            seg = [g for g in nxt if up is None or g < up]
            start = next((g for g in seg if fix(d, g, X) != x0), None)
            if start is None:
                print(f"{name},{f},keine x-Bewegung,,,,,,,{up or '-'},{(up - f) if up else '-'},")
                continue
            h = lambda g: fix(d, g, H)
            peak = max(seg, key=h)
            land = next((g for g in seg if g > peak and d.value(g, H, 2, True) <= 0), None)
            rest = next((g for g in seg if g > (land or start)
                         and all(g + k in d.offsets and fix(d, g + k, X) == fix(d, g, X) for k in range(1, 6))), None)
            vx = fix(d, start, X) - fix(d, start - 1, X)
            print(f"{name},{f},{start},{peak},{h(peak):g},{land or '-'},"
                  f"{(fix(d, land, X) - x0) if land else 0:+g},{rest or '-'},"
                  f"{(fix(d, rest, X) - x0) if rest else 0:+g},{up or '-'},{(up - f) if up else '-'},{vx:+g}")


RANK = 0xFFF82A                        # Schwierigkeitswert (Byte, 7..24)
PTR_ANGREIFER = P1 + 0x82              # Wort: Slotadresse+4 des letzten Angreifers
PTR_HALTER = P1 + 0x70                 # Wort: Slotadresse+4 des haltenden Gegners


def cmd_angreifer(args):
    """Jeder LP-Verlust von P1 mit Verursacher. Regel (Workflow Gegnerschaden):
    P+0x82 zeigt auf den Slot des Angreifers (S = 0xFF0000 + Wort - 4); dessen
    Trefferattribut S+0x24 ist aktiv (Bit 0x4000/0x8000) und S+0x8B ist der
    Schaden ("direkt"). Sonst: Geschoss in Slot 20-59 mit S+0x6C = Zeigerwort,
    aktivem S+0x24 und S+0x8B = Schaden ("geschoss"); Figur gehalten (P+9 = 6
    im Frame davor), Halter aus P+0x70 ("griff"); sonst "anders"."""
    print("lauf,frame,schaden,lp_nachher,rang,art,slot,typ,max_lp,attr,schadenswert,"
          "figur_hoehe,umgeworfen")
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        for f0, f in zip(d.frames, d.frames[1:]):
            dmg = d.value(f0, HP, 2, True) - d.value(f, HP, 2, True)
            if dmg <= 0 or not d.value(f0, STATE):
                continue

            def slot_of(word):
                a = 0xFF0000 + word - 4
                n = (a - SLOT_BASE) // SLOT_SIZE
                return n if 0 <= n < 60 and (a - SLOT_BASE) % SLOT_SIZE == 0 else None

            def aktiv(b):
                at = d.value(f, b + 0x24, 2)
                return at & 0xC000 and at >> 8 != 0xFF

            art, n = "anders", None
            ptr = d.value(f, PTR_ANGREIFER, 2)
            k = slot_of(ptr)
            if k is not None:
                b = SLOT_BASE + k * SLOT_SIZE
                if aktiv(b) and d.value(f, b + 0x8B) == dmg:
                    art, n = "direkt", k
            if n is None:
                for k in range(20, 60):
                    b = SLOT_BASE + k * SLOT_SIZE
                    if (d.value(f, b + 4) and d.value(f, b + 0x6C, 2) == ptr
                            and d.value(f, b + 0x24, 2) not in (0, 0xFF00) and d.value(f, b + 0x8B) == dmg):
                        art, n = "geschoss", k
                        break
            if n is None and d.value(f0, P1 + 9) == 6:
                k = slot_of(d.value(f0, PTR_HALTER, 2))
                if k is not None:
                    art, n = "griff", k
            b = SLOT_BASE + (n or 0) * SLOT_SIZE
            st = d.value(f + 1, STATE) if f + 1 in d.offsets else d.value(f, STATE)
            row = (f"{name},{f},{dmg},{d.value(f, HP, 2, True)},{d.value(f, RANK)},{art},"
                   + (f"{n},{d.value(f, b + 0x38, 4):#x},{d.value(f, b + 0x9A, 2)},"
                      f"{d.value(f, b + 0x24, 2):#06x},{d.value(f, b + 0x8B)}," if n is not None else ",,,,,")
                   + f"{d.value(f0, H, 2, True)},{'ja' if st == 2 else 'nein'}")
            print(row)


def cmd_rang(args):
    """Verlauf des Rangs FFF82A: jeder Wechsel, dazu Tode der Figur (LP < 0)."""
    print("lauf,frame,ereignis,rang,lp")
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        f1 = d.frames[0]
        print(f"{name},{f1},start,{d.value(f1, RANK)},{d.value(f1, HP, 2, True)}")
        for f0, f in zip(d.frames, d.frames[1:]):
            r0, r1 = d.value(f0, RANK), d.value(f, RANK)
            if r0 != r1:
                print(f"{name},{f},rang {r0}->{r1},{r1},{d.value(f, HP, 2, True)}")
            if d.value(f0, HP, 2, True) >= 0 > d.value(f, HP, 2, True):
                print(f"{name},{f},tod,{r1},{d.value(f, HP, 2, True)}")


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
    p.add_argument("--bis", type=int, default=10, help="Frames nach dem Druck (Standard 10)")
    p.set_defaults(fn=cmd_kette)
    p = sub.add_parser("rang")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_rang)
    p = sub.add_parser("angreifer")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_angreifer)
    p = sub.add_parser("umfallen")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_umfallen)
    p = sub.add_parser("wurfablauf")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_wurfablauf)
    p = sub.add_parser("sprungangriff")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_sprungangriff)
    p = sub.add_parser("gegnerschaden")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_gegnerschaden)
    p = sub.add_parser("wurf")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_wurf)
    p = sub.add_parser("griff")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_griff)
    # Reichweite der Gegnerangriffe (Praefix greichweite): Umsetzung in
    # messen_greichweite.py
    import messen_greichweite  # noqa: E402
    messen_greichweite.argumente(sub)
    # Trefferreaktion der Gegner (Praefix reaktion): Umsetzung und weitere
    # Auswertungen (treffer, kette, umwerfen, probe, ...) in messen_reaktion.py
    import messen_reaktion  # noqa: E402
    p = sub.add_parser("gegnerreaktion", help="je Frame Slot-Zustand, x 16.16, Hoehe, Tiefe, LP, "
                       "Animationszeiger des Gegners (weitere Auswertungen: messen_reaktion.py)")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--slot", type=int, default=None, help="Gegnerslot (Standard: der zuerst getroffene)")
    p.add_argument("--von", type=int, default=0)
    p.add_argument("--bis", type=int, default=0)
    p.set_defaults(fn=messen_reaktion.cmd_gegnerreaktion)
    # Spezialangriff und Sprint (Praefixe spezial, sprint): Umsetzung und
    # Zusammenfassungen in messen_spezial.py
    import messen_spezial  # noqa: E402
    p = sub.add_parser("spezial", help="Spezialangriff: Ereignisse je Lauf bzw. (--frames) Lage der "
                       "Gegner je Frame")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--frames", action="store_true", help="je Frame Bildnummer und Lage der Gegner")
    p.set_defaults(fn=messen_spezial.cmd_spezial)
    p = sub.add_parser("sprint", help="Sprint: Ereignisse je Lauf, (--tempo) Geschwindigkeit je "
                       "Abschnitt bzw. (--frames) Lage der Gegner je Frame")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--frames", action="store_true", help="je Frame ab dem Bezugsdruck Lage der Gegner")
    p.add_argument("--tempo", action="store_true", help="Geschwindigkeit je Abschnitt gleicher Eingabe")
    p.add_argument("--nach", type=int, default=0, help="mit --frames: Frames ueber das Aktionsende hinaus")
    p.set_defaults(fn=messen_spezial.cmd_sprint)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
