import type { Metadata } from "next";
import { ThemeRoot, Header } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { siteUrl } from "@/lib/utils/site";
import "./globals.css";
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
      <body>
        <ThemeRoot>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </ThemeRoot>
      </body>
    </html>
  );
}
