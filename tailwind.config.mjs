/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f3f7f1",
        panel: "#ffffff",
        border: "#cfd8d3",
        ink: "#17211d",
        muted: "#64726c",
        accent: "#0f766e",
        lime: "#7fb33d",
        amber: "#c77b2a",
        danger: "#b33a46",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
