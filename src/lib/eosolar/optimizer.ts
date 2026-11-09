import { CRITERIO_OTTIMO, GRIGLIA_KWP, RANGE, SCENARI_SENSIBILITA, VINCOLI } from './defaults';
import { simulate } from './model';
import type {
  Constraints,
  KwpLimitReason,
  ModelConfig,
  OptimizationResult,
  SensitivityRow,
  SimulationResult,
} from './types';

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Valori della griglia [min, max] con passo `step`, senza errori di arrotondamento. */
export function gridValues(min: number, max: number, step: number): number[] {
  const n = Math.round((max - min) / step);
  return Array.from({ length: n + 1 }, (_, i) => round3(min + i * step));
}

/**
 * Griglia della potenza FV a passo variabile (GRIGLIA_KWP), da RANGE.kwp.min fino a `max`.
 * Se `max` non cade sulla griglia viene aggiunto come ultimo valore, così l'ottimizzatore
 * può proporre esattamente la potenza massima installabile.
 */
export function kwpGrid(max: number = RANGE.kwp.max): number[] {
  const limite = Math.min(max, RANGE.kwp.max);
  const out: number[] = [RANGE.kwp.min];
  let start: number = RANGE.kwp.min;
  for (const seg of GRIGLIA_KWP) {
    const n = Math.round((seg.fino - start) / seg.passo);
    for (let i = 1; i <= n; i++) out.push(round3(start + i * seg.passo));
    start = seg.fino;
  }
  const valori = out.filter((k) => k <= limite + 1e-9);
  if (limite >= RANGE.kwp.min && valori[valori.length - 1] !== round3(limite)) valori.push(round3(limite));
  return valori;
}

export function satisfiesConstraints(r: SimulationResult, consumoAnnuo: number, v: Constraints = VINCOLI): boolean {
  return r.anno1.produzione <= v.maxProduzioneSuConsumo * consumoAnnuo && r.scr >= v.minAutoconsumo;
}

/** Ordinamento secondo CRITERIO_OTTIMO (NPV decrescente); a parità, CAPEX minore. */
export function compareCandidates(a: SimulationResult, b: SimulationResult): number {
  return b.npv - a.npv || a.capex.totale - b.capex.totale;
}

/**
 * Potenza massima da esplorare: la più restrittiva tra limite del simulatore, potenza installabile
 * e vincolo di produzione (produzione anno 1 = kWp × Σ ore equivalenti ≤ rapporto × consumo).
 */
export function kwpLimit(config: ModelConfig, vincoli: Constraints = VINCOLI): { valore: number; motivo: KwpLimitReason } {
  const tetto = config.sito.kwpMax;
  let limite: { valore: number; motivo: KwpLimitReason } =
    tetto !== null && tetto < RANGE.kwp.max ? { valore: tetto, motivo: 'installabile' } : { valore: RANGE.kwp.max, motivo: 'simulatore' };
  const oreAnno = config.consumi.oreEquivalenti.reduce((a, b) => a + b, 0);
  if (oreAnno > 0) {
    const kwpProduzione = (vincoli.maxProduzioneSuConsumo * config.consumi.consumoAnnuo) / oreAnno;
    if (kwpProduzione < limite.valore) limite = { valore: kwpProduzione, motivo: 'produzione' };
  }
  return limite;
}

export function optimize(config: ModelConfig, vincoli: Constraints = VINCOLI): OptimizationResult {
  const limiteKwp = kwpLimit(config, vincoli);
  const griglia = kwpGrid(config.sito.kwpMax ?? RANGE.kwp.max);
  // Le potenze oltre il vincolo di produzione non possono essere valide: non le simuliamo.
  // Ne resta almeno una, così la classifica esiste anche se nessun candidato rispetta i vincoli.
  const potenze = griglia.filter((k) => k <= limiteKwp.valore + 1e-9);
  if (potenze.length === 0) potenze.push(griglia[0]!);

  const tutti: SimulationResult[] = [];
  for (const kwp of potenze) {
    for (const kwh of RANGE.kwhBatteria) tutti.push(simulate(config, kwp, kwh));
  }
  const validi = tutti.filter((r) => satisfiesConstraints(r, config.consumi.consumoAnnuo, vincoli));
  const vincoliRispettati = validi.length > 0;
  const insieme = vincoliRispettati ? validi : tutti;
  const ranking = [...insieme].sort(compareCandidates);

  const conRendimento = insieme.filter((r) => r.mirr !== null && r.npv > 0);
  const migliorRendimento =
    conRendimento.length === 0
      ? null
      : conRendimento.reduce((best, r) => (r.mirr! > best.mirr! || (r.mirr === best.mirr && r.npv > best.npv) ? r : best));

  const best = ranking[0]!;
  const kwpMassimo = potenze[potenze.length - 1]!;
  return {
    criterio: CRITERIO_OTTIMO,
    migliori: ranking.slice(0, 3),
    migliorRendimento,
    limiteKwp,
    ottimoAlLimite: limiteKwp.motivo !== 'produzione' && best.kwp >= kwpMassimo - 1e-9,
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
