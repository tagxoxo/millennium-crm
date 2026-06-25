import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0f1117",
          light: "#1c2130",
          lighter: "#2a3145",
        },
        accent: {
          DEFAULT: "#60a5fa",
          hover: "#3b82f6",
        },
        carrier: {
          trexis: "#3b82f6",
          progressive: "#a855f7",
          gainsco: "#eab308",
        },
      },
    },
  },
  plugins: [],
};

export default config;
