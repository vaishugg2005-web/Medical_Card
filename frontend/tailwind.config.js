/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medora: {
          navy: '#102A43',
          teal: '#0D9488',
          'bright-teal': '#14B8A6',
          'soft-mint': '#E8F5F2',
          'cool-gray': '#F4F7FA',
          white: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
