<script lang="ts">
  import { fade } from 'svelte/transition';
  
  let {
    label,
    value,
    unit,
    icon,
    trend,
    trendColor,
    highlight = false
  }: {
    label: string;
    value: number | string;
    unit?: string;
    icon?: string;
    trend?: string;
    trendColor?: string;
    highlight?: boolean;
  } = $props();

  const formattedValue = $derived(
    typeof value === 'number'
      ? (Number.isInteger(value) ? value : value.toFixed(1))
      : value
  );
</script>

<div 
  class="relative bg-gradient-card rounded-xl p-5 border border-white/5 
    {highlight ? 'border-primary/30 shadow-glow-sm' : ''}
    hover:border-white/10 transition-all duration-300 card-lift"
>
  <div class="space-y-3">
    <div class="flex items-center gap-2 mb-1">
      {#if icon}
        <span class="text-xl" aria-hidden="true">{icon}</span>
      {/if}
      <span class="text-[10px] font-semibold text-textMain/80 uppercase tracking-wider">
        {label}
      </span>
    </div>

    <div class="space-y-1">
      <div class="flex items-baseline gap-1">
        <span
          class="text-3xl font-bold"
          style:color={trendColor || 'var(--text-main)'}
          class:text-primary={highlight}
          transition:fade
        >
          {formattedValue}
        </span>
        {#if unit}
          <span class="text-lg text-textMain/70">{unit}</span>
        {/if}
      </div>
      {#if trend}
        <div class="text-sm font-medium" style:color={trendColor}>
          {trend}
        </div>
      {/if}
    </div>
  </div>
  
  <div class="absolute top-0 right-0 w-20 h-20 opacity-5 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl" aria-hidden="true"></div>
</div>
