<script lang="ts">
  let {
    candidate,
    expanded,
    loading = false,
    generatedCode = null,
    copyFeedback = null,
    ontoggle,
    onaction,
    ongeneratecode,
    oncopy,
  }: {
    candidate: any;
    expanded: boolean;
    loading?: boolean;
    generatedCode?: string | null;
    copyFeedback?: string | null;
    ontoggle: () => void;
    onaction: (action: string, key: string, extra?: Record<string, unknown>) => void;
    ongeneratecode: (key: string) => void;
    oncopy: (text: string) => void;
  } = $props();

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const confidenceColor = (c: number) => {
    if (c >= 80) return 'text-green-400';
    if (c >= 60) return 'text-yellow-400';
    if (c >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const confidenceBarColor = (c: number) => {
    if (c >= 80) return 'bg-green-500';
    if (c >= 60) return 'bg-yellow-500';
    if (c >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };
</script>

<div
  class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden transition-all
	{expanded ? 'ring-1 ring-cyan-500/20' : ''}"
>
  <!-- Row header -->
  <button
    type="button"
    onclick={ontoggle}
    class="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
  >
    <!-- Status badge -->
    <span
      class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border {statusColors[
        candidate.status
      ]}"
    >
      {candidate.status}
    </span>

    <!-- Confidence bar -->
    <div class="w-16 flex-shrink-0">
      <div class="flex items-center gap-1.5">
        <div class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all {confidenceBarColor(candidate.validation.confidence)}"
            style="width: {candidate.validation.confidence}%"
          ></div>
        </div>
        <span class="text-[10px] font-mono {confidenceColor(candidate.validation.confidence)}"
          >{candidate.validation.confidence}</span
        >
      </div>
    </div>

    <!-- Name + info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-white truncate">{candidate.name}</span>
        <span class="text-xs text-gray-600">{candidate.year}</span>
      </div>
      <div class="flex gap-3 text-[11px] text-gray-500 mt-0.5">
        {#if candidate.manufacturerSpecs.motorWatts}
          <span>{candidate.manufacturerSpecs.motorWatts}W</span>
        {/if}
        {#if candidate.manufacturerSpecs.batteryWh}
          <span>{candidate.manufacturerSpecs.batteryWh}Wh</span>
        {/if}
        {#if candidate.manufacturerSpecs.topSpeed}
          <span>{candidate.manufacturerSpecs.topSpeed} km/h</span>
        {/if}
        {#if candidate.manufacturerSpecs.range}
          <span>{candidate.manufacturerSpecs.range} km</span>
        {/if}
        {#if candidate.manufacturerSpecs.price}
          <span>${candidate.manufacturerSpecs.price.toLocaleString()}</span>
        {/if}
      </div>
    </div>

    <!-- Validation indicator -->
    <div class="flex-shrink-0 flex items-center gap-2">
      {#if !candidate.validation.valid}
        <span class="text-red-400 text-xs">
          {candidate.validation.issues.filter((i: any) => i.severity === 'error').length} errors
        </span>
      {/if}
      {#if candidate.validation.issues.filter((i: any) => i.severity === 'warning').length > 0}
        <span class="text-yellow-400 text-xs">
          {candidate.validation.issues.filter((i: any) => i.severity === 'warning').length} warnings
        </span>
      {/if}
      {#if candidate.validation.valid && candidate.validation.issues.length === 0}
        <span class="text-green-400 text-xs">Clean</span>
      {/if}
    </div>

    <!-- Source -->
    <div class="flex-shrink-0 text-xs text-gray-600">
      {candidate.sources.discoveredFrom || 'Manual'}
    </div>

    <!-- Expand arrow -->
    <span class="text-gray-500 transition-transform" style:transform={expanded ? 'rotate(180deg)' : ''}> &#9660; </span>
  </button>

  <!-- Expanded Detail -->
  {#if expanded}
    <div class="px-4 pb-4 border-t border-gray-800 space-y-4 pt-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Generated Config -->
        <div>
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Generated Config</h4>
          <div class="bg-[#0a0a0f] border border-gray-800 rounded-lg p-3 space-y-1 text-xs font-mono">
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div><span class="text-gray-500">v:</span> <span class="text-white">{candidate.config.v}V</span></div>
              <div><span class="text-gray-500">ah:</span> <span class="text-white">{candidate.config.ah}Ah</span></div>
              <div>
                <span class="text-gray-500">watts:</span>
                <span class="text-white">{candidate.config.watts}W ×{candidate.config.motors}</span>
              </div>
              <div>
                <span class="text-gray-500">wheel:</span> <span class="text-white">{candidate.config.wheel}"</span>
              </div>
              <div>
                <span class="text-gray-500">weight:</span> <span class="text-white">{candidate.config.weight}kg</span>
              </div>
              {#if candidate.config.scooterWeight}
                <div>
                  <span class="text-gray-500">scooterWt:</span>
                  <span class="text-white">{candidate.config.scooterWeight}kg</span>
                </div>
              {/if}
              <div>
                <span class="text-gray-500">Cd:</span>
                <span class="text-white">{candidate.config.dragCoefficient}</span>
              </div>
              <div>
                <span class="text-gray-500">Crr:</span>
                <span class="text-white">{candidate.config.rollingResistance}</span>
              </div>
              <div>
                <span class="text-gray-500">style:</span> <span class="text-white">{candidate.config.style} Wh/km</span>
              </div>
              <div>
                <span class="text-gray-500">charger:</span> <span class="text-white">{candidate.config.charger}A</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Validation Issues -->
        <div>
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Physics Validation
            <span class="ml-2 {confidenceColor(candidate.validation.confidence)}">
              {candidate.validation.confidence}% confidence
            </span>
          </h4>
          {#if candidate.validation.issues.length === 0}
            <div class="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-sm text-green-400">
              All physics checks passed — config looks valid.
            </div>
          {:else}
            <div class="bg-[#0a0a0f] border border-gray-800 rounded-lg divide-y divide-gray-800">
              {#each candidate.validation.issues as issue}
                <div class="px-3 py-2 flex items-start gap-2 text-xs">
                  <span
                    class="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full
										{issue.severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'}"
                  ></span>
                  <div>
                    <span class="font-medium {issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}">
                      {issue.field}:
                    </span>
                    <span class="text-gray-400 ml-1">{issue.message}</span>
                    {#if issue.expected}
                      <span class="text-gray-600 ml-1">(expected: {issue.expected})</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Admin Notes -->
      {#if candidate.notes}
        <div class="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300">
          <span class="font-bold text-xs uppercase tracking-wider">Note:</span>
          {candidate.notes}
        </div>
      {/if}

      <!-- Generated Code -->
      {#if generatedCode}
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Preset Code</h4>
            <button
              type="button"
              onclick={() => oncopy(generatedCode || '')}
              class="px-3 py-1 text-xs text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              {copyFeedback || 'Copy to clipboard'}
            </button>
          </div>
          <pre
            class="bg-[#0a0a0f] border border-gray-800 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">{generatedCode}</pre>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
        {#if candidate.status !== 'approved'}
          <button
            type="button"
            onclick={() => onaction('approve', candidate.key)}
            disabled={loading}
            class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg
							hover:bg-green-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
        {/if}

        {#if candidate.status !== 'rejected'}
          <button
            type="button"
            onclick={() => {
              const reason = prompt('Rejection reason (optional):');
              if (reason !== null) onaction('reject', candidate.key, { notes: reason || undefined });
            }}
            disabled={loading}
            class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg
							hover:bg-red-500/20 disabled:opacity-50 transition-all"
          >
            Reject
          </button>
        {/if}

        {#if candidate.status !== 'pending'}
          <button
            type="button"
            onclick={() => onaction('reset', candidate.key)}
            disabled={loading}
            class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 bg-white/5 border border-gray-700 rounded-lg
							hover:bg-white/10 disabled:opacity-50 transition-all"
          >
            Reset to Pending
          </button>
        {/if}

        <button
          type="button"
          onclick={() => ongeneratecode(candidate.key)}
          disabled={loading}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg
						hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
        >
          Generate Code
        </button>

        <button
          type="button"
          onclick={() => {
            if (confirm(`Delete candidate "${candidate.name}"? This cannot be undone.`)) {
              onaction('delete', candidate.key);
            }
          }}
          disabled={loading}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-400 bg-white/[0.02] border border-gray-800 rounded-lg
						hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-50 transition-all ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  {/if}
</div>
