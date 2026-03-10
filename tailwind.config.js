/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        zwift: {
          orange: '#F26522',
          dark: '#1a1a2e',
          darker: '#0f0f1a',
          card: '#16213e',
          border: '#2a2a4a'
        }
      }
    }
  },
  plugins: []
}
