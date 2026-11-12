import { describe, expect, test } from 'vitest';
import { buildGameRecord, computeRanking, knownNames, parseGameRecord, type GameRecord } from '../src/lib/records';
import { DEFAULT_RULES, ackReveal, beginPlay, claimSlot, continueAfterReveal, createGame, eliminate, openVote, startDiscussion } from '../src/lib/engine';

const rec = (id: string, endedAt: number, players: Array<[string, string, number, boolean]>): GameRecord => ({
  id, startedAt: 0, endedAt, winner: 'civils', pair: { civil: 'a', spy: 'b', categorie: 'x' },
  config: { total: players.length, civils: 0, spies: 0, whites: 0 }, rounds: 1, savedBy: '',
  players: players.map(([key, name, points, won], i) => ({ key, name, role: 'civil', order: i + 1, alive: true, eliminatedRound: null, points, won })),
});

describe('classement', () => {
  test('cumule points, parties et victoires', () => {
    const rows = computeRanking([
      rec('1', 1, [['a', 'Anna', 10, true], ['b', 'Ben', 0, false]]),
      rec('2', 2, [['a', 'Anna', 5, true], ['b', 'Ben', 10, true]]),
    ]);
    expect(rows.map((r) => [r.name, r.points, r.games, r.wins, r.rank])).toEqual([
      ['Anna', 15, 2, 2, 1],
      ['Ben', 10, 2, 1, 2],
    ]);
  });
  test('égalité parfaite = même rang', () => {
    const rows = computeRanking([rec('1', 1, [['a', 'Anna', 10, true], ['b', 'Ben', 10, true], ['c', 'Cléo', 0, false]])]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
  test('supprimer une partie retire ses points', () => {
    const g1 = rec('1', 1, [['a', 'Anna', 10, true]]);
    const g2 = rec('2', 2, [['a', 'Anna', 5, true]]);
    expect(computeRanking([g1, g2])[0].points).toBe(15);
    expect(computeRanking([g1])[0].points).toBe(10);
  });
  test('la casse du prénom la plus récente est affichée', () => {
    const rows = computeRanking([rec('1', 1, [['eloise', 'eloise', 1, true]]), rec('2', 5, [['eloise', 'Éloïse', 1, true]])]);
    expect(rows[0].name).toBe('Éloïse');
  });
  test('liste vide', () => expect(computeRanking([])).toEqual([]));
  test('prénoms connus, les plus récents d\'abord', () => {
    expect(knownNames([rec('1', 1, [['a', 'Anna', 0, false]]), rec('2', 9, [['b', 'Ben', 0, false], ['a', 'Anna', 0, false]])])).toEqual(['Ben', 'Anna']);
  });
});

describe('enregistrement d\'une partie', () => {
  test('construit un enregistrement complet depuis une partie terminée', () => {
    let s = createGame({ total: 4, civils: 3, spies: 1, whites: 0 }, DEFAULT_RULES, { id: 'p', a: 'Chat', b: 'Lion', categorie: 'animaux', niveau: 2 }, () => 0.3, 1000);
    for (let i = 0; i < 4; i++) s = ackReveal(claimSlot(s, i, `P${i}`));
    s = beginPlay(s);
    const spy = s.players.find((p) => p.role === 'spy')!;
    s = continueAfterReveal(eliminate(openVote(startDiscussion(s, 1)), spy.key));
    const r = buildGameRecord(s, 'Robin', 2000);
    expect(r).toMatchObject({ id: s.id, winner: 'civils', endedAt: 2000, rounds: 1, savedBy: 'Robin' });
    expect(r.players).toHaveLength(4);
    expect(r.players.reduce((a, p) => a + p.points, 0)).toBe(30);
    expect(parseGameRecord(r.id, JSON.parse(JSON.stringify(r)))).toEqual(r);
  });
  test('refuse une partie non terminée', () => {
    const s = createGame({ total: 4, civils: 3, spies: 1, whites: 0 }, DEFAULT_RULES, { id: 'p', a: 'a', b: 'b', categorie: 'c', niveau: 1 });
    expect(() => buildGameRecord(s, 'x')).toThrow();
  });
  test('lecture tolérante de données incomplètes', () => {
    const r = parseGameRecord('x', { winner: 'zzz', players: [{ role: 'bizarre' }] });
    expect(r.winner).toBe('civils');
    expect(r.players[0]).toMatchObject({ role: 'civil', name: 'Joueur', points: 0, won: false });
  });
});
