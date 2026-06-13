import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#e11d48", dark: "#9f1239", light: "#fb7185" },
        dark: { DEFAULT: "#0a0a0a", card: "#111111", card2: "#1a1a1a", border: "#2a2a2a" },
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      animation: {
        "spin-slow": "spin 2s linear infinite",
        "pulse-red": "pulse-red 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
