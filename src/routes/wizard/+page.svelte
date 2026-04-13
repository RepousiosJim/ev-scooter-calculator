<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { PageData } from './$types';
  import type { ScooterConfig, PerformanceStats } from '$lib/types';
  import type { Grade, GradeInfo } from '$lib/utils/scoring';
  import { calculatePerformance } from '$lib/physics/calculator';

  let { data }: { data: PageData } = $props();

  // ─── Wizard State ────────────────────────────────────────────────────────────

  let step = $state(1);
  let flyDir = $state(1); // 1 = forward, -1 = back

  let budget = $state<string | null>(null);
  let useCase = $state<string | null>(null);
  let riderWeight = $state(80);
  let terrain = $state<string | null>(null);
  let portability = $state<string | null>(null);

  const TOTAL_STEPS = 5;

  // ─── Step definitions ────────────────────────────────────────────────────────

  const budgetOptions = [
    { value: 'under500', label: 'Under $500', sub: 'Budget-friendly', min: 0, max: 499 },
    { value: '500to1500', label: '$500 – $1,500', sub: 'Mid-range', min: 500, max: 1500 },
    { value: '1500to3000', label: '$1,500 – $3,000', sub: 'Premium', min: 1500, max: 3000 },
    { value: 'unlimited', label: '$3,000+', sub: 'No limit', min: 3000, max: Infinity },
  ];

  const useCaseOptions = [
    { value: 'commute', label: 'Daily Commute', sub: '< 10 km trips', icon: '🏙️' },
    { value: 'city', label: 'City Cruising', sub: '10 – 25 km range', icon: '🛣️' },
    { value: 'longdistance', label: 'Long Distance', sub: '25+ km journeys', icon: '🗺️' },
    { value: 'performance', label: 'Performance / Fun', sub: 'Speed & acceleration', icon: '⚡' },
  ];

  const terrainOptions = [
    { value: 'flat', label: 'Flat Roads', sub: 'Mostly level surfaces', slope: 0 },
    { value: 'some', label: 'Some Hills', sub: 'Occasional inclines', slope: 5 },
    { value: 'hilly', label: 'Hilly Area', sub: 'Regular hill climbing', slope: 10 },
    { value: 'steep', label: 'Steep Hills', sub: 'Frequent steep climbs', slope: 15 },
  ];

  const portabilityOptions = [
    { value: 'frequent', label: 'Yes, Frequently', sub: 'Stairs, public transport', maxWeight: 15 },
    { value: 'sometimes', label: 'Sometimes', sub: 'Occasional carrying', maxWeight: 25 },
    { value: 'rarely', label: 'Rarely', sub: 'Mostly stay on wheels', maxWeight: Infinity },
  ];

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const stepValid = $derived.by(() => {
    switch (step) {
      case 1:
        return budget !== null;
      case 2:
        return useCase !== null;
      case 3:
        return true; // slider always has a value
      case 4:
        return terrain !== null;
      case 5:
        return portability !== null;
      default:
        return false;
    }
  });

  function goNext() {
    if (!stepValid && step <= TOTAL_STEPS) return;
    flyDir = 1;
    step = Math.min(step + 1, TOTAL_STEPS + 1);
  }

  function goBack() {
    flyDir = -1;
    step = Math.max(step - 1, 1);
  }

  function jumpTo(target: number) {
    if (target > step && !stepValid) return;
    flyDir = target > step ? 1 : -1;
    step = target;
  }

  // ─── Recommendation Engine ────────────────────────────────────────────────────

  interface WizardScooter {
    key: string;
    name: string;
    year: number;
    price?: number;
    status?: string;
    config: ScooterConfig;
    stats: PerformanceStats;
    score: number;
    grade: Grade;
    gradeInfo: GradeInfo;
    weight: number;
  }

  interface Recommendation {
    scooter: WizardScooter;
    matchScore: number;
    reasons: string[];
    hillStats?: PerformanceStats;
  }

  const recommendations = $derived.by((): Recommendation[] => {
    if (step < TOTAL_STEPS + 1) return [];

    const budgetOpt = budgetOptions.find((b) => b.value === budget);
    const terrainOpt = terrainOptions.find((t) => t.value === terrain);
    const portOpt = portabilityOptions.find((p) => p.value === portability);
    const slope = terrainOpt?.slope ?? 0;

    // 1. Filter
    const filtered = (data.scooters as WizardScooter[]).filter((s) => {
      // Budget filter
      if (budgetOpt && s.price) {
        if (s.price < budgetOpt.min || s.price > budgetOpt.max) return false;
      }
      // Portability filter
      if (portOpt && portOpt.maxWeight < Infinity) {
        if (s.weight > portOpt.maxWeight) return false;
      }
      return true;
    });

    // 2. Score (without expensive hill computation)
    const scored = filtered.map((s) => {
      let matchScore = s.score;
      if (useCase === 'commute') {
        if (s.stats.totalRange >= 20) matchScore += 8;
        if (s.weight > 0 && s.weight < 20) matchScore += 6;
      } else if (useCase === 'city') {
        if (s.stats.totalRange >= 30) matchScore += 8;
        if (s.stats.speed >= 30) matchScore += 6;
      } else if (useCase === 'longdistance') {
        if (s.stats.totalRange >= 50) matchScore += 15;
        else if (s.stats.totalRange >= 35) matchScore += 6;
      } else if (useCase === 'performance') {
        if (s.stats.speed >= 50) matchScore += 10;
        if (s.stats.accelScore >= 70) matchScore += 8;
      }
      return { scooter: s, matchScore };
    });

    // 3. Sort and take top 5 before computing expensive hill stats + reasons
    scored.sort((a, b) => b.matchScore - a.matchScore || b.scooter.score - a.scooter.score);
    const top5 = scored.slice(0, 5);

    // 4. Build full recommendations with hill stats and reasons only for top 5
    return top5.map(({ scooter: s, matchScore }): Recommendation => {
      const reasons: string[] = [];

      if (useCase === 'commute') {
        if (s.stats.totalRange >= 20)
          reasons.push(`${Math.round(s.stats.totalRange)} km range covers daily trips easily`);
        if (s.weight > 0 && s.weight < 20) reasons.push(`Lightweight at ${s.weight} kg — easy to carry`);
        else if (s.weight > 0) reasons.push(`${Math.round(s.stats.totalRange)} km calculated range`);
      } else if (useCase === 'city') {
        if (s.stats.totalRange >= 30) reasons.push(`${Math.round(s.stats.totalRange)} km range for city exploration`);
        if (s.stats.speed >= 30) reasons.push(`${Math.round(s.stats.speed)} km/h top speed for city pace`);
      } else if (useCase === 'longdistance') {
        if (s.stats.totalRange >= 50)
          reasons.push(`Impressive ${Math.round(s.stats.totalRange)} km range for long trips`);
        else if (s.stats.totalRange >= 35) reasons.push(`${Math.round(s.stats.totalRange)} km range`);
      } else if (useCase === 'performance') {
        if (s.stats.speed >= 50) reasons.push(`${Math.round(s.stats.speed)} km/h top speed`);
        if (s.stats.accelScore >= 70) reasons.push(`Accel score: ${Math.round(s.stats.accelScore)}/100`);
      }

      let hillStats: PerformanceStats | undefined;
      if (slope > 0) {
        hillStats = calculatePerformance({ ...s.config, slope, weight: riderWeight }, 'spec');
        if (hillStats.hillSpeed >= 15) {
          matchScore += 6;
          reasons.push(`Handles ${slope}% hills at ${Math.round(hillStats.hillSpeed)} km/h`);
        } else if (hillStats.hillSpeed >= 8) {
          reasons.push(`Hill speed: ${Math.round(hillStats.hillSpeed)} km/h on ${slope}% grade`);
        }
      }

      if (s.price && budgetOpt) {
        if (budgetOpt.value === 'unlimited' || s.price <= budgetOpt.max * 0.7) {
          reasons.push(`Priced at $${s.price.toLocaleString()}`);
        } else {
          reasons.push(`$${s.price.toLocaleString()} — top of your range`);
        }
      } else if (!s.price) {
        reasons.push('Price not listed');
      }

      if ((s.grade === 'S' || s.grade === 'A') && reasons.length < 2) {
        reasons.push(`${s.gradeInfo.label} performance grade`);
      }

      return {
        scooter: s,
        matchScore: Math.min(100, Math.round(matchScore)),
        reasons: reasons.slice(0, 3),
        hillStats,
      };
    });
  });

  // ─── Grade badge helper ───────────────────────────────────────────────────────

  const gradeBadgeClass: Record<Grade, string> = {
    S: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    B: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    C: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    D: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    F: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  const stepLabels = ['Budget', 'Use Case', 'Your Weight', 'Terrain', 'Portability'];
</script>

<svelte:head>
  <title>Which Electric Scooter Should I Buy? — EV Scooter Pro Calculator</title>
  <meta
    name="description"
    content="Answer 5 simple questions to find the perfect electric scooter for your needs. Personalized recommendations from 170+ models."
  />
</svelte:head>

<div class="min-h-screen bg-bg-primary relative overflow-hidden">
  <!-- Ambient glows -->
  <div
    class="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>
  <div
    class="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full bg-secondary/[0.02] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>

  <div class="max-w-2xl mx-auto px-4 py-8 sm:py-12">
    <!-- Back link + Title -->
    <div class="mb-8">
      <a
        href="/"
        class="inline-flex items-center gap-2 text-text-tertiary hover:text-text-secondary text-sm transition-colors mb-5 group"
      >
        <svg
          class="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Calculator
      </a>

      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-1">Scooter Finder</p>
          <h1 class="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">Which Scooter Should I Buy?</h1>
          <p class="text-text-tertiary text-sm mt-1">Personalized picks from 170+ models</p>
        </div>
        {#if step <= TOTAL_STEPS}
          <div class="shrink-0 text-right">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-text-tertiary">Step</p>
            <p class="text-2xl font-black text-text-primary tabular-nums">
              {step}<span class="text-text-tertiary text-base font-normal">/{TOTAL_STEPS}</span>
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Progress bar -->
    {#if step <= TOTAL_STEPS}
      <div class="mb-8">
        <!-- Step dots -->
        <div class="flex items-center gap-1 mb-2">
          {#each stepLabels as label, i (i)}
            {@const idx = i + 1}
            {@const done = idx < step}
            {@const active = idx === step}
            <button
              type="button"
              onclick={() => jumpTo(idx)}
              disabled={idx > step}
              aria-label="Go to step {idx}: {label}"
              class="flex-1 h-1.5 rounded-full transition-all duration-300 {done
                ? 'bg-primary cursor-pointer hover:bg-primary/80'
                : active
                  ? 'bg-primary/60'
                  : 'bg-white/[0.08] cursor-default'}"
            ></button>
          {/each}
        </div>
        <!-- Step labels (desktop only) -->
        <div class="hidden sm:flex items-center justify-between">
          {#each stepLabels as label, i (i)}
            {@const idx = i + 1}
            <span
              class="text-[10px] font-bold uppercase tracking-[0.08em] {idx <= step
                ? 'text-text-secondary'
                : 'text-text-tertiary/40'} transition-colors"
            >
              {label}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Step Content -->
    <div class="relative min-h-[340px]">
      {#key step}
        <div
          in:fly={{ x: flyDir * 40, duration: 320, easing: cubicOut }}
          out:fly={{ x: flyDir * -40, duration: 200, easing: cubicOut }}
          class="w-full"
        >
          <!-- ── Step 1: Budget ─────────────────────────────────────────────── -->
          {#if step === 1}
            <div>
              <h2 class="text-xl font-black text-text-primary mb-1">What's your budget?</h2>
              <p class="text-text-tertiary text-sm mb-5">We'll only show scooters within your price range.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each budgetOptions as opt (opt.value)}
                  <button
                    type="button"
                    onclick={() => {
                      budget = opt.value;
                    }}
                    class="rounded-2xl border p-5 text-left transition-all duration-200 group
                      {budget === opt.value
                      ? 'border-primary/50 bg-primary/[0.08] shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]'}"
                  >
                    <p
                      class="text-base font-black text-text-primary group-hover:text-primary transition-colors {budget ===
                      opt.value
                        ? 'text-primary'
                        : ''}"
                    >
                      {opt.label}
                    </p>
                    <p class="text-xs text-text-tertiary mt-0.5">{opt.sub}</p>
                  </button>
                {/each}
              </div>
            </div>

            <!-- ── Step 2: Use Case ───────────────────────────────────────────── -->
          {:else if step === 2}
            <div>
              <h2 class="text-xl font-black text-text-primary mb-1">What will you use it for?</h2>
              <p class="text-text-tertiary text-sm mb-5">This shapes how we weight range, speed, and portability.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each useCaseOptions as opt (opt.value)}
                  <button
                    type="button"
                    onclick={() => {
                      useCase = opt.value;
                    }}
                    class="rounded-2xl border p-5 text-left transition-all duration-200 group
                      {useCase === opt.value
                      ? 'border-primary/50 bg-primary/[0.08] shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]'}"
                  >
                    <p class="text-xl mb-1" aria-hidden="true">{opt.icon}</p>
                    <p
                      class="text-base font-black text-text-primary transition-colors {useCase === opt.value
                        ? 'text-primary'
                        : 'group-hover:text-primary'}"
                    >
                      {opt.label}
                    </p>
                    <p class="text-xs text-text-tertiary mt-0.5">{opt.sub}</p>
                  </button>
                {/each}
              </div>
            </div>

            <!-- ── Step 3: Rider Weight ───────────────────────────────────────── -->
          {:else if step === 3}
            <div>
              <h2 class="text-xl font-black text-text-primary mb-1">How much do you weigh?</h2>
              <p class="text-text-tertiary text-sm mb-8">
                Used to calculate realistic range and hill performance for your build.
              </p>

              <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <div class="text-center mb-6">
                  <span class="text-5xl font-black text-text-primary tabular-nums">{riderWeight}</span>
                  <span class="text-xl text-text-secondary ml-1">kg</span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="120"
                  step="1"
                  bind:value={riderWeight}
                  aria-label="Rider weight in kilograms"
                  class="w-full accent-primary cursor-pointer"
                />

                <div class="flex justify-between mt-2">
                  <span class="text-xs text-text-tertiary">50 kg</span>
                  <span class="text-xs text-text-tertiary">120 kg</span>
                </div>
              </div>

              <p class="text-center text-xs text-text-tertiary mt-3">
                Heavier riders may see reduced range and hill performance.
              </p>
            </div>

            <!-- ── Step 4: Terrain ────────────────────────────────────────────── -->
          {:else if step === 4}
            <div>
              <h2 class="text-xl font-black text-text-primary mb-1">What's your typical terrain?</h2>
              <p class="text-text-tertiary text-sm mb-5">We'll factor in hill-climbing ability for your area.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each terrainOptions as opt (opt.value)}
                  <button
                    type="button"
                    onclick={() => {
                      terrain = opt.value;
                    }}
                    class="rounded-2xl border p-5 text-left transition-all duration-200 group
                      {terrain === opt.value
                      ? 'border-primary/50 bg-primary/[0.08] shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]'}"
                  >
                    <p
                      class="text-base font-black text-text-primary transition-colors {terrain === opt.value
                        ? 'text-primary'
                        : 'group-hover:text-primary'}"
                    >
                      {opt.label}
                    </p>
                    <p class="text-xs text-text-tertiary mt-0.5">{opt.sub}</p>
                    <p
                      class="text-[10px] font-bold uppercase tracking-[0.1em] mt-2 {terrain === opt.value
                        ? 'text-primary/70'
                        : 'text-text-tertiary/60'}"
                    >
                      {opt.slope}% grade
                    </p>
                  </button>
                {/each}
              </div>
            </div>

            <!-- ── Step 5: Portability ────────────────────────────────────────── -->
          {:else if step === 5}
            <div>
              <h2 class="text-xl font-black text-text-primary mb-1">Do you need to carry it?</h2>
              <p class="text-text-tertiary text-sm mb-5">
                Stairs, buses, and offices all benefit from a lighter scooter.
              </p>
              <div class="grid grid-cols-1 gap-3">
                {#each portabilityOptions as opt (opt.value)}
                  <button
                    type="button"
                    onclick={() => {
                      portability = opt.value;
                    }}
                    class="rounded-2xl border p-5 text-left transition-all duration-200 group
                      {portability === opt.value
                      ? 'border-primary/50 bg-primary/[0.08] shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]'}"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p
                          class="text-base font-black text-text-primary transition-colors {portability === opt.value
                            ? 'text-primary'
                            : 'group-hover:text-primary'}"
                        >
                          {opt.label}
                        </p>
                        <p class="text-xs text-text-tertiary mt-0.5">{opt.sub}</p>
                      </div>
                      {#if opt.maxWeight < Infinity}
                        <span
                          class="text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-full border {portability ===
                          opt.value
                            ? 'border-primary/30 bg-primary/10 text-primary/80'
                            : 'border-white/[0.08] text-text-tertiary'}"
                        >
                          &lt; {opt.maxWeight} kg
                        </span>
                      {:else}
                        <span
                          class="text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-full border {portability ===
                          opt.value
                            ? 'border-primary/30 bg-primary/10 text-primary/80'
                            : 'border-white/[0.08] text-text-tertiary'}"
                        >
                          Any weight
                        </span>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- ── Step 6: Results ────────────────────────────────────────────── -->
          {:else if step === TOTAL_STEPS + 1}
            <div>
              <div class="text-center mb-8">
                <div
                  class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
                  in:fly={{ y: -16, duration: 500, easing: cubicOut }}
                >
                  <svg
                    class="w-7 h-7 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <h2 class="text-2xl font-black text-text-primary">Your Top Matches</h2>
                <p class="text-text-tertiary text-sm mt-1">Based on your answers, here are our recommendations</p>
              </div>

              {#if recommendations.length === 0}
                <!-- Empty state -->
                <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
                  <p class="text-4xl mb-3" aria-hidden="true">🔍</p>
                  <p class="font-black text-text-primary text-lg mb-1">No exact matches found</p>
                  <p class="text-text-tertiary text-sm max-w-xs mx-auto">
                    Try relaxing your budget or portability requirements to see more options.
                  </p>
                  <button
                    type="button"
                    onclick={() => {
                      flyDir = -1;
                      step = 1;
                    }}
                    class="mt-5 px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/25 text-primary text-sm font-bold hover:bg-primary/15 transition-all"
                  >
                    Start Over
                  </button>
                </div>
              {:else}
                <div class="space-y-4">
                  {#each recommendations as rec, i (rec.scooter.key)}
                    {@const s = rec.scooter}
                    <div
                      class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 hover:border-white/[0.14] transition-all duration-300"
                      in:fly={{ y: 20, duration: 350, delay: i * 70, easing: cubicOut }}
                    >
                      <!-- Header row -->
                      <div class="flex items-start gap-3 mb-4">
                        <!-- Rank -->
                        <div
                          class="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm
                          {i === 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/[0.05] text-text-tertiary border border-white/[0.08]'}"
                        >
                          #{i + 1}
                        </div>

                        <!-- Name + grade -->
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p class="font-black text-text-primary text-base leading-tight">{s.name}</p>
                            <span class="text-text-tertiary text-sm">{s.year}</span>
                            <span
                              class="text-[10px] font-black px-2 py-0.5 rounded-full border {gradeBadgeClass[s.grade]}"
                            >
                              {s.grade} · {s.gradeInfo.label}
                            </span>
                          </div>
                        </div>

                        <!-- Match score -->
                        <div class="shrink-0 text-right">
                          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">Match</p>
                          <p
                            class="text-lg font-black {rec.matchScore >= 80
                              ? 'text-primary'
                              : rec.matchScore >= 60
                                ? 'text-emerald-400'
                                : 'text-text-secondary'} tabular-nums"
                          >
                            {rec.matchScore}%
                          </p>
                        </div>
                      </div>

                      <!-- Stats grid -->
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        {#each [{ label: 'Range', value: `${Math.round(s.stats.totalRange)} km` }, { label: 'Speed', value: `${Math.round(s.stats.speed)} km/h` }, { label: 'Power', value: `${Math.round(s.stats.totalWatts)} W` }, { label: 'Weight', value: s.weight > 0 ? `${s.weight} kg` : '—' }] as stat (stat.label)}
                          <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                              {stat.label}
                            </p>
                            <p class="text-sm font-black text-text-primary tabular-nums">{stat.value}</p>
                          </div>
                        {/each}
                      </div>

                      <!-- Price + why it matches -->
                      <div class="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                        {#if s.price}
                          <div class="shrink-0">
                            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary mb-0.5">
                              Price
                            </p>
                            <p class="text-base font-black text-text-primary">${s.price.toLocaleString()}</p>
                          </div>
                          <div class="hidden sm:block w-px self-stretch bg-white/[0.06]"></div>
                        {/if}

                        <!-- Reasons -->
                        <ul class="flex-1 space-y-1 min-w-0">
                          {#each rec.reasons as reason, ri (ri)}
                            <li class="flex items-start gap-1.5 text-xs text-text-secondary">
                              <svg
                                class="w-3.5 h-3.5 text-primary shrink-0 mt-px"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                              >
                                <path
                                  fill-rule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clip-rule="evenodd"
                                />
                              </svg>
                              {reason}
                            </li>
                          {/each}
                        </ul>
                      </div>

                      <!-- CTA links -->
                      <div class="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                        <a
                          href="/scooter/{s.key}"
                          class="flex-1 text-center py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-bold hover:bg-primary/15 transition-all"
                        >
                          View Details
                        </a>
                        <a
                          href="/?preset={s.key}"
                          class="flex-1 text-center py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-secondary text-xs font-bold hover:bg-white/[0.07] hover:text-text-primary transition-all"
                        >
                          Try in Calculator
                        </a>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Start over -->
                <div class="mt-6 text-center">
                  <button
                    type="button"
                    onclick={() => {
                      flyDir = -1;
                      step = 1;
                      budget = null;
                      useCase = null;
                      terrain = null;
                      portability = null;
                      riderWeight = 80;
                    }}
                    class="text-text-tertiary hover:text-text-secondary text-sm transition-colors"
                  >
                    Start over with different answers
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/key}
    </div>

    <!-- Navigation buttons -->
    {#if step <= TOTAL_STEPS}
      <div class="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-white/[0.06]">
        {#if step > 1}
          <button
            type="button"
            onclick={goBack}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-text-secondary text-sm font-bold hover:border-white/[0.15] hover:text-text-primary transition-all"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        {:else}
          <div></div>
        {/if}

        <button
          type="button"
          onclick={goNext}
          disabled={!stepValid}
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
            {stepValid
            ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
            : 'bg-white/[0.05] text-text-tertiary cursor-not-allowed border border-white/[0.06]'}"
        >
          {#if step === TOTAL_STEPS}
            Find My Scooter
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            Next
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>
