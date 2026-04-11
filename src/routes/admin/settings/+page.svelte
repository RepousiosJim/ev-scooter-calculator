<script lang="ts">
	let { data } = $props();

	let settings = $state({ ...data.settings });
	let saving = $state(false);
	let saveMessage = $state('');
	let newApiKey = $state('');
	let showApiKeyInput = $state(false);

	async function save() {
		saving = true;
		saveMessage = '';
		try {
			const payload: Record<string, unknown> = {
				autoVerifyThreshold: settings.autoVerifyThreshold,
				outdatedDays: settings.outdatedDays,
				batchDelayMs: settings.batchDelayMs,
				maxConcurrentScrapes: settings.maxConcurrentScrapes,
				llmEnabled: settings.llmEnabled,
				geminiModel: settings.geminiModel,
			};
			if (newApiKey) {
				payload.geminiApiKey = newApiKey;
			}
			const res = await fetch('/api/admin/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const updated = await res.json();
			settings = { ...updated };
			newApiKey = '';
			showApiKeyInput = false;
			saveMessage = 'Settings saved successfully.';
		} catch {
			saveMessage = 'Failed to save settings.';
		} finally {
			saving = false;
			setTimeout(() => (saveMessage = ''), 3000);
		}
	}
</script>

<div class="space-y-6 max-w-2xl">
	<div>
		<h1 class="text-xl font-bold text-white">Settings</h1>
		<p class="text-sm text-gray-400 mt-0.5">Configure admin panel behavior and API integrations.</p>
	</div>

	<!-- API Configuration -->
	<div class="bg-[#12121a] border border-gray-800 rounded-xl p-5 space-y-4">
		<h2 class="text-sm font-semibold text-white">API Configuration</h2>

		<div class="space-y-3">
			<div>
				<label class="text-xs text-gray-400 block mb-1">Gemini API Key</label>
				<div class="flex items-center gap-2">
					{#if showApiKeyInput}
						<input
							type="password"
							bind:value={newApiKey}
							placeholder="Enter new API key..."
							class="flex-1 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
								   placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none"
						/>
						<button
							onclick={() => { showApiKeyInput = false; newApiKey = ''; }}
							class="px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg"
						>
							Cancel
						</button>
					{:else}
						<div class="flex-1 flex items-center gap-2">
							<span class="text-sm text-gray-400 font-mono">
								{settings.geminiApiKey || 'Not set'}
							</span>
							{#if data.envGeminiKey && !settings.geminiApiKeySet}
								<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">via .env</span>
							{/if}
						</div>
						<button
							onclick={() => (showApiKeyInput = true)}
							class="px-3 py-2 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded-lg"
						>
							Change
						</button>
					{/if}
				</div>
			</div>

			<div>
				<label class="text-xs text-gray-400 block mb-1">Gemini Model</label>
				<select
					bind:value={settings.geminiModel}
					class="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
						   focus:border-cyan-500 focus:outline-none w-full"
				>
					<option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast, Free Tier)</option>
					<option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Fastest)</option>
					<option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
					<option value="gemini-1.5-pro">Gemini 1.5 Pro (Most Capable)</option>
				</select>
			</div>

			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={settings.llmEnabled}
					class="w-4 h-4 bg-[#0a0a0f] border border-gray-700 rounded accent-cyan-500"
				/>
				<div>
					<span class="text-sm text-white">Enable LLM-powered extraction</span>
					<p class="text-[10px] text-gray-500">Use Gemini to extract specs from web pages (requires API key)</p>
				</div>
			</label>
		</div>
	</div>

	<!-- Verification Thresholds -->
	<div class="bg-[#12121a] border border-gray-800 rounded-xl p-5 space-y-4">
		<h2 class="text-sm font-semibold text-white">Verification Thresholds</h2>

		<div class="space-y-3">
			<div>
				<label class="text-xs text-gray-400 block mb-1">
					Auto-verify confidence threshold: <span class="text-white font-mono">{settings.autoVerifyThreshold}%</span>
				</label>
				<input
					type="range"
					min="50"
					max="100"
					step="5"
					bind:value={settings.autoVerifyThreshold}
					class="w-full accent-cyan-500"
				/>
				<p class="text-[10px] text-gray-500 mt-0.5">Fields reaching this confidence level will be auto-marked as verified.</p>
			</div>

			<div>
				<label class="text-xs text-gray-400 block mb-1">
					Outdated after: <span class="text-white font-mono">{settings.outdatedDays} days</span>
				</label>
				<input
					type="range"
					min="7"
					max="180"
					step="7"
					bind:value={settings.outdatedDays}
					class="w-full accent-cyan-500"
				/>
				<p class="text-[10px] text-gray-500 mt-0.5">Verifications older than this will be flagged as outdated.</p>
			</div>
		</div>
	</div>

	<!-- Scraping Behavior -->
	<div class="bg-[#12121a] border border-gray-800 rounded-xl p-5 space-y-4">
		<h2 class="text-sm font-semibold text-white">Scraping Behavior</h2>

		<div class="space-y-3">
			<div>
				<label class="text-xs text-gray-400 block mb-1">
					Delay between batch requests: <span class="text-white font-mono">{settings.batchDelayMs}ms</span>
				</label>
				<input
					type="range"
					min="1000"
					max="15000"
					step="1000"
					bind:value={settings.batchDelayMs}
					class="w-full accent-cyan-500"
				/>
				<p class="text-[10px] text-gray-500 mt-0.5">Time to wait between requests to avoid rate limiting.</p>
			</div>

			<div>
				<label class="text-xs text-gray-400 block mb-1">
					Max concurrent scrapes: <span class="text-white font-mono">{settings.maxConcurrentScrapes}</span>
				</label>
				<input
					type="range"
					min="1"
					max="5"
					step="1"
					bind:value={settings.maxConcurrentScrapes}
					class="w-full accent-cyan-500"
				/>
			</div>
		</div>
	</div>

	<!-- Save -->
	<div class="flex items-center gap-3">
		<button
			onclick={save}
			disabled={saving}
			class="px-6 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500
				   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors
				   flex items-center gap-2"
		>
			{#if saving}
				<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
				Saving...
			{:else}
				Save Settings
			{/if}
		</button>
		{#if saveMessage}
			<span class="text-xs {saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}">
				{saveMessage}
			</span>
		{/if}
	</div>
</div>
