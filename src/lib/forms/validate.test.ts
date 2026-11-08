import { describe, expect, it } from 'vitest';
import { CV_MAX_BYTES, validateCv, validateEmail, validatePhone } from './validate';

describe('validateCv', () => {
  it('accetta PDF, DOC e DOCX entro 5 MB', () => {
    expect(validateCv({ name: 'cv.pdf', size: 1000, type: 'application/pdf' })).toBe('');
    expect(validateCv({ name: 'CV.DOCX', size: 1000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe('');
    expect(validateCv({ name: 'cv.doc', size: 1000, type: '' })).toBe('');
    expect(validateCv({ name: 'cv.pdf', size: CV_MAX_BYTES, type: 'application/pdf' })).toBe('');
  });

  it('rifiuta file mancanti, troppo grandi o di tipo errato', () => {
    expect(validateCv(null)).toMatch(/Carica/);
    expect(validateCv({ name: 'cv.pdf', size: CV_MAX_BYTES + 1, type: 'application/pdf' })).toMatch(/5 MB/);
    expect(validateCv({ name: 'cv.exe', size: 10, type: 'application/x-msdownload' })).toMatch(/Formato/);
    expect(validateCv({ name: 'cv.pdf', size: 10, type: 'image/png' })).toMatch(/Formato/);
  });
});

describe('email e telefono', () => {
  it('email', () => {
    expect(validateEmail('mario@esempio.it')).toBe('');
    expect(validateEmail('mario@esempio')).not.toBe('');
  });
  it('telefono', () => {
    expect(validatePhone('+39 333 123 4567')).toBe('');
    expect(validatePhone('abc')).not.toBe('');
  });
});
