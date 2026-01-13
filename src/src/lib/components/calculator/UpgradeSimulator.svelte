<script lang="ts">
  import { fly } from 'svelte/transition';
  import { calculatorState, simulateUpgrade, clearSimulation } from '$lib/stores/calculator.svelte';

  const bottlenecks = $derived(calculatorState.bottlenecks);
  const activeUpgrade = $derived(calculatorState.activeUpgrade);
  const simStats = $derived(calculatorState.simStats);

  function handleUpgrade(type: 'parallel' | 'voltage' | 'controller') {
    simulateUpgrade(type);
  }

  const isCritical = (type: 'parallel' | 'voltage' | 'controller') => {
    return bottlenecks.some(b => b.upgrade === type);
  };
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg mb-6">
  <h2 class="text-xl font-semibold mb-4 text-textMain">Suggested Upgrades</h2>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
    <!-- Parallel Battery Upgrade -->
    <button
      type="button"
      aria-label="Add parallel battery upgrade"
      class={`p-4 rounded-xl cursor-pointer transition-all border border-gray-700 hover:-translate-y-0.5 ${
        activeUpgrade === 'parallel'
          ? 'bg-primary/15 border-primary shadow-lg shadow-primary/20'
          : 'bg-gradient-to-br from-gray-800 to-gray-900'
      } ${isCritical('parallel') ? 'animate-pulse border-danger' : ''}`}
      onclick={() => handleUpgrade('parallel')}
    >
      <div class="font-bold text-primary mb-2">Add Parallel Battery</div>
      <div class="text-sm text-textMuted">Double range & reduce sag.</div>
      {#if isCritical('parallel')}
        <div class="mt-3 bg-danger text-white text-xs font-bold px-2 py-1 rounded inline-block">
          CRITICAL UPGRADE
        </div>
      {/if}
    </button>

    <!-- Voltage Upgrade -->
    <button
      type="button"
      aria-label="Voltage boost upgrade"
      class={`p-4 rounded-xl cursor-pointer transition-all border border-gray-700 hover:-translate-y-0.5 ${
        activeUpgrade === 'voltage'
          ? 'bg-primary/15 border-primary shadow-lg shadow-primary/20'
          : 'bg-gradient-to-br from-gray-800 to-gray-900'
      } ${isCritical('voltage') ? 'animate-pulse border-danger' : ''}`}
      onclick={() => handleUpgrade('voltage')}
    >
      <div class="font-bold text-primary mb-2">Voltage Boost (+15%)</div>
      <div class="text-sm text-textMuted">Increase top speed & torque.</div>
      {#if isCritical('voltage')}
        <div class="mt-3 bg-danger text-white text-xs font-bold px-2 py-1 rounded inline-block">
          CRITICAL UPGRADE
        </div>
      {/if}
    </button>

    <!-- Controller Upgrade -->
    <button
      type="button"
      aria-label="High-amp controller upgrade"
      class={`p-4 rounded-xl cursor-pointer transition-all border border-gray-700 hover:-translate-y-0.5 ${
        activeUpgrade === 'controller'
          ? 'bg-primary/15 border-primary shadow-lg shadow-primary/20'
          : 'bg-gradient-to-br from-gray-800 to-gray-900'
      } ${isCritical('controller') ? 'animate-pulse border-danger' : ''}`}
      onclick={() => handleUpgrade('controller')}
    >
      <div class="font-bold text-primary mb-2">High-Amp Controller</div>
      <div class="text-sm text-textMuted">Improve acceleration & hills.</div>
      {#if isCritical('controller')}
        <div class="mt-3 bg-danger text-white text-xs font-bold px-2 py-1 rounded inline-block">
          CRITICAL UPGRADE
        </div>
      {/if}
    </button>
  </div>

  <!-- Simulated Results Display -->
  {#if simStats && activeUpgrade}
    <div
      class="mt-4 bg-secondary/10 p-4 rounded-lg"
      transition:fly={{ y: 20, duration: 300 }}
    >
      <div class="font-semibold text-secondary mb-2">Simulated Results:</div>
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
    </div>
  {/if}
</div>
