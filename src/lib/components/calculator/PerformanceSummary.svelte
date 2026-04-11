<script lang="ts">
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import StatsCard from "$lib/components/ui/StatsCard.svelte";
  import PerformanceGradeBadge from "$lib/components/ui/PerformanceGradeBadge.svelte";
  import { distanceVal, speedVal, distanceUnit, speedUnit, costPer100Val, costDistanceLabel } from "$lib/utils/units";

  const stats = $derived(calculatorState.stats);
  const grade = $derived(calculatorState.performanceGrade);
</script>

<div class="space-y-5" role="region" aria-live="polite" aria-atomic="true">
  <!-- Grade inline with stats -->
  <div class="flex items-center gap-3 px-1">
    <PerformanceGradeBadge {grade} size="lg" />
    <div class="flex-1">
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-[0.12em]">
        System Capability
      </h3>
      <p class="text-[11px] text-text-tertiary">
        Hardware synergy based on current configuration.
      </p>
    </div>
  </div>

  <!-- Unified Stats Grid: 6 cards -->
  <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
    <StatsCard
      label="Max Range"
      value={distanceVal(stats.totalRange)}
      unit={distanceUnit()}
      highlight={true}
    />
    <StatsCard label="Top Speed" value={speedVal(stats.speed)} unit={speedUnit()} />
    <StatsCard label="Peak Power" value={stats.totalWatts} unit="W" />
    <StatsCard label="Charge Time" value={stats.chargeTime} unit="h" />
    <StatsCard label="Acceleration" value={stats.accelScore} unit="/100" />
    <StatsCard label="Running Cost" value={"$" + costPer100Val(stats.costPer100km).toFixed(2)} unit={costDistanceLabel()} />
  </div>
</div>
