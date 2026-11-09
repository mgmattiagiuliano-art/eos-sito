/**
 * Testi delle icone "i" accanto ai campi del calcolatore. Unica fonte: usati al build da Dashboard.astro.
 * Nessun dato normativo dato per certo: dove serve si rimanda alla normativa vigente.
 */
export const HELP = {
  consumoAnnuo:
    'Energia elettrica prelevata dalla rete in un anno, in kWh. La trovi in bolletta (consumo annuo o somma degli ultimi 12 mesi).',
  flessibilita:
    'Quota dei consumi serali e notturni (F2+F3) che puoi spostare nelle ore di sole, per esempio programmando lavatrice o lavastoviglie. Più consumi di giorno, più energia dell’impianto usi direttamente.',
  consumiF1:
    'Consumi in fascia F1 (lunedì–venerdì, 8–19) mese per mese, riportati in bolletta. Il calcolo li tratta come consumi diurni, contemporanei alla produzione: è un’approssimazione. La differenza rispetto al totale annuo è considerata consumo serale e notturno (F2+F3).',
  oreEquivalenti:
    'kWh prodotti in un mese da 1 kWp di pannelli, già al netto delle perdite di impianto. Dipendono da località, inclinazione, orientamento e ombre. Puoi ricavarli da PVGIS con il link qui sopra.',
  kwpMax:
    'Potenza massima che lo spazio disponibile (tetto o terreno) permette di installare. Se la indichi, il calcolatore non propone impianti più grandi.',
  tariffaAcquisto:
    'Costo dell’energia che eviti di comprare quando la produci tu, in €/kWh. Usa la parte variabile della bolletta (energia, oneri e imposte legati ai kWh): le quote fisse e di potenza restano anche con l’impianto.',
  inflazioneEnergia:
    'Aumento medio annuo ipotizzato del prezzo dell’energia. Si applica al risparmio in bolletta e al valore dell’energia immessa in rete.',
  tassoSconto:
    'Rendimento che otterresti investendo la stessa cifra in altro modo. Serve a confrontare euro di oggi ed euro futuri: più è alto, meno pesano i risparmi lontani nel tempo. Usato anche come tasso di reinvestimento del MIRR.',
  degradoFV:
    'Perdita annua di produzione dei pannelli per invecchiamento. Il valore è indicato nella garanzia di rendimento del produttore.',
  inflazioneGenerale:
    'Aumento medio annuo dei prezzi di manutenzione e ricambi: si applica a O&M e alle sostituzioni di inverter e batteria.',
  oemPerc: 'Costo annuo di manutenzione, monitoraggio e gestione, in percentuale dell’investimento iniziale.',
  degradoBatteria:
    'Perdita annua di capacità della batteria. Dopo la sostituzione la capacità torna al valore iniziale.',
  dodBatteria: 'Quota della capacità nominale della batteria effettivamente utilizzabile in ogni ciclo.',
  rendimentoBatteria:
    'Energia restituita dalla batteria rispetto a quella immagazzinata: il resto si perde in carica e scarica.',
  inverterPerc:
    'Costo della sostituzione dell’inverter, in percentuale del costo di moduli e inverter (escluso il costo fisso), rivalutato con l’inflazione generale.',
  annoInverter: 'Anno dell’analisi in cui è prevista la sostituzione dell’inverter.',
  batteriaSostPerc:
    'Costo della sostituzione della batteria, in percentuale del suo costo iniziale, rivalutato con l’inflazione generale.',
  annoBatteriaSost:
    'Anno dell’analisi in cui è prevista la sostituzione della batteria. Il calcolo ne considera una sola.',
  costiFV:
    'Costo chiavi in mano del fotovoltaico per kWp, IVA esclusa, alle taglie indicate. Per le taglie intermedie si interpola in modo lineare; oltre l’ultima taglia il costo resta costante.',
  costiBatteria:
    'Costo della batteria per kWh di capacità, IVA esclusa, alle taglie indicate. Per le taglie intermedie si interpola in modo lineare.',
  fissoImpianto:
    'Costo che non dipende dalla taglia: pratiche, allaccio, quadro elettrico, sopralluogo. Si aggiunge una volta per impianto, IVA esclusa.',
  ritiroDedicato:
    'Valore riconosciuto all’energia immessa in rete e non consumata. Se disattivato l’energia immessa vale zero (ipotesi prudente). Prezzo e regime di cessione vanno verificati sulla normativa vigente.',
  iva: 'I costi sono IVA esclusa. Attiva l’opzione per includere l’IVA in investimento, manutenzione e sostituzioni. Aliquota da verificare sulla normativa vigente.',
  detrazione:
    'Recupero fiscale di una quota dell’investimento in rate annuali costanti. Il calcolo presume che le imposte da cui detrarre siano sufficienti. Aliquota e anni da verificare sulla normativa vigente.',
} as const;

export type HelpKey = keyof typeof HELP;
