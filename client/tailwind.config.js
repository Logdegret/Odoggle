/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        sky: {
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        blue: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        surface: {
          DEFAULT: '#020D1A',
          raised:  '#061525',
          overlay: '#0B1F35',
        },
        ink: {
          DEFAULT: '#EFF6FF',
          muted:   '#6B8FAF',
          faint:   '#1E3A5F',
        },
        border: {
          DEFAULT: 'rgba(147,210,255,0.07)',
          bright:  'rgba(147,210,255,0.15)',
        },
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
        'secondary-gradient': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14,165,233,0.18) 0%, transparent 70%)',
      },
      boxShadow: {
        'primary-glow': '0 0 24px rgba(14,165,233,0.4)',
        'secondary-glow': '0 0 24px rgba(16,185,129,0.35)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.9)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)',    opacity: 1   },
          '50%':      { transform: 'scale(1.06)', opacity: 0.7 },
        },
        'score-pop': {
          from: { opacity: 0, transform: 'scale(0.6) rotate(-6deg)' },
          to:   { opacity: 1, transform: 'scale(1) rotate(0deg)'    },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.45s ease-out both',
        'scale-in':   'scale-in 0.35s ease-out both',
        'pulse-ring': 'pulse-ring 0.7s ease-in-out infinite',
        'score-pop':  'score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
};
