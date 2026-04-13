<script lang="ts">
  interface ScanLogEntry {
    text: string;
    status: 'ok' | 'fail' | 'info';
  }

  interface DiscoveryResult {
    totalScootersFound: number;
    totalNew: number;
    totalKnown: number;
    candidatesCreated?: number;
    results: Array<{
      name: string;
      totalFound: number;
      newCount: number;
    }>;
  }

  interface RecentRun {
    startedAt?: string;
    status: string;
    totalFound?: number;
    totalNew?: number;
    candidatesCreated?: number;
    errors?: string[];
  }

  interface Props {
    scanning: boolean;
    scanProgress: string;
    scanCurrentMfr: string;
    scanDone: number;
    scanTotal: number;
    scanLog: ScanLogEntry[];
    discoveryResults: DiscoveryResult | null;
    creatingCandidates: boolean;
    candidateCreateResult: { added: number; skipped: number } | null;
    discoveryStats: { scrapableCount: number; totalManufacturers: number };
    recentRuns: RecentRun[];
    onstartScan: () => void;
    onpromoteAllToCandidates: () => void;
    formatDate: (d: string) => string;
  }

  let {
    scanning,
    scanProgress,
    scanCurrentMfr,
    scanDone,
    scanTotal,
    scanLog,
    discoveryResults,
    creatingCandidates,
    candidateCreateResult,
    discoveryStats,
    recentRuns,
    onstartScan,
    onpromoteAllToCandidates,
    formatDate,
  }: Props = $props();

  let discoveryOpen = $state(true);
</script>

<div class="bg-[#12121a] border border-white/10 rounded-xl overflow-hidden">
  <button
    onclick={() => (discoveryOpen = !discoveryOpen)}
    class="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
  >
    <div class="flex items-center gap-3">
      <span class="text-base">&#128270;</span>
      <h2 class="text-sm font-semibold text-white">Discovery Scanner</h2>
      <span class="text-[10px] text-gray-500">
        {discoveryStats.scrapableCount} scrapable of {discoveryStats.totalManufacturers} manufacturers
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
          onclick={onstartScan}
          disabled={scanning}
          class="px-5 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500
					   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors
					   flex items-center gap-2"
        >
          {#if scanning}
            <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
              {#each scanLog as entry, i (i)}
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
                onclick={onpromoteAllToCandidates}
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
          {#each discoveryResults.results as mfrResult (mfrResult.name)}
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
      {#if recentRuns.length > 0}
        <div>
          <h4 class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recent Runs</h4>
          <div class="space-y-1">
            {#each recentRuns.slice(0, 5) as run, i (i)}
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
