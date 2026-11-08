/** Geometria del cavo a serpentina (pura, testata). */

export interface Point {
  x: number;
  y: number;
}

/**
 * Tracciato che passa esattamente per i punti dati: ogni tratto è una cubica con tangenti
 * verticali ai vertici (controlli a metà altezza), come la serpentina del prototipo.
 */
export function serpentinePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const r = (n: number) => Math.round(n * 10) / 10;
  const [first, ...rest] = points;
  let d = `M ${r(first!.x)},${r(first!.y)}`;
  let prev = first!;
  for (const p of rest) {
    const mid = (prev.y + p.y) / 2;
    d += ` C ${r(prev.x)},${r(mid)} ${r(p.x)},${r(mid)} ${r(p.x)},${r(p.y)}`;
    prev = p;
  }
  return d;
}

/** Singolo tratto (per misurarne la lunghezza). */
export function segmentPath(a: Point, b: Point): string {
  return serpentinePath([a, b]);
}

/** Indici dei nodi raggiunti dal cavo dato il tratto disegnato (stessa unità di `cumulative`). */
export function reachedNodes(cumulative: readonly number[], drawn: number, tolerance = 1): boolean[] {
  return cumulative.map((len) => len <= drawn + tolerance);
}
