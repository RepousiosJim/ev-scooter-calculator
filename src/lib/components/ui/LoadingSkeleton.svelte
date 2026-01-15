<script lang="ts">
  import { onMount } from 'svelte';

  let { type = 'default' }: { type?: 'default' | 'card' | 'text' } = $props();
</script>

{#if type === 'card'}
  <div class="bg-bgCard rounded-xl p-6 border border-white/10 animate-pulse">
    <div class="space-y-3">
      <div class="h-4 bg-bgInput rounded"></div>
      <div class="h-4 bg-bgInput rounded w-3/4"></div>
    </div>
  </div>
{:else if type === 'text'}
  <div class="bg-bgInput rounded h-8 w-full animate-pulse"></div>
{:else}
  <div class="bg-bgInput rounded h-8 w-32 animate-pulse"></div>
{/if}
