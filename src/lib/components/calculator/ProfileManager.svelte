<script lang="ts">
  import { fade } from 'svelte/transition';
  import { fly } from 'svelte/transition';
  import { applyConfig, calculatorState, createShareLink } from '$lib/stores/calculator.svelte';
  import { profilesStore, saveProfile, deleteProfile } from '$lib/stores/profiles.svelte';
  import { exportConfiguration, importConfiguration } from '$lib/utils/configHandler';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

  let showImportConfirm = $state(false);
  let showResetConfirm = $state(false);

  let showProfiles = $state(false);
  let copyState = $state<'idle' | 'success' | 'error'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const profiles = $derived(profilesStore.profiles);
  const shareLabel = $derived(() => {
    if (copyState === 'success') return 'Link Copied';
    if (copyState === 'error') return 'Copy Failed';
    return 'Copy Share Link';
  });

  function handleSave() {
    const name = prompt('Enter a name for this setup:');
    if (!name) return;
    saveProfile(name, calculatorState.config);
  }

  async function handleCopyShareLink() {
    const shareLink = createShareLink(calculatorState.config);
    if (!shareLink || typeof navigator === 'undefined') {
      copyState = 'error';
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      copyState = 'success';
    } catch (error) {
      copyState = 'error';
    }

    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyState = 'idle';
    }, 2000);
  }

  function handleDelete(id: number) {
    if (confirm('Delete this setup?')) {
      deleteProfile(id);
    }
  }

  function handleExport() {
    exportConfiguration();
  }

  function handleImport() {
    showImportConfirm = true;
  }

  async function confirmImport() {
    await importConfiguration();
    showImportConfirm = false;
  }

  function handleReset() {
    showResetConfirm = true;
  }

  function confirmReset() {
    applyConfig({});

    showResetConfirm = false;
  }
</script>

  <!-- Profile Controls -->
  <div class="flex justify-between items-center mb-5 gap-3 flex-wrap">
    <div class="flex gap-3">
      <button
        onclick={handleSave}
        class="bg-primary text-bgDark font-bold px-4 py-2 rounded-lg hover:opacity-90 transition"
        aria-label="Save current configuration"
      >
        💾 Save Setup
      </button>
      <button
        onclick={() => showProfiles = !showProfiles}
        class="bg-bgInput text-textMain px-4 py-2 rounded-lg hover:opacity-90 transition"
        aria-label="View saved profiles"
      >
        📂 My Setups ({profiles.length})
      </button>
      <button
        onclick={handleExport}
        class="bg-bgInput text-textMain px-4 py-2 rounded-lg hover:opacity-90 transition"
        aria-label="Export configuration to file"
      >
        📥 Export
      </button>
      <button
        onclick={handleImport}
        class="bg-bgInput text-textMain px-4 py-2 rounded-lg hover:opacity-90 transition"
        aria-label="Import configuration from file"
      >
        📥 Import
      </button>
      <button
        onclick={handleCopyShareLink}
        class={`bg-bgInput text-textMain px-4 py-2 rounded-lg transition ${copyState === 'error'
          ? 'border border-danger text-danger'
          : 'hover:opacity-90'}`}
        aria-label="Copy share link"
      >
        🔗 {shareLabel()}
      </button>
      <button
        onclick={handleReset}
        class="bg-bgInput text-textMain px-4 py-2 rounded-lg hover:opacity-90 transition"
        aria-label="Reset to default"
      >
        ↻ Reset
      </button>
    </div>
  </div>

<!-- Profiles List -->
{#if showProfiles}
  <div
    class="bg-bgCard rounded-xl p-5 mb-5"
    transition:fly={{ y: -20, duration: 300 }}
  >
    <h3 class="text-xl font-semibold mb-4 text-textMain">Saved Profiles</h3>

    {#if profiles.length === 0}
      <p class="text-textMuted text-center py-8">No saved profiles yet</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
        {#each profiles as profile (profile.id)}
          <div
            class="bg-bgInput p-4 rounded-lg border border-transparent hover:border-primary transition cursor-pointer"
            transition:fade={{ duration: 200 }}
          >
            <div class="font-bold text-textMain mb-1">{profile.name}</div>
            <div class="text-sm text-textMuted mb-3">
              {profile.config.motors}x {profile.config.watts}W | {profile.config.v}V {profile.config.ah}Ah
            </div>
            <div class="flex gap-2 justify-end">
              <button
                class="text-xs bg-primary text-bgDark px-2 py-1 rounded hover:opacity-80"
                onclick={() => applyConfig(profile.config)}
              >
                Load
              </button>
              <button
                class="text-xs bg-secondary text-white px-2 py-1 rounded hover:opacity-80"
              >
                Compare
              </button>
              <button
                class="text-xs bg-danger text-white px-2 py-1 rounded hover:opacity-80"
                onclick={() => handleDelete(profile.id)}
              >
                Del
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
