import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Déja. brand palette
        bg: "#1C1611",
        card: "#2C1F14",
        ink: "#F5EFE0",
        muted: "#8B6347",
        amber: "#C8843A",
        "amber-light": "#E4A95A",
        rose: "#C4967A",
        sage: "#7A8C6E",
        charcoal: "#1C1611",
        "brown-dark": "#2C1F14",
        "brown-mid": "#5C3D22",

        // Semantic aliases (used throughout components)
        up: "#7A8C6E",
        "up-dark": "#5a6c4e",
        down: "#C4967A",
        edge: "#C8843A",
        gold: "#E4A95A",
      },
      fontFamily: {
        sans: ["'Jost'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["'DM Serif Display'", "Georgia", "serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'DM Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
