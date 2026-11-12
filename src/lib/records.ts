// Parties terminées (stockées en ligne) et classement. Le classement n'est PAS stocké :
// il est recalculé à partir des parties, donc toujours cohérent (supprimer une partie
// retire automatiquement ses points).

import type { GameState, Role, Winner } from './engine';

export interface RecordPlayer {
  key: string;
  name: string;
  role: Role;
  order: number;
  alive: boolean;
  eliminatedRound: number | null;
  points: number;
  won: boolean;
}

export interface GameRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  winner: Winner;
  pair: { civil: string; spy: string; categorie: string };
  config: { total: number; civils: number; spies: number; whites: number };
  rounds: number;
  savedBy: string;
  players: RecordPlayer[];
}

export interface RankRow {
  rank: number;
  key: string;
  name: string;
  points: number;
  games: number;
  wins: number;
}

export function buildGameRecord(state: GameState, savedBy: string, now: number = Date.now()): GameRecord {
  if (state.phase !== 'finished' || !state.result) throw new Error('Partie non terminée.');
  const result = state.result;
  return {
    id: state.id,
    startedAt: state.startedAt,
    endedAt: now,
    winner: result.winner,
    pair: { civil: state.pair.civil, spy: state.pair.spy, categorie: state.pair.categorie },
    config: { ...state.config },
    rounds: state.eliminations.length,
    savedBy,
    players: state.players.map((p) => ({
      key: p.key,
      name: p.name,
      role: p.role,
      order: p.order,
      alive: p.alive,
      eliminatedRound: p.eliminatedRound,
      points: result.points[p.key] ?? 0,
      won: result.won[p.key] ?? false,
    })),
  };
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const ROLES: Role[] = ['civil', 'spy', 'white'];

/** Lecture tolérante d'un document Firestore. */
export function parseGameRecord(id: string, data: Record<string, unknown>): GameRecord {
  const rawPlayers = Array.isArray(data.players) ? (data.players as Record<string, unknown>[]) : [];
  const pair = (data.pair ?? {}) as Record<string, unknown>;
  const cfg = (data.config ?? {}) as Record<string, unknown>;
  return {
    id,
    startedAt: num(data.startedAt, 0),
    endedAt: num(data.endedAt, 0),
    winner: data.winner === 'evil' || data.winner === 'white' ? data.winner : 'civils',
    pair: { civil: str(pair.civil), spy: str(pair.spy), categorie: str(pair.categorie) },
    config: {
      total: num(cfg.total, rawPlayers.length),
      civils: num(cfg.civils, 0),
      spies: num(cfg.spies, 0),
      whites: num(cfg.whites, 0),
    },
    rounds: num(data.rounds, 0),
    savedBy: str(data.savedBy),
    players: rawPlayers.map((p) => ({
      key: str(p.key, 'joueur'),
      name: str(p.name, 'Joueur'),
      role: ROLES.includes(p.role as Role) ? (p.role as Role) : 'civil',
      order: num(p.order, 0),
      alive: p.alive === true,
      eliminatedRound: typeof p.eliminatedRound === 'number' ? p.eliminatedRound : null,
      points: num(p.points, 0),
      won: p.won === true,
    })),
  };
}

/** Classement général : points cumulés, parties jouées, victoires. Égalité de points = même rang. */
export function computeRanking(games: readonly GameRecord[]): RankRow[] {
  const byKey = new Map<string, { name: string; at: number; points: number; games: number; wins: number }>();
  for (const g of games) {
    for (const p of g.players) {
      const row = byKey.get(p.key) ?? { name: p.name, at: -1, points: 0, games: 0, wins: 0 };
      row.points += p.points;
      row.games += 1;
      if (p.won) row.wins += 1;
      if (g.endedAt >= row.at) {
        row.name = p.name; // on affiche l'orthographe la plus récente
        row.at = g.endedAt;
      }
      byKey.set(p.key, row);
    }
  }
  const sorted = [...byKey.entries()]
    .map(([key, r]) => ({ key, name: r.name, points: r.points, games: r.games, wins: r.wins }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games || a.name.localeCompare(b.name));

  const rows: RankRow[] = [];
  sorted.forEach((r, i) => {
    const prev = rows[i - 1];
    rows.push({ ...r, rank: prev && prev.points === r.points && prev.wins === r.wins ? prev.rank : i + 1 });
  });
  return rows;
}

/** Prénoms connus, les plus récents d'abord (pour proposer des raccourcis de saisie). */
export function knownNames(games: readonly GameRecord[]): string[] {
  const seen = new Map<string, string>();
  for (const g of [...games].sort((a, b) => b.endedAt - a.endedAt)) {
    for (const p of g.players) if (!seen.has(p.key)) seen.set(p.key, p.name);
  }
  return [...seen.values()];
}
