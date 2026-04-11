<script lang="ts">
  import { presets, presetMetadata } from '$lib/data/presets';
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { calculatePerformance } from '$lib/physics';
  import { computeScore, getGrade, getGradeInfo } from '$lib/utils/scoring';
  import { speedVal, speedUnit, distanceVal, distanceUnit, weightVal, weightUnit, costPer100Val, costDistanceLabel } from '$lib/utils/units';
  import type { ScooterConfig, PerformanceStats } from '$lib/types';

  // --- Types ---
  interface ScooterEntry {
    id: string;
    name: string;
    year: number;
    config: ScooterConfig;
    meta: (typeof presetMetadata)[string] | undefined;
    score: number;
    grade: ReturnType<typeof getGradeInfo>;
    stats: PerformanceStats;
  }

  // --- State ---
  let searchQuery = $state('');
  let selectedIds = $state<string[]>([]);

  // --- Build full catalog (exclude 'custom') ---
  const catalog: ScooterEntry[] = Object.entries(presets)
    .filter(([key]) => key !== 'custom')
    .map(([key, config]) => {
      const meta = presetMetadata[key];
      const stats = calculatePerformance(config, 'spec');
      const score = computeScore(config, stats);
      const grade = getGradeInfo(score);
      return {
        id: key,
        name: meta?.name || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        year: meta?.year || 0,
        config,
        meta,
        score,
        grade,
        stats,
      };
    })
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

  // --- Auto-select the active preset if it's not custom ---
  const activeKey = $derived(calculatorState.activePresetKey);

  $effect(() => {
    if (activeKey && activeKey !== 'custom' && !selectedIds.includes(activeKey)) {
      if (selectedIds.length < 3) {
        selectedIds = [...selectedIds, activeKey];
      }
    }
  });

  // --- Filtered catalog for the picker ---
  const filteredCatalog = $derived(
    catalog.filter((s) => {
      if (selectedIds.includes(s.id)) return false;
      if (!searchQuery) return true;
      return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
  );

  // --- Selected scooter entries (preserve selection order) ---
  const selectedScooters = $derived(
    selectedIds
      .map((id) => catalog.find((s) => s.id === id))
      .filter((s): s is ScooterEntry => !!s)
  );

  // --- Add / Remove ---
  function addScooter(id: string) {
    if (selectedIds.length >= 3 || selectedIds.includes(id)) return;
    selectedIds = [...selectedIds, id];
  }

  function removeScooter(id: string) {
    selectedIds = selectedIds.filter((sid) => sid !== id);
  }

  // --- Comparison rows definition ---
  type ComparisonRow = {
    label: string;
    unit?: string;
    section: 'specs' | 'calculated';
    getValue: (entry: ScooterEntry) => number | string;
    getNumeric: (entry: ScooterEntry) => number;
    format: (entry: ScooterEntry) => string;
    higherIsBetter: boolean;
  };

  const comparisonRows: ComparisonRow[] = [
    // Specs section
    {
      label: 'Top Speed',
      section: 'specs',
      getValue: (e) => e.meta?.manufacturer?.topSpeed ?? 0,
      getNumeric: (e) => e.meta?.manufacturer?.topSpeed ?? 0,
      format: (e) => `${Math.round(speedVal(e.meta?.manufacturer?.topSpeed ?? 0))} ${speedUnit()}`,
      higherIsBetter: true,
    },
    {
      label: 'Range',
      section: 'specs',
      getValue: (e) => e.meta?.manufacturer?.range ?? 0,
      getNumeric: (e) => e.meta?.manufacturer?.range ?? 0,
      format: (e) => `${Math.round(distanceVal(e.meta?.manufacturer?.range ?? 0))} ${distanceUnit()}`,
      higherIsBetter: true,
    },
    {
      label: 'Battery',
      section: 'specs',
      getValue: (e) => e.meta?.manufacturer?.batteryWh ?? e.config.v * e.config.ah,
      getNumeric: (e) => e.meta?.manufacturer?.batteryWh ?? e.config.v * e.config.ah,
      format: (e) => `${Math.round(e.meta?.manufacturer?.batteryWh ?? e.config.v * e.config.ah)} Wh`,
      higherIsBetter: true,
    },
    {
      label: 'Weight',
      section: 'specs',
      getValue: (e) => e.config.scooterWeight ?? 0,
      getNumeric: (e) => e.config.scooterWeight ?? 0,
      format: (e) => `${Math.round(weightVal(e.config.scooterWeight ?? 0))} ${weightUnit()}`,
      higherIsBetter: false,
    },
    {
      label: 'Price',
      section: 'specs',
      getValue: (e) => e.meta?.manufacturer?.price ?? 0,
      getNumeric: (e) => e.meta?.manufacturer?.price ?? 0,
      format: (e) => {
        const price = e.meta?.manufacturer?.price;
        return price ? `$${price.toLocaleString()}` : '--';
      },
      higherIsBetter: false,
    },
    // Calculated section
    {
      label: 'Calc. Top Speed',
      section: 'calculated',
      getValue: (e) => e.stats.speed,
      getNumeric: (e) => e.stats.speed,
      format: (e) => `${Math.round(speedVal(e.stats.speed))} ${speedUnit()}`,
      higherIsBetter: true,
    },
    {
      label: 'Calc. Range',
      section: 'calculated',
      getValue: (e) => e.stats.totalRange,
      getNumeric: (e) => e.stats.totalRange,
      format: (e) => `${Math.round(distanceVal(e.stats.totalRange))} ${distanceUnit()}`,
      higherIsBetter: true,
    },
    {
      label: 'Accel. Score',
      section: 'calculated',
      getValue: (e) => e.stats.accelScore,
      getNumeric: (e) => e.stats.accelScore,
      format: (e) => `${Math.round(e.stats.accelScore)}/100`,
      higherIsBetter: true,
    },
    {
      label: 'C-Rate',
      section: 'calculated',
      getValue: (e) => e.stats.cRate,
      getNumeric: (e) => e.stats.cRate,
      format: (e) => `${e.stats.cRate.toFixed(2)}C`,
      higherIsBetter: false,
    },
    {
      label: `Cost ${costDistanceLabel()}`,
      section: 'calculated',
      getValue: (e) => e.stats.costPer100km,
      getNumeric: (e) => e.stats.costPer100km,
      format: (e) => `$${costPer100Val(e.stats.costPer100km).toFixed(2)}`,
      higherIsBetter: false,
    },
    {
      label: 'Charge Time',
      section: 'calculated',
      getValue: (e) => e.stats.chargeTime,
      getNumeric: (e) => e.stats.chargeTime,
      format: (e) => `${e.stats.chargeTime.toFixed(1)}h`,
      higherIsBetter: false,
    },
  ];

  // --- Find best value per row ---
  function bestIndex(row: ComparisonRow, entries: ScooterEntry[]): number {
    if (entries.length < 2) return -1;
    let bestIdx = 0;
    let bestVal = row.getNumeric(entries[0]);
    for (let i = 1; i < entries.length; i++) {
      const v = row.getNumeric(entries[i]);
      if (row.higherIsBetter ? v > bestVal : (v < bestVal && v > 0)) {
        bestVal = v;
        bestIdx = i;
      }
    }
    // Don't highlight if all values are the same
    const allSame = entries.every((e) => row.getNumeric(e) === bestVal);
    if (allSame) return -1;
    // Don't highlight if value is 0 (missing data)
    if (bestVal === 0) return -1;
    return bestIdx;
  }

  // Grade badge color helper
  function gradeColorClass(color: string): string {
    // Map hex colors from getGradeInfo to tailwind-ish inline styles
    return color;
  }
</script>

<div class="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-5 lg:p-6 shadow-2xl shadow-black/10 space-y-5 sm:space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <h2 class="text-xl font-black text-text-primary tracking-tight">Compare Scooters</h2>
    <span class="text-xs text-text-tertiary">{selectedIds.length}/3 selected</span>
  </div>

  <!-- Scooter Picker -->
  <div class="space-y-3">
    <!-- Search -->
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search models..."
        class="bg-white/[0.03] border border-white/[0.06] py-2 pl-3 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none w-full transition-colors"
        aria-label="Search scooters to compare"
      />
      {#if searchQuery}
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
          onclick={() => (searchQuery = '')}
          aria-label="Clear search"
        >
          &#10005;
        </button>
      {/if}
    </div>

    <!-- Selected Pills -->
    {#if selectedIds.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each selectedScooters as scooter (scooter.id)}
          <button
            class="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-3 py-1.5 hover:bg-primary/25 transition-colors group"
            onclick={() => removeScooter(scooter.id)}
            aria-label="Remove {scooter.name} from comparison"
          >
            <span
              class="inline-flex items-center justify-center w-4 h-4 text-[9px] font-black rounded-sm"
              style="background-color: {scooter.grade.color}20; color: {scooter.grade.color}"
            >
              {scooter.grade.grade}
            </span>
            {scooter.name}
            <span class="text-primary/60 group-hover:text-primary ml-1">&#10005;</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Available Scooters Grid -->
    <div class="max-h-52 overflow-y-auto border border-white/[0.06] bg-white/[0.01]">
      {#if filteredCatalog.length === 0}
        <div class="p-6 text-center text-text-tertiary text-sm">
          {#if selectedIds.length >= 3}
            Maximum 3 scooters selected. Remove one to add another.
          {:else}
            No scooters match your search.
          {/if}
        </div>
      {:else}
        <div class="divide-y divide-white/[0.04]">
          {#each filteredCatalog as scooter (scooter.id)}
            <button
              class="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
              onclick={() => addScooter(scooter.id)}
              disabled={selectedIds.length >= 3}
              aria-label="Add {scooter.name} to comparison"
            >
              <span
                class="inline-flex items-center justify-center w-5 h-5 text-[9px] font-black rounded-sm shrink-0"
                style="background-color: {scooter.grade.color}20; color: {scooter.grade.color}"
              >
                {scooter.grade.grade}
              </span>
              <span class="flex-1 min-w-0">
                <span class="text-sm text-text-primary font-medium truncate block group-hover:text-primary transition-colors">
                  {scooter.name}
                </span>
              </span>
              <span class="text-[10px] text-text-tertiary font-mono shrink-0">{scooter.year}</span>
              <span class="text-[10px] text-text-tertiary font-mono shrink-0 w-10 text-right">{scooter.score.toFixed(0)}pt</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Comparison Table (2+ selected) -->
  {#if selectedScooters.length >= 2}
    <div class="overflow-x-auto -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6">
      <table class="w-full text-left border-collapse min-w-[480px]">
        <!-- Column Headers -->
        <thead>
          <tr class="border-b border-white/[0.08]">
            <th class="p-3 text-[10px] font-bold uppercase tracking-widest text-text-tertiary w-36 sm:w-44"></th>
            {#each selectedScooters as scooter, idx (scooter.id)}
              <th class="p-3 text-center min-w-[140px]">
                <div class="space-y-1.5">
                  <div class="text-sm font-bold text-text-primary leading-snug">{scooter.name}</div>
                  <div class="flex items-center justify-center gap-2">
                    <span
                      class="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-sm"
                      style="background-color: {scooter.grade.color}20; color: {scooter.grade.color}"
                    >
                      {scooter.grade.grade}
                    </span>
                    <span class="text-xs text-text-secondary font-mono">{scooter.score.toFixed(1)}</span>
                  </div>
                  {#if scooter.id === activeKey}
                    <span class="text-[9px] font-bold text-primary uppercase tracking-widest">Active</span>
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>

        <tbody>
          <!-- Specs Section Header -->
          <tr>
            <td colspan={selectedScooters.length + 1} class="pt-4 pb-1 px-3">
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Manufacturer Specs</span>
                <div class="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
              </div>
            </td>
          </tr>

          {#each comparisonRows.filter((r) => r.section === 'specs') as row}
            {@const best = bestIndex(row, selectedScooters)}
            <tr class="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              <td class="p-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">{row.label}</td>
              {#each selectedScooters as scooter, idx (scooter.id)}
                <td
                  class="p-3 text-center text-sm font-mono {idx === best ? 'text-primary font-bold bg-primary/10' : 'text-text-primary'}"
                >
                  {row.format(scooter)}
                </td>
              {/each}
            </tr>
          {/each}

          <!-- Calculated Section Header -->
          <tr>
            <td colspan={selectedScooters.length + 1} class="pt-5 pb-1 px-3">
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Calculated Performance</span>
                <div class="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
              </div>
            </td>
          </tr>

          {#each comparisonRows.filter((r) => r.section === 'calculated') as row}
            {@const best = bestIndex(row, selectedScooters)}
            <tr class="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              <td class="p-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">{row.label}</td>
              {#each selectedScooters as scooter, idx (scooter.id)}
                <td
                  class="p-3 text-center text-sm font-mono {idx === best ? 'text-primary font-bold bg-primary/10' : 'text-text-primary'}"
                >
                  {row.format(scooter)}
                </td>
              {/each}
            </tr>
          {/each}

          <!-- Overall Score Row -->
          <tr class="border-t border-white/[0.08]">
            <td class="p-3 text-xs font-black text-text-primary uppercase tracking-wider">Overall Score</td>
            {#each selectedScooters as scooter, idx (scooter.id)}
              {@const isBest = selectedScooters.every((s) => s.score <= scooter.score)}
              {@const allSame = selectedScooters.every((s) => s.score === scooter.score)}
              <td class="p-3 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="text-lg font-black font-mono {isBest && !allSame ? 'text-primary' : 'text-text-primary'}"
                  >
                    {scooter.score.toFixed(1)}
                  </span>
                  <span
                    class="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-black rounded-sm"
                    style="background-color: {scooter.grade.color}25; color: {scooter.grade.color}"
                  >
                    {scooter.grade.grade} &mdash; {scooter.grade.label}
                  </span>
                </div>
              </td>
            {/each}
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-[10px] text-text-tertiary">
      Calculated values use each scooter's default config with spec mode physics. Best value per row highlighted in cyan.
    </p>
  {:else}
    <!-- Empty state -->
    <div class="py-12 text-center space-y-3 border border-dashed border-white/[0.08]">
      <div class="text-text-tertiary text-sm">Select at least 2 scooters to compare</div>
      <div class="text-text-tertiary text-xs">
        {#if selectedIds.length === 0}
          Click any scooter above to start
        {:else}
          Pick one more scooter to see the comparison
        {/if}
      </div>
    </div>
  {/if}
</div>
