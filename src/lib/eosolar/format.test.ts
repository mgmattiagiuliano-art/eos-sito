import { describe, expect, it } from 'vitest';
import { fmtConfig, fmtEur, fmtEurKwh, fmtKwh, fmtMirr, fmtPct, fmtYears } from './format';

// Intl usa spazi non separabili: normalizziamo per confrontare
const n = (s: string) => s.replace(/[  ]/g, ' ');

describe('formattazione it-IT', () => {
  it('euro con separatore delle migliaia anche a 4 cifre', () => {
    expect(n(fmtEur(3607))).toBe('3.607 €');
    expect(n(fmtEur(-2925.4))).toBe('-2.925 €');
    expect(n(fmtEur(-0.3))).toBe('0 €');
    expect(n(fmtEurKwh(0.25))).toBe('0,25 €/kWh');
  });

  it('energia, percentuali, anni', () => {
    expect(fmtKwh(3800)).toBe('3.800 kWh');
    expect(fmtPct(0.523)).toBe('52%');
    expect(fmtPct(0.0954, 1)).toBe('9,5%');
    expect(fmtYears(8.04, 25)).toBe('8,0 anni');
    expect(fmtYears(null, 25)).toBe('oltre 25 anni');
    expect(fmtMirr(null)).toBe('n.d.');
    expect(fmtConfig(1.5, 0)).toBe('1,5 kWp, senza accumulo');
    expect(fmtConfig(4, 5)).toBe('4,0 kWp + 5,0 kWh di accumulo');
  });
});
