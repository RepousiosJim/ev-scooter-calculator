<script lang="ts">
	import type { VerificationStatus } from '$lib/server/verification/types';

	let { status }: { status: VerificationStatus } = $props();

	const styles: Record<VerificationStatus, { bg: string; text: string; label: string }> = {
		unverified: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Unverified' },
		verified: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Verified' },
		disputed: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Disputed' },
		outdated: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Outdated' }
	};

	const style = $derived(styles[status]);
</script>

<span
	class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {style.bg} {style.text}"
>
	{style.label}
</span>
