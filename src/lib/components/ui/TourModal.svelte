<script lang="ts">
  import BottomSheet from './BottomSheet.svelte';

  let { onClose }: { onClose: () => void } = $props();
  let currentStep = $state(0);
  let isOpen = $state(true);

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
    try {
      localStorage.setItem('tour-completed', 'true');
    } catch (error) {
      // Ignore localStorage errors (e.g., private mode)
    }
    isOpen = false;
    onClose();
  }

  let modalElement: HTMLElement | undefined;

  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return;

    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      !modalElement?.contains(target)
    ) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      nextStep();
    } else if (event.key === 'ArrowLeft' && currentStep > 0) {
      currentStep -= 1;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<BottomSheet bind:isOpen title="Quick Tour" onClose={completeTour} height="auto">
  {#snippet children()}
    <div bind:this={modalElement} class="space-y-6 pb-4">
    <div class="space-y-4">
      <div class="text-xl font-semibold text-primary">
        {tourSteps[currentStep].title}
      </div>
      <div class="text-base text-textMain leading-relaxed">
        {tourSteps[currentStep].content}
      </div>
    </div>

    <!-- Progress indicator -->
    <div class="flex justify-center gap-2 py-4">
      {#each tourSteps as _, index}
        <div
          class="h-2 rounded-full transition-all duration-300 {index === currentStep ? 'w-8 bg-primary' : 'w-2 bg-white/20'}"
          aria-hidden="true"
        ></div>
      {/each}
    </div>

    <!-- Action buttons in thumb-reach zone -->
    <div class="space-y-3 pt-4 border-t border-white/10">
      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          onclick={() => currentStep > 0 ? (currentStep -= 1) : null}
          disabled={currentStep === 0}
          class="flex-1 px-4 py-3.5 rounded-xl bg-bgInput text-textMain disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors font-medium"
          aria-label="Previous step"
        >
          ← Previous
        </button>
        <button
          type="button"
          onclick={nextStep}
          class="flex-1 px-4 py-3.5 rounded-xl bg-gradient-main bg-[length:200%_200%] animate-gradient-shift text-white hover:shadow-glow-sm transition-all font-medium"
          aria-label="Next step"
        >
          {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next →'}
        </button>
      </div>
      <div class="text-center">
        <button
          type="button"
          onclick={completeTour}
          class="text-textMuted hover:text-textMain transition-colors text-sm py-2"
        >
          Skip Tour ({currentStep + 1}/{tourSteps.length})
        </button>
      </div>
    </div>
  </div>
  {/snippet}
</BottomSheet>
