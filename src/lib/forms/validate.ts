/** Validazioni lato client dei form (pure, testate). */

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;
const CV_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Messaggio d'errore per il CV, o stringa vuota se valido. */
export function validateCv(file: { name: string; size: number; type: string } | null | undefined): string {
  if (!file || file.size === 0) return 'Carica il tuo curriculum.';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extOk = (CV_EXTENSIONS as readonly string[]).includes(ext);
  // alcuni browser non valorizzano il MIME dei .doc: in quel caso decide l'estensione
  const mimeOk = file.type === '' || CV_MIME.has(file.type);
  if (!extOk || !mimeOk) return 'Formato non supportato: carica un file PDF, DOC o DOCX.';
  if (file.size > CV_MAX_BYTES) return 'Il file supera i 5 MB: comprimilo o caricane una versione più leggera.';
  return '';
}

export function validateEmail(value: string): string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'Inserisci un indirizzo email valido.';
}

export function validateRequired(value: string, label: string): string {
  return value.trim() ? '' : `Il campo «${label}» è obbligatorio.`;
}

export function validatePhone(value: string): string {
  const digits = value.replace(/[\s.\-/()+]/g, '');
  return /^\d{6,15}$/.test(digits) ? '' : 'Inserisci un numero di telefono valido.';
}
