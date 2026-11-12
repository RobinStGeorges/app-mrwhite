<script lang="ts">
  import { act } from './gameStore';
  import { alivePlayers, openVote, startDiscussion, type GameState } from './engine';
  import { ROLE_EMOJI, ROLE_LABEL } from './ui';

  let { s, onAbandon }: { s: GameState; onAbandon: () => void } = $props();

  let now = $state(Date.now());
  let error = $state('');

  $effect(() => {
    if (s.roundStartedAt === null) return;
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  const alive = $derived(alivePlayers(s));
  const elapsed = $derived(s.roundStartedAt === null ? 0 : Math.max(0, Math.floor((now - s.roundStartedAt) / 1000)));
  const clock = $derived(`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`);

  function run(fn: (st: GameState) => GameState) {
    error = act(fn) ?? '';
  }
</script>

<div class="stack">
  <header class="row spread">
    <h1>Tour {s.round}</h1>
    <span class="fc-muted">{alive.length} joueur{alive.length > 1 ? 's' : ''} en jeu</span>
  </header>

  <div class="fc-card">
    <h2 style="margin-bottom: 0.4rem">Ordre de passage</h2>
    {#each s.players as p (p.key)}
      <div class="player" class:out={!p.alive}>
        <span class="num">{p.order}</span>
        <span class="name grow">{p.name}</span>
        {#if !p.alive}
          <span class="badge {p.role}">{ROLE_EMOJI[p.role]} {ROLE_LABEL[p.role]}</span>
        {:else if p.key === alive[0]?.key}
          <span class="badge civil">Commence</span>
        {/if}
      </div>
    {/each}
  </div>

  {#if s.roundStartedAt === null}
    <p class="fc-muted center" style="margin: 0">Chacun décrit son mot à son tour, sans jamais le prononcer.</p>
    <button class="fc-btn fc-btn-primary fc-btn-block" type="button" onclick={() => run((st) => startDiscussion(st))}>
      Lancer la discussion
    </button>
  {:else}
    <div class="center">
      <div class="fc-muted">Discussion en cours</div>
      <div class="timer">{clock}</div>
    </div>
    <button class="fc-btn fc-btn-primary fc-btn-block" type="button" onclick={() => run(openVote)}>🗳️ Voter</button>
  {/if}

  {#if error}<p class="fc-error" role="alert">{error}</p>{/if}
  <button class="link-btn" type="button" onclick={onAbandon}>Abandonner la partie</button>
</div>
