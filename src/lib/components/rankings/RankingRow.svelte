<script lang="ts">
  import { TrendingDown, TrendingUp } from 'lucide-svelte';
  import { speedVal, speedUnit, distanceVal, distanceUnit } from '$lib/utils/units';
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
    batteryWh?: number;
    status?: 'current' | 'discontinued' | 'upcoming' | 'unverified';
    hasPriceHistory?: boolean;
    priceChange?: number;
    valueScore?: number;
  }

  interface TierMeta {
    color: string;
    bar: string;
    bg: string;
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

<tr class="hover:bg-white/[0.02] transition-colors {tierMeta.bg} cursor-pointer" onclick={ontoggleexpand}>
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
          class="text-sm font-bold text-text-primary hover:text-primary transition-colors">{scooter.name}</a
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
              {#if scooter.priceChange < 0}<TrendingDown size={10} />{:else}<TrendingUp size={10} />{/if}{Math.abs(
                Math.round(scooter.priceChange)
              )}%
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
      <span class="text-sm font-black {tierMeta.color}">{scooter.score.toFixed(1)}</span>
      <div class="w-12 h-1 bg-white/5 overflow-hidden">
        <div class="h-full {tierMeta.bar}" style:width={`${scooter.score}%`}></div>
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
          ontogglecompare();
        }}
        class="w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0
          {inCompareSelection ? 'bg-primary border-primary text-bg-primary' : 'border-white/20 hover:border-white/40'}"
        aria-label="{inCompareSelection ? 'Remove from' : 'Add to'} comparison"
        disabled={compareDisabled}
      >
        {#if inCompareSelection}
          <span class="text-[10px] font-bold">&#10003;</span>
        {/if}
      </button>
      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation();
          onloadpreset();
        }}
        class="text-[10px] font-bold text-primary hover:text-white hover:bg-primary/20 px-2.5 py-1 rounded transition-colors uppercase tracking-wider border border-primary/30"
      >
        Try it
      </button>
    </div>
  </td>
</tr>
{#if isExpanded}
  {@const b = scooter.breakdown}
  <tr class="bg-white/[0.02]">
    <td colspan="9" class="px-4 py-3">
      <div class="flex items-center gap-6 flex-wrap">
        <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Score Breakdown:</span>
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
