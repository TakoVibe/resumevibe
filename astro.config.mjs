// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

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
