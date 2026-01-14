<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);
  const upgradeDelta = $derived(calculatorState.upgradeDelta);
</script>

{#if simStats && upgradeDelta}
  <div class="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-5 border border-white/10">
    <div class="mb-4 text-sm text-textMuted">Top 3 Performance Changes</div>

    <div class="grid grid-cols-3 gap-4">
      <div class="text-center">
        <div class="mb-2">
          <span class="text-2xl mb-1">🔋</span>
          <div class="text-xs text-textMuted uppercase">Range</div>
          <div class="text-xl font-bold text-textMain">{Math.round(stats.totalRange)} km</div>
        </div>
        <div class="text-xs text-textMuted">
          {upgradeDelta.rangeChange >= 0 ? '+' : ''}{Math.abs(upgradeDelta.rangeChange).toFixed(1)} km
        </div>
        <div class={`text-sm font-medium ${upgradeDelta.rangeChange >= 0 ? 'text-success' : 'text-danger'}`}>
          ({upgradeDelta.rangePercent >= 0 ? '+' : ''}{upgradeDelta.rangePercent.toFixed(1)}%)
        </div>
      </div>

      <div class="text-center">
        <div class="mb-2">
          <span class="text-2xl mb-1">⚡</span>
          <div class="text-xs text-textMuted uppercase">Top Speed</div>
          <div class="text-xl font-bold text-textMain">{Math.round(stats.speed)} km/h</div>
        </div>
        <div class="text-xs text-textMuted">
          {upgradeDelta.speedChange >= 0 ? '+' : ''}{Math.abs(upgradeDelta.speedChange).toFixed(1)} km/h
        </div>
        <div class={`text-sm font-medium ${upgradeDelta.speedChange >= 0 ? 'text-success' : 'text-danger'}`}>
          ({upgradeDelta.speedPercent >= 0 ? '+' : ''}{upgradeDelta.speedPercent.toFixed(1)}%)
        </div>
      </div>

      <div class="text-center">
        <div class="mb-2">
          <span class="text-2xl mb-1">🚀</span>
          <div class="text-xs text-textMuted uppercase">Acceleration</div>
          <div class="text-xl font-bold text-textMain">{Math.round(stats.accelScore)}/100</div>
        </div>
        <div class="text-xs text-textMuted">
          {upgradeDelta.accelChange >= 0 ? '+' : ''}{Math.abs(upgradeDelta.accelChange).toFixed(1)} /100
        </div>
        <div class={`text-sm font-medium ${upgradeDelta.accelChange >= 0 ? 'text-success' : 'text-danger'}`}>
          ({upgradeDelta.accelPercent >= 0 ? '+' : ''}{upgradeDelta.accelPercent.toFixed(1)}%)
        </div>
      </div>
    </div>
  </div>
{/if}
