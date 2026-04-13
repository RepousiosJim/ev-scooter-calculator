<script lang="ts">
  interface Candidate {
    key: string;
    name: string;
    year: number;
    status: 'pending' | 'approved' | 'rejected';
    sources?: { discoveredFrom?: string };
    manufacturerSpecs?: {
      topSpeed?: number;
      range?: number;
      batteryWh?: number;
      price?: number;
    };
    validation: { confidence: number };
  }

  interface CandidateStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }

  interface Props {
    candidates: {
      pending: Candidate[];
      approved: Candidate[];
      rejected: Candidate[];
      stats: CandidateStats;
    };
    actionInProgress: string | null;
    oncandidateAction: (action: string, key: string) => void;
    onapproveAllPending: () => void;
    confidenceBarColor: (c: number) => string;
    confidenceTextColor: (c: number) => string;
  }

  let {
    candidates,
    actionInProgress,
    oncandidateAction,
    onapproveAllPending,
    confidenceBarColor,
    confidenceTextColor,
  }: Props = $props();

  let candidateTab = $state<'pending' | 'approved' | 'rejected'>('pending');

  const pendingCount = $derived(candidates.stats.pending);
  const approvedCount = $derived(candidates.stats.approved);
  const rejectedCount = $derived(candidates.stats.rejected);

  const currentTabCandidates = $derived.by(() => {
    switch (candidateTab) {
      case 'pending':
        return candidates.pending;
      case 'approved':
        return candidates.approved;
      case 'rejected':
        return candidates.rejected;
    }
  });
</script>

<div class="bg-[#12121a] border border-white/10 rounded-xl overflow-hidden">
  <div class="px-5 py-3 border-b border-white/5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-base">&#128203;</span>
      <h2 class="text-sm font-semibold text-white">Candidate Review</h2>
      <span class="text-[10px] text-gray-500">{candidates.stats.total} total</span>
    </div>
    {#if pendingCount > 0}
      <button
        onclick={onapproveAllPending}
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
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5">
                  {candidate.manufacturerSpecs.topSpeed} km/h
                </span>
              {/if}
              {#if candidate.manufacturerSpecs?.range}
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5">
                  {candidate.manufacturerSpecs.range} km
                </span>
              {/if}
              {#if candidate.manufacturerSpecs?.batteryWh}
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5">
                  {candidate.manufacturerSpecs.batteryWh} Wh
                </span>
              {/if}
              {#if candidate.manufacturerSpecs?.price}
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-gray-400 border border-white/5">
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
                onclick={() => oncandidateAction('approve', candidate.key)}
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
                onclick={() => oncandidateAction('reject', candidate.key)}
                disabled={isLoading}
                class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10
								border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-all"
                title="Reject"
              >
                {isLoading ? '...' : 'Reject'}
              </button>
            {/if}
            <button
              onclick={() => oncandidateAction('delete', candidate.key)}
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
