<script lang="ts">
  let {
    help,
    inputId
  }: {
    help: string;
    inputId: string;
  } = $props();

  const helpId = $derived(`${inputId}-help`);
</script>

<div class="relative group lg:relative">
  <button
    type="button"
    class="touch-target-icon w-11 h-11 sm:w-6 sm:h-6 bg-bg-secondary/80 hover:bg-bg-secondary border border-white/20 rounded-full text-text-primary text-sm flex items-center justify-center cursor-help transition-colors"
    aria-describedby={helpId}
    aria-label="Help information"
  >
    ?
  </button>
  <div
    id={helpId}
    class="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bg-secondary border border-white/20 text-text-primary text-sm p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-56 text-left z-10 group-focus-within:opacity-100 group-focus-within:visible"
    role="tooltip"
    tabindex="-1"
  >
    {help}
  </div>
  <p id={`${inputId}-mobile-help`} class="lg:hidden text-xs text-text-primary/70 mt-1">{help}</p>
</div>
