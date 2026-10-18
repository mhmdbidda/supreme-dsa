import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
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

const DESCRIPTION =
  "An interactive visual lab for Data Structures and Algorithms (CS 214): sorting, searching, data structures, trees, graphs and complexity, all running in the browser.";

export const metadata: Metadata = {
  // Canonical origin for every absolute URL below; shared with the pages
  // through `SITE_URL` in `src/lib/site.ts` (overridable via
  // `NEXT_PUBLIC_SITE_URL`).
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
    url: SITE_URL,
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
        {/* Route groups own their chrome: `(app)` renders inside the AppShell,
            `(marketing)` has its own minimal layout — both provide `main#main`,
            so this skip link works on every route (error / not-found included). */}
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
