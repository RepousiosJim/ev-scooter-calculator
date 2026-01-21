<script lang="ts">
  import { calculatorState, updateConfig } from "$lib/stores/calculator.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";
  import Select from "$lib/components/ui/atoms/Select.svelte";

  const config = $derived(calculatorState.config);

  const tireOptions = [
    { value: 0.012, label: "Street Performance" },
    { value: 0.015, label: "Standard Commute" },
    { value: 0.02, label: "Mixed Terrain" },
    { value: 0.025, label: "Off-road" },
  ];
</script>

<div class="space-y-10">
  <!-- Aerodynamics -->
  <div class="space-y-6">
    <div class="flex items-center gap-3 border-b border-white/5 pb-4">
      <div class="w-1 h-4 bg-primary rounded-full"></div>
      <h3
        class="text-sm font-bold uppercase tracking-widest text-text-secondary"
      >
        Aerodynamics
      </h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="drag" class="text-xs font-semibold text-text-secondary"
            >Drag Coefficient (Cd)</label
          >
          <span class="text-sm font-bold text-primary"
            >{config.dragCoefficient ?? config.ridePosition}</span
          >
        </div>
        <input
          id="drag"
          type="range"
          min="0.3"
          max="1.2"
          step="0.1"
          bind:value={calculatorState.config.dragCoefficient}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="area" class="text-xs font-semibold text-text-secondary"
            >Frontal Area (m²)</label
          >
          <span class="text-sm font-bold text-primary"
            >{config.frontalArea ?? 0.5} m²</span
          >
        </div>
        <input
          id="area"
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          bind:value={calculatorState.config.frontalArea}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
        />
      </div>
    </div>
  </div>

  <!-- Drivetrain -->
  <div class="space-y-6">
    <div class="flex items-center gap-3 border-b border-white/5 pb-4">
      <div class="w-1 h-4 bg-secondary rounded-full"></div>
      <h3
        class="text-sm font-bold uppercase tracking-widest text-text-secondary"
      >
        Drivetrain
      </h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label
            for="efficiency"
            class="text-xs font-semibold text-text-secondary">Efficiency</label
          >
          <span class="text-sm font-bold text-secondary"
            >{Math.round((config.drivetrainEfficiency ?? 0.9) * 100)}%</span
          >
        </div>
        <input
          id="efficiency"
          type="range"
          min="0.7"
          max="0.98"
          step="0.01"
          bind:value={calculatorState.config.drivetrainEfficiency}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
        />
      </div>

      <div class="space-y-4">
        <Select
          label="Tire Profile"
          value={calculatorState.config.rollingResistance}
          options={tireOptions}
          onChange={(val) => updateConfig("rollingResistance", val as number)}
        />
      </div>
    </div>
  </div>

  <!-- Energy -->
  <div class="space-y-6">
    <div class="flex items-center gap-3 border-b border-white/5 pb-4">
      <div class="w-1 h-4 bg-success rounded-full"></div>
      <h3
        class="text-sm font-bold uppercase tracking-widest text-text-secondary"
      >
        Energy Systems
      </h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="regen" class="text-xs font-semibold text-text-secondary"
            >Regen Strength</label
          >
          <span class="text-sm font-bold text-success"
            >{Math.round(config.regen * 100)}%</span
          >
        </div>
        <input
          id="regen"
          type="range"
          min="0"
          max="0.25"
          step="0.01"
          bind:value={calculatorState.config.regen}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center px-1">
          <label for="charger" class="text-xs font-semibold text-text-secondary"
            >Charger (A)</label
          >
          <span class="text-sm font-bold text-success">{config.charger}A</span>
        </div>
        <input
          id="charger"
          type="range"
          min="1"
          max="15"
          step="1"
          bind:value={calculatorState.config.charger}
          class="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-success transition-all"
        />
      </div>
    </div>
  </div>
</div>
