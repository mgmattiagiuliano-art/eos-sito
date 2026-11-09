# Audit del simulatore fotovoltaico EOSolar (v2, codice della Fase 6)

> Sessione di audit **in sola lettura** del 09/11/2026. Nessun file di codice modificato.
> **v2:** la prima versione analizzava il prototipo in `docs/handoff.md`, perché il clone della sessione conteneva solo `main`. Questa versione analizza il codice reale del branch `claude/eos-fase-6-consegna` (commit `f4dadce`). Tutti i numeri vengono dal motore reale (`src/lib/eosolar/`), eseguito con gli stessi input.

---

## 0. Versioni a confronto

| | Prototipo (`docs/handoff.md:364–669`) | **Fase 6 (attiva nella pagina)** |
|---|---|---|
| Dove | `<script is:inline>` dentro il markdown | `src/lib/eosolar/*.ts` (motore), `src/components/eosolar/*` (UI) |
| Test | nessuno | 51 test Vitest, **tutti verdi** (`npx vitest run`) |
| Criterio di ottimo | max NPV/CAPEX | **max NPV** entro i vincoli, più le 3 migliori (`optimizer.ts:16–38`) |
| Sostituzioni inverter/batteria, degrado batteria | ignorati | **inclusi**, inflazionati con l'inflazione generale (`model.ts:117–134`) |
| Batteria | energia caricata e non scaricabile persa | carica limitata a quanto la batteria può restituire di notte (`model.ts:68`) |
| Energia immessa | 0,10 €/kWh sempre | ritiro dedicato **spento di default**, quindi 0 € (`defaults.ts:81`) |
| Payback non raggiunto | "25,0 anni" | `null`, mostrato come "oltre 25 anni" (`finance.ts:39–50`) |
| Payback con sostituzioni | primo attraversamento dello zero | ultimo attraversamento (prudente) |
| MIRR | assente | presente (reinvestimento al tasso di sconto) |
| IVA, detrazione | assenti | parametri attivabili, **spenti** di default |
| Giorni per mese | 30,4 | giorni reali (`defaults.ts:9`) |
| Range kWp | ottimizzatore 1–15, slider 1–20 | unico, 1–20 kWp a passi di 0,5; batteria 0–15 kWh a passi di 2,5 (`defaults.ts:12–15`) |
| Validazione | assente | `validate()` (`model.ts:171–210`), parziale (vedi §4.3) |
| Testi | "irraggiamento satellitare", "reale" | corretti; disclaimer del modello mensile presente |

Dei 23 problemi del prototipo, la Fase 6 ne ha risolti 17. Restano aperti, per scelta o per mancanza di dati: il **modello mensile con F1 trattato come diurno**, il **profilo F1 di default al 64%**, la **curva dei costi senza costo fisso** e il **valore dell'energia immessa**. A questi si aggiungono i nuovi problemi del §7.

---

## 1. Mappa del modello (Fase 6)

| # | Passaggio | File : funzione | Righe |
|---|---|---|---|
| 1 | Default: consumi, ore, costi, parametri, range, vincoli, scenari | `src/lib/eosolar/defaults.ts` | 7–94 |
| 2 | Markup degli input (generato al build dai default) | `src/components/eosolar/Dashboard.astro`, `fields.ts` | Dashboard 38–175; fields 33–50 |
| 3 | Sblocco: lead gate → `unlock()` → `runOptimal()` → tab **"ottimale"** | `ui.ts: initLeadForm, unlock` | 301–308, 355–380 |
| 4 | Lettura degli input in `ModelConfig` | `ui.ts: readConfig` | 73–92 |
| 5 | Validazione (gli errori bloccano, gli avvisi si mostrano) | `model.ts: validate` | 171–210 |
| 6 | Ottimizzatore: griglia 39 × 7 = 273 combinazioni | `optimizer.ts: optimize` | 20–38 |
| 7 | CAPEX (interpolazione e IVA) | `costs.ts: unitCost/totalCost`, `model.ts: computeCapex` | costs 9–28; model 31–38 |
| 8 | Bilancio energetico mensile, ricalcolato **per ogni anno** con degrado FV e batteria | `model.ts: monthlyBalance`, `simulate` | 45–86, 117–123 |
| 9 | Flussi annuali: risparmio, ritiro, O&M, sostituzioni, detrazione | `model.ts: simulate` | 125–143 |
| 10 | NPV, MIRR, payback, cumulato | `finance.ts` | 6–50 |
| 11 | Vincoli e classifica (NPV decrescente, poi CAPEX crescente) | `optimizer.ts: satisfiesConstraints, compareCandidates` | 11–18 |
| 12 | Sensitività: 3 scenari (tariffa, inflazione, produttività) | `optimizer.ts: sensitivity`, `defaults.ts: SCENARI_SENSIBILITA` | 49–70; 90–94 |
| 13 | Testo, metriche, top 3, avvisi | `ui.ts: runOptimal, renderMetrics` | 110–122, 171–234 |
| 14 | Grafici (Chart.js con import dinamico) | `charts.ts`; `ui.ts` | ui 236–243 |
| 15 | Simulazione libera da slider (stessa `simulate`, stesso `RANGE`) | `ui.ts: runManual`; `Dashboard.astro` | ui 257–290; Dashboard 256–265 |

---

## 2. Formule (Fase 6)

Notazione: m = mese (1–12), $g_m$ = giorni del mese, n = anno (1…N, con N = 25).

**Consumi** (`model.ts:52–61`):
$$F23=\max(0,C_{tot}-\textstyle\sum F1_m),\quad C^{dia}_m=F1_m+\varphi\frac{F23}{12},\quad C^{not}_m=(1-\varphi)\frac{F23}{12}$$

**Produzione nell'anno n** (riga 59):
$$P_{m,n}=k\,h_m\,(1-d_{FV})^{n-1}$$

**Capacità utile della batteria nell'anno n** (righe 119–120), dove $a_n$ è l'età della batteria, azzerata dopo la sostituzione:
$$U_n=B\cdot DoD\cdot(1-d_B)^{a_n}$$

**Bilancio** (righe 63–73):
$$A=\min(P,C^{dia}),\quad S=P-A$$
$$Ch=g_m\cdot\max\!\Big(0,\min\big(\tfrac{S}{g_m},\,U_n,\,\tfrac{C^{not}}{g_m\,\eta}\big)\Big)$$
$$Dis=\eta\,Ch,\quad E=S-Ch,\quad Prel=(C^{dia}-A)+(C^{not}-Dis)$$

**Indicatori dell'anno 1** (righe 154–162):
$$SCR=\frac{A+Ch}{P}\ \text{(le perdite della batteria contano come autoconsumo)},\qquad SSR=\frac{A+Dis}{C^{dia}+C^{not}}$$

**CAPEX** (righe 31–38): costo unitario interpolato linearmente tra i nodi e costante fuori dai nodi, moltiplicato per la taglia.
$$CAPEX=\big(k\,c_{FV}(k)+B\,c_B(B)\big)\cdot(1+IVA\ \text{se attiva})$$

**Flussi** (righe 125–141), con $I_E=(1+i_E)^{n-1}$ e $I_G=(1+i_G)^{n-1}$:
$$Risp_n=(A_n+Dis_n)\,p_a\,I_E,\qquad Rit_n=E_n\,p_{RID}\,I_E\ \text{(0 se spento)}$$
$$OM_n=o\cdot CAPEX_{netto}\,(1+IVA)\,I_G$$
$$Sost_n=[n=n_{inv}]\,s_{inv}\,CAPEX_{FV}\,(1+IVA)\,I_G+[n=n_B]\,s_B\,CAPEX_B\,(1+IVA)\,I_G$$
$$Detr_n=[n\le n_{det}]\ \frac{a_{det}\cdot CAPEX}{n_{det}}$$
$$F_n=Risp_n+Rit_n-OM_n-Sost_n+Detr_n,\qquad F_0=-CAPEX$$

**Indicatori finanziari** (`finance.ts`):
$$NPV=\sum_{n=0}^{N}\frac{F_n}{(1+r)^n}$$
$$MIRR=\left(\frac{\sum_{F_n>0}F_n(1+r)^{N-n}}{-\sum_{F_n<0}F_n(1+r)^{-n}}\right)^{1/N}-1$$

Payback: l'**ultimo** anno in cui il cumulato attualizzato è negativo, più l'interpolazione lineare dentro l'anno successivo. Vale `null` se il cumulato a N è negativo.

**Ottimo** (`optimizer.ts:11–38`): $\arg\max NPV$ tra le combinazioni con $P_1\le1{,}4\,C_{tot}$ e $SCR\ge40\%$. A parità di NPV vince il CAPEX minore. Se nessuna combinazione è valida si classificano tutte, con un avviso.

---

## 3. Caso di riferimento: 3 kWp + 5 kWh, default (RID spento, IVA spenta)

### 3.1 Anno 1, mese per mese (kWh). Codice reale = calcolo a mano

Capacità di carica per notte: $\min(4{,}5;\ 97{,}75/(g\cdot0{,}88))$, cioè 3,58 kWh nei mesi da 31 giorni e 3,70 in quelli da 30. Il limite è il consumo notturno, non la batteria.

| Mese | P | C dia | C not | A | Ch | Dis | E | Prelievo | P−A−Ch−E |
|---|---|---|---|---|---|---|---|---|---|
| Gen | 195,00 | 237,25 | 97,75 | 195,00 | 0,00 | 0,00 | 0,00 | 140,00 | 0 |
| Feb | 240,00 | 217,25 | 97,75 | 217,25 | 22,75 | 20,02 | 0,00 | 77,73 | 0 |
| Mar | 345,00 | 207,25 | 97,75 | 207,25 | 111,08 | 97,75 | 26,67 | 0,00 | 0 |
| Apr | 405,00 | 197,25 | 97,75 | 197,25 | 111,08 | 97,75 | 96,67 | 0,00 | 0 |
| Mag | 450,00 | 187,25 | 97,75 | 187,25 | 111,08 | 97,75 | 151,67 | 0,00 | 0 |
| Giu | 480,00 | 207,25 | 97,75 | 207,25 | 111,08 | 97,75 | 161,67 | 0,00 | 0 |
| Lug | 495,00 | 247,25 | 97,75 | 247,25 | 111,08 | 97,75 | 136,67 | 0,00 | 0 |
| Ago | 465,00 | 227,25 | 97,75 | 227,25 | 111,08 | 97,75 | 126,67 | 0,00 | 0 |
| Set | 375,00 | 207,25 | 97,75 | 207,25 | 111,08 | 97,75 | 56,67 | 0,00 | 0 |
| Ott | 285,00 | 217,25 | 97,75 | 217,25 | 67,75 | 59,62 | 0,00 | 38,13 | 0 |
| Nov | 195,00 | 227,25 | 97,75 | 195,00 | 0,00 | 0,00 | 0,00 | 130,00 | 0 |
| Dic | 165,00 | 247,25 | 97,75 | 165,00 | 0,00 | 0,00 | 0,00 | 180,00 | 0 |
| **Anno** | **4.095** | 2.627 | 1.173 | **2.470,25** | **868,06** | **763,89** | **756,69** | **565,86** | **0** |

- SCR = (2.470,25 + 868,06)/4.095 = **81,5%**. SSR = (2.470,25 + 763,89)/3.800 = **85,1%**.
- Il bilancio ora si chiude anche sul lato batteria: Ch − Dis = 104,17 kWh, pari esattamente alla perdita di rendimento. Dal prototipo, 180 kWh/anno sono passati in immissione.

### 3.2 Flussi (€). Codice reale = calcolo a mano

| Anno | Autoconsumo totale (kWh) | Immissione (kWh) | Risparmio | Ritiro | O&M | Sostituzioni | Flusso | Attualizzato | Cumulato |
|---|---|---|---|---|---|---|---|---|---|
| 0 | | | | | | | −8.150,00 | −8.150,00 | −8.150,00 |
| 1 | 3.234,14 | 756,69 | 808,54 | 0 | 122,25 | 0 | 686,29 | 647,44 | −7.502,56 |
| 2 | 3.229,06 | 741,62 | 823,41 | 0 | 124,70 | 0 | 698,71 | 621,85 | −6.880,71 |
| 12 | 3.179,58 | 594,95 | 988,35 | 0 | 152,00 | **2.393,50** (batteria) | **−1.557,15** | −773,85 | −3.054,44 |
| 15 | 3.165,22 | 552,37 | 1.044,11 | 0 | 161,31 | **534,39** (inverter) | 348,41 | 145,38 | −2.126,33 |
| 25 | 3.107,39 | 427,39 | 1.249,51 | 0 | 196,63 | 0 | 1.052,88 | 245,32 | **+840,78** |

Verifiche a mano:
- Batteria anno 12: 0,70 × 2.750 × 1,02¹¹ = 1.925 × 1,2434 = 2.393,50 ✓
- Inverter anno 15: 0,075 × 5.400 × 1,02¹⁴ = 405 × 1,3195 = 534,39 ✓
- Anno 1: 3.234,14 × 0,25 − 122,25 = 686,29; diviso 1,06 = 647,44 ✓

### 3.3 Risultati

| | Prototipo | **Fase 6** |
|---|---|---|
| CAPEX | 8.150 € | 8.150 € |
| NPV 25 anni | 2.691 € | **841 €** |
| Payback attualizzato | 15,8 anni | **21,7 anni** |
| MIRR | – | **6,38%** (appena sopra il tasso di sconto del 6%) |
| SCR / SSR | 79,0% / 85,1% | 81,5% / 85,1% |

Come si passa da 2.691 a 841 € (ogni passo misurato sul motore reale):
- 2.691 € → **3.199 €** (+508): nel prototipo l'energia caricata ma non scaricabile andava persa, ora va in immissione (a 0,10 €/kWh); si usano anche i giorni reali dei mesi.
- 3.199 € → **1.786 €** (−1.413): sostituzioni della batteria all'anno 12 e dell'inverter all'anno 15.
- 1.786 € → **841 €** (−945): ritiro dedicato spento, quindi immissione a 0 €.
- Il degrado della batteria, da solo, vale circa 0 € in questo caso (§4.2).

**Cosa vede davvero il cliente con i default:** **1,5 kWp senza batteria**, CAPEX 2.925 €, NPV 3.607 €, payback 8,0 anni, MIRR 9,46%, SSR 51,7%. Seguono 2 kWp (NPV 3.524 €) e 2,5 kWp (NPV 3.100 €). Coincide con quanto riportato in `docs/PROGRESS.md`.

---

## 4. Controlli di coerenza (sul motore della Fase 6)

### 4.1 Energia
$P=A+Ch+E$ è verificata in tutti i 12 mesi (scarto < 10⁻¹²). Inoltre $Dis=\eta\,Ch$ e $Dis\le C^{not}$ valgono per costruzione. ✅

### 4.2 Monotonia (3 + 5)

| Variabile | Valori | NPV (€) | Esito |
|---|---|---|---|
| Tariffa | 0,20 / 0,25 / 0,30 | −1.617 / 841 / 3.299 | ✅ |
| Tasso di sconto | 3 / 6 / 9% | 4.367 / 841 / −1.336 | ✅ |
| Degrado FV | 0 / 0,5 / 1% | 1.036 / 841 / 614 | ✅ |
| Degrado batteria | 0 / 1,5 / 3% | 841 / 841 / 782 | ✅ ma con effetto quasi nullo: la carica è limitata dal consumo notturno (3,6 kWh/notte) e non dalla capacità (4,5 kWh) finché questa non scende sotto 3,6 kWh |
| Costo di sostituzione della batteria | 0 / 70 / 100% | 2.030 / 841 / 331 | ✅ |

Il MIRR **cresce** con il tasso di sconto (4,6% al 3%, 8,3% al 9%), perché il tasso di reinvestimento coincide con quello di sconto. È coerente con la definizione dichiarata, ma va spiegato in UI.

### 4.3 Casi limite e validazione

| Caso | Esito | Giudizio |
|---|---|---|
| F1 > totale (C_tot = 2.000) | Avviso; SSR 95,7% (non più > 100%) | ✅ |
| Consumo 0 o negativo | Errore bloccante | ✅ |
| Ore o F1 negativi, campo principale vuoto | Errore bloccante | ✅ |
| `dodBatteria` vuoto (NaN) | **Nessun errore**: la batteria non lavora ma il suo costo è contato (NPV −2.018 €) | ❌ |
| `annoInverter` vuoto | **Nessun errore**: la sostituzione dell'inverter sparisce in silenzio | ❌ |
| Prezzo RID vuoto con RID attivo | **Nessun errore → NPV NaN** | ❌ |
| Rendimento batteria 150% | Accettato (la batteria crea energia) | ❌ |
| Tariffa −0,10 €/kWh, degrado −5% | Accettati da `validate` | ❌ |

`validate` controlla solo 5 parametri (`model.ts:189–198`). Il form ha `novalidate` (`Dashboard.astro:38`), quindi gli attributi HTML `min` e `max` non bloccano nulla.

### 4.4 Inflazione e sconto
Flussi nominali (tariffa e ritiro con $I_E$, O&M e sostituzioni con $I_G$), sconto al 6% inteso come nominale. ✅ Coerente. L'etichetta "reale" è stata rimossa.

### 4.5 Payback
L'interpolazione è corretta. Con le sostituzioni si usa l'ultimo attraversamento dello zero (scelta prudente, dichiarata in `finance.ts:34–38`). Se non rientra: `null`, mostrato come "oltre 25 anni". ✅

### 4.6 Ottimizzatore e slider
Stessa `simulate`, stesso `RANGE` (test `eosolar.test.ts:173`). ✅
**Limite:** 20 kWp è il tetto di entrambi.
- Con 30.000 kWh/anno e RID attivo l'ottimo è **20 kWp, sul bordo della griglia**.
- Con 100.000 kWh/anno, 20 kWp con produzione pari al 27% del consumo.
- Il simulatore non può dimensionare impianti PMI.

### 4.7 Parametri definiti ma non usati
Nessuno: tutti i parametri di `EconomicParams` entrano nei calcoli. ✅
Però **i costi di riferimento non sono modificabili**: la tabella è generata al build da `DEFAULT_COSTI` (`Dashboard.astro:93, 100`) e `readConfig` usa sempre i default (`ui.ts:74`).

### 4.8 Ottimo in funzione del consumo (profilo F1 scalato, default)

| Consumo annuo | RID spento | RID 0,10 attivo |
|---|---|---|
| 2.500 kWh | 1 kWp | 2,5 kWp |
| 3.800 kWh | 1,5 kWp | 3,5 kWp |
| 6.000 kWh | 3 kWp | 6 kWp |
| 10.000 kWh | 4,5 kWp | 10 kWp |
| 30.000 kWh | 15 kWp | **20 kWp (tetto)** |
| 100.000 kWh | **20 kWp (tetto)** | **20 kWp (tetto)** |

In nessun caso l'ottimo comprende una batteria. Con 3 kWp, ogni taglia di batteria riduce l'NPV:

| Batteria | 0 | 2,5 | 5 | 7,5 kWh |
|---|---|---|---|---|
| NPV (RID spento) | 2.559 € | 1.382 € | 841 € | −823 € |

Con RID spento la taglia ottima è circa il 40–55% di quella con RID attivo: **il valore dell'energia immessa è la variabile che decide la taglia.**

---

## 5. Ipotesi semplificative ancora presenti

| # | Ipotesi | Dove | Direzione sul risparmio | Probabilità | Quantificazione |
|---|---|---|---|---|---|
| 1 | Bilancio **mensile** (min dei totali) | `model.ts:63` | Sovrastima | Alta | Modello orario illustrativo (non validato), 3 kWp senza batteria: SCR 60,3% mensile, 58,9% orario con cielo medio, **51,9%** orario con meteo variabile. 3+5: SSR 85,1% contro 74,2%. Con profili domestici reali (picco serale) l'errore è probabilmente maggiore. |
| 2 | F1 = "diurno" | `types.ts:14`, `model.ts:60` | Sovrastima | Alta | F1 vale solo dal lunedì al venerdì, 8–19. Il default è al 64% (TODO(EOS) già presente). Con F1 al 40%: NPV 3 kWp senza batteria −28% (valore misurato sul prototipo; il motore energetico senza batteria è identico). |
| 3 | Un ciclo di batteria al giorno, su valori medi mensili | `model.ts:68` | Sovrastima d'estate (Jensen), sottostima d'inverno (nessuna carica da gennaio a novembre-dicembre) | Media | Vedi #1 |
| 4 | F2+F3 uniforme nei 12 mesi | `model.ts:54` | Incerta | Media | |
| 5 | **Immissione a 0 € di default** | `defaults.ts:81` | **Sottostima** il valore degli impianti più grandi | Alta | Ottimo 1,5 kWp (RID spento) contro 3,5 kWp (RID attivo); NPV 3.607 contro 4.977 € |
| 6 | Autoconsumo valorizzato alla tariffa piena di 0,25 €/kWh | `model.ts:128` | Sovrastima se 0,25 include quote fisse e di potenza | Alta | Da 0,25 a 0,20: NPV 3+5 da 841 a −1.617 € |
| 7 | **CAPEX IVA esclusa, con IVA spenta di default** | `Dashboard.astro:87`, `defaults.ts:82` | **Sovrastima** per i privati, che pagano l'IVA senza recuperarla | Alta | Con IVA al 10% (aliquota da verificare con EOS sulla normativa vigente): 3+5 da NPV +841 a **−304 €** (non rientra); 1,5 kWp da 3.607 a 3.234 € |
| 8 | Curva CAPEX senza costo fisso; costante sotto 1 kWp e sopra 20 kWp | `costs.ts:9–23` | Favorisce le taglie piccole; per gli impianti grandi applica 1.350 €/kWp a qualsiasi taglia | Alta | |
| 9 | O&M in % del CAPEX (1,5%) | `model.ts:130` | Probabile sottostima del risparmio | Media | 122 €/anno su 3+5 |
| 10 | Sostituzione della batteria al 70% del prezzo attuale, inflazionato | `model.ts:134` | Probabile sottostima (i prezzi delle batterie scendono) | Media | 2.393 € all'anno 12 |
| 11 | Una sola sostituzione della batteria in 25 anni | `model.ts:111` | Lieve sovrastima | Bassa | All'anno 25 la batteria ha 13 anni |
| 12 | Detrazione senza limiti di capienza fiscale o massimali | `model.ts:136–139` | Sovrastima se attivata | Media | Regole da verificare con EOS sulla normativa vigente |
| 13 | Nessun costo della potenza impegnata né valore residuo | – | Piccola, incerta | Bassa | |
| 14 | Ore equivalenti fisse, non legate a orientamento, inclinazione o ombre | `defaults.ts:30` | Incerta | Media | Vedi §6 |

---

## 6. Valori di default

Sono invariati rispetto al prototipo. Le valutazioni della v1 restano valide: tutti i valori economici vanno confermati da EOS; ore equivalenti pari a 1.365 kWh/kWp·anno, plausibili come ordine di grandezza, da verificare con PVGIS (SARAH3, 1 kWp, perdite 14%, 30°, sud, orizzonte calcolato). Le novità della Fase 6:

| Parametro | Default | Giudizio | Da confermare? |
|---|---|---|---|
| Inflazione generale | 2% | Ipotesi neutra | Scelta di policy |
| Ritiro dedicato | spento (prezzo 0,10 se attivo) | Lo 0 € di default è **troppo prudente**: l'energia immessa ha comunque un valore. È la causa principale delle taglie piccole. | **Sì, priorità alta**, sulla normativa vigente |
| IVA | spenta, aliquota 0 | Con listini IVA esclusa, per un privato **sovrastima** il ritorno | **Sì, priorità alta**, sulla normativa vigente |
| Detrazione | spenta | Va bene finché le regole non sono confermate | Sì, sulla normativa vigente |
| Vincoli | produzione ≤ 140% del consumo, SCR ≥ 40% | Con RID spento il vincolo sulla SCR è di fatto ridondante. Per le PMI il 140% va rivisto. | Scelta di policy |
| Range | 1–20 kWp, 0–15 kWh | **Insufficiente per le PMI** | – |

---

## 7. Problemi trovati (Fase 6), in ordine di gravità

| # | Gravità | Tipo | Problema | Dove | Effetto | Correzione |
|---|---|---|---|---|---|---|
| 1 | **Critico** | M | **IVA spenta di default con listini IVA esclusa**: per un privato l'investimento mostrato è sottostimato | `defaults.ts:82`, `Dashboard.astro:87` | 3+5: NPV +841 € → −304 € con IVA al 10%. Ottimo 1,5 kWp: NPV −10% | Chiarire con EOS se i listini sono IVA inclusa; in alternativa un selettore "privato / azienda" che attivi l'IVA non recuperabile per i privati |
| 2 | **Alto** | M | **Immissione a 0 € di default**: la taglia ottima dipende quasi solo da questa scelta | `defaults.ts:81` | 3.800 kWh: 1,5 kWp (RID spento) contro 3,5 kWp (attivo); 10.000 kWh: 4,5 contro 10 kWp | Valore di default prudente ma non nullo, confermato da EOS |
| 3 | **Alto** | E | **Tetto di 20 kWp**: impianti PMI non dimensionabili; l'ottimo finisce sul bordo della griglia senza avviso | `defaults.ts:12–15` | 30.000 kWh con RID: ottimo = 20 kWp (bordo); 100.000 kWh: 20 kWp | Range esteso a passo variabile, limite di kWp installabili, avviso quando l'ottimo è sul bordo |
| 4 | **Alto** | M | Bilancio mensile + F1 = diurno | `model.ts:60–63` | SCR 3 kWp: 60% contro circa 52% (illustrativo); SSR 3+5: 85% contro circa 74% | Modello orario con profili tipo (decisione D8) |
| 5 | **Alto** | M | Profilo F1 di default al 64% | `defaults.ts:28` | NPV −28% con F1 al 40% | Dato EOS / profili tipo |
| 6 | Medio | E | **Validazione incompleta**: DoD, rendimento, anni di sostituzione, prezzo RID, aliquote non controllati; tariffa e degrado negativi accettati | `model.ts:189–198` | DoD vuoto: batteria pagata e inutile (NPV −2.018 €); RID vuoto: "NaN €"; rendimento 150% accettato | Validare tutti i campi con range |
| 7 | Medio | E | **Costi di riferimento non modificabili** | `Dashboard.astro:93,100`, `ui.ts:74` | Non si possono adattare al listino | Tabelle editabili, lette da `readConfig` |
| 8 | Medio | M | Curva CAPEX senza costo fisso; nessun nodo oltre 20 kWp | `defaults.ts:41–61` | Favorisce le taglie piccole; per i grandi impianti costo costante | Nodi 50 e 100 kWp, costo fisso opzionale |
| 9 | Medio | M | La batteria non risulta mai conveniente con i default, e la UI non lo spiega | – | 3 kWp: ogni 2,5 kWh in più costano 600–1.200 € di NPV | Mostrare il confronto con/senza batteria |
| 10 | Medio | M | MIRR crescente con il tasso di sconto (reinvestimento = sconto) | `finance.ts:15–26` | 4,6% al 3%, 8,3% al 9% | Spiegarlo in UI o separare il tasso di reinvestimento |
| 11 | Medio | M | SCR include le perdite della batteria | `model.ts:154` | 81,5% contro 79,0% | Usare (A + Dis)/P oppure dichiararlo |
| 12 | Basso | UX | Dopo l'email si apre il tab dei **risultati** già calcolati con i default, non quello di inserimento dati | `ui.ts:305–307` | Il cliente vede subito un risultato non suo | Aprire il tab ① (richiesta tua) |
| 13 | Basso | UX | Parametri avanzati modificabili da chiunque | `Dashboard.astro:119–175` | | Protezione con password (richiesta tua; solo lato client) |
| 14 | Basso | M | Degrado della batteria quasi ininfluente perché la carica è limitata dal consumo notturno | `model.ts:68` | 0% → 3%: NPV −59 € | Diventa rilevante con il modello orario |

---

## 8. Proposte

### 8.1 Correzioni necessarie
1. IVA e tipo di cliente: privato con IVA non recuperabile, azienda senza (#1). Complessità S. **Cambia i risultati.**
2. Default del valore dell'energia immessa non nullo, confermato da EOS (#2). S. **Cambia la taglia.**
3. Range esteso a passo variabile, limite di kWp installabili, nodi di costo 50 e 100 kWp modificabili, avviso "ottimo sul bordo" (#3, #7, #8). M. **Abilita le PMI.**
4. Validazione completa (#6). S.
5. Tab ① dopo l'email; password sui parametri avanzati (#12, #13). S.
6. Modello orario con profili tipo (#4, #5). M/L. **Cambia SCR e SSR del 5–15%.**

### 8.2 Evoluzioni opzionali
| Evoluzione | Beneficio | Complessità | Cambia i risultati? |
|---|---|---|---|
| Scheda "massimo rendimento" (MIRR massimo) accanto a "massimo NPV" | Confronto onesto tra guadagno assoluto e rendimento % | S | No (aggiunge un'informazione) |
| Esposizione (orientamento e inclinazione) → ore equivalenti da tabella PVGIS precalcolata | Produzione difendibile | M | Sì |
| Confronto con/senza batteria | Trasparenza | S | No |
| Profilo PMI / tariffa business / curva oraria del cliente | Precisione per le aziende | L | Sì |
| Costo fisso nella curva CAPEX | Taglie piccole realistiche | S | Sì |

---

## 9. Decisioni che spettano a te

| # | Domanda | Raccomandazione |
|---|---|---|
| D1 | Criterio di ottimo | Tenere il **massimo NPV** (già implementato) entro vincoli fisici, con una **scheda secondaria "massimo rendimento"** |
| D2 | Vincoli | Aggiungere i **kWp massimi installabili** (tetto o terreno). Tenere la produzione ≤ 140% del consumo finché EOS non chiarisce il regime di cessione. |
| D3 | Listini IVA inclusa o esclusa, e IVA per i privati | Selettore privato/azienda; aliquota da verificare con EOS sulla normativa vigente |
| D4 | Valore di default dell'energia immessa | Un prezzo prudente non nullo, non indicizzato, confermato da EOS |
| D5 | Tasso di sconto | 3–4% per i privati, 6–8% per le aziende, dichiarato come nominale |
| D6 | Prezzi dei nodi 50 e 100 kWp, eventuali nodi batteria oltre 15 kWh | Listino EOS |
| D7 | Modello orario | Sì, come fase successiva (serve una fonte per i profili di carico) |

---

## Appendice: metodo
- Worktree temporaneo di `origin/claude/eos-fase-6-consegna` nello scratchpad, `npm ci`, `npx vitest run` → 6 file, 51 test superati.
- Script TypeScript temporanei (bundle con `rolldown`) che importano `src/lib/eosolar/index.ts` e stampano il caso di riferimento, l'ottimizzatore, la monotonia, i casi limite e le sensitività.
- Il modello orario illustrativo è quello della v1: produzione sinusoidale, consumi uniformi nelle fasce ARERA, meteo medio o variabile. Serve solo come ordine di grandezza, non come validazione.
