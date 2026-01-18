<script lang="ts">
  let { 
    tagline = 'Scooter Performance Studio',
    title = 'EV Scooter Pro Calculator',
    subtitle = 'Model speed, range, and upgrade impact in seconds with a clear performance snapshot.',
    features = []
  }: {
    tagline?: string;
    title?: string;
    subtitle?: string;
    features?: { icon: string; text: string }[];
  } = $props();
</script>

<div class="relative overflow-hidden rounded-lg mb-3 bg-gradient-main bg-[length:200%_200%] animate-gradient-shift">
  <div class="absolute inset-0 bg-gradient-glow opacity-50" aria-hidden="true"></div>
  
  <div class="relative px-4 py-3 md:py-4 text-center">
    <div class="max-w-4xl mx-auto space-y-2">
      <p class="text-[10px] md:text-xs font-semibold text-white/90 uppercase tracking-[0.2em] animate-fadeIn">
        {tagline}
      </p>
      
      <h1 class="text-xl md:text-2xl lg:text-3xl font-bold text-white animate-fadeIn" style="animation-delay: 0.1s">
        {title}
      </h1>

      <p class="text-xs md:text-sm text-white/80 max-w-2xl mx-auto leading-relaxed animate-fadeIn" style="animation-delay: 0.2s">
        {subtitle}
      </p>

      {#if features.length > 0}
        <!-- Inline style used for staggered animation delays (Tailwind doesn't support arbitrary delays efficiently) -->
        <div class="flex flex-wrap justify-center gap-1.5 md:gap-2 pt-2 animate-fadeIn" style="animation-delay: 0.3s">
          {#each features as feature}
            <div class="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">
              <span class="text-sm" aria-hidden="true">{feature.icon}</span>
              <span class="text-[10px] font-medium text-white">{feature.text}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-dark/30 pointer-events-none" aria-hidden="true"></div>
  </div>
  
  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true"></div>
</div>
