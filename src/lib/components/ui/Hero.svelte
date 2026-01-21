<script lang="ts">
  import { scale } from "svelte/transition";
  let {
    tagline = "Scooter Performance Studio",
    title = "EV Scooter Pro Calculator",
  }: {
    tagline?: string;
    title?: string;
  } = $props();
</script>

<div
  class="relative overflow-hidden mb-12 border-b border-white/5 bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50"
>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >
      <div class="space-y-1">
        <p class="text-[9px] font-bold text-primary uppercase tracking-[0.3em]">
          {tagline}
        </p>
        <h1
          class="text-xl md:text-2xl font-bold text-text-primary tracking-tight"
        >
          {title}
        </h1>
      </div>
    </div>
  </div>
</div>
