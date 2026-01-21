<script lang="ts">
  import { onDestroy } from 'svelte';
  import { debounce } from '$lib/utils/debounce';

  // Module-scoped counter for stable IDs
  let idCounter = 0;

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

  // Stable input ID created once per instance
  let inputId = `input-${idCounter++}`;
  let labelId = `${inputId}-label`;
  const helpId = $derived(help ? `${inputId}-help` : undefined);

  // Stable debounced handler
  let debouncedOnChange: ((value: number) => void) | undefined = undefined;

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const numericValue = target.valueAsNumber;

    if (Number.isNaN(numericValue)) return;
    debouncedOnChange?.(numericValue);
  }

  function initDebounce() {
    if (onValueChange) {
      debouncedOnChange = debounce(onValueChange, 100);
    }
  }

  function cleanupDebounce() {
    debouncedOnChange = undefined;
  }

  // Initialize debounce on mount, clean up on destroy
  $effect(() => {
    initDebounce();
    return cleanupDebounce;
  });
</script>

<div class="mb-4">
    {#if showSlider}
      <div class="flex gap-2 items-center mb-2">
        <label id={labelId} class="block text-sm font-medium text-textMain" for={inputId}>{label}</label>
       {#if help}
         <div class="relative group lg:relative">
           <button
             type="button"
             class="touch-target-icon w-11 h-11 sm:w-6 sm:h-6 bg-bgInput/80 hover:bg-bgInput border border-white/20 rounded-full text-textMain text-sm flex items-center justify-center cursor-help transition-colors"
             aria-describedby={helpId}
             aria-label="Help information"
           >
             ?
           </button>
           <div
             id={helpId}
             class="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bgCard border border-white/20 text-textMain text-sm p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-56 text-left z-10 group-focus-within:opacity-100 group-focus-within:visible"
             role="tooltip"
             tabindex="-1"
           >
             {help}
           </div>
           <p id={`${inputId}-mobile-help`} class="lg:hidden text-xs text-textMain/70 mt-1">{help}</p>
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
        aria-labelledby={labelId}
        aria-describedby={helpId}
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
        aria-labelledby={labelId}
        aria-describedby={helpId}
        class="w-20 sm:w-20 bg-bgInput border border-white/20 rounded-lg p-2.5 sm:p-2 text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
      />
    </div>
  {:else}
     <div class="flex items-center gap-2">
        <label id={labelId} class="block text-sm font-medium text-textMain" for={inputId}>{label}</label>
       {#if help}
         <div class="relative group lg:relative">
           <button
             type="button"
             class="touch-target-icon w-11 h-11 sm:w-6 sm:h-6 bg-bgInput/80 hover:bg-bgInput border border-white/20 rounded-full text-textMain text-sm flex items-center justify-center cursor-help transition-colors"
             aria-describedby={helpId}
             aria-label="Help information"
           >
             ?
           </button>
           <div
             id={helpId}
             class="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bgCard border border-white/20 text-textMain text-sm p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-56 text-left z-10 group-focus-within:opacity-100 group-focus-within:visible"
             role="tooltip"
             tabindex="-1"
           >
             {help}
           </div>
           <p id={`${inputId}-mobile-help`} class="lg:hidden text-xs text-textMain/70 mt-1">{help}</p>
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
        aria-labelledby={labelId}
        aria-describedby={helpId}
        class="flex-1 bg-bgInput border border-white/20 rounded-lg p-2.5 sm:p-2 text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
      />
      {#if unit}
        <span class="text-textMuted text-sm w-12" aria-hidden="true">{unit}</span>
      {/if}
    </div>
  {/if}
</div>
