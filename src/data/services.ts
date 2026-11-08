import type { ImageMetadata } from 'astro';
import domotica from '../assets/servizi/domotica.avif';
import industriale from '../assets/servizi/industriale.avif';
import fotovoltaico from '../assets/servizi/fotovoltaico.avif';
import antifurto from '../assets/servizi/antifurto.avif';
import climatizzazione from '../assets/servizi/climatizzazione.avif';
import idroelettrico from '../assets/servizi/idroelettrico.avif';

export interface Service {
  tag: string;
  title: string;
  description: string;
  image: ImageMetadata;
  alt: string;
}

export const services: Service[] = [
  {
    tag: 'Civili e domotica',
    title: 'Impianti elettrici civili e domotica',
    description:
      'Soluzioni sicure e affidabili per abitazioni, ville e condomini. Progettiamo sistemi integrati con domotica, illuminazione e gestione dei consumi.',
    image: domotica,
    alt: 'Impianto elettrico civile con controllo domotico',
  },
  {
    tag: 'Alta potenza',
    title: 'Impianti elettrici industriali',
    description:
      'Energia affidabile per aziende, capannoni e stabilimenti produttivi. Quadri di distribuzione e linee di potenza per garantire continuità operativa.',
    image: industriale,
    alt: 'Quadro elettrico industriale',
  },
  {
    tag: 'Rinnovabili',
    title: 'Impianti fotovoltaici su misura',
    description:
      'Produci la tua energia e dipendi meno dai costi energetici. Ci occupiamo di analisi, pratiche, installazione, accumulo e colonnine di ricarica.',
    image: fotovoltaico,
    alt: 'Pannelli fotovoltaici installati su un tetto',
  },
  {
    tag: 'Sicurezza',
    title: 'Sistemi di sicurezza e allarmi',
    description:
      'Installiamo antifurto, videosorveglianza IP e impianti antincendio, valutando il livello di protezione richiesto.',
    image: antifurto,
    alt: 'Telecamera di videosorveglianza',
  },
  {
    tag: 'Tecnologia e comfort',
    title: 'Climatizzazione, illuminazione e reti dati',
    description:
      'Climatizzazione ad alta efficienza con split a parete e unità esterne, illuminazione moderna e cablaggi strutturati.',
    image: climatizzazione,
    alt: 'Climatizzatore installato a parete',
  },
  {
    tag: 'Green future',
    title: 'Energie rinnovabili: idroelettrico ed eolico',
    description:
      'Progettazione e realizzazione di sistemi alimentati da fonti rinnovabili come micro-idroelettrico e minieolico.',
    image: idroelettrico,
    alt: 'Impianto di produzione da fonte rinnovabile',
  },
];
