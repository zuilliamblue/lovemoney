// tailwind.config.js - VERSÃO CORRETA

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Dizendo ao Tailwind para olhar DENTRO da pasta SRC
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