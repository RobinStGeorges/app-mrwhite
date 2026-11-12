import { get, writable } from 'svelte/store';
import { EngineError, type GameState } from './engine';

// La partie en cours reste sur CET appareil (le téléphone qui circule) : si la page est
// rechargée ou fermée par Android, on peut reprendre. Seul le résultat final part en ligne.
const KEY = 'mrwhite.partie.v1';

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.version === 1 && Array.isArray(s.slots) && Array.isArray(s.players) && typeof s.phase === 'string') {
      return s as GameState;
    }
  } catch {
    /* données illisibles : on repart de zéro */
  }
  return null;
}

export const game = writable<GameState | null>(load());

export function setGame(state: GameState | null): void {
  game.set(state);
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage plein ou indisponible : la partie reste en mémoire */
  }
}

/** Applique une transition du moteur. Renvoie un message d'erreur, ou null si tout va bien. */
export function act(transition: (s: GameState) => GameState): string | null {
  const current = get(game);
  if (!current) return 'Aucune partie en cours.';
  try {
    setGame(transition(current));
    return null;
  } catch (e) {
    return e instanceof EngineError ? e.message : 'Action impossible.';
  }
}
