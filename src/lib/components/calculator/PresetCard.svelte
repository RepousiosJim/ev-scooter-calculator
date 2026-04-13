<script lang="ts">
  import type { ScooterConfig } from '$lib/types';
  import { presets } from '$lib/data/presets';
  import { loadPreset } from '$lib/stores/calculator.svelte';
  import { analytics } from '$lib/utils/analytics';
  import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import Badge from '$lib/components/ui/atoms/Badge.svelte';
  import { Bike } from 'lucide-svelte';

  const presetOptions = [
    { value: 'custom', label: 'Manual Entry', config: presets.custom },
    { value: 'm365_2025', label: 'Xiaomi M365 (2025)', config: presets.m365_2025 },
    { value: 'f2pro', label: 'Ninebot F2 Pro', config: presets.f2pro },
    { value: 'es4', label: 'Segway ES4', config: presets.es4 },
    { value: 'kqi3max', label: 'NIU KQi3 Max', config: presets.kqi3max },
    { value: 'apollo_city_2025', label: 'Apollo City (2025)', config: presets.apollo_city_2025 },
    { value: 'vsett9plus', label: 'VSETT 9+', config: presets.vsett9plus },
    { value: 'mantis10', label: 'Kaabo Mantis 10', config: presets.mantis10 },
    { value: 'gt2', label: 'Segway GT2', config: presets.gt2 },
    { value: 'thunder3', label: 'Dualtron Thunder 3', config: presets.thunder3 },
    { value: 'burne2max', label: 'NAMI Burn-E 2 Max', config: presets.burne2max },
    { value: 'wolfkinggtr', label: 'Kaabo Wolf King GTR', config: presets.wolfkinggtr },
  ];

  let selectedPreset = $state('custom');
  let showPresetModal = $state(false);
  let searchQuery = $state('');
  let modalTrigger: HTMLElement | null = $state(null);

  const selectedOption = $derived(presetOptions.find((preset) => preset.value === selectedPreset) ?? presetOptions[0]);

  const canResetPreset = $derived(selectedPreset !== 'custom');

  const filteredPresets = $derived.by(() => {
    if (!searchQuery) return presetOptions;
    const query = searchQuery.toLowerCase();
    return presetOptions.filter(
      (preset) => preset.label.toLowerCase().includes(query) || preset.value.toLowerCase().includes(query)
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
    class="w-full flex items-center justify-between px-4 py-3 bg-tertiary border border-white/10 rounded-lg hover:border-white/20 transition-colors"
    onclick={() => (showPresetModal = true)}
    aria-haspopup="dialog"
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
      {#each cardSpecs as spec (spec.label)}
        <div class="flex items-center gap-1.5 bg-tertiary border border-white/10 rounded-lg px-3 py-1.5">
          <span class="text-xs text-text-secondary">{spec.label}:</span>
          <span class="text-sm font-medium text-text-primary font-number">
            {spec.value(selectedOption.config)}
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Preset Bottom Sheet -->
  <BottomSheet bind:isOpen={showPresetModal} height="large" onClose={closeModal}>
    <div class="space-y-6">
      <h2 class="text-h2 text-text-primary">Choose Preset</h2>

      <!-- Search Bar -->
      <div>
        <input
          type="text"
          placeholder="Search presets..."
          value={searchQuery}
          oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)}
          class="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-lg text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          aria-label="Search presets"
        />
      </div>

      <!-- Preset Grid -->
      <div class="grid grid-cols-1 gap-4">
        {#each filteredPresets as preset (preset.value)}
          <button
            type="button"
            class={`relative flex flex-col gap-3 p-4 border rounded-xl transition-all
                ${
                  selectedPreset === preset.value
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-bg-secondary hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
                }`}
            onclick={() => applyPreset(preset.value)}
            aria-pressed={selectedPreset === preset.value}
            onkeydown={handleSearch}
          >
            <!-- Selected Badge -->
            {#if selectedPreset === preset.value}
              <Badge text="Selected" variant="primary" size="sm" class="absolute top-3 right-3" />
            {/if}

            <!-- Preset Icon & Name -->
            <div class="flex items-center gap-3">
              <span class="text-text-secondary" aria-hidden="true"><Bike size={24} /></span>
              <div class="text-left">
                <div class="font-semibold text-text-primary text-base">
                  {preset.label}
                </div>
              </div>
            </div>

            <!-- Quick Specs -->
            <div class="flex gap-2 flex-wrap">
              {#each cardSpecs as spec (spec.label)}
                <div class="flex items-center gap-1">
                  <span class="text-xs text-text-secondary">{spec.label}:</span>
                  <span class="text-xs font-medium text-text-primary font-number">
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
          class={`relative flex flex-col gap-3 p-4 border rounded-xl transition-all
              ${
                selectedPreset === 'custom'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-bg-secondary hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
              }`}
          onclick={() => applyPreset('custom')}
          aria-pressed={selectedPreset === 'custom'}
          onkeydown={handleSearch}
        >
          {#if selectedPreset === 'custom'}
            <Badge text="Selected" variant="primary" size="sm" class="absolute top-3 right-3" />
          {/if}

          <div class="flex items-center gap-3">
            <Icon name="settings" size="lg" />
            <div class="text-left">
              <div class="font-semibold text-text-primary text-base">Manual Entry</div>
              <div class="text-xs text-text-secondary">Configure your scooter manually</div>
            </div>
          </div>
        </button>
      </div>

      <!-- Bottom Sheet Footer -->
      <div class="pt-4 border-t border-white/10 pb-4">
        <button
          type="button"
          class="w-full py-3 text-text-secondary hover:text-text-primary transition-colors"
          onclick={closeModal}
        >
          Cancel
        </button>
      </div>
    </div>
  </BottomSheet>
</div>
