<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  // ----- Reactive state -----
  let scanning = $state(false);
  let scanProgress = $state('');
  let scanCurrentMfr = $state('');
  let scanDone = $state(0);
  let scanTotal = $state(0);
  let scanLog = $state<{ text: string; status: 'ok' | 'fail' | 'info' }[]>([]);
  let discoveryResults = $state<any>(null);

  let creatingCandidates = $state(false);
  let candidateCreateResult = $state<{ added: number; skipped: number } | null>(null);

  let candidateTab = $state<'pending' | 'approved' | 'rejected'>('pending');
  let actionInProgress = $state<string | null>(null);

  let autoFixRunning = $state(false);
  let autoFixResult = $state<any>(null);

  // Collapsible sections
  let discoveryOpen = $state(true);
  let healthOpen = $state(true);

  // ----- Derived -----
  const pendingCount = $derived(data.candidates.stats.pending);
  const approvedCount = $derived(data.candidates.stats.approved);
  const rejectedCount = $derived(data.candidates.stats.rejected);

  const currentTabCandidates = $derived.by(() => {
    switch (candidateTab) {
      case 'pending':
        return data.candidates.pending;
      case 'approved':
        return data.candidates.approved;
      case 'rejected':
        return data.candidates.rejected;
    }
  });

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

    const newScooters: any[] = [];
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
  <div class="flex items-center justify-center gap-0 py-4">
    {#each stages as stage, i}
      {@const isActive = i === activeStage}
      {#if i > 0}
        <div class="w-8 h-0.5 {i <= activeStage ? 'bg-cyan-500' : 'bg-white/10'}"></div>
      {/if}
      <div
        class="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border transition-all
					{isActive ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5' : 'bg-[#12121a] border-white/10'}"
      >
        <span class="text-lg">{stage.icon}</span>
        <span class="text-xl font-bold {isActive ? 'text-cyan-400' : 'text-white'}">{stage.count}</span>
        <span class="text-[10px] uppercase tracking-wider {isActive ? 'text-cyan-400' : 'text-gray-500'}"
          >{stage.label}</span
        >
        <span class="text-[9px] text-gray-600">{stage.sub}</span>
      </div>
    {/each}
  </div>

  <!-- ====== Section: Discovery Scanner ====== -->
  <div class="bg-[#12121a] border border-white/10 rounded-xl overflow-hidden">
    <button
      onclick={() => (discoveryOpen = !discoveryOpen)}
      class="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
    >
      <div class="flex items-center gap-3">
        <span class="text-base">&#128270;</span>
        <h2 class="text-sm font-semibold text-white">Discovery Scanner</h2>
        <span class="text-[10px] text-gray-500">
          {data.discovery.stats.scrapableCount} scrapable of {data.discovery.stats.totalManufacturers} manufacturers
        </span>
      </div>
      <span class="text-gray-500 text-xs transition-transform" style:transform={discoveryOpen ? 'rotate(180deg)' : ''}
        >&#9660;</span
      >
    </button>

    {#if discoveryOpen}
      <div class="px-5 pb-5 space-y-4 border-t border-white/5">
        <!-- Scan button + progress -->
        <div class="flex items-center gap-3 pt-4">
          <button
            onclick={startScan}
            disabled={scanning}
            class="px-5 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500
							   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors
							   flex items-center gap-2"
          >
            {#if scanning}
              <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              ></span>
              Scanning...
            {:else}
              Scan All Manufacturers
            {/if}
          </button>
          {#if scanProgress && !scanning}
            <span class="text-xs text-green-400">{scanProgress}</span>
          {/if}
        </div>

        <!-- Scan progress indicator -->
        {#if scanning}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-cyan-400">{scanCurrentMfr ? `Scanning ${scanCurrentMfr}...` : 'Starting...'}</span>
              <span class="text-gray-400 font-mono">{scanDone}/{scanTotal}</span>
            </div>
            <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style="width: {scanTotal > 0 ? (scanDone / scanTotal) * 100 : 0}%"
              ></div>
            </div>
            {#if scanLog.length > 0}
              <div class="max-h-40 overflow-y-auto bg-[#0a0a0f] border border-white/5 rounded-lg p-2 space-y-0.5">
                {#each scanLog as entry}
                  <div class="flex items-center gap-2 text-xs py-0.5 px-1">
                    <span
                      class="w-1.5 h-1.5 rounded-full flex-shrink-0
											{entry.status === 'ok' ? 'bg-green-500' : entry.status === 'fail' ? 'bg-red-500' : 'bg-gray-500'}"
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
        {/if}

        <!-- Scan results (inline) -->
        {#if discoveryResults && !scanning}
          <div class="bg-[#0a0a0f] border border-white/5 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4 text-xs">
                <span class="text-gray-400"
                  >Total: <span class="text-white font-mono">{discoveryResults.totalScootersFound}</span></span
                >
                <span class="text-green-400">New: <span class="font-mono">{discoveryResults.totalNew}</span></span>
                <span class="text-gray-400">Known: <span class="font-mono">{discoveryResults.totalKnown}</span></span>
              </div>
              {#if discoveryResults.totalNew > 0}
                <button
                  onclick={promoteAllToCandidates}
                  disabled={creatingCandidates}
                  class="px-4 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg
										hover:bg-cyan-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {#if creatingCandidates}
                    <span
                      class="inline-block w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"
                    ></span>
                    Promoting...
                  {:else}
                    Promote All to Candidates ({discoveryResults.totalNew})
                  {/if}
                </button>
              {/if}
            </div>
            {#if candidateCreateResult}
              <div class="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                {candidateCreateResult.added} candidates created{candidateCreateResult.skipped > 0
                  ? `, ${candidateCreateResult.skipped} skipped`
                  : ''}.
              </div>
            {/if}
            <!-- Per-manufacturer results -->
            {#each discoveryResults.results as mfrResult}
              {#if mfrResult.totalFound > 0}
                <div class="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-white/[0.02]">
                  <span class="text-white font-medium">{mfrResult.name}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-gray-400">{mfrResult.totalFound} models</span>
                    {#if mfrResult.newCount > 0}
                      <span class="text-green-400 font-mono">{mfrResult.newCount} new</span>
                    {/if}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {/if}

        <!-- Past runs -->
        {#if data.discovery.recentRuns.length > 0}
          <div>
            <h4 class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recent Runs</h4>
            <div class="space-y-1">
              {#each data.discovery.recentRuns.slice(0, 5) as run}
                <div
                  class="flex items-center justify-between text-xs px-3 py-2 bg-[#0a0a0f] border border-white/5 rounded-lg"
                >
                  <span class="text-gray-400">{formatDate(run.startedAt || '')}</span>
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-medium
										{run.status === 'completed'
                      ? 'bg-green-500/10 text-green-400'
                      : run.status === 'failed'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-cyan-500/10 text-cyan-400'}"
                  >
                    {run.status}
                  </span>
                  <span class="text-gray-300 truncate max-w-[300px]">
                    {#if run.totalFound !== undefined}
                      {run.totalFound} found, {run.totalNew} new{run.candidatesCreated
                        ? `, ${run.candidatesCreated} promoted`
                        : ''}
                    {:else}
                      {run.errors?.length ? run.errors[0] : ''}
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- ====== Section: Candidate Review ====== -->
  <div class="bg-[#12121a] border border-white/10 rounded-xl overflow-hidden">
    <div class="px-5 py-3 border-b border-white/5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-base">&#128203;</span>
        <h2 class="text-sm font-semibold text-white">Candidate Review</h2>
        <span class="text-[10px] text-gray-500">{data.candidates.stats.total} total</span>
      </div>
      {#if pendingCount > 0}
        <button
          onclick={approveAllPending}
          class="px-3 py-1.5 text-[11px] font-medium text-green-400 bg-green-500/10 border border-green-500/20
						rounded-lg hover:bg-green-500/20 transition-colors"
        >
          Approve All Pending ({pendingCount})
        </button>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-white/5">
      <button
        onclick={() => (candidateTab = 'pending')}
        class="flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2
					{candidateTab === 'pending'
          ? 'text-yellow-400 border-yellow-400 bg-yellow-500/5'
          : 'text-gray-500 border-transparent hover:text-gray-300'}"
      >
        Pending ({pendingCount})
      </button>
      <button
        onclick={() => (candidateTab = 'approved')}
        class="flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2
					{candidateTab === 'approved'
          ? 'text-green-400 border-green-400 bg-green-500/5'
          : 'text-gray-500 border-transparent hover:text-gray-300'}"
      >
        Approved ({approvedCount})
      </button>
      <button
        onclick={() => (candidateTab = 'rejected')}
        class="flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2
					{candidateTab === 'rejected'
          ? 'text-red-400 border-red-400 bg-red-500/5'
          : 'text-gray-500 border-transparent hover:text-gray-300'}"
      >
        Rejected ({rejectedCount})
      </button>
    </div>

    <!-- Candidate cards -->
    <div class="p-4 space-y-2">
      {#if currentTabCandidates.length === 0}
        <div class="text-center py-10">
          <p class="text-sm text-gray-500">
            {#if candidateTab === 'pending'}
              No pending candidates. Run a discovery scan to find new scooters.
            {:else if candidateTab === 'approved'}
              No approved candidates yet. Review pending candidates to approve them.
            {:else}
              No rejected candidates.
            {/if}
          </p>
        </div>
      {:else}
        {#each currentTabCandidates as candidate (candidate.key)}
          {@const isLoading = actionInProgress === candidate.key}
          <div
            class="flex items-center gap-3 px-4 py-3 bg-[#0a0a0f] border border-white/5 rounded-xl hover:border-white/10 transition-all"
          >
            <!-- Status dot -->
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0
							{candidate.status === 'pending' ? 'bg-yellow-500' : candidate.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}"
            ></span>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-white truncate">{candidate.name}</span>
                {#if candidate.sources?.discoveredFrom}
                  <span class="text-[10px] text-gray-600">{candidate.sources.discoveredFrom}</span>
                {/if}
                <span class="text-xs text-gray-500">{candidate.year}</span>
              </div>
              <!-- Spec pills -->
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                {#if candidate.manufacturerSpecs?.topSpeed}
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5"
                  >
                    {candidate.manufacturerSpecs.topSpeed} km/h
                  </span>
                {/if}
                {#if candidate.manufacturerSpecs?.range}
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5"
                  >
                    {candidate.manufacturerSpecs.range} km
                  </span>
                {/if}
                {#if candidate.manufacturerSpecs?.batteryWh}
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5"
                  >
                    {candidate.manufacturerSpecs.batteryWh} Wh
                  </span>
                {/if}
                {#if candidate.manufacturerSpecs?.price}
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5"
                  >
                    ${candidate.manufacturerSpecs.price.toLocaleString()}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Confidence bar -->
            <div class="w-20 flex-shrink-0">
              <div class="flex items-center gap-1.5">
                <div class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all {confidenceBarColor(candidate.validation.confidence)}"
                    style="width: {candidate.validation.confidence}%"
                  ></div>
                </div>
                <span class="text-[10px] font-mono {confidenceTextColor(candidate.validation.confidence)}">
                  {candidate.validation.confidence}%
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              {#if candidate.status !== 'approved'}
                <button
                  onclick={() => candidateAction('approve', candidate.key)}
                  disabled={isLoading}
                  class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10
										border border-green-500/20 rounded-lg hover:bg-green-500/20 disabled:opacity-50 transition-all"
                  title="Approve"
                >
                  {isLoading ? '...' : 'Approve'}
                </button>
              {/if}
              {#if candidate.status !== 'rejected'}
                <button
                  onclick={() => candidateAction('reject', candidate.key)}
                  disabled={isLoading}
                  class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10
										border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-all"
                  title="Reject"
                >
                  {isLoading ? '...' : 'Reject'}
                </button>
              {/if}
              <button
                onclick={() => candidateAction('delete', candidate.key)}
                disabled={isLoading}
                class="px-2 py-1.5 text-[10px] text-gray-500 bg-white/[0.02] border border-white/5 rounded-lg
									hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-50 transition-all"
                title="Delete"
              >
                {isLoading ? '...' : 'Del'}
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

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
