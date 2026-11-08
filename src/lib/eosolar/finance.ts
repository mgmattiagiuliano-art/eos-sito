/**
 * Indicatori finanziari. Convenzione: flows[0] = anno 0 (investimento, negativo),
 * flows[n] = flusso netto dell'anno n, scontato di (1 + r)^n.
 */

export function npv(rate: number, flows: readonly number[]): number {
  return flows.reduce((acc, f, n) => acc + f / Math.pow(1 + rate, n), 0);
}

/**
 * MIRR con tasso di finanziamento = tasso di reinvestimento = `rate`.
 * Flussi negativi attualizzati all'anno 0, positivi capitalizzati all'anno N.
 * null se mancano flussi positivi o negativi.
 */
export function mirr(rate: number, flows: readonly number[]): number | null {
  const n = flows.length - 1;
  if (n < 1) return null;
  let pvNeg = 0;
  let fvPos = 0;
  flows.forEach((f, t) => {
    if (f < 0) pvNeg += f / Math.pow(1 + rate, t);
    else fvPos += f * Math.pow(1 + rate, n - t);
  });
  if (pvNeg === 0 || fvPos === 0) return null;
  return Math.pow(fvPos / -pvNeg, 1 / n) - 1;
}

/** Cumulato dei flussi attualizzati, indice = anno (0 … N). */
export function cumulativeDiscounted(rate: number, flows: readonly number[]): number[] {
  let acc = 0;
  return flows.map((f, n) => (acc += f / Math.pow(1 + rate, n)));
}

/**
 * Payback attualizzato: anno (interpolato) dopo il quale il cumulato attualizzato
 * resta ≥ 0 fino alla fine dell'orizzonte. Se una sostituzione lo riporta sotto zero,
 * conta l'ultimo attraversamento (scelta prudente). null se non si rientra.
 */
export function discountedPayback(rate: number, flows: readonly number[]): number | null {
  const cum = cumulativeDiscounted(rate, flows);
  if (cum.length === 0 || cum[cum.length - 1]! < 0) return null;
  let lastNeg = -1;
  cum.forEach((c, i) => {
    if (c < 0) lastNeg = i;
  });
  if (lastNeg === -1) return 0;
  const before = cum[lastNeg]!;
  const after = cum[lastNeg + 1]!;
  return lastNeg + -before / (after - before);
}
