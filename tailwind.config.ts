import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070b',
          900: '#090c12',
          850: '#0d1119',
          800: '#121824',
          700: '#202a3a'
        },
        mist: {
          50: '#f7fbff',
          200: '#cbd6e6',
          400: '#8d9bb0',
          500: '#66758c'
        },
        signal: {
          cyan: '#41d9ff',
          blue: '#5a8dff',
          violet: '#9675ff'
        }
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0, 0, 0, 0.38)',
        focus: '0 0 0 4px rgba(65, 217, 255, 0.14)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
      animation: {
        'fade-up': 'fade-up 380ms ease-out both',
        shimmer: 'shimmer 1.5s linear infinite'
      }
    }
  },
  plugins: []
};

export default config;
