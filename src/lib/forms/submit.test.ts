import { describe, expect, it, vi } from 'vitest';
import { FormSubmitError, HONEYPOT_FIELD, configFromEnv, submitForm } from './submit';

function makeData(fields: Record<string, string | Blob>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  };
}

describe('configFromEnv', () => {
  it('usa local come default senza variabili', () => {
    expect(configFromEnv({} as ImportMetaEnv).provider).toBe('local');
  });

  it('riconosce netlify ed endpoint', () => {
    expect(configFromEnv({ PUBLIC_FORMS_PROVIDER: 'netlify' } as ImportMetaEnv).provider).toBe(
      'netlify',
    );
    const c = configFromEnv({
      PUBLIC_FORMS_PROVIDER: 'endpoint',
      PUBLIC_FORMS_ENDPOINT: 'https://example.test/f',
    } as ImportMetaEnv);
    expect(c).toMatchObject({ provider: 'endpoint', endpoint: 'https://example.test/f' });
  });
});

describe('submitForm — local', () => {
  it('salva in storage senza chiamare la rete', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const res = await submitForm('contatti-ufficiali', makeData({ email: 'a@b.it' }), {
      provider: 'local',
      storage,
      fetchImpl,
    });
    expect(res).toEqual({ provider: 'local', spam: false });
    expect(fetchImpl).not.toHaveBeenCalled();
    const saved = JSON.parse(storage.map.get('eos:forms:contatti-ufficiali') ?? '[]');
    expect(saved[0].email).toBe('a@b.it');
  });

  it('simula un errore se richiesto', async () => {
    await expect(
      submitForm('contatti-ufficiali', makeData({ email: 'a@b.it' }), {
        provider: 'local',
        simulateError: true,
        storage: null,
      }),
    ).rejects.toBeInstanceOf(FormSubmitError);
  });
});

describe('submitForm — netlify', () => {
  it('invia url-encoded con form-name e senza honeypot', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }));
    await submitForm(
      'lead-calcolatore-fotovoltaico',
      makeData({ email: 'a@b.it', [HONEYPOT_FIELD]: '' }),
      { provider: 'netlify', fetchImpl },
    );
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('/');
    const body = new URLSearchParams(init?.body as string);
    expect(body.get('form-name')).toBe('lead-calcolatore-fotovoltaico');
    expect(body.get('email')).toBe('a@b.it');
    expect(body.has(HONEYPOT_FIELD)).toBe(false);
  });

  it('usa multipart quando c’è un file', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }));
    const cv = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
    await submitForm('candidatura-tecnici', makeData({ nome: 'Mario', curriculum: cv }), {
      provider: 'netlify',
      fetchImpl,
    });
    const body = fetchImpl.mock.calls[0]![1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('form-name')).toBe('candidatura-tecnici');
  });

  it('una risposta 404 è un errore (fetch risolve comunque)', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }));
    await expect(
      submitForm('contatti-ufficiali', makeData({ email: 'a@b.it' }), {
        provider: 'netlify',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: 'server', status: 404 });
  });

  it('un errore di rete è un errore di tipo network', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      submitForm('contatti-ufficiali', makeData({ email: 'a@b.it' }), {
        provider: 'netlify',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('submitForm — endpoint', () => {
  it('senza URL configurato fallisce con errore di configurazione', async () => {
    await expect(
      submitForm('contatti-ufficiali', makeData({ email: 'a@b.it' }), { provider: 'endpoint' }),
    ).rejects.toMatchObject({ kind: 'config' });
  });

  it('invia multipart all’endpoint con il nome del form', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }));
    await submitForm('contatti-ufficiali', makeData({ email: 'a@b.it' }), {
      provider: 'endpoint',
      endpoint: 'https://example.test/f',
      fetchImpl,
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://example.test/f');
    expect((init?.body as FormData).get('_form')).toBe('contatti-ufficiali');
  });
});

describe('honeypot', () => {
  it('se compilato non invia nulla e risponde ok', async () => {
    const fetchImpl = vi.fn();
    const res = await submitForm(
      'contatti-ufficiali',
      makeData({ email: 'a@b.it', [HONEYPOT_FIELD]: 'spam' }),
      { provider: 'netlify', fetchImpl },
    );
    expect(res.spam).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
