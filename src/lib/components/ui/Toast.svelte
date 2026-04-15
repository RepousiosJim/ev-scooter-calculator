<script lang="ts">
  import { fly } from 'svelte/transition';
  import Icon from './atoms/Icon.svelte';

  let { message, type = 'info' }: { message: string; type?: 'success' | 'info' | 'warning' | 'error' } = $props();

  const iconMap = {
    success: 'check-circle',
    info: 'info',
    warning: 'alert-triangle',
    error: 'x-circle',
  };

  const colorMap = {
    success: 'bg-success/10 border-success/30 text-success',
    info: 'bg-primary/10 border-primary/30 text-primary',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    error: 'bg-red-500/10 border-red-500/30 text-red-500',
  };
</script>

<div
  role="alert"
  aria-live="polite"
  class="flex items-center gap-3 px-4 py-3
    rounded-xl border shadow-xl backdrop-blur-sm
    transition-all duration-300
    {colorMap[type]}"
  transition:fly={{ y: -20, duration: 300 }}
>
  <Icon name={iconMap[type]} size="sm" class="flex-shrink-0" />
  <span class="text-sm font-medium text-text-primary">{message}</span>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    div {
      transition: none !important;
    }
  }
</style>
