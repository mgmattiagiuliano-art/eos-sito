/**
 * Accesso ai parametri avanzati del calcolatore (costi, parametri tecnici, fisco).
 *
 * ATTENZIONE: il sito è statico, quindi il controllo avviene nel browser e la password è
 * leggibile da chi ispeziona il codice della pagina. Serve a evitare modifiche accidentali
 * da parte dei visitatori, NON è una protezione di sicurezza. Per una protezione vera
 * servirebbe una verifica lato server (funzione dell'host).
 */

// TODO(EOS): password provvisoria richiesta dal cliente; sovrascrivibile con PUBLIC_EOSOLAR_ADMIN_PASSWORD.
const DEFAULT_ADMIN_PASSWORD = 'admin';

export function adminPassword(): string {
  const fromEnv = import.meta.env.PUBLIC_EOSOLAR_ADMIN_PASSWORD;
  return typeof fromEnv === 'string' && fromEnv !== '' ? fromEnv : DEFAULT_ADMIN_PASSWORD;
}

/** Confronto esatto (gli spazi iniziali/finali vengono ignorati). */
export function checkAdminPassword(input: string): boolean {
  return input.trim() === adminPassword();
}
