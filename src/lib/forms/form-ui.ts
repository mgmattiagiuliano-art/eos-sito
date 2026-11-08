/**
 * Comportamento comune dei form del sito (contatti, candidatura):
 * validazione accessibile campo per campo, invio tramite submitForm, messaggi di esito.
 *
 * Markup atteso:
 *  - campi con data-validate="required|email|phone|cv|consent" e data-label
 *  - <p data-error-for="<name>" hidden> per ogni campo validato (collegato con aria-describedby)
 *  - [data-form-success] e [data-form-error] (con [data-form-error-msg]) nascosti
 */
import { FormSubmitError, submitForm, type FormName } from './submit';
import { validateCv, validateEmail, validatePhone, validateRequired } from './validate';

type Field = HTMLInputElement | HTMLTextAreaElement;

function check(field: Field): string {
  const label = field.dataset.label ?? field.name;
  const rules = (field.dataset.validate ?? '').split(/\s+/).filter(Boolean);
  for (const rule of rules) {
    let msg = '';
    if (rule === 'required') msg = validateRequired(field.value, label);
    else if (rule === 'email' && field.value.trim()) msg = validateEmail(field.value);
    else if (rule === 'phone' && field.value.trim()) msg = validatePhone(field.value);
    else if (rule === 'cv' && field instanceof HTMLInputElement) msg = validateCv(field.files?.[0]);
    else if (rule === 'consent' && field instanceof HTMLInputElement && !field.checked) {
      msg = "Per inviare il modulo è necessario accettare l'informativa privacy.";
    }
    if (msg) return msg;
  }
  return '';
}

function setError(form: HTMLFormElement, field: Field, msg: string): void {
  field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  const el = form.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);
  if (el) {
    el.textContent = msg;
    el.hidden = !msg;
  }
}

export function initForm(form: HTMLFormElement, name: FormName): void {
  const fields = Array.from(form.querySelectorAll<Field>('[data-validate]'));
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitText = submit?.textContent ?? '';
  const success = form.querySelector<HTMLElement>('[data-form-success]');
  const errorBox = form.querySelector<HTMLElement>('[data-form-error]');
  const errorMsg = form.querySelector<HTMLElement>('[data-form-error-msg]');

  // Ricontrolla un campo già segnalato mentre l'utente lo corregge. Per i campi di testo si usa
  // 'input' e non 'change': 'change' scatta al blur, cioè mentre l'utente clicca altrove, e lo
  // spostamento del layout dovuto al messaggio che sparisce farebbe "mancare" quel click.
  for (const f of fields) {
    const isToggle = f instanceof HTMLInputElement && (f.type === 'checkbox' || f.type === 'file');
    f.addEventListener(isToggle ? 'change' : 'input', () => {
      if (f.getAttribute('aria-invalid') === 'true') setError(form, f, check(f));
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (success) success.hidden = true;
    if (errorBox) errorBox.hidden = true;

    let firstInvalid: Field | null = null;
    for (const f of fields) {
      const msg = check(f);
      setError(form, f, msg);
      if (msg && !firstInvalid) firstInvalid = f;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Invio in corso…';
    }
    form.setAttribute('aria-busy', 'true');
    try {
      await submitForm(name, new FormData(form));
      form.reset();
      fields.forEach((f) => f.removeAttribute('aria-invalid'));
      if (success) {
        success.hidden = false;
        success.focus();
      }
      if (submit) submit.textContent = submitText;
    } catch (err) {
      if (errorMsg) {
        errorMsg.textContent = err instanceof FormSubmitError ? err.message : 'Si è verificato un errore imprevisto. Riprova.';
      }
      if (errorBox) errorBox.hidden = false;
      if (submit) submit.textContent = 'Riprova';
    } finally {
      if (submit) submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}
