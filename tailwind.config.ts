import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			'navy-950': '#050D1B',
  			'navy-900': '#0B1625',
  			'navy-mid': '#3A5270',
  			paper: 'var(--c-paper)',
  			'paper-border': 'var(--c-paper-border)',
  			surface: 'var(--c-surface)',
  			gold: 'var(--c-gold)',
  			'gold-hi': 'var(--c-gold-hi)',
  			'gold-pale': 'var(--c-gold-pale)',
  			ok: 'var(--c-ok)',
  			warn: 'var(--c-warn)',
  			err: 'var(--c-err)',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			}
  		},
  		fontFamily: {
  			heading: [
  				'var(--font-playfair)',
  				'serif'
  			],
  			body: [
  				'var(--font-dm-sans)',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-dm-mono)',
  				'monospace'
  			]
  		},
  		boxShadow: {
  			card: 'var(--shadow-card)',
  			auth: 'var(--shadow-auth)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'grc-sm': '6px',
  			'grc-md': '10px',
  			'grc-lg': '16px'
  		},
  		keyframes: {
  			shake: {
  				'0%, 100%': {
  					transform: 'translateX(0)'
  				},
  				'20%': {
  					transform: 'translateX(-4px)'
  				},
  				'40%': {
  					transform: 'translateX(4px)'
  				},
  				'60%': {
  					transform: 'translateX(-4px)'
  				},
  				'80%': {
  					transform: 'translateX(4px)'
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
  			shake: 'shake 0.4s ease-in-out',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
