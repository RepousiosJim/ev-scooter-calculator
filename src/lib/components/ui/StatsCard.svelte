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
  class="relative w-full bg-white/2 rounded-xl p-5 border border-white/5
    transition-all duration-300 disabled:cursor-default
    hover:bg-white/5 hover:border-white/10"
  aria-label={label}
>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
      {#if highlight}
        <div class="ml-auto w-1 h-1 rounded-full bg-primary"></div>
      {/if}
    </div>

    <!-- Value -->
    <div class="flex items-baseline gap-1.5">
      <span class="text-2xl font-bold text-text-primary font-data">
        {formattedValue}
      </span>
      {#if unit}
        <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{unit}</span>
      {/if}
    </div>
  </div>
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
