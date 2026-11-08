/**
 * Motore EOSolar: bilancio energetico mensile + flussi di cassa annuali.
 *
 * Modello (semplificato, dichiarato nel disclaimer della UI):
 * - F1 approssimata alla fascia diurna; F2+F3 ripartiti in modo uniforme sui 12 mesi.
 * - La flessibilità sposta di giorno una quota di F2+F3.
 * - Batteria: un ciclo al giorno con valori medi mensili. La carica giornaliera è limitata
 *   da surplus, capacità utile (DoD × degrado) e consumo notturno / rendimento, quindi
 *   non si carica energia che non potrà essere restituita: il resto va in immissione.
 *   Bilancio: produzione = autoconsumo diretto + carica batteria + immissione.
 *
 * Convenzione prezzi: CAPEX all'anno 0; tariffa, ritiro, O&M e sostituzioni sono espressi a
 * prezzi dell'anno 1 e indicizzati con (1 + inflazione)^(n − 1) nell'anno n in cui avvengono.
 */
import { totalCost } from './costs';
import { GIORNI_MESE } from './defaults';
import { cumulativeDiscounted, discountedPayback, mirr, npv } from './finance';
import type {
  Capex,
  CashFlowYear,
  ConsumptionInput,
  ModelConfig,
  MonthBalance,
  SimulationResult,
  ValidationIssue,
  YearBalance,
} from './types';

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

export function computeCapex(config: ModelConfig, kwp: number, kwhBatteria: number): Capex {
  const fv = totalCost(config.costi.fv, kwp);
  const batteria = totalCost(config.costi.batteria, kwhBatteria);
  const netto = fv + batteria;
  const { iva } = config.params;
  const totale = iva.attivo ? netto * (1 + iva.aliquota) : netto;
  return { fv, batteria, netto, totale };
}

/**
 * Bilancio di un anno, mese per mese.
 * @param fattoreFV moltiplicatore della produzione (degrado FV)
 * @param capacitaUtile kWh utilizzabili per ciclo (capacità × DoD × degrado batteria)
 */
export function monthlyBalance(
  consumi: ConsumptionInput,
  kwp: number,
  capacitaUtile: number,
  rendimento: number,
  fattoreFV = 1,
): MonthBalance[] {
  const totF1 = sum(consumi.consumiF1);
  const totF2F3 = Math.max(0, consumi.consumoAnnuo - totF1);
  const notteMese = totF2F3 / 12;
  const spostato = notteMese * consumi.flessibilita;

  return consumi.consumiF1.map((f1, m) => {
    const giorni = GIORNI_MESE[m] ?? 30;
    const produzione = kwp * (consumi.oreEquivalenti[m] ?? 0) * fattoreFV;
    const consumoDiurno = f1 + spostato;
    const consumoNotturno = notteMese - spostato;

    const autoconsumoDiretto = Math.min(produzione, consumoDiurno);
    const surplus = produzione - autoconsumoDiretto;

    let caricaBatteria = 0;
    if (capacitaUtile > 0 && rendimento > 0) {
      const caricaGiorno = Math.min(surplus / giorni, capacitaUtile, consumoNotturno / giorni / rendimento);
      caricaBatteria = Math.max(0, caricaGiorno) * giorni;
    }
    const scaricaBatteria = caricaBatteria * rendimento;
    const immissione = surplus - caricaBatteria;
    const prelievo = consumoDiurno - autoconsumoDiretto + (consumoNotturno - scaricaBatteria);

    return {
      produzione,
      consumoDiurno,
      consumoNotturno,
      autoconsumoDiretto,
      caricaBatteria,
      scaricaBatteria,
      immissione,
      prelievo,
    };
  });
}

export function sumYear(mesi: readonly MonthBalance[]): YearBalance {
  const s = (k: keyof MonthBalance) => sum(mesi.map((m) => m[k]));
  return {
    produzione: s('produzione'),
    consumo: s('consumoDiurno') + s('consumoNotturno'),
    autoconsumoDiretto: s('autoconsumoDiretto'),
    caricaBatteria: s('caricaBatteria'),
    scaricaBatteria: s('scaricaBatteria'),
    immissione: s('immissione'),
    prelievo: s('prelievo'),
  };
}

/** Età (anni compiuti) della batteria all'inizio dell'anno n, tenendo conto della sostituzione. */
function batteryAge(anno: number, annoSostituzione: number): number {
  return anno > annoSostituzione ? anno - 1 - annoSostituzione : anno - 1;
}

export function simulate(config: ModelConfig, kwp: number, kwhBatteria: number): SimulationResult {
  const { consumi, params: p } = config;
  const capex = computeCapex(config, kwp, kwhBatteria);
  const ivaF = p.iva.attivo ? 1 + p.iva.aliquota : 1;
  const haBatteria = kwhBatteria > 0;
  const sostituzioneBatteriaNelPeriodo = haBatteria && p.annoBatteriaSost >= 1 && p.annoBatteriaSost < p.anni;

  const flows: number[] = [-capex.totale];
  const anni: Omit<CashFlowYear, 'flussoAttualizzato' | 'cumulatoAttualizzato'>[] = [];
  let mesiAnno1: MonthBalance[] = [];

  for (let n = 1; n <= p.anni; n++) {
    const fattoreFV = Math.pow(1 - p.degradoFV, n - 1);
    const eta = sostituzioneBatteriaNelPeriodo ? batteryAge(n, p.annoBatteriaSost) : n - 1;
    const capacitaUtile = kwhBatteria * p.dodBatteria * Math.pow(1 - p.degradoBatteria, eta);
    const mesi = monthlyBalance(consumi, kwp, capacitaUtile, p.rendimentoBatteria, fattoreFV);
    if (n === 1) mesiAnno1 = mesi;
    const energia = sumYear(mesi);

    const idxEnergia = Math.pow(1 + p.inflazioneEnergia, n - 1);
    const idxGenerale = Math.pow(1 + p.inflazioneGenerale, n - 1);

    const risparmioBolletta = (energia.autoconsumoDiretto + energia.scaricaBatteria) * p.tariffaAcquisto * idxEnergia;
    const ricavoRitiro = p.ritiroDedicato.attivo ? energia.immissione * p.ritiroDedicato.prezzo * idxEnergia : 0;
    const oem = p.oemPerc * capex.netto * ivaF * idxGenerale;

    let sostituzioni = 0;
    if (kwp > 0 && n === p.annoInverter) sostituzioni += p.inverterPerc * capex.fv * ivaF * idxGenerale;
    if (haBatteria && n === p.annoBatteriaSost) sostituzioni += p.batteriaSostPerc * capex.batteria * ivaF * idxGenerale;

    const detrazione =
      p.detrazione.attivo && p.detrazione.anni > 0 && n <= p.detrazione.anni
        ? (capex.totale * p.detrazione.aliquota) / p.detrazione.anni
        : 0;

    const flusso = risparmioBolletta + ricavoRitiro - oem - sostituzioni + detrazione;
    flows.push(flusso);
    anni.push({ anno: n, energia, risparmioBolletta, ricavoRitiro, oem, sostituzioni, detrazione, flusso });
  }

  const cum = cumulativeDiscounted(p.tassoSconto, flows);
  const flussi: CashFlowYear[] = anni.map((a) => ({
    ...a,
    flussoAttualizzato: a.flusso / Math.pow(1 + p.tassoSconto, a.anno),
    cumulatoAttualizzato: cum[a.anno] ?? 0,
  }));

  const anno1 = sumYear(mesiAnno1);
  const autoconsumato = anno1.autoconsumoDiretto + anno1.caricaBatteria;
  return {
    kwp,
    kwhBatteria,
    capex,
    mesiAnno1,
    anno1,
    scr: anno1.produzione > 0 ? autoconsumato / anno1.produzione : 0,
    ssr: anno1.consumo > 0 ? (anno1.autoconsumoDiretto + anno1.scaricaBatteria) / anno1.consumo : 0,
    flussi,
    npv: npv(p.tassoSconto, flows),
    mirr: mirr(p.tassoSconto, flows),
    paybackAttualizzato: discountedPayback(p.tassoSconto, flows),
  };
}

/** Controlli sugli input: gli errori bloccano il calcolo, gli avvisi vanno mostrati. */
export function validate(config: ModelConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { consumi, params } = config;
  const err = (campo: string, messaggio: string) => issues.push({ campo, messaggio, gravita: 'errore' });
  const ok = (x: number) => Number.isFinite(x) && x >= 0;

  if (!Number.isFinite(consumi.consumoAnnuo) || consumi.consumoAnnuo <= 0) {
    err('consumoAnnuo', 'Inserisci un consumo annuo maggiore di zero.');
  }
  if (consumi.consumiF1.length !== 12 || !consumi.consumiF1.every(ok)) {
    err('consumiF1', 'I consumi F1 devono essere 12 valori numerici non negativi.');
  }
  if (consumi.oreEquivalenti.length !== 12 || !consumi.oreEquivalenti.every(ok)) {
    err('oreEquivalenti', 'Le ore equivalenti devono essere 12 valori numerici non negativi.');
  }
  if (!(consumi.flessibilita >= 0 && consumi.flessibilita <= 1)) {
    err('flessibilita', 'La flessibilità deve essere tra 0% e 100%.');
  }
  const numerici: [string, number][] = [
    ['tariffaAcquisto', params.tariffaAcquisto],
    ['inflazioneEnergia', params.inflazioneEnergia],
    ['inflazioneGenerale', params.inflazioneGenerale],
    ['tassoSconto', params.tassoSconto],
    ['degradoFV', params.degradoFV],
  ];
  for (const [campo, v] of numerici) {
    if (!Number.isFinite(v)) err(campo, 'Valore non valido.');
  }
  if (params.tassoSconto <= -1) err('tassoSconto', 'Il tasso di sconto deve essere maggiore di −100%.');

  const totF1 = sum(consumi.consumiF1);
  if (Number.isFinite(totF1) && totF1 > consumi.consumoAnnuo) {
    issues.push({
      campo: 'consumiF1',
      messaggio: 'La somma dei consumi F1 supera il consumo annuo: i consumi F2+F3 sono considerati nulli.',
      gravita: 'avviso',
    });
  }
  return issues;
}
