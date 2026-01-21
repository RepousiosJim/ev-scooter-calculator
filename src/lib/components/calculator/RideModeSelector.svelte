<script lang="ts">
  import {
    calculatorState,
    applyRideMode,
  } from "$lib/stores/calculator.svelte";
  import type { RideMode } from "$lib/types";
  import { rideModePresets, rideModeIds } from "$lib/data/ride-modes";
  import { calculateRideModeImpact } from "$lib/utils/physics";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const modeButtons = [
    { id: "eco" as RideMode, icon: "ride-mode-eco", color: "text-green-400" },
    {
      id: "normal" as RideMode,
      icon: "ride-mode-normal",
      color: "text-blue-400",
    },
    {
      id: "sport" as RideMode,
      icon: "ride-mode-sport",
      color: "text-orange-400",
    },
    { id: "turbo" as RideMode, icon: "ride-mode-turbo", color: "text-red-400" },
  ];

  const currentMode = $derived(calculatorState.rideMode);
  const impact = $derived(() => {
    const preset = rideModePresets[currentMode];
    if (!preset) return null;
    return calculateRideModeImpact(
      calculatorState.config,
      preset.style,
      preset.regen,
      calculatorState.predictionMode,
    );
  });

  const impactValue = $derived(impact());

  function selectMode(mode: RideMode) {
    applyRideMode(mode);
  }
</script>

<div class="bg-bg-secondary border border-white/5 rounded-2xl p-6 shadow-sm">
  <div class="flex items-center justify-between mb-6">
    <div class="space-y-1">
      <h4 class="text-sm font-bold text-text-primary uppercase tracking-widest">
        Ride Dynamics
      </h4>
      <p class="text-xs text-text-secondary">
        Adjust power output and battery efficiency balance.
      </p>
    </div>
    <div class="flex-shrink-0">
      <Icon
        name={modeButtons.find((b) => b.id === currentMode)?.icon ||
          "ride-mode-normal"}
        size="md"
        class="text-primary/40"
      />
    </div>
  </div>

  <div
    class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
    role="radiogroup"
    aria-label="Ride mode selection"
  >
    {#each modeButtons as mode (mode.id)}
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === mode.id}
        onclick={() => selectMode(mode.id)}
        class={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
          currentMode === mode.id
            ? "border-primary/50 bg-primary/10 text-text-primary shadow-glow-sm scale-[1.02]"
            : "border-white/5 bg-white/2 text-text-secondary hover:border-white/10 hover:bg-white/5"
        }`}
      >
        <Icon
          name={mode.icon}
          size="sm"
          class={currentMode === mode.id ? mode.color : "opacity-40"}
        />
        <span class="text-[10px] font-bold uppercase tracking-widest"
          >{rideModePresets[mode.id].name}</span
        >
      </button>
    {/each}
  </div>

  {#if impactValue}
    <div
      class="p-4 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <Icon name="efficiency" size="xs" class="text-text-tertiary" />
        <span
          class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest leading-none"
          >Dynamics Impact</span
        >
      </div>

      <div class="flex gap-6">
        <div class="flex flex-col items-end">
          <span
            class="text-[9px] font-bold text-text-tertiary uppercase tracking-tighter"
            >Range</span
          >
          <span
            class={`text-sm font-bold ${impactValue.rangePercent >= 0 ? "text-success" : "text-danger"}`}
          >
            {impactValue.rangePercent >= 0
              ? "+"
              : ""}{impactValue.rangePercent.toFixed(0)}%
          </span>
        </div>
        <div class="flex flex-col items-end">
          <span
            class="text-[9px] font-bold text-text-tertiary uppercase tracking-tighter"
            >Speed</span
          >
          <span
            class={`text-sm font-bold ${impactValue.speedPercent >= 0 ? "text-success" : "text-danger"}`}
          >
            {impactValue.speedPercent >= 0
              ? "+"
              : ""}{impactValue.speedPercent.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  {/if}
</div>
