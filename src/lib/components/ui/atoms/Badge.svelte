<script lang="ts">
  let {
    text,
    variant = 'default',
    size = 'md',
    icon = '',
    class: className = '',
  }: {
    text: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    icon?: string;
    class?: string;
  } = $props();

  const getVariantClasses = () => {
    const variants = {
      default: 'bg-tertiary text-textMain border-gray-600',
      primary: 'bg-primary/10 text-primary border-primary/30',
      success: 'bg-success/10 text-success border-success/30',
      warning: 'bg-warning/10 text-warning border-warning/30',
      danger: 'bg-danger/10 text-danger border-danger/30',
      info: 'bg-info/10 text-info border-info/30',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-sm',
    };
    return sizes[size];
  };
</script>

<span
  class={`inline-flex items-center gap-1.5 rounded-full border font-medium
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${className}`}
  role="status"
>
  {#if icon}
    <span aria-hidden="true">{icon}</span>
  {/if}
  {text}
</span>
