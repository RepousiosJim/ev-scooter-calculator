<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';

  // Components
  import PresetSelector from '$lib/components/calculator/PresetSelector.svelte';
  import BasicConfig from '$lib/components/calculator/BasicConfig.svelte';
  import AdvancedConfig from '$lib/components/calculator/AdvancedConfig.svelte';
  import ResultDisplay from '$lib/components/calculator/ResultDisplay.svelte';
  import PowerGraph from '$lib/components/calculator/PowerGraph.svelte';
  import UpgradeSimulator from '$lib/components/calculator/UpgradeSimulator.svelte';
  import ComponentStatus from '$lib/components/calculator/ComponentStatus.svelte';
  import ProfileManager from '$lib/components/calculator/ProfileManager.svelte';
  import UpgradeGuidance from '$lib/components/calculator/UpgradeGuidance.svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);
  const bottlenecks = $derived(calculatorState.bottlenecks);

  // Calculate analysis text
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

  // Calculate bar chart values
  const speedEfficiency = $derived(Math.min(100, (stats.speed / 100) * 100));
  const accelEfficiency = $derived(stats.accelScore);
  const rangeEfficiency = $derived(Math.min(100, (stats.totalRange / 150) * 100));
  const costEfficiency = $derived(Math.min(100, (stats.costPer100km / 5) * 100));
</script>

<svelte:head>
  <title>EV Scooter Pro Calculator v1.3</title>
  <meta name="description" content="Performance analysis, hardware compatibility, and upgrade simulation for electric scooters" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
  <!-- Header -->
  <header class="text-center mb-10">
    <p class="text-xs uppercase tracking-[0.3em] text-textMuted mb-3">Scooter Performance Studio</p>
    <h1 class="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
      EV Scooter Pro Calculator
    </h1>
    <p class="text-textMuted max-w-2xl mx-auto">
      Model speed, range, and upgrade impact in seconds with a clear performance snapshot.
    </p>
  </header>


  <!-- Profile Manager -->
  <ProfileManager />

  <!-- Main Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Left Column: Configuration -->
    <div class="lg:col-span-4">
      <div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg mb-6">
        <h2 class="text-xl font-semibold text-textMain">Configuration</h2>
        <p class="text-sm text-textMuted mt-1 mb-4">
          Start with a preset or enter your specs. Results update instantly.
        </p>

        <PresetSelector />
        <BasicConfig />


        <button
          onclick={() => calculatorState.showAdvanced = !calculatorState.showAdvanced}
          class="mt-4 w-full flex items-center justify-between gap-4 rounded-lg border border-gray-700/60 bg-bgInput/40 px-3 py-2 text-left hover:border-primary transition"
        >
          <div>
            <div class="text-sm font-semibold text-textMain">Advanced Options</div>
            <div class="text-xs text-textMuted">Rider + terrain, motor details, energy costs</div>
          </div>
          <span class="text-primary text-lg">{calculatorState.showAdvanced ? '▼' : '▶'}</span>
        </button>


        <AdvancedConfig />
      </div>
    </div>

    <!-- Right Column: Results -->
    <div class="lg:col-span-8">
      <div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-semibold text-textMain">Performance Analysis</h2>
            <p class="text-xs text-textMuted mt-1">Live results as you tune inputs and presets.</p>
          </div>

          <label class="flex items-center gap-2 text-sm text-textMuted cursor-pointer">
            <input
              type="checkbox"
              bind:checked={calculatorState.compareMode}
              class="w-4 h-4"
            />
            <span>Split View Simulator</span>
          </label>
        </div>


        <!-- Comparison Mode Toggle -->
        {#if calculatorState.compareMode}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <!-- Current Setup -->
            <div class="bg-white/3 p-4 rounded-lg border-b-4 border-primary">
              <div class="text-center font-bold mb-3 text-primary">CURRENT SETUP</div>
              <ResultDisplay />
            </div>

            <!-- Simulated Setup -->
            <div class="bg-white/3 p-4 rounded-lg border-b-4 border-secondary">
              <div class="text-center font-bold mb-3 text-secondary">SIMULATED UPGRADE</div>
              {#if simStats}
                <ResultDisplay stats={simStats} />
              {:else}
                <div class="flex flex-col items-center justify-center py-12 text-textMuted">
                  <div class="text-4xl mb-3">📊</div>
                  <div>Select an upgrade to simulate</div>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <ResultDisplay />
        {/if}

        <!-- Bar Charts -->
        <div class="bg-black/20 p-4 rounded-lg mt-6">
          <div class="flex items-center justify-between text-xs text-textMuted mb-3">
            <span class="font-semibold text-textMain">Efficiency Overview</span>
            <span>Realtime estimates</span>
          </div>
          <div class="mb-3">

            <div class="flex justify-between text-sm mb-1">
              <span>Speed Efficiency</span>
              <span>{Math.round(stats.speed)} km/h</span>
            </div>
            <div class="h-2 bg-bgInput rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style:width="{speedEfficiency}%"></div>
            </div>
          </div>

          <div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
              <span>Acceleration Score</span>
              <span>{Math.round(stats.accelScore)}/100</span>
            </div>
            <div class="h-2 bg-bgInput rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style:width="{accelEfficiency}%"></div>
            </div>
          </div>

          <div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
              <span>Range Potential</span>
              <span>{Math.round(stats.totalRange)} km</span>
            </div>
            <div class="h-2 bg-bgInput rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style:width="{rangeEfficiency}%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-sm mb-1">
              <span>Running Cost</span>
              <span>${stats.costPer100km.toFixed(2)}</span>
            </div>
            <div class="h-2 bg-bgInput rounded-full overflow-hidden">
              <div class="h-full bg-success transition-all duration-500" style:width="{costEfficiency}%"></div>
            </div>
          </div>
        </div>

        <!-- Power Graph -->
        <PowerGraph />

        <!-- Analysis Text -->
        <div class="mt-6 rounded-lg border border-white/5 bg-bgInput/40 p-4 text-sm text-textMuted">
          {@html analysisText()}
        </div>


        <!-- Component Status -->
        <ComponentStatus />
      </div>

      <!-- Upgrade Simulator -->
      <UpgradeSimulator />

      <!-- Upgrade Guidance -->
      <UpgradeGuidance />
    </div>
  </div>
</div>

