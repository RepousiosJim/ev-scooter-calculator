<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { consumeSSE } from '$lib/utils/sse-client';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ConfidenceBadge from '$lib/components/admin/ConfidenceBadge.svelte';
  import SourceEditor from '$lib/components/admin/SourceEditor.svelte';
  import PriceHistory from '$lib/components/admin/PriceHistory.svelte';
  import type { SpecField, VerificationStatus, FieldVerification, SourceEntry } from '$lib/server/verification/types';

  let { data } = $props();

  interface AutoVerifyEvent {
    totalSources: number;
    completed: number;
    total: number;
    sourceName: string;
    success: boolean;
    specsFound: number;
    error?: string;
    results: { sourceName: string; success: boolean; specsFound?: number; error?: string }[];
    totalSourcesScraped: number;
    succeeded: number;
    failed: number;
    [key: string]: unknown;
  }

  let editingField = $state<SpecField | null>(null);
  interface ScrapeResponse {
    success: boolean;
    extractedSpecs: Record<string, number>;
    [key: string]: unknown;
  }

  interface SearchResponse {
    searchResults?: { url: string; title: string }[];
    extractedSpecs: Record<string, { value: number; source: string; url: string }[]>;
    errors?: string[];
    [key: string]: unknown;
  }

  let scrapeUrl = $state('');
  let scraping = $state(false);
  let scrapeResult = $state<ScrapeResponse | null>(null);
  let scrapeError = $state('');

  // Auto-verify state
  let autoVerifying = $state(false);
  let autoVerifyResult = $state<(Partial<AutoVerifyEvent> & { error?: string }) | null>(null);
  let autoVerifyLog = $state<{ text: string; status: 'ok' | 'fail' }[]>([]);
  let autoVerifyProgress = $state({ completed: 0, total: 0 });

  // Web search state
  let searching = $state(false);
  let searchResult = $state<SearchResponse | null>(null);
  let searchError = $state('');

  function getFieldVerification(field: SpecField) {
    const fields = data.verification.fields as Record<string, FieldVerification | undefined>;
    return (
      fields[field] || {
        status: 'unverified' as VerificationStatus,
        sources: [] as SourceEntry[],
        confidence: 0,
      }
    );
  }

  async function updateStatus(field: SpecField, status: VerificationStatus) {
    const fieldData = getFieldVerification(field);
    const verifiedValue =
      status === 'verified' && fieldData.sources.length > 0 ? fieldData.sources[0].value : undefined;

    await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scooterKey: data.scooterKey,
        field,
        status,
        verifiedValue,
      }),
    });
    await invalidateAll();
  }

  async function removeSource(field: SpecField, sourceId: string) {
    await fetch('/api/admin/source', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scooterKey: data.scooterKey,
        field,
        sourceId,
      }),
    });
    await invalidateAll();
  }

  async function triggerScrape() {
    if (!scrapeUrl) return;
    scraping = true;
    scrapeError = '';
    scrapeResult = null;

    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scooterKey: data.scooterKey,
          url: scrapeUrl,
        }),
      });

      const result = await res.json();
      if (result.success) {
        scrapeResult = result;
      } else {
        scrapeError = result.error || 'Scrape failed';
      }
    } catch {
      scrapeError = 'Network error';
    } finally {
      scraping = false;
    }
  }

  async function runAutoVerify() {
    autoVerifying = true;
    autoVerifyResult = null;
    autoVerifyLog = [];
    autoVerifyProgress = { completed: 0, total: 0 };

    try {
      await consumeSSE(
        '/api/admin/auto-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scooterKey: data.scooterKey }),
        },
        (event, eventData) => {
          const d = eventData as AutoVerifyEvent;
          switch (event) {
            case 'start':
              autoVerifyProgress = { completed: 0, total: d.totalSources };
              break;
            case 'source':
              autoVerifyProgress = { completed: d.completed, total: d.total };
              autoVerifyLog = [
                ...autoVerifyLog,
                {
                  text: `${d.sourceName}: ${d.success ? `${d.specsFound} specs found` : d.error || 'failed'}`,
                  status: d.success ? 'ok' : 'fail',
                },
              ];
              break;
            case 'done':
              autoVerifyResult = d;
              break;
          }
        }
      );
      await invalidateAll();
    } catch {
      autoVerifyResult = { error: 'Network error' };
    } finally {
      autoVerifying = false;
    }
  }

  async function runWebSearch() {
    searching = true;
    searchResult = null;
    searchError = '';
    try {
      const res = await fetch('/api/admin/search-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scooterKey: data.scooterKey }),
      });
      const result = await res.json();
      if (Object.keys(result.extractedSpecs || {}).length > 0) {
        searchResult = result;
      } else {
        searchError = result.errors?.join(', ') || 'No specs found from web search';
      }
    } catch {
      searchError = 'Network error';
    } finally {
      searching = false;
    }
  }

  async function importSearchedValue(field: SpecField, value: number, source: string, url: string) {
    const specField = data.specFields.find((s) => s.field === field);
    await fetch('/api/admin/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scooterKey: data.scooterKey,
        field,
        source: {
          type: 'review' as const,
          name: source,
          url,
          value,
          unit: specField?.unit || '',
          addedBy: 'scraper',
        },
      }),
    });
    await invalidateAll();
  }

  async function importScrapedValue(field: SpecField, value: number, unit: string) {
    await fetch('/api/admin/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scooterKey: data.scooterKey,
        field,
        source: {
          type: 'scrape',
          name: `Scraped from ${new URL(scrapeUrl).hostname}`,
          url: scrapeUrl,
          value,
          unit,
          addedBy: 'scraper',
        },
      }),
    });
    await invalidateAll();
  }

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const sourceTypeColors: Record<string, string> = {
    manufacturer: 'bg-blue-500/10 text-blue-400',
    retailer: 'bg-purple-500/10 text-purple-400',
    review: 'bg-yellow-500/10 text-yellow-400',
    community: 'bg-green-500/10 text-green-400',
    scrape: 'bg-cyan-500/10 text-cyan-400',
  };
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">{data.name}</h1>
      <p class="text-sm text-gray-400 mt-0.5">
        {data.year} &middot; Overall confidence:
        <span class="font-mono">{data.verification.overallConfidence}%</span>
        &middot; Last updated: {formatDate(data.verification.lastUpdated)}
      </p>
    </div>
    <a href="/admin" class="text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg transition-colors">
      &larr; Back
    </a>
  </div>

  <!-- Automated Actions -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
    <h3 class="text-sm font-semibold text-white mb-3">Automated Verification</h3>
    <div class="flex flex-wrap gap-3">
      <button
        onclick={runAutoVerify}
        disabled={autoVerifying}
        class="px-4 py-2 text-sm text-white bg-cyan-600 hover:bg-cyan-500
					   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors
					   flex items-center gap-2"
      >
        {#if autoVerifying}
          <span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          Scraping known sources...
        {:else}
          Auto-Verify (Known Sources)
        {/if}
      </button>
      <button
        onclick={runWebSearch}
        disabled={searching}
        class="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500
					   disabled:bg-indigo-800 disabled:cursor-not-allowed rounded-lg transition-colors
					   flex items-center gap-2"
      >
        {#if searching}
          <span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          Searching the web...
        {:else}
          Web Search for Specs
        {/if}
      </button>
    </div>

    {#if autoVerifying}
      <div class="mt-3 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-cyan-400">Scraping sources...</span>
          <span class="text-gray-400 font-mono">{autoVerifyProgress.completed}/{autoVerifyProgress.total}</span>
        </div>
        <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-cyan-500 rounded-full transition-all duration-300"
            style="width: {autoVerifyProgress.total > 0
              ? (autoVerifyProgress.completed / autoVerifyProgress.total) * 100
              : 0}%"
          ></div>
        </div>
        {#if autoVerifyLog.length > 0}
          <div class="max-h-40 overflow-y-auto bg-[#0a0a0f] border border-gray-800 rounded-lg p-2 space-y-0.5">
            {#each autoVerifyLog as entry}
              <div class="flex items-center gap-2 text-xs py-0.5 px-1">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0 {entry.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}"
                ></span>
                <span class={entry.status === 'ok' ? 'text-green-400' : 'text-red-400'}>{entry.text}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if autoVerifyResult}
      <div class="mt-3 space-y-2">
        {#if autoVerifyResult.error}
          <div class="bg-red-500/10 text-red-400 px-3 py-2 rounded-lg text-xs">{autoVerifyResult.error}</div>
        {:else}
          <div class="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-xs">
            <p class="text-green-400 font-medium mb-2">
              Scraped {autoVerifyResult.totalSources} sources: {autoVerifyResult.succeeded} succeeded, {autoVerifyResult.failed}
              failed
            </p>
            {#each autoVerifyResult.results as result}
              <div class="flex items-center gap-2 py-1">
                <span class="w-2 h-2 rounded-full {result.success ? 'bg-green-500' : 'bg-red-500'}"></span>
                <span class="text-gray-300">{result.sourceName}</span>
                {#if result.success}
                  <span class="text-green-400">{result.specsFound} specs found</span>
                {:else}
                  <span class="text-red-400">{result.error}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if searchError}
      <div class="mt-3 bg-red-500/10 text-red-400 px-3 py-2 rounded-lg text-xs">{searchError}</div>
    {/if}

    {#if searchResult}
      <div class="mt-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 space-y-2">
        <p class="text-xs text-indigo-400 font-medium">
          Web search found specs from {searchResult.searchResults?.length || 0} pages:
        </p>
        {#each Object.entries(searchResult.extractedSpecs) as [field, values]}
          {@const specField = data.specFields.find((s) => s.field === field)}
          {@const entries = values as Array<{ value: number; source: string; url: string }>}
          <div class="text-xs">
            <span class="text-gray-300 font-medium">{specField?.label || field}:</span>
            {#each entries as entry}
              <div class="flex items-center justify-between ml-4 py-0.5">
                <span class="text-white font-mono">{entry.value} {specField?.unit || ''}</span>
                <span class="text-gray-500 mx-2">from {entry.source}</span>
                <button
                  onclick={() => importSearchedValue(field as SpecField, entry.value, entry.source, entry.url)}
                  class="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Import
                </button>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Spec Fields Table -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-800">
      <h2 class="text-sm font-semibold text-white">Specifications</h2>
    </div>

    <div class="divide-y divide-gray-800/50">
      {#each data.specFields as spec}
        {@const fieldVerification = getFieldVerification(spec.field)}
        <div class="px-4 py-4">
          <!-- Field Header -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-white">{spec.label}</span>
              <StatusBadge status={fieldVerification.status} />
              <ConfidenceBadge confidence={fieldVerification.confidence} />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-300 font-mono">
                {spec.currentValue !== undefined ? `${spec.currentValue} ${spec.unit}` : 'N/A'}
              </span>
            </div>
          </div>

          <!-- Sources -->
          {#if fieldVerification.sources.length > 0}
            <div class="ml-4 space-y-1.5 mb-2">
              {#each fieldVerification.sources as source}
                <div class="flex items-center justify-between text-xs bg-white/[0.02] rounded-lg px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium {sourceTypeColors[source.type] ||
                        'bg-gray-500/10 text-gray-400'}"
                    >
                      {source.type}
                    </span>
                    <span class="text-gray-300">{source.name}</span>
                    <span class="text-white font-mono font-medium">
                      {source.value}
                      {spec.unit}
                    </span>
                    {#if source.url}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-cyan-400 hover:text-cyan-300"
                      >
                        link
                      </a>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-gray-500">{formatDate(source.fetchedAt)}</span>
                    <button
                      onclick={() => removeSource(spec.field, source.id)}
                      class="text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-4">
            <button
              onclick={() => (editingField = spec.field)}
              class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              + Add Source
            </button>
            <span class="text-gray-700">|</span>
            {#if fieldVerification.status !== 'verified'}
              <button
                onclick={() => updateStatus(spec.field, 'verified')}
                class="text-xs text-green-400/60 hover:text-green-400 transition-colors"
              >
                Mark Verified
              </button>
            {/if}
            {#if fieldVerification.status !== 'disputed'}
              <button
                onclick={() => updateStatus(spec.field, 'disputed')}
                class="text-xs text-orange-400/60 hover:text-orange-400 transition-colors"
              >
                Mark Disputed
              </button>
            {/if}
            {#if fieldVerification.status !== 'outdated'}
              <button
                onclick={() => updateStatus(spec.field, 'outdated')}
                class="text-xs text-yellow-400/60 hover:text-yellow-400 transition-colors"
              >
                Mark Outdated
              </button>
            {/if}
            {#if fieldVerification.status !== 'unverified'}
              <button
                onclick={() => updateStatus(spec.field, 'unverified')}
                class="text-xs text-gray-400/60 hover:text-gray-400 transition-colors"
              >
                Reset
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Web Scraper -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-800">
      <h3 class="text-sm font-semibold text-white">Web Scraper</h3>
    </div>
    <div class="p-4 space-y-3">
      <p class="text-xs text-gray-400">
        Enter a manufacturer or retailer product page URL to automatically extract specs.
      </p>
      <div class="flex gap-2">
        <input
          type="url"
          bind:value={scrapeUrl}
          placeholder="https://example.com/product-page"
          class="flex-1 px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
        <button
          onclick={triggerScrape}
          disabled={scraping || !scrapeUrl}
          class="px-4 py-2 text-sm text-white bg-cyan-600 hover:bg-cyan-500
						   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
        >
          {scraping ? 'Scraping...' : 'Scrape'}
        </button>
      </div>

      {#if scrapeError}
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs">
          {scrapeError}
        </div>
      {/if}

      {#if scrapeResult}
        <div class="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-2">
          <p class="text-xs text-green-400 font-medium">Extracted specs:</p>
          {#each Object.entries(scrapeResult.extractedSpecs) as [field, value]}
            {@const specField = data.specFields.find((s) => s.field === field)}
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-300">
                {specField?.label || field}: <span class="text-white font-mono">{value} {specField?.unit || ''}</span>
              </span>
              <button
                onclick={() => importScrapedValue(field as SpecField, value as number, specField?.unit || '')}
                class="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Import
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Price History -->
  <PriceHistory
    priceHistory={data.verification.priceHistory}
    scooterKey={data.scooterKey}
    onupdated={() => invalidateAll()}
  />
</div>

<!-- Source Editor Modal -->
{#if editingField}
  {@const spec = data.specFields.find((s) => s.field === editingField)}
  {#if spec}
    <SourceEditor
      scooterKey={data.scooterKey}
      field={editingField}
      unit={spec.unit}
      onclose={() => (editingField = null)}
      onsaved={() => invalidateAll()}
    />
  {/if}
{/if}
