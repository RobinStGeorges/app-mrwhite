<script lang="ts">
  import { session } from 'famille-core';
  import { route } from './lib/route';
  import { watchGames, watchSettings } from './lib/data';
  import type { GameRecord } from './lib/records';
  import { DEFAULT_SETTINGS, type MrWhiteSettings } from './lib/words';
  import Game from './lib/Game.svelte';
  import Gate from './lib/Gate.svelte';
  import History from './lib/History.svelte';
  import Home from './lib/Home.svelte';
  import Reglages from './lib/Reglages.svelte';
  import Scores from './lib/Scores.svelte';
  import Setup from './lib/Setup.svelte';
  import Toast from './lib/Toast.svelte';
  import UpdateBanner from './lib/UpdateBanner.svelte';

  let games = $state<GameRecord[]>([]);
  let gamesLoaded = $state(false);
  let settings = $state<MrWhiteSettings>({ ...DEFAULT_SETTINGS, levels: [...DEFAULT_SETTINGS.levels] });

  // Parties et réglages sont écoutés une seule fois pour toute l'app, dès que la famille est connue.
  const familyId = $derived($session.status === 'ready' ? $session.familyId : null);

  $effect(() => {
    if (!familyId) return;
    const stopGames = watchGames(
      familyId,
      (g) => {
        games = g;
        gamesLoaded = true;
      },
      () => (gamesLoaded = true),
    );
    const stopSettings = watchSettings(familyId, (s) => (settings = s), () => {});
    return () => {
      stopGames();
      stopSettings();
    };
  });
</script>

<UpdateBanner />
<Toast />

{#if $session.status === 'loading'}
  <div class="center-screen">
    <div style="font-size: 3rem">🕵️</div>
    <p class="fc-muted">Chargement…</p>
  </div>
{:else if $session.status === 'signedOut'}
  <Gate status="signedOut" />
{:else if $session.status === 'noFamily'}
  <Gate status="noFamily" />
{:else if $session.status === 'ready'}
  {#if $route === 'setup'}
    <Setup {settings} />
  {:else if $route === 'game'}
    <Game familyId={$session.familyId} me={$session.displayName} {settings} {games} />
  {:else if $route === 'scores'}
    <Scores {games} loaded={gamesLoaded} />
  {:else if $route === 'history'}
    <History familyId={$session.familyId} {games} loaded={gamesLoaded} />
  {:else if $route === 'settings'}
    <Reglages familyId={$session.familyId} {settings} />
  {:else}
    <Home />
  {/if}
{/if}
