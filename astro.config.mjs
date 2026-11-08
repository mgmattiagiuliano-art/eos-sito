// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// URL pubblico del sito: serve per canonical, sitemap e URL assoluti di og:image / JSON-LD.
// TODO(EOS): confermare il dominio definitivo (default ricavato dall'email info@eosimpianti.it).
const site = env.PUBLIC_SITE_URL || 'https://www.eosimpianti.it';

const provider = env.PUBLIC_FORMS_PROVIDER || 'local';
if (process.argv.includes('build') && provider === 'local') {
  console.warn(
    '\n[eos] PUBLIC_FORMS_PROVIDER non impostato (o "local"): in questa build i form NON inviano dati a nessun backend.\n' +
      '      Per la produzione imposta PUBLIC_FORMS_PROVIDER=netlify oppure =endpoint (vedi .env.example).\n',
  );
}

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
