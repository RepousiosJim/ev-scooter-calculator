<script lang="ts">
  import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-svelte';

  let {
    direction,
    value,
    showPercent = true,
    compact = false,
  }: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    showPercent?: boolean;
    compact?: boolean;
  } = $props();

  const colorClass = $derived(() => {
    switch (direction) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-danger';
      default:
        return 'text-text-tertiary';
    }
  });

  const icon = $derived(() => {
    switch (direction) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return ArrowLeftRight;
    }
  });

  const formattedValue = $derived(value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1));
</script>

{#if compact}
  {@const IconComp = icon()}
  <span class={`inline-flex items-center gap-1 text-xs font-medium ${colorClass()}`}>
    <IconComp size={12} />
    <span>{formattedValue}{showPercent ? '%' : ''}</span>
  </span>
{:else}
  {@const IconComp = icon()}
  <span class={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/20 ${colorClass()}`}>
    <IconComp size={14} />
    <span class="text-xs font-medium">{formattedValue}{showPercent ? '%' : ''}</span>
  </span>
{/if}
