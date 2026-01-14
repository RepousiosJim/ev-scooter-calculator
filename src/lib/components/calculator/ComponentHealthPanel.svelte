<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const stats = $derived(calculatorState.stats);
  const config = $derived(calculatorState.config);

  const batteryHealth = $derived(() => {
    const percent = Math.min(100, (stats.cRate / 4) * 100);
    if (stats.cRate < 2) return { percent, status: 'Excellent', color: '#10b981' };
    if (stats.cRate < 3) return { percent, status: 'Good', color: '#3b82f6' };
    if (stats.cRate < 4) return { percent, status: 'Moderate', color: '#d97706' };
    return { percent, status: 'High Stress', color: '#dc2626' };
  });

  const controllerHealth = $derived(() => {
    if (!config.controller) {
      return { percent: 0, status: 'Not Set', color: '#64748b' };
    }

    const requiredAmps = stats.totalWatts / config.v;
    const percent = Math.min(100, (requiredAmps / config.controller) * 100);

    if (requiredAmps < config.controller * 0.8) return { percent, status: 'Excellent', color: '#10b981' };
    if (requiredAmps < config.controller) return { percent, status: 'Good', color: '#3b82f6' };
    if (requiredAmps === config.controller) return { percent, status: 'Near Limit', color: '#f59e0b' };
    return { percent, status: 'Over Limit', color: '#dc2626' };
  });

  const motorHealth = $derived(() => {
    const percent = Math.min(100, stats.accelScore);
    if (stats.accelScore > 80) return { percent, status: 'Extreme', color: '#10b981' };
    if (stats.accelScore > 60) return { percent, status: 'Good', color: '#3b82f6' };
    if (stats.accelScore > 40) return { percent, status: 'Moderate', color: '#60a5fa' };
    return { percent, status: 'Underpowered', color: '#f43f5e' };
  });
</script>

<div class="bg-black/20 rounded-xl p-5 border border-white/5">
  <h3 class="text-lg font-semibold text-textMain mb-4">Component Health</h3>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="rounded-lg border-2 p-4 bg-black/10" style:border-color={batteryHealth().color}>
      <div class="flex items-start gap-3 mb-3">
        <span class="text-3xl">🔋</span>
        <div class="flex-1">
          <div class="text-sm font-semibold text-textMain">Battery</div>
          <div class="text-xs text-textMuted">{batteryHealth().status}</div>
        </div>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${batteryHealth().percent}%`}
          style:background-color={batteryHealth().color}
        ></div>
      </div>
    </div>

    <div class="rounded-lg border-2 p-4 bg-black/10" style:border-color={controllerHealth().color}>
      <div class="flex items-start gap-3 mb-3">
        <span class="text-3xl">⚡</span>
        <div class="flex-1">
          <div class="text-sm font-semibold text-textMain">Controller</div>
          <div class="text-xs text-textMuted">{controllerHealth().status}</div>
        </div>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${controllerHealth().percent}%`}
          style:background-color={controllerHealth().color}
        ></div>
      </div>
    </div>

    <div class="rounded-lg border-2 p-4 bg-black/10" style:border-color={motorHealth().color}>
      <div class="flex items-start gap-3 mb-3">
        <span class="text-3xl">🔧</span>
        <div class="flex-1">
          <div class="text-sm font-semibold text-textMain">Motor</div>
          <div class="text-xs text-textMuted">{motorHealth().status}</div>
        </div>
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${motorHealth().percent}%`}
          style:background-color={motorHealth().color}
        ></div>
      </div>
    </div>
  </div>
</div>
