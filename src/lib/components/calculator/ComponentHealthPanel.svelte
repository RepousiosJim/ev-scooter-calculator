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

<div class="space-y-2">
  <!-- Battery -->
  <div class="border border-white/[0.06] px-3 py-2.5 bg-white/[0.02] flex items-center gap-3">
    <div class="p-2 bg-white/[0.04]" style:color={batteryHealth.color}>
      <Icon name="battery" size="sm" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Battery</span>
          <HelpTooltip position="right" content="Based on C-Rate. Low (<2C) = Excellent, High (>3C) = Stress" />
        </div>
        <span class="text-[10px] font-mono text-text-tertiary">{stats.cRate.toFixed(1)}C</span>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <div class="h-1 bg-white/5 rounded-full overflow-hidden flex-1">
          <div class="h-full rounded-full transition-all duration-500" style:width={`${batteryHealth.percent}%`} style:background-color={batteryHealth.color}></div>
        </div>
        <span class="text-[10px] font-bold flex-shrink-0" style:color={batteryHealth.color}>{batteryHealth.status}</span>
      </div>
    </div>
  </div>

  <!-- Controller -->
  <div class="border border-white/[0.06] px-3 py-2.5 bg-white/[0.02] flex items-center gap-3">
    <div class="p-2 bg-white/[0.04]" style:color={controllerHealth.color}>
      <Icon name="controller" size="sm" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Controller</span>
          <HelpTooltip position="right" content="Current capacity margin. Higher health = cooler, safer operation." />
        </div>
        <span class="text-[10px] font-mono text-text-tertiary">{config.controller ? `${Math.round(stats.amps)}/${config.controller}A` : 'N/A'}</span>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <div class="h-1 bg-white/5 rounded-full overflow-hidden flex-1">
          <div class="h-full rounded-full transition-all duration-500" style:width={`${controllerHealth.percent}%`} style:background-color={controllerHealth.color}></div>
        </div>
        <span class="text-[10px] font-bold flex-shrink-0" style:color={controllerHealth.color}>{controllerHealth.status}</span>
      </div>
    </div>
  </div>

  <!-- Motor -->
  <div class="border border-white/[0.06] px-3 py-2.5 bg-white/[0.02] flex items-center gap-3">
    <div class="p-2 bg-white/[0.04]" style:color={motorHealth.color}>
      <Icon name="motor" size="sm" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Motor</span>
          <HelpTooltip position="right" content="Power-to-weight score. >80 = Extreme performance." />
        </div>
        <span class="text-[10px] font-mono text-text-tertiary">{Math.round(stats.accelScore)}/100</span>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <div class="h-1 bg-white/5 rounded-full overflow-hidden flex-1">
          <div class="h-full rounded-full transition-all duration-500" style:width={`${motorHealth.percent}%`} style:background-color={motorHealth.color}></div>
        </div>
        <span class="text-[10px] font-bold flex-shrink-0" style:color={motorHealth.color}>{motorHealth.status}</span>
      </div>
    </div>
  </div>
</div>
