export const planifierClerkAppearance = {
  variables: {
    colorPrimary: "#f2b84b",
    colorBackground: "#0c1a17",
    colorText: "#e8eee8",
    colorTextSecondary: "#a7b4ae",
    colorInputBackground: "#07110f",
    colorInputText: "#e8eee8",
    colorBorder: "rgba(232, 238, 232, 0.22)",
    borderRadius: "0",
    fontFamily: "var(--font-ibm-plex-sans), ui-sans-serif, system-ui",
    fontFamilyButtons: "var(--font-space-grotesk), ui-sans-serif, system-ui",
  },
  layout: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
  elements: {
    card: {
      boxShadow: "0 24px 70px rgba(0, 0, 0, 0.42)",
      border: "1px solid rgba(232, 238, 232, 0.16)",
    },
    headerTitle: {
      fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui",
      letterSpacing: "0",
    },
    socialButtonsBlockButton: {
      borderRadius: "0",
      borderColor: "rgba(232, 238, 232, 0.22)",
      fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui",
      fontWeight: "700",
    },
    formButtonPrimary: {
      borderRadius: "0",
      color: "#17110a",
      fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui",
      fontWeight: "700",
    },
    footerActionLink: {
      color: "#f2b84b",
    },
  },
} as const;
