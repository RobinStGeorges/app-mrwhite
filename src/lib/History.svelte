<script lang="ts">
  import { deleteGame } from './data';
  import type { GameRecord } from './records';
  import { ROLE_EMOJI, ROLE_LABEL, formatDate, winnerTitle } from './ui';

  let { familyId, games, loaded }: { familyId: string; games: GameRecord[]; loaded: boolean } = $props();

  function remove(g: GameRecord) {
    if (!confirm('Supprimer cette partie ? Ses points seront retirés du classement.')) return;
    deleteGame(familyId, g.id);
  }
</script>

<div class="stack">
  <header class="row">
    <a class="fc-btn icon-btn" href="#/" aria-label="Retour">←</a>
    <h1>📜 Historique</h1>
  </header>

  {#if !loaded}
    <p class="fc-muted">Chargement…</p>
  {:else if games.length === 0}
    <div class="fc-card"><p style="margin: 0">Aucune partie terminée pour le moment.</p></div>
  {:else}
    {#each games as g (g.id)}
      <details class="fc-card">
        <summary>
          <span class="grow">{formatDate(g.endedAt)}<br /><span class="fc-muted">{winnerTitle(g.winner)}</span></span>
        </summary>
        <div class="stack" style="margin-top: 0.5rem">
          <div class="fc-muted">
            Mots : « {g.pair.civil} » (civils) · « {g.pair.spy} » (espions) · {g.config.total} joueurs · {g.rounds} élimination{g.rounds > 1 ? 's' : ''}
          </div>
          <table>
            <tbody>
              {#each [...g.players].sort((a, b) => b.points - a.points || a.order - b.order) as p (p.key)}
                <tr>
                  <td>{p.name}{#if p.won} 🏅{/if}</td>
                  <td><span class="badge {p.role}">{ROLE_EMOJI[p.role]} {ROLE_LABEL[p.role]}</span></td>
                  <td class="n">{#if p.points > 0}<span class="plus">+{p.points}</span>{:else}0{/if}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if g.savedBy}<div class="fc-muted">Enregistrée par {g.savedBy}</div>{/if}
          <button class="fc-btn fc-btn-danger" type="button" onclick={() => remove(g)}>Supprimer cette partie</button>
        </div>
      </details>
    {/each}
  {/if}
</div>
