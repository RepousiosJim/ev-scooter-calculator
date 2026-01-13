<script lang="ts">
  let { label, value, unit, icon }: {
    label: string;
    value: number;
    unit: string;
    icon?: string;
  } = $props();

  const formattedValue = $derived(
    typeof value === 'number'
      ? (Number.isInteger(value) ? value : value.toFixed(1))
      : value
  );
</script>

<div class="bg-white/3 p-4 rounded-lg text-center">
  {#if icon}
    <div class="text-2xl mb-2">{icon}</div>
  {/if}
  <div class="text-xs text-textMuted uppercase tracking-wide mb-1">{label}</div>
  <div class="text-2xl font-bold text-primary">{formattedValue}</div>
  <div class="text-xs text-textMuted">{unit}</div>
</div>
