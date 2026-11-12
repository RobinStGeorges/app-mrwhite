import { writable } from 'svelte/store';

export const toast = writable('');
let timer: ReturnType<typeof setTimeout> | undefined;

export function showError(message: string): void {
  toast.set(message);
  clearTimeout(timer);
  timer = setTimeout(() => toast.set(''), 6000);
}
