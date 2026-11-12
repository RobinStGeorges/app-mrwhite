<script lang="ts">
  let { label, value = $bindable(), min, max }: { label: string; value: number; min: number; max: number } = $props();
</script>

<div class="stepper">
  <span class="grow">{label}</span>
  <button class="fc-btn" type="button" aria-label={`Moins de ${label.toLowerCase()}`} disabled={value <= min} onclick={() => (value = Math.max(min, value - 1))}>−</button>
  <span class="val">{value}</span>
  <button class="fc-btn" type="button" aria-label={`Plus de ${label.toLowerCase()}`} disabled={value >= max} onclick={() => (value = Math.min(max, value + 1))}>＋</button>
</div>
