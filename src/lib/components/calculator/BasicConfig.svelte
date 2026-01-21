\u003cscript lang="ts"\u003e
  import { calculatorState, updateConfig } from "$lib/stores/calculator.svelte";
  import { fade } from "svelte/transition";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const config = $derived(calculatorState.config);
\u003c/script\u003e

\u003cdiv class="space-y-8"\u003e
  \u003c!-- Core Specs --\u003e
  \u003cdiv class="bg-bg-secondary rounded-2xl p-6 border border-white/5 shadow-sm"\u003e
    \u003cdiv class="grid grid-cols-1 md:grid-cols-2 gap-8"\u003e
      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003clabel
            for="voltage"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eSystem Voltage\u003c/label
          \u003e
          \u003cspan class="text-sm font-bold text-primary"\u003e{config.v}V\u003c/span\u003e
        \u003c/div\u003e
        \u003cinput
          id="voltage"
          type="range"
          min="24"
          max="100"
          step="1"
          bind:value={calculatorState.config.v}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        /\u003e
        \u003cdiv class="flex justify-between text-[10px] text-text-tertiary px-1"\u003e
          \u003cspan\u003e24V\u003c/span\u003e
          \u003cspan\u003e100V\u003c/span\u003e
        \u003c/div\u003e
      \u003c/div\u003e

      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003clabel
            for="capacity"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eBattery Capacity\u003c/label
          \u003e
          \u003cspan class="text-sm font-bold text-primary"\u003e{config.ah}Ah\u003c/span\u003e
        \u003c/div\u003e
        \u003cinput
          id="capacity"
          type="range"
          min="5"
          max="100"
          step="0.5"
          bind:value={calculatorState.config.ah}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        /\u003e
        \u003cdiv class="flex justify-between text-[10px] text-text-tertiary px-1"\u003e
          \u003cspan\u003e5Ah\u003c/span\u003e
          \u003cspan\u003e100Ah\u003c/span\u003e
        \u003c/div\u003e
      \u003c/div\u003e

      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003clabel
            for="power"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eMotor Power\u003c/label
          \u003e
          \u003cspan class="text-sm font-bold text-primary"\u003e{config.watts}W\u003c/span\u003e
        \u003c/div\u003e
        \u003cinput
          id="power"
          type="range"
          min="250"
          max="10000"
          step="50"
          bind:value={calculatorState.config.watts}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        /\u003e
        \u003cdiv class="flex justify-between text-[10px] text-text-tertiary px-1"\u003e
          \u003cspan\u003e250W\u003c/span\u003e
          \u003cspan\u003e10kW\u003c/span\u003e
        \u003c/div\u003e
      \u003c/div\u003e

      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003cspan
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eMotor Units\u003c/span
          \u003e
        \u003c/div\u003e
        \u003cdiv class="grid grid-cols-2 gap-2"\u003e
          {#each [1, 2] as count}
            \u003cbutton
              onclick={() =\u003e updateConfig("motors", count)}
              class="py-2.5 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2
                {config.motors === count
                ? 'bg-primary/10 border-primary/50 text-text-primary'
                : 'bg-white/2 border-white/5 text-text-secondary hover:bg-white/5'}"
            \u003e
              {count}
              {count === 1 ? "Single" : "Dual"}
            \u003c/button\u003e
          {/each}
        \u003c/div\u003e
      \u003c/div\u003e
    \u003c/div\u003e
  \u003c/div\u003e

  \u003c!-- Environment & Usage --\u003e
  \u003cdiv class="bg-bg-secondary rounded-2xl p-6 border border-white/5 shadow-sm"\u003e
    \u003cdiv class="grid grid-cols-1 md:grid-cols-2 gap-8"\u003e
      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003clabel
            for="weight"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eRider Weight\u003c/label
          \u003e
          \u003cspan class="text-sm font-bold text-text-primary"
            \u003e{config.weight}kg\u003c/span
          \u003e
        \u003c/div\u003e
        \u003cinput
          id="weight"
          type="range"
          min="40"
          max="150"
          step="1"
          bind:value={calculatorState.config.weight}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        /\u003e
      \u003c/div\u003e

      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003clabel
            for="temp"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eAmbient Temp\u003c/label
          \u003e
          \u003cspan class="text-sm font-bold text-text-primary"
            \u003e{config.ambientTemp}°C\u003c/span
          \u003e
        \u003c/div\u003e
        \u003cinput
          id="temp"
          type="range"
          min="-20"
          max="45"
          step="1"
          bind:value={calculatorState.config.ambientTemp}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
        /\u003e
      \u003c/div\u003e

      \u003cdiv class="space-y-4"\u003e
        \u003cdiv class="flex justify-between items-center px-1"\u003e
          \u003clabel
            for="soh"
            class="text-xs font-semibold text-text-secondary uppercase tracking-wider"
            \u003eBattery Health\u003c/label
          \u003e
          \u003cspan class="text-sm font-bold text-text-primary"
            \u003e{Math.round(config.soh * 100)}%\u003c/span
          \u003e
        \u003c/div\u003e
        \u003cinput
          id="soh"
          type="range"
          min="0.5"
          max="1"
          step="0.01"
          bind:value={calculatorState.config.soh}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        /\u003e
      \u003c/div\u003e
    \u003c/div\u003e
  \u003c/div\u003e
\u003c/div\u003e
