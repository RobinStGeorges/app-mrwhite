import wordsFile from '../content/mots.json';
import { DEFAULT_RULES, createGame, type GameConfig, type GameState } from './engine';
import { setGame } from './gameStore';
import { getRecentPairs, setLastConfig, setRecentPairs } from './prefs';
import { filterPairs, pickPair, pushRecent, type MrWhiteSettings, type WordsFile } from './words';

export const WORDS = wordsFile as WordsFile;

/** Crée et mémorise une nouvelle partie : tire une paire de mots (sans répétition récente). */
export function startNewGame(config: GameConfig, settings: MrWhiteSettings): GameState {
  const pool = filterPairs(WORDS.pairs, settings);
  const recent = getRecentPairs();
  const pair = pickPair(pool, recent); // lève une erreur claire si le paquet est vide
  const state = createGame(config, { ...DEFAULT_RULES, spyKnowsRole: settings.spyKnowsRole }, pair);
  setGame(state);
  setRecentPairs(pushRecent(recent, pair.id, pool.length));
  setLastConfig(config);
  return state;
}
