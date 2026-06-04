/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        v2: {
          bg: 'var(--v2-bg)',
          surface: 'var(--v2-surface)',
          gold: 'var(--v2-gold)',
          'text-primary': 'var(--v2-text-primary)',
          'text-secondary': 'var(--v2-text-secondary)',
          border: 'var(--v2-border)',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        studio: {
          primary: '#8b5cf6',
          'primary-hover': '#7c3aed',
          'primary-muted': 'rgba(139, 92, 246, 0.14)',
          cyan: '#22d3ee',
          success: '#34D399',
          surface: '#060606',
          raised: '#0D0D0D',
        },
        gold: {
          50:  'hsl(var(--accent-h) var(--accent-s) 95%)',
          100: 'hsl(var(--accent-h) var(--accent-s) 85%)',
          200: 'hsl(var(--accent-h) var(--accent-s) 75%)',
          300: 'hsl(var(--accent-h) var(--accent-s) 65%)',
          400: 'hsl(var(--accent-h) var(--accent-s) 55%)',
          500: 'hsl(var(--accent-h) var(--accent-s) 50%)',
          600: 'hsl(var(--accent-h) var(--accent-s) 42%)',
          700: 'hsl(var(--accent-h) var(--accent-s) 33%)',
          800: 'hsl(var(--accent-h) var(--accent-s) 25%)',
          900: 'hsl(var(--accent-h) var(--accent-s) 15%)'
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Playfair Display"', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace']
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, hsl(var(--accent-h) var(--accent-s) 70%) 0%, hsl(var(--accent-h) var(--accent-s) 52%) 45%, hsl(var(--accent-h) var(--accent-s) 33%) 100%)',
        'gold-soft': 'linear-gradient(135deg, var(--accent-soft) 0%, transparent 100%)',
        'noir-radial': 'radial-gradient(ellipse at top, #1a1410 0%, #0a0807 50%, #050403 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      },
      boxShadow: {
        'gold-glow':    '0 0 40px var(--card-glow), 0 0 80px color-mix(in srgb, var(--card-glow) 50%, transparent)',
        'gold-glow-lg': '0 0 60px var(--card-glow), 0 0 120px var(--card-glow)',
        'inner-gold':   'inset 0 1px 0 0 color-mix(in srgb, var(--card-glow) 40%, transparent)',
        'cinema':       '0 20px 60px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)'
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'float': { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        'pulse-gold': { '0%,100%': { boxShadow: '0 0 0 0 var(--card-glow)' }, '50%': { boxShadow: '0 0 0 12px transparent' } },
        // MUGTEE ORB — cinematic states (pure CSS, no JS animation lib).
        'orb-breathe':  { '0%,100%': { transform: 'scale(1)',   opacity: '0.92' }, '50%': { transform: 'scale(1.06)', opacity: '1' } },
        'orb-ripple':   { '0%': { transform: 'scale(0.9)', opacity: '0.6' }, '70%': { transform: 'scale(1.6)', opacity: '0' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
        'orb-spin':     { 'to': { transform: 'rotate(360deg)' } },
        'orb-bar':      { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s ease-out infinite',
        'orb-breathe': 'orb-breathe 3.6s ease-in-out infinite',
        'orb-ripple':  'orb-ripple 1.8s ease-out infinite',
        'orb-spin':    'orb-spin 2.4s linear infinite',
        'orb-bar':     'orb-bar 0.8s ease-in-out infinite'
      },
      transitionDuration: {
        150: '150ms',
        300: '300ms',
        420: '420ms',
        480: '480ms',
        560: '560ms',
        1400: '1400ms',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
}
