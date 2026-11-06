// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// The resume stylesheets keep fixed URLs in public/, so links carry a hash of their contents
// (see src/lib/resumeStyles.ts) and change exactly when the styles do.
process.env.PUBLIC_RESUME_STYLES_VERSION = createHash('sha256')
  .update(['resume.css', 'print.css', 'single-page-resume.css']
    .map((file) => readFileSync(new URL(`./public/${file}`, import.meta.url), 'utf8'))
    .join('\n'))
  .digest('hex')
  .slice(0, 10);

// https://astro.build/config
export default defineConfig({
  site: 'https://resumevibe.takovibe.com',
  trailingSlash: 'never',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  security: {
    checkOrigin: false
  },
  integrations: [react(), sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname.replace(/\/$/, '');
      return !['/profile', '/404'].includes(pathname) && !pathname.endsWith('/edit');
    },
    serialize: (item) => {
      const url = new URL(item.url);
      return {
        ...item,
        url: url.pathname === '/' ? url.href : url.href.replace(/\/$/, ''),
      };
    },
  })],
  server: {
    host: false,
    port: process.env.PORT ? parseInt(process.env.PORT) : 4322,
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
