import type { CostPoint } from './types';

/**
 * Costo unitario interpolato linearmente sulla curva (punti ordinati per taglia).
 * - size ≤ 0 → 0 (nessun componente)
 * - sotto il primo punto → costo del primo punto (taglia minima)
 * - oltre l'ultimo punto → costo dell'ultimo punto
 */
export function unitCost(points: readonly CostPoint[], size: number): number {
  if (size <= 0 || points.length === 0) return 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (size <= first.size) return first.unitCost;
  if (size >= last.size) return last.unitCost;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (size >= a.size && size <= b.size) {
      return a.unitCost + ((b.unitCost - a.unitCost) * (size - a.size)) / (b.size - a.size);
    }
  }
  return last.unitCost;
}

/** Costo totale = taglia × costo unitario interpolato. */
export function totalCost(points: readonly CostPoint[], size: number): number {
  return size <= 0 ? 0 : size * unitCost(points, size);
}
