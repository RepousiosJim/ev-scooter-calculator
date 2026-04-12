<script lang="ts">
	let { data } = $props();

	// Local mutable copy of candidates for reactive updates
	let candidates = $state(data.candidates);
	let stats = $state(data.stats);

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
				candidates = candidates.map((c) =>
					c.key === key ? { ...c, ...result.candidate } : c
				);
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
		} catch { /* ignore */ }
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

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-xl font-bold text-white">Preset Candidates</h1>
			<p class="text-sm text-gray-400 mt-0.5">
				Review, approve, and generate preset code for discovered scooters.
			</p>
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
			{syncing ? '⟳ Syncing...' : '⚡ Sync to Presets'}
		</button>
	</div>

	{#if syncResult}
		<div class="mt-3 p-3 rounded-lg text-sm {syncResult.errors.length ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}">
			<div class="font-medium {syncResult.errors.length ? 'text-red-400' : 'text-emerald-400'}">
				Sync complete: {syncResult.added.length} added, {syncResult.skipped.length} already in presets, {syncResult.removed.length} removed
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
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Name *</label>
					<input type="text" bind:value={manualName} placeholder="e.g. Varla Eagle One V2"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Year</label>
					<input type="number" bind:value={manualYear} min="2018" max="2030"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Price ($)</label>
					<input type="number" bind:value={manualPrice} placeholder="1299"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Voltage (V)</label>
					<input type="number" bind:value={manualVoltage} placeholder="48"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Battery (Wh)</label>
					<input type="number" bind:value={manualBatteryWh} placeholder="1560"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Motor (W total)</label>
					<input type="number" bind:value={manualMotorWatts} placeholder="2000"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Weight (kg)</label>
					<input type="number" bind:value={manualWeight} placeholder="30"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Wheel (inches)</label>
					<input type="number" bind:value={manualWheelSize} placeholder="10" step="0.5"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Top Speed (km/h)</label>
					<input type="number" bind:value={manualTopSpeed} placeholder="65"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
				</div>
				<div>
					<label class="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Range (km)</label>
					<input type="number" bind:value={manualRange} placeholder="60"
						class="w-full bg-white/[0.03] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none" />
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
				{#each ['all', 'pending', 'approved', 'rejected'] as st}
					<button
						type="button"
						onclick={() => (statusFilter = st as typeof statusFilter)}
						class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all
							{statusFilter === st
							? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
							: 'bg-white/[0.02] text-gray-500 border-gray-800 hover:border-gray-700 hover:text-gray-300'}"
					>
						{st === 'all' ? `All (${stats.total})` : st === 'pending' ? `Pending (${stats.pending})` : st === 'approved' ? `Approved (${stats.approved})` : `Rejected (${stats.rejected})`}
					</button>
				{/each}
			</div>
		</div>

		<!-- Sort options -->
		<div class="flex items-center gap-2 text-xs">
			<span class="text-gray-500">Sort:</span>
			{#each [
				{ key: 'confidence', label: 'Confidence' },
				{ key: 'name', label: 'Name' },
				{ key: 'year', label: 'Year' },
				{ key: 'status', label: 'Status' },
			] as opt}
				<button
					type="button"
					onclick={() => toggleSort(opt.key as typeof sortBy)}
					class="px-2 py-1 rounded transition-colors
						{sortBy === opt.key
						? 'text-cyan-400 bg-cyan-500/10'
						: 'text-gray-500 hover:text-gray-300'}"
				>
					{opt.label}
					{#if sortBy === opt.key}
						<span class="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Candidate List -->
	{#if filtered.length === 0}
		<div class="bg-[#12121a] border border-gray-800 rounded-xl p-12 text-center">
			{#if candidates.length === 0}
				<div class="text-4xl mb-3 opacity-30">+</div>
				<div class="text-lg font-bold text-white mb-1">No candidates yet</div>
				<p class="text-sm text-gray-400">
					Run a <a href="/admin/discover" class="text-cyan-400 hover:underline">Discovery Scan</a> to find new scooters,
					then create candidates from the results.
				</p>
			{:else}
				<div class="text-sm text-gray-400">No candidates match your filters</div>
				<button
					type="button"
					onclick={() => { searchQuery = ''; statusFilter = 'all'; }}
					class="mt-2 text-xs text-cyan-400 hover:underline"
				>
					Clear filters
				</button>
			{/if}
		</div>
	{:else}
		<div class="space-y-2">
			{#each filtered as candidate (candidate.key)}
				{@const isExpanded = expandedKey === candidate.key}
				{@const isLoading = actionInProgress === candidate.key}
				<div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden transition-all
					{isExpanded ? 'ring-1 ring-cyan-500/20' : ''}">
					<!-- Row header -->
					<button
						type="button"
						onclick={() => {
							expandedKey = isExpanded ? null : candidate.key;
							generatedCode = null;
						}}
						class="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
					>
						<!-- Status badge -->
						<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border {statusColors[candidate.status]}">
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
								<span class="text-[10px] font-mono {confidenceColor(candidate.validation.confidence)}">{candidate.validation.confidence}</span>
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
						<span class="text-gray-500 transition-transform" style:transform={isExpanded ? 'rotate(180deg)' : ''}>
							&#9660;
						</span>
					</button>

					<!-- Expanded Detail -->
					{#if isExpanded}
						<div class="px-4 pb-4 border-t border-gray-800 space-y-4 pt-4">
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<!-- Generated Config -->
								<div>
									<h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Generated Config</h4>
									<div class="bg-[#0a0a0f] border border-gray-800 rounded-lg p-3 space-y-1 text-xs font-mono">
										<div class="grid grid-cols-2 gap-x-4 gap-y-1">
											<div><span class="text-gray-500">v:</span> <span class="text-white">{candidate.config.v}V</span></div>
											<div><span class="text-gray-500">ah:</span> <span class="text-white">{candidate.config.ah}Ah</span></div>
											<div><span class="text-gray-500">watts:</span> <span class="text-white">{candidate.config.watts}W ×{candidate.config.motors}</span></div>
											<div><span class="text-gray-500">wheel:</span> <span class="text-white">{candidate.config.wheel}"</span></div>
											<div><span class="text-gray-500">weight:</span> <span class="text-white">{candidate.config.weight}kg</span></div>
											{#if candidate.config.scooterWeight}
												<div><span class="text-gray-500">scooterWt:</span> <span class="text-white">{candidate.config.scooterWeight}kg</span></div>
											{/if}
											<div><span class="text-gray-500">Cd:</span> <span class="text-white">{candidate.config.dragCoefficient}</span></div>
											<div><span class="text-gray-500">Crr:</span> <span class="text-white">{candidate.config.rollingResistance}</span></div>
											<div><span class="text-gray-500">style:</span> <span class="text-white">{candidate.config.style} Wh/km</span></div>
											<div><span class="text-gray-500">charger:</span> <span class="text-white">{candidate.config.charger}A</span></div>
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
													<span class="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full
														{issue.severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'}"></span>
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
									<span class="font-bold text-xs uppercase tracking-wider">Note:</span> {candidate.notes}
								</div>
							{/if}

							<!-- Generated Code -->
							{#if generatedCode && expandedKey === candidate.key}
								<div>
									<div class="flex items-center justify-between mb-2">
										<h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Preset Code</h4>
										<button
											type="button"
											onclick={() => copyToClipboard(generatedCode || '')}
											class="px-3 py-1 text-xs text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
										>
											{copyFeedback || 'Copy to clipboard'}
										</button>
									</div>
									<pre class="bg-[#0a0a0f] border border-gray-800 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">{generatedCode}</pre>
								</div>
							{/if}

							<!-- Actions -->
							<div class="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
								{#if candidate.status !== 'approved'}
									<button
										type="button"
										onclick={() => performAction('approve', candidate.key)}
										disabled={isLoading}
										class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg
											hover:bg-green-500/20 disabled:opacity-50 transition-all"
									>
										{isLoading ? 'Processing...' : 'Approve'}
									</button>
								{/if}

								{#if candidate.status !== 'rejected'}
									<button
										type="button"
										onclick={() => {
											const reason = prompt('Rejection reason (optional):');
											if (reason !== null) performAction('reject', candidate.key, { notes: reason || undefined });
										}}
										disabled={isLoading}
										class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg
											hover:bg-red-500/20 disabled:opacity-50 transition-all"
									>
										Reject
									</button>
								{/if}

								{#if candidate.status !== 'pending'}
									<button
										type="button"
										onclick={() => performAction('reset', candidate.key)}
										disabled={isLoading}
										class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 bg-white/5 border border-gray-700 rounded-lg
											hover:bg-white/10 disabled:opacity-50 transition-all"
									>
										Reset to Pending
									</button>
								{/if}

								<button
									type="button"
									onclick={() => generateCode(candidate.key)}
									disabled={isLoading}
									class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg
										hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
								>
									Generate Code
								</button>

								<button
									type="button"
									onclick={() => {
										if (confirm(`Delete candidate "${candidate.name}"? This cannot be undone.`)) {
											performAction('delete', candidate.key);
										}
									}}
									disabled={isLoading}
									class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-400 bg-white/[0.02] border border-gray-800 rounded-lg
										hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-50 transition-all ml-auto"
								>
									Delete
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
