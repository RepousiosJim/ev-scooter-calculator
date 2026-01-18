<script lang="ts">
  import { fly, slide } from 'svelte/transition';
  import { calculatorState, simulateUpgrade } from '$lib/stores/calculator.svelte';
  import type { Recommendation } from '$lib/types';
  import DifficultyBar from '$lib/components/ui/DifficultyBar.svelte';
  import UpgradeQuickStats from './UpgradeQuickStats.svelte';

  let { 
    recommendation, 
    isSelected = false,
    isApplied = false 
  }: { 
    recommendation: Recommendation; 
    isSelected?: boolean;
    isApplied?: boolean;
  } = $props();

  let expandedSection: 'why' | 'changes' | 'gains' | 'tradeoffs' | null = $state(null);
  let isCardExpanded = $state(false);

  function handleUpgradeType() {
    if (!isApplied) {
      simulateUpgrade(recommendation.upgradeType);
    }
  }

  function toggleSection(section: 'why' | 'changes' | 'gains' | 'tradeoffs') {
    expandedSection = expandedSection === section ? null : section;
  }

  function toggleCardExpand() {
    isCardExpanded = !isCardExpanded;
  }

  function getIcon(upgradeType: string): string {
    switch (upgradeType) {
      case 'parallel': return '🔋';
      case 'voltage': return '⚡';
      case 'controller': return '🎛️';
      case 'motor': return '🔧';
      case 'tires': return '🛞';
      default: return '⚙️';
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUpgradeType();
    }
  }

  function toggleSectionClick(e: MouseEvent, section: 'why' | 'changes' | 'gains' | 'tradeoffs') {
    e.stopPropagation();
    toggleSection(section);
  }

  function expandClick(e: MouseEvent) {
    e.stopPropagation();
    toggleCardExpand();
  }

  function applyClick(e: MouseEvent) {
    e.stopPropagation();
    handleUpgradeType();
  }
</script>

<div
  class={`rounded-xl border transition-all duration-300 ${
    isApplied
      ? 'border-success bg-success/5 opacity-60 cursor-not-allowed'
      : isSelected
      ? 'border-primary bg-primary/5 shadow-lg'
      : 'border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 hover:-translate-y-1 hover:border-gray-500 cursor-pointer'
  }`}
  onclick={!isApplied ? handleUpgradeType : undefined}
  onkeydown={handleKeydown}
  role="button"
  tabindex={0}
>
  <div class="p-5">
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-start gap-3">
        <span class="text-2xl">{getIcon(recommendation.upgradeType)}</span>
        <div>
          <h3 class="font-bold text-textMain text-base">{recommendation.title}</h3>
          <DifficultyBar difficulty={recommendation.difficulty} showLabel={true} size="sm" />
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        {#if isApplied}
          <span class="px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
            ✓ Applied
          </span>
        {:else if isSelected}
          <span class="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
            Active
          </span>
        {/if}
        
        <button
          type="button"
          onclick={expandClick}
          class="touch-target-icon text-textMuted hover:text-textMain transition-transform p-2.5 rounded-lg hover:bg-white/5"
          aria-label={isCardExpanded ? 'Collapse details' : 'Expand details'}
        >
          {#if isCardExpanded}
            ▼
          {:else}
            ▶
          {/if}
        </button>
      </div>
    </div>

    <!-- Quick Stats (when selected) -->
    {#if isSelected && !isApplied}
      <div 
        class="mb-4 p-3 bg-black/30 rounded-lg border border-white/10"
        transition:slide={{ duration: 200 }}
      >
        <div class="text-xs text-textMuted mb-2 font-medium">Quick Comparison</div>
        <UpgradeQuickStats {recommendation} />
      </div>
    {/if}

    <!-- Expandable Details -->
    {#if isCardExpanded}
      <div class="space-y-3 border-t border-white/10 pt-4" transition:fly={{ y: 10, duration: 200 }}>
        <!-- Why -->
        <div>
          <button
            type="button"
            onclick={(e) => toggleSectionClick(e, 'why')}
            class="flex items-center justify-between w-full text-left py-3 sm:py-2 px-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'why'}
          >
            <span class="text-sm font-semibold text-textMain">Why upgrade?</span>
            <span class={`text-textMuted transition-transform ${expandedSection === 'why' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {#if expandedSection === 'why'}
            <p 
              class="text-sm text-textMuted mt-2 pl-2 border-l-2 border-primary/30"
              transition:slide={{ duration: 150 }}
            >
              {recommendation.reason}
            </p>
          {/if}
        </div>

        <!-- What Changes -->
        <div>
          <button
            type="button"
            onclick={(e) => toggleSectionClick(e, 'changes')}
            class="flex items-center justify-between w-full text-left py-3 sm:py-2 px-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'changes'}
          >
            <span class="text-sm font-semibold text-textMain">What it changes</span>
            <span class={`text-textMuted transition-transform ${expandedSection === 'changes' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {#if expandedSection === 'changes'}
            <p 
              class="text-sm text-textMuted mt-2 pl-2 border-l-2 border-primary/30"
              transition:slide={{ duration: 150 }}
            >
              {recommendation.whatChanges}
            </p>
          {/if}
        </div>

        <!-- Expected Gains -->
        <div>
          <button
            type="button"
            onclick={(e) => toggleSectionClick(e, 'gains')}
            class="flex items-center justify-between w-full text-left py-3 sm:py-2 px-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'gains'}
          >
            <span class="text-sm font-semibold text-textMain">Expected gains</span>
            <span class={`text-textMuted transition-transform ${expandedSection === 'gains' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {#if expandedSection === 'gains'}
            <div 
              class="text-sm text-textMuted mt-2 pl-2 border-l-2 border-primary/30"
              transition:slide={{ duration: 150 }}
            >
              <div class="mb-2">
                <span class="text-xs font-semibold text-primary">Spec Mode:</span>
                <div class="text-xs mt-1">{recommendation.expectedGains.spec}</div>
              </div>
              <div>
                <span class="text-xs font-semibold text-secondary">Real-World Mode:</span>
                <div class="text-xs mt-1">{recommendation.expectedGains.realworld}</div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Tradeoffs -->
        <div>
          <button
            type="button"
            onclick={(e) => toggleSectionClick(e, 'tradeoffs')}
            class="flex items-center justify-between w-full text-left py-3 sm:py-2 px-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-expanded={expandedSection === 'tradeoffs'}
          >
            <span class="text-sm font-semibold text-warning">Tradeoffs</span>
            <span class={`text-textMuted transition-transform ${expandedSection === 'tradeoffs' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {#if expandedSection === 'tradeoffs'}
            <p 
              class="text-sm text-textMuted mt-2 pl-2 border-l-2 border-warning/30"
              transition:slide={{ duration: 150 }}
            >
              {recommendation.tradeoffs}
            </p>
          {/if}
        </div>

        <!-- Apply Button (only show if not applied) -->
        {#if !isApplied}
          <div class="pt-3 border-t border-white/10">
            <button
              type="button"
              onclick={applyClick}
              class={`w-full py-3.5 sm:py-3 px-6 rounded-lg font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-white hover:bg-primaryDark ring-2 ring-primary/50'
                  : 'bg-bgInput text-textMain hover:bg-bgInput/80'
              }`}
              aria-label={`Apply ${recommendation.title} upgrade`}
            >
              {isSelected ? '✓ Selected' : 'Apply Upgrade'}
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Cost Badge (always visible) -->
    <div class="mt-3 pt-3 border-t border-white/10">
      <div class="flex items-center justify-between">
        <span class="text-xs text-textMuted">Estimated Cost</span>
        <span class="text-sm font-semibold text-textMain">{recommendation.estimatedCost}</span>
      </div>
    </div>
  </div>
</div>
