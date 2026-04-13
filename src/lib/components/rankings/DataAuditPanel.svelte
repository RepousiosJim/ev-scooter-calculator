<script lang="ts">
  import { presetMetadata, CATALOG_VERSION, CATALOG_LAST_UPDATED } from '$lib/data/presets';
  import type { PresetMetadata } from '$lib/types';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

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
    const current = auditData.filter((e) => e.meta.status === 'current').length;
    const discontinued = auditData.filter((e) => e.meta.status === 'discontinued').length;
    const unverified = auditData.filter((e) => e.meta.status === 'unverified').length;
    const upcoming = auditData.filter((e) => e.meta.status === 'upcoming').length;
    const missingUrl = auditData.filter((e) => !e.hasSourceUrl).length;
    const stale = auditData.filter((e) => e.isStale).length;
    const fresh = auditData.filter((e) => e.daysSinceVerified <= 30).length;
    const avgDays =
      total > 0
        ? Math.round(
            auditData.reduce((s, e) => s + (e.daysSinceVerified === Infinity ? 365 : e.daysSinceVerified), 0) / total
          )
        : 0;
    const withPrice = auditData.filter((e) => e.meta.manufacturer?.price).length;
    const withPriceHistory = auditData.filter((e) => e.meta.priceHistory && e.meta.priceHistory.length > 0).length;
    return {
      total,
      current,
      discontinued,
      unverified,
      upcoming,
      missingUrl,
      stale,
      fresh,
      avgDays,
      withPrice,
      withPriceHistory,
    };
  });

  const staleEntries = $derived(
    auditData.filter((e) => e.isStale).sort((a, b) => b.daysSinceVerified - a.daysSinceVerified)
  );
  const missingUrlEntries = $derived(auditData.filter((e) => !e.hasSourceUrl));
  const discontinuedEntries = $derived(auditData.filter((e) => e.meta.status === 'discontinued'));

  function freshnessColor(days: number): string {
    if (days <= 30) return 'text-emerald-400';
    if (days <= 90) return 'text-amber-400';
    if (days <= 180) return 'text-orange-400';
    return 'text-rose-400';
  }

  function freshnessLabel(days: number): string {
    if (days <= 30) return 'Fresh';
    if (days <= 90) return 'OK';
    if (days <= 180) return 'Stale';
    return 'Outdated';
  }

  function freshnessBar(days: number): number {
    return Math.max(0, Math.min(100, 100 - (days / 365) * 100));
  }

  const catalogDaysAgo = $derived(daysSince(CATALOG_LAST_UPDATED));
</script>

<!-- Data Audit Panel -->
<section class="mt-8 border border-white/[0.06] rounded-2xl overflow-hidden">
  <button
    type="button"
    onclick={() => (auditOpen = !auditOpen)}
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
      name={auditOpen ? 'chevron-up' : 'chevron-down'}
      size="sm"
      class="text-text-tertiary group-hover:text-text-secondary transition-colors"
    />
  </button>

  {#if auditOpen}
    <div class="border-t border-white/[0.06] p-4 sm:p-5 space-y-6">
      <!-- Overview Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Current</div>
          <div class="text-lg font-black text-emerald-400 mt-1">{auditStats.current}</div>
          <div class="text-[9px] text-text-tertiary mt-0.5">of {auditStats.total} models</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Fresh Data</div>
          <div
            class="text-lg font-black {auditStats.fresh === auditStats.total
              ? 'text-emerald-400'
              : 'text-amber-400'} mt-1"
          >
            {auditStats.fresh}
          </div>
          <div class="text-[9px] text-text-tertiary mt-0.5">&le;30d since check</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Stale</div>
          <div class="text-lg font-black {auditStats.stale > 0 ? 'text-rose-400' : 'text-emerald-400'} mt-1">
            {auditStats.stale}
          </div>
          <div class="text-[9px] text-text-tertiary mt-0.5">&gt;90d unverified</div>
        </div>
        <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div class="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">No Source URL</div>
          <div class="text-lg font-black {auditStats.missingUrl > 0 ? 'text-orange-400' : 'text-emerald-400'} mt-1">
            {auditStats.missingUrl}
          </div>
          <div class="text-[9px] text-text-tertiary mt-0.5">need linking</div>
        </div>
      </div>

      <!-- Status Distribution Bar -->
      <div>
        <h3 class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Status Distribution</h3>
        <div class="flex h-3 overflow-hidden border border-white/[0.06] rounded-full">
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
        <div class="hidden sm:block border border-white/[0.06] rounded-xl overflow-hidden">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-white/[0.03] border-b border-white/[0.06]">
                <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Model</th>
                <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Status</th>
                <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Source</th>
                <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider text-right"
                  >Last Verified</th
                >
                <th class="py-2 px-3 text-[9px] font-bold text-text-tertiary uppercase tracking-wider w-28"
                  >Freshness</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              {#each auditData.sort((a, b) => b.daysSinceVerified - a.daysSinceVerified) as entry (entry.name)}
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
                      <a
                        href={entry.meta.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-[10px] text-primary hover:text-primary/80 transition-colors underline decoration-primary/30"
                      >
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
                        <div
                          class="h-full {entry.daysSinceVerified <= 30
                            ? 'bg-emerald-400'
                            : entry.daysSinceVerified <= 90
                              ? 'bg-amber-400'
                              : entry.daysSinceVerified <= 180
                                ? 'bg-orange-400'
                                : 'bg-rose-400'} transition-all"
                          style:width={`${freshnessBar(entry.daysSinceVerified)}%`}
                        ></div>
                      </div>
                      <span
                        class="text-[8px] font-bold {freshnessColor(
                          entry.daysSinceVerified
                        )} uppercase tracking-wider w-12 text-right">{freshnessLabel(entry.daysSinceVerified)}</span
                      >
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="sm:hidden space-y-2">
          {#each auditData.sort((a, b) => b.daysSinceVerified - a.daysSinceVerified) as entry (entry.name)}
            <div class="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
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
                  <span class="text-[8px] font-bold text-amber-400 uppercase tracking-wider"
                    >{entry.meta.status ?? 'Unknown'}</span
                  >
                {/if}
                {#if !entry.hasSourceUrl}
                  <span class="text-[8px] text-orange-400">No URL</span>
                {/if}
                <div class="flex-1 h-1 bg-white/5 overflow-hidden">
                  <div
                    class="h-full {entry.daysSinceVerified <= 30
                      ? 'bg-emerald-400'
                      : entry.daysSinceVerified <= 90
                        ? 'bg-amber-400'
                        : 'bg-rose-400'}"
                    style:width={`${freshnessBar(entry.daysSinceVerified)}%`}
                  ></div>
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
                    {staleEntries
                      .slice(0, 5)
                      .map((e) => e.name)
                      .join(', ')}{staleEntries.length > 5 ? ` +${staleEntries.length - 5} more` : ''}
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
                    {missingUrlEntries.map((e) => e.name).join(', ')}
                  </p>
                </div>
              </div>
            {/if}
            {#if discontinuedEntries.length > 0}
              <div class="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <Icon name="info" size="sm" class="text-text-tertiary shrink-0 mt-0.5" />
                <div>
                  <p class="text-xs font-bold text-text-secondary">
                    {discontinuedEntries.length} discontinued model{discontinuedEntries.length !== 1 ? 's' : ''}
                  </p>
                  <p class="text-[10px] text-text-tertiary mt-1">
                    {discontinuedEntries.map((e) => `${e.name}${e.meta.notes ? ` (${e.meta.notes})` : ''}`).join(', ')}
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
