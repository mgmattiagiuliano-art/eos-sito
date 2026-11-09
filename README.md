# Sito EOS Impianti s.n.c.

Sito statico di **EOS Impianti s.n.c.** (Vignole Borbera, AL): presentazione dell'azienda, servizi, lavori realizzati, calcolatore fotovoltaico **EOSolar** con lead gate, candidature e contatti.

- [Astro](https://astro.build) 7, output statico, TypeScript strict
- GSAP + ScrollTrigger e Chart.js da npm (nessun CDN), font self-hosted (`@fontsource`)
- Funziona in locale senza account esterni; i form passano da un adapter configurabile (Netlify, endpoint esterno o modalità locale)

Regole permanenti del progetto: [`CLAUDE.md`](CLAUDE.md). Diario del lavoro e decisioni: [`docs/PROGRESS.md`](docs/PROGRESS.md).

---

## Avvio locale

Requisiti: **Node.js ≥ 22.23.4** (richiesto da Astro 7) e npm.

```bash
npm install
npm run dev
```

Apri <http://localhost:4321>. Non serve nessun file `.env`: i form usano il provider `local` (non inviano nulla, scrivono in console e salvano in `localStorage`).

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo con ricarica automatica |
| `npm run build` | Build di produzione in `dist/` |
| `npm run preview` | Serve `dist/` come in produzione |
| `npm run check` | `astro check` + `tsc` |
| `npm test` | Test Vitest (motore del calcolatore, form, consenso, cavo) |
| `npm run lint` | ESLint |

Note pratiche:

- Con Astro 7 il server di sviluppo resta attivo in background: fermalo con `npx astro dev stop`.
- Per rivedere il lead gate dopo averlo sbloccato: nella console del browser `localStorage.removeItem('eos:eosolar:unlocked')`.
- Per rivedere il banner cookie: `localStorage.removeItem('eos:consent')`.
- In `npm run dev` la barra strumenti di Astro (in basso) può coprire il banner cookie: per provarlo usa `npm run build && npm run preview`.

## Variabili d'ambiente

Copia [`.env.example`](.env.example) in `.env` solo se ti serve cambiare i default. Sono tutte `PUBLIC_*`: vengono inserite nel codice al momento del build.

| Variabile | Default | Descrizione |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://www.eosimpianti.it` | URL pubblico, senza slash finale. Usato per canonical, sitemap, `robots.txt`, `og:image` e JSON-LD (URL assoluti). |
| `PUBLIC_FORMS_PROVIDER` | `local` | `local` · `netlify` · `endpoint` (vedi sotto). |
| `PUBLIC_FORMS_ENDPOINT` | — | Solo con `endpoint`: URL che riceve i POST dei form. |
| `PUBLIC_FORMS_SIMULATE_ERROR` | `false` | Solo sviluppo: con `true` il provider `local` fallisce sempre, per provare i messaggi d'errore. |

Il build avvisa in console se `PUBLIC_FORMS_PROVIDER` è `local`: **in produzione i form non arriverebbero a nessuno**.

### Form

Tutti i form passano da `submitForm()` in `src/lib/forms/submit.ts`. Gli errori (rete, risposta non 2xx, configurazione mancante) sono mostrati all'utente con "Riprova" e i contatti diretti. I bot che compilano l'honeypot `bot-field` ricevono un finto OK senza invio.

| Form | Campi | Note |
|---|---|---|
| `lead-calcolatore-fotovoltaico` | email, privacy | Sblocca il calcolatore solo se l'invio riesce |
| `contatti-ufficiali` | nome, email, telefono (facolt.), messaggio, privacy | |
| `candidatura-tecnici` | nome, email, telefono, curriculum, lettera, privacy | CV PDF/DOC/DOCX, max 5 MB (multipart) |

## Deploy su Netlify

La configurazione è in [`netlify.toml`](netlify.toml): build `npm run build`, cartella `dist`, Node 22, `PUBLIC_FORMS_PROVIDER=netlify`, header di sicurezza e cache.

1. **Collega il repository**: Netlify → *Add new site* → *Import an existing project* → GitHub → questo repository e il branch da pubblicare. Le impostazioni di build vengono lette da `netlify.toml`.
2. **Dominio in `netlify.toml`**: verifica `PUBLIC_SITE_URL` (o sovrascrivila in *Site configuration → Environment variables*).
3. **Netlify Forms**: in *Forms* attiva **Enable form detection**, poi rifai il deploy. Netlify rileva i tre `<form data-netlify="true">` nell'HTML statico (con `netlify-honeypot` e l'input nascosto `form-name`). Le candidature con CV arrivano come allegati (limite Netlify: 8 MB per invio).
4. **Notifiche**: *Forms → Form notifications* → *Add notification → Email notification* verso `info@eosimpianti.it` (una per ciascun form, o "Any form").
5. **Dominio personalizzato**: *Domain management → Add a domain* → `eosimpianti.it` / `www.eosimpianti.it`. Poi:
   - con DNS Netlify: delega i nameserver indicati da Netlify presso il registrar;
   - con DNS esterno: record `CNAME www → <nome-sito>.netlify.app` e, per il dominio nudo, il record `A`/`ALIAS` indicato da Netlify.

   Netlify emette il certificato HTTPS (Let's Encrypt) in automatico. Imposta il dominio principale (con o senza `www`) uguale a `PUBLIC_SITE_URL`.
6. **Verifica dopo il deploy**: invia un messaggio di prova da ciascun form e controllalo in *Forms*.

## Deploy su altro hosting statico

Il contenuto di `dist/` è HTML/CSS/JS statico e funziona su qualsiasi hosting (Apache, Nginx, Cloudflare Pages, GitHub Pages, Vercel, hosting condiviso).

1. Scegli un servizio che riceve i form via HTTP, per esempio [Formspree](https://formspree.io), [Getform](https://getform.io) o un backend proprio. Deve accettare **POST `multipart/form-data`** (serve per il CV: con Formspree e Getform il caricamento di file può richiedere un piano a pagamento) e rispondere con stato 2xx. I campi arrivano con i nomi del form più `_form` (nome del form).
2. Compila con le variabili giuste:

   ```bash
   PUBLIC_SITE_URL=https://www.eosimpianti.it \
   PUBLIC_FORMS_PROVIDER=endpoint \
   PUBLIC_FORMS_ENDPOINT=https://formspree.io/f/xxxxxxx \
   npm run build
   ```

3. Carica il contenuto di `dist/` nella radice del sito.
4. Configura l'hosting perché:
   - risponda con `404.html` alle pagine inesistenti (Apache: `ErrorDocument 404 /404.html`; Nginx: `error_page 404 /404.html;`);
   - serva `/privacy/` e `/cookie/` dalle rispettive cartelle `index.html` (comportamento predefinito quasi ovunque);
   - imposti cache lunga su `/_astro/*` (file con hash nel nome).

## Contenuti e asset

| Cosa | Dove |
|---|---|
| Dati aziendali (indirizzo, telefono, P.IVA, menu) | `src/data/site.ts` |
| Servizi (testi e immagini) | `src/data/services.ts` + `src/assets/servizi/` |
| Foto dei lavori | `src/data/gallery.ts` + `src/assets/lavori/` |
| Icone del cavo | `src/assets/icons/` (SVG senza `<style>` né `id`: vengono inserite nella pagina) |
| Parametri e listini del calcolatore | `src/lib/eosolar/defaults.ts` |
| Testi legali | `src/pages/privacy.astro`, `src/pages/cookie.astro` |
| Logo, favicon, og-image | `public/` |

Le immagini in `src/assets/` vengono convertite al build in AVIF/WebP con le dimensioni giuste: carica gli originali, non serve ottimizzarli a mano.

**Video della slide 5**: salva il video in `public/video/hero-fotovoltaico.mp4` (H.264, senza audio, 1280×720, idealmente < 5 MB) e rifai il build: la slide lo mostra in automatico. Senza file la slide usa un'immagine statica. Per comprimerlo:

```bash
ffmpeg -i originale.mp4 -vf scale=1280:-2 -an -c:v libx264 -crf 28 -preset slow -movflags +faststart public/video/hero-fotovoltaico.mp4
```

## Privacy e cookie

- Prima di una scelta esplicita nel banner non parte **nessuna** richiesta verso terze parti; scorrere la pagina non è consenso.
- L'unica terza parte è **Google Maps** (sezione contatti), caricata solo con consenso alla categoria "mappe" (dal banner o con "Mostra la mappa"), revocabile da "Preferenze cookie" nel footer.
- Se in futuro si aggiungono analytics, pixel o altri embed: aggiungere la categoria in `src/lib/consent.ts` e nel banner, incrementare `CONSENT_VERSION` (il banner viene riproposto) e aggiornare la cookie policy.

## Calcolatore EOSolar

Il motore (`src/lib/eosolar/`) è TypeScript puro, senza DOM, ed è coperto da test: la UI chiama le stesse funzioni dei test. In breve:

- bilancio energetico mensile (F1 approssimata ai consumi diurni, batteria con un ciclo al giorno);
- flussi di cassa su 25 anni con degrado, O&M, sostituzione di inverter e batteria, inflazione;
- ottimo = **massimo NPV** tra le configurazioni che rispettano i vincoli (produzione ≤ 140% del consumo, autoconsumo ≥ 40%), con le prime 3 alternative;
- ritiro dedicato, IVA e detrazione sono parametri **disattivati** finché EOS non conferma i valori.

## Verifiche eseguite (Fase 6)

- Larghezze 360, 768, 1100 e 1440 px, con e senza `prefers-reduced-motion`: nessuno scroll orizzontale (anche con calcolatore sbloccato, tutti i tab aperti e menu mobile), nessun errore o avviso in console, nessuna richiesta a terze parti.
- Lighthouse 13 su `npm run preview` (mobile e desktop): **100/100/100/100** su `/`, `/privacy/`, `/cookie/`. La 404 ha SEO 66 per scelta (`noindex` e stato 404).
- Allineamento centro icona / vertice del cavo: scarto < 0,2 px a 1100, 1280 e 1440 px.

Da ricontrollare a mano dopo ogni modifica importante: hero (scorrimento orizzontale da 768 px, impilata sotto), cavo e icone da 1100 px, lead gate (anche con `PUBLIC_FORMS_SIMULATE_ERROR=true`), lightbox (frecce, Esc, swipe su telefono), banner cookie e mappa.

## TODO per EOS

Dati da fornire o confermare. Ogni voce è marcata `TODO(EOS)` nel codice, e i testi legali li mostrano in giallo nella pagina finché non vengono compilati.

**Azienda e contenuti**
- [ ] Dominio definitivo (`PUBLIC_SITE_URL` in `netlify.toml` / `.env`; default in `astro.config.mjs`)
- [ ] Coordinate GPS esatte della sede (`src/data/site.ts`, JSON-LD)
- [ ] Conferma di "oltre 20 anni" / "20+ anni di esperienza" ed "enti pubblici" (`src/components/HeroSlider.astro`, `src/components/WhyEos.astro`, `src/data/site.ts`)
- [ ] Descrizioni reali delle foto dei lavori: tipo di impianto e località, per testi alternativi e didascalie (`src/data/gallery.ts`; le foto 6–8 hanno una descrizione di ciò che si vede, da completare)
- [x] Video per la slide 5 (`public/video/hero-fotovoltaico.mp4`, Pexels 4034091 HD, aggiunto)
- [ ] Logo vettoriale (SVG) e, se disponibile, una foto per l'immagine social (`public/og-image.jpg` è già pronta, ma è generata)

**Calcolatore** (`src/lib/eosolar/defaults.ts`)
- [ ] Listini CAPEX fotovoltaico e batteria (e se sono IVA esclusa)
- [ ] Prezzo dell'energia di default, inflazione energetica e generale
- [ ] Ore equivalenti mensili tipiche della zona (es. da PVGIS o da impianti EOS)
- [ ] Profilo F1 di default (oggi 64% dei consumi: alto per un'utenza domestica)
- [ ] Ritiro dedicato: prezzo e se attivarlo di default (cambia molto il dimensionamento consigliato: vedi `docs/PROGRESS.md`)
- [ ] IVA e detrazione fiscale applicabili (aliquote e anni): normativa vigente

**Privacy e cookie** (`src/pages/privacy.astro`, `src/pages/cookie.astro`)
- [x] DPO non nominato, fornitori (Netlify per hosting e moduli, Aruba per l'email), conservazione 12 mesi per contatti, lead e CV (PEC e legale rappresentante omessi: non obbligatori)
- [ ] Verificare nel DPA di Netlify la garanzia per il trasferimento negli USA e che Netlify non imposti cookie propri
- [ ] Rilettura dei testi da parte di un consulente privacy
