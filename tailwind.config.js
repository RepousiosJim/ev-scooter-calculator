/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  safelist: [/^bg-/, /^text-/],
  theme: {
    extend: {
      // Brand Colors
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          light: 'var(--color-secondary-light)',
        },
        // Background Colors
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          input: 'var(--color-bg-input)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)',
        },
        // Text Colors
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          onPrimary: 'var(--color-text-on-primary)',
        },
        // Semantic Colors
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
          hover: 'var(--color-success-hover)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
          hover: 'var(--color-warning-hover)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light: 'var(--color-danger-light)',
          hover: 'var(--color-danger-hover)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
          hover: 'var(--color-info-hover)',
        },
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-glow': 'var(--gradient-glow)',
        'gradient-hover': 'var(--gradient-hover)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-warning': 'var(--gradient-warning)',
        'gradient-danger': 'var(--gradient-danger)',
        'gradient-info': 'var(--gradient-info)',
      },
      // Typography System
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        h1: ['var(--font-display)', 'sans-serif'],
        h2: ['var(--font-display)', 'sans-serif'],
        h3: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        data: ['var(--font-data)', 'monospace'],
        mono: ['var(--font-data)', 'monospace'],
      },
      fontSize: {
        // Display sizes
        'display-xl': ['48px', { lineHeight: '56px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['40px', { lineHeight: '48px', fontWeight: '700', letterSpacing: '-0.015em' }],
        'display': ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.01em' }],
        // Heading sizes
        'h1': ['24px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.005em' }],
        'h2': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'h3': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'h4': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        // Body sizes
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-xs': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        // Label sizes
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }],
        'label': ['13px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }],
        'label-sm': ['11px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }],
        // Data/Number sizes
        'data-xl': ['40px', { lineHeight: '48px', fontWeight: '700', fontFamily: 'var(--font-data)' }],
        'data-lg': ['32px', { lineHeight: '40px', fontWeight: '600', fontFamily: 'var(--font-data)' }],
        'data': ['24px', { lineHeight: '32px', fontWeight: '500', fontFamily: 'var(--font-data)' }],
        'data-sm': ['16px', { lineHeight: '24px', fontWeight: '500', fontFamily: 'var(--font-data)' }],
        'data-xs': ['14px', { lineHeight: '20px', fontWeight: '500', fontFamily: 'var(--font-data)' }],
      },
      // Spacing System (8px base)
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
      },
      // Border Radius System
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      // Box Shadow System (4 levels)
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.3)',
        'glow': '0 0 20px rgba(0, 212, 255, 0.4)',
        'glow-lg': '0 0 30px rgba(0, 212, 255, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
      },
      // Transition Durations
      transitionDuration: {
        'instant': 'var(--duration-instant)',
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
        'slower': 'var(--duration-slower)',
      },
      // Transition Timing Functions
      transitionTimingFunction: {
        'out': 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      // Animations
      animation: {
        'value-update': 'valueUpdate 0.2s ease-out',
        'card-entry': 'cardEntry 0.4s ease-out backwards',
        'success-pulse': 'successPulse 0.6s ease-out',
        'progress-fill': 'progressFill 0.6s ease-out',
        'tooltip-pop': 'tooltipPop 0.15s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'panel-expand': 'panelExpand 0.3s ease-out',
        'grade-change': 'gradeChange 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        valueUpdate: {
          '0%': { transform: 'scale(1.1)', opacity: '0.8' },
          '50%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        cardEntry: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        successPulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(16, 185, 129, 0)' },
          '50%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' },
        },
        progressFill: {
          'from': { width: '0%' },
        },
        tooltipPop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { transform: 'translateX(-100%)' },
          'to': { transform: 'translateX(0)' },
        },
        scaleIn: {
          'from': { transform: 'scale(0.95)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
        panelExpand: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        gradeChange: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // Z-Index Layers
      zIndex: {
        base: '0',
        dropdown: '10',
        sticky: '20',
        fixed: '30',
        modalBackdrop: '40',
        modal: '50',
        popover: '60',
        tooltip: '70',
        toast: '80',
        max: '9999',
      },
    },
  },
  plugins: [],
}
