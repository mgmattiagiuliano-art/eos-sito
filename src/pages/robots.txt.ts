import type { APIRoute } from 'astro';

/** robots.txt generato al build: l'URL della sitemap segue `site` (PUBLIC_SITE_URL). */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
