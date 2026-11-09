export * from './types';
export * from './defaults';
export * from './costs';
export * from './finance';
export * from './model';
export * from './optimizer';

import { DEFAULT_CONSUMI, DEFAULT_COSTI, DEFAULT_PARAMS, DEFAULT_SITO } from './defaults';
import type { ModelConfig } from './types';

/** Configurazione di default (copia profonda, modificabile). */
export function defaultConfig(): ModelConfig {
  return structuredClone({ consumi: DEFAULT_CONSUMI, params: DEFAULT_PARAMS, costi: DEFAULT_COSTI, sito: DEFAULT_SITO });
}
