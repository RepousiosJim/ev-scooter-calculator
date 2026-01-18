<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import StatsCard from '$lib/components/ui/StatsCard.svelte';

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

<div class="space-y-4">
  <div 
    class="relative bg-gradient-card rounded-xl p-6 border-2 shadow-lg card-lift transition-all duration-300"
    style:border-color={performanceGrade().color}
  >
    <div class="flex items-center justify-between">
      <div class="space-y-2">
        <span class="text-sm font-semibold text-textMain/80 uppercase tracking-wider">
          Performance Grade
        </span>
        <div class="text-sm text-textMain/70">
          Weighted Score: <span class="font-semibold" style:color={performanceGrade().color}>{performanceScore.toFixed(0)}/100</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex flex-col items-end">
          <span class="text-3xl font-bold" style:color={performanceGrade().color}>{performanceGrade().grade}</span>
          <span class="text-sm text-textMain/70">{performanceGrade().label}</span>
        </div>
        <div 
          class="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style:background-color={`${performanceGrade().color}20`}
          style:color={performanceGrade().color}
        >
          {performanceGrade().trend}
        </div>
      </div>
    </div>
    <div class="absolute top-0 left-0 w-32 h-32 opacity-10 bg-gradient-to-br from-primary/30 to-transparent rounded-br-3xl" aria-hidden="true"></div>
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard
      label="Top Speed"
      value={Math.round(stats.speed)}
      unit="km/h"
      icon="⚡"
      trend={speedGrade().label}
      trendColor={speedGrade().color}
    />

    <StatsCard
      label="Range"
      value={Math.round(stats.totalRange)}
      unit="km"
      icon="🔋"
      trend={rangeGrade().label}
      trendColor={rangeGrade().color}
    />

    <StatsCard
      label="Acceleration"
      value={Math.round(accelEfficiencyValue)}
      unit="/100"
      icon="🚀"
      trend={accelGrade().label}
      trendColor={accelGrade().color}
    />

    <StatsCard
      label="Running Cost"
      value={`$${stats.costPer100km.toFixed(2)}`}
      unit="per 100km"
      icon="💰"
      trend={costGrade().label}
      trendColor={costGrade().color}
    />
  </div>
</div>
