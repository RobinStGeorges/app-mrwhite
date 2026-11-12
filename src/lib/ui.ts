import type { Role, Winner } from './engine';

export const ROLE_LABEL: Record<Role, string> = { civil: 'Civil', spy: 'Espion', white: 'Mr White' };
export const ROLE_EMOJI: Record<Role, string> = { civil: '🙂', spy: '🕵️', white: '👻' };

export function winnerTitle(w: Winner): string {
  if (w === 'civils') return 'Les civils gagnent ! 🎉';
  if (w === 'evil') return 'Les méchants gagnent ! 😈';
  return 'Mr White a trouvé le mot ! 👻';
}

export function formatDate(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}
