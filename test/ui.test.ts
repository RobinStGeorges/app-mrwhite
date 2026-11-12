// @vitest-environment jsdom
// Parcours complet d'une partie à travers l'interface (navigateur simulé).
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

const saveGame = vi.fn();
vi.mock('../src/lib/data', () => ({
  saveGame: (...a: unknown[]) => saveGame(...a),
  deleteGame: vi.fn(),
  saveSettings: vi.fn(),
  watchGames: vi.fn(),
  watchSettings: vi.fn(),
}));

import Game from '../src/lib/Game.svelte';
import Setup from '../src/lib/Setup.svelte';
import { game, setGame } from '../src/lib/gameStore';
import { DEFAULT_RULES, createGame, type GameState } from '../src/lib/engine';
import { DEFAULT_SETTINGS } from '../src/lib/words';

const PAIR = { id: 'chat--lion', a: 'Chat', b: 'Lion', categorie: 'animaux', niveau: 2 };

const $$ = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
const buttonWith = (text: string) =>
  $$('button, a').find((b) => (b.textContent ?? '').replace(/\s+/g, ' ').includes(text));

async function click(el: HTMLElement | undefined, label: string) {
  if (!el) throw new Error(`Élément introuvable : ${label}\n--- écran ---\n${document.body.textContent}`);
  el.click();
  flushSync();
  await tick();
}
async function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
}
const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
const current = () => {
  let s: GameState | null = null;
  game.subscribe((v) => (s = v))();
  return s as unknown as GameState;
};

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  saveGame.mockClear();
  location.hash = '';
  setGame(null);
});

describe('partie complète dans l\'interface', () => {
  test('distribution, discussion, vote, victoire des civils, enregistrement unique', async () => {
    setGame(createGame({ total: 4, civils: 3, spies: 1, whites: 0 }, DEFAULT_RULES, PAIR));
    const start = current();
    const comp = mount(Game, { target: document.body, props: { familyId: 'f1', me: 'Robin', settings: DEFAULT_SETTINGS, games: [] } });
    await tick();

    expect(text()).toContain('Choisis ta case');
    const names = ['Alice', 'Bob', 'Chloé', 'David'];

    for (let i = 0; i < 4; i++) {
      await click($$('.box')[i], `case ${i + 1}`);
      expect(text()).toContain(`Case n°${i + 1}`);
      await type(document.querySelector<HTMLInputElement>('#prenom')!, names[i]);
      await click(buttonWith('Découvrir mon rôle'), 'découvrir');

      // Le joueur voit son mot (jamais « Espion » par défaut) et son nom est mentionné.
      expect(text()).toContain(`seul ${names[i]} doit voir`);
      const role = start.slots[i].role;
      const word = role === 'civil' ? start.pair.civil : start.pair.spy;
      expect(text()).toContain(word);
      expect(text()).not.toContain('Tu es Espion');
      await click(buttonWith('J\'ai mémorisé'), 'mémorisé');
    }

    // Les cases prises affichent le prénom, sans révéler de rôle.
    expect($$('.box.taken')).toHaveLength(4);
    expect(text()).not.toContain('Civil');

    await click(buttonWith('Tout le monde est prêt'), 'prêt');
    expect(text()).toContain('Ordre de passage');
    for (const n of names) expect(text()).toContain(n);

    await click(buttonWith('Lancer la discussion'), 'discussion');
    expect(text()).toContain('Discussion en cours');
    await click(buttonWith('Voter'), 'voter');
    expect(text()).toContain('Qui éliminer');

    const spyName = names[start.slots.findIndex((s) => s.role === 'spy')];
    await click($$('button.pick').find((b) => b.textContent!.includes(spyName)), 'choisir');
    await click(buttonWith(`Éliminer ${spyName}`), 'éliminer');
    expect(text()).toContain(`Confirmer l'élimination de ${spyName}`);
    await click(buttonWith('Oui, éliminer'), 'confirmer');

    expect(text()).toContain(`${spyName} était…`);
    expect(text()).toContain('Espion');
    // Les mots ne doivent pas fuiter tant que la partie continue ou juste après une élimination simple.
    await click(buttonWith('Continuer'), 'continuer');

    expect(text()).toContain('Les civils gagnent');
    expect(text()).toContain(start.pair.civil);
    expect(text()).toContain('+10');
    expect(saveGame).toHaveBeenCalledTimes(1);
    expect(current().saved).toBe(true);
    unmount(comp);
  });

  test('Mr White éliminé : proposition de mot, aucune fuite du mot si raté', async () => {
    setGame(createGame({ total: 4, civils: 3, spies: 0, whites: 1 }, DEFAULT_RULES, PAIR));
    const start = current();
    const comp = mount(Game, { target: document.body, props: { familyId: 'f1', me: 'Robin', settings: DEFAULT_SETTINGS, games: [] } });
    await tick();
    const names = ['Alice', 'Bob', 'Chloé', 'David'];
    for (let i = 0; i < 4; i++) {
      await click($$('.box')[i], 'case');
      await type(document.querySelector<HTMLInputElement>('#prenom')!, names[i]);
      await click(buttonWith('Découvrir mon rôle'), 'découvrir');
      if (start.slots[i].role === 'white') {
        expect(text()).toContain('Tu es Mr White');
        expect(text()).not.toContain(start.pair.civil);
      }
      await click(buttonWith('J\'ai mémorisé'), 'mémorisé');
    }
    await click(buttonWith('Tout le monde est prêt'), 'prêt');
    await click(buttonWith('Lancer la discussion'), 'discussion');
    await click(buttonWith('Voter'), 'voter');
    const whiteName = names[start.slots.findIndex((s) => s.role === 'white')];
    await click($$('button.pick').find((b) => b.textContent!.includes(whiteName)), 'choisir');
    await click(buttonWith(`Éliminer ${whiteName}`), 'éliminer');
    await click(buttonWith('Oui, éliminer'), 'confirmer');

    expect(text()).toContain('Dernière chance');
    await type(document.querySelector<HTMLInputElement>('input[type=text]')!, 'Pizza');
    await click(buttonWith('Valider ma réponse'), 'valider');
    expect(text()).toContain('Raté');
    expect(text()).not.toContain(start.pair.civil);
    expect(text()).not.toContain(start.pair.spy);
    await click(buttonWith('Continuer'), 'continuer');
    // 3 civils contre 0 méchant => les civils gagnent
    expect(text()).toContain('Les civils gagnent');
    expect(saveGame).toHaveBeenCalledTimes(1);
    unmount(comp);
  });

  test('on ne peut pas reprendre un prénom déjà utilisé ni valider un prénom vide', async () => {
    setGame(createGame({ total: 4, civils: 3, spies: 1, whites: 0 }, DEFAULT_RULES, PAIR));
    const comp = mount(Game, { target: document.body, props: { familyId: 'f1', me: 'Robin', settings: DEFAULT_SETTINGS, games: [] } });
    await tick();
    await click($$('.box')[0], 'case 1');
    await click(buttonWith('Découvrir mon rôle'), 'vide');
    expect(text()).toContain('Saisissez un prénom');
    await type(document.querySelector<HTMLInputElement>('#prenom')!, 'Alice');
    await click(buttonWith('Découvrir mon rôle'), 'ok');
    await click(buttonWith('J\'ai mémorisé'), 'ack');
    await click($$('.box')[1], 'case 2');
    await type(document.querySelector<HTMLInputElement>('#prenom')!, 'alice');
    await click(buttonWith('Découvrir mon rôle'), 'doublon');
    expect(text()).toContain('déjà utilisé');
    unmount(comp);
  });

  test('reprise après rechargement : le rôle en cours de consultation réapparaît', async () => {
    setGame(createGame({ total: 4, civils: 3, spies: 1, whites: 0 }, DEFAULT_RULES, PAIR));
    let comp = mount(Game, { target: document.body, props: { familyId: 'f1', me: 'Robin', settings: DEFAULT_SETTINGS, games: [] } });
    await tick();
    await click($$('.box')[0], 'case');
    await type(document.querySelector<HTMLInputElement>('#prenom')!, 'Alice');
    await click(buttonWith('Découvrir mon rôle'), 'découvrir');
    unmount(comp);
    document.body.innerHTML = '';

    // « Rechargement » : on relit la partie depuis le stockage local.
    const saved = JSON.parse(localStorage.getItem('mrwhite.partie.v1')!);
    setGame(saved);
    comp = mount(Game, { target: document.body, props: { familyId: 'f1', me: 'Robin', settings: DEFAULT_SETTINGS, games: [] } });
    await tick();
    expect(text()).toContain('seul Alice doit voir');
    unmount(comp);
  });
});

describe('écran de configuration', () => {
  test('refuse les configurations incohérentes et lance une partie valide', async () => {
    const comp = mount(Setup, { target: document.body, props: { settings: DEFAULT_SETTINGS } });
    await tick();
    const start = () => buttonWith('Distribuer les rôles') as HTMLButtonElement;
    expect(start().disabled).toBe(false); // 5 joueurs : 3 + 1 + 1
    await click($$('.stepper button').find((b) => b.getAttribute('aria-label') === 'Plus de nombre de joueurs'), 'plus joueurs');
    expect(text()).toContain('au lieu de 6');
    expect(start().disabled).toBe(true);
    await click($$('.stepper button').find((b) => b.getAttribute('aria-label') === 'Plus de civils'), 'plus civils');
    expect(start().disabled).toBe(false);
    await click(start(), 'distribuer');
    expect(location.hash).toBe('#/partie');
    expect(current().config).toMatchObject({ total: 6, civils: 4, spies: 1, whites: 1 });
    expect(current().slots).toHaveLength(6);
    unmount(comp);
  });
});
