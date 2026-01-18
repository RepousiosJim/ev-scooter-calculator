<script lang="ts">
  let {
    content,
    position = 'top',
    shown = false,
    ...props
  }: {
    content: string;
    position?: 'top' | 'right' | 'bottom' | 'left';
    shown?: boolean;
  } = $props();

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    };
    return positions[position];
  };

  const getArrowClasses = () => {
    const arrows = {
      top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-r-transparent border-b-transparent border-l-transparent rotate-180',
      right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-700 border-t-transparent border-b-transparent border-l-transparent -rotate-90',
      bottom: 'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-r-transparent border-b-transparent border-l-transparent',
      left: 'right-full top-1/2 -translate-y-1/2 border-l-gray-700 border-t-transparent border-b-transparent border-r-transparent rotate-90',
    };
    return arrows[position];
  };
</script>

<div class="relative inline-block" {...props}>
  <!-- Tooltip Content -->
  {#if shown}
    <div
      role="tooltip"
      class={`absolute z-tooltip max-w-xs px-3 py-2 bg-gray-700 text-white text-sm rounded-md shadow-lg animate-tooltip-pop ${getPositionClasses()}`}
    >
      {content}
    </div>
  {/if}

  <!-- Arrow -->
  {#if shown}
    <div
      class={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
      aria-hidden="true"
    ></div>
  {/if}
</div>
