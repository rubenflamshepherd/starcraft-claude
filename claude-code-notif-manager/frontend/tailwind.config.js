/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        protoss: {
          primary: '#4a90d9',
          secondary: '#7c3aed',
          dark: '#1a1a2e',
          darker: '#0f0f1a',
        },
        terran: {
          primary: '#f59e0b',
          secondary: '#ef4444',
          dark: '#1a1a1a',
          darker: '#0f0f0f',
        },
        zerg: {
          primary: '#a855f7',
          secondary: '#22c55e',
          dark: '#1a1a1e',
          darker: '#0f0f12',
        }
      }
    },
  },
  plugins: [],
}
