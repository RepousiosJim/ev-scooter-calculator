<script lang="ts">
  import { onMount } from 'svelte';
  import { calculatorState, loadConfigFromUrl, applyConfig, defaultConfig } from '$lib/stores/calculator.svelte';
  
  // Components
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import PresetSelector from '$lib/components/calculator/PresetSelector.svelte';
  import BasicConfig from '$lib/components/calculator/BasicConfig.svelte';
  import AdvancedConfig from '$lib/components/calculator/AdvancedConfig.svelte';
  import PowerGraph from '$lib/components/calculator/PowerGraph.svelte';
  import UpgradeSimulator from '$lib/components/calculator/UpgradeSimulator.svelte';
  import ProfileManager from '$lib/components/calculator/ProfileManager.svelte';
  import UpgradeGuidance from '$lib/components/calculator/UpgradeGuidance.svelte';
  import ComparisonDisplay from '$lib/components/calculator/ComparisonDisplay.svelte';
  import ComparisonSummary from '$lib/components/calculator/ComparisonSummary.svelte';
  import PerformanceSummary from '$lib/components/calculator/PerformanceSummary.svelte';
  import EfficiencyPanel from '$lib/components/calculator/EfficiencyPanel.svelte';
  import ComponentHealthPanel from '$lib/components/calculator/ComponentHealthPanel.svelte';
  import BottleneckPanel from '$lib/components/calculator/BottleneckPanel.svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);
  const bottlenecks = $derived(calculatorState.bottlenecks);

  let showTour = $state(false);
  let tourStep = $state(0);

  function startTour() {
    showTour = true;
  }

  function nextTourStep() {
    if (tourStep < 4) {
      tourStep += 1;
    } else {
      completeTour();
    }
  }

  function completeTour() {
    localStorage.setItem('tour-completed', 'true');
    showTour = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      completeTour();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      nextTourStep();
    } else if (event.key === 'ArrowLeft' && tourStep > 0) {
      tourStep -= 1;
    }
  }

  const tourSteps = [
    { title: 'Welcome!', content: 'This tool helps you analyze and optimize your EV scooter performance.' },
    { title: 'Preset Selector', content: 'Choose from popular scooter models to get started quickly.' },
    { title: 'Configuration', content: 'Adjust your scooter specifications in real-time.' },
    { title: 'Results', content: 'View instant performance analysis and bottleneck warnings.' },
    { title: 'Upgrades', content: 'Simulate upgrades and see their impact before buying.' }
  ];

  onMount(() => {
    loadConfigFromUrl();
    showTour = !localStorage.getItem('tour-completed');
  });

  // Tab configuration
  const tabs = [
    { label: 'Configuration', value: 'configuration' },
    { label: 'Upgrades', value: 'upgrades' }
  ];

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

  <!-- Profile Manager (Global) -->
  <ProfileManager />

  <!-- Tour Button -->
  <div class="flex justify-end mb-8">
    {#if !localStorage.getItem('tour-completed')}
      <button
        type="button"
        onclick={startTour}
        class="bg-bgInput text-textMain px-4 py-2 rounded-lg hover:opacity-90 transition"
        aria-label="Start guided tour"
      >
        🚀 Quick Tour
      </button>
    {/if}
  </div>

  <nav class="flex justify-center mb-8" aria-label="Main tabs">
    <Tabs tabs={tabs} bind:activeTab={calculatorState.activeTab} />
  </nav>
              <span class="text-primary text-lg" aria-hidden="true">{calculatorState.showAdvanced ? '▼' : '▶'}</span>
            </button>

            <AdvancedConfig />
          </div>
        </div>

        <div class="lg:col-span-8">
          <div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg">
            <h3 class="text-xl font-semibold text-textMain">Performance Analysis</h3>
            <p class="text-xs text-textMuted mt-1 mb-4">Live results as you tune inputs and presets.</p>

            <div class="space-y-6" role="region" aria-live="polite" aria-atomic="true">
              <PerformanceSummary />
              <EfficiencyPanel />
              <ComponentHealthPanel />
              <PowerGraph />
              <BottleneckPanel />
              <div class="rounded-lg border border-white/5 bg-black/20 p-4 text-sm text-textMuted" role="alert">
                {@html analysisText()}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </section>

  <!-- Upgrades Tab -->
  <section aria-labelledby="upgrades-heading" id="upgrades-panel">
    {#if calculatorState.activeTab === 'upgrades'}
      <h2 id="upgrades-heading" class="sr-only">Upgrades</h2>
      <div class="space-y-6">
        <!-- Upgrade Simulator -->
        <UpgradeSimulator />

        <!-- Comparison Display -->
        <div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg">
          <div class="mb-6">
            <h3 class="text-xl font-semibold text-textMain">Upgrade Comparison</h3>
            <p class="text-sm text-textMuted mt-1">View impact of simulated upgrades on your current setup</p>
          </div>

          <div role="region" aria-live="polite">
            {#if simStats}
              <ComparisonSummary />
              <ComparisonDisplay />
            {:else}
              <div class="flex flex-col items-center justify-center py-16 text-textMuted">
                <div class="text-5xl mb-4" aria-hidden="true">📊</div>
                <div class="text-lg font-medium text-textMain">No upgrade selected</div>
                <div class="text-sm mt-2">Select an upgrade above to simulate its impact</div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Upgrade Guidance -->
        <UpgradeGuidance />
      </div>
    {/if}
  </section>
</div>
