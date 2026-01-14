<script lang="ts">
  let { tabs, activeTab = $bindable() }: {
    tabs: { label: string; value: string }[];
    activeTab: string;
  } = $props();
</script>

<div class="flex items-center gap-2 p-1 bg-bgInput/40 rounded-full border border-white/5">
  {#each tabs as tab}
    <button
      onclick={() => activeTab = tab.value}
      class="relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200
        {activeTab === tab.value
          ? 'text-white bg-gradient-to-r from-primary to-secondary shadow-lg'
          : 'text-textMuted hover:text-textMain hover:bg-white/5'
        }"
    >
      {tab.label}
    </button>
  {/each}
</div>
