// Geometrie der Erzeugung (Auftrag 4, 2.2 und 2.4): Punkte, Formen und ihre
// Prüfung „liegt der Pixelmittelpunkt in der Form?“. Leinwand und
// Gliederpuppe benutzen dieselben Prüfungen, damit eine Form überall gleich
// gerastert wird. Koordinaten in Spielpixeln, x nach rechts, y nach unten;
// ein Pixel (x, y) gilt als getroffen, wenn sein Mittelpunkt (x + 0,5;
// y + 0,5) in der Form liegt. Keine Farben, keine Maße.

/** Punkt in Spielpixeln. */
export interface Punkt {
  readonly x: number;
  readonly y: number;
}

/** Kapsel: Strecke a–b mit Radius ra an a und rb an b (gleiche Radien: Zylinder mit runden Enden). */
export interface Kapsel {
  readonly art: 'kapsel';
  readonly a: Punkt;
  readonly b: Punkt;
  readonly ra: number;
  readonly rb: number;
}

/** Ellipse mit Mittelpunkt, Halbachsen und Drehung (Grad, gegen den Uhrzeigersinn im Bild gesehen positiv nach vorn, wie die Puppe). */
export interface Ellipse {
  readonly art: 'ellipse';
  readonly m: Punkt;
  readonly rx: number;
  readonly ry: number;
  readonly winkel: number;
}

/** Polygon (Eckpunkte in Reihenfolge, geschlossen). */
export interface Polygon {
  readonly art: 'polygon';
  readonly punkte: readonly Punkt[];
}

export type Form = Kapsel | Ellipse | Polygon;

/** Grad in Bogenmaß (Mathematik). */
export const GRAD = Math.PI / 180;

/** Halber Pixel: Mittelpunkt eines Pixels (Mathematik des Rasters). */
export const HALB = 0.5;

/**
 * Drehung eines Vektors um winkel Grad. Konvention der Puppe: Winkel 0 zeigt
 * nach unten (0, 1), 90 nach vorn (1, 0), −90 nach hinten, 180 nach oben.
 */
export function drehe(v: Punkt, winkel: number): Punkt {
  const w = winkel * GRAD;
  const c = Math.cos(w);
  const s = Math.sin(w);
  // (0, 1) → (sin w, cos w): positive Winkel drehen „unten“ nach „vorn“.
  return { x: v.x * c + v.y * s, y: -v.x * s + v.y * c };
}

/** Punkt in Polygon (gerade-ungerade-Regel). */
export function imPolygon(punkte: readonly Punkt[], x: number, y: number): boolean {
  let drin = false;
  for (let i = 0, j = punkte.length - 1; i < punkte.length; j = i++) {
    const pi = punkte[i] as Punkt;
    const pj = punkte[j] as Punkt;
    if (pi.y > y !== pj.y > y && x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y) + pi.x) drin = !drin;
  }
  return drin;
}

/** Lage eines Punkts zur Kapsel: t entlang a–b (0 … 1), Abstand zur Achse, Radius bei t. */
export function kapselLage(k: Kapsel, x: number, y: number): { t: number; dx: number; dy: number; r: number } {
  const bx = k.b.x - k.a.x;
  const by = k.b.y - k.a.y;
  const l2 = bx * bx + by * by;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - k.a.x) * bx + (y - k.a.y) * by) / l2)) : 0;
  const dx = x - (k.a.x + t * bx);
  const dy = y - (k.a.y + t * by);
  return { t, dx, dy, r: k.ra + (k.rb - k.ra) * t };
}

/** Punkt in Kapsel. */
export function imKapsel(k: Kapsel, x: number, y: number): boolean {
  const l = kapselLage(k, x, y);
  return l.dx * l.dx + l.dy * l.dy <= l.r * l.r;
}

/** Punkt in Ellipse; liefert die normierte Lage (ex, ey) im Ellipsenrahmen oder null. */
export function ellipseLage(e: Ellipse, x: number, y: number): { ex: number; ey: number } | null {
  const v = drehe({ x: x - e.m.x, y: y - e.m.y }, -e.winkel);
  const ex = v.x / e.rx;
  const ey = v.y / e.ry;
  if (ex * ex + ey * ey > 1) return null;
  return { ex, ey };
}

/** Punkt in Form. */
export function inForm(f: Form, x: number, y: number): boolean {
  if (f.art === 'kapsel') return imKapsel(f, x, y);
  if (f.art === 'ellipse') return ellipseLage(f, x, y) !== null;
  return imPolygon(f.punkte, x, y);
}

/** Umgebendes Rechteck einer Form (reelle Koordinaten). */
export function formGrenzen(f: Form): { x0: number; y0: number; x1: number; y1: number } {
  if (f.art === 'kapsel') {
    return {
      x0: Math.min(f.a.x - f.ra, f.b.x - f.rb),
      y0: Math.min(f.a.y - f.ra, f.b.y - f.rb),
      x1: Math.max(f.a.x + f.ra, f.b.x + f.rb),
      y1: Math.max(f.a.y + f.ra, f.b.y + f.rb),
    };
  }
  if (f.art === 'ellipse') {
    const r = Math.max(f.rx, f.ry);
    return { x0: f.m.x - r, y0: f.m.y - r, x1: f.m.x + r, y1: f.m.y + r };
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of f.punkte) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

/** Form verschoben und gedreht: erst um winkel Grad um (0, 0) drehen, dann um v verschieben. */
export function formBewegt(f: Form, winkel: number, v: Punkt): Form {
  const p = (q: Punkt): Punkt => {
    const d = drehe(q, winkel);
    return { x: d.x + v.x, y: d.y + v.y };
  };
  if (f.art === 'kapsel') return { art: 'kapsel', a: p(f.a), b: p(f.b), ra: f.ra, rb: f.rb };
  if (f.art === 'ellipse') return { art: 'ellipse', m: p(f.m), rx: f.rx, ry: f.ry, winkel: f.winkel + winkel };
  return { art: 'polygon', punkte: f.punkte.map(p) };
}

/** Form waagrecht um x = 0 gespiegelt (Blick links bei gleichem Licht von links). */
export function formGespiegelt(f: Form): Form {
  const p = (q: Punkt): Punkt => ({ x: -q.x, y: q.y });
  if (f.art === 'kapsel') return { art: 'kapsel', a: p(f.a), b: p(f.b), ra: f.ra, rb: f.rb };
  if (f.art === 'ellipse') return { art: 'ellipse', m: p(f.m), rx: f.rx, ry: f.ry, winkel: -f.winkel };
  return { art: 'polygon', punkte: f.punkte.map(p) };
}

/** Kürzester Abstand eines Punkts zu einer Strecke p–q und die Richtung vom Fußpunkt zum Punkt. */
export function streckenAbstand(p: Punkt, q: Punkt, x: number, y: number): { d: number; nx: number; ny: number } {
  const bx = q.x - p.x;
  const by = q.y - p.y;
  const l2 = bx * bx + by * by;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - p.x) * bx + (y - p.y) * by) / l2)) : 0;
  const dx = x - (p.x + t * bx);
  const dy = y - (p.y + t * by);
  const d = Math.hypot(dx, dy);
  return { d, nx: d > 0 ? dx / d : 0, ny: d > 0 ? dy / d : 0 };
}
