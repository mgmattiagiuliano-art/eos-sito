import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COSTI,
  RANGE,
  VINCOLI,
  defaultConfig,
  discountedPayback,
  gridValues,
  kwpGrid,
  kwpLimit,
  mirr,
  monthlyBalance,
  npv,
  optimize,
  satisfiesConstraints,
  sensitivity,
  simulate,
  totalCost,
  unitCost,
  validate,
  type ModelConfig,
} from './index';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('interpolazione costi', () => {
  const fv = DEFAULT_COSTI.fv;
  const bess = DEFAULT_COSTI.batteria;

  it('bordi: zero, sotto il minimo, sui punti estremi, oltre il massimo', () => {
    expect(unitCost(fv, 0)).toBe(0);
    expect(unitCost(fv, -1)).toBe(0);
    expect(unitCost(fv, 0.5)).toBe(2000);
    expect(unitCost(fv, 1)).toBe(2000);
    expect(unitCost(fv, 20)).toBe(1350);
    expect(unitCost(fv, 100)).toBe(1100);
    expect(unitCost(fv, 250)).toBe(1100);
    expect(unitCost(bess, 1)).toBe(700);
    expect(unitCost(bess, 15)).toBe(400);
  });

  it('punti intermedi lineari', () => {
    expect(unitCost(fv, 7)).toBe(1600); // tra 6 (1650) e 8 (1550)
    expect(unitCost(fv, 12.5)).toBe(1450); // tra 10 (1500) e 15 (1400)
    expect(unitCost(bess, 6.25)).toBe(525);
    expect(unitCost(fv, 3)).toBe(1800); // esattamente su un punto
  });

  it('costo totale = taglia × costo unitario', () => {
    expect(totalCost(fv, 7)).toBe(11200);
    expect(totalCost(bess, 0)).toBe(0);
  });
});

describe('bilancio energetico mensile', () => {
  const cfg = defaultConfig();
  const casi: [number, number][] = [
    [1, 0],
    [3, 0],
    [4, 5],
    [6, 2.5],
    [10, 15],
    [20, 15],
  ];

  it.each(casi)('%s kWp + %s kWh: produzione = autoconsumo + carica + immissione', (kwp, kwh) => {
    const cap = kwh * cfg.params.dodBatteria;
    const mesi = monthlyBalance(cfg.consumi, kwp, cap, cfg.params.rendimentoBatteria);
    mesi.forEach((m, i) => {
      close(m.produzione, m.autoconsumoDiretto + m.caricaBatteria + m.immissione);
      close(m.consumoDiurno + m.consumoNotturno, m.autoconsumoDiretto + m.scaricaBatteria + m.prelievo);
      expect(m.immissione).toBeGreaterThanOrEqual(-1e-9);
      expect(m.scaricaBatteria).toBeLessThanOrEqual(m.consumoNotturno + 1e-9);
      expect(m.caricaBatteria).toBeLessThanOrEqual(cap * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i]! + 1e-9);
      close(m.scaricaBatteria, m.caricaBatteria * cfg.params.rendimentoBatteria);
    });
  });

  it('senza batteria non c’è carica né scarica', () => {
    const mesi = monthlyBalance(cfg.consumi, 5, 0, 0.88);
    expect(mesi.every((m) => m.caricaBatteria === 0 && m.scaricaBatteria === 0)).toBe(true);
  });
});

describe('flussi di cassa', () => {
  const cfg = defaultConfig();
  const r = simulate(cfg, 4, 5);
  const p = cfg.params;

  it('sostituzione inverter nell’anno 15, batteria nell’anno 12, inflazionate', () => {
    const conSost = r.flussi.filter((f) => f.sostituzioni > 0).map((f) => f.anno);
    expect(conSost).toEqual([12, 15]);
    close(r.flussi[11]!.sostituzioni, 0.7 * r.capex.batteria * Math.pow(1 + p.inflazioneGenerale, 11));
    close(r.flussi[14]!.sostituzioni, 0.075 * r.capex.fv * Math.pow(1 + p.inflazioneGenerale, 14));
  });

  it('senza batteria nessuna sostituzione batteria', () => {
    const s = simulate(cfg, 4, 0);
    expect(s.flussi.filter((f) => f.sostituzioni > 0).map((f) => f.anno)).toEqual([15]);
  });

  it('O&M indicizzato all’inflazione generale', () => {
    close(r.flussi[0]!.oem, p.oemPerc * r.capex.netto);
    close(r.flussi[9]!.oem, p.oemPerc * r.capex.netto * Math.pow(1 + p.inflazioneGenerale, 9));
  });

  it('il degrado batteria riduce la scarica; la sostituzione ripristina la capacità', () => {
    // batteria piccola su impianto grande: la capacità è il vincolo che limita la carica
    const s = simulate(cfg, 10, 2.5);
    const scarica = (anno: number) => s.flussi[anno - 1]!.energia.scaricaBatteria;
    expect(scarica(12)).toBeLessThan(scarica(1));
    expect(scarica(13)).toBeGreaterThan(scarica(12));
  });

  it('ritiro dedicato disattivato di default; se attivo valorizza l’immissione', () => {
    expect(r.flussi.every((f) => f.ricavoRitiro === 0)).toBe(true);
    const c: ModelConfig = { ...cfg, params: { ...p, ritiroDedicato: { attivo: true, prezzo: 0.1 } } };
    const s = simulate(c, 4, 5);
    close(s.flussi[0]!.ricavoRitiro, s.flussi[0]!.energia.immissione * 0.1);
  });

  it('IVA e detrazione, se attive', () => {
    const c: ModelConfig = {
      ...cfg,
      params: { ...p, iva: { attivo: true, aliquota: 0.1 }, detrazione: { attivo: true, aliquota: 0.5, anni: 10 } },
    };
    const s = simulate(c, 4, 5);
    close(s.capex.totale, s.capex.netto * 1.1);
    close(s.flussi[0]!.detrazione, (s.capex.totale * 0.5) / 10);
    close(s.flussi[9]!.detrazione, (s.capex.totale * 0.5) / 10);
    expect(s.flussi[10]!.detrazione).toBe(0);
  });
});

describe('indicatori finanziari (calcolati a mano)', () => {
  const flows = [-100, 60, 60];

  it('NPV', () => close(npv(0.1, flows), -100 + 60 / 1.1 + 60 / 1.21));
  it('MIRR', () => close(mirr(0.1, flows)!, Math.sqrt((60 * 1.1 + 60) / 100) - 1));
  it('payback attualizzato interpolato', () => {
    const cum1 = -100 + 60 / 1.1;
    close(discountedPayback(0.1, flows)!, 1 + -cum1 / (60 / 1.21));
  });
  it('payback null se non si rientra', () => expect(discountedPayback(0.1, [-100, 10, 10])).toBeNull());
  it('payback: conta l’ultimo attraversamento', () => {
    // cumulati: -100, 20, -30, 30 → 2 + 30/60
    close(discountedPayback(0, [-100, 120, -50, 60])!, 2.5);
  });
  it('MIRR con flusso negativo intermedio', () => {
    const atteso = Math.pow((120 * 1.21 + 60) / (100 + 50 / 1.21), 1 / 3) - 1;
    close(mirr(0.1, [-100, 120, -50, 60])!, atteso);
  });

  it('simulazione di un caso semplice a mano: 1 kWp, tutto autoconsumato', () => {
    const cfg = defaultConfig();
    const c: ModelConfig = {
      ...cfg,
      consumi: { consumoAnnuo: 1200, consumiF1: Array(12).fill(100), oreEquivalenti: Array(12).fill(50), flessibilita: 0 },
      params: { ...cfg.params, inflazioneEnergia: 0, degradoFV: 0, oemPerc: 0, annoInverter: 99, anni: 25 },
      costi: { ...cfg.costi, fissoImpianto: 0 },
    };
    const s = simulate(c, 1, 0);
    // 600 kWh/anno × 0,25 € = 150 €/anno; CAPEX 2000 €; NPV = −2000 + 150 × (1 − 1,06^−25)/0,06
    const atteso = -2000 + (150 * (1 - Math.pow(1.06, -25))) / 0.06;
    close(s.npv, atteso, 1e-6);
    close(s.npv, -82.496, 1e-3);
    expect(s.paybackAttualizzato).toBeNull();
    close(s.scr, 1);
    close(s.ssr, 0.5);
  });
});

describe('ottimizzatore', () => {
  const cfg = defaultConfig();
  const res = optimize(cfg);

  it('griglia kWp a passo variabile da 1 a 1000 kWp, senza tetto a 20 kWp', () => {
    const g = kwpGrid();
    expect(g[0]).toBe(RANGE.kwp.min);
    expect(g[g.length - 1]).toBe(1000);
    expect(g).toHaveLength(1 + 18 + 20 + 28 + 40 + 70);
    expect(g.slice(0, 3)).toEqual([1, 1.5, 2]);
    expect(g).toContain(10.5 - 0.5);
    expect(g).toContain(11);
    expect(g).toContain(32.5);
    expect(g).toContain(105);
    expect(g).toContain(310);
    for (let i = 1; i < g.length; i++) expect(g[i]!).toBeGreaterThan(g[i - 1]!);
    expect(gridValues(1, 2, 0.5)).toEqual([1, 1.5, 2]);
  });

  it('la griglia termina esattamente sulla potenza massima installabile', () => {
    const g = kwpGrid(37);
    expect(g.slice(-2)).toEqual([35, 37]);
    expect(kwpGrid(40).slice(-1)).toEqual([40]);
  });

  it('non simula potenze oltre il vincolo di produzione', () => {
    const limite = kwpLimit(cfg);
    expect(limite.motivo).toBe('produzione');
    close(limite.valore, (1.4 * 3800) / 1365);
    const kwps = new Set(res.tutti.map((r) => r.kwp));
    expect(Math.max(...kwps)).toBeLessThanOrEqual(limite.valore);
    expect(res.candidatiTotali).toBe(kwps.size * RANGE.kwhBatteria.length);
  });

  it('i migliori rispettano i vincoli e l’ottimo ha l’NPV massimo tra i validi', () => {
    expect(res.vincoliRispettati).toBe(true);
    for (const m of res.migliori) {
      expect(satisfiesConstraints(m, cfg.consumi.consumoAnnuo)).toBe(true);
      expect(m.anno1.produzione).toBeLessThanOrEqual(VINCOLI.maxProduzioneSuConsumo * cfg.consumi.consumoAnnuo);
      expect(m.scr).toBeGreaterThanOrEqual(VINCOLI.minAutoconsumo);
    }
    const maxNpv = Math.max(
      ...res.tutti.filter((r) => satisfiesConstraints(r, cfg.consumi.consumoAnnuo)).map((r) => r.npv),
    );
    expect(res.migliori[0]!.npv).toBe(maxNpv);
    expect(res.migliori).toHaveLength(3);
    expect(res.migliori[0]!.npv).toBeGreaterThanOrEqual(res.migliori[1]!.npv);
    expect(res.migliori[1]!.npv).toBeGreaterThanOrEqual(res.migliori[2]!.npv);
  });

  it('massimo rendimento: MIRR più alto tra i candidati con NPV positivo', () => {
    const r = res.migliorRendimento!;
    const validi = res.tutti.filter((x) => satisfiesConstraints(x, cfg.consumi.consumoAnnuo) && x.npv > 0 && x.mirr !== null);
    expect(r.mirr).toBe(Math.max(...validi.map((x) => x.mirr!)));
  });

  it('impianti aziendali: l’ottimo può superare 20 kWp', () => {
    const big = defaultConfig();
    const k = 100000 / big.consumi.consumoAnnuo;
    big.consumi.consumoAnnuo = 100000;
    big.consumi.consumiF1 = big.consumi.consumiF1.map((v) => v * k);
    const r = optimize(big);
    expect(r.migliori[0]!.kwp).toBeGreaterThan(20);
    expect(r.vincoliRispettati).toBe(true);
  });

  it('rispetta la potenza massima installabile e segnala quando l’ottimo la raggiunge', () => {
    const big = defaultConfig();
    const k = 100000 / big.consumi.consumoAnnuo;
    big.consumi.consumoAnnuo = 100000;
    big.consumi.consumiF1 = big.consumi.consumiF1.map((v) => v * k);
    big.sito.kwpMax = 37;
    const r = optimize(big);
    expect(r.limiteKwp).toEqual({ valore: 37, motivo: 'installabile' });
    expect(Math.max(...r.tutti.map((x) => x.kwp))).toBe(37);
    expect(r.migliori[0]!.kwp).toBe(37);
    expect(r.ottimoAlLimite).toBe(true);
    expect(res.ottimoAlLimite).toBe(false);
  });

  it('segnala quando nessun candidato rispetta i vincoli', () => {
    const r = optimize(cfg, { maxProduzioneSuConsumo: 1.4, minAutoconsumo: 1.01 });
    expect(r.vincoliRispettati).toBe(false);
    expect(r.candidatiValidi).toBe(0);
  });
});

describe('sensibilità', () => {
  it('ogni scenario varia tariffa, inflazione e produttività in modo coerente', () => {
    const cfg = defaultConfig();
    const rows = sensitivity(cfg, 4, 0);
    const [pess, base, ott] = rows;
    expect(new Set(rows.map((r) => r.inflazioneEnergia)).size).toBe(3);
    expect(new Set(rows.map((r) => r.fattoreProduttivita)).size).toBe(3);
    expect(base!.tariffaAcquisto).toBe(cfg.params.tariffaAcquisto);
    expect(pess!.npv).toBeLessThan(base!.npv);
    expect(ott!.npv).toBeGreaterThan(base!.npv);
    close(base!.npv, simulate(cfg, 4, 0).npv);
  });
});

describe('curve dei costi', () => {
  it('include i punti 50 e 100 kWp e interpola tra 20 e 50 kWp', () => {
    const sizes = DEFAULT_COSTI.fv.map((c) => c.size);
    expect(sizes).toContain(50);
    expect(sizes).toContain(100);
    const c20 = unitCost(DEFAULT_COSTI.fv, 20);
    const c50 = unitCost(DEFAULT_COSTI.fv, 50);
    close(unitCost(DEFAULT_COSTI.fv, 35), (c20 + c50) / 2);
  });

  it('costo fisso per impianto: si somma solo se c’è il fotovoltaico, escluso dalla base inverter', () => {
    const cfg = defaultConfig();
    expect(cfg.costi.fissoImpianto).toBe(1000);
    const r = simulate(cfg, 3, 0);
    expect(r.capex.fisso).toBe(1000);
    expect(r.capex.netto).toBe(r.capex.fv + r.capex.fisso);
    expect(simulate(cfg, 0, 5).capex.fisso).toBe(0);
    const inverter = r.flussi.find((f) => f.anno === cfg.params.annoInverter)!.sostituzioni;
    close(inverter, cfg.params.inverterPerc * r.capex.fv * Math.pow(1 + cfg.params.inflazioneGenerale, cfg.params.annoInverter - 1));
    const senza = defaultConfig();
    senza.costi.fissoImpianto = 0;
    const r0 = simulate(senza, 3, 0);
    // il costo fisso riduce l'NPV di sé stesso più l'O&M che genera
    expect(r0.npv - r.npv).toBeGreaterThan(1000);
  });

  it('i costi modificati entrano nel CAPEX', () => {
    const cfg = defaultConfig();
    cfg.costi.fv = cfg.costi.fv.map((c) => ({ ...c, unitCost: c.unitCost * 2 }));
    close(simulate(cfg, 3, 0).capex.fv, 2 * simulate(defaultConfig(), 3, 0).capex.fv);
  });
});

describe('validazione', () => {
  it('controlla tutti i parametri, i costi e la potenza installabile', () => {
    const errore = (mut: (c: ModelConfig) => void, campo: string) => {
      const cfg = defaultConfig();
      mut(cfg);
      return validate(cfg).some((i) => i.campo === campo && i.gravita === 'errore');
    };
    expect(errore((c) => (c.params.dodBatteria = Number.NaN), 'dodBatteria')).toBe(true);
    expect(errore((c) => (c.params.rendimentoBatteria = 1.5), 'rendimentoBatteria')).toBe(true);
    expect(errore((c) => (c.params.tariffaAcquisto = -0.1), 'tariffaAcquisto')).toBe(true);
    expect(errore((c) => (c.params.degradoFV = -0.05), 'degradoFV')).toBe(true);
    expect(errore((c) => (c.params.annoInverter = Number.NaN), 'annoInverter')).toBe(true);
    expect(errore((c) => (c.params.annoBatteriaSost = 30), 'annoBatteriaSost')).toBe(true);
    expect(errore((c) => (c.params.ritiroDedicato = { attivo: true, prezzo: Number.NaN }), 'ritiroDedicato')).toBe(true);
    expect(errore((c) => (c.params.ritiroDedicato = { attivo: false, prezzo: Number.NaN }), 'ritiroDedicato')).toBe(false);
    expect(errore((c) => (c.costi.fv[0]!.unitCost = -1), 'costi.fv')).toBe(true);
    expect(errore((c) => (c.costi.batteria[0]!.unitCost = Number.NaN), 'costi.batteria')).toBe(true);
    expect(errore((c) => (c.costi.fissoImpianto = -1), 'costi.fissoImpianto')).toBe(true);
    expect(errore((c) => (c.sito.kwpMax = 0.5), 'kwpMax')).toBe(true);
    expect(errore((c) => (c.sito.kwpMax = 50), 'kwpMax')).toBe(false);
  });

  it('errori su input mancanti e avviso se F1 supera il totale', () => {
    const cfg = defaultConfig();
    expect(validate(cfg)).toEqual([]);
    cfg.consumi.consumoAnnuo = Number.NaN;
    expect(validate(cfg).some((i) => i.campo === 'consumoAnnuo' && i.gravita === 'errore')).toBe(true);
    cfg.consumi.consumoAnnuo = 1000;
    expect(validate(cfg).some((i) => i.campo === 'consumiF1' && i.gravita === 'avviso')).toBe(true);
  });
});
