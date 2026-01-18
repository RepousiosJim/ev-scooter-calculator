<script lang="ts">
  import { scale } from 'svelte/transition';

  let {
    label,
    value = $bindable(),
    min,
    max,
    step = 1,
    unit,
    showValue = true
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    showValue?: boolean;
  } = $props();

  let sliderElement: HTMLInputElement;

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = parseFloat(target.value);
  }

  function handleBlur() {
    // Clamp value on blur
    if (min !== undefined && value < min) value = min;
    if (max !== undefined && value > max) value = max;
  }
</script>

<div class="space-y-3">
  <!-- Label Row -->
  <div class="flex items-center justify-between">
    <label for="slider-input" class="label text-text-secondary">{label}</label>
    {#if showValue}
      <div
        transition:scale
        class="flex items-baseline gap-1 px-3 py-1.5 rounded-lg bg-bg-tertiary"
      >
        <span class="data-sm font-bold text-primary font-data">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        {#if unit}
          <span class="text-xs text-text-tertiary">{unit}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Slider Input -->
  <div class="relative">
    <input
      bind:this={sliderElement}
      id="slider-input"
      type="range"
      {value}
      {min}
      {max}
      {step}
      oninput={handleInput}
      onblur={handleBlur}
      class="w-full h-12 appearance-none bg-transparent cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary
        rounded-xl"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    />

    <!-- Track Background -->
    <div
      class="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-bg-tertiary rounded-full pointer-events-none"
      aria-hidden="true"
    ></div>

    <!-- Active Track -->
    <div
      class="absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-gradient-to-r from-primary to-secondary rounded-full pointer-events-none transition-all duration-fast"
      style="width: {min !== undefined && max !== undefined ? ((value - min) / (max - min)) * 100 : 50}%"
      aria-hidden="true"
    ></div>
  </div>

  <!-- Value Indicators -->
  <div class="flex justify-between text-xs text-text-tertiary">
    <span>{min !== undefined ? min : '0'}</span>
    <span>{max !== undefined ? max : '100'}</span>
  </div>

  <!-- Quick Action Buttons (optional) -->
  <div class="flex gap-2">
    <button
      type="button"
      onclick={() => value = Math.max(min ?? 0, value - step)}
      class="flex-1 py-2 rounded-lg bg-bg-tertiary text-text-tertiary hover:bg-bg-hover hover:text-text-primary
        transition-all duration-fast text-sm font-medium"
      disabled={min !== undefined && value <= min}
      aria-label="Decrease value"
    >
      −
    </button>
    <button
      type="button"
      onclick={() => value = min !== undefined ? Math.min(max ?? Infinity, value + step) : value + step}
      class="flex-1 py-2 rounded-lg bg-bg-tertiary text-text-tertiary hover:bg-bg-hover hover:text-text-primary
        transition-all duration-fast text-sm font-medium"
      disabled={max !== undefined && value >= max}
      aria-label="Increase value"
    >
      +
    </button>
  </div>
</div>

<style>
  /* Custom slider thumb styling */
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    background: linear-gradient(135deg, #00d4ff 0%, #6366f1 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: transform 150ms ease-out, box-shadow 150ms ease-out;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 4px rgba(0, 212, 255, 0.2), 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(1.1);
  }

  input[type="range"]::-moz-range-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    background: linear-gradient(135deg, #00d4ff 0%, #6366f1 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: transform 150ms ease-out, box-shadow 150ms ease-out;
    border: none;
  }

  input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 4px rgba(0, 212, 255, 0.2), 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  input[type="range"]::-moz-range-thumb:active {
    transform: scale(1.1);
  }
</style>
