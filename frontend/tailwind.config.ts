import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f4f2ee",
        card: "#ffffff",
        ink: "#111111",
        muted: "#6b6b6b",
        up: "#00e676",
        "up-dark": "#00c853",
        down: "#ff3d57",
        edge: "#3d8bfd",
        gold: "#ffab40",
        // Keep old tg aliases so nothing breaks during migration
        tg: {
          bg: "#f4f2ee",
          text: "#111111",
          hint: "#6b6b6b",
          link: "#3d8bfd",
          button: "#00e676",
          "button-text": "#111111",
          secondary: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["'Instrument Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'Space Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
