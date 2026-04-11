<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { speedVal, speedUnit, distanceVal, distanceUnit, costPer100Val, costDistanceLabel } from '$lib/utils/units';

  const stats = $derived(calculatorState.stats);

  const speedEfficiencyValue = $derived(Math.min(100, (speedVal(stats.speed) / speedVal(100)) * 100));
  const rangeEfficiencyValue = $derived(Math.min(100, (distanceVal(stats.totalRange) / distanceVal(150)) * 100));
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

  const metrics = $derived([
    {
      id: 'speed-eff',
      label: 'Speed Efficiency',
      value: speedEfficiencyValue,
      context: `${speedVal(stats.speed).toFixed(0)} ${speedUnit()} out of ${speedVal(100).toFixed(0)} ${speedUnit()} benchmark. Higher voltage and motor KV increase top speed.`
    },
    {
      id: 'range-eff',
      label: 'Range Efficiency',
      value: rangeEfficiencyValue,
      context: `${distanceVal(stats.totalRange).toFixed(0)} ${distanceUnit()} out of ${distanceVal(150).toFixed(0)} ${distanceUnit()} benchmark. ${stats.totalRange < 50 ? 'Typical for high-power or small-battery setups.' : stats.totalRange < 80 ? 'Average for dual-motor scooters.' : 'Good range for this class.'}`
    },
    {
      id: 'accel-eff',
      label: 'Acceleration Score',
      value: accelEfficiencyValue,
      context: `Power-to-weight ratio score. ${stats.accelScore < 40 ? 'Low — consider dual motors or higher wattage.' : stats.accelScore < 70 ? 'Adequate for commuting.' : 'Strong performance.'}`
    },
    {
      id: 'cost-eff',
      label: 'Cost Efficiency',
      value: costEfficiencyValue,
      context: `$${costPer100Val(stats.costPer100km).toFixed(2)} ${costDistanceLabel()}. Benchmark: $${costPer100Val(5).toFixed(2)} or less is excellent.`
    }
  ]);

  let expandedMetric = $state<string | null>(null);
</script>

<div
  class="bg-white/[0.02] p-4 border border-white/[0.06]"
  role="region"
  aria-label="Efficiency metrics"
  aria-live="polite"
  aria-atomic="false"
>
  <h3 class="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3" id="efficiency-heading">Efficiency Metrics</h3>

  <div class="space-y-2.5" role="list" aria-labelledby="efficiency-heading">
    {#each metrics as metric (metric.id)}
      <div role="listitem">
        <div class="flex items-center justify-between mb-1">
          <button
            type="button"
            class="text-xs text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1 group"
            id="{metric.id}-label"
            onclick={() => expandedMetric = expandedMetric === metric.id ? null : metric.id}
            aria-expanded={expandedMetric === metric.id}
          >
            {metric.label}
            <span class="text-[9px] text-text-tertiary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true">?</span>
          </button>
          <span class="text-[10px] font-bold" style:color={getColor(metric.value)}>{metric.value.toFixed(0)}%</span>
        </div>
        <div
          class="h-1.5 bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-labelledby="{metric.id}-label"
          aria-valuenow={Math.round(metric.value)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext="{metric.value.toFixed(0)}% - {getLabel(metric.value)}"
        >
          <div
            class="h-full rounded-full transition-all duration-500"
            style:width={`${metric.value}%`}
            style:background-color={getColor(metric.value)}
            aria-hidden="true"
          ></div>
        </div>
        {#if expandedMetric === metric.id}
          <p class="text-[11px] text-text-secondary mt-1 leading-relaxed bg-white/[0.02] rounded px-3 py-2 border border-white/[0.04]">
            {metric.context}
          </p>
        {/if}
      </div>
    {/each}
  </div>
</div>
