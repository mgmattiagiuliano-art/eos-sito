import type { ImageMetadata } from 'astro';
import lavoro1 from '../assets/lavori/lavoro1.jpg';
import lavoro2 from '../assets/lavori/lavoro2.jpg';
import lavoro3 from '../assets/lavori/lavoro3.jpg';
import lavoro4 from '../assets/lavori/lavoro4.jpg';
import lavoro5 from '../assets/lavori/lavoro5.jpg';
import lavoro6 from '../assets/lavori/lavoro6.jpg';
import lavoro7 from '../assets/lavori/lavoro7.jpg';
import lavoro8 from '../assets/lavori/lavoro8.jpg';

export interface GalleryItem {
  image: ImageMetadata;
  // TODO(EOS): descrizioni reali dei lavori (tipo di impianto, località) per alt e didascalia lightbox.
  alt: string;
  /** Posizione nel mosaico desktop (4 colonne × 4 righe). */
  area: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
}

/**
 * Righe 1–2: le verticali (1, 2) occupano due righe, la 3 (orizzontale) due colonne.
 * Righe 3–4: la 6 (orizzontale) grande al centro, le verticali 7 e 8 ai lati.
 */
export const gallery: GalleryItem[] = [
  { image: lavoro1, alt: 'Lavoro realizzato da EOS Impianti — foto 1', area: 'a' },
  { image: lavoro3, alt: 'Lavoro realizzato da EOS Impianti — foto 3', area: 'b' },
  { image: lavoro2, alt: 'Lavoro realizzato da EOS Impianti — foto 2', area: 'c' },
  { image: lavoro4, alt: 'Lavoro realizzato da EOS Impianti — foto 4', area: 'd' },
  { image: lavoro5, alt: 'Lavoro realizzato da EOS Impianti — foto 5', area: 'e' },
  { image: lavoro7, alt: 'Ingresso di un cimitero con mezzi di cantiere al lavoro sulla copertura dei loculi', area: 'f' },
  { image: lavoro6, alt: 'Tecnico con imbracatura di sicurezza e sollevatore telescopico in un cantiere su una copertura', area: 'h' },
  { image: lavoro8, alt: 'Sollevatore telescopico al lavoro lungo la facciata di un capannone industriale', area: 'g' },
];
