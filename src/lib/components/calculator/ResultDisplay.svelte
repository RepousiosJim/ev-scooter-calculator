<script lang="ts">
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import StatBox from '$lib/components/ui/StatBox.svelte';

  const stats = $derived(calculatorState.stats);
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
  <StatBox label="Total Energy" value={stats.wh} unit="Wh" />
  <StatBox label="Range" value={stats.totalRange} unit="km" />
  <StatBox label="Top Speed" value={stats.speed} unit="km/h" />
  <StatBox label="Max Hill Speed" value={stats.hillSpeed} unit="km/h" />
  <StatBox label="Peak Power" value={stats.totalWatts} unit="W" />
  <StatBox label="Charge Time" value={stats.chargeTime} unit="hrs" />
  <StatBox label="Cost/100km" value={stats.costPer100km} unit="$" />
</div>
