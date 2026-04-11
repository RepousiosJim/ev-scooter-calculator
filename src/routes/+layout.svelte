<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import Toast from "$lib/components/ui/Toast.svelte";
	import MobileNavigation from "$lib/components/ui/organisms/MobileNavigation.svelte";
	import { toastState } from "$lib/stores/calculator.svelte";
	import { page } from "$app/stores";

	let { children } = $props();

	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));
	const isRankings = $derived($page.url.pathname.startsWith('/rankings'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Skip Link for Keyboard Navigation (WCAG 2.1 AA) -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-bg-primary"
>
	Skip to main content
</a>

<main id="main-content" tabindex="-1" class="outline-none">
	{@render children()}
</main>

<!-- Mobile Navigation - shown on calculator page only (not rankings or admin) -->
{#if !isAdmin && !isRankings}
<div class="lg:hidden">
	<MobileNavigation />
</div>
{/if}

{#if typeof window !== 'undefined'}
 	<div class="toast-container fixed top-4 right-4 z-[100] flex flex-col gap-2">
 		{#each toastState.toasts as toast (toast.id)}
 			<Toast
 				message={toast.message}
 				type={toast.type}
 			/>
 		{/each}
 	</div>
{/if}
