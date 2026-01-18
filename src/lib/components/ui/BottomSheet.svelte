<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		isOpen?: boolean;
		onClose: () => void;
		title?: string;
		height?: 'small' | 'medium' | 'large' | 'full' | 'auto';
		showHandle?: boolean;
		closeOnBackdrop?: boolean;
		children?: import('svelte').Snippet;
		onOpenChange?: (isOpen: boolean) => void;
	}

	let {
		isOpen = $bindable(false),
		onClose,
		title = '',
		height = 'medium',
		showHandle = true,
		closeOnBackdrop = true,
		children,
		onOpenChange
	}: Props = $props();

	let sheetElement: HTMLDivElement | null = $state(null);
	let startY = $state(0);
	let currentY = $state(0);
	let isDragging = $state(false);
	let translateY = $state(0);
	let titleId = `bottom-sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	const heightMap = {
		small: 'max-h-[40vh]',
		medium: 'max-h-[60vh]',
		large: 'max-h-[80vh]',
		full: 'h-[100vh]',
		auto: 'max-h-[90vh]'
	};

	const SWIPE_THRESHOLD = 100; // pixels to swipe down before dismissing
	const VELOCITY_THRESHOLD = 0.5; // velocity threshold for quick swipes

	function handleTouchStart(e: TouchEvent) {
		if (!showHandle) return;
		const target = e.target as HTMLElement;
		// Only allow dragging from handle area
		if (target.closest('[data-bottom-sheet-handle]')) {
			startY = e.touches[0].clientY;
			isDragging = true;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		currentY = e.touches[0].clientY;
		const deltaY = currentY - startY;

		// Only allow dragging down
		if (deltaY > 0) {
			translateY = deltaY;
			e.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (!isDragging) return;
		isDragging = false;

		const deltaY = currentY - startY;
		const velocity = Math.abs(deltaY) / 100; // Simple velocity calculation

		// Dismiss if dragged down enough or fast enough (downward direction only)
		if (deltaY > 0 && (deltaY > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)) {
			onClose();
		}

		// Reset position
		translateY = 0;
		startY = 0;
		currentY = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (closeOnBackdrop && e.target === e.currentTarget) {
			onClose();
		}
	}

	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		onOpenChange?.(isOpen);
	});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		transition:fly={{ y: 0, duration: 200, easing: quintOut, opacity: 0 }}
		role="presentation"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- Inline style used for dynamic transform value during drag interaction -->
		<div
			bind:this={sheetElement}
			class="w-full {heightMap[height]} bg-bgCard rounded-t-3xl shadow-2xl border-t border-x border-white/10 overflow-hidden flex flex-col"
			style="transform: translateY({translateY}px); transition: {isDragging ? 'none' : 'transform 0.2s ease-out'};"
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
			transition:fly={{ y: 500, duration: 300, easing: quintOut }}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? titleId : undefined}
		>
			{#if showHandle}
				<div
					class="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
					data-bottom-sheet-handle
				>
					<div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
				</div>
			{/if}
			{#if title}
				<div class="px-6 py-4 border-b border-white/10">
					<h2 id={titleId} class="text-xl font-bold text-white">
						{title}
					</h2>
				</div>
			{/if}
			<div class="flex-1 overflow-y-auto px-6 py-4">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for better mobile experience */
	div::-webkit-scrollbar {
		width: 6px;
	}

	div::-webkit-scrollbar-track {
		background: transparent;
	}

	div::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	div::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
