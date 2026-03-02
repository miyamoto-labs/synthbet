import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color, #1a1a2e)",
          text: "var(--tg-theme-text-color, #ffffff)",
          hint: "var(--tg-theme-hint-color, #7c7c8a)",
          link: "var(--tg-theme-link-color, #6c5ce7)",
          button: "var(--tg-theme-button-color, #6c5ce7)",
          "button-text": "var(--tg-theme-button-text-color, #ffffff)",
          secondary: "var(--tg-theme-secondary-bg-color, #16213e)",
        },
        up: "#00d48a",
        down: "#ff4757",
        edge: "#ffa502",
      },
    },
  },
  plugins: [],
};

export default config;
