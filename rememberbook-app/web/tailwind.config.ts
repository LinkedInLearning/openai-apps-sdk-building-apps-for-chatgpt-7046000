import { defineConfig } from "@tailwindcss/vite";

export default defineConfig({
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        urgency: {
          1: "#22c55e", // green - not important
          2: "#84cc16", // lime - low
          3: "#eab308", // yellow - medium
          4: "#f97316", // orange - high
          5: "#ef4444", // red - immediate
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
});
