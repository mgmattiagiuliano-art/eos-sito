/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_FORMS_PROVIDER?: 'local' | 'netlify' | 'endpoint';
  readonly PUBLIC_FORMS_ENDPOINT?: string;
  readonly PUBLIC_FORMS_SIMULATE_ERROR?: string;
  readonly PUBLIC_EOSOLAR_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
