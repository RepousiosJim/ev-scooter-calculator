<script lang="ts">
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
</script>

{#if calculatorState.showAdvanced}
  <div class="mt-5 pt-5 border-t border-gray-700">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="weight-input" class="block text-sm text-textMuted mb-2">Rider Weight (kg)</label>
        <div class="flex gap-2 items-center">
          <input
            id="weight-input"
            type="range"
            min="50"
            max="150"
            bind:value={calculatorState.config.weight}
            class="flex-1"
            aria-label="Rider Weight"
          />
          <input
            type="number"
            min="50"
            max="150"
            bind:value={calculatorState.config.weight}
            class="w-20 bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
            aria-label="Rider Weight"
          />
        </div>
      </div>

      <div>
        <label for="wheel-input" class="block text-sm text-textMuted mb-2">Wheel Size (inch)</label>
        <input
          id="wheel-input"
          type="number"
          bind:value={calculatorState.config.wheel}
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label for="rpm-input" class="block text-sm text-textMuted mb-2">Motor RPM</label>
        <input
          id="rpm-input"
          type="number"
          value={calculatorState.config.rpm || ''}
          oninput={(e) => updateConfig('rpm', Number(e.currentTarget.value) || undefined)}
          placeholder="Auto calc"
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        />
        <p class="text-xs text-textMuted mt-1">No-load RPM for precise speed calculation</p>
      </div>

      <div>
        <label for="charger-input" class="block text-sm text-textMuted mb-2">Charger Amps (A)</label>
        <input
          id="charger-input"
          type="number"
          bind:value={calculatorState.config.charger}
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label for="slope-input" class="block text-sm text-textMuted mb-2">Max Slope (%)</label>
        <input
          id="slope-input"
          type="number"
          bind:value={calculatorState.config.slope}
          min="0"
          max="100"
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        />
        <p class="text-xs text-textMuted mt-1">0% = flat, 10% = steep, 100% = vertical</p>
      </div>

      <div>
        <label for="position-select" class="block text-sm text-textMuted mb-2">Riding Position</label>
        <select
          id="position-select"
          bind:value={calculatorState.config.ridePosition}
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        >
          <option value={0.6}>Upright (High Drag)</option>
          <option value={0.4}>Sport Tuck</option>
        </select>
      </div>

      <div>
        <label for="regen-input" class="block text-sm text-textMuted mb-2">Regen Efficiency (%)</label>
        <input
          id="regen-input"
          type="number"
          bind:value={calculatorState.config.regen}
          min="0"
          max="15"
          step="0.01"
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        />
        <p class="text-xs text-textMuted mt-1">Energy recovered when braking</p>
      </div>

      <div>
        <label for="cost-input" class="block text-sm text-textMuted mb-2">Electricity Cost ($/kWh)</label>
        <input
          id="cost-input"
          type="number"
          bind:value={calculatorState.config.cost}
          min="0"
          step="0.01"
          class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  </div>
{/if}
