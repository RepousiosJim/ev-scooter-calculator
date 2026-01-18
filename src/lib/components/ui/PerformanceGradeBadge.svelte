<script lang="ts">
  import { scale } from 'svelte/transition';

  type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F';

  let {
    grade,
    trend,
    size = 'md',
    showTrend = true
  }: {
    grade: Grade;
    trend?: 'up' | 'down' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
    showTrend?: boolean;
  } = $props();

  const sizeConfig = {
    sm: { padding: 'px-3 py-1.5', text: 'text-lg' },
    md: { padding: 'px-4 py-2', text: 'text-2xl' },
    lg: { padding: 'px-6 py-3', text: 'text-4xl' },
  };

  const gradeColor = $derived(() => {
    const firstChar = grade.charAt(0);
    if (firstChar === 'A') return 'bg-gradient-success text-white';
    if (firstChar === 'B') return 'bg-primary text-white';
    if (firstChar === 'C') return 'bg-warning text-white';
    if (firstChar === 'D') return 'bg-danger text-white';
    return 'bg-gradient-danger text-white';
  });

  const trendIcon = $derived(() => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  });

  const trendColor = $derived(() => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-danger';
      default: return 'text-text-secondary';
    }
  });

  const config = $derived(() => sizeConfig[size]);
</script>

<div class="inline-flex items-center gap-3">
  <!-- Grade Badge -->
  <div
    transition:scale={{ duration: 400, easing: (t) => Math.pow(t, 0.5) }}
    class="inline-flex items-center justify-center {config().padding} rounded-xl shadow-lg {gradeColor()} font-bold font-display {config().text} border-2 border-white/10"
    role="img"
    aria-label={`Performance grade: ${grade}`}
  >
    {grade}
  </div>

  <!-- Trend Indicator -->
  {#if showTrend && trend}
    <div
      transition:scale
      class="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 {trendColor()}"
      aria-label={`Trend: ${trend}`}
    >
      <span class="text-sm" aria-hidden="true">{trendIcon()}</span>
      <span class="text-xs font-medium uppercase">
        {trend === 'up' ? 'Improved' : trend === 'down' ? 'Declined' : 'Stable'}
      </span>
    </div>
  {/if}
</div>
