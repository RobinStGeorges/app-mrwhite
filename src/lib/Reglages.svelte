<script lang="ts">
  import { saveSettings } from './data';
  import { WORDS } from './launch';
  import { LEVEL_LABELS, filterPairs, type MrWhiteSettings } from './words';

  let { familyId, settings }: { familyId: string; settings: MrWhiteSettings } = $props();

  const allIds = WORDS.categories.map((c) => c.id);
  const selectedCategories = $derived(settings.categories.length > 0 ? settings.categories : allIds);
  const poolSize = $derived(filterPairs(WORDS.pairs, settings).length);

  function toggleSpy() {
    saveSettings(familyId, { ...settings, spyKnowsRole: !settings.spyKnowsRole });
  }

  function toggleLevel(level: number) {
    const next = settings.levels.includes(level) ? settings.levels.filter((l) => l !== level) : [...settings.levels, level];
    if (next.length === 0) return; // au moins un niveau
    saveSettings(familyId, { ...settings, levels: next.sort() });
  }

  function toggleCategory(id: string) {
    const current = selectedCategories;
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    if (next.length === 0) return; // au moins une catégorie
    saveSettings(familyId, { ...settings, categories: next.length === allIds.length ? [] : next });
  }

  function allCategories() {
    saveSettings(familyId, { ...settings, categories: [] });
  }

  const countByLevel = (l: number) => WORDS.pairs.filter((p) => p.niveau === l).length;
</script>

<div class="stack">
  <header class="row">
    <a class="fc-btn icon-btn" href="#/" aria-label="Retour">←</a>
    <h1>⚙️ Réglages</h1>
  </header>
  <p class="fc-muted" style="margin: 0">Ces réglages sont partagés par toute la famille.</p>

  <section class="fc-card stack">
    <h2>Règle du jeu</h2>
    <div class="checks">
      <label>
        <input type="checkbox" checked={settings.spyKnowsRole} onchange={toggleSpy} />
        <span>L'espion sait qu'il est espion<br /><span class="fc-muted">Désactivé : il croit avoir le même mot que les civils.</span></span>
      </label>
    </div>
  </section>

  <section class="fc-card stack">
    <h2>Difficulté des mots</h2>
    <div class="checks">
      {#each [1, 2, 3] as level (level)}
        <label>
          <input type="checkbox" checked={settings.levels.includes(level)} onchange={() => toggleLevel(level)} />
          <span>{LEVEL_LABELS[level]} <span class="fc-muted">({countByLevel(level)} paires)</span></span>
        </label>
      {/each}
    </div>
    <p class="fc-muted" style="margin: 0">« Difficile » = mots très proches, plus dur à repérer.</p>
  </section>

  <section class="fc-card stack">
    <div class="row spread">
      <h2>Catégories</h2>
      <button class="link-btn" type="button" onclick={allCategories}>Tout cocher</button>
    </div>
    <div class="checks">
      {#each WORDS.categories as c (c.id)}
        <label>
          <input type="checkbox" checked={selectedCategories.includes(c.id)} onchange={() => toggleCategory(c.id)} />
          <span>{c.label}</span>
        </label>
      {/each}
    </div>
  </section>

  <p class="center" style:color={poolSize < 20 ? 'var(--fc-danger)' : 'var(--fc-muted)'}>
    {poolSize} paires disponibles avec ces réglages{poolSize < 20 ? ' — les mots vont vite se répéter.' : '.'}
  </p>
</div>
