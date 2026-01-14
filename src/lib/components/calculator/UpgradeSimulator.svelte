<script lang="ts">
  import { calculatorState, simulateUpgrade, clearSimulation } from '$lib/stores/calculator.svelte';
  import UpgradeCard from './UpgradeCard.svelte';

  const recommendations = $derived(calculatorState.recommendations);
  const activeUpgrade = $derived(calculatorState.activeUpgrade);
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg mb-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-textMain">Suggested Upgrades</h2>
    {#if activeUpgrade}
      <button
        type="button"
        onclick={clearSimulation}
        class="text-xs text-textMuted hover:text-textMain transition-colors"
        aria-label="Clear selection"
      >
        Clear selection
      </button>
    {/if}
  </div>

  {#if recommendations.length === 0}
    <div class="text-center py-12 text-textMuted">
      <div class="text-5xl mb-4">✨</div>
      <div class="text-lg font-medium text-textMain mb-2">Your setup is optimized!</div>
      <div class="text-sm">No upgrades recommended at this time.<br />Your configuration is well-balanced.</div>
      <button
        type="button"
        onclick={() => {
          document.getElementById('upgrade-guidance')?.scrollIntoView({ behavior: 'smooth' });
        }}
        class="mt-4 text-sm text-primary hover:text-primaryDark transition-colors underline"
      >
        View Upgrade Guidance →
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {#each recommendations as rec}
        <UpgradeCard
          recommendation={rec}
          isSelected={activeUpgrade === rec.upgradeType}
          isApplied={false}
        />
      {/each}
    </div>
  {/if}
</div>
