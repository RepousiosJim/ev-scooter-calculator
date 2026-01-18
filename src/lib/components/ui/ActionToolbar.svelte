<script lang="ts">
  import { scale } from 'svelte/transition';
  import { onMount } from 'svelte';
  import ActionDropdown from './ActionDropdown.svelte';
  import { keyboardShortcut } from '$lib/utils/keyboardShortcuts';

  let {
    onSave,
    onShowProfiles,
    onExport,
    onImport,
    onShare,
    onReset
  }: {
    onSave: () => void;
    onShowProfiles: () => void;
    onExport: () => void;
    onImport: () => void;
    onShare: () => void;
    onReset: () => void;
  } = $props();

  let isDropdownOpen = $state(false);
  let isExpanded = $state(false);

  onMount(() => {
    return keyboardShortcut(['s'], (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleSave();
      }
    }, 'Ctrl/Cmd + S: Save setup');
  });

  const actionGroups = $derived([
    {
      title: 'Profiles',
      actions: [
        {
          id: 'save',
          label: 'Save Setup',
          icon: '💾',
          onClick: handleSave
        },
        {
          id: 'profiles',
          label: 'My Setups',
          icon: '📂',
          onClick: onShowProfiles
        }
      ]
    },
    {
      title: 'Files',
      actions: [
        {
          id: 'export',
          label: 'Export',
          icon: '📤',
          onClick: onExport
        },
        {
          id: 'import',
          label: 'Import',
          icon: '📥',
          onClick: onImport
        }
      ]
    },
    {
      title: 'Share',
      actions: [
        {
          id: 'share',
          label: 'Copy Link',
          icon: '🔗',
          onClick: onShare
        }
      ]
    },
    {
      title: 'System',
      actions: [
        {
          id: 'reset',
          label: 'Reset',
          icon: '↻',
          onClick: onReset
        }
      ]
    }
  ]);

  function handleSave() {
    onSave();
  }
</script>

<div class="flex items-center gap-3">
  <button
    type="button"
    onclick={handleSave}
    class="flex items-center gap-2 bg-gradient-main bg-[length:200%_200%] animate-gradient-shift text-white font-semibold px-4 py-3 sm:px-5 sm:py-2.5 rounded-lg shadow-lg hover:shadow-glow-sm transition-all duration-300 hover:scale-105"
    aria-label="Save setup"
  >
    <span class="text-lg">💾</span>
    <span>Save Setup</span>
  </button>

  <ActionDropdown isOpen={isDropdownOpen} groups={actionGroups} onOpenChange={(open) => isDropdownOpen = open}>
    {#snippet trigger()}
      <div
        class="flex items-center gap-1.5 sm:gap-2 bg-bgInput text-textMain px-4 py-3 sm:px-4 sm:py-2.5 rounded-lg border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300"
      >
        <span class="text-sm sm:text-base">More</span>
        <span
          class="text-xs sm:text-sm transition-transform duration-300"
          style:transform={isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          aria-hidden="true"
        >
          ▼
        </span>
      </div>
    {/snippet}
  </ActionDropdown>
</div>
