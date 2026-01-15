<script lang="ts">
  import { debounce } from '$lib/utils/debounce';

  let {
    label,
    value,
    min = 0,
    max = 999999,
    unit,
    help,
    showSlider = false,
    step,
    onValueChange
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    unit?: string;
    help?: string;
    showSlider?: boolean;
    step?: number;
    onValueChange?: (value: number) => void;
  } = $props();

  const inputId = $derived(`input-${Math.random().toString(36).substr(2, 9)}`);
  const helpId = $derived(() => help ? `${inputId}-help` : undefined);

  const debouncedOnChange = $derived(() => onValueChange ? debounce(onValueChange, 100) : undefined);

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const numericValue = target.valueAsNumber;

    if (Number.isNaN(numericValue)) return;
    debouncedOnChange()?.(numericValue);
  }
</script>

<div class="mb-4">
   {#if showSlider}
    <div class="flex gap-2 items-center mb-2">
      <label class="block text-sm text-textMuted" for={inputId}>{label}</label>
      {#if help}
        <div class="relative group">
          <button
            type="button"
            class="w-4 h-4 bg-bgInput rounded-full text-textMuted text-xs flex items-center justify-center cursor-help"
            aria-label={help ? `Help: ${label}` : undefined}
            aria-describedby={helpId()}
          >
            ?
          </button>
          <div
            id={helpId()}
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-bgCard text-textMain text-xs p-2 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-48 text-center z-10"
            role="tooltip"
          >
            {help}
          </div>
        </div>
      {/if}
    </div>
    <div class="flex gap-2 items-center">
      <input
        type="range"
        {min}
        {max}
        {step}
        value={value}
        oninput={handleInput}
        id={inputId}
        aria-labelledby={inputId}
        aria-describedby={helpId()}
        class="flex-1"
      />
      <input
        type="number"
        {min}
        {max}
        {step}
        value={value}
        oninput={handleInput}
        id={`${inputId}-number`}
        aria-labelledby={inputId}
        aria-describedby={helpId()}
        class="w-20 bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
      />
    </div>
  {:else}
    <div class="flex items-center gap-2">
      <label class="block text-sm text-textMuted" for={inputId}>{label}</label>
      {#if help}
        <div class="relative group">
          <button
            type="button"
            class="w-4 h-4 bg-bgInput rounded-full text-textMuted text-xs flex items-center justify-center cursor-help"
            aria-label={help ? `Help: ${label}` : undefined}
            aria-describedby={helpId()}
          >
            ?
          </button>
          <div
            id={helpId()}
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-bgCard text-textMain text-xs p-2 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-48 text-center z-10"
            role="tooltip"
          >
            {help}
          </div>
        </div>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <input
        type="number"
        {min}
        {max}
        {step}
        value={value}
        oninput={handleInput}
        id={inputId}
        aria-labelledby={inputId}
        aria-describedby={helpId()}
        class="flex-1 bg-bgDark border border-gray-600 rounded p-2 text-textMain focus:border-primary focus:outline-none"
      />
      {#if unit}
        <span class="text-textMuted text-sm w-12" aria-hidden="true">{unit}</span>
      {/if}
    </div>
  {/if}
</div>
