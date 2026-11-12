<script lang="ts">
  import { toast } from './toast';
</script>

{#if $toast}
  <div class="toast" role="alert">{$toast}</div>
{/if}
