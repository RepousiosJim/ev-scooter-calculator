<script lang="ts">
  import { calculatorState, simulateUpgrade } from '$lib/stores/calculator.svelte';
  import type { Recommendation } from '$lib/types';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import DifficultyBar from '$lib/components/ui/DifficultyBar.svelte';
  import UpgradeQuickStats from './UpgradeQuickStats.svelte';
  import { slide } from 'svelte/transition';
  import { ChevronDown } from 'lucide-svelte';

  let { upgrade, isExperimental = false } = $props<{
    upgrade: Recommendation;
    isExperimental?: boolean;
  }>();

  const isSelected = $derived(calculatorState.activeUpgrade === upgrade.upgradeType);

  // Track manual user toggle separately; auto-expand when this upgrade is active
  let _userExpanded = $state(false);
  const isExpanded = $derived(isSelected || _userExpanded);

  // ROI calculation
  const roi = $derived.by(() => {
    const delta = calculatorState.upgradeDelta;
    const sim = calculatorState.simStats;
    if (!delta || !sim || calculatorState.activeUpgrade !== upgrade.upgradeType) return null;

    // Parse cost from string like "$200-400" or "$150"
    const costMatch = upgrade.estimatedCost.match(/\$(\d[\d,]*)/);
    if (!costMatch) return null;
    const cost = parseInt(costMatch[1].replace(/,/g, ''), 10);
    if (!cost || cost <= 0) return null;

    const rangeGainKm = delta.rangeChange;
    const rangeGainPct = delta.rangePercent;

    // ROI: $ per % range improvement
    const costPerPctRange = rangeGainPct > 0 ? Math.round(cost / rangeGainPct) : null;

    return { cost, rangeGainKm: Math.round(rangeGainKm), rangeGainPct: Math.round(rangeGainPct), costPerPctRange };
  });
</script>

<div
  class="group relative bg-white/[0.02] rounded-xl border transition-all duration-300 overflow-hidden flex flex-col h-full
    {isSelected ? 'border-primary ring-1 ring-primary/20 shadow-lg' : 'border-white/5 hover:border-white/20'}
    {isExperimental && !isSelected ? 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100' : ''}"
>
  <!-- Card Header -->
  <div class="p-4 space-y-3 flex-grow">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-text-primary group-hover:text-primary transition-colors pr-2">
            {upgrade.title}
          </h3>
          {#if isExperimental}
            <span
              class="px-1.5 py-0.5 rounded-sm bg-warning/10 border border-warning/20 text-[8px] font-bold text-warning uppercase tracking-widest"
            >
              Not Recommended
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <DifficultyBar difficulty={upgrade.difficulty} size="sm" />
        </div>
      </div>
    </div>

    <p class="text-sm text-text-secondary leading-relaxed">
      {upgrade.reason}
    </p>

    <!-- Quick Stats -->
    <div class="pt-2 border-t border-white/5">
      <UpgradeQuickStats {upgrade} />
    </div>

    <!-- Expandable Content -->
    <div class="pt-2">
      <button
        onclick={() => (_userExpanded = !_userExpanded)}
        class="w-full flex items-center justify-between py-2 text-xs font-bold text-text-tertiary hover:text-text-primary transition-colors"
      >
        DETAILS
        <span class="transition-transform duration-300" style:transform={isExpanded ? 'rotate(180deg)' : ''}
          ><ChevronDown size={14} /></span
        >
      </button>

      {#if isExpanded}
        <div transition:slide class="space-y-4 pt-4 border-t border-white/5">
          <div class="space-y-2">
            <h4 class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
              <Icon name="bolt" size="xs" /> Expected Gains
            </h4>
            <div class="space-y-2">
              <div class="text-xs text-text-secondary flex items-start gap-2">
                <span class="text-success mt-1 font-bold">SPEC:</span>
                {upgrade.expectedGains.spec}
              </div>
              <div class="text-xs text-text-secondary flex items-start gap-2 opacity-80">
                <span class="text-primary mt-1 font-bold">REAL:</span>
                {upgrade.expectedGains.realworld}
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
              <Icon name="chart" size="xs" /> Considerations
            </h4>
            <p class="text-xs text-text-secondary leading-relaxed">
              {upgrade.tradeoffs}
            </p>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Action Footer -->
  <div class="p-4 bg-white/2 border-t border-white/5 mt-auto">
    <div class="flex items-center justify-between mb-3">
      <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Est. Cost</div>
      <div class="text-sm font-bold text-text-primary">
        {upgrade.estimatedCost}
      </div>
    </div>

    {#if roi}
      <div
        class="flex items-center justify-between mb-3 py-2 px-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06]"
      >
        <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">ROI</span>
        <div class="text-right">
          {#if roi.rangeGainPct > 0}
            <span class="text-xs font-bold text-success">+{roi.rangeGainPct}% range</span>
            {#if roi.costPerPctRange}
              <span class="text-[10px] text-text-tertiary ml-1.5">(${roi.costPerPctRange}/% gain)</span>
            {/if}
          {:else}
            <span class="text-xs text-text-tertiary">No range gain</span>
          {/if}
        </div>
      </div>
    {/if}

    <button
      onclick={() => {
        simulateUpgrade(upgrade.upgradeType);
        setTimeout(() => {
          document.getElementById('upgrade-comparison-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }}
      class="w-full py-2.5 font-bold text-sm transition-all shadow-sm
        {isSelected
        ? 'bg-primary text-bg-primary shadow-primary/20'
        : 'bg-white/5 text-text-primary hover:bg-white/10 border border-white/10'}"
    >
      {isSelected ? 'Previewing' : 'Preview Upgrade'}
    </button>
  </div>
</div>
