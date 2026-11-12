<script lang="ts">
  import { act } from './gameStore';
  import { alivePlayers, cancelVote, eliminate, type GameState } from './engine';

  let { s }: { s: GameState } = $props();

  let selected = $state<string | null>(null);
  let confirming = $state(false);
  let error = $state('');

  const alive = $derived(alivePlayers(s));
  const target = $derived(alive.find((p) => p.key === selected) ?? null);

  function confirm() {
    if (!target) return;
    error = act((st) => eliminate(st, target.key)) ?? '';
  }
</script>

<div class="stack">
  <header class="row">
    <button class="fc-btn icon-btn" type="button" aria-label="Annuler le vote" onclick={() => act(cancelVote)}>←</button>
    <h1>Qui éliminer ?</h1>
  </header>

  {#if !confirming}
    <p class="fc-muted" style="margin: 0">Mettez-vous d'accord, puis touchez le joueur à éliminer.</p>
    {#each alive as p (p.key)}
      <button class="fc-btn pick" class:on={selected === p.key} type="button" onclick={() => (selected = p.key)}>
        {p.name}
      </button>
    {/each}
    <button class="fc-btn fc-btn-primary fc-btn-block" type="button" disabled={!target} onclick={() => (confirming = true)}>
      Éliminer {target ? target.name : '…'}
    </button>
  {:else if target}
    <div class="fc-card stack center">
      <h2>Confirmer l'élimination de {target.name} ?</h2>
      <p class="fc-muted" style="margin: 0">Son rôle sera révélé à tous.</p>
      {#if error}<p class="fc-error" role="alert">{error}</p>{/if}
      <button class="fc-btn fc-btn-danger fc-btn-block" type="button" onclick={confirm}>Oui, éliminer {target.name}</button>
      <button class="fc-btn fc-btn-block" type="button" onclick={() => (confirming = false)}>Non, revenir</button>
    </div>
  {/if}
</div>
