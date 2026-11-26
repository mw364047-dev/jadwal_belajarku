/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson Hyperlegible', 'Arial', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Atkinson Hyperlegible', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#14224A',
          muted: '#475569',
          subtle: '#64748b',
        },
        paper: '#F7F9FC',
        blue: '#2457E6',
        mark: '#FFD84D',
        teal: '#1F8F80',
        belajar: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          600: '#2457E6',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        brand: {
          DEFAULT: '#2457E6',
          dark: '#1d4ed8',
          soft: '#eff6ff',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#F7F9FC',
        },
      },
      boxShadow: {
        soft: '0 12px 35px -18px rgba(15, 23, 42, 0.22)',
        panel: '0 18px 45px -25px rgba(15, 23, 42, 0.24)',
      },
      borderRadius: {
        panel: '6px 18px',
      },
    },
  },
  plugins: [],
}
