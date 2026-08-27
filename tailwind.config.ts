import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { mantissa: { bg: "#FAFAF8", ink: "#1A1A18", muted: "#6B6960", border: "#E8E5E0", forest: "#2D5A27", indigo: "#4338CA" } }, fontFamily: { editorial: ["Georgia", "serif"], sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "monospace"] } } },
  plugins: []
};
export default config;
