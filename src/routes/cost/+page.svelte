<script lang="ts">
  import { ArrowLeft, Car, Train, Bike, Zap, Leaf, DollarSign, TrendingDown } from 'lucide-svelte';

  // ─── Inputs ──────────────────────────────────────────────────────────────────

  let dailyDistance = $state(10); // km
  let daysPerWeek = $state(5);
  let electricityPrice = $state(0.2); // $/kWh
  let whPerKm = $state(25); // Wh/km
  let scooterPrice = $state(1000); // $
  let lifespan = $state(3); // years
  let monthlyMaintenance = $state(5); // $/mo
  let carCostPerKm = $state(0.35); // $/km
  let transitMonthlyPass = $state(80); // $/mo
  let bikeMaintenance = $state(10); // $/mo

  // ─── Derived calculations ─────────────────────────────────────────────────

  const results = $derived.by(() => {
    const scooterCostPerKm = electricityPrice * (whPerKm / 1000);
    const dailyScooterCost = scooterCostPerKm * dailyDistance;
    const monthlyKm = dailyDistance * daysPerWeek * 4.33;
    const monthlyScooterElec = dailyScooterCost * daysPerWeek * 4.33;
    const monthlyScooterDeprec = scooterPrice / (lifespan * 12);
    const monthlyScooterTotal = monthlyScooterElec + monthlyMaintenance + monthlyScooterDeprec;
    const monthlyCarCost = carCostPerKm * dailyDistance * daysPerWeek * 4.33;
    const yearlySavingsVsCar = (monthlyCarCost - monthlyScooterTotal) * 12;
    const yearlySavingsVsTransit = (transitMonthlyPass - monthlyScooterTotal) * 12;
    const yearlySavingsVsBike = (bikeMaintenance - monthlyScooterTotal) * 12;
    const netMonthlySavings = monthlyCarCost - monthlyScooterElec - monthlyMaintenance;
    const breakEvenMonths = netMonthlySavings > 0 ? scooterPrice / netMonthlySavings : null;
    const co2Saved = dailyDistance * daysPerWeek * 52 * 0.21;

    return {
      scooterCostPerKm,
      monthlyKm,
      monthlyScooterElec,
      monthlyScooterDeprec,
      monthlyScooterTotal,
      monthlyCarCost,
      yearlySavingsVsCar,
      yearlySavingsVsTransit,
      yearlySavingsVsBike,
      breakEvenMonths,
      co2Saved,
    };
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const fmt = (n: number) => n.toFixed(2);
  const savingsColor = (s: number) => (s > 0 ? 'text-emerald-400' : 'text-rose-400');
  const savingsLabel = (s: number) => (s > 0 ? `Save $${fmt(s)}/yr` : `+$${fmt(Math.abs(s))}/yr more`);

  const inputClass =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50';
  const dividerClass = 'h-px bg-white/[0.06]';
  const sectionLabel = 'text-xs font-bold uppercase tracking-[0.12em] text-text-tertiary mb-3';
</script>

<svelte:head>
  <title>Ride Cost Calculator — EV Scooter Pro</title>
  <meta
    name="description"
    content="Compare the cost of commuting by electric scooter vs car, public transit, and bike. Calculate daily, monthly, and yearly savings."
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
        <ArrowLeft size={16} class="group-hover:-translate-x-0.5 transition-transform" />
        <span class="text-xs font-bold uppercase tracking-[0.12em]">Calculator</span>
      </a>
      <span class="text-xs font-black text-text-tertiary tracking-tight">EV Scooter Pro</span>
    </div>
  </div>
</header>

<div class="min-h-screen bg-bg-primary">
  <div
    class="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>

  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <div class="mb-6">
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-1">Cost Calculator</p>
      <h1 class="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">How Much Does Your Commute Cost?</h1>
      <p class="text-text-tertiary text-sm mt-1">Compare your scooter commute against car, transit, and bike.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 items-start">
      <!-- INPUT CARD -->
      <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
        <div>
          <p class={sectionLabel}>Your Commute</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Daily distance (km)</span>
              <input type="number" min="1" max="100" bind:value={dailyDistance} class={inputClass} />
            </label>
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Days per week</span>
              <input type="number" min="1" max="7" bind:value={daysPerWeek} class={inputClass} />
            </label>
          </div>
        </div>

        <div class={dividerClass}></div>

        <div>
          <p class={sectionLabel}>Scooter Costs</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Electricity ($/kWh)</span>
              <input type="number" min="0.01" step="0.01" bind:value={electricityPrice} class={inputClass} />
            </label>
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Consumption (Wh/km)</span>
              <input type="number" min="10" max="80" bind:value={whPerKm} class={inputClass} />
            </label>
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Purchase price ($)</span>
              <input type="number" min="0" bind:value={scooterPrice} class={inputClass} />
            </label>
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Lifespan (years)</span>
              <input type="number" min="1" max="10" bind:value={lifespan} class={inputClass} />
            </label>
            <label class="block col-span-2">
              <span class="text-xs text-text-secondary block mb-1">Monthly maintenance ($)</span>
              <input type="number" min="0" bind:value={monthlyMaintenance} class={inputClass} />
            </label>
          </div>
        </div>

        <div class={dividerClass}></div>

        <div>
          <p class={sectionLabel}>Alternatives</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="block col-span-2">
              <span class="text-xs text-text-secondary block mb-1">Car cost per km ($)</span>
              <input type="number" min="0" step="0.01" bind:value={carCostPerKm} class={inputClass} />
            </label>
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Transit pass ($/mo)</span>
              <input type="number" min="0" bind:value={transitMonthlyPass} class={inputClass} />
            </label>
            <label class="block">
              <span class="text-xs text-text-secondary block mb-1">Bike maint. ($/mo)</span>
              <input type="number" min="0" bind:value={bikeMaintenance} class={inputClass} />
            </label>
          </div>
        </div>
      </div>

      <!-- RESULTS COLUMN -->
      <div class="space-y-4">
        <!-- Cost per km hero -->
        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div class="flex items-center gap-2 mb-3">
            <Zap size={14} class="text-primary" />
            <p class={sectionLabel}>Scooter Cost Per km</p>
          </div>
          <div class="flex items-end gap-3 flex-wrap">
            <span class="text-4xl font-black text-text-primary tabular-nums">
              ${results.scooterCostPerKm < 0.01 ? results.scooterCostPerKm.toFixed(4) : fmt(results.scooterCostPerKm)}
            </span>
            <span class="text-text-tertiary text-sm mb-1">/km (electricity only)</span>
          </div>
          <p class="text-xs text-text-tertiary mt-1">
            {results.monthlyKm.toFixed(0)} km/month · ${fmt(results.monthlyScooterTotal)}/month all-in
          </p>
        </div>

        <!-- Monthly breakdown -->
        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div class="flex items-center gap-2 mb-3">
            <DollarSign size={14} class="text-primary" />
            <p class={sectionLabel}>Monthly Breakdown</p>
          </div>
          <div class="space-y-2">
            {#each [['Electricity', results.monthlyScooterElec], ['Maintenance', monthlyMaintenance], ['Depreciation', results.monthlyScooterDeprec]] as [name, val] (name)}
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-secondary">{name}</span>
                <span class="text-text-primary tabular-nums">${fmt(Number(val))}</span>
              </div>
            {/each}
            <div class="h-px bg-white/[0.06] my-1"></div>
            <div class="flex items-center justify-between text-sm font-black">
              <span class="text-text-primary">Total</span>
              <span class="text-primary tabular-nums">${fmt(results.monthlyScooterTotal)}/mo</span>
            </div>
          </div>
        </div>

        <!-- 3-up comparison cards -->
        <div class="grid grid-cols-3 gap-3">
          {#each [{ Icon: Car, label: 'Car', monthly: results.monthlyCarCost, savings: results.yearlySavingsVsCar }, { Icon: Train, label: 'Transit', monthly: transitMonthlyPass, savings: results.yearlySavingsVsTransit }, { Icon: Bike, label: 'Bike', monthly: bikeMaintenance, savings: results.yearlySavingsVsBike }] as alt (alt.label)}
            <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-2">
              <div class="flex items-center gap-1.5">
                <alt.Icon size={13} class="text-text-tertiary shrink-0" />
                <p class="text-xs font-bold uppercase tracking-[0.1em] text-text-tertiary truncate">{alt.label}</p>
              </div>
              <p class="text-lg font-black text-text-primary tabular-nums leading-none">
                ${fmt(alt.monthly)}<span class="text-text-tertiary text-xs font-normal">/mo</span>
              </p>
              <p class="text-[11px] font-bold {savingsColor(alt.savings)} leading-tight">{savingsLabel(alt.savings)}</p>
            </div>
          {/each}
        </div>

        <!-- Break-even -->
        {#if results.breakEvenMonths !== null && results.breakEvenMonths > 0}
          <div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div class="flex items-center gap-2 mb-1">
              <TrendingDown size={14} class="text-emerald-400" />
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-emerald-400/80">Break-Even vs Car</p>
            </div>
            <p class="text-text-primary text-sm">
              Your scooter pays for itself in
              <span class="font-black text-emerald-400">
                {results.breakEvenMonths < 1
                  ? 'under 1 month'
                  : `${Math.ceil(results.breakEvenMonths)} month${Math.ceil(results.breakEvenMonths) === 1 ? '' : 's'}`}
              </span>
              compared to driving.
            </p>
          </div>
        {:else}
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p class="text-xs text-text-tertiary">
              Scooter costs more than car at this distance — increase daily km to see break-even.
            </p>
          </div>
        {/if}

        <!-- CO2 -->
        <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div class="flex items-center gap-2 mb-1">
            <Leaf size={14} class="text-emerald-400" />
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-text-tertiary">Environmental Impact</p>
          </div>
          <p class="text-text-primary text-sm">
            You save approximately
            <span class="font-black text-emerald-400">{Math.round(results.co2Saved)} kg CO₂</span>
            per year vs driving.
          </p>
          <p class="text-xs text-text-tertiary mt-1">Based on 0.21 kg CO₂/km for an average car.</p>
        </div>
      </div>
    </div>
  </div>
</div>
