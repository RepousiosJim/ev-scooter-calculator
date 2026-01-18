<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import PresetSelector from '$lib/components/calculator/PresetSelector.svelte';
  import BasicConfig from '$lib/components/calculator/BasicConfig.svelte';
  import AdvancedConfig from '$lib/components/calculator/AdvancedConfig.svelte';
  import SectionDivider from '$lib/components/ui/SectionDivider.svelte';
  import ResultsPanel from './ResultsPanel.svelte';

  const stats = $derived(calculatorState.stats);
  const bottlenecks = $derived(calculatorState.bottlenecks);
</script>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
  <!-- Configuration Panel (Left) -->
  <div class="lg:col-span-4">
    <div 
      class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg sticky top-4 animate-fade-in"
      style="animation-delay: 0.1s"
    >
      <div class="space-y-6">
        <div>
          <h2 class="text-h3 font-semibold text-textMain mb-2">Configuration</h2>
          <p class="text-body-sm text-textMuted">Customize your scooter specifications</p>
        </div>

        <PresetSelector />

        <SectionDivider variant="dotted" />

        <BasicConfig />

        <button
          type="button"
          onclick={() => {
            calculatorState.showAdvanced = !calculatorState.showAdvanced;
          }}
          class="w-full flex items-center justify-between px-4 py-3 text-sm text-textMain hover:bg-white/5 rounded-lg transition-all duration-200"
          aria-expanded={calculatorState.showAdvanced}
          aria-controls="advanced-config"
        >
          <span class="font-medium">Advanced Settings</span>
          <span 
            class="text-primary text-lg transition-transform duration-200"
            style:transform={calculatorState.showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)'}
            aria-hidden="true"
          >
            ▶
          </span>
        </button>

        <div 
          id="advanced-config" 
          class:hidden={calculatorState.showAdvanced}
          class:overflow-hidden={!calculatorState.showAdvanced}
          class:opacity-0={!calculatorState.showAdvanced}
          class:transition-all={calculatorState.showAdvanced}
          class:max-h-0={!calculatorState.showAdvanced}
          class:max-h-screen={calculatorState.showAdvanced}
          class:animate-fade-in={calculatorState.showAdvanced}
        >
          <AdvancedConfig />
        </div>
      </div>
    </div>
  </div>

  <!-- Results Panel (Right) -->
  <div class="lg:col-span-8">
    <ResultsPanel />
  </div>
</div>
