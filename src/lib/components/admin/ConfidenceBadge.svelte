<script lang="ts">
	let { confidence }: { confidence: number } = $props();

	const color = $derived(
		confidence >= 75
			? 'bg-green-500'
			: confidence >= 50
				? 'bg-yellow-500'
				: confidence >= 25
					? 'bg-orange-500'
					: 'bg-gray-600'
	);

	const textColor = $derived(
		confidence >= 75
			? 'text-green-400'
			: confidence >= 50
				? 'text-yellow-400'
				: confidence >= 25
					? 'text-orange-400'
					: 'text-gray-500'
	);
</script>

<div class="flex items-center gap-2">
	<div class="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
		<div class="h-full rounded-full transition-all duration-300 {color}" style="width: {confidence}%"></div>
	</div>
	<span class="text-xs font-mono {textColor}">{confidence}%</span>
</div>
