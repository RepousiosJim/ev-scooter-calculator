<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import PerformanceSummary from '$lib/components/calculator/PerformanceSummary.svelte';
  import EfficiencyPanel from '$lib/components/calculator/EfficiencyPanel.svelte';
  import ComponentHealthPanel from '$lib/components/calculator/ComponentHealthPanel.svelte';
  import PowerGraph from '$lib/components/calculator/PowerGraph.svelte';
  import BottleneckPanel from '$lib/components/calculator/BottleneckPanel.svelte';
  import SectionDivider from '$lib/components/ui/SectionDivider.svelte';

  const stats = $derived(calculatorState.stats);
  const bottlenecks = $derived(calculatorState.bottlenecks);

  const analysisText = $derived(() => {
    let text = '';

    if (stats.cRate > 3) {
      text += `⚠️ <strong>High Stress:</strong> Battery discharge is high (${stats.cRate.toFixed(1)}C). Expect voltage sag.`;
    } else if (stats.cRate > 1.5) {
      text += '✅ <strong>Moderate Stress:</strong> Battery is well matched.';
    } else {
      text += '🔋 <strong>Efficient:</strong> Very low battery stress.';
    }

    if (stats.accelScore > 80) {
      text += ' <br>🚀 <strong>Extreme Acceleration.</strong>';
    } else if (stats.accelScore > 40) {
      text += ' <br>🛵 <strong>Good Acceleration.</strong>';
    }

    if (bottlenecks.length > 0) {
      text += '<br><br><strong>⚠️ Bottlenecks Detected:</strong>';
      bottlenecks.forEach(b => {
        text += `<br>• ${b.message}`;
      });
    }

    return text;
  });
</script>

<div 
  class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg sticky top-4 animate-fade-in"
  style="animation-delay: 0.2s"
>
  <div class="flex items-start justify-between mb-6">
    <div>
      <h2 class="text-h3 font-semibold text-textMain">Performance Analysis</h2>
      <p class="text-body-sm text-textMuted mt-1">Live results as you tune inputs and presets.</p>
    </div>
    <div 
      class="w-12 h-12 rounded-full bg-gradient-main bg-[length:200%_200%] animate-gradientShift flex items-center justify-center text-xl shadow-glow-sm"
      aria-hidden="true"
    >
      📊
    </div>
  </div>

  <div 
    class="space-y-6" 
    role="region" 
    aria-live="polite" 
    aria-atomic="true"
    aria-label="Performance results"
  >
    <PerformanceSummary />

    <SectionDivider icon="📈" label="Efficiency" />

    <EfficiencyPanel />

    <SectionDivider icon="🔧" label="System Health" />

    <ComponentHealthPanel />

    <SectionDivider icon="⚡" label="Power Analysis" />

    <PowerGraph />
    <BottleneckPanel />

    <div 
      class="rounded-lg border border-white/10 bg-gradient-hover p-5 text-body-sm text-textMuted animate-fade-in"
      role="alert"
      aria-live="polite"
    >
      {@html analysisText()}
    </div>
  </div>
</div>
