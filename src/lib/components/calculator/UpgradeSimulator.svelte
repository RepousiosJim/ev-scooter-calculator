<script lang="ts">
  import { calculatorState, clearSimulation } from '$lib/stores/calculator.svelte';
  import UpgradeCard from './UpgradeCard.svelte';
  import { fly } from 'svelte/transition';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import { speedVal, speedUnit, distanceVal, distanceUnit } from '$lib/utils/units';

  const recommendations = $derived(calculatorState.recommendations);
  const incompatibleUpgrades = $derived(calculatorState.incompatibleUpgrades);
  const activeUpgrade = $derived(calculatorState.activeUpgrade);
  const stats = $derived(calculatorState.stats);

  let showIncompatible = $state(false);

  // Performance highlights for well-optimized configs
  const perfHighlights = $derived.by(() => {
    const s = stats;
    return [
      { label: 'Top Speed', value: `${Math.round(speedVal(s.speed))} ${speedUnit()}`, good: s.speed >= 60 },
      { label: 'Range', value: `${Math.round(distanceVal(s.totalRange))} ${distanceUnit()}`, good: s.totalRange >= 50 },
      { label: 'C-Rate', value: `${s.cRate.toFixed(1)}C`, good: s.cRate <= 2.0 },
      { label: 'Acceleration', value: `${Math.round(s.accelScore)}/100`, good: s.accelScore >= 60 },
      { label: 'Power', value: `${Math.round(s.totalWatts)}W`, good: s.totalWatts >= 2000 },
    ];
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-black text-text-primary tracking-tight">Upgrade Simulator</h2>
        <span
          class="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider"
        >
          {calculatorState.activePresetName}
        </span>
      </div>
      <p class="text-xs text-text-tertiary mt-1">Simulate hardware modifications and compare impact.</p>
    </div>

    {#if activeUpgrade}
      <button
        onclick={clearSimulation}
        class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider"
      >
        Reset
      </button>
    {/if}
  </div>

  {#if recommendations.length > 1}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
      {#each recommendations as upgrade, i (upgrade.upgradeType)}
        <div transition:fly={{ y: 20, delay: i * 100, duration: 400 }}>
          <UpgradeCard {upgrade} />
        </div>
      {/each}
    </div>
  {:else if recommendations.length === 1}
    <!-- Single recommendation: show upgrade + performance context side by side -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div transition:fly={{ y: 20, duration: 400 }}>
        <UpgradeCard upgrade={recommendations[0]} />
      </div>
      <div class="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5 flex flex-col justify-center space-y-5">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success border border-success/20 flex-shrink-0"
          >
            <Icon name="efficiency" size="md" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-text-primary">Nearly Optimized</h3>
            <p class="text-xs text-text-tertiary">Only one upgrade opportunity found</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          {#each perfHighlights as h (h.label)}
            <div class="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
              <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{h.label}</div>
              <div class="text-sm font-bold mt-0.5 {h.good ? 'text-success' : 'text-text-secondary'}">
                {h.value}
              </div>
            </div>
          {/each}
        </div>
        <p class="text-xs text-text-tertiary leading-relaxed">
          Your setup scores well across most metrics. Check the experimental upgrades below for further fine-tuning.
        </p>
      </div>
    </div>
  {:else}
    <!-- No recommendations: fully optimized with stats -->
    <div class="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5 sm:p-6 md:p-10 space-y-6">
      <div class="text-center space-y-4">
        <div
          class="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success border border-success/20"
        >
          <Icon name="efficiency" size="lg" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-bold text-text-primary">Peak Performance Reached</h3>
          <p class="text-sm text-text-secondary max-w-md mx-auto">
            Your current configuration is highly optimized. No critical bottlenecks or immediate hardware upgrades are
            recommended.
          </p>
        </div>
      </div>

      <!-- Performance proof grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 pt-2">
        {#each perfHighlights as h (h.label)}
          <div class="bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{h.label}</div>
            <div class="text-base font-black mt-1 {h.good ? 'text-success' : 'text-text-secondary'}">
              {h.value}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Incompatible Upgrades Section -->
  <div class="pt-8 border-t border-white/5 space-y-6">
    <div class="flex items-center justify-between px-1">
      <div class="space-y-1">
        <h3 class="text-lg font-bold text-text-primary tracking-tight">Experimental Upgrades</h3>
        <p class="text-xs text-text-tertiary">
          View modifications that are not currently recommended for your configuration.
        </p>
      </div>

      <button
        onclick={() => (showIncompatible = !showIncompatible)}
        class="flex items-center gap-2 px-3 py-1.5 border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider"
      >
        <Icon name={showIncompatible ? 'eye' : 'eye-off'} size="xs" />
        {showIncompatible ? 'Hide All' : `Show All (${incompatibleUpgrades.length})`}
      </button>
    </div>

    {#if showIncompatible}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 opacity-80">
        {#each incompatibleUpgrades as upgrade, i (upgrade.upgradeType)}
          <div transition:fly={{ y: 20, delay: i * 50, duration: 400 }}>
            <UpgradeCard {upgrade} isExperimental={true} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
