<script lang="ts">
  let {
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon = '',
    iconPosition = 'left',
    fullWidth = false,
    class: className = '',
    type = 'button',
    onClick,
    ...props
  }: {
    children?: import('svelte').Snippet;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    class?: string;
    type?: 'button' | 'submit' | 'reset';
    onClick?: (e: MouseEvent) => void;
  } = $props();

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-primary hover:bg-primaryHover text-textOnPrimary focus:ring-2 focus:ring-primary/50',
      secondary: 'bg-tertiary border border-gray-600 text-textMain hover:bg-hover focus:ring-2 focus:ring-primary/50',
      ghost: 'bg-transparent text-textMain hover:bg-hover/50 focus:ring-2 focus:ring-primary/50',
      danger: 'bg-danger hover:bg-dangerHover text-textOnPrimary focus:ring-2 focus:ring-danger/50',
      success: 'bg-success hover:bg-successHover text-textOnPrimary focus:ring-2 focus:ring-success/50',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      xs: 'px-2.5 py-1.5 text-sm',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-body',
      lg: 'px-6 py-3 text-h3',
      xl: 'px-8 py-4 text-h2',
    };
    return sizes[size];
  };

  const baseClasses = $derived(
    `inline-flex items-center justify-center font-medium rounded-radius-button
    transition-all duration-normal ease-out focus:outline-none
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
    ${fullWidth ? 'w-full' : ''}
    ${className}`
  );
</script>

<button
  {type}
  disabled={disabled || loading}
  class={baseClasses}
  aria-disabled={disabled || loading}
  aria-busy={loading}
  onclick={onClick}
  {...props}
>
  {#if loading}
    <span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></span>
  {/if}
  
  {#if icon && iconPosition === 'left'}
    <span class="mr-2" aria-hidden="true">{icon}</span>
  {/if}
  
  {#if children}
    {@render children()}
  {:else}
    <span>Button</span>
  {/if}
  
  {#if icon && iconPosition === 'right'}
    <span class="ml-2" aria-hidden="true">{icon}</span>
  {/if}
</button>

<style>
  button {
    touch-action: manipulation;
  }
  
  button:focus-visible {
    outline: 2px solid var(--brand-primary);
    outline-offset: 2px;
  }
  
  button:focus:not(:focus-visible) {
    outline: none;
  }
  
  /* Mobile: Ensure minimum touch target */
  @media (max-width: 640px) {
    button {
      min-height: 44px;
      min-width: 44px;
    }
  }
</style>
