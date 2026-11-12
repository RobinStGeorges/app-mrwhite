<script lang="ts">
  import { needRefresh, applyUpdate } from './update';

  let offline = $state(typeof navigator !== 'undefined' && !navigator.onLine);

  $effect(() => {
    const on = () => (offline = false);
    const off = () => (offline = true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  });
</script>

{#if $needRefresh}
  <div class="banner banner-update" role="status">
    <span>Une nouvelle version est disponible.</span>
    <button type="button" onclick={applyUpdate}>Mettre à jour</button>
  </div>
{/if}

{#if offline}
  <div class="banner banner-offline" role="status">
    <span>Hors connexion — vos modifications seront synchronisées au retour du réseau.</span>
  </div>
{/if}
