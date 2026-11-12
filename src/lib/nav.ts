export type Route = 'home' | 'setup' | 'game' | 'scores' | 'history' | 'settings';

export function parseHash(hash: string): Route {
  switch (hash) {
    case '#/nouvelle': return 'setup';
    case '#/partie': return 'game';
    case '#/scores': return 'scores';
    case '#/historique': return 'history';
    case '#/reglages': return 'settings';
    default: return 'home';
  }
}
