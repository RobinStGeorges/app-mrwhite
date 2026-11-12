import { describe, expect, test } from 'vitest';
import {
  DEFAULT_RULES, EngineError, ackReveal, alivePlayers, beginPlay, cancelVote, checkOutcome, claimSlot,
  cleanPlayerName, continueAfterReveal, createGame, eliminate, matchesWord, nameKey, normalizeText,
  openVote, revealFor, shuffle, startDiscussion, submitGuess, validateConfig, computeResult,
  type GameConfig, type GameState, type Player, type Role,
} from '../src/lib/engine';

// Générateur pseudo-aléatoire déterministe (mulberry32)
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAIR = { id: 'chat--lion', a: 'Chat', b: 'Lion', categorie: 'animaux', niveau: 2 };
const cfg = (civils: number, spies: number, whites: number): GameConfig => ({ civils, spies, whites, total: civils + spies + whites });

/** Partie jusqu'à la phase de jeu, joueurs P1..Pn ; renvoie aussi la clé de chaque rôle. */
function setup(config: GameConfig, rules = DEFAULT_RULES, seed = 1): GameState {
  const rng = seeded(seed);
  let s = createGame(config, rules, PAIR, rng, 1000);
  for (let i = 0; i < config.total; i++) {
    s = claimSlot(s, i, `P${i + 1}`);
    s = ackReveal(s);
  }
  return beginPlay(s, rng);
}
const byRole = (s: GameState, role: Role) => s.players.filter((p) => p.role === role);
function vote(s: GameState, key: string): GameState {
  if (s.roundStartedAt === null) s = startDiscussion(s, 5000);
  return eliminate(openVote(s), key);
}

describe('configuration', () => {
  test('configurations valides', () => {
    expect(validateConfig(cfg(3, 1, 1))).toBeNull();
    expect(validateConfig(cfg(5, 1, 0))).toBeNull();
    expect(validateConfig(cfg(4, 1, 0))).toBeNull();
  });
  test('somme des rôles différente du total', () => {
    expect(validateConfig({ total: 6, civils: 3, spies: 1, whites: 1 })).toMatch(/totalisent 5 joueurs au lieu de 6/);
  });
  test('trop peu ou trop de joueurs', () => {
    expect(validateConfig(cfg(2, 0, 0))).toMatch(/au moins 3/);
    expect(validateConfig(cfg(15, 3, 3))).toMatch(/Maximum 20/);
  });
  test('il faut un civil et au moins un méchant', () => {
    expect(validateConfig(cfg(0, 2, 1))).toMatch(/au moins un civil/);
    expect(validateConfig(cfg(4, 0, 0))).toMatch(/espion ou un Mr White/);
  });
  test('les civils doivent être strictement plus nombreux que les méchants', () => {
    expect(validateConfig(cfg(2, 1, 1))).toMatch(/plus de civils/);
    expect(validateConfig(cfg(1, 1, 1))).toMatch(/plus de civils/);
  });
  test('valeurs non entières refusées', () => {
    expect(validateConfig({ total: 5, civils: 2.5, spies: 1, whites: 1.5 })).toBe('Valeurs invalides.');
  });
});

describe('distribution des rôles', () => {
  test('respecte exactement les quantités demandées (200 tirages)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = createGame(cfg(5, 2, 1), DEFAULT_RULES, PAIR, seeded(seed));
      const count = (r: Role) => s.slots.filter((x) => x.role === r).length;
      expect([count('civil'), count('spy'), count('white')]).toEqual([5, 2, 1]);
    }
  });
  test('les rôles sont réellement mélangés', () => {
    const firsts = new Set<Role>();
    for (let seed = 0; seed < 50; seed++) firsts.add(createGame(cfg(3, 1, 1), DEFAULT_RULES, PAIR, seeded(seed)).slots[0].role);
    expect(firsts.size).toBe(3);
  });
  test('les deux mots de la paire sont attribués, de façon aléatoire', () => {
    const civilWords = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const s = createGame(cfg(3, 1, 1), DEFAULT_RULES, PAIR, seeded(seed));
      expect([s.pair.civil, s.pair.spy].sort()).toEqual(['Chat', 'Lion']);
      civilWords.add(s.pair.civil);
    }
    expect(civilWords.size).toBe(2);
  });
  test('refuse une configuration invalide', () => {
    expect(() => createGame(cfg(1, 1, 1), DEFAULT_RULES, PAIR)).toThrow(EngineError);
  });
});

describe('prise des cases et révélation', () => {
  const fresh = () => createGame(cfg(3, 1, 1), DEFAULT_RULES, PAIR, seeded(7));

  test('une case prise ne peut plus l\'être', () => {
    let s = claimSlot(fresh(), 0, 'Alice');
    s = ackReveal(s);
    expect(() => claimSlot(s, 0, 'Bob')).toThrow(/déjà prise/);
  });
  test('impossible de prendre une autre case avant d\'avoir caché son rôle', () => {
    const s = claimSlot(fresh(), 0, 'Alice');
    expect(() => claimSlot(s, 1, 'Bob')).toThrow(/consulte encore/);
  });
  test('prénoms uniques, sans tenir compte des accents ni de la casse', () => {
    let s = ackReveal(claimSlot(fresh(), 0, 'Éloïse'));
    expect(() => claimSlot(s, 1, 'eloise')).toThrow(/déjà utilisé/);
    expect(() => claimSlot(s, 1, '   ')).toThrow(/Saisissez un prénom/);
  });
  test('le rôle d\'une autre case n\'est pas modifié ni révélé par l\'état', () => {
    const s = claimSlot(fresh(), 2, 'Alice');
    expect(s.slots.filter((x) => x.name !== null)).toHaveLength(1);
    expect(s.revealing).toBe(2);
  });
  test('Mr White : rôle annoncé, aucun mot', () => {
    const s = fresh();
    const i = s.slots.findIndex((x) => x.role === 'white');
    expect(revealFor(s, i)).toEqual({ role: 'white', word: null, showRole: true });
  });
  test('civil : le mot des civils, sans annonce de rôle', () => {
    const s = fresh();
    const i = s.slots.findIndex((x) => x.role === 'civil');
    expect(revealFor(s, i)).toEqual({ role: 'civil', word: s.pair.civil, showRole: false });
  });
  test('espion : mot proche et différent ; il ne sait pas qu\'il est espion par défaut', () => {
    const s = fresh();
    const i = s.slots.findIndex((x) => x.role === 'spy');
    const info = revealFor(s, i);
    expect(info.word).toBe(s.pair.spy);
    expect(info.word).not.toBe(s.pair.civil);
    expect(info.showRole).toBe(false);
  });
  test('option « espion informé »', () => {
    const s = createGame(cfg(3, 1, 1), { ...DEFAULT_RULES, spyKnowsRole: true }, PAIR, seeded(7));
    const i = s.slots.findIndex((x) => x.role === 'spy');
    expect(revealFor(s, i).showRole).toBe(true);
  });
  test('impossible de commencer tant que tout le monde n\'a pas son rôle', () => {
    let s = ackReveal(claimSlot(fresh(), 0, 'Alice'));
    expect(() => beginPlay(s)).toThrow(/Tous les joueurs/);
  });
  test('l\'ordre de passage est tiré au sort et contient chaque joueur une fois', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const s = setup(cfg(4, 1, 1), DEFAULT_RULES, seed);
      expect(s.players.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6]);
      orders.add(s.players.map((p) => p.name).join(','));
    }
    expect(orders.size).toBeGreaterThan(5);
  });
  test('l\'état d\'origine n\'est jamais modifié', () => {
    const s = fresh();
    const copy = JSON.stringify(s);
    claimSlot(s, 0, 'Alice');
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe('conditions de victoire', () => {
  const P = (role: Role, alive = true): Player => ({ key: role + Math.random(), name: 'x', role, alive, order: 1, eliminatedRound: null });

  test('1 civil contre 1 espion : l\'espion gagne', () => {
    expect(checkOutcome([P('civil'), P('spy')])).toBe('evil');
  });
  test('1 civil contre 1 Mr White : les méchants gagnent', () => {
    expect(checkOutcome([P('civil'), P('white')])).toBe('evil');
  });
  test('2 civils contre 2 méchants : les méchants gagnent (égalité)', () => {
    expect(checkOutcome([P('civil'), P('civil'), P('spy'), P('white')])).toBe('evil');
  });
  test('3 civils contre 2 méchants : la partie continue', () => {
    expect(checkOutcome([P('civil'), P('civil'), P('civil'), P('spy'), P('white')])).toBeNull();
  });
  test('plus aucun méchant : les civils gagnent', () => {
    expect(checkOutcome([P('civil'), P('civil'), P('spy', false), P('white', false)])).toBe('civils');
  });
  test('les éliminés ne comptent pas', () => {
    expect(checkOutcome([P('civil'), P('civil', false), P('civil', false), P('spy')])).toBe('evil');
  });
});

describe('parties complètes', () => {
  test('les civils éliminent tous les méchants : chaque civil encore en jeu marque 10', () => {
    let s = setup(cfg(3, 1, 0));
    const spy = byRole(s, 'spy')[0];
    s = vote(s, spy.key);
    expect(s.phase).toBe('reveal');
    expect(s.pending?.role).toBe('spy');
    s = continueAfterReveal(s);
    expect(s.phase).toBe('finished');
    expect(s.result?.winner).toBe('civils');
    for (const p of s.players) expect(s.result!.points[p.key]).toBe(p.role === 'civil' ? 10 : 0);
  });

  test('un civil éliminé marque 0 même si les civils gagnent ensuite, mais compte parmi les vainqueurs', () => {
    let s = setup(cfg(4, 1, 0));
    const [c1] = byRole(s, 'civil');
    s = continueAfterReveal(vote(s, c1.key)); // civil éliminé : la partie continue (3 civils... 3 > 1)
    expect(s.phase).toBe('play');
    expect(s.round).toBe(2);
    expect(s.roundStartedAt).toBeNull();
    s = continueAfterReveal(vote(s, byRole(s, 'spy')[0].key));
    expect(s.result?.winner).toBe('civils');
    expect(s.result!.points[c1.key]).toBe(0);
    expect(s.result!.won[c1.key]).toBe(true);
    expect(Object.values(s.result!.points).filter((x) => x === 10)).toHaveLength(3);
  });

  test('égalité civils / méchants après une élimination : victoire des méchants', () => {
    let s = setup(cfg(3, 1, 1));
    const [c1] = byRole(s, 'civil');
    s = continueAfterReveal(vote(s, c1.key));
    // 2 civils vs 2 méchants => les méchants ont gagné immédiatement
    expect(s.phase).toBe('finished');
    expect(s.result?.winner).toBe('evil');
    for (const p of s.players) {
      expect(s.result!.points[p.key]).toBe(p.role === 'civil' ? 0 : 5);
    }
  });

  test('méchant éliminé plus tôt : 0 point même si son camp gagne', () => {
    let s = setup(cfg(5, 2, 0));
    const [spy1, spy2] = byRole(s, 'spy');
    s = continueAfterReveal(vote(s, spy1.key)); // 5 civils vs 1
    expect(s.phase).toBe('play');
    const civils = byRole(s, 'civil');
    s = continueAfterReveal(vote(s, civils[0].key)); // 4 vs 1
    s = continueAfterReveal(vote(s, civils[1].key)); // 3 vs 1
    s = continueAfterReveal(vote(s, civils[2].key)); // 2 vs 1
    s = continueAfterReveal(vote(s, civils[3].key)); // 1 vs 1 => méchants
    expect(s.result?.winner).toBe('evil');
    expect(s.result!.points[spy1.key]).toBe(0);
    expect(s.result!.won[spy1.key]).toBe(true);
    expect(s.result!.points[spy2.key]).toBe(5);
  });

  test('Mr White éliminé qui devine le mot : il gagne 10, la partie s\'arrête, les autres 0', () => {
    let s = setup(cfg(4, 1, 1));
    const white = byRole(s, 'white')[0];
    s = vote(s, white.key);
    expect(s.pending?.role).toBe('white');
    expect(() => continueAfterReveal(s)).toThrow(/proposer un mot/);
    s = submitGuess(s, `  LE ${s.pair.civil.toUpperCase()} `);
    expect(s.pending?.guessCorrect).toBe(true);
    s = continueAfterReveal(s);
    expect(s.phase).toBe('finished');
    expect(s.result?.winner).toBe('white');
    for (const p of s.players) {
      expect(s.result!.points[p.key]).toBe(p.key === white.key ? 10 : 0);
      expect(s.result!.won[p.key]).toBe(p.key === white.key);
    }
  });

  test('Mr White se trompe : 0 point, la partie continue', () => {
    let s = setup(cfg(4, 1, 1));
    const white = byRole(s, 'white')[0];
    s = submitGuess(vote(s, white.key), 'Pizza');
    expect(s.pending?.guessCorrect).toBe(false);
    s = continueAfterReveal(s);
    expect(s.phase).toBe('play');
    expect(alivePlayers(s)).toHaveLength(5);
  });

  test('Mr White qui ne sait pas : traité comme une erreur', () => {
    let s = setup(cfg(4, 1, 1));
    s = submitGuess(vote(s, byRole(s, 'white')[0].key), null);
    expect(s.pending?.guessCorrect).toBe(false);
  });

  test('Mr White se trompe puis les civils gagnent : les civils encore en jeu marquent', () => {
    let s = setup(cfg(4, 1, 1));
    s = continueAfterReveal(submitGuess(vote(s, byRole(s, 'white')[0].key), 'Pizza'));
    s = continueAfterReveal(vote(s, byRole(s, 'spy')[0].key));
    expect(s.result?.winner).toBe('civils');
    expect(Object.values(s.result!.points).filter((x) => x === 10)).toHaveLength(4);
  });

  test('on ne peut proposer un mot qu\'une fois, et seulement pour Mr White', () => {
    let s = setup(cfg(4, 1, 1));
    const spyState = vote(s, byRole(s, 'spy')[0].key);
    expect(() => submitGuess(spyState, 'x')).toThrow(EngineError);
    let w = submitGuess(vote(s, byRole(s, 'white')[0].key), 'x');
    expect(() => submitGuess(w, 'y')).toThrow(/déjà faite/);
  });

  test('vote : discussion obligatoire, annulation possible, joueur éliminé non réélisible', () => {
    let s = setup(cfg(4, 1, 0));
    expect(() => openVote(s)).toThrow(/discussion/);
    s = startDiscussion(s, 10);
    s = cancelVote(openVote(s));
    expect(s.phase).toBe('play');
    const target = s.players[0];
    s = continueAfterReveal(eliminate(openVote(s), target.key));
    if (s.phase === 'play') {
      s = startDiscussion(s, 20);
      expect(() => eliminate(openVote(s), target.key)).toThrow(/n'est plus en jeu/);
    }
  });

  test('simulation : 300 parties aléatoires se terminent toujours, avec des points cohérents', () => {
    for (let seed = 0; seed < 300; seed++) {
      const rng = seeded(seed);
      const civils = 3 + Math.floor(rng() * 4);
      const spies = Math.floor(rng() * 2) + (rng() < 0.5 ? 0 : 1);
      const whites = spies === 0 ? 1 : Math.floor(rng() * 2);
      const c = cfg(civils, spies, whites);
      if (validateConfig(c)) continue;
      let s = setup(c, DEFAULT_RULES, seed);
      let guard = 0;
      while (s.phase !== 'finished' && guard++ < 50) {
        const alive = alivePlayers(s);
        const target = alive[Math.floor(rng() * alive.length)];
        s = vote(s, target.key);
        if (s.pending?.role === 'white') s = submitGuess(s, rng() < 0.3 ? s.pair.civil : 'faux');
        s = continueAfterReveal(s);
      }
      expect(s.phase).toBe('finished');
      const r = s.result!;
      const total = Object.values(r.points).reduce((a, b) => a + b, 0);
      if (r.winner === 'white') expect(total).toBe(10);
      if (r.winner === 'civils') expect(total).toBe(10 * alivePlayers(s).filter((p) => p.role === 'civil').length);
      if (r.winner === 'evil') expect(total).toBe(5 * alivePlayers(s).filter((p) => p.role !== 'civil').length);
      expect(Object.keys(r.points)).toHaveLength(c.total);
    }
  });

  test('points paramétrables (variantes de règles)', () => {
    const players: Player[] = [
      { key: 'a', name: 'A', role: 'civil', alive: true, order: 1, eliminatedRound: null },
      { key: 'b', name: 'B', role: 'spy', alive: false, order: 2, eliminatedRound: 1 },
    ];
    const r = computeResult(players, 'civils', { ...DEFAULT_RULES, civilWinPoints: 3 });
    expect(r.points).toEqual({ a: 3, b: 0 });
  });
});

describe('proposition de Mr White : comparaison des mots', () => {
  test.each([
    ['chat', 'Chat', true],
    ['  CHAT  ', 'Chat', true],
    ['le chat', 'Chat', true],
    ['un chat', 'Chat', true],
    ["l'oignon", 'Oignon', true],
    ['echalote', 'Échalote', true],
    ['micro ondes', 'Micro-ondes', true],
    ['Micro-ondes', 'micro ondes', true],
    ['noeud papillon', 'Nœud papillon', true],
    ['chats', 'Chat', false],
    ['chien', 'Chat', false],
    ['', 'Chat', false],
    ['le', 'Chat', false],
    ['desert', 'Désert', true],
    ['lasagne', 'Lasagnes', false],
  ])('« %s » vs « %s » : %s', (guess, word, expected) => {
    expect(matchesWord(guess, word)).toBe(expected);
  });
});

describe('prénoms', () => {
  test('nettoyage', () => {
    expect(cleanPlayerName('  marie   claire ')).toBe('Marie claire');
    expect(cleanPlayerName('x'.repeat(50))).toHaveLength(20);
    expect(cleanPlayerName('   ')).toBe('');
  });
  test('clé stable', () => {
    expect(nameKey('Éloïse')).toBe('eloise');
    expect(nameKey('Jean-Pierre')).toBe('jean_pierre');
    expect(nameKey('😀')).toBe('joueur');
    expect(nameKey('JEAN pierre')).toBe(nameKey('jean-pierre'));
  });
  test('normalizeText / shuffle', () => {
    expect(normalizeText('  Crème BRÛLÉE !! ')).toBe('creme brulee');
    const a = [1, 2, 3, 4, 5, 6];
    const s = shuffle(a, seeded(3));
    expect([...s].sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
