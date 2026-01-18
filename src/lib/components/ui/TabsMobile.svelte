<script lang="ts">
  import { tick, onMount } from 'svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

  let {
    tabs,
    activeTab = $bindable(),
    icons = {}
  }: {
    tabs: { label: string; value: string }[];
    activeTab: string;
    icons?: Record<string, string>;
  } = $props();

  let tabButtons = $state<HTMLElement[]>([]);
  let isMobile = $state(false);

  function updateMobileState() {
    isMobile = window.innerWidth < 640;
  }

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

  onMount(() => {
    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    
    return () => {
      window.removeEventListener('resize', updateMobileState);
    };
  });

  const activeIndex = $derived(tabs.findIndex(t => t.value === activeTab));
</script>

{#if isMobile}
  <!-- Mobile: Bottom Navigation Bar -->
  <nav 
    class="fixed bottom-0 left-0 right-0 z-sticky bg-tertiary border-t border-gray-600 px-safe pb-safe"
    role="tablist"
    aria-label="Main navigation"
  >
    <div class="flex items-center justify-around py-2 px-2">
      {#each tabs as tab, index (tab.value)}
        <button
          bind:this={tabButtons[index]}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          aria-controls={`${tab.value}-panel`}
          id={`${tab.value}-tab`}
          tabindex={activeTab === tab.value ? 0 : -1}
          onkeydown={(e) => handleKeydown(e, index)}
          class={`relative flex flex-col items-center gap-1 px-3 py-2 min-w-[70px] transition-all duration-normal touch-target
            ${activeTab === tab.value
              ? 'text-primary'
              : 'text-textMuted hover:text-textMain'
            }`}
          onclick={() => activeTab = tab.value}
        >
          <!-- Tab Icon -->
          {#if icons[tab.value]}
            <span 
              class={`text-2xl transition-transform duration-fast ${activeTab === tab.value ? 'scale-110' : ''}`}
              aria-hidden="true"
            >
              {icons[tab.value]}
            </span>
          {/if}

          <!-- Tab Label -->
          <span class="text-xs font-medium">
            {tab.label}
          </span>

          <!-- Active Indicator -->
          {#if activeTab === tab.value}
            <div 
              class="absolute -bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
              aria-hidden="true"
            ></div>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Safe Area Spacing for Notched Devices -->
    <div class="pb-safe"></div>
  </nav>

{:else}
  <!-- Desktop: Top Navigation Bar -->
  <div 
    class="relative flex items-center gap-2 p-1 bg-bgInput/40 rounded-full border border-gray-600"
    role="tablist"
    aria-label="Main navigation"
  >
    {#each tabs as tab, index (tab.value)}
      <button
        bind:this={tabButtons[index]}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.value}
        aria-controls={`${tab.value}-panel`}
        id={`${tab.value}-tab`}
        onkeydown={(e) => handleKeydown(e, index)}
        class={`relative px-4 py-2.5 sm:px-5 sm:py-3 rounded-full text-sm font-medium transition-all duration-normal
          ${activeTab === tab.value
            ? 'bg-gradient-main bg-[length:200%_200%] text-white shadow-lg scale-105'
            : 'text-textMuted hover:text-textMain hover:bg-white/10'
          }`}
        onclick={() => activeTab = tab.value}
      >
        {#if icons[tab.value]}
          <span 
            class="text-lg mr-2"
            aria-hidden="true"
          >
            {icons[tab.value]}
          </span>
        {/if}
        {tab.label}

        <!-- Active Indicator for Desktop -->
        {#if activeTab === tab.value}
          <div 
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm"
            aria-hidden="true"
          ></div>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  /* Mobile bottom navigation */
  nav button {
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  nav button:focus-visible {
    outline: 2px solid var(--brand-primary);
    outline-offset: 2px;
  }

  nav button:focus:not(:focus-visible) {
    outline: none;
  }

  nav button:active {
    transform: scale(0.95);
  }

  /* Desktop navigation */
  .rounded-full button:focus-visible {
    outline: 2px solid var(--brand-primary);
    outline-offset: 2px;
  }

  .rounded-full button:focus:not(:focus-visible) {
    outline: none;
  }

  /* Mobile responsive adjustments */
  @media (max-width: 640px) {
    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .px-safe {
      padding-left: max(0.5rem, env(safe-area-inset-left));
      padding-right: max(0.5rem, env(safe-area-inset-right));
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    nav button *,
    .rounded-full button * {
      transition: none !important;
    }
  }
</style>
