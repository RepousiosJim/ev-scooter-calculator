<script lang="ts">
  interface Stage {
    label: string;
    icon: string;
    count: number;
    sub: string;
  }

  interface Props {
    stages: Stage[];
    activeStage: number;
  }

  let { stages, activeStage }: Props = $props();
</script>

<div class="flex items-center justify-center gap-0 py-4">
  {#each stages as stage, i (i)}
    {@const isActive = i === activeStage}
    {#if i > 0}
      <div class="w-8 h-0.5 {i <= activeStage ? 'bg-cyan-500' : 'bg-white/10'}"></div>
    {/if}
    <div
      class="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border transition-all
					{isActive ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5' : 'bg-[#12121a] border-white/10'}"
    >
      <span class="text-lg">{stage.icon}</span>
      <span class="text-xl font-bold {isActive ? 'text-cyan-400' : 'text-white'}">{stage.count}</span>
      <span class="text-[10px] uppercase tracking-wider {isActive ? 'text-cyan-400' : 'text-gray-500'}"
        >{stage.label}</span
      >
      <span class="text-[9px] text-gray-600">{stage.sub}</span>
    </div>
  {/each}
</div>
