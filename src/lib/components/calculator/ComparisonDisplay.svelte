<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { formatDelta, formatValue, hasSignificantChange } from '$lib/utils/comparison';
  import DeltaBadge from '$lib/components/ui/DeltaBadge.svelte';
  import { speedVal, speedUnit, distanceVal, distanceUnit, costPer100Val, costDistanceLabel } from '$lib/utils/units';
  import { Gauge, Battery, Rocket, Coins, Zap, Mountain, PlugZap, BatteryCharging, BarChart3 } from 'lucide-svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);

  type StatRow = {
    label: string;
    value: number;
    simValue: number;
    displayValue: number;
    displaySimValue: number;
    unit: string;
    icon: any;
    isPrimary: boolean;
  };

  function getStatRows(): StatRow[] {
    if (!simStats) return [];

    return [
      {
        label: 'Top Speed',
        value: stats.speed,
        simValue: simStats.speed,
        displayValue: speedVal(stats.speed),
        displaySimValue: speedVal(simStats.speed),
        unit: speedUnit(),
        icon: Gauge,
        isPrimary: true,
      },
      {
        label: 'Range',
        value: stats.totalRange,
        simValue: simStats.totalRange,
        displayValue: distanceVal(stats.totalRange),
        displaySimValue: distanceVal(simStats.totalRange),
        unit: distanceUnit(),
        icon: Battery,
        isPrimary: true,
      },
      {
        label: 'Acceleration',
        value: stats.accelScore,
        simValue: simStats.accelScore,
        displayValue: stats.accelScore,
        displaySimValue: simStats.accelScore,
        unit: '/100',
        icon: Rocket,
        isPrimary: true,
      },
      {
        label: 'Running Cost',
        value: stats.costPer100km,
        simValue: simStats.costPer100km,
        displayValue: costPer100Val(stats.costPer100km),
        displaySimValue: costPer100Val(simStats.costPer100km),
        unit: `$/${costDistanceLabel().replace('per ', '')}`,
        icon: Coins,
        isPrimary: true,
      },
      {
        label: 'Total Energy',
        value: stats.wh,
        simValue: simStats.wh,
        displayValue: stats.wh,
        displaySimValue: simStats.wh,
        unit: 'Wh',
        icon: Zap,
        isPrimary: false,
      },
      {
        label: 'Hill Speed',
        value: stats.hillSpeed,
        simValue: simStats.hillSpeed,
        displayValue: speedVal(stats.hillSpeed),
        displaySimValue: speedVal(simStats.hillSpeed),
        unit: speedUnit(),
        icon: Mountain,
        isPrimary: false,
      },
      {
        label: 'Peak Power',
        value: stats.totalWatts,
        simValue: simStats.totalWatts,
        displayValue: stats.totalWatts,
        displaySimValue: simStats.totalWatts,
        unit: 'W',
        icon: PlugZap,
        isPrimary: false,
      },
      {
        label: 'Charge Time',
        value: stats.chargeTime,
        simValue: simStats.chargeTime,
        displayValue: stats.chargeTime,
        displaySimValue: simStats.chargeTime,
        unit: 'h',
        icon: BatteryCharging,
        isPrimary: false,
      },
    ];
  }

  const statRows = $derived<StatRow[]>(getStatRows());
  const primaryStats = $derived<StatRow[]>(statRows.filter((s) => s.isPrimary));
  const secondaryStats = $derived<StatRow[]>(statRows.filter((s) => !s.isPrimary));

  function getDeltaInfo(current: number, upgraded: number) {
    return formatDelta(current, upgraded);
  }

  function getDeltaClass(current: number, upgraded: number, isPositiveGood: boolean = true) {
    const delta = getDeltaInfo(current, upgraded);
    if (!hasSignificantChange(current, upgraded)) return 'text-text-tertiary';

    const isGood = delta.direction === 'up' ? isPositiveGood : !isPositiveGood;
    return isGood ? 'text-success' : 'text-danger';
  }

  function isPositiveGood(label: string) {
    return label !== 'Running Cost' && label !== 'Charge Time';
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each primaryStats as stat (stat.label)}
      {@const StatIcon = stat.icon}
      <div class="bg-white/3 rounded-xl border border-white/5 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <StatIcon size={24} class="text-text-secondary" />
            <div>
              <div class="text-xs text-text-tertiary uppercase tracking-wide">{stat.label}</div>
              <div class="flex items-baseline gap-2">
                <span
                  class={`text-xl font-bold ${getDeltaClass(stat.value, stat.simValue, isPositiveGood(stat.label))}`}
                >
                  {formatValue(stat.displaySimValue)}
                </span>
                <span class="text-sm text-text-tertiary">{stat.unit}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end gap-1">
            <span class="text-xs text-text-tertiary">{formatValue(stat.displayValue)} {stat.unit}</span>
            <DeltaBadge
              direction={getDeltaInfo(stat.value, stat.simValue).direction}
              value={getDeltaInfo(stat.value, stat.simValue).percent}
              compact={true}
            />
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="border-t border-white/10 pt-4">
    <div class="flex items-center gap-2 mb-3">
      <BarChart3 size={18} class="text-text-secondary" />
      <h3 class="text-sm font-semibold text-text-primary">Secondary Stats</h3>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each secondaryStats as stat (stat.label)}
        <div class="bg-black/20 rounded-xl border border-white/5 p-3">
          <div class="text-xs text-text-tertiary mb-1">{stat.label}</div>
          <div class="flex items-baseline justify-between gap-2">
            <span
              class={`text-base font-semibold ${getDeltaClass(stat.value, stat.simValue, isPositiveGood(stat.label))}`}
            >
              {formatValue(stat.displaySimValue)}
            </span>
            <span class="text-xs text-text-tertiary">{stat.unit}</span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-text-tertiary">{formatValue(stat.displayValue)}</span>
            <DeltaBadge
              direction={getDeltaInfo(stat.value, stat.simValue).direction}
              value={getDeltaInfo(stat.value, stat.simValue).percent}
              compact={true}
            />
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
