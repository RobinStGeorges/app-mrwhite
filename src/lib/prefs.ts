// Préférences locales à l'appareil (jamais envoyées en ligne).
import type { GameConfig } from './engine';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignoré */
  }
}

export const DEFAULT_CONFIG: GameConfig = { total: 5, civils: 3, spies: 1, whites: 1 };

export const getLastConfig = (): GameConfig => {
  const c = read<Partial<GameConfig>>('mrwhite.derniereConfig', {});
  return {
    total: Number.isInteger(c.total) ? (c.total as number) : DEFAULT_CONFIG.total,
    civils: Number.isInteger(c.civils) ? (c.civils as number) : DEFAULT_CONFIG.civils,
    spies: Number.isInteger(c.spies) ? (c.spies as number) : DEFAULT_CONFIG.spies,
    whites: Number.isInteger(c.whites) ? (c.whites as number) : DEFAULT_CONFIG.whites,
  };
};
export const setLastConfig = (c: GameConfig): void => write('mrwhite.derniereConfig', c);

export const getRecentPairs = (): string[] => read<string[]>('mrwhite.pairesRecentes', []);
export const setRecentPairs = (ids: string[]): void => write('mrwhite.pairesRecentes', ids);

export const getPreviousPlayers = (): string[] => read<string[]>('mrwhite.dernierJoueurs', []);
export const setPreviousPlayers = (names: string[]): void => write('mrwhite.dernierJoueurs', names);
