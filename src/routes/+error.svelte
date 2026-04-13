<script lang="ts">
  import { page } from '$app/state';
  import AppHeader from '$lib/components/ui/AppHeader.svelte';
  import { SENTRY_ENABLED } from '$lib/sentry';
  import { browser } from '$app/environment';

  async function reportIssue() {
    if (!browser || !SENTRY_ENABLED) return;
    const Sentry = await import('@sentry/sveltekit');
    Sentry.showReportDialog();
  }
</script>

<svelte:head>
  <title>{page.status} — EV Scooter Pro Calculator</title>
</svelte:head>

<div class="min-h-screen bg-bg-primary">
  <AppHeader />

  <div class="max-w-7xl mx-auto px-4 pt-24 pb-12 text-center">
    <div class="text-8xl font-black text-primary/20 mb-4">{page.status}</div>
    <h1 class="text-xl font-bold text-text-primary mb-2">
      {#if page.status === 404}
        Page not found
      {:else}
        Something went wrong
      {/if}
    </h1>
    <p class="text-sm text-text-tertiary mb-8 max-w-md mx-auto">
      {#if page.status === 404}
        The page you're looking for doesn't exist or has been moved.
      {:else if page.error?.message}
        {page.error.message}
      {:else}
        An unexpected error occurred. Please try again.
      {/if}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a
        href="/"
        class="inline-flex px-6 py-2.5 text-sm font-bold text-primary border border-primary/25 bg-primary/10 hover:bg-primary/15 transition-colors uppercase tracking-wider"
      >
        Back to Calculator
      </a>
      {#if SENTRY_ENABLED && page.status !== 404}
        <button
          type="button"
          onclick={reportIssue}
          class="inline-flex px-6 py-2.5 text-sm font-bold text-text-secondary border border-border bg-transparent hover:bg-white/5 transition-colors uppercase tracking-wider"
        >
          Report Issue
        </button>
      {/if}
    </div>
  </div>
</div>
