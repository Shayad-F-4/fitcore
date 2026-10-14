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
        dark: {
          bg: '#080B0A',
          surface: '#111613',
          elevated: '#171E19',
          border: '#273129',
          borderLight: '#364439',
        },
        primary: {
          DEFAULT: '#B7FF3C',
          hover: '#9ee628',
          glow: 'rgba(183, 255, 60, 0.25)',
          dark: '#7ab31b',
        },
        text: {
          main: '#F5F7F5',
          muted: '#9BA69E',
          dim: '#657369',
        },
        status: {
          success: '#36D399',
          warning: '#FBBF24',
          error: '#F87171',
          info: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 25px -5px rgba(183, 255, 60, 0.25)',
        'glow-sm': '0 0 15px -3px rgba(183, 255, 60, 0.15)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        }
      }
    },
  },
  plugins: [],
}
