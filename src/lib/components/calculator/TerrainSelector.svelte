<script lang="ts">
  import { calculatorState, applyTerrainMode } from '$lib/stores/calculator.svelte';
  import type { TerrainMode } from '$lib/types';
  import { terrainModePresets } from '$lib/data/terrain-modes';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

  const terrainButtons: Array<{ id: TerrainMode; color: string }> = [
    { id: 'urban', color: 'text-cyan-400' },
    { id: 'suburban', color: 'text-green-400' },
    { id: 'highway', color: 'text-blue-400' },
    { id: 'hilly', color: 'text-orange-400' },
  ];

  const currentTerrain = $derived(calculatorState.terrainMode);
  const currentSlope = $derived(calculatorState.config.slope);

  // Estimate range impact vs urban baseline (slope=2)
  const rangeImpact = $derived.by(() => {
    const baseline = terrainModePresets['urban'].slope;
    const selected = terrainModePresets[currentTerrain]?.slope ?? baseline;
    // Each 1% slope roughly reduces range by ~3% (simplified model)
    const delta = ((baseline - selected) * 3).toFixed(0);
    return Number(delta);
  });
</script>

<div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
  <div class="flex items-center justify-between mb-3">
    <h4 class="text-xs font-bold text-text-secondary uppercase tracking-widest">Terrain</h4>
    {#if currentTerrain !== 'urban'}
      <span class="text-[10px] {rangeImpact >= 0 ? 'text-success' : 'text-danger'}">
        Range {rangeImpact >= 0 ? '+' : ''}{rangeImpact}% vs urban
      </span>
    {:else}
      <span class="text-[10px] text-text-tertiary">
        {currentSlope}% avg slope
      </span>
    {/if}
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Terrain selection">
    {#each terrainButtons as terrain (terrain.id)}
      {@const preset = terrainModePresets[terrain.id]}
      {@const isActive = currentTerrain === terrain.id}
      <button
        type="button"
        role="radio"
        aria-checked={isActive}
        title={preset.description}
        onclick={() => applyTerrainMode(terrain.id)}
        class={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 border rounded-xl transition-all duration-200 ${
          isActive
            ? 'border-primary/30 bg-primary/10 text-text-primary shadow-sm shadow-primary/10'
            : 'border-white/[0.06] bg-white/[0.02] text-text-tertiary hover:border-white/10 hover:bg-white/[0.04] hover:text-text-secondary'
        }`}
      >
        <Icon name={preset.icon} size="sm" class={isActive ? terrain.color : 'opacity-40'} />
        <span class="text-[10px] font-bold uppercase tracking-wider">{preset.name}</span>
      </button>
    {/each}
  </div>
</div>
