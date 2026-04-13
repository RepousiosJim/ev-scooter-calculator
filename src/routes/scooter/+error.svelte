<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} — Scooter — EV Scooter Pro Calculator</title>
</svelte:head>

<div class="min-h-screen bg-bg-primary flex items-center justify-center p-6">
  <div class="text-center max-w-md">
    <div class="text-8xl font-black text-primary/20 mb-4">{page.status}</div>
    <h1 class="text-xl font-bold text-text-primary mb-2">
      {#if page.status === 404}
        Scooter not found
      {:else}
        Something went wrong
      {/if}
    </h1>
    <p class="text-sm text-text-tertiary mb-8 max-w-md mx-auto">
      {#if page.status === 404}
        This scooter doesn't exist or hasn't been added yet.
      {:else if page.error?.message}
        {page.error.message}
      {:else}
        An unexpected error occurred loading this scooter page.
      {/if}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a
        href="/rankings"
        class="inline-flex px-6 py-2.5 text-sm font-bold text-text-secondary border border-border bg-transparent hover:bg-white/5 transition-colors uppercase tracking-wider"
      >
        Browse Rankings
      </a>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a
        href="/"
        class="inline-flex px-6 py-2.5 text-sm font-bold text-primary border border-primary/25 bg-primary/10 hover:bg-primary/15 transition-colors uppercase tracking-wider"
      >
        Back to Calculator
      </a>
    </div>
  </div>
</div>
