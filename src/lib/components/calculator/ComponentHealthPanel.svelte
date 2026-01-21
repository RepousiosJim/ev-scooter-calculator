<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';

  const stats = $derived(calculatorState.stats);
  const config = $derived(calculatorState.config);

  const batteryHealth = $derived.by(() => {
    // Inverse: 100% is 0 C-Rate. 0% is 4 C-Rate.
    const stressPercent = Math.min(100, (stats.cRate / 4) * 100);
    const healthPercent = Math.max(0, 100 - stressPercent);
    
    if (stats.cRate < 2) return { percent: healthPercent, status: 'Excellent', color: 'var(--color-success)' };
    if (stats.cRate < 3) return { percent: healthPercent, status: 'Good', color: 'var(--color-primary)' };
    if (stats.cRate < 4) return { percent: healthPercent, status: 'Moderate', color: 'var(--color-warning)' };
    return { percent: healthPercent, status: 'High Stress', color: 'var(--color-danger)' };
  });

  const controllerHealth = $derived.by(() => {
    if (!config.controller) {
      return { percent: 0, status: 'Not Set', color: 'var(--color-text-tertiary)' };
    }

    const requiredAmps = stats.totalWatts / config.v;
    // Inverse: 100% is 0 Amps. 0% is Max Amps (Load = 100%).
    const loadPercent = Math.min(100, (requiredAmps / config.controller) * 100);
    const healthPercent = Math.max(0, 100 - loadPercent);

    if (requiredAmps < config.controller * 0.8) return { percent: healthPercent, status: 'Excellent', color: 'var(--color-success)' };
    if (requiredAmps < config.controller) return { percent: healthPercent, status: 'Good', color: 'var(--color-primary)' };
    if (requiredAmps === config.controller) return { percent: healthPercent, status: 'Near Limit', color: 'var(--color-warning)' };
    return { percent: healthPercent, status: 'Over Limit', color: 'var(--color-danger)' };
  });

  const motorHealth = $derived.by(() => {
    // Keep as Performance Score: 100% = Best
    const percent = Math.min(100, stats.accelScore);
    if (stats.accelScore > 80) return { percent, status: 'Extreme', color: 'var(--color-success)' };
    if (stats.accelScore > 60) return { percent, status: 'Good', color: 'var(--color-primary)' };
    if (stats.accelScore > 40) return { percent, status: 'Moderate', color: 'var(--color-secondary)' };
    return { percent, status: 'Underpowered', color: 'var(--color-danger)' };
  });
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-3">
    <!-- Battery Card -->
    <div class="rounded-xl border border-white/5 p-4 bg-white/2 space-y-4">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-xl bg-white/5" style:color={batteryHealth.color}>
          <Icon name="battery" size="md" />
        </div>
        <div class="space-y-0.5 flex-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <div class="text-xs font-bold text-text-secondary uppercase tracking-widest">Battery Health</div>
              <HelpTooltip position="right" content="Indicates voltage sag resistance. Higher 'Health' (green) means less sag and less heat. <br/><br/>Based on C-Rate: <br/>Low (<2C) = Excellent <br/>High (>3C) = Stress" />
            </div>
            <div class="text-xs font-mono text-white/50">{stats.cRate.toFixed(1)}C</div>
          </div>
          <div class="text-sm font-bold text-text-primary" style:color={batteryHealth.color}>{batteryHealth.status}</div>
        </div>
      </div>
      <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${batteryHealth.percent}%`}
          style:background-color={batteryHealth.color}
        ></div>
      </div>
    </div>

    <!-- Controller Card -->
    <div class="rounded-xl border border-white/5 p-4 bg-white/2 space-y-4">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-xl bg-white/5" style:color={controllerHealth.color}>
          <Icon name="controller" size="md" />
        </div>
        <div class="space-y-0.5 flex-1">
          <div class="flex items-center justify-between">
             <div class="flex items-center gap-1.5">
              <div class="text-xs font-bold text-text-secondary uppercase tracking-widest">Controller Headroom</div>
              <HelpTooltip position="right" content="Current capacity margin. Higher 'Health' means you are using less than the max rated amps, running cooler and safer." />
            </div>
             <div class="text-xs font-mono text-white/50">{config.controller ? `${Math.round(stats.amps)} / ${config.controller}A` : 'N/A'}</div>
          </div>
          <div class="text-sm font-bold text-text-primary" style:color={controllerHealth.color}>{controllerHealth.status}</div>
        </div>
      </div>
      <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${controllerHealth.percent}%`}
          style:background-color={controllerHealth.color}
        ></div>
      </div>
    </div>

    <!-- Motor Card -->
    <div class="rounded-xl border border-white/5 p-4 bg-white/2 space-y-4">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-xl bg-white/5" style:color={motorHealth.color}>
          <Icon name="motor" size="md" />
        </div>
        <div class="space-y-0.5 flex-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <div class="text-xs font-bold text-text-secondary uppercase tracking-widest">Motor Performance</div>
              <HelpTooltip position="right" content="Normalized Power-to-Weight score. <br/>Higher is better acceleration and hill climbing ability. <br/>>80 = Extreme Performance." />
            </div>
            <div class="text-xs font-mono text-white/50">{Math.round(stats.accelScore)}/100</div>
          </div>
          <div class="text-sm font-bold text-text-primary" style:color={motorHealth.color}>{motorHealth.status}</div>
        </div>
      </div>
      <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style:width={`${motorHealth.percent}%`}
          style:background-color={motorHealth.color}
        ></div>
      </div>
    </div>
  </div>
</div>
