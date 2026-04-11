<script lang="ts">
  import { presets, presetMetadata } from "$lib/data/presets";
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import type { ScooterConfig } from "$lib/types";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";
  import { speedVal, speedUnit, distanceVal, distanceUnit, weightVal, weightUnit } from "$lib/utils/units";

  const activePresetKey = $derived(calculatorState.activePresetKey);
  const stats = $derived(calculatorState.stats);

  // Transform presets object into an array for the table
  let scooters = $state(
    Object.entries(presets).map(([key, config]) => {
      const meta = presetMetadata[key];
      const name =
        key === "custom"
          ? "Custom Configuration"
          : meta?.name ||
            key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        id: key,
        name,
        year: meta?.year || 0,
        config,
        topSpeed: meta?.manufacturer?.topSpeed ?? 0,
        range: meta?.manufacturer?.range ?? 0,
        batteryWh: meta?.manufacturer?.batteryWh ?? config.v * config.ah,
        weight: config.scooterWeight ?? 0,
      };
    }),
  );

  // Initial sort by year descending, then by name
  let sortColumn = $state("year");
  let sortDirection = $state<"asc" | "desc">("desc");
  let searchQuery = $state("");
  let filterMinSpeed = $state(0);
  let liveAnnouncement = $state("");

  // Filtering
  const filteredScooters = $derived(
    scooters.filter((scooter) => {
      const matchesSearch = scooter.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesSpeed = scooter.topSpeed >= filterMinSpeed;
      return matchesSearch && matchesSpeed;
    }),
  );

  // Sorting
  const sortedScooters = $derived(
    [...filteredScooters].sort((a, b) => {
      // @ts-ignore - dynamic access
      const valA = a[sortColumn];
      // @ts-ignore - dynamic access
      const valB = b[sortColumn];

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    }),
  );

  // Grouping by year for the UI (only if sorting by year)
  const groupedScooters = $derived(() => {
    if (sortColumn !== "year" && searchQuery === "") {
      return [{ year: null, items: sortedScooters }];
    }

    const groups: { year: number | null; items: typeof sortedScooters }[] = [];
    sortedScooters.forEach((scooter) => {
      const year = scooter.id === "custom" ? null : scooter.year;
      let group = groups.find((g) => g.year === year);
      if (!group) {
        group = { year, items: [] };
        groups.push(group);
      }
      group.items.push(scooter);
    });
    return groups;
  });

  // Update announcement when constraints change
  $effect(() => {
    const count = sortedScooters.length;
    liveAnnouncement = `Showing ${count} scooter${count === 1 ? "" : "s"}. Sorted by ${getHeaderLabel(sortColumn)} ${sortDirection === "asc" ? "ascending" : "descending"}.`;
  });

  const sortOptions = [
    { key: "year", label: "Year" },
    { key: "name", label: "Model" },
    { key: "topSpeed", label: "Top Speed" },
    { key: "range", label: "Range" },
    { key: "batteryWh", label: "Battery" },
    { key: "weight", label: "Weight" },
  ];

  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = column === "name" ? "asc" : "desc";
    }
  }

  function handleKeydown(event: KeyboardEvent, column: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSort(column);
    }
  }

  function getHeaderLabel(key: string) {
    return sortOptions.find((opt) => opt.key === key)?.label || key;
  }

  function getAriaSort(
    column: string,
  ): "ascending" | "descending" | "none" | undefined {
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  // Find active scooter's manufacturer specs for comparison
  const activeScooterMeta = $derived(
    activePresetKey && activePresetKey !== 'custom' ? presetMetadata[activePresetKey] : null
  );

  const speedDiff = $derived(stats.speed - (activeScooterMeta?.manufacturer?.topSpeed ?? 0));
  const rangeDiff = $derived(stats.totalRange - (activeScooterMeta?.manufacturer?.range ?? 0));
</script>

<div class="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-5 lg:p-6 shadow-2xl shadow-black/10 space-y-5 sm:space-y-6">
  <!-- Your Scooter vs Specs Banner -->
  {#if activeScooterMeta && activePresetKey !== 'custom'}
    <div class="bg-primary/5 border border-primary/20 p-4 space-y-3">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
        <h3 class="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Your {calculatorState.activePresetName} — Calculated vs Manufacturer
        </h3>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="space-y-1">
          <span class="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Top Speed</span>
          <div class="flex items-baseline gap-2">
            <span class="text-lg font-bold text-text-primary">{speedVal(stats.speed).toFixed(0)}</span>
            <span class="text-xs text-text-tertiary">vs {speedVal(activeScooterMeta.manufacturer?.topSpeed ?? 0).toFixed(0)} {speedUnit()}</span>
          </div>
          <span class="text-[10px] font-bold {speedDiff >= 0 ? 'text-success' : 'text-warning'}">
            {speedDiff >= 0 ? '+' : ''}{speedVal(speedDiff).toFixed(0)} {speedUnit()}
          </span>
        </div>
        <div class="space-y-1">
          <span class="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Range</span>
          <div class="flex items-baseline gap-2">
            <span class="text-lg font-bold text-text-primary">{distanceVal(stats.totalRange).toFixed(0)}</span>
            <span class="text-xs text-text-tertiary">vs {distanceVal(activeScooterMeta.manufacturer?.range ?? 0).toFixed(0)} {distanceUnit()}</span>
          </div>
          <span class="text-[10px] font-bold {rangeDiff >= 0 ? 'text-success' : 'text-warning'}">
            {rangeDiff >= 0 ? '+' : ''}{distanceVal(rangeDiff).toFixed(0)} {distanceUnit()}
          </span>
        </div>
        <div class="space-y-1">
          <span class="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Battery</span>
          <div class="flex items-baseline gap-2">
            <span class="text-lg font-bold text-text-primary">{Math.round(activeScooterMeta.manufacturer?.batteryWh ?? 0)}</span>
            <span class="text-xs text-text-tertiary">Wh</span>
          </div>
        </div>
        <div class="space-y-1">
          <span class="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Weight</span>
          <div class="flex items-baseline gap-2">
            <span class="text-lg font-bold text-text-primary">{weightVal(calculatorState.config.scooterWeight ?? 0).toFixed(0)}</span>
            <span class="text-xs text-text-tertiary">{weightUnit()}</span>
          </div>
        </div>
      </div>
      <p class="text-[10px] text-text-tertiary">
        Your results use current ride mode and rider weight. Manufacturer specs assume ideal conditions — try Turbo mode for closer comparison.
      </p>
    </div>
  {/if}

  <!-- Header & Filters -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4"
  >
    <h2 class="text-xl font-black text-text-primary tracking-tight">Model Comparison</h2>

    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Mobile Sort Select -->
      <div class="sm:hidden flex items-center gap-2">
        <label
          for="mobile-sort"
          class="text-xs text-text-secondary font-medium uppercase tracking-wider"
          >Sort by:</label
        >
        <select
          id="mobile-sort"
          class="bg-white/[0.03] border border-white/[0.06] py-2 px-3 text-sm text-text-primary focus:border-primary/50 focus:outline-none flex-1"
          onchange={(e) => handleSort(e.currentTarget.value)}
          value={sortColumn}
        >
          {#each sortOptions as opt}
            <option value={opt.key}>{opt.label}</option>
          {/each}
        </select>
        <button
          class="bg-white/[0.03] border border-white/[0.06] p-2 text-primary"
          onclick={() =>
            (sortDirection = sortDirection === "asc" ? "desc" : "asc")}
          aria-label="Toggle sort direction"
        >
          {sortDirection === "asc" ? "↑" : "↓"}
        </button>
      </div>

      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search models..."
          class="bg-white/[0.03] border border-white/[0.06] py-2 pl-3 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none w-full sm:w-64 transition-colors"
          aria-label="Filter scooters by model name"
        />
        {#if searchQuery}
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            onclick={() => (searchQuery = "")}
            aria-label="Clear filter"
          >
            ✕
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Screen Reader Announcements -->
  <div class="sr-only" role="status" aria-live="polite">
    {liveAnnouncement}
  </div>

  <!-- Desktop Table View (Hidden on Mobile) -->
  <div class="hidden sm:block overflow-x-auto">
    <table
      class="w-full text-left border-collapse"
      aria-label="Electric Scooter Specifications Comparison"
    >
      <thead>
        <tr class="border-b border-white/10">
          {#each ["name", "topSpeed", "range", "batteryWh", "weight"] as key}
            <th
              scope="col"
              class="p-3 text-sm font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors select-none group focus:outline-none focus:ring-2 focus:ring-primary/50 focus:rounded"
              onclick={() => handleSort(key)}
              onkeydown={(e) => handleKeydown(e, key)}
              tabindex="0"
              aria-sort={getAriaSort(key)}
            >
              <div class="flex items-center gap-2">
                {getHeaderLabel(key)}
                <span
                  class={`transition-opacity text-primary ${sortColumn === key ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}
                >
                  {sortColumn === key && sortDirection === "asc" ? "▲" : "▼"}
                </span>
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-white/5 text-sm text-text-primary">
        {#each groupedScooters() as group}
          {#if group.year !== null}
            <tr class="bg-primary/5">
              <td colspan="5" class="p-2 border-l-4 border-primary">
                <div class="flex items-center gap-3">
                  <span
                    class="text-[10px] font-black uppercase tracking-widest text-primary"
                    >{group.year} MODELS</span
                  >
                  <div
                    class="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent"
                  ></div>
                </div>
              </td>
            </tr>
          {/if}

          {#each group.items as scooter (scooter.id)}
            <tr class="transition-colors {scooter.id === activePresetKey ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-white/2'}">
              <td class="p-3 font-medium text-text-primary">
                {scooter.name}
                {#if scooter.id === activePresetKey}
                  <span class="ml-2 text-[9px] font-bold text-primary uppercase tracking-widest">Active</span>
                {/if}
              </td>
              <td class="p-3">
                <span class="font-bold">{Math.round(speedVal(scooter.topSpeed))}</span>
                <span class="text-text-secondary text-xs">{speedUnit()}</span>
              </td>
              <td class="p-3">
                <span class="font-bold">{Math.round(distanceVal(scooter.range))}</span>
                <span class="text-text-secondary text-xs">{distanceUnit()}</span>
              </td>
              <td class="p-3">
                <span class="font-bold">{Math.round(scooter.batteryWh)}</span>
                <span class="text-text-secondary text-xs">Wh</span>
              </td>
              <td class="p-3">
                <span class="font-bold">{Math.round(weightVal(scooter.weight))}</span>
                <span class="text-text-secondary text-xs">{weightUnit()}</span>
              </td>
            </tr>
          {/each}
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile Card View (Hidden on Desktop) -->
  <div class="sm:hidden space-y-6">
    {#each groupedScooters() as group}
      <div class="space-y-4">
        {#if group.year !== null}
          <div class="flex items-center gap-3">
            <span
              class="text-[10px] font-black uppercase tracking-widest text-primary"
              >{group.year} MODELS</span
            >
            <div
              class="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent"
            ></div>
          </div>
        {/if}

        <div class="grid gap-4">
          {#each group.items as scooter (scooter.id)}
            <div
              class="bg-white/[0.02] p-4 border shadow-sm space-y-3
                {scooter.id === activePresetKey ? 'border-primary/40 ring-1 ring-primary/10' : 'border-white/[0.06]'}"
            >
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-text-primary leading-snug">
                  {scooter.name}
                </h3>
                {#if scooter.id === activePresetKey}
                  <span class="text-[9px] font-bold text-primary uppercase tracking-widest">Active</span>
                {/if}
              </div>

              <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-text-secondary uppercase font-bold tracking-tighter"
                    >Speed</span
                  >
                  <p class="text-sm font-number">
                    <span class="text-primary font-bold"
                      >{Math.round(speedVal(scooter.topSpeed))}</span
                    > <span class="text-xs opacity-50">{speedUnit()}</span>
                  </p>
                </div>
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-text-secondary uppercase font-bold tracking-tighter"
                    >Range</span
                  >
                  <p class="text-sm font-number">
                    <span class="text-primary font-bold">{Math.round(distanceVal(scooter.range))}</span>
                    <span class="text-xs opacity-50">{distanceUnit()}</span>
                  </p>
                </div>
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-text-secondary uppercase font-bold tracking-tighter"
                    >Battery</span
                  >
                  <p class="text-sm font-number">
                    <span class="font-medium"
                      >{Math.round(scooter.batteryWh)}</span
                    > <span class="text-xs opacity-50">Wh</span>
                  </p>
                </div>
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-text-secondary uppercase font-bold tracking-tighter"
                    >Weight</span
                  >
                  <p class="text-sm font-number">
                    <span class="font-medium">{Math.round(weightVal(scooter.weight))}</span>
                    <span class="text-xs opacity-50">{weightUnit()}</span>
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if sortedScooters.length === 0}
    <div class="p-12 text-center text-text-secondary">
      No scooters match your filter.
    </div>
  {/if}

  <div class="mt-6 text-xs text-text-secondary text-right">
    <span class="hidden sm:inline"
      >Use <kbd
        class="px-1 py-0.5 rounded bg-white/10 font-sans border border-white/20"
        >Space</kbd
      >
      or
      <kbd
        class="px-1 py-0.5 rounded bg-white/10 font-sans border border-white/20"
        >Enter</kbd
      > to sort columns.</span
    >
  </div>
</div>
