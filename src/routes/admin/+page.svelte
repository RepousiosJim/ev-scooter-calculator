<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { consumeSSE } from '$lib/utils/sse-client';
  import { ArrowDown, ArrowUp } from 'lucide-svelte';

  let { data } = $props();

  interface BatchVerifyEvent {
    totalScooters: number;
    totalUrls: number;
    name: string;
    index: number;
    sourceName: string;
    success: boolean;
    specsFound: number;
    error: string;
    scootersCompleted: number;
    succeeded: number;
    failed: number;
    totalSourcesScraped: number;
    totalSucceeded: number;
    totalFailed: number;
    [key: string]: unknown;
  }

  let batchRunning = $state(false);
  let batchProgress = $state('');
  let batchResult = $state<BatchVerifyEvent | null>(null);
  let batchLiveLog = $state<{ text: string; status: 'ok' | 'fail' | 'info' }[]>([]);
  let batchCurrentScooter = $state('');
  let batchScootersDone = $state(0);
  let batchScootersTotal = $state(0);

  let seeding = $state(false);
  let seedResult = $state<any>(null);
  let importing = $state(false);
  let importResult = $state<string>('');

  // Search & Filter
  let searchQuery = $state('');
  let statusFilter = $state<'all' | 'verified' | 'disputed' | 'no_data' | 'has_data'>('all');
  let sortBy = $state<'name' | 'year' | 'confidence' | 'completeness' | 'sources'>('year');
  let sortDir = $state<'asc' | 'desc'>('desc');

  const filteredScooters = $derived.by(() => {
    let result = [...data.scooters];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: any) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter === 'verified') result = result.filter((s: any) => s.verifiedCount > 0);
    else if (statusFilter === 'disputed') result = result.filter((s: any) => s.disputedCount > 0);
    else if (statusFilter === 'no_data') result = result.filter((s: any) => s.sourceCount === 0);
    else if (statusFilter === 'has_data') result = result.filter((s: any) => s.sourceCount > 0);

    // Sort
    result.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'year':
          cmp = a.year - b.year || a.name.localeCompare(b.name);
          break;
        case 'confidence':
          cmp = a.overallConfidence - b.overallConfidence;
          break;
        case 'completeness':
          cmp = a.completeness - b.completeness;
          break;
        case 'sources':
          cmp = a.sourceCount - b.sourceCount;
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  });

  async function runBatchVerify() {
    batchRunning = true;
    batchProgress = '';
    batchResult = null;
    batchLiveLog = [];
    batchCurrentScooter = '';
    batchScootersDone = 0;
    batchScootersTotal = 0;

    try {
      await consumeSSE('/api/admin/batch-verify', { method: 'POST' }, (event, eventData) => {
        const d = eventData as BatchVerifyEvent;
        switch (event) {
          case 'start':
            batchScootersTotal = d.totalScooters;
            batchProgress = `Starting: ${d.totalScooters} scooters, ${d.totalUrls} URLs to scrape...`;
            break;
          case 'scooter_start':
            batchCurrentScooter = d.name;
            batchProgress = `[${d.index + 1}/${d.totalScooters}] Scraping ${d.name}...`;
            break;
          case 'source':
            batchLiveLog = [
              ...batchLiveLog,
              {
                text: `${d.sourceName}: ${d.success ? `${d.specsFound} specs found` : d.error || 'failed'}`,
                status: d.success ? 'ok' : 'fail',
              },
            ];
            break;
          case 'scooter_done':
            batchScootersDone = d.scootersCompleted;
            batchLiveLog = [
              ...batchLiveLog,
              {
                text: `${d.name} done (${d.succeeded} ok, ${d.failed} failed)`,
                status: d.succeeded > 0 ? 'ok' : 'info',
              },
            ];
            break;
          case 'done':
            batchResult = d;
            batchProgress = `Done! ${d.totalSourcesScraped} sources across ${d.totalScooters} scooters. ${d.totalSucceeded} succeeded, ${d.totalFailed} failed.`;
            break;
        }
      });
      await invalidateAll();
    } catch {
      batchProgress = 'Batch verify failed. Check console for details.';
    } finally {
      batchRunning = false;
    }
  }

  async function runSeed() {
    seeding = true;
    seedResult = null;
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      seedResult = await res.json();
      await invalidateAll();
    } catch {
      seedResult = { error: 'Failed to seed database' };
    } finally {
      seeding = false;
    }
  }

  async function exportData() {
    const res = await fetch('/api/admin/export');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ev-scooter-verification-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      importing = true;
      importResult = '';
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const res = await fetch('/api/admin/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });
        const result = await res.json();
        importResult = `Imported ${result.imported} scooter verifications.`;
        await invalidateAll();
      } catch {
        importResult = 'Import failed. Check file format.';
      } finally {
        importing = false;
      }
    };
    input.click();
  }

  function confidenceColor(c: number): string {
    if (c >= 75) return 'text-green-400';
    if (c >= 50) return 'text-yellow-400';
    if (c >= 25) return 'text-orange-400';
    return 'text-gray-500';
  }

  function confidenceBg(c: number): string {
    if (c >= 75) return 'bg-green-500';
    if (c >= 50) return 'bg-yellow-500';
    if (c >= 25) return 'bg-orange-500';
    return 'bg-gray-600';
  }
</script>

<div class="space-y-6">
  <!-- Stats Cards - Row 1 -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Scooters</p>
      <p class="text-2xl font-bold text-white mt-1">{data.stats.totalScooters}</p>
    </div>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Verified</p>
      <p class="text-2xl font-bold text-green-400 mt-1">{data.stats.totalVerified}</p>
    </div>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Disputed</p>
      <p class="text-2xl font-bold text-orange-400 mt-1">{data.stats.totalDisputed}</p>
    </div>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">No Data</p>
      <p class="text-2xl font-bold text-red-400 mt-1">{data.stats.noDataCount}</p>
    </div>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Avg Confidence</p>
      <p class="text-2xl font-bold {confidenceColor(data.stats.avgConfidence)} mt-1">
        {data.stats.avgConfidence}%
      </p>
    </div>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Completeness</p>
      <p class="text-2xl font-bold {confidenceColor(data.stats.avgCompleteness)} mt-1">
        {data.stats.avgCompleteness}%
      </p>
    </div>
  </div>

  <!-- System Health & Recent Activity Row -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- System Health -->
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-3">
      <h3 class="text-sm font-semibold text-white">System Health</h3>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">Gemini API</span>
          {#if data.systemHealth.geminiConfigured}
            <span class="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Connected</span>
          {:else}
            <span class="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Not configured</span>
          {/if}
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">Source URLs</span>
          <span class="text-white font-mono"
            >{data.systemHealth.totalKnownSourceUrls} across {data.systemHealth.scootersWithSources} scooters</span
          >
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">Scrapable Manufacturers</span>
          <span class="text-white font-mono">{data.systemHealth.scrapableManufacturers}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">Total Sources Collected</span>
          <span class="text-white font-mono">{data.stats.totalSources}</span>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white">Recent Activity</h3>
        <a href="/admin/logs" class="text-[10px] text-cyan-400 hover:text-cyan-300">View all &rarr;</a>
      </div>
      {#if data.recentActivity.length === 0}
        <p class="text-xs text-gray-500">No activity recorded yet.</p>
      {:else}
        <div class="space-y-1.5">
          {#each data.recentActivity as entry}
            <div class="flex items-start gap-2 text-xs">
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1
								{entry.type.includes('completed') || entry.type === 'login' || entry.type === 'seed_completed'
                  ? 'bg-green-500'
                  : entry.type.includes('failed')
                    ? 'bg-red-500'
                    : entry.type.includes('started')
                      ? 'bg-cyan-500'
                      : 'bg-gray-500'}"
              ></span>
              <div class="flex-1 min-w-0">
                <span class="text-gray-300 truncate block">{entry.summary}</span>
                <span class="text-gray-600 text-[10px]">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Smart Alerts Summary -->
  {#if data.alerts.total > 0}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="text-sm font-semibold text-white">Priority Actions</h3>
          <div class="flex items-center gap-1.5">
            {#if data.alerts.critical > 0}
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white"
                >{data.alerts.critical} critical</span
              >
            {/if}
            {#if data.alerts.warning > 0}
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400"
                >{data.alerts.warning} warnings</span
              >
            {/if}
          </div>
        </div>
        <a href="/admin/alerts" class="text-[10px] text-cyan-400 hover:text-cyan-300"
          >View all {data.alerts.total} alerts &rarr;</a
        >
      </div>
      <div class="space-y-1.5">
        {#each data.alerts.topPriority as alert}
          <div
            class="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <span
              class="w-2 h-2 rounded-full flex-shrink-0
							{alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}"
            ></span>
            <span
              class="{alert.severity === 'critical'
                ? 'text-red-400'
                : alert.severity === 'warning'
                  ? 'text-yellow-400'
                  : 'text-blue-400'} font-medium flex-shrink-0"
            >
              {alert.title}
            </span>
            <span class="text-gray-500 truncate">{alert.scooterName}</span>
            <a href={alert.actionUrl} class="ml-auto text-[10px] text-cyan-400 hover:text-cyan-300 flex-shrink-0"
              >{alert.actionLabel || 'View'}</a
            >
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Automated Actions -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
    <h3 class="text-sm font-semibold text-white mb-1">Automated Verification</h3>
    <p class="text-xs text-gray-500 mb-4">
      Populate the database instantly with curated data, or scrape live from manufacturer/retailer sites.
    </p>

    <div class="flex flex-wrap gap-3 mb-3">
      <button
        onclick={runSeed}
        disabled={seeding}
        class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500
					   disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg transition-colors
					   flex items-center gap-2 whitespace-nowrap"
      >
        {#if seeding}
          <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          Seeding...
        {:else}
          Seed Database
        {/if}
      </button>
      <button
        onclick={runBatchVerify}
        disabled={batchRunning}
        class="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500
					   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors
					   flex items-center gap-2 whitespace-nowrap"
      >
        {#if batchRunning}
          <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          Scraping...
        {:else}
          Live Scrape All
        {/if}
      </button>
      <div class="border-l border-gray-700 mx-1"></div>
      <button
        onclick={exportData}
        class="px-4 py-2 text-sm text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
      >
        Export JSON
      </button>
      <button
        onclick={importData}
        disabled={importing}
        class="px-4 py-2 text-sm text-gray-300 bg-white/5 hover:bg-white/10
					   disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
      >
        {importing ? 'Importing...' : 'Import JSON'}
      </button>
    </div>
    {#if importResult}
      <div
        class="mb-3 px-3 py-2 rounded-lg text-xs {importResult.includes('failed')
          ? 'bg-red-500/10 text-red-400'
          : 'bg-green-500/10 text-green-400'}"
      >
        {importResult}
      </div>
    {/if}

    {#if seedResult}
      <div
        class="mb-3 px-3 py-2 rounded-lg text-xs {seedResult.error
          ? 'bg-red-500/10 text-red-400'
          : 'bg-green-500/10 text-green-400'}"
      >
        {seedResult.error || seedResult.message}
      </div>
    {/if}
    {#if batchRunning}
      <!-- Live progress bar -->
      <div class="mt-3 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-cyan-400">{batchCurrentScooter ? `Scraping ${batchCurrentScooter}...` : 'Starting...'}</span
          >
          <span class="text-gray-400 font-mono">{batchScootersDone}/{batchScootersTotal} scooters</span>
        </div>
        <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-cyan-500 rounded-full transition-all duration-300"
            style="width: {batchScootersTotal > 0 ? (batchScootersDone / batchScootersTotal) * 100 : 0}%"
          ></div>
        </div>

        <!-- Scrolling log -->
        {#if batchLiveLog.length > 0}
          <div class="max-h-48 overflow-y-auto bg-[#0a0a0f] border border-gray-800 rounded-lg p-2 space-y-0.5">
            {#each batchLiveLog as entry}
              <div class="flex items-center gap-2 text-xs py-0.5 px-1">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0 {entry.status === 'ok'
                    ? 'bg-green-500'
                    : entry.status === 'fail'
                      ? 'bg-red-500'
                      : 'bg-gray-500'}"
                ></span>
                <span
                  class={entry.status === 'ok'
                    ? 'text-green-400'
                    : entry.status === 'fail'
                      ? 'text-red-400'
                      : 'text-gray-400'}
                >
                  {entry.text}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if batchProgress}
      <div
        class="mt-2 px-3 py-2 rounded-lg text-xs {batchResult
          ? 'bg-green-500/10 text-green-400'
          : 'bg-red-500/10 text-red-400'}"
      >
        {batchProgress}
      </div>
    {/if}
    {#if batchResult && !batchRunning}
      <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div class="bg-white/[0.03] rounded-lg px-3 py-2 text-center">
          <span class="text-gray-400">Sources Scraped</span>
          <p class="text-white font-mono mt-0.5">{batchResult.totalSourcesScraped}</p>
        </div>
        <div class="bg-white/[0.03] rounded-lg px-3 py-2 text-center">
          <span class="text-green-400">Succeeded</span>
          <p class="text-white font-mono mt-0.5">{batchResult.totalSucceeded}</p>
        </div>
        <div class="bg-white/[0.03] rounded-lg px-3 py-2 text-center">
          <span class="text-red-400">Failed</span>
          <p class="text-white font-mono mt-0.5">{batchResult.totalFailed}</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Scooter Table -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-800 space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white">All Scooters</h2>
        <span class="text-[10px] text-gray-500">{filteredScooters.length} of {data.scooters.length}</span>
      </div>
      <!-- Search & Filters -->
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search scooters..."
          class="flex-1 min-w-[150px] bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white
						   placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none"
        />
        <select
          bind:value={statusFilter}
          class="bg-[#0a0a0f] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All status</option>
          <option value="verified">Verified</option>
          <option value="disputed">Disputed</option>
          <option value="has_data">Has data</option>
          <option value="no_data">No data</option>
        </select>
        <select
          bind:value={sortBy}
          class="bg-[#0a0a0f] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="year">Sort: Year</option>
          <option value="name">Sort: Name</option>
          <option value="confidence">Sort: Confidence</option>
          <option value="completeness">Sort: Completeness</option>
          <option value="sources">Sort: Sources</option>
        </select>
        <button
          onclick={() => (sortDir = sortDir === 'asc' ? 'desc' : 'asc')}
          class="px-2 py-1.5 text-xs text-gray-400 hover:text-white bg-[#0a0a0f] border border-gray-700 rounded-lg flex items-center justify-center"
          title="Toggle sort direction"
        >
          {#if sortDir === 'desc'}<ArrowDown size={14} />{:else}<ArrowUp size={14} />{/if}
        </button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th class="text-left px-4 py-3 font-medium">Scooter</th>
            <th class="text-left px-4 py-3 font-medium">Year</th>
            <th class="text-right px-4 py-3 font-medium">Price</th>
            <th class="text-center px-4 py-3 font-medium">Sources</th>
            <th class="text-center px-4 py-3 font-medium">Status</th>
            <th class="text-center px-4 py-3 font-medium">Data</th>
            <th class="text-center px-4 py-3 font-medium">Confidence</th>
            <th class="text-right px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each filteredScooters as scooter}
            <tr class="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
              <td class="px-4 py-3">
                <span class="text-white font-medium">{scooter.name}</span>
              </td>
              <td class="px-4 py-3 text-gray-400">{scooter.year}</td>
              <td class="px-4 py-3 text-right text-gray-300">
                {scooter.price ? `$${scooter.price.toLocaleString()}` : '-'}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-gray-400 font-mono text-xs">{scooter.sourceCount}</span>
              </td>
              <td class="px-4 py-3 text-center">
                {#if scooter.disputedCount > 0}
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-400"
                  >
                    {scooter.disputedCount} disputed
                  </span>
                {:else if scooter.verifiedCount > 0}
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400"
                  >
                    {scooter.verifiedCount} verified
                  </span>
                {:else if scooter.sourceCount > 0}
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400"
                  >
                    has data
                  </span>
                {:else}
                  <span class="text-gray-600 text-[10px]">no data</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <div class="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all {confidenceBg(scooter.completeness)}"
                      style="width: {scooter.completeness}%"
                    ></div>
                  </div>
                  <span class="text-[10px] {confidenceColor(scooter.completeness)} font-mono">
                    {scooter.completeness}%
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <div class="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all {confidenceBg(scooter.overallConfidence)}"
                      style="width: {scooter.overallConfidence}%"
                    ></div>
                  </div>
                  <span class="text-[10px] {confidenceColor(scooter.overallConfidence)} font-mono">
                    {scooter.overallConfidence}%
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <a href="/admin/{scooter.key}" class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  View &rarr;
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
