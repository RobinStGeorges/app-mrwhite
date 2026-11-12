import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Config dédiée aux tests (le fichier vite.config.ts, avec le plugin PWA, n'est pas utilisé ici).
export default defineConfig({
  plugins: [svelte()],
  resolve: { conditions: ['browser'] },
});
