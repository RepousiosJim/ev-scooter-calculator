<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import type { Recommendation, UpgradeDelta } from '$lib/types';

  let { recommendation }: { recommendation: Recommendation } = $props();

  const simStats = $derived(calculatorState.simStats);
  const upgradeDelta = $derived(calculatorState.upgradeDelta);
  const stats = $derived(calculatorState.stats);

  const quickStats = $derived(() => {
    if (!upgradeDelta || !simStats) return null;

    const delta: UpgradeDelta = upgradeDelta;

    const rangeChange = simStats.totalRange - stats.totalRange;
    const rangePercent = stats.totalRange > 0 ? (rangeChange / stats.totalRange * 100) : 0;
    
    const speedChange = simStats.speed - stats.speed;
    const speedPercent = stats.speed > 0 ? (speedChange / stats.speed * 100) : 0;
    
    const costChange = simStats.costPer100km - stats.costPer100km;
    const costPercent = stats.costPer100km > 0 ? (costChange / stats.costPer100km * 100) : 0;

    const statItems = [
      { label: 'Range', value: rangeChange, unit: 'km', percent: rangePercent, isGood: true },
      { label: 'Speed', value: speedChange, unit: 'km/h', percent: speedPercent, isGood: true },
      { label: 'Cost', value: costChange, unit: '$', percent: costPercent, isGood: false }
    ];

    return statItems;
  });

  function getColor(value: number, isGood: boolean): string {
    if (Math.abs(value) < 0.01) return 'text-textMuted';
    const isPositive = value > 0;
    const isGoodOutcome = isPositive ? isGood : !isGood;
    return isGoodOutcome ? 'text-success' : 'text-danger';
  }
</script>

{#if quickStats()}
  <div class="grid grid-cols-3 gap-3 text-xs">
    {#each quickStats() as stat}
      <div class="flex flex-col items-center text-center">
        <span class="text-textMuted mb-1">{stat.label}</span>
        <span class={`text-sm font-semibold ${getColor(stat.value, stat.isGood)}`}>
          {stat.value >= 0 ? '+' : ''}{stat.value.toFixed(1)} {stat.unit}
        </span>
        <span class={`text-[10px] ${getColor(stat.value, stat.isGood)}`}>
          ({stat.percent >= 0 ? '+' : ''}{stat.percent.toFixed(0)}%)
        </span>
      </div>
    {/each}
  </div>
{/if}
