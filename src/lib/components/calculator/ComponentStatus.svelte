<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  const stats = $derived(calculatorState.stats);
  const config = $derived(calculatorState.config);

  const batteryStatus = $derived(() => {
    const percent = Math.min(100, (stats.cRate / 4) * 100);
    let status = '';
    let color = '';

    if (stats.cRate < 2) {
      status = 'Low Stress';
      color = 'var(--success)';
    } else if (stats.cRate < 3) {
      status = 'Moderate';
      color = 'var(--warning)';
    } else {
      status = 'High Stress';
      color = 'var(--danger)';
    }

    return { percent, status, color };
  });

  const controllerStatus = $derived(() => {
    if (!config.controller) {
      return { percent: 0, status: 'Not Set', color: 'var(--text-muted)' };
    }

    const requiredAmps = stats.totalWatts / config.v;
    const percent = Math.min(100, (requiredAmps / config.controller) * 100);
    let status = '';
    let color = '';

    if (requiredAmps < config.controller * 0.8) {
      status = 'Headroom Available';
      color = 'var(--success)';
    } else if (requiredAmps < config.controller) {
      status = 'Near Limit';
      color = 'var(--warning)';
    } else {
      status = 'Exceeds Limit';
      color = 'var(--danger)';
    }

    return { percent, status, color };
  });

  const motorStatus = $derived(() => {
    const percent = Math.min(100, (stats.accelScore / 100) * 100);
    let status = '';
    let color = '';

    if (stats.accelScore > 80) {
      status = 'Extreme Performance';
      color = 'var(--success)';
    } else if (stats.accelScore > 40) {
      status = 'Good Performance';
      color = 'var(--primary)';
    } else {
      status = 'Underpowered';
      color = 'var(--warning)';
    }

    return { percent, status, color };
  });
</script>

<div class="mt-6 pt-6 border-t border-gray-700">
  <h3 class="text-xl font-semibold mb-4 text-textMain">System Status</h3>
  <div class="grid grid-cols-3 gap-4">
    <!-- Battery Status -->
    <div
      class="bg-white/3 p-4 rounded-xl border-2 transition-all hover:-translate-y-0.5"
      style:background-color="rgba(255,255,255,0.03)"
      style:border-color={batteryStatus().color}
    >
      <div class="text-3xl mb-2">🔋</div>
      <div class="text-xs text-textMuted uppercase tracking-wide mb-2">Battery</div>
      <div class="text-sm font-semibold mb-3" style:color={batteryStatus().color}>
        {batteryStatus().status}
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          style:width="{batteryStatus().percent}%"
          style:background-color={batteryStatus().color}
        ></div>
      </div>
    </div>

    <!-- Controller Status -->
    <div
      class="bg-white/3 p-4 rounded-xl border-2 transition-all hover:-translate-y-0.5"
      style:background-color="rgba(255,255,255,0.03)"
      style:border-color={controllerStatus().color}
    >
      <div class="text-3xl mb-2">⚡</div>
      <div class="text-xs text-textMuted uppercase tracking-wide mb-2">Controller</div>
      <div class="text-sm font-semibold mb-3" style:color={controllerStatus().color}>
        {controllerStatus().status}
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          style:width="{controllerStatus().percent}%"
          style:background-color={controllerStatus().color}
        ></div>
      </div>
    </div>

    <!-- Motor Status -->
    <div
      class="bg-white/3 p-4 rounded-xl border-2 transition-all hover:-translate-y-0.5"
      style:background-color="rgba(255,255,255,0.03)"
      style:border-color={motorStatus().color}
    >
      <div class="text-3xl mb-2">🔧</div>
      <div class="text-xs text-textMuted uppercase tracking-wide mb-2">Motor</div>
      <div class="text-sm font-semibold mb-3" style:color={motorStatus().color}>
        {motorStatus().status}
      </div>
      <div class="h-2 bg-bgInput rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          style:width="{motorStatus().percent}%"
          style:background-color={motorStatus().color}
        ></div>
      </div>
    </div>
  </div>
</div>
