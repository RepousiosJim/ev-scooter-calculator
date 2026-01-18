<script lang="ts">
  import { scale } from 'svelte/transition';

  let {
    label,
    value,
    unit,
    icon,
    trend,
    trendColor,
    highlight = false,
    isCompact = false,
    onClick
  }: {
    label: string;
    value: number | string;
    unit?: string;
    icon?: string;
    trend?: string;
    trendColor?: string;
    highlight?: boolean;
    isCompact?: boolean;
    onClick?: () => void;
  } = $props();

  const formattedValue = $derived(
    typeof value === 'number'
      ? (Number.isInteger(value) ? value : value.toFixed(1))
      : value
  );
</script>

<button
  type="button"
  onclick={onClick}
  disabled={!onClick}
  class="relative group w-full bg-bg-secondary rounded-xl p-5 border
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
          class="{isCompact ? 'data' : 'data-lg'} font-bold
            {highlight ? 'text-primary' : 'text-text-primary'} font-data"
        >
          {formattedValue}
        </span>
      {/key}
      {#if unit}
        <span class="text-sm text-text-tertiary">{unit}</span>
      {/if}
    </div>

    <!-- Trend -->
    {#if trend && !isCompact}
      <div
        transition:scale
        class="flex items-center gap-1 pt-2 border-t border-white/5 text-sm font-medium"
        style:color={trendColor || 'var(--color-text-secondary)'}
      >
        {trend}
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

<style>
  /* Mobile: Ensure minimum touch target */
  @media (max-width: 640px) {
    button {
      min-height: 44px;
      min-width: 44px;
    }
  }
</style>
