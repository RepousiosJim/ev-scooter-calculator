<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { RefreshCw, Zap } from 'lucide-svelte';
  import CandidateRow from '$lib/components/admin/CandidateRow.svelte';
  let { data } = $props();

  // Local mutable copy of candidates for reactive updates
  let candidates = $state(untrack(() => data.candidates));
  let stats = $state(untrack(() => data.stats));

  // Filters & search
  let searchQuery = $state('');
  let statusFilter = $state<'all' | 'pending' | 'approved' | 'rejected'>('all');
  let sortBy = $state<'name' | 'confidence' | 'year' | 'status'>('confidence');
  let sortDir = $state<'asc' | 'desc'>('desc');

  // Expanded detail view
  let expandedKey = $state<string | null>(null);
  let generatedCode = $state<string | null>(null);
  let actionInProgress = $state<string | null>(null);
  let copyFeedback = $state<string | null>(null);

  // Multi-select state
  let selectedKeys = new SvelteSet<string>();
  let batchInProgress = $state(false);
  let batchFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedCount = $derived(selectedKeys.size);

  function toggleSelect(key: string) {
    if (selectedKeys.has(key)) selectedKeys.delete(key);
    else selectedKeys.add(key);
  }

  function toggleSelectAll() {
    selectedKeys.clear();
    if (!allFilteredSelected) {
      filtered.forEach((c) => selectedKeys.add(c.key));
    }
  }

  function clearSelection() {
    selectedKeys.clear();
  }

  async function batchAction(action: 'approve' | 'reject') {
    if (selectedKeys.size === 0) return;
    batchInProgress = true;
    batchFeedback = null;
    const keys = [...selectedKeys];
    let succeeded = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const res = await fetch('/api/admin/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, key }),
        });
        const result = await res.json();
        if (!res.ok) {
          failed++;
        } else {
          succeeded++;
          if (result.candidate) {
            candidates = candidates.map((c) => (c.key === key ? { ...c, ...result.candidate } : c));
          }
        }
      } catch {
        failed++;
      }
    }

    selectedKeys.clear();
    await refreshStats();
    batchInProgress = false;
    batchFeedback = {
      type: failed > 0 ? 'error' : 'success',
      message:
        failed > 0
          ? `${succeeded} ${action}d, ${failed} failed`
          : `${succeeded} candidate${succeeded !== 1 ? 's' : ''} ${action}d`,
    };
    setTimeout(() => (batchFeedback = null), 4000);
  }

  // Sync status
  let syncing = $state(false);
  let syncResult = $state<{ added: string[]; skipped: string[]; removed: string[]; errors: string[] } | null>(null);

  // Manual entry form
  let showManualForm = $state(false);
  let manualName = $state('');
  let manualYear = $state(new Date().getFullYear());
  let manualVoltage = $state<number | undefined>(undefined);
  let manualBatteryWh = $state<number | undefined>(undefined);
  let manualMotorWatts = $state<number | undefined>(undefined);
  let manualWeight = $state<number | undefined>(undefined);
  let manualWheelSize = $state<number | undefined>(undefined);
  let manualTopSpeed = $state<number | undefined>(undefined);
  let manualRange = $state<number | undefined>(undefined);
  let manualPrice = $state<number | undefined>(undefined);
  let manualSubmitting = $state(false);

  async function submitManualEntry() {
    if (!manualName.trim()) return;
    manualSubmitting = true;
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual',
          name: manualName.trim(),
          year: manualYear,
          specs: {
            voltage: manualVoltage || undefined,
            batteryWh: manualBatteryWh || undefined,
            motorWatts: manualMotorWatts || undefined,
            weight: manualWeight || undefined,
            wheelSize: manualWheelSize || undefined,
            topSpeed: manualTopSpeed || undefined,
            range: manualRange || undefined,
            price: manualPrice || undefined,
          },
        }),
      });
      const result = await res.json();
      if (result.success && result.candidate) {
        candidates = [result.candidate, ...candidates];
        showManualForm = false;
        manualName = '';
        manualVoltage = manualBatteryWh = manualMotorWatts = manualWeight = undefined;
        manualWheelSize = manualTopSpeed = manualRange = manualPrice = undefined;
        await refreshStats();
      } else {
        alert(result.message || 'Failed to create candidate');
      }
    } catch {
      alert('Network error');
    } finally {
      manualSubmitting = false;
    }
  }

  const filtered = $derived.by(() => {
    let result = [...candidates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.key.toLowerCase().includes(q) ||
          (c.sources.discoveredFrom || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'confidence':
          cmp = a.validation.confidence - b.validation.confidence;
          break;
        case 'year':
          cmp = a.year - b.year;
          break;
        case 'status': {
          const order = { pending: 0, approved: 1, rejected: 2 };
          cmp = order[a.status] - order[b.status];
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  });

  const allFilteredSelected = $derived(filtered.length > 0 && filtered.every((c) => selectedKeys.has(c.key)));

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else {
      sortBy = col;
      sortDir = 'desc';
    }
  }

  async function performAction(action: string, key: string, extra?: Record<string, unknown>) {
    actionInProgress = key;
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, key, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.message || 'Action failed');
        return;
      }

      // Update local state
      if (action === 'delete') {
        candidates = candidates.filter((c) => c.key !== key);
      } else if (result.candidate) {
        candidates = candidates.map((c) => (c.key === key ? { ...c, ...result.candidate } : c));
      }

      if (result.code) {
        generatedCode = result.code;
      }

      // Show preset write feedback
      if (result.presetWritten) {
        syncResult = { added: [key], skipped: [], removed: [], errors: [] };
      } else if (result.presetRemoved) {
        syncResult = { added: [], skipped: [], removed: [key], errors: [] };
      }

      // Refresh stats
      await refreshStats();
    } catch {
      alert('Network error');
    } finally {
      actionInProgress = null;
    }
  }

  async function refreshStats() {
    try {
      const res = await fetch('/api/admin/candidates');
      const result = await res.json();
      if (result.stats) stats = result.stats;
    } catch {
      /* ignore */
    }
  }

  async function generateCode(key: string) {
    actionInProgress = key;
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', key }),
      });
      const result = await res.json();
      if (result.code) {
        generatedCode = result.code;
        expandedKey = key;
      }
    } catch {
      alert('Failed to generate code');
    } finally {
      actionInProgress = null;
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback = 'Copied!';
      setTimeout(() => (copyFeedback = null), 2000);
    } catch {
      copyFeedback = 'Copy failed';
      setTimeout(() => (copyFeedback = null), 2000);
    }
  }

  async function syncPresets() {
    syncing = true;
    syncResult = null;
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const result = await res.json();
      if (result.success) {
        syncResult = result;
      } else {
        alert('Sync failed');
      }
    } catch {
      alert('Network error during sync');
    } finally {
      syncing = false;
    }
  }

  const confidenceColor = (c: number) => {
    if (c >= 80) return 'text-green-400';
    if (c >= 60) return 'text-yellow-400';
    if (c >= 40) return 'text-orange-400';
    return 'text-red-400';
  };
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Preset Candidates</h1>
      <p class="text-sm text-gray-400 mt-0.5">Review, approve, and generate preset code for discovered scooters.</p>
    </div>
    <button
      type="button"
      onclick={() => (showManualForm = !showManualForm)}
      class="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
    >
      + Add Manually
    </button>
    <button
      type="button"
      onclick={syncPresets}
      disabled={syncing}
      class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
    >
      {#if syncing}<RefreshCw size={14} class="inline animate-spin" /> Syncing...{:else}<Zap size={14} class="inline" /> Sync
        to Presets{/if}
    </button>
  </div>

  {#if syncResult}
    <div
      class="mt-3 p-3 rounded-lg text-sm {syncResult.errors.length
        ? 'bg-red-500/10 border border-red-500/20'
        : 'bg-emerald-500/10 border border-emerald-500/20'}"
    >
      <div class="font-medium {syncResult.errors.length ? 'text-red-400' : 'text-emerald-400'}">
        Sync complete: {syncResult.added.length} added, {syncResult.skipped.length} already in presets, {syncResult
          .removed.length} removed
      </div>
      {#if syncResult.added.length > 0}
        <div class="text-slate-400 mt-1">Added: {syncResult.added.join(', ')}</div>
      {/if}
      {#if syncResult.errors.length > 0}
        <div class="text-red-400 mt-1">Errors: {syncResult.errors.join(', ')}</div>
      {/if}
    </div>
  {/if}

  <!-- Manual Entry Form -->
  {#if showManualForm}
    <div class="bg-[#12121a] border border-cyan-500/20 rounded-xl p-5 space-y-4">
      <h3 class="text-sm font-bold text-white">Add Scooter Manually</h3>
      <p class="text-xs text-gray-400">Enter known specs. Fields left empty will be inferred from physics.</p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="col-span-2">
          <label for="manual-name" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Name *</label>
          <input
            id="manual-name"
            type="text"
            bind:value={manualName}
            placeholder="e.g. Varla Eagle One V2"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-year" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Year</label>
          <input
            id="manual-year"
            type="number"
            bind:value={manualYear}
            min="2018"
            max="2030"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-price" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Price ($)</label
          >
          <input
            id="manual-price"
            type="number"
            bind:value={manualPrice}
            placeholder="1299"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label for="manual-voltage" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Voltage (V)</label
          >
          <input
            id="manual-voltage"
            type="number"
            bind:value={manualVoltage}
            placeholder="48"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-battery" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Battery (Wh)</label
          >
          <input
            id="manual-battery"
            type="number"
            bind:value={manualBatteryWh}
            placeholder="1560"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-motor" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Motor (W total)</label
          >
          <input
            id="manual-motor"
            type="number"
            bind:value={manualMotorWatts}
            placeholder="2000"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-weight" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Weight (kg)</label
          >
          <input
            id="manual-weight"
            type="number"
            bind:value={manualWeight}
            placeholder="30"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label for="manual-wheel" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Wheel (inches)</label
          >
          <input
            id="manual-wheel"
            type="number"
            bind:value={manualWheelSize}
            placeholder="10"
            step="0.5"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-speed" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Top Speed (km/h)</label
          >
          <input
            id="manual-speed"
            type="number"
            bind:value={manualTopSpeed}
            placeholder="65"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label for="manual-range" class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1"
            >Range (km)</label
          >
          <input
            id="manual-range"
            type="number"
            bind:value={manualRange}
            placeholder="60"
            class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div class="flex items-end gap-2">
          <button
            type="button"
            onclick={submitManualEntry}
            disabled={!manualName.trim() || manualSubmitting}
            class="flex-1 px-4 py-2 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors"
          >
            {manualSubmitting ? 'Adding...' : 'Add Candidate'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Stats Cards -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <div class="text-2xl font-bold text-white font-mono">{stats.total}</div>
      <div class="text-xs text-gray-500 mt-1">Total Candidates</div>
    </div>
    <div class="bg-[#12121a] border border-yellow-500/20 rounded-xl p-4">
      <div class="text-2xl font-bold text-yellow-400 font-mono">{stats.pending}</div>
      <div class="text-xs text-gray-500 mt-1">Pending Review</div>
    </div>
    <div class="bg-[#12121a] border border-green-500/20 rounded-xl p-4">
      <div class="text-2xl font-bold text-green-400 font-mono">{stats.approved}</div>
      <div class="text-xs text-gray-500 mt-1">Approved</div>
    </div>
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4">
      <div class="text-2xl font-bold {confidenceColor(stats.avgConfidence)} font-mono">{stats.avgConfidence}%</div>
      <div class="text-xs text-gray-500 mt-1">Avg Confidence</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <!-- Search -->
      <input
        type="search"
        placeholder="Search by name, key, or manufacturer..."
        bind:value={searchQuery}
        class="flex-1 min-w-[200px] bg-white/[0.03] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
      />

      <!-- Status chips -->
      <div class="flex gap-1.5">
        {#each ['all', 'pending', 'approved', 'rejected'] as st (st)}
          <button
            type="button"
            onclick={() => (statusFilter = st as typeof statusFilter)}
            class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all
							{statusFilter === st
              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
              : 'bg-white/[0.02] text-gray-500 border-gray-800 hover:border-gray-700 hover:text-gray-300'}"
          >
            {st === 'all'
              ? `All (${stats.total})`
              : st === 'pending'
                ? `Pending (${stats.pending})`
                : st === 'approved'
                  ? `Approved (${stats.approved})`
                  : `Rejected (${stats.rejected})`}
          </button>
        {/each}
      </div>
    </div>

    <!-- Sort options -->
    <div class="flex items-center gap-2 text-xs">
      <span class="text-gray-500">Sort:</span>
      {#each [{ key: 'confidence', label: 'Confidence' }, { key: 'name', label: 'Name' }, { key: 'year', label: 'Year' }, { key: 'status', label: 'Status' }] as opt (opt.key)}
        <button
          type="button"
          onclick={() => toggleSort(opt.key as typeof sortBy)}
          class="px-2 py-1 rounded transition-colors
						{sortBy === opt.key ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-gray-300'}"
        >
          {opt.label}
          {#if sortBy === opt.key}
            <span class="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Batch Feedback -->
  {#if batchFeedback}
    <div
      class="px-4 py-2.5 rounded-xl text-sm font-medium
             {batchFeedback.type === 'success'
        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
        : 'bg-red-500/10 border border-red-500/20 text-red-400'}"
    >
      {batchFeedback.message}
    </div>
  {/if}

  <!-- Candidate List -->
  {#if filtered.length === 0}
    <div class="bg-[#12121a] border border-gray-800 rounded-xl p-12 text-center">
      {#if candidates.length === 0}
        <div class="text-4xl mb-3 opacity-30">+</div>
        <div class="text-lg font-bold text-white mb-1">No candidates yet</div>
        <p class="text-sm text-gray-400">
          Run a <a href="/admin/discover" class="text-cyan-400 hover:underline">Discovery Scan</a> to find new scooters, then
          create candidates from the results.
        </p>
      {:else}
        <div class="text-sm text-gray-400">No candidates match your filters</div>
        <button
          type="button"
          onclick={() => {
            searchQuery = '';
            statusFilter = 'all';
          }}
          class="mt-2 text-xs text-cyan-400 hover:underline"
        >
          Clear filters
        </button>
      {/if}
    </div>
  {:else}
    <!-- Sticky Batch Action Bar — visible when 2+ candidates selected -->
    {#if selectedCount >= 2}
      <div
        class="sticky top-4 z-20 flex items-center gap-3 px-4 py-3
               bg-[#1a1a2e] border border-cyan-500/25 rounded-xl shadow-lg shadow-black/40
               backdrop-blur-sm"
      >
        <span class="text-sm font-medium text-cyan-400 tabular-nums">
          {selectedCount} selected
        </span>
        <div class="w-px h-4 bg-white/10 shrink-0"></div>
        <button
          type="button"
          onclick={() => batchAction('approve')}
          disabled={batchInProgress}
          class="px-4 py-1.5 text-xs font-bold uppercase tracking-wider
                 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg
                 hover:bg-green-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {#if batchInProgress}
            <span class="inline-block w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"
            ></span>
          {/if}
          Approve All
        </button>
        <button
          type="button"
          onclick={() => batchAction('reject')}
          disabled={batchInProgress}
          class="px-4 py-1.5 text-xs font-bold uppercase tracking-wider
                 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg
                 hover:bg-red-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {#if batchInProgress}
            <span class="inline-block w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"
            ></span>
          {/if}
          Reject All
        </button>
        <button
          type="button"
          onclick={clearSelection}
          disabled={batchInProgress}
          class="ml-auto px-3 py-1.5 text-xs text-gray-400 hover:text-white
                 bg-white/[0.03] border border-white/[0.08] rounded-lg
                 hover:bg-white/[0.06] disabled:opacity-50 transition-all"
        >
          Clear
        </button>
      </div>
    {/if}

    <!-- Select-all row -->
    <div class="flex items-center gap-3 px-1">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allFilteredSelected}
          onchange={toggleSelectAll}
          class="w-4 h-4 rounded border border-gray-700 bg-white/[0.03] accent-cyan-500 cursor-pointer"
        />
        <span class="text-xs text-gray-500">
          {allFilteredSelected ? 'Deselect all' : `Select all ${filtered.length}`}
        </span>
      </label>
      {#if selectedCount > 0 && selectedCount < filtered.length}
        <span class="text-xs text-gray-600">{selectedCount} of {filtered.length} selected</span>
      {/if}
    </div>

    <div class="space-y-2">
      {#each filtered as candidate (candidate.key)}
        <div class="flex items-start gap-3">
          <!-- Checkbox -->
          <label class="mt-3.5 flex-shrink-0 cursor-pointer" aria-label="Select {candidate.name}">
            <input
              type="checkbox"
              checked={selectedKeys.has(candidate.key)}
              onchange={() => toggleSelect(candidate.key)}
              class="w-4 h-4 rounded border border-gray-700 bg-white/[0.03] accent-cyan-500 cursor-pointer"
            />
          </label>

          <!-- Row -->
          <div class="flex-1 min-w-0">
            <CandidateRow
              {candidate}
              expanded={expandedKey === candidate.key}
              loading={actionInProgress === candidate.key}
              generatedCode={expandedKey === candidate.key ? generatedCode : null}
              {copyFeedback}
              ontoggle={() => {
                expandedKey = expandedKey === candidate.key ? null : candidate.key;
                generatedCode = null;
              }}
              onaction={performAction}
              ongeneratecode={generateCode}
              oncopy={copyToClipboard}
            />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
