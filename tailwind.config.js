/**
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg0: '#080b12',
        bg1: '#0b1020',
        fg: '#e6f6ff',
        muted: '#aabdcf',
        brand: '#00e5ff',
        brand2: '#7c4dff',
        accent: '#14f195',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
