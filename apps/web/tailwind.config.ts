import type { Config } from 'tailwindcss';

/**
 * OneOhm EPC - Tailwind Configuration
 * V2 Design System - Single Source of Truth
 *
 * Reference: apps/ux/web/v2/STYLE-GUIDE.md
 * Reference: apps/ux/web/v2/components/theme.html
 *
 * NOTE: This file defines ALL theme tokens.
 * globals.css only contains base styles and complex CSS.
 */
const config: Config = {
  darkMode: ['class', '.dark'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#f3fae8',
          '100': '#e4f4cc',
          '200': '#c9e99a',
          '300': '#a7db5e',
          '400': '#8acd32',
          '500': 'var(--ds-primary)',
          '600': '#5ea031',
          '700': '#477826',
          '800': '#3a5f20',
          '900': '#32511e',
          '950': '#1a2c0f',
          DEFAULT: 'var(--ds-primary)',
          /**
           * Resolved: was #5ea031 here while `lib/theme/mui-theme.ts` and the
           * DS both said #4D7C0F — a three-way drift.
           *
           * Adopting the DS value is not merely tidier, it fixes an
           * accessibility failure: 14 of the 18 usages are `text-primary-dark`
           * (or its hover), and #5ea031 on white is **3.21:1** — under the
           * WCAG AA 4.5:1 floor for normal text. #4D7C0F reaches 4.99:1.
           *
           * Visibly darker in the sidebar active state and inline links.
           */
          dark: 'var(--ds-primary-dark)',
          light: 'var(--ds-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--ds-secondary)',
          dark: 'var(--ds-secondary-dark)',
          light: 'var(--ds-secondary-light)',
        },
        // NOTE: these bare names are the VIVID FILLS in this config, which is
        // the opposite of the DS convention (there, bare = readable
        // foreground and `-main` = fill). Hence the `-main` tokens here.
        success: {
          DEFAULT: 'var(--ds-success-main)',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: 'var(--ds-warning-main)',
          foreground: '#ffffff',
        },
        error: {
          DEFAULT: 'var(--ds-danger)',
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: 'var(--ds-info-main)',
          foreground: '#ffffff',
        },
        /**
         * Warm stone, replacing the previous cool zinc ramp. Step-for-step
         * the lightness matches what it replaced (max contrast delta 0.27),
         * so no existing text/background pair changes its WCAG standing.
         */
        gray: {
          '50': 'var(--ds-neutral-50)',
          '100': 'var(--ds-neutral-100)',
          '200': 'var(--ds-neutral-200)',
          '300': 'var(--ds-neutral-300)',
          '400': 'var(--ds-neutral-400)',
          '500': 'var(--ds-neutral-500)',
          '600': 'var(--ds-neutral-600)',
          '700': 'var(--ds-neutral-700)',
          '800': 'var(--ds-neutral-800)',
          '900': 'var(--ds-neutral-900)',
          '950': 'var(--ds-neutral-950)',
        },
        background: {
          DEFAULT: 'var(--ds-surface)',
          secondary: 'var(--ds-canvas)',
          tertiary: 'var(--ds-canvas-sunken)',
        },
        surface: {
          DEFAULT: 'var(--ds-surface)',
          secondary: 'var(--ds-canvas)',
          raised: 'var(--ds-surface)',
          // The zebra stripe tone — every other table row sits on this.
          alt: 'var(--ds-surface-alt)',
        },
        foreground: {
          DEFAULT: 'var(--ds-text-primary)',
          secondary: 'var(--ds-text-secondary)',
          /**
           * Maps to the ramp's 500 step (#78716C, 4.80:1), NOT the DS
           * `text-tertiary` (#A8A29E, 2.52:1). The names line up but the
           * values do not: this token carries small copy like panel section
           * headers, and taking the DS value would silently fail WCAG AA.
           */
          tertiary: 'var(--ds-neutral-500)',
          /** Decorative/disabled only — 2.52:1, never load-bearing text. */
          muted: 'var(--ds-text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--ds-hairline)',
          light: 'var(--ds-canvas-sunken)',
          medium: 'var(--ds-neutral-300)',
        },
        card: {
          DEFAULT: 'var(--ds-surface)',
          foreground: 'var(--ds-text-primary)',
        },
        popover: {
          DEFAULT: 'var(--ds-surface)',
          foreground: 'var(--ds-text-primary)',
        },
        muted: {
          DEFAULT: 'var(--ds-canvas)',
          foreground: 'var(--ds-neutral-500)',
        },
        accent: {
          DEFAULT: 'var(--ds-canvas)',
          foreground: 'var(--ds-text-primary)',
          // Selected-row / selected-state tint, matching MUI's Mui-selected.
          subtle: 'var(--ds-accent-subtle)',
        },
        destructive: {
          DEFAULT: 'var(--ds-danger)',
          foreground: '#ffffff',
        },
        input: 'var(--ds-hairline)',
        ring: 'var(--ds-accent)',
        chart: {
          '1': 'var(--ds-chart-1)',
          '2': 'var(--ds-chart-2)',
          '3': 'var(--ds-chart-3)',
          // NOT bridged: DS says chart-4 #0EA5E9 and chart-5 #4D7C0F. These
          // change visibly, and `lib/charts/palette.ts` disagrees with BOTH
          // today — the whole chart ramp is reconciled in one deliberate step.
          '4': '#9333ea',
          '5': '#f97316',
        },
        sidebar: {
          DEFAULT: 'var(--ds-surface)',
          foreground: 'var(--ds-text-primary)',
          primary: 'var(--ds-primary)',
          'primary-foreground': '#ffffff',
          accent: 'var(--ds-canvas)',
          'accent-foreground': 'var(--ds-text-primary)',
          border: 'var(--ds-hairline)',
          ring: 'var(--ds-accent)',
        },
        highlight: {
          DEFAULT: '#fef08a',
          foreground: '#713f12',
        },
      },
      /**
       * next/font already bakes the full fallback chain into these variables
       * (`geistSans, "geistSans Fallback", Inter, -apple-system, …`), so
       * repeating the stack here only duplicates it in every computed style.
       */
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        /** Geist Mono — IDs, kWh readings, coordinates, invoice numbers. */
        mono: ['var(--font-geist-mono)'],
      },
      fontSize: {
        nano: [
          '0.5rem',
          {
            lineHeight: '0.625rem',
          },
        ],
        micro: [
          '0.5625rem',
          {
            lineHeight: '0.75rem',
          },
        ],
        '2xs': [
          '0.6875rem',
          {
            lineHeight: '1rem',
          },
        ],
        xs: [
          '0.75rem',
          {
            lineHeight: '1rem',
          },
        ],
        sm: [
          '0.8125rem',
          {
            lineHeight: '1.25rem',
          },
        ],
        base: [
          '0.875rem',
          {
            lineHeight: '1.375rem',
          },
        ],
        lg: [
          '1rem',
          {
            lineHeight: '1.5rem',
          },
        ],
        xl: [
          '1.125rem',
          {
            lineHeight: '1.75rem',
          },
        ],
        '2xl': [
          '1.25rem',
          {
            lineHeight: '1.75rem',
          },
        ],
        '3xl': [
          '1.5rem',
          {
            lineHeight: '2rem',
          },
        ],
        '4xl': [
          '1.875rem',
          {
            lineHeight: '2.25rem',
          },
        ],
        section: [
          '0.625rem',
          {
            lineHeight: '0.875rem',
          },
        ],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.01em',
        wider: '0.025em',
        widest: '0.05em',
      },
      lineHeight: {
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
      },
      spacing: {
        // ========== LAYOUT ==========
        header: '48px',
        rail: '48px',
        'rail-icon': '36px',
        panel: '200px',
        'panel-item': '30px',
        'panel-header': '48px',
        'content-offset': '248px',
        'sidebar-item': '32px',
        'sidebar-px': '12px',

        // ========== ICONS ==========
        // Usage: size-icon-sm, w-icon, h-icon-lg, etc.
        'icon-2xs': '12px', // Extra tiny icons (w-3)
        'icon-xs': '14px', // Tiny icons, micro badges
        'icon-sm': '16px', // Small icons (w-4)
        icon: '18px', // Default nav icons
        'icon-md': '20px', // Medium icons (w-5)
        'icon-lg': '24px', // Large icons (w-6)
        'icon-xl': '32px', // Extra large icons (w-8)
        'icon-2xl': '40px', // 2XL icons (w-10)

        // ========== CONTAINERS ==========
        // Icon containers, avatar backgrounds, etc.
        'container-xs': '24px', // 24px (size-6)
        'container-sm': '32px', // 32px (size-8)
        'container-md': '40px', // 40px (size-10)
        'container-lg': '48px', // 48px (size-12)
        'container-xl': '64px', // 64px (size-16)
        'container-2xl': '80px', // 80px (size-20)
        'container-3xl': '96px', // 96px (size-24)
        'container-4xl': '128px', // 128px (size-32)

        // ========== BUTTONS ==========
        'btn-sm': '28px',
        'btn-md': '32px',
        'btn-lg': '36px',
        'btn-px-sm': '10px',
        'btn-px-md': '12px',
        'btn-px-lg': '16px',

        // ========== INPUTS ==========
        'input-sm': '28px',
        'input-md': '32px',
        'input-lg': '36px',
        'input-px': '12px',

        // ========== FORM CONTROLS ==========
        'checkbox-sm': '16px',
        'checkbox-md': '20px',
        'checkbox-lg': '24px',
        'radio-indicator-sm': '8px',
        'radio-indicator-md': '10px',
        'radio-indicator-lg': '12px',
        'switch-track-w': '44px',
        'switch-track-h': '24px',
        'switch-thumb': '20px',

        // ========== TABLE ==========
        'table-row': '44px',
        'table-header': '40px',
        'table-cell-x': '12px',
        'table-cell-y': '8px',

        // ========== PAGE & CARDS ==========
        page: '20px',
        'page-lg': '24px',
        card: '16px',
        'card-lg': '20px',

        // ========== COMPONENT SPECIFIC ==========
        'sheet-mobile': '280px', // Mobile nav sheet width
        'dropdown-min': '128px', // Min dropdown width (8rem)
        popover: '288px', // Popover width (18rem / w-72)
        tooltip: '256px', // Tooltip width (16rem / w-64)
        'sidebar-tabs': '192px', // Sidebar tabs width (12rem / w-48)
        'textarea-min-h': '100px', // Textarea min height
        'dropdown-max-h': '300px', // Dropdown max height
        'search-max-h': '320px', // Search results max height (max-h-80)
        'email-truncate': '150px', // Email truncation width
        'select-compact': '70px', // Compact select width
        'pagination-btn': '40px', // Pagination button size

        // ========== PROGRESS & STEPPER ==========
        'progress-xs': '2px',
        'progress-sm': '4px',
        'progress-md': '8px',
        'progress-lg': '12px',
        'progress-xl': '16px',
        'stepper-line': '16px', // Stepper connector height (h-16 = 64px for vertical)

        // ========== SEPARATOR ==========
        separator: '1px', // Hairline separator
      },
      borderWidth: {
        DEFAULT: '1px',
        '0': '0px',
        '1.5': '1.5px', // Input borders
        '2': '2px',
        '3': '3px', // Avatar status indicator
        '4': '4px',
      },
      ringWidth: {
        DEFAULT: '2px',
        '0': '0px',
        '1': '1px',
        '2': '2px',
        focus: '3px', // Standard focus ring
        '4': '4px',
        '8': '8px',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
        // Premium, soft layered card shadow for panels and overview cards.
        card: '0 2px 4px 0 rgba(16, 24, 40, 0.02), 0 4px 12px 0 rgba(16, 24, 40, 0.04)',
        'card-hover':
          '0 8px 24px -4px rgba(16, 24, 40, 0.06), 0 4px 12px -2px rgba(16, 24, 40, 0.04)',
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        'modal-backdrop': '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
        toast: '1080',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
        slower: '500ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-out': {
          '0%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
          },
        },
        'slide-in-right': {
          '0%': {
            transform: 'translateX(100%)',
          },
          '100%': {
            transform: 'translateX(0)',
          },
        },
        'slide-out-right': {
          '0%': {
            transform: 'translateX(0)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'wave-drift': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-80px)' },
        },
        'wave-drift-reverse': {
          '0%': { transform: 'translateX(40px)' },
          '100%': { transform: 'translateX(-40px)' },
        },
        'attention-ripple': {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease forwards',
        'fade-out': 'fade-out 0.2s ease forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.2s ease-in',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'wave-drift': 'wave-drift 12s linear infinite',
        'wave-drift-reverse': 'wave-drift-reverse 16s linear infinite',
        'attention-ripple': 'attention-ripple 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
