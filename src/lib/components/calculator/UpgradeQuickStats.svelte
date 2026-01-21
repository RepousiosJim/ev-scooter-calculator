<script lang="ts">
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import type { Recommendation } from "$lib/types";

  let { upgrade }: { upgrade: Recommendation } = $props();

  const simStats = $derived(calculatorState.simStats);
  const upgradeDelta = $derived(calculatorState.upgradeDelta);
  const stats = $derived(calculatorState.stats);

  const quickStats = $derived.by(() => {
    // Only show quick stats if THIS specific upgrade is the one being simulated
    if (
      !upgradeDelta ||
      !simStats ||
      calculatorState.activeUpgrade !== upgrade.upgradeType
    ) {
      return null;
    }

    const rangeChange = simStats.totalRange - stats.totalRange;
    const rangePercent =
      stats.totalRange > 0 ? (rangeChange / stats.totalRange) * 100 : 0;

    const speedChange = simStats.speed - stats.speed;
    const speedPercent =
      stats.speed > 0 ? (speedChange / stats.speed) * 100 : 0;

    const costChange = simStats.costPer100km - stats.costPer100km;
    const costPercent =
      stats.costPer100km > 0 ? (costChange / stats.costPer100km) * 100 : 0;

    return [
      {
        label: "Range",
        value: rangeChange,
        unit: "km",
        percent: rangePercent,
        isGood: true,
      },
      {
        label: "Speed",
        value: speedChange,
        unit: "kmh",
        percent: speedPercent,
        isGood: true,
      },
      {
        label: "Cost",
        value: costChange,
        unit: "$",
        percent: costPercent,
        isGood: false,
      },
    ];
  });

  function getColor(value: number, isGood: boolean): string {
    if (Math.abs(value) < 0.01) return "text-text-tertiary";
    const isPositive = value > 0;
    const isGoodOutcome = isPositive ? isGood : !isGood;
    return isGoodOutcome ? "text-success" : "text-danger";
  }
</script>

{#if quickStats}
  <div class="grid grid-cols-3 gap-3 text-xs pt-2">
    {#each quickStats as stat}
      <div class="flex flex-col items-center text-center">
        <span
          class="text-[10px] text-text-tertiary uppercase tracking-tight mb-1"
          >{stat.label}</span
        >
        <span class={`font-bold ${getColor(stat.value, stat.isGood)}`}>
          {stat.value >= 0 ? "+" : ""}{stat.value.toFixed(1)}
          <span class="text-[8px] opacity-70 ml-0.5">{stat.unit}</span>
        </span>
        <span
          class={`text-[9px] opacity-80 ${getColor(stat.value, stat.isGood)}`}
        >
          ({stat.percent >= 0 ? "+" : ""}{stat.percent.toFixed(0)}%)
        </span>
      </div>
    {/each}
  </div>
{:else}
  <div class="py-2 text-center">
    <span
      class="text-[10px] text-text-tertiary uppercase tracking-widest font-medium"
      >Simulation Idle</span
    >
  </div>
{/if}
