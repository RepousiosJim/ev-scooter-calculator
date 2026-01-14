<script lang="ts">
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import { validationRules } from '$lib/utils/validators';

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
</script>

<div class="mb-6">
  <div class="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Core Specs</div>
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
      unit="x"
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

<div class="pt-4 border-t border-gray-700/60">
  <div class="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Usage</div>
  <label for="controller-input" class="block text-sm text-textMuted mb-2">Controller Amp Limit</label>
  <input
    id="controller-input"
    type="number"
    value={calculatorState.config.controller ?? ''}
    min={validationRules.controller.min}
    max={validationRules.controller.max}
    oninput={handleOptionalControllerInput}
    placeholder="Auto"
    class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
  />
  <p class="text-xs text-textMuted mt-1 mb-4">Leave blank to use the estimated controller limit.</p>

  <div class="mb-4">
    <label for="style-select" class="block text-sm text-textMuted mb-2">Riding Style (Consumption)</label>
    <select
      id="style-select"
      value={calculatorState.config.style}
      onchange={(e) => updateConfig('style', Number((e.currentTarget as HTMLSelectElement).value))}
      class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
    >
      <option value={20}>Eco (20 Wh/km)</option>
      <option value={30}>Mixed (30 Wh/km)</option>
      <option value={45}>Aggressive (45 Wh/km)</option>
      <option value={60}>Racing (60 Wh/km)</option>
    </select>
    <p class="text-xs text-textMuted mt-1">Used to estimate range based on consumption.</p>
  </div>

  <div class="mb-4">
    <label for="soh-input" class="block text-sm text-textMuted mb-2">
      Battery Health: {Math.round(calculatorState.config.soh * 100)}%
    </label>
    <input
      id="soh-input"
      type="range"
      min={sohMin}
      max={sohMax}
      step="1"
      value={Math.round(calculatorState.config.soh * 100)}
      oninput={(e) => updateConfig('soh', (e.currentTarget as HTMLInputElement).valueAsNumber / 100)}
      class="w-full"
      aria-label="Battery Health"
    />
    <p class="text-xs text-textMuted mt-1">Lower health reduces usable capacity and range.</p>
  </div>
</div>
