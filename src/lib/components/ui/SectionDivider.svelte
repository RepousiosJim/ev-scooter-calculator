<script lang="ts">
  let { 
    variant = 'solid',
    label = '',
    icon = '',
    className = ''
  }: {
    variant?: 'solid' | 'gradient' | 'dotted';
    label?: string;
    icon?: string;
    className?: string;
  } = $props();
</script>

<div class="relative py-8 {className}" aria-hidden="true">
  <div class="absolute inset-0 flex items-center">
    {#if variant === 'gradient'}
      <div class="w-full h-px bg-gradient-border bg-[length:200%_200%] animate-gradientShift"></div>
    {:else if variant === 'dotted'}
      <div class="w-full h-px border-t-2 border-dotted border-white/10"></div>
    {:else}
      <div class="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    {/if}
  </div>
  
  {#if label || icon}
    <div class="relative flex justify-center">
      <div class="bg-bg-card px-4 flex items-center gap-2">
        {#if icon}
          <span class="text-primary">{icon}</span>
        {/if}
        {#if label}
          <span class="text-sm font-medium text-textMuted uppercase tracking-wider">{label}</span>
        {/if}
      </div>
    </div>
  {/if}
</div>
