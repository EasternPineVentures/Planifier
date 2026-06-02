/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090a0d",
        panel: "#12151b",
        border: "#2a3038",
        ink: "#f2f5f0",
        muted: "#9aa4af",
        accent: "#4dd8ff",
        lime: "#9cff6a",
        amber: "#f4c95d",
        danger: "#ff6670",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
