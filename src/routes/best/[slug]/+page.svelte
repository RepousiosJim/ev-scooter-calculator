<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, Trophy, ArrowRight, Zap, Gauge, Activity, DollarSign } from 'lucide-svelte';
  import type { CollectionPageData } from './+page.server.ts';

  let { data }: { data: CollectionPageData } = $props();

  const entries = $derived(data.entries);
  const related = $derived(data.relatedCollections);

  const schemaJson = $derived.by(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: data.h1,
      description: data.description,
      itemListElement: entries.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: e.name,
          category: 'Electric Scooter',
          url: `${$page.url.origin}/scooter/${e.key}`,
          brand: { '@type': 'Brand', name: e.name.split(' ')[0] },
          ...(e.price != null
            ? {
                offers: {
                  '@type': 'Offer',
                  price: e.price,
                  priceCurrency: 'USD',
                },
              }
            : {}),
        },
      })),
    };
  });

  const breadcrumbJson = $derived.by(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: $page.url.origin + '/' },
      { '@type': 'ListItem', position: 2, name: 'Best Scooters', item: $page.url.origin + '/best' },
      { '@type': 'ListItem', position: 3, name: data.h1 },
    ],
  }));

  const medalFor = (rank: number) => {
    if (rank === 0) return { bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/40', text: 'text-[#FFD700]' };
    if (rank === 1) return { bg: 'bg-[#C0C0C0]/10', border: 'border-[#C0C0C0]/40', text: 'text-[#C0C0C0]' };
    if (rank === 2) return { bg: 'bg-[#CD7F32]/10', border: 'border-[#CD7F32]/40', text: 'text-[#CD7F32]' };
    return { bg: 'bg-white/[0.03]', border: 'border-white/[0.08]', text: 'text-text-tertiary' };
  };
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  <link rel="canonical" href="{$page.url.origin}/best/{data.slug}" />
  <meta property="og:title" content={data.title} />
  <meta property="og:description" content={data.description} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html '<script type="application/ld+json">' + JSON.stringify(schemaJson) + '<' + '/script>'}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html '<script type="application/ld+json">' + JSON.stringify(breadcrumbJson) + '<' + '/script>'}
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
          href="/best"
          class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors group"
          aria-label="Back to all collections"
        >
          <ArrowLeft size={16} class="group-hover:-translate-x-0.5 transition-transform" />
          <span class="text-xs font-bold uppercase tracking-[0.12em]">All collections</span>
        </a>
        <a href="/" class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-black text-text-tertiary hover:text-primary/80 transition-colors tracking-tight">
            EV Scooter Pro
          </span>
        </a>
      </div>
    </div>
  </header>

  <div class="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-8">
    <!-- Hero -->
    <section class="text-center space-y-4">
      <span class="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary"
        >Curated ranking</span
      >
      <h1 class="text-3xl sm:text-5xl font-black text-text-primary tracking-tight leading-tight">
        {data.h1}
      </h1>
      <p class="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
        {data.intro}
      </p>
      <div
        class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary bg-white/[0.03] border border-white/[0.08] rounded-full px-3 py-1.5"
      >
        <Trophy size={12} aria-hidden="true" />
        <span>Ranked by: {data.sortLabel}</span>
      </div>
    </section>

    <!-- Ranking list -->
    <section aria-label="Ranked list" class="space-y-3">
      {#if entries.length === 0}
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center text-text-tertiary">
          No scooters currently match the criteria for this collection.
        </div>
      {:else}
        {#each entries as entry, i (entry.key)}
          {@const medal = medalFor(i)}
          <a
            href="/scooter/{entry.key}"
            class="group block bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 transition-all"
          >
            <div class="flex items-center gap-4">
              <!-- Rank -->
              <div
                class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border {medal.bg} {medal.border}"
              >
                <span class="text-sm font-black {medal.text}">#{i + 1}</span>
              </div>

              <!-- Name + stats -->
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 flex-wrap">
                  <h2
                    class="text-base sm:text-lg font-black text-text-primary group-hover:text-primary transition-colors"
                  >
                    {entry.name}
                  </h2>
                  <span class="text-xs font-bold text-text-tertiary">{entry.year}</span>
                </div>
                <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-text-secondary">
                  <div class="flex items-center gap-1.5">
                    <Zap size={11} class="text-text-tertiary" aria-hidden="true" />
                    <span class="tabular-nums">{Math.round(entry.speed)} km/h</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Gauge size={11} class="text-text-tertiary" aria-hidden="true" />
                    <span class="tabular-nums">{Math.round(entry.range)} km</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Activity size={11} class="text-text-tertiary" aria-hidden="true" />
                    <span class="tabular-nums">{Math.round(entry.power)} W</span>
                  </div>
                  {#if entry.price != null}
                    <div class="flex items-center gap-1.5">
                      <DollarSign size={11} class="text-text-tertiary" aria-hidden="true" />
                      <span class="tabular-nums">${entry.price.toLocaleString()}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Grade badge + CTA -->
              <div class="shrink-0 flex items-center gap-3">
                <div class="text-right">
                  <div class="text-xl sm:text-2xl font-black text-text-primary leading-none tabular-nums">
                    {entry.score.toFixed(1)}
                  </div>
                  <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary mt-0.5">
                    Grade {entry.grade}
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  class="text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                  aria-hidden="true"
                />
              </div>
            </div>
          </a>
        {/each}
      {/if}
    </section>

    <!-- Methodology -->
    <section class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-3">
      <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">How we rank</h2>
      <p class="text-sm text-text-secondary leading-relaxed">
        Every scooter in our catalog is run through the same physics engine: battery voltage and capacity, motor Kv,
        drivetrain efficiency, rider weight, and aerodynamic drag. The resulting numbers are used to filter and rank
        each collection. No sponsored placement. No manufacturer bias. The calculation is transparent and reproducible —
        you can plug any build into our
        <a href="/" class="text-primary hover:text-primary-hover underline underline-offset-2">calculator</a>
        and see the same math.
      </p>
    </section>

    <!-- Related collections -->
    {#if related.length > 0}
      <section aria-label="Related collections">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
          <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">Explore more collections</h2>
          <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each related as rel (rel.slug)}
            <a
              href="/best/{rel.slug}"
              class="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 transition-all flex items-center justify-between gap-3"
            >
              <span class="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                {rel.h1}
              </span>
              <ArrowRight
                size={14}
                class="text-text-tertiary group-hover:text-primary transition-colors shrink-0"
                aria-hidden="true"
              />
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>
