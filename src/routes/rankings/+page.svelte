<script lang="ts">
  import type { PageData } from './$types';
  import { calculatePerformance } from '$lib/physics';
  import { presets, presetMetadata } from '$lib/data/presets';
  import type { ScooterConfig, PerformanceStats } from '$lib/types';
  import { computeScoreBreakdown, getGrade, type Grade, type ScoreBreakdown } from '$lib/utils/scoring';
  import AppHeader from '$lib/components/ui/AppHeader.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import NewsletterSignup from '$lib/components/ui/NewsletterSignup.svelte';
  import { distanceVal, speedVal, distanceUnit, speedUnit } from '$lib/utils/units';
  import { uiState, toggleUnitSystem } from '$lib/stores/ui.svelte';
  import { goto, replaceState } from '$app/navigation';
  // import { page } from '$app/stores'; // unused — URL sync handled via URLSearchParams directly
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { loadPreset } from '$lib/stores/calculator.svelte';
  import { X, TrendingDown, TrendingUp, AlertTriangle, Download } from 'lucide-svelte';
  import { exportJSON, exportCSV, buildRankingsExport } from '$lib/utils/export';
  import { formatPrice } from '$lib/utils/formatters';

  let { data }: { data: PageData } = $props();

  interface RankedScooter {
    key: string;
    name: string;
    year: number;
    config: ScooterConfig;
    stats: PerformanceStats;
    score: number;
    grade: Grade;
    breakdown: ScoreBreakdown;
    price?: number;
    batteryWh?: number;
    status?: 'current' | 'discontinued' | 'upcoming' | 'unverified';
    hasPriceHistory?: boolean;
    priceChange?: number;
    valueScore?: number; // performance / price ratio
  }

  type BestForFilter = 'all' | 'value' | 'speed' | 'range' | 'efficiency' | 'portable';

  const bestForFilters: { value: BestForFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'value', label: 'Best Value' },
    { value: 'speed', label: 'Fastest' },
    { value: 'range', label: 'Longest Range' },
    { value: 'efficiency', label: 'Most Efficient' },
    { value: 'portable', label: 'Most Portable' },
  ];

  const tierMeta: Record<Grade, { label: string; color: string; bar: string; bg: string; border: string }> = {
    S: {
      label: 'Elite',
      color: 'text-amber-300',
      bar: 'bg-amber-400',
      bg: 'bg-amber-500/[0.06]',
      border: 'border-amber-500/25',
    },
    A: {
      label: 'Excellent',
      color: 'text-emerald-400',
      bar: 'bg-emerald-400',
      bg: 'bg-emerald-500/[0.06]',
      border: 'border-emerald-500/25',
    },
    B: {
      label: 'Good',
      color: 'text-blue-400',
      bar: 'bg-blue-400',
      bg: 'bg-blue-500/[0.04]',
      border: 'border-blue-500/20',
    },
    C: {
      label: 'Average',
      color: 'text-amber-400',
      bar: 'bg-amber-400',
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.06]',
    },
    D: {
      label: 'Below Avg',
      color: 'text-orange-400',
      bar: 'bg-orange-400',
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.06]',
    },
    F: {
      label: 'Poor',
      color: 'text-rose-400',
      bar: 'bg-rose-400',
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.06]',
    },
  };

  const badgeColors: Record<Grade, string> = {
    S: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    B: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    C: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    D: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    F: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  // Compute all rankings
  const ranked: RankedScooter[] = $derived.by(() => {
    const entries = Object.entries(presets)
      .filter(([key]) => key !== 'custom')
      .map(([key, config]) => {
        const stats = calculatePerformance(config, 'spec');
        const meta = presetMetadata[key];
        const breakdown = computeScoreBreakdown(config, stats);
        const price = meta?.manufacturer?.price;
        return {
          key,
          name: meta?.name ?? key,
          year: meta?.year ?? 0,
          config,
          stats,
          score: breakdown.total,
          grade: getGrade(breakdown.total),
          breakdown,
          price,
          batteryWh: meta?.manufacturer?.batteryWh,
          status: meta?.status,
          hasPriceHistory: !!(meta?.priceHistory && meta.priceHistory.length > 0),
          priceChange:
            meta?.priceHistory && meta.priceHistory.length >= 2
              ? (((meta.manufacturer?.price ?? meta.priceHistory[meta.priceHistory.length - 1].price) -
                  meta.priceHistory[0].price) /
                  meta.priceHistory[0].price) *
                100
              : undefined,
          valueScore: price && price > 0 ? Math.round((breakdown.total / (price / 1000)) * 10) / 10 : undefined,
        };
      });
    entries.sort((a, b) => b.score - a.score);
    return entries;
  });

  const tierOrder: Grade[] = ['S', 'A', 'B', 'C', 'D', 'F'];

  let sortBy = $state<'score' | 'price' | 'speed' | 'range'>('score');
  let searchQuery = $state('');
  let bestForFilter = $state<BestForFilter>('all');
  let expandedScoreKey = $state<string | null>(null);
  let mounted = false;

  // Deep linking: initialize state from URL params
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    if (sort === 'score' || sort === 'price' || sort === 'speed' || sort === 'range') sortBy = sort;
    const q = params.get('q');
    if (q) searchQuery = q;
    const best = params.get('best');
    if (best === 'value' || best === 'speed' || best === 'range' || best === 'efficiency' || best === 'portable')
      bestForFilter = best;
    // Load compare selection from sessionStorage (from previous navigation)
    const stored = sessionStorage.getItem('compareSelection');
    if (stored) {
      try {
        compareSelection = JSON.parse(stored);
      } catch {
        /* ignore invalid sessionStorage data */
      }
      sessionStorage.removeItem('compareSelection');
    }
    mounted = true;
  });

  // Sync filter state to URL without navigation
  $effect(() => {
    if (!browser || !mounted) return;
    const url = new URL(window.location.href);
    // Update params based on current state
    if (sortBy !== 'score') url.searchParams.set('sort', sortBy);
    else url.searchParams.delete('sort');
    if (searchQuery) url.searchParams.set('q', searchQuery);
    else url.searchParams.delete('q');
    if (bestForFilter !== 'all') url.searchParams.set('best', bestForFilter);
    else url.searchParams.delete('best');
    replaceState(url, {});
  });

  const filteredRanked = $derived.by(() => {
    let results = ranked.filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (bestForFilter !== 'all') {
      // Sort by the selected metric, take top 10
      const sorted = [...results];
      switch (bestForFilter) {
        case 'value':
          sorted.sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0));
          break;
        case 'speed':
          sorted.sort((a, b) => b.stats.speed - a.stats.speed);
          break;
        case 'range':
          sorted.sort((a, b) => b.stats.totalRange - a.stats.totalRange);
          break;
        case 'efficiency':
          sorted.sort((a, b) => a.config.style - b.config.style);
          break;
        case 'portable':
          sorted.sort((a, b) => (a.config.scooterWeight ?? 99) - (b.config.scooterWeight ?? 99));
          break;
      }
      const topKeys = new Set(sorted.slice(0, 10).map((s) => s.key));
      results = results.filter((s) => topKeys.has(s.key));
    }

    return results;
  });

  const rankMap = $derived(new Map(ranked.map((s, i) => [s.key, i + 1])));

  const filteredTiers = $derived.by(() => {
    const groups: Record<Grade, RankedScooter[]> = { S: [], A: [], B: [], C: [], D: [], F: [] };
    for (const s of filteredRanked) groups[s.grade].push(s);
    return groups;
  });

  function sortedTier(scooters: RankedScooter[]): RankedScooter[] {
    const copy = [...scooters];
    switch (sortBy) {
      case 'price':
        return copy.sort((a, b) => (a.price ?? 99999) - (b.price ?? 99999));
      case 'speed':
        return copy.sort((a, b) => b.stats.speed - a.stats.speed);
      case 'range':
        return copy.sort((a, b) => b.stats.totalRange - a.stats.totalRange);
      default:
        return copy.sort((a, b) => b.score - a.score);
    }
  }

  // Summary stats — react to filtered results when searching
  const topScore = $derived(filteredRanked[0]?.score ?? 0);
  const avgScore = $derived(
    filteredRanked.length ? filteredRanked.reduce((s, r) => s + r.score, 0) / filteredRanked.length : 0
  );
  const sCount = $derived(filteredRanked.filter((s) => s.grade === 'S').length);

  let compareSelection = $state<string[]>([]);

  function toggleCompare(key: string) {
    if (compareSelection.includes(key)) {
      compareSelection = compareSelection.filter((k) => k !== key);
    } else if (compareSelection.length < 3) {
      compareSelection = [...compareSelection, key];
    }
  }

  function goToCompare() {
    // Store selection in sessionStorage so the compare tab can pick it up
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('compareSelection', JSON.stringify(compareSelection));
    }
    goto('/?tab=compare');
  }

  function loadPresetAndNavigate(key: string) {
    loadPreset(key);
    goto('/');
  }
</script>

<svelte:head>
  <title>Power Rankings — EV Scooter Pro Calculator</title>
  <meta
    name="description"
    content="Tiered performance rankings for electric scooters based on physics-based analysis"
  />
  {#if data.ogScooterKey}
    {@const ogImageUrl = `/api/og?scooter=${encodeURIComponent(data.ogScooterKey)}`}
    {@const scooterMeta = presetMetadata[data.ogScooterKey]}
    {@const ogTitle = scooterMeta
      ? `${scooterMeta.name} — EV Scooter Pro Rankings`
      : 'Power Rankings — EV Scooter Pro Calculator'}
    <meta property="og:title" content={ogTitle} />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={ogTitle} />
    <meta name="twitter:image" content={ogImageUrl} />
  {:else}
    {@const ogImageUrl = `/api/og`}
    <meta property="og:title" content="Power Rankings — EV Scooter Pro Calculator" />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Power Rankings — EV Scooter Pro Calculator" />
    <meta name="twitter:image" content={ogImageUrl} />
  {/if}
  <!-- svelte-ignore svelte_head_no_scripts -->
  <script type="application/ld+json">
{@html JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', position: 1, name: 'Home', item: $page.url.origin + '/' },
      { '@type': 'ListItem', position: 2, name: 'Rankings' }
    ]
  })}
  </script>
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <div
    class="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>
  <div
    class="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-secondary/3 blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>

  <div class="relative">
    <AppHeader />

    <div class="max-w-7xl mx-auto px-3 sm:px-4 pt-6 lg:pt-8 pb-8">
      <!-- Page Header -->
      <div class="mb-6 lg:mb-8">
        <h1 class="text-xl font-black text-text-primary tracking-tight">Power Rankings</h1>
        <p class="text-xs text-text-tertiary mt-1">
          {ranked.length} scooters ranked by composite performance score
        </p>
      </div>

      <!-- Controls Bar -->
      <div class="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-6 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- Search -->
          <div class="relative">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search models..."
              class="bg-white/[0.03] border border-white/[0.06] rounded-xl py-2 pl-3 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none w-full sm:w-56 transition-colors"
              aria-label="Filter scooters by name"
            />
            {#if searchQuery}
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                onclick={() => (searchQuery = '')}
                aria-label="Clear search"><X size={14} /></button
              >
            {/if}
          </div>

          <div class="flex items-center gap-3">
            <!-- Export -->
            <div class="flex gap-1">
              <button
                type="button"
                onclick={() => exportCSV(buildRankingsExport(filteredRanked), 'ev-scooter-rankings.csv')}
                class="px-2 py-1.5 border border-white/10 rounded-full text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider flex items-center gap-1"
                aria-label="Export rankings as CSV"
              >
                <Download size={10} /> CSV
              </button>
              <button
                type="button"
                onclick={() => exportJSON(buildRankingsExport(filteredRanked), 'ev-scooter-rankings.json')}
                class="px-2 py-1.5 border border-white/10 rounded-full text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider flex items-center gap-1"
                aria-label="Export rankings as JSON"
              >
                <Download size={10} /> JSON
              </button>
            </div>

            <!-- Unit toggle -->
            <button
              type="button"
              onclick={toggleUnitSystem}
              class="px-3 py-1.5 border border-white/10 rounded-full text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider"
              aria-label="Toggle units"
            >
              {uiState.unitSystem === 'metric' ? 'km' : 'mi'}
            </button>

            <!-- Sort pills -->
            <div class="flex gap-1.5">
              {#each [{ value: 'score', label: 'Score' }, { value: 'speed', label: 'Speed' }, { value: 'range', label: 'Range' }, { value: 'price', label: 'Price' }] as opt}
                <button
                  type="button"
                  class="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-full transition-all
                    {sortBy === opt.value
                    ? 'bg-primary/15 text-primary border-primary/25'
                    : 'bg-white/[0.02] text-text-tertiary border-white/[0.06] hover:border-white/10 hover:text-text-secondary'}"
                  onclick={() => (sortBy = opt.value as typeof sortBy)}
                >
                  {opt.label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Best For filters -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider shrink-0">Best for:</span>
          {#each bestForFilters as f}
            <button
              type="button"
              class="px-2.5 py-1 text-[10px] font-bold border rounded-full transition-all
                {bestForFilter === f.value
                ? 'bg-secondary/15 text-secondary border-secondary/25'
                : 'bg-white/[0.02] text-text-tertiary border-white/[0.06] hover:border-white/10 hover:text-text-secondary'}"
              onclick={() => (bestForFilter = f.value)}
            >
              {f.label}
            </button>
          {/each}
          {#if bestForFilter !== 'all'}
            <span class="text-[10px] text-text-tertiary ml-1">Top 10 shown</span>
          {/if}
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 sm:p-4">
          <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Top Score</div>
          <div class="text-xl sm:text-2xl font-black text-amber-300 mt-1">{topScore.toFixed(1)}</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 sm:p-4">
          <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Average</div>
          <div class="text-xl sm:text-2xl font-black text-text-primary mt-1">{avgScore.toFixed(1)}</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 sm:p-4">
          <div class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">S-Tier</div>
          <div class="text-xl sm:text-2xl font-black text-amber-300 mt-1">{sCount}</div>
        </div>
      </div>

      <!-- Tier Sections -->
      <div class="space-y-8">
        {#if searchQuery && filteredRanked.length === 0}
          <div class="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 sm:p-12 text-center">
            <Icon name="search" size="lg" class="text-text-tertiary mx-auto mb-3" />
            <p class="text-sm font-bold text-text-secondary">No scooters found</p>
            <p class="text-xs text-text-tertiary mt-1">
              No models matching "{searchQuery}" — try a different search term.
            </p>
            <button
              type="button"
              onclick={() => (searchQuery = '')}
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
                <span
                  class="inline-flex items-center justify-center w-8 h-8 text-sm font-black border {badgeColors[grade]}"
                >
                  {grade}
                </span>
                <div class="flex items-baseline gap-2">
                  <h2 class="text-sm font-bold {tierMeta[grade].color} uppercase tracking-wider">
                    {tierMeta[grade].label}
                  </h2>
                  <span class="text-xs text-text-tertiary">
                    {scooters.length} scooter{scooters.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent"></div>
              </div>

              <!-- Table layout for desktop, cards for mobile -->
              <!-- Desktop Table -->
              <div class="hidden md:block border border-white/[0.06] rounded-xl overflow-hidden">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-white/[0.03] border-b border-white/[0.06]">
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider w-12"
                        >#</th
                      >
                      <th class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider"
                        >Model</th
                      >
                      <th
                        class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-center w-20"
                        >Score</th
                      >
                      <th
                        class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24"
                        >Speed</th
                      >
                      <th
                        class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24"
                        >Range</th
                      >
                      <th
                        class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24"
                        >Power</th
                      >
                      <th
                        class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24"
                        >Battery</th
                      >
                      <th
                        class="py-2.5 px-4 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-24"
                        >Price</th
                      >
                      <th
                        class="py-2.5 px-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider text-right w-20"
                      ></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/[0.04]">
                    {#each scooters as scooter}
                      {@const rank = rankMap.get(scooter.key) ?? 0}
                      {@const isExpanded = expandedScoreKey === scooter.key}
                      <tr
                        class="hover:bg-white/[0.02] transition-colors {tierMeta[grade].bg} cursor-pointer"
                        onclick={() => (expandedScoreKey = isExpanded ? null : scooter.key)}
                      >
                        <td class="py-3 px-4">
                          <span class="text-xs font-bold text-text-tertiary">
                            {rank}
                          </span>
                        </td>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-3">
                            <div>
                              <a
                                href="/scooter/{scooter.key}"
                                class="text-sm font-bold text-text-primary hover:text-primary transition-colors"
                                >{scooter.name}</a
                              >
                              <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[10px] text-text-tertiary">{scooter.year}</span>
                                {#if scooter.status === 'discontinued'}
                                  <span
                                    class="text-[9px] text-rose-400/80 font-bold uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 border border-rose-500/20"
                                    >End of Life</span
                                  >
                                {/if}
                                {#if scooter.hasPriceHistory && scooter.priceChange !== undefined}
                                  <span
                                    class="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider {scooter.priceChange <
                                    0
                                      ? 'text-emerald-400'
                                      : 'text-rose-400'}"
                                  >
                                    {#if scooter.priceChange < 0}<TrendingDown size={10} />{:else}<TrendingUp
                                        size={10}
                                      />{/if}{Math.abs(Math.round(scooter.priceChange))}%
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
                          <span class="text-sm font-bold text-text-primary"
                            >{Math.round(speedVal(scooter.stats.speed))}</span
                          >
                          <span class="text-[10px] text-text-tertiary ml-1">{speedUnit()}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary"
                            >{Math.round(distanceVal(scooter.stats.totalRange))}</span
                          >
                          <span class="text-[10px] text-text-tertiary ml-1">{distanceUnit()}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{Math.round(scooter.stats.totalWatts)}</span
                          >
                          <span class="text-[10px] text-text-tertiary ml-1">W</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary"
                            >{scooter.batteryWh ? scooter.batteryWh : Math.round(scooter.stats.wh)}</span
                          >
                          <span class="text-[10px] text-text-tertiary ml-1">Wh</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-sm font-bold text-text-primary">{formatPrice(scooter.price)}</span>
                        </td>
                        <td class="py-3 px-3 text-right">
                          <div class="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onclick={(e) => {
                                e.stopPropagation();
                                toggleCompare(scooter.key);
                              }}
                              class="w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0
                                {compareSelection.includes(scooter.key)
                                ? 'bg-primary border-primary text-bg-primary'
                                : 'border-white/20 hover:border-white/40'}"
                              aria-label="{compareSelection.includes(scooter.key)
                                ? 'Remove from'
                                : 'Add to'} comparison"
                              disabled={!compareSelection.includes(scooter.key) && compareSelection.length >= 3}
                            >
                              {#if compareSelection.includes(scooter.key)}
                                <span class="text-[10px] font-bold">&#10003;</span>
                              {/if}
                            </button>
                            <button
                              type="button"
                              onclick={(e) => {
                                e.stopPropagation();
                                loadPresetAndNavigate(scooter.key);
                              }}
                              class="text-[10px] font-bold text-primary hover:text-white hover:bg-primary/20 px-2.5 py-1 rounded transition-colors uppercase tracking-wider border border-primary/30"
                            >
                              Try it
                            </button>
                          </div>
                        </td>
                      </tr>
                      <!-- Score Breakdown Row -->
                      {#if isExpanded}
                        {@const b = scooter.breakdown}
                        <tr class="bg-white/[0.02]">
                          <td colspan="9" class="px-4 py-3">
                            <div class="flex items-center gap-6 flex-wrap">
                              <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider"
                                >Score Breakdown:</span
                              >
                              <div class="flex items-center gap-1">
                                <div class="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></div>
                                <span class="text-[10px] text-text-secondary">Accel</span>
                                <span class="text-xs font-bold text-emerald-400">+{b.accel}</span>
                                <span class="text-[9px] text-text-tertiary">/30</span>
                              </div>
                              <div class="flex items-center gap-1">
                                <div class="w-2 h-2 rounded-full bg-blue-400" aria-hidden="true"></div>
                                <span class="text-[10px] text-text-secondary">Range</span>
                                <span class="text-xs font-bold text-blue-400">+{b.range}</span>
                                <span class="text-[9px] text-text-tertiary">/25</span>
                              </div>
                              <div class="flex items-center gap-1">
                                <div class="w-2 h-2 rounded-full bg-cyan-400" aria-hidden="true"></div>
                                <span class="text-[10px] text-text-secondary">Speed</span>
                                <span class="text-xs font-bold text-cyan-400">+{b.speed}</span>
                                <span class="text-[9px] text-text-tertiary">/20</span>
                              </div>
                              <div class="flex items-center gap-1">
                                <div class="w-2 h-2 rounded-full bg-violet-400" aria-hidden="true"></div>
                                <span class="text-[10px] text-text-secondary">Efficiency</span>
                                <span class="text-xs font-bold text-violet-400">+{b.efficiency}</span>
                                <span class="text-[9px] text-text-tertiary">/15</span>
                              </div>
                              {#if b.strainPenalty > 0}
                                <div class="flex items-center gap-1">
                                  <div class="w-2 h-2 rounded-full bg-rose-400" aria-hidden="true"></div>
                                  <span class="text-[10px] text-text-secondary">Strain</span>
                                  <span class="text-xs font-bold text-rose-400">-{b.strainPenalty}</span>
                                </div>
                              {/if}
                              {#if b.weightPenalty > 0}
                                <div class="flex items-center gap-1">
                                  <div class="w-2 h-2 rounded-full bg-orange-400" aria-hidden="true"></div>
                                  <span class="text-[10px] text-text-secondary">Weight</span>
                                  <span class="text-xs font-bold text-orange-400">-{b.weightPenalty}</span>
                                </div>
                              {/if}
                              {#if scooter.valueScore}
                                <div class="flex items-center gap-1 ml-auto border-l border-white/[0.08] pl-4">
                                  <span class="text-[10px] text-text-secondary">Value</span>
                                  <span class="text-xs font-bold text-amber-400">{scooter.valueScore}</span>
                                  <span class="text-[9px] text-text-tertiary">pts/$k</span>
                                </div>
                              {/if}
                            </div>
                          </td>
                        </tr>
                      {/if}
                    {/each}
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="md:hidden space-y-2.5">
                {#each scooters as scooter}
                  {@const rank = rankMap.get(scooter.key) ?? 0}
                  {@const b = scooter.breakdown}
                  {@const mobileExpanded = expandedScoreKey === scooter.key}
                  <div class="border {tierMeta[grade].bg} {tierMeta[grade].border}">
                    <!-- Top row: rank + name + score -->
                    <button
                      type="button"
                      class="w-full text-left p-3.5"
                      onclick={() => (expandedScoreKey = mobileExpanded ? null : scooter.key)}
                    >
                      <div class="flex items-start justify-between gap-2 mb-2.5">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <span class="text-xs font-bold text-text-tertiary w-6 shrink-0">#{rank}</span>
                          <div class="min-w-0">
                            <a
                              href="/scooter/{scooter.key}"
                              class="text-sm font-bold text-text-primary hover:text-primary transition-colors truncate block"
                              >{scooter.name}</a
                            >
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="text-[10px] text-text-tertiary">{scooter.year}</span>
                              {#if scooter.status === 'discontinued'}
                                <span
                                  class="text-[8px] text-rose-400/80 font-bold uppercase tracking-wider bg-rose-500/10 px-1 py-0.5 border border-rose-500/20"
                                  >EOL</span
                                >
                              {/if}
                              {#if scooter.hasPriceHistory && scooter.priceChange !== undefined}
                                <span
                                  class="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider {scooter.priceChange <
                                  0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'}"
                                >
                                  {#if scooter.priceChange < 0}<TrendingDown size={9} />{:else}<TrendingUp
                                      size={9}
                                    />{/if}{Math.abs(Math.round(scooter.priceChange))}%
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
                          <div class="text-xs font-bold text-text-primary mt-0.5">
                            {Math.round(speedVal(scooter.stats.speed))}
                          </div>
                        </div>
                        <div>
                          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Range</div>
                          <div class="text-xs font-bold text-text-primary mt-0.5">
                            {Math.round(distanceVal(scooter.stats.totalRange))}
                          </div>
                        </div>
                        <div>
                          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Power</div>
                          <div class="text-xs font-bold text-text-primary mt-0.5">
                            {Math.round(scooter.stats.totalWatts)}W
                          </div>
                        </div>
                        <div>
                          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Price</div>
                          <div class="text-xs font-bold text-text-primary mt-0.5">{formatPrice(scooter.price)}</div>
                        </div>
                      </div>
                    </button>

                    <!-- Expandable score breakdown -->
                    {#if mobileExpanded}
                      <div class="px-3.5 pb-3 space-y-2.5">
                        <div class="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-2">
                            Score Breakdown
                          </div>
                          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            <div class="flex items-center justify-between">
                              <span class="text-[10px] text-text-secondary">Accel</span>
                              <span class="text-[11px] font-bold text-emerald-400"
                                >+{b.accel}<span class="text-text-tertiary font-normal">/30</span></span
                              >
                            </div>
                            <div class="flex items-center justify-between">
                              <span class="text-[10px] text-text-secondary">Range</span>
                              <span class="text-[11px] font-bold text-blue-400"
                                >+{b.range}<span class="text-text-tertiary font-normal">/25</span></span
                              >
                            </div>
                            <div class="flex items-center justify-between">
                              <span class="text-[10px] text-text-secondary">Speed</span>
                              <span class="text-[11px] font-bold text-cyan-400"
                                >+{b.speed}<span class="text-text-tertiary font-normal">/20</span></span
                              >
                            </div>
                            <div class="flex items-center justify-between">
                              <span class="text-[10px] text-text-secondary">Efficiency</span>
                              <span class="text-[11px] font-bold text-violet-400"
                                >+{b.efficiency}<span class="text-text-tertiary font-normal">/15</span></span
                              >
                            </div>
                            {#if b.strainPenalty > 0}
                              <div class="flex items-center justify-between">
                                <span class="text-[10px] text-text-secondary">Strain</span>
                                <span class="text-[11px] font-bold text-rose-400">-{b.strainPenalty}</span>
                              </div>
                            {/if}
                            {#if b.weightPenalty > 0}
                              <div class="flex items-center justify-between">
                                <span class="text-[10px] text-text-secondary">Weight</span>
                                <span class="text-[11px] font-bold text-orange-400">-{b.weightPenalty}</span>
                              </div>
                            {/if}
                          </div>
                          {#if scooter.valueScore}
                            <div class="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                              <span class="text-[10px] text-text-secondary">Value Score</span>
                              <span class="text-[11px] font-bold text-amber-400"
                                >{scooter.valueScore} <span class="text-text-tertiary font-normal">pts/$k</span></span
                              >
                            </div>
                          {/if}
                        </div>

                        {#if scooter.stats.cRate > 2.5}
                          <div
                            class="inline-flex items-center gap-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider"
                          >
                            <AlertTriangle size={10} /> Battery strain {scooter.stats.cRate.toFixed(1)}C
                          </div>
                        {/if}

                        <div class="flex gap-2">
                          <button
                            type="button"
                            onclick={() => toggleCompare(scooter.key)}
                            class="flex-1 py-2 text-[10px] font-bold border rounded transition-colors uppercase tracking-wider
                              {compareSelection.includes(scooter.key)
                              ? 'text-primary bg-primary/10 border-primary/30'
                              : 'text-text-tertiary hover:text-text-secondary border-white/10 hover:border-white/20'}"
                            disabled={!compareSelection.includes(scooter.key) && compareSelection.length >= 3}
                          >
                            {compareSelection.includes(scooter.key) ? 'Selected' : 'Compare'}
                          </button>
                          <button
                            type="button"
                            onclick={() => loadPresetAndNavigate(scooter.key)}
                            class="flex-1 py-2 text-[10px] font-bold text-primary hover:bg-primary/10 border border-primary/20 rounded transition-colors uppercase tracking-wider"
                          >
                            Calculator
                          </button>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        {/each}
      </div>

      <!-- Floating compare bar -->
      {#if compareSelection.length >= 2}
        <div
          class="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-primary/95 backdrop-blur-lg border border-primary/30 rounded-2xl px-5 py-3 shadow-2xl shadow-black/30 flex items-center gap-4"
        >
          <span class="text-xs text-text-secondary font-bold">{compareSelection.length} selected</span>
          <button
            type="button"
            onclick={goToCompare}
            class="px-4 py-2 bg-primary text-bg-primary text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-colors"
          >
            Compare Now
          </button>
          <button
            type="button"
            onclick={() => (compareSelection = [])}
            class="text-[10px] text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-wider"
          >
            Clear
          </button>
        </div>
      {/if}

      <!-- Newsletter Signup -->
      <div class="mt-8">
        <NewsletterSignup variant="inline" context="rankings" />
      </div>

      {#await import('$lib/components/rankings/DataAuditPanel.svelte') then { default: DataAuditPanel }}
        <DataAuditPanel />
      {/await}

      <!-- Footer -->
      <footer class="border-t border-white/5 mt-8 pt-6 pb-4">
        <p class="text-[10px] text-text-tertiary uppercase tracking-wider">
          Score = accel (30) + range (25) + speed (20) + efficiency (15) − strain − weight penalties. Click any row to
          see breakdown. All calculations use spec-mode physics.
        </p>
      </footer>
    </div>
  </div>
</div>
