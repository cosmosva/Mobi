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
        'mobi': {
          50: '#f5f7fa',
          100: '#ebeef5',
          200: '#d3dae6',
          300: '#acb9cf',
          400: '#8094b3',
          500: '#5f7699',
          600: '#4b5f80',
          700: '#3e4d68',
          800: '#364257',
          900: '#303949',
          950: '#1f2530',
        }
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Menlo', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
