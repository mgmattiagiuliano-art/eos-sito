// @ts-check
import { defineConfig } from 'astro/config';

// Output statico, nessun adapter: gira con `npm run dev` anche su StackBlitz (WebContainers).
export default defineConfig({
  output: 'static',
});
