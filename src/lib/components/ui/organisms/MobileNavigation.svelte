<script lang="ts">
  import { tick } from 'svelte';
  import { uiState } from '$lib/stores/ui.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

  const tabs = [
    { label: "Calculator", value: "configuration", icon: "speed" },
    { label: "Upgrades", value: "upgrades", icon: "upgrades" },
    { label: "Compare", value: "compare", icon: "scooter" },
  ] as const;

  let tabButtons = $state<HTMLElement[]>([]);

  async function handleKeydown(event: KeyboardEvent, index: number) {
    let targetIndex = -1;
    switch (event.key) {
      case 'ArrowRight': targetIndex = (index + 1) % tabs.length; break;
      case 'ArrowLeft': targetIndex = (index - 1 + tabs.length) % tabs.length; break;
      case 'Home': targetIndex = 0; break;
      case 'End': targetIndex = tabs.length - 1; break;
      default: return;
    }
    if (targetIndex !== -1) {
      uiState.activeTab = tabs[targetIndex].value as typeof uiState.activeTab;
      event.preventDefault();
      await tick();
      tabButtons[targetIndex]?.focus();
    }
  }
</script>

<nav
  class="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/90 backdrop-blur-xl border-t border-white/[0.08]"
  role="tablist"
  aria-label="Mobile navigation"
  style="padding-bottom: env(safe-area-inset-bottom, 0px)"
>
  <div class="flex items-stretch h-14">
    {#each tabs as tab, index (tab.value)}
      {@const isActive = uiState.activeTab === tab.value}
      <button
        bind:this={tabButtons[index]}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-controls={`${tab.value}-panel`}
        id={`mobile-${tab.value}-tab`}
        tabindex={isActive ? 0 : -1}
        class="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
          {isActive ? 'text-primary' : 'text-text-tertiary'}"
        onclick={() => uiState.activeTab = tab.value as typeof uiState.activeTab}
        onkeydown={(e) => handleKeydown(e, index)}
      >
        <!-- Active indicator line -->
        {#if isActive}
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary" aria-hidden="true"></div>
        {/if}

        <Icon
          name={tab.icon}
          size="sm"
          class="transition-all duration-200 {isActive ? 'text-primary scale-110' : 'opacity-40'}"
        />
        <span class="text-[10px] font-bold uppercase tracking-wider {isActive ? 'text-primary' : 'text-text-tertiary'}">
          {tab.label}
        </span>
      </button>
    {/each}
  </div>
</nav>

<style>
  @media (hover: none) and (pointer: coarse) {
    button {
      -webkit-tap-highlight-color: transparent;
      min-height: 44px;
      min-width: 44px;
    }

    button:active {
      opacity: 0.7;
    }
  }
</style>
