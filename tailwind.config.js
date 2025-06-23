// tailwind.config.js - Usando module.exports para máxima compatibilidade

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-orange-500',
    'border-orange-500',
    'bg-gray-400',
    'border-gray-400'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};