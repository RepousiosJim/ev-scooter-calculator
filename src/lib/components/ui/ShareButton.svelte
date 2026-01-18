<script lang="ts">
  import { copyToClipboard } from '$lib/utils/fileHandler';

  let showToast = $state(false);
  let toastMessage = $state('');

  async function handleShare() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('v', new Date().getTime().toString());
      const shareUrl = url.toString();
      
      await copyToClipboard(shareUrl);
      
      toastMessage = 'Configuration link copied!';
      showToast = true;
      
      setTimeout(() => {
        showToast = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toastMessage = 'Failed to copy link';
      showToast = true;
      
      setTimeout(() => {
        showToast = false;
      }, 3000);
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
  <div class="fixed bottom-4 right-4 bg-success text-white px-6 py-3 rounded-lg shadow-lg z-[60]" role="alert" aria-live="polite">
    {toastMessage}
  </div>
{/if}
