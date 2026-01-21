<script lang="ts">
  import { tick } from 'svelte';
  import { slide } from 'svelte/transition';

  let {
    tabs,
    activeTab = $bindable(),
    icons = {},
    showProgress = false
  }: {
    tabs: { label: string; value: string; progress?: number }[];
    activeTab: string;
    icons?: Record<string, string>;
    showProgress?: boolean;
  } = $props();

  let tabButtons = $state<HTMLElement[]>([]);

  async function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowRight') {
      const nextIndex = (index + 1) % tabs.length;
      activeTab = tabs[nextIndex].value;
      event.preventDefault();
      await tick();
      tabButtons[nextIndex]?.focus();
    } else if (event.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      activeTab = tabs[prevIndex].value;
      event.preventDefault();
      await tick();
      tabButtons[prevIndex]?.focus();
    }
  }

  const activeIndex = $derived(tabs.findIndex(t => t.value === activeTab));

  // Track tab progress for analytics
  $effect(() => {
    if (showProgress && tabs[activeIndex]?.progress !== undefined) {
      // Progress tracking can be added here
    }
  });
</script>

<div class="relative" role="tablist" aria-label="Main navigation">
  <div class="flex items-center gap-1 p-1 bg-white/2 rounded-full border border-white/5">
    {#each tabs as tab, index (tab.value)}
      <button
        bind:this={tabButtons[index]}
        onclick={() => activeTab = tab.value}
        onkeydown={(e) => handleKeydown(e, index)}
        role="tab"
        aria-selected={activeTab === tab.value}
        aria-controls={`${tab.value}-panel`}
        id={`${tab.value}-tab`}
        tabindex={activeTab === tab.value ? 0 : -1}
        class="relative flex-1 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300
          {activeTab === tab.value
            ? 'text-text-primary bg-white/5 shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-white/2'
          }"
      >
        <span class="whitespace-nowrap">{tab.label}</span>

        <!-- Active Underline -->
        {#if activeTab === tab.value}
          <div
            class="absolute -bottom-px left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full"
            aria-hidden="true"
          ></div>
        {/if}
      </button>
    {/each}
  </div>
</div>
