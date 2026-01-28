import type { Config } from 'tailwindcss';

/**
 * OneOhm EPC Web - Tailwind Configuration
 * Colors and theme matched with mobile app (oneohm-epc-mobile/src/core/theme/tokens.ts)
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // Brand Colors (from mobile tokens.ts)
        // ============================================
        primary: {
          DEFAULT: '#76c044',
          dark: '#5ea031',
          light: '#8fd055',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#0d74b8',
          dark: '#0a5c92',
          light: '#1089e0',
          foreground: '#ffffff',
        },
        tagline: '#025580',

        // ============================================
        // Semantic Colors
        // ============================================
        success: {
          DEFAULT: '#76c044',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#EAB308',
          foreground: '#ffffff',
        },
        error: {
          DEFAULT: '#DC2626',
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: '#0d74b8',
          foreground: '#ffffff',
        },

        // ============================================
        // Status Colors (for badges, indicators)
        // ============================================
        status: {
          active: '#76c044',
          pending: '#EAB308',
          inactive: '#9CA3AF',
          completed: '#76c044',
          cancelled: '#DC2626',
        },

        // ============================================
        // Background Colors
        // ============================================
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6',
        },

        // ============================================
        // Text/Foreground Colors
        // ============================================
        foreground: {
          DEFAULT: '#111827',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
          inverse: '#FFFFFF',
        },

        // ============================================
        // Border Colors
        // ============================================
        border: {
          DEFAULT: '#E5E7EB',
          light: '#E5E7EB',
          medium: '#D1D5DB',
          dark: '#9CA3AF',
        },

        // ============================================
        // Gray Scale (from mobile tokens.ts)
        // ============================================
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },

        // ============================================
        // Extended Color Palettes (from mobile tokens.ts)
        // ============================================
        green: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        red: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        blue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        purple: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED',
          800: '#6B21A8',
          900: '#581C87',
        },
        yellow: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
        },
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        // ============================================
        // shadcn/ui compatibility
        // ============================================
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#111827',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#111827',
        },
        muted: {
          DEFAULT: '#F3F4F6',
          foreground: '#6B7280',
        },
        accent: {
          DEFAULT: '#F3F4F6',
          foreground: '#111827',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#ffffff',
        },
        input: '#E5E7EB',
        ring: '#76c044',
        chart: {
          '1': '#76c044',
          '2': '#0d74b8',
          '3': '#EAB308',
          '4': '#9333EA',
          '5': '#F97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
        '6xl': '64px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
