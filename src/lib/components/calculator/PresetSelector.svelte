<script lang="ts">
  import { presets } from '$lib/data/presets';
  import { calculatorState, loadPreset } from '$lib/stores/calculator.svelte';

  let selectedPreset = $state('custom');

  function handleLoad() {
    loadPreset(selectedPreset);
  }
</script>

<div class="bg-gradient-to-br from-primary/8 to-secondary/8 border border-white/10 rounded-xl p-4 mb-5">
  <label for="preset-select" class="block text-primary font-bold text-sm uppercase tracking-wider mb-2">
    Quick Start
  </label>
  <div class="flex gap-3">
    <select
      id="preset-select"
      bind:value={selectedPreset}
      class="flex-1 bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
    >
      <option value="custom">Manual Entry</option>
      <option value="m365">Xiaomi M365</option>
      <option value="es2">Ninebot ES2</option>
      <option value="wolf">Kaabo Wolf Warrior</option>
      <option value="ox">Inokim OX</option>
      <option value="dualtron">Dualtron X II</option>
      <option value="burne">NAMI Burn-E 2</option>
      <option value="emove">Emove Cruiser</option>
    </select>
    <button
      onclick={handleLoad}
      class="bg-primary text-bgDark font-bold px-4 py-2 rounded hover:opacity-90 transition"
    >
      Load
    </button>
  </div>
</div>
