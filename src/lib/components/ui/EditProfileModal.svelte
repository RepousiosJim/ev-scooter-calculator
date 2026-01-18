<script lang="ts">
  import BottomSheet from './BottomSheet.svelte';

  let {
    isOpen = $bindable(),
    title = 'Save Setup',
    initialName = '',
    onSave
  }: {
    isOpen: boolean;
    title?: string;
    initialName?: string;
    onSave: (name: string) => void;
  } = $props();

  let inputRef = $state<HTMLInputElement | null>(null);
  let nameValue = $state(initialName || '');
  let errorMessage = $state('');

  $effect(() => {
    nameValue = initialName || '';
  });

  function handleSave() {
    const trimmedName = nameValue.trim();

    if (!trimmedName) {
      errorMessage = 'Please enter a name';
      inputRef?.focus();
      return;
    }

    if (trimmedName.length > 50) {
      errorMessage = 'Name must be 50 characters or less';
      inputRef?.focus();
      return;
    }

    onSave(trimmedName);
    close();
  }

  function close() {
    nameValue = initialName || '';
    errorMessage = '';
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;
    if (event.key === 'Enter') {
      handleSave();
    }
  }

  $effect(() => {
    if (isOpen) {
      nameValue = initialName || '';
      errorMessage = '';
      setTimeout(() => {
        inputRef?.focus();
        inputRef?.select();
      }, 100);
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<BottomSheet bind:isOpen {title} onClose={close} height="auto">
  <div class="space-y-6 pb-4">
    <p class="text-sm text-textMuted">
      Enter a name for your scooter setup
    </p>

    <div>
      <label for="profile-name" class="block text-sm font-medium text-textMuted mb-2">
        Setup Name
      </label>
      <input
        bind:this={inputRef}
        id="profile-name"
        type="text"
        bind:value={nameValue}
        placeholder="e.g., My Commuter Scooter"
        class="w-full px-4 py-3 bg-bgInput border border-white/10 rounded-lg text-textMain placeholder-textMuted/50
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          transition-all duration-200"
        maxlength={50}
        aria-invalid={errorMessage !== ''}
        aria-describedby={errorMessage ? 'name-error' : undefined}
      />
      {#if errorMessage}
        <p id="name-error" class="mt-2 text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      {/if}
    </div>

    <!-- Action buttons in thumb-reach zone at bottom -->
    <div class="flex gap-3 pt-4">
      <button
        type="button"
        onclick={close}
        class="flex-1 px-4 py-3.5 bg-bgInput text-textMain rounded-xl border border-white/5
          hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
          transition-all duration-200 font-medium text-base"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleSave}
        class="flex-1 px-4 py-3.5 bg-gradient-main bg-[length:200%_200%] animate-gradient-shift
          text-white rounded-xl font-medium text-base
          hover:shadow-glow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
          transition-all duration-200"
      >
        Save
      </button>
    </div>
  </div>
</BottomSheet>
