<script lang="ts">
  let { tabs, activeTab = $bindable() }: {
    tabs: { label: string; value: string }[];
    activeTab: string;
  } = $props();

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowRight') {
      const nextIndex = (index + 1) % tabs.length;
      activeTab = tabs[nextIndex].value;
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      activeTab = tabs[prevIndex].value;
      event.preventDefault();
    }
  }
</script>

<nav class="flex items-center gap-2 p-1 bg-bgInput/40 rounded-full border border-white/5" role="tablist" aria-label="Main navigation">
  {#each tabs as tab, index (tab.value)}
    <button
      onclick={() => activeTab = tab.value}
      onkeydown={(e) => handleKeydown(e, index)}
      role="tab"
      aria-selected={activeTab === tab.value}
      aria-controls={`${tab.value}-panel`}
      id={`${tab.value}-tab`}
      class="relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200
        {activeTab === tab.value
          ? 'text-white bg-gradient-to-r from-primary to-secondary shadow-lg'
          : 'text-textMuted hover:text-textMain hover:bg-white/5'
        }"
    >
      {tab.label}
    </button>
  {/each}
</nav>
