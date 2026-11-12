<script lang="ts">
  import { game, setGame, act } from './gameStore';
  import { markSaved } from './engine';
  import { saveGame } from './data';
  import { go } from './route';
  import type { GameRecord } from './records';
  import type { MrWhiteSettings } from './words';
  import Assign from './Assign.svelte';
  import Play from './Play.svelte';
  import Vote from './Vote.svelte';
  import Reveal from './Reveal.svelte';
  import Result from './Result.svelte';

  let { familyId, me, settings, games }: { familyId: string; me: string; settings: MrWhiteSettings; games: GameRecord[] } = $props();

  // Le résultat est envoyé en ligne une seule fois, dès que la partie est terminée.
  $effect(() => {
    const s = $game;
    if (s && s.phase === 'finished' && !s.saved) {
      saveGame(familyId, s, me);
      act(markSaved);
    }
  });

  $effect(() => {
    if (!$game) go('#/');
  });

  function abandon() {
    if (!confirm('Abandonner cette partie ? Rien ne sera enregistré.')) return;
    setGame(null);
    go('#/');
  }
</script>

{#if $game}
  {#if $game.phase === 'assign'}
    <Assign s={$game} {games} onAbandon={abandon} />
  {:else if $game.phase === 'play'}
    <Play s={$game} onAbandon={abandon} />
  {:else if $game.phase === 'vote'}
    <Vote s={$game} />
  {:else if $game.phase === 'reveal'}
    <Reveal s={$game} />
  {:else}
    <Result s={$game} {games} {settings} />
  {/if}
{/if}
