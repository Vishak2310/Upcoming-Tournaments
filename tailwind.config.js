/** @type {import('tailwindcss').Config} */
export default {
  // use the “class” strategy so we can toggle via JS
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
