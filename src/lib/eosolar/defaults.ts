/**
 * Default e costanti del calcolatore. Unica fonte per motore, UI e test.
 * I valori economici vengono dal prototipo approvato: vanno confermati da EOS.
 */
import type { Constraints, CostCurves, ConsumptionInput, EconomicParams } from './types';

export const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const;
/** Giorni per mese (anno non bisestile): limitano i cicli giornalieri della batteria. */
export const GIORNI_MESE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Spazio di ricerca: UNICA fonte per ottimizzatore e slider della simulazione libera. */
export const RANGE = {
  kwp: { min: 1, max: 20, step: 0.5 },
  kwhBatteria: { min: 0, max: 15, step: 2.5 },
} as const;

/** Criterio di ottimo concordato: massimo NPV entro i vincoli. */
export const CRITERIO_OTTIMO = 'npv' as const;

export const VINCOLI: Constraints = {
  maxProduzioneSuConsumo: 1.4,
  minAutoconsumo: 0.4,
};

// TODO(EOS): profilo F1 di default = 64% dei consumi, alto per un'utenza domestica tipica. Verificare.
export const DEFAULT_CONSUMI: ConsumptionInput = {
  consumoAnnuo: 3800,
  consumiF1: [220, 200, 190, 180, 170, 190, 230, 210, 190, 200, 210, 230],
  // TODO(EOS): ore equivalenti tipiche del basso Piemonte (fonte: PVGIS o dati impianti EOS).
  oreEquivalenti: [65, 80, 115, 135, 150, 160, 165, 155, 125, 95, 65, 55],
  flessibilita: 0.15,
};

export const OPZIONI_FLESSIBILITA = [
  { value: 0, label: '0% — nessuno spostamento diurno' },
  { value: 0.15, label: '15% — moderato (timer elettrodomestici)' },
  { value: 0.3, label: '30% — elevato (smart working, uso diurno)' },
] as const;

// TODO(EOS): verificare i listini (prezzi turnkey, intesi IVA esclusa).
export const DEFAULT_COSTI: CostCurves = {
  fv: [
    { size: 1, unitCost: 2000 },
    { size: 2, unitCost: 1900 },
    { size: 3, unitCost: 1800 },
    { size: 4, unitCost: 1750 },
    { size: 5, unitCost: 1700 },
    { size: 6, unitCost: 1650 },
    { size: 8, unitCost: 1550 },
    { size: 10, unitCost: 1500 },
    { size: 15, unitCost: 1400 },
    { size: 20, unitCost: 1350 },
  ],
  batteria: [
    { size: 2.5, unitCost: 700 },
    { size: 5, unitCost: 550 },
    { size: 7.5, unitCost: 500 },
    { size: 10, unitCost: 450 },
    { size: 12.5, unitCost: 420 },
    { size: 15, unitCost: 400 },
  ],
};

export const DEFAULT_PARAMS: EconomicParams = {
  tariffaAcquisto: 0.25,
  inflazioneEnergia: 0.02,
  // TODO(EOS): inflazione generale per O&M e sostituzioni (default prudente 2%).
  inflazioneGenerale: 0.02,
  tassoSconto: 0.06,
  anni: 25,
  degradoFV: 0.005,
  degradoBatteria: 0.015,
  dodBatteria: 0.9,
  rendimentoBatteria: 0.88,
  oemPerc: 0.015,
  inverterPerc: 0.075,
  annoInverter: 15,
  batteriaSostPerc: 0.7,
  annoBatteriaSost: 12,
  // TODO(EOS): verificare normativa vigente. Disattivati finché EOS non conferma.
  ritiroDedicato: { attivo: false, prezzo: 0.1 },
  iva: { attivo: false, aliquota: 0 },
  detrazione: { attivo: false, aliquota: 0, anni: 10 },
};

/**
 * Scenari di sensibilità: ognuno varia insieme tariffa, inflazione energetica e
 * produttività (±10% ore equivalenti), coerentemente con le colonne della tabella.
 */
export const SCENARI_SENSIBILITA = [
  { nome: 'Pessimista', moltTariffa: 0.85, deltaInflazione: -0.01, fattoreProduttivita: 0.9 },
  { nome: 'Base', moltTariffa: 1, deltaInflazione: 0, fattoreProduttivita: 1 },
  { nome: 'Ottimista', moltTariffa: 1.15, deltaInflazione: 0.01, fattoreProduttivita: 1.1 },
] as const;
