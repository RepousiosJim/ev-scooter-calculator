<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { speedVal, speedUnit, distanceVal, distanceUnit, costPer100Val, costDistanceLabel } from '$lib/utils/units';
  import { Info } from 'lucide-svelte';

  const stats = $derived(calculatorState.stats);

  const SPEED_BENCHMARK_KMH = 100;
  const RANGE_BENCHMARK_KM = 150;
  const COST_BENCHMARK_PER100KM = 5;

  const speedEfficiencyValue = $derived(Math.min(100, (speedVal(stats.speed) / speedVal(SPEED_BENCHMARK_KMH)) * 100));
  const rangeEfficiencyValue = $derived(
    Math.min(100, (distanceVal(stats.totalRange) / distanceVal(RANGE_BENCHMARK_KM)) * 100)
  );
  const accelEfficiencyValue = $derived(stats.accelScore);
  const costEfficiencyValue = $derived(Math.min(100, (COST_BENCHMARK_PER100KM / stats.costPer100km) * 100));

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
      label: 'Speed',
      value: speedEfficiencyValue,
      actual: `${speedVal(stats.speed).toFixed(0)} ${speedUnit()}`,
      benchmark: `${speedVal(SPEED_BENCHMARK_KMH).toFixed(0)} ${speedUnit()}`,
    },
    {
      id: 'range-eff',
      label: 'Range',
      value: rangeEfficiencyValue,
      actual: `${distanceVal(stats.totalRange).toFixed(0)} ${distanceUnit()}`,
      benchmark: `${distanceVal(RANGE_BENCHMARK_KM).toFixed(0)} ${distanceUnit()}`,
    },
    {
      id: 'accel-eff',
      label: 'Acceleration',
      value: accelEfficiencyValue,
      actual: `${Math.round(stats.accelScore)}/100`,
      benchmark: '100/100',
    },
    {
      id: 'cost-eff',
      label: 'Cost Efficiency',
      value: costEfficiencyValue,
      actual: `$${costPer100Val(stats.costPer100km).toFixed(2)} ${costDistanceLabel()}`,
      benchmark: `$${costPer100Val(COST_BENCHMARK_PER100KM).toFixed(2)} or less`,
    },
  ]);

  let expandedMetric = $state<string | null>(null);
</script>

<div
  class="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]"
  role="region"
  aria-label="Efficiency metrics"
  aria-live="polite"
  aria-atomic="false"
>
  <h3 class="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3" id="efficiency-heading">
    Efficiency Metrics
  </h3>

  <div class="space-y-2.5" role="list" aria-labelledby="efficiency-heading">
    {#each metrics as metric (metric.id)}
      <div role="listitem">
        <div class="flex items-center justify-between mb-1.5">
          <button
            type="button"
            class="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 group font-medium"
            id="{metric.id}-label"
            onclick={() => (expandedMetric = expandedMetric === metric.id ? null : metric.id)}
            aria-expanded={expandedMetric === metric.id}
          >
            {metric.label}
            <span class="text-text-tertiary group-hover:text-text-secondary transition-colors" aria-hidden="true"
              ><Info size={12} class="inline" /></span
            >
          </button>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold" style:color={getColor(metric.value)}>{Math.round(metric.value)}%</span>
            <span class="text-[10px] text-text-tertiary">{metric.actual}</span>
          </div>
        </div>
        <div
          class="h-2 bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-labelledby="{metric.id}-label"
          aria-valuenow={Math.round(metric.value)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext="{metric.actual} — {getLabel(metric.value)}"
        >
          <div
            class="h-full rounded-full transition-all duration-500"
            style:width={`${Math.max(metric.value, 4)}%`}
            style:background-color={getColor(metric.value)}
            aria-hidden="true"
          ></div>
        </div>
        {#if expandedMetric === metric.id}
          <p
            class="text-[11px] text-text-secondary mt-1.5 leading-relaxed bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]"
          >
            Benchmark: {metric.benchmark}. Current: {metric.actual} —
            <span style:color={getColor(metric.value)}>{getLabel(metric.value)}</span>.
          </p>
        {/if}
      </div>
    {/each}
  </div>

  <p class="text-[10px] text-text-tertiary mt-3 leading-relaxed">
    Bars show progress toward benchmarks: {speedVal(SPEED_BENCHMARK_KMH).toFixed(0)}
    {speedUnit()} speed, {distanceVal(RANGE_BENCHMARK_KM).toFixed(0)}
    {distanceUnit()} range.
  </p>
</div>
