# HANDOFF — Sito EOS Impianti (prototipo)

> **Nota per Claude Code:** questo documento descrive lo stato del prototipo. La **Parte 1** riporta le decisioni di design approvate. La **Parte 2** è il codice del prototipo: è un riferimento, NON una specifica, e contiene bug noti elencati nel prompt di avvio. Le regole del progetto sono in `CLAUDE.md`. Il vecchio prompt (ex Parte 3) è stato rimosso perché superato da `PROMPT_AVVIO.md`.

---

## 📌 PARTE 1: CONTESTO DI PROGETTO & STATO DELL'ARTE

### 1. Profilo Aziendale & Brand Identity

* **Cliente / Brand:** EOS Impianti s.n.c.
* **Sede Operativa e Legale:** Loc. Fornace 2, 15060 Vignole Borbera (AL)
* **Area di Intervento:** Forte radicamento tra le province di Alessandria e Genova, con progetti attivi su tutto il territorio nazionale.
* **Specializzazione:** Impianti tecnologici civili e industriali, energie rinnovabili (fotovoltaico su misura, micro-idroelettrico, minieolico), automazione/domotica smart, impianti di sicurezza/antifurto, climatizzazione e cablaggi strutturati.
* **Palette Colori Ufficiale:**
  * Rosso Brand: `#E52320`
  * Blu Istituzionale: `#0044BD`
  * Verde Efficienza: `#33A652` / `#10B981`
  * Dark Slate / Heading: `#0F172A` / `#1E293B`
  * Background Light: `#F8FAFC`
  * Bordo / Linee guida: `#E2E8F0`

### 2. Architettura Tecnica del Frontend

* **Framework:** [Astro.js](https://astro.build/) (Static Site Generation con componenti autonomi).
* **Librerie di Animazione:** GSAP 3.12.5 + ScrollTrigger via CDN.
* **Motore Grafici:** Chart.js (per la simulazione finanziaria del fotovoltaico).
* **Tipografia:** Montserrat (Heading), Poppins (Body text), JetBrains Mono (valori numerici e codice).
* **Form & Backend Serverless:** Moduli gestiti nativamente da **Netlify Forms** (`data-netlify="true"`):
  1. `lead-calcolatore-fotovoltaico` (Gate modale con richiesta email per sbloccare il simulatore).
  2. `contatti-ufficiali` (Richieste generiche e preventivi).
  3. `candidatura-tecnici` (Form con upload file per CV / Curriculum in formato PDF/DOC).

### 3. Struttura Risorse & Cartelle `public/`

Tutte le risorse statiche sono state organizzate localmente per evitare problemi di hotlinking CORS ed errori 403:

* **`public/logo.png`**: Logo aziendale ad alta risoluzione.
* **`public/servizi/`**: Foto dedicate alle 6 card dei servizi:
  * `domotica.jpg`, `industriale.jpg`, `fotovoltaico.jpg`, `antifurto.jpg`, `climatizzazione.jpg`, `idroelettrico.jpg`
* **`public/lavori/`**: Foto dedicate al Fotowall a mosaico pulito (senza didascalie):
  * `lavoro1.jpeg`, `lavoro2.jpeg`, `lavoro3.jpeg`, `lavoro4.jpeg`, `lavoro5.jpeg`
* **`public/icons/`**: 8 icone vettoriali caricate localmente e iniettate via JavaScript per supportare stili e colori dinamici:
  * `lampadina.svg` (sempre gialla e luminosa)
  * `interruttore.svg`
  * `quadro.svg`
  * `contatore.svg`
  * `inverter.svg`
  * `pannello.svg` (allineato all'altezza del calcolatore)
  * `batteria.svg`
  * `traliccio.svg` (posto all'estrema chiusura del tracciato)

### 4. Decisioni di Design e UX Consolidate

* **Hero con Pinned Horizontal Slideshow (su scroll verticale):**
  * La sezione hero rimane agganciata allo schermo (`pin: true`) mentre lo scorrimento verticale fa traslare orizzontalmente le slide a tutto schermo.
  * **Slide 1:** Solo il motto a tutto schermo (`Qual è l'energia giusta per te?`), pulito, su sfondo chiaro, senza box contenitore.
  * **Slide 2:** La risposta diretta (*"Progettiamo e realizziamo il modo migliore di produrre, utilizzare e gestire la tua energia..."*) con i bottoni d'azione, distribuita su larghezza ampia (`max-width: 1350px`) senza andare a capo in modo anomalo.
  * **Slide 3 & 4:** Chi siamo e Filosofia aziendale integrate nello slideshow.
  * **Slide 5:** Richiamo al calcolatore solare con video MP4 Pexels in background a schermo intero con overlay scuro.
* **Cavo Elettrico & Scenografia Vettoriale:**
  * Spessore sottile e discreto: `2px`.
  * Tracciato a serpentina armoniosa e simmetrica, posizionato **sotto i testi** (`z-index: 1`) con sfumatura in dissolvenza graduale (`mask-image`).
  * Il cavo attraversa con precisione il centro di tutte le 8 icone poste lungo i margini esterni (4% sinistra, 96% destra), tenendole a debita distanza dal box centrale (`max-width: 1080px`).
* **Calcolatore Fotovoltaico EOSolar con Lead Gate:**
  * Al caricamento della pagina è visibile solo l'anteprima promozionale del calcolatore con il tasto di sblocco.
  * Cliccando sul tasto si apre la modale che richiede l'email.
  * All'invio del form, i dati vengono salvati su Netlify, la modale si chiude, la dashboard del calcolatore viene mostrata con animazione e il calcolo finanziario/energetico viene eseguito automaticamente.

---

## 💻 PARTE 2: CODICE SORGENTE DEL PROTOTIPO (riferimento, non specifica)

### 📄 File 1: `src/components/Calcolatore.astro`

```html
---
// src/components/Calcolatore.astro
---
<style>
  :root {
    --logo-green: #10b981;
    --logo-dark: #0f172a;
    --bg-card: #ffffff;
    --bg-slate: #f8fafc;
    --border-color: #e2e8f0;
    --text-main: #334155;
    --text-sub: #64748b;
  }

  .eos-calculator-wrapper {
    max-width: 1080px;
    margin: 0 auto;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--text-main);
    width: 100%;
  }

  /* ANTEPRIMA CON PULSANTE DI SBLOCCO EMAIL */
  .calc-teaser-box {
    background: linear-gradient(135deg, #ffffff 0%, var(--bg-slate) 100%);
    padding: 36px 24px;
    border-radius: 16px;
    margin-bottom: 24px;
    border: 2px solid var(--logo-blue, #0044BD);
    box-shadow: 0 10px 25px -5px rgba(0, 68, 189, 0.08);
    text-align: center;
    box-sizing: border-box;
    width: 100%;
  }
  .teaser-header { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
  .teaser-logo-img { height: 48px; width: auto; object-fit: contain; }
  .calc-teaser-box h4 { margin: 0; font-size: 1.55rem; color: var(--logo-dark); font-weight: 800; }
  .teaser-sub { font-weight: 600; color: var(--logo-dark); margin: 6px 0 10px 0; font-size: 0.98rem; }
  .teaser-desc { font-size: 0.92rem; margin: 0 auto 18px auto; color: var(--text-sub); line-height: 1.6; max-width: 720px; }
  .calc-disclaimer { font-size: 0.82rem; background: #ecfdf5; padding: 10px 16px; border-radius: 8px; color: #065f46; font-weight: 500; border: 1px solid #a7f3d0; display: inline-block; margin-bottom: 22px; }

  /* TABS */
  .eos-tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; flex-wrap: wrap; }
  .eos-tab { padding: 10px 20px; border: none; background: none; font-weight: 700; cursor: pointer; color: var(--text-sub); border-radius: 8px; font-size: 0.92rem; transition: all 0.2s ease; }
  .eos-tab:hover { background: #e2e8f0; color: var(--logo-dark); }
  .eos-tab.active { background: var(--logo-dark); color: #ffffff; }

  /* CARDS SISMICHE ANTI-OVERFLOW */
  .eos-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 22px; margin-bottom: 20px; box-sizing: border-box; width: 100%; max-width: 100%; overflow: hidden; }
  .eos-card-title { font-weight: 700; font-size: 1.05rem; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; color: var(--logo-dark); }
  .icon-badge { background: var(--bg-slate); padding: 4px 8px; border-radius: 6px; font-size: 0.95rem; border: 1px solid var(--border-color); }
  .card-subtext { font-size: 0.85rem; color: var(--text-sub); margin-top: -6px; margin-bottom: 16px; line-height: 1.4; }

  /* GRIGLIA 12 MESI RESPONSIVE */
  .grid-12 { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; width: 100%; box-sizing: border-box; }
  @media (max-width: 900px) { .grid-12 { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; } }
  @media (max-width: 500px) { .grid-12 { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } }

  .input-field-sm input { width: 100%; min-width: 0; padding: 6px 2px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.82rem; box-sizing: border-box; background: var(--bg-slate); text-align: center; }
  .input-field-sm label { display: block; font-size: 0.7rem; font-weight: 700; color: var(--text-sub); margin-bottom: 3px; text-transform: uppercase; text-align: center; }

  .input-field input, .input-field select { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.88rem; background: var(--bg-slate); }

  .table-wrapper { width: 100%; overflow-x: auto; }
  .scaglioni-table, .sensitivity-table { width: 100%; min-width: 280px; border-collapse: collapse; font-size: 0.88rem; text-align: left; }
  .scaglioni-table th, .scaglioni-table td, .sensitivity-table th, .sensitivity-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
  .scaglioni-table th, .sensitivity-table th { background: var(--bg-slate); font-weight: 700; color: var(--logo-dark); }

  /* BUTTONS */
  .btn-primary { background: #E52320; color: white; border: none; padding: 14px 28px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background 0.2s ease; font-size: 1rem; }
  .btn-primary:hover { background: #CC1F1C; }
  .btn-secondary { background: var(--logo-dark); color: white; border: none; padding: 9px 16px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .full-width { width: 100%; }

  .params-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }

  .result-hero-box { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 26px; border-radius: 12px; margin-bottom: 20px; }
  .hero-badge { font-size: 0.78rem; text-transform: uppercase; font-weight: 800; color: var(--logo-green); letter-spacing: 0.05em; }
  .hero-main-val { font-size: 2.5rem; font-weight: 800; margin: 2px 0 8px 0; }
  .hero-statement { font-size: 1rem; line-height: 1.5; color: #cbd5e1; }

  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
  .metric-card { background: var(--bg-slate); border: 1px solid var(--border-color); padding: 16px; border-radius: 10px; }
  .metric-title { font-size: 0.75rem; color: var(--text-sub); font-weight: 700; text-transform: uppercase; }
  .metric-value { font-size: 1.4rem; font-weight: 800; color: var(--logo-dark); margin: 6px 0 4px 0; }
  .metric-desc { font-size: 0.78rem; color: var(--text-sub); line-height: 1.35; }

  .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; margin-bottom: 20px; }
  .chart-card { background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; }
  .chart-title { font-size: 0.9rem; font-weight: 700; margin-bottom: 14px; color: var(--logo-dark); }
  .chart-container { position: relative; height: 320px; width: 100%; }

  .slider-row { display: flex; align-items: center; gap: 20px; margin: 14px 0; }
  .slider-row input[type="range"] { flex: 1; accent-color: var(--logo-green); }
  .slider-val { font-weight: 800; font-size: 1.2rem; color: var(--logo-dark); min-width: 100px; }

  /* DASHBOARD NASCOSTA DI DEFAULT */
  .calc-dashboard { display: none; margin-top: 30px; }
  .calc-dashboard.active { display: block; animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .hidden { display: none !important; }
</style>

<div class="eos-calculator-wrapper">
  <!-- ANTEPRIMA CALCOLATORE: PULSANTE DI ACCESSO CON EMAIL -->
  <div class="calc-teaser-box">
    <div class="teaser-header">
      <img src="/logo.png" alt="Logo EOS Impianti" class="teaser-logo-img" />
      <h4>Ottimizzatore Fotovoltaico & Accumulo EOSolar</h4>
    </div>
    <p class="teaser-sub">Calcola il dimensionamento ideale (kWp + Batteria) sui tuoi consumi reali.</p>
    <p class="teaser-desc">
      Inserisci i tuoi consumi energetici e scopri la stima precisa della combinazione ottimale di pannelli e accumulo che massimizza il risparmio e il rientro dell'investimento a 25 anni.
    </p>
    <div class="calc-disclaimer">
      ℹ️ Risultato personalizzato su profili F1/F2/F3, irraggiamento satellitare e modello finanziario DCF.
    </div>

    <div>
      <button class="btn-primary" onclick="openLeadModal()">
        🔓 Accedi al Calcolatore Fotovoltaico
      </button>
    </div>
  </div>

  <!-- DASHBOARD COMPLETA (SBLOCCATA DOPO L'INVIO EMAIL) -->
  <div class="calc-dashboard" id="calc-dashboard">
    <div class="eos-tabs">
      <button class="eos-tab active" onclick="switchEosTab('input')">① Dati Input & Profilo Consumi</button>
      <button class="eos-tab" onclick="switchEosTab('ottimale')">② Dimensionamento Ottimale</button>
      <button class="eos-tab" onclick="switchEosTab('manuale')">③ Simulazione Libera</button>
    </div>

    <!-- TAB 1: INPUT -->
    <div id="eos-tab-input" class="eos-section">
      <div class="eos-card">
        <div class="eos-card-title"><span class="icon-badge">⚡</span> Fabbisogno Energetico dell'Utenza</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 16px;">
          <div class="input-field">
            <label><strong>Consumo Totale Annuo (kWh/anno)</strong></label>
            <input type="number" id="consumo-totale-annuo" value="3800" onchange="updateF2F3Calculated()">
          </div>
          <div class="input-field">
            <label><strong>Flessibilità Spostamento Consumi (DSM)</strong></label>
            <select id="flexibility-shift">
              <option value="0">0% - Nessuno spostamento diurno</option>
              <option value="0.15" selected>15% - Moderato (Timer elettrodomestici)</option>
              <option value="0.30">30% - Elevato (Smart working / Diurno)</option>
            </select>
          </div>
        </div>

        <div class="eos-card-title" style="font-size:0.95rem; margin-top:10px;"><span class="icon-badge">☀️</span> Dettaglio Consumi Diurni Mensili F1 (kWh)</div>
        <div class="grid-12" id="consumi-grid"></div>
        <div id="f2f3-summary" style="font-size:0.85rem; color:var(--text-sub); margin-top:12px; font-weight:600;"></div>
      </div>

      <div class="eos-card">
        <div class="eos-card-title"><span class="icon-badge">🌤</span> Ore Equivalenti Mensili per kWp (h/kWp)</div>
        <div class="grid-12" id="ore-grid"></div>
      </div>

      <div class="eos-card">
        <div class="eos-card-title"><span class="icon-badge">💶</span> Curva Costi Impianto & Accumulo (Interpolazione CAPEX)</div>
        <p class="card-subtext">Costi turnkey medi di mercato inclusivi di installazione e pratiche GSE.</p>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div class="table-wrapper">
            <table class="scaglioni-table">
              <thead><tr><th>Taglia FV</th><th>€ / kWp</th></tr></thead>
              <tbody id="scaglioni-tbody"></tbody>
            </table>
          </div>
          <div class="table-wrapper">
            <table class="scaglioni-table">
              <thead><tr><th>Batteria (kWh)</th><th>€ / kWh usabile</th></tr></thead>
              <tbody id="bess-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="eos-card">
        <div class="params-grid" id="params-grid"></div>
      </div>

      <button type="button" class="btn-primary full-width" onclick="runAllEOSolar()">
        ⚡ Calcola Analisi Ottimizzata (PV + BESS)
      </button>
    </div>

    <!-- TAB 2: RISULTATO OTTIMALE -->
    <div id="eos-tab-ottimale" class="eos-section hidden">
      <div id="result-hero-l1" class="result-hero-box">
        <div class="hero-badge">Configurazione Ottimale Consigliata</div>
        <div class="hero-main-val" id="l1-kwp">—</div>
        <div class="hero-statement" id="l1-statement">Esegui il calcolo per generare l'analisi.</div>
      </div>

      <div class="eos-card">
        <div class="eos-card-title"><span class="icon-badge">📊</span> Indicatori Finanziari Chiave</div>
        <div class="metrics-grid" id="l2-metrics"></div>
      </div>

      <div class="eos-card">
        <div class="eos-card-title"><span class="icon-badge">⚖️</span> Analisi di Sensibilità (Payback Attualizzato)</div>
        <div class="table-wrapper">
          <table class="sensitivity-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Costo Energia</th>
                <th>Inflazione / Degrado</th>
                <th>Payback Att.</th>
                <th>NPV 25 Anni</th>
              </tr>
            </thead>
            <tbody id="sensitivity-tbody"></tbody>
          </table>
        </div>
      </div>

      <div class="two-col">
        <div class="chart-card">
          <div class="chart-title">Produzione vs Consumi Mensili</div>
          <div class="chart-container">
            <canvas id="chart-bars-opt"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Curva Valore Netto (NPV vs Potenza FV)</div>
          <div class="chart-container">
            <canvas id="chart-npv-curve"></canvas>
          </div>
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:20px;">
        <div class="chart-title">Flusso di Cassa Cumulato Attualizzato a 25 Anni</div>
        <div class="chart-container">
          <canvas id="chart-cashflow-opt"></canvas>
        </div>
      </div>
    </div>

    <!-- TAB 3: MANUALE -->
    <div id="eos-tab-manuale" class="eos-section hidden">
      <div class="eos-card">
        <div class="eos-card-title"><span class="icon-badge">🎛</span> Selezione Manuale Impianto & Accumulo</div>
        <div class="slider-row">
          <label style="min-width:140px; font-weight:700;">Potenza FV (kWp):</label>
          <input type="range" min="1" max="20" step="0.5" value="3" id="slider-kwp" oninput="updateSlidersLabel()">
          <div class="slider-val" id="slider-label-kwp">3.0 kWp</div>
        </div>
        <div class="slider-row">
          <label style="min-width:140px; font-weight:700;">Accumulo (kWh):</label>
          <input type="range" min="0" max="15" step="2.5" value="0" id="slider-kwh" oninput="updateSlidersLabel()">
          <div class="slider-val" id="slider-label-kwh">0.0 kWh</div>
        </div>
        <button type="button" class="btn-primary full-width" onclick="runManualeEOSolar()" style="margin-top:10px;">
          📊 Simula Questa Configurazione
        </button>
      </div>

      <div id="manual-results" class="hidden">
        <div class="metrics-grid" id="manual-metrics"></div>
        <div class="two-col" style="margin-top:16px;">
          <div class="chart-card">
            <div class="chart-title">Produzione vs Consumi Mensili</div>
            <div class="chart-container">
              <canvas id="chart-bars-man"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Flusso di Cassa Cumulato 25 Anni</div>
            <div class="chart-container">
              <canvas id="chart-cashflow-man"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<script is:inline>
  const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giug', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  let defaultConsumiF1 = [220, 200, 190, 180, 170, 190, 230, 210, 190, 200, 210, 230];
  let defaultOreEquiv = [65, 80, 115, 135, 150, 160, 165, 155, 125, 95, 65, 55];
  
  const costPointsFV = [
    { kwp: 1, cost: 2000 }, { kwp: 2, cost: 1900 }, { kwp: 3, cost: 1800 },
    { kwp: 4, cost: 1750 }, { kwp: 5, cost: 1700 }, { kwp: 6, cost: 1650 },
    { kwp: 8, cost: 1550 }, { kwp: 10, cost: 1500 }, { kwp: 15, cost: 1400 }, { kwp: 20, cost: 1350 }
  ];

  const costPointsBESS = [
    { kwh: 0, cost: 0 }, { kwh: 2.5, cost: 700 }, { kwh: 5.0, cost: 550 },
    { kwh: 7.5, cost: 500 }, { kwh: 10.0, cost: 450 }, { kwh: 12.5, cost: 420 }, { kwh: 15.0, cost: 400 }
  ];

  let defaultParams = {
    tariffaAcquisto: 0.25, tariffaVendita: 0.10, inflazione: 2.0, degradoFV: 0.5,
    degradoBESS: 1.5, dodBESS: 90, rteBESS: 88, oemPerc: 1.5, inverterPerc: 7.5,
    annoInverter: 15, bessSostPerc: 70, annoBessSost: 12, tassoSconto: 6.0
  };

  let chartInstances = {};

  document.addEventListener('DOMContentLoaded', () => {
    initInputGrids();
    initScaglioniTables();
    initParamsGrid();
    updateF2F3Calculated();
  });

  window.switchEosTab = function(tabId) {
    document.querySelectorAll('.eos-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.eos-section').forEach(s => s.classList.add('hidden'));
    if(event && event.target) event.target.classList.add('active');
    const targetSection = document.getElementById(`eos-tab-${tabId}`);
    if (targetSection) targetSection.classList.remove('hidden');
  };

  function initInputGrids() {
    const cg = document.getElementById('consumi-grid');
    const og = document.getElementById('ore-grid');
    if(!cg || !og) return;
    cg.innerHTML = ''; og.innerHTML = '';
    MONTHS.forEach((m, idx) => {
      cg.innerHTML += `<div class="input-field-sm"><label>${m}</label><input type="number" id="cons-${idx}" value="${defaultConsumiF1[idx]}" onchange="updateF2F3Calculated()"></div>`;
      og.innerHTML += `<div class="input-field-sm"><label>${m}</label><input type="number" id="ore-${idx}" value="${defaultOreEquiv[idx]}"></div>`;
    });
  }

  window.updateF2F3Calculated = function() {
    let inputTot = document.getElementById('consumo-totale-annuo');
    if(!inputTot) return;
    let totAnnuo = parseFloat(inputTot.value) || 0;
    let totF1 = 0;
    for(let i=0; i<12; i++) {
      let el = document.getElementById(`cons-${i}`);
      if(el) totF1 += parseFloat(el.value) || 0;
    }
    let totF2F3 = Math.max(0, totAnnuo - totF1);
    let summary = document.getElementById('f2f3-summary');
    if(summary) {
      summary.innerHTML = `📌 Totale F1 (Diurno): <strong>${Math.round(totF1).toLocaleString('it-IT')} kWh</strong> | Totale F2+F3: <strong>${Math.round(totF2F3).toLocaleString('it-IT')} kWh</strong>`;
    }
  };

  function initScaglioniTables() {
    const tbFV = document.getElementById('scaglioni-tbody');
    if(tbFV) {
      tbFV.innerHTML = '';
      costPointsFV.forEach(p => { tbFV.innerHTML += `<tr><td><strong>${p.kwp} kWp</strong></td><td>€ ${p.cost.toLocaleString('it-IT')}</td></tr>`; });
    }
    const tbBESS = document.getElementById('bess-tbody');
    if(tbBESS) {
      tbBESS.innerHTML = '';
      costPointsBESS.filter(p => p.kwh > 0).forEach(p => { tbBESS.innerHTML += `<tr><td><strong>${p.kwh} kWh</strong></td><td>€ ${p.cost.toLocaleString('it-IT')}</td></tr>`; });
    }
  }

  function initParamsGrid() {
    const pg = document.getElementById('params-grid');
    if(!pg) return;
    pg.innerHTML = `
      <div class="input-field"><label>Tariffa Acquisto (€/kWh)</label><input type="number" step="0.01" id="param-tariffaAcquisto" value="${defaultParams.tariffaAcquisto}"></div>
      <div class="input-field"><label>Tariffa Vendita (€/kWh)</label><input type="number" step="0.01" id="param-tariffaVendita" value="${defaultParams.tariffaVendita}"></div>
      <div class="input-field"><label>Inflazione Energetica (%)</label><input type="number" step="0.1" id="param-inflazione" value="${defaultParams.inflazione}"></div>
      <div class="input-field"><label>Degrado FV (%/anno)</label><input type="number" step="0.1" id="param-degradoFV" value="${defaultParams.degradoFV}"></div>
      <div class="input-field"><label>Tasso Sconto Finanziario (%)</label><input type="number" step="0.1" id="param-tassoSconto" value="${defaultParams.tassoSconto}"></div>
    `;
  }

  function getInterpolatedCostFV(kwp) {
    if (kwp <= costPointsFV[0].kwp) return costPointsFV[0].cost;
    if (kwp >= costPointsFV[costPointsFV.length - 1].kwp) return costPointsFV[costPointsFV.length - 1].cost;
    for (let i = 0; i < costPointsFV.length - 1; i++) {
      let p1 = costPointsFV[i], p2 = costPointsFV[i + 1];
      if (kwp >= p1.kwp && kwp <= p2.kwp) return p1.cost + ((p2.cost - p1.cost) / (p2.kwp - p1.kwp)) * (kwp - p1.kwp);
    }
    return costPointsFV[costPointsFV.length - 1].cost;
  }

  function getInterpolatedCostBESS(kwh) {
    if (kwh <= 0) return 0;
    if (kwh <= costPointsBESS[1].kwh) return costPointsBESS[1].cost;
    if (kwh >= costPointsBESS[costPointsBESS.length - 1].kwh) return costPointsBESS[costPointsBESS.length - 1].cost;
    for (let i = 1; i < costPointsBESS.length - 1; i++) {
      let p1 = costPointsBESS[i], p2 = costPointsBESS[i + 1];
      if (kwh >= p1.kwh && kwh <= p2.kwh) return p1.cost + ((p2.cost - p1.cost) / (p2.kwh - p1.kwh)) * (kwh - p1.kwh);
    }
    return costPointsBESS[costPointsBESS.length - 1].cost;
  }

  function getInputs() {
    let consumiF1 = [], ore = [];
    for(let i=0; i<12; i++) {
      consumiF1.push(parseFloat(document.getElementById(`cons-${i}`).value) || 0);
      ore.push(parseFloat(document.getElementById(`ore-${i}`).value) || 0);
    }
    let consumoTotAnnuo = parseFloat(document.getElementById('consumo-totale-annuo').value) || 0;
    let flexShift = parseFloat(document.getElementById('flexibility-shift').value) || 0;
    let params = {
      tariffaAcquisto: parseFloat(document.getElementById('param-tariffaAcquisto').value),
      tariffaVendita: parseFloat(document.getElementById('param-tariffaVendita').value),
      inflazione: parseFloat(document.getElementById('param-inflazione').value) / 100,
      degradoFV: parseFloat(document.getElementById('param-degradoFV').value) / 100,
      degradoBESS: defaultParams.degradoBESS / 100,
      dodBESS: defaultParams.dodBESS / 100,
      rteBESS: defaultParams.rteBESS / 100,
      oemPerc: defaultParams.oemPerc / 100,
      inverterPerc: defaultParams.inverterPerc / 100,
      annoInverter: defaultParams.annoInverter,
      bessSostPerc: defaultParams.bessSostPerc / 100,
      annoBessSost: defaultParams.annoBessSost,
      tassoSconto: parseFloat(document.getElementById('param-tassoSconto').value) / 100
    };
    return { consumiF1, ore, consumoTotAnnuo, flexShift, params };
  }

  function calculateJointFinancials(kwp, kwhBess, consumiF1, ore, consumoTotAnnuo, flexShift, params) {
    let capexFV = kwp * getInterpolatedCostFV(kwp);
    let capexBESS = kwhBess * getInterpolatedCostBESS(kwhBess);
    let capexTotale = capexFV + capexBESS;
    let totF1Annuo = consumiF1.reduce((a,b)=>a+b, 0);
    let totF2F3Annuo = Math.max(0, consumoTotAnnuo - totF1Annuo);
    let prodAnnua = 0, autoDirettoAnno1 = 0, caricaBessAnno1 = 0, scaricaBessAnno1 = 0, immessAnnuo1 = 0;
    let prodMensile = [], consF1Mensile = [], consF2F3Mensile = [], scaricaBessMensile = [];

    for (let m = 0; m < 12; m++) {
      let p = kwp * ore[m];
      let cF1 = consumiF1[m] + ((totF2F3Annuo / 12) * flexShift);
      let cF2F3 = (totF2F3Annuo / 12) * (1 - flexShift);
      let autoDiretto = Math.min(p, cF1);
      let esuberoDiurno = Math.max(0, p - cF1);
      let caricaMese = Math.min(esuberoDiurno / 30.4, kwhBess * params.dodBESS) * 30.4;
      let scaricaMese = Math.min(caricaMese * params.rteBESS, cF2F3);
      let immessMese = Math.max(0, esuberoDiurno - caricaMese);

      prodAnnua += p; autoDirettoAnno1 += autoDiretto; caricaBessAnno1 += caricaMese; scaricaBessAnno1 += scaricaMese; immessAnnuo1 += immessMese;
      prodMensile.push(p); consF1Mensile.push(cF1); consF2F3Mensile.push(cF2F3); scaricaBessMensile.push(scaricaMese);
    }

    let redditoAnno1 = (autoDirettoAnno1 + scaricaBessAnno1) * params.tariffaAcquisto + immessAnnuo1 * params.tariffaVendita;
    let cashFlowsDisc = [];
    for (let n = 1; n <= 25; n++) {
      let redditoN = redditoAnno1 * Math.pow(1 + params.inflazione, n - 1) * Math.pow(1 - params.degradoFV, n - 1);
      let oemN = (capexTotale * params.oemPerc) * Math.pow(1 + params.inflazione, n - 1);
      let flussoNettoN = redditoN - oemN;
      cashFlowsDisc.push(flussoNettoN / Math.pow(1 + params.tassoSconto, n));
    }

    let npv = cashFlowsDisc.reduce((a, b) => a + b, 0) - capexTotale;
    let cumDisc = -capexTotale;
    let paybackAttualizzato = 25;
    for (let n = 0; n < 25; n++) {
      cumDisc += cashFlowsDisc[n];
      if (cumDisc >= 0) { paybackAttualizzato = n + Math.abs(cumDisc - cashFlowsDisc[n]) / cashFlowsDisc[n]; break; }
    }

    let autoTot = autoDirettoAnno1 + scaricaBessAnno1;
    let scr = prodAnnua > 0 ? (autoTot / prodAnnua) * 100 : 0;
    let ssr = consumoTotAnnuo > 0 ? (autoTot / consumoTotAnnuo) * 100 : 0;

    return { kwp, kwhBess, capexFV, capexBESS, capexTotale, npv, paybackAttualizzato, scr, ssr, prodAnnua, cashFlowsDisc, prodMensile, consF1Mensile, consF2F3Mensile, scaricaBessMensile };
  }

  window.runAllEOSolar = function() {
    const { consumiF1, ore, consumoTotAnnuo, flexShift, params } = getInputs();
    let allComb = [];
    for (let k = 1; k <= 15; k += 0.5) {
      for (let b = 0; b <= 15; b += 2.5) {
        allComb.push(calculateJointFinancials(k, b, consumiF1, ore, consumoTotAnnuo, flexShift, params));
      }
    }
    let valid = allComb.filter(r => r.prodAnnua <= (consumoTotAnnuo * 1.40) && r.scr >= 40);
    if (valid.length === 0) valid = allComb;
    let optimal = valid.reduce((best, r) => (r.npv / r.capexTotale) > (best.npv / best.capexTotale) ? r : best, valid[0]);

    document.getElementById('l1-kwp').textContent = `${optimal.kwp} kWp + ${optimal.kwhBess} kWh Accumulo`;
    document.getElementById('l1-statement').innerHTML = `
      Per il tuo fabbisogno di <strong>${Math.round(consumoTotAnnuo).toLocaleString('it-IT')} kWh/anno</strong>, la taglia ideale è 
      <strong>${optimal.kwp} kWp con ${optimal.kwhBess} kWh di accumulo</strong>.<br>
      Investimento CAPEX: <strong>€ ${Math.round(optimal.capexTotale).toLocaleString('it-IT')}</strong> | 
      Copertura Fabbisogno (SSR): <strong>${optimal.ssr.toFixed(0)}%</strong> | 
      Guadagno Netto a 25 anni (NPV): <strong>€ ${Math.round(optimal.npv).toLocaleString('it-IT')}</strong> con rientro in <strong>${optimal.paybackAttualizzato.toFixed(1)} anni</strong>.
    `;

    renderLevel2Metrics('l2-metrics', optimal);
    renderSensitivityTable(optimal.kwp, optimal.kwhBess, consumiF1, ore, consumoTotAnnuo, flexShift, params);
    renderBarChart('chart-bars-opt', optimal.prodMensile, optimal.consF1Mensile, optimal.scaricaBessMensile);
    renderNpvCurveChart('chart-npv-curve', allComb.filter(c => c.kwhBess === optimal.kwhBess || c.kwhBess === 0), optimal.kwp);
    renderCashflowChart('chart-cashflow-opt', optimal.cashFlowsDisc, optimal.capexTotale);
    switchEosTab('ottimale');
  };

  function renderLevel2Metrics(id, res) {
    const c = document.getElementById(id);
    if(!c) return;
    c.innerHTML = `
      <div class="metric-card"><div class="metric-title">NPV (Valore Attuale Netto)</div><div class="metric-value">€ ${Math.round(res.npv).toLocaleString('it-IT')}</div><div class="metric-desc">Guadagno netto reale a 25 anni attualizzato.</div></div>
      <div class="metric-card"><div class="metric-title">Payback Attualizzato</div><div class="metric-value">${res.paybackAttualizzato.toFixed(1)} Anni</div><div class="metric-desc">Tempo di rientro dell'investimento.</div></div>
      <div class="metric-card"><div class="metric-title">Copertura Bolletta (SSR)</div><div class="metric-value">${res.ssr.toFixed(0)}%</div><div class="metric-desc">Percentuale di consumi coperti dall'impianto.</div></div>
      <div class="metric-card"><div class="metric-title">Autoconsumo Diretto (SCR)</div><div class="metric-value">${res.scr.toFixed(0)}%</div><div class="metric-desc">Energia prodotta utilizzata direttamente.</div></div>
    `;
  }

  function renderSensitivityTable(kwp, kwhBess, consumiF1, ore, consumoTotAnnuo, flexShift, baseParams) {
    const tbody = document.getElementById('sensitivity-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    [{ name: 'Pessimista', mult: 0.8 }, { name: 'Base', mult: 1.0 }, { name: 'Ottimista', mult: 1.2 }].forEach(sc => {
      let p = { ...baseParams, tariffaAcquisto: baseParams.tariffaAcquisto * sc.mult };
      let res = calculateJointFinancials(kwp, kwhBess, consumiF1, ore, consumoTotAnnuo, flexShift, p);
      tbody.innerHTML += `<tr><td><strong>${sc.name}</strong></td><td>€ ${p.tariffaAcquisto.toFixed(2)}/kWh</td><td>${(p.inflazione*100).toFixed(1)}%</td><td><strong>${res.paybackAttualizzato.toFixed(1)} Anni</strong></td><td>€ ${Math.round(res.npv).toLocaleString('it-IT')}</td></tr>`;
    });
  }

  window.runManualeEOSolar = function() {
    const kwp = parseFloat(document.getElementById('slider-kwp').value);
    const kwhBess = parseFloat(document.getElementById('slider-kwh').value);
    const { consumiF1, ore, consumoTotAnnuo, flexShift, params } = getInputs();
    const res = calculateJointFinancials(kwp, kwhBess, consumiF1, ore, consumoTotAnnuo, flexShift, params);
    document.getElementById('manual-results').classList.remove('hidden');
    renderLevel2Metrics('manual-metrics', res);
    renderBarChart('chart-bars-man', res.prodMensile, res.consF1Mensile, res.scaricaBessMensile);
    renderCashflowChart('chart-cashflow-man', res.cashFlowsDisc, res.capexTotale);
  };

  window.updateSlidersLabel = function() {
    document.getElementById('slider-label-kwp').textContent = `${parseFloat(document.getElementById('slider-kwp').value).toFixed(1)} kWp`;
    document.getElementById('slider-label-kwh').textContent = `${parseFloat(document.getElementById('slider-kwh').value).toFixed(1)} kWh`;
  };

  function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

  function renderBarChart(id, prod, consF1, scaricaBess) {
    if (typeof Chart === 'undefined') return;
    destroyChart(id);
    const ctx = document.getElementById(id)?.getContext('2d');
    if(!ctx) return;
    chartInstances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          { label: 'Produzione FV (kWh)', data: prod, backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Consumo F1 (kWh)', data: consF1, backgroundColor: '#0f172a', borderRadius: 4 },
          { label: 'Batteria (kWh)', data: scaricaBess, backgroundColor: '#f59e0b', borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function renderNpvCurveChart(id, curveData, optKwp) {
    if (typeof Chart === 'undefined') return;
    destroyChart(id);
    const ctx = document.getElementById(id)?.getContext('2d');
    if(!ctx) return;
    let dataFV = curveData.filter(d => d.kwhBess === 0);
    chartInstances[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataFV.map(d => `${d.kwp} kWp`),
        datasets: [{ label: 'Valore Netto Impianto (€)', data: dataFV.map(d => d.npv), borderColor: '#10b981', borderWidth: 3, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function renderCashflowChart(id, cashflowsDisc, capex) {
    if (typeof Chart === 'undefined') return;
    destroyChart(id);
    const ctx = document.getElementById(id)?.getContext('2d');
    if(!ctx) return;
    let cumulated = [-capex], curr = -capex;
    for (let cf of cashflowsDisc) { curr += cf; cumulated.push(curr); }
    chartInstances[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['0', ...Array.from({length: 25}, (_, i) => `${i+1}`)],
        datasets: [{ label: 'Cassa Cumulata Attualizzata (€)', data: cumulated, borderColor: '#0f172a', backgroundColor: 'rgba(16, 185, 129, 0.08)', fill: true, borderWidth: 2 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }
</script>
```

---

### 📄 File 2: `src/pages/index.astro`

```html
---
// src/pages/index.astro
import Calcolatore from '../components/Calcolatore.astro';
---
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EOS Impianti s.n.c. — Impianti Elettrici, Domotica e Fotovoltaico</title>
  <meta name="description" content="Da oltre 20 anni progettiamo e realizziamo impianti elettrici civili, industriali, domotica e fotovoltaico su misura tra Alessandria, Genova e su tutto il territorio nazionale.">

  <!-- OPEN GRAPH & TWITTER CARDS -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="EOS Impianti s.n.c. — Energia, tecnologia e competenza">
  <meta property="og:description" content="Progettiamo e realizziamo il modo migliore di produrre, utilizzare e gestire la tua energia. Impianti civili, industriali e fotovoltaico su misura.">
  <meta property="og:image" content="/logo.png">
  <meta property="og:locale" content="it_IT">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="EOS Impianti s.n.c. — Soluzioni Energetiche e Fotovoltaico">
  <meta name="twitter:description" content="Impianti elettrici civili e industriali, domotica e sistemi di accumulo solare tra Alessandria e Genova.">
  <meta name="twitter:image" content="/logo.png">

  <!-- SCHEMA.ORG DATI STRUTTURATI LOCAL BUSINESS PER GOOGLE -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Electrician",
    "name": "EOS IMPIANTI s.n.c.",
    "image": "/logo.png",
    "telephone": "+390143677895",
    "email": "info@eosimpianti.it",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Loc. Fornace 2",
      "addressLocality": "Vignole Borbera",
      "addressRegion": "AL",
      "postalCode": "15060",
      "addressCountry": "IT"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 44.7139,
      "longitude": 8.8924
    },
    "areaServed": [
      "Provincia di Alessandria",
      "Genova",
      "Piemonte",
      "Liguria",
      "Italia"
    ],
    "description": "Progettazione e realizzazione di impianti elettrici civili e industriali, fotovoltaico, automazione, domotica e sistemi di sicurezza."
  }
  </script>

  <!-- GSAP & ScrollTrigger CDN -->
  <script is:inline src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script is:inline src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

  <!-- Engine Grafici e Font Geometrici -->
  <script is:inline src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=Poppins:wght@300;400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">

  <style>
    :root {
      --logo-red: #E52320;
      --logo-blue: #0044BD;
      --logo-green: #33A652;
      --logo-dark: #1A1A1A;
      
      --bg-light: #F8FAFC;
      --card-bg: #FFFFFF;
      --text-main: #475569;
      --text-heading: #0F172A;
      --border: #E2E8F0;
      --radius: 16px;
      
      --font-heading: 'Montserrat', sans-serif;
      --font-body: 'Poppins', sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { 
      font-family: var(--font-body); 
      background-color: var(--bg-light); 
      color: var(--text-main); 
      line-height: 1.6; 
      position: relative;
      overflow-x: clip;
    }

    h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); color: var(--text-heading); }

    /* EFFETTO IMPULSO DI LUCE SULLE PAROLE */
    .electric-spark {
      display: inline-block;
      position: relative;
      font-weight: 800;
      color: var(--logo-blue);
      background: linear-gradient(
        110deg,
        #0044BD 0%,
        #0044BD 35%,
        #38BDF8 48%,
        #FFFFFF 50%,
        #38BDF8 52%,
        #0044BD 65%,
        #0044BD 100%
      );
      background-size: 250% 100%;
      background-position: 100% 0;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      transition: filter 0.3s ease;
    }

    .electric-spark.spark-red {
      color: var(--logo-red);
      background: linear-gradient(
        110deg,
        #E52320 0%,
        #E52320 35%,
        #FFA2A1 48%,
        #FFFFFF 50%,
        #FFA2A1 52%,
        #E52320 65%,
        #E52320 100%
      );
      background-size: 250% 100%;
      background-position: 100% 0;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .electric-spark.active {
      animation: electricPassThrough 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.6));
    }

    .electric-spark.spark-red.active {
      filter: drop-shadow(0 0 6px rgba(229, 35, 32, 0.6));
    }

    @keyframes electricPassThrough {
      0% { background-position: 100% 0; }
      100% { background-position: 0% 0; }
    }

    /* HEADER STICKY */
    header.site-header {
      position: sticky; top: 0; background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(12px); border-bottom: 1px solid var(--border);
      padding: 16px 5%; display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      transition: all 0.3s ease;
    }
    header.site-header.scrolled { padding: 8px 5%; }

    .brand-center { cursor: pointer; text-align: center; margin-bottom: 8px; }
    .brand-logo { height: 68px; width: auto; object-fit: contain; transition: all 0.3s ease; }
    header.site-header.scrolled .brand-logo { height: 38px; }

    nav.site-nav { display: flex; gap: 24px; align-items: center; justify-content: center; flex-wrap: wrap; }
    nav.site-nav a { font-family: var(--font-heading); color: var(--text-main); text-decoration: none; font-weight: 600; font-size: 0.85rem; transition: color 0.2s; }
    nav.site-nav a:hover { color: var(--logo-blue); }
    .btn-cta-nav { background: var(--logo-blue); color: white !important; padding: 8px 18px; border-radius: 6px; font-weight: 700 !important; transition: background 0.2s; }
    .btn-cta-nav:hover { background: #003399; }

    /* ========================================================
       SLIDESHOW HERO A LARGHEZZA PIENA
       ======================================================== */
    .horizontal-scroll-container {
      position: relative;
      width: 100%;
      height: 85vh;
      overflow: hidden;
      background: var(--bg-light);
    }

    .horizontal-scroll-wrapper {
      display: flex;
      width: 500%;
      height: 100%;
      will-change: transform;
    }

    .hero-slide {
      width: 100vw;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 5%;
      flex-shrink: 0;
      position: relative;
      text-align: center;
      box-sizing: border-box;
    }

    .hero-big-statement {
      font-size: clamp(2.4rem, 4.8vw, 4.6rem);
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--text-heading);
      width: 100%;
      max-width: 1350px;
      margin: 0 auto;
    }

    .hero-slide-content {
      width: 100%;
      max-width: 1350px;
      margin: 0 auto;
      padding: 0 15px;
    }
    .hero-slide-content h2 { 
      font-size: clamp(1.8rem, 3.4vw, 2.6rem); 
      font-weight: 800; 
      color: var(--text-heading); 
      margin-bottom: 20px; 
      line-height: 1.25; 
    }
    .hero-slide-content p { 
      font-size: clamp(1rem, 1.4vw, 1.22rem); 
      color: var(--text-main); 
      margin: 0 auto 30px auto; 
      font-weight: 400; 
      line-height: 1.6; 
      max-width: 1150px;
    }

    .slide-video-container { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; z-index: 1; }
    .slide-video-bg { width: 100%; height: 100%; object-fit: cover; opacity: 0.45; }
    .slide-video-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(11, 17, 32, 0.88) 0%, rgba(15, 23, 42, 0.92) 100%); }
    .slide-calc-content { position: relative; z-index: 2; }
    .slide-calc-content h2 { color: #FFFFFF !important; }
    .slide-calc-content p { color: #E2E8F0 !important; }

    .hero-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn-primary { background: var(--logo-red); color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; font-family: var(--font-heading); font-size: 1rem; }
    .btn-primary:hover { background: #CC1F1C; transform: translateY(-2px); }
    .btn-secondary { background: white; color: var(--logo-blue); border: 2px solid var(--logo-blue); padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: var(--font-heading); font-size: 1rem; }
    .btn-secondary:hover { background: var(--logo-blue); color: white; transform: translateY(-2px); }

    /* ========================================================
       CAVO ELETTRICO SOTTILE (2px) E ALLINEAMENTO ESATTO ALLE ICONE
       ======================================================== */
    .master-wire-track {
      position: absolute;
      top: 85vh;
      bottom: 60px;
      left: 0;
      width: 100%;
      pointer-events: none;
      z-index: 1;
      mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
    }

    .wire-svg-canvas {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .wire-tube-bg {
      fill: none;
      stroke: #CBD5E1;
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0.35;
    }

    .wire-copper-active {
      fill: none;
      stroke: #38BDF8;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-dasharray: 12000;
      stroke-dashoffset: 12000;
      filter: drop-shadow(0 0 5px #0044BD);
    }

    /* ICONE VETTORIALI */
    .wire-element {
      position: absolute;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      z-index: 2;
      pointer-events: auto;
      background: none;
      border: none;
      box-shadow: none;
      opacity: 0.9;
      transition: all 0.4s ease;
    }

    .wire-element svg {
      width: 100%;
      height: 100%;
      transition: all 0.4s ease;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.06));
    }

    /* LAMPADINA SEMPRE GIALLA E LUMINOSA */
    #node-lamp {
      opacity: 1;
      filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.85)) drop-shadow(0 0 28px rgba(217, 119, 6, 0.4));
    }
    #node-lamp svg, #node-lamp path, #node-lamp circle, #node-lamp rect {
      stroke: #D97706 !important;
      fill: #FBBF24 !important;
    }

    /* ACCENSIONE ALTRI ELEMENTI QUANDO IL CAVO LI RAGGIUNGE */
    .wire-element.active-element {
      opacity: 1;
      filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.85)) drop-shadow(0 0 25px rgba(0, 68, 189, 0.4));
      transform: translate(-50%, -50%) scale(1.12);
    }

    .wire-element.active-element.green {
      filter: drop-shadow(0 0 18px rgba(16, 185, 129, 0.9)) drop-shadow(0 0 30px rgba(5, 150, 105, 0.5));
    }

    /* POSIZIONI LONTANE DAI BOX CENTRALI (4% SINISTRA E 96% DESTRA) */
    .elem-lamp      { top: 2%;  left: 4%; }
    .elem-switch    { top: 15%; left: 96%; }
    .elem-panel     { top: 29%; left: 4%; }
    .elem-meter     { top: 43%; left: 96%; }
    .elem-inverter  { top: 58%; left: 4%; }
    .elem-solar     { top: 73%; left: 96%; }
    .elem-battery   { top: 86%; left: 4%; }
    .elem-traliccio { top: 98%; left: 96%; }

    @media (max-width: 1100px) {
      .wire-element, .master-wire-track { display: none; }
    }

    /* CONTENITORE CENTRALE BEN DISTANZIATO DALLE ICONE LATERALI */
    .section-container { 
      padding: 80px 4%; 
      max-width: 1080px;
      margin: 0 auto; 
      position: relative; 
      z-index: 5;
    }
    .section-head { text-align: center; margin-bottom: 45px; }
    .section-head h3 { font-size: 2.2rem; font-weight: 800; margin-bottom: 10px; color: var(--text-heading); }
    .section-head p { color: var(--text-main); font-size: 1.05rem; }

    /* SERVIZI */
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
    .service-card { position: relative; background: var(--card-bg); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); height: 360px; transition: all 0.35s ease; cursor: pointer; }
    .service-card:hover { transform: translateY(-8px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); border-color: var(--logo-blue); }
    .service-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
    .service-card:hover .service-img { transform: scale(1.08); }
    .service-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.4) 55%, transparent 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 26px; color: white; }
    .service-tag { display: inline-block; background: var(--logo-red); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px; width: fit-content; }
    .service-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; color: white; line-height: 1.25; }
    .service-desc { opacity: 0; max-height: 0; transition: all 0.4s ease; font-size: 0.88rem; color: #E2E8F0; line-height: 1.4; }
    .service-card:hover .service-desc { opacity: 1; max-height: 160px; margin-top: 4px; }

    /* PERCHÉ SCEGLIERE EOS */
    .streamlined-box { background: white; border-radius: var(--radius); border: 1px solid var(--border); padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
    .features-inline-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; text-align: center; }
    .feature-item-num { font-family: var(--font-heading); font-size: 1.8rem; font-weight: 900; color: var(--logo-blue); margin-bottom: 4px; }

    /* FOTOWALL PULITO A MOSAICO */
    .fotowall-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 200px; gap: 18px; }
    @media (max-width: 900px) { .fotowall-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 170px; } }
    @media (max-width: 550px) { .fotowall-grid { grid-template-columns: 1fr; grid-auto-rows: 210px; } }

    .fotowall-item { 
      position: relative; 
      border-radius: 12px; 
      overflow: hidden; 
      border: 1px solid var(--border); 
      cursor: pointer; 
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); 
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .fotowall-item:hover { transform: scale(1.025) translateY(-4px); z-index: 10; box-shadow: 0 15px 30px rgba(0,0,0,0.12); border-color: var(--logo-blue); }
    .fotowall-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
    .fotowall-item:hover img { transform: scale(1.06); }
    .fotowall-item.tall { grid-row: span 2; }
    .fotowall-item.wide { grid-column: span 2; }
    @media (max-width: 550px) { .fotowall-item.tall, .fotowall-item.wide { grid-row: span 1; grid-column: span 1; } }

    /* LIGHTBOX */
    .gallery-lightbox-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); z-index: 3000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
    .gallery-lightbox-backdrop.open { opacity: 1 !important; pointer-events: auto !important; }
    .gallery-lightbox-card { position: relative; max-width: 950px; width: 90%; text-align: center; color: white; }
    .gallery-lightbox-img { max-width: 100%; max-height: 80vh; border-radius: 8px; object-fit: contain; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .lightbox-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.3); color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; transition: all 0.2s; user-select: none; z-index: 3100; }
    .lightbox-arrow:hover { background: var(--logo-red); }
    .lightbox-prev { left: -65px; }
    .lightbox-next { right: -65px; }
    @media (max-width: 768px) { .lightbox-prev { left: 10px; } .lightbox-next { right: 10px; } }

    /* LAVORA CON NOI */
    .careers-box { background: white; border-radius: var(--radius); padding: 40px; border: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr; gap: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
    @media (max-width: 868px) { .careers-box { grid-template-columns: 1fr; } }
    .careers-info h4 { font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; color: var(--text-heading); }
    .careers-info p { color: var(--text-main); font-size: 0.98rem; margin-bottom: 20px; }
    .careers-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .careers-list li { display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--text-heading); font-size: 0.92rem; }
    .careers-list li span { color: var(--logo-green); font-weight: bold; }

    /* CONTATTI */
    .contact-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; background: white; border-radius: var(--radius); padding: 40px; border: 1px solid var(--border); align-items: stretch; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
    @media (max-width: 868px) { .contact-wrapper { grid-template-columns: 1fr; } }
    .contact-item { display: flex; gap: 14px; margin-bottom: 18px; align-items: flex-start; }
    .contact-icon { background: rgba(0, 68, 189, 0.08); color: var(--logo-blue); width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; font-weight: bold; }
    .contact-detail label { font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-main); display: block; }
    .contact-detail p, .contact-detail a { font-size: 0.95rem; font-weight: 600; color: var(--text-heading); text-decoration: none; }

    .map-container { border-radius: 12px; overflow: hidden; border: 1px solid var(--border); height: 230px; margin-top: 15px; position: relative; }
    .map-iframe { width: 100%; height: 100%; border: none; }

    /* FORM STYLES */
    .form-style { display: flex; flex-direction: column; gap: 14px; text-align: left; }
    .form-style label { font-size: 0.75rem; font-weight: 700; color: var(--text-heading); text-transform: uppercase; }
    .form-style input, .form-style textarea { width: 100%; padding: 11px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.92rem; font-family: var(--font-body); }

    /* MODALI */
    .modal-backdrop { 
      position: fixed; inset: 0; background: rgba(26, 26, 26, 0.85); 
      backdrop-filter: blur(8px); z-index: 5000; display: flex; 
      align-items: center; justify-content: center; padding: 20px; 
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease; 
    }
    .modal-backdrop.open { opacity: 1 !important; pointer-events: auto !important; }
    
    .modal-card { background: white; border-radius: var(--radius); padding: 35px; max-width: 450px; width: 100%; text-align: center; position: relative; border-top: 6px solid var(--logo-red); }
    .modal-logo-view { background: white; border-radius: var(--radius); padding: 40px; max-width: 550px; width: 100%; text-align: center; position: relative; }
    .modal-logo-view img { max-width: 100%; max-height: 380px; object-fit: contain; }
    .close-modal { position: absolute; top: 12px; right: 16px; font-size: 1.8rem; border: none; background: none; cursor: pointer; color: var(--text-main); z-index: 5200; }

    /* BANNER COOKIE */
    .cookie-banner {
      position: fixed; bottom: 20px; left: 20px; right: 20px; max-width: 900px; margin: 0 auto;
      background: rgba(26, 26, 26, 0.96); backdrop-filter: blur(12px); color: white;
      padding: 20px 26px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 4000;
      display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
      transition: all 0.4s ease; transform: translateY(150%); opacity: 0;
    }
    .cookie-banner.show { transform: translateY(0); opacity: 1; }
    .cookie-text { font-size: 0.85rem; color: #E2E8F0; max-width: 620px; line-height: 1.5; }
    .cookie-btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-cookie-accept { background: var(--logo-blue); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .btn-cookie-accept:hover { background: #003399; }
    .btn-cookie-decline { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 10px 16px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
    .btn-cookie-decline:hover { background: rgba(255,255,255,0.25); }

    /* FOOTER */
    footer { background: #1A1A1A; color: #A0AEC0; padding: 40px 5% 25px; border-top: 1px solid var(--border); position: relative; z-index: 5; }
    .footer-content { max-width: 1250px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; }
    .footer-bottom { max-width: 1250px; margin: 15px auto 0; text-align: center; font-size: 0.8rem; color: #718096; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .footer-logo { height: 45px; width: auto; object-fit: contain; margin-bottom: 10px; filter: brightness(0) invert(1); opacity: 0.9; }
    .hidden { display: none !important; }
  </style>
</head>
<body>

  <!-- HEADER STICKY -->
  <header class="site-header" id="header">
    <div class="brand-center" onclick="openLogoModal()" title="Clicca per ingrandire il logo">
      <img src="/logo.png" alt="Logo EOS Impianti s.n.c." class="brand-logo" id="header-logo" />
    </div>
    <nav class="site-nav">
      <a href="#hero-slider-section">Home</a>
      <a href="#servizi">Servizi</a>
      <a href="#perche-eos">Perché EOS</a>
      <a href="#fotogallery">Fotogallery</a>
      <a href="#calcolatore">Calcolatore Solare</a>
      <a href="#lavora-con-noi">Lavora con Noi</a>
      <a href="#contatti" class="btn-cta-nav">Contattaci</a>
    </nav>
  </header>

  <!-- ========================================================
       SLIDESHOW HERO A LARGHEZZA PIENA
       ======================================================== -->
  <div class="horizontal-scroll-container" id="hero-slider-section">
    <div class="horizontal-scroll-wrapper" id="hero-slider-track">
      
      <!-- Slide 1: MOTTO ENORME DISTRIBUITO IN LARGHEZZA -->
      <div class="hero-slide">
        <h1 class="hero-big-statement">
          Qual è <span class="electric-spark">l'energia giusta</span> per te?
        </h1>
      </div>

      <!-- Slide 2: RISPOSTA DIRETTA -->
      <div class="hero-slide">
        <div class="hero-slide-content">
          <h2>Progettiamo e realizziamo il modo migliore di <span class="electric-spark spark-red">produrre, utilizzare e gestire</span> la tua energia.</h2>
          <p>Dagli impianti elettrici alle energie rinnovabili, dalla sicurezza alla domotica, creiamo soluzioni integrate per abitazioni, aziende e industrie.</p>
          <div class="hero-buttons">
            <a href="#contatti" class="btn-primary">Richiedi un sopralluogo</a>
            <button onclick="openLeadModal()" class="btn-secondary">Calcola il tuo impianto fotovoltaico</button>
          </div>
        </div>
      </div>

      <!-- Slide 3: Chi Siamo (EOS Impianti) -->
      <div class="hero-slide">
        <div class="hero-slide-content">
          <span style="color:var(--logo-blue);font-weight:800;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px;">EOS Impianti</span>
          <h2>Energia e competenza al servizio dei tuoi <span class="electric-spark">progetti</span>.</h2>
          <p>Da oltre vent'anni progettiamo e realizziamo impianti tecnologici per privati, aziende, industrie ed enti pubblici. Fortemente radicati tra Alessandria e Genova, operiamo con successo su tutto il territorio nazionale.</p>
          <div class="hero-buttons">
            <a href="#servizi" class="btn-secondary">Scopri i nostri servizi</a>
          </div>
        </div>
      </div>

      <!-- Slide 4: La Nostra Filosofia -->
      <div class="hero-slide">
        <div class="hero-slide-content">
          <span style="color:var(--logo-red);font-weight:800;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px;">La nostra filosofia</span>
          <h2>Ogni progetto ha la sua <span class="electric-spark spark-red">energia</span>.</h2>
          <p>Non proponiamo soluzioni standard: analizziamo consumi e obiettivi per progettare impianti realmente adatti a chi li vive ogni giorno. Crediamo nelle tecnologie efficienti per ridurre i costi ed aumentare l'autonomia energetica.</p>
          <div class="hero-buttons">
            <a href="#perche-eos" class="btn-secondary">Perché scegliere EOS</a>
          </div>
        </div>
      </div>

      <!-- Slide 5: Rimando al Calcolatore Solare con Video Pexels in background -->
      <div class="hero-slide" style="padding:0;">
        <div class="slide-video-container">
          <video class="slide-video-bg" autoplay muted loop playsinline poster="/servizi/fotovoltaico.jpg">
            <source src="https://videos.pexels.com/video-files/4034091/4034091-uhd_2560_1440_30fps.mp4" type="video/mp4" />
          </video>
          <div class="slide-video-overlay"></div>
        </div>
        <div class="hero-slide-content slide-calc-content">
          <span style="color:#34D399;font-weight:800;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px;">Strumento Interattivo</span>
          <h2>Simula il tuo <span class="electric-spark">impianto fotovoltaico</span> su misura.</h2>
          <p>Inserisci i tuoi consumi reali F1/F2/F3 e scopri la potenza ideale in kWp, la capacità di accumulo e il tempo di rientro dell'investimento.</p>
          <div class="hero-buttons">
            <button onclick="openLeadModal()" class="btn-primary" style="font-size:1.05rem;padding:16px 34px;">⚡ Calcola subito il tuo impianto</button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ========================================================
       IL CAVO ELETTRICO CONTINUO A SERPENTINA (8 NODI INTEGRATI)
       ======================================================== -->
  <div class="master-wire-track" id="global-wire-track">
    
    <!-- 1. LAMPADINA (SEMPRE GIALLA E LUMINOSA) -->
    <div class="wire-element elem-lamp" id="node-lamp" data-src="/icons/lampadina.svg" title="Illuminazione & Domotica"></div>

    <!-- 2. INTERRUTTORE DIMMER -->
    <div class="wire-element elem-switch" id="node-switch" data-src="/icons/interruttore.svg" title="Protezione & Interruttori"></div>

    <!-- 3. QUADRO ELETTRICO -->
    <div class="wire-element elem-panel" id="node-panel" data-src="/icons/quadro.svg" title="Distribuzione Quadri"></div>

    <!-- 4. CONTATORE ELETTRONICO -->
    <div class="wire-element elem-meter" id="node-meter" data-src="/icons/contatore.svg" title="Contatore Smart Bidirezionale"></div>

    <!-- 5. INVERTER SOLARE -->
    <div class="wire-element elem-inverter" id="node-inverter" data-src="/icons/inverter.svg" title="Inverter Ibrido Solare"></div>

    <!-- 6. PANNELLO FOTOVOLTAICO (ALL'ALTEZZA DEL CALCOLATORE) -->
    <div class="wire-element elem-solar green" id="node-solar" data-src="/icons/pannello.svg" title="Pannelli Fotovoltaici"></div>

    <!-- 7. BATTERIA D'ACCUMULO BESS -->
    <div class="wire-element elem-battery green" id="node-battery" data-src="/icons/batteria.svg" title="Batteria d'Accumulo BESS"></div>

    <!-- 8. TRALICCIO RETE ELETTRICA (AL FONDO DELLA PAGINA) -->
    <div class="wire-element elem-traliccio" id="node-traliccio" data-src="/icons/traliccio.svg" title="Rete & Traliccio Nazionale"></div>

    <!-- TRACCIATO VETTORIALE PRECISO (CENTRA ESATTAMENTE OGNI ICONA DA 1 A 8) -->
    <svg class="wire-svg-canvas" viewBox="0 0 1000 5200" preserveAspectRatio="none">
      <path d="M 40,100 C 40,440 960,440 960,780 C 960,1140 40,1140 40,1500 C 40,1870 960,1870 960,2240 C 960,2630 40,2630 40,3020 C 40,3410 960,3410 960,3800 C 960,4130 40,4130 40,4470 C 40,4780 960,4780 960,5100" class="wire-tube-bg" />
      <path d="M 40,100 C 40,440 960,440 960,780 C 960,1140 40,1140 40,1500 C 40,1870 960,1870 960,2240 C 960,2630 40,2630 40,3020 C 40,3410 960,3410 960,3800 C 960,4130 40,4130 40,4470 C 40,4780 960,4780 960,5100" id="flowing-copper-wire" class="wire-copper-active" />
    </svg>
  </div>

  <!-- SERVIZI (IMMAGINI DA /public/servizi/) -->
  <section class="section-container" id="servizi">
    <div class="section-head">
      <h3>I Nostri <span class="electric-spark">Servizi Specializzati</span></h3>
      <p>Passa con il mouse sulle sezioni per scoprire i dettagli dei nostri interventi</p>
    </div>

    <div class="services-grid">
      <!-- 1. Domotica -->
      <div class="service-card gsap-card">
        <img src="/servizi/domotica.jpg" class="service-img" alt="Impianti elettrici civili e domotica" />
        <div class="service-overlay">
          <span class="service-tag">Civili & Domotica</span>
          <h4 class="service-title">Impianti Elettrici Civili e Domotica</h4>
          <p class="service-desc">Soluzioni sicure e affidabili per abitazioni, ville e condomini. Progettiamo sistemi integrati con domotica smart, illuminazione e gestione dei consumi.</p>
        </div>
      </div>

      <!-- 2. Industriale -->
      <div class="service-card gsap-card">
        <img src="/servizi/industriale.jpg" class="service-img" alt="Impianti elettrici industriali" />
        <div class="service-overlay">
          <span class="service-tag">Alta Potenza</span>
          <h4 class="service-title">Impianti Elettrici Industriali</h4>
          <p class="service-desc">Energia affidabile per aziende, capannoni e stabilimenti produttivi. Quadri di distribuzione e linee di potenza per garantire continuità operativa.</p>
        </div>
      </div>

      <!-- 3. Fotovoltaico -->
      <div class="service-card gsap-card">
        <img src="/servizi/fotovoltaico.jpg" class="service-img" alt="Fotovoltaico e sistemi di accumulo" />
        <div class="service-overlay">
          <span class="service-tag">Rinnovabili</span>
          <h4 class="service-title">Impianti Fotovoltaici su Misura</h4>
          <p class="service-desc">Produci la tua energia e dipendi meno dai costi energetici. Ci occupiamo di analisi, pratiche, installazione, accumulo e colonnine di ricarica.</p>
        </div>
      </div>

      <!-- 4. Antifurto -->
      <div class="service-card gsap-card">
        <img src="/servizi/antifurto.jpg" class="service-img" alt="Sistemi di sicurezza e allarmi" />
        <div class="service-overlay">
          <span class="service-tag">Sicurezza</span>
          <h4 class="service-title">Sistemi di Sicurezza e Allarmi</h4>
          <p class="service-desc">Proteggere ciò che conta. Installiamo antifurto, videosorveglianza IP e impianti antincendio valutando il livello di protezione richiesto.</p>
        </div>
      </div>

      <!-- 5. Climatizzazione -->
      <div class="service-card gsap-card">
        <img src="/servizi/climatizzazione.jpg" class="service-img" alt="Impianti di Condizionamento e Climatizzazione" />
        <div class="service-overlay">
          <span class="service-tag">Tecnologia & Comfort</span>
          <h4 class="service-title">Impianti di Condizionamento, Illuminazione e Reti Dati</h4>
          <p class="service-desc">Sistemi di climatizzazione ed impianti di condizionamento ad alta efficienza con split a parete e unità esterne, illuminazione moderna e cablaggi strutturati.</p>
        </div>
      </div>

      <!-- 6. Idroelettrico & Rinnovabili -->
      <div class="service-card gsap-card">
        <img src="/servizi/idroelettrico.jpg" class="service-img" alt="Energie rinnovabili idroelettrico ed eolico" />
        <div class="service-overlay">
          <span class="service-tag">Green Future</span>
          <h4 class="service-title">Energie Rinnovabili: Idroelettrico ed Eolico</h4>
          <p class="service-desc">Sviluppo e progettazione di sistemi alimentati da fonti rinnovabili come micro-idroelettrico e minieolico per un'autonomia sostenibile.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- PERCHÉ SCEGLIERE EOS -->
  <section class="section-container" id="perche-eos">
    <div class="streamlined-box gsap-reveal">
      <div class="section-head" style="margin-bottom:30px;">
        <h3>Perché Scegliere <span class="electric-spark">EOS Impianti</span></h3>
        <p>Un unico referente per trasformare le tue esigenze in soluzioni affidabili e durature</p>
      </div>

      <div class="features-inline-grid">
        <div>
          <div class="feature-item-num">20+</div>
          <strong style="color:var(--text-heading);display:block;margin-bottom:4px;">Anni di esperienza</strong>
          <span style="font-size:0.85rem;">Competenza consolidata nel settore civile e industriale.</span>
        </div>
        <div>
          <div class="feature-item-num">100%</div>
          <strong style="color:var(--text-heading);display:block;margin-bottom:4px;">Su Misura</strong>
          <span style="font-size:0.85rem;">Progetti nati dall'analisi dei consumi reali.</span>
        </div>
        <div>
          <div class="feature-item-num">1</div>
          <strong style="color:var(--text-heading);display:block;margin-bottom:4px;">Unico Referente</strong>
          <span style="font-size:0.85rem;">Dalla prima consulenza alla manutenzione nel tempo.</span>
        </div>
        <div>
          <div class="feature-item-num">📍</div>
          <strong style="color:var(--text-heading);display:block;margin-bottom:4px;">Radicamento & Operatività</strong>
          <span style="font-size:0.85rem;">Solido radicamento tra Alessandria e Genova, e non solo con operatività su tutto il territorio.</span>
        </div>
      </div>
    </div>
  </section>

  <!-- FOTOWALL PULITO A MOSAICO -->
  <section class="section-container" id="fotogallery">
    <div class="section-head">
      <h3>I Nostri <span class="electric-spark">Lavori Realizzati</span></h3>
      <p>Clicca su un'immagine per ingrandire la galleria ad alta risoluzione</p>
    </div>

    <div class="fotowall-grid">
      <div class="fotowall-item wide gsap-card" onclick="openGalleryLightbox(0)">
        <img src="/lavori/lavoro1.jpeg" alt="Lavoro 1" onerror="this.src='/lavori/lavoro1.jpg'" />
      </div>

      <div class="fotowall-item tall gsap-card" onclick="openGalleryLightbox(1)">
        <img src="/lavori/lavoro2.jpeg" alt="Lavoro 2" onerror="this.src='/lavori/lavoro2.jpg'" />
      </div>

      <div class="fotowall-item gsap-card" onclick="openGalleryLightbox(2)">
        <img src="/lavori/lavoro3.jpeg" alt="Lavoro 3" onerror="this.src='/lavori/lavoro3.jpg'" />
      </div>

      <div class="fotowall-item gsap-card" onclick="openGalleryLightbox(3)">
        <img src="/lavori/lavoro4.jpeg" alt="Lavoro 4" onerror="this.src='/lavori/lavoro4.jpg'" />
      </div>

      <div class="fotowall-item wide gsap-card" onclick="openGalleryLightbox(4)">
        <img src="/lavori/lavoro5.jpeg" alt="Lavoro 5" onerror="this.src='/lavori/lavoro5.jpg'" />
      </div>
    </div>
  </section>

  <!-- LIGHTBOX FOTOGALLERY -->
  <div class="gallery-lightbox-backdrop" id="gallery-lightbox" onclick="closeGalleryLightbox()">
    <button class="close-modal" onclick="closeGalleryLightbox()">&times;</button>
    <div class="lightbox-arrow lightbox-prev" onclick="event.stopPropagation(); changeLightboxImage(-1)">❮</div>
    <div class="lightbox-arrow lightbox-next" onclick="event.stopPropagation(); changeLightboxImage(1)">❯</div>
    <div class="gallery-lightbox-card" onclick="event.stopPropagation()">
      <img id="lightbox-current-img" class="gallery-lightbox-img" src="" alt="Galleria Foto" />
    </div>
  </div>

  <!-- COMPONENTE AUTONOMO CALCOLATORE SOLARE -->
  <section class="section-container" id="calcolatore">
    <Calcolatore />
  </section>

  <!-- LAVORA CON NOI -->
  <section class="section-container" id="lavora-con-noi">
    <div class="careers-box gsap-reveal">
      <div class="careers-info">
        <span class="badge-hero" style="background:rgba(0, 68, 189, 0.08);color:var(--logo-blue);border-color:rgba(0, 68, 189, 0.2);padding:4px 12px;border-radius:99px;font-size:0.75rem;font-weight:700;display:inline-block;margin-bottom:12px;">Unisciti al Nostro Team</span>
        <h4>Lavora con Noi</h4>
        <p>Siamo alla ricerca di <strong>Tecnici Elettricisti Specializzati</strong> da inserire nel nostro organico per la realizzazione di impianti civili, industriali e fotovoltaici.</p>
        <ul class="careers-list">
          <li><span>✓</span> Requisiti: Abilitazione tecnica / Esperienza nel settore</li>
          <li><span>✓</span> Lettura schemi elettrici e cablaggi quadri</li>
          <li><span>✓</span> Patente B e predisposizione al lavoro di squadra</li>
          <li><span>✓</span> <strong>Sede di lavoro principale:</strong> Provincia di Alessandria / Genova</li>
        </ul>
      </div>

      <div>
        <form name="candidatura-tecnici" method="POST" data-netlify="true" enctype="multipart/form-data" class="form-style">
          <div>
            <label>Nome e Cognome *</label>
            <input type="text" name="nome" required placeholder="Il tuo nome">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label>Email *</label>
              <input type="email" name="email" required placeholder="email@dominio.it">
            </div>
            <div>
              <label>Telefono *</label>
              <input type="tel" name="telefono" required placeholder="333 1234567">
            </div>
          </div>
          <div>
            <label>Carica il tuo Curriculum (PDF / DOC) *</label>
            <input type="file" name="curriculum" accept=".pdf,.doc,.docx" required>
          </div>
          <div>
            <label>Breve Lettera di Presentazione</label>
            <textarea name="lettera" rows="3" placeholder="Raccontaci brevemente la tua esperienza lavorativa..."></textarea>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;">Invia Candidatura</button>
        </form>
      </div>
    </div>
  </section>

  <!-- CONTATTI UFFICIALI -->
  <section class="section-container" id="contatti">
    <div class="section-head">
      <h3>Hai un progetto in mente?</h3>
      <p>Raccontaci le tue esigenze. EOS Impianti è al tuo fianco per ogni soluzione elettrica e tecnologica.</p>
    </div>

    <div class="contact-wrapper gsap-reveal">
      <div>
        <h4 style="font-size:1.4rem;font-weight:800;margin-bottom:20px;">Informazioni di Contatto</h4>
        
        <div class="contact-item">
          <div class="contact-icon">📍</div>
          <div class="contact-detail">
            <label>Sede Operativa & Legale</label>
            <p>EOS IMPIANTI s.n.c.<br>Loc. Fornace 2, 15060 Vignole Borbera (AL)</p>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-icon">📞</div>
          <div class="contact-detail">
            <label>Telefono</label>
            <a href="tel:+390143677895">+39 0143 677895</a>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-icon">✉️</div>
          <div class="contact-detail">
            <label>Email Ufficiale</label>
            <a href="mailto:info@eosimpianti.it">info@eosimpianti.it</a>
          </div>
        </div>

        <div class="map-container">
          <iframe 
            class="map-iframe"
            src="https://maps.google.com/maps?q=Loc.+Fornace+2,+15060+Vignole+Borbera+AL&t=&z=14&ie=UTF8&iwloc=&output=embed" 
            loading="lazy" 
            title="Mappa EOS Impianti Snc">
          </iframe>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;justify-content:space-between;">
        <h4 style="font-size:1.4rem;font-weight:800;margin-bottom:20px;">Richiedi una Consulenza</h4>
        <form name="contatti-ufficiali" method="POST" data-netlify="true" class="form-style" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <label>Nome e Cognome *</label>
            <input type="text" name="nome" required placeholder="Il tuo nome">
          </div>
          <div>
            <label>Email *</label>
            <input type="email" name="email" required placeholder="la-tua-email@dominio.it">
          </div>
          <div>
            <label>Messaggio</label>
            <textarea name="messaggio" rows="4" placeholder="Descrivi il tuo progetto o la tua richiesta..."></textarea>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;margin-top:10px;">Invia Richiesta</button>
        </form>
      </div>
    </div>
  </section>

  <!-- MODALE LEAD CALCOLATORE NETLIFY FORM -->
  <div class="modal-backdrop" id="lead-modal">
    <div class="modal-card">
      <button class="close-modal" onclick="closeLeadModal()">&times;</button>
      <h4>Accedi al Calcolatore Fotovoltaico</h4>
      <p>Inserisci la tua email per sbloccare la simulazione completa.</p>
      
      <form id="lead-form-gate" name="lead-calcolatore-fotovoltaico" method="POST" data-netlify="true" class="form-style" onsubmit="handleLeadSubmit(event)">
        <input type="hidden" name="form-name" value="lead-calcolatore-fotovoltaico" />
        <div>
          <label>Indirizzo Email *</label>
          <input type="email" id="user-email-input" name="email" required placeholder="esempio@email.it">
        </div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:10px;">
          Sblocca Calcolatore ➔
        </button>
      </form>
    </div>
  </div>

  <!-- MODALE LOGO -->
  <div class="modal-backdrop" id="logo-modal" onclick="closeLogoModal()">
    <div class="modal-logo-view" onclick="event.stopPropagation()">
      <button class="close-modal" onclick="closeLogoModal()">&times;</button>
      <img src="/logo.png" alt="Logo EOS Impianti s.n.c." />
    </div>
  </div>

  <!-- BANNER COOKIE -->
  <div class="cookie-banner" id="cookie-banner">
    <div class="cookie-text">
      Questo sito utilizza cookie tecnici e analitici necessari al funzionamento delle funzionalità avanzate (come il calcolatore solare). Proseguendo la navigazione o cliccando su "Accetta Tutti", acconsenti all'uso dei cookie.
    </div>
    <div class="cookie-btns">
      <button class="btn-cookie-decline" onclick="acceptCookies(false)">Solo Tecnici</button>
      <button class="btn-cookie-accept" onclick="acceptCookies(true)">Accetta Tutti</button>
    </div>
  </div>

  <!-- FOOTER -->
  <footer>
    <div class="footer-content">
      <div>
        <img src="/logo.png" alt="EOS Impianti Logo" class="footer-logo" onerror="this.style.display='none'" />
        <h5 style="color:white;font-size:1.1rem;font-weight:800;font-family:var(--font-heading);">EOS IMPIANTI s.n.c.</h5>
        <p>Progettazione e installazione impianti elettrici e fotovoltaici</p>
      </div>
      <div>
        <p>Loc. Fornace 2, 15060 Vignole Borbera (AL) · P.IVA: 02164950061</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 EOS IMPIANTI s.n.c. Tutti i diritti riservati.</p>
      <p style="font-size:0.75rem;"><a href="#contatti" style="color:#A0AEC0;text-decoration:underline;">Privacy Policy</a> · <a href="#contatti" style="color:#A0AEC0;text-decoration:underline;">Cookie Policy</a></p>
    </div>
  </footer>

  <!-- GSAP & SCRIPT ENGINE INTEGRATO -->
  <script is:inline>
    window.addEventListener('scroll', function() {
      const header = document.getElementById('header');
      if (window.scrollY > 50) { header.classList.add('scrolled'); } 
      else { header.classList.remove('scrolled'); }
    });

    // INIEZIONE AUTOMATICA DEI FILE SVG DA /public/icons/
    async function loadInlineSVGs() {
      const elements = document.querySelectorAll('.wire-element[data-src]');
      for (const el of elements) {
        const src = el.getAttribute('data-src');
        try {
          const res = await fetch(src);
          if (res.ok) {
            const svgText = await res.text();
            el.innerHTML = svgText;
          }
        } catch (e) {
          console.warn('Errore caricamento icona SVG:', src);
        }
      }
    }

    document.addEventListener('DOMContentLoaded', async function() {
      await loadInlineSVGs();

      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // 1. SLIDESHOW ORIZZONTALE IN HERO SU SCROLL VERTICALE
        const sliderTrack = document.getElementById('hero-slider-track');
        if (sliderTrack && window.innerWidth > 768) {
          gsap.to(sliderTrack, {
            xPercent: -80,
            ease: "none",
            scrollTrigger: {
              trigger: "#hero-slider-section",
              pin: true,
              scrub: 0.6,
              start: "top top",
              end: "+=2200",
              anticipatePin: 1
            }
          });
        }

        // 2. FLUSSO ELETTRICO CONTINUO DEL CAVO SOTTILE
        const copperWire = document.getElementById('flowing-copper-wire');
        if (copperWire) {
          const wireLength = copperWire.getTotalLength ? copperWire.getTotalLength() : 12000;
          gsap.set(copperWire, { strokeDasharray: wireLength, strokeDashoffset: wireLength });

          gsap.to(copperWire, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: "#global-wire-track",
              start: "top 80%",
              end: "bottom bottom",
              scrub: 0.4
            }
          });
        }

        // 3. ACCENSIONE PROGRESSIVA DEGLI 8 NODI HARDWARE
        const nodes = [
          { id: '#node-switch', threshold: 'top 65%' },
          { id: '#node-panel', threshold: 'top 65%' },
          { id: '#node-meter', threshold: 'top 65%' },
          { id: '#node-inverter', threshold: 'top 65%' },
          { id: '#node-solar', threshold: 'top 65%' },
          { id: '#node-battery', threshold: 'top 65%' },
          { id: '#node-traliccio', threshold: 'top 65%' }
        ];

        nodes.forEach(n => {
          const el = document.querySelector(n.id);
          if (el) {
            ScrollTrigger.create({
              trigger: el,
              start: n.threshold,
              onEnter: () => el.classList.add('active-element'),
              onLeaveBack: () => el.classList.remove('active-element')
            });
          }
        });

        // 4. IMPULSO DI LUCE SUL TESTO
        const sparkTexts = document.querySelectorAll('.electric-spark');
        sparkTexts.forEach((el) => {
          ScrollTrigger.create({
            trigger: el,
            start: "top 85%",
            onEnter: () => {
              el.classList.remove('active');
              void el.offsetWidth;
              el.classList.add('active');
            }
          });
        });

        // 5. INGRESSO SCHEDE SERVIZI
        gsap.utils.toArray('.gsap-card').forEach((card, index) => {
          gsap.from(card, {
            y: 35,
            opacity: 0,
            duration: 0.7,
            delay: (index % 3) * 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none none"
            }
          });
        });

        ScrollTrigger.refresh();
      }

      // COOKIE BANNER
      const consent = localStorage.getItem('eos_cookie_consent');
      if (!consent) {
        setTimeout(() => {
          const banner = document.getElementById('cookie-banner');
          if (banner) banner.classList.add('show');
        }, 1000);
      }
    });

    window.acceptCookies = function(all) {
      localStorage.setItem('eos_cookie_consent', all ? 'accepted_all' : 'accepted_necessary');
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.classList.remove('show');
    };

    // MODALI
    window.openLeadModal = function() {
      const modal = document.getElementById('lead-modal');
      if (modal) modal.classList.add('open');
    };

    window.closeLeadModal = function() {
      const modal = document.getElementById('lead-modal');
      if (modal) modal.classList.remove('open');
    };

    window.openLogoModal = function() {
      const modal = document.getElementById('logo-modal');
      if (modal) modal.classList.add('open');
    };

    window.closeLogoModal = function() {
      const modal = document.getElementById('logo-modal');
      if (modal) modal.classList.remove('open');
    };

    // GESTIONE SBLOCCO CALCOLATORE CON FORM NETLIFY
    window.handleLeadSubmit = function(event) {
      event.preventDefault();
      const emailInput = document.getElementById('user-email-input');
      
      if(!emailInput.value || !emailInput.value.includes('@')) { 
        alert('Inserisci un indirizzo email valido.'); 
        return; 
      }

      const form = event.target;
      const formData = new FormData(form);

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString()
      })
      .then(() => {
        window.closeLeadModal();
        const dash = document.getElementById('calc-dashboard'); 
        if (dash) {
          dash.classList.add('active'); 
          dash.scrollIntoView({ behavior: 'smooth' });
        }
        if(typeof runAllEOSolar === 'function') runAllEOSolar();
      })
      .catch((error) => {
        console.error("Errore invio lead:", error);
        window.closeLeadModal();
        const dash = document.getElementById('calc-dashboard'); 
        if (dash) {
          dash.classList.add('active'); 
          dash.scrollIntoView({ behavior: 'smooth' });
        }
        if(typeof runAllEOSolar === 'function') runAllEOSolar();
      });
    };

    const galleryItems = [
      { src: '/lavori/lavoro1.jpeg' },
      { src: '/lavori/lavoro2.jpeg' },
      { src: '/lavori/lavoro3.jpeg' },
      { src: '/lavori/lavoro4.jpeg' },
      { src: '/lavori/lavoro5.jpeg' }
    ];

    let currentGalleryIndex = 0;
    window.openGalleryLightbox = function(index) { currentGalleryIndex = index; updateLightboxContent(); document.getElementById('gallery-lightbox').classList.add('open'); };
    window.closeGalleryLightbox = function() { document.getElementById('gallery-lightbox').classList.remove('open'); };
    window.changeLightboxImage = function(direction) {
      currentGalleryIndex += direction;
      if (currentGalleryIndex < 0) currentGalleryIndex = galleryItems.length - 1;
      if (currentGalleryIndex >= galleryItems.length) currentGalleryIndex = 0;
      updateLightboxContent();
    };
    function updateLightboxContent() {
      const item = galleryItems[currentGalleryIndex];
      const imgEl = document.getElementById('lightbox-current-img');
      if (imgEl) {
        imgEl.src = item.src;
        imgEl.onerror = function() { this.src = item.src.replace('.jpeg', '.jpg'); };
      }
    }
  </script>
</body>
</html>
```
