<script lang="ts">
  let {
    value = 0,
    max = 100,
    min = 0,
    label,
    showPercentage = true,
    variant = 'default',
    size = 'md',
    animated = true,
    class: className = '',
    ...props
  }: {
    value: number;
    max?: number;
    min?: number;
    label?: string;
    showPercentage?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
    class?: string;
  } = $props();

  const percentage = $derived(
    Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  );

  const getVariantClasses = () => {
    const variants = {
      default: 'bg-gray-600',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger',
      info: 'bg-info',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };
    return sizes[size];
  };
</script>

<div class={`flex flex-col gap-1 ${className}`}>
  {#if label}
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-textSecondary">{label}</span>
      {#if showPercentage}
        <span class="text-sm font-semibold text-textMain font-number">{percentage.toFixed(0)}%</span>
      {/if}
    </div>
  {/if}

  <div
    class="relative w-full rounded-full overflow-hidden bg-gray-700"
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-label={label || 'Progress'}
  >
    <div
      class={`absolute top-0 left-0 h-full rounded-full transition-all duration-slow ease-out
        ${getVariantClasses()}
        ${animated ? 'animate-progress-fill' : ''}
      `}
      style="width: {percentage}%"
    ></div>
  </div>
</div>

<style>
  .animate-progress-fill {
    animation: progressFill 0.6s ease-out;
  }
</style>
