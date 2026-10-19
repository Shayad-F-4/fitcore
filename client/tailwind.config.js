/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#F7F8FA',
        surface: '#FFFFFF',
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
          dark: '#D1D5DB',
        },
        text: {
          main: '#202124',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          dim: '#9CA3AF',
        },
        status: {
          success: '#15803D',
          successBg: '#F0FDF4',
          successBorder: '#DCFCE7',
          warning: '#B45309',
          warningBg: '#FFFBEB',
          warningBorder: '#FEF3C7',
          error: '#B91C1C',
          errorBg: '#FEF2F2',
          errorBorder: '#FEE2E2',
          info: '#2563EB',
          infoBg: '#EFF6FF',
          infoBorder: '#DBEAFE',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'card': '0.5rem',
      }
    },
  },
  plugins: [],
}
