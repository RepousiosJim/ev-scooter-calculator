<script lang="ts">
  let {
    label,
    value,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    id,
    help = '',
    showValue = true,
    class: className = '',
    onInput,
    onChange,
    ...props
  }: {
    label?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    id?: string;
    help?: string;
    showValue?: boolean;
    class?: string;
    onInput?: (value: number) => void;
    onChange?: (value: number) => void;
  } = $props();

  const sliderId = $derived(id || `slider-${Math.random().toString(36).substring(2, 9)}`);
  const helpId = $derived(help ? `${sliderId}-help` : '');

  function handleInput(e: Event) {
    const newValue = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!isNaN(newValue)) {
      if (onInput) onInput(newValue);
    }
  }

  function handleChange(e: Event) {
    const newValue = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!isNaN(newValue)) {
      if (onChange) onChange(newValue);
    }
  }

  const percentage = $derived(
    value ? Math.round(((value - min) / (max - min)) * 100) : 0
  );
</script>

<div class="flex flex-col gap-2">
  {#if label}
    <div class="flex items-center justify-between">
      <label for={sliderId} class="text-sm font-medium text-textSecondary">
        {label}
      </label>
      {#if showValue}
        <span class="text-sm font-semibold text-primary font-number">
          {Math.round(value || 0)}
        </span>
      {/if}
    </div>
  {/if}

  <input
    id={sliderId}
    type="range"
    value={value || min}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    aria-valuenow={Math.round(value || 0)}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-describedby={helpId}
    class={`w-full h-2 bg-gray-600 rounded-full appearance-none cursor-pointer
      disabled:opacity-50 disabled:cursor-not-allowed
      ${disabled ? '' : 'hover:accent-primary'}
      ${className}`}
    oninput={handleInput}
    onchange={handleChange}
    {...props}
  />

  <!-- Progress indicator (visual only) -->
  <div
    class="relative w-full h-2 bg-gray-600 rounded-full overflow-hidden -mt-2 pointer-events-none"
    aria-hidden="true"
  >
    <div
      class="absolute h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-fast"
      style="width: {percentage}%"
    ></div>
  </div>

  {#if help}
    <p id={helpId} class="text-xs text-textMuted mt-1">
      {help}
    </p>
  {/if}
</div>

<style>
  /* Custom range slider styling */
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  /* Webkit slider thumb */
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--brand-primary);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    margin-top: -8px;
  }

  /* Webkit slider thumb hover */
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
  }

  /* Firefox slider thumb */
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: var(--brand-primary);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  /* Firefox slider thumb hover */
  input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
  }

  /* Mobile: Larger touch target */
  @media (max-width: 640px) {
    input[type="range"]::-webkit-slider-thumb {
      width: 32px;
      height: 32px;
      margin-top: -15px;
    }

    input[type="range"]::-moz-range-thumb {
      width: 32px;
      height: 32px;
    }
  }

  /* Focus styles */
  input[type="range"]:focus-visible {
    outline: 2px solid var(--brand-primary);
    outline-offset: 2px;
  }

  input[type="range"]:focus:not(:focus-visible) {
    outline: none;
  }
</style>
