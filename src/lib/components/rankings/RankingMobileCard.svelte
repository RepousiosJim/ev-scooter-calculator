<script lang="ts">
  import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-svelte';
  import { speedVal, distanceVal } from '$lib/utils/units';
  import { formatPrice } from '$lib/utils/formatters';
  import type { PerformanceStats } from '$lib/types';
  import type { ScoreBreakdown } from '$lib/utils/scoring';

  interface RankedScooter {
    key: string;
    name: string;
    year: number;
    stats: PerformanceStats;
    score: number;
    breakdown: ScoreBreakdown;
    price?: number;
    status?: 'current' | 'discontinued' | 'upcoming' | 'unverified';
    hasPriceHistory?: boolean;
    priceChange?: number;
    valueScore?: number;
  }

  interface TierMeta {
    color: string;
    bar: string;
    bg: string;
    border: string;
  }

  interface Props {
    scooter: RankedScooter;
    rank: number;
    tierMeta: TierMeta;
    isExpanded: boolean;
    inCompareSelection: boolean;
    compareDisabled: boolean;
    ontoggleexpand: () => void;
    ontogglecompare: () => void;
    onloadpreset: () => void;
  }

  let {
    scooter,
    rank,
    tierMeta,
    isExpanded,
    inCompareSelection,
    compareDisabled,
    ontoggleexpand,
    ontogglecompare,
    onloadpreset,
  }: Props = $props();
</script>

<div class="border {tierMeta.bg} {tierMeta.border}">
  <!-- Top row: rank + name + score -->
  <button type="button" class="w-full text-left p-3.5" onclick={ontoggleexpand}>
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
                {#if scooter.priceChange < 0}<TrendingDown size={9} />{:else}<TrendingUp size={9} />{/if}{Math.abs(
                  Math.round(scooter.priceChange)
                )}%
              </span>
            {/if}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="text-lg font-black {tierMeta.color}">{scooter.score.toFixed(1)}</span>
        <span class="text-[10px] text-text-tertiary">/100</span>
      </div>
    </div>

    <!-- Score bar -->
    <div class="h-1 w-full bg-white/5 overflow-hidden mb-3">
      <div class="h-full {tierMeta.bar}" style:width={`${scooter.score}%`}></div>
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
  {#if isExpanded}
    {@const b = scooter.breakdown}
    <div class="px-3.5 pb-3 space-y-2.5">
      <div class="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
        <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Score Breakdown</div>
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
        <div class="inline-flex items-center gap-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider">
          <AlertTriangle size={10} /> Battery strain {scooter.stats.cRate.toFixed(1)}C
        </div>
      {/if}

      <div class="flex gap-2">
        <button
          type="button"
          onclick={ontogglecompare}
          class="flex-1 py-2 text-[10px] font-bold border rounded transition-colors uppercase tracking-wider
            {inCompareSelection
            ? 'text-primary bg-primary/10 border-primary/30'
            : 'text-text-tertiary hover:text-text-secondary border-white/10 hover:border-white/20'}"
          disabled={compareDisabled}
        >
          {inCompareSelection ? 'Selected' : 'Compare'}
        </button>
        <button
          type="button"
          onclick={onloadpreset}
          class="flex-1 py-2 text-[10px] font-bold text-primary hover:bg-primary/10 border border-primary/20 rounded transition-colors uppercase tracking-wider"
        >
          Calculator
        </button>
      </div>
    </div>
  {/if}
</div>
