<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let filter = $state('all');

  const typeLabels: Record<string, string> = {
    scan_started: 'Scan Started',
    scan_completed: 'Scan Completed',
    scan_failed: 'Scan Failed',
    discovery_started: 'Discovery Started',
    discovery_completed: 'Discovery Completed',
    discovery_failed: 'Discovery Failed',
    source_added: 'Source Added',
    source_removed: 'Source Removed',
    status_changed: 'Status Changed',
    price_added: 'Price Added',
    seed_completed: 'Seed Completed',
    settings_changed: 'Settings Changed',
    login: 'Login',
    export: 'Export',
  };

  const typeColors: Record<string, string> = {
    scan_started: 'text-cyan-400',
    scan_completed: 'text-green-400',
    scan_failed: 'text-red-400',
    discovery_started: 'text-cyan-400',
    discovery_completed: 'text-green-400',
    discovery_failed: 'text-red-400',
    source_added: 'text-blue-400',
    source_removed: 'text-orange-400',
    status_changed: 'text-purple-400',
    price_added: 'text-yellow-400',
    seed_completed: 'text-green-400',
    settings_changed: 'text-gray-400',
    login: 'text-gray-400',
    export: 'text-gray-400',
  };

  const typeDotColors: Record<string, string> = {
    scan_started: 'bg-cyan-500',
    scan_completed: 'bg-green-500',
    scan_failed: 'bg-red-500',
    discovery_started: 'bg-cyan-500',
    discovery_completed: 'bg-green-500',
    discovery_failed: 'bg-red-500',
    source_added: 'bg-blue-500',
    source_removed: 'bg-orange-500',
    status_changed: 'bg-purple-500',
    price_added: 'bg-yellow-500',
    seed_completed: 'bg-green-500',
    settings_changed: 'bg-gray-500',
    login: 'bg-gray-500',
    export: 'bg-gray-500',
  };

  const filteredEntries = $derived(filter === 'all' ? data.entries : data.entries.filter((e) => e.type === filter));

  const filterTypes = $derived.by(() => {
    const types = new Set(data.entries.map((e) => e.type));
    return Array.from(types) as string[];
  });

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  function formatTimeFull(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  let clearing = $state(false);

  async function clearLog() {
    if (!confirm('Clear all activity log entries?')) return;
    clearing = true;
    try {
      await fetch('/api/admin/activity-log', { method: 'DELETE' });
      data.entries = [];
      data.total = 0;
    } finally {
      clearing = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Activity Log</h1>
      <p class="text-sm text-gray-400 mt-0.5">Track all admin actions, scans, and system events.</p>
    </div>
    <button
      onclick={clearLog}
      disabled={clearing || data.entries.length === 0}
      class="px-4 py-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20
				   disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
    >
      Clear Log
    </button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-2">
    <button
      onclick={() => (filter = 'all')}
      class="px-3 py-1.5 rounded-lg text-xs transition-colors {filter === 'all'
        ? 'bg-white/10 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/5'}"
    >
      All ({data.total})
    </button>
    {#each filterTypes as type (type)}
      <button
        onclick={() => (filter = type)}
        class="px-3 py-1.5 rounded-lg text-xs transition-colors {filter === type
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/5'}"
      >
        {typeLabels[type] || type}
      </button>
    {/each}
  </div>

  <!-- Log entries -->
  {#if filteredEntries.length === 0}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-8 text-center">
      <p class="text-gray-500 text-sm">No activity recorded yet.</p>
      <p class="text-gray-600 text-xs mt-1">Actions like scans, source changes, and verifications will appear here.</p>
    </div>
  {:else}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800/50">
      {#each filteredEntries as entry, i (i)}
        <div class="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
          <span class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 {typeDotColors[entry.type] || 'bg-gray-500'}"></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium {typeColors[entry.type] || 'text-gray-400'}">
                {typeLabels[entry.type] || entry.type}
              </span>
              <span class="text-[10px] text-gray-600" title={formatTimeFull(entry.timestamp)}>
                {formatTime(entry.timestamp)}
              </span>
            </div>
            <p class="text-sm text-gray-300 mt-0.5">{entry.summary}</p>
            {#if entry.details}
              <details class="mt-1">
                <summary class="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400">Details</summary>
                <pre class="text-[10px] text-gray-500 mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(
                    entry.details,
                    null,
                    2
                  )}</pre>
              </details>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
