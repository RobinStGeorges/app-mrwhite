import { describe, expect, test } from 'vitest';
import wordsFile from '../src/content/mots.json';
import { filterPairs, parseSettings, pickPair, pushRecent, DEFAULT_SETTINGS, type WordsFile } from '../src/lib/words';
import { normalizeText } from '../src/lib/engine';
import { parseHash } from '../src/lib/nav';

const words = wordsFile as WordsFile;

describe('base de mots', () => {
  test('structure valide : identifiants uniques, mots différents, catégories connues, niveaux 1-3', () => {
    const cats = new Set(words.categories.map((c) => c.id));
    const ids = new Set<string>();
    for (const p of words.pairs) {
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
      expect(normalizeText(p.a)).not.toBe(normalizeText(p.b));
      expect(cats.has(p.categorie), p.id).toBe(true);
      expect([1, 2, 3]).toContain(p.niveau);
      expect(p.a.trim()).toBe(p.a);
      expect(p.b.trim()).toBe(p.b);
    }
    expect(words.pairs.length).toBeGreaterThan(200);
  });
  test('aucune paire en double, même inversée', () => {
    const seen = new Set<string>();
    for (const p of words.pairs) {
      const k = [normalizeText(p.a), normalizeText(p.b)].sort().join('|');
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });
  test('chaque catégorie contient des paires', () => {
    for (const c of words.categories) expect(words.pairs.some((p) => p.categorie === c.id), c.id).toBe(true);
  });
});

describe('filtres et tirage', () => {
  test('filtre par niveau et catégorie', () => {
    const f = filterPairs(words.pairs, { ...DEFAULT_SETTINGS, levels: [3], categories: ['animaux'] });
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((p) => p.niveau === 3 && p.categorie === 'animaux')).toBe(true);
  });
  test('aucune catégorie cochée = toutes', () => {
    expect(filterPairs(words.pairs, DEFAULT_SETTINGS)).toHaveLength(words.pairs.length);
  });
  test('évite les paires récentes', () => {
    const pool = words.pairs.slice(0, 5);
    const recent = pool.slice(0, 4).map((p) => p.id);
    for (let i = 0; i < 20; i++) expect(pickPair(pool, recent, Math.random).id).toBe(pool[4].id);
  });
  test('si tout est récent, on tire quand même', () => {
    const pool = words.pairs.slice(0, 3);
    expect(pickPair(pool, pool.map((p) => p.id)).id).toBeTruthy();
  });
  test('paquet vide : erreur claire', () => {
    expect(() => pickPair([], [])).toThrow(/Aucune paire/);
  });
  test('historique récent borné', () => {
    let r: string[] = [];
    for (let i = 0; i < 100; i++) r = pushRecent(r, `id${i}`, 10);
    expect(r).toHaveLength(6);
    expect(r[r.length - 1]).toBe('id99');
    expect(pushRecent(['a', 'b'], 'a', 100)).toEqual(['b', 'a']);
  });
});

describe('réglages et navigation', () => {
  test('réglages par défaut et lecture tolérante', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ spyKnowsRole: true, levels: [2, 9], categories: ['a', 3] })).toEqual({ spyKnowsRole: true, levels: [2], categories: ['a'] });
    expect(parseSettings({ levels: [] }).levels).toEqual([1, 2, 3]);
  });
  test('routes', () => {
    expect(parseHash('')).toBe('home');
    expect(parseHash('#/nouvelle')).toBe('setup');
    expect(parseHash('#/partie')).toBe('game');
    expect(parseHash('#/scores')).toBe('scores');
    expect(parseHash('#/historique')).toBe('history');
    expect(parseHash('#/reglages')).toBe('settings');
    expect(parseHash('#/nimporte')).toBe('home');
  });
});
