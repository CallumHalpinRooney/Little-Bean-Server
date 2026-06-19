import type { Config } from 'tailwindcss';

/**
 * Lonrú Design — design system
 *
 * Quiet-luxury palette. Nothing is pure black or pure white: the page is built
 * from a warm near-black "ink" and a soft "bone" off-white, with a single
 * restrained accent — a muted patina brass. No Shopify red/orange anywhere.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        ink: {
          DEFAULT: '#100E0C', // warm near-black — primary background
          soft: '#181512', // raised surfaces / cards
          softer: '#211D18', // hover / borders on dark
        },
        bone: {
          DEFAULT: '#F4EFE6', // warm off-white — primary on dark
          dim: '#CBC3B5', // secondary text on dark
          muted: '#8C8578', // tertiary / captions
        },
        // Single accent — muted patina brass
        brass: {
          DEFAULT: '#BE9E63',
          soft: '#D8C295',
          deep: '#8C7038',
        },
        // Editorial neutral line for hairline borders
        line: 'rgba(244, 239, 230, 0.12)',
      },
      fontFamily: {
        // Display serif (Cormorant) + clean grotesk (Inter) — wired via next/font
        serif: ['var(--font-display)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-ui)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Editorial type scale (clamped for fluid display sizes set in globals)
        'eyebrow': ['0.72rem', { lineHeight: '1', letterSpacing: '0.22em' }],
        'caption': ['0.8rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'body': ['1rem', { lineHeight: '1.7' }],
        'lead': ['1.18rem', { lineHeight: '1.65' }],
      },
      letterSpacing: {
        widest: '0.28em',
      },
      maxWidth: {
        edge: '1480px', // generous editorial container
        readable: '46rem',
      },
      spacing: {
        section: 'clamp(5rem, 12vw, 11rem)', // vertical section rhythm
        gutter: 'clamp(1.25rem, 5vw, 4rem)', // page side gutter
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sheen: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        sheen: 'sheen 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
