/** Tipi del motore EOSolar. Nessuna dipendenza dal DOM. */

/** Punto di una curva di costo: costo unitario (€/kWp o €/kWh) a una certa taglia. */
export interface CostPoint {
  size: number;
  unitCost: number;
}

/** Dati dell'utenza. Gli array mensili hanno 12 elementi (gen → dic). */
export interface ConsumptionInput {
  /** Consumo totale annuo (kWh). */
  consumoAnnuo: number;
  /** Consumi mensili in fascia F1 (kWh), approssimata alla fascia diurna. */
  consumiF1: number[];
  /** Ore equivalenti mensili di produzione per kWp (kWh/kWp). */
  oreEquivalenti: number[];
  /** Quota dei consumi F2+F3 spostabile di giorno (0–1). */
  flessibilita: number;
}

export interface OptionalToggle {
  attivo: boolean;
}

export interface EconomicParams {
  /** Prezzo dell'energia acquistata, anno 1 (€/kWh). */
  tariffaAcquisto: number;
  /** Inflazione energetica annua (frazione): tariffa e ritiro dedicato. */
  inflazioneEnergia: number;
  /** Inflazione generale annua (frazione): O&M e sostituzioni. */
  inflazioneGenerale: number;
  /** Tasso di sconto (frazione), usato anche come tasso di reinvestimento del MIRR. */
  tassoSconto: number;
  /** Orizzonte di analisi (anni). */
  anni: number;

  degradoFV: number;
  degradoBatteria: number;
  /** Profondità di scarica utilizzabile (frazione). */
  dodBatteria: number;
  /** Rendimento round-trip (frazione). */
  rendimentoBatteria: number;

  /** O&M annuo come frazione del CAPEX iniziale (prezzi anno 1). */
  oemPerc: number;
  /** Sostituzione inverter: frazione del CAPEX FV, anno in cui avviene. */
  inverterPerc: number;
  annoInverter: number;
  /** Sostituzione batteria: frazione del CAPEX batteria, anno in cui avviene. */
  batteriaSostPerc: number;
  annoBatteriaSost: number;

  /** Valorizzazione dell'energia immessa (ritiro dedicato), €/kWh anno 1. */
  ritiroDedicato: OptionalToggle & { prezzo: number };
  /** IVA applicata a CAPEX, O&M e sostituzioni (i listini sono intesi IVA esclusa). */
  iva: OptionalToggle & { aliquota: number };
  /** Detrazione fiscale sul CAPEX iniziale, recuperata in rate annuali costanti. */
  detrazione: OptionalToggle & { aliquota: number; anni: number };
}

export interface CostCurves {
  fv: CostPoint[];
  batteria: CostPoint[];
}

/** Dati del sito di installazione. */
export interface SiteInput {
  /** Potenza massima installabile (kWp): spazio disponibile su tetto o a terra. null = nessun limite. */
  kwpMax: number | null;
}

export interface ModelConfig {
  consumi: ConsumptionInput;
  params: EconomicParams;
  costi: CostCurves;
  sito: SiteInput;
}

/** Bilancio energetico di un mese (kWh). produzione = autoconsumo + carica + immissione. */
export interface MonthBalance {
  produzione: number;
  consumoDiurno: number;
  consumoNotturno: number;
  autoconsumoDiretto: number;
  caricaBatteria: number;
  scaricaBatteria: number;
  immissione: number;
  prelievo: number;
}

export interface YearBalance extends Omit<MonthBalance, 'consumoDiurno' | 'consumoNotturno'> {
  consumo: number;
}

export interface CashFlowYear {
  anno: number;
  energia: YearBalance;
  risparmioBolletta: number;
  ricavoRitiro: number;
  oem: number;
  sostituzioni: number;
  detrazione: number;
  flusso: number;
  flussoAttualizzato: number;
  cumulatoAttualizzato: number;
}

export interface Capex {
  fv: number;
  batteria: number;
  /** Imponibile (fv + batteria). */
  netto: number;
  /** Totale con IVA se attiva. */
  totale: number;
}

export interface SimulationResult {
  kwp: number;
  kwhBatteria: number;
  capex: Capex;
  /** Bilancio mensile del primo anno. */
  mesiAnno1: MonthBalance[];
  anno1: YearBalance;
  /** Autoconsumo / produzione (energia caricata in batteria inclusa), anno 1. */
  scr: number;
  /** Quota dei consumi coperta dall'impianto, anno 1. */
  ssr: number;
  flussi: CashFlowYear[];
  npv: number;
  mirr: number | null;
  /** Anni (con decimali); null se non si rientra entro l'orizzonte. */
  paybackAttualizzato: number | null;
}

export interface Constraints {
  /** Produzione anno 1 ≤ rapporto × consumo annuo. */
  maxProduzioneSuConsumo: number;
  /** SCR anno 1 ≥ soglia. */
  minAutoconsumo: number;
}

/** Perché la ricerca si ferma a una certa potenza. */
export type KwpLimitReason = 'produzione' | 'installabile' | 'simulatore';

export interface OptimizationResult {
  criterio: string;
  /** Migliori candidati (max 3), il primo è l'ottimo. */
  migliori: SimulationResult[];
  /** Candidato con il MIRR più alto tra quelli con NPV positivo (stesso insieme di `migliori`); null se nessuno. */
  migliorRendimento: SimulationResult | null;
  /** Potenza massima esplorata e vincolo che la determina. */
  limiteKwp: { valore: number; motivo: KwpLimitReason };
  /** true se l'ottimo coincide con il limite di potenza installabile o del simulatore. */
  ottimoAlLimite: boolean;
  /** false se nessun candidato rispetta i vincoli: `migliori` ignora allora i vincoli. */
  vincoliRispettati: boolean;
  candidatiValidi: number;
  candidatiTotali: number;
  /** Tutte le simulazioni (per i grafici). */
  tutti: SimulationResult[];
}

export interface SensitivityRow {
  scenario: string;
  tariffaAcquisto: number;
  inflazioneEnergia: number;
  fattoreProduttivita: number;
  npv: number;
  paybackAttualizzato: number | null;
}

export interface ValidationIssue {
  campo: string;
  messaggio: string;
  gravita: 'errore' | 'avviso';
}
