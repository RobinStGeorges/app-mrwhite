<script lang="ts">
  import { game } from './gameStore';
  import type { GameState } from './engine';

  const resumable = $derived($game && $game.phase !== 'finished' ? ($game as GameState) : null);
</script>

<div class="stack">
  <header class="row">
    <a class="fc-btn icon-btn" href="/" aria-label="Retour au portail">←</a>
    <h1>🕵️ Mr White</h1>
  </header>

  {#if resumable}
    <a class="fc-btn fc-btn-primary fc-btn-block" href="#/partie">▶ Reprendre la partie en cours</a>
  {/if}
  <a class="fc-btn {resumable ? '' : 'fc-btn-primary'} fc-btn-block" href="#/nouvelle">Nouvelle partie</a>
  <a class="fc-btn fc-btn-block" href="#/scores">🏆 Classement</a>
  <a class="fc-btn fc-btn-block" href="#/historique">📜 Historique des parties</a>
  <a class="fc-btn fc-btn-block" href="#/reglages">⚙️ Réglages</a>

  <details class="fc-card">
    <summary>Rappel des règles</summary>
    <div class="stack" style="margin-top: 0.5rem">
      <p style="margin: 0">Chaque joueur reçoit en secret un mot. Les <strong>civils</strong> ont tous le même, les <strong>espions</strong> un mot très proche, et <strong>Mr White</strong> n'en a aucun. À tour de rôle, chacun décrit son mot sans le dire, puis on vote pour éliminer un joueur.</p>
      <p style="margin: 0"><strong>Mr White éliminé</strong> peut tenter de deviner le mot des civils : s'il réussit, il gagne seul (10 points) et la partie s'arrête.</p>
      <p style="margin: 0"><strong>Les civils gagnent</strong> quand tous les espions et Mr White sont éliminés (10 points par civil encore en jeu). <strong>Les méchants gagnent</strong> quand les civils ne sont plus plus nombreux qu'eux (5 points par méchant encore en jeu).</p>
    </div>
  </details>
</div>
