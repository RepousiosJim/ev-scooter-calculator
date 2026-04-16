<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-svelte';
  import type { CollectionIndexPageData } from './+page.server.ts';

  let { data }: { data: CollectionIndexPageData } = $props();

  const all = $derived(data.collections);

  const titleText = 'Best Electric Scooters — Curated Rankings by Category (2026)';
  const descriptionText =
    'Browse our full catalog of best-of rankings for electric scooters: budget picks, long range, fastest, commuter, hill climbers, and more. Physics-based, no sponsored picks.';

  const schemaJson = $derived.by(() => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: titleText,
    description: descriptionText,
    url: `${$page.url.origin}/best`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: all.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.h1,
        url: `${$page.url.origin}/best/${c.slug}`,
      })),
    },
  }));
</script>

<svelte:head>
  <title>{titleText}</title>
  <meta name="description" content={descriptionText} />
  <link rel="canonical" href="{$page.url.origin}/best" />
  <meta property="og:title" content={titleText} />
  <meta property="og:description" content={descriptionText} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html '<script type="application/ld+json">' + JSON.stringify(schemaJson) + '<' + '/script>'}
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <div
    class="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>

  <header class="sticky top-0 z-50 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl">
    <div class="max-w-4xl mx-auto px-4 sm:px-6">
      <div class="h-14 flex items-center justify-between gap-4">
        <a
          href="/"
          class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors group"
          aria-label="Back to home"
        >
          <ArrowLeft size={16} class="group-hover:-translate-x-0.5 transition-transform" />
          <span class="text-xs font-bold uppercase tracking-[0.12em]">Home</span>
        </a>
        <a href="/rankings" class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-black text-text-tertiary hover:text-primary/80 transition-colors tracking-tight">
            Full rankings →
          </span>
        </a>
      </div>
    </div>
  </header>

  <div class="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-8">
    <!-- Hero -->
    <section class="text-center space-y-4">
      <span
        class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary"
      >
        <Sparkles size={11} aria-hidden="true" />
        Curated rankings
      </span>
      <h1 class="text-3xl sm:text-5xl font-black text-text-primary tracking-tight leading-tight">
        Best Electric Scooters<br class="hidden sm:block" /> by Category
      </h1>
      <p class="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
        Ranked lists for the queries that actually matter: budget picks, long-range commuters, top-speed flagships, hill
        climbers. Every ranking is computed from the same physics engine — transparent, reproducible, zero sponsored
        placement.
      </p>
    </section>

    <!-- Collections grid -->
    <section aria-label="All collections" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {#each all as c (c.slug)}
        <a
          href="/best/{c.slug}"
          class="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-5 transition-all space-y-2"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-base font-black text-text-primary group-hover:text-primary transition-colors leading-tight">
              {c.h1}
            </h2>
            <ArrowRight
              size={14}
              class="text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
              aria-hidden="true"
            />
          </div>
          <p class="text-xs text-text-secondary leading-relaxed line-clamp-2">{c.description}</p>
          <div class="flex items-center gap-3 text-[11px] text-text-tertiary pt-1">
            <span class="font-bold tabular-nums">{c.count} scooters</span>
            {#if c.topScooterName}
              <span class="truncate">· Top pick: {c.topScooterName}</span>
            {/if}
          </div>
        </a>
      {/each}
    </section>
  </div>
</div>
