<script lang="ts">
  import { fly, slide } from 'svelte/transition';

  let {
    title,
    isExpanded = $bindable(false),
    hasContent = true,
    children,
    level = 1
  }: {
    title: string;
    isExpanded?: boolean;
    hasContent?: boolean;
    children?: import('svelte').Snippet;
    level?: number;
  } = $props();

  const styles = $derived(() => {
    if (level === 2) {
      return {
        bgColor: 'bg-bg-tertiary',
        borderColor: 'border-white/10',
        indicatorColor: 'text-secondary',
      };
    }
    return {
      bgColor: 'bg-bg-secondary',
      borderColor: 'border-white/5',
      indicatorColor: 'text-primary',
    };
  });
</script>

<div class="rounded-xl border {styles().borderColor} {styles().bgColor} shadow-lg overflow-hidden">
  <button
    type="button"
    onclick={() => (isExpanded = !isExpanded)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        isExpanded = !isExpanded;
      }
    }}
    disabled={!hasContent}
    class="w-full flex items-center justify-between px-6 py-4 transition-all duration-slow hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
    aria-expanded={isExpanded}
    aria-controls="panel-content"
  >
    <div class="flex items-center gap-3">
      <span
        class="text-lg transition-transform duration-slow"
        class:rotate-90={isExpanded}
        aria-hidden="true"
      >
        {isExpanded ? '▼' : '▶'}
      </span>
      <span class="font-semibold text-text-primary">{title}</span>
      {#if !hasContent}
        <span class="text-xs text-text-tertiary uppercase tracking-wider ml-2">
          (empty)
        </span>
      {/if}
    </div>
    {#if hasContent}
      <div class="flex items-center gap-2">
        <span class="text-sm text-text-secondary" aria-hidden="true">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
        <div class="w-2 h-2 rounded-full {isExpanded ? 'bg-primary' : 'bg-text-tertiary'} transition-colors duration-slow" aria-hidden="true"></div>
      </div>
    {/if}
  </button>

  {#if isExpanded && hasContent}
    <div
      id="panel-content"
      transition:slide={{ duration: 300, easing: (t) => Math.sqrt(t) }}
      class="border-t border-white/5"
    >
      <div
        transition:fly={{ duration: 300, y: -10 }}
        class="p-6"
        role="region"
        aria-labelledby="panel-heading"
      >
        <h2 id="panel-heading" class="sr-only">{title}</h2>
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .rotate-90 {
    transform: rotate(90deg);
  }
</style>
