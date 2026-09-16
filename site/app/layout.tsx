import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { CookieConsent } from "@/components/site/CookieConsent";
import { EditBar } from "@/components/site/EditBar";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { ContentProvider } from "@/lib/content";
import { jsonLdProps, organizationSchema } from "@/lib/seo";
import { siteConfig } from "@/site.config";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.company.name} — ${siteConfig.company.tagline}`,
    template: `%s | ${siteConfig.company.name}`,
  },
  description: siteConfig.company.description,
  applicationName: siteConfig.company.name,
  authors: [{ name: siteConfig.company.name }],
  openGraph: {
    type: "website",
    locale: "en_IE",
    siteName: siteConfig.company.name,
    url: siteConfig.url,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#070c18" },
  ],
};

/**
 * Applied before paint so the chosen theme never flashes. Reads a functional
 * preference from localStorage, falling back to the OS setting.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script {...jsonLdProps(organizationSchema())} />
      </head>
      <body className="font-sans antialiased">
        <ContentProvider>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <Header />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <CookieConsent />
          <EditBar />
        </ContentProvider>
      </body>
    </html>
  );
}
