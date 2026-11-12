import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // L'app est servie sous https://lepetitperchoir.fr/mrwhite/ par le routeur.
  base: '/mrwhite/',
  server: { port: 5175 },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      manifest: false,
      workbox: {
        navigateFallback: '/mrwhite/index.html',
        navigateFallbackAllowlist: [/^\/mrwhite\/(index\.html)?$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
