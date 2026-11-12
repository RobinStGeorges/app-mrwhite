<script lang="ts">
  import { act } from './gameStore';
  import { continueAfterReveal, submitGuess, type GameState } from './engine';
  import { ROLE_EMOJI, ROLE_LABEL } from './ui';

  let { s }: { s: GameState } = $props();

  let guess = $state('');
  let error = $state('');

  // Les mots ne sont jamais dévoilés tant que la partie continue : sinon Mr White
  // pourrait récupérer le mot des civils grâce aux joueurs éliminés.
  const pending = $derived(s.pending);
  const player = $derived(s.players.find((p) => p.key === pending?.key));
  const needsGuess = $derived(pending?.role === 'white' && pending.guessCorrect === undefined);

  function guessWord(e: Event) {
    e.preventDefault();
    error = act((st) => submitGuess(st, guess)) ?? '';
  }
</script>

{#if pending && player}
  <div class="stack">
    <div class="secret stack">
      <div>{player.name} était…</div>
      <div class="big">{ROLE_EMOJI[pending.role]} {ROLE_LABEL[pending.role]}</div>
    </div>

    {#if needsGuess}
      <form class="fc-card stack" onsubmit={guessWord}>
        <h2>Dernière chance, {player.name} !</h2>
        <p class="fc-muted" style="margin: 0">Quel est le mot des civils ? Si tu le trouves, tu gagnes la partie.</p>
        <input class="fc-input" type="text" autocomplete="off" placeholder="Le mot des civils…" bind:value={guess} />
        {#if error}<p class="fc-error" role="alert">{error}</p>{/if}
        <button class="fc-btn fc-btn-primary fc-btn-block" type="submit" disabled={!guess.trim()}>Valider ma réponse</button>
        <button class="fc-btn fc-btn-block" type="button" onclick={() => (error = act((st) => submitGuess(st, null)) ?? '')}>Je ne sais pas</button>
      </form>
    {:else}
      {#if pending.role === 'white'}
        {#if pending.guessCorrect}
          <div class="fc-card center stack">
            <h2>Bravo, c'était « {s.pair.civil} » ! 🎉</h2>
            <p style="margin: 0">Mr White remporte la partie.</p>
          </div>
        {:else}
          <div class="fc-card center"><h2>Raté ! Ce n'est pas le bon mot.</h2></div>
        {/if}
      {:else if pending.role === 'civil'}
        <div class="fc-card center"><p style="margin: 0">Un civil est éliminé. La partie continue…</p></div>
      {:else}
        <div class="fc-card center"><p style="margin: 0">Un espion est éliminé. La partie continue…</p></div>
      {/if}
      {#if error}<p class="fc-error" role="alert">{error}</p>{/if}
      <button class="fc-btn fc-btn-primary fc-btn-block" type="button" onclick={() => (error = act(continueAfterReveal) ?? '')}>
        Continuer
      </button>
    {/if}
  </div>
{/if}
