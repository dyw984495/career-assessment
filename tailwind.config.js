/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: '#0f172a',
        'primary-light': '#1e293b',
        secondary: '#f8fafc',
        accent: {
          orange: '#fff7ed',
          blue: '#eff6ff',
          green: '#f0fdf4',
          purple: '#faf5ff',
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '28px',
      },
    },
  },
  plugins: [],
}
