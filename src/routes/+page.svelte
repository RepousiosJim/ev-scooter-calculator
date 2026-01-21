<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import {
    calculatorState,
    loadConfigFromUrl,
  } from "$lib/stores/calculator.svelte";
  import { analytics } from "$lib/utils/analytics";
  import {
    initBehaviorTracking,
    trackWebVitals,
    startSession,
    initAllABTests,
  } from "$lib/utils/analytics";

  // Components
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import Hero from "$lib/components/ui/Hero.svelte";
  import PresetSelector from "$lib/components/calculator/PresetSelector.svelte";
  import BasicConfig from "$lib/components/calculator/BasicConfig.svelte";
  import AdvancedConfig from "$lib/components/calculator/AdvancedConfig.svelte";
  import PowerGraph from "$lib/components/calculator/PowerGraph.svelte";
  import UpgradeSimulator from "$lib/components/calculator/UpgradeSimulator.svelte";
  import UpgradeGuidance from "$lib/components/calculator/UpgradeGuidance.svelte";
  import ComparisonDisplay from "$lib/components/calculator/ComparisonDisplay.svelte";
  import ComparisonSummary from "$lib/components/calculator/ComparisonSummary.svelte";
  import PerformanceSummary from "$lib/components/calculator/PerformanceSummary.svelte";
  import EfficiencyPanel from "$lib/components/calculator/EfficiencyPanel.svelte";
  import ComponentHealthPanel from "$lib/components/calculator/ComponentHealthPanel.svelte";
  import BottleneckPanel from "$lib/components/calculator/BottleneckPanel.svelte";
  import SectionDivider from "$lib/components/ui/SectionDivider.svelte";
  import RideModeSelector from "$lib/components/calculator/RideModeSelector.svelte";
  import ScooterComparisonTable from "$lib/components/calculator/ScooterComparisonTable.svelte";

  // New UI Components
  import VisualCRateIndicator from "$lib/components/ui/VisualCRateIndicator.svelte";
  import PerformanceGradeBadge from "$lib/components/ui/PerformanceGradeBadge.svelte";
  import ComparisonDeltaCard from "$lib/components/ui/ComparisonDeltaCard.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);
  const bottlenecks = $derived(calculatorState.bottlenecks);
  const performanceGrade = $derived(calculatorState.performanceGrade);

  onMount(() => {
    loadConfigFromUrl();

    startSession();
    initBehaviorTracking();
    trackWebVitals();
    initAllABTests();

    analytics.startFunnel("configuration_flow", "page_load");

    window.addEventListener("beforeunload", () => {
      analytics.endSession();
    });
  });

  let showDetailedAnalysis = $state(false);

  // Tab configuration
  const navTabs = $derived.by(() => [
    { label: "Quick Start", value: "configuration" },
    { label: "Deep Dive", value: "advanced" },
    { label: "Upgrades", value: "upgrades" },
    { label: "Compare", value: "compare" },
  ]);

  const tabIcons = {
    configuration: "config",
    advanced: "settings",
    upgrades: "upgrades",
    compare: "scooter",
  };
</script>

<svelte:head>
  <title>EV Scooter Pro Calculator v2.0</title>
  <meta
    name="description"
    content="Performance analysis, hardware compatibility, and upgrade simulation for electric scooters"
  />
</svelte:head>

<div class="min-h-screen bg-bg-primary">
  <Hero />

  <div class="max-w-7xl mx-auto px-4 pb-16">
    <!-- Main Navigation Tabs -->
    <nav class="flex justify-center mb-12" aria-label="Main tabs">
      <Tabs
        tabs={navTabs}
        bind:activeTab={calculatorState.activeTab}
        icons={tabIcons}
        showProgress={true}
      />
    </nav>

    <!-- Configuration Tab (Quick Start) -->
    <section aria-labelledby="configuration-heading" id="configuration-panel">
      {#if calculatorState.activeTab === "configuration"}
        <h2 id="configuration-heading" class="sr-only">
          Quick Start Configuration
        </h2>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <!-- Left Column: Configuration -->
          <div class="lg:col-span-5 space-y-8">
            <div class="space-y-6">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="config" size="md" class="text-primary" />
                <h3
                  class="text-h3 font-bold text-text-primary uppercase tracking-wider"
                >
                  Configuration
                </h3>
              </div>
              <PresetSelector />
              <RideModeSelector />
              <BasicConfig />
            </div>
          </div>

          <!-- Right Column: Results -->
          <div class="lg:col-span-7 space-y-8">
            <div
              class="bg-bg-secondary rounded-2xl p-6 lg:p-8 border border-white/5 shadow-xl"
            >
              <div class="mb-8">
                <h3 class="text-h2 font-bold text-text-primary">
                  Performance Analysis
                </h3>
                <p class="text-body-sm text-text-secondary mt-1">
                  Real-time results based on your configuration.
                </p>
              </div>

              <div
                class="space-y-8"
                role="region"
                aria-live="polite"
                aria-atomic="true"
              >
                <PerformanceSummary />

                <SectionDivider icon="efficiency" label="Efficiency & Health" />
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EfficiencyPanel />
                  <ComponentHealthPanel />
                </div>

                <VisualCRateIndicator value={stats.cRate} />

                <!-- Detailed Analysis Toggle -->
                <div class="pt-4">
                  <button
                    type="button"
                    onclick={() =>
                      (showDetailedAnalysis = !showDetailedAnalysis)}
                    class="w-full py-4 px-6 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all flex items-center justify-between group"
                  >
                    <div class="flex items-center gap-3">
                      <Icon
                        name={showDetailedAnalysis ? "chart" : "efficiency"}
                        size="md"
                        class="group-hover:scale-110 transition-transform"
                      />
                      <span
                        class="text-sm font-bold uppercase tracking-widest text-text-primary"
                      >
                        {showDetailedAnalysis
                          ? "Hide Detailed Analysis"
                          : "Show Detailed Analysis"}
                      </span>
                    </div>
                    <span
                      class="text-text-secondary transition-transform duration-300"
                      style:transform={showDetailedAnalysis
                        ? "rotate(180deg)"
                        : ""}
                    >
                      ▼
                    </span>
                  </button>

                  {#if showDetailedAnalysis}
                    <div class="mt-8 space-y-8 animate-fadeIn">
                      <SectionDivider icon="chart" label="Power Analysis" />
                      <PowerGraph />
                      <BottleneckPanel />
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- Advanced Configuration Tab -->
    <section aria-labelledby="advanced-heading" id="advanced-panel">
      {#if calculatorState.activeTab === "advanced"}
        <div class="space-y-12" transition:fly={{ y: 20, duration: 400 }}>
          <header class="px-1 border-b border-white/5 pb-8">
            <h1
              id="advanced-heading"
              class="text-3xl font-bold text-text-primary tracking-tight"
            >
              Advanced Diagnostics
            </h1>
            <p class="text-text-secondary mt-2 text-balance leading-relaxed">
              Fine-tune hardware parameters and analyze performance telemetry
              with precision physics modeling.
            </p>
          </header>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <!-- Configuration Column -->
            <div class="lg:col-span-5 space-y-12">
              <section id="basic-config" class="space-y-6">
                <div class="flex items-center gap-2 px-1">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                  <h2
                    class="text-sm font-bold uppercase tracking-widest text-text-secondary"
                  >
                    Core Specifications
                  </h2>
                </div>
                <BasicConfig />
              </section>

              <section
                id="advanced-config"
                class="space-y-6 border-t border-white/5 pt-10"
              >
                <div class="flex items-center gap-2 px-1">
                  <div class="w-1.5 h-1.5 rounded-full bg-secondary/40"></div>
                  <h2
                    class="text-sm font-bold uppercase tracking-widest text-text-secondary"
                  >
                    Technical Overrides
                  </h2>
                </div>
                <AdvancedConfig />
              </section>
            </div>

            <!-- Analysis Column -->
            <div class="lg:col-span-7 space-y-12">
              <section id="results-summary" class="space-y-8">
                <div class="flex items-center justify-between px-1">
                  <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-success/40"></div>
                    <h2
                      class="text-sm font-bold uppercase tracking-widest text-text-secondary"
                    >
                      Performance Analysis
                    </h2>
                  </div>
                </div>

                <PerformanceSummary />

                <div class="space-y-6 pt-4">
                  <div class="flex items-center gap-2 px-1">
                    <div class="w-1.5 h-1.5 rounded-full bg-primary/30"></div>
                    <h2
                      class="text-sm font-bold uppercase tracking-widest text-text-secondary"
                    >
                      Power Curve
                    </h2>
                  </div>
                  <PowerGraph />
                </div>
              </section>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- Upgrades Tab -->
    <section aria-labelledby="upgrades-heading" id="upgrades-panel">
      {#if calculatorState.activeTab === "upgrades"}
        <h2 id="upgrades-heading" class="sr-only">Upgrades</h2>
        <div class="space-y-6">
          <!-- Upgrade Simulator -->
          <UpgradeSimulator />

          <!-- Upgrade Comparison -->
          {#if simStats && calculatorState.upgradeDelta}
            <div class="space-y-4">
              <div class="flex items-center gap-2 mb-4">
                <span class="text-lg" aria-hidden="true">📊</span>
                <h3 class="text-h2 font-semibold text-text-primary">
                  Upgrade Comparison
                </h3>
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
            <div
              class="bg-bg-secondary rounded-xl p-12 border border-white/5 shadow-lg"
            >
              <div
                class="flex flex-col items-center justify-center text-center py-16"
              >
                <div class="text-6xl mb-4 animate-float" aria-hidden="true">
                  📊
                </div>
                <div class="text-h2 font-semibold text-text-primary mb-2">
                  No upgrade selected
                </div>
                <div class="text-body text-text-secondary">
                  Select an upgrade above to simulate its impact on your current
                  setup
                </div>
              </div>
            </div>
          {/if}

          <!-- Upgrade Guidance -->
          <UpgradeGuidance />
        </div>
      {/if}
    </section>

    <!-- Compare Tab -->
    <section aria-labelledby="compare-heading" id="compare-panel">
      {#if calculatorState.activeTab === "compare"}
        <h2 id="compare-heading" class="sr-only">Scooter Comparison</h2>
        <ScooterComparisonTable />
      {/if}
    </section>
  </div>
</div>
