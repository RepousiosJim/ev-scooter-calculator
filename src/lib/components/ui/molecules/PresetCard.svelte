<script lang="ts">
  import Button from '$lib/components/ui/atoms/Button.svelte';
  import Icon from '$lib/components/ui/atoms/Icon.svelte';
  import Badge from '$lib/components/ui/atoms/Badge.svelte';

  let {
    preset,
    isSelected = false,
    onClick,
    showSpecs = true,
    ...props
  }: {
    preset: {
      value: string;
      label: string;
      emoji: string;
      config: {
        v: number;
        ah: number;
        motors: number;
        watts: number;
        wheel: number;
      };
    };
    isSelected?: boolean;
    onClick?: () => void;
    showSpecs?: boolean;
  } = $props();

  const cardSpecs = $derived([
    { label: 'Voltage', value: `${preset.config.v} V` },
    { label: 'Capacity', value: `${preset.config.ah} Ah` },
    { label: 'Motors', value: `${preset.config.motors} x ${preset.config.watts} W` },
    { label: 'Wheel', value: `${preset.config.wheel}"` },
  ]);

  const cardSpecsSimple = $derived([
    { label: 'Power', value: `${preset.config.motors * preset.config.watts} W` },
    { label: 'Voltage', value: `${preset.config.v} V` },
  ]);
</script>

<button
  type="button"
  class={`relative flex flex-col gap-3 p-4 border rounded-card transition-all duration-normal card-lift group
    ${isSelected
      ? 'border-primary bg-primary/10 shadow-glow-sm'
      : 'border-gray-600 bg-hover/50 hover:border-gray-500'
    }`}
  onclick={onClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }}
  aria-pressed={isSelected}
  aria-label={`Select ${preset.label} preset`}
  {...props}
>
  <!-- Selected Badge -->
  {#if isSelected}
    <Badge
      text="Selected"
      variant="primary"
      size="sm"
      class="absolute top-2 right-2"
    />
  {/if}

  <!-- Preset Icon & Name -->
  <div class="flex items-center gap-3">
    <span class="text-2xl group-hover:scale-110 transition-transform duration-fast" aria-hidden="true">
      {preset.emoji}
    </span>
    <div class="text-left">
      <div class="font-semibold text-textMain text-h3">
        {preset.label}
      </div>
      <div class="text-xs text-textMuted">
        {showSpecs ? 'Click to apply specs' : 'Click for details'}
      </div>
    </div>
  </div>

  <!-- Quick Specs (Mobile: Simple) -->
  <div class="flex gap-2 flex-wrap mt-1">
    {#if showSpecs}
      {#each cardSpecs as spec}
        <div class="flex items-center gap-1">
          <span class="text-xs text-textMuted">{spec.label}:</span>
          <span class="text-xs font-medium text-textMain font-number">
            {spec.value}
          </span>
        </div>
      {/each}
    {:else}
      {#each cardSpecsSimple as spec}
        <div class="flex items-center gap-1">
          <span class="text-xs text-textMuted">{spec.label}:</span>
          <span class="text-xs font-medium text-textMain font-number">
            {spec.value}
          </span>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Hover Effect (Subtle Glow) -->
  <div
    class="absolute inset-0 rounded-card opacity-0 group-hover:opacity-100 pointer-events-none
      bg-gradient-to-br from-primary/5 to-secondary/5 transition-opacity duration-normal"
    aria-hidden="true"
  ></div>
</button>

<style>
  /* Mobile responsive adjustments */
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
