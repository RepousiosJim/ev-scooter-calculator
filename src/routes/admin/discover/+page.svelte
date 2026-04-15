<script lang="ts">
  import { consumeSSE } from '$lib/utils/sse-client';

  let { data } = $props();

  // Discovery state
  let scanning = $state(false);
  let scanProgress = $state('');
  let scanLog = $state<{ text: string; status: 'ok' | 'fail' | 'info' }[]>([]);
  let scanCurrentMfr = $state('');
  let scanDone = $state(0);
  let scanTotal = $state(0);
  interface DiscoverEvent {
    totalManufacturers: number;
    name: string;
    index: number;
    totalFound: number;
    newCount: number;
    errors: string[];
    totalScootersFound: number;
    totalNew: number;
    totalKnown: number;
    results: {
      name: string;
      totalFound: number;
      scooters: { name: string; year?: number; isKnown: boolean; specs: Record<string, number>; url?: string }[];
    }[];
    [key: string]: unknown;
  }

  let discoveryResults = $state<DiscoverEvent | null>(null);

  // Single manufacturer scan
  let scanningId = $state<string | null>(null);

  async function scanAll() {
    scanning = true;
    scanProgress = '';
    scanLog = [];
    scanCurrentMfr = '';
    scanDone = 0;
    scanTotal = 0;
    discoveryResults = null;

    try {
      await consumeSSE(
        '/api/admin/discover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        (event, eventData) => {
          const d = eventData as DiscoverEvent;
          switch (event) {
            case 'start':
              scanTotal = d.totalManufacturers;
              scanProgress = `Scanning ${d.totalManufacturers} manufacturers...`;
              break;
            case 'scanning':
              scanCurrentMfr = d.name;
              scanDone = d.index;
              break;
            case 'manufacturer_done':
              scanDone = d.index !== undefined ? d.index + 1 : scanDone + 1;
              scanLog = [
                ...scanLog,
                {
                  text: `${d.name}: ${d.totalFound} scooters found (${d.newCount} new)`,
                  status: d.newCount > 0 ? 'ok' : d.totalFound > 0 ? 'info' : 'fail',
                },
              ];
              if (d.errors?.length > 0) {
                for (const err of d.errors) {
                  scanLog = [...scanLog, { text: `  ${err}`, status: 'fail' }];
                }
              }
              break;
            case 'done':
              discoveryResults = d;
              scanProgress = `Done! Found ${d.totalScootersFound} scooters across ${d.totalManufacturers} manufacturers. ${d.totalNew} new!`;
              break;
          }
        }
      );
    } catch {
      scanProgress = 'Scan failed. Check console.';
    } finally {
      scanning = false;
    }
  }

  async function scanOne(manufacturerId: string) {
    scanningId = manufacturerId;
    scanLog = [];
    discoveryResults = null;

    try {
      await consumeSSE(
        '/api/admin/discover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manufacturerId }),
        },
        (event, eventData) => {
          const d = eventData as DiscoverEvent;
          if (event === 'manufacturer_done') {
            scanLog = [
              {
                text: `${d.name}: ${d.totalFound} scooters found (${d.newCount} new)`,
                status: d.newCount > 0 ? 'ok' : d.totalFound > 0 ? 'info' : 'fail',
              },
            ];
            if (d.errors?.length > 0) {
              for (const err of d.errors) {
                scanLog = [...scanLog, { text: `  ${err}`, status: 'fail' }];
              }
            }
          }
          if (event === 'done') {
            discoveryResults = d;
          }
        }
      );
    } catch {
      scanLog = [{ text: 'Scan failed', status: 'fail' }];
    } finally {
      scanningId = null;
    }
  }

  // Create candidates from discovery results
  let creatingCandidates = $state(false);
  let candidateResult = $state<{ added: number; skipped: number } | null>(null);

  async function createCandidatesFromResults() {
    if (!discoveryResults?.results) return;
    creatingCandidates = true;
    candidateResult = null;

    // Collect all new (non-known) scooters across all manufacturer results
    const newScooters: {
      name: string;
      year?: number;
      isKnown: boolean;
      specs: Record<string, number>;
      url?: string;
    }[] = [];
    for (const mfrResult of discoveryResults.results) {
      for (const scooter of mfrResult.scooters) {
        if (!scooter.isKnown) {
          newScooters.push(scooter);
        }
      }
    }

    if (newScooters.length === 0) {
      candidateResult = { added: 0, skipped: 0 };
      creatingCandidates = false;
      return;
    }

    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', scooters: newScooters }),
      });
      const result = await res.json();
      if (result.success) {
        candidateResult = { added: result.added, skipped: result.skipped };
      } else {
        candidateResult = { added: 0, skipped: 0 };
      }
    } catch {
      candidateResult = { added: 0, skipped: 0 };
    } finally {
      creatingCandidates = false;
    }
  }

  const tierColors: Record<string, string> = {
    budget: 'bg-green-500/10 text-green-400',
    mid: 'bg-blue-500/10 text-blue-400',
    premium: 'bg-purple-500/10 text-purple-400',
    ultra: 'bg-orange-500/10 text-orange-400',
    mixed: 'bg-gray-500/10 text-gray-400',
  };
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Discover New Scooters</h1>
      <p class="text-sm text-gray-400 mt-0.5">
        Scan manufacturer &amp; retailer sites to find new scooter models not yet in the calculator.
      </p>
    </div>
    <button
      onclick={scanAll}
      disabled={scanning}
      class="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-500
				   disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg transition-colors
				   flex items-center gap-2 whitespace-nowrap"
    >
      {#if scanning}
        <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        Scanning...
      {:else}
        Scan All Manufacturers
      {/if}
    </button>
  </div>

  <!-- Status Summary Chips — shown after a scan has results -->
  {#if discoveryResults && !scanning}
    <div class="flex flex-wrap items-center gap-2">
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
               bg-white/[0.05] border border-white/[0.08] text-gray-300"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        {discoveryResults.totalScootersFound} total
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
               bg-green-500/10 border border-green-500/20 text-green-400"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {discoveryResults.totalNew} new
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
               bg-white/[0.03] border border-white/[0.06] text-gray-500"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
        {discoveryResults.totalKnown} already known
      </span>
      {#if candidateResult}
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          {candidateResult.added} candidates created
        </span>
        {#if candidateResult.skipped > 0}
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                   bg-white/[0.03] border border-white/[0.06] text-gray-500"
          >
            {candidateResult.skipped} duplicates skipped
          </span>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Scan Progress -->
  {#if scanning}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between text-xs">
        <span class="text-green-400">{scanCurrentMfr ? `Scanning ${scanCurrentMfr}...` : 'Starting...'}</span>
        <span class="text-gray-400 font-mono">{scanDone}/{scanTotal}</span>
      </div>
      <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-green-500 rounded-full transition-all duration-300"
          style="width: {scanTotal > 0 ? (scanDone / scanTotal) * 100 : 0}%"
        ></div>
      </div>
      {#if scanLog.length > 0}
        <div class="max-h-48 overflow-y-auto bg-[#0a0a0f] border border-gray-800 rounded-lg p-2 space-y-0.5">
          {#each scanLog as entry, i (i)}
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
  {:else if scanProgress}
    <div class="bg-green-500/10 text-green-400 px-4 py-3 rounded-xl text-sm">
      {scanProgress}
    </div>
  {/if}

  <!-- Discovery Results -->
  {#if discoveryResults && !scanning}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white">Discovery Results</h2>
        <div class="flex items-center gap-4 text-xs">
          <span class="text-gray-400"
            >Total: <span class="text-white font-mono">{discoveryResults.totalScootersFound}</span></span
          >
          <span class="text-green-400">New: <span class="font-mono">{discoveryResults.totalNew}</span></span>
          <span class="text-gray-400">Known: <span class="font-mono">{discoveryResults.totalKnown}</span></span>
          {#if discoveryResults.totalNew > 0}
            <button
              onclick={createCandidatesFromResults}
              disabled={creatingCandidates}
              class="px-4 py-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg
								hover:bg-yellow-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {#if creatingCandidates}
                <span
                  class="inline-block w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"
                ></span>
                Creating...
              {:else}
                Create {discoveryResults.totalNew} Candidates
              {/if}
            </button>
          {/if}
        </div>
      </div>

      {#if candidateResult}
        <div class="bg-yellow-500/10 text-yellow-400 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between">
          <span>
            {candidateResult.added} candidates created{candidateResult.skipped > 0
              ? `, ${candidateResult.skipped} duplicates skipped`
              : ''}.
          </span>
          <a href="/admin/candidates" class="text-xs text-cyan-400 hover:text-cyan-300 underline">
            Review Candidates &rarr;
          </a>
        </div>
      {/if}

      {#each discoveryResults.results as mfrResult (mfrResult.name)}
        {#if mfrResult.scooters.length > 0}
          <div class="border border-gray-800 rounded-lg overflow-hidden">
            <div class="px-4 py-2 bg-white/[0.02] border-b border-gray-800 flex items-center justify-between">
              <span class="text-sm font-medium text-white">{mfrResult.name}</span>
              <span class="text-xs text-gray-400">{mfrResult.totalFound} models</span>
            </div>
            <div class="divide-y divide-gray-800/50">
              {#each mfrResult.scooters as scooter (scooter.name)}
                <div class="px-4 py-2.5 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    {#if scooter.isKnown}
                      <span class="w-2 h-2 rounded-full bg-gray-500"></span>
                    {:else}
                      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {/if}
                    <div>
                      <span class="text-sm {scooter.isKnown ? 'text-gray-400' : 'text-white font-medium'}">
                        {scooter.name}
                      </span>
                      {#if scooter.year}
                        <span class="text-xs text-gray-500 ml-2">({scooter.year})</span>
                      {/if}
                      {#if scooter.isKnown}
                        <span class="text-xs text-gray-600 ml-2">already in system</span>
                      {:else}
                        <span
                          class="inline-flex ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400"
                          >NEW</span
                        >
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-4 text-xs text-gray-400">
                    {#if scooter.specs.price}
                      <span>${scooter.specs.price.toLocaleString()}</span>
                    {/if}
                    {#if scooter.specs.topSpeed}
                      <span>{scooter.specs.topSpeed} km/h</span>
                    {/if}
                    {#if scooter.specs.range}
                      <span>{scooter.specs.range} km</span>
                    {/if}
                    {#if scooter.specs.batteryWh}
                      <span>{scooter.specs.batteryWh} Wh</span>
                    {/if}
                    {#if scooter.url && !scooter.isKnown}
                      <a
                        href={scooter.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-cyan-400 hover:text-cyan-300"
                      >
                        view &rarr;
                      </a>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Non-scan log display -->
  {#if !scanning && scanLog.length > 0 && !discoveryResults}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <div class="space-y-0.5">
        {#each scanLog as entry, i (i)}
          <div class="flex items-center gap-2 text-xs py-0.5">
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
    </div>
  {/if}

  <!-- Manufacturer Registry -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-white">Manufacturer Registry</h2>
      <span class="text-xs text-gray-500"
        >{data.totalManufacturers} manufacturers ({data.scrapableCount} scrapable)</span
      >
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th class="text-left px-4 py-3 font-medium">Manufacturer</th>
            <th class="text-left px-4 py-3 font-medium">Country</th>
            <th class="text-center px-4 py-3 font-medium">Tier</th>
            <th class="text-center px-4 py-3 font-medium">Known Models</th>
            <th class="text-center px-4 py-3 font-medium">Scrapable</th>
            <th class="text-right px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.manufacturers as mfr (mfr.id)}
            <tr class="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
              <td class="px-4 py-3">
                <a
                  href={mfr.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-white font-medium hover:text-cyan-400 transition-colors"
                >
                  {mfr.name}
                </a>
              </td>
              <td class="px-4 py-3 text-gray-400 text-xs">{mfr.country}</td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium {tierColors[mfr.tier] ||
                    'bg-gray-500/10 text-gray-400'}"
                >
                  {mfr.tier}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-gray-400">{mfr.knownScooterCount}</td>
              <td class="px-4 py-3 text-center">
                {#if mfr.scrapable}
                  <span class="text-green-400 text-xs">Yes</span>
                {:else}
                  <span class="text-gray-600 text-xs">JS-only</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right">
                {#if mfr.scrapable}
                  <button
                    onclick={() => scanOne(mfr.id)}
                    disabled={scanningId === mfr.id || scanning}
                    class="text-xs text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors"
                  >
                    {scanningId === mfr.id ? 'Scanning...' : 'Scan'}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
