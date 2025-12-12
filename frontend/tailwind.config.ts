import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
  // Performance: Use content hash for better caching in production
  corePlugins: {
    preflight: true,
  },
  theme: {
  	screens: {
  		'sm': '640px',
  		'md': '768px',
  		'lg': '1024px',
  		'xl': '1280px',
  		'2xl': '1536px',
  		'3xl': '1920px',
  		'4xl': '2560px',
  	},
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  		},
  		fontWeight: {
  			light: '300',
  			normal: '400',
  			medium: '500',
  			bold: '700',
  		},
  		fontSize: {
  			'2xs': 'var(--font-size-2xs)',
  			'xs': 'var(--font-size-xs)',
  			'sm': 'var(--font-size-sm)',
  			'base': 'var(--font-size-base)',
  			'lg': 'var(--font-size-lg)',
  			'xl': 'var(--font-size-xl)',
  			'2xl': 'var(--font-size-2xl)',
  			'3xl': 'var(--font-size-3xl)',
  			'4xl': 'var(--font-size-4xl)',
  			'5xl': 'var(--font-size-5xl)',
  		},
  		lineHeight: {
  			'tight': 'var(--line-height-tight)',
  			'snug': 'var(--line-height-snug)',
  			'normal': 'var(--line-height-normal)',
  			'relaxed': 'var(--line-height-relaxed)',
  		},
  		letterSpacing: {
  			'tight': 'var(--letter-spacing-tight)',
  			'normal': 'var(--letter-spacing-normal)',
  			'wide': 'var(--letter-spacing-wide)',
  		},
  		spacing: {
  			'4.5': '1.125rem',
  			'13': '3.25rem',
  			'15': '3.75rem',
  			'18': '4.5rem',
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius-lg)',
  			md: 'var(--radius)',
  			sm: 'calc(var(--radius) - 2px)',
  			xl: 'var(--radius-xl)',
  			'2xl': 'var(--radius-2xl)'
  		},
  		boxShadow: {
  			'xs': 'var(--shadow-xs)',
  			'sm': 'var(--shadow-sm)',
  			'md': 'var(--shadow-md)',
  			'lg': 'var(--shadow-lg)',
  			'xl': 'var(--shadow-xl)',
  			'glow': 'var(--shadow-glow)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0',
  					opacity: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)',
  					opacity: '1'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)',
  					opacity: '1'
  				},
  				to: {
  					height: '0',
  					opacity: '0'
  				}
  			},
  			'fade-in': {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			'fade-out': {
  				'0%': { opacity: '1' },
  				'100%': { opacity: '0' }
  			},
  			'slide-up': {
  				'0%': { opacity: '0', transform: 'translateY(10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'slide-down': {
  				'0%': { opacity: '0', transform: 'translateY(-10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'scale-in': {
  				'0%': { opacity: '0', transform: 'scale(0.95)' },
  				'100%': { opacity: '1', transform: 'scale(1)' }
  			},
  			'shimmer': {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' }
  			},
  			'pulse-subtle': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.8' }
  			},
  			'bounce-subtle': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-2px)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-out': 'fade-out 0.2s ease-out',
  			'slide-up': 'slide-up 0.3s ease-out',
  			'slide-down': 'slide-down 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'shimmer': 'shimmer 2s infinite linear',
  			'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
  			'bounce-subtle': 'bounce-subtle 0.5s ease-in-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
