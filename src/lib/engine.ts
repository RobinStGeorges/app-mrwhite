// Moteur de jeu Mr White : logique pure, sans interface ni Firebase.
// Toutes les transitions renvoient un NOUVEL état (l'état d'entrée n'est jamais modifié).

export type Role = 'civil' | 'spy' | 'white';
export type Phase = 'assign' | 'play' | 'vote' | 'reveal' | 'finished';
export type Winner = 'civils' | 'evil' | 'white';
export type Rng = () => number;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const MAX_NAME_LENGTH = 20;

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface GameConfig {
  total: number;
  civils: number;
  spies: number;
  whites: number;
}

/** Variantes de règles : tout ce qui peut changer d'une partie à l'autre est ici. */
export interface RuleOptions {
  spyKnowsRole: boolean; // l'espion sait-il qu'il est espion ?
  civilWinPoints: number; // par civil encore en jeu quand les civils gagnent
  evilWinPoints: number; // par méchant encore en jeu quand les méchants gagnent
  whiteGuessPoints: number; // Mr White qui devine le mot
}

export const DEFAULT_RULES: RuleOptions = {
  spyKnowsRole: false,
  civilWinPoints: 10,
  evilWinPoints: 5,
  whiteGuessPoints: 10,
};

export interface GamePair {
  id: string;
  categorie: string;
  niveau: number;
  civil: string; // mot des civils (tiré au sort parmi les deux mots de la paire)
  spy: string; // mot des espions
}

export interface Slot {
  role: Role;
  name: string | null; // renseigné quand un joueur prend la case
}

export interface Player {
  key: string;
  name: string;
  role: Role;
  alive: boolean;
  order: number; // ordre de passage (0 tant que la partie n'a pas commencé)
  eliminatedRound: number | null;
}

export interface Elimination {
  round: number;
  key: string;
  role: Role;
  guess?: string | null; // proposition de Mr White
  guessCorrect?: boolean;
}

export interface GameResult {
  winner: Winner;
  points: Record<string, number>; // points gagnés dans cette partie, par joueur
  won: Record<string, boolean>; // le joueur fait-il partie des vainqueurs ?
}

export interface GameState {
  version: 1;
  id: string;
  startedAt: number;
  phase: Phase;
  config: GameConfig;
  rules: RuleOptions;
  pair: GamePair;
  slots: Slot[];
  players: Player[];
  revealing: number | null; // case dont le joueur consulte son rôle en ce moment
  round: number;
  roundStartedAt: number | null; // début de la discussion du tour
  pending: Elimination | null; // élimination en cours de révélation
  eliminations: Elimination[];
  result: GameResult | null;
  saved: boolean; // résultat déjà envoyé en ligne
}

// ---------- Outils ----------

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Minuscules, sans accents ni ponctuation. */
export function normalizeText(input: string): string {
  return input
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LEADING_ARTICLE = /^(?:(?:le|la|les|un|une|des|du)\s+|l'\s*|d'\s*)/;

function normalizeGuess(input: string): string {
  return normalizeText(input).replace(LEADING_ARTICLE, '').trim();
}

/** Le mot proposé est-il le bon ? Tolère majuscules, accents, tirets et article initial. */
export function matchesWord(guess: string, word: string): boolean {
  const g = normalizeGuess(guess);
  return g !== '' && g === normalizeGuess(word);
}

/** Prénom propre : espaces normalisés, 20 caractères max, première lettre en majuscule. */
export function cleanPlayerName(raw: string): string {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH).trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}

/** Clé stable d'un joueur : « Éloïse » et « eloise » désignent la même personne. */
export function nameKey(name: string): string {
  const key = normalizeText(name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return key || 'joueur';
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function makeId(rng: Rng): string {
  let id = '';
  for (let i = 0; i < 20; i++) id += ID_CHARS[Math.floor(rng() * ID_CHARS.length)];
  return id;
}

// ---------- Configuration ----------

/** Renvoie un message d'erreur en français, ou null si la configuration est valide. */
export function validateConfig(c: GameConfig): string | null {
  const nums = [c.total, c.civils, c.spies, c.whites];
  if (!nums.every((n) => Number.isInteger(n)) || c.civils < 0 || c.spies < 0 || c.whites < 0) {
    return 'Valeurs invalides.';
  }
  if (c.total < MIN_PLAYERS) return `Il faut au moins ${MIN_PLAYERS} joueurs.`;
  if (c.total > MAX_PLAYERS) return `Maximum ${MAX_PLAYERS} joueurs.`;
  const sum = c.civils + c.spies + c.whites;
  if (sum !== c.total) {
    return `Les rôles totalisent ${sum} joueur${sum > 1 ? 's' : ''} au lieu de ${c.total}.`;
  }
  if (c.civils < 1) return 'Il faut au moins un civil.';
  if (c.spies + c.whites < 1) return 'Il faut au moins un espion ou un Mr White.';
  // L'égalité est permise (ex. 2 civils, 1 espion, 1 Mr White) : les conditions de victoire
  // ne sont vérifiées qu'après chaque élimination. En revanche, plus de méchants que de civils
  // rendrait la partie injouable d'emblée.
  if (c.spies + c.whites > c.civils) {
    return "Il y a plus d'espions et de Mr White que de civils : la partie serait perdue d'avance pour les civils.";
  }
  return null;
}

// ---------- Création et distribution ----------

export function createGame(
  config: GameConfig,
  rules: RuleOptions,
  pair: { id: string; a: string; b: string; categorie: string; niveau: number },
  rng: Rng = Math.random,
  now: number = Date.now(),
): GameState {
  const error = validateConfig(config);
  if (error) throw new EngineError(error);

  const swap = rng() < 0.5;
  const roles: Role[] = shuffle(
    [
      ...Array<Role>(config.civils).fill('civil'),
      ...Array<Role>(config.spies).fill('spy'),
      ...Array<Role>(config.whites).fill('white'),
    ],
    rng,
  );

  return {
    version: 1,
    id: makeId(rng),
    startedAt: now,
    phase: 'assign',
    config: { ...config },
    rules: { ...rules },
    pair: {
      id: pair.id,
      categorie: pair.categorie,
      niveau: pair.niveau,
      civil: swap ? pair.b : pair.a,
      spy: swap ? pair.a : pair.b,
    },
    slots: roles.map((role) => ({ role, name: null })),
    players: [],
    revealing: null,
    round: 1,
    roundStartedAt: null,
    pending: null,
    eliminations: [],
    result: null,
    saved: false,
  };
}

/** Un joueur choisit une case et donne son prénom : son rôle lui sera alors révélé. */
export function claimSlot(state: GameState, index: number, rawName: string): GameState {
  if (state.phase !== 'assign') throw new EngineError("La distribution des rôles est terminée.");
  if (state.revealing !== null) throw new EngineError('Un joueur consulte encore son rôle.');
  const slot = state.slots[index];
  if (!slot) throw new EngineError('Case inconnue.');
  if (slot.name !== null) throw new EngineError('Cette case est déjà prise.');

  const name = cleanPlayerName(rawName);
  if (!name) throw new EngineError('Saisissez un prénom.');
  const key = nameKey(name);
  if (state.players.some((p) => p.key === key)) {
    throw new EngineError('Ce prénom est déjà utilisé dans cette partie.');
  }

  const s = structuredClone(state);
  s.slots[index].name = name;
  s.players.push({ key, name, role: slot.role, alive: true, order: 0, eliminatedRound: null });
  s.revealing = index;
  return s;
}

export interface RevealInfo {
  role: Role;
  word: string | null; // null pour Mr White
  showRole: boolean; // faut-il annoncer le rôle ? (toujours pour Mr White, selon la règle pour l'espion)
}

/** Ce que le joueur de la case voit sur son écran. */
export function revealFor(state: GameState, index: number): RevealInfo {
  const role = state.slots[index].role;
  if (role === 'white') return { role, word: null, showRole: true };
  if (role === 'spy') return { role, word: state.pair.spy, showRole: state.rules.spyKnowsRole };
  return { role, word: state.pair.civil, showRole: false };
}

/** Le joueur a mémorisé son rôle : on revient à la sélection des cases. */
export function ackReveal(state: GameState): GameState {
  if (state.revealing === null) return state;
  const s = structuredClone(state);
  s.revealing = null;
  return s;
}

/** Tous les rôles sont distribués : on tire l'ordre de passage au sort. */
export function beginPlay(state: GameState, rng: Rng = Math.random): GameState {
  if (state.phase !== 'assign') throw new EngineError('La partie a déjà commencé.');
  if (state.revealing !== null) throw new EngineError('Un joueur consulte encore son rôle.');
  if (state.slots.some((slot) => slot.name === null)) {
    throw new EngineError('Tous les joueurs doivent avoir découvert leur rôle.');
  }
  const s = structuredClone(state);
  s.players = shuffle(s.players, rng).map((p, i) => ({ ...p, order: i + 1 }));
  s.phase = 'play';
  s.round = 1;
  s.roundStartedAt = null;
  return s;
}

// ---------- Déroulement ----------

export function startDiscussion(state: GameState, now: number = Date.now()): GameState {
  if (state.phase !== 'play') throw new EngineError('Action impossible maintenant.');
  const s = structuredClone(state);
  s.roundStartedAt = now;
  return s;
}

export function openVote(state: GameState): GameState {
  if (state.phase !== 'play' || state.roundStartedAt === null) {
    throw new EngineError('Lancez d\'abord la discussion.');
  }
  const s = structuredClone(state);
  s.phase = 'vote';
  return s;
}

export function cancelVote(state: GameState): GameState {
  if (state.phase !== 'vote') return state;
  const s = structuredClone(state);
  s.phase = 'play';
  return s;
}

/** Élimine un joueur (après confirmation) : son rôle sera révélé à tous. */
export function eliminate(state: GameState, key: string): GameState {
  if (state.phase !== 'vote') throw new EngineError('Aucun vote en cours.');
  const s = structuredClone(state);
  const player = s.players.find((p) => p.key === key);
  if (!player || !player.alive) throw new EngineError('Ce joueur n\'est plus en jeu.');
  player.alive = false;
  player.eliminatedRound = s.round;
  s.pending = { round: s.round, key, role: player.role };
  s.phase = 'reveal';
  return s;
}

/** Mr White éliminé propose un mot (null = il ne sait pas). */
export function submitGuess(state: GameState, guess: string | null): GameState {
  if (state.phase !== 'reveal' || !state.pending || state.pending.role !== 'white') {
    throw new EngineError('Aucune proposition attendue.');
  }
  if (state.pending.guessCorrect !== undefined) throw new EngineError('Proposition déjà faite.');
  const s = structuredClone(state);
  const clean = guess ? guess.trim() : '';
  s.pending!.guess = clean || null;
  s.pending!.guessCorrect = clean ? matchesWord(clean, s.pair.civil) : false;
  return s;
}

/** Qui a gagné, d'après les joueurs encore en jeu ? null si la partie continue. */
export function checkOutcome(players: readonly Player[]): 'civils' | 'evil' | null {
  const civils = players.filter((p) => p.alive && p.role === 'civil').length;
  const evil = players.filter((p) => p.alive && p.role !== 'civil').length;
  if (evil === 0) return 'civils';
  if (civils <= evil) return 'evil';
  return null;
}

export function computeResult(
  players: readonly Player[],
  winner: Winner,
  rules: RuleOptions,
  whiteKey?: string,
): GameResult {
  const points: Record<string, number> = {};
  const won: Record<string, boolean> = {};
  for (const p of players) {
    let pts = 0;
    let w = false;
    if (winner === 'civils') {
      w = p.role === 'civil';
      pts = w && p.alive ? rules.civilWinPoints : 0;
    } else if (winner === 'evil') {
      w = p.role !== 'civil';
      pts = w && p.alive ? rules.evilWinPoints : 0;
    } else {
      w = p.key === whiteKey;
      pts = w ? rules.whiteGuessPoints : 0;
    }
    points[p.key] = pts;
    won[p.key] = w;
  }
  return { winner, points, won };
}

/** Fin de la révélation : on vérifie les conditions de victoire, sinon nouveau tour. */
export function continueAfterReveal(state: GameState): GameState {
  if (state.phase !== 'reveal' || !state.pending) throw new EngineError('Rien à poursuivre.');
  const pending = state.pending;
  if (pending.role === 'white' && pending.guessCorrect === undefined) {
    throw new EngineError('Mr White doit d\'abord proposer un mot.');
  }

  const s = structuredClone(state);
  s.eliminations.push(pending);
  s.pending = null;

  const winner: Winner | null =
    pending.role === 'white' && pending.guessCorrect ? 'white' : checkOutcome(s.players);

  if (winner) {
    s.result = computeResult(s.players, winner, s.rules, winner === 'white' ? pending.key : undefined);
    s.phase = 'finished';
  } else {
    s.round += 1;
    s.roundStartedAt = null;
    s.phase = 'play';
  }
  return s;
}

export function markSaved(state: GameState): GameState {
  return { ...state, saved: true };
}

/** Joueurs encore en jeu, dans l'ordre de passage. */
export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}
