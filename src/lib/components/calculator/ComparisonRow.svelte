<script lang="ts">
  import type { ScooterConfig, PerformanceStats } from '$lib/types';
  import type { GradeInfo } from '$lib/utils/scoring';
  import type { presetMetadata } from '$lib/data/presets';

  interface ScooterEntry {
    id: string;
    name: string;
    year: number;
    config: ScooterConfig;
    meta: (typeof presetMetadata)[string] | undefined;
    score: number;
    grade: GradeInfo;
    stats: PerformanceStats;
  }

  type ComparisonRow = {
    label: string;
    unit?: string;
    section: 'specs' | 'calculated';
    getValue: (entry: ScooterEntry) => number | string;
    getNumeric: (entry: ScooterEntry) => number;
    format: (entry: ScooterEntry) => string;
    higherIsBetter: boolean;
  };

  interface Props {
    scooter: ScooterEntry;
    idx: number;
    activeKey: string | null;
    isBest: boolean;
    allSame: boolean;
    comparisonRows: ComparisonRow[];
    selectedScooters: ScooterEntry[];
    bestIndex: (row: ComparisonRow, entries: ScooterEntry[]) => number;
    getDelta: (
      row: ComparisonRow,
      entry: ScooterEntry,
      entries: ScooterEntry[]
    ) => { text: string; class: string } | null;
  }

  let { scooter, idx, activeKey, isBest, allSame, comparisonRows, selectedScooters, bestIndex, getDelta }: Props =
    $props();
</script>

<div
  class="border rounded-xl overflow-hidden {isBest && !allSame
    ? 'border-primary/40 bg-primary/[0.03]'
    : 'border-white/[0.08] bg-white/[0.02]'}"
>
  <!-- Card Header -->
  <div class="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
    <div class="flex items-center gap-2.5 min-w-0">
      <span
        class="inline-flex items-center justify-center w-7 h-7 text-[10px] font-black rounded-lg shrink-0"
        style="background-color: {scooter.grade.color}20; color: {scooter.grade.color}"
      >
        {scooter.grade.grade}
      </span>
      <div class="min-w-0">
        <div class="text-sm font-bold text-text-primary truncate">{scooter.name}</div>
        {#if scooter.id === activeKey}
          <span class="text-[9px] font-bold text-primary uppercase tracking-widest">Active</span>
        {/if}
      </div>
    </div>
    <div class="text-right shrink-0">
      <div class="text-lg font-black font-mono {isBest && !allSame ? 'text-primary' : 'text-text-primary'}">
        {scooter.score.toFixed(1)}
      </div>
      <div class="text-[9px] text-text-tertiary">/100</div>
    </div>
  </div>

  <!-- Specs Grid -->
  <div class="p-3.5 space-y-3">
    <div class="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Specs</div>
    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
      {#each comparisonRows.filter((r) => r.section === 'specs') as row}
        {@const best = bestIndex(row, selectedScooters)}
        {@const delta = getDelta(row, scooter, selectedScooters)}
        <div class="flex items-baseline justify-between gap-1">
          <span class="text-[10px] text-text-tertiary shrink-0">{row.label}</span>
          <span class="flex items-baseline gap-1 min-w-0">
            <span class="text-xs font-mono {idx === best ? 'text-primary font-bold' : 'text-text-primary'}"
              >{row.format(scooter)}</span
            >
            {#if delta}
              <span class="text-[9px] font-semibold {delta.class} shrink-0">{delta.text}</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>

    <div class="border-t border-white/[0.06] pt-3">
      <div class="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-2">Calculated</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2">
        {#each comparisonRows.filter((r) => r.section === 'calculated') as row}
          {@const best = bestIndex(row, selectedScooters)}
          {@const delta = getDelta(row, scooter, selectedScooters)}
          <div class="flex items-baseline justify-between gap-1">
            <span class="text-[10px] text-text-tertiary shrink-0">{row.label}</span>
            <span class="flex items-baseline gap-1 min-w-0">
              <span class="text-xs font-mono {idx === best ? 'text-primary font-bold' : 'text-text-primary'}"
                >{row.format(scooter)}</span
              >
              {#if delta}
                <span class="text-[9px] font-semibold {delta.class} shrink-0">{delta.text}</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Winner badge -->
  {#if isBest && !allSame}
    <div class="px-3.5 py-2 bg-primary/10 border-t border-primary/20 text-center">
      <span class="text-[10px] font-black text-primary uppercase tracking-widest">Best Overall</span>
    </div>
  {/if}
</div>
