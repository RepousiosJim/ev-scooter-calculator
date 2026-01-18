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

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <span class="font-semibold text-text-primary">
      Battery Discharge Rate
    </span>
    <span class="{config().text} font-medium font-data {threshold().textColor}">
      {value.toFixed(1)}C
    </span>
  </div>

  <div class="relative">
    <!-- Track -->
    <div class="{config().width} {config().height} bg-bg-tertiary rounded-full overflow-hidden">
      <!-- Gauge Fill -->
      <div
        class="h-full transition-all duration-normal ease-out {threshold().color}"
        style="width: {percentage()}%"
        aria-hidden="true"
      ></div>
    </div>

    <!-- Threshold Markers -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none flex" aria-hidden="true">
      <div class="w-1/3 border-r border-white/10 h-full"></div>
      <div class="w-1/3 border-r border-white/10 h-full"></div>
      <div class="w-1/3 h-full"></div>
    </div>
  </div>

  <!-- Legend -->
  <div class="flex items-center justify-between text-xs text-text-secondary">
    <span>Efficient</span>
    <span>Moderate</span>
    <span>High Stress</span>
  </div>

  <!-- Status Label -->
  <div
    transition:scale
    class="text-center py-2 rounded-lg bg-white/5 border border-white/10"
  >
    <span class="{config().text} font-medium {threshold().textColor}">
      {threshold().label}
    </span>
  </div>
</div>
