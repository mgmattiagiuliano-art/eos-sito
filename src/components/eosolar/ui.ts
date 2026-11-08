/**
 * Controller della UI del calcolatore. Legge i campi, chiama il motore (src/lib/eosolar)
 * e mostra i risultati. Nessuna logica di calcolo qui: i numeri sono gli stessi dei test.
 */
import {
  CRITERIO_OTTIMO,
  VINCOLI,
  defaultConfig,
  npvCurve,
  optimize,
  sensitivity,
  simulate,
  validate,
  type ModelConfig,
  type SimulationResult,
} from '../../lib/eosolar';
import {
  fmtConfig,
  fmtEur,
  fmtEurKwh,
  fmtKwh,
  fmtKwhBatt,
  fmtKwp,
  fmtMirr,
  fmtPct,
  fmtYears,
} from '../../lib/eosolar/format';
import { FormSubmitError, submitForm } from '../../lib/forms/submit';
import { closeModal, openModal } from '../../lib/ui/dialog';

const UNLOCK_KEY = 'eos:eosolar:unlocked';
type TabId = 'input' | 'ottimale' | 'manuale';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile: lo sblocco vale solo per questa pagina */
  }
}

/** Numero da un input; stringa vuota o testo non numerico → NaN (la validazione lo segnala). */
function num(el: HTMLInputElement | HTMLSelectElement | null): number {
  if (!el || el.value.trim() === '') return Number.NaN;
  return Number(el.value.replace(',', '.'));
}

export function initEosolar(root: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const qa = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const dashboard = q('[data-eosolar-dashboard]');
  const form = q<HTMLFormElement>('[data-eosolar-form]');
  const leadDialog = document.getElementById('eosolar-lead') as HTMLDialogElement | null;
  const leadForm = leadDialog?.querySelector<HTMLFormElement>('[data-eosolar-lead-form]') ?? null;
  if (!dashboard || !form) return;

  let unlocked = storageGet(UNLOCK_KEY) === '1';
  let lastConfig: ModelConfig | null = null;
  let chartsModule: Promise<typeof import('./charts')> | null = null;
  const charts = () => (chartsModule ??= import('./charts'));

  // ---------------- Lettura input ----------------
  function readConfig(): ModelConfig {
    const cfg = defaultConfig();
    cfg.consumi.consumoAnnuo = num(q<HTMLInputElement>('[data-consumo-annuo]'));
    cfg.consumi.flessibilita = num(q<HTMLSelectElement>('[data-flessibilita]'));
    cfg.consumi.consumiF1 = qa<HTMLInputElement>('[data-f1]').map(num);
    cfg.consumi.oreEquivalenti = qa<HTMLInputElement>('[data-ore]').map(num);
    for (const el of qa<HTMLInputElement>('[data-param]')) {
      const key = el.dataset.param as keyof ModelConfig['params'];
      (cfg.params as unknown as Record<string, number>)[key] = num(el) * Number(el.dataset.scale ?? 1);
    }
    for (const el of qa<HTMLInputElement>('[data-toggle]')) {
      const k = el.dataset.toggle as 'ritiroDedicato' | 'iva' | 'detrazione';
      cfg.params[k].attivo = el.checked;
    }
    for (const el of qa<HTMLInputElement>('[data-toggle-value]')) {
      const [k, field] = (el.dataset.toggleValue ?? '').split('.') as ['ritiroDedicato' | 'iva' | 'detrazione', string];
      (cfg.params[k] as unknown as Record<string, number>)[field] = num(el) * Number(el.dataset.scale ?? 1);
    }
    return cfg;
  }

  // ---------------- Rendering helpers ----------------
  function fill(tplName: string, values: Record<string, string>): DocumentFragment {
    const tpl = root.querySelector<HTMLTemplateElement>(`template[data-tpl="${tplName}"]`);
    const frag = tpl!.content.cloneNode(true) as DocumentFragment;
    frag.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => {
      el.textContent = values[el.dataset.f ?? ''] ?? '';
    });
    return frag;
  }

  function renderList(container: HTMLElement | null, wrapper: HTMLElement | null, items: string[]): void {
    if (!container || !wrapper) return;
    container.replaceChildren(...items.map((text) => fill('li', { text })));
    wrapper.hidden = items.length === 0;
  }

  function renderMetrics(container: HTMLElement | null, r: SimulationResult, anni: number): void {
    if (!container) return;
    const m = (title: string, value: string, desc: string) => fill('metric', { title, value, desc });
    container.replaceChildren(
      m('Investimento', fmtEur(r.capex.totale), `FV ${fmtEur(r.capex.fv)} · batteria ${fmtEur(r.capex.batteria)}`),
      m('NPV (valore attuale netto)', fmtEur(r.npv), `Guadagno netto attualizzato in ${anni} anni.`),
      m('Payback attualizzato', fmtYears(r.paybackAttualizzato, anni), "Tempo di rientro dell'investimento."),
      m('MIRR', fmtMirr(r.mirr), 'Rendimento annuo, reinvestimento al tasso di sconto.'),
      m('Copertura dei consumi', fmtPct(r.ssr), 'Quota del fabbisogno coperta da impianto e batteria.'),
      m('Autoconsumo', fmtPct(r.scr), 'Quota della produzione usata in casa o accumulata.'),
      m('Produzione anno 1', fmtKwh(r.anno1.produzione), `Immessa in rete: ${fmtKwh(r.anno1.immissione)}.`),
    );
  }

  function warningsFor(cfg: ModelConfig): string[] {
    return validate(cfg)
      .filter((i) => i.gravita === 'avviso')
      .map((i) => i.messaggio);
  }

  // ---------------- Tabs (WAI-ARIA, attivazione automatica) ----------------
  const tabs = qa<HTMLButtonElement>('[role="tab"]');
  function activateTab(id: TabId, focus = false): void {
    for (const t of tabs) {
      const selected = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      if (selected && focus) t.focus();
    }
    for (const panel of qa('[role="tabpanel"]')) panel.hidden = panel.dataset.panel !== id;
    if (id === 'manuale') runManual();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activateTab(t.dataset.tab as TabId));
    t.addEventListener('keydown', (e) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length]!;
      activateTab(target.dataset.tab as TabId, true);
    });
  });

  // ---------------- Riepilogo F1 / F2+F3 ----------------
  const summary = q('[data-f2f3-summary]');
  function updateSummary(): void {
    if (!summary) return;
    const tot = num(q<HTMLInputElement>('[data-consumo-annuo]'));
    const f1 = qa<HTMLInputElement>('[data-f1]').reduce((a, el) => a + (num(el) || 0), 0);
    const f2f3 = Math.max(0, (tot || 0) - f1);
    summary.textContent = `Totale F1 (diurno): ${fmtKwh(f1)} · Totale F2+F3: ${fmtKwh(f2f3)}`;
  }
  form.addEventListener('input', (e) => {
    if ((e.target as HTMLElement).matches('[data-f1], [data-consumo-annuo]')) updateSummary();
  });
  updateSummary();

  // ---------------- Calcolo ottimale ----------------
  const errorsBox = q('[data-input-errors]');
  const errorsList = q('[data-input-errors-list]');

  async function runOptimal(): Promise<boolean> {
    const cfg = readConfig();
    const errors = validate(cfg).filter((i) => i.gravita === 'errore');
    renderList(errorsList, errorsBox, errors.map((i) => i.messaggio));
    if (errors.length) {
      activateTab('input');
      errorsBox?.focus();
      return false;
    }
    lastConfig = cfg;
    const res = optimize(cfg);
    const best = res.migliori[0]!;
    const anni = cfg.params.anni;

    q('[data-out="config"]')!.textContent = fmtConfig(best.kwp, best.kwhBatteria);
    q('[data-out="statement"]')!.textContent =
      `Per un fabbisogno di ${fmtKwh(cfg.consumi.consumoAnnuo)}/anno la configurazione con il valore attuale netto più alto è ` +
      `${fmtConfig(best.kwp, best.kwhBatteria)}: investimento ${fmtEur(best.capex.totale)}, copertura dei consumi ${fmtPct(best.ssr)}, ` +
      `NPV ${fmtEur(best.npv)} in ${anni} anni, rientro ${best.paybackAttualizzato === null ? `oltre ${anni} anni` : `in ${fmtYears(best.paybackAttualizzato, anni)}`}.`;

    const warnings = warningsFor(cfg);
    if (!res.vincoliRispettati) {
      warnings.unshift(
        `Nessuna configurazione rispetta i vincoli (produzione ≤ ${fmtPct(VINCOLI.maxProduzioneSuConsumo)} del consumo, autoconsumo ≥ ${fmtPct(VINCOLI.minAutoconsumo)}): ` +
          'la classifica li ignora. Contattaci per una valutazione su misura.',
      );
    }
    if (best.npv < 0) warnings.push("Con questi dati nessuna configurazione ha un NPV positivo nell'orizzonte considerato.");
    renderList(q('[data-out="warnings-list"]'), q('[data-out="warnings"]'), warnings);

    q('[data-out="criterio"]')!.textContent =
      `Criterio: ${CRITERIO_OTTIMO === 'npv' ? 'massimo NPV' : CRITERIO_OTTIMO}, con produzione ≤ ${fmtPct(VINCOLI.maxProduzioneSuConsumo)} del consumo annuo e autoconsumo ≥ ${fmtPct(VINCOLI.minAutoconsumo)}. ` +
      `Configurazioni valide: ${res.candidatiValidi} su ${res.candidatiTotali}.`;

    renderMetrics(q('[data-out="metrics"]'), best, anni);

    q('[data-out="top"]')!.replaceChildren(
      ...res.migliori.map((r, i) =>
        fill('top-row', {
          rank: String(i + 1),
          config: fmtConfig(r.kwp, r.kwhBatteria),
          capex: fmtEur(r.capex.totale),
          npv: fmtEur(r.npv),
          payback: fmtYears(r.paybackAttualizzato, anni),
          mirr: fmtMirr(r.mirr),
          ssr: fmtPct(r.ssr),
        }),
      ),
    );

    q('[data-out="sens"]')!.replaceChildren(
      ...sensitivity(cfg, best.kwp, best.kwhBatteria).map((s) =>
        fill('sens-row', {
          scenario: s.scenario,
          tariffa: fmtEurKwh(s.tariffaAcquisto),
          inflazione: fmtPct(s.inflazioneEnergia, 1),
          produttivita: s.fattoreProduttivita === 1 ? 'base' : `${s.fattoreProduttivita > 1 ? '+' : '−'}${fmtPct(Math.abs(s.fattoreProduttivita - 1))}`,
          payback: fmtYears(s.paybackAttualizzato, anni),
          npv: fmtEur(s.npv),
        }),
      ),
    );

    activateTab('ottimale');

    const c = await charts();
    c.renderBars(q<HTMLCanvasElement>('[data-chart="bars-opt"]')!, best);
    const curves = [{ label: 'Senza accumulo', points: npvCurve(res.tutti, 0) }];
    if (best.kwhBatteria > 0) {
      curves.unshift({ label: `Con ${fmtKwhBatt(best.kwhBatteria)} di accumulo`, points: npvCurve(res.tutti, best.kwhBatteria) });
    }
    c.renderNpvCurve(q<HTMLCanvasElement>('[data-chart="npv-curve"]')!, curves, best.kwp);
    c.renderCashflow(q<HTMLCanvasElement>('[data-chart="cash-opt"]')!, best);
    return true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void runOptimal();
  });

  // ---------------- Simulazione libera ----------------
  const sliderKwp = q<HTMLInputElement>('[data-slider="kwp"]');
  const sliderKwh = q<HTMLInputElement>('[data-slider="kwh"]');
  let manualFrame = 0;

  function runManual(): void {
    cancelAnimationFrame(manualFrame);
    manualFrame = requestAnimationFrame(async () => {
      if (!sliderKwp || !sliderKwh) return;
      const kwp = Number(sliderKwp.value);
      const kwh = Number(sliderKwh.value);
      q('[data-slider-out="kwp"]')!.textContent = fmtKwp(kwp);
      q('[data-slider-out="kwh"]')!.textContent = fmtKwhBatt(kwh);
      sliderKwp.setAttribute('aria-valuetext', fmtKwp(kwp));
      sliderKwh.setAttribute('aria-valuetext', fmtKwhBatt(kwh));

      const cfg = readConfig();
      const errors = validate(cfg).filter((i) => i.gravita === 'errore');
      if (errors.length) {
        renderList(q('[data-out="man-warnings-list"]'), q('[data-out="man-warnings"]'), [
          'Correggi i dati nel tab "Dati e consumi" per vedere la simulazione.',
        ]);
        return;
      }
      const r = simulate(cfg, kwp, kwh);
      const warnings = warningsFor(cfg);
      if (r.anno1.produzione > VINCOLI.maxProduzioneSuConsumo * cfg.consumi.consumoAnnuo) {
        warnings.push(`La produzione supera il ${fmtPct(VINCOLI.maxProduzioneSuConsumo)} del consumo annuo.`);
      }
      if (r.scr < VINCOLI.minAutoconsumo) warnings.push(`Autoconsumo sotto il ${fmtPct(VINCOLI.minAutoconsumo)}.`);
      renderList(q('[data-out="man-warnings-list"]'), q('[data-out="man-warnings"]'), warnings);
      renderMetrics(q('[data-out="man-metrics"]'), r, cfg.params.anni);
      const c = await charts();
      c.renderBars(q<HTMLCanvasElement>('[data-chart="bars-man"]')!, r);
      c.renderCashflow(q<HTMLCanvasElement>('[data-chart="cash-man"]')!, r);
    });
  }
  sliderKwp?.addEventListener('input', runManual);
  sliderKwh?.addEventListener('input', runManual);

  // ---------------- Sblocco / lead gate ----------------
  const openLabels = Array.from(document.querySelectorAll<HTMLElement>('[data-eosolar-open-label]'));

  function showDashboard(scroll: boolean): void {
    dashboard!.hidden = false;
    openLabels.forEach((l) => (l.textContent = 'Vai al calcolatore'));
    if (scroll) dashboard!.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  async function unlock(): Promise<void> {
    unlocked = true;
    storageSet(UNLOCK_KEY, '1');
    showDashboard(true);
    if (!lastConfig) await runOptimal();
    // Il focus passa ai risultati (annunciati dagli screen reader), senza saltare con lo scroll
    q('[data-panel="ottimale"]')?.focus({ preventScroll: true });
  }

  // Qualsiasi pulsante [data-eosolar-open] nella pagina (teaser, hero, …)
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-eosolar-open]');
    if (!btn) return;
    e.preventDefault();
    if (unlocked) {
      showDashboard(true);
      if (!lastConfig) void runOptimal();
    } else {
      openModal('eosolar-lead', btn);
    }
  });

  if (unlocked) showDashboard(false);

  if (leadForm && leadDialog) initLeadForm(leadForm, leadDialog, unlock);
}

// ---------------- Form del lead gate ----------------
function initLeadForm(form: HTMLFormElement, dialog: HTMLDialogElement, onSuccess: () => Promise<void>): void {
  const email = form.querySelector<HTMLInputElement>('input[name="email"]')!;
  const privacy = form.querySelector<HTMLInputElement>('input[name="privacy"]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-lead-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-lead-submit-label]')!;
  const errorBox = form.querySelector<HTMLElement>('[data-lead-error]')!;
  const errorMsg = form.querySelector<HTMLElement>('[data-lead-error-msg]')!;

  const setFieldError = (input: HTMLInputElement, message: string) => {
    const el = form.querySelector<HTMLElement>(`[data-error-for="${input.name}"]`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (el) {
      el.textContent = message;
      el.hidden = !message;
    }
  };

  const validateFields = (): boolean => {
    const emailOk = email.value.trim() !== '' && email.validity.valid;
    setFieldError(email, emailOk ? '' : 'Inserisci un indirizzo email valido.');
    setFieldError(privacy, privacy.checked ? '' : "Per proseguire è necessario accettare l'informativa privacy.");
    if (!emailOk) email.focus();
    else if (!privacy.checked) privacy.focus();
    return emailOk && privacy.checked;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    if (!validateFields()) return;

    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Invio in corso…';
    try {
      await submitForm('lead-calcolatore-fotovoltaico', new FormData(form));
      closeModal(dialog);
      form.reset();
      submitLabel.textContent = 'Sblocca il calcolatore';
      await onSuccess();
    } catch (err) {
      // Decisione di progetto: in caso di errore NON si sblocca (il lead andrebbe perso);
      // si mostra il motivo, si offre "Riprova" e i contatti diretti.
      errorMsg.textContent =
        err instanceof FormSubmitError ? err.message : 'Si è verificato un errore imprevisto. Riprova.';
      errorBox.hidden = false;
      submitLabel.textContent = 'Riprova';
    } finally {
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}
