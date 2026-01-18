<script lang="ts">
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';
  import ProgressiveDisclosurePanel from '$lib/components/ui/ProgressiveDisclosurePanel.svelte';
  import { validationRules } from '$lib/utils/validators';
  import { calculateTemperatureFactor } from '$lib/utils/physics';

  const sohRule = validationRules.soh;
  const sohMin = Math.round((sohRule.min ?? 0) * 100);
  const sohMax = Math.round((sohRule.max ?? 1) * 100);

  function handleOptionalControllerInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const nextValue = target.value === '' ? undefined : target.valueAsNumber;

    updateConfig(
      'controller',
      Number.isNaN(nextValue as number) ? undefined : nextValue
    );
  }

  const sohValue = $derived(Math.round(calculatorState.config.soh * 100));
  const tempFactor = $derived(calculateTemperatureFactor(calculatorState.config.ambientTemp));
  const tempPercent = $derived(Math.round(tempFactor * 100));
</script>

<div class="space-y-6">
  <!-- Core Specs Section -->
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="label text-primary">Core Specs</span>
      <HelpTooltip
        content="Essential battery and motor specifications that determine base performance."
      />
    </div>

    <NumberInput
      label="Battery Voltage"
      value={calculatorState.config.v}
      min={validationRules.v.min}
      max={validationRules.v.max}
      unit="V"
      help={validationRules.v.message}
      onValueChange={(value) => updateConfig('v', value)}
    />

    <NumberInput
      label="Battery Capacity"
      value={calculatorState.config.ah}
      min={validationRules.ah.min}
      max={validationRules.ah.max}
      unit="Ah"
      step={0.1}
      help={validationRules.ah.message}
      onValueChange={(value) => updateConfig('ah', value)}
    />

    <div class="grid grid-cols-2 gap-4">
      <NumberInput
        label="Motor Count"
        value={calculatorState.config.motors}
        min={validationRules.motors.min}
        max={validationRules.motors.max}
        unit="×"
        step={1}
        help={validationRules.motors.message}
        onValueChange={(value) => updateConfig('motors', value)}
      />

      <NumberInput
        label="Power per Motor"
        value={calculatorState.config.watts}
        min={validationRules.watts.min}
        max={validationRules.watts.max}
        unit="W"
        step={50}
        help={validationRules.watts.message}
        onValueChange={(value) => updateConfig('watts', value)}
      />
    </div>
  </div>

  <!-- Usage Section (Progressive Disclosure) -->
  <ProgressiveDisclosurePanel title="Usage & Environment" isExpanded={true} level={2}>
    <div class="space-y-4">
      <!-- Controller Amp Limit -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <label for="controller-input" class="label text-text-primary">
            Controller Amp Limit
          </label>
          <HelpTooltip
            content="Maximum current the controller can supply to motors. Leave blank for auto-detection."
          />
        </div>
        <input
          id="controller-input"
          type="number"
          value={calculatorState.config.controller ?? ''}
          min={validationRules.controller.min}
          max={validationRules.controller.max}
          oninput={handleOptionalControllerInput}
          placeholder="Auto"
          class="w-full bg-bg-tertiary border border-white/10 rounded-xl p-4 text-text-primary
            focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
            transition-all duration-fast"
          aria-label="Controller Amp Limit"
        />
      </div>

      <!-- Riding Style -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <label for="style-select" class="label text-text-primary">
            Riding Style
          </label>
          <HelpTooltip
            content="Your typical riding style affects energy consumption. Eco = lower consumption, Racing = higher."
          />
        </div>
        <select
          id="style-select"
          value={calculatorState.config.style}
          onchange={(e) => updateConfig('style', Number((e.currentTarget as HTMLSelectElement).value))}
          class="w-full bg-bg-tertiary border border-white/10 rounded-xl p-4 text-text-primary
            focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
            transition-all duration-fast appearance-none cursor-pointer"
          aria-label="Riding Style"
        >
          <option value={20}>Eco (20 Wh/km)</option>
          <option value={30}>Mixed (30 Wh/km)</option>
          <option value={45}>Aggressive (45 Wh/km)</option>
          <option value={60}>Racing (60 Wh/km)</option>
        </select>
      </div>

      <!-- Battery Health -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <label for="soh-input" class="label text-text-primary" id="soh-label">
            Battery Health: {sohValue}%
          </label>
          <HelpTooltip
            content="Battery State of Health (SoH) represents current capacity vs new. Lower health reduces range and power."
          />
        </div>
        <input
          id="soh-input"
          type="range"
          min={sohMin}
          max={sohMax}
          step="1"
          value={sohValue}
          oninput={(e) => updateConfig('soh', (e.currentTarget as HTMLInputElement).valueAsNumber / 100)}
          class="w-full h-12 appearance-none bg-transparent cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary
            rounded-xl"
          aria-labelledby="soh-label"
          aria-valuenow={sohValue}
          aria-valuemin={sohMin}
          aria-valuemax={sohMax}
        />
        <div class="flex justify-between text-xs text-text-tertiary mt-2">
          <span>Poor</span>
          <span>Good</span>
          <span>Excellent</span>
        </div>
      </div>

      <!-- Ambient Temperature -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <label for="temp-input" class="label text-text-primary" id="temp-label">
            Temperature: {calculatorState.config.ambientTemp}°C
          </label>
          <HelpTooltip
            content="Ambient temperature affects battery efficiency and performance. Cold weather reduces capacity."
          />
        </div>
        <input
          id="temp-input"
          type="range"
          min={validationRules.ambientTemp.min}
          max={validationRules.ambientTemp.max}
          step="1"
          value={calculatorState.config.ambientTemp}
          oninput={(e) => updateConfig('ambientTemp', (e.currentTarget as HTMLInputElement).valueAsNumber)}
          class="w-full h-12 appearance-none bg-transparent cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary
            rounded-xl"
          aria-labelledby="temp-label"
          aria-valuenow={calculatorState.config.ambientTemp}
          aria-valuemin={validationRules.ambientTemp.min}
          aria-valuemax={validationRules.ambientTemp.max}
        />
        <div class="flex justify-between text-xs text-text-tertiary mt-2">
          <span>-20°C</span>
          <span>25°C</span>
          <span>50°C</span>
        </div>
        <div class="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-text-secondary">
          <span class="font-semibold">Efficiency: {tempPercent}%</span>
          {#if tempPercent < 80}
            <span class="text-warning ml-2">⚠️ Cold weather reduces performance</span>
          {:else if tempPercent >= 95}
            <span class="text-success ml-2">✅ Optimal temperature</span>
          {:else}
            <span class="ml-2">Normal operating range</span>
          {/if}
        </div>
      </div>
    </div>
  </ProgressiveDisclosurePanel>
</div>
