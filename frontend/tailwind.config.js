/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f3',
          100: '#dcf2e1',
          200: '#bce4c8',
          300: '#8dd1a5',
          400: '#56b67c',
          500: '#2d9f5a',
          600: '#1e7e47',
          700: '#19643a',
          800: '#175030',
          900: '#144229',
        },
        secondary: {
          50: '#fef8e7',
          100: '#fdefc1',
          200: '#fbdc86',
          300: '#f8c441',
          400: '#f5ab0d',
          500: '#e59400',
          600: '#c67100',
          700: '#9e5002',
          800: '#823e08',
          900: '#6f340b',
        },
        alert: {
          info: '#3b82f6',
          low: '#10b981',
          medium: '#f59e0b',
          high: '#ef4444',
        },
        ndvi: {
          water: '#0066cc',
          bare: '#8b4513',
          sparse: '#ffd700',
          moderate: '#90ee90',
          dense: '#006400',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}