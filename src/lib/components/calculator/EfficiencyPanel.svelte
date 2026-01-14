<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const stats = $derived(calculatorState.stats);

  const speedEfficiencyValue = $derived(Math.min(100, (stats.speed / 100) * 100));
  const rangeEfficiencyValue = $derived(Math.min(100, (stats.totalRange / 150) * 100));
  const accelEfficiencyValue = $derived(stats.accelScore);
  const costEfficiencyValue = $derived(Math.min(100, (5 / stats.costPer100km) * 100));

  const getColor = (value: number) => {
    if (value >= 90) return '#10b981';
    if (value >= 75) return '#3b82f6';
    if (value >= 60) return '#60a5fa';
    return '#d97706';
  };

  const getLabel = (value: number) => {
    if (value >= 90) return 'Excellent';
    if (value >= 75) return 'Good';
    if (value >= 60) return 'Fair';
    return 'Needs Improvement';
  };
</script>

<div class="bg-black/20 rounded-xl p-5 border border-white/5">
  <h3 class="text-lg font-semibold text-textMain mb-4">Efficiency Metrics</h3>
  
  <div class="space-y-4">
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-textMuted">Speed Efficiency</span>
        <span class="text-xs" style:color={getColor(speedEfficiencyValue)}>{getLabel(speedEfficiencyValue)}</span>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${speedEfficiencyValue}%`}
          style:background-color={getColor(speedEfficiencyValue)}
        ></div>
      </div>
      <div class="text-right text-xs text-textMuted mt-1">{speedEfficiencyValue.toFixed(0)}%</div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-textMuted">Range Efficiency</span>
        <span class="text-xs" style:color={getColor(rangeEfficiencyValue)}>{getLabel(rangeEfficiencyValue)}</span>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${rangeEfficiencyValue}%`}
          style:background-color={getColor(rangeEfficiencyValue)}
        ></div>
      </div>
      <div class="text-right text-xs text-textMuted mt-1">{rangeEfficiencyValue.toFixed(0)}%</div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-textMuted">Acceleration Score</span>
        <span class="text-xs" style:color={getColor(accelEfficiencyValue)}>{getLabel(accelEfficiencyValue)}</span>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${accelEfficiencyValue}%`}
          style:background-color={getColor(accelEfficiencyValue)}
        ></div>
      </div>
      <div class="text-right text-xs text-textMuted mt-1">{accelEfficiencyValue.toFixed(0)}%</div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-textMuted">Cost Efficiency</span>
        <span class="text-xs" style:color={getColor(costEfficiencyValue)}>{getLabel(costEfficiencyValue)}</span>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${costEfficiencyValue}%`}
          style:background-color={getColor(costEfficiencyValue)}
        ></div>
      </div>
      <div class="text-right text-xs text-textMuted mt-1">{costEfficiencyValue.toFixed(0)}%</div>
    </div>
  </div>
</div>
