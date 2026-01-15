<script lang="ts">
  import { onMount } from 'svelte';
  import { loadPreset } from '$lib/stores/calculator.svelte';

  let { onClose }: { onClose: () => void } = $props();
  let currentStep = $state(0);

  const tourSteps = [
    {
      title: 'Welcome!',
      content: 'This tool helps you analyze and optimize your EV scooter performance.'
    },
    {
      title: 'Preset Selector',
      content: 'Choose from popular scooter models to get started quickly.'
    },
    {
      title: 'Configuration',
      content: 'Adjust your scooter specifications in real-time.'
    },
    {
      title: 'Results',
      content: 'View instant performance analysis and bottleneck warnings.'
    },
    {
      title: 'Upgrades',
      content: 'Simulate upgrades and see their impact before buying.'
    }
  ];

  function nextStep() {
    if (currentStep < tourSteps.length - 1) {
      currentStep += 1;
    } else {
      completeTour();
    }
  }

  function completeTour() {
    localStorage.setItem('tour-completed', 'true');
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      completeTour();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      nextStep();
    } else if (event.key === 'ArrowLeft' && currentStep > 0) {
      currentStep -= 1;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
  role="dialog"
  aria-modal="true"
  aria-labelledby="tour-heading"
>
  <div class="bg-bgCard rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10 shadow-2xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 id="tour-heading" class="text-2xl font-bold text-textMain">Quick Tour</h2>
      </div>
      <button
        type="button"
        onclick={completeTour}
        class="text-textMuted hover:text-textMain transition"
        aria-label="Skip tour"
      >
        ✕
      </button>
    </div>

    <div class="space-y-6">
      <div class="text-lg font-semibold text-primary">
        {tourSteps[currentStep].title}
      </div>
      <div class="text-textMain">
        {tourSteps[currentStep].content}
      </div>
    </div>

    <div class="flex items-center justify-between pt-4 border-t border-white/10">
      <button
        type="button"
        onclick={completeTour}
        class="text-textMuted hover:text-textMain"
      >
        Skip Tour
      </button>
      <div class="flex items-center gap-3">
        <span class="text-textMuted">
          {currentStep + 1}/{tourSteps.length}
        </span>
        <button
          type="button"
          onclick={() => currentStep > 0 ? (currentStep -= 1) : null}
          disabled={currentStep === 0}
          class="px-3 py-2 rounded bg-bgInput text-textMain disabled:opacity-50 hover:bg-bgInput/80"
          aria-label="Previous step"
        >
          ← Previous
        </button>
        <button
          type="button"
          onclick={nextStep}
          class="px-3 py-2 rounded bg-primary text-white hover:bg-primaryDark"
          aria-label="Next step"
        >
          {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next →'}
        </button>
      </div>
    </div>
  </div>
</div>
