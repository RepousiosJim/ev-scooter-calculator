<script lang="ts">
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import { fade } from "svelte/transition";

  let {
    label,
    beforeValue,
    afterValue,
    unit,
    deltaPercent,
    isBetter = deltaPercent > 0,
  } = $props<{
    label: string;
    beforeValue: number;
    afterValue: number;
    unit: string;
    deltaPercent: number;
    isBetter?: boolean;
  }>();

  const diff = $derived(afterValue - beforeValue);
  const isPositive = $derived(diff > 0);
</script>

<div
  class="group bg-bg-secondary rounded-2xl border border-white/5 p-6 hover:border-white/20 transition-all shadow-sm flex flex-col h-full"
>
  <div class="flex justify-between items-start mb-6">
    <div class="space-y-1">
      <span
        class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest"
        >{label}</span
      >
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-black text-text-primary"
          >{afterValue.toFixed(1)}</span
        >
        <span class="text-xs text-text-tertiary">{unit}</span>
      </div>
    </div>

    {#if deltaPercent !== 0}
      <div
        class="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
          {isBetter
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-danger/10 text-danger border border-danger/20'}"
      >
        {isPositive ? "+" : ""}{deltaPercent.toFixed(1)}%
      </div>
    {/if}
  </div>

  <div class="space-y-3 mt-auto">
    <div
      class="flex justify-between text-[10px] font-medium uppercase tracking-tight"
    >
      <span class="text-text-tertiary"
        >Original: {beforeValue.toFixed(1)}{unit}</span
      >
      <span class={isPositive ? "text-success" : "text-danger"}>
        {isPositive ? "Gain" : "Loss"}: {Math.abs(diff).toFixed(1)}{unit}
      </span>
    </div>

    <!-- Simple Comparison Bar -->
    <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
      <!-- Original Marker -->
      <div
        class="absolute left-0 top-0 bottom-0 bg-white/10"
        style="width: 50%"
      ></div>
      <!-- Simulated Delta -->
      <div
        class="absolute top-0 bottom-0 rounded-full transition-all duration-500
           {isBetter
          ? 'bg-success shadow-[0_0_10px_rgba(var(--color-success-rgb),0.3)]'
          : 'bg-danger shadow-[0_0_10px_rgba(var(--color-danger-rgb),0.3)]'}"
        style="left: {isPositive
          ? '50%'
          : `calc(50% - ${Math.min(Math.abs(deltaPercent), 50)}%)`}; width: {Math.min(
          Math.abs(deltaPercent),
          50,
        )}%"
      ></div>
    </div>
  </div>
</div>
