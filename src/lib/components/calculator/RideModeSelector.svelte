<script lang="ts">
  import { calculatorState, applyRideMode } from '$lib/stores/calculator.svelte';
  import type { RideMode } from '$lib/types';
  import { rideModePresets } from '$lib/data/ride-modes';
  import { calculateRideModeImpact } from '$lib/physics';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

  const modeButtons = [
    { id: 'eco' as RideMode, icon: 'ride-mode-eco', color: 'text-green-400' },
    {
      id: 'normal' as RideMode,
      icon: 'ride-mode-normal',
      color: 'text-blue-400',
    },
    {
      id: 'sport' as RideMode,
      icon: 'ride-mode-sport',
      color: 'text-orange-400',
    },
    { id: 'turbo' as RideMode, icon: 'ride-mode-turbo', color: 'text-red-400' },
  ];

  const currentMode = $derived(calculatorState.rideMode);
  const impact = $derived(() => {
    const preset = rideModePresets[currentMode];
    if (!preset) return null;
    return calculateRideModeImpact(calculatorState.config, preset.style, preset.regen, calculatorState.predictionMode);
  });

  const impactValue = $derived(impact());

  function selectMode(mode: RideMode) {
    applyRideMode(mode);
  }
</script>

<div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
  <div class="flex items-center justify-between mb-3">
    <h4 class="text-xs font-bold text-text-secondary uppercase tracking-widest">Ride Mode</h4>
    {#if impactValue}
      <div class="flex gap-4 text-[10px]">
        <span class={impactValue.rangePercent >= 0 ? 'text-success' : 'text-danger'}>
          Range {impactValue.rangePercent >= 0 ? '+' : ''}{impactValue.rangePercent.toFixed(0)}%
        </span>
        <span class={impactValue.speedPercent >= 0 ? 'text-success' : 'text-danger'}>
          Speed {impactValue.speedPercent >= 0 ? '+' : ''}{impactValue.speedPercent.toFixed(0)}%
        </span>
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Ride mode selection">
    {#each modeButtons as mode (mode.id)}
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === mode.id}
        onclick={() => selectMode(mode.id)}
        class={`flex items-center justify-center gap-1.5 py-2 border transition-all duration-200 ${
          currentMode === mode.id
            ? 'border-primary/30 bg-primary/10 text-text-primary'
            : 'border-white/[0.06] bg-white/[0.02] text-text-tertiary hover:border-white/10 hover:text-text-secondary'
        }`}
      >
        <Icon name={mode.icon} size="xs" class={currentMode === mode.id ? mode.color : 'opacity-40'} />
        <span class="text-[10px] font-bold uppercase tracking-wider">{rideModePresets[mode.id].name}</span>
      </button>
    {/each}
  </div>
</div>
