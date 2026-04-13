<script lang="ts">
  import { guides } from '$lib/data/guides';
  import type { Guide } from '$lib/data/guides';

  const categoryColors: Record<Guide['category'], string> = {
    buying: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    technical: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };

  const categoryLabels: Record<Guide['category'], string> = {
    buying: 'Buying Guide',
    technical: 'Technical',
    maintenance: 'Maintenance',
  };

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>Electric Scooter Guides — EV Scooter Pro</title>
  <meta
    name="description"
    content="In-depth guides on buying, riding, and maintaining electric scooters. Learn how to read specs, care for your battery, and find the best commuter scooter."
  />
</svelte:head>

<header class="sticky top-0 z-50 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl">
  <div class="max-w-4xl mx-auto px-4 sm:px-6">
    <div class="h-14 flex items-center justify-between gap-4">
      <a
        href="/"
        class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors group"
        aria-label="Back to calculator"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span class="text-xs font-bold uppercase tracking-[0.12em]">Calculator</span>
      </a>
      <span class="text-xs font-black text-text-tertiary tracking-tight">EV Scooter Pro</span>
    </div>
  </div>
</header>

<div class="min-h-screen bg-bg-primary">
  <!-- Background glow -->
  <div
    class="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>

  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Page header -->
    <div class="mb-8">
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-1">Guides &amp; Resources</p>
      <h1 class="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">Electric Scooter Guides</h1>
      <p class="text-text-secondary text-sm mt-1.5 max-w-xl">
        In-depth guides on choosing, riding, and maintaining your electric scooter. Written to help you make informed
        decisions backed by real physics.
      </p>
    </div>

    <!-- Guides grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {#each guides as guide (guide.slug)}
        <a
          href="/guides/{guide.slug}"
          class="group block bg-white/[0.03] border border-white/[0.06] hover:border-primary/25 hover:bg-white/[0.05] transition-all duration-200 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
          aria-label="{guide.title} — {guide.readingTime} min read"
        >
          <!-- Category badge + reading time -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span
              class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] border {categoryColors[
                guide.category
              ]}"
            >
              {categoryLabels[guide.category]}
            </span>
            <span class="text-[11px] text-text-tertiary font-medium tabular-nums">{guide.readingTime} min read</span>
          </div>

          <!-- Title -->
          <h2
            class="text-sm font-bold text-text-primary leading-snug group-hover:text-primary transition-colors duration-150 mb-2"
          >
            {guide.title}
          </h2>

          <!-- Description -->
          <p class="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-4">
            {guide.description}
          </p>

          <!-- Footer: date + chevron -->
          <div class="flex items-center justify-between">
            <time datetime={guide.updatedDate} class="text-[11px] text-text-tertiary">
              Updated {formatDate(guide.updatedDate)}
            </time>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-3.5 h-3.5 text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </a>
      {/each}
    </div>

    <!-- Bottom CTA -->
    <div
      class="mt-10 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div>
        <p class="text-sm font-bold text-text-primary">Ready to see how scooters stack up?</p>
        <p class="text-xs text-text-secondary mt-0.5">Use our calculator to model performance with your exact specs.</p>
      </div>
      <a
        href="/"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-[0.1em] hover:bg-primary/15 hover:border-primary/40 transition-all duration-200 shrink-0"
      >
        Open Calculator
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-3.5 h-3.5"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </a>
    </div>
  </div>
</div>
