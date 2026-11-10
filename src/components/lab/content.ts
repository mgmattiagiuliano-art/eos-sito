/**
 * Contenuti condivisi delle pagine /lab.
 * Testi ripresi alla lettera dal prototipo (docs/handoff.md, Parte 2): le tre varianti
 * cambiano solo la presentazione, non le parole. Quando esisterà `src/data/site.ts`
 * questo file andrà sostituito da quello.
 */

export const company = {
  name: 'EOS Impianti s.n.c.',
  legalName: 'EOS IMPIANTI s.n.c.',
  street: 'Loc. Fornace 2',
  city: '15060 Vignole Borbera (AL)',
  phone: '+39 0143 677895',
  phoneHref: 'tel:+390143677895',
  email: 'info@eosimpianti.it',
  vat: '02164950061',
  // Coordinate già presenti nel JSON-LD del prototipo.
  geo: { lat: 44.7139, lng: 8.8924 },
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Loc.+Fornace+2,+15060+Vignole+Borbera+AL',
};

export const hero = {
  motto: { before: 'Qual è ', accent: "l'energia giusta", after: ' per te?' },
  answer: {
    before: 'Progettiamo e realizziamo il modo migliore di ',
    accent: 'produrre, utilizzare e gestire',
    after: ' la tua energia.',
    text: 'Dagli impianti elettrici alle energie rinnovabili, dalla sicurezza alla domotica, creiamo soluzioni integrate per abitazioni, aziende e industrie.',
    ctaPrimary: 'Richiedi un sopralluogo',
    ctaSecondary: 'Calcola il tuo impianto fotovoltaico',
  },
  about: {
    kicker: 'EOS Impianti',
    title: 'Energia e competenza al servizio dei tuoi progetti.',
    // TODO(EOS): confermare "oltre vent'anni" (dato ripreso dal prototipo, non verificato).
    text: "Da oltre vent'anni progettiamo e realizziamo impianti tecnologici per privati, aziende, industrie ed enti pubblici. Fortemente radicati tra Alessandria e Genova, operiamo con successo su tutto il territorio nazionale.",
  },
  philosophy: {
    kicker: 'La nostra filosofia',
    title: 'Ogni progetto ha la sua energia.',
    text: "Non proponiamo soluzioni standard: analizziamo consumi e obiettivi per progettare impianti realmente adatti a chi li vive ogni giorno. Crediamo nelle tecnologie efficienti per ridurre i costi ed aumentare l'autonomia energetica.",
  },
};

export interface Service {
  code: string;
  tag: string;
  title: string;
  desc: string;
  img: string;
  alt: string;
}

export const services: Service[] = [
  {
    code: '01',
    tag: 'Civili & Domotica',
    title: 'Impianti Elettrici Civili e Domotica',
    desc: 'Soluzioni sicure e affidabili per abitazioni, ville e condomini. Progettiamo sistemi integrati con domotica smart, illuminazione e gestione dei consumi.',
    img: '/servizi/domotica.jpg',
    alt: 'Impianti elettrici civili e domotica',
  },
  {
    code: '02',
    tag: 'Alta Potenza',
    title: 'Impianti Elettrici Industriali',
    desc: 'Energia affidabile per aziende, capannoni e stabilimenti produttivi. Quadri di distribuzione e linee di potenza per garantire continuità operativa.',
    img: '/servizi/industriale.jpg',
    alt: 'Impianti elettrici industriali',
  },
  {
    code: '03',
    tag: 'Rinnovabili',
    title: 'Impianti Fotovoltaici su Misura',
    desc: 'Produci la tua energia e dipendi meno dai costi energetici. Ci occupiamo di analisi, pratiche, installazione, accumulo e colonnine di ricarica.',
    img: '/servizi/fotovoltaico.jpg',
    alt: 'Fotovoltaico e sistemi di accumulo',
  },
  {
    code: '04',
    tag: 'Sicurezza',
    title: 'Sistemi di Sicurezza e Allarmi',
    desc: 'Proteggere ciò che conta. Installiamo antifurto, videosorveglianza IP e impianti antincendio valutando il livello di protezione richiesto.',
    img: '/servizi/antifurto.jpg',
    alt: 'Sistemi di sicurezza e allarmi',
  },
  {
    code: '05',
    tag: 'Tecnologia & Comfort',
    title: 'Impianti di Condizionamento, Illuminazione e Reti Dati',
    desc: 'Sistemi di climatizzazione ed impianti di condizionamento ad alta efficienza con split a parete e unità esterne, illuminazione moderna e cablaggi strutturati.',
    img: '/servizi/climatizzazione.jpg',
    alt: 'Impianti di condizionamento e climatizzazione',
  },
  {
    code: '06',
    tag: 'Green Future',
    title: 'Energie Rinnovabili: Idroelettrico ed Eolico',
    desc: "Sviluppo e progettazione di sistemi alimentati da fonti rinnovabili come micro-idroelettrico e minieolico per un'autonomia sostenibile.",
    img: '/servizi/idroelettrico.jpg',
    alt: 'Energie rinnovabili: idroelettrico ed eolico',
  },
];

export const why = {
  title: 'Perché Scegliere EOS Impianti',
  subtitle: 'Un unico referente per trasformare le tue esigenze in soluzioni affidabili e durature',
  items: [
    // TODO(EOS): confermare "20+ anni" (dato ripreso dal prototipo).
    { value: '20+', label: 'Anni di esperienza', text: 'Competenza consolidata nel settore civile e industriale.' },
    { value: '100%', label: 'Su Misura', text: "Progetti nati dall'analisi dei consumi reali." },
    { value: '1', label: 'Unico Referente', text: 'Dalla prima consulenza alla manutenzione nel tempo.' },
    {
      value: 'AL–GE',
      label: 'Radicamento & Operatività',
      text: 'Solido radicamento tra Alessandria e Genova, e non solo con operatività su tutto il territorio.',
    },
  ],
};

export const calc = {
  kicker: 'Strumento Interattivo',
  title: 'Ottimizzatore Fotovoltaico & Accumulo EOSolar',
  sub: 'Calcola il dimensionamento ideale (kWp + Batteria) sui tuoi consumi reali.',
  text: "Inserisci i tuoi consumi energetici e scopri la stima precisa della combinazione ottimale di pannelli e accumulo che massimizza il risparmio e il rientro dell'investimento a 25 anni.",
  note: 'Risultato personalizzato su profili F1/F2/F3, irraggiamento satellitare e modello finanziario DCF.',
  cta: 'Accedi al Calcolatore Fotovoltaico',
  outputs: ['Potenza ideale (kWp)', 'Capacità di accumulo (kWh)', "Rientro dell'investimento (anni)"],
};

export const contact = {
  title: 'Hai un progetto in mente?',
  text: 'Raccontaci le tue esigenze. EOS Impianti è al tuo fianco per ogni soluzione elettrica e tecnologica.',
  formTitle: 'Richiedi una Consulenza',
  submit: 'Invia Richiesta',
};

export const nav = [
  { href: '#servizi', label: 'Servizi' },
  { href: '#perche-eos', label: 'Perché EOS' },
  { href: '#calcolatore', label: 'Calcolatore' },
  { href: '#contatti', label: 'Contatti' },
];
