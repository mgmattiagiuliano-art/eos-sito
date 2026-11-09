# Audit del simulatore fotovoltaico EOSolar

> Sessione di audit **in sola lettura** del 09/11/2026. Nessun file di codice modificato: l'unico file creato è questo report.
> Tutti i numeri sono stati calcolati e poi verificati eseguendo il codice originale (vedi §3.4).

---

## 0. Dove vive oggi il calcolatore

| Cosa ho cercato | Esito |
|---|---|
| `src/components/Calcolatore.astro` | **Non esiste come file.** Il repository non ha `src/`, `package.json` né test. |
| `src/lib/eosolar/` | **Non esiste.** Il motore non è ancora stato estratto. |
| `docs/PROGRESS.md`, `PROMPT_AVVIO.md` | Non esistono (`handoff.md:3` cita `PROMPT_AVVIO.md`, che però non è nel repo). |
| Codice del prototipo | **Solo dentro `docs/handoff.md`**, Parte 2: "File 1: `src/components/Calcolatore.astro`" (righe 76–670) e il gate lead dentro "File 2: `src/pages/index.astro`" (righe 1533–1548 e 1749–1785). |

Esiste quindi **una sola versione**, il prototipo. È quella che analizzo. Non c'è una seconda implementazione con cui confrontarla.

**Convenzione dei riferimenti.** Indico le righe di `docs/handoff.md`. Per avere la riga nel futuro file `Calcolatore.astro` basta sottrarre 76 (la riga 77 di handoff è la riga 1 del componente). Esempio: `handoff.md:512` corrisponde a `Calcolatore.astro:436`.

Tutto il motore sta in uno `<script is:inline>` (righe 364–669), con funzioni globali su `window`. Non c'è TypeScript e non ci sono test. Questo viola il principio 2 di `CLAUDE.md` ("il calcolatore è logica pura e testata").

---

## 1. Mappa del modello (flusso nell'ordine di esecuzione)

| # | Passaggio | Funzione | Righe `handoff.md` |
|---|---|---|---|
| 1 | Valori di default: consumi F1 mensili, ore equivalenti, curve CAPEX, parametri finanziari | costanti globali | 365–384 |
| 2 | Costruzione degli input UI: 12 caselle F1, 12 caselle ore, tabelle dei costi in sola lettura, 5 parametri editabili | `initInputGrids`, `initScaglioniTables`, `initParamsGrid` | 388–393, 403–412, 430–453 |
| 3 | Riepilogo F1 / F2+F3 (solo display) | `updateF2F3Calculated` | 414–428 |
| 4 | Sblocco: invio email → apertura dashboard → `runAllEOSolar()` | `handleLeadSubmit` (index.astro) | 1749–1785 |
| 5 | Lettura degli input: i 5 parametri dal DOM, gli altri 8 da `defaultParams` | `getInputs` | 476–500 |
| 6 | Ottimizzatore: griglia 29 × 7 = 203 combinazioni kWp × kWh | `runAllEOSolar` | 549–559 |
| 7 | Per ogni combinazione: CAPEX (interpolazione) | `getInterpolatedCostFV/BESS`, `calculateJointFinancials` | 455–474, 503–505 |
| 8 | Bilancio energetico mensile (12 iterazioni) | `calculateJointFinancials` | 506–523 |
| 9 | Ricavo dell'anno 1 | idem | 525 |
| 10 | Flussi di cassa annuali 1–25, attualizzazione | idem | 526–532 |
| 11 | NPV, payback attualizzato, SCR, SSR | idem | 534–546 |
| 12 | Filtro dei vincoli e scelta dell'ottimo (max NPV/CAPEX) | `runAllEOSolar` | 557–559 |
| 13 | Testo hero e metriche | `runAllEOSolar`, `renderLevel2Metrics` | 561–568, 578–587 |
| 14 | Sensitività: tariffa di acquisto × 0,8 / 1,0 / 1,2 | `renderSensitivityTable` | 589–598 |
| 15 | Grafici: barre mensili, curva NPV, cassa cumulata | `renderBarChart`, `renderNpvCurveChart`, `renderCashflowChart` | 618–668 |
| 16 | Simulazione libera da slider (stessa funzione di calcolo) | `runManualeEOSolar` | 600–609 (slider 327–336) |

---

## 2. Formule esplicite

### Notazione

| Simbolo | Significato | Unità | Default (riga) |
|---|---|---|---|
| m = 1…12 | mese | – | |
| n = 1…25 | anno | – | |
| k | potenza FV | kWp | |
| B | capacità batteria (nominale, vedi §7 #9) | kWh | |
| h_m | ore equivalenti del mese | kWh/kWp | 367 (somma 1.365) |
| F1_m | consumo in F1 inserito dall'utente | kWh | 366 (somma 2.420) |
| C_tot | consumo annuo totale | kWh/anno | 219 (3.800) |
| φ | flessibilità DSM | – | 225 (0,15) |
| DoD, η | profondità di scarica, rendimento round-trip | – | 382 (0,90; 0,88) |
| p_a, p_v | tariffa di acquisto, di vendita | €/kWh | 381 (0,25; 0,10) |
| i | inflazione energetica | /anno | 381 (0,02) |
| d | degrado FV | /anno | 381 (0,005) |
| r | tasso di sconto | /anno | 383 (0,06) |
| o | O&M | quota del CAPEX/anno | 382 (0,015) |

### 2.1 Consumi (righe 506–507, 513–514)

$$F1_{tot}=\sum_m F1_m,\qquad F23_{tot}=\max(0,\;C_{tot}-F1_{tot})$$

$$C^{F1}_m = F1_m + \varphi\,\frac{F23_{tot}}{12},\qquad C^{F23}_m=(1-\varphi)\,\frac{F23_{tot}}{12}\quad[\text{kWh}]$$

La DSM sposta una quota φ di F2+F3, ripartita uniformemente sui mesi, dentro F1. F2+F3 è identico in tutti i 12 mesi.

### 2.2 Produzione (riga 512)

$$P_m = k\cdot h_m\quad[\text{kWh}]$$

Non c'è un performance ratio separato: le h_m devono già essere al netto delle perdite.

### 2.3 Bilancio mensile (righe 515–519)

$$A_m=\min(P_m,\,C^{F1}_m)\qquad\text{(autoconsumo diretto)}$$
$$X_m=\max(0,\,P_m-C^{F1}_m)\qquad\text{(esubero "diurno")}$$
$$Ch_m=30{,}4\cdot\min\!\Big(\tfrac{X_m}{30{,}4},\;B\cdot DoD\Big)\qquad\text{(carica: al massimo un ciclo pieno al giorno)}$$
$$Dis_m=\min(\eta\cdot Ch_m,\;C^{F23}_m)\qquad\text{(scarica)}$$
$$E_m=X_m-Ch_m\qquad\text{(immissione)}$$

L'energia $Ch_m-Dis_m$ esce dal bilancio. Comprende la vera perdita di rendimento, $Dis_m(1/\eta-1)$, e l'energia caricata ma mai usata (vedi §7 #10).

### 2.4 Indicatori energetici (righe 542–544)

$$SCR=\frac{\sum_m (A_m+Dis_m)}{\sum_m P_m},\qquad SSR=\frac{\sum_m (A_m+Dis_m)}{C_{tot}}$$

In UI la SCR è etichettata "Autoconsumo **Diretto**" (riga 585), ma comprende la scarica della batteria.

### 2.5 CAPEX (righe 455–474, 503–505)

Interpolazione lineare del **costo unitario** tra i nodi $(k_j, c_j)$, poi moltiplicazione per la taglia:

$$c_{FV}(k)=c_j+\frac{c_{j+1}-c_j}{k_{j+1}-k_j}(k-k_j),\qquad CAPEX_{FV}=k\cdot c_{FV}(k)$$

Fuori dai nodi il valore resta costante: 2.000 €/kWp sotto 1 kWp, 1.350 €/kWp sopra 20 kWp. Per la batteria vale lo stesso: 700 €/kWh per B ≤ 2,5, 400 €/kWh per B ≥ 15, 0 per B = 0.

$$CAPEX = CAPEX_{FV}+B\cdot c_{BESS}(B)$$

### 2.6 Ricavo e costi (righe 525–530)

$$R_1=p_a\sum_m(A_m+Dis_m)+p_v\sum_m E_m$$
$$R_n=R_1\,(1+i)^{n-1}(1-d)^{n-1}$$
$$OM_n=o\cdot CAPEX\cdot(1+i)^{n-1}$$

**Sostituzione dell'inverter, sostituzione della batteria e degrado della batteria: assenti.** I parametri sono definiti (righe 382–383, 489–496) ma non vengono mai letti (vedi §4.8).

### 2.7 Flussi, NPV, payback (righe 527–540)

$$F_n=R_n-OM_n,\qquad D_n=\frac{F_n}{(1+r)^n},\qquad NPV=-CAPEX+\sum_{n=1}^{25}D_n$$

Payback attualizzato: si cerca il primo anno $n^*$ in cui $S_{n^*}=-CAPEX+\sum_{j\le n^*}D_j\ge 0$, poi

$$PB=(n^*-1)+\frac{-S_{n^*-1}}{D_{n^*}}$$

Se il cumulato non diventa mai positivo, PB vale 25 (riga 536). IRR e MIRR non sono calcolati.

### 2.8 Ottimizzatore (righe 552–559)

Griglia: $k\in\{1;1{,}5;\dots;15\}$, $B\in\{0;2{,}5;\dots;15\}$ (203 punti). Vincoli:

$$\sum_m P_m\le 1{,}4\,C_{tot},\qquad SCR\ge 40\%$$

Se nessuna combinazione rispetta i vincoli, si torna a tutta la griglia (riga 558). Criterio:

$$\text{ottimo}=\arg\max\ \frac{NPV}{CAPEX}\qquad(\text{profitability index} - 1)$$

### 2.9 Sensitività (righe 593–596)

Si ricalcola la sola configurazione ottima con $p_a\times\{0{,}8;\,1{,}0;\,1{,}2\}$. Nessun'altra variabile cambia.

---

## 3. Caso di riferimento: 3 kWp + 5 kWh, default, flessibilità 15%

### 3.1 Dati di partenza

- $F1_{tot}=2.420$ kWh. $F23_{tot}=3.800-2.420=1.380$ kWh, cioè 115 kWh/mese.
- $C^{F1}_m=F1_m+0{,}15\cdot115=F1_m+17{,}25$. $C^{F23}_m=0{,}85\cdot115=97{,}75$ kWh.
- CAPEX: 3 kWp e 5 kWh sono nodi esatti, quindi $3\times1.800=5.400$ € e $5\times550=2.750$ €. **Totale 8.150 €.**
- Capacità di carica giornaliera: $5\times0{,}9=4{,}5$ kWh, cioè $136{,}8$ kWh/mese ($\times30{,}4$).

### 3.2 Bilancio mensile (kWh)

| Mese | h | P | C_F1* | C_F23* | A (diretto) | X (esubero) | Ch | Dis | Ch−Dis | E (immesso) | P−(A+Ch+E) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Gen | 65 | 195,00 | 237,25 | 97,75 | 195,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0 |
| Feb | 80 | 240,00 | 217,25 | 97,75 | 217,25 | 22,75 | 22,75 | 20,02 | 2,73 | 0,00 | 0 |
| Mar | 115 | 345,00 | 207,25 | 97,75 | 207,25 | 137,75 | 136,80 | 97,75 | 39,05 | 0,95 | 0 |
| Apr | 135 | 405,00 | 197,25 | 97,75 | 197,25 | 207,75 | 136,80 | 97,75 | 39,05 | 70,95 | 0 |
| Mag | 150 | 450,00 | 187,25 | 97,75 | 187,25 | 262,75 | 136,80 | 97,75 | 39,05 | 125,95 | 0 |
| Giu | 160 | 480,00 | 207,25 | 97,75 | 207,25 | 272,75 | 136,80 | 97,75 | 39,05 | 135,95 | 0 |
| Lug | 165 | 495,00 | 247,25 | 97,75 | 247,25 | 247,75 | 136,80 | 97,75 | 39,05 | 110,95 | 0 |
| Ago | 155 | 465,00 | 227,25 | 97,75 | 227,25 | 237,75 | 136,80 | 97,75 | 39,05 | 100,95 | 0 |
| Set | 125 | 375,00 | 207,25 | 97,75 | 207,25 | 167,75 | 136,80 | 97,75 | 39,05 | 30,95 | 0 |
| Ott | 95 | 285,00 | 217,25 | 97,75 | 217,25 | 67,75 | 67,75 | 59,62 | 8,13 | 0,00 | 0 |
| Nov | 65 | 195,00 | 227,25 | 97,75 | 195,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0 |
| Dic | 55 | 165,00 | 247,25 | 97,75 | 165,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0 |
| **Anno** | **1.365** | **4.095,00** | 2.627,00 | 1.173,00 | **2.470,25** | 1.624,75 | **1.048,10** | **763,89** | 284,21 | **576,65** | **0** |

Ch−Dis = 284,21 kWh. Di questi, 104,17 kWh sono vera perdita di rendimento ($763{,}89/0{,}88-763{,}89$). Gli altri **180,04 kWh** sono energia caricata che la batteria non può restituire, perché da marzo a settembre la scarica è limitata da $C^{F23}=97{,}75$ kWh/mese, cioè 3,2 kWh/giorno contro 4,5 kWh di carica al giorno. Il modello la tratta come persa invece che immessa (vedi §7 #10).

- SCR $=(2.470{,}25+763{,}89)/4.095=$ **79,0%**. SSR $=3.234{,}14/3.800=$ **85,1%**.
- $R_1=3.234{,}14\times0{,}25+576{,}65\times0{,}10=808{,}54+57{,}67=$ **866,20 €**.
- $OM_1=8.150\times0{,}015=$ **122,25 €**.

### 3.3 Flussi annuali (€)

| Anno n | $R_n$ | $OM_n$ | $F_n$ | $(1+r)^n$ | $D_n$ | Cumulato attualizzato |
|---|---|---|---|---|---|---|
| 0 | – | – | −8.150,00 | 1 | −8.150,00 | −8.150,00 |
| 1 | 866,20 | 122,25 | 743,95 | 1,0600 | 701,84 | −7.448,16 |
| 2 | 879,11 | 124,70 | 754,41 | 1,1236 | 671,42 | −6.776,74 |
| 12 | 1.019,23 | 152,00 | 867,23 | 2,0122 | 430,99 | −1.472,32 |
| 15 | 1.065,48 | 161,31 | 904,17 | 2,3966 | 377,28 | −288,36 |
| 16 | 1.081,35 | 164,53 | 916,82 | 2,5404 | 360,90 | +72,54 |
| 25 | 1.235,31 | 196,63 | 1.038,68 | 4,2919 | 242,01 | **+2.691,20** |

Payback: il cumulato passa lo zero nell'anno 16, quindi $PB = 15 + 288{,}36/360{,}90 = $ **15,80 anni**.

### 3.4 Risultati e confronto con il codice reale

Metodo: ho estratto alla lettera le righe 365–547 di `handoff.md` e le ho eseguite in Node 22 con un `document` fittizio, in uno script temporaneo fuori dalla repo. Ho replicato `getInputs` con i default e l'ottimizzatore (righe 551–559). In parallelo ho scritto un'implementazione indipendente in Python che parte dalle formule del §2.

| Grandezza | Calcolo a mano / Python | Codice reale (JS) | Δ |
|---|---|---|---|
| CAPEX | 8.150 € | 8.150 € | 0 |
| Produzione annua | 4.095 kWh | 4.095 kWh | 0 |
| Scarica mensile | 0 / 20,02 / 97,75 ×7 / 59,62 / 0 / 0 | identica | 0 |
| Flussi attualizzati $D_1…D_{25}$ | 701,84 … 242,01 | identici | < 10⁻⁹ |
| NPV 25 anni | 2.691,20 € | 2.691,2012 € | 0 |
| Payback attualizzato | 15,80 anni | 15,799 anni | 0 |
| SCR / SSR | 79,0% / 85,1% | 78,98% / 85,11% | 0 |
| IRR (non mostrato in UI) | 9,05% | – | – |

**I numeri coincidono.** Il codice fa quello che le formule del §2 descrivono. I problemi stanno nelle ipotesi e in ciò che manca, non in errori aritmetici.

**Cosa vedrebbe davvero il cliente con i default.** L'ottimizzatore **non** sceglie 3 + 5. Raccomanda **1,5 kWp + 0 kWh**: CAPEX 2.925 €, NPV 3.741 €, payback 7,88 anni, SCR 96%, SSR 51,7%. Il cliente non vede mai la batteria (vedi §7 #2).

---

## 4. Controlli di coerenza

### 4.1 Conservazione dell'energia
$P_m = A_m + Ch_m + E_m$ è **verificata in tutti i 12 mesi**: scarto 0,00 (ultima colonna della tabella §3.2). Vale per costruzione, perché $E_m = X_m - Ch_m$ e $Ch_m\le X_m$. Il lato della batteria però non si chiude: 180 kWh/anno caricati non vengono né scaricati né immessi (§3.2).

### 4.2 Limiti della batteria
- $Dis_m\le\eta\,Ch_m$: **verificato** per costruzione (riga 518).
- $Dis_m\le C^{F23}_m$: **verificato**. Ho trovato 0 violazioni su 5 configurazioni (3+5 con φ = 0 / 0,15 / 0,30; 6+10; 3+15).
- Carica giornaliera ≤ $B\cdot DoD$: verificata **solo in media mensile**. Il vincolo è applicato all'esubero medio giornaliero ($X_m/30{,}4$), non giorno per giorno. Per la disuguaglianza di Jensen, $\min(\bar x, c)\ge\overline{\min(x,c)}$: il modello **sovrastima** la carica.
- La batteria non vede mai l'esubero dei mesi invernali. In gennaio, novembre e dicembre $P_m<C^{F1}_m$, quindi $X_m=0$ e la batteria è inutilizzata, mentre nella realtà ci sono esuberi a mezzogiorno nei weekend e nei giorni sereni.

### 4.3 Casi limite (eseguiti sul codice reale)

| Caso | Esito | Giudizio |
|---|---|---|
| 0 kWp, 0 kWh | NPV 0, **payback NaN** (0/0 alla riga 539) | Non raggiungibile da UI (slider min 1), ma da gestire |
| 0 kWp, 5 kWh | NPV −3.387, payback "25,0" | Payback fuorviante |
| 3 kWp, batteria 0 | NPV 4.812, PB 9,88, SCR 60,3% | OK formalmente |
| Consumo annuo 0 (F1 di default) | SSR 0% ma **SCR 56,5% e ricavi calcolati sulle caselle F1** (2.420 kWh) | Incoerente: si consuma energia che il cliente dice di non consumare |
| Consumo annuo 0 + F1 a zero | NPV −6.433 | OK |
| Consumo annuo 0 → ottimizzatore | Nessuna combinazione valida → **fallback a tutta la griglia** → raccomanda 1 kWp | Dovrebbe essere un errore di input |
| F1 > totale (C_tot = 2.000) | F23 = 0, batteria inutile; **SSR 115,8%** (3+5), 121% (6 kWp) | SSR > 100%: errore |
| Ore = 0 in luglio | P_lug = 0, NPV 1.261 | OK |
| Ore negative (−100 in luglio) | Produzione negativa accettata, NPV 159 | Manca la validazione |
| F1 negativo (−500 in gennaio) | Accettato, NPV 2.173 | Manca la validazione |
| Parametro vuoto (tariffa) | **NPV NaN → "€ NaN"** in UI: `parseFloat('')` senza fallback (righe 485–497) | Errore visibile al cliente |
| Tasso di sconto negativo (−2%) | Accettato, NPV 21.306 | Manca la validazione |
| kWp 0,5 | Costo 2.000 €/kWp → CAPEX 1.000 € | Nessun costo fisso |

### 4.4 Monotonia (3 + 5)

| Variabile | Valori | NPV (€) | Esito |
|---|---|---|---|
| Tariffa di acquisto | 0,20 / 0,25 / 0,30 | 315 / 2.691 / 5.068 | ✅ crescente |
| Tasso di sconto | 3% / 6% / 9% | 6.914 / 2.691 / 34 | ✅ decrescente |
| Degrado FV | 0 / 0,5% / 1% | 3.339 / 2.691 / 2.087 | ✅ decrescente |
| Inflazione energia | 0 / 2% / 4% | 874 / 2.691 / 5.072 | ✅ crescente (flussi nominali) |
| Tariffa di vendita | 0 / 0,10 / 0,15 | 1.844 / 2.691 / 3.115 | ✅ crescente |
| Degrado BESS, % inverter, anno inverter, % sostituzione BESS, anno sostituzione BESS | qualsiasi valore | 2.691 sempre | ❌ **nessun effetto** (§4.8) |

### 4.5 Inflazione e tasso di sconto
- Ricavi e O&M crescono con $(1+i)^{n-1}$, quindi i **flussi sono nominali**. Lo sconto al 6% è coerente solo se il 6% è un **tasso nominale**. Il tasso reale equivalente è $1{,}06/1{,}02-1\approx3{,}92\%$.
- In UI l'NPV è descritto come "Guadagno netto **reale** a 25 anni attualizzato" (riga 582). **L'etichetta è sbagliata**: il valore è un NPV nominale scontato al 6%.
- L'O&M è indicizzato all'**inflazione energetica** (riga 529) e non a quella generale. È una scelta discutibile: se l'utente alza l'inflazione dell'energia per scenario, gonfia anche i costi di manutenzione.

### 4.6 Payback
- L'interpolazione lineare dentro l'anno di rientro è **corretta**. La verifica a mano dà 15 + 288,36/360,90 = 15,80, identico al codice.
- **Se non rientra mai** il codice mostra "25,0 Anni" (riga 536), indistinguibile da un rientro esatto a 25 anni. Esempio: con tariffa 0,10 €/kWh, NPV −4.438 € e payback "25,0 anni". È **fuorviante**.
- Quando verranno aggiunte le sostituzioni il cumulato non sarà più monotono: la sostituzione della batteria all'anno 12 può riportarlo sotto zero. Bisognerà decidere se il payback è il primo o l'ultimo attraversamento dello zero.

### 4.7 Ottimizzatore e slider
- **Stessa funzione di calcolo**: `calculateJointFinancials`, righe 554 e 604. ✅
- Batteria: stesso range e passo (0–15, passo 2,5; righe 334 e 553). ✅
- **kWp: range diversi.** L'ottimizzatore va da 1 a 15 (riga 552), lo slider da 1 a 20 (riga 329). Le taglie da 15,5 a 20 kWp si possono simulare ma non vengono mai considerate come ottimo, anche se la curva dei costi arriva a 20. ❌
- La curva NPV (riga 573 → 642) mostra **sempre e solo la serie senza batteria**, anche se l'ottimo ha una batteria. Il parametro `optKwp` è passato ma non usato. ❌

### 4.8 Parametri di default davvero usati

| Parametro (riga 381–383) | Usato nei calcoli? | Editabile in UI? |
|---|---|---|
| tariffaAcquisto | ✅ (525) | ✅ |
| tariffaVendita | ✅ (525) | ✅ |
| inflazione | ✅ (528–529) | ✅ |
| degradoFV | ✅ (528) | ✅ |
| tassoSconto | ✅ (531) | ✅ |
| dodBESS | ✅ (517) | ❌ nascosto |
| rteBESS | ✅ (518) | ❌ nascosto |
| oemPerc | ✅ (529) | ❌ nascosto |
| **degradoBESS** | ❌ **ignorato** | ❌ |
| **inverterPerc** | ❌ **ignorato** | ❌ |
| **annoInverter** | ❌ **ignorato** | ❌ |
| **bessSostPerc** | ❌ **ignorato** | ❌ |
| **annoBessSost** | ❌ **ignorato** | ❌ |
| Curve CAPEX FV/BESS | ✅ | ❌ mostrate in sola lettura |

Inoltre `consF2F3Mensile` viene calcolato e restituito ma non è mai mostrato, e `optKwp` (riga 637) non è usato.

---

## 5. Ipotesi semplificative e impatto

"Direzione" indica l'effetto sul risparmio stimato. "Probabilità" indica quanto è probabile che l'ipotesi distorca il risultato in modo rilevante.

| # | Ipotesi | Dove | Direzione | Probabilità | Note quantitative |
|---|---|---|---|---|---|
| 1 | **Bilancio mensile** al posto di orario o giornaliero: si confrontano totali mensili di produzione e consumo F1 | 515 | **Sovrastima** l'autoconsumo diretto | Alta | Modello orario *illustrativo* (non validato) su 3 kWp senza batteria. Con consumo uniforme nella fascia e cielo medio: SCR 58,9% contro 60,3% del modello mensile. Con variabilità meteo giornaliera: **51,9%**. Con un profilo domestico reale (picco serale) la differenza sarà probabilmente maggiore. Serve un profilo orario reale per quantificarla. |
| 2 | **F1 trattato come "diurno"** e coincidente con la produzione | 231, 513, 515 | **Sovrastima** | Alta | F1 vale solo dal lunedì al venerdì, 8–19. Sabato e domenica sono F2/F3 anche a mezzogiorno, e F1 comprende 8–9 e 17–19, quando la produzione è bassa. Il default ha F1 = **64%** dei consumi (2.420/3.800), quota alta per un'utenza domestica: va verificata sulle bollette (ripartizione F1/F2/F3 in fattura) o sui dati orari del Portale Consumi ARERA. Con F1 al 40%, a parità di tutto il resto, la SCR del 3 kWp senza batteria scende al 45,3% e l'NPV da 4.812 a 3.454 €. |
| 3 | F2+F3 costante nei 12 mesi | 514 | Ambigua | Media | Nella realtà i consumi serali e notturni sono più alti in inverno (luce, riscaldamento elettrico). |
| 4 | **Batteria: un ciclo al giorno su 30,4 giorni**, limite applicato alla media mensile | 517 | Sovrastima la carica (Jensen) in estate, sottostima in inverno (nessuna carica) | Media | Effetto netto incerto. Il modello orario illustrativo con meteo variabile dà per 3+5 una SCR del 68,4% contro il 79,0% del mensile. |
| 5 | Scarica limitata a F2+F3 mensile, energia non scaricata persa invece che immessa | 517–519 | **Sottostima** (conservativa) | Bassa | −180 kWh/anno × 0,10 = **−18 €/anno** nel caso di riferimento |
| 6 | **Degrado applicato all'intero ricavo**, batteria ed export compresi; nessun degrado della batteria | 528 | Ambigua: sovrastima la perdita sull'autoconsumo (che decresce meno della produzione), sottostima il degrado della batteria | Media | `degradoBESS` = 1,5%/anno, definito ma ignorato |
| 7 | **Nessuna sostituzione di inverter e batteria** | 527–532 | **Sovrastima forte** | Alta | 3+5: NPV da 2.691 a **1.479 €** (−45%), payback da 15,8 a **19,5 anni** (con i default 7,5% all'anno 15 e 70% del costo batteria all'anno 12, non inflazionati). Con i costi inflazionati: NPV 1.165 €, PB 20,6. |
| 8 | **O&M = 1,5% del CAPEX totale** all'anno, indicizzato all'inflazione energetica | 529 | Probabile sottostima del risparmio, se 1,5% è alto per il residenziale | Media | 122 €/anno sul caso di riferimento. Va confermato da EOS (comprende assicurazione? monitoraggio?). |
| 9 | **Autoconsumo valorizzato alla tariffa piena** di acquisto (0,25 €/kWh) | 525 | **Sovrastima** se 0,25 include quote fisse e di potenza, che non si evitano autoconsumando | Alta | Va valorizzata solo la componente variabile (€/kWh, con oneri, accise e IVA variabili). Ogni −0,01 €/kWh vale circa −475 € di NPV su 3+5 (da 0,25 a 0,20 l'NPV passa da 2.691 a 315 €). |
| 10 | **Immissione a 0,10 €/kWh fissi**, indicizzata come l'acquisto | 525, 528 | Dipende dal regime | Media | Il regime di cessione (ritiro dedicato, prezzi zonali, eventuale CER o autoconsumo diffuso) e la sua evoluzione sono **da verificare con EOS sulla normativa vigente**. Il modello lega il prezzo di vendita all'inflazione dell'energia: è un'ipotesi da esplicitare. |
| 11 | **Nessuna detrazione fiscale, IVA esplicita, finanziamento** | – | Senza detrazioni **sottostima** il ritorno; IVA non dichiarata = ambiguità sul CAPEX | Alta | Detrazioni (aliquote, massimali, anni), aliquota IVA e regime: **da verificare con EOS sulla normativa vigente**. Le curve dei costi non dicono se sono IVA inclusa. |
| 12 | Nessun costo della potenza impegnata o di adeguamento del contatore | – | Lieve sovrastima | Bassa | Rilevante solo se la batteria o la taglia richiedono un aumento di potenza. |
| 13 | CAPEX senza costi fissi (pratiche, connessione, quadro), costante fuori dai nodi | 455–474 | **Favorisce le taglie piccole** | Alta | 0,5 kWp a 1.000 €, 1 kWp a 2.000 €. È la causa principale della raccomandazione di 1–1,5 kWp (§7 #2). |
| 14 | Mese da 30,4 giorni fissi | 517 | Trascurabile | Bassa | Febbraio ha 28 giorni, luglio 31. |
| 15 | Ore equivalenti fisse, non legate a orientamento, inclinazione, ombre o località | 367 | Ambigua | Media | Vedi §6.2 |
| 16 | Nessun valore residuo a 25 anni, nessuno smaltimento | 527 | Ambigua (piccola) | Bassa | |

---

## 6. Valori di default

> Non ho dati di mercato 2026 verificati. Il giudizio "ragionevole" è qualitativo e **tutti i valori economici vanno confermati da EOS** (listino, preventivi recenti, bollette dei clienti tipo).

### 6.1 Parametri

| Parametro | Default | Giudizio per residenziale in prov. di AL, 2026 | Da confermare con EOS? | Fonte per verificarlo |
|---|---|---|---|---|
| €/kWp (1→20 kWp) | 2.000 → 1.350 | Curva plausibile come forma, ma **senza costi fissi**. Non è indicato se è IVA inclusa. | **Sì, priorità alta** | Listino o ultimi preventivi EOS, separando costo fisso e variabile |
| €/kWh batteria (2,5→15 kWh) | 700 → 400 | Etichetta "€/kWh **usabile**" (riga 253) ma applicata alla capacità nominale, poi ridotta dal DoD. Valori da verificare: i prezzi delle batterie sono in calo. | **Sì** | Listino EOS per i modelli installati |
| Tariffa di acquisto | 0,25 €/kWh | Plausibile come costo medio totale, ma **va usata la sola parte variabile** | **Sì** | Bollette di clienti tipo; offerte di riferimento ARERA |
| Tariffa di vendita | 0,10 €/kWh | Dipende dal regime di cessione | **Sì**, da verificare con EOS sulla normativa vigente | GSE (prezzi minimi garantiti / prezzi zonali), normativa CER |
| Inflazione energia | 2%/anno | Ipotesi neutra, accettabile se dichiarata. Applicata anche a vendita e O&M. | Scelta di policy | – |
| Degrado FV | 0,5%/anno | Coerente con le garanzie lineari tipiche dei moduli | Verificare sulla scheda dei moduli EOS | Datasheet produttore |
| Degrado BESS | 1,5%/anno | **Ignorato** | Sì (se verrà usato) | Garanzia batteria (cicli, % residua) |
| DoD | 90% | Plausibile per LFP; incoerente con il prezzo "per kWh usabile" | Sì | Datasheet |
| Rendimento round-trip | 88% | Plausibile se comprende la conversione | Sì | Datasheet sistema batteria + inverter |
| O&M | 1,5% del CAPEX/anno | Probabilmente alto per il residenziale (122 €/anno sul caso di riferimento) | **Sì** | Contratti di manutenzione EOS |
| Inverter: costo / anno | 7,5% del CAPEX / anno 15 | Plausibile come ordine di grandezza, ma **ignorato**. Non è chiaro su quale CAPEX (totale o FV). | Sì | Listino inverter |
| Batteria: costo / anno | 70% / anno 12 | Plausibile come durata. 70% del prezzo di oggi è probabilmente prudente visto il calo dei prezzi. **Ignorato.** | Sì | Garanzia (anni/cicli) |
| Tasso di sconto | 6% | Alto per una famiglia (costo opportunità del risparmio); va dichiarato se è nominale | Scelta di policy (§9) | – |
| Orizzonte | 25 anni | Standard; coerente con le garanzie di produzione dei moduli | – | – |
| Consumi F1 di default | 2.420 kWh (64%) | **Probabilmente troppo alti** per un'utenza domestica e **non riscalati** al cambio del totale | **Sì** | Bollette (ripartizione per fascia) |
| DSM | 15% | Ipotesi. Come opzione dichiarata va bene. | – | – |

### 6.2 Ore equivalenti e PVGIS
- Somma del default: **1.365 kWh/kWp·anno**. Rapporto luglio/dicembre = 165/55 = 3,0.
- Per Vignole Borbera (circa 44,7° N, 8,9° E), sud, 30°, perdite di sistema circa 14%, mi aspetto un ordine di grandezza **tra circa 1.250 e 1.450 kWh/kWp·anno**. È una stima mia, non un dato PVGIS. Il default è **plausibile come ordine di grandezza**, a patto che sia già al netto delle perdite (il modello non applica un PR separato).
- Attenzione: Vignole Borbera è all'imbocco della Val Borbera. L'orizzonte orografico può ridurre la produzione invernale.
- **Come verificarlo:** PVGIS (JRC), strumento "Grid-connected PV". Coordinate del comune, database PVGIS-SARAH3, silicio cristallino, 1 kWp, perdite 14%, inclinazione 30°, azimut 0°, *orizzonte calcolato attivo*. Si leggono i 12 valori `E_m` (kWh/kWp al mese) e li si confronta con la riga 367. Conviene salvare il CSV in `src/data/` con la data di estrazione.

---

## 7. Problemi trovati, in ordine di gravità

Legenda tipo: **E** = errore (il codice non fa quello che dichiara); **M** = scelta di modello discutibile.

| # | Gravità | Tipo | Problema | Dove | Effetto sul risultato | Correzione proposta |
|---|---|---|---|---|---|---|
| 1 | **Critico** | E | Sostituzione dell'inverter, sostituzione della batteria e degrado della batteria **definiti ma mai usati** | `handoff.md:382–383, 489–496` contro `527–532` | 3+5: NPV **2.691 → 1.479 €** (−45%), payback **15,8 → 19,5 anni**; con costi inflazionati 1.165 € / 20,6 anni. La batteria risulta gratuita per 25 anni. | Sottrarre i costi negli anni previsti (definendo la base del % inverter); applicare `degradoBESS` alla capacità; gestire la seconda sostituzione se l'orizzonte la richiede |
| 2 | **Critico** | M | **Criterio di ottimo NPV/CAPEX** con curva costi senza costi fissi: raccomanda impianti piccolissimi e mai la batteria | `559`, `455–463` | Con i default l'ottimo è **1,5 kWp + 0 kWh** (NPV 3.741 €, SSR 52%). Lo stesso a 6.000 kWh/anno: 1,5 kWp. Con F1 al 40%: 1 kWp. Sotto gli stessi vincoli, il massimo NPV sarebbe 3,5 kWp + 0 (NPV 5.018 €). Il teaser promette che "massimizza il risparmio" (riga 191) e l'hero scrive "la taglia ideale" (riga 563). | Decidere il criterio (§9). Aggiungere un costo fisso alla curva CAPEX. Mostrare il criterio in UI. |
| 3 | **Critico** | E | Caselle F1 di default (2.420 kWh) **non riscalate** quando il cliente cambia il consumo annuo | `366, 409, 506–507` | Cliente che scrive 2.700 kWh senza toccare le caselle: F1 = 90%, F2+F3 = 19,8 kWh/mese, SSR 3+5 = 93,5%. Con consumo 0: SCR 56,5% e ricavi su consumi inesistenti. Con F1 > totale: SSR fino a 121%. | Inserire F1 come % del totale (o profilo tipo × totale), riscalare automaticamente, validare F1 ≤ totale, limitare SSR a 100% |
| 4 | **Critico** | E | Payback mostrato come **"25,0 anni" quando non rientra mai** | `536, 583` | Con tariffa 0,10: NPV −4.438 €, payback "25,0 anni". Anche 0 kWp + 5 kWh mostra "25,0". | Restituire `null` e mostrare "oltre 25 anni / non rientra" |
| 5 | **Alto** | E | Testi e etichette che dichiarano cose false: "irraggiamento satellitare" (le ore sono valori fissi), "stima precisa", NPV "reale" (è nominale), "Copertura **Bolletta**" (è quota di energia, non di spesa), "Autoconsumo **Diretto**" (comprende la batteria) | `191, 194, 582, 584, 585` | Il cliente legge SSR 85% come "bolletta coperta all'85%", mentre quote fisse e di potenza restano | Riformulare le etichette; aggiungere un riquadro "Ipotesi" con i parametri usati |
| 6 | **Alto** | M | **Bilancio mensile + F1 = ore di sole**: l'autoconsumo diretto è il minimo dei totali mensili | `513, 515` | 3 kWp senza batteria: SCR 60,3%. Il modello orario illustrativo con meteo variabile dà 51,9%. 3+5: 79,0% contro 68,4% e NPV 2.691 contro 2.095 €. Con profili domestici reali l'errore è probabilmente maggiore. | Modello orario su anno tipo (profilo di produzione + profilo di carico domestico parametrico), o almeno un coefficiente di contemporaneità calibrato |
| 7 | **Alto** | M | Autoconsumo valorizzato a tariffa piena (0,25) senza distinguere la parte variabile | `525` | −0,05 €/kWh → NPV 3+5 da 2.691 a 315 € | Separare la "tariffa variabile evitata" e documentarla in UI |
| 8 | **Alto** | M | Il profilo F1 di default vale il 64% dei consumi: alto per il residenziale | `366` | Con F1 al 40%: NPV 3 kWp da 4.812 a 3.454 € (−28%) | Default basato su dati reali da confermare con EOS |
| 9 | Medio | E | Batteria: prezzo "per kWh **usabile**" applicato alla capacità nominale, poi ridotta di nuovo dal DoD | `253, 504, 517` | Capacità usabile sottostimata del 10% (4,5 invece di 5 kWh), oppure prezzo sovrastimato | Decidere se B è nominale o usabile e applicare DoD in un solo punto |
| 10 | Medio | E | Energia caricata e non scaricabile (limite F2+F3) **persa invece che immessa** | `517–519` | −180 kWh/anno, −18 €/anno (conservativo) | $Ch_m=\min(X_m,\;30{,}4\,B\,DoD,\;C^{F23}_m/\eta)$ |
| 11 | Medio | M | Sensitività solo sulla tariffa di acquisto ±20%; la colonna "Inflazione / Degrado" mostra lo stesso valore in tutte le righe; i nomi "Pessimista/Ottimista" fanno pensare a scenari completi | `593–596` | Il cliente crede di vedere uno scenario pessimista completo | Scenari multi-variabile (produzione, tariffa, inflazione, sconto, costi) oppure tornado chart |
| 12 | Medio | E | Curva NPV mostra **sempre la serie senza batteria**; `optKwp` non usato | `573, 642` | Se l'ottimo avesse una batteria il grafico non lo rappresenterebbe | Filtrare per `optimal.kwhBess` ed evidenziare il punto ottimo |
| 13 | Medio | E | Input senza validazione: parametro vuoto → "€ NaN"; valori negativi e tasso negativo accettati | `479–497` | NaN visibile al cliente; NPV 21.306 € con sconto −2% | Validazione con messaggi di errore, range min/max |
| 14 | Medio | M | O&M indicizzato all'inflazione **energetica** | `529` | Con inflazione al 4% anche l'O&M cresce del 4% | Parametro di inflazione generale separato |
| 15 | Medio | M | Degrado applicato all'intero ricavo, batteria ed export compresi | `528` | Piccolo, di segno incerto | Ricalcolare l'energia per anno (o almeno degradare P e ricalcolare il bilancio) |
| 16 | Medio | E | Range kWp diversi: ottimizzatore 1–15, slider 1–20 | `552` contro `329` | Taglie da 15,5 a 20 kWp mai valutate come ottimo | Una sola costante condivisa |
| 17 | Medio | M | IRR/MIRR assenti; IVA e detrazioni assenti e non dichiarate | – | IRR del caso 3+5 = 9,05% (7,77% con sostituzioni), non mostrato | Vedi §8 |
| 18 | Basso | E | Payback = NaN con 0 kWp + 0 kWh (0/0) | `539` | Non raggiungibile da UI | Guardia su CAPEX = 0 |
| 19 | Basso | M | F2+F3 uniforme nei 12 mesi; mese da 30,4 giorni | `514, 517` | Trascurabile o di segno incerto | Giorni reali; profilo stagionale F2+F3 |
| 20 | Basso | E | Grafico a barre: "Consumo F1" comprende la quota spostata, F2+F3 non mostrato, la serie "Batteria" è la scarica | `572, 628–630` | Lettura confusa | Barre impilate: autoconsumo / batteria / immissione / prelievo |
| 21 | Basso | E | `switchEosTab` usa la variabile globale `event`: dopo "Calcola" il pulsante cliccato riceve la classe `active` e nessuna tab appare selezionata | `398, 575` | UX | Passare la tab da attivare in modo esplicito |
| 22 | Basso | E | Motore in `<script is:inline>`, funzioni globali, niente TS né test | `364–669` | Non testabile; viola `CLAUDE.md` §2 | Estrarre in `src/lib/eosolar/` con Vitest |
| 23 | Basso | E | Chart.js da CDN senza versione | `handoff.md:738` | Viola la portabilità (`CLAUDE.md` §1) | npm + bundle |

**Fuori perimetro, ma lo segnalo** perché riguarda il flusso del calcolatore: il form lead (`handoff.md:1539–1548`) **non ha informativa né checkbox privacy** (viola `CLAUDE.md` §6). Inoltre `handleLeadSubmit` (1764–1783) sblocca la dashboard anche in caso di errore e non controlla `response.ok`, quindi l'errore viene ingoiato, contro le regole del form adapter.

---

## 8. Proposte di miglioramento

### 8.1 Correzioni necessarie (modello corretto e difendibile)

| # | Correzione | Risolve | Complessità | Cambia i risultati per il cliente? |
|---|---|---|---|---|
| C1 | Inserire sostituzione inverter/batteria e degrado batteria nei flussi | #1 | S | **Sì**: NPV −30/−45% con batteria |
| C2 | Criterio di ottimo esplicito e scelto (§9) + costo fisso nella curva CAPEX | #2 | S | **Sì**: taglia consigliata molto diversa |
| C3 | Consumi F1 come % del totale (o profilo tipo), riscalati e validati; SSR ≤ 100% | #3, #8 | S | **Sì** |
| C4 | Payback "non rientra" invece di 25 | #4 | S | Sì, nei casi negativi |
| C5 | Correggere testi ed etichette (reale/nominale, SSR ≠ bolletta, SCR totale, niente "satellitare") e aggiungere il riquadro "Ipotesi usate" | #5 | S | Solo la comunicazione |
| C6 | Tariffa evitata = sola componente variabile, parametro dichiarato | #7 | S | **Sì** |
| C7 | Bilancio batteria corretto (carica limitata dalla domanda serale; DoD in un solo punto) | #9, #10 | S | Poco (±2%) |
| C8 | Validazione degli input con errori visibili | #13, §4.3 | S | Evita risultati assurdi |
| C9 | Range unico per slider e ottimizzatore; curva NPV coerente | #12, #16 | S | No |
| C10 | Estrarre il motore in `src/lib/eosolar/` (TS strict + Vitest, con questo caso di riferimento come test di regressione) | #22 | M | No (prerequisito per tutto il resto) |
| C11 | Sostituire il bilancio mensile con un anno tipo orario (8.760 h) o almeno giorno tipo × mese, con profilo di carico parametrico | #6 | M | **Sì**: SCR −5/−15 punti stimati |

### 8.2 Evoluzioni opzionali

| Evoluzione | Beneficio | Complessità | Cambia i risultati? |
|---|---|---|---|
| Ore equivalenti da PVGIS per orientamento e inclinazione (tabella precalcolata per comuni o falde, non API runtime) | Produzione difendibile, giustifica la parola "satellitare" | M | Sì |
| Confronto con/senza batteria affiancato (ΔNPV, Δpayback della batteria) | Trasparenza: oggi la batteria distrugge valore nel modello | S | No (solo presentazione) |
| IRR e MIRR | Indicatori familiari ai clienti PMI | S | No |
| Scenari multi-variabile o tornado chart | Sensitività onesta | M | No |
| Detrazioni / IVA parametrizzabili (on/off, aliquota, anni) | Realismo; **parametri da verificare con EOS sulla normativa vigente** | M | Sì |
| Upload della curva oraria del cliente (CSV dal Portale Consumi / distributore) | Precisione massima per i clienti motivati | L | Sì |
| Profili tipo (famiglia al lavoro, smart working, pompa di calore, auto elettrica) | Sostituisce le 12 caselle F1, UX migliore | M | Sì |
| Finanziamento (rata, TAN) | Utile per la vendita | M | Sì |
| Profilo PMI (F1 alto e reale, potenze maggiori, tariffe business) | Il pubblico include le aziende | M | Sì |
| Range di incertezza sul risultato (P10/P90 su produzione e tariffa) | Stima credibile | M | No (presentazione) |

---

## 9. Decisioni che spettano a te

| # | Domanda | Opzioni | Raccomandazione |
|---|---|---|---|
| D1 | **Criterio di ottimo** | (a) NPV massimo; (b) payback minimo; (c) NPV/CAPEX (attuale); (d) NPV massimo con vincolo payback ≤ X anni o SSR ≥ Y | **(a), oppure (d) con payback ≤ 12–15 anni.** NPV/CAPEX e payback minimo premiano sistematicamente l'impianto più piccolo (1–1,5 kWp con i default), poco utile per il cliente e per EOS. L'NPV massimo dà la taglia che crea più valore. Il vincolo evita impianti con rientro troppo lungo. |
| D2 | **Vincoli dell'ottimizzatore** (produzione ≤ 140% del consumo, SCR ≥ 40%) | Mantenere, rivedere o rendere configurabili | Mantenere un tetto alla produzione, motivato dal regime di cessione da verificare con EOS. Oggi il tetto di produzione esclude da 4 kWp in su, e SCR ≥ 40% esclude da 5 kWp in su senza batteria. Entrambi vanno ricalibrati dopo il passaggio al modello orario. |
| D3 | **Tasso di sconto e convenzione** | (a) 6% nominale (attuale); (b) 3–4% nominale (costo opportunità di una famiglia); (c) analisi reale con inflazione 0 | **(b) per i privati, mostrato e modificabile, dichiarato come nominale.** Con il 6% su 25 anni un risparmio ha un valore molto basso. Qualunque sia la scelta, l'etichetta "reale" va tolta. |
| D4 | **Orizzonte** | 20 / 25 / 30 anni | **25**, coerente con le garanzie di produzione. Con costi di sostituzione, senza valore residuo. |
| D5 | **Valorizzazione dell'energia immessa** | (a) prezzo fisso indicizzato (attuale); (b) prezzo fisso non indicizzato; (c) prezzo per regime (RID/zonale/CER) | **(b) prudente come default**, con (c) come opzione dopo verifica con EOS sulla normativa vigente. |
| D6 | **Tariffa evitata** | Tariffa piena / sola componente variabile | **Sola componente variabile**, con un valore di default che EOS conferma sulle bollette tipo. |
| D7 | **Detrazioni e IVA** | (a) escluse e dichiarate; (b) includibili on/off; (c) incluse di default | **(b), spento di default**, con aliquote e anni confermati da EOS sulla normativa vigente. Bisogna anche decidere se la curva CAPEX è IVA inclusa. |
| D8 | **Granularità del modello energetico** | (a) mensile corretto (riscalare F1, coefficiente di contemporaneità); (b) giorno tipo × 12; (c) orario 8.760 h con profili tipo | **(c)**. Il costo di calcolo è trascurabile (203 combinazioni × 8.760 h girano in decine di ms) ed è l'unico che rende difendibili SCR e batteria. Serve però una fonte per i profili di carico (da scegliere con EOS). |
| D9 | **Input dei consumi** | 12 caselle F1 (attuale) / % F1 + totale / profili tipo | **Totale annuo + profilo tipo + % F1 opzionale da bolletta.** Le 12 caselle confondono e oggi producono gli errori del #3. |
| D10 | **Costi di sostituzione** | Base del 7,5% inverter (CAPEX totale o FV?); 70% batteria su prezzo attuale o inflazionato | Inverter: % del CAPEX FV o €/kW. Batteria: €/kWh futuro stimato da EOS, non inflazionato. |
| D11 | **Dati da EOS** prima delle modifiche | Listino €/kWp con costo fisso, €/kWh batteria, O&M, regime di cessione tipico, bollette tipo (F1 %, componente variabile), conferma PVGIS | Raccogliere prima di toccare i default. Fino ad allora, lasciare `TODO(EOS):` visibili. |

---

## Appendice: come ho eseguito i controlli

Script temporanei nello scratchpad della sessione, non versionati:
- `engine.js`: carica alla lettera le righe 365–547 di `docs/handoff.md` con `new Function` e un `document` fittizio.
- `run.js`: replica `getInputs` con i default e l'ottimizzatore (righe 551–559). Stampa il caso di riferimento e l'ottimo.
- `checks.js`: monotonia, casi limite, parametri ignorati, limiti della batteria, sensitività dell'ottimizzatore.
- `hand.py`: implementazione indipendente dalle formule del §2 (tabelle §3.2 e §3.3).
- `hourly.py` / `hourly2.py`: modello orario **illustrativo e non validato**. Usa produzione sinusoidale tra alba e tramonto a 44,7° N, consumi uniformi all'interno delle fasce ARERA e meteo medio oppure variabile. Serve solo a dare l'ordine di grandezza dell'errore del bilancio mensile.
- `repl.js`: effetto delle sostituzioni ignorate.
