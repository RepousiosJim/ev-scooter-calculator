<script lang="ts">
  import { calculatorState, createShareLink } from '$lib/stores/calculator.svelte';

  let showToast = $state(false);

  async function handleShare() {
    const link = createShareLink(calculatorState.config);
    if (link) {
      await navigator.clipboard.writeText(link);
      showToast = true;
      setTimeout(() => showToast = false, 2500);
    }
  }
</script>

<button
  type="button"
  onclick={handleShare}
  class="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider flex items-center gap-1.5"
  aria-label="Share configuration"
>
  Share
</button>

{#if showToast}
  <div class="fixed bottom-20 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-lg shadow-lg z-[60] text-sm font-medium">
    Link copied to clipboard!
  </div>
{/if}
