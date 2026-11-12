import { writable } from 'svelte/store';

/** Vrai quand une nouvelle version de l'application est prête à être installée. */
export const needRefresh = writable(false);

let updater: () => void = () => {};
export function setUpdater(fn: () => void): void {
  updater = fn;
}
export function applyUpdate(): void {
  updater();
}
