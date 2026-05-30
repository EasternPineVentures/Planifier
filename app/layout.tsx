import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Entire app is auth-gated and personalized; no value in static prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planifier — Trading Planning Assistant",
  description:
    "Turn confusing charts into structured plans. Not financial advice. Educational and paper-trading only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#d4ff3a",
          colorBackground: "#0a0a0b",
          colorText: "#e7e7ea",
          colorInputBackground: "#121214",
          colorInputText: "#e7e7ea",
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen bg-bg text-ink">{children}</body>
      </html>
    </ClerkProvider>
  );
}
