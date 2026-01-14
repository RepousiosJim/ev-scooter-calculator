<script lang="ts">
  let { 
    difficulty, 
    showLabel = true, 
    size = 'md' 
  }: { 
    difficulty: 'easy' | 'moderate' | 'hard'; 
    showLabel?: boolean;
    size?: 'sm' | 'md';
  } = $props();

  const segments = 3;
  const filledSegments = $state(difficulty === 'easy' ? 1 : difficulty === 'moderate' ? 2 : 3);
  const fillColor = $state(difficulty === 'easy' ? 'bg-success' : difficulty === 'moderate' ? 'bg-warning' : 'bg-danger');
  const textColor = $state(difficulty === 'easy' ? 'text-success' : difficulty === 'moderate' ? 'text-warning' : 'text-danger');
  const heightClass = $state(size === 'sm' ? 'h-1.5' : 'h-2');
  const barHeightClass = $state(size === 'sm' ? 'h-1' : 'h-1.5');
  const textSizeClass = $state(size === 'sm' ? 'text-[10px]' : 'text-xs');
  const barWidthClass = $state(size === 'sm' ? 'w-12' : 'w-16');
</script>

<div class="flex items-center gap-2">
  {#if showLabel}
    <span class={`${textSizeClass} uppercase font-medium ${textColor}`}>
      {difficulty}
    </span>
  {/if}
  
  <div class={`flex gap-0.5 ${barWidthClass}`}>
    {#each Array(segments) as _, i}
      <div 
        class={`flex-1 rounded-sm ${barHeightClass} transition-colors ${
          i < filledSegments ? fillColor : 'bg-gray-700'
        }`}
        aria-label={`${difficulty} difficulty: ${i + 1} of ${segments} segments`}
      ></div>
    {/each}
  </div>
</div>
