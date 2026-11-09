# PROGRESS — Sito EOS Impianti

> Diario sintetico del refactoring. Aggiornato a fine di ogni fase. Leggilo all'inizio di ogni sessione (vedi `CLAUDE.md`).

## Stato fasi

| Fase | Branch | Stato |
|---|---|---|
| 0 Analisi e piano | — | ✅ |
| 1 Scaffold | `claude/eos-impianti-refactor-n2nhdt` | ✅ pushato |
| 2 Motore EOSolar | `claude/eos-fase-2-motore` | ✅ pushato |
| 3 UI calcolatore | `claude/eos-fase-3-ui-calcolatore` | ✅ pushato |
| 4 Pagina e animazioni | `claude/eos-fase-4-pagina` | ✅ pushato |
| 5 Privacy, SEO, rifinitura | `claude/eos-fase-5-privacy-seo` | ✅ pushato |
| 6 Verifica e consegna | `claude/eos-fase-6-consegna` | ✅ in attesa di ok |
| 7 Calcolatore: PMI, costi, password | `claude/eos-fase-7-calcolatore` | ✅ pushato, non deployato |

## Decisioni prese (Fase 0, approvate)
1. Immagini e icone in `src/assets/` (per `astro:assets` e SVG inline); in `public/` solo URL fissi. `CLAUDE.md` aggiornato.
2. Lead gate: **non** si sblocca in caso di errore; messaggio + "Riprova" + telefono/email EOS. Con provider `local` lo sblocco è immediato.
3. Modale "ingrandisci logo" rimossa: il logo è un link alla home.
4. Lampadina: colori originali dell'SVG + glow giallo (niente `fill !important`).
5. Video slide 5: da caricare in `public/video/` (Pexels 4034091; il proxy dell'ambiente cloud blocca pexels.com). Fino ad allora: poster + overlay.

## Indice di `docs/handoff.md` (righe)
- 76–180 CSS calcolatore · 182–362 markup calcolatore · 364–669 JS motore/UI calcolatore
- 742–1147 CSS pagina (hero 848–923, cavo/icone 925–1022, sezioni 1024–1146)
- 1151–1587 markup pagina (hero 1167–1235, cavo 1237–1271, servizi 1273–1341, perché EOS 1343–1374, fotowall+lightbox 1376–1414, careers 1421–1464, contatti 1466–1530, modali 1532–1558, cookie 1560–1569, footer 1571–1587)
- 1589–1812 JS pagina (GSAP 1614–1709, cookie 1711–1725, modali 1727–1746, lead 1748–1785, lightbox 1787–1811)

## Bug: stato
| # | Descrizione | Stato |
|---|---|---|
| 1 | hero irraggiungibile su mobile | ✅ F4 (impilata di default; orizzontale solo ≥768px + motion, via `gsap.matchMedia`) |
| 2 | larghezze 100vw | ✅ F4 (slide `flex: 0 0 100%` del contenitore, x = −(scrollWidth − clientWidth)) |
| 3 | cavo disallineato dallo spacer del pin | ✅ F4 (`[data-wire-scope]` relativo; ricalcolo su `refresh` e `ResizeObserver`) |
| 4 | stroke deformato | ✅ F4 (viewBox = px reali + `vector-effect`); scarto icona/vertice < 0,2px a 1100/1280/1440 |
| 5 | icone via fetch | ✅ F4 (SVG ripuliti e importati inline al build) |
| 6 | stato icone dal proprio trigger | ✅ F4 (lunghezza cumulata ai vertici vs tratto disegnato) |
| 7 | stili non applicati a innerHTML | ✅ F3 (`eosolar.css` globale con prefisso `.eosolar-`, risultati clonati da `<template>` + `textContent`) |
| 9 | `switchEosTab` con `event` globale | ✅ F3 (`data-tab`, tablist/tab/tabpanel, frecce/Home/End, `activateTab(id)`) |
| 16 | disclaimer | ✅ F3 (teaser + risultati; rimossi "irraggiamento satellitare" e "stima precisa") |
| 17 | lead gate | ✅ F3 (`submitForm`, errore + Riprova + contatti, nessuno sblocco su errore) |
| 8 | token CSS duplicati | ✅ F1 (`tokens.css` unico, sistema `.btn` unico) |
| 10 | criterio ottimo → max NPV entro vincoli, `CRITERIO_OTTIMO`, top 3 | ✅ F2 |
| 11 | degrado batteria, sostituzioni inverter/batteria, O&M inflazionato | ✅ F2 |
| 12 | range unico `RANGE` (kWp 1–20 / 0,5; kWh 0–15 / 2,5) | ✅ F2 (slider in F3) |
| 13 | sensibilità su tariffa + inflazione + produttività ±10% | ✅ F2 |
| 14 | MIRR (reinvestimento = tasso di sconto) | ✅ F2 |
| 15 | ritiro dedicato, IVA, detrazione parametrizzati e disattivati | ✅ F2 |
| 18 | privacy, honeypot, CV nei 3 form | ✅ F3–F4 |
| 19 | cookie banner, Maps dopo consenso, video locale, font | ✅ F5 banner Accetta/Rifiuta/Personalizza + `src/lib/consent.ts`; Maps solo con consenso (anche revocabile); font F1; video aggiunto dopo la F6 |
| 20 | pagine legali | ✅ F5 `/privacy/`, `/cookie/` con TODO(EOS) visibili; link con slash finale |
| 21 | URL assoluti, og-image, sitemap, robots, canonical, favicon | ✅ F1+F5 (`og-image.jpg` 1200×630 generata; `robots.txt` da route; niente canonical sulla 404) |
| 22 | bilancio energetico non chiuso | ✅ F2 |
| 23 | SCR etichettato "diretto" | ✅ F2–F3 ("Autoconsumo" = (diretto+carica)/produzione) |
| 24 | payback "25" se non si rientra | ✅ F2 (`null` → "oltre 25 anni") |
| 25 | vincoli ignorati in silenzio | ✅ F2 (`vincoliRispettati`) |
| 26 | curva NPV solo senza batteria | ✅ F2 (`npvCurve(tutti, kWh)`) |
| 27 | O&M su inflazione energetica | ✅ F2 (`inflazioneGenerale`) |
| 28 | validazione input | ✅ F2 (`validate`) |
| 29 | profilo F1 default 64% | TODO(EOS) |
| 30 | header sopra la hero pinnata | ✅ F1 (header fixed); pin in F4 |
| 31 | descrizioni servizi solo hover | ✅ F4 (sempre visibili su touch; hover/focus-within su desktop; link per tastiera) |
| 32–34 | titoli h2, label, lightbox | ✅ F4 (`<dialog>`, frecce, swipe, Esc, contatore) |
| 35–36 | contrasto footer, smooth scroll | ✅ F1 |
| 37 | claim aziendali | TODO(EOS) nel codice |
| 38 | (nuovo) form: errore che sparisce al blur sposta il layout e fa perdere il click | ✅ F4 (rivalidazione su `input`) |
| 39 | (nuovo) icone SVG con classi `.cls-*` e id duplicati in conflitto | ✅ F4 (fill inline, id rimossi) |

## Motore EOSolar (Fase 2) — riferimento
`src/lib/eosolar/`: `types.ts`, `defaults.ts`, `costs.ts`, `finance.ts`, `model.ts`, `optimizer.ts`, `index.ts` (`defaultConfig()`), test in `eosolar.test.ts`.

Convenzioni: CAPEX all'anno 0; tariffa, ritiro, O&M e sostituzioni a prezzi dell'anno 1, indicizzati `(1+i)^(n−1)` nell'anno n. Payback = ultimo attraversamento dello zero (prudente). Batteria: un ciclo/giorno su medie mensili, carica limitata a ciò che può essere restituito di notte.

Caso di riferimento (3.800 kWh/anno, default handoff):

| | Ottimo | CAPEX | NPV | Payback att. |
|---|---|---|---|---|
| Prototipo (NPV/CAPEX, RID 0,10 sempre) | 1,5 kWp + 0 | 2.925 | 3.741 | 7,9 |
| Nuovo, default (RID **off**) | 1,5 kWp + 0 | 2.925 | 3.607 | 8,0 (MIRR 9,5%) |
| Nuovo, RID 0,10 on | 3,5 kWp + 0 | 6.213 | 4.977 | 10,4 (MIRR 8,5%) |

Con RID off l'immissione vale 0 € e l'ottimo NPV resta piccolo: dipende dal default prudente, non più dal criterio. Decisione per EOS: valore di default del ritiro dedicato.

## UI calcolatore (Fase 3) — riferimento
`src/components/eosolar/`: `EOSolar.astro` (entry), `Teaser`, `LeadGate` (usa `Modal.astro` = `<dialog>` nativo), `Dashboard` (3 tab + `<template>`), `fields.ts` (campi parametri, build + lettura), `ui.ts` (controller), `charts.ts` (Chart.js, import dinamico, colori dai token, destroy/ricrea per canvas), `eosolar.css`.
- Qualsiasi elemento `[data-eosolar-open]` nella pagina apre il gate o, se già sbloccato (`localStorage eos:eosolar:unlocked`), porta alla dashboard. In Fase 4 usarlo nei bottoni della hero.
- Formattazione: `src/lib/eosolar/format.ts` (it-IT con `useGrouping: 'always'`).
- `PUBLIC_FORMS_SIMULATE_ERROR=true` per provare l'errore del gate.
- Astro 7: un solo dev server alla volta (gira in background): fermarlo con `npx astro dev stop`.
- Verificato con Playwright a 360/1280: flusso gate → risultati identici ai test (NPV 3.607 €, payback 8,0, MIRR 9,5%), nessuno scroll orizzontale, nessun errore console, nessuna richiesta esterna.

## Pagina e animazioni (Fase 4) — riferimento
- `src/scripts/animations.ts`: init dopo `document.fonts.ready`; ordine hero → cavo → reveal. Reduced-motion: nessun pin/scrub, cavo statico tutto acceso.
- `src/lib/wire.ts` (+ test): tracciato a serpentina che passa per i centri delle icone.
- `WireTrack.astro`: icone agganciate alle sezioni (`data-anchor` + `data-at`), visibili da 1100px.
- Form contatti/candidatura: `src/lib/forms/form-ui.ts` + `validate.ts` (CV PDF/DOC/DOCX ≤ 5 MB, testato). Privacy + honeypot già presenti.
- Mappa: click-to-load (nessuna richiesta a Google prima del click). In F5 collegarla al banner cookie.
- Video slide 5: compare da solo se esiste `public/video/hero-fotovoltaico.mp4` (altrimenti poster).
- `<Picture>` con `fallbackFormat="jpg"`: senza, le sorgenti AVIF generavano fallback PNG da 2 MB.

## Privacy, SEO (Fase 5) — riferimento
- Consenso: `localStorage eos:consent` `{v, date, maps}`; evento `eos:consent-change`. Nuove terze parti → nuova categoria + `CONSENT_VERSION++`.
- `[data-cookie-preferences]` riapre il banner (footer, pagina cookie).
- Test consenso in `preview` (in `dev` la toolbar di Astro copre i bottoni del banner): 0 richieste esterne prima della scelta, anche scorrendo; rifiuto persistente; revoca toglie l'iframe.
- Preload solo del font del titolo (Montserrat 900): la prima slide non ha immagini, l'LCP è il testo.
- Pagine: `/`, `/privacy/`, `/cookie/`, `/404` (noindex), `robots.txt`, sitemap (3 URL).

## Verifica e consegna (Fase 6)
- Lighthouse 13 in `preview`, mobile e desktop: 100/100/100/100 su `/`, `/privacy/`, `/cookie/` (404: SEO 66 voluto, noindex).
  - Prima delle correzioni la home mobile era Perf 90 (LCP 3,4 s) e A11y 97: preload anche di Montserrat 800 (LCP mobile = h2 slide 2), CSS inline (`inlineStylesheets: 'always'`), `--c-red-text` per l'eyebrow rossa (contrasto).
- Playwright a 360/768/1100/1440 × motion/reduced: nessun overflow (7 punti di scroll, dashboard sbloccata, 3 tab, menu mobile), console pulita, 0 richieste a terze parti.
- Clone pulito senza `.env`: `npm ci` + `npm run dev` → 200; build ok.
- `netlify.toml` (build, Node 22, provider netlify, header di sicurezza, cache `/_astro`), `README.md` completo con elenco TODO(EOS).
- Per eseguire Lighthouse senza aggiungere dipendenze: installarlo in una cartella temporanea e usare `CHROME_PATH` del Chromium di Playwright.

## Aggiornamenti dopo la Fase 6
- Video slide 5 aggiunto: `public/video/hero-fotovoltaico.mp4` (Pexels 4034091, 1280×720, 10 s, 3,1 MB, senza audio, faststart). Parte quando la slide è visibile.
- Fotowall: 8 foto (`lavoro6–8.jpg`: cantiere con sollevatore in un cimitero, ingresso del cimitero, capannone industriale). Desktop 4×4 a due blocchi, tablet 2 colonne con `grid-auto-flow: dense`.
- Commit con `[skip netlify]` su richiesta: nessun deploy finché EOS non dà l'ok.

- Branch `claude/eos-rilascio` = Fase 6 + video/foto + Fase 7 (calcolatore, da altra sessione). Netlify pubblica da `claude/eos-fase-6-consegna` (production branch scelto dall'utente).
- Privacy compilata con i dati EOS: no DPO, Netlify + Aruba, conservazione 12 mesi (contatti, lead, CV), data 9/11/2026. PEC e legale rappresentante omessi su richiesta (non obbligatori). Nessun segnaposto visibile; restano TODO solo come commenti nel sorgente (verifica DPA Netlify, cookie Netlify, rilettura consulente, consenso marketing separato).

- 09/11/2026: rilascio su Netlify. `claude/eos-fase-6-consegna` portato a `claude/eos-rilascio` (opzione B scelta dall'utente: Netlify resta sul production branch attuale). Password parametri avanzati ancora `admin` (cambiabile con `PUBLIC_EOSOLAR_ADMIN_PASSWORD` su Netlify).

- "Perché EOS": aggiunta voce Sicurezza (0 infortuni negli ultimi 3 anni, fonte INAIL, dato fornito da EOS); layout flex centrato a 5 voci.

## TODO(EOS) raccolti
- Privacy: legale rappresentante, PEC, DPO, fornitori (hosting, form, email), trasferimenti extra UE, tempi di conservazione, base giuridica del lead, validazione del testo da un consulente.
- Descrizioni reali delle foto dei lavori (alt e didascalie lightbox).
- Testo finalità del lead gate coerente con l'informativa privacy.
- Dominio definitivo (`PUBLIC_SITE_URL`), coordinate GPS, "oltre 20 anni", "enti pubblici".
- Listini CAPEX FV/batteria (IVA esclusa?), tariffa, inflazione generale, ore equivalenti locali, profilo F1.
- Normativa: ritiro dedicato (prezzo), IVA agevolata, detrazione (aliquota, anni).
- Dati titolare per privacy/cookie, descrizioni/alt foto lavori, logo vettoriale, foto per og-image, video slide 5.

## Problemi aperti
- `npm audit`: 10 moderate in `minimatch` (solo devDependencies del tooling). Non risolvibile senza `--force`.
- `/privacy`, `/cookie`, `og-image.jpg` mancanti fino alla Fase 5.

## Calcolatore (Fase 7) — riferimento
Basata sull'audit `docs/AUDIT_SIMULATORE.md` (branch `audit-simulatore`, v2).
- Dopo l'email si apre il tab ① "Dati e consumi" (nessun calcolo automatico con i default).
- Niente tetto a 20 kWp: griglia kWp a passo variabile 1–1.000 kWp (`GRIGLIA_KWP`, `kwpGrid`); batteria 0–15 kWh a passi di 2,5 (decisione EOS).
- Nuovo input facoltativo "Potenza massima installabile" (`config.sito.kwpMax`); la griglia termina esattamente su quel valore.
- L'ottimizzatore non simula potenze oltre il vincolo di produzione (`kwpLimit`); avviso se l'ottimo coincide con la potenza installabile o con il limite del simulatore (`ottimoAlLimite`).
- Criterio invariato (massimo NPV entro i vincoli) + riga "massimo rendimento percentuale" (MIRR massimo tra i candidati con NPV > 0, `migliorRendimento`).
- Curva costi FV con nodi 50 e 100 kWp (1.200 e 1.100 €/kWp, approvati da EOS). Costi batteria fino a 15 kWh, modificabili.
- Costi di riferimento, parametri tecnici, ritiro/IVA/detrazione: modificabili solo dopo password (`src/lib/eosolar/admin.ts`, default "admin", sovrascrivibile con `PUBLIC_EOSOLAR_ADMIN_PASSWORD`). Controllo solo lato browser: non è una protezione di sicurezza. Sblocco valido per la sessione (`sessionStorage eos:eosolar:admin`).
- Validazione estesa a tutti i parametri, ai costi e alla potenza installabile.
- Grafico NPV con asse x lineare (griglia a passo variabile).
- Verificato con Playwright a 360/1280: flusso email → tab ①, password errata/corretta, caso 100.000 kWh con limite 60 kWp, slider; nessun errore console, nessuno scroll orizzontale.
- Deciso: ritiro dedicato spento di default (si attiva dai parametri avanzati).
- Deciso: listini **IVA esclusa**, IVA spenta di default; gli importi nei risultati riportano sempre "IVA esclusa" (o "IVA x% inclusa" se attivata).
- Costo fisso per impianto (`costi.fissoImpianto`, default provvisorio 1.000 € IVA esclusa, TODO(EOS)), modificabile nei parametri avanzati. Si somma solo se kWp > 0; escluso dalla base della sostituzione inverter. Non cambia l'ottimo per NPV, evita che il "massimo rendimento" proponga 1 kWp.
- Icone "i" (`Info.astro`, testi in `help.ts`): attributo nativo `popover`, nessun JS; Esc, clic fuori e "Chiudi".
- Link a PVGIS sopra le ore equivalenti (solo link esterno, nessuna risorsa caricata). URL `pvg_tools/en/` non verificabile dal cloud (dominio bloccato dal proxy): controllarlo.
- Risultati a livelli (`ResultView.astro` + `results.ts`, usati da entrambi i tab): 1) configurazione + investimento, risparmio primo anno, rientro, guadagno netto + CTA sopralluogo; 2) indicatori energetici e 2 grafici; 3) approfondimenti richiudibili: confronto configurazioni (top 3, massimo rendimento, alternativa con/senza accumulo), sensibilità, curva NPV (disegnata all'apertura), bilancio mensile, flussi annuali, ipotesi del calcolo.
- Decisioni aperte (vedi audit §9): PVGIS automatico, modello orario.
