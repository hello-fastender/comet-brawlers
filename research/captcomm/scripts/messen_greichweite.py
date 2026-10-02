#!/usr/bin/env python3
"""Reichweite der Gegnerangriffe (Praefix greichweite; nur Standardbibliothek).

Wertet die Abzuege von scenarios/greichweite_angriff.lua aus (Bereich
0xFFA900 bis 0xFFEA00). Adressen siehe notes.md ("Gefundene Adressen").
Gegnerslot S = 0xFFBC90 + n*0xC0: S+4 Zustand, S+0x0A Aktion, S+0x0E/0x12/
0x16 x/Hoehe/Tiefe, S+0x1C Animationszeiger (Langwort), S+0x24
Trefferattribut, S+0x38 Typkennung, S+0x5E Blickrichtung (Bit 0x20 =
rechts), S+0x8B Schadenswert. Figur P = FFA990: P+0x40 LP, P+0x42 LP des
Vorframes, P+0x82 Zeiger auf den Angreifer.

Unterbefehle (auch ueber messen_a5.py gegnerangriff erreichbar):
  gegnerangriff PREFIX..  je Angriff eines Gegners gegen die Figur: Beginn der
                  Angriffsanimation, aktive Frames (S+0x24) je Schlag, Treffer,
                  Abstand, Umwerfen, Nachlauf bis zur Steh-/Gehanimation;
                  --zeitachse: je Frame Animation, S+0x24, Abstand, Treffer;
                  --start k:ANIM: nur der Angriff ab dem k-ten Wechsel auf ANIM
                  (auch abgebrochene Angriffe)
  gegnerzusammenfassung CSV..  fasst gegnerangriff-Ausgaben zusammen: je
                  Angriffsart (natuerliche Laeufe) Startup, aktive Frames,
                  Schaden, Umwerfen, Nachlauf; je Quelle (Proben mit Eingriff)
                  Grenzen in x, Tiefe, Hoehe und die treffenden Frames
"""

import argparse
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P1 = 0xFFA990
X, Z, H = P1 + 0x0E, P1 + 0x16, P1 + 0x12
STATE, HP = P1 + 0x04, P1 + 0x40
PTR_ANGREIFER = P1 + 0x82              # Wort: Slotadresse+4 des letzten Angreifers
SLOT_BASE, SLOT_SIZE = 0xFFBC90, 0xC0


TYPNAME = {0x5A97E: "WOOKY", 0x60CA0: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK", 0x46DA4: "DOLG"}
# Animationen je Gegnertyp (Animationszeiger S+0x1C, Langwort), beobachtet
# in den Laeufen greichweite_*. NEUTRAL: Kampfstand und Haltung; dazu kommt je
# Lauf automatisch jede Animation, die ein Gegner dieses Typs mindestens 3
# Frames mit Aktion S+0x0A = 0 (Gehen) oder 4 (Haltung) zeigt. WARTEN: Wartepose nach einem
# Angriff, aus der der Gegner in den Stand, ins Gehen oder direkt in den
# naechsten Angriff wechselt (Dauer vom Spiel gewaehlt).
NEUTRAL = {
    0x5A97E: {0x5ECAA, 0x5EC70, 0x5ECE2},          # WOOKY
    0x60CA0: {0x636D4, 0x6369A, 0x6370C},          # EDDY
    0x25086: {0x282F4, 0x284D8, 0x28510, 0x28548, 0x2857E},  # SKIP
}
WARTEN = {
    0x5A97E: {0x5FB18},
    0x60CA0: {0x644BC},
    0x25086: {0x2849E},
}


def attr_aktiv(at):
    """Trefferattribut S+0x24 aktiv: Bit 0x4000 oder 0x8000, aber nicht 0xFFxx."""
    return bool(at & 0xC000) and at >> 8 != 0xFF


class Slotlauf:
    """Animation, Typ und aktive Frames eines Slots in einem Lauf."""

    def __init__(self, d, s):
        self.d, self.s = d, s
        occ = [f for f in d.frames if d.value(f, s + 4)]
        self.typ = {f: d.value(f, s + 0x38, 4) for f in occ}
        self.anim = {f: d.value(f, s + 0x1C, 4) for f in occ}
        self.neutral = {}
        zahl = {}
        for f in occ:
            self.neutral.setdefault(self.typ[f], set(NEUTRAL.get(self.typ[f], ())))
            if d.value(f, s + 0x0A, 2) in (0, 4):
                k = (self.typ[f], self.anim[f])
                zahl[k] = zahl.get(k, 0) + 1
        # Gehen/Haltung: mindestens 3 Frames mit Aktion 0 oder 4 (ein einzelner
        # Frame kommt beim Abbruch eines Angriffs vor) und keine erste
        # Angriffsanimation
        for (typ, an), n in zahl.items():
            if n >= 3 and an not in ART:
                self.neutral[typ].add(an)
        self.aktiv = {f for f in occ if d.value(f, s + 4) == 1 and attr_aktiv(d.value(f, s + 0x24, 2))}

    def frei(self, g, typ):
        return g in self.typ and self.typ[g] == typ and self.d.value(g, self.s + 4) == 1

    def ende(self, a, typ):
        """Ende des Angriffs ab a: (e, grund, warten_ab)."""
        neu, wart = self.neutral[typ], WARTEN.get(typ, set())
        e, grund, w_ab = a, "laufende", None
        while e + 1 in self.d.offsets:
            e += 1
            if not self.frei(e, typ):
                grund = f"gegnerstatus {self.d.value(e, self.s + 4)}"
                break
            if self.anim[e] in neu:
                grund = f"stand/gehen {self.anim[e]:#x}"
                break
            if self.anim[e] in wart:
                w_ab = w_ab or e
            elif w_ab:
                grund = f"neuer angriff {self.anim[e]:#x}"
                break
        else:
            e += 1
        return e, grund, w_ab

    def angriffe(self):
        """Alle Angriffe mit aktiven Frames: Liste von (a, e, grund, warten_ab, typ)."""
        out, f_end = [], 0
        for f in self.d.frames:
            if f not in self.aktiv or f < f_end:
                continue
            typ = self.typ[f]
            neu, wart = self.neutral[typ], WARTEN.get(typ, set())
            a = f
            while (a - 1 >= f_end and self.frei(a - 1, typ) and self.anim[a - 1] not in neu
                   and self.anim[a - 1] not in wart):
                a -= 1
            e, grund, w_ab = self.ende(f, typ)
            out.append((a, e, grund, w_ab, typ))
            f_end = e
        return out

    def start(self, k, anim):
        """k-ter Frame, in dem der Animationszeiger auf anim wechselt."""
        n = 0
        for f in self.d.frames:
            if self.anim.get(f) == anim and self.anim.get(f - 1) != anim:
                n += 1
                if n == k:
                    return f
        return None


def cmd_gegnerangriff(args):
    """Je Angriff eines Gegners (Slots 0-19 bzw. --slot) gegen die Figur.
    Ein Angriff ist eine Folge von Frames ohne Steh-, Geh- und Wartepose
    (NEUTRAL, WARTEN), die mindestens einen Frame mit aktivem S+0x24 enthaelt.
    beginn = erster Frame dieser Folge (A), aktiv = Frames mit aktivem S+0x24
    relativ zu A (mehrere Bereiche = mehrere Schlaege, attr je Bereich),
    startup = erster aktiver Frame - A. treffer = erster Frame mit LP-Verlust
    der Figur (P+0x40 < Vorframe-LP P+0x42), in dem P+0x82 auf diesen Slot
    zeigt. dx = x(Gegner) - x(Figur), dz ebenso Tiefe, ganzzahlig am
    Frame-Ende; hoehe = Hoehe der Figur. *_aktiv: Spanne ueber die aktiven
    Frames, *_treffer: im Trefferframe, *_erst: im ersten aktiven Frame
    (erst_rel; bei abgebrochenen Angriffen im Frame des Abbruchs). attr_treffer
    = S+0x24 im Trefferframe. ziel =
    Wort S+0x96 in A (Zielabstand dx, den sich der Gegner beim Heranlaufen
    merkt; Fund der Gegenpruefung V3). nachlauf = Frames zwischen dem
    letzten aktiven Frame und dem ersten Frame mit Steh-/Gehanimation (ende);
    nachlauf_fest = Frames bis zur Wartepose. ende_grund: Stand/Gehen,
    naechster Angriff aus der Wartepose, Gegner getroffen (Status != 1) oder
    Laufende. --start k:ANIM wertet nur den Angriff aus, der mit dem k-ten
    Wechsel auf ANIM beginnt (wie CC_AB in greichweite_angriff.lua), auch
    wenn er ohne aktiven Frame abbricht (ende_grund "abgebrochen ...")."""
    if args.zeitachse:
        print("lauf,slot,typ,beginn,frame,rel,anim,aktion,attr,aktiv,dx,dz,figur_hoehe,gegner_hoehe,"
              "figur_status,lp_verlust,treffer")
    else:
        print("lauf,slot,typ,blick,figur_blick,beginn,anims,startup,aktiv,aktive_frames,attr,schadenswert,"
              "treffer,treffer_rel,schaden,dx_aktiv,dz_aktiv,hoehe_aktiv,dx_treffer,dz_treffer,"
              "hoehe_treffer,figur_status,umgeworfen,nachlauf_fest,nachlauf_ende,nachlauf,ende_grund,"
              "erst_rel,dx_erst,dz_erst,hoehe_erst,ziel,attr_treffer")
    slots = args.slot if args.slot else range(20)
    for prefix in args.prefix:
        d = Dump(prefix)
        name = Path(prefix).name
        fr = d.frames
        for n in slots:
            s = SLOT_BASE + n * SLOT_SIZE
            sl = Slotlauf(d, s)
            if args.start:
                k, an = args.start.split(":")
                a = sl.start(int(k), int(an, 16))
                if a is None:
                    continue
                typ = sl.typ[a]
                e, grund, w_ab = sl.ende(a, typ)
                liste = [(a, e, grund, w_ab, typ)]
            else:
                liste = sl.angriffe()
            ptr = (s + 4) & 0xFFFF
            for a, e, grund, w_ab, typ in liste:
                tn = TYPNAME.get(typ, hex(typ))
                akt = sorted(g for g in sl.aktiv if a <= g < e)
                bereiche = []
                for g in akt:
                    if bereiche and g == bereiche[-1][1] + 1:
                        bereiche[-1][1] = g
                    else:
                        bereiche.append([g, g])
                seq = []
                for g in range(a, e):
                    if g not in d.offsets:
                        break
                    an = d.value(g, s + 0x1C, 4)
                    if seq and seq[-1][0] == an:
                        seq[-1][1] += 1
                    else:
                        seq.append([an, 1])
                hit = next((g for g in range(a, e) if g in d.offsets
                            and d.value(g, HP, 2, True) < d.value(g, P1 + 0x42, 2, True)
                            and d.value(g, PTR_ANGREIFER, 2) == ptr), None)

                def lage(g):
                    return (d.value(g, s + 0x0E, 2) - d.value(g, X, 2), d.value(g, s + 0x16, 2) - d.value(g, Z, 2),
                            d.value(g, H, 2, True))

                def spanne(vals):
                    return f"{min(vals)}..{max(vals)}" if min(vals) != max(vals) else str(vals[0])

                def blick(g, b):
                    """Blickrichtung (Bit 0x20 von +0x5E, wie beim Spieler)."""
                    return "rechts" if d.value(g, b + 0x5E) & 0x20 else "links"

                if args.zeitachse:
                    for g in range(max(a - 1, fr[0]), min(e, fr[-1]) + 1):
                        dx, dz, h = lage(g)
                        lost = d.value(g, P1 + 0x42, 2, True) - d.value(g, HP, 2, True)
                        print(f"{name},{n},{tn},{a},{g},A{g - a:+d},{d.value(g, s + 0x1C, 4):#x},"
                              f"{d.value(g, s + 0x0A, 2):#x},{d.value(g, s + 0x24, 2):#06x},"
                              f"{'ja' if g in sl.aktiv else 'nein'},{dx},{dz},{h},{d.value(g, s + 0x12, 2, True)},"
                              f"{d.value(g, STATE)},{max(lost, 0)},{'ja' if g == hit else ''}")
                    continue
                fertig = grund != "laufende"
                if not akt:
                    # abgebrochen: Lage im letzten Frame vor dem Ende
                    g = min(e, fr[-1])
                    dx, dz, h = lage(g)
                    print(f"{name},{n},{tn},{blick(a, s)},{blick(min(e, fr[-1]), P1)},{a},"
                          f"{'/'.join(f'{k:x}:{m}' for k, m in seq)},,-,0,,{d.value(a, s + 0x8B)},-,,0,"
                          f"{dx},{dz},{h},,,,{d.value(g, STATE)},,,{e if fertig else '-'},,"
                          f"abgebrochen ({grund}),A+{g - a},{dx},{dz},{h},{d.value(a, s + 0x96, 2, True)},")
                    continue
                lg = [lage(g) for g in akt]
                if hit:
                    nach = [d.value(g, STATE) for g in (hit, hit + 1, hit + 2) if g in d.offsets]
                    down = "ja" if 2 in nach else "nein"
                    st_hit = d.value(hit - 1, STATE) if hit - 1 in d.offsets else ""
                else:
                    down = ""
                    st_hit = "/".join(sorted({str(d.value(g, STATE)) for g in akt}))
                th = lage(hit) if hit else ("", "", "")
                last = bereiche[-1][1]
                print(f"{name},{n},{tn},{blick(a, s)},{blick(akt[0], P1)},{a},"
                      f"{'/'.join(f'{k:x}:{m}' for k, m in seq)},{akt[0] - a},"
                      f"{' '.join(f'A+{b0 - a}..A+{b1 - a}' for b0, b1 in bereiche)},{len(akt)},"
                      f"{' '.join(f'{d.value(b0, s + 0x24, 2):#06x}' for b0, _ in bereiche)},"
                      f"{d.value(akt[0], s + 0x8B)},"
                      f"{hit or '-'},{('A+' + str(hit - a)) if hit else ''},"
                      f"{(d.value(hit, P1 + 0x42, 2, True) - d.value(hit, HP, 2, True)) if hit else 0},"
                      f"{spanne([x[0] for x in lg])},{spanne([x[1] for x in lg])},{spanne([x[2] for x in lg])},"
                      f"{th[0]},{th[1]},{th[2]},{st_hit},{down},"
                      f"{(w_ab - last - 1) if w_ab else ''},"
                      f"{e if fertig else '-'},{(e - last - 1) if fertig else ''},{grund},"
                      f"A+{akt[0] - a},{lg[0][0]},{lg[0][1]},{lg[0][2]},{d.value(a, s + 0x96, 2, True)},"
                      f"{(hex(d.value(hit, s + 0x24, 2)) if hit else '')}")


# Kurznamen der Angriffsarten (erste Animation des Angriffs), siehe Entwurf
# entwuerfe/greichweite.md
ART = {
    0x5FA54: "W-Schlag-A", 0x5FC18: "W-Schlag-B", 0x5FD24: "W-Schlag-C",
    0x5FB50: "W-Umwerf-A", 0x5FC8C: "W-Umwerf-B",
    0x643F8: "E-Schlag-A", 0x645BC: "E-Schlag-B", 0x644F4: "E-Umwerf", 0x64688: "E-Sprungtritt",
    0x287E0: "S-Messerstich", 0x28642: "S-Ausfallstich",
}


def _spanne(werte):
    w = sorted(set(werte))
    if not w:
        return "-"
    return str(w[0]) if len(w) == 1 else f"{w[0]}..{w[-1]}"


def cmd_zusammenfassung(args):
    """Zusammenfassung aus gegnerangriff-Ausgaben (CSV-Dateien). Laeufe mit
    Namen greichweite_<quelle>_<probe><wert> (Proben: nat, whiff, f = aktiver
    Frame, x, z, h, j = Sprung) werden je Quelle ausgewertet, alle anderen als
    natuerliche Laeufe je Angriffsart."""
    import csv
    import re
    zeilen = []
    for datei in args.csv:
        zeilen += list(csv.DictReader(open(datei)))
    probe_re = re.compile(r"^greichweite_([A-Za-z0-9]+)_(nat|whiff|f|x|z|h|j)(m?\d*)$")
    nat, proben = [], {}
    for r in zeilen:
        m = probe_re.match(r["lauf"])
        if m:
            q, art, wert = m.group(1), m.group(2), m.group(3).replace("m", "-")
            proben.setdefault(q, []).append((art, int(wert) if wert not in ("", "-") else None, r))
        else:
            nat.append(r)

    def art_von(r):
        a = int(r["anims"].split(":")[0], 16) if r["anims"] else 0
        name = ART.get(a, f"{r['typ']}-{a:x}")
        # SKIP: Variante, in der fast die ganze Animation mit 0x8C00 aktiv ist
        if r["attr"].startswith("0x8c00") and r["startup"] in ("0", "1"):
            name += "-Wirbel"
        return name

    def gruppe(r):
        """erste Messung: lang_*, dritte Messung: lang3_* (andere Ausgangslagen)."""
        n = r["lauf"]
        return "dritte" if n.startswith("greichweite_lang3_") else "erste" if n.startswith("greichweite_lang_") \
            else "andere"

    print("# Teil 1: natuerliche Angriffe (ohne Positionseingriff) je Messung und Angriffsart;")
    print("# erste = lang_* (kontakt, kontakt_b, ingame), dritte = lang3_* (anlauf, anlauf_b, anlauf_c,")
    print("# tiefe_b, laengere Laufzeit). nachlauf_*: nur Angriffe, die in Stand/Gehen enden")
    print("# Nachlauf nur fuer Angriffe mit voller aktiver Phase (haeufigster Bereich mit bzw. ohne")
    print("# Treffer) und vollem Rueckzug; verkuerzte stehen in nachlauf_sonst")
    print("messung,angriffsart,typ,anzahl,mit_treffer,startup,aktiv_ohne_treffer,aktiv_mit_treffer,attr,"
          "attr_treffer,schaden,umgeworfen,nachlauf_fest,nachlauf_mit_treffer,nachlauf_ohne_treffer,"
          "nachlauf_sonst,blick")
    gruppen = {}
    for r in nat:
        if r["aktiv"] in ("", "-"):
            continue
        gruppen.setdefault((gruppe(r), art_von(r)), []).append(r)
    for k in sorted(gruppen):
        g = gruppen[k]
        mit = [r for r in g if r["treffer"] not in ("-", "")]
        ohne = [r for r in g if r["treffer"] in ("-", "")]
        voll = set()
        for rs in (mit, ohne):
            if rs:
                voll.add(Counter(r["aktiv"] for r in rs).most_common(1)[0][0])

        def fest(rs):
            f = Counter(int(r["nachlauf_fest"]) for r in rs if r["nachlauf_fest"]).most_common(1)
            return f[0][0] if f else 0

        def fertig(rs, ganz=True):
            # voll: volle aktive Phase und mindestens der feste Rueckzug (mit bzw. ohne Treffer)
            fm, fo = fest(mit), fest(ohne)
            return [int(r["nachlauf"]) for r in rs if r["nachlauf"] and "stand/gehen" in r["ende_grund"]
                    and (r["aktiv"] in voll and int(r["nachlauf"]) >= (fm if r in mit else fo)) == ganz]
        print(f"{k[0]},{k[1]},{g[0]['typ']},{len(g)},{len(mit)},{_spanne([int(r['startup']) for r in g])},"
              f"{'/'.join(sorted({r['aktiv'] for r in ohne})) or '-'},"
              f"{'/'.join(sorted({r['aktiv'] for r in mit})) or '-'},"
              f"{'/'.join(sorted({r['attr'] for r in g}))},"
              f"{'/'.join(sorted({r['attr_treffer'] for r in mit})) or '-'},"
              f"{_spanne([int(r['schaden']) for r in mit])},"
              f"{'/'.join(sorted({r['umgeworfen'] for r in mit})) or '-'},"
              f"{_spanne([int(r['nachlauf_fest']) for r in g if r['nachlauf_fest']])},"
              f"{_spanne(fertig(mit))},{_spanne(fertig(ohne))},"
              f"{' '.join(map(str, sorted(fertig(g, False)))) or '-'},{'/'.join(sorted({r['blick'] for r in g}))}")

    print("# Teil 1b: Folge der Angriffe je Gegner (natuerliche Laeufe); * = Figur umgeworfen,")
    print("# (-) = ohne Treffer (Figur geschuetzt oder am Boden)")
    print("lauf,slot,typ,folge")
    folgen = {}
    for r in nat:
        if r["aktiv"] in ("", "-"):
            continue
        folgen.setdefault((r["lauf"], r["slot"], r["typ"]), []).append(r)
    for k in folgen:
        folgen[k].sort(key=lambda r: int(r["beginn"]))
    for (lauf, slot, typ), rs in sorted(folgen.items()):
        teile = []
        for r in rs:
            t = art_von(r).split("-", 1)[1]
            if r["treffer"] in ("-", ""):
                t += "(-)"
            elif r["umgeworfen"] == "ja":
                t += "*"
            teile.append(t)
        print(f"{lauf},{slot},{typ},{' '.join(teile)}")

    print("# Teil 1c: Serien je Messung und Gegnertyp. normale_vor_umwerf = Zahl der normalen Angriffe")
    print("# vor jedem Umwerfangriff (seit dem vorigen Umwerfangriff bzw. seit Laufbeginn); anfaenge =")
    print("# die ersten drei Angriffe nach jedem Umwerfangriff; umwerf_b_nach_a = W-Umwerf-B direkt aus")
    print("# der Wartepose nach W-Schlag-A (Anzahl/alle); messerstich_abstand = Frames zwischen zwei")
    print("# Messerstich-Beginnen ohne Stand dazwischen (37) bzw. mit Zwischenschritt 282f4")
    print("messung,typ,umwerfangriffe,normale_vor_umwerf,anfaenge,umwerf_b_nach_a,messerstich_abstand")
    umwerf = {"W-Umwerf-A", "W-Umwerf-B", "E-Umwerf", "E-Sprungtritt", "S-Ausfallstich", "S-Ausfallstich-Wirbel"}
    stat = {}
    for (lauf, slot, typ), rs in sorted(folgen.items()):
        st = stat.setdefault((gruppe(rs[0]), typ), {"n": [], "anf": [], "ub": [0, 0], "ms": []})
        zahl, nach = 0, []
        for i, r in enumerate(rs):
            art = art_von(r)
            if art in umwerf:
                st["n"].append(zahl)
                zahl = 0
                nach.append(i + 1)
            else:
                zahl += 1
            if art == "W-Umwerf-B":
                st["ub"][1] += 1
                if i > 0 and art_von(rs[i - 1]) == "W-Schlag-A" and rs[i - 1]["ende_grund"].startswith("neuer"):
                    st["ub"][0] += 1
            if art.startswith("S-Messerstich") and i > 0 and art_von(rs[i - 1]).startswith("S-Messerstich"):
                ab = int(r["beginn"]) - int(rs[i - 1]["beginn"])
                if ab <= 60:
                    st["ms"].append(f"{ab}({'direkt' if rs[i - 1]['ende_grund'].startswith('neuer') else '282f4'})")
        for i in nach:
            if i < len(rs):
                st["anf"].append("+".join(art_von(r).split("-", 1)[1] for r in rs[i:i + 3]))
    for (grp, typ), st in sorted(stat.items()):
        anf = Counter(st["anf"])
        print(f"{grp},{typ},{len(st['n'])},{_spanne(st['n'])} ({' '.join(map(str, st['n']))}),"
              f"{' '.join(f'{k}:{v}' for k, v in anf.most_common())},"
              f"{st['ub'][0]}/{st['ub'][1]},{' '.join(sorted(set(st['ms']))) or '-'}")

    print("# Teil 2: Proben je Quelle (EINGRIFF ab dem ersten aktiven Frame; Ergebnis im ersten")
    print("# aktiven Frame: T = Treffer, spaeter = Treffer erst in einem spaeteren aktiven Frame,")
    print("# leer (Bereich) = aktiv in diesem Bereich, ohne Treffer; abbruch A+k = Gegner bricht")
    print("# in A+k ab und geht)")
    print("# ziel: Wort S+0x96 in A und Abbruchfenster [ziel-31, ziel+32] (Regel aus der Gegenpruefung V3)")
    print("quelle,angriffsart,blick_gegner,blick_figur,probe,werte")
    for q in sorted(proben):
        ps = proben[q]
        nat_r = next((r for art, _, r in ps if art == "nat"), ps[0][2])
        kopf = f"{q},{art_von(nat_r)},{nat_r['blick']},{nat_r['figur_blick']}"
        ziel = int(nat_r["ziel"])
        if nat_r["typ"] in ("WOOKY", "EDDY") and art_von(nat_r) != "E-Sprungtritt":
            # Regel (Gegenpruefung V3): Abbruch, sobald dx [ziel-31, ziel+32] verlaesst
            ok, alle = 0, 0
            for a, _, r in ps:
                if a != "x":
                    continue
                dx = int(r["dx_erst"])
                drin = ziel - 31 <= dx <= ziel + 32
                alle += 1
                ok += (r["aktiv"] == "-") != drin
            if alle:
                print(f"{kopf},ziel,S+0x96 = {ziel} Fenster {ziel - 31} bis {ziel + 32}: "
                      f"x-Proben passen {ok} von {alle}")

        def erg(r):
            if r["aktiv"] == "-":
                return f"abbruch {r['erst_rel']}"
            if r["treffer_rel"] == "":
                return f"leer ({r['aktiv']})"
            return "T" if r["treffer_rel"] == r["erst_rel"] else f"spaeter {r['treffer_rel']}"
        for art, feld in (("x", "dx_erst"), ("z", "dz_erst"), ("h", "hoehe_erst")):
            rs = sorted(((int(r[feld]), erg(r), r) for a, _, r in ps if a == art), key=lambda t: t[0])
            if rs:
                print(f"{kopf},{art},{' '.join(f'{v}:{e}' for v, e, _ in rs)}")
        fs = sorted(((w, r) for a, w, r in ps if a == "f"), key=lambda t: t[0])
        if fs:
            print(f"{kopf},aktiv,{' '.join(f'fern bis A+{w}:' + (r['treffer_rel'] or 'kein') for w, r in fs)}")
        for a, w, r in ps:
            if a in ("nat", "whiff"):
                print(f"{kopf},{a},aktiv {r['aktiv']} treffer {r['treffer_rel'] or '-'} schaden {r['schaden']} "
                      f"umgeworfen {r['umgeworfen'] or '-'} nachlauf_fest {r['nachlauf_fest'] or '-'} "
                      f"nachlauf {r['nachlauf'] or '-'} ({r['ende_grund']})")
        js = sorted(((w, r) for a, w, r in ps if a == "j"), key=lambda t: t[0])
        if js:
            print(f"{kopf},sprung,{' '.join(f'J{w}:' + (r['treffer_rel'] + ' h' + r['hoehe_treffer'] if r['treffer_rel'] else 'kein h' + r['hoehe_aktiv']) for w, r in js)}")



def argumente(sub):
    """Unterbefehl gegnerangriff anlegen (auch fuer messen_a5.py)."""
    p = sub.add_parser("gegnerangriff", help="je Angriff eines Gegners: Startup, aktive Frames, "
                       "Treffer, Abstand, Umwerfen, Nachlauf")
    p.add_argument("prefix", nargs="+")
    p.add_argument("--slot", type=int, action="append", help="nur diese Slots (mehrfach moeglich)")
    p.add_argument("--zeitachse", action="store_true", help="je Frame eine Zeile statt je Angriff")
    p.add_argument("--start", help="nur der Angriff ab dem k-ten Wechsel auf ANIM (k:ANIM, hex)")
    p.set_defaults(fn=cmd_gegnerangriff)
    z = sub.add_parser("gegnerzusammenfassung", help="Zusammenfassung der gegnerangriff-Ausgaben "
                       "(natuerliche Laeufe je Angriffsart, Proben je Quelle)")
    z.add_argument("csv", nargs="+")
    z.set_defaults(fn=cmd_zusammenfassung)
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    argumente(sub)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
