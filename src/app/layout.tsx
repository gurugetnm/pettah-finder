import type { Metadata } from "next";
import { ThemeRoot, Header } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { siteUrl } from "@/lib/utils/site";
import localFont from "next/font/local";
import "./globals.css";
const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 1000",
});
const headingFont = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-heading",
  display: "swap",
  weight: "200 800",
});
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Pettah Finder — Your marketplace compass",
    template: "%s | Pettah Finder",
  },
  description:
    "Find the right street. Discover shopping categories and explore Pettah, Colombo.",
  openGraph: {
    type: "website",
    locale: "en_LK",
    siteName: "Pettah Finder",
    title: "Pettah Finder",
    description: "Find the right street. Discover the right shop.",
  },
  twitter: { card: "summary" },
  alternates: { canonical: "/" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <ThemeRoot>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </ThemeRoot>
      </body>
    </html>
  );
}
