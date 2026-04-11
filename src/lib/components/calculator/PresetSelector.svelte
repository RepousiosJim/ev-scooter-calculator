<script lang="ts">
  import type { ScooterConfig, PerformanceStats } from "$lib/types";
  import { calculatePerformance } from "$lib/physics";
  import { presets, presetMetadata } from "$lib/data/presets";
  import { calculatorState, loadPreset } from "$lib/stores/calculator.svelte";
  import BottomSheet from "$lib/components/ui/BottomSheet.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";
  import { speedVal, speedUnit, distanceVal, distanceUnit } from "$lib/utils/units";

  type Grade = "S" | "A" | "B" | "C" | "D" | "F";

  interface PresetOption {
    value: string;
    label: string;
    config: ScooterConfig;
    year: number;
    price?: number;
    batteryWh?: number;
    score: number;
    grade: Grade;
    stats: PerformanceStats;
  }

  function computeScore(config: ScooterConfig, stats: PerformanceStats): number {
    const accel = stats.accelScore;
    const strainPenalty = Math.max(0, (stats.cRate - 2.5) * 15);
    const efficiencyBonus = Math.max(0, (30 - config.style) * 0.5);
    const rangeBonus = Math.min(15, (stats.totalRange / 150) * 15);
    const speedBonus = Math.min(10, (stats.speed / 100) * 10);
    return Math.max(0, Math.min(100, accel - strainPenalty + efficiencyBonus + rangeBonus + speedBonus));
  }

  function getGrade(score: number): Grade {
    if (score >= 90) return "S";
    if (score >= 75) return "A";
    if (score >= 60) return "B";
    if (score >= 45) return "C";
    if (score >= 30) return "D";
    return "F";
  }

  const gradeBadgeColors: Record<Grade, string> = {
    S: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    B: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    C: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    D: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    F: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  };

  const scoreBarColor: Record<Grade, string> = {
    S: "bg-amber-400",
    A: "bg-emerald-400",
    B: "bg-blue-400",
    C: "bg-amber-400",
    D: "bg-orange-400",
    F: "bg-rose-400",
  };

  // Build enriched preset options with performance scores (computed once)
  const presetsList: PresetOption[] = Object.keys(presets)
    .filter((key) => key !== "custom")
    .map((key) => {
      const config = presets[key];
      const meta = presetMetadata[key];
      const stats = calculatePerformance(config, "spec");
      const score = computeScore(config, stats);
      return {
        value: key,
        label: meta?.name || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        config,
        year: meta?.year || 0,
        price: meta?.manufacturer?.price,
        batteryWh: meta?.manufacturer?.batteryWh,
        score,
        grade: getGrade(score),
        stats,
      };
    });

  type FilterKey = "all" | "budget" | "mid" | "premium" | "top-rated";
  type SortKey = "score" | "price" | "speed" | "range";

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "budget", label: "Budget" },
    { key: "mid", label: "Mid-Range" },
    { key: "premium", label: "Premium" },
    { key: "top-rated", label: "Top Rated" },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "score", label: "Score" },
    { key: "price", label: "Price" },
    { key: "speed", label: "Speed" },
    { key: "range", label: "Range" },
  ];

  let showPresetModal = $state(false);
  let modalTrigger: HTMLButtonElement;
  let searchQuery = $state("");
  let activeFilter = $state<FilterKey>("all");
  let sortBy = $state<SortKey>("score");

  const filteredPresets = $derived.by(() => {
    let results = [...presetsList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.value.toLowerCase().replace(/_/g, " ").includes(q),
      );
    }

    switch (activeFilter) {
      case "budget":
        results = results.filter((p) => p.price != null && p.price < 2000);
        break;
      case "mid":
        results = results.filter((p) => p.price != null && p.price >= 2000 && p.price < 4000);
        break;
      case "premium":
        results = results.filter((p) => p.price != null && p.price >= 4000);
        break;
      case "top-rated":
        results = results.filter((p) => p.grade === "S" || p.grade === "A");
        break;
    }

    switch (sortBy) {
      case "price":
        results.sort((a, b) => (a.price ?? 9999) - (b.price ?? 9999));
        break;
      case "speed":
        results.sort((a, b) => b.stats.speed - a.stats.speed);
        break;
      case "range":
        results.sort((a, b) => b.stats.totalRange - a.stats.totalRange);
        break;
      default:
        results.sort((a, b) => b.score - a.score);
        break;
    }

    return results;
  });

  const selectedPreset = $derived.by(() =>
    presetsList.find((p) => p.value === calculatorState.activePresetKey),
  );

  function applyPreset(presetKey: string) {
    loadPreset(presetKey);
    showPresetModal = false;
    searchQuery = "";
    activeFilter = "all";
    modalTrigger?.focus();
  }

  function resetToManual() {
    applyPreset("custom");
  }

  function closeModal() {
    showPresetModal = false;
    searchQuery = "";
    activeFilter = "all";
    modalTrigger?.focus();
  }

  function formatPrice(price?: number): string {
    if (!price) return "—";
    return `$${price.toLocaleString()}`;
  }
</script>

<!-- Trigger Area -->
<div
  class="bg-gradient-to-br from-primary/[0.04] to-secondary/[0.04] border border-white/[0.08] p-4 mb-5"
>
  <div class="flex items-center justify-between mb-3">
    <div>
      <span class="text-xs font-bold text-primary uppercase tracking-[0.16em]">Quick Start</span>
      <p class="text-xs text-text-tertiary mt-0.5">Choose a scooter to prefill specs</p>
    </div>
    {#if calculatorState.activePresetKey !== "custom"}
      <button
        type="button"
        onclick={resetToManual}
        class="text-[10px] font-bold uppercase tracking-wider text-text-tertiary hover:text-text-primary transition-colors"
      >
        Clear
      </button>
    {/if}
  </div>

  <button
    type="button"
    bind:this={modalTrigger}
    onclick={() => (showPresetModal = true)}
    aria-expanded={showPresetModal}
    aria-haspopup="dialog"
    class="w-full bg-white/[0.02] border border-white/[0.06] p-3 text-left hover:border-white/15 focus:border-primary focus:outline-none transition-all duration-300"
  >
    {#if selectedPreset}
      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center justify-center w-8 h-8 text-xs font-black border flex-shrink-0 {gradeBadgeColors[selectedPreset.grade]}"
        >
          {selectedPreset.grade}
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-text-primary truncate">
            {selectedPreset.label}
          </div>
          <div class="text-xs text-text-tertiary mt-0.5">
            {Math.round(speedVal(selectedPreset.stats.speed))} {speedUnit()}
            &middot; {Math.round(distanceVal(selectedPreset.stats.totalRange))} {distanceUnit()}
            &middot; {formatPrice(selectedPreset.price)}
          </div>
        </div>
        <span class="text-text-tertiary text-lg leading-none">&#9662;</span>
      </div>
    {:else}
      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center justify-center w-8 h-8 border border-white/[0.06]"
        >
          <Icon name="settings" size="sm" class="text-text-tertiary" />
        </span>
        <div class="flex-1">
          <div class="text-sm font-semibold text-text-primary">Manual Entry</div>
          <div class="text-xs text-text-tertiary mt-0.5">Custom configuration</div>
        </div>
        <span class="text-text-tertiary text-lg leading-none">&#9662;</span>
      </div>
    {/if}
  </button>
</div>

<!-- Preset Picker Modal -->
<BottomSheet
  bind:isOpen={showPresetModal}
  title="Choose a Scooter"
  onClose={closeModal}
  height="large"
>
  {#snippet children()}
    <!-- Search & Filters (sticky within scroll area) -->
    <div class="sticky top-0 z-10 bg-bg-primary -mx-6 px-6 pb-3 space-y-3 border-b border-white/[0.06]">
      <!-- Search -->
      <input
        type="search"
        placeholder="Search scooters..."
        bind:value={searchQuery}
        class="w-full bg-white/[0.03] border border-white/[0.06] px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none transition-colors"
      />

      <!-- Filter chips -->
      <div class="flex flex-wrap gap-1.5">
        {#each filters as filter}
          <button
            type="button"
            onclick={() => (activeFilter = filter.key)}
            class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all duration-200
              {activeFilter === filter.key
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-white/[0.02] text-text-tertiary border-white/[0.06] hover:border-white/15 hover:text-text-secondary'}"
          >
            {filter.label}
          </button>
        {/each}
      </div>

      <!-- Sort + count -->
      <div class="flex items-center justify-between">
        <span class="text-[10px] text-text-tertiary font-medium">
          {filteredPresets.length} scooter{filteredPresets.length !== 1 ? "s" : ""}
        </span>
        <div class="flex gap-1">
          {#each sortOptions as opt}
            <button
              type="button"
              onclick={() => (sortBy = opt.key)}
              class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200
                {sortBy === opt.key
                ? 'text-primary'
                : 'text-text-tertiary hover:text-text-secondary'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="space-y-3 pt-4 pb-6">
      <!-- Manual Entry (pinned, hidden during search) -->
      {#if !searchQuery.trim()}
        <button
          type="button"
          onclick={() => applyPreset("custom")}
          class="flex items-center gap-3 w-full border p-3 text-left transition-all duration-300
            {calculatorState.activePresetKey === 'custom'
            ? 'border-primary/30 bg-primary/10'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:-translate-y-0.5'}"
        >
          <Icon
            name="settings"
            size="md"
            class={calculatorState.activePresetKey === "custom"
              ? "text-primary"
              : "text-text-tertiary"}
          />
          <div class="flex-1">
            <div class="text-sm font-semibold text-text-primary">Manual Entry</div>
            <div class="text-[11px] text-text-tertiary">Start from scratch with custom values</div>
          </div>
          {#if calculatorState.activePresetKey === "custom"}
            <span class="text-[10px] text-primary font-bold uppercase tracking-wider">Active</span>
          {/if}
        </button>
      {/if}

      <!-- Preset Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {#each filteredPresets as preset (preset.value)}
          <button
            type="button"
            onclick={() => applyPreset(preset.value)}
            class="group border p-3 text-left transition-all duration-300
              {preset.value === calculatorState.activePresetKey
              ? 'border-primary/30 bg-primary/10'
              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:-translate-y-0.5'}"
          >
            <!-- Header: grade badge + name + score -->
            <div class="flex items-center gap-2.5 mb-2">
              <span
                class="inline-flex items-center justify-center w-7 h-7 text-[10px] font-black border flex-shrink-0 {gradeBadgeColors[preset.grade]}"
              >
                {preset.grade}
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-text-primary leading-tight truncate">
                  {preset.label}
                </div>
                <div class="text-[10px] text-text-tertiary">{preset.year}</div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="text-sm font-black text-primary font-data">
                  {Math.round(preset.score)}
                </span>
                <span class="text-[10px] text-text-tertiary">/100</span>
              </div>
            </div>

            <!-- Score bar -->
            <div class="h-1 w-full bg-white/5 overflow-hidden mb-2">
              <div
                class="h-full transition-all duration-500 {scoreBarColor[preset.grade]}"
                style:width={`${preset.score}%`}
              ></div>
            </div>

            <!-- Quick stats -->
            <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
              <span>{Math.round(speedVal(preset.stats.speed))} {speedUnit()}</span>
              <span>{Math.round(distanceVal(preset.stats.totalRange))} {distanceUnit()}</span>
              <span>{Math.round(preset.stats.totalWatts)}W</span>
              {#if preset.price}
                <span class="text-text-tertiary">{formatPrice(preset.price)}</span>
              {/if}
            </div>

            {#if preset.value === calculatorState.activePresetKey}
              <div class="mt-2 text-[10px] text-primary font-bold uppercase tracking-wider">
                Active
              </div>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Empty state -->
      {#if filteredPresets.length === 0}
        <div class="text-center py-8">
          <p class="text-sm text-text-tertiary">No scooters match your search</p>
          <button
            type="button"
            onclick={() => {
              searchQuery = "";
              activeFilter = "all";
            }}
            class="mt-2 text-xs text-primary hover:underline transition-colors"
          >
            Clear filters
          </button>
        </div>
      {/if}
    </div>
  {/snippet}
</BottomSheet>
