import { deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { appCollection, toFrenchMessage } from 'famille-core';
import type { GameState } from './engine';
import { buildGameRecord, parseGameRecord, type GameRecord } from './records';
import { parseSettings, type MrWhiteSettings } from './words';
import { showError } from './toast';

// Toutes les données de l'app vivent sous families/{familyId}/apps/mrwhite/...
const APP_ID = 'mrwhite';
const gamesCol = (fid: string) => appCollection(fid, APP_ID, 'games');
const settingsRef = (fid: string) => doc(appCollection(fid, APP_ID, 'config'), 'reglages');

/** Les écritures ne sont jamais « attendues » (elles fonctionnent hors connexion). */
function run(work: Promise<unknown>): void {
  work.catch((e) => showError(`Modification non enregistrée. ${toFrenchMessage(e)}`));
}

export function watchGames(
  fid: string,
  onData: (games: GameRecord[]) => void,
  onError: (e: unknown) => void,
): () => void {
  return onSnapshot(
    query(gamesCol(fid), orderBy('endedAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => parseGameRecord(d.id, d.data()))),
    onError,
  );
}

/** Enregistre une partie terminée. L'identifiant de la partie rend l'écriture idempotente. */
export function saveGame(fid: string, state: GameState, savedBy: string): void {
  const record = buildGameRecord(state, savedBy);
  run(setDoc(doc(gamesCol(fid), record.id), record));
}

export function deleteGame(fid: string, gameId: string): void {
  run(deleteDoc(doc(gamesCol(fid), gameId)));
}

export function watchSettings(
  fid: string,
  onData: (settings: MrWhiteSettings) => void,
  onError: (e: unknown) => void,
): () => void {
  return onSnapshot(
    settingsRef(fid),
    (snap) => onData(parseSettings(snap.exists() ? snap.data() : undefined)),
    onError,
  );
}

export function saveSettings(fid: string, settings: MrWhiteSettings): void {
  run(setDoc(settingsRef(fid), settings));
}
