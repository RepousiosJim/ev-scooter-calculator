<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { speedVal, speedUnit, distanceVal, distanceUnit } from '$lib/utils/units';
  import { Battery, Gauge, Rocket } from 'lucide-svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);
  const upgradeDelta = $derived(calculatorState.upgradeDelta);
</script>

{#if simStats && upgradeDelta}
  <div class="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-5 border border-white/10">
    <div class="mb-4 text-sm text-text-tertiary">Top 3 Performance Changes</div>

    <div class="grid grid-cols-3 gap-4">
      <div class="text-center">
        <div class="mb-2">
          <Battery size={24} class="text-text-secondary mb-1" />
          <div class="text-xs text-text-tertiary uppercase">Range</div>
          <div class="text-xl font-bold text-text-primary">
            {Math.round(distanceVal(stats.totalRange))}
            {distanceUnit()}
          </div>
        </div>
        <div class="text-xs text-text-tertiary">
          {upgradeDelta.rangeChange >= 0 ? '+' : ''}{Math.abs(distanceVal(upgradeDelta.rangeChange)).toFixed(1)}
          {distanceUnit()}
        </div>
        <div class={`text-sm font-medium ${upgradeDelta.rangeChange >= 0 ? 'text-success' : 'text-danger'}`}>
          ({upgradeDelta.rangePercent >= 0 ? '+' : ''}{upgradeDelta.rangePercent.toFixed(1)}%)
        </div>
      </div>

      <div class="text-center">
        <div class="mb-2">
          <Gauge size={24} class="text-text-secondary mb-1" />
          <div class="text-xs text-text-tertiary uppercase">Top Speed</div>
          <div class="text-xl font-bold text-text-primary">{Math.round(speedVal(stats.speed))} {speedUnit()}</div>
        </div>
        <div class="text-xs text-text-tertiary">
          {upgradeDelta.speedChange >= 0 ? '+' : ''}{Math.abs(speedVal(upgradeDelta.speedChange)).toFixed(1)}
          {speedUnit()}
        </div>
        <div class={`text-sm font-medium ${upgradeDelta.speedChange >= 0 ? 'text-success' : 'text-danger'}`}>
          ({upgradeDelta.speedPercent >= 0 ? '+' : ''}{upgradeDelta.speedPercent.toFixed(1)}%)
        </div>
      </div>

      <div class="text-center">
        <div class="mb-2">
          <Rocket size={24} class="text-text-secondary mb-1" />
          <div class="text-xs text-text-tertiary uppercase">Acceleration</div>
          <div class="text-xl font-bold text-text-primary">{Math.round(stats.accelScore)}/100</div>
        </div>
        <div class="text-xs text-text-tertiary">
          {upgradeDelta.accelChange >= 0 ? '+' : ''}{Math.abs(upgradeDelta.accelChange).toFixed(1)} /100
        </div>
        <div class={`text-sm font-medium ${upgradeDelta.accelChange >= 0 ? 'text-success' : 'text-danger'}`}>
          ({upgradeDelta.accelPercent >= 0 ? '+' : ''}{upgradeDelta.accelPercent.toFixed(1)}%)
        </div>
      </div>
    </div>
  </div>
{/if}
