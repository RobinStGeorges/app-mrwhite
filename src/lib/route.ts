import { writable } from 'svelte/store';
import { parseHash, type Route } from './nav';

export const route = writable<Route>(parseHash(location.hash));
window.addEventListener('hashchange', () => route.set(parseHash(location.hash)));

export function go(hash: string): void {
  location.hash = hash;
}
