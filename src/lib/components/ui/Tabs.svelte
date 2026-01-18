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
  <div class="flex items-center gap-2 p-1.5 bg-bg-secondary rounded-2xl border border-white/5 shadow-lg">
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
        class="relative flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-slow flex items-center justify-center gap-2
          {activeTab === tab.value
            ? 'text-white bg-gradient-brand shadow-lg scale-105'
            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }"
      >
        {#if icons[tab.value]}
          <span class="text-lg" aria-hidden="true">{icons[tab.value]}</span>
        {/if}
        <span class="whitespace-nowrap">{tab.label}</span>

        <!-- Progress Indicator (optional) -->
        {#if showProgress && tab.progress !== undefined}
          <div
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full
              {activeTab === tab.value ? 'bg-gradient-brand' : 'bg-bg-tertiary'}
              transition-all duration-slow"
            style="width: {tab.progress}%"
            aria-hidden="true"
          ></div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Active Tab Underline Animation -->
  <div
    class="absolute bottom-0 left-0 h-0.5 bg-gradient-brand rounded-full transition-all duration-slow ease-out"
    style="width: {100 / tabs.length}%; transform: translateX({activeIndex * 100}%)"
    aria-hidden="true"
  ></div>
</div>
