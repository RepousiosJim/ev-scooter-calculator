<script lang="ts">
  import { fade } from 'svelte/transition';
  import { fly } from 'svelte/transition';
  import { applyConfig, calculatorState } from '$lib/stores/calculator.svelte';
  import { profilesStore, saveProfile, deleteProfile } from '$lib/stores/profiles.svelte';

  let showProfiles = $state(false);

  const profiles = $derived(profilesStore.profiles);

  function handleSave() {
    const name = prompt('Enter a name for this setup:');
    if (!name) return;
    saveProfile(name, calculatorState.config);
  }

  function handleDelete(id: number) {
    if (confirm('Delete this setup?')) {
      deleteProfile(id);
    }
  }
</script>

<!-- Profile Controls -->
<div class="flex justify-between items-center mb-5 gap-3 flex-wrap">
  <div class="flex gap-3">
    <button
      onclick={handleSave}
      class="bg-primary text-bgDark font-bold px-4 py-2 rounded-lg hover:opacity-90 transition"
    >
      💾 Save Setup
    </button>
    <button
      onclick={() => showProfiles = !showProfiles}
      class="bg-bgInput text-textMain px-4 py-2 rounded-lg hover:opacity-90 transition"
    >
      📂 My Setups ({profiles.length})
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
