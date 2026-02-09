import type { Config } from "tailwindcss";

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
  darkMode: ["class", ".dark"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
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
  				'500': '#76c044',
  				'600': '#5ea031',
  				'700': '#477826',
  				'800': '#3a5f20',
  				'900': '#32511e',
  				'950': '#1a2c0f',
  				DEFAULT: '#76c044',
  				dark: '#5ea031',
  				light: '#8fd35f'
  			},
  			secondary: {
  				DEFAULT: '#0d74b8',
  				dark: '#0a5c92',
  				light: '#2b8fd4'
  			},
  			success: {
  				DEFAULT: '#22c55e',
  				foreground: '#ffffff'
  			},
  			warning: {
  				DEFAULT: '#eab308',
  				foreground: '#ffffff'
  			},
  			error: {
  				DEFAULT: '#dc2626',
  				foreground: '#ffffff'
  			},
  			info: {
  				DEFAULT: '#0ea5e9',
  				foreground: '#ffffff'
  			},
  			gray: {
  				'50': '#fafafa',
  				'100': '#f4f4f5',
  				'200': '#e4e4e7',
  				'300': '#d4d4d8',
  				'400': '#a1a1aa',
  				'500': '#71717a',
  				'600': '#52525b',
  				'700': '#3f3f46',
  				'800': '#27272a',
  				'900': '#18181b',
  				'950': '#09090b'
  			},
  			background: {
  				DEFAULT: '#ffffff',
  				secondary: '#fafafa',
  				tertiary: '#f4f4f5'
  			},
  			foreground: {
  				DEFAULT: '#18181b',
  				secondary: '#71717a',
  				tertiary: '#a1a1aa',
  				muted: '#52525b'
  			},
  			border: {
  				DEFAULT: '#e4e4e7',
  				light: '#f4f4f5',
  				medium: '#d4d4d8'
  			},
  			card: {
  				DEFAULT: '#ffffff',
  				foreground: '#18181b'
  			},
  			popover: {
  				DEFAULT: '#ffffff',
  				foreground: '#18181b'
  			},
  			muted: {
  				DEFAULT: '#fafafa',
  				foreground: '#71717a'
  			},
  			accent: {
  				DEFAULT: '#fafafa',
  				foreground: '#18181b'
  			},
  			destructive: {
  				DEFAULT: '#dc2626',
  				foreground: '#ffffff'
  			},
  			input: '#e4e4e7',
  			ring: '#76c044',
  			chart: {
  				'1': '#76c044',
  				'2': '#0d74b8',
  				'3': '#eab308',
  				'4': '#9333ea',
  				'5': '#f97316'
  			},
  			sidebar: {
  				DEFAULT: '#ffffff',
  				foreground: '#18181b',
  				primary: '#76c044',
  				'primary-foreground': '#ffffff',
  				accent: '#fafafa',
  				'accent-foreground': '#18181b',
  				border: '#e4e4e7',
  				ring: '#76c044'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'-apple-system',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'0.6875rem',
  				{
  					lineHeight: '1rem'
  				}
  			],
  			'xs': [
  				'0.75rem',
  				{
  					lineHeight: '1rem'
  				}
  			],
  			'sm': [
  				'0.8125rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			],
  			'base': [
  				'0.875rem',
  				{
  					lineHeight: '1.375rem'
  				}
  			],
  			'lg': [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			'xl': [
  				'1.125rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'2xl': [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'3xl': [
  				'1.5rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			'4xl': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem'
  				}
  			],
  			'section': [
  				'0.625rem',
  				{
  					lineHeight: '0.875rem'
  				}
  			]
  		},
  		fontWeight: {
  			light: '300',
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700'
  		},
  		letterSpacing: {
  			tighter: '-0.02em',
  			tight: '-0.01em',
  			normal: '0',
  			wide: '0.01em',
  			wider: '0.025em',
  			widest: '0.05em'
  		},
  		lineHeight: {
  			tight: '1.25',
  			snug: '1.375',
  			normal: '1.5',
  			relaxed: '1.625'
  		},
  		spacing: {
  			'header': '48px',
  			'rail': '48px',
  			'rail-icon': '36px',
  			'panel': '200px',
  			'panel-item': '36px',
  			'panel-header': '48px',
  			'content-offset': '248px',
  			'btn-sm': '28px',
  			'btn-md': '32px',
  			'btn-lg': '36px',
  			'btn-px-sm': '10px',
  			'btn-px-md': '12px',
  			'btn-px-lg': '16px',
  			'input-sm': '28px',
  			'input-md': '32px',
  			'input-lg': '36px',
  			'input-px': '12px',
  			'checkbox-sm': '16px',
  			'checkbox-md': '20px',
  			'checkbox-lg': '24px',
  			'switch-track-w': '44px',
  			'switch-track-h': '24px',
  			'switch-thumb': '20px',
  			'table-row': '44px',
  			'table-header': '40px',
  			'table-cell-x': '12px',
  			'table-cell-y': '8px',
  			'sidebar-item': '32px',
  			'sidebar-px': '12px',
			'page': '20px',
			'page-lg': '24px',
			'card': '16px',
			'card-lg': '20px'
		},
  		borderWidth: {
  			DEFAULT: '1px',
  			'0': '0px',
  			'2': '2px',
  			'3': '3px',
  			'4': '4px'
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
  			full: '9999px'
  		},
  		boxShadow: {
  			sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  			DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  			md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  			lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  			xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  			'2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  			inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  			none: 'none'
  		},
  		zIndex: {
  			dropdown: '1000',
  			sticky: '1020',
  			fixed: '1030',
  			'modal-backdrop': '1040',
  			modal: '1050',
  			popover: '1060',
  			tooltip: '1070',
  			toast: '1080'
  		},
  		transitionDuration: {
  			fast: '150ms',
  			normal: '200ms',
  			slow: '300ms',
  			slower: '500ms'
  		},
  		transitionTimingFunction: {
  			DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  			in: 'cubic-bezier(0.4, 0, 1, 1)',
  			out: 'cubic-bezier(0, 0, 0.2, 1)',
  			'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
  		},
		keyframes: {
			'fade-in': {
				'0%': {
					opacity: '0',
					transform: 'translateY(10px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'fade-out': {
				'0%': {
					opacity: '1'
				},
				'100%': {
					opacity: '0'
				}
			},
			'slide-in-right': {
				'0%': {
					transform: 'translateX(100%)'
				},
				'100%': {
					transform: 'translateX(0)'
				}
			},
			'slide-out-right': {
				'0%': {
					transform: 'translateX(0)'
				},
				'100%': {
					transform: 'translateX(100%)'
				}
			},
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			}
		},
		animation: {
			'fade-in': 'fade-in 0.4s ease forwards',
			'fade-out': 'fade-out 0.2s ease forwards',
			'slide-in-right': 'slide-in-right 0.3s ease-out',
			'slide-out-right': 'slide-out-right 0.2s ease-in',
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out'
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
