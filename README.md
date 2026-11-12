# app-mrwhite

Mini-application **Mr White** du portail familial « Le Petit Perchoir ».
Projet totalement indépendant : code, données et déploiement distincts des autres apps.

- URL publique : `https://lepetitperchoir.fr/mrwhite/` (servie par `famille-routeur`)
- Déploiement : Worker Cloudflare nommé **`famille-mrwhite`** (fichiers statiques)
- Dépendances communes : `famille-core` (connexion, famille, thème), version figée par tag Git

## Principe du jeu

Un seul téléphone circule. Chaque joueur reçoit en secret un mot (civils : même mot, espions : mot
proche, Mr White : aucun). On discute, on vote, on élimine. Voir « Rappel des règles » dans l'app.

### Règles implémentées (validées avec le propriétaire du projet)

| Situation | Effet |
|---|---|
| Civil ou espion éliminé | Son rôle est révélé, la partie continue |
| Mr White éliminé | Il propose le mot des civils. Réussite : il gagne **seul** (10 pts), la partie s'arrête, les autres 0. Échec : 0 pt, la partie continue |
| Victoire des méchants | Civils **≤** méchants en jeu (1 civil contre 1 espion : l'espion gagne). 5 pts par méchant **encore en jeu** |
| Victoire des civils | Plus aucun espion ni Mr White. 10 pts par civil **encore en jeu** |
| Joueur éliminé | 0 point |
| Espion | Ne sait pas qu'il est espion (réglage modifiable) |

Les conditions de victoire sont vérifiées après chaque élimination.
Configuration refusée si : somme des rôles ≠ nombre de joueurs, moins de 3 joueurs, pas de civil,
pas de méchant, ou **plus de méchants que de civils** (l'égalité, par exemple 2 civils + 1 espion + 1 Mr White, est permise).

Les mots ne sont **jamais** révélés pendant la partie (ni pour un civil ou un espion éliminé, ni
après une proposition ratée de Mr White) : sinon Mr White pourrait les récupérer.
La proposition de Mr White tolère majuscules, accents, tirets et article initial (« le chat » = « chat »).

## Architecture

```
src/lib/engine.ts    moteur de règles PUR (aucune dépendance) : rôles, votes, victoires, points
src/lib/records.ts   parties terminées + classement (recalculé, jamais stocké)
src/lib/words.ts     filtres de mots, tirage sans répétition, réglages
src/content/mots.json   BASE DE MOTS (hors du code)
src/lib/*.svelte     écrans
```

### Données en ligne (`families/{familyId}/apps/mrwhite/…`)

```
games/{gameId}           partie terminée : gagnant, mots, joueurs (rôle, points, victoire…)
config/reglages          réglages partagés : espion informé, niveaux, catégories
```

- **Le classement n'est pas stocké** : il est calculé à partir des parties. Supprimer une partie
  (Historique) retire automatiquement ses points ; aucune dérive possible ; enregistrement idempotent
  (l'identifiant de la partie est fixe).
- Les scores sont rattachés aux **prénoms saisis** (insensible à la casse et aux accents).
- La partie **en cours** reste sur l'appareil (stockage local) : on peut la reprendre après un
  rechargement ou si Android ferme la page. Seul le résultat final est envoyé en ligne.

## Enrichir la base de mots

Éditer `src/content/mots.json` :

```json
{ "id": "chat--lion", "a": "Chat", "b": "Lion", "categorie": "animaux", "niveau": 2 }
```

- `id` unique ; `a` et `b` sont les deux mots (attribués aux civils / espions au hasard)
- `categorie` : un `id` de la liste `categories` (ajouter une catégorie = l'ajouter à cette liste)
- `niveau` : 1 facile, 2 moyen, 3 difficile (mots très proches)

`npm test` vérifie la base : ids uniques, mots différents, pas de doublon (même inversé),
catégories connues. Puis commit et push : Cloudflare redéploie.

## Variantes de règles

Les points et l'option « espion informé » sont regroupés dans `RuleOptions` (`engine.ts`),
enregistrés avec chaque partie. Ajouter une variante = ajouter une option + son test.

## Fiche catalogue (Firestore, collection `catalog`, document `mrwhite`)

| Champ | Valeur |
|---|---|
| `name` | `Mr White` |
| `description` | `Le jeu de bluff` |
| `icon` | `🕵️` |
| `color` | `#4b34b0` |
| `path` | `/mrwhite/` |
| `status` | `active` |
| `order` (nombre) | `20` |

À créer dans **chaque** projet Firebase (dev et prod).

## Commandes

```
npm install
npm run dev      # http://localhost:5175/mrwhite/  (projet famille-dev, connexion de dev intégrée)
npm test         # moteur de règles, classement, base de mots, parcours d'une partie dans l'interface
npm run check    # types
npm run build    # génère dist/ (projet famille-prod)
```

## Déploiement

Cloudflare Workers Builds, dépôt GitHub `app-mrwhite`, nom du Worker **`famille-mrwhite`**,
build `npm run build`, deploy `npx wrangler deploy` (config : `wrangler.jsonc`).

## Limites connues (volontaires, première version)

- Pas de « revoir mon mot » pendant la partie (éviterait de tricher… mais aussi d'oublier).
- Mots personnalisés de la famille : non prévu pour l'instant (la base est dans le dépôt).
- Bandeaux hors-ligne / mise à jour et écran de connexion dupliqués avec les autres apps ;
  à mutualiser dans `famille-core` avant la troisième app.
