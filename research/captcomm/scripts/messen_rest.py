#!/usr/bin/env python3
"""Auswertungen fuer den Rest der Spielfigur (Praefix rest, nur Standardbibliothek).

Liest die Abzuege von rest_kette.lua und rest_frei.lua (FFA900-FFEA00) und die
Watch-CSV (Rang FFF82A, Zaehler FFF82C, Stage FFA8CE, Kamera FFA82E/FFA830).
Alle Frames sind lokale Frames des Runners. D = letzter Kettendruck (aus
<lauf>_meta.txt), h = Frame, in dem die LP eines Gegners sinken.

Unterbefehle (Teil des Auftrags in Klammern):
  zeitachse PREFIX         je Frame Aktion, Phase, Animation, Lage, Status, Kombo
                           der Figur und eines Gegners (--slot, --von, --bis)
  nachlauf PREFIX..        (A) je Lauf von rest_kette.lua: Treffer der letzten
                           Stufe, Phasen, Ruhe, Wirkung jeder Folgeeingabe nach D
  nachlauf-zusammenfassung CSV  (A) je Gruppe fruehester angenommener Angriff und
                           Sprung, Ruhe ohne Eingabe, erste Bewegung
  sprung PREFIX..          (B, F) je Lauf von rest_sprung.lua: Probeframe, Hoehe,
                           Abstand, Treffer, Schaden, Umwerfen
  sprung-zusammenfassung CSV  (B) je Gruppe aktive Frames, Reichweite x, Tiefe
  nulllp PREFIX..          (C) Gegner, dessen LP genau 0 erreichen: Reaktion,
                           Weiterleben, Angriffe, Tod beim naechsten Treffer
  tod PREFIX..             (D) je Tod der Figur: Ablauf, Neueinstieg, Lage, Rang,
                           Schutz, Treffer auf Gegner bei der Landung, Eingaben
  stagewechsel CSV..       (E) Rang beim Wechsel des Stage-Index (Bot-/Watch-CSV)
  probe PREFIX..           (F) erster Treffer der letzten Kettenstufe mit dx, dz
                           und Blick (Mindestabstand, Blick links, Ausfallschritt)
  richtung PREFIX..        (F) Richtung beim Kettendruck: Weg, Treffer, Folgestufe
  gegentreffer PREFIX..    (F) aktive Gegnerangriffe, LP-Verluste von Figur und
                           Gegnern (Treffer in der Luft, gleichzeitiger Treffer)
  todesart PREFIX..        (dritte Messung D1) Merkmale des toedlichen Treffers und
                           des Todesflugs, Klasse nach der Regel, Neueinstieg
  grenzen CSV              (dritte Messung F1) probe-Ausgabe je Gruppe als Grenzen
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
X, H, Z = P + 0x0E, P + 0x12, P + 0x16
STATE, ACT, PHASE, ANIM, HP = P + 0x04, P + 0x0A, P + 0x0C, P + 0x1C, P + 0x40
FACE, COMBO = P + 0x5E, P + 0x9D
T_UP, T_LIEGEN = 0xFFAA69, 0xFFAA61
SB, SS = 0xFFBC90, 0xC0


def slot(n):
    return SB + n * SS


def fix(d, f, a):
    return d.value(f, a, 4, signed=True) / 65536


def meta(prefix):
    m = {}
    p = Path(str(prefix) + "_meta.txt")
    if p.exists():
        for line in p.read_text().split():
            k, v = line.split("=", 1)
            m[k] = v
    return m


def watch(prefix):
    p = Path(str(prefix) + "_watch.csv")
    if not p.exists():
        return {}
    return {int(r["frame"]): r for r in csv.DictReader(open(p))}


def inputs(prefix):
    return {int(r["frame"]): set(filter(None, r["inputs"].split("|")))
            for r in csv.DictReader(open(str(prefix) + "_inputs.csv"))}


def kurz(ein):
    m = {"P1 Left": "l", "P1 Right": "r", "P1 Up": "u", "P1 Down": "d",
         "P1 Button 1": "a", "P1 Button 2": "j"}
    return "".join(sorted(m.get(e, "?") for e in ein))


def cmd_zeitachse(args):
    d = Dump(args.prefix)
    ein = inputs(args.prefix)
    s = slot(args.slot)
    von = args.von or d.frames[0]
    bis = args.bis or d.frames[-1]
    print("frame,ein,p_akt,p_phase,p_anim,p_status,p_x,p_h,p_z,p_blick,kombo,p_lp,t69,"
          "g_status,g_akt,g_phase,g_x,g_h,g_z,g_lp,g_anim,g_attr,g_blick")
    for f in d.frames:
        if f < von or f > bis:
            continue
        print(f"{f},{kurz(ein.get(f, ()))},{d.value(f, ACT, 2):#x},{d.value(f, PHASE, 2)},"
              f"{d.value(f, ANIM, 4) & 0xFFFFFF:06X},{d.value(f, STATE)},{fix(d, f, X):g},{fix(d, f, H):g},"
              f"{fix(d, f, Z):g},{'r' if d.value(f, FACE) & 0x20 else 'l'},{d.value(f, COMBO) // 4},"
              f"{d.value(f, HP, 2, True)},{d.value(f, T_UP)},"
              f"{d.value(f, s + 4):02X}{d.value(f, s + 5):02X},{d.value(f, s + 0x0A, 2):#x},{d.value(f, s + 0x0C, 2)},"
              f"{fix(d, f, s + 0x0E):g},{fix(d, f, s + 0x12):g},{fix(d, f, s + 0x16):g},"
              f"{d.value(f, s + 0x40, 2, True)},{d.value(f, s + 0x1C, 4) & 0xFFFFFF:06X},"
              f"{d.value(f, s + 0x24, 2):04X},{'r' if d.value(f, s + 0x5E) & 0x20 else 'l'}")


def treffer(d, slots=range(20), von=None):
    """Alle LP-Abnahmen in Gegnerslots: (frame, slot, schaden, lp_nachher, kombo)."""
    out = []
    for f0, f in zip(d.frames, d.frames[1:]):
        if von is not None and f < von:
            continue
        for n in slots:
            s = slot(n)
            if not d.value(f0, s + 4):
                continue
            a, b = d.value(f0, s + 0x40, 2, True), d.value(f, s + 0x40, 2, True)
            if b < a:
                out.append((f, n, a - b, b, d.value(f, COMBO) // 4 + 1))
    return out


def kanten(ein, taste, ab):
    """Frames ab 'ab', in denen 'taste' neu gedrueckt ist."""
    out = []
    for f in sorted(ein):
        if f >= ab and taste in ein[f] and taste not in ein.get(f - 1, ()):
            out.append(f)
    return out


TASTEN = {"l": "P1 Left", "r": "P1 Right", "u": "P1 Up", "d": "P1 Down",
          "a": "P1 Button 1", "j": "P1 Button 2"}


def cmd_nachlauf(args):
    """Je Lauf von rest_kette.lua: Treffer der letzten Stufe, Phasenwechsel der
    Figur, Ende der Aktion (Ruhe) und die Wirkung jeder Folgeeingabe nach D.
    Angriff angenommen: Animationszeiger wechselt in F+1 auf den Beginn eines
    Schlags (Startbilder aus den Kettendruecken desselben Laufs bzw. --start);
    Sprung angenommen: Aktion 0x0A in F+1; Richtung: erste Aenderung von x bzw.
    Tiefe nach Beginn des Haltens."""
    start = {int(a, 16): int(k) for a, k in (s.split("=") for s in args.start.split(","))}
    print("lauf,stufe,D,treffer_rel,schaden,treffer2_rel,phasen_rel,aktion_bis_rel,ruhe_rel,"
          "eingabe,ein_rel,wirkung,wirkung_rel,anim_neu,stufe_neu,x_ab_rel,z_ab_rel")
    for prefix in args.prefix:
        d, m, ein = Dump(prefix), meta(prefix), inputs(prefix)
        name = Path(prefix).name
        D, stufe = int(m["D"]), int(m["stufe"])
        dr = [int(x) for x in m["druecke"].split(",")]
        st = dict(start)
        for k, p in enumerate(dr, 1):
            if p + 1 in d.offsets:
                st.setdefault(d.value(p + 1, ANIM, 4) & 0xFFFFFF, k)
        tr = [t for t in treffer(d) if t[0] > D]
        t1 = tr[0] if tr else None
        t2 = tr[1] if len(tr) > 1 else None
        last = d.frames[-1]
        ph, prev = [], None
        for f in range(D + 1, last + 1):
            p = d.value(f, PHASE, 2)
            if p != prev:
                ph.append(f"{f - D}:{p}")
            prev = p
        akt_bis = next((f - 1 for f in range(D + 2, last + 1) if d.value(f, ACT, 2) != 0x10), None)
        ruhe = next((f for f in range(D + 2, last + 1) if d.value(f, ACT, 2) == 0), None)
        basis = (f"{name},{stufe},{D},{t1[0] - D if t1 else '-'},{t1[2] if t1 else '-'},"
                 f"{t2[0] - D if t2 else '-'},{' '.join(ph)},"
                 f"{akt_bis - D if akt_bis else '-'},{ruhe - D if ruhe else '-'}")
        zeilen = 0
        # Folgeeingaben: Angriff und Sprung als Kanten nach D+1, Richtungen als Halten
        for t in ("a", "j"):
            for F in kanten(ein, TASTEN[t], D + 2):
                if F + 1 not in d.offsets:
                    continue
                def beginn(g):
                    if t == "a":
                        a0, a1 = d.value(g - 1, ANIM, 4) & 0xFFFFFF, d.value(g, ANIM, 4) & 0xFFFFFF
                        return a1 != a0 and a1 in st
                    return d.value(g, ACT, 2) == 0x0A and d.value(g - 1, ACT, 2) != 0x0A
                ok = beginn(F + 1)
                a1 = d.value(F + 1, ANIM, 4) & 0xFFFFFF
                if t == "a":
                    w, neu, sn = ("neuer Schlag" if ok else "-"), f"{a1:06X}", st.get(a1, "")
                else:
                    w, neu, sn = ("Sprung" if ok else "-"), "", ""
                # verworfen oder gepuffert? spaeterer Beginn ohne weiteren Druck
                sp = "" if ok else next((g for g in range(F + 2, last + 1) if beginn(g)), None)
                if not ok:
                    w = f"spaeter D+{sp - D}" if sp else "verworfen"
                print(f"{basis},{t},{F - D},{w},{F + 1 - D if ok else '-'},{neu},{sn},,")
                zeilen += 1
        for t in ("l", "r", "u", "d"):
            hold = [f for f in sorted(ein) if f > D + 1 and TASTEN[t] in ein[f]]
            if not hold:
                continue
            h0 = hold[0]
            xab = next((f for f in range(h0, last + 1) if d.value(f, X, 2) != d.value(f - 1, X, 2)
                        or d.value(f, X + 2, 2) != d.value(f - 1, X + 2, 2)), None)
            zab = next((f for f in range(h0, last + 1) if d.value(f, Z, 4) != d.value(f - 1, Z, 4)), None)
            print(f"{basis},{t},{h0 - D},halten,,,,{xab - D if xab else '-'},{zab - D if zab else '-'}")
            zeilen += 1
        if not zeilen:
            print(f"{basis},-,,,,,,,")


def umgeworfen(d, s, f, n=12):
    """Gegner nach dem Treffer in f umgeworfen (Aktion 0x0C oder S+4 = 2 binnen n Frames)?"""
    for g in range(f, min(f + n, d.frames[-1]) + 1):
        if d.value(g, s + 0x0A, 2) == 0x0C or d.value(g, s + 4) == 2:
            return True
    return False


def cmd_sprung(args):
    """Je Lauf von rest_sprung.lua: Variante, Probeframe T (Gegner nur dort in
    Reichweite) mit Hoehe der Figur, dx und dz in T, erster Treffer auf den
    Gegnerslot (Frame relativ zu A, Hoehe, dx, dz, Schaden, Umwerfen), Ende der
    Sprungaktion und erster Frame mit Aktion 0. Hoehe = ganzzahliges Hoehenwort
    P+0x12 am Frame-Ende (wie messen_a5.py sprungangriff; Standhoehe 0,25)."""
    print("lauf,variante,J,A,T_rel,h_T,dx_T,dz_T,blick_T,treffer_rel,schaden,h_treffer,dx_treffer,"
          "dz_treffer,umgeworfen,aktion0e_bis_rel,aufsetzen_rel,stand_rel")
    for prefix in args.prefix:
        d, m = Dump(prefix), meta(prefix)
        name = Path(prefix).name
        J, A, n = int(m["J"]), int(m["A"]), int(m["slot"])
        s = slot(n)
        var = {"u": "hoch", "l": "richtung", "r": "richtung", "p1_up": "hoch"}.get(m["dir"], "neutral")
        if m["adir"] in ("d", "p1_down"):
            var = "runter" if var == "neutral" else var + "+runter"
        T = None
        if m.get("nah_bis", "-") != "-":
            T = int(m["nah_bis"])
        last = d.frames[-1]

        def lage(f):
            return (d.value(f, s + 0x0E, 2) - d.value(f, X, 2), d.value(f, s + 0x16, 2) - d.value(f, Z, 2))

        tr = [t for t in treffer(d, [n]) if t[0] > A]
        e0e = next((f - 1 for f in range(A + 2, last + 1) if d.value(f, ACT, 2) != 0x0E), None)
        luft = next((f for f in range(J + 1, last + 1) if d.value(f, H, 2, True) > 0), None)
        auf = next((f for f in range(luft, last + 1) if d.value(f, H, 2, True) <= 0), None) if luft else None
        stand = next((f for f in range(J + 2, last + 1) if d.value(f, ACT, 2) == 0), None)
        tcols = "-,-,-,-,-"
        if T and T in d.offsets:
            dx, dz = lage(T)
            tcols = (f"{T - A},{d.value(T, H, 2, True)},{dx},{dz},"
                     f"{'r' if d.value(T, s + 0x5E) & 0x20 else 'l'}")
        if tr:
            f = tr[0][0]
            dx, dz = lage(f)
            hcols = (f"{f - A},{tr[0][2]},{d.value(f, H, 2, True)},{dx},{dz},"
                     f"{'ja' if umgeworfen(d, s, f) else 'nein'}")
        else:
            hcols = "-,-,-,-,-,-"
        print(f"{name},{var},{J},{A},{tcols},{hcols},{e0e - A if e0e else '-'},"
              f"{auf - J if auf else '-'},{stand - J if stand else '-'}")


LEBEN = 0xFFAA7C      # Leben von Spieler 1 (P+0xEC): 2 beim Start (DIP "Lives" = 2)
TYP = {0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK", 0x46DA4: "DOLG"}
PTR = P + 0x82         # Zeiger auf den Angreifer im Frame des LP-Verlusts


def angreifer(d, f):
    """Slot, Attribut und Schadenswert des Angreifers im Frame f (Zeiger P+0x82)."""
    a = 0xFF0000 + d.value(f, PTR, 2) - 4
    if (a - SB) % SS or not 0 <= (a - SB) // SS < 60:
        return None, 0, 0
    n = (a - SB) // SS
    return n, d.value(f, slot(n) + 0x24, 2), d.value(f, slot(n) + 0x8B)


def cmd_tod(args):
    """Je Tod der Figur (LP unter 0 in t): Angreifer, Ablauf der Todesaktion,
    Neueinstieg (LP 72, Leben FFAA7C, Rang aus der Watch-CSV), Erscheinen (Lage,
    Kamera), Landung L, erster Stand, Schutz (Status 3, Timer FFAA69), Treffer
    auf Gegner in L, erste Wirkung der Eingaben, Gegnerangriffe im Schutz und
    erster LP-Verlust danach. Frames relativ zu t bzw. L."""
    print("lauf,t,lp_t,angreifer,attr,schaden,aktionen_rel_t,neu_rel_t,leben,rang_vorher,rang_nachher,"
          "rang_wechsel_rel_t,erscheinen_rel_t,x,z,h,kamera_x,kamera_y,x_minus_kx,z_minus_ky,blick,"
          "landung_rel_t,landung_rel_erscheinen,hoehe_L,stand_rel_t,status3_bis_rel_L,t69_start,t69_null_rel_L,gegner_in_L,"
          "eingabe_ab_rel_L,wirkung_rel_L,gegnerangriffe_im_schutz,naechster_lp_verlust_rel_L,"
          "gegneraktionen_bis_erscheinen,gegnerangriffe_bis_erscheinen")
    for prefix in args.prefix:
        d, w, ein = Dump(prefix), watch(prefix), inputs(prefix)
        name = Path(prefix).name
        fr = d.frames
        last = fr[-1]
        for f0, t in zip(fr, fr[1:]):
            if not (d.value(f0, HP, 2, True) >= 0 > d.value(t, HP, 2, True)):
                continue
            n, at, sw = angreifer(d, t)
            akt, prev = [], None
            lw = next((f for f in range(t + 1, last + 1) if d.value(f, LEBEN) != d.value(f - 1, LEBEN)), None)
            neu = next((f for f in range(t + 1, min(t + 400, last + 1)) if d.value(f, HP, 2, True) == 72), None)
            for f in range(t, (neu or min(last, t + 200)) + 1):
                a = d.value(f, ACT, 2)
                if a != prev:
                    akt.append(f"{f - t}:{a:x}")
                prev = a
            if neu is None:
                rw = next((f for f in range(t + 1, last + 1) if f in w and f - 1 in w
                           and int(w[f]["rang"]) < int(w[f - 1]["rang"])), None)
                print(f"{name},{t},{d.value(t, HP, 2, True)},{n},{at:04X},{sw},{' '.join(akt)},"
                      f"kein Neueinstieg,{d.value(lw - 1, LEBEN) if lw else '-'}->{d.value(lw, LEBEN) if lw else '-'}"
                      f" in t+{lw - t if lw else '-'},"
                      f"{w[rw - 1]['rang'] if rw else '-'},{w[rw]['rang'] if rw else '-'},{rw - t if rw else '-'}"
                      + ",-" * 23)
                continue
            # Rang im Frame vor dem Neueinstieg und im Neueinstieg selbst; Wechsel
            # in der Naehe des Neueinstiegs (der 600er-Takt kann dazwischen liegen)
            rv = int(w[neu - 1]["rang"]) if neu - 1 in w else "-"
            rn = int(w[neu]["rang"]) if neu in w else "-"
            rw = next((f for f in range(neu - 2, min(neu + 3, last + 1)) if f in w and f - 1 in w
                       and int(w[f]["rang"]) < int(w[f - 1]["rang"])), None)
            er = next((f for f in range(neu, last + 1) if d.value(f, H, 2, True) > 100), None)
            # Landung L: erster Frame der Landephase (Aktion 0x0A, Unterphase 2) nach dem Erscheinen;
            # auf einem Oelfass liegt sie in Hoehe 48, sonst am Boden
            lnd = next((f for f in range(er or neu, last + 1)
                        if d.value(f, ACT, 2) == 0x0A and d.value(f, PHASE, 2) == 2), None) if er else None
            stand = next((f for f in range(lnd, last + 1) if d.value(f, ACT, 2) != 0x0A), None) if lnd else None
            s3 = next((f - 1 for f in range(er or neu, last + 1) if d.value(f, STATE) != 3), None)
            t69 = d.value(lnd, T_UP) if lnd else "-"
            t0 = next((f for f in range(lnd, last + 1) if d.value(f, T_UP) == 0), None) if lnd else None
            ec = "-"
            if er:
                kx, ky = int(w[er]["kamera_x"]), int(w[er]["kamera_y"])
                x, z = d.value(er, X, 2), d.value(er, Z, 2)
                ec = (f"{er - t},{x},{z},{d.value(er, H, 2, True)},{kx},{ky},{x - kx},{z - ky},"
                      f"{'r' if d.value(er, FACE) & 0x20 else 'l'}")
            # Gegner, die in L LP verlieren
            gl = []
            if lnd:
                for k in range(20):
                    s = slot(k)
                    a, b = d.value(lnd - 1, s + 0x40, 2, True), d.value(lnd, s + 0x40, 2, True)
                    if d.value(lnd - 1, s + 4) and b < a:
                        gl.append(f"{k}:{TYP.get(d.value(lnd, s + 0x38, 4), hex(d.value(lnd, s + 0x38, 4)))}"
                                  f":-{a - b}:dx{d.value(lnd, s + 0x0E, 2) - d.value(lnd, X, 2)}"
                                  f":dz{d.value(lnd, s + 0x16, 2) - d.value(lnd, Z, 2)}"
                                  f":{'um' if umgeworfen(d, s, lnd) else 'steht'}")
                    elif d.value(lnd - 1, s + 4) and d.value(lnd - 1, s + 5):
                        gl.append(f"{k}:sichtbar_ohne_Treffer")
            # erste Eingabe nach t und erste Wirkung (Bewegung oder neue Aktion)
            e0 = next((f for f in range(t + 1, last + 1) if ein.get(f)), None)
            wk = None
            if e0 and lnd:
                for f in range(max(e0, lnd + 1), last + 1):
                    a0, a1 = d.value(f - 1, ACT, 2), d.value(f, ACT, 2)
                    if (d.value(f, X, 4) != d.value(f - 1, X, 4) or d.value(f, Z, 4) != d.value(f - 1, Z, 4)
                            or (a0 == 0 and a1 != 0)
                            or (a0 == 0x0A and a1 not in (0, 0x0A))
                            or (a1 == 0x0A and d.value(f, PHASE, 2) == 0
                                and d.value(f - 1, PHASE, 2) == 2)):
                        wk = f
                        break
            def aktiv(f, k):
                s = slot(k)
                att = d.value(f, s + 0x24, 2)
                return bool(d.value(f, s + 4) and att & 0xC000 and att >> 8 != 0xFF)

            # Beginn aktiver Gegnerangriffe im Schutz (Figur in Reichweite: |dx| <= 80, |dz| <= 12)
            ga = []
            if lnd and s3:
                for f in range(er + 1, s3 + 1):
                    for k in range(20):
                        s = slot(k)
                        if aktiv(f, k) and not aktiv(f - 1, k) and \
                                abs(d.value(f, s + 0x0E, 2) - d.value(f, X, 2)) <= 80 and \
                                abs(d.value(f, s + 0x16, 2) - d.value(f, Z, 2)) <= 12:
                            ga.append(f"L{f - lnd:+d}:S{k}")
            ga = " ".join(ga) or "-"
            # Gegner zwischen t und dem Erscheinen: aktive Angriffe, Aktionen
            gw, ga_tod = set(), []
            for f in range(t + 1, (er or neu) + 1):
                for k in range(20):
                    s = slot(k)
                    if d.value(f, s + 4) and d.value(f, s + 5):
                        gw.add(f"{d.value(f, s + 0x0A, 2):x}")
                        if aktiv(f, k) and not aktiv(f - 1, k):
                            ga_tod.append(f"t+{f - t}:S{k}")
            ga_tod = " ".join(ga_tod) or "-"
            nl = next((f for f in range((er or neu) + 1, last + 1)
                       if d.value(f, HP, 2, True) < d.value(f - 1, HP, 2, True)), None)
            print(f"{name},{t},{d.value(t, HP, 2, True)},{n},{at:04X},{sw},{' '.join(akt)},{neu - t},"
                  f"{d.value(neu - 1, LEBEN)}->{d.value(neu, LEBEN)},{rv},{rn},{rw - t if rw else '-'},{ec},"
                  f"{lnd - t if lnd else '-'},{lnd - er if lnd and er else '-'},"
                  f"{d.value(lnd, H, 2, True) if lnd else '-'},"
                  f"{stand - t if stand else '-'},{s3 - lnd if s3 and lnd else '-'},"
                  f"{t69},{t0 - lnd if t0 else '-'},{' '.join(gl) or '-'},"
                  f"{e0 - lnd if e0 and lnd else '-'},{wk - lnd if wk and lnd else '-'},{ga},"
                  f"{nl - lnd if nl and lnd else '-'},{'/'.join(sorted(gw)) or '-'},{ga_tod}")


def gruppe_von(name):
    """Gruppe eines Laufnamens: alles vor dem letzten '_'."""
    return name.rsplit("_", 1)[0]


def cmd_nachlauf_zusammenfassung(args):
    """Fasst die Ausgabe von 'nachlauf' je Gruppe (Laufname ohne letzten Teil)
    zusammen: Treffer, Ruhe ohne Eingabe, fruehester angenommener Angriffs- und
    Sprungdruck (mit Pruefung, dass alle spaeteren angenommen und alle frueheren
    verworfen werden) und die erste Bewegung beim Halten einer Richtung."""
    rows = list(csv.DictReader(open(args.csv)))
    grp = {}
    for r in rows:
        grp.setdefault(gruppe_von(r["lauf"]), []).append(r)
    print("gruppe,stufe,D,treffer_rel_D,schaden,treffer2_rel_D,h,aktion_bis_rel_D,ruhe_rel_D,"
          "angriff_ab_rel_D,angriff_wirkung_rel_D,neue_stufe,angriff_regel,sprung_ab_rel_D,"
          "sprung_wirkung_rel_D,sprung_regel,links_x_ab_rel_D,rechts_x_ab_rel_D,hoch_z_ab_rel_D,"
          "laeufe")
    for g, rs in grp.items():
        o = next((r for r in rs if r["lauf"].endswith("_o")), rs[0])
        h = int(o["treffer2_rel"]) if o["treffer2_rel"] != "-" else (
            int(o["treffer_rel"]) if o["treffer_rel"] != "-" else None)
        out = [g, o["stufe"], o["D"], o["treffer_rel"], o["schaden"], o["treffer2_rel"],
               f"D+{h}" if h is not None else "-", o["aktion_bis_rel"], o["ruhe_rel"]]
        for t in ("a", "j"):
            sw = sorted(((int(r["ein_rel"]), r) for r in rs if r["eingabe"] == t), key=lambda x: x[0])
            ok = [F for F, r in sw if r["wirkung_rel"] != "-"]
            if not sw:
                out += ["-", "-", "-", "-"] if t == "a" else ["-", "-", "-"]
                continue
            fmin = min(ok) if ok else None
            regel = "-"
            if fmin is not None:
                vor = [r for F, r in sw if F < fmin]
                nach = [F for F, r in sw if F >= fmin]
                gut = all(F in ok for F in nach)
                puffer = [r["wirkung"] for r in vor if r["wirkung"].startswith("spaeter")]
                regel = (f"D+{sw[0][0]}..D+{fmin - 1} " + ("gepuffert" if puffer else "verworfen")
                         if vor else "keine frueheren Drucke") + \
                        (f"; D+{fmin}..D+{sw[-1][0]} alle angenommen" if gut else "; Luecken")
            wr = next((r for F, r in sw if F == fmin), None)
            out += [f"{fmin}" if fmin is not None else "-",
                    wr["wirkung_rel"] if wr else "-"]
            if t == "a":
                out.append(wr["stufe_neu"] if wr else "-")
            out.append(regel)
        for t, col in (("l", "x_ab_rel"), ("r", "x_ab_rel"), ("u", "z_ab_rel")):
            r = next((r for r in rs if r["eingabe"] == t), None)
            out.append(r[col] if r else "-")
        out.append(str(len({r["lauf"] for r in rs})))
        print(",".join(str(x) for x in out))


def cmd_sprung_zusammenfassung(args):
    """Fasst die Ausgabe von 'sprung' je Gruppe zusammen. Gruppen mit
    Laufnamen *_f<T>: aktive Frames (Treffer je T relativ zu A mit Hoehe);
    *_x<k>_<dx>: Reichweite x; *_z<k>_<dz>: Tiefe. Zusaetzlich Schaden und
    Umwerfen aller Treffer der Gruppe."""
    rows = list(csv.DictReader(open(args.csv)))
    grp = {}
    for r in rows:
        grp.setdefault(gruppe_von(r["lauf"]), []).append(r)
    print("gruppe,variante,J,A,art,ergebnis,schaden,umgeworfen")
    for g, rs in grp.items():
        letzt = rs[0]["lauf"].rsplit("_", 1)[1]
        hit = [r for r in rs if r["treffer_rel"] != "-"]
        dm = "/".join(sorted({r["schaden"] for r in hit})) or "-"
        um = "/".join(sorted({r["umgeworfen"] for r in hit})) or "-"
        if letzt.startswith("f"):
            ja = [f"A+{r['T_rel']}(h{r['h_T']})" for r in sorted(rs, key=lambda r: int(r["T_rel"]))
                  if r["treffer_rel"] == r["T_rel"]]
            nein = [f"A+{r['T_rel']}(h{r['h_T']})" for r in sorted(rs, key=lambda r: int(r["T_rel"]))
                    if r["treffer_rel"] != r["T_rel"]]
            erg = f"Treffer in {' '.join(ja) or '-'}; kein Treffer in {' '.join(nein) or '-'}"
            art = "fenster"
        else:
            key = "dx_T" if g.split("_")[-1].startswith("x") else "dz_T"
            vals = sorted(((int(r[key]), r["treffer_rel"] == r["T_rel"], r) for r in rs if r[key] != "-"),
                          key=lambda x: x[0])
            ja = [v for v, ok, _ in vals if ok]
            nein = [v for v, ok, _ in vals if not ok]
            hT = sorted({r["h_T"] for r in rs})
            art = ("x" if key == "dx_T" else "tiefe") + f" (T=A+{rs[0]['T_rel']}, h {'/'.join(hT)})"
            erg = f"Treffer bei {' '.join(map(str, ja)) or '-'}; kein Treffer bei {' '.join(map(str, nein)) or '-'}"
        print(f"{g},{rs[0]['variante']},{rs[0]['J']},{rs[0]['A']},{art},{erg},{dm},{um}")


def cmd_nulllp(args):
    """Teil C: Gegner, dessen LP genau 0 erreichen. Je Lauf: Frame, in dem die
    LP auf 0 fallen (Schaden, Umwerfen), danach Zustand, Aktion, Freigabe des
    Slots, Angriffe auf die Figur (LP-Verluste der Figur mit Zeiger auf diesen
    Slot) und ein spaeterer Treffer unter 0 (Tod: S+4 = 2, Slot frei)."""
    print("lauf,slot,typ,null_frame,schaden,umgeworfen,lp_danach,frames_mit_0,status_folge,aktiv_ab,"
          "figur_lp_verluste_durch_ihn,tod_frame,lp_tod,slot_frei_rel_tod,laufende")
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        last = d.frames[-1]
        for n in range(20):
            s = slot(n)
            nf = next((f for f in d.frames[1:] if d.value(f - 1, s + 4) and d.value(f, s + 0x40, 2, True) == 0
                       and d.value(f - 1, s + 0x40, 2, True) > 0), None)
            if nf is None:
                continue
            dmg = d.value(nf - 1, s + 0x40, 2, True)
            tod = next((f for f in range(nf + 1, last + 1) if d.value(f, s + 0x40, 2, True) < 0), None)
            ende = (tod or last + 1) - 1
            z = sum(1 for f in range(nf, ende + 1) if d.value(f, s + 0x40, 2, True) == 0)
            folge, prev = [], None
            for f in range(nf, ende + 1):
                v = (d.value(f, s + 4), d.value(f, s + 0x0A, 2))
                if v != prev:
                    folge.append(f"{f - nf}:{v[0]}/{v[1]:x}")
                prev = v
            frei = next((f for f in range(nf, ende + 1) if d.value(f, s + 4) == 1), None)
            # LP-Verluste der Figur, deren Zeiger auf diesen Slot zeigt
            pl = []
            for f in range(nf + 1, ende + 1):
                if d.value(f, HP, 2, True) < d.value(f - 1, HP, 2, True):
                    k, _, _ = angreifer(d, f)
                    if k == n:
                        pl.append(f"{f - nf}:-{d.value(f - 1, HP, 2, True) - d.value(f, HP, 2, True)}")
            fr = "-"
            if tod:
                fr = next((f - tod for f in range(tod, last + 1) if d.value(f, s + 4) == 0), "-")
            print(f"{name},{n},{d.value(nf, s + 0x38, 4):#x},{nf},{dmg},{'ja' if umgeworfen(d, s, nf) else 'nein'},"
                  f"{d.value(min(nf + 1, last), s + 0x40, 2, True)},{z},{' '.join(folge[:12])},"
                  f"{frei - nf if frei else '-'},{' '.join(pl) or '-'},{tod or '-'},"
                  f"{d.value(tod, s + 0x40, 2, True) if tod else '-'},{fr},{last}")


def cmd_stagewechsel(args):
    """Teil E: Rang FFF82A beim Wechsel des Stage-Index FFA8CE aus Bot-Protokollen
    (bot.lua mit GFA_WATCH rang, rz) bzw. Watch-CSV von rest_frei.lua: Rang und
    Zaehler im Frame vor und im Frame des Wechsels, jeder Rangwechsel +-5 Frames."""
    print("lauf,frame,stage_vorher,stage_nachher,rang_vorher,rang_nachher,zaehler_vorher,zaehler_nachher,"
          "rangwechsel_in_der_naehe")
    for fn in args.csv:
        rows = list(csv.DictReader(open(fn)))
        name = Path(fn).name.replace("_bot.csv", "").replace("_watch.csv", "")
        rk = "rang" if "rang" in rows[0] else None
        zk = "rz" if "rz" in rows[0] else "rangzaehler"
        for a, b in zip(rows, rows[1:]):
            if a["stage"] != b["stage"]:
                fb = int(b["frame"])
                nahe = [f"{r['frame']}:{p[rk]}->{r[rk]}" for p, r in zip(rows, rows[1:])
                        if abs(int(r["frame"]) - fb) <= 5 and p[rk] != r[rk]]
                print(f"{name},{fb},{a['stage']},{b['stage']},{a[rk]},{b[rk]},{a[zk]},{b[zk]},"
                      f"{' '.join(nahe) or '-'}")


def cmd_probe(args):
    """Teil F (Reichweite, Mindestabstand): je Lauf von rest_kette.lua die Frames
    D+1 bis D+n (--bis) mit Abstand, Tiefe und Treffer der letzten Stufe; eine
    Zeile je Lauf mit erstem Treffer (Frame, dx, dz, Blick von Figur und Gegner)
    bzw. den Abstaenden ohne Treffer."""
    print("lauf,stufe,D,blick_figur,treffer_rel_D,schaden,stufe_ram,dx,dz,blick_gegner,dx_ohne_treffer")
    for prefix in args.prefix:
        d, m = Dump(prefix), meta(prefix)
        name = Path(prefix).name
        D, n = int(m["D"]), int(m["slot"])
        s = slot(n)
        ohne, hit = [], None
        for f in range(D + 1, min(D + args.bis, d.frames[-1]) + 1):
            dx = d.value(f, s + 0x0E, 2) - d.value(f, X, 2)
            dz = d.value(f, s + 0x16, 2) - d.value(f, Z, 2)
            dm = d.value(f - 1, s + 0x40, 2, True) - d.value(f, s + 0x40, 2, True)
            if dm > 0 and d.value(f - 1, s + 4):
                hit = (f, dm, dx, dz)
                break
            ohne.append(dx)
        bf = "r" if d.value(D, FACE) & 0x20 else "l"
        if hit:
            f, dm, dx, dz = hit
            print(f"{name},{m['stufe']},{D},{bf},{f - D},{dm},{d.value(f, COMBO) // 4 + 1},{dx},{dz},"
                  f"{'r' if d.value(f, s + 0x5E) & 0x20 else 'l'},")
        else:
            print(f"{name},{m['stufe']},{D},{bf},-,-,-,-,-,-,{' '.join(map(str, sorted(set(ohne))))}")


def cmd_richtung(args):
    """Teil F (Richtung beim Kettendruck): je Lauf von rest_kette.lua mit
    CC_DRUCKDIR: Animation und Blick in D+1, Weg der Figur in x je Frame
    (D+1 bis D+8), Treffer der Stufe (Frame, Schaden, Kombostufe) und die
    Stufe eines Folgedrucks (Startbild)."""
    start = {0x0B2EC4: 1, 0x0B32B2: 2, 0x0B35DE: 3, 0x0B3EE8: 4, 0x0B39B0: 4}
    print("lauf,stufe,D,richtung,anim_D1,blick_D1,weg_x_D1_D8,treffer_rel_D,schaden,kombostufe,folgedruck_rel_D,"
          "folgestufe")
    for prefix in args.prefix:
        d, m, ein = Dump(prefix), meta(prefix), inputs(prefix)
        name = Path(prefix).name
        D, n = int(m["D"]), int(m["slot"])
        rich = kurz({e for e in ein.get(D, ()) if e != "P1 Button 1"}) or "-"
        x0 = fix(d, D, X)
        weg = " ".join(f"{fix(d, f, X) - x0:g}" for f in range(D + 1, D + 9))
        tr = [t for t in treffer(d, [n]) if t[0] > D]
        fd = kanten(ein, "P1 Button 1", D + 2)
        fs = "-"
        if fd and fd[0] + 1 in d.offsets:
            fs = start.get(d.value(fd[0] + 1, ANIM, 4) & 0xFFFFFF, "keine")
        print(f"{name},{m['stufe']},{D},{rich},{d.value(D + 1, ANIM, 4) & 0xFFFFFF:06X},"
              f"{'r' if d.value(D + 1, FACE) & 0x20 else 'l'},{weg},"
              f"{tr[0][0] - D if tr else '-'},{tr[0][2] if tr else '-'},{tr[0][4] if tr else '-'},"
              f"{fd[0] - D if fd else '-'},{fs}")


def cmd_gegentreffer(args):
    """Teil F (Treffer in der Luft, gleichzeitiger Treffer): je Lauf die aktiven
    Frames der Gegnerangriffe (Attribut S+0x24 mit 0x4000/0x8000), jeder
    LP-Verlust der Figur (Angreifer, Hoehe, Aktion, umgeworfen) und jeder
    LP-Verlust eines Gegners (Frame, Schaden)."""
    print("lauf,eingaben,gegner_aktiv_ab,figur_lp_verluste,gegner_lp_verluste")
    for prefix in args.prefix:
        d, ein = Dump(prefix), inputs(prefix)
        name = Path(prefix).name
        akt = []
        for n in range(20):
            s = slot(n)
            prev = False
            for f in d.frames:
                at = d.value(f, s + 0x24, 2)
                on = bool(d.value(f, s + 4) and at & 0xC000 and at >> 8 != 0xFF)
                if on and not prev:
                    akt.append(f"{f}(S{n})")
                prev = on
        pl = []
        for f0, f in zip(d.frames, d.frames[1:]):
            dm = d.value(f0, HP, 2, True) - d.value(f, HP, 2, True)
            if dm > 0:
                k, at, _ = angreifer(d, f)
                st = [d.value(g, STATE) for g in range(f, min(f + 4, d.frames[-1]) + 1)]
                pl.append(f"{f}:-{dm}:S{k}:h{d.value(f0, H, 2, True)}/{d.value(f, H, 2, True)}"
                          f":akt{d.value(f0, ACT, 2):x}:{'um' if 2 in st else 'steht'}")
        gl = [f"{f}:S{n}:-{dm}" for f, n, dm, _, _ in treffer(d)]
        e = " ".join(f"{kurz(v)}{f}" for f, v in sorted(ein.items()) if v and not ein.get(f - 1))
        print(f"{name},{e},{' '.join(akt) or '-'},{' '.join(pl) or '-'},{' '.join(gl) or '-'}")


ERWARTET = {"Klinge": (107,), "Wand": (108,), "Rollen": (151, 152), "normal": (120, 121)}


def cmd_todesart(args):
    """Dritte Messung D1: je Tod der Figur die Merkmale des toedlichen Treffers
    (Angreifer, Attribut, Klinge = Bit 0x8000, Reaktion = Aktion der Figur in t)
    und des Todesflugs (Weg in x bis t+39, Stopp vor t+40 an einer Begrenzung, die
    keine Bildkante ist; Bildkanten bei Bildschirm-x 24 und 360), Beginn von
    Aktion 8, Rollen (Aktion 4 in t+55), Neueinstieg relativ zu t, dazu die
    Klasse nach der Regel (Klinge 107, Wand 108, Rollen 151/152, normal 120/121)
    und ob der Neueinstieg dazu passt."""
    print("lauf,t,angreifer,typ,attr,klinge,reaktion_t,bild_x_t,flug_x,stopp_rel_t,stopp_bild_x,aktion8_ab,"
          "rollt,aktionen_rel_t,neueinstieg_rel_t,klasse,passt")
    for prefix in args.prefix:
        d, w = Dump(prefix), watch(prefix)
        name = Path(prefix).name
        fr = d.frames
        last = fr[-1]
        for f0, t in zip(fr, fr[1:]):
            if not (d.value(f0, HP, 2, True) >= 0 > d.value(t, HP, 2, True)) or t + 60 > last:
                continue
            k, at, _ = angreifer(d, t)
            typ = TYP.get(d.value(t, slot(k) + 0x38, 4), f"{d.value(t, slot(k) + 0x38, 4):x}") if k is not None else "-"
            reak = d.value(t, ACT, 2)

            def bx(f):
                return fix(d, f, X) - int(w[f]["kamera_x"])
            xs = [fix(d, f, X) for f in range(t, t + 40)]
            stopp = None
            bewegt = False
            for i in range(4, 40):
                if xs[i] != xs[i - 1]:
                    bewegt = True
                elif (bewegt or i == 4) and xs[i] == xs[i - 1]:
                    stopp = t + i - 1 if bewegt else t + 3
                    break
            rand = stopp is not None and (bx(stopp) <= 25 or bx(stopp) >= 359)
            a8 = next((f - t for f in range(t, t + 46) if d.value(f, ACT, 2) == 8), None)
            rollt = d.value(t + 55, ACT, 2) == 4 if t + 55 <= last else False
            akt, prev = [], None
            neu = next((f for f in range(t + 1, min(t + 300, last + 1)) if d.value(f, HP, 2, True) == 72), None)
            for f in range(t, (neu or min(last, t + 160)) + 1):
                a = d.value(f, ACT, 2)
                if a != prev:
                    akt.append(f"{f - t}:{a:x}")
                prev = a
            if at & 0x8000:
                kl = "Klinge"
            elif stopp is not None and not rand:
                kl = "Wand"
            elif reak == 4:
                kl = "Rollen"
            else:
                kl = "normal"
            passt = ("ja" if neu - t in ERWARTET[kl] else "nein") if neu else "kein Neueinstieg"
            print(f"{name},{t},{k},{typ},{at:04X},{'ja' if at & 0x8000 else 'nein'},{reak:x},{bx(t):g},"
                  f"{xs[39] - xs[0]:g},{stopp - t if stopp else '-'},"
                  f"{('Rand ' if rand else '') + format(bx(stopp), 'g') if stopp else '-'},"
                  f"{a8 if a8 is not None else '-'},{'ja' if rollt else 'nein'},{' '.join(akt)},"
                  f"{neu - t if neu else '-'},{kl},{passt}")
            break


def cmd_grenzen(args):
    """Fasst die Ausgabe von 'probe' je Gruppe (Laufname ohne letzten Teil)
    zusammen: Abstaende dx (Lage am Frame-Ende) mit und ohne Treffer."""
    rows = list(csv.DictReader(open(args.csv)))
    grp = {}
    for r in rows:
        grp.setdefault(gruppe_von(r["lauf"]), []).append(r)
    print("gruppe,stufe,treffer_bei_dx,kein_treffer_bei_dx,blick_gegner_bei_treffer")
    for g, rs in grp.items():
        ja = sorted(int(r["dx"]) for r in rs if r["treffer_rel_D"] != "-")
        nein = sorted({int(v) for r in rs if r["treffer_rel_D"] == "-" for v in r["dx_ohne_treffer"].split()})
        bl = "/".join(sorted({r["blick_gegner"] for r in rs if r["treffer_rel_D"] != "-"})) or "-"
        print(f"{g},{rs[0]['stufe']},{' '.join(map(str, ja)) or '-'},{' '.join(map(str, nein)) or '-'},{bl}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("nachlauf-zusammenfassung", help="Nachlauf je Gruppe: Ruhe, fruehester Angriff "
                       "und Sprung, erste Bewegung")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_nachlauf_zusammenfassung)
    p = sub.add_parser("sprung-zusammenfassung", help="Sprungangriff je Gruppe: aktive Frames, Reichweite, "
                       "Tiefe, Schaden")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_sprung_zusammenfassung)
    p = sub.add_parser("nulllp", help="Gegner mit genau 0 LP: Reaktion, Weiterleben, Tod beim naechsten Treffer")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_nulllp)
    p = sub.add_parser("stagewechsel", help="Rang beim Wechsel des Stage-Index (Bot- oder Watch-CSV)")
    p.add_argument("csv", nargs="+")
    p.set_defaults(fn=cmd_stagewechsel)
    p = sub.add_parser("probe", help="erster Treffer der letzten Kettenstufe mit Abstand und Blick")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--bis", type=int, default=8)
    p.set_defaults(fn=cmd_probe)
    p = sub.add_parser("richtung", help="Richtung beim Kettendruck: Weg, Treffer, Folgestufe")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_richtung)
    p = sub.add_parser("gegentreffer", help="aktive Gegnerangriffe und LP-Verluste von Figur und Gegnern")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_gegentreffer)
    p = sub.add_parser("todesart", help="dritte Messung D1: Merkmale des toedlichen Treffers und des Flugs, "
                       "Klasse nach der Regel, Neueinstieg")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_todesart)
    p = sub.add_parser("grenzen", help="dritte Messung F1: Ausgabe von probe je Gruppe als Grenzen in dx")
    p.add_argument("csv")
    p.set_defaults(fn=cmd_grenzen)
    p = sub.add_parser("tod", help="je Tod der Figur: Ablauf, Neueinstieg, Schutz, Rang, Gegner")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_tod)
    p = sub.add_parser("sprung", help="je Lauf von rest_sprung.lua: Probe, Treffer, Hoehe, Umwerfen")
    p.add_argument("prefix", nargs="+")
    p.set_defaults(fn=cmd_sprung)
    p = sub.add_parser("nachlauf", help="Nachlauf je Lauf von rest_kette.lua (Treffer, Phasen, Ruhe, "
                       "Wirkung der Folgeeingaben)")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--start", default="0B2EC4=1,0B32B2=2,0B35DE=3,0B3EE8=4,0B39B0=4",
                   help="Startbilder der Schlaege (Animationszeiger=Stufe)")
    p.set_defaults(fn=cmd_nachlauf)
    p = sub.add_parser("zeitachse", help="je Frame Figur und ein Gegner")
    p.add_argument("prefix")
    p.add_argument("--slot", type=int, default=18)
    p.add_argument("--von", type=int, default=0)
    p.add_argument("--bis", type=int, default=0)
    p.set_defaults(fn=cmd_zeitachse)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
