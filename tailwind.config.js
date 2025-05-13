/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        farmGreen: '#2E7D32',
        farmBrown: '#6B4E31',
        farmYellow: '#F4A261',
      },
    },
  },
  plugins: [],
};
