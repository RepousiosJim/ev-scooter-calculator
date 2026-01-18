<script lang="ts">
  let {
    title,
    class: className = '',
    children,
    variant = 'default',
    hover = false,
    glow = false,
    subtitle = '',
    icon = ''
  }: {
    title?: string;
    class?: string;
    children?: import('svelte').Snippet;
    variant?: 'default' | 'gradient' | 'glass' | 'elevated';
    hover?: boolean;
    glow?: boolean;
    subtitle?: string;
    icon?: string;
  } = $props();

  const getVariantClasses = () => {
    const variants = {
      default: 'bg-bg-secondary border-white/5',
      gradient: 'bg-gradient-card border-white/10',
      glass: 'glass border-white/10',
      elevated: 'bg-bg-secondary border-white/5 shadow-2xl'
    };
    return variants[variant];
  };

  const getHoverClasses = () => {
    return hover ? 'hover:shadow-lg hover:-translate-y-0.5 hover:border-white/10' : '';
  };

  const getGlowClasses = () => {
    return glow ? 'shadow-glow-sm' : '';
  };
</script>

<div class="rounded-xl p-6 border shadow-lg transition-all duration-slow
  {getVariantClasses()} {getHoverClasses()} {getGlowClasses()} {className}">
  {#if title || subtitle}
    <div class="mb-5">
      <div class="flex items-start gap-3">
        {#if icon}
          <span class="text-2xl mt-0.5" aria-hidden="true">{icon}</span>
        {/if}
        <div class="flex-1">
          {#if title}
            <h2 class="text-h2 font-semibold text-text-primary">{title}</h2>
          {/if}
          {#if subtitle}
            <p class="text-body-sm text-text-secondary mt-1">{subtitle}</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>
