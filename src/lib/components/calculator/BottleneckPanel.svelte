<script lang="ts">
  import { calculatorState, simulateUpgrade } from '$lib/stores/calculator.svelte';
  import { setActiveTab } from '$lib/stores/ui.svelte';
  import type { Bottleneck } from '$lib/types';

  const bottlenecks = $derived(calculatorState.bottlenecks);

  function fixBottleneck(upgrade: Bottleneck['upgrade']) {
    // Switch to upgrades tab and auto-simulate the relevant upgrade
    setActiveTab('upgrades');
    simulateUpgrade(upgrade);
    setTimeout(() => {
      const element = document.getElementById('upgrade-comparison-results');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  function getSeverityStyle(type: Bottleneck['type']): { dot: string; border: string } {
    switch (type) {
      case 'SAG_WARNING':
        return { dot: 'bg-red-500', border: '#dc2626' };
      case 'CONTROLLER_LIMIT':
        return { dot: 'bg-orange-500', border: '#f59e0b' };
      case 'GEAR_RATIO_LIMIT':
        return { dot: 'bg-orange-500', border: '#f59e0b' };
      case 'HILL_CLIMB_LIMIT':
        return { dot: 'bg-orange-500', border: '#f59e0b' };
      default:
        return { dot: 'bg-slate-400', border: '#f59e0b' };
    }
  }

  function getUpgradeLabel(type: Bottleneck['upgrade']) {
    switch (type) {
      case 'parallel':
        return 'Add Parallel Battery';
      case 'voltage':
        return 'Voltage Boost';
      case 'controller':
        return 'Upgrade Controller';
      case 'motor':
        return 'Upgrade Motor';
      case 'tires':
        return 'Low-Rolling Tires';
      default:
        return 'View Upgrades';
    }
  }
</script>

{#if bottlenecks.length > 0}
  <div
    class="bg-black/20 rounded-xl p-5 border border-white/5"
    role="region"
    aria-label="System issues and bottlenecks"
    aria-live="polite"
    aria-atomic="false"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-text-primary" id="bottleneck-heading">Issues Detected</h3>
      <span class="text-xs text-text-tertiary" aria-live="polite"
        >{bottlenecks.length} {bottlenecks.length === 1 ? 'issue' : 'issues'}</span
      >
    </div>

    <ul class="space-y-3" aria-labelledby="bottleneck-heading" role="list">
      {#each bottlenecks as bn, _index}
        {@const style = getSeverityStyle(bn.type)}
        <li class="border-2 rounded-lg p-4" style:border-color={style.border} role="listitem">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="inline-block w-2.5 h-2.5 rounded-full {style.dot}" aria-hidden="true"></span>
              <div class="flex-1">
                <div class="text-sm font-semibold text-text-primary">{bn.message}</div>
                <div class="text-xs text-text-tertiary mt-1">
                  Recommended upgrade: <span class="text-primary font-medium">{getUpgradeLabel(bn.upgrade)}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onclick={() => fixBottleneck(bn.upgrade)}
              class="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primaryDark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Fix issue: {bn.message}. Simulate {getUpgradeLabel(bn.upgrade)} upgrade."
            >
              Fix <span aria-hidden="true">→</span>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}
