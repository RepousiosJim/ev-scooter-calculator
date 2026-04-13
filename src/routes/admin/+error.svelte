<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} — Admin — EV Scooter Pro Calculator</title>
</svelte:head>

<div class="min-h-screen bg-bg-primary flex items-center justify-center p-6">
  <div class="text-center max-w-md">
    <div class="text-8xl font-black text-primary/20 mb-4">{page.status}</div>
    <h1 class="text-xl font-bold text-text-primary mb-2">
      {#if page.status === 404}
        Page not found
      {:else}
        Something went wrong
      {/if}
    </h1>
    <p class="text-sm text-text-tertiary mb-8 max-w-md mx-auto">
      {#if page.status === 401 || page.status === 403}
        You don't have permission to access this page.
      {:else if page.error?.message}
        {page.error.message}
      {:else}
        An unexpected error occurred in the admin panel.
      {/if}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a
        href="/admin"
        class="inline-flex px-6 py-2.5 text-sm font-bold text-text-secondary border border-border bg-transparent hover:bg-white/5 transition-colors uppercase tracking-wider"
      >
        Back to Admin
      </a>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a
        href="/admin/login"
        class="inline-flex px-6 py-2.5 text-sm font-bold text-primary border border-primary/25 bg-primary/10 hover:bg-primary/15 transition-colors uppercase tracking-wider"
      >
        Login Again
      </a>
    </div>
  </div>
</div>
