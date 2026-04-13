<script lang="ts">
  import { fly } from 'svelte/transition';

  let {
    content,
    position = 'top',
  }: {
    content: string;
    position?: 'top' | 'right' | 'bottom' | 'left';
  } = $props();

  let showTooltip = $state(false);
  let triggerElement: HTMLElement;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  function toggleTooltip() {
    showTooltip = !showTooltip;
  }

  function closeTooltip() {
    showTooltip = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeTooltip();
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleTooltip();
    }
  }
</script>

<div class="relative inline-flex" role="presentation">
  <!-- Trigger Button -->
  <button
    bind:this={triggerElement}
    type="button"
    onmouseenter={() => (showTooltip = true)}
    onmouseleave={() => (showTooltip = false)}
    onclick={toggleTooltip}
    onfocus={() => (showTooltip = true)}
    onblur={() => (showTooltip = false)}
    onkeydown={handleKeydown}
    aria-label="Show help information"
    aria-expanded={showTooltip}
    class="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-bg-tertiary text-text-tertiary border border-white/10 cursor-help
      hover:bg-bg-hover hover:text-text-primary hover:scale-110 hover:border-white/20 transition-all duration-fast
      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-primary"
  >
    <span class="text-xs sm:text-xs font-bold" aria-hidden="true">?</span>
  </button>

  <!-- Tooltip Content -->
  {#if showTooltip}
    <div
      class="absolute z-tooltip w-64 p-4 bg-bg-primary border border-white/10 rounded-xl shadow-2xl
        {positionClasses[position]}"
      role="tooltip"
      aria-hidden="true"
      transition:fly={{ y: -10, duration: 150 }}
    >
      <!-- Content -->
      <p class="text-sm text-text-secondary leading-relaxed">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html content}
      </p>

      <!-- Arrow -->
      <div
        class="absolute w-3 h-3 bg-bg-primary border-r border-b border-white/10 rotate-45
          top-full left-1/2 -translate-x-1/2 -mt-1.5"
        aria-hidden="true"
      ></div>
    </div>
  {/if}
</div>
