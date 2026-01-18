<script lang="ts">
  let {
    label,
    checked = false,
    disabled = false,
    size = 'md',
    id,
    onChange,
    ...props
  }: {
    label?: string;
    checked?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    id?: string;
    onChange?: (checked: boolean) => void;
  } = $props();

  const toggleId = $derived(id || `toggle-${Math.random().toString(36).substring(2, 9)}`);

  function handleClick() {
    if (disabled) return;
    const newState = !checked;
    if (onChange) onChange(newState);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }
</script>

<div class="flex items-center gap-3">
  {#if label}
    <label for={toggleId} class="text-sm font-medium text-textSecondary cursor-pointer">
      {label}
    </label>
  {/if}

  <button
    id={toggleId}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled}
    aria-label={label || 'Toggle'}
    disabled={disabled}
    onclick={handleClick}
    onkeydown={handleKeydown}
    class={`relative inline-flex items-center transition-all duration-normal
      ${size === 'sm' ? 'w-10 h-5' : size === 'lg' ? 'w-14 h-8' : 'w-12 h-6'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
      ${checked ? 'bg-primary' : 'bg-gray-600'}
      rounded-full
    `}
  >
    <span
      class={`absolute bg-white rounded-full shadow-md transition-all duration-normal
        ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
        ${checked ? 'translate-x-6' : 'translate-x-0.5'}
        ${checked && size === 'sm' ? 'translate-x-5' : ''}
        ${checked && size === 'lg' ? 'translate-x-7' : ''}
      `}
    ></span>
  </button>
</div>

<style>
  /* Mobile: Ensure minimum touch target */
  @media (max-width: 640px) {
    button {
      min-height: 44px;
      min-width: 44px;
    }
  }

  button:focus-visible {
    outline: 2px solid var(--brand-primary);
    outline-offset: 2px;
  }

  button:focus:not(:focus-visible) {
    outline: none;
  }
</style>
