import { CRITERIO_OTTIMO, RANGE, SCENARI_SENSIBILITA, VINCOLI } from './defaults';
import { simulate } from './model';
import type { Constraints, ModelConfig, OptimizationResult, SensitivityRow, SimulationResult } from './types';

/** Valori della griglia [min, max] con passo `step`, senza errori di arrotondamento. */
export function gridValues(min: number, max: number, step: number): number[] {
  const n = Math.round((max - min) / step);
  return Array.from({ length: n + 1 }, (_, i) => Math.round((min + i * step) * 1000) / 1000);
}

export function satisfiesConstraints(r: SimulationResult, consumoAnnuo: number, v: Constraints = VINCOLI): boolean {
  return r.anno1.produzione <= v.maxProduzioneSuConsumo * consumoAnnuo && r.scr >= v.minAutoconsumo;
}

/** Ordinamento secondo CRITERIO_OTTIMO (NPV decrescente); a parità, CAPEX minore. */
export function compareCandidates(a: SimulationResult, b: SimulationResult): number {
  return b.npv - a.npv || a.capex.totale - b.capex.totale;
}

export function optimize(config: ModelConfig, vincoli: Constraints = VINCOLI, range = RANGE): OptimizationResult {
  const tutti: SimulationResult[] = [];
  for (const kwp of gridValues(range.kwp.min, range.kwp.max, range.kwp.step)) {
    for (const kwh of gridValues(range.kwhBatteria.min, range.kwhBatteria.max, range.kwhBatteria.step)) {
      tutti.push(simulate(config, kwp, kwh));
    }
  }
  const validi = tutti.filter((r) => satisfiesConstraints(r, config.consumi.consumoAnnuo, vincoli));
  const vincoliRispettati = validi.length > 0;
  const ranking = [...(vincoliRispettati ? validi : tutti)].sort(compareCandidates);
  return {
    criterio: CRITERIO_OTTIMO,
    migliori: ranking.slice(0, 3),
    vincoliRispettati,
    candidatiValidi: validi.length,
    candidatiTotali: tutti.length,
    tutti,
  };
}

/** Curva NPV in funzione dei kWp per una data taglia di batteria (per il grafico). */
export function npvCurve(tutti: readonly SimulationResult[], kwhBatteria: number) {
  return tutti
    .filter((r) => r.kwhBatteria === kwhBatteria)
    .sort((a, b) => a.kwp - b.kwp)
    .map((r) => ({ kwp: r.kwp, npv: r.npv }));
}

/** Sensibilità sulla configurazione scelta: tariffa, inflazione energetica e produttività. */
export function sensitivity(config: ModelConfig, kwp: number, kwhBatteria: number): SensitivityRow[] {
  return SCENARI_SENSIBILITA.map((s) => {
    const tariffaAcquisto = config.params.tariffaAcquisto * s.moltTariffa;
    const inflazioneEnergia = config.params.inflazioneEnergia + s.deltaInflazione;
    const scenarioConfig: ModelConfig = {
      ...config,
      params: { ...config.params, tariffaAcquisto, inflazioneEnergia },
      consumi: {
        ...config.consumi,
        oreEquivalenti: config.consumi.oreEquivalenti.map((h) => h * s.fattoreProduttivita),
      },
    };
    const r = simulate(scenarioConfig, kwp, kwhBatteria);
    return {
      scenario: s.nome,
      tariffaAcquisto,
      inflazioneEnergia,
      fattoreProduttivita: s.fattoreProduttivita,
      npv: r.npv,
      paybackAttualizzato: r.paybackAttualizzato,
    };
  });
}
