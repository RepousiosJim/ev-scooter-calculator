<script lang="ts">
  let {
    label,
    value,
    options,
    disabled = false,
    required = false,
    error = '',
    help = '',
    id,
    placeholder = 'Select...',
    class: className = '',
    onChange,
    onBlur,
    onFocus,
    ...props
  }: {
    label?: string;
    value?: string | number;
    options: Array<{ value: string | number; label: string }>;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    help?: string;
    id?: string;
    placeholder?: string;
    class?: string;
    onChange?: (value: string | number) => void;
    onBlur?: (e: FocusEvent) => void;
    onFocus?: (e: FocusEvent) => void;
  } = $props();

  const selectId = $derived(id || `select-${Math.random().toString(36).substring(2, 9)}`);
  const errorId = $derived(error ? `${selectId}-error` : '');
  const helpId = $derived(help ? `${selectId}-help` : '');

  function handleChange(e: Event) {
    const newValue = (e.currentTarget as HTMLSelectElement).value;
    if (onChange) {
      // Try to convert to number if all options are numbers
      const allNumbers = options.every(opt => typeof opt.value === 'number');
      onChange(allNumbers ? parseFloat(newValue) : newValue);
    }
  }
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label
      for={selectId}
      class="text-sm font-medium text-textSecondary uppercase tracking-wider"
      class:text-danger={error}
    >
      {label}
      {#if required}
        <span class="text-danger ml-1" aria-hidden="true">*</span>
      {/if}
    </label>
  {/if}

  <select
    id={selectId}
    value={value ?? ''}
    disabled={disabled}
    required={required}
    placeholder={placeholder}
    class={`w-full px-4 py-3 bg-bgInput border rounded-radius-input text-textMain
      focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal
      ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-gray-600 hover:border-gray-500'}
      ${className}`}
    aria-invalid={error !== ''}
    aria-describedby={errorId || helpId}
    onchange={handleChange}
    onblur={onBlur}
    onfocus={onFocus}
    {...props}
  >
    {#if placeholder && value === undefined}
      <option value="" disabled>
        {placeholder}
      </option>
    {/if}

    {#each options as option}
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>

  {#if error}
    <p id={errorId} class="text-sm text-danger mt-1" role="alert" aria-live="polite">
      {error}
    </p>
  {/if}

  {#if help}
    <p id={helpId} class="text-xs text-textMuted mt-1">
      {help}
    </p>
  {/if}
</div>

<style>
  select {
    font-family: var(--font-body);
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3e%3c/path%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1rem;
  }

  select:focus {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3e%3c/path%3e%3c/svg%3e");
  }

  /* Mobile: Ensure minimum touch target */
  @media (max-width: 640px) {
    select {
      min-height: 48px;
    }
  }
</style>
