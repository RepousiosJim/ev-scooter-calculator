<script lang="ts">
  import { untrack } from "svelte";
  import { calculatorState, updateConfig, applyConfig } from "$lib/stores/calculator.svelte";
  import { defaultConfig } from "$lib/data/presets";
  import { normalizeConfig, type ConfigNumericKey } from "$lib/utils/validators";
  import { debounce } from "$lib/utils/debounce";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const config = $derived(calculatorState.config);

  const debouncedUpdate = debounce((key: ConfigNumericKey, value: number) => {
    updateConfig(key, value);
  }, 150);

  let localValues = $state({
    v: config.v,
    ah: config.ah,
    watts: config.watts,
    weight: config.weight,
    ambientTemp: config.ambientTemp,
    soh: config.soh
  });

  $effect(() => {
    const c = config;
    untrack(() => {
      localValues.v = c.v;
      localValues.ah = c.ah;
      localValues.watts = c.watts;
      localValues.weight = c.weight;
      localValues.ambientTemp = c.ambientTemp;
      localValues.soh = c.soh;
    });
  });

  function handleRangeInput(key: ConfigNumericKey, event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const value = target.valueAsNumber;
    if (!Number.isFinite(value)) return;
    debouncedUpdate(key, value);
  }

  let confirmReset = $state(false);

  function handleReset() {
    const baseConfig = normalizeConfig(defaultConfig, defaultConfig);
    applyConfig(baseConfig);
    calculatorState.activePresetKey = 'custom';
  }

  function handleResetClick() {
    if (confirmReset) {
      handleReset();
      confirmReset = false;
    } else {
      confirmReset = true;
      setTimeout(() => confirmReset = false, 3000);
    }
  }
</script>

<div class="space-y-5 md:space-y-8">
  <!-- Reset Button -->
  <div class="flex justify-end">
    <button
      type="button"
      onclick={handleResetClick}
      class="text-[10px] uppercase tracking-wider transition-colors {confirmReset ? 'text-danger' : 'text-text-tertiary hover:text-danger'}"
    >
      {confirmReset ? 'Click again to confirm' : 'Reset to defaults'}
    </button>
  </div>
  <!-- Core Specs -->
  <div class="p-4 sm:p-5 md:p-6 border border-white/[0.06] bg-white/[0.02]
    transition-all duration-300 hover:border-white/10">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="voltage"
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >System Voltage</label
          >
          <span class="text-sm font-bold text-primary">{localValues.v}V</span>
        </div>
        <input
          id="voltage"
          type="range"
          min="24"
          max="100"
          step="1"
          bind:value={localValues.v}
          oninput={(event) => handleRangeInput('v', event)}
          aria-valuenow={localValues.v}
          aria-valuemin={24}
          aria-valuemax={100}
          aria-valuetext="{localValues.v} volts"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        />
        <div class="flex justify-between text-xs text-text-tertiary px-1">
          <span>24V</span>
          <span>100V</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="capacity"
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Battery Capacity</label
          >
          <span class="text-sm font-bold text-primary">{localValues.ah}Ah</span>
        </div>
        <input
          id="capacity"
          type="range"
          min="5"
          max="100"
          step="0.5"
          bind:value={localValues.ah}
          oninput={(event) => handleRangeInput('ah', event)}
          aria-valuenow={localValues.ah}
          aria-valuemin={5}
          aria-valuemax={100}
          aria-valuetext="{localValues.ah} amp hours"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        />
        <div class="flex justify-between text-xs text-text-tertiary px-1">
          <span>5Ah</span>
          <span>100Ah</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="power"
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Motor Power</label
          >
          <span class="text-sm font-bold text-primary">{localValues.watts}W</span>
        </div>
        <input
          id="power"
          type="range"
          min="250"
          max="10000"
          step="50"
          bind:value={localValues.watts}
          oninput={(event) => handleRangeInput('watts', event)}
          aria-valuenow={localValues.watts}
          aria-valuemin={250}
          aria-valuemax={10000}
          aria-valuetext="{localValues.watts} watts"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
        />
        <div class="flex justify-between text-xs text-text-tertiary px-1">
          <span>250W</span>
          <span>10kW</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <span
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Motor Units</span
          >
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each [1, 2] as count}
            <button
              onclick={() => updateConfig("motors", count)}
              class="py-2.5 border transition-all duration-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2
                {config.motors === count
                ? 'bg-primary/10 border-primary/30 text-text-primary'
                : 'bg-white/[0.02] border-white/[0.06] text-text-tertiary hover:bg-white/[0.04] hover:border-white/10 hover:text-text-secondary'}"
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
  <div class="p-4 sm:p-5 md:p-6 border border-white/[0.06] bg-white/[0.02]
    transition-all duration-300 hover:border-white/10">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="weight"
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Rider Weight</label
          >
          <span class="text-sm font-bold text-text-primary"
            >{localValues.weight}kg</span
          >
        </div>
        <input
          id="weight"
          type="range"
          min="40"
          max="150"
          step="1"
          bind:value={localValues.weight}
          oninput={(event) => handleRangeInput('weight', event)}
          aria-valuenow={localValues.weight}
          aria-valuemin={40}
          aria-valuemax={150}
          aria-valuetext="{localValues.weight} kilograms"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="temp"
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Ambient Temp</label
          >
          <span class="text-sm font-bold text-text-primary"
            >{localValues.ambientTemp}°C</span
          >
        </div>
        <input
          id="temp"
          type="range"
          min="-20"
          max="45"
          step="1"
          bind:value={localValues.ambientTemp}
          oninput={(event) => handleRangeInput('ambientTemp', event)}
          aria-valuenow={localValues.ambientTemp}
          aria-valuemin={-20}
          aria-valuemax={45}
          aria-valuetext="{localValues.ambientTemp} degrees celsius"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="soh"
            class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Battery Health</label
          >
          <span class="text-sm font-bold text-text-primary"
            >{Math.round(localValues.soh * 100)}%</span
          >
        </div>
        <input
          id="soh"
          type="range"
          min="0.5"
          max="1"
          step="0.01"
          bind:value={localValues.soh}
          oninput={(event) => handleRangeInput('soh', event)}
          aria-valuenow={localValues.soh}
          aria-valuemin={0.5}
          aria-valuemax={1}
          aria-valuetext="{Math.round(localValues.soh * 100)} percent health"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
      </div>
    </div>
  </div>
</div>
