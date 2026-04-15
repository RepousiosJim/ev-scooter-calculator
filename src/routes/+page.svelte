<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  // lucide-svelte removed from this file — replaced with the inline SVG Icon component
  // to keep lucide out of the critical-path bundle (LCP/INP improvement).
  import { calculatorState, loadConfigFromUrl, loadPreset } from '$lib/stores/calculator.svelte';
  import { uiState, toggleUnitSystem } from '$lib/stores/ui.svelte';
  import { analytics } from '$lib/utils/analytics';
  import { initBehaviorTracking, trackWebVitals, startSession, initAllABTests } from '$lib/utils/analytics';

  // Components
  import AppHeader from '$lib/components/ui/AppHeader.svelte';
  import PresetSelector from '$lib/components/calculator/PresetSelector.svelte';
  // ProfileManager is lazy-loaded to keep lucide-svelte out of the critical bundle
  import BasicConfig from '$lib/components/calculator/BasicConfig.svelte';
  import AdvancedConfig from '$lib/components/calculator/AdvancedConfig.svelte';
  import PerformanceSummary from '$lib/components/calculator/PerformanceSummary.svelte';
  import EfficiencyPanel from '$lib/components/calculator/EfficiencyPanel.svelte';
  import ComponentHealthPanel from '$lib/components/calculator/ComponentHealthPanel.svelte';
  import SectionDivider from '$lib/components/ui/SectionDivider.svelte';
  import RideModeSelector from '$lib/components/calculator/RideModeSelector.svelte';
  import TerrainSelector from '$lib/components/calculator/TerrainSelector.svelte';
  import ShareButton from '$lib/components/ui/ShareButton.svelte';

  import VisualCRateIndicator from '$lib/components/ui/VisualCRateIndicator.svelte';
  import ComparisonDeltaCard from '$lib/components/ui/ComparisonDeltaCard.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import { distanceVal, speedVal, distanceUnit, speedUnit, costPer100Val, costDistanceLabel } from '$lib/utils/units';
  import { exportJSON, buildCalculatorExport } from '$lib/utils/export';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);

  onMount(() => {
    loadConfigFromUrl();

    // Handle URL params from other pages
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'compare' || tab === 'upgrades' || tab === 'configuration') {
      uiState.activeTab = tab;
    }
    const presetParam = params.get('preset');
    if (presetParam) {
      loadPreset(presetParam);
    }

    // Defer non-critical analytics init to avoid blocking first interaction
    let cleanupBehaviorTracking = () => {};
    let cleanupWebVitals = () => {};
    const scheduleAnalytics = (cb: () => void) =>
      typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 0);
    scheduleAnalytics(() => {
      startSession();
      cleanupBehaviorTracking = initBehaviorTracking();
      cleanupWebVitals = trackWebVitals();
      initAllABTests();
      analytics.startFunnel('configuration_flow', 'page_load');
    });

    const handleBeforeUnload = () => {
      analytics.endSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clean up analytics listeners and intervals
      cleanupBehaviorTracking();
      cleanupWebVitals();
    };
  });

  let showDetailedAnalysis = $state(false);
  let showAdvancedConfig = $state(false);
  let showEfficencyMobile = $state(false);
  let hasInteracted = $state(false);

  const scriptOpen = '<script type="application/ld+json">';
  const scriptClose = '<' + '/script>';
  const webAppJsonLd =
    scriptOpen +
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'EV Scooter Pro Calculator',
      description:
        'Free online calculator for electric scooter performance analysis, hardware compatibility checking, upgrade simulation, and scooter comparison. Calculates real-world range, top speed, power output, and efficiency.',
      url: 'https://evscooterpro.com/',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Electric scooter range calculator',
        'Top speed and power analysis',
        'Hardware upgrade simulator',
        'Side-by-side scooter comparison',
        'Performance grading and scoring',
      ],
    }) +
    scriptClose;
  const faqJsonLd =
    scriptOpen +
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How is the range calculated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Range is calculated using battery capacity (Wh), motor efficiency, rider weight, and riding conditions. The calculator models real-world power draw at a given speed to estimate how far you can travel on a full charge.',
          },
        },
        {
          '@type': 'Question',
          name: 'What determines the top speed?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Top speed is primarily determined by motor power, voltage, and wheel size. The controller's current limit, gear ratio, and aerodynamic drag also cap the maximum achievable speed.",
          },
        },
        {
          '@type': 'Question',
          name: 'How accurate are these calculations?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Calculated figures are physics-based estimates derived from manufacturer specs and real-world efficiency models. Actual results vary with terrain, temperature, rider weight, and riding style — typically within 10–20% of calculated values.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the performance score?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The performance score (0–100) is a composite rating that weighs range, top speed, power output, acceleration, and efficiency. Scooters are graded S through F based on their score relative to all models in the database.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does rider weight affect range?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Heavier riders require more motor power to maintain speed, which increases energy consumption and reduces range. As a rough rule, every additional 10 kg of rider weight reduces range by roughly 3–8%, depending on the scooter's power headroom.",
          },
        },
      ],
    }) +
    scriptClose;

  $effect(() => {
    if (calculatorState.activePresetKey !== 'custom') {
      hasInteracted = true;
    }
  });
</script>

<svelte:head>
  <title>Electric Scooter Range &amp; Performance Calculator | EV Scooter Pro</title>
  <meta
    name="description"
    content="Calculate electric scooter range, top speed, and performance. Compare 166+ e-scooter models with our free physics-based calculator."
  />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webAppJsonLd}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html faqJsonLd}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html scriptOpen +
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'EV Scooter Pro',
      url: 'https://evscooterpro.com',
      description: 'Electric scooter performance calculator and comparison tool',
    }) +
    scriptClose}
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <!-- Decorative background elements.
       contain-intrinsic-size + content-visibility prevent these large painted
       elements from contributing to layout recalculation cost (INP improvement).
       will-change:transform promotes them to a GPU layer so blur doesn't repaint
       on scroll. Explicit width/height prevent CLS during initial paint. -->
  <div
    class="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl pointer-events-none"
    aria-hidden="true"
    style="contain: strict;"
  ></div>
  <div
    class="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-secondary/3 blur-3xl pointer-events-none"
    aria-hidden="true"
    style="contain: strict;"
  ></div>

  <div class="relative">
    <AppHeader />

    <div class="max-w-7xl mx-auto px-3 sm:px-4 pt-6 lg:pt-8 pb-20 lg:pb-16">
      <!-- Calculator Tab -->
      <div
        aria-labelledby="configuration-heading"
        id="configuration-panel"
        role="tabpanel"
        aria-hidden={uiState.activeTab !== 'configuration'}
        tabindex={uiState.activeTab === 'configuration' ? 0 : -1}
      >
        {#if uiState.activeTab === 'configuration'}
          <h2 id="configuration-heading" class="sr-only">Calculator</h2>

          {#if calculatorState.activePresetKey === 'custom' && !hasInteracted}
            <div
              class="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 backdrop-blur-sm flex items-start gap-3 animate-fadeIn"
            >
              <span class="text-primary shrink-0 mt-0.5"><Icon name="acceleration" size="sm" ariaLabel="Tip" /></span>
              <div class="flex-1">
                <p class="text-sm font-bold text-text-primary">Start with a preset</p>
                <p class="text-xs text-text-tertiary mt-1">
                  Pick a scooter model below to auto-fill specs, then customize from there.
                </p>
              </div>
            </div>
          {/if}

          <div class="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-5 lg:gap-12">
            <!-- Left Column: Configuration -->
            <section aria-label="Scooter Configuration" class="md:col-span-4 lg:col-span-5 space-y-6 min-w-0">
              <div class="space-y-5">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary/60" aria-hidden="true"></div>
                  <h3 class="text-[10px] font-black text-text-secondary uppercase tracking-[0.22em]">Configuration</h3>
                  <div class="h-px flex-1 bg-gradient-to-r from-white/[0.12] to-transparent"></div>
                </div>
                <PresetSelector />
                {#await import('$lib/components/calculator/ProfileManager.svelte') then { default: ProfileManager }}
                  <ProfileManager />
                {/await}
                <RideModeSelector />
                <TerrainSelector />
                <BasicConfig />
              </div>

              <!-- Collapsible Advanced Config -->
              <div class="border-t border-white/5 pt-4">
                <button
                  type="button"
                  onclick={() => (showAdvancedConfig = !showAdvancedConfig)}
                  aria-expanded={showAdvancedConfig}
                  aria-controls="advanced-config-panel"
                  class="w-full py-3 px-4 border border-white/[0.06] bg-white/[0.02] rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 flex items-center justify-between group"
                >
                  <div class="flex items-center gap-3">
                    <Icon name="settings" size="md" class="text-secondary group-hover:scale-110 transition-transform" />
                    <span class="text-xs font-bold uppercase tracking-[0.16em] text-text-primary">
                      Advanced Parameters
                    </span>
                  </div>
                  <span
                    class="text-text-tertiary transition-transform duration-300"
                    style:transform={showAdvancedConfig ? 'rotate(180deg)' : ''}
                  >
                    <Icon name="chevron-down" size="sm" />
                  </span>
                </button>

                {#if showAdvancedConfig}
                  <div id="advanced-config-panel" transition:slide={{ duration: 300 }} class="mt-6 space-y-8">
                    <AdvancedConfig />
                  </div>
                {/if}
              </div>
            </section>

            <!-- Right Column: Results -->
            <section aria-label="Performance Results" class="md:col-span-8 lg:col-span-7 space-y-6 min-w-0">
              <div
                class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 lg:p-6 shadow-2xl shadow-black/10 backdrop-blur-sm"
              >
                <div class="mb-6 flex items-center justify-between gap-4">
                  <h3 class="text-xl font-black text-text-primary tracking-tight">Performance Analysis</h3>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <!-- Unit Toggle -->
                    <button
                      type="button"
                      onclick={toggleUnitSystem}
                      class="px-2.5 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary hover:border-white/20 transition-all uppercase tracking-wider"
                      aria-label="Toggle units between metric and imperial"
                    >
                      {uiState.unitSystem === 'metric' ? 'Metric' : 'Imperial'}
                    </button>
                    <ShareButton />
                    <button
                      type="button"
                      class="px-2.5 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary hover:border-white/20 transition-all uppercase tracking-wider"
                      aria-label="Export results as JSON"
                      onclick={() => {
                        const data = buildCalculatorExport(
                          calculatorState.activePresetName,
                          calculatorState.config,
                          stats
                        );
                        exportJSON([data]);
                      }}
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      class="hidden sm:block px-2.5 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary hover:border-white/20 transition-all uppercase tracking-wider"
                      aria-label="Print results"
                      onclick={() => window.print()}
                    >
                      Print
                    </button>
                  </div>
                </div>

                <div class="space-y-6">
                  <PerformanceSummary />

                  <!-- Collapsible on mobile, always visible on desktop -->
                  <div class="hidden md:block space-y-6">
                    <SectionDivider icon="efficiency" label="Efficiency & Health" />
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <EfficiencyPanel />
                      <ComponentHealthPanel />
                    </div>
                    <VisualCRateIndicator value={stats.cRate} />
                  </div>

                  <div class="md:hidden">
                    <button
                      type="button"
                      onclick={() => (showEfficencyMobile = !showEfficencyMobile)}
                      aria-expanded={showEfficencyMobile}
                      aria-controls="efficiency-mobile-panel"
                      class="w-full py-3 px-4 border border-white/[0.06] bg-white/[0.02] rounded-xl hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                    >
                      <div class="flex items-center gap-2">
                        <Icon name="efficiency" size="sm" class="text-secondary" />
                        <span class="text-xs font-bold uppercase tracking-[0.12em] text-text-primary"
                          >Efficiency & Health</span
                        >
                      </div>
                      <span
                        class="text-text-tertiary transition-transform duration-300"
                        style:transform={showEfficencyMobile ? 'rotate(180deg)' : ''}
                      >
                        <Icon name="chevron-down" size="sm" />
                      </span>
                    </button>

                    {#if showEfficencyMobile}
                      <div id="efficiency-mobile-panel" transition:slide={{ duration: 300 }} class="mt-4 space-y-4">
                        <div class="grid grid-cols-1 gap-4">
                          <EfficiencyPanel />
                          <ComponentHealthPanel />
                        </div>
                        <VisualCRateIndicator value={stats.cRate} />
                      </div>
                    {/if}
                  </div>

                  <!-- Detailed Analysis Toggle -->
                  <div class="pt-2">
                    <button
                      type="button"
                      onclick={() => (showDetailedAnalysis = !showDetailedAnalysis)}
                      aria-expanded={showDetailedAnalysis}
                      aria-controls="detailed-analysis-panel"
                      class="w-full py-3 px-4 border border-white/[0.06] bg-white/[0.02] rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 flex items-center justify-between group"
                    >
                      <div class="flex items-center gap-2">
                        <Icon
                          name={showDetailedAnalysis ? 'chart' : 'efficiency'}
                          size="sm"
                          class="group-hover:scale-110 transition-transform"
                        />
                        <span class="text-xs font-bold uppercase tracking-[0.12em] text-text-primary">
                          {showDetailedAnalysis ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
                        </span>
                      </div>
                      <span
                        class="text-text-tertiary transition-transform duration-300"
                        style:transform={showDetailedAnalysis ? 'rotate(180deg)' : ''}
                      >
                        <Icon name="chevron-down" size="sm" />
                      </span>
                    </button>

                    {#if showDetailedAnalysis}
                      <div id="detailed-analysis-panel" class="mt-6 space-y-6 animate-fadeIn">
                        <SectionDivider icon="chart" label="Power Analysis" />
                        {#await import('$lib/components/calculator/PowerGraph.svelte') then { default: PowerGraph }}
                          <PowerGraph />
                        {/await}
                        {#await import('$lib/components/calculator/BottleneckPanel.svelte') then { default: BottleneckPanel }}
                          <BottleneckPanel />
                        {/await}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </section>
          </div>
        {/if}
      </div>

      <!-- Upgrades Tab — content-visibility:auto skips layout/paint when tab is inactive -->
      <div
        aria-labelledby="upgrades-heading"
        id="upgrades-panel"
        role="tabpanel"
        style={uiState.activeTab !== 'upgrades' ? 'content-visibility: auto; contain-intrinsic-size: 0 600px;' : ''}
      >
        {#if uiState.activeTab === 'upgrades'}
          <h2 id="upgrades-heading" class="sr-only">Upgrades</h2>
          <div class="space-y-6 md:space-y-8">
            <!-- Upgrade Simulator -->
            {#await import('$lib/components/calculator/UpgradeSimulator.svelte') then { default: UpgradeSimulator }}
              <UpgradeSimulator />
            {/await}

            <!-- Upgrade Comparison -->
            {#if simStats && calculatorState.upgradeDelta}
              <div id="upgrade-comparison-results" class="space-y-6">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-1.5 h-1.5 rounded-full bg-success/60" aria-hidden="true"></div>
                  <h3 class="text-[10px] font-black uppercase tracking-[0.22em] text-text-secondary">Upgrade Impact</h3>
                  <div class="h-px flex-1 bg-gradient-to-r from-white/[0.12] to-transparent"></div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <ComparisonDeltaCard
                    label="Range"
                    beforeValue={distanceVal(stats.totalRange)}
                    afterValue={distanceVal(simStats.totalRange)}
                    unit={distanceUnit()}
                    deltaPercent={calculatorState.upgradeDelta.rangePercent}
                  />

                  <ComparisonDeltaCard
                    label="Top Speed"
                    beforeValue={speedVal(stats.speed)}
                    afterValue={speedVal(simStats.speed)}
                    unit={speedUnit()}
                    deltaPercent={calculatorState.upgradeDelta.speedPercent}
                  />

                  <ComparisonDeltaCard
                    label="Power"
                    beforeValue={stats.totalWatts}
                    afterValue={simStats.totalWatts}
                    unit="W"
                    deltaPercent={calculatorState.upgradeDelta.powerPercent}
                  />

                  <ComparisonDeltaCard
                    label="Charge Time"
                    beforeValue={stats.chargeTime}
                    afterValue={simStats.chargeTime}
                    unit="h"
                    deltaPercent={-calculatorState.upgradeDelta.chargeTimePercent}
                  />

                  <ComparisonDeltaCard
                    label={'Cost ' + costDistanceLabel()}
                    beforeValue={costPer100Val(stats.costPer100km)}
                    afterValue={costPer100Val(simStats.costPer100km)}
                    unit="$"
                    deltaPercent={-calculatorState.upgradeDelta.costPercent}
                  />

                  <ComparisonDeltaCard
                    label="Acceleration"
                    beforeValue={stats.accelScore}
                    afterValue={simStats.accelScore}
                    unit=""
                    deltaPercent={calculatorState.upgradeDelta.accelPercent}
                  />
                </div>

                {#await import('$lib/components/calculator/ComparisonSummary.svelte') then { default: ComparisonSummary }}
                  <ComparisonSummary />
                {/await}
                {#await import('$lib/components/calculator/ComparisonDisplay.svelte') then { default: ComparisonDisplay }}
                  <ComparisonDisplay />
                {/await}
              </div>
            {:else}
              <div class="bg-white/[0.02] border border-white/[0.06] border-dashed rounded-2xl p-5 sm:p-6 md:p-10">
                <div class="flex flex-col items-center justify-center text-center py-8 md:py-12 gap-3">
                  <div
                    class="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Icon name="upgrades" size="md" class="text-text-tertiary opacity-40" />
                  </div>
                  <div class="space-y-1">
                    <div class="text-base font-bold text-text-secondary">No upgrade selected</div>
                    <div class="text-sm text-text-tertiary max-w-xs">
                      Choose an upgrade from the simulator above to see how it affects your performance
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Compare Tab — content-visibility:auto skips layout/paint when tab is inactive -->
      <div
        aria-labelledby="compare-heading"
        id="compare-panel"
        role="tabpanel"
        style={uiState.activeTab !== 'compare' ? 'content-visibility: auto; contain-intrinsic-size: 0 800px;' : ''}
      >
        {#if uiState.activeTab === 'compare'}
          <h2 id="compare-heading" class="sr-only">Scooter Comparison</h2>
          {#await import('$lib/components/calculator/ScooterComparisonTable.svelte') then { default: ScooterComparisonTable }}
            <ScooterComparisonTable />
          {/await}
        {/if}
      </div>
    </div>
  </div>
</div>
