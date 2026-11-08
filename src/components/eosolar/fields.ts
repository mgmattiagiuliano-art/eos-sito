/**
 * Descrizione dei campi parametrici della UI. Usata sia per generare il markup (al build)
 * sia per rileggere i valori (nel browser): un'unica definizione, nessun disallineamento.
 */
import { DEFAULT_PARAMS } from '../../lib/eosolar/defaults';
import type { EconomicParams } from '../../lib/eosolar/types';

type NumericKey = {
  [K in keyof EconomicParams]: EconomicParams[K] extends number ? K : never;
}[keyof EconomicParams];

export interface ParamField {
  key: NumericKey;
  label: string;
  unit: string;
  /** Il campo mostra valore × 1/scale (es. percentuali: scale 0,01). */
  scale: number;
  step: number;
  min?: number;
  max?: number;
}

const pct = (key: NumericKey, label: string, step = 0.1, max = 100): ParamField => ({
  key,
  label,
  unit: '%',
  scale: 0.01,
  step,
  min: 0,
  max,
});

export const MAIN_FIELDS: ParamField[] = [
  { key: 'tariffaAcquisto', label: 'Prezzo energia acquistata', unit: '€/kWh', scale: 1, step: 0.01, min: 0, max: 2 },
  pct('inflazioneEnergia', 'Inflazione energetica annua', 0.1, 20),
  pct('tassoSconto', 'Tasso di sconto', 0.1, 30),
  pct('degradoFV', 'Degrado pannelli', 0.1, 5),
];

export const ADVANCED_FIELDS: ParamField[] = [
  pct('inflazioneGenerale', 'Inflazione generale (O&M e sostituzioni)', 0.1, 20),
  pct('oemPerc', 'O&M annuo (% del CAPEX)', 0.1, 10),
  pct('degradoBatteria', 'Degrado batteria', 0.1, 10),
  pct('dodBatteria', 'Profondità di scarica batteria', 1),
  pct('rendimentoBatteria', 'Rendimento batteria (round-trip)', 1),
  pct('inverterPerc', 'Sostituzione inverter (% CAPEX FV)', 0.5),
  { key: 'annoInverter', label: 'Anno sostituzione inverter', unit: 'anno', scale: 1, step: 1, min: 1, max: 25 },
  pct('batteriaSostPerc', 'Sostituzione batteria (% CAPEX batteria)', 1),
  { key: 'annoBatteriaSost', label: 'Anno sostituzione batteria', unit: 'anno', scale: 1, step: 1, min: 1, max: 25 },
];

/** Valore da mostrare nel campo, senza errori di virgola mobile (0.07 × 100 = 7.000000000000001). */
export function displayValue(f: ParamField): number {
  return Math.round((DEFAULT_PARAMS[f.key] / f.scale) * 1e6) / 1e6;
}
