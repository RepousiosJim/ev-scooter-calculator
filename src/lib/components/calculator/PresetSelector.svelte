<script lang="ts">
  import type { ScooterConfig } from "$lib/types";
  import { presets, presetMetadata } from "$lib/data/presets";
  import { calculatorState, loadPreset } from "$lib/stores/calculator.svelte";
  import BottomSheet from "$lib/components/ui/BottomSheet.svelte";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  // Manual entry base option
  const customOption = {
    value: "custom",
    label: "Manual Entry",
    icon: "settings",
    config: presets.custom,
    year: 2026,
  };

  // Dynamically generate preset options from the data file sorted by year
  const presetsList = Object.keys(presets)
    .filter((key) => key !== "custom")
    .map((key) => ({
      value: key,
      label:
        presetMetadata[key]?.name ||
        key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      icon: "scooter",
      config: presets[key],
      year: presetMetadata[key]?.year || 0,
    }));

  const groupedOptions = Array.from(new Set(presetsList.map((p) => p.year)))
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      label: `${year} Models`,
      items: presetsList.filter((p) => p.year === year),
    }));

  // Combined flat list for easier searching/finding selected
  const allOptions = [customOption, ...presetsList];

  const cardSpecs = [
    { label: "Voltage", value: (config: ScooterConfig) => `${config.v} V` },
    { label: "Capacity", value: (config: ScooterConfig) => `${config.ah} Ah` },
    {
      label: "Motors",
      value: (config: ScooterConfig) => `${config.motors} x ${config.watts} W`,
    },
    { label: "Wheel", value: (config: ScooterConfig) => `${config.wheel}"` },
  ];

  let showPresetModal = $state(false);
  let modalTrigger: HTMLButtonElement;

  const selectedOption = $derived(
    () =>
      allOptions.find(
        (preset) => preset.value === calculatorState.activePresetKey,
      ) ?? allOptions[0],
  );

  const isDirty = $derived(() => {
    const current = calculatorState.config;
    // Check against the 'custom' (Manual Entry) defaults to see if we've departed from the baseline
    const baseline = presets.custom;
    return Object.keys(baseline).some((key) => {
      const k = key as keyof typeof baseline;
      if (k === "id" || k === "name") return false;
      return current[k] !== baseline[k];
    });
  });

  const canResetPreset = $derived(
    () => calculatorState.activePresetKey !== "custom" || isDirty(),
  );

  function applyPreset(presetKey: string) {
    loadPreset(presetKey);
    showPresetModal = false;
    modalTrigger?.focus();
  }

  function resetToManual() {
    applyPreset("custom");
  }

  function closeModal() {
    showPresetModal = false;
    modalTrigger?.focus();
  }
</script>

<div
  class="bg-gradient-to-br from-primary/8 to-secondary/8 border border-white/10 rounded-xl p-4 mb-5"
>
  <label
    for="preset-select"
    class="block text-primary font-bold text-sm uppercase tracking-wider"
  >
    Quick Start
  </label>
  <p class="text-xs text-textMuted mt-1 mb-3">
    Choose a popular scooter model to prefill basics.
  </p>
  <div class="flex gap-3 items-center">
    <button
      type="button"
      bind:this={modalTrigger}
      onclick={() => (showPresetModal = true)}
      aria-expanded={showPresetModal}
      aria-haspopup="dialog"
      class="flex-1 bg-bgDark border border-gray-600 rounded p-3 text-textMain text-left focus:border-primary focus:outline-none hover:border-primary/70 transition"
    >
      <span class="block text-xs text-textMuted">Selected Preset</span>
      <span class="flex items-center gap-2 font-semibold text-textMain">
        <Icon name={selectedOption().icon} size="md" class="text-primary" />
        {selectedOption().label}
      </span>
      <span class="text-xs text-textMuted">Change preset</span>
    </button>
    <button
      type="button"
      onclick={resetToManual}
      class={`bg-bgInput text-textMain px-4 py-3 sm:px-3 sm:py-2 rounded-lg transition ${
        canResetPreset()
          ? "hover:opacity-90 bg-primary/10 border border-primary/20 text-primary"
          : "opacity-50 cursor-not-allowed border border-white/5"
      }`}
      disabled={!canResetPreset()}
      aria-label="Reset to manual entry"
    >
      Reset to Manual
    </button>
  </div>
</div>

<BottomSheet
  bind:isOpen={showPresetModal}
  title="Choose a Preset"
  onClose={closeModal}
  height="large"
>
  {#snippet children()}
    <div class="space-y-6 pb-6">
      <div class="space-y-3">
        <p class="text-xs text-textMuted mb-2">Manual configuration mode.</p>
        <button
          type="button"
          role="option"
          aria-selected={calculatorState.activePresetKey === "custom"}
          onclick={() => applyPreset("custom")}
          class={`flex flex-col gap-3 w-full rounded-xl border px-4 py-4 text-left transition active:scale-98 ${
            calculatorState.activePresetKey === "custom"
              ? "border-primary bg-primary/15 text-textMain"
              : "border-white/10 bg-bgDark text-textMuted hover:text-textMain hover:border-primary/50"
          }`}
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Icon
                name="settings"
                size="lg"
                class={calculatorState.activePresetKey === "custom"
                  ? "text-primary"
                  : "text-text-tertiary"}
              />
              <span class="font-semibold text-base">Manual Entry</span>
            </div>
            {#if calculatorState.activePresetKey === "custom"}
              <span class="text-xs text-primary uppercase font-bold"
                >✓ Selected</span
              >
            {/if}
          </div>
        </button>
      </div>

      {#each groupedOptions as group}
        <div class="space-y-3">
          <div class="flex items-center gap-3 px-1">
            <span
              class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70"
            >
              {group.year} MODELS
            </span>
            <div
              class="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent"
            ></div>
          </div>

          <div
            class="grid gap-3"
            role="listbox"
            aria-label={`Available ${group.year} scooter presets`}
          >
            {#each group.items as preset (preset.value)}
              <button
                type="button"
                role="option"
                aria-selected={preset.value === calculatorState.activePresetKey}
                onclick={() => applyPreset(preset.value)}
                class={`flex flex-col gap-3 w-full rounded-xl border px-4 py-4 text-left transition active:scale-98 ${
                  preset.value === calculatorState.activePresetKey
                    ? "border-primary bg-primary/15 text-textMain"
                    : "border-white/10 bg-bgDark text-textMuted hover:text-textMain hover:border-primary/50"
                }`}
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <Icon
                      name={preset.icon}
                      size="lg"
                      class={preset.value === calculatorState.activePresetKey
                        ? "text-primary"
                        : "text-text-tertiary"}
                    />
                    <span class="font-semibold text-base">{preset.label}</span>
                  </div>
                  {#if preset.value === calculatorState.activePresetKey}
                    <span class="text-xs text-primary uppercase font-bold"
                      >✓ Selected</span
                    >
                  {/if}
                </div>
                <div class="flex flex-wrap gap-2 text-xs">
                  {#each cardSpecs as spec}
                    <span
                      class="rounded-full bg-bgInput px-2.5 py-1 whitespace-nowrap"
                      >{spec.value(preset.config)}</span
                    >
                  {/each}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/snippet}
</BottomSheet>
