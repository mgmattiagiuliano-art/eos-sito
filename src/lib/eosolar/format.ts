/**
 * Formattazione numeri it-IT per la UI del calcolatore.
 * useGrouping 'always': in it-IT Intl non raggruppa i numeri a 4 cifre (3607 invece di 3.607).
 */
const intl = (opts: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('it-IT', { useGrouping: 'always', ...opts } as Intl.NumberFormatOptions);

const eur0 = intl({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = intl({ style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = intl({ maximumFractionDigits: 0 });
const dec1 = intl({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtEur = (n: number) => eur0.format(Math.round(n) === 0 ? 0 : n);
export const fmtEurKwh = (n: number) => `${eur2.format(n)}/kWh`;
export const fmtInt = (n: number) => int.format(n);
export const fmtKwh = (n: number) => `${int.format(n)} kWh`;
export const fmtKwp = (n: number) => `${dec1.format(n)} kWp`;
export const fmtKwhBatt = (n: number) => `${dec1.format(n)} kWh`;
export const fmtPct = (frac: number, digits = 0) =>
  `${intl({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(frac * 100)}%`;
export const fmtYears = (n: number | null, orizzonte: number) =>
  n === null ? `oltre ${orizzonte} anni` : `${dec1.format(n)} anni`;
export const fmtMirr = (n: number | null) => (n === null ? 'n.d.' : fmtPct(n, 1));
export const fmtConfig = (kwp: number, kwh: number) =>
  kwh > 0 ? `${fmtKwp(kwp)} + ${fmtKwhBatt(kwh)} di accumulo` : `${fmtKwp(kwp)}, senza accumulo`;
