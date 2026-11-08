/**
 * Consenso cookie / contenuti di terze parti (Garante Privacy, linee guida 10/06/2021).
 * - Nessuna terza parte non tecnica prima di una scelta esplicita: il default è "tutto rifiutato".
 * - La scelta è salvata in localStorage (archiviazione tecnica, ammessa senza consenso).
 * - Unica categoria non tecnica presente oggi: "mappe" (Google Maps incorporata).
 *   Se in futuro si aggiungono analytics/pixel, aggiungere qui la categoria e incrementare VERSION
 *   così il banner viene riproposto.
 */
export const CONSENT_KEY = 'eos:consent';
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = 'eos:consent-change';

export interface ConsentCategories {
  maps: boolean;
}

export interface ConsentRecord extends ConsentCategories {
  v: number;
  /** ISO date della scelta. */
  date: string;
}

export const NO_CONSENT: ConsentCategories = { maps: false };

/** Interpreta il valore salvato; null se assente, corrotto o di una versione precedente. */
export function parseConsent(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ConsentRecord>;
    if (data.v !== CONSENT_VERSION || typeof data.maps !== 'boolean' || typeof data.date !== 'string') return null;
    return { v: data.v, date: data.date, maps: data.maps };
  } catch {
    return null;
  }
}

export function makeRecord(choice: ConsentCategories, now = new Date()): ConsentRecord {
  return { v: CONSENT_VERSION, date: now.toISOString(), maps: choice.maps };
}

// ---------- Browser ----------

export function readConsent(): ConsentRecord | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentCategories): ConsentRecord {
  const record = makeRecord(choice);
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* storage non disponibile: la scelta vale per questa pagina */
  }
  document.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_EVENT, { detail: record }));
  return record;
}

/** Consenso effettivo (default: niente). */
export function hasConsent(category: keyof ConsentCategories): boolean {
  return readConsent()?.[category] ?? NO_CONSENT[category];
}

export function onConsentChange(cb: (record: ConsentRecord) => void): void {
  document.addEventListener(CONSENT_EVENT, (e) => cb((e as CustomEvent<ConsentRecord>).detail));
}
