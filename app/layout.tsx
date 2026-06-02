import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import LiveHeadlineBanner from "@/components/LiveHeadlineBanner";
import { getAppUrl } from "@/lib/appUrl";
import "./globals.css";

// Entire app is auth-gated and personalized; no value in static prerender.
export const dynamic = "force-dynamic";

const appUrl = getAppUrl();
const metadataTitle = "Planifier - Trading Planning Assistant";
const metadataDescription =
  "Turn confusing charts into structured educational trade plans. Paper-trading planning only; not financial advice.";

export const metadata: Metadata = {
  metadataBase: appUrl,
  title: {
    default: metadataTitle,
    template: "%s | Planifier",
  },
  description: metadataDescription,
  applicationName: "Planifier",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: metadataTitle,
    description: metadataDescription,
    url: "/",
    siteName: "Planifier",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: metadataTitle,
    description: metadataDescription,
  },
  appleWebApp: {
    capable: true,
    title: "Planifier",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F14",
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
        <body className="min-h-screen bg-bg text-ink">
          <LiveHeadlineBanner />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
