<script lang="ts">
  import { untrack } from 'svelte';
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
  import { createDebouncedUpdate, handleRangeInput, handleNumberInput } from '$lib/utils/config-input';
  import Select from '$lib/components/ui/atoms/Select.svelte';

  const config = $derived(calculatorState.config);

  const debouncedUpdate = createDebouncedUpdate();

  let localValues = $state(
    untrack(() => ({
      dragCoefficient: config.dragCoefficient ?? 0.7,
      frontalArea: config.frontalArea ?? 0.5,
      drivetrainEfficiency: config.drivetrainEfficiency ?? 0.9,
      regen: config.regen,
      charger: config.charger,
    }))
  );

  $effect(() => {
    const c = config;
    untrack(() => {
      localValues.dragCoefficient = c.dragCoefficient ?? 0.7;
      localValues.frontalArea = c.frontalArea ?? 0.5;
      localValues.drivetrainEfficiency = c.drivetrainEfficiency ?? 0.9;
      localValues.regen = c.regen;
      localValues.charger = c.charger;
    });
  });

  const tireOptions = [
    { value: 0.012, label: 'Street Performance' },
    { value: 0.015, label: 'Standard Commute' },
    { value: 0.02, label: 'Mixed Terrain' },
    { value: 0.025, label: 'Off-road' },
  ];

  // Snap to nearest tire option, or show closest match
  const currentTireValue = $derived(() => {
    const rr = calculatorState.config.rollingResistance;
    if (rr === undefined) return 0.015;
    const closest = tireOptions.reduce((prev, curr) =>
      Math.abs(curr.value - rr) < Math.abs(prev.value - rr) ? curr : prev
    );
    return closest.value;
  });

  const numberInputClass =
    'w-16 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-right px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
</script>

<div class="space-y-6 md:space-y-10">
  <!-- Aerodynamics -->
  <fieldset class="space-y-6">
    <legend class="flex items-center gap-3 border-b border-white/5 pb-4 w-full">
      <div class="w-1 h-4 bg-primary rounded-full"></div>
      <span class="text-sm font-bold uppercase tracking-widest text-text-secondary"> Aerodynamics </span>
    </legend>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="drag" class="text-xs font-semibold text-text-secondary">Drag Coefficient (Cd)</label>
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="0.3"
              max="1.2"
              step="0.1"
              value={localValues.dragCoefficient}
              onchange={(event) => handleNumberInput(debouncedUpdate, localValues, 'dragCoefficient', event)}
              class="{numberInputClass} text-primary"
              aria-label="Drag coefficient value"
            />
          </div>
        </div>
        <input
          id="drag"
          type="range"
          min="0.3"
          max="1.2"
          step="0.1"
          bind:value={localValues.dragCoefficient}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'dragCoefficient', event)}
          aria-valuenow={localValues.dragCoefficient}
          aria-valuemin={0.3}
          aria-valuemax={1.2}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="area" class="text-xs font-semibold text-text-secondary">Frontal Area (m²)</label>
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="0.3"
              max="1.0"
              step="0.05"
              value={localValues.frontalArea}
              onchange={(event) => handleNumberInput(debouncedUpdate, localValues, 'frontalArea', event)}
              class="{numberInputClass} text-primary"
              aria-label="Frontal area value"
            />
            <span class="text-xs text-text-tertiary">m²</span>
          </div>
        </div>
        <input
          id="area"
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          bind:value={localValues.frontalArea}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'frontalArea', event)}
          aria-valuenow={localValues.frontalArea}
          aria-valuemin={0.3}
          aria-valuemax={1.0}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
      </div>
    </div>
  </fieldset>

  <!-- Drivetrain -->
  <fieldset class="space-y-6">
    <legend class="flex items-center gap-3 border-b border-white/5 pb-4 w-full">
      <div class="w-1 h-4 bg-secondary rounded-full"></div>
      <span class="text-sm font-bold uppercase tracking-widest text-text-secondary"> Drivetrain </span>
    </legend>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="efficiency" class="text-xs font-semibold text-text-secondary">Efficiency</label>
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="70"
              max="98"
              step="1"
              value={Math.round(localValues.drivetrainEfficiency * 100)}
              onchange={(event) => {
                const target = event.currentTarget as HTMLInputElement;
                const pct = target.valueAsNumber;
                if (!Number.isFinite(pct)) return;
                const clamped = Math.max(0.7, Math.min(0.98, pct / 100));
                localValues.drivetrainEfficiency = clamped;
                debouncedUpdate('drivetrainEfficiency', clamped);
              }}
              class="{numberInputClass} text-secondary"
              aria-label="Drivetrain efficiency percentage"
            />
            <span class="text-xs text-text-tertiary">%</span>
          </div>
        </div>
        <input
          id="efficiency"
          type="range"
          min="0.7"
          max="0.98"
          step="0.01"
          bind:value={localValues.drivetrainEfficiency}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'drivetrainEfficiency', event)}
          aria-valuenow={localValues.drivetrainEfficiency}
          aria-valuemin={0.7}
          aria-valuemax={0.98}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
        />
      </div>

      <div class="space-y-4">
        <Select
          label="Tire Profile"
          value={currentTireValue()}
          options={tireOptions}
          onChange={(val) => updateConfig('rollingResistance', val as number)}
        />
      </div>
    </div>
  </fieldset>

  <!-- Energy -->
  <fieldset class="space-y-6">
    <legend class="flex items-center gap-3 border-b border-white/5 pb-4 w-full">
      <div class="w-1 h-4 bg-success rounded-full"></div>
      <span class="text-sm font-bold uppercase tracking-widest text-text-secondary"> Energy Systems </span>
    </legend>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="regen" class="text-xs font-semibold text-text-secondary">Regen Strength</label>
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="25"
              step="1"
              value={Math.round(localValues.regen * 100)}
              onchange={(event) => {
                const target = event.currentTarget as HTMLInputElement;
                const pct = target.valueAsNumber;
                if (!Number.isFinite(pct)) return;
                const clamped = Math.max(0, Math.min(0.25, pct / 100));
                localValues.regen = clamped;
                debouncedUpdate('regen', clamped);
              }}
              class="{numberInputClass} text-success"
              aria-label="Regenerative braking strength percentage"
            />
            <span class="text-xs text-text-tertiary">%</span>
          </div>
        </div>
        <input
          id="regen"
          type="range"
          min="0"
          max="0.25"
          step="0.01"
          bind:value={localValues.regen}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'regen', event)}
          aria-valuenow={localValues.regen}
          aria-valuemin={0}
          aria-valuemax={0.25}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="charger" class="text-xs font-semibold text-text-secondary">Charger</label>
          <div class="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              max="15"
              step="1"
              value={localValues.charger}
              onchange={(event) => handleNumberInput(debouncedUpdate, localValues, 'charger', event)}
              class="{numberInputClass} text-success"
              aria-label="Charger amperage"
            />
            <span class="text-xs text-text-tertiary">A</span>
          </div>
        </div>
        <input
          id="charger"
          type="range"
          min="1"
          max="15"
          step="1"
          bind:value={localValues.charger}
          oninput={(event) => handleRangeInput(debouncedUpdate, 'charger', event)}
          aria-valuenow={localValues.charger}
          aria-valuemin={1}
          aria-valuemax={15}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
      </div>
    </div>
  </fieldset>
</div>
