<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { onDestroy } from 'svelte';
  import { applyConfig, calculatorState, createShareLink } from '$lib/stores/calculator.svelte';
  import { profilesStore, saveProfile, deleteProfile, duplicateProfile, renameProfile } from '$lib/stores/profiles.svelte';
  import { exportConfiguration, importConfiguration } from '$lib/utils/configHandler';
  import ActionToolbar from '$lib/components/ui/ActionToolbar.svelte';
  import EditProfileModal from '$lib/components/ui/EditProfileModal.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

  let showProfiles = $state(false);
  let copyState = $state<'idle' | 'success' | 'error'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  let showSaveModal = $state(false);
  let showRenameModal = $state(false);
  let profileToRename = $state<number | null>(null);
  let showResetConfirm = $state(false);
  let showDeleteConfirm = $state(false);
  let profileToDelete = $state<number | null>(null);

  const profiles = $derived(profilesStore.profiles);

  onDestroy(() => {
    if (copyTimer) {
      clearTimeout(copyTimer);
      copyTimer = undefined;
    }
  });

  function handleSave() {
    showSaveModal = true;
  }

  function handleSaveProfile(name: string) {
    saveProfile(name, calculatorState.config);
  }

  function getProfileSummary(profile: typeof profiles[number]) {
    return `${profile.config.motors}x ${profile.config.watts}W | ${profile.config.v}V ${profile.config.ah}Ah`;
  }

  function handleShowProfiles() {
    showProfiles = !showProfiles;
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
    profileToDelete = id;
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    if (profileToDelete !== null) {
      deleteProfile(profileToDelete);
    }
    showDeleteConfirm = false;
    profileToDelete = null;
  }

  function handleRename(id: number) {
    profileToRename = id;
    showRenameModal = true;
  }

  function handleRenameProfile(newName: string) {
    if (profileToRename !== null) {
      renameProfile(profileToRename, newName);
    }
    profileToRename = null;
  }

  function handleExport() {
    exportConfiguration();
  }

  function handleImport() {
    importConfiguration();
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
<div class="mb-6">
  <ActionToolbar
    onSave={handleSave}
    onShowProfiles={handleShowProfiles}
    onExport={handleExport}
    onImport={handleImport}
    onShare={handleCopyShareLink}
    onReset={handleReset}
  />
</div>

<!-- Save Modal -->
<EditProfileModal
  bind:isOpen={showSaveModal}
  title="Save Setup"
  initialName=""
  onSave={handleSaveProfile}
/>

<!-- Rename Modal -->
{#if profileToRename !== null}
  {@const profile = profiles.find(p => p.id === profileToRename)}
  {#if profile}
    <EditProfileModal
      bind:isOpen={showRenameModal}
      title="Rename Setup"
      initialName={profile.name}
      onSave={handleRenameProfile}
    />
  {/if}
{/if}

<!-- Reset Confirm Dialog -->
<ConfirmDialog
  bind:isOpen={showResetConfirm}
  title="Reset Configuration"
  message="Are you sure you want to reset to default values? This cannot be undone."
  confirmLabel="Reset"
  isDanger={true}
  onConfirm={confirmReset}
  onCancel={() => showResetConfirm = false}
/>

<!-- Delete Confirm Dialog -->
<ConfirmDialog
  bind:isOpen={showDeleteConfirm}
  title="Delete Setup"
  message="Are you sure you want to delete this setup? This cannot be undone."
  confirmLabel="Delete"
  isDanger={true}
  onConfirm={confirmDelete}
  onCancel={() => showDeleteConfirm = false}
/>

 <!-- Profiles List -->
 {#if showProfiles}
   <div
     class="bg-bgCard rounded-xl p-4 sm:p-6 mb-6 border border-white/5 shadow-lg"
     transition:fly={{ y: -20, duration: 300 }}
   >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-semibold text-textMain">Saved Setups</h3>
      <span class="text-sm text-textMuted">{profiles.length} {profiles.length === 1 ? 'setup' : 'setups'}</span>
    </div>

    {#if profiles.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-textMuted">
        <div class="text-6xl mb-4 animate-float" aria-hidden="true">📂</div>
        <div class="text-lg font-medium text-textMain mb-2">No saved setups yet</div>
        <div class="text-sm mb-4">Save your current configuration to get started</div>
        <button
          type="button"
          onclick={handleSave}
          class="px-5 py-2.5 bg-gradient-main bg-[length:200%_200%] animate-gradient-shift text-white rounded-lg font-medium hover:shadow-glow-sm transition-all duration-300"
        >
          Save Current Setup
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {#each profiles as profile (profile.id)}
           <div
             class="bg-gradient-card p-3 sm:p-5 rounded-xl border border-white/5 hover:border-primary/30 transition-all duration-300 card-lift"
             transition:fade={{ duration: 200 }}
           >
            <div class="mb-4">
              <div class="font-bold text-textMain mb-1 truncate">{profile.name}</div>
              <div class="text-sm text-textMuted truncate" title={getProfileSummary(profile)}>
                {getProfileSummary(profile)}
              </div>
            </div>
            
            <div class="flex gap-2 flex-wrap">
              <button
                type="button"
                class="text-xs bg-primary text-bgDark px-3 py-1.5 rounded-lg hover:opacity-80 transition font-medium"
                onclick={() => applyConfig(profile.config)}
              >
                ⚡ Load
              </button>
              <button
                type="button"
                class="text-xs bg-bgInput text-textMain px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition"
                onclick={() => handleRename(profile.id)}
                title="Rename"
              >
                ✏️ Rename
              </button>
              <button
                type="button"
                class="text-xs bg-bgInput text-textMain px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition"
                onclick={() => duplicateProfile(profile.id)}
                title="Duplicate"
              >
                📋 Copy
              </button>
              <button
                type="button"
                class="text-xs bg-danger text-white px-3 py-1.5 rounded-lg hover:opacity-80 transition"
                onclick={() => handleDelete(profile.id)}
                title="Delete"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
