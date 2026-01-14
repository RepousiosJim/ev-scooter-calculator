<script lang="ts">
  import type { PerformanceStats } from '$lib/types';
  import { calculatorState, setPredictionMode } from '$lib/stores/calculator.svelte';
  import StatBox from '$lib/components/ui/StatBox.svelte';

  let { stats: overrideStats, showToggle = true }: { stats?: PerformanceStats | null; showToggle?: boolean } = $props();

  const stats = $derived(overrideStats ?? calculatorState.stats);
  const currentMode = $derived(calculatorState.predictionMode);

  function toggleMode() {
    setPredictionMode(currentMode === 'spec' ? 'realworld' : 'spec');
  }
</script>

{#if showToggle}
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={toggleMode}
        class={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          currentMode === 'spec'
            ? 'bg-primary text-white'
            : 'bg-bgDark text-textMuted hover:text-textMain'
        }`}
      >
        Spec Mode
      </button>
      <button
        type="button"
        onclick={toggleMode}
        class={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          currentMode === 'realworld'
            ? 'bg-primary text-white'
            : 'bg-bgDark text-textMuted hover:text-textMain'
        }`}
      >
        Real-World Mode
      </button>
    </div>
    <div class="text-xs text-textMuted">
      {currentMode === 'spec' ? 'Manufacturer estimates' : 'Real-world tested data'}
    </div>
  </div>
{/if}

<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
  <div class="rounded-lg border border-white/5 bg-bgInput/50 p-3">
    <div class="text-xs text-textMuted">Top Speed</div>
    <div class="text-lg font-semibold text-textMain">{Math.round(stats.speed)} km/h</div>
  </div>
  <div class="rounded-lg border border-white/5 bg-bgInput/50 p-3">
    <div class="text-xs text-textMuted">Range</div>
    <div class="text-lg font-semibold text-textMain">{Math.round(stats.totalRange)} km</div>
  </div>
  <div class="rounded-lg border border-white/5 bg-bgInput/50 p-3">
    <div class="text-xs text-textMuted">Acceleration</div>
    <div class="text-lg font-semibold text-textMain">{Math.round(stats.accelScore)}/100</div>
  </div>
  <div class="rounded-lg border border-white/5 bg-bgInput/50 p-3">
    <div class="text-xs text-textMuted">Running Cost</div>
    <div class="text-lg font-semibold text-textMain">${stats.costPer100km.toFixed(2)}</div>
  </div>
</div>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
  <StatBox label="Total Energy" value={stats.wh} unit="Wh" />
  <StatBox label="Range" value={stats.totalRange} unit="km" />
  <StatBox label="Top Speed" value={stats.speed} unit="km/h" />
  <StatBox label="Max Hill Speed" value={stats.hillSpeed} unit="km/h" />
  <StatBox label="Peak Power" value={stats.totalWatts} unit="W" />
  <StatBox label="Charge Time" value={stats.chargeTime} unit="hrs" />
  <StatBox label="Cost/100km" value={stats.costPer100km} unit="$" />
</div>

