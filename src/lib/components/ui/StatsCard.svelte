<script lang="ts">
  import { untrack } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  let {
    label,
    value,
    unit,
    highlight = false,
    onClick,
    icon: _icon,
    trend: _trend,
    trendColor: _trendColor,
    isCompact: _isCompact = false,
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

  const animatedNumber = tweened(
    untrack(() => (typeof value === 'number' ? value : 0)),
    {
      duration: 600,
      easing: cubicOut,
    }
  );

  $effect(() => {
    if (typeof value === 'number') {
      animatedNumber.set(value);
    }
  });

  const formattedValue = $derived(() => {
    if (typeof value !== 'number') return value;
    const currentValue = $animatedNumber;
    return Number.isInteger(currentValue) ? currentValue : currentValue.toFixed(1);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  data-testid="stat-{label.toLowerCase().replace(/\s+/g, '-')}"
  role={onClick ? 'button' : 'group'}
  aria-label="{label}: {formattedValue()} {unit || ''}"
  class="relative w-full bg-white/[0.03] p-3 sm:p-4 border border-white/[0.08] rounded-xl
    transition-all duration-300
    {onClick
    ? 'cursor-pointer hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/10'
    : ''}"
  onclick={onClick || undefined}
  onkeydown={onClick
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick!();
        }
      }
    : undefined}
  tabindex={onClick ? 0 : undefined}
>
  <div class="space-y-2">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-bold text-text-secondary uppercase tracking-widest">{label}</span>
      {#if highlight}
        <div class="ml-auto w-1 h-1 rounded-full bg-primary" aria-hidden="true"></div>
      {/if}
    </div>

    <!-- Value -->
    <div class="flex items-baseline gap-1.5" aria-live="polite" aria-atomic="true">
      <span class="text-2xl font-bold text-text-primary font-data">
        {formattedValue()}
      </span>
      {#if unit}
        <span class="text-xs font-bold text-text-tertiary uppercase tracking-wider" aria-hidden="true">{unit}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Mobile: Ensure minimum touch target for interactive elements */
  @media (max-width: 640px) {
    div[tabindex='0'] {
      min-height: 44px;
      min-width: 44px;
    }
  }

  /* Focus styles for keyboard navigation */
  div[tabindex='0']:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  div[tabindex='0']:focus:not(:focus-visible) {
    outline: none;
  }
</style>
