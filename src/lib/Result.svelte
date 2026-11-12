<script lang="ts">
  import { setGame } from './gameStore';
  import type { GameState } from './engine';
  import { startNewGame } from './launch';
  import { setPreviousPlayers } from './prefs';
  import { computeRanking, type GameRecord } from './records';
  import { go } from './route';
  import { ROLE_EMOJI, ROLE_LABEL, winnerTitle } from './ui';
  import type { MrWhiteSettings } from './words';

  let { s, games, settings }: { s: GameState; games: GameRecord[]; settings: MrWhiteSettings } = $props();

  let error = $state('');
  const result = $derived(s.result!);

  // Score cumulé = parties précédentes + cette partie (sans la compter deux fois une fois enregistrée).
  const rows = $derived.by(() => {
    const totals = new Map(computeRanking(games.filter((g) => g.id !== s.id)).map((r) => [r.key, r.points]));
    return s.players
      .map((p) => ({
        p,
        gained: result.points[p.key] ?? 0,
        total: (totals.get(p.key) ?? 0) + (result.points[p.key] ?? 0),
      }))
      .sort((a, b) => b.gained - a.gained || b.total - a.total || a.p.order - b.p.order);
  });

  function again() {
    error = '';
    try {
      setPreviousPlayers(s.players.map((p) => p.name));
      startNewGame(s.config, settings);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Impossible de lancer la partie.';
      return;
    }
    go('#/partie');
  }

  function toScores() {
    go('#/scores');
  }
  function home() {
    setGame(null);
    go('#/');
  }
</script>

<div class="stack">
  <div class="secret stack">
    <div class="big" style="font-size: 1.8rem">{winnerTitle(result.winner)}</div>
  </div>

  <div class="fc-card stack">
    <div class="row spread"><span class="fc-muted">Mot des civils</span><strong>{s.pair.civil}</strong></div>
    <div class="row spread"><span class="fc-muted">Mot des espions</span><strong>{s.pair.spy}</strong></div>
  </div>

  <div class="fc-card">
    <table>
      <thead>
        <tr><th>Joueur</th><th>Rôle</th><th class="n">Partie</th><th class="n">Total</th></tr>
      </thead>
      <tbody>
        {#each rows as r (r.p.key)}
          <tr>
            <td>{r.p.name}{#if result.won[r.p.key]} 🏅{/if}</td>
            <td><span class="badge {r.p.role}">{ROLE_EMOJI[r.p.role]} {ROLE_LABEL[r.p.role]}</span></td>
            <td class="n">{#if r.gained > 0}<span class="plus">+{r.gained}</span>{:else}0{/if}</td>
            <td class="n"><strong>{r.total}</strong></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if error}<p class="fc-error" role="alert">{error}</p>{/if}
  <button class="fc-btn fc-btn-primary fc-btn-block" type="button" onclick={again}>🔁 Nouvelle partie</button>
  <button class="fc-btn fc-btn-block" type="button" onclick={toScores}>🏆 Voir les scores</button>
  <button class="link-btn" type="button" onclick={home}>Retour à l'accueil</button>
</div>
