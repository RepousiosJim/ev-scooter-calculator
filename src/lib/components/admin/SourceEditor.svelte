<script lang="ts">
	import type { SourceType, SpecField } from '$lib/server/verification/types';

	let {
		scooterKey,
		field,
		unit,
		onclose,
		onsaved
	}: {
		scooterKey: string;
		field: SpecField;
		unit: string;
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	let sourceType = $state<SourceType>('manufacturer');
	let sourceName = $state('');
	let sourceUrl = $state('');
	let value = $state('');
	let notes = $state('');
	let saving = $state(false);
	let error = $state('');

	async function handleSubmit() {
		if (!sourceName || !value) {
			error = 'Name and value are required';
			return;
		}

		saving = true;
		error = '';

		try {
			const res = await fetch('/api/admin/source', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					scooterKey,
					field,
					source: {
						type: sourceType,
						name: sourceName,
						url: sourceUrl || undefined,
						value: parseFloat(value),
						unit,
						notes: notes || undefined
					}
				})
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to save source';
				return;
			}

			onsaved();
			onclose();
		} catch (e) {
			error = 'Network error';
		} finally {
			saving = false;
		}
	}
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onclick={onclose}>
	<!-- Modal -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="bg-[#12121a] border border-gray-800 rounded-xl w-full max-w-md p-5 space-y-4"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-semibold text-white">Add Source</h3>
			<button onclick={onclose} class="text-gray-500 hover:text-white text-lg">&times;</button>
		</div>

		{#if error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs">
				{error}
			</div>
		{/if}

		<div class="space-y-3">
			<div>
				<label for="source-type" class="block text-xs text-gray-400 mb-1">Source Type</label>
				<select
					id="source-type"
					bind:value={sourceType}
					class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
				>
					<option value="manufacturer">Manufacturer</option>
					<option value="retailer">Retailer</option>
					<option value="review">Review Site</option>
					<option value="community">Community</option>
				</select>
			</div>

			<div>
				<label for="source-name" class="block text-xs text-gray-400 mb-1">Source Name</label>
				<input
					id="source-name"
					type="text"
					bind:value={sourceName}
					placeholder="e.g., Apollo Official Website"
					class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
				/>
			</div>

			<div>
				<label for="source-url" class="block text-xs text-gray-400 mb-1">URL (optional)</label>
				<input
					id="source-url"
					type="url"
					bind:value={sourceUrl}
					placeholder="https://..."
					class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
				/>
			</div>

			<div>
				<label for="source-value" class="block text-xs text-gray-400 mb-1">Value ({unit})</label>
				<input
					id="source-value"
					type="number"
					step="any"
					bind:value
					placeholder="Enter the spec value"
					class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
				/>
			</div>

			<div>
				<label for="source-notes" class="block text-xs text-gray-400 mb-1">Notes (optional)</label>
				<textarea
					id="source-notes"
					bind:value={notes}
					rows="2"
					placeholder="Any additional context..."
					class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
				></textarea>
			</div>
		</div>

		<div class="flex gap-2 pt-2">
			<button
				onclick={onclose}
				class="flex-1 px-3 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10
					   rounded-lg transition-colors"
			>
				Cancel
			</button>
			<button
				onclick={handleSubmit}
				disabled={saving}
				class="flex-1 px-3 py-2 text-sm text-white bg-cyan-600 hover:bg-cyan-500
					   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors"
			>
				{saving ? 'Saving...' : 'Add Source'}
			</button>
		</div>
	</div>
</div>
