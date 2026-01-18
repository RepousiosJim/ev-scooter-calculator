<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const tabs: Array<{ label: string; value: 'configuration' | 'upgrades' }> = [
    { label: 'Configure', value: 'configuration' },
    { label: 'Upgrades', value: 'upgrades' }
  ];

  const tabIcons: Record<string, string> = {
    configuration: '⚙️',
    upgrades: '🚀'
  };
</script>

<div class="w-full space-y-6">
  <!-- Tab Navigation -->
  <div
    class="flex items-center justify-center gap-2 p-2 bg-bgCard rounded-xl border border-white/5 shadow-lg"
    role="tablist"
    aria-label="Main navigation"
  >
    {#each tabs as tab (tab.value)}
      <button
        type="button"
        role="tab"
        aria-selected={calculatorState.activeTab === tab.value}
        aria-controls={tab.value + '-panel'}
        class="relative flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200"
        class:text-text-main={calculatorState.activeTab === tab.value}
        class:text-text-muted={calculatorState.activeTab !== tab.value}
        class:bg-bg-hover={calculatorState.activeTab === tab.value}
        class:hover:bg-bg-input={calculatorState.activeTab !== tab.value}
        onclick={() => calculatorState.activeTab = tab.value}
      >
        <span class="text-lg" aria-hidden="true">{tabIcons[tab.value]}</span>
        <span class="font-medium">{tab.label}</span>
        {#if calculatorState.activeTab === tab.value}
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-main rounded-full"></div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Tab Panels -->
  <div role="tabpanel" id="configuration-panel" aria-labelledby="configuration-tab" class:hidden={calculatorState.activeTab !== 'configuration'}>
    {#if calculatorState.activeTab === 'configuration'}
      <slot name="configuration" />
    {/if}
  </div>

  <div role="tabpanel" id="upgrades-panel" aria-labelledby="upgrades-tab" class:hidden={calculatorState.activeTab !== 'upgrades'}>
    {#if calculatorState.activeTab === 'upgrades'}
      <slot name="upgrades" />
    {/if}
  </div>
</div>
