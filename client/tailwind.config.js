/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#06090F',
          900: '#0B0F19',
          850: '#0E1422',
          800: '#12192B',
          700: '#1A233A',
          600: '#24304E',
        },
        slate: {
          850: '#151F32',
          750: '#233047',
        },
        brand: {
          emerald: '#00E599',
          green: '#10B981',
          teal: '#14B8A6',
          lime: '#84CC16',
        },
        severity: {
          low: '#10B981',
          medium: '#F59E0B',
          high: '#EF4444',
          critical: '#DC2626',
        },
        status: {
          submitted: '#3B82F6',
          review: '#F59E0B',
          assigned: '#8B5CF6',
          resolved: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(0, 229, 153, 0.25)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.25)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.25)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 229, 153, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
