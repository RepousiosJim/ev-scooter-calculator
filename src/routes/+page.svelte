<script lang="ts">
  import { onMount } from "svelte";
  import { fly, slide } from "svelte/transition";
  import {
    calculatorState,
    loadConfigFromUrl,
  } from "$lib/stores/calculator.svelte";
  import { uiState } from "$lib/stores/ui.svelte";
  import { analytics } from "$lib/utils/analytics";
  import {
    initBehaviorTracking,
    trackWebVitals,
    startSession,
    initAllABTests,
  } from "$lib/utils/analytics";

  // Components
  import AppHeader from "$lib/components/ui/AppHeader.svelte";
  import PresetSelector from "$lib/components/calculator/PresetSelector.svelte";
  import BasicConfig from "$lib/components/calculator/BasicConfig.svelte";
  import AdvancedConfig from "$lib/components/calculator/AdvancedConfig.svelte";
  import PowerGraph from "$lib/components/calculator/PowerGraph.svelte";
  import UpgradeSimulator from "$lib/components/calculator/UpgradeSimulator.svelte";
  import ComparisonDisplay from "$lib/components/calculator/ComparisonDisplay.svelte";
  import ComparisonSummary from "$lib/components/calculator/ComparisonSummary.svelte";
  import PerformanceSummary from "$lib/components/calculator/PerformanceSummary.svelte";
  import EfficiencyPanel from "$lib/components/calculator/EfficiencyPanel.svelte";
  import ComponentHealthPanel from "$lib/components/calculator/ComponentHealthPanel.svelte";
  import BottleneckPanel from "$lib/components/calculator/BottleneckPanel.svelte";
  import SectionDivider from "$lib/components/ui/SectionDivider.svelte";
  import RideModeSelector from "$lib/components/calculator/RideModeSelector.svelte";
  import ScooterComparisonTable from "$lib/components/calculator/ScooterComparisonTable.svelte";
  import ShareButton from "$lib/components/ui/ShareButton.svelte";

  // New UI Components
  import VisualCRateIndicator from "$lib/components/ui/VisualCRateIndicator.svelte";
  import ComparisonDeltaCard from "$lib/components/ui/ComparisonDeltaCard.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";
  import { distanceVal, speedVal, distanceUnit, speedUnit, costPer100Val, costDistanceLabel } from "$lib/utils/units";

  const stats = $derived(calculatorState.stats);
  const simStats = $derived(calculatorState.simStats);

  onMount(() => {
    loadConfigFromUrl();

    startSession();
    const cleanupBehaviorTracking = initBehaviorTracking();
    const cleanupWebVitals = trackWebVitals();
    initAllABTests();

    analytics.startFunnel("configuration_flow", "page_load");

    const handleBeforeUnload = () => {
      analytics.endSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Clean up analytics listeners and intervals
      cleanupBehaviorTracking();
      cleanupWebVitals();
    };
  });

  let showDetailedAnalysis = $state(false);
  let showAdvancedConfig = $state(false);
  let hasInteracted = $state(false);

  $effect(() => {
    if (calculatorState.activePresetKey !== 'custom') {
      hasInteracted = true;
    }
  });

</script>

<svelte:head>
  <title>EV Scooter Pro Calculator v2.0</title>
  <meta
    name="description"
    content="Performance analysis, hardware compatibility, and upgrade simulation for electric scooters"
  />
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <!-- Decorative background elements -->
  <div class="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl pointer-events-none" aria-hidden="true"></div>
  <div class="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-secondary/3 blur-3xl pointer-events-none" aria-hidden="true"></div>

  <div class="relative">
    <AppHeader />

    <div class="max-w-7xl mx-auto px-3 sm:px-4 pt-6 lg:pt-8 pb-20 lg:pb-16">
      <!-- Calculator Tab -->
      <div
        aria-labelledby="configuration-heading"
        id="configuration-panel"
        role="tabpanel"
        aria-hidden={uiState.activeTab !== "configuration"}
        tabindex={uiState.activeTab === "configuration" ? 0 : -1}
      >
        {#if uiState.activeTab === "configuration"}
          <h2 id="configuration-heading" class="sr-only">
            Calculator
          </h2>

          {#if calculatorState.activePresetKey === 'custom' && !hasInteracted}
            <div class="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3 animate-fadeIn">
              <span class="text-primary shrink-0 mt-0.5">💡</span>
              <div class="flex-1">
                <p class="text-sm font-bold text-text-primary">New here? Start with a preset</p>
                <p class="text-xs text-text-tertiary mt-1">Select a scooter model above to auto-fill specs, then tweak to match your setup.</p>
              </div>
              <button type="button" onclick={() => hasInteracted = true} class="text-text-tertiary hover:text-text-primary shrink-0 text-lg leading-none" aria-label="Dismiss">✕</button>
            </div>
          {/if}

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8 lg:gap-12">
            <!-- Left Column: Configuration -->
            <div class="lg:col-span-5 space-y-6 min-w-0">
              <div class="space-y-5">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-1 h-1 rounded-full bg-primary/50" aria-hidden="true"></div>
                  <h3
                    class="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]"
                  >
                    Configuration
                  </h3>
                  <div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>
                <PresetSelector />
                <RideModeSelector />
                <BasicConfig />
              </div>

              <!-- Collapsible Advanced Config -->
              <div class="border-t border-white/5 pt-4">
                <button
                  type="button"
                  onclick={() => (showAdvancedConfig = !showAdvancedConfig)}
                  class="w-full py-3 px-4 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 flex items-center justify-between group"
                >
                  <div class="flex items-center gap-3">
                    <Icon
                      name="settings"
                      size="md"
                      class="text-secondary group-hover:scale-110 transition-transform"
                    />
                    <span
                      class="text-xs font-bold uppercase tracking-[0.16em] text-text-primary"
                    >
                      Advanced Parameters
                    </span>
                  </div>
                  <span
                    class="text-text-tertiary transition-transform duration-300"
                    style:transform={showAdvancedConfig
                      ? "rotate(180deg)"
                      : ""}
                  >
                    ▼
                  </span>
                </button>

                {#if showAdvancedConfig}
                  <div transition:slide={{ duration: 300 }} class="mt-6 space-y-8">
                    <AdvancedConfig />
                  </div>
                {/if}
              </div>
            </div>

            <!-- Right Column: Results -->
            <div class="lg:col-span-7 space-y-6 min-w-0">
              <div
                class="bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 lg:p-6 shadow-2xl shadow-black/10"
              >
                <div class="mb-6 flex items-center justify-between gap-4">
                  <h3 class="text-xl font-black text-text-primary tracking-tight">
                    Performance Analysis
                  </h3>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <!-- Unit Toggle -->
                    <button
                      type="button"
                      onclick={() => uiState.unitSystem = uiState.unitSystem === 'metric' ? 'imperial' : 'metric'}
                      class="px-3 py-1.5 border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider"
                      aria-label="Toggle units between metric and imperial"
                    >
                      {uiState.unitSystem === 'metric' ? 'km/kg' : 'mi/lbs'}
                    </button>
                    <ShareButton />
                  </div>
                </div>

                <div class="space-y-6">
                  <PerformanceSummary />

                  <SectionDivider icon="efficiency" label="Efficiency & Health" />
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EfficiencyPanel />
                    <ComponentHealthPanel />
                  </div>

                  <VisualCRateIndicator value={stats.cRate} />

                  <!-- Detailed Analysis Toggle -->
                  <div class="pt-2">
                    <button
                      type="button"
                      onclick={() =>
                        (showDetailedAnalysis = !showDetailedAnalysis)}
                      class="w-full py-3 px-4 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 flex items-center justify-between group"
                    >
                      <div class="flex items-center gap-2">
                        <Icon
                          name={showDetailedAnalysis ? "chart" : "efficiency"}
                          size="sm"
                          class="group-hover:scale-110 transition-transform"
                        />
                        <span
                          class="text-xs font-bold uppercase tracking-[0.12em] text-text-primary"
                        >
                          {showDetailedAnalysis
                            ? "Hide Detailed Analysis"
                            : "Show Detailed Analysis"}
                        </span>
                      </div>
                      <span
                        class="text-text-tertiary transition-transform duration-300"
                        style:transform={showDetailedAnalysis
                          ? "rotate(180deg)"
                          : ""}
                      >
                        ▼
                      </span>
                    </button>

                    {#if showDetailedAnalysis}
                      <div class="mt-6 space-y-6 animate-fadeIn">
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
      </div>

      <!-- Upgrades Tab -->
      <div aria-labelledby="upgrades-heading" id="upgrades-panel" role="tabpanel">
        {#if uiState.activeTab === "upgrades"}
          <h2 id="upgrades-heading" class="sr-only">Upgrades</h2>
          <div class="space-y-6 md:space-y-8">
            <!-- Upgrade Simulator -->
            <UpgradeSimulator />

            <!-- Upgrade Comparison -->
            {#if simStats && calculatorState.upgradeDelta}
              <div id="upgrade-comparison-results" class="space-y-6">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-1 h-1 rounded-full bg-primary/50" aria-hidden="true"></div>
                  <h3 class="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">
                    Upgrade Comparison
                  </h3>
                  <div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
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
                    label={"Cost " + costDistanceLabel()}
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

                <ComparisonSummary />
                <ComparisonDisplay />
              </div>
            {:else}
              <div
                class="bg-white/[0.02] border border-white/[0.06] p-5 sm:p-6 md:p-10"
              >
                <div
                  class="flex flex-col items-center justify-center text-center py-8 md:py-12"
                >
                  <div class="text-5xl mb-4 opacity-30" aria-hidden="true">
                    +
                  </div>
                  <div class="text-lg font-bold text-text-primary mb-2">
                    No upgrade selected
                  </div>
                  <div class="text-sm text-text-tertiary">
                    Select an upgrade above to simulate its impact on your current
                    setup
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Compare Tab -->
      <div aria-labelledby="compare-heading" id="compare-panel" role="tabpanel">
        {#if uiState.activeTab === "compare"}
          <h2 id="compare-heading" class="sr-only">Scooter Comparison</h2>
          <ScooterComparisonTable />
        {/if}
      </div>
    </div>
  </div>
</div>
