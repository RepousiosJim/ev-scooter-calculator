<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { formatDelta, formatValue, hasSignificantChange } from '$lib/utils/comparison';
  import DeltaBadge from '$lib/components/ui/DeltaBadge.svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);

  type StatRow = {
    label: string;
    value: number;
    simValue: number;
    unit: string;
    icon: string;
    isPrimary: boolean;
  };

  function getStatRows(): StatRow[] {
    if (!simStats) return [];

    return [
      { label: 'Top Speed', value: stats.speed, simValue: simStats.speed, unit: 'km/h', icon: '⚡', isPrimary: true },
      { label: 'Range', value: stats.totalRange, simValue: simStats.totalRange, unit: 'km', icon: '🔋', isPrimary: true },
      { label: 'Acceleration', value: stats.accelScore, simValue: simStats.accelScore, unit: '/100', icon: '🚀', isPrimary: true },
      { label: 'Running Cost', value: stats.costPer100km, simValue: simStats.costPer100km, unit: '$/100km', icon: '💰', isPrimary: true },
      { label: 'Total Energy', value: stats.wh, simValue: simStats.wh, unit: 'Wh', icon: '⚡', isPrimary: false },
      { label: 'Hill Speed', value: stats.hillSpeed, simValue: simStats.hillSpeed, unit: 'km/h', icon: '⛰️', isPrimary: false },
      { label: 'Peak Power', value: stats.totalWatts, simValue: simStats.totalWatts, unit: 'W', icon: '🔌', isPrimary: false },
      { label: 'Charge Time', value: stats.chargeTime, simValue: simStats.chargeTime, unit: 'hrs', icon: '🔋', isPrimary: false }
    ];
  }

  const primaryStats = $derived<StatRow[]>(getStatRows().filter(s => s.isPrimary));
  const secondaryStats = $derived<StatRow[]>(getStatRows().filter(s => !s.isPrimary));

  function getDeltaInfo(current: number, upgraded: number) {
    return formatDelta(current, upgraded);
  }

  function getDeltaClass(current: number, upgraded: number, isPositiveGood: boolean = true) {
    const delta = getDeltaInfo(current, upgraded);
    if (!hasSignificantChange(current, upgraded)) return 'text-textMuted';
    
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
      <div class="bg-white/3 rounded-lg border border-white/5 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{stat.icon}</span>
            <div>
              <div class="text-xs text-textMuted uppercase tracking-wide">{stat.label}</div>
              <div class="flex items-baseline gap-2">
                <span class={`text-xl font-bold ${getDeltaClass(stat.value, stat.simValue, isPositiveGood(stat.label))}`}>
                  {formatValue(stat.simValue)}
                </span>
                <span class="text-sm text-textMuted">{stat.unit}</span>
              </div>
            </div>
          </div>
          
          <div class="flex flex-col items-end gap-1">
            <span class="text-xs text-textMuted">{formatValue(stat.value)} {stat.unit}</span>
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
      <span class="text-lg">📊</span>
      <h3 class="text-sm font-semibold text-textMain">Secondary Stats</h3>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each secondaryStats as stat (stat.label)}
        <div class="bg-black/20 rounded-lg border border-white/5 p-3">
          <div class="text-xs text-textMuted mb-1">{stat.label}</div>
          <div class="flex items-baseline justify-between gap-2">
            <span class={`text-base font-semibold ${getDeltaClass(stat.value, stat.simValue, isPositiveGood(stat.label))}`}>
              {formatValue(stat.simValue)}
            </span>
            <span class="text-xs text-textMuted">{stat.unit}</span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-textMuted">{formatValue(stat.value)}</span>
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
