<script lang="ts">
  import Icon from './atoms/Icon.svelte';

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

<div class="relative py-4 {className}" aria-hidden="true">
  <div class="absolute inset-0 flex items-center">
    {#if variant === 'gradient'}
      <div class="w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
    {:else if variant === 'dotted'}
      <div class="w-full h-px border-t border-dotted border-white/5"></div>
    {:else}
      <div class="w-full h-px bg-white/5"></div>
    {/if}
  </div>
  
  {#if label || icon}
    <div class="relative flex justify-center">
      <div class="bg-bg-primary px-3 flex items-center gap-2">
        {#if icon}
          <Icon name={icon} size="xs" class="opacity-50" />
        {/if}
        {#if label}
          <span class="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
        {/if}
      </div>
    </div>
  {/if}
</div>
