<script lang="ts">
  let {
    label,
    value,
    type = 'text',
    placeholder = '',
    disabled = false,
    required = false,
    error = '',
    help = '',
    id,
    class: className = '',
    onInput,
    onChange,
    onBlur,
    onFocus,
    autoComplete = 'off',
    ...props
  }: {
    label?: string;
    value?: string | number;
    type?: 'text' | 'number' | 'email' | 'tel' | 'url';
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    help?: string;
    id?: string;
    class?: string;
    onInput?: (e: Event) => void;
    onChange?: (e: Event) => void;
    onBlur?: (e: FocusEvent) => void;
    onFocus?: (e: FocusEvent) => void;
    autoComplete?: string;
  } = $props();

  // Generate ID if not provided (reactive)
  const inputId = $derived(id || `input-${Math.random().toString(36).substring(2, 9)}`);
  const errorId = $derived(inputId && error ? `${inputId}-error` : '');

  function handleChange(e: Event) {
    if (onChange) onChange(e);

    // Announce error clearing (screen reader)
    if (error && !(e.currentTarget as HTMLInputElement).value) {
      // Value cleared
    }
  }
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label
      for={inputId}
      class="text-sm font-medium text-textSecondary uppercase tracking-wider"
      class:text-danger={error}
    >
      {label}
      {#if required}
        <span class="text-danger ml-1" aria-hidden="true">*</span>
      {/if}
    </label>
  {/if}

  <input
    id={inputId}
    type={type}
    value={value}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
  autocomplete={autoComplete as AutoFill | undefined}
  class={`w-full px-4 py-3 bg-bgInput border rounded-radius-input text-textMain
      focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal
      ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-gray-600 hover:border-gray-500'}
      ${className}`}
    aria-invalid={error !== ''}
    aria-describedby={errorId || (help ? `${inputId}-help` : undefined)}
    oninput={onInput}
    onchange={handleChange}
    onblur={onBlur}
    onfocus={onFocus}
    {...props}
  />

  {#if error}
    <p id={errorId} class="text-sm text-danger mt-1" role="alert" aria-live="polite">
      {error}
    </p>
  {/if}

  {#if help}
    <p id={`${inputId}-help`} class="text-xs text-textMuted mt-1">
      {help}
    </p>
  {/if}
</div>

<style>
  input {
    font-family: var(--font-body);
  }

  /* Mobile: Ensure minimum touch target */
  @media (max-width: 640px) {
    input {
      min-height: 48px;
    }
  }
</style>
