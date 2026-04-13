<script lang="ts">
  import { X, Download } from 'lucide-svelte';
  import { exportJSON, exportCSV, buildRankingsExport } from '$lib/utils/export';
  import { uiState, toggleUnitSystem } from '$lib/stores/ui.svelte';

  type BestForFilter = 'all' | 'value' | 'speed' | 'range' | 'efficiency' | 'portable';

  interface Props {
    searchQuery: string;
    sortBy: 'score' | 'price' | 'speed' | 'range';
    bestForFilter: BestForFilter;
    filteredRanked: any[];
    onsearchchange: (value: string) => void;
    onsortchange: (value: 'score' | 'price' | 'speed' | 'range') => void;
    onbestforchange: (value: BestForFilter) => void;
  }

  let { searchQuery, sortBy, bestForFilter, filteredRanked, onsearchchange, onsortchange, onbestforchange }: Props =
    $props();

  const bestForFilters: { value: BestForFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'value', label: 'Best Value' },
    { value: 'speed', label: 'Fastest' },
    { value: 'range', label: 'Longest Range' },
    { value: 'efficiency', label: 'Most Efficient' },
    { value: 'portable', label: 'Most Portable' },
  ];
</script>

<div class="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-6 space-y-3">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <!-- Search -->
    <div class="relative">
      <input
        type="text"
        value={searchQuery}
        oninput={(e) => onsearchchange((e.target as HTMLInputElement).value)}
        placeholder="Search models..."
        class="bg-white/[0.03] border border-white/[0.06] rounded-xl py-2 pl-3 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none w-full sm:w-56 transition-colors"
        aria-label="Filter scooters by name"
      />
      {#if searchQuery}
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
          onclick={() => onsearchchange('')}
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
            onclick={() => onsortchange(opt.value as typeof sortBy)}
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
        onclick={() => onbestforchange(f.value)}
      >
        {f.label}
      </button>
    {/each}
    {#if bestForFilter !== 'all'}
      <span class="text-[10px] text-text-tertiary ml-1">Top 10 shown</span>
    {/if}
  </div>
</div>
