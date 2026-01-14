<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const stats = $derived(calculatorState.stats);

  const speedEfficiencyValue = $derived(Math.min(100, (stats.speed / 100) * 100));
  const rangeEfficiencyValue = $derived(Math.min(100, (stats.totalRange / 150) * 100));
  const accelEfficiencyValue = $derived(stats.accelScore);
  const costEfficiencyValue = $derived(Math.min(100, (5 / stats.costPer100km) * 100));

  const performanceScore = $derived(
    (speedEfficiencyValue * 1.2 + rangeEfficiencyValue * 1.5 + accelEfficiencyValue * 1.0 + costEfficiencyValue * 1.3) / 5
  );

  const performanceGrade = $derived(() => {
    if (performanceScore >= 90) return { grade: 'A', color: '#10b981', label: 'Excellent', trend: '↑' };
    if (performanceScore >= 80) return { grade: 'B', color: '#22c55e', label: 'Very Good', trend: '↑' };
    if (performanceScore >= 70) return { grade: 'C', color: '#84cc16', label: 'Good', trend: '→' };
    if (performanceScore >= 60) return { grade: 'D', color: '#f59e0b', label: 'Fair', trend: '→' };
    return { grade: 'F', color: '#f97316', label: 'Needs Improvement', trend: '↓' };
  });

  const getMetricGrade = (value: number) => {
    if (value >= 85) return { color: '#3b82f6', label: 'Excellent' };
    if (value >= 70) return { color: '#60a5fa', label: 'Good' };
    if (value >= 55) return { color: '#d97706', label: 'Fair' };
    return { color: '#f43f5e', label: 'Needs Improvement' };
  };

  const speedGrade = $derived(() => getMetricGrade(speedEfficiencyValue));
  const rangeGrade = $derived(() => getMetricGrade(rangeEfficiencyValue));
  const accelGrade = $derived(() => getMetricGrade(accelEfficiencyValue));
  const costGrade = $derived(() => getMetricGrade(costEfficiencyValue));
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div class="col-span-2 md:col-span-4 bg-black/20 rounded-xl p-5 border-2" style:border-color={performanceGrade().color}>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-textMuted uppercase tracking-wider">Performance Grade</span>
      <div class="flex items-center gap-3">
        <span class="text-4xl font-bold" style:color={performanceGrade().color}>{performanceGrade().grade}</span>
        <div class="flex flex-col items-start">
          <span class="text-2xl" style:color={performanceGrade().color}>{performanceGrade().trend}</span>
          <span class="text-xs text-textMuted">{performanceGrade().label}</span>
        </div>
      </div>
    </div>
    <div class="text-sm text-textMuted">
      Weighted Score: <span class="font-semibold" style:color={performanceGrade().color}>{performanceScore.toFixed(0)}/100</span>
    </div>
  </div>

  <div class="bg-white/3 rounded-lg border border-white/5 p-4 text-center">
    <span class="text-2xl mb-1">⚡</span>
    <div class="text-xs text-textMuted uppercase mb-1">Top Speed</div>
    <div class="text-2xl font-bold" style:color={speedGrade().color}>{Math.round(stats.speed)} km/h</div>
    <div class="text-xs" style:color={speedGrade().color}>{speedGrade().label}</div>
  </div>

  <div class="bg-white/3 rounded-lg border border-white/5 p-4 text-center">
    <span class="text-2xl mb-1">🔋</span>
    <div class="text-xs text-textMuted uppercase mb-1">Range</div>
    <div class="text-2xl font-bold" style:color={rangeGrade().color}>{Math.round(stats.totalRange)} km</div>
    <div class="text-xs" style:color={rangeGrade().color}>{rangeGrade().label}</div>
  </div>

  <div class="bg-white/3 rounded-lg border border-white/5 p-4 text-center">
    <span class="text-2xl mb-1">🚀</span>
    <div class="text-xs text-textMuted uppercase mb-1">Acceleration</div>
    <div class="text-2xl font-bold" style:color={accelGrade().color}>{Math.round(accelEfficiencyValue)}/100</div>
    <div class="text-xs" style:color={accelGrade().color}>{accelGrade().label}</div>
  </div>

  <div class="bg-white/3 rounded-lg border border-white/5 p-4 text-center">
    <span class="text-2xl mb-1">💰</span>
    <div class="text-xs text-textMuted uppercase mb-1">Running Cost</div>
    <div class="text-2xl font-bold" style:color={costGrade().color}>${stats.costPer100km.toFixed(2)}</div>
    <div class="text-xs" style:color={costGrade().color}>{costGrade().label}</div>
  </div>
</div>
