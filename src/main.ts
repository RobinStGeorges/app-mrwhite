import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import 'famille-core/theme.css';
import './app.css';
import { initFamille, initTheme } from 'famille-core';
import App from './App.svelte';
import { needRefresh, setUpdater } from './lib/update';

initTheme();

initFamille({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.set(true);
  },
});
setUpdater(() => updateSW(true));

mount(App, { target: document.getElementById('app')! });
