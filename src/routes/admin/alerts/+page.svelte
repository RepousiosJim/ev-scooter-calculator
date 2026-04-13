<script lang="ts">
  import { untrack } from 'svelte';
  let { data } = $props();

  let alertSummary = $state(untrack(() => data.alertSummary));

  let activeFilter = $state<string>('all');
  let activeTab = $state<'alerts' | 'changelog'>('alerts');
  let isFixing = $state(false);
  let fixResult = $state<{
    success: boolean;
    summary: {
      anomaliesFixed: number;
      scootersSeeded: number;
      fieldsSeeded: number;
      conflictsResolved: number;
      duplicatesRemoved: number;
      totalActions: number;
    };
    duration: number;
  } | null>(null);

  async function runAutoFix(fixTypes: string[] = ['all']) {
    isFixing = true;
    fixResult = null;
    try {
      const res = await fetch('/api/admin/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixTypes }),
      });
      const result = await res.json();
      fixResult = result;

      // Refresh alert data after a short delay to let the store flush
      if (result.success && result.summary.totalActions > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      console.error('Auto-fix failed:', e);
    } finally {
      isFixing = false;
    }
  }

  const severityColors: Record<string, string> = {
    critical: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const severityBg: Record<string, string> = {
    critical: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
  };

  const severityDot: Record<string, string> = {
    critical: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  const categoryLabels: Record<string, string> = {
    conflict: 'Data Conflicts',
    stale: 'Stale Data',
    missing: 'Missing Specs',
    anomaly: 'Anomalies',
    price_change: 'Price Changes',
    low_confidence: 'Low Confidence',
    no_sources: 'No Data',
  };

  const changeTypeLabels: Record<string, string> = {
    value_changed: 'Value Changed',
    source_added: 'Source Added',
    source_removed: 'Source Removed',
    price_changed: 'Price Changed',
    status_changed: 'Status Changed',
  };

  const changeTypeDot: Record<string, string> = {
    value_changed: 'bg-purple-500',
    source_added: 'bg-green-500',
    source_removed: 'bg-red-500',
    price_changed: 'bg-yellow-500',
    status_changed: 'bg-blue-500',
  };

  const filteredAlerts = $derived(
    activeFilter === 'all'
      ? alertSummary.alerts
      : activeFilter === 'critical'
        ? alertSummary.alerts.filter((a: any) => a.severity === 'critical')
        : activeFilter === 'warning'
          ? alertSummary.alerts.filter((a: any) => a.severity === 'warning')
          : alertSummary.alerts.filter((a: any) => a.category === activeFilter)
  );

  function healthColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  function healthBg(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function timeAgo(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
</script>

<div class="space-y-6">
  <!-- Header with Health Score -->
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Smart Alerts</h1>
      <p class="text-sm text-gray-400 mt-0.5">
        Automated data quality checks, conflict detection, and recommendations.
      </p>
    </div>
    <div class="text-right">
      <div class="text-[10px] text-gray-500 uppercase tracking-wider">System Health</div>
      <div class="flex items-center gap-2 mt-1">
        <div class="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all {healthBg(alertSummary.healthScore)}"
            style="width: {alertSummary.healthScore}%"
          ></div>
        </div>
        <span class="text-lg font-bold {healthColor(alertSummary.healthScore)}">
          {alertSummary.healthScore}%
        </span>
      </div>
    </div>
  </div>

  <!-- Auto-Fix Controls -->
  <div class="bg-[#12121a] border border-white/10 rounded-xl p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-semibold text-white">Auto-Fix Pipeline</h3>
        <p class="text-[11px] text-gray-500 mt-0.5">
          Automatically clean anomalies, seed missing data, resolve conflicts, and remove duplicates.
        </p>
      </div>
      <button
        onclick={() => runAutoFix(['all'])}
        disabled={isFixing}
        class="px-4 py-2 text-sm font-medium rounded-lg transition-all
					   {isFixing
          ? 'bg-white/5 text-gray-500 cursor-wait'
          : 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 hover:text-cyan-300'}"
      >
        {#if isFixing}
          <span class="inline-flex items-center gap-2">
            <span class="w-3 h-3 border-2 border-gray-500 border-t-cyan-400 rounded-full animate-spin"></span>
            Running...
          </span>
        {:else}
          Fix All Issues
        {/if}
      </button>
    </div>

    <!-- Individual fix buttons -->
    <div class="flex flex-wrap gap-2">
      <button
        onclick={() => runAutoFix(['anomalies'])}
        disabled={isFixing}
        class="px-3 py-1.5 text-[11px] rounded-lg transition-colors
					   bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40"
      >
        Remove Anomalies
      </button>
      <button
        onclick={() => runAutoFix(['seed'])}
        disabled={isFixing}
        class="px-3 py-1.5 text-[11px] rounded-lg transition-colors
					   bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-40"
      >
        Seed Missing Data
      </button>
      <button
        onclick={() => runAutoFix(['conflicts'])}
        disabled={isFixing}
        class="px-3 py-1.5 text-[11px] rounded-lg transition-colors
					   bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-40"
      >
        Resolve Conflicts
      </button>
      <button
        onclick={() => runAutoFix(['duplicates'])}
        disabled={isFixing}
        class="px-3 py-1.5 text-[11px] rounded-lg transition-colors
					   bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-40"
      >
        Remove Duplicates
      </button>
    </div>

    {#if fixResult}
      <div class="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          <span class="text-xs font-medium text-green-400">
            Auto-fix complete — {fixResult.summary.totalActions} action(s) in {fixResult.duration}ms
          </span>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
          {#if fixResult.summary.anomaliesFixed > 0}
            <span>{fixResult.summary.anomaliesFixed} anomalies removed</span>
          {/if}
          {#if fixResult.summary.scootersSeeded > 0}
            <span>{fixResult.summary.scootersSeeded} scooters seeded ({fixResult.summary.fieldsSeeded} fields)</span>
          {/if}
          {#if fixResult.summary.conflictsResolved > 0}
            <span>{fixResult.summary.conflictsResolved} conflicts resolved</span>
          {/if}
          {#if fixResult.summary.duplicatesRemoved > 0}
            <span>{fixResult.summary.duplicatesRemoved} duplicates removed</span>
          {/if}
          {#if fixResult.summary.totalActions === 0}
            <span>No issues found — everything looks clean.</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <button
      onclick={() => (activeFilter = activeFilter === 'critical' ? 'all' : 'critical')}
      class="bg-[#12121a] border rounded-xl p-3 text-left transition-colors
				   {activeFilter === 'critical' ? 'border-red-500/50' : 'border-gray-800 hover:border-gray-700'}"
    >
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Critical</p>
      <p class="text-2xl font-bold text-red-400 mt-0.5">{alertSummary.criticalCount}</p>
    </button>
    <button
      onclick={() => (activeFilter = activeFilter === 'warning' ? 'all' : 'warning')}
      class="bg-[#12121a] border rounded-xl p-3 text-left transition-colors
				   {activeFilter === 'warning' ? 'border-yellow-500/50' : 'border-gray-800 hover:border-gray-700'}"
    >
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Warnings</p>
      <p class="text-2xl font-bold text-yellow-400 mt-0.5">{alertSummary.warningCount}</p>
    </button>
    <button
      onclick={() => (activeFilter = activeFilter === 'info' ? 'all' : 'info')}
      class="bg-[#12121a] border rounded-xl p-3 text-left transition-colors
				   {activeFilter === 'info' ? 'border-blue-500/50' : 'border-gray-800 hover:border-gray-700'}"
    >
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Info</p>
      <p class="text-2xl font-bold text-blue-400 mt-0.5">{alertSummary.infoCount}</p>
    </button>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-3">
      <p class="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
      <p class="text-2xl font-bold text-white mt-0.5">{alertSummary.alerts.length}</p>
    </div>
  </div>

  <!-- Category Breakdown -->
  <div class="flex flex-wrap gap-2">
    <button
      onclick={() => (activeFilter = 'all')}
      class="px-3 py-1.5 rounded-lg text-xs transition-colors {activeFilter === 'all'
        ? 'bg-white/10 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/5'}"
    >
      All ({alertSummary.alerts.length})
    </button>
    {#each Object.entries(alertSummary.byCategory) as [cat, count]}
      {#if (count as number) > 0}
        <button
          onclick={() => (activeFilter = activeFilter === cat ? 'all' : cat)}
          class="px-3 py-1.5 rounded-lg text-xs transition-colors {activeFilter === cat
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          {categoryLabels[cat] || cat} ({count})
        </button>
      {/if}
    {/each}
  </div>

  <!-- Tab Switcher -->
  <div class="flex border-b border-gray-800">
    <button
      onclick={() => (activeTab = 'alerts')}
      class="px-4 py-2 text-sm transition-colors border-b-2
				   {activeTab === 'alerts' ? 'border-cyan-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}"
    >
      Alerts ({filteredAlerts.length})
    </button>
    <button
      onclick={() => (activeTab = 'changelog')}
      class="px-4 py-2 text-sm transition-colors border-b-2
				   {activeTab === 'changelog' ? 'border-cyan-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}"
    >
      Changelog ({data.totalChanges})
    </button>
  </div>

  <!-- Alerts List -->
  {#if activeTab === 'alerts'}
    {#if filteredAlerts.length === 0}
      <div class="bg-[#12121a] border border-gray-800 rounded-xl p-8 text-center">
        <p class="text-green-400 text-lg font-semibold">All clear!</p>
        <p class="text-gray-500 text-sm mt-1">No alerts match the current filter.</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each filteredAlerts as alert}
          <div class="bg-[#12121a] border {severityBg[alert.severity]} rounded-xl px-4 py-3 flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <span class="w-2.5 h-2.5 rounded-full block {severityDot[alert.severity]}"></span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium {severityColors[alert.severity]}">
                  {alert.title}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                  {categoryLabels[alert.category] || alert.category}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">{alert.description}</p>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-[10px] text-gray-500">{alert.scooterName}</span>
                {#if alert.field}
                  <span class="text-[10px] text-gray-600">|</span>
                  <span class="text-[10px] text-gray-500">{alert.field}</span>
                {/if}
              </div>
            </div>
            {#if alert.actionUrl}
              <a
                href={alert.actionUrl}
                class="flex-shrink-0 px-3 py-1.5 text-[10px] text-cyan-400 hover:text-cyan-300
									   bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors"
              >
                {alert.actionLabel || 'View'}
              </a>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Changelog -->
  {#if activeTab === 'changelog'}
    {#if data.recentChanges.length === 0}
      <div class="bg-[#12121a] border border-gray-800 rounded-xl p-8 text-center">
        <p class="text-gray-500 text-sm">No changes recorded yet.</p>
        <p class="text-gray-600 text-xs mt-1">Changes will appear here after running scans or editing data.</p>
      </div>
    {:else}
      <div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800/50">
        {#each data.recentChanges as change}
          <div class="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
            <span class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 {changeTypeDot[change.changeType] || 'bg-gray-500'}"
            ></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-white">{change.scooterName}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                  {changeTypeLabels[change.changeType] || change.changeType}
                </span>
                <span class="text-[10px] text-gray-600">{timeAgo(change.timestamp)}</span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">
                {#if change.field}
                  <span class="text-gray-500">{change.field}:</span>
                {/if}
                {change.details || ''}
              </p>
              {#if change.oldValue !== undefined && change.newValue !== undefined}
                <div class="flex items-center gap-1.5 mt-1 text-[10px]">
                  <span class="text-red-400 line-through">{change.oldValue}</span>
                  <span class="text-gray-600">&rarr;</span>
                  <span class="text-green-400">{change.newValue}</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
