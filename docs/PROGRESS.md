# PROGRESS — Sito EOS Impianti

> Diario sintetico del refactoring. Aggiornato a fine di ogni fase. Leggilo all'inizio di ogni sessione (vedi `CLAUDE.md`).

## Stato fasi

| Fase | Branch | Stato |
|---|---|---|
| 0 Analisi e piano | — | ✅ |
| 1 Scaffold | `claude/eos-impianti-refactor-n2nhdt` | ✅ pushato |
| 2 Motore EOSolar | `claude/eos-fase-2-motore` | ✅ pushato |
| 3 UI calcolatore | `claude/eos-fase-3-ui-calcolatore` | ✅ in attesa di ok |
| 4 Pagina e animazioni | `claude/eos-fase-4-pagina` | ⏳ |
| 5 Privacy, SEO, rifinitura | `claude/eos-fase-5-privacy-seo` | ⏳ |
| 6 Verifica e consegna | `claude/eos-fase-6-consegna` | ⏳ |

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
| 1–6 | hero mobile, 100vw, cavo, stroke, icone fetch, stato icone | Fase 4 |
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
| 18–21 | form privacy/honeypot/CV, cookie, pagine legali, SEO | Fase 5 (adapter + honeypot già in F1) |
| 22 | bilancio energetico non chiuso | ✅ F2 |
| 23 | SCR etichettato "diretto" | ✅ F2–F3 ("Autoconsumo" = (diretto+carica)/produzione) |
| 24 | payback "25" se non si rientra | ✅ F2 (`null` → "oltre 25 anni") |
| 25 | vincoli ignorati in silenzio | ✅ F2 (`vincoliRispettati`) |
| 26 | curva NPV solo senza batteria | ✅ F2 (`npvCurve(tutti, kWh)`) |
| 27 | O&M su inflazione energetica | ✅ F2 (`inflazioneGenerale`) |
| 28 | validazione input | ✅ F2 (`validate`) |
| 29 | profilo F1 default 64% | TODO(EOS) |
| 30 | header sopra la hero pinnata | ✅ F1 (header fixed); pin in F4 |
| 31–37 | card hover, h2, label, lightbox, footer contrasto, smooth scroll, claim | 35–36 ✅ F1; resto F4–F5 |

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

## TODO(EOS) raccolti
- Testo finalità del lead gate coerente con l'informativa privacy.
- Dominio definitivo (`PUBLIC_SITE_URL`), coordinate GPS, "oltre 20 anni", "enti pubblici".
- Listini CAPEX FV/batteria (IVA esclusa?), tariffa, inflazione generale, ore equivalenti locali, profilo F1.
- Normativa: ritiro dedicato (prezzo), IVA agevolata, detrazione (aliquota, anni).
- Dati titolare per privacy/cookie, descrizioni/alt foto lavori, logo vettoriale, foto per og-image, video slide 5.

## Problemi aperti
- `npm audit`: 10 moderate in `minimatch` (solo devDependencies del tooling). Non risolvibile senza `--force`.
- `/privacy`, `/cookie`, `og-image.jpg` mancanti fino alla Fase 5.
