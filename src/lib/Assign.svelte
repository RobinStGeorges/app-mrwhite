<script lang="ts">
  import { act } from './gameStore';
  import { ackReveal, beginPlay, claimSlot, nameKey, revealFor, type GameState } from './engine';
  import { getPreviousPlayers } from './prefs';
  import { knownNames, type GameRecord } from './records';
  import { ROLE_EMOJI, ROLE_LABEL } from './ui';

  let { s, games, onAbandon }: { s: GameState; games: GameRecord[]; onAbandon: () => void } = $props();

  let selected = $state<number | null>(null);
  let name = $state('');
  let error = $state('');
  let nameInput = $state<HTMLInputElement>();

  const taken = $derived(s.slots.filter((x) => x.name !== null).length);
  const allTaken = $derived(taken === s.slots.length);
  const info = $derived(s.revealing !== null ? revealFor(s, s.revealing) : null);

  // Raccourcis de saisie : joueurs de la dernière partie, puis prénoms connus (sans doublons).
  const suggestions = $derived.by(() => {
    const used = new Set(s.players.map((p) => p.key));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of [...getPreviousPlayers(), ...knownNames(games)]) {
      const k = nameKey(n);
      if (!used.has(k) && !seen.has(k)) {
        seen.add(k);
        out.push(n);
      }
    }
    return out.slice(0, 12);
  });

  $effect(() => {
    if (selected !== null && nameInput) nameInput.focus();
  });

  function choose(i: number) {
    if (s.slots[i].name !== null) return;
    selected = i;
    name = '';
    error = '';
  }

  function validate(e: Event) {
    e.preventDefault();
    if (selected === null) return;
    const err = act((st) => claimSlot(st, selected as number, name));
    if (err) {
      error = err;
      return;
    }
    selected = null;
    name = '';
    error = '';
  }
</script>

{#if info}
  <!-- Étape 2 : le joueur découvre son rôle, seul devant l'écran. -->
  <div class="stack">
    <p class="warn center" style="margin: 0">👀 Cache l'écran : seul <strong>{s.slots[s.revealing as number].name}</strong> doit voir ce qui suit.</p>
    <div class="secret stack">
      {#if info.role === 'white'}
        <div class="big">👻 Tu es Mr White</div>
        <div>Tu n'as pas de mot. Écoute bien les autres pour deviner celui des civils !</div>
      {:else}
        {#if info.showRole}<div>{ROLE_EMOJI[info.role]} Tu es {ROLE_LABEL[info.role]}</div>{/if}
        <div>Ton mot est :</div>
        <div class="word">{info.word}</div>
      {/if}
    </div>
    <button class="fc-btn fc-btn-primary fc-btn-block" type="button" onclick={() => act(ackReveal)}>
      J'ai mémorisé — cacher l'écran
    </button>
  </div>
{:else if selected !== null}
  <!-- Étape 1 : le joueur donne son prénom. -->
  <form class="fc-card stack" onsubmit={validate}>
    <h2>Case n°{selected + 1}</h2>
    <label for="prenom" class="fc-muted">Ton prénom ou pseudo</label>
    <input id="prenom" class="fc-input" type="text" maxlength="20" autocomplete="off" bind:value={name} bind:this={nameInput} />
    {#if suggestions.length > 0}
      <div class="chips">
        {#each suggestions as n (n)}
          <button class="chip" type="button" onclick={() => (name = n)}>{n}</button>
        {/each}
      </div>
    {/if}
    {#if error}<p class="fc-error" role="alert">{error}</p>{/if}
    <button class="fc-btn fc-btn-primary fc-btn-block" type="submit">Découvrir mon rôle</button>
    <button class="fc-btn fc-btn-block" type="button" onclick={() => (selected = null)}>Annuler</button>
  </form>
{:else}
  <div class="stack">
    <header class="row spread">
      <h1>Choisis ta case</h1>
      <span class="fc-muted">{taken}/{s.slots.length}</span>
    </header>
    <p class="fc-muted" style="margin: 0">Chacun son tour : touche une case libre, donne ton prénom et découvre ton rôle en secret.</p>
    <div class="grid">
      {#each s.slots as slot, i (i)}
        <button class="box" class:taken={slot.name !== null} type="button" disabled={slot.name !== null} onclick={() => choose(i)}>
          {#if slot.name !== null}
            ✓<small>{slot.name}</small>
          {:else}
            {i + 1}
          {/if}
        </button>
      {/each}
    </div>
    {#if allTaken}
      <button class="fc-btn fc-btn-primary fc-btn-block" type="button" onclick={() => act((st) => beginPlay(st))}>
        Tout le monde est prêt — voir l'ordre de passage
      </button>
    {/if}
    <button class="link-btn" type="button" onclick={onAbandon}>Abandonner la partie</button>
  </div>
{/if}
