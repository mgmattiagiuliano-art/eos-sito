/**
 * Controller della UI del calcolatore. Legge i campi, chiama il motore (src/lib/eosolar)
 * e mostra i risultati. Nessuna logica di calcolo qui: i numeri sono gli stessi dei test.
 */
import {
  CRITERIO_OTTIMO,
  RANGE,
  VINCOLI,
  defaultConfig,
  kwpGrid,
  optimize,
  sensitivity,
  simulate,
  validate,
  type ModelConfig,
  type OptimizationResult,
} from '../../lib/eosolar';
import { fmtKwh, fmtKwhBatt, fmtKwp, fmtPct } from '../../lib/eosolar/format';
import { renderCharts, renderCompare, renderNpvLayer, renderResult, renderSensitivity } from './results';
import { checkAdminPassword } from '../../lib/eosolar/admin';
import { FormSubmitError, submitForm } from '../../lib/forms/submit';
import { closeModal, openModal } from '../../lib/ui/dialog';

const UNLOCK_KEY = 'eos:eosolar:unlocked';
/** Sblocco dei parametri avanzati: vale solo per la sessione del browser. */
const ADMIN_KEY = 'eos:eosolar:admin';
type TabId = 'input' | 'ottimale' | 'manuale';

const LIMITE_LABEL = {
  produzione: 'limite di produzione rispetto ai consumi',
  installabile: 'potenza massima installabile',
  simulatore: 'limite del simulatore',
} as const;

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
function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function sessionSet(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
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
  let lastOpt: OptimizationResult | null = null;
  const optView = q('[data-result="opt"]')!;
  const manView = q('[data-result="man"]')!;
  // La curva NPV sta in un livello richiudibile: Chart.js non può misurare un canvas nascosto,
  // quindi la disegniamo all'apertura.
  const npvLayer = optView.querySelector<HTMLDetailsElement>('[data-r="layer-curve"]');
  npvLayer?.addEventListener('toggle', async () => {
    if (npvLayer.open && lastOpt) renderNpvLayer(optView, lastOpt, await charts());
  });
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
    // Curve dei costi (modificabili solo con i parametri avanzati sbloccati)
    for (const curva of ['fv', 'batteria'] as const) {
      const inputs = qa<HTMLInputElement>(`[data-cost="${curva}"]`);
      if (inputs.length) cfg.costi[curva] = inputs.map((el) => ({ size: Number(el.dataset.size), unitCost: num(el) }));
    }
    const fisso = q<HTMLInputElement>('[data-cost-fisso]');
    if (fisso) cfg.costi.fissoImpianto = num(fisso);
    cfg.sito.kwpMax = readKwpMax();
    return cfg;
  }

  /** Potenza massima installabile: campo vuoto = nessun limite. */
  function readKwpMax(): number | null {
    const el = q<HTMLInputElement>('[data-kwp-max]');
    return !el || el.value.trim() === '' ? null : num(el);
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
    lastOpt = res;

    const statement =
      `Per un fabbisogno di ${fmtKwh(cfg.consumi.consumoAnnuo)} l’anno è la configurazione con il guadagno netto (NPV) più alto ` +
      `tra quelle che rispettano i vincoli. Copre il ${fmtPct(best.ssr)} dei consumi.`;
    renderResult(optView, best, cfg, statement);

    const warnings = warningsFor(cfg);
    if (!res.vincoliRispettati) {
      warnings.unshift(
        `Nessuna configurazione rispetta i vincoli (produzione ≤ ${fmtPct(VINCOLI.maxProduzioneSuConsumo)} del consumo, autoconsumo ≥ ${fmtPct(VINCOLI.minAutoconsumo)}): ` +
          'la classifica li ignora. Contattaci per una valutazione su misura.',
      );
    }
    if (res.ottimoAlLimite) {
      warnings.push(
        res.limiteKwp.motivo === 'installabile'
          ? `La configurazione migliore coincide con la potenza massima installabile (${fmtKwp(res.limiteKwp.valore)}): con più spazio disponibile il valore potrebbe crescere ancora.`
          : `La configurazione migliore coincide con il limite del simulatore (${fmtKwp(res.limiteKwp.valore)}): per impianti di questa taglia contattaci per uno studio dedicato.`,
      );
    }
    if (best.npv < 0) warnings.push("Con questi dati nessuna configurazione ha un NPV positivo nell'orizzonte considerato.");
    renderList(optView.querySelector('[data-r="warnings-list"]'), optView.querySelector('[data-r="warnings"]'), warnings);

    const criterio =
      `Criterio: ${CRITERIO_OTTIMO === 'npv' ? 'massimo NPV' : CRITERIO_OTTIMO}, con produzione ≤ ${fmtPct(VINCOLI.maxProduzioneSuConsumo)} del consumo annuo e autoconsumo ≥ ${fmtPct(VINCOLI.minAutoconsumo)}. ` +
      `Potenza esplorata fino a ${fmtKwp(Math.min(res.limiteKwp.valore, RANGE.kwp.max))} (${LIMITE_LABEL[res.limiteKwp.motivo]}). ` +
      `Configurazioni valide: ${res.candidatiValidi} su ${res.candidatiTotali}.`;
    renderCompare(optView, res, cfg, criterio);
    renderSensitivity(optView, sensitivity(cfg, best.kwp, best.kwhBatteria), anni);

    activateTab('ottimale');

    const c = await charts();
    await renderCharts(optView, best, c);
    if (npvLayer?.open) renderNpvLayer(optView, res, c);
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

  // Gli slider scorrono gli indici delle stesse griglie dell'ottimizzatore (passo kWp variabile)
  let gridKwp = kwpGrid();
  const gridKwh: readonly number[] = RANGE.kwhBatteria;

  /** Ricostruisce la griglia kWp quando cambia la potenza massima installabile, mantenendo la potenza scelta. */
  function syncKwpSlider(): void {
    if (!sliderKwp) return;
    const corrente = gridKwp[Number(sliderKwp.value)] ?? 3;
    const max = readKwpMax();
    gridKwp = kwpGrid(max !== null && Number.isFinite(max) && max >= RANGE.kwp.min ? max : RANGE.kwp.max);
    let idx = gridKwp.findIndex((k) => k >= corrente - 1e-9);
    if (idx === -1) idx = gridKwp.length - 1;
    sliderKwp.max = String(gridKwp.length - 1);
    sliderKwp.value = String(idx);
  }
  q('[data-kwp-max]')?.addEventListener('change', () => {
    syncKwpSlider();
    if (!q('[data-panel="manuale"]')?.hidden) runManual();
  });

  function runManual(): void {
    cancelAnimationFrame(manualFrame);
    manualFrame = requestAnimationFrame(async () => {
      if (!sliderKwp || !sliderKwh) return;
      const kwp = gridKwp[Number(sliderKwp.value)] ?? gridKwp[0]!;
      const kwh = gridKwh[Number(sliderKwh.value)] ?? 0;
      q('[data-slider-out="kwp"]')!.textContent = fmtKwp(kwp);
      q('[data-slider-out="kwh"]')!.textContent = fmtKwhBatt(kwh);
      sliderKwp.setAttribute('aria-valuetext', fmtKwp(kwp));
      sliderKwh.setAttribute('aria-valuetext', fmtKwhBatt(kwh));

      const cfg = readConfig();
      const warnList = manView.querySelector<HTMLElement>('[data-r="warnings-list"]');
      const warnBox = manView.querySelector<HTMLElement>('[data-r="warnings"]');
      const errors = validate(cfg).filter((i) => i.gravita === 'errore');
      if (errors.length) {
        renderList(warnList, warnBox, ['Correggi i dati nel tab "Dati e consumi" per vedere la simulazione.']);
        return;
      }
      const r = simulate(cfg, kwp, kwh);
      const warnings = warningsFor(cfg);
      if (r.anno1.produzione > VINCOLI.maxProduzioneSuConsumo * cfg.consumi.consumoAnnuo) {
        warnings.push(`La produzione supera il ${fmtPct(VINCOLI.maxProduzioneSuConsumo)} del consumo annuo.`);
      }
      if (r.scr < VINCOLI.minAutoconsumo) warnings.push(`Autoconsumo sotto il ${fmtPct(VINCOLI.minAutoconsumo)}.`);
      renderList(warnList, warnBox, warnings);
      renderResult(manView, r, cfg, `Copre il ${fmtPct(r.ssr)} dei consumi; produzione del primo anno ${fmtKwh(r.anno1.produzione)}.`);
      await renderCharts(manView, r, await charts());
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
    // Dopo l'email si parte dal tab 1: il cliente inserisce i propri dati e poi avvia il calcolo
    activateTab('input');
    q('[data-panel="input"]')?.focus({ preventScroll: true });
  }

  // Qualsiasi pulsante [data-eosolar-open] nella pagina (teaser, hero, …)
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-eosolar-open]');
    if (!btn) return;
    e.preventDefault();
    if (unlocked) {
      showDashboard(true);
      if (!lastConfig) activateTab('input');
    } else {
      openModal('eosolar-lead', btn);
    }
  });

  if (unlocked) showDashboard(false);

  if (leadForm && leadDialog) initLeadForm(leadForm, leadDialog, unlock);
  initAdmin(root);
}

// ---------------- Parametri avanzati protetti da password ----------------
function initAdmin(root: HTMLElement): void {
  const dialog = document.getElementById('eosolar-admin') as HTMLDialogElement | null;
  const form = dialog?.querySelector<HTMLFormElement>('[data-eosolar-admin-form]') ?? null;
  const locked = root.querySelector<HTMLElement>('[data-admin-locked]');
  const unlockedBar = root.querySelector<HTMLElement>('[data-admin-unlocked]');
  const openBtn = root.querySelector<HTMLButtonElement>('[data-admin-open]');
  const lockBtn = root.querySelector<HTMLButtonElement>('[data-admin-lock]');
  if (!dialog || !form || !locked || !unlockedBar || !openBtn || !lockBtn) return;
  const input = form.querySelector<HTMLInputElement>('input[name="password"]')!;
  const error = form.querySelector<HTMLElement>('[data-admin-error]')!;

  function setAdmin(on: boolean): void {
    root.querySelectorAll<HTMLInputElement>('[data-admin]').forEach((el) => (el.disabled = !on));
    locked!.hidden = on;
    unlockedBar!.hidden = !on;
    sessionSet(ADMIN_KEY, on ? '1' : null);
  }

  openBtn.addEventListener('click', () => {
    form.reset();
    error.hidden = true;
    input.setAttribute('aria-invalid', 'false');
    openModal('eosolar-admin', openBtn);
    input.focus();
  });
  lockBtn.addEventListener('click', () => {
    setAdmin(false);
    openBtn.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!checkAdminPassword(input.value)) {
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.select();
      return;
    }
    setAdmin(true);
    closeModal(dialog);
    lockBtn.focus();
  });

  if (sessionGet(ADMIN_KEY) === '1') setAdmin(true);
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
