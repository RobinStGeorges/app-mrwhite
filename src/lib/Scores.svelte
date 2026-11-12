<script lang="ts">
  import { computeRanking, type GameRecord } from './records';

  let { games, loaded }: { games: GameRecord[]; loaded: boolean } = $props();
  const rows = $derived(computeRanking(games));
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank));
</script>

<div class="stack">
  <header class="row">
    <a class="fc-btn icon-btn" href="#/" aria-label="Retour">←</a>
    <h1>🏆 Classement</h1>
  </header>

  {#if !loaded}
    <p class="fc-muted">Chargement…</p>
  {:else if rows.length === 0}
    <div class="fc-card"><p style="margin: 0">Aucune partie terminée pour le moment.</p></div>
  {:else}
    <div class="fc-card">
      <table>
        <thead><tr><th>#</th><th>Joueur</th><th class="n">Points</th><th class="n">Parties</th><th class="n">Victoires</th></tr></thead>
        <tbody>
          {#each rows as r (r.key)}
            <tr>
              <td>{medal(r.rank)}</td>
              <td><strong>{r.name}</strong></td>
              <td class="n"><strong>{r.points}</strong></td>
              <td class="n">{r.games}</td>
              <td class="n">{r.wins}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
