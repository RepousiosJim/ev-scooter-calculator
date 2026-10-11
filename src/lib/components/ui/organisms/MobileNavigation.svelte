<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { uiState } from '$lib/stores/ui.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

  const isRankings = $derived($page.url.pathname.startsWith('/rankings'));
  const isGuides = $derived($page.url.pathname.startsWith('/guides'));
  // The calculator sections only exist on the home page; elsewhere they navigate there.
  const isHome = $derived($page.url.pathname === '/');

  const tabs = [
    { label: 'Calculator', value: 'configuration', icon: 'speed' },
    { label: 'Upgrades', value: 'upgrades', icon: 'upgrades' },
    { label: 'Compare', value: 'compare', icon: 'scooter' },
  ] as const;

  function selectTab(value: (typeof tabs)[number]['value']) {
    uiState.activeTab = value as typeof uiState.activeTab;
    if (!isHome) goto('/');
  }
</script>

<!-- Site navigation (it mixes section switches and page links, so it is not a tablist). -->
<nav
  class="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-xl border-t border-white/[0.08]"
  aria-label="Mobile navigation"
  style="padding-bottom: env(safe-area-inset-bottom, 0px)"
>
  <div class="flex items-stretch h-[3.75rem]">
    {#each tabs as tab (tab.value)}
      {@const isActive = uiState.activeTab === tab.value && isHome}
      <button
        type="button"
        aria-current={isActive ? 'true' : undefined}
        id={`mobile-${tab.value}-tab`}
        class="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        onclick={() => selectTab(tab.value)}
      >
        <!-- Active indicator -->
        {#if isActive}
          <div class="absolute top-0 inset-x-3 h-0.5 bg-primary rounded-b-full" aria-hidden="true"></div>
        {/if}

        <Icon
          name={tab.icon}
          size="sm"
          class="transition-all duration-200 {isActive ? 'text-primary' : 'text-text-tertiary opacity-50'}"
        />
        <span class="text-[10px] font-bold uppercase tracking-wider {isActive ? 'text-primary' : 'text-text-tertiary'}">
          {tab.label}
        </span>
      </button>
    {/each}

    <!-- Rankings link (separate page) -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a
      href="/rankings"
      aria-current={isRankings ? 'page' : undefined}
      class="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      {#if isRankings}
        <div class="absolute top-0 inset-x-3 h-0.5 bg-primary rounded-b-full" aria-hidden="true"></div>
      {/if}
      <Icon
        name="trophy"
        size="sm"
        class="transition-all duration-200 {isRankings ? 'text-primary' : 'text-text-tertiary opacity-50'}"
      />
      <span class="text-[10px] font-bold uppercase tracking-wider {isRankings ? 'text-primary' : 'text-text-tertiary'}">
        Rankings
      </span>
    </a>

    <!-- Guides link -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a
      href="/guides"
      aria-current={isGuides ? 'page' : undefined}
      class="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      {#if isGuides}
        <div class="absolute top-0 inset-x-3 h-0.5 bg-primary rounded-b-full" aria-hidden="true"></div>
      {/if}
      <Icon
        name="book"
        size="sm"
        class="transition-all duration-200 {isGuides ? 'text-primary' : 'text-text-tertiary opacity-50'}"
      />
      <span class="text-[10px] font-bold uppercase tracking-wider {isGuides ? 'text-primary' : 'text-text-tertiary'}">
        Guides
      </span>
    </a>
  </div>
</nav>

<style>
  @media (hover: none) and (pointer: coarse) {
    button,
    a {
      -webkit-tap-highlight-color: transparent;
      min-height: 44px;
      min-width: 44px;
    }

    button:active,
    a:active {
      opacity: 0.7;
    }
  }

  a {
    text-decoration: none;
  }
</style>
