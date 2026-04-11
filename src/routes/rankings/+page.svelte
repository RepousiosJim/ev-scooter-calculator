<script lang="ts">
  import { calculatePerformance } from "$lib/physics";
  import { presets, presetMetadata, CATALOG_VERSION, CATALOG_LAST_UPDATED } from "$lib/data/presets";
  import type { ScooterConfig, PerformanceStats, PresetMetadata } from "$lib/types";
  import { computeScore, getGrade, type Grade } from "$lib/utils/scoring";
  import AppHeader from "$lib/components/ui/AppHeader.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";
  import { distanceVal, speedVal, distanceUnit, speedUnit } from "$lib/utils/units";
  import { uiState } from "$lib/stores/ui.svelte";
  import { goto } from '$app/navigation';
  import { loadPreset } from '$lib/stores/calculator.svelte';

  interface RankedScooter {
    key: string;
    name: string;
    year: number;
    config: ScooterConfig;
    stats: PerformanceStats;
    score: number;
    grade: Grade;
    price?: number;
    batteryWh?: number;
    status?: 'current' | 'discontinued' | 'upcoming' | 'unverified';
    hasPriceHistory?: boolean;
    priceChange?: number; // percentage change from first to current price
  }

  const tierMeta: Record<Grade, { label: string; color: string; bar: string; bg: string; border: string }> = {
    S: { label: "Elite", color: "text-amber-300", bar: "bg-amber-400", bg: "bg-amber-500/[0.06]", border: "border-amber-500/25" },
    A: { label: "Excellent", color: "text-emerald-400", bar: "bg-emerald-400", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/25" },
    B: { label: "Good", color: "text-blue-400", bar: "bg-blue-400", bg: "bg-blue-500/[0.04]", border: "border-blue-500/20" },
    C: { label: "Average", color: "text-amber-400", bar: "bg-amber-400", bg: "bg-white/[0.02]", border: "border-white/[0.06]" },
    D: { label: "Below Avg", color: "text-orange-400", bar: "bg-orange-400", bg: "bg-white/[0.02]", border: "border-white/[0.06]" },
    F: { label: "Poor", color: "text-rose-400", bar: "bg-rose-400", bg: "bg-white/[0.02]", border: "border-white/[0.06]" },
  };

  const badgeColors: Record<Grade, string> = {
    S: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    B: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    D: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    F: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  // Compute all rankings
  const ranked: RankedScooter[] = $derived.by(() => {
    const entries = Object.entries(presets)
      .filter(([key]) => key !== "custom")
      .map(([key, config]) => {
        const stats = calculatePerformance(config, "spec");
        const meta = presetMetadata[key];
        const score = computeScore(config, stats);
        return {
          key,
          name: meta?.name ?? key,
          year: meta?.year ?? 0,
          config,
          stats,
          score,
          grade: getGrade(score),
          price: meta?.manufacturer?.price,
          batteryWh: meta?.manufacturer?.batteryWh,
          status: meta?.status,
          hasPriceHistory: !!(meta?.priceHistory && meta.priceHistory.length > 0),
          priceChange: meta?.priceHistory && meta.priceHistory.length >= 2
            ? ((meta.manufacturer?.price ?? meta.priceHistory[meta.priceHistory.length - 1].price) - meta.priceHistory[0].price) / meta.priceHistory[0].price * 100
            : undefined,
        };
      });
    entries.sort((a, b) => b.score - a.score);
    return entries;
  });

  // Group by tier
  const tiers = $derived.by(() => {
    const groups: Record<Grade, RankedScooter[]> = { S: [], A: [], B: [], C: [], D: [], F: [] };
    for (const s of ranked) groups[s.grade].push(s);
    return groups;
  });

  const tierOrder: Grade[] = ["S", "A", "B", "C", "D", "F"];

  let sortBy = $state<"score" | "price" | "speed" | "range">("score");
  let searchQuery = $state("");

  const filteredRanked = $derived(
    ranked.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTiers = $derived.by(() => {
    const groups: Record<Grade, RankedScooter[]> = { S: [], A: [], B: [], C: [], D: [], F: [] };
    for (const s of filteredRanked) groups[s.grade].push(s);
    return groups;
  });

  function sortedTier(scooters: RankedScooter[]): RankedScooter[] {
    const copy = [...scooters];
    switch (sortBy) {
      case "price": return copy.sort((a, b) => (a.price ?? 99999) - (b.price ?? 99999));
      case "speed": return copy.sort((a, b) => b.stats.speed - a.stats.speed);
      case "range": return copy.sort((a, b) => b.stats.totalRange - a.stats.totalRange);
      default: return copy.sort((a, b) => b.score - a.score);
    }
  }

  function formatPrice(price?: number): string {
    if (!price) return "—";
    return `$${price.toLocaleString()}`;
  }

  // Summary stats — react to filtered results when searching
  const displayRanked = $derived(searchQuery ? filteredRanked : ranked);
  const topScore = $derived(displayRanked[0]?.score ?? 0);
  const avgScore = $derived(displayRanked.length ? displayRanked.reduce((s, r) => s + r.score, 0) / displayRanked.length : 0);
  const sCount = $derived(displayRanked.filter(s => s.grade === 'S').length);

  // Data Audit
  let auditOpen = $state(false);

  function daysSince(dateStr?: string): number {
    if (!dateStr) return Infinity;
    const then = new Date(dateStr).getTime();
    const now = Date.now();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  interface AuditEntry {
    key: string;
    name: string;
    meta: PresetMetadata;
    daysSinceVerified: number;
    hasSourceUrl: boolean;
    isStale: boolean;
  }

  const auditData = $derived.by(() => {
    const entries: AuditEntry[] = Object.entries(presetMetadata).map(([key, meta]) => {
      const days = daysSince(meta.lastVerified);
      return {
        key,
        name: meta.name,
        meta,
        daysSinceVerified: days,
        hasSourceUrl: !!meta.sourceUrl,
        isStale: days > 90,
      };
    });
    return entries;
  });

  const auditStats = $derived.by(() => {
    const total = auditData.length;
    const current = auditData.filter(e => e.meta.status === 'current').length;
    const discontinued = auditData.filter(e => e.meta.status === 'discontinued').length;
    const unverified = auditData.filter(e => e.meta.status === 'unverified').length;
    const upcoming = auditData.filter(e => e.meta.status === 'upcoming').length;
    const missingUrl = auditData.filter(e => !e.hasSourceUrl).length;
    const stale = auditData.filter(e => e.isStale).length;
    const fresh = auditData.filter(e => e.daysSinceVerified <= 30).length;
    const avgDays = total > 0 ? Math.round(auditData.reduce((s, e) => s + (e.daysSinceVerified === Infinity ? 365 : e.daysSinceVerified), 0) / total) : 0;
    const withPrice = auditData.filter(e => e.meta.manufacturer?.price).length;
    const withPriceHistory = auditData.filter(e => e.meta.priceHistory && e.meta.priceHistory.length > 0).length;
    return { total, current, discontinued, unverified, upcoming, missingUrl, stale, fresh, avgDays, withPrice, withPriceHistory };
  });

  const staleEntries = $derived(
    auditData.filter(e => e.isStale).sort((a, b) => b.daysSinceVerified - a.daysSinceVerified)
  );
  const missingUrlEntries = $derived(auditData.filter(e => !e.hasSourceUrl));
  const discontinuedEntries = $derived(auditData.filter(e => e.meta.status === 'discontinued'));

  function freshnessColor(days: number): string {
    if (days <= 30) return "text-emerald-400";
    if (days <= 90) return "text-amber-400";
    if (days <= 180) return "text-orange-400";
    return "text-rose-400";
  }

  function freshnessLabel(days: number): string {
    if (days <= 30) return "Fresh";
    if (days <= 90) return "OK";
    if (days <= 180) return "Stale";
    return "Outdated";
  }

  function freshnessBar(days: number): number {
    // Inverse: 0 days = 100%, 365+ = 0%
    return Math.max(0, Math.min(100, 100 - (days / 365) * 100));
  }

  function loadPresetAndNavigate(key: string) {
    loadPreset(key);
    goto('/');
  }

  const catalogDaysAgo = $derived(daysSince(CATALOG_LAST_UPDATED));
</script>

<svelte:head>
  <title>Power Rankings — EV Scooter Pro Calculator</title>
  <meta name="description" content="Tiered performance rankings for electric scooters based on physics-based analysis" />
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <div class="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl pointer-events-none" aria-hidden="true"></div>
  <div class="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-secondary/3 blur-3xl pointer-events-none" aria-hidden="true"></div>

  <div class="relative">
    <AppHeader />

    <div class="max-w-7xl mx-auto px-3 sm:px-4 pt-6 lg:pt-8 pb-8">
      <!-- Page Header -->
      <div class="mb-6 lg:mb-8">
        <h1 class="text-xl font-black text-text-primary tracking-tight">
          Power Rankings
        </h1>
        <p class="text-xs text-text-tertiary mt-1">
          {ranked.length} scooters ranked by composite performance score
        </p>
      </div>

      <!-- Controls Bar -->
      <div class="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Search -->
        <div class="relative">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search models..."
            class="bg-white/[0.03] border border-white/[0.06] py-2 pl-3 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none w-full sm:w-56 transition-colors"
            aria-label="Filter scooters by name"
          />
          {#if searchQuery}
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary text-xs"
              onclick={() => searchQuery = ""}
              aria-label="Clear search"
            >✕</button>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          <!-- Unit toggle -->
          <button
            type="button"
            onclick={() => uiState.unitSystem = uiState.unitSystem === 'metric' ? 'imperial' : 'metric'}
            class="px-3 py-1.5 border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider"
            aria-label="Toggle units"
          >
            {uiState.unitSystem === 'metric' ? 'km' : 'mi'}
          </button>

          <!-- Sort pills -->
          <div class="flex gap-1.5">
            {#each [
              { value: "score", label: "Score" },
              { value: "speed", label: "Speed" },
              { value: "range", label: "Range" },
              { value: "price", label: "Price" },
            ] as opt}
              <button
                type="button"
                class="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all
                  {sortBy === opt.value
                    ? 'bg-primary/15 text-primary border-primary/25'
                    : 'bg-white/[0.02] text-text-tertiary border-white/[0.06] hover:border-white/10 hover:text-text-secondary'
                  }"
                onclick={() => sortBy = opt.value as typeof sortBy}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-4">
          <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Top Score</div>
          <div class="text-xl sm:text-2xl font-black text-amber-300 mt-1">{topScore.toFixed(1)}</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-4">
          <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Average</div>
          <div class="text-xl sm:text-2xl font-black text-text-primary mt-1">{avgScore.toFixed(1)}</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-4">
          <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">S-Tier</div>
          <div class="text-xl sm:text-2xl font-black text-amber-300 mt-1">{sCount}</div>
        </div>
      </div>

      <!-- Tier Sections -->
      <div class="space-y-8">
        {#if searchQuery && filteredRanked.length === 0}
          <div class="bg-white/[0.02] border border-white/[0.06] p-8 sm:p-12 text-center">
            <Icon name="search" size="lg" class="text-text-tertiary mx-auto mb-3" />
            <p class="text-sm font-bold text-text-secondary">No scooters found</p>
            <p class="text-xs text-text-tertiary mt-1">
              No models matching "{searchQuery}" — try a different search term.
            </p>
            <button
              type="button"
              onclick={() => searchQuery = ""}
              class="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary border border-primary/25 bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              Clear Search
            </button>
          </div>
        {/if}
        {#each tierOrder as grade}
          {@const scooters = sortedTier(filteredTiers[grade])}
          {#if scooters.length > 0}
            <section>
              <!-- Tier Header -->
              <div class="flex items-center gap-3 mb-3">
                <span class="inline-flex items-center justify-center w-8 h-8 text-sm font-black border {badgeColors[grade]}">
                  {grade}
                </span>
                <div class="flex items-baseline gap-2">
                  <h2 class="text-sm font-bold {tierMeta[grade].color} uppercase tracking-wider">
                    {tierMeta[grade].label}
                  </h2>
                  <span class="text-xs text-text-tertiary">
                    {scooters.length} scooter{scooters.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent"></div>
              </div>

              <!-- Table layout for desktop, cards for mobile -->
              <!-- Desktop Table -->
              <div class="hidden md:block border border-white/[0.06] overflow-hidden">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-white/[0.03] border-b border-white/[0.06]">
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider w-12">#</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Model</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-center w-20">Score</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24">Speed</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24">Range</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24">Power</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24">Battery</th>
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24">Price</th>
                      <th class="py-2.5 px-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-20"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/[0.04]">
                    {#each scooters as scooter}
                      {@const rank = ranked.indexOf(scooter) + 1}
                      <tr class="hover:bg-white/[0.02] transition-colors {tierMeta[grade].bg}">
                        <td class="py-3 px-4">
                          <span class="text-xs font-bold text-text-tertiary">
                            {rank}
                          </span>
                        </td>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-3">
                            <div>
                              <span class="text-sm font-bold text-text-primary">{scooter.name}</span>
                              <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[10px] text-text-tertiary">{scooter.year}</span>
                                {#if scooter.status === 'discontinued'}
                                  <span class="text-[9px] text-rose-400/80 font-bold uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 border border-rose-500/20">End of Life</span>
                                {/if}
                                {#if scooter.hasPriceHistory && scooter.priceChange !== undefined}
                                  <span class="text-[9px] font-bold uppercase tracking-wider {scooter.priceChange < 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                    {scooter.priceChange < 0 ? '↓' : '↑'}{Math.abs(Math.round(scooter.priceChange))}%
                                  </span>
                                {/if}
                                {#if scooter.stats.cRate > 2.5}
                                  <span class="text-[9px] text-rose-400 font-bold uppercase tracking-wider">
                                    {scooter.stats.cRate.toFixed(1)}C strain
                                  </span>
                                {/if}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-4">
                          <div class="flex flex-col items-center gap-1">
                            <span class="text-sm font-black {tierMeta[grade].color}">{scooter.score.toFixed(1)}</span>
                            <div class="w-12 h-1 bg-white/5 overflow-hidden">
                              <div class="h-full {tierMeta[grade].bar}" style:width={`${scooter.score}%`}></div>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{Math.round(speedVal(scooter.stats.speed))}</span>
                          <span class="text-[10px] text-text-tertiary ml-1">{speedUnit()}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{Math.round(distanceVal(scooter.stats.totalRange))}</span>
                          <span class="text-[10px] text-text-tertiary ml-1">{distanceUnit()}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{Math.round(scooter.stats.totalWatts)}</span>
                          <span class="text-[10px] text-text-tertiary ml-1">W</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{scooter.batteryWh ? scooter.batteryWh : Math.round(scooter.stats.wh)}</span>
                          <span class="text-[10px] text-text-tertiary ml-1">Wh</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{formatPrice(scooter.price)}</span>
                        </td>
                        <td class="py-3 px-3 text-right">
                          <button
                            type="button"
                            onclick={() => loadPresetAndNavigate(scooter.key)}
                            class="text-[10px] font-bold text-primary hover:text-white hover:bg-primary/20 px-2.5 py-1 rounded transition-colors uppercase tracking-wider border border-primary/30"
                          >
                            Try it
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="md:hidden space-y-2.5">
                {#each scooters as scooter}
                  {@const rank = ranked.indexOf(scooter) + 1}
                  <div class="border p-3.5 {tierMeta[grade].bg} {tierMeta[grade].border}">
                    <!-- Top row: rank + name + score -->
                    <div class="flex items-start justify-between gap-2 mb-2.5">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-xs font-bold text-text-tertiary w-6 shrink-0">#{rank}</span>
                        <div class="min-w-0">
                          <h3 class="text-sm font-bold text-text-primary truncate">{scooter.name}</h3>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-[10px] text-text-tertiary">{scooter.year}</span>
                            {#if scooter.status === 'discontinued'}
                              <span class="text-[8px] text-rose-400/80 font-bold uppercase tracking-wider bg-rose-500/10 px-1 py-0.5 border border-rose-500/20">EOL</span>
                            {/if}
                            {#if scooter.hasPriceHistory && scooter.priceChange !== undefined}
                              <span class="text-[8px] font-bold uppercase tracking-wider {scooter.priceChange < 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                {scooter.priceChange < 0 ? '↓' : '↑'}{Math.abs(Math.round(scooter.priceChange))}%
                              </span>
                            {/if}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <span class="text-lg font-black {tierMeta[grade].color}">{scooter.score.toFixed(1)}</span>
                        <span class="text-[10px] text-text-tertiary">/100</span>
                      </div>
                    </div>

                    <!-- Score bar -->
                    <div class="h-1 w-full bg-white/5 overflow-hidden mb-3">
                      <div class="h-full {tierMeta[grade].bar}" style:width={`${scooter.score}%`}></div>
                    </div>

                    <!-- Stats row -->
                    <div class="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Speed</div>
                        <div class="text-xs font-bold text-text-primary mt-0.5">{Math.round(speedVal(scooter.stats.speed))}</div>
                      </div>
                      <div>
                        <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Range</div>
                        <div class="text-xs font-bold text-text-primary mt-0.5">{Math.round(distanceVal(scooter.stats.totalRange))}</div>
                      </div>
                      <div>
                        <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Power</div>
                        <div class="text-xs font-bold text-text-primary mt-0.5">{Math.round(scooter.stats.totalWatts)}W</div>
                      </div>
                      <div>
                        <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Price</div>
                        <div class="text-xs font-bold text-text-primary mt-0.5">{formatPrice(scooter.price)}</div>
                      </div>
                    </div>

                    {#if scooter.stats.cRate > 2.5}
                      <div class="mt-2.5 text-[9px] text-rose-400 font-bold uppercase tracking-wider">
                        ⚠ Battery strain {scooter.stats.cRate.toFixed(1)}C
                      </div>
                    {/if}
                    <button
                      type="button"
                      onclick={() => loadPresetAndNavigate(scooter.key)}
                      class="w-full mt-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/10 border border-primary/20 rounded transition-colors uppercase tracking-wider"
                    >
                      Load in Calculator
                    </button>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        {/each}
      </div>

      <!-- Data Audit Panel -->
      <section class="mt-8 border border-white/[0.06]">
        <button
          type="button"
          onclick={() => auditOpen = !auditOpen}
          class="w-full flex items-center justify-between p-4 sm:p-5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors group"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon name="chart" size="sm" class="text-primary" />
            </div>
            <div class="text-left">
              <h2 class="text-sm font-bold text-text-primary tracking-tight">Data Audit</h2>
              <p class="text-[10px] text-text-tertiary mt-0.5">
                Catalog v{CATALOG_VERSION} &middot; Updated {catalogDaysAgo}d ago &middot; {auditStats.total} models tracked
              </p>
            </div>
          </div>
          <Icon
            name={auditOpen ? "chevron-up" : "chevron-down"}
            size="sm"
            class="text-text-tertiary group-hover:text-text-secondary transition-colors"
          />
        </button>

        {#if auditOpen}
          <div class="border-t border-white/[0.06] p-4 sm:p-5 space-y-6">

            <!-- Overview Stats Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-white/[0.02] border border-white/[0.06] p-3">
                <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Current</div>
                <div class="text-lg font-black text-emerald-400 mt-1">{auditStats.current}</div>
                <div class="text-[9px] text-text-tertiary mt-0.5">of {auditStats.total} models</div>
              </div>
              <div class="bg-white/[0.02] border border-white/[0.06] p-3">
                <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Fresh Data</div>
                <div class="text-lg font-black {auditStats.fresh === auditStats.total ? 'text-emerald-400' : 'text-amber-400'} mt-1">{auditStats.fresh}</div>
                <div class="text-[9px] text-text-tertiary mt-0.5">&le;30d since check</div>
              </div>
              <div class="bg-white/[0.02] border border-white/[0.06] p-3">
                <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Stale</div>
                <div class="text-lg font-black {auditStats.stale > 0 ? 'text-rose-400' : 'text-emerald-400'} mt-1">{auditStats.stale}</div>
                <div class="text-[9px] text-text-tertiary mt-0.5">&gt;90d unverified</div>
              </div>
              <div class="bg-white/[0.02] border border-white/[0.06] p-3">
                <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">No Source URL</div>
                <div class="text-lg font-black {auditStats.missingUrl > 0 ? 'text-orange-400' : 'text-emerald-400'} mt-1">{auditStats.missingUrl}</div>
                <div class="text-[9px] text-text-tertiary mt-0.5">need linking</div>
              </div>
            </div>

            <!-- Status Distribution Bar -->
            <div>
              <h3 class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Status Distribution</h3>
              <div class="flex h-3 overflow-hidden border border-white/[0.06]">
                {#if auditStats.current > 0}
                  <div
                    class="bg-emerald-500/60 transition-all"
                    style:width={`${(auditStats.current / auditStats.total) * 100}%`}
                    title="{auditStats.current} current"
                  ></div>
                {/if}
                {#if auditStats.upcoming > 0}
                  <div
                    class="bg-blue-500/60 transition-all"
                    style:width={`${(auditStats.upcoming / auditStats.total) * 100}%`}
                    title="{auditStats.upcoming} upcoming"
                  ></div>
                {/if}
                {#if auditStats.discontinued > 0}
                  <div
                    class="bg-rose-500/60 transition-all"
                    style:width={`${(auditStats.discontinued / auditStats.total) * 100}%`}
                    title="{auditStats.discontinued} discontinued"
                  ></div>
                {/if}
                {#if auditStats.unverified > 0}
                  <div
                    class="bg-amber-500/60 transition-all"
                    style:width={`${(auditStats.unverified / auditStats.total) * 100}%`}
                    title="{auditStats.unverified} unverified"
                  ></div>
                {/if}
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span class="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                  <span class="w-2.5 h-2.5 bg-emerald-500/60 inline-block"></span>
                  Current ({auditStats.current})
                </span>
                {#if auditStats.upcoming > 0}
                  <span class="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                    <span class="w-2.5 h-2.5 bg-blue-500/60 inline-block"></span>
                    Upcoming ({auditStats.upcoming})
                  </span>
                {/if}
                {#if auditStats.discontinued > 0}
                  <span class="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                    <span class="w-2.5 h-2.5 bg-rose-500/60 inline-block"></span>
                    Discontinued ({auditStats.discontinued})
                  </span>
                {/if}
                {#if auditStats.unverified > 0}
                  <span class="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                    <span class="w-2.5 h-2.5 bg-amber-500/60 inline-block"></span>
                    Unverified ({auditStats.unverified})
                  </span>
                {/if}
              </div>
            </div>

            <!-- Data Freshness Table -->
            <div>
              <h3 class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Data Freshness</h3>

              <!-- Desktop Table -->
              <div class="hidden sm:block border border-white/[0.06] overflow-hidden">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-white/[0.03] border-b border-white/[0.06]">
                      <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Model</th>
                      <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Status</th>
                      <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Source</th>
                      <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider text-right">Last Verified</th>
                      <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider w-28">Freshness</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/[0.04]">
                    {#each auditData.sort((a, b) => b.daysSinceVerified - a.daysSinceVerified) as entry}
                      <tr class="hover:bg-white/[0.02] transition-colors">
                        <td class="py-2 px-3">
                          <span class="text-xs font-bold text-text-primary">{entry.name}</span>
                        </td>
                        <td class="py-2 px-3">
                          {#if entry.meta.status === 'current'}
                            <span class="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Current</span>
                          {:else if entry.meta.status === 'discontinued'}
                            <span class="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Discontinued</span>
                          {:else if entry.meta.status === 'upcoming'}
                            <span class="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Upcoming</span>
                          {:else}
                            <span class="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Unverified</span>
                          {/if}
                        </td>
                        <td class="py-2 px-3">
                          {#if entry.hasSourceUrl}
                            <a href={entry.meta.sourceUrl} target="_blank" rel="noopener noreferrer" class="text-[10px] text-primary hover:text-primary/80 transition-colors underline decoration-primary/30">
                              {entry.meta.source}
                            </a>
                          {:else}
                            <span class="text-[10px] text-text-tertiary">{entry.meta.source ?? '—'}</span>
                            {#if !entry.hasSourceUrl}
                              <span class="text-[9px] text-orange-400 ml-1">missing link</span>
                            {/if}
                          {/if}
                        </td>
                        <td class="py-2 px-3 text-right">
                          <span class="text-[10px] {freshnessColor(entry.daysSinceVerified)} font-bold">
                            {entry.daysSinceVerified === Infinity ? 'Never' : `${entry.daysSinceVerified}d ago`}
                          </span>
                        </td>
                        <td class="py-2 px-3">
                          <div class="flex items-center gap-2">
                            <div class="flex-1 h-1.5 bg-white/5 overflow-hidden">
                              <div class="h-full {entry.daysSinceVerified <= 30 ? 'bg-emerald-400' : entry.daysSinceVerified <= 90 ? 'bg-amber-400' : entry.daysSinceVerified <= 180 ? 'bg-orange-400' : 'bg-rose-400'} transition-all" style:width={`${freshnessBar(entry.daysSinceVerified)}%`}></div>
                            </div>
                            <span class="text-[8px] font-bold {freshnessColor(entry.daysSinceVerified)} uppercase tracking-wider w-12 text-right">{freshnessLabel(entry.daysSinceVerified)}</span>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="sm:hidden space-y-2">
                {#each auditData.sort((a, b) => b.daysSinceVerified - a.daysSinceVerified) as entry}
                  <div class="bg-white/[0.02] border border-white/[0.06] p-3">
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div class="min-w-0">
                        <span class="text-xs font-bold text-text-primary block truncate">{entry.name}</span>
                        <span class="text-[9px] text-text-tertiary">{entry.meta.source ?? 'No source'}</span>
                      </div>
                      <div class="shrink-0 text-right">
                        <span class="text-[10px] font-bold {freshnessColor(entry.daysSinceVerified)}">
                          {entry.daysSinceVerified === Infinity ? 'Never' : `${entry.daysSinceVerified}d`}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      {#if entry.meta.status === 'current'}
                        <span class="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Current</span>
                      {:else if entry.meta.status === 'discontinued'}
                        <span class="text-[8px] font-bold text-rose-400 uppercase tracking-wider">Discontinued</span>
                      {:else}
                        <span class="text-[8px] font-bold text-amber-400 uppercase tracking-wider">{entry.meta.status ?? 'Unknown'}</span>
                      {/if}
                      {#if !entry.hasSourceUrl}
                        <span class="text-[8px] text-orange-400">No URL</span>
                      {/if}
                      <div class="flex-1 h-1 bg-white/5 overflow-hidden">
                        <div class="h-full {entry.daysSinceVerified <= 30 ? 'bg-emerald-400' : entry.daysSinceVerified <= 90 ? 'bg-amber-400' : 'bg-rose-400'}" style:width={`${freshnessBar(entry.daysSinceVerified)}%`}></div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Action Items -->
            {#if staleEntries.length > 0 || missingUrlEntries.length > 0 || discontinuedEntries.length > 0}
              <div>
                <h3 class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Action Items</h3>
                <div class="space-y-2">
                  {#if staleEntries.length > 0}
                    <div class="flex items-start gap-3 bg-rose-500/[0.06] border border-rose-500/20 p-3">
                      <Icon name="warning" size="sm" class="text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p class="text-xs font-bold text-rose-300">
                          {staleEntries.length} model{staleEntries.length !== 1 ? 's' : ''} with stale data (&gt;90 days)
                        </p>
                        <p class="text-[10px] text-text-tertiary mt-1">
                          {staleEntries.slice(0, 5).map(e => e.name).join(', ')}{staleEntries.length > 5 ? ` +${staleEntries.length - 5} more` : ''}
                        </p>
                      </div>
                    </div>
                  {/if}
                  {#if missingUrlEntries.length > 0}
                    <div class="flex items-start gap-3 bg-orange-500/[0.06] border border-orange-500/20 p-3">
                      <Icon name="info" size="sm" class="text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p class="text-xs font-bold text-orange-300">
                          {missingUrlEntries.length} model{missingUrlEntries.length !== 1 ? 's' : ''} missing source URL
                        </p>
                        <p class="text-[10px] text-text-tertiary mt-1">
                          {missingUrlEntries.map(e => e.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  {/if}
                  {#if discontinuedEntries.length > 0}
                    <div class="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] p-3">
                      <Icon name="info" size="sm" class="text-text-tertiary shrink-0 mt-0.5" />
                      <div>
                        <p class="text-xs font-bold text-text-secondary">
                          {discontinuedEntries.length} discontinued model{discontinuedEntries.length !== 1 ? 's' : ''}
                        </p>
                        <p class="text-[10px] text-text-tertiary mt-1">
                          {discontinuedEntries.map(e => `${e.name}${e.meta.notes ? ` (${e.meta.notes})` : ''}`).join(', ')}
                        </p>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Catalog Info Footer -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 border-t border-white/[0.06]">
              <span class="text-[9px] text-text-tertiary uppercase tracking-wider">
                Catalog v{CATALOG_VERSION}
              </span>
              <span class="text-[9px] text-text-tertiary uppercase tracking-wider">
                Last updated: {CATALOG_LAST_UPDATED}
              </span>
              <span class="text-[9px] text-text-tertiary uppercase tracking-wider">
                {auditStats.withPrice} of {auditStats.total} with pricing
              </span>
              <span class="text-[9px] text-text-tertiary uppercase tracking-wider">
                Avg age: {auditStats.avgDays}d
              </span>
            </div>
          </div>
        {/if}
      </section>

      <!-- Footer -->
      <footer class="border-t border-white/5 mt-8 pt-6 pb-4">
        <p class="text-[10px] text-text-tertiary uppercase tracking-wider">
          Score = acceleration + range bonus + speed bonus + efficiency bonus − battery strain penalty. All calculations use spec-mode physics engine.
        </p>
      </footer>
    </div>
  </div>
</div>
