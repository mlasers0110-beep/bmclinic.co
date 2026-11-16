/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        gold: {
          50: '#fdf8ef',
          100: '#faefd8',
          200: '#f4dbb0',
          300: '#ebc47e',
          400: '#e2a84b',
          500: '#c9944a',
          600: '#b07d38',
          700: '#8d612c',
          800: '#714d28',
          900: '#5c4024',
        },
        skin: {
          50: '#faf9f7',
          100: '#f2ede6',
          200: '#e4d9cc',
          300: '#d0bba8',
          400: '#b99680',
          500: '#a37a61',
          600: '#8e6350',
          700: '#754f40',
          800: '#624438',
          900: '#533a31',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
