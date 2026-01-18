<script lang="ts">
  import type { ScooterConfig } from '$lib/types';
  import { presets } from '$lib/data/presets';
  import { loadPreset } from '$lib/stores/calculator.svelte';
  import { analytics } from '$lib/utils/analytics';
  import Button from '$lib/components/ui/atoms/Button.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import Input from '$lib/components/ui/atoms/Input.svelte';
  import Badge from '$lib/components/ui/atoms/Badge.svelte';

  const presetOptions = [
    { value: 'custom', label: 'Manual Entry', emoji: '🛠️', config: presets.custom },
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
    { value: 'wolfkinggtr', label: 'Kaabo Wolf King GTR', emoji: '🐺', config: presets.wolfkinggtr },
  ];

  let selectedPreset = $state('custom');
  let showPresetModal = $state(false);
  let searchQuery = $state('');
  let modalTrigger: HTMLElement | null = $state(null);

  const selectedOption = $derived(
    presetOptions.find((preset) => preset.value === selectedPreset) ?? presetOptions[0]
  );

  const canResetPreset = $derived(selectedPreset !== 'custom');

  const filteredPresets = $derived.by(() => {
    if (!searchQuery) return presetOptions;
    const query = searchQuery.toLowerCase();
    return presetOptions.filter((preset) =>
      preset.label.toLowerCase().includes(query) ||
      preset.value.toLowerCase().includes(query)
    );
  });

  const cardSpecs = [
    { label: 'Voltage', value: (config: ScooterConfig) => `${config.v} V` },
    { label: 'Capacity', value: (config: ScooterConfig) => `${config.ah} Ah` },
    { label: 'Motors', value: (config: ScooterConfig) => `${config.motors} x ${config.watts} W` },
    { label: 'Wheel', value: (config: ScooterConfig) => `${config.wheel}"` },
  ];

  function applyPreset(presetKey: string) {
    selectedPreset = presetKey;
    loadPreset(presetKey);
    showPresetModal = false;
    searchQuery = '';

    analytics.trackEvent('preset_selected', {
      preset_key: presetKey,
      preset_name: selectedOption?.label || presetKey,
    });

    analytics.advanceFunnel('configuration_flow', 'preset_selected');
  }

  function closeModal() {
    showPresetModal = false;
    modalTrigger?.focus();
  }

  function handleSearch(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }
</script>

<div class="w-full">
  <!-- Preset Selector Button -->
  <button
    bind:this={modalTrigger}
    type="button"
    class="w-full flex items-center justify-between px-4 py-3 bg-tertiary border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
    onclick={() => showPresetModal = true}
    aria-haspopup="true"
    aria-expanded={showPresetModal}
  >
    <span class="flex items-center gap-2">
      <Icon name="battery" size="lg" />
      <span>{selectedOption?.label || 'Select Preset'}</span>
    </span>
    <Icon name="chevron-down" size="sm" />
  </button>

  <!-- Selected Preset Info (when not custom) -->
  {#if canResetPreset && selectedOption}
    <div class="mt-3 flex gap-2 flex-wrap">
      {#each cardSpecs as spec}
        <div class="flex items-center gap-1.5 bg-tertiary border border-gray-600 rounded-lg px-3 py-1.5">
          <span class="text-xs text-textMuted">{spec.label}:</span>
          <span class="text-sm font-medium text-textMain font-number">
            {spec.value(selectedOption.config)}
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Preset Modal -->
  {#if showPresetModal}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-modalBackdrop bg-gray-900/80 backdrop-blur-sm animate-fade-in"
      onclick={closeModal}
      aria-modal="true"
      role="dialog"
      aria-labelledby="preset-modal-title"
    >
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-auto bg-tertiary border border-gray-600 rounded-card shadow-2xl animate-scale-in"
        onclick={(e) => e.stopPropagation()}
        role="document"
      >
        <!-- Modal Header -->
        <div class="sticky top-0 z-10 bg-tertiary border-b border-gray-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 id="preset-modal-title" class="text-h2 text-textMain">
              Choose Preset
            </h2>
            <button
              type="button"
              class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              onclick={closeModal}
              aria-label="Close modal"
            >
              <Icon name="close" size="md" />
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="px-6 pb-4">
          <input
            type="text"
            placeholder="Search presets..."
            value={searchQuery}
            oninput={(e) => searchQuery = (e.currentTarget as HTMLInputElement).value}
            class="w-full px-4 py-3 bg-bgInput border border-gray-600 rounded-lg text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            aria-label="Search presets"
          />
        </div>

        <!-- Preset Grid -->
        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each filteredPresets as preset}
            <button
              type="button"
              class={`relative flex flex-col gap-3 p-4 border rounded-card transition-all duration-normal card-lift
                ${selectedPreset === preset.value
                  ? 'border-primary bg-primary/10 shadow-glow-sm'
                  : 'border-gray-600 bg-hover/50 hover:border-gray-500'
                }`}
              onclick={() => applyPreset(preset.value)}
              aria-pressed={selectedPreset === preset.value}
              onkeydown={handleSearch}
            >
              <!-- Selected Badge -->
              {#if selectedPreset === preset.value}
                <Badge
                  text="Selected"
                  variant="primary"
                  size="sm"
                  class="absolute top-2 right-2"
                />
              {/if}

              <!-- Preset Icon & Name -->
              <div class="flex items-center gap-3">
                <span class="text-2xl" aria-hidden="true">{preset.emoji}</span>
                <div class="text-left">
                  <div class="font-semibold text-textMain text-h3">
                    {preset.label}
                  </div>
                </div>
              </div>

              <!-- Quick Specs -->
              <div class="flex gap-2 flex-wrap mt-1">
                {#each cardSpecs as spec}
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-textMuted">{spec.label}:</span>
                    <span class="text-xs font-medium text-textMain font-number">
                      {spec.value(preset.config)}
                    </span>
                  </div>
                {/each}
              </div>
            </button>
          {/each}

          <!-- Manual Entry Option -->
          <button
            type="button"
            class={`relative flex flex-col gap-3 p-4 border rounded-card transition-all duration-normal card-lift
              ${selectedPreset === 'custom'
                ? 'border-primary bg-primary/10 shadow-glow-sm'
                : 'border-gray-600 bg-hover/50 hover:border-gray-500'
              }`}
            onclick={() => applyPreset('custom')}
            aria-pressed={selectedPreset === 'custom'}
            onkeydown={handleSearch}
          >
            {#if selectedPreset === 'custom'}
              <Badge
                text="Selected"
                variant="primary"
                size="sm"
                class="absolute top-2 right-2"
              />
            {/if}

            <div class="flex items-center gap-3">
              <Icon name="settings" size="lg" />
              <div class="text-left">
                <div class="font-semibold text-textMain text-h3">
                  Manual Entry
                </div>
                <div class="text-xs text-textMuted">
                  Configure your scooter manually
                </div>
              </div>
            </div>
          </button>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-tertiary border-t border-gray-600 px-6 py-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-textMuted">
              {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''} available
            </span>
            <button
              type="button"
              class="px-4 py-2 text-textMuted hover:text-textMain transition-colors"
              onclick={closeModal}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Mobile responsive adjustments */
  @media (max-width: 640px) {
    .grid-cols-1 {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
  }
</style>
