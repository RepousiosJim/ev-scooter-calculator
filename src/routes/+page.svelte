<script lang="ts">
  import { onMount } from 'svelte';
  import { calculatorState, loadConfigFromUrl } from '$lib/stores/calculator.svelte';
  import { analytics } from '$lib/utils/analytics';
  import { initBehaviorTracking, trackWebVitals, startSession, initAllABTests } from '$lib/utils/analytics';

  // Components
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import Hero from '$lib/components/ui/Hero.svelte';
  import TourModal from '$lib/components/ui/TourModal.svelte';
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
  import SectionDivider from '$lib/components/ui/SectionDivider.svelte';

  // New UI Components
  import VisualCRateIndicator from '$lib/components/ui/VisualCRateIndicator.svelte';
  import PerformanceGradeBadge from '$lib/components/ui/PerformanceGradeBadge.svelte';
  import ComparisonDeltaCard from '$lib/components/ui/ComparisonDeltaCard.svelte';

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);
  const bottlenecks = $derived(calculatorState.bottlenecks);

  let showTour = $state(false);
  let tourStep = $state(0);

  function startTour() {
    showTour = true;
    analytics.trackEvent('tour_started' as any);
  }

  function nextTourStep() {
    if (tourStep < 4) {
      tourStep = tourStep + 1;
    } else {
      completeTour();
    }
  }

  function completeTour() {
    try {
      localStorage.setItem('tour-completed', 'true');
      analytics.trackEvent('tour_completed' as any, { steps_completed: tourStep + 1 });
    } catch (error) {
      analytics.trackError(error as Error, { context: 'tour_complete' });
    }
    showTour = false;
  }

  function skipTour() {
    try {
      localStorage.setItem('tour-completed', 'true');
      analytics.trackEvent('tour_skipped' as any, { steps_completed: tourStep });
    } catch (error) {
      analytics.trackError(error as Error, { context: 'tour_skip' });
    }
    showTour = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!showTour) return;

    if (event.key === 'Escape') {
      skipTour();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      nextTourStep();
    } else if (event.key === 'ArrowLeft' && tourStep > 0) {
      tourStep = tourStep - 1;
    }
  }

  const tourSteps = [
    { title: 'Welcome!', content: 'This tool helps you analyze and optimize your EV scooter performance.' },
    { title: 'Quick Start', content: 'Choose a preset or enter your specs to see instant results.' },
    { title: 'Deep Dive', content: 'Advanced controls for detailed configuration and analysis.' },
    { title: 'Performance', content: 'Real-time metrics with visual indicators and insights.' },
    { title: 'Upgrades', content: 'Simulate upgrades before buying and compare results.' }
  ];

  // Calculate performance grade
  const performanceGrade = $derived(() => {
    const score = stats.accelScore + (stats.cRate < 2 ? 20 : stats.cRate < 3 ? 10 : 0);
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'A-';
    if (score >= 60) return 'B+';
    if (score >= 50) return 'B';
    if (score >= 40) return 'B-';
    if (score >= 30) return 'C+';
    if (score >= 20) return 'C';
    if (score >= 10) return 'C-';
    return 'D+';
  });

  onMount(() => {
    loadConfigFromUrl();

    startSession();
    initBehaviorTracking();
    trackWebVitals();
    initAllABTests();

    analytics.startFunnel('configuration_flow', 'page_load');

    try {
      const tourCompleted = localStorage.getItem('tour-completed');
      showTour = !tourCompleted;
      if (!showTour) {
        analytics.trackEvent('tour_previously_completed' as any);
      }
    } catch (error) {
      analytics.trackError(error as Error, { context: 'tour_check' });
      showTour = false;
    }

    window.addEventListener('beforeunload', () => {
      analytics.endSession();
    });
  });

  // Tab configuration with progress tracking
  const tabs = $derived(() => [
    { label: 'Quick Start', value: 'configuration' },
    { label: 'Deep Dive', value: 'advanced' },
    { label: 'Upgrades', value: 'upgrades' }
  ]);

  const tabIcons = {
    configuration: '⚡',
    advanced: '⚙️',
    upgrades: '🚀'
  };
</script>

<svelte:head>
  <title>EV Scooter Pro Calculator v2.0</title>
  <meta name="description" content="Performance analysis, hardware compatibility, and upgrade simulation for electric scooters" />
</svelte:head>

<div class="min-h-screen bg-bg-primary">
  <!-- Hero Section -->
  <Hero
    features={[
      { icon: '⚡', text: 'Real-time Analysis' },
      { icon: '🔋', text: 'Battery Modeling' },
      { icon: '📊', text: 'Upgrade Simulation' }
    ]}
  />

  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Profile Manager (Global) -->
    <ProfileManager />

    <!-- Tour Button -->
    <div class="flex justify-end mb-6">
      <button
        type="button"
        onclick={startTour}
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-secondary border border-white/5
          hover:bg-bg-hover hover:border-white/10 transition-all duration-slow"
        aria-label="Start guided tour"
      >
        <span aria-hidden="true">🚀</span>
        <span class="text-sm font-semibold text-text-primary">Quick Tour</span>
      </button>
    </div>

    <!-- Main Navigation Tabs -->
    <nav class="flex justify-center mb-8" aria-label="Main tabs">
      <Tabs tabs={tabs()} bind:activeTab={calculatorState.activeTab} icons={tabIcons} showProgress={true} />
    </nav>

    <!-- Configuration Tab (Quick Start) -->
    <section aria-labelledby="configuration-heading" id="configuration-panel">
      {#if calculatorState.activeTab === 'configuration'}
        <h2 id="configuration-heading" class="sr-only">Quick Start Configuration</h2>

        <!-- Mobile Layout: Single Column -->
        <div class="space-y-6 lg:hidden">
          <!-- Preset & Input Section -->
          <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg">
            <div class="space-y-6">
              <PresetSelector />
              <BasicConfig />
            </div>
          </div>

          <!-- Performance Results -->
          <div class="space-y-6">
            <!-- Grade Badge -->
            <div class="flex justify-center">
              <PerformanceGradeBadge
                grade={performanceGrade()}
                trend="neutral"
                size="lg"
              />
            </div>

            <PerformanceSummary />

            <SectionDivider icon="📈" label="Efficiency" />
            <EfficiencyPanel />

            <SectionDivider icon="🔋" label="Battery Health" />
            <VisualCRateIndicator value={stats.cRate} />
            <ComponentHealthPanel />

            <SectionDivider icon="⚡" label="Power Analysis" />
            <PowerGraph />
            <BottleneckPanel />
          </div>
        </div>

        <!-- Tablet Layout: Two Column -->
        <div class="hidden lg:grid lg:grid-cols-5 gap-6 xl:hidden">
          <div class="lg:col-span-2">
            <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg sticky top-4">
              <div class="space-y-6">
                <PresetSelector />
                <BasicConfig />
              </div>
            </div>
          </div>

          <div class="lg:col-span-3 space-y-6">
            <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg sticky top-4">
              <div class="flex items-start justify-between mb-6">
                <div>
                  <h3 class="text-h2 font-semibold text-text-primary">Performance Analysis</h3>
                  <p class="text-body-sm text-text-secondary mt-1">Live results as you tune inputs.</p>
                </div>
                <PerformanceGradeBadge grade={performanceGrade()} size="md" />
              </div>

              <div class="space-y-6" role="region" aria-live="polite" aria-atomic="true">
                <PerformanceSummary />

                <SectionDivider icon="📈" label="Efficiency" />
                <EfficiencyPanel />

                <SectionDivider icon="🔋" label="Battery Health" />
                <VisualCRateIndicator value={stats.cRate} />
                <ComponentHealthPanel />

                <SectionDivider icon="⚡" label="Power Analysis" />
                <PowerGraph />
                <BottleneckPanel />
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Layout: Three Column -->
        <div class="hidden xl:grid xl:grid-cols-12 gap-6">
          <!-- Column 1: Quick Inputs (25%) -->
          <div class="xl:col-span-3">
            <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg sticky top-4">
              <div class="flex items-center gap-2 mb-4">
                <span class="text-lg" aria-hidden="true">⚡</span>
                <h3 class="text-h3 font-semibold text-text-primary">Quick Start</h3>
              </div>
              <PresetSelector />
            </div>
          </div>

          <!-- Column 2: Configuration (35%) -->
          <div class="xl:col-span-4">
            <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg sticky top-4">
              <div class="flex items-center gap-2 mb-4">
                <span class="text-lg" aria-hidden="true">⚙️</span>
                <h3 class="text-h3 font-semibold text-text-primary">Configuration</h3>
              </div>
              <BasicConfig />
            </div>
          </div>

          <!-- Column 3: Results (40%) -->
          <div class="xl:col-span-5 space-y-6">
            <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg sticky top-4">
              <div class="flex items-start justify-between mb-6">
                <div>
                  <h3 class="text-h2 font-semibold text-text-primary">Performance Analysis</h3>
                  <p class="text-body-sm text-text-secondary mt-1">Live results as you tune inputs.</p>
                </div>
                <PerformanceGradeBadge grade={performanceGrade()} size="md" />
              </div>

              <div class="space-y-6" role="region" aria-live="polite" aria-atomic="true">
                <PerformanceSummary />

                <SectionDivider icon="📈" label="Efficiency" />
                <EfficiencyPanel />

                <SectionDivider icon="🔋" label="Battery Health" />
                <VisualCRateIndicator value={stats.cRate} />
                <ComponentHealthPanel />

                <SectionDivider icon="⚡" label="Power Analysis" />
                <PowerGraph />
                <BottleneckPanel />
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- Advanced Configuration Tab -->
    <section aria-labelledby="advanced-heading" id="advanced-panel">
      {#if calculatorState.activeTab === 'advanced'}
        <h2 id="advanced-heading" class="sr-only">Deep Dive Configuration</h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Basic Config -->
          <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-lg" aria-hidden="true">⚙️</span>
              <h3 class="text-h3 font-semibold text-text-primary">Basic Settings</h3>
            </div>
            <BasicConfig />
          </div>

          <!-- Advanced Config -->
          <div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-lg" aria-hidden="true">🔧</span>
              <h3 class="text-h3 font-semibold text-text-primary">Advanced Settings</h3>
            </div>
            <AdvancedConfig />
          </div>
        </div>

        <!-- Performance Results -->
        <div class="mt-6 space-y-6">
          <PerformanceSummary />
          <EfficiencyPanel />
          <ComponentHealthPanel />
          <PowerGraph />
          <BottleneckPanel />
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

          <!-- Upgrade Comparison -->
          {#if simStats && calculatorState.upgradeDelta}
            <div class="space-y-4">
              <div class="flex items-center gap-2 mb-4">
                <span class="text-lg" aria-hidden="true">📊</span>
                <h3 class="text-h2 font-semibold text-text-primary">Upgrade Comparison</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ComparisonDeltaCard
                  label="Range"
                  beforeValue={stats.totalRange}
                  afterValue={simStats.totalRange}
                  unit="km"
                  deltaPercent={calculatorState.upgradeDelta.rangePercent}
                />

                <ComparisonDeltaCard
                  label="Top Speed"
                  beforeValue={stats.speed}
                  afterValue={simStats.speed}
                  unit="km/h"
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
                  label="Cost per 100km"
                  beforeValue={stats.costPer100km}
                  afterValue={simStats.costPer100km}
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

              <ComparisonSummary />
              <ComparisonDisplay />
            </div>
          {:else}
            <div class="bg-bg-secondary rounded-xl p-12 border border-white/5 shadow-lg">
              <div class="flex flex-col items-center justify-center text-center py-16">
                <div class="text-6xl mb-4 animate-float" aria-hidden="true">📊</div>
                <div class="text-h2 font-semibold text-text-primary mb-2">No upgrade selected</div>
                <div class="text-body text-text-secondary">
                  Select an upgrade above to simulate its impact on your current setup
                </div>
              </div>
            </div>
          {/if}

          <!-- Upgrade Guidance -->
          <UpgradeGuidance />
        </div>
      {/if}
    </section>

    <!-- Tour Modal -->
    {#if showTour}
      <TourModal
        onClose={completeTour}
      />
    {/if}
  </div>
</div>
