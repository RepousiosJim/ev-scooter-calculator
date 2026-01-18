<script lang="ts">
  let {
    name,
    size = 'md',
    class: className = '',
    ariaLabel,
    ...props
  }: {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    class?: string;
    ariaLabel?: string;
  } = $props();

  const iconMap: Record<string, string> = {
    // Core UI icons
    'chevron-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>',
    'chevron-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>',
    'chevron-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6"/></svg>',
    'chevron-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>',
    'close': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/></svg>',
    'menu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>',
    'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
    'settings': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 00.01.05V4a2 2 0 002 2h.44a2 2 0 002-2V4.23a2 2 0 00-.01-.05V4a2 2 0 00-2-2zm0 18a2 2 0 01-2 2h-.44a2 2 0 01-2-2v-.18a2 2 0 00-.01-.05V18a2 2 0 012-2h.44a2 2 0 012 2v.18a2 2 0 00.01.05V22a2 2 0 012-2z"/></svg>',
    'info': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 8h.01"/></svg>',
    'warning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-2.42 0zM12 9v9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 17h.01"/></svg>',
    'error': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 9l-6 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l6 6"/></svg>',
    'success': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 11.08V12a10 10 0 11-20 0v1.08a6 6 0 012 .085A6 6 0 0012 22.1a6 6 0 002-.085V22a10 10 0 1120-0v-.92a6 6 0 00-2-.085zM11.08 17h1.84"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 9l-3-3-3 3"/></svg>',
    'star': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    'star-outline': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    
    // Calculator-specific icons
    'battery': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M23 13v-2"/><path stroke-linecap="round" stroke-linejoin="round" d="M23 13v-2"/></svg>',
    'speed': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 12l-4-4"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 12l4-4"/></svg>',
    'acceleration': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 2L3 14h9l-1-12z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 2L3 14h9l-1-12z"/></svg>',
    'range': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2 12h20"/><path stroke-linecap="round" stroke-linejoin="round" d="M2 12h20"/></svg>',
    'motor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l-.06.06a2 2 0 01-1.84-1.27 2 2 0 01-1.57 1.18l-4.24 5.72a1 1 0 00-1.38.5 2 2 0 00-.48-.28L7.12 13H3.64a1 1 0 00-1 .74V9.6a1 1 0 011-1.29l.58-4a1 1 0 00.76-1.38L7 4.25a1 1 0 00-.63-.26l-4 2.27a1 1 0 00-.4 1.57l.06.06a1.65 1.65 0 00.33-1.82l1.85-3.23a2 2 0 01.42-1.9 2 2 0 01-.63-.26L2.17 5.36a2 2 0 01-.45-1.77l1.83-4.13a1 1 0 00.76-1.38L7.1 1.26a1 1 0 00-1.29-.76V9.6a1 1 0 00.25-.92L10 2.88a2 2 0 01.42-1.9z"/></svg>',
    'controller': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><circle cx="12" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/></svg>',
    'save': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21l-5-5"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 21l-5-5"/></svg>',
    'upload': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    'download': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    'copy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    'share': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M8.59 13.51l6.83 3.98"/><path stroke-linecap="round" stroke-linejoin="round" d="M15.41 6.51l-6.83-3.98"/><path stroke-linecap="round" stroke-linejoin="round" d="M15.41 6.51l-6.83-3.98"/></svg>',
  };

  const getSizeClasses = () => {
    const sizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
      '2xl': 'w-10 h-10',
    };
    return sizes[size];
  };

  const iconSvg = $derived(iconMap[name] || '');
</script>

<span
  class={`inline-flex items-center justify-center ${getSizeClasses()} ${className}`}
  aria-label={ariaLabel}
  aria-hidden={!ariaLabel}
>
  {@html iconSvg}
</span>
