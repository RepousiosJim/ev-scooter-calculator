<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, Trophy, Zap, Gauge, Battery, Activity, TrendingUp, Scale, DollarSign } from 'lucide-svelte';
  import type { ComparePageData } from './+page.server.ts';

  let { data }: { data: ComparePageData } = $props();

  const a = $derived(data.a);
  const b = $derived(data.b);
  const winners = $derived(data.winners);
  const overallWinner = $derived(data.overallWinner);

  const titleText = $derived(
    `${a.metadata.name} vs ${b.metadata.name}: Which Is Better? (${a.metadata.year} Comparison)`
  );

  const descriptionText = $derived(
    `Head-to-head comparison of the ${a.metadata.name} and ${b.metadata.name}. ` +
      `${a.metadata.name}: ${Math.round(a.stats.speed)} km/h, ${Math.round(a.stats.totalRange)} km range, grade ${a.grade}. ` +
      `${b.metadata.name}: ${Math.round(b.stats.speed)} km/h, ${Math.round(b.stats.totalRange)} km range, grade ${b.grade}. ` +
      `Winner: ${overallWinner === 'A' ? a.metadata.name : overallWinner === 'B' ? b.metadata.name : 'tie'}.`
  );

  const h1Text = $derived(`${a.metadata.name} vs ${b.metadata.name}`);

  // Schema.org structured data
  const schemaJson = $derived.by(() => {
    const product = (side: typeof a) => ({
      '@type': 'Product',
      name: side.metadata.name,
      category: 'Electric Scooter',
      brand: { '@type': 'Brand', name: side.metadata.name.split(' ')[0] },
      offers: side.metadata.manufacturer?.price
        ? {
            '@type': 'Offer',
            price: side.metadata.manufacturer.price,
            priceCurrency: 'USD',
          }
        : undefined,
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: h1Text,
      description: descriptionText,
      itemListElement: [
        { '@type': 'ListItem', position: 1, item: product(a) },
        { '@type': 'ListItem', position: 2, item: product(b) },
      ],
    };
  });

  function categoryIcon(category: string) {
    switch (category) {
      case 'Top Speed':
        return Zap;
      case 'Range':
        return Gauge;
      case 'Peak Power':
        return Activity;
      case 'Battery':
        return Battery;
      case 'Hill Climb':
        return TrendingUp;
      case 'Acceleration':
        return TrendingUp;
      case 'Price':
        return DollarSign;
      case 'Overall Score':
        return Trophy;
      default:
        return Scale;
    }
  }

  function formatValue(val: number, unit: string) {
    if (unit === 'USD') return `$${Math.round(val).toLocaleString()}`;
    if (unit === '/100' || unit === 'pts') return val.toFixed(1);
    return Math.round(val).toString();
  }
</script>

<svelte:head>
  <title>{titleText}</title>
  <meta name="description" content={descriptionText} />
  <link rel="canonical" href="{$page.url.origin}/compare/{data.slug}" />
  <meta property="og:title" content={titleText} />
  <meta property="og:description" content={descriptionText} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={titleText} />
  <meta name="twitter:description" content={descriptionText} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html '<script type="application/ld+json">' + JSON.stringify(schemaJson) + '<' + '/script>'}
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <header class="sticky top-0 z-50 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl">
    <div class="max-w-5xl mx-auto px-4 sm:px-6">
      <div class="h-14 flex items-center justify-between gap-4">
        <a
          href="/rankings"
          class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors group"
          aria-label="Back to rankings"
        >
          <ArrowLeft size={16} class="group-hover:-translate-x-0.5 transition-transform" />
          <span class="text-xs font-bold uppercase tracking-[0.12em]">Rankings</span>
        </a>
        <a href="/" class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-black text-text-tertiary hover:text-primary/80 transition-colors tracking-tight">
            EV Scooter Pro
          </span>
        </a>
      </div>
    </div>
  </header>

  <div class="relative max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-8">
    <!-- Hero -->
    <section class="text-center space-y-4">
      <span class="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Head-to-head</span>
      <h1 class="text-3xl sm:text-5xl font-black text-text-primary tracking-tight leading-tight">
        <a href="/scooter/{a.key}" class="hover:text-primary transition-colors">{a.metadata.name}</a>
        <span class="text-text-tertiary mx-2">vs</span>
        <a href="/scooter/{b.key}" class="hover:text-primary transition-colors">{b.metadata.name}</a>
      </h1>
      <p class="text-sm text-text-secondary max-w-2xl mx-auto leading-relaxed">
        Which electric scooter is better? A physics-based comparison of the {a.metadata.name} and {b.metadata.name},
        comparing range, speed, power, and value.
      </p>
    </section>

    <!-- Overall winner banner -->
    {#if overallWinner !== 'tie'}
      {@const winSide = overallWinner === 'A' ? a : b}
      <section
        class="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 flex items-center gap-4"
      >
        <Trophy size={28} class="text-primary shrink-0" aria-hidden="true" />
        <div class="flex-1 min-w-0">
          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Overall Winner</div>
          <div class="text-xl font-black text-text-primary mt-0.5 truncate">{winSide.metadata.name}</div>
          <p class="text-xs text-text-secondary mt-1">
            Wins {winners.filter((w) => w.winner === overallWinner).length} of {winners.length} categories
          </p>
        </div>
        <div class="text-4xl font-black" style="color: {winSide.gradeInfo.color}">{winSide.grade}</div>
      </section>
    {/if}

    <!-- Side-by-side hero cards -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each [a, b] as side, i (side.key)}
        <a
          href="/scooter/{side.key}"
          class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 hover:border-primary/30 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary mb-2">
                {i === 0 ? 'Contender A' : 'Contender B'}
              </div>
              <h2 class="text-xl font-black text-text-primary truncate">{side.metadata.name}</h2>
              <div class="text-xs text-text-tertiary mt-1">{side.metadata.year}</div>
              {#if side.metadata.manufacturer?.price}
                <div class="text-sm font-bold text-text-primary mt-3">
                  ${side.metadata.manufacturer.price.toLocaleString()}
                </div>
              {/if}
            </div>
            <div
              class="flex flex-col items-center shrink-0 rounded-xl px-3 py-2"
              style="background: {side.gradeInfo.color}18; border: 1px solid {side.gradeInfo.color}44"
            >
              <span class="text-3xl font-black leading-none" style="color: {side.gradeInfo.color}">{side.grade}</span>
              <span class="text-[9px] font-bold tabular-nums text-text-tertiary mt-1">{side.score.toFixed(1)}</span>
            </div>
          </div>
        </a>
      {/each}
    </section>

    <!-- Winners table -->
    <section aria-labelledby="winners-heading">
      <div class="flex items-center gap-3 mb-4">
        <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
        <h2 id="winners-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
          Category Breakdown
        </h2>
        <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
      </div>

      <div class="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div class="divide-y divide-white/[0.06]">
          {#each winners as w (w.category)}
            {@const Icon = categoryIcon(w.category)}
            <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 sm:px-5 py-3">
              <Icon size={16} class="text-text-tertiary shrink-0" aria-hidden="true" />

              <!-- A value -->
              <div class="min-w-0">
                <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                  {w.category}
                </div>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span
                    class="text-sm font-black tabular-nums {w.winner === 'A' ? 'text-primary' : 'text-text-primary'}"
                    >{formatValue(w.valueA, w.unit)}</span
                  >
                  <span class="text-[10px] text-text-tertiary">{w.unit}</span>
                </div>
              </div>

              <!-- B value -->
              <div class="min-w-0 text-right sm:text-left">
                <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary sm:invisible">vs</div>
                <div class="flex items-baseline gap-1 mt-0.5 justify-end sm:justify-start">
                  <span
                    class="text-sm font-black tabular-nums {w.winner === 'B' ? 'text-primary' : 'text-text-primary'}"
                    >{formatValue(w.valueB, w.unit)}</span
                  >
                  <span class="text-[10px] text-text-tertiary">{w.unit}</span>
                </div>
              </div>

              <!-- Winner badge -->
              <div class="shrink-0">
                {#if w.winner === 'tie'}
                  <span class="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">Tie</span>
                {:else}
                  <span class="text-[9px] font-bold uppercase tracking-wider text-primary"
                    >{w.winner === 'A' ? '← A' : 'B →'}</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- Spec comparison table -->
    <section aria-labelledby="specs-heading">
      <div class="flex items-center gap-3 mb-4">
        <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
        <h2 id="specs-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
          Full Specifications
        </h2>
        <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
      </div>

      <div class="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/[0.06]">
              <th class="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Spec</th
              >
              <th class="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {a.metadata.name.split(' ').slice(0, 2).join(' ')}
              </th>
              <th class="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {b.metadata.name.split(' ').slice(0, 2).join(' ')}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Battery</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{a.config.v}V × {a.config.ah}Ah</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{b.config.v}V × {b.config.ah}Ah</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Battery Energy</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(a.stats.wh)} Wh</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(b.stats.wh)} Wh</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Motors</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{a.config.motors}× {a.config.watts}W</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{b.config.motors}× {b.config.watts}W</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Total Power</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(a.stats.totalWatts)} W</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(b.stats.totalWatts)} W</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Top Speed (calc)</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(a.stats.speed)} km/h</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(b.stats.speed)} km/h</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Range (calc)</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(a.stats.totalRange)} km</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{Math.round(b.stats.totalRange)} km</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Hill Climb Speed</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{a.stats.hillSpeed.toFixed(1)} km/h</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{b.stats.hillSpeed.toFixed(1)} km/h</td
              >
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Wheel Size</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums">{a.config.wheel}"</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums">{b.config.wheel}"</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 text-xs text-text-tertiary">Charge Time</td>
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{a.stats.chargeTime.toFixed(1)} h</td
              >
              <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                >{b.stats.chargeTime.toFixed(1)} h</td
              >
            </tr>
            {#if a.metadata.manufacturer?.price && b.metadata.manufacturer?.price}
              <tr>
                <td class="px-4 py-2.5 text-xs text-text-tertiary">Price</td>
                <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                  >${a.metadata.manufacturer.price.toLocaleString()}</td
                >
                <td class="px-4 py-2.5 text-right text-xs font-bold text-text-primary tabular-nums"
                  >${b.metadata.manufacturer.price.toLocaleString()}</td
                >
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </section>

    <!-- CTAs -->
    <nav class="flex flex-wrap gap-3" aria-label="Comparison actions">
      <a
        href="/?preset={a.key}"
        class="flex items-center gap-2 px-5 py-3 bg-primary text-bg-primary font-bold text-sm rounded-xl hover:bg-primary-hover transition-colors"
      >
        <Zap size={16} aria-hidden="true" />
        Try {a.metadata.name}
      </a>
      <a
        href="/?preset={b.key}"
        class="flex items-center gap-2 px-5 py-3 bg-primary text-bg-primary font-bold text-sm rounded-xl hover:bg-primary-hover transition-colors"
      >
        <Zap size={16} aria-hidden="true" />
        Try {b.metadata.name}
      </a>
      <a
        href="/rankings"
        class="flex items-center gap-2 px-5 py-3 bg-white/[0.02] text-text-secondary font-bold text-sm rounded-xl border border-white/[0.06] hover:bg-white/[0.05] hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All Rankings
      </a>
    </nav>
  </div>
</div>
