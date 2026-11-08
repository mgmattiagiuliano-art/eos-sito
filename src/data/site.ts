/**
 * Dati aziendali: unica fonte di verità per header, footer, contatti, JSON-LD e pagine legali.
 * Non inventare dati: ciò che manca è marcato TODO(EOS).
 */

export const company = {
  legalName: 'EOS Impianti s.n.c.',
  shortName: 'EOS Impianti',
  vatNumber: '02164950061',
  phone: {
    display: '+39 0143 677895',
    href: 'tel:+390143677895',
    e164: '+390143677895',
  },
  email: 'info@eosimpianti.it',
  address: {
    street: 'Loc. Fornace 2',
    postalCode: '15060',
    locality: 'Vignole Borbera',
    province: 'AL',
    region: 'Piemonte',
    country: 'IT',
  },
  // TODO(EOS): verificare le coordinate esatte della sede (valori presi dal prototipo).
  geo: { latitude: 44.7139, longitude: 8.8924 },
  areaServed: ['Provincia di Alessandria', 'Genova', 'Piemonte', 'Liguria', 'Italia'],
  description:
    'Progettazione e realizzazione di impianti elettrici civili e industriali, fotovoltaico con accumulo, micro-idroelettrico, minieolico, domotica, sicurezza, climatizzazione e reti dati.',
} as const;

export const fullAddress = `${company.address.street}, ${company.address.postalCode} ${company.address.locality} (${company.address.province})`;

export const seo = {
  defaultTitle: 'EOS Impianti s.n.c. — Impianti elettrici, fotovoltaico e domotica',
  titleTemplate: (page: string) => `${page} | EOS Impianti s.n.c.`,
  // TODO(EOS): confermare "oltre 20 anni" di attività (ripreso dal prototipo).
  defaultDescription:
    'Impianti elettrici civili e industriali, fotovoltaico con accumulo, domotica e sicurezza tra Alessandria e Genova, con interventi su tutto il territorio nazionale.',
  ogImage: '/og-image.jpg',
  locale: 'it_IT',
} as const;

export interface NavItem {
  label: string;
  href: string;
  cta?: boolean;
}

/** Ancore della home. Le href sono assolute ("/#…") così funzionano anche da privacy, cookie e 404. */
export const nav: NavItem[] = [
  { label: 'Servizi', href: '/#servizi' },
  { label: 'Perché EOS', href: '/#perche-eos' },
  { label: 'Lavori', href: '/#lavori' },
  { label: 'Calcolatore solare', href: '/#calcolatore' },
  { label: 'Lavora con noi', href: '/#lavora-con-noi' },
  { label: 'Contattaci', href: '/#contatti', cta: true },
];

export const legalLinks = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Cookie policy', href: '/cookie' },
] as const;
