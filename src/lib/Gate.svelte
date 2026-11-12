<script lang="ts">
  import { signIn, toFrenchMessage } from 'famille-core';

  let { status }: { status: 'signedOut' | 'noFamily' } = $props();

  // Connexion directe, uniquement en développement local (en production, la session
  // est partagée avec le portail, qui est servi sur le même domaine).
  let email = $state('');
  let password = $state('');
  let error = $state('');

  async function devLogin(e: Event) {
    e.preventDefault();
    error = '';
    try {
      await signIn(email, password);
    } catch (err) {
      error = toFrenchMessage(err);
    }
  }
</script>

<div class="center-screen">
  <div style="font-size: 3rem">🕵️</div>
  <h1>Mr White</h1>
  {#if status === 'signedOut'}
    <p class="fc-muted">Connectez-vous depuis le portail pour accéder à vos parties.</p>
  {:else}
    <p class="fc-muted">Créez ou rejoignez votre espace familial depuis le portail pour utiliser cette application.</p>
  {/if}
  <a class="fc-btn fc-btn-primary" href="/">Ouvrir le portail</a>

  {#if import.meta.env.DEV && status === 'signedOut'}
    <form class="fc-card stack" style="width: 100%" onsubmit={devLogin}>
      <strong>Connexion de développement</strong>
      <input class="fc-input" type="email" placeholder="E-mail" bind:value={email} required />
      <input class="fc-input" type="password" placeholder="Mot de passe" bind:value={password} required />
      {#if error}<span class="fc-error">{error}</span>{/if}
      <button class="fc-btn" type="submit">Se connecter</button>
    </form>
  {/if}
</div>
