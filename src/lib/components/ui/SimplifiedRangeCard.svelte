<script lang="ts">
  import { scale } from 'svelte/transition';

  let {
    label,
    value,
    unit,
    icon,
    trend,
    isCompact = false,
    highlight = false,
    onClick
  }: {
    label: string;
    value: number | string;
    unit?: string;
    icon?: string;
    trend?: { value: number; unit: string };
    isCompact?: boolean;
    highlight?: boolean;
    onClick?: () => void;
  } = $props();

  const formattedValue = $derived(
    typeof value === 'number'
      ? (Number.isInteger(value) ? value : value.toFixed(1))
      : value
  );

  const trendColor = $derived(() => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-danger';
    return 'text-text-secondary';
  });

  const trendIcon = $derived(() => {
    if (!trend) return '';
    if (trend.value > 0) return '↑';
    if (trend.value < 0) return '↓';
    return '→';
  });
</script>

<button
  type="button"
  onclick={onClick}
  disabled={!onClick}
  class="group relative w-full bg-bg-secondary rounded-xl p-5 border
    {highlight ? 'border-primary/30 shadow-glow-sm' : 'border-white/5'}
    hover:border-white/10 transition-all duration-slow disabled:cursor-default
    hover:shadow-lg hover:-translate-y-0.5"
  aria-label={label}
>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-2">
      {#if icon}
        <span class="text-xl" aria-hidden="true">{icon}</span>
      {/if}
      <span class="label text-text-secondary">{label}</span>
      {#if highlight}
        <div class="ml-auto flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </div>
      {/if}
    </div>

    <!-- Value -->
    <div class="flex items-baseline gap-2">
      {#key formattedValue}
        <span
          transition:scale
          class="data-lg font-bold {highlight ? 'text-primary' : 'text-text-primary'} font-data"
        >
          {formattedValue()}
        </span>
      {/key}
      {#if unit}
        <span class="text-sm text-text-tertiary">{unit}</span>
      {/if}
    </div>

    <!-- Trend -->
    {#if trend && !isCompact}
      <div class="flex items-center gap-1 pt-2 border-t border-white/5">
        <span class="text-sm {trendColor()} font-medium" aria-hidden="true">
          {trendIcon()}
        </span>
        <span class="text-sm text-text-tertiary">
          {Math.abs(trend.value)}{trend.unit}
        </span>
      </div>
    {/if}
  </div>

  <!-- Subtle gradient decoration -->
  <div
    class="absolute top-0 right-0 w-20 h-20 opacity-0 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-3xl
      group-hover:opacity-100 transition-opacity duration-slow"
    aria-hidden="true"
  ></div>
</button>
