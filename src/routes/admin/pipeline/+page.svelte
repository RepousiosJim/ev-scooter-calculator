<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import PipelineProgress from '$lib/components/admin/PipelineProgress.svelte';
  import DiscoveryResults from '$lib/components/admin/DiscoveryResults.svelte';
  import ManufacturerList from '$lib/components/admin/ManufacturerList.svelte';
  import type { AutoFixResult } from '$lib/server/verification/auto-fix';

  interface DiscoveryResult {
    runId: string;
    totalManufacturers: number;
    totalScootersFound: number;
    totalNew: number;
    totalKnown: number;
    candidatesCreated: number;
    autoPromoted: boolean;
    results: Array<{
      manufacturerId: string;
      name: string;
      totalFound: number;
      newCount: number;
      knownCount: number;
      scooters: Array<{ name: string; url: string; isKnown: boolean; [key: string]: unknown }>;
      newScooters: Array<{ name: string; url: string; [key: string]: unknown }>;
      errors: string[];
    }>;
  }

  let { data } = $props();

  // ----- Reactive state -----
  let scanning = $state(false);
  let scanProgress = $state('');
  let scanCurrentMfr = $state('');
  let scanDone = $state(0);
  let scanTotal = $state(0);
  let scanLog = $state<{ text: string; status: 'ok' | 'fail' | 'info' }[]>([]);
  let discoveryResults = $state<DiscoveryResult | null>(null);

  let creatingCandidates = $state(false);
  let candidateCreateResult = $state<{ added: number; skipped: number } | null>(null);

  let actionInProgress = $state<string | null>(null);

  let autoFixRunning = $state(false);
  let autoFixResult = $state<
    (AutoFixResult & { error?: string }) | { error: string; summary?: never; duration?: never } | null
  >(null);

  let healthOpen = $state(true);

  // ----- Derived -----
  const pendingCount = $derived(data.candidates.stats.pending);

  const healthScore = $derived(data.alerts.healthScore);
  const healthColor = $derived(
    healthScore >= 80
      ? 'bg-green-500'
      : healthScore >= 50
        ? 'bg-yellow-500'
        : healthScore >= 25
          ? 'bg-orange-500'
          : 'bg-red-500'
  );

  // ----- Pipeline stage counts -----
  const stages = $derived([
    { label: 'Scan', icon: '\u{1F50D}', count: data.discovery.stats.scrapableCount, sub: 'sources' },
    { label: 'Review', icon: '\u{1F4CB}', count: pendingCount, sub: 'pending' },
    { label: 'Catalog', icon: '\u{2705}', count: data.catalog.totalScooters, sub: 'scooters' },
    { label: 'Health', icon: '\u{1F6E1}', count: healthScore, sub: 'score' },
  ]);
  const activeStage = $derived(pendingCount > 0 ? 1 : scanning ? 0 : 2);

  // ----- SSE Scanner -----
  async function startScan() {
    scanning = true;
    scanProgress = '';
    scanLog = [];
    scanCurrentMfr = '';
    scanDone = 0;
    scanTotal = 0;
    discoveryResults = null;
    candidateCreateResult = null;

    try {
      const res = await fetch('/api/admin/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        scanProgress = `Scan failed: HTTP ${res.status}`;
        scanning = false;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        scanProgress = 'No response stream';
        scanning = false;
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventName = 'message';
          let eventData = '';

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }

          if (!eventData) continue;

          try {
            const d = JSON.parse(eventData);
            switch (eventName) {
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
                    text: `${d.name}: ${d.totalFound} found (${d.newCount} new)`,
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
                scanProgress = `Done! ${d.totalScootersFound} scooters, ${d.totalNew} new.${d.candidatesCreated ? ` ${d.candidatesCreated} auto-promoted to candidates.` : ''}`;
                break;
            }
          } catch {
            // skip malformed events
          }
        }
      }

      await invalidateAll();
    } catch {
      scanProgress = 'Scan failed. Check console.';
    } finally {
      scanning = false;
    }
  }

  // ----- Promote discovered to candidates -----
  async function promoteAllToCandidates() {
    if (!discoveryResults?.results) return;
    creatingCandidates = true;
    candidateCreateResult = null;

    const newScooters: Array<{ name: string; url: string; isKnown: boolean; [key: string]: unknown }> = [];
    for (const mfrResult of discoveryResults.results) {
      for (const scooter of mfrResult.scooters) {
        if (!scooter.isKnown) {
          newScooters.push(scooter);
        }
      }
    }

    if (newScooters.length === 0) {
      candidateCreateResult = { added: 0, skipped: 0 };
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
        candidateCreateResult = { added: result.added, skipped: result.skipped };
        await invalidateAll();
      }
    } catch {
      candidateCreateResult = { added: 0, skipped: 0 };
    } finally {
      creatingCandidates = false;
    }
  }

  // ----- Candidate actions -----
  async function candidateAction(action: string, key: string) {
    actionInProgress = key;
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, key }),
      });
      if (res.ok) {
        await invalidateAll();
      }
    } catch {
      // silent
    } finally {
      actionInProgress = null;
    }
  }

  async function approveAllPending() {
    for (const c of data.candidates.pending) {
      await candidateAction('approve', c.key);
    }
  }

  // ----- Auto-fix -----
  async function runAutoFix() {
    autoFixRunning = true;
    autoFixResult = null;
    try {
      const res = await fetch('/api/admin/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixTypes: ['all'] }),
      });
      autoFixResult = await res.json();
      await invalidateAll();
    } catch {
      autoFixResult = { error: 'Auto-fix failed' };
    } finally {
      autoFixRunning = false;
    }
  }

  // ----- Helpers -----
  function confidenceBarColor(c: number): string {
    if (c >= 80) return 'bg-green-500';
    if (c >= 60) return 'bg-yellow-500';
    if (c >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function confidenceTextColor(c: number): string {
    if (c >= 80) return 'text-green-400';
    if (c >= 60) return 'text-yellow-400';
    if (c >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  function formatDate(d: string): string {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return d;
    }
  }
</script>

<div class="min-h-full bg-[#0a0a0f] space-y-6">
  <!-- ====== Pipeline Progress Bar ====== -->
  <PipelineProgress {stages} {activeStage} />

  <!-- ====== Section: Discovery Scanner ====== -->
  <DiscoveryResults
    {scanning}
    {scanProgress}
    {scanCurrentMfr}
    {scanDone}
    {scanTotal}
    {scanLog}
    {discoveryResults}
    {creatingCandidates}
    {candidateCreateResult}
    discoveryStats={data.discovery.stats}
    recentRuns={data.discovery.recentRuns}
    onstartScan={startScan}
    onpromoteAllToCandidates={promoteAllToCandidates}
    {formatDate}
  />

  <!-- ====== Section: Candidate Review ====== -->
  <ManufacturerList
    candidates={data.candidates}
    {actionInProgress}
    oncandidateAction={candidateAction}
    onapproveAllPending={approveAllPending}
    {confidenceBarColor}
    {confidenceTextColor}
  />

  <!-- ====== Section: System Health ====== -->
  <div class="bg-[#12121a] border border-white/10 rounded-xl overflow-hidden">
    <button
      onclick={() => (healthOpen = !healthOpen)}
      class="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
    >
      <div class="flex items-center gap-3">
        <span class="text-base">&#128737;</span>
        <h2 class="text-sm font-semibold text-white">System Health</h2>
      </div>
      <span class="text-gray-500 text-xs transition-transform" style:transform={healthOpen ? 'rotate(180deg)' : ''}
        >&#9660;</span
      >
    </button>

    {#if healthOpen}
      <div class="px-5 pb-4 border-t border-white/5 pt-4">
        <div class="flex flex-wrap items-center gap-6">
          <!-- Health score bar -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <span class="text-xs text-gray-500">Health</span>
            <div class="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all {healthColor}" style="width: {healthScore}%"></div>
            </div>
            <span
              class="text-sm font-bold {healthScore >= 80
                ? 'text-green-400'
                : healthScore >= 50
                  ? 'text-yellow-400'
                  : 'text-red-400'}"
            >
              {healthScore}%
            </span>
          </div>

          <!-- Alert counts -->
          <div class="flex items-center gap-3 text-xs">
            {#if data.alerts.critical > 0}
              <span class="px-2 py-1 rounded-full bg-red-500/10 text-red-400 font-medium">
                {data.alerts.critical} critical
              </span>
            {/if}
            {#if data.alerts.warning > 0}
              <span class="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
                {data.alerts.warning} warnings
              </span>
            {/if}
            {#if data.alerts.total > 0 && data.alerts.total - data.alerts.critical - data.alerts.warning > 0}
              <span class="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                {data.alerts.total - data.alerts.critical - data.alerts.warning} info
              </span>
            {/if}
            {#if data.alerts.total === 0}
              <span class="text-green-400">No alerts</span>
            {/if}
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-auto">
            <button
              onclick={runAutoFix}
              disabled={autoFixRunning}
              class="px-4 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20
								rounded-lg hover:bg-cyan-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {#if autoFixRunning}
                <span
                  class="inline-block w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"
                ></span>
                Fixing...
              {:else}
                Run Auto-Fix
              {/if}
            </button>
            <a
              href="/admin/alerts"
              class="px-4 py-1.5 text-xs font-medium text-gray-400 bg-white/[0.03] border border-white/10
								rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              View All Alerts
            </a>
          </div>
        </div>

        {#if autoFixResult}
          <div
            class="mt-3 px-3 py-2 rounded-lg text-xs
						{autoFixResult.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}"
          >
            {#if autoFixResult.error}
              {autoFixResult.error}
            {:else if autoFixResult.summary}
              Auto-fix complete: {autoFixResult.summary.totalActions} action(s) in {autoFixResult.duration}ms
            {:else}
              Auto-fix complete.
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
