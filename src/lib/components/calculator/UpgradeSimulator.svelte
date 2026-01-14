<script lang="ts">
  import type { Recommendation } from '$lib/types';
  import { fly } from 'svelte/transition';
  import { calculatorState, simulateUpgrade, clearSimulation } from '$lib/stores/calculator.svelte';

  const recommendations = $derived(calculatorState.recommendations);
  const activeUpgrade = $derived(calculatorState.activeUpgrade);
  const simStats = $derived(calculatorState.simStats);

  function handleUpgrade(type: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires') {
    simulateUpgrade(type);
  }

  function getConfidenceColor(confidence: Recommendation['confidence']) {
    switch (confidence) {
      case 'high': return 'text-success';
      case 'medium': return 'text-warning';
      case 'low': return 'text-textMuted';
      default: return 'text-textMuted';
    }
  }

  function getDifficultyBadge(difficulty: Recommendation['difficulty']) {
    switch (difficulty) {
      case 'easy': return 'bg-success/20 text-success border-success';
      case 'moderate': return 'bg-warning/20 text-warning border-warning';
      case 'hard': return 'bg-danger/20 text-danger border-danger';
      default: return 'bg-bgInput text-textMuted border-gray-600';
    }
  }
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg mb-6">
  <h2 class="text-xl font-semibold mb-4 text-textMain">Suggested Upgrades</h2>

  {#if recommendations.length === 0}
    <div class="text-center py-8 text-textMuted">
      <div class="text-4xl mb-3">✓</div>
      <div class="font-semibold">No upgrades recommended</div>
      <div class="text-sm mt-2">Your current configuration is well-balanced.</div>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 mt-4">
      {#each recommendations as rec}
        <div
          class={`rounded-xl border cursor-pointer transition-all ${
            activeUpgrade === rec.upgradeType
              ? 'border-primary bg-primary/10 shadow-lg'
              : 'border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 hover:-translate-y-0.5'
          }`}
          onclick={() => handleUpgrade(rec.upgradeType)}
        >
          <div class="p-4">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-bold text-textMain text-lg">{rec.title}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <span class={`text-xs px-2 py-0.5 rounded border ${getDifficultyBadge(rec.difficulty)}`}>
                    {rec.difficulty}
                  </span>
                  <span class={`text-xs ${getConfidenceColor(rec.confidence)}`}>
                    {rec.confidence} confidence
                  </span>
                </div>
              </div>
              <div class="text-xs text-textMuted whitespace-nowrap">
                {rec.estimatedCost}
              </div>
            </div>

            <div class="space-y-3 text-sm">
              <div>
                <span class="font-semibold text-textMain">Why:</span>
                <span class="text-textMuted ml-2">{rec.reason}</span>
              </div>

              <div>
                <span class="font-semibold text-textMain">What it changes:</span>
                <span class="text-textMuted ml-2">{rec.whatChanges}</span>
              </div>

              <div>
                <span class="font-semibold text-textMain">Expected gain:</span>
                <div class="mt-2 text-textMuted">
                  <div class="text-xs text-primary font-semibold mb-1">Spec Mode:</div>
                  <div class="text-xs">{rec.expectedGains.spec}</div>
                  <div class="text-xs text-secondary font-semibold mb-1 mt-2">Real-World Mode:</div>
                  <div class="text-xs">{rec.expectedGains.realworld}</div>
                </div>
              </div>

              <div>
                <span class="font-semibold text-textMain">Tradeoffs:</span>
                <span class="text-textMuted ml-2">{rec.tradeoffs}</span>
              </div>
            </div>

            {#if activeUpgrade === rec.upgradeType}
              <div
                class="mt-4 pt-4 border-t border-gray-700"
                transition:fly={{ y: 20, duration: 300 }}
              >
                <div class="font-semibold text-textMain mb-2">Simulated Results:</div>
                {#if simStats}
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-textMuted">Range:</span>
                      <span class="font-bold text-success">
                        {simStats.totalRange.toFixed(1)} km
                        (+{(simStats.totalRange / calculatorState.stats.totalRange * 100 - 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div>
                      <span class="text-textMuted">Speed:</span>
                      <span class="font-bold text-primary">
                        {simStats.speed.toFixed(1)} km/h
                        (+{(simStats.speed / calculatorState.stats.speed * 100 - 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
