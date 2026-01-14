<script lang="ts">
  let { 
    direction, 
    value, 
    showPercent = true,
    compact = false 
  }: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    showPercent?: boolean;
    compact?: boolean;
  } = $props();

  const colorClass = $derived(() => {
    switch (direction) {
      case 'up': return 'text-success';
      case 'down': return 'text-danger';
      default: return 'text-textMuted';
    }
  });

  const icon = $derived(() => {
    switch (direction) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '↔️';
    }
  });

  const formattedValue = $derived(
    value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
  );
</script>

{#if compact}
  <span class={`inline-flex items-center gap-1 text-xs font-medium ${colorClass()}`}>
    <span>{icon()}</span>
    <span>{formattedValue}{showPercent ? '%' : ''}</span>
  </span>
{:else}
  <span class={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 ${colorClass()}`}>
    <span>{icon()}</span>
    <span class="text-xs font-medium">{formattedValue}{showPercent ? '%' : ''}</span>
  </span>
{/if}
