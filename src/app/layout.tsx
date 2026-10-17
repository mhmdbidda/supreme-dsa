import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

/**
 * Canonical origin used to resolve absolute URLs in Open Graph metadata.
 * Override with `NEXT_PUBLIC_SITE_URL` when deploying to a real domain.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dsa-command-center.vercel.app";

const DESCRIPTION =
  "An interactive visual lab for Data Structures and Algorithms (CS 214): sorting, searching, data structures, trees, graphs and complexity, all running in the browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DSA Command Center",
    template: "%s · DSA Command Center",
  },
  description: DESCRIPTION,
  applicationName: "DSA Command Center",
  openGraph: {
    type: "website",
    siteName: "DSA Command Center",
    title: "DSA Command Center",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "DSA Command Center",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg font-sans text-ink">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
