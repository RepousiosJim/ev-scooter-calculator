<script lang="ts">
  import { calculatorState, updateConfig } from "$lib/stores/calculator.svelte";
  import { fade } from "svelte/transition";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const config = $derived(calculatorState.config);
</script>

<div class="space-y-8">
  <!-- Core Specs -->
  <div class="bg-bg-secondary rounded-2xl p-6 border border-white/5 shadow-sm">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="voltage"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >System Voltage</label
          >
          <span class="text-sm font-bold text-primary">{config.v}V</span>
        </div>
        <input
          id="voltage"
          type="range"
          min="24"
          max="100"
          step="1"
          bind:value={calculatorState.config.v}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        />
        <div class="flex justify-between text-[10px] text-text-tertiary px-1">
          <span>24V</span>
          <span>100V</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="capacity"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >Battery Capacity</label
          >
          <span class="text-sm font-bold text-primary">{config.ah}Ah</span>
        </div>
        <input
          id="capacity"
          type="range"
          min="5"
          max="100"
          step="0.5"
          bind:value={calculatorState.config.ah}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        />
        <div class="flex justify-between text-[10px] text-text-tertiary px-1">
          <span>5Ah</span>
          <span>100Ah</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="power"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >Motor Power</label
          >
          <span class="text-sm font-bold text-primary">{config.watts}W</span>
        </div>
        <input
          id="power"
          type="range"
          min="250"
          max="10000"
          step="50"
          bind:value={calculatorState.config.watts}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        />
        <div class="flex justify-between text-[10px] text-text-tertiary px-1">
          <span>250W</span>
          <span>10kW</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <span
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >Motor Units</span
          >
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each [1, 2] as count}
            <button
              onclick={() => updateConfig("motors", count)}
              class="py-2.5 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2
                {config.motors === count
                ? 'bg-primary/10 border-primary/50 text-text-primary'
                : 'bg-white/2 border-white/5 text-text-secondary hover:bg-white/5'}"
            >
              {count}
              {count === 1 ? "Single" : "Dual"}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Environment & Usage -->
  <div class="bg-bg-secondary rounded-2xl p-6 border border-white/5 shadow-sm">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="weight"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >Rider Weight</label
          >
          <span class="text-sm font-bold text-text-primary"
            >{config.weight}kg</span
          >
        </div>
        <input
          id="weight"
          type="range"
          min="40"
          max="150"
          step="1"
          bind:value={calculatorState.config.weight}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="temp"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >Ambient Temp</label
          >
          <span class="text-sm font-bold text-text-primary"
            >{config.ambientTemp}°C</span
          >
        </div>
        <input
          id="temp"
          type="range"
          min="-20"
          max="45"
          step="1"
          bind:value={calculatorState.config.ambientTemp}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="soh"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >Battery Health</label
          >
          <span class="text-sm font-bold text-text-primary"
            >{Math.round(config.soh * 100)}%</span
          >
        </div>
        <input
          id="soh"
          type="range"
          min="0.5"
          max="1"
          step="0.01"
          bind:value={calculatorState.config.soh}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
      </div>
    </div>
  </div>
