<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  let activeTab = $state(calculatorState.activeTab);

  $effect(() => {
    calculatorState.activeTab = activeTab;
  });
</script>

<!-- Bottom Navigation Bar for Mobile -->
<nav 
  class="fixed bottom-0 left-0 right-0 z-sticky bg-bgCard/95 backdrop-blur-lg border-t border-white/10 pb-safe-area"
  role="tablist"
  aria-label="Mobile navigation"
>
  <div class="flex items-stretch h-16">
    <button
      type="button"
        role="tab"
        aria-selected={activeTab === 'configuration'}
        aria-controls="configuration-panel"
        class="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200"
        class:text-primary={activeTab === 'configuration'}
        class:text-textMuted={activeTab !== 'configuration'}
        onclick={() => activeTab = 'configuration'}
      >
        <span class="text-xl transition-transform duration-200" style:transform={activeTab === 'configuration' ? 'scale(1.1)' : 'scale(1)'} aria-hidden="true">
          ⚙️
        </span>
        <span class="text-xs font-medium">
          Configure
        </span>
        {#if activeTab === 'configuration'}
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"></div>
        {/if}
      </button>

    <button
      type="button"
        role="tab"
        aria-selected={activeTab === 'upgrades'}
        aria-controls="upgrades-panel"
        class="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200"
        class:text-primary={activeTab === 'upgrades'}
        class:text-textMuted={activeTab !== 'upgrades'}
        onclick={() => activeTab = 'upgrades'}
      >
        <span class="text-xl transition-transform duration-200" style:transform={activeTab === 'upgrades' ? 'scale(1.1)' : 'scale(1)'} aria-hidden="true">
          🚀
        </span>
        <span class="text-xs font-medium">
          Upgrades
        </span>
        {#if activeTab === 'upgrades'}
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"></div>
        {/if}
      </button>
  </div>
</nav>

<style>
  /* Safe area inset for notched devices */
  @supports (padding: env(safe-area-inset-bottom)) {
    .pb-safe-area {
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  /* Remove tap highlight */
  @media (hover: none) and (pointer: coarse) {
    button {
      -webkit-tap-highlight-color: transparent;
    }

    button:active {
      opacity: 0.7;
      transform: scale(0.98);
    }
  }
</style>
