#!/usr/bin/env python3
"""Trefferreaktion der Gegner (Praefix reaktion; nur Standardbibliothek).

Wertet die Abzuege von scenarios/reaktion.lua aus (Bereich 0xFFA900 bis
0xFFEA00). Adressen siehe notes.md ("Gefundene Adressen"). Gegnerslot S =
0xFFBC90 + n*0xC0: S+4 Zustand (1 normal, 3 Trefferreaktion, 2 am Boden,
0 frei), S+0x0A/0x0C Aktion/Phase, S+0x0E/0x12/0x16 x/Hoehe/Tiefe (16.16),
S+0x1C Animationszeiger, S+0x24 Trefferattribut, S+0x40 LP. h = Frame, in
dem die LP des Gegners sinken.

Unterbefehle:
  gegnerreaktion PREFIX..  je Frame Slot-Zustand, Aktion/Phase, x/Hoehe/Tiefe
                  (16.16), LP, Animationszeiger und Attribut des Gegners, dazu
                  Aktion, Animationszeiger, Kombostufe und LP der Figur
  treffer PREFIX..  je Treffer ohne Umwerfen: Dauer der Trefferreaktion (S+4 = 3),
                  S+4 = 1 ab, Animationswechsel danach, Zittern/Rueckstoss (x je
                  Frame), Tiefe, erste Bewegung und erster Angriff danach
  kette PREFIX..  je Kettendruck D nach einem Treffer h: Ende der Reaktion,
                  erster aktiver Frame der Folgestufe (D+3/D+4/D+3), Luecke mit
                  S+4 = 1 dazwischen und was der Gegner darin tut
  umwerfen PREFIX..  je Umwerfen: Flugbeginn, Startgeschwindigkeit x/Hoehe,
                  Schwerkraft, Scheitel, erster Bodenkontakt, Ruhe, Aufstehen
                  (Phase 0x0A), S+4 = 1, Liege- und Aufstehdauer, Weite
  probe PREFIX.. --ref REF  Einzelframe-Proben: Treffer im aktiven Frame T des
                  letzten Schlags (T = Druck + 2)? Lage von T zum Umwerfen K und
                  zum Aufstehen G des Referenzlaufs
  griffprobe PREFIX.. --ref REF  erster Griff ab dem Laufbeginn T, relativ zum
                  Aufstehen G des Referenzlaufs
  mehrere PREFIX..  je Trefferframe alle getroffenen Slots, Schaden, Kombostufe
                  und Trefferstopp der Figur (Animationswechsel nach dem Treffer)
  tod PREFIX..    LP unter 0 bis Slot frei (S+4 = 0): Zustaende, Flug, Treffer
                  und Angriffsattribut nach dem Tod, LP-Verluste der Figur
  eckdaten REF    (fuer belege_reaktion.sh) Frames K und G des Referenzlaufs
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P1 = 0xFFA990
P_X, P_Z, P_H = P1 + 0x0E, P1 + 0x16, P1 + 0x12
P_ACT, P_PHASE, P_STATE, P_HP, P_ANIM = P1 + 0x0A, P1 + 0x0C, P1 + 0x04, P1 + 0x40, P1 + 0x1C
COMBO = P1 + 0x9D
SLOT_BASE, SLOT_SIZE = 0xFFBC90, 0xC0
TYP = {0x5A97E: "WOOKY", 0x60CA0: "EDDY"}

# Animationszeiger (S+0x1C), in diesen Laeufen beobachtet: Bezeichnung nach
# dem Verhalten (Bewegung, Attribut S+0x24), nicht nach dem ROM
ANIM = {
    0x05ED1C: "gehen", 0x05ED4E: "gehen", 0x05ED7E: "gehen", 0x05EDAA: "gehen",
    0x05EDD4: "gehen", 0x05EE04: "gehen", 0x05EE34: "gehen", 0x05EE60: "gehen",
    0x05ECAA: "stand", 0x05EC70: "stand",
    0x05EFC8: "reaktion", 0x05F002: "reaktion", 0x05F034: "reaktion",
    0x05EE94: "reaktion", 0x05EECE: "reaktion",
    0x05FA54: "ausholen", 0x05FA8C: "ausholen", 0x05FC18: "ausholen",
    0x063746: "gehen", 0x063778: "gehen", 0x0637A8: "gehen", 0x0637D6: "gehen",
    0x063800: "gehen", 0x063830: "gehen", 0x063860: "gehen", 0x06388C: "gehen",
    0x0636D4: "stand",
    0x0638C0: "reaktion", 0x0638FA: "reaktion",
    0x0639F4: "reaktion", 0x063A2E: "reaktion", 0x063A60: "reaktion",
    0x0643F8: "ausholen", 0x064430: "ausholen", 0x064688: "ausholen", 0x0646C0: "ausholen",
    0x0646F8: "ausholen", 0x0645BC: "ausholen", 0x0645F4: "ausholen",
}


def slot_addr(n):
    return SLOT_BASE + n * SLOT_SIZE


def fx(d, f, a):
    """16.16-Wert (Ganzzahlwort plus Nachkommawort) als float."""
    return d.value(f, a, 4, signed=True) / 65536


def g(v):
    return f"{v:+.4f}".rstrip("0").rstrip(".")


def anim_name(p):
    return ANIM.get(p, "")


def attr_aktiv(d, f, s):
    at = d.value(f, s + 0x24, 2)
    return bool(at & 0xC000) and at >> 8 != 0xFF


def presses(prefix, key="P1 Button 1"):
    """Frames, in denen die Taste neu gedrueckt ist."""
    out, prev = [], False
    for r in csv.DictReader(open(prefix + "_inputs.csv")):
        on = key in r["inputs"].split("|")
        if on and not prev:
            out.append(int(r["frame"]))
        prev = on
    return out


def hits(d, s):
    """LP-Verluste des Slots: Liste (h, schaden, lp_nachher)."""
    out = []
    for f0, f in zip(d.frames, d.frames[1:]):
        if not d.value(f0, s + 4):
            continue
        a, b = d.value(f0, s + 0x40, 2, True), d.value(f, s + 0x40, 2, True)
        if b < a:
            out.append((f, a - b, b))
    return out


def target_slot(d, args):
    if args.slot is not None:
        return args.slot
    for f0, f in zip(d.frames, d.frames[1:]):
        for n in range(20):
            s = slot_addr(n)
            if d.value(f0, s + 4) and d.value(f, s + 0x40, 2, True) < d.value(f0, s + 0x40, 2, True):
                return n
    return 18


def typname(d, f, s):
    t = d.value(f, s + 0x38, 4)
    return TYP.get(t, f"{t:#x}")


def cmd_gegnerreaktion(args):
    print("lauf,frame,slot,s4,s5,aktion,phase,x,dx,hoehe,tiefe,lp,anim,anim_art,attr,"
          "p1_aktion,p1_phase,p1_anim,kombostufe,p1_x,p1_lp")
    for prefix in args.prefix:
        d = Dump(prefix)
        n = target_slot(d, args)
        s = slot_addr(n)
        name = Path(prefix).name
        for f in d.frames:
            if (args.von and f < args.von) or (args.bis and f > args.bis):
                continue
            dx = fx(d, f, s + 0x0E) - fx(d, f - 1, s + 0x0E) if f - 1 in d.offsets else 0
            an = d.value(f, s + 0x1C, 4)
            print(f"{name},{f},{n},{d.value(f, s + 4)},{d.value(f, s + 5)},"
                  f"{d.value(f, s + 0x0A, 2):#x},{d.value(f, s + 0x0C, 2):#x},"
                  f"{fx(d, f, s + 0x0E):.4f},{g(dx)},{fx(d, f, s + 0x12):.4f},{fx(d, f, s + 0x16):.4f},"
                  f"{d.value(f, s + 0x40, 2, True)},{an:06x},{anim_name(an)},{d.value(f, s + 0x24, 2):04x},"
                  f"{d.value(f, P_ACT, 2):#x},{d.value(f, P_PHASE, 2)},{d.value(f, P_ANIM, 4):06x},"
                  f"{d.value(f, COMBO) // 4 + 1},{fx(d, f, P_X):.4f},{d.value(f, P_HP, 2, True)}")


def reaction(d, s, h, nxt):
    """Ablauf nach einem Treffer h ohne Umwerfen. nxt = naechster Treffer."""
    last = d.frames[-1]
    end = h
    f = h + 1
    while f <= last and d.value(f, s + 4) == 3 and (nxt is None or f < nxt):
        end = f
        f += 1
    frei = f if f <= last and d.value(f, s + 4) == 1 and (nxt is None or f < nxt) else None
    # Zittern/Rueckstoss: x-Aenderungen je Frame von h bis zum Ende der Reaktion
    # (ab h+1: im Frame h selbst kann sich der Gegner noch bewegt haben)
    shifts = []
    for k in range(h + 1, end + 1):
        dx = fx(d, k, s + 0x0E) - fx(d, k - 1, s + 0x0E)
        if dx:
            shifts.append(f"h+{k - h}:{g(dx)}")
    xsum = fx(d, end, s + 0x0E) - fx(d, h, s + 0x0E)
    zsum = fx(d, end, s + 0x16) - fx(d, h, s + 0x16)
    anims = []
    for k in range(h + 1, min(last, (frei or end) + 30) + 1):
        if nxt is not None and k >= nxt:
            break
        a0, a1 = d.value(k - 1, s + 0x1C, 4), d.value(k, s + 0x1C, 4)
        if a0 != a1:
            anims.append(f"h+{k - h}:{a1:06x}{'/' + anim_name(a1) if anim_name(a1) else ''}")
    move = attack = ausholen = p1hit = None
    if frei:
        for k in range(frei, last + 1):
            if nxt is not None and k >= nxt:
                break
            if move is None and (fx(d, k, s + 0x0E) != fx(d, k - 1, s + 0x0E)
                                 or fx(d, k, s + 0x16) != fx(d, k - 1, s + 0x16)):
                move = k
            if ausholen is None and anim_name(d.value(k, s + 0x1C, 4)) == "ausholen":
                ausholen = k
            if attack is None and attr_aktiv(d, k, s):
                attack = k
            if p1hit is None and d.value(k, P_HP, 2, True) < d.value(k - 1, P_HP, 2, True):
                p1hit = k
    return end, frei, shifts, xsum, zsum, anims, move, ausholen, attack, p1hit


def rel(v, h):
    return f"h+{v - h}" if v is not None else "-"


def cmd_treffer(args):
    print("lauf,gegner,slot,h,stufe,p1_aktion,schaden,lp_nachher,art,reaktion_bis,reaktion_frames,"
          "s4_1_ab,abbruch_durch_treffer,anim_wechsel,x_je_frame,x_summe,tiefe_summe,"
          "erste_bewegung,ausholen_ab,angriff_aktiv_ab,figur_getroffen")
    for prefix in args.prefix:
        d = Dump(prefix)
        n = target_slot(d, args)
        s = slot_addr(n)
        name = Path(prefix).name
        hl = hits(d, s)
        for i, (h, dmg, lp) in enumerate(hl):
            nxt = hl[i + 1][0] if i + 1 < len(hl) else None
            st = d.value(h + 1, s + 4) if h + 1 in d.offsets else d.value(h, s + 4)
            stufe = d.value(h, COMBO) // 4 + 1
            pa = d.value(h, P_ACT, 2)
            if st != 3:
                print(f"{name},{typname(d, h, s)},{n},{h},{stufe},{pa:#x},{dmg},{lp},"
                      f"{'tod' if lp < 0 else 'umgeworfen'},,,,,,,,,,,,")
                continue
            end, frei, shifts, xs, zs, anims, move, aus, att, p1 = reaction(d, s, h, nxt)
            abbr = f"h+{nxt - h}" if nxt is not None and nxt == end + 1 else "-"
            print(f"{name},{typname(d, h, s)},{n},{h},{stufe},{pa:#x},{dmg},{lp},reaktion,"
                  f"h+{end - h},{end - h + 1},{rel(frei, h)},{abbr},{' '.join(anims)},"
                  f"{' '.join(shifts)},{g(xs)},{g(zs)},{rel(move, h)},{rel(aus, h)},"
                  f"{rel(att, h)},{rel(p1, h)}")


STARTUP = {2: 3, 3: 4, 4: 3}


def cmd_kette(args):
    """Fuer jeden Kettendruck D (2. bis 4. Druck): Treffer h der Vorstufe,
    Ende der Reaktion (letzter Frame mit S+4 = 3), erster aktiver Frame der
    Folgestufe (D + Startup) und der gemessene Treffer."""
    print("lauf,gegner,stufe,h_vorstufe,druck,druck_rel,reaktion_bis,s4_1_ab,aktiv_ab,"
          "luecke_frames,s4_im_aktiven_frame,treffer,treffer_rel,gegner_in_luecke")
    for prefix in args.prefix:
        d = Dump(prefix)
        n = target_slot(d, args)
        s = slot_addr(n)
        name = Path(prefix).name
        hl = [h for h, _, _ in hits(d, s)]
        pr = presses(prefix)
        for k, D in enumerate(pr[1:], start=2):
            prev = [h for h in hl if h < D]
            if not prev:
                continue
            h = prev[-1]
            stufe_ram = None
            nxt = next((x for x in hl if x > D), None)
            if nxt is not None:
                stufe_ram = d.value(nxt, COMBO) // 4 + 1
            stufe = stufe_ram or k
            end = h
            f = h + 1
            while f in d.offsets and d.value(f, s + 4) == 3 and f != nxt:
                end = f
                f += 1
            frei = f if f in d.offsets and d.value(f, s + 4) == 1 else None
            act = D + STARTUP.get(stufe, 2)
            gap = (act - frei) if frei and frei <= act else 0
            st_act = d.value(act, s + 4) if act in d.offsets else "-"
            what = []
            if frei:
                for q in range(frei, min(act, d.frames[-1]) + 1):
                    a0, a1 = d.value(q - 1, s + 0x1C, 4), d.value(q, s + 0x1C, 4)
                    if a0 != a1:
                        what.append(f"h+{q - h}:{anim_name(a1) or format(a1, '06x')}")
                    if fx(d, q, s + 0x0E) != fx(d, q - 1, s + 0x0E) and not any(w.startswith("x") for w in what):
                        what.append(f"x ab h+{q - h}")
                    if attr_aktiv(d, q, s):
                        what.append(f"angriff h+{q - h}")
                        break
            print(f"{name},{typname(d, h, s)},{stufe},{h},{D},h+{D - h},h+{end - h},{rel(frei, h)},"
                  f"h+{act - h},{gap},{st_act},{nxt or '-'},{rel(nxt, h) if nxt else '-'},"
                  f"{' '.join(what)}")


def knockdowns(d, s):
    """Umwerfen: LP-Verlust, nach dem der Gegner in Phase 8 (Ruhe) kommt,
    ohne vorher wieder S+4 = 1 zu haben; fuer den Wurf der Schadensframe."""
    out = []
    hl = hits(d, s)
    for i, (h, dmg, lp) in enumerate(hl):
        if lp < 0:
            continue
        nxt = hl[i + 1][0] if i + 1 < len(hl) else d.frames[-1] + 1
        for f in range(h + 1, nxt):
            if d.value(f, s + 4) in (0, 1):
                break
            if d.value(f, s + 0x0C, 2) == 8:
                out.append((h, dmg))
                break
    return out


def cmd_umwerfen(args):
    print("lauf,gegner,slot,K,schaden,p1_aktion,flug_ab,vx0,vh0,schwerkraft,vx_aenderung,scheitel,"
          "scheitel_hoehe,boden,boden_dx,ruhe,ruhe_dx,aufstehen_ab,s4_1_ab,liegen_ruhe_bis_aufstehen,"
          "aufstehen_frames,anim_aufstehen,s4_waehrend,tiefe_summe,aktion_ab_G,erste_bewegung_ab_G")
    for prefix in args.prefix:
        d = Dump(prefix)
        n = target_slot(d, args)
        s = slot_addr(n)
        name = Path(prefix).name
        for K, dmg in knockdowns(d, s):
            x0 = fx(d, K, s + 0x0E)
            seg = []
            for f in range(K + 1, d.frames[-1] + 1):
                if d.value(f, s + 4) in (0, 1):
                    break
                seg.append(f)
            hh = lambda f: fx(d, f, s + 0x12)
            # Flugbeginn: erster Frame, in dem die Hoehe steigt, nachdem der
            # Gegner frei ist (beim Wurf: Aktion wechselt von 2 auf 4)
            rel_ = next((f for f in seg if d.value(f, s + 0x0A, 2) == 4 and d.value(f - 1, s + 0x0A, 2) == 2), None)
            if rel_:
                fl = next((f for f in seg if f >= rel_ and (hh(f) != hh(f - 1)
                           or fx(d, f, s + 0x0E) != fx(d, f - 1, s + 0x0E))), None)
            else:
                fl = next((f for f in seg if hh(f) > hh(f - 1)), None)
            if fl is None:
                continue
            vx0 = fx(d, fl, s + 0x0E) - fx(d, fl - 1, s + 0x0E)
            vh0 = hh(fl) - hh(fl - 1)
            peak = max((f for f in seg if f >= fl), key=hh)
            land = next((f for f in seg if f > peak and d.value(f, s + 0x12, 2, True) <= 0), None)
            gr = set()
            vxs = set()
            for f in range(fl + 1, (land or fl) - 1):
                gr.add(round((hh(f + 1) - hh(f)) - (hh(f) - hh(f - 1)), 6))
                vxs.add(round((fx(d, f + 1, s + 0x0E) - fx(d, f, s + 0x0E)) - (fx(d, f, s + 0x0E) - fx(d, f - 1, s + 0x0E)), 6))
            ruhe = next((f for f in seg if d.value(f, s + 0x0C, 2) == 8), None)
            auf = next((f for f in seg if d.value(f, s + 0x0C, 2) == 0x0A), None)
            G = seg[-1] + 1 if seg and seg[-1] + 1 in d.offsets and d.value(seg[-1] + 1, s + 4) == 1 else None
            an = []
            if auf:
                for f in range(auf, (G or auf) + 1):
                    if d.value(f, s + 0x1C, 4) != d.value(f - 1, s + 0x1C, 4):
                        an.append(f"{f - auf:+d}:{d.value(f, s + 0x1C, 4):06x}")
            s4s = sorted({d.value(f, s + 4) for f in seg})
            # Aktion nach dem Aufstehen und wie lange sie dauert
            nachG = "-"
            if G:
                a = d.value(G, s + 0x0A, 2)
                e = next((f for f in d.frames if f > G and d.value(f, s + 0x0A, 2) != a), None)
                nachG = f"{a:#x} bis G+{e - G - 1}" if e else f"{a:#x} bis Laufende"
            mvG = "-"
            if G:
                mv = next((f for f in d.frames if f > G and (fx(d, f, s + 0x0E) != fx(d, f - 1, s + 0x0E)
                                                               or fx(d, f, s + 0x16) != fx(d, f - 1, s + 0x16))), None)
                mvG = f"G+{mv - G}" if mv else "-"
            zsum = fx(d, seg[-1], s + 0x16) - fx(d, K, s + 0x16) if seg else 0
            print(f"{name},{typname(d, K, s)},{n},{K},{dmg},{d.value(K, P_ACT, 2):#x},K+{fl - K},{g(vx0)},{g(vh0)},"
                  f"{' '.join(g(x) for x in sorted(gr))},{' '.join(g(x) for x in sorted(vxs))},"
                  f"K+{peak - K},{hh(peak):.4f},{rel(land, K).replace('h', 'K')},"
                  f"{g(fx(d, land, s + 0x0E) - x0) if land else '-'},{rel(ruhe, K).replace('h', 'K')},"
                  f"{g(fx(d, ruhe, s + 0x0E) - x0) if ruhe else '-'},{rel(auf, K).replace('h', 'K')},"
                  f"{rel(G, K).replace('h', 'K')},{(auf - ruhe) if auf and ruhe else '-'},"
                  f"{(G - auf) if G and auf else '-'},{' '.join(an)},{'/'.join(map(str, s4s))},{g(zsum)},{nachG},{mvG}")


def ref_frames(ref, slot):
    """Umwerfen K und Aufstehen G (erster Frame mit S+4 = 1) im Referenzlauf."""
    d = Dump(ref)
    s = slot_addr(slot)
    kd = knockdowns(d, s)
    if not kd:
        return None, None
    K = kd[0][0]
    G = next((f for f in d.frames if f > K and d.value(f, s + 4) == 1), None)
    return K, G


def cmd_eckdaten(args):
    """Fuer Skripte: Umwerfen K und Aufstehen G des Referenzlaufs."""
    K, G = ref_frames(args.prefix, args.slot)
    print(f"{K or '-'} {G or '-'}")


def cmd_probe(args):
    K, G = ref_frames(args.ref, args.slot)
    print(f"# Referenz {Path(args.ref).name}: Umwerfen K = {K}, Aufstehen G (S+4 = 1) = {G}")
    print("lauf,druck,T,T_rel_K,T_rel_G,figur_schlaegt,s4_vorher,aktion_phase_vorher,treffer,"
          "treffer_frame,schaden,s4_nachher,dx,dz,treffer_rel_G")
    s = slot_addr(args.slot)
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        pr = presses(prefix)
        if not pr:
            continue
        P = pr[-1]
        T = P + 2
        schl = "ja" if P + 1 in d.offsets and d.value(P + 1, P_ACT, 2) == 0x10 and d.value(P, P_ACT, 2) != 0x10 else "nein"
        hit = None
        for f in range(T, T + 4):
            if f in d.offsets and f - 1 in d.offsets and \
                    d.value(f, s + 0x40, 2, True) < d.value(f - 1, s + 0x40, 2, True):
                hit = f
                break
        dmg = d.value(hit - 1, s + 0x40, 2, True) - d.value(hit, s + 0x40, 2, True) if hit else 0
        after = d.value(hit + 1, s + 4) if hit and hit + 1 in d.offsets else ""
        print(f"{name},{P},{T},K{T - K:+d},G{T - G:+d},{schl},{d.value(T - 1, s + 4)},"
              f"{d.value(T - 1, s + 0x0A, 2):#x}.{d.value(T - 1, s + 0x0C, 2):#x},"
              f"{'ja' if hit else 'nein'},{hit or '-'},{dmg},{after},"
              f"{d.value(T, s + 0x0E, 2) - d.value(T, P_X, 2)},{d.value(T, s + 0x16, 2) - d.value(T, P_Z, 2)},"
              f"{f'G{hit - G:+d}' if hit else '-'}")


def cmd_griffprobe(args):
    K, G = ref_frames(args.ref, args.slot)
    print(f"# Referenz {Path(args.ref).name}: Umwerfen K = {K}, Aufstehen G (S+4 = 1) = {G}")
    print("lauf,laufen_ab,griff,griff_rel_G,s4_vorher,aktion_vorher,dx,dz")
    s = slot_addr(args.slot)
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        T = presses(prefix, "P1 Right")[-1]
        grab = None
        for f in d.frames:
            if f <= max(T, 2) or f + 1 not in d.offsets:
                continue
            # Griff-Frame wie in messen_a5.py griff: der Frame vor dem ersten
            # Frame, in dem der Gegner gehalten wird (Aktion 2, S+4 = 3), ohne
            # LP-Verlust. Liegende Gegner gehen dabei von S+4 = 2 statt 1 aus.
            if (d.value(f + 1, s + 0x0A, 2) == 2 and d.value(f + 1, s + 4) == 3
                    and d.value(f, s + 0x0A, 2) != 2
                    and d.value(f + 1, s + 0x40, 2, True) == d.value(f, s + 0x40, 2, True)):
                grab = f
                break
        if grab:
            print(f"{name},{T},{grab},G{grab - G:+d},{d.value(grab - 1, s + 4)},"
                  f"{d.value(grab - 1, s + 0x0A, 2):#x},{d.value(grab, s + 0x0E, 2) - d.value(grab, P_X, 2)},"
                  f"{d.value(grab, s + 0x16, 2) - d.value(grab, P_Z, 2)}")
        else:
            print(f"{name},{T},-,kein Griff,,,,")


def cmd_mehrere(args):
    print("lauf,druck,trefferframe,getroffen,schaden,kombostufe,p1_anim_wechsel_nach_h,"
          "trefferstopp_stufe1,p1_phase4_ab")
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        pr = presses(prefix)
        by = {}
        for n in range(20):
            for h, dmg, lp in hits(d, slot_addr(n)):
                by.setdefault(h, []).append((n, dmg, typname(d, h, slot_addr(n))))
        for h in sorted(by):
            D = max((p for p in pr if p < h), default=None)
            nxt = min((p for p in pr if p > h), default=d.frames[-1])
            ch = [f for f in range(h + 1, min(nxt, d.frames[-1]) + 1)
                  if d.value(f, P_ANIM, 4) != d.value(f - 1, P_ANIM, 4)]
            ph4 = next((f for f in range(h + 1, min(nxt, d.frames[-1]) + 1)
                        if d.value(f, P_PHASE, 2) == 4 and d.value(f - 1, P_PHASE, 2) != 4), None)
            # Trefferstopp (nur Stufe 1): erster Animationswechsel nach h minus 4
            # (ohne Stopp wechselt die Animation der Stufe 1 in h+4 = P+6, siehe
            # notes.md "Messgroessen", Recovery-Frames Schlag)
            stufe = d.value(h, COMBO) // 4 + 1
            stop = (ch[0] - h - 4) if ch and stufe == 1 else "-"
            print(f"{name},{D or '-'},{h},{' '.join(f'{n}/{t}' for n, _, t in by[h])},"
                  f"{' '.join(str(x) for _, x, _ in by[h])},{d.value(h, COMBO) // 4 + 1},"
                  f"{' '.join(f'h+{f - h}' for f in ch[:4])},{stop},{rel(ph4, h)}")


def cmd_tod(args):
    print("lauf,gegner,slot,tod_frame,schaden,lp,p1_aktion,zustaende,flug_ab,vx0,vh0,boden,ruhe,frei_ab,"
          "frames_bis_frei,treffer_nach_tod,angriff_aktiv_nach_tod,figur_lp_verlust_nach_tod,"
          "proben_im_bereich")
    for prefix in args.prefix:
        d = Dump(prefix)
        n = target_slot(d, args)
        s = slot_addr(n)
        name = Path(prefix).name
        hl = hits(d, s)
        dead = next(((h, dmg, lp) for h, dmg, lp in hl if lp < 0), None)
        if not dead:
            print(f"{name},{typname(d, d.frames[0], s)},{n},kein Tod")
            continue
        t, dmg, lp = dead
        seq, prev = [], None
        free = None
        for f in range(t, d.frames[-1] + 1):
            k = (d.value(f, s + 4), d.value(f, s + 0x0A, 2), d.value(f, s + 0x0C, 2))
            if k != prev:
                seq.append(f"t+{f - t}:{k[0]}/{k[1]:x}.{k[2]:x}")
                prev = k
            if k[0] == 0:
                free = f
                break
        end = free or d.frames[-1]
        hh = lambda f: fx(d, f, s + 0x12)
        if d.value(t, s + 0x0A, 2) == 2:
            # Tod durch Wurf: Flug ab dem Loslassen (Aktion 2 -> 4), nicht beim Tragen
            rl = next((f for f in range(t + 1, end) if d.value(f - 1, s + 0x0A, 2) == 2
                       and d.value(f, s + 0x0A, 2) == 4), None)
            fl = next((f for f in range(rl, end) if hh(f) != hh(f - 1)), None) if rl else None
        else:
            fl = next((f for f in range(t + 1, end) if hh(f) > hh(f - 1)), None)
        peak = max(range(fl, end), key=hh) if fl else None
        land = next((f for f in range(peak, end) if d.value(f, s + 0x12, 2, True) <= 0), None) if peak else None
        ruhe = next((f for f in range(t + 1, end) if d.value(f, s + 0x0A, 2) == 6), None)
        later = [f"t+{h - t}:{x}" for h, x, _ in hl if h > t]
        att = [f for f in range(t + 1, end + 1) if attr_aktiv(d, f, s)]
        p1 = [f"t+{f - t}" for f in range(t + 1, end + 1)
              if d.value(f, P_HP, 2, True) < d.value(f - 1, P_HP, 2, True)]
        # Frames nach dem Tod, in denen ein Schlag der Figur aktiv sein kann und
        # der Gegner in Reichweite steht (|dx| <= 85, |dz| <= 11)
        near = [f for f in range(t + 1, end + 1)
                if d.value(f, P_ACT, 2) == 0x10
                and abs(d.value(f, s + 0x0E, 2) - d.value(f, P_X, 2)) <= 85
                and abs(d.value(f, s + 0x16, 2) - d.value(f, P_Z, 2)) <= 11]
        vx0 = g(fx(d, fl, s + 0x0E) - fx(d, fl - 1, s + 0x0E)) if fl else "-"
        vh0 = g(hh(fl) - hh(fl - 1)) if fl else "-"
        print(f"{name},{typname(d, t, s)},{n},{t},{dmg},{lp},{d.value(t, P_ACT, 2):#x},{' '.join(seq)},"
              f"{rel(fl, t).replace('h', 't')},{vx0},{vh0},{rel(land, t).replace('h', 't')},{rel(ruhe, t).replace('h', 't')},"
              f"{rel(free, t).replace('h', 't')},{(free - t) if free else '-'},{' '.join(later) or 'keine'},"
              f"{len(att)},{' '.join(p1) or 'keiner'},{len(near)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn in (("gegnerreaktion", cmd_gegnerreaktion), ("treffer", cmd_treffer),
                     ("kette", cmd_kette), ("umwerfen", cmd_umwerfen), ("mehrere", cmd_mehrere),
                     ("tod", cmd_tod)):
        p = sub.add_parser(name)
        p.add_argument("prefix", nargs="+")
        p.add_argument("--slot", type=int, default=None,
                       help="Gegnerslot (Standard: der zuerst getroffene)")
        if name == "gegnerreaktion":
            p.add_argument("--von", type=int, default=0)
            p.add_argument("--bis", type=int, default=0)
        p.set_defaults(fn=fn)
    for name, fn in (("probe", cmd_probe), ("griffprobe", cmd_griffprobe)):
        p = sub.add_parser(name)
        p.add_argument("prefix", nargs="+")
        p.add_argument("--ref", required=True, help="Referenzlauf ohne Probe (vollstaendiger Abzug)")
        p.add_argument("--slot", type=int, default=18)
        p.set_defaults(fn=fn)
    p = sub.add_parser("eckdaten")
    p.add_argument("prefix")
    p.add_argument("--slot", type=int, default=18)
    p.set_defaults(fn=cmd_eckdaten)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
