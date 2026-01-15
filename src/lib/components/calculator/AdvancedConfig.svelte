<script lang="ts">
  import { calculatorState, updateConfig } from '$lib/stores/calculator.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import { validationRules } from '$lib/utils/validators';

  function handleOptionalInput(event: Event, key: string) {
    const target = event.currentTarget as HTMLInputElement;
    const nextValue = target.value === '' ? undefined : target.valueAsNumber;

    updateConfig(
      key as any,
      Number.isNaN(nextValue as number) ? undefined : nextValue
    );
  }

  function handleEfficiencyInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const nextValue = target.value === '' ? undefined : target.valueAsNumber;

    updateConfig(
      'drivetrainEfficiency' as any,
      (nextValue === undefined || Number.isNaN(nextValue)) ? undefined : nextValue / 100
    );
  }

  function handleSagInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const nextValue = target.value === '' ? undefined : target.valueAsNumber;

    updateConfig(
      'batterySagPercent' as any,
      (nextValue === undefined || Number.isNaN(nextValue)) ? undefined : nextValue / 100
    );
  }

  const efficiencyValue = $derived((calculatorState.config as any).drivetrainEfficiency !== undefined
    ? ((calculatorState.config as any).drivetrainEfficiency * 100).toFixed(1)
    : ''
  );

  const sagValue = $derived((calculatorState.config as any).batterySagPercent !== undefined
    ? ((calculatorState.config as any).batterySagPercent * 100).toFixed(1)
    : ''
  );
</script>

{#if calculatorState.showAdvanced}
  <div class="mt-5 pt-5 border-t border-gray-700">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <div class="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Rider & Terrain</div>
      </div>
       <div>
         <label for="weight-input" class="block text-sm text-textMuted mb-2" id="weight-label">Rider Weight (kg)</label>
         <div class="flex gap-2 items-center">
           <input
             id="weight-input"
             type="range"
             min={validationRules.weight.min}
             max={validationRules.weight.max}
             value={calculatorState.config.weight}
             oninput={(e) => updateConfig('weight', (e.currentTarget as HTMLInputElement).valueAsNumber)}
             class="flex-1"
             aria-labelledby="weight-label"
             aria-valuenow={calculatorState.config.weight}
             aria-valuemin={validationRules.weight.min}
             aria-valuemax={validationRules.weight.max}
           />
           <input
             type="number"
             min={validationRules.weight.min}
             max={validationRules.weight.max}
             value={calculatorState.config.weight}
             oninput={(e) => updateConfig('weight', (e.currentTarget as HTMLInputElement).valueAsNumber)}
             class="w-20 bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
             aria-labelledby="weight-label"
           />
         </div>
         <p class="text-xs text-textMuted mt-1" id="weight-help">Rider weight affects acceleration and range.</p>
       </div>

      <div>
        <NumberInput
          label="Max Slope"
          value={calculatorState.config.slope}
          min={validationRules.slope.min}
          max={validationRules.slope.max}
          unit="%"
          step={1}
          onValueChange={(value) => updateConfig('slope', value)}
        />
        <p class="text-xs text-textMuted mt-1">0% = flat, 10% = steep, 100% = vertical</p>
      </div>

       <div>
         <label for="position-select" class="block text-sm text-textMuted mb-2" id="position-label">Riding Position</label>
         <select
           id="position-select"
           value={calculatorState.config.ridePosition}
           onchange={(e) => updateConfig('ridePosition', Number((e.currentTarget as HTMLSelectElement).value))}
           class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
           aria-labelledby="position-label"
         >
           <option value={0.6}>Upright (High Drag)</option>
           <option value={0.4}>Sport Tuck</option>
         </select>
         <p class="text-xs text-textMuted mt-1" id="position-help">Aerodynamic drag affects top speed and range.</p>
       </div>

      <div class="col-span-2 pt-2 border-t border-gray-700/60">
        <div class="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Motor Details</div>
      </div>
      <div>
        <NumberInput
          label="Wheel Size"
          value={calculatorState.config.wheel}
          min={validationRules.wheel.min}
          max={validationRules.wheel.max}
          unit="in"
          step={0.5}
          help={validationRules.wheel.message}
          onValueChange={(value) => updateConfig('wheel', value)}
        />
      </div>

       <div>
         <label for="motorKv-input" class="block text-sm text-textMuted mb-2" id="motorKv-label">Motor KV (rpm/V)</label>
         <input
           id="motorKv-input"
           type="number"
           value={(calculatorState.config as any).motorKv ?? ''}
           min={validationRules.motorKv?.min ?? 20}
           max={validationRules.motorKv?.max ?? 200}
           oninput={(e) => handleOptionalInput(e, 'motorKv')}
           placeholder="Auto calc"
           class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
           aria-labelledby="motorKv-label"
         />
         <p class="text-xs text-textMuted mt-1" id="motorKv-help">KV rating for precise speed calculation.</p>
       </div>

      <div>
        <NumberInput
          label="Scooter Weight"
          value={(calculatorState.config as any).scooterWeight}
          min={validationRules.scooterWeight?.min ?? 5}
          max={validationRules.scooterWeight?.max ?? 100}
          unit="kg"
          step={1}
          onValueChange={(value) => updateConfig('scooterWeight' as any, value)}
        />
        <p class="text-xs text-textMuted mt-1">Empty scooter weight (overrides derived).</p>
      </div>

       <div>
         <label for="drivetrainEfficiency-input" class="block text-sm text-textMuted mb-2" id="drivetrain-label">Drivetrain Efficiency (%)</label>
         <input
           id="drivetrainEfficiency-input"
           type="number"
           value={efficiencyValue}
           min={validationRules.drivetrainEfficiency?.min ? validationRules.drivetrainEfficiency.min * 100 : 60}
           max={validationRules.drivetrainEfficiency?.max ? validationRules.drivetrainEfficiency.max * 100 : 95}
           step="0.1"
           oninput={handleEfficiencyInput}
           placeholder="Default: 90%"
           class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
           aria-labelledby="drivetrain-label"
         />
         <p class="text-xs text-textMuted mt-1" id="drivetrain-help">Efficiency from motor to wheel (0-100%).</p>
       </div>

       <div>
         <label for="batterySagPercent-input" class="block text-sm text-textMuted mb-2" id="sag-label">Battery Sag (%)</label>
         <input
           id="batterySagPercent-input"
           type="number"
           value={sagValue}
           min={validationRules.batterySagPercent?.min ? validationRules.batterySagPercent.min * 100 : 0}
           max={validationRules.batterySagPercent?.max ? validationRules.batterySagPercent.max * 100 : 30}
           step="0.1"
           oninput={handleSagInput}
           placeholder="Default: 8%"
           class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
           aria-labelledby="sag-label"
         />
         <p class="text-xs text-textMuted mt-1" id="sag-help">Voltage drop at peak draw (0-30%).</p>
       </div>
      <div>
        <NumberInput
          label="Wheel Size"
          value={calculatorState.config.wheel}
          min={validationRules.wheel.min}
          max={validationRules.wheel.max}
          unit="in"
          step={0.5}
          help={validationRules.wheel.message}
          onValueChange={(value) => updateConfig('wheel', value)}
        />
      </div>

      <div class="col-span-2 pt-2 border-t border-gray-700/60">
        <div class="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Energy & Costs</div>
      </div>
      <div>
        <NumberInput
          label="Charger Amps"
          value={calculatorState.config.charger}
          min={validationRules.charger.min}
          max={validationRules.charger.max}
          unit="A"
          step={0.5}
          onValueChange={(value) => updateConfig('charger', value)}
        />
        <p class="text-xs text-textMuted mt-1">Used to estimate charge time.</p>
      </div>

       <div>
         <label for="regen-input" class="block text-sm text-textMuted mb-2" id="regen-label">Regen Efficiency (%)</label>
         <input
           id="regen-input"
           type="number"
           min={validationRules.regen.min ? validationRules.regen.min * 100 : 0}
           max={validationRules.regen.max ? validationRules.regen.max * 100 : 100}
           step="0.1"
           value={Number((calculatorState.config.regen * 100).toFixed(2))}
           oninput={(e) => updateConfig('regen', (e.currentTarget as HTMLInputElement).valueAsNumber / 100)}
           class="w-full bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
           aria-labelledby="regen-label"
         />
         <p class="text-xs text-textMuted mt-1" id="regen-help">Energy recovered when braking.</p>
       </div>

      <div>
        <NumberInput
          label="Electricity Cost"
          value={calculatorState.config.cost}
          min={validationRules.cost.min}
          unit="$/kWh"
          step={0.01}
          onValueChange={(value) => updateConfig('cost', value)}
        />
        <p class="text-xs text-textMuted mt-1">Used to estimate cost per 100 km.</p>
      </div>
    </div>
  </div>
{/if}
