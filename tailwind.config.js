/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        polymarket: {
          blue: '#3B82F6',
          dark: '#0F172A',
          gray: '#1E293B',
        },
      },
    },
  },
  plugins: [],
}

