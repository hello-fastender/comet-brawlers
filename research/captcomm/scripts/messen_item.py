#!/usr/bin/env python3
"""Gegenstaende, Waffen und Punkte (Praefix item) auf den RAM-Abzuegen.

Nur Standardbibliothek. Adressen (Big Endian): Spielerblock P = FFA990,
Objekt-Slots S = FFBC90 + n*0xC0 (Gegenstaende und Behaelter in 20..59),
Geschosse der Figur in den Bloecken G = FFAD90 + k*0xC0 (k 0..4). Frames
sind lokale Frames des Runners; "Druck f" heisst: Taste in Frame f gedrueckt.

Unterbefehle:
  objekte PREFIX..   jede Belegung eines Objekt-Slots 20..59 mit Gegenstand
                     (Typ 0x95F9C, Art S+0x3D, Munition S+0xB1) oder Behaelter
                     (Typ 0x9DA2A, LP 777): Art, Erscheinen,
                     Landung, Liegezeit S+0x60, Blinken, Ende und Grund
  nah PREFIX..       Wechsel des Flags "Gegenstand in Reichweite" (P+0x78) mit
                     Abstand und Tiefe zum Gegenstand, auf den P+0x7A zeigt
  aufnahme PREFIX..  jede Aufnahme (Aktion 0x12): Druck, Abstand, Tiefe, Art,
                     LP, Punkte, Waffe und Munition davor und danach
  waffe PREFIX..     jeder Waffeneinsatz (Aktion 0x16): Dauer, aktive Frames
                     (P+0x24), Geschosse (Start, Geschwindigkeit, Landung,
                     Explosion), Treffer an Gegnern und Behaeltern mit Abstand,
                     Tiefe, Schaden, Umwerfen; Munition; Verlust der Waffe
  punkte PREFIX..    jede Aenderung der Punkte (FFAA74, BCD) mit den Treffern
                     und Ereignissen im selben Frame und im Frame davor
  reichweite PREFIX..  je Lauf mit Waffeneinsatz und per EINGRIFF gesetztem Gegner:
                     Abstand und Tiefe jedes Gegners beim Einsatz, Treffer ja/nein,
                     Schaden, Trefferframe relativ zum Druck, Status danach
  nahsweep PREFIX..  je Lauf mit per EINGRIFF verschobenem Gegenstand: Bereich
                     von dx bzw. dz, in dem P+0x78 gesetzt ist und P+0x7A auf
                     diesen Gegenstand zeigt
  griff PREFIX..     Griff mit Waffe: Griffbeginn (P+9 = 4), jeder LP-Verlust des
                     gehaltenen Gegners mit Frame relativ zum letzten Angriffsdruck,
                     Aktion P+0x0A, Unterphase P+0x0C, Kombostufe, Waffe, Munition
  bot PREFIX..       Gegenstaende und Behaelter aus einem Bot-Lauf
                     (scenarios/item_bot.lua, Spalten s<n>_*): Belegungen,
                     Art, Liegezeit, Ende; dazu Waffe/Munition der Figur
  botpunkte PREFIX.. Punkteaenderungen aus einem Bot-Lauf mit den
                     LP-Abnahmen der Gegner (Spalten g<n>_*) im selben Frame
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ramtools import Dump  # noqa: E402

P = 0xFFA990
SLOT0, SLOTSZ = 0xFFBC90, 0xC0
GESCHOSS0 = 0xFFAD90
TYP_ITEM, TYP_BEHAELTER = 0x95F9C, 0x9DA2A
PUNKTE = 0xFFAA74            # 4 Byte BCD (FFAA76 = untere 4 Stellen)
ART = {                      # S+0x3D des Gegenstands (Name in der Anzeige)
    0x08: "Raketenwerfer (MISSILE)",
    0x10: "Laser (LASER)",
    0x12: "Hammer (HAMMER)",
    0x20: "Brathaehnchen",
}


def s16(v):
    return v - 0x10000 if v >= 0x8000 else v


def slot(n):
    return SLOT0 + n * SLOTSZ


def bcd(v):
    r, m = 0, 1
    while v:
        r += (v & 0xF) * m
        v >>= 4
        m *= 10
    return r


def art_name(a):
    return ART.get(a, f"Art {a:#04x}")


class Lauf:
    def __init__(self, prefix):
        self.d = Dump(prefix)
        self.name = Path(prefix).name
        self.f = self.d.frames
        self.watch = {}
        wp = Path(prefix + "_watch.csv")
        if wp.exists():
            for r in csv.DictReader(open(wp)):
                self.watch[int(r["frame"])] = r
        self.inp = {}
        ip = Path(prefix + "_inputs.csv")
        if ip.exists():
            for r in csv.DictReader(open(ip)):
                self.inp[int(r["frame"])] = set(x for x in r["inputs"].split("|") if x)

    def v(self, f, a, w=1, signed=False):
        return self.d.value(f, a, w, signed)

    def px(self, f):
        return self.v(f, P + 0x0E, 2)

    def pz(self, f):
        return self.v(f, P + 0x16, 2)

    def lp(self, f):
        return self.v(f, P + 0x40, 2, True)

    def punkte(self, f):
        return bcd(self.v(f, PUNKTE, 4))

    def akt(self, f):
        return self.v(f, P + 0x0A, 2)

    def camx(self, f):
        return int(self.watch[f]["camx"]) if f in self.watch else None

    def druck(self, f, taste="P1 Button 1", rueck=30):
        """Letzter Frame <= f, in dem die Taste neu gedrueckt wurde."""
        for g in range(f, max(0, f - rueck), -1):
            if taste in self.inp.get(g, ()) and taste not in self.inp.get(g - 1, ()):
                return g
        return None


def belegungen(L, slots, typen):
    """Zusammenhaengende Belegungen (S+4 != 0) mit gleicher Typkennung."""
    out, cur = [], {}
    for f in L.f:
        for n in slots:
            S = slot(n)
            st = L.v(f, S + 4)
            typ = L.v(f, S + 0x38, 4)
            if st and typ in typen:
                c = cur.get(n)
                if c is None or c["typ"] != typ:
                    if c:
                        out.append(c)
                    c = cur[n] = {"slot": n, "typ": typ, "von": f, "frames": []}
                c["frames"].append(f)
            elif n in cur:
                out.append(cur.pop(n))
    out += cur.values()
    out.sort(key=lambda c: (c["von"], c["slot"]))
    return out


def cmd_objekte(a):
    print("lauf,slot,typ,art,name,munition,erscheint,x,hoehe,tiefe,landung,liegezeit_start,"
          "liegezeit_null,letzter_frame,frei,frames_belegt,frames_nach_null,ende,lp_verlauf")
    for prefix in a.prefix:
        L = Lauf(prefix)
        for c in belegungen(L, range(20, 60), (TYP_ITEM, TYP_BEHAELTER)):
            n, S, fr = c["slot"], slot(c["slot"]), c["frames"]
            f0, f1 = fr[0], fr[-1]
            art = L.v(f1, S + 0x3D)
            land = t0 = tnull = None
            if c["typ"] == TYP_ITEM:
                # Landung: Liegezeit S+0x60 wird neu gesetzt (springt nach oben);
                # vorher steht dort ein Rest der vorigen Belegung
                ts = [L.v(f, S + 0x60, 2, True) for f in fr]
                tmax = max(ts)
                for i, (f, t) in enumerate(zip(fr, ts)):
                    if land is None and t == tmax and tmax >= 100 and (i == 0 or ts[i - 1] != tmax):
                        land, t0 = f, t
                    if land is not None and tnull is None and t <= 0:
                        tnull = f
            frei = f1 + 1 if f1 + 1 in L.d.offsets else ""
            ende = "Laufende"
            if frei:
                if L.akt(frei) == 0x12 and L.akt(frei - 1) != 0x12:
                    ende = "aufgenommen"
                elif tnull:
                    ende = "abgelaufen"
                else:
                    cx = L.camx(frei)
                    x = L.v(f1, S + 0x0E, 2)
                    ende = f"frei (x {x}, Kamera {cx})"
            lps = []
            if c["typ"] == TYP_BEHAELTER:
                last = None
                for f in fr:
                    v = L.v(f, S + 0x40, 2, True)
                    if v != last:
                        lps.append(f"{f}:{v}")
                        last = v
            if c["typ"] == TYP_ITEM:
                name = art_name(art)
            else:
                name = "Behaelter" if L.v(f0, S + 0x40, 2) == 777 else "Truemmer"
            mun = L.v(f1, S + 0xB1) if c["typ"] == TYP_ITEM else ""
            print(f"{L.name},{n},{c['typ']:#x},{art:#04x},{name},{mun},{f0},{L.v(f0, S + 0x0E, 2)},"
                  f"{L.v(f0, S + 0x12, 2, True)},{L.v(f0, S + 0x16, 2)},{land or ''},{t0 or ''},"
                  f"{tnull or ''},{f1},{frei},{len(fr)},{(f1 - tnull + 1) if tnull else ''},{ende},"
                  f"{' '.join(lps)}")


def item_von_zeiger(L, f):
    w = L.v(f, P + 0x7A, 2)
    S = 0xFF0000 + w - 4
    n = (S - SLOT0) // SLOTSZ
    if 20 <= n < 60 and (S - SLOT0) % SLOTSZ == 0:
        return n, S
    return None, None


def cmd_nah(a):
    print("lauf,frame,nah,slot,art,figur_x,figur_tiefe,dx_item_minus_figur,dz,blick,aktion")
    for prefix in a.prefix:
        L = Lauf(prefix)
        for f0, f in zip(L.f, L.f[1:]):
            n0, n1 = L.v(f0, P + 0x78), L.v(f, P + 0x78)
            if n0 == n1:
                continue
            g = f if n1 else f0
            n, S = item_von_zeiger(L, g)
            if n is None:
                print(f"{L.name},{f},{n1},,,{L.px(f)},{L.pz(f)},,,,{L.akt(f):#x}")
                continue
            # Abstand im Frame des Wechsels und im Frame davor (Entscheidung am Frame-Ende)
            dx = L.v(g, S + 0x0E, 2) - L.px(g)
            dz = L.v(g, S + 0x16, 2) - L.pz(g)
            blick = "rechts" if L.v(f, P + 0x5E) & 0x20 else "links"
            print(f"{L.name},{f},{n1},{n},{L.v(g, S + 0x3D):#04x},{L.px(f)},{L.pz(f)},{dx},{dz},{blick},{L.akt(f):#x}")


def cmd_aufnahme(a):
    print("lauf,frame,druck,slot,art,name,dx,dz,lp_vorher,lp_nachher,punkte_vorher,punkte_nachher,"
          "waffe_vorher,waffe_nachher,munition_nachher,aktion_0x12_frames,figur_status")
    for prefix in a.prefix:
        L = Lauf(prefix)
        for f0, f in zip(L.f, L.f[1:]):
            if not (L.akt(f) == 0x12 and L.akt(f0) != 0x12):
                continue
            n, S = item_von_zeiger(L, f0)
            # Dauer der Aufnahme
            g = f
            while g + 1 in L.d.offsets and L.akt(g + 1) == 0x12:
                g += 1
            nach = g + 1 if g + 1 in L.d.offsets else g
            pr = L.druck(f - 1)
            if n is not None:
                dx = L.v(f0, S + 0x0E, 2) - L.px(f0)
                dz = L.v(f0, S + 0x16, 2) - L.pz(f0)
                art = L.v(f0, S + 0x3D)
            else:
                dx = dz = art = ""
            print(f"{L.name},{f},{pr or ''},{n if n is not None else ''},"
                  f"{art if art == '' else f'{art:#04x}'},{art_name(art) if art != '' else ''},{dx},{dz},"
                  f"{L.lp(f0)},{L.lp(nach)},{L.punkte(f0)},{L.punkte(nach)},{L.v(f0, P + 0x79)},"
                  f"{L.v(nach, P + 0x79)},{L.v(nach, P + 0xB1)},{g - f + 1},{L.v(f, P + 4)}")


def gegner_treffer(L, f, slots=range(0, 60)):
    """LP-Abnahmen in Frame f (gegen f-1) in Gegner- und Behaelter-Slots."""
    out = []
    for n in slots:
        S = slot(n)
        if not L.v(f, S + 4):
            continue
        a0, a1 = L.v(f - 1, S + 0x40, 2, True), L.v(f, S + 0x40, 2, True)
        if a1 < a0:
            out.append((n, S, a0 - a1, a1))
    return out


def cmd_waffe(a):
    print("lauf,ereignis,frame,druck,rel_druck,wert1,wert2,wert3,wert4,wert5")
    for prefix in a.prefix:
        L = Lauf(prefix)
        name = L.name
        # Waffenaktionen
        for f0, f in zip(L.f, L.f[1:]):
            if L.akt(f) == 0x16 and L.akt(f0) != 0x16:
                g = f
                while g + 1 in L.d.offsets and L.akt(g + 1) == 0x16:
                    g += 1
                pr = L.druck(f - 1)
                aktiv = [h for h in range(f, g + 1) if L.v(h, P + 0x24, 2) & 0xC000 and L.v(h, P + 0x24, 2) >> 8 != 0xFF]
                mun0, mun1 = L.v(f0, P + 0xB1), L.v(g + 1 if g + 1 in L.d.offsets else g, P + 0xB1)
                print(f"{name},schuss,{f},{pr or ''},{(f - pr) if pr else ''},ende {g} ({g - f + 1} Frames),"
                      f"aktiv {aktiv[0] if aktiv else '-'}..{aktiv[-1] if aktiv else '-'} ({len(aktiv)}),"
                      f"attr {L.v(aktiv[0], P + 0x24, 2) if aktiv else 0:#06x},munition {mun0}->{mun1},"
                      f"figur x {L.px(f)} tiefe {L.pz(f)} blick {'rechts' if L.v(f, P + 0x5E) & 0x20 else 'links'}")
        # Geschosse
        for k in range(5):
            G = GESCHOSS0 + k * SLOTSZ
            cur = None
            for f in L.f + [None]:
                st = L.v(f, G + 4) if f is not None else 0
                if st and cur is None:
                    cur = [f]
                elif st:
                    cur.append(f)
                elif cur:
                    fr = cur
                    cur = None
                    s0 = fr[0]
                    pr = L.druck(s0, rueck=40)
                    xs = [L.v(h, G + 0x0E, 4, True) / 65536 for h in fr]
                    hs = [L.v(h, G + 0x12, 2, True) for h in fr]
                    vx = xs[1] - xs[0] if len(xs) > 1 else 0
                    land = next((h for h, hh in zip(fr, hs) if hh <= 0), None)
                    aktiv = [h for h in fr if L.v(h, G + 0x24, 2) & 0xFF00 and L.v(h, G + 0x24, 2) >> 8 != 0xFF]
                    print(f"{name},geschoss,{s0},{pr or ''},{(s0 - pr) if pr else ''},block {k} typ {L.v(s0, G + 0x38, 4):#x},"
                          f"start x {xs[0]:.2f} (figur {L.px(s0)}) hoehe {hs[0]} tiefe {L.v(s0, G + 0x16, 2)},"
                          f"vx {vx:+.3f} px/Frame,"
                          f"boden {land if land else '-'} bei x {L.v(land, G + 0x0E, 2) if land else '-'} "
                          f"(Flugweite {(L.v(land, G + 0x0E, 2) - xs[0]) if land else '-'}),"
                          f"attr aktiv {aktiv[0] if aktiv else '-'}..{aktiv[-1] if aktiv else '-'} "
                          f"({len(aktiv)}; {L.v(aktiv[0], G + 0x24, 2) if aktiv else 0:#06x}) ende {fr[-1]}")
        # Treffer (LP-Abnahme in Slots 0..59), waehrend Waffe gehalten oder Geschoss unterwegs
        for f0, f in zip(L.f, L.f[1:]):
            waffe = L.v(f0, P + 0x79) or L.akt(f) == 0x16 or L.akt(f0) == 0x16
            geschosse = [k for k in range(5) if L.v(f, GESCHOSS0 + k * SLOTSZ + 4)]
            if not (waffe or geschosse):
                continue
            for n, S, dmg, rest in gegner_treffer(L, f):
                st1 = L.v(f + 1, S + 4) if f + 1 in L.d.offsets else L.v(f, S + 4)
                quelle = ""
                for k in geschosse:
                    G = GESCHOSS0 + k * SLOTSZ
                    quelle += (f" geschoss{k} x {L.v(f, G + 0x0E, 2)} h {L.v(f, G + 0x12, 2, True)}"
                               f" z {L.v(f, G + 0x16, 2)} attr {L.v(f, G + 0x24, 2):#06x}")
                print(f"{name},treffer,{f},,,slot {n} typ {L.v(f, S + 0x38, 4):#x},schaden {dmg} (rest {rest}),"
                      f"dx {L.v(f, S + 0x0E, 2) - L.px(f)} dz {L.v(f, S + 0x16, 2) - L.pz(f)},"
                      f"status danach {st1:#04x} ({'umgeworfen/liegt' if st1 == 2 else 'reaktion' if st1 == 3 else st1}),"
                      f"figur aktion {L.akt(f):#x}{quelle}")
        # Verlust der Waffe
        for f0, f in zip(L.f, L.f[1:]):
            if L.v(f0, P + 0x79) and not L.v(f, P + 0x79):
                grund = ("Munition leer" if L.v(f0, P + 0xB1) == 0 else
                         "Treffer gegen die Figur" if L.v(f, P + 4) in (2, 3) or L.lp(f) < L.lp(f0) else "anders")
                print(f"{name},waffe_weg,{f},,,{grund},munition vorher {L.v(f0, P + 0xB1)},"
                      f"figur status {L.v(f, P + 4)} aktion {L.akt(f):#x} lp {L.lp(f0)}->{L.lp(f)},,")


def cmd_punkte(a):
    print("lauf,frame,punkte_vorher,punkte_nachher,differenz,ereignisse")
    for prefix in a.prefix:
        L = Lauf(prefix)
        for f0, f in zip(L.f, L.f[1:]):
            p0, p1 = L.punkte(f0), L.punkte(f)
            if p0 == p1:
                continue
            ev = []
            for g in (f - 2, f - 1, f):
                if g - 1 not in L.d.offsets:
                    continue
                for n, S, dmg, rest in gegner_treffer(L, g):
                    typ = L.v(g, S + 0x38, 4)
                    ev.append(f"f{g} slot{n} typ {typ:#x} max {L.v(g, S + 0x9A, 2)} -{dmg} rest {rest}"
                              f" stufe {L.v(g, P + 0x9D) // 4}")
                for n in range(0, 60):
                    S = slot(n)
                    if L.v(g - 1, S + 4) in (1, 3) and L.v(g, S + 4) == 2 and L.v(g, S + 0x40, 2, True) < 0:
                        ev.append(f"f{g} slot{n} besiegt")
                if L.akt(g) == 0x12 and L.akt(g - 1) != 0x12:
                    ev.append(f"f{g} aufnahme")
            print(f"{L.name},{f},{p0},{p1},{p1 - p0},{' | '.join(ev)}")


def cmd_reichweite(a):
    print("lauf,blick,druck,slot,typ,dx,dz,treffer,schaden,trefferframe_rel_druck,status_danach")
    for prefix in a.prefix:
        L = Lauf(prefix)
        start = next((f for f0, f in zip(L.f, L.f[1:]) if L.akt(f) == 0x16 and L.akt(f0) != 0x16), None)
        if start is None:
            continue
        pr = L.druck(start - 1) or start - 1
        blick = "rechts" if L.v(start, P + 0x5E) & 0x20 else "links"
        ende = min(L.f[-1], start + 60)
        for n in range(20):
            S = slot(n)
            if not L.v(start, S + 4):
                continue
            treffer = None
            for f in range(start, ende + 1):
                if L.v(f, S + 0x40, 2, True) < L.v(f - 1, S + 0x40, 2, True):
                    treffer = f
                    break
            g = treffer if treffer else start + 5
            dx = L.v(g, S + 0x0E, 2) - L.px(g)
            dz = L.v(g, S + 0x16, 2) - L.pz(g)
            if 296 <= abs(dx) <= 304 or abs(dx) > 400:
                continue  # geparkter Gegner (EINGRIFF 300 px) oder weit weg
            if treffer:
                dmg = L.v(treffer - 1, S + 0x40, 2, True) - L.v(treffer, S + 0x40, 2, True)
                st = L.v(min(treffer + 1, L.f[-1]), S + 4)
                print(f"{L.name},{blick},{pr},{n},{L.v(g, S + 0x38, 4):#x},{dx},{dz},ja,{dmg},{treffer - pr},{st}")
            else:
                print(f"{L.name},{blick},{pr},{n},{L.v(g, S + 0x38, 4):#x},{dx},{dz},nein,,,")


def cmd_nahsweep(a):
    print("lauf,slot,art,achse,blick,von,bis,ausserhalb_unten,ausserhalb_oben,proben")
    for prefix in a.prefix:
        L = Lauf(prefix)
        best = None
        for n in range(20, 60):
            S = slot(n)
            xs = {L.v(f, S + 0x0E, 2) - L.px(f) for f in L.f if L.v(f, S + 4)}
            zs = {L.v(f, S + 0x16, 2) - L.pz(f) for f in L.f if L.v(f, S + 4)}
            k = max(len(xs), len(zs))
            if L.v(L.f[-1], S + 0x38, 4) == TYP_ITEM and (best is None or k > best[0]):
                best = (k, n, "x" if len(xs) >= len(zs) else "z")
        if not best or best[0] < 5:
            continue
        _, n, achse = best
        S = slot(n)
        proben = []
        for f in L.f[1:]:
            if not L.v(f, S + 4) or L.v(f, S + 0x12, 2, True) != 0:
                continue
            d = (L.v(f, S + 0x0E, 2) - L.px(f)) if achse == "x" else (L.v(f, S + 0x16, 2) - L.pz(f))
            # nur Frames, in denen die Position schon im Vorframe galt
            d0 = (L.v(f - 1, S + 0x0E, 2) - L.px(f - 1)) if achse == "x" else (L.v(f - 1, S + 0x16, 2) - L.pz(f - 1))
            if d != d0:
                continue
            an = L.v(f, P + 0x78) and L.v(f, P + 0x7A, 2) == ((S + 4) & 0xFFFF)
            proben.append((d, bool(an)))
        ins = sorted(d for d, an in proben if an)
        outs = sorted(d for d, an in proben if not an)
        if not ins:
            print(f"{L.name},{n},{L.v(L.f[-1], S + 0x3D):#04x},{achse},,keine,,,,{len(proben)}")
            continue
        unten = max((d for d in outs if d < ins[0]), default="")
        oben = min((d for d in outs if d > ins[-1]), default="")
        luecke = [d for d in outs if ins[0] < d < ins[-1]]
        f_erst = 70 if 70 in L.d.offsets else L.f[1]
        blick = "rechts" if L.v(f_erst, P + 0x5E) & 0x20 else "links"
        print(f"{L.name},{n},{L.v(L.f[-1], S + 0x3D):#04x},{achse},{blick},{ins[0]},{ins[-1]},{unten},{oben},"
              f"{len(proben)}{' Luecken ' + str(luecke) if luecke else ''}")


def cmd_griff(a):
    print("lauf,ereignis,frame,druck,rel_druck,schaden,lp_nachher,aktion,unterphase,kombostufe,waffe,munition,punkte_diff")
    for prefix in a.prefix:
        L = Lauf(prefix)
        for f0, f in zip(L.f, L.f[1:]):
            if L.v(f, P + 9) == 4 and L.v(f0, P + 9) != 4:
                print(f"{L.name},griff,{f},,,,,{L.akt(f):#x},{L.v(f, P + 0x0C, 2)},{L.v(f, P + 0x9D) // 4},"
                      f"{L.v(f, P + 0x79)},{L.v(f, P + 0xB1)},")
            for n, S, dmg, rest in gegner_treffer(L, f, range(20)):
                pr = L.druck(f - 1, rueck=40)
                g = f + 1 if f + 1 in L.d.offsets else f
                print(f"{L.name},treffer slot {n},{f},{pr or ''},{(f - pr) if pr else ''},{dmg},{rest},"
                      f"{L.akt(f):#x},{L.v(f, P + 0x0C, 2)},{L.v(f, P + 0x9D) // 4},{L.v(f, P + 0x79)},"
                      f"{L.v(f, P + 0xB1)},{L.punkte(g) - L.punkte(f0)}")


def bot_rows(prefix):
    return list(csv.DictReader(open(prefix + "_bot.csv")))


def cmd_bot(a):
    print("lauf,stage,slot,typ,art,name,munition,erscheint,kamera_x,x,tiefe,hoehe,landung,liegezeit_start,"
          "liegezeit_null,letzter_frame,frames_belegt,frames_nach_null,ende")
    for prefix in a.prefix:
        rows = bot_rows(prefix)
        name = Path(prefix).name
        cur = {}
        out = []
        for i, r in enumerate(rows):
            f = int(r["frame"])
            for n in range(20, 60):
                st = int(r[f"s{n}_st"])
                typ = int(r[f"s{n}_typ"])
                if st and typ in (TYP_ITEM & 0xFFFF, TYP_BEHAELTER & 0xFFFF):
                    c = cur.get(n)
                    if c is None or c["typ"] != typ:
                        if c:
                            out.append(c)
                        c = cur[n] = {"slot": n, "typ": typ, "rows": []}
                    c["rows"].append(i)
                elif n in cur:
                    c = cur.pop(n)
                    c["frei"] = i
                    out.append(c)
        out += cur.values()
        out.sort(key=lambda c: (c["rows"][0], c["slot"]))
        for c in out:
            n = c["slot"]
            r0 = rows[c["rows"][0]]
            land = t0 = tnull = None
            ts = [int(rows[i][f"s{n}_t"]) for i in c["rows"]]
            tmax = max(ts)
            for k, (i, t) in enumerate(zip(c["rows"], ts)):
                if c["typ"] != TYP_ITEM & 0xFFFF:
                    break
                if land is None and t == tmax and tmax >= 100 and (k == 0 or ts[k - 1] != tmax):
                    land, t0 = int(rows[i]["frame"]), t
                if land is not None and tnull is None and t <= 0:
                    tnull = int(rows[i]["frame"])
            f1 = int(rows[c["rows"][-1]]["frame"])
            art = int(rows[c["rows"][-1]][f"s{n}_art"]) & 0xFF
            ende = "Laufende"
            if "frei" in c:
                rf = rows[c["frei"]]
                if int(rf["pact"]) == 0x12:
                    ende = "aufgenommen"
                elif tnull:
                    ende = "abgelaufen"
                else:
                    ende = f"frei (x {rows[c['rows'][-1]][f's{n}_x']}, Kamera {rf['camx']})"
            nm = art_name(art) if c["typ"] == TYP_ITEM & 0xFFFF else "Behaelter/Truemmer"
            mun = rows[c["rows"][-1]][f"s{n}_mun"] if c["typ"] == TYP_ITEM & 0xFFFF else ""
            print(f"{name},{int(r0['stage']) + 1},{n},{c['typ']:#x},{art:#04x},{nm},{mun},{r0['frame']},{r0['camx']},{r0[f's{n}_x']},"
                  f"{r0[f's{n}_z']},{r0[f's{n}_h']},{land or ''},{t0 or ''},{tnull or ''},{f1},"
                  f"{len(c['rows'])},{(f1 - tnull + 1) if tnull else ''},{ende}")


def cmd_botpunkte(a):
    print("lauf,frame,kamera_x,punkte_vorher,punkte_nachher,differenz,lp_abnahmen_gegner")
    for prefix in a.prefix:
        rows = bot_rows(prefix)
        name = Path(prefix).name
        for i in range(2, len(rows)):
            r0, r1 = rows[i - 1], rows[i]
            p0, p1 = bcd(int(r0["punkte"])), bcd(int(r1["punkte"]))
            if p0 == p1:
                continue
            ev = []
            # Die Punkte aendern sich einen Frame nach dem LP-Verlust des Gegners
            for ra, rb in ((rows[i - 2], r0), (r0, r1)):
                for n in range(20):
                    a0, a1 = int(ra[f"g{n}_lp"]), int(rb[f"g{n}_lp"])
                    if int(rb[f"g{n}_st"]) and a1 < a0:
                        ev.append(f"f{rb['frame']} slot{n} typ {int(rb[f'g{n}_typ']):#x} max {rb[f'g{n}_max']} -{a0 - a1} rest {a1}")
            print(f"{name},{r1['frame']},{r1['camx']},{p0},{p1},{p1 - p0},{' | '.join(ev)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for nm, fn, hilfe in (
        ("objekte", cmd_objekte, "Belegungen der Slots 20..59 mit Gegenstaenden und Behaeltern"),
        ("nah", cmd_nah, "Wechsel des Flags Gegenstand in Reichweite (P+0x78)"),
        ("aufnahme", cmd_aufnahme, "jede Aufnahme eines Gegenstands (Aktion 0x12)"),
        ("waffe", cmd_waffe, "Schuesse, Geschosse, Treffer und Verlust der Waffe"),
        ("punkte", cmd_punkte, "Punkteaenderungen mit Ereignissen"),
        ("reichweite", cmd_reichweite, "Treffer je per Eingriff gesetztem Gegner beim Waffeneinsatz"),
        ("nahsweep", cmd_nahsweep, "Aufnahmebereich aus einem Lauf mit verschobenem Gegenstand"),
        ("griff", cmd_griff, "Griff mit Waffe: Kniestoss, Wurf, Waffe und Munition"),
        ("bot", cmd_bot, "Gegenstaende und Behaelter aus einem Bot-Lauf (item_bot.lua)"),
        ("botpunkte", cmd_botpunkte, "Punkteaenderungen aus einem Bot-Lauf"),
    ):
        p = sub.add_parser(nm, help=hilfe)
        p.add_argument("prefix", nargs="+")
        p.set_defaults(fn=fn)
    a = ap.parse_args()
    # Praefixe normalisieren (Glob ueber logs/raw/item_x_* erlaubt)
    seen = []
    for pr in a.prefix:
        for suf in ("_ram.bin", "_ram.hdr", "_inputs.csv", "_watch.csv", "_fields.txt", "_bot.csv", "_events.txt"):
            if pr.endswith(suf):
                pr = pr[: -len(suf)]
        if pr not in seen and (Path(pr + "_ram.hdr").exists() or Path(pr + "_bot.csv").exists()):
            seen.append(pr)
    a.prefix = seen
    a.fn(a)


if __name__ == "__main__":
    main()
