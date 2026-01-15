<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const stats = $derived(calculatorState.stats);

  let showToast = $state(false);
  let toastMessage = $state('');

  async function handleShare() {
    const { exportConfiguration } = await import('$lib/utils/configHandler');
    const link = (await import('$lib/stores/calculator.svelte')).createShareLink(calculatorState.config);
    if (link) {
      await navigator.clipboard.writeText(link);
      toastMessage = 'Link copied to clipboard!';
      showToast = true;
    }
  }
</script>

<button
  type="button"
  onclick={handleShare}
  class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primaryDark transition-colors"
  aria-label="Share configuration"
>
  Share Configuration
</button>

{#if showToast}
  <div class="fixed bottom-4 right-4 bg-success text-white px-6 py-3 rounded-lg shadow-lg z-[60]">
    {toastMessage}
  </div>
{/if}
