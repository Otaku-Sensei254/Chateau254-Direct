/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: { wine: '#761329', 'wine-dark': '#3d0b18', ink: '#211d1b', cream: '#f7f3ef', muted: '#837a75', line: '#e9e1dc' },
      fontFamily: { serif: ['Georgia', 'serif'], sans: ['Arial', 'Helvetica', 'sans-serif'] },
      keyframes: { rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } } },
      animation: { rise: 'rise .5s both' },
    },
  },
  plugins: [],
};