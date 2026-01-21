<script lang="ts">
  import { presets, presetMetadata } from "$lib/data/presets";
  import type { ScooterConfig } from "$lib/types";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

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
        weight: config.weight,
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
      // Just return flat list if user changed sort or is searching
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
      sortDirection = column === "name" ? "asc" : "desc"; // Name default asc, stats desc
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
</script>

<div class="bg-bg-secondary rounded-xl p-6 border border-white/5 shadow-lg">
  <!-- Header & Filters -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
  >
    <div class="flex items-center gap-2">
      <Icon name="compare" size="lg" class="text-primary" />
      <h2 class="text-h3 font-semibold text-text-primary">Model Comparison</h2>
    </div>

    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Mobile Sort Select -->
      <div class="sm:hidden flex items-center gap-2">
        <label
          for="mobile-sort"
          class="text-xs text-textMuted font-medium uppercase tracking-wider"
          >Sort by:</label
        >
        <select
          id="mobile-sort"
          class="bg-bgInput border border-white/10 rounded-lg py-2 px-3 text-sm text-textMain focus:border-primary focus:outline-none flex-1"
          onchange={(e) => handleSort(e.currentTarget.value)}
          value={sortColumn}
        >
          {#each sortOptions as opt}
            <option value={opt.key}>{opt.label}</option>
          {/each}
        </select>
        <button
          class="bg-bgInput border border-white/10 p-2 rounded-lg text-primary"
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
          class="bg-bgInput border border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm text-textMain focus:border-primary focus:outline-none w-full sm:w-64 transition-colors"
          aria-label="Filter scooters by model name"
        />
        {#if searchQuery}
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
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
              class="p-3 text-sm font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors select-none group focus:outline-none focus:ring-2 focus:ring-primary/50 focus:rounded"
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
      <tbody class="divide-y divide-white/5 text-sm text-textMain">
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
            <tr class="hover:bg-white/2 transition-colors">
              <td class="p-3 font-medium text-text-primary">
                {scooter.name}
              </td>
              <td class="p-3">
                <span class="font-bold">{scooter.topSpeed}</span>
                <span class="text-textMuted text-xs">km/h</span>
              </td>
              <td class="p-3">
                <span class="font-bold">{scooter.range}</span>
                <span class="text-textMuted text-xs">km</span>
              </td>
              <td class="p-3">
                <span class="font-bold">{Math.round(scooter.batteryWh)}</span>
                <span class="text-textMuted text-xs">Wh</span>
              </td>
              <td class="p-3">
                <span class="font-bold">{scooter.weight}</span>
                <span class="text-textMuted text-xs">kg</span>
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
              class="bg-bgInput rounded-xl p-4 border border-white/5 shadow-sm space-y-3"
            >
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-textMain leading-snug">
                  {scooter.name}
                </h3>
              </div>

              <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-textMuted uppercase font-bold tracking-tighter"
                    >Speed</span
                  >
                  <p class="text-sm font-number">
                    <span class="text-primary font-bold"
                      >{scooter.topSpeed}</span
                    > <span class="text-xs opacity-50">km/h</span>
                  </p>
                </div>
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-textMuted uppercase font-bold tracking-tighter"
                    >Range</span
                  >
                  <p class="text-sm font-number">
                    <span class="text-primary font-bold">{scooter.range}</span>
                    <span class="text-xs opacity-50">km</span>
                  </p>
                </div>
                <div class="flex flex-col">
                  <span
                    class="text-[10px] text-textMuted uppercase font-bold tracking-tighter"
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
                    class="text-[10px] text-textMuted uppercase font-bold tracking-tighter"
                    >Rider Wt</span
                  >
                  <p class="text-sm font-number">
                    <span class="font-medium">{scooter.weight}</span>
                    <span class="text-xs opacity-50">kg</span>
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
    <div class="p-12 text-center text-textMuted">
      No scooters match your filter.
    </div>
  {/if}

  <div class="mt-6 text-xs text-textMuted text-right">
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
