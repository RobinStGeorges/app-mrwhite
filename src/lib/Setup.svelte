<script lang="ts">
  import { game } from './gameStore';
  import { MAX_PLAYERS, MIN_PLAYERS, validateConfig } from './engine';
  import { WORDS, startNewGame } from './launch';
  import { getLastConfig } from './prefs';
  import { go } from './route';
  import { filterPairs, type MrWhiteSettings } from './words';
  import Stepper from './Stepper.svelte';

  let { settings }: { settings: MrWhiteSettings } = $props();

  const last = getLastConfig();
  let total = $state(last.total);
  let civils = $state(last.civils);
  let spies = $state(last.spies);
  let whites = $state(last.whites);
  let error = $state('');

  const config = $derived({ total, civils, spies, whites });
  const problem = $derived(validateConfig(config));
  const poolSize = $derived(filterPairs(WORDS.pairs, settings).length);
  const sum = $derived(civils + spies + whites);

  function start() {
    error = '';
    if (problem) return;
    if ($game && $game.phase !== 'finished' && !confirm('Une partie est en cours. La remplacer par une nouvelle partie ?')) return;
    try {
      startNewGame(config, settings);
      go('#/partie');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Impossible de lancer la partie.';
    }
  }
</script>

<div class="stack">
  <header class="row">
    <a class="fc-btn icon-btn" href="#/" aria-label="Retour">←</a>
    <h1>Nouvelle partie</h1>
  </header>

  <div class="fc-card stack">
    <Stepper label="Nombre de joueurs" bind:value={total} min={MIN_PLAYERS} max={MAX_PLAYERS} />
    <hr style="border: none; border-top: 1px solid var(--fc-border); width: 100%" />
    <Stepper label="Civils" bind:value={civils} min={0} max={MAX_PLAYERS} />
    <Stepper label="Espions" bind:value={spies} min={0} max={MAX_PLAYERS} />
    <Stepper label="Mr White" bind:value={whites} min={0} max={MAX_PLAYERS} />
    <div class="row spread fc-muted">
      <span>Total des rôles</span>
      <strong style:color={sum === total ? 'var(--c-civil)' : 'var(--fc-danger)'}>{sum} / {total}</strong>
    </div>
  </div>

  {#if problem}
    <p class="fc-error" role="alert">{problem}</p>
  {/if}
  {#if poolSize === 0}
    <p class="fc-error" role="alert">Aucune paire de mots ne correspond à vos réglages. Modifiez-les dans « Réglages ».</p>
  {/if}
  {#if error}<p class="fc-error" role="alert">{error}</p>{/if}

  <button class="fc-btn fc-btn-primary fc-btn-block" type="button" disabled={problem !== null || poolSize === 0} onclick={start}>
    Distribuer les rôles
  </button>
  <p class="fc-muted center" style="margin: 0">{poolSize} paires de mots disponibles</p>
</div>
