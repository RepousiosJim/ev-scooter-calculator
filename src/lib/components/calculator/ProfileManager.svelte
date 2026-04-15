<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { Save, Trash2, Pencil, FolderOpen, Check, X, ChevronDown, User, Star } from 'lucide-svelte';
  import {
    profilesState,
    saveProfile,
    updateProfile,
    deleteProfile,
    renameProfile,
    setActiveProfile,
    loadProfiles,
    toggleFavorite,
    type SavedProfile,
  } from '$lib/stores/profiles.svelte';
  import { calculatorState, applyConfig } from '$lib/stores/calculator.svelte';
  import { showToast } from '$lib/stores/toast.svelte';

  let showSaveForm = $state(false);
  let saveInputValue = $state('');
  let saveInputEl: HTMLInputElement | undefined = $state(undefined);
  let listExpanded = $state(false);
  let renameMap = $state<Record<string, string>>({});
  let openMenuId = $state<string | null>(null);
  let pendingDeleteId = $state<string | null>(null);

  const activeProfile = $derived(
    profilesState.activeProfileId
      ? (profilesState.profiles.find((p) => p.id === profilesState.activeProfileId) ?? null)
      : null
  );

  const activeProfileDirty = $derived.by(() => {
    if (!activeProfile) return false;
    return JSON.stringify(activeProfile.config) !== JSON.stringify(calculatorState.config);
  });

  const defaultSaveName = $derived(`${calculatorState.activePresetName} — ${formatDateShort(new Date())}`);

  const favoriteCount = $derived(profilesState.profiles.filter((p) => p.isFavorite).length);

  const sortedProfiles = $derived(
    [...profilesState.profiles].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    })
  );

  onMount(() => {
    loadProfiles();
  });

  $effect(() => {
    if (profilesState.profiles.length > 0) {
      listExpanded = true;
    }
  });

  $effect(() => {
    if (showSaveForm && saveInputEl) {
      // Use a microtask so the element is rendered first
      Promise.resolve().then(() => saveInputEl?.focus());
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function formatDateShort(date: Date): string {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatDateFull(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function presetLabel(key: string): string {
    if (key === 'custom') return 'Custom';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  function openSaveForm() {
    saveInputValue = defaultSaveName;
    showSaveForm = true;
  }

  function closeSaveForm() {
    showSaveForm = false;
    saveInputValue = '';
  }

  function handleSave() {
    const name = saveInputValue.trim();
    if (!name) {
      showToast('Please enter a profile name.', 'warning');
      return;
    }
    const profile = saveProfile(name, calculatorState.config, calculatorState.activePresetKey);
    if (profile) {
      setActiveProfile(profile.id);
      closeSaveForm();
    }
  }

  function handleSaveKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') closeSaveForm();
  }

  function handleLoad(profile: SavedProfile) {
    applyConfig(profile.config);
    calculatorState.activePresetKey = profile.presetKey;
    setActiveProfile(profile.id);
    openMenuId = null;
    pendingDeleteId = null;
    showToast(`Profile "${profile.name}" loaded.`, 'success');
  }

  function handleUpdate() {
    if (!profilesState.activeProfileId) return;
    updateProfile(profilesState.activeProfileId, calculatorState.config, calculatorState.activePresetKey);
    showToast('Profile updated.', 'success');
  }

  function startRename(profile: SavedProfile) {
    renameMap = { ...renameMap, [profile.id]: profile.name };
    openMenuId = null;
  }

  function commitRename(id: string) {
    const draft = (renameMap[id] ?? '').trim();
    if (draft) renameProfile(id, draft);
    const next = { ...renameMap };
    delete next[id];
    renameMap = next;
  }

  function cancelRename(id: string) {
    const next = { ...renameMap };
    delete next[id];
    renameMap = next;
  }

  function handleRenameKeydown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitRename(id);
    if (e.key === 'Escape') cancelRename(id);
  }

  function requestDelete(id: string) {
    pendingDeleteId = id;
    openMenuId = null;
  }

  function confirmDelete(id: string) {
    if (id === profilesState.activeProfileId) setActiveProfile(null);
    deleteProfile(id);
    pendingDeleteId = null;
  }

  function cancelDelete() {
    pendingDeleteId = null;
  }

  function toggleMenu(id: string) {
    openMenuId = openMenuId === id ? null : id;
    pendingDeleteId = null;
  }
</script>

<!-- ── Root ─────────────────────────────────────────────────────────────────── -->
<div class="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-all duration-300">
  <!-- Header row -->
  <div class="flex items-center justify-between px-4 py-3 gap-3">
    <div class="flex items-center gap-2 min-w-0">
      <User size={13} class="text-text-tertiary flex-shrink-0" />
      <span class="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary"> Saved Profiles </span>
      {#if profilesState.profiles.length > 0}
        <span
          class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-black"
        >
          {profilesState.profiles.length}
        </span>
      {/if}
      {#if favoriteCount > 0}
        <span class="flex items-center gap-0.5 text-[9px] font-black text-amber-400">
          <Star size={9} class="fill-amber-400" />
          {favoriteCount}
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-1.5 flex-shrink-0">
      <!-- Update button — visible only when active profile has unsaved changes -->
      {#if activeProfile && activeProfileDirty}
        <button
          type="button"
          onclick={handleUpdate}
          title="Update saved profile with current config"
          class="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
            bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40
            transition-all duration-200"
        >
          <Check size={10} />
          Update
        </button>
      {/if}

      <!-- Save Config button -->
      {#if !showSaveForm}
        <button
          type="button"
          onclick={openSaveForm}
          title="Save current configuration as a profile"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
            bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/35
            transition-all duration-200"
        >
          <Save size={10} />
          Save
        </button>
      {/if}

      <!-- Expand/collapse toggle (only if there are profiles) -->
      {#if profilesState.profiles.length > 0}
        <button
          type="button"
          onclick={() => (listExpanded = !listExpanded)}
          aria-expanded={listExpanded}
          aria-label={listExpanded ? 'Collapse saved profiles' : 'Expand saved profiles'}
          class="p-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] transition-all duration-200"
        >
          <span
            class="block transition-transform duration-300"
            style:transform={listExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}
          >
            <ChevronDown size={13} />
          </span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Inline save form -->
  {#if showSaveForm}
    <div transition:slide={{ duration: 200 }} class="px-4 pb-3 border-t border-white/[0.06]">
      <div class="pt-3 space-y-2">
        <label for="profile-save-name" class="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
          Profile Name
        </label>
        <div class="flex gap-2">
          <input
            id="profile-save-name"
            bind:this={saveInputEl}
            bind:value={saveInputValue}
            onkeydown={handleSaveKeydown}
            type="text"
            maxlength="60"
            placeholder="e.g. Daily commute setup"
            class="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5
              text-xs text-text-primary placeholder:text-text-tertiary
              focus:border-primary/50 focus:outline-none transition-colors"
          />
          <button
            type="button"
            onclick={handleSave}
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold
              bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25
              transition-all duration-200 flex-shrink-0"
          >
            <Check size={11} />
            Save
          </button>
          <button
            type="button"
            onclick={closeSaveForm}
            aria-label="Cancel save"
            class="flex items-center justify-center w-7 h-7 rounded-lg
              bg-white/[0.03] border border-white/[0.08] text-text-tertiary hover:text-text-primary hover:bg-white/[0.06]
              transition-all duration-200 flex-shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Profile list -->
  {#if listExpanded && profilesState.profiles.length > 0}
    <div transition:slide={{ duration: 220 }} class="border-t border-white/[0.06]">
      <ul class="divide-y divide-white/[0.05]" role="list" aria-label="Saved profiles">
        {#each sortedProfiles as profile (profile.id)}
          {@const isActive = profile.id === profilesState.activeProfileId}
          {@const isRenaming = profile.id in renameMap}
          {@const isPendingDelete = profile.id === pendingDeleteId}
          {@const menuOpen = openMenuId === profile.id}

          <li
            class="relative px-4 py-2.5 transition-all duration-200
              {isActive ? 'bg-primary/[0.06]' : 'hover:bg-white/[0.02]'}"
          >
            {#if isRenaming}
              <!-- Rename inline editor -->
              <div class="flex items-center gap-2" transition:slide={{ duration: 150 }}>
                <input
                  type="text"
                  maxlength="60"
                  bind:value={renameMap[profile.id]}
                  onkeydown={(e) => handleRenameKeydown(e, profile.id)}
                  class="flex-1 min-w-0 bg-white/[0.04] border border-primary/40 rounded-lg px-2.5 py-1
                    text-xs text-text-primary focus:border-primary/60 focus:outline-none transition-colors"
                  aria-label="Rename profile"
                />
                <button
                  type="button"
                  onclick={() => commitRename(profile.id)}
                  aria-label="Confirm rename"
                  class="flex items-center justify-center w-6 h-6 rounded-md bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-all duration-150"
                >
                  <Check size={10} />
                </button>
                <button
                  type="button"
                  onclick={() => cancelRename(profile.id)}
                  aria-label="Cancel rename"
                  class="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-tertiary hover:text-text-primary transition-all duration-150"
                >
                  <X size={10} />
                </button>
              </div>
            {:else if isPendingDelete}
              <!-- Delete confirmation row -->
              <div class="flex items-center gap-2" transition:slide={{ duration: 150 }}>
                <span class="flex-1 text-xs text-text-secondary truncate min-w-0">
                  Delete <span class="text-text-primary font-semibold">"{profile.name}"</span>?
                </span>
                <button
                  type="button"
                  onclick={() => confirmDelete(profile.id)}
                  class="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold
                    bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25
                    transition-all duration-150 flex-shrink-0"
                >
                  <Trash2 size={9} />
                  Delete
                </button>
                <button
                  type="button"
                  onclick={cancelDelete}
                  aria-label="Cancel delete"
                  class="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-tertiary hover:text-text-primary transition-all duration-150"
                >
                  <X size={10} />
                </button>
              </div>
            {:else}
              <!-- Normal profile row -->
              <div class="flex items-center gap-2.5 min-w-0">
                <!-- Active indicator dot -->
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200
                    {isActive ? 'bg-primary' : 'bg-transparent'}"
                  aria-hidden="true"
                ></span>

                <!-- Profile info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span
                      class="text-xs font-semibold truncate
                        {isActive ? 'text-text-primary' : 'text-text-secondary'}"
                    >
                      {profile.name}
                    </span>
                    {#if isActive}
                      <span class="text-[9px] font-black uppercase tracking-wider text-primary flex-shrink-0">
                        Active
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-[10px] text-text-tertiary truncate">
                      {presetLabel(profile.presetKey)}
                    </span>
                    <span class="text-text-tertiary/40 text-[10px]">&bull;</span>
                    <span class="text-[10px] text-text-tertiary flex-shrink-0">
                      {formatDateFull(profile.updatedAt)}
                    </span>
                  </div>
                </div>

                <!-- Favorite toggle -->
                <button
                  type="button"
                  onclick={() => toggleFavorite(profile.id)}
                  title={profile.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  class="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 flex-shrink-0
                    {profile.isFavorite
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-text-tertiary/40 hover:text-amber-400/60'}"
                >
                  <Star size={11} class={profile.isFavorite ? 'fill-amber-400' : ''} />
                </button>

                <!-- Load button -->
                {#if !isActive}
                  <button
                    type="button"
                    onclick={() => handleLoad(profile)}
                    title="Load this profile"
                    class="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide
                      bg-white/[0.03] border border-white/[0.08] text-text-tertiary hover:text-primary hover:border-primary/30 hover:bg-primary/[0.06]
                      transition-all duration-200 flex-shrink-0"
                  >
                    <FolderOpen size={9} />
                    Load
                  </button>
                {/if}

                <!-- "..." context menu trigger -->
                <div class="relative flex-shrink-0">
                  <button
                    type="button"
                    onclick={() => toggleMenu(profile.id)}
                    aria-label="Profile options"
                    aria-expanded={menuOpen}
                    class="flex items-center justify-center w-6 h-6 rounded-md text-text-tertiary
                      hover:text-text-primary hover:bg-white/[0.06] transition-all duration-150
                      {menuOpen ? 'bg-white/[0.06] text-text-secondary' : ''}"
                  >
                    <span class="text-[10px] font-black leading-none tracking-widest">···</span>
                  </button>

                  <!-- Dropdown menu -->
                  {#if menuOpen}
                    <div
                      transition:slide={{ duration: 120 }}
                      class="absolute right-0 top-full mt-1 z-20 w-32
                        bg-bg-primary border border-white/[0.12] rounded-xl shadow-xl overflow-hidden"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onclick={() => startRename(profile)}
                        class="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                      >
                        <Pencil size={11} class="text-text-tertiary" />
                        Rename
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onclick={() => requestDelete(profile.id)}
                        class="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/[0.06] transition-colors"
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Empty state (collapsed, no profiles) -->
  {#if profilesState.profiles.length === 0 && !showSaveForm}
    <div class="px-4 pb-3 pt-0.5">
      <p class="text-[10px] text-text-tertiary leading-relaxed">
        Save your current configuration to quickly reload it later.
      </p>
    </div>
  {/if}
</div>
