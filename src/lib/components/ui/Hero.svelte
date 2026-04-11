<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/stores';
  import { uiState } from '$lib/stores/ui.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';

  const calcTabs = [
    { label: "Calculator", value: "configuration", icon: "speed" },
    { label: "Upgrades", value: "upgrades", icon: "upgrades" },
    { label: "Compare", value: "compare", icon: "scooter" },
  ] as const;

  const isRankings = $derived($page.url.pathname.startsWith('/rankings'));

  let tabRefs = $state<HTMLElement[]>([]);
  let indicatorStyle = $state("left:0;width:0");

  function updateIndicator() {
    if (isRankings) { indicatorStyle = "left:0;width:0"; return; }
    const idx = calcTabs.findIndex(t => t.value === uiState.activeTab);
    const el = tabRefs[idx];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    indicatorStyle = `left:${elRect.left - parentRect.left}px;width:${elRect.width}px`;
  }

  $effect(() => {
    const _ = uiState.activeTab;
    const __ = isRankings;
    tick().then(updateIndicator);
  });

  async function selectTab(value: string, index: number) {
    uiState.activeTab = value as typeof uiState.activeTab;
    await tick();
    updateIndicator();
  }

  async function handleKeydown(event: KeyboardEvent, index: number) {
    let targetIndex = -1;
    switch (event.key) {
      case 'ArrowRight': targetIndex = (index + 1) % calcTabs.length; break;
      case 'ArrowLeft': targetIndex = (index - 1 + calcTabs.length) % calcTabs.length; break;
      case 'Home': targetIndex = 0; break;
      case 'End': targetIndex = calcTabs.length - 1; break;
      default: return;
    }
    if (targetIndex !== -1) {
      event.preventDefault();
      await selectTab(calcTabs[targetIndex].value, targetIndex);
      tabRefs[targetIndex]?.focus();
    }
  }
</script>

<svelte:window onresize={updateIndicator} />

<header
  class="sticky top-0 z-50 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl"
>
  <div class="max-w-7xl mx-auto px-3 sm:px-4">
    <div class="h-14 lg:h-16 flex items-center justify-between gap-4">
      <!-- Brand -->
      <a href="/" class="flex items-center gap-3 group shrink-0">
        <div class="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon name="acceleration" size="sm" class="text-primary" />
        </div>
        <div class="hidden sm:block">
          <p class="text-[9px] font-bold text-primary/60 uppercase tracking-[0.3em] leading-none">
            Scooter Performance Studio
          </p>
          <h1 class="text-sm font-black text-text-primary tracking-tight leading-tight group-hover:text-primary/90 transition-colors">
            EV Scooter Pro Calculator
          </h1>
        </div>
        <h1 class="sm:hidden text-sm font-black text-text-primary tracking-tight">
          EV Scooter Pro
        </h1>
      </a>

      <!-- Desktop Nav: Calculator tabs + Rankings link -->
      <nav class="hidden lg:flex items-center gap-1" aria-label="Main navigation">
        <!-- Calculator tabs (segmented control) -->
        <div class="relative flex items-center bg-white/[0.04] border border-white/[0.06] p-1" role="tablist" aria-label="Calculator tabs">
          <!-- Sliding indicator -->
          <div
            class="absolute top-1 bottom-1 bg-primary/15 border border-primary/25 transition-all duration-300 ease-out pointer-events-none"
            style={indicatorStyle}
            aria-hidden="true"
          ></div>

          {#each calcTabs as tab, index (tab.value)}
            {#if isRankings}
              <a
                href="/"
                onclick={() => { uiState.activeTab = tab.value as typeof uiState.activeTab; }}
                class="relative z-10 flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-text-tertiary hover:text-text-secondary transition-colors duration-200"
              >
                <Icon name={tab.icon} size="sm" class="opacity-50" />
                {tab.label}
              </a>
            {:else}
              <button
                bind:this={tabRefs[index]}
                type="button"
                role="tab"
                aria-selected={uiState.activeTab === tab.value}
                aria-controls={`${tab.value}-panel`}
                id={`${tab.value}-tab`}
                tabindex={uiState.activeTab === tab.value ? 0 : -1}
                onclick={() => selectTab(tab.value, index)}
                onkeydown={(e) => handleKeydown(e, index)}
                class="relative z-10 flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                  {uiState.activeTab === tab.value
                    ? 'text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                  }"
              >
                <Icon name={tab.icon} size="sm" class={uiState.activeTab === tab.value ? 'text-primary' : 'opacity-50'} />
                {tab.label}
              </button>
            {/if}
          {/each}
        </div>

        <!-- Divider -->
        <div class="w-px h-6 bg-white/[0.08] mx-2" aria-hidden="true"></div>

        <!-- Rankings link -->
        <a
          href="/rankings"
          class="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-all duration-200
            {isRankings
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-text-tertiary hover:text-text-secondary border border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]'
            }"
        >
          <Icon name="star" size="sm" class={isRankings ? 'text-primary' : 'opacity-50'} />
          Rankings
        </a>
      </nav>

      <!-- Mobile: just the Rankings link (tabs are in bottom bar) -->
      <nav class="lg:hidden flex items-center shrink-0">
        <a
          href={isRankings ? '/' : '/rankings'}
          class="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all border
            {isRankings
              ? 'text-text-secondary border-white/[0.06] bg-white/[0.03]'
              : 'text-text-tertiary border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]'
            }"
        >
          {#if isRankings}
            <Icon name="speed" size="xs" class="opacity-60" />
            Calculator
          {:else}
            <Icon name="star" size="xs" class="opacity-50" />
            Rankings
          {/if}
        </a>
      </nav>
    </div>
  </div>
</header>
