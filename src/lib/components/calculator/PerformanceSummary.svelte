<script lang="ts">
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import StatsCard from "$lib/components/ui/StatsCard.svelte";
  import PerformanceGradeBadge from "$lib/components/ui/PerformanceGradeBadge.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const stats = $derived(calculatorState.stats);
  const grade = $derived(calculatorState.performanceGrade);
</script>

<div class="space-y-8">
  <!-- Grade and Description -->
  <div class="flex items-center justify-between gap-6 px-1">
    <div class="space-y-1.5 flex-grow">
      <div class="flex items-center gap-2">
        <h3 class="text-xl font-bold text-text-primary tracking-tight">
          System Capability
        </h3>
        <div
          class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        ></div>
      </div>
      <p class="text-sm text-text-secondary leading-relaxed max-w-md">
        Hardware synergy analysis based on the current configuration and ride
        dynamics.
      </p>
    </div>
    <div class="flex-shrink-0 animate-fadeIn">
      <PerformanceGradeBadge {grade} size="lg" />
    </div>
  </div>

  <!-- Primary Stats Grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard
      label="Max Range"
      value={stats.totalRange}
      unit="km"
      highlight={true}
    />
    <StatsCard label="Top Speed" value={stats.speed} unit="km/h" />
    <StatsCard label="Peak Power" value={stats.totalWatts} unit="W" />
    <StatsCard label="Charge Time" value={stats.chargeTime} unit="h" />
  </div>

  <!-- Secondary Insights -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Acceleration Score Block -->
    <div
      class="group p-6 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all duration-300"
    >
      <div class="flex items-center justify-between mb-4">
        <span
          class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest"
          >Acceleration Performance</span
        >
        <Icon
          name="upgrades"
          size="xs"
          class="text-primary/40 group-hover:text-primary transition-colors"
        />
      </div>
      <div class="flex items-baseline gap-2">
        <span
          class="text-4xl font-black text-text-primary tracking-tighter italic"
        >
          {Math.round(stats.accelScore)}
        </span>
        <span class="text-xs font-bold text-text-tertiary">/ 100</span>
      </div>
      <div class="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary shadow-glow-sm transition-all duration-500"
          style:width={`${stats.accelScore}%`}
        ></div>
      </div>
    </div>

    <!-- Energy Efficiency Block -->
    <div
      class="group p-6 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all duration-300"
    >
      <div class="flex items-center justify-between mb-4">
        <span
          class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest"
          >Running Costs</span
        >
        <Icon
          name="efficiency"
          size="xs"
          class="text-success/40 group-hover:text-success transition-colors"
        />
      </div>
      <div class="flex items-baseline gap-1.5">
        <span
          class="text-4xl font-black text-text-primary tracking-tighter italic"
          >${stats.costPer100km.toFixed(2)}</span
        >
        <span class="text-xs font-bold text-text-tertiary">per 100km</span>
      </div>
      <p class="mt-4 text-[11px] text-text-secondary leading-relaxed">
        Estimated electrical cost based on standard rates and modeled Wh/km.
      </p>
    </div>
  </div>
</div>
