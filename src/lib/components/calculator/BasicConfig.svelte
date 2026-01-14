<script lang="ts">
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
</script>

<NumberInput
  label="Battery Voltage"
  bind:value={calculatorState.config.v}
  unit="V"
/>
<NumberInput
  label="Battery Capacity"
  bind:value={calculatorState.config.ah}
  unit="Ah"
/>
<div class="flex gap-4">
  <div class="flex-1">
    <NumberInput
      label="Motor Count"
      bind:value={calculatorState.config.motors}
      unit="x"
    />
  </div>
  <div class="flex-2">
    <NumberInput
      label="Power per Motor"
      bind:value={calculatorState.config.watts}
      unit="W"
    />
  </div>
</div>

<label for="controller-input" class="block text-sm text-textMuted mb-2">Controller Amp Limit</label>
<input
  id="controller-input"
  type="number"
  value={calculatorState.config.controller || ''}
  oninput={(e) => updateConfig('controller', Number(e.currentTarget.value) || undefined)}
  placeholder="Auto"
  class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none mb-4"
/>

<div class="mb-4">
  <label for="style-select" class="block text-sm text-textMuted mb-2">Riding Style (Consumption)</label>
  <select
    id="style-select"
    bind:value={calculatorState.config.style}
    class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
  >
    <option value={20}>Eco (20 Wh/km)</option>
    <option value={30}>Mixed (30 Wh/km)</option>
    <option value={45}>Aggressive (45 Wh/km)</option>
    <option value={60}>Racing (60 Wh/km)</option>
  </select>
</div>

<div class="mb-4">
  <label for="soh-input" class="block text-sm text-textMuted mb-2">Battery Health: {Math.round(calculatorState.config.soh * 100)}%</label>
  <input
    id="soh-input"
    type="range"
    min="50"
    max="100"
    step="1"
    value={Math.round(calculatorState.config.soh * 100)}
    oninput={(e) => updateConfig('soh', Number(e.currentTarget.value) / 100)}
    class="w-full"
    aria-label="Battery Health"
  />
</div>
