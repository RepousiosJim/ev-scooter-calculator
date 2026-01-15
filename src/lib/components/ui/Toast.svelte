<script lang="ts">
  import { onMount } from 'svelte';

  let { message, onClose }: { message: string; onClose: () => void } = $props();

  onMount(() => {
    setTimeout(onClose, 3000);
  });
</script>

<div class="fixed bottom-4 right-4 bg-success text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in z-[60]" role="alert" aria-live="polite">
  {message}
</div>
