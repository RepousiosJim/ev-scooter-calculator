<script lang="ts">
  import BottomSheet from './BottomSheet.svelte';

  type ActionGroup = {
    title: string;
    actions: ActionItem[];
  };

  type ActionItem = {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
  };

  let {
    isOpen = $bindable(),
    groups = [],
    trigger,
    onOpenChange
  }: {
    isOpen: boolean;
    groups: ActionGroup[];
    trigger: import('svelte').Snippet;
    onOpenChange?: (open: boolean) => void;
  } = $props();

  function handleOpenChange(newOpen: boolean) {
    isOpen = newOpen;
  }

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function closeDropdown() {
    isOpen = false;
  }

  function handleActionClick(action: ActionItem) {
    if (action.disabled) return;
    action.onClick();
    closeDropdown();
  }
</script>

<div class="relative">
  <button
    type="button"
    onclick={toggleDropdown}
    class="w-full"
    aria-haspopup="true"
    aria-expanded={isOpen}
  >
    {@render trigger()}
  </button>
</div>

<BottomSheet bind:isOpen title="Actions" onClose={closeDropdown} height="auto" onOpenChange={handleOpenChange}>
  <div class="space-y-4 pb-4">
    {#each groups as group, groupIndex}
      <div class="space-y-2">
        <div class="text-xs font-semibold text-textMuted uppercase tracking-wider px-2">
          {group.title}
        </div>
        <div class="space-y-2">
          {#each group.actions as action}
            <button
              type="button"
              onclick={() => handleActionClick(action)}
              disabled={action.disabled}
              class="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left
                {action.disabled ? 'opacity-40 cursor-not-allowed bg-bgInput' : 'bg-bgDark hover:bg-white/5 text-textMain hover:text-white transition-colors active:scale-98'}
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset border border-white/5"
              aria-label={action.label}
            >
              <span class="text-2xl" aria-hidden="true">{action.icon}</span>
              <span class="text-base font-medium flex-1">{action.label}</span>
              {#if action.disabled}
                <span class="text-xs text-textMuted bg-white/5 px-2 py-1 rounded">Disabled</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      {#if groupIndex < groups.length - 1}
        <div class="h-px bg-white/10"></div>
      {/if}
    {/each}
  </div>
</BottomSheet>
