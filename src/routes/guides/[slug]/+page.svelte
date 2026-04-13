<script lang="ts">
  import type { PageData } from './$types';
  import type { Guide } from '$lib/data/guides';

  let { data }: { data: PageData } = $props();
  const guide = $derived(data.guide);

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
      month: 'long',
      day: 'numeric',
    });
  }

  // Structured data for SEO — used in template via {@html structuredData}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- referenced in JSON-LD script block
  const structuredData = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      datePublished: guide.publishedDate,
      dateModified: guide.updatedDate,
      author: {
        '@type': 'Organization',
        name: 'EV Scooter Pro',
      },
      publisher: {
        '@type': 'Organization',
        name: 'EV Scooter Pro',
      },
    })
  );

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

<svelte:head>
  <title>{guide.title} — EV Scooter Pro</title>
  <meta name="description" content={guide.description} />
  <meta property="og:title" content="{guide.title} — EV Scooter Pro" />
  <meta property="og:description" content={guide.description} />
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content={guide.publishedDate} />
  <meta property="article:modified_time" content={guide.updatedDate} />
  <script type="application/ld+json">
{@html structuredData}
  </script>
  <script type="application/ld+json">
{@html JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: '/guides' },
      { '@type': 'ListItem', position: 3, name: guide.title }
    ]
  })}
  </script>
</svelte:head>

<header class="sticky top-0 z-50 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <div class="h-14 flex items-center justify-between gap-4">
      <a
        href="/guides"
        class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors group"
        aria-label="Back to guides"
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
        <span class="text-xs font-bold uppercase tracking-[0.12em]">All Guides</span>
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

  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
    <div class="lg:grid lg:grid-cols-[1fr_240px] lg:gap-10 xl:gap-14">
      <!-- ── Main article ── -->
      <article>
        <!-- Article header -->
        <header class="mb-8">
          <div class="flex flex-wrap items-center gap-3 mb-3">
            <span
              class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] border {categoryColors[
                guide.category
              ]}"
            >
              {categoryLabels[guide.category]}
            </span>
            <span class="text-[11px] text-text-tertiary font-medium">{guide.readingTime} min read</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-tight mb-3">
            {guide.title}
          </h1>

          <p class="text-text-secondary text-sm leading-relaxed max-w-2xl mb-4">
            {guide.description}
          </p>

          <div
            class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-tertiary border-t border-white/[0.06] pt-4"
          >
            <span>Published <time datetime={guide.publishedDate}>{formatDate(guide.publishedDate)}</time></span>
            {#if guide.updatedDate !== guide.publishedDate}
              <span class="hidden sm:inline text-white/[0.15]">•</span>
              <span>Updated <time datetime={guide.updatedDate}>{formatDate(guide.updatedDate)}</time></span>
            {/if}
          </div>
        </header>

        <!-- Sections -->
        <div class="space-y-10">
          {#each guide.sections as section (section.id)}
            <section id={section.id} aria-labelledby="{section.id}-heading">
              <h2
                id="{section.id}-heading"
                class="text-lg font-black text-text-primary tracking-tight mb-4 pb-2 border-b border-white/[0.06]"
              >
                {section.heading}
              </h2>
              <div class="prose-guide text-sm text-text-secondary leading-relaxed">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html section.content}
              </div>
            </section>
          {/each}
        </div>

        <!-- Bottom CTAs -->
        <div class="mt-12 pt-8 border-t border-white/[0.06] grid sm:grid-cols-2 gap-4">
          <a
            href="/guides"
            class="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all duration-200 group"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4 text-text-tertiary group-hover:text-text-secondary group-hover:-translate-x-0.5 transition-all shrink-0"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <div>
              <p class="text-xs font-bold text-text-primary">Back to Guides</p>
              <p class="text-[11px] text-text-tertiary">Browse all articles</p>
            </div>
          </a>

          <a
            href="/"
            class="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/25 hover:bg-primary/15 hover:border-primary/40 transition-all duration-200 group"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4 text-primary shrink-0"
              aria-hidden="true"
            >
              <path d="m13 2-2 10h9L7 22l2-10H1L13 2z" />
            </svg>
            <div>
              <p class="text-xs font-bold text-primary">Try the Calculator</p>
              <p class="text-[11px] text-text-tertiary">Model real-world performance</p>
            </div>
          </a>
        </div>
      </article>

      <!-- ── Sidebar ToC (desktop only) ── -->
      <aside class="hidden lg:block" aria-label="Table of contents">
        <div class="sticky top-24">
          <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary mb-3">Contents</p>
          <nav aria-label="Article sections">
            <ul class="space-y-0.5">
              {#each guide.sections as section (section.id)}
                <li>
                  <button
                    type="button"
                    onclick={() => scrollToSection(section.id)}
                    class="w-full text-left px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary hover:bg-white/[0.04] transition-colors duration-150 border-l-2 border-transparent hover:border-primary/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    {section.heading}
                  </button>
                </li>
              {/each}
            </ul>
          </nav>

          <div class="mt-6 pt-6 border-t border-white/[0.06]">
            <a
              href="/"
              class="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition-colors font-medium"
            >
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
                <path d="m13 2-2 10h9L7 22l2-10H1L13 2z" />
              </svg>
              Open Calculator
            </a>
          </div>
        </div>
      </aside>
    </div>
  </div>
</div>

<style>
  /* Prose styles for guide HTML content */
  :global(.prose-guide p) {
    margin-bottom: 0.875rem;
    line-height: 1.7;
  }
  :global(.prose-guide p:last-child) {
    margin-bottom: 0;
  }
  :global(.prose-guide ul) {
    margin: 0.75rem 0 0.875rem 0;
    padding-left: 1.25rem;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  :global(.prose-guide li) {
    position: relative;
    padding-left: 0.75rem;
  }
  :global(.prose-guide li::before) {
    content: '';
    position: absolute;
    left: -0.125rem;
    top: 0.55em;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--color-primary);
    opacity: 0.7;
  }
  :global(.prose-guide strong) {
    color: var(--color-text-primary);
    font-weight: 700;
  }
  :global(.prose-guide a) {
    color: var(--color-primary);
    text-decoration-line: underline;
    text-underline-offset: 2px;
  }
  :global(.prose-guide a:hover) {
    color: var(--color-primary-hover);
  }
</style>
