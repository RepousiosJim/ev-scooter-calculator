<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import type { FormulaTrace } from '$lib/types';

  const formulas = $derived(() => calculatorState.formulas);
  const showFormulas = $derived(() => calculatorState.showFormulas);

  const groupedFormulas = $derived(() => {
    const groups = {
      energy: formulas().filter((f: FormulaTrace) => f.category === 'energy'),
      speed: formulas().filter((f: FormulaTrace) => f.category === 'speed'),
      power: formulas().filter((f: FormulaTrace) => f.category === 'power'),
      range: formulas().filter((f: FormulaTrace) => f.category === 'range'),
      charging: formulas().filter((f: FormulaTrace) => f.category === 'charging'),
      cost: formulas().filter((f: FormulaTrace) => f.category === 'cost'),
      metrics: formulas().filter((f: FormulaTrace) => f.category === 'metrics')
    };
    return groups;
  });
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/10">
  {#if showFormulas()}
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-textMain">Formula Details</h2>
      <button 
        type="button"
        onclick={() => calculatorState.showFormulas = false}
        aria-label="Close formula details"
        class="text-textMuted hover:text-textMain"
      >
        Close
      </button>
    </div>
    
    <!-- Formula Categories as Sections -->
    {#each Object.entries(groupedFormulas()) as [category, formulaList]}
      {#if formulaList.length > 0}
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-textMain mb-3 capitalize border-b border-white/10 pb-2">{category}</h3>
          
          <div class="space-y-4">
            {#each formulaList as formula}
              <div class="bg-bgInput/50 rounded-lg p-4 border border-white/5">
                <!-- Formula Name & Equation -->
                <div class="mb-3">
                  <h4 class="text-sm font-semibold text-textMain mb-1">{formula.name}</h4>
                  <code class="bg-black/30 px-2 py-1 rounded text-primary text-sm block overflow-x-auto font-mono">
                    {formula.formula}
                  </code>
                </div>
                
                <!-- Inputs -->
                {#if formula.inputs.length > 0}
                  <div class="mb-2">
                    <div class="text-xs text-textMuted mb-1 font-semibold uppercase tracking-wider">Inputs</div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                      {#each formula.inputs as input}
                        <div class="flex justify-between text-sm">
                          <span class="text-textMuted">{input.name}</span>
                          <span class="font-mono text-textMain">{input.value.toFixed(2)} {input.unit}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
                
                <!-- Intermediates -->
                {#if formula.intermediates.length > 0}
                  <div class="mb-2">
                    <div class="text-xs text-textMuted mb-1 font-semibold uppercase tracking-wider">Calculations</div>
                    <div class="space-y-1">
                      {#each formula.intermediates as intermediate}
                        <div class="flex justify-between text-sm">
                          <span class="text-textMuted">{intermediate.name}</span>
                          <span class="font-mono text-textSecondary">{intermediate.value.toFixed(2)} {intermediate.unit}</span>
                        </div>
                        {#if intermediate.description}
                          <div class="text-xs text-textMuted/70 italic pl-2">{intermediate.description}</div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/if}
                
                <!-- Result -->
                <div class="mt-3 pt-3 border-t border-white/10">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-textMuted">{formula.result.label}</span>
                    <span class="text-lg font-bold text-primary">{formula.result.value.toFixed(2)} {formula.result.unit}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/if}
</div>
