<script lang="ts">
  import type { ScooterConfig } from '$lib/types';
  import { presets } from '$lib/data/presets';
  import { loadPreset } from '$lib/stores/calculator.svelte';

  const presetOptions = [
    { value: 'custom', label: 'Manual Entry', emoji: '✍️', config: presets.custom },
    { value: 'm365', label: 'Xiaomi M365', emoji: '🛴', config: presets.m365 },
    { value: 'es2', label: 'Ninebot ES2', emoji: '🚦', config: presets.es2 },
    { value: 'wolf', label: 'Kaabo Wolf Warrior', emoji: '🐺', config: presets.wolf },
    { value: 'ox', label: 'Inokim OX', emoji: '🐂', config: presets.ox },
    { value: 'dualtron', label: 'Dualtron X II', emoji: '⚡', config: presets.dualtron },
    { value: 'burne', label: 'NAMI Burn-E 2', emoji: '🔥', config: presets.burne },
    { value: 'emove', label: 'Emove Cruiser', emoji: '🌊', config: presets.emove }
  ];

  const cardSpecs = [
    { label: 'Voltage', value: (config: ScooterConfig) => `${config.v} V` },
    { label: 'Capacity', value: (config: ScooterConfig) => `${config.ah} Ah` },
    { label: 'Motors', value: (config: ScooterConfig) => `${config.motors} x ${config.watts} W` },
    { label: 'Wheel', value: (config: ScooterConfig) => `${config.wheel}"` }
  ];

  let selectedPreset = $state('custom');
  let showPresetModal = $state(false);

  const selectedOption = $derived(
    () => presetOptions.find((preset) => preset.value === selectedPreset) ?? presetOptions[0]
  );

  function applyPreset(presetKey: string) {
    selectedPreset = presetKey;
    loadPreset(presetKey);
    showPresetModal = false;
  }

  function closeModal() {
    showPresetModal = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showPresetModal) {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="bg-gradient-to-br from-primary/8 to-secondary/8 border border-white/10 rounded-xl p-4 mb-5">
  <label for="preset-select" class="block text-primary font-bold text-sm uppercase tracking-wider">
    Quick Start
  </label>
  <p class="text-xs text-textMuted mt-1 mb-3">Choose a popular scooter model to prefill the basics.</p>
  <div class="flex gap-3 items-center">
    <button
      type="button"
      on:click={() => showPresetModal = true}
      class="flex-1 bg-bgDark border border-gray-600 rounded p-3 text-textMain text-left focus:border-primary focus:outline-none hover:border-primary/70 transition"
    >
      <span class="block text-xs text-textMuted">Selected Preset</span>
      <span class="flex items-center gap-2 font-semibold text-textMain">
        <span class="text-lg">{selectedOption().emoji}</span>
        {selectedOption().label}
      </span>
      <span class="text-xs text-textMuted">Change preset</span>
    </button>
    <button
      type="button"
      on:click={() => applyPreset('custom')}
      class="bg-bgInput text-textMain px-3 py-2 rounded hover:opacity-90 transition"
    >
      Reset
    </button>
  </div>

  {#if showPresetModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-transparent px-4" on:click={closeModal}>
      <div
        class="bg-black border border-primary/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl ring-1 ring-white/10"
        on:click|stopPropagation
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-textMain">Choose a Preset</h3>
            <p class="text-xs text-textMuted">Auto-applies the recommended defaults.</p>
          </div>
          <button
            type="button"
            on:click={closeModal}
            class="text-textMuted hover:text-textMain transition"
            aria-label="Close preset selector"
          >
            ✕
          </button>
        </div>

        <div class="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {#each presetOptions as preset}
            <button
              type="button"
              on:click={() => applyPreset(preset.value)}
              class={`flex flex-col gap-3 w-full rounded-lg border px-4 py-3 text-left transition ${preset.value === selectedPreset
                ? 'border-primary bg-primary/15 text-textMain'
                : 'border-white/10 bg-bgDark text-textMuted hover:text-textMain hover:border-primary/50'}`}
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{preset.emoji}</span>
                  <span class="font-semibold">{preset.label}</span>
                </div>
                {#if preset.value === selectedPreset}
                  <span class="text-xs text-primary uppercase">Selected</span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-2 text-xs">
                {#each cardSpecs as spec}
                  <span class="rounded-full bg-bgInput px-2 py-0.5">{spec.value(preset.config)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
