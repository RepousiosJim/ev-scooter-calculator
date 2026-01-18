<script lang="ts">
  let {
    children,
    variant = 'default',
    glow = false,
    hover = false,
    className = ''
  }: {
    children: import('svelte').Snippet;
    variant?: 'default' | 'gradient' | 'glass' | 'outline';
    glow?: boolean;
    hover?: boolean;
    className?: string;
  } = $props();

  const getBaseClasses = () => {
    const base = 'rounded-xl p-6 border transition-all duration-300';
    
    const variants = {
      default: 'bg-bg-card border-white/5 shadow-lg',
      gradient: 'bg-gradient-card border-white/10 shadow-lg',
      glass: 'glass border-white/10',
      outline: 'bg-transparent border-white/20'
    };

    const glowClass = glow ? 'shadow-glow' : '';
    const hoverClass = hover ? 'card-lift hover:border-primary/30' : '';

    return `${base} ${variants[variant]} ${glowClass} ${hoverClass} ${className}`;
  };
</script>

<div class={getBaseClasses()}>
  {@render children()}
</div>
