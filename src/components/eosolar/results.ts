/**
 * Rendering dei risultati a livelli (vedi ResultView.astro). Solo presentazione: tutti i numeri
 * arrivano dal motore. Gli elementi sono creati con createElement + textContent (niente innerHTML).
 */
import { MESI, npvCurve, type ModelConfig, type OptimizationResult, type SensitivityRow, type SimulationResult } from '../../lib/eosolar';
import {
  fmtConfig,
  fmtEur,
  fmtEurKwh,
  fmtInt,
  fmtKwh,
  fmtKwhBatt,
  fmtMirr,
  fmtPct,
  fmtYears,
} from '../../lib/eosolar/format';

type Charts = typeof import('./charts');

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

export function notaIva(cfg: ModelConfig): string {
  return cfg.params.iva.attivo ? `IVA ${fmtPct(cfg.params.iva.aliquota)} inclusa` : 'IVA esclusa';
}

function el(view: HTMLElement, key: string): HTMLElement | null {
  return view.querySelector<HTMLElement>(`[data-r="${key}"]`);
}

function setText(view: HTMLElement, key: string, text: string): void {
  const e = el(view, key);
  if (e) e.textContent = text;
}

function show(view: HTMLElement, key: string, visible = true): void {
  const e = el(view, key);
  if (e) e.hidden = !visible;
}

function makeRow(cells: (string | Node)[], opts: { header?: boolean; className?: string } = {}): HTMLTableRowElement {
  const tr = document.createElement('tr');
  if (opts.className) tr.className = opts.className;
  cells.forEach((c, i) => {
    const isHeader = i === 0 && opts.header !== false;
    const cell = document.createElement(isHeader ? 'th' : 'td');
    if (isHeader) cell.scope = 'row';
    else cell.className = 'num';
    cell.append(c);
    tr.append(cell);
  });
  return tr;
}

function metric(title: string, value: string, desc: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'eosolar-metric';
  const parts: [string, string][] = [
    ['eosolar-metric__title', title],
    ['eosolar-metric__value num', value],
    ['eosolar-metric__desc', desc],
  ];
  for (const [cls, text] of parts) {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    box.append(p);
  }
  return box;
}

// ---------------- Livelli 1 e 2 + tabelle comuni ----------------

/** Riempie la vista con un risultato: numeri chiave, indicatori, tabelle e ipotesi. */
export function renderResult(view: HTMLElement, r: SimulationResult, cfg: ModelConfig, statement: string): void {
  const anni = cfg.params.anni;
  const anno1 = r.flussi[0];
  const risparmio = anno1 ? anno1.risparmioBolletta + anno1.ricavoRitiro : 0;

  setText(view, 'config', fmtConfig(r.kwp, r.kwhBatteria));
  setText(view, 'statement', statement);

  setText(view, 'kpi-capex', fmtEur(r.capex.totale));
  setText(view, 'kpi-capex-note', notaIva(cfg));
  setText(view, 'kpi-risparmio', fmtEur(risparmio));
  setText(
    view,
    'kpi-risparmio-note',
    anno1 && anno1.ricavoRitiro > 0
      ? `bolletta ${fmtEur(anno1.risparmioBolletta)} + energia venduta ${fmtEur(anno1.ricavoRitiro)}`
      : 'in bolletta, grazie all’energia autoprodotta',
  );
  setText(view, 'kpi-payback', fmtYears(r.paybackAttualizzato, anni));
  setText(view, 'kpi-npv-label', r.npv >= 0 ? `Guadagno netto in ${anni} anni` : `Perdita netta in ${anni} anni`);
  setText(view, 'kpi-npv', fmtEur(r.npv));
  show(view, 'kpis');
  show(view, 'actions');
  show(view, 'body');

  el(view, 'metrics')?.replaceChildren(
    metric('Copertura dei consumi', fmtPct(r.ssr), 'Quota del fabbisogno coperta da impianto e batteria.'),
    metric('Autoconsumo', fmtPct(r.scr), 'Quota della produzione usata in casa o accumulata.'),
    metric('Produzione primo anno', fmtKwh(r.anno1.produzione), `Immessa in rete: ${fmtKwh(r.anno1.immissione)}.`),
    metric('Rendimento (MIRR)', fmtMirr(r.mirr), 'Rendimento annuo equivalente, con reinvestimento al tasso di sconto.'),
    metric(
      'Composizione investimento',
      fmtEur(r.capex.netto),
      `FV ${fmtEur(r.capex.fv)} · batteria ${fmtEur(r.capex.batteria)} · costo fisso ${fmtEur(r.capex.fisso)} (IVA esclusa)`,
    ),
  );

  renderMonths(view, r);
  renderFlows(view, r);
  renderAssumptions(view, r, cfg);
}

function renderMonths(view: HTMLElement, r: SimulationResult): void {
  const rows = r.mesiAnno1.map((m, i) =>
    makeRow([
      MESI[i] ?? String(i + 1),
      fmtInt(m.produzione),
      fmtInt(m.consumoDiurno + m.consumoNotturno),
      fmtInt(m.autoconsumoDiretto),
      fmtInt(m.scaricaBatteria),
      fmtInt(m.immissione),
      fmtInt(m.prelievo),
    ]),
  );
  const a = r.anno1;
  rows.push(
    makeRow(
      ['Anno', fmtInt(a.produzione), fmtInt(a.consumo), fmtInt(a.autoconsumoDiretto), fmtInt(a.scaricaBatteria), fmtInt(a.immissione), fmtInt(a.prelievo)],
      { className: 'eosolar-row-total' },
    ),
  );
  el(view, 'months')?.replaceChildren(...rows);
}

function renderFlows(view: HTMLElement, r: SimulationResult): void {
  const dash = '—';
  const eur = (n: number) => (Math.round(n) === 0 ? dash : fmtEur(n));
  const neg = (n: number) => (Math.round(n) === 0 ? dash : fmtEur(-n));
  const rows = [
    makeRow(['0', dash, dash, dash, dash, dash, fmtEur(-r.capex.totale), fmtEur(-r.capex.totale)], { className: 'eosolar-row-total' }),
    ...r.flussi.map((f) =>
      makeRow([
        String(f.anno),
        eur(f.risparmioBolletta),
        eur(f.ricavoRitiro),
        neg(f.oem),
        neg(f.sostituzioni),
        eur(f.detrazione),
        fmtEur(f.flusso),
        fmtEur(f.cumulatoAttualizzato),
      ]),
    ),
  ];
  el(view, 'flows')?.replaceChildren(...rows);
}

function renderAssumptions(view: HTMLElement, r: SimulationResult, cfg: ModelConfig): void {
  const { params: p, consumi: c, costi } = cfg;
  const f1 = sum(c.consumiF1);
  const items = [
    `Prezzo dell’energia ${fmtEurKwh(p.tariffaAcquisto)}, in aumento del ${fmtPct(p.inflazioneEnergia, 1)} l’anno; manutenzione e ricambi in aumento del ${fmtPct(p.inflazioneGenerale, 1)} l’anno.`,
    `Tasso di sconto ${fmtPct(p.tassoSconto, 1)} su un orizzonte di ${p.anni} anni (flussi in euro correnti).`,
    `Produzione di ${fmtInt(sum(c.oreEquivalenti))} kWh per kWp all’anno, con un degrado dei pannelli del ${fmtPct(p.degradoFV, 1)} l’anno.`,
    `Consumi di ${fmtKwh(c.consumoAnnuo)} l’anno, di cui ${fmtPct(c.consumoAnnuo > 0 ? Math.min(1, f1 / c.consumoAnnuo) : 0)} in fascia F1 considerata diurna; ${fmtPct(c.flessibilita)} dei consumi serali spostabile di giorno.`,
    p.ritiroDedicato.attivo
      ? `Energia immessa in rete valorizzata a ${fmtEurKwh(p.ritiroDedicato.prezzo)}, con la stessa inflazione dell’energia.`
      : 'Energia immessa in rete non valorizzata (0 €/kWh): ipotesi prudente.',
    `Costi ${notaIva(cfg)}: costo fisso di ${fmtEur(costi.fissoImpianto)} per impianto più il costo per kWp e per kWh interpolato dal listino.`,
    `Manutenzione pari al ${fmtPct(p.oemPerc, 1)} dell’investimento all’anno; sostituzione dell’inverter all’anno ${p.annoInverter} (${fmtPct(p.inverterPerc, 1)} del costo FV)` +
      (r.kwhBatteria > 0 ? ` e della batteria all’anno ${p.annoBatteriaSost} (${fmtPct(p.batteriaSostPerc)} del suo costo).` : '.'),
    p.detrazione.attivo
      ? `Detrazione fiscale del ${fmtPct(p.detrazione.aliquota)} recuperata in ${p.detrazione.anni} rate annuali.`
      : 'Nessuna detrazione fiscale considerata.',
  ];
  if (r.kwhBatteria > 0) {
    items.push(
      `Batteria: ${fmtPct(p.dodBatteria)} della capacità utilizzabile, rendimento ${fmtPct(p.rendimentoBatteria)}, degrado ${fmtPct(p.degradoBatteria, 1)} l’anno, un ciclo al giorno.`,
    );
  }
  el(view, 'assumptions')?.replaceChildren(
    ...items.map((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      return li;
    }),
  );
}

export async function renderCharts(view: HTMLElement, r: SimulationResult, charts: Charts): Promise<void> {
  const bars = el(view, 'chart-bars');
  const cash = el(view, 'chart-cash');
  if (bars instanceof HTMLCanvasElement) charts.renderBars(bars, r);
  if (cash instanceof HTMLCanvasElement) charts.renderCashflow(cash, r);
}

// ---------------- Livello 3: solo dimensionamento ottimale ----------------

export function renderCompare(view: HTMLElement, res: OptimizationResult, cfg: ModelConfig, criterio: string): void {
  const anni = cfg.params.anni;
  const best = res.migliori[0]!;
  const seen = new Set<string>();
  const rows: HTMLTableRowElement[] = [];
  const add = (tag: string, r: SimulationResult | null | undefined) => {
    if (!r) return;
    const key = `${r.kwp}|${r.kwhBatteria}`;
    if (seen.has(key)) return;
    seen.add(key);
    const label = document.createElement('span');
    const badge = document.createElement('span');
    badge.className = 'eosolar-tag';
    badge.textContent = tag;
    label.append(badge, document.createTextNode(fmtConfig(r.kwp, r.kwhBatteria)));
    rows.push(
      makeRow(
        [label, fmtEur(r.capex.totale), fmtEur(r.npv), fmtYears(r.paybackAttualizzato, anni), fmtMirr(r.mirr), fmtPct(r.ssr)],
        { className: r === best ? 'eosolar-row-best' : undefined },
      ),
    );
  };
  add('Consigliata', best);
  add('2ª per NPV', res.migliori[1]);
  add('3ª per NPV', res.migliori[2]);
  add('Massimo rendimento', res.migliorRendimento);
  // Alternativa con/senza accumulo alla stessa potenza
  const stessaPotenza = res.tutti.filter((x) => x.kwp === best.kwp && (best.kwhBatteria > 0 ? x.kwhBatteria === 0 : x.kwhBatteria > 0));
  const alternativa = stessaPotenza.sort((a, b) => b.npv - a.npv)[0];
  if (alternativa) add(best.kwhBatteria > 0 ? 'Senza accumulo' : `Con ${fmtKwhBatt(alternativa.kwhBatteria)} di accumulo`, alternativa);

  el(view, 'compare')?.replaceChildren(...rows);
  setText(view, 'iva-col', notaIva(cfg));
  setText(view, 'criterio', criterio);

  const r = res.migliorRendimento;
  const rend = el(view, 'rendimento');
  if (rend) {
    rend.hidden = r === null;
    if (r) {
      rend.textContent =
        r.kwp !== best.kwp || r.kwhBatteria !== best.kwhBatteria
          ? `La configurazione a massimo rendimento (${fmtConfig(r.kwp, r.kwhBatteria)}, MIRR ${fmtMirr(r.mirr)}) rende di più per ogni euro investito, ma genera un guadagno complessivo minore di quella consigliata.`
          : `La configurazione consigliata è anche quella con il rendimento percentuale più alto (MIRR ${fmtMirr(r.mirr)}).`;
    }
  }
}

export function renderSensitivity(view: HTMLElement, rows: SensitivityRow[], anni: number): void {
  el(view, 'sens')?.replaceChildren(
    ...rows.map((s) =>
      makeRow([
        s.scenario,
        fmtEurKwh(s.tariffaAcquisto),
        fmtPct(s.inflazioneEnergia, 1),
        s.fattoreProduttivita === 1 ? 'base' : `${s.fattoreProduttivita > 1 ? '+' : '−'}${fmtPct(Math.abs(s.fattoreProduttivita - 1))}`,
        fmtYears(s.paybackAttualizzato, anni),
        fmtEur(s.npv),
      ]),
    ),
  );
}

/** Curva NPV per potenza (nel livello richiudibile: va disegnata quando è aperto). */
export function renderNpvLayer(view: HTMLElement, res: OptimizationResult, charts: Charts): void {
  const canvas = el(view, 'chart-npv');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const best = res.migliori[0]!;
  const curves = [{ label: 'Senza accumulo', points: npvCurve(res.tutti, 0) }];
  if (best.kwhBatteria > 0) {
    curves.unshift({ label: `Con ${fmtKwhBatt(best.kwhBatteria)} di accumulo`, points: npvCurve(res.tutti, best.kwhBatteria) });
  }
  charts.renderNpvCurve(canvas, curves, best.kwp);
}
