<script lang="ts">
  import { untrack } from 'svelte';
  import { calculatorState, updateConfig, applyConfig } from '$lib/stores/calculator.svelte';
  import { defaultConfig } from '$lib/data/presets';
  import { normalizeConfig } from '$lib/utils/validators';
  import { createDebouncedUpdate, handleRangeInput, handleNumberInput } from '$lib/utils/config-input';
  // Icon import removed — not used in this component
  import { weightVal, weightUnit, weightToMetric, tempVal, tempUnit, tempToMetric } from '$lib/utils/units';

  const config = $derived(calculatorState.config);

  const debouncedUpdate = createDebouncedUpdate();

  let localValues = $state(
    untrack(() => ({
      v: config.v,
      ah: config.ah,
      watts: config.watts,
      weight: config.weight,
      ambientTemp: config.ambientTemp,
      soh: config.soh,
    }))
  );

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

  // Display values for unit-converted fields
  const displayWeight = $derived(Math.round(weightVal(localValues.weight)));
  const displayTemp = $derived(Math.round(tempVal(localValues.ambientTemp)));

  function handleWeightNumber(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const displayVal = target.valueAsNumber;
    if (!Number.isFinite(displayVal)) return;
    const metricVal = Math.round(weightToMetric(displayVal));
    const clamped = Math.max(40, Math.min(150, metricVal));
    localValues.weight = clamped;
    debouncedUpdate('weight', clamped);
  }

  function handleTempNumber(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const displayVal = target.valueAsNumber;
    if (!Number.isFinite(displayVal)) return;
    const metricVal = Math.round(tempToMetric(displayVal));
    const clamped = Math.max(-20, Math.min(45, metricVal));
    localValues.ambientTemp = clamped;
    debouncedUpdate('ambientTemp', clamped);
  }

  // Input validation warnings
  const stats = $derived(calculatorState.stats);
  const warnings = $derived.by(() => {
    const w: Record<string, string> = {};
    const wh = localValues.v * localValues.ah;
    const cRate = stats.cRate;

    if (cRate > 3.0) w.watts = `High C-rate (${cRate.toFixed(1)}C) — battery stress`;
    else if (cRate > 2.5) w.watts = `Elevated C-rate (${cRate.toFixed(1)}C)`;

    if (localValues.v >= 72 && localValues.ah < 15) w.ah = 'Low capacity for high voltage — limited range';
    if (wh > 5000) w.v = 'Very high energy — verify specs are realistic';
    if (localValues.soh < 0.7) w.soh = 'Severely degraded battery — consider replacement';
    if (localValues.ambientTemp <= -10) w.ambientTemp = 'Extreme cold — expect significant range loss';

    return w;
  });

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
      setTimeout(() => (confirmReset = false), 3000);
    }
  }
</script>

<div class="space-y-5 md:space-y-8">
  <!-- Reset Button -->
  <div class="flex justify-end">
    <button
      type="button"
      onclick={handleResetClick}
      class="text-[10px] uppercase tracking-wider transition-colors {confirmReset
        ? 'text-danger'
        : 'text-text-tertiary hover:text-danger'}"
    >
      {confirmReset ? 'Click again to confirm' : 'Reset to defaults'}
    </button>
  </div>
  <!-- Core Specs -->
  <fieldset
    class="p-4 sm:p-5 md:p-6 border border-white/[0.08] bg-white/[0.03] rounded-2xl
    transition-all duration-300 hover:border-white/10"
  >
    <legend class="sr-only">Core Specs</legend>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="voltage" class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >System Voltage</label
          >
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="24"
              max="100"
              step="1"
              value={localValues.v}
              onchange={(event) => handleNumberInput(debouncedUpdate, localValues, 'v', event)}
              class="w-16 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-primary text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="System voltage value"
            />
            <span class="text-xs text-text-tertiary">V</span>
          </div>
        </div>
        <input
          id="voltage"
          type="range"
          min="24"
          max="100"
          step="1"
          bind:value={localValues.v}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'v', event)}
          aria-label="Battery Voltage"
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
        {#if warnings.v}
          <div class="text-[10px] text-amber-400 font-medium px-1">{warnings.v}</div>
        {/if}
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="capacity" class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Battery Capacity</label
          >
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="5"
              max="100"
              step="0.5"
              value={localValues.ah}
              onchange={(event) => handleNumberInput(debouncedUpdate, localValues, 'ah', event)}
              class="w-16 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-primary text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Battery capacity value"
            />
            <span class="text-xs text-text-tertiary">Ah</span>
          </div>
        </div>
        <input
          id="capacity"
          type="range"
          min="5"
          max="100"
          step="0.5"
          bind:value={localValues.ah}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'ah', event)}
          aria-label="Battery Capacity"
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
        {#if warnings.ah}
          <div class="text-[10px] text-amber-400 font-medium px-1">{warnings.ah}</div>
        {/if}
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="power" class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Motor Power</label
          >
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="250"
              max="10000"
              step="50"
              value={localValues.watts}
              onchange={(event) => handleNumberInput(debouncedUpdate, localValues, 'watts', event)}
              class="w-20 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-primary text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Motor power value"
            />
            <span class="text-xs text-text-tertiary">W</span>
          </div>
        </div>
        <input
          id="power"
          type="range"
          min="250"
          max="10000"
          step="50"
          bind:value={localValues.watts}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'watts', event)}
          aria-label="Motor Power"
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
        {#if warnings.watts}
          <div class="text-[10px] text-amber-400 font-medium px-1">{warnings.watts}</div>
        {/if}
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <span class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]">Motor Units</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each [1, 2] as count (count)}
            <button
              onclick={() => updateConfig('motors', count)}
              class="py-2.5 border rounded-lg transition-all duration-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2
                {config.motors === count
                ? 'bg-primary/10 border-primary/30 text-text-primary'
                : 'bg-white/[0.02] border-white/[0.06] text-text-tertiary hover:bg-white/[0.04] hover:border-white/10 hover:text-text-secondary'}"
            >
              {count}
              {count === 1 ? 'Single' : 'Dual'}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </fieldset>

  <!-- Environment & Usage -->
  <fieldset
    class="p-4 sm:p-5 md:p-6 border border-white/[0.08] bg-white/[0.03] rounded-2xl
    transition-all duration-300 hover:border-white/10"
  >
    <legend class="sr-only">Environment & Usage</legend>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="weight" class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Rider Weight</label
          >
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min={Math.round(weightVal(40))}
              max={Math.round(weightVal(150))}
              step="1"
              value={displayWeight}
              onchange={handleWeightNumber}
              class="w-16 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-text-primary text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Rider weight value"
            />
            <span class="text-xs text-text-tertiary">{weightUnit()}</span>
          </div>
        </div>
        <input
          id="weight"
          type="range"
          min="40"
          max="150"
          step="1"
          bind:value={localValues.weight}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'weight', event)}
          aria-label="Rider Weight"
          aria-valuenow={localValues.weight}
          aria-valuemin={40}
          aria-valuemax={150}
          aria-valuetext="{displayWeight} {weightUnit()}"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
        <div class="flex justify-between text-xs text-text-tertiary px-1">
          <span>{Math.round(weightVal(40))}{weightUnit()}</span>
          <span>{Math.round(weightVal(150))}{weightUnit()}</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="temp" class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Ambient Temp</label
          >
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min={Math.round(tempVal(-20))}
              max={Math.round(tempVal(45))}
              step="1"
              value={displayTemp}
              onchange={handleTempNumber}
              class="w-16 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-text-primary text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Ambient temperature value"
            />
            <span class="text-xs text-text-tertiary">{tempUnit()}</span>
          </div>
        </div>
        <input
          id="temp"
          type="range"
          min="-20"
          max="45"
          step="1"
          bind:value={localValues.ambientTemp}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'ambientTemp', event)}
          aria-label="Ambient Temperature"
          aria-valuenow={localValues.ambientTemp}
          aria-valuemin={-20}
          aria-valuemax={45}
          aria-valuetext="{displayTemp} {tempUnit()}"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
        />
        <div class="flex justify-between text-xs text-text-tertiary px-1">
          <span>{Math.round(tempVal(-20))}{tempUnit()}</span>
          <span>{Math.round(tempVal(45))}{tempUnit()}</span>
        </div>
        {#if warnings.ambientTemp}
          <div class="text-[10px] text-amber-400 font-medium px-1">{warnings.ambientTemp}</div>
        {/if}
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="soh" class="text-xs font-semibold text-text-secondary uppercase tracking-[0.16em]"
            >Battery Health</label
          >
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="50"
              max="100"
              step="1"
              value={Math.round(localValues.soh * 100)}
              onchange={(event) => {
                const target = event.currentTarget as HTMLInputElement;
                const pct = target.valueAsNumber;
                if (!Number.isFinite(pct)) return;
                const clamped = Math.max(0.5, Math.min(1, pct / 100));
                localValues.soh = clamped;
                debouncedUpdate('soh', clamped);
              }}
              class="w-14 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-text-primary text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Battery health percentage"
            />
            <span class="text-xs text-text-tertiary">%</span>
          </div>
        </div>
        <input
          id="soh"
          type="range"
          min="0.5"
          max="1"
          step="0.01"
          bind:value={localValues.soh}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'soh', event)}
          aria-label="Battery Health"
          aria-valuenow={localValues.soh}
          aria-valuemin={0.5}
          aria-valuemax={1}
          aria-valuetext="{Math.round(localValues.soh * 100)} percent health"
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
        {#if warnings.soh}
          <div class="text-[10px] text-amber-400 font-medium px-1">{warnings.soh}</div>
        {/if}
      </div>
    </div>
  </fieldset>
</div>
