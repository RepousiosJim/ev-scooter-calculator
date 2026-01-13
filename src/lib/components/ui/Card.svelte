<script lang="ts">
  let { title, class: className = '', children }: {
    title?: string;
    class?: string;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg {className}">
  {#if title}
    <h2 class="text-xl font-semibold mb-4 text-textMain">{title}</h2>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>
