/** @type {import('tailwindcss').Config} */
// appointment_01 — Modern & Feminen: rose-cream palette
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fffbf9",
        sand: "#f7ece9",
        coffee: "#2d1f1f",
        terra: "#b57080",
        terradark: "#8f5263",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
