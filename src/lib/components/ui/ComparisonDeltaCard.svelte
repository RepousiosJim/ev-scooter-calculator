<script lang="ts">
  import type { DeltaDirection } from '$lib/types';
  import { scale, fly } from 'svelte/transition';

  let {
    label,
    beforeValue,
    afterValue,
    unit,
    deltaPercent
  }: {
    label: string;
    beforeValue: number;
    afterValue: number;
    unit?: string;
    deltaPercent: number;
  } = $props();

  const direction = $derived((): DeltaDirection => {
    if (deltaPercent > 0.1) return 'up';
    if (deltaPercent < -0.1) return 'down';
    return 'neutral';
  });

  const colorClass = $derived(() => {
    switch (direction()) {
      case 'up': return 'text-success';
      case 'down': return 'text-danger';
      default: return 'text-text-secondary';
    }
  });

  const bgColor = $derived(() => {
    switch (direction()) {
      case 'up': return 'bg-success/10';
      case 'down': return 'bg-danger/10';
      default: return 'bg-white/5';
    }
  });

  const icon = $derived(() => {
    switch (direction()) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  });

  const formatValue = (val: number) =>
    Number.isInteger(val) ? val : val.toFixed(1);
</script>

<div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg">
  <div class="space-y-6">
    <!-- Label -->
    <div class="flex items-center justify-between">
      <span class="label text-text-secondary">{label}</span>
      <div
        transition:scale
        class="flex items-center gap-2 px-3 py-1.5 rounded-full {bgColor()} {colorClass()}"
      >
        <span class="text-sm" aria-hidden="true">{icon()}</span>
        <span class="text-sm font-bold font-data">
          {direction() === 'up' ? '+' : ''}{deltaPercent.toFixed(1)}%
        </span>
      </div>
    </div>

    <!-- Before/After Comparison -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Before -->
      <div class="space-y-1">
        <span class="text-xs text-text-tertiary uppercase tracking-wider">Before</span>
        <div class="flex items-baseline gap-1">
          <span class="data text-text-secondary line-through font-data">
            {formatValue(beforeValue)}
          </span>
          {#if unit}
            <span class="text-sm text-text-tertiary">{unit}</span>
          {/if}
        </div>
      </div>

      <!-- After -->
      <div class="space-y-1">
        <span class="text-xs text-text-tertiary uppercase tracking-wider">After</span>
        <div class="flex items-baseline gap-1">
          <span class="data font-bold {colorClass()} font-data">
            {formatValue(afterValue)}
          </span>
          {#if unit}
            <span class="text-sm text-text-tertiary">{unit}</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Visual Bar Comparison -->
    <div class="space-y-2">
      <span class="text-xs text-text-tertiary uppercase tracking-wider">Comparison</span>
      <div class="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <!-- Before Bar -->
        <div
          class="absolute top-0 left-0 h-full bg-text-secondary/30 transition-all duration-slow"
          style="width: {Math.min((beforeValue / Math.max(beforeValue, afterValue)) * 100, 100)}%"
          aria-hidden="true"
        ></div>
        <!-- After Bar -->
        <div
          transition:fly={{ x: 10, duration: 300 }}
          class="absolute top-0 left-0 h-full {colorClass() === 'text-success' ? 'bg-success' : colorClass() === 'text-danger' ? 'bg-danger' : 'bg-text-secondary'} transition-all duration-slow"
          style="width: {Math.min((afterValue / Math.max(beforeValue, afterValue)) * 100, 100)}%"
          aria-hidden="true"
        ></div>
      </div>
      <div class="flex justify-between text-xs text-text-tertiary">
        <span>{formatValue(beforeValue)}</span>
        <span>{formatValue(afterValue)}</span>
      </div>
    </div>
  </div>
</div>
