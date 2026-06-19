import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const ui = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-ui',
  display: 'swap',
});

const SITE = 'https://lonru.design';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Lonrú Design — Editorial Wall Art',
    template: '%s — Lonrú Design',
  },
  description:
    'Premium, gallery-grade poster art across Motorsport, Legendary Moments and Motivation. Printed and framed to order, shipped worldwide.',
  openGraph: {
    title: 'Lonrú Design — Editorial Wall Art',
    description: 'Quiet-luxury poster art, printed and framed to order.',
    url: SITE,
    siteName: 'Lonrú Design',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body className="grain min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
