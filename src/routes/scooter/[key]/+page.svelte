<script lang="ts">
  import { fly } from 'svelte/transition';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    Zap,
    Gauge,
    Battery,
    Timer,
    TrendingUp,
    Activity,
    AlertTriangle,
    DollarSign,
    BarChart3,
    Cpu,
    Scale,
    Info,
    Printer,
  } from 'lucide-svelte';
  import type { ScooterPageData } from './+page.server.ts';
  import NewsletterSignup from '$lib/components/ui/NewsletterSignup.svelte';

  let { data }: { data: ScooterPageData } = $props();

  // Unwrap all fields reactively
  const key = $derived(data.key);
  const config = $derived(data.config);
  const metadata = $derived(data.metadata);
  const stats = $derived(data.stats);
  const breakdown = $derived(data.breakdown);
  const score = $derived(data.score);
  const grade = $derived(data.grade);
  const gradeInfo = $derived(data.gradeInfo);
  const bottlenecks = $derived(data.bottlenecks);
  const recommendations = $derived(data.recommendations);

  // Derived display values
  const topRecommendations = $derived(recommendations.slice(0, 3));

  const statusLabel = $derived.by(() => {
    switch (metadata.status) {
      case 'current':
        return 'Current';
      case 'discontinued':
        return 'Discontinued';
      case 'upcoming':
        return 'Upcoming';
      case 'unverified':
        return 'Unverified';
      default:
        return null;
    }
  });

  const statusColors = $derived.by(() => {
    switch (metadata.status) {
      case 'current':
        return 'bg-success/10 text-success border-success/20';
      case 'discontinued':
        return 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20';
      case 'upcoming':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'unverified':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-white/5 text-text-tertiary border-white/10';
    }
  });

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'text-success bg-success/10 border-success/20';
    if (d === 'moderate') return 'text-warning bg-warning/10 border-warning/20';
    return 'text-danger bg-danger/10 border-danger/20';
  };

  const difficultySegments = (d: string) => (d === 'easy' ? 1 : d === 'moderate' ? 2 : 3);
  const difficultyFill = (d: string) => (d === 'easy' ? 'bg-success' : d === 'moderate' ? 'bg-warning' : 'bg-danger');

  // Score bar helper: percent within its max
  const scoreBarWidth = (val: number, max: number) => `${Math.round((val / max) * 100)}%`;

  // Grade color styles for hero
  const gradeTextStyle = $derived(`color: ${gradeInfo.color};`);
  const gradeBgStyle = $derived(`background: ${gradeInfo.color}18; border: 2px solid ${gradeInfo.color}55;`);

  // Bottleneck severity
  const bottleneckStyle = (type: string): { dot: string; border: string } => {
    switch (type) {
      case 'SAG_WARNING':
        return { dot: 'bg-red-500', border: '#dc2626' };
      case 'CONTROLLER_LIMIT':
        return { dot: 'bg-amber-500', border: '#f59e0b' };
      case 'GEAR_RATIO_LIMIT':
        return { dot: 'bg-amber-500', border: '#f59e0b' };
      case 'HILL_CLIMB_LIMIT':
        return { dot: 'bg-amber-500', border: '#f59e0b' };
      default:
        return { dot: 'bg-slate-400', border: '#f59e0b' };
    }
  };

  const hasPriceHistory = $derived(!!(metadata.priceHistory && metadata.priceHistory.length > 0));

  const currentPrice = $derived(metadata.manufacturer?.price);

  // Spec vs calculated delta helpers
  const claimedSpeed = $derived(metadata.manufacturer?.topSpeed);
  const claimedRange = $derived(metadata.manufacturer?.range);
  const calcSpeed = $derived(Math.round(stats.speed));
  const calcRange = $derived(Math.round(stats.totalRange));

  const speedDelta = $derived(claimedSpeed ? Math.round(stats.speed - claimedSpeed) : null);
  const rangeDelta = $derived(claimedRange ? Math.round(stats.totalRange - claimedRange) : null);

  function deltaClass(d: number | null) {
    if (d === null) return '';
    if (d > 0) return 'text-success';
    if (d < 0) return 'text-danger';
    return 'text-text-tertiary';
  }
  function deltaStr(d: number | null) {
    if (d === null) return '';
    return d > 0 ? `+${d}` : `${d}`;
  }

  // Schema.org Product structured data for SEO / Google rich snippets
  const productSchema = $derived.by(() => {
    const brandName = metadata.name.split(' ')[0];

    const availabilityMap: Record<string, string> = {
      current: 'https://schema.org/InStock',
      discontinued: 'https://schema.org/Discontinued',
      upcoming: 'https://schema.org/PreOrder',
    };
    const availability = availabilityMap[metadata.status ?? ''] ?? 'https://schema.org/InStock';

    const descriptionParts: string[] = [
      `${metadata.year} ${metadata.name} electric scooter.`,
      `Calculated top speed: ${Math.round(stats.speed)} km/h.`,
      `Estimated range: ${Math.round(stats.totalRange)} km.`,
      `Peak power: ${Math.round(stats.totalWatts)} W.`,
    ];
    if (metadata.manufacturer?.batteryWh) {
      descriptionParts.push(`Battery: ${metadata.manufacturer.batteryWh} Wh.`);
    }
    descriptionParts.push(`Performance grade: ${grade} (${score.toFixed(1)}/100).`);

    const additionalProperty: Record<string, unknown>[] = [
      { '@type': 'PropertyValue', name: 'Top Speed', value: Math.round(stats.speed), unitCode: 'KMH' },
      { '@type': 'PropertyValue', name: 'Range', value: Math.round(stats.totalRange), unitCode: 'KMT' },
      { '@type': 'PropertyValue', name: 'Peak Power', value: Math.round(stats.totalWatts), unitCode: 'WTT' },
      { '@type': 'PropertyValue', name: 'Performance Score', value: score.toFixed(1) },
      { '@type': 'PropertyValue', name: 'Performance Grade', value: grade },
    ];
    if (metadata.manufacturer?.batteryWh) {
      additionalProperty.push({
        '@type': 'PropertyValue',
        name: 'Battery',
        value: metadata.manufacturer.batteryWh,
        unitCode: 'WHR',
      });
    }

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: metadata.name,
      description: descriptionParts.join(' '),
      category: 'Electric Scooter',
      brand: { '@type': 'Brand', name: brandName },
      additionalProperty: additionalProperty,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (score / 20).toFixed(1),
        bestRating: '5',
        worstRating: '1',
        ratingCount: '1',
        reviewCount: '1',
      },
    };

    if (metadata.manufacturer?.price) {
      schema['offers'] = {
        '@type': 'Offer',
        price: metadata.manufacturer.price,
        priceCurrency: 'USD',
        availability: availability,
        priceValidUntil: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0],
      };
    }

    return schema;
  });
</script>

<svelte:head>
  <title>{metadata.name} ({metadata.year}) — EV Scooter Pro Calculator</title>
  <meta
    name="description"
    content="Performance analysis for the {metadata.name}: {Math.round(stats.speed)} km/h top speed, {Math.round(
      stats.totalRange
    )} km range, {stats.totalWatts}W power. Grade: {grade}."
  />
  <meta property="og:title" content="{metadata.name} — Performance Analysis" />
  <meta
    property="og:description"
    content="{Math.round(stats.speed)} km/h · {Math.round(stats.totalRange)} km range · Grade {grade}"
  />
  <meta property="og:image" content="{$page.url.origin}/api/og?scooter={key}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="product" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{metadata.name} — Performance Analysis" />
  <meta name="twitter:image" content="{$page.url.origin}/api/og?scooter={key}" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html '<script type="application/ld+json">' + JSON.stringify(productSchema) + '<' + '/script>'}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html '<script type="application/ld+json">' +
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: $page.url.origin + '/' },
        { '@type': 'ListItem', position: 2, name: 'Rankings', item: $page.url.origin + '/rankings' },
        { '@type': 'ListItem', position: 3, name: metadata.name },
      ],
    }) +
    '<' +
    '/script>'}
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <!-- Ambient glow orbs -->
  <div
    class="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>
  <div
    class="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-secondary/[0.03] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>

  <!-- ═══════════════════════════════════════════════
       HEADER BAR (Back nav)
       ═══════════════════════════════════════════════ -->
  <header class="sticky top-0 z-50 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl">
    <div class="max-w-4xl mx-auto px-4 sm:px-6">
      <div class="h-14 flex items-center justify-between gap-4">
        <a
          href="/rankings"
          class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors group"
          aria-label="Back to rankings"
        >
          <ArrowLeft size={16} class="group-hover:-translate-x-0.5 transition-transform" />
          <span class="text-xs font-bold uppercase tracking-[0.12em]">Rankings</span>
        </a>

        <a href="/" class="flex items-center gap-2 group shrink-0">
          <span
            class="text-xs font-black text-text-tertiary group-hover:text-primary/80 transition-colors tracking-tight"
          >
            EV Scooter Pro
          </span>
        </a>
      </div>
    </div>
  </header>

  <div class="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-8">
    <!-- ═══════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════ -->
    <section
      in:fly={{ y: 20, duration: 400, delay: 0 }}
      class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 sm:p-8"
      aria-labelledby="hero-heading"
    >
      <!-- Badges row -->
      <div class="flex items-center gap-2 flex-wrap mb-4">
        <span
          class="text-xs font-bold uppercase tracking-[0.12em] text-text-tertiary bg-white/[0.04] border border-white/[0.08] rounded-full px-2.5 py-1"
        >
          {metadata.year}
        </span>
        {#if statusLabel}
          <span class="text-xs font-bold uppercase tracking-[0.12em] border rounded-full px-2.5 py-1 {statusColors}">
            {statusLabel}
          </span>
        {/if}
      </div>

      <!-- Name + grade layout -->
      <div class="flex items-start justify-between gap-6 flex-wrap">
        <div class="flex-1 min-w-0">
          <h1 id="hero-heading" class="text-3xl font-black text-text-primary tracking-tight leading-tight">
            {metadata.name}
          </h1>
          {#if metadata.notes}
            <p class="text-sm text-text-tertiary mt-2 leading-relaxed">{metadata.notes}</p>
          {/if}
        </div>

        <!-- Grade badge -->
        <div
          class="flex flex-col items-center gap-1 rounded-2xl p-4 shrink-0"
          style={gradeBgStyle}
          aria-label="Performance grade: {grade} — {gradeInfo.label}"
          role="img"
        >
          <span class="text-5xl font-black leading-none" style={gradeTextStyle}>{grade}</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.15em]" style={gradeTextStyle}>{gradeInfo.label}</span
          >
          <span class="text-xs font-bold text-text-tertiary mt-0.5">{score.toFixed(1)} / 100</span>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════
         KEY STATS GRID
         ═══════════════════════════════════════════════ -->
    <section in:fly={{ y: 20, duration: 400, delay: 60 }} aria-label="Key performance statistics">
      <!-- Section header -->
      <div class="flex items-center gap-3 mb-4">
        <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
        <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">Performance Stats</h2>
        <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <!-- Max Range -->
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div class="flex items-center gap-2">
            <Gauge size={14} class="text-text-tertiary shrink-0" aria-hidden="true" />
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Max Range</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-black text-text-primary tabular-nums">{Math.round(stats.totalRange)}</span>
            <span class="text-xs font-bold text-text-tertiary uppercase">km</span>
          </div>
        </div>

        <!-- Top Speed -->
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div class="flex items-center gap-2">
            <Zap size={14} class="text-text-tertiary shrink-0" aria-hidden="true" />
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Top Speed</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-black text-text-primary tabular-nums">{Math.round(stats.speed)}</span>
            <span class="text-xs font-bold text-text-tertiary uppercase">km/h</span>
          </div>
        </div>

        <!-- Peak Power -->
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div class="flex items-center gap-2">
            <Activity size={14} class="text-text-tertiary shrink-0" aria-hidden="true" />
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Peak Power</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-black text-text-primary tabular-nums">{Math.round(stats.totalWatts)}</span>
            <span class="text-xs font-bold text-text-tertiary uppercase">W</span>
          </div>
        </div>

        <!-- Charge Time -->
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div class="flex items-center gap-2">
            <Timer size={14} class="text-text-tertiary shrink-0" aria-hidden="true" />
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Charge Time</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-black text-text-primary tabular-nums">{stats.chargeTime.toFixed(1)}</span>
            <span class="text-xs font-bold text-text-tertiary uppercase">h</span>
          </div>
        </div>

        <!-- Battery Energy -->
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div class="flex items-center gap-2">
            <Battery size={14} class="text-text-tertiary shrink-0" aria-hidden="true" />
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Battery</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-black text-text-primary tabular-nums">{Math.round(stats.wh)}</span>
            <span class="text-xs font-bold text-text-tertiary uppercase">Wh</span>
          </div>
        </div>

        <!-- Acceleration Score -->
        <div class="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div class="flex items-center gap-2">
            <TrendingUp size={14} class="text-text-tertiary shrink-0" aria-hidden="true" />
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Accel Score</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-black text-text-primary tabular-nums">{Math.round(stats.accelScore)}</span>
            <span class="text-xs font-bold text-text-tertiary uppercase">/ 100</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════
         SCORE BREAKDOWN
         ═══════════════════════════════════════════════ -->
    <section
      in:fly={{ y: 20, duration: 400, delay: 120 }}
      class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 sm:p-6"
      aria-labelledby="breakdown-heading"
    >
      <div class="flex items-center gap-3 mb-5">
        <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
        <h2 id="breakdown-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
          Score Breakdown
        </h2>
        <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
        <span class="text-xs font-black tabular-nums" style={gradeTextStyle}>{score.toFixed(1)}</span>
      </div>

      <div class="space-y-3.5" role="list" aria-label="Score components">
        <!-- Acceleration -->
        <div role="listitem" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary uppercase tracking-[0.1em]">Acceleration</span>
            <span class="font-black tabular-nums text-text-primary"
              >{breakdown.accel.toFixed(1)}<span class="text-text-tertiary font-bold"> / 30</span></span
            >
          </div>
          <div
            class="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={breakdown.accel}
            aria-valuemin={0}
            aria-valuemax={30}
          >
            <div
              class="h-full rounded-full bg-primary transition-all duration-700"
              style="width: {scoreBarWidth(breakdown.accel, 30)}"
            ></div>
          </div>
        </div>

        <!-- Range -->
        <div role="listitem" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary uppercase tracking-[0.1em]">Range</span>
            <span class="font-black tabular-nums text-text-primary"
              >{breakdown.range.toFixed(1)}<span class="text-text-tertiary font-bold"> / 25</span></span
            >
          </div>
          <div
            class="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={breakdown.range}
            aria-valuemin={0}
            aria-valuemax={25}
          >
            <div
              class="h-full rounded-full bg-secondary transition-all duration-700"
              style="width: {scoreBarWidth(breakdown.range, 25)}"
            ></div>
          </div>
        </div>

        <!-- Speed -->
        <div role="listitem" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary uppercase tracking-[0.1em]">Speed</span>
            <span class="font-black tabular-nums text-text-primary"
              >{breakdown.speed.toFixed(1)}<span class="text-text-tertiary font-bold"> / 20</span></span
            >
          </div>
          <div
            class="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={breakdown.speed}
            aria-valuemin={0}
            aria-valuemax={20}
          >
            <div
              class="h-full rounded-full bg-success transition-all duration-700"
              style="width: {scoreBarWidth(breakdown.speed, 20)}"
            ></div>
          </div>
        </div>

        <!-- Efficiency -->
        <div role="listitem" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary uppercase tracking-[0.1em]">Efficiency</span>
            <span class="font-black tabular-nums text-text-primary"
              >{breakdown.efficiency.toFixed(1)}<span class="text-text-tertiary font-bold"> / 15</span></span
            >
          </div>
          <div
            class="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={breakdown.efficiency}
            aria-valuemin={0}
            aria-valuemax={15}
          >
            <div
              class="h-full rounded-full bg-warning transition-all duration-700"
              style="width: {scoreBarWidth(breakdown.efficiency, 15)}"
            ></div>
          </div>
        </div>
      </div>

      <!-- Penalties -->
      {#if breakdown.strainPenalty > 0 || breakdown.weightPenalty > 0}
        <div class="mt-5 pt-4 border-t border-white/[0.06] space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Penalties</span>
          <div class="flex flex-wrap gap-2">
            {#if breakdown.strainPenalty > 0}
              <span
                class="flex items-center gap-1.5 text-xs font-bold text-danger bg-danger/10 border border-danger/20 rounded-full px-2.5 py-1"
              >
                <AlertTriangle size={10} aria-hidden="true" />
                Battery Strain −{breakdown.strainPenalty.toFixed(1)}
              </span>
            {/if}
            {#if breakdown.weightPenalty > 0}
              <span
                class="flex items-center gap-1.5 text-xs font-bold text-warning bg-warning/10 border border-warning/20 rounded-full px-2.5 py-1"
              >
                <Scale size={10} aria-hidden="true" />
                Weight −{breakdown.weightPenalty.toFixed(1)}
              </span>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <!-- ═══════════════════════════════════════════════
         SPECIFICATIONS
         ═══════════════════════════════════════════════ -->
    <section in:fly={{ y: 20, duration: 400, delay: 180 }} aria-labelledby="specs-heading">
      <div class="flex items-center gap-3 mb-4">
        <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
        <h2 id="specs-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
          Specifications
        </h2>
        <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Battery & Electrical -->
        <div class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <Battery size={14} class="text-primary" aria-hidden="true" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              Battery &amp; Electrical
            </h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Voltage</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.v} V</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Capacity</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.ah} Ah</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Energy</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{Math.round(stats.wh)} Wh</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">C-Rate</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{stats.cRate.toFixed(2)}C</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Charger</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.charger} A</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Battery Health</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{Math.round(config.soh * 100)}%</dd>
            </div>
          </dl>
        </div>

        <!-- Motor & Drivetrain -->
        <div class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <Cpu size={14} class="text-primary" aria-hidden="true" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              Motor &amp; Drivetrain
            </h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Motors</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.motors}x</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Power per Motor</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.watts} W</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Total Power</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{Math.round(stats.totalWatts)} W</dd>
            </div>
            {#if config.motorKv}
              <div class="flex items-center justify-between">
                <dt class="text-xs text-text-tertiary">Motor KV</dt>
                <dd class="text-xs font-bold text-text-primary tabular-nums">{config.motorKv} rpm/V</dd>
              </div>
            {/if}
            {#if config.drivetrainEfficiency != null}
              <div class="flex items-center justify-between">
                <dt class="text-xs text-text-tertiary">Drivetrain Efficiency</dt>
                <dd class="text-xs font-bold text-text-primary tabular-nums">
                  {Math.round(config.drivetrainEfficiency * 100)}%
                </dd>
              </div>
            {/if}
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Peak Current</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{stats.amps.toFixed(1)} A</dd>
            </div>
          </dl>
        </div>

        <!-- Physical -->
        <div class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <Scale size={14} class="text-primary" aria-hidden="true" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">Physical</h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Wheel Size</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.wheel}"</dd>
            </div>
            {#if config.scooterWeight != null}
              <div class="flex items-center justify-between">
                <dt class="text-xs text-text-tertiary">Scooter Weight</dt>
                <dd class="text-xs font-bold text-text-primary tabular-nums">{config.scooterWeight} kg</dd>
              </div>
            {/if}
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Rider Weight</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{config.weight} kg</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-xs text-text-tertiary">Hill Speed</dt>
              <dd class="text-xs font-bold text-text-primary tabular-nums">{stats.hillSpeed.toFixed(1)} km/h</dd>
            </div>
          </dl>
        </div>

        <!-- Manufacturer Claims vs Calculated -->
        {#if metadata.manufacturer}
          <div class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
              <BarChart3 size={14} class="text-primary" aria-hidden="true" />
              <h3 class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                Claims vs Calculated
              </h3>
            </div>
            <dl class="space-y-3">
              <!-- Speed row -->
              <div>
                <dt class="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-1.5">Top Speed</dt>
                <div class="flex items-baseline gap-3 flex-wrap">
                  <dd class="flex items-baseline gap-1">
                    <span class="text-[10px] text-text-tertiary uppercase font-bold">MFR</span>
                    <span class="text-sm font-black text-text-primary tabular-nums">
                      {claimedSpeed != null ? claimedSpeed : '—'}<span class="text-[10px] text-text-tertiary">
                        km/h</span
                      >
                    </span>
                  </dd>
                  <div class="w-px h-4 bg-white/[0.08]" aria-hidden="true"></div>
                  <dd class="flex items-baseline gap-1">
                    <span class="text-[10px] text-text-tertiary uppercase font-bold">Calc</span>
                    <span class="text-sm font-black text-text-primary tabular-nums">
                      {calcSpeed}<span class="text-[10px] text-text-tertiary"> km/h</span>
                    </span>
                  </dd>
                  {#if speedDelta !== null}
                    <dd class="text-xs font-bold {deltaClass(speedDelta)} tabular-nums">{deltaStr(speedDelta)} km/h</dd>
                  {/if}
                </div>
              </div>
              <!-- Range row -->
              <div>
                <dt class="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-1.5">Range</dt>
                <div class="flex items-baseline gap-3 flex-wrap">
                  <dd class="flex items-baseline gap-1">
                    <span class="text-[10px] text-text-tertiary uppercase font-bold">MFR</span>
                    <span class="text-sm font-black text-text-primary tabular-nums">
                      {claimedRange != null ? claimedRange : '—'}<span class="text-[10px] text-text-tertiary"> km</span>
                    </span>
                  </dd>
                  <div class="w-px h-4 bg-white/[0.08]" aria-hidden="true"></div>
                  <dd class="flex items-baseline gap-1">
                    <span class="text-[10px] text-text-tertiary uppercase font-bold">Calc</span>
                    <span class="text-sm font-black text-text-primary tabular-nums">
                      {calcRange}<span class="text-[10px] text-text-tertiary"> km</span>
                    </span>
                  </dd>
                  {#if rangeDelta !== null}
                    <dd class="text-xs font-bold {deltaClass(rangeDelta)} tabular-nums">{deltaStr(rangeDelta)} km</dd>
                  {/if}
                </div>
              </div>
              <!-- Battery Wh if available -->
              {#if metadata.manufacturer.batteryWh}
                <div>
                  <dt class="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-1.5">
                    Battery Energy
                  </dt>
                  <div class="flex items-baseline gap-3 flex-wrap">
                    <dd class="flex items-baseline gap-1">
                      <span class="text-[10px] text-text-tertiary uppercase font-bold">MFR</span>
                      <span class="text-sm font-black text-text-primary tabular-nums">
                        {metadata.manufacturer.batteryWh}<span class="text-[10px] text-text-tertiary"> Wh</span>
                      </span>
                    </dd>
                    <div class="w-px h-4 bg-white/[0.08]" aria-hidden="true"></div>
                    <dd class="flex items-baseline gap-1">
                      <span class="text-[10px] text-text-tertiary uppercase font-bold">Calc</span>
                      <span class="text-sm font-black text-text-primary tabular-nums">
                        {Math.round(stats.wh)}<span class="text-[10px] text-text-tertiary"> Wh</span>
                      </span>
                    </dd>
                  </div>
                </div>
              {/if}
            </dl>
          </div>
        {/if}
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════
         BOTTLENECKS
         ═══════════════════════════════════════════════ -->
    {#if bottlenecks.length > 0}
      <section in:fly={{ y: 20, duration: 400, delay: 240 }} aria-labelledby="bottleneck-heading">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true"></span>
          <h2 id="bottleneck-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Issues Detected
          </h2>
          <span
            class="text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 rounded-full px-2 py-0.5"
          >
            {bottlenecks.length}
          </span>
          <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
        </div>

        <ul class="space-y-3" role="list">
          {#each bottlenecks as bn}
            {@const s = bottleneckStyle(bn.type)}
            <li class="border-2 rounded-xl p-4 bg-white/[0.02]" style:border-color={s.border} role="listitem">
              <div class="flex items-start gap-3">
                <span class="inline-block w-2.5 h-2.5 rounded-full {s.dot} mt-0.5 shrink-0" aria-hidden="true"></span>
                <div>
                  <p class="text-sm font-semibold text-text-primary">{bn.message}</p>
                  <p class="text-xs text-text-tertiary mt-1">
                    Suggested fix:
                    <span class="text-primary font-medium capitalize">{bn.upgrade}</span>
                  </p>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <!-- ═══════════════════════════════════════════════
         UPGRADE RECOMMENDATIONS
         ═══════════════════════════════════════════════ -->
    {#if topRecommendations.length > 0}
      <section in:fly={{ y: 20, duration: 400, delay: 300 }} aria-labelledby="upgrades-heading">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
          <h2 id="upgrades-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Upgrade Recommendations
          </h2>
          <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
        </div>

        <div class="space-y-4">
          {#each topRecommendations as rec}
            <article class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <!-- Header row -->
              <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="space-y-1 flex-1 min-w-0">
                  <h3 class="text-sm font-bold text-text-primary">{rec.title}</h3>
                  <p class="text-xs text-text-secondary leading-relaxed">{rec.reason}</p>
                </div>
                <div class="flex flex-col items-end gap-2 shrink-0">
                  <!-- Difficulty badge -->
                  <span
                    class="text-[10px] font-bold uppercase tracking-[0.12em] border rounded-full px-2.5 py-1 {difficultyColor(
                      rec.difficulty
                    )}"
                  >
                    {rec.difficulty}
                  </span>
                  <!-- Difficulty segments -->
                  <div class="flex gap-0.5" aria-hidden="true">
                    {#each Array(3) as _, i}
                      <div
                        class="w-4 h-1 rounded-sm {i < difficultySegments(rec.difficulty)
                          ? difficultyFill(rec.difficulty)
                          : 'bg-white/10'}"
                      ></div>
                    {/each}
                  </div>
                </div>
              </div>

              <!-- Expected gains -->
              <div class="pt-3 border-t border-white/[0.06] space-y-1.5">
                <div
                  class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary flex items-center gap-1.5"
                >
                  <Zap size={10} aria-hidden="true" /> Expected Gains
                </div>
                <p class="text-xs text-text-secondary">
                  <span class="font-bold text-success">SPEC:</span>
                  {rec.expectedGains.spec}
                </p>
                <p class="text-xs text-text-secondary opacity-80">
                  <span class="font-bold text-primary">REAL:</span>
                  {rec.expectedGains.realworld}
                </p>
              </div>

              <!-- Footer: cost -->
              <div class="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Est. Cost</span>
                <span class="text-sm font-black text-text-primary">{rec.estimatedCost}</span>
              </div>
            </article>
          {/each}
        </div>

        {#if recommendations.length > 3}
          <p class="text-center text-xs text-text-tertiary mt-3">
            +{recommendations.length - 3} more upgrade{recommendations.length - 3 !== 1 ? 's' : ''} available in the
            <a href="/?preset={key}" class="text-primary hover:underline">calculator</a>
          </p>
        {/if}
      </section>
    {/if}

    <!-- ═══════════════════════════════════════════════
         PRICE SECTION
         ═══════════════════════════════════════════════ -->
    {#if currentPrice}
      <section
        in:fly={{ y: 20, duration: 400, delay: 360 }}
        class="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 sm:p-6"
        aria-labelledby="price-heading"
      >
        <div class="flex items-center gap-3 mb-5">
          <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
          <h2 id="price-heading" class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">Pricing</h2>
          <div class="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" aria-hidden="true"></div>
        </div>

        <div class="flex items-baseline gap-2 mb-4">
          <DollarSign size={18} class="text-text-tertiary mb-0.5" aria-hidden="true" />
          <span class="text-3xl font-black text-text-primary tabular-nums">
            {currentPrice.toLocaleString()}
          </span>
          <span class="text-xs font-bold text-text-tertiary uppercase">USD</span>
        </div>

        {#if hasPriceHistory && metadata.priceHistory!.length > 1}
          <div class="space-y-2">
            <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary mb-3">Price History</div>
            <ol class="space-y-2 relative pl-4" aria-label="Price history timeline">
              <div class="absolute left-1.5 top-2 bottom-2 w-px bg-white/[0.06]" aria-hidden="true"></div>
              {#each metadata.priceHistory! as entry, i}
                <li class="flex items-baseline gap-3 relative">
                  <span
                    class="absolute -left-2.5 top-1 w-2 h-2 rounded-full {i === metadata.priceHistory!.length - 1
                      ? 'bg-primary'
                      : 'bg-white/20'}"
                    aria-hidden="true"
                  ></span>
                  <time
                    datetime={entry.date}
                    class="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.08em] tabular-nums w-20 shrink-0"
                  >
                    {entry.date}
                  </time>
                  <span class="text-xs font-bold text-text-primary tabular-nums">${entry.price.toLocaleString()}</span>
                  {#if i > 0}
                    {@const prevPrice = metadata.priceHistory![i - 1].price}
                    {@const diff = entry.price - prevPrice}
                    {#if diff !== 0}
                      <span class="text-[10px] font-bold {diff > 0 ? 'text-danger' : 'text-success'}">
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                      </span>
                    {/if}
                  {/if}
                </li>
              {/each}
            </ol>
          </div>
        {/if}
      </section>
    {/if}

    <!-- ═══════════════════════════════════════════════
         DATA SOURCE NOTE
         ═══════════════════════════════════════════════ -->
    {#if metadata.source || metadata.sourceUrl}
      <div
        in:fly={{ y: 20, duration: 400, delay: 400 }}
        class="flex items-start gap-2 text-xs text-text-tertiary bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"
        role="note"
        aria-label="Data source information"
      >
        <Info size={12} class="mt-0.5 shrink-0 text-text-tertiary/60" aria-hidden="true" />
        <span>
          Data source:
          {#if metadata.sourceUrl}
            <a
              href={metadata.sourceUrl}
              class="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {metadata.source ?? metadata.sourceUrl}
            </a>
          {:else}
            <span class="font-medium text-text-secondary">{metadata.source}</span>
          {/if}
          {#if metadata.lastVerified}
            · Last verified {metadata.lastVerified}
          {/if}
        </span>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════
         ACTION BUTTONS
         ═══════════════════════════════════════════════ -->
    <nav in:fly={{ y: 20, duration: 400, delay: 440 }} class="flex flex-wrap gap-3" aria-label="Scooter actions">
      <a
        href="/?preset={key}"
        class="flex items-center gap-2 px-5 py-3 bg-primary text-bg-primary font-bold text-sm rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <Zap size={16} aria-hidden="true" />
        Try in Calculator
      </a>

      <a
        href="/?tab=compare"
        class="flex items-center gap-2 px-5 py-3 bg-white/[0.04] text-text-primary font-bold text-sm rounded-xl border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <BarChart3 size={16} aria-hidden="true" />
        Compare
      </a>

      <a
        href="/rankings"
        class="flex items-center gap-2 px-5 py-3 bg-white/[0.02] text-text-secondary font-bold text-sm rounded-xl border border-white/[0.06] hover:bg-white/[0.05] hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Rankings
      </a>

      <button
        type="button"
        onclick={() => window.print()}
        class="flex items-center gap-2 px-5 py-3 bg-white/[0.02] text-text-secondary font-bold text-sm rounded-xl border border-white/[0.06] hover:bg-white/[0.05] hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        aria-label="Print or save as PDF"
      >
        <Printer size={16} aria-hidden="true" />
        Print / PDF
      </button>
    </nav>

    <!-- Newsletter Signup -->
    <div class="mt-8">
      <NewsletterSignup variant="inline" context="scooter-detail" />
    </div>
  </div>
</div>
