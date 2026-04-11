<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { uiState } from '$lib/stores/ui.svelte';
  import type { Bottleneck } from '$lib/types';

  const bottlenecks = $derived(calculatorState.bottlenecks);
  const activeTab = $derived(uiState.activeTab);

  function scrollToUpgrades() {
    if (activeTab !== 'upgrades') {
      uiState.activeTab = 'upgrades';
      setTimeout(() => {
        const element = document.getElementById('upgrade-guidance');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  function getSeverityIcon(type: Bottleneck['type']) {
    switch (type) {
      case 'SAG_WARNING': return '🔴';
      case 'CONTROLLER_LIMIT': return '🟠';
      case 'GEAR_RATIO_LIMIT': return '🟠';
      case 'HILL_CLIMB_LIMIT': return '🟠';
      default: return '⚪';
    }
  }

  function getSeverityColor(type: Bottleneck['type']) {
    switch (type) {
      case 'SAG_WARNING': return '#dc2626';
      case 'CONTROLLER_LIMIT': return '#f59e0b';
      default: return '#f59e0b';
    }
  }

  function getUpgradeLabel(type: Bottleneck['upgrade']) {
    switch (type) {
      case 'parallel': return 'Add Parallel Battery';
      case 'voltage': return 'Voltage Boost';
      case 'controller': return 'Upgrade Controller';
      case 'motor': return 'Upgrade Motor';
      case 'tires': return 'Low-Rolling Tires';
      default: return 'View Upgrades';
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
      <span class="text-xs text-text-tertiary" aria-live="polite">{bottlenecks.length} {bottlenecks.length === 1 ? 'issue' : 'issues'}</span>
    </div>

    <ul class="space-y-3" aria-labelledby="bottleneck-heading" role="list">
      {#each bottlenecks as bn, index}
        <li
          class="border-2 rounded-lg p-4"
          style:border-color={getSeverityColor(bn.type)}
          role="listitem"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="text-2xl" aria-hidden="true">{getSeverityIcon(bn.type)}</span>
              <div class="flex-1">
                <div class="text-sm font-semibold text-text-primary">{bn.message}</div>
                <div class="text-xs text-text-tertiary mt-1">Recommended upgrade: <span class="text-primary font-medium">{getUpgradeLabel(bn.upgrade)}</span></div>
              </div>
            </div>
            <button
              type="button"
              onclick={scrollToUpgrades}
              class="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primaryDark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Fix issue: {bn.message}. Navigate to upgrades section."
            >
              Fix <span aria-hidden="true">→</span>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}
