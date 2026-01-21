<script lang="ts">
  import {
    calculatorState,
    clearSimulation,
  } from "$lib/stores/calculator.svelte";
  import UpgradeCard from "./UpgradeCard.svelte";
  import { fly } from "svelte/transition";
  import Icon from "$lib/components/ui/atoms/Icon.svelte";

  const recommendations = $derived(calculatorState.recommendations);
  const incompatibleUpgrades = $derived(calculatorState.incompatibleUpgrades);
  const activeUpgrade = $derived(calculatorState.activeUpgrade);

  let showIncompatible = $state(false);
</script>

<div class="space-y-8">
  <div class="flex items-center justify-between px-1">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-bold text-text-primary tracking-tight">
          Upgrade Simulator
        </h2>
        <span
          class="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider mt-1"
        >
          For: {calculatorState.activePresetName}
        </span>
      </div>
      <p class="text-sm text-text-secondary">
        Simulate hardware modifications to see their impact on range and speed.
      </p>
    </div>

    {#if activeUpgrade}
      <button
        onclick={clearSimulation}
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all uppercase tracking-wider"
      >
        <Icon name="efficiency" size="xs" />
        Reset System
      </button>
    {/if}
  </div>

  {#if recommendations.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each recommendations as upgrade, i}
        <div transition:fly={{ y: 20, delay: i * 100, duration: 400 }}>
          <UpgradeCard {upgrade} />
        </div>
      {/each}
    </div>
  {:else}
    <div
      class="bg-bg-secondary rounded-2xl p-12 border border-white/5 text-center space-y-4 shadow-sm"
    >
      <div
        class="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success border border-success/20"
      >
        <Icon name="efficiency" size="lg" />
      </div>
      <div class="space-y-2">
        <h3 class="text-xl font-bold text-text-primary">
          Peak Performance Reached
        </h3>
        <p class="text-sm text-text-secondary max-w-md mx-auto">
          Your current configuration is highly optimized. No critical
          bottlenecks or immediate hardware upgrades are recommended at this
          stage.
        </p>
      </div>
    </div>
  {/if}

  <!-- Incompatible Upgrades Section -->
  <div class="pt-8 border-t border-white/5 space-y-6">
    <div class="flex items-center justify-between px-1">
      <div class="space-y-1">
        <h3 class="text-lg font-bold text-text-primary tracking-tight">
          Experimental Upgrades
        </h3>
        <p class="text-xs text-text-tertiary">
          View modifications that are not currently recommended for your
          configuration.
        </p>
      </div>

      <button
        onclick={() => (showIncompatible = !showIncompatible)}
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-text-tertiary hover:bg-white/5 hover:text-text-secondary transition-all uppercase tracking-wider"
      >
        <Icon name={showIncompatible ? "eye" : "eye-off"} size="xs" />
        {showIncompatible ? "Hide All" : "Show All Potential"}
      </button>
    </div>

    {#if showIncompatible}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80"
      >
        {#each incompatibleUpgrades as upgrade, i}
          <div transition:fly={{ y: 20, delay: i * 50, duration: 400 }}>
            <UpgradeCard {upgrade} isExperimental={true} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
