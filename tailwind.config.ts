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
          light: "#1a1d27",
          lighter: "#252836",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
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
