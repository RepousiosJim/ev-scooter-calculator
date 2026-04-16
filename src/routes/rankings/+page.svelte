<script lang="ts">
  import type { PageData } from './$types';
  import { presetMetadata } from '$lib/data/presets';
  import type { ScooterConfig, PerformanceStats } from '$lib/types';
  import { type Grade, type ScoreBreakdown } from '$lib/utils/scoring';
  import AppHeader from '$lib/components/ui/AppHeader.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import NewsletterSignup from '$lib/components/ui/NewsletterSignup.svelte';
  import RankingsFilters from '$lib/components/rankings/RankingsFilters.svelte';
  import RankingRow from '$lib/components/rankings/RankingRow.svelte';
  import RankingMobileCard from '$lib/components/rankings/RankingMobileCard.svelte';
  import { goto, replaceState } from '$app/navigation';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- $page referenced in JSON-LD script block
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { loadPreset } from '$lib/stores/calculator.svelte';

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

  // Rankings are pre-computed server-side in +page.server.ts for SSR performance
  const ranked: RankedScooter[] = $derived(data.ranked as RankedScooter[]);

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
  <title>Best Electric Scooters Ranked 2024 | EV Scooter Pro</title>
  <meta
    name="description"
    content="Compare and rank 166+ electric scooters by real performance. Physics-based scoring covers range, speed, power, and value. Find your perfect e-scooter."
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
      <div class="mb-6 lg:mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-xl font-black text-text-primary tracking-tight">Power Rankings</h1>
          <p class="text-xs text-text-tertiary mt-1">
            {ranked.length} scooters ranked by composite performance score
          </p>
        </div>
        <a
          href="/best"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover bg-primary/[0.06] hover:bg-primary/[0.12] border border-primary/20 rounded-full px-3 py-1.5 transition-colors"
        >
          Browse by category
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <!-- Controls Bar -->
      <RankingsFilters
        {searchQuery}
        {sortBy}
        {bestForFilter}
        {filteredRanked}
        onsearchchange={(v) => (searchQuery = v)}
        onsortchange={(v) => (sortBy = v)}
        onbestforchange={(v) => (bestForFilter = v)}
      />

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
        {#each tierOrder as grade (grade)}
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
                    {#each scooters as scooter (scooter.key)}
                      {@const rank = rankMap.get(scooter.key) ?? 0}
                      {@const isExpanded = expandedScoreKey === scooter.key}
                      <RankingRow
                        {scooter}
                        {rank}
                        tierMeta={tierMeta[grade]}
                        {isExpanded}
                        inCompareSelection={compareSelection.includes(scooter.key)}
                        compareDisabled={!compareSelection.includes(scooter.key) && compareSelection.length >= 3}
                        ontoggleexpand={() => (expandedScoreKey = isExpanded ? null : scooter.key)}
                        ontogglecompare={() => toggleCompare(scooter.key)}
                        onloadpreset={() => loadPresetAndNavigate(scooter.key)}
                      />
                    {/each}
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="md:hidden space-y-2.5">
                {#each scooters as scooter (scooter.key)}
                  {@const rank = rankMap.get(scooter.key) ?? 0}
                  {@const mobileExpanded = expandedScoreKey === scooter.key}
                  <RankingMobileCard
                    {scooter}
                    {rank}
                    tierMeta={tierMeta[grade]}
                    isExpanded={mobileExpanded}
                    inCompareSelection={compareSelection.includes(scooter.key)}
                    compareDisabled={!compareSelection.includes(scooter.key) && compareSelection.length >= 3}
                    ontoggleexpand={() => (expandedScoreKey = mobileExpanded ? null : scooter.key)}
                    ontogglecompare={() => toggleCompare(scooter.key)}
                    onloadpreset={() => loadPresetAndNavigate(scooter.key)}
                  />
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
