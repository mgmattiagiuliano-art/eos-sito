# CLAUDE.md — Sito EOS Impianti s.n.c.

> Contesto permanente del progetto. Claude Code lo rilegge a ogni sessione: qui stanno le regole che valgono sempre. I compiti della singola sessione arrivano nel prompt.

## Il cliente
- **EOS Impianti s.n.c.**, Loc. Fornace 2, 15060 Vignole Borbera (AL). Tel +39 0143 677895, info@eosimpianti.it, P.IVA 02164950061.
- Impianti elettrici civili e industriali, fotovoltaico + accumulo, micro-idroelettrico, minieolico, domotica, sicurezza/antifurto, climatizzazione, reti dati.
- Radicata tra Alessandria e Genova, opera su tutto il territorio nazionale.
- Pubblico: privati (villette, condomini) e aziende/PMI del basso Piemonte e del Genovesato. Il sito deve generare **richieste di sopralluogo** e **lead dal calcolatore fotovoltaico**.

## Brand (token di design — unica fonte di verità in `src/styles/tokens.css`)
| Token | Valore | Uso |
|---|---|---|
| `--c-red` | `#E52320` | CTA primarie, accenti |
| `--c-blue` | `#0044BD` | Link, CTA secondarie, highlight |
| `--c-green` | `#33A652` | Efficienza, rinnovabili (variante grafici `#10B981`) |
| `--c-ink` | `#0F172A` | Titoli |
| `--c-ink-2` | `#1E293B` | Superfici scure |
| `--c-text` | `#475569` | Testo corrente |
| `--c-bg` | `#F8FAFC` | Sfondo |
| `--c-border` | `#E2E8F0` | Bordi |

Font: Montserrat (titoli), Poppins (testo), JetBrains Mono (numeri del calcolatore). **Self-hosted** via `@fontsource/*`, niente Google Fonts da CDN (GDPR).

## Stack
- **Astro** (ultima stabile), output statico (`output: 'static'`), TypeScript strict.
- **GSAP + ScrollTrigger** e **Chart.js** installati da **npm** e importati nei `<script>` di Astro (bundlati). Niente CDN: il sito deve funzionare offline in locale e su qualsiasi host.
- Nessun framework UI (React/Vue) salvo necessità reale: vanilla TS nei componenti `.astro`.
- Node LTS. Gestore pacchetti: npm.

## Principi non negoziabili
1. **Portabilità.** Il sito gira con `npm run dev` / `npm run build && npm run preview` senza account esterni. Tutto ciò che dipende da un host (form, funzioni) passa da un adapter configurabile via variabili d'ambiente (vedi sotto). Nessun asset esterno hotlinkato: video, immagini e font stanno in `public/` o nel bundle.
2. **Il calcolatore è logica pura e testata.** Il motore di calcolo vive in `src/lib/eosolar/` come TypeScript senza DOM, coperto da test Vitest. La UI legge e mostra soltanto.
3. **Stili.** Token globali in `tokens.css`. Gli elementi creati a runtime (innerHTML, Chart.js) non ricevono gli attributi di scoping di Astro: per loro usa `<style is:global>` con prefisso di classe del componente (es. `.eosolar-…`) oppure crea gli elementi da template nel markup.
4. **Accessibilità e movimento.** Contrasto AA, focus visibile, modali con focus trap + Esc + `aria-modal`, `prefers-reduced-motion` disattiva pin/scrub e animazioni.
5. **Mobile first.** Ogni sezione deve funzionare a 360px senza scroll orizzontale.
6. **GDPR / Garante Privacy italiano.** Nessun cookie/terza parte non tecnica prima del consenso esplicito; "proseguire la navigazione" NON è consenso. Ogni form che raccoglie dati ha l'informativa e la checkbox privacy.
7. **Testi in italiano**, tono professionale e diretto. Non inventare dati aziendali (certificazioni, numero di impianti, recensioni): se manca un dato, lascia un `TODO(EOS):` visibile nel codice e segnalalo.

## Architettura cartelle (obiettivo)
```
src/
  components/   Header, Footer, HeroSlider, WireTrack, Services, WhyEos,
                Gallery, Lightbox, Careers, Contact, CookieBanner, Modal
  components/eosolar/  Teaser, LeadGate, Dashboard, tab, grafici
  lib/eosolar/  model.ts (motore), costs.ts, finance.ts, optimizer.ts,
                defaults.ts, types.ts, *.test.ts
  lib/forms/    submit.ts (adapter)
  data/         services.ts, gallery.ts, site.ts (dati aziendali, unica fonte)
  layouts/      Base.astro (meta, OG, JSON-LD)
  pages/        index.astro, privacy.astro, cookie.astro, 404.astro
  styles/       tokens.css, global.css
  assets/       servizi/, lavori/ (ottimizzate da astro:assets), icons/ (SVG importati inline al build)
public/         logo.png, favicon.png, apple-touch-icon.png, video/, og-image.jpg, robots.txt
```
Le immagini da ottimizzare e le icone SVG stanno in `src/assets/` perché `astro:assets` e l'import degli SVG come componenti funzionano solo su file importati da `src/`. In `public/` resta solo ciò che deve avere un URL fisso.

## Form: adapter portabile
`src/lib/forms/submit.ts` espone `submitForm(name, data)` e sceglie il backend da `PUBLIC_FORMS_PROVIDER`:
- `local` (default in dev): logga in console, salva in `localStorage`, risolve OK. Serve per testare tutto in locale.
- `netlify`: POST url-encoded a `/` con `form-name` (multipart per il CV). I `<form>` mantengono `data-netlify="true"`, `netlify-honeypot` e l'input hidden `form-name` così Netlify li rileva al build.
- `endpoint`: POST a `PUBLIC_FORMS_ENDPOINT` (Formspree, Getform, backend proprio).
Form esistenti: `lead-calcolatore-fotovoltaico`, `contatti-ufficiali`, `candidatura-tecnici` (upload CV PDF/DOC, max 5 MB).
Gli errori di invio si mostrano all'utente, non vengono ingoiati.

## Comandi
- `npm run dev` · `npm run build` · `npm run preview`
- `npm run check` (astro check + tsc) · `npm test` (Vitest) · `npm run lint`
Prima di dichiarare finito un compito: `check`, `test` e `build` devono passare.

## Come lavorare
- Fasi piccole e verificabili; a fine fase riassumi cosa è cambiato e cosa resta.
- Se una richiesta contraddice questo file, chiedi prima di procedere.
- Nessuna dipendenza nuova senza motivarla in una riga.

## Memoria di lavoro (per sessioni Claude Code)
- **A inizio sessione leggi `docs/PROGRESS.md`**: stato delle fasi, decisioni prese, problemi aperti, TODO(EOS). È il riassunto: non rifare l'analisi.
- `docs/handoff.md` è il prototipo (40k token): **non rileggerlo intero**, apri solo le righe che servono (indice in PROGRESS.md).
- Una fase = un branch `claude/eos-fase-N-<nome>`, creato dal branch della fase precedente; commit e push a fine fase.
- A fine fase: `check`, `test`, `build`, `lint` verdi → aggiorna `docs/PROGRESS.md` → commit → push → fermati e aspetta l'ok.
- Risparmio token: niente rilettura di file appena scritti, output dei comandi filtrati (`grep`/`tail`), screenshot solo quando servono.
