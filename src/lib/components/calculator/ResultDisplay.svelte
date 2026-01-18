<script lang="ts">
  import type { PerformanceStats } from '$lib/types';
  import { calculatorState, setPredictionMode } from '$lib/stores/calculator.svelte';
  import StatBox from '$lib/components/ui/StatBox.svelte';
  import FormulaDetailsPanel from './FormulaDetailsPanel.svelte';

  let { stats: overrideStats, showToggle = true }: { stats?: PerformanceStats | null; showToggle?: boolean } = $props();

  const stats = $derived(overrideStats ?? calculatorState.stats);
  const currentMode = $derived(calculatorState.predictionMode);
  const showFormulas = $derived(() => calculatorState.showFormulas);

  function toggleMode() {
    setPredictionMode(currentMode === 'spec' ? 'realworld' : 'spec');
  }

  function toggleFormulas() {
    calculatorState.showFormulas = !calculatorState.showFormulas;
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
    <button
      type="button"
      onclick={toggleFormulas}
      aria-pressed={showFormulas()}
      class={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        showFormulas()
          ? 'bg-primary text-white'
          : 'bg-bgDark text-textMuted hover:text-textMain'
      }`}
    >
      Formula Details
    </button>
  </div>
{/if}

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
  <StatBox label="Top Speed" value={stats.speed} unit="km/h" />
  <StatBox label="Range" value={stats.totalRange} unit="km" />
  <StatBox label="Acceleration" value={stats.accelScore} unit="/100" />
  <StatBox label="Running Cost" value={stats.costPer100km} unit="$" />
  <StatBox label="Total Energy" value={stats.wh} unit="Wh" />
  <StatBox label="Max Hill Speed" value={stats.hillSpeed} unit="km/h" />
  <StatBox label="Peak Power" value={stats.totalWatts} unit="W" />
  <StatBox label="Charge Time" value={stats.chargeTime} unit="hrs" />
</div>

{#if showFormulas()}
  <FormulaDetailsPanel />
{/if}

