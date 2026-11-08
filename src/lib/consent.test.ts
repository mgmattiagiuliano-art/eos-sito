import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, makeRecord, parseConsent } from './consent';

describe('parseConsent', () => {
  it('nessuna scelta salvata → null (il banner va mostrato, nulla è consentito)', () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent('')).toBeNull();
  });

  it('valori corrotti o di versioni precedenti → null', () => {
    expect(parseConsent('{oops')).toBeNull();
    expect(parseConsent(JSON.stringify({ v: CONSENT_VERSION - 1, maps: true, date: 'x' }))).toBeNull();
    expect(parseConsent(JSON.stringify({ v: CONSENT_VERSION, maps: 'si', date: 'x' }))).toBeNull();
  });

  it('round-trip di una scelta valida', () => {
    const rec = makeRecord({ maps: true }, new Date('2026-01-01T00:00:00Z'));
    expect(parseConsent(JSON.stringify(rec))).toEqual({ v: CONSENT_VERSION, maps: true, date: '2026-01-01T00:00:00.000Z' });
  });
});
