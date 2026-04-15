<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import StatsCard from '$lib/components/ui/StatsCard.svelte';
  import PerformanceGradeBadge from '$lib/components/ui/PerformanceGradeBadge.svelte';
  import { distanceVal, speedVal, distanceUnit, speedUnit, costPer100Val, costDistanceLabel } from '$lib/utils/units';

  const stats = $derived(calculatorState.stats);
  const grade = $derived(calculatorState.performanceGrade);
  const accelLabel = $derived(
    stats.accelScore >= 80 ? 'Extreme' : stats.accelScore >= 60 ? 'Strong' : stats.accelScore >= 40 ? 'Average' : 'Weak'
  );

  // Cost-per-charge: cost to go one full range
  const costPerCharge = $derived(((stats.wh / 1000) * calculatorState.config.cost).toFixed(2));
</script>

<div class="space-y-5" role="region" aria-live="polite" aria-atomic="true">
  <!-- Grade inline with stats -->
  <div class="flex items-center gap-4 px-1 py-1">
    <PerformanceGradeBadge {grade} size="lg" />
    <div class="flex-1 min-w-0">
      <h3 class="text-base font-black text-text-primary tracking-tight leading-tight">System Capability</h3>
      <p class="text-xs text-text-secondary mt-0.5">Composite score across speed, range, power &amp; efficiency</p>
    </div>
  </div>

  <div class="h-px bg-gradient-to-r from-white/8 via-white/4 to-transparent -mx-1"></div>

  <!-- Unified Stats Grid: 5 performance cards -->
  <div class="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
    <StatsCard label="Max Range" value={distanceVal(stats.totalRange)} unit={distanceUnit()} highlight={true} />
    <StatsCard label="Top Speed" value={speedVal(stats.speed)} unit={speedUnit()} />
    <StatsCard label="Peak Power" value={stats.totalWatts} unit="W" />
    <StatsCard label="Charge Time" value={stats.chargeTime} unit="h" />
    <StatsCard label="Acceleration" value={stats.accelScore} unit={`/100 · ${accelLabel}`} />
  </div>

  <!-- Cost banner — full width for visibility -->
  <div class="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 border-t border-white/[0.06]">
    <StatsCard
      label="Cost per {costDistanceLabel()}"
      value={'$' + costPer100Val(stats.costPer100km).toFixed(2)}
      unit="electricity"
      highlight={true}
    />
    <StatsCard label="Cost per charge" value={'$' + costPerCharge} unit="full battery" />
  </div>
</div>
