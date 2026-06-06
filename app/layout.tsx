import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import LiveHeadlineBanner from "@/components/LiveHeadlineBanner";
import { getAppUrl } from "@/lib/appUrl";
import { planifierClerkAppearance } from "@/lib/auth/clerkAppearance";
import "./globals.css";

// Entire app is auth-gated and personalized; no value in static prerender.
export const dynamic = "force-dynamic";

const appUrl = getAppUrl();
const metadataTitle = "Planifier by Eastern Pine Ventures";
const metadataDescription =
  "A free-first trading learning notebook for turning lessons and chart ideas into structured paper plans. Saving is designed as a one-time unlock.";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

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
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#07110f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={planifierClerkAppearance}>
      <html lang="en">
        <body
          className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} min-h-screen bg-bg text-ink`}
        >
          <LiveHeadlineBanner />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
