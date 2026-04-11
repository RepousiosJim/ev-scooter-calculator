<script lang="ts">
  import { scale } from 'svelte/transition';

  let {
    value,
    max = 5,
    size = 'md'
  }: {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const sizeConfig = {
    sm: { width: 'w-full', height: 'h-8', text: 'text-xs' },
    md: { width: 'w-full', height: 'h-12', text: 'text-sm' },
    lg: { width: 'w-full', height: 'h-16', text: 'text-base' },
  };

  const percentage = $derived(() => Math.min((value / max) * 100, 100));

  const threshold = $derived(() => {
    if (value > 3) {
      return { color: 'bg-danger', label: 'High Stress', textColor: 'text-danger' };
    }
    if (value > 1.5) {
      return { color: 'bg-warning', label: 'Moderate', textColor: 'text-warning' };
    }
    return { color: 'bg-success', label: 'Efficient', textColor: 'text-success' };
  });

  const config = $derived(() => sizeConfig[size]);
</script>

<div
  class="space-y-1.5"
  role="region"
  aria-label="Battery discharge rate indicator"
  aria-live="polite"
>
  <div class="flex items-center justify-between">
    <span class="text-xs font-bold text-text-secondary uppercase tracking-wider" id="crate-label">
      Discharge Rate
    </span>
    <div class="flex items-center gap-2">
      <span class="text-xs font-bold {threshold().textColor}">{threshold().label}</span>
      <span class="text-xs font-mono font-bold {threshold().textColor}">
        {value.toFixed(1)}C
      </span>
    </div>
  </div>

  <div class="relative">
    <div
      class="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden"
      role="meter"
      aria-labelledby="crate-label"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext="{value.toFixed(1)}C - {threshold().label}"
    >
      <div
        class="h-full transition-all duration-normal ease-out {threshold().color}"
        style="width: {percentage()}%"
        aria-hidden="true"
      ></div>
    </div>
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none flex" aria-hidden="true">
      <div class="w-1/3 border-r border-white/10 h-full"></div>
      <div class="w-1/3 border-r border-white/10 h-full"></div>
      <div class="w-1/3 h-full"></div>
    </div>
  </div>

  <div class="flex items-center justify-between text-[10px] text-text-tertiary" aria-hidden="true">
    <span>Efficient</span>
    <span>Moderate</span>
    <span>High Stress</span>
  </div>
</div>
