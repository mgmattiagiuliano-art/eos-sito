/**
 * Adapter portabile per l'invio dei form.
 *
 * Il backend si sceglie con PUBLIC_FORMS_PROVIDER:
 *  - local    (default): nessun invio; log in console + salvataggio in localStorage.
 *  - netlify : POST a "/" con `form-name` (url-encoded, multipart se c'è un file).
 *  - endpoint: POST multipart a PUBLIC_FORMS_ENDPOINT (Formspree, Getform, backend proprio).
 *
 * Ogni errore viene rilanciato come FormSubmitError con un messaggio in italiano da mostrare
 * all'utente: nessun errore viene ingoiato.
 */

export const FORM_NAMES = [
  'lead-calcolatore-fotovoltaico',
  'contatti-ufficiali',
  'candidatura-tecnici',
] as const;
export type FormName = (typeof FORM_NAMES)[number];

export type FormsProvider = 'local' | 'netlify' | 'endpoint';

/** Nome del campo honeypot: deve coincidere con `netlify-honeypot` sui <form>. */
export const HONEYPOT_FIELD = 'bot-field';

export interface FormsConfig {
  provider: FormsProvider;
  endpoint?: string;
  /** Solo provider local: forza il fallimento per provare i messaggi d'errore. */
  simulateError?: boolean;
  fetchImpl?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Timeout della richiesta di rete in millisecondi. */
  timeoutMs?: number;
}

export type FormSubmitErrorKind = 'network' | 'server' | 'config' | 'simulated';

export class FormSubmitError extends Error {
  readonly kind: FormSubmitErrorKind;
  readonly status?: number;

  constructor(kind: FormSubmitErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'FormSubmitError';
    this.kind = kind;
    this.status = status;
  }
}

export interface SubmitResult {
  provider: FormsProvider;
  /** true se l'honeypot era compilato: risposta "ok" silenziosa, nessun invio. */
  spam: boolean;
}

const MSG_NETWORK =
  'Non siamo riusciti a inviare il modulo: controlla la connessione e riprova.';
const MSG_SERVER = 'Il server non ha accettato il modulo. Riprova tra qualche minuto.';
const MSG_CONFIG =
  'Il modulo non è configurato correttamente. Contattaci per telefono o email.';

function parseProvider(value: string | undefined): FormsProvider {
  return value === 'netlify' || value === 'endpoint' ? value : 'local';
}

/** Configurazione letta dalle variabili d'ambiente PUBLIC_* (inlined da Vite al build). */
export function configFromEnv(env: ImportMetaEnv = import.meta.env): FormsConfig {
  return {
    provider: parseProvider(env.PUBLIC_FORMS_PROVIDER),
    endpoint: env.PUBLIC_FORMS_ENDPOINT || undefined,
    simulateError: env.PUBLIC_FORMS_SIMULATE_ERROR === 'true',
  };
}

function hasFile(data: FormData): boolean {
  for (const [, value] of data.entries()) {
    if (typeof value !== 'string') return true;
  }
  return false;
}

function toUrlEncoded(data: FormData): string {
  const params = new URLSearchParams();
  for (const [key, value] of data.entries()) {
    if (typeof value === 'string') params.append(key, value);
  }
  return params.toString();
}

async function send(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(url, { ...init, signal: controller.signal });
  } catch {
    throw new FormSubmitError('network', MSG_NETWORK);
  } finally {
    clearTimeout(timer);
  }
  // fetch risolve anche su 404/500: lo stato va controllato esplicitamente
  if (!response.ok) {
    throw new FormSubmitError('server', MSG_SERVER, response.status);
  }
}

function saveLocally(
  storage: FormsConfig['storage'],
  name: FormName,
  data: FormData,
): void {
  const entry: Record<string, unknown> = { submittedAt: new Date().toISOString() };
  for (const [key, value] of data.entries()) {
    entry[key] =
      typeof value === 'string' ? value : { file: value.name, size: value.size, type: value.type };
  }
  console.info(`[forms:local] "${name}" (non inviato a nessun backend)`, entry);
  if (!storage) return;
  try {
    const key = `eos:forms:${name}`;
    const list = JSON.parse(storage.getItem(key) ?? '[]') as unknown[];
    list.push(entry);
    storage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage pieno o non disponibile: in modalità local non è un errore bloccante
  }
}

function defaultStorage(): FormsConfig['storage'] {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Invia un form al backend configurato.
 * @throws FormSubmitError con messaggio pronto per l'utente.
 */
export async function submitForm(
  name: FormName,
  data: FormData,
  config: FormsConfig = configFromEnv(),
): Promise<SubmitResult> {
  const { provider } = config;
  const fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = config.timeoutMs ?? 20_000;

  // Honeypot compilato → bot. Rispondiamo "ok" senza inviare nulla.
  const honeypot = data.get(HONEYPOT_FIELD);
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return { provider, spam: true };
  }
  data.delete(HONEYPOT_FIELD);

  switch (provider) {
    case 'local': {
      await new Promise((r) => setTimeout(r, 300));
      if (config.simulateError) {
        throw new FormSubmitError('simulated', MSG_NETWORK);
      }
      saveLocally(config.storage === undefined ? defaultStorage() : config.storage, name, data);
      return { provider, spam: false };
    }

    case 'netlify': {
      data.set('form-name', name);
      const init: RequestInit = hasFile(data)
        ? { method: 'POST', body: data } // il browser imposta il boundary multipart
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: toUrlEncoded(data),
          };
      await send(fetchImpl, '/', init, timeoutMs);
      return { provider, spam: false };
    }

    case 'endpoint': {
      if (!config.endpoint) {
        throw new FormSubmitError('config', MSG_CONFIG);
      }
      data.set('_form', name);
      await send(
        fetchImpl,
        config.endpoint,
        { method: 'POST', body: data, headers: { Accept: 'application/json' } },
        timeoutMs,
      );
      return { provider, spam: false };
    }
  }
}
