#!/usr/bin/env python3
"""Verhalten von WOOKY und EDDY (Auftrag M2, Praefix "verhalten"; nur Standardbibliothek).

Liest zwei Arten von Laeufen gleich:
  * RAM-Abzuege von runner.lua (PREFIX_ram.bin/.hdr, dazu PREFIX_watch.csv mit
    camx und rang; Szenario scenarios/verhalten.lua bzw. verhalten_huelle.lua)
  * Bot-Laeufe von grafik/bot.lua (PREFIX_bot.csv mit den Watch-Spalten aus
    scenarios/verhalten_bot.lua)
Alle Frames sind lokale Frames des Laufs. Positionen ganzzahlig (Frame-Ende),
dx = x(Gegner) - x(Figur), dz = Tiefe(Gegner) - Tiefe(Figur).

Zustaende eines Gegnerslots (Lauf.zustand): frei (S+4 = 0), inaktiv (S+5 = 0),
lauert (S+4 = 2, Modus S+0x0A 0x0A hockend bzw. 0x0E versteckt), getroffen
(S+4 = 3), liegt (S+4 = 2 sonst), gehen, kampfhaltung (Haltung, Modus 6),
abwarten (Haltung, Modus 4), spott (Modus 2), angriff (Ausholen bis Ende der
Schlaganimation), erholung, aufstehen, sonst. Die Kennungen (Animationszeiger
S+0x1C) stehen in ANIM und ANGRIFFE unten.

Unterbefehle (jeweils PREFIX ...):
  zeitachse    Zustandsabschnitte je Gegnerslot: Zustand, Frames, dx/dz am
               Anfang und Ende, Animationskennungen, aktive Frames (S+0x24)
  aktivierung  jeder Wechsel von S+5 (0/1) und von S+4 2 -> 1 mit Kamera-x,
               Abstand zur Figur und zum linken Bildrand
  annaeherung  jedes Gehen, das im Stillstand (Kampfhaltung) endet: Dauer,
               Geschwindigkeit x/Tiefe (16.16, nur Abzuege), dx/dz beim Stillstand
  angriffe     jeder Angriffsbeginn (Kennung des Animationszeigers): Pause seit
               dem Stillstand, Abstand zum vorigen Angriff desselben Gegners, was
               dazwischen lag, Zustand der Figur (Schutz, Sprung, Liegen), Treffer
  weglauf      B1: Figur laeuft weg; Gehen und Abstand des naechsten Gegners
  tiefe        B2: Tiefenschritte der Figur; Verzoegerung, bis der Gegner folgt
  sprung       B3: Spruenge der Figur; Angriffe des Gegners waehrend des Sprungs
  schutz       B4: Schutzfenster der Figur (P+4 = 3); Angriffe und aktive Frames darin
  gruppe       Frames mit mindestens 3 aktiven Gegnern: wie viele greifen
               gleichzeitig an, wo stehen die uebrigen, zweiter Angreifer
  wellen       Lebenslauf jedes Gegnerslots (Erscheinen, Aktivierung, Tod) mit
               Kamera-x und Zahl der Toten davor; Kamerastillstaende
  dauern       Dauer der Zustandsabschnitte von WOOKY/EDDY (haeufigste Werte)
  uebergaenge  Zustandswechsel von WOOKY/EDDY: Anzahl, Dauer, |dx|/|dz| beim Wechsel
  aktivitaet   je Lauf: Angriffe je 1000 Frames, Zustaende und |dx| des naechsten Gegners
  katalog      Animationskennungen je Gegnertyp mit Dauer, Modus S+0x0A und
               Trefferattribut (Grundlage der Tabelle ANIM unten)
  schwelle     A1: S+5 und Weckreiz je 1-px-Stufe x - Kamera (EINGRIFF CC_KSTUFEN)
  vergleich    zwei Laeufe (mit/ohne Eingriff): erster Frame mit Abweichung der Gegner
  zusammenfassung  Min/Median/Max aller Groessen ueber die angegebenen Laeufe
"""

import argparse
import csv
import statistics
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path

P = 0xFFA990
SLOT_BASE, SLOT_SIZE = 0xFFBC90, 0xC0
WOOKY, EDDY = 0x5A97E, 0x60CA0
TYPNAME = {WOOKY: "WOOKY", EDDY: "EDDY", 0x25086: "SKIP", 0x64E7A: "DICK",
           0x46DA4: "DOLG", 0x9ADEA: "MECH"}

# Felder je Gegnerslot: Name -> (Offset, Breite, vorzeichenbehaftet)
SFELD = {"st": (0x04, 1, False), "s5": (0x05, 1, False), "a": (0x0A, 2, False), "c": (0x0C, 2, False),
         "x": (0x0E, 2, False), "xf": (0x10, 2, False), "h": (0x12, 2, True),
         "z": (0x16, 2, False), "zf": (0x18, 2, False), "an": (0x1C, 4, False),
         "at": (0x24, 2, False), "typ": (0x38, 4, False), "lp": (0x40, 2, True),
         "fa": (0x5E, 1, False), "mx": (0x9A, 2, False), "dm": (0x8B, 1, False)}
# Spielerfelder: Name -> (Adresse, Breite, vorzeichenbehaftet)
PFELD = {"st": (P + 0x04, 1, False), "p9": (P + 0x09, 1, False), "act": (P + 0x0A, 2, False),
         "x": (P + 0x0E, 2, False), "xf": (P + 0x10, 2, False), "h": (P + 0x12, 2, True),
         "z": (P + 0x16, 2, False), "zf": (P + 0x18, 2, False), "lp": (P + 0x40, 2, True),
         "fa": (P + 0x5E, 1, False), "ptr": (0xFFAA12, 2, False), "t69": (0xFFAA69, 1, False),
         "t61": (0xFFAA61, 1, False)}
# Spalten des Bot-CSV fuer die Spielerfelder (bot.lua bzw. Watch aus verhalten_bot.lua)
PBOT = {"st": "pstat", "p9": "p_09", "act": "pact", "x": "px", "h": "ph", "z": "pd",
        "lp": "php", "fa": "face", "ptr": "p_ptr", "t69": "p_t69", "t61": "p_t61"}

# Animationskennungen (Animationszeiger S+0x1C, letzte fuenf Hex-Stellen), aus
# dem Unterbefehl "katalog" ueber die Laeufe dieses Auftrags bestimmt.
# Kategorie: gehen, haltung (Kampf- bzw. Wartehaltung, Modus 6 bzw. 4),
# ausholen, aktiv (Trefferframes), erholung, spott (Modus 2), hocken,
# aufstehen, versteckt. Angriffsbeginn = Wechsel auf eine Kennung aus START.
def _kat(gehen, haltung, angriffe, erholung, spott, hocken, aufstehen, versteckt=()):
    k = {}
    for a in gehen:
        k[a] = "gehen"
    for a in haltung:
        k[a] = "haltung"
    for _, aus, akt in angriffe:
        for a in aus:
            k[a] = "ausholen"
        for a in akt:
            k[a] = "aktiv"
    for a in erholung:
        k[a] = "erholung"
    for a in spott:
        k[a] = "spott"
    for a in hocken:
        k[a] = "hocken"
    for a in aufstehen:
        k[a] = "aufstehen"
    for a in versteckt:
        k[a] = "versteckt"
    return k


ANGRIFFE = {
    # Typ: [(Name, Ausholen-Kennungen (erste = Beginn), aktive Kennungen)]
    WOOKY: [("W-A", (0x5FA54, 0x5FA8C), (0x5FAB8, 0x5FAEC)),
            ("W-B", (0x5FB50, 0x5FB88), (0x5FBB4,)),
            ("W-C", (0x5FC18,), (0x5FC50,)),
            ("W-D", (0x5FC8C, 0x5FCB8), (0x5FCE8,)),
            ("W-E", (0x5FD24, 0x5FD5C), (0x5FD8C, 0x5FDBC))],
    EDDY: [("E-A", (0x643F8, 0x64430), (0x6445C, 0x64490)),
           ("E-B", (0x644F4, 0x6452C), (0x64558, 0x6458C)),
           ("E-C", (0x645BC, 0x645F4), (0x64624, 0x64654)),
           ("E-D", (0x64688, 0x646C0, 0x646F8), (0x6472E,))],
}
ANIM = {
    WOOKY: _kat(gehen=(0x5ED1C, 0x5ED4E, 0x5ED7E, 0x5EDAA, 0x5EDD4, 0x5EE04, 0x5EE34, 0x5EE60),
                haltung=(0x5EC70, 0x5ECAA, 0x5ECE2), angriffe=ANGRIFFE[WOOKY],
                erholung=(0x5FB18,),
                spott=(0x5FDF0, 0x5FE2A, 0x5FE5C, 0x5FE8A, 0x5FEB6, 0x5FEE0),
                hocken=(0x5FF0A, 0x5FF36, 0x5FF62, 0x5FF8E, 0x5FFBA, 0x5FFE6, 0x60014),
                aufstehen=(0x60044, 0x6007C, 0x600B6, 0x6035E, 0x60394),
                versteckt=(0x60328,)),
    EDDY: _kat(gehen=(0x63746, 0x63778, 0x637A8, 0x637D6, 0x63800, 0x63830, 0x63860, 0x6388C),
               haltung=(0x6369A, 0x636D4, 0x6370C), angriffe=ANGRIFFE[EDDY],
               erholung=(0x644BC,),
               spott=(0x64764, 0x6479E, 0x647D0, 0x647FE, 0x6482A, 0x64854),
               hocken=(0x6487E, 0x648AA, 0x648D6, 0x64902, 0x6492E, 0x6495A, 0x64988),
               aufstehen=(0x649B8, 0x649F0, 0x64A2A)),
}
START = {t: {aus[0]: name for name, aus, _ in v} for t, v in ANGRIFFE.items()}
# Mit der Erholung beginnt der naechste Angriff ohne Kampfhaltung dazwischen
# (W-D folgt direkt auf die Erholung 5FB18).


# Eingabenamen im Protokoll des Runners (MAME-Felder) -> Kurzname
EINGABE = {"P1 Left": "left", "P1 Right": "right", "P1 Up": "up", "P1 Down": "down",
           "P1 Button 1": "attack", "P1 Button 2": "jump"}


def aktiv_attr(at):
    """Trefferattribut S+0x24 aktiv (Schlag 0x4000, Messer 0x8000; 0xFF00 = Ende)."""
    return bool(at & 0xC000) and (at >> 8) != 0xFF


def med(v):
    return statistics.median(v) if v else None


def fmt_mmm(v):
    if not v:
        return "n=0"
    m = med(v)
    m = int(m) if float(m).is_integer() else round(m, 2)
    return f"n={len(v)} min={min(v)} med={m} max={max(v)}"


class Lauf:
    """Ein Lauf als Spalten: self.p[feld][i], self.s[n][feld][i], i = Index in self.frames."""

    def __init__(self, prefix):
        prefix = str(prefix)
        self.prefix = prefix
        self.name = Path(prefix).name
        if Path(prefix + "_bot.csv").exists():
            self._bot(prefix)
        else:
            self._ram(prefix)
        self.idx = {f: i for i, f in enumerate(self.frames)}
        self.n = len(self.frames)

    def _ram(self, prefix):
        hdr = dict(line.split("=", 1) for line in Path(prefix + "_ram.hdr").read_text().split())
        start = int(hdr["start"], 16)
        size = int(hdr["stop"], 16) - start + 1
        rec = 8 + size
        data = Path(prefix + "_ram.bin").read_bytes()
        nrec = len(data) // rec
        watch = {}
        if Path(prefix + "_watch.csv").exists():
            for r in csv.DictReader(open(prefix + "_watch.csv")):
                watch[int(r["frame"])] = r
        self.frames = []
        self.p = {k: [] for k in PFELD}
        self.s = [{k: [] for k in SFELD} for _ in range(20)]
        self.camx, self.rang = [], []
        fmt = {1: ">B", 2: ">H", 4: ">I"}
        sfmt = {1: ">b", 2: ">h", 4: ">i"}
        for i in range(nrec):
            o = i * rec
            f = struct.unpack_from("<I", data, o)[0]
            o += 8 - start
            self.frames.append(f)
            for k, (adr, w, sg) in PFELD.items():
                self.p[k].append(struct.unpack_from((sfmt if sg else fmt)[w], data, o + adr)[0])
            for n in range(20):
                b = o + SLOT_BASE + n * SLOT_SIZE
                sl = self.s[n]
                for k, (off, w, sg) in SFELD.items():
                    sl[k].append(struct.unpack_from((sfmt if sg else fmt)[w], data, b + off)[0])
            r = watch.get(f)
            self.camx.append(int(r["camx"]) if r else 0)
            self.rang.append(int(r["rang"]) if r and "rang" in r else 0)
        for n in range(20):
            self.s[n]["an"] = [a & 0xFFFFF for a in self.s[n]["an"]]
        self.inputs = {}
        if Path(prefix + "_inputs.csv").exists():
            for r in csv.DictReader(open(prefix + "_inputs.csv")):
                self.inputs[int(r["frame"])] = "|".join(
                    EINGABE.get(k, k) for k in r["inputs"].split("|") if k)
        self.quelle = "ram"

    def _bot(self, prefix):
        rows = list(csv.DictReader(open(prefix + "_bot.csv")))
        self.frames = [int(r["frame"]) for r in rows]
        self.camx = [int(r["camx"]) for r in rows]
        self.rang = [int(r.get("rang") or 0) for r in rows]
        self.p = {}
        for k, col in PBOT.items():
            self.p[k] = [int(r[col]) for r in rows]
        self.p["xf"] = [0] * len(rows)
        self.p["zf"] = [0] * len(rows)
        self.s = []
        for n in range(20):
            sl = {}
            for k in SFELD:
                col = f"s{n}_{k}"
                sl[k] = [int(r[col]) for r in rows] if col in rows[0] else [0] * len(rows)
            sl["an"] = [a & 0xFFFFF for a in sl["an"]]
            self.s.append(sl)
        # Eingaben: bot.lua protokolliert die fuer den naechsten Frame gesetzten
        self.inputs = {}
        for i, r in enumerate(rows):
            if i + 1 < len(rows):
                self.inputs[int(rows[i + 1]["frame"])] = "|".join(
                    k for k in r["inputs"].split("|") if k)
        self.quelle = "bot"

    # --- abgeleitete Groessen ---
    def typ(self, n, i):
        return self.s[n]["typ"][i] & 0xFFFFF

    def kat(self, n, i):
        return ANIM.get(self.typ(n, i), {}).get(self.s[n]["an"][i])

    def zustand(self, n, i):
        """Zustand eines Gegnerslots im Frame mit Index i (siehe Kopf von zeitachse)."""
        s = self.s[n]
        st, s5, a = s["st"][i], s["s5"][i], s["a"][i]
        if st == 0:
            return "frei"
        if s5 == 0:
            return "inaktiv"
        k = self.kat(n, i)
        if st == 2 and a in (0x0A, 0x0E):
            return "lauert"
        if st == 3:
            return "getroffen"
        if st == 2:
            return "liegt"
        if k in ("ausholen", "aktiv"):
            return "angriff"
        if k == "erholung":
            return "erholung"
        if k in ("haltung", "spott"):
            # Modus S+0x0A: 6 Kampfhaltung (0x16/0x1E je 1 Frame Uebergang aus
            # der Erholung), 4 Abwarten auf Abstand, 2 Spott/Warten
            if a in (6, 0x16, 0x1E):
                return "kampfhaltung"
            if a == 4:
                return "abwarten"
            if a == 2:
                return "spott"
            return k
        if k:
            return k
        return "sonst"

    def kampffaehig(self, n, i):
        s = self.s[n]
        return s["st"][i] in (1, 3) and s["s5"][i] == 1

    def dx(self, n, i):
        return self.s[n]["x"][i] - self.p["x"][i]

    def dz(self, n, i):
        return self.s[n]["z"][i] - self.p["z"][i]

    def angriffsbeginne(self, n):
        """Indizes i, an denen Slot n eine Angriffsanimation beginnt, mit Name."""
        out = []
        an = self.s[n]["an"]
        for i in range(1, self.n):
            t = self.typ(n, i)
            if t in START and an[i] in START[t] and an[i] != an[i - 1] and self.s[n]["st"][i] == 1:
                out.append((i, START[t][an[i]]))
        return out

    def ende_aktiv(self, n, i0):
        """Ab Angriffsbeginn i0: (erster aktiver Index, letzter aktiver Index) oder (None, None)."""
        s = self.s[n]
        a0 = a1 = None
        t = self.typ(n, i0)
        for i in range(i0, min(self.n, i0 + 120)):
            k = ANIM.get(t, {}).get(s["an"][i])
            if i > i0 and s["an"][i] in START.get(t, {}) and s["an"][i] != s["an"][i - 1]:
                break
            if aktiv_attr(s["at"][i]):
                if a0 is None:
                    a0 = i
                a1 = i
            elif a0 is not None and k not in ("aktiv",):
                break
            if k not in ("ausholen", "aktiv") and i > i0 and a0 is None and k != "erholung":
                break
        return a0, a1

    def luft(self, i):
        return self.p["h"][i] > 0

    def schutz(self, i):
        return self.p["st"][i] == 3

    def treffer_auf_figur(self, i):
        """LP-Verlust der Figur in Frame i (gegenueber i-1) und Slot des Angreifers."""
        if i == 0:
            return 0, None
        lp0 = self.p["lp"][i - 1]
        if self.quelle == "ram" or True:
            # nach dem Auffuellen (EINGRIFF) steht vor dem Frame 72 im Speicher
            lp0 = 72 if 0 < lp0 < 72 else lp0
        dmg = lp0 - self.p["lp"][i]
        if dmg <= 0:
            return 0, None
        a = 0xFF0000 + self.p["ptr"][i] - 4
        k = (a - SLOT_BASE) // SLOT_SIZE
        if (a - SLOT_BASE) % SLOT_SIZE == 0 and 0 <= k < 60:
            return dmg, k
        return dmg, None


ENDUNGEN = ("_ram.bin", "_ram.hdr", "_watch.csv", "_inputs.csv", "_fields.txt", "_bot.csv",
            "_events.txt")


def laden(prefixe):
    """Laeufe laden; Dateinamen mit bekannter Endung werden auf das Praefix gekuerzt."""
    sauber = []
    for p in prefixe:
        for e in ENDUNGEN:
            if p.endswith(e):
                p = p[: -len(e)]
        if p not in sauber:
            sauber.append(p)
    out = []
    for p in sauber:
        try:
            out.append(Lauf(p))
        except FileNotFoundError as e:
            print(f"# fehlt: {p} ({e})", file=sys.stderr)
    return out


# ---------------------------------------------------------------- zeitachse
def abschnitte(l, n):
    """Zusammenhaengende Abschnitte gleichen Zustands fuer Slot n."""
    segs = []
    cur = None
    for i in range(l.n):
        z = l.zustand(n, i)
        if z in ("frei",):
            cur = None
            continue
        if cur and cur["z"] == z and i == cur["i1"] + 1:
            cur["i1"] = i
            cur["an"].add(l.s[n]["an"][i])
            cur["akt"] += aktiv_attr(l.s[n]["at"][i])
        else:
            cur = {"z": z, "i0": i, "i1": i, "an": {l.s[n]["an"][i]},
                   "akt": int(aktiv_attr(l.s[n]["at"][i]))}
            segs.append(cur)
    return segs


def cmd_zeitachse(args):
    print("lauf,slot,typ,max_lp,von,bis,frames,zustand,dx_von,dx_bis,dz_von,dz_bis,"
          "figur_status_von,kennungen,aktive_frames")
    for l in laden(args.prefix):
        for n in range(20):
            for sg in abschnitte(l, n):
                i0, i1 = sg["i0"], sg["i1"]
                if sg["z"] == "inaktiv" and not args.alle:
                    continue
                kenn = "/".join(f"{a:05x}" for a in sorted(sg["an"]))[:60]
                print(f"{l.name},{n},{TYPNAME.get(l.typ(n, i0), hex(l.typ(n, i0)))},"
                      f"{l.s[n]['mx'][i0]},{l.frames[i0]},{l.frames[i1]},{i1 - i0 + 1},{sg['z']},"
                      f"{l.dx(n, i0)},{l.dx(n, i1)},{l.dz(n, i0)},{l.dz(n, i1)},{l.p['st'][i0]},"
                      f"{kenn},{sg['akt']}")


# --------------------------------------------------------------- aktivierung
def aktivierungen(l):
    out = []
    for n in range(20):
        s = l.s[n]
        for i in range(1, l.n):
            if s["st"][i] == 0:
                continue
            evs = []
            if s["st"][i - 1] == 0:
                evs.append("belegt")
            if s["s5"][i - 1] == 0 and s["s5"][i] == 1:
                evs.append("s5 0->1")
            if s["s5"][i - 1] == 1 and s["s5"][i] == 0 and s["st"][i - 1] != 0:
                evs.append("s5 1->0")
            if (s["st"][i] == 2 and s["a"][i] in (0x0A, 0x0E) and s["c"][i - 1] == 0
                    and s["c"][i] != 0 and s["st"][i - 1] != 0):
                evs.append("weckreiz")
            if s["st"][i - 1] == 2 and s["st"][i] == 1 and s["a"][i - 1] in (0x0A, 0x0E):
                evs.append("st 2->1")
            for ev in evs:
                out.append((n, i, ev))
        if s["st"][0] != 0:
            out.append((n, 0, "belegt (Start)"))
    out.sort(key=lambda e: (e[1], e[0]))
    return out


def cmd_aktivierung(args):
    print("lauf,frame,slot,typ,max_lp,ereignis,status,modus,x,x_minus_camx_vorher,x_minus_camx,"
          "camx,dx,dz,figur_x,rang")
    for l in laden(args.prefix):
        for n, i, ev in aktivierungen(l):
            s = l.s[n]
            j = max(i - 1, 0)
            print(f"{l.name},{l.frames[i]},{n},{TYPNAME.get(l.typ(n, i), hex(l.typ(n, i)))},"
                  f"{s['mx'][i]},{ev},{s['st'][i]}{s['s5'][i]},{s['a'][i]:#x},{s['x'][i]},"
                  f"{s['x'][j] - l.camx[j]},{s['x'][i] - l.camx[i]},{l.camx[i]},{l.dx(n, i)},"
                  f"{l.dz(n, i)},{l.p['x'][i]},{l.rang[i]}")


# --------------------------------------------------------------- annaeherung
def annaeherungen(l):
    """Gehabschnitte von WOOKY/EDDY, die direkt in Kampfhaltung oder Angriff
    uebergehen (Stillstand vor der Figur)."""
    out = []
    for n in range(20):
        segs = abschnitte(l, n)
        for k, sg in enumerate(segs):
            if sg["z"] != "gehen" or k + 1 >= len(segs):
                continue
            nx = segs[k + 1]
            if nx["z"] not in ("kampfhaltung", "angriff") or nx["i0"] != sg["i1"] + 1:
                continue
            t = l.typ(n, sg["i0"])
            if t not in (WOOKY, EDDY):
                continue
            i0, i1 = sg["i0"], sg["i1"]
            s = l.s[n]
            # Geschwindigkeit ueber die Gehframes (16.16, nur aus Abzuegen genau)
            fx = lambda i: s["x"][i] + s["xf"][i] / 65536
            fz = lambda i: s["z"][i] + s["zf"][i] / 65536
            dur = i1 - i0
            vx = (fx(i1) - fx(i0)) / dur if dur else 0
            vz = (fz(i1) - fz(i0)) / dur if dur else 0
            # Figur bewegt sich waehrend des Gehens?
            fig_bew = any(l.p["x"][i] != l.p["x"][i0] or l.p["z"][i] != l.p["z"][i0]
                          for i in range(i0, i1 + 1))
            stop = nx["i0"]
            # erster Angriff nach dem Stillstand
            erster = None
            for j, name in l.angriffsbeginne(n):
                if j >= stop:
                    zw = {l.zustand(n, q) for q in range(stop, j)}
                    if zw <= {"kampfhaltung"}:
                        erster = (j, name)
                    break
            lv = (s["x"][i1] + s["xf"][i1] / 65536) - (s["x"][i1 - 1] + s["xf"][i1 - 1] / 65536) if i1 > 0 else 0
            lz = (s["z"][i1] + s["zf"][i1] / 65536) - (s["z"][i1 - 1] + s["zf"][i1 - 1] / 65536) if i1 > 0 else 0
            mm = (lv * lv + 4 * lz * lz) ** 0.5
            tempo = "schnell" if mm > 2.0 else ("normal" if mm > 1.5 else "unklar")
            if l.quelle != "ram":
                tempo = "unklar"
            out.append({"slot": n, "typ": t, "von": i0, "bis": i1, "stop": stop, "tempo": tempo,
                        "vx": vx, "vz": vz, "dx0": l.dx(n, i0), "dz0": l.dz(n, i0),
                        "dx": l.dx(n, stop), "dz": l.dz(n, stop), "fig_bew": fig_bew,
                        "erster": erster, "p_st": l.p["st"][stop], "nach": nx["z"],
                        "mx": s["mx"][i0], "rang": l.rang[stop]})
    out.sort(key=lambda e: e["stop"])
    return out


def cmd_annaeherung(args):
    print("lauf,slot,typ,max_lp,gehen_von,stillstand,frames,vx,vz,dx_start,dz_start,"
          "dx_stillstand,dz_stillstand,figur_bewegt,figur_status,erster_angriff,"
          "frames_bis_angriff,rang,tempo_letzter_schritt")
    for l in laden(args.prefix):
        for e in annaeherungen(l):
            ea = e["erster"]
            print(f"{l.name},{e['slot']},{TYPNAME[e['typ']]},{e['mx']},{l.frames[e['von']]},"
                  f"{l.frames[e['stop']]},{e['stop'] - e['von']},{e['vx']:.4f},{e['vz']:.4f},"
                  f"{e['dx0']},{e['dz0']},{e['dx']},{e['dz']},{'ja' if e['fig_bew'] else 'nein'},"
                  f"{e['p_st']},{ea[1] if ea else ''},{ea[0] - e['stop'] if ea else ''},{e['rang']},"
                  f"{e['tempo']}")


# ------------------------------------------------------------------ angriffe
def angriffsliste(l):
    out = []
    for n in range(20):
        prev = None
        for i, name in l.angriffsbeginne(n):
            s = l.s[n]
            a0, a1 = l.ende_aktiv(n, i)
            # Pause: Kampfhaltung direkt davor
            j = i - 1
            while j >= 0 and l.zustand(n, j) == "kampfhaltung":
                j -= 1
            pause = i - 1 - j
            vor_z = l.zustand(n, j) if j >= 0 else ""
            # Abstand zum vorigen Angriff und was dazwischen lag
            zw, seit, seite = "", "", ""
            if prev is not None:
                seit = l.frames[i] - l.frames[prev[0]]
                zs = Counter(l.zustand(n, q) for q in range(prev[0], i))
                lag = any(l.p["st"][q] == 2 for q in range(prev[0], i))
                weg = max(abs(l.dx(n, q)) for q in range(prev[0], i)) - abs(l.dx(n, i))
                zw = "+".join(sorted(k for k in zs if k not in ("angriff", "erholung", "kampfhaltung")))
                if lag:
                    zw = (zw + "+" if zw else "") + "figur_lag"
                seite = "ja" if (l.dx(n, prev[0]) > 0) != (l.dx(n, i) > 0) else "nein"
            # Treffer auf die Figur waehrend der aktiven Frames
            # Schutz/Luft nur in aktiven Frames vor dem eigenen Treffer zaehlen
            # (danach ist die Figur wegen dieses Treffers geschuetzt bzw. fliegt)
            hit, hit_i, schutzf, luftf, liegf, schutzart = "", None, 0, 0, 0, ""
            if a0 is not None:
                for q in range(a0, min(a1 + 2, l.n)):
                    dmg, k = l.treffer_auf_figur(q)
                    if dmg and k == n and not hit:
                        hit, hit_i = f"{l.frames[q]}:{dmg}", q
                for q in range(a0, a1 + 1):
                    if hit_i is not None and q >= hit_i:
                        break
                    if l.p["st"][q - 1] == 3:
                        schutzf += 1
                        if not schutzart:
                            schutzart = "aufstehen" if l.p["t69"][q - 1] > 0 else "trefferreaktion"
                    liegf += l.p["st"][q - 1] == 2
                    luftf += l.luft(q - 1)
            out.append({"slot": n, "i": i, "name": name, "typ": l.typ(n, i), "kenn": s["an"][i],
                        "a0": a0, "a1": a1, "pause": pause, "vor": vor_z, "seit": seit,
                        "zw": zw, "seite": seite, "dx": l.dx(n, i), "dz": l.dz(n, i),
                        "p_st": l.p["st"][i], "p_luft": l.luft(i), "hit": hit,
                        "schutzf": schutzf, "luftf": luftf, "liegf": liegf,
                        "schutzart": schutzart, "p_t69": l.p["t69"][i],
                        "attr": s["at"][a0] if a0 is not None else 0,
                        "mx": s["mx"][i], "rang": l.rang[i],
                        "nkampf": sum(l.kampffaehig(m, i) for m in range(20))})
            prev = (i, name)
    out.sort(key=lambda e: (e["i"], e["slot"]))
    return out


def cmd_angriffe(args):
    print("lauf,frame,slot,typ,max_lp,angriff,kennung,attr,erster_aktiver_frame,aktive_frames,"
          "pause_haltung,davor,seit_vorigem,dazwischen,seitenwechsel,dx,dz,figur_status,"
          "figur_in_luft,aktiv_im_schutz,schutzart,aktiv_figur_liegt,aktiv_in_luft,treffer,rang,"
          "gegner_kampffaehig")
    for l in laden(args.prefix):
        for e in angriffsliste(l):
            a0, a1 = e["a0"], e["a1"]
            print(f"{l.name},{l.frames[e['i']]},{e['slot']},{TYPNAME[e['typ']]},{e['mx']},"
                  f"{e['name']},{e['kenn']:05x},{e['attr']:#06x},"
                  f"{l.frames[a0] - l.frames[e['i']] if a0 is not None else ''},"
                  f"{a1 - a0 + 1 if a0 is not None else 0},{e['pause']},{e['vor']},{e['seit']},"
                  f"{e['zw']},{e['seite']},{e['dx']},{e['dz']},{e['p_st']},"
                  f"{'ja' if e['p_luft'] else 'nein'},{e['schutzf']},{e['schutzart']},{e['liegf']},"
                  f"{e['luftf']},{e['hit']},"
                  f"{e['rang']},{e['nkampf']}")


# ------------------------------------------------------------------ reaktion
def eingabe_abschnitte(l):
    """Abschnitte gleicher Richtungseingabe (ohne Angriff/Sprung)."""
    segs, cur = [], None
    for i, f in enumerate(l.frames):
        inp = l.inputs.get(f, "")
        r = "+".join(sorted(k for k in inp.split("|") if k in ("left", "right", "up", "down")))
        if cur and cur[2] == r and i == cur[1] + 1:
            cur[1] = i
        else:
            cur = [i, i, r]
            segs.append(cur)
    return [s for s in segs if s[2]]


def naechster(l, i, nur=None):
    best = None
    for n in range(20):
        if not l.kampffaehig(n, i) or l.typ(n, i) not in (WOOKY, EDDY):
            continue
        if nur is not None and n != nur:
            continue
        d = abs(l.dx(n, i)) + 2 * abs(l.dz(n, i))
        if best is None or d < best[0]:
            best = (d, n)
    return best[1] if best else None


def griff_aktiv(l, i):
    """Figur haelt einen Gegner (Gegner S+4 2/3 mit Aktion 0x02)."""
    return any(l.s[n]["st"][i] in (2, 3) and l.s[n]["a"][i] == 2 and l.s[n]["s5"][i] == 1
               for n in range(20))


def cmd_weglauf(args):
    """B1: je Eingabeabschnitt links/rechts (>= 60 Frames) der naechste WOOKY/EDDY.
    Gezaehlt werden nur Frames, in denen die Figur wirklich laeuft (|dx Figur| >= 1,5
    px/Frame). Ausgabe: Laufframes, Gehframes des Gegners, seine mittlere
    Geschwindigkeit in x (Richtung Figur positiv), |dx| am Anfang, am Ende, min/max,
    Angriffe; danach (Figur steht wieder) Frames bis zur naechsten Kampfhaltung."""
    print("lauf,von,bis,richtung,slot,typ,laufframes,gegner_gehen,gegner_vx_zur_figur,"
          "absdx_anfang,absdx_ende,absdx_min,absdx_max,angriffe,"
          "frames_bis_kampfhaltung_danach,absdx_dann,zustand_beim_start,gehframes_bis_halt")
    for l in laden(args.prefix):
        angr = angriffsliste(l)
        for i0, i1, r in eingabe_abschnitte(l):
            if r not in ("left", "right") or i1 - i0 < 59:
                continue
            k0 = next((i for i in range(i0, i1 + 1) if naechster(l, i) is not None), None)
            if k0 is None:
                continue
            n = naechster(l, k0)
            lauf = [i for i in range(k0 + 1, i1 + 2) if i < l.n
                    and abs(l.p["x"][i] + l.p["xf"][i] / 65536 - l.p["x"][i - 1]
                            - l.p["xf"][i - 1] / 65536) >= 1.5]
            if not lauf:
                continue
            geh = [i for i in lauf if l.zustand(n, i) == "gehen"]
            vx = []
            for i in geh:
                v = (l.s[n]["x"][i] + l.s[n]["xf"][i] / 65536) - (l.s[n]["x"][i - 1] + l.s[n]["xf"][i - 1] / 65536)
                vx.append(v if l.dx(n, i - 1) < 0 else -v)
            ad = [abs(l.dx(n, i)) for i in lauf]
            na = sum(1 for e in angr if e["slot"] == n and lauf[0] <= e["i"] <= lauf[-1])
            nach, dxn = "", ""
            for i in range(lauf[-1] + 1, min(lauf[-1] + 600, l.n)):
                if l.zustand(n, i) in ("kampfhaltung", "angriff"):
                    nach, dxn = i - lauf[-1], abs(l.dx(n, i))
                    break
            # Gehframes ab Fluchtbeginn bis zum ersten Halt (Abschnitt ohne Gehen von
            # mindestens 3 Frames, nachdem er losgegangen ist; Luecken < 3 F zaehlen mit)
            gb, los, luecke = 0, False, 0
            for i in range(lauf[0], min(lauf[0] + 400, l.n)):
                if l.zustand(n, i) == "gehen":
                    gb += 1 + (luecke if los else 0)
                    los, luecke = True, 0
                elif los:
                    luecke += 1
                    if luecke >= 3:
                        break
            print(f"{l.name},{l.frames[i0]},{l.frames[i1]},{r},{n},{TYPNAME[l.typ(n, i0)]},"
                  f"{len(lauf)},{len(geh)},{statistics.mean(vx) if vx else 0:.3f},"
                  f"{ad[0]},{ad[-1]},{min(ad)},{max(ad)},{na},{nach},{dxn},"
                  f"{l.zustand(n, lauf[0] - 1)},{gb}")


def cmd_tiefe(args):
    """B2: je Tiefenschritt der Figur (Eingabe hoch/runter) der naechste WOOKY/EDDY.
    reaktion = Frames vom Beginn des Schritts bis der Gegner die Kampfhaltung
    verlaesst (nur wenn er beim Beginn in Kampfhaltung stand; "angriff", wenn er
    stattdessen zuerst angreift), dz_bei_reaktion =
    Tiefenabstand in diesem Frame; wieder_bereit = Frames vom Ende des Schritts bis
    er wieder in Kampfhaltung oder Angriff mit |dz| <= 11 steht; dazu Angriffe, die
    mit |dz| > 11 beginnen (ins Leere). Gewertet (wertung = ja), wenn nach dem
    Schritt |dz| > 11 ist und kein Griff im Fenster liegt."""
    print("lauf,von,bis,eingabe,slot,typ,absdx,dz_vorher,dz_nachher,zustand_beginn,zustand_ende,"
          "reaktion,dz_bei_reaktion,wieder_bereit,angriffe_ausser_tiefe,griff,wertung,"
          "frame_absdz11,frame_absdz12,zustand_bei_12,kennung_bei_12,figur_frei_bis_12,"
          "gehen_ab,dz_bei_gehen,gehen_nach_12,aktiv_nach_12,naechster_angriff_nach_schritt,"
          "dz_beim_naechsten_angriff")
    for l in laden(args.prefix):
        angr = angriffsliste(l)
        for i0, i1, r in eingabe_abschnitte(l):
            if r not in ("up", "down"):
                continue
            n = naechster(l, i0)
            if n is None:
                continue
            e = min(i1 + 1, l.n - 1)
            dz1 = l.dz(n, e)
            grf = any(griff_aktiv(l, i) for i in range(i0, min(e + 200, l.n)))
            z0 = l.zustand(n, i0)
            reak = dzr = ""
            if z0 == "kampfhaltung":
                for i in range(i0 + 1, min(e + 200, l.n)):
                    zi = l.zustand(n, i)
                    if zi == "angriff":
                        reak = "angriff"
                        break
                    if zi != z0:
                        reak, dzr = l.frames[i] - l.frames[i0], l.dz(n, i)
                        break
            bereit = ""
            ende = min(e + 600, l.n)
            for i in range(e, ende):
                if l.p["st"][i] != 1 and i > e:
                    break
                if l.zustand(n, i) in ("kampfhaltung", "angriff") and abs(l.dz(n, i)) <= 11:
                    bereit = l.frames[i] - l.frames[e]
                    break
            leer = sum(1 for a in angr if a["slot"] == n and i0 <= a["i"] < ende and abs(a["dz"]) > 11)
            wertung = "ja" if abs(dz1) > 11 and not grf else "nein"
            # erster Frame mit |dz| >= 11 bzw. >= 12 ab Beginn des Schritts
            f11 = next((i for i in range(i0, min(e + 60, l.n)) if abs(l.dz(n, i)) >= 11), None)
            f12 = next((i for i in range(i0, min(e + 60, l.n)) if abs(l.dz(n, i)) >= 12), None)
            z12 = k12 = frei = gab = dzg = gn12 = akt12 = ""
            if f12 is not None:
                z12, k12 = l.zustand(n, f12), f"{l.s[n]['an'][f12]:05x}"
                frei = "ja" if all(l.p["st"][i] == 1 for i in range(i0, f12 + 1)) else "nein"
                g = next((i for i in range(i0, min(f12 + 200, l.n)) if l.zustand(n, i) == "gehen"
                          and l.zustand(n, i - 1) != "gehen"), None)
                if g is not None:
                    gab, dzg, gn12 = l.frames[g], l.dz(n, g), g - f12
                akt12 = sum(1 for i in range(f12, min(f12 + 40, l.n)) if aktiv_attr(l.s[n]["at"][i])
                            and (g is None or i < g))
            na = next((a for a in angr if a["slot"] == n and a["i"] > e), None)
            nan = (l.frames[na["i"]] - l.frames[e]) if na else ""
            dzn = na["dz"] if na else ""
            print(f"{l.name},{l.frames[i0]},{l.frames[i1]},{r},{n},{TYPNAME[l.typ(n, i0)]},"
                  f"{abs(l.dx(n, e))},{l.dz(n, i0)},{dz1},{z0},{l.zustand(n, e)},{reak},{dzr},"
                  f"{bereit},{leer},{'ja' if grf else 'nein'},{wertung},"
                  f"{l.frames[f11] if f11 is not None else ''},{l.frames[f12] if f12 is not None else ''},"
                  f"{z12},{k12},{frei},{gab},{dzg},{gn12},{akt12},{nan},{dzn}")


def cmd_sprung(args):
    """B3: je Sprung der Figur (Aktion 0x0A): naechster WOOKY/EDDY, |dx| beim
    Absprung, Angriffsbeginne waehrend des Sprungs (Figur in der Luft), aktive
    Frames mit Figur in der Luft, Treffer in der Luft; Zustand des Gegners."""
    print("lauf,absprung,landung,slot,typ,absdx_absprung,absdz,zustand_gegner,"
          "angriffsbeginne_in_luft,aktive_frames_in_luft,treffer_in_luft")
    for l in laden(args.prefix):
        angr = angriffsliste(l)
        i = 1
        while i < l.n:
            if l.p["h"][i] > 0 and l.p["h"][i - 1] <= 0 and l.p["act"][i] == 0x0A:
                j = i
                while j < l.n and l.p["h"][j] > 0:
                    j += 1
                n = naechster(l, i)
                if n is not None:
                    beg = [a for a in angr if i <= a["i"] < j]
                    akt = 0
                    for a in angr:
                        if a["a0"] is None:
                            continue
                        akt += sum(1 for q in range(a["a0"], a["a1"] + 1) if i <= q < j)
                    hit = sum(1 for q in range(i, min(j + 1, l.n)) if l.treffer_auf_figur(q)[0])
                    print(f"{l.name},{l.frames[i]},{l.frames[j - 1]},{n},{TYPNAME[l.typ(n, i)]},"
                          f"{abs(l.dx(n, i))},{abs(l.dz(n, i))},{l.zustand(n, i)},{len(beg)},{akt},{hit}")
                i = j
            i += 1


def schutzfenster(l):
    """Schutzfenster der Figur: Folgen von P+4 = 3, an jedem LP-Verlust geteilt (ein
    Treffer im Frame des Ablaufs startet sofort ein neues Fenster, im Abzug steht
    dann durchgehend 3). Liefert (i0, i1, art, treffer_am_ende)."""
    out = []
    i = 1
    while i < l.n:
        if l.p["st"][i] == 3 and l.p["st"][i - 1] != 3:
            art = "aufstehen" if l.p["st"][i - 1] == 2 else "trefferreaktion"
            j = i
            while j + 1 < l.n and l.p["st"][j + 1] == 3:
                if l.treffer_auf_figur(j + 1)[0]:
                    out.append((i, j, art, True))
                    i, art = j + 1, "trefferreaktion"
                j += 1
            if j + 1 >= l.n:
                break
            out.append((i, j, art, bool(l.treffer_auf_figur(j + 1)[0])))
            i = j + 1
        i += 1
    return out


def cmd_schutz(args):
    """B4: je Schutzfenster der Figur (P+4 = 3; Art aufstehen, wenn davor P+4 = 2,
    sonst trefferreaktion): Laenge, WOOKY/EDDY mit |dx| <= 70 und |dz| <= 11 im
    Fenster, Angriffe, die im Fenster beginnen, deren aktive Frames (S+0x24) im
    Fenster und ob der erste Frame nach dem Fenster einen Treffer bringt."""
    print("lauf,von,bis,frames,art,gegner_nah,angriffsbeginne,aktive_frames,treffer_beim_ablauf")
    for l in laden(args.prefix):
        angr = angriffsliste(l)
        for i, j, art, hit in schutzfenster(l):
            nah = {n for q in range(i, j + 1) for n in range(20)
                   if l.kampffaehig(n, q) and l.typ(n, q) in (WOOKY, EDDY)
                   and abs(l.dx(n, q)) <= 70 and abs(l.dz(n, q)) <= 11}
            if j == i:
                continue  # 1 Frame Status 3 beim Umwerfen (danach 2), kein Schutzfenster
            # nur Angriffe, die im Fenster beginnen (nicht der Angriff, der es ausgeloest hat)
            im = [a for a in angr if i < a["i"] <= j]
            akt = 0
            for a in im:
                if a["a0"] is not None:
                    akt += sum(1 for q in range(a["a0"], a["a1"] + 1) if i < q <= j)
            print(f"{l.name},{l.frames[i]},{l.frames[j]},{j - i + 1},{art},{len(nah)},{len(im)},{akt},"
                  f"{'ja' if hit else 'nein'}")


# -------------------------------------------------------------------- gruppe
def gruppen_klasse(l, n, i):
    z = l.zustand(n, i)
    if z in ("getroffen", "liegt"):
        return "getroffen/liegt"
    if z in ("kampfhaltung", "erholung"):
        return "kampfhaltung/erholung"
    return z


def cmd_gruppe(args):
    """C: Frames mit mindestens 3 kampffaehigen Gegnern (S+4 1/3, S+5 1, ab --ab).
    Angriff = Zustand "angriff" (Ausholen bis Ende der Schlaganimation; WOOKY/EDDY
    per Kennung, andere Typen nur aktive Frames S+0x24). Ausgabe je Lauf: Zahl gleichzeitig
    angreifender Gegner, Zustand und |dx| der uebrigen, Seiten (Gegner mit
    |dx| <= 70 links und rechts der Figur), Angriffe von beiden Seiten (zwei
    Angriffe verschiedener Seiten mit Beginn hoechstens 60 Frames auseinander) und
    Abstand zwischen aufeinanderfolgenden Angriffsbeginnen verschiedener Gegner."""
    print("lauf,groesse,wert,anzahl")
    for l in laden(args.prefix):
        ab = args.ab
        angr = angriffsliste(l)
        gleich, aktivn, klassen, beide_nah = Counter(), Counter(), Counter(), 0
        dx_kl = defaultdict(list)
        frames3 = 0
        for i in range(l.n):
            if l.frames[i] < ab:
                continue
            kf = [n for n in range(20) if l.kampffaehig(n, i)]
            if len(kf) < 3:
                continue
            frames3 += 1
            att = [n for n in kf if l.zustand(n, i) == "angriff"
                   or (l.typ(n, i) not in (WOOKY, EDDY) and aktiv_attr(l.s[n]["at"][i]))]
            gleich[len(att)] += 1
            aktivn[sum(aktiv_attr(l.s[n]["at"][i]) for n in kf)] += 1
            for n in kf:
                if n not in att:
                    k = gruppen_klasse(l, n, i)
                    klassen[k] += 1
                    dx_kl[k].append(abs(l.dx(n, i)))
            nah = [l.dx(n, i) for n in kf if abs(l.dx(n, i)) <= 70 and abs(l.dz(n, i)) <= 11]
            if any(d > 0 for d in nah) and any(d <= 0 for d in nah):
                beide_nah += 1
        print(f"{l.name},frames_mit_3_oder_mehr,,{frames3}")
        for k in sorted(gleich):
            print(f"{l.name},gleichzeitig_im_angriff,{k},{gleich[k]}")
        for k in sorted(aktivn):
            print(f"{l.name},gleichzeitig_aktiv_s24,{k},{aktivn[k]}")
        for k in sorted(klassen):
            print(f"{l.name},uebrige_zustand,{k} (absdx {fmt_mmm(dx_kl[k])}),{klassen[k]}")
        print(f"{l.name},frames_gegner_nah_auf_beiden_seiten,,{beide_nah}")
        # Angriffe (Beginn) mit >= 3 kampffaehigen Gegnern, nach Seite
        a3 = [e for e in angr if l.frames[e["i"]] >= ab and e["nkampf"] >= 3]
        beid = sum(1 for x, y in zip(a3, a3[1:])
                   if x["slot"] != y["slot"] and (x["dx"] > 0) != (y["dx"] > 0)
                   and y["i"] - x["i"] <= 60)
        print(f"{l.name},angriffe_mit_3_oder_mehr,,{len(a3)}")
        print(f"{l.name},davon_von_rechts,,{sum(e['dx'] > 0 for e in a3)}")
        print(f"{l.name},folgeangriff_andere_seite_binnen_60,,{beid}")
        abst = [y["i"] - x["i"] for x, y in zip(a3, a3[1:]) if x["slot"] != y["slot"]]
        print(f"{l.name},zweiter_angreifer_nach_frames,{fmt_mmm(abst)},{len(abst)}")
        verteil = Counter(min(a // 10 * 10, 100) for a in abst)
        for k in sorted(verteil):
            print(f"{l.name},zweiter_angreifer_klasse,{k}-{k + 9 if k < 100 else ''},{verteil[k]}")


def geh_art(l, n, sg):
    """Gehabschnitt einordnen: seitenwechsel (Vorzeichen von dx wechselt),
    annaehern / zurueckweichen (|dx| -10 / +10 oder mehr), sonst seitlich (Tiefe)."""
    d0, d1 = l.dx(n, sg["i0"]), l.dx(n, sg["i1"])
    if (d0 > 0) != (d1 > 0) and min(abs(d0), abs(d1)) > 0:
        return "gehen:seitenwechsel"
    if abs(d1) <= abs(d0) - 10:
        return "gehen:annaehern"
    if abs(d1) >= abs(d0) + 10:
        return "gehen:zurueckweichen"
    return "gehen:seitlich"


def cmd_uebergaenge(args):
    """Zustandswechsel von WOOKY/EDDY (aus den Abschnitten der Zeitachse; Gehen
    nach Art getrennt): Anzahl, Dauer des Ausgangszustands, |dx| und |dz| beim
    Wechsel, haeufigster Status der Figur beim Wechsel."""
    t = defaultdict(lambda: {"n": 0, "dauer": [], "dx": [], "dz": [], "fig": Counter()})
    for l in laden(args.prefix):
        for n in range(20):
            segs = [sg for sg in abschnitte(l, n)]
            for sg in segs:
                if sg["z"] == "gehen":
                    sg["z"] = geh_art(l, n, sg)
            for x, y in zip(segs, segs[1:]):
                if y["i0"] != x["i1"] + 1 or l.typ(n, x["i0"]) not in (WOOKY, EDDY):
                    continue
                if x["z"] in ("inaktiv", "frei") or y["z"] in ("inaktiv", "frei"):
                    continue
                k = (TYPNAME[l.typ(n, x["i0"])], x["z"], y["z"])
                e = t[k]
                e["n"] += 1
                e["dauer"].append(x["i1"] - x["i0"] + 1)
                e["dx"].append(abs(l.dx(n, y["i0"])))
                e["dz"].append(abs(l.dz(n, y["i0"])))
                e["fig"][l.p["st"][y["i0"]]] += 1
    print("typ,von,nach,anzahl,dauer_von,absdx_beim_wechsel,absdz_beim_wechsel,figur_status")
    for k in sorted(t, key=lambda k: (k[0], k[1], -t[k]["n"])):
        e = t[k]
        if e["n"] < args.min:
            continue
        fig = " ".join(f"{a}:{b}" for a, b in e["fig"].most_common())
        print(f"{k[0]},{k[1]},{k[2]},{e['n']},{fmt_mmm(e['dauer'])},{fmt_mmm(e['dx'])},"
              f"{fmt_mmm(e['dz'])},{fig}")


def cmd_dauern(args):
    """Dauer der Zustandsabschnitte von WOOKY/EDDY (Gehen nach Art getrennt):
    Min/Median/Max und die haeufigsten Werte. Abschnitte am Laufende zaehlen nicht."""
    t = defaultdict(list)
    for l in laden(args.prefix):
        for n in range(20):
            segs = abschnitte(l, n)
            for sg in segs[:-1]:
                if l.typ(n, sg["i0"]) not in (WOOKY, EDDY) or sg["z"] in ("inaktiv",):
                    continue
                z = geh_art(l, n, sg) if sg["z"] == "gehen" else sg["z"]
                t[(TYPNAME[l.typ(n, sg["i0"])], z)].append(sg["i1"] - sg["i0"] + 1)
    print("typ,zustand,dauer,haeufigste_werte")
    for k in sorted(t):
        v = t[k]
        top = " ".join(f"{a}:{b}" for a, b in Counter(v).most_common(8))
        print(f"{k[0]},{k[1]},{fmt_mmm(v)},{top}")


def cmd_aktivitaet(args):
    """Je Lauf und Gegnertyp: Angriffe je 1000 Frames, Anteil der Frames je Zustand
    des naechsten WOOKY/EDDY, Median |dx|, Anteil |dx| <= 60; Figur liegt/springt.
    Gezaehlt nur Frames mit mindestens einem kampffaehigen WOOKY/EDDY."""
    print("lauf,frames,figur_liegt,figur_in_luft,angriffe_je_1000,absdx_median,anteil_absdx_bis_60,"
          "zustaende_naechster_gegner,je_1000_frame_1_3000,je_1000_ab_3001,"
          "wooky_je_1000,eddy_je_1000,eddy_je_1000_f1_3000,eddy_je_1000_ab_3001,eddy_allein_je_1000,"
          "anteil_frames_mehrere_gegner")
    for l in laden(args.prefix):
        angr = angriffsliste(l)
        fr, liegt, luft, ad, zs = 0, 0, 0, [], Counter()
        for i in range(l.n):
            n = naechster(l, i)
            if n is None:
                continue
            fr += 1
            liegt += l.p["st"][i] == 2
            luft += l.p["act"][i] == 0x0A
            ad.append(abs(l.dx(n, i)))
            zs[l.zustand(n, i)] += 1
        if not fr:
            continue
        na = len(angr)
        zt = " ".join(f"{k}:{100 * v / fr:.0f}%" for k, v in zs.most_common())
        # Raten in festen Fenstern (Frames mit kampffaehigem WOOKY/EDDY)
        raten = []
        for lo, hi in ((1, 3000), (3001, 10 ** 9)):
            fw = sum(1 for i in range(l.n) if lo <= l.frames[i] <= hi and naechster(l, i) is not None)
            aw = sum(1 for a in angr if lo <= l.frames[a["i"]] <= hi)
            raten.append(f"{1000 * aw / fw:.1f}" if fw >= 500 else "")
        # je Typ: Angriffe dieses Typs je 1000 Frames, in denen ein Gegner dieses Typs
        # kampffaehig ist; "allein": nur Frames mit genau einem kampffaehigen Gegner
        def typrate(t, lo=1, hi=10 ** 9, allein=False):
            fw = 0
            for i in range(l.n):
                if not lo <= l.frames[i] <= hi:
                    continue
                kf = [m for m in range(20) if l.kampffaehig(m, i)]
                if any(l.typ(m, i) == t for m in kf) and (not allein or len(kf) == 1):
                    fw += 1
            aw = 0
            for a in angr:
                if a["typ"] != t or not lo <= l.frames[a["i"]] <= hi:
                    continue
                if allein and sum(l.kampffaehig(m, a["i"]) for m in range(20)) != 1:
                    continue
                aw += 1
            return f"{1000 * aw / fw:.1f}" if fw >= 500 else ""
        mehr = sum(1 for i in range(l.n) if sum(l.kampffaehig(m, i) for m in range(20)) >= 2)
        print(f"{l.name},{fr},{100 * liegt / fr:.0f}%,{100 * luft / fr:.0f}%,{1000 * na / fr:.1f},"
              f"{med(ad)},{100 * sum(d <= 60 for d in ad) / fr:.0f}%,{zt},{raten[0]},{raten[1]},"
              f"{typrate(WOOKY)},{typrate(EDDY)},{typrate(EDDY, 1, 3000)},{typrate(EDDY, 3001)},"
              f"{typrate(EDDY, allein=True)},{100 * mehr / l.n:.0f}%")


# -------------------------------------------------------------------- wellen
def cmd_wellen(args):
    """Lebenslauf jedes Gegners: belegt (Frame, Kamera-x), S+5 -> 1, S+4 2 -> 1
    (Aufwachen), Tod (Slot frei nach LP <= 0) mit der Zahl der Toten davor.
    Dazu Kamerastillstaende (Kamera-x >= 60 Frames gleich, Figur am rechten
    Bildrand x - Kamera >= 300) mit der Zahl lebender Gegner."""
    print("lauf,slot,typ,max_lp,belegt_frame,belegt_camx,x_beim_belegen,s5_frame,s5_camx,"
          "s5_x_minus_camx,aufwachen_frame,aufwachen_camx,aufwachen_dx,frei_frame,tod,"
          "tote_vor_belegen,tote_vor_s5,lebende_beim_belegen,dolg_lp_vorframe")
    for l in laden(args.prefix):
        leben = []
        for n in range(20):
            cur = None
            for i in range(l.n):
                st, s5 = l.s[n]["st"][i], l.s[n]["s5"][i]
                if st != 0 and (cur is None):
                    cur = {"n": n, "i0": i, "typ": l.typ(n, i), "mx": l.s[n]["mx"][i],
                           "s5": i if s5 == 1 else None, "auf": None, "frei": None, "minlp": 99}
                    leben.append(cur)
                if cur is None:
                    continue
                if st == 0:
                    cur["frei"] = i
                    cur = None
                    continue
                cur["minlp"] = min(cur["minlp"], l.s[n]["lp"][i])
                if cur["s5"] is None and s5 == 1:
                    cur["s5"] = i
                if (cur["auf"] is None and i > 0 and l.s[n]["st"][i - 1] == 2 and st == 1
                        and l.s[n]["a"][i - 1] in (0x0A, 0x0E)):
                    cur["auf"] = i
        tode = sorted(e["frei"] for e in leben if e["frei"] is not None and e["minlp"] <= 0)

        def dolg_lp(i):
            if i < 0:
                return ""
            for m in range(20):
                if l.typ(m, i) == 0x46DA4 and l.s[m]["s5"][i] == 1 and l.s[m]["st"][i] != 0:
                    return l.s[m]["lp"][i]
            return ""

        def lebende(i):
            return sum(1 for m in range(20) if l.kampffaehig(m, i) and l.typ(m, i) != 0x46DA4)
        for e in sorted(leben, key=lambda e: e["i0"]):
            n = e["n"]
            def f(i):
                return l.frames[i] if i is not None else ""
            tot = e["frei"] is not None and e["minlp"] <= 0
            print(f"{l.name},{n},{TYPNAME.get(e['typ'], hex(e['typ']))},{e['mx']},{f(e['i0'])},"
                  f"{l.camx[e['i0']]},{l.s[n]['x'][e['i0']]},{f(e['s5'])},"
                  f"{l.camx[e['s5']] if e['s5'] is not None else ''},"
                  f"{l.s[n]['x'][e['s5']] - l.camx[e['s5']] if e['s5'] is not None else ''},"
                  f"{f(e['auf'])},{l.camx[e['auf']] if e['auf'] is not None else ''},"
                  f"{l.dx(n, e['auf']) if e['auf'] is not None else ''},{f(e['frei'])},"
                  f"{'ja' if tot else 'nein'},{sum(t <= e['i0'] for t in tode)},"
                  f"{sum(t <= e['s5'] for t in tode) if e['s5'] is not None else ''},"
                  f"{lebende(max(e['i0'] - 1, 0))},{dolg_lp(e['i0'] - 1)}")
        # Kamerastillstaende
        i = 0
        while i < l.n:
            j = i
            while j + 1 < l.n and l.camx[j + 1] == l.camx[i]:
                j += 1
            rand = sum(l.p["x"][q] - l.camx[q] >= 300 for q in range(i, j + 1))
            if j - i >= 60 and rand >= 30:
                lebend = [sum(l.kampffaehig(n, q) for n in range(20)) for q in (i, j)]
                print(f"{l.name},kamera,stillstand,,{l.frames[i]},{l.camx[i]},,{l.frames[j]},,,,,,"
                      f"frames={j - i + 1} figur_am_rand={rand} kampffaehig_anfang={lebend[0]} "
                      f"kampffaehig_ende={lebend[1]},,{sum(t <= i for t in tode)},"
                      f"{sum(t <= j for t in tode)}")
            i = j + 1


# ------------------------------------------------------------------- katalog
def cmd_katalog(args):
    cat = defaultdict(lambda: {"n": 0, "a": Counter(), "akt": Counter(), "dur": Counter(),
                               "vor": Counter(), "nach": Counter()})
    for l in laden(args.prefix):
        for n in range(20):
            s = l.s[n]
            last, start = None, None
            for i in range(l.n):
                if s["st"][i] == 0 or s["s5"][i] == 0:
                    last = None
                    continue
                k = (l.typ(n, i), s["an"][i])
                c = cat[k]
                c["n"] += 1
                c["a"][s["a"][i]] += 1
                if aktiv_attr(s["at"][i]):
                    c["akt"][s["at"][i]] += 1
                if last != k:
                    if last is not None and last[0] == k[0]:
                        cat[last]["nach"][k[1]] += 1
                        cat[last]["dur"][i - start] += 1
                        c["vor"][last[1]] += 1
                    start = i
                last = k
    print("typ,kennung,kategorie,frames,modus_s0a,attr_aktiv,dauern,vorgaenger,nachfolger")
    for (t, an), c in sorted(cat.items()):
        if t not in (WOOKY, EDDY) and not args.alle:
            continue
        def top(cn, k=3, h=True):
            return " ".join((f"{a:05x}" if h else f"{a:#x}") + f":{b}" for a, b in cn.most_common(k))
        print(f"{TYPNAME.get(t, hex(t))},{an:05x},{ANIM.get(t, {}).get(an, '?')},{c['n']},"
              f"{top(c['a'], h=False)},{top(c['akt'], h=False)},"
              f"{' '.join(f'{a}:{b}' for a, b in c['dur'].most_common(3))},"
              f"{top(c['vor'])},{top(c['nach'])}")


def cmd_vergleich(args):
    """Zwei Laeufe mit gleichen Eingaben (z. B. mit und ohne LP-Auffuellen):
    erster Frame, in dem sich ein Gegnerslot (S+4, S+5, x, Tiefe, Kennung)
    unterscheidet, erster Frame mit anderen LP der Figur und erster Frame, in dem
    die Figur im Lauf ohne Auffuellen stirbt (LP < 0)."""
    a, b = laden(args.prefix)
    n = min(a.n, b.n)
    gegner = next((a.frames[i] for i in range(n) if any(
        a.s[k][f][i] != b.s[k][f][i] for k in range(20) for f in ("st", "s5", "x", "z", "an"))), "")
    lp = next((a.frames[i] for i in range(n) if a.p["lp"][i] != b.p["lp"][i]), "")
    tod = next((x.frames[i] for x in (a, b) for i in range(n) if x.p["lp"][i] < 0), "")
    print("lauf_a,lauf_b,frames,erste_abweichung_gegner,erste_abweichung_lp_figur,tod_figur")
    print(f"{a.name},{b.name},{n},{gegner},{lp},{tod}")


def cmd_schwelle(args):
    """A1 (EINGRIFF CC_KSTUFEN): je Gegnerslot und Stufe k = x - Kamera (mindestens 3
    Frames gleich, Kamera steht): S+5 am Ende der Stufe und ob in der Stufe der
    Weckreiz (S+0x0C 0 -> ungleich 0 bei lauerndem Gegner) kam."""
    print("lauf,slot,typ,status,k,von,bis,frames,s5_ende,weckreiz_in_stufe")
    for l in laden(args.prefix):
        for n in range(20):
            s = l.s[n]
            i = 1
            while i < l.n:
                k = s["x"][i] - l.camx[i]
                j = i
                while (j + 1 < l.n and s["x"][j + 1] - l.camx[j + 1] == k
                       and l.camx[j + 1] == l.camx[i] and s["st"][j + 1] != 0):
                    j += 1
                if j - i >= 2 and s["st"][i] != 0 and (-90 <= k <= -40 or 370 <= k <= 460):
                    weck = any(s["c"][q - 1] == 0 and s["c"][q] != 0 and s["st"][q] == 2
                               for q in range(i, j + 1))
                    print(f"{l.name},{n},{TYPNAME.get(l.typ(n, i), hex(l.typ(n, i)))},"
                          f"{s['st'][i]}{s['s5'][i]},{k},{l.frames[i]},{l.frames[j]},{j - i + 1},"
                          f"{s['s5'][j]},{'ja' if weck else 'nein'}")
                i = j + 1


# ---------------------------------------------------------- zusammenfassung
def cmd_zusammenfassung(args):
    """Min/Median/Max aller Groessen des Verhaltensmodells ueber die angegebenen
    Laeufe (Grundlage der Tabelle im Entwurf). Zeilen: bereich, typ, groesse,
    statistik (n = Zahl der Beobachtungen)."""
    laeufe = laden(args.prefix)
    z = defaultdict(list)       # (bereich, typ, groesse) -> Werte
    zaehl = defaultdict(Counter)  # (bereich, typ, groesse) -> Zaehler
    laeufe_je = defaultdict(set)

    def add(b, t, g, v, l):
        z[(b, t, g)].append(v)
        laeufe_je[(b, t, g)].add(l.name)

    def cnt(b, t, g, k, l):
        zaehl[(b, t, g)][k] += 1
        laeufe_je[(b, t, g)].add(l.name)

    for l in laeufe:
        # Aktivierung
        for n, i, ev in aktivierungen(l):
            if i == 0:
                continue
            t = TYPNAME.get(l.typ(n, i), hex(l.typ(n, i)))
            s = l.s[n]
            if ev == "s5 0->1" and s["st"][i - 1] != 0:
                g = "rechts" if s["x"][i] - l.camx[i] > 200 else "links"
                add("aktivierung", t, f"s5_0_1 x-kamera vorher ({g})", s["x"][i - 1] - l.camx[i - 1], l)
                add("aktivierung", t, f"s5_0_1 x-kamera ({g})", s["x"][i] - l.camx[i], l)
            if ev == "s5 1->0":
                g = "rechts" if s["x"][i] - l.camx[i] > 200 else "links"
                add("aktivierung", t, f"s5_1_0 x-kamera ({g})", s["x"][i] - l.camx[i], l)
                add("aktivierung", t, f"s5_1_0 x-kamera vorher ({g})", s["x"][i - 1] - l.camx[i - 1], l)
            if ev == "weckreiz":
                art = "versteckt" if s["a"][i] == 0x0E else "hockend"
                add("aktivierung", t, f"weckreiz x-kamera ({art})", s["x"][i] - l.camx[i], l)
                add("aktivierung", t, f"weckreiz absdx ({art})", abs(l.dx(n, i)), l)
                for j in range(i + 1, min(i + 200, l.n)):
                    if s["st"][j] == 1:
                        add("aktivierung", t, f"weckreiz_bis_aufgestanden ({art})", j - i, l)
                        break
            if ev == "belegt" and s["a"][i] == 0x0C:
                add("aktivierung", t, "gully belegt kamera_x", l.camx[i], l)
        # Gehen: Geschwindigkeitsstufen je Frame (nur Abzuege mit 16.16)
        if l.quelle == "ram":
            for n in range(20):
                s = l.s[n]
                for i in range(1, l.n):
                    if l.typ(n, i) not in (WOOKY, EDDY) or l.zustand(n, i) != "gehen" \
                            or l.zustand(n, i - 1) != "gehen":
                        continue
                    vx = s["x"][i] + s["xf"][i] / 65536 - s["x"][i - 1] - s["xf"][i - 1] / 65536
                    vz = s["z"][i] + s["zf"][i] / 65536 - s["z"][i - 1] - s["zf"][i - 1] / 65536
                    m = (vx * vx + 4 * vz * vz) ** 0.5
                    k = "2,25" if m > 2.0 else ("1,75" if m > 1.5 else "andere")
                    cnt("gehen", TYPNAME[l.typ(n, i)], "stufe je frame (x-halbachse)", k, l)
                    fs = {1: "steht", 2: "liegt", 3: "geschuetzt"}.get(l.p["st"][i], "sonst")
                    cnt("gehen", TYPNAME[l.typ(n, i)], f"stufe je frame (figur {fs})", k, l)
                    cnt("gehen", TYPNAME[l.typ(n, i)], f"stufe je frame rang {l.rang[i]}", k, l)
        # Stillstand und erster Angriff
        for e in annaeherungen(l):
            t = TYPNAME[e["typ"]]
            if e["fig_bew"] or e["p_st"] != 1:
                continue
            seite = "von rechts" if e["dx"] > 0 else "von links"
            add("stillstand", t, f"absdx ({seite})", abs(e["dx"]), l)
            if e["tempo"] != "unklar":
                add("stillstand", t, f"absdx (tempo {e['tempo']}, {seite})", abs(e["dx"]), l)
            add("stillstand", t, "absdz", abs(e["dz"]), l)
            add("stillstand", t, "absdz beim gehbeginn", abs(e["dz0"]), l)
            if e["erster"]:
                add("stillstand", t, f"bis_angriff rang {e['rang']}", e["erster"][0] - e["stop"], l)
        # Angriffe
        al = angriffsliste(l)
        for e in al:
            t = TYPNAME[e["typ"]]
            cnt("angriff", t, "art", e["name"], l)
            if e["a0"] is not None:
                add("angriff", t, f"{e['name']} bis_aktiv", e["a0"] - e["i"], l)
                add("angriff", t, f"{e['name']} aktive_frames", e["a1"] - e["a0"] + 1, l)
                cnt("angriff", t, f"{e['name']} attr", f"{e['attr']:#06x}", l)
            if e["pause"] > 0:
                add("pause", t, f"kampfhaltung_vor_angriff rang {e['rang']:02d}", e["pause"], l)
            if e["seit"] != "" and e["zw"] == "":
                add("rhythmus", t, f"abstand_angriffe_direkt rang {e['rang']:02d}", e["seit"], l)
            if e["seit"] != "" and e["zw"] != "":
                add("rhythmus", t, "abstand_angriffe_mit_unterbrechung", e["seit"], l)
            if e["seit"] != "":
                cnt("rhythmus", t, "dazwischen", e["zw"] or "nur kampfhaltung/erholung", l)
                cnt("rhythmus", t, "seitenwechsel_zwischen_angriffen", e["seite"], l)
        # Muster der Serien (Angriffe ohne Gehen/Spott/Liegen der Figur dazwischen)
        for n in range(20):
            folge = [e for e in al if e["slot"] == n]
            muster = []
            for e in folge:
                if e["zw"] != "" and muster:
                    cnt("rhythmus", TYPNAME[e["typ"]], "serienmuster", " ".join(muster), l)
                    muster = []
                muster.append(e["name"][2:] + ("!" if e["attr"] & 0x0800 and e["hit"] else ""))
            if muster:
                cnt("rhythmus", TYPNAME[folge[-1]["typ"]], "serienmuster", " ".join(muster), l)
        # Serien bis zum Umwerfen und Verhalten danach
        for n in range(20):
            serie = 0
            folge = [e for e in al if e["slot"] == n]
            for k, e in enumerate(folge):
                if e["zw"] != "":
                    serie = 0
                serie += 1
                if e["attr"] & 0x0800 and e["hit"]:
                    t = TYPNAME[e["typ"]]
                    add("rhythmus", t, "angriffe_je_serie_bis_umwerfen", serie, l)
                    serie = 0
                    # erster Zustand nach der Erholung des Umwerf-Angriffs
                    nach = None
                    for q in range(e["a1"] + 1, min(e["a1"] + 120, l.n)):
                        zq = l.zustand(n, q)
                        if zq not in ("angriff", "erholung", "kampfhaltung"):
                            if zq == "gehen":
                                sg = {"i0": q, "i1": q}
                                while sg["i1"] + 1 < l.n and l.zustand(n, sg["i1"] + 1) == "gehen":
                                    sg["i1"] += 1
                                zq = geh_art(l, n, sg)
                            nach = zq
                            break
                    cnt("nach_umwerfen", t, "erster_zustand", nach or "keiner (120 F)", l)
            # naechster Angriff nach dem Aufstehen der Figur
        for i, j, art, hit in schutzfenster(l):
            if j == i:
                continue
            nah = [n for n in range(20) if l.kampffaehig(n, i) and l.typ(n, i) in (WOOKY, EDDY)
                   and abs(l.dx(n, i)) <= 70 and abs(l.dz(n, i)) <= 11]
            im = [a for a in al if i < a["i"] <= j]
            for a in im:
                add("schutz", TYPNAME[a["typ"]], f"angriffsbeginn_nach_fensterbeginn ({art})",
                    a["i"] - i, l)
            lang = j - i + 1 if j - i + 1 in (27, 35) else "andere Laenge"
            cnt("schutz", "alle", f"fenster ({art}, {lang} F)",
                "mit angriff" if im else ("gegner nah, ohne angriff" if nah else "kein gegner nah"), l)
            akt = sum(1 for a in im if a["a0"] is not None and i < a["a0"] <= j)
            if akt:
                cnt("schutz", "alle", f"aktiv im fenster ({art})", "ja", l)
            if hit:
                cnt("schutz", "alle", f"treffer im frame nach dem fenster ({art})", "ja", l)
        verl = 0
        for i, j, art, hit in schutzfenster(l):
            verl += sum(l.treffer_auf_figur(q)[0] for q in range(i + 1, j + 1))
        cnt("schutz", "alle", "lp_verlust_innerhalb", str(verl), l)
    # Dauern
    print("bereich,typ,groesse,statistik,laeufe")
    for k in sorted(set(z) | set(zaehl)):
        b, t, g = k
        if k in z:
            stat = fmt_mmm(z[k])
        else:
            c = zaehl[k]
            ges = sum(c.values())
            stat = f"n={ges} " + " ".join(f"{a}:{v}" for a, v in c.most_common())
        print(f"{b},{t},{g},{stat},{len(laeufe_je[k])}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    hilfe = {
        "zeitachse": "Zustandsabschnitte je Gegnerslot mit dx/dz, Kennungen, aktiven Frames",
        "aktivierung": "Wechsel von S+5 und Aufwachen (S+4 2->1) mit Kamera-x und Abstand",
        "annaeherung": "Gehen bis zum Stillstand: Geschwindigkeit, dx/dz beim Stillstand, erster Angriff",
        "angriffe": "jeder Angriffsbeginn mit Pause, Rhythmus, Seitenwechsel, Schutz, Treffer",
        "weglauf": "B1: Figur laeuft weg, Antwort des naechsten Gegners (Gehen, Abstand)",
        "tiefe": "B2: Tiefenschritte der Figur, Verzoegerung bis der Gegner folgt",
        "sprung": "B3: Spruenge der Figur, Angriffe des Gegners waehrend des Sprungs",
        "schutz": "B4: Schutzfenster der Figur, Angriffe und aktive Frames darin",
        "gruppe": "Frames mit >= 3 aktiven Gegnern: gleichzeitige Angriffe, Lage, zweiter Angreifer",
        "wellen": "Lebenslauf jedes Gegners mit Kamera-x und Toten davor; Kamerastillstaende",
        "dauern": "Dauer der Zustandsabschnitte von WOOKY/EDDY mit den haeufigsten Werten",
        "uebergaenge": "Zustandswechsel von WOOKY/EDDY mit Anzahl, Dauer und Abstand",
        "aktivitaet": "je Lauf: Angriffe je 1000 Frames, Zustaende und Abstand des naechsten Gegners",
        "katalog": "Animationskennungen je Gegnertyp (Dauer, Modus, Trefferattribut)",
        "vergleich": "zwei Laeufe: erster Frame mit abweichendem Gegner bzw. LP der Figur",
        "schwelle": "A1: S+5 und Weckreiz je 1-px-Stufe x - Kamera (EINGRIFF CC_KSTUFEN)",
        "zusammenfassung": "Min/Median/Max aller Groessen ueber die Laeufe",
    }
    for name, h in hilfe.items():
        p = sub.add_parser(name, help=h, description=h)
        p.add_argument("prefix", nargs="+")
        if name == "zeitachse":
            p.add_argument("--alle", action="store_true", help="auch inaktive Abschnitte")
        if name == "katalog":
            p.add_argument("--alle", action="store_true", help="alle Gegnertypen")
        if name == "uebergaenge":
            p.add_argument("--min", type=int, default=1, help="nur Wechsel mit mindestens n Faellen")
        if name == "gruppe":
            p.add_argument("--ab", type=int, default=0, help="erst ab diesem Frame zaehlen")
    a = ap.parse_args()
    globals()["cmd_" + a.cmd](a)


if __name__ == "__main__":
    main()
