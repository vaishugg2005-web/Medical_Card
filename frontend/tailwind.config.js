/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#030712',
          card: '#0f172a',
          accent: '#06b6d4',
          triage: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
