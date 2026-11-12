import type { Rng } from './engine';
import { EngineError } from './engine';

export interface WordPair {
  id: string;
  a: string;
  b: string;
  categorie: string;
  niveau: number; // 1 = facile, 2 = moyen, 3 = difficile (mots très proches)
}

export interface WordCategory {
  id: string;
  label: string;
}

export interface WordsFile {
  version: number;
  categories: WordCategory[];
  pairs: WordPair[];
}

export interface MrWhiteSettings {
  spyKnowsRole: boolean;
  levels: number[]; // niveaux de difficulté autorisés
  categories: string[]; // vide = toutes les catégories
}

export const DEFAULT_SETTINGS: MrWhiteSettings = {
  spyKnowsRole: false,
  levels: [1, 2, 3],
  categories: [],
};

export const LEVEL_LABELS: Record<number, string> = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' };

export function parseSettings(data: Record<string, unknown> | undefined): MrWhiteSettings {
  if (!data) return { ...DEFAULT_SETTINGS, levels: [...DEFAULT_SETTINGS.levels] };
  const levels = Array.isArray(data.levels)
    ? data.levels.filter((n): n is number => n === 1 || n === 2 || n === 3)
    : [...DEFAULT_SETTINGS.levels];
  const categories = Array.isArray(data.categories)
    ? data.categories.filter((c): c is string => typeof c === 'string')
    : [];
  return {
    spyKnowsRole: data.spyKnowsRole === true,
    levels: levels.length > 0 ? levels : [...DEFAULT_SETTINGS.levels],
    categories,
  };
}

export function filterPairs(pairs: readonly WordPair[], settings: MrWhiteSettings): WordPair[] {
  return pairs.filter(
    (p) =>
      settings.levels.includes(p.niveau) &&
      (settings.categories.length === 0 || settings.categories.includes(p.categorie)),
  );
}

/** Tire une paire en évitant celles jouées récemment (si possible). */
export function pickPair(pool: readonly WordPair[], recent: readonly string[], rng: Rng = Math.random): WordPair {
  if (pool.length === 0) throw new EngineError('Aucune paire de mots ne correspond aux réglages.');
  const fresh = pool.filter((p) => !recent.includes(p.id));
  const list = fresh.length > 0 ? fresh : pool;
  return list[Math.floor(rng() * list.length)];
}

/** Ajoute une paire à l'historique récent (60 % du paquet au plus, 80 paires max). */
export function pushRecent(recent: readonly string[], id: string, poolSize: number): string[] {
  const cap = Math.max(1, Math.min(80, Math.floor(poolSize * 0.6)));
  return [...recent.filter((r) => r !== id), id].slice(-cap);
}
