import { describe, expect, it } from 'vitest';
import { checkAdminPassword } from './admin';

describe('password parametri avanzati', () => {
  it('accetta la password di default e rifiuta le altre', () => {
    expect(checkAdminPassword('admin')).toBe(true);
    expect(checkAdminPassword('  admin ')).toBe(true);
    expect(checkAdminPassword('Admin')).toBe(false);
    expect(checkAdminPassword('')).toBe(false);
  });
});
