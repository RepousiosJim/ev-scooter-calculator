<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Admin Login - EV Scooter Calculator</title>
</svelte:head>

<div class="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-bold text-white mb-2">Admin Panel</h1>
			<p class="text-gray-400 text-sm">EV Scooter Spec Verification System</p>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
			class="bg-[#12121a] border border-gray-800 rounded-xl p-6 space-y-4"
		>
			{#if form?.error}
				<div class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
					{form.error}
				</div>
			{/if}

			<div>
				<label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">
					Password
				</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					autocomplete="current-password"
					class="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white
						   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
						   transition-colors"
					placeholder="Enter admin password"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed
					   text-white font-medium rounded-lg transition-colors"
			>
				{loading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>

		<div class="text-center mt-6">
			<a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
				&larr; Back to Calculator
			</a>
		</div>
	</div>
</div>
