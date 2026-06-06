/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07110f",
        panel: "#0c1a17",
        border: "rgba(232, 238, 232, 0.16)",
        ink: "#e8eee8",
        muted: "#a7b4ae",
        accent: "#f2b84b",
        support: "#90a777",
        amber: "#f2b84b",
        danger: "#EF4444",
        pine: "#102923",
        "pine-soft": "#90a777",
        "fox-copper": "#c46a2b",
        "foxfire-gold": "#f2b84b",
        "terminal-green": "#77d5d8",
        success: "#22C55E",
      },
      fontFamily: {
        mono: [
          "var(--font-ibm-plex-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        display: [
          "var(--font-space-grotesk)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
