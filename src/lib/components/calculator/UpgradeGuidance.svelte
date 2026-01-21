<script lang="ts">
  import Icon from "$lib/components/ui/atoms/Icon.svelte";
  import DifficultyBar from "$lib/components/ui/DifficultyBar.svelte";

  const guidance = [
    {
      title: "Battery Expansion",
      difficulty: "moderate",
      icon: "bolt",
      description:
        "Adding capacity via parallel packs or higher-density cells.",
      benefits: [
        "Direct range increase",
        "Reduced voltage sag",
        "Less strain on cells",
      ],
      risks: [
        "Increased weight",
        "Needs deck space",
        "BMS compatibility issues",
      ],
    },
    {
      title: "Controller Swaps",
      difficulty: "hard",
      icon: "efficiency",
      description: "Upgrading the logic unit to unlock higher amp delivery.",
      benefits: [
        "Major torque gain",
        "Custom throttle curves",
        "Higher max speed potential",
      ],
      risks: ["Thermal management needs", "Battery strain", "Complexity"],
    },
    {
      title: "Motor Modification",
      difficulty: "moderate",
      icon: "speed",
      description: "Rewinding or replacing motors for different KV ratings.",
      benefits: [
        "Speed vs Torque tuning",
        "Improved heat dissipation",
        "Higher efficiency",
      ],
      risks: ["Mechanical teardown required", "Warranty voided"],
    },
  ];
</script>

<div class="space-y-12">
  <div class="px-1 space-y-2">
    <h2 class="text-2xl font-bold text-text-primary tracking-tight">
      Technical Guidance
    </h2>
    <p class="text-sm text-text-secondary">
      Reference for common hardware modifications and their typical impact
      profile.
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    {#each guidance as item}
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5"
          >
            <Icon name={item.icon} size="md" />
          </div>
          <div>
            <h3 class="font-bold text-text-primary">{item.title}</h3>
            <DifficultyBar difficulty={item.difficulty as any} size="sm" />
          </div>
        </div>

        <p class="text-sm text-text-secondary leading-relaxed">
          {item.description}
        </p>

        <div class="space-y-4">
          <div class="space-y-2">
            <h4
              class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest"
            >
              Typical Benefits
            </h4>
            <ul class="space-y-1.5">
              {#each item.benefits as benefit}
                <li class="text-xs text-text-secondary flex items-start gap-2">
                  <span class="text-success mt-1">•</span>
                  {benefit}
                </li>
              {/each}
            </ul>
          </div>

          <div class="space-y-2">
            <h4
              class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest"
            >
              Main Tradeoffs
            </h4>
            <ul class="space-y-1.5 opacity-70">
              {#each item.risks as risk}
                <li class="text-xs text-text-secondary flex items-start gap-2">
                  <span class="text-warning mt-1">•</span>
                  {risk}
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div
    class="p-6 rounded-2xl bg-warning/5 border border-warning/10 flex items-start gap-4"
  >
    <div class="text-warning mt-1"><Icon name="efficiency" size="sm" /></div>
    <div class="space-y-1">
      <h4 class="text-sm font-bold text-text-primary">Safety Protocol</h4>
      <p class="text-xs text-text-secondary leading-relaxed">
        DIY upgrades involve high-voltage systems and lithium-ion volatility.
        Always use fused connections and ensure your BMS can handle modified
        discharge rates.
      </p>
    </div>
  </div>
</div>
