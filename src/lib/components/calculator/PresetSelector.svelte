<script lang="ts">
  import type { ScooterConfig } from '$lib/types';
  import { presets } from '$lib/data/presets';
  import { loadPreset } from '$lib/stores/calculator.svelte';

  const presetOptions = [
    { value: 'custom', label: 'Manual Entry', emoji: '✍️', config: presets.custom },
    { value: 'm365_2025', label: 'Xiaomi M365 (2025)', emoji: '🛴', config: presets.m365_2025 },
    { value: 'f2pro', label: 'Ninebot F2 Pro', emoji: '🚦', config: presets.f2pro },
    { value: 'es4', label: 'Segway ES4', emoji: '🔋', config: presets.es4 },
    { value: 'kqi3max', label: 'NIU KQi3 Max', emoji: '💡', config: presets.kqi3max },
    { value: 'apollo_city_2025', label: 'Apollo City (2025)', emoji: '🌇', config: presets.apollo_city_2025 },
    { value: 'vsett9plus', label: 'VSETT 9+', emoji: '⚙️', config: presets.vsett9plus },
    { value: 'mantis10', label: 'Kaabo Mantis 10', emoji: '🦂', config: presets.mantis10 },
    { value: 'gt2', label: 'Segway GT2', emoji: '🏁', config: presets.gt2 },
    { value: 'thunder3', label: 'Dualtron Thunder 3', emoji: '⚡', config: presets.thunder3 },
    { value: 'burne2max', label: 'NAMI Burn-E 2 Max', emoji: '🔥', config: presets.burne2max },
    { value: 'wolfkinggtr', label: 'Kaabo Wolf King GTR', emoji: '🐺', config: presets.wolfkinggtr }
  ];

  const cardSpecs = [
    { label: 'Voltage', value: (config: ScooterConfig) => `${config.v} V` },
    { label: 'Capacity', value: (config: ScooterConfig) => `${config.ah} Ah` },
    { label: 'Motors', value: (config: ScooterConfig) => `${config.motors} x ${config.watts} W` },
    { label: 'Wheel', value: (config: ScooterConfig) => `${config.wheel}"` }
  ];

   let selectedPreset = $state('custom');
   let showPresetModal = $state(false);
   let modalTrigger: HTMLButtonElement;
   let modalContent: HTMLDivElement;

   const selectedOption = $derived(
     () => presetOptions.find((preset) => preset.value === selectedPreset) ?? presetOptions[0]
   );
   const canResetPreset = $derived(() => selectedPreset !== 'custom');

   function applyPreset(presetKey: string) {
     selectedPreset = presetKey;
     loadPreset(presetKey);
     showPresetModal = false;
     modalTrigger?.focus();
   }

   function closeModal() {
     showPresetModal = false;
     modalTrigger?.focus();
   }

   function handleKeydown(event: KeyboardEvent) {
     if (event.key === 'Escape' && showPresetModal) {
       closeModal();
       event.preventDefault();
     }
     if (showPresetModal && event.key === 'Tab') {
       const focusable = modalContent?.querySelectorAll('button, input');
       const first = focusable?.[0] as HTMLElement;
       const last = focusable?.[focusable.length - 1] as HTMLElement;

       if (event.shiftKey && document.activeElement === first) {
         last?.focus();
         event.preventDefault();
       } else if (!event.shiftKey && document.activeElement === last) {
         first?.focus();
         event.preventDefault();
       }
     }
   }
</script>

<svelte:window onkeydown={handleKeydown} />

  <div class="bg-gradient-to-br from-primary/8 to-secondary/8 border border-white/10 rounded-xl p-4 mb-5">
    <label for="preset-select" class="block text-primary font-bold text-sm uppercase tracking-wider">
      Quick Start
    </label>
    <p class="text-xs text-textMuted mt-1 mb-3">Choose a popular scooter model to prefill the basics.</p>
    <div class="flex gap-3 items-center">
      <button
        type="button"
        bind:this={modalTrigger}
        onclick={() => showPresetModal = true}
        aria-expanded={showPresetModal}
        aria-haspopup="dialog"
        class="flex-1 bg-bgDark border border-gray-600 rounded p-3 text-textMain text-left focus:border-primary focus:outline-none hover:border-primary/70 transition"
      >
        <span class="block text-xs text-textMuted">Selected Preset</span>
        <span class="flex items-center gap-2 font-semibold text-textMain">
          <span class="text-lg" aria-hidden="true">{selectedOption().emoji}</span>
          {selectedOption().label}
        </span>
        <span class="text-xs text-textMuted">Change preset</span>
      </button>
      <button
        type="button"
        onclick={() => applyPreset(selectedPreset)}
        class={`bg-bgInput text-textMain px-3 py-2 rounded transition ${canResetPreset()
          ? 'hover:opacity-90'
          : 'opacity-50 cursor-not-allowed'}`}
        disabled={!canResetPreset()}
        aria-label="Reset to selected preset"
      >
        Reset to Preset
      </button>
    </div>

  {#if showPresetModal}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div
        bind:this={modalContent}
        class="bg-black border border-primary/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl ring-1 ring-white/10"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 id="modal-heading" class="text-lg font-semibold text-textMain">Choose a Preset</h3>
            <p class="text-xs text-textMuted">Auto-applies the recommended defaults.</p>
          </div>
          <button
            type="button"
            onclick={closeModal}
            class="text-textMuted hover:text-textMain transition"
            aria-label="Close preset selector"
          >
            ✕
          </button>
        </div>

        <div class="grid gap-3 max-h-[60vh] overflow-y-auto pr-1" role="listbox" aria-label="Available scooter presets">
          {#each presetOptions as preset, index (preset.value)}
            <button
              type="button"
              role="option"
              aria-selected={preset.value === selectedPreset}
              onclick={() => applyPreset(preset.value)}
              class={`flex flex-col gap-3 w-full rounded-lg border px-4 py-3 text-left transition ${preset.value === selectedPreset
                ? 'border-primary bg-primary/15 text-textMain'
                : 'border-white/10 bg-bgDark text-textMuted hover:text-textMain hover:border-primary/50'}`}
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-2xl" aria-hidden="true">{preset.emoji}</span>
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
